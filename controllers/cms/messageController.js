const messageService = require("../../services/messageService");
const settingsService = require("../../services/settingsService");
const lineService = require("../../services/lineService");
const mailService = require("../../services/mailService");
const messagesView = require("../../views/cms/messages");
const { formatDisplayDate } = require("../../services/publishHelper");

// 留言收件匣：篩選（未讀／星號／來源）、搜尋都在瀏覽器裡做，見 views/cms/messages.js
exports.index = async (req, res) => {

    res.send(messagesView(await messageService.list(req.tenantId)));

};

// 收件匣批次操作（JSON）：read｜unread｜star｜unstar｜delete，回傳最新的未讀數給畫面更新紅點
exports.bulk = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(id => typeof id === "string") : [];
    const action = req.body.action;
    const FIELDS = { read: { read: true }, unread: { read: false }, star: { starred: true }, unstar: { starred: false } };

    try {
        if (action === "delete") await messageService.removeMany(req.tenantId, ids);
        else if (FIELDS[action]) await messageService.updateMany(req.tenantId, ids, FIELDS[action]);
        else return res.status(400).json({ success: false });
        res.json({ success: true, unread: await messageService.unreadCount(req.tenantId) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }

};

// 從後台回覆 LINE 客人：留言名稱裡帶著客人的 User ID（「LINE - 小明（Uxxxx）」），用官方帳號推播給他。
// 推播會算每月訊息額度；回覆內容記在這則留言的 replies 裡，後台看得到回過什麼
exports.lineReply = async (req, res) => {

    const text = String(req.body.text || "").trim().slice(0, 4900);

    if (!text) {
        return res.status(400).json({ error: "請輸入回覆內容" });
    }

    const message = await messageService.get(req.tenantId, req.params.id);
    const match = message && String(message.name || "").match(/（(U[0-9a-f]{32})）/);

    if (!match) {
        return res.status(400).json({ error: "這則留言不是從 LINE 來的，沒辦法用 LINE 回覆" });
    }

    const settings = await settingsService.get(req.tenantId);
    const accessToken = await lineService.getAccessToken(settings);

    if (!accessToken) {
        return res.status(400).json({ error: "尚未設定 LINE 連線（網站設定 → LINE）" });
    }

    const result = await lineService.pushText(accessToken, match[1], text);

    if (!result.success) {
        const reason = result.status === 429 ? "本月推播額度已用完" : result.status === 400 || result.status === 403 ? "客人可能已封鎖官方帳號" : "LINE 暫時無法傳送";
        return res.status(400).json({ error: `傳送失敗：${reason}` });
    }

    const reply = { text, at: new Date().toISOString(), by: (req.session.user && req.session.user.name) || "", via: "line" };
    await messageService.addReply(req.tenantId, req.params.id, reply);

    res.json({ success: true, reply });

};

// 從後台用工作室 Gmail 回覆網站表單的留言（services/mailService.js），回覆內容一樣記在 replies
exports.emailReply = async (req, res) => {

    const text = String(req.body.text || "").trim().slice(0, 10000);

    if (!text) {
        return res.status(400).json({ error: "請輸入回覆內容" });
    }

    const message = await messageService.get(req.tenantId, req.params.id);

    if (!message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email || "")) {
        return res.status(400).json({ error: "這則留言沒有 Email，沒辦法用 Email 回覆" });
    }

    const settings = await settingsService.get(req.tenantId);
    const createdAt = message.createdAt && message.createdAt.toDate ? message.createdAt.toDate() : null;

    try {
        await mailService.sendReply({
            to: message.email,
            toName: message.name,
            subject: `Re: ${message.subject || "您的詢問"}｜${require("../../config/brand").name}`,
            text,
            original: message.message,
            originalAt: createdAt ? createdAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }) : "",
            phone: settings.contactPhone
        });
    } catch (error) {
        console.error("Email reply failed:", error);
        const reason = /Invalid login|Username and Password|535/.test(error.message || "") ? "Gmail 登入失敗，請確認應用程式密碼" : (error.message || "寄送失敗");
        return res.status(400).json({ error: `寄送失敗：${reason}` });
    }

    const reply = { text, at: new Date().toISOString(), by: (req.session.user && req.session.user.name) || "", via: "email" };
    await messageService.addReply(req.tenantId, req.params.id, reply);

    res.json({ success: true, reply });

};

// 全部標為已讀（JSON）
exports.readAll = async (req, res) => {

    const changed = await messageService.markAllRead(req.tenantId);

    res.json({ success: true, changed, unread: 0 });

};

// 標記／取消標記已讀，留言列表頁點一下就切換，切完導回原本的篩選頁籤
exports.toggleRead = async (req, res) => {

    await messageService.setRead(req.tenantId, req.params.id, req.body.read === "1");

    res.redirect(`/cms/messages${req.query.filter === "today" ? "?filter=today" : ""}`);

};

// 匯出全部留言名單成 CSV，方便匯入 Excel／其他系統
exports.exportCsv = async (req, res) => {

    const messages = await messageService.list(req.tenantId);

    // CSV 欄位含逗號/雙引號/換行的話要用雙引號包起來，裡面的雙引號要跳脫成兩個雙引號
    const escapeCsvField = value => `"${String(value == null ? "" : value).replace(/"/g, '""')}"`;

    const rows = [
        ["姓名", "Email", "主旨", "訊息", "已讀", "時間"],
        ...messages.map(message => {
            const createdAt = message.createdAt && message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
            return [message.name, message.email, message.subject || "", message.message, message.read ? "是" : "否", formatDisplayDate(createdAt)];
        })
    ];

    const csv = rows.map(row => row.map(escapeCsvField).join(",")).join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"messages.csv\"");
    // BOM 讓 Excel 開啟時能正確辨識 UTF-8 中文，不會變亂碼
    res.send("﻿" + csv);

};

// 刪除留言
exports.remove = async (req, res) => {

    await messageService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/messages");

};

// 批次刪除留言
exports.removeMany = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await messageService.removeMany(req.tenantId, ids);
    }

    res.redirect("/cms/messages");

};
