require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase
require("./config/firebase");

// ===== Middleware =====

app.set("trust proxy", 1);

// 安全性標頭（防 clickjacking、MIME sniffing 等），CSP 先關閉避免擋到既有的 inline script/外部資源（Google 字型、GA、Firebase SDK 等）。
// referrerPolicy 明確設回瀏覽器原本的預設值：helmet 預設是 no-referrer，會把 Referer 標頭整個拿掉，
// 導致嵌入的 YouTube 影片播放器抓不到來源網域驗證失敗（錯誤 153）
// crossOriginOpenerPolicy 也明確放寬：helmet 預設是 same-origin，會切斷彈出視窗跟開啟它的分頁之間的關聯，
// 導致 Google Identity Services（媒體庫的雲端硬碟匯入用的那個）跳出登入彈窗完成授權後，沒辦法把權杖傳回原本的分頁
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// 壓縮回應內容
app.use(compression());

// 解析表單
app.use(express.urlencoded({ extended: true }));

// 解析 JSON。順便保留原始 bytes 到 req.rawBody——LINE webhook 驗證簽章要用完全沒被重新序列化過的原始 body，
// JSON.parse 再 JSON.stringify 一輪可能因為欄位順序/空白差異導致算出來的簽章對不上
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Express 5 的 body-parser 2.x 遇到 Content-Type 對不上（例如非表單、非 JSON 的請求）時，
// req.body 會維持 undefined 而不是像舊版那樣退回 {}，controller 直接讀 req.body.xxx 會整台當機
app.use((req, res, next) => {
    if (req.body === undefined) {
        req.body = {};
    }
    next();
});

// Session
app.use(
    session({
        // 登入狀態存 Firestore，部署／休眠重啟不會被登出（services/firestoreSessionStore.js）
        store: new (require("./services/firestoreSessionStore"))(),
        secret: process.env.SESSION_SECRET || "PortfolioWebCMS",
        resave: false,
        saveUninitialized: false,
        // 每次操作都延長有效期（24 小時沒動作才會登出）
        rolling: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 24 小時
            sameSite: "lax"
        }
    })
);

// 靜態檔案（CSS/JS 常常在改，快取設短一點避免使用者一直看到舊版本；圖片/影片大多走 Firebase Storage 不是這裡）
app.use(express.static("public", { maxAge: "1d" }));


// ===== Routes =====

// 前台
// 功能開關：每個請求先刷新（有快取），後面的路由與 view 才能判斷哪些功能要隱藏
const featureService = require("./services/featureService");
app.use(featureService.middleware);

app.use("/", require("./routes/public"));

// CMS
// 前台訪客追蹤（即時統計用）
app.use("/api/track", require("./routes/track"));
// 給 AI 搜尋讀的網站導覽（GEO）
app.use("/", require("./routes/llms"));
// 後台有任何寫入就清空前台頁面快取（middleware/pageCache.js）
app.use("/cms", require("./middleware/pageCache").clearOnCmsWrite);
app.use("/cms", require("./routes/cms/auth"));
app.use("/cms/pages", require("./routes/cms/sitePage")("home"));
app.use("/cms/media", require("./routes/cms/media"));
app.use("/cms/custom-pages", require("./routes/cms/customPage"));
app.use("/cms/nav-items", require("./routes/cms/navItem"));
app.use("/cms/messages", require("./routes/cms/message"));
app.use("/cms/settings", require("./routes/cms/setting"));
app.use("/cms/booking-services", featureService.requireFeature("booking"), require("./routes/cms/serviceItem"));
app.use("/cms/staff", featureService.requireFeature("booking"), require("./routes/cms/staff"));
app.use("/cms/booking-settings", featureService.requireFeature("booking"), require("./routes/cms/bookingSettings"));
app.use("/cms/bookings", featureService.requireFeature("booking"), require("./routes/cms/booking"));
app.use("/cms/admins", require("./routes/cms/adminAccount"));
app.use("/cms/help", require("./routes/cms/help"));
app.use("/cms", require("./routes/cms/analytics"));
app.use("/cms/trash", require("./routes/cms/trash"));
app.use("/cms/equipment", require("./routes/cms/equipment"));

// 404：以上路由都沒對到。CMS 底下顯示簡單訊息，前台顯示品牌化 404 頁
app.use("/cms", (req, res) => {
    res.status(404).send(`
        <div style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;">
            <h2>找不到這個頁面</h2>
            <p><a href="/cms">回到後台首頁</a></p>
        </div>
    `);
});

app.use(require("./controllers/homeController").notFoundCatchAll);

// 統一錯誤處理（例如 multer 檔案類型/大小檢查失敗），避免直接把堆疊資訊丟給使用者看
app.use((err, req, res, next) => {

    console.error(err);

    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).send(`
            <div style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;">
                <h2>檔案太大</h2>
                <p>圖片請控制在 15MB 以內、影片請控制在 20MB 以內。</p>
                <p>剛才填寫的內容尚未儲存，請返回上一頁重新選擇檔案後再送出一次。</p>
                <button onclick="history.back()" style="padding:10px 24px;">返回上一頁</button>
            </div>
        `);
    }

    const message = process.env.NODE_ENV === "production" ? "發生錯誤，請稍後再試" : (err.message || "發生錯誤，請稍後再試");

    res.status(500).send(`
        <div style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;">
            <h2>發生錯誤</h2>
            <p>${message}</p>
            <button onclick="history.back()" style="padding:10px 24px;">返回上一頁</button>
        </div>
    `);

});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
