const { db } = require('../db');

module.exports = async function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'unauthorized' });
  const user = await db.prepare('SELECT role FROM admin_users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ error: '只有最高管理員可以執行這個操作' });
  }
  next();
};
