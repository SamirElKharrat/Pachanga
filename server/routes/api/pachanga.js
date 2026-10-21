const express = require('express');
const router = express.Router();
const pachangaController = require('../../controllers/pachangaController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

// Pública: la necesita la portada, que no tiene sesión. Ver getShowcase.
router.get('/showcase', pachangaController.getShowcase);
router.get('/standings', authenticateJwtToken, pachangaController.getStandings);
router.post('/set', authenticateJwtToken, requireAdmin, pachangaController.createPointEntry);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, pachangaController.deletePointEntry);
router.get('/rules', authenticateJwtToken, pachangaController.getRules);

module.exports = router;
