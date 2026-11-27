/* =====================================================================
   Renovu – cadastro e login na página inicial (Supabase)
   Os handlers rodam na fase de captura para assumir o lugar do código
   antigo da página (que apontava para o Roblox).
   ===================================================================== */
(function () {
  'use strict';
  var R = window.Renovu;
  if (!R) return;

  function $(sel) { return document.querySelector(sel); }
  var MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var gender = null;             // 2 = male, 3 = female (igual ao formulário original)
  var busy = false;

  /* ---------- já está logado? vai direto para a home ---------- */
  if (R.client) {
    R.client.auth.getSession().then(function (r) {
      if (r && r.data && r.data.session) location.replace('/home');
    });
  }

  /* ---------- mensagens de erro ---------- */
  var style = document.createElement('style');
  style.textContent =
    '.renovu-error{color:#fff;background:#d33;border-radius:3px;padding:7px 10px;margin:10px 0 0;font-size:14px;line-height:1.35;text-align:left}' +
    '.renovu-error.ok{background:#2e9c2e}' +
    '#renovu-login-error{position:fixed;top:54px;right:16px;z-index:2000;max-width:320px;box-shadow:0 2px 8px rgba(0,0,0,.3)}';
  document.head.appendChild(style);

  function box(id, anchor, where) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id; el.className = 'renovu-error'; el.setAttribute('role', 'alert'); el.hidden = true;
      if (where === 'after' && anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
      else document.body.appendChild(el);
    }
    return el;
  }
  function show(el, msg, ok) {
    el.textContent = msg; el.hidden = !msg; el.classList.toggle('ok', !!ok);
  }
  function signupMsg(msg, ok) { show(box('renovu-signup-error', $('#signup-button'), 'after'), msg, ok); }
  function loginMsg(msg) { show(box('renovu-login-error'), msg); }

  function notReady() {
    return R.configured
      ? 'Could not load the Supabase library. Check your connection and reload the page.'
      : 'The site is not configured yet (Supabase keys are missing in assets/js/config.js).';
  }

  /* ---------- gênero ---------- */
  function pickGender(g) {
    gender = g;
    var f = $('#FemaleButton'), m = $('#MaleButton');
    if (f) f.classList.toggle('selected-gender', g === 3);
    if (m) m.classList.toggle('selected-gender', g === 2);
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest && t.closest('#FemaleButton')) pickGender(3);
    else if (t.closest && t.closest('#MaleButton')) pickGender(2);
  }, true);

  /* ---------- cadastro ---------- */
  function validateSignup() {
    var u = $('#signup-username').value.trim();
    var pw = $('#signup-password').value;
    var pw2 = $('#signup-password-confirm').value;
    var mo = $('#MonthDropdown').value, da = $('#DayDropdown').value, ye = $('#YearDropdown').value;

    if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) return { error: 'Username must be 3-20 characters long and can only use letters, numbers and _.' };
    if (pw.length < 8) return { error: 'Password must be at least 8 characters long.' };
    if (pw.toLowerCase() === u.toLowerCase()) return { error: 'Password cannot be the same as your username.' };
    if (pw !== pw2) return { error: 'Passwords do not match.' };
    if (!mo || !da || !ye) return { error: 'Please select your birthday.' };
    var d = new Date(Number(ye), MONTHS[mo], Number(da));
    if (d.getMonth() !== MONTHS[mo] || d.getDate() !== Number(da)) return { error: 'Invalid birthday.' };
    if (gender !== 2 && gender !== 3) return { error: 'Please select your gender.' };

    var iso = ye + '-' + ('0' + (MONTHS[mo] + 1)).slice(-2) + '-' + ('0' + da).slice(-2);
    return { username: u, password: pw, birthday: iso, gender: gender };
  }

  function friendlyError(err) {
    var m = (err && err.message) || '';
    if (/already registered|already been registered|duplicate/i.test(m)) return 'That username is already taken.';
    if (/database error/i.test(m)) return 'That username is not available.';
    if (/password/i.test(m)) return m;
    if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a moment and try again.';
    if (/email/i.test(m)) return 'Signup failed (' + m + '). Check EMAIL_DOMAIN in assets/js/config.js.';
    return 'Could not create your account: ' + (m || 'unknown error');
  }

  function doSignup() {
    if (busy) return;
    signupMsg('');
    var v = validateSignup();
    if (v.error) { signupMsg(v.error); return; }
    if (!R.client) { signupMsg(notReady()); return; }

    busy = true;
    var btn = $('#signup-button'); if (btn) btn.disabled = true;
    function done() { busy = false; if (btn) btn.disabled = false; }

    R.client.rpc('username_available', { p_username: v.username }).then(function (r) {
      if (r.error) {
        signupMsg('Could not check the username (' + r.error.message + '). Did you run supabase/schema.sql?');
        return done();
      }
      if (r.data === false) { signupMsg('That username is already taken.'); return done(); }

      R.client.auth.signUp({
        email: R.emailFor(v.username),
        password: v.password,
        options: { data: { username: v.username, birthday: v.birthday, gender: v.gender } }
      }).then(function (res) {
        if (res.error) { signupMsg(friendlyError(res.error)); return done(); }
        if (res.data && res.data.session) { location.href = '/home'; return; }
        signupMsg('Account created, but Supabase is asking for e-mail confirmation. In Supabase go to Authentication → Sign In / Providers → Email and turn off "Confirm email".');
        done();
      }, function (e) { signupMsg(friendlyError(e)); done(); });
    }, function (e) { signupMsg(friendlyError(e)); done(); });
  }

  function stop(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#signup-button')) { stop(e); doSignup(); }
  }, true);
  document.addEventListener('keypress', function (e) {
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (t.closest && (t.closest('#signup-button') || t.closest('.signup-input-area'))) { stop(e); doSignup(); }
  }, true);

  /* ---------- login ---------- */
  function doLogin() {
    if (busy) return;
    loginMsg('');
    var u = $('#LoginUsername').value.trim(), pw = $('#LoginPassword').value;
    if (!u || !pw) { loginMsg('Enter your username and password.'); return; }
    if (!R.client) { loginMsg(notReady()); return; }
    busy = true;
    R.client.auth.signInWithPassword({ email: R.emailFor(u), password: pw }).then(function (res) {
      if (res.error) {
        loginMsg(/invalid login/i.test(res.error.message || '') ? 'Incorrect username or password.' : 'Could not log in: ' + res.error.message);
        busy = false; return;
      }
      location.href = '/home';
    }, function (e) { loginMsg('Could not log in: ' + (e && e.message || e)); busy = false; });
  }
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'LogInForm') { stop(e); doLogin(); }
  }, true);
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'LoginButton') { stop(e); doLogin(); }
  }, true);
})();
