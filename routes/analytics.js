const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const live = require('../lib/live');

const router = express.Router();
router.use(requireAuth);

// Days are bucketed in Taiwan time (UTC+8); created_at is stored as UTC.
const DAY = "date(created_at, '+8 hours')";

function lastSevenDays() {
  const days = [];
  const base = Date.now() + 8 * 3600 * 1000;
  for (let i = 6; i >= 0; i--) days.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
  return days;
}

router.get('/summary', async (req, res) => {
  const days = lastSevenDays();

  const today = await db.prepare(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views
     WHERE kind = 'view' AND ${DAY} = date('now', '+8 hours')`
  ).get();

  const perDay = await db.prepare(
    `SELECT ${DAY} AS d, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views
     WHERE kind = 'view' AND ${DAY} >= ? GROUP BY d`
  ).all(days[0]);
  const byDay = new Map(perDay.map((r) => [r.d, r]));
  const last7 = days.map((d) => ({ date: d, views: (byDay.get(d) || {}).views || 0, visitors: (byDay.get(d) || {}).visitors || 0 }));

  const week = await db.prepare(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views
     WHERE kind = 'view' AND ${DAY} >= ?`
  ).get(days[0]);

  const topPages = await db.prepare(
    `SELECT path, COUNT(*) AS views FROM page_views
     WHERE kind = 'view' AND ${DAY} >= ? GROUP BY path ORDER BY views DESC LIMIT 8`
  ).all(days[0]);

  const albumRows = await db.prepare(
    `SELECT ref_id, COUNT(*) AS opens FROM page_views
     WHERE kind = 'album' AND ${DAY} >= ? GROUP BY ref_id ORDER BY opens DESC LIMIT 8`
  ).all(days[0]);
  const topAlbums = [];
  for (const row of albumRows) {
    const project = await db.prepare('SELECT title FROM portfolio_projects WHERE id = ?').get(row.ref_id);
    if (project) topAlbums.push({ title: project.title, opens: row.opens });
  }

  res.json({ live: live.snapshot(), today, week, last7, topPages, topAlbums });
});

module.exports = router;
