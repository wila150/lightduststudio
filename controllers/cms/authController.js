const crypto = require("crypto");
const authService = require("../../services/authService");
const googleOAuthService = require("../../services/googleOAuthService");
const customPageService = require("../../services/customPageService");
const collectionService = require("../../services/collectionService");
const messageService = require("../../services/messageService");
const bookingService = require("../../services/bookingService");
const settingsService = require("../../services/settingsService");
const { isEffectivelyPublished } = require("../../services/publishHelper");
const { QUICK_LINK_CATALOG, DEFAULT_QUICK_LINKS } = require("../../services/quickLinks");

const loginView = require("../../views/cms/login");
const dashboardView = require("../../views/cms/dashboard");
const changePasswordView = require("../../views/cms/changePassword");

// 顯示登入頁
exports.showLogin = (req, res) => {

    if (req.session.user) {
        return res.redirect("/cms");
    }

    res.send(loginView(req.query.error || ""));

};

// 登入：前端用 Firebase Web SDK 驗證帳密後，把拿到的 ID token 送過來這裡驗證
exports.login = async (req, res) => {

    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ success: false, message: "缺少登入憑證" });
    }

    const result = await authService.verifyIdToken(idToken);

    if (!result.success) {
        return res.status(401).json({ success: false, message: result.message });
    }

    req.session.user = result.user;

    // 登入狀態存在 Firestore，等確定寫入完成才回應，避免登入後馬上開的頁面讀不到登入狀態
    req.session.save(() => res.json({ success: true }));

};

// Google 登入第一步：整頁導轉到 Google 登入頁（伺服器端流程，不用彈窗/iframe，Safari 也能用）
exports.googleLoginRedirect = (req, res) => {

    const state = crypto.randomUUID();

    req.session.googleOAuthState = state;

    res.redirect(googleOAuthService.getAuthUrl(state));

};

// Google 登入第二步：Google 導回這裡，帶著一次性 code，伺服器直接跟 Google／Firebase 換成登入憑證
exports.googleLoginCallback = async (req, res) => {

    const { code, state, error } = req.query;

    const expectedState = req.session.googleOAuthState;
    delete req.session.googleOAuthState;

    if (error) {
        return res.redirect("/cms/login?error=" + encodeURIComponent("已取消 Google 登入"));
    }

    if (!code || !state || state !== expectedState) {
        return res.redirect("/cms/login?error=" + encodeURIComponent("登入驗證失敗，請重新嘗試"));
    }

    try {

        const googleIdToken = await googleOAuthService.exchangeCodeForGoogleIdToken(code);
        const { idToken: firebaseIdToken, uid, email } = await googleOAuthService.exchangeGoogleIdTokenForFirebaseIdToken(googleIdToken);

        // signInWithIdp 建立/連結的帳號，email 屬性不會自動寫入，補寫回去，
        // 這樣帳號管理列表跟用 email 設定權限（auth.getUserByEmail）才能正確對到這個帳號
        if (uid && email) {

            try {
                await authService.backfillEmail(uid, email);
            } catch (backfillError) {
                console.error("補寫 Google 登入帳號 email 失敗：", backfillError);
            }

        }

        const result = await authService.verifyIdToken(firebaseIdToken);

        if (!result.success) {
            return res.redirect("/cms/login?error=" + encodeURIComponent(result.message));
        }

        req.session.user = result.user;

        req.session.save(() => res.redirect("/cms"));

    } catch (err) {

        console.error("Google 登入失敗：", err);
        res.redirect("/cms/login?error=" + encodeURIComponent("Google 登入失敗，請稍後再試"));

    }

};

// Dashboard
exports.dashboard = async (req, res) => {

    if (!req.session.user) {
        return res.redirect("/cms/login");
    }

    const tenantId = req.session.user.tenantId;

    // 作品集現在是「分類清單型」自訂頁面，站上可能不只一個（例如作品拆成 PHOTOGRAPHY／FILM 兩個獨立頁面），
    // 全部一起算，不能再假設只有一個固定 slug "projects"
    const collectionPages = await customPageService.getCollectionPages(tenantId);

    const [projectsByPage, messages, bookings, settings] = await Promise.all([
        Promise.all(collectionPages.map(page => collectionService.getItems(tenantId, page.id))),
        messageService.list(tenantId),
        bookingService.list(tenantId),
        settingsService.get(tenantId)
    ]);

    const projects = projectsByPage.flat();

    const stats = {
        projectCount: projects.length,
        publishedProjectCount: projects.filter(isEffectivelyPublished).length,
        messageCount: messages.length,
        bookingCount: bookings.filter(b => b.status !== "cancelled").length
    };

    // 儀表板「最新留言」預覽：只取最新 5 筆，完整清單另外連到 /cms/messages
    const recentMessages = messages.slice(0, 5);

    const selectedKeys = settings.dashboardQuickLinks || DEFAULT_QUICK_LINKS;

    const quickLinks = QUICK_LINK_CATALOG
        .filter(item => selectedKeys.includes(item.key))
        .filter(item => !item.superadminOnly || req.session.user.role === "superadmin")
        .map(item => {

            if (item.key === "newProjectItem") {
                // 只有一個作品集頁面時可以直接連到該頁面的新增項目表單；有多個就先連到頁面清單，由業者自己選要加進哪一個
                const href = collectionPages.length === 1 ? `/cms/custom-pages/${collectionPages[0].id}/items/new` : "/cms/custom-pages";
                return { ...item, href };
            }

            return item;

        });

    res.send(dashboardView(req.session.user, stats, quickLinks, selectedKeys, req.session.user.role === "superadmin", recentMessages));

};

// 更新 Dashboard 快捷連結要顯示哪幾個
exports.updateQuickLinks = async (req, res) => {

    if (!req.session.user) {
        return res.redirect("/cms/login");
    }

    const keys = Array.isArray(req.body.quickLinks) ? req.body.quickLinks : (req.body.quickLinks ? [req.body.quickLinks] : []);

    const validKeys = QUICK_LINK_CATALOG.map(item => item.key);
    const selected = keys.filter(key => validKeys.includes(key));

    await settingsService.update(req.session.user.tenantId, { dashboardQuickLinks: selected });

    res.redirect("/cms");

};

// 修改密碼頁（實際更新密碼是前端直接呼叫 Firebase Web SDK，這裡只負責顯示頁面）
exports.showChangePassword = (req, res) => {

    if (!req.session.user) {
        return res.redirect("/cms/login");
    }

    res.send(changePasswordView(req.session.user));

};

// 登出
exports.logout = (req, res) => {

    req.session.destroy(() => {

        res.redirect("/cms/login");

    });

};