const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { UPLOAD_DIR } = require('../paths');
const { registerMedia, unregisterMedia } = require('../lib/media');

const router = express.Router();

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$|^video\/mp4$/.test(file.mimetype);
    cb(ok ? null : new Error('請上傳 JPG/PNG/WEBP/GIF 圖片或 MP4 影片'), ok);
  }
});

function unlinkIfLocal(url) {
  if (url && url.startsWith('/uploads/')) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {});
    unregisterMedia(url);
  }
}

function withBlocks(page) {
  const blocks = db.prepare('SELECT * FROM page_blocks WHERE page_id = ? ORDER BY sort_order ASC, id ASC').all(page.id);
  return {
    ...page,
    blocks: blocks.map((b) => ({ ...b, content: JSON.parse(b.content || '{}') }))
  };
}

function isVisible(page) {
  if (!page.published) return false;
  if (page.publish_at && new Date(page.publish_at).getTime() > Date.now()) return false;
  return true;
}

// Admin: list all pages
router.get('/', requireAuth, (req, res) => {
  const pages = db.prepare('SELECT id, slug, title, published, publish_at, created_at FROM pages ORDER BY created_at DESC').all();
  res.json(pages);
});

// Admin: single page with blocks, any status
router.get('/id/:id', requireAuth, (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: 'not found' });
  res.json(withBlocks(page));
});

// Public: single published page with blocks, by slug
router.get('/slug/:slug', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page || !isVisible(page)) return res.status(404).json({ error: 'not found' });
  res.json(withBlocks(page));
});

router.post('/', requireAuth, (req, res) => {
  const { slug, title, seo_title, seo_description, published, publish_at } = req.body || {};
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'slug 只能使用小寫英文、數字與連字號' });
  }
  if (!title || !title.trim()) return res.status(400).json({ error: '請輸入頁面標題' });

  try {
    const info = db.prepare(`
      INSERT INTO pages (slug, title, seo_title, seo_description, published, publish_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(slug, title.trim(), seo_title || '', seo_description || '', published === false || published === '0' ? 0 : 1, publish_at || null);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: '這個網址代稱已經被使用了' });
    throw err;
  }
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const body = req.body || {};

  db.prepare(`
    UPDATE pages SET slug = ?, title = ?, seo_title = ?, seo_description = ?, published = ?, publish_at = ?
    WHERE id = ?
  `).run(
    body.slug !== undefined ? body.slug : existing.slug,
    body.title !== undefined ? body.title.trim() : existing.title,
    body.seo_title !== undefined ? body.seo_title : existing.seo_title,
    body.seo_description !== undefined ? body.seo_description : existing.seo_description,
    body.published !== undefined ? (body.published === false || body.published === '0' ? 0 : 1) : existing.published,
    body.publish_at !== undefined ? (body.publish_at || null) : existing.publish_at,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const blocks = db.prepare('SELECT * FROM page_blocks WHERE page_id = ?').all(req.params.id);
  blocks.forEach((b) => {
    const content = JSON.parse(b.content || '{}');
    unlinkIfLocal(content.media_url);
    unlinkIfLocal(content.image_url);
    (content.images || []).forEach((img) => unlinkIfLocal(img.url));
  });
  db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Generic media uploader for block content (returns a URL to embed in JSON fields)
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '請選擇檔案' });
  const type = req.file.mimetype === 'video/mp4' ? 'video' : 'image';
  const url = `/uploads/${req.file.filename}`;
  registerMedia({ filename: req.file.filename, url, mediaType: type, originalName: req.file.originalname });
  res.json({ url, type });
});

router.post('/:pageId/blocks', requireAuth, (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) return res.status(404).json({ error: 'not found' });
  const { block_type, content, sort_order } = req.body || {};
  if (!block_type) return res.status(400).json({ error: '請選擇區塊類型' });

  const info = db.prepare('INSERT INTO page_blocks (page_id, block_type, content, sort_order) VALUES (?, ?, ?, ?)').run(
    req.params.pageId, block_type, JSON.stringify(content || {}), Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/blocks/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { content, sort_order } = req.body || {};

  db.prepare('UPDATE page_blocks SET content = ?, sort_order = ? WHERE id = ?').run(
    content !== undefined ? JSON.stringify(content) : existing.content,
    sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/blocks/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const content = JSON.parse(existing.content || '{}');
  unlinkIfLocal(content.media_url);
  unlinkIfLocal(content.image_url);
  (content.images || []).forEach((img) => unlinkIfLocal(img.url));
  db.prepare('DELETE FROM page_blocks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Gallery blocks: append/remove one image at a time
router.post('/blocks/:id/gallery-image', requireAuth, upload.single('file'), (req, res) => {
  const existing = db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (!req.file) return res.status(400).json({ error: '請選擇圖片' });

  const url = `/uploads/${req.file.filename}`;
  registerMedia({ filename: req.file.filename, url, mediaType: 'image', originalName: req.file.originalname });

  const content = JSON.parse(existing.content || '{}');
  content.images = content.images || [];
  content.images.push({ url, caption: (req.body && req.body.caption) || '' });

  db.prepare('UPDATE page_blocks SET content = ? WHERE id = ?').run(JSON.stringify(content), req.params.id);
  res.json({ ok: true, images: content.images });
});

router.delete('/blocks/:id/gallery-image/:index', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const content = JSON.parse(existing.content || '{}');
  const idx = Number(req.params.index);
  const removed = (content.images || [])[idx];
  content.images = (content.images || []).filter((_, i) => i !== idx);
  if (removed) unlinkIfLocal(removed.url);

  db.prepare('UPDATE page_blocks SET content = ? WHERE id = ?').run(JSON.stringify(content), req.params.id);
  res.json({ ok: true, images: content.images });
});

module.exports = router;
