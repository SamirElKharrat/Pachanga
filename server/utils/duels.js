const sequelize = require('../config/configdb');
const Duel = require('../models/duel');
const League = require('../models/league');
const Round = require('../models/round');
const Match = require('../models/match');
const Result = require('../models/result');
const User = require('../models/user');
const LeagueParticipation = require('../models/leagueParticipation');
const PlayerWeekStat = require('../models/playerWeekStat');
const CoinTransaction = require('../models/coinTransaction');
const coins = require('./coins');

/**
 * Duelos (fase 6 de cartas y cofres): retas a alguien de tu liga para una jornada y
 * quien haga más puntos en ella se lleva lo apostado.
 *
 * - Se apuestan PUNTOS de liga (1, 2 o 3: pasan del que pierde al que gana, así que
 *   el total de la liga no crece) o PACHANGUITAS (5, 10 o 20 cada uno: el ganador se
 *   lleva el bote). Lo elige quien reta.
 * - Un duelo por persona y jornada, contando los que esperan respuesta.
 * - Se reta y se acepta hasta que empieza el primer partido de la jornada. Si empieza
 *   sin respuesta, caduca y se devuelve lo apostado.
 * - Se resuelve cuando todos los partidos de la jornada tienen resultado, con los
 *   puntos de la jornada (cartas incluidas, duelos no). Empate: nadie gana nada y las
 *   pachanguitas vuelven. Una corrección lo vuelve a resolver, por diferencia.
 * - Solo en ligas con cartas (`cards_enabled`): es parte del mismo piloto.
 *
 * Candados: primero el de las pachanguitas de quien actúa (7031), después el de los
 * duelos de los dos jugadores (7036), siempre en orden de id.
 */

class DuelError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

const STAKES = Object.freeze({ points: [1, 2, 3], coins: [5, 10, 20] });
const ACTIVE = ['pending', 'accepted', 'resolved'];
const LOCK_DUEL = 7036;

const PUBLIC_USER = ['id', 'username', 'logo_url'];

// ── Puntos (puro) ───────────────────────────────────────────────────────────────

/**
 * Quién gana un duelo: el id del ganador, 0 si empatan, o null si la jornada aún no
 * tiene todos sus resultados.
 *
 * @param {Object} duel - Con `challenger_id` y `rival_id`.
 * @param {Object} points - userId → puntos de la jornada sin duelos.
 * @param {boolean} allResolved
 */
function duelOutcome(duel, points, allResolved) {
    if (!allResolved) return null;
    const a = points[duel.challenger_id] || 0;
    const b = points[duel.rival_id] || 0;
    if (a === b) return 0;
    return a > b ? duel.challenger_id : duel.rival_id;
}

/**
 * Lo que mueven los duelos de puntos de una jornada: userId → puntos (con signo).
 * Pura: el agregador la llama al puntuar la jornada.
 */
function duelPoints({ duels, points, allResolved }) {
    const deltas = {};
    for (const d of duels) {
        if (d.stake_kind !== 'points' || !['accepted', 'resolved'].includes(d.status)) continue;
        const w = duelOutcome(d, points, allResolved);
        if (!w) continue;
        const loser = w === d.challenger_id ? d.rival_id : d.challenger_id;
        deltas[w] = (deltas[w] || 0) + d.stake;
        deltas[loser] = (deltas[loser] || 0) - d.stake;
    }
    return deltas;
}

// ── La jornada ──────────────────────────────────────────────────────────────────

/** Si la jornada ha empezado y si tiene ya todos sus resultados. */
async function roundState(roundId, transaction) {
    const matches = await Match.findAll({ where: { round_id: roundId }, attributes: ['id', 'date', 'status'], transaction });
    const resolved = new Set((await Result.findAll({ where: { match_id: matches.map(m => m.id) }, attributes: ['match_id'], transaction })).map(r => r.match_id));
    const now = new Date();
    const started = matches.length === 0 || matches.some(m => m.status !== 'scheduled' || new Date(m.date) <= now || resolved.has(m.id));
    return { started, allResolved: matches.length > 0 && matches.every(m => resolved.has(m.id)), empty: matches.length === 0 };
}

/**
 * La única jornada en la que se puede retar: la que toca, es decir, la primera de la
 * liga (por orden) que tiene partidos y aún no ha empezado. Ni las ya empezadas ni
 * las que vienen después de esa.
 *
 * @returns {Promise<number|null>} Su id, o null si no queda ninguna.
 */
async function openRoundId(leagueId, transaction) {
    const rounds = await Round.findAll({ where: { league_id: leagueId }, attributes: ['id', 'order'], order: [['order', 'ASC'], ['id', 'ASC']], transaction });
    for (const r of rounds) {
        const state = await roundState(r.id, transaction);
        if (!state.empty && !state.started) return r.id;
    }
    return null;
}

const lockDuels = async (ids, transaction) => {
    for (const id of [...new Set(ids.map(Number))].sort((a, b) => a - b)) {
        await sequelize.query('SELECT pg_advisory_xact_lock(:ns, :uid)', { replacements: { ns: LOCK_DUEL, uid: id }, transaction });
    }
};

/** Devuelve lo apostado por el retador (si eran pachanguitas). Idempotente. */
async function refundStake(duel, userId) {
    if (duel.stake_kind !== 'coins') return null;
    return coins.grantOnce({ userId, reason: 'duel_refund', refType: 'duel', refId: duel.id, amount: duel.stake, leagueId: duel.league_id });
}

/**
 * Los duelos sin respuesta cuya jornada ya ha empezado pasan a `expired`, y se le
 * devuelve la apuesta al retador. Idempotente: se llama al leer y al retar.
 */
async function expirePending(where = {}) {
    const pending = await Duel.findAll({ where: { ...where, status: 'pending' } });
    const states = {};
    for (const d of pending) {
        if (!states[d.round_id]) states[d.round_id] = await roundState(d.round_id);
        if (!states[d.round_id].started) continue;
        const [n] = await Duel.update({ status: 'expired' }, { where: { id: d.id, status: 'pending' } });
        if (n) await refundStake(d, d.challenger_id);
    }
}

// ── Retar, contestar, retirar ───────────────────────────────────────────────────

/**
 * Reta a alguien.
 *
 * @param {Object} p
 * @param {number} p.userId
 * @param {number} p.leagueId
 * @param {number} p.roundId
 * @param {number} p.rivalId
 * @param {'points'|'coins'} p.stakeKind
 * @param {number} p.stake
 * @returns {Promise<Object>} El duelo.
 */
async function challenge({ userId, leagueId, roundId, rivalId, stakeKind, stake }) {
    userId = Number(userId);
    rivalId = Number(rivalId);
    stake = Number(stake);
    if (!STAKES[stakeKind]) throw new DuelError(400, 'Elige si apuestas puntos o pachanguitas');
    if (!STAKES[stakeKind].includes(stake)) throw new DuelError(400, `Se apuestan ${STAKES[stakeKind].join(', ')} ${stakeKind === 'points' ? 'puntos' : 'pachanguitas'}`);
    if (!rivalId) throw new DuelError(400, 'Elige a quién retas');
    if (rivalId === userId) throw new DuelError(400, 'No puedes retarte a ti mismo');

    await expirePending({ round_id: Number(roundId) });

    const duel = await coins.withUserLock(userId, async (transaction) => {
        const league = await League.findByPk(leagueId, { transaction });
        if (!league || !league.cards_enabled) throw new DuelError(409, 'En esta liga no hay duelos');
        if (league.status === 'finished') throw new DuelError(409, 'La liga ha terminado');
        const round = await Round.findOne({ where: { id: roundId, league_id: league.id }, transaction });
        if (!round) throw new DuelError(400, 'Elige una jornada de esta liga');
        const [me, him] = await Promise.all([
            LeagueParticipation.count({ where: { user_id: userId, league_id: league.id }, transaction }),
            LeagueParticipation.count({ where: { user_id: rivalId, league_id: league.id }, transaction }),
        ]);
        if (!me) throw new DuelError(403, 'No estás apuntado a esta liga');
        if (!him) throw new DuelError(400, 'Ese jugador no está en la liga');
        const state = await roundState(round.id, transaction);
        if (state.empty) throw new DuelError(409, 'Esa jornada no tiene partidos');
        if (state.started) throw new DuelError(409, 'La jornada ya ha empezado: los duelos se retan antes del primer partido');
        if (await openRoundId(league.id, transaction) !== round.id) throw new DuelError(409, 'Solo se reta en la jornada que toca, no en las siguientes');

        await lockDuels([userId, rivalId], transaction);
        const { Op } = require('sequelize');
        const busy = await Duel.findAll({
            where: { round_id: round.id, status: ACTIVE, [Op.or]: [{ challenger_id: [userId, rivalId] }, { rival_id: [userId, rivalId] }] },
            transaction,
        });
        if (busy.some(d => d.challenger_id === userId || d.rival_id === userId)) throw new DuelError(409, 'Ya tienes un duelo en esta jornada');
        if (busy.length) throw new DuelError(409, 'Ese jugador ya tiene un duelo en esta jornada');

        if (stakeKind === 'coins') {
            const balance = await coins.balanceOf(userId, transaction);
            if (balance < stake) throw new DuelError(409, `No te llega: apuestas ${stake} y tienes ${balance}`);
        }
        const row = await Duel.create({
            league_id: league.id, round_id: round.id, challenger_id: userId, rival_id: rivalId, stake_kind: stakeKind, stake,
        }, { transaction });
        if (stakeKind === 'coins') {
            await CoinTransaction.create({
                user_id: userId, amount: -stake, reason: 'duel_stake', ref_type: 'duel', ref_id: String(row.id), league_id: league.id,
                note: `Duelo · ${round.name || `J${round.order}`}`,
            }, { transaction });
        }
        return row;
    });
    return duel;
}

/**
 * El retado acepta o rechaza.
 *
 * @returns {Promise<Object>} El duelo.
 */
async function respond({ userId, duelId, accept }) {
    userId = Number(userId);
    const found = await Duel.findByPk(duelId);
    if (!found || found.rival_id !== userId) throw new DuelError(404, 'Ese duelo no es para ti');
    await expirePending({ id: found.id });

    let refund = null;
    const duel = await coins.withUserLock(userId, async (transaction) => {
        await lockDuels([found.challenger_id, found.rival_id], transaction);
        const d = await Duel.findByPk(found.id, { transaction });
        if (d.status === 'expired') throw new DuelError(409, 'La jornada ya ha empezado: el duelo ha caducado');
        if (d.status !== 'pending') throw new DuelError(409, 'Ese duelo ya no espera respuesta');
        if (!accept) {
            await d.update({ status: 'declined', responded_at: new Date() }, { transaction });
            refund = d;
            return d;
        }
        const state = await roundState(d.round_id, transaction);
        if (state.started) throw new DuelError(409, 'La jornada ya ha empezado');
        if (d.stake_kind === 'coins') {
            const balance = await coins.balanceOf(userId, transaction);
            if (balance < d.stake) throw new DuelError(409, `No te llega: el duelo es de ${d.stake} y tienes ${balance}`);
            const round = await Round.findByPk(d.round_id, { transaction });
            await CoinTransaction.create({
                user_id: userId, amount: -d.stake, reason: 'duel_stake', ref_type: 'duel', ref_id: String(d.id), league_id: d.league_id,
                note: `Duelo · ${round ? round.name || `J${round.order}` : ''}`,
            }, { transaction });
        }
        await d.update({ status: 'accepted', responded_at: new Date() }, { transaction });
        return d;
    });
    if (refund) await refundStake(refund, refund.challenger_id);
    return duel;
}

/** El retador retira un duelo que aún no han contestado. */
async function cancel({ userId, duelId }) {
    userId = Number(userId);
    const found = await Duel.findByPk(duelId);
    if (!found || found.challenger_id !== userId) throw new DuelError(404, 'Ese duelo no es tuyo');
    const duel = await sequelize.transaction(async (transaction) => {
        await lockDuels([found.challenger_id, found.rival_id], transaction);
        const d = await Duel.findByPk(found.id, { transaction });
        if (d.status !== 'pending') throw new DuelError(409, 'Ese duelo ya no se puede retirar');
        await d.update({ status: 'cancelled' }, { transaction });
        return d;
    });
    await refundStake(duel, duel.challenger_id);
    return duel;
}

// ── Resolver ────────────────────────────────────────────────────────────────────

/**
 * Pone al día los duelos de una jornada con los puntos que se acaban de escribir:
 * estado, ganador y las pachanguitas del bote. Los puntos de los duelos de puntos
 * ya los ha puesto el agregador (ver `duelPoints`). Idempotente: se llama cada vez
 * que se puntúa la jornada.
 */
async function settleWeek(leagueId, week) {
    const round = await Round.findOne({ where: { league_id: leagueId, order: week } });
    if (!round) return;
    const duels = await Duel.findAll({ where: { round_id: round.id, status: ['accepted', 'resolved'] } });
    if (!duels.length) return;
    const state = await roundState(round.id);
    const points = await weekPointsOf(leagueId, week);
    for (const d of duels) {
        const w = duelOutcome(d, points, state.allResolved);
        const status = w === null ? 'accepted' : 'resolved';
        const winner = w ? w : null;
        if (d.status !== status || d.winner_id !== winner) await d.update({ status, winner_id: winner });
        if (d.stake_kind === 'coins') await settleCoins(d, w);
    }
}

/**
 * Las pachanguitas de un duelo como le corresponden ahora: el bote al ganador; con
 * empate, cada uno recupera lo suyo; sin resolver, nada. Por diferencia.
 */
async function settleCoins(duel, outcome) {
    for (const u of [duel.challenger_id, duel.rival_id]) {
        const key = { userId: u, refType: 'duel', refId: duel.id };
        await coins.reconcile({ ...key, reason: 'duel_win' }, outcome === u, { amount: duel.stake * 2, leagueId: duel.league_id });
        await coins.reconcile({ ...key, reason: 'duel_refund' }, outcome === 0, { amount: duel.stake, leagueId: duel.league_id });
    }
}

/** Puntos de la jornada sin duelos: userId → puntos. */
async function weekPointsOf(leagueId, week) {
    const rows = await PlayerWeekStat.findAll({ where: { league_id: leagueId, week }, attributes: ['user_id', 'points', 'points_duel'] });
    const out = {};
    rows.forEach(r => { out[r.user_id] = r.points - (r.points_duel || 0); });
    return out;
}

/**
 * Anula un duelo (admin): deja de contar. Los puntos se vuelven a calcular y las
 * pachanguitas vuelven a cada uno.
 */
async function annul(duelId) {
    const d = await Duel.findByPk(duelId);
    if (!d) throw new DuelError(404, 'Duelo no encontrado');
    if (d.status === 'annulled') return d;
    const was = d.status;
    await d.update({ status: 'annulled', winner_id: null });
    if (d.stake_kind === 'coins') {
        for (const u of [d.challenger_id, d.rival_id]) await coins.revoke({ userId: u, reason: 'duel_win', refType: 'duel', refId: d.id });
        // Cada uno recupera lo que puso (el retado, solo si llegó a aceptar).
        const paid = was === 'pending' ? [d.challenger_id] : ['accepted', 'resolved'].includes(was) ? [d.challenger_id, d.rival_id] : [];
        for (const u of paid) await refundStake(d, u);
    }
    if (d.stake_kind === 'points' && ['accepted', 'resolved'].includes(was)) {
        const round = await Round.findByPk(d.round_id);
        const statsAggregator = require('./statsAggregator');
        if (round) await statsAggregator.applyWeekPoints(d.league_id, round.order);
    }
    return d;
}

// ── Lo que se enseña ────────────────────────────────────────────────────────────

/** Un duelo listo para enseñar, con el marcador de la jornada. */
async function viewOf(d, viewerId, cache = {}) {
    const users = cache.users || {};
    for (const id of [d.challenger_id, d.rival_id]) {
        if (!users[id]) users[id] = await User.findByPk(id, { attributes: PUBLIC_USER });
    }
    const round = cache.rounds?.[d.round_id] || await Round.findByPk(d.round_id, { attributes: ['id', 'order', 'name'] });
    const state = cache.states?.[d.round_id] || await roundState(d.round_id);
    let score = null;
    if (['accepted', 'resolved'].includes(d.status)) {
        const pts = await weekPointsOf(d.league_id, round.order);
        score = { challenger: pts[d.challenger_id] || 0, rival: pts[d.rival_id] || 0 };
    }
    return {
        id: d.id,
        league_id: d.league_id,
        round: round && { id: round.id, order: round.order, name: round.name },
        challenger: users[d.challenger_id],
        rival: users[d.rival_id],
        stake_kind: d.stake_kind,
        stake: d.stake,
        status: d.status,
        winner_id: d.winner_id,
        role: d.challenger_id === viewerId ? 'challenger' : d.rival_id === viewerId ? 'rival' : null,
        started: state.started,
        score,
        created_at: d.created_at,
    };
}

/**
 * Los duelos de alguien en una liga: el de la jornada pedida (si lo hay), los que le
 * esperan respuesta y su historial.
 */
async function duelsFor({ userId, leagueId, roundId }) {
    userId = Number(userId);
    const { Op } = require('sequelize');
    await expirePending({ league_id: leagueId });
    const mine = await Duel.findAll({
        where: { league_id: leagueId, [Op.or]: [{ challenger_id: userId }, { rival_id: userId }] },
        order: [['id', 'DESC']],
        limit: 30,
    });
    const views = [];
    for (const d of mine) views.push(await viewOf(d, userId));
    const current = roundId ? views.find(v => v.round?.id === Number(roundId) && ACTIVE.includes(v.status)) || null : null;
    // A quién se puede retar en esa jornada: los que no tienen ya un duelo.
    let busy = [];
    let state = null;
    let openId = null;
    if (roundId) {
        state = await roundState(Number(roundId));
        openId = await openRoundId(leagueId);
        busy = (await Duel.findAll({ where: { round_id: Number(roundId), status: ACTIVE }, attributes: ['challenger_id', 'rival_id'] }))
            .flatMap(d => [d.challenger_id, d.rival_id]);
    }
    return {
        stakes: STAKES,
        current,
        canChallenge: Boolean(roundId) && !current && state && !state.started && !state.empty && openId === Number(roundId),
        busy: [...new Set(busy)],
        incoming: views.filter(v => v.status === 'pending' && v.role === 'rival'),
        history: views.filter(v => !ACTIVE.includes(v.status) || v.round?.id !== Number(roundId)),
    };
}

/**
 * Lo que tiene que saltar a pantalla completa al entrar: retos que esperan tu
 * respuesta y tus retos que han aceptado (una vez).
 */
async function noticesFor(userId) {
    userId = Number(userId);
    await expirePending({ rival_id: userId });
    await expirePending({ challenger_id: userId });
    const [incoming, accepted] = await Promise.all([
        Duel.findAll({ where: { rival_id: userId, status: 'pending' }, order: [['id', 'ASC']] }),
        Duel.findAll({ where: { challenger_id: userId, status: ['accepted', 'resolved'], challenger_seen: false }, order: [['id', 'ASC']] }),
    ]);
    const out = [];
    for (const d of incoming) out.push({ kind: 'challenge', ...(await viewOf(d, userId)), league: await League.findByPk(d.league_id, { attributes: ['id', 'name'] }) });
    for (const d of accepted) out.push({ kind: 'accepted', ...(await viewOf(d, userId)), league: await League.findByPk(d.league_id, { attributes: ['id', 'name'] }) });
    return out;
}

/** El retador ha visto que le aceptaron el duelo. */
async function markSeen({ userId, duelId }) {
    const d = await Duel.findByPk(duelId);
    if (!d || d.challenger_id !== Number(userId)) throw new DuelError(404, 'Duelo no encontrado');
    if (!d.challenger_seen) await d.update({ challenger_seen: true });
}

/** Todos los duelos de una liga, para el panel. */
async function leagueDuels(leagueId) {
    const duels = await Duel.findAll({ where: { league_id: leagueId }, order: [['id', 'DESC']] });
    const out = [];
    for (const d of duels) out.push(await viewOf(d, null));
    return out;
}

module.exports = {
    DuelError,
    STAKES,
    duelOutcome,
    duelPoints,
    challenge,
    respond,
    cancel,
    settleWeek,
    annul,
    duelsFor,
    noticesFor,
    markSeen,
    leagueDuels,
    expirePending,
};
