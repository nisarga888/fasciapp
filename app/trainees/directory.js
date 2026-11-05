(function () {
  const TR = window.FA_TR;
  const app = document.getElementById("trApp");
  let raw = [], me = null, sb = null, previewNote = "";

  function client() {
    const cfg = window.FASCIAPP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) throw new Error("The directory is not configured.");
    if (!sb) sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage, storageKey: "fasciapp-auth"}
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
    ["id", "cohort", "lang"].forEach(k => { if (next[k]) u.searchParams.set(k, next[k]); else u.searchParams.delete(k); });
    u.searchParams.delete("country");
    const url = u.pathname + u.search;
    if (mode === "push") history.pushState({}, "", url); else history.replaceState({}, "", url);
  }
  function setupNote(err) {
    const m = String(err && err.message || err || "");
    if (/bbtrs_trainees|does not exist|schema cache|permission denied|column/i.test(m)) {
      return "The directory is not available yet. Apply supabase/migrations/20261105163000_bbtrs_trainees.sql in the Supabase SQL editor, then reload.";
    }
    return m || "Could not load the directory.";
  }
  function photoHTML(p, cls) {
    if (p.photo) return `<img class="${cls}" src="${TR.esc(p.photo)}" alt="">`;
    return `<span class="av big ${cls}" style="display:inline-flex">${TR.esc(TR.initials(p.name))}</span>`;
  }
  function opts(items, selected, all) {
    const list = items.slice();
    if (selected && !list.some(it => it.value === selected)) list.push({value: selected, label: selected});
    return `<option value="">${TR.esc(all)}</option>` + list.map(it => `<option value="${TR.esc(it.value)}"${it.value === selected ? " selected" : ""}>${TR.esc(it.label)}</option>`).join("");
  }
  function contactBlock(p) {
    const gate = "join.html?next=" + encodeURIComponent(p.id);
    if (!me) {
      const bits = [];
      if (p.has_whatsapp) bits.push(`<a class="cb wa" href="${TR.esc(gate)}">WhatsApp</a>`);
      if (p.has_email) bits.push(`<a class="cb mail" href="${TR.esc(gate)}">Email</a>`);
      if (!bits.length) return `<p class="muted">No direct contact is listed.</p>`;
      return `<div class="trLock"><p><b>Contact details are for signed-in visitors.</b> Create a free account or log in to see WhatsApp and email, then arrange the appointment directly.</p><div class="trActs">${bits.join("")}</div><a class="gold big1" href="${TR.esc(gate)}">Sign in / Create account</a></div>`;
    }
    const bits = [];
    const wa = TR.waLink(p.whatsapp);
    if (wa) bits.push(`<a class="cb wa" href="${TR.esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`);
    if (p.email) bits.push(`<a class="cb mail" href="mailto:${TR.esc(p.email)}">Email</a>`);
    return `<div class="trActs">${bits.join("") || `<p class="muted">No direct contact is listed.</p>`}</div><p class="muted">Use WhatsApp or email to arrange a time.</p>`;
  }
  function profile(p) {
    const mine = me && p.user_id === me.user_id;
    const langs = (p.languages || []).map(x => TR.esc(x)).join(", ");
    return `<button type="button" class="back" id="trBack">← Directory</button>
    <article class="card trHero">
      ${photoHTML(p, "trPh")}
      <span class="trIn">IN TRAINING</span>${p.is_test ? ` <i class="trTest">TEST</i>` : ""}
      <h2>${TR.esc(p.name)}</h2>
      <p class="trOffer">${TR.esc(TR.OFFER)}</p>
      ${p.published === false ? `<p class="trHidden">Hidden from the public directory</p>` : ""}
      ${p.is_test ? `<p class="trHint">TEST listing. Not an account.</p>` : ""}
      <ul class="trFacts">
        <li><b>Cohort started</b> · ${TR.esc(TR.cohortText(p) || "—")}</li>
        <li><b>Languages</b> · ${langs || "—"}</li>
        ${p.website ? `<li><b>Website</b> · <a href="${TR.esc(p.website)}" target="_blank" rel="noopener">${TR.esc(p.website.replace(/^https?:\/\//, ""))}</a></li>` : ""}
      </ul>
      <p class="trBio">${TR.esc(p.bio)}</p>
      ${contactBlock(p)}
      ${mine ? `<p><a href="join.html?list=1">Edit my listing</a></p>` : ""}
      ${me && TR.isAdminUser(me.user_id) && !p._preview ? adminButtons(p) : ""}
    </article>`;
  }
  function adminButtons(p) {
    const live = p.published !== false;
    const reviewed = p.reviewed_at ? "Reviewed" : "Not reviewed yet";
    return `<div class="trRow"><button type="button" class="ghost sm" data-pub="${TR.esc(p.id)}" data-on="${live ? "0" : "1"}">${live ? "Hide listing" : "Publish listing"}</button><button type="button" class="ghost sm" data-rev="${TR.esc(p.id)}">Mark reviewed</button><small class="muted">${reviewed}</small></div>`;
  }
  function gridCard(p) {
    const pic = p.photo ? `<img src="${TR.esc(p.photo)}" alt="">` : `<span class="ptFb">${TR.esc(TR.initials(p.name))}</span>`;
    return `<button type="button" class="ptT" data-id="${TR.esc(p.id)}" aria-label="${TR.esc(p.name)}, in training">${pic}<span class="trIn">IN TRAINING</span>${p.is_test ? `<span class="trTestMark">TEST</span>` : ""}<span class="ptOv"><b>${TR.esc(p.name)}</b></span></button>`;
  }
  function listView(q) {
    const shown = TR.sortTrainees(TR.filterTrainees(raw, {cohort: q.cohort, lang: q.lang}));
    const cohortRows = TR.filterTrainees(raw, {lang: q.lang});
    const cohorts = [];
    const seenC = new Set();
    cohortRows.forEach(r => { const k = TR.cohortKeyOf(r); if (!k || seenC.has(k)) return; seenC.add(k); cohorts.push({value: k, label: TR.cohortText(r)}); });
    cohorts.sort((a, b) => b.value.localeCompare(a.value));
    const langRows = TR.filterTrainees(raw, {cohort: q.cohort});
    const langs = [...new Set(langRows.flatMap(r => r.languages || []))].sort((a, b) => a.localeCompare(b, "en"));
    const admin = me && TR.isAdminUser(me.user_id) && !previewNote ? adminList() : "";
    return `${previewNote ? `<p class="trHint">${TR.esc(previewNote)}</p>` : ""}<div class="trFilters trFilters2">
      <select id="fCohort" aria-label="Cohort">${opts(cohorts, q.cohort, "All cohorts")}</select>
      <select id="fLang" aria-label="Language spoken">${opts(langs.map(c => ({value: c, label: c})), q.lang, "All languages")}</select>
    </div>
    <p class="trCount muted">${shown.length ? `${shown.length} practitioner${shown.length === 1 ? "" : "s"} in training` : "No practitioners in training match these filters."}</p>
    <div class="ptGrid trGrid">${shown.map(gridCard).join("")}</div>
    ${shown.length ? "" : `<p class="muted">No one is listed yet. <a href="join.html?list=1">Join the directory</a>.</p>`}
    <p><a class="gold big1" href="join.html?list=1">Join as a practitioner in training</a></p>
    ${admin}`;
  }
  function adminList() {
    const rows = raw.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return `<section class="trAdmin"><b>Review</b><p class="muted">Only you see this. New listings are already public.</p>${rows.map(p => `<div class="trCard"><span><b>${TR.esc(p.name)}</b><small>${p.published === false ? "Hidden" : "Public"} · ${p.reviewed_at ? "Reviewed" : "Not reviewed"} · ${TR.esc(p.country || "")}</small>${adminButtons(p)}</span></div>`).join("") || `<p class="muted">No listings.</p>`}</section>`;
  }
  function render() {
    const q = query();
    if (q.rawId && !q.id) { app.innerHTML = `<p class="muted">This profile is not available.</p>`; return; }
    if (q.id) {
      const p = raw.find(r => r.id === q.id);
      app.innerHTML = p ? profile(p) : `<button type="button" class="back" id="trBack">← Directory</button><p class="muted">This profile is not available.</p>`;
      return;
    }
    app.innerHTML = listView(q);
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
    if (err) {
      raw = [];
      previewNote = setupNote(err);
      return;
    }
    raw = (rows || []).map(r => TR.redact(r, !!me));
  }
  app.addEventListener("change", e => {
    const q = query();
    if (e.target.id === "fCohort") q.cohort = e.target.value;
    else if (e.target.id === "fLang") q.lang = e.target.value;
    else return;
    delete q.rawId; q.id = "";
    writeQuery(q, "replace");
    render();
  });
  app.addEventListener("click", async e => {
    const card = e.target.closest("[data-id]");
    if (card && card.dataset.id) {
      const q = query(); q.id = card.dataset.id; q.rawId = card.dataset.id;
      writeQuery(q, "push"); render(); window.scrollTo(0, 0); return;
    }
    if (e.target.closest("#trBack")) {
      const q = query(); q.id = ""; q.rawId = "";
      writeQuery(q, "push"); render(); return;
    }
    const pub = e.target.closest("[data-pub]");
    const rev = e.target.closest("[data-rev]");
    if (!pub && !rev) return;
    if (!me || !TR.isAdminUser(me.user_id)) return;
    const id = (pub || rev).dataset.pub || (pub || rev).dataset.rev;
    try {
      const patch = pub ? {published: pub.dataset.on === "1"} : {reviewed_at: new Date().toISOString()};
      const {error} = await client().from("bbtrs_trainees").update(patch).eq("id", id);
      if (error) throw error;
      await load(); render();
    } catch (err) { alert(setupNote(err)); }
  });
  window.addEventListener("popstate", render);
  load().then(render).catch(err => { raw = []; previewNote = setupNote(err); render(); });
})();
