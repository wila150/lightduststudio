const layout = require("./layout");

const escapeHtml = require("../escapeHtml");

const byLabel = (a, b) => a.label.localeCompare(b.label, "zh-Hant", { numeric: true });

// 相簿瀏覽：搜尋框＋分類分頁＋（選了分類才出現的）子相簿清單＋目前位置
// 相簿一多（每個作品一個子相簿，150 多個）全部攤開會很亂，所以子相簿只在選了分類時顯示，要找特定相簿直接用搜尋
// （2026/10/02 回饋：相簿雜亂、想要搜尋）
function renderAlbumBrowser(albums, activeAlbumId) {

    const topLevel = albums.filter(album => !album.parentAlbumId);
    const active = albums.find(album => album.id === activeAlbumId);
    const parent = active && active.parentAlbumId ? albums.find(album => album.id === active.parentAlbumId) : null;
    const currentTop = parent || (active && !active.parentAlbumId ? active : null);
    const children = currentTop ? albums.filter(album => album.parentAlbumId === currentTop.id).sort(byLabel) : [];
    const labelOf = id => (albums.find(album => album.id === id) || {}).label || "";

    const crumbs = [`<a href="/cms/media">全部</a>`];
    if (activeAlbumId === "none") crumbs.push("<span>未分類</span>");
    if (currentTop) crumbs.push(active === currentTop ? `<span>${escapeHtml(currentTop.label)}</span>` : `<a href="/cms/media?album=${currentTop.id}">${escapeHtml(currentTop.label)}</a>`);
    if (parent) crumbs.push(`<span>${escapeHtml(active.label)}</span>`);

    return `
<div class="album-browser">

    <div class="album-search">
        <input type="search" id="album-search-input" placeholder="搜尋相簿名稱（例如：PAZZO、慈明、抓周）" autocomplete="off">
        <div class="album-search-results" id="album-search-results" hidden>
            ${albums.map(album => `
            <a href="/cms/media?album=${album.id}" class="album-search-result" data-label="${escapeHtml(album.label.toLowerCase())} ${escapeHtml(labelOf(album.parentAlbumId).toLowerCase())}">
                <span>${escapeHtml(album.label)}</span>
                ${album.parentAlbumId ? `<small>${escapeHtml(labelOf(album.parentAlbumId))}</small>` : `<small>分類</small>`}
            </a>`).join("")}
            <p class="album-search-empty" hidden>找不到符合的相簿</p>
        </div>
    </div>

    <nav class="album-tabs">
        <a href="/cms/media" class="${!activeAlbumId ? "active" : ""}">全部</a>
        <a href="/cms/media?album=none" class="${activeAlbumId === "none" ? "active" : ""}">未分類</a>
        ${topLevel.map(album => `<a href="/cms/media?album=${album.id}" class="${currentTop && currentTop.id === album.id ? "active" : ""}">${escapeHtml(album.label)}</a>`).join("")}
    </nav>

    ${activeAlbumId ? `<div class="album-crumbs">${crumbs.join('<span class="album-crumbs-sep">›</span>')}</div>` : ""}

    ${children.length > 0 ? `
    <div class="album-children">
        <a href="/cms/media?album=${currentTop.id}" class="${active === currentTop ? "active" : ""}">全部（${children.length} 個相簿）</a>
        ${children.map(child => `<a href="/cms/media?album=${child.id}" class="${activeAlbumId === child.id ? "active" : ""}">${escapeHtml(child.label)}</a>`).join("")}
    </div>
    ` : ""}

</div>

<script>
(function () {
    var input = document.getElementById("album-search-input");
    var box = document.getElementById("album-search-results");
    var rows = Array.prototype.slice.call(box.querySelectorAll(".album-search-result"));
    var empty = box.querySelector(".album-search-empty");

    function filter() {
        var q = input.value.trim().toLowerCase();
        if (!q) { box.hidden = true; return; }
        var shown = 0;
        rows.forEach(function (row) {
            var hit = q.split(/\s+/).every(function (word) { return row.getAttribute("data-label").indexOf(word) !== -1; });
            row.hidden = !hit || shown >= 30;
            if (hit) shown++;
        });
        empty.hidden = shown > 0;
        box.hidden = false;
    }

    input.addEventListener("input", filter);
    input.addEventListener("focus", filter);
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            var first = rows.filter(function (row) { return !row.hidden; })[0];
            if (first) window.location.href = first.href;
        }
        if (event.key === "Escape") { input.value = ""; box.hidden = true; }
    });
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".album-search")) box.hidden = true;
    });
})();
</script>
`;

}

// 只開放一層子分類：頂層分類（parentAlbumId 空）底下可以掛子相簿，子相簿不能再有自己的子相簿
function renderParentOptions(albums, current, excludeId) {

    const topLevel = albums.filter(album => !album.parentAlbumId && album.id !== excludeId);

    return `
        <option value="">（頂層分類）</option>
        ${topLevel.map(album => `<option value="${album.id}" ${current === album.id ? "selected" : ""}>${album.label}</option>`).join("")}
    `;

}

module.exports = (files, albums = [], activeAlbumId = "", driveConfig = {}) => layout(

"媒體庫",

`

<h1>媒體庫</h1>

<br>

<details style="margin:12px 0;border:1px solid #ddd;border-radius:8px;padding:10px 14px;" ${albums.length === 0 ? "open" : ""}>

    <summary style="cursor:pointer;font-weight:bold;">相簿管理（${albums.length} 個相簿，點展開新增/重新命名/刪除）</summary>

    <div style="margin-top:12px;">

        ${albums.length === 0 ? "<p style=\"color:#888;\">尚未新增任何相簿</p>" : `
        <table style="width:100%;border-collapse:collapse;max-width:640px;">
            <tbody>
                ${albums.map(album => `
                    <tr>
                        <td style="padding:6px 8px;border-bottom:1px solid #eee;">
                            <form method="POST" action="/cms/media/albums/${album.id}" style="display:flex;gap:6px;">
                                <input type="text" name="label" value="${album.label}" style="padding:6px;flex:1;">
                                <select name="parentAlbumId" style="padding:6px;">${renderParentOptions(albums, album.parentAlbumId, album.id)}</select>
                                <button type="submit">儲存</button>
                            </form>
                        </td>
                        <td style="padding:6px 8px;border-bottom:1px solid #eee;">
                            <form method="POST" action="/cms/media/albums/${album.id}/delete" onsubmit="return confirm('確定要刪除這個相簿嗎？裡面的檔案不會被刪除，只是會變回未分類。');">
                                <button type="submit">刪除相簿</button>
                            </form>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        `}

        <form method="POST" action="/cms/media/albums" style="margin-top:12px;display:flex;gap:8px;">
            <input type="text" name="label" placeholder="新相簿名稱" style="padding:8px;flex:1;max-width:240px;" required>
            <select name="parentAlbumId" style="padding:8px;">${renderParentOptions(albums, "", "")}</select>
            <button type="submit">新增相簿</button>
        </form>

        <p style="font-size:12px;color:#888;margin-top:8px;">上層分類選「（頂層分類）」代表這是一個大分類本身；選某個既有分類代表這是它底下的小分類，只開放一層（小分類底下不能再分）。</p>

    </div>

</details>

${albums.length > 0 ? renderAlbumBrowser(albums, activeAlbumId) : ""}

<div class="trash-panel" data-collections="media"></div>

<div id="dropzone" style="border:2px dashed #ccc;border-radius:8px;padding:40px;text-align:center;color:#888;">

    <p>將圖片或<b>整個資料夾</b>拖放到這裡，選好就會自動上傳，不用再按確認${activeAlbumId && activeAlbumId !== "none" ? "；單張圖片會直接歸類到目前這個相簿" : ""}</p>

    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:10px;">
        <label style="cursor:pointer;">選擇檔案 <input type="file" id="media-upload-input" accept="image/*" multiple></label>
        <label style="cursor:pointer;padding:6px 14px;border:1px solid #ccc;border-radius:6px;background:#fff;color:#333;">📁 上傳資料夾（可一次選多個）<input type="file" id="media-folder-input" webkitdirectory directory multiple style="display:none;"></label>
    </div>

    <p style="font-size:12px;margin-top:10px;">資料夾名稱會自動變成相簿名稱（同名相簿會沿用，不會重複建立）。${activeAlbumId && activeAlbumId !== "none"
        ? "目前在某個分類裡：每個資料夾會變成這個分類底下的作品相簿。"
        : "目前在「全部」：資料夾會變成分類相簿，裡面的子資料夾變成作品相簿（例如「婚慶/抓周/性別派對」資料夾裡放各個作品資料夾）。"}</p>

</div>

<p id="media-upload-status" style="font-size:12px;color:#888;"></p>

${driveConfig.clientId && driveConfig.apiKey ? `
<button type="button" id="drive-picker-btn" style="margin-top:8px;">從 Google 雲端硬碟匯入</button>
<p id="drive-picker-status" style="font-size:12px;color:#888;"></p>
` : ""}

<br>

<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">

    <label><input type="checkbox" id="select-all-checkbox"> 全選</label>

    <button type="button" id="delete-selected-btn" disabled>刪除選取的檔案</button>

    ${albums.length > 0 ? `
    <form method="POST" action="/cms/media/move-to-album" id="move-to-album-form" style="display:flex;gap:6px;align-items:center;">
        <select name="albumId" id="move-to-album-select">
            <option value="">未分類</option>
            ${albums.map(album => `<option value="${album.id}">${album.label}</option>`).join("")}
        </select>
        <button type="submit" id="move-to-album-btn" disabled>移到這個相簿</button>
    </form>
    ` : ""}

    <span id="selected-count" style="font-size:12px;color:#888;"></span>

</div>

<br>

<div class="media-grid" style="display:flex;flex-wrap:wrap;gap:20px;">

    ${files.length === 0 ? "<p>尚未上傳任何圖片</p>" : files.map(file => `

        <div class="media-item" style="width:180px;position:relative;">

            <label style="position:absolute;top:6px;left:6px;background:rgba(255,255,255,.9);border-radius:4px;padding:2px 4px;">
                <input type="checkbox" class="media-select-checkbox" value="${file.id}">
            </label>

            <img src="${file.url}" alt="${file.alt || file.name}" style="width:100%;height:140px;object-fit:cover;object-position:center top;">

            <p style="font-size:12px;word-break:break-all;">${file.name}</p>

            <input type="text" class="media-alt-input" data-file-id="${file.id}" placeholder="Alt 文字（選填，供無障礙閱讀/SEO）" value="${file.alt || ""}" style="width:100%;font-size:12px;padding:4px;margin-bottom:4px;">
            <p class="media-alt-status" data-file-id="${file.id}" style="font-size:11px;color:#888;margin:0 0 4px;"></p>

            <form method="POST" action="/cms/media/${file.id}/delete" onsubmit="return confirm('確定要刪除這個檔案嗎？如果有其他地方正在使用這張圖片，該處的圖片會顯示不出來。');">

                <button type="submit">刪除</button>

            </form>

        </div>

    `).join("")}

</div>

<script>
(function () {

    var dropzone = document.getElementById("dropzone");
    var input = document.getElementById("media-upload-input");
    var status = document.getElementById("media-upload-status");
    var activeAlbumId = ${JSON.stringify(activeAlbumId && activeAlbumId !== "none" ? activeAlbumId : "")};

    // 目前所在相簿的上層分類：資料夾上傳時，作品相簿要建在這個分類底下（相簿只有兩層）
    var albumParents = ${JSON.stringify(Object.fromEntries(albums.map(album => [album.id, album.parentAlbumId || ""])))};
    var contextTop = activeAlbumId ? (albumParents[activeAlbumId] || activeAlbumId) : "";

    // 共用的資料夾上傳（public/js/folderUpload.js）：單張檔案放目前相簿，資料夾自動建相簿
    function uploadEntries(entries) {
        window.FolderUpload.upload(entries, {
            parentAlbumId: contextTop,
            looseAlbumId: activeAlbumId,
            onProgress: function (text) { status.textContent = text; }
        }).then(function (result) {
            if (result.failed.length > 0) {
                alert("有 " + result.failed.length + " 個檔案沒有上傳成功：" + result.failed.map(function (f) { return f.name; }).join("、"));
            }
            status.textContent = "完成，共上傳 " + (result.done - result.failed.length) + " 張";
            window.location.reload();
        }).catch(function (error) {
            status.textContent = "上傳中斷：" + (error && error.message ? error.message : "請重新整理後再試一次");
        });
    }

    function uploadFiles(fileList) {
        uploadEntries(Array.from(fileList).map(function (file) { return { file: file, dirs: [] }; }));
    }

    input.addEventListener("change", function () {
        uploadFiles(input.files);
    });

    document.getElementById("media-folder-input").addEventListener("change", function () {
        uploadEntries(window.FolderUpload.fromInput(this.files));
    });

    dropzone.addEventListener("dragover", function (event) {
        event.preventDefault();
        dropzone.style.background = "#f5f5f5";
    });

    dropzone.addEventListener("dragleave", function () {
        dropzone.style.background = "";
    });

    dropzone.addEventListener("drop", function (event) {
        event.preventDefault();
        dropzone.style.background = "";
        var dataTransfer = event.dataTransfer;
        status.textContent = "讀取中…";
        window.FolderUpload.fromDrop(dataTransfer).then(function (entries) {
            if (entries) uploadEntries(entries);
            else uploadFiles(dataTransfer.files);
        });

    });

})();

(function () {

    var selectAll = document.getElementById("select-all-checkbox");
    var deleteBtn = document.getElementById("delete-selected-btn");
    var moveBtn = document.getElementById("move-to-album-btn");
    var moveForm = document.getElementById("move-to-album-form");
    var countLabel = document.getElementById("selected-count");
    var checkboxes = document.querySelectorAll(".media-select-checkbox");

    function updateState() {

        var checked = document.querySelectorAll(".media-select-checkbox:checked");
        deleteBtn.disabled = checked.length === 0;
        if (moveBtn) {
            moveBtn.disabled = checked.length === 0;
        }
        countLabel.textContent = checked.length > 0 ? ("已選取 " + checked.length + " 個檔案") : "";

    }

    checkboxes.forEach(function (checkbox) {
        checkbox.addEventListener("change", updateState);
    });

    selectAll.addEventListener("change", function () {
        checkboxes.forEach(function (checkbox) {
            checkbox.checked = selectAll.checked;
        });
        updateState();
    });

    function appendSelectedIds(form) {

        var ids = Array.from(document.querySelectorAll(".media-select-checkbox:checked")).map(function (checkbox) {
            return checkbox.value;
        });

        ids.forEach(function (id) {
            var field = document.createElement("input");
            field.type = "hidden";
            field.name = "ids";
            field.value = id;
            form.appendChild(field);
        });

        return ids;

    }

    if (moveForm) {

        moveForm.addEventListener("submit", function (event) {

            event.preventDefault();

            var ids = appendSelectedIds(moveForm);

            if (ids.length === 0) {
                return;
            }

            moveForm.submit();

        });

    }

    deleteBtn.addEventListener("click", function () {

        var ids = Array.from(document.querySelectorAll(".media-select-checkbox:checked")).map(function (checkbox) {
            return checkbox.value;
        });

        if (ids.length === 0) {
            return;
        }

        if (!window.confirm("確定要刪除選取的 " + ids.length + " 個檔案嗎？")) {
            return;
        }

        var form = document.createElement("form");
        form.method = "POST";
        form.action = "/cms/media/delete-many";

        ids.forEach(function (id) {
            var field = document.createElement("input");
            field.type = "hidden";
            field.name = "ids";
            field.value = id;
            form.appendChild(field);
        });

        document.body.appendChild(form);
        form.submit();

    });

})();

(function () {

    document.querySelectorAll(".media-alt-input").forEach(function (input) {

        var fileId = input.getAttribute("data-file-id");
        var status = document.querySelector('.media-alt-status[data-file-id="' + fileId + '"]');
        var originalValue = input.value;

        input.addEventListener("blur", function () {

            if (input.value === originalValue) {
                return;
            }

            status.textContent = "儲存中...";

            fetch("/cms/media/" + fileId + "/alt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ alt: input.value })
            })
                .then(function (res) { return res.json(); })
                .then(function () {
                    originalValue = input.value;
                    status.textContent = "已儲存";
                    setTimeout(function () { status.textContent = ""; }, 2000);
                })
                .catch(function () {
                    status.textContent = "儲存失敗";
                });

        });

    });

})();
</script>

${driveConfig.clientId && driveConfig.apiKey ? `
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="https://apis.google.com/js/api.js"></script>
<script>
(function () {

    var btn = document.getElementById("drive-picker-btn");
    var status = document.getElementById("drive-picker-status");
    var activeAlbumId = ${JSON.stringify(activeAlbumId && activeAlbumId !== "none" ? activeAlbumId : "")};
    var CLIENT_ID = ${JSON.stringify(driveConfig.clientId)};
    var API_KEY = ${JSON.stringify(driveConfig.apiKey)};

    var tokenClient = null;
    var pickerLoaded = false;

    // 頁面一開就先把 Picker 元件準備好，避免點擊授權完成後才臨時載入，
    // 中間多一層非同步空窗，容易被瀏覽器判定成非使用者主動觸發而悄悄擋掉跳出視窗
    if (window.gapi) {
        gapi.load("picker", function () { pickerLoaded = true; });
    }

    function ensurePickerLoaded(callback) {
        if (pickerLoaded) {
            return callback();
        }
        gapi.load("picker", function () {
            pickerLoaded = true;
            callback();
        });
    }

    function openPicker(accessToken) {

        console.log("[drive-picker] openPicker 開始，token 長度：", accessToken ? accessToken.length : 0);

        status.textContent = "正在開啟選擇視窗...";

        ensurePickerLoaded(function () {

            console.log("[drive-picker] Picker 元件已載入，準備建立視窗");

            if (!window.google || !google.picker) {
                console.log("[drive-picker] google.picker 不存在！");
                status.textContent = "Picker 元件載入失敗，請重新整理頁面再試一次";
                return;
            }

            try {

                var view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
                    .setIncludeFolders(true);

                var picker = new google.picker.PickerBuilder()
                    .addView(view)
                    .setOAuthToken(accessToken)
                    .setDeveloperKey(API_KEY)
                    .setCallback(function (data) {

                    if (data.action !== google.picker.Action.PICKED) {
                        return;
                    }

                    var files = data.docs.map(function (doc) {
                        return { id: doc.id, name: doc.name, mimeType: doc.mimeType };
                    });

                    status.textContent = "匯入中...（" + files.length + " 個檔案）";

                    var body = { files: files, accessToken: accessToken };
                    if (activeAlbumId) {
                        body.albumId = activeAlbumId;
                    }

                    fetch("/cms/media/import-from-drive", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body)
                    })
                        .then(function (res) { return res.json(); })
                        .then(function (result) {
                            if (result.error) {
                                status.textContent = "匯入失敗：" + result.error;
                                return;
                            }
                            window.location.reload();
                        })
                        .catch(function () {
                            status.textContent = "匯入失敗";
                        });

                })
                .build();

                console.log("[drive-picker] picker 建立成功，呼叫 setVisible(true)");

                picker.setVisible(true);

                console.log("[drive-picker] setVisible(true) 已呼叫完成");

            } catch (error) {
                console.log("[drive-picker] 建立 picker 時發生例外：", error);
                status.textContent = "開啟選擇視窗時發生錯誤：" + (error && error.message ? error.message : String(error));
            }

        });

    }

    console.log("[drive-picker] 腳本已載入，CLIENT_ID：", CLIENT_ID ? "有設定" : "沒設定", "API_KEY：", API_KEY ? "有設定" : "沒設定");

    btn.addEventListener("click", function () {

        console.log("[drive-picker] 按鈕被點擊");

        if (!tokenClient) {

            if (!window.google || !google.accounts || !google.accounts.oauth2) {
                console.log("[drive-picker] google.accounts.oauth2 不存在，GSI 腳本可能沒載入成功");
                status.textContent = "Google 授權元件載入失敗，請重新整理頁面再試一次";
                return;
            }

            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: "https://www.googleapis.com/auth/drive.readonly",
                callback: function (response) {
                    console.log("[drive-picker] OAuth callback 被呼叫，response：", response);
                    if (response.error) {
                        status.textContent = "Google 授權失敗：" + response.error;
                        return;
                    }
                    if (!response.access_token) {
                        status.textContent = "Google 授權沒有回傳存取權杖";
                        return;
                    }
                    openPicker(response.access_token);
                }
            });

            console.log("[drive-picker] tokenClient 已建立");

        }

        status.textContent = "";
        console.log("[drive-picker] 呼叫 requestAccessToken()");
        tokenClient.requestAccessToken();

    });

})();
</script>
` : ""}

`

);
