const layout = require("./layout");
const { coverStyleAttr } = require("../services/coverPosition");
const { formatDisplayDate } = require("../services/publishHelper");
const { SITE_URL } = require("../config/site");
const { getThumbnailUrl } = require("../services/videoEmbed");

// 分類清單型自訂頁面的清單頁，比照 views/projects.js / views/blogList.js 的結構通用化，
// 分類篩選標籤沿用 public/js/main.js 既有的 .works-filter/.work-card[data-category] 前端篩選邏輯，
// 那段 JS 本來就是用 class 選取、不綁定特定頁面，這裡不用另外改
// 分類只開放一層子分類：頂層分類的篩選鈕額外帶 data-match（自己＋所有子分類 id），
// 點下去除了自己也會一併顯示子分類底下的項目；子分類鈕只比對自己
module.exports = (page, items, categories, navPages = [], settings = {}, navItems = []) => {

  const isArticle = page.contentKind === "article";
  const usedCategoryIds = new Set(items.map(item => item.category).filter(Boolean));
  const topLevelCategories = categories.filter(cat => !cat.parentCategoryId);

  const filterEntries = topLevelCategories
    .map(top => {
      // 有填分類說明的分類，就算還沒有作品也列出來（點進去至少看得到說明文字），沒作品也沒說明的才藏起來
      const isShown = cat => usedCategoryIds.has(cat.id) || Boolean(cat.description);
      const children = categories.filter(cat => cat.parentCategoryId === top.id && isShown(cat));
      if (!isShown(top) && children.length === 0) {
        return null;
      }
      return { top, children };
    })
    .filter(Boolean);

  // 只有照片的作品清單（平面作品）用瀑布流：封面照原始比例顯示，直式不會被裁成橫式，直橫混在一起自然交錯；
  // 有影片的清單（動態作品）和文章清單維持方格排版，影片統一 16:9 每排對齊
  const hasVideo = items.some(item => getThumbnailUrl(item.link)
    || (item.coverImage && item.coverImage.type === "video")
    || (item.images && item.images.length > 0 && item.images[0].type === "video"));
  const listLayout = !isArticle && !hasVideo ? "masonry" : "grid";

  const pageSettings = page.metaDescription ? { ...settings, metaDescription: page.metaDescription } : settings;

  // 麵包屑：首頁 | FILM | 目前分類，分類那層由 main.js 依照目前選的分類標籤即時填入
  const pageMeta = {
    url: `${SITE_URL}/p/${page.slug}`,
    breadcrumbs: [{ label: page.title, href: `/p/${page.slug}` }, { categorySlot: true }],
    breadcrumbSide: true
  };

  return layout(
    page.title,
    `
<section class="section">

    <div class="section-head">

        <h2 id="live-title" class="collection-list-title collection-list-title--${page.titleSize || "medium"}">
            ${page.title}
        </h2>

        ${page.subtitle ? `<p class="collection-list-subtitle">${page.subtitle}</p>` : ""}

    </div>

    ${filterEntries.length > 0 ? `
    <div class="works-filter">
        ${filterEntries.map(({ top, children }) => `
            <button type="button" class="works-filter-btn" data-filter="${top.id}" data-match="${[top.id, ...children.map(c => c.id)].join(",")}">${top.label}</button>
            ${children.map(child => `<button type="button" class="works-filter-btn works-filter-btn-sub" data-filter="${child.id}" data-match="${child.id}">${child.label}</button>`).join("")}
        `).join("")}
    </div>
    ` : ""}


    <div class="works-grid" data-layout="${listLayout}">

        ${items.length === 0 ? (filterEntries.length > 0 ? "" : "<p>目前尚無內容</p>") : items.map(item => {

            // 沒上傳封面也沒有相簿照片，但「連結」是 YouTube 影片時，用影片本身的縮圖當封面（參考樂圖：清單是影片縮圖，點進內頁才是播放器）
            const videoThumb = getThumbnailUrl(item.link);
            const cover = (item.coverImage && item.coverImage.url)
                || (item.images && item.images.length > 0 ? item.images[0].url : "")
                || (videoThumb ? videoThumb.replace("hqdefault", "maxresdefault") : "");
            const usesVideoThumb = !!videoThumb && cover === videoThumb.replace("hqdefault", "maxresdefault");

            // 封面是影片（相簿第一張標記 type:"video"）縮圖用 4:3，其餘照片一律 3:2，見 style.css 的 .work-card
            const coverIsVideo = (item.coverImage && item.coverImage.type === "video")
                || (item.images && item.images.length > 0 && item.images[0].type === "video");

            return `

        <a href="/p/${page.slug}/${item.slug}" class="work-card" data-category="${item.category || ""}" data-media-type="${usesVideoThumb ? "player" : coverIsVideo ? "video" : "image"}"${item.videoRatio === "9:16" ? ' data-video-ratio="portrait"' : ""}${item.coverRatio ? ` data-ratio="${item.coverRatio}"` : ""}>

            <div class="work-card-media">
                ${usesVideoThumb && item.videoRatio === "9:16"
                    // 直式短影音：用 maxresdefault（在 YouTube 換了自訂封面會跟著更新），中間的直式畫面放大裁切掉兩側背景。
                    // 不用 oar2 直式縮圖：那張是 YouTube 自動截的畫面，換了自訂封面也不會變（2026/10/06 回饋）
                    ? `<img class="yt-portrait-thumb" src="${cover}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='${videoThumb}'">`
                    : usesVideoThumb
                    // maxresdefault 畫質最好但不是每支影片都有，載入失敗就退回每支都有的 hqdefault
                    ? `<img src="${cover}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='${videoThumb}'">`
                    : cover ? `<img src="${cover}" alt="${item.title}" loading="lazy"${coverStyleAttr(item)}>` : ""}
                ${coverIsVideo ? `<span class="work-card-badge">影片</span>` : ""}
            </div>

            <figcaption>
                <h3>${item.title}</h3>
                ${isArticle ? `<p class="item-meta">${[formatDisplayDate(item.publishAt || item.createdAt), item.author].filter(Boolean).join(" · ")}</p>` : ""}
            </figcaption>

        </a>

        `;

        }).join("")}

    </div>

    ${filterEntries.length > 0 ? `<p class="works-empty" hidden>這個分類目前尚無作品</p>` : ""}


</section>
`,
    navPages,
    pageSettings,
    navItems,
    pageMeta
  );

};
