/* Shared practitioner notes. One dated set per client, shown in the reading,
   the client record, and the calendar session sheet. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_NOTES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const CHIPS = [["Pain score","Pain score: "],["Breath","Breath: "],["Homework","Homework: "],["Next session","Next session: "]];
function clientKey(n){
  return String(n||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ł/g,"l").replace(/Ł/g,"L").trim().replace(/\s+/g," ").toLowerCase();
}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function chipPrefix(text, prefix){
  const t = String(text||"");
  if(!t.trim()) return prefix;
  return /[\n ]$/.test(t) ? t+prefix : t+"\n"+prefix;
}
function niceDate(iso){
  const d = new Date(String(iso||"").slice(0,10)+"T12:00:00");
  if(isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
}
function noteTitle(n){
  return [niceDate(n.session_date), n.session_label, n.training].filter(Boolean).join(" · ");
}
function visibleNotes(list, open){
  const rows = (list||[]).slice().sort((a,b)=>String(b.session_date||"").localeCompare(String(a.session_date||""))||String(b.created_at||"").localeCompare(String(a.created_at||"")));
  return open ? rows : rows.slice(0,2);
}
function missingTable(err){
  const m = String((err&&(err.message||err.details||err.code))||err||"");
  return /client_notes|schema cache|does not exist|PGRST205|42P01/i.test(m);
}

let sbClient = null, uid = "", tableOk = null, mem = {};
function useMem(){return typeof window!=="undefined" && window.FA_NOTES_MEM;}
function sb(){
  if (sbClient) return sbClient;
  const c = (typeof window!=="undefined" && window.FASCIAPP_CONFIG) || {};
  if (!window.supabase || !c.SUPABASE_URL) return null;
  sbClient = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,storage:window.localStorage,storageKey:"fasciapp-auth"}});
  return sbClient;
}
async function userId(){
  if (uid) return uid;
  const c = sb();
  if (!c) return "";
  try{const {data}=await c.auth.getSession(); uid=(data&&data.session&&data.session.user&&data.session.user.id)||"";}catch(e){uid="";}
  return uid;
}
function lsKey(id, key){return "fa_pnotes:"+id+":"+key;}
function readLocal(id, key){
  try{return JSON.parse(localStorage.getItem(lsKey(id,key))||"[]");}catch(e){return [];}
}
function writeLocal(id, key, rows){
  try{localStorage.setItem(lsKey(id,key), JSON.stringify(rows));}catch(e){}
}
function broadcast(key){
  if (typeof window==="undefined") return;
  window.dispatchEvent(new CustomEvent("fa-notes",{detail:{key}}));
}

async function fetchNotes(key){
  if(useMem()) return (mem[key]||[]).slice();
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {data,error}=await c.from("client_notes").select("id,client_key,client_name,session_date,session_label,training,body,created_at,updated_at").eq("client_key",key).order("session_date",{ascending:false}).order("created_at",{ascending:false});
    if(!error){tableOk=true; if(id) writeLocal(id,key,data||[]); return data||[];}
    if(!missingTable(error)) throw error;
    tableOk=false;
  }
  return id ? readLocal(id,key) : [];
}
async function insertNote(row){
  if(useMem()){const local={id:"mem-"+Date.now(), created_at:new Date().toISOString(), updated_at:new Date().toISOString()}; Object.assign(local,row); (mem[row.client_key]=mem[row.client_key]||[]).unshift(local); return local;}
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {data,error}=await c.from("client_notes").insert(Object.assign({practitioner_id:id},row)).select("id,client_key,client_name,session_date,session_label,training,body,created_at,updated_at").single();
    if(!error){tableOk=true; return data;}
    if(!missingTable(error)) throw error;
    tableOk=false;
  }
  const local={id:"local-"+Date.now(), created_at:new Date().toISOString(), updated_at:new Date().toISOString()};
  Object.assign(local,row);
  if(id){const all=readLocal(id,row.client_key); all.unshift(local); writeLocal(id,row.client_key,all);}
  return local;
}
async function updateNote(key, id, body){
  const patch={body:body, updated_at:new Date().toISOString()};
  if(useMem()){mem[key]=(mem[key]||[]).map(n=>n.id===id?Object.assign({},n,patch):n); return;}
  const uidNow = await userId();
  const c = sb();
  if (c && uidNow && tableOk!==false && String(id).indexOf("local-")!==0){
    const {error}=await c.from("client_notes").update(patch).eq("id",id);
    if(!error) return;
    if(!missingTable(error)) throw error;
    tableOk=false;
  }
  if(uidNow){const all=readLocal(uidNow,key).map(n=>n.id===id?Object.assign({},n,patch):n); writeLocal(uidNow,key,all);}
}
async function deleteNote(key, id){
  if(useMem()){mem[key]=(mem[key]||[]).filter(n=>n.id!==id); return;}
  const uidNow = await userId();
  const c = sb();
  if (c && uidNow && tableOk!==false && String(id).indexOf("local-")!==0){
    const {error}=await c.from("client_notes").delete().eq("id",id);
    if(!error) return;
    if(!missingTable(error)) throw error;
    tableOk=false;
  }
  if(uidNow) writeLocal(uidNow,key,readLocal(uidNow,key).filter(n=>n.id!==id));
}
async function renameClient(oldKey, newKey, newName){
  const uidNow = await userId();
  const c = sb();
  if (c && uidNow && tableOk!==false){
    const {error}=await c.from("client_notes").update({client_key:newKey, client_name:newName}).eq("client_key",oldKey);
    if(error && !missingTable(error)) throw error;
    if(error && missingTable(error)) tableOk=false;
  }
  if(uidNow){
    const rows=readLocal(uidNow,oldKey).map(n=>Object.assign({},n,{client_key:newKey,client_name:newName}));
    writeLocal(uidNow,newKey,rows.concat(readLocal(uidNow,newKey)));
    try{localStorage.removeItem(lsKey(uidNow,oldKey));}catch(e){}
  }
  broadcast(oldKey); broadcast(newKey);
}

function ensureCss(){
  if (typeof document==="undefined" || document.getElementById("pnCss")) return;
  const s=document.createElement("style");
  s.id="pnCss";
  s.textContent=[
    ".pn{margin:14px 0 8px;text-align:left}",
    ".pnK{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#C99E67;font-weight:700}",
    ".pnH{margin:2px 0 10px;font-size:22px;font-weight:500;color:#F3EDE4}",
    ".pnBox{background:#02191E;border:1px solid #c99e6733;border-radius:16px;padding:12px}",
    ".pnBox textarea,.pnEdit{width:100%;box-sizing:border-box;min-height:68px;border:0;background:transparent;color:#ff8a7a;font:15px/1.45 inherit;resize:vertical;outline:none}",
    ".pnChips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}",
    ".pnChips button{width:auto;border:1px solid #c99e6755;background:transparent;color:#F3EDE4;border-radius:999px;padding:6px 10px;font-size:12.5px;box-shadow:none}",
    ".pnIcon{width:32px;height:32px;flex:none;border:1px solid #c99e6755;background:transparent;color:#F3EDE4;border-radius:50%;padding:0;display:grid;place-items:center;box-shadow:none}",
    ".pnAdd,.pnSave{width:100%;margin-top:6px;border:0;border-radius:999px;background:#C99E67;color:#02191E;font-weight:700;padding:12px;box-shadow:none}",
    ".pnSync{text-align:center;color:#9fb3b5;font-size:12px;margin:8px 0 0}",
    ".pnN{margin-top:10px;padding:10px 12px;border-radius:14px;background:#02191Eaa;border:1px solid #c99e6726}",
    ".pnN.head{display:flex;gap:8px;align-items:flex-start}",
    ".pnN b{flex:1;font-size:13.5px;font-weight:600;color:#ffb1a6}",
    ".pnBody{margin:8px 0 0;color:#ff8a7a;font-size:15px;line-height:1.45;white-space:pre-wrap}",
    ".pnActs{display:flex;gap:8px;margin-top:8px}",
    ".pnActs button{flex:1;border-radius:999px;padding:10px;font-weight:700;box-shadow:none}",
    ".pnSave{margin:0}.pnCancel{background:transparent;border:1px solid #c99e6788;color:#C99E67}",
    ".pnMore,.pnLink{background:none;border:0;color:#9fb3b5;width:100%;margin-top:8px;font-size:14px;box-shadow:none}",
    ".pnLinks{display:flex;gap:8px;margin-top:10px}",
    ".pnLinks button{flex:1;border-radius:999px;border:1px solid #c99e6788;background:transparent;color:#F3EDE4;padding:11px;box-shadow:none}",
    ".pnWarn{color:#e0b15a;font-size:12px;text-align:center;margin:6px 0 0}",
    "@media print{.pn{display:none!important}}"
  ].join("");
  document.head.appendChild(s);
}

function mount(host, opts){
  if(!host) return;
  ensureCss();
  const o = opts||{};
  const key = clientKey(o.clientName);
  const state = {host, o, key, notes:[], open:false, editing:null, busy:false};
  async function reload(){
    if(!state.key){host.innerHTML=""; return;}
    try{state.notes=await fetchNotes(state.key);}catch(e){state.notes=[]; state.err=e;}
    paint();
  }
  function paint(){
    const rows = visibleNotes(state.notes, state.open);
    const hidden = Math.max(0, state.notes.length-2);
    const chips = CHIPS.map(([lab,pre])=>'<button type="button" data-pn-chip="'+esc(pre)+'">'+esc(lab)+'</button>').join("");
    const list = rows.map(n=>{
      if(state.editing===n.id){
        return '<article class="pnN" data-id="'+esc(n.id)+'"><div class="pnN head"><b>'+esc(noteTitle(n))+'</b></div><textarea class="pnEdit">'+esc(n.body)+'</textarea><div class="pnActs"><button type="button" class="pnSave" data-pn-save="'+esc(n.id)+'">Save</button><button type="button" class="pnCancel" data-pn-cancel>Cancel</button></div></article>';
      }
      const jump = o.place==="record" && o.assessmentId ? '<button type="button" class="pnLink" data-pn-reading>Open MER reading →</button>' : "";
      return '<article class="pnN" data-id="'+esc(n.id)+'"><div class="pnN head"><b>'+esc(noteTitle(n))+'</b><button type="button" class="pnIcon" data-pn-edit="'+esc(n.id)+'" aria-label="Edit note">✎</button><button type="button" class="pnIcon" data-pn-del="'+esc(n.id)+'" aria-label="Delete note"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"/></svg></button></div><p class="pnBody">'+esc(n.body)+'</p>'+jump+'</article>';
    }).join("");
    const links = o.place==="calendar" ? '<div class="pnLinks"><button type="button" data-pn-records>Open records</button><button type="button" data-pn-reading>Open reading</button></div><button type="button" class="pnAdd" data-pn-after>+ Add note after session</button>' : "";
    const warn = tableOk===false ? '<p class="pnWarn">Saved on this device until the notes table is added.</p>' : "";
    host.innerHTML = '<section class="pn"><div class="pnK">After each session</div><h2 class="pnH">'+esc(o.title||"Practitioner notes")+'</h2><div class="pnBox"><textarea class="pnDraft" placeholder="What did you notice in today\u2019s session? Changes, client feedback, next focus\u2026"></textarea><div class="pnChips">'+chips+'</div><button type="button" class="pnAdd" data-pn-add>+ Add note</button><p class="pnSync">'+esc(o.sync||"Synced with client record & calendar")+'</p>'+warn+'</div>'+list+(hidden&&!state.open?'<button type="button" class="pnMore" data-pn-more>Show '+hidden+' older note'+(hidden===1?'':'s')+'</button>':'')+links+'</section>';
    const draft = host.querySelector(".pnDraft");
    host.querySelectorAll("[data-pn-chip]").forEach(b=>b.onclick=()=>{draft.value=chipPrefix(draft.value,b.getAttribute("data-pn-chip")); draft.focus();});
    const addBtn = host.querySelector("[data-pn-add]");
    if(addBtn) addBtn.onclick=()=>add(draft);
    const after = host.querySelector("[data-pn-after]");
    if(after) after.onclick=()=>{draft.focus(); draft.scrollIntoView({block:"center"});};
    const more = host.querySelector("[data-pn-more]");
    if(more) more.onclick=()=>{state.open=true; paint();};
    host.querySelectorAll("[data-pn-edit]").forEach(b=>b.onclick=()=>{state.editing=b.getAttribute("data-pn-edit"); paint();});
    host.querySelectorAll("[data-pn-cancel]").forEach(b=>b.onclick=()=>{state.editing=null; paint();});
    host.querySelectorAll("[data-pn-save]").forEach(b=>b.onclick=async()=>{
      const area=host.querySelector(".pnEdit"); const body=(area&&area.value||"").trim(); if(!body) return;
      await updateNote(state.key,b.getAttribute("data-pn-save"),body); state.editing=null; broadcast(state.key);
    });
    host.querySelectorAll("[data-pn-del]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Delete this note?")) return;
      await deleteNote(state.key,b.getAttribute("data-pn-del")); broadcast(state.key);
    });
    const rec=host.querySelector("[data-pn-records]");
    if(rec) rec.onclick=()=>{ if(o.onOpenRecord) o.onOpenRecord(); };
    host.querySelectorAll("[data-pn-reading]").forEach(read=>read.onclick=()=>{ if(o.onOpenReading) o.onOpenReading(); });
  }
  async function add(draft){
    const body=(draft.value||"").trim();
    if(!body||!state.key||state.busy) return;
    state.busy=true;
    const training = typeof o.training==="function" ? o.training() : (o.training||"");
    const date = typeof o.sessionDate==="function" ? o.sessionDate() : (o.sessionDate||new Date().toISOString().slice(0,10));
    const n = state.notes.length+1;
    try{
      await insertNote({client_key:state.key, client_name:String(o.clientName||"").trim(), session_date:date, session_label:o.sessionLabel||("Session "+n), training:training||null, body});
      draft.value="";
      broadcast(state.key);
    }catch(e){alert("Could not save the note.");}
    state.busy=false;
  }
  function onBus(e){ if(e.detail&&e.detail.key===state.key) reload(); }
  if(host._pnOff) host._pnOff();
  window.addEventListener("fa-notes", onBus);
  host._pnOff=()=>window.removeEventListener("fa-notes", onBus);
  reload();
  return state;
}

return {clientKey, chipPrefix, noteTitle, visibleNotes, mount, renameClient, fetchNotes};
});
