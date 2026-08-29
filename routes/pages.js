const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { registerMedia, unregisterMedia } = require('../lib/media');
const { makeUpload, destroyByUrl } = require('../lib/cloudinary');

const router = express.Router();
const upload = makeUpload('pages', { allowVideo: true, maxSizeMB: 40 });

async function cleanupUrl(url) {
  if (!url) return;
  await destroyByUrl(url);
  await unregisterMedia(url);
}

async function withBlocks(page) {
  const blocks = await db.prepare('SELECT * FROM page_blocks WHERE page_id = ? ORDER BY sort_order ASC, id ASC').all(page.id);
  return {
    ...page,
    blocks: blocks.map((b) => ({ ...b, content: JSON.parse(b.content || '{}') }))
  };
}

function isVisible(page) {
  if (!page.published) return false;
  if (page.publish_at && new Date(page.publish_at).getTime() > Date.now()) return false;
  return true;
}

// Admin: list all pages
router.get('/', requireAuth, async (req, res) => {
  const pages = await db.prepare('SELECT id, slug, title, published, publish_at, created_at FROM pages ORDER BY created_at DESC').all();
  res.json(pages);
});

// Admin: single page with blocks, any status
router.get('/id/:id', requireAuth, async (req, res) => {
  const page = await db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: 'not found' });
  res.json(await withBlocks(page));
});

// Public: single published page with blocks, by slug
router.get('/slug/:slug', async (req, res) => {
  const page = await db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page || !isVisible(page)) return res.status(404).json({ error: 'not found' });
  res.json(await withBlocks(page));
});

router.post('/', requireAuth, async (req, res) => {
  const { slug, title, seo_title, seo_description, published, publish_at } = req.body || {};
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'slug 只能使用小寫英文、數字與連字號' });
  }
  if (!title || !title.trim()) return res.status(400).json({ error: '請輸入頁面標題' });

  try {
    const info = await db.prepare(`
      INSERT INTO pages (slug, title, seo_title, seo_description, published, publish_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(slug, title.trim(), seo_title || '', seo_description || '', published === false || published === '0' ? 0 : 1, publish_at || null);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: '這個網址代稱已經被使用了' });
    throw err;
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const body = req.body || {};

  await db.prepare(`
    UPDATE pages SET slug = ?, title = ?, seo_title = ?, seo_description = ?, published = ?, publish_at = ?
    WHERE id = ?
  `).run(
    body.slug !== undefined ? body.slug : existing.slug,
    body.title !== undefined ? body.title.trim() : existing.title,
    body.seo_title !== undefined ? body.seo_title : existing.seo_title,
    body.seo_description !== undefined ? body.seo_description : existing.seo_description,
    body.published !== undefined ? (body.published === false || body.published === '0' ? 0 : 1) : existing.published,
    body.publish_at !== undefined ? (body.publish_at || null) : existing.publish_at,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const blocks = await db.prepare('SELECT * FROM page_blocks WHERE page_id = ?').all(req.params.id);
  for (const b of blocks) {
    const content = JSON.parse(b.content || '{}');
    await cleanupUrl(content.media_url);
    await cleanupUrl(content.image_url);
    for (const img of content.images || []) await cleanupUrl(img.url);
  }
  // Any nav item pointing at this page would otherwise keep a dangling
  // page_id and resolve to a dead link once the page is gone.
  await db.prepare('UPDATE nav_items SET page_id = NULL WHERE page_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Generic media uploader for block content (returns a URL to embed in JSON fields)
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '請選擇檔案' });
  const type = req.file.resource_type === 'video' ? 'video' : 'image';
  const url = req.file.secure_url;
  await registerMedia({ filename: req.file.public_id, url, mediaType: type, originalName: req.file.originalname });
  res.json({ url, type });
});

router.post('/:pageId/blocks', requireAuth, async (req, res) => {
  const page = await db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) return res.status(404).json({ error: 'not found' });
  const { block_type, content, sort_order } = req.body || {};
  if (!block_type) return res.status(400).json({ error: '請選擇區塊類型' });

  const info = await db.prepare('INSERT INTO page_blocks (page_id, block_type, content, sort_order) VALUES (?, ?, ?, ?)').run(
    req.params.pageId, block_type, JSON.stringify(content || {}), Number(sort_order) || 0
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/blocks/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { content, sort_order } = req.body || {};

  await db.prepare('UPDATE page_blocks SET content = ?, sort_order = ? WHERE id = ?').run(
    content !== undefined ? JSON.stringify(content) : existing.content,
    sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/blocks/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const content = JSON.parse(existing.content || '{}');
  await cleanupUrl(content.media_url);
  await cleanupUrl(content.image_url);
  for (const img of content.images || []) await cleanupUrl(img.url);
  await db.prepare('DELETE FROM page_blocks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Gallery blocks: append/remove one image at a time
router.post('/blocks/:id/gallery-image', requireAuth, upload.single('file'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (!req.file) return res.status(400).json({ error: '請選擇圖片' });

  const url = req.file.secure_url;
  await registerMedia({ filename: req.file.public_id, url, mediaType: 'image', originalName: req.file.originalname });

  const content = JSON.parse(existing.content || '{}');
  content.images = content.images || [];
  content.images.push({ url, caption: (req.body && req.body.caption) || '' });

  await db.prepare('UPDATE page_blocks SET content = ? WHERE id = ?').run(JSON.stringify(content), req.params.id);
  res.json({ ok: true, images: content.images });
});

router.delete('/blocks/:id/gallery-image/:index', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM page_blocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const content = JSON.parse(existing.content || '{}');
  const idx = Number(req.params.index);
  const removed = (content.images || [])[idx];
  content.images = (content.images || []).filter((_, i) => i !== idx);
  if (removed) await cleanupUrl(removed.url);

  await db.prepare('UPDATE page_blocks SET content = ? WHERE id = ?').run(JSON.stringify(content), req.params.id);
  res.json({ ok: true, images: content.images });
});

module.exports = router;
