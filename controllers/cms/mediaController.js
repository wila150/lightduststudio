const mediaService = require("../../services/mediaService");
const mediaView = require("../../views/cms/media");
const { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_API_KEY } = require("../../config/site");

// 選頂層分類時，要連同底下的子相簿一起顯示（跟分類清單頁「頂層分類含子分類」的篩選邏輯一致），
// 只有子相簿或「未分類」才是精準比對自己
async function resolveFiles(tenantId, activeAlbumId, albums) {

    if (!activeAlbumId || activeAlbumId === "none") {
        return mediaService.list(tenantId, activeAlbumId);
    }

    const children = albums.filter(album => album.parentAlbumId === activeAlbumId).map(album => album.id);

    if (children.length === 0) {
        return mediaService.list(tenantId, activeAlbumId);
    }

    const matchIds = new Set([activeAlbumId, ...children]);
    const allFiles = await mediaService.list(tenantId);

    return allFiles.filter(file => matchIds.has(file.albumId));

}

// 顯示媒體庫（可用 ?album=相簿id 篩選，album=none 代表只看未分類的檔案）
exports.index = async (req, res) => {

    const activeAlbumId = req.query.album || "";

    const albums = await mediaService.getAlbums(req.tenantId);
    const files = await resolveFiles(req.tenantId, activeAlbumId, albums);

    res.send(mediaView(files, albums, activeAlbumId, { clientId: GOOGLE_DRIVE_CLIENT_ID, apiKey: GOOGLE_DRIVE_API_KEY }));

};

// 媒體庫清單（JSON，供其他頁面的圖片選擇器彈窗使用，同樣支援 ?album= 篩選）
exports.list = async (req, res) => {

    const albums = await mediaService.getAlbums(req.tenantId);
    const files = await resolveFiles(req.tenantId, req.query.album || "", albums);

    res.json({ files, albums });

};

// 相簿總覽（JSON，給圖片選擇器彈窗用「資料夾」方式瀏覽）：每個相簿的張數與封面（第一張），
// 頂層分類的張數包含底下所有子相簿，未分類另外算
exports.albumsSummary = async (req, res) => {

    const albums = await mediaService.getAlbums(req.tenantId);
    const files = await mediaService.list(req.tenantId);

    const stats = new Map();
    const bump = (id, file) => {
        const entry = stats.get(id) || { count: 0, coverUrl: "" };
        entry.count++;
        // list() 是新到舊排序，最後一個就是最早上傳的；封面優先用檔名有「封面」的那張
        if (!entry.coverUrl || /^封面/.test(file.name || "")) entry.coverUrl = file.url;
        stats.set(id, entry);
    };

    const parentOf = new Map(albums.map(album => [album.id, album.parentAlbumId || ""]));

    for (const file of [...files].reverse()) {
        const albumId = file.albumId && parentOf.has(file.albumId) ? file.albumId : "none";
        bump(albumId, file);
        if (albumId !== "none" && parentOf.get(albumId)) bump(parentOf.get(albumId), file);
    }

    res.json({
        albums: albums.map(album => ({ id: album.id, label: album.label, parentAlbumId: album.parentAlbumId || "", ...(stats.get(album.id) || { count: 0, coverUrl: "" }) })),
        unsorted: stats.get("none") || { count: 0, coverUrl: "" }
    });

};

// 上傳檔案（支援單檔或多檔一次上傳，body.albumId 可指定要歸類到哪個相簿）
exports.upload = async (req, res) => {

    const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);

    if (files.length === 0) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    try {
        const { uploaded, failed } = await mediaService.uploadMany(req.tenantId, files, req.body.albumId);

        if (uploaded.length === 0) {
            return res.status(400).json({ error: (failed[0] && failed[0].error) || "所有檔案上傳失敗，請檢查檔案格式和大小", failed });
        }

        res.json({ files: uploaded, failed });
    } catch (error) {
        console.error("圖片上傳錯誤:", error);
        return res.status(400).json({ error: error.message || "圖片上傳失敗" });
    }

};

// 從 Google 雲端硬碟匯入圖片（前端已經用 Google Picker 選好檔案並拿到 access token，這裡負責下載後存進現有的媒體庫）
exports.importFromDrive = async (req, res) => {

    const files = Array.isArray(req.body.files) ? req.body.files : [];
    const accessToken = req.body.accessToken;

    if (!accessToken || files.length === 0) {
        return res.status(400).json({ error: "缺少存取權杖或檔案清單" });
    }

    const downloaded = await Promise.allSettled(files.map(async driveFile => {

        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!driveRes.ok) {
            throw new Error(`下載雲端硬碟檔案失敗：${driveFile.name}`);
        }

        const arrayBuffer = await driveRes.arrayBuffer();

        return {
            buffer: Buffer.from(arrayBuffer),
            originalname: driveFile.name,
            mimetype: driveFile.mimeType,
            size: arrayBuffer.byteLength
        };

    }));

    const fakeFiles = downloaded.filter(result => result.status === "fulfilled").map(result => result.value);

    if (fakeFiles.length === 0) {
        return res.status(400).json({ error: "沒有任何檔案下載成功" });
    }

    const uploaded = await mediaService.uploadMany(req.tenantId, fakeFiles, req.body.albumId);

    res.json({ files: uploaded });

};

// ===== 相簿管理 =====

// 上傳資料夾用：找同名、同上層的相簿，沒有才新增（JSON）。相簿只開放一層子相簿，
// 指定的上層如果本身就是子相簿，改掛到它的上層，避免出現第三層
exports.ensureAlbum = async (req, res) => {

    const label = String(req.body.label || "").trim().replace(/\s+/g, " ");

    if (!label) {
        return res.status(400).json({ error: "缺少相簿名稱" });
    }

    const albums = await mediaService.getAlbums(req.tenantId);
    let parentAlbumId = req.body.parentAlbumId || "";
    const parent = albums.find(album => album.id === parentAlbumId);

    if (!parent) {
        parentAlbumId = "";
    } else if (parent.parentAlbumId) {
        parentAlbumId = parent.parentAlbumId;
    }

    const existing = albums.find(album => album.label === label && (album.parentAlbumId || "") === parentAlbumId);
    const album = existing || await mediaService.createAlbum(req.tenantId, label, parentAlbumId);

    res.json({ id: album.id, label: album.label, parentAlbumId: album.parentAlbumId || "" });

};

exports.createAlbum = async (req, res) => {

    await mediaService.createAlbum(req.tenantId, req.body.label, req.body.parentAlbumId);

    res.redirect("/cms/media");

};

exports.updateAlbum = async (req, res) => {

    await mediaService.updateAlbum(req.tenantId, req.params.albumId, req.body.label, req.body.parentAlbumId);

    res.redirect("/cms/media");

};

exports.removeAlbum = async (req, res) => {

    await mediaService.removeAlbum(req.tenantId, req.params.albumId);

    res.redirect("/cms/media");

};

// 批次把選取的檔案移到某個相簿（albumId 空字串代表移回未分類）
exports.moveToAlbum = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await mediaService.moveToAlbum(req.tenantId, ids, req.body.albumId);
    }

    res.redirect("/cms/media");

};

// 刪除單一檔案
exports.remove = async (req, res) => {

    await mediaService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/media");

};

// 批次刪除多個檔案
exports.removeMany = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await mediaService.removeMany(req.tenantId, ids);
    }

    res.redirect("/cms/media");

};

// 更新一張圖片的 alt 文字
exports.updateAlt = async (req, res) => {

    await mediaService.updateAlt(req.tenantId, req.params.id, req.body.alt);

    res.json({ success: true });

};
