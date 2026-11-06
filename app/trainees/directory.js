(function () {
  const TR = window.FA_TR;
  const app = document.getElementById("trApp");
  if (!app || !TR) return;
  let raw = [], me = null, sb = null, previewNote = "";
  let cur = {list: [], i: 0};

  function shell() { return !!document.getElementById("tabs"); }
  function client() {
    const cfg = window.FASCIAPP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) throw new Error("The directory is not configured.");
    if (!sb) sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: !shell(), storage: window.localStorage, storageKey: "fasciapp-auth"}
    });
    return sb;
  }
  function query() {
    const q = new URLSearchParams(location.search);
    const rawId = q.get("id") || "";
    return {rawId, id: TR.parseUuid(rawId), cohort: q.get("cohort") || "", lang: q.get("lang") || ""};
  }
  function writeQuery(next, mode) {
    const u = new URL(location.href);
    if (shell()) u.searchParams.set("trainees", "1");
    ["id", "cohort", "lang"].forEach(k => { if (next[k]) u.searchParams.set(k, next[k]); else u.searchParams.delete(k); });
    u.searchParams.delete("country");
    const url = u.pathname + u.search + u.hash;
    if (mode === "push") history.pushState({}, "", url); else history.replaceState({}, "", url);
  }
  function mineHref(extra) {
    extra = extra || {};
    if (shell()) {
      const u = new URL(location.href);
      u.searchParams.set("trainees", "mine");
      ["id", "cohort", "lang"].forEach(k => u.searchParams.delete(k));
      if (extra.next) u.searchParams.set("next", extra.next); else u.searchParams.delete("next");
      if (extra.list) u.searchParams.set("list", "1"); else u.searchParams.delete("list");
      return u.pathname + u.search;
    }
    const q = new URLSearchParams();
    if (extra.next) q.set("next", extra.next);
    if (extra.list) q.set("list", "1");
    const s = q.toString();
    return "join.html" + (s ? "?" + s : "");
  }
  function inPersonHref() { return shell() ? "?search=1" : "../?search=1"; }
  function setupNote(err) {
    const m = String(err && err.message || err || "");
    if (/bbtrs_trainees|does not exist|schema cache|permission denied|column/i.test(m)) {
      return "The directory is not available yet. Apply supabase/migrations/20261105163000_bbtrs_trainees.sql in the Supabase SQL editor, then reload.";
    }
    return m || "Could not load the directory.";
  }
  function opts(items, selected, all) {
    const list = items.slice();
    if (selected && !list.some(it => it.value === selected)) list.push({value: selected, label: selected});
    return `<option value="">${TR.esc(all)}</option>` + list.map(it => `<option value="${TR.esc(it.value)}"${it.value === selected ? " selected" : ""}>${TR.esc(it.label)}</option>`).join("");
  }
  function shownList(q) {
    return TR.sortTrainees(TR.filterTrainees(raw, {cohort: q.cohort, lang: q.lang}));
  }
  function contactBlock(p) {
    if (!me) {
      const bits = [];
      if (p.has_whatsapp) bits.push(`<button type="button" class="cb wa" data-gate="1">WhatsApp</button>`);
      if (p.has_email) bits.push(`<button type="button" class="cb mail" data-gate="1">✉️ Email</button>`);
      const row = bits.length ? `<div class="cbs cbsRow">${bits.join("")}</div>` : "";
      return `<div class="ptLock"><p>🔒 <b>Contact details are for members.</b> Log in or create a free account to see WhatsApp and email, then arrange the session directly.</p>${row}<button type="button" class="gold ptLogin">Log in to contact</button></div>`;
    }
    const bits = [];
    const wa = TR.waLink(p.whatsapp);
    if (wa) bits.push(`<a class="cb wa" href="${TR.esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`);
    if (p.email) bits.push(`<a class="cb mail" href="mailto:${TR.esc(p.email)}">✉️ Email</a>`);
    return `<div class="cbs cbsRow">${bits.join("") || `<p class="muted">No direct contact is listed.</p>`}</div><p class="muted">Use WhatsApp or email to arrange a time. There is no booking step.</p>`;
  }
  function mineActs(p) {
    const hidden = p.published === false;
    return `<div class="trMine"><b>Your listing</b><p class="muted">${hidden ? "Hidden from the public directory. Your details are kept." : "Visible in the public directory."}</p><div class="trActs"><button type="button" class="gold" data-own="edit">Edit</button><button type="button" class="ghost" data-own="hide">${hidden ? "Publish" : "Hide"}</button><button type="button" class="ghost" data-own="del">Delete</button></div></div>`;
  }
  function adminButtons(p) {
    const live = p.published !== false;
    const reviewed = p.reviewed_at ? "Reviewed" : "Not reviewed yet";
    return `<div class="trRow"><button type="button" class="ghost sm" data-pub="${TR.esc(p.id)}" data-on="${live ? "0" : "1"}">${live ? "Hide listing" : "Publish listing"}</button><button type="button" class="ghost sm" data-rev="${TR.esc(p.id)}">Mark reviewed</button><small class="muted">${reviewed}${p.is_test ? " · TEST" : ""}</small></div>`;
  }
  function gridCard(p) {
    const pic = p.photo ? `<img src="${TR.esc(p.photo)}" alt="">` : `<span class="ptFb">${TR.esc(TR.initials(p.name))}</span>`;
    const cohort = TR.cohortText(p);
    const langs = (p.languages || []).filter(Boolean).join(", ");
    return `<button type="button" class="ptT" data-id="${TR.esc(p.id)}" aria-label="${TR.esc(p.name)}, in training">${pic}<span class="trIn">IN TRAINING</span><span class="trOnline">BBTRS online</span><span class="ptOv"><b>${TR.esc(p.name)}</b>${cohort ? `<small>Cohort: ${TR.esc(cohort)}</small>` : ""}${langs ? `<small>${TR.esc(langs)}</small>` : ""}</span></button>`;
  }
  function listView(q) {
    const shown = shownList(q);
    const cohortRows = TR.filterTrainees(raw, {lang: q.lang});
    const cohorts = [];
    const seenC = new Set();
    cohortRows.forEach(r => { const k = TR.cohortKeyOf(r); if (!k || seenC.has(k)) return; seenC.add(k); cohorts.push({value: k, label: TR.cohortText(r)}); });
    cohorts.sort((a, b) => b.value.localeCompare(a.value));
    const langRows = TR.filterTrainees(raw, {cohort: q.cohort});
    const langs = [...new Set(langRows.flatMap(r => r.languages || []))].sort((a, b) => a.localeCompare(b, "en"));
    const admin = me && TR.isAdminUser(me.user_id) && !previewNote ? adminList() : "";
    const mine = me && raw.find(r => r.user_id === me.user_id);
    const mineNote = mine && mine.published === false
      ? `<p class="trMine"><b>Your listing is hidden.</b> <button type="button" class="ghost sm" data-own-open="${TR.esc(mine.id)}">Open it</button> <a href="${TR.esc(mineHref({list: 1}))}">Edit, publish, or delete</a></p>`
      : "";
    const intro = shell() ? "" : `<p class="trOffer"><b>${TR.esc(TR.OFFER)}</b></p><p class="trHint">${TR.esc(TR.DIRECTORY_INTRO)} They are separate from the <a href="${TR.esc(inPersonHref())}">in-person practitioner directory</a>.</p>`;
    return `${previewNote ? `<p class="trHint">${TR.esc(previewNote)}</p>` : ""}${intro}${mineNote}<div class="trFilters trFilters2">
      <select id="fCohort" aria-label="Cohort">${opts(cohorts, q.cohort, "Cohort")}</select>
      <select id="fLang" aria-label="Language">${opts(langs.map(c => ({value: c, label: c})), q.lang, "Language")}</select>
    </div>
    <p class="trCount muted">${shown.length ? `${shown.length} practitioner${shown.length === 1 ? "" : "s"} in training` : "No practitioners in training match these filters."}</p>
    <div class="ptGrid trGrid">${shown.map(gridCard).join("")}</div>
    ${shown.length ? "" : `<p class="muted">No one is listed yet.</p>`}
    <p><a class="gold big1" href="${TR.esc(mineHref({list: 1}))}">Join as a practitioner in training</a></p>
    ${admin}`;
  }
  function adminList() {
    const rows = raw.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return `<section class="trAdmin"><b>Review</b><p class="muted">Only you see this. New listings are already public.</p>${rows.map(p => `<div class="trCard"><span><b>${TR.esc(p.name)}</b><small>${p.published === false ? "Hidden" : "Public"}${p.is_test ? " · TEST" : ""} · ${p.reviewed_at ? "Reviewed" : "Not reviewed"}</small>${adminButtons(p)}</span></div>`).join("") || `<p class="muted">No listings.</p>`}</section>`;
  }
  function ensureSheet() {
    let sh = document.getElementById("trSheet");
    if (sh) return sh;
    sh = document.createElement("div");
    sh.id = "trSheet";
    sh.className = "ptSheet";
    sh.hidden = true;
    sh.innerHTML = `<div class="ptDim"></div><div class="ptBox" role="dialog" aria-modal="true" aria-label="Practitioner in training"><div class="ptTop"><button type="button" class="ptBk"><b>‹</b> <span>Directory</span></button><button type="button" class="ptX" aria-label="Close">✕</button></div><div class="ptScroll"></div></div>`;
    document.body.appendChild(sh);
    sh.addEventListener("click", onSheetClick);
    const box = sh.querySelector(".ptBox");
    let tx = 0, ty = 0;
    box.addEventListener("touchstart", e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, {passive: true});
    box.addEventListener("touchend", e => {
      const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, {passive: true});
    return sh;
  }
  function paintSheet() {
    const p = cur.list[cur.i];
    const sh = ensureSheet();
    if (!p) { sh.hidden = true; document.body.classList.remove("ptOpen"); return; }
    const scr = sh.querySelector(".ptScroll");
    const many = cur.list.length > 1;
    const pic = p.photo ? `<img src="${TR.esc(p.photo)}" alt="">` : `<span class="ptFb">${TR.esc(TR.initials(p.name))}</span>`;
    const langs = (p.languages || []).filter(Boolean);
    const cohort = TR.cohortText(p);
    const tags = [];
    if (cohort) tags.push("Cohort: " + cohort);
    langs.forEach(l => tags.push(l));
    const web = p.website && TR.safeWeb(p.website);
    const where = [p.country].filter(Boolean).join(", ");
    const mine = me && p.user_id && p.user_id === me.user_id;
    const count = many ? `<div class="ptNav"><button type="button" class="ptPrev" aria-label="Previous">‹</button><span>${cur.i + 1} of ${cur.list.length}${where ? " · " + TR.esc(where) : ""}</span><button type="button" class="ptNext" aria-label="Next">›</button></div>` : "";
    scr.innerHTML = `<div class="ptHero">${pic}<span class="trOnlineBadge">BBTRS online</span>${count}</div>
      <div class="ptBody" data-pid="${TR.esc(p.id)}"><h3>${TR.esc(p.name)}</h3>
      <p class="shHl trOfferLine">${TR.esc(TR.OFFER)}</p>
      ${where ? `<div class="ptLocs">📍 ${TR.esc(where)}</div>` : ""}
      ${tags.length ? `<div class="chs ptMods">${tags.map(t => `<span class="ch">${TR.esc(t)}</span>`).join("")}</div>` : ""}
      ${p.published === false ? `<p class="trHidden">Hidden from the public directory</p>` : ""}
      ${p.bio ? `<div class="ptBio">${TR.esc(p.bio)}</div><button type="button" class="ptMore">Read more</button>` : ""}
      ${web ? `<div class="ptWeb">🌐 <a href="${TR.esc(web)}" target="_blank" rel="noopener">${TR.esc(String(p.website).replace(/^https?:\/\//i, ""))}</a></div>` : ""}
      ${contactBlock(p)}
      ${mine ? mineActs(p) : ""}
      ${me && TR.isAdminUser(me.user_id) ? adminButtons(p) : ""}
      </div>`;
    scr.scrollTop = 0;
    const b = scr.querySelector(".ptBio"), m = scr.querySelector(".ptMore");
    if (b && m) requestAnimationFrame(() => { if (b.scrollHeight <= b.clientHeight + 2) m.hidden = true; });
    sh.hidden = false;
    document.body.classList.add("ptOpen");
  }
  function openAt(id, mode) {
    const q = query();
    let list = shownList(q);
    let i = list.findIndex(r => r.id === id);
    if (i < 0) {
      const p = raw.find(r => r.id === id);
      if (!p) return false;
      list = [p];
      i = 0;
    }
    cur = {list, i};
    if (mode) {
      q.id = id;
      q.rawId = id;
      writeQuery(q, mode);
    }
    paintSheet();
    return true;
  }
  function closeSheet(mode) {
    const sh = document.getElementById("trSheet");
    if (sh) sh.hidden = true;
    const pt = document.getElementById("ptSheet");
    if (!pt || pt.hidden) document.body.classList.remove("ptOpen");
    if (mode) {
      const q = query();
      q.id = "";
      q.rawId = "";
      writeQuery(q, mode);
    }
  }
  function step(k) {
    if (cur.list.length < 2) return;
    cur.i = (cur.i + k + cur.list.length) % cur.list.length;
    const p = cur.list[cur.i];
    const q = query();
    q.id = p.id;
    q.rawId = p.id;
    writeQuery(q, "replace");
    paintSheet();
  }
  function goMine(extra) {
    closeSheet("replace");
    if (window.faOpenBbtrs) { window.faOpenBbtrs("mine", extra || {}); return; }
    location.href = mineHref(extra || {});
  }
  async function onSheetClick(e) {
    const t = e.target;
    if (t.closest(".ptX") || t.closest(".ptBk") || t.classList.contains("ptDim")) { closeSheet("push"); return; }
    if (t.closest(".ptPrev")) { step(-1); return; }
    if (t.closest(".ptNext")) { step(1); return; }
    if (t.closest(".ptMore")) { const b = t.closest(".ptSheet").querySelector(".ptBio"); if (b) b.classList.add("open"); t.closest(".ptMore").hidden = true; return; }
    if (t.closest(".ptLogin") || t.closest("[data-gate]")) {
      const p = cur.list[cur.i];
      goMine({next: p && p.id});
      return;
    }
    const own = t.closest("[data-own]");
    if (own) { await ownAction(own.dataset.own); return; }
    await adminAction(t);
  }
  async function ownAction(kind) {
    if (!me) return;
    try {
      if (kind === "edit") { goMine({list: 1}); return; }
      if (kind === "hide") {
        const p = raw.find(r => r.user_id === me.user_id);
        if (!p) return;
        const on = p.published === false;
        const {error} = await client().from("bbtrs_trainees").update({published: on}).eq("user_id", me.user_id);
        if (error) throw error;
        await load();
        render();
        const next = raw.find(r => r.user_id === me.user_id);
        if (next) openAt(next.id, "replace");
        else closeSheet("replace");
        return;
      }
      if (kind === "del") {
        if (!confirm("Delete your BBTRS online listing? Your FasciApp account stays, and your in-person practitioner listing is not affected.")) return;
        const {error} = await client().from("bbtrs_trainees").delete().eq("user_id", me.user_id);
        if (error) throw error;
        await load();
        render();
        closeSheet("replace");
      }
    } catch (err) { alert(setupNote(err)); }
  }
  async function adminAction(t) {
    const pub = t.closest("[data-pub]");
    const rev = t.closest("[data-rev]");
    if (!pub && !rev) return;
    if (!me || !TR.isAdminUser(me.user_id)) return;
    const id = (pub || rev).dataset.pub || (pub || rev).dataset.rev;
    try {
      const patch = pub ? {published: pub.dataset.on === "1"} : {reviewed_at: new Date().toISOString()};
      const {error} = await client().from("bbtrs_trainees").update(patch).eq("id", id);
      if (error) throw error;
      await load();
      render();
      if (cur.list[cur.i]) openAt(cur.list[cur.i].id);
    } catch (err) { alert(setupNote(err)); }
  }
  function render() {
    const q = query();
    if (q.rawId && !q.id) app.innerHTML = `<p class="muted">This profile is not available.</p>`;
    else app.innerHTML = listView(q);
  }
  async function load() {
    me = null;
    previewNote = "";
    try {
      const {data} = await client().auth.getSession();
      const u = data.session && data.session.user;
      if (u) me = {user_id: u.id, email: u.email || ""};
    } catch (e) { me = null; }
    let rows = null, err = null;
    try {
      const res = await client().from("bbtrs_trainees").select(TR.selectColumns(!!me)).order("name").limit(1000);
      if (res.error) err = res.error; else rows = res.data || [];
    } catch (e) { err = e; }
    if (err) { raw = []; previewNote = setupNote(err); return; }
    raw = (rows || []).map(r => TR.redact(r, !!me));
  }
  function syncFromUrl() {
    render();
    const q = query();
    if (q.id) openAt(q.id);
    else closeSheet(false);
  }
  app.addEventListener("change", e => {
    const q = query();
    if (e.target.id === "fCohort") q.cohort = e.target.value;
    else if (e.target.id === "fLang") q.lang = e.target.value;
    else return;
    q.id = "";
    q.rawId = "";
    writeQuery(q, "replace");
    closeSheet(false);
    render();
  });
  app.addEventListener("click", e => {
    const ownOpen = e.target.closest("[data-own-open]");
    if (ownOpen) { openAt(ownOpen.dataset.ownOpen, "push"); return; }
    const card = e.target.closest("[data-id]");
    if (card && card.dataset.id) { openAt(card.dataset.id, "push"); return; }
    adminAction(e.target);
  });
  document.addEventListener("keydown", e => {
    const sh = document.getElementById("trSheet");
    if (!sh || sh.hidden) return;
    if (e.key === "Escape") closeSheet("push");
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  });
  window.addEventListener("popstate", syncFromUrl);
  const prevClose = window.faSheetClose;
  window.faSheetClose = function () { closeSheet(false); if (prevClose) prevClose(); };
  window.faTraineeRefresh = function () { return load().then(syncFromUrl).catch(err => { raw = []; previewNote = setupNote(err); render(); }); };
  load().then(syncFromUrl).catch(err => { raw = []; previewNote = setupNote(err); render(); });
})();
