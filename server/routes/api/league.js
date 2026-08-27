const express = require('express');
const router = express.Router();
const leagueController = require('../../controllers/leagueController');
const { authenticateJwtToken } = require('../../middlewares/auth');

// Pública: la necesita el login, que aún no tiene sesión. Ver getActiveTheme.
router.get('/active-theme', leagueController.getActiveTheme);

router.get('/get', authenticateJwtToken, leagueController.getAllLeagues);
router.get('/get/:id', authenticateJwtToken, leagueController.getLeagueById);
router.post('/set', authenticateJwtToken, leagueController.createLeague);
router.put('/update/:id', authenticateJwtToken, leagueController.updateLeague);
router.delete('/delete/:id', authenticateJwtToken, leagueController.deleteLeague);
router.get('/getTeams/:id', authenticateJwtToken, leagueController.getTeamsByLeague);

module.exports = router;