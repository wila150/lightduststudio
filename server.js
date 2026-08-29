require('dotenv').config();
require('express-async-errors'); // Express 4 doesn't auto-catch async route rejections — this patches that.

const express = require('express');
const path = require('path');
const session = require('express-session');
const { init } = require('./db');

const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const contactRoutes = require('./routes/contact');
const settingsRoutes = require('./routes/settings');
const navRoutes = require('./routes/nav');
const heroRoutes = require('./routes/hero');
const pagesRoutes = require('./routes/pages');
const messagesRoutes = require('./routes/messages');
const mediaRoutes = require('./routes/media');
const accountsRoutes = require('./routes/accounts');

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
const ADMIN_PAGES = ['login', 'settings', 'nav', 'hero', 'pages', 'page-edit', 'messages', 'media', 'accounts'];
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
app.use('/api/messages', messagesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/accounts', accountsRoutes);

// Custom pages built in the admin page editor render through this shared template
app.get('/pages/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'page.html'));
});

// Clean URLs for the core static pages (/about instead of /about.html), with
// 301s from the old .html paths so existing links/bookmarks keep working.
const STATIC_PAGES = ['about', 'photography', 'film', 'design', 'contact'];
STATIC_PAGES.forEach((name) => {
  app.get('/' + name, (req, res) => res.sendFile(path.join(__dirname, name + '.html')));
  app.get('/' + name + '.html', (req, res) => res.redirect(301, '/' + name));
});
app.get('/index.html', (req, res) => res.redirect(301, '/'));

// Public static site (index.html, css/, js/, photography.html, etc.)
app.use(express.static(path.join(__dirname)));

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
