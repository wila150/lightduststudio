console.log("Portfolio Web");

// 首頁「精選作品側邊選單」：點左側標題切換右側大圖，純前端切換不跳轉頁面。
// 如果該作品有附影片（data-embed-url／data-video-url），切到它的時候直接嵌入播放（跟首頁背景影片同一套做法），
// 影片元素是動態插入/移除的，不是每張都預先放好——不然沒被選到的那幾個影片也會在背景偷跑載入、佔頻寬
(function () {

    var list = document.querySelector(".featured-sidebar-list");

    if (!list) {
        return;
    }

    var items = list.querySelectorAll(".featured-sidebar-item");
    var slides = document.querySelectorAll(".featured-sidebar-slide");

    function setSlideMedia(slide, playing) {

        var media = slide.querySelector(".featured-sidebar-media");
        var embedUrl = slide.getAttribute("data-embed-url");
        var videoUrl = slide.getAttribute("data-video-url");

        var existingFrame = media.querySelector("iframe, video");

        if (existingFrame) {
            existingFrame.remove();
        }

        if (!playing || (!embedUrl && !videoUrl)) {
            return;
        }

        if (embedUrl) {

            var iframe = document.createElement("iframe");
            iframe.src = embedUrl;
            iframe.setAttribute("allow", "autoplay; fullscreen");
            iframe.setAttribute("frameborder", "0");
            media.appendChild(iframe);

        } else if (videoUrl) {

            var video = document.createElement("video");
            video.src = videoUrl;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            media.appendChild(video);

        }

    }

    function activate(index) {

        items.forEach(function (i) { i.classList.remove("active"); });
        slides.forEach(function (s) {
            s.classList.remove("active");
            setSlideMedia(s, false);
        });

        var item = list.querySelector('.featured-sidebar-item[data-index="' + index + '"]');
        var slide = document.querySelector('.featured-sidebar-slide[data-index="' + index + '"]');

        if (item) {
            item.classList.add("active");
        }

        if (slide) {
            slide.classList.add("active");
            setSlideMedia(slide, true);
        }

    }

    items.forEach(function (item) {

        item.addEventListener("click", function () {
            activate(item.getAttribute("data-index"));
        });

    });

    var initialActive = list.querySelector(".featured-sidebar-item.active");

    if (initialActive) {
        setSlideMedia(document.querySelector('.featured-sidebar-slide[data-index="' + initialActive.getAttribute("data-index") + '"]'), true);
    }

    // 沒有影片、單一作品自己有多張照片時，箭頭讓你直接在側邊選單裡左右瀏覽那組照片，
    // 用 preventDefault + stopPropagation 擋掉外層 <a> 的頁面跳轉，純粹只是切照片
    slides.forEach(function (slide) {

        var photos = slide.querySelectorAll(".featured-sidebar-photo");

        if (photos.length < 2) {
            return;
        }

        function showPhoto(delta) {

            var current = slide.querySelector(".featured-sidebar-photo.active");
            var currentIndex = current ? parseInt(current.getAttribute("data-photo-index"), 10) : 0;
            var nextIndex = (currentIndex + delta + photos.length) % photos.length;

            photos.forEach(function (p) { p.classList.remove("active"); });
            slide.querySelector('.featured-sidebar-photo[data-photo-index="' + nextIndex + '"]').classList.add("active");

        }

        var prevBtn = slide.querySelector(".featured-sidebar-nav-prev");
        var nextBtn = slide.querySelector(".featured-sidebar-nav-next");

        if (prevBtn) {
            prevBtn.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                showPhoto(-1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                showPhoto(1);
            });
        }

    });

})();

// 平面作品列表「照片牆」排版（2026/10/31 回饋選的 D 方案）：每一排高度一樣，寬度照每張封面的比例分配，
// 直式窄、橫式寬，排滿一整排剛好對齊左右兩邊，照片不裁切、順序由左到右。
// 比例由伺服器先量好放在 data-ratio（services/imageRatio.js），量不到的用 3:2。
// 分類篩選切換、視窗寬度改變時重排；沒有 JS 時退回 CSS 多欄
(function () {

    var grids = Array.from(document.querySelectorAll('.works-grid[data-layout="masonry"]'));

    if (!grids.length) {
        return;
    }

    function targetHeight() {
        if (window.innerWidth <= 600) return 150;
        if (window.innerWidth <= 900) return 240;
        return 320;
    }

    function gapSize() {
        return window.innerWidth <= 600 ? 8 : 16;
    }

    function layout() {

        var target = targetHeight();
        var gap = gapSize();

        grids.forEach(function (grid) {

            grid.classList.add("is-justified");
            grid.style.setProperty("--justify-gap", gap + "px");

            var width = grid.clientWidth;
            var cards = Array.from(grid.querySelectorAll(".work-card")).filter(function (card) {
                return card.style.display !== "none";
            });

            var row = [];
            var ratioSum = 0;

            function place(rowCards, height) {
                rowCards.forEach(function (card) {
                    var ratio = parseFloat(card.getAttribute("data-ratio")) || 1.5;
                    card.style.width = Math.floor(ratio * height) + "px";
                    var img = card.querySelector(".work-card-media img");
                    if (img) img.style.height = Math.round(height) + "px";
                });
            }

            cards.forEach(function (card) {
                var ratio = parseFloat(card.getAttribute("data-ratio")) || 1.5;
                row.push(card);
                ratioSum += ratio;
                // 這一排用目標高度排起來已經超過容器寬：把高度縮到剛好排滿一整排
                var rowWidth = ratioSum * target + gap * (row.length - 1);
                if (rowWidth >= width) {
                    place(row, (width - gap * (row.length - 1)) / ratioSum);
                    row = [];
                    ratioSum = 0;
                }
            });

            // 最後一排不夠滿（分類只有幾件作品時，常常整個分類就這一排）：
            // 拉滿後高度不超過一般排的 1.5 倍就拉滿左右對齊；張數太少、拉滿會太大的就維持目標高度置中，不要只靠左
            grid.classList.remove("is-last-centered");
            if (row.length) {
                var fillHeight = (width - gap * (row.length - 1)) / ratioSum;
                if (fillHeight <= target * 1.5) {
                    place(row, fillHeight);
                } else {
                    place(row, target);
                    grid.classList.add("is-last-centered");
                }
            }

        });

    }

    var pending = null;
    function schedule() {
        if (pending) return;
        pending = requestAnimationFrame(function () { pending = null; layout(); });
    }

    window.relayoutWorksMasonry = layout;
    window.addEventListener("resize", schedule);
    layout();

})();

// 首頁作品輪播（OUR WORKS／PHOTOGRAPH）進場動畫：捲到畫面裡（或一載入就在畫面裡）時，
// 中間那張往上浮現、左右兩張從兩側滑進來。先藏起來是 JS 加的 is-pending，沒有 JS 就照常直接顯示
(function () {

    var carousels = Array.from(document.querySelectorAll(".video-carousel"));

    if (!carousels.length || !("IntersectionObserver" in window)) {
        return;
    }

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var carousel = entry.target;
            observer.unobserve(carousel);
            carousel.classList.remove("is-pending");
            carousel.classList.add("is-entering");
            setTimeout(function () { carousel.classList.remove("is-entering"); }, 1600);
        });
    }, { threshold: 0.2 });

    carousels.forEach(function (carousel) {
        carousel.classList.add("is-pending");
        observer.observe(carousel);
    });

})();

// 作品內頁石版相簿：照片照檔名順序「由左到右」排。CSS 多欄是一欄排滿才換下一欄（第一欄 1 2 3、第二欄 4 5 6），
// 跟資料夾的編號順序對不起來。這裡依序把每張放進目前最矮的那一欄，讀起來是 1 2 3 / 4 5 6，各欄高度也差不多。
// 照片還沒載入時先用 3:2 估高度，每張載入後重新排一次；沒有 JS 時退回 CSS 多欄
(function () {

    var grids = Array.from(document.querySelectorAll('.gallery-grid[data-layout="masonry"]'));

    if (!grids.length) {
        return;
    }

    var GAP = 20;

    function columnCount() {
        if (window.innerWidth <= 600) return 1;
        if (window.innerWidth <= 900) return 2;
        return 3;
    }

    var states = grids.map(function (grid) {
        var items = Array.from(grid.querySelectorAll(".gallery-item"));
        items.forEach(function (item, i) { item.setAttribute("data-order", i); });
        return { grid: grid, items: items };
    });

    function estimatedHeight(item, width) {
        var img = item.querySelector("img");
        var ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 2 / 3;
        return width * ratio + GAP;
    }

    function layout() {

        var count = columnCount();

        states.forEach(function (state) {

            var width = (state.grid.clientWidth - GAP * (count - 1)) / count;
            var columns = [];
            var heights = [];

            for (var i = 0; i < count; i++) {
                var col = document.createElement("div");
                col.className = "gallery-masonry-col";
                columns.push(col);
                heights.push(0);
            }

            state.items.forEach(function (item) {
                var shortest = heights.indexOf(Math.min.apply(null, heights));
                columns[shortest].appendChild(item);
                heights[shortest] += estimatedHeight(item, width);
            });

            state.grid.querySelectorAll(".gallery-masonry-col").forEach(function (old) { old.remove(); });
            columns.forEach(function (col) { state.grid.appendChild(col); });
            state.grid.classList.add("is-columns");

        });

    }

    var pending = null;
    function schedule() {
        if (pending) return;
        pending = requestAnimationFrame(function () { pending = null; layout(); });
    }

    states.forEach(function (state) {
        state.items.forEach(function (item) {
            var img = item.querySelector("img");
            if (img && !img.complete) img.addEventListener("load", schedule);
        });
    });

    var lastCount = columnCount();
    window.addEventListener("resize", function () {
        if (columnCount() !== lastCount) {
            lastCount = columnCount();
            schedule();
        }
    });

    layout();

})();

// 作品集分類篩選標籤：純前端切換 .work-card 顯示/隱藏，不重新載入頁面
(function () {

    var buttons = document.querySelectorAll(".works-filter-btn");
    var cards = document.querySelectorAll(".work-card[data-category]");
    var emptyNote = document.querySelector(".works-empty");

    // 分類有填說明時，就算還沒有作品也會出現篩選標籤，所以只要有標籤就要啟用（不能因為沒有作品卡片就整段跳過）
    if (!buttons.length) {
        return;
    }

    function applyFilter(filter) {

        buttons.forEach(function (b) {
            b.classList.toggle("active", b.getAttribute("data-filter") === filter);
        });

        // 頂層分類的按鈕會多帶 data-match（自己＋所有子分類 id），點下去連子分類底下的項目也一併顯示；
        // 子分類按鈕跟沒有子分類的按鈕，data-match 就只有自己
        var activeBtn = Array.prototype.filter.call(buttons, function (b) {
            return b.getAttribute("data-filter") === filter;
        })[0];

        var matchList = activeBtn ? (activeBtn.getAttribute("data-match") || filter).split(",") : [filter];

        var visibleCount = 0;

        cards.forEach(function (card) {
            var show = filter === "all" || matchList.indexOf(card.getAttribute("data-category")) !== -1;
            card.style.display = show ? "" : "none";
            if (show) {
                visibleCount++;
            }
        });

        if (emptyNote) {
            emptyNote.hidden = visibleCount > 0;
        }

        if (window.relayoutWorksMasonry) {
            window.relayoutWorksMasonry();
        }

        // 麵包屑最後一層換成目前的分類（可以點，連到這個分類），網址也同步帶上 ?category=，
        // 從作品內頁按瀏覽器上一頁回來時會停在同一個分類
        var crumb = document.querySelector("[data-crumb-category]");
        var categoryHref = window.location.pathname + "?category=" + encodeURIComponent(filter);

        if (crumb && activeBtn) {
            crumb.innerHTML = "";
            var link = document.createElement("a");
            link.href = categoryHref;
            link.textContent = activeBtn.textContent.trim();
            crumb.appendChild(link);
            crumb.hidden = false;
        }

        if (activeBtn && window.history && window.history.replaceState) {
            window.history.replaceState(null, "", categoryHref);
        }

    }

    buttons.forEach(function (btn) {

        btn.addEventListener("click", function () {
            applyFilter(btn.getAttribute("data-filter"));
        });

    });

    // 從導覽列分類下拉選單連結進來時（?category=xxx），直接套用對應的篩選標籤；
    // 沒有指定分類（第一次進到這個清單頁）預設也只顯示第一個分類，不要一次全部攤開，
    // 使用者要看別的分類自己點分類標籤切換
    var requestedCategory = new URLSearchParams(window.location.search).get("category");
    var hasMatchingButton = requestedCategory && Array.prototype.some.call(buttons, function (b) {
        return b.getAttribute("data-filter") === requestedCategory;
    });

    if (hasMatchingButton) {
        applyFilter(requestedCategory);
    } else {
        applyFilter(buttons[0].getAttribute("data-filter"));
    }

})();

// 手機版全螢幕漢堡選單
(function () {

    var toggle = document.getElementById("mobile-menu-toggle");
    var overlay = document.getElementById("mobile-nav-overlay");
    var closeBtn = document.getElementById("mobile-nav-close");

    if (!toggle || !overlay) {
        return;
    }

    function openMenu() {
        overlay.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    }

    function closeMenu() {
        overlay.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    }

    // 目前所在頁面的主連結用主色標示（比對路徑，不含 ?category= 這類查詢參數；首頁只在 "/" 時才算）
    var currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    overlay.querySelectorAll(".mobile-nav-group-head > a").forEach(function (link) {
        var linkPath = new URL(link.href, window.location.origin).pathname.replace(/\/+$/, "") || "/";
        if (linkPath === currentPath || (linkPath !== "/" && currentPath.indexOf(linkPath + "/") === 0)) {
            link.classList.add("is-current");
        }
    });

    toggle.addEventListener("click", openMenu);

    if (closeBtn) {
        closeBtn.addEventListener("click", closeMenu);
    }

    overlay.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", closeMenu);
    });

    overlay.querySelectorAll(".mobile-nav-toggle").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var group = btn.closest(".mobile-nav-group");
            if (!group) {
                return;
            }
            var isOpen = group.classList.toggle("is-open");
            btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

})();

// 首頁影片 Hero：導覽列一開始透明疊在影片上，捲動離開 hero 區塊後才變回實色背景
(function () {

    var header = document.querySelector(".site-header");
    var hero = document.getElementById("hero-section");

    if (!header || !hero || !hero.classList.contains("has-video")) {
        return;
    }

    header.classList.add("header-overlay");
    // 全螢幕輪播佔滿整個畫面，導覽列要疊在上面，不再往下推內容
    if (hero.classList.contains("ld-hero")) document.body.classList.add("has-ld-hero");

    function update() {
        var pastHero = hero.getBoundingClientRect().bottom <= header.offsetHeight;
        header.classList.toggle("is-scrolled", pastHero);
    }

    update();
    document.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

})();

// 低干擾的捲動淡入效果：區塊/卡片進入畫面時淡入，只觸發一次
(function () {

    // 輪播的 gallery-item（.carousel-slide）自己控制 opacity 顯示/隱藏哪一張，
    // 若也套用這裡的淡入效果，一旦捲入畫面被加上 is-visible，opacity:1 的優先權會蓋過輪播本身的顯示狀態，導致切換失效
    var targets = document.querySelectorAll(".section-head, .work-card, .feature-card, .process-step, .gallery-item:not(.carousel-slide), .tl-item, .form-card, .split-feature-media");

    if (!targets.length) {
        return;
    }

    document.documentElement.classList.add("js-ready");

    // 同一個父層底下的卡片依序給 --i（0~5 循環），CSS 用它做輕微錯落進場的延遲；
    // 用父層分組計算，而不是整份文件的順序，避免頁面很下面的區塊也累加到很長的延遲
    var indexByParent = new Map();

    targets.forEach(function (el) {

        el.classList.add("reveal-on-scroll");

        var parent = el.parentElement;
        var index = indexByParent.get(parent) || 0;

        el.style.setProperty("--i", index % 6);
        indexByParent.set(parent, index + 1);

    });

    if (!("IntersectionObserver" in window)) {
        targets.forEach(function (el) {
            el.classList.add("is-visible");
        });
        return;
    }

    var observer = new IntersectionObserver(function (entries) {

        entries.forEach(function (entry) {

            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }

        });

    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    targets.forEach(function (el) {
        observer.observe(el);
    });

    // 保險（2026/10/03 回饋：照片要重新整理才會出現）：IntersectionObserver 在 Safari 的多欄（石版）排版、
    // 切換分類標籤讓卡片從 display:none 變回來、從上一頁返回（bfcache）時，偶爾不會觸發，照片就一直是透明的。
    // 捲動／縮放／載入完成時再用位置自己檢查一次，進到畫面裡的直接顯示
    var pending = Array.prototype.slice.call(targets);
    var scheduled = false;

    function revealInView() {
        scheduled = false;
        var viewHeight = window.innerHeight || document.documentElement.clientHeight;
        pending = pending.filter(function (el) {
            if (el.classList.contains("is-visible")) return false;
            if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return true; // 隱藏中（例如別的分類）
            var rect = el.getBoundingClientRect();
            if (rect.top < viewHeight && rect.bottom > 0) {
                el.classList.add("is-visible");
                observer.unobserve(el);
                return false;
            }
            return true;
        });
        if (!pending.length) {
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
        }
    }

    function schedule() {
        if (!scheduled) {
            scheduled = true;
            (window.requestAnimationFrame || setTimeout)(revealInView);
        }
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    document.addEventListener("click", function (event) {
        if (event.target.closest && event.target.closest(".works-filter-btn")) setTimeout(revealInView, 30);
    });
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) targets.forEach(function (el) { el.classList.add("is-visible"); });
    });
    setTimeout(revealInView, 600);

})();

// 相簿 lightbox：點縮圖全螢幕放大，可左右切換上一張/下一張，點背景或 Esc 關閉
(function () {

    function openLightbox(items, startIndex) {

        let index = startIndex;

        const overlay = document.createElement("div");
        overlay.className = "lightbox-overlay";

        const img = document.createElement("img");

        const counter = document.createElement("div");
        counter.className = "lightbox-counter";

        const showNav = items.length > 1;
        let prevBtn, nextBtn;

        if (showNav) {
            prevBtn = document.createElement("button");
            prevBtn.className = "lightbox-nav prev";
            prevBtn.type = "button";
            prevBtn.setAttribute("aria-label", "上一張");
            prevBtn.textContent = "‹";

            nextBtn = document.createElement("button");
            nextBtn.className = "lightbox-nav next";
            nextBtn.type = "button";
            nextBtn.setAttribute("aria-label", "下一張");
            nextBtn.textContent = "›";
        }

        function render() {
            const current = items[index];
            img.src = current.src;
            img.alt = current.alt || "";
            counter.textContent = (index + 1) + " / " + items.length;
        }

        function show(newIndex) {
            index = (newIndex + items.length) % items.length;
            render();
        }

        overlay.appendChild(img);
        if (showNav) {
            overlay.appendChild(prevBtn);
            overlay.appendChild(nextBtn);
        }
        overlay.appendChild(counter);
        document.body.appendChild(overlay);

        render();

        function close() {
            overlay.remove();
            document.removeEventListener("keydown", onKeydown);
        }

        function onKeydown(event) {
            if (event.key === "Escape") {
                close();
            } else if (showNav && event.key === "ArrowLeft") {
                show(index - 1);
            } else if (showNav && event.key === "ArrowRight") {
                show(index + 1);
            }
        }

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                close();
            }
        });

        if (showNav) {
            prevBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                show(index - 1);
            });
            nextBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                show(index + 1);
            });
        }

        document.addEventListener("keydown", onKeydown);

    }

    document.addEventListener("click", function (event) {

        const item = event.target.closest(".gallery-item");

        if (!item || item.classList.contains("gallery-item-video") || item.closest(".gallery-carousel")) {
            return;
        }

        const grid = item.closest(".gallery-grid");
        const gridItems = grid
            ? Array.from(grid.querySelectorAll(".gallery-item")).filter(function (el) {
                return !el.classList.contains("gallery-item-video");
            })
            : [item];

        // 石版相簿被 main.js 分到各欄後，畫面上的 DOM 順序不是照片原本的順序，用 data-order 排回來
        gridItems.sort(function (a, b) {
            return (+a.getAttribute("data-order") || 0) - (+b.getAttribute("data-order") || 0);
        });

        const items = gridItems.map(function (el) {
            const image = el.querySelector("img");
            return { src: image ? image.src : "", alt: image ? image.alt : "" };
        }).filter(function (entry) {
            return entry.src;
        });

        const startIndex = gridItems.indexOf(item);

        if (items.length) {
            openLightbox(items, Math.max(startIndex, 0));
        }

    });

})();

// 相簿：輪播排版（自動輪播 + 左右箭頭 + 指示點 + 中間大張、兩側縮小露出的層疊效果）
(function () {

    var AUTO_PLAY_INTERVAL = 4000;
    var SIDE_OFFSET_PERCENT = 62;
    var SIDE_SCALE = 0.82;
    var SIDE_OPACITY = 0.55;
    var FAR_OFFSET_PERCENT = 120;

    document.querySelectorAll(".gallery-carousel").forEach(function (carousel) {

        var slides = Array.from(carousel.querySelectorAll(".carousel-slide"));
        var dots = Array.from(carousel.querySelectorAll(".carousel-dot"));
        var prevBtn = carousel.querySelector(".carousel-prev");
        var nextBtn = carousel.querySelector(".carousel-next");
        var sibling = carousel.nextElementSibling;
        var captionEl = sibling && sibling.classList.contains("carousel-caption") ? sibling : null;
        var current = 0;
        var timer = null;

        if (slides.length <= 1) {
            return;
        }

        // 依照跟目前作用中那張的循環距離（考慮頭尾相接），決定要放多旁邊、縮多小、多透明
        function positionSlide(slide, diff) {

            var abs = Math.abs(diff);

            if (diff === 0) {
                slide.style.transform = "translateX(0) scale(1)";
                slide.style.opacity = "1";
                slide.style.zIndex = "3";
                slide.style.pointerEvents = "auto";
                return;
            }

            if (abs === 1) {
                slide.style.transform = "translateX(" + (diff * SIDE_OFFSET_PERCENT) + "%) scale(" + SIDE_SCALE + ")";
                slide.style.opacity = String(SIDE_OPACITY);
                slide.style.zIndex = "2";
                slide.style.pointerEvents = "auto";
                return;
            }

            slide.style.transform = "translateX(" + (diff > 0 ? FAR_OFFSET_PERCENT : -FAR_OFFSET_PERCENT) + "%) scale(.7)";
            slide.style.opacity = "0";
            slide.style.zIndex = "1";
            slide.style.pointerEvents = "none";

        }

        function show(index) {

            current = (index + slides.length) % slides.length;

            var total = slides.length;

            slides.forEach(function (slide, i) {

                var diff = i - current;

                if (diff > total / 2) {
                    diff -= total;
                } else if (diff < -total / 2) {
                    diff += total;
                }

                slide.classList.toggle("active", i === current);
                positionSlide(slide, diff);

            });

            dots.forEach(function (dot, i) {
                dot.classList.toggle("active", i === current);
            });

            if (captionEl) {
                captionEl.textContent = slides[current].getAttribute("data-caption") || "";
            }

        }

        function startAutoPlay() {
            stopAutoPlay();
            timer = setInterval(function () {
                show(current + 1);
            }, AUTO_PLAY_INTERVAL);
        }

        function stopAutoPlay() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        prevBtn.addEventListener("click", function () {
            show(current - 1);
            startAutoPlay();
        });

        nextBtn.addEventListener("click", function () {
            show(current + 1);
            startAutoPlay();
        });

        dots.forEach(function (dot, i) {
            dot.addEventListener("click", function () {
                show(i);
                startAutoPlay();
            });
        });

        // 點兩側露出的縮圖：先移到中間，不要直接觸發原本點擊會做的事（開燈箱/播放影片/跳轉連結）
        slides.forEach(function (slide, index) {
            slide.addEventListener("click", function (event) {

                if (index === current) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                show(index);
                startAutoPlay();

            });
        });

        carousel.addEventListener("mouseenter", stopAutoPlay);
        carousel.addEventListener("mouseleave", startAutoPlay);

        show(0);
        startAutoPlay();

    });

})();

// 影片區塊：點封面照全螢幕播放，點背景或 Esc 關閉
(function () {

    function openVideoOverlay(embedUrl, videoUrl) {

        const overlay = document.createElement("div");
        overlay.className = "lightbox-overlay";

        const wrap = document.createElement("div");
        wrap.className = "video-frame-wrap";

        let player;

        if (embedUrl) {
            player = document.createElement("iframe");
            player.src = embedUrl;
            player.allow = "autoplay; fullscreen";
            player.allowFullscreen = true;
        } else {
            player = document.createElement("video");
            player.src = videoUrl;
            player.controls = true;
            player.autoplay = true;
            player.playsInline = true;
        }

        wrap.appendChild(player);
        overlay.appendChild(wrap);
        document.body.appendChild(overlay);

        function close() {
            overlay.remove();
            document.removeEventListener("keydown", onKeydown);
        }

        function onKeydown(event) {
            if (event.key === "Escape") {
                close();
            }
        }

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                close();
            }
        });

        document.addEventListener("keydown", onKeydown);

    }

    document.addEventListener("click", function (event) {

        const cover = event.target.closest(".video-block-cover");

        if (!cover) {
            return;
        }

        const embedUrl = cover.getAttribute("data-embed-url");
        const videoUrl = cover.getAttribute("data-video-url");

        if (embedUrl || videoUrl) {
            openVideoOverlay(embedUrl, videoUrl);
        }

    });

})();

// 首頁「影片輪播」模組：中間放大＋左右露出下一支，點側邊那支切換過去，中間那支才能點播放
(function () {

    document.querySelectorAll(".video-carousel").forEach(function (carousel) {

        var slides = Array.from(carousel.querySelectorAll(".video-carousel-slide"));

        if (slides.length === 0) {
            return;
        }

        var caption = carousel.parentElement.querySelector(".video-carousel-caption");
        var prevBtn = carousel.querySelector(".video-carousel-prev");
        var nextBtn = carousel.querySelector(".video-carousel-next");
        var dots = Array.from(carousel.parentElement.querySelectorAll(".video-carousel-dot"));

        var activeIndex = slides.findIndex(function (slide) {
            return slide.classList.contains("active");
        });

        if (activeIndex === -1) {
            activeIndex = 0;
        }

        function render() {

            var total = slides.length;
            var prevIndex = (activeIndex - 1 + total) % total;
            var nextIndex = (activeIndex + 1) % total;

            slides.forEach(function (slide) {
                slide.classList.remove("active", "prev", "next");
                slide.style.display = "none";
            });

            slides[activeIndex].style.display = "";
            slides[activeIndex].classList.add("active");

            if (total > 1) {
                slides[prevIndex].style.display = "";
                slides[prevIndex].classList.add("prev");
            }

            if (total > 2) {
                slides[nextIndex].style.display = "";
                slides[nextIndex].classList.add("next");
            }

            if (caption) {
                caption.textContent = slides[activeIndex].getAttribute("data-title") || "";
            }

            dots.forEach(function (dot, index) {
                dot.classList.toggle("active", index === activeIndex);
            });

            fitTrack();

        }

        // 框的大小一律交給 CSS 固定（桌機 4:3、手機正方形），不跟著每張照片的比例變高變矮——
        // 2026/10/28 回饋：直式、橫式切換時整個輪播放大縮小、版面跳動。照片在固定框裡完整顯示（contain）
        function fitTrack() {}

        // 下面手機滑動會用到（上次拿掉 fitTrack 內容時一起刪掉了，滑動就會出錯）
        var track = carousel.querySelector(".video-carousel-track");
        var mobileQuery = window.matchMedia("(max-width: 720px)");

        function go(delta) {
            activeIndex = (activeIndex + delta + slides.length) % slides.length;
            render();
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", function () { go(-1); });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", function () { go(1); });
        }

        // 圓點：手機版走下面 slideTo 的滑動動畫，桌機 slideTo 內部會直接切換
        dots.forEach(function (dot, index) {
            dot.addEventListener("click", function () {
                if (index !== activeIndex) {
                    slideTo(index > activeIndex ? 1 : -1, index);
                }
            });
        });

        slides.forEach(function (slide, index) {

            slide.addEventListener("click", function () {

                if (slide.classList.contains("active")) {
                    return;
                }

                activeIndex = index;
                render();

            });

        });

        // 手機版沒有左右箭頭，靠左右滑動切換：拖曳時照片跟著手指走，放開後目前這張滑出、下一張從另一側滑入；
        // 拖不夠遠就彈回原位。桌機版維持原本的 3D 層疊切換，不走這段動畫
        var touchStartX = null;
        var touchStartY = null;
        var dragX = 0;
        var dragging = false;
        var animating = false;
        var EASE = "cubic-bezier(.22, .61, .36, 1)";

        function clearSlideStyle(slide) {
            slide.style.transition = "";
            slide.style.transform = "";
            slide.style.opacity = "";
        }

        // delta: 1 = 下一張（往左滑出），-1 = 上一張（往右滑出）；targetIndex 給圓點直接跳到某一張用
        function slideTo(delta, targetIndex) {

            if (animating || slides.length < 2) {
                return;
            }

            if (!mobileQuery.matches) {
                if (typeof targetIndex === "number") {
                    activeIndex = targetIndex;
                    render();
                } else {
                    go(delta);
                }
                return;
            }

            animating = true;

            var outgoing = slides[activeIndex];
            var outX = delta > 0 ? -100 : 100;

            outgoing.style.transition = "transform .26s " + EASE + ", opacity .26s ease";
            outgoing.style.transform = "translateX(" + outX + "%)";
            outgoing.style.opacity = "0";

            setTimeout(function () {

                clearSlideStyle(outgoing);

                activeIndex = typeof targetIndex === "number"
                    ? targetIndex
                    : (activeIndex + delta + slides.length) % slides.length;

                var incoming = slides[activeIndex];

                incoming.style.transition = "none";
                incoming.style.transform = "translateX(" + (-outX) + "%)";
                incoming.style.opacity = "0";

                render();

                // 強制瀏覽器先套用起始位置，下一步的 transition 才會真的有動畫
                void incoming.offsetWidth;

                incoming.style.transition = "transform .34s " + EASE + ", opacity .34s ease";
                incoming.style.transform = "translateX(0)";
                incoming.style.opacity = "1";

                setTimeout(function () {
                    clearSlideStyle(incoming);
                    animating = false;
                }, 360);

            }, 260);

        }

        carousel.addEventListener("touchstart", function (event) {

            if (animating) {
                return;
            }

            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
            dragX = 0;
            dragging = false;

        }, { passive: true });

        carousel.addEventListener("touchmove", function (event) {

            if (touchStartX === null || !mobileQuery.matches || slides.length < 2) {
                return;
            }

            var dx = event.touches[0].clientX - touchStartX;
            var dy = event.touches[0].clientY - touchStartY;

            // 還沒判斷方向時，垂直移動比較多就當作是捲動頁面，不接管
            if (!dragging) {
                if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
                    touchStartX = null;
                    return;
                }
                if (Math.abs(dx) < 8) {
                    return;
                }
                dragging = true;
            }

            dragX = dx;

            var active = slides[activeIndex];
            active.style.transition = "none";
            active.style.transform = "translateX(" + dx + "px)";
            active.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / (track.clientWidth * 1.4)));

        }, { passive: true });

        carousel.addEventListener("touchend", function (event) {

            if (touchStartX === null) {
                return;
            }

            var deltaX = dragging ? dragX : event.changedTouches[0].clientX - touchStartX;
            var wasDragging = dragging;

            touchStartX = null;
            dragging = false;

            if (Math.abs(deltaX) < 50) {

                // 拖不夠遠：彈回原位
                if (wasDragging) {
                    var active = slides[activeIndex];
                    active.style.transition = "transform .3s " + EASE + ", opacity .3s ease";
                    active.style.transform = "translateX(0)";
                    active.style.opacity = "1";
                    setTimeout(function () { clearSlideStyle(active); }, 320);
                }

                return;
            }

            slideTo(deltaX < 0 ? 1 : -1);

        });

        render();

    });

})();

(function () {

    var widget = document.getElementById("line-widget");
    var toggle = document.getElementById("line-widget-toggle");
    var closeBtn = document.getElementById("line-widget-close");

    if (!widget || !toggle) {
        return;
    }

    function isOpen() {
        return widget.classList.contains("is-open");
    }

    function close() {
        widget.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {

        if (isOpen()) {
            close();
            return;
        }

        widget.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");

    });

    if (closeBtn) {
        closeBtn.addEventListener("click", close);
    }

    document.addEventListener("click", function (event) {
        if (isOpen() && !widget.contains(event.target)) {
            close();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            close();
        }
    });

})();
// 作品內頁影片：先顯示封面，點了才換成 YouTube／Vimeo 播放器並自動播放
// （參考 blackbirdimagine.com；也省掉每次打開頁面都要先載入整個播放器）
(function () {

    document.querySelectorAll(".item-video-facade").forEach(function (facade) {

        facade.addEventListener("click", function () {

            var src = facade.getAttribute("data-player-url");
            var iframe = document.createElement("iframe");
            iframe.src = src + (src.indexOf("?") === -1 ? "?" : "&") + "autoplay=1";
            iframe.title = facade.getAttribute("data-title") || "";
            iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
            iframe.setAttribute("allowfullscreen", "");

            var player = document.createElement("div");
            // 直式短影音（item-video-player--portrait）點下去換成播放器後也要維持 9:16，不然會變回橫式
            player.className = facade.classList.contains("item-video-player--portrait") ? "item-video-player item-video-player--portrait" : "item-video-player";
            player.appendChild(iframe);
            facade.replaceWith(player);

        });

    });

})();


// 合作品牌跑馬燈：LOGO 都載入完才開始捲（寬度固定下來，動畫才不會中途跳動），最多等 3 秒（2026/10/03 卡頓回饋）
(function () {

    document.querySelectorAll(".sponsor-marquee").forEach(function (marquee) {

        var images = Array.prototype.slice.call(marquee.querySelectorAll("img"));
        var started = false;

        function start() {
            if (started) return;
            started = true;
            marquee.classList.add("is-ready");
        }

        var waiting = images.filter(function (img) { return !img.complete; });

        if (!waiting.length) {
            start();
            return;
        }

        var left = waiting.length;
        waiting.forEach(function (img) {
            var done = function () { if (--left <= 0) start(); };
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
        });

        setTimeout(start, 3000);

    });

})();

// 訪客追蹤（2026/10/03，給後台「即時統計」用，移植自 lightdustudio）：
// 匿名訪客 id 存在瀏覽器裡、只送網址，不收集個資；登入過後台的瀏覽器（bd_no_track）、後台預覽頁不計入
(function () {

    if (location.pathname.indexOf("/cms") === 0 || window.parent !== window) return;

    var visitorId;
    try {
        if (localStorage.getItem("bd_no_track") === "1") return;
        visitorId = localStorage.getItem("bd_vid");
        if (!visitorId) {
            visitorId = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem("bd_vid", visitorId);
        }
    } catch (e) {
        return;
    }

    function track(type) {
        var body = JSON.stringify({ vid: visitorId, type: type, path: location.pathname });
        try {
            if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
            else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
        } catch (e) {}
    }

    track("view");
    setInterval(function () { if (!document.hidden) track("ping"); }, 30000);

})();

// 首頁背景影片鋪滿（2026/10/06 回饋：Windows 首頁影片下方露出一截黑邊／色塊）
// 原本用 CSS 的 100vw／vh 算 iframe 大小，Windows 的捲軸寬度、顯示縮放（125%／150%）會讓 vw、vh 跟實際可視範圍對不上，
// 改成量 hero 區塊實際的寬高來算：保持 16:9、蓋滿整個區塊，上下再多留 140px，
// 讓 YouTube 播放器的標題列、底部的控制列／「更多影片」面板都落在畫面外
(function () {

    var hero = document.getElementById("hero-section");
    var iframe = hero && hero.querySelector(".hero-video-embed iframe");

    if (!iframe) return;

    function fit() {
        var rect = hero.getBoundingClientRect();
        var height = Math.max(rect.height + 280, rect.width * 9 / 16 * 1.12);
        var width = height * 16 / 9;
        if (width < rect.width * 1.12) {
            width = rect.width * 1.12;
            height = width * 9 / 16;
        }
        iframe.style.width = Math.ceil(width) + "px";
        iframe.style.height = Math.ceil(height) + "px";
        iframe.style.minWidth = "0";
        iframe.style.minHeight = "0";
        iframe.style.transform = "translate(-50%, -50%)";
    }

    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("load", fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(hero);

})();


// 全螢幕輪播主視覺：自動換張、點圓點切換、滑鼠停在上面時暫停
(function () {

    var hero = document.querySelector(".ld-hero");
    if (!hero) return;

    var slides = hero.querySelectorAll(".ld-hero-slide");
    var dots = hero.querySelectorAll(".ld-hero-dots button");
    if (slides.length < 2) return;

    var current = 0;
    var interval = parseInt(hero.getAttribute("data-interval"), 10) || 6000;
    var timer = null;

    function show(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach(function (slide, i) { slide.classList.toggle("is-active", i === current); });
        dots.forEach(function (dot, i) { dot.classList.toggle("is-active", i === current); });
    }
    function start() { stop(); timer = setInterval(function () { show(current + 1); }, interval); }
    function stop() { if (timer) clearInterval(timer); timer = null; }

    dots.forEach(function (dot, i) { dot.addEventListener("click", function () { show(i); start(); }); });

    // 左右滑動切換（手機用手指、電腦用滑鼠拖）：往左滑下一張、往右滑上一張；
    // 垂直移動比較多就當作捲動頁面不處理。按鈕、圓點上按下去不算，避免點按鈕被當成滑動
    var swipeX = null;
    var swipeY = null;
    hero.addEventListener("pointerdown", function (e) {
        if (e.target.closest("a, button")) return;
        swipeX = e.clientX;
        swipeY = e.clientY;
    });
    hero.addEventListener("pointerup", function (e) {
        if (swipeX === null) return;
        var dx = e.clientX - swipeX;
        var dy = e.clientY - swipeY;
        swipeX = null;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
        show(current + (dx < 0 ? 1 : -1));
        start();
    });
    hero.addEventListener("pointercancel", function () { swipeX = null; });
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    start();

})();

// Logo 圖片載入失敗（網路不穩、快取問題）：藏起破圖，改顯示網站名稱文字（.logo-fallback）。
// 網站的 CSP 不允許 onerror 這類行內事件，所以在這裡綁
(function () {
    document.querySelectorAll(".logo-image, .footer-logo img").forEach(function (img) {
        function fail() {
            img.style.display = "none"; // 不能只設 hidden：樣式表有寫 display 會蓋過它
            var fallback = img.nextElementSibling;
            if (fallback && fallback.classList.contains("logo-fallback")) fallback.hidden = false;
        }
        if (img.complete && img.naturalWidth === 0) fail();
        else img.addEventListener("error", fail);
    });
})();
