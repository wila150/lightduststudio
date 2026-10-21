const layout = require("./layout");
const { batchDeleteControls, batchDeleteScript } = require("./batchDelete");
const { dragReorderScript } = require("./dragReorder");

function describeTarget(navItem) {

    if (navItem.target && navItem.target.type === "page") {
        return navItem.target.pageId ? `自訂頁面（id: ${navItem.target.pageId}）` : "（尚未選擇頁面）";
    }

    return (navItem.target && navItem.target.value) || "（尚未設定網址）";

}

module.exports = (navItems) => layout(

"導覽列管理",

`

<h1>導覽列管理</h1>

<p style="color:#666;margin:10px 0 16px;">
    這裡管理前台最上方的導覽列：文字可以自由改、順序可以調整、可以暫時隱藏，也可以新增指到自訂頁面或固定網址的項目。
</p>

<a href="/cms/nav-items/new"><button type="button">＋ 新增導覽項目</button></a>

<br><br>

${navItems.length === 0 ? "<p>尚未新增任何導覽項目</p>" : `

${batchDeleteControls("nav-item-select-checkbox", "導覽項目")}

<table style="width:100%;border-collapse:collapse;" data-drag-reorder="/cms/nav-items/reorder">

    <thead>
        <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;"></th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;"></th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">文字</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">指向</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">狀態</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">操作</th>
        </tr>
    </thead>

    <tbody>

        ${navItems.map(navItem => `

            <tr data-drag-id="${navItem.id}">

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <span class="drag-handle" title="拖拉排序">⠿</span>
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <input type="checkbox" class="nav-item-select-checkbox" value="${navItem.id}">
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${navItem.label}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${describeTarget(navItem)}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${navItem.enabled !== false ? "顯示中" : "已隱藏"}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">

                    <a href="/cms/nav-items/${navItem.id}/edit">編輯</a>

                    &nbsp;

                    <form method="POST" action="/cms/nav-items/${navItem.id}/delete" style="display:inline;" onsubmit="return confirm('確定要刪除這個導覽項目嗎？此動作無法復原。');">
                        <button type="submit">刪除</button>
                    </form>

                </td>

            </tr>

        `).join("")}

    </tbody>

</table>

<script>${batchDeleteScript("nav-item-select-checkbox", "/cms/nav-items/delete-many", "導覽項目")}</script>
<script>${dragReorderScript()}</script>

`}

`

);
