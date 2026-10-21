const featureService = require("../../services/featureService");
const { ASSET_VERSION } = require("../../config/version");

module.exports = (title, content, user) => `
<!DOCTYPE html>
<html lang="zh-TW">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${title}</title>

    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Cormorant+Garamond:wght@600&display=swap">

    <link rel="stylesheet" href="/css/cms.css?v=${ASSET_VERSION}">

    <script src="/js/mediaPicker.js?v=${ASSET_VERSION}"></script>
    <script src="/js/folderUpload.js?v=${ASSET_VERSION}"></script>
    <script src="/js/trashPanel.js?v=${ASSET_VERSION}" defer></script>
    <script src="/js/cmsLive.js?v=${ASSET_VERSION}" defer></script>
    <script src="/js/cms.js?v=${ASSET_VERSION}"></script>

</head>

<body>

<div class="cms">

    <header class="admin-header">

        <div class="brand">LightDust <span>CMS</span></div>

        <nav class="admin-nav">

            <a href="/cms">Dashboard</a>

            <div class="nav-dropdown" tabindex="0">
                <span>內容管理</span>
                <div class="nav-dropdown-menu">
                    <a href="/cms/pages">首頁管理</a>
                    <a href="/cms/custom-pages">自訂頁面</a>
                    <a href="/cms/media">媒體庫</a>
                </div>
            </div>

            <a href="/cms/messages">留言<span id="unread-badge" class="nav-badge" hidden></span></a>

            <a href="/cms/analytics">即時統計</a>

            ${featureService.enabled("booking") ? `<div class="nav-dropdown" tabindex="0">
                <span>線上預約</span>
                <div class="nav-dropdown-menu">
                    <a href="/cms/bookings">預約管理</a>
                    <a href="/cms/booking-services">服務項目</a>
                    <a href="/cms/staff">預約人員</a>
                    <a href="/cms/booking-settings">預約設定</a>
                </div>
            </div>` : ""}

            <div class="nav-dropdown" tabindex="0">
                <span>系統</span>
                <div class="nav-dropdown-menu">
                    <a href="/cms/nav-items">導覽列管理</a>
                    <a href="/cms/settings">網站設定</a>
                    ${user && user.role === "superadmin" ? `<a href="/cms/admins">帳號管理</a>` : ""}
                    <a href="/cms/change-password">修改密碼</a>
                </div>
            </div>

            <a href="/cms/help">使用說明</a>

        </nav>

        <div class="admin-header-actions">
            <span class="admin-user">${user ? user.name : ""}</span>
            <a href="/" target="_blank" rel="noopener" class="ghost-btn">查看網站</a>
            <a href="/cms/logout" class="ghost-btn">登出</a>
        </div>

    </header>

    <main class="content">

        ${content}

    </main>

</div>

<script>
(function () {

    var path = window.location.pathname;
    var links = document.querySelectorAll(".admin-nav a");
    var bestMatch = null;

    links.forEach(function (link) {

        var href = link.getAttribute("href");

        if (href === "/cms") {
            if (path === "/cms" || path === "/cms/") {
                bestMatch = link;
            }
            return;
        }

        if (path === href || path.indexOf(href + "/") === 0) {
            if (!bestMatch || href.length > bestMatch.getAttribute("href").length) {
                bestMatch = link;
            }
        }

    });

    if (bestMatch) {
        bestMatch.classList.add("active");

        var parentDropdown = bestMatch.closest(".nav-dropdown");
        if (parentDropdown) {
            parentDropdown.querySelector("span").classList.add("active");
        }
    }

})();
</script>

</body>

</html>
`;
