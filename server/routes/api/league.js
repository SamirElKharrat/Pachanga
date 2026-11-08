const express = require('express');
const router = express.Router();

// Escribir ligas y partidos es cosa del panel de admin. Los estados (scheduled →
// live → finished) los avanza el servidor solo: utils/lifecycle.js.
const leagueController = require('../../controllers/leagueController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

// Pública: la necesita el login, que aún no tiene sesión. Ver getActiveTheme.
router.get('/active-theme', leagueController.getActiveTheme);

router.get('/get', authenticateJwtToken, leagueController.getAllLeagues);
router.get('/get/:id', authenticateJwtToken, leagueController.getLeagueById);
router.post('/set', authenticateJwtToken, requireAdmin, leagueController.createLeague);
router.put('/update/:id', authenticateJwtToken, requireAdmin, leagueController.updateLeague);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, leagueController.deleteLeague);
router.get('/getTeams/:id', authenticateJwtToken, leagueController.getTeamsByLeague);

module.exports = router;