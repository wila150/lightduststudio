// 後台「LINE 官方帳號」頁：欄位小框文字編輯器、關鍵字列表、圖文選單、推播
(function () {

    var data = JSON.parse(document.getElementById("line-data").textContent);
    var config = data.config;
    var TOKENS = data.tokens;
    var tokenLabel = {};
    TOKENS.forEach(function (t) { tokenLabel[t.key] = t.label; });

    var EMOJIS = "😊😄😍🥰😉🙏👍👏🎉✨📷📸🎬🎥💡📅⏰📍📞✉️💬❤️🧡💛💚🔥⭐🌟✅👉🎁💰🏷️🆕📣🙌🤩😎🌿🌸☀️🌙".match(/\p{Extended_Pictographic}️?/gu);

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
    }

    function setStatus(el, text, kind) {
        el.textContent = text;
        el.className = "status" + (kind ? " " + kind : "");
    }

    async function postJson(url, body) {
        var res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        var json = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(json.error || "失敗（" + res.status + "）");
        return json;
    }

    // ---- 欄位小框編輯器 ----

    function chipHtml(key) {
        return '<span class="token-chip" contenteditable="false" data-token="' + escapeHtml(key) + '">' + escapeHtml(tokenLabel[key] || key) + '<button type="button" tabindex="-1" aria-label="移除">×</button></span>';
    }

    function renderEditor(el, text) {
        el.innerHTML = escapeHtml(text || "").replace(/\{([^{}\n]{1,20})\}/g, function (whole, key) {
            return tokenLabel[key] ? chipHtml(key) : whole;
        }).replace(/\n/g, "<br>");
    }

    function serialize(el) {
        var out = "";
        function walk(node) {
            node.childNodes.forEach(function (child) {
                if (child.nodeType === 3) { out += child.nodeValue; return; }
                if (child.nodeType !== 1) return;
                if (child.dataset && child.dataset.token) { out += "{" + child.dataset.token + "}"; return; }
                if (child.tagName === "BR") { out += "\n"; return; }
                var block = /^(DIV|P)$/.test(child.tagName);
                if (block && out && !out.endsWith("\n")) out += "\n";
                walk(child);
            });
        }
        walk(el);
        return out.replace(/ /g, " ").replace(/\n+$/, "");
    }

    var lastRange = { editor: null, range: null };

    document.addEventListener("selectionchange", function () {
        var sel = window.getSelection();
        if (!sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        var editor = range.startContainer.nodeType === 1 ? range.startContainer.closest(".token-editor") : range.startContainer.parentElement && range.startContainer.parentElement.closest(".token-editor");
        if (editor) lastRange = { editor: editor, range: range.cloneRange() };
    });

    function insertAt(editor, html) {
        var sel = window.getSelection();
        var range;
        if (lastRange.editor === editor && lastRange.range) {
            range = lastRange.range;
        } else {
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        editor.focus();
        sel.removeAllRanges();
        sel.addRange(range);
        var frag = range.createContextualFragment(html);
        var last = frag.lastChild;
        range.deleteContents();
        range.insertNode(frag);
        if (last) {
            range.setStartAfter(last);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            lastRange = { editor: editor, range: range.cloneRange() };
        }
        editor.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function setupEditor(editor, text) {
        renderEditor(editor, text);

        // 貼上一律當純文字，不要把別處的格式帶進來
        editor.addEventListener("paste", function (e) {
            e.preventDefault();
            var plain = (e.clipboardData || window.clipboardData).getData("text");
            insertAt(editor, escapeHtml(plain).replace(/\n/g, "<br>"));
        });
        editor.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                insertAt(editor, "<br>" + (editor.lastChild && editor.lastChild.nodeName === "BR" ? "" : "​"));
            }
        });
        editor.addEventListener("click", function (e) {
            if (e.target.matches(".token-chip button")) {
                e.target.parentElement.remove();
                editor.dispatchEvent(new Event("input", { bubbles: true }));
            }
        });

        var bar = document.createElement("div");
        bar.className = "token-buttons";
        bar.innerHTML = '<button type="button" data-emoji>😊 表情</button>' + TOKENS.map(function (t) {
            return '<button type="button" data-insert="' + escapeHtml(t.key) + '">' + escapeHtml(t.label) + "</button>";
        }).join("");
        editor.after(bar);

        // 按鈕按下去不要搶走文字框的游標位置
        bar.addEventListener("mousedown", function (e) { if (e.target.closest("button,span")) e.preventDefault(); });
        bar.addEventListener("click", function (e) {
            var btn = e.target.closest("button");
            var emoji = e.target.closest(".emoji-pop span");
            if (emoji) {
                insertAt(editor, emoji.textContent);
                bar.querySelector(".emoji-pop").remove();
                return;
            }
            if (!btn) return;
            if (btn.hasAttribute("data-emoji")) {
                var open = bar.querySelector(".emoji-pop");
                if (open) { open.remove(); return; }
                var pop = document.createElement("div");
                pop.className = "emoji-pop";
                pop.innerHTML = EMOJIS.map(function (em) { return "<span>" + em + "</span>"; }).join("");
                bar.appendChild(pop);
                return;
            }
            insertAt(editor, chipHtml(btn.dataset.insert));
        });
    }

    function editorValue(editor) {
        return serialize(editor).replace(/​/g, "");
    }

    // ---- 歡迎詞＋關鍵字 ----

    var welcomeEditor = document.getElementById("welcome-text");
    setupEditor(welcomeEditor, config.welcome.text);

    var kwList = document.getElementById("kw-list");

    function addRule(rule) {
        var box = document.createElement("div");
        box.className = "kw-rule";
        box.dataset.id = rule.id || "";
        box.innerHTML =
            '<div class="kw-head">' +
                '<label><input type="checkbox" class="kw-enabled"' + (rule.enabled !== false ? " checked" : "") + "> 啟用</label>" +
                '<input type="text" class="kw-words" placeholder="關鍵字，多個用「、」分隔，例如：預約、立即預約" value="' + escapeHtml((rule.words || []).join("、")) + '">' +
                '<select class="kw-match"><option value="exact">完全符合</option><option value="contains">包含</option></select>' +
                '<button type="button" class="danger-btn kw-remove">刪除</button>' +
            "</div>" +
            '<div class="token-editor kw-text" contenteditable="true"></div>';
        box.querySelector(".kw-match").value = rule.match === "contains" ? "contains" : "exact";
        kwList.appendChild(box);
        setupEditor(box.querySelector(".kw-text"), rule.text || "");
        box.querySelector(".kw-remove").addEventListener("click", function () {
            if (confirm("確定要刪除這組關鍵字嗎？")) box.remove();
        });
    }

    (config.keywords || []).forEach(addRule);
    document.getElementById("kw-add").addEventListener("click", function () {
        addRule({ enabled: true, words: [], match: "exact", text: "" });
        kwList.lastElementChild.querySelector(".kw-words").focus();
    });

    document.getElementById("replies-save").addEventListener("click", async function () {
        var status = document.getElementById("replies-status");
        var keywords = Array.prototype.map.call(kwList.querySelectorAll(".kw-rule"), function (box) {
            return {
                id: box.dataset.id,
                enabled: box.querySelector(".kw-enabled").checked,
                words: box.querySelector(".kw-words").value,
                match: box.querySelector(".kw-match").value,
                text: editorValue(box.querySelector(".kw-text"))
            };
        });
        var incomplete = keywords.filter(function (k) { return !k.words.trim() || !k.text.trim(); }).length;
        setStatus(status, "儲存中…");
        try {
            var json = await postJson("/cms/line/replies", {
                welcome: { enabled: document.getElementById("welcome-enabled").checked, text: editorValue(welcomeEditor) },
                keywords: keywords
            });
            setStatus(status, "已儲存，" + json.count + " 組關鍵字" + (incomplete ? "（" + incomplete + " 組沒填關鍵字或回覆內容，已略過）" : ""), "ok");
        } catch (error) {
            setStatus(status, error.message, "err");
        }
    });

    // ---- 圖文選單 ----

    var layouts = data.layouts;
    var rm = config.richMenu;
    var rmLayout = document.getElementById("rm-layout");
    var rmPreview = document.getElementById("rm-preview");
    var rmAreas = document.getElementById("rm-areas");
    var rmImage = document.getElementById("rm-image");
    var previewUrl = rm.imageUrl || "";
    var areas = (rm.areas || []).slice();

    rmLayout.innerHTML = layouts.map(function (l) { return '<option value="' + l.key + '">' + escapeHtml(l.label) + "</option>"; }).join("");
    rmLayout.value = rm.layout || "grid6";

    function currentLayout() {
        return layouts.filter(function (l) { return l.key === rmLayout.value; })[0] || layouts[0];
    }

    function collectAreas() {
        rmAreas.querySelectorAll(".rm-area").forEach(function (row, i) {
            areas[i] = {
                label: row.querySelector(".label").value,
                type: row.querySelector(".type").value,
                value: row.querySelector(".value").value
            };
        });
    }

    function renderRichMenu() {
        var l = currentLayout();
        rmPreview.style.aspectRatio = "2500 / " + l.height;
        rmPreview.style.backgroundImage = previewUrl ? "url('" + previewUrl + "')" : "";
        rmPreview.innerHTML = l.cells.map(function (c, i) {
            return '<div class="rm-cell" style="left:' + (c.x / 25) + "%;top:" + (c.y / l.height * 100) + "%;width:" + (c.width / 25) + "%;height:" + (c.height / l.height * 100) + '%;"><span>' + (i + 1) + "</span></div>";
        }).join("");
        rmAreas.innerHTML = l.cells.map(function (c, i) {
            var a = areas[i] || { type: "uri", value: "", label: "" };
            return '<div class="rm-area">' +
                '<span class="num">' + (i + 1) + "</span>" +
                '<input type="text" class="label" maxlength="20" placeholder="名稱（例如：預約諮詢）" value="' + escapeHtml(a.label || "") + '">' +
                '<select class="type"><option value="uri">開網址</option><option value="message">送出文字</option><option value="none">不設定</option></select>' +
                '<input type="text" class="value" value="' + escapeHtml(a.value || "") + '">' +
            "</div>";
        }).join("");
        rmAreas.querySelectorAll(".rm-area").forEach(function (row, i) {
            var type = row.querySelector(".type");
            var value = row.querySelector(".value");
            type.value = (areas[i] && areas[i].type) || "uri";
            function hint() {
                value.style.display = type.value === "none" ? "none" : "";
                value.placeholder = type.value === "message" ? "客人點了會送出的文字，例如：預約" : "https://…";
            }
            type.addEventListener("change", hint);
            hint();
        });
    }

    rmLayout.addEventListener("change", function () { collectAreas(); renderRichMenu(); });
    rmImage.addEventListener("change", function () {
        if (rmImage.files[0]) {
            previewUrl = URL.createObjectURL(rmImage.files[0]);
            renderRichMenu();
        }
    });
    renderRichMenu();

    document.getElementById("rm-publish").addEventListener("click", async function () {
        var status = document.getElementById("rm-status");
        collectAreas();
        var l = currentLayout();
        var form = new FormData();
        form.append("layout", l.key);
        form.append("areas", JSON.stringify(areas.slice(0, l.cells.length)));
        form.append("chatBarText", document.getElementById("rm-chatbar").value);
        if (rmImage.files[0]) form.append("image", rmImage.files[0]);
        setStatus(status, "發佈中…");
        try {
            var res = await fetch("/cms/line/rich-menu", { method: "POST", body: form });
            var json = await res.json().catch(function () { return {}; });
            if (!res.ok) throw new Error(json.error || "發佈失敗");
            setStatus(status, "已發佈！打開 LINE 聊天室就會看到新選單（手機可能要重新進入聊天室）", "ok");
        } catch (error) {
            setStatus(status, error.message, "err");
        }
    });

    // ---- 推播 ----

    var bc = config.broadcast;
    var bcImageUrl = bc.imageUrl || "";
    var bcRatio = bc.imageRatio || "1:1";
    var bcTap = document.getElementById("bc-tap");
    var bcValue = document.getElementById("bc-value");
    var bcText = document.getElementById("bc-text");
    var bcPhone = document.getElementById("bc-phone");

    bcTap.value = bc.action || "message";
    setupEditor(bcText, bc.text || "");

    function renderPhone() {
        var text = editorValue(bcText).replace(/\{([^{}\n]{1,20})\}/g, function (w, k) { return tokenLabel[k] ? "〔" + tokenLabel[k] + "〕" : w; });
        bcPhone.innerHTML = (bcImageUrl ? '<img src="' + escapeHtml(bcImageUrl) + '" alt="">' : "") +
            (text ? '<div class="bubble">' + escapeHtml(text) + "</div>" : "") +
            (!bcImageUrl && !text ? '<div class="empty">上傳圖片後會在這裡預覽</div>' : "");
    }

    function tapHint() {
        document.getElementById("bc-value-field").style.display = bcTap.value === "none" ? "none" : "";
        document.getElementById("bc-value-label").textContent = bcTap.value === "uri" ? "開啟的網址" : "送出的文字";
        bcValue.placeholder = bcTap.value === "uri" ? "https://lightdustudio.com/p/contact" : "例如：模特卡方案（再到上面新增同名關鍵字回覆）";
    }

    bcTap.addEventListener("change", tapHint);
    bcText.addEventListener("input", renderPhone);
    tapHint();
    renderPhone();

    document.getElementById("bc-image").addEventListener("change", async function (e) {
        var file = e.target.files[0];
        var status = document.getElementById("bc-image-status");
        if (!file) return;
        var form = new FormData();
        form.append("image", file);
        setStatus(status, "上傳中…");
        try {
            var res = await fetch("/cms/line/broadcast/image", { method: "POST", body: form });
            var json = await res.json().catch(function () { return {}; });
            if (!res.ok) throw new Error(json.error || "上傳失敗");
            bcImageUrl = json.imageUrl;
            bcRatio = json.imageRatio;
            renderPhone();
            setStatus(status, json.tooTall ? "圖片太長（超過寬的 3 倍），LINE 會裁掉下面一部分" : "已上傳", json.tooTall ? "err" : "ok");
        } catch (error) {
            setStatus(status, error.message, "err");
        }
    });

    document.querySelectorAll("[data-bc]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
            var action = btn.dataset.bc;
            var status = document.getElementById("bc-status");
            if (action === "send" && !confirm("確定要推播給所有好友嗎？送出後無法收回，並會用掉每月訊息額度。")) return;
            setStatus(status, action === "save" ? "儲存中…" : "傳送中…");
            try {
                var json = await postJson("/cms/line/broadcast", {
                    action: action,
                    imageUrl: bcImageUrl,
                    imageRatio: bcRatio,
                    tapAction: bcTap.value,
                    actionValue: bcValue.value,
                    altText: document.getElementById("bc-alt").value,
                    text: editorValue(bcText)
                });
                setStatus(status, json.message, "ok");
            } catch (error) {
                setStatus(status, error.message, "err");
            }
        });
    });

})();
