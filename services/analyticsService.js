// 即時統計（2026/10/03，移植自 lightdustudio，資料改存 Firestore）
// 每天一份文件 analyticsDaily/{YYYY-MM-DD}（台灣時間）：
//   views：瀏覽次數、visitors：當天的訪客 id 清單（算不重複訪客）、
//   pages：{ 網址: 次數 }、items：{ 作品網址: 次數 }（作品內頁＝「熱門作品相簿」）
// 查近 7 天只要讀 7 份文件；網址當 Firestore 的 map key 要先編碼（不能有 . 和 /）
const { FieldValue } = require("firebase-admin/firestore");
const { tenantCollection } = require("../config/firebase");
const liveHub = require("./liveHub");

const encodeKey = path => encodeURIComponent(path).replace(/\./g, "%2E");
const decodeKey = key => decodeURIComponent(key);

function taiwanDate(offsetDays = 0) {
    return new Date(Date.now() + 8 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);
}

// ===== 網址 → 中文名稱（首頁、FILM、作品標題…），1 小時更新一次 =====
// 每次更新要讀全部作品，原本 5 分鐘一次、一天最多 288 次，太耗 Firestore 讀取
let labels = new Map([["/", "首頁"]]);
let labelsLoadedAt = 0;
let loading = null;

async function refreshLabels(tenantId) {
    const pages = (await tenantCollection(tenantId, "customPages").get()).docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const items = (await tenantCollection(tenantId, "pageItems").get()).docs.map(doc => doc.data());
    const next = new Map([["/", "首頁"], ["/booking", "線上預約"]]);
    const slugById = new Map();
    pages.forEach(page => {
        slugById.set(page.id, page.slug);
        next.set(`/p/${page.slug}`, [page.title, page.subtitle].filter(Boolean).join(" "));
    });
    items.forEach(item => {
        const pageSlug = slugById.get(item.pageId);
        if (pageSlug && item.slug) next.set(`/p/${pageSlug}/${item.slug}`, String(item.title || "").replace(/\s*\n\s*/g, " "));
    });
    labels = next;
    labelsLoadedAt = Date.now();
}

function labelOf(path) {
    return labels.get(path) || path;
}

function ensureLabels(tenantId) {
    if (Date.now() - labelsLoadedAt < 60 * 60 * 1000) return Promise.resolve();
    loading = loading || refreshLabels(tenantId).catch(error => console.warn("[analytics] labels", error.message)).finally(() => { loading = null; });
    return loading;
}

liveHub.setLabeler(labelOf);

function isItemPath(path) {
    return /^\/p\/[^/]+\/[^/]+$/.test(path);
}

async function recordView(tenantId, visitorId, path) {
    ensureLabels(tenantId);
    const update = {
        date: taiwanDate(),
        views: FieldValue.increment(1),
        visitors: FieldValue.arrayUnion(visitorId),
        pages: { [encodeKey(path)]: FieldValue.increment(1) }
    };
    if (isItemPath(path)) update.items = { [encodeKey(path)]: FieldValue.increment(1) };
    await tenantCollection(tenantId, "analyticsDaily").doc(taiwanDate()).set(update, { merge: true });
    liveHub.broadcast("view", { kind: isItemPath(path) ? "item" : "view", path, label: labelOf(path), ts: Date.now() });
}

function topEntries(maps, limit) {
    const total = new Map();
    maps.forEach(map => Object.entries(map || {}).forEach(([key, count]) => {
        const path = decodeKey(key);
        total.set(path, (total.get(path) || 0) + count);
    }));
    return [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([path, views]) => ({ path, label: labelOf(path), views }));
}

async function summary(tenantId) {
    await ensureLabels(tenantId);
    const days = [6, 5, 4, 3, 2, 1, 0].map(offset => taiwanDate(offset));
    const docs = await Promise.all(days.map(day => tenantCollection(tenantId, "analyticsDaily").doc(day).get()));
    const data = docs.map(doc => (doc.exists ? doc.data() : {}));
    const weekVisitors = new Set();
    data.forEach(d => (d.visitors || []).forEach(v => weekVisitors.add(v)));
    const today = data[data.length - 1];
    return {
        live: liveHub.snapshot(),
        today: { views: today.views || 0, visitors: (today.visitors || []).length },
        week: { views: data.reduce((sum, d) => sum + (d.views || 0), 0), visitors: weekVisitors.size },
        last7: days.map((date, i) => ({ date, views: data[i].views || 0, visitors: (data[i].visitors || []).length })),
        topPages: topEntries(data.map(d => d.pages), 8),
        topItems: topEntries(data.map(d => d.items), 8)
    };
}

module.exports = { recordView, summary, ensureLabels, labelOf };
