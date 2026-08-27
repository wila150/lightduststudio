const { db } = require('../db');

function registerMedia({ filename, url, mediaType, originalName }) {
  try {
    db.prepare(`
      INSERT INTO media (filename, url, media_type, original_name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(url) DO NOTHING
    `).run(filename, url, mediaType || 'image', originalName || '');
  } catch (err) {
    console.warn('[media] failed to register upload:', err.message);
  }
}

function unregisterMedia(url) {
  db.prepare('DELETE FROM media WHERE url = ?').run(url);
}

// Best-effort check across every place a media URL could be referenced.
function isFileInUse(url) {
  const filename = url.split('/').pop();

  const inPortfolio = db.prepare('SELECT 1 FROM portfolio_items WHERE filename = ? LIMIT 1').get(filename);
  if (inPortfolio) return true;

  const inHero = db.prepare('SELECT 1 FROM hero_slides WHERE media_url = ? LIMIT 1').get(url);
  if (inHero) return true;

  const inSettings = db.prepare('SELECT 1 FROM site_settings WHERE logo_url = ? OR favicon_url = ? LIMIT 1').get(url, url);
  if (inSettings) return true;

  const inBlocks = db.prepare("SELECT 1 FROM page_blocks WHERE content LIKE '%' || ? || '%' LIMIT 1").get(url);
  if (inBlocks) return true;

  return false;
}

module.exports = { registerMedia, unregisterMedia, isFileInUse };
