const customPageService = require("../services/customPageService");
const collectionService = require("../services/collectionService");
const { DEFAULT_TENANT_ID } = require("../config/tenant");
const { SITE_URL } = require("../config/site");

function urlEntry(loc, priority) {
    return `  <url>\n    <loc>${loc}</loc>\n    <priority>${priority}</priority>\n  </url>`;
}

// 動態產生 sitemap.xml：首頁 + 目前所有已發布的自訂頁面（含分類清單頁底下已發布的項目）
exports.sitemap = async (req, res) => {

    const customPages = await customPageService.getPublished(DEFAULT_TENANT_ID);

    const staticUrls = [
        urlEntry(`${SITE_URL}/`, "1.0")
    ];

    const customPageUrls = customPages.map(page => urlEntry(`${SITE_URL}/p/${page.slug}`, "0.7"));

    const collectionPages = customPages.filter(page => page.pageType === "collection");

    const itemUrlLists = await Promise.all(collectionPages.map(async page => {
        const items = await collectionService.getPublishedItems(DEFAULT_TENANT_ID, page.id);
        return items.map(item => urlEntry(`${SITE_URL}/p/${page.slug}/${item.slug}`, "0.6"));
    }));

    const itemUrls = itemUrlLists.flat();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...customPageUrls, ...itemUrls].join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);

};

// 固定內容，允許所有搜尋引擎爬取，並指向 sitemap 位置
exports.robots = (req, res) => {

    const text = `User-agent: *
Allow: /
Disallow: /cms

Sitemap: ${SITE_URL}/sitemap.xml`;

    res.set("Content-Type", "text/plain");
    res.send(text);

};
