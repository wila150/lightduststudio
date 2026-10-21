const express = require("express");
const multer = require("multer");
const router = express.Router();

const settingsController = require("../../controllers/cms/settingsController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");

router.use(requireAuth);
router.use(resolveTenant);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("只允許上傳圖片檔案"));
        }
        cb(null, true);
    }
});

// 字體檔案不是圖片 mimetype，瀏覽器/系統回報的 mimetype 也不一致（有時是 application/octet-stream），
// 改用副檔名判斷比對 mimetype 更可靠
const uploadFont = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!/\.(ttf|otf|woff2?)$/i.test(file.originalname)) {
            return cb(new Error("只允許上傳 .ttf / .otf / .woff / .woff2 字體檔"));
        }
        cb(null, true);
    }
});

// 網站設定
router.get("/", settingsController.edit);
router.post("/", settingsController.update);

// 上傳/移除導覽列 Logo 圖片
router.post("/logo", upload.single("logo"), settingsController.uploadLogo);
router.post("/logo/from-media", settingsController.setLogoFromMedia);
router.post("/logo/delete", settingsController.removeLogo);

// 上傳/移除瀏覽器分頁圖示（favicon）
router.post("/favicon", upload.single("favicon"), settingsController.uploadFavicon);
router.post("/favicon/from-media", settingsController.setFaviconFromMedia);
router.post("/favicon/delete", settingsController.removeFavicon);

// 上傳/移除社群分享圖（Open Graph image）
router.post("/og-image", upload.single("ogImage"), settingsController.uploadOgImage);
router.post("/og-image/from-media", settingsController.setOgImageFromMedia);
router.post("/og-image/delete", settingsController.removeOgImage);

// 測試 LINE 官方帳號連線
router.post("/line/test", settingsController.testLine);

// 自訂配色範本：存目前配色／套用／刪除
router.post("/color-presets", settingsController.savePreset);
router.post("/color-presets/:presetId/apply", settingsController.applyPreset);
router.post("/color-presets/:presetId/delete", settingsController.deletePreset);

// 字體庫：上傳自訂字體檔／刪除
router.post("/fonts", uploadFont.single("fontFile"), settingsController.uploadFont);
router.post("/fonts/:id/delete", settingsController.deleteFont);

module.exports = router;
