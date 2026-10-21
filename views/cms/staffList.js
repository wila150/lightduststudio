const layout = require("./layout");
const { batchDeleteControls, batchDeleteScript } = require("./batchDelete");

module.exports = (staff) => layout(

"預約人員",

`

<h1>預約人員</h1>

<br>

<a href="/cms/staff/new"><button type="button">新增人員</button></a>

<br><br>

${staff.length === 0 ? "<p>尚未新增任何人員</p>" : `

${batchDeleteControls("staff-select-checkbox", "人員")}

<table style="width:100%;border-collapse:collapse;">

    <thead>
        <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;"></th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">大頭照</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">姓名</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">啟用</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">操作</th>
        </tr>
    </thead>

    <tbody>

        ${staff.map(member => `

            <tr>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <input type="checkbox" class="staff-select-checkbox" value="${member.id}">
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    ${member.avatarUrl ? `<img src="${member.avatarUrl}" alt="${member.name}" style="width:50px;height:50px;object-fit:cover;border-radius:50%;">` : "-"}
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${member.name}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${member.active ? "是" : "否"}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">

                    <a href="/cms/staff/${member.id}/edit">編輯</a>

                    &nbsp;

                    <form method="POST" action="/cms/staff/${member.id}/delete" style="display:inline;" onsubmit="return confirm('確定要刪除這位預約人員嗎？此動作無法復原。');">
                        <button type="submit">刪除</button>
                    </form>

                </td>

            </tr>

        `).join("")}

    </tbody>

</table>

<script>${batchDeleteScript("staff-select-checkbox", "/cms/staff/delete-many", "人員")}</script>

`}

`

);
