const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia } = require('../lib/media');
const { makeUpload, destroyByUrl } = require('../lib/cloudinary');

const router = express.Router();
const upload = makeUpload('home-blocks', { allowVideo: true, maxSizeMB: 40 });

async function cleanupUrl(url) {
  if (!url) return;
  await destroyByUrl(url);
  await unregisterMedia(url);
}

// Public + admin: ordered list of homepage modules
router.get('/', async (req, res) => {
  const blocks = await db.prepare('SELECT * FROM home_blocks ORDER BY sort_order ASC, id ASC').all();
  res.json(blocks.map((b) => ({ ...b, content: JSON.parse(b.content || '{}') })));
});

// Generic media uploader for block content (returns a URL to embed in JSON fields)
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '請選擇檔案' });
  const type = req.file.resource_type === 'video' ? 'video' : 'image';
  const url = req.file.secure_url;
  await registerMedia({ filename: req.file.public_id, url, mediaType: type, originalName: req.file.originalname });
  res.json({ url, type });
});

router.post('/', requireAuth, async (req, res) => {
  const { block_type, content, sort_order } = req.body || {};
  if (!block_type) return res.status(400).json({ error: '請選擇區塊類型' });

  const info = await db.prepare('INSERT INTO home_blocks (block_type, content, sort_order) VALUES (?, ?, ?)').run(
    block_type, JSON.stringify(content || {}), Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM home_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { content, sort_order } = req.body || {};

  await db.prepare('UPDATE home_blocks SET content = ?, sort_order = ? WHERE id = ?').run(
    content !== undefined ? JSON.stringify(content) : existing.content,
    sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM home_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const content = JSON.parse(existing.content || '{}');
  await cleanupUrl(content.media_url);
  await cleanupUrl(content.image_url);
  for (const img of content.images || []) await cleanupUrl(img.url);
  await db.prepare('DELETE FROM home_blocks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Gallery blocks: append/remove one image at a time
router.post('/:id/gallery-image', requireAuth, upload.single('file'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM home_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (!req.file) return res.status(400).json({ error: '請選擇圖片' });

  const url = req.file.secure_url;
  await registerMedia({ filename: req.file.public_id, url, mediaType: 'image', originalName: req.file.originalname });

  const content = JSON.parse(existing.content || '{}');
  content.images = content.images || [];
  content.images.push({ url, caption: (req.body && req.body.caption) || '' });

  await db.prepare('UPDATE home_blocks SET content = ? WHERE id = ?').run(JSON.stringify(content), req.params.id);
  res.json({ ok: true, images: content.images });
});

router.delete('/:id/gallery-image/:index', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM home_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const content = JSON.parse(existing.content || '{}');
  const idx = Number(req.params.index);
  const removed = (content.images || [])[idx];
  content.images = (content.images || []).filter((_, i) => i !== idx);
  if (removed) await cleanupUrl(removed.url);

  await db.prepare('UPDATE home_blocks SET content = ? WHERE id = ?').run(JSON.stringify(content), req.params.id);
  res.json({ ok: true, images: content.images });
});

module.exports = router;
