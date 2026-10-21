const usersController = require('../../controllers/userController');
const router = require("express").Router();
const { authenticateJwtToken, requireAdmin, requireSelfOrAdmin } = require('../../middlewares/auth');


router.get("/get", authenticateJwtToken, usersController.getAllUsers);
router.get("/get/:id", authenticateJwtToken, usersController.getUserById);
router.get("/getToken", authenticateJwtToken, usersController.getUserByToken);
// Las cuentas solo las crea un admin, desde el panel. Antes era público y además
// leía el rol del body: cualquiera podía darse de alta como administrador.
router.post("/register", authenticateJwtToken, requireAdmin, usersController.createUser);
router.post("/login", usersController.loginUser);
router.post("/logout", authenticateJwtToken, usersController.logoutUser);
// Tu perfil lo tocas tú; el de los demás, solo un admin.
router.put("/update/:id", authenticateJwtToken, requireSelfOrAdmin, usersController.updateUser);
router.put("/changePassword/:id", authenticateJwtToken, requireSelfOrAdmin, usersController.changePassword);
router.delete("/delete/:id", authenticateJwtToken, requireAdmin, usersController.deleteUser);
router.get("/protected", authenticateJwtToken, usersController.protectedRoute);
router.get("/admin", authenticateJwtToken, usersController.adminRoute);
router.put("/resetPassword/:id", authenticateJwtToken, requireAdmin, usersController.resetPassword);

module.exports = router;