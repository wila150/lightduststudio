require("dotenv").config();
const { db, auth } = require("../config/firebase");

// 把 admins/*（superadmin）跟 tenants/{tenantId}/members/*（tenant_admin/tenant_editor）
// 建立成真正的 Firebase Authentication 帳號，並設定 tenantId/role 的 custom claims
//
// 用法：node scripts/migrateToFirebaseAuth.js <新密碼>
// 因為原本是 bcrypt hash，沒辦法還原成明文，所有帳號這次統一設成同一組新密碼，
// 之後有多個真實業者帳號時，應該去 Firebase Console 個別改成他們自己的密碼

async function collectAccounts() {

    const accounts = [];
    const seenEmails = new Set();

    const adminsSnapshot = await db.collection("admins").get();

    for (const doc of adminsSnapshot.docs) {

        const data = doc.data();

        if (seenEmails.has(data.email)) {
            console.log(`⚠️  ${data.email} 已經處理過，略過 admins/${doc.id}`);
            continue;
        }

        seenEmails.add(data.email);

        accounts.push({
            email: data.email,
            name: data.name,
            tenantId: null,
            role: data.role || "superadmin"
        });

    }

    const tenantsSnapshot = await db.collection("tenants").get();

    for (const tenantDoc of tenantsSnapshot.docs) {

        const membersSnapshot = await db.collection("tenants").doc(tenantDoc.id).collection("members").get();

        for (const doc of membersSnapshot.docs) {

            const data = doc.data();

            if (seenEmails.has(data.email)) {
                console.log(`⚠️  ${data.email} 已經處理過（可能跟 superadmin 是同一組），略過 tenants/${tenantDoc.id}/members/${doc.id}`);
                continue;
            }

            seenEmails.add(data.email);

            accounts.push({
                email: data.email,
                name: data.name,
                tenantId: tenantDoc.id,
                role: data.role || "tenant_admin"
            });

        }

    }

    return accounts;

}

async function migrate() {

    const password = process.argv[2];

    if (!password) {
        console.log("用法：node scripts/migrateToFirebaseAuth.js <新密碼>");
        process.exit(1);
    }

    try {

        const accounts = await collectAccounts();

        for (const account of accounts) {

            let userRecord;

            try {

                userRecord = await auth.createUser({
                    email: account.email,
                    password,
                    displayName: account.name
                });

                console.log(`✅ 建立 Firebase Auth 帳號：${account.email}`);

            } catch (error) {

                if (error.code === "auth/email-already-exists") {

                    userRecord = await auth.getUserByEmail(account.email);

                    console.log(`✅ ${account.email} 已存在，沿用現有帳號更新 claims`);

                } else {

                    throw error;

                }

            }

            const claims = { role: account.role };

            if (account.tenantId) {
                claims.tenantId = account.tenantId;
            }

            await auth.setCustomUserClaims(userRecord.uid, claims);

            console.log(`✅ ${account.email} custom claims：${JSON.stringify(claims)}`);

        }

        console.log("🎉 遷移完成。所有帳號這次的登入密碼都是你剛剛帶入的那組，請自行保管、之後可依需要更換。");

        process.exit();

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}

migrate();
