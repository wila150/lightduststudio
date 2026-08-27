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

const TEXT_FIELDS = ['eyebrow', 'title', 'subtitle', 'card_tag', 'card_text'];

function parseEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return { provider: 'youtube', id: yt[1] };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { provider: 'vimeo', id: vimeo[1] };
  return null;
}

// Public: published slides only
router.get('/', (req, res) => {
  const slides = db.prepare('SELECT * FROM hero_slides WHERE published = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json(slides);
});

// Admin: every slide, including unpublished
router.get('/all', requireAuth, (req, res) => {
  const slides = db.prepare('SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC').all();
  res.json(slides);
});

router.post('/', requireAuth, upload.single('file'), (req, res) => {
  const body = req.body || {};
  let mediaType = 'image';
  let mediaUrl = '';

  if (req.file) {
    mediaType = req.file.mimetype === 'video/mp4' ? 'video' : 'image';
    mediaUrl = `/uploads/${req.file.filename}`;
    registerMedia({ filename: req.file.filename, url: mediaUrl, mediaType, originalName: req.file.originalname });
  } else if (body.embed_url && parseEmbedUrl(body.embed_url)) {
    mediaType = 'embed';
    mediaUrl = body.embed_url.trim();
  }

  const info = db.prepare(`
    INSERT INTO hero_slides (eyebrow, title, subtitle, media_type, media_url, fallback_gradient, card_tag, card_text, published, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.eyebrow || '', body.title || '', body.subtitle || '',
    mediaType, mediaUrl, Number(body.fallback_gradient) || 1,
    body.card_tag || '', body.card_text || '',
    body.published === '0' ? 0 : 1, Number(body.sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', requireAuth, upload.single('file'), (req, res) => {
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const body = req.body || {};
  let mediaType = existing.media_type;
  let mediaUrl = existing.media_url;

  if (req.file) {
    mediaType = req.file.mimetype === 'video/mp4' ? 'video' : 'image';
    mediaUrl = `/uploads/${req.file.filename}`;
    registerMedia({ filename: req.file.filename, url: mediaUrl, mediaType, originalName: req.file.originalname });
    if (existing.media_url && existing.media_type !== 'embed') {
      fs.unlink(path.join(UPLOAD_DIR, path.basename(existing.media_url)), () => {});
      unregisterMedia(existing.media_url);
    }
  } else if (body.embed_url !== undefined) {
    if (body.embed_url.trim() && parseEmbedUrl(body.embed_url)) {
      mediaType = 'embed';
      mediaUrl = body.embed_url.trim();
    } else if (!body.embed_url.trim() && existing.media_type === 'embed') {
      mediaType = 'image';
      mediaUrl = '';
    }
  }

  const updates = { eyebrow: existing.eyebrow, title: existing.title, subtitle: existing.subtitle, card_tag: existing.card_tag, card_text: existing.card_text };
  TEXT_FIELDS.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f]; });

  db.prepare(`
    UPDATE hero_slides SET eyebrow = ?, title = ?, subtitle = ?, media_type = ?, media_url = ?,
      fallback_gradient = ?, card_tag = ?, card_text = ?, published = ?, sort_order = ?
    WHERE id = ?
  `).run(
    updates.eyebrow, updates.title, updates.subtitle, mediaType, mediaUrl,
    body.fallback_gradient !== undefined ? Number(body.fallback_gradient) || 1 : existing.fallback_gradient,
    updates.card_tag, updates.card_text,
    body.published !== undefined ? (body.published === '0' ? 0 : 1) : existing.published,
    body.sort_order !== undefined ? Number(body.sort_order) || 0 : existing.sort_order,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare('DELETE FROM hero_slides WHERE id = ?').run(req.params.id);
  if (existing.media_url && existing.media_type !== 'embed') {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(existing.media_url)), () => {});
    unregisterMedia(existing.media_url);
  }
  res.json({ ok: true });
});

module.exports = router;
