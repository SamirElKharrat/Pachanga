const express = require('express');
const router = express.Router();
const statsController = require('../../controllers/statsController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

// Every endpoint takes the same scope: ?scope=pachanga&year=YYYY, or ?leagueId=N.
router.get('/overview', authenticateJwtToken, statsController.getOverview);
router.get('/players', authenticateJwtToken, statsController.getPlayers);
router.get('/player/:userId', authenticateJwtToken, statsController.getPlayer);
router.get('/compare', authenticateJwtToken, statsController.getCompare);
router.get('/leagues', authenticateJwtToken, statsController.getLeagues);
router.get('/moments', authenticateJwtToken, statsController.getMoments);

// Rehacer las estadísticas de una temporada a mano. No reparte puntos, solo los mide.
router.post('/recompute', authenticateJwtToken, requireAdmin, statsController.postRecompute);

module.exports = router;
