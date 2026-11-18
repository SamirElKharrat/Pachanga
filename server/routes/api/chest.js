const router = require("express").Router();
const chestController = require("../../controllers/chestController");
const { authenticateJwtToken } = require("../../middlewares/auth");

router.get('/', authenticateJwtToken, chestController.getChests);
router.post('/open', authenticateJwtToken, chestController.open);

module.exports = router;
