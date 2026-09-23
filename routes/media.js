const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia, isFileInUse } = require('../lib/media');
const { makeUpload, destroyAsset } = require('../lib/cloudinary');

const router = express.Router();
router.use(requireAuth);

const upload = makeUpload('library', { allowVideo: true, maxSizeMB: 40 });

function toFolderId(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 'null' || raw === '0') return null;
  return Number(raw);
}

// One folder's contents: its subfolders + the files directly inside it.
router.get('/', async (req, res) => {
  const folderId = toFolderId(req.query.folder_id);

  const folders = folderId === null
    ? await db.prepare('SELECT * FROM media_folders WHERE parent_id IS NULL ORDER BY sort_order ASC, name ASC').all()
    : await db.prepare('SELECT * FROM media_folders WHERE parent_id = ? ORDER BY sort_order ASC, name ASC').all(folderId);

  const items = folderId === null
    ? await db.prepare('SELECT * FROM media WHERE folder_id IS NULL ORDER BY created_at DESC').all()
    : await db.prepare('SELECT * FROM media WHERE folder_id = ? ORDER BY created_at DESC').all(folderId);

  // Breadcrumb trail back to root, for the UI.
  const trail = [];
  let cursor = folderId;
  while (cursor !== null) {
    const folder = await db.prepare('SELECT id, parent_id, name FROM media_folders WHERE id = ?').get(cursor);
    if (!folder) break;
    trail.unshift(folder);
    cursor = folder.parent_id;
  }

  res.json({ folders, items, trail });
});

// Flat list of every folder with its full path, for a "move to..." picker.
router.get('/folders/all', async (req, res) => {
  const all = await db.prepare('SELECT * FROM media_folders').all();
  const byId = new Map(all.map((f) => [f.id, f]));

  function pathOf(folder) {
    const parts = [folder.name];
    let cursor = folder.parent_id;
    while (cursor !== null) {
      const parent = byId.get(cursor);
      if (!parent) break;
      parts.unshift(parent.name);
      cursor = parent.parent_id;
    }
    return parts.join(' / ');
  }

  const flat = all
    .map((f) => ({ id: f.id, path: pathOf(f) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  res.json(flat);
});

router.post('/folders', async (req, res) => {
  const { name, parent_id, sort_order } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: '請輸入資料夾名稱' });

  const info = await db.prepare('INSERT INTO media_folders (parent_id, name, sort_order) VALUES (?, ?, ?)').run(
    toFolderId(parent_id), String(name).trim(), Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/folders/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM media_folders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: '請輸入資料夾名稱' });

  await db.prepare('UPDATE media_folders SET name = ? WHERE id = ?').run(String(name).trim(), req.params.id);
  res.json({ ok: true });
});

router.delete('/folders/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM media_folders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const { c: childFolders } = await db.prepare('SELECT COUNT(*) AS c FROM media_folders WHERE parent_id = ?').get(req.params.id);
  const { c: childFiles } = await db.prepare('SELECT COUNT(*) AS c FROM media WHERE folder_id = ?').get(req.params.id);
  if (childFolders > 0 || childFiles > 0) {
    return res.status(400).json({ error: '資料夾內還有檔案或子資料夾，請先清空再刪除' });
  }

  await db.prepare('DELETE FROM media_folders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/upload', upload.array('files', 20), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: '請選擇檔案' });
  const folderId = toFolderId(req.body && req.body.folder_id);

  const items = [];
  for (const file of files) {
    const url = file.secure_url;
    const mediaType = file.resource_type === 'video' ? 'video' : 'image';
    await registerMedia({ filename: file.public_id, url, mediaType, originalName: file.originalname, folderId });
    items.push(await db.prepare('SELECT * FROM media WHERE url = ?').get(url));
  }
  res.json({ items });
});

router.put('/:id/move', async (req, res) => {
  const item = await db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  const folderId = toFolderId(req.body && req.body.folder_id);
  await db.prepare('UPDATE media SET folder_id = ? WHERE id = ?').run(folderId, req.params.id);
  res.json({ ok: true });
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
