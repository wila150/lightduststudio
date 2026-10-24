const layout = require("./layout");
const { ASSET_VERSION } = require("../../config/version");

// 留言收件匣（2026/10/03 改版，類似 Gmail）：資料一次帶進頁面（JSON），篩選／搜尋／勾選都在瀏覽器裡做，
// 已讀、未讀、星號、刪除走 /cms/messages/bulk，全部已讀走 /cms/messages/read-all（public/js/inbox.js）
// LINE 轉進來的留言名字長這樣「LINE - 峻宏（Ub56f…）」，拆成來源＝LINE、顯示名稱＝峻宏
const mailService = require("../../services/mailService");

function toInboxRow(message, emailReady) {
    const lineMatch = String(message.name || "").match(/^LINE\s*-\s*(.*?)(?:（[^）]*）)?$/);
    const createdAt = message.createdAt && message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt || 0);
    return {
        id: message.id,
        source: lineMatch ? "line" : "web",
        lineUserId: ((String(message.name || "").match(/（(U[0-9a-f]{32})）/) || [])[1]) || "",
        canLineReply: /（U[0-9a-f]{32}）/.test(message.name || ""),
        replies: Array.isArray(message.replies) ? message.replies : [],
        canEmailReply: emailReady && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email || ""),
        name: lineMatch ? (lineMatch[1] || "LINE 使用者") : (message.name || "（未留名字）"),
        email: message.email || "",
        subject: message.subject || "",
        message: message.message || "",
        read: !!message.read,
        starred: !!message.starred,
        createdAt: createdAt.toISOString()
    };
}

module.exports = (messages) => layout(
    "留言",
    `
<div class="inbox">

    <div class="inbox-head">
        <h1>留言</h1>
        <div class="inbox-search"><input type="search" id="inbox-search" placeholder="搜尋姓名、Email、內容" autocomplete="off"></div>
        <a href="/cms/messages/export.csv" class="inbox-export">匯出 CSV</a>
    </div>

    <nav class="inbox-tabs" id="inbox-tabs">
        <button type="button" data-filter="all" class="active">收件匣 <span data-count="all"></span></button>
        <button type="button" data-filter="unread">未讀 <span data-count="unread"></span></button>
        <button type="button" data-filter="starred">★ 已加星號 <span data-count="starred"></span></button>
        <button type="button" data-filter="web">網站表單 <span data-count="web"></span></button>
        <button type="button" data-filter="line">LINE <span data-count="line"></span></button>
    </nav>

    <div class="inbox-toolbar">
        <label class="inbox-check-all" title="全選"><input type="checkbox" id="inbox-check-all"></label>
        <select id="inbox-select" aria-label="選取">
            <option value="">選取…</option>
            <option value="all">全部</option>
            <option value="none">都不選</option>
            <option value="read">已讀</option>
            <option value="unread">未讀</option>
            <option value="starred">已加星號</option>
        </select>
        <span class="inbox-bulk" id="inbox-bulk" hidden>
            <button type="button" data-action="read">標為已讀</button>
            <button type="button" data-action="unread">標為未讀</button>
            <button type="button" data-action="star">加星號</button>
            <button type="button" data-action="unstar">移除星號</button>
            <button type="button" data-action="delete" class="danger">刪除</button>
            <span id="inbox-selected"></span>
        </span>
        <button type="button" id="inbox-read-all" class="inbox-read-all">✓ 全部標為已讀</button>
    </div>

    <div class="inbox-new" id="inbox-new" hidden>有新留言，已加在最上面</div>

    <ul class="inbox-list" id="inbox-list"></ul>
    <p class="inbox-empty" id="inbox-empty" hidden>沒有符合的留言</p>
    <div class="inbox-more" id="inbox-more" hidden><button type="button">顯示更多</button></div>

    <div class="trash-panel" data-collections="messages"></div>

</div>

<script type="application/json" id="inbox-data">${JSON.stringify(messages.map(m => toInboxRow(m, mailService.configured()))).replace(/</g, "\\u003c")}</script>
<script src="/js/inbox.js?v=${ASSET_VERSION}"></script>
`
);
