// LINE 官方帳號的自動回覆、圖文選單、推播（後台「LINE 官方帳號」頁）
// 設定存在 settings/line 這份文件；文字裡的 {店名}、{好友名稱} 這類欄位送出時才換成實際內容
const crypto = require("crypto");
const sharp = require("sharp");
const { tenantCollection } = require("../config/firebase");
const settingsService = require("./settingsService");
const lineService = require("./lineService");
const messageService = require("./messageService");
const brand = require("../config/brand");

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";
const SITE_URL = (process.env.SITE_URL || "https://lightdustudio.com").replace(/\/$/, "");

// 文字框下方的欄位按鈕；key 就是文字裡存的 {key}
const TOKENS = [
    { key: "好友名稱", label: "好友名稱" },
    { key: "店名", label: "店名" },
    { key: "店家電話", label: "店家電話" },
    { key: "Email", label: "Email" },
    { key: "網站", label: "網站" },
    { key: "諮詢表單", label: "預約諮詢表單" },
    { key: "聯絡頁", label: "聯絡頁" },
    { key: "平面攝影", label: "平面攝影作品" },
    { key: "影片製作", label: "影片作品" },
    { key: "服務項目", label: "服務項目" },
    { key: "IG", label: "IG" }
];

// 圖文選單版型：格子座標以 2500 寬為準（LINE 規定的尺寸）
const RICH_MENU_LAYOUTS = {
    "grid6": { label: "大・6 格（3×2）", height: 1686, cells: grid(3, 2, 0, 1686) },
    "grid4": { label: "大・4 格（2×2）", height: 1686, cells: grid(2, 2, 0, 1686) },
    "top1-bottom3": { label: "大・上 1 大格＋下 3 格", height: 1686, cells: [...grid(1, 1, 0, 843), ...grid(3, 1, 843, 843)] },
    "top1-bottom2": { label: "大・上 1 大格＋下 2 格", height: 1686, cells: [...grid(1, 1, 0, 843), ...grid(2, 1, 843, 843)] },
    "large1": { label: "大・整張 1 格", height: 1686, cells: grid(1, 1, 0, 1686) },
    "row3": { label: "小・3 格", height: 843, cells: grid(3, 1, 0, 843) },
    "row2": { label: "小・2 格", height: 843, cells: grid(2, 1, 0, 843) },
    "small1": { label: "小・整張 1 格", height: 843, cells: grid(1, 1, 0, 843) }
};

function grid(cols, rows, top, totalHeight) {
    const cells = [];
    const rowHeight = Math.round(totalHeight / rows);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = Math.round(2500 * c / cols);
            const y = top + rowHeight * r;
            cells.push({ x, y, width: Math.round(2500 * (c + 1) / cols) - x, height: r === rows - 1 ? top + totalHeight - y : rowHeight });
        }
    }
    return cells;
}

const DEFAULT_CONFIG = {
    welcome: {
        enabled: true,
        text: "歡迎加入 {店名}！\n商業攝影、影片製作都歡迎詢問😊\n點下方選單就能看作品、預約諮詢。"
    },
    keywords: [
        { id: "price", enabled: true, words: ["報價", "價格", "價目表"], match: "contains", text: "感謝詢問！請告訴我們拍攝類型、日期與地點，我們會盡快回覆報價😊\n也可以先看看服務項目：{服務項目}" }
    ],
    // 聊天室裡一題一題問的預約諮詢（客人點選單「預約諮詢」或輸入觸發詞開始）
    inquiry: {
        enabled: true,
        triggers: ["預約諮詢", "預約", "我要詢問", "詢問", "諮詢"],
        services: ["商業廣告", "形象照", "個人寫真", "婚禮紀錄", "活動紀錄", "美食／商品", "建築空間", "抓周攝影", "登記拍攝", "影片製作", "其他"],
        askService: "您好{好友名稱}！想詢問哪一類拍攝呢？👇",
        askDate: "預計什麼時候拍攝呢？📅",
        askPhone: "方便留一支聯絡電話嗎？\n直接輸入就可以😊",
        askNote: "最後，簡單說明一下需求？\n例如人數、地點、用途、預算（沒有的話按「略過」）",
        done: "✅ 收到您的詢問！\n{摘要}\n\n我們會盡快在這裡回覆您，謝謝🙏"
    },
    richMenu: { layout: "grid6", imageUrl: "", chatBarText: "選單", areas: [], richMenuId: "" },
    broadcast: { imageUrl: "", action: "message", actionValue: "", altText: "", text: "" }
};

function docRef(tenantId) {
    return tenantCollection(tenantId, "settings").doc("line");
}

async function getConfig(tenantId) {
    const snap = await docRef(tenantId).get();
    const data = snap.exists ? snap.data() : {};
    return {
        welcome: { ...DEFAULT_CONFIG.welcome, ...(data.welcome || {}) },
        keywords: Array.isArray(data.keywords) ? data.keywords : DEFAULT_CONFIG.keywords,
        inquiry: { ...DEFAULT_CONFIG.inquiry, ...(data.inquiry || {}) },
        richMenu: { ...DEFAULT_CONFIG.richMenu, ...(data.richMenu || {}) },
        broadcast: { ...DEFAULT_CONFIG.broadcast, ...(data.broadcast || {}) }
    };
}

async function saveConfig(tenantId, patch) {
    await docRef(tenantId).set({ ...patch, updatedAt: new Date() }, { merge: true });
}

function newId() {
    return crypto.randomBytes(6).toString("hex");
}

// ---- 欄位代換 ----

async function tokenValues(tenantId, displayName) {
    const settings = await settingsService.get(tenantId);
    return {
        "好友名稱": displayName || "",
        "店名": brand.name,
        "店家電話": settings.contactPhone || "",
        "Email": settings.contactEmail || "",
        "網站": SITE_URL,
        "諮詢表單": `${SITE_URL}/inquiry`,
        "聯絡頁": `${SITE_URL}/p/contact`,
        "平面攝影": `${SITE_URL}/p/photography`,
        "影片製作": `${SITE_URL}/p/film`,
        "服務項目": `${SITE_URL}/p/services`,
        "IG": settings.socialInstagramUrl || ""
    };
}

// {欄位} 換成實際內容；換完是空的那一行整行拿掉（例如還沒填電話）
function fill(text, values) {
    return String(text || "")
        .split("\n")
        .map(line => {
            let emptied = false;
            const out = line.replace(/\{([^{}\n]{1,20})\}/g, (whole, key) => {
                if (!(key in values)) return whole;
                if (!values[key]) emptied = true;
                return values[key];
            });
            return emptied ? null : out;
        })
        .filter(line => line !== null)
        .join("\n")
        .trim();
}

// ---- 關鍵字比對 ----

function normalize(text) {
    return String(text || "").trim().toLowerCase().replace(/\s+/g, "");
}

function findKeyword(keywords, text) {
    const input = normalize(text);
    if (!input) return null;
    return (keywords || []).find(rule => rule.enabled !== false && (rule.words || []).some(word => {
        const w = normalize(word);
        if (!w) return false;
        return rule.match === "contains" ? input.includes(w) : input === w;
    })) || null;
}

function textMessages(text, imageUrl) {
    const messages = [];
    if (imageUrl) messages.push({ type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl });
    if (text) messages.push({ type: "text", text: text.slice(0, 4900) });
    return messages;
}

// ---- LINE API ----

async function lineFetch(tenantId, url, options = {}) {
    const settings = await settingsService.get(tenantId);
    const token = await lineService.getAccessToken(settings);
    if (!token) throw new Error("尚未設定 LINE Channel ID 與 Channel Secret（網站設定 → LINE）");
    const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const body = await response.text();
    let data = {};
    try { data = body ? JSON.parse(body) : {}; } catch (error) { data = { raw: body }; }
    if (!response.ok) {
        const detail = data.details ? data.details.map(d => `${d.property || ""} ${d.message}`).join("；") : "";
        throw new Error(`LINE 回應錯誤（${response.status}）：${data.message || body}${detail ? "：" + detail : ""}`);
    }
    return data;
}

function jsonPost(body) {
    return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function reply(tenantId, replyToken, messages) {
    if (!replyToken || !messages.length) return;
    await lineFetch(tenantId, `${API}/message/reply`, jsonPost({ replyToken, messages: messages.slice(0, 5) }));
}

// ---- 聊天室預約諮詢問答 ----
// 進行中的問答存在 lineSessions/{userId}，30 分鐘沒回就當作放棄

const SESSION_TTL = 30 * 60 * 1000;
const CANCEL_WORDS = ["取消", "取消詢問", "不用了"];
const STEPS = ["service", "date", "phone", "note"];

function sessionRef(tenantId, userId) {
    return tenantCollection(tenantId, "lineSessions").doc(userId);
}

async function getSession(tenantId, userId) {
    const snap = await sessionRef(tenantId, userId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    const updatedAt = data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(0);
    return Date.now() - updatedAt.getTime() > SESSION_TTL ? null : data;
}

function quickReply(items) {
    return { items: items.slice(0, 13).map(action => ({ type: "action", action })) };
}

const msgAction = (label, text) => ({ type: "message", label: label.slice(0, 20), text: (text || label).slice(0, 300) });
const CANCEL_ACTION = msgAction("取消", "取消");

function todayInTaipei() {
    return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// 依步驟產生要問的那則訊息（文字＋下方快速按鈕）
function question(step, inquiry, values) {
    const text = fill(inquiry["ask" + step[0].toUpperCase() + step.slice(1)], values) || "請輸入";
    let items;
    if (step === "service") {
        items = [...(inquiry.services || []).slice(0, 12).map(s => msgAction(s)), CANCEL_ACTION];
    } else if (step === "date") {
        items = [
            { type: "datetimepicker", label: "📅 選擇日期", data: "inquiry=date", mode: "date", min: todayInTaipei() },
            msgAction("還不確定"),
            CANCEL_ACTION
        ];
    } else if (step === "note") {
        items = [msgAction("略過"), CANCEL_ACTION];
    } else {
        items = [CANCEL_ACTION];
    }
    return { type: "text", text: text.slice(0, 4900), quickReply: quickReply(items) };
}

function summary(answers) {
    return [
        `服務：${answers.service || "-"}`,
        `日期：${answers.date || "未定"}`,
        `電話：${answers.phone || "-"}`,
        answers.note ? `需求：${answers.note}` : ""
    ].filter(Boolean).join("\n");
}

async function startInquiry(tenantId, event, config, values) {
    await sessionRef(tenantId, event.source.userId).set({ step: "service", answers: {}, updatedAt: new Date() });
    await reply(tenantId, event.replyToken, [question("service", config.inquiry, values)]);
}

// 回傳 true 代表這則訊息被問答流程吃掉了（不再比對關鍵字、不另存成一般留言）
async function continueInquiry(tenantId, event, session, config, values, displayName) {
    const userId = event.source.userId;
    const ref = sessionRef(tenantId, userId);
    const text = event.type === "message" ? String(event.message.text || "").trim() : "";
    const pickedDate = event.type === "postback" && event.postback && event.postback.params && event.postback.params.date;

    if (CANCEL_WORDS.includes(text)) {
        await ref.delete();
        await reply(tenantId, event.replyToken, [{ type: "text", text: "已取消，有需要隨時再點選單的「預約諮詢」😊" }]);
        return true;
    }

    const step = session.step;
    const answers = { ...(session.answers || {}) };

    if (step === "date") {
        if (!pickedDate && !text) return true;
        answers.date = pickedDate || text;
    } else if (step === "phone") {
        // 至少要有幾個數字才像電話；打錯就再問一次
        if ((text.match(/\d/g) || []).length < 8) {
            await reply(tenantId, event.replyToken, [{ ...question("phone", config.inquiry, values), text: "電話號碼好像不太對，再輸入一次？例如 0912345678" }]);
            return true;
        }
        answers.phone = text.slice(0, 40);
    } else if (step === "note") {
        answers.note = text === "略過" ? "" : text.slice(0, 1000);
    } else {
        if (!text) return true;
        answers.service = text.slice(0, 40);
    }

    const next = STEPS[STEPS.indexOf(step) + 1];

    if (next) {
        await ref.set({ step: next, answers, updatedAt: new Date() });
        await reply(tenantId, event.replyToken, [question(next, config.inquiry, values)]);
        return true;
    }

    await ref.delete();
    const text2 = summary(answers);
    await reply(tenantId, event.replyToken, [{ type: "text", text: fill(config.inquiry.done, { ...values, "摘要": text2 }).slice(0, 4900) }]);

    await messageService.create(tenantId, {
        name: `LINE - ${displayName || "訪客"}（${userId}）`,
        email: "",
        subject: `LINE 預約諮詢｜${answers.service || ""}`,
        message: text2
    });
    lineService.notifyOwners(tenantId, `📅 LINE 預約諮詢\n客人：${displayName || "訪客"}\n${text2}\n\n可以直接在 LINE 官方帳號聊天室回覆他`)
        .catch(error => console.error("LINE notify error:", error));
    return true;
}

// webhook 進來的事件：加好友回歡迎詞、預約諮詢問答、文字訊息比對關鍵字（回覆訊息不算推播額度）
// 回傳 consumed: true 代表是問答流程裡的回答，呼叫端不用再存成一般留言
async function handleEvent(tenantId, event, displayName) {
    const config = await getConfig(tenantId);
    const userId = event.source && event.source.userId;
    const values = await tokenValues(tenantId, displayName);

    if (event.type === "follow" && config.welcome.enabled && config.welcome.text) {
        await reply(tenantId, event.replyToken, textMessages(fill(config.welcome.text, values)));
        return { replied: "welcome" };
    }

    const text = event.type === "message" && event.message && event.message.type === "text" ? event.message.text : "";

    if (userId && config.inquiry.enabled) {
        const triggered = text && (config.inquiry.triggers || []).some(word => normalize(word) === normalize(text));
        if (triggered) {
            await startInquiry(tenantId, event, config, values);
            return { replied: "inquiry", consumed: true };
        }
        const session = (text || event.type === "postback") ? await getSession(tenantId, userId) : null;
        if (session) {
            await continueInquiry(tenantId, event, session, config, values, displayName);
            return { replied: "inquiry", consumed: true };
        }
    }

    if (text) {
        const rule = findKeyword(config.keywords, text);
        if (rule) {
            await reply(tenantId, event.replyToken, textMessages(fill(rule.text, values), rule.imageUrl));
            return { replied: rule.id };
        }
    }
    return { replied: null };
}

// ---- 圖文選單 ----

// LINE 規定：寬 2500、高 1686 或 843、JPEG/PNG、1MB 以內；照版型裁切並壓到 1MB 內
async function prepareRichMenuImage(buffer, layoutKey) {
    const layout = RICH_MENU_LAYOUTS[layoutKey] || RICH_MENU_LAYOUTS.grid6;
    const base = await sharp(buffer).rotate().resize(2500, layout.height, { fit: "cover" }).flatten({ background: "#ffffff" }).toBuffer();
    for (let quality = 90; quality >= 50; quality -= 10) {
        const out = await sharp(base).withIccProfile("srgb").jpeg({ quality, mozjpeg: true }).toBuffer();
        if (out.length <= 1000 * 1024) return out;
    }
    throw new Error("圖文選單圖片壓不到 1MB 以下，請換一張比較單純的圖片");
}

function areaAction(area, index) {
    const label = (area.label || `區塊${index + 1}`).slice(0, 20);
    if (area.type === "uri" && /^https?:\/\//.test(area.value || "")) {
        return { type: "uri", label, uri: area.value };
    }
    if (area.type === "message" && area.value) {
        return { type: "message", label, text: area.value.slice(0, 300) };
    }
    return null;
}

// 建新選單 → 上傳圖片 → 設為所有人的預設 → 刪掉舊的
async function publishRichMenu(tenantId, { layout: layoutKey, areas, chatBarText, imageBuffer }) {
    const layout = RICH_MENU_LAYOUTS[layoutKey];
    if (!layout) throw new Error("請選擇圖文選單版型");
    const config = await getConfig(tenantId);
    const lineAreas = layout.cells.map((cell, i) => {
        const action = areaAction(areas[i] || {}, i);
        return action ? { bounds: cell, action } : null;
    }).filter(Boolean);
    if (!lineAreas.length) throw new Error("至少要設定一個區塊的動作（網址或送出文字）");

    const created = await lineFetch(tenantId, `${API}/richmenu`, jsonPost({
        size: { width: 2500, height: layout.height },
        selected: true,
        name: `LightDust ${new Date().toISOString().slice(0, 16)}`,
        chatBarText: (chatBarText || "選單").slice(0, 14),
        areas: lineAreas
    }));
    const richMenuId = created.richMenuId;

    try {
        await lineFetch(tenantId, `${DATA_API}/richmenu/${richMenuId}/content`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: imageBuffer });
        await lineFetch(tenantId, `${API}/user/all/richmenu/${richMenuId}`, { method: "POST" });
    } catch (error) {
        await lineFetch(tenantId, `${API}/richmenu/${richMenuId}`, { method: "DELETE" }).catch(() => {});
        throw error;
    }

    // 只刪掉之前從後台發佈的那一個，不碰在 LINE 官方後台另外做的選單
    if (config.richMenu.richMenuId && config.richMenu.richMenuId !== richMenuId) {
        await lineFetch(tenantId, `${API}/richmenu/${config.richMenu.richMenuId}`, { method: "DELETE" }).catch(() => {});
    }
    return richMenuId;
}

async function currentDefaultRichMenu(tenantId) {
    try {
        return (await lineFetch(tenantId, `${API}/user/all/richmenu`)).richMenuId || "";
    } catch (error) {
        return "";
    }
}

// ---- 推播 ----

// 圖片用 Flex 訊息送：整張圖可以點，點了「送出文字」（觸發關鍵字回覆）或開網址
async function buildBroadcastMessages(tenantId, broadcast) {
    const values = await tokenValues(tenantId, "");
    const messages = [];
    if (broadcast.imageUrl) {
        const ratio = broadcast.imageRatio || "1:1";
        let action;
        if (broadcast.action === "uri" && /^https?:\/\//.test(broadcast.actionValue || "")) {
            action = { type: "uri", label: "查看", uri: broadcast.actionValue };
        } else if (broadcast.action === "message" && broadcast.actionValue) {
            action = { type: "message", label: "詢問", text: broadcast.actionValue.slice(0, 300) };
        }
        const image = { type: "image", url: broadcast.imageUrl, size: "full", aspectMode: "cover", aspectRatio: ratio };
        if (action) image.action = action;
        messages.push({
            type: "flex",
            altText: (broadcast.altText || `${brand.name} 最新消息`).slice(0, 400),
            contents: { type: "bubble", size: "giga", body: { type: "box", layout: "vertical", paddingAll: "0px", contents: [image] } }
        });
    }
    const text = fill(broadcast.text, values);
    if (text) messages.push({ type: "text", text: text.slice(0, 4900) });
    if (!messages.length) throw new Error("請上傳推播圖片或填寫文字");
    return messages;
}

// Flex 圖片的長寬比最高到 1:3，太長的海報要提醒換圖
function imageRatio(width, height) {
    if (!width || !height) return "1:1";
    const h = Math.min(height, width * 3);
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const w = Math.round(width), hh = Math.round(h);
    const g = gcd(w, hh);
    return `${w / g}:${hh / g}`;
}

async function sendTest(tenantId, broadcast) {
    const settings = await settingsService.get(tenantId);
    const userIds = settings.lineNotifyUserIds || [];
    if (!userIds.length) throw new Error("請先在「網站設定 → LINE」填寫接收通知的 LINE User ID，測試訊息會送到那裡");
    const messages = await buildBroadcastMessages(tenantId, broadcast);
    await lineFetch(tenantId, `${API}/message/multicast`, jsonPost({ to: userIds.slice(0, 500), messages }));
    return userIds.length;
}

async function sendBroadcast(tenantId, broadcast) {
    const messages = await buildBroadcastMessages(tenantId, broadcast);
    await lineFetch(tenantId, `${API}/message/broadcast`, jsonPost({ messages }));
}

async function quota(tenantId) {
    try {
        const [limit, used, followers] = await Promise.all([
            lineFetch(tenantId, `${API}/message/quota`),
            lineFetch(tenantId, `${API}/message/quota/consumption`),
            lineFetch(tenantId, `${API}/insight/followers?date=${yesterday()}`).catch(() => ({}))
        ]);
        return { type: limit.type, limit: limit.value, used: used.totalUsage, followers: followers.followers };
    } catch (error) {
        return { error: error.message };
    }
}

function yesterday() {
    const d = new Date(Date.now() + 8 * 3600 * 1000 - 24 * 3600 * 1000);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
}

module.exports = {
    TOKENS, RICH_MENU_LAYOUTS, getConfig, saveConfig, newId, handleEvent, fill, tokenValues,
    prepareRichMenuImage, publishRichMenu, currentDefaultRichMenu, sendTest, sendBroadcast, quota, imageRatio
};
