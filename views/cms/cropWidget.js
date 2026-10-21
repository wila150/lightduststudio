// 共用的圖片剪裁 modal，搭配 Cropper.js（CDN 引入，vanilla JS）
// 用法：頁面裡放一次 cropWidgetHtml()，載入 cropWidgetAssets()，
// 然後在檔案 <input> 的 change 事件裡呼叫 window.openImageCropper(file, aspectRatio, callback)

function cropWidgetAssets() {
    return `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cropperjs@1.6.1/dist/cropper.min.css">
        <script src="https://cdn.jsdelivr.net/npm/cropperjs@1.6.1/dist/cropper.min.js"></script>
    `;
}

function cropWidgetHtml() {
    return `
        <div id="crop-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;">
            <div style="background:white;padding:20px;border-radius:8px;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;gap:12px;">
                <div style="max-width:70vw;max-height:60vh;overflow:hidden;">
                    <img id="crop-modal-image" style="max-width:100%;display:block;">
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button type="button" id="crop-modal-skip" style="display:none;">跳過剪裁，直接上傳原圖</button>
                    <button type="button" id="crop-modal-cancel">取消</button>
                    <button type="button" id="crop-modal-confirm">確認剪裁</button>
                </div>
            </div>
        </div>
    `;
}

// 內嵌 script：定義 window.openImageCropper(file, aspectRatio, callback, options)
// options.allowSkip = true 時會顯示「跳過剪裁」按鈕，callback 會收到原始 file
function cropWidgetScript() {
    return `
    (function () {

        var modal = document.getElementById("crop-modal");
        var image = document.getElementById("crop-modal-image");
        var confirmBtn = document.getElementById("crop-modal-confirm");
        var cancelBtn = document.getElementById("crop-modal-cancel");
        var skipBtn = document.getElementById("crop-modal-skip");

        var cropper = null;
        var currentFile = null;
        var currentCallback = null;

        function closeModal() {

            if (cropper) {
                cropper.destroy();
                cropper = null;
            }

            modal.style.display = "none";

        }

        window.openImageCropper = function (file, aspectRatio, callback, options) {

            options = options || {};

            currentFile = file;
            currentCallback = callback;

            var reader = new FileReader();

            reader.onload = function () {

                image.src = reader.result;
                modal.style.display = "flex";

                skipBtn.style.display = options.allowSkip ? "" : "none";

                if (cropper) {
                    cropper.destroy();
                }

                cropper = new Cropper(image, {
                    aspectRatio: aspectRatio || NaN,
                    viewMode: 1
                });

            };

            reader.readAsDataURL(file);

        };

        confirmBtn.addEventListener("click", function () {

            if (!cropper) {
                return;
            }

            cropper.getCroppedCanvas().toBlob(function (blob) {

                var callback = currentCallback;

                closeModal();

                if (callback) {
                    callback(blob);
                }

            });

        });

        cancelBtn.addEventListener("click", function () {
            closeModal();
        });

        skipBtn.addEventListener("click", function () {

            var callback = currentCallback;
            var file = currentFile;

            closeModal();

            if (callback) {
                callback(file);
            }

        });

    })();
    `;
}

module.exports = { cropWidgetAssets, cropWidgetHtml, cropWidgetScript };
