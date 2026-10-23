// 一次性搬家：把舊版 LightDust（Turso + Cloudinary）的內容搬進這套系統（Firestore + Firebase Storage）。
// 用法：node scripts/migrateFromLightdustV1.js <舊資料匯出檔.json> <舊專案資料夾>
//   匯出檔：舊專案用 db.js 把各資料表 SELECT * 存成 { 資料表名: [列...] } 的 JSON
//   舊專案資料夾：用來讀 images/logo-mark.png、favicon
// 只能在「還沒有任何自訂頁面」的新站上跑，避免重複搬出兩份；要重跑請先清空 Firestore
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { tenantCollection } = require("../config/firebase");
const { DEFAULT_TENANT_ID: T } = require("../config/tenant");
const storageService = require("../services/storageService");
const settingsService = require("../services/settingsService");
const customPageService = require("../services/customPageService");
const collectionService = require("../services/collectionService");
const navConfigService = require("../services/navConfigService");
const mediaService = require("../services/mediaService");
const { resolveCarouselItems } = require("../services/moduleTypes");

const [exportPath, oldRoot] = process.argv.slice(2);
if (!exportPath || !oldRoot) {
    console.error("用法：node scripts/migrateFromLightdustV1.js <匯出檔.json> <舊專案資料夾>");
    process.exit(1);
}
const old = JSON.parse(fs.readFileSync(exportPath, "utf8"));

const mod = (type, data, extra = {}) => ({ id: crypto.randomUUID(), type, data, ...extra });
const heading = (text, align = "center") => mod("heading", { text, level: "2", size: "large", color: "", align, weight: "bold" });
const escapeHtml = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const paragraph = text => `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;

// ---------- 圖片：從 Cloudinary 下載 → 上傳 Firebase Storage → 收進媒體庫 ----------
// 不走 mediaService.upload：它會擋掉 800KB 以下的 JPEG，舊站很多是已經壓過的網頁版照片
async function download(url) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return { buffer: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") || "image/jpeg" };
        } catch (error) {
            if (attempt === 3) throw new Error(`下載失敗 ${url}：${error.message}`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
}

const uploadedByUrl = new Map();
async function importImage(url, name, albumId) {
    if (uploadedByUrl.has(url)) return uploadedByUrl.get(url);
    const { buffer, type } = await download(url);
    const fileName = name || path.basename(new URL(url).pathname);
    const stored = await storageService.uploadBuffer(buffer, fileName, type, "media");
    await tenantCollection(T, "media").add({
        name: fileName, url: stored.url, path: stored.path, size: buffer.length,
        contentType: type, albumId: albumId || "", createdAt: new Date()
    });
    uploadedByUrl.set(url, stored.url);
    return stored.url;
}

async function inBatches(list, size, fn) {
    const results = [];
    for (let i = 0; i < list.length; i += size) {
        results.push(...await Promise.all(list.slice(i, i + size).map(fn)));
    }
    return results;
}

async function main() {

    const existingPages = await customPageService.getAll(T);
    if (existingPages.length > 0) {
        throw new Error(`這個站已經有 ${existingPages.length} 個自訂頁面，看起來搬過了；要重跑請先清空 Firestore`);
    }

    const s = old.site_settings[0] || {};

    // ---------- 1. 網站設定、Logo、favicon ----------
    console.log("1/7 網站設定");
    const logoFile = path.join(oldRoot, "images/logo-mark.png");
    const faviconFile = path.join(oldRoot, "images/favicon-32.png");
    const logo = fs.existsSync(logoFile) ? await storageService.uploadBuffer(fs.readFileSync(logoFile), "logo-mark.png", "image/png", "settings") : null;
    const favicon = fs.existsSync(faviconFile) ? await storageService.uploadBuffer(fs.readFileSync(faviconFile), "favicon-32.png", "image/png", "settings") : null;
    await settingsService.update(T, {
        siteName: s.brand_name_zh || "光塵影像工作室",
        brandTextMain: "光塵",
        brandTextSub: "影像工作室",
        footerText: `© ${new Date().getFullYear()} ${s.brand_name_zh || "光塵影像工作室"} ${s.brand_name_en || ""}`.trim(),
        metaDescription: s.seo_description || "",
        contactPhone: s.contact_phone || "",
        contactEmail: s.contact_email || "",
        contactAddress: s.contact_address || "",
        lineFriendUrl: s.social_line || "",
        socialInstagramUrl: s.social_instagram || "",
        socialFacebookUrl: s.social_facebook || "",
        ...(logo ? { logoUrl: logo.url, logoPath: logo.path, logoHeight: 72 } : {}),
        ...(favicon ? { faviconUrl: favicon.url, faviconPath: favicon.path } : {}),
        // 全站深綠＋金（取自 Logo）：區塊 A 主色、區塊 B 加亮、導覽列／頁尾更深的墨綠；金色當強調色
        theme: "custom",
        customColorBg: "#1a3a3a",
        customColorBgAlt: "#224343",
        customColorHeaderBg: "#122b2b",
        customColorPanel: "#2a4c4b",
        customColorBorder: "#3b5d5b",
        customColorText: "#f2ede3",
        customColorMuted: "#b7c2bd",
        customColorAccent: "#e0a068",
        customColorAccent2: "#c98d55",
        customColorDanger: "#e07a62",
        showBrandTextInHeader: false,
        footerBackground: "dark",
        showHomeCarousel: false,
        features: { booking: false, line: false, sponsorMarquee: false, blog: false }
    });

    // ---------- 2. 作品集頁、分類 ----------
    console.log("2/7 作品集頁與分類");
    const groups = {
        photography: { title: "平面攝影", subtitle: "PHOTOGRAPHY", cats: [["commercial", "商業廣告", "Commercial"], ["space", "建築空間", "Architecture"], ["food", "美食攝影", "Food"], ["cosmetic", "化妝品攝影", "Cosmetics"], ["portrait", "形象照", "Portrait"]] },
        film: { title: "影片製作", subtitle: "FILM", cats: [["production", "影片製作", "Production"], ["brand", "形象影片", "Brand Film"], ["short", "短影音", "Short Video"]] }
    };
    const pageByGroup = {};
    const catIdByKey = {};
    for (const [group, def] of Object.entries(groups)) {
        const page = await customPageService.create(T, {
            slug: group, title: def.title, subtitle: def.subtitle, pageType: "collection", contentKind: "portfolio",
            published: true, metaDescription: `光塵影像工作室${def.title}作品集。`
        });
        pageByGroup[group] = page;
        for (const [key, label, nameEn] of def.cats) {
            const cat = await collectionService.createCategory(T, page.id, { label });
            await tenantCollection(T, "pageCategories").doc(cat.id).update({ nameEn });
            catIdByKey[`${group}:${key}`] = cat.id;
        }
    }

    for (const [group, def] of Object.entries(groups)) {
        const cats = await collectionService.getCategories(T, pageByGroup[group].id);
        await collectionService.reorderCategories(T, pageByGroup[group].id, def.cats.map(([, label]) => cats.find(c => c.label === label).id));
    }

    // ---------- 3. 作品＋照片 ----------
    console.log(`3/7 作品（${old.portfolio_projects.length} 件、${old.portfolio_photos.length} 張照片）`);
    const rootAlbum = await mediaService.createAlbum(T, "作品集");
    const projects = [...old.portfolio_projects].sort((a, b) => (a.sort_order - b.sort_order) || (b.id - a.id));
    const itemIdByLegacy = {};
    for (const p of projects) {
        const page = pageByGroup[p.group_key];
        if (!page) { console.log(`  略過（${p.group_key} 沒有對應頁面）：${p.title}`); continue; }
        const album = await mediaService.createAlbum(T, p.title, rootAlbum.id);
        const photos = old.portfolio_photos.filter(ph => ph.project_id === p.id).sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
        const urls = await inBatches(photos, 6, ph => importImage(ph.url, ph.filename ? `${path.basename(ph.filename)}.jpg` : "", album.id));
        const item = await collectionService.create(T, page.id, {
            slug: `${p.category_key}-${p.id}`,
            title: p.title,
            description: p.description ? paragraph(p.description) : "",
            metaDescription: p.description ? p.description.slice(0, 150) : `光塵影像工作室${p.tag || ""}作品：${p.title}。`,
            category: catIdByKey[`${p.group_key}:${p.category_key}`] || "",
            published: true,
            galleryLayout: p.layout === "grid" ? "grid" : "masonry",
            mediaImages: urls.map((url, i) => ({ url, alt: photos[i].caption || p.title }))
        });
        const coverUrl = p.cover_url ? (uploadedByUrl.get(p.cover_url) || urls[0]) : urls[0];
        await tenantCollection(T, "pageItems").doc(item.id).update({
            legacyId: p.id,
            ...(coverUrl ? { coverImage: { url: coverUrl, path: "" } } : {})
        });
        itemIdByLegacy[p.id] = item.id;
        console.log(`  ✓ ${p.title}（${urls.length} 張）`);
    }

    for (const page of Object.values(pageByGroup)) {
        const ordered = projects.map(p => itemIdByLegacy[p.id]).filter(Boolean);
        const onPage = (await collectionService.getItems(T, page.id)).map(item => item.id);
        if (onPage.length) await collectionService.reorderItems(T, page.id, ordered.filter(id => onPage.includes(id)));
    }

    // ---------- 4. 自訂頁面（服務頁、線上預約說明…） ----------
    console.log(`4/7 自訂頁面（${old.pages.length} 頁）`);
    const pageIdBySlug = {};
    for (const p of old.pages) {
        const modules = [];
        if (p.cover_url) modules.push(mod("image", { url: await importImage(p.cover_url), path: "", caption: "", imageStyle: "mono", imageBorderColor: "" }));
        if (p.intro) modules.push(mod("text", { html: paragraph(p.intro) }));
        const blocks = old.page_blocks.filter(b => b.page_id === p.id).sort((a, b) => a.sort_order - b.sort_order);
        for (const b of blocks) {
            const c = JSON.parse(b.content || "{}");
            if (b.block_type === "heading") {
                modules.push(heading(c.text || ""));
                if (c.subtitle) modules.push(mod("text", { html: `<p style="text-align:center">${escapeHtml(c.subtitle)}</p>` }));
            } else if (b.block_type === "text_image") {
                const images = c.image_url ? [{ id: crypto.randomUUID(), url: await importImage(c.image_url), path: "" }] : [];
                modules.push(mod("splitFeature", { heading: c.title || "", text: paragraph(c.text), images, imagePosition: c.position === "right" ? "right" : "left", darkBg: false, headingSize: "medium", textSize: "medium", imageSize: "medium", imageRatio: "original", imageFrame: false, imageCorner: "rounded", imageBorderColor: "" }));
            } else if (b.block_type === "button") {
                modules.push(mod("button", { text: c.text || "", link: c.url || "" }));
            } else if (b.block_type === "video") {
                modules.push(mod("videoBlock", { coverUrl: "", coverPath: "", videoUrl: c.media_url || "", caption: "" }));
            } else if (b.block_type === "gallery") {
                const images = await inBatches(c.images || [], 6, async img => ({ id: crypto.randomUUID(), url: await importImage(img.url), path: "", alt: img.caption || "" }));
                modules.push(mod("imageGallery", { images, galleryLayout: "grid" }));
            } else if (b.block_type === "contact_form") {
                modules.push(mod("contactForm", {}));
            }
        }
        const page = await customPageService.create(T, {
            slug: p.slug, title: p.title, subtitle: p.title_en || "", pageType: "content",
            // 線上預約頁：預約功能預設關閉，頁面先不發布（不然會自動出現在導覽列「更多」）
            published: !!p.published && p.slug !== "booking", metaDescription: p.seo_description || ""
        });
        await tenantCollection(T, "customPages").doc(page.id).update({ modules });
        pageIdBySlug[p.slug] = page.id;
        console.log(`  ✓ /p/${p.slug}（${modules.length} 個模組）`);
    }

    // ---------- 5. 關於我們、聯絡我們、我的設備、服務項目總覽 ----------
    console.log("5/7 關於我們、聯絡我們、我的設備、服務項目總覽");
    const story = [
        ["https://res.cloudinary.com/idsbjycq/image/upload/v1788017349/lightduststudio/portfolio/nzzs6uz6bd6lyuxeuooq.jpg", "用影像記錄品牌的每個瞬間", "LightDust Studio 光塵影像工作室成立於台北，我們相信影像不只是紀錄，更是品牌與消費者溝通的語言。從攝影到影片、從平面到整合行銷，我們陪伴每一個品牌找到屬於自己的視覺敘事方式。", "left"],
        ["https://res.cloudinary.com/idsbjycq/image/upload/v1788017337/lightduststudio/portfolio/faiguaiofsnnik2lmdsi.jpg", "細節成就質感", "每一次拍攝前，我們都會深入了解品牌的核心價值與目標受眾，從燈光、構圖到後期調色，力求每一幀畫面都精準傳達品牌調性，讓專業與美感並存。", "right"]
    ];
    const aboutModules = [];
    for (const [img, title, text, pos] of story) {
        aboutModules.push(mod("splitFeature", { heading: title, text: paragraph(text), images: [{ id: crypto.randomUUID(), url: await importImage(img), path: "" }], imagePosition: pos, darkBg: false, headingSize: "medium", textSize: "medium", imageSize: "medium", imageRatio: "original", imageFrame: false, imageCorner: "rounded", imageBorderColor: "" }));
    }
    for (const [title, text] of [["01 — Craft", "堅持每個細節，從前期規劃到後期製作，維持一致的專業水準。"], ["02 — Story", "每個品牌都有值得訴說的故事，我們用影像找到最合適的敘事方式。"], ["03 — Partnership", "與客戶建立長期合作關係，成為品牌成長路上值得信賴的影像夥伴。"]]) {
        aboutModules.push(mod("featureCard", { title, description: text, borderColor: "" }));
    }
    const contactInfo = [["EMAIL", s.contact_email], ["PHONE", s.contact_phone], ["LINE", s.social_line], ["STUDIO", s.contact_address]].filter(([, v]) => v);
    const special = [
        { slug: "about", title: "關於我們", subtitle: "ABOUT US", modules: aboutModules },
        { slug: "contact", title: "聯絡我們", subtitle: "CONTACT", modules: [
            heading("開始您的專案", "left"),
            mod("text", { html: paragraph("不論是商業攝影、影片製作或平面設計需求，歡迎填寫表單，或直接透過以下方式與我們聯繫。") + contactInfo.map(([k, v]) => `<p><strong>${k}</strong>　${escapeHtml(v)}</p>`).join("") }),
            mod("contactForm", {})
        ] },
        { slug: "equipment", title: "我的設備", subtitle: "EQUIPMENT", modules: [mod("equipmentGrid", { mode: "all", limit: 6, linkUrl: "", linkText: "" })] }
    ];
    const servicePages = old.pages.filter(p => p.slug !== "booking");
    special.push({ slug: "services", title: "服務項目", subtitle: "SERVICES", modules: [mod("serviceGrid", {
        items: servicePages.map(p => ({ id: crypto.randomUUID(), url: p.cover_url ? uploadedByUrl.get(p.cover_url) || "" : "", path: "", title: p.title, link: `/p/${p.slug}` })),
        accentColor: ""
    })] });
    for (const sp of special) {
        const page = await customPageService.create(T, { slug: sp.slug, title: sp.title, subtitle: sp.subtitle, pageType: "content", published: true, metaDescription: "" });
        await tenantCollection(T, "customPages").doc(page.id).update({ modules: sp.modules });
        pageIdBySlug[sp.slug] = page.id;
        console.log(`  ✓ /p/${sp.slug}`);
    }

    // ---------- 6. 導覽列（服務頁掛在「服務項目」下拉） ----------
    console.log("6/7 導覽列");
    for (const item of await navConfigService.getAll(T)) await navConfigService.remove(T, item.id);
    const nav = (label, target) => navConfigService.create(T, target.startsWith("/")
        ? { label, targetType: "url", targetUrl: target }
        : { label, targetType: "page", targetPageId: target });
    const navItems = [
        await nav("首頁", "/"),
        await nav("服務項目", pageIdBySlug.services),
        await nav("平面攝影", pageByGroup.photography.id),
        await nav("影片製作", pageByGroup.film.id),
        await nav("關於我們", pageIdBySlug.about),
        await nav("我的設備", pageIdBySlug.equipment),
        await nav("聯絡我們", pageIdBySlug.contact)
    ];
    const servicesNav = navItems[1];
    // 平面攝影的下拉選單列出所有分類（含還沒有作品的）
    await tenantCollection(T, "navItems").doc(navItems[2].id).update({ showCategories: true, showEmptyCategories: true });
    // 清單是 sortOrder 大的在前，依建立順序存進去會整個倒過來，所以明確套用一次想要的順序
    await navConfigService.reorderNavItems(T, navItems.map(item => item.id));
    for (const p of servicePages) {
        await tenantCollection(T, "customPages").doc(pageIdBySlug[p.slug]).update({ navParent: servicesNav.id });
    }

    // ---------- 7. 首頁 ----------
    console.log("7/7 首頁");
    const oldSlides = (old.hero_slides || []).filter(h => h.published !== 0).sort((a, b) => a.sort_order - b.sort_order);
    const slide = oldSlides[0] || {};
    const heroSlides = [];
    for (const h of oldSlides) {
        const isEmbed = h.media_type === "embed";
        const image = h.media_type === "image" && h.media_url ? await importImage(h.media_url) : "";
        const video = isEmbed ? h.media_url : (h.media_type === "video" ? h.media_url : "");
        if (image || video) heroSlides.push({ id: crypto.randomUUID(), image, video, eyebrow: h.eyebrow || "", title: h.title || "", subtitle: h.subtitle || "" });
    }
    const heroImage = heroSlides.find(h => h.image) ? heroSlides.find(h => h.image).image : "";
    const workIds = projects.slice().sort((a, b) => b.id - a.id).map(p => itemIdByLegacy[p.id]).filter(Boolean).slice(0, 8);
    const steps = [["需求訪談", "釐清品牌調性與用途"], ["視覺企劃", "風格參考 + 拍攝腳本"], ["拍攝執行", "棚拍 / 外拍 / 影片"], ["後製精修", "修圖調色 + 影片剪輯"], ["完成交件", "雲端交付高解析檔案"]];
    const aboutTeaser = await importImage("https://res.cloudinary.com/idsbjycq/image/upload/v1788017339/lightduststudio/portfolio/oacjotoxmjvjj6lj03am.jpg");
    const homeModules = [
        // 兩段深綠底的作品輪播（Logo 綠），中文大標＋金色英文小標
        ...[["精選作品", "OUR WORKS", "#1a3a3a"], ["平面攝影", "PHOTOGRAPH", "#122b2b"]].flatMap(([zh, en, bg]) => [
            heading(zh),
            mod("text", { html: `<p style="text-align:center;letter-spacing:.3em;color:#e0a068;margin-top:-6px">${en}</p>` }),
            mod("videoCarousel", { items: [], cornerStyle: "sharp" })
        ].map(m => ({ ...m, background: bg === "#1a3a3a" ? "none" : "alt" }))),
        ...[heading("服務項目"), mod("serviceGrid", { items: special.find(sp => sp.slug === "services").modules[0].data.items, accentColor: "" })]
            .map(m => ({ ...m, background: "none" })),
        mod("splitFeature", { heading: "關於我們", text: paragraph("我們是一群熱愛影像的創作者，橫跨攝影、影片與設計領域，用專業與美感為品牌打造獨一無二的視覺語彙。"), images: [{ id: crypto.randomUUID(), url: aboutTeaser, path: "" }], imagePosition: "left", darkBg: false, headingSize: "medium", textSize: "medium", imageSize: "medium", imageRatio: "original", imageFrame: false, imageCorner: "sharp", imageBorderColor: "" }, { background: "alt" }),
        mod("button", { text: "了解更多", link: "/p/about" }, { background: "alt" }),
        mod("equipmentGrid", { mode: "featured", limit: 6, linkUrl: "/p/equipment", linkText: "查看全部設備" }),
        ...[heading("合作流程"), ...steps.map(([title, description]) => mod("processStep", { title, description }))]
            .map(m => ({ ...m, background: "none" })),
        ...[heading("聯絡我們"),
            mod("text", { html: "<p style=\"text-align:center\">有拍攝、影片或設計的需求嗎？告訴我們你的想法，我們會盡快與你聯繫。</p>" }),
            mod("button", { text: "填寫需求表單", link: "/p/contact" })]
            .map(m => ({ ...m, background: "alt" }))
    ];
    const carouselItems = await resolveCarouselItems(T, workIds);
    homeModules.filter(m => m.type === "videoCarousel").forEach(m => { m.data.items = carouselItems; });
    await tenantCollection(T, "pages").doc("home").set({
        heroTitle: String(slide.title || "用鏡頭說出\n品牌的故事").replace(/\n/g, "<br>"),
        heroSubtitle: slide.subtitle || "",
        buttonText: "查看作品",
        buttonLink: "/p/photography",
        button2Text: "聯絡我們",
        button2Link: "/p/contact",
        // 舊站的滿版輪播主視覺
        heroStyle: heroSlides.length ? "slideshow" : "classic",
        heroSlides,
        heroShowTitle: true, heroShowSubtitle: true, heroShowButton: true,
        heroImage, heroImagePath: "",
        showFeaturedWorks: false,
        modules: homeModules,
        updatedAt: new Date()
    }, { merge: true });

    console.log(`\n完成：${Object.keys(itemIdByLegacy).length} 件作品、${uploadedByUrl.size} 張圖片、${Object.keys(pageIdBySlug).length} 個頁面`);

}

main().then(() => process.exit(0)).catch(error => { console.error("搬家失敗：", error); process.exit(1); });
