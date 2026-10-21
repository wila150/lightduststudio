const customPageService = require("../../services/customPageService");
const collectionService = require("../../services/collectionService");
const storageService = require("../../services/storageService");
const mediaService = require("../../services/mediaService");
const navConfigService = require("../../services/navConfigService");
const serviceItemService = require("../../services/serviceItemService");
const staffService = require("../../services/staffService");
const { buildPublicContext } = require("../../services/publicContext");
const { dataFromBody, refreshCarousels } = require("../../services/moduleTypes");
const { getThumbnailUrl } = require("../../services/videoEmbed");
const { getVideoInfo, slugFromTitle, slugify } = require("../../services/videoInfo");

// 網址代稱留空時依標題自動產生（中文標題先翻成英文），跟同頁其他作品重複就加 -2、-3…
async function resolveItemSlug(tenantId, pageId, rawSlug, title, excludeId) {
    let base = slugify(rawSlug) || await slugFromTitle(String(title || "").replace(/\s+/g, " ").trim(), "");
    let slug = base;
    for (let n = 2; await collectionService.slugExists(tenantId, pageId, slug, excludeId); n++) {
        slug = `${base}-${n}`;
    }
    return slug;
}

const customPagesView = require("../../views/cms/customPages");
const customPageFormView = require("../../views/cms/customPageForm");
const customPageView = require("../../views/customPage");
const categoryFormView = require("../../views/cms/categoryForm");
const collectionItemFormView = require("../../views/cms/collectionItemForm");
const collectionItemDetailView = require("../../views/collectionItemDetail");
const collectionListView = require("../../views/collectionList");

// 作品集底下的項目清單（JSON，供「精選作品輪播」模組的後台選擇器使用，影片/純照片項目都列出來）
// 站上可能有不只一個分類清單型頁面（例如 PHOTOGRAPHY／FILM 各自獨立），全部一起列出來給選
exports.videoItemsJson = async (req, res) => {

    const collectionPages = await customPageService.getCollectionPages(req.tenantId);

    const itemsByPage = await Promise.all(
        collectionPages.map(page => collectionService.getItems(req.tenantId, page.id))
    );

    const items = itemsByPage.flat().map(item => {

        const videoEntry = (item.images || []).find(image => image.type === "video");

        const coverUrl = videoEntry
            ? (videoEntry.url || getThumbnailUrl(videoEntry.videoUrl) || "")
            : ((item.coverImage && item.coverImage.url) || (item.images && item.images[0] && item.images[0].url) || "");

        return { id: item.id, title: item.title, coverUrl, hasVideo: !!videoEntry };

    });

    res.json({ items });

};

// 頁面列表
exports.index = async (req, res) => {

    const pages = await customPageService.getAll(req.tenantId);

    res.send(customPagesView(pages));

};

// 新增頁面表單
exports.newForm = async (req, res) => {

    const navItems = await navConfigService.getAll(req.tenantId);

    res.send(customPageFormView(null, navItems));

};

// 新增頁面
exports.create = async (req, res) => {

    const slug = (req.body.slug || "").trim();

    if (await customPageService.slugExists(req.tenantId, slug)) {
        return res.send("此網址代稱已被使用，請換一個");
    }

    const page = await customPageService.create(req.tenantId, {
        slug,
        title: req.body.title,
        subtitle: req.body.subtitle,
        titleSize: req.body.titleSize,
        metaDescription: req.body.metaDescription,
        pageType: req.body.pageType,
        contentKind: req.body.contentKind,
        published: req.body.published === "on",
        publishAt: req.body.publishAt,
        navParent: req.body.navParent
    });

    res.redirect(`/cms/custom-pages/${page.id}/edit`);

};

// 編輯頁面表單（分類清單型頁面會一併帶分類/項目清單，可用 ?category=分類id 篩選只顯示該分類底下的項目）
exports.editForm = async (req, res) => {

    const [page, navItems] = await Promise.all([
        customPageService.getById(req.tenantId, req.params.id),
        navConfigService.getAll(req.tenantId)
    ]);

    if (!page) {
        return res.redirect("/cms/custom-pages");
    }

    if (page.pageType !== "collection") {
        return res.send(customPageFormView(page, navItems));
    }

    const [allItems, categories] = await Promise.all([
        collectionService.getItems(req.tenantId, page.id),
        collectionService.getCategories(req.tenantId, page.id)
    ]);

    const activeCategoryId = req.query.category || "";
    const items = activeCategoryId ? allItems.filter(item => item.category === activeCategoryId) : allItems;

    res.send(customPageFormView(page, navItems, categories, items, activeCategoryId));

};

// 更新頁面
exports.update = async (req, res) => {

    const slug = (req.body.slug || "").trim();

    if (await customPageService.slugExists(req.tenantId, slug, req.params.id)) {
        return res.send("此網址代稱已被使用，請換一個");
    }

    await customPageService.update(req.tenantId, req.params.id, {
        slug,
        title: req.body.title,
        subtitle: req.body.subtitle,
        titleSize: req.body.titleSize,
        metaDescription: req.body.metaDescription,
        published: req.body.published === "on",
        publishAt: req.body.publishAt,
        navParent: req.body.navParent,
        backgroundImageMediaUrl: req.body.backgroundImageMediaUrl,
        removeBackgroundImage: req.body.removeBackgroundImage === "on"
    }, req.file);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 刪除頁面（分類清單型頁面要一併清掉底下的分類跟項目，避免孤兒資料）
exports.remove = async (req, res) => {

    const page = await customPageService.getById(req.tenantId, req.params.id);

    if (page && page.pageType === "collection") {
        await collectionService.removeAllForPage(req.tenantId, page.id);
    }

    await customPageService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/custom-pages");

};

// 批次刪除頁面
exports.removeMany = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await customPageService.removeMany(req.tenantId, ids);
    }

    res.redirect("/cms/custom-pages");

};

// 新增模組（一般內容頁）
exports.addModule = async (req, res) => {

    await customPageService.addModule(req.tenantId, req.params.id, req.body.type);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 更新模組內容
exports.updateModule = async (req, res) => {

    const data = await dataFromBody(req.body.type, req.body, req.tenantId);

    await customPageService.updateModule(req.tenantId, req.params.id, req.params.moduleId, data, req.body.moduleBackground, req.body.moduleBackgroundColor);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 刪除模組
exports.removeModule = async (req, res) => {

    await customPageService.removeModule(req.tenantId, req.params.id, req.params.moduleId);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 上移/下移模組
exports.moveModule = async (req, res) => {

    await customPageService.moveModule(req.tenantId, req.params.id, req.params.moduleId, req.body.direction);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 拖拉排序（JS fetch 呼叫，回 JSON 不是導轉頁面）
exports.reorderModules = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

    try {

        await customPageService.reorderModules(req.tenantId, req.params.id, ids);
        res.json({ success: true });

    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false });

    }

};

async function buildBookingContext(tenantId, modules) {

    if (!(modules || []).some(m => m.type === "bookingWidget")) {
        return {};
    }

    const [bookingServices, bookingStaff] = await Promise.all([
        serviceItemService.getActive(tenantId),
        staffService.getActive(tenantId)
    ]);

    return { bookingServices, bookingStaff };

}

// 後台預覽（不檢查 published，給編輯頁的即時預覽 iframe 用）
exports.preview = async (req, res) => {

    const [page, { navPages, settings, navItems }] = await Promise.all([
        customPageService.getById(req.tenantId, req.params.id),
        buildPublicContext(req.tenantId)
    ]);

    if (!page) {
        return res.redirect("/cms/custom-pages");
    }

    // 分類清單頁（FILM／PHOTOGRAPH）跟前台一樣用清單版型預覽（分類標籤＋作品卡片），
    // 不然只會渲染模組，預覽裡看不到任何作品（2026/10/03 回饋：即時預覽都不會顯示）
    if (page.pageType === "collection") {
        const [categories, items] = await Promise.all([
            collectionService.getCategories(req.tenantId, page.id),
            collectionService.getPublishedItems(req.tenantId, page.id)
        ]);
        return res.send(collectionListView(page, items, categories, navPages, settings, navItems));
    }

    page.modules = await refreshCarousels(page.modules, req.tenantId);

    const context = await buildBookingContext(req.tenantId, page.modules);

    res.send(customPageView(page, navPages, settings, navItems, context));

};

// 內容編輯器/圖片模組插入圖片：上傳並回傳網址
exports.uploadImage = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    const { url, path } = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, "pages");

    res.json({ url, path });

};

// ===== 分類清單型頁面：分類管理（比照 controllers/cms/categoryController.js，多帶 pageId） =====

exports.createCategory = async (req, res) => {

    let coverImage = null;

    if (req.file) {
        coverImage = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, "categories");
    } else if (req.body.coverImageMediaUrl) {
        // 直接沿用媒體庫裡現成的檔案，不重新上傳一份，所以不記錄 path
        coverImage = { url: req.body.coverImageMediaUrl, path: "" };
    }

    await collectionService.createCategory(req.tenantId, req.params.id, { label: req.body.label, description: req.body.description, coverImage, parentCategoryId: req.body.parentCategoryId });

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

exports.editCategoryForm = async (req, res) => {

    const [category, allCategories] = await Promise.all([
        collectionService.getCategoryById(req.tenantId, req.params.categoryId),
        collectionService.getCategories(req.tenantId, req.params.id)
    ]);

    if (!category) {
        return res.redirect(`/cms/custom-pages/${req.params.id}/edit`);
    }

    // 只能開一層子分類：可選的上層分類，只能是「本來就是頂層」且不是自己的分類
    const topLevelOptions = allCategories.filter(cat => !cat.parentCategoryId && cat.id !== category.id);

    res.send(categoryFormView(category, `/cms/custom-pages/${req.params.id}/categories/${category.id}`, topLevelOptions));

};

exports.updateCategory = async (req, res) => {

    let coverImage = null;

    if (req.file) {
        coverImage = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, "categories");
    } else if (req.body.coverImageMediaUrl) {
        coverImage = { url: req.body.coverImageMediaUrl, path: "" };
    }

    await collectionService.updateCategory(req.tenantId, req.params.categoryId, { label: req.body.label, description: req.body.description, coverImage, parentCategoryId: req.body.parentCategoryId });

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

exports.moveCategory = async (req, res) => {

    await collectionService.moveCategory(req.tenantId, req.params.id, req.params.categoryId, req.body.direction);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 拖拉排序（JS fetch 呼叫，回 JSON 不是導轉頁面）
exports.reorderCategories = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

    try {

        await collectionService.reorderCategories(req.tenantId, req.params.id, ids);
        res.json({ success: true });

    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false });

    }

};

exports.removeCategory = async (req, res) => {

    await collectionService.removeCategory(req.tenantId, req.params.categoryId);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 項目標題的輸入框是 textarea（可以按 Enter 分行顯示），統一換行符號、去掉每行頭尾空白跟空行，
// 前台用 white-space: pre-line 顯示時才不會多出空白行
function cleanItemTitle(value) {
    return String(value || "").replace(/\r\n?/g, "\n").split("\n").map(line => line.trim()).filter(Boolean).join("\n");
}

// ===== 分類清單型頁面：項目管理（比照 controllers/cms/projectController.js，多帶 pageId／多一個 slug 欄位） =====

exports.newItemForm = async (req, res) => {

    const [page, categories] = await Promise.all([
        customPageService.getById(req.tenantId, req.params.id),
        collectionService.getCategories(req.tenantId, req.params.id)
    ]);

    res.send(collectionItemFormView(req.params.id, null, categories, req.query.category || "", page));

};

exports.createItem = async (req, res) => {

    const typedSlug = (req.body.slug || "").trim();

    if (typedSlug && await collectionService.slugExists(req.tenantId, req.params.id, typedSlug)) {
        return res.send("此網址代稱在這個頁面裡已被使用，請換一個");
    }

    const slug = typedSlug || await resolveItemSlug(req.tenantId, req.params.id, "", req.body.title);

    let mediaImages = [];

    try {
        mediaImages = req.body.mediaImagesJson ? JSON.parse(req.body.mediaImagesJson) : [];
    } catch (error) {
        mediaImages = [];
    }

    const coverImage = req.body.coverImageMediaUrl ? { url: req.body.coverImageMediaUrl, path: "" } : null;

    await collectionService.create(req.tenantId, req.params.id, {
        slug,
        title: cleanItemTitle(req.body.title),
        description: req.body.description,
        metaDescription: req.body.metaDescription,
        author: req.body.author,
        link: req.body.link,
        videoRatio: req.body.videoRatio,
        category: req.body.category,
        published: req.body.published === "on",
        publishAt: req.body.publishAt,
        galleryLayout: req.body.galleryLayout,
        coverPosition: req.body.coverPosition,
        mediaImages,
        coverImage
    }, req.files);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 貼上影片連結自動帶入（JSON）：標題、縮圖、直式／橫式、網址代稱（翻成英文，已經被用過就加 -2…）、SEO 描述
exports.videoInfo = async (req, res) => {

    const info = await getVideoInfo(req.query.url || "");

    if (!info) {
        return res.status(400).json({ error: "不是 YouTube／Vimeo 連結" });
    }

    if (info.slug) {
        info.slug = await resolveItemSlug(req.tenantId, req.params.id, info.slug, info.title, req.query.itemId || undefined);
    }

    res.json(info);

};

// 從媒體庫資料夾建立作品（JSON）：每個勾選的相簿建立一個作品
// 標題＝相簿名稱、封面＝檔名是「封面」的那張（沒有就用第一張）、相簿＝資料夾裡全部照片（照檔名排序，封面放第一張）
// 同一個頁面＋分類裡已經有同名作品就跳過，避免按兩次變成重複作品
exports.createItemsFromAlbums = async (req, res) => {

    const pageId = req.params.id;
    const albumIds = Array.isArray(req.body.albumIds) ? req.body.albumIds : [];
    const category = req.body.category || "";

    try {

        const [albums, allFiles, existingItems] = await Promise.all([
            mediaService.getAlbums(req.tenantId),
            mediaService.list(req.tenantId),
            collectionService.getItems(req.tenantId, pageId)
        ]);

        // 沿用這個頁面大部分作品的相簿排版（PHOTOGRAPH 是石版、FILM 是方格），新作品看起來才一致
        const layoutCounts = {};
        existingItems.forEach(item => { layoutCounts[item.galleryLayout || "grid"] = (layoutCounts[item.galleryLayout || "grid"] || 0) + 1; });
        const galleryLayout = Object.keys(layoutCounts).sort((a, b) => layoutCounts[b] - layoutCounts[a])[0] || "grid";

        const byName = (a, b) => {
            const ca = /^封面/.test(a.name || "") ? 0 : 1;
            const cb = /^封面/.test(b.name || "") ? 0 : 1;
            return ca - cb || (a.name || "").localeCompare(b.name || "", "zh-Hant", { numeric: true });
        };

        const created = [];
        const skipped = [];

        for (const albumId of albumIds) {

            const album = albums.find(a => a.id === albumId);

            if (!album) {
                continue;
            }

            const title = album.label.trim();
            const files = allFiles.filter(file => file.albumId === albumId).sort(byName);

            if (files.length === 0) {
                skipped.push(`${title}（資料夾是空的）`);
                continue;
            }

            if (existingItems.some(item => (item.title || "").trim() === title && (item.category || "") === category)) {
                skipped.push(`${title}（這個分類已經有同名作品）`);
                continue;
            }

            // 網址代稱：資料夾名稱翻成英文（跟貼影片連結自動帶入同一套）
            const slug = await resolveItemSlug(req.tenantId, pageId, "", title);

            const cover = files.find(file => /^封面/.test(file.name || "")) || files[0];

            const item = await collectionService.create(req.tenantId, pageId, {
                slug,
                title,
                category,
                published: true,
                galleryLayout,
                coverPosition: "center top",
                mediaImages: files.map(file => ({ url: file.url, alt: title, name: file.name })),
                coverImage: { url: cover.url, type: "image", path: "" }
            }, []);

            existingItems.push(item);
            created.push(title);

        }

        res.json({ success: true, created, skipped });

    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false });

    }

};

exports.editItemForm = async (req, res) => {

    const [item, categories, page] = await Promise.all([
        collectionService.getItemById(req.tenantId, req.params.itemId),
        collectionService.getCategories(req.tenantId, req.params.id),
        customPageService.getById(req.tenantId, req.params.id)
    ]);

    if (!item) {
        return res.redirect(`/cms/custom-pages/${req.params.id}/edit`);
    }

    res.send(collectionItemFormView(req.params.id, item, categories, "", page));

};

exports.updateItem = async (req, res) => {

    const typedSlug = (req.body.slug || "").trim();

    if (typedSlug && await collectionService.slugExists(req.tenantId, req.params.id, typedSlug, req.params.itemId)) {
        return res.send("此網址代稱在這個頁面裡已被使用，請換一個");
    }

    const slug = typedSlug || await resolveItemSlug(req.tenantId, req.params.id, "", req.body.title, req.params.itemId);

    await collectionService.update(req.tenantId, req.params.itemId, {
        slug,
        title: cleanItemTitle(req.body.title),
        description: req.body.description,
        metaDescription: req.body.metaDescription,
        author: req.body.author,
        link: req.body.link,
        videoRatio: req.body.videoRatio,
        category: req.body.category,
        published: req.body.published === "on",
        publishAt: req.body.publishAt,
        galleryLayout: req.body.galleryLayout,
        coverPosition: req.body.coverPosition
    }, req.files);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

// 預覽項目（不檢查 published）
exports.previewItem = async (req, res) => {

    const [page, item, { navPages, settings, navItems }] = await Promise.all([
        customPageService.getById(req.tenantId, req.params.id),
        collectionService.getItemById(req.tenantId, req.params.itemId),
        buildPublicContext(req.tenantId)
    ]);

    if (!page || !item) {
        return res.redirect(`/cms/custom-pages/${req.params.id}/edit`);
    }

    const categories = await collectionService.getCategories(req.tenantId, page.id);
    const category = categories.find(cat => cat.id === item.category) || null;

    res.send(collectionItemDetailView(page, item, navPages, settings, navItems, category));

};

exports.updateItemCover = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    const coverImage = await collectionService.setCoverImage(req.tenantId, req.params.itemId, req.file);

    if (!coverImage) {
        return res.status(404).json({ error: "找不到項目" });
    }

    res.json(coverImage);

};

exports.removeItemCover = async (req, res) => {

    const done = await collectionService.removeCoverImage(req.tenantId, req.params.itemId);

    res.status(done ? 200 : 404).json({ success: done });

};

exports.addItemVideo = async (req, res) => {

    if (!req.body.videoUrl) {
        return res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);
    }

    await collectionService.addVideoItem(req.tenantId, req.params.itemId, req.body.videoUrl, req.file, req.body.caption);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

exports.removeItemImage = async (req, res) => {

    await collectionService.removeImage(req.tenantId, req.params.itemId, req.params.imageId);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

exports.updateItemImageAlt = async (req, res) => {

    await collectionService.updateImageAlt(req.tenantId, req.params.itemId, req.params.imageId, req.body.alt);

    res.json({ success: true });

};

exports.addItemFromMedia = async (req, res) => {

    const mediaIds = Array.isArray(req.body.mediaIds) ? req.body.mediaIds : (req.body.mediaIds ? [req.body.mediaIds] : []);

    if (mediaIds.length === 0) {
        return res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);
    }

    const allMedia = await mediaService.list(req.tenantId);
    const selected = allMedia.filter(file => mediaIds.includes(file.id));

    await collectionService.addFromMedia(req.tenantId, req.params.itemId, selected);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

exports.moveItem = async (req, res) => {

    await collectionService.moveItem(req.tenantId, req.params.id, req.params.itemId, req.body.direction);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// 拖拉排序（JS fetch 呼叫，回 JSON 不是導轉頁面）
exports.reorderItems = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

    try {

        await collectionService.reorderItems(req.tenantId, req.params.id, ids);
        res.json({ success: true });

    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false });

    }

};

exports.removeItem = async (req, res) => {

    await collectionService.remove(req.tenantId, req.params.itemId);

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

exports.removeManyItems = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await collectionService.removeMany(req.tenantId, ids);
    }

    res.redirect(`/cms/custom-pages/${req.params.id}/edit`);

};

// ===== 分類清單型頁面：項目詳細頁的內容模組 =====

exports.addItemModule = async (req, res) => {

    await collectionService.addModule(req.tenantId, req.params.itemId, req.body.type);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

exports.updateItemModule = async (req, res) => {

    const data = await dataFromBody(req.body.type, req.body, req.tenantId);

    await collectionService.updateModule(req.tenantId, req.params.itemId, req.params.moduleId, data, req.body.moduleBackground, req.body.moduleBackgroundColor);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

exports.removeItemModule = async (req, res) => {

    await collectionService.removeModule(req.tenantId, req.params.itemId, req.params.moduleId);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

exports.moveItemModule = async (req, res) => {

    await collectionService.moveModule(req.tenantId, req.params.itemId, req.params.moduleId, req.body.direction);

    res.redirect(`/cms/custom-pages/${req.params.id}/items/${req.params.itemId}/edit`);

};

// 拖拉排序（JS fetch 呼叫，回 JSON 不是導轉頁面）
exports.reorderItemImages = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

    try {

        await collectionService.reorderImages(req.tenantId, req.params.itemId, ids);
        res.json({ success: true });

    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false });

    }

};

exports.reorderItemModules = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

    try {

        await collectionService.reorderModules(req.tenantId, req.params.itemId, ids);
        res.json({ success: true });

    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false });

    }

};
