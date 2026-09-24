const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const live = require('../lib/live');

const router = express.Router();

router.get('/stream', requireAuth, async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  const { unread } = await db.prepare('SELECT COUNT(*) AS unread FROM messages WHERE is_read = 0').get();
  live.send(res, 'hello', { unread, ...live.snapshot() });
  live.addClient(res);
});

module.exports = router;
