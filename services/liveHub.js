// 後台即時功能的中心（2026/10/03，移植自 lightdustudio）：
// 1. SSE 連線清單：新留言、訪客動態推給所有開著的後台分頁
// 2. 「目前在線」名單：最近 70 秒內有動作的訪客＋他在看哪一頁
// 只存在記憶體裡，Render 免費方案是單一程序，重新部署後在線名單會歸零（瀏覽統計另外存在 Firestore 不受影響）
const clients = new Set();
const visitors = new Map(); // visitorId → { lastSeen, path }
const ONLINE_WINDOW_MS = 70 * 1000;

let labelOf = path => path; // 由 analyticsService 設定：網址 → 頁面／作品名稱

function setLabeler(fn) {
    labelOf = fn;
}

function send(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    // 網站有開 compression，不 flush 的話事件會卡在壓縮緩衝區送不出去
    if (typeof res.flush === "function") res.flush();
}

function broadcast(event, data) {
    for (const res of clients) send(res, event, data);
}

function prune() {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    for (const [id, visitor] of visitors) if (visitor.lastSeen < cutoff) visitors.delete(id);
}

function snapshot() {
    prune();
    const perPath = new Map();
    for (const visitor of visitors.values()) perPath.set(visitor.path, (perPath.get(visitor.path) || 0) + 1);
    return {
        online: visitors.size,
        pages: [...perPath.entries()]
            .map(([path, count]) => ({ path, label: labelOf(path), count }))
            .sort((a, b) => b.count - a.count)
    };
}

function touchVisitor(id, path) {
    visitors.set(id, { lastSeen: Date.now(), path });
}

function addClient(res) {
    clients.add(res);
    res.on("close", () => clients.delete(res));
}

setInterval(() => {
    if (clients.size) broadcast("visitors", snapshot());
}, 5000).unref();

// 每 20 秒送一行註解保持連線，避免被 Render／瀏覽器當成閒置連線切斷
setInterval(() => {
    for (const res of clients) {
        res.write(": keep-alive\n\n");
        if (typeof res.flush === "function") res.flush();
    }
}, 20000).unref();

module.exports = { addClient, broadcast, send, snapshot, touchVisitor, setLabeler, labelOf: path => labelOf(path) };
