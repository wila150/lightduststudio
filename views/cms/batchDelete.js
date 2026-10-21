// 共用的批次刪除 UI：全選 checkbox + 刪除選取按鈕 + 送出隱藏表單
// checkboxClass 對應每一列的勾選框 class，deleteUrl 是批次刪除的 API 路徑
function batchDeleteControls(checkboxClass, label = "項目") {
    return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <label><input type="checkbox" class="batch-select-all" data-target="${checkboxClass}"> 全選</label>
        <button type="button" class="batch-delete-btn" data-target="${checkboxClass}" disabled>刪除選取的${label}</button>
        <span class="batch-selected-count" data-target="${checkboxClass}" style="font-size:12px;color:#888;"></span>
    </div>
    `;
}

function batchDeleteScript(checkboxClass, deleteUrl, label = "項目") {
    return `
    (function () {

        var checkboxClass = ${JSON.stringify(checkboxClass)};
        var deleteUrl = ${JSON.stringify(deleteUrl)};
        var selectAll = document.querySelector('.batch-select-all[data-target="' + checkboxClass + '"]');
        var deleteBtn = document.querySelector('.batch-delete-btn[data-target="' + checkboxClass + '"]');
        var countLabel = document.querySelector('.batch-selected-count[data-target="' + checkboxClass + '"]');
        var checkboxes = document.querySelectorAll("." + checkboxClass);

        if (!selectAll || checkboxes.length === 0) {
            return;
        }

        function updateState() {
            var checked = document.querySelectorAll("." + checkboxClass + ":checked");
            deleteBtn.disabled = checked.length === 0;
            countLabel.textContent = checked.length > 0 ? ("已選取 " + checked.length + " 個${label}") : "";
        }

        checkboxes.forEach(function (checkbox) {
            checkbox.addEventListener("change", updateState);
        });

        selectAll.addEventListener("change", function () {
            checkboxes.forEach(function (checkbox) {
                checkbox.checked = selectAll.checked;
            });
            updateState();
        });

        deleteBtn.addEventListener("click", function () {

            var ids = Array.from(document.querySelectorAll("." + checkboxClass + ":checked")).map(function (checkbox) {
                return checkbox.value;
            });

            if (ids.length === 0) {
                return;
            }

            if (!window.confirm("確定要刪除選取的 " + ids.length + " 個${label}嗎？此動作無法復原。")) {
                return;
            }

            var form = document.createElement("form");
            form.method = "POST";
            form.action = deleteUrl;

            ids.forEach(function (id) {
                var field = document.createElement("input");
                field.type = "hidden";
                field.name = "ids";
                field.value = id;
                form.appendChild(field);
            });

            document.body.appendChild(form);
            // form.requestSubmit()（不是 form.submit()）才會真的觸發 "submit" 事件，
            // 讓 cms.js 那支「存檔不重整頁面」的共用攔截邏輯也抓得到這個動態建立的表單
            form.requestSubmit();

        });

    })();
    `;
}

module.exports = { batchDeleteControls, batchDeleteScript };
