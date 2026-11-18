const router = require("express").Router();
const duelController = require("../../controllers/duelController");
const { authenticateJwtToken, requireAdmin } = require("../../middlewares/auth");

router.get('/notices', authenticateJwtToken, duelController.getNotices);
router.get('/league/:leagueId', authenticateJwtToken, duelController.getLeague);
router.post('/', authenticateJwtToken, duelController.challenge);
router.post('/:id/respond', authenticateJwtToken, duelController.respond);
router.post('/:id/seen', authenticateJwtToken, duelController.markSeen);
router.delete('/:id', authenticateJwtToken, duelController.cancel);

// Admin
router.get('/admin/:leagueId', authenticateJwtToken, requireAdmin, duelController.getLeagueAdmin);
router.post('/:id/annul', authenticateJwtToken, requireAdmin, duelController.annul);

module.exports = router;
