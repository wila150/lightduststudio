const crypto = require("crypto");
const { defaultData } = require("./moduleTypes");

// 對「某一個 Firestore 文件裡的 modules 陣列」做新增/編輯/刪除/排序
// 不管這份文件是自訂頁面、首頁、關於我還是聯絡我，用法都一樣：傳入該文件的 docRef 即可
class ModuleService {

    async addModule(docRef, type) {

        const doc = await docRef.get();
        const data = doc.data() || {};
        const modules = data.modules || [];

        const module = {
            id: crypto.randomUUID(),
            type,
            data: defaultData(type)
        };

        modules.push(module);

        await docRef.set({ modules, updatedAt: new Date() }, { merge: true });

        return module;

    }

    // background：模組滿版底色分段，"none"（預設，跟頁面底色一樣）、"alt"（用主題的輔助背景色，
    // 跟卡片/頁尾同一色，確保跟現有文字顏色搭配起來不會有對比度問題）或 "custom"（自訂顏色，
    // backgroundColor 存 hex 色碼，文字顏色由前台渲染時依亮度自動選黑或白，見 moduleRenderer.js）
    async updateModule(docRef, moduleId, data, background = "none", backgroundColor = "") {

        const doc = await docRef.get();

        if (!doc.exists) {
            return false;
        }

        const modules = (doc.data().modules || []).map(module =>
            module.id === moduleId ? { ...module, data, background, backgroundColor } : module
        );

        await docRef.update({ modules, updatedAt: new Date() });

        return true;

    }

    async removeModule(docRef, moduleId) {

        const doc = await docRef.get();

        if (!doc.exists) {
            return false;
        }

        const modules = (doc.data().modules || []).filter(module => module.id !== moduleId);

        await docRef.update({ modules, updatedAt: new Date() });

        return true;

    }

    async moveModule(docRef, moduleId, direction) {

        const doc = await docRef.get();

        if (!doc.exists) {
            return false;
        }

        const modules = [...(doc.data().modules || [])];
        const index = modules.findIndex(module => module.id === moduleId);

        if (index === -1) {
            return false;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= modules.length) {
            return false;
        }

        [modules[index], modules[targetIndex]] = [modules[targetIndex], modules[index]];

        await docRef.update({ modules, updatedAt: new Date() });

        return true;

    }

    // 拖拉排序：orderedIds 是拖拉後由上到下的完整 id 順序。萬一傳進來的清單漏掉某個模組
    // （理論上不會發生），把它補回原本的位置，不要讓模組憑空消失
    async reorderModules(docRef, orderedIds) {

        const doc = await docRef.get();

        if (!doc.exists) {
            return false;
        }

        const modules = doc.data().modules || [];
        const byId = new Map(modules.map(module => [module.id, module]));

        const reordered = orderedIds.map(id => byId.get(id)).filter(Boolean);
        modules.forEach(module => {
            if (!orderedIds.includes(module.id)) {
                reordered.push(module);
            }
        });

        await docRef.update({ modules: reordered, updatedAt: new Date() });

        return true;

    }

}

module.exports = new ModuleService();
