const layout = require("./layout");

module.exports = (user) => layout(

"修改密碼",

`

<h1>修改密碼</h1>

<br>

<div style="max-width:420px;">

    <label>目前密碼</label>
    <br>
    <input type="password" id="current-password" style="width:100%;padding:10px;" required>

    <br><br>

    <label>新密碼（至少 6 個字元）</label>
    <br>
    <input type="password" id="new-password" style="width:100%;padding:10px;" required>

    <br><br>

    <label>確認新密碼</label>
    <br>
    <input type="password" id="confirm-password" style="width:100%;padding:10px;" required>

    <br><br>

    <p id="change-password-error" style="color:#c0392b;"></p>
    <p id="change-password-success" style="color:#2a7a3b;"></p>

    <button type="button" id="change-password-btn">更新密碼</button>

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

    var currentInput = document.getElementById("current-password");
    var newInput = document.getElementById("new-password");
    var confirmInput = document.getElementById("confirm-password");
    var errorEl = document.getElementById("change-password-error");
    var successEl = document.getElementById("change-password-success");
    var btn = document.getElementById("change-password-btn");

    btn.addEventListener("click", function () {

        errorEl.textContent = "";
        successEl.textContent = "";

        if (newInput.value.length < 6) {
            errorEl.textContent = "新密碼至少需要 6 個字元";
            return;
        }

        if (newInput.value !== confirmInput.value) {
            errorEl.textContent = "兩次輸入的新密碼不一致";
            return;
        }

        btn.disabled = true;
        btn.textContent = "更新中...";

        firebase.auth().signInWithEmailAndPassword("${user.email}", currentInput.value)
            .then(function (credential) {
                return credential.user.updatePassword(newInput.value);
            })
            .then(function () {

                successEl.textContent = "密碼已更新";
                currentInput.value = "";
                newInput.value = "";
                confirmInput.value = "";
                btn.disabled = false;
                btn.textContent = "更新密碼";

            })
            .catch(function (error) {

                errorEl.textContent = error.message || "更新失敗，請確認目前密碼是否正確";
                btn.disabled = false;
                btn.textContent = "更新密碼";

            });

    });

})();
</script>

`,

user

);
