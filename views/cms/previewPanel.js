// 即時預覽面板：iframe 本身塞在編輯表單旁邊的窄欄位裡，寬度常常不到 768px，
// 剛好會被 style.css 的手機版斷點抓到，導致在電腦上看到的「即時預覽」其實是手機版畫面。
// 用固定的桌面/手機兩種「真實寬度」渲染 iframe，再用 CSS scale 縮放塞進欄位裡，
// 這樣預覽出來的才是該裝置真正會用到的版面，而不是取決於這個窄欄位本身有多寬。
const DEVICE_SPECS = {
    desktop: { width: 1100, height: 720 },
    mobile: { width: 390, height: 760 }
};

function previewPanelHtml(iframeId, src) {

    return `
    <div class="live-preview-panel">

        <div class="live-preview-toolbar">
            <p style="margin:0;">即時預覽</p>
            <div class="live-preview-toggle">
                <button type="button" class="preview-device-btn active" data-target="${iframeId}" data-device="desktop">🖥️ 電腦版</button>
                <button type="button" class="preview-device-btn" data-target="${iframeId}" data-device="mobile">📱 手機版</button>
                <a href="${src}" target="_blank" rel="noopener" class="preview-device-btn">↗ 開新分頁看原始大小</a>
            </div>
        </div>

        <div class="live-preview-viewport" id="${iframeId}-viewport">
            <iframe id="${iframeId}" src="${src}" class="live-preview-iframe"></iframe>
        </div>

    </div>
    `;

}

function previewPanelScript() {

    return `
    (function () {

        var DEVICE_SPECS = ${JSON.stringify(DEVICE_SPECS)};

        function applyDevice(iframeId, device) {

            var viewport = document.getElementById(iframeId + "-viewport");
            var frame = document.getElementById(iframeId);

            if (!viewport || !frame) { return; }

            var spec = DEVICE_SPECS[device] || DEVICE_SPECS.desktop;

            frame.style.width = spec.width + "px";
            frame.style.height = spec.height + "px";

            var scale = Math.min(1, viewport.clientWidth / spec.width);

            frame.style.transform = "scale(" + scale + ")";
            frame.style.transformOrigin = "top left";

            viewport.style.height = (spec.height * scale) + "px";

        }

        document.querySelectorAll(".preview-device-btn").forEach(function (btn) {

            var target = btn.getAttribute("data-target");

            applyDevice(target, "desktop");

            btn.addEventListener("click", function () {

                document.querySelectorAll('.preview-device-btn[data-target="' + target + '"]').forEach(function (b) {
                    b.classList.remove("active");
                });

                btn.classList.add("active");

                applyDevice(target, btn.getAttribute("data-device"));

            });

        });

        // 這段腳本在「存檔不重整頁面」機制下，頁面上其他表單存檔時會整段重新執行一次
        // （才能讓新畫面裡的按鈕重新綁定事件），所以舊的 resize 監聽要先移除，不然會越疊越多
        if (window.__previewPanelResizeHandler) {
            window.removeEventListener("resize", window.__previewPanelResizeHandler);
        }

        window.__previewPanelResizeHandler = function () {

            document.querySelectorAll(".preview-device-btn.active").forEach(function (btn) {
                applyDevice(btn.getAttribute("data-target"), btn.getAttribute("data-device"));
            });

        };

        window.addEventListener("resize", window.__previewPanelResizeHandler);

    })();

    // 頁面基本資料表單、每個模組的「儲存這個模組」表單改用 fetch 送出，成功後只重新整理右邊的即時預覽 iframe，
    // 不整頁重新載入——捲動位置、預覽面板選的裝置（電腦/手機）都不會被打斷。
    // 上移/下移/刪除/新增模組這幾個會改變模組清單本身的動作維持原本整頁重新整理，沒有一併改成這樣
    (function () {

        function refreshPreviews() {
            document.querySelectorAll(".live-preview-iframe").forEach(function (frame) {
                frame.src = frame.src;
            });
        }

        function flashSaved(button) {

            if (!button) {
                return;
            }

            var original = button.textContent;

            button.textContent = "已儲存 ✓";
            button.disabled = true;

            setTimeout(function () {
                button.textContent = original;
                button.disabled = false;
            }, 1200);

        }

        document.querySelectorAll("form.ajax-save-form, form.module-card-body").forEach(function (form) {

            form.addEventListener("submit", function (event) {

                event.preventDefault();

                var submitBtn = form.querySelector('button[type="submit"]');

                fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    credentials: "same-origin"
                }).then(function (res) {

                    if (!res.ok) {
                        throw new Error("儲存失敗");
                    }

                    refreshPreviews();
                    flashSaved(submitBtn);

                }).catch(function () {
                    alert("儲存失敗，請稍後再試一次");
                });

            });

        });

    })();
    `;

}

module.exports = { previewPanelHtml, previewPanelScript };
