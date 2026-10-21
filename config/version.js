// 拿來幫靜態檔案（CSS/JS）做 cache-busting：每次重新部署都會變成新的值，
// 瀏覽器就會抓最新版本，不會因為長效快取（見 server.js 的 express.static maxAge）
// 卡住看到部署前的舊版畫面。Render 平台會自動注入 RENDER_GIT_COMMIT，本機開發沒有這個值就退回用啟動時間。
const ASSET_VERSION = process.env.RENDER_GIT_COMMIT || String(Date.now());

module.exports = { ASSET_VERSION };
