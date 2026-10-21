// 固定導覽項目清單，自訂頁面可以選擇掛在其中一個底下當作下拉選單的子項目
// （不選就沿用原本的行為，統一歸類到導覽列最後的「更多」）
module.exports = {
    NAV_ITEMS: [
        { key: "about", label: "關於藍點", href: "/about" },
        { key: "projects", label: "作品集", href: "/projects" },
        { key: "blog", label: "文章", href: "/blog" },
        { key: "contact", label: "聯絡我", href: "/contact" },
        { key: "booking", label: "線上預約", href: "/booking" }
    ]
};
