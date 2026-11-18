const User = require('../models/user');
const chests = require('../utils/chests');

/** Quién tiene la sesión. */
const sessionUser = (req) => User.findOne({ where: { email: req.user.email }, attributes: ['id'] });

/** Responde un error de los cofres con su código, y cualquier otro como 500. */
const fail = (res, error) => res.status(error instanceof chests.ChestError ? error.status : 500).json({ error: error.message });

/**
 * Mis cofres: uno por liga en juego con cartas, con la tabla de premios, la garantía,
 * cuántos llevo hoy y mis últimas aperturas.
 *
 * GET /chests
 */
exports.getChests = async (req, res) => {
    try {
        const user = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(await chests.chestsFor(user.id));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Abrir el cofre de una liga. Body: { league_id }.
 *
 * POST /chests/open
 */
exports.open = async (req, res) => {
    try {
        const user = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const leagueId = Number(req.body?.league_id);
        if (!leagueId) return res.status(400).json({ error: 'Elige el cofre de una liga' });
        res.status(201).json(await chests.openChest({ userId: user.id, leagueId }));
    } catch (error) {
        fail(res, error);
    }
};
