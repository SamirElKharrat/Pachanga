const express = require('express');
const router = express.Router();
const ruleController = require('../../controllers/ruleController');
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

router.get('/', authenticateJwtToken, ruleController.getRules);
router.get('/:id', authenticateJwtToken, ruleController.getRuleById);
router.post('/', authenticateJwtToken, requireAdmin, ruleController.createRule);
router.put('/:id', authenticateJwtToken, requireAdmin, ruleController.updateRule);
router.delete('/:id', authenticateJwtToken, requireAdmin, ruleController.deleteRule);

module.exports = router;
