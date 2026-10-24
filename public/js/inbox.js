// 留言收件匣（2026/10/03，類似 Gmail）：分頁篩選、搜尋、勾選批次操作、點開閱讀自動標已讀、全部標為已讀、星號
// 資料來自 views/cms/messages.js 帶進來的 #inbox-data；操作打 /cms/messages/bulk、/cms/messages/read-all
// 同一位 LINE 客人的訊息合併成一串對話（key = "line:" + User ID），點開像聊天紀錄，下面可以直接用 LINE 回覆
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
    var selected = new Set();   // 存的是列的 key（單則留言＝留言 id，LINE 對話＝line:Uxxx）
    var openKey = null;
    var limit = 50;
    var drafts = {};            // LINE 回覆草稿，畫面重畫（例如有新留言進來）也不會不見

    var LINE_NAME = /^LINE\s*-\s*(.*?)(?:（([^）]*)）)?$/;

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

    // 把留言整理成畫面上的列：網站表單一則一列，LINE 同一人合成一列（以最新一則當代表）
    function buildItems() {
        var byKey = {};
        var items = [];
        messages.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).forEach(function (m) {
            var key = m.lineUserId ? "line:" + m.lineUserId : m.id;
            var item = byKey[key];
            if (!item) {
                item = byKey[key] = { key: key, ids: [], msgs: [], source: m.source, name: m.name, email: m.email, subject: m.subject, message: m.message, createdAt: m.createdAt, canLineReply: m.canLineReply, canEmailReply: m.canEmailReply, read: true, starred: false };
                items.push(item);
            }
            item.ids.push(m.id);
            item.msgs.push(m);
            if (!m.read) item.read = false;
            if (m.starred) item.starred = true;
        });
        items.forEach(function (item) {
            item.isThread = item.msgs.length > 1 || (item.msgs[0].replies || []).length > 0;
            // 對話紀錄：客人的訊息＋後台回覆，依時間排
            var timeline = [];
            item.msgs.forEach(function (m) {
                timeline.push({ dir: "in", text: (m.subject ? m.subject + "\n" : "") + m.message, at: m.createdAt });
                (m.replies || []).forEach(function (r) { timeline.push({ dir: "out", text: r.text, at: r.at, by: r.by, via: r.via || "line" }); });
            });
            item.timeline = timeline.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
            item.searchText = (item.name + " " + item.email + " " + timeline.map(function (t) { return t.text; }).join(" ")).toLowerCase();
        });
        return items;
    }

    var items = buildItems();

    function findItem(key) {
        return items.filter(function (item) { return item.key === key; })[0];
    }

    function expand(keys) {
        var ids = [];
        keys.forEach(function (key) { var item = findItem(key); if (item) ids = ids.concat(item.ids); });
        return ids;
    }

    function matches(item) {
        if (filter === "unread" && item.read) return false;
        if (filter === "starred" && !item.starred) return false;
        if ((filter === "web" || filter === "line") && item.source !== filter) return false;
        if (query && item.searchText.indexOf(query) === -1) return false;
        return true;
    }

    // 導覽列紅點以「則」計算（跟伺服器一致），頁籤數字以「列／對話」計算
    function unreadCount() {
        return messages.filter(function (m) { return !m.read; }).length;
    }

    function updateCounts() {
        var counts = {
            all: items.length,
            unread: items.filter(function (i) { return !i.read; }).length,
            starred: items.filter(function (i) { return i.starred; }).length,
            web: items.filter(function (i) { return i.source === "web"; }).length,
            line: items.filter(function (i) { return i.source === "line"; }).length
        };
        document.querySelectorAll("[data-count]").forEach(function (el) {
            var n = counts[el.getAttribute("data-count")];
            el.textContent = n ? n : "";
        });
        document.getElementById("inbox-read-all").disabled = counts.unread === 0;
        if (window.CmsLive) window.CmsLive.setBadge(unreadCount());
    }

    function detailHtml(item) {
        var body;
        var channel = item.canLineReply ? "line" : (item.canEmailReply ? "email" : "");
        var channelName = channel === "line" ? "LINE" : "Email";
        if (item.isThread || item.canLineReply) {
            body = "<div class=\"chat\">" + item.timeline.map(function (t) {
                return "<div class=\"chat-msg " + t.dir + "\">" +
                    "<div class=\"chat-bubble\">" + escapeHtml(t.text) + "</div>" +
                    "<div class=\"chat-time\">" + (t.dir === "out" ? "已用 " + (t.via === "email" ? "Email" : "LINE") + " 回覆" + (t.by ? "・" + escapeHtml(t.by) : "") + "・" : "") + escapeHtml(fmtFull(t.at)) + "</div>" +
                "</div>";
            }).join("") + "</div>";
        } else {
            body = (item.subject ? "<h3>" + escapeHtml(item.subject) + "</h3>" : "") +
                "<div class=\"inbox-body\">" + escapeHtml(item.message) + "</div>";
        }
        return "<div class=\"inbox-detail\">" +
            "<div class=\"inbox-meta\">" +
                "<b>" + escapeHtml(item.name) + "</b>" +
                (item.email ? " &lt;" + escapeHtml(item.email) + "&gt;" : "") +
                (item.isThread ? "<span>共 " + item.msgs.length + " 則訊息</span>" : "<span>" + escapeHtml(fmtFull(item.createdAt)) + "</span>") +
            "</div>" +
            body +
            (channel ? (
                "<div class=\"line-reply\">" +
                    "<textarea placeholder=\"輸入要回覆給 " + escapeHtml(item.name) + " 的內容，" + (channel === "line" ? "送出後客人會在 LINE 收到" : "會用工作室 Gmail 寄到 " + escapeHtml(item.email)) + "（Ctrl／⌘＋Enter 送出）\">" + escapeHtml(drafts[item.key] || "") + "</textarea>" +
                    "<div class=\"line-reply-bar\">" +
                        "<button type=\"button\" class=\"btn-line-reply" + (channel === "email" ? " is-email" : "") + "\" data-channel=\"" + channel + "\">用 " + channelName + " 回覆</button>" +
                        "<span class=\"inbox-hint\">" + (channel === "line" ? "每則會用掉 1 則推播額度；在 LINE 官方帳號 App 回覆則不算額度" : "簽名檔和客人原本的留言會自動附在信件下方；客人回信會回到工作室 Gmail") + "</span>" +
                    "</div>" +
                "</div>"
            ) : "") +
            "<div class=\"inbox-actions\">" +
                (item.email && !item.canEmailReply ? "<a class=\"btn-reply\" href=\"mailto:" + encodeURIComponent(item.email) + "?subject=" + encodeURIComponent("Re: " + (item.subject || "您的詢問")) + "\">回覆 Email</a>" : "") +
                (item.source === "line" && !item.canLineReply ? "<span class=\"inbox-hint\">LINE 訊息請到 LINE 官方帳號後台回覆</span>" : "") +
                "<button type=\"button\" data-row-action=\"unread\">標為未讀</button>" +
                "<button type=\"button\" data-row-action=\"delete\" class=\"danger\">" + (item.isThread && item.msgs.length > 1 ? "刪除整串" : "刪除") + "</button>" +
            "</div>" +
        "</div>";
    }

    function render() {

        items = buildItems();
        var rows = items.filter(matches);
        var shown = rows.slice(0, limit);

        list.innerHTML = shown.map(function (item) {
            var isOpen = openKey === item.key;
            var last = item.timeline[item.timeline.length - 1];
            var snippet = item.isThread
                ? (last.dir === "out" ? "你：" : "") + last.text.replace(/\s+/g, " ")
                : (item.subject ? item.subject + " — " : "") + item.message.replace(/\s+/g, " ");
            var lastAt = item.isThread ? last.at : item.createdAt;
            return "<li class=\"inbox-row" + (item.read ? "" : " is-unread") + (isOpen ? " is-open" : "") + (selected.has(item.key) ? " is-selected" : "") + "\" data-id=\"" + escapeHtml(item.key) + "\">" +
                "<div class=\"inbox-line\">" +
                    "<label class=\"inbox-cb\"><input type=\"checkbox\"" + (selected.has(item.key) ? " checked" : "") + "></label>" +
                    "<button type=\"button\" class=\"inbox-star" + (item.starred ? " on" : "") + "\" title=\"" + (item.starred ? "移除星號" : "加星號") + "\">" + (item.starred ? "★" : "☆") + "</button>" +
                    "<span class=\"inbox-from\">" + (item.source === "line" ? "<span class=\"src-line\">LINE</span>" : "") + escapeHtml(item.name) +
                        (item.msgs.length > 1 ? "<span class=\"inbox-count\">" + item.msgs.length + "</span>" : "") + "</span>" +
                    "<span class=\"inbox-snippet\">" + escapeHtml(snippet) + "</span>" +
                    "<span class=\"inbox-date\" title=\"" + escapeHtml(fmtFull(lastAt)) + "\">" + fmtDate(lastAt) + "</span>" +
                "</div>" +
                (isOpen ? detailHtml(item) : "") +
            "</li>";
        }).join("");

        empty.hidden = rows.length > 0;
        empty.textContent = filter === "unread" && !query ? "沒有未讀留言 🎉" : "沒有符合的留言";
        more.hidden = rows.length <= limit;

        // 刪掉的列不要還留在已選取裡
        Array.from(selected).forEach(function (key) { if (!findItem(key)) selected.delete(key); });

        var visibleKeys = shown.map(function (item) { return item.key; });
        checkAll.checked = visibleKeys.length > 0 && visibleKeys.every(function (key) { return selected.has(key); });
        checkAll.indeterminate = !checkAll.checked && visibleKeys.some(function (key) { return selected.has(key); });
        bulkBar.hidden = selected.size === 0;
        selectedLabel.textContent = selected.size ? "已選取 " + selected.size + " 則" : "";

        updateCounts();

        // 對話打開時捲到最新一則
        var chat = list.querySelector(".is-open .chat");
        if (chat) chat.scrollTop = chat.scrollHeight;

    }

    // keys：畫面上的列；實際送到伺服器的是展開後的每一則留言 id
    function apply(keys, action) {

        var ids = expand(keys);
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
            keys.forEach(function (key) { selected.delete(key); });
            if (keys.indexOf(openKey) !== -1) openKey = null;
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
        openKey = null;
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
        var key = row.getAttribute("data-id");
        var item = findItem(key);
        if (!item) return;

        if (event.target.closest(".inbox-cb")) {
            if (event.target.tagName !== "INPUT") return;
            if (event.target.checked) selected.add(key); else selected.delete(key);
            render();
            return;
        }

        if (event.target.closest(".inbox-star")) {
            apply([key], item.starred ? "unstar" : "star");
            return;
        }

        var rowAction = event.target.closest("[data-row-action]");
        if (rowAction) {
            var action = rowAction.getAttribute("data-row-action");
            var many = item.msgs.length > 1 ? "這串 " + item.msgs.length + " 則訊息" : "這則留言";
            if (action === "delete" && !confirm("刪除" + many + "？（可以在下方「最近刪除」復原）")) return;
            if (action === "unread") openKey = null;
            apply([key], action);
            return;
        }

        if (event.target.closest(".btn-line-reply")) {
            sendLineReply(row, item);
            return;
        }

        if (event.target.closest(".inbox-detail")) return; // 在內文裡選字、點連結不要收合

        openKey = openKey === key ? null : key;
        if (openKey && !item.read) apply([key], "read");
        else render();

    });

    list.addEventListener("input", function (event) {
        if (!event.target.matches(".line-reply textarea")) return;
        drafts[event.target.closest(".inbox-row").getAttribute("data-id")] = event.target.value;
    });

    list.addEventListener("keydown", function (event) {
        if (!event.target.matches(".line-reply textarea")) return;
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            var row = event.target.closest(".inbox-row");
            sendLineReply(row, findItem(row.getAttribute("data-id")));
        }
    });

    // 回覆記在這串最新的那則留言上（伺服器從留言名稱取出客人的 LINE User ID 推播過去）
    function sendLineReply(row, item) {
        var btn = row.querySelector(".btn-line-reply");
        var textarea = row.querySelector(".line-reply textarea");
        var text = textarea.value.trim();
        if (!text || btn.disabled) { textarea.focus(); return; }
        var target = item.msgs[0];
        btn.disabled = true;
        btn.textContent = "傳送中…";
        var channel = btn.getAttribute("data-channel");
        var label = channel === "email" ? "用 Email 回覆" : "用 LINE 回覆";
        fetch("/cms/messages/" + target.id + "/" + (channel === "email" ? "email" : "line") + "-reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        }).then(function (res) {
            return res.json().then(function (data) { if (!res.ok) throw new Error(data.error || "傳送失敗"); return data; });
        }).then(function (data) {
            target.replies = (target.replies || []).concat([data.reply]);
            item.msgs.forEach(function (m) { m.read = true; });
            delete drafts[item.key];
            render();
            var box = list.querySelector(".is-open .line-reply textarea");
            if (box) box.focus();
        }).catch(function (error) {
            alert(error.message);
            btn.disabled = false;
            btn.textContent = label;
        });
    }

    checkAll.addEventListener("change", function () {
        items.filter(matches).slice(0, limit).forEach(function (item) {
            if (checkAll.checked) selected.add(item.key); else selected.delete(item.key);
        });
        render();
    });

    document.getElementById("inbox-select").addEventListener("change", function () {
        var how = this.value;
        this.value = "";
        selected.clear();
        if (how !== "none") {
            items.filter(matches).forEach(function (item) {
                if (how === "all" || (how === "read" && item.read) || (how === "unread" && !item.read) || (how === "starred" && item.starred)) selected.add(item.key);
            });
        }
        render();
    });

    bulkBar.addEventListener("click", function (event) {
        var btn = event.target.closest("button[data-action]");
        if (!btn) return;
        var action = btn.getAttribute("data-action");
        var keys = Array.from(selected);
        if (action === "delete" && !confirm("刪除選取的 " + keys.length + " 則留言？（可以在下方「最近刪除」復原）")) return;
        apply(keys, action).then(function () {
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

    // 新留言即時加進來（public/js/cmsLive.js 轉發的事件）；LINE 同一人會自動併進原本那串
    window.addEventListener("bd:live", function (event) {
        if (event.detail.type !== "message") return;
        var d = event.detail.data;
        if (messages.some(function (m) { return m.id === d.id; })) return;
        var lineMatch = String(d.name || "").match(LINE_NAME);
        var userId = lineMatch && /^U[0-9a-f]{32}$/.test(lineMatch[2] || "") ? lineMatch[2] : "";
        messages.push({
            id: d.id, source: lineMatch ? "line" : "web", name: lineMatch ? (lineMatch[1] || "LINE 使用者") : d.name,
            lineUserId: userId, canLineReply: !!userId, replies: [],
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
