const crypto = require('crypto');
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/configdb');
const ChestOpen = require('../models/chestOpen');
const CoinTransaction = require('../models/coinTransaction');
const UserCard = require('../models/userCard');
const UserCosmetic = require('../models/userCosmetic');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const coins = require('./coins');
const cards = require('./cards');
const shop = require('./shop');

/**
 * Cofres de competición (fase 4 de cartas y cofres).
 *
 * Cada liga en juego con cartas tiene su cofre. Se abre con pachanguitas y el dado lo
 * tira el servidor (crypto.randomInt), nunca el navegador; cada tirada queda en
 * ChestOpen.
 *
 * - 20 pachanguitas, 3 aperturas al día como mucho (entre todos los cofres).
 * - Garantía: tras 10 seguidas sin nada raro en un cofre, la siguiente es rara o mejor.
 * - Las cartas que tocan van a la mano de la liga del cofre (la mano no tiene
 *   límite). Un cosmético repetido se paga a la mitad de su precio.
 * - De media un cofre devuelve menos de lo que cuesta: es el sumidero de pachanguitas.
 *
 * Abrir coge el candado de las pachanguitas y, si toca carta, el de la mano: el mismo
 * orden que la tienda, así que no se pueden bloquear entre sí.
 */

class ChestError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const PRICE = 20;
const DAILY_LIMIT = 3;
const GUARANTEE_AFTER = 10;
const RARE_OR_BETTER = ['raro', 'epico', 'leg'];

const RARITY_LABEL = { comun: 'Común', poco: 'Poco común', raro: 'Raro', epico: 'Épico', leg: 'Legendario' };

/** Los cosméticos que pueden salir, sacados del catálogo de la tienda. */
const pool = (fn) => shop.ITEMS.filter(i => i.kind !== 'card' && fn(i)).map(i => i.id);
const POOLS = {
    colors: pool(i => i.kind === 'color' && i.price <= 20),
    frames: pool(i => i.kind === 'frame' && i.price <= 20),
    banners: pool(i => i.kind === 'banner'),
    titles: pool(i => i.kind === 'title' && !i.rotating),
    animated: pool(i => (i.kind === 'frame' || i.kind === 'color') && i.price >= 50),
};

/**
 * La tabla de premios. `bp` es la probabilidad en puntos básicos (de 10.000) y
 * cada premio de una rareza sale con la misma probabilidad que los demás.
 */
const TABLE = Object.freeze([
    { rarity: 'comun', bp: 6000, prizes: [{ kind: 'coins', amount: 5 }, { kind: 'coins', amount: 8 }] },
    { rarity: 'poco', bp: 2500, prizes: [{ kind: 'card', card: 'chivato' }, { kind: 'coins', amount: 12 }, { kind: 'cosmetic', pool: 'colors', label: 'Un color de nombre' }] },
    { rarity: 'raro', bp: 1100, prizes: [{ kind: 'card', card: 'escudo' }, { kind: 'card', card: 'gafe' }, { kind: 'card', card: 'robo' }, { kind: 'cosmetic', pool: 'frames', label: 'Un marco de avatar' }, { kind: 'cosmetic', pool: 'banners', label: 'Un banner' }] },
    { rarity: 'epico', bp: 350, prizes: [{ kind: 'card', card: 'doble' }, { kind: 'card', card: 'espejo' }, { kind: 'cosmetic', pool: 'titles', label: 'Un título' }] },
    { rarity: 'leg', bp: 50, prizes: [{ kind: 'card', card: 'dorada' }, { kind: 'cosmetic', pool: 'animated', label: 'Un marco o color animado (Arcoíris o Flame)' }] },
]);

/**
 * Tira la rareza. Puro: recibe la función de azar para poder probarlo.
 *
 * @param {(max: number) => number} randInt - Entero en [0, max).
 * @param {boolean} [guaranteed] - Forzar raro o mejor (garantía).
 * @returns {string}
 */
function rollRarity(randInt, guaranteed = false) {
    const rows = guaranteed ? TABLE.filter(r => RARE_OR_BETTER.includes(r.rarity)) : TABLE;
    const total = rows.reduce((s, r) => s + r.bp, 0);
    let x = randInt(total);
    for (const r of rows) {
        if (x < r.bp) return r.rarity;
        x -= r.bp;
    }
    return rows[rows.length - 1].rarity;
}

/** Elige el premio dentro de la rareza (y el cosmético dentro de su grupo). */
function rollPrize(rarity, randInt) {
    const row = TABLE.find(r => r.rarity === rarity);
    const p = row.prizes[randInt(row.prizes.length)];
    if (p.kind !== 'cosmetic') return { ...p };
    const ids = POOLS[p.pool];
    return { kind: 'cosmetic', id: ids[randInt(ids.length)] };
}

const randInt = (max) => crypto.randomInt(max);

/** La tabla lista para enseñar, con porcentajes y premios en texto. */
function tableView() {
    return TABLE.map(r => ({
        rarity: r.rarity,
        label: RARITY_LABEL[r.rarity],
        pct: r.bp / 100,
        prizes: r.prizes.map(p => (p.kind === 'coins' ? `${p.amount} pachanguitas`
            : p.kind === 'card' ? `Carta ${cards.CARDS[p.card].label}`
                : p.label)),
    }));
}

/** Un premio guardado, listo para enseñar. */
function prizeView(open) {
    const base = { rarity: open.rarity, rarityLabel: RARITY_LABEL[open.rarity], coins: open.coins, converted: open.converted, guaranteed: open.guaranteed };
    if (open.prize_kind === 'coins') return { ...base, kind: 'coins', label: `${open.coins} pachanguitas` };
    if (open.prize_kind === 'card') {
        const c = cards.CARDS[open.prize_id];
        return { ...base, kind: 'card', card: open.prize_id, label: `Carta ${c.label}`, cardRarity: c.rarity };
    }
    const item = shop.itemOf(open.prize_id);
    return { ...base, kind: 'cosmetic', id: open.prize_id, cosmeticKind: item?.kind, name: item?.label, label: item ? `${shop.SLOTS[item.kind]}: ${item.label}` : open.prize_id };
}

/** Cuántos cofres ha abierto hoy (hora de Madrid), entre todos. */
async function opensToday(userId, transaction) {
    const [row] = await sequelize.query(
        `SELECT COUNT(*)::int AS n FROM "ChestOpen"
          WHERE user_id = :uid
            AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid')`,
        { replacements: { uid: Number(userId) }, type: QueryTypes.SELECT, transaction }
    );
    return row.n;
}

/** Aperturas seguidas sin nada raro en el cofre de una liga (para la garantía). */
async function streakOf(userId, leagueId, transaction) {
    const lastRare = await ChestOpen.findOne({
        where: { user_id: userId, league_id: leagueId, rarity: RARE_OR_BETTER },
        order: [['id', 'DESC']],
        attributes: ['id'],
        transaction,
    });
    return ChestOpen.count({
        where: { user_id: userId, league_id: leagueId, ...(lastRare ? { id: { [Op.gt]: lastRare.id } } : {}) },
        transaction,
    });
}

/** Ligas cuyo cofre puede abrir un usuario: con cartas, sin terminar y apuntado. */
async function chestLeaguesOf(userId) {
    const parts = await LeagueParticipation.findAll({ where: { user_id: userId }, attributes: ['league_id'] });
    const ids = [...new Set(parts.map(p => p.league_id))];
    if (!ids.length) return [];
    const leagues = await League.findAll({ where: { id: ids, cards_enabled: true }, attributes: ['id', 'name', 'status', 'logo_url'] });
    return leagues.filter(l => l.status !== 'finished').sort((a, b) => b.id - a.id);
}

/**
 * Los cofres de un usuario: uno por liga, con la tabla, la garantía, el tope de hoy
 * y sus últimas aperturas.
 */
async function chestsFor(userId) {
    const [leagues, today] = await Promise.all([chestLeaguesOf(userId), opensToday(userId)]);
    const chests = await Promise.all(leagues.map(async (l) => {
        const [streak, history] = await Promise.all([
            streakOf(userId, l.id),
            ChestOpen.findAll({ where: { user_id: userId, league_id: l.id }, order: [['id', 'DESC']], limit: 8 }),
        ]);
        return {
            league: { id: l.id, name: l.name, logo_url: l.logo_url },
            name: `Cofre de ${l.name}`,
            price: PRICE,
            guarantee: { after: GUARANTEE_AFTER, streak, left: Math.max(1, GUARANTEE_AFTER - streak) },
            history: history.map(o => ({ id: o.id, created_at: o.created_at, ...prizeView(o) })),
        };
    }));
    return { price: PRICE, dailyLimit: DAILY_LIMIT, opensToday: today, table: tableView(), chests };
}

/**
 * Abrir el cofre de una liga.
 *
 * @returns {Promise<{prize: Object, balance: number, opensToday: number, guarantee: Object}>}
 */
async function openChest({ userId, leagueId, rand = randInt }) {
    return coins.withUserLock(userId, async (transaction) => {
        const league = await League.findByPk(leagueId, { transaction });
        if (!league || !league.cards_enabled) throw new ChestError(400, 'Esa liga no tiene cofre');
        if (league.status === 'finished') throw new ChestError(409, 'Esa liga ya ha terminado: su cofre ya no se abre');
        const member = await LeagueParticipation.count({ where: { user_id: userId, league_id: league.id }, transaction });
        if (!member) throw new ChestError(403, 'No estás apuntado a esa liga');

        const today = await opensToday(userId, transaction);
        if (today >= DAILY_LIMIT) throw new ChestError(409, `Ya has abierto ${DAILY_LIMIT} cofres hoy. Mañana más.`);
        let balance = await coins.balanceOf(userId, transaction);
        if (balance < PRICE) throw new ChestError(409, `No te llega: el cofre cuesta ${PRICE} y tienes ${balance}`);

        const streak = await streakOf(userId, league.id, transaction);
        const guaranteed = streak >= GUARANTEE_AFTER;
        const rarity = rollRarity(rand, guaranteed);
        const prize = rollPrize(rarity, rand);

        // Cobrar
        await CoinTransaction.create({
            user_id: userId, amount: -PRICE, reason: 'chest', ref_type: 'chest', ref_id: null,
            league_id: league.id, note: `Cofre de ${league.name}`,
        }, { transaction });
        balance -= PRICE;

        const open = await ChestOpen.create({
            user_id: userId, league_id: league.id, cost: PRICE, rarity, guaranteed,
            prize_kind: prize.kind, prize_id: prize.kind === 'card' ? prize.card : prize.kind === 'cosmetic' ? prize.id : null,
        }, { transaction });

        // Dar el premio. Lo que acaba en pachanguitas se calcula aquí y se paga abajo.
        let owed = 0;
        let converted = null;
        if (prize.kind === 'coins') {
            owed = prize.amount;
        } else if (prize.kind === 'card') {
            // La mano no tiene límite: la carta va siempre a la mano de la liga del cofre.
            await cards.lockHand(userId, transaction);
            await UserCard.create({ user_id: userId, league_id: league.id, card: prize.card, source: 'chest', source_ref: String(open.id), status: 'in_hand' }, { transaction });
        } else {
            const has = await UserCosmetic.findOne({ where: { user_id: userId, item_id: prize.id }, transaction });
            if (has) {
                owed = Math.floor(shop.itemOf(prize.id).price / 2);
                converted = 'duplicate';
            } else {
                await UserCosmetic.create({ user_id: userId, item_id: prize.id, source: 'chest' }, { transaction });
            }
        }

        // Las pachanguitas del premio, hasta el techo.
        const paid = Math.max(0, Math.min(owed, coins.COIN_CAP - balance));
        if (owed > 0) {
            await CoinTransaction.create({
                user_id: userId, amount: paid, reason: 'chest_prize', ref_type: 'chest', ref_id: String(open.id),
                league_id: league.id, note: converted === 'duplicate' ? 'Cosmético repetido' : null,
            }, { transaction });
            balance += paid;
        }
        open.coins = paid;
        open.converted = converted;
        await open.save({ transaction });

        const nextStreak = RARE_OR_BETTER.includes(rarity) ? 0 : streak + 1;
        return {
            prize: { id: open.id, created_at: open.created_at, ...prizeView(open) },
            balance,
            opensToday: today + 1,
            guarantee: { after: GUARANTEE_AFTER, streak: nextStreak, left: Math.max(1, GUARANTEE_AFTER - nextStreak) },
        };
    });
}

module.exports = {
    ChestError,
    PRICE,
    DAILY_LIMIT,
    GUARANTEE_AFTER,
    TABLE,
    POOLS,
    rollRarity,
    rollPrize,
    tableView,
    chestsFor,
    openChest,
};
