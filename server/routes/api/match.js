const express = require('express');
const router = express.Router();
const matchController = require('../../controllers/matchController');
const { authenticateJwtToken } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, matchController.getAllMatches);
router.get('/get/:id', authenticateJwtToken, matchController.getMatchById);
router.get('/getByWeek', authenticateJwtToken, matchController.getCurrentWeekMatches);
router.get('/getByWeek/:league_id', authenticateJwtToken, matchController.getCurrentWeekMatchesByLeague);
router.get('/getByLeague/:id', authenticateJwtToken, matchController.getMatchesByLeague);
router.get('/getWithoutResult', authenticateJwtToken, matchController.getMatchesWithoutResult);
router.post('/set', authenticateJwtToken, matchController.createMatch);
router.put('/update/:id', authenticateJwtToken, matchController.updateMatch);
router.delete('/delete/:id', authenticateJwtToken, matchController.deleteMatch);
router.get('/getTeams/:id', authenticateJwtToken, matchController.getTeamsFromMatch);

module.exports = router;