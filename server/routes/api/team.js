const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/teamController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

router.get('/get', authenticateJwtToken, teamController.getAllTeams);
router.get('/get/:id', authenticateJwtToken, teamController.getTeamById);
router.post('/set', authenticateJwtToken, requireAdmin, teamController.createTeam);
router.put('/update/:id', authenticateJwtToken, requireAdmin, teamController.updateTeam);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, teamController.deleteTeam);

module.exports = router;