const navConfigService = require("../../services/navConfigService");
const customPageService = require("../../services/customPageService");
const navSettingsView = require("../../views/cms/navSettings");
const navItemFormView = require("../../views/cms/navItemForm");

exports.index = async (req, res) => {

    const navItems = await navConfigService.getAll(req.tenantId);

    res.send(navSettingsView(navItems));

};

exports.newForm = async (req, res) => {

    const pages = await customPageService.getAll(req.tenantId);

    res.send(navItemFormView(null, pages));

};

exports.editForm = async (req, res) => {

    const [navItem, pages] = await Promise.all([
        navConfigService.getById(req.tenantId, req.params.id),
        customPageService.getAll(req.tenantId)
    ]);

    if (!navItem) {
        return res.redirect("/cms/nav-items");
    }

    res.send(navItemFormView(navItem, pages));

};

exports.create = async (req, res) => {

    await navConfigService.create(req.tenantId, {
        label: req.body.label,
        enabled: req.body.enabled === "on",
        targetType: req.body.targetType,
        targetUrl: req.body.targetUrl,
        targetPageId: req.body.targetPageId,
        showCategories: req.body.showCategories === "on",
        showEmptyCategories: req.body.showEmptyCategories === "on"
    });

    res.redirect("/cms/nav-items");

};

exports.update = async (req, res) => {

    const existing = await navConfigService.getById(req.tenantId, req.params.id);

    if (!existing) {
        return res.redirect("/cms/nav-items");
    }

    await navConfigService.update(req.tenantId, req.params.id, {
        label: req.body.label,
        enabled: req.body.enabled === "on",
        targetType: req.body.targetType,
        targetUrl: req.body.targetUrl,
        targetPageId: req.body.targetPageId,
        showCategories: req.body.showCategories === "on",
        showEmptyCategories: req.body.showEmptyCategories === "on"
    });

    res.redirect("/cms/nav-items");

};

exports.remove = async (req, res) => {

    await navConfigService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/nav-items");

};

exports.removeMany = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await navConfigService.removeMany(req.tenantId, ids);
    }

    res.redirect("/cms/nav-items");

};

exports.move = async (req, res) => {

    await navConfigService.moveNavItem(req.tenantId, req.params.id, req.body.direction);

    res.redirect("/cms/nav-items");

};

// 拖拉排序（JS fetch 呼叫，回 JSON 不是導轉頁面）
exports.reorder = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

    try {

        await navConfigService.reorderNavItems(req.tenantId, ids);
        res.json({ success: true });

    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false });

    }

};
