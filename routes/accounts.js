const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');

const router = express.Router();
router.use(requireAuth, requireSuperAdmin);

router.get('/', async (req, res) => {
  const accounts = await db.prepare('SELECT id, username, role, email, created_at FROM admin_users ORDER BY created_at ASC, id ASC').all();
  res.json(accounts);
});

router.post('/', async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !username.trim()) return res.status(400).json({ error: '請輸入帳號' });
  if (!password || password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });
  const finalRole = role === 'super_admin' ? 'super_admin' : 'admin';

  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = await db.prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)').run(
      username.trim(), hash, finalRole
    );
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: '這個帳號已經被使用了' });
    throw err;
  }
});

router.put('/:id/password', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });
  const hash = bcrypt.hashSync(password, 10);
  await db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (Number(req.params.id) === req.session.userId) {
    return res.status(400).json({ error: '無法刪除自己的帳號' });
  }
  if (existing.role === 'super_admin') {
    const { c } = await db.prepare("SELECT COUNT(*) AS c FROM admin_users WHERE role = 'super_admin'").get();
    if (c <= 1) return res.status(400).json({ error: '至少需要保留一位最高管理員' });
  }
  await db.prepare('DELETE FROM admin_users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
