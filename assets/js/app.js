/* =====================================================================
   Renovu – núcleo da área logada (Supabase + menu + páginas)
   ===================================================================== */
(function () {
  'use strict';

  var cfg = window.RENOVU_CONFIG || {};
  var configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
                      String(cfg.SUPABASE_URL).indexOf('YOUR_') === -1);
  var client = null;
  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  var R = window.Renovu = { cfg: cfg, client: client, configured: configured, me: null };

  /* ---------------------------- utilidades ---------------------------- */
  R.userUrl = function (n) { return '/users?id=' + n; };   // funciona mesmo sem rewrite; a barra vira /users/N depois de carregar
  R.emailFor = function (username) {
    return String(username).trim().toLowerCase() + '@' + (cfg.EMAIL_DOMAIN || 'renovu.app');
  };
  R.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  R.ageLabel = function (birthday) {
    if (!birthday) return '13+';
    var d = new Date(birthday), n = new Date();
    var age = n.getFullYear() - d.getFullYear();
    var m = n.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age--;
    return age >= 13 ? '13+' : '<13';
  };
  // Cartão da página 404 (usado quando um perfil/página não existe)
  R.notFoundHtml = function () {
    return '<div class="nf-card"><div class="nf-text">' +
      '<h1>Page cannot be found or no longer exists</h1>' +
      '<p class="nf-code">404 <span>|</span> Page Not found</p>' +
      '<div class="nf-actions"><a class="nf-btn dark" href="/home" id="nf-back">Back</a><a class="nf-btn light" href="/home">Home</a></div>' +
      '</div><div class="nf-art"><img src="/assets/img/404.png" alt=""></div></div>';
  };
  R.signOut = function () {
    var done = function () { location.replace('/'); };
    if (!client) return done();
    client.auth.signOut().then(done, done);
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------ ícones ------------------------------ */
  var ICON = {
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    messages: '<rect x="3" y="3.5" width="18" height="17" rx="3.5"/><path d="M6.8 8h10.4M6.8 11.3h10.4M6.8 14.6h10.4M6.8 17.9h10.4" stroke-width="1.7"/>',
    inbox: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
    robux: '<circle cx="12" cy="12" r="10"/><text x="12" y="15.9" text-anchor="middle" font-size="10.5" font-weight="800" fill="currentColor" stroke="currentColor" stroke-width=".45" stroke-linejoin="round" textLength="12.5" lengthAdjust="spacingAndGlyphs" font-family="Arial,sans-serif">R$</text>',
    tix: '<g transform="rotate(-38 12 12)"><path d="M3.2 7.2h17.6v3.1a1.9 1.9 0 0 0 0 3.8v3.1H3.2v-3.1a1.9 1.9 0 0 0 0-3.8z"/><text x="12" y="15.4" text-anchor="middle" font-size="10" font-weight="800" fill="currentColor" stroke="currentColor" stroke-width=".4" font-family="Arial,sans-serif">T</text></g>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    home: '<path d="M3 10.5L12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    friends: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.8 0 4.6 1.8 4.6 4.5"/>',
    avatar: '<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
    inventory: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    trade: '<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>',
    groups: '<circle cx="12" cy="7.5" r="3"/><circle cx="5" cy="10" r="2.4"/><circle cx="19" cy="10" r="2.4"/><path d="M6.5 20c0-3.3 2.5-5 5.5-5s5.5 1.7 5.5 5M1.5 18c0-2.4 1.6-3.8 3.6-3.8M22.5 18c0-2.4-1.6-3.8-3.6-3.8"/>',
    forums: '<path d="M4 4h16v12H9l-5 4z"/>',
    donate: '<path d="M5 8h14l1 13H4z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    place: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h5M8 12h5M8 16h3"/><path d="M15 15l3 3"/>'
  };
  function svg(name, extra) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '>' + ICON[name] + '</svg>';
  }
  R.icon = svg;

  /* ------------------------------ shell ------------------------------- */
  // "Show Tix in Navbar" (Settings > Account Info). Padrão: ligado.
  function showTix(me) {
    var st = me && me.settings && typeof me.settings === 'object' ? me.settings : {};
    if (typeof st.show_tix === 'boolean') return st.show_tix;
    try { var v = localStorage.getItem('renovu_show_tix'); if (v !== null) return v === '1'; } catch (e) {}
    return true;
  }
  R.showTix = showTix;
  function buildShell(me) {
    var page = document.body.getAttribute('data-page') || '';
    var navActive = { games: 'games', catalog: 'catalog', develop: 'develop' }[page] || '';
    var uname = R.esc(me.username);
    var html =
      '<header class="topbar">' +
        '<div class="topbar-row">' +
          '<button class="hamburger" id="btn-menu" aria-label="Menu">' + svg('menu') + '</button>' +
          '<a class="logo" href="/home" aria-label="Renovu"><img src="/assets/img/icon-96.png" alt="Renovu"></a>' +
          '<form class="search" action="/catalog" method="get">' +
            '<input type="text" name="q" placeholder="Search" aria-label="Search" autocomplete="off">' +
            '<button type="submit" aria-label="Search">' + svg('search') + '</button>' +
          '</form>' +
          '<div class="topbar-right">' +
            '<span class="who">' + uname + ': <small>' + R.ageLabel(me.birthday) + '</small></span>' +
            '<a class="icon-btn" href="/messages" title="Messages" aria-label="Messages">' + svg('messages') + '<span class="badge" id="msg-badge" hidden></span></a>' +
            '<span class="pop-wrap"><button type="button" class="icon-btn" id="btn-robux" aria-label="Robux" aria-haspopup="true">' + svg('robux') + '</button>' +
              '<div class="pop" id="pop-robux" role="status" hidden>' + Number(me.robux || 0).toLocaleString() + ' Robux</div></span>' +
            '<span class="pop-wrap" id="wrap-tix"' + (showTix(me) ? '' : ' hidden') + '><button type="button" class="icon-btn" id="btn-tix" aria-label="Tix" aria-haspopup="true">' + svg('tix') + '</button>' +
              '<div class="pop" id="pop-tix" role="status" hidden>' + Number(me.tix || 0).toLocaleString() + ' Tix</div></span>' +
            '<button class="icon-btn" id="btn-gear" aria-label="Settings" aria-haspopup="true">' + svg('gear') + '</button>' +
          '</div>' +
          '<div class="menu" id="gear-menu" hidden>' +
            '<a href="/settings">Settings</a>' +
            '<button type="button" id="btn-logout">Logout</button>' +
          '</div>' +
        '</div>' +
        '<nav class="mainnav">' +
          '<a href="/games"' + (navActive === 'games' ? ' class="active"' : '') + '>Games</a>' +
          '<a href="/catalog"' + (navActive === 'catalog' ? ' class="active"' : '') + '>Catalog</a>' +
          '<a href="/develop"' + (navActive === 'develop' ? ' class="active"' : '') + '>Create</a>' +
          '<a href="/soon?p=Download">Download</a>' +
        '</nav>' +
      '</header>' +
      '<div class="sidebar-backdrop" id="menu-backdrop"></div>' +
      '<aside class="sidebar" id="sidebar">' +
        '<div class="s-name">' + uname + '</div>' +
        link('/home', 'home', 'Home') +
        link(R.userUrl(me.user_number), 'profile', 'Profile') +
        link('/messages', 'inbox', 'Messages') +
        link('/soon?p=Friends', 'friends', 'Friends') +
        link('/avatar', 'avatar', 'Avatar') +
        link('/soon?p=Inventory', 'inventory', 'Inventory') +
        link('/soon?p=Trade', 'trade', 'Trade') +
        link('/soon?p=Groups', 'groups', 'Groups') +
        link('/soon?p=Forums', 'forums', 'Forums') +
        link('/soon?p=Donate', 'donate', 'Donate') +
        '<a class="btn-blue" href="/soon?p=Upgrade">Upgrade Now</a>' +
      '</aside>';

    var mount = $('#shell');
    mount.innerHTML = html;

    function link(href, icon, label) {
      return '<a class="s-link" href="' + href + '">' + svg(icon) + '<span>' + label + '</span></a>';
    }

    var body = document.body;
    $('#btn-menu').addEventListener('click', function () { body.classList.toggle('menu-open'); });
    $('#menu-backdrop').addEventListener('click', function () { body.classList.remove('menu-open'); });

    var gear = $('#btn-gear'), gmenu = $('#gear-menu');
    var pops = [$('#pop-robux'), $('#pop-tix')];
    function closeAll(except) {
      gmenu.hidden = except !== gmenu;
      pops.forEach(function (p) { p.hidden = except !== p; });
    }
    gear.addEventListener('click', function (e) { e.stopPropagation(); closeAll(gmenu.hidden ? gmenu : null); });
    $('#btn-robux').addEventListener('click', function (e) { e.stopPropagation(); closeAll(pops[0].hidden ? pops[0] : null); });
    $('#btn-tix').addEventListener('click', function (e) { e.stopPropagation(); closeAll(pops[1].hidden ? pops[1] : null); });
    document.addEventListener('click', function () { closeAll(null); });
    $('#btn-logout').addEventListener('click', R.signOut);

    // a busca preenche com ?q= no catálogo
    var q = new URLSearchParams(location.search).get('q');
    if (q && page === 'catalog') $('.topbar .search input').value = q;
  }

  /* ------------------------------ boot -------------------------------- */
  function fatal(msg) {
    document.body.classList.add('ready');
    document.body.innerHTML = '<div style="padding:40px;font:16px/1.5 sans-serif;max-width:560px;margin:0 auto">' +
      '<h2 style="font-weight:400">Renovu</h2><p>' + R.esc(msg) + '</p><p><a href="/">Back to start</a></p></div>';
  }

  R.boot = function (onReady) {
    if (!client) {
      fatal(configured
        ? 'Could not load the Supabase library. Check your connection and reload.'
        : 'Supabase is not configured yet. Fill in assets/js/config.js (SUPABASE_URL and SUPABASE_ANON_KEY).');
      return;
    }
    client.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) { location.replace('/'); return; }
      return client.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(function (p) {
        if (p.error || !p.data) {
          // conta sem perfil (ex.: schema.sql não foi rodado)
          fatal(p.error ? 'Could not load your profile: ' + p.error.message
                        : 'Your account has no profile yet. Make sure supabase/schema.sql was run.');
          return;
        }
        R.me = p.data;
        buildShell(p.data);
        document.body.classList.add('ready');
        onReady(p.data);
      });
    }).catch(function (e) { fatal('Something went wrong: ' + (e && e.message || e)); });
  };

  /* ------------------ avatar: imagem parada + 3D de verdade ----------- */
  // O botão "3D" troca a imagem pelo modelo (WebGL) NA MESMA POSE. Ele fica parado
  // e só gira quando você arrasta. Desligar o 3D volta para a imagem parada.
  var DRAG_SPEED = 0.45;   // graus por pixel arrastado (menor = mais lento)
  R.mountViewer = function (box, btn) {
    var img = $('img', box), canvas = null, viewer = null, on = false, drag = false, lastX = 0;

    function stop() {
      on = false; drag = false;
      btn.classList.remove('active'); box.classList.remove('is-3d');
      if (viewer) { viewer.destroy(); viewer = null; }
      if (canvas) { canvas.remove(); canvas = null; }
      img.style.visibility = '';
    }

    function start() {
      if (!window.Noob3D) return;
      on = true; btn.classList.add('active'); box.classList.add('is-3d');
      canvas = document.createElement('canvas');
      canvas.className = 'noob-canvas';
      box.appendChild(canvas);
      // mesmo enquadramento da imagem parada (ela ocupa só parte da caixa)
      var k = box.clientHeight / (img.clientHeight || box.clientHeight);
      viewer = window.Noob3D.create(canvas, { heightScale: k });
      if (!viewer) { stop(); return; }
      viewer.ready.then(function () { if (on) img.style.visibility = 'hidden'; }, stop);

      canvas.addEventListener('pointerdown', function (e) {
        drag = true; lastX = e.clientX;
        try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag || !viewer) return;
        viewer.setYaw(viewer.getYaw() + (e.clientX - lastX) * DRAG_SPEED);
        lastX = e.clientX;
      });
      function up() { drag = false; }
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
    }

    btn.addEventListener('click', function () { on ? stop() : start(); });
    img.addEventListener('dragstart', function (e) { e.preventDefault(); });
  };

  /* ------------------------ amigos (função do banco) ------------------ */
  R.friendsOf = function (userId) {
    return client.rpc('friends_of', { p_user: userId }).then(function (r) {
      return r.error ? [] : (r.data || []);
    });
  };
  function friendHtml(f) {
    return '<a class="friend" href="' + R.userUrl(f.user_number) + '">' +
      '<span class="avatar-circle mid"><img src="/assets/noob/noob-head.png" alt=""></span>' +
      '<span>' + R.esc(f.username) + '</span></a>';
  }

  /* ----------------------------- páginas ------------------------------ */
  var pages = {};

  pages.home = function (me) {
    $$('[data-me-name]').forEach(function (n) { n.textContent = me.username; });
    R.friendsOf(me.id).then(function (list) {
      $('#friend-count').textContent = list.length;
      $('#friends').innerHTML = list.length
        ? list.map(friendHtml).join('')
        : '<span class="muted">You have no friends yet.</span>';
    });
  };

  pages.games = function () { /* só estrutura por enquanto */ };

  pages.catalog = function () {
    var q = new URLSearchParams(location.search).get('q');
    if (q) { $('#cat-q').value = q; }
  };

  pages.develop = function (me) {
    $$('[data-me-name]').forEach(function (n) { n.textContent = me.username; });
    $$('.dev-menu a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        $$('.dev-menu a').forEach(function (x) { x.classList.remove('active'); });
        a.classList.add('active');
        $('#dev-title').textContent = a.textContent;
        var isGames = a.textContent === 'Games';
        $('#dev-list').hidden = !isGames;
        $('#dev-empty').hidden = isGames;
        $('#dev-create').hidden = !isGames;
      });
    });
    $$('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.tabs button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      });
    });
  };

  pages.users = function (me) {
    var m = location.pathname.match(/\/users\/(\d+)/);
    var number = m ? Number(m[1]) : (/^\/users\//.test(location.pathname) ? 0 : (Number(new URLSearchParams(location.search).get('id')) || me.user_number));
    var root = $('#profile');
    client.from('profiles').select('*').eq('user_number', number).maybeSingle().then(function (r) {
      if (r.error || !r.data) {
        document.body.classList.remove('bg-profile'); document.body.classList.add('bg-white');
        document.title = 'Page Not Found - Renovu';
        root.className = 'nf-wrap';
        root.innerHTML = R.notFoundHtml();
        var back = $('#nf-back');
        if (back) back.addEventListener('click', function (e) { if (history.length > 1) { e.preventDefault(); history.back(); } });
        return;
      }
      var p = r.data, mine = p.id === me.id;
      try { if (!m) history.replaceState(null, '', '/users/' + p.user_number); } catch (e) {}   // URL bonita
      document.title = p.username + ' - Renovu';
      $('#p-avatar').src = '/assets/noob/noob-head.png';
      $('#p-name').textContent = p.username;
      $('#p-handle').textContent = '@' + p.username;
      $('#p-about').textContent = p.description || '';
      $('#p-wear-img').src = '/assets/noob/noob-full.png';
      R.mountViewer($('#p-viewer'), $('#p-3d'));
      $('#p-badge').hidden = !mine;
      $('#p-seeall').href = '/soon?p=Friends';

      /* carrossel "Currently Wearing": 8 miniaturas por página, 2 páginas */
      var pages_ = [[1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1]];
      function showPage(n) {
        $('#p-cards').innerHTML = pages_[n].map(function (k) {
          return '<div class="pf-card"><img src="/assets/noob/poses/pose' + k + '.png" alt="" loading="lazy"></div>';
        }).join('');
        $$('#p-dots button').forEach(function (d, i) { d.classList.toggle('on', i === n); });
      }
      $$('#p-dots button').forEach(function (d, i) { d.addEventListener('click', function () { showPage(i); }); });
      showPage(0);

      /* menu "..." */
      var pop = $('#p-pop');
      $('#p-more').addEventListener('click', function (e) { e.stopPropagation(); pop.hidden = !pop.hidden; });
      document.addEventListener('click', function () { pop.hidden = true; });
      $('#p-copy').addEventListener('click', function () {
        var url = location.origin + '/users/' + p.user_number;
        function done() { $('#p-copy').textContent = 'Copied!'; setTimeout(function () { $('#p-copy').textContent = 'Copy Profile Link'; pop.hidden = true; }, 900); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done); else done();
      });
      $('#p-report').addEventListener('click', function (e) { e.preventDefault(); });

      if (mine) {
        var box = $('#about-edit'), txt = $('#about-text');
        $('#about-edit-btn').hidden = false;
        $('#about-edit-btn').addEventListener('click', function () {
          box.hidden = false; $('#about-ta').value = p.description || ''; txt.hidden = true; $('#about-edit-btn').hidden = true;
        });
        $('#about-cancel').addEventListener('click', function () {
          box.hidden = true; txt.hidden = false; $('#about-edit-btn').hidden = false;
        });
        $('#about-save').addEventListener('click', function () {
          var val = $('#about-ta').value.slice(0, 1000);
          client.from('profiles').update({ description: val }).eq('id', me.id).then(function (u) {
            if (u.error) { $('#about-err').textContent = 'Could not save: ' + u.error.message; return; }
            p.description = val; $('#p-about').textContent = val;
            $('#about-err').textContent = '';
            box.hidden = true; txt.hidden = false; $('#about-edit-btn').hidden = false;
          });
        });
      }

      R.friendsOf(p.id).then(function (list) {
        $('#p-friends-n').textContent = list.length;
        $('#p-friends-title span').textContent = 'Friends (' + list.length + ')';
        $('#p-friends').innerHTML = list.length ? list.map(friendHtml).join('') : '<span class="muted">No friends yet.</span>';
      });
    });

    $$('.ptabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.ptabs button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var creations = b.getAttribute('data-tab') === 'creations';
        $('#tab-about').hidden = creations; $('#tab-creations').hidden = !creations;
      });
    });
  };

  /* ------------------------------ Settings ----------------------------- */
  pages.settings = function (me) {
    var settings = (me.settings && typeof me.settings === 'object') ? JSON.parse(JSON.stringify(me.settings)) : {};
    var msgTimer = 0;
    function say(text, bad) {
      var el = $('#st-msg'); el.textContent = text; el.hidden = !text; el.classList.toggle('bad', !!bad);
      clearTimeout(msgTimer); if (text) msgTimer = setTimeout(function () { el.hidden = true; }, 4500);
    }
    function save(patch, ok) {
      var next = Object.assign({}, settings, patch);
      return client.from('profiles').update({ settings: next }).eq('id', me.id).then(function (u) {
        if (u.error) {
          say('Could not save: ' + u.error.message + '. Run the latest supabase/schema.sql in the Supabase SQL Editor (it adds the "settings" column).', true);
          return false;
        }
        settings = next; me.settings = next; if (ok) say(ok); return true;
      });
    }

    /* abas (#security, #social...) */
    var tabs = $$('#st-tabs button');
    function openTab(name) {
      if (!$('#tab-' + name)) name = 'account';
      tabs.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
      $$('.st-pane').forEach(function (p) { p.hidden = p.id !== 'tab-' + name; });
    }
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = b.getAttribute('data-tab'); openTab(n);
        try { history.replaceState(null, '', '#' + n); } catch (e) {}
      });
    });
    openTab(location.hash.replace('#', ''));

    /* Account Info */
    $('#st-username').textContent = me.username;
    $('#st-display').textContent = me.username;
    $('#st-pw-edit').addEventListener('click', function () { $('#st-pw').hidden = !$('#st-pw').hidden; });
    $('#st-pw-cancel').addEventListener('click', function () { $('#st-pw').hidden = true; $('#st-pw1').value = $('#st-pw2').value = ''; });
    $('#st-pw-save').addEventListener('click', function () {
      var a = $('#st-pw1').value, b = $('#st-pw2').value;
      if (a.length < 8) return say('Password must be at least 8 characters long.', true);
      if (a.toLowerCase() === String(me.username).toLowerCase()) return say('Password cannot be the same as your username.', true);
      if (a !== b) return say('Passwords do not match.', true);
      client.auth.updateUser({ password: a }).then(function (r) {
        if (r.error) return say('Could not change the password: ' + r.error.message, true);
        $('#st-pw').hidden = true; $('#st-pw1').value = $('#st-pw2').value = ''; say('Password changed.');
      });
    });

    $('#st-about').value = me.description || '';
    var MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var bd = /^(\d{4})-(\d{2})-(\d{2})/.exec(me.birthday || '');
    if (bd) { $('#st-bm').textContent = MN[Number(bd[2]) - 1]; $('#st-bd').textContent = Number(bd[3]); $('#st-by').textContent = bd[1]; }
    $('#st-about-save').addEventListener('click', function () {
      var val = $('#st-about').value.slice(0, 1000);
      client.from('profiles').update({ description: val }).eq('id', me.id).then(function (u) {
        if (u.error) return say('Could not save: ' + u.error.message, true);
        me.description = val; say('Saved.');
      });
    });

    var tix = $('#st-tix');
    function paintTix(on) { tix.classList.toggle('on', on); tix.setAttribute('aria-checked', on ? 'true' : 'false'); }
    paintTix(showTix(me));
    tix.addEventListener('click', function () {
      var on = !tix.classList.contains('on');
      paintTix(on);
      var wrap = $('#wrap-tix'); if (wrap) wrap.hidden = !on;
      try { localStorage.setItem('renovu_show_tix', on ? '1' : '0'); } catch (e) {}
      save({ show_tix: on });
    });

    /* Security */
    $('#st-signout-others').addEventListener('click', function () {
      client.auth.signOut({ scope: 'others' }).then(function (r) {
        say(r && r.error ? 'Could not sign out other sessions: ' + r.error.message : 'Signed out of all other sessions.', !!(r && r.error));
      });
    });

    /* Social */
    var soc = settings.socials || {};
    $$('#st-social input').forEach(function (i) { i.value = soc[i.getAttribute('data-k')] || ''; });
    $('#st-social-save').addEventListener('click', function () {
      var o = {}; $$('#st-social input').forEach(function (i) { var v = i.value.trim(); if (v) o[i.getAttribute('data-k')] = v; });
      save({ socials: o }, 'Saved.');
    });

    /* Privacy (salvo ao mudar) */
    var priv = settings.privacy || {};
    $$('#st-privacy select').forEach(function (sel) {
      var k = sel.getAttribute('data-k'); if (priv[k]) sel.value = priv[k];
      sel.addEventListener('change', function () {
        priv[k] = sel.value; save({ privacy: Object.assign({}, priv) }, 'Saved.');
      });
    });
    var voice = $('#st-voice');
    function paintVoice() { voice.textContent = settings.voice ? 'Turn Off' : 'Turn On'; }
    paintVoice();
    voice.addEventListener('click', function () { save({ voice: !settings.voice }).then(paintVoice); });

    /* Billing */
    $('#st-robux').textContent = Number(me.robux || 0).toLocaleString();
  };

  pages.avatar = function () {
    R.mountViewer($('#av-preview'), $('#av-3d'));
    function bust() { $('#av-img').src = $('#av-img').getAttribute('src').split('?')[0] + '?t=' + Date.now(); }
    $('#av-refetch').addEventListener('click', bust);
    $('#av-redraw').addEventListener('click', bust);
    $$('.av-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.av-tabs button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        $('#av-crumb').textContent = b.textContent.trim() + ' > All';
      });
    });
  };

  pages.messages = function () {
    $$('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.tabs button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        $('#msg-empty').textContent = 'No ' + b.getAttribute('data-name') + '.';
      });
    });
  };

  pages.soon = function () {
    var p = new URLSearchParams(location.search).get('p') || 'This page';
    $('#soon-title').textContent = p;
  };

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    if (!page || page === 'landing') return;
    R.boot(function (me) { if (pages[page]) pages[page](me); });
  });
})();
