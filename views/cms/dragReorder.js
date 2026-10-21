// 共用的拖拉排序：容器標 data-drag-reorder="POST 端點網址"，每個可拖拉的項目標 data-drag-id="這筆資料的 id"，
// 項目裡面要有一個 class="drag-handle" 的元素當拖拉把手。放開滑鼠/手指後把目前畫面上的新順序 POST 過去。
// 用 Pointer Events（不分滑鼠/觸控裝置都適用），拖拉過程只在瀏覽器裡搬動 DOM，不會整頁重新整理。
function dragReorderScript() {
    return `
    (function () {

        document.querySelectorAll("[data-drag-reorder]").forEach(function (container) {

            // 同一頁可能載入多份這段 script（例如相簿照片＋內容模組），同一個容器只綁一次
            if (container.hasAttribute("data-drag-ready")) {
                return;
            }
            container.setAttribute("data-drag-ready", "");

            var endpoint = container.getAttribute("data-drag-reorder");
            // data-drag-axis="grid"：項目是多欄換行排列（例如相簿照片縮圖），拖拉時要同時看左右位置
            var isGrid = container.getAttribute("data-drag-axis") === "grid";
            var list = container.tagName === "TABLE" ? container.querySelector("tbody") : container;

            if (!list) {
                return;
            }

            function getItems() {
                return Array.from(list.children).filter(function (el) {
                    return el.hasAttribute("data-drag-id");
                });
            }

            function submitOrder(dragEl) {

                var group = dragEl.getAttribute("data-drag-group") || "";
                // 項目裡有 data-order-number（例如相簿照片的順序編號）就跟著新順序重新編號
                getItems().forEach(function (el, i) {
                    var number = el.querySelector("[data-order-number]");
                    if (number) {
                        number.textContent = i + 1;
                    }
                });

                var ids = getItems()
                    .filter(function (el) { return (el.getAttribute("data-drag-group") || "") === group; })
                    .map(function (el) { return el.getAttribute("data-drag-id"); });

                fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: ids })
                }).then(function (res) {
                    if (!res.ok) {
                        throw new Error("reorder failed");
                    }
                }).catch(function () {
                    alert("排序儲存失敗，請重新整理頁面後再試一次");
                });

            }

            // 上/下移按鈕：跟拖拉是同一個排序端點，只是用點擊取代拖拉，項目一多或在觸控裝置上
            // 想精準移動一個位置時比拖拉好操作。按鈕是選配的（module-card 目前有加，其他清單沒有
            // 就不會出現，不影響既有頁面）
            container.querySelectorAll("[data-move]").forEach(function (btn) {

                btn.addEventListener("click", function () {

                    var item = btn.closest("[data-drag-id]");

                    if (!item) {
                        return;
                    }

                    var group = item.getAttribute("data-drag-group") || "";
                    var siblings = getItems().filter(function (el) {
                        return (el.getAttribute("data-drag-group") || "") === group;
                    });
                    var index = siblings.indexOf(item);
                    var direction = btn.getAttribute("data-move");

                    if (direction === "first" && index > 0) {
                        list.insertBefore(item, siblings[0]);
                        submitOrder(item);
                    } else if (direction === "up" && index > 0) {
                        list.insertBefore(item, siblings[index - 1]);
                        submitOrder(item);
                    } else if (direction === "down" && index < siblings.length - 1) {
                        list.insertBefore(siblings[index + 1], item);
                        submitOrder(item);
                    }

                });

            });

            getItems().forEach(function (item) {

                var handle = item.querySelector(".drag-handle");

                if (!handle) {
                    return;
                }

                handle.addEventListener("pointerdown", function (event) {

                    event.preventDefault();

                    var group = item.getAttribute("data-drag-group") || "";
                    item.classList.add("dragging");

                    function siblingAt(x, y) {

                        var siblings = getItems().filter(function (el) {
                            return el !== item && (el.getAttribute("data-drag-group") || "") === group;
                        });

                        for (var i = 0; i < siblings.length; i++) {
                            var rect = siblings[i].getBoundingClientRect();
                            // 方格：游標在這一列上方，或同一列且在這格中線左邊，就插到這格前面
                            var before = isGrid
                                ? y < rect.top || (y < rect.bottom && x < rect.left + rect.width / 2)
                                : y < rect.top + rect.height / 2;
                            if (before) {
                                return siblings[i];
                            }
                        }

                        return null;

                    }

                    function onMove(moveEvent) {

                        var target = siblingAt(moveEvent.clientX, moveEvent.clientY);

                        if (target) {
                            list.insertBefore(item, target);
                        } else {
                            list.appendChild(item);
                        }

                    }

                    function onUp() {

                        document.removeEventListener("pointermove", onMove);
                        document.removeEventListener("pointerup", onUp);
                        item.classList.remove("dragging");

                        submitOrder(item);

                    }

                    document.addEventListener("pointermove", onMove);
                    document.addEventListener("pointerup", onUp);

                });

            });

        });

    })();
    `;
}

module.exports = { dragReorderScript };
