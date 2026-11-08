const { Op } = require('sequelize');
const Round = require('../models/round');
const Match = require('../models/match');
const Question = require('../models/question');
const League = require('../models/league');
const Result = require('../models/result');
const { getLeagueWeekNumber } = require('../controllers/weekController');
const { isSettled } = require('./pointsCalculator');

/**
 * Las jornadas: fases, nombres, estado y el paso desde las semanas.
 *
 * Una jornada (models/round.js) agrupa los partidos y preguntas que se juegan
 * juntos. Su ciclo de vida se CALCULA, no se guarda:
 *
 *     scheduled ──► live ──► settled
 *     (programada)  (en juego)  (resuelta)
 *
 * - scheduled: sin partidos ni preguntas, o con partidos que aún no han empezado.
 * - live:      algo ha empezado y queda algo por resolver.
 * - settled:   todos sus partidos tienen resultado y todas sus preguntas están corregidas.
 *
 * Por ahora no hay cierre: en ningún estado se deja de poder votar.
 */

/** Las fases, en el orden en que se juegan. `label` es el nombre de la fase. */
const STAGES = Object.freeze([
    { key: 'regular', label: 'Fase regular', name: (n) => `Jornada ${n}` },
    { key: 'playin', label: 'Play-in', name: (n) => `Play-in · Ronda ${n}` },
    { key: 'swiss', label: 'Fase suiza', name: (n) => `Ronda suiza ${n}` },
    { key: 'playoffs', label: 'Playoffs', name: (n) => `Playoffs · Ronda ${n}` },
    { key: 'quarterfinal', label: 'Cuartos de final', name: (n, total) => (total > 1 ? `Cuartos de final ${n}` : 'Cuartos de final') },
    { key: 'semifinal', label: 'Semifinales', name: (n, total) => (total > 1 ? `Semifinales ${n}` : 'Semifinales') },
    { key: 'final', label: 'Final', name: (n, total) => (total > 1 ? `Final ${n}` : 'Final') },
]);
const STAGE_KEYS = STAGES.map(s => s.key);
const stageOf = (key) => STAGES.find(s => s.key === key) || STAGES[0];

const ROUND_STATUS = Object.freeze({ SCHEDULED: 'scheduled', LIVE: 'live', SETTLED: 'settled' });

/**
 * El estado de una jornada a partir de lo que tiene dentro.
 *
 * @param {Object} p
 * @param {Array<{id: number, date: Date|string}>} p.matches
 * @param {Set<number>} p.resolvedIds - Partidos con resultado.
 * @param {Array<Object>} p.questions
 * @param {Date} [p.now]
 * @returns {'scheduled'|'live'|'settled'}
 */
function roundStatus({ matches, resolvedIds, questions, now = new Date() }) {
    if (matches.length === 0 && questions.length === 0) return ROUND_STATUS.SCHEDULED;

    const allMatches = matches.every(m => resolvedIds.has(m.id));
    const allQuestions = questions.every(isSettled);
    if (allMatches && allQuestions) return ROUND_STATUS.SETTLED;

    // Una jornada solo de preguntas está en juego desde que existe: no tiene hora.
    if (matches.length === 0) return ROUND_STATUS.LIVE;

    const started = matches.some(m => new Date(m.date) <= now)
        || matches.some(m => resolvedIds.has(m.id))
        || questions.some(isSettled);
    return started ? ROUND_STATUS.LIVE : ROUND_STATUS.SCHEDULED;
}

/**
 * Las jornadas de una liga, listas para pintar: nombre, fase, estado, recuentos y
 * cuál es la «actual».
 *
 * El nombre, si no se ha escrito uno, sale de la fase y de la POSICIÓN dentro de
 * ella, no del `order`: una liga antigua con una semana de parón tiene los órdenes
 * 1, 2, 4… y debe enseñar Jornada 1, 2, 3.
 *
 * La actual es la última que ya ha empezado; si no ha empezado ninguna, la primera.
 *
 * @param {number} leagueId
 * @param {Date} [now]
 * @returns {Promise<Array<Object>>}
 */
async function describeRounds(leagueId, now = new Date()) {
    const [rounds, matches, questions] = await Promise.all([
        Round.findAll({ where: { league_id: leagueId }, order: [['order', 'ASC']] }),
        Match.findAll({ where: { league_id: leagueId }, attributes: ['id', 'date', 'round_id'] }),
        Question.findAll({ where: { league_id: leagueId }, attributes: ['id', 'round_id', 'closed_at'] }),
    ]);
    const results = matches.length
        ? await Result.findAll({ where: { match_id: { [Op.in]: matches.map(m => m.id) } }, attributes: ['match_id'] })
        : [];
    const resolvedIds = new Set(results.map(r => r.match_id));

    const totalByStage = {};
    rounds.forEach(r => { totalByStage[r.stage] = (totalByStage[r.stage] || 0) + 1; });
    const seenByStage = {};

    const described = rounds.map(r => {
        const position = seenByStage[r.stage] = (seenByStage[r.stage] || 0) + 1;
        const stage = stageOf(r.stage);
        const own = matches.filter(m => m.round_id === r.id);
        const ownQuestions = questions.filter(q => q.round_id === r.id);
        const dates = own.map(m => new Date(m.date).getTime()).sort((a, b) => a - b);
        return {
            id: r.id,
            league_id: r.league_id,
            order: r.order,
            stage: r.stage,
            stageLabel: stage.label,
            name: r.name,
            label: r.name || stage.name(position, totalByStage[r.stage]),
            status: roundStatus({ matches: own, resolvedIds, questions: ownQuestions, now }),
            matches: own.length,
            questions: ownQuestions.length,
            firstMatchAt: dates.length ? new Date(dates[0]) : null,
            lastMatchAt: dates.length ? new Date(dates[dates.length - 1]) : null,
            current: false,
        };
    });

    const started = described.filter(r => r.firstMatchAt && r.firstMatchAt <= now);
    const current = started.length ? started[started.length - 1] : described[0];
    if (current) current.current = true;
    return described;
}

/**
 * La jornada de una liga con ese orden; la crea en la fase regular si no existe.
 *
 * @param {number} leagueId
 * @param {number} order
 * @returns {Promise<Object>} La jornada.
 */
async function roundFor(leagueId, order) {
    const [round] = await Round.findOrCreate({
        where: { league_id: leagueId, order },
        defaults: { league_id: leagueId, order, stage: 'regular' },
    });
    return round;
}

/**
 * La jornada que le tocaba a un partido según su semana de siempre. Solo para
 * partidos sin jornada: los antiguos al migrar, y los que se crean sin elegirla.
 *
 * @param {{league_id: number, date: Date|string}} match
 * @returns {Promise<Object>} La jornada.
 */
async function roundForMatchDate(match) {
    const league = await League.findByPk(match.league_id, { attributes: ['id', 'start_date'] });
    if (!league) throw new Error(`Liga ${match.league_id} no encontrada`);
    return roundFor(league.id, getLeagueWeekNumber(league.start_date, match.date));
}

/**
 * Pone jornada a todo partido y pregunta que no la tenga, usando su semana de
 * siempre. Así, al pasar a jornadas, cada partido cae exactamente en el grupo en el
 * que ya estaba y ningún punto ni pleno cambia de sitio.
 *
 * Idempotente: sin nada pendiente, son dos consultas. Se lanza al arrancar.
 *
 * @returns {Promise<{matches: number, questions: number}>}
 */
async function backfillRounds() {
    const [matches, questions] = await Promise.all([
        Match.findAll({ where: { round_id: null }, attributes: ['id', 'league_id', 'date'] }),
        Question.findAll({ where: { round_id: null }, attributes: ['id', 'league_id', 'week'] }),
    ]);
    if (!matches.length && !questions.length) return { matches: 0, questions: 0 };

    const leagueIds = [...new Set([...matches, ...questions].map(x => x.league_id))];
    const leagues = await League.findAll({ where: { id: { [Op.in]: leagueIds } }, attributes: ['id', 'start_date'] });
    const startOf = {};
    leagues.forEach(l => { startOf[l.id] = l.start_date; });

    let m = 0;
    for (const match of matches) {
        if (!startOf[match.league_id]) continue;
        const round = await roundFor(match.league_id, getLeagueWeekNumber(startOf[match.league_id], match.date));
        await Match.update({ round_id: round.id }, { where: { id: match.id } });
        m += 1;
    }
    let q = 0;
    for (const question of questions) {
        const round = await roundFor(question.league_id, question.week);
        await Question.update({ round_id: round.id }, { where: { id: question.id } });
        q += 1;
    }
    return { matches: m, questions: q };
}

module.exports = {
    STAGES,
    STAGE_KEYS,
    ROUND_STATUS,
    roundStatus,
    describeRounds,
    roundFor,
    roundForMatchDate,
    backfillRounds,
};
