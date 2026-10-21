const { SITE_URL } = require("../config/site");

// 純伺服器端的 Google 登入流程：整頁導轉到 Google → Google 導回我們的 callback（帶一次性 code）
// → 伺服器直接跟 Google／Firebase 換成登入憑證。
// 全程沒有 iframe、沒有彈窗、沒有跨網域 cookie/storage，只有一般的整頁導轉，
// 在任何瀏覽器（包含會擋掉 Google 登入元件所需機制的 Safari）都能正常運作。
const REDIRECT_URI = `${SITE_URL}/cms/login/google/callback`;

function getAuthUrl(state) {

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_WEB_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
        state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

}

// 用一次性 code 跟 Google 換成 Google 的 ID token
async function exchangeCodeForGoogleIdToken(code) {

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_OAUTH_WEB_CLIENT_ID,
            client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code"
        })
    });

    const data = await res.json();

    if (!res.ok || !data.id_token) {
        throw new Error(data.error_description || data.error || "Google 授權失敗");
    }

    return data.id_token;

}

// 拿 Google 的 ID token 跟 Firebase Identity Toolkit 換成 Firebase 自己的 ID token
// （這一步等同於前端 firebase.auth().signInWithCredential() 在做的事，只是搬到伺服器端做）
async function exchangeGoogleIdTokenForFirebaseIdToken(googleIdToken) {

    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            postBody: `id_token=${googleIdToken}&providerId=google.com`,
            requestUri: SITE_URL,
            returnIdpCredential: true,
            returnSecureToken: true
        })
    });

    const data = await res.json();

    if (!res.ok || !data.idToken) {
        throw new Error((data.error && data.error.message) || "Firebase 登入失敗");
    }

    // signInWithIdp 會直接在回應裡帶 email/localId（Firebase uid），
    // 但這個帳號的 email 屬性本身不一定會被寫入使用者紀錄，得靠呼叫端自己補寫回去（見 authController.googleLoginCallback）
    return { idToken: data.idToken, uid: data.localId, email: data.email || "" };

}

module.exports = { getAuthUrl, exchangeCodeForGoogleIdToken, exchangeGoogleIdTokenForFirebaseIdToken };
