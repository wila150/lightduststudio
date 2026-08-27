const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  req.session.userId = user.id;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.json({ loggedIn: false });
  const user = db.prepare('SELECT id, username, role FROM admin_users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, username: user.username, role: user.role });
});

module.exports = router;
