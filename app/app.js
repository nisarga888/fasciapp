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
function placeOptions(){const cityMap=new Map(),countryMap=new Map();
 mappedPeople().forEach(p=>{const locs=(p.locations&&p.locations.length)?p.locations:[p];const seenC=new Set(),seenCo=new Set();
  locs.forEach(l=>{const city=isOnline(l)?"":faCity(l.city),country=String(l.country||"").trim();
   if(city&&country){const k=fold(city)+"|"+fold(country);if(!seenC.has(k)){seenC.add(k);const o=cityMap.get(k)||{city,country,n:0};o.n++;cityMap.set(k,o)}}
   if(country){const k=fold(country);if(!seenCo.has(k)){seenCo.add(k);const o=countryMap.get(k)||{country,n:0};o.n++;countryMap.set(k,o)}}})});
 return{cities:[...cityMap.values()].sort((a,b)=>{const c=a.city.localeCompare(b.city,"en",{sensitivity:"base"});return c||a.country.localeCompare(b.country,"en",{sensitivity:"base"})}),
  countries:[...countryMap.values()].sort((a,b)=>a.country.localeCompare(b.country,"en",{sensitivity:"base"}))}}
function fillFilter(){try{fillPlaces()}catch(e){}
const mods=modCounts();const opts=`<option value="">All practices</option>`+mods.map(([m,n])=>`<option value="${esc(m)}">${esc(m)} (${n})</option>`).join("");
 const lf=$("#listFilter");if(lf){const v=lf.value;lf.innerHTML=opts;lf.value=[...lf.options].some(o=>o.value===v)?v:""}
 const cf=$("#filter");if(cf){const v=cf.value;cf.innerHTML=`<option value="">All locations</option>`+placeOptions().countries.map(c=>`<option value="${esc(c.country)}">${esc(c.country)} (${c.n})</option>`).join("");cf.value=[...cf.options].some(o=>o.value===v)?v:""}}
function syncModFilter(){renderMarkers();renderList()}
const mpins=p=>{const c=fold(mapCountry());return c?pins(p).filter(l=>fold(String(l.country||"").trim())===c):pins(p)};
const mapCountry=()=>($("#filter")&&$("#filter").value)||"";
function mapPeople(){const c=fold(mapCountry());const ps=filtered();if(!c)return ps;return ps.filter(p=>((p.locations&&p.locations.length)?p.locations:[p]).some(l=>fold(String(l.country||"").trim())===c))}
// Location filter: native <select> (iOS picker). Values: "co:<country>", "ci:<city>|<country>", "free:<text>" (deep links)
function closePlaceMenu(){}function openPlaceMenu(){}
function fillPlaces(){const el=$("#qPlace");if(!el||el.tagName!=="SELECT")return;const v=el.value;const {cities,countries}=placeOptions();
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
let showT=null;function afterShow(t){try{if(t==="map"){initMap();setTimeout(()=>{map.invalidateSize();fitPins(!didFit)},80)}if(t==="list")renderList();
 if(t==="profile"){(async()=>{if(!me){me=await DB.session().catch(()=>null);hdr()}if(!me){$("#needLogin").hidden=false;$("#profForm").hidden=true;$("#profView").hidden=true;$("#logCard").hidden=true;return}profEdit=wantForm;wantForm=false;loadProf()})()}
 if(t==="log")loadLog();if(t==="learn"){renderLearn();const n=window.FASCIAPP_NEWS;if(n){localStorage.setItem(LAB_SEEN,n.id);renderNews()}}if(t==="inbox"&&MSG_ON)renderInbox()}catch(e){console.warn(e)}}
function hdr(){document.body.classList.toggle("authed",!!me);if(window.faJoinUpd)faJoinUpd();{const lb=$("#labBtn");if(lb)lb.hidden=!!me}$("#tabInbox").hidden=!MSG_ON;$("#hEdit").hidden=!me;$("#hOut").hidden=!me;$("#hIn").hidden=!!me}
const PKEY="fa_people_v1";function cachedPeople(){try{const j=JSON.parse(localStorage.getItem(PKEY)||"null");return Array.isArray(j)?j:null}catch(e){return null}}
const byName=l=>(l||[]).slice().sort((a,b)=>practiceTitle(a).localeCompare(practiceTitle(b),undefined,{sensitivity:"base"}));
function paintFromCache(){const c=cachedPeople();if(!c||people.length)return false;people=byName(c);fillFilter();renderMarkers();renderList();if(!didFit)fitPins(true);return true}
async function refresh(){try{people=byName(await DB.list());try{localStorage.setItem(PKEY,JSON.stringify(people))}catch(e){}}catch(e){console.warn(e);if(!people.length)people=cachedPeople()||[]}fillFilter();renderMarkers();renderList();if(!didFit)fitPins(true)}

// navigation
$("#goLook").onclick=()=>show("map");$("#authLook").onclick=e=>{e.preventDefault();show("map")};
async function goPractitioner(){if(!me){me=await DB.session().catch(()=>null);hdr()}
 if(me){show("profile");return}fillLastEmail();setMode(false);show("auth")}
$("#goPract").onclick=()=>goPractitioner();
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));
const logoHome=$("#logoHome");if(logoHome)logoHome.onclick=()=>show("splash");
$$("nav button").forEach(b=>b.onclick=()=>show(b.dataset.t));
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
 $("#authLook").parentElement.hidden=true;$("#resetMsg").textContent="";$("#newPw").value="";$("#newPw2").value=""}
function setMode(up){signUpMode=up;showAuthMain();fillLastEmail();$$(".seg").forEach(s=>s.hidden=false);
 $("#tabUp").classList.toggle("on",up);$("#tabIn").classList.toggle("on",!up);
 $("#authTitle").textContent=up?"Create your free account":"Welcome back";$("#authBtn").textContent=up?"Create account":"Sign in";$("#authMsg").textContent="";
 $("#pw").autocomplete=up?"new-password":"current-password";$("#agreeL").hidden=!up;$("#newsL").hidden=!up;$("#forgotWrap").hidden=up}
$("#tabUp").onclick=()=>setMode(true);$("#tabIn").onclick=()=>setMode(false);
$("#forgotLink").onclick=e=>{e.preventDefault();showForgot()};
$("#forgotBack").onclick=()=>{setMode(false)};
$("#forgotForm").onsubmit=async e=>{e.preventDefault();const em=$("#forgotEmail").value.trim().toLowerCase(),m=$("#forgotMsg");
 if(!em){m.textContent="Please enter your email.";return}m.textContent="Sending…";
 try{await DB.resetPassword(em);m.textContent="Check your email — we sent a link to set a new password. It may take a minute to arrive."}catch(err){m.textContent=err.message||"Could not send the reset link."}};
$("#resetForm").onsubmit=async e=>{e.preventDefault();const a=$("#newPw").value,b=$("#newPw2").value,m=$("#resetMsg");
 if(a.length<6){m.textContent="Use at least 6 characters.";return}if(a!==b){m.textContent="The two passwords do not match.";return}
 m.textContent="Saving…";
 try{me=await DB.updatePassword(a);m.textContent="Password updated ✓ You are signed in.";
  try{const u=new URL(location.href);u.searchParams.delete("reset");history.replaceState({},"",u.pathname+u.search+u.hash.replace(/access_token=[^&]+/g,""))}catch(e){}
  hdr();await refresh();msgInit();setTimeout(()=>show("profile"),600)}catch(err){m.textContent=err.message||"Could not update password."}};
$("#authForm").onsubmit=async e=>{e.preventDefault();const em=$("#email").value.trim().toLowerCase(),pw=$("#pw").value,m=$("#authMsg");if(signUpMode&&!$("#agree").checked){m.textContent="Please confirm you are 18+ and accept the Terms and Privacy Policy.";return}m.textContent="…";
 try{me=signUpMode?await DB.signUp(em,pw,{news_optin:!!$("#newsOpt").checked}):await DB.signIn(em,pw);rememberEmail(em);m.textContent="";hdr();refresh();msgInit();const next=pendingChat,nb=pendingBreath,nw=pendingWa;pendingChat=null;pendingBreath=null;pendingWa=null;if(nw){backToPract(nw)}else if(nb){show("learn");if(nb!=="lab")setTimeout(()=>{try{FasciBreath.openIntro(nb)}catch(x){}},200)}else if(next){show("inbox");openChat(next)}else show("profile")}catch(err){m.textContent=err.message}};

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
function fold(s){try{return String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()}catch(e){return String(s||"").toLowerCase()}}
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
 const cbs=(msgBtn||wa||mail)?`<div class="cbs cbsRow">${msgBtn}${wa}${mail}</div>`:"";
 const c=p.consent?phone+(p.website?`<br>🌐 ${link(p.website)}`:"")+(p.website2?`<br>🌐 ${link(p.website2)}`:"")+(igHandle(p.instagram)?`<br><a class="igl" href="https://instagram.com/${esc(igHandle(p.instagram))}" target="_blank" rel="noopener" aria-label="Instagram @${esc(igHandle(p.instagram))}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg> @${esc(igHandle(p.instagram))}</a>`:"")+cbs:"<br><i>Not public yet</i>";
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
 if(!sheet)return;$("#sheetSub").textContent=list.length+" practitioner"+(list.length>1?"s":"");
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
function count(){const mc=mapCountry();if(mc){const n=mapPeople().length;$("#count").innerHTML=`<b>${n}</b> practitioner${n===1?"":"s"} in <b>${esc(mc)}</b>`;return}const a=all().filter(p=>pins(p).length),c=new Set();a.forEach(p=>countriesOf(p).forEach(x=>c.add(x)));
 $("#count").innerHTML=a.length?`<b>${a.length}</b> practitioner${a.length>1?"s":""} in <b>${c.size}</b> countr${c.size>1?"ies":"y"} joined the network`:"Be the first practitioner on the map ✨"}
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
 box.innerHTML=`<div class="njH"><b>Newly joined</b><small>Swipe →</small></div><div class="njRow">${ps.map(p=>{const locs=(p.locations&&p.locations.length?p.locations:[p]);const co=locs.map(countryOfLoc).find(Boolean)||"";const fn=String(p.name||"").trim().split(/\s+/)[0]||"";
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
 if(has&&!profEdit){v.innerHTML=`<div class="item myCard">${card(p)}</div><p class="muted myCardNote">${p.consent?"This is how your card appears on the map and list.":"Your card is not public yet. Tick “Show me publicly” in Edit profile to appear on the map."}</p><div class="grid2"><button type="button" class="gold" id="pEditBtn">Edit profile</button><button type="button" class="ghost" id="pOut2">Log out</button></div>`;v.hidden=false;f.hidden=true;$("#pEditBtn").onclick=()=>{profEdit=true;v.hidden=true;f.hidden=false;window.scrollTo(0,0)};$("#pOut2").onclick=()=>logout()}
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
  profEdit=false;await loadProf();try{$("#profile").scrollIntoView({block:"start"})}catch(x){}
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
 try{paintFromCache()}catch(e){}
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
 if(wantReset){// give the client a moment to pick up hash tokens from the email link
  setTimeout(async()=>{if(recovery)return;const s=await DB.session().catch(()=>null);if(s||wantReset)showResetForm()},400)}
})();

// ===== Session log =====
const GOAL=70;let sess=[],editId=null,sessLoaded=false;
function paintLogCard(){const n=sess.length;$("#lcNum").textContent=`${n} / ${GOAL}`;$("#lcFill").style.width=Math.min(100,n/GOAL*100)+"%";$("#lcSub").textContent=n>=GOAL?"✓ complete":`${GOAL-n} sessions to go`}
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
 doc.setFontSize(8);doc.setTextColor(150,200,200);doc.text("Fascia connects us all",40,34);
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
function loadInbox(){if(!inboxP)inboxP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="inbox.js?v=0.23.83";s.onload=()=>res(window.FA_INBOX);s.onerror=e=>{inboxP=null;rej(e)};document.head.appendChild(s)});return inboxP}
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
   <div class="lbody"><div class="lbadges">${badge}${state}</div><b>${esc(x.title)}</b>${x.by?`<small class="lby">${esc(x.by)}</small>`:""}${x.line?`<small class="muted">${esc(x.line)}</small>`:""}<span class="lfoot">${foot}</span></div></button>`}).join("")}</div>`}).join("");if(window.FasciBreath&&FasciBreath.mountLab)try{FasciBreath.mountLab()}catch(e){}}
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
 $$(".newsSlot").forEach(s=>{s.innerHTML=n&&!dis?`<div class="newsCard" role="status"><small>What’s new</small><p>${esc(n.text)}</p>${n.button&&(n.tab||"learn")!==(s.closest(".screen")||{}).id?`<button type="button" class="newsGo" data-tab="${esc(n.tab||"learn")}">${esc(n.button)} →</button>`:""}<button type="button" class="newsX" aria-label="Dismiss">✕</button></div>`:""});
 const dot=$("#labDot");if(dot)dot.hidden=!(n&&localStorage.getItem(LAB_SEEN)!==n.id)}
document.addEventListener("click",e=>{const n=window.FASCIAPP_NEWS;if(!n)return;
 if(e.target.closest(".newsX")){const d=newsList(NEWS_DIS);if(!d.includes(n.id)){d.push(n.id);localStorage.setItem(NEWS_DIS,JSON.stringify(d.slice(-20)))}renderNews();return}
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

// ===== v0.23.83: country list set, login-to-contact gate, News in the Lab pill =====
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
 const n=window.FASCIAPP_NEWS;if(n&&n.text){let t=String(n.text).replace(/^\s*new in the lab\s*[:·-]\s*/i,"");const i=t.indexOf(". ");if(i>0&&i<40)t=t.slice(0,i)+":"+t.slice(i+1);$("#labNewTxt").textContent=t}else{const nw=$("#labNew");if(nw)nw.hidden=true}
 const open=()=>{document.body.classList.add("labOpen");sh.setAttribute("aria-hidden","false");try{ev("lab_pill",{props:{step:"open"},source:"app"})}catch(e){}};
 const close=()=>{document.body.classList.remove("labOpen");sh.setAttribute("aria-hidden","true")};
 btn.onclick=e=>{e.stopPropagation();open()};dim.onclick=close;$("#labLater").onclick=close;
 $("#labJoin").onclick=()=>{close();if(window.faAuthFor)faAuthFor(true,"lab");else{setMode(true);show("auth")}};
 btn.hidden=!!me})();
// ===== v0.23.83: "Join as a practitioner" buttons (map pill + list button); hidden once the user has a listing =====
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
// ===== v0.23.83: List v2: countries A–Z with per-country city picker, See all grid with breadcrumb, sheet with back/prev/next, history-aware back =====
// Display-only city names: merge local spellings, drop district/postcode/state suffixes, fix ALL CAPS (database values are untouched)
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
 const view=p=>{try{const s=src();window.FA_ev&&FA_ev("pract_view",{pid:p.id,source:s,once:"v"+p.id+s})}catch(e){}};
 const chips=(p,n)=>{const m=(p.mods||[]).filter(Boolean);return m.slice(0,n).map(x=>`<span class="ch">${esc(x)}</span>`).join("")+(m.length>n?`<span class="ch more">+${m.length-n}</span>`:"")};
 const pic=p=>p.photo?`<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async">`:`<span class="ptFb">${esc(initials(p.name||practiceTitle(p)))}</span>`;
 const nm=p=>String(p.name||"").trim()||practiceTitle(p);
 const flagC=c=>c===OTHER?"🌐":flagOf(c);
 const IG='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
 // ---- history: back closes the city list / sheet, then leaves See all, then default
 const HS=[];let skip=0;
 const hpush=k=>{try{history.pushState({fa:k},"")}catch(e){}HS.push(k)};
 const hpop=k=>{if(HS.length&&HS[HS.length-1]===k){HS.pop();skip++;try{history.back()}catch(e){skip--}}};
 window.addEventListener("popstate",()=>{if(skip){skip--;return}const k=HS.pop();if(k==="sheet")hideSheet();else if(k==="city")hideCity();else if(k==="seeall")leaveSeeAll()});
 // ---- model
 let model={groups:[],grid:[],gridLabel:""};const sel={};let seeAll=false,savedTop=0;
 const cityList=(c,list)=>{const m=new Map();list.forEach(({p})=>{const seen=new Set();L0(p).filter(l=>(coOf(l)||OTHER)===c).forEach(l=>{const n=cityOf(l);if(!n)return;const k=fold(n);if(seen.has(k))return;seen.add(k);const o=m.get(k)||{k,n,c:0};o.c++;m.set(k,o)})});return[...m.values()].sort((a,b)=>b.c-a.c||a.n.localeCompare(b.n,"en",{sensitivity:"base"}))};
 const inCity=(g,k)=>!k?g.list:g.list.map(({p})=>{const l=L0(p).find(l=>(coOf(l)||OTHER)===g.c&&fold(cityOf(l))===k);return l?{p,l}:null}).filter(Boolean);
 function tile(p,loc,g,i,nCh,d){const co=loc?coOf(loc):"";const fl=co?flagOf(co):"";const city=cityOf(loc)||co;
  return `<button type="button" class="ptT" data-tid="${esc(p.id||"")}" data-g="${g}" data-i="${i}" aria-label="${esc(practiceTitle(p))}${city?", "+esc(city):""}">${pic(p)}${d!=null?`<span class="ptKm">${Math.round(d)} km</span>`:""}<span class="ptOv"><b>${esc(nm(p))}</b><small>${fl?fl+" ":""}${esc(city)}</small><span class="chs">${chips(p,nCh)}</span></span></button>`}
 function rowHtml(gi){const g=model.groups[gi];const list=inCity(g,sel[g.c]);return list.map(({p,l},i)=>tile(p,l,gi,i,1,null)).join("")}
 function chipLabel(g){const k=sel[g.c];if(!k)return"All cities";const o=g.cities.find(x=>x.k===k);return o?o.n:"All cities"}
 function nav(){const box=$("#listNav"),pp=placeParts(),lst=$("#list");const on=!!pp;if(lst)lst.classList.toggle("ptPlace",on);if(!box)return;box.hidden=!on;if(!on){box.innerHTML="";return}
  box.innerHTML=`<button type="button" class="ptBack" data-nav="back"><b>‹</b> All countries</button><span class="ptCrumb">${pp.ci?`<button type="button" data-nav="co">${flagOf(pp.co)} ${esc(pp.co)}</button><em>›</em><b>${esc(pp.ci)}</b>`:`<b>${flagOf(pp.co)} ${esc(pp.co)}</b>`}</span>`}
 function setPlaceV(v){const el=qp();if(!el)return;fillPlaces();if(v&&![...el.options].some(o=>o.value===v))return;el.value=v;el.dispatchEvent(new Event("change"))}
 function leaveSeeAll(){const top=savedTop,was=seeAll;seeAll=false;const el=qp();if(el&&el.value){el.value="";el.dispatchEvent(new Event("change"))}else renderList();if(was)requestAnimationFrame(()=>{const m=document.querySelector("main");if(m)m.scrollTop=top})}
 renderList=function(){renderNewJ();const ps=filtered().filter(p=>!nearScope||nearScope.ok(p)).map(p=>({p,d:dist(p)}));
  const _pe=qp(),n=ps.length,q=placeV(),mod=($("#listFilter")&&$("#listFilter").value)||"",nameQ=(($("#qName")||{}).value||"").trim();
  const active=!!(nearScope||q||mod||nameQ);
  if(here&&active)ps.sort((a,b)=>a.d-b.d);else ps.sort((a,b)=>azKey(a.p).localeCompare(azKey(b.p),undefined,{sensitivity:"base"}));
  const pp=placeParts();
  const lc=$("#listCount");if(lc)lc.textContent=(n?`${n} practitioner${n===1?"":"s"}`:"No practitioners")+(nearScope?` ${nearScope.label}`:pp?` in ${pp.ci||pp.co}`:"");
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
   top=`<div class="fChips">${fc.join("")}</div>`;
   if(pp){const allIn=filteredNoPlace().filter(p=>L0(p).some(l=>fold(l.country||"")===fold(pp.co)));const cs=cityList(pp.co,allIn.map(p=>({p})));
    if(cs.length>1)top+=`<div class="ptCities">${`<button type="button" class="cChip${pp.ci?"":" on"}" data-pl="co:${esc(pp.co)}">All ${esc(pp.co)} <i>${allIn.length}</i></button>`}${cs.map(c=>`<button type="button" class="cChip${pp.ci&&fold(pp.ci)===c.k?" on":""}" data-pl="ci:${esc(c.n)}|${esc(pp.co)}">${esc(c.n)} <i>${c.c}</i></button>`).join("")}</div>`}}
  if(!n){model={groups:[],grid:[],gridLabel:""};box.innerHTML=top+"<p class=muted>No practitioners match your search.</p>";return}
  if(active){model={groups:[],grid:ps.map(x=>x.p),gridLabel:pp?(pp.ci||pp.co):nearScope?"Near me":"Results"};
   box.innerHTML=top+`<div class="ptGrid">${ps.map(({p,d},i)=>tile(p,placeLoc(p)||L0(p)[0],-1,i,2,here?d:null)).join("")}</div>`;return}
  const by=new Map();ps.forEach(({p})=>{const seen=new Set();L0(p).forEach(l=>{const c=coOf(l)||OTHER;if(seen.has(c))return;seen.add(c);if(!by.has(c))by.set(c,[]);by.get(c).push({p,l})})});
  const groups=[...by.entries()].map(([c,list])=>({c,list,cities:cityList(c,list)})).sort((a,b)=>(a.c===OTHER)-(b.c===OTHER)||a.c.localeCompare(b.c,"en",{sensitivity:"base"}));
  groups.forEach(g=>{if(sel[g.c]&&!g.cities.some(x=>x.k===sel[g.c]))delete sel[g.c]});
  model={groups,grid:[],gridLabel:""};
  box.innerHTML=groups.map((g,gi)=>`<section class="ptSec" data-gi="${gi}"><div class="ptH"><b>${flagC(g.c)} ${esc(g.c)} <span>· ${g.list.length}</span></b>${g.cities.length>1?`<button type="button" class="cPick${sel[g.c]?" on":""}" data-pick="${gi}">${esc(chipLabel(g))} ▾</button>`:""}${g.c===OTHER?"":`<button type="button" class="ptAll" data-all="${gi}">See all ›</button>`}</div><div class="ptRow" data-c="${esc(g.c)}">${rowHtml(gi)}</div></section>`).join("");
  box.querySelectorAll(".ptRow[data-c]").forEach(r=>{if(keep[r.dataset.c])r.scrollLeft=keep[r.dataset.c]})};
 function filteredNoPlace(){const el=qp();if(!el)return filtered();const v=el.value;el.value="";const r=filtered().filter(p=>!nearScope||nearScope.ok(p));el.value=v;return r}
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
  const t=document.createElement("div");t.innerHTML=card(p);const cbs=t.querySelector(".cbs"),tel=t.querySelector("a.tel");const ig=igHandle(p.instagram);
  const web=(p.website?`<div class="ptWeb">🌐 ${link(p.website)}</div>`:"")+(p.website2?`<div class="ptWeb">🌐 ${link(p.website2)}</div>`:"");
  if(me)return web+(tel?`<div class="ptWeb">📞 ${tel.outerHTML}</div>`:"")+(ig?`<div class="ptWeb"><a class="igl" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">${IG} @${esc(ig)}</a></div>`:"")+(cbs?cbs.outerHTML:"");
  return web+`<div class="ptLock"><p>🔒 <b>Contact details are for members.</b> Log in or create a free account to message, WhatsApp, email${ig?" or see Instagram":""}.</p>${cbs?cbs.outerHTML:""}${ig?`<div class="cbs cbsRow"><button type="button" class="cb ig" data-gate="ig">${IG} Instagram</button></div>`:""}<button type="button" class="gold ptLogin">Log in to contact</button></div>`}
 function paint(){const p=cur.list[cur.i];if(!p)return;const many=cur.list.length>1;
  sh.querySelector(".ptBk span").textContent=cur.label||"Back";
  scr.innerHTML=`<div class="ptHero">${p.photo?`<img src="${esc(p.photo)}" alt="">`:`<span class="ptFb">${esc(initials(p.name||practiceTitle(p)))}</span>`}${many?`<div class="ptNav"><button type="button" class="ptPrev" aria-label="Previous">‹</button><span>${cur.i+1} of ${cur.list.length}${cur.label?" · "+esc(cur.label):""}</span><button type="button" class="ptNext" aria-label="Next">›</button></div>`:""}</div>
  <div class="ptBody" data-pid="${esc(p.id||"")}"><h3>${esc(practiceTitle(p))}</h3>${String(p.practice_name||"").trim()&&p.name?`<div class="ptWho">${esc(p.name)}</div>`:""}
  <div class="ptLocs">${locLine(p)}</div><div class="chs ptMods">${(p.mods||[]).filter(Boolean).map(x=>`<span class="ch">${esc(x)}</span>`).join("")}</div>
  ${p.bio?`<div class="ptBio">${esc(p.bio)}</div><button type="button" class="ptMore">Read more</button>`:""}
  ${contacts(p)}<button type="button" class="ptMap">📍 Show on map</button></div>`;
  scr.scrollTop=0;const b=scr.querySelector(".ptBio"),m=scr.querySelector(".ptMore");if(b&&m)requestAnimationFrame(()=>{if(b.scrollHeight<=b.clientHeight+2)m.hidden=true});view(p)}
 function open(list,i,label){cur={list,i,label:label||""};const was=!sh.hidden;sh.hidden=false;document.body.classList.add("ptOpen");paint();if(!was)hpush("sheet")}
 function hideSheet(){sh.hidden=true;document.body.classList.remove("ptOpen")}
 function close(){if(sh.hidden)return;hideSheet();hpop("sheet")}
 const step=k=>{if(cur.list.length<2)return;cur.i=(cur.i+k+cur.list.length)%cur.list.length;paint()};
 window.faSheetClose=()=>{close();if(!cp.hidden){hideCity();hpop("city")}};
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
