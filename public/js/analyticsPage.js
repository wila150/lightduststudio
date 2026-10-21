// 即時統計頁（2026/10/03，移植自 lightdustudio）
(function () {

    var dot = document.getElementById("stat-dot");
    var chartEl = document.getElementById("chart");
    var axisEl = document.getElementById("chart-axis");
    var wrap = document.getElementById("chart-wrap");
    var tip = document.getElementById("chart-tip");
    var feed = document.getElementById("live-feed");
    var todayViews = 0;

    function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });
    }
    function fmtDay(iso) { return iso.slice(5).replace("-", "/"); }
    function clock(ts) {
        return new Date(ts).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    }

    function renderLive(live) {
        document.getElementById("stat-online").textContent = live.online;
        dot.classList.toggle("on", live.online > 0);
        document.getElementById("live-pages").innerHTML = live.pages.length
            ? live.pages.map(function (p) {
                return "<li><span>" + escapeHtml(p.label || p.path) + "</span><span class=\"n\">" + p.count + " 人</span></li>";
            }).join("")
            : "<li class=\"empty-feed\">目前沒有訪客在線上</li>";
    }

    function renderRank(id, rows) {
        document.getElementById(id).innerHTML = rows.length
            ? rows.map(function (r) {
                return "<li><a href=\"" + escapeHtml(r.path) + "\" target=\"_blank\" rel=\"noopener\">" + escapeHtml(r.label || r.path) + "</a><span class=\"n\">" + r.views + " 次</span></li>";
            }).join("")
            : "<li class=\"empty-feed\">還沒有資料</li>";
    }

    function renderChart(days) {
        var max = Math.max.apply(null, days.map(function (d) { return d.views; }).concat([1]));
        chartEl.innerHTML = days.map(function (d) {
            var h = Math.round(d.views / max * 84);
            return "<div class=\"col\" tabindex=\"0\" data-date=\"" + d.date + "\" data-views=\"" + d.views + "\" data-visitors=\"" + d.visitors + "\" " +
                "aria-label=\"" + fmtDay(d.date) + "：" + d.views + " 次瀏覽，" + d.visitors + " 位訪客\">" +
                "<span class=\"val\">" + d.views + "</span><div class=\"bar\" style=\"height:" + h + "%\"></div></div>";
        }).join("");
        axisEl.innerHTML = days.map(function (d) { return "<span>" + fmtDay(d.date) + "</span>"; }).join("");
        wrap.querySelector("tbody").innerHTML = days.map(function (d) {
            return "<tr><td>" + d.date + "</td><td>" + d.views + "</td><td>" + d.visitors + "</td></tr>";
        }).join("");
    }

    function showTip(event) {
        var col = event.target.closest(".col");
        if (!col) return;
        var bar = col.querySelector(".bar");
        tip.textContent = fmtDay(col.getAttribute("data-date")) + "  " + col.getAttribute("data-views") + " 次瀏覽 / " + col.getAttribute("data-visitors") + " 位訪客";
        tip.style.left = (col.offsetLeft + col.offsetWidth / 2) + "px";
        tip.style.top = (col.offsetTop + col.offsetHeight - bar.offsetHeight - 22) + "px";
        wrap.classList.add("show-tip");
    }

    chartEl.addEventListener("mouseover", showTip);
    chartEl.addEventListener("focusin", showTip);
    chartEl.addEventListener("mouseleave", function () { wrap.classList.remove("show-tip"); });
    chartEl.addEventListener("focusout", function () { wrap.classList.remove("show-tip"); });
    document.getElementById("chart-table-toggle").addEventListener("click", function (event) {
        var on = wrap.classList.toggle("table-view");
        event.target.textContent = on ? "圖表檢視" : "表格檢視";
    });

    function load() {
        fetch("/cms/analytics/summary.json")
            .then(function (res) { return res.json(); })
            .then(function (d) {
                todayViews = d.today.views;
                document.getElementById("stat-today-views").textContent = todayViews;
                document.getElementById("stat-today-visitors").textContent = d.today.visitors + " 位訪客";
                document.getElementById("stat-week-views").textContent = d.week.views;
                document.getElementById("stat-week-visitors").textContent = d.week.visitors + " 位訪客";
                renderLive(d.live);
                renderChart(d.last7);
                renderRank("top-pages", d.topPages);
                renderRank("top-items", d.topItems);
            });
    }

    load();
    setInterval(load, 60000);

    window.addEventListener("bd:live", function (event) {
        var type = event.detail.type;
        var data = event.detail.data;
        if (type === "hello" || type === "visitors") renderLive(data);
        if (type === "view" || type === "message") {
            var text;
            if (type === "message") text = "收到新留言：" + data.name;
            else if (data.kind === "item") text = "開啟作品「" + (data.label || data.path) + "」";
            else text = "瀏覽 " + (data.label || data.path);
            if (type === "view") {
                todayViews++;
                document.getElementById("stat-today-views").textContent = todayViews;
            }
            var li = document.createElement("li");
            li.innerHTML = "<span class=\"t\">" + clock(data.ts || Date.now()) + "</span><span>" + escapeHtml(text) + "</span>";
            if (feed.querySelector(".empty-feed")) feed.innerHTML = "";
            feed.insertBefore(li, feed.firstChild);
            while (feed.children.length > 30) feed.removeChild(feed.lastChild);
        }
    });

})();
