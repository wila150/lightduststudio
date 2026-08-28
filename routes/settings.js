const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia } = require('../lib/media');
const { makeUpload } = require('../lib/cloudinary');

const router = express.Router();
const upload = makeUpload('settings', { allowVideo: false, maxSizeMB: 5 });

const EDITABLE_FIELDS = [
  'brand_name_zh', 'brand_name_en', 'accent_color',
  'seo_title', 'seo_description', 'footer_tagline',
  'contact_phone', 'contact_email', 'contact_address',
  'social_line', 'social_instagram', 'social_facebook'
];

router.get('/', async (req, res) => {
  const settings = await db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  res.json(settings);
});

router.put('/', requireAuth, async (req, res) => {
  const body = req.body || {};
  const updates = EDITABLE_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(body, f));
  if (!updates.length) return res.status(400).json({ error: '沒有可更新的欄位' });

  const setClause = updates.map((f) => `${f} = ?`).join(', ');
  const values = updates.map((f) => String(body[f] ?? '').trim());
  await db.prepare(`UPDATE site_settings SET ${setClause} WHERE id = 1`).run(...values);

  res.json(await db.prepare('SELECT * FROM site_settings WHERE id = 1').get());
});

function uploadImageField(field) {
  return async (req, res) => {
    if (!req.file) return res.status(400).json({ error: '請選擇圖片檔案' });
    const url = req.file.secure_url;
    await registerMedia({ filename: req.file.public_id, url, mediaType: 'image', originalName: req.file.originalname });
    await db.prepare(`UPDATE site_settings SET ${field} = ? WHERE id = 1`).run(url);
    res.json({ url });
  };
}

router.post('/logo', requireAuth, upload.single('file'), uploadImageField('logo_url'));
router.post('/favicon', requireAuth, upload.single('file'), uploadImageField('favicon_url'));

module.exports = router;
