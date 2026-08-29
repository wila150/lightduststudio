const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

function isPageVisible(page) {
  if (!page.published) return false;
  if (page.publish_at && new Date(page.publish_at).getTime() > Date.now()) return false;
  return true;
}

// A nav item linked to a page (page_id set) always resolves against that
// page's *current* slug, so renaming/unpublishing a page updates every nav
// entry pointing at it instead of leaving a stale hand-typed URL behind.
function resolveUrl(item, pagesById) {
  if (!item.page_id) return item.url;
  const page = pagesById.get(item.page_id);
  if (!page || !isPageVisible(page)) return '';
  return '/pages/' + page.slug;
}

// Public: nested nav tree (top-level items with their children, in order)
router.get('/', async (req, res) => {
  const parents = await db.prepare('SELECT * FROM nav_items WHERE parent_id IS NULL ORDER BY sort_order ASC, id ASC').all();
  const children = await db.prepare('SELECT * FROM nav_items WHERE parent_id IS NOT NULL ORDER BY sort_order ASC, id ASC').all();
  const pages = await db.prepare('SELECT id, slug, published, publish_at FROM pages').all();
  const pagesById = new Map(pages.map((p) => [p.id, p]));

  const tree = parents.map((p) => ({
    ...p,
    url: resolveUrl(p, pagesById),
    children: children.filter((c) => c.parent_id === p.id).map((c) => ({ ...c, url: resolveUrl(c, pagesById) }))
  }));
  res.json(tree);
});

// Admin: flat list (for the editor UI)
router.get('/flat', requireAuth, async (req, res) => {
  const items = await db.prepare('SELECT * FROM nav_items ORDER BY parent_id IS NOT NULL, sort_order ASC, id ASC').all();
  res.json(items);
});

router.post('/', requireAuth, async (req, res) => {
  const { parent_id, label, url, sort_order, page_id } = req.body || {};
  if (!label || !String(label).trim()) return res.status(400).json({ error: '請輸入名稱' });

  // A selected page always wins over a hand-typed URL, so the two never
  // disagree about where the link actually goes.
  const pageId = page_id ? Number(page_id) : null;

  const info = await db.prepare('INSERT INTO nav_items (parent_id, label, url, sort_order, page_id) VALUES (?, ?, ?, ?, ?)').run(
    parent_id || null,
    String(label).trim(),
    pageId ? '' : String(url || '').trim(),
    Number(sort_order) || 0,
    pageId
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM nav_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const { label, url, sort_order, page_id } = req.body || {};
  const pageId = page_id !== undefined ? (page_id ? Number(page_id) : null) : existing.page_id;

  await db.prepare('UPDATE nav_items SET label = ?, url = ?, sort_order = ?, page_id = ? WHERE id = ?').run(
    label !== undefined ? String(label).trim() : existing.label,
    pageId ? '' : (url !== undefined ? String(url).trim() : existing.url),
    sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
    pageId,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM nav_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  await db.prepare('DELETE FROM nav_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
