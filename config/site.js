const SITE_URL = process.env.SITE_URL || "https://bluedot-slaj.onrender.com";

// 媒體庫「從 Google 雲端硬碟匯入」功能用：重用現有的 Google OAuth Client ID（後台登入也是用同一組），
// 另外需要一組限制在 Picker API 的瀏覽器 API 金鑰。兩者都沒設定時，前台會直接隱藏該按鈕。
const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_OAUTH_WEB_CLIENT_ID || "";
const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY || "";

module.exports = { SITE_URL, GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_API_KEY };
