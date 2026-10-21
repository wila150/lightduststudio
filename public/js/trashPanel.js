// 「最近刪除」面板（2026/10/03）：作品清單、媒體庫共用。
// <div class="trash-panel" data-collections="pageItems,pageCategories" data-page-id="xxx"></div>
// 列出資源回收桶裡的東西，可以「復原」（放回原處）或「永久刪除」（連檔案一起刪，無法復原）
(function () {

    function fmt(value) {
        var d = new Date(value);
        if (isNaN(d)) return "";
        var pad = function (n) { return (n < 10 ? "0" : "") + n; };
        return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function post(url) {
        return fetch(url, { method: "POST" }).then(function (res) { return res.json(); });
    }

    document.querySelectorAll(".trash-panel").forEach(function (panel) {

        var query = "collections=" + encodeURIComponent(panel.getAttribute("data-collections") || "") +
            (panel.getAttribute("data-page-id") ? "&pageId=" + encodeURIComponent(panel.getAttribute("data-page-id")) : "");

        function render(entries) {

            panel.innerHTML = "";
            var details = document.createElement("details");
            var summary = document.createElement("summary");
            summary.textContent = "🗑 最近刪除（" + entries.length + "）" + (entries.length ? "：誤刪的可以在這裡復原" : "");
            details.appendChild(summary);

            if (!entries.length) {
                var empty = document.createElement("p");
                empty.className = "trash-empty";
                empty.textContent = "沒有刪除的項目";
                details.appendChild(empty);
            }

            if (entries.length > 1) {
                var bulk = document.createElement("button");
                bulk.type = "button";
                bulk.className = "trash-restore-all";
                bulk.textContent = "全部復原（" + entries.length + "）";
                bulk.addEventListener("click", function () {
                    if (!confirm("要把這 " + entries.length + " 個全部復原嗎？")) return;
                    bulk.disabled = true;
                    entries.reduce(function (chain, entry) {
                        return chain.then(function () { return post("/cms/trash/" + encodeURIComponent(entry.id) + "/restore"); });
                    }, Promise.resolve()).then(function () { window.location.reload(); });
                });
                details.appendChild(bulk);
            }

            var list = document.createElement("div");
            list.className = "trash-list";

            entries.forEach(function (entry) {
                var row = document.createElement("div");
                row.className = "trash-row";
                row.innerHTML =
                    (entry.url ? '<img alt="" loading="lazy">' : '<span class="trash-noimg"></span>') +
                    '<span class="trash-kind"></span><span class="trash-label"></span><span class="trash-time"></span>' +
                    '<button type="button" class="trash-restore">復原</button><button type="button" class="trash-purge">永久刪除</button>';
                if (entry.url) row.querySelector("img").src = entry.url;
                row.querySelector(".trash-kind").textContent = entry.kind;
                row.querySelector(".trash-label").textContent = entry.label || "（未命名）";
                row.querySelector(".trash-time").textContent = fmt(entry.deletedAt) + " 刪除";

                row.querySelector(".trash-restore").addEventListener("click", function () {
                    this.disabled = true;
                    post("/cms/trash/" + encodeURIComponent(entry.id) + "/restore").then(function () { window.location.reload(); });
                });

                row.querySelector(".trash-purge").addEventListener("click", function () {
                    if (!confirm("永久刪除「" + (entry.label || "") + "」？照片檔案會一起刪掉，之後無法復原。")) return;
                    this.disabled = true;
                    post("/cms/trash/" + encodeURIComponent(entry.id) + "/purge").then(function () { row.remove(); });
                });

                list.appendChild(row);
            });

            details.appendChild(list);
            panel.appendChild(details);

        }

        fetch("/cms/trash/list.json?" + query)
            .then(function (res) { return res.json(); })
            .then(function (data) { render(data.entries || []); })
            .catch(function () { panel.textContent = ""; });

    });

})();
