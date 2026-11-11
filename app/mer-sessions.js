/* Which MER sessions a practitioner has marked complete for one client.
   Stored in client_mer_sessions when that table exists, otherwise on this device. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_MER_SESS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
function clientKey(n){
  return String(n||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ł/g,"l").replace(/Ł/g,"L").trim().replace(/\s+/g," ").toLowerCase();
}
function useMem(){return typeof globalThis!=="undefined" && globalThis.FA_MER_SESS_MEM;}
function missingTable(err){
  const m = String((err&&(err.message||err.details||err.code))||err||"");
  return /client_mer_sessions|schema cache|does not exist|PGRST205|42P01/i.test(m);
}
let sbClient = null, uid = "", tableOk = null, mem = {};
function sb(){
  if (sbClient) return sbClient;
  const c = (typeof window!=="undefined" && window.FASCIAPP_CONFIG) || {};
  if (typeof window==="undefined" || !window.supabase || !c.SUPABASE_URL) return null;
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
function lsKey(id, key){return "fa_mersess:"+id+":"+key;}
function readLocal(id, key){
  try{return JSON.parse(localStorage.getItem(lsKey(id,key))||"[]");}catch(e){return [];}
}
function writeLocal(id, key, rows){
  try{localStorage.setItem(lsKey(id,key), JSON.stringify(rows));}catch(e){}
}
function beltsOf(rows){
  const out = [];
  (rows||[]).forEach(r => { if (r && r.belt && out.indexOf(r.belt)<0) out.push(r.belt); });
  return out;
}
async function load(key){
  if (!key) return [];
  if (useMem()) return beltsOf(mem[key]);
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {data,error}=await c.from("client_mer_sessions").select("belt,completed_at").eq("client_key",key);
    if (!error){ tableOk=true; if(id) writeLocal(id,key,data||[]); return beltsOf(data); }
    if (!missingTable(error)) throw error;
    tableOk=false;
  }
  return id ? beltsOf(readLocal(id,key)) : beltsOf(mem[key]);
}
async function complete(key, name, belt, sessionIndex){
  if (!key || !belt) return [];
  const row = {client_key:key, client_name:name||key, belt:belt, session_index:sessionIndex||null, completed_at:new Date().toISOString()};
  if (useMem()){
    mem[key]=(mem[key]||[]).filter(r=>r.belt!==belt);
    mem[key].push(row);
    return beltsOf(mem[key]);
  }
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {error}=await c.from("client_mer_sessions").upsert(Object.assign({practitioner_id:id}, row), {onConflict:"practitioner_id,client_key,belt"});
    if (!error){ tableOk=true; const belts=await load(key); return belts; }
    if (!missingTable(error)) throw error;
    tableOk=false;
  }
  const all = id ? readLocal(id,key) : (mem[key]||[]);
  const next = all.filter(r=>r.belt!==belt).concat([row]);
  if (id) writeLocal(id,key,next); else mem[key]=next;
  return beltsOf(next);
}
async function undo(key, belt){
  if (!key || !belt) return [];
  if (useMem()){ mem[key]=(mem[key]||[]).filter(r=>r.belt!==belt); return beltsOf(mem[key]); }
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {error}=await c.from("client_mer_sessions").delete().eq("client_key",key).eq("belt",belt);
    if (!error){ tableOk=true; return load(key); }
    if (!missingTable(error)) throw error;
    tableOk=false;
  }
  const all = id ? readLocal(id,key).filter(r=>r.belt!==belt) : (mem[key]||[]).filter(r=>r.belt!==belt);
  if (id) writeLocal(id,key,all); else mem[key]=all;
  return beltsOf(all);
}
return {clientKey, load, complete, undo};
});
