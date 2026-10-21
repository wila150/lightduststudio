const express = require("express");
const multer = require("multer");
const router = express.Router();

const controller = require("../../controllers/cms/staffController");
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
router.get("/new", controller.newForm);
router.post("/", controller.create);

// 批次刪除（要放在 /:id 之前，避免路由衝突）
router.post("/delete-many", controller.removeMany);

router.get("/:id/edit", controller.editForm);
router.post("/:id", controller.update);
router.post("/:id/avatar", upload.single("avatar"), controller.updateAvatar);
router.post("/:id/avatar/from-media", controller.setAvatarFromMedia);
router.post("/:id/delete", controller.remove);

module.exports = router;
