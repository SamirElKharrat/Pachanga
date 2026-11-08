const Round = require('../models/round');
const League = require('../models/league');
const Match = require('../models/match');
const Question = require('../models/question');
const { STAGE_KEYS, describeRounds } = require('../utils/rounds');

/**
 * Las jornadas de cada liga. Ver models/round.js y utils/rounds.js.
 *
 * Dos reglas que protegen lo ya jugado:
 *
 *  - Una jornada con partidos o preguntas no cambia de `order`. Ese número es la
 *    clave de sus estadísticas y de la clasificación por jornada; cambiarlo dejaría
 *    esas filas apuntando a otra jornada.
 *  - Una jornada con partidos o preguntas no se borra. Primero hay que moverlos.
 */

/** Cuántos partidos y preguntas tiene una jornada. */
const contentOf = async (roundId) => {
    const [matches, questions] = await Promise.all([
        Match.count({ where: { round_id: roundId } }),
        Question.count({ where: { round_id: roundId } }),
    ]);
    return { matches, questions, total: matches + questions };
};

const STATUS_LABEL = { scheduled: 'Programada', live: 'En juego', settled: 'Resuelta' };

/**
 * Todas, para el panel de administración: cada jornada con su nombre (el escrito o
 * el generado), su estado y sus recuentos. El panel pinta una columna por campo, de
 * ahí los nombres en castellano de los calculados.
 */
exports.getAllRounds = async (req, res) => {
    try {
        const rounds = await Round.findAll({
            include: [{ model: League, as: 'League', attributes: ['id', 'name'] }],
            order: [['league_id', 'DESC'], ['order', 'ASC']],
        });

        const described = {};
        for (const leagueId of [...new Set(rounds.map(r => r.league_id))]) {
            (await describeRounds(leagueId)).forEach(d => { described[d.id] = d; });
        }

        res.json(rounds.map(r => {
            const d = described[r.id] || {};
            return {
                id: r.id,
                league_id: r.league_id,
                League: r.League,
                order: r.order,
                stage: r.stage,
                name: r.name,
                jornada: d.label,
                estado: STATUS_LABEL[d.status] || d.status,
                partidos: d.matches ?? 0,
                preguntas: d.questions ?? 0,
            };
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRoundById = async (req, res) => {
    try {
        const round = await Round.findByPk(req.params.id);
        if (!round) return res.status(404).json({ error: 'Jornada no encontrada' });
        res.json(round);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Las jornadas de una liga con su nombre, fase, estado y recuentos. Es lo que
 * leen los selectores de Fase y Jornada.
 *
 * GET /rounds/league/:league_id
 */
exports.getRoundsByLeague = async (req, res) => {
    try {
        res.json(await describeRounds(parseInt(req.params.league_id, 10)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Crear una jornada. Sin `order`, va detrás de la última de la liga.
 */
exports.createRound = async (req, res) => {
    try {
        const { league_id, stage = 'regular', name } = req.body;
        if (!league_id) return res.status(400).json({ error: 'Falta la liga' });
        if (!STAGE_KEYS.includes(stage)) return res.status(400).json({ error: `Fase desconocida: "${stage}"` });

        let order = req.body.order === undefined || req.body.order === null || req.body.order === ''
            ? null
            : parseInt(req.body.order, 10);
        if (order === null) {
            const last = await Round.max('order', { where: { league_id } });
            order = (Number.isFinite(last) ? last : 0) + 1;
        }

        const round = await Round.create({ league_id, order, stage, name: name || null });
        res.status(201).json(round);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Esa liga ya tiene una jornada con ese orden' });
        }
        res.status(400).json({ error: error.message });
    }
};

exports.updateRound = async (req, res) => {
    try {
        const round = await Round.findByPk(req.params.id);
        if (!round) return res.status(404).json({ error: 'Jornada no encontrada' });

        const payload = {};
        if (req.body.stage !== undefined) {
            if (!STAGE_KEYS.includes(req.body.stage)) return res.status(400).json({ error: `Fase desconocida: "${req.body.stage}"` });
            payload.stage = req.body.stage;
        }
        if (req.body.name !== undefined) payload.name = req.body.name || null;

        const newOrder = req.body.order === undefined || req.body.order === '' ? undefined : parseInt(req.body.order, 10);
        const newLeague = req.body.league_id === undefined ? undefined : parseInt(req.body.league_id, 10);
        const moves = (newOrder !== undefined && newOrder !== round.order)
            || (newLeague !== undefined && newLeague !== round.league_id);
        if (moves) {
            const content = await contentOf(round.id);
            if (content.total > 0) {
                return res.status(409).json({
                    error: 'Esta jornada ya tiene partidos o preguntas: su orden y su liga no se pueden cambiar'
                });
            }
            if (newOrder !== undefined) payload.order = newOrder;
            if (newLeague !== undefined) payload.league_id = newLeague;
        }

        res.json(await round.update(payload));
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Esa liga ya tiene una jornada con ese orden' });
        }
        res.status(400).json({ error: error.message });
    }
};

exports.deleteRound = async (req, res) => {
    try {
        const round = await Round.findByPk(req.params.id);
        if (!round) return res.status(404).json({ error: 'Jornada no encontrada' });

        const content = await contentOf(round.id);
        if (content.total > 0) {
            return res.status(409).json({
                error: `La jornada tiene ${content.matches} partidos y ${content.questions} preguntas: muévelos antes de borrarla`
            });
        }
        await round.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
