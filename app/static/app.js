// Finora — site complet (dashboard multi-vues) + copilot
// Branché au backend (/api/*) ; à défaut, mode démo autonome.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, c = "USD") => new Intl.NumberFormat("fr-FR", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(n);
const fmt0 = (n, c = "USD") => new Intl.NumberFormat("fr-FR", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);
const PALETTE = ["#f59e0b,#ef4444", "#6366f1,#8b5cf6", "#059669,#0ea5a3", "#ec4899,#f43f5e", "#0ea5e9,#2563eb", "#14b8a6,#0891b2"];
const AV = (name) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % PALETTE.length; return `linear-gradient(135deg,${PALETTE[h]})`; };
const initials = (n) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const CAT_STYLE = {
  Abonnement: { c: "#6366f1", g: "↻" }, Transfert: { c: "#0ea5e9", g: "→" },
  Courses: { c: "#059669", g: "⊞" }, Carburant: { c: "#d97706", g: "⛽" },
  Achats: { c: "#ec4899", g: "⛶" }, Restaurant: { c: "#f43f5e", g: "☕" },
  Transport: { c: "#8b5cf6", g: "⊙" }, Revenu: { c: "#059669", g: "↓" },
};
const catOf = (t) => CAT_STYLE[t.cat] || { c: "#667085", g: "•" };

// ---- démo ----
const DEMO_STATE = {
  brand: "Finora", holder: "Haytam T.", total_balance: 20739.31, currency: "USD",
  accounts: [{ name: "Northstar (courant)", last4: "4410", balance: 4212.10 }, { name: "Harbor (épargne)", last4: "1189", balance: 16527.21 }],
  cards: [{ type: "Mastercard", last4: "6782", status: "active", controls: { online: true, contactless: true, atm: true, abroad: false } },
          { type: "Visa", last4: "4356", status: "active", controls: { online: true, contactless: true, atm: false, abroad: false } }],
  transactions: [
    { date: "21 Oct", merchant: "Amazon", cat: "Achats", amount: -39.9 }, { date: "19 Oct", merchant: "Uber", cat: "Transport", amount: -18.4 },
    { date: "18 Oct", merchant: "Rafiq Ahmed", cat: "Transfert", amount: -120 }, { date: "16 Oct", merchant: "Starbucks", cat: "Restaurant", amount: -6.8 },
    { date: "14 Oct", merchant: "Figma", cat: "Abonnement", amount: -54 }, { date: "12 Oct", merchant: "iCloud", cat: "Abonnement", amount: -2.99 },
    { date: "09 Oct", merchant: "Shell", cat: "Carburant", amount: -54.2 }, { date: "07 Oct", merchant: "Green Leaf Café", cat: "Restaurant", amount: -23.1 },
    { date: "05 Oct", merchant: "Spotify", cat: "Abonnement", amount: -11.99 }, { date: "03 Oct", merchant: "Carrefour", cat: "Courses", amount: -82.4 },
    { date: "02 Oct", merchant: "Netflix", cat: "Abonnement", amount: -15.99 }, { date: "01 Oct", merchant: "Salaire", cat: "Revenu", amount: 3200 }],
  goals: [{ name: "New MacBook Pro", saved: 1850, target: 2400, pct: 74, dt: "Juin 2026" }, { name: "Trip to Bali", saved: 3200, target: 5000, pct: 64, dt: "Août 2026" },
          { name: "Emergency fund", saved: 9400, target: 15000, pct: 63, dt: "Déc 2026" }, { name: "New car", saved: 6200, target: 24000, pct: 26, dt: "Mars 2027" }],
  contacts: [{ name: "Rafiq Ahmed", handle: "@rafiq", type: "Person", bank: "Harbor Savings •• 1189" }, { name: "Ayesha Khan", handle: "@ayesha.k", type: "Person", bank: "Northstar Bank •• 4410" },
    { name: "Pixel Studio", handle: "pixelstudio.co", type: "Business", bank: "Meridian Credit •• 7731" }, { name: "Nadia Islam", handle: "@nadia.i", type: "Person", bank: "Northstar Bank •• 9012" },
    { name: "Green Leaf Café", handle: "greenleaf.cafe", type: "Business", bank: "Harbor Savings •• 3302" }],
  balance_history: [{ m: "Mai", v: 16120 }, { m: "Juin", v: 16740 }, { m: "Juil", v: 17210 }, { m: "Août", v: 18050 }, { m: "Sept", v: 19320 }, { m: "Oct", v: 20739 }],
  spending_categories: [{ cat: "Transferts", amount: 120, color: "#0ea5e9" }, { cat: "Courses", amount: 82.4, color: "#059669" }, { cat: "Abonnements", amount: 84.97, color: "#6366f1" },
    { cat: "Carburant", amount: 54.2, color: "#d97706" }, { cat: "Achats", amount: 39.9, color: "#ec4899" }, { cat: "Restaurant", amount: 29.9, color: "#f43f5e" }],
  contributions: [{ m: "Mai", v: 820 }, { m: "Juin", v: 640 }, { m: "Juil", v: 910 }, { m: "Août", v: 1180 }, { m: "Sept", v: 760 }, { m: "Oct", v: 1320 }],
  income: 3200, spending: 341.57,
};
// compat : les objectifs du backend n'ont pas "dt"
const GOAL_DATES = { "New MacBook Pro": "Juin 2026", "Trip to Bali": "Août 2026", "Emergency fund": "Déc 2026", "New car": "Mars 2027" };

let S = null, DEMO = false, VIEW = "overview", SELCARD = 0, SELFAV = 0, SELPRESET = 1, TAB = "all", SEARCH = "", FLIP = false;

async function api(path, opts) { try { const r = await fetch(path, opts); if (!r.ok) throw 0; return await r.json(); } catch { return null; } }

async function loadState() {
  const d = await api("/api/state");
  S = d ? d : JSON.parse(JSON.stringify(DEMO_STATE));
  DEMO = !d;
  render();
}

// ---- charts ----
function areaChart(series) {
  const W = 600, H = 190, P = 8, B = 22;
  const vals = series.map((s) => s.v), min = Math.min(...vals) * 0.985, max = Math.max(...vals) * 1.01;
  const X = (i) => P + (i * (W - 2 * P)) / (series.length - 1);
  const Y = (v) => P + (1 - (v - min) / (max - min)) * (H - P - B);
  const pts = series.map((s, i) => [X(i), Y(s.v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `M${pts[0][0]} ${H - B} ` + pts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + ` L${pts.at(-1)[0]} ${H - B} Z`;
  const grid = [0.25, 0.5, 0.75].map((f) => { const y = P + f * (H - P - B); return `<line class="gridline" x1="${P}" y1="${y}" x2="${W - P}" y2="${y}"/>`; }).join("");
  const labels = series.map((s, i) => `<text class="axis-lbl" x="${X(i)}" y="${H - 6}" text-anchor="middle">${s.m}</text>`).join("");
  const last = pts.at(-1);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.28"/><stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#ag)"/><path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="area-dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5"/>${labels}</svg>`;
}

function donutChart(cats) {
  const total = cats.reduce((a, c) => a + c.amount, 0), r = 70, C = 2 * Math.PI * r;
  let off = 0;
  const segs = cats.map((c) => { const len = (c.amount / total) * C; const s = `<circle r="${r}" cx="85" cy="85" fill="none" stroke="${c.color}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`; off += len; return s; }).join("");
  return `<svg width="170" height="170" viewBox="0 0 170 170">${segs}</svg>`;
}

function countUp(el, target, cur) {
  const start = performance.now(), dur = 700;
  const step = (t) => { const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(target * e, cur); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// ---- nav ----
function setView(v) {
  VIEW = v; SEARCH = ""; const si = $("#search"); if (si) si.value = "";
  $$(".view").forEach((s) => (s.hidden = s.dataset.view !== v));
  $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
  $$(".rail i[data-view]").forEach((i) => i.classList.toggle("act", i.dataset.view === v));
  render();
}
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-view]"); if (nav) setView(nav.dataset.view);
  const goto = e.target.closest("[data-goto]"); if (goto) setView(goto.dataset.goto);
});
$("#theme").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  $("#theme").textContent = next === "dark" ? "☀" : "☾";
  render();
});
$("#search").addEventListener("input", (e) => { SEARCH = e.target.value.toLowerCase();
  if (VIEW === "activity") renderActivity(); else if (VIEW === "manage") renderManage();
  else { setView("activity"); } });
$$("#ov-period button, .seg button").forEach(() => {});
document.addEventListener("click", (e) => {
  const seg = e.target.closest("#ov-period button");
  if (seg) { $$("#ov-period button").forEach((b) => b.classList.toggle("on", b === seg)); renderOverview(); }
  const tab = e.target.closest("#ct-tabs button");
  if (tab) { TAB = tab.dataset.tab; $$("#ct-tabs button").forEach((b) => b.classList.toggle("on", b === tab)); renderManage(); }
});

function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 2600); }

// ---- render ----
function render() {
  if (!S) return;
  $("#me-name").textContent = S.holder;
  $("#me-av").style.background = AV(S.holder);
  ({ overview: renderOverview, activity: renderActivity, manage: renderManage, cards: renderCards, reports: renderReports }[VIEW] || (() => {}))();
}

function txRow(t) {
  const st = catOf(t), pos = t.amount > 0;
  return `<div class="tx"><div class="ic" style="background:${st.c}">${st.g}</div>
    <div class="m"><div class="n">${t.merchant}</div><div class="c">${t.date} · ${t.cat}</div></div>
    <div class="amt ${pos ? "pos" : ""}">${pos ? "+" : ""}${fmt(t.amount, S.currency)}</div></div>`;
}

function renderOverview() {
  $("#greet").textContent = `Bon retour, ${S.holder} — voici l'état de tes comptes.`;
  $("#tiles").innerHTML = [
    ["Solde total", fmt(S.total_balance, S.currency), "+12% ce trimestre", "up", "◆", "var(--brand)"],
    ["Revenus (mois)", "+" + fmt(S.income, S.currency), "Salaire reçu", "up", "↓", "#059669"],
    ["Dépenses (mois)", fmt(S.spending, S.currency), "−4% vs sept.", "up", "↑", "#6366f1"],
    ["Taux d'épargne", "57%", "+6 pts", "up", "✦", "#0ea5e9"],
  ].map(([t, v, tr, d, g, col], i) => `<div class="tile stagger" style="animation-delay:${i * 60}ms">
    <div class="t"><span class="ic" style="color:${col}">${g}</span>${t}</div><div class="v">${v}</div>
    <div class="trend ${d}">${tr}</div></div>`).join("");
  const bal = $("#ov-balance"); countUp(bal, S.total_balance, S.currency);
  $("#ov-chart").innerHTML = areaChart(S.balance_history);
  $("#ov-donut").innerHTML = donutChart(S.spending_categories);
  const spend = S.spending_categories.reduce((a, c) => a + c.amount, 0);
  $("#ov-spend").textContent = fmt0(spend, S.currency);
  $("#ov-legend").innerHTML = S.spending_categories.map((c) =>
    `<div class="li"><span class="lsw" style="background:${c.color}"></span><span class="nm">${c.cat}</span><span class="amt">${fmt(c.amount, S.currency)}</span></div>`).join("");
  $("#ov-tx").innerHTML = S.transactions.slice(0, 5).map(txRow).join("");
}

function renderActivity() {
  let tx = S.transactions;
  if (SEARCH) tx = tx.filter((t) => (t.merchant + " " + t.cat).toLowerCase().includes(SEARCH));
  $("#act-tx").innerHTML = tx.length ? tx.map(txRow).join("") : `<p class="muted-s" style="padding:20px 0">Aucune transaction pour « ${SEARCH} ».</p>`;
  $("#act-count").textContent = `${tx.length} opérations`;
  const favs = S.contacts.slice(0, 4);
  $("#qt").innerHTML = `<div class="favs">${favs.map((c, i) => `<div class="fav ${i === SELFAV ? "sel" : ""}" data-fav="${i}">
      <div class="av" style="background:${AV(c.name)}">${initials(c.name)}</div><span>${c.name.split(" ")[0]}</span></div>`).join("")}</div>
    <div class="amount">$<input id="qt-amt" type="number" value="100" min="1"></div>
    <div class="presets">${[50, 100, 250, 500].map((p, i) => `<button class="preset ${i === SELPRESET ? "on" : ""}" data-preset="${p}" data-pi="${i}">$${p}</button>`).join("")}</div>
    <button class="send" id="qt-send">Envoyer</button>`;
  const cats = S.spending_categories, mx = Math.max(...cats.map((c) => c.amount));
  $("#act-cats").innerHTML = cats.map((c) => `<div class="catbar"><div class="r"><span>${c.cat}</span><b>${fmt(c.amount, S.currency)}</b></div>
    <div class="track"><div class="fill" style="width:${(c.amount / mx * 100).toFixed(0)}%;background:${c.color}"></div></div></div>`).join("");
}

function renderManage() {
  let list = S.contacts;
  if (TAB !== "all") list = list.filter((c) => c.type === TAB);
  if (SEARCH) list = list.filter((c) => (c.name + " " + c.handle).toLowerCase().includes(SEARCH));
  $("#contacts").innerHTML = list.map((c, i) => `<div class="contact stagger" style="animation-delay:${i * 50}ms">
    ${i < 2 ? '<span class="star">★</span>' : ''}
    <div class="av" style="background:${AV(c.name)}">${initials(c.name)}</div>
    <div class="n">${c.name}</div><div class="h">${c.handle}</div>
    <div class="badge">${c.type === "Business" ? "Entreprise" : "Personne"}</div><div class="b">${c.bank}</div></div>`).join("")
    || `<p class="muted-s">Aucun contact.</p>`;
}

function renderCards() {
  const c = S.cards[SELCARD], frozen = c.status === "frozen";
  $("#card-visual").innerHTML = `<div class="cc ${frozen ? "frozen" : ""}">
    <div class="top"><div class="chip"></div><span class="st">${frozen ? "❄ Gelée" : "● Active"}</span></div>
    <div class="num">${FLIP ? "•••• •••• •••• " + c.last4 : "5412 88•• •••• " + c.last4}</div>
    <div class="bot"><div><div style="opacity:.6;font-size:10px">TITULAIRE</div>HAYTAM T.</div>
      <div><div style="opacity:.6;font-size:10px">EXP</div>09/29</div>
      <div class="cvv"><div style="opacity:.6;font-size:10px">CVV</div>${FLIP ? "611" : "•••"}</div>
      <b style="font-size:15px">${c.type}</b></div></div>`;
  $("#card-tabs").innerHTML = S.cards.map((cc, i) => `<button class="${i === SELCARD ? "on" : ""}" data-card="${i}">${cc.type} •• ${cc.last4}</button>`).join("");
  $("#btn-freeze").textContent = frozen ? "❄ Dégeler" : "❄ Geler";
  $("#btn-freeze").classList.toggle("on", frozen);
  $("#btn-flip").textContent = FLIP ? "🙈 Masquer" : "👁 Numéro";
  const L = { online: ["⊞", "Paiements en ligne", "Boutiques, abonnements, achats in-app"], contactless: ["〰", "Sans contact", "Payer jusqu'à 250 $ par transaction"],
    atm: ["▦", "Retraits DAB", "Jusqu'à 1 000 $ par jour"], abroad: ["✈", "Paiements à l'étranger", "Transactions hors du pays"] };
  $("#controls").innerHTML = Object.entries(c.controls).map(([k, v]) => `<div class="ctrl"><div class="ic2">${L[k][0]}</div>
    <div class="tx2"><div class="n">${L[k][1]}</div><div class="d">${L[k][2]}</div></div>
    <button class="sw ${v ? "on" : ""}" data-control="${k}"></button></div>`).join("");
}

function renderReports() {
  const totalSaved = S.goals.reduce((a, g) => a + g.saved, 0);
  countUp($("#rep-saved"), totalSaved, S.currency);
  const co = S.contributions, mx = Math.max(...co.map((c) => c.v));
  $("#rep-chart").innerHTML = co.map((c, i) => `<div class="bar-col"><div class="bar ${i === co.length - 1 ? "hi" : ""}" style="height:${(c.v / mx * 100).toFixed(0)}%"></div><span class="bl">${c.m}</span></div>`).join("");
  $("#autosave").innerHTML = [["⟳", "Arrondi à l'euro", "Chaque paiement arrondi au suivant", true], ["⚡", "Coup de pouce paie", "10 % du salaire mis de côté", true], ["📅", "50 $ / semaine", "Virement auto le lundi", false]]
    .map(([ic, n, d, on]) => `<div class="as"><div class="ic2">${ic}</div><div class="tx2"><div class="n">${n}</div><div class="d">${d}</div></div><button class="sw ${on ? "on" : ""}" data-as></button></div>`).join("");
  $("#goals").innerHTML = S.goals.map((g, i) => `<div class="goal stagger" style="animation-delay:${i * 60}ms">
    <div class="ring" style="background:conic-gradient(var(--brand) ${g.pct}%, var(--line) 0)"><span class="p">${g.pct}%</span></div>
    <div class="n">${g.name}</div><div class="amt">${fmt0(g.saved, S.currency)} / ${fmt0(g.target, S.currency)}</div>
    <div class="dt">🎯 ${g.dt || GOAL_DATES[g.name] || ""}</div><button class="add" data-goal="${i}">+ Ajouter</button></div>`).join("");
}

// ---- actions ----
document.addEventListener("click", async (e) => {
  const cbtn = e.target.closest("[data-card]"); if (cbtn) { SELCARD = +cbtn.dataset.card; FLIP = false; renderCards(); }
  if (e.target.id === "btn-flip") { FLIP = !FLIP; renderCards(); }
  if (e.target.closest(".cc")) { FLIP = !FLIP; renderCards(); }

  if (e.target.id === "btn-freeze") {
    const c = S.cards[SELCARD], nf = c.status !== "frozen";
    if (DEMO) c.status = nf ? "frozen" : "active";
    else { await api("/api/card/freeze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ last4: c.last4, frozen: nf }) }); await loadState(); }
    renderCards(); toast(nf ? "Carte gelée ❄" : "Carte réactivée ✅");
  }
  const sw = e.target.closest("[data-control]");
  if (sw) { const c = S.cards[SELCARD], k = sw.dataset.control, val = !c.controls[k];
    if (!DEMO) api("/api/card/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ last4: c.last4, control: k, enabled: val }) });
    c.controls[k] = val; renderCards(); }
  if (e.target.matches("[data-as]")) e.target.classList.toggle("on");

  const fav = e.target.closest("[data-fav]"); if (fav) { SELFAV = +fav.dataset.fav; renderActivity(); }
  const pre = e.target.closest("[data-preset]"); if (pre) { SELPRESET = +pre.dataset.pi; $("#qt-amt").value = pre.dataset.preset; $$("#qt .preset").forEach((p) => p.classList.toggle("on", p === pre)); }

  if (e.target.id === "qt-send") {
    const amt = parseFloat($("#qt-amt").value || "0"), to = S.contacts[SELFAV].name;
    if (!(amt > 0)) return toast("Montant invalide");
    if (DEMO) { S.total_balance -= amt; S.accounts[0].balance -= amt; S.transactions.unshift({ date: "Aujourd'hui", merchant: to, cat: "Transfert", amount: -amt }); }
    else { await api("/api/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, amount: amt }) }); await loadState(); }
    renderActivity(); toast(`${fmt(amt, S.currency)} envoyés à ${to} ✅`);
  }
  const g = e.target.closest("[data-goal]");
  if (g) { const goal = S.goals[+g.dataset.goal]; goal.saved = Math.min(goal.target, goal.saved + 100); goal.pct = Math.round(goal.saved / goal.target * 100); renderReports(); toast("100 $ ajoutés 🎯"); }
});
document.addEventListener("input", (e) => { if (e.target.id === "limit-range") $("#limit-v").textContent = fmt0(+e.target.value, S ? S.currency : "USD"); });

// ---- copilot ----
const panel = $("#panel");
$("#fab").addEventListener("click", () => { panel.hidden = false; document.body.classList.add("panel-open"); $("#input").focus(); });
$("#close").addEventListener("click", () => { panel.hidden = true; document.body.classList.remove("panel-open"); });
const messages = $("#messages"); let history = [];
function addBubble(text, who) { const el = document.createElement("div"); el.className = `bub ${who}`; el.textContent = text; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; }
function addTool(ev) { const el = document.createElement("div"); el.className = `tool ${ev.ok ? "" : "err"}`;
  const arg = ev.args && Object.keys(ev.args).length ? `(${Object.values(ev.args).join(", ")})` : "()";
  el.textContent = `⚙ outil · ${ev.tool}${arg}`; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; }
function demoReply(text) {
  const t = text.toLowerCase();
  if (t.includes("solde")) return { events: [{ tool: "get_balance", args: {}, ok: true }], reply: `Ton solde total est de ${fmt(S.total_balance, S.currency)} réparti sur ${S.accounts.length} comptes.` };
  if (t.includes("abonnement") || t.includes("dépense")) return { events: [{ tool: "search_documents", args: { query: "abonnements" }, ok: true }], reply: "Ce mois-ci : 84,97 $ d'abonnements (Netflix, Spotify, iCloud, Figma)." };
  if (t.includes("gèle") || t.includes("gele") || t.includes("carte")) { const c = S.cards[0]; c.status = "frozen"; if (VIEW === "cards") renderCards();
    return { events: [{ tool: "freeze_card", args: { card_type: "Mastercard" }, ok: true }], reply: `C'est fait ✅ Ta carte ${c.type} •• ${c.last4} est gelée.` }; }
  return { events: [], reply: "(Aperçu démo) Lance le projet avec le backend pour une vraie réponse de l'IA." };
}
async function send(text) {
  addBubble(text, "u");
  const typing = document.createElement("div"); typing.className = "typing"; typing.textContent = "Finora réfléchit…"; messages.appendChild(typing); messages.scrollTop = messages.scrollHeight;
  let d = DEMO ? null : await api("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history }) });
  typing.remove(); if (!d) d = demoReply(text);
  (d.events || []).forEach(addTool); addBubble(d.reply || "(pas de réponse)", "a");
  history.push({ role: "user", content: text }); history.push({ role: "assistant", content: d.reply || "" });
  if (!DEMO) await loadState(); else render();
}
$("#form").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#input").value.trim(); if (!v) return; $("#input").value = ""; send(v); });
messages.addEventListener("click", (e) => { if (e.target.classList.contains("chip")) send(e.target.textContent); });

loadState();
