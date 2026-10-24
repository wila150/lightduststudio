// 上傳圖片的記憶體保護（2026/10/24：Cloud Run 512MB 一次上傳多張大照片時記憶體爆掉，伺服器被強制重啟，
// 前台只看到「Service Unavailable」）：
// 1. sharp 不快取解碼後的圖片、一次只用一個執行緒處理，單張照片的記憶體高峰小很多
// 2. 多張照片改成逐張處理（見 mediaService.uploadMany / collectionService.uploadImages）
const sharp = require("sharp");

sharp.cache(false);
sharp.concurrency(1);

// multer 依 HTTP 規範把上傳檔名當 latin1 解讀，中文檔名會變成「2022 å¿�é è��」這種亂碼；
// 瀏覽器實際送的是 UTF-8，轉回來即可。已經是正常中文（含 latin1 以外字元）的就不動
function fixUploadName(name) {
    if (!name || /[^\u0000-ÿ]/.test(name)) return name;
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    return decoded.includes("�") ? name : decoded;
}

// 依序執行，一次只處理一個（照片壓縮很吃記憶體，不能同時處理整批）
async function mapSeries(items, fn) {
    const results = [];
    for (const item of items) {
        try {
            results.push({ status: "fulfilled", value: await fn(item) });
        } catch (reason) {
            results.push({ status: "rejected", reason });
        }
    }
    return results;
}

module.exports = { fixUploadName, mapSeries };
