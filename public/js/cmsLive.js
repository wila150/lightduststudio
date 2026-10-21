// 後台即時通道（2026/10/03，移植自 lightdustudio）：每個後台頁面都會載入
// - 右上角的連線燈號（綠＝即時連線中）、「開啟桌面通知」按鈕
// - 新留言：右下角跳通知、「留言」選單紅點、分頁標題 (N)、瀏覽器在背景時發桌面通知
// - 把事件轉發成 window 的 "bd:live" 事件，給即時統計頁更新畫面
// - 標記這個瀏覽器是管理員，前台不再計入瀏覽統計
(function () {

    try { localStorage.setItem("bd_no_track", "1"); } catch (e) {}

    // 登入過期提示（2026/10/04）：後台頁面開著時登入過期，任何抓資料的請求回 401，
    // 就在畫面上方顯示「登入已過期」＋重新登入按鈕，不要只看到「載入失敗」
    function showLoginExpired() {
        if (document.getElementById("login-expired-bar")) return;
        var bar = document.createElement("div");
        bar.id = "login-expired-bar";
        bar.innerHTML = "登入已過期，剛剛的操作沒有儲存。<a href=\"/cms/login\">重新登入</a>";
        document.body.appendChild(bar);
    }
    window.BlueDotLoginExpired = showLoginExpired;

    if (window.fetch) {
        var originalFetch = window.fetch;
        window.fetch = function () {
            return originalFetch.apply(this, arguments).then(function (res) {
                if (res.status === 401 && res.url.indexOf(location.origin + "/cms") === 0) showLoginExpired();
                return res;
            });
        };
    }

    if (!window.EventSource) return;

    var baseTitle = document.title;
    var tools = document.querySelector(".admin-header-actions");
    var badge = document.getElementById("unread-badge");

    function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });
    }

    function setBadge(count) {
        if (badge) {
            badge.textContent = count;
            badge.hidden = !(count > 0);
        }
        document.title = (count > 0 ? "(" + count + ") " : "") + baseTitle;
    }

    function showToast(title, body, href) {
        var stack = document.querySelector(".toast-stack");
        if (!stack) {
            stack = document.createElement("div");
            stack.className = "toast-stack";
            document.body.appendChild(stack);
        }
        var el = document.createElement("div");
        el.className = "toast";
        el.innerHTML = "<strong>" + escapeHtml(title) + "</strong><span>" + escapeHtml(body) + "</span>";
        el.addEventListener("click", function () { if (href) window.location.href = href; el.remove(); });
        stack.appendChild(el);
        setTimeout(function () { el.remove(); }, 9000);
    }

    // 給收件匣用：標已讀／未讀後直接更新紅點跟分頁標題
    window.BlueDotLive = { setBadge: setBadge, showToast: showToast };

    var dot = document.createElement("span");
    dot.className = "live-dot";
    dot.title = "即時連線中斷";

    if (tools) {
        tools.insertBefore(dot, tools.firstChild);
        if ("Notification" in window && Notification.permission === "default") {
            var notifyBtn = document.createElement("button");
            notifyBtn.type = "button";
            notifyBtn.className = "ghost-btn notify-btn";
            notifyBtn.textContent = "開啟桌面通知";
            notifyBtn.addEventListener("click", function () {
                Notification.requestPermission().then(function (result) {
                    notifyBtn.remove();
                    if (result === "granted") showToast("已開啟桌面通知", "有新留言時，就算瀏覽器在背景也會跳通知。");
                });
            });
            tools.insertBefore(notifyBtn, dot.nextSibling);
        }
    }

    var es = new EventSource("/cms/live/stream");
    es.onopen = function () { dot.classList.add("on"); dot.title = "即時連線中"; };
    es.onerror = function () {
        dot.classList.remove("on");
        dot.title = es.readyState === EventSource.CLOSED ? "即時連線已關閉，請重新整理頁面" : "即時連線中斷，重新連線中…";
    };

    function emit(type, data) {
        window.dispatchEvent(new CustomEvent("bd:live", { detail: { type: type, data: data } }));
    }

    ["hello", "visitors", "view"].forEach(function (type) {
        es.addEventListener(type, function (event) {
            var data = JSON.parse(event.data);
            if (type === "hello") setBadge(data.unread);
            emit(type, data);
        });
    });

    es.addEventListener("message", function (event) {
        var data = JSON.parse(event.data);
        setBadge(data.unread);
        showToast("新留言：" + data.name, data.preview, "/cms/messages");
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            var n = new Notification("新留言：" + data.name, { body: data.preview, icon: "/images/favicon-48.png" });
            n.onclick = function () { window.focus(); window.location.href = "/cms/messages"; };
        }
        emit("message", data);
    });

})();
