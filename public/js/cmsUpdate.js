// 後台自動更新（2026/10/30）：網站重新部署後，開著的後台頁面要換成新版
// - 打開時記住自己的版本號（<meta name="app-version">），之後在兩個時機抓 /version.json 比對：
//   切回這個分頁／App（visibilitychange）、開著不動每 10 分鐘一次
// - 切回來時沒有改到一半的表單 → 直接重新載入；有沒存的修改、或是使用中（10 分鐘那次）→ 跳「有新版本」按鈕，不突然換掉畫面
(function () {

    var meta = document.querySelector('meta[name="app-version"]');
    var MY_VER = meta && meta.getAttribute("content");

    if (!MY_VER) {
        return;
    }

    var dirty = false;
    var pendingVersion = null;

    // 有 name 的欄位或可編輯區（關鍵字編輯器）改過才算「沒存的修改」；
    // 批次刪除勾選框、順序數字框這些沒有 name、改了就自動存的不算
    function markDirty(event) {
        var el = event.target;
        if (el && (el.name || el.isContentEditable) && el.closest("form, [contenteditable]")) {
            dirty = true;
        }
    }

    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);
    document.addEventListener("submit", function () { dirty = false; }, true);

    function reload() {
        var url = new URL(window.location.href);
        url.searchParams.set("v", Date.now());
        window.location.replace(url.toString());
    }

    function showButton() {

        if (document.getElementById("cms-update-btn")) {
            return;
        }

        var btn = document.createElement("button");
        btn.type = "button";
        btn.id = "cms-update-btn";
        btn.textContent = "有新版本，點這裡更新";
        btn.addEventListener("click", function () {
            if (dirty && !window.confirm("還有沒儲存的修改，更新後會不見。確定要現在更新嗎？")) {
                return;
            }
            btn.textContent = "更新中…";
            btn.disabled = true;
            reload();
        });
        document.body.appendChild(btn);

    }

    function check(fromReturn) {

        fetch("/version.json?v=" + Date.now(), { cache: "no-store" })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {

                if (!data || !data.version || data.version === MY_VER) {
                    return;
                }

                pendingVersion = data.version;

                if (fromReturn && !dirty) {
                    reload();
                } else {
                    showButton();
                }

            })
            .catch(function () {});

    }

    // 更新了什麼：最新一筆更新說明還沒按過「我知道了」就跳出來（記在這台瀏覽器）
    function showChangelog() {

        var entry = window.CMS_CHANGELOG;
        var seen = null;

        if (!entry) {
            return;
        }

        try { seen = localStorage.getItem("cms-changelog-seen"); } catch (e) {}

        if (seen === entry.id) {
            return;
        }

        var overlay = document.createElement("div");
        overlay.id = "cms-changelog";
        var box = document.createElement("div");
        box.className = "cms-changelog-box";

        var title = document.createElement("h3");
        title.textContent = "後台更新了（" + entry.date + "）";
        box.appendChild(title);

        var list = document.createElement("ul");
        entry.items.forEach(function (text) {
            var li = document.createElement("li");
            li.textContent = text;
            list.appendChild(li);
        });
        box.appendChild(list);

        var ok = document.createElement("button");
        ok.type = "button";
        ok.textContent = "我知道了";
        ok.addEventListener("click", function () {
            try { localStorage.setItem("cms-changelog-seen", entry.id); } catch (e) {}
            overlay.remove();
        });
        box.appendChild(ok);

        overlay.appendChild(box);
        document.body.appendChild(overlay);

    }

    showChangelog();

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            check(true);
        }
    });

    setInterval(function () {
        if (!pendingVersion) {
            check(false);
        }
    }, 10 * 60 * 1000);

})();
