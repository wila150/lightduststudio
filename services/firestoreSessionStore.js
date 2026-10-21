// 登入狀態（express-session）存到 Firestore（2026/10/04）：
// 原本用預設的記憶體儲存，Render 每次部署或閒置休眠重啟，所有人就被登出；後台頁面還開著時，
// 抓資料的請求會被導到登入頁，畫面只看到「載入失敗」。存到 Firestore 之後重啟也不會掉。
const session = require("express-session");
const { db } = require("../config/firebase");

const COLLECTION = "cmsSessions";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

// 後台一個畫面會連續發好幾個請求（頁面、JSON、即時通道），每個都讀一次 Firestore 太浪費：
// 讀到的 session 在記憶體留 1 分鐘；rolling 造成的「延長有效期」寫入每個 session 10 分鐘最多一次
const READ_CACHE_MS = 60 * 1000;
const TOUCH_EVERY_MS = 10 * 60 * 1000;
const readCache = new Map(); // sid → { sess, at }
const lastTouch = new Map(); // sid → 時間

class FirestoreSessionStore extends session.Store {

    constructor() {
        super();
        // 每 6 小時清掉過期的登入紀錄
        setInterval(() => this.cleanup().catch(() => {}), 6 * 60 * 60 * 1000).unref();
    }

    expiresAt(sess) {
        const expires = sess && sess.cookie && sess.cookie.expires;
        return expires ? new Date(expires) : new Date(Date.now() + DEFAULT_TTL_MS);
    }

    get(sid, callback) {
        const cached = readCache.get(sid);
        if (cached && Date.now() - cached.at < READ_CACHE_MS) {
            return callback(null, cached.sess);
        }
        db.collection(COLLECTION).doc(sid).get()
            .then(doc => {
                if (!doc.exists) return callback(null, null);
                const data = doc.data();
                if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
                    doc.ref.delete().catch(() => {});
                    return callback(null, null);
                }
                const sess = JSON.parse(data.session);
                if (readCache.size > 1000) readCache.clear();
                readCache.set(sid, { sess, at: Date.now() });
                callback(null, sess);
            })
            .catch(error => callback(error));
    }

    set(sid, sess, callback = () => {}) {
        readCache.set(sid, { sess, at: Date.now() });
        lastTouch.set(sid, Date.now());
        db.collection(COLLECTION).doc(sid)
            .set({ session: JSON.stringify(sess), expiresAt: this.expiresAt(sess), updatedAt: new Date() })
            .then(() => callback(null))
            .catch(error => callback(error));
    }

    touch(sid, sess, callback = () => {}) {
        if (Date.now() - (lastTouch.get(sid) || 0) < TOUCH_EVERY_MS) {
            return callback(null);
        }
        if (lastTouch.size > 1000) lastTouch.clear();
        lastTouch.set(sid, Date.now());
        db.collection(COLLECTION).doc(sid)
            .set({ expiresAt: this.expiresAt(sess), updatedAt: new Date() }, { merge: true })
            .then(() => callback(null))
            .catch(error => callback(error));
    }

    destroy(sid, callback = () => {}) {
        readCache.delete(sid);
        lastTouch.delete(sid);
        db.collection(COLLECTION).doc(sid).delete()
            .then(() => callback(null))
            .catch(error => callback(error));
    }

    async cleanup() {
        const snapshot = await db.collection(COLLECTION).where("expiresAt", "<", new Date()).limit(400).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        if (!snapshot.empty) await batch.commit();
    }

}

module.exports = FirestoreSessionStore;
