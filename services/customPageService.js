const { tenantCollection } = require("../config/firebase");
const moduleService = require("./moduleService");
const storageService = require("./storageService");
const { isEffectivelyPublished, parseDatetimeLocal } = require("./publishHelper");

class CustomPageService {

    async getAll(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "customPages").orderBy("createdAt", "desc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    // 站上可能不只一個「分類清單型」頁面（例如作品拆成 PHOTOGRAPHY／FILM 兩個獨立頁面），
    // 首頁精選作品、後台儀表板統計、精選作品輪播選擇器都要橫跨全部這種頁面抓資料，
    // 不能再假設「作品集」永遠只有一個固定 slug（historically 是 "projects"）
    async getCollectionPages(tenantId, { publishedOnly = false } = {}) {

        const all = await this.getAll(tenantId);
        const collectionPages = all.filter(page => page.pageType === "collection");

        return publishedOnly ? collectionPages.filter(page => isEffectivelyPublished(page)) : collectionPages;

    }

    async getPublished(tenantId) {

        const all = await this.getAll(tenantId);

        return all.filter(page => isEffectivelyPublished(page));

    }

    async getById(tenantId, id) {

        try {

            const doc = await tenantCollection(tenantId, "customPages").doc(id).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() };

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    async getBySlug(tenantId, slug) {

        try {

            const snapshot = await tenantCollection(tenantId, "customPages").where("slug", "==", slug).limit(1).get();

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

    async slugExists(tenantId, slug, excludeId) {

        const existing = await this.getBySlug(tenantId, slug);

        return existing !== null && existing.id !== excludeId;

    }

    async create(tenantId, data) {

        const page = {
            slug: data.slug,
            title: data.title,
            subtitle: data.subtitle || "",
            titleSize: ["small", "medium", "large", "xlarge"].includes(data.titleSize) ? data.titleSize : "medium",
            metaDescription: data.metaDescription || "",
            pageType: data.pageType === "collection" ? "collection" : "content",
            contentKind: data.pageType === "collection" && data.contentKind === "article" ? "article" : "portfolio",
            modules: [],
            published: data.published,
            publishAt: parseDatetimeLocal(data.publishAt),
            navParent: data.navParent || "",
            backgroundImage: "",
            backgroundImagePath: "",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "customPages").add(page);

        return { id: ref.id, ...page };

    }

    async update(tenantId, id, data, backgroundImageFile) {

        const update = {
            slug: data.slug,
            title: data.title,
            subtitle: data.subtitle || "",
            titleSize: ["small", "medium", "large", "xlarge"].includes(data.titleSize) ? data.titleSize : "medium",
            metaDescription: data.metaDescription || "",
            published: data.published,
            publishAt: parseDatetimeLocal(data.publishAt),
            navParent: data.navParent || "",
            updatedAt: new Date()
        };

        if (backgroundImageFile || data.backgroundImageMediaUrl || data.removeBackgroundImage) {

            const existing = await this.getById(tenantId, id);

            if (existing && existing.backgroundImagePath) {
                await storageService.deleteFile(existing.backgroundImagePath);
            }

            if (backgroundImageFile) {

                const uploaded = await storageService.uploadBuffer(backgroundImageFile.buffer, backgroundImageFile.originalname, backgroundImageFile.mimetype, "pages");

                update.backgroundImage = uploaded.url;
                update.backgroundImagePath = uploaded.path;

            } else if (data.backgroundImageMediaUrl) {

                // 直接沿用媒體庫裡現成的檔案，不重新上傳一份，所以不記錄 path
                update.backgroundImage = data.backgroundImageMediaUrl;
                update.backgroundImagePath = "";

            } else {

                update.backgroundImage = "";
                update.backgroundImagePath = "";

            }

        }

        await tenantCollection(tenantId, "customPages").doc(id).update(update);

        return true;

    }

    async remove(tenantId, id) {

        await tenantCollection(tenantId, "customPages").doc(id).delete();

        return true;

    }

    // 批次刪除多個自訂頁面
    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

    docRef(tenantId, pageId) {
        return tenantCollection(tenantId, "customPages").doc(pageId);
    }

    async addModule(tenantId, pageId, type) {
        return moduleService.addModule(this.docRef(tenantId, pageId), type);
    }

    async updateModule(tenantId, pageId, moduleId, data, background, backgroundColor) {
        return moduleService.updateModule(this.docRef(tenantId, pageId), moduleId, data, background, backgroundColor);
    }

    async removeModule(tenantId, pageId, moduleId) {
        return moduleService.removeModule(this.docRef(tenantId, pageId), moduleId);
    }

    async moveModule(tenantId, pageId, moduleId, direction) {
        return moduleService.moveModule(this.docRef(tenantId, pageId), moduleId, direction);
    }

    async reorderModules(tenantId, pageId, orderedIds) {
        return moduleService.reorderModules(this.docRef(tenantId, pageId), orderedIds);
    }

}

module.exports = new CustomPageService();
