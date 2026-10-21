const escapeHtml = require("../escapeHtml");

module.exports = (errorMessage = "") => `
<!DOCTYPE html>
<html lang="zh-TW">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>CMS 登入 | Portfolio CMS</title>

    <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">

    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Cormorant+Garamond:wght@600&display=swap">

    <style>

        :root{
            --bg:#f5f4f1; --card:#fff; --text:#1a1a1a; --soft:#6b6b6b;
            --border:#e3e0da; --accent:#b08a5a; --accent-soft:#f3ead9; --danger:#c0483f;
            --radius:10px; --radius-sm:6px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            font-family: 'Noto Sans TC', sans-serif;
            background: var(--bg);
        }

        .login-card {
            width: 100%;
            max-width: 380px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: 0 10px 30px -14px rgba(20, 18, 14, .2);
            padding: 36px 32px;
        }

        .login-brand {
            text-align: center;
            margin-bottom: 28px;
        }

        .login-logo {
            width: 48px;
            height: 48px;
            margin: 0 auto 14px;
            border-radius: 12px;
            background: var(--accent);
            color: #fff;
            font-family: 'Cormorant Garamond', serif;
            font-size: 22px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .login-brand h1 {
            font-family: 'Cormorant Garamond', serif;
            font-size: 22px;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 6px;
        }

        .login-brand p {
            font-size: 13px;
            color: var(--soft);
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: var(--soft);
            margin-bottom: 6px;
        }

        .form-group input {
            width: 100%;
            padding: 11px 14px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-family: inherit;
            color: var(--text);
            transition: border-color .15s, box-shadow .15s;
        }

        .form-group input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-soft);
        }

        .login-message {
            font-size: 13px;
            padding: 10px 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            line-height: 1.5;
        }

        .login-message[hidden] {
            display: none;
        }

        .login-message-error {
            background: #fcedec;
            color: var(--danger);
            border: 1px solid #f3c8c5;
        }

        .login-message-info {
            background: #eaf7ec;
            color: #2a7a3b;
            border: 1px solid #c7e8cc;
        }

        .login-btn-primary {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: var(--radius-sm);
            background: var(--text);
            color: #fff;
            font-size: 15px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: background .15s, transform .15s;
        }

        .login-btn-primary:hover:not(:disabled) {
            background: var(--accent);
        }

        .login-btn-primary:disabled {
            opacity: .7;
            cursor: default;
        }

        .login-divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 20px 0;
            color: var(--soft);
            font-size: 12px;
        }

        .login-divider::before,
        .login-divider::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .login-btn-google {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 11px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: #fff;
            color: var(--text);
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            text-decoration: none;
            cursor: pointer;
            transition: background .15s, box-shadow .15s;
            box-sizing: border-box;
        }

        .login-btn-google:hover:not(:disabled) {
            background: #f8f9fa;
            box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
        }

        .login-btn-google:disabled {
            opacity: .7;
            cursor: default;
        }

        .login-forgot {
            text-align: center;
            margin-top: 20px;
        }

        .login-forgot a {
            font-size: 13px;
            color: var(--accent);
            text-decoration: none;
        }

        .login-forgot a:hover {
            text-decoration: underline;
        }

    </style>

</head>

<body>

    <div class="login-card">

        <div class="login-brand">
            <div class="login-logo">P</div>
            <h1>Portfolio CMS</h1>
            <p>請登入管理後台</p>
        </div>

        <div class="form-group">
            <label for="login-email">Email</label>
            <input
                type="email"
                id="login-email"
                placeholder="you@example.com"
                autocomplete="username"
                required
            >
        </div>

        <div class="form-group">
            <label for="login-password">密碼</label>
            <input
                type="password"
                id="login-password"
                placeholder="Password"
                autocomplete="current-password"
                required
            >
        </div>

        <div id="login-error" class="login-message login-message-error" ${errorMessage ? "" : "hidden"}>${escapeHtml(errorMessage)}</div>
        <div id="login-info" class="login-message login-message-info" hidden></div>

        <button type="button" id="login-btn" class="login-btn-primary">登入</button>

        <div class="login-divider">或</div>

        <a href="/cms/login/google" class="login-btn-google">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span class="btn-label">使用 Google 帳號登入</span>
        </a>

        <p class="login-forgot">
            <a href="#" id="forgot-password-link">忘記密碼？</a>
        </p>

    </div>

<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>

<script>
(function () {

    firebase.initializeApp({
        apiKey: "${process.env.FIREBASE_WEB_API_KEY}",
        authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
        projectId: "${process.env.FIREBASE_PROJECT_ID}",
        appId: "${process.env.FIREBASE_WEB_APP_ID}"
    });

    var btn = document.getElementById("login-btn");
    var emailInput = document.getElementById("login-email");
    var passwordInput = document.getElementById("login-password");
    var errorEl = document.getElementById("login-error");
    var infoEl = document.getElementById("login-info");
    var forgotLink = document.getElementById("forgot-password-link");

    function setMessage(el, text) {
        el.textContent = text || "";
        el.hidden = !text;
    }

    function submitIdToken(idToken) {

        return fetch("/cms/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: idToken })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data.success) {
                    throw new Error(data.message || "登入失敗");
                }

                window.location.href = "/cms";

            });

    }

    forgotLink.addEventListener("click", function (event) {

        event.preventDefault();

        setMessage(errorEl, "");
        setMessage(infoEl, "");

        var email = emailInput.value.trim();

        if (!email) {
            setMessage(errorEl, "請先在 Email 欄位輸入您的帳號，再點擊忘記密碼");
            return;
        }

        firebase.auth().sendPasswordResetEmail(email)
            .then(function () {
                setMessage(infoEl, "已寄送重設密碼信件到 " + email + "，請至信箱查收");
            })
            .catch(function (error) {
                setMessage(errorEl, error.message || "寄送失敗，請確認 Email 是否正確");
            });

    });

    btn.addEventListener("click", function () {

        setMessage(errorEl, "");
        btn.disabled = true;
        btn.textContent = "登入中...";

        firebase.auth().signInWithEmailAndPassword(emailInput.value, passwordInput.value)
            .then(function (credential) {
                return credential.user.getIdToken();
            })
            .then(submitIdToken)
            .catch(function (error) {

                setMessage(errorEl, error.message || "登入失敗，請確認帳號密碼");

                btn.disabled = false;
                btn.textContent = "登入";

            });

    });

    // Google 登入現在是純伺服器端整頁導轉流程（見 routes/cms/auth.js 的 /login/google），
    // 這裡不用再處理，按鈕本身就是一個 <a href="/cms/login/google">

})();
</script>

</body>

</html>
`;
