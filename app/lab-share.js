/* Fascia Lab share links. The shared URL is always a Lab path.
   Gated PDFs and paid or external pages stay behind the existing buttons. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_LAB = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const SECTIONS = {
  books: { id: "books", title: "Books", groups: ["Books"] },
  courses: { id: "courses", title: "Online courses", groups: [] },
  breathing: { id: "breathing", title: "Breath Gifts", groups: ["Breathing practices"] },
  listen: { id: "listen", title: "Listen", groups: ["Listen"] },
  watch: { id: "watch", title: "Watch", groups: ["Biodynamic Breathwork Videos", "Myofascial Energetic Release Videos", "Fascia & anatomy"] },
  live: { id: "live", title: "Live sessions", groups: ["Free live sessions"] }
};
const COURSE_SLUG = {
  c1: "breathe-online",
  c2: "self-bodywork",
  c3: "reichian-character-structure",
  c4: "home-practice-breathwork"
};
const GROUP = {};
Object.keys(SECTIONS).forEach(id => SECTIONS[id].groups.forEach(g => { GROUP[g] = id; }));

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function slugify(src){
  let s = String(src || "").trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/ß/g, "ss").replace(/þ/g, "th").replace(/ð/g, "d");
  try { s = s.normalize("NFD").replace(/\p{M}/gu, ""); } catch (e) {}
  s = s.replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d").replace(/ı/g, "i");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (s.length > 60) {
    const cut = s.slice(0, 60);
    const hy = cut.lastIndexOf("-");
    s = (hy > 20 ? cut.slice(0, hy) : cut).replace(/-+$/g, "");
  }
  return s;
}
function take(used, base){
  let slug = base || "item";
  let n = 2;
  while (used.has(slug)) { slug = base + "-" + n; n += 1; }
  used.add(slug);
  return slug;
}
function verbOf(kind){
  if (kind === "book") return "read";
  if (kind === "breath") return "practise";
  if (kind === "video") return "watch";
  return "open";
}
function item(partial){
  const kind = partial.kind;
  const row = {
    section: partial.section,
    slug: partial.slug,
    title: partial.title || "",
    line: partial.line || "",
    by: partial.by || "",
    kind,
    public: !!partial.public,
    id: partial.id || "",
    cover: partial.cover || "",
    href: partial.href || "",
    cta: partial.cta || ""
  };
  row.gated = !row.public;
  row.verb = verbOf(kind);
  row.url = url(row.section, row.slug);
  row.label = row.url.replace(/^https:\/\//, "");
  return row;
}
function catalog(src){
  src = src || {};
  const items = [];
  const used = {};
  const add = row => {
    if (!used[row.section]) used[row.section] = new Set();
    row.slug = take(used[row.section], row.slug || slugify(row.title));
    items.push(item(row));
  };
  (src.learn || []).forEach(x => {
    if (!x || !x.title) return;
    const section = GROUP[x.section];
    if (!section) return;
    const kind = x.type === "youtube" ? "video" : (x.type === "pdf" ? "book" : (section === "listen" ? "listen" : section === "live" ? "live" : "link"));
    add({
      section, kind, title: x.title, line: x.line || "", by: x.by || "",
      public: !!x.public, cover: x.cover || "", href: x.url || "", id: x.youtubeId || "",
      cta: x.cta || (kind === "book" ? "Open PDF" : "Open")
    });
  });
  const order = src.breathOrder || ["coherent", "longer", "box", "f478"];
  const breaths = src.breaths || {};
  order.forEach(id => {
    const p = breaths[id];
    if (!p) return;
    add({
      section: "breathing", kind: "breath", id, slug: id,
      title: p.title || id, line: p.line || "", public: id === "coherent", cover: ""
    });
  });
  (src.courses || []).forEach(c => {
    if (!c || !c.k) return;
    const bits = [c.dur, c.price].filter(Boolean).join(" · ");
    add({
      section: "courses", kind: "course", id: c.k, slug: COURSE_SLUG[c.k] || slugify(c.t || c.title),
      title: c.t || c.title || "Online course", line: bits, by: c.by || "",
      public: true, cover: c.img || "", href: c.url || "", cta: "Open course"
    });
  });
  return { sections: SECTIONS, items };
}
function find(cat, section, slug){
  section = String(section || "").toLowerCase();
  slug = String(slug || "").toLowerCase();
  if (!cat || !SECTIONS[section]) return null;
  if (!slug) return null;
  return (cat.items || []).find(i => i.section === section && i.slug === slug) || null;
}
function sectionOf(id){ return SECTIONS[String(id || "").toLowerCase()] || null; }
function url(section, slug){
  let u = "https://fasciapp.app/lab/" + section;
  if (slug) u += "/" + slug;
  return u;
}
function needsAccount(row, signedIn){ return !!(row && row.gated && !signedIn); }
function gateLine(row){ return "Create a free account to " + (row && row.verb || "open") + " this"; }
function loginLine(row){ return "Log in to " + (row && row.verb || "open") + " this"; }
function coverSrc(row){
  const c = String(row && row.cover || "");
  if (!c || /\.pdf(?:$|\?)/i.test(c)) return "";
  if (/^https:\/\//i.test(c)) return c;
  if (/^lab\/[a-z0-9._-]+$/i.test(c.split("?")[0]) && /\.(jpe?g|png|webp|gif)(?:$|\?)/i.test(c)) return c;
  return "";
}
function coverAbs(row){
  const c = coverSrc(row);
  if (!c) return "https://fasciapp.app/assets/og.png";
  if (/^https:\/\//i.test(c)) return c;
  return "https://fasciapp.app/app/" + c;
}
function leaked(s){
  return /\.pdf|spotify\.com|soundcloud\.com|youtube\.com|youtu\.be|bodyawareness|myofascialtrainings|biodynamicbreath/i.test(String(s || ""));
}
function channels(model){
  const link = model.url;
  const text = (model.title || "Fascia Lab") + " on FasciApp";
  return {
    whatsapp: "https://wa.me/?text=" + encodeURIComponent(text + " " + link),
    email: "mailto:?subject=" + encodeURIComponent(text) + "&body=" + encodeURIComponent(text + "\n" + link)
  };
}
const ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="12" r="2.2"/><circle cx="17" cy="6.5" r="2.2"/><circle cx="17" cy="17.5" r="2.2"/><path d="M8.1 11.1 14.8 7.7M8.1 12.9l6.7 3.4"/></svg>';
function shareBtn(key, label){
  return '<span role="button" tabindex="0" class="lshare" data-lab-share="' + esc(key) + '" aria-label="' + esc(label) + '">' + ICON + "</span>";
}
function previewHtml(model){
  const img = coverSrc(model);
  const art = img
    ? '<img src="' + esc(img) + '" alt="">'
    : '<span class="labAuthIc" aria-hidden="true">' + ICON + "</span>";
  return art + '<span><small class="labAuthEyebrow">Shared with you</small><b>' + esc(model.title) + "</b>" + (model.line ? "<small>" + esc(model.line) + "</small>" : "") + "</span>";
}
function authCardHtml(row){
  return previewHtml(row);
}
function sheetHtml(model){
  model = model || {};
  const native = model.native ? '<button type="button" class="gold big1 labNative" data-native>Share</button>' : "";
  return '<div class="ptPopTop"><b>Share</b><button type="button" class="ptPopX" data-popx aria-label="Close">✕</button></div>'
    + '<div class="labPreview">' + previewHtml(model) + "</div>"
    + '<div class="ptLink"><b>' + esc(model.label || "") + '</b><button type="button" data-copy>Copy link</button></div>'
    + '<div class="labShareActs">'
    + '<button type="button" data-chan="whatsapp">WhatsApp</button>'
    + '<button type="button" data-chan="email">Email</button>'
    + native
    + '<button type="button" class="outline labPract" data-pract>Send to my practitioner</button>'
    + "</div>"
    + '<div class="labQr"><canvas width="180" height="180" aria-label="QR code for this Lab link"></canvas></div>';
}
function ogDesc(row){
  if (!row) return "Practices, books, videos and live sessions in the Fascia Lab.";
  if (row.gated) return gateLine(row) + ".";
  const line = String(row.line || "").replace(/\s+/g, " ").trim();
  return line || row.title;
}
function ogPage(opts){
  opts = opts || {};
  const title = opts.title || "Fascia Lab";
  const desc = opts.desc || ogDesc(null);
  const image = opts.image || "https://fasciapp.app/assets/og.png";
  const canonical = opts.canonical;
  const app = opts.app;
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + "<title>" + esc(title) + " · Fascia Lab</title>\n"
    + '<meta name="description" content="' + esc(desc) + '">\n'
    + '<meta property="og:site_name" content="FasciApp">\n'
    + '<meta property="og:title" content="' + esc(title) + ' · Fascia Lab">\n'
    + '<meta property="og:description" content="' + esc(desc) + '">\n'
    + '<meta property="og:image" content="' + esc(image) + '">\n'
    + '<meta property="og:url" content="' + esc(canonical) + '">\n'
    + '<meta property="og:type" content="website">\n'
    + '<link rel="canonical" href="' + esc(canonical) + '">\n'
    + '<meta http-equiv="refresh" content="0;url=' + esc(app) + '">\n'
    + '<link rel="icon" href="/assets/favicon-32-v4.png" type="image/png">\n'
    + '<script>location.replace(' + JSON.stringify(app) + ")<\/script>\n"
    + '</head>\n<body style="margin:0;background:#02191E;color:#F3EDE4;font-family:Montserrat,system-ui,sans-serif">\n'
    + '<p style="padding:24px"><a style="color:#C99E67" href="' + esc(app) + '">Open in FasciApp</a></p>\n</body>\n</html>\n';
}
function ogFiles(cat){
  const files = [];
  files.push({
    path: "lab/index.html",
    html: ogPage({ title: "Fascia Lab", desc: ogDesc(null), canonical: "https://fasciapp.app/lab", app: "/app/?tab=lab" })
  });
  Object.keys(SECTIONS).forEach(id => {
    const sec = SECTIONS[id];
    files.push({
      path: "lab/" + id + "/index.html",
      html: ogPage({
        title: sec.title,
        desc: sec.title + " in the Fascia Lab.",
        canonical: url(id),
        app: "/app/?lab=" + id
      })
    });
  });
  (cat.items || []).forEach(row => {
    files.push({
      path: "lab/" + row.section + "/" + row.slug + "/index.html",
      html: ogPage({
        title: row.title,
        desc: ogDesc(row),
        image: coverAbs(row),
        canonical: row.url,
        app: "/app/?lab=" + row.section + "&item=" + row.slug
      })
    });
  });
  return files;
}
return {
  SECTIONS, COURSE_SLUG, slugify, catalog, find, sectionOf, url, needsAccount, gateLine, loginLine,
  coverSrc, coverAbs, leaked, channels, shareBtn, shareIconHtml: () => ICON, previewHtml, authCardHtml,
  sheetHtml, ogDesc, ogPage, ogFiles, esc
};
});
