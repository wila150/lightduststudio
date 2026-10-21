const { auth } = require("../config/firebase");
const { DEFAULT_TENANT_ID } = require("../config/tenant");

class AuthService {

    // Google 登入（signInWithIdp）建立/連結帳號時不會自動寫入 email 屬性，
    // 只有已經有 email 才補寫，且已經有就不用重複打 API
    async backfillEmail(uid, email) {

        const userRecord = await auth.getUser(uid);

        if (userRecord.email === email) {
            return;
        }

        await auth.updateUser(uid, { email, emailVerified: true });

    }

    // idToken 是前端用 Firebase Web SDK 登入後拿到的 ID token
    async verifyIdToken(idToken) {

        try {

            const decoded = await auth.verifyIdToken(idToken);

            const role = decoded.role;

            if (!role) {
                return {
                    success: false,
                    message: "此帳號尚未設定權限，請聯絡管理員"
                };
            }

            // superadmin 不綁定特定租戶，Phase 1/2 先讓 superadmin 直接管理預設租戶
            const tenantId = decoded.tenantId || (role === "superadmin" ? DEFAULT_TENANT_ID : null);

            if (!tenantId) {
                return {
                    success: false,
                    message: "此帳號尚未指派租戶，請聯絡管理員"
                };
            }

            return {
                success: true,
                user: {
                    id: decoded.uid,
                    username: decoded.email,
                    name: decoded.name || decoded.email,
                    email: decoded.email,
                    role,
                    tenantId
                }
            };

        } catch (error) {

            console.error(error);

            return {
                success: false,
                message: "登入失敗，請重新登入"
            };

        }

    }

}

module.exports = new AuthService();
