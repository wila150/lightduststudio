const { tenantCollection } = require("../config/firebase");
const { applyReorder } = require("./reorderHelper");

// 導覽列項目清單（CMS 可自行新增/編輯/刪除/排序/顯示或隱藏）
// target.type === "url"：指到一個固定網址（例如 /booking）
// target.type === "page"：指到某個自訂頁面，前台渲染時用 pageId 對應目前的 slug（改 slug 不用回來改導覽列）
class NavConfigService {

    async getAll(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "navItems").get();

            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 舊資料沒有 sortOrder 時，用建立時間新到舊當備援排序，確保排序穩定
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

    async getEnabled(tenantId) {

        const all = await this.getAll(tenantId);

        return all.filter(item => item.enabled !== false);

    }

    async getById(tenantId, id) {

        try {

            const doc = await tenantCollection(tenantId, "navItems").doc(id).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() };

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    buildTarget(body) {

        if (body.targetType === "page") {
            return { type: "page", value: "", pageId: body.targetPageId || "" };
        }

        return { type: "url", value: body.targetUrl || "", pageId: "" };

    }

    async create(tenantId, data) {

        const existing = await this.getAll(tenantId);
        const maxOrder = existing.reduce((max, item) => Math.max(max, typeof item.sortOrder === "number" ? item.sortOrder : 0), 0);

        const navItem = {
            label: data.label || "",
            enabled: data.enabled !== false,
            target: this.buildTarget(data),
            showCategories: data.showCategories === true,
            showEmptyCategories: data.showEmptyCategories === true,
            sortOrder: maxOrder + 1,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "navItems").add(navItem);

        return { id: ref.id, ...navItem };

    }

    async update(tenantId, id, data) {

        await tenantCollection(tenantId, "navItems").doc(id).update({
            label: data.label || "",
            enabled: data.enabled !== false,
            target: this.buildTarget(data),
            showCategories: data.showCategories === true,
            showEmptyCategories: data.showEmptyCategories === true,
            updatedAt: new Date()
        });

        return true;

    }

    async remove(tenantId, id) {

        await tenantCollection(tenantId, "navItems").doc(id).delete();

        return true;

    }

    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

    // 上移／下移，跟相鄰項目交換 sortOrder（比照 categoryService.moveCategory）
    async moveNavItem(tenantId, id, direction) {

        let items = await this.getAll(tenantId);

        const needsBackfill = items.some(item => typeof item.sortOrder !== "number");

        if (needsBackfill) {

            await Promise.all(items.map((item, i) =>
                tenantCollection(tenantId, "navItems").doc(item.id).update({ sortOrder: items.length - i })
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
            tenantCollection(tenantId, "navItems").doc(current.id).update({ sortOrder: target.sortOrder }),
            tenantCollection(tenantId, "navItems").doc(target.id).update({ sortOrder: current.sortOrder })
        ]);

        return true;

    }

    // 拖拉排序：orderedIds 是拖拉後由上到下的完整 id 順序
    async reorderNavItems(tenantId, orderedIds) {

        let items = await this.getAll(tenantId);

        const needsBackfill = items.some(item => typeof item.sortOrder !== "number");

        if (needsBackfill) {

            await Promise.all(items.map((item, i) =>
                tenantCollection(tenantId, "navItems").doc(item.id).update({ sortOrder: items.length - i })
            ));

            items = items.map((item, i) => ({ ...item, sortOrder: items.length - i }));

        }

        await applyReorder(tenantCollection(tenantId, "navItems"), items, orderedIds);

        return true;

    }

}

module.exports = new NavConfigService();
