// 前台頁面快取（2026/10/20）：
// 前台每次開頁都要從 Firestore 讀全部自訂頁面、設定、導覽列，還有整批已發布作品（導覽列下拉分類、首頁精選都要），
// 一次動輒幾百筆讀取；Render 主機在美國、Firestore 在台灣，讀回來的資料還要付跨洲傳輸費。
// 10 月帳單：讀取 424 萬次 $36、跨洲傳輸 19GB $35。
// 改成把整頁 HTML 存在記憶體，30 分鐘內同一個網址直接回存好的內容；後台只要有任何儲存／刪除（非 GET 請求）就整個清空，
// 所以後台改完前台馬上看得到。排程發布的作品最多晚 30 分鐘出現
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500; // 爬蟲亂打網址時記憶體不會無限長大

const store = new Map(); // url → { body, type, status, at }

function get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > TTL_MS) {
        store.delete(key);
        return null;
    }
    return entry;
}

function set(key, entry) {
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
    store.set(key, { ...entry, at: Date.now() });
}

function clearPageCache() {
    store.clear();
}

// 掛在前台 GET 路由上：有快取直接回，沒有就照常跑 controller，把 200／404 的結果存起來
function pageCache(req, res, next) {

    const key = req.originalUrl;
    const cached = get(key);

    if (cached) {
        if (cached.type) res.type(cached.type);
        return res.status(cached.status).send(cached.body);
    }

    const send = res.send.bind(res);

    res.send = body => {
        if ((res.statusCode === 200 || res.statusCode === 404) && typeof body === "string") {
            set(key, { body, type: res.get("Content-Type"), status: res.statusCode });
        }
        return send(body);
    };

    next();

}

// 後台任何寫入（新增／編輯／刪除／排序…）成功後清空前台快取
function clearOnCmsWrite(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.on("finish", () => {
            if (res.statusCode < 400) clearPageCache();
        });
    }
    next();
}

module.exports = { pageCache, clearOnCmsWrite, clearPageCache, getCached: get, setCached: set };
