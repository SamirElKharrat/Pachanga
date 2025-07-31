const League = require('../models/league');
const Team = require('../models/team');
const FavoriteTeam = require('../models/favoriteTeam');
const LeagueParticipation = require('../models/leagueParticipation');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const Result = require('../models/result');


// Get all leagues
exports.getAllLeagues = async (req, res) => {
    try {
        const leagues = await League.findAll({
            include: [{
                model: Team,
                attributes: ['name'],
                through: { attributes: [] }
            }]
        });
        res.json(leagues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get Teams that play in x league
exports.getTeamsByLeague = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id, {
            include: [{
                model: Team,
                attributes: [['id', 'value'], ['name', 'label']],
                through: { attributes: [] }
            }]
        });
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        res.json(league);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get league by ID
exports.getLeagueById = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id, {
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url'],
                through: { attributes: [] }
            }]
        });
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        res.json(league);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create league
exports.createLeague = async (req, res) => {
    try {
        const league = await League.create(req.body);
        const teams = await Team.findAll({ where: { id: req.body.teams } });
        league.addTeams(teams);
        res.status(201).json(league);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update league
exports.updateLeague = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id);
        if (req.body.teams) {
            const teams = await Team.findAll({ where: { id: req.body.teams } });
            league.addTeams(teams);
        }
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        const updatedLeague = await league.update(req.body);
        res.json(updatedLeague);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete league
exports.deleteLeague = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id);
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        //Eliminamos todos los equipos favoritos seleccionados
        const favoriteTeams = await FavoriteTeam.findAll({ where: { league_id: req.params.id } });
        const leagueParticipations = await LeagueParticipation.findAll({ where: { league_id: req.params.id } });
        if (favoriteTeams) {
            favoriteTeams.forEach(async (favoriteTeam) => {
                await favoriteTeam.destroy();
            });
        }

        //Eliminamos todas las participaciones
        if (leagueParticipations) {
            leagueParticipations.forEach(async (leagueParticipation) => {
                await leagueParticipation.destroy();
            });

            //Eliminamos todos los partidos
            const matches = await Match.findAll({ where: { league_id: req.params.id } });
            if (matches) {
                matches.forEach(async (match) => {

                    //Eliminamos todas las predicciones
                    const predictions = await Prediction.findAll({ where: { match_id: match.id } });
                    if (predictions) {
                        predictions.forEach(async (prediction) => {
                            await prediction.destroy();
                        });
                    }

                    //Eliminamos todos los resultados
                    const results = await Result.findAll({ where: { match_id: match.id } });
                    if (results) {
                        results.forEach(async (result) => {
                            await result.destroy();
                        });
                    }

                    await match.destroy();
                });
            }
            await league.destroy();
            res.status(204).send();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};