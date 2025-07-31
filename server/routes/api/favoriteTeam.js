const express = require('express');
const router = express.Router();
const favoriteTeamController = require('../../controllers/favoriteTeamController');
const { authenticateJwtToken } = require('../../middlewares/auth');


router.post('/set', authenticateJwtToken, favoriteTeamController.setFavoriteTeam);
router.get('/get/:userId/:leagueId', authenticateJwtToken, favoriteTeamController.getUserFavoriteTeam);
router.get('/get/:userId', authenticateJwtToken, favoriteTeamController.getUserFavoriteTeams);
router.delete('/delete/:userId/:leagueId', authenticateJwtToken, favoriteTeamController.removeFavoriteTeam);

module.exports = router;