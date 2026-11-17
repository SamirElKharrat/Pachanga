const express = require('express');
const router = express.Router();
const favoriteTeamController = require('../../controllers/favoriteTeamController');
const { authenticateJwtToken, selfOrAdmin } = require('../../middlewares/auth');

// Solo sobre uno mismo, salvo un admin: antes cualquiera podía cambiarle el favorito
// (que da puntos) o apuntar y sacar de una liga a otro.
const bodyUser = selfOrAdmin((req) => req.body.user_id, 'Solo puedes hacer esto para ti');
const paramUser = selfOrAdmin((req) => req.params.userId, 'Solo puedes hacer esto para ti');


router.post('/set', authenticateJwtToken, bodyUser, favoriteTeamController.setFavoriteTeam);
router.get('/get/:userId/:leagueId', authenticateJwtToken, favoriteTeamController.getUserFavoriteTeam);
router.get('/get/:userId', authenticateJwtToken, favoriteTeamController.getUserFavoriteTeams);
router.delete('/delete/:userId/:leagueId', authenticateJwtToken, paramUser, favoriteTeamController.removeFavoriteTeam);

module.exports = router;