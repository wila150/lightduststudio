const featureService = require("../../services/featureService");
const settingsService = require("../../services/settingsService");
const storageService = require("../../services/storageService");
const mediaService = require("../../services/mediaService");
const lineService = require("../../services/lineService");
const fontService = require("../../services/fontService");
const settingsView = require("../../views/cms/settings");

// 自訂配色的顏色欄位，網站設定表單跟配色範本共用這份清單
const CUSTOM_COLOR_FIELDS = [
    "customColorBg", "customColorBgAlt", "customColorPanel", "customColorBorder",
    "customColorText", "customColorMuted", "customColorAccent", "customColorAccent2",
    "customColorDanger", "customColorHeaderBg"
];

// 顯示網站設定
exports.edit = async (req, res) => {

    const [settings, fonts] = await Promise.all([
        settingsService.get(req.tenantId),
        fontService.list(req.tenantId)
    ]);

    res.send(settingsView(settings, fonts));

};

// 儲存網站設定
exports.update = async (req, res) => {

    // 保險絲：這個表單曾經因為一個 <input type="file"> 意外被放進表單裡，導致 CMS 共用的
    // 「表單軟提交」機制（見 public/js/cms.js）誤判成需要用 multipart/form-data 送出，
    // 但這個路由沒有掛 multer，完全解析不到內容，等於整批清空存進資料庫。
    // 那個檔案輸入框已經搬到表單外面修好了，這裡留著這道防線以防未來又不小心犯同樣的錯——
    // 寧可擋下明顯不完整的請求，也不要再把真實資料洗掉
    const EXPECTED_MIN_FIELDS = 15;

    if (Object.keys(req.body || {}).length < EXPECTED_MIN_FIELDS) {
        console.error("[settings/update] 表單欄位數量異常偏少（可能又是 multipart 誤判問題），已擋下這次儲存，避免覆蓋掉真實資料");
        return res.status(400).send("這次儲存的資料看起來不完整，為了保護你現有的設定，已經取消這次儲存，沒有寫入任何變更。請聯絡開發人員協助排查。");
    }

    const googleAnalyticsId = (req.body.googleAnalyticsId || "").trim();

    // 只允許英數字/連字號（G-XXXXXXXXXX 這類格式），避免不小心貼入的內容破壞頁面 <script> 標籤
    if (googleAnalyticsId && !/^[A-Za-z0-9-]+$/.test(googleAnalyticsId)) {
        return res.status(400).send("Google Analytics 追蹤代碼格式不正確，只能包含英文字母、數字與連字號");
    }

    const googleSiteVerification = (req.body.googleSiteVerification || "").trim();

    // Search Console 的 HTML 標記驗證碼只會包含英數字、連字號、底線
    if (googleSiteVerification && !/^[A-Za-z0-9_-]+$/.test(googleSiteVerification)) {
        return res.status(400).send("Google Search Console 驗證碼格式不正確，請直接複製 Google 提供的 content 值");
    }

    // 自訂配色的顏色欄位會被直接組進前台的 <style> 標籤，必須驗證為合法 hex 色碼，避免注入
    const customColors = {};

    for (const field of CUSTOM_COLOR_FIELDS) {

        const value = (req.body[field] || "").trim();

        if (value && !/^#[0-9a-f]{6}$/i.test(value)) {
            return res.status(400).send("自訂配色顏色格式不正確，請使用色票選擇器設定");
        }

        customColors[field] = value;

    }

    const logoHeight = Math.min(160, Math.max(20, parseInt(req.body.logoHeight, 10) || 40));
    const headerPaddingY = Math.min(80, Math.max(0, parseInt(req.body.headerPaddingY, 10) || 24));

    // 前端用一堆同名 hidden input 送出關鍵字（chip 介面新增/移除），這裡去除空白/重複，並限制數量與長度避免異常大的內容
    const metaKeywords = [...new Set(
        []
            .concat(req.body.metaKeywords || [])
            .map(keyword => String(keyword).trim())
            .filter(Boolean)
    )]
        .slice(0, 20)
        .map(keyword => keyword.slice(0, 50));

    // 手動精選作品：跟作品輪播模組同一套勾選 UI，送出的是 JSON 字串陣列（項目 id），格式不對就當作沒選，退回自動抓最新發布的行為
    let featuredProjectIds = [];

    try {
        featuredProjectIds = JSON.parse(req.body.featuredProjectIdsJson || "[]");
    } catch (error) {
        featuredProjectIds = [];
    }

    if (!Array.isArray(featuredProjectIds)) {
        featuredProjectIds = [];
    }

    // 接收 LINE 通知的 User ID，一行一個
    const lineNotifyUserIds = (req.body.lineNotifyUserIds || "")
        .split("\n")
        .map(id => id.trim())
        .filter(Boolean);

    const saved = await settingsService.update(req.tenantId, {
        logoHeight,
        headerPaddingY,
        siteName: req.body.siteName || "",
        brandTextMain: (req.body.brandTextMain || "").trim(),
        brandTextSub: (req.body.brandTextSub || "").trim(),
        showBrandTextInHeader: req.body.showBrandTextInHeader === "on",
        footerText: req.body.footerText || "",
        footerBackground: ["alt", "dark"].includes(req.body.footerBackground) ? req.body.footerBackground : "none",
        metaDescription: req.body.metaDescription || "",
        metaKeywords,
        googleSiteVerification,
        theme: req.body.theme || "dark-artistic",
        projectListLayout: req.body.projectListLayout || "grid",
        headingFontId: req.body.headingFontId || "",
        bodyFontId: req.body.bodyFontId || "",
        showHomeCarousel: req.body.showHomeCarousel === "on",
        showFeaturedSidebar: req.body.showFeaturedSidebar === "on",
        featuredProjectIds,
        googleAnalyticsId,
        lineChannelAccessToken: (req.body.lineChannelAccessToken || "").trim(),
        lineChannelSecret: (req.body.lineChannelSecret || "").trim(),
        lineNotifyUserIds,
        lineFriendUrl: (req.body.lineFriendUrl || "").trim(),
        socialFacebookUrl: (req.body.socialFacebookUrl || "").trim(),
        socialInstagramUrl: (req.body.socialInstagramUrl || "").trim(),
        socialYoutubeUrl: (req.body.socialYoutubeUrl || "").trim(),
        contactPhone: (req.body.contactPhone || "").trim(),
        contactEmail: (req.body.contactEmail || "").trim(),
        contactAddress: (req.body.contactAddress || "").trim(),
        contactHours: (req.body.contactHours || "").trim(),
        cookieConsentEnabled: req.body.cookieConsentEnabled === "on",
        cookieConsentText: (req.body.cookieConsentText || "").trim(),
        recaptchaSiteKey: (req.body.recaptchaSiteKey || "").trim(),
        recaptchaSecretKey: (req.body.recaptchaSecretKey || "").trim(),
        features: featureService.FEATURES.reduce((map, f) => ({ ...map, [f.key]: req.body[`feature_${f.key}`] === "on" }), {}),
        ...customColors
    });
    featureService.invalidate();

    // settingsService.update 內部把 Firestore 錯誤吞掉只回傳 false（例如某個欄位不小心是 undefined，
    // Firestore 會整批寫入失敗），這裡以前沒檢查結果，儲存失敗時還是照樣導回設定頁，
    // 畫面上完全看不出來剛剛的修改其實沒有存進去——所以才會一直「改了又跳回原本的」
    if (!saved) {
        return res.status(500).send("儲存失敗，請重新整理頁面後再試一次。如果持續發生，請聯絡網站開發人員。");
    }

    res.redirect("/cms/settings");

};

// 把目前調好的自訂配色存成一個範本，方便之後直接套用或跟其他組合切換比較
exports.savePreset = async (req, res) => {

    const name = (req.body.presetName || "").trim();

    // 這顆按鈕用 formaction 送整份設定表單過來，所以顏色欄位是「畫面上目前選的」，不是資料庫裡已存的舊值，
    // 這樣使用者調完顏色、還沒按主要的「儲存」之前，也能直接把當下畫面看到的組合存成範本
    const colors = {};

    for (const field of CUSTOM_COLOR_FIELDS) {

        const value = (req.body[field] || "").trim();

        if (!/^#[0-9a-f]{6}$/i.test(value)) {
            return res.status(400).send("自訂配色顏色格式不正確，請使用色票選擇器設定");
        }

        colors[field] = value;

    }

    await settingsService.savePreset(req.tenantId, name, colors);

    res.redirect("/cms/settings");

};

// 套用某個已存的配色範本，直接切回「自訂配色」樣板
exports.applyPreset = async (req, res) => {

    await settingsService.applyPreset(req.tenantId, req.params.presetId);

    res.redirect("/cms/settings");

};

exports.deletePreset = async (req, res) => {

    await settingsService.deletePreset(req.tenantId, req.params.presetId);

    res.redirect("/cms/settings");

};

// 上傳/更換導覽列 Logo 圖片
exports.uploadLogo = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    const existing = await settingsService.get(req.tenantId);

    if (existing.logoPath) {
        await storageService.deleteFile(existing.logoPath);
    }

    const uploaded = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, "settings", { trim: true });

    await settingsService.update(req.tenantId, { logoUrl: uploaded.url, logoPath: uploaded.path });

    res.json({ url: uploaded.url });

};

// 從媒體庫挑選既有圖片當導覽列 Logo（不重新上傳，path 留空避免刪除時誤刪媒體庫共用檔案）
exports.setLogoFromMedia = async (req, res) => {

    const allMedia = await mediaService.list(req.tenantId);
    const selected = allMedia.find(file => file.id === req.body.mediaId);

    if (!selected) {
        return res.status(400).json({ error: "找不到指定的媒體庫圖片" });
    }

    const existing = await settingsService.get(req.tenantId);

    if (existing.logoPath) {
        await storageService.deleteFile(existing.logoPath);
    }

    await settingsService.update(req.tenantId, { logoUrl: selected.url, logoPath: "" });

    res.json({ url: selected.url });

};

// 移除 Logo 圖片（改回顯示文字站名）
exports.removeLogo = async (req, res) => {

    const existing = await settingsService.get(req.tenantId);

    if (existing.logoPath) {
        await storageService.deleteFile(existing.logoPath);
    }

    await settingsService.update(req.tenantId, { logoUrl: "", logoPath: "" });

    res.redirect("/cms/settings");

};

// 上傳/更換瀏覽器分頁圖示（favicon）
exports.uploadFavicon = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    const existing = await settingsService.get(req.tenantId);

    if (existing.faviconPath) {
        await storageService.deleteFile(existing.faviconPath);
    }

    const uploaded = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, "settings");

    await settingsService.update(req.tenantId, { faviconUrl: uploaded.url, faviconPath: uploaded.path });

    res.json({ url: uploaded.url });

};

// 從媒體庫挑選既有圖片當 favicon
exports.setFaviconFromMedia = async (req, res) => {

    const allMedia = await mediaService.list(req.tenantId);
    const selected = allMedia.find(file => file.id === req.body.mediaId);

    if (!selected) {
        return res.status(400).json({ error: "找不到指定的媒體庫圖片" });
    }

    const existing = await settingsService.get(req.tenantId);

    if (existing.faviconPath) {
        await storageService.deleteFile(existing.faviconPath);
    }

    await settingsService.update(req.tenantId, { faviconUrl: selected.url, faviconPath: "" });

    res.json({ url: selected.url });

};

// 移除自訂 favicon（改回預設圖示）
exports.removeFavicon = async (req, res) => {

    const existing = await settingsService.get(req.tenantId);

    if (existing.faviconPath) {
        await storageService.deleteFile(existing.faviconPath);
    }

    await settingsService.update(req.tenantId, { faviconUrl: "", faviconPath: "" });

    res.redirect("/cms/settings");

};

// 上傳/更換社群分享圖（Open Graph image）
exports.uploadOgImage = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    const existing = await settingsService.get(req.tenantId);

    if (existing.ogImagePath) {
        await storageService.deleteFile(existing.ogImagePath);
    }

    const uploaded = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, "settings");

    await settingsService.update(req.tenantId, { ogImageUrl: uploaded.url, ogImagePath: uploaded.path });

    res.json({ url: uploaded.url });

};

// 從媒體庫挑選既有圖片當社群分享圖
exports.setOgImageFromMedia = async (req, res) => {

    const allMedia = await mediaService.list(req.tenantId);
    const selected = allMedia.find(file => file.id === req.body.mediaId);

    if (!selected) {
        return res.status(400).json({ error: "找不到指定的媒體庫圖片" });
    }

    const existing = await settingsService.get(req.tenantId);

    if (existing.ogImagePath) {
        await storageService.deleteFile(existing.ogImagePath);
    }

    await settingsService.update(req.tenantId, { ogImageUrl: selected.url, ogImagePath: "" });

    res.json({ url: selected.url });

};

// 移除社群分享圖
exports.removeOgImage = async (req, res) => {

    const existing = await settingsService.get(req.tenantId);

    if (existing.ogImagePath) {
        await storageService.deleteFile(existing.ogImagePath);
    }

    await settingsService.update(req.tenantId, { ogImageUrl: "", ogImagePath: "" });

    res.redirect("/cms/settings");

};

// 測試 LINE 官方帳號連線（推播一則測試訊息給設定裡指定的 User ID，不需要真的送出聯絡表單）
exports.testLine = async (req, res) => {

    const settings = await settingsService.get(req.tenantId);

    if (!settings.lineChannelAccessToken) {
        return res.status(400).json({ success: false, message: "請先填寫並儲存 Channel Access Token" });
    }

    if (!settings.lineNotifyUserIds || settings.lineNotifyUserIds.length === 0) {
        return res.status(400).json({ success: false, message: "請先填寫並儲存至少一組接收通知的 LINE User ID" });
    }

    const result = await lineService.notifyOwners(req.tenantId, "✅ 測試訊息：LINE 官方帳號已成功連接您的網站");

    if (!result.success) {
        return res.status(400).json({ success: false, message: "發送失敗，請確認 Token 與 User ID 是否正確，以及該 User ID 是否已加官方帳號為好友" });
    }

    res.json({ success: true });

};

// 上傳字體檔到字體庫（.ttf/.otf/.woff/.woff2），上傳完只是加進庫裡，
// 要在下面「標題字體／內文字體」選單選了該字體才會實際套用到前台
exports.uploadFont = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    const font = await fontService.upload(req.tenantId, req.file.buffer, req.file.originalname, req.file.mimetype, (req.body.fontName || "").trim());

    res.json({ font });

};

// 從字體庫刪除字體；如果這個字體正被標題或內文選用，一併清掉設定，避免前台指到不存在的字體
exports.deleteFont = async (req, res) => {

    const settings = await settingsService.get(req.tenantId);
    const patch = {};

    if (settings.headingFontId === req.params.id) {
        patch.headingFontId = "";
    }

    if (settings.bodyFontId === req.params.id) {
        patch.bodyFontId = "";
    }

    if (Object.keys(patch).length > 0) {
        await settingsService.update(req.tenantId, patch);
    }

    await fontService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/settings");

};
