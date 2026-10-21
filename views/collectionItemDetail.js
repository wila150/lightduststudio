const layout = require("./layout");
const { renderGallery } = require("../services/galleryRenderer");
const { renderModules } = require("./moduleRenderer");
const { formatDisplayDate } = require("../services/publishHelper");
const { SITE_URL } = require("../config/site");
const { getPlayerUrl, getThumbnailUrl } = require("../services/videoEmbed");
const escapeHtml = require("./escapeHtml");

// 分類清單型自訂頁面的項目詳細頁，比照 views/projectDetail.js，
// 多渲染 item.modules（自由排版用），讓每個項目的詳細頁不只是相簿，也能像文章一樣排版
module.exports = (page, item, navPages = [], settings = {}, navItems = [], category = null) => {

    const isArticle = page.contentKind === "article";
    const images = item.images || [];
    const layoutMode = item.galleryLayout || "grid";
    // 「連結」是 YouTube／Vimeo 影片時，內頁直接嵌入播放器；這種作品通常沒有相簿照片，就不顯示「尚無照片」
    const playerUrl = getPlayerUrl(item.link);
    // 直式短影音（後台「影片比例」選 9:16）播放器改成直式，不然左右會有一大片黑邊
    const isPortraitVideo = item.videoRatio === "9:16";
    // 標題可以在後台換行（分行顯示用），<title>、alt、結構化資料這類純文字的地方把換行併成空白
    const plainTitle = (item.title || "").replace(/\s*\n\s*/g, " ").trim();
    const galleryHtml = playerUrl && images.length === 0 ? "" : renderGallery(images, layoutMode, plainTitle);

    // 影片先顯示封面、點了才載入播放器（參考 blackbirdimagine.com）：封面優先用後台上傳的封面照，
    // 沒有就用 YouTube 官方縮圖（maxresdefault 最清楚，但不是每支都有，載入失敗退回 hqdefault）
    const youtubeThumb = getThumbnailUrl(item.link);
    const playerCover = (item.coverImage && item.coverImage.type !== "video" && item.coverImage.url)
        || (youtubeThumb ? youtubeThumb.replace("hqdefault", "maxresdefault") : "");

    // 拍攝類型：作品相簿裡只要有一張標記 type:"video" 就算有影片，同時有照片跟影片就兩個標籤都顯示
    const hasPhoto = images.some(image => image.type !== "video") || !!(item.coverImage && item.coverImage.type !== "video" && item.coverImage.url);
    const hasVideo = images.some(image => image.type === "video") || !!playerUrl;
    const mediaTypeTags = [hasPhoto || (images.length === 0 && !playerUrl) ? "照片" : null, hasVideo ? "影片" : null].filter(Boolean);

    // 回上一頁直接回到這個作品所在的分類，不用再從第一個分類切過去
    const backHref = category ? `/p/${page.slug}?category=${category.id}` : `/p/${page.slug}`;
    const backLabel = `← 回到${category ? category.label : page.title}`;

    const pageSettings = item.metaDescription ? { ...settings, metaDescription: item.metaDescription } : settings;

    const cover = (item.coverImage && item.coverImage.url)
        || (images.length > 0 ? images[0].url : "")
        || getThumbnailUrl(item.link) || "";

    // description 現在是編輯器輸出的 HTML，沒填 SEO 描述時拿它當備援要先去標籤，不然 <meta> 內容會直接看到一堆 <p>、<strong> 標籤
    const plainDescription = (item.description || "").replace(/<[^>]+>/g, "").trim();

    // 影片作品加上 VideoObject 結構化資料，Google 搜尋結果才有機會顯示影片縮圖、被收進影片搜尋
    const toDate = value => (value && value.toDate ? value.toDate() : value instanceof Date ? value : null);
    const uploadDate = toDate(item.publishAt) || toDate(item.createdAt);
    const videoSchema = playerUrl ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: plainTitle,
        description: item.metaDescription || plainDescription || plainTitle,
        thumbnailUrl: cover ? [cover] : undefined,
        uploadDate: uploadDate ? uploadDate.toISOString() : undefined,
        embedUrl: playerUrl.split("?")[0],
        creator: { "@id": `${SITE_URL}/#organization` },
        url: `${SITE_URL}/p/${page.slug}/${item.slug}`
    } : null;

    // 照片作品：ImageGallery 結構化資料（GEO：讓 AI／Google 知道這是藍點拍的哪一類作品、有哪些照片）
    const photoUrls = images.filter(image => image.type !== "video" && image.url).map(image => image.url);
    const gallerySchema = !playerUrl && photoUrls.length ? {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        name: plainTitle,
        description: item.metaDescription || plainDescription || plainTitle,
        url: `${SITE_URL}/p/${page.slug}/${item.slug}`,
        ...(category ? { genre: category.label } : {}),
        image: photoUrls.slice(0, 10),
        ...(uploadDate ? { dateCreated: uploadDate.toISOString() } : {}),
        creator: { "@id": `${SITE_URL}/#organization` },
        copyrightHolder: { "@id": `${SITE_URL}/#organization` }
    } : null;

    const pageMeta = {
        description: item.metaDescription || plainDescription,
        image: cover,
        url: `${SITE_URL}/p/${page.slug}/${item.slug}`,
        type: isArticle ? "article" : "website",
        // 麵包屑：首頁 | FILM | 分類 | 作品名稱，每一層都可以點
        breadcrumbs: [
            { label: page.title, href: `/p/${page.slug}` },
            category ? { label: category.label, href: backHref } : null,
            { label: plainTitle, href: `/p/${page.slug}/${item.slug}` }
        ].filter(Boolean)
    };

    return layout(
        plainTitle,
        `
<section class="section">

    <div class="section-head">

        <p class="item-back item-back--top"><a href="${backHref}" class="btn-ghost">${backLabel}</a></p>

        <h2 class="item-title">${(item.title || "").trim()}</h2>

        ${isArticle ? `<p class="eyebrow">${[formatDisplayDate(item.publishAt || item.createdAt), item.author].filter(Boolean).join(" · ")}</p>` : ""}

        ${(category || mediaTypeTags.length > 0) ? `
        <div class="item-tags">
            ${category ? `<span class="item-tag item-tag-category">${category.label}</span>` : ""}
            ${mediaTypeTags.map(tag => `<span class="item-tag">${tag}</span>`).join("")}
        </div>
        ` : ""}

    </div>

    <div class="story-intro">
        ${item.description || ""}
    </div>

    ${videoSchema ? `<script type="application/ld+json">${JSON.stringify(videoSchema).replace(/</g, "\\u003c")}</script>` : ""}
    ${gallerySchema ? `<script type="application/ld+json">${JSON.stringify(gallerySchema).replace(/</g, "\\u003c")}</script>` : ""}

    ${playerUrl && playerCover ? `
    <button type="button" class="item-video-player item-video-facade${isPortraitVideo ? " item-video-player--portrait" : ""}" data-player-url="${escapeHtml(playerUrl)}" data-title="${escapeHtml(plainTitle)}" aria-label="播放影片：${escapeHtml(plainTitle)}">
        <img src="${playerCover}" alt="${escapeHtml(plainTitle)}"${youtubeThumb && playerCover !== youtubeThumb ? ` onerror="this.onerror=null;this.src='${youtubeThumb}'"` : ""}>
        <span class="video-block-play" aria-hidden="true">▶</span>
    </button>
    ` : playerUrl ? `
    <div class="item-video-player${isPortraitVideo ? " item-video-player--portrait" : ""}">
        <iframe src="${playerUrl}" title="${escapeHtml(plainTitle)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>
    </div>
    ` : item.link ? `<p class="story-intro"><a href="${item.link}" target="_blank" rel="noopener" class="btn-ghost">前往連結</a></p>` : ""}

    ${galleryHtml}

    ${renderModules(item.modules)}

    <p class="item-back"><a href="${backHref}" class="btn-ghost">${backLabel}</a></p>

</section>
`,
        navPages,
        pageSettings,
        navItems,
        pageMeta
    );

};
