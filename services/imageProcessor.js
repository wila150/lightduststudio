// 上傳照片的統一規格（媒體庫、作品相簿、各種封面都走這裡，只處理一次）：
//   長邊 2048px（小於就不放大）、72dpi、JPG、sRGB、成品大小盡量落在 800KB–2MB
// 另外：依手機 EXIF 方向自動轉正，並清掉 EXIF（相機型號、GPS 位置等個資）
// 例外：動畫 GIF、有透明背景的 PNG/WebP（Logo、去背圖）保留原格式，只縮尺寸，轉 JPG 會變單張／白底
const sharp = require("sharp");
const imageConfig = require("../config/imageConfig");

const { maxDimension, dpi, jpegQuality } = imageConfig.processing;
const MIN_BYTES = imageConfig.processing.targetMinBytes;
const MAX_BYTES = imageConfig.processing.targetMaxBytes;
const PROCESSABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff", "image/bmp", "image/heic", "image/heif"]);

function toJpg(name) {
    return String(name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
}

async function encodeJpeg(input, quality) {
    return sharp(input)
        .withIccProfile("srgb")
        .withMetadata({ density: dpi })
        .withExif({})
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();
}

// 回傳 { buffer, mimetype, originalname, width, height, quality }；不需要處理的格式回傳 null（照原檔上傳）
async function processPhoto(buffer, mimetype, originalname, { trim = false } = {}) {

    if (mimetype === "image/gif" || !PROCESSABLE.has(mimetype)) {
        return null;
    }

    const meta = await sharp(buffer).metadata();

    let base = sharp(buffer).rotate();
    if (trim) base = base.trim();
    base = base.resize(maxDimension, maxDimension, { fit: "inside", withoutEnlargement: true });

    // 透明背景的 Logo／去背圖：維持原格式，只縮尺寸
    if (meta.hasAlpha && (mimetype === "image/png" || mimetype === "image/webp")) {
        const out = mimetype === "image/png"
            ? await base.png({ compressionLevel: 9 }).withMetadata({ density: dpi }).toBuffer()
            : await base.webp({ quality: 85 }).withMetadata({ density: dpi }).toBuffer();
        return { buffer: out, mimetype, originalname, quality: null };
    }

    // 先解碼＋縮好一次（轉 sRGB），之後調整品質只重新壓 JPEG，不重複縮圖
    const resized = await base.toColorspace("srgb").toBuffer();

    let quality = jpegQuality;
    let out = await encodeJpeg(resized, quality);

    // 太大：降品質直到 ≤ 2MB（最低 70，再低畫質會明顯變差）
    while (out.length > MAX_BYTES && quality > 70) {
        quality -= 5;
        out = await encodeJpeg(resized, quality);
    }

    // 太小：提高品質讓細節多保留一些（最高 95）；構圖單純的照片就算 95 也可能不到 800KB，那就維持
    while (out.length < MIN_BYTES && quality < 95) {
        const next = await encodeJpeg(resized, quality + 5);
        if (next.length > MAX_BYTES) break;
        quality += 5;
        out = next;
    }

    const outMeta = await sharp(out).metadata();

    return { buffer: out, mimetype: "image/jpeg", originalname: toJpg(originalname), width: outMeta.width, height: outMeta.height, quality };

}

module.exports = { processPhoto };
