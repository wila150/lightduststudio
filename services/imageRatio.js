// 作品封面的長寬比（寬 ÷ 高），給平面作品列表的「照片牆」排版用（public/js/main.js）：
// 每一排高度一樣、寬度照比例分配，所以要先知道每張封面的比例。
// 只抓檔案開頭 64KB 讀 JPEG 標頭就知道尺寸，不用下載整張；算過的存回作品資料（coverDims），下次直接用
const sharp = require("sharp");
const { tenantCollection } = require("../config/firebase");

function coverUrlOf(item) {
    return (item.coverImage && item.coverImage.url)
        || (item.images && item.images.length > 0 ? item.images[0].url : "")
        || "";
}

async function measure(url) {
    try {
        const res = await fetch(url, { headers: { Range: "bytes=0-65535" } });
        if (!res.ok) return null;
        const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
        if (!meta.width || !meta.height) return null;
        // EXIF 方向 5～8 是轉 90 度，寬高要對調（上傳時多半已經轉正，保險起見）
        const rotated = meta.orientation >= 5;
        return rotated ? meta.height / meta.width : meta.width / meta.height;
    } catch (error) {
        return null;
    }
}

// 回傳 items，每個多一個 coverRatio（量不到就沒有，前台用 3:2 代替）
async function withCoverRatios(tenantId, items) {
    return Promise.all(items.map(async item => {
        const url = coverUrlOf(item);
        if (!url) return item;
        if (item.coverDims && item.coverDims.url === url && item.coverDims.ratio) {
            return { ...item, coverRatio: item.coverDims.ratio };
        }
        const ratio = await measure(url);
        if (!ratio) return item;
        const coverDims = { url, ratio: Math.round(ratio * 10000) / 10000 };
        tenantCollection(tenantId, "pageItems").doc(item.id).update({ coverDims }).catch(() => {});
        return { ...item, coverDims, coverRatio: coverDims.ratio };
    }));
}

module.exports = { withCoverRatios };
