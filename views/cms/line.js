const layout = require("./layout");
const escapeHtml = require("../escapeHtml");
const { ASSET_VERSION } = require("../../config/version");
const { TOKENS, RICH_MENU_LAYOUTS } = require("../../services/lineBotService");

// 給前端 JS 的資料用 JSON 塞進頁面；< 換掉避免 </script> 提早結束
function jsonForScript(value) {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}

function quotaText(quota) {
    if (!quota || quota.error) return "";
    const parts = [];
    if (quota.followers != null) parts.push(`好友 ${quota.followers} 人`);
    if (quota.type === "limited") parts.push(`本月推播已用 ${quota.used} / ${quota.limit} 則`);
    else if (quota.used != null) parts.push(`本月推播已用 ${quota.used} 則`);
    return parts.join("・");
}

module.exports = (config, { quota, defaultRichMenuId }, user) => {

const layouts = Object.entries(RICH_MENU_LAYOUTS).map(([key, value]) => ({ key, label: value.label, height: value.height, cells: value.cells }));
const richMenuLive = config.richMenu.richMenuId && config.richMenu.richMenuId === defaultRichMenuId;

return layout(

"LINE 官方帳號",

`

<style>
.line-admin { max-width: 980px; }
.line-card { border: 1px solid #e3e3e3; border-radius: 10px; background: #fff; padding: 18px 20px; margin-bottom: 22px; }
.line-card h2 { margin: 0 0 6px; font-size: 20px; }
.line-card .hint { color: #888; font-size: 13px; margin: 4px 0 14px; line-height: 1.7; }
.line-label { font-weight: 700; margin: 16px 0 8px; display: block; }
.token-editor { min-height: 70px; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; line-height: 2; white-space: pre-wrap; word-break: break-word; outline: none; background: #fff; }
.token-editor:focus { border-color: #6aa06a; box-shadow: 0 0 0 3px rgba(106,160,106,.15); }
.token-chip { display: inline-flex; align-items: center; gap: 4px; background: #6abf69; color: #fff; border-radius: 999px; padding: 0 6px 0 12px; margin: 0 2px; line-height: 1.8; font-size: 14px; user-select: none; }
.token-chip button { border: 0; background: none; color: #fff; cursor: pointer; font-size: 15px; padding: 0 4px; line-height: 1; }
.token-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; position: relative; }
.token-buttons button { border: 1.5px solid #333; background: #fff; border-radius: 999px; padding: 4px 14px; cursor: pointer; font-size: 13px; }
.token-buttons button:hover { background: #f3f3f3; }
.emoji-pop { position: absolute; top: 36px; left: 0; z-index: 5; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 8px; display: grid; grid-template-columns: repeat(10, 30px); gap: 2px; box-shadow: 0 6px 20px rgba(0,0,0,.12); }
.emoji-pop span { cursor: pointer; font-size: 20px; text-align: center; border-radius: 4px; }
.emoji-pop span:hover { background: #f0f0f0; }
.kw-rule { border: 1px solid #e6e6e6; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: #fcfcfb; }
.kw-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.kw-head input[type=text] { flex: 1; min-width: 200px; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; }
.kw-head select { padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
.danger-btn { border: 1px solid #e3a59a; color: #c0533f; background: #fff; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
.save-row { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
.status { font-size: 13px; color: #888; }
.status.ok { color: #2f7a3f; } .status.err { color: #c0533f; }
.rm-wrap { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
@media (max-width: 760px) { .rm-wrap { grid-template-columns: 1fr; } }
.rm-preview { position: relative; width: 100%; background: #eee center/cover no-repeat; border-radius: 6px; overflow: hidden; }
.rm-cell { position: absolute; border: 2px dashed rgba(255,255,255,.85); box-shadow: inset 0 0 0 1px rgba(0,0,0,.25); display: flex; align-items: flex-start; justify-content: flex-start; }
.rm-cell span { background: #6abf69; color: #fff; font-weight: 700; font-size: 12px; border-radius: 0 0 6px 0; padding: 2px 8px; }
.rm-area { display: grid; grid-template-columns: 28px 1fr 110px; gap: 6px; align-items: center; margin-bottom: 8px; }
.rm-area .num { background: #6abf69; color: #fff; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; }
.rm-area input, .rm-area select { padding: 7px 8px; border: 1px solid #ddd; border-radius: 6px; width: 100%; box-sizing: border-box; }
.rm-area .value { grid-column: 2 / 4; }
.bc-wrap { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px; }
@media (max-width: 760px) { .bc-wrap { grid-template-columns: 1fr; } }
.phone { background: #8cabd9; border-radius: 14px; padding: 14px 12px; min-height: 260px; }
.phone img { width: 100%; border-radius: 14px; display: block; }
.phone .bubble { background: #fff; border-radius: 14px; padding: 8px 12px; margin-top: 8px; white-space: pre-wrap; font-size: 13px; }
.phone .empty { color: #fff; text-align: center; padding-top: 90px; font-size: 13px; }
.field { margin-bottom: 12px; }
.field label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.field input[type=text], .field select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
.badge-live { display: inline-block; background: #e7f4e7; color: #2f7a3f; border-radius: 999px; padding: 2px 10px; font-size: 12px; margin-left: 8px; }
.badge-off { display: inline-block; background: #fbeee9; color: #b5533f; border-radius: 999px; padding: 2px 10px; font-size: 12px; margin-left: 8px; }
</style>

<div class="line-admin">

<h1>LINE 官方帳號</h1>

<p style="color:#777;">
    設定加好友歡迎詞、關鍵字自動回覆、圖文選單和推播。客人傳來的訊息一樣會出現在「留言」。
    ${quotaText(quota) ? `<br><strong>${escapeHtml(quotaText(quota))}</strong>` : ""}
    ${quota && quota.error ? `<br><span style="color:#b5533f;">${escapeHtml(quota.error)}</span>` : ""}
</p>

<section class="line-card" id="replies">

    <h2>訊息與關鍵字</h2>
    <p class="hint">
        客人在聊天室輸入關鍵字時自動回覆（回覆不算推播額度）。點文字框裡要插入的位置，再按下方的欄位按鈕；
        綠色小框按 × 可移除，送出時會換成實際內容，沒填資料的那一行會自動隱藏。
    </p>

    <label class="line-label">
        <input type="checkbox" id="welcome-enabled" ${config.welcome.enabled ? "checked" : ""}> 加好友歡迎詞
    </label>
    <div class="token-editor" contenteditable="true" id="welcome-text"></div>

    <label class="line-label">關鍵字回覆</label>
    <div id="kw-list"></div>
    <button type="button" id="kw-add" class="ghost-btn">＋ 新增關鍵字</button>

    <div class="save-row">
        <button type="button" id="replies-save">儲存訊息與關鍵字</button>
        <span class="status" id="replies-status"></span>
    </div>

</section>

<section class="line-card" id="inquiry">

    <h2>預約諮詢問答</h2>
    <p class="hint">
        客人點選單的「預約諮詢」或輸入觸發詞，官方帳號會在聊天室一題一題問：服務 → 日期 → 電話 → 需求，客人點按鈕回答就好。
        問完會整理成一筆存進「留言」並推播通知你，你可以直接在 LINE 聊天室回覆客人。客人隨時輸入「取消」可以中止。
    </p>

    <label class="line-label"><input type="checkbox" id="inq-enabled" ${config.inquiry.enabled ? "checked" : ""}> 啟用</label>

    <div class="field">
        <label>觸發詞（完全符合，多個用「、」分隔）</label>
        <input type="text" id="inq-triggers" value="${escapeHtml((config.inquiry.triggers || []).join("、"))}">
    </div>
    <div class="field">
        <label>服務選項（會變成按鈕，最多 12 個，用「、」分隔）</label>
        <input type="text" id="inq-services" value="${escapeHtml((config.inquiry.services || []).join("、"))}">
    </div>

    <label class="line-label">第 1 題：問服務</label>
    <div class="token-editor" contenteditable="true" id="inq-askService"></div>
    <label class="line-label">第 2 題：問日期 <span style="font-weight:400;color:#888;font-size:12px;">（下方會有「選擇日期」「還不確定」按鈕）</span></label>
    <div class="token-editor" contenteditable="true" id="inq-askDate"></div>
    <label class="line-label">第 3 題：問電話</label>
    <div class="token-editor" contenteditable="true" id="inq-askPhone"></div>
    <label class="line-label">第 4 題：問需求 <span style="font-weight:400;color:#888;font-size:12px;">（下方會有「略過」按鈕）</span></label>
    <div class="token-editor" contenteditable="true" id="inq-askNote"></div>
    <label class="line-label">完成訊息 <span style="font-weight:400;color:#888;font-size:12px;">（{摘要} 會換成客人填的服務、日期、電話、需求）</span></label>
    <div class="token-editor" contenteditable="true" id="inq-done"></div>

    <div class="save-row">
        <button type="button" class="replies-save-alt">儲存</button>
        <span class="status" id="inq-status"></span>
    </div>

</section>

<section class="line-card" id="rich-menu">

    <h2>圖文選單
        ${richMenuLive ? `<span class="badge-live">使用中</span>` : (config.richMenu.richMenuId ? `<span class="badge-off">目前 LINE 上不是這個選單</span>` : "")}
    </h2>
    <p class="hint">
        聊天室下方的大圖選單。選版型 → 上傳圖片（會自動裁成 LINE 規定的 2500 寬尺寸）→ 設定每一格點了要做什麼。<br>
        「送出文字」＝客人點了就像自己打了那段文字，可以搭配上面的關鍵字自動回覆，例如格子送出「預約」，關鍵字「預約」就回預約連結。
    </p>

    <div class="rm-wrap">
        <div>
            <div class="field">
                <label>版型</label>
                <select id="rm-layout"></select>
            </div>
            <div class="field">
                <label>圖片 <span style="font-weight:400;color:#888;font-size:12px;">（大：2500×1686，小：2500×843；其他尺寸會自動置中裁切）</span></label>
                <input type="file" id="rm-image" accept="image/*">
            </div>
            <div class="rm-preview" id="rm-preview"></div>
            <div class="field" style="margin-top:12px;">
                <label>選單列文字 <span style="font-weight:400;color:#888;font-size:12px;">（聊天室底部那一條，最多 14 字）</span></label>
                <input type="text" id="rm-chatbar" maxlength="14" value="${escapeHtml(config.richMenu.chatBarText || "選單")}">
            </div>
        </div>
        <div>
            <label class="line-label" style="margin-top:0;">每一格的動作</label>
            <div id="rm-areas"></div>
        </div>
    </div>

    <div class="save-row">
        <button type="button" id="rm-publish">發佈到 LINE</button>
        <span class="status" id="rm-status"></span>
    </div>

</section>

<section class="line-card" id="broadcast">

    <h2>推播廣告</h2>
    <p class="hint">
        設計一張圖（例如優惠海報）推播給所有好友。客人點圖片可以「送出文字」（例如「模特卡方案」，再用關鍵字自動回覆詳細內容）或開網址。<br>
        推播會用掉每月訊息額度，正式推播前先按「傳給自己測試」看看（測試對象＝網站設定裡的接收通知 LINE User ID）。
    </p>

    <div class="bc-wrap">
        <div>
            <div class="phone" id="bc-phone"></div>
        </div>
        <div>
            <div class="field">
                <label>推播圖片</label>
                <input type="file" id="bc-image" accept="image/*">
                <span class="status" id="bc-image-status"></span>
            </div>
            <div class="field">
                <label>點圖片時</label>
                <select id="bc-tap">
                    <option value="message">送出文字（觸發關鍵字回覆）</option>
                    <option value="uri">開啟網址</option>
                    <option value="none">不動作</option>
                </select>
            </div>
            <div class="field" id="bc-value-field">
                <label id="bc-value-label">送出的文字</label>
                <input type="text" id="bc-value" value="${escapeHtml(config.broadcast.actionValue || "")}">
            </div>
            <div class="field">
                <label>通知預覽文字 <span style="font-weight:400;color:#888;font-size:12px;">（手機通知、聊天列表看到的那一行）</span></label>
                <input type="text" id="bc-alt" maxlength="400" value="${escapeHtml(config.broadcast.altText || "")}" placeholder="例如：限時優惠！模特卡拍攝 $1980">
            </div>
            <label class="line-label">附加文字訊息（選填，圖片下面再多一則文字）</label>
            <div class="token-editor" contenteditable="true" id="bc-text"></div>
        </div>
    </div>

    <div class="save-row">
        <button type="button" data-bc="save" class="ghost-btn">儲存草稿</button>
        <button type="button" data-bc="test" class="ghost-btn">傳給自己測試</button>
        <button type="button" data-bc="send">推播給所有好友</button>
        <span class="status" id="bc-status"></span>
    </div>

</section>

</div>

<script type="application/json" id="line-data">${jsonForScript({ config, tokens: TOKENS, layouts })}</script>
<script src="/js/lineAdmin.js?v=${ASSET_VERSION}"></script>

`,

user

);

};
