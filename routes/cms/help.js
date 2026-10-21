const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/requireAuth");
const helpView = require("../../views/cms/help");

router.use(requireAuth);

// 後台使用說明（靜態內容，不用查資料庫）
router.get("/", (req, res) => res.send(helpView()));

module.exports = router;
