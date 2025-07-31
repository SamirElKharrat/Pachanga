const rolesController = require('../../controllers/roleController');
const router = require("express").Router();
const { authenticateJwtToken } = require('../../middlewares/auth');

router.get("/get", authenticateJwtToken, rolesController.getAllRoles);
router.get("/get/:id", authenticateJwtToken, rolesController.getRoleById);
router.post("/set", authenticateJwtToken, rolesController.createRole);
router.put("/update/:id", authenticateJwtToken, rolesController.updateRole);
router.delete("/delete/:id", authenticateJwtToken, rolesController.deleteRole);

module.exports = router;