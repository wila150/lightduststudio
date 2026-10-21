// 帳號管理這類敏感頁面只開放給 superadmin，要放在 requireAuth 之後使用
module.exports = (req, res, next) => {

    if (!req.session.user || req.session.user.role !== "superadmin") {
        return res.status(403).send("只有 superadmin 可以使用這個功能");
    }

    next();

};
