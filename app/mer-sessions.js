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
function modalityOf(m){return m==="bbtrs"?"bbtrs":"mer";}
function rowMod(r){return r&&r.modality==="bbtrs"?"bbtrs":"mer";}
function beltsOf(rows, mod){
  const want = modalityOf(mod);
  const out = [];
  (rows||[]).forEach(r => { if (r && r.belt && rowMod(r)===want && out.indexOf(r.belt)<0) out.push(r.belt); });
  return out;
}
async function load(key, modality){
  const mod = modalityOf(modality);
  if (!key) return [];
  if (useMem()) return beltsOf(mem[key], mod);
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {data,error}=await c.from("client_mer_sessions").select("belt,modality,completed_at").eq("client_key",key);
    if (!error){ tableOk=true; if(id) writeLocal(id,key,data||[]); return beltsOf(data, mod); }
    if (!missingTable(error)) throw error;
    tableOk=false;
  }
  return id ? beltsOf(readLocal(id,key), mod) : beltsOf(mem[key], mod);
}
async function complete(key, name, belt, sessionIndex, modality){
  const mod = modalityOf(modality);
  if (!key || !belt) return [];
  const row = {client_key:key, client_name:name||key, belt:belt, modality:mod, session_index:sessionIndex||null, completed_at:new Date().toISOString()};
  if (useMem()){
    mem[key]=(mem[key]||[]).filter(r=>!(r.belt===belt && rowMod(r)===mod));
    mem[key].push(row);
    return beltsOf(mem[key], mod);
  }
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {error}=await c.from("client_mer_sessions").upsert(Object.assign({practitioner_id:id}, row), {onConflict:"practitioner_id,client_key,belt,modality"});
    if (!error){ tableOk=true; return load(key, mod); }
    if (!missingTable(error)) throw error;
    tableOk=false;
  }
  const all = id ? readLocal(id,key) : (mem[key]||[]);
  const next = all.filter(r=>!(r.belt===belt && rowMod(r)===mod)).concat([row]);
  if (id) writeLocal(id,key,next); else mem[key]=next;
  return beltsOf(next, mod);
}
async function undo(key, belt, modality){
  const mod = modalityOf(modality);
  if (!key || !belt) return [];
  if (useMem()){ mem[key]=(mem[key]||[]).filter(r=>!(r.belt===belt && rowMod(r)===mod)); return beltsOf(mem[key], mod); }
  const id = await userId();
  const c = sb();
  if (c && id && tableOk!==false){
    const {error}=await c.from("client_mer_sessions").delete().eq("client_key",key).eq("belt",belt).eq("modality",mod);
    if (!error){ tableOk=true; return load(key, mod); }
    if (!missingTable(error)) throw error;
    tableOk=false;
  }
  const all = (id ? readLocal(id,key) : (mem[key]||[])).filter(r=>!(r.belt===belt && rowMod(r)===mod));
  if (id) writeLocal(id,key,all); else mem[key]=all;
  return beltsOf(all, mod);
}
return {clientKey, load, complete, undo};
});
