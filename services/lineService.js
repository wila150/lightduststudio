const crypto = require("crypto");

const settingsService = require("./settingsService");
const messageService = require("./messageService");

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_PROFILE_URL = "https://api.line.me/v2/bot/profile";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v3/token";

// 用 Channel ID + Secret 自動換的短效 token（stateless，15 分鐘），快取到快過期前再換，
// 這樣後台不用手動發行長效 Channel access token，也不會有 token 過期忘了換的問題
const tokenCache = new Map();

class LineService {

    // 有手動貼的 Channel access token 就用它；沒有的話用 Channel ID + Secret 自動換一組
    async getAccessToken(settings) {

        if (settings.lineChannelAccessToken) {
            return settings.lineChannelAccessToken;
        }

        if (!settings.lineChannelId || !settings.lineChannelSecret) {
            return null;
        }

        const cached = tokenCache.get(settings.lineChannelId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.token;
        }

        try {

            const response = await fetch(LINE_TOKEN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "client_credentials",
                    client_id: settings.lineChannelId,
                    client_secret: settings.lineChannelSecret
                })
            });

            if (!response.ok) {
                console.error("LINE token failed:", response.status, await response.text());
                return null;
            }

            const data = await response.json();

            tokenCache.set(settings.lineChannelId, { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 });

            return data.access_token;

        } catch (error) {

            console.error("LINE token error:", error);

            return null;

        }

    }

    // 推播文字訊息給單一 LINE User ID（跟廣播不同，廣播是送給所有加官方帳號好友的人——
    // 網站上的「加 LINE 好友」按鈕上線後，一般訪客也可能加好友，廣播的話每個人都會收到店家自己的留言通知，不是我們要的）
    async pushText(accessToken, userId, text) {

        try {

            const response = await fetch(LINE_PUSH_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    to: userId,
                    messages: [{ type: "text", text: text.slice(0, 4900) }]
                })
            });

            if (!response.ok) {
                const body = await response.text();
                console.error("LINE push failed:", response.status, body);
                return { success: false, status: response.status };
            }

            return { success: true };

        } catch (error) {

            console.error("LINE push error:", error);

            return { success: false, error: error.message };

        }

    }

    // 推播給網站設定裡指定的店家 LINE User ID（可以是多人）；尚未設定 Token 或任何 User ID 就直接跳過，
    // 不影響呼叫端（例如訪客送出留言）的主要流程
    async notifyOwners(tenantId, text) {

        const settings = await settingsService.get(tenantId);
        const userIds = settings.lineNotifyUserIds || [];

        if (userIds.length === 0) {
            return { skipped: true };
        }

        const accessToken = await this.getAccessToken(settings);

        if (!accessToken) {
            return { skipped: true };
        }

        const results = await Promise.all(userIds.map(userId => this.pushText(accessToken, userId, text)));

        return { success: results.some(result => result.success), results };

    }

    // 驗證 LINE webhook 簽章：x-line-signature 是 HMAC-SHA256(channel secret, 原始 request body) 的 base64，
    // 用來確認這個請求真的是 LINE 官方送來的，不是別人偽造打過來的
    verifySignature(rawBody, signature, channelSecret) {

        if (!channelSecret || !signature || !rawBody) {
            return false;
        }

        const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");

        try {
            return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
        } catch (error) {
            return false;
        }

    }

    // 抓 LINE 使用者的顯示名稱，抓不到（例如 token 過期）就讓呼叫端自己退回顯示 userId
    async getProfile(accessToken, userId) {

        try {

            const response = await fetch(`${LINE_PROFILE_URL}/${userId}`, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            return data.displayName || null;

        } catch (error) {

            return null;

        }

    }

    // webhook 收到的事件只處理文字訊息，貼圖/加好友/封鎖等其他類型先略過；
    // 存進跟聯絡表單共用的 messages collection，客人在 LINE 傳的訊息就會跟表單留言一起出現在 CMS「留言」列表。
    // 名稱裡帶著 userId（不只顯示名稱），店家要設定「接收通知的 LINE User ID」時可以直接從這裡複製
    async receiveWebhookEvents(tenantId, events, accessToken) {

        const textEvents = (events || []).filter(event => event.type === "message" && event.message && event.message.type === "text");

        await Promise.all(textEvents.map(async event => {

            const userId = event.source && event.source.userId;
            const displayName = (accessToken && userId) ? await this.getProfile(accessToken, userId) : null;

            await messageService.create(tenantId, {
                name: `LINE - ${displayName || "訪客"}${userId ? `（${userId}）` : ""}`,
                email: "",
                message: event.message.text
            });

        }));

    }

}

module.exports = new LineService();
