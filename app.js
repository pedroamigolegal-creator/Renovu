// Renovu - protótipo só de front-end. Nenhuma senha é salva nem enviada.

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return this["_" + k] || null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { this["_" + k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch {} delete this["_" + k]; },
};

const validName = (n) =>
  /^[A-Za-z0-9_]{3,20}$/.test(n) && !n.startsWith("_") && !n.endsWith("_") && n.split("_").length <= 2;

/* ---------------------------------------------------------
   TELA DE CADASTRO
--------------------------------------------------------- */
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
months.forEach((m, i) => $("#MonthDropdown").add(new Option(m, i + 1)));
for (let d = 1; d <= 31; d++) $("#DayDropdown").add(new Option(String(d).padStart(2, "0"), d));
for (let y = new Date().getFullYear(); y >= 1920; y--) $("#YearDropdown").add(new Option(y, y));

let gender = 0; // 2 = male, 3 = female (mesmos valores do código original)
const genderButtons = { 3: $("#FemaleButton"), 2: $("#MaleButton") };
const setGender = (g) => {
  gender = g;
  Object.entries(genderButtons).forEach(([k, el]) => {
    el.classList.toggle("selected-gender", +k === g);
    el.setAttribute("aria-pressed", +k === g);
  });
  setField("#GenderGroup", "#signup-GenderInputValidation", "");
};
Object.entries(genderButtons).forEach(([k, el]) => {
  el.onclick = () => setGender(+k);
  el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGender(+k); } };
});

function setField(group, msg, text, touched = true) {
  $(msg).textContent = text;
  const g = $(group);
  g.classList.toggle("has-error", !!text);
  g.classList.toggle("has-success", touched && !text);
}

const checks = {
  username: () => {
    const n = $("#signup-username").value;
    if (!n) return "Username is required.";
    if (n.length < 3) return "Username must be at least 3 characters.";
    if (n.startsWith("_") || n.endsWith("_")) return "Username cannot start or end with _.";
    if (n.split("_").length > 2) return "Username can have at most one _.";
    if (!validName(n)) return "Usernames can only have letters, numbers and _.";
    return "";
  },
  password: () => {
    const p = $("#signup-password").value;
    if (p.length < 8) return "Password must be at least 8 characters.";
    if (p.toLowerCase() === $("#signup-username").value.toLowerCase()) return "Password cannot be your username.";
    return "";
  },
  confirm: () => ($("#signup-password-confirm").value !== $("#signup-password").value ? "Passwords do not match." : ""),
  birthday: () => {
    const [m, d, y] = ["#MonthDropdown", "#DayDropdown", "#YearDropdown"].map((s) => +$(s).value);
    if (!m || !d || !y) return "Invalid birthday";
    const date = new Date(y, m - 1, d);
    return date.getMonth() !== m - 1 || date > new Date() ? "Invalid birthday" : "";
  },
  gender: () => (gender ? "" : "Gender is required"),
};

const fields = {
  username: ["#UsernameGroup", "#signup-usernameInputValidation"],
  password: ["#PasswordGroup", "#signup-passwordInputValidation"],
  confirm: ["#PasswordConfirmGroup", "#signup-passwordConfirmInputValidation"],
  birthday: ["#BirthdayGroup", "#signup-BirthdayInputValidation"],
  gender: ["#GenderGroup", "#signup-GenderInputValidation"],
};
const validate = (key, touched = true) => {
  const msg = checks[key]();
  setField(...fields[key], msg, touched);
  return !msg;
};

$("#signup-username").oninput = () => validate("username");
$("#signup-password").oninput = () => { validate("password"); if ($("#signup-password-confirm").value) validate("confirm"); };
$("#signup-password-confirm").oninput = () => validate("confirm");
["#MonthDropdown", "#DayDropdown", "#YearDropdown"].forEach((s) => ($(s).onchange = () => {
  if (["#MonthDropdown", "#DayDropdown", "#YearDropdown"].every((x) => $(x).value)) validate("birthday");
}));

const ageLabel = () => {
  const [m, d, y] = ["#MonthDropdown", "#DayDropdown", "#YearDropdown"].map((s) => +$(s).value);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now < new Date(now.getFullYear(), m - 1, d)) age--;
  return age >= 13 ? "13+" : "<13";
};

function enter(name, age = "13+") {
  store.set("renovuUser", name);
  store.set("renovuAge", age);
  $$("input[type=password]").forEach((i) => (i.value = ""));
  location.hash = "home";
  render();
}

$("#SignupForm").onsubmit = (e) => {
  e.preventDefault();
  const ok = Object.keys(checks).map((k) => validate(k)).every(Boolean);
  if (ok) enter($("#signup-username").value, ageLabel());
};

/* Login (barra de cima) */
$("#LogInForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#LoginUsername").value.trim();
  const ok = validName(name) && $("#LoginPassword").value.length >= 8;
  $("#LoginError").textContent = ok ? "" : "Incorrect username or password.";
  if (ok) enter(name);
};
$("#HeaderForgotPassword").onclick = (e) => { e.preventDefault(); alert("Coming soon."); };
$("#NavToggle").onclick = () => $("#LandingNavbar").classList.toggle("in");

/* Rolagem suave dos links Play / About / Platforms */
$$("[data-scroll]").forEach((a) => (a.onclick = (e) => {
  e.preventDefault();
  const el = document.getElementById(a.dataset.scroll);
  const y = el.getBoundingClientRect().top + scrollY - 50;
  scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}));

/* ---------------------------------------------------------
   SITE (depois do login)
--------------------------------------------------------- */
const empty = (t) => `<div class="empty">${t}</div>`;
const section = (t, content, link) =>
  `<div class="head"><h2>${t}</h2>${link ? `<a class="btn" href="#${link}">See All</a>` : ""}</div>${content}`;
const cats = (list) => `<div class="cats">${list.map((c, i) => `<a data-pick class="${i ? "" : "on"}">${c}</a>`).join("")}</div>`;
const subtabs = (list, badge) => `<div class="subtabs">${list.map((c, i) =>
  `<button data-pick class="${i ? "" : "on"}">${c}${badge && badge[c] ? ` <span class="pill">${badge[c]}</span>` : ""}</button>`).join("")}</div>`;
const letter = (u) => u[0].toUpperCase();

const pages = {
  home: (u) => `
    <div class="hello"><div class="avatar">${letter(u)}</div><h1>Hello, ${u}!</h1></div>
    ${section("Friends (0)", empty("No friends yet."), "friends")}
    ${section("Recently Played", empty("No games found."), "games")}
    ${section("Popular", empty("No games found."), "games")}
    ${section("Friend Activity", empty("No games found."), "games")}
    ${section("My Favorites", empty("No games found."), "games")}`,

  games: () => ["Popular", "Top Earning", "Top Rated", "Featured", "Popular Near You", "Recommended"]
    .map((t) => section(t, empty("No games found."), "games")).join(""),

  catalog: () => `
    <h1 class="title">Catalog</h1>
    <div class="layout cat-layout">
      <div>
        <h3 class="muted-h">Category</h3>
        ${cats(["View All Items", "Featured", "Collectibles", "UGC", "Clothing", "Body Parts", "Gear", "Accessories", "Avatar Animations", "Emotes"])}
      </div>
      <div>
        <div class="bar"><input placeholder="Search"><select><option>Featured</option><option>All</option></select><button class="btn" aria-label="Search">&#9906;</button></div>
        <p class="crumb">Featured &gt; All</p>
        <p class="crumb">0 Results</p>
        <div class="bar right"><select><option>Relevance</option><option>Price (Low to High)</option><option>Price (High to Low)</option></select></div>
        ${empty("No items found.")}
      </div>
    </div>`,

  develop: () => `
    ${subtabs(["My Creations", "Group Creations", "Library", "Stats"])}
    <div class="layout">
      ${cats(["Games", "Places", "Models", "Decals", "Images", "Badges", "Game Passes", "Videos", "Audio", "Animations", "Meshes", "Mesh Parts", "User Ads", "Sponsored Games", "Shirts", "T-Shirts", "Pants", "Plugins"])}
      <div><button class="btn green" data-soon>Create New Game</button>
        <h1 class="title sm">Games</h1>
        ${empty("You have no games yet.")}
      </div>
    </div>`,

  profile: (u) => `
    <div class="box hello"><div class="avatar">${letter(u)}</div>
      <div><h1>${u}</h1><p class="handle">@${u}</p>
        <div class="stats"><span>Friends<b>0</b></span><span>Followers<b>0</b></span><span>Following<b>0</b></span><span>RAP<b>0</b></span></div>
      </div></div>
    ${subtabs(["About", "Creations"])}
    ${section("About", '<div class="box about">&nbsp;<div class="report"><a>Report Abuse</a></div></div>')}
    ${section("Currently Wearing", '<div class="box wearing"><div class="avatar-3d">&#9786;</div><button class="mini-btn" data-soon>3D</button></div>')}
    ${section("Friends (0)", empty("No friends yet."), "friends")}
    ${section("Collections", empty("Nothing here yet."))}`,

  avatar: () => `
    <div class="head"><h1 class="title">Avatar Editor</h1><span class="hint">Explore the catalog to find more clothes! <a class="btn green" href="#catalog">Get More</a></span></div>
    <div class="layout avatar-layout">
      <div>
        <div class="preview"><div class="rtoggle"><b>R6</b><span>R15</span></div><div class="figure">&#9786;</div>
          <button class="mini-btn left" data-soon>Adjust</button><button class="mini-btn right" data-soon>3D</button></div>
        <div class="box scale">
          <h2>Scaling</h2>
          ${["Height", "Width", "Head", "Proportion", "Body Type"].map((s, i) =>
            `<label><span>${s}</span><output>${i < 3 ? 100 : 0}%</output><input type="range" min="0" max="100" value="${i < 3 ? 100 : 0}"></label>`).join("")}
        </div>
        <div class="refresh">
          <p>Avatar isn't updated? <button class="mini-btn">Refetch</button></p>
          <p>Avatar isn't loading correctly? <button class="mini-btn">Redraw</button></p>
          <p>Change your profile picture? <button class="mini-btn">Edit</button></p>
        </div>
      </div>
      <div>${subtabs(["Recent", "Clothing", "Body", "Animations", "Outfits"])}
        <p class="crumb">Recent &gt; All</p>
        ${empty('No items yet. <a href="#catalog">Get More</a>')}
      </div>
    </div>`,

  messages: () => `
    ${subtabs(["Inbox", "Sent", "Notifications", "Archive"], { Notifications: 1 })}
    <div class="bar msg-bar"><input type="checkbox" aria-label="Select all"><button class="btn">Archive</button><button class="btn">Mark as Read</button><button class="btn">Mark as Unread</button></div>
    <div class="pager"><button class="mini-btn" aria-label="Previous">&#9668;</button><span>Page 1 of 1</span><button class="mini-btn" aria-label="Next">&#9658;</button></div>
    ${empty("No messages.")}`,
};

const soon = ["download", "friends", "inventory", "trade", "groups", "forums", "donate", "upgrade"];

function render() {
  const user = store.get("renovuUser");
  const logged = !!user && validName(user);
  $("#landing").hidden = logged;
  $("#site").hidden = !logged;
  $("#side").classList.remove("open");
  document.body.classList.toggle("in-site", logged);
  if (!logged) return;
  $$(".uname").forEach((el) => (el.textContent = user));
  $(".age").textContent = store.get("renovuAge") || "13+";
  const route = location.hash.slice(1) || "home";
  const name = pages[route] || soon.includes(route) ? route : "home";
  $("#page").innerHTML = pages[name]
    ? pages[name](user)
    : `<h1 class="title">${name[0].toUpperCase() + name.slice(1)}</h1>${empty("Coming soon.")}`;
  $$(".tabs a").forEach((a) => a.classList.toggle("on", a.hash === "#" + name));
  scrollTo(0, 0);
}

$("#page").onclick = (e) => {
  const pick = e.target.closest("[data-pick]");
  if (pick) {
    pick.parentElement.querySelectorAll("[data-pick]").forEach((x) => x.classList.remove("on"));
    pick.classList.add("on");
  }
  if (e.target.closest("[data-soon]")) alert("Coming soon.");
};
$("#page").oninput = (e) => {
  if (e.target.type === "range") e.target.parentElement.querySelector("output").textContent = e.target.value + "%";
};
$("#menuBtn").onclick = () => {
  $("#side").style.top = $(".top").offsetHeight + "px";
  $("#side").classList.toggle("open");
};
$("#banner").onclick = (e) => { e.preventDefault(); alert("Discord link coming soon."); };
$("#logout").onclick = () => { store.del("renovuUser"); store.del("renovuAge"); location.hash = ""; render(); };
$("#searchForm").onsubmit = (e) => e.preventDefault();
addEventListener("hashchange", render);
render();
