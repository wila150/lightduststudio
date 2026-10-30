// 拿來幫靜態檔案（CSS/JS）做 cache-busting：每次重新部署都會變成新的值，
// 瀏覽器就會抓最新版本，不會因為長效快取（見 server.js 的 express.static maxAge）
// 卡住看到部署前的舊版畫面。
// Cloud Run 每次部署會注入 K_REVISION（例如 lightdust-00019-zqd），同一次部署重開機也不會變，
// 後台的「有新版本」檢查（public/js/cmsUpdate.js）就是比對這個值。本機開發沒有這個值就退回用啟動時間。
const ASSET_VERSION = process.env.K_REVISION || process.env.RENDER_GIT_COMMIT || String(Date.now());

// 後台右上角顯示的版本號：K_REVISION 中間那段流水號（00019 → 19），本機顯示 dev
const revisionMatch = /-(\d+)-[^-]+$/.exec(process.env.K_REVISION || "");
const VERSION_LABEL = revisionMatch ? String(Number(revisionMatch[1])) : "dev";

module.exports = { ASSET_VERSION, VERSION_LABEL };
