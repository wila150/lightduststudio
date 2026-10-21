const layout = require("./layout");
const { ASSET_VERSION } = require("../../config/version");

// 即時統計（2026/10/03，版面移植自 lightdustudio）：資料由 public/js/analyticsPage.js 抓 /cms/analytics/summary.json
// 和即時通道（public/js/cmsLive.js）更新
module.exports = () => layout(
    "即時統計",
    `
<h1>即時統計</h1>
<p style="color:var(--soft);margin:4px 0 20px;font-size:13px;">只計算一般訪客：機器人、後台和你自己登入過後台的瀏覽器都不會被算進去。</p>

<section class="stat-tiles">
    <div class="stat-tile">
        <div class="label"><span class="live-dot" id="stat-dot"></span>目前在線</div>
        <div class="value" id="stat-online">0</div>
        <div class="sub">最近 70 秒內有活動的訪客</div>
    </div>
    <div class="stat-tile">
        <div class="label">今日瀏覽</div>
        <div class="value" id="stat-today-views">0</div>
        <div class="sub" id="stat-today-visitors">0 位訪客</div>
    </div>
    <div class="stat-tile">
        <div class="label">近 7 天瀏覽</div>
        <div class="value" id="stat-week-views">0</div>
        <div class="sub" id="stat-week-visitors">0 位訪客</div>
    </div>
</section>

<div class="split">
    <section class="panel">
        <h2>目前正在看的頁面</h2>
        <ul class="rank-list" id="live-pages"><li class="empty-feed">目前沒有訪客在線上</li></ul>
    </section>
    <section class="panel">
        <h2>即時動態</h2>
        <ul class="feed" id="live-feed"><li class="empty-feed">等待訪客動態…</li></ul>
    </section>
</div>

<section class="panel">
    <h2 class="panel-head">近 7 天瀏覽量 <button type="button" class="ghost-toggle" id="chart-table-toggle">表格檢視</button></h2>
    <div class="chart-wrap" id="chart-wrap">
        <div class="chart-tip" id="chart-tip"></div>
        <div class="chart" id="chart" role="img" aria-label="近 7 天每日瀏覽量長條圖"></div>
        <div class="chart-axis" id="chart-axis"></div>
        <table class="chart-table" id="chart-table">
            <thead><tr><th>日期</th><th>瀏覽</th><th>訪客</th></tr></thead>
            <tbody></tbody>
        </table>
    </div>
</section>

<div class="split">
    <section class="panel">
        <h2>熱門頁面（近 7 天）</h2>
        <ul class="rank-list" id="top-pages"></ul>
    </section>
    <section class="panel">
        <h2>熱門作品（近 7 天開啟次數）</h2>
        <ul class="rank-list" id="top-items"></ul>
    </section>
</div>

<script src="/js/analyticsPage.js?v=${ASSET_VERSION}"></script>
`
);
