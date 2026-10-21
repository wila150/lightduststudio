const express = require("express");
const router = express.Router();

const authController = require("../../controllers/cms/authController");
const { loginLimiter } = require("../../middleware/rateLimiters");

// Login
router.get("/login", authController.showLogin);

router.post("/login", loginLimiter, authController.login);

// Google 登入（伺服器端整頁導轉流程）
router.get("/login/google", loginLimiter, authController.googleLoginRedirect);
router.get("/login/google/callback", loginLimiter, authController.googleLoginCallback);

// Dashboard
router.get("/", authController.dashboard);
router.post("/quick-links", authController.updateQuickLinks);

// 修改密碼
router.get("/change-password", authController.showChangePassword);

// Logout
router.get("/logout", authController.logout);

module.exports = router;