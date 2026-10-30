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

// 全螢幕輪播的投影片編輯器：每張投影片＝照片（從媒體庫選）或背景影片網址＋小標／大標題／副標。
// 畫面上的清單由 JS 管理，送出時整份序列化進 heroSlidesJson（sitePageController 解析）
function renderSlideshowFields(page) {

    const slides = JSON.stringify(page.heroSlides || []).replace(/</g, "\\u003c");

    return `
        <fieldset style="border:1px solid #ddd;border-radius:10px;padding:16px 18px;margin:0 0 24px;">
            <legend style="font-weight:bold;padding:0 6px;">主視覺樣式</legend>
            <label style="display:block;margin-bottom:6px;"><input type="radio" name="heroStyle" value="slideshow" ${page.heroStyle === "slideshow" ? "checked" : ""}> 全螢幕輪播（滿版照片／影片自動輪播，文字在左下角，導覽列透明疊在上面）</label>
            <label style="display:block;"><input type="radio" name="heroStyle" value="classic" ${page.heroStyle !== "slideshow" ? "checked" : ""}> 經典（置中標題，用下方的「首頁主圖／背景影片」設定）</label>

            <div id="slideshow-editor" style="margin-top:16px;">
                <p style="color:#777;font-size:13px;margin:0 0 10px;">每張投影片可以用照片（先在媒體庫上傳）或背景影片（YouTube／Vimeo 連結或 MP4 網址，有影片時照片當載入前的封面）。大標題可用 Enter 換行。按鈕文字與連結用下方「按鈕」欄位設定，所有投影片共用。</p>
                <div id="slides-list"></div>
                <button type="button" id="add-slide-btn">＋ 新增投影片</button>
                <input type="hidden" name="heroSlidesJson" id="hero-slides-json">
            </div>

            <br>
            <label>第二顆按鈕文字（選填，例如 聯絡我們）</label><br>
            <input type="text" name="button2Text" value="${page.button2Text || ""}" style="width:100%;padding:10px;">
            <br><br>
            <label>第二顆按鈕連結</label><br>
            <input type="text" name="button2Link" value="${page.button2Link || ""}" placeholder="/p/contact" style="width:100%;padding:10px;">
        </fieldset>

        <script>
        (function () {
            var slides = ${slides};
            var list = document.getElementById("slides-list");
            var json = document.getElementById("hero-slides-json");
            function esc(v) { return String(v || "").replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;", "'": "&#39;" }[c]; }); }
            // 最多 10 張（sitePageController 存檔時也只收前 10 張）
            var MAX = 10;
            function sync() { json.value = JSON.stringify(slides); }
            function moveSlide(from, to) {
                to = Math.min(Math.max(to, 0), slides.length - 1);
                if (from !== to) slides.splice(to, 0, slides.splice(from, 1)[0]);
                render();
            }
            // 順序數字框：輸入要移到第幾張，Enter 或點旁邊就套用
            list.addEventListener("change", function (e) {
                if (!e.target.classList.contains("slide-order-input")) return;
                var row = e.target.closest(".slide-row");
                moveSlide(+row.getAttribute("data-i"), (parseInt(e.target.value, 10) || 1) - 1);
            });
            list.addEventListener("keydown", function (e) {
                if (e.key === "Enter" && e.target.classList.contains("slide-order-input")) { e.preventDefault(); e.target.blur(); }
            });
            // 拖拉：按住 ⠿ 上下拖，放開後依畫面上的位置重排
            list.addEventListener("pointerdown", function (e) {
                if (!e.target.classList.contains("drag-handle")) return;
                e.preventDefault();
                var row = e.target.closest(".slide-row");
                row.classList.add("dragging");
                function onMove(ev) {
                    var rows = Array.from(list.querySelectorAll(".slide-row")).filter(function (r) { return r !== row; });
                    var target = rows.find(function (r) { var rect = r.getBoundingClientRect(); return ev.clientY < rect.top + rect.height / 2; });
                    if (target) list.insertBefore(row, target); else list.appendChild(row);
                }
                function onUp() {
                    document.removeEventListener("pointermove", onMove);
                    document.removeEventListener("pointerup", onUp);
                    var old = slides.slice();
                    slides = Array.from(list.querySelectorAll(".slide-row")).map(function (r) { return old[+r.getAttribute("data-i")]; });
                    render();
                }
                document.addEventListener("pointermove", onMove);
                document.addEventListener("pointerup", onUp);
            });
            function render() {
                list.innerHTML = slides.map(function (s, i) {
                    return '<div class="slide-row" data-i="' + i + '" style="display:flex;gap:12px;padding:12px;margin-bottom:10px;border:1px solid #e3e3e3;border-radius:8px;background:#fff;">' +
                        '<div class="slide-order"><span class="drag-handle" title="按住拖拉排序">⠿</span><input type="number" class="order-input slide-order-input" min="1" max="' + slides.length + '" value="' + (i + 1) + '" title="輸入數字直接移到第幾張"></div>' +
                        '<div style="flex:0 0 140px;"><div style="width:140px;height:90px;border-radius:6px;background:#f2f0ec center/cover no-repeat;' + (s.image ? "background-image:url(\\'" + esc(s.image) + "\\');" : "") + '"></div>' +
                        '<button type="button" class="slide-pick" style="font-size:12px;margin-top:6px;">從媒體庫選照片</button></div>' +
                        '<div style="flex:1;display:grid;gap:6px;">' +
                        '<input type="text" class="slide-f" data-f="eyebrow" placeholder="小標（例如 COMMERCIAL PHOTOGRAPHY）" value="' + esc(s.eyebrow) + '" style="padding:7px;">' +
                        '<textarea class="slide-f" data-f="title" rows="2" placeholder="大標題" style="padding:7px;">' + esc(s.title) + '</textarea>' +
                        '<input type="text" class="slide-f" data-f="subtitle" placeholder="副標" value="' + esc(s.subtitle) + '" style="padding:7px;">' +
                        '<input type="text" class="slide-f" data-f="video" placeholder="背景影片（選填）：YouTube／Vimeo 連結或 MP4 網址" value="' + esc(s.video) + '" style="padding:7px;">' +
                        '<div style="display:flex;gap:6px;"><button type="button" class="slide-up">↑</button><button type="button" class="slide-down">↓</button><button type="button" class="slide-del ghost-btn">刪除這張</button></div>' +
                        '</div></div>';
                }).join("") || '<p style="color:#999;">還沒有投影片</p>';
                var addBtn = document.getElementById("add-slide-btn");
                addBtn.disabled = slides.length >= MAX;
                addBtn.textContent = slides.length >= MAX ? "已達上限 " + MAX + " 張" : "＋ 新增投影片（" + slides.length + "／" + MAX + "）";
                sync();
            }
            list.addEventListener("input", function (e) {
                var row = e.target.closest(".slide-row");
                if (!row || !e.target.classList.contains("slide-f")) return;
                slides[+row.getAttribute("data-i")][e.target.getAttribute("data-f")] = e.target.value;
                sync();
            });
            list.addEventListener("click", function (e) {
                var row = e.target.closest(".slide-row");
                if (!row) return;
                var i = +row.getAttribute("data-i");
                if (e.target.closest(".slide-del")) { if (confirm("刪除這張投影片？")) { slides.splice(i, 1); render(); } }
                else if (e.target.closest(".slide-up") && i > 0) { slides.splice(i - 1, 0, slides.splice(i, 1)[0]); render(); }
                else if (e.target.closest(".slide-down") && i < slides.length - 1) { slides.splice(i + 1, 0, slides.splice(i, 1)[0]); render(); }
                else if (e.target.closest(".slide-pick")) {
                    window.openMediaPicker({ multiple: false, onSelect: function (files) { slides[i].image = files[0].url; render(); } });
                }
            });
            document.getElementById("add-slide-btn").addEventListener("click", function () {
                if (slides.length >= MAX) return;
                slides.push({ id: String(Date.now()), image: "", video: "", eyebrow: "", title: "", subtitle: "" });
                render();
            });
            render();
        })();
        </script>
    `;

}

function renderHeroFields(page) {

    return renderSlideshowFields(page) + `
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
