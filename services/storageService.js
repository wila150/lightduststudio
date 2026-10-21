const crypto = require("crypto");
const sharp = require("sharp");
const { bucket } = require("../config/firebase");

// 手機相機原始照片常常是 10-20MB、邊長 4000px 以上，直接放上去網站每次載入都很重，
// 上傳時統一壓縮：長邊限制在 2400px（一般螢幕/Retina 顯示都夠用），並套用中等壓縮率。
// 動畫 GIF、SVG 不處理（GIF 用 sharp 壓縮會被拆成單張靜態圖，SVG 本身就是向量檔不需要）
const MAX_DIMENSION = 2400;
const OPTIMIZABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function optimizeImage(buffer, mimeType, { trim = false } = {}) {

    // .rotate() 不帶參數 = 依照片 EXIF 方向自動轉正，並順便清掉 EXIF（含手機拍照可能夾帶的 GPS 位置資訊）
    let pipeline = sharp(buffer).rotate();

    // trim 只給 Logo 這類「圖案本身該貼齊邊緣」的圖片用：自動裁掉四周透明/單一背景色的留白，
    // 一般照片絕對不能套用，攝影作品的留白空間常常是刻意構圖的一部分
    if (trim) {
        pipeline = pipeline.trim();
    }

    pipeline = pipeline.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
    });

    if (mimeType === "image/jpeg") {
        pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
    } else if (mimeType === "image/webp") {
        pipeline = pipeline.webp({ quality: 82 });
    } else if (mimeType === "image/png") {
        pipeline = pipeline.png({ compressionLevel: 9 });
    }

    return pipeline.toBuffer();

}

class StorageService {

    // 上傳檔案，回傳可直接公開存取的網址與 Storage 路徑
    async uploadBuffer(buffer, originalName, mimeType, folder, options = {}) {

        if (!bucket) {
            throw new Error("尚未設定 FIREBASE_STORAGE_BUCKET，請先在 .env 補上再重新啟動伺服器");
        }

        let uploadData = buffer;

        if (OPTIMIZABLE_TYPES.has(mimeType)) {

            try {
                uploadData = await optimizeImage(buffer, mimeType, options);
            } catch (error) {
                console.error("圖片壓縮失敗，改用原始檔案上傳：", error);
            }

        }

        const token = crypto.randomUUID();

        const path = `${folder}/${Date.now()}-${originalName}`;

        const file = bucket.file(path);

        await file.save(uploadData, {
            metadata: {
                contentType: mimeType,
                metadata: {
                    firebaseStorageDownloadTokens: token
                }
            }
        });

        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

        return { url, path };

    }

    async deleteFile(path) {

        try {

            await bucket.file(path).delete();

        } catch (error) {

            console.error(error);

        }

    }

}

module.exports = new StorageService();
