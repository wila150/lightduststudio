const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { UPLOAD_DIR } = require('../paths');
const { registerMedia } = require('../lib/media');

const router = express.Router();

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error('請上傳 JPG/PNG/WEBP/SVG 圖片'), ok);
  }
});

const EDITABLE_FIELDS = [
  'brand_name_zh', 'brand_name_en', 'accent_color',
  'seo_title', 'seo_description', 'footer_tagline',
  'contact_phone', 'contact_email', 'contact_address',
  'social_line', 'social_instagram', 'social_facebook'
];

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  res.json(settings);
});

router.put('/', requireAuth, (req, res) => {
  const body = req.body || {};
  const updates = EDITABLE_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(body, f));
  if (!updates.length) return res.status(400).json({ error: '沒有可更新的欄位' });

  const setClause = updates.map((f) => `${f} = ?`).join(', ');
  const values = updates.map((f) => String(body[f] ?? '').trim());
  db.prepare(`UPDATE site_settings SET ${setClause} WHERE id = 1`).run(...values);

  res.json(db.prepare('SELECT * FROM site_settings WHERE id = 1').get());
});

function uploadImageField(field) {
  return (req, res) => {
    if (!req.file) return res.status(400).json({ error: '請選擇圖片檔案' });
    const url = `/uploads/${req.file.filename}`;
    registerMedia({ filename: req.file.filename, url, mediaType: 'image', originalName: req.file.originalname });
    db.prepare(`UPDATE site_settings SET ${field} = ? WHERE id = 1`).run(url);
    res.json({ url });
  };
}

router.post('/logo', requireAuth, upload.single('file'), uploadImageField('logo_url'));
router.post('/favicon', requireAuth, upload.single('file'), uploadImageField('favicon_url'));

module.exports = router;
