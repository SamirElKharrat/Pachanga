const usersController = require('../../controllers/userController');
const router = require("express").Router();
const { authenticateJwtToken } = require('../../middlewares/auth');


router.get("/get", authenticateJwtToken, usersController.getAllUsers);
router.get("/get/:id", authenticateJwtToken, usersController.getUserById);
router.get("/getToken", authenticateJwtToken, usersController.getUserByToken);
router.post("/register", usersController.createUser);
router.post("/login", usersController.loginUser);
router.post("/logout", authenticateJwtToken, usersController.logoutUser);
router.put("/update/:id", authenticateJwtToken, usersController.updateUser);
router.put("/changePassword/:id", authenticateJwtToken, usersController.changePassword);
router.delete("/delete/:id", authenticateJwtToken, usersController.deleteUser);
router.get("/protected", authenticateJwtToken, usersController.protectedRoute);
router.get("/admin", authenticateJwtToken, usersController.adminRoute);
router.put("/resetPassword/:id", authenticateJwtToken, usersController.resetPassword);

module.exports = router;