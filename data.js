// Small data layer: Supabase when configured, otherwise localStorage (demo mode).
(function(){
const cfg=window.FASCIAPP_CONFIG||{};
const LS={get:(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const FIELDS=["name","mods","address","city","country","lat","lng","phone","email","website","bio","photo","consent","whatsapp"];
const SF=["initials","date","time","duration","comment"];const pickS=x=>Object.fromEntries(SF.map(k=>[k,x[k]===""?null:(x[k]??null)]));
const cmp=(a,b)=>(a.date+(a.time||"")+a.created_at).localeCompare(b.date+(b.time||"")+b.created_at);
const pick=p=>Object.fromEntries(FIELDS.map(k=>[k,p[k]??null]));

const local={mode:"local",
 async session(){return LS.get("fyp_session",null)},
 async signUp(email,pw){const u=LS.get("fyp_users",{});if(u[email])throw new Error("An account with this email already exists. Please sign in.");
  u[email]={pw,id:"local-"+Date.now()};LS.set("fyp_users",u);const s={user_id:u[email].id,email};LS.set("fyp_session",s);return s},
 async signIn(email,pw){const u=LS.get("fyp_users",{})[email];if(!u||u.pw!==pw)throw new Error("Wrong email or password.");const s={user_id:u.id,email};LS.set("fyp_session",s);return s},
 async signOut(){localStorage.removeItem("fyp_session")},
 async list(){const s=await this.session();return Object.values(LS.get("fyp_profiles2",{})).filter(p=>p.consent||(s&&p.user_id===s.user_id))},
 async mine(){const s=await this.session();return s?LS.get("fyp_profiles2",{})[s.user_id]||null:null},
 async save(p){const s=await this.session();const all=LS.get("fyp_profiles2",{});const row={...pick(p),id:all[s.user_id]?.id||crypto.randomUUID(),user_id:s.user_id,created_at:all[s.user_id]?.created_at||new Date().toISOString()};
  all[s.user_id]=row;LS.set("fyp_profiles2",all);return row},
 async sessions(){const s=await this.session();if(!s)return[];return (LS.get("fyp_sessions",{})[s.user_id]||[]).slice().sort(cmp)},
 async saveSession(x){const s=await this.session();const all=LS.get("fyp_sessions",{}),l=all[s.user_id]||[];const i=l.findIndex(r=>r.id===x.id);
  const row={...pickS(x),id:x.id||crypto.randomUUID(),user_id:s.user_id,created_at:i>=0?l[i].created_at:new Date().toISOString()};if(i>=0)l[i]=row;else l.push(row);all[s.user_id]=l;LS.set("fyp_sessions",all);return row},
 async deleteSession(id){const s=await this.session();const all=LS.get("fyp_sessions",{});all[s.user_id]=(all[s.user_id]||[]).filter(r=>r.id!==id);LS.set("fyp_sessions",all)}};

function supa(){const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const sess=async()=>{const {data}=await sb.auth.getSession();const u=data.session?.user;return u?{user_id:u.id,email:u.email}:null};
 const chk=({data,error})=>{if(error)throw new Error(error.message);return data};
 return {mode:"supabase",
  session:sess,
  async signUp(email,pw){const d=chk(await sb.auth.signUp({email,password:pw}));if(!d.session)throw new Error("Account created. Check your email to confirm it, then sign in.");return sess()},
  async signIn(email,pw){chk(await sb.auth.signInWithPassword({email,password:pw}));return sess()},
  async signOut(){await sb.auth.signOut()},
  async list(){return chk(await sb.from("practitioners").select("*").order("created_at"))},
  async mine(){const s=await sess();if(!s)return null;return chk(await sb.from("practitioners").select("*").eq("user_id",s.user_id).maybeSingle())},
  async save(p){const s=await sess();return chk(await sb.from("practitioners").upsert({...pick(p),user_id:s.user_id},{onConflict:"user_id"}).select().single())},
  async sessions(){const s=await sess();if(!s)return[];return chk(await sb.from("sessions").select("*").eq("user_id",s.user_id)).sort(cmp)},
  async saveSession(x){const s=await sess();const row={...pickS(x),user_id:s.user_id};
   return x.id?chk(await sb.from("sessions").update(row).eq("id",x.id).select().single()):chk(await sb.from("sessions").insert(row).select().single())},
  async deleteSession(id){chk(await sb.from("sessions").delete().eq("id",id))}};
}
window.DB=(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase)?supa():local;
})();
