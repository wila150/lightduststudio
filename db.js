const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DATA_DIR } = require('./paths');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'studio.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_key TEXT NOT NULL,
      category_key TEXT NOT NULL,
      tag TEXT NOT NULL,
      title TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'image',
      filename TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      brand_name_zh TEXT NOT NULL DEFAULT '光塵影像工作室',
      brand_name_en TEXT NOT NULL DEFAULT 'LightDust Studio',
      logo_url TEXT NOT NULL DEFAULT '/images/logo-mark.png',
      favicon_url TEXT NOT NULL DEFAULT '/images/favicon-32.png',
      accent_color TEXT NOT NULL DEFAULT '#b08a5a',
      seo_title TEXT NOT NULL DEFAULT 'LightDust Studio｜商業攝影 · 影片製作 · 平面設計',
      seo_description TEXT NOT NULL DEFAULT 'LightDust Studio 光塵影像工作室 — 提供商業攝影、美食攝影、空間攝影、人像攝影、婚禮紀錄、影片製作、形象影片、短影音、平面設計與整合行銷服務。',
      footer_tagline TEXT NOT NULL DEFAULT '光塵影像工作室 — 商業攝影、影片製作與平面設計整合服務，用影像為品牌說故事。',
      contact_phone TEXT NOT NULL DEFAULT '+886 2 0000 0000',
      contact_email TEXT NOT NULL DEFAULT 'hello@lightduststudio.com',
      contact_address TEXT NOT NULL DEFAULT 'Taipei, Taiwan',
      social_line TEXT NOT NULL DEFAULT 'https://line.me/ti/p/~lightduststudio',
      social_instagram TEXT NOT NULL DEFAULT '',
      social_facebook TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS nav_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER REFERENCES nav_items(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'image',
      original_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 1,
      publish_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS page_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      block_type TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hero_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eyebrow TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      subtitle TEXT NOT NULL DEFAULT '',
      media_type TEXT NOT NULL DEFAULT 'image',
      media_url TEXT NOT NULL DEFAULT '',
      fallback_gradient INTEGER NOT NULL DEFAULT 1,
      card_tag TEXT NOT NULL DEFAULT '',
      card_text TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migrate admin_users created before role-based accounts existed.
  const adminCols = db.prepare("PRAGMA table_info(admin_users)").all().map((c) => c.name);
  if (!adminCols.includes('role')) {
    db.exec("ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'");
  }
  if (!adminCols.includes('created_at')) {
    db.exec("ALTER TABLE admin_users ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
  }

  const { c } = db.prepare('SELECT COUNT(*) AS c FROM admin_users').get();
  if (c === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'super_admin')").run(username, hash);
    console.log(`[seed] Super admin account created — username: "${username}". Set ADMIN_USERNAME/ADMIN_PASSWORD in .env and restart to change it.`);
  } else {
    // Ensure at least one super_admin exists (promotes the earliest account from a pre-roles install).
    const { c: superCount } = db.prepare("SELECT COUNT(*) AS c FROM admin_users WHERE role = 'super_admin'").get();
    if (superCount === 0) {
      const earliest = db.prepare('SELECT id FROM admin_users ORDER BY id ASC LIMIT 1').get();
      db.prepare("UPDATE admin_users SET role = 'super_admin' WHERE id = ?").run(earliest.id);
      console.log(`[migrate] Promoted admin_users.id=${earliest.id} to super_admin (first account with role-based access).`);
    }
  }

  const { c: settingsCount } = db.prepare('SELECT COUNT(*) AS c FROM site_settings').get();
  if (settingsCount === 0) {
    db.prepare('INSERT INTO site_settings (id) VALUES (1)').run();
  }

  const { c: navCount } = db.prepare('SELECT COUNT(*) AS c FROM nav_items').get();
  if (navCount === 0) {
    const insertParent = db.prepare('INSERT INTO nav_items (label, url, sort_order) VALUES (?, ?, ?)');
    const insertChild = db.prepare('INSERT INTO nav_items (parent_id, label, url, sort_order) VALUES (?, ?, ?, ?)');

    const ourStory = insertParent.run('Our Story', '', 0).lastInsertRowid;
    insertChild.run(ourStory, '關於我們', 'about.html', 0);

    const photography = insertParent.run('Photography', '', 1).lastInsertRowid;
    [
      ['商業攝影', 'photography.html#commercial'],
      ['美食攝影', 'photography.html#food'],
      ['空間攝影', 'photography.html#space'],
      ['人像攝影', 'photography.html#portrait'],
      ['婚禮紀錄', 'photography.html#wedding']
    ].forEach(([label, url], i) => insertChild.run(photography, label, url, i));

    const film = insertParent.run('Film', '', 2).lastInsertRowid;
    [
      ['影片製作', 'film.html#production'],
      ['形象影片', 'film.html#brand'],
      ['短影音', 'film.html#short']
    ].forEach(([label, url], i) => insertChild.run(film, label, url, i));

    const design = insertParent.run('Design', '', 3).lastInsertRowid;
    [
      ['平面設計', 'design.html#graphic'],
      ['整合行銷', 'design.html#marketing']
    ].forEach(([label, url], i) => insertChild.run(design, label, url, i));
  }

  const { c: heroCount } = db.prepare('SELECT COUNT(*) AS c FROM hero_slides').get();
  if (heroCount === 0) {
    const insertSlide = db.prepare(`
      INSERT INTO hero_slides (eyebrow, title, subtitle, fallback_gradient, card_tag, card_text, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertSlide.run(
      'COMMERCIAL PHOTOGRAPHY', '用鏡頭說出\n品牌的故事', '商業攝影 × 美食攝影 × 空間攝影 — 為品牌創造有溫度的畫面',
      1, 'FEATURED WORK', '跨越感官的味覺美學：以自然光線重新定義一場餐桌上的商業攝影提案', 0
    );
    insertSlide.run(
      'FILM PRODUCTION', '影像敘事\n從畫面到情感', '形象影片 × 產品影片 × 短影音，為品牌注入動態的生命力',
      2, 'FEATURED WORK', '2026 品牌形象影片製作全紀錄：從腳本發想到後期剪輯的完整旅程', 1
    );
    insertSlide.run(
      'DESIGN & BRANDING', '設計整合\n建構品牌識別', '平面設計 × 整合行銷，打造內外一致的品牌視覺語言',
      3, 'FEATURED WORK', '品牌視覺重塑計畫：一次含括平面設計與社群行銷素材的整合提案', 2
    );
  }
}

module.exports = { db, init };
