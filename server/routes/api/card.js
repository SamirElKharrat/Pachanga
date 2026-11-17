const router = require("express").Router();
const cardController = require("../../controllers/cardController");
const { authenticateJwtToken, requireAdmin } = require("../../middlewares/auth");

router.get('/catalog', authenticateJwtToken, cardController.getCatalog);
router.get('/hand/:leagueId', authenticateJwtToken, cardController.getHand);
router.post('/play', authenticateJwtToken, cardController.play);
router.delete('/play/:id', authenticateJwtToken, cardController.withdraw);
router.get('/round/:roundId', authenticateJwtToken, cardController.getRound);

// Admin
router.post('/grant', authenticateJwtToken, requireAdmin, cardController.grant);
router.get('/league/:leagueId', authenticateJwtToken, requireAdmin, cardController.getLeague);
router.post('/annul/:id', authenticateJwtToken, requireAdmin, cardController.annul);

module.exports = router;
