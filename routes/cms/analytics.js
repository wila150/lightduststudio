const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");
const liveHub = require("../../services/liveHub");
const analyticsService = require("../../services/analyticsService");
const messageService = require("../../services/messageService");
const analyticsView = require("../../views/cms/analytics");

router.use(requireAuth);
router.use(resolveTenant);

// 即時統計頁
router.get("/analytics", (req, res) => res.send(analyticsView()));

// 統計數字（JSON）
router.get("/analytics/summary.json", async (req, res) => {
    res.json(await analyticsService.summary(req.tenantId));
});

// 即時通道（Server-Sent Events）：每個開著的後台分頁都連一條，收新留言、訪客動態
router.get("/live/stream", async (req, res) => {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.flushHeaders();
    res.write("retry: 3000\n\n");
    await analyticsService.ensureLabels(req.tenantId);
    liveHub.send(res, "hello", { unread: await messageService.unreadCount(req.tenantId), ...liveHub.snapshot() });
    liveHub.addClient(res);
});

module.exports = router;
