const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  let sql = 'SELECT * FROM messages';
  const conditions = [];
  if (req.query.filter === 'today') conditions.push("date(created_at) = date('now')");
  if (req.query.filter === 'unread') conditions.push('is_read = 0');
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  const messages = db.prepare(sql).all();
  const { unread } = db.prepare('SELECT COUNT(*) AS unread FROM messages WHERE is_read = 0').get();
  res.json({ messages, unread });
});

router.put('/:id/read', (req, res) => {
  const existing = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const isRead = req.body && req.body.is_read === false ? 0 : 1;
  db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(isRead, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/bulk-delete', (req, res) => {
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ error: '沒有選取任何訊息' });
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...ids);
  res.json({ ok: true, deleted: ids.length });
});

module.exports = router;
