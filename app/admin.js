/* v0.23.185 Admin-only: all practitioners by modality (Profile screen). Reuses the already-loaded, cached public list: no extra DB calls. */
(function(){
const q=s=>document.querySelector(s),E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let mod="",txt="",nm="";
const adm=()=>{try{return isAdmin()}catch(e){return false}};
const CANON={"sound healing":"Sound Healing","soundhealing":"Sound Healing","qigong":"Qigong","qi gong":"Qigong","yin yoga":"Yin Yoga","lomi lomi":"Lomi Lomi","lomi lomi massage":"Lomi Lomi","reflexology":"Reflexology","réflexology":"Reflexology"};
const cm=m=>{const t=String(m||"").trim();return CANON[t.toLowerCase()]||t};
let PC=null,PS=null;const P=()=>{let a;try{a=people||[]}catch(e){a=[]}if(a!==PS){PS=a;PC=a.map(p=>({...p,mods:[...new Set((p.mods||[]).map(cm).filter(Boolean))]}))}return PC};
const locs=p=>{const L=(p.locations&&p.locations.length)?p.locations:[p];const s=[];L.forEach(l=>{const t=[l.city,l.country].map(x=>String(x||"").trim()).filter(Boolean).join(", ");if(t&&!s.includes(t))s.push(t)});return s.join(" · ")||"—"};
function rows(){const f=txt.toLowerCase(),n=nm.trim().toLowerCase();return P().filter(p=>(!n||[p.name,p.practice_name].join(" ").toLowerCase().includes(n))&&(!mod||(p.mods||[]).includes(mod))&&(!f||[p.name,p.practice_name,locs(p),(p.mods||[]).join(" ")].join(" ").toLowerCase().includes(f)))}
const pr=m=>m==="MER"?0:m==="BBTRS"?1:2;
function counts(){const m=new Map();P().forEach(p=>[...new Set(p.mods||[])].forEach(x=>{if(x)m.set(x,(m.get(x)||0)+1)}));return [...m].sort((a,b)=>(pr(a[0])-pr(b[0]))||b[1]-a[1]||a[0].localeCompare(b[0]))}
function list(){const L=q("#admL"),R=rows();if(!L)return;q("#admN").textContent=R.length+" of "+P().length+" practitioners";
 L.innerHTML=R.map(p=>`<button type="button" class="admR" data-id="${E(p.id)}"><b>${E(p.name||p.practice_name||"(no name)")}</b><span class="admLoc">${E(locs(p))}</span><span class="admM">${(p.mods||[]).filter(Boolean).map(m=>`<i${m===mod?' class="on"':''}>${E(m)}</i>`).join("")||"—"}</span></button>`).join("")||'<p class="admE">No practitioners match.</p>'}
function render(){const prof=q("#profile");let C=q("#admPr");
 if(!adm()||!prof){if(C)C.remove();return}
 if(!C){C=document.createElement("div");C.id="admPr";C.className="scPlans admPr";prof.appendChild(C)}
 const cs=counts();C.innerHTML=`<b>Admin · Practitioners by modality</b><p>Only you (admin) see this.</p>
 <select id="admMod" aria-label="Modality"><option value="">All modalities (${P().length})</option>${cs.map(([m,n])=>`<option value="${E(m)}"${m===mod?" selected":""}>${E(m)} (${n})</option>`).join("")}</select>
 <input id="admName" type="search" placeholder="Search by practitioner name…" value="${E(nm)}" autocomplete="off">
 <input id="admQ" type="search" placeholder="Search name, city, country…" value="${E(txt)}" autocomplete="off">
 <div class="admN" id="admN"></div><div id="admL" class="admL"></div>`;
 q("#admMod").onchange=e=>{mod=e.target.value;list()};q("#admName").oninput=e=>{nm=e.target.value;list()};q("#admQ").oninput=e=>{txt=e.target.value;list()};
 q("#admL").onclick=e=>{const b=e.target.closest(".admR");if(b&&window.faOpenPract)faOpenPract(b.dataset.id)};list()}
window.faAdminPr=render;
const prev=window.faProfShown;window.faProfShown=function(){try{prev&&prev.apply(this,arguments)}catch(e){}setTimeout(render,500)};
})();
/* v0.23.186 Admin-only: MER supervision sign-ups (table supervision_signups, admin RLS select). */
(function(){
const q=s=>document.querySelector(s),E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const adm=()=>{try{return isAdmin()}catch(e){return false}};
const D=[["2026-12-01","1 Dec"],["2026-12-29","29 Dec"],["2027-01-19","19 Jan"],["2027-03-02","2 Mar"],["2027-04-30","30 Apr"]];
let sb=null,rows=null,busy=false;
function cli(){if(!sb){const c=window.FASCIAPP_CONFIG||{};sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:window.localStorage,storageKey:"fasciapp-auth"}})}return sb}
function draw(C,msg){if(msg){C.innerHTML=`<b>Admin · Supervision sign-ups</b><p>${E(msg)}</p>`;return}
 const R=rows||[],paid=R.filter(r=>r.status==="paid");
 const per=D.map(([v,l])=>{const a=R.filter(r=>(r.sessions||[]).includes(v));return `<div class="admR" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span><b>${l}</b> · ${a.length} signed up · ${a.filter(r=>r.status==="paid").length} paid</span><button type="button" class="svCp" data-d="${v}" style="padding:6px 10px;border-radius:10px;border:1px solid #c99e6766;background:#02191E;color:#F3EDE4;cursor:pointer">Copy emails</button></div>`}).join("");
 C.innerHTML=`<b>Admin · Supervision sign-ups</b><p>${R.length} sign-ups · ${R.filter(r=>r.bundle).length} bundles · ${paid.length} paid · £${paid.reduce((s,r)=>s+Number(r.amount_gbp||0),0)} received</p>
 <div class="admL" style="max-height:none">${per}</div><div class="admN" id="svMsg"></div>
 <div class="admL">${R.map(r=>`<div class="admR"><b>${E(r.name)}</b> <span class="admLoc">${E(r.email)}</span><span class="admM">${r.bundle?'<i class="on">All 5 + Breathe</i>':""}${(r.sessions||[]).map(s=>`<i>${E((D.find(d=>d[0]===s)||[0,s])[1])}</i>`).join("")}<i>£${E(r.amount_gbp)}</i><i${r.status==="paid"?' class="on"':''}>${E(r.status)}</i>${r.attend?`<i>${E(r.attend)}</i>`:""}</span><span class="admLoc">${new Date(r.created_at).toLocaleString("en-GB",{timeZone:"Europe/Warsaw"})}</span></div>`).join("")||'<p class="admN">No sign-ups yet.</p>'}</div>`;
 C.querySelectorAll(".svCp").forEach(b=>b.onclick=async()=>{const em=[...new Set(R.filter(r=>(r.sessions||[]).includes(b.dataset.d)).map(r=>r.email))].join(", ");try{await navigator.clipboard.writeText(em);q("#svMsg").textContent="Copied "+(em?em.split(", ").length:0)+" emails"}catch(e){q("#svMsg").textContent=em}})}
async function render(){const prof=q("#profile");let C=q("#admSv");
 if(!adm()||!prof){if(C)C.remove();return}
 if(!C){C=document.createElement("div");C.id="admSv";C.className="scPlans admPr";prof.appendChild(C)}
 if(busy)return;busy=true;draw(C,"Loading…");
 try{const {data,error}=await cli().from("supervision_signups").select("*").order("created_at",{ascending:false});if(error)throw error;rows=data;draw(C)}
 catch(e){draw(C,"Couldn't load sign-ups ("+(e.message||e)+"). Has supervision-signups.sql been run?")}busy=false}
const prev=window.faProfShown;window.faProfShown=function(){try{prev&&prev.apply(this,arguments)}catch(e){}setTimeout(render,600)};
})();
