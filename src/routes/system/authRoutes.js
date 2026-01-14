const express = require("express");
const router = express.Router();
const authController = require("../../controllers/system/authControllers");
const { isAuthenticated } = require("../../middlewares/authMiddleware");

console.log("System Auth Routes Loaded...");
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/verify-email", authController.verifyEmail);

router.get("/me", isAuthenticated, authController.getMe);

module.exports = router;