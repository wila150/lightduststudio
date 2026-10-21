const layout = require("./layout");
const escapeHtml = require("../escapeHtml");
const { batchDeleteControls, batchDeleteScript } = require("./batchDelete");

module.exports = (bookings) => layout(

"預約管理",

`

<h1>預約管理</h1>

<br>

<a href="/cms/bookings/new"><button type="button">新增預約</button></a>

<br><br>

${bookings.length === 0 ? "<p>尚無預約</p>" : `

${batchDeleteControls("booking-select-checkbox", "預約")}

<table style="width:100%;border-collapse:collapse;">

    <thead>
        <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;"></th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">日期</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">時間</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">服務</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">人員</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">客戶</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">狀態</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">操作</th>
        </tr>
    </thead>

    <tbody>

        ${bookings.map(booking => `

            <tr>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    <input type="checkbox" class="booking-select-checkbox" value="${booking.id}">
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${booking.date}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${booking.startTime} - ${booking.endTime}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${booking.serviceName}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${booking.staffName}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">
                    ${escapeHtml(booking.customerName)}<br>
                    <span style="font-size:12px;color:#888;">${escapeHtml(booking.customerEmail)} ${escapeHtml(booking.customerPhone)}</span>
                </td>

                <td style="padding:8px;border-bottom:1px solid #eee;">${booking.status === "confirmed" ? "已確認" : "已取消"}</td>

                <td style="padding:8px;border-bottom:1px solid #eee;">

                    ${booking.status === "confirmed" ? `

                        <button type="button" class="reschedule-btn" data-booking-id="${booking.id}" data-date="${booking.date}">改期</button>

                        <form method="POST" action="/cms/bookings/${booking.id}/cancel" style="display:inline;" onsubmit="return confirm('確定要取消這筆預約嗎？');">
                            <button type="submit">取消預約</button>
                        </form>

                        <div class="reschedule-form" data-booking-id="${booking.id}" style="display:none;margin-top:8px;">
                            <input type="date" class="reschedule-date">
                            <select class="reschedule-time"><option value="">請先選日期</option></select>
                            <button type="button" class="reschedule-confirm-btn" data-booking-id="${booking.id}" data-service-id="${booking.serviceId}" data-staff-id="${booking.staffId}">確認改期</button>
                            <p class="reschedule-status" style="font-size:12px;color:#888;"></p>
                        </div>

                    ` : `
                        <form method="POST" action="/cms/bookings/${booking.id}/delete" onsubmit="return confirm('確定要刪除這筆預約紀錄嗎？此動作無法復原。');">
                            <button type="submit">刪除</button>
                        </form>
                    `}

                </td>

            </tr>

        `).join("")}

    </tbody>

</table>

<script>${batchDeleteScript("booking-select-checkbox", "/cms/bookings/delete-many", "預約")}</script>

<script>
(function () {

    document.querySelectorAll(".reschedule-btn").forEach(function (btn) {

        btn.addEventListener("click", function () {

            var id = btn.getAttribute("data-booking-id");
            var form = document.querySelector('.reschedule-form[data-booking-id="' + id + '"]');
            form.style.display = form.style.display === "none" ? "block" : "none";

        });

    });

    document.querySelectorAll(".reschedule-date").forEach(function (dateInput) {

        var today = new Date().toISOString().slice(0, 10);
        dateInput.min = today;

        dateInput.addEventListener("change", function () {

            var wrap = dateInput.closest(".reschedule-form");
            var bookingId = wrap.getAttribute("data-booking-id");
            var confirmBtn = wrap.querySelector(".reschedule-confirm-btn");
            var timeSelect = wrap.querySelector(".reschedule-time");
            var serviceId = confirmBtn.getAttribute("data-service-id");
            var staffId = confirmBtn.getAttribute("data-staff-id");

            timeSelect.innerHTML = "<option value=''>載入中...</option>";

            var url = "/booking/availability?serviceId=" + encodeURIComponent(serviceId)
                + "&staffId=" + encodeURIComponent(staffId)
                + "&date=" + encodeURIComponent(dateInput.value);

            fetch(url)
                .then(function (res) { return res.json(); })
                .then(function (slots) {

                    if (!slots.length) {
                        timeSelect.innerHTML = "<option value=''>這天沒有可預約時段</option>";
                        return;
                    }

                    timeSelect.innerHTML = slots.map(function (slot) {
                        return "<option value='" + slot.startTime + "'>" + slot.startTime + "</option>";
                    }).join("");

                })
                .catch(function () {
                    timeSelect.innerHTML = "<option value=''>載入失敗</option>";
                });

        });

    });

    document.querySelectorAll(".reschedule-confirm-btn").forEach(function (btn) {

        btn.addEventListener("click", function () {

            var bookingId = btn.getAttribute("data-booking-id");
            var wrap = btn.closest(".reschedule-form");
            var dateInput = wrap.querySelector(".reschedule-date");
            var timeSelect = wrap.querySelector(".reschedule-time");
            var statusEl = wrap.querySelector(".reschedule-status");

            if (!dateInput.value || !timeSelect.value) {
                statusEl.textContent = "請選擇日期與時段";
                return;
            }

            statusEl.textContent = "更新中...";

            fetch("/cms/bookings/" + bookingId + "/reschedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: dateInput.value, startTime: timeSelect.value })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data.success) {
                        statusEl.textContent = data.message || "改期失敗";
                        return;
                    }

                    window.location.reload();

                })
                .catch(function () {
                    statusEl.textContent = "改期失敗，請稍後再試";
                });

        });

    });

})();
</script>

`}

`

);
