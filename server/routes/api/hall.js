const express = require('express');
const router = express.Router();
const hallController = require('../../controllers/hallController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, hallController.getAllHallEntries);
router.post('/set', authenticateJwtToken, requireAdmin, hallController.createHallEntry);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, hallController.deleteHallEntry);

module.exports = router;
