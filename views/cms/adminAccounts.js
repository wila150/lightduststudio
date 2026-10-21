const layout = require("./layout");

const ROLE_LABELS = {
    superadmin: "superadmin（不限租戶，什麼都能管）",
    tenant_admin: "tenant_admin（限定租戶）"
};

function formatTime(value) {
    return value ? new Date(value).toLocaleString("zh-TW") : "從未登入";
}

module.exports = (accounts, currentUser) => layout(

"帳號管理",

`

<h1>帳號管理</h1>

<p style="color:#888;font-size:13px;">只有 superadmin 看得到這一頁。新增帳號時，如果 email 已經用 Google 登入過，會直接沿用那個帳號設定權限；如果有填密碼，帳密登入也會同時可用。</p>

<br>

<table style="width:100%;border-collapse:collapse;">

    <thead>
        <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Email</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">登入方式</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">角色</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">最後登入</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">操作</th>
        </tr>
    </thead>

    <tbody>

        ${accounts.map(account => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #eee;">
                    ${account.email}
                    ${account.uid === currentUser.id ? " <span style=\"color:#888;font-size:12px;\">（你自己）</span>" : ""}
                </td>
                <td style="padding:8px;border-bottom:1px solid #eee;">
                    ${account.providers.length === 0 ? "<span style=\"color:#c0392b;\">尚未登入過</span>" : account.providers.map(p => p === "google.com" ? "Google" : p === "password" ? "帳號密碼" : p).join("、")}
                </td>
                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <form method="POST" action="/cms/admins/${account.uid}/role" style="display:flex;gap:6px;align-items:center;">
                        ${!account.role ? `<span style="color:#c0392b;font-size:12px;">尚未設定權限</span>` : ""}
                        <select name="role" ${account.uid === currentUser.id ? "disabled" : ""}>
                            <option value="" ${account.role ? "" : "selected"} disabled hidden>請選擇</option>
                            <option value="superadmin" ${account.role === "superadmin" ? "selected" : ""}>superadmin</option>
                            <option value="tenant_admin" ${account.role === "tenant_admin" ? "selected" : ""}>tenant_admin</option>
                        </select>
                        ${account.uid !== currentUser.id ? `<button type="submit">${account.role ? "更新" : "設定"}</button>` : ""}
                    </form>
                </td>
                <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;color:#666;">${formatTime(account.lastSignInTime)}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;">
                    ${account.uid === currentUser.id ? "-" : `
                    <form method="POST" action="/cms/admins/${account.uid}/delete" onsubmit="return confirm('確定要移除這個帳號嗎？此動作無法復原，對方會立刻無法登入。');">
                        <button type="submit">移除</button>
                    </form>
                    `}
                </td>
            </tr>
        `).join("")}

    </tbody>

</table>

<br><br>

<h2>新增 / 開通帳號</h2>

<p style="color:#888;font-size:13px;">如果對方已經用 Google 登入過但顯示「尚未設定權限」，在這裡直接填他的 email 設定角色即可，不用填密碼。</p>

<form method="POST" action="/cms/admins" style="max-width:420px;">

    <label>Email</label>
    <br>
    <input type="email" name="email" placeholder="someone@example.com" style="width:100%;padding:10px;" required>

    <br><br>

    <label>密碼（選填，留空代表只開放對方用 Google 帳號登入）</label>
    <br>
    <input type="text" name="password" placeholder="至少 6 個字元" style="width:100%;padding:10px;">

    <br><br>

    <label>角色</label>
    <br>
    <select name="role" style="padding:10px;">
        ${Object.entries(ROLE_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
    </select>

    <br><br>

    <button type="submit">新增 / 更新權限</button>

</form>

`

);
