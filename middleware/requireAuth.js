// 保護 CMS 後台路由，未登入導回登入頁
module.exports = (req, res, next) => {

    if (!req.session.user) {
        // 後台頁面裡用 fetch 抓資料（JSON、即時通道）時，回 401 讓畫面顯示「登入已過期」，
        // 不要轉址到登入頁（轉址回來的是網頁，畫面只會看到「載入失敗」）
        const wantsData = req.path.endsWith(".json") || req.path.endsWith("/stream")
            || req.xhr || (req.get("accept") || "").includes("application/json") || req.is("application/json")
            || (req.get("sec-fetch-mode") && req.get("sec-fetch-mode") !== "navigate");
        if (wantsData) {
            return res.status(401).json({ error: "登入已過期，請重新整理頁面登入" });
        }
        return res.redirect("/cms/login");
    }

    next();

};
