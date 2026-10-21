const layout = require("./layout");

// CMS 後台手動新增預約（例如客人電話/現場預約），跟前台 /booking 共用同一套「選服務→人員→日期時段→聯絡資訊」流程與可用時段查詢 API
module.exports = (services, staff) => layout(

"新增預約",

`

<h1>新增預約</h1>

<br>

${services.length === 0 || staff.length === 0 ? `

<p>請先新增至少一個「服務項目」與一位「預約人員」（皆需啟用），才能建立預約。</p>

` : `

<div id="step-service">

    <h3>1. 選擇服務</h3>

    <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${services.map(service => `
            <button type="button" class="booking-option" data-id="${service.id}" style="padding:10px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff;">
                <strong>${service.name}</strong><br>
                <span style="font-size:12px;color:#888;">${service.duration} 分鐘${service.price ? ` · ${service.price}` : ""}</span>
            </button>
        `).join("")}
    </div>

</div>

<br>

<div id="step-staff" style="display:none;">

    <h3>2. 選擇人員</h3>

    <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${staff.map(member => `
            <button type="button" class="staff-option" data-id="${member.id}" style="padding:10px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff;">
                ${member.name}
            </button>
        `).join("")}
    </div>

</div>

<br>

<div id="step-datetime" style="display:none;">

    <h3>3. 選擇日期與時間</h3>

    <input type="date" id="booking-date">

    <div id="booking-slots" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;"></div>

</div>

<br>

<div id="step-contact" style="display:none;max-width:420px;">

    <h3>4. 客戶資訊</h3>

    <label>姓名</label>
    <br>
    <input type="text" id="customer-name" style="width:100%;padding:10px;" required>

    <br><br>

    <label>Email</label>
    <br>
    <input type="email" id="customer-email" style="width:100%;padding:10px;" required>

    <br><br>

    <label>電話（選填）</label>
    <br>
    <input type="text" id="customer-phone" style="width:100%;padding:10px;">

    <br><br>

    <label>備註（選填）</label>
    <br>
    <textarea id="customer-note" rows="3" style="width:100%;padding:10px;"></textarea>

    <br><br>

    <p id="booking-error" style="color:#c0392b;"></p>

    <button type="button" id="submit-booking-btn">確認新增預約</button>

</div>

<script>
(function () {

    var selected = { serviceId: null, staffId: null, date: null, startTime: null };

    var stepStaff = document.getElementById("step-staff");
    var stepDatetime = document.getElementById("step-datetime");
    var stepContact = document.getElementById("step-contact");

    var dateInput = document.getElementById("booking-date");
    var slotsContainer = document.getElementById("booking-slots");

    var today = new Date().toISOString().slice(0, 10);
    dateInput.min = today;

    function highlight(selector, target) {
        document.querySelectorAll(selector).forEach(function (el) {
            el.style.borderColor = "#ccc";
            el.style.background = "#fff";
        });
        target.style.borderColor = "#2271b1";
        target.style.background = "#eaf3fb";
    }

    document.querySelectorAll(".booking-option").forEach(function (btn) {
        btn.addEventListener("click", function () {
            selected.serviceId = btn.getAttribute("data-id");
            highlight(".booking-option", btn);
            stepStaff.style.display = "";
        });
    });

    document.querySelectorAll(".staff-option").forEach(function (btn) {
        btn.addEventListener("click", function () {
            selected.staffId = btn.getAttribute("data-id");
            highlight(".staff-option", btn);
            stepDatetime.style.display = "";
            slotsContainer.innerHTML = "";
            if (dateInput.value) {
                loadSlots();
            }
        });
    });

    function loadSlots() {

        selected.date = dateInput.value;
        slotsContainer.innerHTML = "<p>載入中...</p>";
        stepContact.style.display = "none";

        var url = "/booking/availability?serviceId=" + encodeURIComponent(selected.serviceId)
            + "&staffId=" + encodeURIComponent(selected.staffId)
            + "&date=" + encodeURIComponent(selected.date);

        fetch(url)
            .then(function (res) { return res.json(); })
            .then(function (slots) {

                if (!slots.length) {
                    slotsContainer.innerHTML = "<p>這天沒有可預約的時段</p>";
                    return;
                }

                slotsContainer.innerHTML = "";

                slots.forEach(function (slot) {

                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "slot-option";
                    btn.textContent = slot.startTime;
                    btn.style.cssText = "padding:8px 14px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff;";

                    btn.addEventListener("click", function () {
                        selected.startTime = slot.startTime;
                        highlight(".slot-option", btn);
                        stepContact.style.display = "";
                    });

                    slotsContainer.appendChild(btn);

                });

            })
            .catch(function () {
                slotsContainer.innerHTML = "<p>載入失敗，請重新選擇日期</p>";
            });

    }

    dateInput.addEventListener("change", loadSlots);

    document.getElementById("submit-booking-btn").addEventListener("click", function () {

        var errorEl = document.getElementById("booking-error");
        errorEl.textContent = "";

        var name = document.getElementById("customer-name").value.trim();
        var email = document.getElementById("customer-email").value.trim();

        if (!name || !email) {
            errorEl.textContent = "請填寫姓名與 Email";
            return;
        }

        fetch("/cms/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                serviceId: selected.serviceId,
                staffId: selected.staffId,
                date: selected.date,
                startTime: selected.startTime,
                customerName: name,
                customerEmail: email,
                customerPhone: document.getElementById("customer-phone").value.trim(),
                note: document.getElementById("customer-note").value.trim()
            })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data.success) {
                    errorEl.textContent = data.message || "新增失敗，請重新選擇時段";
                    loadSlots();
                    return;
                }

                window.location.href = "/cms/bookings";

            })
            .catch(function () {
                errorEl.textContent = "新增失敗，請稍後再試";
            });

    });

})();
</script>

`}

`

);
