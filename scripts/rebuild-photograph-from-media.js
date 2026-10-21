// 從媒體庫重建 PHOTOGRAPH 作品（2026/10/03：後台誤刪了大部分作品和「活動紀錄」分類）
// 媒體庫的「分類相簿 → 作品相簿」每個作品相簿建立一個作品；同分類已經有同名作品就跳過
// 分類不存在就用備份的設定補回；名稱對得上備份裡的舊作品時，沿用舊的網址代稱、描述、SEO 描述、排序
// 用法：node scripts/rebuild-photograph-from-media.js <備份 JSON> [run]
require("dotenv").config({ quiet: true });
const fs = require("fs");
const { tenantCollection } = require("../config/firebase");
const mediaService = require("../services/mediaService");
const collectionService = require("../services/collectionService");

const T = "default";
const PAGE = "ox87mWDphrW2aGYDUCmR";
const RUN = process.argv[3] === "run";
const backup = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const byName = (a, b) => {
    const ca = /^封面/.test(a.name || "") ? 0 : 1;
    const cb = /^封面/.test(b.name || "") ? 0 : 1;
    return ca - cb || (a.name || "").localeCompare(b.name || "", "zh-Hant", { numeric: true });
};

(async () => {

    const [albums, files, items] = await Promise.all([
        mediaService.getAlbums(T), mediaService.list(T), collectionService.getItems(T, PAGE)
    ]);
    let categories = await collectionService.getCategories(T, PAGE);

    const oldCats = backup.pageCategories.filter(c => c.pageId === PAGE);
    const oldItems = backup.pageItems.filter(i => i.pageId === PAGE);
    const oldCatLabel = id => (oldCats.find(c => c.id === id) || {}).label;
    const usedSlugs = new Set(items.map(i => i.slug));

    let created = 0;

    for (const top of albums.filter(a => !a.parentAlbumId)) {

        const subs = albums.filter(a => a.parentAlbumId === top.id).sort((a, b) => a.label.localeCompare(b.label, "zh-Hant", { numeric: true }));
        if (subs.length === 0) continue;

        let category = categories.find(c => c.label === top.label);
        if (!category) {
            const old = oldCats.find(c => c.label === top.label);
            if (!old) { console.log(`?? 媒體庫有「${top.label}」但網站和備份都沒有這個分類，跳過`); continue; }
            const sortOrder = Math.max(0, ...categories.map(c => c.sortOrder || 0)) + 10;
            console.log(`＋ 補回分類「${top.label}」（${old.nameEn}，排在最前面）`);
            if (RUN) {
                const cat = await collectionService.createCategory(T, PAGE, { label: old.label, nameEn: old.nameEn || "", description: old.description || "", parentCategoryId: "" });
                await tenantCollection(T, "pageCategories").doc(cat.id).update({ sortOrder, nameEn: old.nameEn || "" });
                category = { ...cat, sortOrder };
            } else {
                category = { id: "(new)", label: top.label };
            }
            categories.push(category);
        }

        let added = 0, skipped = 0;
        for (const sub of subs) {
            const title = sub.label.trim();
            if (items.some(i => (i.title || "").trim() === title && i.category === category.id)) { skipped++; continue; }
            const photos = files.filter(f => f.albumId === sub.id).sort(byName);
            if (photos.length === 0) continue;
            const old = oldItems.find(o => o.title === title && oldCatLabel(o.category) === top.label) || oldItems.find(o => o.title === title);
            let slug = old && !usedSlugs.has(old.slug) ? old.slug : `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            usedSlugs.add(slug);
            const cover = photos.find(f => /^封面/.test(f.name || "")) || photos[0];
            if (RUN) {
                const item = await collectionService.create(T, PAGE, {
                    slug, title, category: category.id, published: true,
                    description: old ? old.description || "" : "",
                    metaDescription: old ? old.metaDescription || "" : "",
                    galleryLayout: (old && old.galleryLayout) || "masonry",
                    coverPosition: "center top",
                    mediaImages: photos.map(f => ({ url: f.url, alt: title, name: f.name })),
                    coverImage: { url: cover.url, type: "image", path: "" }
                }, []);
                if (old && typeof old.sortOrder === "number") await tenantCollection(T, "pageItems").doc(item.id).update({ sortOrder: old.sortOrder });
            }
            added++; created++;
        }
        console.log(`【${top.label}】新增 ${added} 個、已存在跳過 ${skipped} 個`);
    }

    console.log(`\n${RUN ? "完成" : "（試跑）"}：新增 ${created} 個作品`);
    process.exit(0);

})().catch(e => { console.error(e); process.exit(1); });
