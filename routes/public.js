const express = require("express");
const { requireFeature } = require("../services/featureService");
const router = express.Router();

const homeController = require("../controllers/homeController");
const sitemapController = require("../controllers/sitemapController");
const { publicFormLimiter } = require("../middleware/rateLimiters");
const { pageCache } = require("../middleware/pageCache");

// SEO：網站地圖與爬蟲規則
router.get("/sitemap.xml", pageCache, sitemapController.sitemap);
router.get("/robots.txt", sitemapController.robots);

// 首頁
router.get("/", pageCache, homeController.home);

// 自訂字體檔案（同網域代理 Firebase Storage，避免跨網域字體被瀏覽器擋掉，見 controller 註解）
router.get("/fonts/:id", homeController.serveFont);

// 舊網址轉址（改版前的固定頁面網址），保留 SEO 排名權重不流失
// 對應的新自訂頁面 slug 要剛好是 about/contact/booking/projects/blog 才會生效
router.get("/about", (req, res) => res.redirect(301, "/p/about"));
router.get("/contact", (req, res) => res.redirect(301, "/p/contact"));
router.get("/booking", requireFeature("booking"), (req, res) => res.redirect(301, "/p/booking"));
router.get("/projects", (req, res) => res.redirect(301, "/p/projects"));
router.get("/blog", (req, res) => res.redirect(301, "/p/blog"));
// 舊的單一作品/文章網址沒有一對一搬過去的新網址，一律導回清單頁
router.get("/projects/:id", (req, res) => res.redirect(301, "/p/projects"));
router.get("/blog/:slug", (req, res) => res.redirect(301, "/p/blog"));

// 舊版 LightDust（2026/10 搬進這套系統前）的網址：社群分享過、Google 收錄過的連結繼續有效
router.get("/photography", (req, res) => res.redirect(301, "/p/photography"));
router.get("/film", (req, res) => res.redirect(301, "/p/film"));
router.get("/design", (req, res) => res.redirect(301, "/p/graphic-design"));
router.get("/services", (req, res) => res.redirect(301, "/p/services"));
router.get("/equipment", (req, res) => res.redirect(301, "/p/equipment"));
router.get(/^\/(about|contact|photography|film|design|services|equipment)\.html$/, (req, res) => res.redirect(301, "/" + req.params[0]));
router.get("/pages/:slug", (req, res) => res.redirect(301, "/p/" + encodeURIComponent(req.params.slug)));
// 作品內頁：舊網址 /work/16 → 搬家時記在作品上的 legacyId（scripts/migrateFromLightdustV1.js）
router.get("/work/:id", homeController.legacyWorkRedirect);

// 聯絡我表單送出（聯絡我頁面本身是自訂頁面 /p/contact，用 contactForm 模組）
router.post("/contact", publicFormLimiter, homeController.submitContact);

// LINE 官方帳號 webhook（在 LINE Developers 後台的 Messaging API 分頁設定這個網址），不能加表單那組
// rate limiter——LINE 可能一次送一批事件過來，而且請求本身有簽章驗證把關，不是給一般訪客打的端點
router.post("/line/webhook", requireFeature("line"), homeController.lineWebhook);

// 線上預約 API（預約頁面本身是自訂頁面 /p/booking，用 bookingWidget 模組）
router.get("/booking/availability", requireFeature("booking"), homeController.bookingAvailability);
router.post("/booking", requireFeature("booking"), publicFormLimiter, homeController.submitBooking);

// 自訂頁面（一般內容頁／分類清單頁清單）
router.get("/p/:slug", pageCache, homeController.customPage);

// 分類清單頁底下的單一項目詳細頁
router.get("/p/:slug/:itemSlug", pageCache, homeController.collectionItemDetail);

module.exports = router;
