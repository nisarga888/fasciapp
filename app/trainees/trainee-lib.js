/* Shared rules for the BBTRS Practitioners in Training directory.
   Used in the browser (window.FA_TR) and by node tests (module.exports). */
(function (factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.FA_TR = api;
})(function () {
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const ADMIN_USER_ID = "fea03ec6-5408-494d-8848-228c34f357de";
  const LANGS = ["Arabic", "Chinese", "Czech", "Danish", "Dutch", "English", "Estonian", "Finnish", "French", "German", "Greek", "Hebrew", "Hindi", "Hungarian", "Indonesian", "Italian", "Japanese", "Korean", "Latvian", "Lithuanian", "Norwegian", "Polish", "Portuguese", "Romanian", "Russian", "Spanish", "Swedish", "Thai", "Turkish", "Ukrainian"];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PUBLIC_COLS = "id,user_id,is_test,name,bio,photo,website,country,languages,cohort_month,cohort_year,cohort_label,published,created_at,has_email,has_whatsapp";
  const MEMBER_COLS = PUBLIC_COLS + ",updated_at,email,whatsapp,reviewed_at";

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  }
  function isAdminUser(userId) {
    return String(userId || "").toLowerCase() === ADMIN_USER_ID;
  }
  function parseUuid(v) {
    const s = String(v || "").trim();
    return UUID_RE.test(s) ? s : "";
  }
  function parseCohort(input) {
    const s = String(input || "").trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
    if (!s) return null;
    let month = 0, year = 0, m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})$/))) { year = +m[1]; month = +m[2]; }
    else if ((m = s.match(/^(\d{1,2})[-/.](\d{4})$/))) { month = +m[1]; year = +m[2]; }
    else if ((m = s.match(/^([a-z]+)(?:\s+of)?\s+(\d{4})$/))) {
      year = +m[2];
      const name = m[1];
      month = MONTHS.indexOf(name) + 1;
      if (!month) {
        const short = MONTHS.findIndex(x => x.slice(0, 3) === name);
        month = short + 1;
      }
    } else return null;
    if (month < 1 || month > 12 || year < 1990 || year > 2100) return null;
    const label = MONTH_LABELS[month - 1] + " " + year;
    return {month, year, label, key: year + "-" + String(month).padStart(2, "0")};
  }
  function cohortKeyOf(row) {
    if (!row || !row.cohort_year || !row.cohort_month) return "";
    return row.cohort_year + "-" + String(row.cohort_month).padStart(2, "0");
  }
  function cohortText(row) {
    if (!row) return "";
    const label = String(row.cohort_label || "").trim();
    if (label) return label;
    if (row.cohort_month >= 1 && row.cohort_month <= 12 && row.cohort_year) return MONTH_LABELS[row.cohort_month - 1] + " " + row.cohort_year;
    return "";
  }
  function cleanLanguages(list) {
    const out = [], seen = new Set();
    for (const raw of list || []) {
      const t = String(raw || "").trim().replace(/\s+/g, " ");
      if (t.length < 2 || t.length > 40) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t.charAt(0).toUpperCase() + t.slice(1));
    }
    return out.slice(0, 12);
  }
  function safeWeb(u) {
    let s = String(u || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    try {
      const x = new URL(s);
      if (x.protocol !== "https:" && x.protocol !== "http:") return "";
      if (!x.hostname || x.username || x.password) return "";
      return x.href;
    } catch (e) { return ""; }
  }
  function safeMail(e) {
    const s = String(e || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 120 ? s : "";
  }
  function waLink(n) {
    const d = String(n || "").replace(/\D/g, "");
    if (d.length < 8 || d.length > 15) return "";
    return "https://wa.me/" + d;
  }
  function safePhoto(s) {
    const v = String(s || "");
    if (/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(v) && v.length <= 500000) return v.replace(/\s/g, "");
    if (/^https:\/\/[^\s"'<>]+$/i.test(v) && v.length <= 500) return v;
    return "";
  }
  function selectColumns(signedIn) {
    return signedIn ? MEMBER_COLS : PUBLIC_COLS;
  }
  function redact(row, signedIn) {
    const o = Object.assign({}, row || {});
    o.languages = cleanLanguages(o.languages);
    o.photo = safePhoto(o.photo);
    o.website = safeWeb(o.website);
    o.name = String(o.name || "").trim();
    o.country = String(o.country || "").trim();
    o.bio = String(o.bio || "").trim();
    if (!signedIn) {
      o.email = "";
      o.whatsapp = "";
      delete o.reviewed_at;
    } else {
      o.email = safeMail(o.email);
      o.whatsapp = String(o.whatsapp || "").trim();
    }
    o.has_email = !!(row && row.has_email) || !!o.email;
    o.has_whatsapp = !!(row && row.has_whatsapp) || !!waLink(o.whatsapp);
    if (!signedIn) {
      o.has_email = !!(row && row.has_email);
      o.has_whatsapp = !!(row && row.has_whatsapp);
    }
    return o;
  }
  function sortTrainees(rows) {
    return (rows || []).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", {sensitivity: "base"}) || String(a.id || "").localeCompare(String(b.id || "")));
  }
  function filterTrainees(rows, q) {
    q = q || {};
    const country = String(q.country || "").trim().toLowerCase();
    const cohort = String(q.cohort || "").trim();
    const lang = String(q.lang || "").trim().toLowerCase();
    return (rows || []).filter(r => {
      if (r.published === false) return false;
      if (country && String(r.country || "").trim().toLowerCase() !== country) return false;
      if (cohort && cohortKeyOf(r) !== cohort) return false;
      if (lang && !(r.languages || []).some(x => String(x).trim().toLowerCase() === lang)) return false;
      return true;
    });
  }
  function letterOf(name) {
    const c = String(name || "").trim().charAt(0).toLocaleUpperCase();
    try { if (!/\p{L}/u.test(c)) return "#"; } catch (e) { if (!/[A-Za-z]/.test(c)) return "#"; }
    return c || "#";
  }
  function groupAZ(rows) {
    const groups = [];
    for (const r of sortTrainees(rows)) {
      const letter = letterOf(r.name);
      let g = groups[groups.length - 1];
      if (!g || g.letter !== letter) groups.push(g = {letter, rows: []});
      g.rows.push(r);
    }
    return groups;
  }
  function initials(name) {
    return String(name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  }
  const OFFER = "Practitioner in training (not yet certified) · Free or highly discounted one-hour online practice session";
  const DIRECTORY_INTRO = "These are free or highly discounted practice sessions with BBTRS students in training. They are not yet certified practitioners.";
  const ROLE = "Practitioner in training";
  const COHORT_HELP = "Type the month and year your cohort started.";

  return {
    MONTH_LABELS, ADMIN_USER_ID, LANGS, PUBLIC_COLS, MEMBER_COLS, OFFER, DIRECTORY_INTRO, ROLE, COHORT_HELP,
    esc, isAdminUser, parseUuid, parseCohort, cohortKeyOf, cohortText, cleanLanguages,
    safeWeb, safeMail, waLink, safePhoto, selectColumns, redact, sortTrainees, filterTrainees,
    letterOf, groupAZ, initials
  };
});
