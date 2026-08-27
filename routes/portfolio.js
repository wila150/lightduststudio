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
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$|^video\/mp4$/.test(file.mimetype);
    cb(ok ? null : new Error('不支援的檔案格式，請上傳 JPG/PNG/WEBP/GIF 圖片或 MP4 影片'), ok);
  }
});

const GROUPS = {
  photography: ['commercial', 'food', 'space', 'portrait', 'wedding'],
  film: ['production', 'brand', 'short'],
  design: ['graphic', 'marketing']
};

function withUrl(item) {
  return { ...item, url: `/uploads/${item.filename}` };
}

// Admin: list every item across all groups (for the dashboard)
router.get('/', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM portfolio_items ORDER BY group_key, sort_order ASC, id DESC').all();
  res.json(items.map(withUrl));
});

// Admin: create a new item
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  const { group_key, category_key, tag, title, media_type, sort_order } = req.body || {};
  if (!GROUPS[group_key] || !GROUPS[group_key].includes(category_key)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: '分類錯誤' });
  }
  if (!req.file) return res.status(400).json({ error: '請選擇要上傳的檔案' });

  registerMedia({
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    mediaType: req.file.mimetype === 'video/mp4' ? 'video' : 'image',
    originalName: req.file.originalname
  });

  const info = db.prepare(`
    INSERT INTO portfolio_items (group_key, category_key, tag, title, media_type, filename, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    group_key,
    category_key,
    (tag || '').trim(),
    (title || '').trim(),
    media_type === 'video' ? 'video' : 'image',
    req.file.filename,
    Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

// Admin: delete an item (and its file)
router.delete('/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(req.params.id);
  fs.unlink(path.join(UPLOAD_DIR, item.filename), () => {});
  unregisterMedia(`/uploads/${item.filename}`);
  res.json({ ok: true });
});

// Public: list items for one group, used by the front-end gallery pages
router.get('/:group', (req, res) => {
  const { group } = req.params;
  if (!GROUPS[group]) return res.status(404).json({ error: 'unknown group' });
  const items = db.prepare(`
    SELECT id, category_key, tag, title, media_type, filename, sort_order
    FROM portfolio_items WHERE group_key = ? ORDER BY sort_order ASC, id DESC
  `).all(group);
  res.json(items.map(withUrl));
});

module.exports = router;
