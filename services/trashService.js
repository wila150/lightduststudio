const { tenantCollection } = require("../config/firebase");
const storageService = require("./storageService");

// 資源回收桶（2026/10/03 回饋：後台誤刪了一大批作品和分類，要能「復原」）
// 作品（pageItems）、分類（pageCategories）、媒體庫檔案（media）刪除時不再直接刪掉，
// 而是整筆搬進 trash 集合、照片檔案保留；復原時用原本的 doc id 放回去，網址、分類、首頁輪播的連結都不會斷。
// 只有「永久刪除」才會真的刪掉儲存空間裡的檔案。
const LABELS = { pageItems: "作品", pageCategories: "分類", media: "照片", messages: "留言" };

function trashId(collection, docId) {
    return `${collection}__${docId}`;
}

// 永久刪除時要一起刪掉的儲存空間檔案（從媒體庫選來的照片 path 是空的，檔案屬於媒體庫，不能刪）
function filePaths(collection, data) {
    if (collection === "media") return [data.path].filter(Boolean);
    if (collection === "pageItems") return [...(data.images || []).map(image => image.path), data.coverImage && data.coverImage.path].filter(Boolean);
    return [];
}

class TrashService {

    async moveToTrash(tenantId, collection, docId) {

        const ref = tenantCollection(tenantId, collection).doc(docId);
        const doc = await ref.get();

        if (!doc.exists) {
            return false;
        }

        const data = doc.data();

        await tenantCollection(tenantId, "trash").doc(trashId(collection, docId)).set({
            collection,
            docId,
            data,
            label: data.title || data.label || (collection === "messages" ? `${data.name || ""}：${String(data.subject || data.message || "").slice(0, 30)}` : data.name) || "",
            pageId: data.pageId || "",
            deletedAt: new Date()
        });

        await ref.delete();

        return true;

    }

    // collections：要列哪幾種；pageId：只列這個頁面的作品／分類
    async list(tenantId, { collections, pageId } = {}) {

        const snapshot = await tenantCollection(tenantId, "trash").get();

        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(entry => !collections || collections.includes(entry.collection))
            .filter(entry => !pageId || entry.pageId === pageId)
            .map(entry => ({
                id: entry.id,
                collection: entry.collection,
                kind: LABELS[entry.collection] || entry.collection,
                label: entry.label,
                deletedAt: entry.deletedAt && entry.deletedAt.toDate ? entry.deletedAt.toDate() : entry.deletedAt,
                category: entry.data && entry.data.category,
                albumId: entry.data && entry.data.albumId,
                url: entry.collection === "media" ? entry.data.url : ((entry.data && entry.data.coverImage && entry.data.coverImage.url) || "")
            }))
            .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    }

    async restore(tenantId, id) {

        const ref = tenantCollection(tenantId, "trash").doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            return null;
        }

        const entry = doc.data();

        await tenantCollection(tenantId, entry.collection).doc(entry.docId).set(entry.data);
        await ref.delete();

        return { collection: entry.collection, docId: entry.docId, label: entry.label };

    }

    async purge(tenantId, id) {

        const ref = tenantCollection(tenantId, "trash").doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            return false;
        }

        const entry = doc.data();

        await Promise.all(filePaths(entry.collection, entry.data).map(path => storageService.deleteFile(path)));
        await ref.delete();

        return true;

    }

}

module.exports = new TrashService();
