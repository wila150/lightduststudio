const layout = require("./layout");
const escapeHtml = require("../escapeHtml");
const { dragReorderScript } = require("./dragReorder");
const { EQUIPMENT_CATEGORIES } = require("../../services/equipmentService");

function categoryOptions(selected) {
    return EQUIPMENT_CATEGORIES.map(c =>
        `<option value="${c.value}"${c.value === selected ? " selected" : ""}>${c.label}</option>`
    ).join("");
}

const MESSAGES = {
    saved: { text: "已儲存", color: "#2f7a3f" },
    name: { text: "請輸入設備名稱", color: "#b5533f" },
    photo: { text: "照片上傳失敗，請換一張圖片再試", color: "#b5533f" }
};

module.exports = (items, user, query = {}) => {

const message = query.saved ? MESSAGES.saved : MESSAGES[query.error];

return layout(

"設備管理",

`

<h1>設備管理</h1>

<p style="color:#777;">在頁面加入「設備清單」模組就會顯示這裡的設備：首頁可設成「只顯示勾選的精選設備」，「我的設備」頁設成「全部，依類別分組」。照片會一起收進媒體庫。</p>

${message ? `<p style="color:${message.color};font-weight:bold;">${message.text}</p>` : ""}

<h2>新增設備</h2>

<form method="POST" action="/cms/equipment" enctype="multipart/form-data" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end;max-width:960px;">
    <label>設備名稱<br><input type="text" name="name" placeholder="例如 Sony A7 IV" required style="width:100%;padding:8px;"></label>
    <label>品牌<br><input type="text" name="brand" placeholder="例如 Sony" style="width:100%;padding:8px;"></label>
    <label>類別<br><select name="category" style="width:100%;padding:8px;">${categoryOptions("camera")}</select></label>
    <label>簡短說明（選填）<br><input type="text" name="description" placeholder="例如 全片幅無反，商業攝影主力機" style="width:100%;padding:8px;"></label>
    <label>照片（選填）<br><input type="file" name="photo" accept="image/*"></label>
    <label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" name="featured"> 首頁精選</label>
    <div><button type="submit">新增設備</button></div>
</form>

<br>

<h2>目前的設備</h2>

${items.length === 0 ? "<p>還沒有設備，從上方新增第一項。</p>" : `

<p style="color:#888;font-size:13px;">拖拉左側 ⠿ 調整順序，前台照這個順序顯示。改完文字記得按該列的「儲存」。</p>

<div data-drag-reorder="/cms/equipment/reorder" class="equipment-list">

    ${items.map(item => `

    <div data-drag-id="${item.id}" class="equipment-row" style="display:flex;gap:14px;align-items:flex-start;padding:12px;margin-bottom:10px;border:1px solid #e3e3e3;border-radius:8px;background:#fff;">

        <span class="drag-handle" title="拖拉排序" style="padding-top:34px;">⠿</span>

        <div style="flex:0 0 110px;">
            <div class="equipment-thumb" data-id="${item.id}" style="width:110px;height:82px;border-radius:6px;background:#f2f0ec center/cover no-repeat;${item.photoUrl ? `background-image:url('${escapeHtml(item.photoUrl)}');` : ""}display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;">${item.photoUrl ? "" : "無照片"}</div>
            <input type="file" class="equipment-photo-input" data-id="${item.id}" accept="image/*" style="width:110px;font-size:11px;margin-top:6px;">
            <button type="button" class="equipment-media-btn" data-id="${item.id}" style="font-size:12px;margin-top:4px;">從媒體庫選擇</button>
            <p class="equipment-photo-status" data-id="${item.id}" style="font-size:11px;color:#888;margin:4px 0 0;"></p>
        </div>

        <form method="POST" action="/cms/equipment/${item.id}" style="flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end;">
            <input type="text" name="name" value="${escapeHtml(item.name)}" placeholder="設備名稱" required style="padding:7px;">
            <input type="text" name="brand" value="${escapeHtml(item.brand)}" placeholder="品牌" style="padding:7px;">
            <select name="category" style="padding:7px;">${categoryOptions(item.category)}</select>
            <input type="text" name="description" value="${escapeHtml(item.description)}" placeholder="簡短說明（選填）" style="padding:7px;grid-column:1 / -1;">
            <label style="display:flex;gap:6px;align-items:center;font-size:13px;"><input type="checkbox" name="featured" ${item.featured ? "checked" : ""}> 首頁精選</label>
            <div style="display:flex;gap:8px;">
                <button type="submit">儲存</button>
                <button type="submit" formaction="/cms/equipment/${item.id}/delete" onclick="return confirm('確定要刪除「${escapeHtml(item.name).replace(/'/g, "")}」嗎？')" class="ghost-btn">刪除</button>
            </div>
        </form>

    </div>

    `).join("")}

</div>

<script>${dragReorderScript()}</script>

`}

<script>
(function () {

    function setPhoto(id, url) {
        var thumb = document.querySelector('.equipment-thumb[data-id="' + id + '"]');
        if (thumb) { thumb.style.backgroundImage = "url('" + url + "')"; thumb.textContent = ""; }
    }

    function status(id, text) {
        var el = document.querySelector('.equipment-photo-status[data-id="' + id + '"]');
        if (el) el.textContent = text;
    }

    document.querySelectorAll(".equipment-photo-input").forEach(function (input) {
        input.addEventListener("change", function () {
            var id = input.getAttribute("data-id");
            var file = input.files[0];
            if (!file) return;
            var formData = new FormData();
            formData.append("photo", file);
            status(id, "上傳中...");
            fetch("/cms/equipment/" + id + "/photo", { method: "POST", body: formData })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (!data.photoUrl) { status(id, data.error || "上傳失敗"); return; }
                    setPhoto(id, data.photoUrl);
                    status(id, "已更新");
                    input.value = "";
                })
                .catch(function () { status(id, "上傳失敗"); });
        });
    });

    document.querySelectorAll(".equipment-media-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-id");
            window.openMediaPicker({
                multiple: false,
                onSelect: function (files) {
                    status(id, "設定中...");
                    fetch("/cms/equipment/" + id + "/photo/from-media", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mediaId: files[0].id })
                    })
                        .then(function (res) { return res.json(); })
                        .then(function (data) {
                            if (!data.photoUrl) { status(id, data.error || "設定失敗"); return; }
                            setPhoto(id, data.photoUrl);
                            status(id, "已更新");
                        })
                        .catch(function () { status(id, "設定失敗"); });
                }
            });
        });
    });

})();
</script>

`,

user

);

};
