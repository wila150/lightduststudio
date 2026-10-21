const rateLimit = require("express-rate-limit");

// CMS 登入防暴力破解：同一 IP 15 分鐘內最多 20 次嘗試
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "嘗試次數過多，請稍後再試" }
});

// 公開表單（聯絡我／預約）防灌爆：同一 IP 15 分鐘內最多 10 次送出
exports.publicFormLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: "送出次數過多，請稍後再試"
});
