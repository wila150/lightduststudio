const express = require("express");
const multer = require("multer");
const router = express.Router();

const mediaController = require("../../controllers/cms/mediaController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");
const imageConfig = require("../../config/imageConfig");

router.use(requireAuth);
router.use(resolveTenant);

// 根據圖片配置設置 multer 的上傳限制
const upload = multer({
    storage: multer.memoryStorage(),
    // 設置最大檔案大小為 2MB（符合圖片規格）
    limits: { fileSize: imageConfig.upload.maxFileSize },
    fileFilter: (req, file, cb) => {
        // 驗證 MIME 類型
        if (!imageConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error(imageConfig.errors.invalidMimeType));
        }
        cb(null, true);
    }
});

// 媒體庫列表
router.get("/", mediaController.index);

// 媒體庫清單（JSON，供圖片選擇器彈窗使用）
router.get("/list.json", mediaController.list);

// 相簿總覽（JSON，選擇器彈窗用資料夾方式瀏覽：每個相簿的封面與張數）
router.get("/albums.json", mediaController.albumsSummary);

// 上傳檔案（可一次選取/拖放多張）
router.post("/upload", upload.array("files", 30), mediaController.upload);

// 從 Google 雲端硬碟匯入（body 是 JSON，走 express.json()，不經過 multer）
router.post("/import-from-drive", mediaController.importFromDrive);

// 相簿管理（要放在 /:id/... 之前，避免 "albums" 被誤判成檔案 id）
// 上傳資料夾時自動建立相簿（同名就沿用），要放在 /albums/:albumId 之前，避免被當成相簿 id
router.post("/albums/ensure", express.json(), mediaController.ensureAlbum);
router.post("/albums", mediaController.createAlbum);
router.post("/albums/:albumId", mediaController.updateAlbum);
router.post("/albums/:albumId/delete", mediaController.removeAlbum);

// 批次把選取的檔案移到某個相簿
router.post("/move-to-album", mediaController.moveToAlbum);

// 批次刪除（要放在 /:id/delete 之前，避免路由衝突）
router.post("/delete-many", mediaController.removeMany);

// 刪除單一檔案
router.post("/:id/delete", mediaController.remove);

// 更新 alt 文字
router.post("/:id/alt", mediaController.updateAlt);

module.exports = router;
