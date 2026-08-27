const { Op } = require('sequelize');
const League = require('../models/league');
const Team = require('../models/team');
const FavoriteTeam = require('../models/favoriteTeam');
const LeagueParticipation = require('../models/leagueParticipation');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const Result = require('../models/result');
const hallController = require('./hallController');
const pachangaController = require('./pachangaController');


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

/**
 * Qué piel debe llevar la web ahora mismo. Público a propósito.
 *
 * Va sin `authenticateJwtToken` porque quien más lo necesita es la pantalla de
 * login, que todavía no tiene sesión y es justo donde más luce el escudo del
 * mundial. Lo que devuelve —nombre, logo y fechas de una competición— es
 * información pública de todos modos.
 *
 * La regla, entera:
 *
 *   1. la liga está marcada como el mundial            theme = 'worlds'
 *   2. no se ha dado por terminada                     status != 'finished'
 *   3. y no se ha pasado de su fecha de fin            now <= end_date
 *
 * El punto 3 es el cinturón de seguridad. El estado lo mueve
 * `checkAndUpdateLeagues()` en el cliente, que solo corre cuando alguien abre la
 * portada; si nadie entra en tres días después de la final, la liga seguiría
 * marcada 'live' y la web seguiría dorada. Comparando también con la fecha, el
 * tema se apaga el día que toca aunque la base de datos vaya con retraso.
 */
exports.getActiveTheme = async (req, res) => {
    try {
        const league = await League.findOne({
            where: {
                theme: 'worlds',
                status: { [Op.ne]: 'finished' },
                end_date: { [Op.gte]: new Date() }
            },
            order: [['start_date', 'DESC']],
            attributes: ['id', 'name', 'logo_url', 'status', 'start_date', 'end_date']
        });

        if (!league) {
            return res.json({ theme: 'default', league: null });
        }

        res.json({
            theme: 'worlds',
            league: {
                id: league.id,
                name: league.name,
                logo_url: league.logo_url,
                status: league.status,
                start_date: league.start_date,
                end_date: league.end_date
            }
        });
    } catch (error) {
        // Que la piel no tumbe la web: si esto falla, se responde "tema normal".
        console.error('No se pudo resolver el tema activo:', error.message);
        res.json({ theme: 'default', league: null });
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
        if (req.body.status === 'finished') {
            await hallController.syncFinishedLeagueWinners();
            await pachangaController.syncFinishedLeaguePachangaPoints(updatedLeague.id);
        }
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