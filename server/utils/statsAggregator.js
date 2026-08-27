const { Op } = require('sequelize');
const sequelize = require('../config/configdb');

const League = require('../models/league');
const Match = require('../models/match');
const Result = require('../models/result');
const Prediction = require('../models/prediction');
const FavoriteTeam = require('../models/favoriteTeam');
const LeagueParticipation = require('../models/leagueParticipation');
const PlayerWeekStat = require('../models/playerWeekStat');
const PlayerLeagueStat = require('../models/playerLeagueStat');
const MatchStat = require('../models/matchStat');

const { startOfWeek } = require('../controllers/weekController');
const { calculatePredictionBreakdown } = require('./pointsCalculator');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Stats aggregator.
 *
 * Everything the stats screens read is written here, and it is written when a result
 * is created, changed or deleted — never when someone opens a page.
 *
 * The unit of work is the LEAGUE WEEK, not the match. A pleno chains matches inside a
 * week, so changing the third match of a week can change what the fourth and fifth
 * were worth. Recomputing a single match would leave those wrong.
 *
 * Every function deletes and rewrites what it covers instead of incrementing, so
 * running it twice gives exactly the same result as running it once.
 */

/**
 * First and last instant of a league week. Mirrors getLeagueWeekNumber exactly:
 * week N is [leagueWeekStart + (N-1)*7d, leagueWeekStart + N*7d).
 *
 * @param {Date|string} leagueStartDate
 * @param {number} week - 1-based league week.
 * @returns {{from: Date, to: Date}}
 */
const weekBounds = (leagueStartDate, week) => {
    const base = startOfWeek(new Date(leagueStartDate)).getTime();
    return {
        from: new Date(base + (week - 1) * WEEK_MS),
        to: new Date(base + week * WEEK_MS - 1)
    };
};

/**
 * League week a date falls into. Same numbering LeagueParticipation uses.
 *
 * @param {Date|string} leagueStartDate
 * @param {Date|string} date
 * @returns {number} 1-based league week.
 */
const weekOf = (leagueStartDate, date) => {
    const base = startOfWeek(new Date(leagueStartDate)).getTime();
    return Math.floor((new Date(date).getTime() - base) / WEEK_MS) + 1;
};

/**
 * Everyone who should have a row for this league: whoever joined it, plus anyone who
 * sent a prediction even if their participation row went missing.
 *
 * @param {number} leagueId
 * @param {Array<Object>} predictions - Predictions already loaded for this league.
 * @returns {Promise<Array<number>>} User ids.
 */
const rosterFor = async (leagueId, predictions) => {
    const participants = await LeagueParticipation.findAll({
        where: { league_id: leagueId, week: -1 },
        attributes: ['user_id']
    });

    const ids = new Set(participants.map(p => p.user_id));
    predictions.forEach(p => ids.add(p.user_id));
    return [...ids];
};

/**
 * Works out one league week without writing anything.
 *
 * Returns the rows the stats tables need, plus what every prediction of the week is
 * worth right now. Callers decide what to do with that.
 *
 * @param {Object} league - Loaded League instance.
 * @param {number} week - 1-based league week.
 * @returns {Promise<Object>}
 */
const computeWeek = async (league, week) => {
    const { from, to } = weekBounds(league.start_date, week);

    // Chronological order matters: plenos are built walking the week forwards.
    const weekMatches = await Match.findAll({
        where: { league_id: league.id, date: { [Op.between]: [from, to] } },
        order: [['date', 'ASC']]
    });
    const weekMatchIds = weekMatches.map(m => m.id);

    if (weekMatchIds.length === 0) {
        return {
            empty: true, weekMatchIds: [], weekRows: [], matchRows: [],
            predictions: [], pointsByPrediction: new Map(), roster: []
        };
    }

    const [results, allPredictions, favorites] = await Promise.all([
        Result.findAll({ where: { match_id: { [Op.in]: weekMatchIds } } }),
        Prediction.findAll({ where: { match_id: { [Op.in]: weekMatchIds } } }),
        FavoriteTeam.findAll({ where: { league_id: league.id } })
    ]);

    // A handful of matches carry two predictions from the same person. Counting both
    // inflates predictions, hits and participation — which is where "276 de 270
    // posibles" came from — and scores the same match twice. Only the most recent one
    // counts; the others are kept around so they can be zeroed out.
    const newest = new Map();
    for (const p of allPredictions) {
        const key = `${p.user_id}:${p.match_id}`;
        const prev = newest.get(key);
        if (!prev || p.id > prev.id) newest.set(key, p);
    }
    const predictions = [...newest.values()];

    const resultMap = {};
    results.forEach(r => { resultMap[r.match_id] = { winner: r.winner, result: r.result }; });

    // One lookup table instead of a FavoriteTeam query per prediction.
    const favoriteTeamMap = {};
    favorites.forEach(f => { favoriteTeamMap[f.user_id] = f.team_id; });

    const predictionsByMatch = {};
    predictions.forEach(p => {
        (predictionsByMatch[p.match_id] = predictionsByMatch[p.match_id] || []).push(p);
    });

    const roster = await rosterFor(league.id, predictions);

    // Resolved matches only: an unplayed match is not "available" to anyone yet.
    const resolvedMatches = weekMatches.filter(m => resultMap[m.id]);

    // Every prediction of the week starts at zero, so one whose match lost its result
    // is correctly worth nothing rather than keeping a stale value. Duplicates stay at
    // zero for good: the copy that counts is the newest one.
    const pointsByPrediction = new Map();
    allPredictions.forEach(p => pointsByPrediction.set(p.id, 0));

    const blank = (userId) => ({
        user_id: userId,
        league_id: league.id,
        week,
        matches_available: resolvedMatches.length,
        predictions: 0,
        wins: 0,
        exact_scores: 0,
        best_run: 0,
        points: 0,
        points_base: 0,
        points_exact: 0,
        points_streak: 0,
        points_favorite: 0,
        plenos: 0
    });

    const perUser = {};
    roster.forEach(id => { perUser[id] = blank(id); });

    const matchRows = [];

    for (const match of resolvedMatches) {
        const real = resultMap[match.id];
        const matchPredictions = predictionsByMatch[match.id] || [];

        let correct = 0;
        let exact = 0;
        const votes = {};

        for (const prediction of matchPredictions) {
            votes[prediction.winner] = (votes[prediction.winner] || 0) + 1;

            const breakdown = await calculatePredictionBreakdown({
                prediction,
                match,
                winner: real.winner,
                resultStr: real.result,
                weekMatchIds,
                resultMap,
                allWeekPredictions: predictions,
                favoriteTeamMap
            });

            pointsByPrediction.set(prediction.id, breakdown.total);

            if (!perUser[prediction.user_id]) perUser[prediction.user_id] = blank(prediction.user_id);
            const row = perUser[prediction.user_id];

            row.predictions += 1;
            row.points += breakdown.total;
            row.points_base += breakdown.base;
            row.points_exact += breakdown.exact;
            row.points_streak += breakdown.streak;
            row.points_favorite += breakdown.favorite;

            if (prediction.winner === real.winner) {
                row.wins += 1;
                correct += 1;
            }
            if (breakdown.isPerfect) {
                row.exact_scores += 1;
                exact += 1;
            }

            if (breakdown.streakLength > row.best_run) row.best_run = breakdown.streakLength;
            // A run that reaches 3 passes through streakLength === 3 exactly once, so
            // this counts runs rather than matches — and it is the very same condition
            // that pays the bonus.
            if (breakdown.streakLength === 3) row.plenos += 1;
        }

        const total = matchPredictions.length;
        const topVotes = Object.values(votes).reduce((max, v) => Math.max(max, v), 0);

        matchRows.push({
            match_id: match.id,
            league_id: league.id,
            week,
            predictions_count: total,
            correct_count: correct,
            exact_count: exact,
            top_vote_share: total > 0 ? topVotes / total : 0,
            computed_at: new Date()
        });
    }

    const weekRows = Object.values(perUser).map(row => ({ ...row, computed_at: new Date() }));

    return { empty: false, weekMatchIds, weekRows, matchRows, predictions: allPredictions, pointsByPrediction, roster };
};

/**
 * Writes what computeWeek worked out into the stats tables. Delete + insert inside one
 * transaction, so a crash never leaves half a week behind.
 *
 * @param {number} leagueId
 * @param {number} week
 * @param {Object} computed - Output of computeWeek.
 */
const writeWeekStats = async (leagueId, week, computed) => {
    await sequelize.transaction(async (transaction) => {
        await PlayerWeekStat.destroy({ where: { league_id: leagueId, week }, transaction });
        if (computed.weekRows.length) {
            await PlayerWeekStat.bulkCreate(computed.weekRows, { transaction });
        }
        if (computed.weekMatchIds.length) {
            await MatchStat.destroy({ where: { match_id: { [Op.in]: computed.weekMatchIds } }, transaction });
        }
        if (computed.matchRows.length) {
            await MatchStat.bulkCreate(computed.matchRows, { transaction });
        }
    });
};

/**
 * Makes sure every player has a row for this week, and one for the running total.
 *
 * Weekly rows carry the cumulative total, so a new one starts where the previous week
 * left off. This is the same shape the site has always used.
 *
 * @param {number} leagueId
 * @param {number} week
 * @param {Array<number>} userIds
 * @param {Object} transaction
 */
const ensureParticipationRows = async (leagueId, week, userIds, transaction) => {
    for (const userId of userIds) {
        const [, createdTotal] = await LeagueParticipation.findOrCreate({
            where: { user_id: userId, league_id: leagueId, week: -1 },
            defaults: { points: 0 },
            transaction
        });

        const existing = await LeagueParticipation.findOne({
            where: { user_id: userId, league_id: leagueId, week },
            transaction
        });
        if (existing) continue;

        const previous = await LeagueParticipation.findOne({
            where: { user_id: userId, league_id: leagueId, week: { [Op.gt]: 0, [Op.lt]: week } },
            order: [['week', 'DESC']],
            transaction
        });

        await LeagueParticipation.create({
            user_id: userId,
            league_id: leagueId,
            week,
            points: previous ? previous.points : 0
        }, { transaction });
    }
};

/**
 * Recomputes one week of one league in the stats tables only. Touches no points.
 *
 * @param {number} leagueId
 * @param {number} week - 1-based league week.
 * @param {Object} [options]
 * @param {boolean} [options.rollUp=true] - Also refresh the league totals afterwards.
 *   Set to false when looping over many weeks, then call rollUpLeague once at the end.
 * @returns {Promise<{week: number, matches: number, players: number}>}
 */
exports.recomputeLeagueWeek = async (leagueId, week, options = {}) => {
    const { rollUp = true } = options;

    const league = await League.findByPk(leagueId);
    if (!league) throw new Error(`League ${leagueId} not found`);

    const computed = await computeWeek(league, week);
    await writeWeekStats(leagueId, week, computed);

    if (rollUp) await exports.rollUpLeague(leagueId);

    return { week, matches: computed.matchRows.length, players: computed.weekRows.length };
};

/**
 * Recomputes one week AND moves the league standings to match, by difference.
 *
 * This is what runs when a result is created, corrected or deleted. It never rebuilds
 * a total from scratch: it works out what each prediction is worth now, subtracts what
 * it was worth before (which is what Prediction.points has been holding all along) and
 * applies only the difference.
 *
 * That has two consequences worth knowing:
 *
 *  - Closing the same match twice moves nothing the second time, because the
 *    difference is zero. The old code incremented blindly, which is how the standings
 *    drifted above the predictions in the first place.
 *  - Leagues nobody touches are never rewritten. History stays exactly as it was
 *    played, drift included. Only an actual correction moves anything, and then it
 *    moves by exactly the amount the correction is worth.
 *
 * @param {number} leagueId
 * @param {number} week - 1-based league week.
 * @returns {Promise<{week: number, changedPredictions: number, playersAffected: number, delta: number}>}
 */
exports.applyWeekPoints = async (leagueId, week) => {
    const league = await League.findByPk(leagueId);
    if (!league) throw new Error(`League ${leagueId} not found`);

    const computed = await computeWeek(league, week);
    await writeWeekStats(leagueId, week, computed);

    if (computed.empty) {
        await exports.rollUpLeague(leagueId);
        return { week, changedPredictions: 0, playersAffected: 0, delta: 0 };
    }

    // What changed, and by how much, for each player.
    const deltaByUser = {};
    const changed = [];

    for (const prediction of computed.predictions) {
        const now = computed.pointsByPrediction.get(prediction.id) || 0;
        const before = prediction.points || 0;
        if (now === before) continue;

        deltaByUser[prediction.user_id] = (deltaByUser[prediction.user_id] || 0) + (now - before);
        changed.push({ id: prediction.id, points: now });
    }

    await sequelize.transaction(async (transaction) => {
        for (const c of changed) {
            await Prediction.update({ points: c.points }, { where: { id: c.id }, transaction });
        }

        await ensureParticipationRows(league.id, week, computed.roster, transaction);

        for (const [userId, delta] of Object.entries(deltaByUser)) {
            if (!delta) continue;

            // Weekly rows hold the running total, so a change in week W has to move
            // every later week as well, plus the all-time row.
            await LeagueParticipation.increment({ points: delta }, {
                where: { league_id: league.id, user_id: Number(userId), week: { [Op.gte]: week } },
                transaction
            });
            await LeagueParticipation.increment({ points: delta }, {
                where: { league_id: league.id, user_id: Number(userId), week: -1 },
                transaction
            });
        }
    });

    await exports.rollUpLeague(leagueId);

    return {
        week,
        changedPredictions: changed.length,
        playersAffected: Object.keys(deltaByUser).filter(u => deltaByUser[u] !== 0).length,
        delta: Object.values(deltaByUser).reduce((s, d) => s + d, 0)
    };
};

/**
 * Rebuilds the league totals from the week rows already stored. Cheap: it reads
 * PlayerWeekStat, never predictions.
 *
 * @param {number} leagueId
 * @returns {Promise<{players: number}>}
 */
exports.rollUpLeague = async (leagueId) => {
    const league = await League.findByPk(leagueId);
    if (!league) throw new Error(`League ${leagueId} not found`);

    const year = new Date(league.start_date).getFullYear();

    const [weekRows, participations] = await Promise.all([
        PlayerWeekStat.findAll({ where: { league_id: leagueId } }),
        LeagueParticipation.findAll({ where: { league_id: leagueId, week: -1 } })
    ]);

    // What /clasificacion shows. It is the authority: the stats never overrule it.
    const officialByUser = {};
    participations.forEach(p => { officialByUser[p.user_id] = p.points; });

    const totals = {};
    for (const row of weekRows) {
        const acc = totals[row.user_id] = totals[row.user_id] || {
            user_id: row.user_id,
            league_id: leagueId,
            year,
            matches_available: 0,
            predictions: 0,
            wins: 0,
            exact_scores: 0,
            best_run: 0,
            plenos: 0,
            points: 0,
            points_base: 0,
            points_exact: 0,
            points_streak: 0,
            points_favorite: 0
        };

        acc.matches_available += row.matches_available;
        acc.predictions += row.predictions;
        acc.wins += row.wins;
        acc.exact_scores += row.exact_scores;
        acc.points += row.points;
        acc.points_base += row.points_base;
        acc.points_exact += row.points_exact;
        acc.points_streak += row.points_streak;
        acc.points_favorite += row.points_favorite;
        acc.plenos += row.plenos;
        if (row.best_run > acc.best_run) acc.best_run = row.best_run;
    }

    const rows = Object.values(totals);

    // Whatever was added by hand on top of the predictions: the end-of-league points
    // for where someone's favourite team finished, which the site has no way of
    // knowing on its own. It is measured, not calculated — the difference between the
    // standings and what the predictions add up to — so `points + points_manual`
    // always equals `points_official`, whatever went in there.
    //
    // It can come out negative in the two leagues whose stored prediction points went
    // stale after a result was corrected. That is real and worth seeing, so it is not
    // clamped; what it must not do is be drawn as a segment of a stacked bar.
    rows.forEach(row => {
        row.points_official = officialByUser[row.user_id] ?? row.points;
        row.points_manual = row.points_official - row.points;
    });

    // Rank by league points, highest first.
    rows.sort((a, b) => b.points - a.points);
    rows.forEach((row, i) => {
        row.rank = i + 1;
        row.computed_at = new Date();
    });

    await sequelize.transaction(async (transaction) => {
        await PlayerLeagueStat.destroy({ where: { league_id: leagueId }, transaction });
        if (rows.length) await PlayerLeagueStat.bulkCreate(rows, { transaction });
    });

    return { players: rows.length };
};

/**
 * Recomputes every week of a league, then its totals.
 *
 * @param {number} leagueId
 * @returns {Promise<{leagueId: number, weeks: number, players: number}>}
 */
exports.recomputeLeague = async (leagueId) => {
    const league = await League.findByPk(leagueId);
    if (!league) throw new Error(`League ${leagueId} not found`);

    const matches = await Match.findAll({
        where: { league_id: leagueId },
        attributes: ['id', 'date'],
        order: [['date', 'ASC']]
    });

    const weeks = [...new Set(matches.map(m => weekOf(league.start_date, m.date)))].sort((a, b) => a - b);

    // Clear first: a week that no longer has matches must not keep stale rows.
    await PlayerWeekStat.destroy({ where: { league_id: leagueId } });

    for (const week of weeks) {
        await exports.recomputeLeagueWeek(leagueId, week, { rollUp: false });
    }

    const { players } = await exports.rollUpLeague(leagueId);
    return { leagueId, weeks: weeks.length, players };
};

/**
 * Recomputes every league of a season.
 *
 * @param {number} year
 * @returns {Promise<Array<Object>>} One summary per league.
 */
exports.recomputeSeason = async (year) => {
    const leagues = await League.findAll({ order: [['start_date', 'ASC']] });
    const target = leagues.filter(l => new Date(l.start_date).getFullYear() === year);

    const summaries = [];
    for (const league of target) {
        summaries.push({
            name: league.name,
            ...(await exports.recomputeLeague(league.id))
        });
    }
    return summaries;
};

/**
 * Recomputes whatever a single match belongs to. This is the entry point the result
 * controller uses: it takes a match and works out which league week to rebuild.
 *
 * @param {number} matchId
 * @returns {Promise<Object|null>} Summary, or null if the match is gone.
 */
exports.recomputeForMatch = async (matchId) => {
    const match = await Match.findByPk(matchId, { attributes: ['id', 'league_id', 'date'] });
    if (!match) return null;

    const league = await League.findByPk(match.league_id, { attributes: ['id', 'start_date'] });
    if (!league) return null;

    return exports.recomputeLeagueWeek(match.league_id, weekOf(league.start_date, match.date));
};

/**
 * Applies the points for whatever league week a match belongs to, and refreshes the
 * stats for it. This is the entry point the result controller uses when a result is
 * created, corrected or deleted.
 *
 * Safe to call twice: the second time every difference is zero.
 *
 * @param {number} matchId
 * @returns {Promise<Object|null>} Summary, or null if the match is gone.
 */
exports.applyForMatch = async (matchId) => {
    const match = await Match.findByPk(matchId, { attributes: ['id', 'league_id', 'date'] });
    if (!match) return null;

    const league = await League.findByPk(match.league_id, { attributes: ['id', 'start_date'] });
    if (!league) return null;

    return exports.applyWeekPoints(match.league_id, weekOf(league.start_date, match.date));
};

/**
 * Every season that has a league in it, newest first.
 *
 * @returns {Promise<Array<number>>}
 */
exports.availableSeasons = async () => {
    const leagues = await League.findAll({ attributes: ['start_date'] });
    const years = new Set(leagues.map(l => new Date(l.start_date).getFullYear()));
    return [...years].sort((a, b) => b - a);
};

exports.weekBounds = weekBounds;
exports.weekOf = weekOf;
