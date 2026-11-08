const express = require('express');
const router = express.Router();

// Escribir ligas y partidos es cosa del panel de admin. Los estados (scheduled →
// live → finished) los avanza el servidor solo: utils/lifecycle.js.
const matchController = require('../../controllers/matchController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, matchController.getAllMatches);
router.get('/get/:id', authenticateJwtToken, matchController.getMatchById);
router.get('/getByWeek', authenticateJwtToken, matchController.getCurrentWeekMatches);
router.get('/getByWeek/:league_id', authenticateJwtToken, matchController.getCurrentWeekMatchesByLeague);
router.get('/getByWeek/:league_id/:startDate/:endDate', authenticateJwtToken, matchController.getCurrentWeekMatchesByWeek);
router.get('/getByLeague/:id', authenticateJwtToken, matchController.getMatchesByLeague);
router.get('/getWithoutResult', authenticateJwtToken, matchController.getMatchesWithoutResult);
router.post('/set', authenticateJwtToken, requireAdmin, matchController.createMatch);
router.put('/update/:id', authenticateJwtToken, requireAdmin, matchController.updateMatch);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, matchController.deleteMatch);
router.get('/getTeams/:id', authenticateJwtToken, matchController.getTeamsFromMatch);

module.exports = router;