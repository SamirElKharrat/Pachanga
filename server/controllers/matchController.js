const { Op } = require('sequelize');
const Match = require('../models/match');
const Team = require('../models/team');
const Prediction = require('../models/prediction');
const Result = require('../models/result');
const { startOfWeek, endOfWeek } = require('./weekController');
const { advanceLifecycles } = require('../utils/lifecycle');
const Round = require('../models/round');
const { roundForMatchDate } = require('../utils/rounds');


// Get all matches
exports.getAllMatches = async (req, res) => {
    try {
        const matches = await Match.findAll({
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url'],
                through: { attributes: [] }
            }]
        });
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get all teams from a match
exports.getTeamsFromMatch = async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id, {
            include: [{
                model: Team,
                attributes: [['id', 'value'], ['name', 'label']],
                through: { attributes: [] }
            }]
        });
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get all matches of the current week
// Modificar la función getCurrentWeekMatches en matchController.js
exports.getCurrentWeekMatches = async (req, res) => {
    try {
        // Antes de leer, que los estados estén al día: con resultado → finished,
        // empezado → live. Ver utils/lifecycle.js.
        await advanceLifecycles();

        const currentStartOfWeek = startOfWeek();

        console.log("Buscando partidos desde el inicio de la semana actual:", currentStartOfWeek);

        const matches = await Match.findAll({
            where: {
                [Op.or]: [
                    {
                        status: 'live'
                    },
                    {
                        date: {
                            [Op.gte]: currentStartOfWeek
                        },
                        status: {
                            [Op.ne]: 'finished'
                        }
                    }
                ]
            },
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url', 'acronym'],
                through: { attributes: [] }
            }],
            order: [['date', 'ASC']], // Ordenar por fecha ascendente
            limit: 30
        });

        console.log("Partidos encontrados:", matches.length);
        res.json(matches);
    } catch (error) {
        console.error('Error getting current week matches:', error);
        res.status(500).json({ error: 'Error fetching matches. Please try again later.' });
    }
};

// Get all matches of the current week for a league
exports.getCurrentWeekMatchesByLeague = async (req, res) => {
    const league_id = req.params.league_id
    try {
        const currentStartOfWeek = startOfWeek();
        const currentEndOfWeek = endOfWeek();

        const matches = await Match.findAll({
            where: {
                date: {
                    [Op.gte]: currentStartOfWeek.toISOString(),
                    [Op.lte]: currentEndOfWeek.toISOString()
                },
                league_id: league_id
            },
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url', 'acronym'],
                through: { attributes: [] }
            }]
        });

        res.json(matches);
    } catch (error) {
        console.error('Error getting current week matches:', error);
        res.status(500).json({ error: 'Error fetching matches. Please try again later.' });
    }
};

//Get all matches of a week
exports.getCurrentWeekMatchesByWeek = async (req, res) => {
    const league_id = req.params.league_id
    try {

        const matches = await Match.findAll({
            where: {
                date: {
                    [Op.gte]: req.params.startDate,
                    [Op.lte]: req.params.endDate
                },
                league_id: league_id
            },
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url', 'acronym'],
                through: { attributes: [] }
            }]
        });

        res.json(matches);
    } catch (error) {
        console.error('Error getting current week matches:', error);
        res.status(500).json({ error: 'Error fetching matches. Please try again later.' });
    }
};

//Get all matches of a league
exports.getMatchesByLeague = async (req, res) => {
    try {
        const matches = await Match.findAll({
            where: {
                league_id: req.params.id
            },
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url', 'acronym'],
                through: { attributes: [] }
            }]
        });
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get match by ID
exports.getMatchById = async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id, {
            include: [{
                model: Team,
                attributes: ['name'],
                through: { attributes: [] }
            }]
        });
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get matches that dont have a result
exports.getMatchesWithoutResult = async (req, res) => {
    try {
        let matches = await Match.findAll({
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url', 'acronym'],
                through: { attributes: [] }
            }],
        });

        const results = await Result.findAll({
            attributes: ['match_id'],
            raw: true
        });
        matches = matches.filter(match => !results.some(result => result.match_id === match.id));
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create match
exports.createMatch = async (req, res) => {
    try {
        const teams = await Team.findAll({ where: { id: req.body.teams } });
        const name = `${teams[0].acronym} vs ${teams[1].acronym}`;
        const payload = { ...req.body, name };

        // Sin jornada elegida, la de su semana de siempre, para que nada cambie de
        // grupo mientras el panel no la pida. Con jornada, tiene que ser de su liga.
        if (!payload.round_id) {
            payload.round_id = (await roundForMatchDate(payload)).id;
        } else {
            const round = await Round.findByPk(payload.round_id);
            if (!round || round.league_id !== Number(payload.league_id)) {
                return res.status(400).json({ error: 'Esa jornada no es de la liga del partido' });
            }
        }

        const match = await Match.create(payload);
        match.addTeams(teams);
        res.json(match);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update match
exports.updateMatch = async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const payload = { ...req.body };
        const leagueId = Number(payload.league_id ?? match.league_id);

        // Cambiar la fecha ya NO cambia la jornada: aplazar un partido lo deja donde
        // estaba. Solo se reasigna si cambia de liga sin decir a qué jornada va.
        if (payload.round_id) {
            const round = await Round.findByPk(payload.round_id);
            if (!round || round.league_id !== leagueId) {
                return res.status(400).json({ error: 'Esa jornada no es de la liga del partido' });
            }
        } else if (leagueId !== match.league_id) {
            payload.round_id = (await roundForMatchDate({ league_id: leagueId, date: payload.date ?? match.date })).id;
        } else {
            delete payload.round_id;
        }

        const updatedMatch = await match.update(payload);
        res.json(updatedMatch);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Delete match
exports.deleteMatch = async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        //Eliminamos todas las predicciones
        const predictions = await Prediction.findAll({ where: { match_id: req.params.id } });
        if (predictions) {
            predictions.forEach(async (prediction) => {
                await prediction.destroy();
            });
        }

        //Eliminamos todos los resultados
        const results = await Result.findAll({ where: { match_id: req.params.id } });
        if (results) {
            results.forEach(async (result) => {
                await result.destroy();
            });
        }

        await match.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
