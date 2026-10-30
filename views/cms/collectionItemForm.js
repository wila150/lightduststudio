const layout = require("./layout");
const { cropWidgetAssets, cropWidgetHtml, cropWidgetScript } = require("./cropWidget");
const { renderModulesSection, moduleEditorScript } = require("./moduleEditor");
const { dragReorderScript } = require("./dragReorder");
const { GALLERY_LAYOUTS } = require("../../services/galleryLayouts");
const { COVER_POSITIONS, DEFAULT_COVER_POSITION } = require("../../services/coverPosition");
const { renderGallery } = require("../../services/galleryRenderer");
const { formatDatetimeLocal, isEffectivelyPublished } = require("../../services/publishHelper");
const { ASSET_VERSION } = require("../../config/version");
const escapeHtml = require("../escapeHtml");
const { fixUploadName } = require("../../config/uploadLimits");

// 「依檔名排序」用的檔名：新照片有存 sourceName；舊照片沒有，就從檔案網址取出檔名
// （去掉上傳時加的時間戳記前綴、修正中文亂碼）
function photoSortName(image) {
    if (image.sourceName) return image.sourceName;
    try {
        const path = decodeURIComponent(String(image.url || "").split("/o/")[1].split("?")[0]);
        return fixUploadName(path.split("/").pop().replace(/^\d{10,}-/, ""));
    } catch (error) {
        return "";
    }
}

// 分類清單型自訂頁面底下單一項目的編輯表單，比照 views/cms/projectForm.js
// （封面裁切、相簿排版選擇+預覽、照片上傳/從媒體庫選/alt文字、影片網址新增都沿用同一套元件），
// 差別：多了「網址代稱」欄位（項目有自己的 slug，用於 /p/頁面代稱/項目代稱）、
// 分類選單來源改成這個頁面自己的分類，並且底下多一段「詳細頁內容模組」讓項目也能像文章一樣自由排版
module.exports = (pageId, item, categories = [], preselectedCategory = "", page = null) => {

const isArticle = page && page.contentKind === "article";

return layout(

item ? "編輯項目" : "新增項目",

`

<link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
<link href="https://cdn.quilljs.com/1.3.7/quill.bubble.css" rel="stylesheet">

${cropWidgetAssets()}

<h1>${item ? "編輯項目" : "新增項目"}</h1>

<br>

<a href="/cms/custom-pages/${pageId}/edit">← 回到分類與項目列表</a>

<br><br>

${item ? `

<a href="/cms/custom-pages/${pageId}/items/${item.id}/preview" target="_blank"><button type="button">👁 預覽這個項目${isEffectivelyPublished(item) ? "" : "（尚未發布，僅自己看得到）"}</button></a>

<br><br>

<label>封面圖片（會用在作品清單的縮圖${item.link ? `；上傳時裁成${item.videoRatio === "9:16" ? " 3:4 直式" : " 16:9 橫式"}` : "，上傳時裁成正方形"}）</label>

<br>

${item.coverImage
    ? `<img src="${item.coverImage.url}" alt="封面" style="width:${item.link && item.videoRatio !== "9:16" ? "240px;height:135px" : item.link ? "150px;height:200px" : "160px;height:160px"};object-fit:cover;display:block;margin-bottom:10px;border-radius:8px;">
       <button type="button" id="cover-remove-btn" style="margin-bottom:10px;">移除封面${item.link ? "（改回 YouTube 縮圖）" : "（改用相簿第一張）"}</button><br>`
    : `<p style="color:#888;">尚未設定封面，${item.link ? "目前使用 YouTube 影片縮圖；想換成自己的圖再上傳" : "會先用相簿第一張照片代替"}</p>`}

<input type="file" id="cover-input" accept="image/*" data-crop-ratio="${item.link ? (item.videoRatio === "9:16" ? 3 / 4 : 16 / 9) : 1}">

<button type="button" id="cover-media-btn">從媒體庫選擇</button>

<p id="cover-status" style="font-size:12px;color:#888;"></p>

<br>

` : ""}

<form method="POST" action="${item ? `/cms/custom-pages/${pageId}/items/${item.id}` : `/cms/custom-pages/${pageId}/items`}" enctype="multipart/form-data">

    ${!item ? `
    <label>封面圖片（正方形，會用在清單縮圖；不設定的話會先用相簿第一張照片代替）</label>

    <br>

    <img id="new-item-cover-preview" src="" alt="封面預覽" style="width:160px;height:160px;object-fit:cover;display:none;margin-bottom:10px;border-radius:8px;">

    <button type="button" id="new-item-cover-media-btn">從媒體庫選擇</button>

    <input type="hidden" name="coverImageMediaUrl" id="new-item-cover-media-url-field">

    <p id="new-item-cover-status" style="font-size:12px;color:#888;"></p>

    <br><br>
    ` : ""}

    <label>標題</label>

    <br>

    <!-- 用 textarea 讓標題可以按 Enter 換行，前台作品卡片／作品內頁／首頁輪播會照換行分行顯示
         （網頁分頁標題、搜尋結果這類只能一行的地方會自動把換行併成空白） -->
    <textarea
        name="title"
        id="seo-title-input"
        rows="2"
        style="width:100%;padding:10px;font:inherit;resize:vertical;"
        required
    >${item ? escapeHtml(item.title || "") : ""}</textarea>

    <p style="font-size:12px;color:#888;margin-top:4px;">想分行顯示就在要斷開的地方按 Enter，例如「台北藝穗節 微光劇團」換行「《微笑患者》演出劇照」</p>

    <p id="seo-title-hint" style="font-size:12px;color:#888;margin-top:4px;"></p>

    <br>

    <label>封面焦點位置（清單縮圖被裁切時保留哪個部分；人像建議選「偏上」保住臉）</label>

    <br>

    <select name="coverPosition" style="padding:10px;margin-top:4px;">
        ${COVER_POSITIONS.map(option => `<option value="${option.value}" ${((item && item.coverPosition) || DEFAULT_COVER_POSITION) === option.value ? "selected" : ""}>${option.label}</option>`).join("")}
    </select>

    <br><br>

    ${isArticle ? `
    <label>作者（選填，會顯示在文章列表與內頁）</label>

    <br>

    <input
        type="text"
        name="author"
        value="${item ? (item.author || "") : ""}"
        style="width:100%;padding:10px;"
    >

    <br><br>
    ` : ""}

    <label>網址代稱（英數、-，會顯示在 /p/頁面代稱/項目代稱；留空會依標題自動翻成英文產生）</label>

    <br>

    <input
        type="text"
        name="slug"
        id="item-slug-input"
        value="${item ? item.slug : ""}"
        style="width:100%;padding:10px;"
        pattern="[a-z0-9\\-]+"
        placeholder="留空會自動產生，例如 2026-ciming-high-school-summer-camp"
    >

    <br><br>

    <label>描述</label>

    <br>

    <div class="quill-editor" data-module-id="item-description" style="background:white;margin-bottom:10px;"></div>
    <textarea class="content-source" data-module-id="item-description" style="display:none;">${item ? item.description : ""}</textarea>
    <input type="hidden" name="description" id="seo-description-input" class="content-field" data-module-id="item-description">

    <p id="seo-description-hint" style="font-size:12px;color:#888;margin-top:4px;"></p>

    <br><br>

    <label>SEO 描述（選填，顯示在搜尋引擎結果；不填則使用網站的全站預設描述）</label>

    <br>

    <textarea
        name="metaDescription"
        id="seo-meta-description-input"
        rows="3"
        style="width:100%;padding:10px;"
    >${item ? (item.metaDescription || "") : ""}</textarea>

    <p id="seo-meta-description-hint" style="font-size:12px;color:#888;margin-top:4px;"></p>

    <br><br>

    <label>連結（選填）</label>

    <br>

    <input
        type="text"
        name="link"
        id="item-link-input"
        value="${item ? item.link : ""}"
        style="width:100%;padding:10px;"
        placeholder="貼上 YouTube／Vimeo 連結，會自動帶入標題、網址代稱、SEO 描述、影片比例"
        data-video-info="/cms/custom-pages/${pageId}/video-info${item ? `?itemId=${item.id}` : ""}"
    >

    <div id="item-video-autofill" style="display:none;margin-top:8px;padding:10px;border:1px solid #e3e0da;border-radius:8px;background:#faf8f5;font-size:13px;gap:12px;align-items:center;">
        <img alt="" style="width:120px;border-radius:6px;display:block;">
        <span></span>
    </div>
    <script src="/js/videoAutofill.js?v=${ASSET_VERSION}" defer></script>

    <br><br>

    <label>影片比例（連結是 YouTube／Vimeo 影片時才有作用）</label>

    <br>

    <select name="videoRatio" id="item-video-ratio" style="padding:10px;margin-top:4px;">
        <option value="16:9" ${item && item.videoRatio === "9:16" ? "" : "selected"}>16:9 橫式（一般影片）</option>
        <option value="9:16" ${item && item.videoRatio === "9:16" ? "selected" : ""}>9:16 直式（短影音／Shorts／Reels）</option>
    </select>

    <p style="font-size:12px;color:#888;margin:4px 0 0;">影響作品清單的縮圖形狀跟作品內頁播放器的比例</p>

    <br><br>

    <label>分類（選填，用於前台清單頁的篩選標籤）</label>

    <br>

    <select name="category" style="padding:10px;">
        <option value="">未分類</option>
        ${categories.filter(cat => !cat.parentCategoryId).flatMap(top => [
            top,
            ...categories.filter(cat => cat.parentCategoryId === top.id)
        ]).map(cat => `<option value="${cat.id}" ${(item ? item.category : preselectedCategory) === cat.id ? "selected" : ""}>${cat.parentCategoryId ? "— " : ""}${cat.label}</option>`).join("")}
    </select>

    <br><br>

    <label>相簿排版</label>

    <br><br>

    <div style="display:flex;gap:16px;flex-wrap:wrap;">

        ${GALLERY_LAYOUTS.map(layoutOption => `
            <label class="gallery-layout-option" style="flex:1;min-width:180px;border:2px solid ${(item ? (item.galleryLayout || "grid") : "grid") === layoutOption.value ? "#00d2ff" : "#ddd"};border-radius:10px;padding:12px;cursor:pointer;display:block;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <input type="radio" name="galleryLayout" id="layout-radio-${layoutOption.value}" value="${layoutOption.value}" ${(item ? (item.galleryLayout || "grid") : "grid") === layoutOption.value ? "checked" : ""}>
                    <strong>${layoutOption.label}</strong>
                </div>
                <p style="margin:0;font-size:12px;color:#888;">${layoutOption.description}</p>
            </label>
        `).join("")}

    </div>

    ${item && item.images && item.images.length > 0 ? `

    <p style="font-size:12px;color:#888;margin-top:12px;">即時預覽（實際頁面還會有標題、說明文字等其餘版面）</p>

    <link rel="stylesheet" href="/css/style.css?v=${ASSET_VERSION}">
    <!-- style.css 開頭 :root 直接定義 --bg/--text/--border/--accent/--danger 這些跟 cms.css 撞名的變數，
         套進 CMS 頁面時會整頁被 style.css 的深色主題蓋掉（不是只有下面這個預覽框），這裡加回 cms.css
         原本的淺色數值，把作用範圍限制在真的有 data-theme 屬性的預覽框內 -->
    <style>
        :root {
            --bg: #f5f4f1; --bg-alt: #efece6; --panel: #fff; --border: #e3e0da;
            --text: #1a1a1a; --muted: #6b6b6b; --accent: #b08a5a; --accent-2: #a97b4f;
            --danger: #c0483f; --header-bg: #fff;
        }
    </style>
    <div data-theme="dark-artistic" style="background:var(--bg);padding:20px;border-radius:8px;">

        ${GALLERY_LAYOUTS.map(layoutOption => `
        <div class="layout-preview-panel" data-preview-for="${layoutOption.value}" style="display:${(item.galleryLayout || "grid") === layoutOption.value ? "block" : "none"};">
            ${renderGallery(item.images, layoutOption.value, item.title)}
        </div>
        `).join("")}

    </div>

    ` : ""}

    <br><br>

    <label>照片${item && item.images && item.images.length > 0 ? "（可再新增更多張）" : "（選填，可一次選多張）"}</label>

    <br>

    ${item && item.images && item.images.length > 0 ? `

    <div class="photo-sort-bar">
        <span>直接拖拉照片調整順序，放開後自動儲存，前台相簿照這個順序顯示</span>
        <button type="button" id="photo-sort-by-name" title="依照原始檔名（通常就是拍攝順序）重新排列">依檔名排序</button>
        <button type="button" id="photo-sort-reverse">順序反轉</button>
    </div>

    <div class="photo-sort-grid" data-drag-reorder="/cms/custom-pages/${pageId}/items/${item.id}/photos/reorder" data-drag-axis="grid">

        ${item.images.map((image, index) => `

            <div class="photo-sort-card" data-drag-id="${image.id}" data-source-name="${escapeHtml(photoSortName(image))}">

                <div class="photo-sort-thumb drag-handle" title="按住拖拉排序">
                    <span class="photo-sort-number" data-order-number>${index + 1}</span>
                    <img src="${image.url || ""}" alt="${image.alt || item.title}" draggable="false">
                    ${image.type === "video" ? `<span class="photo-sort-video">▶ 影片</span>` : ""}
                </div>

                ${image.type !== "video" ? `
                <input type="text" class="photo-alt-input" data-photo-id="${image.id}" placeholder="Alt 文字（選填）" value="${image.alt || ""}">
                <p class="photo-alt-status" data-photo-id="${image.id}"></p>
                ` : ""}

                <div class="photo-sort-actions">
                    <button type="button" data-move="up" title="往前移一格">◀</button>
                    <button type="button" data-move="down" title="往後移一格">▶</button>
                    <button type="button" data-move="first" title="移到第一張">置頂</button>
                    <button type="button" class="delete-photo-btn photo-sort-delete" title="刪除這張照片" data-delete-url="/cms/custom-pages/${pageId}/items/${item.id}/photos/${image.id}/delete">刪除</button>
                </div>

            </div>

        `).join("")}

    </div>

    ` : ""}

    <input type="file" id="images-input" name="images" accept="image/*" multiple>

    <p style="font-size:12px;color:#888;">可以分次選擇，每次選的照片會累加，不會取代前面選的</p>

    <div id="images-preview" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;"></div>

    ${item ? `<br><button type="button" id="open-media-picker-btn">從媒體庫選擇</button>` : `
    <br>
    <button type="button" id="new-item-media-picker-btn">從媒體庫選擇（可多選）</button>
    <input type="hidden" name="mediaImagesJson" id="new-item-media-images-field" value="[]">
    <div id="new-item-media-preview" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;"></div>
    `}

    <br><br>

    <label>
        <input type="checkbox" name="published" ${!item || item.published ? "checked" : ""}>
        發布（顯示於清單頁）
    </label>

    <br><br>

    <label>排程發布時間（選填，設定未來時間的話，即使勾選「發布」也要等到那個時間才會真的對外顯示）</label>

    <br>

    <input
        type="datetime-local"
        name="publishAt"
        value="${item ? formatDatetimeLocal(item.publishAt) : ""}"
        style="padding:10px;"
    >

    <br><br>

    <button type="submit">儲存</button>

</form>

${item ? `

<div id="media-picker-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;">

    <div style="background:#fff;border-radius:8px;padding:24px;width:90%;max-width:800px;max-height:80vh;display:flex;flex-direction:column;">

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;">從媒體庫選擇</h3>
            <button type="button" id="close-media-picker-btn">✕</button>
        </div>

        <div id="media-picker-grid" style="overflow-y:auto;display:flex;flex-wrap:wrap;gap:10px;flex:1;">
            <p>載入中...</p>
        </div>

        <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;">
            <span id="media-picker-count" style="font-size:12px;color:#888;align-self:center;"></span>
            <button type="button" id="media-picker-confirm-btn" disabled>加入相簿</button>
        </div>

    </div>

</div>

<br>

<label>新增影片項目（貼上連結，封面照選填）</label>

<br><br>

<div>
    <input type="text" id="video-url-input" placeholder="YouTube / Vimeo / 影片檔案網址" style="width:100%;max-width:420px;padding:10px;">
</div>

<br>

<div>
    <input type="file" id="video-cover-input" accept="image/*">
    <span style="font-size:12px;color:#888;">封面照（選填，不設定的話相簿會顯示空白縮圖＋播放圖示）</span>
</div>

<br>

<div>
    <input type="text" id="video-caption-input" placeholder="說明文字（選填）" style="width:100%;max-width:420px;padding:10px;">
</div>

<br>

<button type="button" id="add-video-btn">新增影片</button>

<p id="video-status" style="font-size:12px;color:#888;"></p>

<hr><br>

${renderModulesSection(`/cms/custom-pages/${pageId}/items/${item.id}`, item.modules)}

` : "<p>儲存項目基本資料後，才能開始新增詳細頁內容模組。</p>"}

${cropWidgetHtml()}

<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>

<script>
${cropWidgetScript()}
${moduleEditorScript()}

// 相簿照片拖拉排序（這裡已經在 script 區塊裡，直接放程式碼，不能再包一層 script 標籤）
${dragReorderScript()}

(function () {

    var titleInput = document.getElementById("seo-title-input");
    var titleHint = document.getElementById("seo-title-hint");
    var descInput = document.getElementById("seo-description-input");
    var descHint = document.getElementById("seo-description-hint");
    var metaDescInput = document.getElementById("seo-meta-description-input");
    var metaDescHint = document.getElementById("seo-meta-description-hint");

    function checkLength(value, hintEl, min, max, label, optional) {

        var length = value.length;

        if (length === 0) {
            hintEl.textContent = optional ? (label + "：未填寫，將使用全站預設描述") : (label + "：尚未填寫");
            hintEl.style.color = optional ? "#888" : "#c0392b";
        } else if (length < min) {
            hintEl.textContent = label + "：" + length + " 字（建議至少 " + min + " 字，太短不利搜尋引擎顯示）";
            hintEl.style.color = "#c0392b";
        } else if (length > max) {
            hintEl.textContent = label + "：" + length + " 字（超過建議上限 " + max + " 字，搜尋結果可能會被截斷）";
            hintEl.style.color = "#c0392b";
        } else {
            hintEl.textContent = label + "：" + length + " 字（長度適中）";
            hintEl.style.color = "#2a7a3b";
        }

    }

    function updateTitleHint() {
        checkLength(titleInput.value, titleHint, 10, 60, "標題長度");
    }

    function updateDescHint() {
        // descInput 現在存的是編輯器輸出的 HTML，字數要先去掉標籤再算，不然粗體/顏色這些標籤會灌爆字數
        checkLength(descInput.value.replace(/<[^>]+>/g, ""), descHint, 50, 160, "描述長度");
    }

    function updateMetaDescHint() {
        checkLength(metaDescInput.value, metaDescHint, 50, 160, "SEO 描述長度", true);
    }

    titleInput.addEventListener("input", updateTitleHint);
    descInput.addEventListener("input", updateDescHint);
    metaDescInput.addEventListener("input", updateMetaDescHint);

    updateTitleHint();
    updateDescHint();
    updateMetaDescHint();

})();

(function () {

    var radios = document.querySelectorAll('input[name="galleryLayout"]');
    var panels = document.querySelectorAll(".layout-preview-panel");

    if (panels.length === 0) {
        return;
    }

    radios.forEach(function (radio) {

        radio.addEventListener("change", function () {

            panels.forEach(function (panel) {
                panel.style.display = panel.getAttribute("data-preview-for") === radio.value ? "block" : "none";
            });

        });

    });

})();

(function () {

    var imagesInput = document.getElementById("images-input");
    var preview = document.getElementById("images-preview");
    var selectedFiles = [];

    function updateInputFiles() {

        var dt = new DataTransfer();

        selectedFiles.forEach(function (file) {
            dt.items.add(file);
        });

        imagesInput.files = dt.files;

    }

    function renderPreview() {

        preview.innerHTML = "";

        selectedFiles.forEach(function (file, index) {

            var item = document.createElement("div");
            item.style.width = "100px";

            var img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.style.width = "100px";
            img.style.height = "75px";
            img.style.objectFit = "cover";
            img.style.display = "block";

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.textContent = "移除";
            removeBtn.addEventListener("click", function () {
                selectedFiles.splice(index, 1);
                updateInputFiles();
                renderPreview();
            });

            item.appendChild(img);
            item.appendChild(removeBtn);
            preview.appendChild(item);

        });

    }

    imagesInput.addEventListener("change", function () {

        Array.from(imagesInput.files).forEach(function (file) {
            selectedFiles.push(file);
        });

        updateInputFiles();
        renderPreview();

    });

})();

${!item ? `
(function () {

    var mediaBtn = document.getElementById("new-item-cover-media-btn");
    var mediaUrlField = document.getElementById("new-item-cover-media-url-field");
    var preview = document.getElementById("new-item-cover-preview");
    var status = document.getElementById("new-item-cover-status");

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: false,
            onSelect: function (files) {

                mediaUrlField.value = files[0].url;
                preview.src = files[0].url;
                preview.style.display = "block";
                status.textContent = "已選擇媒體庫圖片：" + files[0].name;

            }
        });

    });

})();

(function () {

    var mediaBtn = document.getElementById("new-item-media-picker-btn");
    var mediaField = document.getElementById("new-item-media-images-field");
    var preview = document.getElementById("new-item-media-preview");
    var selectedMedia = [];

    function renderPreview() {

        preview.innerHTML = "";

        selectedMedia.forEach(function (file, index) {

            var item = document.createElement("div");
            item.style.width = "100px";

            var img = document.createElement("img");
            img.src = file.url;
            img.style.width = "100px";
            img.style.height = "75px";
            img.style.objectFit = "cover";
            img.style.display = "block";

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.textContent = "移除";
            removeBtn.addEventListener("click", function () {
                selectedMedia.splice(index, 1);
                mediaField.value = JSON.stringify(selectedMedia);
                renderPreview();
            });

            item.appendChild(img);
            item.appendChild(removeBtn);
            preview.appendChild(item);

        });

    }

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: true,
            onSelect: function (files) {

                files.forEach(function (file) {
                    selectedMedia.push({ url: file.url, path: "", alt: file.alt || "" });
                });

                mediaField.value = JSON.stringify(selectedMedia);
                renderPreview();

            }
        });

    });

})();
` : ""}

// 相簿照片一鍵排序：依原始檔名（相機檔名通常就是拍攝順序）或整個反轉，排好直接存到同一個拖拉排序端點
(function () {

    var grid = document.querySelector(".photo-sort-grid");

    if (!grid) {
        return;
    }

    function saveOrder(cards) {

        cards.forEach(function (card) { grid.appendChild(card); });
        grid.querySelectorAll("[data-order-number]").forEach(function (el, i) { el.textContent = i + 1; });

        fetch(grid.getAttribute("data-drag-reorder"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: cards.map(function (card) { return card.getAttribute("data-drag-id"); }) })
        }).then(function (res) {
            if (!res.ok) throw new Error();
        }).catch(function () {
            alert("排序儲存失敗，請重新整理頁面後再試一次");
        });

    }

    var cards = function () { return Array.from(grid.querySelectorAll("[data-drag-id]")); };

    document.getElementById("photo-sort-by-name").addEventListener("click", function () {
        // 檔名有「封面」的排最前面，其餘依檔名自然排序（IMG_2 排在 IMG_10 前面）
        saveOrder(cards().sort(function (a, b) {
            var na = a.getAttribute("data-source-name"), nb = b.getAttribute("data-source-name");
            var ca = /^封面/.test(na) ? 0 : 1, cb = /^封面/.test(nb) ? 0 : 1;
            return ca - cb || na.localeCompare(nb, "zh-Hant", { numeric: true });
        }));
    });

    document.getElementById("photo-sort-reverse").addEventListener("click", function () {
        saveOrder(cards().reverse());
    });

})();

document.querySelectorAll(".delete-photo-btn").forEach(function (btn) {

    btn.addEventListener("click", function () {

        if (!window.confirm("確定要刪除這張照片嗎？此動作無法復原。")) {
            return;
        }

        fetch(btn.getAttribute("data-delete-url"), { method: "POST" })
            .then(function () {
                window.location.reload();
            });

    });

});

${item ? `
document.querySelectorAll(".photo-alt-input").forEach(function (input) {

    var photoId = input.getAttribute("data-photo-id");
    var status = document.querySelector('.photo-alt-status[data-photo-id="' + photoId + '"]');
    var originalValue = input.value;

    input.addEventListener("blur", function () {

        if (input.value === originalValue) {
            return;
        }

        status.textContent = "儲存中...";

        fetch("/cms/custom-pages/${pageId}/items/${item.id}/photos/" + photoId + "/alt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alt: input.value })
        })
            .then(function (res) { return res.json(); })
            .then(function () {
                originalValue = input.value;
                status.textContent = "已儲存";
                setTimeout(function () { status.textContent = ""; }, 2000);
            })
            .catch(function () {
                status.textContent = "儲存失敗";
            });

    });

});
` : ""}

${item ? `
(function () {

    var coverInput = document.getElementById("cover-input");
    var status = document.getElementById("cover-status");
    var removeBtn = document.getElementById("cover-remove-btn");

    if (removeBtn) {
        removeBtn.addEventListener("click", function () {
            if (!confirm("移除封面？${item && item.link ? "會改回使用 YouTube 影片縮圖。" : "會改用相簿第一張照片。"}")) {
                return;
            }
            status.textContent = "移除中...";
            fetch("/cms/custom-pages/${pageId}/items/${item ? item.id : ""}/cover/delete", { method: "POST" })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (!data.success) throw new Error();
                    window.location.reload();
                })
                .catch(function () { status.textContent = "移除失敗，請重新整理後再試一次"; });
        });
    }

    coverInput.addEventListener("change", function () {

        var file = coverInput.files[0];

        if (!file) {
            return;
        }

        // 影片作品依影片比例裁（橫式 16:9、直式 3:4），照片作品維持正方形
        window.openImageCropper(file, Number(coverInput.getAttribute("data-crop-ratio")) || 1, function (blob) {

            var formData = new FormData();
            formData.append("cover", blob, "cover.jpg");

            status.textContent = "上傳中...";

            fetch("/cms/custom-pages/${pageId}/items/${item.id}/cover", {
                method: "POST",
                body: formData
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data.url) {
                        status.textContent = "上傳失敗";
                        return;
                    }

                    window.location.reload();

                })
                .catch(function () {
                    status.textContent = "上傳失敗";
                });

        });

    });

})();

(function () {

    var mediaBtn = document.getElementById("cover-media-btn");
    var status = document.getElementById("cover-status");

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: false,
            onSelect: function (files) {

                var file = files[0];

                status.textContent = "載入圖片中...";

                fetch(file.url)
                    .then(function (res) { return res.blob(); })
                    .then(function (blob) {

                        window.openImageCropper(blob, 1, function (croppedBlob) {

                            var formData = new FormData();
                            formData.append("cover", croppedBlob, "cover.jpg");

                            status.textContent = "上傳中...";

                            fetch("/cms/custom-pages/${pageId}/items/${item.id}/cover", {
                                method: "POST",
                                body: formData
                            })
                                .then(function (res) { return res.json(); })
                                .then(function (data) {

                                    if (!data.url) {
                                        status.textContent = "上傳失敗";
                                        return;
                                    }

                                    window.location.reload();

                                })
                                .catch(function () {
                                    status.textContent = "上傳失敗";
                                });

                        });

                    })
                    .catch(function () {
                        status.textContent = "載入圖片失敗";
                    });

            }
        });

    });

})();

(function () {

    var addBtn = document.getElementById("add-video-btn");
    var urlInput = document.getElementById("video-url-input");
    var coverInput = document.getElementById("video-cover-input");
    var captionInput = document.getElementById("video-caption-input");
    var status = document.getElementById("video-status");

    addBtn.addEventListener("click", function () {

        if (!urlInput.value.trim()) {
            status.textContent = "請先輸入影片連結";
            return;
        }

        var formData = new FormData();
        formData.append("videoUrl", urlInput.value.trim());
        formData.append("caption", captionInput.value.trim());

        if (coverInput.files[0]) {
            formData.append("coverImage", coverInput.files[0]);
        }

        status.textContent = "新增中...";
        addBtn.disabled = true;

        fetch("/cms/custom-pages/${pageId}/items/${item.id}/videos", {
            method: "POST",
            body: formData
        })
            .then(function () {
                window.location.reload();
            })
            .catch(function () {
                status.textContent = "新增失敗";
                addBtn.disabled = false;
            });

    });

})();

(function () {

    var openBtn = document.getElementById("open-media-picker-btn");
    var overlay = document.getElementById("media-picker-overlay");
    var closeBtn = document.getElementById("close-media-picker-btn");
    var grid = document.getElementById("media-picker-grid");
    var confirmBtn = document.getElementById("media-picker-confirm-btn");
    var countLabel = document.getElementById("media-picker-count");
    var loaded = false;

    function updateCount() {

        var checked = grid.querySelectorAll("input[type=checkbox]:checked");
        confirmBtn.disabled = checked.length === 0;
        countLabel.textContent = checked.length > 0 ? ("已選取 " + checked.length + " 張") : "";

    }

    function renderGrid(files) {

        if (files.length === 0) {
            grid.innerHTML = "<p>媒體庫尚無圖片</p>";
            return;
        }

        grid.innerHTML = "";

        files.forEach(function (file) {

            var label = document.createElement("label");
            label.style.cssText = "position:relative;width:120px;cursor:pointer;";

            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = file.id;
            checkbox.style.cssText = "position:absolute;top:6px;left:6px;";
            checkbox.addEventListener("change", updateCount);

            var img = document.createElement("img");
            img.src = file.url;
            img.alt = file.name;
            img.style.cssText = "width:120px;height:90px;object-fit:cover;display:block;border-radius:4px;";

            label.appendChild(checkbox);
            label.appendChild(img);
            grid.appendChild(label);

        });

    }

    openBtn.addEventListener("click", function () {

        overlay.style.display = "flex";

        if (loaded) {
            return;
        }

        fetch("/cms/media/list.json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                loaded = true;
                renderGrid(data.files || []);
            })
            .catch(function () {
                grid.innerHTML = "<p>載入失敗</p>";
            });

    });

    closeBtn.addEventListener("click", function () {
        overlay.style.display = "none";
    });

    overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
            overlay.style.display = "none";
        }
    });

    confirmBtn.addEventListener("click", function () {

        var ids = Array.from(grid.querySelectorAll("input[type=checkbox]:checked")).map(function (checkbox) {
            return checkbox.value;
        });

        if (ids.length === 0) {
            return;
        }

        var form = document.createElement("form");
        form.method = "POST";
        form.action = "/cms/custom-pages/${pageId}/items/${item.id}/photos/from-media";

        ids.forEach(function (id) {
            var field = document.createElement("input");
            field.type = "hidden";
            field.name = "mediaIds";
            field.value = id;
            form.appendChild(field);
        });

        document.body.appendChild(form);
        form.submit();

    });

})();
` : ""}
</script>

`

);

};
