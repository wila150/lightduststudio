const { tenantCollection } = require("../config/firebase");

class MessageService {

    async create(tenantId, { name, email, subject, message }) {

        const data = {
            name,
            email,
            subject: subject || "",
            message,
            read: false,
            createdAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "messages").add(data);

        // 推給開著的後台分頁：右下角跳通知、未讀紅點、桌面通知（services/liveHub.js）
        try {
            require("./liveHub").broadcast("message", {
                id: ref.id,
                name: name || "（未留名字）",
                preview: String(subject || message || "").replace(/\s+/g, " ").slice(0, 60),
                email: email || "",
                subject: subject || "",
                message: message || "",
                unread: await this.unreadCount(tenantId),
                ts: Date.now()
            });
        } catch (error) {
            console.warn("[live] message broadcast", error.message);
        }

        return { id: ref.id, ...data };

    }

    // 批次更新欄位（已讀／未讀、星號），Firestore 一個 batch 最多 500 筆
    async updateMany(tenantId, ids, fields) {

        for (let i = 0; i < ids.length; i += 450) {
            const batch = require("../config/firebase").db.batch();
            ids.slice(i, i + 450).forEach(id => batch.update(tenantCollection(tenantId, "messages").doc(id), fields));
            await batch.commit();
        }

        return true;

    }

    // 全部標為已讀
    async markAllRead(tenantId) {

        const snapshot = await tenantCollection(tenantId, "messages").where("read", "==", false).get();

        await this.updateMany(tenantId, snapshot.docs.map(doc => doc.id), { read: true });

        return snapshot.size;

    }

    async unreadCount(tenantId) {

        try {
            const snapshot = await tenantCollection(tenantId, "messages").where("read", "==", false).count().get();
            return snapshot.data().count;
        } catch (error) {
            return 0;
        }

    }

    async get(tenantId, id) {

        const snap = await tenantCollection(tenantId, "messages").doc(id).get();

        return snap.exists ? { id: snap.id, ...snap.data() } : null;

    }

    // 後台回覆過的內容（目前是回 LINE 客人），依序記在留言上
    async addReply(tenantId, id, reply) {

        const { FieldValue } = require("firebase-admin/firestore");

        await tenantCollection(tenantId, "messages").doc(id).update({ replies: FieldValue.arrayUnion(reply), read: true });

    }

    async list(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "messages").orderBy("createdAt", "desc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    // 刪除＝搬進資源回收桶，可以在留言頁「最近刪除」復原（services/trashService.js）
    async remove(tenantId, id) {

        return require("./trashService").moveToTrash(tenantId, "messages", id);

    }

    // 批次刪除多筆留言
    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

    // 切換單筆留言的已讀/未讀狀態
    async setRead(tenantId, id, read) {

        await tenantCollection(tenantId, "messages").doc(id).update({ read: !!read });

        return true;

    }

}

module.exports = new MessageService();
