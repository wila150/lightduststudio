const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia, isFileInUse } = require('../lib/media');
const { makeUpload, destroyAsset } = require('../lib/cloudinary');

const router = express.Router();
router.use(requireAuth);

const upload = makeUpload('library', { allowVideo: true, maxSizeMB: 40 });

router.get('/', async (req, res) => {
  const items = await db.prepare('SELECT * FROM media ORDER BY created_at DESC').all();
  res.json(items);
});

router.post('/upload', upload.array('files', 20), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: '請選擇檔案' });

  const items = [];
  for (const file of files) {
    const url = file.secure_url;
    const mediaType = file.resource_type === 'video' ? 'video' : 'image';
    await registerMedia({ filename: file.public_id, url, mediaType, originalName: file.originalname });
    items.push(await db.prepare('SELECT * FROM media WHERE url = ?').get(url));
  }
  res.json({ items });
});

router.delete('/:id', async (req, res) => {
  const item = await db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (await isFileInUse(item.url)) {
    return res.status(400).json({ error: '這個檔案目前正被使用中，無法刪除' });
  }
  await destroyAsset(item.filename, item.media_type);
  await unregisterMedia(item.url);
  res.json({ ok: true });
});

module.exports = router;
