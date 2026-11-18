const router = require("express").Router();
const economyController = require("../../controllers/economyController");
const { authenticateJwtToken, requireAdmin } = require("../../middlewares/auth");

// Solo el admin: el panel de economía de la fase 5 de cartas y cofres.
router.get('/', authenticateJwtToken, requireAdmin, economyController.getEconomy);

module.exports = router;
