const express = require('express');
const router = express.Router();
const leagueParticipationController = require('../../controllers/leagueParticipationController');
const { authenticateJwtToken } = require('../../middlewares/auth');


router.post('/join', authenticateJwtToken, leagueParticipationController.joinLeague);
router.get('/get/participants/:leagueId', authenticateJwtToken, leagueParticipationController.getLeagueParticipationsByLeague);
router.get('/get/:userId/:leagueId', authenticateJwtToken, leagueParticipationController.getLeagueParticipation);
router.get('/get/', authenticateJwtToken, leagueParticipationController.getLeagueParticipations);
router.delete('/leave/:userId/:leagueId', authenticateJwtToken, leagueParticipationController.leaveLeague);

module.exports = router;