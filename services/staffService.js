const { tenantCollection } = require("../config/firebase");
const storageService = require("./storageService");

class StaffService {

    async getAll(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "staff").orderBy("createdAt", "desc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async getActive(tenantId) {

        const all = await this.getAll(tenantId);

        return all.filter(member => member.active);

    }

    async getById(tenantId, id) {

        try {

            const doc = await tenantCollection(tenantId, "staff").doc(id).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() };

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    async create(tenantId, data) {

        const member = {
            name: data.name,
            bio: data.bio || "",
            active: data.active,
            avatarUrl: "",
            avatarPath: "",
            createdAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "staff").add(member);

        return { id: ref.id, ...member };

    }

    async update(tenantId, id, data) {

        const existing = await this.getById(tenantId, id);

        if (!existing) {
            return false;
        }

        await tenantCollection(tenantId, "staff").doc(id).update({
            name: data.name,
            bio: data.bio || "",
            active: data.active
        });

        return true;

    }

    // 上傳/更換大頭照（獨立於其他欄位，選好圖片立即上傳，不用等整個表單送出）
    async setAvatar(tenantId, id, file) {

        const existing = await this.getById(tenantId, id);

        if (!existing) {
            return false;
        }

        if (existing.avatarPath) {
            await storageService.deleteFile(existing.avatarPath);
        }

        const uploaded = await storageService.uploadBuffer(file.buffer, file.originalname, file.mimetype, "staff");

        await tenantCollection(tenantId, "staff").doc(id).update({ avatarUrl: uploaded.url, avatarPath: uploaded.path });

        return { avatarUrl: uploaded.url, avatarPath: uploaded.path };

    }

    // 從媒體庫挑選既有圖片當大頭照（不重新上傳，path 留空避免刪除時誤刪媒體庫共用檔案）
    async setAvatarFromMedia(tenantId, id, url) {

        const existing = await this.getById(tenantId, id);

        if (!existing) {
            return false;
        }

        if (existing.avatarPath) {
            await storageService.deleteFile(existing.avatarPath);
        }

        await tenantCollection(tenantId, "staff").doc(id).update({ avatarUrl: url, avatarPath: "" });

        return { avatarUrl: url, avatarPath: "" };

    }

    async remove(tenantId, id) {

        const existing = await this.getById(tenantId, id);

        if (!existing) {
            return false;
        }

        if (existing.avatarPath) {
            await storageService.deleteFile(existing.avatarPath);
        }

        await tenantCollection(tenantId, "staff").doc(id).delete();

        return true;

    }

    // 批次刪除多位預約人員
    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

}

module.exports = new StaffService();
