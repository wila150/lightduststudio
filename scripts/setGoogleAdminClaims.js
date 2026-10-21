require("dotenv").config();
const { auth } = require("../config/firebase");
const { DEFAULT_TENANT_ID } = require("../config/tenant");

// 幫用 Google 帳號登入的使用者設定 role/tenantId custom claims。
// 若該 email 還沒有 Firebase Auth 帳號會先建立一個（不設密碼），
// 之後這個人用同一個 Google 帳號登入時會自動對應到這筆帳號。
//
// 用法：node scripts/setGoogleAdminClaims.js <email> <role> [tenantId]
// role 是 superadmin 時可省略 tenantId，會用預設租戶

async function setGoogleAdminClaims() {

    const [email, role, tenantIdArg] = process.argv.slice(2);

    if (!email || !role) {
        console.log("用法：node scripts/setGoogleAdminClaims.js <email> <role> [tenantId]");
        process.exit(1);
    }

    const tenantId = tenantIdArg || (role === "superadmin" ? DEFAULT_TENANT_ID : null);

    if (!tenantId) {
        console.log("非 superadmin 角色必須指定 tenantId");
        process.exit(1);
    }

    try {

        let userRecord;

        try {

            userRecord = await auth.getUserByEmail(email);

            console.log(`✅ ${email} 已存在 Firebase Auth 帳號，更新 claims`);

        } catch (error) {

            if (error.code === "auth/user-not-found") {

                userRecord = await auth.createUser({ email });

                console.log(`✅ 建立 Firebase Auth 帳號：${email}（尚未登入過，等使用者第一次用 Google 登入即可對應到這筆帳號）`);

            } else {

                throw error;

            }

        }

        const claims = { role, tenantId };

        await auth.setCustomUserClaims(userRecord.uid, claims);

        console.log(`✅ ${email} custom claims：${JSON.stringify(claims)}`);

        process.exit();

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}

setGoogleAdminClaims();
