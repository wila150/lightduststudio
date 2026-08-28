const express = require('express');
const nodemailer = require('nodemailer');
const { db } = require('../db');

const router = express.Router();

function buildTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
}

router.post('/', async (req, res) => {
  const { name, email, phone, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: '請填寫姓名、Email 與需求內容' });
  }

  await db.prepare('INSERT INTO messages (name, email, phone, message) VALUES (?, ?, ?, ?)').run(
    name, email, phone || '', message
  );

  const transport = buildTransport();
  if (!transport) {
    console.warn('[contact] SMTP not configured in .env — message saved to inbox only:', { name, email, phone, message });
    return res.json({ ok: true, note: '訊息已收到' });
  }

  try {
    await transport.sendMail({
      from: process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER,
      to: process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `[網站詢問] ${name}`,
      text: `姓名：${name}\nEmail：${email}\n電話：${phone || '未提供'}\n\n${message}`
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] email send failed (message still saved to inbox):', err.message);
    res.json({ ok: true, note: '訊息已收到' });
  }
});

module.exports = router;
