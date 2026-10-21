const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");
const trashService = require("../../services/trashService");

router.use(requireAuth);
router.use(resolveTenant);

// 最近刪除清單（JSON）：?collections=pageItems,pageCategories&pageId=xxx
router.get("/list.json", async (req, res) => {
    const collections = req.query.collections ? String(req.query.collections).split(",") : null;
    res.json({ entries: await trashService.list(req.tenantId, { collections, pageId: req.query.pageId || "" }) });
});

// 復原：用原本的 id 放回原來的地方
router.post("/:id/restore", async (req, res) => {
    const restored = await trashService.restore(req.tenantId, req.params.id);
    res.status(restored ? 200 : 404).json({ success: !!restored, restored });
});

// 永久刪除：連照片檔案一起刪掉，無法復原
router.post("/:id/purge", async (req, res) => {
    const done = await trashService.purge(req.tenantId, req.params.id);
    res.status(done ? 200 : 404).json({ success: done });
});

module.exports = router;
