(function () {
  var page = document.currentScript.getAttribute('data-page');

  var CATEGORIES = {
    photography: [
      ['commercial', '商業攝影'], ['food', '美食攝影'], ['space', '空間攝影'],
      ['portrait', '人像攝影'], ['wedding', '婚禮紀錄']
    ],
    film: [['production', '影片製作'], ['brand', '形象影片'], ['short', '短影音']],
    design: [['graphic', '平面設計'], ['marketing', '整合行銷']]
  };
  var GROUP_LABELS = { photography: 'Photography 攝影', film: 'Film 影片', design: 'Design 設計' };

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function requireLogin(onReady) {
    fetch('/api/auth/me')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.loggedIn) { window.location.href = '/admin/login'; return; }
        onReady(data);
        var badge = document.getElementById('unread-badge');
        if (badge) {
          fetch('/api/messages').then(function (r) { return r.json(); }).then(function (data) {
            if (data.unread > 0) { badge.textContent = data.unread; badge.hidden = false; }
            else badge.hidden = true;
          }).catch(function () {});
        }
        var accountsLink = document.getElementById('accounts-nav-link');
        if (accountsLink) accountsLink.hidden = data.role !== 'super_admin';
      });
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        fetch('/api/auth/logout', { method: 'POST' }).then(function () {
          window.location.href = '/admin/login';
        });
      });
    }
  }

  if (page === 'login') {
    var form = document.getElementById('login-form');
    var errorEl = document.getElementById('login-error');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.textContent = '';
      var body = {
        username: form.username.value,
        password: form.password.value
      };
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.data.error || '登入失敗');
          window.location.href = '/admin';
        })
        .catch(function (err) { errorEl.textContent = err.message; });
    });

    fetch('/api/auth/me')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.loggedIn) { window.location.href = '/admin'; return; }
        if (!data.googleClientId) return;

        var tries = 0;
        var poll = setInterval(function () {
          tries++;
          if (window.google && window.google.accounts && window.google.accounts.id) {
            clearInterval(poll);
            window.google.accounts.id.initialize({
              client_id: data.googleClientId,
              callback: function (response) {
                errorEl.textContent = '';
                fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: response.credential })
                })
                  .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                  .then(function (res) {
                    if (!res.ok) throw new Error(res.data.error || 'Google 登入失敗');
                    window.location.href = '/admin';
                  })
                  .catch(function (err) { errorEl.textContent = err.message; });
              }
            });
            window.google.accounts.id.renderButton(
              document.getElementById('google-signin-btn'),
              { theme: 'outline', size: 'large', width: 280, text: 'signin_with' }
            );
            document.getElementById('google-divider').hidden = false;
          } else if (tries > 50) {
            clearInterval(poll);
          }
        }, 100);
      })
      .catch(function () {});
  }

  if (page === 'dashboard') {
    requireLogin(init);

    function init() {
      var groupSelect = document.getElementById('group-select');
      var categorySelect = document.getElementById('category-select');

      function populateCategories() {
        var opts = CATEGORIES[groupSelect.value];
        categorySelect.innerHTML = opts.map(function (o) {
          return '<option value="' + o[0] + '">' + o[1] + '</option>';
        }).join('');
      }
      groupSelect.addEventListener('change', populateCategories);
      populateCategories();

      var addForm = document.getElementById('add-form');
      var addStatus = document.getElementById('add-status');
      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addStatus.textContent = '上傳中…';
        addStatus.className = 'status';
        var formData = new FormData(addForm);
        fetch('/api/portfolio', { method: 'POST', body: formData })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '上傳失敗');
            addStatus.textContent = '新增成功！';
            addStatus.className = 'status ok';
            addForm.reset();
            populateCategories();
            loadItems();
          })
          .catch(function (err) {
            addStatus.textContent = err.message;
            addStatus.className = 'status err';
          });
      });

      loadItems();
    }

    function loadItems() {
      fetch('/api/portfolio')
        .then(function (r) { return r.json(); })
        .then(renderGroups);
    }

    function renderGroups(items) {
      var wrap = document.getElementById('item-groups');
      var byGroup = { photography: [], film: [], design: [] };
      items.forEach(function (item) {
        if (byGroup[item.group_key]) byGroup[item.group_key].push(item);
      });

      wrap.innerHTML = Object.keys(byGroup).map(function (group) {
        var groupItems = byGroup[group];
        var body = groupItems.length
          ? '<div class="item-grid">' + groupItems.map(renderCard).join('') + '</div>'
          : '<p class="empty-note">尚無作品</p>';
        return '<div class="group-block"><h3>' + GROUP_LABELS[group] + '</h3>' + body + '</div>';
      }).join('');

      wrap.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('確定要刪除這個作品嗎？')) return;
          fetch('/api/portfolio/' + btn.getAttribute('data-id'), { method: 'DELETE' })
            .then(function (r) { return r.json(); })
            .then(function () { loadItems(); });
        });
      });
    }

    function renderCard(item) {
      return (
        '<div class="item-card">' +
          '<button class="del-btn" data-id="' + item.id + '" title="刪除">&times;</button>' +
          '<div class="thumb" style="background-image:url(' + item.url + ')"></div>' +
          '<div class="meta">' +
            '<span class="cat">' + escapeHtml(item.tag) + '</span>' +
            '<span class="title">' + escapeHtml(item.title) + '</span>' +
          '</div>' +
        '</div>'
      );
    }
  }

  if (page === 'settings') {
    requireLogin(initSettings);

    function initSettings() {
      var form = document.getElementById('settings-form');
      var formStatus = document.getElementById('form-status');
      var logoPreview = document.getElementById('logo-preview');
      var faviconPreview = document.getElementById('favicon-preview');
      var logoStatus = document.getElementById('logo-status');

      function load() {
        fetch('/api/settings')
          .then(function (r) { return r.json(); })
          .then(function (s) {
            Object.keys(s).forEach(function (key) {
              if (form.elements[key]) form.elements[key].value = s[key];
            });
            logoPreview.src = s.logo_url;
            faviconPreview.src = s.favicon_url;
          });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        formStatus.textContent = '儲存中…';
        formStatus.className = 'status';
        var body = {};
        Array.prototype.forEach.call(form.elements, function (el) {
          if (el.name) body[el.name] = el.value;
        });
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '儲存失敗');
            formStatus.textContent = '已儲存！前台頁面重新整理後會套用新設定。';
            formStatus.className = 'status ok';
          })
          .catch(function (err) {
            formStatus.textContent = err.message;
            formStatus.className = 'status err';
          });
      });

      function bindUpload(inputId, endpoint, previewEl) {
        document.getElementById(inputId).addEventListener('change', function (e) {
          var file = e.target.files[0];
          if (!file) return;
          logoStatus.textContent = '上傳中…';
          logoStatus.className = 'status';
          var fd = new FormData();
          fd.append('file', file);
          fetch(endpoint, { method: 'POST', body: fd })
            .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
            .then(function (res) {
              if (!res.ok) throw new Error(res.data.error || '上傳失敗');
              previewEl.src = res.data.url + '?t=' + Date.now();
              logoStatus.textContent = '上傳成功！';
              logoStatus.className = 'status ok';
            })
            .catch(function (err) {
              logoStatus.textContent = err.message;
              logoStatus.className = 'status err';
            });
        });
      }
      bindUpload('logo-file', '/api/settings/logo', logoPreview);
      bindUpload('favicon-file', '/api/settings/favicon', faviconPreview);

      load();
    }
  }

  if (page === 'nav') {
    requireLogin(initNav);

    function initNav() {
      var treeWrap = document.getElementById('nav-tree');
      var addParentForm = document.getElementById('add-parent-form');
      var addParentStatus = document.getElementById('add-parent-status');
      var addParentPageSelect = document.getElementById('add-parent-page-select');
      var pagesCache = [];

      // Builds the <option> list for a "point at this custom page instead of
      // a hand-typed URL" dropdown, re-used across every row plus the add-
      // parent form.
      function pageOptionsHtml(selectedId) {
        return '<option value="">— 不指定，使用左側網址 —</option>' + pagesCache.map(function (p) {
          return '<option value="' + p.id + '"' + (selectedId === p.id ? ' selected' : '') + '>' + escapeHtml(p.title) + '（/pages/' + escapeHtml(p.slug) + '）</option>';
        }).join('');
      }

      // A page-select and its paired url-input are mutually exclusive:
      // picking a page clears the typed URL (and disables it), typing a URL
      // resets the page-select back to "不指定".
      function wireExclusivePair(urlInput, pageSelect) {
        if (pageSelect.value) urlInput.disabled = true;
        pageSelect.addEventListener('change', function () {
          urlInput.disabled = !!pageSelect.value;
          if (pageSelect.value) urlInput.value = '';
        });
        urlInput.addEventListener('input', function () {
          if (urlInput.value) pageSelect.value = '';
        });
      }

      function loadPages() {
        return fetch('/api/pages')
          .then(function (r) { return r.json(); })
          .then(function (pages) {
            pagesCache = pages;
            addParentPageSelect.innerHTML = pageOptionsHtml(null);
          });
      }

      function load() {
        fetch('/api/nav')
          .then(function (r) { return r.json(); })
          .then(renderTree);
      }

      function renderTree(items) {
        treeWrap.innerHTML = items.map(function (parent) {
          var children = (parent.children || []).map(function (child) {
            return (
              '<div class="nav-child-row" data-id="' + child.id + '">' +
                '<input class="label-input" value="' + escapeHtml(child.label) + '" data-field="label">' +
                '<input class="url-input" value="' + escapeHtml(child.url) + '" data-field="url">' +
                '<select class="page-select" data-field="page_id">' + pageOptionsHtml(child.page_id) + '</select>' +
                '<input class="order-input" type="number" value="' + child.sort_order + '" data-field="sort_order">' +
                '<button class="save-btn" data-action="save-child" data-id="' + child.id + '">儲存</button>' +
                '<button class="del-btn" data-action="del-child" data-id="' + child.id + '">刪除</button>' +
              '</div>'
            );
          }).join('');

          return (
            '<div class="nav-parent" data-id="' + parent.id + '">' +
              '<div class="nav-parent-row">' +
                '<input class="label-input" value="' + escapeHtml(parent.label) + '" data-field="label">' +
                '<input class="url-input" value="' + escapeHtml(parent.url) + '" data-field="url" placeholder="無子選單時的連結">' +
                '<select class="page-select" data-field="page_id">' + pageOptionsHtml(parent.page_id) + '</select>' +
                '<input class="order-input" type="number" value="' + parent.sort_order + '" data-field="sort_order">' +
                '<button class="save-btn" data-action="save-parent" data-id="' + parent.id + '">儲存</button>' +
                '<button class="del-btn" data-action="del-parent" data-id="' + parent.id + '">刪除整組</button>' +
              '</div>' +
              '<div class="nav-children">' +
                children +
                '<div class="add-child-row" data-parent-id="' + parent.id + '">' +
                  '<input class="label-input" placeholder="子選單名稱" data-field="label">' +
                  '<input class="url-input" placeholder="連結網址，如 photography.html#food" data-field="url">' +
                  '<select class="page-select" data-field="page_id">' + pageOptionsHtml(null) + '</select>' +
                  '<input class="order-input" type="number" value="0" data-field="sort_order">' +
                  '<button data-action="add-child" data-parent-id="' + parent.id + '">新增子選單</button>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('');

        treeWrap.querySelectorAll('.nav-parent-row, .nav-child-row, .add-child-row').forEach(function (row) {
          wireExclusivePair(row.querySelector('.url-input'), row.querySelector('.page-select'));
        });

        wireTreeEvents();
      }

      function rowValues(row) {
        var values = {};
        row.querySelectorAll('[data-field]').forEach(function (input) {
          values[input.getAttribute('data-field')] = input.value;
        });
        return values;
      }

      function wireTreeEvents() {
        treeWrap.querySelectorAll('[data-action="save-parent"]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var row = btn.closest('.nav-parent-row');
            fetch('/api/nav/' + btn.getAttribute('data-id'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rowValues(row))
            }).then(load);
          });
        });

        treeWrap.querySelectorAll('[data-action="del-parent"]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('確定要刪除這個主選單項目？子選單也會一併刪除。')) return;
            fetch('/api/nav/' + btn.getAttribute('data-id'), { method: 'DELETE' }).then(load);
          });
        });

        treeWrap.querySelectorAll('[data-action="save-child"]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var row = btn.closest('.nav-child-row');
            fetch('/api/nav/' + btn.getAttribute('data-id'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rowValues(row))
            }).then(load);
          });
        });

        treeWrap.querySelectorAll('[data-action="del-child"]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('確定要刪除這個子選單項目？')) return;
            fetch('/api/nav/' + btn.getAttribute('data-id'), { method: 'DELETE' }).then(load);
          });
        });

        treeWrap.querySelectorAll('[data-action="add-child"]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var row = btn.closest('.add-child-row');
            var values = rowValues(row);
            if (!values.label) return;
            values.parent_id = Number(btn.getAttribute('data-parent-id'));
            fetch('/api/nav', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values)
            }).then(load);
          });
        });
      }

      addParentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addParentStatus.textContent = '新增中…';
        addParentStatus.className = 'status';
        var body = {};
        Array.prototype.forEach.call(addParentForm.elements, function (el) {
          if (el.name) body[el.name] = el.value;
        });
        fetch('/api/nav', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '新增失敗');
            addParentStatus.textContent = '新增成功！';
            addParentStatus.className = 'status ok';
            addParentForm.reset();
            document.getElementById('add-parent-url').disabled = false;
            load();
          })
          .catch(function (err) {
            addParentStatus.textContent = err.message;
            addParentStatus.className = 'status err';
          });
      });

      wireExclusivePair(document.getElementById('add-parent-url'), addParentPageSelect);
      loadPages().then(load);
    }
  }

  if (page === 'hero') {
    requireLogin(initHero);

    function initHero() {
      var addForm = document.getElementById('add-slide-form');
      var addStatus = document.getElementById('add-slide-status');
      var listWrap = document.getElementById('slide-list');

      function load() {
        fetch('/api/hero/all')
          .then(function (r) { return r.json(); })
          .then(renderList);
      }

      function thumbHtml(slide) {
        if (slide.media_type === 'image' && slide.media_url) {
          return '<div class="slide-thumb" style="background-image:url(' + slide.media_url + ')"></div>';
        }
        if (slide.media_type === 'video' && slide.media_url) {
          return '<div class="slide-thumb"><video src="' + slide.media_url + '" muted style="width:100%;height:100%;object-fit:cover;"></video></div>';
        }
        if (slide.media_type === 'embed' && slide.media_url) {
          return '<div class="slide-thumb" style="display:flex;align-items:center;justify-content:center;color:#fff;font-size:.8rem;">內嵌影片：' + escapeHtml(slide.media_url) + '</div>';
        }
        return '<div class="slide-thumb hero-fallback-' + (((slide.fallback_gradient - 1) % 3) + 1) + '"></div>';
      }

      function renderList(slides) {
        listWrap.innerHTML = slides.map(function (slide) {
          return (
            '<form class="slide-card' + (slide.published ? '' : ' is-unpublished') + '" data-id="' + slide.id + '" enctype="multipart/form-data">' +
              '<div class="slide-head"><span>#' + slide.id + (slide.published ? '' : '（未發佈）') + '</span></div>' +
              thumbHtml(slide) +
              '<div class="row">' +
                '<label>小標籤<input type="text" name="eyebrow" value="' + escapeHtml(slide.eyebrow) + '"></label>' +
              '</div>' +
              '<div class="row">' +
                '<label>主標題<textarea name="title" rows="2">' + escapeHtml(slide.title) + '</textarea></label>' +
              '</div>' +
              '<div class="row">' +
                '<label>副標題<input type="text" name="subtitle" value="' + escapeHtml(slide.subtitle) + '"></label>' +
              '</div>' +
              '<div class="row">' +
                '<label>卡片標籤<input type="text" name="card_tag" value="' + escapeHtml(slide.card_tag) + '"></label>' +
                '<label>卡片文字<input type="text" name="card_text" value="' + escapeHtml(slide.card_text) + '"></label>' +
              '</div>' +
              '<div class="row">' +
                '<label>更換背景圖片／影片<input type="file" name="file" accept="image/*,video/mp4"></label>' +
                '<label>或 YouTube／Vimeo 連結<input type="text" name="embed_url" value="' + (slide.media_type === 'embed' ? escapeHtml(slide.media_url) : '') + '" placeholder="留空表示不使用"></label>' +
              '</div>' +
              '<div class="row">' +
                '<label>預設漸層<select name="fallback_gradient">' +
                  [1, 2, 3].map(function (n) {
                    return '<option value="' + n + '"' + (slide.fallback_gradient === n ? ' selected' : '') + '>漸層 ' + n + '</option>';
                  }).join('') +
                '</select></label>' +
                '<label>排序<input type="number" name="sort_order" value="' + slide.sort_order + '"></label>' +
                '<label class="checkbox-label"><input type="checkbox" name="published" value="1"' + (slide.published ? ' checked' : '') + '> 發佈顯示</label>' +
              '</div>' +
              '<button type="submit">儲存</button> ' +
              '<button type="button" class="del-btn" data-id="' + slide.id + '">刪除這一頁</button>' +
              '<p class="status"></p>' +
            '</form>'
          );
        }).join('');

        listWrap.querySelectorAll('.slide-card').forEach(function (card) {
          card.addEventListener('submit', function (e) {
            e.preventDefault();
            var statusEl = card.querySelector('.status');
            statusEl.textContent = '儲存中…';
            statusEl.className = 'status';
            var fd = new FormData(card);
            if (!fd.get('published')) fd.set('published', '0');
            fetch('/api/hero/' + card.getAttribute('data-id'), { method: 'PUT', body: fd })
              .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
              .then(function (res) {
                if (!res.ok) throw new Error(res.data.error || '儲存失敗');
                statusEl.textContent = '已儲存！';
                statusEl.className = 'status ok';
                load();
              })
              .catch(function (err) {
                statusEl.textContent = err.message;
                statusEl.className = 'status err';
              });
          });
        });

        listWrap.querySelectorAll('.del-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('確定要刪除這個輪播頁嗎？')) return;
            fetch('/api/hero/' + btn.getAttribute('data-id'), { method: 'DELETE' }).then(load);
          });
        });
      }

      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addStatus.textContent = '新增中…';
        addStatus.className = 'status';
        var fd = new FormData(addForm);
        if (!fd.get('published')) fd.set('published', '0');
        fetch('/api/hero', { method: 'POST', body: fd })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '新增失敗');
            addStatus.textContent = '新增成功！';
            addStatus.className = 'status ok';
            addForm.reset();
            load();
          })
          .catch(function (err) {
            addStatus.textContent = err.message;
            addStatus.className = 'status err';
          });
      });

      load();
    }
  }

  function toDatetimeLocal(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  if (page === 'pages') {
    requireLogin(initPagesList);

    function initPagesList() {
      var listWrap = document.getElementById('page-list');
      var addForm = document.getElementById('add-page-form');
      var addStatus = document.getElementById('add-page-status');

      function load() {
        fetch('/api/pages')
          .then(function (r) { return r.json(); })
          .then(function (pages) {
            listWrap.innerHTML = pages.length ? pages.map(function (p) {
              return (
                '<div class="item-card" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;">' +
                  '<div>' +
                    '<div class="title">' + escapeHtml(p.title) + '</div>' +
                    '<div class="cat">/pages/' + escapeHtml(p.slug) + (p.published ? '' : '（未發佈）') + '</div>' +
                  '</div>' +
                  '<div style="display:flex;gap:10px;">' +
                    '<a class="ghost-btn" href="/admin/page-edit?id=' + p.id + '">編輯</a>' +
                    '<button class="ghost-btn del-page-btn" data-id="' + p.id + '">刪除</button>' +
                  '</div>' +
                '</div>'
              );
            }).join('') : '<p class="empty-note">尚無自訂頁面</p>';

            listWrap.querySelectorAll('.del-page-btn').forEach(function (btn) {
              btn.addEventListener('click', function () {
                if (!confirm('確定要刪除這個頁面嗎？頁面內所有區塊也會一併刪除。')) return;
                fetch('/api/pages/' + btn.getAttribute('data-id'), { method: 'DELETE' }).then(load);
              });
            });
          });
      }

      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addStatus.textContent = '建立中…';
        addStatus.className = 'status';
        var body = {
          slug: addForm.slug.value.trim(),
          title: addForm.title.value.trim(),
          seo_title: addForm.seo_title.value,
          seo_description: addForm.seo_description.value,
          published: addForm.published.checked,
          publish_at: addForm.publish_at.value || null
        };
        fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '建立失敗');
            addStatus.textContent = '建立成功！';
            addStatus.className = 'status ok';
            addForm.reset();
            load();
          })
          .catch(function (err) {
            addStatus.textContent = err.message;
            addStatus.className = 'status err';
          });
      });

      load();
    }
  }

  if (page === 'page-edit') {
    requireLogin(initPageEdit);

    var BLOCK_LABELS = {
      heading: '標題文字', text_image: '圖文並排', button: '按鈕',
      video: '影片', gallery: '圖片相簿', contact_form: '聯絡表單'
    };

    function initPageEdit() {
      var pageId = new URLSearchParams(location.search).get('id');
      if (!pageId) { window.location.href = '/admin/pages'; return; }

      var metaForm = document.getElementById('page-meta-form');
      var metaStatus = document.getElementById('meta-status');
      var blockTypeSelect = document.getElementById('block-type-select');
      var addBlockBtn = document.getElementById('add-block-btn');
      var addBlockStatus = document.getElementById('add-block-status');
      var blockListWrap = document.getElementById('block-list');
      var videoMediaType = document.getElementById('video-media-type');

      function load() {
        fetch('/api/pages/id/' + pageId)
          .then(function (r) { return r.json(); })
          .then(function (p) {
            metaForm.slug.value = p.slug;
            metaForm.title.value = p.title;
            metaForm.seo_title.value = p.seo_title;
            metaForm.seo_description.value = p.seo_description;
            metaForm.published.checked = !!p.published;
            metaForm.publish_at.value = toDatetimeLocal(p.publish_at);
            renderBlockList(p.blocks);
          });
      }

      metaForm.addEventListener('submit', function (e) {
        e.preventDefault();
        metaStatus.textContent = '儲存中…';
        metaStatus.className = 'status';
        var body = {
          slug: metaForm.slug.value.trim(),
          title: metaForm.title.value.trim(),
          seo_title: metaForm.seo_title.value,
          seo_description: metaForm.seo_description.value,
          published: metaForm.published.checked,
          publish_at: metaForm.publish_at.value || null
        };
        fetch('/api/pages/' + pageId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '儲存失敗');
            metaStatus.textContent = '已儲存！';
            metaStatus.className = 'status ok';
          })
          .catch(function (err) {
            metaStatus.textContent = err.message;
            metaStatus.className = 'status err';
          });
      });

      // --- Add-block form ---
      blockTypeSelect.addEventListener('change', function () {
        document.querySelectorAll('.block-fields').forEach(function (el) { el.hidden = true; });
        document.getElementById('block-fields-' + blockTypeSelect.value).hidden = false;
      });

      if (videoMediaType) {
        videoMediaType.addEventListener('change', function () {
          document.getElementById('video-upload-row').hidden = videoMediaType.value !== 'upload';
          document.getElementById('video-embed-row').hidden = videoMediaType.value !== 'embed';
        });
      }

      document.querySelectorAll('[data-upload]').forEach(function (input) {
        input.addEventListener('change', function () {
          var file = input.files[0];
          if (!file) return;
          var fd = new FormData();
          fd.append('file', file);
          input.disabled = true;
          fetch('/api/pages/upload', { method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              input.setAttribute('data-uploaded-url', data.url);
              input.disabled = false;
            })
            .catch(function () { input.disabled = false; });
        });
      });

      function collectFields(container) {
        var content = {};
        container.querySelectorAll('[data-f]').forEach(function (el) {
          content[el.getAttribute('data-f')] = el.value;
        });
        container.querySelectorAll('[data-upload]').forEach(function (el) {
          var url = el.getAttribute('data-uploaded-url');
          if (url) content[el.getAttribute('data-upload')] = url;
        });
        return content;
      }

      addBlockBtn.addEventListener('click', function () {
        var type = blockTypeSelect.value;
        var container = document.getElementById('block-fields-' + type);
        var content = collectFields(container);

        addBlockStatus.textContent = '新增中…';
        addBlockStatus.className = 'status';
        fetch('/api/pages/' + pageId + '/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block_type: type, content: content, sort_order: Date.now() })
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '新增失敗');
            addBlockStatus.textContent = '新增成功！';
            addBlockStatus.className = 'status ok';
            container.querySelectorAll('input,textarea,select').forEach(function (el) {
              if (el.type === 'file') { el.value = ''; el.removeAttribute('data-uploaded-url'); }
              else if (el.tagName !== 'SELECT') el.value = '';
            });
            load();
          })
          .catch(function (err) {
            addBlockStatus.textContent = err.message;
            addBlockStatus.className = 'status err';
          });
      });

      // --- Existing block list ---
      function blockCardBody(block) {
        var c = block.content;
        switch (block.block_type) {
          case 'heading':
            return '<div class="row">' +
              '<label>標題文字<input type="text" data-f="text" value="' + escapeHtml(c.text || '') + '"></label>' +
              '<label>副標文字<input type="text" data-f="subtitle" value="' + escapeHtml(c.subtitle || '') + '"></label>' +
            '</div>';
          case 'text_image':
            return '<div class="row">' +
                '<label>標題<input type="text" data-f="title" value="' + escapeHtml(c.title || '') + '"></label>' +
                '<label>圖片位置<select data-f="position"><option value="left"' + (c.position !== 'right' ? ' selected' : '') + '>圖片在左</option><option value="right"' + (c.position === 'right' ? ' selected' : '') + '>圖片在右</option></select></label>' +
              '</div>' +
              '<div class="row"><label>內文<textarea data-f="text" rows="3">' + escapeHtml(c.text || '') + '</textarea></label></div>' +
              (c.image_url ? '<div class="slide-thumb" style="background-image:url(' + c.image_url + ');max-width:200px;"></div>' : '') +
              '<div class="row"><label>更換圖片<input type="file" accept="image/*" data-upload="image_url"></label></div>';
          case 'button':
            return '<div class="row">' +
              '<label>按鈕文字<input type="text" data-f="text" value="' + escapeHtml(c.text || '') + '"></label>' +
              '<label>連結網址<input type="text" data-f="url" value="' + escapeHtml(c.url || '') + '"></label>' +
            '</div>';
          case 'video':
            return '<div class="row"><label>目前來源<input type="text" value="' + escapeHtml(c.media_type === 'embed' ? c.media_url : (c.media_url || '（尚未設定）')) + '" disabled></label></div>' +
              '<div class="row">' +
                '<label>上傳新影片檔案<input type="file" accept="video/mp4" data-upload="media_url"></label>' +
                '<label>或改用連結<input type="text" data-f="media_url" placeholder="https://youtu.be/..."></label>' +
              '</div>' +
              '<p class="hint">若填了連結，儲存時會以連結為主；若上傳新檔案，儲存時會以上傳檔案為主。</p>';
          case 'gallery':
            var thumbs = (c.images || []).map(function (img, i) {
              return '<div class="thumb"><img src="' + img.url + '"><button class="rm" data-gallery-remove="' + i + '">&times;</button></div>';
            }).join('');
            return '<div class="gallery-thumbs">' + thumbs + '</div>' +
              '<div class="row" style="margin-top:12px;">' +
                '<label>新增圖片<input type="file" accept="image/*" class="gallery-add-input"></label>' +
                '<label>圖說（選填）<input type="text" class="gallery-caption-input"></label>' +
                '<button type="button" class="gallery-add-btn" style="align-self:flex-end;padding:10px 18px;border:1px solid var(--border);background:transparent;cursor:pointer;">新增</button>' +
              '</div>';
          case 'contact_form':
            return '<p class="hint">此區塊顯示聯絡表單，無需額外設定。</p>';
          default:
            return '';
        }
      }

      function renderBlockList(blocks) {
        blockListWrap.innerHTML = blocks.length ? blocks.map(function (block) {
          return (
            '<div class="block-card" data-id="' + block.id + '" data-type="' + block.block_type + '">' +
              '<div class="block-card-head"><span>' + (BLOCK_LABELS[block.block_type] || block.block_type) + ' #' + block.id + '</span>' +
                '<button class="del-btn" data-del-block="' + block.id + '">刪除區塊</button>' +
              '</div>' +
              blockCardBody(block) +
              '<div class="row" style="margin-top:10px;">' +
                '<label style="max-width:120px;">排序<input type="number" data-f="__sort_order" value="' + block.sort_order + '"></label>' +
                '<button type="button" class="save-block-btn" data-id="' + block.id + '" style="align-self:flex-end;padding:10px 24px;border:none;background:var(--text);color:#fff;cursor:pointer;">儲存這個區塊</button>' +
              '</div>' +
              '<p class="status"></p>' +
            '</div>'
          );
        }).join('') : '<p class="empty-note">尚無內容區塊，請在上方新增。</p>';

        wireBlockCardEvents();
      }

      function wireBlockCardEvents() {
        blockListWrap.querySelectorAll('[data-upload]').forEach(function (input) {
          input.addEventListener('change', function () {
            var file = input.files[0];
            if (!file) return;
            var fd = new FormData();
            fd.append('file', file);
            input.disabled = true;
            fetch('/api/pages/upload', { method: 'POST', body: fd })
              .then(function (r) { return r.json(); })
              .then(function (data) {
                input.setAttribute('data-uploaded-url', data.url);
                input.disabled = false;
              })
              .catch(function () { input.disabled = false; });
          });
        });

        blockListWrap.querySelectorAll('.save-block-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var card = btn.closest('.block-card');
            var statusEl = card.querySelector('.status');
            var content = collectFields(card);
            var sortOrder = content.__sort_order;
            delete content.__sort_order;

            // video: if a URL was typed, prefer embed; otherwise keep upload type
            if (card.getAttribute('data-type') === 'video') {
              if (content.media_url && content.media_url.indexOf('http') === 0) {
                content.media_type = 'embed';
              } else if (card.querySelector('[data-upload]').getAttribute('data-uploaded-url')) {
                content.media_type = 'upload';
              }
            }

            statusEl.textContent = '儲存中…';
            statusEl.className = 'status';
            fetch('/api/pages/blocks/' + btn.getAttribute('data-id'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: content, sort_order: Number(sortOrder) || 0 })
            })
              .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
              .then(function (res) {
                if (!res.ok) throw new Error(res.data.error || '儲存失敗');
                statusEl.textContent = '已儲存！';
                statusEl.className = 'status ok';
                load();
              })
              .catch(function (err) {
                statusEl.textContent = err.message;
                statusEl.className = 'status err';
              });
          });
        });

        blockListWrap.querySelectorAll('[data-del-block]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('確定要刪除這個區塊嗎？')) return;
            fetch('/api/pages/blocks/' + btn.getAttribute('data-del-block'), { method: 'DELETE' }).then(load);
          });
        });

        blockListWrap.querySelectorAll('.gallery-add-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var card = btn.closest('.block-card');
            var fileInput = card.querySelector('.gallery-add-input');
            var captionInput = card.querySelector('.gallery-caption-input');
            if (!fileInput.files[0]) return;
            var fd = new FormData();
            fd.append('file', fileInput.files[0]);
            fd.append('caption', captionInput.value || '');
            fetch('/api/pages/blocks/' + card.getAttribute('data-id') + '/gallery-image', { method: 'POST', body: fd })
              .then(function (r) { return r.json(); })
              .then(load);
          });
        });

        blockListWrap.querySelectorAll('[data-gallery-remove]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var card = btn.closest('.block-card');
            fetch('/api/pages/blocks/' + card.getAttribute('data-id') + '/gallery-image/' + btn.getAttribute('data-gallery-remove'), { method: 'DELETE' })
              .then(function (r) { return r.json(); })
              .then(load);
          });
        });
      }

      load();
    }
  }

  if (page === 'messages') {
    requireLogin(initMessages);

    function initMessages() {
      var listWrap = document.getElementById('message-list');
      var filterBtns = document.querySelectorAll('.msg-filter-btn');
      var bulkDeleteBtn = document.getElementById('bulk-delete-btn');
      var currentFilter = 'all';

      function fmtTime(iso) {
        var d = new Date(iso + 'Z');
        return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      }

      function load() {
        var qs = currentFilter !== 'all' ? '?filter=' + currentFilter : '';
        fetch('/api/messages' + qs)
          .then(function (r) { return r.json(); })
          .then(function (data) { renderList(data.messages); });
      }

      function renderList(messages) {
        listWrap.innerHTML = messages.length ? messages.map(function (m) {
          return (
            '<div class="msg-card' + (m.is_read ? '' : ' is-unread') + '" data-id="' + m.id + '">' +
              '<input type="checkbox" class="msg-check" data-id="' + m.id + '">' +
              '<div class="msg-body">' +
                '<div class="msg-head"><span class="msg-from">' + escapeHtml(m.name) + '</span><span class="msg-time">' + fmtTime(m.created_at) + '</span></div>' +
                '<div class="msg-contact">' + escapeHtml(m.email) + (m.phone ? ' · ' + escapeHtml(m.phone) : '') + '</div>' +
                '<div class="msg-text">' + escapeHtml(m.message) + '</div>' +
                '<div class="msg-actions">' +
                  '<button class="toggle-read-btn" data-id="' + m.id + '" data-read="' + m.is_read + '">' + (m.is_read ? '標為未讀' : '標為已讀') + '</button>' +
                  '<button class="del-msg-btn" data-id="' + m.id + '">刪除</button>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('') : '<p class="empty-note">目前沒有訊息</p>';

        wireMessageEvents();
        updateBulkButton();
      }

      function updateBulkButton() {
        var checked = listWrap.querySelectorAll('.msg-check:checked');
        bulkDeleteBtn.disabled = checked.length === 0;
        bulkDeleteBtn.textContent = checked.length ? '刪除選取項目（' + checked.length + '）' : '刪除選取項目';
      }

      function wireMessageEvents() {
        listWrap.querySelectorAll('.msg-check').forEach(function (cb) {
          cb.addEventListener('change', updateBulkButton);
        });

        listWrap.querySelectorAll('.toggle-read-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var makeRead = btn.getAttribute('data-read') !== '1';
            fetch('/api/messages/' + btn.getAttribute('data-id') + '/read', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_read: makeRead })
            }).then(load);
          });
        });

        listWrap.querySelectorAll('.del-msg-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('確定要刪除這則訊息嗎？')) return;
            fetch('/api/messages/' + btn.getAttribute('data-id'), { method: 'DELETE' }).then(load);
          });
        });
      }

      filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          currentFilter = btn.getAttribute('data-filter');
          filterBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
          load();
        });
      });

      bulkDeleteBtn.addEventListener('click', function () {
        var ids = Array.prototype.map.call(listWrap.querySelectorAll('.msg-check:checked'), function (cb) {
          return Number(cb.getAttribute('data-id'));
        });
        if (!ids.length || !confirm('確定要刪除選取的 ' + ids.length + ' 則訊息嗎？')) return;
        fetch('/api/messages/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids })
        }).then(load);
      });

      load();
    }
  }

  if (page === 'media') {
    requireLogin(initMedia);

    function initMedia() {
      var dropzone = document.getElementById('dropzone');
      var fileInput = document.getElementById('file-input');
      var uploadStatus = document.getElementById('upload-status');
      var grid = document.getElementById('media-grid');

      function load() {
        fetch('/api/media')
          .then(function (r) { return r.json(); })
          .then(renderGrid);
      }

      function renderGrid(items) {
        grid.innerHTML = items.length ? items.map(function (item) {
          var thumb = item.media_type === 'video'
            ? '<div class="thumb"><video src="' + item.url + '" muted></video></div>'
            : '<div class="thumb" style="background-image:url(' + item.url + ')"></div>';
          return (
            '<div class="media-item" data-id="' + item.id + '">' +
              thumb +
              '<div class="meta">' +
                '<span class="name">' + escapeHtml(item.original_name || item.filename) + '</span>' +
                '<button class="copy-btn" data-url="' + item.url + '">複製網址</button>' +
                '<button class="del-media-btn" data-id="' + item.id + '">刪除</button>' +
              '</div>' +
            '</div>'
          );
        }).join('') : '<p class="empty-note">尚無媒體檔案</p>';

        grid.querySelectorAll('.copy-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var url = location.origin + btn.getAttribute('data-url');
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(function () {
                btn.textContent = '已複製！';
                setTimeout(function () { btn.textContent = '複製網址'; }, 1500);
              });
            }
          });
        });

        grid.querySelectorAll('.del-media-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('確定要刪除這個檔案嗎？')) return;
            fetch('/api/media/' + btn.getAttribute('data-id'), { method: 'DELETE' })
              .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
              .then(function (res) {
                if (!res.ok) { alert(res.data.error || '刪除失敗'); return; }
                load();
              });
          });
        });
      }

      function uploadFiles(files) {
        if (!files || !files.length) return;
        uploadStatus.textContent = '上傳中…（' + files.length + ' 個檔案）';
        uploadStatus.className = 'status';
        var fd = new FormData();
        Array.prototype.forEach.call(files, function (f) { fd.append('files', f); });
        fetch('/api/media/upload', { method: 'POST', body: fd })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '上傳失敗');
            uploadStatus.textContent = '上傳成功！';
            uploadStatus.className = 'status ok';
            load();
          })
          .catch(function (err) {
            uploadStatus.textContent = err.message;
            uploadStatus.className = 'status err';
          });
      }

      dropzone.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () { uploadFiles(fileInput.files); fileInput.value = ''; });

      ['dragenter', 'dragover'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          dropzone.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          dropzone.classList.remove('is-dragover');
        });
      });
      dropzone.addEventListener('drop', function (e) {
        uploadFiles(e.dataTransfer.files);
      });

      load();
    }
  }

  if (page === 'accounts') {
    requireLogin(initAccounts);

    function initAccounts(me) {
      var pwForm = document.getElementById('change-password-form');
      var pwStatus = document.getElementById('change-password-status');
      pwForm.addEventListener('submit', function (e) {
        e.preventDefault();
        pwStatus.textContent = '更改中…';
        pwStatus.className = 'status';
        fetch('/api/auth/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_password: pwForm.current_password.value,
            new_password: pwForm.new_password.value
          })
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '更改失敗');
            pwStatus.textContent = '密碼已更新！';
            pwStatus.className = 'status ok';
            pwForm.reset();
          })
          .catch(function (err) {
            pwStatus.textContent = err.message;
            pwStatus.className = 'status err';
          });
      });

      var emailStatus = document.getElementById('my-email-status');
      var emailInput = document.getElementById('my-email-input');
      var saveEmailBtn = document.getElementById('save-email-btn');
      var emailFormStatus = document.getElementById('my-email-form-status');

      emailStatus.innerHTML = me.email
        ? '目前綁定：<strong>' + escapeHtml(me.email) + '</strong>'
        : '尚未綁定 Google 帳號，綁定後才能用 Google 登入。';
      emailInput.value = me.email || '';

      saveEmailBtn.addEventListener('click', function () {
        emailFormStatus.textContent = '儲存中…';
        emailFormStatus.className = 'status';
        fetch('/api/auth/email', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() })
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '儲存失敗');
            emailFormStatus.textContent = '已儲存！';
            emailFormStatus.className = 'status ok';
            emailStatus.innerHTML = '目前綁定：<strong>' + escapeHtml(emailInput.value.trim()) + '</strong>';
          })
          .catch(function (err) {
            emailFormStatus.textContent = err.message;
            emailFormStatus.className = 'status err';
          });
      });

      if (me.role !== 'super_admin') {
        document.getElementById('not-super-admin-note').hidden = false;
        document.getElementById('accounts-app').hidden = true;
        return;
      }
      document.getElementById('accounts-app').hidden = false;

      var addForm = document.getElementById('add-account-form');
      var addStatus = document.getElementById('add-account-status');
      var listWrap = document.getElementById('account-list');

      function load() {
        fetch('/api/accounts')
          .then(function (r) { return r.json(); })
          .then(renderList);
      }

      function renderList(accounts) {
        listWrap.innerHTML = accounts.map(function (acc) {
          var isSelf = acc.username === me.username;
          var roleLabel = acc.role === 'super_admin' ? '最高管理員' : '一般管理員';
          return (
            '<div class="item-card" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;">' +
              '<div>' +
                '<div class="title">' + escapeHtml(acc.username) + (isSelf ? '（目前登入）' : '') + '</div>' +
                '<div class="cat">' + roleLabel + (acc.email ? ' · ' + escapeHtml(acc.email) : ' · 未綁定 Google') + '</div>' +
              '</div>' +
              '<div style="display:flex;gap:10px;">' +
                (isSelf ? '' : '<button class="ghost-btn del-account-btn" data-id="' + acc.id + '">刪除</button>') +
              '</div>' +
            '</div>'
          );
        }).join('');

        listWrap.querySelectorAll('.del-account-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('確定要刪除這個帳號嗎？')) return;
            fetch('/api/accounts/' + btn.getAttribute('data-id'), { method: 'DELETE' })
              .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
              .then(function (res) {
                if (!res.ok) { alert(res.data.error || '刪除失敗'); return; }
                load();
              });
          });
        });
      }

      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addStatus.textContent = '建立中…';
        addStatus.className = 'status';
        var body = {
          username: addForm.username.value.trim(),
          password: addForm.password.value,
          role: addForm.role.value
        };
        fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || '建立失敗');
            addStatus.textContent = '建立成功！';
            addStatus.className = 'status ok';
            addForm.reset();
            load();
          })
          .catch(function (err) {
            addStatus.textContent = err.message;
            addStatus.className = 'status err';
          });
      });

      load();
    }
  }
})();
