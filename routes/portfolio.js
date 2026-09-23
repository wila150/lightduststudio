const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia } = require('../lib/media');
const { makeUpload, destroyAsset } = require('../lib/cloudinary');

const router = express.Router();
const upload = makeUpload('portfolio', { allowVideo: true, maxSizeMB: 25 });

const GROUPS = {
  photography: ['commercial', 'food', 'space', 'portrait', 'wedding'],
  film: ['production', 'brand', 'short'],
  design: ['graphic', 'marketing']
};

async function withPhotos(project) {
  const photos = await db.prepare('SELECT * FROM portfolio_photos WHERE project_id = ? ORDER BY sort_order ASC, id ASC').all(project.id);
  return { ...project, photos };
}

// Admin: every project across all groups, with a photo count (for the dashboard)
router.get('/', requireAuth, async (req, res) => {
  const projects = await db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM portfolio_photos ph WHERE ph.project_id = p.id) AS photo_count
    FROM portfolio_projects p ORDER BY p.group_key, p.sort_order ASC, p.id DESC
  `).all();
  res.json(projects);
});

// Admin: single project with its full photo list, for editing
router.get('/project/:id', requireAuth, async (req, res) => {
  const project = await db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  res.json(await withPhotos(project));
});

// Public: single project with its full photo list, for the lightbox
router.get('/detail/:id', async (req, res) => {
  const project = await db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  res.json(await withPhotos(project));
});

// Admin: create a new project (album). Video projects upload their file here;
// image albums start empty and photos are added afterward.
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const { group_key, category_key, tag, title, media_type, sort_order } = req.body || {};
  if (!GROUPS[group_key] || !GROUPS[group_key].includes(category_key)) {
    if (req.file) await destroyAsset(req.file.public_id, req.file.resource_type);
    return res.status(400).json({ error: '分類錯誤' });
  }
  if (!title || !title.trim()) {
    if (req.file) await destroyAsset(req.file.public_id, req.file.resource_type);
    return res.status(400).json({ error: '請輸入作品標題' });
  }

  const isVideo = media_type === 'video';
  if (isVideo && !req.file) return res.status(400).json({ error: '請上傳影片檔案' });

  if (req.file) {
    await registerMedia({
      filename: req.file.public_id, url: req.file.secure_url,
      mediaType: req.file.resource_type === 'video' ? 'video' : 'image', originalName: req.file.originalname
    });
  }

  const info = await db.prepare(`
    INSERT INTO portfolio_projects (group_key, category_key, tag, title, media_type, video_url, video_filename, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    group_key, category_key, (tag || '').trim(), title.trim(),
    isVideo ? 'video' : 'image',
    isVideo ? req.file.secure_url : '', isVideo ? req.file.public_id : '',
    Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', requireAuth, upload.single('file'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { tag, title, category_key, sort_order } = req.body || {};

  let videoUrl = existing.video_url;
  let videoFilename = existing.video_filename;
  if (req.file && existing.media_type === 'video') {
    await registerMedia({ filename: req.file.public_id, url: req.file.secure_url, mediaType: 'video', originalName: req.file.originalname });
    if (existing.video_filename) await destroyAsset(existing.video_filename, 'video');
    if (existing.video_url) await unregisterMedia(existing.video_url);
    videoUrl = req.file.secure_url;
    videoFilename = req.file.public_id;
  }

  await db.prepare(`
    UPDATE portfolio_projects SET tag = ?, title = ?, category_key = ?, sort_order = ?, video_url = ?, video_filename = ?
    WHERE id = ?
  `).run(
    tag !== undefined ? tag.trim() : existing.tag,
    title !== undefined ? title.trim() : existing.title,
    category_key !== undefined ? category_key : existing.category_key,
    sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
    videoUrl, videoFilename,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const project = await db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  const photos = await db.prepare('SELECT * FROM portfolio_photos WHERE project_id = ?').all(req.params.id);

  await db.prepare('DELETE FROM portfolio_projects WHERE id = ?').run(req.params.id);

  for (const photo of photos) {
    await destroyAsset(photo.filename, 'image');
    await unregisterMedia(photo.url);
  }
  if (project.video_filename) await destroyAsset(project.video_filename, 'video');
  if (project.video_url) await unregisterMedia(project.video_url);

  res.json({ ok: true });
});

// Admin: add one photo to an image album (auto-becomes the cover if it's the first)
router.post('/:id/photos', requireAuth, upload.single('file'), async (req, res) => {
  const project = await db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  if (!req.file) return res.status(400).json({ error: '請選擇圖片' });

  await registerMedia({ filename: req.file.public_id, url: req.file.secure_url, mediaType: 'image', originalName: req.file.originalname });

  const { c } = await db.prepare('SELECT COUNT(*) AS c FROM portfolio_photos WHERE project_id = ?').get(req.params.id);
  const info = await db.prepare('INSERT INTO portfolio_photos (project_id, url, filename, caption, sort_order) VALUES (?, ?, ?, ?, ?)').run(
    req.params.id, req.file.secure_url, req.file.public_id, (req.body && req.body.caption) || '', c
  );

  if (!project.cover_url) {
    await db.prepare('UPDATE portfolio_projects SET cover_url = ?, cover_filename = ? WHERE id = ?').run(
      req.file.secure_url, req.file.public_id, req.params.id
    );
  }
  res.json({ id: info.lastInsertRowid });
});

router.delete('/photos/:id', requireAuth, async (req, res) => {
  const photo = await db.prepare('SELECT * FROM portfolio_photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'not found' });

  await db.prepare('DELETE FROM portfolio_photos WHERE id = ?').run(req.params.id);
  await destroyAsset(photo.filename, 'image');
  await unregisterMedia(photo.url);

  const project = await db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(photo.project_id);
  if (project && project.cover_url === photo.url) {
    const nextCover = await db.prepare('SELECT * FROM portfolio_photos WHERE project_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1').get(photo.project_id);
    await db.prepare('UPDATE portfolio_projects SET cover_url = ?, cover_filename = ? WHERE id = ?').run(
      nextCover ? nextCover.url : '', nextCover ? nextCover.filename : '', photo.project_id
    );
  }
  res.json({ ok: true });
});

// Public: list projects for one group (grid view — cover + photo count, no full photo list)
router.get('/:group', async (req, res) => {
  const { group } = req.params;
  if (!GROUPS[group]) return res.status(404).json({ error: 'unknown group' });
  const projects = await db.prepare(`
    SELECT p.id, p.category_key, p.tag, p.title, p.media_type, p.cover_url, p.video_url, p.sort_order,
      (SELECT COUNT(*) FROM portfolio_photos ph WHERE ph.project_id = p.id) AS photo_count
    FROM portfolio_projects p WHERE p.group_key = ? ORDER BY p.sort_order ASC, p.id DESC
  `).all(group);
  res.json(projects);
});

module.exports = router;
