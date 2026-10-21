const layout = require("./layout");
const { batchDeleteControls, batchDeleteScript } = require("./batchDelete");
const { describeStatus } = require("../../services/publishHelper");

module.exports = (pages) => layout(

"自訂頁面",

`

<h1>自訂頁面</h1>

<p style="color:#666;margin:10px 0 16px;">
    這裡管理所有頁面，包含一般內容頁（例如活動說明、常見問答）跟分類清單頁（例如作品集、文章）——
    點下面清單裡的「編輯」就可以管理該頁面底下的內容。
    聯絡我表單收到的留言請到 <a href="/cms/messages">留言管理</a>。
</p>

<a href="/cms/custom-pages/new"><button type="button">新增頁面</button></a>

<br><br>

${pages.length === 0 ? "<p>尚未新增任何頁面</p>" : `

${batchDeleteControls("page-select-checkbox", "頁面")}

<table style="width:100%;border-collapse:collapse;">

    <thead>
        <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;"></th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">標題</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">網址</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">狀態</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">操作</th>
        </tr>
    </thead>

    <tbody>

        ${pages.map(page => `

            <tr>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <input type="checkbox" class="page-select-checkbox" value="${page.id}">
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${page.title}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <a href="/p/${page.slug}" target="_blank">/p/${page.slug}</a>
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${describeStatus(page)}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">

                    <a href="/cms/custom-pages/${page.id}/edit">編輯</a>

                    &nbsp;

                    <form method="POST" action="/cms/custom-pages/${page.id}/delete" style="display:inline;" onsubmit="return confirm('確定要刪除這個自訂頁面嗎？此動作無法復原。');">
                        <button type="submit">刪除</button>
                    </form>

                </td>

            </tr>

        `).join("")}

    </tbody>

</table>

<script>${batchDeleteScript("page-select-checkbox", "/cms/custom-pages/delete-many", "頁面")}</script>

`}

`

);
