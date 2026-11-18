const crypto = require('crypto');
const sequelize = require('../config/configdb');
const League = require('../models/league');
const Match = require('../models/match');
const Result = require('../models/result');
const Round = require('../models/round');
const Prediction = require('../models/prediction');
const User = require('../models/user');
const LeagueParticipation = require('../models/leagueParticipation');
const PlayerWeekStat = require('../models/playerWeekStat');
const UserCard = require('../models/userCard');
const CardPlay = require('../models/cardPlay');

/**
 * Las cartas (fase 2 de cartas y cofres): catálogo, puntos, mano y jugadas.
 *
 * Reglas, tal como salieron de la fase 0 (server/scripts/simulateCards.js):
 *
 *   - Hasta 2 cartas de EFECTO por jornada, y nunca la misma dos veces (la Doble y
 *     la Doble Dorada cuentan como la misma: las dos doblan). El Chivato va aparte,
 *     uno por jornada: no da puntos.
 *   - Cada jornada completa da una carta gratis al azar: Escudo, Gafe o Doble. Solo
 *     vale en esa jornada: si no se juega, caduca. La Doble no se vende nunca: si
 *     solo se consiguiera gastando, quien gasta ganaría la liga el 61 % de las veces
 *     en vez del 33 %.
 *   - La mano no tiene límite: lo que se compra o sale en los cofres se guarda.
 *   - Una carta se juega hasta que empieza su partido; el Escudo, hasta que empieza
 *     el primero de la jornada. Jugada, no se retira: la decisión cuenta. Las jornadas no
 *     tienen cierre: manda la hora del partido.
 *   - Nadie ve tu carta hasta que empieza su partido.
 *   - Cada jugador recibe como mucho un castigo por jornada, y los castigos no
 *     pueden dejar su jornada por debajo de 0.
 *   - Los puntos de cartas entran en el total de la liga (y por tanto en el Hall of
 *     Flame y la Pachanga), en su propia columna `points_card`.
 *
 * Las cartas se juegan solo en ligas con `cards_enabled`. Apagarlo impide jugar más,
 * pero lo ya jugado sigue contando.
 */

const CARDS = Object.freeze({
    escudo: {
        label: 'Escudo',
        limited: true,
        aim: 'round',
        rarity: 'raro',
        description: 'Tu primer partido no perfecto de la jornada no suma, pero tampoco rompe el pleno.',
        short: 'Un fallo no rompe tu pleno.',
    },
    gafe: {
        label: 'Gafe',
        limited: true,
        aim: 'rival',
        rarity: 'raro',
        description: 'Eliges rival y partido: si falla el ganador (o no lo votó), pierde 2 puntos.',
        short: 'Si tu rival falla, pierde 2.',
    },
    doble: {
        label: 'Doble',
        limited: true,
        aim: 'match',
        rarity: 'epico',
        description: 'Los puntos base y de marcador de un partido se suman dos veces, hasta +5. No dobla el pleno ni el favorito.',
        short: 'Dobla un partido (hasta +5).',
    },
    dorada: {
        label: 'Doble Dorada',
        limited: true,
        aim: 'match',
        rarity: 'leg',
        description: 'Como la Doble, sin tope y doblando también el pleno.',
        short: 'Dobla un partido y el pleno.',
    },
    robo: {
        label: 'Robo',
        limited: true,
        aim: 'rival_round',
        rarity: 'raro',
        description: 'Eliges rival: si haces más puntos que él en la jornada (sin contar cartas), le quitas 1 y te lo quedas.',
        short: 'Si le ganas la jornada, le quitas 1.',
    },
    espejo: {
        label: 'Espejo',
        limited: false,
        aim: 'round',
        rarity: 'epico',
        description: 'Si te echan un Gafe o un Robo esta jornada, rebota a quien te lo echó. Se juega a ciegas y no cuenta para las 2 de la jornada.',
        short: 'Te echan un castigo: rebota.',
    },
    chivato: {
        label: 'Chivato',
        limited: false,
        aim: 'match',
        rarity: 'poco',
        description: 'Ves el % de votos de un partido antes de votarlo. No da puntos ni cuenta para las 2 de la jornada.',
        short: 'Ves el % de votos de un partido.',
    },
});

/** De qué sale la carta gratis. */
const FREE_POOL = Object.freeze(['escudo', 'gafe', 'doble']);
/** Cartas de efecto que se pueden jugar por jornada. */
const EFFECTS_PER_ROUND = 2;
/** «La misma carta»: la Doble y la Doble Dorada cuentan como una (las dos doblan). */
const familyOf = (card) => (card === 'dorada' ? 'doble' : card);
const DOBLE_CAP = 5;
const GAFE_POINTS = 2;
/** Lo que vale cada carta en monedas (cuando una no se puede dar, p. ej. la liga ya acabó). */
const REFUND = Object.freeze({ chivato: 4, escudo: 7, gafe: 7, robo: 7, espejo: 10, doble: 12, dorada: 20 });
/** Robo: lo que se lleva si gana la jornada. */
const ROBO_POINTS = 1;
/** Cartas que se juegan sobre toda la jornada (se bloquean al empezar el primer partido). */
const ROUND_AIMS = Object.freeze(['round', 'rival_round']);
const isRoundAim = (aim) => ROUND_AIMS.includes(aim);
const needsTarget = (aim) => aim === 'rival' || aim === 'rival_round';

const EXACT = Object.freeze({ BO1: 0, BO3: 3, BO5: 5 });
const plenoBonus = (n) => (n >= 6 ? 3 : n === 5 ? 2 : n >= 3 ? 1 : 0);

// Espacios de nombres de los candados (monedas 7031, predicciones 7032).
const LOCK_HAND = 7034;      // la mano y las jugadas de un usuario
const LOCK_PUNISHED = 7035;  // los castigos que recibe un usuario

const cardInfo = (key) => ({ key, ...CARDS[key] });

class CardError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

// ── Puntos ──────────────────────────────────────────────────────────────────────

/**
 * Lo que suman o quitan las cartas de una jornada. Pura: no toca la base de datos.
 *
 * El agregador la llama al puntuar la jornada, con lo mismo que usa para el resto de
 * puntos, así que se recalcula por diferencia como todo lo demás.
 *
 * @param {Object} p
 * @param {Array<{id: number, format: string, result: {winner: number, result: string}|null}>} p.matches
 *   Los partidos de la jornada en orden de fecha (el pleno se encadena en ese orden).
 * @param {Function} p.pick - (userId, matchId) → { winner, description } | null.
 * @param {Object} p.weekPoints - userId → puntos de la jornada SIN cartas (partidos y preguntas).
 * @param {Array<Object>} p.plays - Las jugadas activas de la jornada.
 * @returns {{deltas: Object, effects: Object, rebounds: Object}} deltas: userId → puntos
 *   de cartas; effects: playId → lo que ha valido esa jugada (null si aún no se sabe);
 *   rebounds: playId → true para los castigos que rebotaron en un Espejo.
 *
 * Qué vale cada jugada en `effects`:
 *   Escudo, Doble, Doble Dorada: lo que suma a quien la juega.
 *   Gafe: lo que le quita a su víctima (negativo). Si rebota, la víctima es quien lo echó.
 *   Robo: lo que se lleva quien lo juega (positivo); si rebota, lo que pierde (negativo).
 *   Espejo: los puntos que ha rebotado (0 si nadie le castigó).
 */
function cardPoints({ matches, pick, weekPoints, plays }) {
    const outcome = (u, m) => {
        const p = pick(u, m.id);
        const right = Boolean(p && m.result && p.winner === m.result.winner);
        const exact = right && p.description === m.result.result;
        return { right, exact, base: right ? 2 + (exact ? (EXACT[m.format] || 0) : 0) : 0 };
    };
    // El pleno es la racha de aciertos exactos con la que ABRE la jornada. Un partido
    // sin resultado ni suma ni rompe. Con Escudo, el primer no perfecto se salta.
    const openingRun = (u, shield) => {
        let run = 0;
        let used = !shield;
        for (const m of matches) {
            if (!m.result) continue;
            if (outcome(u, m).exact) { run++; continue; }
            if (!used) { used = true; continue; }
            break;
        }
        return run;
    };
    const byId = Object.fromEntries(matches.map(m => [m.id, m]));
    const allResolved = matches.length > 0 && matches.every(m => m.result);

    // Hasta 2 cartas de efecto por jugador, sin repetir, y un castigo por objetivo: si
    // se cuela alguna de más (no debería), cuentan las primeras.
    const ordered = [...plays].sort((a, b) => a.id - b.id);
    const effectsOf = {}; // userId → Set de familias ya jugadas
    const seenTarget = new Set();

    const deltas = {};
    const effects = {};
    const rebounds = {};
    const add = (u, n) => { deltas[u] = (deltas[u] || 0) + n; };
    const castigos = []; // [{ play, target }]
    const mirrorOf = {}; // userId → su jugada de Espejo (la primera)

    for (const play of ordered) {
        const info = CARDS[play.card];
        if (!info) { effects[play.id] = 0; continue; }
        if (play.card === 'espejo') {
            if (!mirrorOf[play.user_id]) { mirrorOf[play.user_id] = play; effects[play.id] = 0; } else effects[play.id] = 0;
            continue;
        }
        if (!info.limited) { effects[play.id] = 0; continue; }
        const used = effectsOf[play.user_id] || (effectsOf[play.user_id] = new Set());
        if (used.size >= EFFECTS_PER_ROUND || used.has(familyOf(play.card))) { effects[play.id] = 0; continue; }
        used.add(familyOf(play.card));

        const u = play.user_id;
        if (play.card === 'escudo') {
            const anyResolved = matches.some(m => m.result);
            const v = plenoBonus(openingRun(u, true)) - plenoBonus(openingRun(u, false));
            effects[play.id] = anyResolved ? v : null;
            add(u, v);
            continue;
        }
        if (play.card === 'robo') {
            // Se decide con la jornada entera: hasta que no hay todos los resultados, nada.
            if (!allResolved) { effects[play.id] = null; continue; }
            if (seenTarget.has(play.target_user_id)) { effects[play.id] = 0; continue; }
            seenTarget.add(play.target_user_id);
            castigos.push({ play, target: play.target_user_id });
            continue;
        }
        const m = byId[play.match_id];
        if (!m || !m.result) { effects[play.id] = null; continue; }
        if (play.card === 'doble' || play.card === 'dorada') {
            const o = outcome(u, m);
            let v = play.card === 'doble' ? Math.min(DOBLE_CAP, o.base) : o.base;
            if (play.card === 'dorada') v += plenoBonus(openingRun(u, false));
            effects[play.id] = v;
            add(u, v);
        } else if (play.card === 'gafe') {
            if (seenTarget.has(play.target_user_id)) { effects[play.id] = 0; continue; }
            seenTarget.add(play.target_user_id);
            castigos.push({ play, target: play.target_user_id });
        }
    }

    // Los castigos, al final: nunca dejan la jornada de nadie por debajo de 0.
    //
    // Si su objetivo tiene un Espejo, rebota: el castigo se evalúa al revés, sobre quien
    // lo echó. El rebote también cuenta como castigo recibido: si quien lo echó ya
    // tenía uno, el rebote se pierde.
    const room = (u) => Math.max(0, (weekPoints[u] || 0) + (deltas[u] || 0));
    for (const { play, target } of castigos) {
        const mirror = mirrorOf[target];
        const rebound = Boolean(mirror);
        const caster = play.user_id;
        const victim = rebound ? caster : target;
        const other = rebound ? target : caster; // quien se beneficia (el Robo)
        if (rebound) {
            rebounds[play.id] = true;
            if (seenTarget.has(caster)) { effects[play.id] = 0; continue; }
            seenTarget.add(caster);
        }

        if (play.card === 'gafe') {
            const m = byId[play.match_id];
            if (!m || !m.result) { effects[play.id] = null; if (mirror) effects[mirror.id] = null; continue; }
            if (outcome(victim, m).right) { effects[play.id] = 0; continue; }
            const hit = Math.min(GAFE_POINTS, room(victim));
            effects[play.id] = -hit;
            add(victim, -hit);
            if (mirror) effects[mirror.id] = (effects[mirror.id] || 0) + hit;
        } else if (play.card === 'robo') {
            // El que hace más puntos (sin cartas) se lleva 1 del otro.
            if ((weekPoints[other] || 0) <= (weekPoints[victim] || 0)) { effects[play.id] = 0; continue; }
            const take = Math.min(ROBO_POINTS, room(victim));
            add(victim, -take);
            add(other, take);
            effects[play.id] = rebound ? -take : take;
            if (mirror) effects[mirror.id] = (effects[mirror.id] || 0) + take;
        }
    }
    // Un Espejo cuyo castigo aún no se sabe, sigue pendiente.
    for (const p of Object.values(mirrorOf)) {
        const pending = ordered.some(q => ['gafe', 'robo'].includes(q.card) && q.target_user_id === p.user_id && effects[q.id] === null);
        if (pending) effects[p.id] = null;
    }
    return { deltas, effects, rebounds };
}

/**
 * Las jugadas de una jornada y lo que vale cada una ahora, con los datos de la base.
 * Para enseñarlas: el agregador hace lo mismo con lo que ya tiene cargado.
 */
async function roundEffects(round) {
    const plays = await CardPlay.findAll({ where: { round_id: round.id, status: 'active' }, order: [['id', 'ASC']] });
    if (!plays.length) return { plays, effects: {}, rebounds: {} };
    const matches = await Match.findAll({ where: { round_id: round.id }, order: [['date', 'ASC']] });
    const ids = matches.map(m => m.id);
    const [results, preds, weeks] = await Promise.all([
        Result.findAll({ where: { match_id: ids } }),
        Prediction.findAll({ where: { match_id: ids } }),
        PlayerWeekStat.findAll({ where: { league_id: round.league_id, week: round.order } }),
    ]);
    const resultOf = Object.fromEntries(results.map(r => [r.match_id, { winner: r.winner, result: r.result }]));
    const newest = {};
    preds.forEach(p => { const k = `${p.user_id}:${p.match_id}`; if (!newest[k] || p.id > newest[k].id) newest[k] = p; });
    const weekPoints = {};
    // Sin cartas ni duelos: lo mismo que ve el agregador al aplicar las cartas.
    weeks.forEach(w => { weekPoints[w.user_id] = w.points - (w.points_card || 0) - (w.points_duel || 0); });
    const { effects, rebounds } = cardPoints({
        matches: matches.map(m => ({ id: m.id, format: m.format, result: resultOf[m.id] || null })),
        pick: (u, mid) => newest[`${u}:${mid}`] || null,
        weekPoints,
        plays,
    });
    return { plays, effects, rebounds };
}

// ── Cuándo se bloquea ───────────────────────────────────────────────────────────

/** Si un partido ya ha empezado: en juego, terminado o con su hora pasada. */
const hasStarted = (match, resolvedIds, now = new Date()) =>
    match.status !== 'scheduled' || new Date(match.date) <= now || resolvedIds.has(match.id);

/**
 * El partido (o la jornada, para el Escudo, el Robo y el Espejo) que bloquea una
 * jugada, y si ya ha empezado. Es lo mismo que decide cuándo se revela.
 */
async function lockOf(play) {
    if (isRoundAim(CARDS[play.card]?.aim)) {
        const matches = await Match.findAll({ where: { round_id: play.round_id } });
        const resolved = new Set((await Result.findAll({ where: { match_id: matches.map(m => m.id) }, attributes: ['match_id'] })).map(r => r.match_id));
        return { started: matches.length === 0 || matches.some(m => hasStarted(m, resolved)) };
    }
    const match = await Match.findByPk(play.match_id);
    if (!match) return { started: true };
    const resolved = new Set((await Result.findAll({ where: { match_id: match.id }, attributes: ['match_id'] })).map(r => r.match_id));
    return { started: hasStarted(match, resolved) };
}

// ── La mano ─────────────────────────────────────────────────────────────────────

const lockHand = (userId, transaction) => sequelize.query('SELECT pg_advisory_xact_lock(:ns, :uid)', {
    replacements: { ns: LOCK_HAND, uid: Number(userId) }, transaction,
});

/**
 * La carta gratis solo vale en su jornada. Caduca cuando ya no se puede jugar: el
 * Escudo, en cuanto empieza el primer partido; las demás, cuando ya no queda ningún
 * partido de la jornada sin empezar. La carta del partido (de la tienda), cuando
 * empieza su partido. Idempotente.
 */
async function expireFreeCards(userId, leagueId, transaction) {
    await expireMatchCards(userId, leagueId, transaction);
    const free = await UserCard.findAll({ where: { user_id: userId, league_id: leagueId, status: 'in_hand', source: 'free' }, transaction });
    if (!free.length) return;
    const roundIds = [...new Set(free.map(c => Number(c.source_ref)).filter(Boolean))];
    const matches = await Match.findAll({ where: { round_id: roundIds }, transaction });
    const resolved = new Set((await Result.findAll({ where: { match_id: matches.map(m => m.id) }, attributes: ['match_id'], transaction })).map(r => r.match_id));
    const expired = [];
    for (const c of free) {
        const ms = matches.filter(m => m.round_id === Number(c.source_ref));
        const started = ms.map(m => hasStarted(m, resolved));
        const gone = c.card === 'escudo' ? started.some(Boolean) || !ms.length : started.every(Boolean);
        if (gone) expired.push(c.id);
    }
    if (expired.length) await UserCard.update({ status: 'expired' }, { where: { id: expired }, transaction });
}

/** Las cartas del partido (source 'match', source_ref = Match.id) caducan al empezar su partido. */
async function expireMatchCards(userId, leagueId, transaction) {
    const cards = await UserCard.findAll({ where: { user_id: userId, league_id: leagueId, status: 'in_hand', source: 'match' }, transaction });
    if (!cards.length) return;
    const matches = await Match.findAll({ where: { id: cards.map(c => Number(c.source_ref)) }, transaction });
    const resolved = new Set((await Result.findAll({ where: { match_id: matches.map(m => m.id) }, attributes: ['match_id'], transaction })).map(r => r.match_id));
    const gone = cards.filter(c => {
        const m = matches.find(x => x.id === Number(c.source_ref));
        return !m || hasStarted(m, resolved);
    }).map(c => c.id);
    if (gone.length) await UserCard.update({ status: 'expired' }, { where: { id: gone }, transaction });
}

/** Las cartas que caducan cuando una liga termina. Idempotente. */
async function expireIfFinished(league) {
    if (league.status !== 'finished') return;
    await UserCard.update({ status: 'expired' }, { where: { league_id: league.id, status: 'in_hand' } });
}

/**
 * Da una carta a alguien en una liga. La mano no tiene límite.
 *
 * Con `source` y `sourceRef`, no da dos veces lo mismo (la carta gratis de una
 * jornada).
 *
 * @returns {Promise<{card: Object|null, duplicate: boolean}>}
 */
async function giveCard({ userId, leagueId, card, source, sourceRef = null }) {
    if (!CARDS[card]) throw new CardError(400, `Carta desconocida: "${card}"`);
    return sequelize.transaction(async (transaction) => {
        await lockHand(userId, transaction);
        if (sourceRef !== null) {
            const dup = await UserCard.findOne({ where: { user_id: userId, league_id: leagueId, source, source_ref: String(sourceRef) }, transaction });
            if (dup) return { card: null, duplicate: true };
        }
        const row = await UserCard.create({
            user_id: userId, league_id: leagueId, card, source,
            source_ref: sourceRef === null ? null : String(sourceRef),
            status: 'in_hand',
        }, { transaction });
        return { card: row, duplicate: false };
    });
}

/** Una carta al azar de las gratis, con un azar de verdad. */
const randomFreeCard = () => FREE_POOL[crypto.randomInt(FREE_POOL.length)];

/**
 * La carta gratis de una jornada completa, si la liga juega cartas. La llama
 * utils/coinRewards.js en el mismo momento que paga la jornada completa.
 */
async function grantFreeCard({ userId, league, round }) {
    if (!league.cards_enabled || league.status === 'finished') return null;
    return giveCard({ userId, leagueId: league.id, card: randomFreeCard(), source: 'free', sourceRef: round.id });
}

// ── Jugar ───────────────────────────────────────────────────────────────────

/**
 * Juega una carta.
 *
 * @param {Object} p
 * @param {number} p.userId
 * @param {number} p.userCardId
 * @param {number} [p.matchId] - Doble, Doble Dorada, Gafe y Chivato.
 * @param {number} [p.roundId] - Escudo.
 * @param {number} [p.targetUserId] - Gafe.
 * @returns {Promise<{play: Object, share?: Object}>}
 * @throws {CardError}
 */
async function playCard({ userId, userCardId, matchId, roundId, targetUserId }) {
    return sequelize.transaction(async (transaction) => {
        await lockHand(userId, transaction);

        const owned = await UserCard.findOne({ where: { id: userCardId, user_id: userId }, transaction });
        if (!owned) throw new CardError(404, 'Esa carta no es tuya');
        await expireFreeCards(userId, owned.league_id, transaction);
        const userCard = await UserCard.findByPk(owned.id, { transaction });
        if (userCard.status === 'expired' && userCard.source === 'free') throw new CardError(409, 'Esa carta gratis ha caducado: solo valía en su jornada');
        if (userCard.status === 'expired' && userCard.source === 'match') throw new CardError(409, 'Esa carta del partido ha caducado: su partido ya ha empezado');
        if (userCard.status !== 'in_hand') throw new CardError(409, 'Esa carta ya no está en tu mano');
        const info = CARDS[userCard.card];
        if (!info) throw new CardError(400, 'Carta desconocida');

        const league = await League.findByPk(userCard.league_id, { transaction });
        if (!league || !league.cards_enabled) throw new CardError(409, 'En esta liga no se juegan cartas');
        if (league.status === 'finished') throw new CardError(409, 'La liga ha terminado');

        // Dónde se juega y si aún se puede.
        let round;
        let match = null;
        if (isRoundAim(info.aim)) {
            round = await Round.findOne({ where: { id: roundId, league_id: league.id }, transaction });
            if (!round) throw new CardError(400, 'Elige una jornada de esta liga');
            const matches = await Match.findAll({ where: { round_id: round.id }, transaction });
            if (!matches.length) throw new CardError(409, 'Esa jornada no tiene partidos');
            const resolved = new Set((await Result.findAll({ where: { match_id: matches.map(m => m.id) }, attributes: ['match_id'], transaction })).map(r => r.match_id));
            if (matches.some(m => hasStarted(m, resolved))) throw new CardError(409, `La jornada ya ha empezado: el ${info.label} se juega antes del primer partido`);
        } else {
            match = await Match.findOne({ where: { id: matchId, league_id: league.id }, transaction });
            if (!match) throw new CardError(400, 'Elige un partido de esta liga');
            if (!match.round_id) throw new CardError(409, 'Ese partido no tiene jornada');
            const resolved = new Set((await Result.findAll({ where: { match_id: match.id }, attributes: ['match_id'], transaction })).map(r => r.match_id));
            if (hasStarted(match, resolved)) throw new CardError(409, 'Ese partido ya ha empezado');
            round = await Round.findByPk(match.round_id, { transaction });
        }

        // La carta gratis, solo en su jornada.
        if (userCard.source === 'free' && Number(userCard.source_ref) !== round.id) {
            const own = await Round.findByPk(Number(userCard.source_ref), { transaction });
            throw new CardError(409, `Esa carta gratis solo vale en su jornada${own ? ` (${own.name || 'J' + own.order})` : ''}`);
        }

        // La carta del partido, solo en su partido.
        if (userCard.source === 'match' && (!match || Number(userCard.source_ref) !== match.id)) {
            throw new CardError(409, 'Esa carta solo vale para su partido');
        }

        // Hasta 2 de efecto por jornada y nunca la misma dos veces (el Chivato, uno).
        const mine = await CardPlay.findAll({ where: { user_id: userId, round_id: round.id, status: 'active' }, transaction });
        const same = mine.find(p => familyOf(p.card) === familyOf(userCard.card));
        if (same) throw new CardError(409, `Ya has jugado ${CARDS[same.card].label} esta jornada: cada carta, una vez por jornada`);
        if (info.limited && mine.filter(p => CARDS[p.card]?.limited).length >= EFFECTS_PER_ROUND) {
            throw new CardError(409, `Ya has jugado ${EFFECTS_PER_ROUND} cartas esta jornada`);
        }

        // El Gafe y el Robo: un rival de la liga que aún no tenga castigo esta jornada.
        if (needsTarget(info.aim)) {
            const target = Number(targetUserId);
            if (!target) throw new CardError(400, `Elige a quién echarle el ${info.label}`);
            if (target === Number(userId)) throw new CardError(400, `No puedes echarte el ${info.label} a ti mismo`);
            const member = await LeagueParticipation.count({ where: { user_id: target, league_id: league.id }, transaction });
            if (!member) throw new CardError(400, 'Ese jugador no está en la liga');
            await sequelize.query('SELECT pg_advisory_xact_lock(:ns, :uid)', { replacements: { ns: LOCK_PUNISHED, uid: target }, transaction });
            const punished = await CardPlay.findOne({ where: { target_user_id: target, round_id: round.id, status: 'active' }, transaction });
            if (punished) throw new CardError(409, 'Ese jugador ya tiene un castigo esta jornada');
        }

        const play = await CardPlay.create({
            user_card_id: userCard.id,
            user_id: userId,
            league_id: league.id,
            round_id: round.id,
            card: userCard.card,
            match_id: match ? match.id : null,
            target_user_id: needsTarget(info.aim) ? Number(targetUserId) : null,
        }, { transaction });
        await userCard.update({ status: 'played' }, { transaction });

        const out = { play };
        if (userCard.card === 'chivato') out.share = await voteShare(match.id, transaction);
        return out;
    });
}

/**
 * El reparto de votos de un partido, para el Chivato: { total, byTeam: { teamId: n } }.
 * Cuenta una predicción por persona (la más nueva), como el agregador.
 */
async function voteShare(matchId, transaction) {
    const preds = await Prediction.findAll({ where: { match_id: matchId }, order: [['id', 'ASC']], transaction });
    const newest = {};
    preds.forEach(p => { newest[p.user_id] = p; });
    const byTeam = {};
    Object.values(newest).forEach(p => { byTeam[p.winner] = (byTeam[p.winner] || 0) + 1; });
    return { total: Object.keys(newest).length, byTeam };
}

// ── Lo que se enseña ────────────────────────────────────────────────────────────

const PUBLIC_USER = ['id', 'username', 'logo_url'];

/**
 * Mi mano en una liga, mis jugadas y lo que necesita la pantalla para jugar.
 *
 * @returns {Promise<Object>}
 */
async function handOf(userId, leagueId) {
    const league = await League.findByPk(leagueId, { attributes: ['id', 'name', 'status', 'cards_enabled'] });
    if (!league) throw new CardError(404, 'Liga no encontrada');
    await expireIfFinished(league);
    await expireFreeCards(userId, leagueId);

    const [hand, plays] = await Promise.all([
        UserCard.findAll({ where: { user_id: userId, league_id: leagueId, status: 'in_hand' }, order: [['id', 'ASC']] }),
        CardPlay.findAll({ where: { user_id: userId, league_id: leagueId }, order: [['id', 'DESC']] }),
    ]);
    const rounds = {};
    for (const p of plays) if (!rounds[p.round_id]) rounds[p.round_id] = await Round.findByPk(p.round_id);
    const effectsByRound = {};
    const reboundsByRound = {};
    for (const r of Object.values(rounds)) {
        if (!r) continue;
        const re = await roundEffects(r);
        effectsByRound[r.id] = re.effects;
        reboundsByRound[r.id] = re.rebounds;
    }
    const targets = await User.findAll({ where: { id: plays.map(p => p.target_user_id).filter(Boolean) }, attributes: PUBLIC_USER });

    return {
        league: { id: league.id, status: league.status },
        enabled: league.cards_enabled,
        effectsPerRound: EFFECTS_PER_ROUND,
        catalog: Object.keys(CARDS).map(cardInfo),
        hand: await Promise.all(hand.map(async c => {
            const base = { id: c.id, source: c.source, created_at: c.created_at, ...cardInfo(c.card), family: familyOf(c.card) };
            if (c.source === 'match') {
                // La del partido dice de qué partido es: solo vale ahí.
                const Team = require('../models/team');
                const m = await Match.findByPk(Number(c.source_ref), { include: [{ model: Team, attributes: ['id', 'name', 'acronym'], through: { attributes: [] } }] });
                return { ...base, match: m ? { id: m.id, round_id: m.round_id, date: m.date, Teams: m.Teams } : null };
            }
            if (c.source !== 'free') return base;
            // La gratis dice de qué jornada es: solo vale ahí.
            const r = await Round.findByPk(Number(c.source_ref), { attributes: ['id', 'order', 'name'] });
            return { ...base, round: r ? { id: r.id, order: r.order, name: r.name } : null };
        })),
        plays: await Promise.all(plays.map(async p => ({
            id: p.id,
            round_id: p.round_id,
            round_order: rounds[p.round_id]?.order ?? null,
            match_id: p.match_id,
            status: p.status,
            target: targets.find(t => t.id === p.target_user_id) || null,
            effect: effectsByRound[p.round_id]?.[p.id] ?? null,
            rebounded: Boolean(reboundsByRound[p.round_id]?.[p.id]),
            locked: (await lockOf(p)).started,
            key: p.card,
            family: familyOf(p.card),
            card: cardInfo(p.card),
        }))),
    };
}

/**
 * Las cartas jugadas en una jornada, tal como las puede ver quien pregunta: las
 * suyas siempre; las de los demás, cuando empieza su partido (el Escudo, cuando
 * empieza la jornada); un admin, todas.
 */
async function roundPlaysFor({ viewerId, isAdmin, roundId }) {
    const round = await Round.findByPk(roundId);
    if (!round) throw new CardError(404, 'Jornada no encontrada');
    const { plays, effects, rebounds } = await roundEffects(round);
    const visible = [];
    for (const p of plays) {
        const revealed = (await lockOf(p)).started;
        if (revealed || isAdmin || p.user_id === viewerId) visible.push({ play: p, revealed });
    }
    const users = await User.findAll({
        where: { id: [...new Set(visible.flatMap(v => [v.play.user_id, v.play.target_user_id]).filter(Boolean))] },
        attributes: PUBLIC_USER,
    });
    const userOf = (id) => users.find(u => u.id === id) || null;
    return visible.map(({ play, revealed }) => ({
        id: play.id,
        revealed,
        mine: play.user_id === viewerId,
        user: userOf(play.user_id),
        target: userOf(play.target_user_id),
        match_id: play.match_id,
        effect: effects[play.id] ?? null,
        rebounded: Boolean(rebounds[play.id]),
        key: play.card,
        card: cardInfo(play.card),
    }));
}

// ── Admin ───────────────────────────────────────────────────────────────────────

/**
 * Anula una jugada: deja de contar (la carta no vuelve) y la jornada se vuelve a
 * puntuar, por diferencia.
 */
async function annulPlay(playId) {
    const play = await CardPlay.findByPk(playId);
    if (!play) throw new CardError(404, 'Jugada no encontrada');
    if (play.status === 'annulled') return play;
    await play.update({ status: 'annulled' });
    const round = await Round.findByPk(play.round_id);
    if (round) {
        const statsAggregator = require('./statsAggregator');
        await statsAggregator.applyWeekPoints(round.league_id, round.order);
    }
    return play;
}

/** Todas las jugadas de una liga, para el panel. */
async function leaguePlays(leagueId) {
    const plays = await CardPlay.findAll({ where: { league_id: leagueId }, order: [['id', 'DESC']] });
    const rounds = await Round.findAll({ where: { id: [...new Set(plays.map(p => p.round_id))] } });
    const effectsByRound = {};
    const reboundsByRound = {};
    for (const r of rounds) {
        const re = await roundEffects(r);
        effectsByRound[r.id] = re.effects;
        reboundsByRound[r.id] = re.rebounds;
    }
    const users = await User.findAll({
        where: { id: [...new Set(plays.flatMap(p => [p.user_id, p.target_user_id]).filter(Boolean))] },
        attributes: PUBLIC_USER,
    });
    const userOf = (id) => users.find(u => u.id === id) || null;
    return plays.map(p => ({
        id: p.id,
        round_id: p.round_id,
        round_order: rounds.find(r => r.id === p.round_id)?.order ?? null,
        match_id: p.match_id,
        status: p.status,
        user: userOf(p.user_id),
        target: userOf(p.target_user_id),
        effect: p.status === 'active' ? (effectsByRound[p.round_id]?.[p.id] ?? null) : 0,
        rebounded: Boolean(reboundsByRound[p.round_id]?.[p.id]),
        created_at: p.created_at,
        key: p.card,
        card: cardInfo(p.card),
    }));
}

/**
 * Los avisos de Gafe que le quedan por ver a alguien, para el aviso a pantalla
 * completa al entrar.
 *
 * Un Gafe avisa dos veces como mucho: al empezar su partido (`pending`: ya no es
 * secreto, aún no se sabe) y con el resultado (`hit` si falló el ganador o no votó,
 * `miss` si acertó). Quien entra ya con el resultado ve solo el segundo.
 *
 * `points` es lo que le ha quitado de verdad (el castigo no deja la jornada por debajo
 * de 0, así que puede ser 0 aunque le haya pillado).
 */
async function gafeNotices(userId) {
    const { Op } = require('sequelize');
    const Team = require('../models/team');
    const plays = await CardPlay.findAll({
        where: {
            target_user_id: userId,
            card: 'gafe',
            status: 'active',
            [Op.or]: [{ target_seen: null }, { target_seen: 'pending' }],
        },
        order: [['id', 'ASC']],
    });
    const notices = [];
    const effectsOf = {};
    for (const play of plays) {
        if (!(await lockOf(play)).started) continue; // aún es secreto
        if (!effectsOf[play.round_id]) effectsOf[play.round_id] = await roundEffects(await Round.findByPk(play.round_id));
        const effect = effectsOf[play.round_id].effects[play.id];
        const rebounded = Boolean(effectsOf[play.round_id].rebounds[play.id]);
        const result = await Result.findOne({ where: { match_id: play.match_id } });
        const resolved = Boolean(result) && effect !== null && effect !== undefined;
        if (!resolved && play.target_seen === 'pending') continue;

        let state = 'pending';
        if (resolved) {
            const pick = await Prediction.findOne({ where: { user_id: userId, match_id: play.match_id }, order: [['id', 'DESC']] });
            // Si rebotó en tu Espejo, te has librado aunque fallaras.
            state = rebounded || (pick && pick.winner === result.winner) ? 'miss' : 'hit';
        }
        const [from, match, league] = await Promise.all([
            User.findByPk(play.user_id, { attributes: PUBLIC_USER }),
            Match.findByPk(play.match_id, { include: [{ model: Team, attributes: ['id', 'name', 'acronym'], through: { attributes: [] } }] }),
            League.findByPk(play.league_id, { attributes: ['id', 'name'] }),
        ]);
        notices.push({
            id: play.id,
            state,
            points: resolved ? (rebounded ? 0 : Math.abs(effect)) : null,
            rebounded,
            from,
            league,
            match: match && { id: match.id, Teams: match.Teams },
        });
    }
    return notices;
}

/**
 * Marca un aviso de Gafe como visto por quien lo recibió. Solo avanza (de nada a
 * `pending`, de lo que sea a `resolved`), así que dos pestañas no lo desordenan.
 */
async function markNoticeSeen({ userId, playId, state }) {
    if (!['pending', 'resolved'].includes(state)) throw new CardError(400, 'Estado de aviso no válido');
    const play = await CardPlay.findByPk(playId);
    if (!play || play.target_user_id !== userId) throw new CardError(404, 'Aviso no encontrado');
    if (play.target_seen === 'resolved' || play.target_seen === state) return;
    play.target_seen = state;
    await play.save();
}

module.exports = {
    lockHand,
    gafeNotices,
    markNoticeSeen,
    CARDS,
    FREE_POOL,
    EFFECTS_PER_ROUND,
    ROBO_POINTS,
    isRoundAim,
    needsTarget,
    familyOf,
    expireFreeCards,
    DOBLE_CAP,
    GAFE_POINTS,
    REFUND,
    CardError,
    cardPoints,
    hasStarted,
    giveCard,
    grantFreeCard,
    playCard,
    voteShare,
    handOf,
    roundPlaysFor,
    annulPlay,
    leaguePlays,
    expireIfFinished,
};
