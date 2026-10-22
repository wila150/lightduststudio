const { tenantCollection } = require("../config/firebase");

const DEFAULTS = {
    siteName: "我的作品集",
    footerText: `© ${new Date().getFullYear()} 我的作品集`,
    footerBackground: "none",
    metaDescription: "",
    metaKeywords: [],
    theme: "dark-artistic",
    projectListLayout: "grid",
    // 自訂字體庫：留空代表沿用網站樣板本身的預設字體，見 services/fontService.js 跟 views/layout.js 的套用邏輯
    headingFontId: "",
    bodyFontId: "",
    logoUrl: "",
    // Logo 旁的品牌字（大字＋小字），空白就只顯示 Logo 圖
    brandTextMain: "",
    brandTextSub: "",
    logoPath: "",
    logoHeight: 40,
    headerPaddingY: 24,
    showHomeCarousel: false,
    showFeaturedSidebar: false,
    // 手動精選作品：作品輪播、精選作品側邊選單都共用這份 id 清單（依清單順序顯示）；空陣列時兩邊都退回「最新發布前 6 筆」的舊行為
    featuredProjectIds: [],
    faviconUrl: "",
    faviconPath: "",
    ogImageUrl: "",
    ogImagePath: "",
    googleAnalyticsId: "",
    googleSiteVerification: "",
    lineChannelAccessToken: "",
    lineChannelSecret: "",
    // 收到新留言時要推播通知的 LINE User ID 清單（不是廣播給所有加好友的人——LINE 好友按鈕上線後，
    // 一般訪客也可能加官方帳號為好友，廣播的話每個人都會收到店家自己的留言通知，不是我們要的效果）
    lineNotifyUserIds: [],
    lineFriendUrl: "",
    socialFacebookUrl: "",
    socialInstagramUrl: "",
    socialYoutubeUrl: "",
    contactPhone: "",
    contactEmail: "",
    contactAddress: "",
    contactHours: "",
    cookieConsentEnabled: false,
    cookieConsentText: "",
    // Google reCAPTCHA v2（「我不是機器人」勾選方塊），兩個都留空時聯絡表單維持原本的蜜罐防護，不顯示這個小工具
    recaptchaSiteKey: "",
    recaptchaSecretKey: "",
    customColorBg: "#f4f1ec",
    customColorBgAlt: "#e8e2d6",
    customColorPanel: "#fbfaf7",
    customColorBorder: "#d8cdb8",
    customColorText: "#33302a",
    customColorMuted: "#8d8477",
    customColorAccent: "#5b7a99",
    customColorAccent2: "#7f9db3",
    customColorDanger: "#b5533f",
    customColorHeaderBg: "#f4f1ec",
    // 自訂配色範本：把當下調好的 10 個顏色存成一筆 {id, name, colors}，之後可以直接套用回來或切換其他組合
    colorPresets: [],
    // 功能開關（見 services/featureService.js），預設全部關閉
    features: { booking: false, line: false, sponsorMarquee: false, blog: false }
};

// 可選樣板清單，CMS 的樣板選擇器跟這份清單走，值要跟 public/css/style.css 的 [data-theme="..."] 對上
const THEMES = [
    { value: "dark-artistic", label: "深色藝術感", description: "深藍黑底、藍色點綴，大字重標題，適合強烈品牌氛圍" },
    { value: "light-minimal", label: "淺色極簡專業", description: "白底留白、深灰文字，內容為主角，適合簡潔專業形象" },
    { value: "warm-luxury", label: "溫暖質感", description: "米杏底色、莫蘭迪暖棕點綴，適合低調奢華、溫潤質感" },
    { value: "bluedot", label: "藍點漸層", description: "白底讓作品當主角，搭配冷灰藍到暖沙棕的漸層色系點綴導覽列、按鈕與分隔線" },
    { value: "custom", label: "自訂配色", description: "自行調整每個顏色，套用您自己的品牌色" }
];

// 作品集列表頁排版：值要跟 public/css/style.css 的 .works-grid[data-layout="..."] 對上
const PROJECT_LIST_LAYOUTS = [
    { value: "grid", label: "方格", description: "固定比例的方形卡片格線，整齊一致" },
    { value: "masonry", label: "Masonry 石版", description: "依照圖片原始比例排列，高低錯落更豐富" }
];

// 作品分類，用於作品新增/編輯表單的下拉選單，以及前台作品集列表的篩選標籤
const PROJECT_CATEGORIES = [
    { value: "corporate", label: "企業形象" },
    { value: "portrait", label: "人像" },
    { value: "food", label: "美食" },
    { value: "space", label: "空間" },
    { value: "event", label: "活動" },
    { value: "product", label: "商品" },
    { value: "video", label: "影片" }
];

class SettingsService {

    docRef(tenantId) {
        return tenantCollection(tenantId, "settings").doc("site");
    }

    async get(tenantId) {

        try {

            const doc = await this.docRef(tenantId).get();

            if (!doc.exists) {
                return { ...DEFAULTS };
            }

            return { ...DEFAULTS, ...doc.data() };

        } catch (error) {

            console.error(error);

            return { ...DEFAULTS };

        }

    }

    async update(tenantId, data) {

        try {

            await this.docRef(tenantId).set(data, { merge: true });

            return true;

        } catch (error) {

            console.error(error);

            return false;

        }

    }

    // 把傳入的 10 個自訂配色欄位存成一筆新範本，不影響目前正在套用的顏色
    async savePreset(tenantId, name, colors) {

        const settings = await this.get(tenantId);

        const preset = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: name || "未命名範本",
            colors
        };

        const colorPresets = [...(settings.colorPresets || []), preset];

        await this.update(tenantId, { colorPresets });

        return preset;

    }

    // 把某個範本存的顏色套回目前的自訂配色欄位，並直接切成「自訂配色」樣板
    async applyPreset(tenantId, presetId) {

        const settings = await this.get(tenantId);
        const preset = (settings.colorPresets || []).find(p => p.id === presetId);

        if (!preset) {
            return false;
        }

        await this.update(tenantId, { theme: "custom", ...preset.colors });

        return true;

    }

    async deletePreset(tenantId, presetId) {

        const settings = await this.get(tenantId);
        const colorPresets = (settings.colorPresets || []).filter(p => p.id !== presetId);

        await this.update(tenantId, { colorPresets });

        return true;

    }

}

module.exports = new SettingsService();
module.exports.THEMES = THEMES;
module.exports.PROJECT_LIST_LAYOUTS = PROJECT_LIST_LAYOUTS;
module.exports.PROJECT_CATEGORIES = PROJECT_CATEGORIES;
