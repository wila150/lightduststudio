const messageService = require("../../services/messageService");
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
