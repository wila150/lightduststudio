const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Public: nested nav tree (top-level items with their children, in order)
router.get('/', (req, res) => {
  const parents = db.prepare('SELECT * FROM nav_items WHERE parent_id IS NULL ORDER BY sort_order ASC, id ASC').all();
  const children = db.prepare('SELECT * FROM nav_items WHERE parent_id IS NOT NULL ORDER BY sort_order ASC, id ASC').all();

  const tree = parents.map((p) => ({
    ...p,
    children: children.filter((c) => c.parent_id === p.id)
  }));
  res.json(tree);
});

// Admin: flat list (for the editor UI)
router.get('/flat', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM nav_items ORDER BY parent_id IS NOT NULL, sort_order ASC, id ASC').all();
  res.json(items);
});

router.post('/', requireAuth, (req, res) => {
  const { parent_id, label, url, sort_order } = req.body || {};
  if (!label || !String(label).trim()) return res.status(400).json({ error: '請輸入名稱' });

  const info = db.prepare('INSERT INTO nav_items (parent_id, label, url, sort_order) VALUES (?, ?, ?, ?)').run(
    parent_id || null,
    String(label).trim(),
    String(url || '').trim(),
    Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM nav_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const { label, url, sort_order } = req.body || {};
  db.prepare('UPDATE nav_items SET label = ?, url = ?, sort_order = ? WHERE id = ?').run(
    label !== undefined ? String(label).trim() : existing.label,
    url !== undefined ? String(url).trim() : existing.url,
    sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM nav_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare('DELETE FROM nav_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
