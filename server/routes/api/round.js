const express = require('express');
const router = express.Router();
const roundController = require('../../controllers/roundController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

// Lectura: cualquiera con sesión. `league/:league_id` es lo que leen los selectores.
router.get('/get', authenticateJwtToken, roundController.getAllRounds);
router.get('/get/:id', authenticateJwtToken, roundController.getRoundById);
router.get('/league/:league_id', authenticateJwtToken, roundController.getRoundsByLeague);

// Escritura: solo el panel de administración.
router.post('/set', authenticateJwtToken, requireAdmin, roundController.createRound);
router.put('/update/:id', authenticateJwtToken, requireAdmin, roundController.updateRound);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, roundController.deleteRound);

module.exports = router;
