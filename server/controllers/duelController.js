const User = require('../models/user');
const LeagueParticipation = require('../models/leagueParticipation');
const duels = require('../utils/duels');

/** Quién tiene la sesión. */
const sessionUser = (req) => User.findOne({ where: { email: req.user.email }, attributes: ['id'] });

/** Responde un error de los duelos con su código, y cualquier otro como 500. */
const fail = (res, error) => res.status(error instanceof duels.DuelError ? error.status : 500).json({ error: error.message });

/** Envuelve una acción que necesita al usuario de la sesión. */
const withUser = (fn) => async (req, res) => {
    try {
        const user = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await fn(user, req, res);
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Mis duelos en una liga: el de la jornada (?round=ID), los que me esperan y el
 * historial.
 *
 * GET /duels/league/:leagueId
 */
exports.getLeague = withUser(async (user, req, res) => {
    const leagueId = Number(req.params.leagueId);
    const member = await LeagueParticipation.count({ where: { user_id: user.id, league_id: leagueId } });
    if (!member) return res.status(403).json({ error: 'No estás apuntado a esta liga' });
    res.json(await duels.duelsFor({ userId: user.id, leagueId, roundId: req.query.round ? Number(req.query.round) : null }));
});

/**
 * Retar. Body: { league_id, round_id, rival_id, stake_kind, stake }.
 *
 * POST /duels
 */
exports.challenge = withUser(async (user, req, res) => {
    const b = req.body || {};
    const duel = await duels.challenge({
        userId: user.id, leagueId: Number(b.league_id), roundId: Number(b.round_id), rivalId: Number(b.rival_id),
        stakeKind: b.stake_kind, stake: Number(b.stake),
    });
    res.status(201).json({ id: duel.id, status: duel.status });
});

/**
 * Contestar un reto. Body: { accept: boolean }.
 *
 * POST /duels/:id/respond
 */
exports.respond = withUser(async (user, req, res) => {
    const duel = await duels.respond({ userId: user.id, duelId: Number(req.params.id), accept: Boolean(req.body?.accept) });
    res.json({ id: duel.id, status: duel.status });
});

/**
 * Retirar un reto que aún no han contestado.
 *
 * DELETE /duels/:id
 */
exports.cancel = withUser(async (user, req, res) => {
    const duel = await duels.cancel({ userId: user.id, duelId: Number(req.params.id) });
    res.json({ id: duel.id, status: duel.status });
});

/**
 * Lo que salta a pantalla completa: retos por contestar y retos aceptados.
 *
 * GET /duels/notices
 */
exports.getNotices = withUser(async (user, req, res) => {
    res.json(await duels.noticesFor(user.id));
});

/**
 * El retador ha visto que le aceptaron.
 *
 * POST /duels/:id/seen
 */
exports.markSeen = withUser(async (user, req, res) => {
    await duels.markSeen({ userId: user.id, duelId: Number(req.params.id) });
    res.json({ ok: true });
});

/**
 * Todos los duelos de una liga (admin).
 *
 * GET /duels/admin/:leagueId
 */
exports.getLeagueAdmin = async (req, res) => {
    try {
        res.json(await duels.leagueDuels(Number(req.params.leagueId)));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Anular un duelo (admin).
 *
 * POST /duels/:id/annul
 */
exports.annul = async (req, res) => {
    try {
        const duel = await duels.annul(Number(req.params.id));
        res.json({ id: duel.id, status: duel.status });
    } catch (error) {
        fail(res, error);
    }
};
