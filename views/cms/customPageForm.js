const featureService = require("../../services/featureService");
const layout = require("./layout");
const { renderModulesSection, moduleEditorScript } = require("./moduleEditor");
const { renderCollectionSection } = require("./collectionSection");
const { formatDatetimeLocal } = require("../../services/publishHelper");
const { previewPanelHtml, previewPanelScript } = require("./previewPanel");

module.exports = (page, navItems = [], collectionCategories = [], collectionItems = [], activeCategoryId = "") => layout(

page ? "編輯頁面" : "新增頁面",

`

<link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
<link href="https://cdn.quilljs.com/1.3.7/quill.bubble.css" rel="stylesheet">

<h1>${page ? "編輯頁面" : "新增頁面"}</h1>

<br>

<div class="edit-preview-layout" style="display:flex;gap:20px;flex-wrap:wrap;">

    <div style="flex:0 0 460px;min-width:0;max-width:100%;">

        <form method="POST" action="${page ? `/cms/custom-pages/${page.id}` : "/cms/custom-pages"}" enctype="multipart/form-data" ${page ? "class=\"ajax-save-form\"" : ""}>

            <label>標題</label>

            <br>

            <input
                type="text"
                name="title"
                id="title-input"
                value="${page ? page.title : ""}"
                style="width:100%;padding:10px;"
                required
            >

            <br><br>

            <label>副標（選填，會顯示在標題下方；如果有導覽項目連到這個頁面，滑鼠移過去該導覽項目時也會顯示這個副標）</label>

            <br>

            <input
                type="text"
                name="subtitle"
                value="${page ? (page.subtitle || "") : ""}"
                style="width:100%;padding:10px;"
            >

            <br><br>

            <label>標題大小</label>

            <br>

            <select name="titleSize" style="padding:10px;">
                <option value="small" ${page && page.titleSize === "small" ? "selected" : ""}>小</option>
                <option value="medium" ${!page || !page.titleSize || page.titleSize === "medium" ? "selected" : ""}>中（預設）</option>
                <option value="large" ${page && page.titleSize === "large" ? "selected" : ""}>大</option>
                <option value="xlarge" ${page && page.titleSize === "xlarge" ? "selected" : ""}>特大</option>
            </select>

            <br><br>

            <label>網址代稱（英數、-，會顯示在 /p/代稱）</label>

            <br>

            <input
                type="text"
                name="slug"
                value="${page ? page.slug : ""}"
                style="width:100%;padding:10px;"
                pattern="[a-z0-9\\-]+"
                required
            >

            <br><br>

            ${!page ? `
            <label>頁面類型（建立後無法更改）</label>

            <br>

            <select name="pageType" id="page-type-select" style="padding:10px;">
                <option value="content">一般內容頁（用模組自由排版，例如關於我/聯絡我）</option>
                <option value="collection">分類清單頁（底下可以新增分類與項目，例如作品集/文章）</option>
            </select>

            <div id="content-kind-group" style="display:none;margin-top:10px;padding:12px 14px;background:#f7f7f7;border-radius:8px;">

                <label style="font-weight:bold;">這個分類清單頁要用來放什麼？（建立後無法更改）</label>

                <br><br>

                <label style="display:block;margin-bottom:6px;">
                    <input type="radio" name="contentKind" value="portfolio" checked>
                    作品集（強調封面照／相簿，例如攝影作品、案例展示）
                </label>

                ${featureService.enabled("blog") ? `<label style="display:block;">
                    <input type="radio" name="contentKind" value="article">
                    文章（列表/內頁會顯示發布日期與作者，例如部落格、最新消息）
                </label>` : ""}

            </div>

            <br><br>
            ` : `
            <p style="color:#888;font-size:13px;">
                頁面類型：${page.pageType === "collection" ? "分類清單頁" : "一般內容頁"}（建立後無法更改）
                ${page.pageType === "collection" ? ` ／ ${page.contentKind === "article" ? "文章" : "作品集"}` : ""}
            </p>
            `}

            <label>SEO 描述（選填，顯示在搜尋引擎結果；不填則使用網站的全站預設描述）</label>

            <br>

            <textarea
                name="metaDescription"
                rows="3"
                style="width:100%;padding:10px;"
            >${page ? (page.metaDescription || "") : ""}</textarea>

            <br><br>

            ${page ? `
            <label>頁面背景照片（選填，鋪滿整個頁面當底圖，手機上尤其明顯，適合聯絡我這類頁面）</label>

            <br>

            ${page.backgroundImage ? `<img src="${page.backgroundImage}" alt="頁面背景" style="width:240px;height:140px;object-fit:cover;display:block;margin-bottom:10px;border-radius:6px;">
            <label style="font-size:13px;"><input type="checkbox" name="removeBackgroundImage"> 移除目前的背景照片</label><br><br>` : ""}

            <input type="file" name="backgroundImage" id="bgImage-input" accept="image/*">
            <button type="button" id="bgImage-media-btn">從媒體庫選擇</button>
            <input type="hidden" name="backgroundImageMediaUrl" id="bgImage-media-url-field">
            <p id="bgImage-media-status" style="font-size:12px;color:#888;"></p>

            <br><br>
            ` : ""}

            <label>
                <input type="checkbox" name="published" ${!page || page.published ? "checked" : ""}>
                發布（顯示於前台導覽列與 /p/代稱）
            </label>

            <br><br>

            <label>顯示在導覽列的位置</label>

            <br>

            <select name="navParent" style="padding:10px;">
                <option value="" ${!page || page.navParent === "" || !page.navParent ? "selected" : ""}>更多（放在導覽列最後的「更多」下拉選單）</option>
                ${navItems.map(item => `<option value="${item.id}" ${page && page.navParent === item.id ? "selected" : ""}>掛在「${item.label}」底下的下拉選單</option>`).join("")}
            </select>

            <p style="color:#888;font-size:12px;margin:6px 0 0;">
                如果要讓這個頁面獨立顯示在導覽列最上層（不是掛在下拉選單裡），請到
                <a href="/cms/nav-items/new">導覽列管理</a> 新增一個指到這個頁面的項目。
            </p>

            <br><br>

            <label>排程發布時間（選填，設定未來時間的話，即使勾選「發布」也要等到那個時間才會真的對外顯示）</label>

            <br>

            <input
                type="datetime-local"
                name="publishAt"
                value="${page ? formatDatetimeLocal(page.publishAt) : ""}"
                style="padding:10px;"
            >

            <br><br>

            <button type="submit">儲存頁面基本資料</button>

        </form>

        <hr><br>

        ${!page ? "<p>儲存頁面基本資料後，才能開始新增內容。</p>" :
            page.pageType === "collection"
                ? renderCollectionSection(page.id, collectionCategories, collectionItems, activeCategoryId)
                : renderModulesSection(`/cms/custom-pages/${page.id}`, page.modules)
        }

    </div>

    <div style="flex:1;min-width:0;">

        ${page
            ? previewPanelHtml("preview-frame", `/cms/custom-pages/${page.id}/preview`)
            : `<p>即時預覽</p><p>儲存後即可預覽</p>`
        }

    </div>

</div>

<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>

<script>
(function () {

    ${moduleEditorScript()}

    // 只有編輯現有頁面時才有背景照片欄位
    var bgMediaBtn = document.getElementById("bgImage-media-btn");

    if (bgMediaBtn) {

        var bgMediaUrlField = document.getElementById("bgImage-media-url-field");
        var bgFileInput = document.getElementById("bgImage-input");
        var bgStatus = document.getElementById("bgImage-media-status");

        bgMediaBtn.addEventListener("click", function () {

            window.openMediaPicker({
                multiple: false,
                onSelect: function (files) {

                    bgMediaUrlField.value = files[0].url;
                    bgFileInput.value = "";
                    bgStatus.textContent = "已選擇媒體庫圖片：" + files[0].name + "，記得按「儲存頁面基本資料」";

                }
            });

        });

    }

    // 只有新增頁面時才有這個元素，選「分類清單頁」才需要再選作品集/文章
    var pageTypeSelect = document.getElementById("page-type-select");
    var contentKindGroup = document.getElementById("content-kind-group");

    if (pageTypeSelect && contentKindGroup) {

        var syncContentKindGroup = function () {
            contentKindGroup.style.display = pageTypeSelect.value === "collection" ? "block" : "none";
        };

        pageTypeSelect.addEventListener("change", syncContentKindGroup);
        syncContentKindGroup();

    }

    // 標題即時同步進右側預覽
    var titleInput = document.getElementById("title-input");
    var frame = document.getElementById("preview-frame");

    if (titleInput && frame) {

        titleInput.addEventListener("input", function () {

            try {

                var doc = frame.contentDocument;
                var target = doc && doc.getElementById("live-title");

                if (target) {
                    target.textContent = titleInput.value;
                }

            } catch (e) {}

        });

    }

})();
${previewPanelScript()}
</script>

`

);
