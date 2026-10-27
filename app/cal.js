/* v0.23.149 Profile panels + session calendar (planned_sessions, in-app reminders only, Europe/Warsaw) */
(function(){
const TZ="Europe/Warsaw";const BUILD="0.23.154";const faU=()=>{try{return me}catch(e){return window.faMe}};let C=null,list=[],loaded=false,sel=null,wk0=null,editId=null;
const q=s=>document.querySelector(s),E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function sb(){if(window.scanSb)return window.scanSb;if(!C){const c=window.FASCIAPP_CONFIG||{};C=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:window.localStorage,storageKey:"fasciapp-auth"}})}return C}
function parts(d){const o={};new Intl.DateTimeFormat("en-GB",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d).forEach(p=>o[p.type]=p.value);return o}
const dkey=d=>{const p=parts(d);return p.year+"-"+p.month+"-"+p.day},hm=d=>{const p=parts(d);return p.hour+":"+p.minute};
function fromWarsaw(ds,ts){const [y,m,d]=ds.split("-").map(Number),[h,mi]=ts.split(":").map(Number);let g=Date.UTC(y,m-1,d,h,mi);for(let i=0;i<2;i++){const p=parts(new Date(g));const asUtc=Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute);g+=Date.UTC(y,m-1,d,h,mi)-asUtc}return new Date(g)}
const noon=k=>fromWarsaw(k,"12:00"),addD=(k,n)=>dkey(new Date(noon(k).getTime()+n*864e5));
const fmt=(d,o)=>new Intl.DateTimeFormat("en-GB",Object.assign({timeZone:TZ},o)).format(d);
const nice=d=>fmt(d,{weekday:"short"})+" "+fmt(d,{day:"numeric",month:"short"})+" "+hm(d);
function monday(k){const wd=(new Date(noon(k)).getUTCDay()+6)%7;return addD(k,-wd)}
async function load(force){if(loaded&&!force)return list;try{const {data,error}=await sb().from("planned_sessions").select("*").order("starts_at");if(error)throw error;list=(data||[]).map(r=>Object.assign(r,{t:new Date(r.starts_at)}));loaded=true}catch(e){list=[]}return list}
window.faCalReset=()=>{loaded=false;list=[]};
const nextS=()=>list.find(s=>s.t>new Date());
const remMs={"1h":36e5,"1d":864e5};
/* ---------- reminder banner ---------- */
let dis={};try{dis=JSON.parse(sessionStorage.getItem("fa_remdis")||"{}")}catch(e){}
window.faRemCheck=async function(){const b=q("#calRem");if(!b)return;const scr=(document.querySelector(".screen.active")||{}).id;if(!faU()||!["map","list","profile"].includes(scr)){b.hidden=true;return}await load();const n=Date.now();
 const s=list.find(x=>remMs[x.reminder]&&x.t-n>0&&x.t-n<=remMs[x.reminder]&&!dis[x.id]);if(!s){b.hidden=true;return}
 b.innerHTML='<span>⏰</span><div><b>Upcoming session</b><small>'+E(nice(s.t))+' · '+E(s.client_name)+'</small></div><button type="button" aria-label="Dismiss">✕</button>';b.hidden=false;
 b.onclick=e=>{if(e.target.closest("button")){dis[s.id]=1;try{sessionStorage.setItem("fa_remdis",JSON.stringify(dis))}catch(x){}b.hidden=true;return}sel=dkey(s.t);show("cal")}};
setInterval(()=>window.faRemCheck&&faRemCheck(),60000);
/* ---------- profile panels ---------- */
window.faPanels=async function(){const v=q("#profView");if(!v)return;const head=v.querySelector(".bHead");let P=q("#faPanels");
 if(!P||!v.contains(P)){if(P)P.remove();P=document.createElement("div");P.id="faPanels";P.className="faPanels";if(head)head.after(P);else v.prepend(P)}
 const pan=(k,ic,t,sub,em)=>'<button type="button" class="faPan" data-fap="'+k+'"><span class="fpIc">'+ic+'</span><span class="fpTx"><b>'+t+'</b><small>'+sub+'</small>'+(em?'<em>'+em+'</em>':'')+'</span><span class="fpAr">›</span></button>';
 const draw=(a,b,c)=>{P.innerHTML=pan("scan","◎","Assessment plan","Body Scan",c)+pan("cal","📅","Plan your sessions","Calendar &amp; reminders",a)+pan("log","📖","Session log","Monitor past sessions",b)+pan("edit","✎","Edit your profile","Photo, bio, locations, contacts","")};
 draw(P.dataset.a||"",P.dataset.b||"",P.dataset.c||"");
 if(!v.dataset.mode)v.dataset.mode="clean";v.classList.toggle("faClean",v.dataset.mode==="clean");v.classList.toggle("faEdit",v.dataset.mode==="edit");
 let BK=q("#faBack");if(!BK||!v.contains(BK)){BK=document.createElement("button");BK.type="button";BK.id="faBack";BK.className="faBack";BK.textContent="← My profile";BK.onclick=()=>{v.dataset.mode="clean";v.classList.add("faClean");v.classList.remove("faEdit");window.scrollTo(0,0);try{q("#profile").scrollTop=0;q("#profile").scrollIntoView({block:"start"})}catch(x){}};v.prepend(BK)}
 P.onclick=e=>{const k=(e.target.closest("[data-fap]")||{}).dataset;if(!k)return;const f=k.fap;
  if(f==="cal")show("cal");else if(f==="log")show("log");else if(f==="scan"){try{scanHub()}catch(x){}show("scan")}else{v.dataset.mode="edit";v.classList.remove("faClean");v.classList.add("faEdit");window.scrollTo(0,0);try{q("#profile").scrollTop=0;q("#faBack").scrollIntoView({block:"start"})}catch(x){}}};
 const sp=q("#scPlans");if(sp)sp.style.display="none";
 try{await load(true)}catch(e){}let n=null;try{n=nextS()}catch(e){}const a=n?"Next: "+E(nice(n.t))+" · "+E(n.client_name):"No sessions planned yet";
 let b="";try{const ss=await DB.sessions();const m=dkey(new Date()).slice(0,7);const c=ss.filter(s=>String(s.date||"").slice(0,7)===m).length;b=c+" session"+(c==1?"":"s")+" this month"}catch(e){}
 let c="";try{const {data}=await sb().rpc("fa_scan_status");if(data){let na=0;try{const r=await sb().from("assessments").select("id",{count:"exact",head:true});na=r.count||0}catch(x){}const u=Math.max(data.scans_used||0,na),dn=u+" scan"+(u==1?"":"s")+" done",PN={practitioner:"Practitioner",pro:"Pro",yearly:"Yearly",single:"Single scan"};if(data.admin)c="Unlimited (admin) · "+dn;else if(data.active){if(data.plan==="practitioner")c="Practitioner · "+Math.max(0,30-u)+" of 30 left · "+dn;else if(data.plan==="single")c="Single scan · "+(data.trial_remaining||0)+" left · "+dn;else c=(PN[data.plan]||data.plan)+" · Unlimited · "+dn}else if(data.trial_remaining>0)c=data.trial_remaining+" free scan"+(data.trial_remaining==1?"":"s")+" left · "+dn;else c="See plans · "+dn}}catch(e){}
 P.dataset.a=a;P.dataset.b=b;P.dataset.c=c;draw(a,b,c);faRemCheck()};
/* version label + update check (v0.23.151) */
async function verLabel(){const P=q("#profile");if(!P)return;let L=q("#faVer");if(!L){L=document.createElement("p");L.id="faVer";L.className="faVer";P.append(L)}L.textContent="FasciApp v"+BUILD;L.onclick=null;
 try{const t=await (await fetch("sw.js?c="+Date.now(),{cache:"no-store"})).text();const m=t.match(/fasciapp-v([\d.]+)/);if(m&&m[1]!==BUILD){L.innerHTML="FasciApp v"+BUILD+" · <b>Update available: tap to refresh</b>";L.onclick=async()=>{try{const r=await navigator.serviceWorker.getRegistration();if(r)await r.update()}catch(e){}location.reload()}}}catch(e){}}
function watchProf(){const v=q("#profView");if(!v||v._faW)return;v._faW=1;new MutationObserver(()=>{if(v.querySelector(".bHead")&&!q("#faPanels"))faPanels()}).observe(v,{childList:true})}
window.faProfShown=()=>{{const v=q("#profView");if(v)v.dataset.mode="clean"}watchProf();verLabel();setTimeout(()=>faPanels(),0)};
addEventListener("pageshow",e=>{if(e.persisted)location.reload()});
/* ---------- calendar ---------- */
function render(){const today=dkey(new Date());if(!sel)sel=today;if(!wk0)wk0=monday(sel);const days=[...Array(7)].map((_,i)=>addD(wk0,i));
 q("#calMon").textContent=fmt(noon(days[3]),{month:"long",year:"numeric"});
 q("#calWk").innerHTML=days.map(k=>{const n=list.filter(s=>dkey(s.t)===k).length,d=noon(k);return '<button type="button" data-k="'+k+'" class="'+(k===sel?"on ":"")+(k===today?"td":"")+'"><small>'+fmt(d,{weekday:"short"})+'</small><b>'+fmt(d,{day:"numeric"})+'</b><i>'+"<s></s>".repeat(Math.min(n,3))+'</i></button>'}).join("");
 const L=list.filter(s=>dkey(s.t)===sel);const sd=noon(sel);
 q("#calDay").textContent=fmt(sd,{weekday:"long"})+" "+fmt(sd,{day:"numeric",month:"short"})+" · "+L.length+" session"+(L.length==1?"":"s");
 const rl={none:"No reminder","1h":"Reminder 1 hour before","1d":"Reminder 1 day before"};
 q("#calList").innerHTML=L.length?L.map(s=>'<button type="button" class="calIt'+(s.t<new Date()?" past":"")+'" data-id="'+s.id+'"><b>'+hm(s.t)+'</b><span><span class="cn">'+E(s.client_name)+'</span><small>'+rl[s.reminder]+(s.note?' · '+E(s.note):'')+'</small></span></button>').join(""):'<p class="muted center calEm">No sessions this day.</p>'}
window.faCalLoad=async function(){if(!faU()){show("auth");return}render();await load(true);render()};
function openSheet(s){editId=s?s.id:null;const f=q("#calForm");f.reset();q("#calSt").textContent="";
 f.date.value=s?dkey(s.t):sel||dkey(new Date());f.time.value=s?hm(s.t):"10:00";f.client.value=s?s.client_name:"";f.note.value=s?(s.note||""):"";
 (f.querySelector('input[name=rem][value="'+(s?s.reminder:"1h")+'"]')||{}).checked=true;q("#calSheetT").textContent=s?"Edit session":"Add session";q("#calDel").hidden=!s;
 q("#calDim").classList.add("open");q("#calSheet").classList.add("open")}
function closeSheet(){q("#calDim").classList.remove("open");q("#calSheet").classList.remove("open")}
document.addEventListener("DOMContentLoaded",init);if(document.readyState!=="loading")init();
let did=false;function init(){if(did||!q("#cal"))return;did=true;watchProf();
 q("#calWk").onclick=e=>{const b=e.target.closest("[data-k]");if(b){sel=b.dataset.k;render()}};
 q("#calPrev").onclick=()=>{wk0=addD(wk0,-7);sel=wk0;render()};q("#calNext").onclick=()=>{wk0=addD(wk0,7);sel=wk0;render()};
 q("#calToday").onclick=()=>{sel=dkey(new Date());wk0=monday(sel);render()};
 q("#calAdd").onclick=()=>openSheet(null);q("#calDim").onclick=closeSheet;q("#calX").onclick=closeSheet;
 q("#calList").onclick=e=>{const b=e.target.closest("[data-id]");if(b)openSheet(list.find(s=>s.id===b.dataset.id))};
 q("#calForm").onsubmit=async e=>{e.preventDefault();const f=e.target,st=q("#calSt");const nm=f.client.value.trim();if(!f.date.value||!f.time.value||!nm){st.textContent="Please add date, time and client name.";return}
  const row={client_name:nm.slice(0,80),starts_at:fromWarsaw(f.date.value,f.time.value).toISOString(),reminder:(f.querySelector("input[name=rem]:checked")||{}).value||"none",note:f.note.value.trim().slice(0,500)||null};
  st.textContent="Saving…";try{const r=editId?await sb().from("planned_sessions").update(row).eq("id",editId):await sb().from("planned_sessions").insert(row);if(r.error)throw r.error;sel=f.date.value;wk0=monday(sel);closeSheet();await load(true);render()}catch(x){st.textContent="Could not save: "+(x.message||x)}};
 q("#calDel").onclick=async()=>{if(!editId||!confirm("Delete this session?"))return;const r=await sb().from("planned_sessions").delete().eq("id",editId);if(r.error){q("#calSt").textContent="Could not delete: "+r.error.message;return}closeSheet();await load(true);render()}}
})();
