const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { verifyGoogleToken } = require('../lib/google');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  req.session.userId = user.id;
  res.json({ ok: true });
});

router.post('/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: '缺少 Google 登入憑證' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: '尚未設定 Google 登入' });

  let payload;
  try {
    payload = await verifyGoogleToken(credential);
  } catch (err) {
    return res.status(401).json({ error: 'Google 驗證失敗' });
  }
  if (!payload.email_verified) {
    return res.status(401).json({ error: 'Google 帳號 Email 尚未驗證' });
  }

  const user = await db.prepare('SELECT * FROM admin_users WHERE email = ?').get(payload.email);
  if (!user) {
    return res.status(403).json({ error: `這個 Google 帳號（${payload.email}）尚未綁定任何後台帳號，請先用帳號密碼登入後在「帳號管理」設定 Email` });
  }

  req.session.userId = user.id;
  res.json({ ok: true });
});

router.put('/email', requireAuth, async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '請輸入有效的 Email' });
  }
  const existing = await db.prepare('SELECT id FROM admin_users WHERE email = ? AND id != ?').get(email, req.session.userId);
  if (existing) return res.status(400).json({ error: '這個 Email 已經被其他帳號綁定了' });

  await db.prepare('UPDATE admin_users SET email = ? WHERE id = ?').run(email, req.session.userId);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId) return res.json({ loggedIn: false, googleClientId: process.env.GOOGLE_CLIENT_ID || null });
  const user = await db.prepare('SELECT id, username, role, email FROM admin_users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json({ loggedIn: false, googleClientId: process.env.GOOGLE_CLIENT_ID || null });
  res.json({ loggedIn: true, username: user.username, role: user.role, email: user.email, googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

module.exports = router;
