const settingsService = require("./settingsService");
const { DEFAULT_TENANT_ID } = require("../config/tenant");

// 可在「網站設定 → 功能開關」打開或關閉的功能。關閉時：後台選單隱藏、前台路由回 404、
// 相關模組不出現在「新增模組」清單，已經放在頁面上的同類模組也不顯示（資料保留，重新打開就回來）
const FEATURES = [
    { key: "booking", label: "線上預約", description: "預約管理、服務項目、預約人員、預約設定，以及頁面上的「線上預約區塊」模組" },
    { key: "line", label: "LINE 整合", description: "LINE 官方帳號 webhook（客人在 LINE 的訊息進到留言）與新留言推播到 LINE" },
    { key: "sponsorMarquee", label: "合作品牌跑馬燈", description: "「圖片跑馬燈（贊助商）」模組" },
    { key: "blog", label: "文章／部落格", description: "自訂頁面可建立「文章」類型的集合頁（列表與內頁顯示日期、作者）" }
];

const DEFAULT_FEATURES = FEATURES.reduce((map, f) => ({ ...map, [f.key]: false }), {});

// 模組類型 → 需要打開的功能
const MODULE_FEATURE = { bookingWidget: "booking", sponsorMarquee: "sponsorMarquee" };

// 每個請求都要判斷功能開關，設定存在 Firestore，快取 30 秒避免每次都讀；後台儲存設定時會立刻清掉快取
const TTL_MS = 30 * 1000;
let cache = { ...DEFAULT_FEATURES };
let loadedAt = 0;

async function load(force) {
    if (!force && Date.now() - loadedAt < TTL_MS) return cache;
    const settings = await settingsService.get(DEFAULT_TENANT_ID);
    cache = { ...DEFAULT_FEATURES, ...(settings.features || {}) };
    loadedAt = Date.now();
    return cache;
}

function invalidate() {
    loadedAt = 0;
}

// 同步讀目前快取的值（middleware 已在每個請求開始時刷新過），給 view 這類同步函式用
function enabled(key) {
    return !!cache[key];
}

function moduleAllowed(type) {
    const feature = MODULE_FEATURE[type];
    return !feature || enabled(feature);
}

// 每個請求先刷新快取，view 裡就能直接用 enabled()
async function middleware(req, res, next) {
    try {
        res.locals.features = await load(false);
    } catch (error) {
        console.error("feature flags load failed:", error);
    }
    next();
}

// 功能關閉時整個路由當作不存在
function requireFeature(key) {
    return (req, res, next) => (enabled(key) ? next() : res.status(404).send("Not found"));
}

module.exports = { FEATURES, DEFAULT_FEATURES, load, invalidate, enabled, moduleAllowed, middleware, requireFeature };
