const { Op } = require('sequelize');
const Match = require('../models/match');
const Team = require('../models/team');
const Prediction = require('../models/prediction');
const Result = require('../models/result');


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
exports.getCurrentWeekMatches = async (req, res) => {
    try {
        // Recogo el primer dia de la semana
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes siendo el primer día
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        console.log(startOfWeek)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Fin de la semana (domingo)
        endOfWeek.setHours(23, 59, 59, 999);

        const matches = await Match.findAll({
            where: {
                date: {
                    [Op.gte]: startOfWeek.toISOString(),
                    [Op.lte]: endOfWeek.toISOString() // Menor o igual
                }
            },
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url'],
                through: { attributes: [] }
            }]
        });

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
        // Recogo el primer dia de la semana
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes siendo el primer día
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        console.log(startOfWeek)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Fin de la semana (domingo)
        endOfWeek.setHours(23, 59, 59, 999);

        const matches = await Match.findAll({
            where: {
                date: {
                    [Op.gte]: startOfWeek.toISOString(),
                    [Op.lte]: endOfWeek.toISOString() // Menor o igual
                },
                league_id: league_id
            },
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url'],
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
                attributes: ['id', 'name', 'logo_url'],
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
                attributes: ['id', 'name', 'logo_url'],
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
        const match = await Match.create({ ...req.body, name });
        match.addTeams(teams);
        res.json(match);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update match
exports.updateMatch = async (req, res) => {
    try {
        const teams = await Team.findAll({ where: { id: req.body.teams } });
        const name = `${teams[0].acronym} vs ${teams[1].acronym}`;
        const match = await Match.findByPk(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const updatedMatch = await match.update({ ...req.body, name });
        match.setTeams(teams);
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
