/* Contact client from a calendar session. Email goes through FasciApp (20 a day).
   WhatsApp opens on this device. In-app message only when the client has an account. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_CONTACT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const CAP = 20;
const TEMPLATES = [
  { id: "bring", title: "What to bring next session", subject: "Before your next session" },
  { id: "reminder", title: "Session reminder", subject: "Reminder of your session" },
  { id: "aftercare", title: "Aftercare after session", subject: "After your session" },
  { id: "reschedule", title: "Reschedule", subject: "Can we move your session?" }
];
function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function whenOf(dateStr, timeStr, tz){
  const date = String(dateStr || "");
  const time = String(timeStr || "");
  let pretty = date;
  try {
    const d = new Date(date + "T12:00:00Z");
    pretty = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  } catch (e) {}
  const zone = String(tz || "your local time");
  return { date: pretty, time: time || "the planned time", zone };
}
function fill(id, ctx){
  const name = String(ctx.name || "there").trim() || "there";
  const w = whenOf(ctx.date, ctx.time, ctx.zone);
  const when = w.date + " at " + w.time + " (" + w.zone + ")";
  if (id === "bring") return "Hello " + name + ", a note before your session on " + when + ".\n\nWear something comfortable and bring water. If anything has changed since we last met, reply to this message.";
  if (id === "aftercare") return "Hello " + name + ", thank you for the session.\n\nDrink some water and rest if you can. Notice how you feel over the next day, and reply if a question comes up.";
  if (id === "reschedule") return "Hello " + name + ", I need to move our session that was set for " + when + ".\n\nReply with a time that suits you.";
  return "Hello " + name + ", a reminder of your session on " + when + ".\n\nReply if you need to change the time.";
}
function waLink(phone, text){
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(String(text || ""));
}
function mailto(email, subject, text){
  return "mailto:" + encodeURIComponent(email) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
}
function lastLine(s){
  if (!s || !s.last_contacted_at) return "";
  const ch = { email: "email", whatsapp: "WhatsApp", message: "an in-app message" }[s.last_contacted_channel] || "a message";
  let when = "";
  try { when = new Date(s.last_contacted_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { when = ""; }
  return "Last contacted by " + ch + (when ? " · " + when : "");
}
function sb(){ return window.faSb || null; }
function form(){ return document.getElementById("calForm"); }
function toast(msg){ if (window.showToast) showToast(msg); }
let current = null, hasAccount = false, left = CAP;

function ctxFromForm(){
  const f = form();
  const saved = current || {};
  return {
    name: f ? f.client.value : (saved.client_name || ""),
    date: f ? f.date.value : "",
    time: f ? f.time.value : "",
    zone: (saved.tz) || (window.FA_TZ && FA_TZ.zoneLabel ? FA_TZ.zoneLabel(saved.tz || "") : "local time"),
    email: f ? f.cemail.value.trim() : (saved.client_email || ""),
    phone: f ? f.cphone.value.trim() : (saved.client_phone || "")
  };
}
async function refreshAccount(){
  hasAccount = false;
  const client = sb();
  const email = ctxFromForm().email;
  if (!client || !email || !current || !current.id) return;
  const r = await client.rpc("fa_client_has_account", { p_email: email });
  hasAccount = r.data === true;
}
async function refreshLeft(){
  const client = sb();
  if (!client) return;
  const r = await client.rpc("fa_contact_emails_left");
  if (typeof r.data === "number") left = r.data;
}
function paintBar(){
  const slot = document.getElementById("calContact");
  if (!slot) return;
  const c = ctxFromForm();
  const note = lastLine(current);
  if (!c.email && !c.phone) {
    slot.innerHTML = '<button type="button" class="outline" id="calContactGo">Add contact details</button>' + (note ? '<p class="plusFine">' + esc(note) + "</p>" : "");
    const b = slot.querySelector("#calContactGo");
    if (b) b.onclick = () => { const f = form(); const el = f && (f.cemail || f.cphone); if (el) el.focus(); };
    return;
  }
  slot.innerHTML = '<button type="button" class="gold" id="calContactGo">Contact client</button>' + (note ? '<p class="plusFine">' + esc(note) + "</p>" : "");
  const b = slot.querySelector("#calContactGo");
  if (b) b.onclick = () => openSheet();
}
async function sync(session){
  current = session || null;
  let slot = document.getElementById("calContact");
  if (!slot) {
    const ct = document.getElementById("calCt");
    if (!ct) return;
    slot = document.createElement("div");
    slot.id = "calContact";
    slot.className = "calContact";
    ct.after(slot);
  }
  paintBar();
  refreshAccount().then(paintChannels);
  refreshLeft();
}
function paintChannels(){
  const box = document.getElementById("ccChannels");
  if (!box) return;
  const c = ctxFromForm();
  box.querySelector("[data-ch=email]").disabled = !c.email;
  box.querySelector("[data-ch=whatsapp]").disabled = !waLink(c.phone, "x");
  const msg = box.querySelector("[data-ch=message]");
  msg.disabled = !hasAccount;
  msg.title = hasAccount ? "Send in FasciApp" : "Available when this email belongs to a FasciApp account";
}
function openSheet(){
  if (!current || !current.id) { toast("Save the session first"); return; }
  const old = document.getElementById("ccRoot");
  if (old) old.remove();
  const c = ctxFromForm();
  const first = TEMPLATES[0];
  const root = document.createElement("div");
  root.id = "ccRoot";
  root.className = "ptPop";
  root.innerHTML = '<div class="ptPopDim" data-ccx></div><div class="ptPopBox" role="dialog" aria-modal="true" aria-label="Contact client">'
    + '<div class="ptPopTop"><b>Contact client</b><button type="button" class="ptPopX" data-ccx aria-label="Close">✕</button></div>'
    + '<div class="ccTemps">' + TEMPLATES.map(t => '<button type="button" data-tpl="' + t.id + '"' + (t.id === first.id ? ' class="on"' : "") + ">" + esc(t.title) + "</button>").join("") + "</div>"
    + '<textarea id="ccText" rows="7" maxlength="2000">' + esc(fill(first.id, c)) + "</textarea>"
    + '<p class="plusFine" id="ccLeft">' + left + " FasciApp emails left today, of " + CAP + ".</p>"
    + '<div class="ccChannels" id="ccChannels"><button type="button" data-ch="email">Email</button><button type="button" data-ch="whatsapp">WhatsApp</button><button type="button" data-ch="message">In-app message</button></div>'
    + '<p class="ptPopErr" id="ccMsg"></p></div>';
  document.body.appendChild(root);
  let tpl = first.id;
  root.addEventListener("click", e => { if (e.target.closest("[data-ccx]")) root.remove(); });
  root.querySelectorAll("[data-tpl]").forEach(b => b.onclick = () => {
    tpl = b.getAttribute("data-tpl");
    root.querySelectorAll("[data-tpl]").forEach(x => x.classList.toggle("on", x === b));
    root.querySelector("#ccText").value = fill(tpl, ctxFromForm());
  });
  paintChannels();
  root.querySelector("[data-ch=email]").onclick = () => sendEmail(tpl);
  root.querySelector("[data-ch=whatsapp]").onclick = () => sendWa(tpl);
  root.querySelector("[data-ch=message]").onclick = () => sendApp(tpl);
}
function textOf(tpl){
  const area = document.getElementById("ccText");
  return (area && area.value.trim()) || fill(tpl, ctxFromForm());
}
function subjectOf(tpl){
  const row = TEMPLATES.find(t => t.id === tpl) || TEMPLATES[1];
  return row.subject;
}
async function mark(channel, template){
  try { if (window.DB && DB.session) await DB.session(); } catch (e) {}
  const client = sb();
  if (!client || !current || !current.id) return;
  const now = new Date().toISOString();
  const r = await client.from("planned_sessions").update({
    last_contacted_at: now,
    last_contacted_channel: channel,
    last_contacted_template: template
  }).eq("id", current.id);
  if (!r.error) {
    current.last_contacted_at = now;
    current.last_contacted_channel = channel;
    current.last_contacted_template = template;
    paintBar();
  }
}
async function sendEmail(tpl){
  const msg = document.getElementById("ccMsg");
  const c = ctxFromForm();
  const text = textOf(tpl);
  const subject = subjectOf(tpl);
  if (!c.email) { if (msg) msg.textContent = "Add an email address first."; return; }
  const client = sb();
  if (!client || !client.functions) { location.href = mailto(c.email, subject, text); return; }
  if (msg) msg.textContent = "Sending…";
  const r = await client.functions.invoke("contact-client", { body: { session_id: current.id, subject, text, template: tpl } });
  const data = (r && r.data) || {};
  if (r.error || data.fallback || data.error) {
    if (data.error === "daily_limit") {
      if (msg) msg.textContent = "20 contact emails sent today. This one opens in your own mail app.";
      left = 0;
    } else if (msg) msg.textContent = "FasciApp could not send it. Opening your mail app.";
    location.href = mailto(c.email, subject, text);
    return;
  }
  if (typeof data.left === "number") left = data.left;
  const leftEl = document.getElementById("ccLeft");
  if (leftEl) leftEl.textContent = left + " FasciApp emails left today, of " + CAP + ".";
  if (msg) msg.textContent = "Sent from FasciApp. Replies go to your login email.";
  current.last_contacted_at = new Date().toISOString();
  current.last_contacted_channel = "email";
  current.last_contacted_template = tpl;
  paintBar();
  toast("Email sent");
}
function sendWa(tpl){
  const link = waLink(ctxFromForm().phone, textOf(tpl));
  const msg = document.getElementById("ccMsg");
  if (!link) { if (msg) msg.textContent = "Add a phone number with a country code."; return; }
  window.open(link, "_blank", "noopener");
  mark("whatsapp", tpl);
  if (msg) msg.textContent = "WhatsApp opened on this device.";
}
async function sendApp(tpl){
  const msg = document.getElementById("ccMsg");
  const client = sb();
  if (!hasAccount || !client) { if (msg) msg.textContent = "In-app message is available when this email has a FasciApp account."; return; }
  const r = await client.rpc("fa_message_client", { p_email: ctxFromForm().email, p_body: textOf(tpl) });
  if (r.error || r.data !== true) { if (msg) msg.textContent = "Could not send the in-app message."; return; }
  await mark("message", tpl);
  if (msg) msg.textContent = "Sent in FasciApp.";
  toast("Message sent");
}
return { CAP, TEMPLATES, fill, waLink, mailto, lastLine, sync };
});
