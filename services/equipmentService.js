const { tenantCollection } = require("../config/firebase");
const { applyReorder } = require("./reorderHelper");

// 設備類別：值存進資料庫，標籤顯示在後台下拉與前台分組標題
const EQUIPMENT_CATEGORIES = [
    { value: "camera", label: "相機機身", labelEn: "Camera" },
    { value: "lens", label: "鏡頭", labelEn: "Lens" },
    { value: "drone", label: "空拍機", labelEn: "Drone" },
    { value: "stabilizer", label: "穩定器", labelEn: "Stabilizer" },
    { value: "lighting", label: "燈光", labelEn: "Lighting" },
    { value: "audio", label: "收音", labelEn: "Audio" },
    { value: "other", label: "其他", labelEn: "Other" }
];

function cleanCategory(value) {
    return EQUIPMENT_CATEGORIES.some(c => c.value === value) ? value : "other";
}

function fieldsFromBody(body) {
    return {
        name: String(body.name || "").trim(),
        brand: String(body.brand || "").trim(),
        category: cleanCategory(body.category),
        description: String(body.description || "").trim(),
        featured: body.featured === "on" || body.featured === true
    };
}

class EquipmentService {

    collection(tenantId) {
        return tenantCollection(tenantId, "equipment");
    }

    // 順序跟其他可拖拉清單一樣：sortOrder 大的在前（applyReorder 依這個規則重新分配）
    async getAll(tenantId) {

        try {

            const snapshot = await this.collection(tenantId).orderBy("sortOrder", "desc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async create(tenantId, body, photo = {}) {

        const item = {
            ...fieldsFromBody(body),
            photoUrl: photo.url || "",
            // 新增的排到最後：時間越晚 sortOrder 越小
            sortOrder: -Date.now(),
            createdAt: new Date()
        };

        if (!item.name) {
            return null;
        }

        const ref = await this.collection(tenantId).add(item);

        return { id: ref.id, ...item };

    }

    async update(tenantId, id, body) {

        const fields = fieldsFromBody(body);

        if (!fields.name) {
            return false;
        }

        await this.collection(tenantId).doc(id).update(fields);

        return true;

    }

    async setPhoto(tenantId, id, url) {

        await this.collection(tenantId).doc(id).update({ photoUrl: url || "" });

        return true;

    }

    async remove(tenantId, id) {

        await this.collection(tenantId).doc(id).delete();

        return true;

    }

    async reorder(tenantId, ids) {

        const docs = await this.getAll(tenantId);

        await applyReorder(this.collection(tenantId), docs, ids);

    }

    // 頁面上有「設備清單」模組時，渲染前把設備資料塞進模組 context（沒有的頁面不查）
    async contextFor(tenantId, modules) {

        if (!(modules || []).some(m => m.type === "equipmentGrid")) {
            return {};
        }

        return { equipment: await this.getAll(tenantId) };

    }

}

module.exports = new EquipmentService();
module.exports.EQUIPMENT_CATEGORIES = EQUIPMENT_CATEGORIES;
