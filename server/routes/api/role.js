const rolesController = require('../../controllers/roleController');
const router = require("express").Router();
const { authenticateJwtToken, requireAdmin } = require('../../middlewares/auth');

router.get("/get", authenticateJwtToken, rolesController.getAllRoles);
router.get("/get/:id", authenticateJwtToken, rolesController.getRoleById);
router.post("/set", authenticateJwtToken, requireAdmin, rolesController.createRole);
router.put("/update/:id", authenticateJwtToken, requireAdmin, rolesController.updateRole);
router.delete("/delete/:id", authenticateJwtToken, requireAdmin, rolesController.deleteRole);

module.exports = router;