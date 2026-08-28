const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia } = require('../lib/media');
const { makeUpload, destroyAsset } = require('../lib/cloudinary');

const router = express.Router();
const upload = makeUpload('portfolio', { allowVideo: true, maxSizeMB: 25 });

const GROUPS = {
  photography: ['commercial', 'food', 'space', 'portrait', 'wedding'],
  film: ['production', 'brand', 'short'],
  design: ['graphic', 'marketing']
};

// Admin: list every item across all groups (for the dashboard)
router.get('/', requireAuth, async (req, res) => {
  const items = await db.prepare('SELECT * FROM portfolio_items ORDER BY group_key, sort_order ASC, id DESC').all();
  res.json(items);
});

// Admin: create a new item
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const { group_key, category_key, tag, title, media_type, sort_order } = req.body || {};
  if (!GROUPS[group_key] || !GROUPS[group_key].includes(category_key)) {
    if (req.file) await destroyAsset(req.file.public_id, req.file.resource_type);
    return res.status(400).json({ error: '分類錯誤' });
  }
  if (!req.file) return res.status(400).json({ error: '請選擇要上傳的檔案' });

  const resolvedType = req.file.resource_type === 'video' ? 'video' : (media_type === 'video' ? 'video' : 'image');

  await registerMedia({
    filename: req.file.public_id,
    url: req.file.secure_url,
    mediaType: resolvedType,
    originalName: req.file.originalname
  });

  const info = await db.prepare(`
    INSERT INTO portfolio_items (group_key, category_key, tag, title, media_type, filename, url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    group_key,
    category_key,
    (tag || '').trim(),
    (title || '').trim(),
    resolvedType,
    req.file.public_id,
    req.file.secure_url,
    Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

// Admin: delete an item (and its Cloudinary asset)
router.delete('/:id', requireAuth, async (req, res) => {
  const item = await db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  await db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(req.params.id);
  await destroyAsset(item.filename, item.media_type);
  await unregisterMedia(item.url);
  res.json({ ok: true });
});

// Public: list items for one group, used by the front-end gallery pages
router.get('/:group', async (req, res) => {
  const { group } = req.params;
  if (!GROUPS[group]) return res.status(404).json({ error: 'unknown group' });
  const items = await db.prepare(`
    SELECT id, category_key, tag, title, media_type, url, sort_order
    FROM portfolio_items WHERE group_key = ? ORDER BY sort_order ASC, id DESC
  `).all(group);
  res.json(items);
});

module.exports = router;
