// CMS 後台「存檔不重整頁面」的共用機制。攔截後台所有一般表單的送出，改成背景 fetch 送出，
// 拿回伺服器算好的新頁面 HTML 後只換掉 <body> 內容並讓裡面的 <script> 重新執行一次
// （用 fetch 換掉 body 而不是整頁 reload，瀏覽器不會有白屏閃一下的感覺，捲動位置也會盡量保留）。
// 這支檔案本身放在 <head>（見 views/cms/layout.js），不在會被換掉的 <body> 範圍內，
// 所以這裡註冊的事件監聽只會執行「一次」，不會因為 body 被換掉幾次就疊加好幾份。
//
// 已經有自己的 fetch 邏輯（即時預覽面板攔截的表單，見 previewPanel.js）的表單不會被這裡重複處理。
(function () {

    function shouldIntercept(form) {

        if (form.hasAttribute("data-no-soft-submit")) {
            return false;
        }

        if (form.classList.contains("ajax-save-form") || form.classList.contains("module-card-body")) {
            return false;
        }

        if (form.target && form.target !== "" && form.target !== "_self") {
            return false;
        }

        if ((form.method || "get").toLowerCase() !== "post") {
            return false;
        }

        return true;

    }

    // 換掉 body 內容，並讓裡面的 <script> 真的執行一次——用 innerHTML 插入的 <script> 不會自動執行，
    // 要重新建立一個 script 節點取代掉原本那個才會跑
    function reinitScripts(root) {

        Array.from(root.querySelectorAll("script")).forEach(function (oldScript) {

            var newScript = document.createElement("script");

            Array.from(oldScript.attributes).forEach(function (attr) {
                newScript.setAttribute(attr.name, attr.value);
            });

            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);

        });

    }

    function swapBody(html, url) {

        var parser = new DOMParser();
        var newDoc = parser.parseFromString(html, "text/html");
        var scrollY = window.scrollY;
        var stayingOnSamePage = !url || url === window.location.href;

        // 先換網址再重新執行 body 裡的腳本——側邊欄「目前在哪一頁」的高亮判斷是讀
        // window.location.pathname，順序反過來的話會讀到換頁前的舊網址
        if (!stayingOnSamePage) {
            history.pushState({ softNav: true }, "", url);
        }

        document.title = newDoc.title;
        document.body.className = newDoc.body.className;
        document.body.innerHTML = newDoc.body.innerHTML;

        reinitScripts(document.body);

        window.scrollTo(0, stayingOnSamePage ? scrollY : 0);

    }

    document.addEventListener("submit", function (event) {

        // event.defaultPrevented 代表已經有更早的 handler（例如刪除表單常見的
        // onsubmit="return confirm(...)"）取消了這次送出，這裡就不該再送一次
        if (event.defaultPrevented) {
            return;
        }

        var form = event.target;

        if (!(form instanceof HTMLFormElement) || !shouldIntercept(form)) {
            return;
        }

        event.preventDefault();

        // 按的是哪顆按鈕：同一個表單裡「儲存」「刪除」常常是兩顆 submit，刪除那顆用 formaction 指到別的網址，
        // 要照按下去那顆的網址送，按鈕本身的 name/value 也要一起帶上（跟瀏覽器原生送出一樣）
        var submitter = event.submitter;
        var action = submitter && submitter.hasAttribute("formaction")
            ? submitter.getAttribute("formaction")
            : (form.getAttribute("action") || window.location.href);

        var formData = new FormData(form);

        if (submitter && submitter.name) {
            formData.append(submitter.name, submitter.value);
        }

        // 表單如果沒有檔案欄位就不需要 multipart/form-data，改用一般的 urlencoded 格式送出——
        // 後端只掛了 express.urlencoded()/express.json()，沒有 multer 的路由收到 multipart body
        // 會完全解析不到內容（Express 5 + body-parser 2.x 下 req.body 甚至會是 undefined 而不是 {}）
        var hasFileInput = !!form.querySelector('input[type="file"]');
        var body = formData;

        if (!hasFileInput) {
            body = new URLSearchParams();
            formData.forEach(function (value, key) {
                body.append(key, value);
            });
        }

        var submitButtons = Array.from(form.querySelectorAll('button[type="submit"], button:not([type])'));

        submitButtons.forEach(function (btn) {
            btn.disabled = true;
        });

        fetch(action, {
            method: "POST",
            body: body,
            credentials: "same-origin"
        }).then(function (res) {

            return res.text().then(function (html) {

                var looksLikeCmsPage = html.indexOf('class="cms"') !== -1;

                if (res.ok && looksLikeCmsPage) {
                    swapBody(html, res.url);
                    return;
                }

                // 完整頁面但不是後台畫面本身（例如登入逾時被導回登入頁），直接真的跳轉過去，不要硬套殼
                if (/<html[\s>]/i.test(html)) {
                    window.location.href = res.url;
                    return;
                }

                // 剩下的情況通常是驗證失敗時後端直接回一段訊息（可能包著 HTML 標籤），不能拿來換掉整個畫面，
                // 改用 alert 顯示。alert 只能顯示純文字，所以先把標籤剝掉只留文字內容
                var plainText = html;

                if (/<[a-z][\s\S]*>/i.test(html)) {
                    var temp = document.createElement("div");
                    temp.innerHTML = html;
                    plainText = temp.textContent.replace(/\n\s*\n+/g, "\n").trim();
                }

                throw new Error(plainText || "儲存失敗，請稍後再試一次");

            });

        }).catch(function (error) {

            alert(error && error.message ? error.message : "儲存失敗，請稍後再試一次");

            submitButtons.forEach(function (btn) {
                btn.disabled = false;
            });

        });

    });

    // 換過網址後（history.pushState）按瀏覽器上一頁，要真的把該網址的內容載回來
    window.addEventListener("popstate", function () {
        window.location.reload();
    });

})();
