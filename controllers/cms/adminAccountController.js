const adminAccountService = require("../../services/adminAccountService");
const adminAccountsView = require("../../views/cms/adminAccounts");

exports.index = async (req, res) => {

    const accounts = await adminAccountService.list();

    res.send(adminAccountsView(accounts, req.session.user));

};

exports.create = async (req, res) => {

    const email = (req.body.email || "").trim();

    if (!email) {
        return res.redirect("/cms/admins");
    }

    await adminAccountService.createOrGrant(
        email,
        req.body.password || "",
        req.body.role === "tenant_admin" ? "tenant_admin" : "superadmin",
        req.body.tenantId || req.tenantId
    );

    res.redirect("/cms/admins");

};

exports.updateRole = async (req, res) => {

    // 不能把自己降級/移除，避免不小心把自己鎖在後台外面
    if (req.params.uid === req.session.user.id) {
        return res.redirect("/cms/admins");
    }

    await adminAccountService.updateRole(
        req.params.uid,
        req.body.role === "tenant_admin" ? "tenant_admin" : "superadmin",
        req.body.tenantId || req.tenantId
    );

    res.redirect("/cms/admins");

};

exports.remove = async (req, res) => {

    if (req.params.uid === req.session.user.id) {
        return res.redirect("/cms/admins");
    }

    await adminAccountService.remove(req.params.uid);

    res.redirect("/cms/admins");

};
