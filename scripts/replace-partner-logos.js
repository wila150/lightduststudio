// 換掉首頁合作品牌跑馬燈的 LOGO（2026/10/02 廠商提供的新版去背 LOGO）
// 媒體庫「合作品牌LOGO」相簿：舊檔案全部刪除，新資料夾裡的檔案全部上傳（同一家的備用版本也放，之後在後台挑得到）
// 首頁跑馬燈：同一家只放一個版本，首頁是深色底，有白字版的用白字版
// 用法：node scripts/replace-partner-logos.js <LOGO 資料夾> [run]
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { tenantCollection } = require("../config/firebase");
const storageService = require("../services/storageService");

const SRC = process.argv[2];
const RUN = process.argv[3] === "run";
const T = "default";
const IMG = /\.(png|jpe?g|gif|webp)$/i;
const mime = f => /\.png$/i.test(f) ? "image/png" : /\.gif$/i.test(f) ? "image/gif" : /\.webp$/i.test(f) ? "image/webp" : "image/jpeg";

// 同一家的其他版本：只上傳到媒體庫，不放進跑馬燈
const MEDIA_ONLY = [
    "Q.png",                           // 樂團祭，跟 476613661_…png 同一張，解析度較低
    "廣藝 LOGO-橫.png",                 // 廣藝，深色字在深色底看不清楚，跑馬燈用白字的「廣藝lOGO.png」
    "新北市政府原住民族 LOGO-2.png",     // 新北市原民局，字太小，跑馬燈用「新北市政府原住民族LOGO.png」
    "粥次郎LOGO.png"                    // 粥次郎，深色字，跑馬燈用白字版
];

(async () => {

    const files = fs.readdirSync(SRC).filter(f => IMG.test(f)).sort((a, b) => a.localeCompare(b, "zh-Hant", { numeric: true }));
    const albums = (await tenantCollection(T, "mediaAlbums").get()).docs;
    const album = albums.find(a => a.data().label === "合作品牌LOGO");
    const oldMedia = (await tenantCollection(T, "media").where("albumId", "==", album.id).get()).docs;

    console.log(`刪除舊 LOGO ${oldMedia.length} 個；上傳新 LOGO ${files.length} 個，跑馬燈放 ${files.filter(f => !MEDIA_ONLY.includes(f)).length} 個`);

    if (!RUN) process.exit(0);

    const uploaded = [];
    for (const f of files) {
        const buf = fs.readFileSync(path.join(SRC, f));
        // trim：裁掉 LOGO 四周的透明留白，跑馬燈裡每個 LOGO 的視覺大小才一致
        const { url, path: p } = await storageService.uploadBuffer(buf, f, mime(f), "media", { trim: true });
        await tenantCollection(T, "media").add({ name: f, url, path: p, size: buf.length, contentType: mime(f), albumId: album.id, alt: f.replace(/\.[^.]+$/, "").trim(), createdAt: new Date() });
        uploaded.push({ f, url });
    }

    const homeRef = tenantCollection(T, "pages").doc("home");
    const home = (await homeRef.get()).data();
    const logos = uploaded.filter(u => !MEDIA_ONLY.includes(u.f)).map(u => ({ id: crypto.randomUUID().slice(0, 10), url: u.url, path: "" }));
    await homeRef.update({ modules: home.modules.map(m => m.type === "sponsorMarquee" ? { ...m, data: { ...m.data, logos } } : m) });

    // 跑馬燈換好之後才刪舊檔，避免中途失敗首頁 LOGO 全部破圖
    for (const doc of oldMedia) {
        if (doc.data().path) await storageService.deleteFile(doc.data().path).catch(() => {});
        await doc.ref.delete();
    }

    console.log(`完成：媒體庫 ${uploaded.length} 個、跑馬燈 ${logos.length} 個`);
    process.exit(0);

})().catch(e => { console.error(e); process.exit(1); });
