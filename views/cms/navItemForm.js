const layout = require("./layout");

module.exports = (navItem, pages) => layout(

navItem ? "編輯導覽項目" : "新增導覽項目",

`

<h1>${navItem ? "編輯導覽項目" : "新增導覽項目"}</h1>

<br>

<form method="POST" action="${navItem ? `/cms/nav-items/${navItem.id}` : "/cms/nav-items"}">

    <label>顯示文字</label>

    <br>

    <input
        type="text"
        name="label"
        value="${navItem ? navItem.label : ""}"
        style="width:100%;max-width:400px;padding:10px;"
        required
    >

    <br><br>

    <label>
        <input type="checkbox" name="enabled" ${!navItem || navItem.enabled !== false ? "checked" : ""}>
        顯示在導覽列（取消勾選可暫時隱藏，不用刪除）
    </label>

    <br><br>

    <label>指向類型</label>

    <br>

    <label style="margin-right:20px;">
        <input type="radio" name="targetType" value="url" class="target-type-radio" ${!navItem || navItem.target.type === "url" ? "checked" : ""}>
        固定網址
    </label>

    <label>
        <input type="radio" name="targetType" value="page" class="target-type-radio" ${navItem && navItem.target.type === "page" ? "checked" : ""}>
        自訂頁面
    </label>

    <br><br>

    <div id="target-url-group">

        <label>網址（例如 /about、/projects、/blog、/contact、/booking，或外部完整網址）</label>

        <br>

        <input
            type="text"
            name="targetUrl"
            value="${navItem && navItem.target.type === "url" ? navItem.target.value : ""}"
            style="width:100%;max-width:400px;padding:10px;"
        >

    </div>

    <div id="target-page-group" style="display:none;">

        <label>選擇自訂頁面</label>

        <br>

        <select name="targetPageId" style="padding:10px;max-width:400px;width:100%;">
            <option value="">請選擇</option>
            ${pages.map(page => `<option value="${page.id}" ${navItem && navItem.target.pageId === page.id ? "selected" : ""}>${page.title}（/p/${page.slug}）</option>`).join("")}
        </select>

    </div>

    <br><br>

    <label>
        <input type="checkbox" name="showCategories" ${navItem && navItem.showCategories ? "checked" : ""}>
        下拉顯示分類連結（僅適用於指向「作品集」「文章」這類有分類清單的頁面）
    </label>

    <br>

    <label>
        <input type="checkbox" name="showEmptyCategories" ${navItem && navItem.showEmptyCategories ? "checked" : ""}>
        還沒有作品的分類也顯示在下拉選單（預設只列出有已發布作品的分類）
    </label>

    <br><br>

    <button type="submit">儲存</button>

</form>

<script>
(function () {

    var urlRadio = document.querySelector('input[name="targetType"][value="url"]');
    var pageRadio = document.querySelector('input[name="targetType"][value="page"]');
    var urlGroup = document.getElementById("target-url-group");
    var pageGroup = document.getElementById("target-page-group");

    function sync() {
        urlGroup.style.display = urlRadio.checked ? "block" : "none";
        pageGroup.style.display = pageRadio.checked ? "block" : "none";
    }

    urlRadio.addEventListener("change", sync);
    pageRadio.addEventListener("change", sync);
    sync();

})();
</script>

`

);
