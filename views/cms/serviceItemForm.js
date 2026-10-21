const layout = require("./layout");

module.exports = (item) => layout(

item ? "編輯服務項目" : "新增服務項目",

`

<h1>${item ? "編輯服務項目" : "新增服務項目"}</h1>

<br>

<form method="POST" action="${item ? `/cms/booking-services/${item.id}` : "/cms/booking-services"}">

    <label>名稱</label>

    <br>

    <input type="text" name="name" value="${item ? item.name : ""}" style="width:100%;padding:10px;" required>

    <br><br>

    <label>時長（分鐘）</label>

    <br>

    <input type="number" name="duration" min="5" step="5" value="${item ? item.duration : 60}" style="width:100%;padding:10px;" required>

    <br><br>

    <label>價格（選填，純文字，例如 NT$2000）</label>

    <br>

    <input type="text" name="price" value="${item ? item.price : ""}" style="width:100%;padding:10px;">

    <br><br>

    <label>描述</label>

    <br>

    <textarea name="description" rows="4" style="width:100%;padding:10px;">${item ? item.description : ""}</textarea>

    <br><br>

    <label>
        <input type="checkbox" name="active" ${!item || item.active ? "checked" : ""}>
        啟用（顯示在前台預約流程可選）
    </label>

    <br><br>

    <button type="submit">儲存</button>

</form>

`

);
