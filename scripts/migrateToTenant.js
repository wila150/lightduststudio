require("dotenv").config();
const { db } = require("../config/firebase");

// 把現有「單一業者」資料搬進 tenants/default/... 底下
// 一次性遷移 script，可重複執行（每筆資料寫入前都會先檢查目的地是否已存在）
const TENANT_ID = "default";

async function copyCollection(sourcePath, destPath) {

    const snapshot = await db.collection(sourcePath).get();

    let copied = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {

        const destRef = db.collection(destPath).doc(doc.id);
        const destDoc = await destRef.get();

        if (destDoc.exists) {
            skipped++;
            continue;
        }

        await destRef.set(doc.data());
        copied++;

    }

    console.log(`✅ ${sourcePath} → ${destPath}：複製 ${copied} 筆，略過 ${skipped} 筆（已存在）`);

}

async function migrate() {

    try {

        const tenantRef = db.collection("tenants").doc(TENANT_ID);
        const tenantDoc = await tenantRef.get();

        if (!tenantDoc.exists) {

            await tenantRef.set({
                name: "我的攝影工作室",
                slug: TENANT_ID,
                plan: "internal",
                createdAt: new Date()
            });

            console.log(`✅ 建立租戶文件 tenants/${TENANT_ID}`);

        } else {

            console.log(`✅ 租戶文件 tenants/${TENANT_ID} 已存在，略過建立`);

        }

        // pages/home 是單一文件，不是 collection 迴圈，另外處理
        const homeDoc = await db.collection("pages").doc("home").get();
        const destHomeRef = db.collection("tenants").doc(TENANT_ID).collection("pages").doc("home");
        const destHomeDoc = await destHomeRef.get();

        if (homeDoc.exists && !destHomeDoc.exists) {
            await destHomeRef.set(homeDoc.data());
            console.log(`✅ pages/home → tenants/${TENANT_ID}/pages/home`);
        } else {
            console.log(`✅ pages/home 略過（來源不存在或目的地已存在）`);
        }

        await copyCollection("projects", `tenants/${TENANT_ID}/projects`);
        await copyCollection("media", `tenants/${TENANT_ID}/media`);
        await copyCollection("customPages", `tenants/${TENANT_ID}/customPages`);

        // admins/{username} → tenants/default/members/{username}，角色改成 tenant_admin
        const adminsSnapshot = await db.collection("admins").get();

        for (const doc of adminsSnapshot.docs) {

            const memberRef = db.collection("tenants").doc(TENANT_ID).collection("members").doc(doc.id);
            const memberDoc = await memberRef.get();

            if (memberDoc.exists) {
                console.log(`✅ members/${doc.id} 已存在，略過`);
                continue;
            }

            await memberRef.set({ ...doc.data(), role: "tenant_admin" });

            console.log(`✅ admins/${doc.id} → tenants/${TENANT_ID}/members/${doc.id}（role: tenant_admin）`);

        }

        console.log("🎉 遷移完成。原本的平面 collection（pages/projects/media/customPages/admins）保留未刪除，確認新資料沒問題後再手動清除。");

        process.exit();

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}

migrate();
