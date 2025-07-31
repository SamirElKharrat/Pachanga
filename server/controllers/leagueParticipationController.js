const leagueParticipation = require('../models/leagueParticipation');
const User = require('../models/user');
const League = require('../models/league');
const { authenticateJwtToken } = require('../middlewares/auth');


// Get user's participation in a league
exports.getLeagueParticipation = async (req, res) => {
    const { userId, leagueId } = req.params;

    try {
        const participation = await leagueParticipation.findOne({
            where: { user_id: userId, league_id: leagueId }
        });

        if (!participation) {
            return res.status(404).json({ error: 'Participation not found' });
        }

        res.json(participation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all participations for a user
exports.getLeagueParticipations = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { email: req.user.email }
        });

        const participations = await leagueParticipation.findAll({
            where: { user_id: user.id },
        });

        res.json(participations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get all participations for a league
exports.getLeagueParticipationsByLeague = async (req, res) => {
    const { leagueId } = req.params;

    try {
        const participations = await leagueParticipation.findAll({
            where: { league_id: leagueId }
        });

        const UserPromises = participations.map(participation =>
            User.findOne({
                where: { id: participation.user_id }
            })
        )

        const users = await Promise.all(UserPromises)

        const response = participations.map((participation, index) => ({
            ...participation.dataValues,
            User: users[index]
        }))

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.joinLeague = async (req, res) => {
    const { user_id, league_id } = req.body;

    try {
        const existingParticipation = await leagueParticipation.findOne({
            where: { user_id, league_id }
        });

        if (existingParticipation) {
            return res.status(400).json({ error: 'User already joined the league' });
        }

        let participation;

        participation = await leagueParticipation.create({
            user_id,
            league_id,
            points: 0
        });

        res.status(200).json(participation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.leaveLeague = async (req, res) => {
    const { user_id, league_id } = req.body;

    try {
        const participation = await leagueParticipation.findOne({
            where: { user_id, league_id }
        });

        if (!participation) {
            return res.status(404).json({ error: 'Participation not found' });
        }

        await participation.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
