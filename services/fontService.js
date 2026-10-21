const { tenantCollection } = require("../config/firebase");
const storageService = require("./storageService");

// 副檔名 -> @font-face 的 format() 關鍵字，看檔名判斷就好，不用真的解析字型檔內容
const FORMAT_BY_EXT = {
    woff2: "woff2",
    woff: "woff",
    ttf: "truetype",
    otf: "opentype"
};

function extToFormat(fileName) {

    const match = /\.([a-z0-9]+)$/i.exec(fileName || "");
    const ext = match ? match[1].toLowerCase() : "";

    return FORMAT_BY_EXT[ext] || "truetype";

}

class FontService {

    async list(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "customFonts").orderBy("createdAt", "desc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async getById(tenantId, id) {

        if (!id) {
            return null;
        }

        try {

            const doc = await tenantCollection(tenantId, "customFonts").doc(id).get();

            return doc.exists ? { id: doc.id, ...doc.data() } : null;

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    async upload(tenantId, buffer, originalName, mimeType, name) {

        // multer/busboy 預設用 latin1 解析 multipart 檔名欄位，中文檔名會變亂碼，
        // 重新用 latin1 編碼寫回 buffer、再以 utf8 解碼即可還原正確的檔名（媒體庫上傳流程沒有這個問題，
        // 是因為圖片檔名多半是英數字，這裡字體檔名常常是中文才會踩到）
        const fixedName = Buffer.from(originalName, "latin1").toString("utf8");

        const uploaded = await storageService.uploadBuffer(buffer, fixedName, mimeType || "application/octet-stream", "fonts");

        const font = {
            name: name || fixedName.replace(/\.[^.]+$/, ""),
            url: uploaded.url,
            path: uploaded.path,
            format: extToFormat(fixedName),
            createdAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "customFonts").add(font);

        return { id: ref.id, ...font };

    }

    async remove(tenantId, id) {

        const font = await this.getById(tenantId, id);

        if (!font) {
            return false;
        }

        if (font.path) {
            await storageService.deleteFile(font.path);
        }

        await tenantCollection(tenantId, "customFonts").doc(id).delete();

        return true;

    }

}

module.exports = new FontService();
