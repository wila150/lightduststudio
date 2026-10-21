const express = require("express");
const router = express.Router();

const messageController = require("../../controllers/cms/messageController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");

router.use(requireAuth);
router.use(resolveTenant);

// 留言列表
router.get("/", messageController.index);

// 匯出 CSV（要放在 /:id/... 之前，避免被誤判成 :id）
router.get("/export.csv", messageController.exportCsv);

// 收件匣批次操作、全部已讀（JSON，要放在 /:id/... 之前）
router.post("/bulk", messageController.bulk);
router.post("/read-all", messageController.readAll);

// 批次刪除（要放在 /:id/delete 之前，避免路由衝突）
router.post("/delete-many", messageController.removeMany);

// 標記／取消標記已讀
router.post("/:id/read", messageController.toggleRead);

// 刪除留言
router.post("/:id/delete", messageController.remove);

module.exports = router;
