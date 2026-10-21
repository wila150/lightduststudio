// 作品描述補齊（2026/10/03 GEO）：AI 搜尋讀不懂照片，作品頁需要文字才會被理解、引用
// 只填空白欄位，已經寫過的不覆蓋：
// - metaDescription（SEO 描述）：依分類套範本，一句話說清楚是什麼作品、藍點做什麼
// - description（作品頁標題下方的介紹文字）：平面作品依分類套較完整的範本；影片作品直接用已有的 SEO 描述
// 用法：node scripts/fill-item-descriptions.js [run]
require("dotenv").config({ quiet: true });
const { tenantCollection } = require("../config/firebase");

const RUN = process.argv[2] === "run";

// [SEO 描述, 頁面介紹]；{t} 會換成作品標題
const TEMPLATES = {
    "活動紀錄": [
        "藍點影像工作室拍攝的活動紀錄作品「{t}」，以自然抓拍記錄活動流程、人物互動與重要瞬間。新北活動攝影、企業尾牙與典禮紀錄。",
        "「{t}」是藍點影像工作室拍攝的活動紀錄作品。我們以自然、不打擾的抓拍方式，記錄活動現場的流程、人物互動與每個值得留下的瞬間。藍點位於新北，承接企業尾牙、開幕典禮、校園與社團活動等攝影紀錄。"
    ],
    "劇場/舞台攝影": [
        "藍點影像工作室拍攝的劇場舞台攝影作品「{t}」，在舞台燈光下捕捉演員表情、肢體與每一幕的張力。演出劇照、成果發表會攝影。",
        "「{t}」是藍點影像工作室拍攝的劇場／舞台攝影作品。我們在舞台燈光下捕捉演員的表情、肢體與每一幕的戲劇張力。藍點長期與劇團、校園表演藝術科系及音樂劇製作合作，提供演出劇照與成果發表會攝影。"
    ],
    "婚慶/抓周/性別派對": [
        "藍點影像工作室拍攝的人生慶典紀錄「{t}」，記錄抓周、性別揭曉派對與婚禮重要時刻的笑容與互動。新北婚禮與派對攝影。",
        "「{t}」是藍點影像工作室拍攝的人生慶典紀錄。我們記錄抓周、性別揭曉派對與婚禮登記等重要日子裡，家人與朋友的笑容與互動。藍點位於新北，提供婚禮、抓周與各類派對的攝影紀錄。"
    ],
    "人像拍攝": [
        "藍點影像工作室的人像攝影作品「{t}」，透過光線、構圖與引導拍出自然神情與個人風格。人像寫真、品牌合作與 KOL 業配拍攝。",
        "「{t}」是藍點影像工作室的人像攝影作品。我們透過光線、構圖與拍攝引導，拍出人物自然的神情與個人風格。藍點承接個人寫真、品牌服飾與 KOL 業配合作的人像拍攝。"
    ],
    "形象照/演員卡": [
        "藍點影像工作室拍攝的形象照／演員卡作品「{t}」，以乾淨光線與專業引導拍出適合履歷、經紀與試鏡的照片。新北形象照拍攝。",
        "「{t}」是藍點影像工作室拍攝的形象照／演員卡作品。我們以乾淨的光線與專業的拍攝引導，拍出適合履歷、經紀公司與試鏡使用的形象照片。藍點位於新北，提供個人形象照、演員卡、模特兒卡與團體形象照拍攝。"
    ],
    "美食攝影": [
        "藍點影像工作室的美食攝影作品「{t}」，透過擺盤、光線與質感拍出讓人想點餐的料理畫面，適用菜單、官網與社群行銷。",
        "「{t}」是藍點影像工作室的美食攝影作品。我們透過擺盤、光線與質感呈現，拍出讓人想點餐的料理畫面，適用於菜單、官方網站與社群行銷。"
    ],
    "運動攝影": [
        "藍點影像工作室的運動攝影作品「{t}」，以高速快門捕捉選手奔跑與比賽的動態瞬間。路跑、越野賽與競技賽事攝影。",
        "「{t}」是藍點影像工作室的運動攝影作品。我們以高速快門捕捉選手奔跑、競賽的動態瞬間與賽事現場氛圍。藍點承接路跑、越野賽與各類競技賽事的攝影紀錄。"
    ],
    "主視覺影像製作": [
        "藍點影像工作室的主視覺影像製作「{t}」，從概念、拍攝到後製，打造演出與品牌的海報、節目冊與角色形象視覺。",
        "「{t}」是藍點影像工作室的主視覺影像製作作品。我們從概念發想、拍攝到後製，為演出與品牌打造海報、節目冊與宣傳用的主視覺與角色形象。"
    ]
};
const FILM_FALLBACK = [
    "藍點影像工作室拍攝製作的影片作品「{t}」，從拍攝、剪輯到調色完整製作。新北影片拍攝、活動紀錄片與短影音製作。",
    null
];

const clean = text => String(text || "").replace(/\s*\n\s*/g, " ").trim();
const isEmptyHtml = html => !String(html || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

(async () => {

    const pages = (await tenantCollection("default", "customPages").get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.pageType === "collection");
    const categories = (await tenantCollection("default", "pageCategories").get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const snapshot = await tenantCollection("default", "pageItems").get();

    let metaCount = 0, descCount = 0;
    const samples = [];

    for (const doc of snapshot.docs) {
        const item = doc.data();
        const page = pages.find(p => p.id === item.pageId);
        if (!page) continue;
        const catLabel = (categories.find(c => c.id === item.category) || {}).label || "";
        const title = clean(item.title);
        const isFilm = !!item.link;
        const template = TEMPLATES[catLabel] && !isFilm ? TEMPLATES[catLabel] : (isFilm ? FILM_FALLBACK : null);
        if (!template) continue;

        const update = {};
        if (!clean(item.metaDescription)) update.metaDescription = template[0].replace("{t}", title);
        const meta = update.metaDescription || clean(item.metaDescription);
        if (isEmptyHtml(item.description)) {
            const body = template[1] ? template[1].replace("{t}", title) : meta;
            if (body) update.description = `<p>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;
        }
        if (!Object.keys(update).length) continue;
        if (update.metaDescription) metaCount++;
        if (update.description) descCount++;
        if (samples.length < 3 || (isFilm && samples.length < 4)) samples.push({ page: page.slug, cat: catLabel, title, ...update });
        if (RUN) await doc.ref.update({ ...update, updatedAt: new Date() });
    }

    samples.forEach(s => console.log(JSON.stringify(s, null, 1)));
    console.log(`${RUN ? "完成" : "（試跑）"}：補 SEO 描述 ${metaCount} 個、補頁面介紹 ${descCount} 個`);
    process.exit(0);

})();
