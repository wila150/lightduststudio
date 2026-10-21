// Dashboard「快捷連結」的可選清單，業者在後台勾選要顯示哪幾個（存在 settings.dashboardQuickLinks）
// newProjectItem 連結需要知道「作品集」自訂頁面的實際 id，href 留空，由 controller 動態補上
const QUICK_LINK_CATALOG = [
    { key: "newProjectItem", label: "＋ 新增作品" },
    { key: "newCustomPage", label: "＋ 新增自訂頁面", href: "/cms/custom-pages/new" },
    { key: "homePage", label: "📄 首頁管理", href: "/cms/pages" },
    { key: "media", label: "🖼 媒體庫", href: "/cms/media" },
    { key: "messages", label: "💬 留言", href: "/cms/messages" },
    { key: "bookings", label: "🗓️ 預約管理", href: "/cms/bookings" },
    { key: "bookingServices", label: "🛎️ 服務項目", href: "/cms/booking-services" },
    { key: "staff", label: "🧑‍💼 預約人員", href: "/cms/staff" },
    { key: "bookingSettings", label: "⏰ 預約設定", href: "/cms/booking-settings" },
    { key: "navItems", label: "🧭 導覽列管理", href: "/cms/nav-items" },
    { key: "settings", label: "⚙️ 網站設定", href: "/cms/settings" },
    { key: "admins", label: "👥 帳號管理", href: "/cms/admins", superadminOnly: true }
];

const DEFAULT_QUICK_LINKS = ["newProjectItem", "newCustomPage", "settings"];

module.exports = { QUICK_LINK_CATALOG, DEFAULT_QUICK_LINKS };
