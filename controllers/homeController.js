const equipmentService = require("../services/equipmentService");
const featureService = require("../services/featureService");
const pageService = require("../services/pageService");
const customPageService = require("../services/customPageService");
const collectionService = require("../services/collectionService");
const messageService = require("../services/messageService");
const serviceItemService = require("../services/serviceItemService");
const staffService = require("../services/staffService");
const bookingService = require("../services/bookingService");
const lineService = require("../services/lineService");
const settingsService = require("../services/settingsService");
const fontService = require("../services/fontService");
const { bucket } = require("../config/firebase");
const { buildPublicContext } = require("../services/publicContext");
const { isEffectivelyPublished } = require("../services/publishHelper");
const { DEFAULT_TENANT_ID } = require("../config/tenant");
const { refreshCarousels } = require("../services/moduleTypes");
const { getCached, setCached } = require("../middleware/pageCache");

const FONT_MIME_BY_FORMAT = {
    woff2: "font/woff2",
    woff: "font/woff",
    truetype: "font/ttf",
    opentype: "font/otf"
};

const homeView = require("../views/home");
const customPageView = require("../views/customPage");
const collectionListView = require("../views/collectionList");
const collectionItemDetailView = require("../views/collectionItemDetail");
const notFoundView = require("../views/notFound");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 首頁
exports.home = async (req, res) => {

    const page = await pageService.getPage(DEFAULT_TENANT_ID, "home");
    const { navPages, settings, navItems } = await buildPublicContext(DEFAULT_TENANT_ID);

    // 精選作品：站上可能不只一個分類清單型自訂頁面（例如作品拆成 PHOTOGRAPHY／FILM 兩個獨立頁面），
    // 全部抓出來合併，每筆項目記得自己實際掛在哪個頁面下（href 才會對）。
    // 網站設定裡如果有手動勾選精選作品（featuredProjectIds），依那份清單的順序顯示；
    // 沒手動選（空陣列，或選的項目後來被刪除/下架）就退回舊行為：自動抓最新發布前 6 筆
    const collectionPages = await customPageService.getCollectionPages(DEFAULT_TENANT_ID, { publishedOnly: true });

    const itemsByPage = await Promise.all(
        collectionPages.map(async page => {
            const items = await collectionService.getPublishedItems(DEFAULT_TENANT_ID, page.id);
            return items.map(item => ({ ...item, href: `/p/${page.slug}/${item.slug}` }));
        })
    );

    const publishedItems = itemsByPage.flat();
    const featuredIds = settings.featuredProjectIds || [];
    const resolvedFeatured = featuredIds.map(id => publishedItems.find(item => item.id === id)).filter(Boolean);

    let featuredProjects;

    // 手動選的項目全部都對不到（例如都被刪除/下架）時，跟完全沒手動選一樣退回自動抓最新 6 筆，
    // 不要讓整個精選作品區塊因為舊資料失效而直接空白
    if (resolvedFeatured.length > 0) {

        featuredProjects = resolvedFeatured;

    } else {

        // 每個頁面自己的 sortOrder 只在該頁面內有意義，跨頁面合併時改用發布時間排序，才是真正「最新」的 6 筆
        const effectiveDate = item => {
            const value = item.publishAt || item.createdAt;
            return value && value.toDate ? value.toDate().getTime() : (value ? new Date(value).getTime() : 0);
        };

        featuredProjects = [...publishedItems].sort((a, b) => effectiveDate(b) - effectiveDate(a)).slice(0, 6);

    }

    // 輪播模組的作品影片／封面每次即時重抓，作品換了影片首頁就跟著換
    if (page) {
        page.modules = await refreshCarousels(page.modules, DEFAULT_TENANT_ID);
    }

    const context = await buildModuleContext(page.modules, settings, req.query);

    res.send(homeView(page, navPages, settings, featuredProjects, navItems, context));

};

// Google reCAPTCHA v2 伺服器端驗證：只有後台有設定 Secret Key 才會真的檢查，
// 沒設定就直接放行，維持原本只靠蜜罐欄位防護的行為
async function verifyRecaptcha(secretKey, token) {

    if (!secretKey) {
        return true;
    }

    if (!token) {
        return false;
    }

    try {

        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
        });

        const result = await response.json();

        return result.success === true;

    } catch (error) {

        console.error("reCAPTCHA verify error:", error);

        // 驗證服務本身打不通不應該讓一般訪客整個送不出表單，這裡放行、繼續靠蜜罐欄位擋
        return true;

    }

}

// 聯絡我表單送出（聯絡我頁面本身是自訂頁面 /p/contact，用 contactForm 模組）
exports.submitContact = async (req, res) => {

    const { name, email, subject, message, hp_website, "g-recaptcha-response": recaptchaToken } = req.body;

    // 蜜罐欄位：一般使用者看不到也填不到，機器人才會填 → 悄悄假裝送出成功但不實際儲存
    if (hp_website) {
        return res.redirect("/contact?sent=1");
    }

    if (!name || !email || !subject || !message || !EMAIL_PATTERN.test(email)) {
        return res.redirect("/contact");
    }

    const settings = await settingsService.get(DEFAULT_TENANT_ID);

    if (!(await verifyRecaptcha(settings.recaptchaSecretKey, recaptchaToken))) {
        return res.redirect("/contact");
    }

    await messageService.create(DEFAULT_TENANT_ID, { name, email, subject, message });

    // LINE 通知為附加功能，尚未設定或發送失敗都不影響留言本身已成功送出
    if (featureService.enabled("line")) {
        lineService.notifyOwners(DEFAULT_TENANT_ID, `📩 新留言\n姓名：${name}\nEmail：${email}\n主旨：${subject}\n內容：${message}`)
            .catch(error => console.error("LINE notify error:", error));
    }

    res.redirect("/contact?sent=1");

};

// LINE 官方帳號 webhook：客人直接在 LINE 傳訊息過來時，LINE 平台會 POST 到這裡。
// 一定要先驗證簽章，不然任何人都可以偽造請求塞假留言進資料庫
exports.lineWebhook = async (req, res) => {

    const settings = await settingsService.get(DEFAULT_TENANT_ID);
    const signature = req.get("x-line-signature");

    if (!lineService.verifySignature(req.rawBody, signature, settings.lineChannelSecret)) {
        return res.status(401).send("invalid signature");
    }

    // 一定要回 200，不然 LINE 會一直重送同一批事件；實際處理留言失敗只記 log，不影響這個 response
    res.status(200).send("ok");

    lineService.receiveWebhookEvents(DEFAULT_TENANT_ID, req.body.events, settings.lineChannelAccessToken)
        .catch(error => console.error("LINE webhook error:", error));

};

// 查詢可預約時段（預約頁面本身是自訂頁面 /p/booking，用 bookingWidget 模組）
exports.bookingAvailability = async (req, res) => {

    const { serviceId, staffId, date } = req.query;

    if (!serviceId || !staffId || !date) {
        return res.json([]);
    }

    const slots = await bookingService.getAvailableSlots(DEFAULT_TENANT_ID, serviceId, staffId, date);

    res.json(slots);

};

// 送出預約
exports.submitBooking = async (req, res) => {

    const { serviceId, staffId, date, startTime, customerName, customerEmail, customerPhone, note, hp_website } = req.body;

    // 蜜罐欄位命中：悄悄假裝成功，不實際建立預約
    if (hp_website) {
        return res.json({ success: true });
    }

    if (!serviceId || !staffId || !date || !startTime || !customerName || !customerEmail) {
        return res.status(400).json({ success: false, message: "缺少必要欄位" });
    }

    if (!EMAIL_PATTERN.test(customerEmail)) {
        return res.status(400).json({ success: false, message: "Email 格式不正確" });
    }

    const result = await bookingService.create(DEFAULT_TENANT_ID, {
        serviceId, staffId, date, startTime, customerName, customerEmail, customerPhone, note
    });

    res.json(result);

};

// 有些模組類型（bookingWidget／contactForm）除了自己的 data 之外還需要伺服器資料或請求相關資訊，
// 檢查頁面是否含該模組才額外查詢，避免每個一般頁面都多查一次
async function buildModuleContext(modules, settings, query = {}) {

    const context = { ...(await equipmentService.contextFor(DEFAULT_TENANT_ID, modules)) };

    if ((modules || []).some(m => m.type === "contactForm")) {
        context.sent = query.sent === "1";
        context.recaptchaSiteKey = settings.recaptchaSiteKey || "";
    }

    const hasBookingWidget = (modules || []).some(m => m.type === "bookingWidget");

    if (!hasBookingWidget) {
        return context;
    }

    const [bookingServices, bookingStaff] = await Promise.all([
        serviceItemService.getActive(DEFAULT_TENANT_ID),
        staffService.getActive(DEFAULT_TENANT_ID)
    ]);

    return { ...context, bookingServices, bookingStaff };

}

// 自訂頁面：一般內容頁走既有的模組渲染，分類清單頁改渲染清單（分頁類型見 customPageService 的 pageType 欄位）
exports.customPage = async (req, res) => {

    const page = await customPageService.getBySlug(DEFAULT_TENANT_ID, req.params.slug);
    const { navPages, settings, navItems } = await buildPublicContext(DEFAULT_TENANT_ID);

    if (!page || !isEffectivelyPublished(page)) {
        return res.status(404).send(notFoundView(navPages, settings, navItems));
    }

    if (page.pageType === "collection") {

        const [categories, items] = await Promise.all([
            collectionService.getCategories(DEFAULT_TENANT_ID, page.id),
            collectionService.getPublishedItems(DEFAULT_TENANT_ID, page.id)
        ]);

        return res.send(collectionListView(page, items, categories, navPages, settings, navItems));

    }

    page.modules = await refreshCarousels(page.modules, DEFAULT_TENANT_ID);

    const context = await buildModuleContext(page.modules, settings, req.query);

    res.send(customPageView(page, navPages, settings, navItems, context));

};

// 自訂字體檔案代理：直接連 Firebase Storage 的網址是跨網域，瀏覽器套用 @font-face 時
// 除非該 bucket 有另外設定 CORS，否則字體會被瀏覽器悄悄擋掉（不會報錯，只是整段文字
// 默默 fallback 回預設字體）——改成同網域的路由轉發位元組過去，就不用去外面設定 CORS
exports.serveFont = async (req, res) => {

    const font = await fontService.getById(DEFAULT_TENANT_ID, req.params.id);

    if (!font || !font.path || !bucket) {
        return res.status(404).end();
    }

    res.set("Content-Type", FONT_MIME_BY_FORMAT[font.format] || "font/ttf");
    res.set("Cache-Control", "public, max-age=31536000, immutable");

    bucket.file(font.path).createReadStream()
        .on("error", () => res.status(404).end())
        .pipe(res);

};

// 前台任何沒對到路由的網址，顯示品牌化 404（而不是 Express 預設那個純文字頁面）
// 爬蟲常常亂掃 /wp-login.php 之類的網址，每次都重抓前台資料很浪費 Firestore 讀取，404 頁共用一份快取
exports.notFoundCatchAll = async (req, res) => {

    const cached = getCached("__notFound");

    if (cached) {
        return res.status(404).send(cached.body);
    }

    const { navPages, settings, navItems } = await buildPublicContext(DEFAULT_TENANT_ID);
    const html = notFoundView(navPages, settings, navItems);

    setCached("__notFound", { body: html, status: 404 });
    res.status(404).send(html);

};

// 分類清單頁底下單一項目的詳細頁
exports.collectionItemDetail = async (req, res) => {

    const page = await customPageService.getBySlug(DEFAULT_TENANT_ID, req.params.slug);
    const { navPages, settings, navItems } = await buildPublicContext(DEFAULT_TENANT_ID);

    if (!page || !isEffectivelyPublished(page) || page.pageType !== "collection") {
        return res.status(404).send(notFoundView(navPages, settings, navItems));
    }

    const item = await collectionService.getItemBySlug(DEFAULT_TENANT_ID, page.id, req.params.itemSlug);

    if (!item || !isEffectivelyPublished(item)) {
        return res.status(404).send(notFoundView(navPages, settings, navItems));
    }

    // 分類標籤：作品詳情頁要顯示這件作品掛在哪個分類（例如「婚禮紀錄」），查一次該頁面底下的分類清單來對應 id → 名稱
    const categories = await collectionService.getCategories(DEFAULT_TENANT_ID, page.id);
    const category = categories.find(cat => cat.id === item.category) || null;

    res.send(collectionItemDetailView(page, item, navPages, settings, navItems, category));

};
