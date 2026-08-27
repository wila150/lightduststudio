const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { UPLOAD_DIR } = require('../paths');
const { registerMedia, unregisterMedia, isFileInUse } = require('../lib/media');

const router = express.Router();
router.use(requireAuth);

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

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM media ORDER BY created_at DESC').all();
  res.json(items);
});

router.post('/upload', upload.array('files', 20), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: '請選擇檔案' });

  const items = files.map((file) => {
    const url = `/uploads/${file.filename}`;
    const mediaType = file.mimetype === 'video/mp4' ? 'video' : 'image';
    registerMedia({ filename: file.filename, url, mediaType, originalName: file.originalname });
    return db.prepare('SELECT * FROM media WHERE url = ?').get(url);
  });
  res.json({ items });
});

router.delete('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (isFileInUse(item.url)) {
    return res.status(400).json({ error: '這個檔案目前正被使用中，無法刪除' });
  }
  fs.unlink(path.join(UPLOAD_DIR, item.filename), () => {});
  unregisterMedia(item.url);
  res.json({ ok: true });
});

module.exports = router;
