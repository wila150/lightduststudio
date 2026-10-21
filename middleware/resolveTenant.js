// 從登入使用者身上取出目前要操作的租戶 ID，掛在 requireAuth 之後使用
// Phase 1：每個使用者（不管 superadmin 或 tenant 成員）登入時都已經在 authService 綁定好 tenantId
module.exports = (req, res, next) => {

    req.tenantId = req.session.user.tenantId;

    next();

};
