const crypto = require('crypto');
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const statsAggregator = require('../utils/statsAggregator');
const League = require('../models/league');
const User = require('../models/user');
const Team = require('../models/team');
const PlayerLeagueStat = require('../models/playerLeagueStat');
const PlayerWeekStat = require('../models/playerWeekStat');
const MatchStat = require('../models/matchStat');
const LeagueParticipation = require('../models/leagueParticipation');

/**
 * Read side of the stats. Nothing here calculates points: everything comes from the
 * tables utils/statsAggregator.js fills in when a result is closed. The only live
 * queries are the ones that would be wasteful to precompute — accuracy per team and
 * head-to-head — because those grow with every pair of things rather than with the
 * number of players.
 */

/** Below this many resolved matches, averages lie. The client shows participation instead. */
const MIN_MATCHES = 5;

const ratio = (a, b) => (b > 0 ? a / b : 0);
const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Vista sin duplicados de Prediction, para las consultas en crudo.
 *
 * Hay pares (usuario, partido) repetidos en la base — envíos dobles del formulario,
 * idénticos en equipo y marcador, porque `POST /predictions/set` crea sin mirar si ya
 * existe. El agregador se queda con el id más alto de cada par y aquí se aplica la misma
 * regla: sin esto, un partido enviado tres veces contaría como tres partidos en el duelo
 * directo y en los porcentajes por formato.
 *
 * El filtro va dentro de la subconsulta a propósito, para que siga usando el índice de
 * user_id en vez de deduplicar la tabla entera y filtrar después.
 *
 * @param {string} [where] - Condición sobre Prediction, sin el WHERE.
 * @returns {string} Fragmento SQL para usar en lugar de `"Prediction"`.
 */
const predictions = (where) => `(
        SELECT DISTINCT ON (user_id, match_id) *
        FROM "Prediction"
        ${where ? `WHERE ${where}` : ''}
        ORDER BY user_id, match_id, id DESC
    )`;

/** Just the fields the UI needs about a person. */
const userPayload = (user) => user && ({
    id: user.id,
    username: user.username,
    logo_url: user.logo_url || null
});

/**
 * Works out which leagues a request is asking about.
 *
 * `scope=pachanga` means every competition of that season that scores for the
 * Pachanga — which is where Worlds gets excluded, in one place rather than scattered
 * around. `scope=league` narrows to one, whether it scores or not, which is how Worlds
 * is reachable from its own page.
 *
 * @param {Object} query - req.query
 * @returns {Promise<Object>} Scope descriptor with the league ids to filter on.
 */
const resolveScope = async (query) => {
    const leagueId = query.leagueId ? parseInt(query.leagueId, 10) : null;
    const all = await League.findAll({ order: [['start_date', 'ASC']] });

    if (leagueId) {
        const league = all.find(l => l.id === leagueId);
        if (!league) throw Object.assign(new Error('Liga no encontrada'), { status: 404 });

        return {
            type: 'league',
            year: new Date(league.start_date).getFullYear(),
            leagueIds: [league.id],
            leagues: [{ id: league.id, name: league.name, logo_url: league.logo_url }],
            excluded: [],
            countsForPachanga: league.counts_for_pachanga
        };
    }

    const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const ofYear = all.filter(l => new Date(l.start_date).getFullYear() === year);
    const scoring = ofYear.filter(l => l.counts_for_pachanga);

    return {
        type: 'pachanga',
        year,
        leagueIds: scoring.map(l => l.id),
        leagues: scoring.map(l => ({ id: l.id, name: l.name, logo_url: l.logo_url })),
        excluded: ofYear.filter(l => !l.counts_for_pachanga).map(l => ({ id: l.id, name: l.name })),
        countsForPachanga: true
    };
};

/** Seasons the selector can offer, newest first. */
const availableYears = async () => {
    const leagues = await League.findAll({ attributes: ['start_date'] });
    const years = new Set(leagues.map(l => new Date(l.start_date).getFullYear()));
    return [...years].sort((a, b) => b - a);
};

/**
 * Adds up a player's league rows into one total for the scope.
 *
 * @param {Array<Object>} rows - PlayerLeagueStat rows, with User included.
 * @returns {Array<Object>} One entry per player, sorted by points.
 */
const foldByPlayer = (rows) => {
    const byUser = {};

    for (const row of rows) {
        const acc = byUser[row.user_id] = byUser[row.user_id] || {
            user: userPayload(row.User),
            matchesAvailable: 0,
            predictions: 0,
            wins: 0,
            exactScores: 0,
            plenos: 0,
            bestRun: 0,
            points: 0,
            pointsOfficial: 0,
            pointsBase: 0,
            pointsExact: 0,
            pointsStreak: 0,
            pointsFavorite: 0,
            pointsManual: 0,
            byLeague: []
        };

        acc.matchesAvailable += row.matches_available;
        acc.predictions += row.predictions;
        acc.wins += row.wins;
        acc.exactScores += row.exact_scores;
        acc.plenos += row.plenos;
        acc.points += row.points;
        acc.pointsOfficial += row.points_official;
        acc.pointsBase += row.points_base;
        acc.pointsExact += row.points_exact;
        acc.pointsStreak += row.points_streak;
        acc.pointsFavorite += row.points_favorite;
        acc.pointsManual += row.points_manual;
        if (row.best_run > acc.bestRun) acc.bestRun = row.best_run;

        acc.byLeague.push({
            leagueId: row.league_id,
            points: row.points,
            pointsOfficial: row.points_official,
            rank: row.rank
        });
    }

    return Object.values(byUser)
        .map(p => ({
            ...p,
            // Capped at 1: a handful of matches in the database carry two predictions
            // from the same person, which would otherwise read as 101 % participation.
            participation: round(Math.min(1, ratio(p.predictions, p.matchesAvailable))),
            // Getting it right means BOTH: the winner and the scoreline. Getting only
            // the winner is a partial hit and has its own number.
            //
            // Both are over every match there was to predict, not just the ones someone
            // got round to: a match you skipped is a match you did not get right, and
            // counting it any other way lets whoever votes least top the table.
            accuracy: round(ratio(p.exactScores, p.matchesAvailable)),
            partialAccuracy: round(ratio(p.wins, p.matchesAvailable)),
            // The same two over what they actually sent, for when the question really is
            // "when they do vote, how good are they?".
            accuracyWhenVoted: round(ratio(p.exactScores, p.predictions)),
            partialAccuracyWhenVoted: round(ratio(p.wins, p.predictions)),
            pointsPerPrediction: round(ratio(p.points, p.predictions), 2)
        }))
        .sort((a, b) => b.pointsOfficial - a.pointsOfficial);
};

/**
 * Sello de versión de un ámbito.
 *
 * Las estadísticas solo cambian al cerrar un partido, así que `computed_at` bastaría
 * — salvo por los puntos de equipo favorito, que se meten a mano en LeagueParticipation
 * y esa tabla no tiene timestamps. Por eso el sello lleva también la suma de puntos del
 * ámbito: cualquier ajuste manual la mueve y la caché se cae sola sin tener que acordarse
 * de invalidar nada.
 *
 * @param {Array<number>} leagueIds
 * @returns {Promise<string>}
 */
const scopeVersion = async (leagueIds) => {
    if (!leagueIds.length) return 'vacio';

    const [row] = await sequelize.query(`
        SELECT COALESCE(EXTRACT(EPOCH FROM MAX(computed_at))::bigint, 0) AS computed,
               COUNT(*)::int AS filas,
               COALESCE((SELECT SUM(points)::int FROM "LeagueParticipation"
                         WHERE league_id IN (:leagueIds)), 0) AS manual
        FROM "PlayerLeagueStat" WHERE league_id IN (:leagueIds)
    `, { replacements: { leagueIds }, type: QueryTypes.SELECT });

    return `${row.computed}.${row.filas}.${row.manual}`;
};

/**
 * Pone el ETag y contesta 304 si el navegador ya tiene esa versión.
 *
 * Se llama antes de calcular nada: la gracia es ahorrarse el trabajo, no solo el ancho
 * de banda. `no-cache` no significa «no guardes», significa «guarda pero pregunta»,
 * que es justo lo que hace falta aquí; y `private` porque, aunque estas respuestas son
 * iguales para todo el mundo, van detrás de un token y no quiero que ningún proxy las
 * guarde por su cuenta.
 *
 * @returns {Promise<boolean>} true si ya se ha respondido y no hay que hacer más.
 */
const alreadyFresh = async (req, res, leagueIds) => {
    const version = await scopeVersion(leagueIds);
    const etag = 'W/"' + crypto.createHash('sha1')
        .update(`${req.originalUrl}|${version}`).digest('hex').slice(0, 20) + '"';

    res.set('ETag', etag);
    res.set('Cache-Control', 'private, no-cache');

    if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return true;
    }
    return false;
};

/** Loads the scope's league rows with their user attached. */
const loadLeagueStats = (leagueIds) => PlayerLeagueStat.findAll({
    where: { league_id: { [Op.in]: leagueIds } },
    include: [{ model: User, as: 'User', attributes: ['id', 'username', 'logo_url'] }]
});

/**
 * Accuracy and exact-score rate per match format, across the scope.
 *
 * Not precomputed on purpose: it is one grouped query and storing three more sets of
 * columns on every player row to save it would not pay for itself.
 *
 * @param {Array<number>} leagueIds
 */
const formatBreakdown = async (leagueIds, players) => {
    if (leagueIds.length === 0) return [];

    const rows = await sequelize.query(`
        SELECT m.format,
               COUNT(*)::int AS predictions,
               SUM(CASE WHEN p.winner = r.winner THEN 1 ELSE 0 END)::int AS wins,
               SUM(CASE WHEN p.winner = r.winner AND p.description = r.result THEN 1 ELSE 0 END)::int AS exact_scores
        FROM ${predictions()} p
        JOIN "Match" m ON m.id = p.match_id
        JOIN "Result" r ON r.match_id = m.id
        WHERE m.league_id IN (:leagueIds)
        GROUP BY m.format
        ORDER BY m.format
    `, { replacements: { leagueIds }, type: QueryTypes.SELECT });

    // Resolved matches per format, counted on their own: a match nobody predicted
    // still belongs in the denominator.
    const perFormat = await sequelize.query(
        'SELECT m.format, COUNT(*)::int AS matches FROM "Match" m ' +
        'JOIN "Result" r ON r.match_id = m.id WHERE m.league_id IN (:leagueIds) GROUP BY m.format',
        { replacements: { leagueIds }, type: QueryTypes.SELECT }
    );
    const matchesOf = {};
    perFormat.forEach(m => { matchesOf[m.format] = m.matches; });

    return rows.map(r => {
        const possible = (matchesOf[r.format] || 0) * players;
        return {
            format: r.format,
            matches: matchesOf[r.format] || 0,
            predictions: r.predictions,
            wins: r.wins,
            exactScores: r.exact_scores,
            accuracy: round(ratio(r.exact_scores, possible)),
            partialAccuracy: round(ratio(r.wins, possible))
        };
    });
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/stats/overview
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Headline numbers, who leads each metric, and how the points built up.
 */
exports.getOverview = async (req, res) => {
    try {
        const scope = await resolveScope(req.query);
        if (await alreadyFresh(req, res, scope.leagueIds)) return;

        if (scope.leagueIds.length === 0) {
            return res.json({
                scope: { ...scope, years: await availableYears() },
                reliable: false, totals: null, leaders: [], progression: null, byFormat: []
            });
        }

        const rows = await loadLeagueStats(scope.leagueIds);
        const players = foldByPlayer(rows);

        const sum = (key) => players.reduce((s, p) => s + p[key], 0);
        const matchesAvailable = players.length ? Math.max(...players.map(p => p.matchesAvailable)) : 0;

        const totals = {
            players: players.length,
            matches: matchesAvailable,
            predictions: sum('predictions'),
            possible: matchesAvailable * players.length,
            wins: sum('wins'),
            exactScores: sum('exactScores'),
            plenos: sum('plenos'),
            points: sum('points'),
            pointsOfficial: sum('pointsOfficial'),
            bonusStreak: sum('pointsStreak'),
            bonusFavorite: sum('pointsFavorite')
        };
        totals.participation = round(Math.min(1, ratio(totals.predictions, totals.possible)));
        totals.accuracy = round(ratio(totals.exactScores, totals.possible));
        totals.partialAccuracy = round(ratio(totals.wins, totals.possible));
        totals.accuracyWhenVoted = round(ratio(totals.exactScores, totals.predictions));
        totals.pointsAverage = round(ratio(totals.pointsOfficial, players.length), 1);

        // Leaders are by metric, not by rank: someone can top one of these and sit
        // fourth in the table.
        // No eligibility filter any more: now that the percentages count skipped
        // matches as missed, voting less can only push them down.
        const best = (key) => {
            if (!players.length) return null;
            const winner = players.reduce((a, b) => (b[key] > a[key] ? b : a));
            return { user: winner.user, value: winner[key] };
        };

        const leaders = [
            { metric: 'points', label: 'Más puntos', ...best('pointsOfficial') },
            { metric: 'accuracy', label: 'Mejor % de acierto', ...best('accuracy') },
            { metric: 'partialAccuracy', label: 'Mejor acierto parcial', ...best('partialAccuracy') },
            { metric: 'bestRun', label: 'Mejor pleno', ...best('bestRun') },
            { metric: 'favoriteBonus', label: 'Más bonus de equipo favorito', ...best('pointsFavorite') }
        ].filter(l => l.user);

        res.json({
            scope: { ...scope, years: await availableYears() },
            reliable: matchesAvailable >= MIN_MATCHES,
            totals,
            leaders,
            progression: await buildProgression(scope, players),
            byFormat: await formatBreakdown(scope.leagueIds, players.length)
        });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

/**
 * The running-total chart.
 *
 * Across the Pachanga the x axis is the competition; inside one league it is the week.
 * Both come from stats tables, never from predictions.
 *
 * @param {Object} scope
 * @param {Array<Object>} players - Output of foldByPlayer.
 */
const buildProgression = async (scope, players) => {
    if (scope.type === 'league') {
        // Straight from LeagueParticipation, whose weekly rows already hold the running
        // total. Reading them means the line ends exactly where /clasificacion says,
        // which matters in the leagues whose standings were frozen with their drift.
        const weekRows = await LeagueParticipation.findAll({
            where: { league_id: scope.leagueIds[0], week: { [Op.gt]: 0 } },
            order: [['week', 'ASC']]
        });
        const weeks = [...new Set(weekRows.map(r => r.week))].sort((a, b) => a - b);

        const series = players.map(p => {
            let last = 0;
            return {
                user: p.user,
                cumulative: weeks.map(w => {
                    const row = weekRows.find(r => r.user_id === p.user.id && r.week === w);
                    if (row) last = row.points;
                    return last;
                })
            };
        });

        return { axis: 'week', labels: weeks.map(w => `J${w}`), series, average: averageOf(series) };
    }

    const leagues = scope.leagues;
    const series = players.map(p => {
        let running = 0;
        return {
            user: p.user,
            cumulative: leagues.map(l => {
                const row = p.byLeague.find(b => b.leagueId === l.id);
                running += row ? row.pointsOfficial : 0;
                return running;
            })
        };
    });

    return { axis: 'league', labels: leagues.map(l => l.name), series, average: averageOf(series) };
};

/** The grey reference line: the mean of every player at each point. */
const averageOf = (series) => {
    if (!series.length) return [];
    return series[0].cumulative.map((_, i) =>
        round(series.reduce((s, x) => s + x.cumulative[i], 0) / series.length, 1)
    );
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/stats/players
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Every player with every metric. This is also the accessible version of the charts
 * and what the CSV export is built from.
 */
exports.getPlayers = async (req, res) => {
    try {
        const scope = await resolveScope(req.query);
        if (await alreadyFresh(req, res, scope.leagueIds)) return;
        if (scope.leagueIds.length === 0) return res.json({ scope, players: [] });

        const rows = await loadLeagueStats(scope.leagueIds);
        const players = foldByPlayer(rows).map((p, i) => ({ ...p, rank: i + 1 }));

        res.json({ scope, leagues: scope.leagues, players });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/stats/player/:userId
// ═══════════════════════════════════════════════════════════════════════════

/**
 * One player's card: how they compare with the average, league by league, where their
 * points came from, their best runs, the week map and which teams they read well.
 */
exports.getPlayer = async (req, res) => {
    try {
        const scope = await resolveScope(req.query);
        if (await alreadyFresh(req, res, scope.leagueIds)) return;

        const userId = parseInt(req.params.userId, 10);
        const rows = await loadLeagueStats(scope.leagueIds);
        const players = foldByPlayer(rows);
        const player = players.find(p => p.user.id === userId);

        if (!player) return res.status(404).json({ error: 'Ese jugador no tiene datos en este ámbito' });

        // Compared against everyone, including themselves: the same number whoever looks.
        const meanOf = (key) => round(players.reduce((s, p) => s + p[key], 0) / players.length, 3);
        const average = {
            accuracy: meanOf('accuracy'),
            partialAccuracy: meanOf('partialAccuracy'),
            participation: meanOf('participation'),
            pointsPerPrediction: meanOf('pointsPerPrediction')
        };

        const leagueById = {};
        scope.leagues.forEach(l => { leagueById[l.id] = l; });

        res.json({
            scope,
            player: player.user,
            rank: players.findIndex(p => p.user.id === userId) + 1,
            of: players.length,
            totals: player,
            average,
            byLeague: player.byLeague.map(b => ({
                ...b,
                name: leagueById[b.leagueId] ? leagueById[b.leagueId].name : null
            })),
            breakdown: {
                base: player.pointsBase,
                exact: player.pointsExact,
                streak: player.pointsStreak,
                favorite: player.pointsFavorite,
                // Aparte de los cuatro de arriba: no es una quinta porción de la
                // barra apilada, sino una línea suelta. Puede ser negativo.
                manual: player.pointsManual
            },
            weeks: await weekMap(userId, scope.leagueIds, leagueById),
            teams: await teamAccuracy(userId, scope.leagueIds)
        });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

/**
 * Week-by-week grid for the heat map.
 *
 * Carries `matchesAvailable` so the UI can tell "there were no matches" apart from
 * "played and got none right" — confusing the two is the classic bug of these maps.
 */
const weekMap = async (userId, leagueIds, leagueById) => {
    if (leagueIds.length === 0) return [];

    const rows = await PlayerWeekStat.findAll({
        where: { league_id: { [Op.in]: leagueIds } },
        order: [['league_id', 'ASC'], ['week', 'ASC']]
    });

    const out = [];
    for (const leagueId of leagueIds) {
        const ofLeague = rows.filter(r => r.league_id === leagueId);
        const weeks = [...new Set(ofLeague.map(r => r.week))].sort((a, b) => a - b);
        if (!weeks.length) continue;

        out.push({
            leagueId,
            name: leagueById[leagueId] ? leagueById[leagueId].name : null,
            weeks: weeks.map(w => {
                const anyone = ofLeague.find(r => r.week === w);
                const mine = ofLeague.find(r => r.week === w && r.user_id === userId);
                return {
                    week: w,
                    matchesAvailable: anyone ? anyone.matches_available : 0,
                    predictions: mine ? mine.predictions : 0,
                    wins: mine ? mine.wins : 0,
                    exactScores: mine ? mine.exact_scores : 0,
                    points: mine ? mine.points : 0
                };
            })
        });
    }

    return out;
};

/**
 * How well someone reads each team, counting every match that team played in.
 *
 * Left as a live query: precomputing it would mean a row per player per team per
 * league, which grows far faster than anything else the stats keep.
 */
const teamAccuracy = async (userId, leagueIds) => {
    if (leagueIds.length === 0) return { best: null, worst: null, all: [] };

    const rows = await sequelize.query(`
        SELECT t.id, t.name, t.acronym, t.logo_url,
               COUNT(*)::int AS appearances,
               SUM(CASE WHEN p.winner = r.winner THEN 1 ELSE 0 END)::int AS correct
        FROM ${predictions('user_id = :userId')} p
        JOIN "Match" m ON m.id = p.match_id
        JOIN "Result" r ON r.match_id = m.id
        JOIN "TeamMatches" tm ON tm.match_id = m.id
        JOIN "Team" t ON t.id = tm.team_id
        WHERE p.user_id = :userId AND m.league_id IN (:leagueIds)
        GROUP BY t.id, t.name, t.acronym, t.logo_url
        HAVING COUNT(*) >= 4
    `, { replacements: { userId, leagueIds }, type: QueryTypes.SELECT });

    const all = rows
        .map(r => ({ ...r, accuracy: round(ratio(r.correct, r.appearances)) }))
        .sort((a, b) => b.accuracy - a.accuracy);

    return {
        best: all[0] || null,
        worst: all.length > 1 ? all[all.length - 1] : null,
        all
    };
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/stats/compare?a=1&b=2
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Two players side by side, plus the matches where they went different ways.
 */
exports.getCompare = async (req, res) => {
    try {
        const scope = await resolveScope(req.query);
        if (await alreadyFresh(req, res, scope.leagueIds)) return;

        const a = parseInt(req.query.a, 10);
        const b = parseInt(req.query.b, 10);

        if (!a || !b || a === b) {
            return res.status(400).json({ error: 'Hacen falta dos jugadores distintos (a y b)' });
        }

        const rows = await loadLeagueStats(scope.leagueIds);
        const players = foldByPlayer(rows);
        const pa = players.find(p => p.user.id === a);
        const pb = players.find(p => p.user.id === b);

        if (!pa || !pb) return res.status(404).json({ error: 'Alguno de los dos no tiene datos en este ámbito' });

        const leagueById = {};
        scope.leagues.forEach(l => { leagueById[l.id] = l; });

        res.json({
            scope,
            a: { ...pa, rank: players.findIndex(p => p.user.id === a) + 1 },
            b: { ...pb, rank: players.findIndex(p => p.user.id === b) + 1 },
            headToHead: await headToHead(a, b, scope.leagueIds),
            byLeague: scope.leagues.map(l => ({
                leagueId: l.id,
                name: l.name,
                a: (pa.byLeague.find(x => x.leagueId === l.id) || {}).pointsOfficial || 0,
                b: (pb.byLeague.find(x => x.leagueId === l.id) || {}).pointsOfficial || 0
            })),
            divergent: await divergentMatches(a, b, scope.leagueIds)
        });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

/** Matches both of them played, and who came out ahead. */
const headToHead = async (a, b, leagueIds) => {
    if (leagueIds.length === 0) return { together: 0, aBetter: 0, bBetter: 0, draws: 0, sameVote: 0 };

    const [row] = await sequelize.query(`
        SELECT COUNT(*)::int AS together,
               SUM(CASE WHEN pa.points > pb.points THEN 1 ELSE 0 END)::int AS a_better,
               SUM(CASE WHEN pb.points > pa.points THEN 1 ELSE 0 END)::int AS b_better,
               SUM(CASE WHEN pa.winner = pb.winner THEN 1 ELSE 0 END)::int AS same_vote
        FROM ${predictions('user_id IN (:a, :b)')} pa
        JOIN ${predictions('user_id IN (:a, :b)')} pb ON pb.match_id = pa.match_id AND pb.user_id = :b
        JOIN "Match" m ON m.id = pa.match_id
        JOIN "Result" r ON r.match_id = m.id
        WHERE pa.user_id = :a AND m.league_id IN (:leagueIds)
    `, { replacements: { a, b, leagueIds }, type: QueryTypes.SELECT });

    const together = row.together || 0;
    return {
        together,
        aBetter: row.a_better || 0,
        bBetter: row.b_better || 0,
        draws: together - (row.a_better || 0) - (row.b_better || 0),
        sameVote: row.same_vote || 0,
        agreement: round(ratio(row.same_vote || 0, together))
    };
};

/** The handful of matches where they voted differently and it cost the most. */
const divergentMatches = async (a, b, leagueIds, limit = 5) => {
    if (leagueIds.length === 0) return [];

    const rows = await sequelize.query(`
        SELECT m.id, m.date, m.format, l.name AS league, r.result,
               pa.points::int AS a_points, pb.points::int AS b_points
        FROM ${predictions('user_id IN (:a, :b)')} pa
        JOIN ${predictions('user_id IN (:a, :b)')} pb ON pb.match_id = pa.match_id AND pb.user_id = :b
        JOIN "Match" m ON m.id = pa.match_id
        JOIN "League" l ON l.id = m.league_id
        JOIN "Result" r ON r.match_id = m.id
        WHERE pa.user_id = :a AND m.league_id IN (:leagueIds) AND pa.winner <> pb.winner
        ORDER BY ABS(pa.points - pb.points) DESC, m.date DESC
        LIMIT :limit
    `, { replacements: { a, b, leagueIds, limit }, type: QueryTypes.SELECT });

    if (!rows.length) return [];

    // Team names in one go rather than a query per match.
    const teams = await sequelize.query(`
        SELECT tm.match_id, t.acronym, t.name
        FROM "TeamMatches" tm JOIN "Team" t ON t.id = tm.team_id
        WHERE tm.match_id IN (:matchIds)
        ORDER BY tm.match_id, t.id
    `, { replacements: { matchIds: rows.map(r => r.id) }, type: QueryTypes.SELECT });

    const byMatch = {};
    teams.forEach(t => { (byMatch[t.match_id] = byMatch[t.match_id] || []).push(t.acronym || t.name); });

    return rows.map(r => ({
        matchId: r.id,
        date: r.date,
        league: r.league,
        format: r.format,
        result: r.result,
        teams: byMatch[r.id] || [],
        aPoints: r.a_points,
        bPoints: r.b_points,
        diff: r.a_points - r.b_points
    }));
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/stats/leagues?year=2026
// ═══════════════════════════════════════════════════════════════════════════

/**
 * One row per competition of a season, plus how spread out the players were in each.
 *
 * Worlds shows up here even though it does not score, flagged, because it is reachable
 * from this table and it is worth seeing next to the rest.
 */
exports.getLeagues = async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
        const leagues = (await League.findAll({ order: [['start_date', 'ASC']] }))
            .filter(l => new Date(l.start_date).getFullYear() === year);

        // Aquí el ámbito es la temporada entera, Worlds incluido: esta tabla lo enseña.
        if (await alreadyFresh(req, res, leagues.map(l => l.id))) return;

        const rows = [];
        for (const league of leagues) {
            const stats = await loadLeagueStats([league.id]);
            const players = foldByPlayer(stats);

            const matchesAvailable = players.length ? Math.max(...players.map(p => p.matchesAvailable)) : 0;
            const predictions = players.reduce((s, p) => s + p.predictions, 0);
            const wins = players.reduce((s, p) => s + p.wins, 0);
            const exactScores = players.reduce((s, p) => s + p.exactScores, 0);
            // Sin filtro: con el denominador nuevo, quien vota poco ya baja solo.
            const accuracies = players.map(p => p.accuracy);

            rows.push({
                id: league.id,
                name: league.name,
                logo_url: league.logo_url,
                status: league.status,
                countsForPachanga: league.counts_for_pachanga,
                players: players.length,
                matches: matchesAvailable,
                predictions,
                possible: matchesAvailable * players.length,
                participation: round(Math.min(1, ratio(predictions, matchesAvailable * players.length))),
                accuracy: round(ratio(exactScores, matchesAvailable * players.length)),
                partialAccuracy: round(ratio(wins, matchesAvailable * players.length)),
                pointsAverage: round(ratio(players.reduce((s, p) => s + p.pointsOfficial, 0), players.length), 1),
                // Min, mean and max accuracy: how much the league spread people out.
                accuracyRange: accuracies.length
                    ? { min: Math.min(...accuracies), max: Math.max(...accuracies) }
                    : null,
                winner: players.length ? players[0].user : null,
                reliable: matchesAvailable >= MIN_MATCHES
            });
        }

        res.json({ year, years: await availableYears(), leagues: rows });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/stats/moments?leagueId=4
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The four matches worth talking about in a league.
 *
 * Returns numbers, not sentences: the wording lives in the client so changing it never
 * needs a migration.
 */
exports.getMoments = async (req, res) => {
    try {
        const leagueId = parseInt(req.query.leagueId, 10);
        if (!leagueId) return res.status(400).json({ error: 'Hace falta leagueId' });
        if (await alreadyFresh(req, res, [leagueId])) return;

        const stats = await MatchStat.findAll({
            where: { league_id: leagueId, predictions_count: { [Op.gt]: 0 } }
        });
        if (!stats.length) return res.json({ leagueId, moments: [] });

        const matchIds = stats.map(s => s.match_id);
        const [teams, results] = await Promise.all([
            sequelize.query(`
                SELECT tm.match_id, t.acronym, t.name
                FROM "TeamMatches" tm JOIN "Team" t ON t.id = tm.team_id
                WHERE tm.match_id IN (:matchIds) ORDER BY tm.match_id, t.id
            `, { replacements: { matchIds }, type: QueryTypes.SELECT }),
            sequelize.query(`
                SELECT r.match_id, r.result, t.acronym AS winner
                FROM "Result" r LEFT JOIN "Team" t ON t.id = r.winner
                WHERE r.match_id IN (:matchIds)
            `, { replacements: { matchIds }, type: QueryTypes.SELECT })
        ]);

        const teamsByMatch = {};
        teams.forEach(t => { (teamsByMatch[t.match_id] = teamsByMatch[t.match_id] || []).push(t.acronym || t.name); });
        const resultByMatch = {};
        results.forEach(r => { resultByMatch[r.match_id] = r; });

        const describe = (stat, kind) => stat && ({
            kind,
            matchId: stat.match_id,
            week: stat.week,
            teams: teamsByMatch[stat.match_id] || [],
            result: (resultByMatch[stat.match_id] || {}).result || null,
            winner: (resultByMatch[stat.match_id] || {}).winner || null,
            predictions: stat.predictions_count,
            correct: stat.correct_count,
            exact: stat.exact_count,
            topVoteShare: round(stat.top_vote_share)
        });

        const pick = (list, better) => (list.length ? list.reduce(better) : null);
        const voted = stats.filter(s => s.predictions_count >= 2);

        // Most divided: the vote share closest to an even split.
        const divided = pick(voted, (a, b) =>
            Math.abs(b.top_vote_share - 0.5) < Math.abs(a.top_vote_share - 0.5) ? b : a);

        // The upset: fewest people saw it coming.
        const upset = pick(voted, (a, b) =>
            ratio(b.correct_count, b.predictions_count) < ratio(a.correct_count, a.predictions_count) ? b : a);

        // Unanimity: everyone got the winner, and as many people as possible played.
        const unanimous = pick(
            voted.filter(s => s.correct_count === s.predictions_count),
            (a, b) => (b.predictions_count > a.predictions_count ? b : a)
        );

        // Best pleno of the league, which comes from the week rows rather than a match.
        const bestRun = await PlayerWeekStat.findOne({
            where: { league_id: leagueId },
            order: [['best_run', 'DESC']],
            include: [{ model: User, as: 'User', attributes: ['id', 'username', 'logo_url'] }]
        });

        const moments = [
            describe(divided, 'divided'),
            describe(upset, 'upset'),
            describe(unanimous, 'unanimous')
        ].filter(Boolean);

        if (bestRun && bestRun.best_run >= 3) {
            moments.push({
                kind: 'bestRun',
                week: bestRun.week,
                user: userPayload(bestRun.User),
                length: bestRun.best_run,
                bonus: bestRun.points_streak
            });
        }

        res.json({ leagueId, moments });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/stats/recompute   (solo admin)
// ═══════════════════════════════════════════════════════════════════════════

/** Una recomputación a la vez: dos a la vez se pisarían escribiendo las mismas filas. */
let recomputing = false;

/**
 * Rehace las estadísticas de una temporada a mano, desde el panel.
 *
 * Solo toca las tablas de estadísticas: `recomputeSeason` no reparte puntos, los mide.
 * Ni `Prediction.points` ni `LeagueParticipation` se tocan, así que esto no puede
 * reescribir una liga que ya pasó — es exactamente para lo que existe el botón, poder
 * cuadrar un descuadre sin entrar por SSH y sin miedo a romper el historial.
 */
exports.postRecompute = async (req, res) => {
    if (recomputing) {
        return res.status(409).json({ error: 'Ya hay un recálculo en marcha' });
    }

    const year = req.body && req.body.year
        ? parseInt(req.body.year, 10)
        : new Date().getFullYear();

    if (!year || year < 2000 || year > 2100) {
        return res.status(400).json({ error: 'Temporada no válida' });
    }

    recomputing = true;
    const started = Date.now();
    try {
        const summaries = await statsAggregator.recomputeSeason(year);
        res.json({
            year,
            leagues: summaries,
            seconds: Math.round((Date.now() - started) / 100) / 10
        });
    } catch (error) {
        console.error('Error recalculando estadísticas:', error);
        res.status(500).json({ error: error.message });
    } finally {
        recomputing = false;
    }
};
