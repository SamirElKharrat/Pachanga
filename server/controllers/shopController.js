const User = require('../models/user');
const shop = require('../utils/shop');

/** Quién tiene la sesión. */
const sessionUser = (req) => User.findOne({ where: { email: req.user.email }, attributes: ['id'] });

/** Responde un error de la tienda con su código, y cualquier otro como 500. */
const fail = (res, error) => res.status(error instanceof shop.ShopError ? error.status : 500).json({ error: error.message });

/**
 * La tienda: catálogo, mi saldo, lo que tengo y dónde puedo comprar cartas.
 *
 * GET /shop
 */
exports.getShop = async (req, res) => {
    try {
        const user = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(await shop.shopFor(user.id));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Comprar. Body: { item_id, league_id? } (la liga, solo para las cartas).
 *
 * POST /shop/buy
 */
exports.buy = async (req, res) => {
    try {
        const user = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { item_id: itemId, league_id: leagueId } = req.body || {};
        const out = await shop.buy({ userId: user.id, itemId, leagueId: leagueId == null ? null : Number(leagueId) });
        res.status(201).json(out);
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Ponerse un cosmético ({ item_id }) o quitarse el de un tipo ({ slot }).
 *
 * POST /shop/equip
 */
exports.equip = async (req, res) => {
    try {
        const user = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { item_id: itemId, slot } = req.body || {};
        await shop.equip({ userId: user.id, itemId: itemId || null, slot });
        res.json({ ok: true });
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Lo que lleva puesto cada jugador: { [userId]: { frame, color, title } }.
 *
 * GET /shop/equipped
 */
exports.getEquipped = async (req, res) => {
    try {
        res.json(await shop.equippedMap());
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Dar un cosmético a mano (admin). Body: { user_id, item_id }.
 *
 * POST /shop/grant
 */
exports.grant = async (req, res) => {
    try {
        const userId = Number(req.body?.user_id);
        if (!userId || !(await User.count({ where: { id: userId } }))) return res.status(400).json({ error: 'Usuario no válido' });
        const { created } = await shop.grantCosmetic({ userId, itemId: req.body?.item_id });
        res.status(created ? 201 : 200).json({ created });
    } catch (error) {
        fail(res, error);
    }
};
