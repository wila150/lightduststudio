const express = require("express");
const multer = require("multer");

const { createHandlers } = require("../../controllers/cms/sitePageController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");

// 首頁主圖限 5MB；主影片檔案大很多，這裡統一放寬到 20MB（Firebase Storage 空間/流量會因此增加，影片建議先壓縮成短的循環片段）
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {

        if (file.fieldname === "heroVideo") {

            if (!file.mimetype.startsWith("video/")) {
                return cb(new Error("只允許上傳影片檔案"));
            }

            return cb(null, true);

        }

        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("只允許上傳圖片檔案"));
        }

        cb(null, true);

    }
});

// 產生首頁/關於我/聯絡我共用的一組 CMS 路由，pageId 是 "home"/"about"/"contact"
module.exports = (pageId) => {

    const router = express.Router();
    const handlers = createHandlers(pageId);

    router.use(requireAuth);
    router.use(resolveTenant);

    router.get("/", handlers.edit);
    router.post("/", upload.fields([{ name: "heroImage", maxCount: 1 }, { name: "heroVideo", maxCount: 1 }, { name: "heroLogo", maxCount: 1 }]), handlers.update);

    router.post("/modules", handlers.addModule);
    // 拖拉排序要放在 /modules/:moduleId 之前，避免路由衝突（不然 "/modules/reorder" 會被 "/modules/:moduleId" 吃掉）
    router.post("/modules/reorder", handlers.reorderModules);
    // 模組編輯表單是用 fetch(FormData) 送出的（即時預覽面板攔截了 submit），
    // 瀏覽器對 FormData body 一律用 multipart/form-data，不管表單本身有沒有寫 enctype，
    // 所以這裡要有 multer 才能解析出 req.body（只收文字欄位，模組表單裡的 file input 都沒有 name，不會真的收到檔案）
    router.post("/modules/:moduleId", upload.none(), handlers.updateModule);
    router.post("/modules/:moduleId/delete", handlers.removeModule);
    router.post("/modules/:moduleId/move", handlers.moveModule);

    return router;

};
