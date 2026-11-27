/* Lab home boxes, Mood Shift, Evening Wind-down, Breath Gifts, and the 21-day journey. */
(function(){
  const $ = id => document.getElementById(id);
  function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function sb(){ return window.faSb || null; }
  function signed(){ try { return !!(window.faSignedIn && faSignedIn()); } catch (e) { return false; } }
  function me(){ try { return window.faMe ? faMe() : null; } catch (e) { return null; } }

  function sheet(html, label){
    const old = document.getElementById("plusRoot");
    if (old) old.remove();
    const root = document.createElement("div");
    root.id = "plusRoot";
    root.className = "ptPop";
    root.innerHTML = '<div class="ptPopDim" data-plus-x></div><div class="ptPopBox" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + "</div>";
    document.body.appendChild(root);
    root.addEventListener("click", e => { if (e.target.closest("[data-plus-x]")) root.remove(); });
    return root;
  }
  function top(title){
    return '<div class="ptPopTop"><b>' + esc(title) + '</b><button type="button" class="ptPopX" data-plus-x aria-label="Close">✕</button></div>';
  }

  function openPractice(p){
    if (p.kind === "gift" && window.FA_GIFTS) return FA_GIFTS.open(p.id);
    if (p.kind === "lab" && window.FasciBreath) return FasciBreath.openIntro(p.id);
    if (p.kind === "listen" && window.FA_LAB) {
      const row = (FA_LAB.catalog({ learn: window.FASCIAPP_LEARN || [], courses: [], breaths: {} }).items || []).find(i => i.section === "listen" && i.slug === p.id);
      if (row && window.faLabLink) return faLabLink(row);
    }
  }

  function moodVisit(id){
    const k = "faMoodN:" + id;
    let n = 0;
    try { n = Number(localStorage.getItem(k) || 0) || 0; } catch (e) {}
    try { localStorage.setItem(k, String(n + 1)); } catch (e) {}
    return n;
  }

  async function saveNote(mood, body){
    body = String(body || "").trim().slice(0, 500);
    if (!body) return;
    const who = me();
    if (!signed() || !who || !sb()) {
      try { sessionStorage.setItem("faMoodDraft", JSON.stringify({ mood, body })); } catch (e) {}
      if (window.faAuthFor) faAuthFor(true, "lab");
      return;
    }
    const day = window.FA_JOURNAL ? FA_JOURNAL.localDay() : null;
    const r = await sb().from("mood_notes").insert({ user_id: who.user_id, mood, body, day });
    if (window.showToast) showToast(r.error ? "Could not save that note" : "Saved for you");
  }

  function journalBox(mood){
    return '<label class="plusNote">How do you feel now?<textarea maxlength="500" rows="3" data-note placeholder="Leave a line about this moment…"></textarea></label>'
      + '<button type="button" class="gold" data-save="' + esc(mood) + '">' + (signed() ? "Save this note" : "Create a free account to save") + "</button>"
      + (signed() ? "" : '<p class="plusFine">The note stays on this phone until you have an account. Nothing is sent.</p>');
  }

  function openMood(id){
    const M = window.FA_MOOD;
    if (!M) return;
    if (!id) {
      const chips = M.MOODS.map((m, i) => {
        const bg = ["#463c6e", "#16695f", "#6e373c", "#19465f", "#96693a", "#3c5032"][i % 6];
        return '<button type="button" class="ltile moodTile" style="--tb:' + bg + '" data-feel="' + m.id + '"><span class="ltTx"><b>' + esc(m.label) + "</b></span></button>";
      }).join("");
      const wind = M.isEvening(new Date()) ? windHtml() : "";
      const root = sheet(top("Mood Shift") + wind + '<p class="ptPopSub">How do you feel right now?</p><div class="labTiles">' + chips + "</div>", "Mood Shift");
      root.querySelectorAll("[data-feel]").forEach(b => b.addEventListener("click", () => openMood(b.getAttribute("data-feel"))));
      const breath = root.querySelector("#windBreath");
      if (breath) breath.onclick = () => window.FA_GIFTS && FA_GIFTS.open("4-7-8");
      const save = root.querySelector("#windSave");
      if (save) save.onclick = () => saveNote("evening", (root.querySelector("#windNote") || {}).value);
      return;
    }
    const m = M.mood(id);
    if (!m) return;
    const card = M.cardAt(id, moodVisit(id));
    const practices = m.practices.map(p => '<button type="button" class="lcard" data-kind="' + p.kind + '" data-id="' + esc(p.id) + '"><div class="lbody"><b>' + esc(p.title) + "</b><small class=\"muted\">" + esc(p.line) + "</small></div></button>").join("");
    const root = sheet(
      top(m.label)
      + '<p class="plusUse">' + esc(M.NOTE) + "</p>"
      + M.cardHtml(card)
      + '<div class="lgrid">' + practices + "</div>"
      + journalBox(id),
      m.label
    );
    root.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => openPractice({ kind: b.getAttribute("data-kind"), id: b.getAttribute("data-id") })));
    const save = root.querySelector("[data-save]");
    if (save) save.onclick = () => saveNote(id, (root.querySelector("[data-note]") || {}).value);
  }

  function windHtml(){
    return '<section class="card moodHome wind"><p class="moodK">Evening Wind-down</p><h2>A quieter close to the day</h2>'
      + '<button type="button" class="lcard" id="windBreath"><div class="lbody"><span class="ltag free">Free</span><b>4-7-8 Breathing</b><small class="muted">In through the nose, out through the mouth. A longer exhale for the nightstand.</small></div></button>'
      + '<label class="plusNote">Close your day<textarea maxlength="500" rows="3" id="windNote" placeholder="What can you set down until morning?"></textarea></label>'
      + '<button type="button" class="gold" id="windSave">' + (signed() ? "Save this note" : "Create a free account to save") + "</button></section>";
  }

  function onBreath(){
    const wrap = $("breathLabSec");
    if (!wrap || !window.FA_GIFTS || wrap.querySelector(".giftStrip")) return;
    const strip = document.createElement("div");
    strip.className = "giftStrip";
    strip.innerHTML = '<div class="giftStripTop"><h3 class="lsec">Breath Gifts</h3><button type="button" class="ghost sm" data-gifts>All 12</button></div><div class="giftGrid">'
      + FA_GIFTS.GIFTS.map(g => FA_GIFTS.cardHtml(g)).join("") + "</div>";
    wrap.appendChild(strip);
  }
  function onLab(){
    const tiles = $("labTiles");
    if (!tiles || $("labFeature") || !window.FA_JOURNEY) return;
    const box = document.createElement("div");
    box.id = "labFeature";
    const price = FA_JOURNEY.priceShort(Date.now());
    box.className = "labTiles";
    box.innerHTML = '<button type="button" class="ltile" style="--tb:#16695f" data-journey><span class="ltIc" aria-hidden="true">☾</span><span class="ltTx"><b>21-day Breath Journey</b><small>21 gentle days</small><small>' + esc(price) + "</small></span></button>"
      + '<button type="button" class="ltile journalTile" data-journal><span class="ltIc" aria-hidden="true">✎</span><span class="ltTx"><b>Daily Journal</b><small>A private note for today</small></span></button>'
      + '<button type="button" class="ltile" style="--tb:#96693a" data-gifts><span class="ltIc" aria-hidden="true">≋</span><span class="ltTx"><b>Breath Gifts</b><small>12 short breaths, free</small></span></button>'
      + '<button type="button" class="ltile" style="--tb:#463c6e" data-mood><span class="ltIc" aria-hidden="true">♡</span><span class="ltTx"><b>Mood Shift</b><small>How do you feel right now?</small></span></button>';
    tiles.parentNode.insertBefore(box, tiles);
  }

  function openGifts(slug, from){
    if (!window.FA_GIFTS) return;
    if (slug && FA_GIFTS.pack(slug)) return FA_GIFTS.openPack(slug);
    if (slug && FA_GIFTS.bySlug(slug)) return FA_GIFTS.open(slug, { from });
    const root = sheet(
      top("Breath Gifts") + '<p class="plusUse">Twelve short breaths. All free. A taste of a longer practice, not the full Lab timer.</p><div class="giftGrid">'
      + FA_GIFTS.GIFTS.map(g => FA_GIFTS.cardHtml(g)).join("") + "</div>",
      "Breath Gifts"
    );
    root.querySelectorAll("[data-gift]").forEach(b => b.addEventListener("click", () => FA_GIFTS.open(b.getAttribute("data-gift"), { from })));
  }

  async function journeyState(){
    const client = sb();
    const who = me();
    if (!client || !who) return { access: false, done: [], reminder: false, buddy: null };
    const email = String(who.email || "").toLowerCase();
    const acc = await client.from("journey_access").select("email").eq("email", email).maybeSingle();
    const prog = await client.from("journey_progress").select("done,reminder").eq("user_id", who.user_id).maybeSingle();
    const buddy = await client.rpc("fa_journey_buddy");
    const row = buddy.data && buddy.data[0];
    return {
      access: !!(acc.data && !acc.error),
      done: (prog.data && prog.data.done) || [],
      reminder: !!(prog.data && prog.data.reminder),
      buddy: row || null
    };
  }
  async function saveProgress(done, reminder){
    const client = sb();
    const who = me();
    if (!client || !who) return;
    await client.from("journey_progress").upsert({ user_id: who.user_id, done, reminder: !!reminder }, { onConflict: "user_id" });
  }

  async function openJourney(opts){
    opts = opts || {};
    const J = window.FA_JOURNEY;
    if (!J) return;
    if (opts.buddy && signed()) {
      const client = sb();
      if (client) {
        const r = await client.rpc("fa_journey_accept", { p_code: String(opts.buddy).toLowerCase() });
        const msg = r.data === "ok" ? "You’re walking this together." : r.data === "need access" ? "Your friend needs their own journey access." : "That invite could not be used.";
        if (window.showToast) showToast(msg);
      }
    }
    const st = await journeyState();
    const stat = J.stats(st.done);
    const days = J.DAYS.map(d => {
      const open = d.free || st.access;
      const mark = st.done.indexOf(d.n) >= 0;
      return '<div class="lcard dayRow' + (open ? "" : " locked") + '"><button type="button" class="lbody" data-day="' + d.n + '" ' + (open ? "" : "disabled") + '><b>Day ' + d.n + " · " + esc(d.title) + "</b><small class=\"muted\">" + esc(d.week) + (d.free ? " · free" : " · in the programme") + "</small></button>"
        + (signed() && open ? '<label class="dayDone"><input type="checkbox" data-done="' + d.n + '"' + (mark ? " checked" : "") + "> Done</label>" : "")
        + "</div>";
    }).join("");
    const buddy = st.buddy ? '<div class="card"><b>Breath Buddy</b><p>You’re walking this together. Your buddy is on day ' + Number(st.buddy.day) + " · streak " + Number(st.buddy.streak) + '.</p><button type="button" class="ghost sm" id="buddyEnd">End sharing</button></div>'
      : '<div class="card"><b>Breath Buddy</b><p>A buddy sees only your day number and streak, and needs their own access. Either of you can end it.</p><button type="button" class="outline" id="buddyInvite">Invite a breath buddy</button></div>';
    const bought = opts.bought ? '<div class="plusBought"><b>After your purchase</b><p>Create an account or sign in with the email you used at Payhip. Daily reminders start soon — nothing is sent yet.</p>'
      + (signed() ? "" : '<button type="button" class="gold" id="journeyAuth">Create account or sign in</button>') + "</div>" : "";
    const root = sheet(
      top("21-day Breath Journey")
      + bought
      + '<p class="plusLine">21 gentle days to calm your nervous system and rest more deeply</p>'
      + '<p class="plusUse">A gentle daily practice from Breathe for Stress and Sleep. An educational self-care programme, not a treatment. Day 1 is free.</p>'
      + '<p class="plusPrice">' + esc(J.priceLine(Date.now())) + "</p>"
      + '<a class="gold big1 lcGo" href="' + esc(J.CHECKOUT_URL) + '" target="_blank" rel="noopener">Get all 21 days</a>'
      + '<p class="plusFine">You are on day ' + stat.day + " · streak " + stat.streak + ".</p>"
      + (signed() && st.access ? '<label class="dayDone"><input type="checkbox" id="journeyRem"' + (st.reminder ? " checked" : "") + "> Email me a daily reminder when they start</label><p class=\"plusFine\">Reminders start soon. Nothing is sent yet.</p>" : "")
      + buddy
      + '<div class="lgrid dayList">' + days + "</div>",
      "21-day Breath Journey"
    );
    root.querySelectorAll("[data-day]").forEach(b => b.addEventListener("click", () => {
      const n = Number(b.getAttribute("data-day"));
      const day = J.DAYS[n - 1];
      if (day && day.video && window.openVideo) openVideo(day.video, "Day 1 · " + day.title);
    }));
    root.querySelectorAll("[data-done]").forEach(box => box.addEventListener("change", async () => {
      const set = new Set(st.done.map(Number));
      const n = Number(box.getAttribute("data-done"));
      if (box.checked) set.add(n); else set.delete(n);
      st.done = [...set];
      await saveProgress(st.done, ($("journeyRem") || {}).checked);
    }));
    const rem = root.querySelector("#journeyRem");
    if (rem) rem.addEventListener("change", () => saveProgress(st.done, rem.checked));
    const auth = root.querySelector("#journeyAuth");
    if (auth) auth.onclick = () => { if (window.faAuthFor) faAuthFor(true, "lab"); };
    const invite = root.querySelector("#buddyInvite");
    if (invite) invite.onclick = async () => {
      const client = sb();
      if (!client) return;
      const r = await client.rpc("fa_journey_invite");
      if (r.error || !r.data) { if (window.showToast) showToast(r.error && /locked/i.test(r.error.message) ? "Buy the journey before inviting a friend." : "Could not make an invite"); return; }
      const url = "https://fasciapp.app/lab/journey/buddy/" + r.data;
      if (window.faLabShare) faLabShare({ title: "Walk the 21 days with me", line: "You’ll each see only a day number and a streak.", url, label: url.replace(/^https:\/\//, ""), cover: "" });
    };
    const end = root.querySelector("#buddyEnd");
    if (end) end.onclick = async () => { const client = sb(); if (client) await client.rpc("fa_journey_end"); root.remove(); openJourney(); };
  }

  function arrive(section, slug, extra){
    extra = extra || {};
    if (section === "journey") { if (window.show) show("learn"); setTimeout(() => openJourney({ buddy: extra.buddy, bought: extra.bought }), 60); return true; }
    if (section === "mood") { if (window.show) show("learn"); setTimeout(() => openMood(extra.feel || slug), 60); return true; }
    if (section === "breathing" && (slug === "gifts" || extra.gift)) {
      if (window.show) show("learn");
      setTimeout(() => openGifts(extra.gift || "", extra.from), 60);
      return true;
    }
    return false;
  }

  async function afterAuth(){
    let raw = "";
    try { raw = sessionStorage.getItem("faMoodDraft") || ""; } catch (e) {}
    if (window.FA_JOURNAL) FA_JOURNAL.afterAuth();
    if (!raw) return;
    try { sessionStorage.removeItem("faMoodDraft"); } catch (e) {}
    let d = null;
    try { d = JSON.parse(raw); } catch (e) {}
    if (d && d.mood && d.body) await saveNote(d.mood, d.body);
  }

  window.faGiftShare = async function(g){
    let from = "";
    try {
      if (signed() && window.DB && DB.mine && window.FA_SHARE) {
        const p = await DB.mine();
        if (p && p.name) from = FA_SHARE.publicName(p.name);
      }
    } catch (e) {}
    const url = FA_GIFTS.giftUrl(g.slug, from);
    if (window.faLabShare) faLabShare({ title: g.title, line: g.use, url, label: url.replace(/^https:\/\//, ""), cover: "" });
  };

  document.addEventListener("click", e => {
    const gift = e.target.closest && e.target.closest("[data-gift]");
    if (gift && !e.target.closest("#plusRoot") && !e.target.closest(".plusRoot")) {
      e.preventDefault(); e.stopPropagation();
      if (window.FA_GIFTS) FA_GIFTS.open(gift.getAttribute("data-gift"));
      return;
    }
    if (e.target.closest && e.target.closest("[data-gifts]")) { openGifts(); return; }
    if (e.target.closest && e.target.closest("[data-mood]")) { openMood(""); return; }
    if (e.target.closest && e.target.closest("[data-journey]")) { openJourney(); return; }
    if (e.target.closest && e.target.closest("[data-journal]")) { if (window.FA_JOURNAL) FA_JOURNAL.open(); return; }
  }, true);

  window.FA_PLUS = { arrive, onLab, onBreath, openMood, openJourney, openGifts, afterAuth, isEvening: d => window.FA_MOOD && FA_MOOD.isEvening(d) };
})();
