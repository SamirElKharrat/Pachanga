const Result = require('../models/result');
const Match = require('../models/match');
const Team = require('../models/team');
const statsAggregator = require('../utils/statsAggregator');

/**
 * Applies the points for the league week a match belongs to and refreshes its stats.
 *
 * Works by difference, not by adding: it compares what every prediction of that week
 * is worth now against what it was worth before. Calling it twice for the same match
 * moves nothing the second time, and a league nobody touches is never rewritten.
 *
 * Deliberately allowed to throw. Points are the whole point of closing a match, so a
 * failure has to reach the admin rather than be swallowed — and retrying is safe.
 *
 * @param {number} matchId
 */
const applyPoints = async (matchId) => {
    if (!matchId) return;
    await statsAggregator.applyForMatch(matchId);
};

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

        // ALWAYS mark match as finished when a result is created
        await Match.update({ status: 'finished' }, { where: { id: req.body.match_id } });

        await applyPoints(req.body.match_id);

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
        if (result.match_id) {
            await Match.update({ status: 'finished' }, { where: { id: result.match_id } });
        }

        // Corrections used to leave the old points in place. Now they move by the
        // difference, which also drags any pleno the change breaks or creates.
        await applyPoints(result.match_id);

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

        const matchId = result.match_id; // needed after the row is gone
        await result.destroy();

        // Removing a result takes its points back out, which never used to happen.
        await applyPoints(matchId);

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};