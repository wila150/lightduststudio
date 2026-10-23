const { FEATURES } = require("../../services/featureService");
const layout = require("./layout");
const { THEMES, PROJECT_LIST_LAYOUTS } = require("../../services/settingsService");
const { cropWidgetAssets, cropWidgetHtml, cropWidgetScript } = require("./cropWidget");
const escapeHtml = require("../escapeHtml");
const { SITE_URL } = require("../../config/site");

module.exports = (settings, fonts = []) => layout(

"網站設定",

`

${cropWidgetAssets()}

<h1>網站設定</h1>

<br>

<label>導覽列 Logo（選填，設定後會取代文字站名）</label>

<br><br>

${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" style="max-width:220px;max-height:80px;display:block;margin-bottom:10px;">` : "<p style=\"color:#888;\">尚未設定 Logo，導覽列會顯示網站名稱文字</p>"}

<input type="file" id="logo-input" accept="image/*">

<button type="button" id="logo-media-btn">從媒體庫選擇</button>

<p id="logo-status" style="font-size:12px;color:#888;"></p>

${settings.logoUrl ? `
<form method="POST" action="/cms/settings/logo/delete" onsubmit="return confirm('確定要移除 Logo 嗎？導覽列會改回顯示網站名稱文字。');">
    <button type="submit">移除 Logo</button>
</form>
` : ""}

${cropWidgetHtml()}

<br>

<label>瀏覽器分頁圖示（favicon，選填，正方形圖片效果最佳）</label>

<br><br>

${settings.faviconUrl ? `<img src="${settings.faviconUrl}" alt="favicon" style="width:48px;height:48px;object-fit:cover;display:block;margin-bottom:10px;border-radius:6px;">` : "<p style=\"color:#888;\">尚未設定，會使用預設圖示</p>"}

<input type="file" id="favicon-input" accept="image/*">

<button type="button" id="favicon-media-btn">從媒體庫選擇</button>

<p id="favicon-status" style="font-size:12px;color:#888;"></p>

${settings.faviconUrl ? `
<form method="POST" action="/cms/settings/favicon/delete" onsubmit="return confirm('確定要移除自訂 favicon 嗎？會改回預設圖示。');">
    <button type="submit">移除 favicon</button>
</form>
` : ""}

<br>

<label>社群分享圖（選填，分享連結到 Facebook/LINE 等平台時顯示的預覽圖，建議 1200x630）</label>

<br><br>

${settings.ogImageUrl ? `<img src="${settings.ogImageUrl}" alt="社群分享圖" style="max-width:280px;display:block;margin-bottom:10px;border-radius:6px;">` : "<p style=\"color:#888;\">尚未設定</p>"}

<input type="file" id="og-image-input" accept="image/*">

<button type="button" id="og-image-media-btn">從媒體庫選擇</button>

<p id="og-image-status" style="font-size:12px;color:#888;"></p>

${settings.ogImageUrl ? `
<form method="POST" action="/cms/settings/og-image/delete" onsubmit="return confirm('確定要移除社群分享圖嗎？');">
    <button type="submit">移除分享圖</button>
</form>
` : ""}

<br>

<label>自訂字體庫（選填，上傳 .ttf / .otf / .woff / .woff2 字體檔，上傳後在下方「網站設定」裡的選單選用才會套用到前台）</label>

<br><br>

<input type="file" id="font-input" accept=".ttf,.otf,.woff,.woff2" multiple>
<input type="text" id="font-name-input" placeholder="字體顯示名稱（選填，一次選多個檔案時會被忽略、改用各自的檔名）" style="margin-left:8px;">

<p id="font-status" style="font-size:12px;color:#888;"></p>

${fonts.length > 0 ? `
<div style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;">
    ${fonts.map(font => `
    <div style="border:1px solid #ddd;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:13px;">${escapeHtml(font.name)}</span>
        <button
            type="button"
            class="delete-font-btn"
            data-font-id="${font.id}"
            style="font-size:12px;"
        >刪除</button>
    </div>
    `).join("")}
</div>
` : `<p style="color:#888;font-size:13px;">尚未上傳任何字體</p>`}

<br>

<form method="POST" action="/cms/settings">

    <fieldset class="feature-switches" style="border:1px solid #ddd;border-radius:10px;padding:16px 18px;margin:0 0 28px;">
        <legend style="font-weight:bold;padding:0 6px;">功能開關</legend>
        <p style="margin:0 0 12px;color:#777;font-size:13px;">關閉的功能會從後台選單、新增模組清單與前台隱藏，資料都會保留，重新打開就恢復。</p>
        ${FEATURES.map(f => `
        <label style="display:flex;gap:10px;align-items:flex-start;margin:0 0 10px;">
            <input type="checkbox" name="feature_${f.key}" ${(settings.features || {})[f.key] ? "checked" : ""} style="margin-top:4px;">
            <span><strong>${f.label}</strong><br><span style="color:#777;font-size:13px;">${f.description}</span></span>
        </label>`).join("")}
    </fieldset>

    <label>導覽列 Logo 高度（單位 px，預設 40，範圍 20-160）</label>

    <br>

    <input
        type="number"
        name="logoHeight"
        value="${settings.logoHeight || 40}"
        min="20"
        max="160"
        style="width:160px;padding:10px;"
    >

    <br><br>

    <label>導覽列上下留白（單位 px，預設 24，範圍 0-80，跟 Logo 高度分開調，Logo 放大不會連帶把導覽列撐高）</label>

    <br>

    <input
        type="number"
        name="headerPaddingY"
        value="${settings.headerPaddingY != null ? settings.headerPaddingY : 24}"
        min="0"
        max="80"
        style="width:160px;padding:10px;"
    >

    <br><br>

    <label>網站名稱（沒有設定 Logo 圖片時，會顯示在導覽列，並用於瀏覽器標題）</label>

    <br>

    <input
        type="text"
        name="siteName"
        value="${settings.siteName || ""}"
        style="width:100%;padding:10px;"
        required
    >

    <br><br>

    <label>Logo 旁的品牌字（選填，有設定 Logo 時才會顯示：大字＋小字，例如「光塵」＋「影像工作室」）</label>

    <br>

    <div style="display:flex;gap:10px;">
        <input type="text" name="brandTextMain" value="${settings.brandTextMain || ""}" placeholder="大字，例如 光塵" style="flex:1;padding:10px;">
        <input type="text" name="brandTextSub" value="${settings.brandTextSub || ""}" placeholder="小字，例如 影像工作室" style="flex:1;padding:10px;">
    </div>
    <label style="display:block;margin-top:8px;"><input type="checkbox" name="showBrandTextInHeader" ${settings.showBrandTextInHeader ? "checked" : ""}> 導覽列也顯示品牌字（不勾：導覽列只放圓形 Logo，品牌字只出現在深色頁尾）</label>

    <br><br>

    <label>頁尾文字</label>

    <br>

    <input
        type="text"
        name="footerText"
        value="${settings.footerText || ""}"
        style="width:100%;padding:10px;"
    >

    <br><br>

    <label>頁尾底色</label>

    <br>

    <select name="footerBackground" style="padding:10px;">
        <option value="none" ${(settings.footerBackground || "none") === "none" ? "selected" : ""}>無（預設，跟頁面底色一樣）</option>
        <option value="alt" ${settings.footerBackground === "alt" ? "selected" : ""}>淺色底（跟內容模組的「淺色底」同一個顏色，做出色塊分段效果）</option>
        <option value="dark" ${settings.footerBackground === "dark" ? "selected" : ""}>深色底（用第二強調色加深，白字＋金色標籤，頁尾會顯示 Logo 與品牌字）</option>
    </select>

    <br><br>

    <label>SEO 描述（顯示在搜尋引擎結果，選填）</label>

    <br>

    <textarea
        name="metaDescription"
        id="seo-meta-description-input"
        rows="3"
        style="width:100%;padding:10px;"
    >${settings.metaDescription || ""}</textarea>

    <p id="seo-meta-description-hint" style="font-size:12px;color:#888;margin-top:4px;"></p>

    <br>

    <label>SEO 關鍵字（選填，一個一個新增）</label>

    <br>

    <p style="font-size:12px;color:#888;margin:4px 0;">
        Google 從 2009 年起已不用這個標籤排名，主要當作您規劃內容關鍵字的小抄；仍會寫入網頁原始碼供其他用途參考。
    </p>

    <div id="seo-keywords-list" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;">
        ${(settings.metaKeywords || []).map(keyword => `
        <span class="seo-keyword-chip" style="display:inline-flex;align-items:center;gap:6px;background:#eef2f7;border:1px solid #d5dce3;border-radius:999px;padding:6px 12px;font-size:13px;">
            <span>${keyword}</span>
            <input type="hidden" name="metaKeywords" value="${keyword}">
            <button type="button" class="seo-keyword-remove" style="border:0;background:none;cursor:pointer;color:#888;font-size:14px;line-height:1;">✕</button>
        </span>
        `).join("")}
    </div>

    <div style="display:flex;gap:8px;">
        <input type="text" id="seo-keyword-new-input" placeholder="輸入關鍵字後按 Enter 或點新增" style="flex:1;padding:10px;">
        <button type="button" id="seo-keyword-add-btn">新增</button>
    </div>

    <br>

    <label>Google Analytics 追蹤代碼（選填，格式如 G-XXXXXXXXXX）</label>

    <br>

    <input
        type="text"
        name="googleAnalyticsId"
        value="${settings.googleAnalyticsId || ""}"
        placeholder="G-XXXXXXXXXX"
        style="width:100%;padding:10px;"
    >

    <br><br>

    <label>Google Search Console 驗證碼（選填，用來證明網站是您的，才能提交 sitemap／申請被收錄）</label>

    <br>

    <p style="font-size:12px;color:#888;margin:4px 0;">
        到 <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Google Search Console</a> 新增資源 →
        選「HTML 標記」驗證方式 → 複製 <code>content="..."</code> 裡面那一串貼在下面 → 儲存後回 Search Console 按「驗證」。
    </p>

    <input
        type="text"
        name="googleSiteVerification"
        value="${settings.googleSiteVerification || ""}"
        placeholder="貼上 content 值，例如 AbC123-_XyZ"
        style="width:100%;padding:10px;"
    >

    <br><br>

    <label>LINE 官方帳號 Channel Access Token（選填，設定後才能推播通知）</label>

    <br>

    <p style="font-size:12px;color:#888;margin:4px 0;">
        取得方式：先在
        <a href="https://www.linebiz.com/tw/" target="_blank" rel="noopener">LINE 官方帳號管理後台</a>
        建立官方帳號 → 前往「設定」開啟 Messaging API → 到
        <a href="https://developers.line.biz/console/" target="_blank" rel="noopener">LINE Developers</a>
        後台找到該 Channel → 在「Messaging API」分頁發行「Channel access token」貼在下面。
    </p>

    <input
        type="password"
        name="lineChannelAccessToken"
        id="line-token-input"
        value="${settings.lineChannelAccessToken || ""}"
        placeholder="貼上 Channel Access Token"
        style="width:100%;padding:10px;"
        autocomplete="off"
    >

    <br><br>

    <label>LINE 官方帳號 Channel Secret（選填，設定後客人直接在 LINE 傳訊息給您時，會出現在下方「留言」列表裡）</label>

    <br>

    <p style="font-size:12px;color:#888;margin:4px 0;">
        一樣在 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener">LINE Developers</a>
        後台該 Channel 的「Basic settings」分頁找「Channel secret」貼在下面。<br>
        設定完成後，回到「Messaging API」分頁的「Webhook URL」欄位貼上：
        <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;">${SITE_URL}/line/webhook</code>，
        按「Verify」確認連線成功，並把「Use webhook」打開。
    </p>

    <input
        type="password"
        name="lineChannelSecret"
        value="${settings.lineChannelSecret || ""}"
        placeholder="貼上 Channel Secret"
        style="width:100%;padding:10px;"
        autocomplete="off"
    >

    <br><br>

    <label>接收通知的 LINE User ID（選填，每行一個）</label>

    <br>

    <p style="font-size:12px;color:#888;margin:4px 0;">
        設定後，有新留言，或客人透過上面設定的 webhook 傳訊息來時，會推播通知到這些 LINE 帳號——
        不是廣播給所有加官方帳號好友的人，避免一般訪客加好友後也收到店家自己的留言通知。<br>
        User ID 怎麼找：先把 Channel Secret／webhook 設定好，自己加官方帳號為好友並傳一句話過去，
        對方的 User ID 就會顯示在下方「留言」列表該筆訊息的名稱欄位裡，複製貼過來即可。可新增多人，每行填一個。
    </p>

    <textarea
        name="lineNotifyUserIds"
        placeholder="U4af4980629...&#10;U1234567890..."
        style="width:100%;padding:10px;min-height:80px;font-family:monospace;"
    >${(settings.lineNotifyUserIds || []).join("\n")}</textarea>

    <br><br>

    <label>LINE 官方帳號好友連結（選填，會顯示在聯絡我頁面的「加 LINE 好友」按鈕）</label>

    <br>

    <p style="font-size:12px;color:#888;margin:4px 0;">在 LINE 官方帳號管理後台的「設定」→「帳號設定」可以找到「加入好友網址」，格式類似 https://line.me/R/ti/p/@xxxxxxx</p>

    <input
        type="text"
        name="lineFriendUrl"
        value="${settings.lineFriendUrl || ""}"
        placeholder="https://line.me/R/ti/p/@xxxxxxx"
        style="width:100%;padding:10px;"
    >

    <br><br>

    ${settings.lineChannelAccessToken ? `
    <button type="button" id="line-test-btn">測試 LINE 連線</button>
    <span id="line-test-status" style="font-size:12px;color:#888;margin-left:8px;"></span>
    <p style="font-size:12px;color:#888;margin-top:6px;">若有更改 Token，請先按下方「儲存」後再測試</p>
    ` : ""}

    <br><br>

    <label>聯絡表單防護 Google reCAPTCHA（選填，設定後聯絡我表單會多一道「我不是機器人」驗證，避免機器人濫發表單）</label>

    <br>

    <p style="font-size:12px;color:#888;margin:4px 0;">
        到 <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noopener">Google reCAPTCHA 管理後台</a>
        註冊網站，類型選「reCAPTCHA v2」→「我不是機器人」核取方塊，網域填您的正式網址，
        建立後把「網站金鑰」「密鑰」分別貼在下面兩欄。兩欄都留空時，表單維持原本靠隱藏欄位擋機器人的防護方式。
    </p>

    <input
        type="text"
        name="recaptchaSiteKey"
        value="${settings.recaptchaSiteKey || ""}"
        placeholder="網站金鑰（Site Key）"
        style="width:100%;padding:10px;margin-bottom:8px;"
    >

    <input
        type="password"
        name="recaptchaSecretKey"
        value="${settings.recaptchaSecretKey || ""}"
        placeholder="密鑰（Secret Key）"
        style="width:100%;padding:10px;"
        autocomplete="off"
    >

    <br><br>

    <label>聯絡資訊（選填，設定後會顯示在頁尾）</label>

    <br><br>

    <input type="text" name="contactPhone" value="${settings.contactPhone || ""}" placeholder="電話，例如：04-1234-5678" style="width:100%;padding:10px;margin-bottom:8px;">
    <input type="text" name="contactEmail" value="${settings.contactEmail || ""}" placeholder="Email" style="width:100%;padding:10px;margin-bottom:8px;">
    <input type="text" name="contactAddress" value="${settings.contactAddress || ""}" placeholder="地址" style="width:100%;padding:10px;margin-bottom:8px;">
    <input type="text" name="contactHours" value="${settings.contactHours || ""}" placeholder="營業時間，例如：Mon - Fri / 10:00 - 18:00" style="width:100%;padding:10px;">

    <br><br>

    <label>社群媒體連結（選填，設定後會顯示在頁尾）</label>

    <br><br>

    <input type="text" name="socialFacebookUrl" value="${settings.socialFacebookUrl || ""}" placeholder="Facebook 網址" style="width:100%;padding:10px;margin-bottom:8px;">
    <input type="text" name="socialInstagramUrl" value="${settings.socialInstagramUrl || ""}" placeholder="Instagram 網址" style="width:100%;padding:10px;margin-bottom:8px;">
    <input type="text" name="socialYoutubeUrl" value="${settings.socialYoutubeUrl || ""}" placeholder="YouTube 網址" style="width:100%;padding:10px;">

    <br><br>

    <label>
        <input type="checkbox" name="cookieConsentEnabled" ${settings.cookieConsentEnabled ? "checked" : ""}>
        顯示 Cookie 同意提示（訪客第一次造訪時，畫面底部會出現提示條）
    </label>

    <br><br>

    <label>Cookie 提示文字（選填，不填則使用預設文字）</label>

    <br>

    <textarea name="cookieConsentText" rows="2" style="width:100%;padding:10px;" placeholder="本網站使用 Cookie 以提供更好的瀏覽體驗。">${settings.cookieConsentText || ""}</textarea>

    <br><br>

    <label>自訂字體庫（已上傳的字體，選填套用到下面標題/內文；到上面「自訂字體庫」區塊可以上傳新字體）</label>

    <br><br>

    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;">

        <label style="flex:1;min-width:200px;">
            標題字體
            <select name="headingFontId" style="width:100%;padding:10px;margin-top:4px;">
                <option value="">使用網站樣板預設</option>
                ${fonts.map(font => `<option value="${font.id}" ${settings.headingFontId === font.id ? "selected" : ""}>${escapeHtml(font.name)}</option>`).join("")}
            </select>
        </label>

        <label style="flex:1;min-width:200px;">
            內文字體
            <select name="bodyFontId" style="width:100%;padding:10px;margin-top:4px;">
                <option value="">使用網站樣板預設</option>
                ${fonts.map(font => `<option value="${font.id}" ${settings.bodyFontId === font.id ? "selected" : ""}>${escapeHtml(font.name)}</option>`).join("")}
            </select>
        </label>

    </div>

    <br>

    <label>網站樣板</label>

    <br><br>

    <div style="display:flex;gap:16px;flex-wrap:wrap;">

        ${THEMES.map(theme => `
            <label style="flex:1;min-width:200px;border:2px solid ${settings.theme === theme.value ? "#00d2ff" : "#ddd"};border-radius:10px;padding:16px;cursor:pointer;display:block;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <input type="radio" name="theme" class="theme-radio" value="${theme.value}" ${settings.theme === theme.value ? "checked" : ""}>
                    <strong>${theme.label}</strong>
                </div>
                <p style="margin:0;font-size:13px;color:#888;">${theme.description}</p>
            </label>
        `).join("")}

    </div>

    <div id="custom-color-pickers" style="display:${settings.theme === "custom" ? "flex" : "none"};flex-wrap:wrap;gap:14px;margin-top:16px;padding:16px;border:1px solid #eee;border-radius:10px;">

        ${[
            ["customColorBg", "背景色"],
            ["customColorBgAlt", "背景輔助色"],
            ["customColorPanel", "卡片底色"],
            ["customColorBorder", "邊框色"],
            ["customColorText", "文字色"],
            ["customColorMuted", "次要文字色"],
            ["customColorAccent", "主色（重點色）"],
            ["customColorAccent2", "主色輔助色"],
            ["customColorDanger", "警示色"],
            ["customColorHeaderBg", "導覽列背景色"]
        ].map(([field, label]) => `
            <label style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;color:#666;">
                ${label}
                <div style="display:flex;align-items:center;gap:6px;">
                    <input type="color" class="color-swatch-input" data-pair="${field}" value="${settings[field] || "#cccccc"}">
                    <input
                        type="text"
                        name="${field}"
                        class="color-hex-input"
                        data-pair="${field}"
                        value="${settings[field] || "#cccccc"}"
                        maxlength="7"
                        style="width:76px;padding:6px;font-size:12px;font-family:monospace;text-transform:uppercase;"
                    >
                </div>
            </label>
        `).join("")}

    </div>

    <div id="color-preset-panel" style="display:${settings.theme === "custom" ? "block" : "none"};margin-top:14px;">

        <label style="font-size:13px;color:#666;">配色範本（把上面調好的顏色存起來，之後可以直接套用或跟其他組合切換比較；只會存顏色，畫面上其他還沒按「儲存」的設定不會一起存進去）</label>

        <br><br>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <input type="text" name="presetName" placeholder="範本名稱，例如：藍色系" style="flex:1;min-width:200px;padding:10px;">
            <button type="submit" formaction="/cms/settings/color-presets" formnovalidate>儲存目前配色為範本</button>
        </div>

        ${(settings.colorPresets || []).length > 0 ? `
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;">
            ${settings.colorPresets.map(preset => `
            <div style="border:1px solid #ddd;border-radius:8px;padding:10px;min-width:160px;">
                <strong style="font-size:13px;">${preset.name}</strong>
                <div style="display:flex;gap:3px;margin:8px 0;">
                    ${["customColorBg", "customColorAccent", "customColorAccent2", "customColorText"].map(field => `<span style="width:18px;height:18px;border-radius:4px;display:inline-block;background:${preset.colors[field] || "#ccc"};border:1px solid #ddd;"></span>`).join("")}
                </div>
                <div style="display:flex;gap:6px;">
                    <button type="submit" formaction="/cms/settings/color-presets/${preset.id}/apply" formnovalidate style="font-size:12px;">套用</button>
                    <button type="submit" formaction="/cms/settings/color-presets/${preset.id}/delete" formnovalidate onclick="return confirm('確定要刪除這個配色範本嗎？');" style="font-size:12px;">刪除</button>
                </div>
            </div>
            `).join("")}
        </div>
        ` : ""}

    </div>

    <br>

    <label>作品集列表排版</label>

    <br><br>

    <div style="display:flex;gap:16px;flex-wrap:wrap;">

        ${PROJECT_LIST_LAYOUTS.map(layout => `
            <label style="flex:1;min-width:200px;border:2px solid ${(settings.projectListLayout || "grid") === layout.value ? "#00d2ff" : "#ddd"};border-radius:10px;padding:16px;cursor:pointer;display:block;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <input type="radio" name="projectListLayout" value="${layout.value}" ${(settings.projectListLayout || "grid") === layout.value ? "checked" : ""}>
                    <strong>${layout.label}</strong>
                </div>
                <p style="margin:0;font-size:13px;color:#888;">${layout.description}</p>
            </label>
        `).join("")}

    </div>

    <br>

    <label>
        <input type="checkbox" name="showHomeCarousel" ${settings.showHomeCarousel ? "checked" : ""}>
        首頁顯示全螢幕作品輪播（取自最新發布的作品封面照）
    </label>

    <br><br>

    <label>
        <input type="checkbox" name="showFeaturedSidebar" ${settings.showFeaturedSidebar ? "checked" : ""}>
        首頁顯示「精選作品側邊選單」（左側列出精選作品標題，點選切換右側大圖，跟作品輪播是各自獨立的區塊，可以同時開）
    </label>

    <br><br>

    <label>手動精選作品（選填；勾選要放進上面兩個區塊的作品，依下方勾選順序顯示；一個都不勾就自動退回「最新發布前 6 筆」）</label>

    <br>

    <div id="featured-project-picker" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:6px;">
        <p style="color:#888;">載入中...</p>
    </div>

    <input type="hidden" name="featuredProjectIdsJson" id="featured-project-ids-field" value="${escapeHtml(JSON.stringify(settings.featuredProjectIds || []))}">

    <br><br>

    <button type="submit">儲存</button>

</form>

<script>
(function () {

    // 這份表單裡有好幾個「formaction 指到別的網址」的按鈕（字體/配色範本的刪除、套用…），
    // 瀏覽器對著任何一個文字/數字欄位按 Enter，預設會觸發表單裡「第一個」submit 按鈕，
    // 不一定是使用者想的下面那顆「儲存」——例如剛剛在「Logo 高度」按 Enter，
    // 實際觸發的是字體庫那邊第一個「刪除」按鈕，跳出完全不相關的刪除確認視窗。
    // 直接擋掉在一般欄位按 Enter 的預設送出行為，逼使用者一定要點「儲存」，避免誤觸其他按鈕
    var mainForm = document.querySelector('form[action="/cms/settings"]');

    if (mainForm) {

        mainForm.addEventListener("keydown", function (event) {

            if (event.key !== "Enter") {
                return;
            }

            if (event.target.tagName === "INPUT" && event.target.type !== "submit" && event.target.type !== "button") {
                event.preventDefault();
            }

        });

    }

})();
</script>

<script>
(function () {

    var descInput = document.getElementById("seo-meta-description-input");
    var descHint = document.getElementById("seo-meta-description-hint");

    function updateHint() {

        var length = descInput.value.length;

        if (length === 0) {
            descHint.textContent = "描述長度：尚未填寫，建議填寫以提升搜尋引擎顯示效果";
            descHint.style.color = "#c0392b";
        } else if (length < 50) {
            descHint.textContent = "描述長度：" + length + " 字（建議至少 50 字）";
            descHint.style.color = "#c0392b";
        } else if (length > 160) {
            descHint.textContent = "描述長度：" + length + " 字（超過建議上限 160 字，搜尋結果可能會被截斷）";
            descHint.style.color = "#c0392b";
        } else {
            descHint.textContent = "描述長度：" + length + " 字（長度適中）";
            descHint.style.color = "#2a7a3b";
        }

    }

    descInput.addEventListener("input", updateHint);
    updateHint();

})();

(function () {

    var list = document.getElementById("seo-keywords-list");
    var input = document.getElementById("seo-keyword-new-input");
    var addBtn = document.getElementById("seo-keyword-add-btn");

    function existingValues() {
        return Array.prototype.map.call(list.querySelectorAll("input[name='metaKeywords']"), function (el) {
            return el.value;
        });
    }

    function bindRemove(btn) {
        btn.addEventListener("click", function () {
            btn.closest(".seo-keyword-chip").remove();
        });
    }

    function addChip(value) {

        value = value.trim();

        if (!value || existingValues().indexOf(value) !== -1) {
            input.value = "";
            return;
        }

        var chip = document.createElement("span");
        chip.className = "seo-keyword-chip";
        chip.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:#eef2f7;border:1px solid #d5dce3;border-radius:999px;padding:6px 12px;font-size:13px;";

        var text = document.createElement("span");
        text.textContent = value;

        var hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = "metaKeywords";
        hidden.value = value;

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "seo-keyword-remove";
        removeBtn.style.cssText = "border:0;background:none;cursor:pointer;color:#888;font-size:14px;line-height:1;";
        removeBtn.textContent = "✕";
        bindRemove(removeBtn);

        chip.appendChild(text);
        chip.appendChild(hidden);
        chip.appendChild(removeBtn);
        list.appendChild(chip);

        input.value = "";
        input.focus();

    }

    Array.prototype.forEach.call(list.querySelectorAll(".seo-keyword-remove"), bindRemove);

    addBtn.addEventListener("click", function () {
        addChip(input.value);
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            addChip(input.value);
        }
    });

})();

${cropWidgetScript()}

(function () {

    var logoInput = document.getElementById("logo-input");
    var status = document.getElementById("logo-status");

    logoInput.addEventListener("change", function () {

        var file = logoInput.files[0];

        if (!file) {
            return;
        }

        window.openImageCropper(file, null, function (blob) {

            var formData = new FormData();
            formData.append("logo", blob, "logo.png");

            status.textContent = "上傳中...";

            fetch("/cms/settings/logo", {
                method: "POST",
                body: formData
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data.url) {
                        status.textContent = "上傳失敗";
                        return;
                    }

                    window.location.reload();

                })
                .catch(function () {
                    status.textContent = "上傳失敗";
                });

        }, { allowSkip: true });

    });

})();

(function () {

    var fontInput = document.getElementById("font-input");
    var nameInput = document.getElementById("font-name-input");
    var status = document.getElementById("font-status");

    if (!fontInput) {
        return;
    }

    fontInput.addEventListener("change", function () {

        var files = Array.from(fontInput.files);

        if (files.length === 0) {
            return;
        }

        // 一次選多個檔案時，自訂名稱欄位只對單一檔案有意義，多檔改用各自檔名（見 fontService 沒填名稱時的預設行為）
        var useCustomName = files.length === 1;

        status.textContent = "上傳中...（" + files.length + " 個檔案）";

        var uploads = files.map(function (file) {

            var formData = new FormData();
            formData.append("fontFile", file);
            formData.append("fontName", useCustomName ? (nameInput.value || "") : "");

            return fetch("/cms/settings/fonts", { method: "POST", body: formData })
                .then(function (res) { return res.json(); });

        });

        Promise.all(uploads)
            .then(function (results) {

                if (!results.every(function (data) { return data.font; })) {
                    status.textContent = "部分檔案上傳失敗";
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

    // 字體刪除改用 AJAX（跟這頁其他上傳/選取動作一致），不再依賴 formaction 的原生表單送出——
    // 這個頁面塞了太多不同動作的按鈕在同一個大表單裡，原生送出容易被瀏覽器行為干擾，直接用 fetch 最單純可靠
    Array.prototype.forEach.call(document.querySelectorAll(".delete-font-btn"), function (btn) {

        btn.addEventListener("click", function () {

            if (!confirm("確定要刪除這個字體嗎？如果標題或內文正在使用它，會一併改回預設字體。")) {
                return;
            }

            var fontId = btn.getAttribute("data-font-id");

            fetch("/cms/settings/fonts/" + fontId + "/delete", { method: "POST" })
                .then(function () {
                    window.location.reload();
                })
                .catch(function () {
                    alert("刪除失敗，請重新整理頁面後再試一次");
                });

        });

    });

})();

(function () {

    var mediaBtn = document.getElementById("logo-media-btn");
    var status = document.getElementById("logo-status");

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: false,
            onSelect: function (files) {

                status.textContent = "設定中...";

                fetch("/cms/settings/logo/from-media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mediaId: files[0].id })
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {

                        if (!data.url) {
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

(function () {

    var faviconInput = document.getElementById("favicon-input");
    var status = document.getElementById("favicon-status");

    faviconInput.addEventListener("change", function () {

        var file = faviconInput.files[0];

        if (!file) {
            return;
        }

        var formData = new FormData();
        formData.append("favicon", file);

        status.textContent = "上傳中...";

        fetch("/cms/settings/favicon", {
            method: "POST",
            body: formData
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data.url) {
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

    var mediaBtn = document.getElementById("favicon-media-btn");
    var status = document.getElementById("favicon-status");

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: false,
            onSelect: function (files) {

                status.textContent = "設定中...";

                fetch("/cms/settings/favicon/from-media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mediaId: files[0].id })
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {

                        if (!data.url) {
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

(function () {

    var ogImageInput = document.getElementById("og-image-input");
    var status = document.getElementById("og-image-status");

    ogImageInput.addEventListener("change", function () {

        var file = ogImageInput.files[0];

        if (!file) {
            return;
        }

        var formData = new FormData();
        formData.append("ogImage", file);

        status.textContent = "上傳中...";

        fetch("/cms/settings/og-image", {
            method: "POST",
            body: formData
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data.url) {
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

    var mediaBtn = document.getElementById("og-image-media-btn");
    var status = document.getElementById("og-image-status");

    mediaBtn.addEventListener("click", function () {

        window.openMediaPicker({
            multiple: false,
            onSelect: function (files) {

                status.textContent = "設定中...";

                fetch("/cms/settings/og-image/from-media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mediaId: files[0].id })
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {

                        if (!data.url) {
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

(function () {

    var radios = document.querySelectorAll(".theme-radio");
    var pickers = document.getElementById("custom-color-pickers");
    var presetPanel = document.getElementById("color-preset-panel");

    radios.forEach(function (radio) {

        radio.addEventListener("change", function () {
            var isCustom = radio.value === "custom" && radio.checked;
            pickers.style.display = isCustom ? "flex" : "none";
            presetPanel.style.display = isCustom ? "block" : "none";
        });

    });

})();

// 每個自訂配色欄位的色塊跟旁邊的 HEX 文字框互相同步：拖色塊會更新文字，打字打對格式也會即時更新色塊預覽
(function () {

    document.querySelectorAll(".color-swatch-input").forEach(function (swatch) {

        var field = swatch.getAttribute("data-pair");
        var hexInput = document.querySelector('.color-hex-input[data-pair="' + field + '"]');

        swatch.addEventListener("input", function () {
            hexInput.value = swatch.value.toUpperCase();
        });

        hexInput.addEventListener("input", function () {

            var value = hexInput.value.trim();
            var withHash = value.charAt(0) === "#" ? value : "#" + value;

            if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
                swatch.value = withHash;
            }

        });

        // 打完離開欄位時，如果忘了打 # 但其他格式都對，順手幫忙補上
        hexInput.addEventListener("blur", function () {

            var value = hexInput.value.trim();

            if (/^[0-9a-fA-F]{6}$/.test(value)) {
                hexInput.value = "#" + value.toUpperCase();
            }

        });

    });

})();

(function () {

    var testBtn = document.getElementById("line-test-btn");

    if (!testBtn) {
        return;
    }

    var status = document.getElementById("line-test-status");

    testBtn.addEventListener("click", function () {

        status.textContent = "測試中...";
        testBtn.disabled = true;

        fetch("/cms/settings/line/test", { method: "POST" })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                status.textContent = data.success ? "✅ 連線成功，請確認您的 LINE 是否收到測試訊息" : ("❌ " + (data.message || "測試失敗"));
                testBtn.disabled = false;

            })
            .catch(function () {
                status.textContent = "❌ 測試失敗，請稍後再試";
                testBtn.disabled = false;
            });

    });

})();

// 手動精選作品：跟圖文分欄的「影片輪播」模組共用同一個項目清單 API，勾選哪些、順序怎麼排都存進 hidden field 的 JSON 裡
(function () {

    var container = document.getElementById("featured-project-picker");
    var field = document.getElementById("featured-project-ids-field");

    if (!container || !field) {
        return;
    }

    var selectedIds = [];

    try {
        selectedIds = JSON.parse(field.value || "[]");
    } catch (error) {
        selectedIds = [];
    }

    fetch("/cms/custom-pages/video-items.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {

            var items = data.items || [];

            if (items.length === 0) {
                container.innerHTML = "<p style=\\"color:#888;\\">作品集裡目前還沒有任何項目，請先到「作品集」新增作品</p>";
                return;
            }

            container.innerHTML = "";

            items.forEach(function (item) {

                var label = document.createElement("label");
                label.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;";

                var checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = item.id;
                checkbox.checked = selectedIds.indexOf(item.id) !== -1;

                checkbox.addEventListener("change", function () {

                    var checked = Array.prototype.map.call(container.querySelectorAll("input[type=checkbox]:checked"), function (box) {
                        return box.value;
                    });

                    field.value = JSON.stringify(checked);

                });

                if (item.coverUrl) {
                    var img = document.createElement("img");
                    img.src = item.coverUrl;
                    img.style.cssText = "width:60px;height:40px;object-fit:cover;border-radius:4px;";
                    label.appendChild(img);
                }

                var span = document.createElement("span");
                span.textContent = item.title;

                label.appendChild(checkbox);
                label.appendChild(span);
                container.appendChild(label);

            });

        })
        .catch(function () {
            container.innerHTML = "<p style=\\"color:#888;\\">載入失敗</p>";
        });

})();
</script>

`

);
