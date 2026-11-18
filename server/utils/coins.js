const { QueryTypes } = require('sequelize');
const sequelize = require('../config/configdb');
const CoinTransaction = require('../models/coinTransaction');

/**
 * Las monedas: saldo, pagar una vez, deshacer y ajustes del admin.
 *
 * El saldo es la suma del libro (models/coinTransaction.js). Todo lo que lo toca pasa
 * por `withUserLock`, que abre una transacción y coge un candado de Postgres por
 * usuario: dos peticiones a la vez para la misma persona esperan su turno, así que
 * ni se paga dos veces la misma recompensa ni se pasa nadie del techo.
 *
 * Qué se paga y cuándo lo decide utils/coinRewards.js. Esto solo sabe mover monedas.
 */

/** Lo máximo que puede tener alguien. Lo que pase de ahí no se cobra. */
const COIN_CAP = 150;

/** Lo que se enseña de cada motivo. La única lista: el cliente la recibe ya resuelta. */
const REASONS = Object.freeze({
    login: 'Entrar a la web',
    round_complete: 'Jornada completa',
    questions_complete: 'Todas las preguntas',
    streak: 'Racha de 3 jornadas',
    pleno: 'Pleno',
    bottom_half: 'Mitad de abajo de la jornada',
    admin: 'Ajuste del administrador',
    card_refund: 'Carta que no cabía en la mano',
    shop: 'Compra en la tienda',
});

// Espacio de nombres del candado, para no chocar con otros advisory locks.
const LOCK_NS = 7031;

/**
 * Ejecuta `fn(transaction)` con el candado de las monedas de un usuario cogido.
 * El candado se suelta solo al acabar la transacción.
 */
async function withUserLock(userId, fn) {
    return sequelize.transaction(async (transaction) => {
        await sequelize.query('SELECT pg_advisory_xact_lock(:ns, :uid)', {
            replacements: { ns: LOCK_NS, uid: Number(userId) },
            transaction,
        });
        return fn(transaction);
    });
}

/** El saldo de un usuario. */
async function balanceOf(userId, transaction) {
    const [row] = await sequelize.query(
        'SELECT COALESCE(SUM(amount), 0)::int AS balance FROM "CoinTransaction" WHERE user_id = :uid',
        { replacements: { uid: Number(userId) }, type: QueryTypes.SELECT, transaction }
    );
    return row.balance;
}

/**
 * El pago vigente de una recompensa: el último que no ha sido deshecho.
 *
 * @returns {Promise<Object|null>}
 */
async function activeGrant({ userId, reason, refType, refId }, transaction) {
    const [row] = await sequelize.query(`
        SELECT g.* FROM "CoinTransaction" g
         WHERE g.user_id = :uid AND g.reason = :reason
           AND g.ref_type IS NOT DISTINCT FROM :refType AND g.ref_id IS NOT DISTINCT FROM :refId
           AND g.reverses_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM "CoinTransaction" r WHERE r.reverses_id = g.id)
         ORDER BY g.id DESC LIMIT 1`, {
        replacements: { uid: Number(userId), reason, refType: refType ?? null, refId: refId == null ? null : String(refId) },
        type: QueryTypes.SELECT,
        transaction,
    });
    return row || null;
}

/**
 * Paga una recompensa si no está pagada ya. Idempotente: llamarlo diez veces paga una.
 *
 * Con el techo lleno se apunta igual, por lo que quepa (puede ser 0): así consta que
 * ya se pagó y no se vuelve a pagar cuando el saldo baje.
 *
 * @param {Object} p
 * @param {number} p.userId
 * @param {string} p.reason - Una clave de REASONS.
 * @param {string} [p.refType]
 * @param {string|number} [p.refId]
 * @param {number} p.amount - Positivo.
 * @param {number} [p.leagueId]
 * @param {string} [p.note]
 * @returns {Promise<Object|null>} El movimiento nuevo, o null si ya estaba pagada.
 */
async function grantOnce({ userId, reason, refType = null, refId = null, amount, leagueId = null, note = null }) {
    if (!REASONS[reason]) throw new Error(`Motivo de monedas desconocido: "${reason}"`);
    return withUserLock(userId, async (transaction) => {
        if (await activeGrant({ userId, reason, refType, refId }, transaction)) return null;
        const room = Math.max(0, COIN_CAP - await balanceOf(userId, transaction));
        return CoinTransaction.create({
            user_id: userId,
            amount: Math.max(0, Math.min(amount, room)),
            reason,
            ref_type: refType,
            ref_id: refId == null ? null : String(refId),
            league_id: leagueId,
            note,
        }, { transaction });
    });
}

/**
 * Deshace el pago vigente de una recompensa, si lo hay, con un movimiento de vuelta.
 *
 * Nunca deja el saldo por debajo de 0: si ya se lo ha gastado, se quita lo que quede.
 *
 * @returns {Promise<Object|null>} El movimiento de vuelta, o null si no había nada que deshacer.
 */
async function revoke({ userId, reason, refType = null, refId = null }) {
    return withUserLock(userId, async (transaction) => {
        const grant = await activeGrant({ userId, reason, refType, refId }, transaction);
        if (!grant) return null;
        const balance = await balanceOf(userId, transaction);
        return CoinTransaction.create({
            user_id: userId,
            amount: -Math.max(0, Math.min(grant.amount, balance)),
            reason,
            ref_type: grant.ref_type,
            ref_id: grant.ref_id,
            league_id: grant.league_id,
            reverses_id: grant.id,
            note: grant.note,
        }, { transaction });
    });
}

/**
 * Deja una recompensa como le corresponde ahora: pagada si `deserved`, deshecha si no.
 * Es lo que permite recalcular por diferencia, como los puntos.
 */
async function reconcile(key, deserved, grant) {
    return deserved ? grantOnce({ ...key, ...grant }) : revoke(key);
}

/**
 * Un ajuste del admin. Positivo, hasta el techo; negativo, hasta dejar el saldo en 0.
 *
 * @returns {Promise<Object>} El movimiento, con lo que se movió de verdad.
 */
async function adminAdjust({ userId, amount, note, adminId }) {
    return withUserLock(userId, async (transaction) => {
        const balance = await balanceOf(userId, transaction);
        const applied = amount >= 0
            ? Math.min(amount, Math.max(0, COIN_CAP - balance))
            : -Math.min(-amount, Math.max(0, balance));
        return CoinTransaction.create({
            user_id: userId, amount: applied, reason: 'admin', note, created_by: adminId,
        }, { transaction });
    });
}

/**
 * Saldo e historial de un usuario, listos para enseñar.
 *
 * @param {number} userId
 * @param {number} [limit]
 * @returns {Promise<{balance: number, cap: number, movements: Array<Object>}>}
 */
async function walletOf(userId, limit = 50) {
    const [balance, rows] = await Promise.all([
        balanceOf(userId),
        CoinTransaction.findAll({ where: { user_id: userId }, order: [['id', 'DESC']], limit }),
    ]);
    const reversed = new Set(rows.filter(r => r.reverses_id).map(r => r.reverses_id));
    return {
        balance,
        cap: COIN_CAP,
        movements: rows.map(r => ({
            id: r.id,
            amount: r.amount,
            reason: r.reason,
            label: (REASONS[r.reason] || r.reason) + (r.reverses_id ? ' (corregido)' : ''),
            note: r.note,
            reversal: Boolean(r.reverses_id),
            reversed: reversed.has(r.id),
            created_at: r.created_at,
        })),
    };
}

module.exports = {
    COIN_CAP,
    REASONS,
    withUserLock,
    balanceOf,
    activeGrant,
    grantOnce,
    revoke,
    reconcile,
    adminAdjust,
    walletOf,
};
