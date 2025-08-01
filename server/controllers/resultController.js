const Result = require('../models/result');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const LeagueParticipation = require('../models/leagueParticipation');
const Team = require('../models/team');
const User = require('../models/user');
const FavoriteTeam = require('../models/favoriteTeam');
const { startOfWeek, endOfWeek } = require('./weekController');

// Get all results
exports.getAllResults = async (req, res) => {
    try {
        const results = await Result.findAll();
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
                    switch (match.format) {
                        case 'BO3':
                            if (req.body.result === prediction.description) {
                                points += 3;
                                if (isFavoriteTeam) {
                                    points += 1;
                                }
                            }
                            break;
                        case 'BO5':
                            if (req.body.result === prediction.description) {
                                points += 5;
                                if (isFavoriteTeam) {
                                    points += 1;
                                }
                            }
                            break;
                    }
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