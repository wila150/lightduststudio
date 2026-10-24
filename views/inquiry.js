// LINE 圖文選單「預約諮詢」開的簡短詢問表單：手機一頁填完，不套網站導覽列（在 LINE 內建瀏覽器裡開）
const escapeHtml = require("./escapeHtml");
const BRAND = require("../config/brand");

const SERVICES = ["商業廣告", "形象照", "個人寫真", "婚禮紀錄", "活動紀錄", "美食／商品攝影", "建築空間", "抓周攝影", "登記拍攝", "影片製作", "其他"];

const STYLE = `
:root { --bg:#1a3a3a; --panel:#224343; --border:#3b5d5b; --text:#f2ede3; --muted:#b7c2bd; --gold:#e0a068; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family:"Noto Sans TC",-apple-system,"PingFang TC",sans-serif; line-height:1.6; }
.wrap { max-width:520px; margin:0 auto; padding:28px 18px 48px; }
.head { text-align:center; margin-bottom:22px; }
.head img { width:72px; height:72px; border-radius:50%; }
.head h1 { font-size:22px; margin:10px 0 4px; letter-spacing:2px; }
.head p { color:var(--muted); font-size:14px; margin:0; }
form { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:20px 18px; }
label.f { display:block; font-weight:500; margin:16px 0 6px; font-size:15px; }
label.f:first-child { margin-top:0; }
.req { color:var(--gold); margin-left:2px; }
.opt { color:var(--muted); font-weight:400; font-size:13px; margin-left:4px; }
input[type=text], input[type=tel], input[type=date], textarea { width:100%; padding:12px; font-size:16px; border-radius:10px; border:1px solid var(--border); background:#1a3a3a; color:var(--text); font-family:inherit; }
input:focus, textarea:focus { outline:none; border-color:var(--gold); }
input[type=date] { color-scheme:dark; min-height:48px; }
textarea { min-height:96px; resize:vertical; }
.chips { display:flex; flex-wrap:wrap; gap:8px; }
.chips input { position:absolute; opacity:0; pointer-events:none; }
.chips span { display:inline-block; padding:8px 14px; border:1px solid var(--border); border-radius:999px; font-size:14px; cursor:pointer; background:#1a3a3a; }
.chips input:checked + span { background:var(--gold); border-color:var(--gold); color:#122b2b; font-weight:700; }
.chips input:focus-visible + span { outline:2px solid var(--gold); outline-offset:2px; }
button { width:100%; margin-top:22px; padding:14px; font-size:17px; font-weight:700; letter-spacing:2px; border:0; border-radius:12px; background:var(--gold); color:#122b2b; cursor:pointer; font-family:inherit; }
.error { background:#5a2e26; border:1px solid #e07a62; color:#ffd9cf; padding:10px 12px; border-radius:10px; margin-bottom:14px; font-size:14px; }
.hp { position:absolute; left:-9999px; }
.done { text-align:center; background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:34px 20px; }
.done .icon { font-size:46px; }
.done h2 { margin:8px 0; }
.done p { color:var(--muted); }
.done a { display:inline-block; margin-top:14px; padding:12px 26px; border-radius:12px; background:#06c755; color:#fff; font-weight:700; text-decoration:none; }
.note { text-align:center; color:var(--muted); font-size:13px; margin-top:16px; }
.note a { color:var(--gold); }
`;

function page(body) {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>預約諮詢｜${escapeHtml(BRAND.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap">
<style>${STYLE}</style>
</head>
<body><div class="wrap">
<div class="head">
    <img src="/images/logo-header-en.png" alt="${escapeHtml(BRAND.name)}">
    <h1>預約諮詢</h1>
    <p>留下簡單資料，我們會盡快與您聯繫</p>
</div>
${body}
</div></body></html>`;
}

exports.form = ({ values = {}, error = "" } = {}) => page(`
${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
<form method="POST" action="/inquiry">
    <label class="f" for="name">怎麼稱呼您<span class="req">*</span></label>
    <input type="text" id="name" name="name" maxlength="40" required autocomplete="name" value="${escapeHtml(values.name || "")}">

    <label class="f" for="contact">聯絡電話或 LINE ID<span class="req">*</span></label>
    <input type="text" id="contact" name="contact" maxlength="60" required inputmode="text" autocomplete="tel" value="${escapeHtml(values.contact || "")}">

    <label class="f">想詢問的服務<span class="req">*</span><span class="opt">可複選</span></label>
    <div class="chips">
        ${SERVICES.map(s => `<label><input type="checkbox" name="service" value="${escapeHtml(s)}"${(values.service || []).includes(s) ? " checked" : ""}><span>${escapeHtml(s)}</span></label>`).join("")}
    </div>

    <label class="f" for="date">預計拍攝日期<span class="opt">選填</span></label>
    <input type="date" id="date" name="date" value="${escapeHtml(values.date || "")}">

    <label class="f" for="message">簡單說明需求<span class="opt">選填</span></label>
    <textarea id="message" name="message" maxlength="1000" placeholder="例如：品牌形象照 3 人、地點在台中、預算約…">${escapeHtml(values.message || "")}</textarea>

    <input type="text" name="hp_website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">

    <button type="submit">送出</button>
</form>
`);

exports.done = ({ lineUrl, phone } = {}) => page(`
<div class="done">
    <div class="icon">✅</div>
    <h2>已收到您的詢問！</h2>
    <p>我們會盡快透過您留的電話或 LINE 與您聯繫。</p>
    ${lineUrl ? `<a href="${escapeHtml(lineUrl)}">回到 LINE 聊天室</a>` : ""}
</div>
${phone ? `<p class="note">急件請直接來電 <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>` : ""}
`);

exports.SERVICES = SERVICES;
