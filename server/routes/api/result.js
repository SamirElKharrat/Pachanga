const express = require('express');
const router = express.Router();
const resultController = require('../../controllers/resultController.js');
const { authenticateJwtToken } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, resultController.getAllResults);
router.get('/get/:id', authenticateJwtToken, resultController.getResultById);
router.get('/getByMatch/:matchId', authenticateJwtToken, resultController.getResultByMatchId);
router.post('/set', authenticateJwtToken, resultController.createResult);
router.put('/update/:id', authenticateJwtToken, resultController.updateResult);
router.delete('/delete/:id', authenticateJwtToken, resultController.deleteResult);

module.exports = router;