const { tenantCollection } = require("../config/firebase");
const storageService = require("./storageService");
const sharp = require("sharp");
const imageConfig = require("../config/imageConfig");

class MediaService {

    /**
     * 驗證並處理上傳的圖片
     * @param {Object} file - multer 上傳的檔案物件
     * @returns {Object} 處理後的檔案和元資訊
     */
    async validateAndProcessImage(file) {

        // 驗證 MIME 類型
        if (!imageConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(imageConfig.errors.invalidMimeType);
        }

        // 驗證檔案大小：太小的擋掉（畫質太差，放大到版面上會模糊），太大的也擋掉
        // （只是擋原始檔離譜大，不是最終存檔大小，下面 sharp 那段會負責壓縮/縮放到合理大小）
        // 下限只擋 JPEG 照片：Logo、去背圖這類 PNG/GIF/WebP 圖檔本來就很小（幾十 KB），不代表畫質差
        if (file.mimetype === "image/jpeg" && file.size < imageConfig.upload.minFileSize) {
            throw new Error(imageConfig.errors.fileTooSmall);
        }

        if (file.size > imageConfig.upload.maxFileSize) {
            throw new Error(imageConfig.errors.fileTooLarge);
        }

        // 使用 sharp 處理圖片
        let pipeline = sharp(file.buffer);

        // 獲取圖片元資訊
        const metadata = await pipeline.metadata();

        // GIF（可能是動畫）跟有透明背景的圖（Logo、去背圖）不能轉 JPEG：
        // 轉了動畫會變成單張、透明處會變成白底，交給 storageService 用原格式壓縮/縮放
        const isGif = file.mimetype === "image/gif";
        const keepAlpha = !isGif && metadata.hasAlpha && ["image/png", "image/webp"].includes(file.mimetype);

        if (isGif || keepAlpha) {
            return {
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                metadata: {
                    originalWidth: metadata.width || 0,
                    originalHeight: metadata.height || 0,
                    format: file.mimetype.replace("image/", "")
                }
            };
        }

        // 計算需要縮放的尺寸（保持長寬比，長邊不超過 2048px）
        const maxDim = imageConfig.processing.maxDimension;
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        let resizeWidth = width;
        let resizeHeight = height;

        if (width > maxDim || height > maxDim) {
            if (width >= height) {
                resizeWidth = maxDim;
                resizeHeight = Math.round((maxDim / width) * height);
            } else {
                resizeHeight = maxDim;
                resizeWidth = Math.round((maxDim / height) * width);
            }
        }

        // 處理圖片：
        // 1. 調整大小到 2048px（長邊）
        // 2. 轉換為 sRGB 色彩空間
        // 3. 轉換為 JPEG 格式
        // 4. 設置解析度為 72dpi
        pipeline = sharp(file.buffer)
            .resize(resizeWidth, resizeHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toColorspace('srgb')
            .withMetadata({
                density: imageConfig.processing.dpi,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({
                quality: imageConfig.processing.jpegQuality,
                progressive: true,
                mozjpeg: true
            });

        // 轉換為 Buffer
        const processedBuffer = await pipeline.toBuffer({ resolveWithObject: true });

        // 回傳處理後的檔案資訊
        return {
            buffer: processedBuffer.data,
            originalname: file.originalname.replace(/\.[^.]+$/, '.jpg'), // 改為 .jpg 副檔名
            mimetype: 'image/jpeg',
            size: processedBuffer.data.length,
            metadata: {
                originalWidth: width,
                originalHeight: height,
                processedWidth: resizeWidth,
                processedHeight: resizeHeight,
                dpi: imageConfig.processing.dpi,
                colorSpace: imageConfig.processing.colorSpace,
                format: imageConfig.processing.outputFormat
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
            "media"
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

        const results = await Promise.allSettled(files.map(file => this.upload(tenantId, file, albumId)));

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
