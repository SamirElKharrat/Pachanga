const Result = require('../models/result');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const LeagueParticipation = require('../models/leagueParticipation');
const Team = require('../models/team');
const User = require('../models/user');
const FavoriteTeam = require('../models/favoriteTeam');
const League = require('../models/league');
const { startOfWeek, endOfWeek, getLeagueWeekNumber } = require('./weekController'); // Make sure getting a week number is possible
const { calculatePredictionPoints } = require('../utils/pointsCalculator');
const { Op } = require('sequelize');

// Get all results
exports.getAllResults = async (req, res) => {
    try {
        const results = await Result.findAll({
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
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get result by ID
exports.getResultById = async (req, res) => {
    try {
        const result = await Result.findByPk(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Result not found' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get result by match ID
exports.getResultByMatchId = async (req, res) => {
    try {
        const result = await Result.findOne({
            where: { match_id: req.params.matchId }
        });
        if (!result) {
            return res.status(404).json({ error: 'Result not found' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create result
exports.createResult = async (req, res) => {
    try {
        const result = await Result.create(req.body);

        const match = await Match.findByPk(req.body.match_id, {
            include: [{
                model: Team,
                as: 'Teams',
                through: { attributes: [] }
            }]
        });

        const winner = req.body.winner;
        const predictions = await Prediction.findAll({
            where: { match_id: req.body.match_id },
        });

        if (predictions.length > 0) {
            // Configuración para los plenos: Obtener los partidos de la semana
            const weekStart = startOfWeek(match.date);
            const weekEnd = endOfWeek(match.date);

            // Compute an actual week number for the database relative to league start date.
            const league = await League.findByPk(match.league_id);
            const currentWeekNumber = getLeagueWeekNumber(league.start_date, match.date);

            const weekMatches = await Match.findAll({
                where: {
                    league_id: match.league_id,
                    date: {
                        [Op.between]: [weekStart, weekEnd]
                    }
                },
                order: [['date', 'ASC']]
            });

            const weekMatchIds = weekMatches.map(m => m.id);
            const currentMatchIndex = weekMatchIds.indexOf(match.id);

            // Fetch de resultados de los partidos de la semana hasta el actual
            const resultsThisWeek = await Result.findAll({
                where: {
                    match_id: {
                        [Op.in]: weekMatchIds.slice(0, currentMatchIndex + 1)
                    }
                }
            });

            const resultMap = {};
            resultsThisWeek.forEach(r => {
                resultMap[r.match_id] = { winner: r.winner, result: r.result };
            });
            // Ensure current match result is explicitly in map
            resultMap[match.id] = { winner, result: req.body.result };

            // Fetch optimizado: Traer todas las predicciones de la semana para evitar peticiones en el map
            const allWeekPredictions = await Prediction.findAll({
                where: {
                    match_id: {
                        [Op.in]: weekMatchIds.slice(0, currentMatchIndex + 1)
                    }
                }
            });

            // 1. Obtener TODOS los participantes de la liga (los que votaron y los que no)
            const allParticipants = await LeagueParticipation.findAll({
                where: {
                    league_id: match.league_id,
                    week: -1 // Obtener todos los usuarios de la liga
                }
            });

            // 2. Procesar a TODOS los participantes
            const leagueParticipationsPromises = allParticipants.map(async participant => {
                const user_id = participant.user_id;

                // Buscar si este usuario votó en este partido
                const prediction = predictions.find(p => p.user_id === user_id);

                let points = 0;
                let predictionData = null;

                if (prediction) {
                    // Si votó, calcular sus puntos
                    points = await calculatePredictionPoints({
                        prediction,
                        match,
                        winner,
                        resultStr: req.body.result,
                        weekMatchIds,
                        resultMap,
                        allWeekPredictions
                    });

                    predictionData = prediction;

                    // Actualizar los puntos de la predicción
                    await prediction.update({ points });
                }
                // Si no votó, points = 0 (valor por defecto)

                let lastweekPoints = 0;
                if (currentWeekNumber > 1) {
                    // Find the most recent week participation (not necessarily currentWeek-1,
                    // since some weeks may have no matches and no participation row)
                    const lastWeekParticipation = await LeagueParticipation.findOne({
                        where: {
                            user_id: user_id,
                            league_id: match.league_id,
                            week: {
                                [Op.gt]: 0,
                                [Op.lt]: currentWeekNumber
                            }
                        },
                        order: [['week', 'DESC']]
                    });
                    lastweekPoints = lastWeekParticipation?.points || 0;
                }

                // Cargar o crear el LeagueParticipation de la semana correcta
                const [participation, created] = await LeagueParticipation.findOrCreate({
                    where: {
                        user_id: user_id,
                        league_id: match.league_id,
                        week: currentWeekNumber
                    },
                    defaults: {
                        points: lastweekPoints
                    }
                });

                await participation.increment('points', { by: points });

                // Acumular puntos en week = -1
                await LeagueParticipation.increment(
                    { points: points },
                    {
                        where: {
                            user_id: user_id,
                            league_id: match.league_id,
                            week: -1
                        }
                    }
                );
            });

            await Match.update({ status: 'finished' }, { where: { id: req.body.match_id } });

            await Promise.all(leagueParticipationsPromises);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Error in createResult:', error);
        res.status(400).json({ error: error.message });
    }
};

// Update result
exports.updateResult = async (req, res) => {
    try {
        const result = await Result.findByPk(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Result not found' });
        }
        const updatedResult = await result.update(req.body);
        res.json(updatedResult);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete result
exports.deleteResult = async (req, res) => {
    try {
        const result = await Result.findByPk(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Result not found' });
        }
        await result.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};