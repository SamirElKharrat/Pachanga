const User = require('../models/user');
const coins = require('../utils/coins');
const { REWARDS } = require('../utils/coinRewards');

/** Cómo se ganan, para el perfil. Sale de REWARDS: la web no repite los números. */
const HOW_TO_EARN = Object.entries(REWARDS).map(([reason, amount]) => ({ reason, label: coins.REASONS[reason], amount }));

/** El usuario de la sesión. */
const currentUser = (req) => User.findOne({ where: { email: req.user.email }, attributes: ['id', 'username'] });

/**
 * Mi saldo y mis últimos movimientos.
 *
 * GET /coins/me → { userId, balance, cap, movements: [{ id, amount, label, note, created_at, … }] }
 *
 * `userId` va para que el navegador recuerde, por persona, hasta qué movimiento ya ha
 * avisado («+3 por enviar la jornada»).
 */
exports.getMine = async (req, res) => {
    try {
        const user = await currentUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ userId: user.id, ...(await coins.walletOf(user.id)), howToEarn: HOW_TO_EARN });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * El saldo y los movimientos de cualquiera. Solo admin.
 *
 * GET /coins/user/:id
 */
exports.getUserWallet = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, { attributes: ['id', 'username'] });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ user, ...(await coins.walletOf(user.id, 200)) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Dar o quitar pachanguitas a mano. Solo admin, y siempre con motivo: queda en el
 * historial del jugador.
 *
 * POST /coins/grant { user_id, amount, note } → el movimiento, con lo que se movió de
 * verdad (el techo y el 0 pueden recortarlo).
 */
exports.grant = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
        if (!Number.isInteger(amount) || amount === 0) {
            return res.status(400).json({ error: 'La cantidad tiene que ser un número entero distinto de 0' });
        }
        if (Math.abs(amount) > coins.COIN_CAP) {
            return res.status(400).json({ error: `Como mucho ${coins.COIN_CAP} pachanguitas de una vez` });
        }
        if (!note) return res.status(400).json({ error: 'Escribe el motivo: lo verá el jugador en su historial' });
        if (note.length > 120) return res.status(400).json({ error: 'El motivo tiene un máximo de 120 caracteres' });

        const target = await User.findByPk(req.body.user_id, { attributes: ['id'] });
        if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

        const movement = await coins.adminAdjust({ userId: target.id, amount, note, adminId: req.fullUser.id });
        res.status(201).json({
            movement,
            requested: amount,
            applied: movement.amount,
            balance: await coins.balanceOf(target.id),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
