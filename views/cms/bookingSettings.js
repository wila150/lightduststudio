const layout = require("./layout");

const DAY_LABELS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

module.exports = (settings) => layout(

"預約設定",

`

<h1>預約設定</h1>

<br>

<form method="POST" action="/cms/booking-settings">

    <label>營業開始時間</label>

    <br>

    <input type="time" name="startTime" value="${settings.startTime}" required>

    <br><br>

    <label>營業結束時間</label>

    <br>

    <input type="time" name="endTime" value="${settings.endTime}" required>

    <br><br>

    <label>時段長度（分鐘）</label>

    <br>

    <input type="number" name="slotInterval" min="5" step="5" value="${settings.slotInterval}" required>

    <br><br>

    <label>營業日</label>

    <br>

    ${DAY_LABELS.map((label, index) => `
        <label style="margin-right:14px;">
            <input type="checkbox" name="workDays" value="${index}" ${settings.workDays.includes(index) ? "checked" : ""}>
            ${label}
        </label>
    `).join("")}

    <br><br>

    <button type="submit">儲存</button>

</form>

`

);
