const layout = require("./layout");
const { renderModulesSection, moduleEditorScript, QUILL_TOOLBAR_JS, QUILL_CUSTOM_COLOR_JS } = require("./moduleEditor");
const { getEmbedUrl } = require("../../services/videoEmbed");
const { previewPanelHtml, previewPanelScript } = require("./previewPanel");

const TITLES = {
    home: "首頁管理",
    about: "關於我管理",
    contact: "聯絡我管理"
};

const PREVIEW_PATHS = {
    home: "/",
    about: "/about",
    contact: "/contact"
};

function renderHeroFields(page) {

    return `
        <label>首頁主圖</label>

        <br>

        ${page.heroImage ? `<img src="${page.heroImage}" alt="首頁主圖" style="width:240px;height:160px;object-fit:cover;display:block;margin-bottom:10px;">
        <label style="font-size:13px;"><input type="checkbox" name="removeHeroImage"> 移除目前的首頁主圖</label><br><br>` : ""}

        <input type="file" name="heroImage" id="heroImage-input" accept="image/*">
        <button type="button" id="heroImage-media-btn">從媒體庫選擇</button>
        <input type="hidden" name="heroImageMediaUrl" id="heroImage-media-url-field">
        <p id="heroImage-media-status" style="font-size:12px;color:#888;"></p>

        <br><br>

        <label>首頁背景影片（選填，設定後前台會以全螢幕影片取代主圖當背景，靜音自動循環播放）</label>

        <br>

        ${page.heroVideo ? `${getEmbedUrl(page.heroVideo)
            ? `<iframe src="${getEmbedUrl(page.heroVideo)}" style="width:320px;height:180px;border:0;border-radius:6px;display:block;margin-bottom:8px;" allow="autoplay"></iframe>`
            : `<video src="${page.heroVideo}" style="width:320px;border-radius:6px;display:block;margin-bottom:8px;" muted loop autoplay playsinline></video>`}
        <label style="font-size:13px;"><input type="checkbox" name="removeHeroVideo"> 移除目前的背景影片</label><br>` : ""}

        <input type="file" name="heroVideo" id="heroVideo-input" accept="video/*">

        <p style="font-size:12px;color:#888;">影片檔案上限 20MB，建議先自行壓縮成幾秒到十幾秒的循環片段</p>

        <p style="font-size:13px;margin:8px 0 4px;">或者不上傳檔案，直接貼影片網址：支援 YouTube／Vimeo 的一般分享連結（會自動嵌入播放器），或直接指向影片檔案（.mp4 等）的網址。</p>

        <input
            type="text"
            name="heroVideoUrl"
            id="heroVideoUrl-input"
            placeholder="https://..."
            value="${page.heroVideoPath ? "" : (page.heroVideo || "")}"
            style="width:100%;padding:10px;"
        >

        <br><br>

        <label>
            <input type="checkbox" name="heroShowLogo" ${page.heroShowLogo ? "checked" : ""}>
            主標題位置改用 Logo 顯示（勾選後下面的主標題文字仍會保留在 Logo 底下；沒有另外上傳下面的首頁 Logo 就會沿用「網站設定」的導覽列 Logo）
        </label>

        <br><br>

        <label>首頁 Logo（選填，跟導覽列 Logo 分開，可以放不同的圖）</label>

        <br>

        ${page.heroLogo ? `<img src="${page.heroLogo}" alt="首頁 Logo" style="max-width:${page.heroLogoSize || 220}px;display:block;margin-bottom:10px;">
        <label style="font-size:13px;"><input type="checkbox" name="removeHeroLogo"> 移除目前的首頁 Logo（改回沿用導覽列 Logo）</label><br><br>` : ""}

        <input type="file" name="heroLogo" id="heroLogo-input" accept="image/*">
        <button type="button" id="heroLogo-media-btn">從媒體庫選擇</button>
        <input type="hidden" name="heroLogoMediaUrl" id="heroLogo-media-url-field">
        <p id="heroLogo-media-status" style="font-size:12px;color:#888;"></p>

        <br><br>

        <label>Logo 大小 - 電腦版（寬度，單位 px，預設 220）</label>

        <br>

        <input
            type="number"
            name="heroLogoSize"
            min="40"
            max="800"
            value="${page.heroLogoSize || 220}"
            style="width:120px;padding:10px;"
        >

        <br><br>

        <label>Logo 大小 - 手機版（寬度，單位 px，沒填就跟電腦版一樣）</label>

        <br>

        <input
            type="number"
            name="heroLogoSizeMobile"
            min="40"
            max="800"
            value="${page.heroLogoSizeMobile || page.heroLogoSize || 220}"
            style="width:120px;padding:10px;"
        >

        <br><br>

        <label>
            <input type="checkbox" name="heroShowTitle" ${page.heroShowTitle !== false ? "checked" : ""}>
            顯示主標題（不勾選就完全移除，不會佔位）
        </label>

        <br>

        <label>主標題</label>

        <br>

        <input
            type="text"
            name="heroTitle"
            id="heroTitle-input"
            value="${page.heroTitle || ""}"
            style="width:100%;padding:10px;"
        >

        <br><br>

        <label>
            <input type="checkbox" name="heroShowSubtitle" ${page.heroShowSubtitle !== false ? "checked" : ""}>
            顯示副標題
        </label>

        <br>

        <label>副標題</label>

        <br>

        <div id="heroSubtitle-editor" style="background:white;"></div>

        <textarea id="heroSubtitle-source" style="display:none;">${page.heroSubtitle || ""}</textarea>

        <input type="hidden" name="heroSubtitle" id="heroSubtitle-field">

        <br>

        <label>
            <input type="checkbox" name="heroShowButton" ${page.heroShowButton !== false ? "checked" : ""}>
            顯示按鈕
        </label>

        <br>

        <label>按鈕文字</label>

        <br>

        <input
            type="text"
            name="buttonText"
            value="${page.buttonText || ""}"
            style="width:100%;padding:10px;"
        >

        <br><br>

        <label>按鈕連結（選填，不填則預設連到「作品集」頁面 /projects，可填站內路徑如 /about，或完整網址）</label>

        <br>

        <input
            type="text"
            name="buttonLink"
            value="${page.buttonLink || ""}"
            placeholder="/projects"
            style="width:100%;padding:10px;"
        >

        <br><br>

        <label>
            <input type="checkbox" name="showFeaturedWorks" ${page.showFeaturedWorks !== false ? "checked" : ""}>
            顯示「精選作品」區塊（自動抓作品集最新 6 筆，不想在首頁重複顯示可以關掉）
        </label>

        <br><br>
    `;

}

function heroScript() {

    return `
    var quill = new Quill("#heroSubtitle-editor", {
        theme: "snow",
        modules: {
            toolbar: ${QUILL_TOOLBAR_JS}
        }
    });

    enhanceQuillCustomColor(quill);

    quill.root.innerHTML = document.getElementById("heroSubtitle-source").value;

    var subtitleField = document.getElementById("heroSubtitle-field");
    var titleInput = document.getElementById("heroTitle-input");
    var imageInput = document.getElementById("heroImage-input");
    var logoInput = document.getElementById("heroLogo-input");
    var videoInput = document.getElementById("heroVideo-input");
    var videoUrlInput = document.getElementById("heroVideoUrl-input");
    var frame = document.getElementById("preview-frame");

    function toEmbedUrl(url) {
        if (!url) return null;
        var yt = url.match(/(?:youtube\\.com\\/(?:watch\\?v=|embed\\/|shorts\\/)|youtu\\.be\\/)([a-zA-Z0-9_-]{6,})/);
        if (yt) {
            return "https://www.youtube.com/embed/" + yt[1] + "?autoplay=1&mute=1&loop=1&playlist=" + yt[1] + "&controls=0&modestbranding=1&playsinline=1&rel=0";
        }
        var vm = url.match(/vimeo\\.com\\/(?:video\\/)?(\\d+)/);
        if (vm) {
            return "https://player.vimeo.com/video/" + vm[1] + "?autoplay=1&muted=1&loop=1&background=1";
        }
        return null;
    }

    function getPreviewDoc() {
        try {
            return frame.contentDocument;
        } catch (e) {
            return null;
        }
    }

    function syncSubtitle() {

        var html = quill.root.innerHTML;

        subtitleField.value = html;

        var doc = getPreviewDoc();
        var target = doc && doc.getElementById("live-heroSubtitle");

        if (target) {
            target.innerHTML = html;
        }

    }

    function syncTitle() {

        var doc = getPreviewDoc();
        var target = doc && doc.getElementById("live-heroTitle");

        if (target) {
            target.textContent = titleInput.value;
        }

    }

    frame.addEventListener("load", function () {
        syncTitle();
        syncSubtitle();
    });

    quill.on("text-change", syncSubtitle);
    titleInput.addEventListener("input", syncTitle);

    imageInput.addEventListener("change", function () {

        var file = imageInput.files[0];

        if (!file) {
            return;
        }

        var reader = new FileReader();

        reader.onload = function () {

            var doc = getPreviewDoc();
            var target = doc && doc.getElementById("live-heroImage");

            if (target) {
                target.src = reader.result;
                target.style.display = "";
            }

        };

        reader.readAsDataURL(file);

    });

    (function () {

        var mediaBtn = document.getElementById("heroImage-media-btn");
        var mediaUrlField = document.getElementById("heroImage-media-url-field");
        var status = document.getElementById("heroImage-media-status");

        mediaBtn.addEventListener("click", function () {

            window.openMediaPicker({
                multiple: false,
                onSelect: function (files) {

                    var file = files[0];

                    mediaUrlField.value = file.url;
                    imageInput.value = "";
                    status.textContent = "已選擇媒體庫圖片，記得按「儲存頁面基本資料」";

                    var doc = getPreviewDoc();
                    var target = doc && doc.getElementById("live-heroImage");

                    if (target) {
                        target.src = file.url;
                        target.style.display = "";
                    }

                }
            });

        });

    })();

    if (logoInput) {

        logoInput.addEventListener("change", function () {

            var file = logoInput.files[0];

            if (!file) {
                return;
            }

            var reader = new FileReader();

            reader.onload = function () {

                var doc = getPreviewDoc();
                var target = doc && doc.getElementById("live-heroLogo");

                if (target) {
                    target.src = reader.result;
                }

            };

            reader.readAsDataURL(file);

        });

        (function () {

            var mediaBtn = document.getElementById("heroLogo-media-btn");
            var mediaUrlField = document.getElementById("heroLogo-media-url-field");
            var status = document.getElementById("heroLogo-media-status");

            mediaBtn.addEventListener("click", function () {

                window.openMediaPicker({
                    multiple: false,
                    onSelect: function (files) {

                        var file = files[0];

                        mediaUrlField.value = file.url;
                        logoInput.value = "";
                        status.textContent = "已選擇媒體庫圖片，記得按「儲存頁面基本資料」";

                        var doc = getPreviewDoc();
                        var target = doc && doc.getElementById("live-heroLogo");

                        if (target) {
                            target.src = file.url;
                        }

                    }
                });

            });

        })();

    }

    if (videoInput) {

        videoInput.addEventListener("change", function () {

            var file = videoInput.files[0];

            if (!file) {
                return;
            }

            var reader = new FileReader();

            reader.onload = function () {

                var doc = getPreviewDoc();
                var video = doc && doc.getElementById("live-heroVideo");
                var image = doc && doc.getElementById("live-heroImage");
                var embedWrap = doc && doc.getElementById("live-heroVideoEmbed");

                if (video) {
                    video.src = reader.result;
                    video.style.display = "";
                    video.play();
                }

                if (embedWrap) {
                    embedWrap.style.display = "none";
                }

                if (image) {
                    image.style.display = "none";
                }

            };

            reader.readAsDataURL(file);

        });

    }

    if (videoUrlInput) {

        videoUrlInput.addEventListener("input", function () {

            var doc = getPreviewDoc();
            var video = doc && doc.getElementById("live-heroVideo");
            var image = doc && doc.getElementById("live-heroImage");
            var embedWrap = doc && doc.getElementById("live-heroVideoEmbed");
            var embedFrame = embedWrap && embedWrap.querySelector("iframe");
            var url = videoUrlInput.value.trim();
            var embed = toEmbedUrl(url);

            if (embed) {

                if (embedFrame) embedFrame.src = embed;
                if (embedWrap) embedWrap.style.display = "";
                if (video) video.style.display = "none";
                if (image) image.style.display = "none";

            } else if (url) {

                if (video) {
                    video.src = url;
                    video.style.display = "";
                    video.play();
                }

                if (embedWrap) embedWrap.style.display = "none";
                if (image) image.style.display = "none";

            } else {

                if (embedWrap) embedWrap.style.display = "none";
                if (video) video.style.display = "none";

            }

        });

    }
    `;

}

module.exports = (pageId, page, basePath) => layout(

TITLES[pageId] || pageId,

`

<link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
<link href="https://cdn.quilljs.com/1.3.7/quill.bubble.css" rel="stylesheet">

<h1>${TITLES[pageId] || pageId}</h1>

<br>

<div class="edit-preview-layout" style="display:flex;gap:20px;flex-wrap:wrap;">

    <div style="flex:0 0 460px;min-width:0;max-width:100%;">

        ${pageId === "home" ? `

        <form method="POST" action="${basePath}" enctype="multipart/form-data" class="ajax-save-form">

            ${renderHeroFields(page)}

            <button type="submit">儲存</button>

        </form>

        <hr><br>

        ` : ""}

        ${renderModulesSection(basePath, page.modules)}

    </div>

    <div style="flex:1;min-width:0;">

        ${previewPanelHtml("preview-frame", PREVIEW_PATHS[pageId] || "/")}

    </div>

</div>

<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>

<script>
(function () {

    ${moduleEditorScript()}

    ${pageId === "home" ? heroScript() : ""}

})();
${previewPanelScript()}
</script>

`

);
