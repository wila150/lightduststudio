document.addEventListener('DOMContentLoaded', function () {
  /* -------------------------------------------------------------- */
  /* Site settings: brand, favicon, footer, contact info, SEO        */
  /* -------------------------------------------------------------- */
  fetch('/api/settings')
    .then(function (r) { return r.json(); })
    .then(function (s) {
      var favicon = document.querySelector('link[rel="icon"]');
      if (favicon && s.favicon_url) favicon.href = s.favicon_url;

      document.querySelectorAll('.brand-mark').forEach(function (img) {
        img.src = s.logo_url;
        img.alt = s.brand_name_zh + ' ' + s.brand_name_en;
      });

      var nameParts = (s.brand_name_en || '').trim().split(' ');
      var lastWord = nameParts.pop();
      var brandHtml = nameParts.length
        ? nameParts.join(' ') + ' <em>' + lastWord + '</em>'
        : '<em>' + lastWord + '</em>';
      document.querySelectorAll('.brand-text').forEach(function (el) {
        el.innerHTML = brandHtml;
      });

      var tagline = document.querySelector('.footer-grid > div:first-child p');
      if (tagline && s.footer_tagline) tagline.textContent = s.footer_tagline;

      document.querySelectorAll('footer a[href^="mailto:"]').forEach(function (a) {
        a.href = 'mailto:' + s.contact_email;
        a.textContent = s.contact_email;
      });
      document.querySelectorAll('footer a[href^="tel:"]').forEach(function (a) {
        a.href = 'tel:' + s.contact_phone.replace(/[^+\d]/g, '');
        a.textContent = s.contact_phone;
      });
      document.querySelectorAll('.footer-bottom span:last-child').forEach(function (el) {
        el.textContent = s.contact_address;
      });

      var widgetMail = document.querySelector('.contact-widget a.mail');
      if (widgetMail) widgetMail.href = 'mailto:' + s.contact_email;
      var widgetPhone = document.querySelector('.contact-widget a.phone');
      if (widgetPhone) widgetPhone.href = 'tel:' + s.contact_phone.replace(/[^+\d]/g, '');
      var widgetLine = document.querySelector('.contact-widget a.line');
      if (widgetLine && s.social_line) widgetLine.href = s.social_line;

      var infoEmail = document.getElementById('info-email');
      if (infoEmail) infoEmail.textContent = s.contact_email;
      var infoPhone = document.getElementById('info-phone');
      if (infoPhone) infoPhone.textContent = s.contact_phone;
      var infoLine = document.getElementById('info-line');
      if (infoLine && s.social_line) infoLine.textContent = '@' + s.social_line.replace(/^.*~/, '');
      var infoAddress = document.getElementById('info-address');
      if (infoAddress) infoAddress.textContent = s.contact_address;

      if (/(^\/|\/index\.html)$/.test(location.pathname)) {
        if (s.seo_title) document.title = s.seo_title;
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && s.seo_description) metaDesc.content = s.seo_description;
      }

      if (s.accent_color) {
        document.documentElement.style.setProperty('--color-accent', s.accent_color);
      }
    })
    .catch(function () { /* settings API unavailable — keep static defaults */ });

  /* -------------------------------------------------------------- */
  /* Header: solid background after scroll                          */
  /* -------------------------------------------------------------- */
  var header = document.querySelector('.site-header');
  var hasHero = !!document.querySelector('.hero');

  function onScroll() {
    if (!header) return;
    if (!hasHero || window.scrollY > 40) {
      header.classList.add('solid');
    } else {
      header.classList.remove('solid');
    }
  }
  if (header) {
    if (!hasHero) document.body.classList.add('no-hero');
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* -------------------------------------------------------------- */
  /* Mobile nav toggle                                               */
  /* -------------------------------------------------------------- */
  var navToggle = document.querySelector('.nav-toggle');
  if (navToggle && header) {
    navToggle.addEventListener('click', function () {
      var isOpen = header.classList.toggle('menu-open');
      // Lock background scroll while the mobile menu is open — without this,
      // iOS Safari can render scrolled page content bleeding through the
      // fixed-position menu panel (nested position:fixed rendering quirk).
      if (isOpen) {
        var scrollY = window.scrollY;
        document.body.dataset.scrollLock = String(scrollY);
        document.body.style.position = 'fixed';
        document.body.style.top = '-' + scrollY + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
      } else {
        var lockedY = parseInt(document.body.dataset.scrollLock || '0', 10);
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        window.scrollTo(0, lockedY);
      }
    });
  }

  function bindNavDropdownToggles() {
    document.querySelectorAll('.nav-item.has-children > .nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.innerWidth <= 900) {
          e.preventDefault();
          var item = link.closest('.nav-item');
          item.classList.toggle('open');
          // Force an immediate reflow — without this, Safari sometimes
          // defers repainting the max-height transition until the next
          // unrelated layout change (e.g. tapping a different item),
          // making the tapped dropdown appear to not open until later.
          void item.offsetHeight;
        }
      });
    });
  }

  /* -------------------------------------------------------------- */
  /* Navigation menu: rendered from the backend                      */
  /* -------------------------------------------------------------- */
  function extAttrs(url) {
    return /^https?:\/\//.test(url || '') ? ' target="_blank" rel="noopener"' : '';
  }

  var navMenu = document.getElementById('nav-menu');
  if (navMenu) {
    fetch('/api/nav')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        var currentPath = location.pathname.replace(/\/$/, '') || '/';
        navMenu.innerHTML = items.map(function (item) {
          var hasChildren = item.children && item.children.length > 0;
          var isActive = hasChildren && item.children.some(function (c) {
            return c.url.split('#')[0] === currentPath;
          });
          if (!hasChildren) {
            var linkActive = item.url.split('#')[0] === currentPath;
            return '<li class="nav-item' + (linkActive ? ' active' : '') + '"><a href="' + item.url + '" class="nav-link"' + extAttrs(item.url) + '>' + escapeHtml(item.label) + '</a></li>';
          }
          var dropdown = item.children.map(function (c) {
            return '<a href="' + c.url + '"' + extAttrs(c.url) + '>' + escapeHtml(c.label) + '</a>';
          }).join('');
          return (
            '<li class="nav-item has-children' + (isActive ? ' active' : '') + '">' +
              '<span class="nav-link">' + escapeHtml(item.label) + '</span>' +
              '<div class="nav-dropdown">' + dropdown + '</div>' +
            '</li>'
          );
        }).join('');
        bindNavDropdownToggles();
      })
      .catch(function () { /* nav API unavailable — menu stays empty */ });
  }

  /* -------------------------------------------------------------- */
  /* Hero carousel                                                   */
  /* -------------------------------------------------------------- */
  var hero = document.getElementById('hero');

  function embedSrc(url) {
    var yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=' + yt[1];
    var vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return 'https://player.vimeo.com/video/' + vimeo[1] + '?autoplay=1&muted=1&loop=1&background=1';
    return '';
  }

  function renderHeroBg(slide) {
    if (slide.media_type === 'video' && slide.media_url) {
      return '<video class="hero-slide-bg" autoplay muted loop playsinline src="' + slide.media_url + '"></video>';
    }
    if (slide.media_type === 'embed' && slide.media_url) {
      var src = embedSrc(slide.media_url);
      if (src) {
        return '<div class="hero-slide-bg hero-embed-wrap"><iframe src="' + src + '" frameborder="0" allow="autoplay; encrypted-media"></iframe></div>';
      }
    }
    if (slide.media_url) {
      return '<div class="hero-slide-bg" style="background-image:url(' + slide.media_url + ')"></div>';
    }
    return '<div class="hero-slide-bg hero-fallback-' + (((slide.fallback_gradient - 1) % 3) + 1) + '"></div>';
  }

  function renderHeroSlide(slide) {
    var titleHtml = escapeHtml(slide.title || '').replace(/\n/g, '<br>');
    var card = slide.card_text
      ? '<div class="hero-card"><span class="tag">' + escapeHtml(slide.card_tag) + '</span>' + escapeHtml(slide.card_text) + '</div>'
      : '';
    return (
      '<div class="hero-slide">' +
        renderHeroBg(slide) +
        '<div class="hero-slide-content">' +
          '<span class="eyebrow">' + escapeHtml(slide.eyebrow) + '</span>' +
          '<h1>' + titleHtml + '</h1>' +
          '<p>' + escapeHtml(slide.subtitle) + '</p>' +
        '</div>' +
        card +
      '</div>'
    );
  }

  function initHeroCarousel(hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero-slide'));
    var dotsWrap = hero.querySelector('.hero-dots');
    var current = 0;
    var timer;

    slides.forEach(function (slide, i) {
      if (dotsWrap) {
        var dot = document.createElement('button');
        if (i === 0) dot.classList.add('active');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', function () {
          goTo(i);
          restart();
        });
        dotsWrap.appendChild(dot);
      }
    });
    var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];

    function goTo(index) {
      slides[current].classList.remove('active');
      if (dots[current]) dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      if (dots[current]) dots[current].classList.add('active');
    }
    function next() { goTo(current + 1); }
    function restart() {
      clearInterval(timer);
      timer = setInterval(next, 6000);
    }
    if (slides.length) {
      slides[0].classList.add('active');
      restart();
    }
  }

  if (hero && hero.dataset.dynamic === '1') {
    fetch('/api/hero')
      .then(function (r) { return r.json(); })
      .then(function (slides) {
        var dotsWrap = hero.querySelector('.hero-dots');
        hero.insertAdjacentHTML('afterbegin', slides.map(renderHeroSlide).join(''));
        if (dotsWrap) dotsWrap.innerHTML = '';
        initHeroCarousel(hero);
      })
      .catch(function () { /* hero API unavailable */ });
  } else if (hero) {
    initHeroCarousel(hero);
  }

  /* -------------------------------------------------------------- */
  /* Gallery: load items from the backend, then wire up filters      */
  /* -------------------------------------------------------------- */
  var galleryGrid = document.querySelector('.gallery-grid[data-group]');
  var filterBtns = document.querySelectorAll('.filter-btn');

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderGalleryItem(item) {
    var isFilm = item.media_type === 'video';
    return (
      '<div class="gallery-item' + (isFilm ? ' is-film' : '') + '" data-category="' + escapeHtml(item.category_key) + '">' +
        '<div class="bg" style="background-image:url(' + item.url + ')"></div>' +
        (isFilm ? '<span class="play-icon"></span>' : '') +
        '<div class="caption"><span class="tag">' + escapeHtml(item.tag) + '</span><span class="title">' + escapeHtml(item.title) + '</span></div>' +
      '</div>'
    );
  }

  function initGalleryFilters() {
    if (!filterBtns.length) return;
    var items = Array.prototype.slice.call(galleryGrid.querySelectorAll('.gallery-item'));

    function applyFilter(key) {
      items.forEach(function (item) {
        var cats = (item.getAttribute('data-category') || '').split(' ');
        var show = key === 'all' || cats.indexOf(key) !== -1;
        item.classList.toggle('hidden', !show);
      });
      filterBtns.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === key);
      });
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-filter');
        applyFilter(key);
        history.replaceState(null, '', key === 'all' ? location.pathname : '#' + key);
      });
    });

    var hash = location.hash.replace('#', '');
    var matched = hash && document.querySelector('.filter-btn[data-filter="' + hash + '"]');
    applyFilter(matched ? hash : 'all');
  }

  if (galleryGrid) {
    var group = galleryGrid.getAttribute('data-group');
    galleryGrid.innerHTML = '<p class="gallery-loading">載入作品中…</p>';
    fetch('/api/portfolio/' + group)
      .then(function (r) { return r.json(); })
      .then(function (items) {
        if (!items.length) {
          galleryGrid.innerHTML = '<p class="gallery-loading">目前尚無作品，請至後台新增。</p>';
          return;
        }
        galleryGrid.innerHTML = items.map(renderGalleryItem).join('');
        initGalleryFilters();
      })
      .catch(function () {
        galleryGrid.innerHTML = '<p class="gallery-loading">作品載入失敗，請確認後端伺服器已啟動（npm start）。</p>';
      });
  }

  /* -------------------------------------------------------------- */
  /* Contact form                                                     */
  /* -------------------------------------------------------------- */
  function initContactForm() {
    var contactForm = document.getElementById('contact-form');
    if (!contactForm || contactForm.dataset.bound === '1') return;
    contactForm.dataset.bound = '1';
    var statusEl = document.getElementById('contact-status');
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      statusEl.textContent = '送出中…';
      statusEl.className = 'form-status';
      var payload = {
        name: contactForm.name.value,
        email: contactForm.email.value,
        phone: contactForm.phone.value,
        message: contactForm.message.value
      };
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.data.error || '送出失敗');
          statusEl.textContent = '訊息已送出，我們會盡快與您聯繫！';
          statusEl.className = 'form-status ok';
          contactForm.reset();
        })
        .catch(function (err) {
          statusEl.textContent = err.message + '，或直接使用右下角聯絡方式。';
          statusEl.className = 'form-status err';
        });
    });
  }
  initContactForm();

  /* -------------------------------------------------------------- */
  /* Custom pages: render page-builder blocks from the backend       */
  /* -------------------------------------------------------------- */
  var pageContent = document.getElementById('page-content');
  if (pageContent) {
    var slug = location.pathname.split('/').filter(Boolean).pop();
    fetch('/api/pages/slug/' + encodeURIComponent(slug))
      .then(function (r) { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(function (page) {
        var eyebrowEl = document.getElementById('page-eyebrow');
        var titleEl = document.getElementById('page-title');
        if (eyebrowEl) eyebrowEl.textContent = 'PAGE';
        if (titleEl) titleEl.textContent = page.title;
        if (page.seo_title) document.title = page.seo_title + '｜LightDust Studio';
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && page.seo_description) metaDesc.content = page.seo_description;

        pageContent.innerHTML = page.blocks.map(renderPageBlock).join('');
        initContactForm();
      })
      .catch(function () {
        var titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = '找不到這個頁面';
        pageContent.innerHTML = '<div class="container" style="padding:80px 0;text-align:center;color:var(--color-text-soft);">此頁面不存在或尚未發佈。</div>';
      });
  }

  function renderPageBlock(block) {
    var c = block.content || {};
    switch (block.block_type) {
      case 'heading':
        return (
          '<section class="block-heading container">' +
            '<h2 class="section-title">' + escapeHtml(c.text || '') + '</h2>' +
            (c.subtitle ? '<p style="text-align:center;color:var(--color-text-soft);margin-top:1em;">' + escapeHtml(c.subtitle) + '</p>' : '') +
          '</section>'
        );
      case 'text_image':
        return (
          '<section class="story-block container" style="flex-direction:' + (c.position === 'right' ? 'row-reverse' : 'row') + ' !important;">' +
            '<div class="media"' + (c.image_url ? ' style="background-image:url(' + c.image_url + ');background-size:cover;background-position:center;"' : '') + '></div>' +
            '<div class="text">' +
              (c.title ? '<h2 class="section-title" style="text-align:left">' + escapeHtml(c.title) + '</h2>' : '') +
              '<p>' + escapeHtml(c.text || '').replace(/\n/g, '<br>') + '</p>' +
            '</div>' +
          '</section>'
        );
      case 'button':
        return '<div class="container" style="text-align:center;padding:30px 0;"><a href="' + (c.url || '#') + '" class="btn"' + extAttrs(c.url) + '>' + escapeHtml(c.text || '') + '</a></div>';
      case 'video':
        return (
          '<section class="block-video container">' +
            (c.media_type === 'embed'
              ? '<div class="hero-embed-wrap" style="position:relative;aspect-ratio:16/9;"><iframe src="' + embedSrc(c.media_url || '') + '" frameborder="0" allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe></div>'
              : '<video src="' + (c.media_url || '') + '" controls style="width:100%;aspect-ratio:16/9;background:#111;"></video>') +
          '</section>'
        );
      case 'gallery':
        return (
          '<section class="gallery-section container">' +
            '<div class="gallery-grid ratio-3-2">' +
              (c.images || []).map(function (img) {
                return '<div class="gallery-item"><div class="bg" style="background-image:url(' + img.url + ')"></div>' +
                  (img.caption ? '<div class="caption"><span class="title">' + escapeHtml(img.caption) + '</span></div>' : '') +
                '</div>';
              }).join('') +
            '</div>' +
          '</section>'
        );
      case 'contact_form':
        return (
          '<section class="contact-page container">' +
            '<form id="contact-form" class="contact-form" style="max-width:600px;margin:0 auto;">' +
              '<input type="text" name="name" placeholder="姓名" required>' +
              '<input type="email" name="email" placeholder="Email" required>' +
              '<input type="tel" name="phone" placeholder="電話（選填）">' +
              '<textarea name="message" placeholder="請簡述您的需求" required></textarea>' +
              '<button type="submit" class="btn">送出訊息</button>' +
              '<p id="contact-status" class="form-status"></p>' +
            '</form>' +
          '</section>'
        );
      default:
        return '';
    }
  }

  /* -------------------------------------------------------------- */
  /* Floating contact widget                                         */
  /* -------------------------------------------------------------- */
  var widget = document.querySelector('.contact-widget');
  if (widget) {
    var toggleBtn = widget.querySelector('.contact-toggle');
    toggleBtn.addEventListener('click', function () {
      widget.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!widget.contains(e.target)) widget.classList.remove('open');
    });
  }
});
