const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia } = require('../lib/media');
const { makeUpload, destroyAsset } = require('../lib/cloudinary');

const router = express.Router();
const upload = makeUpload('equipment', { maxSizeMB: 15 });

const CATEGORIES = ['camera', 'lens', 'drone', 'stabilizer', 'lighting', 'audio', 'other'];

function cleanCategory(value, fallback) {
  return CATEGORIES.includes(value) ? value : fallback;
}

function isFeatured(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

// Public: every item in admin order (?featured=1 → only the ones picked for the homepage)
router.get('/', async (req, res) => {
  const where = req.query.featured === '1' ? 'WHERE featured = 1' : '';
  const items = await db.prepare(`SELECT * FROM equipment ${where} ORDER BY sort_order ASC, id ASC`).all();
  res.json(items);
});

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const { name, brand, category, description, featured } = req.body || {};
  if (!name || !name.trim()) {
    if (req.file) await destroyAsset(req.file.public_id, 'image');
    return res.status(400).json({ error: '請輸入設備名稱' });
  }
  if (req.file) {
    await registerMedia({ filename: req.file.public_id, url: req.file.secure_url, mediaType: 'image', originalName: req.file.originalname });
  }
  // New items go to the end of the list.
  const { m } = await db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM equipment').get();
  const info = await db.prepare(`
    INSERT INTO equipment (name, brand, category, description, photo_url, photo_filename, featured, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), (brand || '').trim(), cleanCategory(category, 'other'), (description || '').trim(),
    req.file ? req.file.secure_url : '', req.file ? req.file.public_id : '',
    isFeatured(featured) ? 1 : 0, m + 1
  );
  res.json({ id: info.lastInsertRowid });
});

// Save a new order: body { ids: [3, 1, 2] } (first id = first position)
router.put('/order', requireAuth, async (req, res) => {
  const ids = (req.body && req.body.ids) || [];
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids 必須是陣列' });
  for (let i = 0; i < ids.length; i++) {
    await db.prepare('UPDATE equipment SET sort_order = ? WHERE id = ?').run(i, Number(ids[i]));
  }
  res.json({ ok: true });
});

router.put('/:id', requireAuth, upload.single('file'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
  if (!existing) {
    if (req.file) await destroyAsset(req.file.public_id, 'image');
    return res.status(404).json({ error: 'not found' });
  }
  const { name, brand, category, description, featured } = req.body || {};

  let photoUrl = existing.photo_url;
  let photoFilename = existing.photo_filename;
  if (req.file) {
    await registerMedia({ filename: req.file.public_id, url: req.file.secure_url, mediaType: 'image', originalName: req.file.originalname });
    if (existing.photo_filename) await destroyAsset(existing.photo_filename, 'image');
    if (existing.photo_url) await unregisterMedia(existing.photo_url);
    photoUrl = req.file.secure_url;
    photoFilename = req.file.public_id;
  }

  await db.prepare(`
    UPDATE equipment SET name = ?, brand = ?, category = ?, description = ?, photo_url = ?, photo_filename = ?, featured = ?
    WHERE id = ?
  `).run(
    name !== undefined && name.trim() ? name.trim() : existing.name,
    brand !== undefined ? brand.trim() : existing.brand,
    category !== undefined ? cleanCategory(category, existing.category) : existing.category,
    description !== undefined ? description.trim() : existing.description,
    photoUrl, photoFilename,
    featured !== undefined ? (isFeatured(featured) ? 1 : 0) : existing.featured,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  await db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
  if (existing.photo_filename) await destroyAsset(existing.photo_filename, 'image');
  if (existing.photo_url) await unregisterMedia(existing.photo_url);
  res.json({ ok: true });
});

module.exports = router;
