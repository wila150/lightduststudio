const { fixUploadName } = require("../config/uploadLimits");
const { sanitizeCoverPosition } = require("./coverPosition");
const crypto = require("crypto");
const { tenantCollection } = require("../config/firebase");
const storageService = require("./storageService");
const moduleService = require("./moduleService");
const { isEffectivelyPublished, parseDatetimeLocal } = require("./publishHelper");
const { applyReorder } = require("./reorderHelper");
const trashService = require("./trashService");

// 「分類清單型」自訂頁面底下的分類＋項目管理，兩者永遠成對使用（一個分類清單頁面才會有分類跟項目），
// 邏輯分別比照 services/categoryService.js（分類）跟 services/projectService.js（項目：相簿/封面/影片），
// 差別只在於這裡的分類/項目都用 pageId 欄位標示屬於哪一個自訂頁面，同一個 Firestore 集合可以給多個頁面共用
class CollectionService {

    // ===== 分類 =====

    async getCategories(tenantId, pageId) {

        try {

            const snapshot = await tenantCollection(tenantId, "pageCategories").where("pageId", "==", pageId).get();

            const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            return categories.sort((a, b) => {

                const orderA = typeof a.sortOrder === "number" ? a.sortOrder : -Infinity;
                const orderB = typeof b.sortOrder === "number" ? b.sortOrder : -Infinity;

                if (orderA !== orderB) {
                    return orderB - orderA;
                }

                const timeA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;

                return timeB - timeA;

            });

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async getCategoryById(tenantId, categoryId) {

        try {

            const doc = await tenantCollection(tenantId, "pageCategories").doc(categoryId).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() };

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    async createCategory(tenantId, pageId, data) {

        const existing = await this.getCategories(tenantId, pageId);
        const maxOrder = existing.reduce((max, cat) => Math.max(max, typeof cat.sortOrder === "number" ? cat.sortOrder : 0), 0);

        const category = {
            pageId,
            label: data.label || "",
            description: data.description || "",
            coverImage: data.coverImage || null,
            // 只開放一層子分類：頂層分類 parentCategoryId 是空字串，子分類才會有值
            parentCategoryId: data.parentCategoryId || "",
            sortOrder: maxOrder + 1,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "pageCategories").add(category);

        return { id: ref.id, ...category };

    }

    async updateCategory(tenantId, categoryId, data) {

        const update = {
            label: data.label || "",
            description: data.description || "",
            parentCategoryId: data.parentCategoryId || "",
            updatedAt: new Date()
        };

        if (data.coverImage) {

            const existing = await this.getCategoryById(tenantId, categoryId);

            if (existing && existing.coverImage) {
                await storageService.deleteFile(existing.coverImage.path);
            }

            update.coverImage = data.coverImage;

        }

        await tenantCollection(tenantId, "pageCategories").doc(categoryId).update(update);

        return true;

    }

    // 刪除分類：如果這個分類底下還有子分類，子分類會被拉回頂層（不會被連坐刪除），跟項目沒有分類時只是變未分類是同一套邏輯
    async removeCategory(tenantId, categoryId) {

        const snapshot = await tenantCollection(tenantId, "pageCategories").where("parentCategoryId", "==", categoryId).get();

        await Promise.all(snapshot.docs.map(doc => doc.ref.update({ parentCategoryId: "" })));

        // 分類一樣搬進資源回收桶，復原時用原本的 id 放回去，底下作品的分類欄位就又對得上了
        await trashService.moveToTrash(tenantId, "pageCategories", categoryId);

        return true;

    }

    async removeCategories(tenantId, ids) {

        await Promise.all(ids.map(id => this.removeCategory(tenantId, id)));

        return true;

    }

    async moveCategory(tenantId, pageId, categoryId, direction) {

        let categories = await this.getCategories(tenantId, pageId);

        const needsBackfill = categories.some(cat => typeof cat.sortOrder !== "number");

        if (needsBackfill) {

            await Promise.all(categories.map((cat, i) =>
                tenantCollection(tenantId, "pageCategories").doc(cat.id).update({ sortOrder: categories.length - i })
            ));

            categories = categories.map((cat, i) => ({ ...cat, sortOrder: categories.length - i }));

        }

        // 只能在同一層（同樣的上層分類）裡上移/下移，子分類不會跟頂層分類混在一起排序
        const movingCategory = categories.find(cat => cat.id === categoryId);

        if (!movingCategory) {
            return false;
        }

        const siblings = categories.filter(cat => (cat.parentCategoryId || "") === (movingCategory.parentCategoryId || ""));

        const index = siblings.findIndex(cat => cat.id === categoryId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= siblings.length) {
            return false;
        }

        const current = siblings[index];
        const target = siblings[targetIndex];

        await Promise.all([
            tenantCollection(tenantId, "pageCategories").doc(current.id).update({ sortOrder: target.sortOrder }),
            tenantCollection(tenantId, "pageCategories").doc(target.id).update({ sortOrder: current.sortOrder })
        ]);

        return true;

    }

    // 拖拉排序：orderedIds 只會是「同一層」（同樣的上層分類）那組分類的完整 id 順序，
    // applyReorder 只會動到這幾筆，其他層的分類不受影響
    async reorderCategories(tenantId, pageId, orderedIds) {

        let categories = await this.getCategories(tenantId, pageId);

        const needsBackfill = categories.some(cat => typeof cat.sortOrder !== "number");

        if (needsBackfill) {

            await Promise.all(categories.map((cat, i) =>
                tenantCollection(tenantId, "pageCategories").doc(cat.id).update({ sortOrder: categories.length - i })
            ));

            categories = categories.map((cat, i) => ({ ...cat, sortOrder: categories.length - i }));

        }

        await applyReorder(tenantCollection(tenantId, "pageCategories"), categories, orderedIds);

        return true;

    }

    // ===== 項目 =====

    async getItems(tenantId, pageId) {

        try {

            const snapshot = await tenantCollection(tenantId, "pageItems").where("pageId", "==", pageId).get();

            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            return items.sort((a, b) => {

                const orderA = typeof a.sortOrder === "number" ? a.sortOrder : -Infinity;
                const orderB = typeof b.sortOrder === "number" ? b.sortOrder : -Infinity;

                if (orderA !== orderB) {
                    return orderB - orderA;
                }

                const timeA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;

                return timeB - timeA;

            });

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async getPublishedItems(tenantId, pageId) {

        const all = await this.getItems(tenantId, pageId);

        return all.filter(item => isEffectivelyPublished(item));

    }

    async getItemById(tenantId, itemId) {

        try {

            const doc = await tenantCollection(tenantId, "pageItems").doc(itemId).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() };

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    async getItemBySlug(tenantId, pageId, slug) {

        try {

            const snapshot = await tenantCollection(tenantId, "pageItems")
                .where("pageId", "==", pageId)
                .where("slug", "==", slug)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];

            return { id: doc.id, ...doc.data() };

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    async slugExists(tenantId, pageId, slug, excludeId) {

        const existing = await this.getItemBySlug(tenantId, pageId, slug);

        return existing !== null && existing.id !== excludeId;

    }

    async uploadImages(files, folder) {

        // 逐張上傳壓縮，同時處理整批大照片會把伺服器記憶體撐爆（見 config/uploadLimits.js）
        const uploads = [];
        for (const file of files) {
            uploads.push(await storageService.uploadBuffer(file.buffer, fixUploadName(file.originalname), file.mimetype, folder));
        }

        return uploads.map(upload => ({ id: crypto.randomUUID(), type: "image", url: upload.url, path: upload.path }));

    }

    async create(tenantId, pageId, data, files) {

        const uploadedImages = files && files.length > 0 ? await this.uploadImages(files, "pageItems") : [];

        // 從媒體庫直接選的照片，沿用現成的檔案不重新上傳，所以 path 是空的
        const mediaImages = (data.mediaImages || []).map(image => ({
            id: crypto.randomUUID(),
            type: "image",
            url: image.url,
            path: "",
            alt: image.alt || "",
            ...(image.name ? { sourceName: image.name } : {})
        }));

        const images = [...mediaImages, ...uploadedImages];

        const existing = await this.getItems(tenantId, pageId);
        const maxOrder = existing.reduce((max, item) => Math.max(max, typeof item.sortOrder === "number" ? item.sortOrder : 0), 0);

        const item = {
            pageId,
            slug: data.slug,
            title: data.title || "",
            description: data.description || "",
            metaDescription: data.metaDescription || "",
            author: data.author || "",
            link: data.link || "",
            // 影片比例：短影音是直式 9:16，其餘一律當橫式 16:9
            videoRatio: data.videoRatio === "9:16" ? "9:16" : "16:9",
            category: data.category || "",
            published: !!data.published,
            publishAt: parseDatetimeLocal(data.publishAt),
            galleryLayout: data.galleryLayout || "grid",
            coverPosition: sanitizeCoverPosition(data.coverPosition),
            images,
            coverImage: data.coverImage || null,
            modules: [],
            sortOrder: maxOrder + 1,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "pageItems").add(item);

        return { id: ref.id, ...item };

    }

    async update(tenantId, id, data, files) {

        const existing = await this.getItemById(tenantId, id);

        if (!existing) {
            return false;
        }

        const images = existing.images || [];

        if (files && files.length > 0) {
            images.push(...await this.uploadImages(files, "pageItems"));
        }

        await tenantCollection(tenantId, "pageItems").doc(id).update({
            slug: data.slug,
            title: data.title || "",
            description: data.description || "",
            metaDescription: data.metaDescription || "",
            author: data.author || "",
            link: data.link || "",
            // 影片比例：短影音是直式 9:16，其餘一律當橫式 16:9
            videoRatio: data.videoRatio === "9:16" ? "9:16" : "16:9",
            category: data.category || "",
            published: !!data.published,
            publishAt: parseDatetimeLocal(data.publishAt),
            galleryLayout: data.galleryLayout || "grid",
            coverPosition: sanitizeCoverPosition(data.coverPosition),
            images,
            updatedAt: new Date()
        });

        return true;

    }

    async addFromMedia(tenantId, id, mediaFiles) {

        const existing = await this.getItemById(tenantId, id);

        if (!existing) {
            return false;
        }

        const images = existing.images || [];

        mediaFiles.forEach(file => {
            images.push({ id: crypto.randomUUID(), type: "image", url: file.url, path: "" });
        });

        await tenantCollection(tenantId, "pageItems").doc(id).update({ images, updatedAt: new Date() });

        return true;

    }

    async addVideoItem(tenantId, id, videoUrl, coverFile, caption) {

        const existing = await this.getItemById(tenantId, id);

        if (!existing) {
            return false;
        }

        let cover = null;

        if (coverFile) {
            cover = await storageService.uploadBuffer(coverFile.buffer, coverFile.originalname, coverFile.mimetype, "pageItems");
        }

        const images = existing.images || [];

        images.push({
            id: crypto.randomUUID(),
            type: "video",
            videoUrl,
            caption: caption || "",
            url: cover ? cover.url : "",
            path: cover ? cover.path : ""
        });

        await tenantCollection(tenantId, "pageItems").doc(id).update({ images, updatedAt: new Date() });

        return true;

    }

    async updateImageAlt(tenantId, itemId, imageId, alt) {

        const existing = await this.getItemById(tenantId, itemId);

        if (!existing) {
            return false;
        }

        const images = (existing.images || []).map(image =>
            image.id === imageId ? { ...image, alt: alt || "" } : image
        );

        await tenantCollection(tenantId, "pageItems").doc(itemId).update({ images });

        return true;

    }

    // 相簿照片拖拉排序：照傳進來的 id 順序重排，沒列到的照片（例如排序途中另外新增的）接在最後面不會不見
    async reorderImages(tenantId, itemId, orderedIds) {

        const existing = await this.getItemById(tenantId, itemId);

        if (!existing) {
            return false;
        }

        const images = existing.images || [];
        const byId = new Map(images.map(image => [image.id, image]));
        const ordered = orderedIds.map(id => byId.get(id)).filter(Boolean);
        const rest = images.filter(image => !orderedIds.includes(image.id));

        await tenantCollection(tenantId, "pageItems").doc(itemId).update({ images: [...ordered, ...rest] });

        return true;

    }

    async removeImage(tenantId, itemId, imageId) {

        const existing = await this.getItemById(tenantId, itemId);

        if (!existing) {
            return false;
        }

        const target = (existing.images || []).find(image => image.id === imageId);

        if (!target) {
            return false;
        }

        if (target.path) {
            await storageService.deleteFile(target.path);
        }

        const images = (existing.images || []).filter(image => image.id !== imageId);

        await tenantCollection(tenantId, "pageItems").doc(itemId).update({ images });

        return true;

    }

    // 移除封面：影片作品會改回用 YouTube 縮圖、照片作品改用相簿第一張（2026/10/04）
    // 封面是自己上傳的（有 path）才刪檔案；從媒體庫選的檔案屬於媒體庫，不能刪
    async removeCoverImage(tenantId, id) {

        const existing = await this.getItemById(tenantId, id);

        if (!existing) {
            return false;
        }

        if (existing.coverImage && existing.coverImage.path) {
            await storageService.deleteFile(existing.coverImage.path);
        }

        await tenantCollection(tenantId, "pageItems").doc(id).update({ coverImage: null, updatedAt: new Date() });

        return true;

    }

    async setCoverImage(tenantId, id, file) {

        const existing = await this.getItemById(tenantId, id);

        if (!existing) {
            return false;
        }

        if (existing.coverImage && existing.coverImage.path) {
            await storageService.deleteFile(existing.coverImage.path);
        }

        const uploaded = await storageService.uploadBuffer(file.buffer, file.originalname, file.mimetype, "pageItems");

        const coverImage = { url: uploaded.url, path: uploaded.path };

        await tenantCollection(tenantId, "pageItems").doc(id).update({ coverImage });

        return coverImage;

    }

    async moveItem(tenantId, pageId, id, direction) {

        let items = await this.getItems(tenantId, pageId);

        const needsBackfill = items.some(item => typeof item.sortOrder !== "number");

        if (needsBackfill) {

            await Promise.all(items.map((item, i) =>
                tenantCollection(tenantId, "pageItems").doc(item.id).update({ sortOrder: items.length - i })
            ));

            items = items.map((item, i) => ({ ...item, sortOrder: items.length - i }));

        }

        const index = items.findIndex(item => item.id === id);

        if (index === -1) {
            return false;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= items.length) {
            return false;
        }

        const current = items[index];
        const target = items[targetIndex];

        await Promise.all([
            tenantCollection(tenantId, "pageItems").doc(current.id).update({ sortOrder: target.sortOrder }),
            tenantCollection(tenantId, "pageItems").doc(target.id).update({ sortOrder: current.sortOrder })
        ]);

        return true;

    }

    // 拖拉排序：orderedIds 是拖拉後由上到下的完整 id 順序
    async reorderItems(tenantId, pageId, orderedIds) {

        let items = await this.getItems(tenantId, pageId);

        const needsBackfill = items.some(item => typeof item.sortOrder !== "number");

        if (needsBackfill) {

            await Promise.all(items.map((item, i) =>
                tenantCollection(tenantId, "pageItems").doc(item.id).update({ sortOrder: items.length - i })
            ));

            items = items.map((item, i) => ({ ...item, sortOrder: items.length - i }));

        }

        await applyReorder(tenantCollection(tenantId, "pageItems"), items, orderedIds);

        return true;

    }

    // 刪除＝搬進資源回收桶（services/trashService.js），照片檔案保留，可以從後台「最近刪除」復原
    async remove(tenantId, id) {

        return trashService.moveToTrash(tenantId, "pageItems", id);

    }

    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

    // 刪除一個分類清單頁面時一併清掉底下所有分類跟項目（含項目的圖片檔案），避免孤兒資料留在資料庫裡
    async removeAllForPage(tenantId, pageId) {

        const [categories, items] = await Promise.all([
            this.getCategories(tenantId, pageId),
            this.getItems(tenantId, pageId)
        ]);

        await Promise.all(items.map(item => this.remove(tenantId, item.id)));
        await Promise.all(categories.map(category => this.removeCategory(tenantId, category.id)));

        return true;

    }

    // ===== 項目詳細頁的內容模組（自由排版用，跟自訂頁面本身用法一致） =====

    docRef(tenantId, itemId) {
        return tenantCollection(tenantId, "pageItems").doc(itemId);
    }

    async addModule(tenantId, itemId, type) {
        return moduleService.addModule(this.docRef(tenantId, itemId), type);
    }

    async updateModule(tenantId, itemId, moduleId, data, background, backgroundColor) {
        return moduleService.updateModule(this.docRef(tenantId, itemId), moduleId, data, background, backgroundColor);
    }

    async removeModule(tenantId, itemId, moduleId) {
        return moduleService.removeModule(this.docRef(tenantId, itemId), moduleId);
    }

    async moveModule(tenantId, itemId, moduleId, direction) {
        return moduleService.moveModule(this.docRef(tenantId, itemId), moduleId, direction);
    }

    async reorderModules(tenantId, itemId, orderedIds) {
        return moduleService.reorderModules(this.docRef(tenantId, itemId), orderedIds);
    }

}

module.exports = new CollectionService();
