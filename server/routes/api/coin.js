const router = require("express").Router();
const coinController = require("../../controllers/coinController");
const { authenticateJwtToken, requireAdmin } = require("../../middlewares/auth");

router.get('/me', authenticateJwtToken, coinController.getMine);

// Admin
router.get('/user/:id', authenticateJwtToken, requireAdmin, coinController.getUserWallet);
router.post('/grant', authenticateJwtToken, requireAdmin, coinController.grant);

module.exports = router;
