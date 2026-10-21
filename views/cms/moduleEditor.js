const featureService = require("../../services/featureService");
const { MODULE_TYPES } = require("../../services/moduleTypes");
const { GALLERY_LAYOUTS } = require("../../services/galleryLayouts");
const escapeHtml = require("../escapeHtml");
const { PROCESS_ICONS } = require("../../services/processIcons");
const { dragReorderScript } = require("./dragReorder");

// 單張圖片模組、圖文分欄模組的圖片共用同一組「圖片風格」選項（見 public/css/style.css 的 .img-style-* 類別）；
// 圖文分欄原本就有 rounded/sharp 兩種轉角選項，用 includeLegacy 保留舊資料相容，單張圖片模組沒有這個包袱，用「無」當預設
function renderImageStyleOptions(current, includeLegacy) {

    const options = [
        ...(includeLegacy
            ? [{ value: "rounded", label: "簡約圓角（預設）" }, { value: "sharp", label: "直角" }]
            : [{ value: "none", label: "無（預設）" }]),
        { value: "modern", label: "現代極簡風（圓角＋柔和陰影）" },
        { value: "organic", label: "有機自然風（不規則流線形狀）" },
        { value: "polaroid", label: "文藝拍立得風（白邊框＋滑鼠移入放大）" },
        { value: "mono", label: "黑白（滑鼠移入變回彩色）" }
    ];

    return options.map(opt => `<option value="${opt.value}" ${current === opt.value ? "selected" : ""}>${opt.label}</option>`).join("");

}

// 所有 Quill 編輯器共用的工具列設定（文字模組、首頁副標題都用同一份），
// 比照 Word 常見的排版功能：字體、字級、粗體/斜體/底線/刪除線、文字色/網底、項目符號、對齊、清除格式
const QUILL_TOOLBAR_JS = `[
    [{ font: [] }, { size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["clean"]
]`;

// Quill 內建色盤只能點固定的 35 色，這段幫 color/background 各加一個「自訂顏色」選項，
// 點下去開瀏覽器原生選色器（可以自己選任意色、通常也能直接貼色碼），選取範圍在原生視窗開啟期間先暫存起來，選完顏色再套用回去，避免選取範圍不見
const QUILL_CUSTOM_COLOR_JS = `
function enhanceQuillCustomColor(quill) {

    ["color", "background"].forEach(function (format) {

        var picker = quill.getModule("toolbar").container.querySelector(".ql-" + format + " .ql-picker-options");

        if (!picker) {
            return;
        }

        var trigger = document.createElement("span");
        trigger.className = "ql-picker-item ql-custom-color-trigger";
        trigger.textContent = "自訂顏色…";
        picker.appendChild(trigger);

        var nativeInput = document.createElement("input");
        nativeInput.type = "color";
        nativeInput.className = "ql-custom-color-input";
        document.body.appendChild(nativeInput);

        var cachedRange = null;

        trigger.addEventListener("mousedown", function (event) {
            event.preventDefault();
            cachedRange = quill.getSelection();
            nativeInput.click();
        });

        nativeInput.addEventListener("input", function () {

            if (cachedRange) {
                quill.setSelection(cachedRange.index, cachedRange.length);
            }

            quill.format(format, nativeInput.value);

        });

    });

}
`;

const MODULE_ICONS = {
    heading: "🔠",
    text: "📝",
    image: "🖼️",
    button: "🔘",
    timelineItem: "📅",
    faqItem: "❓",
    contactForm: "💬",
    featureCard: "🎴",
    processStep: "🔢",
    videoBlock: "🎬",
    imageGallery: "🖼️",
    splitFeature: "🪧",
    bookingWidget: "🗓️",
    videoCarousel: "🎞️",
    sponsorMarquee: "🏷️",
    serviceGrid: "🗂️"
};

const MODULE_LABELS = MODULE_TYPES.reduce((map, item) => {
    map[item.type] = item.label;
    return map;
}, {});

function renderModuleFields(module) {

    const data = module.data || {};

    switch (module.type) {

        case "heading":
            return `
                <label style="font-size:13px;color:#666;">標題文字</label>
                <div class="quill-editor" data-module-id="${module.id}" style="background:white;margin-bottom:10px;"></div>
                <textarea class="content-source" data-module-id="${module.id}" style="display:none;">${data.text || ""}</textarea>
                <input type="hidden" name="text" class="content-field" data-module-id="${module.id}">

                <label style="font-size:13px;color:#666;">標籤層級（影響 SEO 結構，不影響外觀大小）</label>
                <select name="level">
                    <option value="2" ${(data.level || "2") === "2" ? "selected" : ""}>大標題</option>
                    <option value="3" ${data.level === "3" ? "selected" : ""}>小標題</option>
                </select>

                <label style="font-size:13px;color:#666;">大小</label>
                <select name="size">
                    <option value="small" ${data.size === "small" ? "selected" : ""}>小</option>
                    <option value="medium" ${(data.size || "medium") === "medium" ? "selected" : ""}>中（預設）</option>
                    <option value="large" ${data.size === "large" ? "selected" : ""}>大</option>
                    <option value="xlarge" ${data.size === "xlarge" ? "selected" : ""}>特大</option>
                </select>

                <label style="font-size:13px;color:#666;">粗細</label>
                <select name="weight">
                    <option value="normal" ${data.weight === "normal" ? "selected" : ""}>一般</option>
                    <option value="medium" ${data.weight === "medium" ? "selected" : ""}>中等</option>
                    <option value="bold" ${(data.weight || "bold") === "bold" ? "selected" : ""}>粗體（預設）</option>
                    <option value="black" ${data.weight === "black" ? "selected" : ""}>特粗</option>
                </select>

                <label style="font-size:13px;color:#666;">對齊</label>
                <select name="align">
                    <option value="left" ${(data.align || "left") === "left" ? "selected" : ""}>靠左（預設）</option>
                    <option value="center" ${data.align === "center" ? "selected" : ""}>置中</option>
                    <option value="right" ${data.align === "right" ? "selected" : ""}>靠右</option>
                </select>

                <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input type="checkbox" class="border-color-toggle" data-module-id="${module.id}" ${data.color ? "checked" : ""}>
                    自訂文字顏色（不勾選則使用網站主題預設色）
                </label>
                <input
                    type="color"
                    name="color"
                    class="border-color-input"
                    data-module-id="${module.id}"
                    value="${data.color || "#333333"}"
                    style="display:${data.color ? "block" : "none"};margin-top:4px;"
                >
            `;

        case "text":
            return `
                <div class="quill-editor" data-module-id="${module.id}" style="background:white;margin-bottom:10px;"></div>
                <textarea class="content-source" data-module-id="${module.id}" style="display:none;">${data.html || ""}</textarea>
                <input type="hidden" name="html" class="content-field" data-module-id="${module.id}">
            `;

        case "image":
            return `
                <img class="image-preview-img" data-module-id="${module.id}" src="${data.url || ""}" alt="" style="width:200px;height:130px;object-fit:cover;display:${data.url ? "block" : "none"};border-radius:7px;margin-bottom:10px;">
                <input type="file" class="image-upload-input" data-module-id="${module.id}" accept="image/*">
                <button type="button" class="pick-media-btn" data-module-id="${module.id}">從媒體庫選擇</button>
                <p class="upload-status" data-module-id="${module.id}" style="font-size:12px;color:#888;margin-bottom:10px;"></p>
                <input type="hidden" name="url" class="image-url-field" data-module-id="${module.id}" value="${data.url || ""}">
                <input type="hidden" name="path" class="image-path-field" data-module-id="${module.id}" value="${data.path || ""}">
                <input type="text" name="caption" placeholder="圖片說明（選填）" value="${data.caption || ""}">

                <label style="font-size:13px;color:#666;">圖片風格</label>
                <select name="imageStyle">${renderImageStyleOptions(data.imageStyle || "none", false)}</select>

                <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input type="checkbox" class="border-color-toggle" data-module-id="${module.id}-imgborder" ${data.imageBorderColor ? "checked" : ""}>
                    自訂圖片邊框顏色
                </label>
                <input
                    type="color"
                    name="imageBorderColor"
                    class="border-color-input"
                    data-module-id="${module.id}-imgborder"
                    value="${data.imageBorderColor || "#ffffff"}"
                    style="display:${data.imageBorderColor ? "block" : "none"};margin-top:4px;"
                >
            `;

        case "button":
            return `
                <input type="text" name="text" placeholder="按鈕文字" value="${data.text || ""}">
                <input type="text" name="link" placeholder="連結網址" value="${data.link || ""}">
            `;

        case "timelineItem":
            return `
                <input type="text" name="year" placeholder="年份／階段（例如：現在）" value="${data.year || ""}">
                <label style="font-size:13px;color:#666;">內容</label>
                <div class="quill-editor" data-module-id="${module.id}" style="background:white;margin-bottom:10px;"></div>
                <textarea class="content-source" data-module-id="${module.id}" style="display:none;">${data.text || ""}</textarea>
                <input type="hidden" name="text" class="content-field" data-module-id="${module.id}">
            `;

        case "faqItem":
            return `
                <input type="text" name="question" placeholder="問題，例如：形象照拍攝需要多久？" value="${escapeHtml(data.question || "")}">
                <label style="font-size:13px;color:#666;">答案（直接回答問題，第一句就講重點，AI 搜尋最常引用這種寫法）</label>
                <div class="quill-editor" data-module-id="${module.id}" style="background:white;margin-bottom:10px;"></div>
                <textarea class="content-source" data-module-id="${module.id}" style="display:none;">${data.answer || ""}</textarea>
                <input type="hidden" name="answer" class="content-field" data-module-id="${module.id}">
            `;

        case "contactForm":
            return `<p style="color:#888;margin-bottom:10px;">前台會顯示姓名／Email／訊息三個欄位，訪客送出後會出現在後台「留言」列表，不需要額外設定。</p>`;

        case "bookingWidget":
            return `<p style="color:#888;margin-bottom:10px;">前台會顯示完整的服務／人員／時段選擇＋聯絡資訊預約流程，訪客送出後會出現在後台「預約管理」，不需要額外設定。一個頁面只能放一個這個區塊。</p>`;

        case "videoBlock":
            return `
                <img class="image-preview-img" data-module-id="${module.id}" src="${data.coverUrl || ""}" alt="" style="width:200px;height:130px;object-fit:cover;display:${data.coverUrl ? "block" : "none"};border-radius:7px;margin-bottom:10px;">
                <input type="file" class="image-upload-input" data-module-id="${module.id}" accept="image/*">
                <button type="button" class="pick-media-btn" data-module-id="${module.id}">從媒體庫選擇</button>
                <p class="upload-status" data-module-id="${module.id}" style="font-size:12px;color:#888;margin-bottom:10px;"></p>
                <input type="hidden" name="coverUrl" class="image-url-field" data-module-id="${module.id}" value="${data.coverUrl || ""}">
                <input type="hidden" name="coverPath" class="image-path-field" data-module-id="${module.id}" value="${data.coverPath || ""}">
                <input type="text" name="videoUrl" placeholder="影片連結（YouTube / Vimeo / 影片檔案網址）" value="${data.videoUrl || ""}">
                <input type="text" name="caption" placeholder="說明文字（選填）" value="${data.caption || ""}">
                <p style="color:#888;font-size:12px;">封面照會顯示在頁面上，訪客點下去才會播放影片</p>
            `;

        case "featureCard":
            return `
                <input type="text" name="title" placeholder="卡片標題" value="${data.title || ""}">
                <label style="font-size:13px;color:#666;">卡片描述</label>
                <div class="quill-editor" data-module-id="${module.id}" style="background:white;margin-bottom:10px;"></div>
                <textarea class="content-source" data-module-id="${module.id}" style="display:none;">${data.description || ""}</textarea>
                <input type="hidden" name="description" class="content-field" data-module-id="${module.id}">
                <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input type="checkbox" class="border-color-toggle" data-module-id="${module.id}" ${data.borderColor ? "checked" : ""}>
                    自訂邊框顏色（不勾選則使用網站主題預設色）
                </label>
                <input
                    type="color"
                    name="borderColor"
                    class="border-color-input"
                    data-module-id="${module.id}"
                    value="${data.borderColor || "#cccccc"}"
                    style="display:${data.borderColor ? "block" : "none"};margin-top:4px;"
                >
            `;

        case "imageGallery":
            return `
                <label style="font-size:13px;color:#666;">排版方式</label>
                <select name="galleryLayout">
                    ${GALLERY_LAYOUTS.map(layoutOption => `<option value="${layoutOption.value}" ${(data.galleryLayout || "grid") === layoutOption.value ? "selected" : ""}>${layoutOption.label}</option>`).join("")}
                </select>

                <div class="gallery-images-preview" data-module-id="${module.id}" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;">
                    ${(data.images || []).map(image => `
                        <div class="gallery-image-item" data-image-id="${image.id}" style="position:relative;width:100px;">
                            <img src="${image.url}" alt="" style="width:100px;height:75px;object-fit:cover;display:block;border-radius:4px;">
                            <button type="button" class="remove-gallery-image-btn" data-module-id="${module.id}" data-image-id="${image.id}" style="position:absolute;top:2px;right:2px;">✕</button>
                        </div>
                    `).join("")}
                </div>

                <input type="file" class="gallery-upload-input" data-module-id="${module.id}" accept="image/*" multiple>
                <button type="button" class="pick-gallery-media-btn" data-module-id="${module.id}">從媒體庫選擇（可多選）</button>
                <p class="gallery-upload-status" data-module-id="${module.id}" style="font-size:12px;color:#888;margin:6px 0;"></p>

                <input type="hidden" name="imagesJson" class="gallery-images-json" data-module-id="${module.id}" value="${escapeHtml(JSON.stringify(data.images || []))}">
            `;

        case "splitFeature":
            return `
                <input type="text" name="heading" placeholder="大標題" value="${data.heading || ""}">

                <label style="font-size:13px;color:#666;">標題大小</label>
                <select name="headingSize">
                    <option value="small" ${data.headingSize === "small" ? "selected" : ""}>小</option>
                    <option value="medium" ${(data.headingSize || "medium") === "medium" ? "selected" : ""}>中（預設）</option>
                    <option value="large" ${data.headingSize === "large" ? "selected" : ""}>大</option>
                    <option value="xlarge" ${data.headingSize === "xlarge" ? "selected" : ""}>特大</option>
                </select>

                <label style="font-size:13px;color:#666;">說明文字（選取文字才會浮出工具列，跟其他模組工具列選項一致）</label>
                <div class="quill-editor" data-module-id="${module.id}" data-quill-theme="bubble" style="background:white;margin-bottom:10px;"></div>
                <textarea class="content-source" data-module-id="${module.id}" style="display:none;">${data.text || ""}</textarea>
                <input type="hidden" name="text" class="content-field" data-module-id="${module.id}">

                <label style="font-size:13px;color:#666;">內文大小</label>
                <select name="textSize">
                    <option value="small" ${data.textSize === "small" ? "selected" : ""}>小</option>
                    <option value="medium" ${(data.textSize || "medium") === "medium" ? "selected" : ""}>中（預設）</option>
                    <option value="large" ${data.textSize === "large" ? "selected" : ""}>大</option>
                    <option value="xlarge" ${data.textSize === "xlarge" ? "selected" : ""}>特大</option>
                </select>

                <label style="font-size:13px;color:#666;">圖片（可多選，會依序並排顯示）</label>
                <div class="gallery-images-preview" data-module-id="${module.id}" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;">
                    ${(data.images || []).map(image => `
                        <div class="gallery-image-item" data-image-id="${image.id}" style="position:relative;width:100px;">
                            <img src="${image.url}" alt="" style="width:100px;height:75px;object-fit:cover;display:block;border-radius:4px;">
                            <button type="button" class="remove-gallery-image-btn" data-module-id="${module.id}" data-image-id="${image.id}" style="position:absolute;top:2px;right:2px;">✕</button>
                        </div>
                    `).join("")}
                </div>

                <input type="file" class="gallery-upload-input" data-module-id="${module.id}" accept="image/*" multiple>
                <button type="button" class="pick-gallery-media-btn" data-module-id="${module.id}">從媒體庫選擇（可多選）</button>
                <p class="gallery-upload-status" data-module-id="${module.id}" style="font-size:12px;color:#888;margin:6px 0;"></p>

                <input type="hidden" name="imagesJson" class="gallery-images-json" data-module-id="${module.id}" value="${escapeHtml(JSON.stringify(data.images || []))}">

                <label style="font-size:13px;color:#666;">圖片大小（跟文字欄的比例）</label>
                <select name="imageSize">
                    <option value="small" ${data.imageSize === "small" ? "selected" : ""}>小</option>
                    <option value="medium" ${(data.imageSize || "medium") === "medium" ? "selected" : ""}>中（預設，跟文字各半）</option>
                    <option value="large" ${data.imageSize === "large" ? "selected" : ""}>大</option>
                    <option value="xlarge" ${data.imageSize === "xlarge" ? "selected" : ""}>特大</option>
                </select>

                <label style="font-size:13px;color:#666;">圖片顯示比例（多張圖片並排時，選一個比例讓大小整齊一致；不會裁切照片內容）</label>
                <select name="imageRatio">
                    <option value="original" ${(data.imageRatio || "original") === "original" ? "selected" : ""}>原始比例（預設，每張各自的比例）</option>
                    <option value="square" ${data.imageRatio === "square" ? "selected" : ""}>正方形 1:1</option>
                    <option value="portrait" ${data.imageRatio === "portrait" ? "selected" : ""}>直式 3:4</option>
                    <option value="landscape" ${data.imageRatio === "landscape" ? "selected" : ""}>橫式 4:3</option>
                    <option value="wide" ${data.imageRatio === "wide" ? "selected" : ""}>寬螢幕 16:9</option>
                </select>

                <label style="font-size:13px;color:#666;">圖片風格</label>
                <select name="imageCorner">${renderImageStyleOptions(data.imageCorner || "rounded", true)}</select>

                <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input type="checkbox" class="border-color-toggle" data-module-id="${module.id}-imgborder" ${data.imageBorderColor ? "checked" : ""}>
                    自訂圖片邊框顏色
                </label>
                <input
                    type="color"
                    name="imageBorderColor"
                    class="border-color-input"
                    data-module-id="${module.id}-imgborder"
                    value="${data.imageBorderColor || "#ffffff"}"
                    style="display:${data.imageBorderColor ? "block" : "none"};margin-top:4px;"
                >

                <label style="font-size:13px;color:#666;">圖片位置</label>
                <select name="imagePosition">
                    <option value="right" ${(data.imagePosition || "right") === "right" ? "selected" : ""}>圖片在右</option>
                    <option value="left" ${data.imagePosition === "left" ? "selected" : ""}>圖片在左</option>
                </select>

                <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input type="checkbox" name="darkBg" ${data.darkBg ? "checked" : ""}>
                    使用深色背景（強調區塊）
                </label>

                <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input type="checkbox" name="imageFrame" ${data.imageFrame ? "checked" : ""}>
                    顯示圖片底框（有選圖片比例時，照片比例跟框不同會露出的底色）
                </label>
            `;

        case "videoCarousel":
            return `
                <p style="color:#888;font-size:13px;margin-bottom:10px;">勾選要放進首頁輪播的作品（列出作品集裡的所有項目，有附影片的項目點下去會播放影片，純照片的項目點下去會連到該作品詳情頁；順序依下方勾選順序決定）</p>

                <div class="video-carousel-picker" data-module-id="${module.id}" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;border:1px solid #ddd;border-radius:8px;padding:10px;">
                    <p style="color:#888;">載入中...</p>
                </div>

                <input type="hidden" name="itemIdsJson" class="video-carousel-ids-field" data-module-id="${module.id}" value="${escapeHtml(JSON.stringify((data.items || []).map(item => item.id)))}">

                <label style="font-size:13px;color:#666;">圖片邊角</label>
                <select name="cornerStyle">
                    <option value="rounded" ${(data.cornerStyle || "rounded") === "rounded" ? "selected" : ""}>圓角（預設）</option>
                    <option value="sharp" ${data.cornerStyle === "sharp" ? "selected" : ""}>銳角</option>
                </select>
            `;

        case "sponsorMarquee":
            return `
                <p style="color:#888;font-size:13px;margin-bottom:10px;">上傳贊助商/合作夥伴的 LOGO，會排成一直橫向捲動的跑馬燈，預設黑白顯示，滑鼠移到某個 LOGO 上才會變回原本顏色</p>

                <div class="gallery-images-preview" data-module-id="${module.id}" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;">
                    ${(data.logos || []).map(logo => `
                        <div class="gallery-image-item" data-image-id="${logo.id}" style="position:relative;width:100px;">
                            <img src="${logo.url}" alt="" style="width:100px;height:75px;object-fit:contain;background:#f0f0f0;display:block;border-radius:4px;">
                            <button type="button" class="remove-gallery-image-btn" data-module-id="${module.id}" data-image-id="${logo.id}" style="position:absolute;top:2px;right:2px;">✕</button>
                        </div>
                    `).join("")}
                </div>

                <input type="file" class="gallery-upload-input" data-module-id="${module.id}" accept="image/*" multiple>
                <button type="button" class="pick-gallery-media-btn" data-module-id="${module.id}">從媒體庫選擇（可多選）</button>
                <p class="gallery-upload-status" data-module-id="${module.id}" style="font-size:12px;color:#888;margin:6px 0;"></p>

                <input type="hidden" name="logosJson" class="gallery-images-json" data-module-id="${module.id}" value="${escapeHtml(JSON.stringify(data.logos || []))}">

                <label style="font-size:13px;color:#666;">LOGO 大小</label>
                <select name="logoSize">
                    <option value="small" ${data.logoSize === "small" ? "selected" : ""}>小</option>
                    <option value="medium" ${(data.logoSize || "medium") === "medium" ? "selected" : ""}>中（預設）</option>
                    <option value="large" ${data.logoSize === "large" ? "selected" : ""}>大</option>
                    <option value="xlarge" ${data.logoSize === "xlarge" ? "selected" : ""}>特大</option>
                </select>
            `;

        case "serviceGrid":
            return `
                <p style="color:#888;font-size:13px;margin-bottom:10px;">每張卡片一張照片＋一個標題，點下去會連到你填的網址（可以是站內某個頁面，例如 /p/photography-services，也可以是分類篩選連結）</p>

                <div class="service-grid-preview" data-module-id="${module.id}" style="display:flex;flex-wrap:wrap;gap:12px;margin:10px 0;">
                    ${(data.items || []).map(item => `
                        <div class="service-grid-item-editor" data-item-id="${item.id}" style="position:relative;width:160px;border:1px solid #ddd;border-radius:6px;padding:8px;">
                            <img class="service-grid-item-thumb" src="${item.url || ""}" alt="" style="width:100%;height:100px;object-fit:cover;border-radius:4px;display:${item.url ? "block" : "none"};background:#f0f0f0;margin-bottom:6px;">
                            <input type="text" class="service-grid-title-input" data-item-id="${item.id}" placeholder="卡片標題" value="${escapeHtml(item.title || "")}" style="margin-bottom:6px;">
                            <input type="text" class="service-grid-link-input" data-item-id="${item.id}" placeholder="連結網址（例如 /p/photography-services）" value="${escapeHtml(item.link || "")}">
                            <button type="button" class="remove-service-grid-item-btn" data-module-id="${module.id}" data-item-id="${item.id}" style="position:absolute;top:4px;right:4px;">✕</button>
                        </div>
                    `).join("")}
                </div>

                <input type="file" class="service-grid-upload-input" data-module-id="${module.id}" accept="image/*" multiple>
                <button type="button" class="pick-service-grid-media-btn" data-module-id="${module.id}">從媒體庫選擇（可多選）</button>
                <p class="service-grid-upload-status" data-module-id="${module.id}" style="font-size:12px;color:#888;margin:6px 0;"></p>

                <input type="hidden" name="itemsJson" class="service-grid-items-json" data-module-id="${module.id}" value="${escapeHtml(JSON.stringify(data.items || []))}">

                <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input type="checkbox" class="border-color-toggle" data-module-id="${module.id}-accent" ${data.accentColor ? "checked" : ""}>
                    自訂強調色（滑鼠移過卡片時標題的顏色，不勾選則用網站主題預設色）
                </label>
                <input
                    type="color"
                    name="accentColor"
                    class="border-color-input"
                    data-module-id="${module.id}-accent"
                    value="${data.accentColor || "#a89785"}"
                    style="display:${data.accentColor ? "block" : "none"};margin-top:4px;"
                >
            `;

        case "processStep":
            return `
                <label style="font-size:13px;color:#666;">圖示</label>
                <select name="icon">
                    <option value="" ${!data.icon ? "selected" : ""}>自動（依步驟順序套用）</option>
                    ${Object.entries(PROCESS_ICONS).map(([key, item]) => `<option value="${key}" ${data.icon === key ? "selected" : ""}>${item.label}</option>`).join("")}
                    <option value="none" ${data.icon === "none" ? "selected" : ""}>不顯示圖示</option>
                    ${data.icon && data.icon !== "none" && !PROCESS_ICONS[data.icon] ? `<option value="${escapeHtml(data.icon)}" selected>目前：${escapeHtml(data.icon)}</option>` : ""}
                </select>
                <input type="text" name="title" placeholder="步驟標題（例如：需求諮詢）" value="${data.title || ""}">
                <label style="font-size:13px;color:#666;">步驟說明</label>
                <div class="quill-editor" data-module-id="${module.id}" style="background:white;margin-bottom:10px;"></div>
                <textarea class="content-source" data-module-id="${module.id}" style="display:none;">${data.description || ""}</textarea>
                <input type="hidden" name="description" class="content-field" data-module-id="${module.id}">
                <p style="color:#888;font-size:12px;">編號會依照這個模組在清單裡的順序自動產生，不用自己輸入</p>
            `;

        default:
            return "";

    }

}

function renderModuleCard(basePath, module) {

    const icon = MODULE_ICONS[module.type] || "🧩";
    const label = MODULE_LABELS[module.type] || module.type;

    return `
    <div class="module-card" data-drag-id="${module.id}">

        <div class="module-card-header">

            <span class="module-card-header-left">
                <span class="drag-handle" title="拖拉排序">⠿</span>
                <button type="button" class="module-move-btn" data-move="up" title="上移一個位置">▲</button>
                <button type="button" class="module-move-btn" data-move="down" title="下移一個位置">▼</button>
            </span>

            <span class="module-type-badge">${icon} ${label}</span>

            <div class="module-actions">

                <form method="POST" action="${basePath}/modules/${module.id}/delete" onsubmit="return confirm('確定要刪除這個模組嗎？此動作無法復原。');">
                    <button type="submit" class="module-delete-btn" title="刪除">🗑</button>
                </form>

            </div>

        </div>

        <form method="POST" action="${basePath}/modules/${module.id}" class="module-card-body">

            <input type="hidden" name="type" value="${module.type}">

            <label style="font-size:13px;color:#666;">區塊底色（滿版，跟前後模組做出分段效果；相鄰模組如果選同一種底色會自動連成一整塊，不會分開）</label>
            <select name="moduleBackground" class="module-background-select" data-module-id="${module.id}">
                <option value="none" ${(module.background || "none") === "none" ? "selected" : ""}>無（預設，跟頁面底色一樣）</option>
                <option value="alt" ${module.background === "alt" ? "selected" : ""}>淺色底</option>
                <option value="custom" ${module.background === "custom" ? "selected" : ""}>自訂顏色</option>
            </select>
            <input
                type="color"
                name="moduleBackgroundColor"
                class="module-background-color-input"
                data-module-id="${module.id}"
                value="${module.backgroundColor || "#f4f1ec"}"
                style="display:${module.background === "custom" ? "inline-block" : "none"};vertical-align:middle;margin-left:8px;"
            >

            ${renderModuleFields(module)}

            <button type="submit" class="save-module-btn">儲存這個模組</button>

        </form>

    </div>
    `;

}

function renderModulesSection(basePath, modules) {

    return `
        <h2>內容模組</h2>

        <br>

        <div class="module-list" data-drag-reorder="${basePath}/modules/reorder">
            ${(modules || []).length === 0 ? "<p>尚未新增任何模組</p>" : modules.map(module => renderModuleCard(basePath, module)).join("")}
        </div>

        <script>${dragReorderScript()}</script>

        <form method="POST" action="${basePath}/modules" class="add-module-bar">

            <select name="type">
                ${MODULE_TYPES.filter(item => featureService.moduleAllowed(item.type)).map(item => `<option value="${item.type}">${MODULE_ICONS[item.type] || "🧩"} ${item.label}</option>`).join("")}
            </select>

            <button type="submit">＋ 新增模組</button>

        </form>
    `;

}

// 每個文字/圖片模組共用的初始化 script（Quill、上傳圖片）
function moduleEditorScript() {

    return `
    // Quill 預設的對齊/字體/字級是用 class（ql-align-center 這類）套用格式，CMS 編輯畫面因為有載入 Quill 自己的 CSS 才看得出效果，
    // 但前台網頁沒有這份 CSS，同一個 class 完全沒作用，字看起來就跟沒設定一樣。改成 style attributor，直接把 text-align 等寫成 inline style，前台不需要額外 CSS 就能正確顯示。
    var QuillAlignStyle = Quill.import("attributors/style/align");
    var QuillFontStyle = Quill.import("attributors/style/font");
    var QuillSizeStyle = Quill.import("attributors/style/size");
    Quill.register(QuillAlignStyle, true);
    Quill.register(QuillFontStyle, true);
    Quill.register(QuillSizeStyle, true);

    ${QUILL_CUSTOM_COLOR_JS}

    // 區塊底色選「自訂顏色」才顯示色票輸入框
    document.querySelectorAll(".module-background-select").forEach(function (select) {

        var moduleId = select.getAttribute("data-module-id");
        var colorInput = document.querySelector('.module-background-color-input[data-module-id="' + moduleId + '"]');

        if (!colorInput) {
            return;
        }

        select.addEventListener("change", function () {
            colorInput.style.display = select.value === "custom" ? "inline-block" : "none";
        });

    });

    document.querySelectorAll(".quill-editor").forEach(function (el) {

        var moduleId = el.getAttribute("data-module-id");
        var source = document.querySelector('.content-source[data-module-id="' + moduleId + '"]');
        var field = document.querySelector('.content-field[data-module-id="' + moduleId + '"]');

        // 圖文分欄的內文用 bubble 主題（選取文字才浮出工具列，類似 Notion），其他都用 snow（工具列固定顯示），
        // 但共用同一份完整工具列設定，功能不會因為用哪個主題而有落差
        var theme = el.getAttribute("data-quill-theme") || "snow";

        var quill = new Quill(el, {
            theme: theme,
            modules: {
                toolbar: ${QUILL_TOOLBAR_JS}
            }
        });

        enhanceQuillCustomColor(quill);

        quill.root.innerHTML = source.value;
        field.value = quill.root.innerHTML;

        // 觸發一次 input 事件：field 是 hidden input，用 JS 改 .value 不會自動觸發 input 事件，
        // 但有些頁面（例如作品集項目的 SEO 字數提示）靠監聽這個 hidden field 的 input 事件即時更新，這裡補觸發讓那些邏輯繼續正常運作
        quill.on("text-change", function () {
            field.value = quill.root.innerHTML;
            field.dispatchEvent(new Event("input"));
        });

    });

    document.querySelectorAll(".image-upload-input").forEach(function (input) {

        var moduleId = input.getAttribute("data-module-id");
        var urlField = document.querySelector('.image-url-field[data-module-id="' + moduleId + '"]');
        var pathField = document.querySelector('.image-path-field[data-module-id="' + moduleId + '"]');
        var status = document.querySelector('.upload-status[data-module-id="' + moduleId + '"]');

        input.addEventListener("change", function () {

            var file = input.files[0];

            if (!file) {
                return;
            }

            var formData = new FormData();
            formData.append("file", file);

            status.textContent = "上傳中...";

            fetch("/cms/custom-pages/upload-image", {
                method: "POST",
                body: formData
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data.url) {
                        status.textContent = "上傳失敗";
                        return;
                    }

                    urlField.value = data.url;
                    pathField.value = data.path || "";
                    status.textContent = "上傳完成，記得按「儲存這個模組」";

                })
                .catch(function () {
                    status.textContent = "上傳失敗";
                });

        });

    });

    document.querySelectorAll(".pick-media-btn").forEach(function (btn) {

        var moduleId = btn.getAttribute("data-module-id");
        var urlField = document.querySelector('.image-url-field[data-module-id="' + moduleId + '"]');
        var pathField = document.querySelector('.image-path-field[data-module-id="' + moduleId + '"]');
        var status = document.querySelector('.upload-status[data-module-id="' + moduleId + '"]');
        var previewImg = document.querySelector('.image-preview-img[data-module-id="' + moduleId + '"]');

        btn.addEventListener("click", function () {

            window.openMediaPicker({
                multiple: false,
                onSelect: function (files) {

                    var file = files[0];

                    urlField.value = file.url;
                    pathField.value = "";

                    if (previewImg) {
                        previewImg.src = file.url;
                        previewImg.style.display = "block";
                    }

                    status.textContent = "已選擇媒體庫圖片，記得按「儲存這個模組」";

                }
            });

        });

    });

    document.querySelectorAll(".gallery-upload-input").forEach(function (input) {

        var moduleId = input.getAttribute("data-module-id");
        var preview = document.querySelector('.gallery-images-preview[data-module-id="' + moduleId + '"]');
        var jsonField = document.querySelector('.gallery-images-json[data-module-id="' + moduleId + '"]');
        var status = document.querySelector('.gallery-upload-status[data-module-id="' + moduleId + '"]');

        function getImages() {
            try {
                return JSON.parse(jsonField.value || "[]");
            } catch (error) {
                return [];
            }
        }

        function setImages(images) {
            jsonField.value = JSON.stringify(images);
        }

        function renderThumb(image) {

            var item = document.createElement("div");
            item.className = "gallery-image-item";
            item.setAttribute("data-image-id", image.id);
            item.style.cssText = "position:relative;width:100px;";

            var img = document.createElement("img");
            img.src = image.url;
            img.style.cssText = "width:100px;height:75px;object-fit:cover;display:block;border-radius:4px;";

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-gallery-image-btn";
            removeBtn.textContent = "✕";
            removeBtn.style.cssText = "position:absolute;top:2px;right:2px;";
            removeBtn.addEventListener("click", function () {
                setImages(getImages().filter(function (img) { return img.id !== image.id; }));
                item.remove();
            });

            item.appendChild(img);
            item.appendChild(removeBtn);
            preview.appendChild(item);

        }

        input.addEventListener("change", function () {

            var files = Array.from(input.files);

            if (files.length === 0) {
                return;
            }

            status.textContent = "上傳中...（" + files.length + " 個檔案）";

            var uploads = files.map(function (file) {

                var formData = new FormData();
                formData.append("file", file);

                return fetch("/cms/custom-pages/upload-image", { method: "POST", body: formData })
                    .then(function (res) { return res.json(); });

            });

            Promise.all(uploads).then(function (results) {

                var images = getImages();

                results.forEach(function (data) {

                    if (!data.url) {
                        return;
                    }

                    var image = { id: (Date.now() + Math.random()).toString(36), url: data.url, path: data.path || "" };
                    images.push(image);
                    renderThumb(image);

                });

                setImages(images);
                status.textContent = "上傳完成，記得按「儲存這個模組」";
                input.value = "";

            }).catch(function () {
                status.textContent = "上傳失敗";
            });

        });

    });

    document.querySelectorAll(".pick-gallery-media-btn").forEach(function (btn) {

        var moduleId = btn.getAttribute("data-module-id");
        var preview = document.querySelector('.gallery-images-preview[data-module-id="' + moduleId + '"]');
        var jsonField = document.querySelector('.gallery-images-json[data-module-id="' + moduleId + '"]');
        var status = document.querySelector('.gallery-upload-status[data-module-id="' + moduleId + '"]');

        function getImages() {
            try {
                return JSON.parse(jsonField.value || "[]");
            } catch (error) {
                return [];
            }
        }

        function setImages(images) {
            jsonField.value = JSON.stringify(images);
        }

        function renderThumb(image) {

            var item = document.createElement("div");
            item.className = "gallery-image-item";
            item.setAttribute("data-image-id", image.id);
            item.style.cssText = "position:relative;width:100px;";

            var img = document.createElement("img");
            img.src = image.url;
            img.style.cssText = "width:100px;height:75px;object-fit:cover;display:block;border-radius:4px;";

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-gallery-image-btn";
            removeBtn.textContent = "✕";
            removeBtn.style.cssText = "position:absolute;top:2px;right:2px;";
            removeBtn.addEventListener("click", function () {
                setImages(getImages().filter(function (img) { return img.id !== image.id; }));
                item.remove();
            });

            item.appendChild(img);
            item.appendChild(removeBtn);
            preview.appendChild(item);

        }

        btn.addEventListener("click", function () {

            window.openMediaPicker({
                multiple: true,
                onSelect: function (files) {

                    var images = getImages();

                    files.forEach(function (file) {
                        var image = { id: (Date.now() + Math.random()).toString(36), url: file.url, path: "" };
                        images.push(image);
                        renderThumb(image);
                    });

                    setImages(images);
                    status.textContent = "已加入媒體庫圖片，記得按「儲存這個模組」";

                }
            });

        });

    });

    document.querySelectorAll(".remove-gallery-image-btn").forEach(function (btn) {

        btn.addEventListener("click", function () {

            var moduleId = btn.getAttribute("data-module-id");
            var imageId = btn.getAttribute("data-image-id");
            var jsonField = document.querySelector('.gallery-images-json[data-module-id="' + moduleId + '"]');

            var images = [];
            try {
                images = JSON.parse(jsonField.value || "[]");
            } catch (error) {
                images = [];
            }

            jsonField.value = JSON.stringify(images.filter(function (img) { return img.id !== imageId; }));
            btn.closest(".gallery-image-item").remove();

        });

    });

    // 服務項目宮格：每張卡片除了圖片，還要記標題／連結，跟上面共用的圖片相簿 JSON 欄位不一樣，另外處理
    document.querySelectorAll(".service-grid-preview").forEach(function (preview) {

        var moduleId = preview.getAttribute("data-module-id");
        var jsonField = document.querySelector('.service-grid-items-json[data-module-id="' + moduleId + '"]');
        var uploadInput = document.querySelector('.service-grid-upload-input[data-module-id="' + moduleId + '"]');
        var pickBtn = document.querySelector('.pick-service-grid-media-btn[data-module-id="' + moduleId + '"]');
        var status = document.querySelector('.service-grid-upload-status[data-module-id="' + moduleId + '"]');

        function getItems() {
            try {
                return JSON.parse(jsonField.value || "[]");
            } catch (error) {
                return [];
            }
        }

        function setItems(items) {
            jsonField.value = JSON.stringify(items);
        }

        function updateItem(itemId, patch) {
            setItems(getItems().map(function (item) {
                return item.id === itemId ? Object.assign({}, item, patch) : item;
            }));
        }

        function renderCard(item) {

            var card = document.createElement("div");
            card.className = "service-grid-item-editor";
            card.setAttribute("data-item-id", item.id);
            card.style.cssText = "position:relative;width:160px;border:1px solid #ddd;border-radius:6px;padding:8px;";

            var img = document.createElement("img");
            img.className = "service-grid-item-thumb";
            img.src = item.url || "";
            img.style.cssText = "width:100%;height:100px;object-fit:cover;border-radius:4px;display:" + (item.url ? "block" : "none") + ";background:#f0f0f0;margin-bottom:6px;";

            var titleInput = document.createElement("input");
            titleInput.type = "text";
            titleInput.className = "service-grid-title-input";
            titleInput.setAttribute("data-item-id", item.id);
            titleInput.placeholder = "卡片標題";
            titleInput.value = item.title || "";
            titleInput.style.marginBottom = "6px";
            titleInput.addEventListener("input", function () {
                updateItem(item.id, { title: titleInput.value });
            });

            var linkInput = document.createElement("input");
            linkInput.type = "text";
            linkInput.className = "service-grid-link-input";
            linkInput.setAttribute("data-item-id", item.id);
            linkInput.placeholder = "連結網址（例如 /p/photography-services）";
            linkInput.value = item.link || "";
            linkInput.addEventListener("input", function () {
                updateItem(item.id, { link: linkInput.value });
            });

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-service-grid-item-btn";
            removeBtn.textContent = "✕";
            removeBtn.style.cssText = "position:absolute;top:4px;right:4px;";
            removeBtn.addEventListener("click", function () {
                setItems(getItems().filter(function (i) { return i.id !== item.id; }));
                card.remove();
            });

            card.appendChild(img);
            card.appendChild(titleInput);
            card.appendChild(linkInput);
            card.appendChild(removeBtn);
            preview.appendChild(card);

        }

        // 既有卡片（頁面剛載入時，伺服器端已經算好 HTML）也要補上 input 的 change 監聽，不然改了標題/連結不會存進 JSON 欄位
        preview.querySelectorAll(".service-grid-item-editor").forEach(function (card) {

            var itemId = card.getAttribute("data-item-id");
            var titleInput = card.querySelector(".service-grid-title-input");
            var linkInput = card.querySelector(".service-grid-link-input");

            if (titleInput) {
                titleInput.addEventListener("input", function () {
                    updateItem(itemId, { title: titleInput.value });
                });
            }

            if (linkInput) {
                linkInput.addEventListener("input", function () {
                    updateItem(itemId, { link: linkInput.value });
                });
            }

            var removeBtn = card.querySelector(".remove-service-grid-item-btn");
            if (removeBtn) {
                removeBtn.addEventListener("click", function () {
                    setItems(getItems().filter(function (i) { return i.id !== itemId; }));
                    card.remove();
                });
            }

        });

        if (uploadInput) {

            uploadInput.addEventListener("change", function () {

                var files = Array.from(uploadInput.files);

                if (files.length === 0) {
                    return;
                }

                status.textContent = "上傳中...（" + files.length + " 個檔案）";

                var uploads = files.map(function (file) {
                    var formData = new FormData();
                    formData.append("file", file);
                    return fetch("/cms/custom-pages/upload-image", { method: "POST", body: formData })
                        .then(function (res) { return res.json(); });
                });

                Promise.all(uploads).then(function (results) {

                    var items = getItems();

                    results.forEach(function (data) {

                        if (!data.url) {
                            return;
                        }

                        var item = { id: (Date.now() + Math.random()).toString(36), url: data.url, path: data.path || "", title: "", link: "" };
                        items.push(item);
                        renderCard(item);

                    });

                    setItems(items);
                    status.textContent = "上傳完成，記得幫每張卡片填標題／連結，再按「儲存這個模組」";
                    uploadInput.value = "";

                }).catch(function () {
                    status.textContent = "上傳失敗";
                });

            });

        }

        if (pickBtn) {

            pickBtn.addEventListener("click", function () {

                window.openMediaPicker({
                    multiple: true,
                    onSelect: function (files) {

                        var items = getItems();

                        files.forEach(function (file) {
                            var item = { id: (Date.now() + Math.random()).toString(36), url: file.url, path: "", title: "", link: "" };
                            items.push(item);
                            renderCard(item);
                        });

                        setItems(items);
                        status.textContent = "已加入媒體庫圖片，記得幫每張卡片填標題／連結，再按「儲存這個模組」";

                    }
                });

            });

        }

    });

    document.querySelectorAll(".border-color-toggle").forEach(function (checkbox) {

        var moduleId = checkbox.getAttribute("data-module-id");
        var colorInput = document.querySelector('.border-color-input[data-module-id="' + moduleId + '"]');

        colorInput.disabled = !checkbox.checked;

        checkbox.addEventListener("change", function () {
            colorInput.style.display = checkbox.checked ? "block" : "none";
            colorInput.disabled = !checkbox.checked;
        });

    });

    document.querySelectorAll(".video-carousel-picker").forEach(function (container) {

        var moduleId = container.getAttribute("data-module-id");
        var field = document.querySelector('.video-carousel-ids-field[data-module-id="' + moduleId + '"]');

        var selectedIds = [];

        try {
            selectedIds = JSON.parse(field.value || "[]");
        } catch (error) {
            selectedIds = [];
        }

        fetch("/cms/custom-pages/video-items.json")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                var items = data.items || [];

                if (items.length === 0) {
                    container.innerHTML = "<p style=\\"color:#888;\\">作品集裡目前還沒有任何項目，請先到「作品集」新增作品</p>";
                    return;
                }

                container.innerHTML = "";

                items.forEach(function (item) {

                    var label = document.createElement("label");
                    label.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;";

                    var checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.value = item.id;
                    checkbox.checked = selectedIds.indexOf(item.id) !== -1;

                    checkbox.addEventListener("change", function () {

                        var checked = Array.from(container.querySelectorAll("input[type=checkbox]:checked")).map(function (box) {
                            return box.value;
                        });

                        field.value = JSON.stringify(checked);

                    });

                    if (item.coverUrl) {
                        var img = document.createElement("img");
                        img.src = item.coverUrl;
                        img.style.cssText = "width:60px;height:40px;object-fit:cover;border-radius:4px;";
                        label.appendChild(img);
                    }

                    var span = document.createElement("span");
                    span.textContent = item.title + (item.hasVideo ? "（影片）" : "（照片）");

                    label.appendChild(checkbox);
                    label.appendChild(span);
                    container.appendChild(label);

                });

            })
            .catch(function () {
                container.innerHTML = "<p style=\\"color:#888;\\">載入失敗</p>";
            });

    });
    `;

}

module.exports = { renderModulesSection, moduleEditorScript, QUILL_TOOLBAR_JS, QUILL_CUSTOM_COLOR_JS };
