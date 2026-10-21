// 把 PHOTOGRAPH 每個作品的封面照也放進作品內頁相簿的第一張（2026/10/02 回饋：封面也要出現在作品集裡面）
// 相簿裡已經有同一張（網址相同）就跳過，重複執行不會重複加
// 用法：node scripts/add-cover-to-gallery.js [run]
require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const { tenantCollection } = require("../config/firebase");

const RUN = process.argv[2] === "run";
const PAGE = "ox87mWDphrW2aGYDUCmR";

(async () => {

    const snapshot = await tenantCollection("default", "pageItems").where("pageId", "==", PAGE).get();
    let added = 0;

    for (const doc of snapshot.docs) {

        const item = doc.data();
        const cover = item.coverImage;
        const images = item.images || [];

        if (!cover || !cover.url || cover.type === "video" || images.some(image => image.url === cover.url)) {
            continue;
        }

        const coverEntry = { id: crypto.randomUUID(), type: "image", url: cover.url, path: "", alt: cover.alt || item.title, sourceName: "封面" };

        if (RUN) {
            await doc.ref.update({ images: [coverEntry, ...images], updatedAt: new Date() });
        }

        added++;

    }

    console.log(`${RUN ? "" : "（試跑）"}${snapshot.size} 個作品，${added} 個加上封面`);
    process.exit(0);

})();
