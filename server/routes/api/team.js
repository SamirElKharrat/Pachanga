const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/teamController');
const { authenticateJwtToken } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, teamController.getAllTeams);
router.get('/get/:id', authenticateJwtToken, teamController.getTeamById);
router.post('/set', authenticateJwtToken, teamController.createTeam);
router.put('/update/:id', authenticateJwtToken, teamController.updateTeam);
router.delete('/delete/:id', authenticateJwtToken, teamController.deleteTeam);

module.exports = router;