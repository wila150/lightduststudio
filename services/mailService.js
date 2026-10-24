// 從後台回覆客人 Email：用工作室的 Gmail（GMAIL_USER）＋應用程式密碼（GMAIL_APP_PASSWORD）透過 Gmail SMTP 寄出，
// 寄出的信會留在那個 Gmail 的「寄件備份」，客人回信也會回到那個信箱
const nodemailer = require("nodemailer");
const brand = require("../config/brand");

const SITE_URL = (process.env.SITE_URL || "https://lightdustudio.com").replace(/\/$/, "");

let transporter = null;

function configured() {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") }
        });
    }
    return transporter;
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}

// 回覆內容＋簽名檔，下面附上客人原本的留言
async function sendReply({ to, toName, subject, text, original, originalAt, phone }) {

    if (!configured()) {
        throw new Error("尚未設定寄信用的 Gmail（GMAIL_USER／GMAIL_APP_PASSWORD）");
    }

    const signature = [`${brand.name} ${brand.nameEn}`, phone ? `電話 ${phone}` : "", SITE_URL].filter(Boolean);
    const quoteHeader = `${originalAt ? originalAt + "，" : ""}${toName || to} 在網站留言：`;

    const plain = `${text}\n\n—\n${signature.join("\n")}\n\n${quoteHeader}\n${String(original || "").split("\n").map(line => "> " + line).join("\n")}`;

    const html = `<div style="font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;font-size:15px;line-height:1.8;color:#222;">
<div style="white-space:pre-wrap;">${escapeHtml(text)}</div>
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;color:#555;font-size:13px;line-height:1.7;">
<strong style="color:#1a3a3a;">${escapeHtml(brand.name)}</strong> ${escapeHtml(brand.nameEn)}<br>
${phone ? `電話 ${escapeHtml(phone)}<br>` : ""}<a href="${SITE_URL}" style="color:#c98d55;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
</div>
<div style="margin-top:20px;color:#777;font-size:13px;">${escapeHtml(quoteHeader)}</div>
<blockquote style="margin:6px 0 0;padding-left:12px;border-left:3px solid #ddd;color:#666;font-size:13px;white-space:pre-wrap;">${escapeHtml(original)}</blockquote>
</div>`;

    await getTransporter().sendMail({
        from: { name: brand.name, address: process.env.GMAIL_USER },
        to: toName ? { name: toName, address: to } : to,
        subject,
        text: plain,
        html
    });

}

module.exports = { configured, sendReply };
