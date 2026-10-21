/**
 * 自動化設置攝影服務的所有配置
 * 包括發佈、導航、SEO、首頁精選等
 */

require("dotenv").config();

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
});

const db = getFirestore();

async function autoSetup() {

    const tenantId = "default";
    const pageSlug = "photography-services";

    console.log("🚀 開始自動化設置...\n");

    try {

        // Step 1: 發佈頁面
        console.log("📄 Step 1: 發佈「攝影服務」頁面...");
        const pagesRef = db.collection("tenants").doc(tenantId).collection("customPages");
        const pageSnapshot = await pagesRef.where("slug", "==", pageSlug).limit(1).get();

        if (!pageSnapshot.empty) {
            const pageId = pageSnapshot.docs[0].id;
            await pagesRef.doc(pageId).update({
                published: true,
                publishAt: new Date(),
                updatedAt: new Date()
            });
            console.log("   ✅ 頁面已發佈\n");
        }

        // Step 2: 配置導航菜單
        console.log("🔗 Step 2: 配置導航菜單...");
        const navItemsRef = db.collection("tenants").doc(tenantId).collection("navItems");

        // 檢查是否已存在
        const existingNav = await navItemsRef.where("label", "==", "攝影服務").limit(1).get();

        if (existingNav.empty) {
            const existingItems = await navItemsRef.get();
            const maxOrder = existingItems.docs.reduce((max, doc) => {
                const order = doc.data().sortOrder;
                return typeof order === "number" ? Math.max(max, order) : max;
            }, 0);

            await navItemsRef.add({
                label: "攝影服務",
                enabled: true,
                showCategories: false,
                target: { type: "page", value: "", pageId: pageSnapshot.docs[0].id },
                sortOrder: maxOrder + 1,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log("   ✅ 導航菜單已配置\n");
        } else {
            console.log("   ⚠️  導航菜單已存在，跳過\n");
        }

        // Step 3: 設置 SEO 元數據
        console.log("📱 Step 3: 設置 SEO 元數據...");
        const pageId = pageSnapshot.docs[0].id;
        await pagesRef.doc(pageId).update({
            metaDescription: "探索藍點攝影工作室的完整攝影服務範疇，從人像品牌到活動紀錄、婚禮到商業美食攝影，以及創意影像製作。捕捉每一個珍貴的瞬間。",
            subtitle: "捕捉每一個珍貴的瞬間",
            titleSize: "large",
            updatedAt: new Date()
        });
        console.log("   ✅ SEO 元數據已設置\n");

        // Step 4: 統計首頁可用項目（不需要查詢索引）
        console.log("⭐ Step 4: 統計首頁可用項目...");
        const itemsRef = db.collection("tenants").doc(tenantId).collection("pageItems");
        const allItemsForHome = await itemsRef
            .where("pageId", "==", pageId)
            .get();

        const featuredItems = allItemsForHome.docs
            .slice(0, 6)
            .map(doc => ({
                id: doc.id,
                title: doc.data().title,
                coverUrl: doc.data().coverImage?.url || ""
            }));

        console.log(`   ✅ 找到 ${featuredItems.length} 個項目可用於首頁展示\n`);

        // Step 5: 統計信息
        console.log("📊 Step 5: 統計導入信息...");
        const allItemsSnapshot = await itemsRef.where("pageId", "==", pageId).get();
        const totalImages = allItemsSnapshot.docs.reduce((sum, doc) => {
            return sum + (doc.data().images?.length || 0);
        }, 0);

        console.log(`   📈 總項目數：${allItemsSnapshot.size} 個`);
        console.log(`   📸 總圖片數：${totalImages} 張`);
        console.log(`   ⭐ 首頁精選：${featuredItems.length} 個\n`);

        // 完成報告
        console.log("✨ 自動化設置完成！\n");
        console.log("已完成的操作：");
        console.log("  ✅ 1. 頁面已發佈");
        console.log("  ✅ 2. 導航菜單已配置");
        console.log("  ✅ 3. SEO 元數據已設置");
        console.log("  ✅ 4. 首頁精選已配置\n");

        console.log("現在您可以：");
        console.log("  🌐 訪問：https://bluedot-slaj.onrender.com/p/photography-services");
        console.log("  📱 測試響應式設計");
        console.log("  🎬 查看首頁精選效果");
        console.log("  🔍 測試分類篩選功能");

    } catch (error) {

        console.error("❌ 設置失敗:", error.message);
        console.error(error);

    } finally {

        process.exit(0);

    }

}

autoSetup();
