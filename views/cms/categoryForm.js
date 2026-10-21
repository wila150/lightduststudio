const layout = require("./layout");
const escapeHtml = require("../escapeHtml");

module.exports = (category, actionUrl, topLevelOptions = []) => layout(

category ? "編輯分類" : "新增分類",

`

<h1>${category ? "編輯分類" : "新增分類"}</h1>

<br>

<form method="POST" action="${actionUrl || (category ? `/cms/categories/${category.id}` : "/cms/categories")}" enctype="multipart/form-data">

    <label>分類名稱</label>

    <br>

    <input type="text" name="label" value="${category ? category.label : ""}" style="width:100%;padding:10px;" required>

    <br><br>

    <label>分類說明（選填，前台點選這個分類時顯示在作品下方；換行會照原樣保留）</label>

    <br>

    <textarea name="description" rows="6" style="width:100%;padding:10px;">${category && category.description ? escapeHtml(category.description) : ""}</textarea>

    <br><br>

    ${topLevelOptions.length > 0 ? `
    <label>上層分類（選填，只能設一層子分類；留空代表這是頂層分類）</label>

    <br>

    <select name="parentCategoryId" style="padding:10px;">
        <option value="">（頂層分類，不屬於任何分類底下）</option>
        ${topLevelOptions.map(cat => `<option value="${cat.id}" ${category && category.parentCategoryId === cat.id ? "selected" : ""}>${cat.label}</option>`).join("")}
    </select>

    <br><br>
    ` : ""}

    <label>分類封面照${category ? "（重新上傳可更換）" : ""}</label>

    <br>

    ${category && category.coverImage ? `<img src="${category.coverImage.url}" alt="" style="width:160px;height:110px;object-fit:cover;border-radius:7px;display:block;margin:8px 0;">` : ""}

    <input type="file" name="coverImage" id="category-cover-input" accept="image/*">
    <button type="button" id="category-cover-media-btn">從媒體庫選擇</button>
    <input type="hidden" name="coverImageMediaUrl" id="category-cover-media-url-field">
    <p id="category-cover-media-status" style="font-size:12px;color:#888;"></p>

    <br><br>

    <button type="submit">儲存</button>

</form>

<script>
(function () {

    var mediaBtn = document.getElementById("category-cover-media-btn");
    var mediaUrlField = document.getElementById("category-cover-media-url-field");
    var fileInput = document.getElementById("category-cover-input");
    var status = document.getElementById("category-cover-media-status");

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: false,
            onSelect: function (files) {

                mediaUrlField.value = files[0].url;
                fileInput.value = "";
                status.textContent = "已選擇媒體庫圖片：" + files[0].name;

            }
        });

    });

})();
</script>

`

);
