const express = require('express');
const router = express.Router();
const pachangaController = require('../../controllers/pachangaController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

router.get('/standings', authenticateJwtToken, pachangaController.getStandings);
router.post('/set', authenticateJwtToken, requireAdmin, pachangaController.createPointEntry);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, pachangaController.deletePointEntry);
router.get('/rules', authenticateJwtToken, pachangaController.getRules);

module.exports = router;
