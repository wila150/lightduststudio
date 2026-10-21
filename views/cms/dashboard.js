const layout = require("./layout");
const { QUICK_LINK_CATALOG } = require("../../services/quickLinks");
const escapeHtml = require("../escapeHtml");

module.exports = (user, stats, quickLinks, selectedKeys = [], isSuperadmin = false, recentMessages = []) => layout(

"Dashboard",

`

<h1>歡迎回來，${user.name}</h1>

<p class="dashboard-role">角色：${user.role}</p>

<div class="stat-cards">

    <a href="/cms/custom-pages" class="stat-card">
        <span class="stat-card-number">${stats.projectCount}</span>
        <span class="stat-card-label">📸 作品總數</span>
        <span class="stat-card-sub">已發布 ${stats.publishedProjectCount} 個</span>
    </a>

    <a href="/cms/messages" class="stat-card">
        <span class="stat-card-number">${stats.messageCount}</span>
        <span class="stat-card-label">💬 留言總數</span>
    </a>

    <a href="/cms/bookings" class="stat-card">
        <span class="stat-card-number">${stats.bookingCount}</span>
        <span class="stat-card-label">🗓️ 有效預約</span>
    </a>

</div>

<h2 class="dashboard-section-title">最新留言</h2>

${recentMessages.length === 0 ? "<p style=\"color:#888;\">尚無留言</p>" : `
<div style="border:1px solid #eee;border-radius:8px;overflow:hidden;max-width:640px;">
    ${recentMessages.map(message => `
        <a href="/cms/messages" style="display:block;padding:12px 16px;border-bottom:1px solid #f0f0f0;text-decoration:none;color:inherit;${message.read ? "" : "font-weight:600;background:#f7fbff;"}">
            <div style="display:flex;justify-content:space-between;gap:12px;">
                <span>${escapeHtml(message.name)}${message.subject ? ` — ${escapeHtml(message.subject)}` : ""}</span>
                ${message.read ? "" : "<span style=\"font-size:12px;color:#2271b1;\">未讀</span>"}
            </div>
        </a>
    `).join("")}
</div>
`}

<h2 class="dashboard-section-title">快捷連結</h2>

<div class="quick-links">

    ${quickLinks.length === 0 ? "<p style=\"color:#888;\">尚未選擇任何快捷連結</p>" : quickLinks.map(item => `<a href="${item.href}" class="quick-link">${item.label}</a>`).join("")}

</div>

<br>

<details style="margin:12px 0;border:1px solid #ddd;border-radius:8px;padding:10px 14px;max-width:480px;">

    <summary style="cursor:pointer;font-weight:bold;">管理快捷連結（勾選要顯示哪幾個）</summary>

    <form method="POST" action="/cms/quick-links" style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">

        ${QUICK_LINK_CATALOG.filter(item => !item.superadminOnly || isSuperadmin).map(item => `
            <label style="display:flex;align-items:center;gap:8px;">
                <input type="checkbox" name="quickLinks" value="${item.key}" ${selectedKeys.includes(item.key) ? "checked" : ""}>
                ${item.label}
            </label>
        `).join("")}

        <button type="submit" style="margin-top:8px;align-self:flex-start;">儲存</button>

    </form>

</details>

`,

user

);
