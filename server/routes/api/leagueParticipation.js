const express = require('express');
const router = express.Router();
const leagueParticipationController = require('../../controllers/leagueParticipationController');
const { authenticateJwtToken, selfOrAdmin } = require('../../middlewares/auth');

// Solo sobre uno mismo, salvo un admin: antes cualquiera podía cambiarle el favorito
// (que da puntos) o apuntar y sacar de una liga a otro.
const bodyUser = selfOrAdmin((req) => req.body.user_id, 'Solo puedes hacer esto para ti');
const paramUser = selfOrAdmin((req) => req.params.userId, 'Solo puedes hacer esto para ti');


router.post('/join', authenticateJwtToken, bodyUser, leagueParticipationController.joinLeague);
router.get('/get/participants/:leagueId', authenticateJwtToken, leagueParticipationController.getLeagueParticipationsByLeague);
router.get('/get/:userId/:leagueId', authenticateJwtToken, leagueParticipationController.getLeagueParticipation);
router.get('/get/', authenticateJwtToken, leagueParticipationController.getLeagueParticipations);
router.delete('/leave/:userId/:leagueId', authenticateJwtToken, paramUser, leagueParticipationController.leaveLeague);

module.exports = router;