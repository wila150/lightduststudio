require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const { init } = require('./db');
const { UPLOAD_DIR } = require('./paths');

init();

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

app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

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

// Public static site (index.html, css/, js/, photography.html, etc.)
app.use(express.static(path.join(__dirname)));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'server error' });
});

app.listen(PORT, () => {
  console.log(`LIGHTDU STUDIO server running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin/login.html`);
});
