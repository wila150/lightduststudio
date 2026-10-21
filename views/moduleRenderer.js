const { getEmbedUrl } = require("../services/videoEmbed");
const { renderGallery } = require("../services/galleryRenderer");
const { resolveProcessIcon } = require("../services/processIcons");
const escapeHtml = require("./escapeHtml");

// 首頁作品輪播的封面：YouTube 預設縮圖（hqdefault）是 4:3、上下自帶黑邊，改用沒有黑邊的 maxresdefault，
// 那支影片沒有高畫質縮圖時才退回 hqdefault，並加上 yt-thumb-hq 把黑邊裁掉（見 style.css）
function renderCarouselCover(url, title) {

    const alt = escapeHtml(title || "");

    if (!/img\.youtube\.com\/vi\/[^/]+\/hqdefault\.jpg$/.test(url)) {
        return `<img src="${url}" alt="${alt}">`;
    }

    return `<img src="${url.replace("hqdefault", "maxresdefault")}" alt="${alt}" onerror="this.onerror=null;this.src='${url}';this.classList.add('yt-thumb-hq')">`;

}

// 單張圖片模組、圖文分欄圖片共用的「新風格」渲染（現代極簡／有機自然／文藝拍立得）。
// 對應 views/cms/moduleEditor.js 的 renderImageStyleOptions 跟 public/css/style.css 的 .img-style-* 類別。
// 回傳 null 表示這個 imageStyle 不是新風格（例如 none/rounded/sharp），呼叫端維持自己原本既有的渲染方式，
// 因為單張圖片模組跟圖文分欄的「預設樣子」本來就不一樣（前者固定 8px 圓角、後者靠 --split-radius 變數控制）
function renderStyledImage(url, alt, imageStyle, borderColor) {

    if (!url) {
        return "";
    }

    const border = borderColor ? `border:4px solid ${borderColor};` : "";

    if (imageStyle === "polaroid") {
        // 拍立得的白邊框本來就是相框感的重點，自訂顏色時換成外面再加一圈色框，裡面維持白色相紙感
        const frameBorder = borderColor ? `border:6px solid ${borderColor};` : "";
        return `<div class="img-style-polaroid-wrap" style="${frameBorder}"><img src="${url}" alt="${alt}"></div>`;
    }

    if (imageStyle === "modern") {
        return `<img src="${url}" alt="${alt}" class="img-style-modern" style="width:100%;object-fit:cover;${border}">`;
    }

    if (imageStyle === "organic") {
        return `<img src="${url}" alt="${alt}" class="img-style-organic" style="width:100%;aspect-ratio:4/3;object-fit:cover;${border}">`;
    }

    if (imageStyle === "mono") {
        return `<img src="${url}" alt="${alt}" class="img-style-mono" style="width:100%;${border}">`;
    }

    return null;

}

// Component Registry：每種模組類型對應一個前台渲染函式
// 首頁／關於我／聯絡我／自訂頁面都共用這份，新增模組類型時只需要在這裡加一個 renderer
const MODULE_RENDERERS = {

    heading: (data) => {

        // 大字級在手機上會比螢幕還寬（例如 56px 的 PHOTOGRAPH 約 390px），把整頁撐寬變成可以左右滑；
        // 改成跟螢幕寬度縮放，桌機寬度夠時還是原本的字級上限
        const SIZES = { small: "22px", medium: "clamp(24px, 7.5vw, 32px)", large: "clamp(28px, 9vw, 42px)", xlarge: "clamp(32px, 11vw, 56px)" };
        const WEIGHTS = { normal: "400", medium: "600", bold: "700", black: "900" };

        const level = data.level || "2";
        const fontSize = SIZES[data.size] || SIZES.medium;
        const fontWeight = WEIGHTS[data.weight] || WEIGHTS.bold;
        const align = ["left", "center", "right"].includes(data.align) ? data.align : "left";
        const style = `font-size:${fontSize};font-weight:${fontWeight};text-align:${align};${data.color ? `color:${data.color};` : ""}`;

        return `<h${level} style="${style}">${data.text || ""}</h${level}>`;

    },

    text: (data) => `<div class="text-block">${data.html || ""}</div>`,

    image: (data) => {

        const styled = renderStyledImage(data.url, data.caption || "", data.imageStyle, data.imageBorderColor);
        const legacyBorder = data.imageBorderColor ? `border:4px solid ${data.imageBorderColor};` : "";
        const imgHtml = styled !== null ? styled : (data.url ? `<img src="${data.url}" alt="${data.caption || ""}" style="width:100%;border-radius:8px;${legacyBorder}">` : "");

        return `
        <figure style="margin:0 0 20px;">
            ${imgHtml}
            ${data.caption ? `<figcaption style="color:var(--muted);font-size:13px;margin-top:8px;">${data.caption}</figcaption>` : ""}
        </figure>
        `;

    },

    button: (data) => `<p><a href="${data.link || "#"}" class="btn-primary">${data.text || ""}</a></p>`,

    featureCard: (data) => `
        <article class="feature-card" ${data.borderColor ? `style="border-color:${data.borderColor};"` : ""}>
            <div class="feature-meta">
                <h3>${data.title || ""}</h3>
                ${data.description ? `<div class="feature-description">${data.description}</div>` : ""}
            </div>
        </article>
    `,

    // 常見問題：一題一個模組，連續的會包成 .faq-list（見 GROUPED_TYPES），並自動輸出 FAQPage 結構化資料（renderModules）
    // GEO／SEO：AI 搜尋和 Google 最常直接引用「問題＋答案」格式的內容
    faqItem: (data) => data.question ? `
        <details class="faq-item">
            <summary>${escapeHtml(data.question)}</summary>
            <div class="faq-answer">${data.answer || ""}</div>
        </details>
    ` : "",

    timelineItem: (data) => `
        <li class="tl-item">
            <div class="tl-year">${data.year || ""}</div>
            <div class="tl-content">${data.text || ""}</div>
        </li>
    `,

    processStep: (data, context = {}) => {

        const stepNumber = context.stepNumber || 1;
        // 內建圖示回傳 SVG；舊資料存的是 emoji（不在內建清單裡）就照文字輸出
        const svgIcon = resolveProcessIcon(data.icon, stepNumber);
        const iconHtml = svgIcon === null ? escapeHtml(data.icon) : svgIcon;

        return `
        <div class="process-step">
            ${iconHtml ? `<span class="process-step-icon${svgIcon ? " is-svg" : ""}">${iconHtml}</span>` : ""}
            <span class="process-step-number">STEP ${String(stepNumber).padStart(2, "0")}</span>
            <div class="process-step-body">
                <h3>${data.title || ""}</h3>
                ${data.description ? `<div class="process-step-desc">${data.description}</div>` : ""}
            </div>
        </div>
    `;

    },

    videoBlock: (data) => {

        if (!data.videoUrl) {
            return "";
        }

        const embedUrl = getEmbedUrl(data.videoUrl);

        return `
            <figure class="video-block" style="margin:0 0 20px;">
                <div class="video-block-cover" data-embed-url="${embedUrl || ""}" data-video-url="${!embedUrl ? data.videoUrl : ""}">
                    ${data.coverUrl ? `<img src="${data.coverUrl}" alt="${data.caption || ""}">` : `<div class="video-block-placeholder"></div>`}
                    <span class="video-block-play">▶</span>
                </div>
                ${data.caption ? `<figcaption style="color:var(--muted);font-size:13px;margin-top:8px;">${data.caption}</figcaption>` : ""}
            </figure>
        `;

    },

    splitFeature: (data) => {

        const HEADING_SIZES = { small: "24px", medium: "34px", large: "46px", xlarge: "60px" };
        const TEXT_SIZES = { small: "13px", medium: "15px", large: "18px", xlarge: "22px" };
        // 圖片那一欄相對文字欄的比例，數字越大圖片佔的版面越大
        const IMAGE_COLUMN_RATIOS = { small: "1fr 0.7fr", medium: "1fr 1fr", large: "0.8fr 1.2fr", xlarge: "0.6fr 1.4fr" };
        // 多張圖片並排時統一套用的框比例，讓直式、橫式原圖也能一致大小（用 object-fit:contain 完整顯示，不裁切）
        const IMAGE_RATIOS = { square: "1/1", portrait: "3/4", landscape: "4/3", wide: "16/9" };

        const headingSize = HEADING_SIZES[data.headingSize] || HEADING_SIZES.medium;
        const textSize = TEXT_SIZES[data.textSize] || TEXT_SIZES.medium;
        // 文字永遠是第一個 grid item（第一欄），圖片是第二欄；imagePosition 用 CSS 的 direction:rtl
        // 技巧視覺上左右互換（見 .split-feature-reverse），不影響欄位在陣列裡的順序，這裡不用跟著反轉
        const columns = IMAGE_COLUMN_RATIOS[data.imageSize] || IMAGE_COLUMN_RATIOS.medium;
        const radius = data.imageCorner === "sharp" ? "0" : "10px";
        const imgRatio = IMAGE_RATIOS[data.imageRatio];

        const images = data.images || [];

        return `
        <section class="split-feature ${data.imagePosition === "left" ? "split-feature-reverse" : ""} ${data.darkBg ? "split-feature-dark" : ""}" style="--split-cols:${columns};--split-radius:${radius};">
            <div class="split-feature-text">
                ${data.heading ? `<h2 style="font-size:${headingSize};">${data.heading}</h2>` : ""}
                ${data.text ? `<div class="split-feature-copy" style="font-size:${textSize};">${data.text}</div>` : ""}
            </div>
            ${images.length > 0 ? `
            <div class="split-feature-media"${imgRatio ? ` data-ratio="${data.imageRatio}"${data.imageFrame ? " data-frame" : ""} style="--split-img-ratio:${imgRatio};"` : ""}>
                ${images.map(image => {
                    const styled = renderStyledImage(image.url, data.heading || "", data.imageCorner, data.imageBorderColor);
                    const legacyBorder = data.imageBorderColor ? ` style="border:4px solid ${data.imageBorderColor};"` : "";
                    return styled !== null ? styled : `<img src="${image.url}" alt="${data.heading || ""}"${legacyBorder}>`;
                }).join("")}
            </div>
            ` : ""}
        </section>
    `;

    },

    // 首頁專用：從作品集挑幾支影片，置中放大＋左右露出下一支的輪播，中間那支才有播放鈕
    videoCarousel: (data) => {

        const items = data.items || [];

        if (items.length === 0) {
            return "";
        }

        const radius = data.cornerStyle === "sharp" ? "0" : "10px";

        return `
        <div class="video-carousel" style="--carousel-radius:${radius};">

            <div class="video-carousel-track">
                ${items.map((item, index) => {

                    const embedUrl = item.videoUrl ? getEmbedUrl(item.videoUrl) : null;

                    const overlay = item.videoUrl
                        ? `
                        <div class="video-block-cover" data-embed-url="${embedUrl || ""}" data-video-url="${!embedUrl ? item.videoUrl : ""}">
                            <span class="video-block-play">▶</span>
                        </div>
                        `
                        : (item.href ? `<a class="video-carousel-link" href="${item.href}" aria-label="${item.title || ""}"></a>` : "");

                    return `
                    <div class="video-carousel-slide${index === 0 ? " active" : ""}" data-index="${index}" data-title="${item.title || ""}">
                        ${item.coverUrl ? renderCarouselCover(item.coverUrl, item.title) : `<div class="video-block-placeholder"></div>`}
                        ${overlay}
                    </div>
                    `;

                }).join("")}
            </div>

            ${items.length > 1 ? `
            <button type="button" class="video-carousel-prev" aria-label="上一部">‹</button>
            <button type="button" class="video-carousel-next" aria-label="下一部">›</button>
            ` : ""}

        </div>

        ${items.length > 1 ? `
        <div class="video-carousel-dots">
            ${items.map((_, index) => `<button type="button" class="video-carousel-dot${index === 0 ? " active" : ""}" data-index="${index}" aria-label="第 ${index + 1} 部"></button>`).join("")}
        </div>
        ` : ""}

        <p class="video-carousel-caption">${items[0].title || ""}</p>
        `;

    },

    // 贊助商跑馬燈：橫向無限捲動，預設黑白，hover 單一 LOGO 才變回原色（見 style.css .sponsor-marquee）
    // 分兩排顯示，奇偶交錯分配讓兩排數量平均；第二排反方向捲動，視覺上比兩排同方向更有層次
    sponsorMarquee: (data) => {

        const logos = data.logos || [];

        if (logos.length === 0) {
            return "";
        }

        const rows = [[], []];
        logos.forEach((logo, index) => rows[index % 2].push(logo));

        // 複製一份接在後面，搭配 CSS 動畫剛好捲動一組的寬度，銜接處看不出來是從頭開始
        const renderRow = (rowLogos, reverse) => {

            if (rowLogos.length === 0) {
                return "";
            }

            const renderLogos = () => rowLogos.map(logo => `
                <div class="sponsor-marquee-item">
                    <img src="${logo.url}" alt="${logo.alt || ""}" decoding="async">
                </div>
            `).join("");

            return `
            <div class="sponsor-marquee-track${reverse ? " sponsor-marquee-track--reverse" : ""}">
                ${renderLogos()}
                ${renderLogos()}
            </div>
            `;

        };

        const LOGO_SIZES = { small: "40px", medium: "56px", large: "76px", xlarge: "104px" };
        const logoHeight = LOGO_SIZES[data.logoSize] || LOGO_SIZES.medium;

        return `
        <div class="sponsor-marquee" style="--marquee-logo-size:${logoHeight};">
            ${renderRow(rows[0], false)}
            ${renderRow(rows[1], true)}
        </div>
        `;

    },

    // 服務項目宮格：照片＋標題卡片，滑鼠移過去標題變強調色，點下去連到自己填的網址（通常是某個自訂頁面或分類篩選連結）
    serviceGrid: (data) => {

        const items = data.items || [];

        if (items.length === 0) {
            return "";
        }

        return `
        <div class="service-grid"${data.accentColor ? ` style="--service-accent:${data.accentColor};"` : ""}>
            ${items.map(item => `
            <a href="${item.link || "#"}" class="service-grid-item">
                <div class="service-grid-media">
                    ${item.url ? `<img src="${item.url}" alt="${item.title || ""}" loading="lazy">` : ""}
                </div>
                ${item.title ? `<span class="service-grid-label">${item.title}</span>` : ""}
            </a>
            `).join("")}
        </div>
        `;

    },

    imageGallery: (data) => {

        const images = data.images || [];

        if (images.length === 0) {
            return "";
        }

        return `<div style="margin:0 0 20px;">${renderGallery(images, data.galleryLayout || "grid", "")}</div>`;

    },

    // 只支援一頁一個（跟 contactForm 一樣的既有慣例），DOM id 沒有用 moduleId 做隔離
    bookingWidget: (data, context = {}) => {

        const services = context.bookingServices || [];
        const staff = context.bookingStaff || [];

        if (services.length === 0 || staff.length === 0) {
            return `<p class="hint">目前尚未開放線上預約，請透過聯絡我頁面與我們聯繫。</p>`;
        }

        return `
        <div class="booking-step" id="step-service">

            <h3>1. 選擇服務</h3>

            <div class="booking-options">
                ${services.map(service => `
                    <button type="button" class="booking-option" data-id="${service.id}" data-duration="${service.duration}">
                        <strong>${service.name}</strong>
                        <span>${service.duration} 分鐘${service.price ? ` · ${service.price}` : ""}</span>
                    </button>
                `).join("")}
            </div>

        </div>

        <div class="booking-step" id="step-staff" style="display:none;">

            <h3>2. 選擇供應者</h3>

            <div class="booking-options">
                ${staff.map(member => `
                    <button type="button" class="booking-option" data-id="${member.id}">
                        ${member.avatarUrl ? `<img src="${member.avatarUrl}" alt="${member.name}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">` : ""}
                        <strong>${member.name}</strong>
                    </button>
                `).join("")}
            </div>

        </div>

        <div class="booking-step" id="step-datetime" style="display:none;">

            <h3>3. 選擇日期與時間</h3>

            <input type="date" id="booking-date" class="form-card">

            <div id="booking-slots" class="booking-options"></div>

        </div>

        <div class="booking-step" id="step-contact" style="display:none;">

            <h3>4. 聯絡資訊</h3>

            <form id="booking-form" class="form-card">

                <div class="hp-field" aria-hidden="true">
                    <label>Website<input type="text" name="hp_website" tabindex="-1" autocomplete="off"></label>
                </div>

                <label>
                    姓名
                    <input type="text" name="customerName" required>
                </label>

                <label>
                    Email
                    <input type="email" name="customerEmail" required>
                </label>

                <label>
                    電話（選填）
                    <input type="text" name="customerPhone">
                </label>

                <label>
                    備註（選填）
                    <textarea name="note" rows="3"></textarea>
                </label>

                <p id="booking-error" class="error"></p>

                <button type="submit" class="btn-primary">確認預約</button>

            </form>

        </div>

        <div class="booking-step" id="step-success" style="display:none;">

            <p class="hint">預約成功！我們會盡快與您聯繫確認。</p>

        </div>

        <script>
        (function () {

            var selected = { serviceId: null, duration: null, staffId: null, date: null, startTime: null };

            var stepService = document.getElementById("step-service");
            var stepStaff = document.getElementById("step-staff");
            var stepDatetime = document.getElementById("step-datetime");
            var stepContact = document.getElementById("step-contact");
            var stepSuccess = document.getElementById("step-success");

            var dateInput = document.getElementById("booking-date");
            var slotsContainer = document.getElementById("booking-slots");

            var today = new Date().toISOString().slice(0, 10);
            dateInput.min = today;

            function selectOption(container, button) {
                container.querySelectorAll(".booking-option").forEach(function (el) {
                    el.classList.remove("selected");
                });
                button.classList.add("selected");
            }

            stepService.querySelectorAll(".booking-option").forEach(function (btn) {
                btn.addEventListener("click", function () {

                    selected.serviceId = btn.getAttribute("data-id");
                    selected.duration = btn.getAttribute("data-duration");

                    selectOption(stepService, btn);

                    stepStaff.style.display = "";
                    stepDatetime.style.display = "none";
                    stepContact.style.display = "none";

                });
            });

            stepStaff.querySelectorAll(".booking-option").forEach(function (btn) {
                btn.addEventListener("click", function () {

                    selected.staffId = btn.getAttribute("data-id");

                    selectOption(stepStaff, btn);

                    stepDatetime.style.display = "";
                    stepContact.style.display = "none";
                    slotsContainer.innerHTML = "";

                    if (dateInput.value) {
                        loadSlots();
                    }

                });
            });

            function loadSlots() {

                selected.date = dateInput.value;
                slotsContainer.innerHTML = "<p>載入中...</p>";

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
                            btn.className = "booking-option";
                            btn.textContent = slot.startTime;

                            btn.addEventListener("click", function () {

                                selected.startTime = slot.startTime;

                                selectOption(slotsContainer, btn);

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

            document.getElementById("booking-form").addEventListener("submit", function (event) {

                event.preventDefault();

                var errorEl = document.getElementById("booking-error");
                errorEl.textContent = "";

                var formData = new FormData(event.target);

                fetch("/booking", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        serviceId: selected.serviceId,
                        staffId: selected.staffId,
                        date: selected.date,
                        startTime: selected.startTime,
                        customerName: formData.get("customerName"),
                        customerEmail: formData.get("customerEmail"),
                        customerPhone: formData.get("customerPhone"),
                        note: formData.get("note"),
                        hp_website: formData.get("hp_website")
                    })
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {

                        if (!data.success) {
                            errorEl.textContent = data.message || "預約失敗，請重新選擇時段";
                            loadSlots();
                            return;
                        }

                        stepService.style.display = "none";
                        stepStaff.style.display = "none";
                        stepDatetime.style.display = "none";
                        stepContact.style.display = "none";
                        stepSuccess.style.display = "";

                    })
                    .catch(function () {
                        errorEl.textContent = "預約失敗，請稍後再試";
                    });

            });

        })();
        </script>
        `;

    },

    contactForm: (data, context = {}) => `
        <form class="form-card" method="POST" action="/contact">

            ${context.sent ? `<p class="hint">感謝留言，我們收到了！</p>` : ""}

            <div class="hp-field" aria-hidden="true">
                <label>Website<input type="text" name="hp_website" tabindex="-1" autocomplete="off"></label>
            </div>

            <label>
                姓名
                <input type="text" name="name" placeholder="請輸入您的姓名" required>
            </label>

            <label>
                Email
                <input type="email" name="email" placeholder="請輸入您的 Email" required>
            </label>

            <label>
                主旨
                <input type="text" name="subject" placeholder="請輸入諮詢主旨，例如：婚禮紀錄詢價" required>
            </label>

            <label>
                訊息
                <textarea name="message" rows="5" placeholder="請輸入想留言的內容" required></textarea>
            </label>

            ${context.recaptchaSiteKey ? `<div class="g-recaptcha" data-sitekey="${context.recaptchaSiteKey}"></div>` : ""}

            <button type="submit" class="btn-primary">送出</button>

        </form>

        ${context.recaptchaSiteKey ? `<script src="https://www.google.com/recaptcha/api.js" async defer></script>` : ""}
    `

};

// 有些模組類型連續出現時要包在共用容器裡（時間軸、服務流程），這裡統一處理分組跟容器包裝
const GROUPED_TYPES = {
    timelineItem: inner => `<ul class="timeline">${inner}</ul>`,
    faqItem: inner => `<div class="faq-list">${inner}</div>`,
    processStep: inner => `<div class="process-steps">${inner}</div>`,
    featureCard: inner => `<div class="feature-grid">${inner}</div>`
};

// 背景設定的識別碼：同樣的 signature 才會被當成「同一種色塊」合併在一起（見 renderModules 的第二輪合併）。
// custom 顏色不同（即使都是 background === "custom"）也要視為不同色塊，不能混在一起
function backgroundSignature(module) {

    if (!module) {
        return "none";
    }

    if (module.background === "custom" && module.backgroundColor) {
        return `custom:${module.backgroundColor}`;
    }

    if (module.background === "alt") {
        return "alt";
    }

    return "none";

}

// 淺色系用深色字、深色系用白字，避免自訂顏色太深時文字看不清楚
function pickReadableTextColor(hex) {

    const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");

    if (!match) {
        return null;
    }

    const value = match[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.6 ? "#1a1a1a" : "#ffffff";

}

// 把同一種背景 signature 的一組 HTML 片段包成一個 .content-module，做出色塊分段效果，
// 見 public/css/style.css 的 .content-module--alt；自訂顏色沒辦法寫死在 CSS class 裡，用 inline style
function wrapGroup(htmlParts, signature) {

    const html = htmlParts.join("");

    if (!html.trim()) {
        return "";
    }

    if (signature === "alt") {
        return `<div class="content-module content-module--alt">${html}</div>`;
    }

    if (signature.indexOf("custom:") === 0) {

        const color = signature.slice(7);
        const textColor = pickReadableTextColor(color);
        const style = textColor ? `background:${color};color:${textColor};` : `background:${color};`;

        return `<div class="content-module content-module--custom" style="${style}">${html}</div>`;

    }

    return `<div class="content-module">${html}</div>`;

}

function renderModules(modules, context = {}) {

    // 第一輪：照原本邏輯把每個模組（或連續同類型分組，例如連續的 featureCard）渲染成 HTML 片段，
    // 每個片段先記著自己的背景設定，暫時不包 .content-module
    const pieces = [];
    let buffer = [];
    let bufferType = null;
    let bufferModule = null;
    let stepCount = 0;

    function flushBuffer() {

        if (buffer.length > 0 && bufferType) {
            pieces.push({
                html: GROUPED_TYPES[bufferType](buffer.join("")),
                // 同一組裡背景不一致的話，用第一個項目的設定——這類模組本來就是合併成同一個容器（例如同一個 feature-grid），分開上色沒意義
                signature: backgroundSignature(bufferModule)
            });
        }

        buffer = [];
        bufferType = null;
        bufferModule = null;

    }

    (modules || []).forEach(module => {

        const renderer = MODULE_RENDERERS[module.type];

        if (!renderer) {
            return;
        }

        if (GROUPED_TYPES[module.type]) {

            if (bufferType && bufferType !== module.type) {
                flushBuffer();
            }

            bufferType = module.type;

            if (!bufferModule) {
                bufferModule = module;
            }

            if (module.type === "processStep") {
                stepCount += 1;
                buffer.push(renderer(module.data || {}, { ...context, stepNumber: stepCount }));
            } else {
                buffer.push(renderer(module.data || {}, context));
            }

            return;

        }

        flushBuffer();
        pieces.push({ html: renderer(module.data || {}, context), signature: backgroundSignature(module) });

    });

    flushBuffer();

    // 第二輪：background signature 一樣的相鄰片段合併成同一塊 .content-module，
    // 連續設定同一種色塊的模組才會連成一整塊，不是一條一條分開、中間露出頁面底色的間隙
    const groups = [];

    pieces.forEach(piece => {

        if (!piece.html || !piece.html.trim()) {
            return;
        }

        const last = groups[groups.length - 1];

        if (last && last.signature === piece.signature) {
            last.parts.push(piece.html);
        } else {
            groups.push({ signature: piece.signature, parts: [piece.html] });
        }

    });

    return groups.map(group => wrapGroup(group.parts, group.signature)).join("") + faqSchema(modules);

}

// 頁面上有「常見問題」模組就輸出 FAQPage 結構化資料（GEO／SEO：讓 Google 和 AI 搜尋直接讀到問與答）
function faqSchema(modules) {

    const faqs = (modules || []).filter(module => module.type === "faqItem" && module.data && module.data.question && module.data.answer);

    if (faqs.length === 0) {
        return "";
    }

    const toText = html => String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(module => ({
            "@type": "Question",
            name: module.data.question,
            acceptedAnswer: { "@type": "Answer", text: toText(module.data.answer) }
        }))
    };

    return `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;

}

module.exports = { renderModules };
