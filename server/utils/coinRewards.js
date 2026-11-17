const League = require('../models/league');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const Result = require('../models/result');
const Question = require('../models/question');
const QuestionAnswer = require('../models/questionAnswer');
const PlayerWeekStat = require('../models/playerWeekStat');
const CoinTransaction = require('../models/coinTransaction');
const { describeRounds } = require('./rounds');
const coins = require('./coins');
const { grantFreeCard } = require('./cards');

/**
 * Cuándo se ganan monedas. Lo que valen las cosas está aquí y en ningún otro sitio.
 *
 * Tres momentos, y cada uno llama a lo suyo:
 *
 *   al cargar la sesión     → onSession           entrar a la web, una vez al día
 *   al enviar predicciones  → onPredictionSaved   jornada completa y racha de 3
 *   al enviar respuestas    → onAnswersSaved      todas las preguntas de la jornada
 *   al puntuar una jornada  → syncWeek            pleno y mitad de abajo
 *
 * Las tres primeras solo se pagan, nunca se deshacen: lo que cuentan (que entraste,
 * que enviaste) ya pasó. Las de syncWeek dependen de los resultados, así que se
 * recalculan por diferencia como los puntos: si una corrección quita un pleno, se
 * deshace su pago con un movimiento de vuelta.
 *
 * Ninguna de estas funciones debe tumbar la petición que la llama: quien las usa las
 * envuelve en `safely`. Perder unas monedas es un fallo; perder una predicción por
 * culpa de las monedas sería mucho peor.
 */

const REWARDS = Object.freeze({
    login: 1,
    round_complete: 3,
    questions_complete: 1,
    streak: 5,
    pleno: 3,
    bottom_half: 2,
});

/** Cada cuántas jornadas completas seguidas se paga la racha. */
const STREAK_EVERY = 3;

/** El día en España, que es cuando la gente dice «hoy». */
const madridDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

/**
 * Ejecuta una recompensa sin dejar que un fallo suba. Devuelve lo que devuelva, o []
 * si falla.
 */
async function safely(what, fn) {
    try {
        return await fn();
    } catch (error) {
        console.error(`[monedas] No se pudo pagar «${what}»:`, error.message);
        return [];
    }
}

const nameOf = (league) => (league.name || '').trim();

/**
 * Una moneda por día con sesión. Lo llama GET /users/getToken, que la web pide al
 * abrirse.
 *
 * @param {number} userId
 * @returns {Promise<Array<Object>>} Los movimientos nuevos.
 */
async function onSession(userId, now = new Date()) {
    const paid = await coins.grantOnce({ userId, reason: 'login', refType: 'day', refId: madridDay(now), amount: REWARDS.login });
    return paid ? [paid] : [];
}

/**
 * Tras guardar una predicción: si con ella la jornada queda completa, se paga; y si
 * además cierra una racha de 3 jornadas completas seguidas, también la racha.
 *
 * No paga jornadas ya resueltas (todos sus partidos con resultado) ni ligas
 * terminadas: como las jornadas no tienen cierre, sin esto se podrían votar jornadas
 * viejas solo por las monedas.
 *
 * @param {number} userId
 * @param {number} matchId
 * @returns {Promise<Array<Object>>} Los movimientos nuevos.
 */
async function onPredictionSaved(userId, matchId) {
    const match = await Match.findByPk(matchId, { attributes: ['id', 'league_id', 'round_id'] });
    if (!match || !match.round_id) return [];
    const league = await League.findByPk(match.league_id, { attributes: ['id', 'name', 'status', 'cards_enabled'] });
    if (!league || league.status === 'finished') return [];

    // Completa = has votado todo lo que aún se podía votar. Un partido con resultado
    // ya no se vota, así que quien llega a mitad de jornada la completa votando lo que
    // queda. Y tiene que quedar algo: una jornada ya resuelta no paga.
    const roundMatches = await Match.findAll({ where: { round_id: match.round_id }, attributes: ['id'] });
    const ids = roundMatches.map(m => m.id);
    const resolved = new Set((await Result.findAll({ where: { match_id: ids }, attributes: ['match_id'] })).map(r => r.match_id));
    const open = ids.filter(id => !resolved.has(id));
    if (open.length === 0) return [];
    const predicted = new Set((await Prediction.findAll({ where: { user_id: userId, match_id: ids }, attributes: ['match_id'] })).map(p => p.match_id));
    if (!open.every(id => predicted.has(id))) return [];

    const rounds = (await describeRounds(league.id)).filter(r => r.matches > 0);
    const round = rounds.find(r => r.id === match.round_id);
    if (!round) return [];
    const note = `${nameOf(league)} · ${round.label}`;

    const out = [];
    const paid = await coins.grantOnce({
        userId, reason: 'round_complete', refType: 'round', refId: round.id,
        amount: REWARDS.round_complete, leagueId: league.id, note,
    });
    if (!paid) return out;
    out.push(paid);

    // La racha: cuántas jornadas completas seguidas acaban en esta, contando hacia atrás.
    const completed = await CoinTransaction.findAll({
        where: { user_id: userId, reason: 'round_complete', league_id: league.id, reverses_id: null },
        attributes: ['ref_id'],
    });
    const done = new Set(completed.map(c => Number(c.ref_id)));
    let run = 0;
    for (let i = rounds.findIndex(r => r.id === round.id); i >= 0 && done.has(rounds[i].id); i--) run++;
    if (run > 0 && run % STREAK_EVERY === 0) {
        const streak = await coins.grantOnce({
            userId, reason: 'streak', refType: 'round', refId: round.id,
            amount: REWARDS.streak, leagueId: league.id, note: `${nameOf(league)} · ${run} jornadas seguidas`,
        });
        if (streak) out.push(streak);
    }

    // La carta gratis va con la jornada completa: la misma vez, y solo esa.
    await safely('carta gratis', () => grantFreeCard({ userId, league, round }));
    return out;
}

/**
 * Tras guardar respuestas: por cada jornada de esas preguntas en la que ya están
 * todas contestadas, se paga una vez.
 *
 * @param {number} userId
 * @param {Array<number>} questionIds
 * @returns {Promise<Array<Object>>} Los movimientos nuevos.
 */
async function onAnswersSaved(userId, questionIds) {
    const asked = await Question.findAll({ where: { id: questionIds }, attributes: ['id', 'round_id', 'league_id'] });
    const out = [];
    for (const roundId of [...new Set(asked.map(q => q.round_id).filter(Boolean))]) {
        const leagueId = asked.find(q => q.round_id === roundId).league_id;
        const league = await League.findByPk(leagueId, { attributes: ['id', 'name', 'status'] });
        if (!league || league.status === 'finished') continue;

        const all = await Question.findAll({ where: { round_id: roundId }, attributes: ['id'] });
        const answered = await QuestionAnswer.count({ where: { user_id: userId, question_id: all.map(q => q.id) } });
        if (all.length === 0 || answered < all.length) continue;

        const round = (await describeRounds(league.id)).find(r => r.id === roundId);
        const paid = await coins.grantOnce({
            userId, reason: 'questions_complete', refType: 'round', refId: roundId,
            amount: REWARDS.questions_complete, leagueId: league.id,
            note: `${nameOf(league)} · ${round ? round.label : 'Jornada'}`,
        });
        if (paid) out.push(paid);
    }
    return out;
}

/**
 * Pleno y mitad de abajo de una jornada, recalculados por diferencia. Lo llama el
 * agregador cada vez que puntúa una jornada (statsAggregator.applyWeekPoints).
 *
 *   pleno         a quien hizo al menos un pleno en la jornada
 *   mitad abajo   con la jornada resuelta, a quien la jugó entera y quedó por debajo
 *                 de la mediana de puntos de los que también la jugaron entera.
 *                 Por debajo y no «en la mitad»: así los empates no dependen del orden.
 *
 * @param {number} leagueId
 * @param {number} week - El orden de la jornada.
 * @returns {Promise<Array<Object>>} Los movimientos nuevos (pagos y vueltas).
 */
async function syncWeek(leagueId, week) {
    const league = await League.findByPk(leagueId, { attributes: ['id', 'name', 'status'] });
    if (!league || league.status === 'finished') return [];
    const round = (await describeRounds(leagueId)).find(r => r.order === Number(week));
    if (!round) return [];

    const rows = await PlayerWeekStat.findAll({ where: { league_id: leagueId, week: round.order } });
    const complete = rows.filter(r => r.matches_available > 0 && r.predictions >= r.matches_available);
    const sorted = complete.map(r => r.points).sort((a, b) => a - b);
    const median = sorted.length
        ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
        : null;
    const settled = round.status === 'settled';
    const note = `${nameOf(league)} · ${round.label}`;

    const out = [];
    for (const row of rows) {
        const key = (reason) => ({ userId: row.user_id, reason, refType: 'round', refId: round.id });
        const pleno = await coins.reconcile(key('pleno'), row.plenos > 0, { amount: REWARDS.pleno, leagueId, note });
        const isComplete = complete.includes(row);
        const low = settled && isComplete && complete.length >= 2 && row.points < median;
        const bottom = await coins.reconcile(key('bottom_half'), low, { amount: REWARDS.bottom_half, leagueId, note });
        if (pleno) out.push(pleno);
        if (bottom) out.push(bottom);
    }
    return out;
}

module.exports = {
    REWARDS,
    STREAK_EVERY,
    madridDay,
    safely,
    onSession,
    onPredictionSaved,
    onAnswersSaved,
    syncWeek,
};
