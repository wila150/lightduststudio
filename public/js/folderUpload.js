// 資料夾上傳（媒體庫、作品清單共用）：把電腦裡的資料夾整包傳進媒體庫，資料夾名稱自動變成相簿名稱。
// 2026/10/03 回饋：要能一次上傳多個資料夾、在分類裡直接「上傳相簿」建立作品
//
// window.FolderUpload.fromInput(fileList)   → entries（<input webkitdirectory> 選的檔案）
// window.FolderUpload.fromDrop(dataTransfer) → Promise<entries | null>（拖進來的不是資料夾就回 null）
// window.FolderUpload.upload(entries, options) → Promise<{ albums: [{ id, label, count }], done, failed }>
//   entries: [{ file, dirs: ["分類資料夾", "作品資料夾"] }]，dirs 空的代表單張檔案
//   options.parentAlbumId：作品相簿要建在哪個分類相簿底下（"" 代表在「全部」：第一層資料夾當分類、最裡層當作品相簿）
//   options.looseAlbumId：沒有資料夾的單張檔案放哪個相簿
//   options.onProgress(text)
(function () {

    var IMAGE_NAME = /\.(jpe?g|png|gif|webp|heic)$/i;

    function isImage(file) {
        return (file.type && file.type.indexOf("image/") === 0) || IMAGE_NAME.test(file.name);
    }

    function clean(name) {
        return String(name || "").trim().replace(/\s+/g, " ");
    }

    function fromInput(fileList) {
        // webkitRelativePath：「選的資料夾/子資料夾/檔名」
        return Array.from(fileList).map(function (file) {
            var parts = (file.webkitRelativePath || file.name).split("/");
            return { file: file, dirs: parts.slice(0, -1) };
        });
    }

    // 一層一層讀出資料夾裡所有檔案（readEntries 一次最多回 100 筆，要讀到空為止）
    function readEntry(entry, dirs) {
        if (entry.isFile) {
            return new Promise(function (resolve) {
                entry.file(function (file) { resolve([{ file: file, dirs: dirs }]); }, function () { resolve([]); });
            });
        }
        var reader = entry.createReader();
        var children = [];
        return new Promise(function (resolve) {
            (function readMore() {
                reader.readEntries(function (batch) {
                    if (!batch.length) {
                        Promise.all(children.map(function (child) { return readEntry(child, dirs.concat(entry.name)); }))
                            .then(function (lists) { resolve([].concat.apply([], lists)); });
                        return;
                    }
                    children = children.concat(Array.from(batch));
                    readMore();
                }, function () { resolve([]); });
            })();
        });
    }

    function fromDrop(dataTransfer) {
        var entries = Array.from(dataTransfer.items || [])
            .map(function (item) { return item.webkitGetAsEntry ? item.webkitGetAsEntry() : null; })
            .filter(Boolean);
        if (!entries.some(function (entry) { return entry.isDirectory; })) {
            return Promise.resolve(null);
        }
        return Promise.all(entries.map(function (entry) { return readEntry(entry, []); }))
            .then(function (lists) { return [].concat.apply([], lists); });
    }

    function ensureAlbum(label, parentAlbumId) {
        return fetch("/cms/media/albums/ensure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: label, parentAlbumId: parentAlbumId || "" })
        }).then(function (res) {
            if (!res.ok) throw new Error("建立相簿失敗：" + label);
            return res.json();
        }).then(function (album) { return album.id; });
    }

    function postBatch(files, albumId) {
        var formData = new FormData();
        files.forEach(function (file) { formData.append("files", file); });
        if (albumId) formData.append("albumId", albumId);
        return fetch("/cms/media/upload", { method: "POST", body: formData })
            .then(function (res) { return res.json(); })
            .then(function (data) { return (data && data.failed) || []; });
    }

    function upload(entries, options) {

        options = options || {};
        var progress = options.onProgress || function () {};
        var parentAlbumId = options.parentAlbumId || "";

        entries = entries.filter(function (entry) { return isImage(entry.file) && entry.file.name.charAt(0) !== "."; });

        if (entries.length === 0) {
            return Promise.reject(new Error("沒有找到圖片檔"));
        }

        // 同一個資料夾（完整路徑相同）的檔案放進同一個相簿；同名但路徑不同的資料夾（例如不同場次）分開
        var groups = [];
        var byKey = {};
        entries.forEach(function (entry) {
            var key = entry.dirs.join("/");
            if (!byKey[key]) {
                byKey[key] = { dirs: entry.dirs, files: [] };
                groups.push(byKey[key]);
            }
            byKey[key].files.push(entry.file);
        });

        // 名稱只差空白的資料夾（例如 Drive 上同名的不同場次）會被清成同一個名字，第二個起加「Part 2」…，
        // 不然會被併進同一個相簿、變成同一個作品
        var usedNames = {};
        groups.forEach(function (group) {
            if (!group.dirs.length) return;
            var parentKey = parentAlbumId || (group.dirs.length > 1 ? clean(group.dirs[0]) : "");
            var base = clean(group.dirs[group.dirs.length - 1]);
            var key = parentKey + "/" + base;
            usedNames[key] = (usedNames[key] || 0) + 1;
            group.label = usedNames[key] === 1 ? base : base + " Part " + usedNames[key];
        });

        var total = entries.length;
        var done = 0;
        var failed = [];
        var topCache = {};
        var results = [];

        function albumFor(group) {
            var dirs = group.dirs;
            if (dirs.length === 0) return Promise.resolve(options.looseAlbumId || "");
            var leaf = group.label;
            if (parentAlbumId) return ensureAlbum(leaf, parentAlbumId);
            if (dirs.length === 1) return ensureAlbum(leaf, "");
            var top = clean(dirs[0]);
            topCache[top] = topCache[top] || ensureAlbum(top, "");
            return topCache[top].then(function (topId) { return ensureAlbum(leaf, topId); });
        }

        progress("準備上傳 " + total + " 張（" + groups.length + " 個資料夾）…");

        return groups.reduce(function (chain, group) {
            return chain.then(function () {
                var name = group.dirs.length ? group.label : "目前相簿";
                return albumFor(group).then(function (albumId) {
                    var batches = [];
                    for (var i = 0; i < group.files.length; i += 20) batches.push(group.files.slice(i, i + 20));
                    return batches.reduce(function (inner, batch) {
                        return inner.then(function () {
                            return postBatch(batch, albumId).then(function (bad) {
                                failed = failed.concat(bad);
                                done += batch.length;
                                progress("上傳中 " + done + " / " + total + "（" + name + "）");
                            });
                        });
                    }, Promise.resolve()).then(function () {
                        if (albumId && !results.some(function (r) { return r.id === albumId; })) {
                            results.push({ id: albumId, label: name, count: group.files.length });
                        }
                    });
                });
            });
        }, Promise.resolve()).then(function () {
            return { albums: results, done: done, failed: failed };
        });

    }

    window.FolderUpload = { fromInput: fromInput, fromDrop: fromDrop, upload: upload };

})();
