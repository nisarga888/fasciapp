const CITY={tallinn:[59.437,24.7536],warsaw:[52.2297,21.0122],warszawa:[52.2297,21.0122],krakow:[50.0647,19.945],"kraków":[50.0647,19.945],kielce:[50.8661,20.6286],berlin:[52.52,13.405],lesvos:[39.2645,26.2777],mytilene:[39.1047,26.5552]};
const DEMO=[];
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const LAST_EMAIL_KEY="fyp_last_email";
function rememberEmail(em){try{if(em)localStorage.setItem(LAST_EMAIL_KEY,em)}catch(e){}}
function lastEmail(){try{return localStorage.getItem(LAST_EMAIL_KEY)||""}catch(e){return""}}
function fillLastEmail(){const el=$("#email");if(el&&!el.value)el.value=lastEmail()}
var MSG_OK=false,msgs=[],chatWith=null,pollT=null,unsub=null,pendingChat=null;
let me=null,people=[],here=null,map,layer,threads,photoData=null,signUpMode=true,didFit=false,labelZoom=8,lastLabels=null;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const all=()=>DEMO.concat(people);
const SUG=['MER', 'BBTRS', 'Breathwork', 'Massage', 'Craniosacral', 'Somatic therapy', 'Trauma therapy', 'Yoga'];let myMods=[];
function renderTags(){const set=[...new Set(SUG.concat(myMods))];$("#modBox").innerHTML=set.map(m=>`<button type="button" class="tag${myMods.includes(m)?" on":""}" data-m="${esc(m)}">${esc(m)}</button>`).join("");$$("#modBox .tag").forEach(b=>b.onclick=()=>{const m=b.dataset.m;myMods=myMods.includes(m)?myMods.filter(x=>x!==m):myMods.concat(m);renderTags()})}
function addTag(){const v=$("#modNew").value.trim().replace(/\s+/g," ");if(v&&!myMods.some(x=>x.toLowerCase()===v.toLowerCase()))myMods.push(v);$("#modNew").value="";renderTags()}
$("#modAdd").onclick=addTag;$("#modNew").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addTag()}};
function mappedPeople(){return all().filter(p=>pins(p).length)}
function modCounts(){const m=new Map();mappedPeople().forEach(p=>{[...new Set(p.mods||[])].forEach(mod=>{if(!mod)return;m.set(mod,(m.get(mod)||0)+1)})});
 return[...m.entries()].sort((a,b)=>a[0].localeCompare(b[0],"en",{sensitivity:"base"}))}
function placeOptions(){const cityMap=new Map(),countryMap=new Map();
 mappedPeople().forEach(p=>{const locs=(p.locations&&p.locations.length)?p.locations:[p];const seenC=new Set(),seenCo=new Set();
  locs.forEach(l=>{const city=String(l.city||"").trim(),country=String(l.country||"").trim();
   if(city&&country){const k=fold(city)+"|"+fold(country);if(!seenC.has(k)){seenC.add(k);const o=cityMap.get(k)||{city,country,n:0};o.n++;cityMap.set(k,o)}}
   if(country){const k=fold(country);if(!seenCo.has(k)){seenCo.add(k);const o=countryMap.get(k)||{country,n:0};o.n++;countryMap.set(k,o)}}})});
 return{cities:[...cityMap.values()].sort((a,b)=>{const c=a.city.localeCompare(b.city,"en",{sensitivity:"base"});return c||a.country.localeCompare(b.country,"en",{sensitivity:"base"})}),
  countries:[...countryMap.values()].sort((a,b)=>a.country.localeCompare(b.country,"en",{sensitivity:"base"}))}}
function fillFilter(){const mods=modCounts();const opts=`<option value="">All practices</option>`+mods.map(([m,n])=>`<option value="${esc(m)}">${esc(m)} (${n})</option>`).join("");
 const v=($("#filter")&&$("#filter").value)||($("#listFilter")&&$("#listFilter").value)||"";
 ["filter","listFilter"].forEach(id=>{const el=$(`#${id}`);if(!el)return;el.innerHTML=opts;if([...el.options].some(o=>o.value===v))el.value=v;else el.value=""})}
function syncModFilter(fromId){const src=$(`#${fromId}`);if(!src)return;const v=src.value;["filter","listFilter"].forEach(id=>{const el=$(`#${id}`);if(el&&el!==src)el.value=v});renderMarkers();renderList()}
function closePlaceMenu(){const m=$("#placeMenu"),i=$("#qPlace");if(m)m.hidden=true;if(i)i.setAttribute("aria-expanded","false")}
function openPlaceMenu(){renderPlaceMenu();const m=$("#placeMenu"),i=$("#qPlace");if(m)m.hidden=false;if(i)i.setAttribute("aria-expanded","true")}
function renderPlaceMenu(){const box=$("#placeMenu");if(!box)return;const q=fold(($("#qPlace")&&$("#qPlace").value)||"");const {cities,countries}=placeOptions();
 const rows=[];
 cities.forEach(c=>{const label=`${c.city}, ${c.country}`,fl=fold(label);if(!q||fl.includes(q)||fold(c.city).includes(q)||fold(c.country).includes(q))rows.push({label,value:label,n:c.n,kind:"city"})});
 countries.forEach(c=>{const label=c.country,fl=fold(label);if(!q||fl.includes(q))rows.push({label,value:label,n:c.n,kind:"country"})});
 // de-dupe exact same value preferring city rows already added — country rows still useful
 if(!rows.length){box.innerHTML=`<li class="empty">No matching places</li>`;return}
 box.innerHTML=rows.map(r=>`<li role="option"><button type="button" data-place="${esc(r.value)}" data-kind="${r.kind}"><span>${esc(r.label)} <span class="n">(${r.n})</span></span></button></li>`).join("");
 $$("#placeMenu button").forEach(b=>b.onclick=()=>{const i=$("#qPlace");if(i)i.value=b.dataset.place;closePlaceMenu();renderList();renderMarkers()})}


function applyDeepLink(){try{const sp=new URLSearchParams(location.search);
 if(sp.get("join")==="1"){if(me){show("profile");return true}setMode(true);show("auth");return true}
 if(sp.get("search")==="1"){show("list");const q=$("#qPlace");if(q){requestAnimationFrame(()=>{q.focus();if(typeof openPlaceMenu==="function")openPlaceMenu()})}return true}
 const practice=(sp.get("practice")||sp.get("mod")||"").trim();const place=(sp.get("place")||sp.get("city")||"").trim();
 if(!practice&&!place)return false;fillFilter();let hit=false;
 if(practice){const want=fold(practice);["filter","listFilter"].forEach(id=>{const el=$(`#${id}`);if(!el)return;const opt=[...el.options].find(o=>o.value&&(fold(o.value)===want||fold(o.value).includes(want)||want.includes(fold(o.value))));if(opt){el.value=opt.value;hit=true}})}
 if(place){const q=$("#qPlace");if(q){q.value=place;hit=true}}
 if(hit){renderMarkers();renderList();show("list");return true}return false}catch(e){return false}}
window.show=show;function show(t){$$(".screen").forEach(s=>s.classList.toggle("active",s.id===t));const inApp=!["splash","auth"].includes(t);document.body.classList.toggle("in",inApp);
 $$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));window.scrollTo(0,0);showT=t;requestAnimationFrame(()=>setTimeout(()=>{if(showT===t)afterShow(t)},0))}
let showT=null;function afterShow(t){try{if(t==="map"){initMap();setTimeout(()=>{map.invalidateSize();fitPins(!didFit)},80)}if(t==="list")renderList();
 if(t==="profile"){(async()=>{if(!me){me=await DB.session().catch(()=>null);hdr()}if(!me){$("#needLogin").hidden=false;$("#profForm").hidden=true;return}loadProf()})()}
 if(t==="log")loadLog();if(t==="inbox")renderInbox()}catch(e){console.warn(e)}}
function hdr(){$("#tabInbox").hidden=false;$("#hEdit").hidden=!me;$("#hOut").hidden=!me;$("#hIn").hidden=!!me}
const PKEY="fa_people_v1";function cachedPeople(){try{const j=JSON.parse(localStorage.getItem(PKEY)||"null");return Array.isArray(j)?j:null}catch(e){return null}}
function paintFromCache(){const c=cachedPeople();if(!c||people.length)return false;people=c;fillFilter();renderMarkers();renderList();if(!didFit)fitPins(true);return true}
async function refresh(){try{people=await DB.list();try{localStorage.setItem(PKEY,JSON.stringify(people))}catch(e){}}catch(e){console.warn(e);if(!people.length)people=cachedPeople()||[]}fillFilter();renderMarkers();renderList();if(!didFit)fitPins(true)}

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
async function logout(){closeChat();if(unsub){unsub();unsub=null}msgUid=null;me=null;msgs=[];photoData=null;hdr();show("splash");$("#unread").hidden=true;DB.signOut().catch(()=>{}).then(()=>refresh())}
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
 $("#authTitle").textContent=up?"Create your practitioner account":"Welcome back";$("#authBtn").textContent=up?"Create account":"Sign in";$("#authMsg").textContent="";
 $("#pw").autocomplete=up?"new-password":"current-password";$("#agreeL").hidden=!up;$("#forgotWrap").hidden=up}
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
 try{me=signUpMode?await DB.signUp(em,pw):await DB.signIn(em,pw);rememberEmail(em);m.textContent="";hdr();refresh();msgInit();const next=pendingChat;pendingChat=null;if(next){show("inbox");openChat(next)}else show("profile")}catch(err){m.textContent=err.message}};

// helpers
function dist1(p,from){const R=6371,r=x=>x*Math.PI/180,dl=r(p.lat-from[0]),dg=r(p.lng-from[1]);const a=Math.sin(dl/2)**2+Math.cos(r(from[0]))*Math.cos(r(p.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function dist(p,from=here){if(!from)return null;const ds=pins(p).map(l=>dist1(l,from));return ds.length?Math.min(...ds):null}
const pins=p=>(p.locations&&p.locations.length?p.locations:[p]).filter(l=>l.lat!=null);
const locTxt=l=>[l.city,l.country].filter(Boolean).join(", ");
function fold(s){try{return String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()}catch(e){return String(s||"").toLowerCase()}}
function placeHit(p,q){if(!q)return true;const locs=(p.locations&&p.locations.length)?p.locations:[p];
 const {cities,countries}=placeOptions();
 const exactCity=cities.find(c=>fold(`${c.city}, ${c.country}`)===q);
 if(exactCity)return locs.some(l=>fold(l.city)===fold(exactCity.city)&&fold(l.country)===fold(exactCity.country));
 const exactCo=countries.find(c=>fold(c.country)===q);
 if(exactCo)return locs.some(l=>fold(l.country)===fold(exactCo.country));
 return locs.some(l=>fold([l.city,l.country,l.address].filter(Boolean).join(" ")).includes(q))}
function placeQ(){const el=$("#qPlace");return fold(el?el.value.trim():"")}
function filtered(){const f=($("#filter")&&$("#filter").value)||($("#listFilter")&&$("#listFilter").value)||"";const q=placeQ();
 return all().filter(p=>pins(p).length&&(!f||(p.mods||[]).includes(f))&&placeHit(p,q))}
function initials(n){return String(n||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase()}
function av(p,cls=""){return p.photo?`<img class="av ${cls}" src="${esc(p.photo)}" alt="">`:`<span class="av ${cls}">${esc(initials(p.name))}</span>`}
function practiceTitle(p){return String(p.practice_name||"").trim()||String(p.name||"").trim()||"Practitioner"}
function cardHead(p){const pn=String(p.practice_name||"").trim();return pn?`<b>${esc(pn)}</b><br><span class="who">${esc(p.name||"")}</span>`:`<b>${esc(p.name||"")}</b>`}
function link(u){if(!u)return"";const h=/^https?:\/\//.test(u)?u:"https://"+u;return `<a href="${esc(h)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,""))}</a>`}
function card(p){const pills=(p.mods||[]).map(m=>`<span class="pill">${esc(m)}</span>`).join("");
 const dg=String(p.phone||"").replace(/\D/g,"");
 const msgIc=`<span class="msgIc" aria-hidden="true"><svg class="msgRing" viewBox="0 0 24 24" width="16" height="16"><circle cx="20" cy="12" r="1.1" fill="currentColor"/><circle cx="17.7" cy="17.7" r="1.1" fill="currentColor"/><circle cx="12" cy="20" r="1.1" fill="currentColor"/><circle cx="6.3" cy="17.7" r="1.1" fill="currentColor"/><circle cx="4" cy="12" r="1.1" fill="currentColor"/><circle cx="6.3" cy="6.3" r="1.1" fill="currentColor"/><circle cx="12" cy="4" r="1.1" fill="currentColor"/><circle cx="17.7" cy="6.3" r="1.1" fill="currentColor"/></svg><svg class="msgBub" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H12l-3.2 2.8V17H4.5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"/></svg></span>`;
 const canMsg=!!(p.user_id&&(!me||p.user_id!==me.user_id));
 const msgBtn=canMsg?`<button type="button" class="cb msg" data-msg="${esc(p.user_id)}">${msgIc} Message on FasciApp</button>`:"";
 const wa=p.phone&&p.whatsapp&&dg?`<a class="cb wa" href="https://wa.me/${dg}" target="_blank" rel="noopener">${WA} WhatsApp</a>`:"";
 const mail=p.email?`<a class="cb mail" href="mailto:${esc(p.email)}">✉️ Email</a>`:"";
 const phone=p.phone?`<br><a class="tel" href="tel:${esc(p.phone)}">${esc(p.phone)}</a>`:"";
 const cbs=(msgBtn?`<div class="cbs cbsMsg">${msgBtn}</div>`:"")+(wa||mail?`<div class="cbs cbsRow">${wa}${mail}</div>`:"");
 const c=p.consent?phone+(p.website?`<br>🌐 ${link(p.website)}`:"")+(p.website2?`<br>🌐 ${link(p.website2)}`:"")+cbs:"<br><i>Not public yet</i>";
  return `<div class="row">${av(p)}<div>${cardHead(p)}<br>${pills}<br>${(p.locations&&p.locations.length?p.locations:[p]).map(l=>"📍 "+locTxt(l)).join("<br>")}${c}${p.bio?`<br><small>${esc(p.bio)}</small>`:""}</div></div>`}
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
function normCountry(c){c=String(c||"").trim().toLowerCase();if(!c)return"";return CC_ALIAS[c]||c}
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
function count(){const a=all().filter(p=>pins(p).length),c=new Set();a.forEach(p=>countriesOf(p).forEach(x=>c.add(x)));
 $("#count").innerHTML=a.length?`<b>${a.length}</b> practitioner${a.length>1?"s":""} in <b>${c.size}</b> countr${c.size>1?"ies":"y"} joined the network`:"Be the first practitioner on the map ✨"}
function fitPins(force){if(!map)return;const pts=[];filtered().forEach(p=>pins(p).forEach(l=>{if(l.lat!=null&&l.lng!=null)pts.push([+l.lat,+l.lng])}));
 if(!pts.length)return;if(!force&&didFit)return;
 try{if(pts.length===1)map.setView(pts[0],10,{animate:false});
 else{const b=L.latLngBounds(pts),span=Math.max(Math.abs(b.getNorth()-b.getSouth()),Math.abs(b.getEast()-b.getWest()));
  if(span>6){let best=pts[0],bestN=0;pts.forEach(a=>{const n=pts.filter(c=>Math.abs(a[0]-c[0])<1.2&&Math.abs(a[1]-c[1])<1.2).length;if(n>bestN){bestN=n;best=a}});
   map.setView(best,10,{animate:false})}
  else map.fitBounds(b,{padding:[56,56],maxZoom:10,animate:false})}
 didFit=true;lastLabels=labelsOn();setTimeout(()=>map&&map.invalidateSize(),60)}catch(e){console.warn(e)}}
function labelSides(entries){const sides=new Map();const order=entries.map((e,i)=>i).sort((a,b)=>entries[a].lng-entries[b].lng||entries[a].lat-entries[b].lat);
 order.forEach((ix,oi)=>{let side="right";if(oi){const cur=entries[ix],prev=entries[order[oi-1]];
  if(Math.abs(cur.lat-prev.lat)<.55&&Math.abs(cur.lng-prev.lng)<.55)side=sides.get(order[oi-1])==="right"?"left":"right"}
  sides.set(ix,side)});return sides}
function renderMarkers(){count();if(!layer)return;layer.clearLayers();if(threads)threads.clearLayers();const ps=filtered();
 const entries=[];ps.forEach(p=>pins(p).forEach(l=>{if(l.lat!=null&&l.lng!=null)entries.push({p,l,lat:+l.lat,lng:+l.lng})}));
 const sides=labelSides(entries),withLabel=labelsOn();lastLabels=withLabel;
 const ms=entries.map((e,i)=>{const side=sides.get(i)||"right";
  const m=L.marker([e.lat,e.lng],{icon:pinIcon(e.p,side,e.l,withLabel),fa:{p:e.p,l:e.l}});
  m.bindPopup(()=>card(e.p));return m});
 if(layer.addLayers)layer.addLayers(ms);else ms.forEach(m=>m.addTo(layer));
 if(here)L.circleMarker(here,{radius:7,color:"#fff",weight:3,fillColor:"#2a9d96",fillOpacity:1}).bindPopup("You are here").addTo(threads||layer);
 if(ps.length&&!didFit)fitPins(true)}
$("#filter")&&($("#filter").onchange=()=>syncModFilter("filter"));
$("#listFilter")&&($("#listFilter").onchange=()=>syncModFilter("listFilter"));
$("#qPlace")&&($("#qPlace").onfocus=()=>openPlaceMenu());
$("#qPlace")&&($("#qPlace").onclick=()=>openPlaceMenu());
$("#qPlace")&&($("#qPlace").oninput=()=>{openPlaceMenu();renderList()});
$("#qPlace")&&($("#qPlace").onkeydown=e=>{if(e.key==="Escape")closePlaceMenu()});
document.addEventListener("click",e=>{const c=$("#placeCombo");if(c&&!c.contains(e.target))closePlaceMenu()});
$("#listClear")&&($("#listClear").onclick=()=>{const q=$("#qPlace");if(q)q.value="";["filter","listFilter"].forEach(id=>{const el=$(`#${id}`);if(el)el.value=""});closePlaceMenu();renderMarkers();renderList()});
$("#listToMap")&&($("#listToMap").onclick=()=>{syncModFilter("listFilter");show("map");didFit=false;setTimeout(()=>{fitPins(true);map&&map.invalidateSize()},100)});
function geoOnce(){return new Promise(resolve=>{if(!navigator.geolocation||!window.isSecureContext)return resolve(null);
  navigator.geolocation.getCurrentPosition(pos=>resolve([pos.coords.latitude,pos.coords.longitude]),()=>resolve(null),{enableHighAccuracy:false,timeout:8000,maximumAge:3e5})})}
async function ipLoc(){for(const url of["https://ipapi.co/json/","https://get.geojs.io/v1/ip/geo.json"]){try{const ctrl=typeof AbortController!=="undefined"?new AbortController():null;const t=ctrl?setTimeout(()=>ctrl.abort(),4500):null;const r=await fetch(url,ctrl?{signal:ctrl.signal}:{});if(t)clearTimeout(t);if(!r.ok)continue;const j=await r.json();const lat=+(j.latitude??j.lat),lng=+(j.longitude??j.lng??j.lon);if(Number.isFinite(lat)&&Number.isFinite(lng))return[lat,lng]}catch(e){}}return null}
function showNearCity(msg){const box=$("#nearCity");if(!box)return;box.hidden=false;const m=$("#nearCityMsg");if(m)m.textContent=msg||"Location needs a hint — type your city."}
function hideNearCity(){const box=$("#nearCity");if(box)box.hidden=true;const m=$("#nearCityMsg");if(m)m.textContent=""}
function openNearestCard(p,loc){if(!map||!p||!loc)return;try{L.popup({maxWidth:320,className:"faPop"}).setLatLng([+loc.lat,+loc.lng]).setContent(card(p)).openOn(map)}catch(e){console.warn(e)}}
function applyNear(lat,lng){here=[+lat,+lng];didFit=true;hideNearCity();if(!map)initMap();show("map");renderMarkers();renderList();
 const ranked=filtered().map(p=>({p,d:dist(p)})).filter(x=>x.d!=null).sort((a,b)=>a.d-b.d);const best=ranked[0];
 if(!best){map.setView(here,7,{animate:false});showToast("Location set");return}
 const loc=pins(best.p)[0]||best.p;const km=Math.round(best.d);const name=practiceTitle(best.p);
 const open=()=>openNearestCard(best.p,loc);
 map.once("moveend",()=>setTimeout(open,80));
 try{map.fitBounds(L.latLngBounds([here,[+loc.lat,+loc.lng]]).pad(.45),{animate:false,maxZoom:11})}catch(e){map.setView([+loc.lat,+loc.lng],10,{animate:false})}
 setTimeout(open,500);showToast(`Closest: ${name}, ${km} km`)}
async function nearMe(){const btn=$("#near");if(btn)btn.disabled=true;try{
  showToast("Finding your location…");
  let pos=await geoOnce();if(!pos)pos=await ipLoc();
  if(pos){applyNear(pos[0],pos[1]);return}
  showNearCity("Couldn’t detect your location. Type your city instead.");showToast("Type your city below")}
 catch(e){showNearCity("Type your city to find practitioners nearby.");showToast("Type your city below")}
 finally{if(btn)btn.disabled=false}}
$("#near").onclick=()=>nearMe();
$("#nearCity")&&($("#nearCity").onsubmit=async e=>{e.preventDefault();const f=e.target,m=$("#nearCityMsg"),city=(f.city.value||"").trim();if(!city){m.textContent="Please enter a city.";return}
 m.textContent="Looking up "+city+"…";const g=await geocode("",city,"");if(!g){m.textContent="Could not find that city. Try another spelling.";showToast("City not found");return}
 applyNear(g[0],g[1])});
function renderList(){const ps=filtered().map(p=>({p,d:dist(p)}));if(here)ps.sort((a,b)=>a.d-b.d);
 const n=ps.length,q=($("#qPlace")&&$("#qPlace").value.trim())||"",mod=($("#listFilter")&&$("#listFilter").value)||($("#filter")&&$("#filter").value)||"";
 const lc=$("#listCount");if(lc)lc.textContent=n?`${n} practitioner${n===1?"":"s"}`:"No practitioners";
 const clr=$("#listClear");if(clr)clr.hidden=!(q||mod);
 $("#from").textContent=here?"Sorted by distance from you":"Tap 📍 Near me on the map to sort by distance";
 $("#items").innerHTML=ps.map(({p,d})=>`<div class="item">${d!=null?`<span class="d">${Math.round(d)} km</span>`:""}${card(p)}</div>`).join("")||"<p class=muted>No practitioners match your search.</p>"}

// profile
async function loadProf(){waTouched=false;$("#needLogin").hidden=!!me;$("#profForm").hidden=!me;if(!me)return;myMods=[];renderTags();setExtra([]);$("#who").textContent="Signed in as "+me.email;
 const p=await DB.mine().catch(()=>null);const f=$("#profForm");if(!p)return;["name","practice_name","address","city","country","email","website","website2","bio"].forEach(k=>{if(f[k])f[k].value=p[k]||""});splitPhone(p.phone,p.country);f.whatsapp.checked=!!p.whatsapp;waTouched=true;
 f.label.value=(p.locations?.[0]?.label)||"";setExtra((p.locations||[]).slice(1));f.consent.checked=!!p.consent;myMods=(p.mods||[]).slice();renderTags();if(p.photo){$("#phPrev").src=p.photo;$("#phPrev").hidden=false}}
const CCEN={Austria:[47.6,14.1],Belgium:[50.6,4.6],Bulgaria:[42.7,25.3],Croatia:[45.1,15.6],Cyprus:[35.0,33.2],Czechia:[49.8,15.5],Denmark:[56.0,9.5],Estonia:[58.7,25.0],Finland:[62.0,25.7],France:[46.6,2.4],Germany:[51.1,10.4],Greece:[39.3,22.0],Hungary:[47.2,19.4],Iceland:[64.9,-18.6],Ireland:[53.2,-8.2],Italy:[42.8,12.6],Latvia:[56.9,24.9],Lithuania:[55.3,23.9],Luxembourg:[49.8,6.1],Malta:[35.9,14.4],Netherlands:[52.2,5.5],Norway:[61.4,8.8],Poland:[52.1,19.4],Portugal:[39.6,-8.0],Romania:[45.9,25.0],Serbia:[44.0,20.9],Slovakia:[48.7,19.7],Slovenia:[46.1,14.8],Spain:[40.2,-3.6],Sweden:[62.0,15.0],Switzerland:[46.8,8.2],Ukraine:[49.0,31.4],"United Kingdom":[54.0,-2.5],Argentina:[-34.6,-64.0],Australia:[-25.7,134.5],Brazil:[-10.8,-52.9],Canada:[56.0,-96.8],Chile:[-33.4,-70.7],China:[35.0,103.8],Colombia:[4.1,-73.1],Egypt:[26.6,30.8],India:[22.9,79.6],Indonesia:[-2.2,117.4],Israel:[31.4,35.0],Japan:[36.5,138.0],Mexico:[23.9,-102.5],Morocco:[31.8,-7.1],"New Zealand":[-41.8,172.8],Philippines:[12.9,121.8],Singapore:[1.35,103.82],"South Africa":[-29.0,25.1],"South Korea":[36.4,127.9],Thailand:[15.1,101.0],Turkey:[39.1,35.2],"United Arab Emirates":[23.9,54.3],"United States":[39.8,-98.6],Vietnam:[16.6,106.3]};
async function geoTry(q){if(!q)return null;
 try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&email=info%40bodyawareness.ee&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});if(r.ok){const j=await r.json();if(j[0])return[+j[0].lat,+j[0].lon]}}catch(e){}
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
$("#profForm").onsubmit=async e=>{e.preventDefault();const f=e.target,st=$("#status");st.textContent="Locating your address…";
 const old=await DB.mine().catch(()=>null)||{};
 const p={name:f.name.value.trim(),practice_name:(f.practice_name&&f.practice_name.value||"").trim(),address:f.address.value.trim(),city:f.city.value.trim(),phone:e164(f.prefix.value,f.phone.value),whatsapp:f.whatsapp.checked,email:f.email.value.trim(),website:f.website.value.trim(),website2:(f.website2&&f.website2.value||"").trim(),bio:f.bio.value.trim(),consent:f.consent.checked,country:f.country.value,mods:myMods.slice(),photo:photoData||old.photo||null};
 let g=await geocode(p.address,p.city,p.country);let soft="";if(!g){g=[54.5,15.3,"none"];soft=" We couldn’t find the exact place, so your pin is approximate. You can edit the city any time."}else if(g[2]==="country"&&p.city)soft=" We couldn’t find “"+p.city+"”, so your pin is at the centre of "+p.country+".";
 Object.assign(p,{lat:g[0],lng:g[1]});p.locations=[{label:f.label.value.trim(),address:p.address,city:p.city,country:p.country,lat:g[0],lng:g[1]}];
 for(const b of $$("#extraLocs .xloc")){const l={label:b.querySelector("[data-k=label]").value.trim(),address:b.querySelector("[data-k=address]").value.trim(),city:b.querySelector("[data-k=city]").value.trim(),country:b.querySelector("[data-k=country]").value};
  if(!l.city&&!l.country)continue;st.textContent="Locating "+l.city+"…";await new Promise(r=>setTimeout(r,1100));const gg=await geocode(l.address,l.city,l.country);if(!gg)continue;l.lat=gg[0];l.lng=gg[1];p.locations.push(l)}
 try{await DB.save(p);await refresh();
  const tip=p.consent?"":" Tip: tick “show publicly” so others can find you.";
  st.textContent=`Saved ✓${soft}${tip}`;
  showToast("Saved ✓");
  didFit=true;
  show("map");
  const loc=(p.locations&&p.locations[0])||p;
  setTimeout(()=>{if(map&&loc.lat!=null){map.setView([+loc.lat,+loc.lng],13,{animate:false});map.invalidateSize()}},120);
 }catch(err){st.textContent="Could not save: "+err.message}};
$("#photo").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),s=256,m=Math.min(im.width,im.height);c.width=c.height=s;
 c.getContext("2d").drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);photoData=c.toDataURL("image/jpeg",.85);$("#phPrev").src=photoData;$("#phPrev").hidden=false};im.src=r.result};r.readAsDataURL(file)};

// start

function showToast(msg){const t=$("#toast");if(!t)return;t.textContent=msg||"Saved ✓";t.hidden=false;requestAnimationFrame(()=>t.classList.add("show"));
 clearTimeout(showToast._t);showToast._t=setTimeout(()=>{t.classList.remove("show");setTimeout(()=>{t.hidden=true},220)},2200)}
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
const GOAL=70;let sess=[],editId=null;
function fmtD(d){if(!d)return"";const [y,m,dd]=d.split("-");return `${dd}.${m}.${y}`}
function resetSF(){const f=$("#sessForm");f.reset();{const n=new Date();f.date.value=new Date(n-n.getTimezoneOffset()*6e4).toISOString().slice(0,10)}editId=null;$("#sfTitle").textContent="Add session";$("#sfBtn").textContent="Add session";$("#sfCancel").hidden=true}
async function loadLog(){$("#logNeed").hidden=!!me;$("#logBox").hidden=!me;if(!me)return;if(!editId)resetSF();try{sess=await DB.sessions()}catch(e){sess=[];$("#sfMsg").textContent="Could not load: "+e.message}renderLog()}
function renderLog(){const n=sess.length;$("#pNum").textContent=`${n} / ${GOAL} sessions`;$("#pPct").textContent=n>=GOAL?"✓ complete":`${GOAL-n} to go`;$("#pFill").style.width=Math.min(100,n/GOAL*100)+"%";
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
 <input data-k="label" hidden tabindex="-1" aria-hidden="true" maxlength="40"><input data-k="address" placeholder="Street address (optional)"><input data-k="city" placeholder="City (optional)"><select data-k="country" required>${opts}</select></div>`}
function addXloc(l={}){const box=$("#extraLocs");if(box.children.length>=2)return;box.insertAdjacentHTML("beforeend",xlocHtml());const b=box.lastElementChild;
 ["label","address","city","country"].forEach(k=>b.querySelector(`[data-k=${k}]`).value=l[k]||"");b.querySelector(".xdel").onclick=()=>{b.remove();xbtn()};xbtn()}
function xbtn(){$("#addLoc").hidden=$("#extraLocs").children.length>=2}
function setExtra(ls){$("#extraLocs").innerHTML="";ls.slice(0,2).forEach(addXloc);xbtn()}
$("#addLoc").onclick=()=>addXloc();

// ===== in-app messages =====
const nameOf=id=>{const p=all().find(x=>x.user_id===id);return p?p.name:"FasciApp member"};
const MKEY=()=>"fa_msgs_"+(me&&me.user_id);
function saveMsgs(){try{localStorage.setItem(MKEY(),JSON.stringify(msgs.filter(m=>!m.pending).slice(-300)))}catch(e){}}
function paintMsgs(){if(!me)return;const un=msgs.filter(m=>m.recipient===me.user_id&&!m.read_at).length;const b=$("#unread");b.textContent=un;b.hidden=!un;
 if(chatWith)renderChat();if($("#inbox").classList.contains("active"))renderInbox()}
function mergeMsg(m){if(!m||!m.id)return;const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],...m};
 else{const t=msgs.findIndex(x=>x.pending&&x.sender===m.sender&&x.recipient===m.recipient&&x.body===m.body);if(t>=0)msgs[t]=m;else msgs.push(m)}
 msgs.sort((a,b)=>a.created_at.localeCompare(b.created_at))}
let msgUid=null,lastPull=0;
async function msgInit(){if(me&&msgUid!==me.user_id){try{msgs=JSON.parse(localStorage.getItem(MKEY())||"[]")}catch(e){msgs=[]}}
 if(me&&msgs.length){MSG_OK=true;paintMsgs()}
 try{MSG_OK=!!(DB.msgOk&&await DB.msgOk())}catch(e){MSG_OK=false}hdr();renderMarkers();renderList();
 if(MSG_OK&&me){if(msgUid!==me.user_id){if(unsub)unsub();unsub=DB.onMsg?DB.onMsg(ev=>{const m=ev&&ev.new;if(m&&m.id){mergeMsg(m);saveMsgs();paintMsgs()}else pullMsgs()},me.user_id):null;msgUid=me.user_id}
  await pullMsgs()}}
async function pullMsgs(){if(!MSG_OK||!me)return;lastPull=Date.now();let got;try{got=await DB.msgs()}catch(e){return}
 const pend=msgs.filter(m=>m.pending);msgs=got;pend.forEach(p=>{if(!msgs.some(m=>m.sender===p.sender&&m.recipient===p.recipient&&m.body===p.body))msgs.push(p)});
 saveMsgs();paintMsgs()}
function convs(){const c={};msgs.forEach(m=>{const o=m.sender===me.user_id?m.recipient:m.sender;(c[o]=c[o]||[]).push(m)});
 return Object.entries(c).map(([o,l])=>({o,last:l[l.length-1],un:l.filter(m=>m.recipient===me.user_id&&!m.read_at).length})).sort((a,b)=>b.last.created_at.localeCompare(a.last.created_at))}
function renderInbox(){const box=$("#convs");
 if(!me){box.innerHTML=`<div class="card center"><p>Sign in to see messages and chat with practitioners.</p><button type="button" class="gold big1" data-go="auth">Sign in</button></div>`;
  box.querySelector("[data-go]")&&(box.querySelector("[data-go]").onclick=()=>show("auth"));return}
 if(!MSG_OK){box.innerHTML="<p class=muted>Messaging is not available right now. Try again later.</p>";return}
 const cs=convs();box.innerHTML=cs.map(c=>{const p=all().find(x=>x.user_id===c.o)||{name:nameOf(c.o)};return `<div class="item conv" data-c="${esc(c.o)}"><div class="row">${av(p)}<div><b>${esc(p.name)}</b>${c.un?` <span class="badge">${c.un}</span>`:""}<br><small class=muted>${esc(c.last.body.slice(0,80))}</small></div></div></div>`}).join("")||"<p class=muted>No messages yet. Open a practitioner on the map and tap Message.</p>";
 $$("#convs .conv").forEach(d=>d.onclick=()=>openChat(d.dataset.c))}
function openChat(id){if(!me){pendingChat=id;fillLastEmail();setMode(false);show("auth");return}pendingChat=null;chatWith=id;$("#chatName").textContent=nameOf(id);$("#chat").hidden=false;renderChat();$("#chatTxt").focus();
 if(!unsub&&MSG_OK)msgInit()}
function closeChat(){chatWith=null;$("#chat").hidden=true}
function renderChat(){if(!me||!chatWith)return;const all=msgs.filter(m=>(m.sender===chatWith&&m.recipient===me.user_id)||(m.recipient===chatWith&&m.sender===me.user_id));const l=all.slice(-30);
 const b=$("#chatLog");b.innerHTML=l.map(m=>`<div class="bub ${m.sender===me.user_id?"me":"them"}${m.pending?" pend":""}${m.failed?" fail":""}">${esc(m.body)}<small>${m.failed?"Not sent · tap to retry":m.pending?"Sending…":new Date(m.created_at).toLocaleString([], {dateStyle:"short",timeStyle:"short"})}</small></div>`).join("")||"<p class='muted center'>Say hello 👋</p>";b.scrollTop=b.scrollHeight;
 $$("#chatLog .bub.fail").forEach((d,i)=>d.onclick=()=>{const f=l.filter(m=>m.failed)[i];if(f){f.failed=false;sendNow(f);renderChat()}});
 const unread=l.filter(m=>m.sender===chatWith&&!m.read_at);if(unread.length){const now=new Date().toISOString();unread.forEach(m=>m.read_at=now);saveMsgs();
  const u=msgs.filter(m=>m.recipient===me.user_id&&!m.read_at).length,bd=$("#unread");bd.textContent=u;bd.hidden=!u;DB.markRead(chatWith).catch(()=>{})}}
function sendNow(tmp){tmp.pending=true;DB.sendMsg(tmp.recipient,tmp.body).then(row=>{const i=msgs.indexOf(tmp);if(i>=0)msgs.splice(i,1);mergeMsg(row);saveMsgs();paintMsgs()})
 .catch(err=>{tmp.pending=false;tmp.failed=true;$("#chatErr").textContent="Could not send: "+err.message;paintMsgs()})}
document.addEventListener("click",e=>{const t=e.target.closest("[data-msg]");if(t){e.preventDefault();openChat(t.dataset.msg)}});
$("#chatX").onclick=closeChat;
$("#chatForm").onsubmit=e=>{e.preventDefault();const t=$("#chatTxt"),v=t.value.trim().slice(0,1000);if(!v||!chatWith)return;$("#chatErr").textContent="";
 const tmp={id:"tmp-"+Date.now()+Math.random(),sender:me.user_id,recipient:chatWith,body:v,created_at:new Date().toISOString(),read_at:null,pending:true};
 msgs.push(tmp);t.value="";renderChat();sendNow(tmp)};
setInterval(()=>{if(chatWith&&!document.hidden&&!window.RT_OK)pullMsgs()},15000);
// Realtime does the work; a light safety net catches anything missed (only when visible, max every 2 min).
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-lastPull>30000)pullMsgs()});
setInterval(()=>{if(!document.hidden&&Date.now()-lastPull>110000)pullMsgs()},120000);

document.addEventListener("visibilitychange",()=>document.documentElement.classList.toggle("bg-hidden",document.hidden));
