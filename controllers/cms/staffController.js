const staffService = require("../../services/staffService");
const mediaService = require("../../services/mediaService");
const listView = require("../../views/cms/staffList");
const formView = require("../../views/cms/staffForm");

// 人員列表
exports.index = async (req, res) => {

    const staff = await staffService.getAll(req.tenantId);

    res.send(listView(staff));

};

// 新增表單
exports.newForm = (req, res) => {

    res.send(formView());

};

// 新增
exports.create = async (req, res) => {

    await staffService.create(req.tenantId, {
        name: req.body.name,
        bio: req.body.bio,
        active: req.body.active === "on"
    });

    res.redirect("/cms/staff");

};

// 編輯表單
exports.editForm = async (req, res) => {

    const member = await staffService.getById(req.tenantId, req.params.id);

    if (!member) {
        return res.redirect("/cms/staff");
    }

    res.send(formView(member));

};

// 更新
exports.update = async (req, res) => {

    await staffService.update(req.tenantId, req.params.id, {
        name: req.body.name,
        bio: req.body.bio,
        active: req.body.active === "on"
    });

    res.redirect("/cms/staff");

};

// 上傳/更換大頭照
exports.updateAvatar = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: "沒有收到檔案" });
    }

    const result = await staffService.setAvatar(req.tenantId, req.params.id, req.file);

    if (!result) {
        return res.status(404).json({ error: "找不到人員" });
    }

    res.json(result);

};

// 從媒體庫挑選既有圖片當大頭照
exports.setAvatarFromMedia = async (req, res) => {

    const allMedia = await mediaService.list(req.tenantId);
    const selected = allMedia.find(file => file.id === req.body.mediaId);

    if (!selected) {
        return res.status(400).json({ error: "找不到指定的媒體庫圖片" });
    }

    const result = await staffService.setAvatarFromMedia(req.tenantId, req.params.id, selected.url);

    if (!result) {
        return res.status(404).json({ error: "找不到人員" });
    }

    res.json(result);

};

// 刪除
exports.remove = async (req, res) => {

    await staffService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/staff");

};

// 批次刪除
exports.removeMany = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await staffService.removeMany(req.tenantId, ids);
    }

    res.redirect("/cms/staff");

};
