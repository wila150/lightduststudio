// In-memory hub for the admin panel's real-time features: an SSE client list
// plus a "who is on the site right now" map. Single-process only, which is
// what the free Render instance is.
const clients = new Set();
const visitors = new Map(); // visitorId -> { lastSeen, path }
const ONLINE_WINDOW_MS = 70 * 1000;

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data) {
  for (const res of clients) send(res, event, data);
}

function prune() {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  for (const [id, v] of visitors) if (v.lastSeen < cutoff) visitors.delete(id);
}

function snapshot() {
  prune();
  const perPath = new Map();
  for (const v of visitors.values()) perPath.set(v.path, (perPath.get(v.path) || 0) + 1);
  return {
    online: visitors.size,
    pages: [...perPath.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count)
  };
}

function touchVisitor(id, path) {
  visitors.set(id, { lastSeen: Date.now(), path });
}

function addClient(res) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

setInterval(() => {
  if (!clients.size) return;
  broadcast('visitors', snapshot());
}, 5000).unref();

setInterval(() => {
  for (const res of clients) res.write(': keep-alive\n\n');
}, 20000).unref();

module.exports = { addClient, broadcast, send, snapshot, touchVisitor };
