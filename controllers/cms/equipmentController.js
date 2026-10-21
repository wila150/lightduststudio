const equipmentService = require("../../services/equipmentService");
const mediaService = require("../../services/mediaService");
const equipmentView = require("../../views/cms/equipment");

// 設備照片一律收進媒體庫（之後也能在別的地方重用），設備本身只存網址
async function uploadToMedia(tenantId, file) {
    if (!file) return null;
    const media = await mediaService.upload(tenantId, file);
    return media && media.url ? media : null;
}

exports.index = async (req, res) => {

    const items = await equipmentService.getAll(req.tenantId);

    res.send(equipmentView(items, req.session.user, req.query));

};

exports.create = async (req, res) => {

    let photo = {};

    try {
        photo = (await uploadToMedia(req.tenantId, req.file)) || {};
    } catch (error) {
        console.error(error);
        return res.redirect("/cms/equipment?error=photo");
    }

    const item = await equipmentService.create(req.tenantId, req.body, photo);

    res.redirect(item ? "/cms/equipment?saved=1" : "/cms/equipment?error=name");

};

exports.update = async (req, res) => {

    const ok = await equipmentService.update(req.tenantId, req.params.id, req.body);

    res.redirect(ok ? "/cms/equipment?saved=1" : "/cms/equipment?error=name");

};

exports.uploadPhoto = async (req, res) => {

    try {
        const media = await uploadToMedia(req.tenantId, req.file);
        if (!media) return res.status(400).json({ error: "沒有收到圖片" });
        await equipmentService.setPhoto(req.tenantId, req.params.id, media.url);
        res.json({ photoUrl: media.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || "上傳失敗" });
    }

};

exports.setPhotoFromMedia = async (req, res) => {

    const allMedia = await mediaService.list(req.tenantId);
    const selected = allMedia.find(file => file.id === req.body.mediaId);

    if (!selected) {
        return res.status(400).json({ error: "找不到指定的媒體庫圖片" });
    }

    await equipmentService.setPhoto(req.tenantId, req.params.id, selected.url);

    res.json({ photoUrl: selected.url });

};

exports.remove = async (req, res) => {

    await equipmentService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/equipment");

};

exports.reorder = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

    try {
        await equipmentService.reorder(req.tenantId, ids);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }

};
