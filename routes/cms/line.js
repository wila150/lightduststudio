const express = require("express");
const multer = require("multer");
const router = express.Router();

const controller = require("../../controllers/cms/lineController");
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

router.get("/", controller.index);
router.post("/replies", controller.saveReplies);
router.post("/rich-menu", upload.single("image"), controller.publishRichMenu);
router.post("/broadcast/image", upload.single("image"), controller.uploadBroadcastImage);
router.post("/broadcast", controller.broadcast);

module.exports = router;
