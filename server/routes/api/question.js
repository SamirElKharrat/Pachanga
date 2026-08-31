const express = require('express');
const router = express.Router();
const questionController = require('../../controllers/questionController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

// Lectura: cualquiera que haya iniciado sesión.
router.get('/get', authenticateJwtToken, questionController.getAllQuestions);
router.get('/get/:id', authenticateJwtToken, questionController.getQuestionById);
router.get('/getByWeek/:league_id/:week', authenticateJwtToken, questionController.getQuestionsByWeek);
router.get('/answers/:league_id/:week', authenticateJwtToken, questionController.getAnswersByWeek);

// Responder: el propio usuario, una sola vez.
router.post('/answer', authenticateJwtToken, questionController.answerQuestions);

// Escritura de preguntas: solo administración. `update` es además lo que reparte los
// puntos al marcar la respuesta correcta, así que aquí el requireAdmin no es
// decoración.
router.post('/set', authenticateJwtToken, requireAdmin, questionController.createQuestion);
router.put('/update/:id', authenticateJwtToken, requireAdmin, questionController.updateQuestion);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, questionController.deleteQuestion);

module.exports = router;
