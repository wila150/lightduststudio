const { tenantCollection } = require("../config/firebase");

class ServiceItemService {

    async getAll(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "serviceItems").orderBy("createdAt", "desc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async getActive(tenantId) {

        const all = await this.getAll(tenantId);

        return all.filter(item => item.active);

    }

    async getById(tenantId, id) {

        try {

            const doc = await tenantCollection(tenantId, "serviceItems").doc(id).get();

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

        const item = {
            name: data.name,
            duration: Number(data.duration) || 60,
            price: data.price || "",
            description: data.description || "",
            active: data.active,
            createdAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "serviceItems").add(item);

        return { id: ref.id, ...item };

    }

    async update(tenantId, id, data) {

        await tenantCollection(tenantId, "serviceItems").doc(id).update({
            name: data.name,
            duration: Number(data.duration) || 60,
            price: data.price || "",
            description: data.description || "",
            active: data.active
        });

        return true;

    }

    async remove(tenantId, id) {

        await tenantCollection(tenantId, "serviceItems").doc(id).delete();

        return true;

    }

    // 批次刪除多個服務項目
    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

}

module.exports = new ServiceItemService();
