const { ASSET_VERSION } = require("../../config/version");
const { batchDeleteControls, batchDeleteScript } = require("./batchDelete");
const { dragReorderScript } = require("./dragReorder");
const { describeStatus } = require("../../services/publishHelper");

// 分類清單型自訂頁面的後台管理面板：分類管理（比照 views/cms/projects.js 內嵌的分類面板）
// ＋項目清單（比照同一個檔案的作品列表），差別只在於網址都掛在 /cms/custom-pages/:pageId/... 底下
function renderCollectionSection(pageId, categories, items, activeCategoryId = "") {

    const basePath = `/cms/custom-pages/${pageId}`;

    // 只開放一層子分類：頂層分類先列出來，子分類緊接著排在自己的上層分類底下（縮排顯示）
    const topLevelCategories = categories.filter(cat => !cat.parentCategoryId);
    const orderedCategories = topLevelCategories.flatMap(top => [
        top,
        ...categories.filter(cat => cat.parentCategoryId === top.id)
    ]);

    // 項目清單依分類分組：不同分類的作品不混在一起排，順序編號、拖拉、輸入數字移動都只在同一個分類裡
    // （前台每個分類標籤各自顯示，順序也是各自的）。沒有分類或分類已刪除的放最後「未分類」
    const knownIds = new Set(orderedCategories.map(cat => cat.id));
    const itemGroups = [
        ...orderedCategories.map(cat => ({
            id: cat.id,
            label: cat.parentCategoryId ? `└ ${cat.label}` : cat.label,
            items: items.filter(item => item.category === cat.id)
        })),
        { id: "", label: "未分類", items: items.filter(item => !knownIds.has(item.category)) }
    ].filter(group => group.items.length > 0);
    const showGroupHeaders = categories.length > 0 && !activeCategoryId;

    return `
    <h2>分類與項目</h2>

    <details style="margin:12px 0;border:1px solid #ddd;border-radius:8px;padding:10px 14px;" ${categories.length === 0 ? "open" : ""}>

        <summary style="cursor:pointer;font-weight:bold;">分類管理（${categories.length} 個分類，點展開新增/編輯/排序）</summary>

        <div style="margin-top:12px;">

            ${categories.length === 0 ? "<p style=\"color:#888;\">尚未新增任何分類</p>" : `
            <table style="width:100%;border-collapse:collapse;max-width:600px;" data-drag-reorder="${basePath}/categories/reorder">
                <tbody>
                    ${orderedCategories.map((category) => {

                        // 拖拉只能在同一組（同樣的上層分類）裡進行，group 不同的話 dragReorder.js 不會拿來當排序對象
                        const dragGroup = category.parentCategoryId ? `child:${category.parentCategoryId}` : "root";

                        return `
                        <tr data-drag-id="${category.id}" data-drag-group="${dragGroup}">
                            <td style="padding:6px 8px;border-bottom:1px solid #eee;width:1%;">
                                <span class="drag-handle" title="拖拉排序（只能在同一層內排序）">⠿</span>
                            </td>
                            <td style="padding:6px 8px;border-bottom:1px solid #eee;${category.parentCategoryId ? "padding-left:28px;color:#666;" : ""}">
                                ${category.parentCategoryId ? "└ " : ""}
                                ${category.coverImage ? `<img src="${category.coverImage.url}" alt="" style="width:56px;height:40px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:8px;">` : ""}
                                ${category.label}
                            </td>
                            <td style="padding:6px 8px;border-bottom:1px solid #eee;">
                                <a href="${basePath}/categories/${category.id}/edit">編輯</a>
                                &nbsp;
                                <form method="POST" action="${basePath}/categories/${category.id}/delete" style="display:inline;" onsubmit="return confirm('確定要刪除這個分類嗎？已經套用這個分類的項目不會被刪除，只是不再屬於任何分類；底下的子分類也不會被刪除，會變回頂層分類。');">
                                    <button type="submit">刪除</button>
                                </form>
                            </td>
                        </tr>
                        `;

                    }).join("")}
                </tbody>
            </table>
            `}

            <form method="POST" action="${basePath}/categories" enctype="multipart/form-data" style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input type="text" name="label" placeholder="新分類名稱" style="padding:8px;flex:1;max-width:240px;" required>
                ${topLevelCategories.length > 0 ? `
                <select name="parentCategoryId" style="padding:8px;">
                    <option value="">（頂層分類）</option>
                    ${topLevelCategories.map(cat => `<option value="${cat.id}">子分類：${cat.label}</option>`).join("")}
                </select>
                ` : ""}
                <label style="font-size:13px;color:#666;">封面照<input type="file" name="coverImage" id="new-category-cover-input" accept="image/*" style="display:block;"></label>
                <button type="button" id="new-category-cover-media-btn">從媒體庫選擇</button>
                <input type="hidden" name="coverImageMediaUrl" id="new-category-cover-media-url-field">
                <button type="submit">新增分類</button>
            </form>

            <p id="new-category-cover-media-status" style="font-size:12px;color:#888;"></p>

            <script>
            (function () {

                var mediaBtn = document.getElementById("new-category-cover-media-btn");
                var mediaUrlField = document.getElementById("new-category-cover-media-url-field");
                var fileInput = document.getElementById("new-category-cover-input");
                var status = document.getElementById("new-category-cover-media-status");

                mediaBtn.addEventListener("click", function () {

                    window.openMediaPicker({
                        multiple: false,
                        onSelect: function (files) {

                            mediaUrlField.value = files[0].url;
                            fileInput.value = "";
                            status.textContent = "已選擇媒體庫圖片：" + files[0].name;

                        }
                    });

                });

            })();
            </script>

        </div>

    </details>

    ${categories.length > 0 ? `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">
        <a href="${basePath}/edit"><button type="button" ${!activeCategoryId ? 'style="font-weight:bold;"' : ""}>全部</button></a>
        ${categories.map(cat => `<a href="${basePath}/edit?category=${cat.id}"><button type="button" ${activeCategoryId === cat.id ? 'style="font-weight:bold;"' : ""}>${cat.label}</button></a>`).join("")}
    </div>
    ` : ""}

    <a href="${basePath}/items/new${activeCategoryId ? `?category=${activeCategoryId}` : ""}"><button type="button">＋ 新增項目${activeCategoryId ? "（自動歸類到目前分類）" : ""}</button></a>
    <div class="album-to-items" data-endpoint="${basePath}/items/from-albums" data-category="${activeCategoryId || ""}" data-category-label="${(categories.find(cat => cat.id === activeCategoryId) || {}).label || ""}">
        <label class="album-to-items-upload">
            📤 上傳相簿${activeCategoryId ? `到「${(categories.find(cat => cat.id === activeCategoryId) || {}).label || ""}」` : ""}（選電腦裡的資料夾，可一次多個）
            <input type="file" class="album-to-items-input" webkitdirectory directory multiple hidden>
        </label>
        <button type="button" class="album-to-items-pick">📁 從媒體庫資料夾建立作品</button>
        <p class="album-to-items-status"></p>
        <p class="album-to-items-hint">每個資料夾自動建立一個作品：標題＝資料夾名稱、封面＝檔名是「封面」的那張（沒有就用第一張）、相簿＝資料夾裡全部照片。${activeCategoryId ? "" : "<b>請先點上方的分類標籤</b>，作品才會放進那個分類。"}</p>
    </div>
    <script src="/js/albumToItems.js?v=${ASSET_VERSION}"></script>

    <div class="trash-panel" data-collections="pageItems,pageCategories" data-page-id="${pageId}"></div>

    <br><br>

    ${items.length === 0 ? "<p>尚未新增任何項目</p>" : `

    ${batchDeleteControls("collection-item-select-checkbox", "項目")}

    <table style="width:100%;border-collapse:collapse;" data-drag-reorder="${basePath}/items/reorder">

        <thead>
            <tr>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">順序</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;"></th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">圖片</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">標題</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">狀態</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">操作</th>
            </tr>
        </thead>

        <tbody>

            ${itemGroups.map(group => `

            ${showGroupHeaders ? `
                <tr class="item-group-row" data-group-toggle="${group.id}"><td colspan="6"><span class="item-group-arrow">▸</span> ${group.label}（${group.items.length}）</td></tr>
            ` : ""}

            ${group.items.map((item, index) => `

                <tr data-drag-id="${item.id}" data-drag-group="${group.id}"${showGroupHeaders ? " hidden" : ""}>

                    <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap;">
                        <span class="drag-handle" title="拖拉排序">⠿</span>
                        <input type="number" class="order-input" data-move-to min="1" max="${group.items.length}" value="${index + 1}" title="輸入數字直接移到這個分類裡的第幾個">
                    </td>

                    <td style="padding:8px;border-bottom:1px solid #eee;">
                        <input type="checkbox" class="collection-item-select-checkbox" value="${item.id}">
                    </td>

                    <td style="padding:8px;border-bottom:1px solid #eee;">

                        ${(() => {
                            const cover = (item.coverImage && item.coverImage.url) || (item.images && item.images[0] && item.images[0].url);
                            return cover ? `<img src="${cover}" alt="${item.title}" style="width:80px;height:80px;object-fit:cover;">` : "-";
                        })()}

                    </td>

                    <td style="padding:8px;border-bottom:1px solid #eee;">${item.title}</td>

                    <td style="padding:8px;border-bottom:1px solid #eee;">${describeStatus(item)}</td>

                    <td style="padding:8px;border-bottom:1px solid #eee;">

                        <a href="${basePath}/items/${item.id}/edit">編輯</a>

                        &nbsp;

                        <form method="POST" action="${basePath}/items/${item.id}/delete" style="display:inline;" onsubmit="return confirm('確定要刪除這個項目嗎？此動作無法復原。');">
                            <button type="submit">刪除</button>
                        </form>

                    </td>

                </tr>

            `).join("")}

            `).join("")}

        </tbody>

    </table>

    <script>${batchDeleteScript("collection-item-select-checkbox", `${basePath}/items/delete-many`, "項目")}</script>
    <script>${dragReorderScript()}</script>
    <script>
    // 分類分組預設收合，點分類標題展開／收合；展開過的分類記在這個分頁裡，刪除或存檔後畫面重畫還是展開的
    (function () {
        var key = "cms-open-groups:${pageId}";
        var open = [];
        try { open = JSON.parse(sessionStorage.getItem(key) || "[]"); } catch (e) {}
        document.querySelectorAll("[data-group-toggle]").forEach(function (header) {
            var id = header.getAttribute("data-group-toggle");
            var rows = document.querySelectorAll('tr[data-drag-group="' + id + '"]');
            function set(isOpen) {
                rows.forEach(function (row) { row.hidden = !isOpen; });
                header.classList.toggle("is-open", isOpen);
            }
            set(open.indexOf(id) !== -1);
            header.addEventListener("click", function () {
                var isOpen = !header.classList.contains("is-open");
                set(isOpen);
                open = open.filter(function (g) { return g !== id; });
                if (isOpen) open.push(id);
                try { sessionStorage.setItem(key, JSON.stringify(open)); } catch (e) {}
            });
        });
    })();
    </script>

    `}
    `;

}

module.exports = { renderCollectionSection };
