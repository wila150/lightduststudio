const QRCode = require("qrcode");

const customPageService = require("./customPageService");
const settingsService = require("./settingsService");
const navConfigService = require("./navConfigService");
const collectionService = require("./collectionService");
const fontService = require("./fontService");

// 前台每個 controller action 都需要的共用資料組合：導覽用的自訂頁面清單、
// 全站設定、導覽列項目。集中在這裡抓，避免每個 action 各自重複好幾行
async function buildPublicContext(tenantId) {

    const [navPages, settings, navItems] = await Promise.all([
        customPageService.getPublished(tenantId),
        settingsService.get(tenantId),
        navConfigService.getEnabled(tenantId)
    ]);

    // 右下角 LINE 浮動按鈕的 QR code，掃了直接加好友（views/layout.js 讀 settings.lineQrSvg）
    if (settings.lineFriendUrl) {
        settings.lineQrSvg = await QRCode.toString(settings.lineFriendUrl, { type: "svg", margin: 1 });
    }

    // 自訂字體庫：把設定裡存的字體 id 換成實際的字體檔資料，views/layout.js 用這個組 @font-face，
    // 沒設定（id 是空字串）或找不到（字體被刪除）就維持 undefined，沿用樣板本身的預設字體
    if (settings.headingFontId) {
        settings.headingFont = await fontService.getById(tenantId, settings.headingFontId);
    }

    if (settings.bodyFontId) {
        settings.bodyFont = await fontService.getById(tenantId, settings.bodyFontId);
    }

    // 導覽項目如果設定「下拉顯示分類連結」且指到一個分類清單型頁面，把該頁面的分類清單掛在這個
    // nav item 上（views/layout.js 直接讀 navItem.categoryLinks），取代舊版寫死判斷 /projects、/blog 的做法
    await Promise.all(navItems.map(async navItem => {

        if (!navItem.showCategories || navItem.target.type !== "page") {
            navItem.categoryLinks = [];
            return;
        }

        const targetPage = navPages.find(page => page.id === navItem.target.pageId);

        if (!targetPage || targetPage.pageType !== "collection") {
            navItem.categoryLinks = [];
            return;
        }

        // 只列出有已發布作品的分類（子分類有作品時，上層分類也保留），空分類不要出現在選單裡點進去一片空白；
        // 導覽項目勾了「空分類也顯示」就全部列出（例如分類先建好、作品還沒上傳的頁面）
        if (navItem.showEmptyCategories) {
            navItem.categoryLinks = await collectionService.getCategories(tenantId, targetPage.id);
            return;
        }

        const [categories, items] = await Promise.all([
            collectionService.getCategories(tenantId, targetPage.id),
            collectionService.getPublishedItems(tenantId, targetPage.id)
        ]);
        const usedIds = new Set(items.map(item => item.category).filter(Boolean));
        categories.forEach(cat => { if (cat.parentCategoryId && usedIds.has(cat.id)) usedIds.add(cat.parentCategoryId); });

        navItem.categoryLinks = categories.filter(cat => usedIds.has(cat.id));

    }));

    return { navPages, settings, navItems };

}

module.exports = { buildPublicContext };
