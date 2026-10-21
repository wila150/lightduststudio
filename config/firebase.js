const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
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
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

let bucket = null;

if (process.env.FIREBASE_STORAGE_BUCKET) {
  bucket = getStorage().bucket();
} else {
  console.warn("FIREBASE_STORAGE_BUCKET 未設定，媒體庫與作品圖片上傳功能將無法使用");
}

const db = getFirestore();

// 保險絲：任何一個 controller 不小心把 undefined 塞進要寫入 Firestore 的物件，
// 整批寫入就會直接丟例外、其他欄位也全部存不進去，而且很多地方沒有接住這個例外，
// 錯誤只會出現在伺服器 log 裡，前台看起來就是「明明改了，重新整理又跳回原本的」，很難排查。
// 全域打開這個設定，讓 undefined 欄位直接被忽略（等同沒有這個欄位），不要讓整批寫入失敗
db.settings({ ignoreUndefinedProperties: true });

// 取得某個租戶底下的 collection 參照，取代直接呼叫 db.collection(name)
function tenantCollection(tenantId, name) {
  return db.collection("tenants").doc(tenantId).collection(name);
}

module.exports = {
  db,
  bucket,
  tenantCollection,
  auth: getAuth(),
};