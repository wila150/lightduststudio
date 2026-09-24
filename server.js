require('dotenv').config();
require('express-async-errors'); // Express 4 doesn't auto-catch async route rejections — this patches that.

const express = require('express');
const path = require('path');
const session = require('express-session');
const { db, init } = require('./db');

const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const contactRoutes = require('./routes/contact');
const settingsRoutes = require('./routes/settings');
const navRoutes = require('./routes/nav');
const heroRoutes = require('./routes/hero');
const pagesRoutes = require('./routes/pages');
const homeBlocksRoutes = require('./routes/home-blocks');
const messagesRoutes = require('./routes/messages');
const mediaRoutes = require('./routes/media');
const accountsRoutes = require('./routes/accounts');
const liveRoutes = require('./routes/live');
const trackRoutes = require('./routes/track');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'lightdustudio-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));

// Clean URLs for the admin panel (/admin/settings instead of
// /admin/settings.html), with 301s from the old .html paths.
const ADMIN_DIR = path.join(__dirname, 'admin');
app.get('/admin', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'index.html')));
app.get('/admin/index.html', (req, res) => res.redirect(301, '/admin'));
const ADMIN_PAGES = ['login', 'settings', 'nav', 'hero', 'pages', 'page-edit', 'home-blocks', 'analytics', 'messages', 'media', 'accounts'];
ADMIN_PAGES.forEach((name) => {
  app.get('/admin/' + name, (req, res) => res.sendFile(path.join(ADMIN_DIR, name + '.html')));
  app.get('/admin/' + name + '.html', (req, res) => res.redirect(301, '/admin/' + name));
});

app.use('/admin', express.static(ADMIN_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/nav', navRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/home-blocks', homeBlocksRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/analytics', analyticsRoutes);

// Custom pages built in the admin page editor render through this shared template
app.get('/pages/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'page.html'));
});

const SITE_ORIGIN = 'https://lightduststudio-q8qk.onrender.com';
app.get('/sitemap.xml', async (req, res) => {
  const staticPaths = ['', 'about', 'photography', 'film', 'design', 'contact'];
  const pages = await db.prepare(
    "SELECT slug FROM pages WHERE published = 1 AND (publish_at IS NULL OR publish_at <= datetime('now'))"
  ).all();

  const urls = staticPaths.map((p) => `${SITE_ORIGIN}/${p}`)
    .concat(pages.map((p) => `${SITE_ORIGIN}/pages/${p.slug}`));

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n';

  res.type('application/xml').send(xml);
});

// Clean URLs for the core static pages (/about instead of /about.html), with
// 301s from the old .html paths so existing links/bookmarks keep working.
const STATIC_PAGES = ['about', 'photography', 'film', 'design', 'contact'];
STATIC_PAGES.forEach((name) => {
  app.get('/' + name, (req, res) => res.sendFile(path.join(__dirname, name + '.html')));
  app.get('/' + name + '.html', (req, res) => res.redirect(301, '/' + name));
});
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));

// Only these asset folders are meant to be public — the project root also
// holds server.js/db.js/routes/etc, which must never be served as static files.
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'server error' });
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LIGHTDU STUDIO server running at http://localhost:${PORT}`);
      console.log(`Admin panel at http://localhost:${PORT}/admin/login`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
