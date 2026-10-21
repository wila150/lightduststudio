const express = require("express");
const router = express.Router();

const controller = require("../../controllers/cms/bookingController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");

router.use(requireAuth);
router.use(resolveTenant);

router.get("/", controller.index);

router.get("/new", controller.newForm);
router.post("/", controller.create);

// 批次刪除（要放在 /:id 之前，避免路由衝突）
router.post("/delete-many", controller.removeMany);

router.post("/:id/cancel", controller.cancel);
router.post("/:id/reschedule", controller.reschedule);
router.post("/:id/delete", controller.remove);

module.exports = router;
