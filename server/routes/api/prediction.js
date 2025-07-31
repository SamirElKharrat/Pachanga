const express = require('express');
const router = express.Router();
const predictionController = require('../../controllers/predictionController');
const { authenticateJwtToken } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, predictionController.getAllPredictions);
router.get('/user', authenticateJwtToken, predictionController.getPredictionsByUserId);
router.get('/get/:id', authenticateJwtToken, predictionController.getPredictionById);
router.get('/getByLeague/:league_id', authenticateJwtToken, predictionController.getPredictionsByLeague);
router.get('/getByMatch/:match_id', authenticateJwtToken, predictionController.getPredictionsByMatch);
router.post('/set', authenticateJwtToken, predictionController.createPrediction);
router.put('/update/:id', authenticateJwtToken, predictionController.updatePrediction);
router.delete('/delete/:id', authenticateJwtToken, predictionController.deletePrediction);

module.exports = router;