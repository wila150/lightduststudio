// 留言收件匣（2026/10/03，類似 Gmail）：分頁篩選、搜尋、勾選批次操作、點開閱讀自動標已讀、全部標為已讀、星號
// 資料來自 views/cms/messages.js 帶進來的 #inbox-data；操作打 /cms/messages/bulk、/cms/messages/read-all
(function () {

    var messages = JSON.parse(document.getElementById("inbox-data").textContent);
    var list = document.getElementById("inbox-list");
    var empty = document.getElementById("inbox-empty");
    var more = document.getElementById("inbox-more");
    var bulkBar = document.getElementById("inbox-bulk");
    var selectedLabel = document.getElementById("inbox-selected");
    var checkAll = document.getElementById("inbox-check-all");
    var search = document.getElementById("inbox-search");
    var newBanner = document.getElementById("inbox-new");

    var filter = "all";
    var query = "";
    var selected = new Set();
    var openId = null;
    var limit = 50;

    function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });
    }

    function fmtDate(iso) {
        var d = new Date(iso);
        var now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
        }
        if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + "月" + d.getDate() + "日";
        return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
    }

    function fmtFull(iso) {
        return new Date(iso).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
    }

    function matches(m) {
        if (filter === "unread" && m.read) return false;
        if (filter === "starred" && !m.starred) return false;
        if ((filter === "web" || filter === "line") && m.source !== filter) return false;
        if (query) {
            var text = (m.name + " " + m.email + " " + m.subject + " " + m.message).toLowerCase();
            if (text.indexOf(query) === -1) return false;
        }
        return true;
    }

    function unreadCount() {
        return messages.filter(function (m) { return !m.read; }).length;
    }

    function updateCounts() {
        var counts = {
            all: messages.length,
            unread: unreadCount(),
            starred: messages.filter(function (m) { return m.starred; }).length,
            web: messages.filter(function (m) { return m.source === "web"; }).length,
            line: messages.filter(function (m) { return m.source === "line"; }).length
        };
        document.querySelectorAll("[data-count]").forEach(function (el) {
            var n = counts[el.getAttribute("data-count")];
            el.textContent = n ? n : "";
        });
        document.getElementById("inbox-read-all").disabled = counts.unread === 0;
        if (window.CmsLive) window.CmsLive.setBadge(counts.unread);
    }

    function render() {

        var rows = messages.filter(matches);
        var shown = rows.slice(0, limit);

        list.innerHTML = shown.map(function (m) {
            var isOpen = openId === m.id;
            var snippet = (m.subject ? m.subject + " — " : "") + m.message.replace(/\s+/g, " ");
            return "<li class=\"inbox-row" + (m.read ? "" : " is-unread") + (isOpen ? " is-open" : "") + (selected.has(m.id) ? " is-selected" : "") + "\" data-id=\"" + m.id + "\">" +
                "<div class=\"inbox-line\">" +
                    "<label class=\"inbox-cb\"><input type=\"checkbox\"" + (selected.has(m.id) ? " checked" : "") + "></label>" +
                    "<button type=\"button\" class=\"inbox-star" + (m.starred ? " on" : "") + "\" title=\"" + (m.starred ? "移除星號" : "加星號") + "\">" + (m.starred ? "★" : "☆") + "</button>" +
                    "<span class=\"inbox-from\">" + (m.source === "line" ? "<span class=\"src-line\">LINE</span>" : "") + escapeHtml(m.name) + "</span>" +
                    "<span class=\"inbox-snippet\">" + escapeHtml(snippet) + "</span>" +
                    "<span class=\"inbox-date\" title=\"" + escapeHtml(fmtFull(m.createdAt)) + "\">" + fmtDate(m.createdAt) + "</span>" +
                "</div>" +
                (isOpen ? (
                    "<div class=\"inbox-detail\">" +
                        "<div class=\"inbox-meta\">" +
                            "<b>" + escapeHtml(m.name) + "</b>" +
                            (m.email ? " &lt;" + escapeHtml(m.email) + "&gt;" : "") +
                            "<span>" + escapeHtml(fmtFull(m.createdAt)) + "</span>" +
                        "</div>" +
                        (m.subject ? "<h3>" + escapeHtml(m.subject) + "</h3>" : "") +
                        "<div class=\"inbox-body\">" + escapeHtml(m.message) + "</div>" +
                        "<div class=\"inbox-actions\">" +
                            (m.email ? "<a class=\"btn-reply\" href=\"mailto:" + encodeURIComponent(m.email) + "?subject=" + encodeURIComponent("Re: " + (m.subject || "您的詢問")) + "\">回覆 Email</a>" : "") +
                            (m.source === "line" ? "<span class=\"inbox-hint\">LINE 訊息請到 LINE 官方帳號後台回覆</span>" : "") +
                            "<button type=\"button\" data-row-action=\"unread\">標為未讀</button>" +
                            "<button type=\"button\" data-row-action=\"delete\" class=\"danger\">刪除</button>" +
                        "</div>" +
                    "</div>"
                ) : "") +
            "</li>";
        }).join("");

        empty.hidden = rows.length > 0;
        empty.textContent = filter === "unread" && !query ? "沒有未讀留言 🎉" : "沒有符合的留言";
        more.hidden = rows.length <= limit;

        var visibleIds = shown.map(function (m) { return m.id; });
        checkAll.checked = visibleIds.length > 0 && visibleIds.every(function (id) { return selected.has(id); });
        checkAll.indeterminate = !checkAll.checked && visibleIds.some(function (id) { return selected.has(id); });
        bulkBar.hidden = selected.size === 0;
        selectedLabel.textContent = selected.size ? "已選取 " + selected.size + " 則" : "";

        updateCounts();

    }

    function apply(ids, action) {

        if (!ids.length) return Promise.resolve();

        // 先改畫面（樂觀更新），失敗再提示重新整理
        messages.forEach(function (m) {
            if (ids.indexOf(m.id) === -1) return;
            if (action === "read") m.read = true;
            if (action === "unread") m.read = false;
            if (action === "star") m.starred = true;
            if (action === "unstar") m.starred = false;
        });
        if (action === "delete") {
            messages = messages.filter(function (m) { return ids.indexOf(m.id) === -1; });
            ids.forEach(function (id) { selected.delete(id); });
            if (ids.indexOf(openId) !== -1) openId = null;
        }
        render();

        return fetch("/cms/messages/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ids, action: action })
        }).then(function (res) { return res.json(); }).then(function (data) {
            if (!data.success) throw new Error();
            if (window.CmsLive) window.CmsLive.setBadge(data.unread);
        }).catch(function () {
            alert("儲存失敗，請重新整理頁面後再試一次");
        });

    }

    // 分頁
    document.getElementById("inbox-tabs").addEventListener("click", function (event) {
        var btn = event.target.closest("button[data-filter]");
        if (!btn) return;
        filter = btn.getAttribute("data-filter");
        document.querySelectorAll("#inbox-tabs button").forEach(function (b) { b.classList.toggle("active", b === btn); });
        selected.clear();
        openId = null;
        limit = 50;
        render();
    });

    search.addEventListener("input", function () {
        query = search.value.trim().toLowerCase();
        limit = 50;
        render();
    });

    // 列表：勾選、星號、點開閱讀、單則操作
    list.addEventListener("click", function (event) {

        var row = event.target.closest(".inbox-row");
        if (!row) return;
        var id = row.getAttribute("data-id");
        var message = messages.filter(function (m) { return m.id === id; })[0];

        if (event.target.closest(".inbox-cb")) {
            if (event.target.tagName !== "INPUT") return;
            if (event.target.checked) selected.add(id); else selected.delete(id);
            render();
            return;
        }

        if (event.target.closest(".inbox-star")) {
            apply([id], message.starred ? "unstar" : "star");
            return;
        }

        var rowAction = event.target.closest("[data-row-action]");
        if (rowAction) {
            var action = rowAction.getAttribute("data-row-action");
            if (action === "delete" && !confirm("刪除這則留言？（可以在下方「最近刪除」復原）")) return;
            if (action === "unread") openId = null;
            apply([id], action);
            return;
        }

        if (event.target.closest(".inbox-detail")) return; // 在內文裡選字、點連結不要收合

        openId = openId === id ? null : id;
        if (openId && !message.read) apply([id], "read");
        else render();

    });

    checkAll.addEventListener("change", function () {
        messages.filter(matches).slice(0, limit).forEach(function (m) {
            if (checkAll.checked) selected.add(m.id); else selected.delete(m.id);
        });
        render();
    });

    document.getElementById("inbox-select").addEventListener("change", function () {
        var how = this.value;
        this.value = "";
        selected.clear();
        if (how !== "none") {
            messages.filter(matches).forEach(function (m) {
                if (how === "all" || (how === "read" && m.read) || (how === "unread" && !m.read) || (how === "starred" && m.starred)) selected.add(m.id);
            });
        }
        render();
    });

    bulkBar.addEventListener("click", function (event) {
        var btn = event.target.closest("button[data-action]");
        if (!btn) return;
        var action = btn.getAttribute("data-action");
        var ids = Array.from(selected);
        if (action === "delete" && !confirm("刪除選取的 " + ids.length + " 則留言？（可以在下方「最近刪除」復原）")) return;
        apply(ids, action).then(function () {
            selected.clear();
            render();
        });
    });

    document.getElementById("inbox-read-all").addEventListener("click", function () {
        var count = unreadCount();
        if (!count || !confirm("把 " + count + " 則未讀留言全部標為已讀？")) return;
        messages.forEach(function (m) { m.read = true; });
        render();
        fetch("/cms/messages/read-all", { method: "POST" })
            .then(function (res) { return res.json(); })
            .then(function () { if (window.CmsLive) window.CmsLive.setBadge(0); })
            .catch(function () { alert("儲存失敗，請重新整理頁面後再試一次"); });
    });

    more.querySelector("button").addEventListener("click", function () {
        limit += 50;
        render();
    });

    // 新留言即時加在最上面（public/js/cmsLive.js 轉發的事件）
    window.addEventListener("bd:live", function (event) {
        if (event.detail.type !== "message") return;
        var d = event.detail.data;
        if (messages.some(function (m) { return m.id === d.id; })) return;
        var lineMatch = String(d.name || "").match(/^LINE\s*-\s*(.*?)(?:（[^）]*）)?$/);
        messages.unshift({
            id: d.id, source: lineMatch ? "line" : "web", name: lineMatch ? lineMatch[1] : d.name,
            email: d.email || "", subject: d.subject || "", message: d.message || d.preview || "",
            read: false, starred: false, createdAt: new Date(d.ts || Date.now()).toISOString()
        });
        newBanner.hidden = false;
        setTimeout(function () { newBanner.hidden = true; }, 6000);
        render();
    });

    // 跟 Gmail 一樣預設顯示收件匣全部，未讀用粗體＋藍點標示
    render();

})();
