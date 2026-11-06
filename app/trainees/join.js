(function () {
  const TR = window.FA_TR;
  const $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const nextId = TR.parseUuid(params.get("next"));
  let resetMode = params.get("reset") === "1";
  let sb = null, me = null, langs = [], photoData = null, existing = null, signUpMode = true, busy = false, nav = false;

  function client() {
    const cfg = window.FASCIAPP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) throw new Error("Sign-in is not configured.");
    if (!sb) sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage, storageKey: "fasciapp-auth"}
    });
    return sb;
  }
  function capTok(key) {
    try { return window.FaCaptcha ? FaCaptcha.token(key) : Promise.resolve(undefined); }
    catch (e) { return Promise.resolve(undefined); }
  }
  function friendly(err) {
    const m = String(err && err.message || err || "");
    if (/bbtrs_trainees|does not exist|schema cache/i.test(m)) return "The directory database is not ready yet. Apply supabase/migrations/20261105163000_bbtrs_trainees.sql in the Supabase SQL editor, then try again.";
    if (/captcha/i.test(m)) return "The security check didn't pass. Wait for the check above the button to finish, then try again.";
    if (/not confirmed/i.test(m)) return "Please confirm your email first: open the link we sent (check spam too).";
    if (/already registered|already exists/i.test(m)) return "An account with this email already exists. Please sign in.";
    if (/rate limit|too many|security purposes/i.test(m)) return "Please try again in a moment.";
    if (/redirect/i.test(m)) return "The confirmation link could not be sent. Add https://fasciapp.app/app/trainees/join.html to the Supabase Auth redirect allow-list, then try again.";
    return m || "Something went wrong.";
  }
  function showAuth(up) {
    signUpMode = up !== false;
    $("#authBox").hidden = false;
    $("#profForm").hidden = true;
    $("#authForm").hidden = false;
    $("#forgotForm").hidden = true;
    $("#resetForm").hidden = true;
    $("#tabUp").classList.toggle("on", signUpMode);
    $("#tabIn").classList.toggle("on", !signUpMode);
    $("#authBtn").textContent = signUpMode ? "Create account" : "Log in";
    $("#agreeL").hidden = !signUpMode;
    $("#forgotWrap").hidden = signUpMode;
    $("#pw").autocomplete = signUpMode ? "new-password" : "current-password";
    $("#joinH").textContent = "BBTRS online directory – students in training";
    const mine = $("#mineCard"); if (mine) { mine.hidden = true; mine.innerHTML = ""; }
    try { FaCaptcha.mount("auth"); } catch (e) {}
  }
  function showForgot() {
    $("#authForm").hidden = true;
    $("#forgotForm").hidden = false;
    $("#resetForm").hidden = true;
    $("#joinH").textContent = "Reset your password";
    $("#forgotEmail").value = $("#email").value || "";
    try { FaCaptcha.mount("forgot"); } catch (e) {}
  }
  function showReset() {
    $("#authBox").hidden = false;
    $("#profForm").hidden = true;
    $("#authForm").hidden = true;
    $("#forgotForm").hidden = true;
    $("#resetForm").hidden = false;
    $("#joinH").textContent = "Set a new password";
  }
  function fillCountries(selected) {
    const names = [...new Set(Object.values(window.FA_CC || {}))].filter(Boolean).sort((a, b) => a.localeCompare(b, "en"));
    const sel = window.canonCountry ? canonCountry(selected || "") : (selected || "");
    $("#country").innerHTML = `<option value="">Country</option>` + names.map(n => `<option value="${TR.esc(n)}"${n === sel ? " selected" : ""}>${TR.esc(n)}</option>`).join("");
  }
  function paintLangs() {
    const extra = langs.filter(l => !TR.LANGS.some(x => x.toLowerCase() === l.toLowerCase()));
    $("#langBox").innerHTML = TR.LANGS.concat(extra).map(l => {
      const on = langs.some(x => x.toLowerCase() === l.toLowerCase());
      return `<button type="button" data-lang="${TR.esc(l)}" class="${on ? "on" : ""}" aria-pressed="${on ? "true" : "false"}">${TR.esc(l)}</button>`;
    }).join("");
  }
  function toggleLang(name) {
    const i = langs.findIndex(x => x.toLowerCase() === name.toLowerCase());
    if (i >= 0) langs.splice(i, 1); else langs = TR.cleanLanguages(langs.concat(name));
    paintLangs();
  }
  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Could not read that photo."));
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement("canvas"), s = 256, m = Math.min(im.width, im.height);
          c.width = c.height = s;
          c.getContext("2d").drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, s, s);
          resolve(c.toDataURL("image/jpeg", 0.85));
        };
        im.onerror = () => reject(new Error("Could not read that photo."));
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  async function loadMine() {
    const {data, error} = await client().from("bbtrs_trainees").select(TR.selectColumns(true)).eq("user_id", me.user_id).maybeSingle();
    if (error) throw error;
    existing = data ? TR.redact(data, true) : null;
  }
  function fillForm() {
    const f = $("#profForm");
    const p = existing;
    f.name.value = p ? p.name : "";
    fillCountries(p ? p.country : "");
    f.cohort.value = p ? TR.cohortText(p) : "";
    f.bio.value = p ? p.bio : "";
    f.website.value = p && p.website ? p.website : "";
    f.email.value = p && p.email ? p.email : (me.email || "");
    f.whatsapp.value = p && p.whatsapp ? p.whatsapp : "";
    langs = p ? TR.cleanLanguages(p.languages) : [];
    photoData = p && p.photo ? p.photo : null;
    const img = $("#phPrev");
    img.hidden = !photoData;
    if (photoData) img.src = photoData;
    paintLangs();
    $("#who").textContent = "Signed in as " + (me.email || "");
    $("#saveBtn").textContent = p ? "Save changes" : "Publish my profile";
    $("#hideBtn").hidden = !p;
    $("#hideBtn").textContent = p && p.published === false ? "Publish my listing" : "Hide my listing";
    $("#delBtn").hidden = !p;
    $("#liveNote").textContent = p && p.published === false
      ? "Your listing is hidden. Save changes, then publish it when you want it in the directory."
      : "Your listing goes into the public directory as soon as you save it. You can hide it later. People contact you directly. There is no booking step.";
    $("#joinH").textContent = p ? "Edit your listing" : "Your training profile";
    $("#joinLead").hidden = !!p;
    paintMine();
  }
  function paintMine() {
    const box = $("#mineCard");
    if (!box) return;
    if (!existing) { box.hidden = true; box.innerHTML = ""; return; }
    const pub = existing.published !== false;
    box.hidden = false;
    box.innerHTML = `<b>Your listing</b><p>${TR.esc(existing.name || "Your profile")}</p><p class="muted">${pub ? "Visible in the public directory." : "Hidden from the public directory. Your details are kept."}</p><div class="trActs"><button type="button" class="gold" id="mineEdit">Edit</button><button type="button" class="ghost" id="mineHide">${pub ? "Hide" : "Publish"}</button><button type="button" class="ghost" id="mineDelete">Delete</button></div>`;
    $("#mineEdit").onclick = () => { const f = $("#profForm"); f.hidden = false; f.scrollIntoView({block: "start"}); };
    $("#mineHide").onclick = () => $("#hideBtn").click();
    $("#mineDelete").onclick = () => $("#delBtn").click();
  }
  function goDirectory(id) {
    const embed = new URLSearchParams(location.search).get("embed") === "1";
    if (embed && window.parent && window.parent !== window) {
      window.parent.location.replace("../?trainees=1" + (id ? "&id=" + encodeURIComponent(id) : ""));
      return;
    }
    location.replace(id ? "./?id=" + encodeURIComponent(id) : "./");
  }
  async function enterApp(session) {
    if (nav) return;
    const u = session && session.user;
    if (!u) { showAuth(true); return; }
    me = {user_id: u.id, email: u.email || ""};
    if (nextId && params.get("list") !== "1") {
      nav = true;
      goDirectory(nextId);
      return;
    }
    try { await loadMine(); }
    catch (err) { $("#authBox").hidden = true; $("#profForm").hidden = false; $("#profMsg").textContent = friendly(err); fillCountries(""); paintLangs(); return; }
    $("#authBox").hidden = true;
    $("#profForm").hidden = false;
    fillForm();
  }

  $("#tabUp").onclick = () => showAuth(true);
  $("#tabIn").onclick = () => showAuth(false);
  $("#forgotLink").onclick = e => { e.preventDefault(); showForgot(); };
  $("#forgotBack").onclick = () => showAuth(false);
  $("#langBox").onclick = e => { const b = e.target.closest("[data-lang]"); if (b) toggleLang(b.dataset.lang); };
  $("#langAdd").onclick = () => { const v = $("#langNew").value; $("#langNew").value = ""; if (v.trim()) toggleLang(v.trim()); };
  $("#langNew").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#langAdd").click(); } });
  $("#photo").onchange = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      photoData = await readPhoto(file);
      $("#phPrev").src = photoData;
      $("#phPrev").hidden = false;
    } catch (err) { $("#profMsg").textContent = err.message; }
  };
  $("#authForm").onsubmit = async e => {
    e.preventDefault();
    if (busy) return;
    const em = $("#email").value.trim().toLowerCase(), pw = $("#pw").value, m = $("#authMsg");
    if (signUpMode && !$("#agree").checked) { m.textContent = "Please confirm you are 18+ and accept the Terms and Privacy Policy."; return; }
    busy = true; m.textContent = "…";
    try {
      const token = await capTok("auth");
      if (signUpMode) {
        const redirect = location.origin + "/app/trainees/join.html" + (location.search || "?list=1");
        const su = await client().auth.signUp({email: em, password: pw, options: {captchaToken: token, emailRedirectTo: redirect, data: {signup_source: "bbtrs_trainee", news_optin: false}}});
        if (su.error && /already registered|already exists/i.test(su.error.message || "")) {
          showAuth(false);
          $("#email").value = em;
          m.textContent = "You already have a FasciApp account. Log in to continue. This does not create a second account.";
          return;
        }
        if (su.error && /rate limit|too many/i.test(su.error.message || "")) {
          const r = await client().auth.signInWithPassword({email: em, password: pw, options: {captchaToken: await capTok("auth")}});
          if (r.error) throw r.error;
          m.textContent = "";
          await enterApp(r.data.session);
          return;
        }
        if (su.error) throw su.error;
        if (!su.data.session) { m.textContent = "Almost done. We sent a confirmation link to " + em + ". Open it to activate your account (check spam too), then sign in."; return; }
        await enterApp(su.data.session);
      } else {
        const r = await client().auth.signInWithPassword({email: em, password: pw, options: {captchaToken: token}});
        if (r.error) throw r.error;
        m.textContent = "";
        await enterApp(r.data.session);
      }
    } catch (err) { m.textContent = friendly(err); }
    finally { busy = false; }
  };
  $("#forgotForm").onsubmit = async e => {
    e.preventDefault();
    const em = $("#forgotEmail").value.trim().toLowerCase(), m = $("#forgotMsg");
    m.textContent = "Sending…";
    try {
      const redirectTo = location.origin + "/app/trainees/join.html?reset=1";
      const {error} = await client().auth.resetPasswordForEmail(em, {captchaToken: await capTok("forgot"), redirectTo});
      if (error) throw error;
      m.textContent = "If " + em + " has an account, a link to set a new password is on its way.";
    } catch (err) { m.textContent = friendly(err); }
  };
  $("#resetForm").onsubmit = async e => {
    e.preventDefault();
    const a = $("#newPw").value, b = $("#newPw2").value, m = $("#resetMsg");
    if (a.length < 6) { m.textContent = "Use at least 6 characters."; return; }
    if (a !== b) { m.textContent = "The two passwords do not match."; return; }
    m.textContent = "Saving…";
    try {
      const {error} = await client().auth.updateUser({password: a});
      if (error) throw error;
      resetMode = false;
      history.replaceState({}, "", location.pathname + "?list=1");
      const {data} = await client().auth.getSession();
      m.textContent = "Password updated.";
      await enterApp(data.session);
    } catch (err) { m.textContent = friendly(err); }
  };
  $("#profForm").onsubmit = async e => {
    e.preventDefault();
    if (!me) { showAuth(false); $("#authMsg").textContent = "Log in or create an account before adding your profile."; return; }
    if (busy) return;
    const f = e.target, m = $("#profMsg");
    const cohort = TR.parseCohort(f.cohort.value);
    if (!f.name.value.trim() || f.name.value.trim().length < 2) { m.textContent = "Add your full name."; return; }
    if (!f.country.value) { m.textContent = "Choose your country."; return; }
    if (!cohort) { m.textContent = "Add the month and year your cohort started, for example March 2025."; return; }
    const languages = TR.cleanLanguages(langs);
    if (!languages.length) { m.textContent = "Add at least one spoken language."; return; }
    if (!f.bio.value.trim()) { m.textContent = "Add a short bio."; return; }
    const email = TR.safeMail(f.email.value);
    const whatsapp = f.whatsapp.value.trim();
    if (f.email.value.trim() && !email) { m.textContent = "That email doesn't look right."; return; }
    if (whatsapp && !TR.waLink(whatsapp)) { m.textContent = "Enter a WhatsApp number with the country code, for example +372 5555 1234."; return; }
    if (!email && !whatsapp) { m.textContent = "Add an email or a WhatsApp number."; return; }
    const websiteTyped = f.website.value.trim();
    const website = websiteTyped ? (TR.safeWeb(websiteTyped) || websiteTyped) : "";
    const country = window.canonCountry ? canonCountry(f.country.value) : f.country.value.trim();
    const row = {
      user_id: me.user_id,
      name: f.name.value.trim(),
      bio: f.bio.value.trim(),
      photo: photoData || null,
      website: website || null,
      country,
      languages,
      cohort_month: cohort.month,
      cohort_year: cohort.year,
      cohort_label: cohort.label,
      email: email || null,
      whatsapp: whatsapp || null
    };
    busy = true; m.textContent = "Saving…"; $("#saveBtn").disabled = true;
    try {
      const {data, error} = await client().from("bbtrs_trainees").upsert(row, {onConflict: "user_id"}).select("id,published").single();
      if (error) throw error;
      m.textContent = "";
      goDirectory(data.id);
    } catch (err) { m.textContent = friendly(err); $("#saveBtn").disabled = false; busy = false; }
  };
  $("#hideBtn").onclick = async () => {
    if (!existing || busy) return;
    const on = existing.published === false;
    busy = true; $("#profMsg").textContent = "Saving…";
    try {
      const {error} = await client().from("bbtrs_trainees").update({published: on}).eq("user_id", me.user_id);
      if (error) throw error;
      await loadMine(); fillForm(); $("#profMsg").textContent = on ? "Your listing is public." : "Your listing is hidden.";
    } catch (err) { $("#profMsg").textContent = friendly(err); }
    finally { busy = false; }
  };
  $("#delBtn").onclick = async () => {
    if (!existing || busy || !confirm("Delete your BBTRS online listing? Your FasciApp account stays, and your in-person practitioner listing is not affected.")) return;
    busy = true;
    try {
      const {error} = await client().from("bbtrs_trainees").delete().eq("user_id", me.user_id);
      if (error) throw error;
      goDirectory("");
    } catch (err) { $("#profMsg").textContent = friendly(err); busy = false; }
  };
  $("#signOut").onclick = async () => { try { await client().auth.signOut(); } catch (e) {} me = null; existing = null; showAuth(false); };

  if (new URLSearchParams(location.search).get("embed") === "1") {
    document.body.classList.add("embed");
    const send = () => { try { parent.postMessage({faTraineeH: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}, location.origin); } catch (e) {} };
    if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
    window.addEventListener("load", send);
    setTimeout(send, 400);
  }
  showAuth(false);
  fillCountries("");
  paintLangs();
  client().auth.onAuthStateChange((event, session) => {
    if (resetMode && event !== "USER_UPDATED") { if (session) showReset(); return; }
    if (event === "PASSWORD_RECOVERY") { showReset(); return; }
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) enterApp(session);
  });
})();
