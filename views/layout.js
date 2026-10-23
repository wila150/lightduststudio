const BRAND = require("../config/brand");
// 導覽項目本身可以點擊連到自己的網址/自訂頁面，如果有自訂頁面掛在底下、
// 或這個項目本身有分類清單（作品集/文章），滑鼠移過去/focus 時額外展開下拉選單
// （沿用「更多」原本就有的 hover 下拉樣式）
const { ASSET_VERSION } = require("../config/version");
const { SITE_URL } = require("../config/site");

// subtitle 是這個導覽項目指到的頁面（如果有指到頁面、且該頁面有填副標）的副標文字，
// 滑鼠移過去該連結時原本的文字會滑上去換成副標，見 public/css/style.css 的 .nav-link-swap。
// 有下拉選單的項目（掛了子頁面或分類）一樣要有這個效果，▾ 箭頭固定不動，只有文字本身滑動
function renderNavLabel(label, subtitle) {

    if (!subtitle) {
        return label;
    }

    return `<span class="nav-link-swap"><span class="nav-label-track"><span class="nav-label-main">${label}</span><span class="nav-label-alt">${subtitle}</span></span></span>`;

}

function renderNavItem(navItem, href, childPages, categoryLinks, subtitle) {

    if (childPages.length === 0 && categoryLinks.length === 0) {
        return `<a href="${href}">${renderNavLabel(navItem.label, subtitle)}</a>`;
    }

    return `
    <div class="nav-dropdown" tabindex="0">
        <a href="${href}">${renderNavLabel(navItem.label, subtitle)}</a>
        <div class="nav-dropdown-menu">
            ${categoryLinks.map(cat => `<a href="${href}?category=${cat.id}">${cat.label}</a>`).join("")}
            ${childPages.map(page => `<a href="/p/${page.slug}">${page.title || page.subtitle}</a>`).join("")}
        </div>
    </div>
    `;

}

// 下拉選單的子頁面照建立順序排（先建的在上面）；navPages 本身是新的在前，直接用會整個倒過來
function sortChildPages(pages) {
    const time = page => (page.createdAt && page.createdAt.toDate ? page.createdAt.toDate() : new Date(page.createdAt || 0)).getTime();
    return [...pages].sort((a, b) => time(a) - time(b));
}

// target.type === "page" 時，用 pageId 對應目前的 slug；找不到（頁面被刪除或還沒發布）就拿掉這個導覽項目
function resolveNavHref(navItem, navPages) {

    if (navItem.target.type !== "page") {
        return navItem.target.value || "#";
    }

    const page = navPages.find(p => p.id === navItem.target.pageId);

    return page ? `/p/${page.slug}` : null;

}

// 麵包屑：首頁 | 頁面 | 分類 | 作品，每一層都可以點（2026/10/01 回饋）。
// crumbs 是首頁之後的每一層 { label, href }，沒有 href 的就單純顯示文字；
// data-crumb-category 那層是給清單頁切換分類標籤時，由 public/js/main.js 即時換成目前分類
// side=true 時桌機寬螢幕把麵包屑移到頁面大標左側（見 style.css .breadcrumb--side）
function renderBreadcrumb(crumbs, side) {

    const parts = [{ label: "首頁", href: "/" }, ...crumbs].map(crumb => {
        const attrs = crumb.categorySlot ? ` data-crumb-category${crumb.label ? "" : " hidden"}` : "";
        const label = String(crumb.label || "").replace(/\s*\n\s*/g, " ");
        const inner = crumb.href ? `<a href="${escapeAttr(crumb.href)}">${label}</a>` : label;
        return `<span class="breadcrumb-item"${attrs}>${inner}</span>`;
    });

    return `<nav class="breadcrumb${side ? " breadcrumb--side" : ""}" aria-label="目前位置"><div class="breadcrumb-inner">${parts.join("")}</div></nav>`;

}

function escapeAttr(value) {
    return String(value == null ? "" : value).replace(/"/g, "&quot;");
}

module.exports = (title, content, navPages = [], settings = {}, navItems = [], pageMeta = {}) => {

// 首頁標題不要出現「首頁」兩個字（搜尋結果會顯示成「網站名稱: 首頁」，沒有資訊量），
// 改成「網站名稱｜在做什麼」，標語在 config/brand.js
const HOME_TITLE_TAGLINE = BRAND.homeTagline;
const fullTitle = title === "首頁" && settings.siteName
    ? `${settings.siteName}｜${HOME_TITLE_TAGLINE}`
    : `${title}${settings.siteName ? ` | ${settings.siteName}` : ""}`;
const description = pageMeta.description || settings.metaDescription || "";
const ogImage = pageMeta.image || settings.ogImageUrl || "";
const canonicalUrl = pageMeta.url || "";

// Organization 結構化資料：讓 Google 把網站跟社群帳號視為同一個品牌實體，有助於品牌詞搜尋
// 不含地址／電話，這兩項目前是 CMS 聯絡資訊裡的範例佔位資料，還沒填入真實內容
const sameAs = [settings.socialInstagramUrl, settings.socialFacebookUrl, settings.socialYoutubeUrl].filter(Boolean);
// GEO（2026/10/03）：升級成 ProfessionalService（在地專業服務商家），讓 AI 搜尋與 Google 知道
// 「在哪裡、服務哪些地區、做什麼、怎麼聯絡」，回答「新北推薦的攝影工作室」這類問題時才會被引用
// 服務地區、服務項目可以在網站設定覆寫（serviceAreas、serviceList），沒填就用下面的預設
// 沒有實體工作室（2026/10/03 確認），只標地區、不放地址；服務地區照 SEO 描述「位於新北」
const DEFAULT_SERVICE_AREAS = BRAND.serviceAreas;
const DEFAULT_SERVICES = BRAND.services;
const serviceAreas = (settings.serviceAreas && settings.serviceAreas.length ? settings.serviceAreas : DEFAULT_SERVICE_AREAS);
const serviceList = (settings.serviceList && settings.serviceList.length ? settings.serviceList : DEFAULT_SERVICES);
const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": SITE_URL + "/#organization",
    name: settings.siteName || "",
    alternateName: BRAND.alternateNames,
    url: SITE_URL,
    description: settings.metaDescription || "",
    ...(settings.logoUrl ? { logo: settings.logoUrl } : {}),
    image: settings.ogImageUrl || settings.logoUrl || undefined,
    ...(settings.contactPhone ? { telephone: settings.contactPhone } : {}),
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(serviceAreas.length ? {
        address: { "@type": "PostalAddress", addressRegion: serviceAreas[0], addressCountry: "TW" },
        areaServed: serviceAreas.map(name => ({ "@type": "City", name }))
    } : { address: { "@type": "PostalAddress", addressCountry: "TW" } }),
    knowsAbout: serviceList,
    hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: BRAND.serviceCatalogName,
        itemListElement: serviceList.map(name => ({ "@type": "Offer", itemOffered: { "@type": "Service", name, ...(serviceAreas.length ? { areaServed: serviceAreas.join("、") } : {}) } }))
    },
    ...(sameAs.length > 0 ? { sameAs } : {})
};

// WebSite 結構化資料：告訴 Google 網站名稱。網站放在 Render 的共用網域（onrender.com）上，
// Google 搜尋結果的網站名稱會顯示成「Render」；這段能幫忙，但最根本的解法是換成自己的網域
const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName || "",
    alternateName: BRAND.alternateNames,
    url: SITE_URL + "/"
};

// 麵包屑結構化資料：跟畫面上的「首頁｜FILM｜分類｜作品」一致，讓搜尋引擎／AI 看懂網站層級
const breadcrumbTrail = title === "首頁" ? [] : [{ label: "首頁", href: "/" }, ...((pageMeta.breadcrumbs || [{ label: title, href: pageMeta.path }]).filter(crumb => crumb && crumb.label && crumb.href))];
const breadcrumbSchema = breadcrumbTrail.length > 1 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbTrail.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: String(crumb.label).replace(/\s*\n\s*/g, " "),
        item: SITE_URL + crumb.href
    }))
} : null;

const resolvedNavItems = navItems
    .map(navItem => ({ navItem, href: resolveNavHref(navItem, navPages) }))
    .filter(entry => entry.href !== null);

// 被導覽項目直接指到，或掛在某個導覽項目底下當下拉子項目的自訂頁面，不再重複出現在「更多」
const handledPageIds = new Set(
    resolvedNavItems
        .filter(entry => entry.navItem.target.type === "page")
        .map(entry => entry.navItem.target.pageId)
);
const nestedParentIds = new Set(resolvedNavItems.map(entry => entry.navItem.id));

const moreItems = navPages.filter(page => !handledPageIds.has(page.id) && !nestedParentIds.has(page.navParent));

return `
<!DOCTYPE html>
<html lang="zh-TW" data-theme="${settings.theme || "dark-artistic"}">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${fullTitle}</title>

    ${description ? `<meta name="description" content="${escapeAttr(description)}">` : ""}
    ${(settings.metaKeywords || []).length > 0 ? `<meta name="keywords" content="${escapeAttr(settings.metaKeywords.join(", "))}">` : ""}
    ${canonicalUrl ? `<link rel="canonical" href="${escapeAttr(canonicalUrl)}">` : ""}

    <meta property="og:type" content="${pageMeta.type || "website"}">
    <meta property="og:title" content="${escapeAttr(fullTitle)}">
    ${description ? `<meta property="og:description" content="${escapeAttr(description)}">` : ""}
    ${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : ""}
    ${canonicalUrl ? `<meta property="og:url" content="${escapeAttr(canonicalUrl)}">` : ""}

    <meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
    <meta name="twitter:title" content="${escapeAttr(fullTitle)}">
    ${description ? `<meta name="twitter:description" content="${escapeAttr(description)}">` : ""}
    ${ogImage ? `<meta name="twitter:image" content="${escapeAttr(ogImage)}">` : ""}

    ${settings.googleSiteVerification ? `<meta name="google-site-verification" content="${escapeAttr(settings.googleSiteVerification)}">` : ""}

    ${settings.faviconUrl ? `
    <link rel="icon" href="${settings.faviconUrl}">
    <link rel="apple-touch-icon" href="${settings.faviconUrl}">
    ` : `
    <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/images/favicon-48.png">
    <link rel="shortcut icon" href="/images/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
    `}

    <link rel="stylesheet" href="/css/style.css?v=${ASSET_VERSION}">

    ${settings.theme === "bluedot" ? `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@500;700;900&display=swap" rel="stylesheet">
    ` : ""}

    ${settings.theme === "custom" ? `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;700;900&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
    ` : ""}

    ${settings.theme === "custom" ? `
    <style>
        :root[data-theme="custom"] {
            --bg: ${settings.customColorBg || "#f4f1ec"};
            --bg-alt: ${settings.customColorBgAlt || "#e8e2d6"};
            --panel: ${settings.customColorPanel || "#fbfaf7"};
            --border: ${settings.customColorBorder || "#d8cdb8"};
            --text: ${settings.customColorText || "#33302a"};
            --muted: ${settings.customColorMuted || "#8d8477"};
            --accent: ${settings.customColorAccent || "#5b7a99"};
            --accent-2: ${settings.customColorAccent2 || "#7f9db3"};
            --danger: ${settings.customColorDanger || "#b5533f"};
            --header-bg: ${settings.customColorHeaderBg || "#f4f1ec"};
        }
    </style>
    ` : ""}

    ${(settings.headingFont || settings.bodyFont) ? `
    <style>
        ${settings.headingFont ? `
        @font-face { font-family: "custom-heading-font"; src: url("/fonts/${settings.headingFont.id}") format("${settings.headingFont.format}"); font-display: swap; }
        ` : ""}
        ${settings.bodyFont ? `
        @font-face { font-family: "custom-body-font"; src: url("/fonts/${settings.bodyFont.id}") format("${settings.bodyFont.format}"); font-display: swap; }
        ` : ""}
        /* 直接列出完整的 fallback 字體，不能用 var(--font-display) 接原本樣板的字體堆疊——
           同一個元素上 --font-display 又設一次又拿自己的值來接，會變成 CSS 自我循環參照，
           整個變數直接失效（不是「接不到」而是「完全没作用，連字體都不會換」） */
        html[data-theme] {
            ${settings.headingFont ? `--font-display: "custom-heading-font", "Noto Sans TC", -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif;` : ""}
            ${settings.bodyFont ? `--font-body: "custom-body-font", "Noto Sans TC", -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif;` : ""}
        }
    </style>
    ` : ""}

    ${settings.googleAnalyticsId ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${settings.googleAnalyticsId}');
    </script>
    ` : ""}

    <script type="application/ld+json">${JSON.stringify(organizationSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>
    ${breadcrumbSchema ? `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>` : ""}
</head>

<body>

<header id="top" class="site-header" style="--header-padding-y:${settings.headerPaddingY != null ? settings.headerPaddingY : 24}px;">

    <h1 class="logo">
        <a href="/">${settings.logoUrl
            ? `<img src="${settings.logoUrl}" alt="${settings.siteName || "我的作品集"}" class="logo-image" style="height:${settings.logoHeight || 40}px;">`
            : (settings.siteName || "我的作品集")}${settings.logoUrl && settings.showBrandTextInHeader && (settings.brandTextMain || settings.brandTextSub) ? `<span class="logo-text"><span class="logo-text-main">${settings.brandTextMain || ""}</span><span class="logo-text-sub">${settings.brandTextSub || ""}</span></span>` : ""}</a>
    </h1>

    <nav class="site-nav">

        ${resolvedNavItems.map(({ navItem, href }) => {
            const categoryLinks = navItem.categoryLinks || [];
            const childPages = sortChildPages(navPages.filter(page => page.navParent === navItem.id));
            const targetPage = navItem.target.type === "page" ? navPages.find(page => page.id === navItem.target.pageId) : null;
            return renderNavItem(navItem, href, childPages, categoryLinks, targetPage && targetPage.subtitle);
        }).join("")}

        ${moreItems.length === 0 ? "" : `
        <div class="nav-dropdown nav-dropdown-more" tabindex="0">
            <span class="nav-more-toggle" aria-label="更多"><span></span><span></span><span></span></span>
            <div class="nav-dropdown-menu">
                ${moreItems.map(page => `<a href="/p/${page.slug}">${page.title}</a>`).join("")}
            </div>
        </div>
        `}

    </nav>

    <button type="button" class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="開啟選單" aria-expanded="false">
        <span></span><span></span><span></span>
    </button>

</header>

<div class="mobile-nav-overlay" id="mobile-nav-overlay">

    <div class="mobile-nav-bar">
        <a href="/" class="mobile-nav-logo" aria-label="回首頁">${settings.logoUrl
            ? `<img src="${settings.logoUrl}" alt="${settings.siteName || "我的作品集"}" style="height:${settings.logoHeight || 40}px;">`
            : (settings.siteName || "我的作品集")}</a>
        <button type="button" class="mobile-nav-close" id="mobile-nav-close" aria-label="關閉選單">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
        </button>
    </div>

    <nav class="mobile-nav-links">

        ${resolvedNavItems.map(({ navItem, href }) => {

            // 手機版沒有滑鼠 hover，桌機下拉選單的子項目（分類／掛在底下的自訂頁面）改成固定顯示在主連結下方，
            // 確保手機跟桌機看得到的選單項目、連結完全一致，不會漏掉分類或子頁面
            const categoryLinks = navItem.categoryLinks || [];
            const childPages = sortChildPages(navPages.filter(page => page.navParent === navItem.id));
            const children = [
                ...categoryLinks.map(cat => ({ href: `${href}?category=${cat.id}`, label: cat.label, nameEn: cat.nameEn })),
                ...childPages.map(page => ({ href: `/p/${page.slug}`, label: page.title || page.subtitle }))
            ];

            return `
            <div class="mobile-nav-group">
                <div class="mobile-nav-group-head">
                    <a href="${href}">${navItem.label}</a>
                    ${children.length > 0 ? `<button type="button" class="mobile-nav-toggle" aria-label="展開${navItem.label}子選單" aria-expanded="false">+</button>` : ""}
                </div>
                ${children.length > 0 ? `
                <div class="mobile-nav-children">
                    ${children.map(child => `<a href="${child.href}" class="mobile-nav-child">${child.label}</a>`).join("")}
                </div>
                ` : ""}
            </div>
            `;

        }).join("")}

        ${moreItems.map(page => `<div class="mobile-nav-group"><div class="mobile-nav-group-head"><a href="/p/${page.slug}">${page.title}</a></div></div>`).join("")}

    </nav>

    ${(settings.socialFacebookUrl || settings.socialInstagramUrl || settings.socialYoutubeUrl || settings.lineFriendUrl) ? `
    <div class="social-links mobile-nav-social">
        ${settings.lineFriendUrl ? `
        <a href="${settings.lineFriendUrl}" target="_blank" rel="noopener" aria-label="LINE">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 3C6.48 3 2 6.58 2 11c0 3.94 3.52 7.24 8.28 7.88.32.07.76.21.87.49.1.25.06.65.03.9l-.14.85c-.04.25-.2.99.86.54s5.7-3.36 7.78-5.75C21.06 14.02 22 12.6 22 11c0-4.42-4.48-8-10-8zm-4.9 10.4H5.4a.4.4 0 0 1-.4-.4V8.6a.5.5 0 0 1 1 0v3.9h1.1a.45.45 0 0 1 0 .9zm2.2 0a.5.5 0 0 1-.5-.5V8.6a.5.5 0 0 1 1 0v4.3a.5.5 0 0 1-.5.5zm5.3 0a.4.4 0 0 1-.32-.16l-2.18-2.96v2.62a.5.5 0 0 1-1 0V8.6a.4.4 0 0 1 .72-.24l2.18 2.96V8.6a.5.5 0 0 1 1 0v4.3a.4.4 0 0 1-.4.5zm3.6 0h-2.1a.4.4 0 0 1-.4-.4V8.6a.4.4 0 0 1 .4-.4h2.1a.45.45 0 0 1 0 .9h-1.6v1h1.5a.45.45 0 0 1 0 .9h-1.5v1h1.6a.45.45 0 0 1 0 .9z"/></svg>
        </a>
        ` : ""}
        ${settings.socialFacebookUrl ? `
        <a href="${settings.socialFacebookUrl}" target="_blank" rel="noopener" aria-label="Facebook">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
        </a>
        ` : ""}
        ${settings.socialInstagramUrl ? `
        <a href="${settings.socialInstagramUrl}" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5"/>
                <circle cx="12" cy="12" r="4.6"/>
                <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/>
            </svg>
        </a>
        ` : ""}
        ${settings.socialYoutubeUrl ? `
        <a href="${settings.socialYoutubeUrl}" target="_blank" rel="noopener" aria-label="YouTube">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.6 15.5v-7l6.27 3.5-6.27 3.5z"/></svg>
        </a>
        ` : ""}
    </div>
    ` : ""}

</div>

${title !== "首頁" ? renderBreadcrumb(pageMeta.breadcrumbs || [{ label: title, href: pageMeta.path }], pageMeta.breadcrumbSide) : ""}

<main class="site-main">

${content}

</main>

<footer class="site-footer${settings.footerBackground === "alt" ? " site-footer--alt" : ""}${settings.footerBackground === "dark" ? " site-footer--dark" : ""}">

    ${settings.theme === "bluedot" ? `
    <div class="footer-brand">${settings.siteName || ""}</div>
    ` : ""}

    ${settings.footerBackground === "dark" && settings.theme !== "bluedot" ? `
    <div class="footer-logo">
        ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.siteName || ""}">` : ""}
        ${settings.brandTextMain || settings.brandTextSub
            ? `<span class="logo-text"><span class="logo-text-main">${settings.brandTextMain || ""}</span><span class="logo-text-sub">${settings.brandTextSub || ""}</span></span>`
            : `<span class="logo-text-main">${settings.siteName || ""}</span>`}
    </div>
    ` : ""}

    ${(settings.contactPhone || settings.contactEmail || settings.contactAddress || settings.contactHours) ? `
    <div class="footer-contact">
        ${settings.contactPhone ? `<div class="footer-contact-item"><span class="footer-contact-label">TEL</span><span>${settings.contactPhone}</span></div>` : ""}
        ${settings.contactEmail ? `<div class="footer-contact-item"><span class="footer-contact-label">MAIL</span><a href="mailto:${settings.contactEmail}">${settings.contactEmail}</a></div>` : ""}
        ${settings.contactAddress ? `<div class="footer-contact-item"><span class="footer-contact-label">ADD</span><span>${settings.contactAddress}</span></div>` : ""}
        ${settings.contactHours ? `<div class="footer-contact-item"><span class="footer-contact-label">HOURS</span><span>${settings.contactHours}</span></div>` : ""}
    </div>
    ` : ""}

    <p>
        ${settings.footerText || "© 2025 PortfolioWeb"}
    </p>

    ${(settings.socialFacebookUrl || settings.socialInstagramUrl || settings.socialYoutubeUrl || settings.lineFriendUrl) ? `
    <div class="social-links">
        ${settings.lineFriendUrl ? `
        <a href="${settings.lineFriendUrl}" target="_blank" rel="noopener" aria-label="LINE">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 3C6.48 3 2 6.58 2 11c0 3.94 3.52 7.24 8.28 7.88.32.07.76.21.87.49.1.25.06.65.03.9l-.14.85c-.04.25-.2.99.86.54s5.7-3.36 7.78-5.75C21.06 14.02 22 12.6 22 11c0-4.42-4.48-8-10-8zm-4.9 10.4H5.4a.4.4 0 0 1-.4-.4V8.6a.5.5 0 0 1 1 0v3.9h1.1a.45.45 0 0 1 0 .9zm2.2 0a.5.5 0 0 1-.5-.5V8.6a.5.5 0 0 1 1 0v4.3a.5.5 0 0 1-.5.5zm5.3 0a.4.4 0 0 1-.32-.16l-2.18-2.96v2.62a.5.5 0 0 1-1 0V8.6a.4.4 0 0 1 .72-.24l2.18 2.96V8.6a.5.5 0 0 1 1 0v4.3a.4.4 0 0 1-.4.5zm3.6 0h-2.1a.4.4 0 0 1-.4-.4V8.6a.4.4 0 0 1 .4-.4h2.1a.45.45 0 0 1 0 .9h-1.6v1h1.5a.45.45 0 0 1 0 .9h-1.5v1h1.6a.45.45 0 0 1 0 .9z"/></svg>
        </a>
        ` : ""}
        ${settings.socialFacebookUrl ? `
        <a href="${settings.socialFacebookUrl}" target="_blank" rel="noopener" aria-label="Facebook">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
        </a>
        ` : ""}
        ${settings.socialInstagramUrl ? `
        <a href="${settings.socialInstagramUrl}" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5"/>
                <circle cx="12" cy="12" r="4.6"/>
                <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/>
            </svg>
        </a>
        ` : ""}
        ${settings.socialYoutubeUrl ? `
        <a href="${settings.socialYoutubeUrl}" target="_blank" rel="noopener" aria-label="YouTube">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.6 15.5v-7l6.27 3.5-6.27 3.5z"/></svg>
        </a>
        ` : ""}
    </div>
    ` : ""}

    <div class="footer-actions">
        <a href="/p/contact" class="footer-cta-btn">CONTACT US</a>
        <a href="#top" class="footer-top-link" id="footer-top-link">PAGE TOP <span class="footer-top-arrow">↑</span></a>
    </div>

</footer>

<script>
(function () {
    var topLink = document.getElementById("footer-top-link");
    if (!topLink) { return; }
    topLink.addEventListener("click", function (event) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
})();
</script>

${settings.cookieConsentEnabled ? `
<div class="cookie-banner" id="cookie-banner" style="display:none;">
    <p>${settings.cookieConsentText || "本網站使用 Cookie 以提供更好的瀏覽體驗，繼續瀏覽即表示您同意。"}</p>
    <button type="button" id="cookie-banner-accept">我知道了</button>
</div>
<script>
(function () {
    try {
        if (localStorage.getItem("cookieConsentDismissed") === "1") {
            return;
        }
    } catch (error) {
        return;
    }
    var banner = document.getElementById("cookie-banner");
    banner.style.display = "flex";
    document.getElementById("cookie-banner-accept").addEventListener("click", function () {
        try {
            localStorage.setItem("cookieConsentDismissed", "1");
        } catch (error) {}
        banner.style.display = "none";
    });
})();
</script>
` : ""}

${(settings.lineFriendUrl || settings.socialInstagramUrl || settings.contactPhone || settings.contactEmail) ? `
<div class="social-float" id="social-float">

    ${settings.contactEmail ? `
    <a class="social-float-btn social-float-btn--email" href="mailto:${settings.contactEmail}" aria-label="Email">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/>
            <path d="M3.5 6l8.5 7 8.5-7"/>
        </svg>
    </a>
    ` : ""}

    ${settings.contactPhone ? `
    <a class="social-float-btn social-float-btn--phone" href="tel:${settings.contactPhone.replace(/[^0-9+]/g, "")}" aria-label="電話">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.2 1.1z"/>
        </svg>
    </a>
    ` : ""}

    ${settings.socialInstagramUrl ? `
    <a class="social-float-btn social-float-btn--instagram" href="${settings.socialInstagramUrl}" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5"/>
            <circle cx="12" cy="12" r="4.6"/>
            <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/>
        </svg>
    </a>
    ` : ""}

    ${settings.lineFriendUrl ? `
    <div class="line-widget" id="line-widget">

        <div class="line-widget-panel" id="line-widget-panel">
            <div class="line-widget-header">
                <span class="line-widget-badge">LINE</span>
                <span>Line</span>
                <button type="button" class="line-widget-close" id="line-widget-close" aria-label="關閉">✕</button>
            </div>
            <div class="line-widget-body">
                ${settings.lineQrSvg || ""}
                <a href="${settings.lineFriendUrl}" target="_blank" rel="noopener">${settings.lineFriendUrl.replace(/^https?:/, "")}</a>
            </div>
        </div>

        <button type="button" class="line-widget-toggle" id="line-widget-toggle" aria-label="加 LINE 好友" aria-expanded="false">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 3C6.48 3 2 6.58 2 11c0 3.94 3.52 7.24 8.28 7.88.32.07.76.21.87.49.1.25.06.65.03.9l-.14.85c-.04.25-.2.99.86.54s5.7-3.36 7.78-5.75C21.06 14.02 22 12.6 22 11c0-4.42-4.48-8-10-8zm-4.9 10.4H5.4a.4.4 0 0 1-.4-.4V8.6a.5.5 0 0 1 1 0v3.9h1.1a.45.45 0 0 1 0 .9zm2.2 0a.5.5 0 0 1-.5-.5V8.6a.5.5 0 0 1 1 0v4.3a.5.5 0 0 1-.5.5zm5.3 0a.4.4 0 0 1-.32-.16l-2.18-2.96v2.62a.5.5 0 0 1-1 0V8.6a.4.4 0 0 1 .72-.24l2.18 2.96V8.6a.5.5 0 0 1 1 0v4.3a.4.4 0 0 1-.4.5zm3.6 0h-2.1a.4.4 0 0 1-.4-.4V8.6a.4.4 0 0 1 .4-.4h2.1a.45.45 0 0 1 0 .9h-1.6v1h1.5a.45.45 0 0 1 0 .9h-1.5v1h1.6a.45.45 0 0 1 0 .9z"/></svg>
            <span>LINE</span>
        </button>

    </div>
    ` : ""}

</div>
` : ""}

<script src="/js/main.js?v=${ASSET_VERSION}"></script>

</body>

</html>
`;

};
