// 作品清單（FILM／PHOTOGRAPH 的「分類與項目」）上的兩個按鈕（2026/10/03）：
// 1. 上傳相簿：選電腦裡的資料夾 → 傳進媒體庫（放在跟分類同名的相簿底下）→ 每個資料夾自動建立一個作品
// 2. 從媒體庫資料夾建立作品：勾選媒體庫裡已經有的作品資料夾 → 每個資料夾建立一個作品
// 作品內容由後端 /items/from-albums 決定：標題＝資料夾名稱、封面＝檔名是「封面」的那張、相簿＝資料夾裡全部照片
(function () {

    var box = document.querySelector(".album-to-items");

    if (!box) {
        return;
    }

    var endpoint = box.getAttribute("data-endpoint");
    var category = box.getAttribute("data-category");
    var categoryLabel = box.getAttribute("data-category-label");
    var status = box.querySelector(".album-to-items-status");
    var input = box.querySelector(".album-to-items-input");
    var pickBtn = box.querySelector(".album-to-items-pick");

    function needCategory() {
        if (category) return false;
        return !confirm("目前沒有選分類，建立的作品會是「未分類」，前台的分類標籤找不到它們。\n\n建議先點上方的分類標籤再操作。仍要繼續嗎？");
    }

    function createItems(albums) {
        status.textContent = "建立作品中…";
        return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ albumIds: albums.map(function (a) { return a.id; }), category: category })
        }).then(function (res) { return res.json(); }).then(function (data) {
            if (!data.success) throw new Error("建立作品失敗");
            var msg = "已建立 " + data.created.length + " 個作品" + (categoryLabel ? "（" + categoryLabel + "）" : "");
            if (data.created.length) msg += "：\n・" + data.created.join("\n・");
            if (data.skipped.length) msg += "\n\n跳過：\n・" + data.skipped.join("\n・");
            alert(msg);
            window.location.reload();
        });
    }

    function fail(error) {
        status.textContent = (error && error.message ? error.message : "發生錯誤") + "，請重新整理後再試一次";
        pickBtn.disabled = false;
    }

    input.addEventListener("click", function (event) {
        if (needCategory()) event.preventDefault();
    });

    input.addEventListener("change", function () {

        var entries = window.FolderUpload.fromInput(input.files);
        input.value = "";

        // 選的是「裝了好幾個作品資料夾的上層資料夾」時，直接放在上層的散落照片不建成作品
        if (entries.some(function (entry) { return entry.dirs.length >= 2; })) {
            entries = entries.filter(function (entry) { return entry.dirs.length >= 2; });
        }

        if (!entries.length) {
            return;
        }

        var folders = {};
        entries.forEach(function (entry) { if (entry.dirs.length) folders[entry.dirs[entry.dirs.length - 1]] = true; });
        var names = Object.keys(folders);

        if (!confirm("要上傳 " + names.length + " 個資料夾、建立 " + names.length + " 個作品" + (categoryLabel ? "到「" + categoryLabel + "」" : "") + "嗎？\n\n・" + names.join("\n・"))) {
            return;
        }

        pickBtn.disabled = true;

        // 媒體庫裡放在跟分類同名的相簿底下（例如「婚慶/抓周/性別派對」），之後在媒體庫也找得到
        var parentPromise = categoryLabel
            ? fetch("/cms/media/albums/ensure", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: categoryLabel, parentAlbumId: "" })
            }).then(function (res) { return res.json(); }).then(function (album) { return album.id; })
            : Promise.resolve("");

        parentPromise.then(function (parentAlbumId) {
            return window.FolderUpload.upload(entries, {
                parentAlbumId: parentAlbumId,
                onProgress: function (text) { status.textContent = text; }
            });
        }).then(function (result) {
            if (result.failed.length) {
                alert("有 " + result.failed.length + " 個檔案沒有上傳成功：" + result.failed.map(function (f) { return f.name; }).join("、"));
            }
            return createItems(result.albums);
        }).catch(fail);

    });

    pickBtn.addEventListener("click", function () {
        if (needCategory()) return;
        window.openMediaPicker({
            pickAlbums: true,
            onSelect: function (albums) {
                if (!confirm("要用這 " + albums.length + " 個資料夾建立作品" + (categoryLabel ? "，放進「" + categoryLabel + "」" : "") + "嗎？\n\n" + albums.map(function (a) { return "・" + a.label + "（" + a.count + " 張）"; }).join("\n"))) {
                    return;
                }
                pickBtn.disabled = true;
                createItems(albums).catch(fail);
            }
        });
    });

})();
