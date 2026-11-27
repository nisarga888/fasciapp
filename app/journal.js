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
function who(){ try { return window.faMe ? faMe() : null; } catch (e) { return null; } }
function signed(){ try { return !!(window.faSignedIn && faSignedIn()); } catch (e) { return false; } }
function sb(){ return window.faSb || null; }

async function load(day){
  const client = sb();
  const me = who();
  if (!client || !me) return { today: "", past: [] };
  const rows = await client.from("mood_notes").select("id,body,day,mood,created_at").eq("user_id", me.user_id).order("created_at", { ascending: false }).limit(80);
  const list = (rows.data || []).map(r => ({ ...r, day: r.day || String(r.created_at || "").slice(0, 10) })).filter(r => r.day && r.body);
  const todayNote = list.find(r => r.mood === "journal" && r.day === day);
  return { today: todayNote ? todayNote.body : "", notes: list.filter(r => !(r.mood === "journal" && r.day === day)) };
}
async function save(day, body){
  body = String(body || "").trim().slice(0, 500);
  const client = sb();
  const me = who();
  if (!body || !client || !me) return false;
  const existing = await client.from("mood_notes").select("id").eq("user_id", me.user_id).eq("mood", "journal").eq("day", day).maybeSingle();
  if (existing.data) {
    const r = await client.from("mood_notes").update({ body }).eq("id", existing.data.id);
    return !r.error;
  }
  const r = await client.from("mood_notes").insert({ user_id: me.user_id, mood: "journal", body, day });
  return !r.error;
}
function open(){
  if (typeof document === "undefined") return;
  const day = localDay();
  const old = document.getElementById("journalRoot");
  if (old) old.remove();
  const root = document.createElement("div");
  root.id = "journalRoot";
  root.className = "ptPop";
  const gate = signed() ? "" : '<p class="plusFine">This journal is private. Create a free account to keep today’s note.</p><button type="button" class="gold" id="journalAuth">Create a free account</button>';
  root.innerHTML = '<div class="ptPopDim" data-jx></div><div class="ptPopBox" role="dialog" aria-modal="true" aria-label="Daily Journal">'
    + '<div class="ptPopTop"><b>Daily Journal</b><button type="button" class="ptPopX" data-jx aria-label="Close">✕</button></div>'
    + '<p class="plusEyebrow">' + esc(pretty(day)) + "</p>"
    + '<p class="plusH">' + esc(promptFor(day)) + "</p>"
    + '<label class="plusNote">Today<textarea id="journalNote" maxlength="500" rows="5" placeholder="Leave a line about this day…"></textarea></label>'
    + (signed() ? '<button type="button" class="gold" id="journalSave">Save today’s note</button>' : gate)
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
  if (saveBtn) saveBtn.onclick = async () => {
    const ok = await save(day, note.value);
    if (window.showToast) showToast(ok ? "Saved for you" : "Could not save that note");
    if (ok) paintPast(root, day);
  };
  if (signed()) {
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
  if (!raw || !signed()) return;
  try { sessionStorage.removeItem("faJournalDraft"); } catch (e) {}
  let d = null;
  try { d = JSON.parse(raw); } catch (e) {}
  if (!d || !d.day || !d.body) return;
  await save(d.day, d.body);
  if (window.showToast) showToast("Saved for you");
}
return { PROMPTS, TAGS, localDay, promptFor, tagOf, open, afterAuth };
});
