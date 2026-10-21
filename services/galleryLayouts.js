// 單一作品相簿可選的排版模式清單，值要跟 views/projectDetail.js 的渲染邏輯、public/css/style.css 的選擇器對上
const GALLERY_LAYOUTS = [
    { value: "grid", label: "方格", description: "固定比例的方形卡片格線，整齊一致" },
    { value: "masonry", label: "Masonry 石版", description: "依照圖片原始比例排列，高低錯落更豐富" },
    { value: "carousel", label: "輪播", description: "全螢幕大圖依序輪播，自動播放並可手動切換" },
    { value: "accordion", label: "手風琴", description: "平常窄長條排列，滑鼠移過去展開變寬，適合少量精選照片" },
    { value: "bento", label: "拼貼", description: "不同尺寸圖片組成不規則拼貼版面，較有設計感" },
    { value: "scroll", label: "水平捲動", description: "圖片排成一整排，左右滑動瀏覽，適合手機瀏覽" }
];

module.exports = { GALLERY_LAYOUTS };
