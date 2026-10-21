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

async function checkImport() {
    try {
        const itemsRef = db.collection("tenants").doc("default").collection("pageItems");
        const snapshot = await itemsRef.get();
        
        console.log(`✅ 成功導入的項目：${snapshot.size} 個\n`);
        
        snapshot.docs.slice(0, 10).forEach(doc => {
            const data = doc.data();
            console.log(`📸 ${data.title}`);
            console.log(`   - 圖片數: ${data.images ? data.images.length : 0}`);
        });
        
        if (snapshot.size > 10) {
            console.log(`\n... 還有 ${snapshot.size - 10} 個項目`);
        }
    } catch (error) {
        console.error('❌ 檢查失敗:', error.message);
    }
    process.exit(0);
}

checkImport();
