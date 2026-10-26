const CITY={tallinn:[59.437,24.7536],warsaw:[52.2297,21.0122],warszawa:[52.2297,21.0122],krakow:[50.0647,19.945],"kraków":[50.0647,19.945],kielce:[50.8661,20.6286],berlin:[52.52,13.405],lesvos:[39.2645,26.2777],mytilene:[39.1047,26.5552]};
const DEMO=[];
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const LAST_EMAIL_KEY="fyp_last_email";
function rememberEmail(em){try{if(em)localStorage.setItem(LAST_EMAIL_KEY,em)}catch(e){}}
function lastEmail(){try{return localStorage.getItem(LAST_EMAIL_KEY)||""}catch(e){return""}}
function fillLastEmail(){const el=$("#email");if(el&&!el.value)el.value=lastEmail()}
const CFG=window.FASCIAPP_CONFIG||{};const MSG_ON=!!(CFG.FEATURES&&CFG.FEATURES.messaging);
var pendingBreath=null,MSG_OK=false,msgs=[],chatWith=null,pollT=null,unsub=null,pendingChat=null;
let me=null,people=[],here=null,map,layer,threads,photoData=null,signUpMode=true,didFit=false,labelZoom=8,lastLabels=null;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const all=()=>DEMO.concat(people);
const SUG=['MER', 'BBTRS', 'Breathwork', 'Massage', 'Craniosacral', 'Somatic therapy', 'Trauma therapy', 'Yoga'];let myMods=[];
function renderTags(){const set=[...new Set(SUG.concat(myMods))];$("#modBox").innerHTML=set.map(m=>`<button type="button" class="tag${myMods.includes(m)?" on":""}" data-m="${esc(m)}">${esc(m)}</button>`).join("");$$("#modBox .tag").forEach(b=>b.onclick=()=>{const m=b.dataset.m;myMods=myMods.includes(m)?myMods.filter(x=>x!==m):myMods.concat(m);renderTags()})}
function addTag(){const v=$("#modNew").value.trim().replace(/\s+/g," ");if(v&&!myMods.some(x=>x.toLowerCase()===v.toLowerCase()))myMods.push(v);$("#modNew").value="";renderTags()}
$("#modAdd").onclick=addTag;$("#modNew").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addTag()}};
function mappedPeople(){return all().filter(p=>pins(p).length)}
function modPinRank(m){const s=fold(String(m||"").replace(/®/g,"")).trim();
 if(s==="bbtrs"||s.startsWith("bbtrs "))return 0;
 if(s==="mer"||s==="myofascial energetic release"||s.startsWith("mer ")||s.startsWith("myofascial energetic release"))return 1;
 return 2}
function modCounts(){const m=new Map();mappedPeople().forEach(p=>{[...new Set(p.mods||[])].forEach(mod=>{if(!mod)return;m.set(mod,(m.get(mod)||0)+1)})});
 return[...m.entries()].sort((a,b)=>{const ra=modPinRank(a[0]),rb=modPinRank(b[0]);return ra!==rb?ra-rb:a[0].localeCompare(b[0],"en",{sensitivity:"base"})})}
function placeOptions(mod){const cityMap=new Map(),countryMap=new Map();
 mappedPeople().filter(p=>!mod||(p.mods||[]).includes(mod)).forEach(p=>{const locs=(p.locations&&p.locations.length)?p.locations:[p];const seenC=new Set(),seenCo=new Set();
  locs.forEach(l=>{const city=isOnline(l)?"":faCity(l.city),country=String(l.country||"").trim();
   if(city&&country){const k=fold(city)+"|"+fold(country);if(!seenC.has(k)){seenC.add(k);const o=cityMap.get(k)||{city,country,n:0};o.n++;cityMap.set(k,o)}}
   if(country){const k=fold(country);if(!seenCo.has(k)){seenCo.add(k);const o=countryMap.get(k)||{country,n:0};o.n++;countryMap.set(k,o)}}})});
 return{cities:[...cityMap.values()].sort((a,b)=>{const c=a.city.localeCompare(b.city,"en",{sensitivity:"base"});return c||a.country.localeCompare(b.country,"en",{sensitivity:"base"})}),
  countries:[...countryMap.values()].sort((a,b)=>a.country.localeCompare(b.country,"en",{sensitivity:"base"}))}}
function fillFilter(){try{fillPlaces()}catch(e){}
const mods=modCounts();const opts=`<option value="">All practices</option>`+mods.map(([m,n])=>`<option value="${esc(m)}">${esc(m)} (${n})</option>`).join("");
 const lf=$("#listFilter");if(lf){const v=lf.value;lf.innerHTML=opts;lf.value=[...lf.options].some(o=>o.value===v)?v:""}
 const cf=$("#filter");if(cf){const v=cf.value;cf.innerHTML=`<option value="">All locations</option>`+placeOptions().countries.map(c=>`<option value="${esc(c.country)}">${esc(c.country)} (${c.n})</option>`).join("");cf.value=[...cf.options].some(o=>o.value===v)?v:""}}
function syncModFilter(){try{fillPlaces()}catch(e){}renderMarkers();renderList()}
const mpins=p=>{const c=fold(mapCountry());return c?pins(p).filter(l=>fold(String(l.country||"").trim())===c):pins(p)};
const mapCountry=()=>($("#filter")&&$("#filter").value)||"";
function mapPeople(){const c=fold(mapCountry());const ps=filtered();if(!c)return ps;return ps.filter(p=>((p.locations&&p.locations.length)?p.locations:[p]).some(l=>fold(String(l.country||"").trim())===c))}
// Location filter: native <select> (iOS picker). Values: "co:<country>", "ci:<city>|<country>", "free:<text>" (deep links)
function closePlaceMenu(){}function openPlaceMenu(){}
function fillPlaces(){const el=$("#qPlace");if(!el||el.tagName!=="SELECT")return;const v=el.value;const {cities,countries}=placeOptions(($("#listFilter")&&$("#listFilter").value)||"");
 const by=new Map();cities.forEach(c=>{const k=fold(c.country);(by.get(k)||by.set(k,[]).get(k)).push(c)});
 let h=`<option value="">All locations</option>`;
 countries.forEach(co=>{const cs=(by.get(fold(co.country))||[]).slice().sort((a,b)=>a.city.localeCompare(b.city,"en",{sensitivity:"base"}));
  h+=`<optgroup label="${esc(co.country)}"><option value="co:${esc(co.country)}">${esc(co.country)} (${co.n})</option>${cs.map(c=>`<option value="ci:${esc(c.city)}|${esc(c.country)}">${esc(c.city)} (${c.n})</option>`).join("")}</optgroup>`});
 if(v.startsWith("free:"))h+=`<option value="${esc(v)}">${esc(v.slice(5))}</option>`;
 el.innerHTML=h;el.value=[...el.options].some(o=>o.value===v)?v:""}
function setPlace(text){const el=$("#qPlace");if(!el)return;fillPlaces();const t=fold(text);
 const o=[...el.options].find(o=>o.value.startsWith("ci:")&&fold(o.value.slice(3).split("|")[0])===t)||[...el.options].find(o=>o.value.startsWith("co:")&&fold(o.value.slice(3))===t);
 if(o){el.value=o.value;return}const opt=document.createElement("option");opt.value="free:"+text;opt.textContent=text;el.appendChild(opt);el.value=opt.value}
function placeOk(p){const v=($("#qPlace")&&$("#qPlace").value)||"";if(!v)return true;const locs=(p.locations&&p.locations.length)?p.locations:[p];
 if(v.startsWith("co:")){const c=fold(v.slice(3));return locs.some(l=>fold(l.country||"")===c)}
 if(v.startsWith("ci:")){const [ci,co]=v.slice(3).split("|").map(fold);return locs.some(l=>fold(faCity(l.city))===ci&&fold(l.country||"")===co)}
 return placeHit(p,fold(v.replace(/^free:/,"")))}
function applyDeepLink(){try{const sp=new URLSearchParams(location.search);
 const tab=(sp.get("tab")||"").toLowerCase();if(tab==="learn"||tab==="lab"){show("learn");return true}
 if(sp.get("join")==="1"){wantForm=true;if(me){show("profile");return true}setMode(true);show("auth");return true}
 if(sp.get("search")==="1"){show("list");const q=$("#qPlace");if(q)requestAnimationFrame(()=>{try{q.focus();q.showPicker&&q.showPicker()}catch(e){}});return true}
 const practice=(sp.get("practice")||sp.get("mod")||"").trim();const place=(sp.get("place")||sp.get("city")||"").trim();
 if(!practice&&!place)return false;fillFilter();let hit=false;
 if(practice){const want=fold(practice);["listFilter"].forEach(id=>{const el=$(`#${id}`);if(!el)return;const opt=[...el.options].find(o=>o.value&&(fold(o.value)===want||fold(o.value).includes(want)||want.includes(fold(o.value))));if(opt){el.value=opt.value;hit=true}})}
 if(place){setPlace(place);hit=true}
 if(hit){renderMarkers();renderList();show("list");return true}return false}catch(e){return false}}
window.show=show;function show(t){if(window.faSheetClose)faSheetClose();if((t==="map"||t==="list")&&window.faJoinUpd)faJoinUpd();$$(".screen").forEach(s=>s.classList.toggle("active",s.id===t));const inApp=!["splash","auth"].includes(t);document.body.classList.toggle("in",inApp);
 $$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===t||(t==="log"&&b.dataset.t==="profile")));window.scrollTo(0,0);showT=t;requestAnimationFrame(()=>setTimeout(()=>{if(showT===t)afterShow(t)},0))}
let showT=null;function afterShow(t){try{if(t==="scan")scanLoad();if(t==="map"){initMap();setTimeout(()=>{map.invalidateSize();fitPins(!didFit)},80)}if(t==="list")renderList();
 if(t==="profile"){(async()=>{if(!me){me=await DB.session().catch(()=>null);hdr()}if(!me){$("#needLogin").hidden=false;$("#profForm").hidden=true;$("#profView").hidden=true;$("#logCard").hidden=true;return}profEdit=wantForm;wantForm=false;loadProf()})()}
 if(t==="log")loadLog();if(t==="learn"){renderLearn();const n=window.FASCIAPP_NEWS;if(n){localStorage.setItem(LAB_SEEN,n.id);renderNews()}}if(t==="inbox"&&MSG_ON)renderInbox()}catch(e){console.warn(e)}}
function hdr(){document.body.classList.toggle("authed",!!me);if(window.faJoinUpd)faJoinUpd();{const lb=$("#labBtn");if(lb)lb.hidden=!!me}$("#tabInbox").hidden=!MSG_ON;{let ad=false;try{ad=isAdmin()}catch(e){}const ts=$("#tabScan");if(ts)ts.hidden=!ad;const pl=document.querySelector('#tabs [data-t="profile"] span');if(pl)pl.textContent=ad?"Profile":"My profile";if(!ad&&$("#scan")&&$("#scan").classList.contains("active"))show("map")}$("#hEdit").hidden=!me;$("#hOut").hidden=!me;$("#hIn").hidden=!!me}
// v0.23.100: the people cache lives in IndexedDB. The old localStorage snapshot (fa_people_v1) outgrew Safari's ~5 MB quota
// (photos are data URLs), so its updates failed silently and an old list (e.g. 82 people) was painted on every start.
var faFresh=false,pCache=null;try{localStorage.removeItem("fa_people_v1")}catch(e){}
const PIDB={db:null,open(){return this.db||(this.db=new Promise((ok,no)=>{const r=indexedDB.open("fasciapp",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
 async get(k){const d=await this.open();return new Promise((ok,no)=>{const q=d.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})},
 async set(k,v){const d=await this.open();return new Promise((ok,no)=>{const t=d.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=()=>ok();t.onerror=()=>no(t.error)})}};
async function loadPCache(){try{const j=await Promise.race([PIDB.get("people"),new Promise(r=>setTimeout(()=>r(null),1200))]);pCache=Array.isArray(j)?j:null}catch(e){pCache=null}return pCache}
function cachedPeople(){return pCache}
const byName=l=>(l||[]).slice().sort((a,b)=>practiceTitle(a).localeCompare(practiceTitle(b),undefined,{sensitivity:"base"}));
async function paintFromCache(){await loadPCache();const c=cachedPeople();if(!c||people.length)return false;people=byName(c);fillFilter();renderMarkers();renderList();if(!didFit)fitPins(true);return true}
async function refresh(){try{people=byName(await DB.list());faFresh=true;PIDB.set("people",people).catch(()=>{})}catch(e){console.warn(e);if(!people.length)people=cachedPeople()||[];faFresh=true}fillFilter();renderMarkers();renderList();if(!didFit)fitPins(true)}

// navigation
$("#goLook").onclick=()=>show("map");$("#authLook").onclick=e=>{e.preventDefault();show("map")};
async function goPractitioner(){if(!me){me=await DB.session().catch(()=>null);hdr()}
 if(me){show("profile");return}fillLastEmail();setMode(false);show("auth")}
$("#goPract").onclick=()=>goPractitioner();
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));
const logoHome=$("#logoHome");if(logoHome)logoHome.onclick=()=>show("splash");
$$("nav button").forEach(b=>b.onclick=()=>{if(b.dataset.t==="list"&&$("#list").classList.contains("active")&&window.faListHome){faListHome();return}show(b.dataset.t)});
$("#hIn").onclick=()=>{fillLastEmail();show("auth")};
$("#hEdit").onclick=async()=>{if(!me){me=await DB.session().catch(()=>null);hdr()}if(me)show("profile");else{fillLastEmail();show("auth")}};
async function logout(){closeChat();if(unsub){unsub();unsub=null}msgUid=null;me=null;msgs=[];sess=[];sessLoaded=false;photoData=null;hdr();show("splash");$("#unread").hidden=true;DB.signOut().catch(()=>{}).then(()=>refresh())}
$("#hOut").onclick=logout;$("#pOut").onclick=logout;

// auth
function showAuthMain(){$("#authForm").hidden=false;$("#forgotForm").hidden=true;$("#resetForm").hidden=true;$("#authLook").parentElement.hidden=false}
function showForgot(){$("#authForm").hidden=true;$("#forgotForm").hidden=false;$("#resetForm").hidden=true;$("#authTitle").textContent="Reset your password";
 $("#forgotMsg").textContent="";$("#forgotEmail").value=$("#email").value||"";$("#forgotEmail").focus()}
function showResetForm(){show("auth");$("#authForm").hidden=true;$("#forgotForm").hidden=true;$("#resetForm").hidden=false;
 $("#authTitle").textContent="Set new password";$$(".seg").forEach(s=>s.hidden=true);
 $("#authLook").parentElement.hidden=true;$("#resetMsg").textContent="";$("#newPw").value="";$("#newPw2").value="";DB.session().then(s=>{if(s&&s.email)$("#resetUser").value=s.email}).catch(()=>{})}
function setMode(up){signUpMode=up;showAuthMain();fillLastEmail();$$(".seg").forEach(s=>s.hidden=false);
 $("#tabUp").classList.toggle("on",up);$("#tabIn").classList.toggle("on",!up);
 $("#authTitle").textContent=up?"Create your free account":"Welcome back";$("#authBtn").textContent=up?"Create account":"Sign in";$("#authMsg").textContent="";
 $("#pw").autocomplete=up?"new-password":"current-password";$("#agreeL").hidden=!up;$("#newsL").hidden=!up;$("#forgotWrap").hidden=up}
$("#tabUp").onclick=()=>setMode(true);$("#tabIn").onclick=()=>setMode(false);
$("#forgotLink").onclick=e=>{e.preventDefault();showForgot()};
$("#forgotBack").onclick=()=>{setMode(false)};
$("#forgotForm").onsubmit=async e=>{e.preventDefault();const em=$("#forgotEmail").value.trim().toLowerCase(),m=$("#forgotMsg");
 if(!em){m.textContent="Please enter your email.";return}m.textContent="Sending…";
 $("#forgotSent").hidden=true;
 try{await DB.resetPassword(em);m.textContent="✓ Sent. If "+em+" has a FasciApp account, a link to set a new password is on its way. It can take a few minutes.";$("#forgotSent").hidden=false;faResendCooldown(60)}catch(err){m.textContent=err.message||"Could not send the reset link."}};
function faResendCooldown(s){const b=$("#forgotResend");if(!b)return;clearInterval(b._t);b.disabled=true;const tick=()=>{if(s<=0){clearInterval(b._t);b.disabled=false;b.textContent="Resend the link";return}b.textContent="Resend in "+s+" s";s--};tick();b._t=setInterval(tick,1000)}
$("#forgotResend").onclick=()=>{try{$("#forgotForm").requestSubmit()}catch(e){$("#forgotForm").dispatchEvent(new Event("submit",{cancelable:true}))}};
function faAuthLinkError(){try{const h=new URLSearchParams((location.hash||"").replace(/^#/,"")),q=new URLSearchParams(location.search);const code=h.get("error_code")||q.get("error_code"),d=h.get("error_description")||q.get("error_description");if(!code&&!d)return false;
 show("auth");showForgot();$("#forgotMsg").textContent=/expired|invalid/i.test((code||"")+" "+(d||""))?"That reset link has expired or was already used. Enter your email to get a new one.":"That link didn't work ("+(d||code)+"). Enter your email to get a new one.";
 history.replaceState({},"",location.pathname);return true}catch(e){return false}}
$("#resetForm").onsubmit=async e=>{e.preventDefault();const a=$("#newPw").value,b=$("#newPw2").value,m=$("#resetMsg");
 if(a.length<6){m.textContent="Use at least 6 characters.";return}if(a!==b){m.textContent="The two passwords do not match.";return}
 m.textContent="Saving…";
 try{me=await DB.updatePassword(a);m.textContent="Password updated ✓ You are signed in.";try{if(me&&me.email&&window.PasswordCredential&&navigator.credentials)navigator.credentials.store(new PasswordCredential({id:me.email,password:a,name:me.email})).catch(()=>{})}catch(x){}
  try{const u=new URL(location.href);u.searchParams.delete("reset");history.replaceState({},"",u.pathname+u.search+u.hash.replace(/access_token=[^&]+/g,""))}catch(e){}
  hdr();await refresh();msgInit();setTimeout(()=>show("profile"),600)}catch(err){m.textContent=err.message||"Could not update password."}};
$("#authForm").onsubmit=async e=>{e.preventDefault();const em=$("#email").value.trim().toLowerCase(),pw=$("#pw").value,m=$("#authMsg");if(signUpMode&&!$("#agree").checked){m.textContent="Please confirm you are 18+ and accept the Terms and Privacy Policy.";return}m.textContent="…";
 try{me=signUpMode?await DB.signUp(em,pw,{news_optin:!!$("#newsOpt").checked}):await DB.signIn(em,pw);rememberEmail(em);try{if(window.PasswordCredential&&navigator.credentials)navigator.credentials.store(new PasswordCredential({id:em,password:pw,name:em})).catch(()=>{})}catch(x){}m.textContent="";hdr();refresh();msgInit();const next=pendingChat,nb=pendingBreath,nw=pendingWa;pendingChat=null;pendingBreath=null;pendingWa=null;if(nw){backToPract(nw)}else if(nb){show("learn");if(nb!=="lab")setTimeout(()=>{try{FasciBreath.openIntro(nb)}catch(x){}},200)}else if(next){show("inbox");openChat(next)}else show("profile")}catch(err){m.textContent=err.message}};

// helpers
function dist1(p,from){const R=6371,r=x=>x*Math.PI/180,dl=r(p.lat-from[0]),dg=r(p.lng-from[1]);const a=Math.sin(dl/2)**2+Math.cos(r(from[0]))*Math.cos(r(p.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function dist(p,from=here){if(!from)return null;const ds=pins(p).map(l=>dist1(l,from));return ds.length?Math.min(...ds):null}
const pins=p=>(p.locations&&p.locations.length?p.locations:[p]).filter(l=>l.lat!=null);
const RG_KEY="fa_rgeo1";let rgCache={};try{rgCache=JSON.parse(localStorage.getItem(RG_KEY)||"{}")}catch(e){}const rgBusy=new Set();
function revPlace(l){const k=(+l.lat).toFixed(3)+","+(+l.lng).toFixed(3);if(rgCache[k]!=null)return rgCache[k];if(rgBusy.has(k)||rgBusy.size>4)return"";rgBusy.add(k);
 fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&accept-language=en&email=hello%40fasciapp.app&lat=${l.lat}&lon=${l.lng}`).then(r=>r.json()).then(j=>{const ad=(j&&j.address)||{};rgCache[k]=ad.village||ad.town||ad.city||ad.municipality||ad.suburb||ad.county||"";try{localStorage.setItem(RG_KEY,JSON.stringify(rgCache))}catch(e){};rgBusy.delete(k);if(rgCache[k])try{renderList()}catch(e){}}).catch(()=>rgBusy.delete(k));return""}
const isOnline=l=>/\bonline\b/i.test([l.city,l.address,l.label].join(" "));
const locTxt=l=>{if(isOnline(l))return"🌐 Online";const c=(typeof countryOfLoc==="function"?countryOfLoc(l):l.country)||"";const co=c==="Other"?"":c;
 let place=String(l.city||"").trim()||String(l.address||"").trim();if(!place&&l.lat!=null&&l.lng!=null)place=revPlace(l);
 const out=[],seen=new Set();[l.label,...String(place).split(",").map(s=>s.trim()),co].forEach(s=>{s=String(s||"").trim();const f=fold(s);if(s&&!seen.has(f)){seen.add(f);out.push(s)}});return"📍 "+out.join(", ")};
const locLine=p=>{const ls=(p.locations&&p.locations.length?p.locations:[p]).map(locTxt).filter(t=>t!=="📍 ");const u=[...new Set(ls)];return u.map(t=>`<span class="loc1">${esc(t)}</span>`).join(" · ")};
function fold(s){try{return String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ł/g,"l").replace(/[øœ]/g,"o").replace(/ß/g,"ss").replace(/æ/g,"ae").replace(/đ/g,"d").replace(/ı/g,"i")}catch(e){return String(s||"").toLowerCase()}}
function placeHit(p,q){if(!q)return true;{const cq=fold(window.canonCountry?canonCountry(q):q);if(cq!==q&&cq)q=cq}const locs=(p.locations&&p.locations.length)?p.locations:[p];
 const {cities,countries}=placeOptions();
 const exactCity=cities.find(c=>fold(`${c.city}, ${c.country}`)===q);
 if(exactCity)return locs.some(l=>fold(faCity(l.city))===fold(exactCity.city)&&fold(l.country)===fold(exactCity.country));
 const exactCo=countries.find(c=>fold(c.country)===q);
 if(exactCo)return locs.some(l=>fold(l.country)===fold(exactCo.country));
 return locs.some(l=>fold([l.city,l.country,l.address].filter(Boolean).join(" ")).includes(q))}
function placeQ(){const el=$("#qPlace");return fold(el?el.value.trim():"")}
function filtered(){const f=($("#listFilter")&&$("#listFilter").value)||"";const q=placeQ();
 const nf=s=>fold(s).replace(/ł/g,"l").replace(/ø/g,"o").replace(/ß/g,"ss").replace(/đ/g,"d"),nq=nf((($("#qName")||{}).value||"").trim());return all().filter(p=>pins(p).length&&(!f||(p.mods||[]).includes(f))&&placeOk(p)&&(!nq||nf((p.name||"")+" "+(p.practice_name||"")).includes(nq)))}
function initials(n){return String(n||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase()}
function av(p,cls=""){return p.photo?`<img class="av ${cls}" src="${esc(p.photo)}" alt="">`:`<span class="av ${cls}">${esc(initials(p.name))}</span>`}
function azKey(p){const c=x=>String(x||"").replace(/^[^\p{L}]+/u,"").trim();return c(p.name)||c(p.practice_name)||"\uFFFF"}
function practiceTitle(p){return String(p.practice_name||"").trim()||String(p.name||"").trim()||"Practitioner"}
function cardHead(p){const pn=String(p.practice_name||"").trim();return pn?`<b>${esc(pn)}</b><br><span class="who">${esc(p.name||"")}</span>`:`<b>${esc(p.name||"")}</b>`}
// Instagram: accept @handle, handle or URL -> handle / https://instagram.com/<handle>
function igHandle(v){v=String(v||"").trim();if(!v)return"";v=v.replace(/^https?:\/\//i,"").replace(/^(www\.)?(instagram\.com|instagr\.am)\//i,"").replace(/^@/,"");v=v.split(/[/?#\s]/)[0];return /^[A-Za-z0-9._]{1,30}$/.test(v)?v:""}
function igUrl(v){const h=igHandle(v);return h?"https://instagram.com/"+h:""}
function link(u){if(!u)return"";const h=/^https?:\/\//.test(u)?u:"https://"+u;return `<a href="${esc(h)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,""))}</a>`}
function card(p){const pills=(p.mods||[]).map(m=>`<span class="pill">${esc(m)}</span>`).join("");
 const dg=String(p.phone||"").replace(/\D/g,"");
 const msgIc=`<span class="msgIc" aria-hidden="true"><svg class="msgRing" viewBox="0 0 24 24" width="16" height="16"><circle cx="20" cy="12" r="1.1" fill="currentColor"/><circle cx="17.7" cy="17.7" r="1.1" fill="currentColor"/><circle cx="12" cy="20" r="1.1" fill="currentColor"/><circle cx="6.3" cy="17.7" r="1.1" fill="currentColor"/><circle cx="4" cy="12" r="1.1" fill="currentColor"/><circle cx="6.3" cy="6.3" r="1.1" fill="currentColor"/><circle cx="12" cy="4" r="1.1" fill="currentColor"/><circle cx="17.7" cy="6.3" r="1.1" fill="currentColor"/></svg><svg class="msgBub" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H12l-3.2 2.8V17H4.5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"/></svg></span>`;
 const canMsg=me?MSG_ON&&MSG_OK&&!!(p.user_id&&p.user_id!==me.user_id):MSG_ON&&!!p.user_id;
 const msgBtn=canMsg?`<button type="button" class="cb msg" data-msg="${esc(p.user_id)}" title="Send a message in FasciApp" aria-label="Send a message in FasciApp">${msgIc} App message</button>`:"";
 // Logged-out visitors: WhatsApp is a login prompt; no number in the DOM
 const wa=!me?(p.whatsapp?`<button type="button" class="cb wa" data-gate="wa">${WA} WhatsApp</button>`:""):p.phone&&p.whatsapp&&dg?`<a class="cb wa" href="https://wa.me/${dg}" target="_blank" rel="noopener">${WA} WhatsApp</a>`:"";
 const mail=!me?(p.has_email||p.email?`<button type="button" class="cb mail" data-gate="mail">✉️ Email</button>`:""):p.email?`<a class="cb mail" href="mailto:${esc(p.email)}">✉️ Email</a>`:"";
 const phone=me&&p.phone?`<br><a class="tel" href="tel:${esc(p.phone)}">${esc(p.phone)}</a>`:"";
 const igH=faIg(p),igB=!me&&igH?`<button type="button" class="cb ig" data-gate="ig"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg> Instagram</button>`:"";
 const cbs=(msgBtn||wa||mail||igB)?`<div class="cbs cbsRow">${msgBtn}${wa}${mail}${igB}</div>`:"";
 const c=p.consent?phone+(p.website&&faWebOk(p.website)?`<br>🌐 ${link(p.website)}`:"")+(p.website2&&faWebOk(p.website2)?`<br>🌐 ${link(p.website2)}`:"")+(me&&faIg(p)?`<br><a class="igl" href="https://instagram.com/${esc(faIg(p))}" target="_blank" rel="noopener" aria-label="Instagram @${esc(faIg(p))}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg> @${esc(faIg(p))}</a>`:"")+cbs:"<br><i>Not public yet</i>";
  return `<div class="row"${p.id?` data-pid="${esc(p.id)}"`:""}>${av(p)}<div>${cardHead(p)}<br>${pills}<br><span class="locs">${locLine(p)}</span>${c}${p.bio?`<br><small>${esc(p.bio)}</small>`:""}</div></div>`}
function pinModsHtml(p){const mods=(p.mods||[]).map(m=>String(m||"").trim()).filter(Boolean);if(!mods.length)return"";
 const show=mods.slice(0,2),extra=mods.length-2;
 const chips=show.map(m=>`<i>${esc(m)}</i>`).join('<span class="dot">·</span>');
 const more=extra>0?`<span class="dot">·</span><i class="more">+${extra}</i>`:"";
 return `<span class="pinmods">${chips}${more}</span>`}
function spiderfy(entries){const TH=0.0009,used=new Set(),placed=entries.map(e=>({p:e.p,l:e.l,lat:e.l.lat,lng:e.l.lng,side:"right"}));
 for(let i=0;i<entries.length;i++){if(used.has(i))continue;const group=[i];used.add(i);
  for(let j=i+1;j<entries.length;j++){if(used.has(j))continue;
   const a=entries[i].l,b=entries[j].l;if(Math.abs(a.lat-b.lat)<TH&&Math.abs(a.lng-b.lng)<TH){group.push(j);used.add(j)}}
  if(group.length===1)continue;
  const n=group.length,cx=group.reduce((s,ix)=>s+entries[ix].l.lat,0)/n,cy=group.reduce((s,ix)=>s+entries[ix].l.lng,0)/n;
  const r=0.0011+Math.max(0,n-2)*0.00025,cos=Math.cos(cx*Math.PI/180)||1;
  group.forEach((ix,k)=>{const ang=-Math.PI/2+(2*Math.PI*k)/n;placed[ix].lat=cx+r*Math.cos(ang);placed[ix].lng=cy+(r*Math.sin(ang))/cos;placed[ix].side=Math.sin(ang)>=0?"right":"left"})}
 // Near (but not clustered) neighbours: alternate label side
 const order=[...placed.keys()].sort((a,b)=>placed[a].lng-placed[b].lng||placed[a].lat-placed[b].lat);
 for(let oi=1;oi<order.length;oi++){const cur=placed[order[oi]],prev=placed[order[oi-1]];
  if(Math.abs(cur.lat-prev.lat)<.55&&Math.abs(cur.lng-prev.lng)<.55&&cur.side===prev.side)cur.side=prev.side==="right"?"left":"right"}
 return placed}
function labelsOn(){return!!map&&map.getZoom()>=labelZoom}
function pinIcon(p,side,loc,withLabel){if(withLabel==null)withLabel=labelsOn();
  if(!withLabel){return L.divIcon({className:"avm",html:`<div class="pin bare">${av(p)}</div>`,iconSize:[44,44],iconAnchor:[22,22]})}
 const title=practiceTitle(p),mods=pinModsHtml(p);
 const html=`<div class="pin ${side==="left"?"left":""}">${av(p)}<span class="pinlab"><span class="pintitle">${esc(title)}</span>${mods}</span></div>`;
 return L.divIcon({className:"avm",html,iconSize:[188,78],iconAnchor:side==="left"?[166,39]:[22,39]})}

// map
function clusterIcon(cluster){const n=cluster.getChildCount(),size=n<8?40:n<20?48:56;
 return L.divIcon({html:`<div class="clbub" style="--s:${size}px"><b>${n}</b></div>`,className:"clicon",iconSize:[size,size],iconAnchor:[size/2,size/2]})}
// Lightweight pixel-grid clustering (replaces leaflet.markercluster).
const LiteCluster=L.LayerGroup.extend({initialize(o){L.LayerGroup.prototype.initialize.call(this);this.o=o||{};this.src=[];this.shown=L.layerGroup()},
 onAdd(m){this._m=m;this.shown.addTo(m);m.on("zoomend",this._draw,this);this._draw()},
 onRemove(m){m.off("zoomend",this._draw,this);this.shown.remove()},
 clearLayers(){this.src=[];this.shown.clearLayers();return this},
 addLayers(ms){this.src=this.src.concat(ms);this._draw();return this},
 addLayer(m){return this.addLayers([m])},
 _draw(){const m=this._m;if(!m)return;this.shown.clearLayers();const z=m.getZoom(),R=this.o.radius||48;
  if(z>=(this.o.off||15)){this.src.forEach(x=>this.shown.addLayer(x));return}
  const groups=[];this.src.forEach(x=>{const pt=m.project(x.getLatLng(),z);let g=null;
   for(const c of groups){if(Math.abs(c.x-pt.x)<R&&Math.abs(c.y-pt.y)<R){g=c;break}}
   if(g){g.k.push(x);g.x=(g.x*(g.k.length-1)+pt.x)/g.k.length;g.y=(g.y*(g.k.length-1)+pt.y)/g.k.length}else groups.push({x:pt.x,y:pt.y,k:[x]})});
  groups.forEach(g=>{if(g.k.length===1){this.shown.addLayer(g.k[0]);return}
   const n=g.k.length,size=n<8?40:n<20?48:56,ll=m.unproject(L.point(g.x,g.y),z);
   const c=L.marker(ll,{icon:L.divIcon({html:`<div class="clbub" style="--s:${size}px"><b>${n}</b></div>`,className:"clicon",iconSize:[size,size],iconAnchor:[size/2,size/2]}),zIndexOffset:1000});
   c.on("click",()=>{const b=L.latLngBounds(g.k.map(x=>x.getLatLng()));let need;try{need=m.getBoundsZoom(b,false,L.point(48,48))}catch(e){need=z}
    if(need<=z+0.01||b.getNorthEast().equals(b.getSouthWest())){const u=new Map();g.k.forEach(x=>{const d=x.options.fa;if(d&&d.p)u.set(d.p.id||d.p.user_id||d.p.name,d.p)});if(u.size)openClusterSheet([...u.values()])}
    else m.fitBounds(b,{padding:[48,48],maxZoom:Math.min(16,need)})});
   this.shown.addLayer(c)})}});
function initMap(){if(map)return renderMarkers();map=L.map("leaf",{zoomControl:true,attributionControl:false}).setView([50,18],4);
 const att='Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors';
 L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",{attribution:att,maxZoom:16,className:"base"}).addTo(map);
 L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,className:"labels"}).addTo(map);
 const Info=L.Control.extend({options:{position:"bottomright"},onAdd(){const d=L.DomUtil.create("div","infoc");d.innerHTML=`<button title="Map credits" aria-label="Map credits">i</button><span hidden>${att} · <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a></span>`;
 L.DomEvent.disableClickPropagation(d);d.firstChild.onclick=()=>{d.lastChild.hidden=!d.lastChild.hidden};return d}});new Info().addTo(map);
 threads=L.layerGroup().addTo(map);
 layer=new LiteCluster({radius:48,off:15});
 layer.addTo(map);window.map=map;window.layer=layer;
 map.on("zoomend",()=>{const on=labelsOn();if(on!==lastLabels){lastLabels=on;renderMarkers()}});
 renderMarkers()}
function onClusterClick(e){if(!map||!e.layer)return;const cluster=e.layer,bounds=cluster.getBounds();
 let needZ;try{needZ=map.getBoundsZoom(bounds,false,L.point(48,48))}catch(err){needZ=map.getZoom()}
 // At (or beyond) the zoom that would separate them → show list sheet
 if(needZ<=map.getZoom()+0.01){const kids=cluster.getAllChildMarkers()||[];const uniq=new Map();
  kids.forEach(m=>{const d=m.options&&m.options.fa;if(d&&d.p)uniq.set(d.p.id||d.p.user_id||d.p.name,d.p)});
  if(uniq.size){openClusterSheet([...uniq.values()]);}}}
function openClusterSheet(list){const sheet=$("#areaSheet"),back=$("#sheetBackdrop"),box=$("#sheetList");
 if(!sheet)return;list=list.slice().sort(faHLCmp);$("#sheetSub").textContent=list.length+" practitioner"+(list.length>1?"s":"");
 box.innerHTML=list.map(p=>`<div class="item sheetItem" data-id="${esc(p.id||p.user_id||"")}">${card(p)}</div>`).join("");
 sheet.hidden=false;back.hidden=false;
 $$("#sheetList .sheetItem").forEach(el=>el.onclick=()=>{const id=el.dataset.id;const p=list.find(x=>(x.id||x.user_id)===id)||list[0];closeClusterSheet();if(p&&map){const loc=pins(p)[0];if(loc)map.setView([loc.lat,loc.lng],14);}})}
function closeClusterSheet(){const s=$("#areaSheet"),b=$("#sheetBackdrop");if(s)s.hidden=true;if(b)b.hidden=true}
document.addEventListener("click",e=>{if(e.target&&(e.target.id==="sheetX"||e.target.id==="sheetBackdrop"))closeClusterSheet()});
const CITY_CC={tallinn:"estonia",warsaw:"poland",warszawa:"poland",krakow:"poland","kraków":"poland",kielce:"poland",berlin:"germany",lesvos:"greece","lesvos island":"greece",mytilene:"greece",helsinki:"finland",riga:"latvia",vilnius:"lithuania",stockholm:"sweden",oslo:"norway",copenhagen:"denmark",athens:"greece",thessaloniki:"greece"};
const CC_ALIAS={usa:"united states",us:"united states","u.s.":"united states","u.s.a.":"united states",uk:"united kingdom","great britain":"united kingdom",england:"united kingdom",czechia:"czech republic",holland:"netherlands","ελλάς":"greece","ελλάδα":"greece"};
function normCountry(c){c=String((window.canonCountry?canonCountry(c):c)||"").trim().toLowerCase();if(!c)return"";return CC_ALIAS[c]||c}
function guessCountry(lat,lng){if(lat==null||lng==null)return"";
 if(lat>57.5&&lat<60.5&&lng>21&&lng<29)return"estonia";
 if(lat>38.8&&lat<41.8&&lng>19&&lng<29.5)return"greece";
 if(lat>49&&lat<55&&lng>14&&lng<25)return"poland";
 if(lat>47&&lat<55.5&&lng>5&&lng<16)return"germany";
 if(lat>59.5&&lat<70.5&&lng>10&&lng<32)return"finland";
 return""}
function countriesOf(p){const set=new Set();const locs=(p.locations&&p.locations.length)?p.locations:[{country:p.country,city:p.city,lat:p.lat,lng:p.lng}];
 locs.forEach(l=>{let c=normCountry(l.country);if(!c)c=normCountry(CITY_CC[(l.city||"").trim().toLowerCase()]);
  if(!c)c=guessCountry(l.lat!=null?+l.lat:null,l.lng!=null?+l.lng:null);if(c)set.add(c)});return set}
function count(){faLiveCount();if(!faFresh){$("#count").innerHTML="&nbsp;";return}const mc=mapCountry();if(mc){const n=mapPeople().length;$("#count").innerHTML=`<b>${n}</b> practitioner${n===1?"":"s"} in <b>${esc(mc)}</b>`;return}const a=all().filter(p=>pins(p).length),c=new Set();a.forEach(p=>countriesOf(p).forEach(x=>c.add(x)));
 $("#count").innerHTML=a.length?`<b>${a.length}</b> practitioner${a.length>1?"s":""} in <b>${c.size}</b> countr${c.size>1?"ies":"y"} joined the network`+(()=>{const k=a.reduce((t,p)=>t+pins(p).length,0);return k>a.length?`<br><small>${k} map pins · some practitioners work in several places</small>`:""})():"Be the first practitioner on the map ✨"}
// Europe-wide default on first open / All locations (no densest-cluster zoom, no geolocation).
const EUROPE=[[35,-11],[62,32]];
function fitEurope(){if(!map)return;try{map.fitBounds(EUROPE,{padding:[28,28],animate:false,maxZoom:5})}catch(e){map.setView([50,10],4,{animate:false})}}
function fitPins(force){if(!map)return;const pts=[];mapPeople().forEach(p=>mpins(p).forEach(l=>{if(l.lat!=null&&l.lng!=null)pts.push([+l.lat,+l.lng])}));
 if(!force&&didFit)return;
 try{if(!mapCountry()){fitEurope()}
 else if(!pts.length){fitEurope()}
 else if(pts.length===1)map.setView(pts[0],10,{animate:false});
 else map.fitBounds(L.latLngBounds(pts),{padding:[56,56],maxZoom:10,animate:false});
 didFit=true;lastLabels=labelsOn();setTimeout(()=>map&&map.invalidateSize(),60)}catch(e){console.warn(e)}}
function labelSides(entries){const sides=new Map();const order=entries.map((e,i)=>i).sort((a,b)=>entries[a].lng-entries[b].lng||entries[a].lat-entries[b].lat);
 order.forEach((ix,oi)=>{let side="right";if(oi){const cur=entries[ix],prev=entries[order[oi-1]];
  if(Math.abs(cur.lat-prev.lat)<.55&&Math.abs(cur.lng-prev.lng)<.55)side=sides.get(order[oi-1])==="right"?"left":"right"}
  sides.set(ix,side)});return sides}
function renderMarkers(){count();if(!layer)return;layer.clearLayers();if(threads)threads.clearLayers();const ps=mapPeople();
 const entries=[];ps.forEach(p=>mpins(p).forEach(l=>{if(l.lat!=null&&l.lng!=null)entries.push({p,l,lat:+l.lat,lng:+l.lng})}));
 const sides=labelSides(entries),withLabel=labelsOn();lastLabels=withLabel;
 const ms=entries.map((e,i)=>{const side=sides.get(i)||"right";
  const m=L.marker([e.lat,e.lng],{icon:pinIcon(e.p,side,e.l,withLabel),fa:{p:e.p,l:e.l}});
  m.bindPopup(()=>card(e.p));return m});
 if(layer.addLayers)layer.addLayers(ms);else ms.forEach(m=>m.addTo(layer));
 if(here)L.circleMarker(here,{radius:7,color:"#fff",weight:3,fillColor:"#2a9d96",fillOpacity:1}).bindPopup("You are here").addTo(threads||layer);
 if(ps.length&&!didFit)fitPins(true)}
$("#filter")&&($("#filter").onchange=()=>{renderMarkers();fitPins(true)});
$("#listFilter")&&($("#listFilter").onchange=()=>syncModFilter("listFilter"));
$("#qPlace")&&($("#qPlace").onchange=()=>{renderList();renderMarkers()});$("#qName")&&(()=>{const n=$("#qName"),B=document.body,vv=window.visualViewport;let t;
 const top=s=>{try{const h=document.querySelector("#list h2");(h||n).scrollIntoView({block:"start",behavior:s?"smooth":"auto"})}catch(e){}};
 n.oninput=()=>{renderList();renderMarkers();if(B.classList.contains("kbd"))requestAnimationFrame(()=>top(0))};
 n.addEventListener("focus",()=>{clearTimeout(t);fit();B.classList.add("kbd");setTimeout(()=>top(1),250)});
 n.addEventListener("blur",()=>{t=setTimeout(()=>B.classList.remove("kbd"),120)});
 const fit=()=>{if(vv)B.style.setProperty("--kbd-h",Math.round(vv.height)+"px")};if(vv)vv.addEventListener("resize",()=>{if(document.activeElement===n){B.classList.add("kbd");fit()}else if(vv.height>innerHeight*.9)B.classList.remove("kbd")})})();
document.addEventListener("click",e=>{const c=$("#placeCombo");if(c&&!c.contains(e.target))closePlaceMenu()});
$("#listClear")&&($("#listClear").onclick=()=>{if(nearScope){nearScope=null;const nb=$("#nearAll");if(nb)nb.hidden=true}const q=$("#qPlace");if(q)q.value="";{const nm=$("#qName");if(nm)nm.value=""};{const el=$("#listFilter");if(el)el.value=""};closePlaceMenu();renderMarkers();renderList()});
$("#listToMap")&&($("#listToMap").onclick=()=>{syncModFilter("listFilter");show("map");didFit=false;setTimeout(()=>{fitPins(true);map&&map.invalidateSize()},100)});
let geoErr=0;function geoOnce(){return new Promise(resolve=>{geoErr=0;if(!navigator.geolocation||!window.isSecureContext)return resolve(null);
  navigator.geolocation.getCurrentPosition(pos=>resolve([pos.coords.latitude,pos.coords.longitude,pos.coords.accuracy]),e=>{geoErr=(e&&e.code)||2;resolve(null)},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})})}
async function ipLoc(){for(const url of["https://ipapi.co/json/","https://get.geojs.io/v1/ip/geo.json"]){try{const ctrl=typeof AbortController!=="undefined"?new AbortController():null;const t=ctrl?setTimeout(()=>ctrl.abort(),4500):null;const r=await fetch(url,ctrl?{signal:ctrl.signal}:{});if(t)clearTimeout(t);if(!r.ok)continue;const j=await r.json();const lat=+(j.latitude??j.lat),lng=+(j.longitude??j.lng??j.lon);if(Number.isFinite(lat)&&Number.isFinite(lng))return[lat,lng]}catch(e){}}return null}
function openNearestCard(p,loc){if(!map||!p||!loc)return;try{L.popup({maxWidth:320,className:"faPop"}).setLatLng([+loc.lat,+loc.lng]).setContent(card(p)).openOn(map)}catch(e){console.warn(e)}}
let nearScope=null;
async function revCountry(lat,lng){try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=3&accept-language=en&lat=${lat}&lon=${lng}`);const j=await r.json();const c=j&&j.address&&j.address.country;return c?(window.canonCountry?canonCountry(c):c):""}catch(e){return ""}}
// Rough continent boxes (lat/lng), enough for a fallback scope
function region(la,ln){la=+la;ln=+ln;if(la>=34&&la<=72&&ln>=-25&&ln<=45)return"Europe";if(la>=5&&la<=84&&ln>=-170&&ln<=-50)return"North America";if(la<5&&la>=-57&&ln>=-92&&ln<=-30)return"South America";if(la>=-36&&la<34&&ln>=-20&&ln<=52)return"Africa";if(la<0&&la>=-50&&ln>=110&&ln<=180)return"Oceania";if(la>=-11&&la<=82&&ln>25&&ln<=180)return"Asia";return""}
async function applyNear(lat,lng){here=[+lat,+lng];didFit=true;if(!map)initMap();show("map");
 const ps=filtered().map(p=>({p,d:dist(p)})).filter(x=>x.d!=null).sort((a,b)=>a.d-b.d);
 const locs=[];ps.forEach(({p})=>pins(p).forEach(l=>locs.push({p,l,d:dist1(l,here)})));locs.sort((a,b)=>a.d-b.d);
 const near=locs[0];let sc=null;
 if(near&&near.d<=30&&near.l.city){const ci=fold(near.l.city),co=fold(near.l.country||"");sc={label:`near ${near.l.city}`,t:l=>fold(l.city||"")===ci&&fold(l.country||"")===co}}
 if(!sc){const c=await revCountry(lat,lng);const fc=fold(c);if(fc&&locs.some(x=>fold(x.l.country||"")===fc))sc={label:`in ${c}`,t:l=>fold(l.country||"")===fc}}
 if(!sc){const rg=region(lat,lng);if(rg&&locs.some(x=>region(x.l.lat,x.l.lng)===rg))sc={label:`in ${rg}`,t:l=>region(l.lat,l.lng)===rg}}
 if(!sc&&locs.length){const ids=new Set(ps.slice(0,8).map(x=>x.p));sc={label:"nearest to you",t:null,ids}}
 nearScope=sc?{label:sc.label,ok:p=>sc.t?pins(p).some(sc.t):sc.ids.has(p)}:null;
 renderMarkers();renderList();const nb=$("#nearAll");if(nb)nb.hidden=!nearScope;
 if(!nearScope){map.setView(here,7,{animate:false});showToast("Location set");return}
 const pts=[];ps.filter(x=>nearScope.ok(x.p)).forEach(({p})=>pins(p).forEach(l=>{if(!sc.t||sc.t(l))pts.push([+l.lat,+l.lng])}));if(!sc.t)pts.push(here);
 try{pts.length===1?map.setView(pts[0],12,{animate:false}):map.fitBounds(L.latLngBounds(pts),{padding:[56,56],maxZoom:13,animate:false})}catch(e){map.setView(here,9,{animate:false})}
 const n=ps.filter(x=>nearScope.ok(x.p)).length;showToast(`${n} practitioner${n===1?"":"s"} ${nearScope.label}`)}
function clearNear(){nearScope=null;const nb=$("#nearAll");if(nb)nb.hidden=true;renderMarkers();renderList();fitPins(true)}
async function nearMe(){const btn=$("#near");if(btn)btn.disabled=true;try{
  showToast("Finding your location…");
  // Device GPS only. Never guess from IP (IP location can be hundreds of km off, e.g. a mobile network exit in another country).
  const pos=await geoOnce();
  if(pos){const acc=+pos[2]||0;await applyNear(pos[0],pos[1]);if(acc>5000)setTimeout(()=>showToast(`Approximate location (±${Math.round(acc/1000)} km).`),1800);return}
  // No typing, ever: one short toast, map stays as it was
  showToast(geoErr===1?"Turn on location for this site to use Near me":"Couldn’t get your location. Try again in a moment",3000)}
 catch(e){showToast("Turn on location for this site to use Near me",3000)}
 finally{if(btn)btn.disabled=false}}
$("#near").onclick=()=>nearMe();$("#nearAll")&&($("#nearAll").onclick=()=>clearNear());
const isAdmin=()=>!!(me&&String(me.email||"").toLowerCase()==="nisarga8@gmail.com");
// ===== Newly joined strip (List): latest published practitioners with a photo =====
let njKey="";const flagOf=c=>{try{const M=window.FA_CC||{},k=Object.keys(M).find(x=>M[x]===c);return k?String.fromCodePoint(...[...k].map(ch=>127397+ch.charCodeAt(0))):""}catch(e){return""}};
// If country is "Other"/empty, find a real country name inside the location text (city/address/label).
const countryOfLoc=l=>{const c=String(l&&l.country||"").trim();if(c&&c!=="Other")return c;const t=" "+fold([l&&l.city,l&&l.address,l&&l.label].filter(Boolean).join(" "))+" ";if(!t.trim())return"";let best="";for(const n of Object.values(window.FA_CC||{})){const f=fold(n);if(f.length>3&&t.includes(" "+f)&&f.length>best.length)best=n}return best};
function renderNewJ(){const box=$("#newJ");if(!box)return;const ps=all().filter(p=>p.photo&&p.consent!==false&&p.created_at).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,21);
 const key=ps.map(p=>p.id).join();if(key===njKey)return;njKey=key;box.hidden=ps.length<3;if(box.hidden)return;
 box.innerHTML=`<div class="njH"><b>New faces</b><small>Swipe →</small></div><div class="njRow">${ps.map(p=>{const locs=(p.locations&&p.locations.length?p.locations:[p]);const co=locs.map(countryOfLoc).find(Boolean)||"";const fn=String(p.name||"").trim().split(/\s+/)[0]||"";
  return `<button type="button" class="nj" data-nj="${esc(p.id)}" aria-label="${esc(practiceTitle(p))}${co?", "+esc(co):""}"><span class="njAv"><img src="${esc(p.photo)}" alt="" loading="lazy"><i>${esc(fn)}</i></span><small>${flagOf(co)} ${esc(co)}</small></button>`}).join("")}</div>`}
function openNJ(id){const p=all().find(x=>x.id===id);if(!p)return;try{window.FA_ev&&FA_ev("pract_view",{pid:p.id,source:"newly_joined",props:{from:"newly_joined"}})}catch(e){}
 let s=$("#njSheet");if(!s){s=document.createElement("div");s.id="njSheet";s.className="njSheet";document.body.appendChild(s);s.addEventListener("click",e=>{if(e.target===s||e.target.closest(".njX"))s.hidden=true})}
 s.innerHTML=`<div class="njCard card"><button type="button" class="njX ghost sm" aria-label="Close">✕</button>${card(p)}</div>`;s.hidden=false}
document.addEventListener("click",e=>{const b=e.target.closest("[data-nj]");if(b)openNJ(b.dataset.nj)});
function renderList(){renderNewJ();const ps=filtered().filter(p=>!nearScope||nearScope.ok(p)).map(p=>({p,d:dist(p)}));const adm=false;if(here)ps.sort((a,b)=>a.d-b.d);else ps.sort((a,b)=>azKey(a.p).localeCompare(azKey(b.p),undefined,{sensitivity:"base"}));
 const _pe=$("#qPlace"),n=ps.length,q=(_pe&&_pe.value&&_pe.selectedOptions[0]?_pe.selectedOptions[0].textContent.replace(/\s*\(\d+\)$/,""):""),mod=($("#listFilter")&&$("#listFilter").value)||"";
 const lc=$("#listCount");if(lc)lc.textContent=(n?`${n} practitioner${n===1?"":"s"}`:"No practitioners")+(nearScope?` ${nearScope.label}`:"");
 const clr=$("#listClear");if(clr){clr.hidden=!(nearScope||q||mod||(($("#qName")||{}).value||"").trim());clr.textContent=nearScope?"Show all":"Clear"}
 $("#from").textContent=here?"Sorted by distance from you":"";
 $("#items").innerHTML=ps.map(({p,d})=>`<div class="item">${d!=null?`<span class="d">${Math.round(d)} km</span>`:""}${card(p)}</div>`).join("")||"<p class=muted>No practitioners match your search.</p>"}

// profile
let profEdit=false,wantForm=false;
async function loadProf(){await fillProf();if(!me)return;const p=await DB.mine().catch(()=>null);const has=!!(p&&(p.name||p.address||p.city));const v=$("#profView"),f=$("#profForm");$("#pCancel").hidden=false;if(has)logCard();else $("#logCard").hidden=true;{const h=document.querySelector("#profile h2");if(h)h.textContent=(!has&&!profEdit)?"My profile":"My practitioner profile"}
 if(!has&&!profEdit){v.innerHTML=`<div class="card acct"><b>My account</b><p class="muted">Signed in as ${esc(me.email||"")}</p><label class="consent"><input type="checkbox" id="acctNews"${me.news_optin?" checked":""}> Send me occasional FasciApp news: new breathing practices, free live sessions and videos. Unsubscribe anytime.</label><p id="acctMsg" class="msg"></p></div><button type="button" class="gold big1" id="pListMe">List me as a practitioner</button><button type="button" class="ghost" id="pOut3">Log out</button>`;v.hidden=false;f.hidden=true;
  $("#acctNews").onchange=async e=>{const on=e.target.checked,m=$("#acctMsg");m.textContent="Saving…";try{await DB.setNews(on);me.news_optin=on;m.textContent=on?"Subscribed ✓":"Unsubscribed ✓"}catch(err){e.target.checked=!on;m.textContent="Could not save: "+err.message}};
  $("#pListMe").onclick=()=>{profEdit=true;v.hidden=true;f.hidden=false;document.querySelector("#profile h2").textContent="My practitioner profile";window.scrollTo(0,0)};$("#pOut3").onclick=()=>logout();return}
 if(has&&!profEdit){profViewB(p,v,f);return}
 else{v.hidden=true;f.hidden=false}}
async function fillProf(){waTouched=false;$("#needLogin").hidden=!!me;$("#profForm").hidden=!me;if(!me)return;myMods=[];renderTags();setExtra([]);$("#who").textContent="Signed in as "+me.email;
 const p=await DB.mine().catch(()=>null);const f=$("#profForm");if(!p){if(f.news_optin)f.news_optin.checked=!!me.news_optin;return}["name","practice_name","address","city","country","email","website","website2","bio"].forEach(k=>{if(f[k])f[k].value=p[k]||""});if(f.instagram)f.instagram.value=igHandle(p.instagram)?"@"+igHandle(p.instagram):"";splitPhone(p.phone,p.country);f.whatsapp.checked=!!p.whatsapp;waTouched=true;
 f.label.value=(p.locations?.[0]?.label)||"";setExtra((p.locations||[]).slice(1));f.consent.checked=!!p.consent;if(f.news_optin)f.news_optin.checked=!!p.news_optin;myMods=(p.mods||[]).slice();renderTags();if(p.photo){$("#phPrev").src=p.photo;$("#phPrev").hidden=false}}
const CCEN={Austria:[47.6,14.1],Belgium:[50.6,4.6],Bulgaria:[42.7,25.3],Croatia:[45.1,15.6],Cyprus:[35.0,33.2],Czechia:[49.8,15.5],Denmark:[56.0,9.5],Estonia:[58.7,25.0],Finland:[62.0,25.7],France:[46.6,2.4],Germany:[51.1,10.4],Greece:[39.3,22.0],Hungary:[47.2,19.4],Iceland:[64.9,-18.6],Ireland:[53.2,-8.2],Italy:[42.8,12.6],Latvia:[56.9,24.9],Lithuania:[55.3,23.9],Luxembourg:[49.8,6.1],Malta:[35.9,14.4],Netherlands:[52.2,5.5],Norway:[61.4,8.8],Poland:[52.1,19.4],Portugal:[39.6,-8.0],Romania:[45.9,25.0],Serbia:[44.0,20.9],Slovakia:[48.7,19.7],Slovenia:[46.1,14.8],Spain:[40.2,-3.6],Sweden:[62.0,15.0],Switzerland:[46.8,8.2],Ukraine:[49.0,31.4],"United Kingdom":[54.0,-2.5],Argentina:[-34.6,-64.0],Australia:[-25.7,134.5],Brazil:[-10.8,-52.9],Canada:[56.0,-96.8],Chile:[-33.4,-70.7],China:[35.0,103.8],Colombia:[4.1,-73.1],Egypt:[26.6,30.8],India:[22.9,79.6],Indonesia:[-2.2,117.4],Israel:[31.4,35.0],Japan:[36.5,138.0],Mexico:[23.9,-102.5],Morocco:[31.8,-7.1],"New Zealand":[-41.8,172.8],Philippines:[12.9,121.8],Singapore:[1.35,103.82],"South Africa":[-29.0,25.1],"South Korea":[36.4,127.9],Thailand:[15.1,101.0],Turkey:[39.1,35.2],"United Arab Emirates":[23.9,54.3],"United States":[39.8,-98.6],Vietnam:[16.6,106.3]};
async function geoTry(q){if(!q)return null;
 try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&email=hello%40fasciapp.app&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});if(r.ok){const j=await r.json();if(j[0])return[+j[0].lat,+j[0].lon]}}catch(e){}
 try{const r=await fetch("https://photon.komoot.io/api/?limit=1&lang=en&q="+encodeURIComponent(q));if(r.ok){const j=await r.json();const c=j.features&&j.features[0]&&j.features[0].geometry.coordinates;if(c)return[c[1],c[0]]}}catch(e){}
 return null}
async function geocode(addr,city,country){addr=(addr||"").trim();city=(city||"").trim();const ct=country&&country!=="Other"?country:"";
 const qs=[];const add=q=>{if(q&&!qs.includes(q))qs.push(q)};
 if(addr)add([addr,city,ct].filter(Boolean).join(", "));
 if(city){add([city,ct].filter(Boolean).join(", "));add(city)}
 for(const q of qs){const g=await geoTry(q);if(g)return[g[0],g[1],q===qs[0]&&addr?"address":"city",null]}
 const c=city&&typeof CITY!=="undefined"?CITY[city.toLowerCase()]:null;if(c)return[c[0],c[1],"city",null];
 if(ct&&CCEN[ct])return[CCEN[ct][0],CCEN[ct][1],"country",null];
 if(ct){const g=await geoTry(ct);if(g)return[g[0],g[1],"country",null]}
 return null}
$("#profForm").onsubmit=async e=>{e.preventDefault();const f=e.target,st=$("#status");
 {// Country: pick from the list only (an extra Online location may leave it empty)
  const ok=v=>!!v&&FA_COUNTRY_SET.has(v);if(!ok(f.country.value)){st.textContent="Please pick your country from the list.";f.country.focus();return}
  for(const b of $$("#extraLocs .xloc")){const v=b.querySelector("[data-k=country]").value,txt=[b.querySelector("[data-k=address]").value,b.querySelector("[data-k=city]").value].join(" ");if(!(ok(v)||(!v&&/\bonline\b/i.test(txt))||(!v&&!txt.trim()))){st.textContent="Please pick a country from the list for each location.";b.querySelector("[data-k=country]").focus();return}}}
st.textContent="Locating your address…";
 const old=await DB.mine().catch(()=>null)||{};
 const p={name:f.name.value.trim(),practice_name:(f.practice_name&&f.practice_name.value||"").trim(),address:f.address.value.trim(),city:f.city.value.trim(),phone:e164(f.prefix.value,f.phone.value),whatsapp:f.whatsapp.checked,email:f.email.value.trim(),website:f.website.value.trim(),website2:(f.website2&&f.website2.value||"").trim(),instagram:igUrl(f.instagram&&f.instagram.value),news_optin:!!(f.news_optin&&f.news_optin.checked),bio:f.bio.value.trim(),consent:f.consent.checked,country:f.country.value,mods:myMods.slice(),photo:photoData||old.photo||null};
 p.news_optin_at=p.news_optin?(old.news_optin&&old.news_optin_at?old.news_optin_at:new Date().toISOString()):null;p.news_optout_at=!p.news_optin&&old.news_optin?new Date().toISOString():(!p.news_optin?old.news_optout_at||null:null);
 let g=await geocode(p.address,p.city,p.country);let soft="";if(!g){g=[54.5,15.3,"none"];soft=" We couldn’t find the exact place, so your pin is approximate. You can edit the city any time."}else if(g[2]==="country"&&p.city)soft=" We couldn’t find “"+p.city+"”, so your pin is at the centre of "+p.country+".";
 Object.assign(p,{lat:g[0],lng:g[1]});p.locations=[{label:f.label.value.trim(),address:p.address,city:p.city,country:p.country,lat:g[0],lng:g[1]}];
 for(const b of $$("#extraLocs .xloc")){const l={label:b.querySelector("[data-k=label]").value.trim(),address:b.querySelector("[data-k=address]").value.trim(),city:b.querySelector("[data-k=city]").value.trim(),country:b.querySelector("[data-k=country]").value};
  if(!l.city&&!l.country)continue;st.textContent="Locating "+l.city+"…";await new Promise(r=>setTimeout(r,1100));const gg=await geocode(l.address,l.city,l.country);if(!gg)continue;l.lat=gg[0];l.lng=gg[1];p.locations.push(l)}
 try{await DB.save(p);await refresh();
  const tip=p.consent?"":" Tip: tick “show publicly” so others can find you.";
  st.textContent=`Saved ✓${soft}${tip}`;
  showToast("Saved ✓");
  didFit=true;
  profEdit=false;if(window.faPeDone)faPeDone();await loadProf();try{$("#profile").scrollIntoView({block:"start"})}catch(x){}
 }catch(err){st.textContent="Could not save: "+err.message}};
$("#photo").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),s=256,m=Math.min(im.width,im.height);c.width=c.height=s;
 c.getContext("2d").drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);photoData=c.toDataURL("image/jpeg",.85);$("#phPrev").src=photoData;$("#phPrev").hidden=false};im.src=r.result};r.readAsDataURL(file)};

// start

function showToast(msg,ms){const t=$("#toast");if(!t)return;t.textContent=msg||"Saved ✓";t.hidden=false;requestAnimationFrame(()=>t.classList.add("show"));
 clearTimeout(showToast._t);showToast._t=setTimeout(()=>{t.classList.remove("show");setTimeout(()=>{t.hidden=true},220)},ms||2200)}
function setupSafariChrome(){const ua=navigator.userAgent||"";
 const safari=/Safari/i.test(ua)&&!/Chrome|CriOS|Chromium|FxiOS|EdgiOS|OPR|Android/i.test(ua);
 const standalone=!!(navigator.standalone||window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches);
 if(safari&&!standalone)document.documentElement.classList.add("safari-browser");
 const sync=()=>{if(!window.visualViewport)return;
  const vv=window.visualViewport;const ae=document.activeElement,typing=ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);const gap=typing?Math.min(400,Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop))):0;
  document.documentElement.style.setProperty("--vv-bottom",gap+"px")};
 if(window.visualViewport){visualViewport.addEventListener("resize",sync);visualViewport.addEventListener("scroll",sync);sync()}
 addEventListener("orientationchange",()=>setTimeout(sync,300));
 document.addEventListener("focusout",()=>setTimeout(()=>{sync();if(document.body.classList.contains("in")&&window.scrollY)window.scrollTo(0,0)},120));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync()});addEventListener("pageshow",sync)}
(async()=>{
 setupSafariChrome();
 $("#demoBanner").hidden=DB.mode!=="local";
 fillLastEmail();
 try{await paintFromCache()}catch(e){}
 me=await DB.session().catch(()=>null);hdr();
 await refresh();
 applyDeepLink();
 if(DB.mode==="local"&&window.FASCIAPP_CONFIG&&FASCIAPP_CONFIG.SUPABASE_URL&&window.supabase&&!sessionStorage.getItem("fa_sb_retry")){
  sessionStorage.setItem("fa_sb_retry","1");location.reload();return}
 msgInit();
 // Password recovery: link lands on /app/?reset=1 (Supabase also fires PASSWORD_RECOVERY)
 let recovery=false;
 const wantReset=(()=>{try{return new URLSearchParams(location.search).get("reset")==="1"}catch(e){return false}})();
 if(DB.onAuth)DB.onAuth(async(event,session)=>{
  if(event==="PASSWORD_RECOVERY"){recovery=true;showResetForm();return}
  if(event==="SIGNED_IN"||event==="TOKEN_REFRESHED"||event==="INITIAL_SESSION"){
   me=session?.user?{user_id:session.user.id,email:session.user.email}:(await DB.session().catch(()=>null));hdr();
   if(me&&me.email)rememberEmail(me.email)}
  if(event==="SIGNED_OUT"){me=null;hdr()}
 });
 if(faAuthLinkError()){}else if(wantReset){// give the client a moment to pick up hash tokens from the email link
  setTimeout(async()=>{if(recovery)return;const s=await DB.session().catch(()=>null);if(s){showResetForm();return}
   show("auth");showForgot();$("#forgotMsg").textContent="That reset link has expired or was already used. Enter your email to get a new one."},900)}
})();

// ===== Session log =====
const GOAL=70;let sess=[],editId=null,sessLoaded=false;
function paintLogCard(){const n=sess.length;$("#lcNum").textContent=`${n} / ${GOAL}`;$("#lcFill").style.width=Math.min(100,n/GOAL*100)+"%";$("#lcSub").textContent=n>=GOAL?"✓ complete":`${GOAL-n} sessions to go`;const bl=$("#bLogN");if(bl)bl.textContent=`${n} / ${GOAL} sessions`;const bf=$("#bLogFill");if(bf)bf.style.width=Math.min(100,n/GOAL*100)+"%";try{faJourneyPaint()}catch(e){}}
async function logCard(){$("#logCard").hidden=false;if(!sessLoaded){try{sess=await DB.sessions();sessLoaded=true}catch(e){}}paintLogCard()}
function fmtD(d){if(!d)return"";const [y,m,dd]=d.split("-");return `${dd}.${m}.${y}`}
function resetSF(){const f=$("#sessForm");f.reset();{const n=new Date();f.date.value=new Date(n-n.getTimezoneOffset()*6e4).toISOString().slice(0,10)}editId=null;$("#sfTitle").textContent="Add session";$("#sfBtn").textContent="Add session";$("#sfCancel").hidden=true}
async function loadLog(){$("#logNeed").hidden=!!me;$("#logBox").hidden=!me;if(!me)return;if(!editId)resetSF();try{sess=await DB.sessions()}catch(e){sess=[];$("#sfMsg").textContent="Could not load: "+e.message}renderLog()}
function renderLog(){sessLoaded=true;try{paintLogCard()}catch(e){}const n=sess.length;$("#pNum").textContent=`${n} / ${GOAL} sessions`;$("#pPct").textContent=n>=GOAL?"✓ complete":`${GOAL-n} to go`;$("#pFill").style.width=Math.min(100,n/GOAL*100)+"%";
 $("#pdfBtn").disabled=!n;
 $("#sessList").innerHTML=n?sess.map((s,i)=>`<div class="sess"><span class="sn">${i+1}</span><div class="sb"><b>${esc(s.initials)}</b> · ${fmtD(s.date)}${s.duration?" · "+s.duration+" min":""} · ${esc(s.session_type||"MER")} · ${esc(s.format||"In person")}${s.comment?`<br><small>${esc(s.comment)}</small>`:""}</div>
 <span class="sa"><button class="ghost sm" data-ed="${s.id}" aria-label="Edit">✎</button><button class="ghost sm" data-del="${s.id}" aria-label="Delete">🗑</button></span></div>`).join(""):"<p class='muted center'>No sessions yet. Add your first one above.</p>";
 $$("[data-ed]").forEach(b=>b.onclick=()=>{const s=sess.find(x=>x.id===b.dataset.ed),f=$("#sessForm");editId=s.id;["initials","date","comment"].forEach(k=>f[k].value=s[k]||"");f.duration.value=s.duration||"";f.format.value=s.format||"In person";f.session_type.value=s.session_type||"MER";
  $("#sfTitle").textContent="Edit session";$("#sfBtn").textContent="Save changes";$("#sfCancel").hidden=false;f.scrollIntoView({behavior:"smooth"})});
 $$("[data-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this session?"))return;await DB.deleteSession(b.dataset.del);sess=await DB.sessions();if(editId===b.dataset.del)resetSF();renderLog()})}
$("#sfCancel").onclick=resetSF;
$("#sessForm").onsubmit=async e=>{e.preventDefault();const f=e.target,m=$("#sfMsg");
 const x={id:editId,initials:f.initials.value.trim().toUpperCase().slice(0,4),date:f.date.value,duration:f.duration.value?parseInt(f.duration.value):null,format:(f.format&&f.format.value)||"In person",session_type:(f.session_type&&f.session_type.value)||"MER",comment:f.comment.value.trim()};
 if(!x.initials)return m.textContent="Please add the client initials.";if(!x.duration)return m.textContent="Please add the duration.";if(!x.format)return m.textContent="Please choose In person or Online.";if(!x.session_type)return m.textContent="Please choose MER or BBTRS.";
 try{await DB.saveSession(x);m.textContent=editId?"Saved ✓":"Session added ✓";resetSF();sess=await DB.sessions();renderLog()}catch(err){m.textContent="Could not save: "+err.message}};
async function logoData(){try{const b=await (await fetch("icon-192-v3.png")).blob();return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})}catch(e){return null}}
function loadScript(u){return new Promise((ok,no)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
let pdfLib=null;function loadPdfLib(){if(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API.autoTable)return Promise.resolve();
 return pdfLib=pdfLib||loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js").then(()=>loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js")).catch(e=>{pdfLib=null;throw e})}
async function buildPdf(){try{await loadPdfLib()}catch(e){}if(!window.jspdf){alert("PDF library could not load. Check your internet connection.");return null}
 const prof=await DB.mine().catch(()=>null)||{};
 const fullName=String(prof.name||"").trim()||(me&&me.email)||"Practitioner";
 const email=String((me&&me.email)||prof.email||"").trim();
 const training=(prof.mods||[]).filter(m=>m!=="Other").join(" / ")||"—";
 const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
 const ds=sess.map(s=>s.date).sort(),range=ds.length?`${fmtD(ds[0])} – ${fmtD(ds[ds.length-1])}`:"";
 doc.setFillColor(2,25,30);doc.rect(0,0,W,38,"F");const lg=await logoData();if(lg)doc.addImage(lg,"PNG",12,7,22,22);
 doc.setTextColor(201,158,103);doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("FasciApp",40,14);
 doc.setTextColor(255,255,255);doc.setFont("helvetica","normal");doc.setFontSize(11);doc.text("Session Log",40,21);
 doc.setFontSize(9);doc.setTextColor(230,220,200);doc.text(fullName+(email?"  ·  "+email:""),40,28);
 doc.setFontSize(8);doc.setTextColor(150,200,200);doc.text("Fascia & breath connect us all",40,34);
 doc.setTextColor(2,25,30);doc.setFontSize(11);
 [["Practitioner",fullName],["Email",email||"—"],["Training",training],["Period",range],["Sessions",`${sess.length} / ${GOAL}`]].forEach(([k,v],i)=>{doc.setFont("helvetica","bold");doc.text(k+":",14,48+i*6);doc.setFont("helvetica","normal");doc.text(String(v),44,48+i*6)});
 doc.autoTable({startY:82,head:[["#","Initials","Date","Duration","Type","Format","Comment"]],
  body:sess.map((s,i)=>[i+1,s.initials,fmtD(s.date),s.duration?s.duration+" min":"",s.session_type||"MER",s.format||"In person",s.comment||""]),
  headStyles:{fillColor:[2,25,30],textColor:[201,158,103]},alternateRowStyles:{fillColor:[245,240,233]},styles:{fontSize:8.5,cellPadding:2},
  columnStyles:{0:{cellWidth:9},1:{cellWidth:14},2:{cellWidth:22},3:{cellWidth:18},4:{cellWidth:16},5:{cellWidth:20}},
  didDrawPage:()=>{doc.setFontSize(8);doc.setTextColor(120);doc.text(`FasciApp · ${fullName} · page ${doc.internal.getNumberOfPages()}`,14,H-8)}});
 let y=doc.lastAutoTable.finalY+12;if(y>H-30){doc.addPage();y=30}
 doc.setTextColor(2,25,30);doc.setFontSize(11);doc.setFont("helvetica","bold");doc.text(`Total sessions: ${sess.length}`,14,y);
 const mins=sess.reduce((a,s)=>a+(s.duration||0),0);doc.setFont("helvetica","normal");if(mins)doc.text(`Total time: ${Math.floor(mins/60)} h ${mins%60} min`,14,y+6);
 const fn=`FasciApp_Session_Log_${fullName.replace(/[^\p{L}\p{N}]+/gu,"_").replace(/^_|_$/g,"")||"practitioner"}.pdf`;
 return {doc,name:fullName,email,fn}}
function pdfFile(r){return new File([r.doc.output("blob")],r.fn,{type:"application/pdf"})}
$("#pdfBtn").onclick=async()=>{const r=await buildPdf();if(r)r.doc.save(r.fn)};
// ===== Send by email (share sheet with PDF file, or download + mailto) =====
$("#mailToggle").onclick=async()=>{const box=$("#mailBox");box.hidden=!box.hidden;if(!box.hidden){const prof=await DB.mine().catch(()=>null)||{},f=$("#mailForm");
 const nm=String(prof.name||"").trim()||(me&&me.email)||"";
 f.subject.value=`Session log – ${nm}`;
 if(!f.msg.value)f.msg.value=`Hello,\n\nplease find attached my session log (${sess.length} / ${GOAL} sessions).\n\nWarm regards,\n${nm}`;$("#mailNote").textContent=""}};
$("#mailForm").onsubmit=async e=>{e.preventDefault();const f=e.target,note=$("#mailNote");note.textContent="Preparing PDF…";
 const r=await buildPdf();if(!r){note.textContent="Could not build the PDF.";return}
 const to=f.to.value.trim(),subject=f.subject.value.trim()||`Session log – ${r.name}`;
 const fromLine=`From: ${r.name}${r.email?" <"+r.email+">":""} — reply to this address`;
 const userMsg=(f.msg.value||"").trim();
 const shareText=[userMsg,fromLine,to?`Recipient: ${to}`:""].filter(Boolean).join("\n\n");
 const file=pdfFile(r);
 const canFiles=!!(navigator.canShare&&(()=>{try{return navigator.canShare({files:[file]})}catch(err){return false}})());
 if(canFiles){
  try{await navigator.share({files:[file],title:subject,text:shareText});
   note.textContent="Shared ✓ — pick Mail (or another app) to send the PDF attachment.";
   showToast("PDF ready in share sheet — choose Mail");return}
  catch(err){if(err&&err.name==="AbortError"){note.textContent="Sharing cancelled.";showToast("Share cancelled");return}}}
 r.doc.save(r.fn);
 const body=[userMsg,"",fromLine,"",`PDF attached (downloaded as ${r.fn}), please attach it to this email before sending.`,r.email?`Reply-to hint: ${r.email}`:""].filter(Boolean).join("\n");
 note.textContent=`PDF downloaded as ${r.fn}. Your email app is opening — attach that file before sending.`;
 showToast(`PDF downloaded — attach ${r.fn} in your email`);
 setTimeout(()=>{location.href=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`},500)};

// ===== phone / WhatsApp =====
const WA='<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
const CC={Austria:43,Belgium:32,Bulgaria:359,Croatia:385,Cyprus:357,Czechia:420,Denmark:45,Estonia:372,Finland:358,France:33,Germany:49,Greece:30,Hungary:36,Iceland:354,Ireland:353,Italy:39,Latvia:371,Lithuania:370,Luxembourg:352,Malta:356,Netherlands:31,Norway:47,Poland:48,Portugal:351,Romania:40,Serbia:381,Slovakia:421,Slovenia:386,Spain:34,Sweden:46,Switzerland:41,Ukraine:380,"United Kingdom":44,
 Argentina:54,Australia:61,Brazil:55,Canada:1,Chile:56,China:86,Colombia:57,Egypt:20,India:91,Indonesia:62,Israel:972,Japan:81,Mexico:52,Morocco:212,"New Zealand":64,Philippines:63,Singapore:65,"South Africa":27,"South Korea":82,Thailand:66,Turkey:90,"United Arab Emirates":971,"United States":1,Vietnam:84};
const ISO={Austria:"AT",Belgium:"BE",Bulgaria:"BG",Croatia:"HR",Cyprus:"CY",Czechia:"CZ",Denmark:"DK",Estonia:"EE",Finland:"FI",France:"FR",Germany:"DE",Greece:"GR",Hungary:"HU",Iceland:"IS",Ireland:"IE",Italy:"IT",Latvia:"LV",Lithuania:"LT",Luxembourg:"LU",Malta:"MT",Netherlands:"NL",Norway:"NO",Poland:"PL",Portugal:"PT",Romania:"RO",Serbia:"RS",Slovakia:"SK",Slovenia:"SI",Spain:"ES",Sweden:"SE",Switzerland:"CH",Ukraine:"UA","United Kingdom":"GB",
 Argentina:"AR",Australia:"AU",Brazil:"BR",Canada:"CA",Chile:"CL",China:"CN",Colombia:"CO",Egypt:"EG",India:"IN",Indonesia:"ID",Israel:"IL",Japan:"JP",Mexico:"MX",Morocco:"MA","New Zealand":"NZ",Philippines:"PH",Singapore:"SG","South Africa":"ZA","South Korea":"KR",Thailand:"TH",Turkey:"TR","United Arab Emirates":"AE","United States":"US",Vietnam:"VN"};
let waTouched=false;
function e164(pre,num){let n=String(num||"").replace(/[^\d+]/g,"");if(!n)return"";if(n.startsWith("+"))return"+"+n.replace(/\D/g,"");if(n.startsWith("00"))return"+"+n.slice(2);
 const cc=String(pre||"").replace(/\D/g,"");return cc?"+"+cc+n.replace(/^0+/,""):n}
function splitPhone(ph,country){const f=$("#profForm"),cc=CC[country];ph=ph||"";
 if(cc&&ph.startsWith("+"+cc)){f.prefix.value="+"+cc;f.phone.value=ph.slice(String(cc).length+1)}else if(ph.startsWith("+")){f.prefix.value="";f.phone.value=ph}else{f.prefix.value=cc?"+"+cc:"";f.phone.value=ph}tag()}
function tag(){const f=$("#profForm");$("#ccTag").textContent=ISO[f.country.value]||""}
(()=>{const f=$("#profForm");
 f.country.addEventListener("change",()=>{const cc=CC[f.country.value];if(cc)f.prefix.value="+"+cc;tag()});
 f.phone.addEventListener("input",()=>{if(!waTouched)f.whatsapp.checked=!!f.phone.value.trim()});
 f.whatsapp.addEventListener("change",()=>{waTouched=true});
 f.prefix.addEventListener("input",()=>{if(f.prefix.value&&!f.prefix.value.startsWith("+"))f.prefix.value="+"+f.prefix.value.replace(/\D/g,"")})})();

// ===== extra locations (max 3 total) =====
function xlocHtml(l={}){const opts=$("#profForm").country.innerHTML;return `<div class="xloc"><div class="xh"><b>Another location</b><button type="button" class="ghost sm xdel" aria-label="Remove">✕</button></div>
 <input data-k="label" hidden tabindex="-1" aria-hidden="true" maxlength="40"><input data-k="address" placeholder="Street address (optional)"><input data-k="city" placeholder="City (optional)"><select data-k="country">${opts}</select></div>`}
function addXloc(l={}){const box=$("#extraLocs");if(box.children.length>=2)return;box.insertAdjacentHTML("beforeend",xlocHtml());const b=box.lastElementChild;
 ["label","address","city","country"].forEach(k=>b.querySelector(`[data-k=${k}]`).value=l[k]||"");b.querySelector(".xdel").onclick=()=>{b.remove();xbtn()};xbtn()}
function xbtn(){$("#addLoc").hidden=$("#extraLocs").children.length>=2}
function setExtra(ls){$("#extraLocs").innerHTML="";ls.slice(0,2).forEach(addXloc);xbtn()}
$("#addLoc").onclick=()=>addXloc();

window.faSignedIn=()=>!!me;
window.faAuthFor=(up,id)=>{pendingBreath=id||"lab";pendingChat=null;setMode(!!up);show("auth")};
// ===== Inbox (lazy): inbox.js loads only when Inbox or a Message button is opened =====
let msgUid=null,lastPull=0,inboxP=null,lastBadge=0;
function loadInbox(){if(!inboxP)inboxP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="inbox.js?v=0.23.100";s.onload=()=>res(window.FA_INBOX);s.onerror=e=>{inboxP=null;rej(e)};document.head.appendChild(s)});return inboxP}
function openChat(id){if(!me){showGate("msg",id);return}pendingChat=null;loadInbox().then(I=>I.openChat(id)).catch(()=>showToast("Could not open messages"))}
function closeChat(){if(window.FA_INBOX)FA_INBOX.closeChat()}
function renderInbox(){if(!me){const box=$("#convs");box.innerHTML=`<div class="card center"><p>Sign in to see messages and chat with practitioners.</p><button type="button" class="gold big1">Sign in</button></div>`;box.querySelector("button").onclick=()=>show("auth");return}
 loadInbox().then(I=>I.renderInbox()).catch(()=>{$("#convs").innerHTML="<p class=muted>Messaging is not available right now. Try again later.</p>"})}
function setBadge(n){const b=$("#unread");if(b){b.textContent=n;b.hidden=!n}}
async function badgePoll(){if(!MSG_ON||!me||document.hidden||!DB.unreadCount)return;lastBadge=Date.now();try{setBadge(await DB.unreadCount())}catch(e){}}
async function msgInit(){if(!MSG_ON){MSG_OK=false;return}MSG_OK=true;hdr();renderMarkers();renderList();badgePoll()}
// unread badge: one tiny count query, at most every 5 min and only when the app is visible
setInterval(()=>{if(Date.now()-lastBadge>290000)badgePoll()},300000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-lastBadge>300000)badgePoll()});
document.addEventListener("click",e=>{const t=e.target.closest("[data-msg]");if(t){e.preventDefault();openChat(t.dataset.msg)}});

document.addEventListener("visibilitychange",()=>document.documentElement.classList.toggle("bg-hidden",document.hidden));

// ===== Learn (study zone) — content in learn.js =====
(function(){const l=CFG.LEARN_LABEL||"Lab",T=CFG.LEARN_TITLE||"Fascia Lab";const a=$("#learnLbl"),h=$("#learnH"),b=$("#tabLearn");if(a)a.textContent=l;if(h)h.textContent=T;if(b)b.setAttribute("aria-label",T)})();
function ytId(v){v=String(v||"").trim();const m=v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);if(m)return m[1];return /^[A-Za-z0-9_-]{11}$/.test(v)?v:""}
const LOCK='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function labCover(x,id){const vid=x.type==="youtube";const img=x.cover||(id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:"");
 if(img)return `<img src="${esc(img)}" alt="" loading="lazy">`+(vid?'<span class="lplay" aria-hidden="true">▶</span>':"");
 if(x.type==="breath")return `<div class="lcov breath"><svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><defs><radialGradient id="bg" cx="40%" cy="35%"><stop offset="0%" stop-color="#5FC9C3"/><stop offset="55%" stop-color="#1d7f79"/><stop offset="100%" stop-color="#02191E"/></radialGradient></defs><circle cx="32" cy="32" r="22" fill="url(#bg)" opacity=".95"/><circle cx="32" cy="32" r="14" fill="none" stroke="#C99E67" stroke-opacity=".55" stroke-width="1.5"/><circle cx="32" cy="32" r="6" fill="#C99E67" opacity=".85"/></svg><span>${esc(x.title)}</span></div>`;
 if(x.type==="link")return `<div class="lcov l"><svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true"><circle cx="32" cy="32" r="8" fill="#5FC9C3"/><circle cx="32" cy="32" r="16" fill="none" stroke="#5FC9C3" stroke-opacity=".6" stroke-width="2"/><circle cx="32" cy="32" r="24" fill="none" stroke="#C99E67" stroke-opacity=".5" stroke-width="2"/></svg><span>${esc(x.title)}</span></div>`;
 return `<div class="lcov ${vid?"v":"b"}"><svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">${vid?'<circle cx="32" cy="32" r="22" fill="none" stroke="#5FC9C3" stroke-width="2" stroke-dasharray="2 5"/><path d="M27 22l16 10-16 10z" fill="#C99E67"/>':'<path d="M14 14c6-2 12-2 18 2v34c-6-4-12-4-18-2z M50 14c-6-2-12-2-18 2v34c6-4 12-4 18-2z" fill="none" stroke="#C99E67" stroke-width="2" stroke-linejoin="round"/>'}</svg><span>${esc(x.title)}</span></div>`}
function renderLearn(){const box=$("#learnList");if(!box)return;const items=(window.FASCIAPP_LEARN||[]).filter(x=>x&&x.title);
 if(!items.length){box.innerHTML=`<div class="card center"><p><b>Videos and guides coming soon</b></p></div>`;if(window.FasciBreath&&FasciBreath.mountLab)try{FasciBreath.mountLab()}catch(e){}return}
 const secs=[];items.forEach(x=>{const k=x.section||"More";let s=secs.find(q=>q.k===k);if(!s)secs.push(s={k,l:[]});s.l.push(x)});
 // Lab order: Breathing practices (injected), Free live sessions, Books, then the rest
 const LAB_ORDER=["Free live sessions","Books","Listen","Fascia & anatomy","Biodynamic Breathwork Videos","Myofascial Energetic Release Videos"];
 secs.sort((a,b)=>{const ia=LAB_ORDER.indexOf(a.k),ib=LAB_ORDER.indexOf(b.k);return (ia<0?999:ia)-(ib<0?999:ib)});
 const CARO=new Set(["Myofascial Energetic Release Videos","Biodynamic Breathwork Videos","Books","Listen"]);
 box.innerHTML=secs.map(s=>{const row=CARO.has(s.k)?"labCarousel":"lgrid";
  const HL={"Free live sessions":"Experience","Books":"Read","Listen":"Listen","Biodynamic Breathwork Videos":"Watch"},VR={"Biodynamic Breathwork Videos":1,"Myofascial Energetic Release Videos":1};const hl=HL[s.k];
  return `${VR[s.k]?`${hl?`<h3 class="lsec" data-sec="${esc(s.k)}">${hl}</h3>`:""}<p class="lrowLbl" data-sec="${esc(s.k)}">${esc(s.k)}</p>`:`<h3 class="lsec" data-sec="${esc(s.k)}">${esc(hl||s.k)}</h3>`}<div class="${row}">${s.l.map(x=>{
  const id=x.type==="youtube"?ytId(x.youtubeId||x.url):"";const breath=x.type==="breath";const ready=breath||(x.type==="youtube"?!!id:!!x.url);const lk=x.type==="link";const locked=!x.public&&!me;
  const blog=lk&&/nisarga8\.com\/resources/i.test(String(x.url||""));
  const isBook=/\bbook\b/i.test(x.line||"")&&!/ebook/i.test(x.line||"");
  const badge=s.k==="Listen"?"":`<span class="ltag t">${breath?"Breath":x.type==="youtube"?"Video":blog?"Blog":lk?"Live":isBook?"Book":"PDF"}</span>`;
  const state=(!x.public?(s.k==="Listen"?`<span class="ltag lk">${locked?LOCK+" ":""}Members</span>`:`<span class="ltag lk">${LOCK} ${locked?"Locked":"Members"}</span>`):'<span class="ltag free">Free</span>')+(!ready?'<span class="ltag soon">Coming soon</span>':"");
  const act=!ready?"":locked?'data-unlock="1"':breath?'data-breath="menu"':x.type==="youtube"?`data-yt="${esc(id)}"`:`data-pdf="${esc(x.url)}"`;
  const foot=!ready?"Coming soon":locked?"Sign in to unlock":breath?"Open practices →":x.type==="youtube"?"Play video":lk?`<span class="lcta">${esc(x.cta||"Open")} ↗</span>`:"Open PDF ↗";
  return `<button type="button" class="lcard${ready?"":" lph"}${locked?" locked":""}" ${act} ${ready?"":"disabled"} aria-label="${esc(x.title)}: ${lk?esc(x.cta||"Open"):foot}">
   ${window.FA_isNew&&FA_isNew(x.title,x.newUntil)?FA_NEW_TAG:""}<div class="lthumb">${labCover(x,id)}${locked?`<span class="lockov">${LOCK}</span>`:""}</div>
   <div class="lbody"><div class="lbadges">${badge}${state}</div><b>${esc(x.title)}</b>${x.by?`<small class="lby">${esc(x.by)}</small>`:""}${x.line?`<small class="muted">${esc(x.line)}</small>`:""}<span class="lfoot">${foot}</span></div></button>`}).join("")}</div>`}).join("");if(window.FasciBreath&&FasciBreath.mountLab)try{FasciBreath.mountLab()}catch(e){}labTiles()}
// ===== Lab home: square tiles (v0.23.106) =====
const LAB_COURSES=[
 {k:"c1",t:"Breathe Online for Stress and Sleep",by:"Nisarga Eryk Dobosz",dur:"21 days · Day 1 free",price:"€24.90",bg:"#16695f",img:"lab/course-breathe21.jpg",url:"https://breathe.bodyawareness.ee/?utm_source=fasciapp&utm_medium=app&utm_campaign=lab-course"},
 {k:"c2",t:"Self Bodywork",by:"Satyarthi Peloquin",dur:"8+ hours",price:"€175",bg:"#78503c",img:"lab/course-selfmassage.jpg",url:"https://www.myofascialtrainings.com/online-courses/self-massage-course"},
 {k:"c3",t:"Reichian Character Structure",by:"Jennifer McKeever",dur:"3.5 hours · 6 lessons",price:"€79",bg:"#4a3f5e",img:"lab/course-character-types.jpg",url:"https://online.myofascialtrainings.com/courses/mer-character-types-course-en-version"}];
const LAB_TILES=[
 {k:"courses",ic:"✿",t:"Online courses",s:"Learn at your own pace",bg:"#16695f"},
 {k:"breathing",ic:"≋",t:"Breathing",s:"Guided practices",bg:"#96693a"},
 {k:"listen",ic:"♪",t:"Listen",s:"Meditations",bg:"#463c6e"},
 {k:"watch",ic:"▶",t:"Watch",s:"Videos",bg:"#19465f"},
 {k:"live",ic:"◷",t:"Live",s:"Free sessions",bg:"#6e373c"},
 {k:"books",ic:"✎",t:"Books",s:"Reading",bg:"#3c5032"}];
function labGroupOf(sec){return sec==="Breathing practices"?"breathing":sec==="Listen"?"listen":sec==="Books"?"books":sec==="Free live sessions"?"live":/videos|anatomy/i.test(sec)?"watch":"more"}
function labTiles(){const box=$("#learnList");if(!box)return;
 [...box.children].forEach(el=>{if(el.id==="labTiles"||el.id==="labBackBar"||el.id==="labCourses")return;let sec=el.id==="breathLabSec"?"Breathing practices":el.dataset.sec;if(!sec){const pv=el.previousElementSibling;sec=pv&&pv.dataset.sec}el.dataset.lg=labGroupOf(sec||"")});
 const old=$("#labTiles");if(old)old.remove();const oc0=$("#labCourses");if(oc0)oc0.remove();const ob=$("#labBackBar");if(ob)ob.remove();
 const t=document.createElement("div");t.id="labTiles";t.className="labTiles";
 t.innerHTML=LAB_TILES.map(x=>`<button type="button" class="ltile" style="--tb:${x.bg}" data-lt="${x.k}" aria-label="${esc(x.t)}: ${esc(x.s)}"><span class="ltIc" aria-hidden="true">${x.ic}</span><span class="ltTx"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button>`).join("");
 const cs=document.createElement("div");cs.id="labCourses";cs.className="labTiles";cs.dataset.lg="courses";
 cs.innerHTML=LAB_COURSES.map(x=>`<button type="button" class="ltile lcTile" style="--tb:${x.bg}" data-lc="${x.k}" aria-label="${esc(x.t)}, ${esc(x.by)}, ${esc(x.dur)}${x.price?", "+esc(x.price):""}"><img class="ltImg" src="${x.img}" alt="" loading="lazy"><span class="ltTx"><small class="ltKind">Online course</small><b>${esc(x.t)}</b><small>${esc(x.by)}</small><small>${esc(x.dur)}</small>${x.price?`<span class="ltPrice">${esc(x.price)}</span>`:""}</span></button>`).join("")+`<div class="ltile soon" aria-label="Online course coming soon"><span class="ltLock">${LOCK}</span><small>Coming soon</small></div>`;
 const oc=$("#labCourses");if(oc)oc.remove();box.append(cs);
 const bb=document.createElement("div");bb.id="labBackBar";bb.className="labBackBar";bb.innerHTML=`<button type="button" class="ltBack" data-ltback="1">← Back to Lab</button><h3 class="lsec" id="labSecTitle"></h3>`;
 box.prepend(bb);box.prepend(t);labView(box.dataset.view||"")}
function labView(k){const box=$("#learnList");if(!box)return;box.dataset.view=k;box.classList.toggle("lv-home",!k);
 [...box.children].forEach(el=>{if(el.id==="labTiles")el.hidden=!!k;else if(el.id==="labBackBar")el.hidden=!k;else el.hidden=!k||el.dataset.lg!==k});
 const x=LAB_TILES.find(q=>q.k===k),st=$("#labSecTitle");if(st)st.textContent=x?x.t:"";
 const s=$("#learn");if(s){s.querySelectorAll(":scope > .muted, :scope > .quoteSlot").forEach(e=>e.hidden=!!k)}
 const tgt=k?$("#labBackBar"):$("#learn");if(tgt)tgt.scrollIntoView({block:"start"})}
function labCourse(x){closeVideo();const d=document.createElement("div");d.id="vModal";d.className="vmodal";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label",x.t);
 d.innerHTML=`<div class="vbox lcourse" style="--tb:${x.bg}"><div class="vtop"><b>Online course</b><button type="button" class="vx" data-vclose="1" aria-label="Close">✕</button></div><div class="lcHead"><img src="${x.img}" alt=""><div><b>${esc(x.t)}</b><small>${esc(x.by)}</small></div></div><p>${esc(x.dur)}${x.price?" · "+esc(x.price):""}</p><a class="gold big1 lcGo" href="${x.url}" target="_blank" rel="noopener">Open course ↗</a></div>`;
 document.body.appendChild(d);d.onclick=e=>{if(e.target===d)closeVideo()};try{window.FA_ev&&FA_ev("lab_open",{props:{item:x.t,kind:"course",section:"Online courses"}})}catch(e){}}
document.addEventListener("click",e=>{const c=e.target.closest("[data-lc]");if(c){labCourse(LAB_COURSES.find(q=>q.k===c.dataset.lc));return}
 const b=e.target.closest("[data-lt]");if(b){labView(b.dataset.lt);return}
 if(e.target.closest("#tabLearn")&&$("#learnList")&&$("#learnList").dataset.view){labView("");return}
 if(e.target.closest("[data-ltback]"))labView("")});
document.addEventListener("click",e=>{const y=e.target.closest(".lcard[data-yt]");if(y){openVideo(y.dataset.yt,(y.querySelector(".lbody b")||{}).textContent||"Video");return}
 if(e.target.closest("[data-vclose]")){closeVideo();return}
 const br=e.target.closest(".lcard[data-breath]");if(br&&window.FasciBreath){window.FasciBreath.openMenu();return}
 const pd=e.target.closest(".lcard[data-pdf]");if(pd){window.open(pd.dataset.pdf,"_blank","noopener");return}
 if(e.target.closest("[data-unlock]")){if(window.FasciBreath&&FasciBreath.showUnlock)FasciBreath.showUnlock("");else{fillLastEmail();setMode(false);show("auth")}}});

// Full-screen-style video viewer: iframe created on open, destroyed on close
function openVideo(id,title){closeVideo();const d=document.createElement("div");d.id="vModal";d.className="vmodal";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label",title);
 d.innerHTML=`<div class="vbox"><div class="vtop"><b>${esc(title)}</b><button type="button" class="vx" data-vclose="1" aria-label="Close video">✕</button></div>
 <div class="vplayer"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=0&modestbranding=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
 <a class="vyt" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener">Open in YouTube ↗</a></div>`;
 d.addEventListener("click",e=>{if(e.target===d)closeVideo()});document.body.appendChild(d)}
function closeVideo(){const d=document.getElementById("vModal");if(d){const f=d.querySelector("iframe");if(f)f.src="about:blank";d.remove()}}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeVideo()});

// ===== What's new card + Lab dot (content in news.js) =====
const NEWS_DIS="fa_news_dismissed",LAB_SEEN="fa_lab_seen";
function newsList(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch(e){return[]}}
function renderNews(){const n=window.FASCIAPP_NEWS;const dis=n&&newsList(NEWS_DIS).includes(n.id);
 const safeU=u=>/^(https:\/\/|[a-z0-9_\/.-]+$)/i.test(String(u||""))?String(u):"";
 const rich=n&&(n.image||n.title||n.url);
 $$(".newsSlot").forEach(s=>{if(n&&!dis&&rich){const img=safeU(n.image),url=safeU(n.url);s.innerHTML=`<div class="newsCard nb" role="status">${img?`<div class="nbIm${n.play?" play":""}"><img src="${esc(img)}" alt="" loading="lazy">${n.play?"<i></i>":""}</div>`:(n.tile?`<div class="nbTile" aria-hidden="true">${esc(String(n.tile).slice(0,3))}</div>`:"")}<div class="nbTx"><small>${esc(n.label||"What’s new")}</small>${n.title?`<b>${esc(n.title)}</b>`:""}${n.text?`<p>${esc(n.text)}</p>`:""}${n.button?(url?`<a class="newsGo newsLink" href="${esc(url)}" target="_blank" rel="noopener">${esc(n.button)} →</a>`:((n.tab||"learn")!==(s.closest(".screen")||{}).id?`<button type="button" class="newsGo" data-tab="${esc(n.tab||"learn")}">${esc(n.button)} →</button>`:"")):""}</div><button type="button" class="newsX" aria-label="Dismiss">✕</button></div>`;return}
  s.innerHTML=n&&!dis?`<div class="newsCard" role="status"><small>What’s new</small><p>${esc(n.text)}</p>${n.button&&(n.tab||"learn")!==(s.closest(".screen")||{}).id?`<button type="button" class="newsGo" data-tab="${esc(n.tab||"learn")}">${esc(n.button)} →</button>`:""}<button type="button" class="newsX" aria-label="Dismiss">✕</button></div>`:""});
 const dot=$("#labDot");if(dot)dot.hidden=!(n&&localStorage.getItem(LAB_SEEN)!==n.id)}
document.addEventListener("click",e=>{const n=window.FASCIAPP_NEWS;if(!n)return;
 if(e.target.closest(".newsX")){const d=newsList(NEWS_DIS);if(!d.includes(n.id)){d.push(n.id);localStorage.setItem(NEWS_DIS,JSON.stringify(d.slice(-20)))}renderNews();return}
 if(e.target.closest(".newsLink")){try{window.FA_ev&&FA_ev("news_tap",{source:"banner",props:{item:String(n.id).slice(0,60)}})}catch(x){}return}
 const g=e.target.closest(".newsGo");if(g){show(g.dataset.tab);try{const m=document.querySelector("main");if(m)m.scrollTop=0}catch(x){}if(n.breath&&g.dataset.tab==="learn")setTimeout(()=>{try{window.FasciBreath&&FasciBreath.openIntro(n.breath)}catch(x){}},150)}});
renderNews();

$("#pCancel").onclick=()=>{profEdit=false;$("#status").textContent="";loadProf()};

// ===== Anonymous analytics hooks (track.js) =====
(function(){const ev=(e,o)=>{try{window.FA_ev&&FA_ev(e,o)}catch(x){}};
 const src=el=>el&&el.closest&&el.closest(".leaflet-popup")?(nearScope?"near-me":"map"):(nearScope?"near-me":((($("#qName")||{}).value||"").trim()||(($("#qPlace")||{}).value||"")?"search":"list"));
 // screens / tabs
 const _show=show;window.__faShow=1;show=function(t){_show.apply(this,arguments);ev("screen",{props:{tab:String(t||"")}})};
 // contact taps per practitioner + follow chips + lab items
 document.addEventListener("click",e=>{const t=e.target.closest("a,button");if(!t)return;
  if(t.matches(".igChip,.fbChip")){ev("follow_tap",{props:{item:t.matches(".igChip")?"instagram":"facebook"},source:"app"});return}
  const row=t.closest("[data-pid]");
  if(row){const h=t.getAttribute("href")||"";const ty=t.classList.contains("msg")?"message":t.classList.contains("wa")?"whatsapp":t.classList.contains("mail")?"email":t.classList.contains("tel")?"phone":t.classList.contains("igl")?"instagram":/facebook\.com|fb\.com/i.test(h)?"facebook":/tiktok|linkedin|youtube|x\.com|twitter|threads/i.test(h)?"social":t.tagName==="A"?"website":"";
   if(ty)ev("contact",{pid:row.dataset.pid,source:src(t),props:{type:ty}});return}
  const lc=t.closest(".lcard");if(lc&&!lc.disabled){const ti=(lc.querySelector(".lbody b")||{}).textContent||"";const sec=(lc.closest(".labCarousel,.lgrid")||{}).previousElementSibling;
   ev("lab_open",{props:{item:ti.slice(0,60),kind:lc.dataset.yt?"video":lc.dataset.pdf?"link":lc.dataset.unlock?"locked":lc.dataset.breath?"breath":"other",section:sec?(sec.dataset.sec||sec.textContent||"").slice(0,30):""}})}
 },true);
 // practitioner views: list cards seen, map popups
 const io="IntersectionObserver" in window?new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){io.unobserve(x.target);const s=src(x.target);ev("pract_view",{pid:x.target.dataset.pid,source:s,once:"v"+x.target.dataset.pid+s})}}),{threshold:.6}):null;
 const watch=()=>{if(io)$$("#items [data-pid]").forEach(el=>io.observe(el))};const box=$("#items");if(box&&window.MutationObserver)new MutationObserver(()=>setTimeout(watch,60)).observe(box,{childList:true});
 let hi=0;const hook=()=>{if(map&&map.on&&!map._faT){map._faT=1;clearInterval(hi);
  map.on("popupopen",p=>setTimeout(()=>{const el=p.popup.getElement&&p.popup.getElement();const r=el&&el.querySelector("[data-pid]");if(r)ev("pract_view",{pid:r.dataset.pid,source:src(el),once:"v"+r.dataset.pid+src(el)})},0));
  map.on("dragstart zoomstart",()=>ev("map_use",{once:"mapuse"}))}};hi=setInterval(hook,3000);
 // near me, place filter, name search
 const _an=applyNear;applyNear=async function(){const r=await _an.apply(this,arguments);ev("near_me",{props:{scope:nearScope?nearScope.label.split(" ")[0]:"none"}});return r};
 const qp=$("#qPlace");if(qp)qp.addEventListener("change",()=>{const v=qp.value||"";ev("place_filter",{props:{country:v.startsWith("co:")?v.slice(3):v.startsWith("ci:")?(v.split("|")[1]||""):"",level:v.startsWith("ci:")?"city":v.startsWith("co:")?"country":v?"other":"all"}})});
 const qn=$("#qName");let st=0;if(qn)qn.addEventListener("input",()=>{clearTimeout(st);st=setTimeout(()=>{const n=(qn.value||"").trim().length;if(!n)return;const c=$$("#items [data-pid],#items [data-tid]").length;ev("name_search",{props:{len:n,hit:c>0?"yes":"no"}})},1200)});
 // join funnel
 $$('[data-go="auth"],#goPract,a[href*="join=1"]').forEach(b=>b.addEventListener("click",()=>ev("join",{props:{step:"started"}})));
 const af=$("#authForm");if(af)af.addEventListener("submit",()=>{if(signUpMode)ev("join",{props:{step:"submitted"}})},true);
 const pf=$("#profForm");if(pf)pf.addEventListener("submit",()=>ev("join",{props:{step:"profile_saved"}}),true);
 if(/[?&]join=1/.test(location.search))ev("join",{props:{step:"started"},source:"link"});
})();

// Messenger UX (v0.23.70): full-height sheet that follows the visual viewport (keyboard), auto-scroll, auto-grow, Enter sends on desktop
(function(){const chat=document.getElementById("chat");if(!chat)return;const log=document.getElementById("chatLog"),ta=document.getElementById("chatTxt"),form=document.getElementById("chatForm");
 const vv=window.visualViewport,root=document.documentElement;
 function fit(){if(chat.parentNode!==document.body)document.body.appendChild(chat);const kb=vv?Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop)):0;root.style.setProperty("--chat-kb",kb+"px");if(stick)toEnd()}
 let stick=true;const toEnd=()=>{log.scrollTop=log.scrollHeight};
 log.addEventListener("scroll",()=>{stick=log.scrollHeight-log.scrollTop-log.clientHeight<40},{passive:true});
 if(vv){vv.addEventListener("resize",fit);vv.addEventListener("scroll",fit)}window.addEventListener("resize",fit);
 new MutationObserver(()=>{if(stick)toEnd()}).observe(log,{childList:true,subtree:true});
 new MutationObserver(()=>{const open=!chat.hidden;document.body.classList.toggle("chatOpen",open);if(open){stick=true;fit();requestAnimationFrame(toEnd);setTimeout(toEnd,120)}}).observe(chat,{attributes:true,attributeFilter:["hidden"]});
 const grow=()=>{ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight+2,120)+"px"};
 ta.addEventListener("input",grow);ta.addEventListener("focus",()=>setTimeout(()=>{fit();toEnd()},250));
 const desk=matchMedia("(hover:hover) and (pointer:fine)").matches;
 ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&desk){e.preventDefault();form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event("submit",{cancelable:true}))}});
 form.addEventListener("submit",()=>{stick=true;setTimeout(()=>{grow();toEnd();if(!desk)ta.focus()},0)});
 fit()})();

// ===== v0.23.100: country list set, login-to-contact gate, News in the Lab pill =====
var pendingWa=null;
const FA_COUNTRY_SET=new Set([...document.querySelectorAll('#profForm select[name=country] option')].map(o=>o.value).filter(Boolean));
function showGate(kind,id){const g=$("#gate");if(!g)return;let nm="";
 if(kind==="msg"){pendingChat=id;pendingWa=null;const p=people.find(x=>x.user_id===id);nm=p?(p.name||practiceTitle(p)):""}
 else{pendingWa=id;pendingChat=null;const p=people.find(x=>String(x.id)===String(id));nm=p?(p.name||practiceTitle(p)):""}
 pendingBreath=null;const first=String(nm).trim().split(/\s+/)[0]||"";
 $("#gateH").textContent=first?`Log in to contact ${first}`:"Log in to contact";
 $("#gateP").textContent=(kind==="wa"?"WhatsApp contact is":kind==="mail"?"Email contact is":kind==="ig"?"Instagram is":"Messages are")+" for FasciApp members. Create a free account or log in, and we’ll bring you right back"+(first?` to ${first}.`:".");
 g.hidden=false;try{ev("contact_gate",{props:{item:kind==="wa"?"whatsapp":kind==="mail"?"email":kind==="ig"?"instagram":"message"},source:"app"})}catch(e){}}
function hideGate(clear){$("#gate").hidden=true;if(clear){pendingChat=null;pendingWa=null}}
$("#gateUp").onclick=()=>{hideGate();setMode(true);show("auth")};
$("#gateIn").onclick=()=>{hideGate();fillLastEmail();setMode(false);show("auth")};
$("#gateX").onclick=()=>hideGate(true);$("#gate").addEventListener("click",e=>{if(e.target.id==="gate")hideGate(true)});
document.addEventListener("click",e=>{const t=e.target.closest("[data-gate]");if(!t)return;e.preventDefault();const r=t.closest("[data-pid]");showGate(t.dataset.gate,r&&r.dataset.pid)},true);
function backToPract(pid){show("list");let n=0;const go=()=>{const el=document.querySelector(`#items [data-pid="${CSS.escape(String(pid))}"]`);if(el&&el.querySelector("a.cb.wa,a.cb.mail")){el.scrollIntoView({block:"center"});el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),2200);return}if(++n<30)setTimeout(go,200);else if(el)el.scrollIntoView({block:"center"})};setTimeout(go,150)}
(function(){const btn=$("#labBtn"),sh=$("#labSheet"),dim=$("#labDim");if(!btn||!sh)return;
 const leaf=$("#leaf");const mount=()=>{if(leaf&&btn.parentNode!==leaf){leaf.appendChild(btn);if(window.L&&L.DomEvent){L.DomEvent.disableClickPropagation(btn);L.DomEvent.disableScrollPropagation(btn)}}};mount();
 const n=window.FASCIAPP_NEWS;if(n&&n.title&&n.url){$("#labNewTxt").textContent=n.title+" "+(n.text||"")}else if(n&&n.text){let t=String(n.text).replace(/^\s*new in the lab\s*[:·-]\s*/i,"");const i=t.indexOf(". ");if(i>0&&i<40)t=t.slice(0,i)+":"+t.slice(i+1);$("#labNewTxt").textContent=t}else{const nw=$("#labNew");if(nw)nw.hidden=true}
 const open=()=>{document.body.classList.add("labOpen");sh.setAttribute("aria-hidden","false");try{ev("lab_pill",{props:{step:"open"},source:"app"})}catch(e){}};
 const close=()=>{document.body.classList.remove("labOpen");sh.setAttribute("aria-hidden","true")};
 btn.onclick=e=>{e.stopPropagation();open()};dim.onclick=close;$("#labLater").onclick=close;
 $("#labJoin").onclick=()=>{close();if(window.faAuthFor)faAuthFor(true,"lab");else{setMode(true);show("auth")}};
 btn.hidden=!!me})();
// ===== v0.23.100: "Join as a practitioner" buttons (map pill + list button); hidden once the user has a listing =====
(function(){const PLUS='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
 const mk=(id,cls)=>{const b=document.createElement("button");b.type="button";b.id=id;b.className="joinBtn "+cls;b.innerHTML=PLUS+"<span>Join as a practitioner</span>";b.hidden=true;b.onclick=go;return b};
 const fab=mk("joinFab","joinFab"),lst=mk("joinList","joinList");
 const m=$("#map"),it=$("#items");if(m)m.appendChild(fab);if(it)it.parentNode.insertBefore(lst,it);
 function go(){try{window.FA_ev&&FA_ev("join",{props:{step:"started"},source:"join_button"})}catch(e){}
  wantForm=true;if(me){show("profile");return}setMode(true);show("auth")}
 let has=false,uid=null,seq=0;
 function paint(){fab.hidden=lst.hidden=has}
 window.faJoinUpd=async function(){const id=me&&(me.user_id||me.id||me.email)||null;if(!id){has=false;uid=null;paint();return}
  if(id===uid&&has){paint();return}uid=id;const n=++seq;paint();
  const p=await DB.mine().catch(()=>null);if(n!==seq)return;has=!!(p&&(p.name||p.address||p.city));paint()};
 faJoinUpd()})();
// ===== v0.23.100: List v2: countries A–Z with per-country city picker, See all grid with breadcrumb, sheet with back/prev/next, history-aware back =====
// Display-only city names: merge local spellings, drop district/postcode/state suffixes, fix ALL CAPS (database values are untouched)
// Instagram is members-only: a website field that points to Instagram counts as Instagram
function faWebOk(u){return !/(^|\/\/|\.)(instagram\.com|instagr\.am)(\/|$)/i.test(String(u||"").trim().replace(/^https?:\/\//i,"//"))}
function faIg(p){return igHandle(p.instagram)||[p.website,p.website2].map(u=>!faWebOk(u)?igHandle(u):"").find(Boolean)||""}
function faCity(raw){let c=String(raw||"").split(",")[0].trim();if(!c)return"";
 c=c.replace(/\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/,"").replace(/\s+[A-Z]{2,3}$/,"").trim();
 const A={warszawa:"Warsaw",munchen:"Munich",koln:"Cologne",wien:"Vienna",praha:"Prague",lisboa:"Lisbon",roma:"Rome",milano:"Milan",firenze:"Florence",venezia:"Venice",napoli:"Naples",krakow:"Kraków",bruxelles:"Brussels",brussel:"Brussels",kobenhavn:"Copenhagen",athina:"Athens",nurnberg:"Nuremberg"};
 const a=A[fold(c)];if(a)return a;if(c.length>3&&c===c.toUpperCase()&&/\p{Lu}/u.test(c))c=c.toLowerCase().replace(/(^|[\s-])\p{L}/gu,m=>m.toUpperCase());
 return c.charAt(0).toUpperCase()+c.slice(1)}
(function(){
 const L0=p=>(p.locations&&p.locations.length?p.locations:[p]);
 const OTHER="Online & other";
 const coOf=l=>{const c=countryOfLoc(l)||"";return c==="Other"?"":c};
 const cityOf=l=>l?(isOnline(l)?"Online":faCity(l.city)):"";
 const qp=()=>$("#qPlace");const placeV=()=>((qp()||{}).value||"");
 const placeParts=()=>{const v=placeV();if(v.startsWith("co:"))return{co:v.slice(3),ci:""};if(v.startsWith("ci:")){const [ci,co]=v.slice(3).split("|");return{co,ci}}return null};
 const placeLoc=p=>{const pp=placeParts();if(!pp)return null;const c=fold(pp.co),ci=fold(pp.ci);return L0(p).find(l=>fold(l.country||"")===c&&(!ci||fold(faCity(l.city))===ci))};
 const src=()=>nearScope?"near-me":(((($("#qName")||{}).value||"").trim()||placeV())?"search":"list");
 let srcOv="";const view=p=>{try{const s=srcOv||src();window.FA_ev&&FA_ev("pract_view",{pid:p.id,source:s,once:"v"+p.id+s})}catch(e){}};
 const chips=(p,n)=>{const m=(p.mods||[]).filter(Boolean);return m.slice(0,n).map(x=>`<span class="ch${faHLChip(x)?" hlCh":""}">${esc(x)}</span>`).join("")+(m.length>n?`<span class="ch more">+${m.length-n}</span>`:"")};
 const pic=p=>p.photo?`<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async">`:`<span class="ptFb">${esc(initials(p.name||practiceTitle(p)))}</span>`;
 const nm=p=>String(p.name||"").trim()||practiceTitle(p);
 const flagC=c=>c===OTHER?"🌐":flagOf(c);
 const IG='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
 // ---- history: back closes the city list / sheet, then leaves See all, then default
 const HS=[];let skip=0;
 const hpush=k=>{try{history.pushState({fa:k},"")}catch(e){}HS.push(k)};
 const hpop=k=>{if(HS.length&&HS[HS.length-1]===k){HS.pop();skip++;try{history.back()}catch(e){skip--}}};
 window.addEventListener("popstate",()=>{if(skip){skip--;return}const k=HS.pop();if(k==="sheet")hideSheet();else if(k==="city")hideCity();else if(k==="seeall")leaveSeeAll();else if(k==="region"){BR=null;renderList()}else if(k==="pe"&&window.faPeBack)faPeBack();else if(k==="log"){if($("#log").classList.contains("active"))show("profile")}});
 window.faH={push:hpush,pop:hpop};
 // ---- model
 let model={groups:[],grid:[],gridLabel:""};const sel={};let seeAll=false,savedTop=0;let BR=null;
 const AMR=new Set("United States|Canada|Mexico|Brazil|Argentina|Chile|Peru|Colombia|Ecuador|Bolivia|Uruguay|Paraguay|Venezuela|Costa Rica|Panama|Guatemala|Honduras|Nicaragua|El Salvador|Belize|Cuba|Dominican Republic|Puerto Rico|Jamaica|Trinidad and Tobago|Bahamas|Barbados|Haiti|Guyana|Suriname".split("|"));
 const APR=new Set("Australia|New Zealand|Japan|China|India|Indonesia|Thailand|Vietnam|Malaysia|Singapore|Philippines|South Korea|Korea|Taiwan|Hong Kong|Sri Lanka|Nepal|Bangladesh|Pakistan|Cambodia|Laos|Myanmar|Fiji|Bali|Mongolia".split("|"));
 const AFR=new Set("South Africa|Egypt|Morocco|Kenya|Nigeria|Ghana|Tanzania|Uganda|Ethiopia|Tunisia|Algeria|Namibia|Botswana|Zimbabwe|Mauritius|Senegal|Israel|United Arab Emirates|Saudi Arabia|Qatar|Jordan|Lebanon|Iran|Iraq|Kuwait|Oman|Bahrain".split("|"));
 const REGS=["Europe","Americas","Asia & Pacific","Africa & Middle East","Online & other"];
 const regionOf=c=>!c||c===OTHER?"Online & other":AMR.has(c)?"Americas":APR.has(c)?"Asia & Pacific":AFR.has(c)?"Africa & Middle East":"Europe";
 const bub=(ps,n,more)=>`<span class="brFaces">${ps.filter(p=>p.photo).slice(0,n).map(p=>`<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async">`).join("")}${more>0?`<i>+${more}</i>`:""}</span>`;
 const uniq=list=>{const m=new Map();list.forEach(({p})=>m.set(p.id,p));return[...m.values()]};
 function browseHtml(groups){const lc=$("#list");
  if(BR){const gs=groups.filter(g=>regionOf(g.c)===BR);if(!gs.length){BR=null;return browseHtml(groups)}
   lc.dataset.br="reg";
   {const nb=$("#listNav");if(nb){nb.hidden=false;nb.innerHTML=`<button type="button" class="brBack" data-br="home"><b>←</b> Back to regions</button>`}}
   return `<div class="brRegH"><small>${esc(BR)}</small><span>${gs.length} countr${gs.length===1?"y":"ies"} · A–Z</span></div><div class="brCos">${gs.map(g=>{const ps=uniq(g.list);return `<button type="button" class="brCo" data-co="${esc(g.c)}"><span class="brFl">${flagC(g.c)}</span><span class="brCoT"><b>${esc(g.c)}</b><small>${ps.length} practitioner${ps.length===1?"":"s"}</small></span>${bub(ps,4,0)}<em>›</em></button>`}).join("")}</div>`}
  lc.dataset.br="home";const by=new Map();groups.forEach(g=>{const r=regionOf(g.c);if(!by.has(r))by.set(r,{n:0,ids:new Map()});const o=by.get(r);o.n++;g.list.forEach(({p})=>o.ids.set(p.id,p))});
  const tot=new Set();groups.forEach(g=>g.list.forEach(({p})=>tot.add(p.id)));const nc=groups.filter(g=>g.c!==OTHER).length;
  return `<p class="brTot">${tot.size} practitioners in ${nc} countries</p><div class="brRegs">${REGS.filter(r=>by.has(r)).map((r,i)=>{const o=by.get(r),ps=[...o.ids.values()].sort((a,b)=>(!!b.photo)-(!!a.photo)),sh=Math.min(6,ps.filter(p=>p.photo).length);
   return `<button type="button" class="brReg r${i}" data-reg="${esc(r)}"><span class="brRegT"><b>${esc(r)}</b><small>${r==="Online & other"?"":`${o.n} countr${o.n===1?"y":"ies"} · `}${ps.length} practitioner${ps.length===1?"":"s"}</small></span>${bub(ps,6,ps.length-sh)}<em>›</em></button>`}).join("")}</div>`}
 function goPlace(v,co){const m=document.querySelector("main");fillPlaces();if(![...qp().options].some(x=>x.value===v))return false;BR=regionOf(co);savedTop=m?m.scrollTop:0;seeAll=true;hpush("seeall");setPlaceV(v);if(m)m.scrollTop=0;return true}
 window.faListHome=()=>{BR=null;seeAll=false;const nb=$("#qName");if(nb)nb.value="";const lf=$("#listFilter");if(lf)lf.value="";const el=qp();if(el)el.value="";const w=$("#qWhere");if(w){w.value="";const sg=$("#qSug");if(sg)sg.hidden=true}if(nearScope){nearScope=null;const b=$("#nearAll");if(b)b.hidden=true}while(HS.length&&HS[HS.length-1]!=="sheet"&&HS[HS.length-1]!=="pe")HS.pop();try{fillPlaces()}catch(e){}renderMarkers();renderList();const m=document.querySelector("main");if(m)m.scrollTop=0};
 (function(){const w=$("#qWhere"),sg=$("#qSug");if(!w||!sg)return;let hits=[];
  const ctx=()=>{const v=((qp()||{}).value)||"";if(seeAll&&v){const co=v.startsWith("co:")?v.slice(3):v.startsWith("ci:")?(v.split("|")[1]||""):"";if(co)return{t:"co",co}}return BR?{t:"reg",r:BR}:{t:"top"}};
  const inCtx=(x,c)=>c.t==="top"?true:c.t==="reg"?regionOf(x.co)===c.r:x.co===c.co;
  const AZ=(a,b)=>fold(a.t==="ci"?a.c:a.co).localeCompare(fold(b.t==="ci"?b.c:b.co));
  const build=q=>{q=fold(q.trim());const c=ctx();const cs=new Map(),ci=new Map();all().filter(p=>p.consent!==false).forEach(p=>L0(p).forEach(l=>{const co=coOf(l);if(!co)return;const a=cs.get(co)||{t:"co",co,n:new Set()};a.n.add(p.id);cs.set(co,a);const cc=isOnline(l)?"":faCity(l.city);if(!cc)return;const k=fold(cc)+"|"+co;const b=ci.get(k)||{t:"ci",c:cc,co,n:new Set(),ps:[]};if(!b.n.has(p.id)){b.n.add(p.id);b.ps.push(p)}ci.set(k,b)}));
   if(!q){const pool=c.t==="co"?[...ci.values()].filter(x=>x.co===c.co):[...cs.values()].filter(x=>inCtx(x,c));
    return{head:c.t==="co"?`Cities in ${c.co} · A–Z`:c.t==="reg"?`Countries in ${c.r} · A–Z`:"All countries · A–Z",main:pool.sort(AZ),other:[]}}
   const sc=x=>{const s=fold(x.t==="ci"?x.c:x.co);return s.startsWith(q)?0:s.split(/[\s&,()/-]+/).some(w=>w.startsWith(q))?1:s.includes(q)?2:9};
   const m=[...ci.values(),...cs.values()].map(x=>({x,s:sc(x)})).filter(o=>o.s<9).sort((a,b)=>a.s-b.s||b.x.n.size-a.x.n.size||AZ(a.x,b.x)).map(o=>o.x);
   return{head:"",main:m.filter(x=>inCtx(x,c)).slice(0,80),other:c.t==="top"?[]:m.filter(x=>!inCtx(x,c)).slice(0,40)}};
  const row=(h,i)=>{const ps=h.t==="ci"?h.ps:all().filter(p=>h.n.has(p.id));const n=h.n.size;return `<button type="button" data-sg="${i}"><span class="sgI">${h.t==="ci"?"📍":flagOf(h.co)}</span><span class="sgT"><b>${esc(h.t==="ci"?h.c+", "+h.co:h.co)}</b><small>${h.t==="ci"?"City":"Country"} · ${n} practitioner${n===1?"":"s"}</small></span>${bub(ps,3,0)}</button>`};
  const fitH=()=>{const vv=window.visualViewport,vh=vv?vv.height+vv.offsetTop:innerHeight,top=sg.getBoundingClientRect().top;sg.style.maxHeight=Math.max(180,Math.min(vh*0.6,vh-top-12))+"px"};
  const paint=()=>{const r=build(w.value);hits=[...r.main,...r.other];sg.hidden=false;
   sg.innerHTML=(r.head?`<p class="sgHd">${esc(r.head)}</p>`:"")+(hits.length?r.main.map((h,i)=>row(h,i)).join("")+(r.other.length?`<p class="sgHd sgOther">Other places</p>`+r.other.map((h,i)=>row(h,r.main.length+i)).join(""):""):`<p class="sgNo">No city or country found</p>`);sg.scrollTop=0;requestAnimationFrame(fitH)};
  if(window.visualViewport)visualViewport.addEventListener("resize",()=>{if(!sg.hidden)fitH()});
  // touching the list closes the keyboard so the whole panel is visible and scrolls natively
  sg.addEventListener("touchstart",()=>{if(document.activeElement===w)w.blur()},{passive:true});
  w.addEventListener("input",paint);w.addEventListener("focus",paint);
  w.addEventListener("keydown",e=>{if(e.key==="Enter"&&hits[0]){e.preventDefault();pick(0)}if(e.key==="Escape"){sg.hidden=true;w.blur()}});
  const pick=i=>{const h=hits[i];if(!h)return;sg.hidden=true;w.value="";w.blur();const v=h.t==="ci"?`ci:${h.c}|${h.co}`:`co:${h.co}`;if(!goPlace(v,h.co)&&h.t==="ci")goPlace(`co:${h.co}`,h.co)};
  sg.addEventListener("click",e=>{const b=e.target.closest("[data-sg]");if(b)pick(+b.dataset.sg)});
  document.addEventListener("click",e=>{if(!e.target.closest(".brSearch"))sg.hidden=true})})();
 const cityList=(c,list)=>{const m=new Map();list.forEach(({p})=>{const seen=new Set();L0(p).filter(l=>(coOf(l)||OTHER)===c).forEach(l=>{const n=cityOf(l);if(!n)return;const k=fold(n);if(seen.has(k))return;seen.add(k);const o=m.get(k)||{k,n,c:0};o.c++;m.set(k,o)})});return[...m.values()].sort((a,b)=>b.c-a.c||a.n.localeCompare(b.n,"en",{sensitivity:"base"}))};
 const inCity=(g,k)=>!k?g.list:g.list.map(({p})=>{const l=L0(p).find(l=>(coOf(l)||OTHER)===g.c&&fold(cityOf(l))===k);return l?{p,l}:null}).filter(Boolean);
 function tile(p,loc,g,i,nCh,d){const co=loc?coOf(loc):"";const fl=co?flagOf(co):"";const city=cityOf(loc)||co;
  const hl=faIsHL(p);
  return `<button type="button" class="ptT${hl?" hlA":""}" data-tid="${esc(p.id||"")}" data-g="${g}" data-i="${i}" aria-label="${esc(practiceTitle(p))}${city?", "+esc(city):""}">${pic(p)}${d!=null?`<span class="ptKm">${Math.round(d)} km</span>`:""}<span class="ptOv"><b>${esc(nm(p))}</b><small>📍 ${fl?fl+" ":""}${esc(city)}</small><span class="chs">${chips(p,nCh)}</span></span>${hl?`<span class="aSeal">${faSeal(32)}<span class="hlTag">${faHLTag(p)}</span></span>`:""}</button>`}
 function rowHtml(gi){const g=model.groups[gi];const list=inCity(g,sel[g.c]);return list.map(({p,l},i)=>tile(p,l,gi,i,1,null)).join("")}
 function chipLabel(g){const k=sel[g.c];if(!k)return"All cities";const o=g.cities.find(x=>x.k===k);return o?o.n:"All cities"}
 function nav(){const box=$("#listNav"),pp=placeParts(),lst=$("#list");const on=!!pp;if(lst)lst.classList.toggle("ptPlace",on);if(!box)return;box.hidden=!on;if(!on){box.innerHTML="";return}
  box.innerHTML=`<button type="button" class="ptBack brBack" data-nav="back"><b>←</b> ${BR&&BR!=="Online & other"?"Back to "+esc(BR):"Back to regions"}</button><span class="ptCrumb">${pp.ci?`<button type="button" data-nav="co">${flagOf(pp.co)} ${esc(pp.co)}</button><em>›</em><b>${esc(pp.ci)}</b>`:`<b>${flagOf(pp.co)} ${esc(pp.co)}</b>`}</span>`}
 function setPlaceV(v){const el=qp();if(!el)return;fillPlaces();if(v&&![...el.options].some(o=>o.value===v))return;el.value=v;el.dispatchEvent(new Event("change"))}
 function leaveSeeAll(){const top=savedTop,was=seeAll;seeAll=false;if(BR){const lf=$("#listFilter");if(lf)lf.value=""}const el=qp();if(el&&el.value){el.value="";el.dispatchEvent(new Event("change"))}else renderList();if(was)requestAnimationFrame(()=>{const m=document.querySelector("main");if(m)m.scrollTop=top})}
 renderList=function(){renderNewJ();faHLPaint();faLiveCount();const ps=filtered().filter(p=>!nearScope||nearScope.ok(p)).map(p=>({p,d:dist(p)}));
  const _pe=qp(),n=ps.length,q=placeV(),mod=($("#listFilter")&&$("#listFilter").value)||"",nameQ=(($("#qName")||{}).value||"").trim();
  const active=!!(nearScope||q||mod||nameQ);
  // MER & BBTRS always first, then the usual order
  if(here&&active)ps.sort((a,b)=>faHLCmp(a.p,b.p)||a.d-b.d);else ps.sort((a,b)=>faHLCmp(a.p,b.p)||azKey(a.p).localeCompare(azKey(b.p),undefined,{sensitivity:"base"}));
  const pp=placeParts();
  const lc=$("#listCount");if(lc)lc.textContent=!faFresh?"":(n?`${n} practitioner${n===1?"":"s"}`:"No practitioners")+(nearScope?` ${nearScope.label}`:pp?` in ${pp.ci||pp.co}`:"");
  const clr=$("#listClear");if(clr){clr.hidden=!active;clr.textContent=nearScope?"Show all":"Clear"}
  $("#from").textContent=here&&active?"Sorted by distance from you":"";
  if(seeAll&&!pp){seeAll=false;hpop("seeall")}
  nav();
  const box=$("#items");if(!box)return;const keep={};box.querySelectorAll(".ptRow[data-c]").forEach(r=>{if(r.scrollLeft)keep[r.dataset.c]=r.scrollLeft});
  let top="";
  if(active){const fc=[];
   if(pp)fc.push(`<button type="button" class="fChip" data-clr="place">📍 ${esc(pp.ci?pp.ci+", "+pp.co:pp.co)} <i>✕</i></button>`);
   if(mod)fc.push(`<button type="button" class="fChip" data-clr="mod">${esc(mod)} <i>✕</i></button>`);
   if(nameQ)fc.push(`<button type="button" class="fChip" data-clr="name">“${esc(nameQ)}” <i>✕</i></button>`);
   if(nearScope)fc.push(`<button type="button" class="fChip" data-clr="near">📍 Near me <i>✕</i></button>`);
   top=`<div class="fChips">${fc.join("")}</div>`;$("#list").dataset.br=pp?"co":"res";
   if(pp){const allIn=filteredNoPlace().filter(p=>L0(p).some(l=>fold(l.country||"")===fold(pp.co)));const mc=new Map();(mod?all().filter(p=>L0(p).some(l=>fold(l.country||"")===fold(pp.co))&&p.consent!==false):allIn).forEach(p=>(p.mods||[]).filter(Boolean).forEach(m=>mc.set(m,(mc.get(m)||0)+1)));const ms=[...mc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    if(ms.length)top+=`<div class="brMods"><button type="button" class="cChip${mod?"":" on"}" data-mod="">All</button>${ms.map(([m,c])=>`<button type="button" class="cChip${mod===m?" on":""}" data-mod="${esc(m)}">${esc(m)} <i>${c}</i></button>`).join("")}</div>`}
   if(pp){const allIn=filteredNoPlace().filter(p=>L0(p).some(l=>fold(l.country||"")===fold(pp.co)));const cs=cityList(pp.co,allIn.map(p=>({p})));
    if(cs.length>1)top+=`<div class="ptCities">${`<button type="button" class="cChip${pp.ci?"":" on"}" data-pl="co:${esc(pp.co)}">All ${esc(pp.co)} <i>${allIn.length}</i></button>`}${cs.map(c=>`<button type="button" class="cChip${pp.ci&&fold(pp.ci)===c.k?" on":""}" data-pl="ci:${esc(c.n)}|${esc(pp.co)}">${esc(c.n)} <i>${c.c}</i></button>`).join("")}</div>`}}
  if(!n){if(!active)$("#list").dataset.br="home";model={groups:[],grid:[],gridLabel:""};box.innerHTML=top+"<p class=muted>No practitioners match your search.</p>";return}
  if(active){model={groups:[],grid:ps.map(x=>x.p),gridLabel:pp?(pp.ci||pp.co):nearScope?"Near me":"Results"};
   const T=({p,d},i)=>tile(p,placeLoc(p)||L0(p)[0],-1,i,2,here?d:null);const k=ps.filter(x=>faIsHL(x.p)).length;
   if(pp&&pp.ci&&k&&k<n){box.innerHTML=top+`<div class="hlFeat"><div class="hlSecH feat">${faSeal(22)} MER &amp; BBTRS in ${esc(pp.ci)} <small>· ${k}</small></div><div class="ptRow featRow">${ps.slice(0,k).map(T).join("")}</div></div><div class="hlSecH hlOther">Other practitioners <small>· ${n-k}</small></div><div class="ptGrid">${ps.slice(k).map((x,j)=>T(x,j+k)).join("")}</div>`;return}
   box.innerHTML=top+`<div class="ptGrid">${ps.map(T).join("")}</div>`;return}
  const by=new Map();ps.forEach(({p})=>{const seen=new Set();L0(p).forEach(l=>{const c=coOf(l)||OTHER;if(seen.has(c))return;seen.add(c);if(!by.has(c))by.set(c,[]);by.get(c).push({p,l})})});
  const groups=[...by.entries()].map(([c,list])=>({c,list,cities:cityList(c,list)})).sort((a,b)=>(a.c===OTHER)-(b.c===OTHER)||a.c.localeCompare(b.c,"en",{sensitivity:"base"}));
  groups.forEach(g=>{if(sel[g.c]&&!g.cities.some(x=>x.k===sel[g.c]))delete sel[g.c]});
  model={groups,grid:[],gridLabel:""};
  box.innerHTML=browseHtml(groups);return;
  box.innerHTML=groups.map((g,gi)=>`<section class="ptSec" data-gi="${gi}"><div class="ptH"><b>${flagC(g.c)} ${esc(g.c)} <span>· ${g.list.length}</span>${(n=>n?`<i class="hlN" title="MER &amp; BBTRS practitioners">★ ${n}</i>`:"")(g.list.filter(x=>faIsHL(x.p)).length)}</b>${g.cities.length>1?`<button type="button" class="cPick${sel[g.c]?" on":""}" data-pick="${gi}">${esc(chipLabel(g))} ▾</button>`:""}${g.c===OTHER?"":`<button type="button" class="ptAll" data-all="${gi}">See all ›</button>`}</div><div class="ptRow" data-c="${esc(g.c)}">${rowHtml(gi)}</div></section>`).join("");
  box.querySelectorAll(".ptRow[data-c]").forEach(r=>{if(keep[r.dataset.c])r.scrollLeft=keep[r.dataset.c]})};
 function filteredNoPlace(){const el=qp();const hf=()=>true;if(!el)return filtered().filter(hf);const v=el.value;el.value="";const r=filtered().filter(p=>!nearScope||nearScope.ok(p)).filter(hf);el.value=v;return r}
 // ---- city picker (bottom list)
 const cp=document.createElement("div");cp.id="ptCity";cp.className="ptCity";cp.hidden=true;cp.innerHTML=`<div class="ptDim"></div><div class="ptCityBox" role="dialog" aria-modal="true" aria-label="Choose a city"><div class="ptCityH"><b></b><button type="button" class="ptX" aria-label="Close">✕</button></div><div class="ptCityL"></div></div>`;document.body.appendChild(cp);
 let cpG=-1;
 function showCity(gi){const g=model.groups[gi];if(!g)return;cpG=gi;cp.querySelector(".ptCityH b").textContent=`Cities in ${flagC(g.c)} ${g.c}`;
  cp.querySelector(".ptCityL").innerHTML=[`<button type="button" data-k=""${!sel[g.c]?' class="on"':""}><span>All cities</span><i>${g.list.length}</i></button>`].concat(g.cities.map(c=>`<button type="button" data-k="${esc(c.k)}"${sel[g.c]===c.k?' class="on"':""}><span>${esc(c.n)}</span><i>${c.c}</i></button>`)).join("");
  cp.hidden=false;hpush("city")}
 function hideCity(){cp.hidden=true}
 cp.addEventListener("click",e=>{const t=e.target;if(t.closest(".ptX")||t.classList.contains("ptDim")){hideCity();hpop("city");return}
  const b=t.closest("[data-k]");if(!b)return;const g=model.groups[cpG];hideCity();hpop("city");if(!g)return;
  if(b.dataset.k)sel[g.c]=b.dataset.k;else delete sel[g.c];
  const sec=document.querySelector(`#items .ptSec[data-gi="${cpG}"]`);if(!sec)return;const row=sec.querySelector(".ptRow");row.innerHTML=rowHtml(cpG);row.scrollLeft=0;
  const pk=sec.querySelector(".cPick");if(pk){pk.textContent=chipLabel(g)+" ▾";pk.classList.toggle("on",!!sel[g.c])}});
 // ---- practitioner sheet
 const sh=document.createElement("div");sh.id="ptSheet";sh.className="ptSheet";sh.hidden=true;
 sh.innerHTML=`<div class="ptDim"></div><div class="ptBox" role="dialog" aria-modal="true" aria-label="Practitioner"><div class="ptTop"><button type="button" class="ptBk"><b>‹</b> <span></span></button><button type="button" class="ptX" aria-label="Close">✕</button></div><div class="ptScroll"></div></div>`;
 document.body.appendChild(sh);
 const scr=sh.querySelector(".ptScroll");let cur={list:[],i:0,label:""};
 function contacts(p){if(!p.consent)return `<p class="muted"><i>Not public yet</i></p>`;
  const t=document.createElement("div");t.innerHTML=card(p);const cbs=t.querySelector(".cbs"),tel=t.querySelector("a.tel");const ig=faIg(p);
  const web=(p.website&&faWebOk(p.website)?`<div class="ptWeb">🌐 ${link(p.website)}</div>`:"")+(p.website2&&faWebOk(p.website2)?`<div class="ptWeb">🌐 ${link(p.website2)}</div>`:"");
  if(me)return web+(tel?`<div class="ptWeb">📞 ${tel.outerHTML}</div>`:"")+(ig?`<div class="ptWeb"><a class="igl" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">${IG} @${esc(ig)}</a></div>`:"")+(cbs?cbs.outerHTML:"");
  return web+`<div class="ptLock"><p>🔒 <b>Contact details are for members.</b> Log in or create a free account to message, WhatsApp, email${ig?" or see Instagram":""}.</p>${cbs?cbs.outerHTML:""}<button type="button" class="gold ptLogin">Log in to contact</button></div>`}
 function paint(){const p=cur.list[cur.i];if(!p)return;const many=cur.list.length>1;
  sh.querySelector(".ptBk span").textContent=cur.label||"Back";
  const hl=faIsHL(p);
  scr.innerHTML=`<div class="ptHero">${p.photo?`<img src="${esc(p.photo)}" alt="">`:`<span class="ptFb">${esc(initials(p.name||practiceTitle(p)))}</span>`}${hl?`<span class="shSeal">${faSeal(60)}<span class="hlTag">${faHLTag(p)}</span></span>`:""}${many?`<div class="ptNav"><button type="button" class="ptPrev" aria-label="Previous">‹</button><span>${cur.i+1} of ${cur.list.length}${cur.label?" · "+esc(cur.label):""}</span><button type="button" class="ptNext" aria-label="Next">›</button></div>`:""}</div>
  <div class="ptBody" data-pid="${esc(p.id||"")}"><h3>${esc(practiceTitle(p))}</h3>${hl?`<div class="shHl">${faLaurel(24)} ${faHLLine(p)}</div>`:""}${String(p.practice_name||"").trim()&&p.name?`<div class="ptWho">${esc(p.name)}</div>`:""}
  <div class="ptLocs">${locLine(p)}</div><div class="chs ptMods">${(p.mods||[]).filter(Boolean).map(x=>`<span class="ch${faHLChip(x)?" hlCh":""}">${esc(x)}</span>`).join("")}</div>
  ${p.bio?`<div class="ptBio">${esc(p.bio)}</div><button type="button" class="ptMore">Read more</button>`:""}
  ${contacts(p)}<button type="button" class="ptMap">📍 Show on map</button></div>`;
  scr.scrollTop=0;const b=scr.querySelector(".ptBio"),m=scr.querySelector(".ptMore");if(b&&m)requestAnimationFrame(()=>{if(b.scrollHeight<=b.clientHeight+2)m.hidden=true});if(srcOv!=="self_preview")view(p)}
 function open(list,i,label,so){srcOv=so||"";cur={list,i,label:label||""};const was=!sh.hidden;sh.hidden=false;document.body.classList.add("ptOpen");paint();if(!was)hpush("sheet")}
 function hideSheet(){sh.hidden=true;sh.classList.remove("selfPrev");document.body.classList.remove("ptOpen")}
 function close(){if(sh.hidden)return;hideSheet();hpop("sheet")}
 const step=k=>{if(cur.list.length<2)return;cur.i=(cur.i+k+cur.list.length)%cur.list.length;paint()};
 window.faSheetClose=()=>{close();if(!cp.hidden){hideCity();hpop("city")}};
 openNJ=function(id){const ps=all().filter(p=>p.photo&&p.consent!==false&&p.created_at).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,21);let i=ps.findIndex(p=>p.id===id);if(i<0){const p=all().find(x=>x.id===id);if(!p)return;open([p],0,"Newly joined","newly_joined");return}open(ps,i,"Newly joined","newly_joined")};
 // v0.23.100: my own listing exactly as a logged-out visitor sees it (no view stat)
 window.faPreviewMe=p=>{const sv=me;me=null;try{sh.classList.add("selfPrev");open([p],0,"My profile","self_preview")}finally{me=sv}};
 window.faOpenPract=id=>{const p=all().find(x=>x.id===id);if(p)open([p],0,"")};
 sh.addEventListener("click",e=>{const t=e.target;
  if(t.closest(".ptX")||t.closest(".ptBk")||t.classList.contains("ptDim")){close();return}
  if(t.closest(".ptPrev")){step(-1);return}if(t.closest(".ptNext")){step(1);return}
  if(t.closest(".ptMore")){const b=scr.querySelector(".ptBio");if(b)b.classList.add("open");t.closest(".ptMore").hidden=true;return}
  if(t.closest(".ptLogin")){const p=cur.list[cur.i];close();pendingWa=p&&p.id||null;fillLastEmail();setMode(false);show("auth");return}
  if(t.closest(".ptMap")){const p=cur.list[cur.i];close();show("map");setTimeout(()=>{if(!map||!p)return;map.invalidateSize();const loc=placeLoc(p)||pins(p)[0];if(loc&&loc.lat!=null)map.setView([loc.lat,loc.lng],14)},120);return}
  if(t.closest("[data-msg]"))setTimeout(close,0)});
 let tx=0,ty=0;const bx=sh.querySelector(".ptBox");
 bx.addEventListener("touchstart",e=>{const t=e.touches[0];tx=t.clientX;ty=t.clientY},{passive:true});
 bx.addEventListener("touchend",e=>{const t=e.changedTouches[0],dx=t.clientX-tx,dy=t.clientY-ty;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1)},{passive:true});
 document.addEventListener("keydown",e=>{if(!cp.hidden&&e.key==="Escape"){hideCity();hpop("city");return}if(sh.hidden)return;if(e.key==="Escape")close();else if(e.key==="ArrowRight")step(1);else if(e.key==="ArrowLeft")step(-1)});
 // ---- list clicks
 const lst=$("#list");if(lst)lst.addEventListener("click",e=>{const t=e.target;
  const nb=t.closest("[data-nav]");if(nb){if(nb.dataset.nav==="back"){if(HS[HS.length-1]==="seeall"){hpop("seeall");leaveSeeAll()}else leaveSeeAll()}else{const pp=placeParts();if(pp)setPlaceV("co:"+pp.co)}return}
  const fc=t.closest("[data-clr]");if(fc){const k=fc.dataset.clr;
   if(k==="place"){if(HS[HS.length-1]==="seeall"){hpop("seeall");leaveSeeAll()}else leaveSeeAll()}
   else if(k==="mod"){const el=$("#listFilter");if(el){el.value="";syncModFilter("listFilter")}}
   else if(k==="name"){const el=$("#qName");if(el){el.value="";renderList();renderMarkers()}}
   else if(k==="near")clearNear();return}
  const md=t.closest("[data-mod]");if(md){const el=$("#listFilter");if(el){if(md.dataset.mod&&![...el.options].some(o=>o.value===md.dataset.mod)){const o=document.createElement("option");o.value=o.textContent=md.dataset.mod;el.appendChild(o)}el.value=md.dataset.mod;syncModFilter("listFilter")}return}
  const rg=t.closest("[data-reg]");if(rg){BR=rg.dataset.reg;hpush("region");renderList();const m=document.querySelector("main");if(m)m.scrollTop=0;return}
  if(t.closest('[data-br="home"]')){BR=null;hpop("region");renderList();const m=document.querySelector("main");if(m)m.scrollTop=0;return}
  const cb=t.closest("[data-co]");if(cb){const r=BR;if(!goPlace("co:"+cb.dataset.co,cb.dataset.co))return;BR=r;nav();return}
  const pl=t.closest("[data-pl]");if(pl){setPlaceV(pl.dataset.pl);return}
  const pk=t.closest("[data-pick]");if(pk){showCity(+pk.dataset.pick);return}
  const a=t.closest("[data-all]");if(a){const g=model.groups[+a.dataset.all];if(!g)return;const k=sel[g.c];const o=k&&g.cities.find(x=>x.k===k);
   const m=document.querySelector("main");const top0=m?m.scrollTop:0;const v=o?`ci:${o.n}|${g.c}`:`co:${g.c}`;fillPlaces();
   if(![...qp().options].some(x=>x.value===v))return;savedTop=top0;seeAll=true;hpush("seeall");setPlaceV(v);if(m)m.scrollTop=0;return}
  const tt=t.closest(".ptT");if(!tt)return;const g=+tt.dataset.g,i=+tt.dataset.i;
  if(g<0)open(model.grid,i,model.gridLabel);else{const G=model.groups[g];if(!G)return;const k=sel[G.c];open(inCity(G,k).map(x=>x.p),i,k?chipLabel(G):(G.c===OTHER?"Online & other":G.c))}});
 backToPract=function(pid){show("list");let n=0;const go=()=>{const p=all().find(x=>x.id===pid);n++;if(p&&(p.email||p.phone||!(p.has_email||p.whatsapp)||n>=30)){window.faOpenPract(pid);return}if(n>=30)return;setTimeout(go,200)};setTimeout(go,300)};
 try{fillPlaces();renderList()}catch(e){}
})();

// ===== v0.23.100: social-style My profile: header card + focused edit sheets =====
// The existing #profForm stays the single source of fields + save logic; each sheet shows one section of it.
const PE_SECS={photo:["📷","Photo & name"],mods:["🌿","Practices"],locs:["📍","Locations"],about:["✍️","About you"],contacts:["💬","Contacts & links"]};
let peSec="",peSnap="",peBusy=false;
const peWrap=document.createElement("div");peWrap.id="peSheet";peWrap.className="peSheet";peWrap.hidden=true;
peWrap.innerHTML=`<div class="peDim"></div><div class="peBox" role="dialog" aria-modal="true"></div>`;document.body.appendChild(peWrap);
function peHome(){const f=$("#profForm"),v=$("#profView");if(f&&v&&f.previousElementSibling!==v)v.after(f)}
function peSnapNow(){const f=$("#profForm");return JSON.stringify([...f.elements].map(e=>e.type==="checkbox"?e.checked:e.type==="file"?"":e.value))+"|"+JSON.stringify(myMods)+"|"+(photoData||"")}
function peGo(sec){peSec=sec;const f=$("#profForm");f.dataset.sec=sec;f.querySelectorAll(".fsec").forEach(x=>x.classList.toggle("on",x.dataset.sec===sec));
 const [ic,t]=PE_SECS[sec]||["",""];f.querySelector(".peIc").textContent=ic;f.querySelector(".peT").textContent=t;peWrap.querySelector(".peBox").setAttribute("aria-label",t)}
function peOpen(sec,pick){const f=$("#profForm");if(!f||peSec)return;$("#status").textContent="";peWrap.querySelector(".peBox").appendChild(f);f.classList.add("asSheet");f.hidden=false;peGo(sec);
 {const lb=f.querySelector(".phbtn"),pv=$("#phPrev");if(lb&&lb.firstChild&&lb.firstChild.nodeType===3)lb.firstChild.textContent=pv&&!pv.hidden?"📷 Change photo":"📷 Add profile photo"}
 peWrap.hidden=false;document.body.classList.add("peOpen");peSnap=peSnapNow();const sb=f.querySelector(".peSave");sb.disabled=false;sb.textContent="Save";f.scrollTop=0;
 if(window.faH)faH.push("pe");if(pick)$("#photo").click()}
function peHide(){const f=$("#profForm");peWrap.hidden=true;document.body.classList.remove("peOpen");f.classList.remove("asSheet");f.querySelectorAll(".fsec").forEach(x=>x.classList.remove("on"));delete f.dataset.sec;f.hidden=true;peHome();peSec=""}
const peDirty=()=>!!peSec&&peSnapNow()!==peSnap;
function peCancel(fromBack){if(!peSec)return;
 if(peBusy||(peDirty()&&!confirm("Discard your changes?"))){if(fromBack&&window.faH)faH.push("pe");return}
 if(!fromBack&&window.faH)faH.pop("pe");peHide();photoData=null;loadProf()}// reload the saved values into the form
window.faPeBack=()=>{if(typeof bSet!=="undefined"&&!bSet.hidden){bSetHide();return}peCancel(true)};
window.faPeDone=()=>{if(!peSec)return;peHide();if(window.faH)faH.pop("pe")};
// run the existing save handler (validation, geocoding, country rules, phone prefix, places, consent, news)
async function peRun(){const f=$("#profForm"),st=$("#status");if(peBusy)return false;
 if(!f.name.value.trim()){st.textContent="Please add your full name.";if(peSec)peGo("photo");return false}
 peBusy=true;try{await f.onsubmit({preventDefault(){},target:f})}catch(e){st.textContent="Could not save: "+e.message}finally{peBusy=false}
 const msg=st.textContent,ok=/^Saved/.test(msg);
 if(!ok&&peSec&&/country/i.test(msg))peGo("locs");
 if(ok){const bm=$("#bMsg"),soft=msg.replace(/^Saved ✓\s*/,"").replace(/\s*Tip:.*$/,"");if(bm)bm.textContent=soft}
 return ok}
(function(){const f=$("#profForm");if(!f)return;
 f.querySelector(".peSave").onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="Saving…";await peRun();if(peSec){b.disabled=false;b.textContent="Save"}};
 f.querySelector(".peCancel").onclick=()=>peCancel(false);f.querySelector(".peX").onclick=()=>peCancel(false);
 peWrap.querySelector(".peDim").onclick=()=>peCancel(false);
 f.addEventListener("keydown",e=>{if(peSec&&e.key==="Enter"&&e.target.tagName!=="TEXTAREA"){e.preventDefault();if(e.target.id==="modNew")$("#modAdd").click()}});
 document.addEventListener("keydown",e=>{if(peSec&&e.key==="Escape")peCancel(false)})})();
function profViewB(p,v,f){const h2=document.querySelector("#profile h2");if(h2)h2.textContent="My profile";$("#logCard").hidden=true;$("#pCancel").hidden=true;
 const S=x=>String(x||"").trim();
 const L=(p.locations&&p.locations.length)?p.locations:[{city:p.city,country:p.country,address:p.address}];
 const lt=l=>{if(isOnline(l))return"🌐 Online";const co=S(l.country);return `${co?flagOf(co)+" ":""}${esc([faCity(l.city||""),co].filter(Boolean).join(", "))}`};
 const l0=L[0]||{},co0=S(l0.country||p.country),where=isOnline(l0)?"Online":[faCity(l0.city||""),co0].filter(Boolean).join(", ");
 const nm=S(p.name)||S(p.practice_name)||"Your name",pn=S(p.practice_name)&&S(p.name)?S(p.practice_name):"";
 const web=[p.website,p.website2].some(u=>S(u)&&faWebOk(u)),ig=!!faIg(p),ph=S(p.phone),em=S(p.email),mods=(p.mods||[]).filter(Boolean);
 const items=[[!!p.photo,20,"Add a photo","photo"],[!!S(p.name),10,"Add your name","photo"],[mods.length>0,15,"Pick your practices","mods"],[!!co0,15,"Add where you work","locs"],[!!S(p.bio),15,"Add a short bio","about"],[!!(ph||em),15,"Add a phone or email","contacts"],[web||ig,10,"Add a website or Instagram","contacts"]];
 const pct=items.reduce((t,x)=>t+(x[0]?x[1]:0),0),nx=items.find(x=>!x[0]);
 const chip=(on,t)=>`<span class="${on?"":"miss"}">${t}</span>`;
 const card=(sec,ic,t,body,miss)=>`<button type="button" class="bCard" data-pe="${sec}"><span class="ic">${ic}</span><span class="sb"><b>${t}</b>${body}</span><span class="ed${miss?" add":""}">${miss?"+ Add":"Edit"}</span></button>`;
 const sw=(k,on)=>`<label class="bSw"><input type="checkbox" data-tgl="${k}"${on?" checked":""}><i></i></label>`;
 v.innerHTML=`<div class="bHead"><div class="bCover"></div><span class="bPub${p.consent?"":" off"}" data-bact="settings" role="button" tabindex="0" aria-label="Privacy settings"><i></i>${p.consent?"Public":"Hidden"}</span>
 <button type="button" class="bAv" data-pe="photo" data-pick="1" aria-label="Change photo">${p.photo?`<img src="${esc(p.photo)}" alt="">`:`<span class="bFb">${esc(initials(nm))}</span>`}<span class="bCam">📷</span>${faIsHL(p)?`<span class="bHlSeal">${faSeal(40)}<span class="hlTag">${faHLTag(p)}</span></span>`:""}</button>
 <h3>${esc(nm)}</h3>${pn?`<div class="bPn">${esc(pn)}</div>`:""}${where?`<div class="bWhere">📍 ${isOnline(l0)?"🌐 ":co0?flagOf(co0)+" ":""}${esc(where)}</div>`:""}
 ${mods.length?`<div class="bChs">${mods.map(m=>`<span${faHLChip(m)?` class="hlCh"`:""}>${esc(m)}</span>`).join("")}</div>`:""}
 <div class="bBtns"><button type="button" class="ghost" data-bact="preview">👁 Preview</button><button type="button" class="gold" data-pe="photo">✏️ Photo & name</button></div></div>
 <p id="bMsg" class="msg"></p>
 <button type="button" class="bMeter"${nx?` data-pe="${nx[3]}"`:""}><span class="mt"><b>Profile ${pct}% complete</b>${nx?`<em>${nx[2]} ›</em>`:`<em class="ok">✓ All set</em>`}</span><span class="bar"><i style="width:${pct}%"></i></span></button>
 <div id="jrCard" class="jrCard">${faJourneyHTML()}</div>
 ${card("about","✍️","About you",S(p.bio)?`<p>${esc(p.bio)}</p>`:`<p>Tell visitors how you work.</p>`,!S(p.bio))}
 ${card("contacts","💬","Contacts & links",`<span class="cRow">${chip(!!ph,"📞 Phone")}${chip(!!(ph&&p.whatsapp),"💬 WhatsApp")}${chip(!!em,"✉️ Email")}${chip(web,"🌐 Website")}${chip(ig,"📸 Instagram")}</span>`,!(ph||em))}
 ${card("mods","🌿","Practices",mods.length?`<span class="cRow">${mods.map(m=>`<span>${esc(m)}</span>`).join("")}</span>`:`<p>Pick what you practise.</p>`,!mods.length)}
 ${card("locs","📍","Locations",`<p>${L.slice(0,3).map(lt).join("<br>")}</p><small>${L.length} of 3 places</small>`,!co0)}
 <button type="button" class="bSet" data-bact="settings">⚙ Settings</button>
 <div class="bOut"><button type="button" class="ghost" id="pOut2">Log out</button></div>`;
 v.hidden=false;f.hidden=true;
 v.onclick=e=>{const t=e.target;
  const a=t.closest("[data-bact]");if(a){const k=a.dataset.bact;if(k==="preview"){if(window.faPreviewMe)faPreviewMe(p)}else if(k==="settings")bSetOpen(p);else show("log");return}
  if(t.closest("#pOut2")){logout();return}
  const s=t.closest("[data-pe]");if(s)peOpen(s.dataset.pe,!!s.dataset.pick)};
 if(!bSet.hidden)bSetPaint(p)}
// ---- Privacy & newsletter sheet (show publicly + newsletter switches; GDPR: hide listing / withdraw consent any time)
const bSet=document.createElement("div");bSet.id="bSetSheet";bSet.className="peSheet";bSet.hidden=true;
bSet.innerHTML=`<div class="peDim"></div><div class="peBox bSetBox" role="dialog" aria-modal="true" aria-label="Privacy and newsletter"><div class="peTop"><span class="peIc">⚙</span><b class="peT">Settings</b><button type="button" class="peX" aria-label="Close">✕</button></div><div class="bSetL"></div><p class="bSetMsg msg"></p><button type="button" class="ghost bSetDone">Done</button></div>`;document.body.appendChild(bSet);
function bSetPaint(p){const sw=(k,on)=>`<label class="bSw"><input type="checkbox" data-tgl="${k}"${on?" checked":""}><i></i></label>`;
 bSet.querySelector(".bSetL").innerHTML=`<div class="bTgl"><span class="ic">👁</span><span class="sb"><b>Show me publicly</b><small>${p.consent?"Visitors can find you on the map and in the list.":"You are hidden. Turn on to appear on the map and in the list."}</small></span>${sw("consent",!!p.consent)}</div>
 <div class="bTgl"><span class="ic">📰</span><span class="sb"><b>FasciApp newsletter</b><small>New videos, free sessions, practitioners near you. Unsubscribe any time.</small></span>${sw("news_optin",!!p.news_optin)}</div>`}
function bSetOpen(p){bSetPaint(p);bSet.querySelector(".bSetMsg").textContent="";bSet.hidden=false;document.body.classList.add("peOpen");if(window.faH)faH.push("pe")}
function bSetHide(){bSet.hidden=true;if(!peSec)document.body.classList.remove("peOpen")}
function bSetClose(){if(bSet.hidden)return;bSetHide();if(window.faH)faH.pop("pe")}
bSet.addEventListener("click",e=>{if(e.target.closest(".peX")||e.target.closest(".bSetDone")||e.target.classList.contains("peDim"))bSetClose()});
document.addEventListener("keydown",e=>{if(!bSet.hidden&&e.key==="Escape")bSetClose()});
bSet.addEventListener("change",async e=>{const c=e.target.closest("[data-tgl]");if(!c||peBusy)return;const k=c.dataset.tgl,on=c.checked,fm=$("#profForm"),bm=bSet.querySelector(".bSetMsg");
 if(!fm[k])return;fm[k].checked=on;bSet.querySelectorAll("[data-tgl]").forEach(x=>x.disabled=true);bm.textContent="Saving…";
 const ok=await peRun();
 if(ok){if(k==="news_optin"&&me)me.news_optin=on;bm.textContent="";showToast(k==="consent"?(on?"You are public ✓":"Hidden from the map ✓"):(on?"Subscribed ✓":"Unsubscribed ✓"))}
 else{fm[k].checked=!on;c.checked=!on;bm.textContent=$("#status").textContent||"Could not save."}
 bSet.querySelectorAll("[data-tgl]").forEach(x=>x.disabled=false)});

// ===== v0.23.100: MER & BBTRS highlight: gold seal, always sorted first, featured city row, filter =====
// Detection: an exact "MER" or "BBTRS" entry in the practices list (mods); "MER Coaching" etc. do not count.
var faHLOnly=false;
function faHL(p){const m=((p&&p.mods)||[]).map(x=>String(x||"").trim().toUpperCase());return{mer:m.includes("MER"),bb:m.includes("BBTRS")}}
function faIsHL(p){const h=faHL(p);return h.mer||h.bb}
function faHLCmp(a,b){return faIsHL(b)-faIsHL(a)}
function faHLChip(m){return /^(MER|BBTRS)$/i.test(String(m||"").trim())}
function faHLTag(p){const h=faHL(p);return h.mer&&h.bb?"MER · BBTRS":h.mer?"MER":h.bb?"BBTRS":""}
function faHLLine(p){const h=faHL(p);return h.mer&&h.bb?"MER &amp; BBTRS practitioner":h.mer?"MER practitioner":"BBTRS practitioner"}
function faPoly(cx,cy,R,r,n){let d="";for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,q=i%2?r:R;d+=(i?"L":"M")+(cx+q*Math.cos(a)).toFixed(2)+" "+(cy+q*Math.sin(a)).toFixed(2)}return d+"Z"}
function faSeal(s){return `<svg class="bSeal" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><path d="${faPoly(24,24,23,20.5,16)}" fill="url(#faG)"/><circle cx="24" cy="24" r="16.2" fill="url(#faC)" stroke="#FBE7B5" stroke-width=".9"/><circle cx="24" cy="24" r="13.6" fill="none" stroke="#C99E67" stroke-width=".6" stroke-dasharray="1.2 1.6"/><path d="${faPoly(24,24.6,10,4.3,5)}" fill="url(#faG)"/></svg>`}
function faLaurel(s){let L="";const lf=(x,y,a)=>`<ellipse cx="${x}" cy="${y}" rx="4.2" ry="1.9" transform="rotate(${a} ${x} ${y})" fill="url(#faG2)"/>`;
 for(let i=0;i<7;i++){const deg=105+i*(140/6),t=deg*Math.PI/180,x=24+18*Math.cos(t),y=24+18*Math.sin(t),rot=deg+115;L+=lf(x.toFixed(1),y.toFixed(1),rot.toFixed(0))+lf((48-x).toFixed(1),y.toFixed(1),(180-rot).toFixed(0))}
 return `<svg class="bLaurel" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true">${L}<path d="M20 43 Q24 40 28 43" stroke="url(#faG2)" stroke-width="1.6" fill="none"/><path d="${faPoly(24,24,11,4.7,5)}" fill="url(#faG)" stroke="#FBE7B5" stroke-width=".5"/></svg>`}
// filter chips: "MER & BBTRS only" (list hides others, map dims them) + MER / BBTRS shortcuts for the practice filter
function faHLPaint(){const lf=$("#listFilter");document.querySelectorAll("[data-hl]").forEach(b=>{const k=b.dataset.hl,on=k==="only"?faHLOnly:!!(lf&&lf.value===k);b.classList.toggle("on",on);b.setAttribute("aria-pressed",on?"true":"false")})}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-hl]");if(!b)return;const k=b.dataset.hl;
 if(k==="only")faHLOnly=!faHLOnly;else{const lf=$("#listFilter");if(!lf)return;lf.value=lf.value===k?"":([...lf.options].some(o=>o.value===k)?k:"")}
 faHLPaint();syncModFilter()});

document.querySelectorAll('#hlChips .hlChip[data-hl]').forEach(b=>{b.innerHTML=faSeal(16)+" "+b.dataset.hl});
// v0.23.100: live network count on the welcome screen + list header (same source as the map count); hidden until data is loaded
function faLiveCount(){const a=all().filter(p=>pins(p).length),c=new Set();a.forEach(p=>countriesOf(p).forEach(x=>c.add(x)));
 document.querySelectorAll(".liveCount").forEach(el=>{if(!a.length||!faFresh){el.hidden=true;return}el.innerHTML=`<b>${a.length}</b> practitioner${a.length>1?"s":""} in <b>${c.size}</b> countr${c.size>1?"ies":"y"}`;el.hidden=false})}
// ===== v0.23.100: "Your training journey" card (Session log) in My profile, under the completeness meter =====
const JR_SEEN="fa_journey_seen";
function faRelDay(d){if(!d)return"";const [y,m,dd]=String(d).slice(0,10).split("-").map(Number);if(!y)return"";const t=new Date();t.setHours(0,0,0,0);const x=new Date(y,m-1,dd);const n=Math.round((t-x)/864e5);
 if(n<=0)return"today";if(n===1)return"yesterday";if(n<7)return n+" days ago";if(n<30){const w=Math.floor(n/7);return w===1?"1 week ago":w+" weeks ago"}if(n<365){const mo=Math.floor(n/30);return mo===1?"1 month ago":mo+" months ago"}return"over a year ago"}
function faJourneyHTML(){const n=sess.length,G=GOAL,step=G/7,ms=[...Array(8)].map((_,i)=>Math.round(i*step)),pct=Math.min(100,n/G*100),mk=Math.max(5,Math.min(95,pct));
 const nxt=ms.find(v=>v>n),last=sess.reduce((m,s)=>s.date&&(!m||s.date>m)?s.date:m,"");const seen=(()=>{try{return !!localStorage.getItem(JR_SEEN)}catch(e){return true}})();
 const line=n===0?`🌱 <b>Start your journey:</b> log your first session`:n>=G?`🎉 <b>Goal reached!</b> ${n} sessions logged`:`🎯 <b>${nxt-n} more</b> to reach ${nxt} sessions`;
 return `<div class="jrHd" data-jr="open" role="button" tabindex="0"><span class="ic">📒</span><span><b>Session log</b> <em class="jrAka">(your training journey)</em><small>${n} of ${G} sessions</small></span>${seen?"":`<span class="jrNew">NEW</span>`}</div>
 <div class="jrTrk" aria-label="${n} of ${G} sessions"><span class="f" style="width:${pct}%"></span>${ms.map(v=>`<span class="dot${v<=n?" on":""}" style="left:${v/G*100}%">${v<=n&&v?"✓":""}</span>`).join("")}<span class="me" style="left:${mk}%">You · ${n}</span></div>
 <div class="jrLb">${ms.map(v=>`<span>${v}</span>`).join("")}</div>
 <div class="jrNx">${line}</div>
 <button type="button" class="jrCta" data-jr="add">+ Log today's session</button>
 <div class="jrSub"><span>${last?"Last logged "+faRelDay(last):""}</span><button type="button" class="jrOpen" data-jr="open">Open log ›</button></div>`}
function faJourneyPaint(){const c=$("#jrCard");if(c)c.innerHTML=faJourneyHTML()}
function faLogOpen(add){try{localStorage.setItem(JR_SEEN,"1")}catch(e){}if(window.faH)faH.push("log");show("log");
 if(add)setTimeout(()=>{try{if(!editId)resetSF();const f=$("#sessForm");if(f){f.scrollIntoView({block:"start",behavior:"smooth"});const i=f.querySelector('[name="initials"]');i&&i.focus({preventScroll:true})}}catch(e){}},350)}
document.addEventListener("click",e=>{const j=e.target.closest&&e.target.closest("[data-jr]");if(!j)return;faLogOpen(j.dataset.jr==="add")});
{const _show=show;show=function(t){if(t!=="log"&&window.faH)faH.pop("log");return _show.apply(this,arguments)};window.show=show}


/* v0.23.131 Body Reading hub (admin only) */
let scanSb=null;async function scanLoad(){const L=$("#scList");if(!L)return;let ad=false;try{ad=isAdmin()}catch(e){}if(!ad){show("map");return}
 L.innerHTML='<p class="scEm">Loading…</p>';
 try{if(!scanSb){const c=window.FASCIAPP_CONFIG||{};scanSb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:window.localStorage,storageKey:"fasciapp-auth"}})}
  const {data,error}=await scanSb.from("assessments").select("id,client_name,created_at,report_ready_at,report").order("created_at",{ascending:false});if(error)throw error;const A=data||[];
  $("#scCount").textContent="My assessments · "+A.length;
  L.innerHTML=A.length?A.map(a=>'<a class="scLi" href="assessment-results.html?id='+encodeURIComponent(a.id)+'"><div>'+esc(a.client_name||"Unnamed client")+'<small>'+new Date(a.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})+'</small></div><span class="scSt">'+(a.report_ready_at||a.report?"Ready":"Preparing")+'</span></a>').join(""):'<p class="scEm">No records yet.</p>'}
 catch(e){L.innerHTML='<p class="scEm">Could not load records. <a href="assessment-results.html" style="color:#C99E67">Open records</a></p>'}}
