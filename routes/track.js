const express = require('express');
const { db } = require('../db');
const live = require('../lib/live');

const router = express.Router();

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|curl|wget|python-requests/i;
const lastInsert = new Map(); // visitorId -> timestamp, cheap flood guard

function cleanPath(raw) {
  let p = String(raw || '').split(/[?#]/)[0];
  if (!/^\/[\w\-./%]*$/.test(p) || p.length > 200) return null;
  p = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

router.post('/', async (req, res) => {
  res.status(204).end();
  const ua = req.get('user-agent') || '';
  if (BOT_UA.test(ua)) return;

  const { vid, type, path: rawPath, id } = req.body || {};
  if (typeof vid !== 'string' || !/^[\w-]{8,40}$/.test(vid)) return;
  const path = cleanPath(rawPath);
  if (!path) return;

  live.touchVisitor(vid, path);
  if (type === 'ping') return;

  const now = Date.now();
  const key = vid + ':' + type;
  if (now - (lastInsert.get(key) || 0) < (type === 'album' ? 500 : 1500)) return;
  lastInsert.set(key, now);
  if (lastInsert.size > 5000) lastInsert.clear();

  try {
    if (type === 'album') {
      const projectId = Number(id);
      const project = Number.isInteger(projectId)
        ? await db.prepare('SELECT id, title FROM portfolio_projects WHERE id = ?').get(projectId)
        : null;
      if (!project) return;
      await db.prepare("INSERT INTO page_views (visitor_id, kind, path, ref_id) VALUES (?, 'album', ?, ?)").run(vid, path, project.id);
      live.broadcast('view', { kind: 'album', path, title: project.title, ts: now });
    } else {
      await db.prepare("INSERT INTO page_views (visitor_id, kind, path) VALUES (?, 'view', ?)").run(vid, path);
      live.broadcast('view', { kind: 'view', path, ts: now });
    }
  } catch (err) {
    console.warn('[track] failed to record view:', err.message);
  }
});

module.exports = router;
