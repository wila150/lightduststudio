const layout = require("./layout");

module.exports = (member) => layout(

member ? "編輯人員" : "新增人員",

`

<h1>${member ? "編輯人員" : "新增人員"}</h1>

<br>

${member ? `

<label>大頭照（選填）</label>

<br>

${member.avatarUrl ? `<img src="${member.avatarUrl}" alt="${member.name}" style="width:100px;height:100px;object-fit:cover;border-radius:50%;display:block;margin-bottom:10px;">` : "<p style=\"color:#888;\">尚未設定大頭照</p>"}

<input type="file" id="avatar-input" accept="image/*">

<button type="button" id="avatar-media-btn">從媒體庫選擇</button>

<p id="avatar-status" style="font-size:12px;color:#888;"></p>

<br>

` : ""}

<form method="POST" action="${member ? `/cms/staff/${member.id}` : "/cms/staff"}">

    <label>姓名</label>

    <br>

    <input type="text" name="name" value="${member ? member.name : ""}" style="width:100%;padding:10px;" required>

    <br><br>

    <label>簡介（選填）</label>

    <br>

    <textarea name="bio" rows="4" style="width:100%;padding:10px;">${member ? member.bio : ""}</textarea>

    <br><br>

    <label>
        <input type="checkbox" name="active" ${!member || member.active ? "checked" : ""}>
        啟用（顯示在前台預約流程可選）
    </label>

    <br><br>

    <button type="submit">儲存</button>

</form>

${member ? `
<script>
(function () {

    var avatarInput = document.getElementById("avatar-input");
    var status = document.getElementById("avatar-status");

    avatarInput.addEventListener("change", function () {

        var file = avatarInput.files[0];

        if (!file) {
            return;
        }

        var formData = new FormData();
        formData.append("avatar", file);

        status.textContent = "上傳中...";

        fetch("/cms/staff/${member.id}/avatar", {
            method: "POST",
            body: formData
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data.avatarUrl) {
                    status.textContent = "上傳失敗";
                    return;
                }

                window.location.reload();

            })
            .catch(function () {
                status.textContent = "上傳失敗";
            });

    });

})();

(function () {

    var mediaBtn = document.getElementById("avatar-media-btn");
    var status = document.getElementById("avatar-status");

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: false,
            onSelect: function (files) {

                var file = files[0];

                status.textContent = "設定中...";

                fetch("/cms/staff/${member.id}/avatar/from-media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mediaId: file.id })
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {

                        if (!data.avatarUrl) {
                            status.textContent = "設定失敗";
                            return;
                        }

                        window.location.reload();

                    })
                    .catch(function () {
                        status.textContent = "設定失敗";
                    });

            }
        });

    });

})();
</script>
` : ""}

`

);
