const express = require('express');
const router = express.Router();
const changelogController = require('../../controllers/changelogController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

// Leerlas puede cualquiera con sesión: es lo que se enseña en Opciones.
router.get('/get', authenticateJwtToken, changelogController.getAllChangelog);
router.get('/get/:id', authenticateJwtToken, changelogController.getChangelogById);

// Escribirlas, solo administración.
router.post('/set', authenticateJwtToken, requireAdmin, changelogController.createChangelog);
router.put('/update/:id', authenticateJwtToken, requireAdmin, changelogController.updateChangelog);
router.delete('/delete/:id', authenticateJwtToken, requireAdmin, changelogController.deleteChangelog);

module.exports = router;
