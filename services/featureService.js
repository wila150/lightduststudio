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

// 每個請求（包含爬蟲亂掃的 404）都要判斷功能開關，不能每次都讀 Firestore：
// 快取 30 分鐘，跟前台頁面快取一起過期；後台任何寫入都會連同頁面快取一起清掉（pageCache.onClear）
const TTL_MS = 30 * 60 * 1000;
let cache = { ...DEFAULT_FEATURES };
let loadedAt = 0;

let inflight = null;

async function load(force) {
    if (!force && Date.now() - loadedAt < TTL_MS) return cache;
    // 快取剛過期時同時進來很多請求，只讀一次 Firestore
    inflight = inflight || settingsService.get(DEFAULT_TENANT_ID).then(settings => {
        cache = { ...DEFAULT_FEATURES, ...(settings.features || {}) };
        loadedAt = Date.now();
        return cache;
    }).finally(() => { inflight = null; });
    return inflight;
}

function invalidate() {
    loadedAt = 0;
}

require("../middleware/pageCache").onClear(invalidate);

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
