const { getEmbedUrl } = require("./videoEmbed");

// 給輪播用的標題文字：影片用說明文字，照片用 alt 文字（都沒有就留空，不強求一定要有標題）
function captionFor(image, altText) {
    return (image.type === "video" ? image.caption : image.alt) || "";
}

// 相簿裡的單一項目 markup（照片或影片），所有排版模式共用
// 前台頁面（projectDetail.js）跟 CMS 即時預覽都呼叫這裡，確保兩邊渲染出的結構一致
function renderGalleryItem(image, altText, extraClass = "") {

    const caption = captionFor(image, altText);

    if (image.type === "video") {

        const embedUrl = getEmbedUrl(image.videoUrl);

        return `
        <div class="gallery-item gallery-item-video video-block-cover ${extraClass}" data-embed-url="${embedUrl || ""}" data-video-url="${!embedUrl ? image.videoUrl : ""}" data-caption="${caption}">
            ${image.url ? `<img src="${image.url}" alt="${image.caption || altText}">` : `<div class="video-block-placeholder"></div>`}
            <span class="video-block-play">▶</span>
            ${image.caption ? `<div class="gallery-item-title">${image.caption}</div>` : ""}
        </div>
        `;

    }

    return `
        <div class="gallery-item ${extraClass}" data-caption="${caption}">
            <img src="${image.url}" alt="${image.alt || altText}">
            <div class="gallery-caption">
                <span>檢視大圖</span>
            </div>
        </div>
        `;

}

function renderCarousel(images, altText) {

    return `
    <div class="gallery-carousel">

        <div class="gallery-carousel-track">
            ${images.map((image, index) => renderGalleryItem(image, altText, "carousel-slide" + (index === 0 ? " active" : ""))).join("")}
        </div>

        ${images.length > 1 ? `
        <button type="button" class="carousel-arrow carousel-prev" aria-label="上一張">‹</button>
        <button type="button" class="carousel-arrow carousel-next" aria-label="下一張">›</button>

        <div class="carousel-dots">
            ${images.map((_, index) => `<button type="button" class="carousel-dot${index === 0 ? " active" : ""}" data-index="${index}" aria-label="第 ${index + 1} 張"></button>`).join("")}
        </div>
        ` : ""}

    </div>

    ${images.some(image => captionFor(image, altText)) ? `<p class="carousel-caption">${captionFor(images[0], altText)}</p>` : ""}
    `;

}

function renderAccordion(images, altText) {

    return `
    <div class="gallery-accordion">
        ${images.map(image => renderGalleryItem(image, altText, "accordion-item")).join("")}
    </div>
    `;

}

function renderBento(images, altText) {

    const sizeClasses = ["bento-large", "bento-normal", "bento-normal", "bento-tall", "bento-normal", "bento-wide"];

    return `
    <div class="gallery-bento">
        ${images.map((image, index) => renderGalleryItem(image, altText, sizeClasses[index % sizeClasses.length])).join("")}
    </div>
    `;

}

function renderScroll(images, altText) {

    return `
    <div class="gallery-scroll">
        ${images.map(image => renderGalleryItem(image, altText, "scroll-item")).join("")}
    </div>
    `;

}

// 依排版模式產生整個相簿區塊的 HTML；images 為空時回傳提示文字
function renderGallery(images, layoutMode, altText) {

    if (!images || images.length === 0) {
        return "<p>尚無照片</p>";
    }

    if (layoutMode === "carousel") {
        return renderCarousel(images, altText);
    }

    if (layoutMode === "accordion") {
        return renderAccordion(images, altText);
    }

    if (layoutMode === "bento") {
        return renderBento(images, altText);
    }

    if (layoutMode === "scroll") {
        return renderScroll(images, altText);
    }

    return `<div class="gallery-grid" data-layout="${layoutMode}">${images.map(image => renderGalleryItem(image, altText)).join("")}</div>`;

}

module.exports = { renderGallery, renderGalleryItem };
