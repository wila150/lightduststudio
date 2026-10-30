// 頁面（自訂頁面 / 首頁 / 關於我 / 聯絡我）可以使用的模組類型清單
// 業者只能從這裡挑，不能自訂新類型
// 之後要新增模組類型：在這裡加一筆 + 在 views/cms/customPageForm.js（或共用的模組編輯器）加對應的迷你編輯器
// + 在 views/moduleRenderer.js 加對應的前台渲染函式
// 若渲染需要 data 以外的伺服器資料（例如 bookingWidget 需要服務/人員清單），
// 還要在 controller 渲染頁面前，偵測頁面是否含該模組，把資料加進 renderModules 的 context 參數
//
// 注意：collectionService/customPageService 不能寫在檔案最上面 require——
// collectionService 會經由 moduleService 反過來 require 這支檔案，
// 頂層 require 會形成循環依賴，導致 moduleService 拿到的 defaultData 是 undefined。
// 只在真的要用到（videoCarousel）的時候才延遲 require，繞開這個問題。

module.exports = {

    MODULE_TYPES: [
        { type: "heading", label: "標題" },
        { type: "text", label: "文字" },
        { type: "image", label: "圖片" },
        { type: "button", label: "按鈕" },
        { type: "timelineItem", label: "時間軸項目" },
        { type: "faqItem", label: "常見問題（問與答）" },
        { type: "contactForm", label: "聯絡表單" },
        { type: "featureCard", label: "特色卡片" },
        { type: "processStep", label: "服務流程步驟" },
        { type: "videoBlock", label: "影片" },
        { type: "imageGallery", label: "圖片相簿" },
        { type: "splitFeature", label: "圖文分欄" },
        { type: "bookingWidget", label: "線上預約區塊" },
        { type: "videoCarousel", label: "精選作品輪播（從作品集選）" },
        { type: "sponsorMarquee", label: "圖片跑馬燈（贊助商）" },
        { type: "serviceGrid", label: "服務項目（宮格卡片）" },
        { type: "equipmentGrid", label: "設備清單（從設備管理帶入）" }
    ],

    defaultData(type) {

        switch (type) {

            case "heading":
                return { text: "", level: "2", size: "medium", color: "", align: "left", weight: "bold" };

            case "text":
                return { html: "" };

            case "image":
                return { url: "", path: "", caption: "", imageStyle: "none", imageBorderColor: "" };

            case "button":
                return { text: "", link: "" };

            case "timelineItem":
                return { year: "", text: "" };

            case "faqItem":
                return { question: "", answer: "" };

            case "contactForm":
                return {};

            case "featureCard":
                return { title: "", description: "", borderColor: "" };

            case "processStep":
                return { title: "", description: "" };

            case "videoBlock":
                return { coverUrl: "", coverPath: "", videoUrl: "", caption: "" };

            case "imageGallery":
                return { images: [], galleryLayout: "grid" };

            case "splitFeature":
                return { heading: "", text: "", images: [], imagePosition: "right", darkBg: false, headingSize: "medium", textSize: "medium", imageSize: "medium", imageRatio: "original", imageFrame: false, imageCorner: "rounded", imageBorderColor: "" };

            case "bookingWidget":
                return {};

            case "videoCarousel":
                return { items: [], cornerStyle: "rounded" };

            case "sponsorMarquee":
                return { logos: [], logoSize: "medium" };

            case "serviceGrid":
                return { items: [], accentColor: "" };

            case "equipmentGrid":
                return { mode: "featured", limit: 6, linkUrl: "/p/equipment", linkText: "查看全部設備" };

            default:
                return {};

        }

    },

    // 精選作品輪播：依勾選的作品 ID 查出每支的影片網址、封面、連結。
    // 儲存模組時會用，前台每次顯示頁面前也會再跑一次（refreshCarousels），作品換影片／換封面輪播就會自動跟著更新，不用回來重存模組
    async resolveCarouselItems(tenantId, itemIds) {

        const collectionService = require("./collectionService");
        const customPageService = require("./customPageService");
        const { getThumbnailUrl } = require("./videoEmbed");

        // 站上可能不只一個分類清單型頁面（例如 PHOTOGRAPHY／FILM 各自獨立），
        // 每個項目自己的 pageId 才知道實際掛在哪個頁面下，不能再假設固定是 slug "projects"
        const collectionPages = await customPageService.getCollectionPages(tenantId);
        const pageById = new Map(collectionPages.map(page => [page.id, page]));

        // 前台每次開頁面都會跑，同時查所有作品，不要一支等一支
        const fetched = await Promise.all(itemIds.map(itemId => collectionService.getItemById(tenantId, itemId)));

        const items = [];

        for (const item of fetched) {

            const itemPage = item && pageById.get(item.pageId);

            if (!item || !itemPage) {
                continue;
            }

            // 動態作品的影片可能放在三個地方：相簿裡標記 type:"video" 的項目、作品頁的影片模組、或「連結」欄直接貼 YouTube
            // （列表頁 views/collectionList.js 就是靠連結欄抓縮圖），三種都要認得，不然輪播只剩空白框
            const videoEntry = (item.images || []).find(image => image.type === "video" && image.videoUrl);
            const videoBlockModule = (item.modules || []).find(m => m.type === "videoBlock" && m.data && m.data.videoUrl);
            const videoUrl = (videoEntry && videoEntry.videoUrl)
                || (videoBlockModule && videoBlockModule.data.videoUrl)
                || (getThumbnailUrl(item.link) ? item.link : "");

            // 封面優先用影片自己上傳的封面，其次作品封面／第一張照片，最後才用 YouTube 縮圖
            const firstPhoto = (item.images || []).find(image => image.type !== "video" && image.url);
            const coverUrl = (videoEntry && videoEntry.url)
                || (item.coverImage && item.coverImage.url)
                || (firstPhoto && firstPhoto.url)
                || getThumbnailUrl(videoUrl)
                || "";

            items.push({
                id: item.id,
                title: item.title,
                videoUrl,
                coverUrl,
                href: `/p/${itemPage.slug}/${item.slug}`
            });

        }

        return items;

    },

    // 頁面渲染前把所有輪播模組的作品資料換成最新的；沒有輪播模組就原樣回傳，不多查資料庫
    // 另外：沒放任何照片的「服務項目宮格」（例如 /p/services 服務項目頁）直接沿用首頁那組服務項目（照片、名稱、連結），
    // 只要在首頁管理改一次，兩邊就一致，不用維護兩份
    async refreshCarousels(modules, tenantId) {

        const needsServices = (modules || []).some(m => m.type === "serviceGrid"
            && !((m.data && m.data.items) || []).some(item => item.url));

        if (needsServices) {
            const { tenantCollection } = require("../config/firebase");
            const home = await tenantCollection(tenantId, "pages").doc("home").get();
            const homeGrid = ((home.exists && home.data().modules) || []).find(m => m.type === "serviceGrid"
                && ((m.data && m.data.items) || []).some(item => item.url));
            if (homeGrid) {
                modules = modules.map(m => m.type === "serviceGrid" && !((m.data && m.data.items) || []).some(item => item.url)
                    ? { ...m, data: { ...m.data, items: homeGrid.data.items } }
                    : m);
            }
        }

        if (!(modules || []).some(m => m.type === "videoCarousel")) {
            return modules;
        }

        return Promise.all(modules.map(async m => {
            if (m.type !== "videoCarousel") {
                return m;
            }
            const itemIds = ((m.data && m.data.items) || []).map(item => item.id);
            const items = await module.exports.resolveCarouselItems(tenantId, itemIds);
            return { ...m, data: { ...m.data, items } };
        }));

    },

    // 把後台表單送出的 req.body 轉成該模組類型該存的 data 欄位
    // 兩個 controller（自訂頁面/首頁-關於我-聯絡我）共用這支，避免各自維護一份、漏改其中一份
    // videoCarousel 需要查作品集資料，所以整支改成 async，call 的地方要記得 await
    async dataFromBody(type, body, tenantId) {

        // 單張圖片模組、圖文分欄模組的圖片共用這組風格選項
        const IMAGE_STYLES = ["none", "rounded", "sharp", "modern", "organic", "polaroid", "mono"];

        switch (type) {

            case "heading":
                return {
                    text: body.text,
                    level: body.level,
                    size: ["small", "medium", "large", "xlarge"].includes(body.size) ? body.size : "medium",
                    color: body.color || "",
                    align: ["left", "center", "right"].includes(body.align) ? body.align : "left",
                    weight: ["normal", "medium", "bold", "black"].includes(body.weight) ? body.weight : "bold"
                };

            case "text":
                return { html: body.html };

            case "image":
                return {
                    url: body.url,
                    path: body.path,
                    caption: body.caption,
                    imageStyle: IMAGE_STYLES.includes(body.imageStyle) ? body.imageStyle : "none",
                    imageBorderColor: body.imageBorderColor || ""
                };

            case "button":
                return { text: body.text, link: body.link };

            case "timelineItem":
                return { year: body.year, text: body.text };

            case "faqItem":
                return { question: String(body.question || "").trim(), answer: body.answer || "" };

            case "featureCard":
                return { title: body.title, description: body.description, borderColor: body.borderColor || "" };

            case "processStep":
                return { icon: body.icon, title: body.title, description: body.description };

            case "videoBlock":
                return { coverUrl: body.coverUrl, coverPath: body.coverPath, videoUrl: body.videoUrl, caption: body.caption };

            case "imageGallery": {

                let images = [];

                try {
                    images = body.imagesJson ? JSON.parse(body.imagesJson) : [];
                } catch (error) {
                    images = [];
                }

                return { images, galleryLayout: body.galleryLayout || "grid" };

            }

            case "contactForm":
                return {};

            case "bookingWidget":
                return {};

            case "splitFeature": {

                const sizes = ["small", "medium", "large", "xlarge"];
                const ratios = ["original", "square", "portrait", "landscape", "wide"];

                let images = [];

                try {
                    images = body.imagesJson ? JSON.parse(body.imagesJson) : [];
                } catch (error) {
                    images = [];
                }

                return {
                    heading: body.heading,
                    text: body.text,
                    images,
                    imagePosition: body.imagePosition === "left" ? "left" : "right",
                    darkBg: body.darkBg === "on",
                    imageFrame: body.imageFrame === "on",
                    headingSize: sizes.includes(body.headingSize) ? body.headingSize : "medium",
                    textSize: sizes.includes(body.textSize) ? body.textSize : "medium",
                    imageSize: sizes.includes(body.imageSize) ? body.imageSize : "medium",
                    imageRatio: ratios.includes(body.imageRatio) ? body.imageRatio : "original",
                    imageCorner: IMAGE_STYLES.includes(body.imageCorner) ? body.imageCorner : "rounded",
                    imageBorderColor: body.imageBorderColor || ""
                };

            }

            case "videoCarousel": {

                let itemIds = [];

                try {
                    itemIds = body.itemIdsJson ? JSON.parse(body.itemIdsJson) : [];
                } catch (error) {
                    itemIds = [];
                }

                const items = await module.exports.resolveCarouselItems(tenantId, itemIds);

                return { items, cornerStyle: body.cornerStyle === "sharp" ? "sharp" : "rounded" };

            }

            case "sponsorMarquee": {

                let logos = [];

                try {
                    logos = body.logosJson ? JSON.parse(body.logosJson) : [];
                } catch (error) {
                    logos = [];
                }

                return {
                    logos,
                    logoSize: ["small", "medium", "large", "xlarge"].includes(body.logoSize) ? body.logoSize : "medium"
                };

            }

            case "serviceGrid": {

                let items = [];

                try {
                    items = body.itemsJson ? JSON.parse(body.itemsJson) : [];
                } catch (error) {
                    items = [];
                }

                return {
                    items: items.map(item => ({
                        id: item.id,
                        url: item.url || "",
                        path: item.path || "",
                        title: item.title || "",
                        link: item.link || ""
                    })),
                    accentColor: body.accentColor || ""
                };

            }

            case "equipmentGrid":
                return {
                    mode: body.mode === "all" ? "all" : "featured",
                    limit: Math.min(24, Math.max(1, parseInt(body.limit, 10) || 6)),
                    linkUrl: (body.linkUrl || "").trim(),
                    linkText: (body.linkText || "").trim()
                };

            default:
                return {};

        }

    }

};
