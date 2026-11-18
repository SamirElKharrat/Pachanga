const router = require("express").Router();
const shopController = require("../../controllers/shopController");
const { authenticateJwtToken, requireAdmin } = require("../../middlewares/auth");

router.get('/', authenticateJwtToken, shopController.getShop);
router.get('/equipped', authenticateJwtToken, shopController.getEquipped);
router.post('/buy', authenticateJwtToken, shopController.buy);
router.post('/match-card', authenticateJwtToken, shopController.buyMatchCard);
router.post('/equip', authenticateJwtToken, shopController.equip);

// Admin
router.post('/grant', authenticateJwtToken, requireAdmin, shopController.grant);

module.exports = router;
