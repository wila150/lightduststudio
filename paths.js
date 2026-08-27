const path = require('path');

// Overridable via env so a platform's persistent disk (e.g. Render) can be
// mounted somewhere outside the project folder. Defaults keep local dev simple.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

module.exports = { DATA_DIR, UPLOAD_DIR };
