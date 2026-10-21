// 共用的媒體庫選擇器彈窗，讓 CMS 各處的圖片欄位都能「從媒體庫選擇」而不必重新上傳。
// 用法：window.openMediaPicker({ multiple: false, onSelect: function (files) { ... } })
// files 是媒體庫項目陣列（{ id, url, name, ... }），single 模式下陣列固定只有一筆。
//
// 用「資料夾」方式瀏覽（2026/10/03 回饋：選分類會把底下所有作品的照片混在一起，分不出哪張是哪個作品）：
// 最上層是分類資料夾 → 點進去是作品相簿資料夾 → 再點進去才看到照片，可以整個資料夾全選。
// 已勾選的照片在切換資料夾時會保留，最後一起「加入」；上次停在哪個資料夾會記住，下次打開直接回到那裡。
//
// 選資料夾模式：window.openMediaPicker({ pickAlbums: true, onSelect: function (albums) { ... } })
// 勾的是作品相簿資料夾本身（不進去看照片），回傳 [{ id, label, count }]，給「從媒體庫資料夾建立作品」用
(function () {

    var LAST_ALBUM_KEY = "mediaPicker:lastAlbum";

    var overlay, body, crumbs, searchInput, selectAllLabel, selectAllCheckbox, confirmBar, confirmBtn, countLabel;
    var currentOptions = null;
    var albums = [];
    var unsorted = { count: 0, coverUrl: "" };
    var currentFolder = "";            // "" = 最上層、"none" = 未分類、其他 = 相簿 id
    var currentFiles = [];             // 目前資料夾裡的照片（勾選全選用）
    var selected = new Map();          // 已勾選：id → file（跨資料夾保留）；選資料夾模式下是 id → album
    var loadToken = 0;

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (key) {
            if (key === "text") node.textContent = attrs[key];
            else if (key === "style") node.style.cssText = attrs[key];
            else node.setAttribute(key, attrs[key]);
        });
        (children || []).forEach(function (child) { if (child) node.appendChild(child); });
        return node;
    }

    function remember(id) {
        try { localStorage.setItem(LAST_ALBUM_KEY, id); } catch (e) {}
    }

    function recall() {
        try { return localStorage.getItem(LAST_ALBUM_KEY) || ""; } catch (e) { return ""; }
    }

    function ensureOverlay() {

        if (overlay) {
            return;
        }

        var style = el("style");
        style.textContent =
            "#mp-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;align-items:center;justify-content:center}" +
            "#mp-box{background:#fff;border-radius:10px;padding:22px 24px;width:94%;max-width:1040px;height:86vh;max-height:86vh;display:flex;flex-direction:column;gap:12px;color:#1a1a1a;font-size:14px;overflow:hidden}" +
            "#mp-head,#mp-crumbs,#mp-bar{flex:none}" +
            "#mp-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}" +
            "#mp-head h3{margin:0;font-size:18px}" +
            "#mp-search{flex:1;min-width:180px;max-width:360px;padding:8px 14px;border:1px solid #e3e0da;border-radius:999px;font-size:13px}" +
            "#mp-close{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid #e3e0da;background:#fff;cursor:pointer;font-size:15px;padding:0}" +
            "#mp-crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;color:#6b6b6b;min-height:22px}" +
            "#mp-crumbs a{color:#6b6b6b;cursor:pointer;text-decoration:none}" +
            "#mp-crumbs a:hover{color:#b08a5a}" +
            "#mp-crumbs b{color:#1a1a1a}" +
            "#mp-selectall{display:none;margin-left:auto;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:4px 12px;border:1px solid #e3e0da;border-radius:999px}" +
            // 照片多的時候格子不能被壓扁：grid-auto-rows:max-content 讓每格維持自己的高度、超出就捲動；
            // min-height:0 讓這一塊在固定高度的視窗裡可以捲，底部「加入」按鈕才不會被擠出畫面（2026/10/04 回饋）
            "#mp-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));grid-auto-rows:max-content;gap:14px;align-content:start;padding:2px}" +
            ".mp-folder{border:1px solid #e3e0da;border-radius:10px;overflow:hidden;cursor:pointer;background:#faf8f5;text-align:left;padding:0;font:inherit;color:inherit}" +
            ".mp-folder:hover{border-color:#b08a5a;box-shadow:0 4px 14px rgba(0,0,0,.08)}" +
            ".mp-folder-cover{aspect-ratio:4/3;background:#e9e5de center top/cover no-repeat;position:relative}" +
            ".mp-folder-cover::after{content:'📁';position:absolute;left:8px;top:6px;font-size:16px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}" +
            ".mp-folder.is-pick{position:relative}" +
            ".mp-folder.is-pick input{position:absolute;top:8px;right:8px;width:20px;height:20px;pointer-events:none}" +
            ".mp-folder.is-on{border:2px solid #b08a5a;background:#f3ead9}" +
            ".mp-folder-name{padding:8px 10px 2px;font-weight:600;font-size:13px;line-height:1.4;overflow-wrap:anywhere}" +
            ".mp-folder-meta{padding:0 10px 9px;font-size:12px;color:#6b6b6b}" +
            ".mp-photo{position:relative;cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid transparent;background:#f3f1ed}" +
            ".mp-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center top;display:block}" +
            ".mp-photo.is-on{border-color:#b08a5a}" +
            ".mp-photo input{position:absolute;top:6px;left:6px;width:18px;height:18px;pointer-events:none}" +
            ".mp-photo span{display:block;padding:4px 6px;font-size:11px;color:#6b6b6b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
            ".mp-section{grid-column:1/-1;font-size:12px;font-weight:700;color:#6b6b6b;letter-spacing:.06em;margin-top:4px}" +
            ".mp-empty{grid-column:1/-1;color:#6b6b6b}" +
            "#mp-bar{display:flex;align-items:center;justify-content:flex-end;gap:12px}" +
            "#mp-count{font-size:13px;color:#6b6b6b}" +
            "#mp-clear{border:0;background:none;color:#b08a5a;cursor:pointer;font-size:13px;padding:0}" +
            "#mp-confirm{padding:9px 22px;border:0;border-radius:6px;background:#1a1a1a;color:#fff;font-size:14px;cursor:pointer}" +
            "#mp-confirm:disabled{background:#ccc;cursor:default}";
        document.head.appendChild(style);

        searchInput = el("input", { id: "mp-search", type: "search", placeholder: "搜尋資料夾（例如：抓周、PAZZO）", autocomplete: "off" });
        selectAllCheckbox = el("input", { type: "checkbox" });
        selectAllLabel = el("label", { id: "mp-selectall" }, [selectAllCheckbox, document.createTextNode(" 全選這個資料夾")]);
        crumbs = el("div", { id: "mp-crumbs" });
        body = el("div", { id: "mp-body" });
        countLabel = el("span", { id: "mp-count" });
        var clearBtn = el("button", { id: "mp-clear", type: "button", text: "清除勾選" });
        confirmBtn = el("button", { id: "mp-confirm", type: "button", text: "加入" });
        confirmBar = el("div", { id: "mp-bar" }, [countLabel, clearBtn, confirmBtn]);
        var closeBtn = el("button", { id: "mp-close", type: "button", text: "✕", "aria-label": "關閉" });

        overlay = el("div", { id: "mp-overlay" }, [
            el("div", { id: "mp-box" }, [
                el("div", { id: "mp-head" }, [el("h3", { text: "從媒體庫選擇" }), searchInput, closeBtn]),
                el("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:none" }, [crumbs, selectAllLabel]),
                body,
                confirmBar
            ])
        ]);
        document.body.appendChild(overlay);

        closeBtn.addEventListener("click", closeOverlay);
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) closeOverlay();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && overlay.style.display === "flex") closeOverlay();
        });

        searchInput.addEventListener("input", function () {
            if (searchInput.value.trim()) renderSearch(searchInput.value.trim().toLowerCase());
            else openFolder(currentFolder);
        });

        selectAllCheckbox.addEventListener("change", function () {
            if (currentOptions.pickAlbums) {
                body.querySelectorAll(".mp-folder.is-pick").forEach(function (tile) {
                    if (tile.classList.contains("is-on") !== selectAllCheckbox.checked) tile.click();
                });
                return;
            }
            currentFiles.forEach(function (file) {
                if (selectAllCheckbox.checked) selected.set(file.id, file);
                else selected.delete(file.id);
            });
            body.querySelectorAll(".mp-photo").forEach(function (node) {
                var on = selected.has(node.getAttribute("data-id"));
                node.classList.toggle("is-on", on);
                node.querySelector("input").checked = on;
            });
            updateCount();
        });

        clearBtn.addEventListener("click", function () {
            selected.clear();
            body.querySelectorAll(".mp-photo, .mp-folder.is-pick").forEach(function (node) {
                node.classList.remove("is-on");
                node.querySelector("input").checked = false;
            });
            selectAllCheckbox.checked = false;
            updateCount();
        });

        confirmBtn.addEventListener("click", function () {
            if (selected.size === 0) return;
            var files = Array.from(selected.values());
            var onSelect = currentOptions && currentOptions.onSelect;
            closeOverlay();
            if (onSelect) onSelect(files);
        });

    }

    function closeOverlay() {
        overlay.style.display = "none";
    }

    function updateCount() {
        confirmBtn.disabled = selected.size === 0;
        if (currentOptions && currentOptions.pickAlbums) {
            countLabel.textContent = selected.size > 0 ? "已選取 " + selected.size + " 個資料夾" : "勾選作品資料夾後按「建立作品」";
        } else {
            countLabel.textContent = selected.size > 0 ? "已選取 " + selected.size + " 張" : "勾選照片後按「加入」";
        }
        var allOn = currentFiles.length > 0 && currentFiles.every(function (file) { return selected.has(file.id); });
        selectAllCheckbox.checked = allOn;
    }

    function albumById(id) {
        return albums.filter(function (album) { return album.id === id; })[0] || null;
    }

    function childrenOf(id) {
        return albums.filter(function (album) { return album.parentAlbumId === id; })
            .sort(function (a, b) { return a.label.localeCompare(b.label, "zh-Hant", { numeric: true }); });
    }

    function folderTile(album, meta) {
        var cover = el("div", { class: "mp-folder-cover" });
        if (album.coverUrl) cover.style.backgroundImage = "url(\"" + album.coverUrl.replace(/"/g, "%22") + "\")";
        var tile = el("button", { type: "button", class: "mp-folder" }, [
            cover,
            el("div", { class: "mp-folder-name", text: album.label }),
            el("div", { class: "mp-folder-meta", text: meta || (album.count + " 張") })
        ]);
        // 選資料夾模式：沒有子相簿的相簿（作品相簿）點一下就是勾選，分類資料夾照樣點進去
        if (currentOptions.pickAlbums && album.id !== "none" && childrenOf(album.id).length === 0 && album.count > 0) {
            var on = selected.has(album.id);
            var checkbox = el("input", { type: "checkbox" });
            checkbox.checked = on;
            tile.classList.add("is-pick");
            if (on) tile.classList.add("is-on");
            tile.insertBefore(checkbox, tile.firstChild);
            tile.setAttribute("data-album-id", album.id);
            tile.addEventListener("click", function () {
                if (selected.has(album.id)) selected.delete(album.id);
                else selected.set(album.id, { id: album.id, label: album.label, count: album.count });
                var nowOn = selected.has(album.id);
                tile.classList.toggle("is-on", nowOn);
                checkbox.checked = nowOn;
                updateCount();
            });
            return tile;
        }
        tile.addEventListener("click", function () {
            searchInput.value = "";
            openFolder(album.id);
        });
        return tile;
    }

    function renderCrumbs(folderId) {
        crumbs.innerHTML = "";
        var parts = [{ id: "", label: "媒體庫" }];
        if (folderId === "none") parts.push({ id: "none", label: "未分類" });
        else if (folderId) {
            var album = albumById(folderId);
            var parent = album && album.parentAlbumId ? albumById(album.parentAlbumId) : null;
            if (parent) parts.push({ id: parent.id, label: parent.label });
            if (album) parts.push({ id: album.id, label: album.label });
        }
        parts.forEach(function (part, i) {
            if (i > 0) crumbs.appendChild(el("span", { text: "›" }));
            if (i === parts.length - 1) crumbs.appendChild(el("b", { text: part.label }));
            else {
                var link = el("a", { text: part.label });
                link.addEventListener("click", function () { searchInput.value = ""; openFolder(part.id); });
                crumbs.appendChild(link);
            }
        });
    }

    function renderPhotos(files) {
        var multiple = !!currentOptions.multiple;
        currentFiles = files;
        selectAllLabel.style.display = multiple && files.length > 0 ? "flex" : "none";
        files.forEach(function (file) {
            var on = selected.has(file.id);
            var checkbox = el("input", { type: "checkbox" });
            checkbox.checked = on;
            var img = el("img", { src: file.url, alt: file.alt || file.name || "", loading: "lazy" });
            var node = el("div", { class: "mp-photo" + (on ? " is-on" : ""), "data-id": file.id, title: file.name || "" },
                multiple ? [checkbox, img, el("span", { text: file.name || "" })] : [img, el("span", { text: file.name || "" })]);
            node.addEventListener("click", function () {
                if (!multiple) {
                    var onSelect = currentOptions && currentOptions.onSelect;
                    closeOverlay();
                    if (onSelect) onSelect([file]);
                    return;
                }
                if (selected.has(file.id)) selected.delete(file.id);
                else selected.set(file.id, file);
                var nowOn = selected.has(file.id);
                node.classList.toggle("is-on", nowOn);
                checkbox.checked = nowOn;
                updateCount();
            });
            body.appendChild(node);
        });
        updateCount();
    }

    function openFolder(folderId) {

        currentFolder = folderId;
        currentFiles = [];
        remember(folderId);
        renderCrumbs(folderId);
        selectAllLabel.style.display = "none";
        body.innerHTML = "";

        // 最上層：分類資料夾＋未分類
        if (!folderId) {
            albums.filter(function (album) { return !album.parentAlbumId; }).forEach(function (album) {
                var subCount = childrenOf(album.id).length;
                body.appendChild(folderTile(album, (subCount ? subCount + " 個相簿・" : "") + album.count + " 張"));
            });
            if (unsorted.count > 0) {
                body.appendChild(folderTile({ id: "none", label: "未分類", count: unsorted.count, coverUrl: unsorted.coverUrl }));
            }
            if (!body.children.length) body.appendChild(el("p", { class: "mp-empty", text: "媒體庫尚無圖片" }));
            updateCount();
            return;
        }

        // 有子相簿的分類：先列子相簿資料夾，分類本身直接放的照片列在下面
        var children = folderId === "none" ? [] : childrenOf(folderId);
        children.forEach(function (child) { body.appendChild(folderTile(child)); });

        // 選資料夾模式只選資料夾、不列照片；分類裡可以「全選這個分類的資料夾」
        if (currentOptions.pickAlbums) {
            selectAllLabel.lastChild.textContent = " 全選這個分類的資料夾";
            selectAllLabel.style.display = children.length ? "flex" : "none";
            selectAllCheckbox.checked = children.length > 0 && children.every(function (child) { return selected.has(child.id); });
            if (!children.length) {
                var self = albumById(folderId);
                body.appendChild(el("p", { class: "mp-empty", text: self && self.count ? "這個資料夾沒有子資料夾，回上一層直接勾選它。" : "這個資料夾是空的" }));
            }
            updateCount();
            return;
        }
        selectAllLabel.lastChild.textContent = " 全選這個資料夾";

        var token = ++loadToken;
        var loading = el("p", { class: "mp-empty", text: "載入中..." });
        body.appendChild(loading);

        fetch("/cms/media/list.json?album=" + encodeURIComponent(folderId))
            .then(function (res) {
                if (res.status === 401) throw new Error("expired");
                return res.json();
            })
            .then(function (data) {
                if (token !== loadToken) return;
                loading.remove();
                // list.json 選分類時會連子相簿的照片一起回傳，這裡只留直接放在這個資料夾的
                var files = (data.files || []).filter(function (file) {
                    return folderId === "none" ? true : file.albumId === folderId;
                }).sort(function (a, b) {
                    // 照檔名排（相機檔名通常就是拍攝順序），檔名有「封面」的放第一張
                    var na = a.name || "", nb = b.name || "";
                    var ca = /^封面/.test(na) ? 0 : 1, cb = /^封面/.test(nb) ? 0 : 1;
                    return ca - cb || na.localeCompare(nb, "zh-Hant", { numeric: true });
                });
                if (files.length && children.length) body.appendChild(el("div", { class: "mp-section", text: "直接放在這裡的照片" }));
                if (!files.length && !children.length) body.appendChild(el("p", { class: "mp-empty", text: "這個資料夾是空的" }));
                renderPhotos(files);
            })
            .catch(function (error) {
                if (token === loadToken) loading.textContent = error && error.message === "expired" ? "登入已過期，請重新整理頁面登入" : "載入失敗，請關掉再開一次";
            });

    }

    function renderSearch(query) {
        crumbs.innerHTML = "";
        crumbs.appendChild(el("b", { text: "搜尋：" + query }));
        selectAllLabel.style.display = "none";
        currentFiles = [];
        body.innerHTML = "";
        var words = query.split(/\s+/);
        var hits = albums.filter(function (album) {
            var parent = album.parentAlbumId ? albumById(album.parentAlbumId) : null;
            var text = (album.label + " " + (parent ? parent.label : "")).toLowerCase();
            return words.every(function (word) { return text.indexOf(word) !== -1; });
        });
        hits.forEach(function (album) {
            var parent = album.parentAlbumId ? albumById(album.parentAlbumId) : null;
            body.appendChild(folderTile(album, (parent ? parent.label + "・" : "") + album.count + " 張"));
        });
        if (!hits.length) body.appendChild(el("p", { class: "mp-empty", text: "找不到符合的資料夾" }));
    }

    window.openMediaPicker = function (options) {

        currentOptions = options || {};
        ensureOverlay();
        selected.clear();
        searchInput.value = "";
        confirmBar.style.display = currentOptions.multiple || currentOptions.pickAlbums ? "flex" : "none";
        confirmBtn.textContent = currentOptions.pickAlbums ? "建立作品" : "加入";
        overlay.querySelector("h3").textContent = currentOptions.pickAlbums ? "選擇要建立成作品的資料夾" : "從媒體庫選擇";
        overlay.style.display = "flex";
        body.innerHTML = "<p class=\"mp-empty\">載入中...</p>";
        crumbs.innerHTML = "";

        fetch("/cms/media/albums.json")
            .then(function (res) {
                if (res.status === 401) throw new Error("expired");
                return res.json();
            })
            .then(function (data) {
                albums = data.albums || [];
                unsorted = data.unsorted || { count: 0, coverUrl: "" };
                // 回到上次停留的資料夾（那個資料夾被刪掉了就回最上層）
                var last = recall();
                openFolder(last === "none" || albumById(last) ? last : "");
            })
            .catch(function (error) {
                body.innerHTML = "<p class=\"mp-empty\">" + (error && error.message === "expired" ? "登入已過期，請重新整理頁面登入" : "載入失敗，請關掉再開一次") + "</p>";
            });

    };

})();
