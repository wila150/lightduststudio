const escapeSlideText = value => String(value || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

// 全螢幕輪播主視覺（首頁管理 → 主視覺樣式「全螢幕輪播」）：每張是滿版照片或背景影片（YouTube／Vimeo／MP4），
// 左下角放小標、大標題、副標與兩顆按鈕，自動輪播＋圓點切換；導覽列一開始透明疊在上面（main.js 的 header-overlay）
function renderSlideshow(page, slides) {
    const { getEmbedUrl } = require("../services/videoEmbed");
    const buttons = `
        <div class="ld-hero-actions">
            ${page.buttonText ? `<a href="${page.buttonLink || "#"}" class="ld-hero-btn is-solid">${escapeSlideText(page.buttonText)}</a>` : ""}
            ${page.button2Text ? `<a href="${page.button2Link || "#"}" class="ld-hero-btn">${escapeSlideText(page.button2Text)}</a>` : ""}
        </div>`;
    return `
<section class="ld-hero has-video" id="hero-section" data-interval="6000">
    ${slides.map((slide, i) => {
        const embed = getEmbedUrl(slide.video);
        const bg = embed
            ? `<div class="ld-hero-bg ld-hero-embed"><iframe src="${embed}" allow="autoplay; encrypted-media" frameborder="0" tabindex="-1"></iframe></div>`
            : slide.video
                ? `<video class="ld-hero-bg" src="${slide.video}" autoplay muted loop playsinline${slide.image ? ` poster="${slide.image}"` : ""}></video>`
                : `<div class="ld-hero-bg" style="background-image:url('${slide.image}')"></div>`;
        const Title = i === 0 ? "h1" : "h2";
        return `
    <div class="ld-hero-slide${i === 0 ? " is-active" : ""}">
        ${bg}
        <div class="ld-hero-content">
            ${slide.eyebrow ? `<span class="ld-hero-eyebrow">${escapeSlideText(slide.eyebrow)}</span>` : ""}
            ${slide.title ? `<${Title} class="ld-hero-title">${escapeSlideText(slide.title).replace(/\n/g, "<br>")}</${Title}>` : ""}
            ${slide.subtitle ? `<p class="ld-hero-sub">${escapeSlideText(slide.subtitle)}</p>` : ""}
            ${buttons}
        </div>
    </div>`;
    }).join("")}
    ${slides.length > 1 ? `<div class="ld-hero-dots">${slides.map((_, i) => `<button type="button" class="${i === 0 ? "is-active" : ""}" aria-label="第 ${i + 1} 張"></button>`).join("")}</div>` : ""}
    <div class="ld-hero-scroll" aria-hidden="true"><span>SCROLL</span><span class="line"></span></div>
</section>`;
}

const layout = require("./layout");
const { coverStyleAttr } = require("../services/coverPosition");
const { renderModules } = require("./moduleRenderer");
const { getEmbedUrl } = require("../services/videoEmbed");
const { SITE_URL } = require("../config/site");

module.exports = (page, navPages = [], settings = {}, featuredProjects = [], navItems = [], context = {}) => {

  const embedUrl = getEmbedUrl(page.heroVideo);

  const pageMeta = { url: `${SITE_URL}/`, image: page.heroImage || "" };

  const slides = (page.heroSlides || []).filter(slide => slide.image || slide.video);
  const useSlideshow = page.heroStyle === "slideshow" && slides.length > 0;

  return layout(
    "首頁",
    `
${useSlideshow ? renderSlideshow(page, slides) : `
<section class="hero${page.heroVideo ? " has-video" : ""}" id="hero-section">

    <div id="live-heroVideoEmbed" class="hero-video-embed" style="${embedUrl ? "" : "display:none;"}">
        <iframe src="${embedUrl || ""}" allow="autoplay; fullscreen" frameborder="0"></iframe>
    </div>

    <video id="live-heroVideo" class="hero-video" src="${!embedUrl ? (page.heroVideo || "") : ""}" style="${page.heroVideo && !embedUrl ? "" : "display:none;"}" autoplay muted loop playsinline></video>

    <img id="live-heroImage" src="${page.heroImage || ""}" alt="首頁主圖" style="max-width:600px;width:100%;margin:0 auto 30px;border-radius:12px;${page.heroImage && !page.heroVideo ? "" : "display:none;"}">

    <div class="hero-inner">

        ${page.heroShowLogo && (page.heroLogo || settings.logoUrl) ? `
        <img id="live-heroLogo" src="${page.heroLogo || settings.logoUrl}" alt="${settings.siteName || ""}" class="hero-logo" style="--hero-logo-size:${page.heroLogoSize || 220}px;--hero-logo-size-mobile:${page.heroLogoSizeMobile || page.heroLogoSize || 220}px;">
        ` : `
        <p class="hero-kicker">
            PORTFOLIO
        </p>
        `}

        ${page.heroShowTitle !== false ? `
        <h1 class="hero-title" id="live-heroTitle">
            ${page.heroTitle || "歡迎來到我的攝影世界"}
        </h1>
        ` : ""}

        ${page.heroShowSubtitle !== false ? `
        <div class="hero-sub" id="live-heroSubtitle">
            ${page.heroSubtitle || ""}
        </div>
        ` : ""}

        ${page.heroShowButton !== false ? `
        <a href="${page.buttonLink || "/p/photography-services"}" class="btn-primary">
            ${page.buttonText || "查看更多"}
        </a>
        ` : ""}

    </div>

    ${page.heroVideo ? `<a href="#feature-section" class="hero-scroll-cue" aria-label="向下捲動">↓</a>` : ""}

</section>
`}

${settings.showHomeCarousel && featuredProjects.length > 0 ? `

<div class="gallery-carousel home-carousel">

    <div class="gallery-carousel-track">
        ${featuredProjects.map((project, index) => {

            const cover = (project.coverImage && project.coverImage.url)
                || (project.images && project.images.length > 0 ? project.images[0].url : project.imageUrl);

            return `
        <a href="${project.href}" class="gallery-item carousel-slide${index === 0 ? " active" : ""}" data-caption="${project.title}">
            ${cover ? `<img src="${cover}" alt="${project.title}"${coverStyleAttr(project)}>` : ""}
        </a>
        `;

        }).join("")}
    </div>

    ${featuredProjects.length > 1 ? `
    <button type="button" class="carousel-arrow carousel-prev" aria-label="上一張">‹</button>
    <button type="button" class="carousel-arrow carousel-next" aria-label="下一張">›</button>
    <div class="carousel-dots">
        ${featuredProjects.map((_, index) => `<button type="button" class="carousel-dot${index === 0 ? " active" : ""}" data-index="${index}" aria-label="第 ${index + 1} 張"></button>`).join("")}
    </div>
    ` : ""}

</div>

${featuredProjects[0].title ? `<p class="carousel-caption">${featuredProjects[0].title}</p>` : ""}

` : ""}

${settings.showFeaturedSidebar && featuredProjects.length > 0 ? `

<section class="featured-sidebar-section" id="featured-sidebar-section">

    <div class="featured-sidebar-list">
        ${featuredProjects.map((project, index) => `
        <button type="button" class="featured-sidebar-item${index === 0 ? " active" : ""}" data-index="${index}">
            ${project.title}
        </button>
        `).join("")}
    </div>

    <div class="featured-sidebar-display">
        ${featuredProjects.map((project, index) => {

            // 影片可能放在作品詳情頁的「影片」模組（views/moduleRenderer.js 的 videoBlock），
            // 也可能是作品集項目照片清單裡本身標記 type:"video" 的項目，兩種都要認得到
            const videoBlockModule = (project.modules || []).find(m => m.type === "videoBlock" && m.data && m.data.videoUrl);
            const videoEntryInImages = (project.images || []).find(image => image.type === "video" && image.videoUrl);
            const videoUrl = (videoBlockModule && videoBlockModule.data.videoUrl) || (videoEntryInImages && videoEntryInImages.videoUrl) || "";
            const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;

            // 沒有影片的話，把這個作品自己的照片全部列出來，側邊選單顯示這個作品時可以直接左右瀏覽，不用點進作品頁才看得到其他張
            const photos = (project.images || []).filter(image => image.type !== "video" && image.url);
            const cover = (project.coverImage && project.coverImage.url) || photos[0] && photos[0].url || project.imageUrl;

            if (photos.length === 0 && cover) {
                photos.push({ url: cover });
            }

            const hasVideo = !!(embedUrl || videoUrl);

            return `
            <a href="${project.href}" class="featured-sidebar-slide${index === 0 ? " active" : ""}" data-index="${index}" data-embed-url="${embedUrl || ""}" data-video-url="${videoUrl && !embedUrl ? videoUrl : ""}">
                <div class="featured-sidebar-media">
                    ${hasVideo ? "" : photos.map((photo, photoIndex) => `<img src="${photo.url}" alt="${project.title}" class="featured-sidebar-photo${photoIndex === 0 ? " active" : ""}" data-photo-index="${photoIndex}">`).join("")}
                </div>
                ${!hasVideo && photos.length > 1 ? `
                <button type="button" class="featured-sidebar-nav featured-sidebar-nav-prev" aria-label="上一張">‹</button>
                <button type="button" class="featured-sidebar-nav featured-sidebar-nav-next" aria-label="下一張">›</button>
                ` : ""}
                <div class="featured-sidebar-slide-scrim"></div>
                <span class="featured-sidebar-slide-title">${project.title}</span>
            </a>
            `;

        }).join("")}
    </div>

</section>

` : ""}

<section class="section" id="feature-section">

    ${renderModules(page.modules, context)}

</section>

${page.showFeaturedWorks === false || featuredProjects.length === 0 ? "" : `

<section class="section">

    <div class="section-head">

        <p class="eyebrow">
            WORKS
        </p>

        <h2>
            精選作品
        </h2>

    </div>

    <div class="works-grid" data-layout="${settings.projectListLayout || "grid"}">

        ${featuredProjects.map(project => {

            const cover = (project.coverImage && project.coverImage.url)
                || (project.images && project.images.length > 0 ? project.images[0].url : project.imageUrl);

            return `
            <a href="${project.href}" class="work-card">
                <div class="work-card-media">
                    ${cover ? `<img src="${cover}" alt="${project.title}"${coverStyleAttr(project)}>` : ""}
                </div>
                <figcaption>
                    <h3>${project.title}</h3>
                </figcaption>
            </a>
            `;

        }).join("")}

    </div>

    <p style="text-align:center;margin-top:36px;">
        <a href="/p/photography-services" class="btn-ghost">查看全部作品</a>
    </p>

</section>

`}
`,
    navPages,
    settings,
    navItems,
    pageMeta
  );

};
