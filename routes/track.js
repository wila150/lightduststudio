const express = require("express");
const router = express.Router();

const { DEFAULT_TENANT_ID } = require("../config/tenant");
const liveHub = require("../services/liveHub");
const analyticsService = require("../services/analyticsService");

// 前台訪客追蹤（2026/10/03，移植自 lightdustudio）：匿名訪客 id（瀏覽器自己產生）＋網址，
// 不存 IP、不存個資；機器人、後台、預覽、管理員自己的瀏覽器（前端會跳過）都不算
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|line-poker|curl|wget|python-requests|render/i;
const lastInsert = new Map(); // 同一個訪客短時間重複送出就忽略

function cleanPath(raw) {
    let path = String(raw || "").split(/[?#]/)[0];
    try { path = decodeURI(path); } catch (error) { return null; }
    if (!path.startsWith("/") || path.length > 200 || path.startsWith("/cms") || path.startsWith("/api")) return null;
    if (path.length > 1) path = path.replace(/\/+$/, "");
    return path || "/";
}

router.post("/", (req, res) => {

    res.status(204).end();

    if (BOT_UA.test(req.get("user-agent") || "")) return;

    const { vid, type, path: rawPath } = req.body || {};
    if (typeof vid !== "string" || !/^[\w-]{8,40}$/.test(vid)) return;
    const path = cleanPath(rawPath);
    if (!path) return;

    liveHub.touchVisitor(vid, path);
    if (type !== "view") return; // ping 只更新「目前在線」

    const now = Date.now();
    const key = vid + ":" + path;
    if (now - (lastInsert.get(key) || 0) < 3000) return;
    lastInsert.set(key, now);
    if (lastInsert.size > 5000) lastInsert.clear();

    analyticsService.recordView(DEFAULT_TENANT_ID, vid, path).catch(error => console.warn("[track]", error.message));

});

module.exports = router;
