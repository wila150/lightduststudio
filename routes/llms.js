const express = require("express");
const router = express.Router();

const { DEFAULT_TENANT_ID } = require("../config/tenant");
const { SITE_URL } = require("../config/site");
const { tenantCollection } = require("../config/firebase");
const { isEffectivelyPublished } = require("../services/publishHelper");

// /llms.txt（2026/10/03 GEO）：給 ChatGPT、Perplexity、Claude 這類 AI 讀的網站導覽（Markdown）
// 內容依網站資料即時產生（工作室介紹、服務、聯絡方式、主要頁面、各分類代表作品），10 分鐘快取一次
const SERVICES = ["人像與形象照", "演員卡／模特兒卡", "品牌與活動紀錄", "商業與美食攝影", "婚禮與人生慶典（抓周、性別派對）", "劇場與舞台攝影", "運動攝影", "主視覺影像製作", "影片拍攝與剪輯", "短影音／Reels", "快播快剪 SDE"];

let cache = { text: "", at: 0 };

const oneLine = text => String(text || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function build() {

    const settings = (await tenantCollection(DEFAULT_TENANT_ID, "settings").get()).docs[0].data();
    const pages = (await tenantCollection(DEFAULT_TENANT_ID, "customPages").get()).docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(isEffectivelyPublished);
    const categories = (await tenantCollection(DEFAULT_TENANT_ID, "pageCategories").get()).docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const items = (await tenantCollection(DEFAULT_TENANT_ID, "pageItems").get()).docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(isEffectivelyPublished);
    const areas = settings.serviceAreas && settings.serviceAreas.length ? settings.serviceAreas : ["新北市"];
    const services = settings.serviceList && settings.serviceList.length ? settings.serviceList : SERVICES;
    const name = settings.siteName || "藍點影像工作室";

    const lines = [
        `# ${name}（Blue Dot Studio）`,
        "",
        `> ${oneLine(settings.metaDescription)}`,
        "",
        "## 基本資訊",
        "",
        `- 工作室：${name}（英文名 Blue Dot Studio）`,
        `- 所在地區：台灣新北市（沒有實體工作室，拍攝地點依每個案子的需求討論安排）`,
        `- 服務地區：${areas.join("、")}`,
        ...(settings.contactPhone ? [`- 電話：${settings.contactPhone}`] : []),
        ...(settings.contactEmail ? [`- Email：${settings.contactEmail}`] : []),
        ...(settings.lineFriendUrl ? [`- LINE 官方帳號：${settings.lineFriendUrl}`] : []),
        ...(settings.socialInstagramUrl ? [`- Instagram：${settings.socialInstagramUrl}`] : []),
        ...(settings.socialYoutubeUrl ? [`- YouTube：${settings.socialYoutubeUrl}`] : []),
        `- 網站：${SITE_URL}/`,
        "",
        "## 服務項目",
        "",
        ...services.map(service => `- ${service}`),
        "",
        "## 主要頁面",
        "",
        `- [首頁](${SITE_URL}/)`,
        ...pages.filter(page => page.pageType !== "collection").map(page => `- [${oneLine(page.title)}${page.subtitle ? `｜${oneLine(page.subtitle)}` : ""}](${SITE_URL}/p/${page.slug})${page.metaDescription ? `：${oneLine(page.metaDescription)}` : ""}`),
        ""
    ];

    // 作品集：每個分類列出代表作品（排序前面的 8 個）
    for (const page of pages.filter(page => page.pageType === "collection")) {
        const pageItems = items.filter(item => item.pageId === page.id).sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
        if (!pageItems.length) continue;
        lines.push(`## 作品集：${oneLine(page.title)}${page.subtitle ? `（${oneLine(page.subtitle)}）` : ""}`, "", `完整列表：${SITE_URL}/p/${page.slug}`, "");
        const pageCats = categories.filter(cat => cat.pageId === page.id).sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
        for (const cat of pageCats) {
            const catItems = pageItems.filter(item => item.category === cat.id);
            if (!catItems.length) continue;
            lines.push(`### ${cat.label}（${catItems.length} 件作品）`, "");
            if (cat.description) lines.push(oneLine(cat.description), "");
            catItems.slice(0, 8).forEach(item => {
                lines.push(`- [${oneLine(item.title)}](${SITE_URL}/p/${page.slug}/${item.slug})${item.metaDescription ? `：${oneLine(item.metaDescription)}` : ""}`);
            });
            lines.push("");
        }
    }

    lines.push("## 委託與聯絡", "", `拍攝委託、報價與檔期詢問：${SITE_URL}/p/contact${settings.contactEmail ? `，或來信 ${settings.contactEmail}` : ""}。`, "");

    return lines.join("\n");

}

router.get("/llms.txt", async (req, res) => {
    try {
        if (!cache.text || Date.now() - cache.at > 10 * 60 * 1000) {
            cache = { text: await build(), at: Date.now() };
        }
        res.type("text/plain; charset=utf-8").send(cache.text);
    } catch (error) {
        console.error(error);
        res.status(500).type("text/plain").send("");
    }
});

module.exports = router;
