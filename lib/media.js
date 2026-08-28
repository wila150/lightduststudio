const { db } = require('../db');

async function registerMedia({ filename, url, mediaType, originalName }) {
  try {
    await db.prepare(`
      INSERT INTO media (filename, url, media_type, original_name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(url) DO NOTHING
    `).run(filename, url, mediaType || 'image', originalName || '');
  } catch (err) {
    console.warn('[media] failed to register upload:', err.message);
  }
}

async function unregisterMedia(url) {
  await db.prepare('DELETE FROM media WHERE url = ?').run(url);
}

// Best-effort check across every place a media URL could be referenced.
async function isFileInUse(url) {
  const inPortfolio = await db.prepare('SELECT 1 FROM portfolio_items WHERE url = ? LIMIT 1').get(url);
  if (inPortfolio) return true;

  const inHero = await db.prepare('SELECT 1 FROM hero_slides WHERE media_url = ? LIMIT 1').get(url);
  if (inHero) return true;

  const inSettings = await db.prepare('SELECT 1 FROM site_settings WHERE logo_url = ? OR favicon_url = ? LIMIT 1').get(url, url);
  if (inSettings) return true;

  const inBlocks = await db.prepare("SELECT 1 FROM page_blocks WHERE content LIKE '%' || ? || '%' LIMIT 1").get(url);
  if (inBlocks) return true;

  return false;
}

module.exports = { registerMedia, unregisterMedia, isFileInUse };
