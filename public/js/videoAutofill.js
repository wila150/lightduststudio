// 作品編輯頁：貼上 YouTube／Vimeo 連結，自動帶入標題、網址代稱（翻成英文）、SEO 描述、影片比例（2026/10/03）
// 只填空白的欄位，已經手動填過的不會被蓋掉；影片比例每次換連結都會依影片重新判斷（Shorts＝9:16）
(function () {

    var link = document.getElementById("item-link-input");
    if (!link) return;

    var title = document.getElementById("seo-title-input");
    var slug = document.getElementById("item-slug-input");
    var meta = document.getElementById("seo-meta-description-input");
    var ratio = document.getElementById("item-video-ratio");
    var box = document.getElementById("item-video-autofill");
    var thumb = box.querySelector("img");
    var text = box.querySelector("span");
    var lastUrl = link.value.trim();
    var timer = null;

    function isVideo(url) {
        return /(youtube\.com\/(watch|shorts|embed)|youtu\.be\/|vimeo\.com\/)/.test(url);
    }

    function fill(field, value) {
        if (!field || !value || field.value.trim()) return false;
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
    }

    function lookup() {

        var url = link.value.trim();
        if (!isVideo(url) || url === lastUrl) return;
        lastUrl = url;

        box.style.display = "flex";
        thumb.style.display = "none";
        text.textContent = "讀取影片資料中…";

        var endpoint = link.getAttribute("data-video-info");
        fetch(endpoint + (endpoint.indexOf("?") === -1 ? "?" : "&") + "url=" + encodeURIComponent(url))
            .then(function (res) { return res.json(); })
            .then(function (info) {
                if (info.error) throw new Error(info.error);
                var filled = [];
                if (fill(title, info.title)) filled.push("標題");
                if (fill(slug, info.slug)) filled.push("網址代稱");
                if (fill(meta, info.metaDescription)) filled.push("SEO 描述");
                if (ratio && info.videoRatio) {
                    ratio.value = info.videoRatio;
                    filled.push("影片比例（" + (info.videoRatio === "9:16" ? "直式短影音" : "橫式") + "）");
                }
                if (info.thumbnailUrl) {
                    thumb.src = info.thumbnailUrl;
                    thumb.style.display = "block";
                }
                text.textContent = (info.title ? "「" + info.title + "」" : "") +
                    (filled.length ? " 已自動帶入：" + filled.join("、") + "。封面會自動用影片縮圖，存檔前都可以再改。" : " 欄位都已經有值，沒有覆蓋。");
            })
            .catch(function () {
                text.textContent = "讀不到這支影片的資料（可能是私人影片），請手動填寫。";
            });

    }

    link.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(lookup, 600);
    });
    link.addEventListener("change", lookup);

})();
