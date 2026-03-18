const Result = require('../models/result');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const LeagueParticipation = require('../models/leagueParticipation');
const Team = require('../models/team');
const User = require('../models/user');
const FavoriteTeam = require('../models/favoriteTeam');
const { startOfWeek, endOfWeek } = require('./weekController');
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
            resultsThisWeek.forEach(r => resultMap[r.match_id] = r.winner);
            resultMap[match.id] = winner; // Añadimos el current match

            // Fetch optimizado: Traer todas las predicciones de la semana para evitar peticiones en el map
            const allWeekPredictions = await Prediction.findAll({
                where: {
                    match_id: {
                        [Op.in]: weekMatchIds.slice(0, currentMatchIndex + 1)
                    }
                }
            });

            const leagueParticipationsPromises = predictions.map(async prediction => {
                let points = 0;
                const favoriteTeam = await FavoriteTeam.findOne({
                    where: {
                        user_id: prediction.user_id,
                        league_id: match.league_id,
                        team_id: prediction.winner
                    }
                });

                const isFavoriteTeam = !!favoriteTeam;

                if (prediction.winner === winner) {
                    points += 2;

                    // Si acierta que su favorito gana
                    if (isFavoriteTeam) {
                        points += 1;
                    }

                    switch (match.format) {
                        case 'BO3':
                            if (req.body.result === prediction.description) {
                                points += 3;
                            }
                            break;
                        case 'BO5':
                            if (req.body.result === prediction.description) {
                                points += 5;
                            }
                            break;
                    }

                    // ====== CALCULO DEL PLENO ====== //
                    let isStreakAlive = true;
                    let currentStreak = 0;

                    // Filtramos usando la caché pre-cargada
                    const userWeekPreds = allWeekPredictions.filter(p => p.user_id === prediction.user_id);

                    // Revisar todos los partidos cronológicamente hasta este
                    for (let i = 0; i <= currentMatchIndex; i++) {
                        const mId = weekMatchIds[i];
                        const userPred = userWeekPreds.find(p => p.match_id === mId);
                        const matchWinner = resultMap[mId];

                        if (!userPred || userPred.winner !== matchWinner) {
                            // Si falló alguno o no votó, el pleno de la semana ha muerto
                            isStreakAlive = false;
                            break;
                        } else {
                            currentStreak++;
                        }
                    }

                    if (isStreakAlive) {
                        if (currentStreak === 3) points += 1; // +1 extra (Total 1 extra)
                        if (currentStreak === 5) points += 1; // +1 extra (Total 2 extra)
                        if (currentStreak === 6) points += 1; // +1 extra (Total 3 extra, máximo)
                    }
                    // ============================== //
                }

                await LeagueParticipation.increment('points', {
                    by: points,
                    where: {
                        user_id: prediction.user_id,
                        league_id: match.league_id
                    }
                });

                await prediction.update({ points });
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