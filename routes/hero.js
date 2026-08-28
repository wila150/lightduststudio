const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia } = require('../lib/media');
const { makeUpload, destroyAsset } = require('../lib/cloudinary');

const router = express.Router();
const upload = makeUpload('hero', { allowVideo: true, maxSizeMB: 40 });

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
router.get('/', async (req, res) => {
  const slides = await db.prepare('SELECT * FROM hero_slides WHERE published = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json(slides);
});

// Admin: every slide, including unpublished
router.get('/all', requireAuth, async (req, res) => {
  const slides = await db.prepare('SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC').all();
  res.json(slides);
});

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const body = req.body || {};
  let mediaType = 'image';
  let mediaUrl = '';
  let publicId = '';

  if (req.file) {
    mediaType = req.file.resource_type === 'video' ? 'video' : 'image';
    mediaUrl = req.file.secure_url;
    publicId = req.file.public_id;
    await registerMedia({ filename: publicId, url: mediaUrl, mediaType, originalName: req.file.originalname });
  } else if (body.embed_url && parseEmbedUrl(body.embed_url)) {
    mediaType = 'embed';
    mediaUrl = body.embed_url.trim();
  }

  const info = await db.prepare(`
    INSERT INTO hero_slides (eyebrow, title, subtitle, media_type, media_url, media_public_id, fallback_gradient, card_tag, card_text, published, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.eyebrow || '', body.title || '', body.subtitle || '',
    mediaType, mediaUrl, publicId, Number(body.fallback_gradient) || 1,
    body.card_tag || '', body.card_text || '',
    body.published === '0' ? 0 : 1, Number(body.sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', requireAuth, upload.single('file'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const body = req.body || {};
  let mediaType = existing.media_type;
  let mediaUrl = existing.media_url;
  let publicId = existing.media_public_id;

  if (req.file) {
    mediaType = req.file.resource_type === 'video' ? 'video' : 'image';
    mediaUrl = req.file.secure_url;
    publicId = req.file.public_id;
    await registerMedia({ filename: publicId, url: mediaUrl, mediaType, originalName: req.file.originalname });
    if (existing.media_public_id && existing.media_type !== 'embed') {
      await destroyAsset(existing.media_public_id, existing.media_type);
      await unregisterMedia(existing.media_url);
    }
  } else if (body.embed_url !== undefined) {
    if (body.embed_url.trim() && parseEmbedUrl(body.embed_url)) {
      mediaType = 'embed';
      mediaUrl = body.embed_url.trim();
      publicId = '';
    } else if (!body.embed_url.trim() && existing.media_type === 'embed') {
      mediaType = 'image';
      mediaUrl = '';
      publicId = '';
    }
  }

  const updates = { eyebrow: existing.eyebrow, title: existing.title, subtitle: existing.subtitle, card_tag: existing.card_tag, card_text: existing.card_text };
  TEXT_FIELDS.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f]; });

  await db.prepare(`
    UPDATE hero_slides SET eyebrow = ?, title = ?, subtitle = ?, media_type = ?, media_url = ?, media_public_id = ?,
      fallback_gradient = ?, card_tag = ?, card_text = ?, published = ?, sort_order = ?
    WHERE id = ?
  `).run(
    updates.eyebrow, updates.title, updates.subtitle, mediaType, mediaUrl, publicId,
    body.fallback_gradient !== undefined ? Number(body.fallback_gradient) || 1 : existing.fallback_gradient,
    updates.card_tag, updates.card_text,
    body.published !== undefined ? (body.published === '0' ? 0 : 1) : existing.published,
    body.sort_order !== undefined ? Number(body.sort_order) || 0 : existing.sort_order,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  await db.prepare('DELETE FROM hero_slides WHERE id = ?').run(req.params.id);
  if (existing.media_public_id && existing.media_type !== 'embed') {
    await destroyAsset(existing.media_public_id, existing.media_type);
    await unregisterMedia(existing.media_url);
  }
  res.json({ ok: true });
});

module.exports = router;
