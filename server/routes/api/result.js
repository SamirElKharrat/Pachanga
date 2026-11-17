const express = require('express');
const router = express.Router();
const resultController = require('../../controllers/resultController.js');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, resultController.getAllResults);
router.get('/get/:id', authenticateJwtToken, resultController.getResultById);
router.get('/getByMatch/:matchId', authenticateJwtToken, resultController.getResultByMatchId);
router.post('/set', authenticateJwtToken, requireAdmin, resultController.createResult);
router.put('/update/:id', authenticateJwtToken, requireAdmin, resultController.updateResult);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, resultController.deleteResult);

module.exports = router;