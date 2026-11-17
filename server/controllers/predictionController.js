const { Op } = require('sequelize');
const sequelize = require('../config/configdb');
const Prediction = require('../models/prediction');
const User = require('../models/user');
const Role = require('../models/role');
const Match = require('../models/match');
const League = require('../models/league');
const Team = require('../models/team');
const Result = require('../models/result');
const LeagueParticipation = require('../models/leagueParticipation');
const statsAggregator = require('../utils/statsAggregator');
const { safely, onPredictionSaved } = require('../utils/coinRewards');

/**
 * Predicciones.
 *
 * Reglas de lo que se escribe:
 *
 *   - Una predicción es SIEMPRE de quien tiene la sesión. El `user_id` que llegue
 *     en el cuerpo se ignora, salvo para un admin, que puede meterla a nombre de otro
 *     (alguien que mandó su voto por el grupo).
 *   - Los puntos los calcula el agregador. Nunca se aceptan del cuerpo: antes bastaba
 *     con mandar `points: 100`.
 *   - Un partido con resultado ya no se vota: sería votar sabiendo quién ha ganado.
 *     Las jornadas siguen sin cierre: hasta el resultado, se vota siempre.
 *   - Una por persona y partido. Hay duplicados antiguos en la base y por eso no hay
 *     índice único; lo garantiza el candado de abajo.
 *   - Editar y borrar es cosa del admin, y si el partido ya tiene resultado, la
 *     clasificación se recalcula sola.
 *
 * Reglas de lo que se lee:
 *
 *   - Nunca se devuelve el email ni la contraseña de nadie: antes iban enteros.
 *   - Los votos de otros en un partido solo se ven si ya votaste ese partido, si ha
 *     empezado o tiene resultado, o si eres admin. Antes lo escondía solo el
 *     navegador, y la API se los daba a cualquiera.
 */

// Lo único que se enseña de otro usuario.
const PUBLIC_USER = ['id', 'username', 'logo_url'];

// Los marcadores que valen en cada formato.
const SCORES = Object.freeze({ BO1: ['1-0'], BO3: ['2-0', '2-1'], BO5: ['3-0', '3-1', '3-2'] });

// Espacio de nombres del candado (el de las monedas es 7031).
const LOCK_NS = 7032;

/** Quién tiene la sesión y si es admin. */
async function sessionUser(req) {
    const user = await User.findOne({
        where: { email: req.user.email },
        attributes: ['id', 'username'],
        include: [{ model: Role, through: 'UserRoles', attributes: ['name'] }],
    });
    if (!user) return { user: null, isAdmin: false };
    return { user, isAdmin: Boolean(user.Roles && user.Roles.some(r => r.name === 'admin')) };
}

const publicUsers = async (ids) => {
    const users = await User.findAll({ where: { id: [...new Set(ids)] }, attributes: PUBLIC_USER });
    return Object.fromEntries(users.map(u => [u.id, u]));
};

/** Un partido con sus equipos y su resultado, o null. */
async function matchWithTeams(matchId) {
    const match = await Match.findByPk(matchId, {
        include: [{ model: Team, attributes: ['id'], through: { attributes: [] } }],
    });
    if (!match) return null;
    const result = await Result.findOne({ where: { match_id: match.id }, attributes: ['id'] });
    return { match, teamIds: (match.Teams || []).map(t => t.id), resolved: Boolean(result) };
}

/**
 * Comprueba ganador, marcador y tipo contra el partido. Devuelve el error, o null y
 * deja en `out` lo que se guarda.
 */
function validatePick(body, { match, teamIds }, isAdmin, out) {
    const winner = Number(body.winner);
    if (!teamIds.includes(winner)) return 'El ganador tiene que ser uno de los dos equipos del partido';
    const allowed = SCORES[match.format] || [];
    const description = match.format === 'BO1' ? '1-0' : body.description;
    if (!allowed.includes(description)) {
        return `Resultado no válido para un ${match.format}: tiene que ser ${allowed.join(', ')}`;
    }
    // El tipo «question» es de las predicciones antiguas; solo el admin lo puede poner.
    const type = isAdmin && body.type === 'question' ? 'question' : 'score';
    Object.assign(out, { winner, description, type });
    return null;
}

/** Si el partido ya tiene resultado, la clasificación sigue al cambio. */
async function reapplyIfResolved(matchId, resolved) {
    if (resolved) await statsAggregator.applyForMatch(matchId);
}

// ── Lectura ─────────────────────────────────────────────────────────────────────

// Todas las predicciones. Solo admin (lo usa el panel).
exports.getAllPredictions = async (req, res) => {
    try {
        const predictions = await Prediction.findAll({
            include: [
                {
                    model: Match,
                    as: 'Match',
                    include: [{ model: Team, as: 'Teams', through: { attributes: [] } }]
                },
                {
                    model: Team,
                    as: 'Winner',
                    foreignKey: 'winner'
                }
            ]
        });
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Las predicciones de una liga, con su usuario (sin datos privados). Solo admin.
//
// Antes buscaba por un `league_id` que la tabla no tiene, y fallaba siempre.
exports.getPredictionsByLeague = async (req, res) => {
    try {
        const matches = await Match.findAll({ where: { league_id: req.params.league_id }, attributes: ['id'] });
        const predictions = await Prediction.findAll({ where: { match_id: matches.map(m => m.id) } });
        const users = await publicUsers(predictions.map(p => p.user_id));
        res.json(predictions.map(p => ({ ...p.dataValues, User: users[p.user_id] || null })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Una predicción. La tuya, o cualquiera si eres admin.
exports.getPredictionById = async (req, res) => {
    try {
        const prediction = await Prediction.findByPk(req.params.id);
        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        const { user, isAdmin } = await sessionUser(req);
        if (!isAdmin && (!user || prediction.user_id !== user.id)) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Las predicciones de un partido, con su usuario (sin datos privados).
 *
 * Las de los demás solo si ya votaste este partido, si ha empezado o tiene
 * resultado, o si eres admin. Si no, solo la tuya: Inicio la necesita para saber si
 * ya has votado.
 */
exports.getPredictionsByMatch = async (req, res) => {
    const { match_id } = req.params;
    try {
        const { user, isAdmin } = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const predictions = await Prediction.findAll({ where: { match_id } });
        let visible = predictions;
        if (!isAdmin && !predictions.some(p => p.user_id === user.id)) {
            const match = await Match.findByPk(match_id, { attributes: ['id', 'date'] });
            const started = match && new Date(match.date) <= new Date();
            const resolved = started || (match && await Result.count({ where: { match_id: match.id } }) > 0);
            if (!resolved) visible = predictions.filter(p => p.user_id === user.id);
        }

        const users = await publicUsers(visible.map(p => p.user_id));
        res.json(visible.map(p => ({ ...p.dataValues, User: users[p.user_id] || null })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Mis predicciones.
exports.getPredictionsByUserId = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { email: req.user.email },
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const predictions = await Prediction.findAll({
            where: { user_id: user.id }
        });
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Escritura ───────────────────────────────────────────────────────────────────

/**
 * Votar un partido.
 *
 * POST /predictions/set { match_id, winner, description, [type], [user_id: solo admin] }
 */
exports.createPrediction = async (req, res) => {
    try {
        const { user, isAdmin } = await sessionUser(req);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userId = isAdmin && req.body.user_id ? Number(req.body.user_id) : user.id;
        if (isAdmin && userId !== user.id && !(await User.findByPk(userId, { attributes: ['id'] }))) {
            return res.status(404).json({ error: 'Ese usuario no existe' });
        }

        const found = await matchWithTeams(req.body.match_id);
        if (!found) return res.status(404).json({ error: 'El partido no existe' });
        if (found.resolved && !isAdmin) {
            return res.status(409).json({ error: 'Este partido ya tiene resultado: no se puede votar' });
        }

        const pick = {};
        const invalid = validatePick(req.body, found, isAdmin, pick);
        if (invalid) return res.status(400).json({ error: invalid });

        const joined = await LeagueParticipation.count({ where: { user_id: userId, league_id: found.match.league_id } });
        if (!joined) return res.status(403).json({ error: 'No estás apuntado a la liga de este partido' });

        // Comprobar y crear con el candado del usuario: dos envíos a la vez del mismo
        // partido no pueden colarse los dos.
        const prediction = await sequelize.transaction(async (transaction) => {
            await sequelize.query('SELECT pg_advisory_xact_lock(:ns, :uid)', { replacements: { ns: LOCK_NS, uid: userId }, transaction });
            const existing = await Prediction.findOne({ where: { user_id: userId, match_id: found.match.id }, transaction });
            if (existing) return null;
            return Prediction.create({ ...pick, user_id: userId, match_id: found.match.id, points: 0 }, { transaction });
        });
        if (!prediction) return res.status(409).json({ error: 'Ya has votado este partido' });

        // Un admin metiendo un voto en un partido ya resuelto: que puntúe ya.
        await reapplyIfResolved(found.match.id, found.resolved);
        // Si con esta la jornada queda completa, se pagan sus monedas (y la racha).
        // Nunca tumba la predicción: ver utils/coinRewards.js.
        await safely('jornada completa', () => onPredictionSaved(prediction.user_id, prediction.match_id));
        res.status(201).json(prediction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Corregir una predicción. Solo admin (la ruta lo exige). Solo cambia ganador,
 * marcador y tipo: ni de quién es, ni de qué partido, ni sus puntos.
 */
exports.updatePrediction = async (req, res) => {
    try {
        const prediction = await Prediction.findByPk(req.params.id);
        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        const found = await matchWithTeams(prediction.match_id);
        if (!found) return res.status(404).json({ error: 'El partido no existe' });

        const pick = {};
        const invalid = validatePick({
            winner: req.body.winner ?? prediction.winner,
            description: req.body.description ?? prediction.description,
            type: req.body.type ?? prediction.type,
        }, found, true, pick);
        if (invalid) return res.status(400).json({ error: invalid });

        const updatedPrediction = await prediction.update(pick);
        await reapplyIfResolved(prediction.match_id, found.resolved);
        res.json(updatedPrediction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Borrar una predicción. Solo admin (la ruta lo exige).
 *
 * Si ya había puntuado, sus puntos salen de la clasificación en la misma
 * transacción. Hace falta hacerlo a mano: el agregador trabaja por diferencia sobre
 * las predicciones que existen, y una borrada ya no está para restarse. Después se
 * vuelve a puntuar la jornada, porque quitar un voto puede romper un pleno.
 */
exports.deletePrediction = async (req, res) => {
    try {
        const prediction = await Prediction.findByPk(req.params.id);
        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        const match = await Match.findByPk(prediction.match_id);
        const resolved = await Result.count({ where: { match_id: prediction.match_id } }) > 0;

        await sequelize.transaction(async (transaction) => {
            if (prediction.points && match) {
                const league = await League.findByPk(match.league_id);
                const week = await statsAggregator.roundOrderOf(match, league);
                const where = { league_id: match.league_id, user_id: prediction.user_id };
                await LeagueParticipation.increment({ points: -prediction.points }, { where: { ...where, week: { [Op.gte]: week } }, transaction });
                await LeagueParticipation.increment({ points: -prediction.points }, { where: { ...where, week: -1 }, transaction });
            }
            await prediction.destroy({ transaction });
        });

        await reapplyIfResolved(prediction.match_id, resolved);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
