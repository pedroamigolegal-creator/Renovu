// Renovu - protótipo só no front-end. Nenhuma senha é salva nem enviada.

const $ = (s) => document.querySelector(s);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return this["_" + k] || null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { this["_" + k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch {} delete this["_" + k]; },
};
const validName = (n) => /^(?!_)(?!.*_$)[A-Za-z0-9_]{3,20}$/.test(n) && n.split("_").length <= 2;

/* ---------- cadastro ---------- */
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
months.forEach((m, i) => $("#month").add(new Option(m, i + 1)));
for (let d = 1; d <= 31; d++) $("#day").add(new Option(String(d).padStart(2, "0"), d));
for (let y = new Date().getFullYear(); y >= 1920; y--) $("#year").add(new Option(y, y));

document.querySelectorAll(".gender button").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".gender button").forEach((o) => o.setAttribute("aria-pressed", o === b));
});
document.querySelectorAll("[data-scroll]").forEach((a) => a.onclick = () =>
  document.getElementById(a.dataset.scroll).scrollIntoView({ behavior: "smooth" }));

function enter(name) {
  store.set("renovuUser", name);
  document.querySelectorAll("input[type=password]").forEach((i) => (i.value = ""));
  location.hash = "home";
  render();
}

$("#forgot").onclick = () => alert("Coming soon.");

$("#signupForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#suUser").value, pass = $("#suPass").value;
  const [m, d, y] = ["#month", "#day", "#year"].map((s) => +$(s).value);
  const date = new Date(y, m - 1, d);
  let error = "";
  if (!validName(name)) error = "Usernames: 3-20 letters or numbers, at most one _ (not at the start or end).";
  else if (pass.length < 8) error = "Password must be at least 8 characters.";
  else if (pass !== $("#suPass2").value) error = "Passwords do not match.";
  else if (!m || !d || !y || date.getMonth() !== m - 1 || date > new Date()) error = "Enter a valid birthday.";
  $("#signupError").textContent = error;
  if (!error) enter(name);
};

$("#loginForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#loginUser").value;
  const ok = validName(name) && $("#loginPass").value.length >= 8;
  $("#loginError").textContent = ok ? "" : "Enter a username and a password (8+ characters).";
  if (ok) enter(name);
};

/* ---------- páginas ---------- */
const ad = '<div class="ad">Your ad here</div>';
const empty = (t) => `<div class="empty">${t}</div>`;
const section = (t, content, link) =>
  `<div class="head"><h2>${t}</h2>${link ? `<a class="btn" href="#${link}">See All</a>` : ""}</div>${content}`;
const cats = (list) => `<div class="cats">${list.map((c, i) => `<a data-pick class="${i ? "" : "on"}">${c}</a>`).join("")}</div>`;
const subtabs = (list) => `<div class="subtabs">${list.map((c, i) => `<button data-pick class="${i ? "" : "on"}">${c}</button>`).join("")}</div>`;

const pages = {
  home: (u) => `
    <div class="hello"><div class="avatar">${u[0].toUpperCase()}</div><h1>Hello, ${u}!</h1></div>
    ${section("Friends (0)", empty("No friends yet."), "friends")}
    ${section("Recently Played", empty("No games found."), "games")}
    ${section("Popular", empty("No games found."), "games")}
    ${section("Friend Activity", empty("No games found."), "games")}
    ${section("My Favorites", empty("No games found."), "games")}`,

  games: () => ["Popular","Top Earning","Top Rated","Featured","Popular Near You","Recommended"]
    .map((t) => section(t, empty("No games found."), "games")).join(""),

  catalog: () => `${ad}<h1 class="title">Catalog</h1>
    <div class="bar"><input placeholder="Search"><select><option>Featured</option><option>All</option></select><select><option>Relevance</option><option>Price</option></select></div>
    <div class="layout">
      <div><h3>Category</h3>${cats(["Featured","View All Items","Collectibles","UGC","Clothing","Body Parts","Gear","Accessories","Avatar Animations","Emotes"])}</div>
      <div><p>0 Results</p>${empty("No items found.")}</div>
    </div>`,

  develop: () => `${ad}${subtabs(["My Creations","Group Creations","Library","Stats"])}
    <div class="layout">
      ${cats(["Games","Places","Models","Decals","Images","Badges","Game Passes","Videos","Audio","Animations","Meshes","Mesh Parts","User Ads","Sponsored Games","Shirts","T-Shirts","Pants","Plugins"])}
      <div><button class="btn green" data-soon>Create New Game</button>${section("Games", empty("You have no games yet."))}</div>
    </div>`,

  profile: (u) => `${ad}
    <div class="box hello"><div class="avatar">${u[0].toUpperCase()}</div><div><h1>${u}</h1><p>@${u}</p>
      <div class="stats"><span>Friends<b>0</b></span><span>Followers<b>0</b></span><span>Following<b>0</b></span><span>RAP<b>0</b></span></div></div></div>
    ${subtabs(["About","Creations"])}
    ${section("About", '<div class="box">&nbsp;</div>')}
    ${section("Currently Wearing", empty("Nothing equipped."))}
    ${section("Friends (0)", empty("No friends yet."), "friends")}`,

  avatar: () => `${ad}<h1 class="title">Avatar Editor</h1>
    <div class="layout avatar-layout">
      <div><div class="preview">☺</div><div class="box scale">
        <h2>Scaling</h2>${["Height","Width","Head","Proportion","Body Type"].map((s, i) => `<label>${s}<input type="range" value="${i < 3 ? 100 : 0}"></label>`).join("")}
      </div></div>
      <div>${subtabs(["Recent","Clothing","Body","Animations","Outfits"])}${empty('No items yet. <a href="#catalog">Get More</a>')}</div>
    </div>`,

  messages: () => `${ad}${subtabs(["Inbox","Sent","Notifications","Archive"])}
    <div class="bar"><button class="btn">Archive</button><button class="btn">Mark as Read</button><button class="btn">Mark as Unread</button></div>
    <div class="box" style="text-align:center">Page 1 of 1</div>`,
};

const soon = ["download","friends","inventory","trade","groups","forums","donate","upgrade"];

function render() {
  const user = store.get("renovuUser");
  const logged = !!user && validName(user);
  $("#landing").hidden = logged;
  $("#site").hidden = !logged;
  $("#side").classList.remove("open");
  if (!logged) return;
  document.querySelectorAll(".uname").forEach((el) => (el.textContent = user));
  const route = location.hash.slice(1) || "home";
  const name = pages[route] || soon.includes(route) ? route : "home";
  $("#page").innerHTML = pages[name]
    ? pages[name](user)
    : `<h1 class="title">${name[0].toUpperCase() + name.slice(1)}</h1>${empty("Coming soon.")}`;
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.hash === "#" + name));
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
$("#menuBtn").onclick = () => {
  $("#side").style.top = $(".top").offsetHeight + "px";
  $("#side").classList.toggle("open");
};
$("#logout").onclick = () => { store.del("renovuUser"); location.hash = ""; render(); };
$("#searchForm").onsubmit = (e) => e.preventDefault();
addEventListener("hashchange", render);
render();
