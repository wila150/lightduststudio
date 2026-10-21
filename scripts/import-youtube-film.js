/**
 * 把藍點 YouTube 頻道／播放清單上的影片匯入 FILM（動態攝影）頁面，
 * 已經存在的影片（連結欄的影片 ID 相同）不會重複新增，只會把分類調整成這份清單上的分類。
 *
 * 使用方法：node scripts/import-youtube-film.js [--dry-run]
 */

require("dotenv").config();

const { tenantCollection } = require("../config/firebase");
const { DEFAULT_TENANT_ID } = require("../config/tenant");

const FILM_SLUG = "film";
const DRY_RUN = process.argv.includes("--dry-run");

// [YouTube ID, 標題, 分類名稱, slug, SEO 描述, 上傳日期]
// 清單由頻道新到舊排列，匯入後也照這個順序排在現有作品後面
const VIDEOS = [
    ["6vEuW6_jLVM", "2026 慈明高中洛登社 x 幹部訓練【活動紀錄片Documentary】", "品牌活動紀錄", "2026-cihming-luodeng-cadre-training-documentary", "藍點影像工作室拍攝 2026 慈明高中洛登社幹部訓練活動紀錄片，完整記錄社團幹部培訓課程與團隊互動。", "2026-09-27"],
    ["5Em6iShO4uc", "2026 慈明高中洛登社「翻滾吧青春」夏令營【快播快剪SDE】", "SDE 快播快剪", "2026-cihming-luodeng-summer-camp-sde", "藍點影像工作室 2026 慈明高中洛登社「翻滾吧青春」夏令營快播快剪 SDE，活動當天拍攝剪輯、現場即時播放。", "2026-09-27"],
    ["gt2zBoeAhoI", "2026 慈明高中洛登社 幹部訓練【快播快剪SDE】", "SDE 快播快剪", "2026-cihming-luodeng-cadre-training-sde", "藍點影像工作室 2026 慈明高中洛登社幹部訓練快播快剪 SDE，活動當天拍攝剪輯、閉幕即時播放。", "2026-09-27"],
    ["nwyYmJFdCH4", "2026 慈明高中洛登社夏令營 - 翻滾吧！青春！【宣傳片Promotional Video】", "形象影片", "2026-cihming-luodeng-summer-camp-promo", "藍點影像工作室製作 2026 慈明高中洛登社「翻滾吧！青春！」夏令營宣傳片，招生宣傳形象影片拍攝與剪輯。", "2026-09-27"],
    ["N6UFi3-SWTE", "醒吾科技大學 表演藝術系 音樂劇體驗營【活動紀錄片Documentary】", "品牌活動紀錄", "hwu-performing-arts-musical-camp-documentary", "藍點影像工作室拍攝醒吾科技大學表演藝術系音樂劇體驗營活動紀錄片，記錄學員課程與成果呈現。", "2026-08-21"],
    ["yacoVOS3Pzo", "全國菁英盃競技疊杯錦標賽 / 2025 ISSF 競技疊杯亞洲錦標賽【活動紀錄片Documentary】Part 1", "品牌活動紀錄", "2025-issf-sport-stacking-asian-championship-documentary-1", "藍點影像工作室拍攝全國菁英盃競技疊杯錦標賽暨 2025 ISSF 競技疊杯亞洲錦標賽活動紀錄片 Part 1。", "2026-08-21"],
    ["r6cDuYqrIIQ", "全國菁英盃競技疊杯錦標賽 / 2025 ISSF 競技疊杯亞洲錦標賽【活動紀錄片Documentary】Part 2", "品牌活動紀錄", "2025-issf-sport-stacking-asian-championship-documentary-2", "藍點影像工作室拍攝全國菁英盃競技疊杯錦標賽暨 2025 ISSF 競技疊杯亞洲錦標賽活動紀錄片 Part 2。", "2026-08-21"],
    ["XEH6NH6xU9w", "全國菁英盃競技疊杯錦標賽 / 2025 ISSF 競技疊杯亞洲錦標賽【活動紀錄片Documentary】Part 3", "品牌活動紀錄", "2025-issf-sport-stacking-asian-championship-documentary-3", "藍點影像工作室拍攝全國菁英盃競技疊杯錦標賽暨 2025 ISSF 競技疊杯亞洲錦標賽活動紀錄片 Part 3。", "2026-08-21"],
    ["lhDT_KXoxpI", "全國菁英盃競技疊杯錦標賽 / 2025 ISSF 競技疊杯亞洲錦標賽【活動紀錄片Documentary】Part 4", "品牌活動紀錄", "2025-issf-sport-stacking-asian-championship-documentary-4", "藍點影像工作室拍攝全國菁英盃競技疊杯錦標賽暨 2025 ISSF 競技疊杯亞洲錦標賽活動紀錄片 Part 4。", "2026-08-21"],
    ["bPLRqDbgBr8", "醒吾科技大學表演藝術系 音樂劇 - 天天想你【演出紀錄片Concert Film】", "劇場/舞台紀錄", "hwu-performing-arts-musical-miss-you-every-day", "藍點影像工作室拍攝醒吾科技大學表演藝術系音樂劇《天天想你》演出紀錄片，劇場舞台多機位錄影剪輯。", "2026-08-21"],
    ["ohwvL4wpA5w", "2025臺北藝穗節 X 伊底帕斯的眼科醫生劇團 演出紀錄【演出紀錄片Concert Film】", "劇場/舞台紀錄", "2025-taipei-fringe-oedipus-ophthalmologist-concert-film", "藍點影像工作室拍攝 2025 臺北藝穗節伊底帕斯的眼科醫生劇團演出紀錄片，劇場舞台演出錄影與剪輯。", "2026-08-21"],
    ["un8r82S4y0E", "性別公布派對【活動紀錄片Documentary】", "婚禮/抓周/性別派對", "gender-reveal-party-documentary", "藍點影像工作室拍攝性別公布派對活動紀錄片，記錄揭曉寶寶性別的驚喜時刻與親友祝福。", "2026-08-21"],
    ["slK3CMJ-ZdY", "麋鹿集團尾牙【活動紀錄片Documentary】", "品牌活動紀錄", "milu-group-year-end-party-documentary", "藍點影像工作室拍攝麋鹿集團尾牙活動紀錄片，企業尾牙春酒活動錄影與剪輯。", "2026-08-21"],
    ["kg5WROhjems", "廣藝基金會 廣藝廳 X 醒吾科技大學表演藝術系 音樂劇-幼稚園教父 精華短片【演出紀錄片Concert Film】", "劇場/舞台紀錄", "kindergarten-godfather-musical-highlights", "藍點影像工作室拍攝廣藝廳 X 醒吾科技大學表演藝術系音樂劇《幼稚園教父》演出精華短片。", "2026-01-22"],
    ["MBTPpHHBZus", "2025 慈明高中洛登社 x 幹部訓練【活動紀錄片Documentary】", "品牌活動紀錄", "2025-cihming-luodeng-cadre-training-documentary", "藍點影像工作室拍攝 2025 慈明高中洛登社幹部訓練活動紀錄片，完整記錄社團幹部培訓課程與團隊互動。", "2026-01-02"],
    ["1c2fXuP1pRs", "2025 慈明高中洛登社夏令營 - 「翻滾吧！青春！」【活動紀錄片Documentary】", "品牌活動紀錄", "2025-cihming-luodeng-summer-camp-documentary", "藍點影像工作室拍攝 2025 慈明高中洛登社「翻滾吧！青春！」夏令營活動紀錄片。", "2026-01-02"],
    ["zwYcZk0LXfE", "2025 慈明高中洛登社「翻滾吧青春」夏令營【快播快剪SDE】", "SDE 快播快剪", "2025-cihming-luodeng-summer-camp-sde", "藍點影像工作室 2025 慈明高中洛登社「翻滾吧青春」夏令營快播快剪 SDE，活動當天拍攝剪輯、現場即時播放。", "2026-01-02"],
    ["jtQ5Zb2Enh4", "2025臺北藝穗節 x 微光製作 - 主人！陪我玩！嗎？ 舞台劇【演出紀錄片Concert Film】", "劇場/舞台紀錄", "2025-taipei-fringe-weiguang-play-with-me-concert-film", "藍點影像工作室拍攝 2025 臺北藝穗節微光製作舞台劇《主人！陪我玩！嗎？》演出紀錄片。", "2026-01-02"],
    // 以下是頻道的 Shorts（直式短影音）
    ["NqmETkfyk40", "醒吾科技大學 表演藝術系 舞蹈呈現紀錄短片", "品牌活動紀錄", "hwu-performing-arts-dance-showcase-short", "藍點影像工作室製作醒吾科技大學表演藝術系舞蹈呈現紀錄短影音，直式 Reels／Shorts 拍攝剪輯。", "2026-09-27"],
    ["tb6pee66HHU", "麋鹿集團 端午送愛心短片", "品牌活動紀錄", "milu-group-dragon-boat-charity-short", "藍點影像工作室製作麋鹿集團端午送愛心公益活動短影音，直式 Reels／Shorts 拍攝剪輯。", "2026-09-27"],
    ["STh4PZsz2oM", "星廚之戰 x 三立電視台 十時塑 宣傳短片【短影音short video】", "美食攝影", "star-chef-battle-sanlih-promo-short", "藍點影像工作室製作星廚之戰 x 三立電視台十時塑宣傳短影音，直式 Reels／Shorts 拍攝剪輯。", "2026-09-27"],
    ["pIUSfWuuUS0", "抓周派對紀錄 Reels", "婚禮/抓周/性別派對", "first-birthday-zhuazhou-party-reels", "藍點影像工作室製作抓周派對紀錄 Reels 短影音，記錄寶寶週歲抓周的可愛瞬間。", "2026-08-21"],
    ["YL49yEBwiIc", "三立一家人洗髮精 X 桃園珍珠港音樂季【活動紀錄片Documentary】", "品牌活動紀錄", "sanlih-shampoo-taoyuan-pearl-harbor-music-festival-short", "藍點影像工作室製作三立一家人洗髮精 X 桃園珍珠港音樂季品牌活動短影音，直式 Reels／Shorts 拍攝剪輯。", "2026-08-21"],
    // ===== 以下是播放清單裡的不公開影片（2026/10/01 提供的五個播放清單） =====
    // 品牌短片
    ["lNzdKLpK3oQ", "寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名 宣傳短片【短影音short video】", "形象影片", "formosa-gods-sanlih-kuaikuai-qingshan-temple-promo", "藍點影像工作室製作寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名商品宣傳短片，品牌形象影片拍攝剪輯。", "2026-01-02"],
    ["W5-g9nKhlRw", "寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名御守 宣傳短片【短影音short video】", "形象影片", "formosa-gods-sanlih-kuaikuai-qingshan-temple-amulet-promo", "藍點影像工作室製作寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名御守宣傳短片，品牌形象影片拍攝剪輯。", "2026-01-02"],
    ["ZNHuW6eXHgQ", "寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名提袋 宣傳短片【短影音short video】", "形象影片", "formosa-gods-sanlih-kuaikuai-qingshan-temple-tote-promo", "藍點影像工作室製作寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名提袋宣傳短片，品牌形象影片拍攝剪輯。", "2026-01-02"],
    // 活動紀錄片
    ["BQZQ4RHiVI8", "蘭斯洛特補習班 英文說故事競賽 活動紀錄片Documentary", "品牌活動紀錄", "lancelot-english-storytelling-contest-documentary", "藍點影像工作室拍攝蘭斯洛特補習班英文說故事競賽活動紀錄片，記錄學生上台表現與頒獎時刻。", "2025-07-25"],
    ["snIXa8rvHYw", "ADATA VIP PARTY 活動紀錄片Documentary", "品牌活動紀錄", "adata-vip-party-documentary", "藍點影像工作室拍攝 ADATA 威剛 VIP PARTY 品牌活動紀錄片，企業貴賓活動錄影與剪輯。", "2025-07-25"],
    // 短影音
    ["uhaw-8HbSNo", "貓王MeowKing - 貓和龍貓互動【短影音short video】", "短影音／Reels", "meowking-cat-and-chinchilla", "藍點影像工作室為貓王MeowKing製作的短影音「貓和龍貓互動」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["uH9E-2l40BQ", "貓王MeowKing - 當我重生成一隻貓【短影音short video】", "短影音／Reels", "meowking-reborn-as-a-cat", "藍點影像工作室為貓王MeowKing製作的短影音「當我重生成一隻貓」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["OBKI4isHA6c", "貓王MeowKing - 當我重生成一隻貓2【短影音short video】", "短影音／Reels", "meowking-reborn-as-a-cat-2", "藍點影像工作室為貓王MeowKing製作的短影音「當我重生成一隻貓2」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["f-bINWV02JE", "貓王MeowKing - 幫我顧一下猫【短影音short video】", "短影音／Reels", "meowking-watch-my-cat", "藍點影像工作室為貓王MeowKing製作的短影音「幫我顧一下猫」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["WYRkvXUHIbw", "貓王MeowKing - 被貓咪包圍吃飯【短影音short video】", "短影音／Reels", "meowking-dining-with-cats", "藍點影像工作室為貓王MeowKing製作的短影音「被貓咪包圍吃飯」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["GRpoN88RxfM", "貓王MeowKing - 受歡迎的人不分物種【短影音short video】", "短影音／Reels", "meowking-popular-with-every-species", "藍點影像工作室為貓王MeowKing製作的短影音「受歡迎的人不分物種」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["lt98IEC59Cc", "貓王MeowKing - 探店【短影音short video】", "短影音／Reels", "meowking-shop-visit", "藍點影像工作室為貓王MeowKing製作的短影音「探店」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["nELstu-gJGM", "貓王MeowKing - 龍貓教會我的三件事【短影音short video】", "短影音／Reels", "meowking-three-things-chinchillas-taught-me", "藍點影像工作室為貓王MeowKing製作的短影音「龍貓教會我的三件事」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["5nZKKm7x4x0", "正義德州撲克 - 天下武功 唯堅不催【短影音short video】", "短影音／Reels", "justice-texas-holdem-unbreakable", "藍點影像工作室為正義德州撲克製作的短影音「天下武功 唯堅不催」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["fC_hzAa9YME", "正義德州撲克 - 這是拿到NUTS的你嗎【短影音short video】", "短影音／Reels", "justice-texas-holdem-holding-the-nuts", "藍點影像工作室為正義德州撲克製作的短影音「這是拿到NUTS的你嗎」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["Zbe7rAmmCfA", "正義德州撲克 - 彩金手牌【短影音short video】", "短影音／Reels", "justice-texas-holdem-jackpot-hand", "藍點影像工作室為正義德州撲克製作的短影音「彩金手牌」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["-7r9VIlS0Qs", "正義德州撲克 - POV 當你在BLUFF【短影音short video】", "短影音／Reels", "justice-texas-holdem-pov-bluff", "藍點影像工作室為正義德州撲克製作的短影音「POV 當你在BLUFF」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["KE2vu92U24o", "正義德州撲克 - 德州撲克是體育競技【短影音short video】", "短影音／Reels", "justice-texas-holdem-is-a-sport", "藍點影像工作室為正義德州撲克製作的短影音「德州撲克是體育競技」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["Ql1Kb6MhPkw", "正義德州撲克 - 變魔術【短影音short video】", "短影音／Reels", "justice-texas-holdem-magic-trick", "藍點影像工作室為正義德州撲克製作的短影音「變魔術」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["F6IojdXB8JU", "正義德州撲克 - 進錢圈的你【短影音short video】", "短影音／Reels", "justice-texas-holdem-in-the-money", "藍點影像工作室為正義德州撲克製作的短影音「進錢圈的你」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["z-ECBRe2ZVk", "正義德州撲克 - 屏東撿錢熱點【短影音short video】", "短影音／Reels", "justice-texas-holdem-pingtung-hotspot", "藍點影像工作室為正義德州撲克製作的短影音「屏東撿錢熱點」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["UUd7LFORzUs", "正義德州撲克 - 阿偉自我介紹【短影音short video】", "短影音／Reels", "justice-texas-holdem-awei-introduction", "藍點影像工作室為正義德州撲克製作的短影音「阿偉自我介紹」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["85RLgWt4DC8", "正義德州撲克 - 男生最吸引女生的三種興趣【短影音short video】", "短影音／Reels", "justice-texas-holdem-three-attractive-hobbies", "藍點影像工作室為正義德州撲克製作的短影音「男生最吸引女生的三種興趣」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["ZZwXV76Zfq0", "北極先生 - 隨機發肉泥給飼主體驗2【短影音short video】", "短影音／Reels", "mr-arctic-free-pet-treats-2", "藍點影像工作室為北極先生製作的短影音「隨機發肉泥給飼主體驗2」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["0bZql9H3MgE", "北極先生 - 隨機發肉泥給飼主體驗【短影音short video】", "短影音／Reels", "mr-arctic-free-pet-treats", "藍點影像工作室為北極先生製作的短影音「隨機發肉泥給飼主體驗」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["f0hQ-NJvt0A", "北極先生 - 養寵物注意三件事省下數萬元【短影音short video】", "短影音／Reels", "mr-arctic-three-pet-care-tips", "藍點影像工作室為北極先生製作的短影音「養寵物注意三件事省下數萬元」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["QV0hRk5BdYM", "北極先生 - 狗搖尾巴的三種表現【短影音short video】", "短影音／Reels", "mr-arctic-three-dog-tail-wags", "藍點影像工作室為北極先生製作的短影音「狗搖尾巴的三種表現」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["cbsGWzmNzwQ", "日本美甲檢定遊學團 - 純剪輯【短影音short video】", "短影音／Reels", "japan-nail-certification-study-tour", "藍點影像工作室為日本美甲檢定遊學團製作的短影音「純剪輯」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"],
    ["UjSg52yuHrQ", "RUKU潛水 - 畢業優惠【短影音short video】", "短影音／Reels", "ruku-diving-graduation-offer", "藍點影像工作室為RUKU潛水製作的短影音「畢業優惠」，直式 Reels／Shorts 企劃、拍攝與剪輯。", "2025-07-25"]
];

function youtubeId(url) {
    const match = (url || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    return match ? match[1] : null;
}

(async () => {

    const pages = await tenantCollection(DEFAULT_TENANT_ID, "customPages").where("slug", "==", FILM_SLUG).get();

    if (pages.empty) {
        console.error(`❌ 找不到 slug 為 ${FILM_SLUG} 的頁面`);
        process.exit(1);
    }

    const pageId = pages.docs[0].id;

    const categories = (await tenantCollection(DEFAULT_TENANT_ID, "pageCategories").where("pageId", "==", pageId).get())
        .docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const items = (await tenantCollection(DEFAULT_TENANT_ID, "pageItems").where("pageId", "==", pageId).get())
        .docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const existingById = new Map(items.map(item => [youtubeId(item.link), item]).filter(([id]) => id));
    const existingSlugs = new Set(items.map(item => item.slug));

    // 新影片排在現有作品後面（sortOrder 越大越前面）
    let sortOrder = Math.min(0, ...items.map(item => typeof item.sortOrder === "number" ? item.sortOrder : 0));

    let added = 0;

    for (const [id, title, categoryLabel, slug, metaDescription, uploadDate] of VIDEOS) {

        const category = categories.find(cat => cat.label === categoryLabel);

        if (!category) {
            console.error(`❌ 找不到分類「${categoryLabel}」，跳過：${title}`);
            continue;
        }

        // 已經上架的影片不重複新增，只把分類調整成清單上的分類
        const existing = existingById.get(id);

        if (existing) {
            if (existing.category !== category.id) {
                if (!DRY_RUN) {
                    await tenantCollection(DEFAULT_TENANT_ID, "pageItems").doc(existing.id).update({ category: category.id, updatedAt: new Date() });
                }
                console.log(`🔁 ${DRY_RUN ? "（試跑）" : ""}改分類 → ${categoryLabel}｜${existing.title}`);
            }
            continue;
        }

        if (existingSlugs.has(slug)) {
            console.error(`❌ slug 重複，跳過：${slug}`);
            continue;
        }

        sortOrder -= 1;

        const now = new Date();
        const item = {
            pageId,
            slug,
            title,
            description: "",
            metaDescription,
            author: "",
            link: `https://www.youtube.com/watch?v=${id}`,
            category: category.id,
            published: true,
            publishAt: null,
            galleryLayout: "grid",
            coverPosition: "center center",
            images: [],
            coverImage: null,
            modules: [],
            sortOrder,
            createdAt: new Date(`${uploadDate}T12:00:00+08:00`),
            updatedAt: now
        };

        if (!DRY_RUN) {
            await tenantCollection(DEFAULT_TENANT_ID, "pageItems").add(item);
        }

        existingSlugs.add(slug);
        added++;
        console.log(`✅ ${DRY_RUN ? "（試跑）" : ""}${categoryLabel}｜${title}`);

    }

    console.log(`\n完成，新增 ${added} 支影片`);
    process.exit(0);

})();
