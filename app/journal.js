/* Daily Journal. A private note per day, stored with the Mood Shift notes.
   Self-contained so it can later move into My Space. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_JOURNAL = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const TAGS = {
  journal: "Journal",
  anxious: "Anxious",
  tired: "Tired",
  pain: "In pain",
  sleep: "Can’t sleep",
  tense: "Angry/tense",
  overwhelmed: "Overwhelmed",
  evening: "Evening wind-down"
};
const PROMPTS = [
  "What can rest here until tomorrow?",
  "What felt kind in the last day, even if it was small?",
  "Where did you notice your breath today?",
  "What would you like to set down before the day ends?",
  "One thing you do not have to solve tonight.",
  "What would a softer next hour look like?",
  "Name one thing your body asked for today."
];
function localDay(date){
  const d = date || new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}
function promptFor(day){
  const parts = String(day || localDay()).split("-").map(Number);
  const dt = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  const start = new Date(dt.getFullYear(), 0, 0);
  const n = Math.floor((dt - start) / 86400000);
  return PROMPTS[((n % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
}
function pretty(day){
  const parts = String(day || "").split("-").map(Number);
  const dt = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  try { return dt.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }); }
  catch (e) { return day; }
}
function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
async function actor(){
  const session = window.DB && DB.session ? await DB.session().catch(() => null) : null;
  return { client: window.faSb || null, id: (session && session.user_id) || "" };
}

async function load(day){
  const act = await actor();
  if (!act.client || !act.id) return { today: "", past: [] };
  const rows = await act.client.from("mood_notes").select("id,body,day,mood,created_at").eq("user_id", act.id).order("created_at", { ascending: false }).limit(80);
  const list = (rows.data || []).map(r => ({ ...r, day: r.day || String(r.created_at || "").slice(0, 10) })).filter(r => r.day && r.body);
  const todayNote = list.find(r => r.mood === "journal" && r.day === day);
  return { today: todayNote ? todayNote.body : "", notes: list };
}
async function save(day, body){
  body = String(body || "").trim().slice(0, 500);
  if (!body) return { ok: false, error: "Write a note first." };
  const act = await actor();
  if (!act.client || !act.id) return { ok: false, error: "Still connecting your account. Please try once more." };
  const existing = await act.client.from("mood_notes").select("id").eq("user_id", act.id).eq("mood", "journal").eq("day", day).maybeSingle();
  if (existing.error) return { ok: false, error: existing.error.message };
  if (existing.data) {
    const r = await act.client.from("mood_notes").update({ body }).eq("id", existing.data.id).eq("user_id", act.id);
    return r.error ? { ok: false, error: r.error.message } : { ok: true };
  }
  const r = await act.client.from("mood_notes").insert({ user_id: act.id, mood: "journal", body, day });
  if (r.error && /duplicate|unique/i.test(r.error.message || "")) {
    const again = await act.client.from("mood_notes").select("id").eq("user_id", act.id).eq("mood", "journal").eq("day", day).maybeSingle();
    if (again.data) {
      const u = await act.client.from("mood_notes").update({ body }).eq("id", again.data.id).eq("user_id", act.id);
      return u.error ? { ok: false, error: u.error.message } : { ok: true };
    }
  }
  return r.error ? { ok: false, error: r.error.message } : { ok: true };
}
async function open(){
  if (typeof document === "undefined") return;
  const act = await actor();
  const on = !!act.id || !!(window.faSignedIn && faSignedIn());
  const day = localDay();
  const old = document.getElementById("journalRoot");
  if (old) old.remove();
  const root = document.createElement("div");
  root.id = "journalRoot";
  root.className = "ptPop";
  const gate = on ? "" : '<p class="plusFine">This journal is private. Create a free account to keep today’s note.</p><button type="button" class="gold" id="journalAuth">Create a free account</button>';
  root.innerHTML = '<div class="ptPopDim" data-jx></div><div class="ptPopBox" role="dialog" aria-modal="true" aria-label="Daily Journal">'
    + '<div class="ptPopTop"><b>Daily Journal</b><button type="button" class="ptPopX" data-jx aria-label="Close">✕</button></div>'
    + '<p class="plusEyebrow">' + esc(pretty(day)) + "</p>"
    + '<p class="plusH">' + esc(promptFor(day)) + "</p>"
    + '<label class="plusNote">Today<textarea id="journalNote" maxlength="500" rows="5" placeholder="Leave a line about this day…"></textarea></label>'
    + (on ? '<button type="button" class="gold" id="journalSave">Save today’s note</button><p class="journalSaved" id="journalMsg" hidden></p>' : gate)
    + '<div id="journalPast" class="journalPast"></div></div>';
  document.body.appendChild(root);
  root.addEventListener("click", e => { if (e.target.closest("[data-jx]")) root.remove(); });
  const note = root.querySelector("#journalNote");
  const auth = root.querySelector("#journalAuth");
  if (auth) auth.onclick = () => {
    try { sessionStorage.setItem("faJournalDraft", JSON.stringify({ day, body: note.value })); } catch (e) {}
    if (window.faAuthFor) faAuthFor(true, "lab");
  };
  const saveBtn = root.querySelector("#journalSave");
  const msg = root.querySelector("#journalMsg");
  if (saveBtn) saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    if (msg) { msg.hidden = false; msg.textContent = "Saving…"; }
    const res = await save(day, note.value);
    saveBtn.disabled = false;
    if (msg) { msg.hidden = false; msg.textContent = res.ok ? "Saved ✓" : ("Could not save. " + (res.error || "Try again.")); msg.classList.toggle("ok", !!res.ok); }
    if (window.showToast) showToast(res.ok ? "Saved ✓" : "Could not save that note");
    if (res.ok) {
      const saved = String(note.value || "").trim();
      const data = await load(day);
      const notes = data.notes && data.notes.length ? data.notes : [{ mood: "journal", body: saved, day }];
      if (note && !note.value) note.value = data.today || saved;
      paintPast(root, day, notes);
    }
  };
  if (on) {
    load(day).then(data => {
      if (note && !note.value) note.value = data.today || "";
      paintPast(root, day, data.notes);
    });
  }
}
function tagOf(mood){ return TAGS[mood] || "Note"; }
function paintPast(root, day, notes){
  const box = root.querySelector("#journalPast");
  if (!box) return;
  if (!notes) { box.innerHTML = ""; return; }
  if (!notes.length) { box.innerHTML = '<p class="plusFine">No notes yet.</p>'; return; }
  const days = [];
  notes.forEach(r => { if (!days.includes(r.day)) days.push(r.day); });
  box.innerHTML = days.map(d => {
    const items = notes.filter(r => r.day === d).map(r => '<article class="card"><small>' + esc(tagOf(r.mood)) + "</small><p>" + esc(r.body) + "</p></article>").join("");
    const label = d === day ? "Today" : pretty(d);
    return '<h3 class="lsec">' + esc(label) + "</h3>" + items;
  }).join("");
}
async function afterAuth(){
  let raw = "";
  try { raw = sessionStorage.getItem("faJournalDraft") || ""; } catch (e) {}
  const act = await actor();
  if (!raw || !act.id) return;
  try { sessionStorage.removeItem("faJournalDraft"); } catch (e) {}
  let d = null;
  try { d = JSON.parse(raw); } catch (e) {}
  if (!d || !d.day || !d.body) return;
  const res = await save(d.day, d.body);
  if (window.showToast) showToast(res.ok ? "Saved ✓" : ("Could not save. " + (res.error || "Try again.")));
}
async function showSaved(){
  const root = document.getElementById("journalRoot");
  if (!root) return;
  const day = localDay();
  const data = await load(day);
  paintPast(root, day, data.notes);
}
return { PROMPTS, TAGS, localDay, promptFor, tagOf, open, afterAuth, showSaved };
});
