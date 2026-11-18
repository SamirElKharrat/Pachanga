const CoinTransaction = require('../models/coinTransaction');
const UserCosmetic = require('../models/userCosmetic');
const UserCard = require('../models/userCard');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const coins = require('./coins');
const cards = require('./cards');

/**
 * La tienda (fase 3 de cartas y cofres): un catálogo fijo de cartas y cosméticos que
 * se compran con monedas. La rotación semanal y las rebajas llegan en la fase 6.
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

/** Un artículo listo para enseñar: las cartas, con su nombre y texto del catálogo de cartas. */
function itemInfo(item) {
    if (item.kind !== 'card') return { ...item };
    const card = cards.CARDS[item.card];
    return { ...item, label: card.label, description: card.description, rarity: card.rarity };
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
    return {
        balance,
        cap: coins.COIN_CAP,
        slots: SLOTS,
        items: ITEMS.map(itemInfo),
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

    return coins.withUserLock(userId, async (transaction) => {
        const balance = await coins.balanceOf(userId, transaction);
        if (balance < item.price) throw new ShopError(409, `No te llega: cuesta ${item.price} y tienes ${balance}`);

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

        await CoinTransaction.create({
            user_id: userId,
            amount: -item.price,
            reason: 'shop',
            ref_type: item.kind === 'card' ? 'card' : 'cosmetic',
            ref_id: item.kind === 'card' ? String(card.id) : item.id,
            league_id: item.kind === 'card' ? card.league_id : null,
            note,
        }, { transaction });

        return { item: itemInfo(item), balance: balance - item.price, card };
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
    SLOTS,
    ITEMS,
    itemOf,
    shopFor,
    buy,
    equip,
    equippedMap,
    grantCosmetic,
};
