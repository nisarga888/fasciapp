// Small data layer: Supabase when configured, otherwise localStorage (demo mode).
(function(){
const cfg=window.FASCIAPP_CONFIG||{};
const LS={get:(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const FIELDS=["name","practice_name","mods","address","city","country","lat","lng","phone","email","website","bio","photo","consent","whatsapp"];
const SF=["initials","date","duration","format","comment"];const pickS=x=>Object.fromEntries(SF.map(k=>[k,x[k]===""?null:(x[k]??null)]));
const FMT_RE=/^⟦(In person|Online)⟧\s*/;
function unpackSession(row){if(!row)return row;let format=row.format,comment=row.comment||"";
 if(!format){const m=FMT_RE.exec(comment);if(m){format=m[1];comment=comment.slice(m[0].length)}else format="In person"}
 return{...row,format,comment}}
function packComment(format,comment){const c=String(comment||"").replace(FMT_RE,"");return "⟦"+(format||"In person")+"⟧ "+c}
const cmp=(a,b)=>(a.date+a.created_at).localeCompare(b.date+b.created_at);
const pick=p=>Object.fromEntries(FIELDS.map(k=>[k,p[k]??null]));
// Multi-location: up to 3 {label,address,city,country,lat,lng}. Stored in `locations` jsonb when the column exists,
// otherwise packed as JSON into the `address` text column (graceful fallback). Old single-location rows are migrated on read.
// practice_name: preferred as its own column; if missing, embedded on locations[0].practice_name (jsonb fallback).
function stripLocMeta(L){return (L||[]).map(({practice_name:_,...rest})=>rest)}
function embedPractice(L,practice_name){
 L=stripLocMeta(L);const pn=(practice_name||"").trim()||null;
 if(!pn)return L;if(!L.length)return [{label:"",address:"",city:"",country:"",lat:null,lng:null,practice_name:pn}];
 return [{...L[0],practice_name:pn},...L.slice(1)]}
function norm(p){if(!p)return p;let L=Array.isArray(p.locations)?p.locations:null,addr=p.address;
 if(!L&&typeof addr==="string"&&addr.startsWith("[{")){try{L=JSON.parse(addr)}catch(e){}}
 if(L&&L.length){addr=L[0].address||""}else L=(p.city||p.lat!=null)?[{label:"",address:addr||"",city:p.city||"",country:p.country||"",lat:p.lat,lng:p.lng}]:[];
 const fromLoc=(L[0]&&L[0].practice_name)||"";
 const practice_name=String(p.practice_name||fromLoc||"").trim()||null;
 L=stripLocMeta(L).slice(0,3);
 return {...p,practice_name,address:addr,locations:L}}
window.normLocs=norm;

const local={mode:"local",
 async session(){return LS.get("fyp_session",null)},
 async signUp(email,pw){const u=LS.get("fyp_users",{});if(u[email])throw new Error("An account with this email already exists. Please sign in.");
  u[email]={pw,id:"local-"+Date.now()};LS.set("fyp_users",u);const s={user_id:u[email].id,email};LS.set("fyp_session",s);return s},
 async signIn(email,pw){const u=LS.get("fyp_users",{})[email];if(!u||u.pw!==pw)throw new Error("Wrong email or password.");const s={user_id:u.id,email};LS.set("fyp_session",s);return s},
 async signOut(){localStorage.removeItem("fyp_session")},
 async list(){const s=await this.session();return Object.values(LS.get("fyp_profiles2",{})).filter(p=>p.consent||(s&&p.user_id===s.user_id)).map(norm)},
 async mine(){const s=await this.session();return s?norm(LS.get("fyp_profiles2",{})[s.user_id]||null):null},
 async save(p){const s=await this.session();const all=LS.get("fyp_profiles2",{});const row={...pick(p),locations:p.locations||null,id:all[s.user_id]?.id||crypto.randomUUID(),user_id:s.user_id,created_at:all[s.user_id]?.created_at||new Date().toISOString()};
  all[s.user_id]=row;LS.set("fyp_profiles2",all);return norm(row)},
 async sessions(){const s=await this.session();if(!s)return[];return (LS.get("fyp_sessions",{})[s.user_id]||[]).map(unpackSession).slice().sort(cmp)},
 async saveSession(x){const s=await this.session();const all=LS.get("fyp_sessions",{}),l=all[s.user_id]||[];const i=l.findIndex(r=>r.id===x.id);
  const base=pickS(x);if(!base.format)base.format="In person";const row={...base,id:x.id||crypto.randomUUID(),user_id:s.user_id,created_at:i>=0?l[i].created_at:new Date().toISOString()};if(i>=0)l[i]=row;else l.push(row);all[s.user_id]=l;LS.set("fyp_sessions",all);return unpackSession(row)},
 async deleteSession(id){const s=await this.session();const all=LS.get("fyp_sessions",{});all[s.user_id]=(all[s.user_id]||[]).filter(r=>r.id!==id);LS.set("fyp_sessions",all)},
 async msgOk(){return false},
 async resetPassword(email){throw new Error("Password reset needs the live FasciApp server. Open the app at app.bodyawareness.ee and try again.")},
 async updatePassword(){throw new Error("Password reset needs the live FasciApp server.")},
 onAuth(){return ()=>{}}};



let noLocCol=false,noPracticeCol=false,noFormatCol=false;
function supa(){const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const sess=async()=>{const {data}=await sb.auth.getSession();const u=data.session?.user;return u?{user_id:u.id,email:u.email}:null};
 const chk=({data,error})=>{if(error)throw new Error(error.message);return data};
 // Probe once whether practice_name column exists (anon can SELECT).
 (async()=>{try{const r=await sb.from("practitioners").select("practice_name").limit(1);if(r.error&&/practice_name/.test(r.error.message||"")){noPracticeCol=true;console.warn("FasciApp: run `alter table public.practitioners add column if not exists practice_name text;` — storing practice_name inside locations jsonb for now")}}catch(e){}})();
 return {mode:"supabase",
  session:sess,
  async signUp(email,pw){const d=chk(await sb.auth.signUp({email,password:pw}));if(!d.session)throw new Error("Account created. Check your email to confirm it, then sign in.");return sess()},
  async signIn(email,pw){chk(await sb.auth.signInWithPassword({email,password:pw}));return sess()},
  async signOut(){await sb.auth.signOut()},
  async resetPassword(email){const redirectTo=location.origin.replace(/\/$/,"")+"/app/?reset=1";
   chk(await sb.auth.resetPasswordForEmail(email,{redirectTo}));return true},
  async updatePassword(password){chk(await sb.auth.updateUser({password}));return sess()},
  onAuth(cb){try{const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>cb(event,session));return ()=>subscription.unsubscribe()}catch(e){return ()=>{}}},
  async list(){return chk(await sb.from("practitioners").select("*").order("created_at")).map(norm)},
  async mine(){const s=await sess();if(!s)return null;return norm(chk(await sb.from("practitioners").select("*").eq("user_id",s.user_id).maybeSingle()))},
  async save(p){const s=await sess();const pn=(p.practice_name||"").trim()||null;let L=stripLocMeta(p.locations||[]);
   const base0=pick(p);base0.practice_name=pn;
   const upsert=async row=>{const r=await sb.from("practitioners").upsert(row,{onConflict:"user_id"}).select().single();return r};
   // Prefer locations column + practice_name column
   if(!noLocCol){
    let row={...base0,user_id:s.user_id,locations:L};
    if(noPracticeCol){delete row.practice_name;row.locations=embedPractice(L,pn)}
    let r=await upsert(row);
    if(r.error&&/practice_name/.test(r.error.message||"")){
     noPracticeCol=true;console.warn("FasciApp: run `alter table public.practitioners add column if not exists practice_name text;` — storing practice_name inside locations jsonb for now");
     delete row.practice_name;row.locations=embedPractice(L,pn);r=await upsert(row)}
    if(!r.error)return norm(r.data);
    if(!/locations/.test(r.error.message||""))throw new Error(r.error.message);
    noLocCol=true;console.warn("FasciApp: run `alter table practitioners add column if not exists locations jsonb;` — using address fallback")}
   // Address-packing fallback (also carries practice_name inside the JSON)
   const packedL=embedPractice(L,pn);
   const packed=packedL.length>1||pn?JSON.stringify(packedL):base0.address;
   const row={...base0,user_id:s.user_id,address:packed};delete row.practice_name;
   return norm(chk(await upsert(row)))},
  async sessions(){const s=await sess();if(!s)return[];return chk(await sb.from("sessions").select("*").eq("user_id",s.user_id)).map(unpackSession).sort(cmp)},
  async saveSession(x){const s=await sess();const base=pickS(x);if(!base.format)base.format="In person";
   const write=async row=>{const q=x.id?sb.from("sessions").update(row).eq("id",x.id).select().single():sb.from("sessions").insert(row).select().single();return await q};
   let row={...base,user_id:s.user_id};
   if(noFormatCol){row={...row,comment:packComment(base.format,base.comment)};delete row.format}
   let r=await write(row);
   if(r.error&&/format/i.test(r.error.message||"")){noFormatCol=true;console.warn("FasciApp: run `alter table public.sessions add column if not exists format text;` — packing format into comment for now");
    row={...base,user_id:s.user_id,comment:packComment(base.format,base.comment)};delete row.format;r=await write(row)}
   return unpackSession(chk(r))},
  async deleteSession(id){chk(await sb.from("sessions").delete().eq("id",id))},
  async msgOk(){const r=await sb.from("messages").select("id").limit(1);return !r.error},
  async msgs(){const s=await sess();if(!s)return[];return chk(await sb.from("messages").select("*").or(`sender.eq.${s.user_id},recipient.eq.${s.user_id}`).order("created_at").limit(1000))},
  async sendMsg(to,body){const s=await sess();return chk(await sb.from("messages").insert({sender:s.user_id,recipient:to,body}).select().single())},
  async markRead(from){const s=await sess();chk(await sb.from("messages").update({read_at:new Date().toISOString()}).eq("recipient",s.user_id).eq("sender",from).is("read_at",null))},
  onMsg(cb){try{const ch=sb.channel("msgs").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},cb).subscribe();return ()=>sb.removeChannel(ch)}catch(e){return ()=>{}}}};
}
window.DB=(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase)?supa():local;
// Re-bind if supabase-js arrived after data.js (Safari / slow CDN)
if(window.DB&&window.DB.mode==="local"&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY){
  const tryBind=()=>{if(window.supabase){window.DB=supa();return true}return false};
  if(!tryBind()){let n=0;const t=setInterval(()=>{if(tryBind()||++n>40)clearInterval(t)},50)}
}
})();
