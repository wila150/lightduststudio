const { fixUploadName, mapSeries } = require("../config/uploadLimits");
const { tenantCollection } = require("../config/firebase");
const storageService = require("./storageService");
const sharp = require("sharp");
const imageConfig = require("../config/imageConfig");
const { processPhoto } = require("./imageProcessor");

class MediaService {

    /**
     * 驗證並處理上傳的圖片
     * @param {Object} file - multer 上傳的檔案物件
     * @returns {Object} 處理後的檔案和元資訊
     */
    async validateAndProcessImage(file) {

        file.originalname = fixUploadName(file.originalname);

        // 驗證 MIME 類型
        if (!imageConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(imageConfig.errors.invalidMimeType);
        }

        // 只擋原始檔離譜大的；小檔不擋，成品大小由 imageProcessor 調整（目標 800KB–2MB）
        if (file.size > imageConfig.upload.maxFileSize) {
            throw new Error(imageConfig.errors.fileTooLarge);
        }

        const original = await sharp(file.buffer).metadata();

        // 統一規格：長邊 2048px、72dpi、JPG、sRGB、800KB–2MB（GIF、透明 PNG/WebP 保留原格式）
        const result = await processPhoto(file.buffer, file.mimetype, file.originalname);

        if (!result) {
            return {
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                metadata: {
                    originalWidth: original.width || 0,
                    originalHeight: original.height || 0,
                    format: file.mimetype.replace("image/", "")
                }
            };
        }

        const processed = result.width ? result : { ...result, ...(await sharp(result.buffer).metadata()) };

        return {
            buffer: result.buffer,
            originalname: result.originalname,
            mimetype: result.mimetype,
            size: result.buffer.length,
            metadata: {
                originalWidth: original.width || 0,
                originalHeight: original.height || 0,
                processedWidth: processed.width,
                processedHeight: processed.height,
                dpi: imageConfig.processing.dpi,
                colorSpace: imageConfig.processing.colorSpace,
                format: result.mimetype.replace("image/", ""),
                quality: result.quality
            }
        };

    }

    async list(tenantId, albumId) {

        try {

            const snapshot = await tenantCollection(tenantId, "media").orderBy("createdAt", "desc").get();

            const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (!albumId) {
                return files;
            }

            return albumId === "none"
                ? files.filter(file => !file.albumId)
                : files.filter(file => file.albumId === albumId);

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async upload(tenantId, file, albumId) {

        // 驗證和處理圖片
        const processedFile = await this.validateAndProcessImage(file);

        const { url, path } = await storageService.uploadBuffer(
            processedFile.buffer,
            processedFile.originalname,
            processedFile.mimetype,
            "media",
            { processed: true }
        );

        const data = {
            name: processedFile.originalname,
            url,
            path,
            size: processedFile.size,
            contentType: processedFile.mimetype,
            albumId: albumId || "",
            // 存儲圖片的處理元資訊
            imageMetadata: processedFile.metadata,
            createdAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "media").add(data);

        return { id: ref.id, ...data };

    }

    // 多檔案一次上傳，個別失敗不影響其他檔案；失敗的檔案跟原因也一起回傳，
    // 不然像「太小/太大/格式不對」這種被擋掉的檔案會直接消失，介面上看起來就是「選了 5 張只上傳 1 張」的怪 bug
    async uploadMany(tenantId, files, albumId) {

        const results = await mapSeries(files, file => this.upload(tenantId, file, albumId));

        const uploaded = [];
        const failed = [];

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                uploaded.push(result.value);
            } else {
                failed.push({ name: files[index].originalname, error: (result.reason && result.reason.message) || "上傳失敗" });
            }
        });

        return { uploaded, failed };

    }

    // ===== 相簿（媒體庫檔案分類，跟分類清單型頁面的分類是各自獨立的兩套） =====

    async getAlbums(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "mediaAlbums").orderBy("createdAt", "asc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    // parentAlbumId 留空代表頂層分類；只開放一層（子相簿不能再有自己的子相簿），
    // 跟分類清單型頁面的「頂層分類＋子分類」做法一致（見 collectionService 的 parentCategoryId）
    async createAlbum(tenantId, label, parentAlbumId) {

        const album = { label: label || "", parentAlbumId: parentAlbumId || "", createdAt: new Date() };

        const ref = await tenantCollection(tenantId, "mediaAlbums").add(album);

        return { id: ref.id, ...album };

    }

    async updateAlbum(tenantId, albumId, label, parentAlbumId) {

        await tenantCollection(tenantId, "mediaAlbums").doc(albumId).update({
            label: label || "",
            parentAlbumId: parentAlbumId || ""
        });

        return true;

    }

    // 刪除相簿不會刪除裡面的檔案，只是把檔案的 albumId 清掉、變回未分類；
    // 刪除頂層分類時，底下的子相簿不會被連坐刪除，只是變回頂層分類（parentAlbumId 清空）
    async removeAlbum(tenantId, albumId) {

        const files = await this.list(tenantId, albumId);

        await Promise.all(files.map(file => tenantCollection(tenantId, "media").doc(file.id).update({ albumId: "" })));

        const children = await tenantCollection(tenantId, "mediaAlbums").where("parentAlbumId", "==", albumId).get();

        await Promise.all(children.docs.map(doc => doc.ref.update({ parentAlbumId: "" })));

        await tenantCollection(tenantId, "mediaAlbums").doc(albumId).delete();

        return true;

    }

    async moveToAlbum(tenantId, ids, albumId) {

        await Promise.all(ids.map(id => tenantCollection(tenantId, "media").doc(id).update({ albumId: albumId || "" })));

        return true;

    }

    // 刪除＝搬進資源回收桶，檔案保留，可以從媒體庫「最近刪除」復原；永久刪除才會刪掉檔案（見 services/trashService.js）
    async remove(tenantId, id) {

        return require("./trashService").moveToTrash(tenantId, "media", id);

    }

    // 批次刪除多個檔案
    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

    // 更新一張圖片的 alt 文字（無障礙閱讀／SEO 用）
    async updateAlt(tenantId, id, alt) {

        await tenantCollection(tenantId, "media").doc(id).update({ alt: alt || "" });

        return true;

    }

}

module.exports = new MediaService();
