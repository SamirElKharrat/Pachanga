const crypto = require('crypto');
const { Op } = require('sequelize');
const CoinTransaction = require('../models/coinTransaction');
const Match = require('../models/match');
const Result = require('../models/result');
const Team = require('../models/team');
const UserCosmetic = require('../models/userCosmetic');
const UserCard = require('../models/userCard');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const coins = require('./coins');
const cards = require('./cards');

/**
 * La tienda (fases 3 y 6 de cartas y cofres): cartas y cosméticos que se compran con
 * pachanguitas.
 *
 * - Catálogo fijo, siempre a la venta.
 * - Escaparate semanal (fase 6): 4 huecos que cambian cada lunes (hora de Madrid),
 *   uno de ellos rebajado un 30 %. Sale de una semilla (la semana), así que no hace
 *   falta ninguna tarea programada ni tabla: el mismo lunes da el mismo escaparate.
 *   Los títulos de temporada (`rotating`) solo se venden cuando salen en él.
 * - Carta del partido (fase 6): cada partido de hoy de tus ligas con cartas trae una
 *   carta barata que solo vale para ese partido y se compra hasta que empieza. Una
 *   por partido.
 *
 * - Las cartas son de una liga (la que elijas al comprar) y caducan con ella. La
 *   Doble y la Doble Dorada NO se venden: salen en la carta gratis o en los cofres.
 *   Venderlas desequilibraba las ligas (fase 0, simulación).
 * - Los cosméticos son para siempre y valen en toda la web: marcos de avatar,
 *   colores de nombre y títulos. Uno de cada tipo puesto como mucho.
 *
 * Comprar coge el candado de las monedas del usuario y, si es una carta, después el
 * de su mano: siempre en ese orden, así que dos compras a la vez esperan su turno y
 * ninguna se queda esperándose a sí misma.
 */

class ShopError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/** Los tipos de cosmético y cómo se llaman. Uno puesto de cada. */
const SLOTS = Object.freeze({
    frame: 'Marco de avatar',
    color: 'Color de nombre',
    title: 'Título',
    banner: 'Banner',
});

/**
 * El catálogo. El aspecto de cada cosmético lo pone el cliente por su id
 * (client/src/components/atoms/css/cosmetics.css), así que un id no se cambia nunca.
 */
const ITEMS = Object.freeze([
    // Cartas (de una liga)
    { id: 'card_escudo', kind: 'card', card: 'escudo', price: 15 },
    { id: 'card_gafe', kind: 'card', card: 'gafe', price: 15 },
    { id: 'card_chivato', kind: 'card', card: 'chivato', price: 8 },
    { id: 'card_robo', kind: 'card', card: 'robo', price: 15 },
    { id: 'card_espejo', kind: 'card', card: 'espejo', price: 18 },

    // Marcos de avatar
    { id: 'frame_baron', kind: 'frame', label: 'Barón', price: 20 },
    { id: 'frame_dragon', kind: 'frame', label: 'Dragón', price: 20 },
    { id: 'frame_hextech', kind: 'frame', label: 'Hextech', price: 20 },
    { id: 'frame_zaun', kind: 'frame', label: 'Zaun', price: 20 },
    { id: 'frame_oro', kind: 'frame', label: 'Oro', price: 20 },
    { id: 'frame_arcoiris', kind: 'frame', label: 'Arcoíris', price: 50 },
    { id: 'frame_flame', kind: 'frame', label: 'Flame', price: 50 },

    // Colores de nombre
    { id: 'color_noxus', kind: 'color', label: 'Rojo Noxus', price: 20 },
    { id: 'color_piltover', kind: 'color', label: 'Oro Piltover', price: 20 },
    { id: 'color_zaun', kind: 'color', label: 'Verde Zaun', price: 20 },
    { id: 'color_vacio', kind: 'color', label: 'Morado del Vacío', price: 20 },
    { id: 'color_freljord', kind: 'color', label: 'Azul Freljord', price: 20 },
    { id: 'color_arcoiris', kind: 'color', label: 'Arcoíris', price: 50 },
    { id: 'color_flame', kind: 'color', label: 'Flame', price: 50 },

    // Títulos
    { id: 'title_rey_bo5', kind: 'title', label: 'Rey del BO5', price: 30 },
    { id: 'title_lo_vi_venir', kind: 'title', label: 'Lo vi venir', price: 30 },
    { id: 'title_analista', kind: 'title', label: 'Analista de sofá', price: 30 },
    { id: 'title_gafe', kind: 'title', label: 'Gafe profesional', price: 30 },
    { id: 'title_pleno', kind: 'title', label: 'Pleno o nada', price: 30 },
    { id: 'title_underdog', kind: 'title', label: 'Fan del underdog', price: 30 },

    // Títulos de temporada: solo se venden la semana que salen en el escaparate.
    { id: 'title_remontada', kind: 'title', label: 'Rey de la remontada', price: 35, rotating: true },
    { id: 'title_robabarones', kind: 'title', label: 'Robabarones', price: 35, rotating: true },
    { id: 'title_moneda_al_aire', kind: 'title', label: 'Moneda al aire', price: 35, rotating: true },
    { id: 'title_genio_draft', kind: 'title', label: 'Genio del draft', price: 35, rotating: true },
    { id: 'title_tilt', kind: 'title', label: 'Tilt controlado', price: 35, rotating: true },
    { id: 'title_macro', kind: 'title', label: 'Cerebro macro', price: 35, rotating: true },
    { id: 'title_profeta', kind: 'title', label: 'Profeta del 3-0', price: 35, rotating: true },
    { id: 'title_casi', kind: 'title', label: 'Casi pleno', price: 35, rotating: true },

    // Banners: fondo animado de la cabecera del perfil, de tu tarjeta del menú y de
    // tu fila en la clasificación. Dibujados con CSS (sin imágenes de Riot).
    { id: 'banner_baron', kind: 'banner', label: 'Foso del Barón', price: 30 },
    { id: 'banner_infernal', kind: 'banner', label: 'Alma infernal', price: 30 },
    { id: 'banner_hextech', kind: 'banner', label: 'Hextech', price: 30 },
    { id: 'banner_nexo', kind: 'banner', label: 'El Nexo', price: 30 },
    { id: 'banner_escenario', kind: 'banner', label: 'Escenario de Worlds', price: 30 },
    { id: 'banner_confeti', kind: 'banner', label: 'Confeti de campeón', price: 30 },
    { id: 'banner_freljord', kind: 'banner', label: 'Freljord', price: 30 },
    { id: 'banner_shurima', kind: 'banner', label: 'Shurima', price: 30 },
    { id: 'banner_zaun', kind: 'banner', label: 'Zaun', price: 30 },
    { id: 'banner_piltover', kind: 'banner', label: 'Piltover', price: 30 },
    { id: 'banner_ionia', kind: 'banner', label: 'Ionia', price: 30 },
    { id: 'banner_sombra', kind: 'banner', label: 'Islas de la Sombra', price: 30 },
]);

const itemOf = (id) => ITEMS.find(i => i.id === id) || null;

// ── Escaparate semanal ─────────────────────────────────────────────────────────

const DEAL = 0.3;
const MATCH_CARD_PRICE = Object.freeze({ gafe: 10, chivato: 5 });

/** La fecha de hoy en Madrid, 'AAAA-MM-DD'. */
const madridDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(now);

/** El lunes de la semana de `now` (Madrid), 'AAAA-MM-DD', y los días que le quedan. */
function weekOf(now = new Date()) {
    const day = new Date(`${madridDay(now)}T00:00:00Z`);
    const dow = (day.getUTCDay() + 6) % 7; // 0 = lunes
    const monday = new Date(day.getTime() - dow * 86400000);
    return { key: monday.toISOString().slice(0, 10), daysLeft: 7 - dow };
}

/** Un generador de azar con semilla (el mismo texto da siempre la misma serie). */
function seeded(text) {
    let s = crypto.createHash('sha256').update(text).digest().readUInt32LE(0);
    return (max) => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) % max);
    };
}

/**
 * El escaparate de una semana: una carta, un título de temporada y dos cosméticos,
 * uno de los cuatro con un 30 % de rebaja.
 *
 * @returns {{week: string, daysLeft: number, items: Array<{id: string, price: number, basePrice: number, deal: boolean}>}}
 */
function showcase(now = new Date()) {
    const { key, daysLeft } = weekOf(now);
    const rand = seeded(`escaparate:${key}`);
    const pickFrom = (list) => list[rand(list.length)];
    const cardsForSale = ITEMS.filter(i => i.kind === 'card');
    const seasonal = ITEMS.filter(i => i.rotating);
    const regular = ITEMS.filter(i => i.kind !== 'card' && !i.rotating);
    const first = pickFrom(regular);
    const rest = regular.filter(i => i.id !== first.id && i.kind !== first.kind);
    const picked = [pickFrom(cardsForSale), pickFrom(seasonal), first, pickFrom(rest.length ? rest : regular)];
    const dealAt = rand(picked.length);
    return {
        week: key,
        daysLeft,
        items: picked.map((item, i) => ({
            id: item.id,
            basePrice: item.price,
            price: i === dealAt ? Math.max(1, Math.round(item.price * (1 - DEAL))) : item.price,
            deal: i === dealAt,
        })),
    };
}

/** Lo que cuesta un artículo ahora (con la rebaja de la semana si le toca). */
function priceOf(item, now = new Date()) {
    const slot = showcase(now).items.find(s => s.id === item.id);
    return slot ? slot.price : item.price;
}

/** Si se puede comprar ahora: los de temporada, solo la semana que salen. */
const onSale = (item, now = new Date()) => !item.rotating || showcase(now).items.some(s => s.id === item.id);

/** Un artículo listo para enseñar: las cartas, con su nombre y texto del catálogo de cartas. */
function itemInfo(item, now = new Date()) {
    const price = priceOf(item, now);
    if (item.kind !== 'card') return { ...item, price, basePrice: item.price };
    const card = cards.CARDS[item.card];
    return { ...item, price, basePrice: item.price, label: card.label, description: card.description, rarity: card.rarity };
}

/** Ligas donde puede comprar cartas un usuario: con cartas, sin terminar y apuntado. */
async function cardLeaguesOf(userId) {
    const parts = await LeagueParticipation.findAll({ where: { user_id: userId }, attributes: ['league_id'] });
    const ids = [...new Set(parts.map(p => p.league_id))];
    if (!ids.length) return [];
    const leagues = await League.findAll({ where: { id: ids, cards_enabled: true }, attributes: ['id', 'name', 'status'] });
    return leagues.filter(l => l.status !== 'finished').sort((a, b) => b.id - a.id);
}

/**
 * La tienda de un usuario: catálogo, saldo, lo que ya tiene y dónde puede comprar cartas.
 */
async function shopFor(userId) {
    const [balance, owned, leagues] = await Promise.all([
        coins.balanceOf(userId),
        UserCosmetic.findAll({ where: { user_id: userId }, order: [['acquired_at', 'ASC']] }),
        cardLeaguesOf(userId),
    ]);
    const hands = await Promise.all(leagues.map(l => UserCard.count({ where: { user_id: userId, league_id: l.id, status: 'in_hand' } })));
    const now = new Date();
    const week = showcase(now);
    return {
        balance,
        cap: coins.COIN_CAP,
        slots: SLOTS,
        // Los de temporada que no están esta semana no se enseñan.
        items: ITEMS.filter(i => onSale(i, now)).map(i => itemInfo(i, now)),
        showcase: { week: week.week, daysLeft: week.daysLeft, items: week.items.map(s => ({ ...itemInfo(itemOf(s.id), now), deal: s.deal })) },
        matchCards: await matchOffers(userId, leagues, now),
        owned: owned.map(o => ({ item_id: o.item_id, equipped: o.equipped, acquired_at: o.acquired_at })),
        cardLeagues: leagues.map((l, i) => ({ id: l.id, name: l.name, inHand: hands[i] })),
    };
}

/**
 * Comprar un artículo.
 *
 * @param {Object} p
 * @param {number} p.userId
 * @param {string} p.itemId
 * @param {number} [p.leagueId] - Para las cartas: la liga donde va.
 * @returns {Promise<{item: Object, balance: number, card?: Object}>}
 */
async function buy({ userId, itemId, leagueId }) {
    const item = itemOf(itemId);
    if (!item) throw new ShopError(400, 'Ese artículo no está en la tienda');
    const now = new Date();
    if (!onSale(item, now)) throw new ShopError(409, 'Ese título solo se vende la semana que sale en el escaparate');
    const price = priceOf(item, now);

    return coins.withUserLock(userId, async (transaction) => {
        const balance = await coins.balanceOf(userId, transaction);
        if (balance < price) throw new ShopError(409, `No te llega: cuesta ${price} y tienes ${balance}`);

        let card = null;
        let note;
        if (item.kind === 'card') {
            const league = await League.findByPk(leagueId, { transaction });
            if (!league || !league.cards_enabled) throw new ShopError(400, 'Elige una liga que juegue cartas');
            if (league.status === 'finished') throw new ShopError(409, 'Esa liga ya ha terminado');
            const member = await LeagueParticipation.count({ where: { user_id: userId, league_id: league.id }, transaction });
            if (!member) throw new ShopError(403, 'No estás apuntado a esa liga');

            // La mano no tiene límite: la carta va siempre a la mano de esa liga.
            await cards.lockHand(userId, transaction);

            card = await UserCard.create({
                user_id: userId, league_id: league.id, card: item.card, source: 'shop', source_ref: null, status: 'in_hand',
            }, { transaction });
            note = `${cards.CARDS[item.card].label} · ${league.name}`;
        } else {
            const has = await UserCosmetic.findOne({ where: { user_id: userId, item_id: item.id }, transaction });
            if (has) throw new ShopError(409, 'Ya lo tienes');
            await UserCosmetic.create({ user_id: userId, item_id: item.id, source: 'shop' }, { transaction });
            note = `${SLOTS[item.kind]}: ${item.label}`;
        }

        if (price !== item.price) note += ' (rebajado)';
        await CoinTransaction.create({
            user_id: userId,
            amount: -price,
            reason: 'shop',
            ref_type: item.kind === 'card' ? 'card' : 'cosmetic',
            ref_id: item.kind === 'card' ? String(card.id) : item.id,
            league_id: item.kind === 'card' ? card.league_id : null,
            note,
        }, { transaction });

        return { item: itemInfo(item, now), balance: balance - price, card };
    });
}

// ── Carta del partido ──────────────────────────────────────────────────────────

/** Qué carta trae un partido: siempre la misma para el mismo partido. */
const matchCardOf = (matchId) => (seeded(`partido:${matchId}`)(2) === 0 ? 'gafe' : 'chivato');

const startedMatch = (m, resolved, now) => m.status !== 'scheduled' || new Date(m.date) <= now || resolved.has(m.id);

/** Las cartas del partido de hoy en las ligas de un usuario. */
async function matchOffers(userId, leagues, now = new Date()) {
    if (!leagues.length) return [];
    const today = madridDay(now);
    const matches = await Match.findAll({
        where: {
            league_id: leagues.map(l => l.id),
            round_id: { [Op.ne]: null },
            date: { [Op.between]: [new Date(now.getTime() - 36 * 3600000), new Date(now.getTime() + 36 * 3600000)] },
        },
        include: [{ model: Team, attributes: ['id', 'name', 'acronym', 'logo_url'], through: { attributes: [] } }],
        order: [['date', 'ASC']],
    });
    const resolved = new Set((await Result.findAll({ where: { match_id: matches.map(m => m.id) }, attributes: ['match_id'] })).map(r => r.match_id));
    const todays = matches.filter(m => madridDay(new Date(m.date)) === today && !startedMatch(m, resolved, now));
    if (!todays.length) return [];
    const bought = new Set((await UserCard.findAll({
        where: { user_id: userId, source: 'match', source_ref: todays.map(m => String(m.id)) }, attributes: ['source_ref'],
    })).map(c => Number(c.source_ref)));
    return todays.map(m => {
        const card = matchCardOf(m.id);
        const info = cards.CARDS[card];
        return {
            match: { id: m.id, date: m.date, format: m.format, round_id: m.round_id, Teams: m.Teams },
            league: leagues.find(l => l.id === m.league_id) ? { id: m.league_id, name: leagues.find(l => l.id === m.league_id).name } : null,
            card, label: info.label, rarity: info.rarity, description: info.description,
            price: MATCH_CARD_PRICE[card],
            basePrice: ITEMS.find(i => i.card === card)?.price ?? null,
            bought: bought.has(m.id),
        };
    });
}

/** Comprar la carta de un partido de hoy. */
async function buyMatchCard({ userId, matchId }) {
    const match = await Match.findByPk(matchId);
    if (!match || !match.round_id) throw new ShopError(400, 'Ese partido no tiene carta');
    const now = new Date();
    if (madridDay(new Date(match.date)) !== madridDay(now)) throw new ShopError(409, 'La carta del partido solo se vende el día del partido');
    const card = matchCardOf(match.id);
    const price = MATCH_CARD_PRICE[card];

    return coins.withUserLock(userId, async (transaction) => {
        const league = await League.findByPk(match.league_id, { transaction });
        if (!league || !league.cards_enabled || league.status === 'finished') throw new ShopError(409, 'En esa liga no se juegan cartas');
        const member = await LeagueParticipation.count({ where: { user_id: userId, league_id: league.id }, transaction });
        if (!member) throw new ShopError(403, 'No estás apuntado a esa liga');
        const resolved = new Set((await Result.findAll({ where: { match_id: match.id }, attributes: ['match_id'], transaction })).map(r => r.match_id));
        if (startedMatch(match, resolved, now)) throw new ShopError(409, 'Ese partido ya ha empezado');
        const balance = await coins.balanceOf(userId, transaction);
        if (balance < price) throw new ShopError(409, `No te llega: cuesta ${price} y tienes ${balance}`);

        await cards.lockHand(userId, transaction);
        const dup = await UserCard.findOne({ where: { user_id: userId, source: 'match', source_ref: String(match.id) }, transaction });
        if (dup) throw new ShopError(409, 'Ya tienes la carta de este partido');
        const row = await UserCard.create({
            user_id: userId, league_id: league.id, card, source: 'match', source_ref: String(match.id), status: 'in_hand',
        }, { transaction });
        await CoinTransaction.create({
            user_id: userId, amount: -price, reason: 'shop', ref_type: 'card', ref_id: String(row.id), league_id: league.id,
            note: `${cards.CARDS[card].label} del partido · ${league.name}`,
        }, { transaction });
        return { card: row, balance: balance - price };
    });
}

/**
 * Ponerse un cosmético (y quitarse el que hubiera del mismo tipo) o, con `itemId`
 * vacío, quitarse el de ese tipo.
 *
 * @param {Object} p
 * @param {number} p.userId
 * @param {string} [p.itemId]
 * @param {string} [p.slot] - Para quitar: 'frame', 'color' o 'title'.
 */
async function equip({ userId, itemId, slot }) {
    const item = itemId ? itemOf(itemId) : null;
    if (itemId && (!item || item.kind === 'card')) throw new ShopError(400, 'Eso no es un cosmético');
    const kind = item ? item.kind : slot;
    if (!SLOTS[kind]) throw new ShopError(400, 'Tipo de cosmético no válido');
    const sameKind = ITEMS.filter(i => i.kind === kind).map(i => i.id);

    // Con el candado del usuario: dos «ponerse» a la vez no pueden dejar dos puestos.
    return coins.withUserLock(userId, async (transaction) => {
        if (item) {
            const mine = await UserCosmetic.findOne({ where: { user_id: userId, item_id: item.id }, transaction });
            if (!mine) throw new ShopError(404, 'No lo tienes');
        }
        await UserCosmetic.update({ equipped: false }, { where: { user_id: userId, item_id: sameKind, equipped: true }, transaction });
        if (item) await UserCosmetic.update({ equipped: true }, { where: { user_id: userId, item_id: item.id }, transaction });
    });
}

/**
 * Lo que lleva puesto cada jugador, para pintarlo en cualquier sitio de la web:
 * `{ [userId]: { frame, color, title } }`. Son pocos jugadores, así que va entero.
 */
async function equippedMap() {
    const rows = await UserCosmetic.findAll({ where: { equipped: true }, attributes: ['user_id', 'item_id'] });
    const map = {};
    for (const r of rows) {
        const item = itemOf(r.item_id);
        if (!item) continue;
        if (!map[r.user_id]) map[r.user_id] = {};
        map[r.user_id][item.kind] = item.kind === 'title' ? { id: item.id, label: item.label } : item.id;
    }
    return map;
}

/** Dar un cosmético a mano (admin). Si ya lo tiene, no hace nada. */
async function grantCosmetic({ userId, itemId }) {
    const item = itemOf(itemId);
    if (!item || item.kind === 'card') throw new ShopError(400, 'Eso no es un cosmético');
    const [row, created] = await UserCosmetic.findOrCreate({ where: { user_id: userId, item_id: item.id }, defaults: { source: 'admin' } });
    return { row, created };
}

module.exports = {
    ShopError,
    showcase,
    weekOf,
    priceOf,
    matchCardOf,
    MATCH_CARD_PRICE,
    buyMatchCard,
    SLOTS,
    ITEMS,
    itemOf,
    shopFor,
    buy,
    equip,
    equippedMap,
    grantCosmetic,
};
