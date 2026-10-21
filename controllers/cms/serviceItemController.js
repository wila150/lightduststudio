const serviceItemService = require("../../services/serviceItemService");
const listView = require("../../views/cms/serviceItems");
const formView = require("../../views/cms/serviceItemForm");

// 服務項目列表
exports.index = async (req, res) => {

    const items = await serviceItemService.getAll(req.tenantId);

    res.send(listView(items));

};

// 新增表單
exports.newForm = (req, res) => {

    res.send(formView());

};

// 新增
exports.create = async (req, res) => {

    await serviceItemService.create(req.tenantId, {
        name: req.body.name,
        duration: req.body.duration,
        price: req.body.price,
        description: req.body.description,
        active: req.body.active === "on"
    });

    res.redirect("/cms/booking-services");

};

// 編輯表單
exports.editForm = async (req, res) => {

    const item = await serviceItemService.getById(req.tenantId, req.params.id);

    if (!item) {
        return res.redirect("/cms/booking-services");
    }

    res.send(formView(item));

};

// 更新
exports.update = async (req, res) => {

    await serviceItemService.update(req.tenantId, req.params.id, {
        name: req.body.name,
        duration: req.body.duration,
        price: req.body.price,
        description: req.body.description,
        active: req.body.active === "on"
    });

    res.redirect("/cms/booking-services");

};

// 刪除
exports.remove = async (req, res) => {

    await serviceItemService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/booking-services");

};

// 批次刪除
exports.removeMany = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await serviceItemService.removeMany(req.tenantId, ids);
    }

    res.redirect("/cms/booking-services");

};
