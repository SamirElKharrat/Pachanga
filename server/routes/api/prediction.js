const express = require('express');
const router = express.Router();
const predictionController = require('../../controllers/predictionController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

// Las de todos y las de una liga entera: solo el panel de admin.
router.get('/get', authenticateJwtToken, requireAdmin, predictionController.getAllPredictions);
router.get('/getByLeague/:league_id', authenticateJwtToken, requireAdmin, predictionController.getPredictionsByLeague);

// Las mías, una concreta (mía, o cualquiera si soy admin) y las de un partido (las
// de los demás, solo cuando toca: ver predictionController).
router.get('/user', authenticateJwtToken, predictionController.getPredictionsByUserId);
router.get('/get/:id', authenticateJwtToken, predictionController.getPredictionById);
router.get('/getByMatch/:match_id', authenticateJwtToken, predictionController.getPredictionsByMatch);

// Votar es de cada uno (el usuario sale de la sesión); corregir y borrar, del admin.
router.post('/set', authenticateJwtToken, predictionController.createPrediction);
router.put('/update/:id', authenticateJwtToken, requireAdmin, predictionController.updatePrediction);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, predictionController.deletePrediction);

module.exports = router;
