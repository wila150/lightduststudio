const layout = require("./layout");
const { batchDeleteControls, batchDeleteScript } = require("./batchDelete");

module.exports = (items) => layout(

"服務項目",

`

<h1>服務項目</h1>

<br>

<a href="/cms/booking-services/new"><button type="button">新增服務</button></a>

<br><br>

${items.length === 0 ? "<p>尚未新增任何服務項目</p>" : `

${batchDeleteControls("service-select-checkbox", "服務項目")}

<table style="width:100%;border-collapse:collapse;">

    <thead>
        <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;"></th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">名稱</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">時長</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">價格</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">啟用</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">操作</th>
        </tr>
    </thead>

    <tbody>

        ${items.map(item => `

            <tr>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <input type="checkbox" class="service-select-checkbox" value="${item.id}">
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${item.duration} 分鐘</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${item.price || "-"}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${item.active ? "是" : "否"}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">

                    <a href="/cms/booking-services/${item.id}/edit">編輯</a>

                    &nbsp;

                    <form method="POST" action="/cms/booking-services/${item.id}/delete" style="display:inline;" onsubmit="return confirm('確定要刪除這個服務項目嗎？此動作無法復原。');">
                        <button type="submit">刪除</button>
                    </form>

                </td>

            </tr>

        `).join("")}

    </tbody>

</table>

<script>${batchDeleteScript("service-select-checkbox", "/cms/booking-services/delete-many", "服務項目")}</script>

`}

`

);
