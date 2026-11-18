const User = require('../models/user');
const Role = require('../models/role');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const cards = require('../utils/cards');

/** Quién tiene la sesión y si es admin. */
async function sessionUser(req) {
    const user = await User.findOne({
        where: { email: req.user.email },
        attributes: ['id'],
        include: [{ model: Role, through: 'UserRoles', attributes: ['name'] }],
    });
    return { user, isAdmin: Boolean(user && user.Roles && user.Roles.some(r => r.name === 'admin')) };
}

/** Responde un error de las cartas con su código, y cualquier otro como 500. */
const fail = (res, error) => res.status(error instanceof cards.CardError ? error.status : 500).json({ error: error.message });

/**
 * Mi mano en una liga, mis jugadas y el catálogo.
 *
 * GET /cards/hand/:leagueId
 */
exports.getHand = async (req, res) => {
    try {
        const { user } = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const leagueId = Number(req.params.leagueId);
        const member = await LeagueParticipation.count({ where: { user_id: user.id, league_id: leagueId } });
        if (!member) return res.status(403).json({ error: 'No estás apuntado a esta liga' });
        res.json(await cards.handOf(user.id, leagueId));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Jugar una carta de la mano.
 *
 * POST /cards/play { user_card_id, match_id?, round_id?, target_user_id? }
 * → { play, share? } (share solo con el Chivato: el reparto de votos del partido)
 */
exports.play = async (req, res) => {
    try {
        const { user } = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const out = await cards.playCard({
            userId: user.id,
            userCardId: Number(req.body.user_card_id),
            matchId: req.body.match_id ? Number(req.body.match_id) : null,
            roundId: req.body.round_id ? Number(req.body.round_id) : null,
            targetUserId: req.body.target_user_id ? Number(req.body.target_user_id) : null,
        });
        res.status(201).json(out);
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Las cartas jugadas en una jornada que puede ver quien pregunta.
 *
 * GET /cards/round/:roundId
 */
exports.getRound = async (req, res) => {
    try {
        const { user, isAdmin } = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(await cards.roundPlaysFor({ viewerId: user.id, isAdmin, roundId: Number(req.params.roundId) }));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * El catálogo de cartas, tal como lo define el servidor.
 *
 * GET /cards/catalog → [{ key, label, description, limited, aim, rarity }]
 */
exports.getCatalog = (req, res) => {
    res.json(Object.keys(cards.CARDS).map(key => ({ key, ...cards.CARDS[key] })));
};

// ── Admin ───────────────────────────────────────────────────────────────────────

/**
 * Dar una carta a mano. Respeta la mano de 3: si no cabe, se paga en monedas, como
 * cualquier otra.
 *
 * POST /cards/grant { user_id, league_id, card }
 */
exports.grant = async (req, res) => {
    try {
        const leagueId = Number(req.body.league_id);
        const userId = Number(req.body.user_id);
        if (!cards.CARDS[req.body.card]) return res.status(400).json({ error: 'Carta desconocida' });
        const league = await League.findByPk(leagueId, { attributes: ['id', 'status'] });
        if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
        if (league.status === 'finished') return res.status(409).json({ error: 'La liga ha terminado' });
        const member = await LeagueParticipation.count({ where: { user_id: userId, league_id: leagueId } });
        if (!member) return res.status(400).json({ error: 'Ese jugador no está en la liga' });
        const out = await cards.giveCard({ userId, leagueId, card: req.body.card, source: 'admin' });
        res.status(201).json({ card: out.card });
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Todas las jugadas de una liga, con lo que vale cada una.
 *
 * GET /cards/league/:leagueId
 */
exports.getLeague = async (req, res) => {
    try {
        res.json(await cards.leaguePlays(Number(req.params.leagueId)));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Anular una jugada: deja de contar y su jornada se vuelve a puntuar.
 *
 * POST /cards/annul/:id
 */
exports.annul = async (req, res) => {
    try {
        res.json(await cards.annulPlay(Number(req.params.id)));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Los avisos de Gafe que me quedan por ver (para el aviso a pantalla completa).
 *
 * GET /cards/notices
 */
exports.getNotices = async (req, res) => {
    try {
        const { user } = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(await cards.gafeNotices(user.id));
    } catch (error) {
        fail(res, error);
    }
};

/**
 * Marcar un aviso de Gafe como visto. Body: { state: 'pending' | 'resolved' }.
 *
 * POST /cards/notices/:id/seen
 */
exports.markNoticeSeen = async (req, res) => {
    try {
        const { user } = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await cards.markNoticeSeen({ userId: user.id, playId: Number(req.params.id), state: req.body?.state });
        res.json({ ok: true });
    } catch (error) {
        fail(res, error);
    }
};
