const crypto = require("crypto");
const { processPhoto } = require("./imageProcessor");
const { bucket } = require("../config/firebase");

class StorageService {

    // 上傳檔案，回傳可直接公開存取的網址與 Storage 路徑
    async uploadBuffer(buffer, originalName, mimeType, folder, options = {}) {

        if (!bucket) {
            throw new Error("尚未設定 FIREBASE_STORAGE_BUCKET，請先在 .env 補上再重新啟動伺服器");
        }

        let uploadData = buffer;

        // 照片一律走統一規格處理一次（services/imageProcessor.js）；呼叫端已經處理過的傳 processed: true
        if (!options.processed) {
            try {
                const result = await processPhoto(buffer, mimeType, originalName, { trim: options.trim });
                if (result) {
                    uploadData = result.buffer;
                    mimeType = result.mimetype;
                    originalName = result.originalname;
                }
            } catch (error) {
                console.error("圖片處理失敗，改用原始檔案上傳：", error);
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
