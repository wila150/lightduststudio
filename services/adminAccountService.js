const { auth } = require("../config/firebase");

// CMS 帳號管理：直接操作 Firebase Auth 使用者跟 custom claims（role/tenantId），
// 比照 scripts/setGoogleAdminClaims.js 的邏輯，只是包成後台可以按按鈕操作的版本
class AdminAccountService {

    async list() {

        const result = await auth.listUsers(1000);

        return result.users
            .map(user => ({
                uid: user.uid,
                // 舊的 Google 登入帳號可能沒有補寫 email 屬性，退而找 providerData 裡 Google 提供的 email
                email: user.email || (user.providerData.find(p => p.email) || {}).email || "（無 email）",
                providers: user.providerData.map(p => p.providerId),
                role: user.customClaims && user.customClaims.role,
                tenantId: user.customClaims && user.customClaims.tenantId,
                lastSignInTime: user.metadata.lastSignInTime,
                creationTime: user.metadata.creationTime
            }))
            .sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime));

    }

    // email 不存在就建立新帳號（有帶密碼就一起設定，讓帳密登入立刻可用），
    // 已存在就沿用現有帳號只更新 claims——這樣不管對方是先用 Google 登入過還是全新的都能處理
    async createOrGrant(email, password, role, tenantId) {

        let userRecord;

        try {

            userRecord = await auth.getUserByEmail(email);

            if (password) {
                await auth.updateUser(userRecord.uid, { password });
            }

        } catch (error) {

            if (error.code !== "auth/user-not-found") {
                throw error;
            }

            userRecord = await auth.createUser(password ? { email, password } : { email });

        }

        const claims = { role };

        if (tenantId) {
            claims.tenantId = tenantId;
        }

        await auth.setCustomUserClaims(userRecord.uid, claims);

        return userRecord.uid;

    }

    async updateRole(uid, role, tenantId) {

        const claims = { role };

        if (tenantId) {
            claims.tenantId = tenantId;
        }

        await auth.setCustomUserClaims(uid, claims);

        return true;

    }

    async remove(uid) {

        await auth.deleteUser(uid);

        return true;

    }

}

module.exports = new AdminAccountService();
