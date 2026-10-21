/**
 * 初始化攝影服務數據的腳本
 *
 * 使用方法：
 * node scripts/init-photography-services.js
 *
 * 此腳本會在 Firebase 中創建「攝影服務」頁面和所有分類
 * 需要設置 FIREBASE_* 環境變數
 */

require("dotenv").config();

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

// 直接從環境變數構建 serviceAccount（無需文件）
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

if (!serviceAccount.project_id) {
    console.error("❌ 錯誤：Firebase 環境變數未設置");
    console.error("   請確保 .env 檔案中有完整的 Firebase 配置");
    process.exit(1);
}

try {
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        projectId: serviceAccount.project_id
    });
} catch (error) {
    console.error("❌ 錯誤：Firebase 初始化失敗");
    console.error("   ", error.message);
    process.exit(1);
}

const db = getFirestore();

// 攝影服務的分類數據
const CATEGORIES = [
    {
        label: "人像與形象攝影",
        nameEn: "Portrait & Personal Branding Photography",
        description: "捕捉人物自然真實的神情，透過光線、造型與畫面語言，建立具辨識度的個人與品牌形象。",
        sortOrder: 70
    },
    {
        label: "品牌與活動紀錄",
        nameEn: "Brand & Event Photography",
        description: "記錄品牌現場的氛圍、互動與關鍵時刻，將每一次活動轉化為可延續傳播的精彩故事。",
        sortOrder: 60
    },
    {
        label: "婚禮與人生慶典",
        nameEn: "Weddings & Milestone Celebrations",
        description: "以細膩而真誠的視角，收藏人生重要篇章中的情感、笑容與不可重來的瞬間。",
        sortOrder: 50
    },
    {
        label: "商業與美食攝影",
        nameEn: "Commercial & Food Photography",
        description: "用精準的視覺策略呈現產品質感與料理魅力，讓畫面不只吸睛，也有效傳達品牌價值。",
        sortOrder: 40
    },
    {
        label: "劇場與舞台影像",
        nameEn: "Theatre & Stage Photography",
        description: "在光影、節奏與表演之間捕捉張力，保留舞台作品最動人的情緒與藝術能量。",
        sortOrder: 30
    },
    {
        label: "SDE 快播快剪",
        nameEn: "Same-Day Edit",
        description: "把此刻的情緒，留在此刻發生。從現場的笑聲、眼神與每個細微的瞬間，快速剪輯成一段屬於當下的影像，讓還未散去的感動，再一次被看見。",
        sortOrder: 20
    },
    {
        label: "短影音／Reels製作",
        nameEn: "Short-Form Video & Reels",
        description: "捕捉當下的情緒與節奏，將每個值得被看見的瞬間，轉化為有溫度的影像。從日常、人物到品牌故事，讓短短幾秒，也能留下屬於你的記憶。",
        sortOrder: 10
    }
];

const PAGE_DATA = {
    title: "攝影服務",
    slug: "photography-services",
    subtitle: "捕捉每一個珍貴的瞬間",
    metaDescription: "探索我們的完整攝影服務範疇，從人像品牌到活動紀錄，婚禮到商業美食攝影，以及創意影像製作",
    pageType: "collection",
    contentKind: "portfolio",
    modules: [],
    published: false, // 預設不發佈，用戶可在 CMS 中啟用
    publishAt: null,
    navParent: "",
    backgroundImage: "",
    backgroundImagePath: "",
    titleSize: "medium",
    createdAt: new Date(),
    updatedAt: new Date()
};

async function initializePhotographyServices() {

    const tenantId = process.env.DEFAULT_TENANT_ID || "default";

    console.log("🚀 開始初始化攝影服務...");
    console.log("   租戶ID:", tenantId);

    try {

        // 1. 創建自訂頁面
        console.log("\n📄 步驟 1：創建「攝影服務」頁面...");

        const pagesRef = db.collection("tenants").doc(tenantId).collection("customPages");
        const existingPage = await pagesRef.where("slug", "==", "photography-services").limit(1).get();

        let pageId;
        if (!existingPage.empty) {
            pageId = existingPage.docs[0].id;
            console.log("   ⚠️  頁面已存在，使用現有頁面 ID:", pageId);
        } else {
            const newPageRef = await pagesRef.add(PAGE_DATA);
            pageId = newPageRef.id;
            console.log("   ✅ 頁面創建成功，ID:", pageId);
        }

        // 2. 添加分類
        console.log("\n📚 步驟 2：添加服務分類...");

        const categoriesRef = db.collection("tenants").doc(tenantId).collection("pageCategories");
        let createdCount = 0;
        let skippedCount = 0;

        for (const category of CATEGORIES) {

            // 檢查分類是否已存在
            const existing = await categoriesRef
                .where("pageId", "==", pageId)
                .where("label", "==", category.label)
                .limit(1)
                .get();

            if (!existing.empty) {
                console.log("   ⏭️  分類已存在:", category.label);
                skippedCount++;
                continue;
            }

            const categoryData = {
                pageId,
                ...category,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await categoriesRef.add(categoryData);
            console.log("   ✅ 分類創建成功:", category.label);
            createdCount++;

        }

        console.log(`\n   📊 統計：創建 ${createdCount} 個新分類，跳過 ${skippedCount} 個已存在的分類`);

        // 3. 完成
        console.log("\n✨ 初始化完成！");
        console.log("\n接下來的步驟：");
        console.log("1. 登入 CMS 後台：https://bluedot-slaj.onrender.com/cms");
        console.log("2. 進入「自訂頁面」，找到「攝影服務」頁面");
        console.log("3. 在每個分類下添加作品項目（圖片、影片等）");
        console.log("4. 完成後在頁面設置中啟用「發佈」");
        console.log("5. （可選）在導航菜單中添加連結");

    } catch (error) {

        console.error("\n❌ 初始化失敗：");
        console.error(error.message);
        console.error("\n除錯資訊：");
        console.error(error);

    } finally {

        process.exit(0);

    }

}

// 執行初始化
initializePhotographyServices();
