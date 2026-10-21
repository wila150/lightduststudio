const express = require("express");
const multer = require("multer");
const router = express.Router();

const controller = require("../../controllers/cms/equipmentController");
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
router.post("/", upload.single("photo"), controller.create);

// 拖拉排序要放在 /:id 之前，避免路由衝突
router.post("/reorder", controller.reorder);

router.post("/:id", controller.update);
router.post("/:id/photo", upload.single("photo"), controller.uploadPhoto);
router.post("/:id/photo/from-media", controller.setPhotoFromMedia);
router.post("/:id/delete", controller.remove);

module.exports = router;
