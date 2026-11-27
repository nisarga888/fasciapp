/* My Toolkit. A practitioner's own videos, courses and links.
   Self-contained so the public page and the profile editor share one store. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_MYLAB = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const GROUPS = [
  { id: "youtube", title: "YouTube videos" },
  { id: "course", title: "My courses & trainings" },
  { id: "link", title: "Other links" }
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function httpUrl(raw){
  const s = String(raw || "").trim();
  if (!s || s.length > 500 || /\s/.test(s) || !/^https?:\/\//i.test(s)) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (u.username || u.password || !u.hostname) return "";
    return u.href;
  } catch (e) { return ""; }
}
function kindOf(kind){ return GROUPS.some(g => g.id === kind) ? kind : ""; }
function toolkitPath(slug){ return "/p/" + String(slug || "").trim().toLowerCase() + "/toolkit"; }
function toolkitUrl(slug){ return "https://fasciapp.app" + toolkitPath(slug); }
function resourceUrl(slug, id){
  const base = toolkitUrl(slug);
  return id ? base + "?r=" + encodeURIComponent(id) : base;
}
function who(){ try { return window.faMe ? faMe() : null; } catch (e) { return null; } }
function signed(){ try { return !!(window.faSignedIn && faSignedIn()); } catch (e) { return false; } }
function sb(){ return window.faSb || null; }
function toast(msg){ if (window.showToast) showToast(msg); }

let root = null;
function close(){ if (root) { root.remove(); root = null; } }
function shell(html, label){
  close();
  root = document.createElement("div");
  root.id = "myLabRoot";
  root.className = "ptPop";
  root.innerHTML = '<div class="ptPopDim" data-mlx></div><div class="ptPopBox" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + "</div>";
  document.body.appendChild(root);
  root.addEventListener("click", e => { if (e.target.closest("[data-mlx]")) close(); });
  return root;
}
function top(title){
  return '<div class="ptPopTop"><b>' + esc(title) + '</b><button type="button" class="ptPopX" data-mlx aria-label="Close">✕</button></div>';
}

async function youtubeMeta(url){
  const clean = httpUrl(url);
  if (!clean || !/youtu\.be|youtube\.com|youtube-nocookie\.com/i.test(clean)) return null;
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
  try {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(clean), ctrl ? { signal: ctrl.signal } : {});
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: String(data.title || "").trim().slice(0, 140),
      thumb: httpUrl(data.thumbnail_url || "")
    };
  } catch (e) { return null; }
  finally { if (timer) clearTimeout(timer); }
}

async function mine(){
  const client = sb();
  const me = who();
  if (!client || !me) return [];
  const r = await client.from("practitioner_lab_resources").select("id,kind,url,title,description,thumb,visible_to_clients,sort_order,created_at").eq("user_id", me.user_id).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (r.error) throw new Error(r.error.message);
  return r.data || [];
}
async function visibleRows(userId){
  const client = sb();
  if (!client || !userId) return [];
  const r = await client.from("practitioner_lab_resources").select("id,kind,url,title,description,thumb,sort_order").eq("user_id", userId).eq("visible_to_clients", true).order("sort_order", { ascending: true });
  if (r.error) return [];
  return r.data || [];
}
async function visibleCount(userId){
  const client = sb();
  if (!client || !userId) return 0;
  const r = await client.from("practitioner_lab_resources").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("visible_to_clients", true);
  if (r.error) return 0;
  return r.count || 0;
}

function listingTile(n){
  n = Number(n) || 0;
  if (n < 1) return "";
  return '<button type="button" class="myLabTile" data-open-lab><span class="myLabMark" aria-hidden="true">▣</span><span><b>My Toolkit</b><small>' + n + (n === 1 ? " resource" : " resources") + " for clients</small></span></button>";
}
async function mountListing(slot, person){
  if (!slot || !person || !person.user_id || person.consent === false) { if (slot) slot.innerHTML = ""; return; }
  const n = await visibleCount(person.user_id);
  if (!slot.isConnected) return;
  slot.innerHTML = listingTile(n);
  const btn = slot.querySelector("[data-open-lab]");
  if (btn) btn.onclick = () => openPublic(person.slug || person.id);
}

function groupRows(rows){
  return GROUPS.map(g => ({ ...g, rows: (rows || []).filter(r => r.kind === g.id) }));
}
function rowCard(r, editor){
  const thumb = httpUrl(r.thumb || "");
  const art = thumb ? '<img class="myLabThumb" src="' + esc(thumb) + '" alt="">' : '<span class="myLabThumb ph" aria-hidden="true"></span>';
  const link = httpUrl(r.url);
  if (editor) {
    return '<article class="myLabRow" data-id="' + esc(r.id) + '">' + art
      + '<div class="myLabTx"><b>' + esc(r.title) + "</b><small>" + esc(r.description || link) + "</small></div>"
      + '<label class="myLabVis"><input type="checkbox" data-vis="' + esc(r.id) + '"' + (r.visible_to_clients ? " checked" : "") + "> Visible to clients</label>"
      + '<div class="myLabActs"><button type="button" class="toolkitShare sm" data-share-edit="' + esc(r.id) + '" aria-label="Share ' + esc(r.title) + '">' + SHARE_ICON + '</button><button type="button" data-up="' + esc(r.id) + '">Up</button><button type="button" data-down="' + esc(r.id) + '">Down</button><button type="button" data-edit="' + esc(r.id) + '">Edit</button><button type="button" data-del="' + esc(r.id) + '">Delete</button></div></article>';
  }
  return '<article class="myLabRow" id="labres-' + esc(r.id) + '">' + art
    + '<div class="myLabTx"><b>' + esc(r.title) + "</b>" + (r.description ? "<small>" + esc(r.description) + "</small>" : "") + "</div>"
    + '<div class="myLabActs"><a class="gold" href="' + esc(link) + '" target="_blank" rel="noopener">Open</a><button type="button" class="toolkitShare sm" data-share-res="' + esc(r.id) + '" aria-label="Share ' + esc(r.title) + '">' + SHARE_ICON + "</button></div></article>";
}

const HINT = "Switch on at least one item to share";
const SHARE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="12" r="2.2"/><circle cx="17" cy="6.5" r="2.2"/><circle cx="17" cy="17.5" r="2.2"/><path d="M8.1 11.1 14.8 7.7M8.1 12.9l6.7 3.4"/></svg>';
function whatsappLink(url, title){
  return "https://wa.me/?text=" + encodeURIComponent(String(title || "My Toolkit") + " " + url);
}
function mailLink(url, title){
  const subject = String(title || "My Toolkit");
  return "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(subject + "\n" + url);
}
async function copyText(url){
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); toast("Link copied"); return; }
  } catch (e) {}
  try {
    const t = document.createElement("textarea");
    t.value = url;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
    toast("Link copied");
  } catch (e) { toast("Could not copy that link"); }
}
async function nativeShare(url, title, line){
  if (typeof navigator !== "undefined" && navigator.share) {
    try { await navigator.share({ title: title, text: line || title, url: url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  await copyText(url);
}
function shareSheet(url, title, line){
  const old = document.getElementById("myLabShare");
  if (old) old.remove();
  const d = document.createElement("div");
  d.id = "myLabShare";
  d.className = "ptPop";
  d.innerHTML = '<div class="ptPopDim" data-sx></div><div class="ptPopBox" role="dialog" aria-modal="true" aria-label="Share my Toolkit">'
    + '<div class="ptPopTop"><b>Share my Toolkit</b><button type="button" class="ptPopX" data-sx aria-label="Close">✕</button></div>'
    + '<p class="plusH">' + esc(title) + "</p>" + (line ? '<p class="plusUse">' + esc(line) + "</p>" : "")
    + '<div class="ptLink"><b>' + esc(url.replace(/^https:\/\//, "")) + '</b><button type="button" data-copy>Copy link</button></div>'
    + '<div class="ccChannels"><button type="button" data-wa>WhatsApp</button><button type="button" data-mail>Email</button><button type="button" class="gold" data-native>Share</button></div>'
    + '<div class="labQr"><canvas width="180" height="180" aria-label="QR code"></canvas></div></div>';
  document.body.appendChild(d);
  const cv = d.querySelector("canvas");
  if (cv && window.FA_QR) { try { FA_QR.draw(cv, url); } catch (e) {} }
  d.addEventListener("click", async e => {
    if (e.target.closest("[data-sx]")) { d.remove(); return; }
    if (e.target.closest("[data-copy]")) { await copyText(url); return; }
    if (e.target.closest("[data-wa]")) { window.open(whatsappLink(url, title), "_blank", "noopener"); return; }
    if (e.target.closest("[data-mail]")) { location.href = mailLink(url, title); return; }
    if (e.target.closest("[data-native]")) { await nativeShare(url, title, line); }
  });
}
async function practitionerSlug(){
  try {
    if (window.DB && DB.mine) {
      const p = await DB.mine();
      if (p && p.slug) return p.slug;
    }
  } catch (e) {}
  return "";
}
async function shareToolkit(){
  let rows = [];
  try { rows = await mine(); } catch (e) { rows = []; }
  if (!rows.some(r => r.visible_to_clients)) { toast(HINT); return; }
  const slug = await practitionerSlug();
  if (!slug) { toast("Publish your listing first"); return; }
  shareSheet(toolkitUrl(slug), "My Toolkit", "Videos, courses and links");
}
async function shareResource(row){
  if (!row || !row.visible_to_clients) { toast("Switch this item on to share it."); return; }
  const slug = await practitionerSlug();
  if (!slug) { toast("Publish your listing first"); return; }
  shareSheet(resourceUrl(slug, row.id), row.title, row.description || "");
}

async function openEditor(){
  if (typeof document === "undefined") return;
  if (!signed()) {
    shell(top("My Toolkit") + '<p class="plusUse">My Toolkit is part of your practitioner profile. Sign in to add videos, courses and links.</p><button type="button" class="gold" id="myLabAuth">Create a free account</button>', "My Toolkit");
    const b = root.querySelector("#myLabAuth");
    if (b) b.onclick = () => { if (window.faAuthFor) faAuthFor(false, "lab"); };
    return;
  }
  let rows = [];
  try { rows = await mine(); } catch (e) { toast("Could not load My Toolkit"); return; }
  paintEditor(rows);
}
function paintEditor(rows){
  const body = groupRows(rows).map(g => {
    const items = g.rows.length ? g.rows.map(r => rowCard(r, true)).join("") : '<p class="plusFine">Nothing here yet.</p>';
    return '<h3 class="lsec">' + esc(g.title) + "</h3>" + items;
  }).join("");
  shell(top("My Toolkit") + '<button type="button" class="gold big1" id="myToolkitShare">Share my Toolkit</button><p class="plusUse">What you mark “Visible to clients” appears on your public Toolkit page.</p><button type="button" class="gold" id="myLabAdd">+ Add resource</button>' + body, "My Toolkit");
  const share = root.querySelector("#myToolkitShare");
  if (share) share.onclick = () => shareToolkit();
  const add = root.querySelector("#myLabAdd");
  if (add) add.onclick = () => openForm(null, rows);
  root.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openForm(rows.find(r => r.id === b.getAttribute("data-edit")), rows));
  root.querySelectorAll("[data-del]").forEach(b => b.onclick = () => removeRow(b.getAttribute("data-del")));
  root.querySelectorAll("[data-vis]").forEach(b => b.onchange = () => setVisible(b.getAttribute("data-vis"), b.checked));
  root.querySelectorAll("[data-share-edit]").forEach(b => b.onclick = () => shareResource(rows.find(r => r.id === b.getAttribute("data-share-edit"))));
  root.querySelectorAll("[data-up]").forEach(b => b.onclick = () => move(rows, b.getAttribute("data-up"), -1));
  root.querySelectorAll("[data-down]").forEach(b => b.onclick = () => move(rows, b.getAttribute("data-down"), 1));
}
function formHtml(row){
  const kind = row && row.kind || "youtube";
  const opt = (id, label) => '<option value="' + id + '"' + (kind === id ? " selected" : "") + ">" + label + "</option>";
  return top(row ? "Edit resource" : "Add resource")
    + '<label class="plusNote">Type<select id="mlKind">' + opt("youtube", "YouTube video") + opt("course", "Course or training") + opt("link", "Other link") + "</select></label>"
    + '<label class="plusNote">Link<input id="mlUrl" inputmode="url" placeholder="https://" value="' + esc(row && row.url || "") + '"></label>'
    + '<p class="plusFine" id="mlFetch">A YouTube link fills in the title and thumbnail.</p>'
    + '<label class="plusNote">Title<input id="mlTitle" maxlength="140" value="' + esc(row && row.title || "") + '"></label>'
    + '<label class="plusNote">Short description<textarea id="mlDesc" maxlength="280" rows="3">' + esc(row && row.description || "") + "</textarea></label>"
    + '<label class="myLabVis"><input type="checkbox" id="mlVis"' + (row && row.visible_to_clients ? " checked" : "") + "> Visible to clients</label>"
    + (row && httpUrl(row.thumb) ? '<img class="myLabThumb lg" id="mlThumb" alt="" src="' + esc(httpUrl(row.thumb)) + '">' : '<img class="myLabThumb lg" id="mlThumb" alt="" hidden>')
    + '<button type="button" class="gold" id="mlSave">Save</button>';
}
function openForm(row, rows){
  shell(formHtml(row), row ? "Edit resource" : "Add resource");
  let thumb = row && row.thumb || "";
  const url = root.querySelector("#mlUrl");
  const title = root.querySelector("#mlTitle");
  const kind = root.querySelector("#mlKind");
  const preview = root.querySelector("#mlThumb");
  async function pull(){
    if (!kind || kind.value !== "youtube") return;
    const meta = await youtubeMeta(url.value);
    if (!meta || !root) return;
    if (meta.title && title && !title.value.trim()) title.value = meta.title;
    if (meta.thumb) {
      thumb = meta.thumb;
      if (preview) { preview.src = meta.thumb; preview.hidden = false; }
    }
  }
  if (url) url.addEventListener("change", pull);
  const save = root.querySelector("#mlSave");
  if (save) save.onclick = async () => {
    const clean = httpUrl(url.value);
    const name = title.value.trim().slice(0, 140);
    if (!kindOf(kind.value) || !clean || !name) { toast("Add a type, an https link, and a title"); return; }
    if (kind.value === "youtube" && !thumb) {
      const meta = await youtubeMeta(clean);
      if (meta) { if (!title.value.trim() && meta.title) title.value = meta.title; thumb = meta.thumb || thumb; }
    }
    const payload = {
      kind: kind.value,
      url: clean,
      title: title.value.trim().slice(0, 140),
      description: root.querySelector("#mlDesc").value.trim().slice(0, 280),
      thumb: httpUrl(thumb) || null,
      visible_to_clients: !!root.querySelector("#mlVis").checked,
      updated_at: new Date().toISOString()
    };
    const client = sb();
    const me = who();
    if (!client || !me) { toast("Sign in to save"); return; }
    let r;
    if (row) r = await client.from("practitioner_lab_resources").update(payload).eq("id", row.id);
    else {
      const same = (rows || []).filter(x => x.kind === payload.kind);
      const order = same.reduce((n, x) => Math.max(n, Number(x.sort_order) || 0), 0) + 1;
      r = await client.from("practitioner_lab_resources").insert({ ...payload, user_id: me.user_id, sort_order: order });
    }
    if (r.error) { toast("Could not save that resource"); return; }
    toast("Saved");
    openEditor();
  };
}
async function setVisible(id, on){
  const client = sb();
  if (!client) return;
  const r = await client.from("practitioner_lab_resources").update({ visible_to_clients: !!on, updated_at: new Date().toISOString() }).eq("id", id);
  if (r.error) toast("Could not update that");
}
async function removeRow(id){
  if (typeof confirm === "function" && !confirm("Delete this resource?")) return;
  const client = sb();
  if (!client) return;
  const r = await client.from("practitioner_lab_resources").delete().eq("id", id);
  if (r.error) { toast("Could not delete that"); return; }
  openEditor();
}
async function move(rows, id, dir){
  const row = rows.find(r => r.id === id);
  if (!row) return;
  const mates = rows.filter(r => r.kind === row.kind);
  const i = mates.findIndex(r => r.id === id);
  const j = i + dir;
  if (j < 0 || j >= mates.length) return;
  const other = mates[j];
  const client = sb();
  if (!client) return;
  const a = Number(row.sort_order) || 0;
  const b = Number(other.sort_order) || 0;
  const now = new Date().toISOString();
  const nextA = a === b ? a + dir : b;
  const nextB = a === b ? a : a;
  const r1 = await client.from("practitioner_lab_resources").update({ sort_order: nextA, updated_at: now }).eq("id", row.id);
  const r2 = await client.from("practitioner_lab_resources").update({ sort_order: nextB, updated_at: now }).eq("id", other.id);
  if (r1.error || r2.error) { toast("Could not reorder"); return; }
  openEditor();
}

async function loadPerson(key){
  const id = String(key || "").trim();
  const asUuid = UUID_RE.test(id);
  if (!asUuid && window.DB && DB.bySlug) {
    try { const p = await DB.bySlug(id.toLowerCase()); if (p) return p; } catch (e) {}
  }
  const client = sb();
  if (!client) return null;
  const cols = "id,user_id,name,practice_name,city,country,photo,slug,consent,whatsapp";
  let q = client.from("practitioners").select(cols).eq("consent", true).eq("admin_hidden", false);
  q = asUuid ? q.eq("id", id) : q.eq("slug", id.toLowerCase());
  const r = await q.maybeSingle();
  return r.data || null;
}
function personTitle(p){ return String((p && (p.practice_name || p.name)) || "Practitioner"); }
function personPlace(p){ return [p && p.city, p && p.country].filter(Boolean).join(", "); }

async function openPublic(key, focusId){
  if (typeof document === "undefined") return;
  const person = await loadPerson(key);
  if (!person || person.consent === false) {
    shell(top("My Toolkit") + '<p class="plusUse">That Toolkit page isn’t available.</p>', "My Toolkit");
    return;
  }
  const rows = await visibleRows(person.user_id);
  const photo = person.photo ? (String(person.photo).indexOf("http") === 0 ? person.photo : person.photo) : "";
  const head = '<header class="myLabHead">'
    + (photo ? '<img src="' + esc(photo) + '" alt="">' : '<span class="myLabAv">' + esc(String(person.name || "?").trim().slice(0, 1).toUpperCase()) + "</span>")
    + '<div><b>' + esc(personTitle(person)) + "</b><small>" + esc(personPlace(person)) + "</small></div>"
    + '<button type="button" class="gold" id="myLabContact">Contact</button>'
    + '<button type="button" class="outline" id="myLabShare">Share my Toolkit</button></header>';
  const body = rows.length ? groupRows(rows).filter(g => g.rows.length).map(g => '<h3 class="lsec">' + esc(g.title) + "</h3>" + g.rows.map(r => rowCard(r, false)).join("")).join("") : '<p class="plusUse">Nothing shared here yet.</p>';
  const pageTitle = personTitle(person) + "'s Toolkit";
  shell(top(pageTitle) + head + body, pageTitle);
  const contact = root.querySelector("#myLabContact");
  if (contact) contact.onclick = () => {
    const slug = person.slug;
    close();
    if (slug && window.faOpenSlug) faOpenSlug(slug);
    else if (window.faOpenPract) faOpenPract(person.id);
  };
  const share = root.querySelector("#myLabShare");
  if (share) share.onclick = () => {
    if (!rows.length) { toast(HINT); return; }
    shareSheet(toolkitUrl(person.slug), personTitle(person) + "'s Toolkit", "Videos, courses and links");
  };
  root.querySelectorAll("[data-share-res]").forEach(b => b.onclick = () => {
    const row = rows.find(r => r.id === b.getAttribute("data-share-res"));
    if (row) shareSheet(resourceUrl(person.slug, row.id), row.title, row.description || "");
  });
  if (focusId) {
    const el = root.querySelector("#labres-" + CSS.escape(focusId));
    if (el) { el.classList.add("myLabHit"); el.scrollIntoView({ block: "center" }); }
  }
}

return { GROUPS, HINT, httpUrl, kindOf, toolkitPath, toolkitUrl, labPath: toolkitPath, labUrl: toolkitUrl, resourceUrl, whatsappLink, mailLink, listingTile, youtubeMeta, openEditor, openPublic, mountListing, visibleCount, shareToolkit };
});
