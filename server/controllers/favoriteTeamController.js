const favoriteTeam = require('../models/favoriteTeam');
const Team = require('../models/team');
const League = require('../models/league');


// Set user's favorite team for a league
exports.setFavoriteTeam = async (req, res) => {
    const { user_id, team_id, league_id } = req.body;

    try {
        // Check if user already has a favorite team in this league
        const existingFavorite = await favoriteTeam.findOne({
            where: { user_id, league_id }
        });

        let favorite;

        if (existingFavorite) {
            // Update existing favorite
            favorite = await existingFavorite.update({ team_id });
        } else {
            // Create new favorite
            favorite = await favoriteTeam.create({
                user_id,
                team_id,
                league_id
            });
        }

        res.status(200).json(favorite);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get user's favorite team for a league
exports.getUserFavoriteTeam = async (req, res) => {
    const { userId, leagueId } = req.params;

    try {
        const favorite = await favoriteTeam.findOne({
            where: {
                user_id: userId,
                league_id: leagueId
            }
        });

        if (!favorite) {
            return res.status(404).json({ message: 'No favorite team found for this league' });
        }

        const team = await Team.findByPk(favorite.team_id);

        res.json({
            favorite,
            team
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all favorite teams for a user
exports.getUserFavoriteTeams = async (req, res) => {
    try {
        const favorites = await favoriteTeam.findAll({
            where: { user_id: req.params.userId }
        });
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remove favorite team
exports.removeFavoriteTeam = async (req, res) => {
    const { userId, leagueId } = req.params;

    try {
        const result = await favoriteTeam.destroy({
            where: {
                user_id: userId,
                league_id: leagueId
            }
        });

        if (result === 0) {
            return res.status(404).json({ message: 'No favorite team found to remove' });
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};