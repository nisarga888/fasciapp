const CITY={tallinn:[59.437,24.7536],warsaw:[52.2297,21.0122],warszawa:[52.2297,21.0122],krakow:[50.0647,19.945],"kraków":[50.0647,19.945],kielce:[50.8661,20.6286],berlin:[52.52,13.405],lesvos:[39.2645,26.2777],mytilene:[39.1047,26.5552]};
const DEMO=[];
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
var MSG_OK=false,msgs=[],chatWith=null,pollT=null,unsub=null;
let me=null,people=[],here=null,map,layer,threads,photoData=null,signUpMode=true,didFit=false,labelZoom=8,lastLabels=null;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const all=()=>DEMO.concat(people);
const SUG=['MER', 'BBTRS', 'Biodynamic Breathwork', 'Breathwork', 'Massage', 'Craniosacral', 'Somatic therapy', 'Trauma therapy', 'Yoga'];let myMods=[];
function renderTags(){const set=[...new Set(SUG.concat(myMods))];$("#modBox").innerHTML=set.map(m=>`<button type="button" class="tag${myMods.includes(m)?" on":""}" data-m="${esc(m)}">${esc(m)}</button>`).join("");$$("#modBox .tag").forEach(b=>b.onclick=()=>{const m=b.dataset.m;myMods=myMods.includes(m)?myMods.filter(x=>x!==m):myMods.concat(m);renderTags()})}
function addTag(){const v=$("#modNew").value.trim().replace(/\s+/g," ");if(v&&!myMods.some(x=>x.toLowerCase()===v.toLowerCase()))myMods.push(v);$("#modNew").value="";renderTags()}
$("#modAdd").onclick=addTag;$("#modNew").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addTag()}};
function fillFilter(){const f=$("#filter"),v=f.value,set=[...new Set(SUG.concat(all().flatMap(p=>p.mods||[])))];f.innerHTML=`<option value="">All practices</option>`+set.map(m=>`<option${m===v?" selected":""}>${esc(m)}</option>`).join("")}

window.show=show;function show(t){$$(".screen").forEach(s=>s.classList.toggle("active",s.id===t));const inApp=!["splash","auth"].includes(t);document.body.classList.toggle("in",inApp);
 $$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="map"){initMap();setTimeout(()=>{map.invalidateSize();fitPins(!didFit)},80)}if(t==="list")renderList();if(t==="profile")loadProf();if(t==="log")loadLog();if(t==="inbox")renderInbox();window.scrollTo(0,0)}
function hdr(){$("#tabInbox").hidden=false;$("#hEdit").hidden=!me;$("#hOut").hidden=!me;$("#hIn").hidden=!!me}
async function refresh(){try{people=await DB.list()}catch(e){console.warn(e);people=[]}fillFilter();renderMarkers();renderList();if(!didFit)fitPins(true)}

// navigation
$("#goLook").onclick=()=>show("map");$("#authLook").onclick=e=>{e.preventDefault();show("map")};
$("#goPract").onclick=()=>me?show("profile"):show("auth");
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));
const logoHome=$("#logoHome");if(logoHome)logoHome.onclick=()=>show("splash");
$$("nav button").forEach(b=>b.onclick=()=>show(b.dataset.t));
$("#hIn").onclick=()=>show("auth");$("#hEdit").onclick=()=>show("profile");
async function logout(){await DB.signOut();me=null;msgs=[];closeChat();photoData=null;hdr();await refresh();show("splash")}
$("#hOut").onclick=logout;$("#pOut").onclick=logout;

// auth
function showAuthMain(){$("#authForm").hidden=false;$("#forgotForm").hidden=true;$("#resetForm").hidden=true;$("#authLook").parentElement.hidden=false}
function showForgot(){$("#authForm").hidden=true;$("#forgotForm").hidden=false;$("#resetForm").hidden=true;$("#authTitle").textContent="Reset your password";
 $("#forgotMsg").textContent="";$("#forgotEmail").value=$("#email").value||"";$("#forgotEmail").focus()}
function showResetForm(){show("auth");$("#authForm").hidden=true;$("#forgotForm").hidden=true;$("#resetForm").hidden=false;
 $("#authTitle").textContent="Set new password";$$(".seg").forEach(s=>s.hidden=true);
 $("#authLook").parentElement.hidden=true;$("#resetMsg").textContent="";$("#newPw").value="";$("#newPw2").value=""}
function setMode(up){signUpMode=up;showAuthMain();$$(".seg").forEach(s=>s.hidden=false);
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
 try{me=signUpMode?await DB.signUp(em,pw):await DB.signIn(em,pw);m.textContent="";hdr();await refresh();msgInit();show("profile")}catch(err){m.textContent=err.message}};

// helpers
function dist1(p,from){const R=6371,r=x=>x*Math.PI/180,dl=r(p.lat-from[0]),dg=r(p.lng-from[1]);const a=Math.sin(dl/2)**2+Math.cos(r(from[0]))*Math.cos(r(p.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function dist(p,from=here){if(!from)return null;const ds=pins(p).map(l=>dist1(l,from));return ds.length?Math.min(...ds):null}
const pins=p=>(p.locations&&p.locations.length?p.locations:[p]).filter(l=>l.lat!=null);
const locTxt=l=>[l.city,l.country].filter(Boolean).join(", ");
function filtered(){const f=$("#filter").value;return all().filter(p=>pins(p).length&&(!f||(p.mods||[]).includes(f)))}
function initials(n){return String(n||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase()}
function av(p,cls=""){return p.photo?`<img class="av ${cls}" src="${esc(p.photo)}" alt="">`:`<span class="av ${cls}">${esc(initials(p.name))}</span>`}
function practiceTitle(p){return String(p.practice_name||"").trim()||String(p.name||"").trim()||"Practitioner"}
function cardHead(p){const pn=String(p.practice_name||"").trim();return pn?`<b>${esc(pn)}</b><br><span class="who">${esc(p.name||"")}</span>`:`<b>${esc(p.name||"")}</b>`}
function link(u){if(!u)return"";const h=/^https?:\/\//.test(u)?u:"https://"+u;return `<a href="${esc(h)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,""))}</a>`}
function card(p){const pills=(p.mods||[]).map(m=>`<span class="pill">${esc(m)}</span>`).join("");
 const dg=String(p.phone||"").replace(/\D/g,"");
 const msgIc=`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 7h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H12l-3.2 2.8V17H4.5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"/></svg>`;
 const btns=[MSG_OK&&p.user_id&&(!me||p.user_id!==me.user_id)&&`<button type="button" class="cb msg" data-msg="${esc(p.user_id)}">${msgIc} Message</button>`,p.phone&&`<a class="cb call" href="tel:${esc(p.phone)}">📞 Call</a>`,p.phone&&p.whatsapp&&dg&&`<a class="cb wa" href="https://wa.me/${dg}" target="_blank" rel="noopener">${WA} WhatsApp</a>`,p.email&&`<a class="cb mail" href="mailto:${esc(p.email)}">✉️ Email</a>`].filter(Boolean).join("");
 const c=p.consent?(p.phone?`<br>${esc(p.phone)}`:"")+(p.website?`<br>🌐 ${link(p.website)}`:"")+(btns?`<div class="cbs">${btns}</div>`:""):"<br><i>Not public yet</i>";
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
function initMap(){if(map)return renderMarkers();map=L.map("leaf",{zoomControl:true,attributionControl:false}).setView([50,18],4);
 const att='Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors';
 L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",{attribution:att,maxZoom:16,className:"base"}).addTo(map);
 L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,className:"labels"}).addTo(map);
 const Info=L.Control.extend({options:{position:"bottomright"},onAdd(){const d=L.DomUtil.create("div","infoc");d.innerHTML=`<button title="Map credits" aria-label="Map credits">i</button><span hidden>${att} · <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a></span>`;
 L.DomEvent.disableClickPropagation(d);d.firstChild.onclick=()=>{d.lastChild.hidden=!d.lastChild.hidden};return d}});new Info().addTo(map);
 threads=L.layerGroup().addTo(map);
 if(typeof L.markerClusterGroup==="function"){
  layer=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:48,spiderfyOnMaxZoom:true,zoomToBoundsOnClick:true,disableClusteringAtZoom:15,iconCreateFunction:clusterIcon});
  layer.on("clusterclick",onClusterClick);
 }else{layer=L.layerGroup()}
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
$("#filter").onchange=()=>{renderMarkers();renderList()};
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
 $("#from").textContent=here?"Sorted by distance from you":"Tap 📍 Near me on the map to sort by distance";
 $("#items").innerHTML=ps.map(({p,d})=>`<div class="item">${d!=null?`<span class="d">${Math.round(d)} km</span>`:""}${card(p)}</div>`).join("")||"<p class=muted>No practitioners here yet.</p>"}

// profile
async function loadProf(){waTouched=false;$("#needLogin").hidden=!!me;$("#profForm").hidden=!me;if(!me)return;myMods=[];renderTags();setExtra([]);$("#who").textContent="Signed in as "+me.email;
 const p=await DB.mine().catch(()=>null);const f=$("#profForm");if(!p)return;["name","practice_name","address","city","country","email","website","bio"].forEach(k=>{if(f[k])f[k].value=p[k]||""});splitPhone(p.phone,p.country);f.whatsapp.checked=!!p.whatsapp;waTouched=true;
 f.label.value=(p.locations?.[0]?.label)||"";setExtra((p.locations||[]).slice(1));f.consent.checked=!!p.consent;myMods=(p.mods||[]).slice();renderTags();if(p.photo){$("#phPrev").src=p.photo;$("#phPrev").hidden=false}}
async function geocode(addr,city,country){try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&q="+encodeURIComponent([addr,city,country].filter(c=>c&&c!=="Other").join(", ")));const j=await r.json();if(j[0])return[+j[0].lat,+j[0].lon,"address",j[0].display_name.split(", ").pop()]}catch(e){}
 const c=CITY[city.trim().toLowerCase()];return c?[c[0],c[1],"city",null]:null}
$("#profForm").onsubmit=async e=>{e.preventDefault();const f=e.target,st=$("#status");st.textContent="Locating your address…";
 const old=await DB.mine().catch(()=>null)||{};
 const p={name:f.name.value.trim(),practice_name:(f.practice_name&&f.practice_name.value||"").trim(),address:f.address.value.trim(),city:f.city.value.trim(),phone:e164(f.prefix.value,f.phone.value),whatsapp:f.whatsapp.checked,email:f.email.value.trim(),website:f.website.value.trim(),bio:f.bio.value.trim(),consent:f.consent.checked,country:f.country.value,mods:myMods.slice(),photo:photoData||old.photo||null};
 const g=await geocode(p.address,p.city,p.country);if(!g){st.textContent="Could not find that place. Check the city name.";return}
 Object.assign(p,{lat:g[0],lng:g[1]});p.locations=[{label:f.label.value.trim(),address:p.address,city:p.city,country:p.country,lat:g[0],lng:g[1]}];
 for(const b of $$("#extraLocs .xloc")){const l={label:b.querySelector("[data-k=label]").value.trim(),address:b.querySelector("[data-k=address]").value.trim(),city:b.querySelector("[data-k=city]").value.trim(),country:b.querySelector("[data-k=country]").value};
  if(!l.city)continue;st.textContent="Locating "+l.city+"…";await new Promise(r=>setTimeout(r,1100));const gg=await geocode(l.address,l.city,l.country);if(!gg){st.textContent="Could not find "+l.city+". Check the city name.";return}l.lat=gg[0];l.lng=gg[1];p.locations.push(l)}
 try{await DB.save(p);await refresh();
  const tip=p.consent?"":" Tip: tick “show publicly” so others can find you.";
  st.textContent=`Saved ✓${tip}`;
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
  const vv=window.visualViewport;const gap=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop));
  document.documentElement.style.setProperty("--vv-bottom",gap+"px")};
 if(window.visualViewport){visualViewport.addEventListener("resize",sync);visualViewport.addEventListener("scroll",sync);sync()}
 addEventListener("orientationchange",()=>setTimeout(sync,300))}
(async()=>{
 setupSafariChrome();
 $("#demoBanner").hidden=DB.mode!=="local";
 me=await DB.session().catch(()=>null);hdr();
 await refresh();
 if(DB.mode==="local"&&window.FASCIAPP_CONFIG&&FASCIAPP_CONFIG.SUPABASE_URL&&window.supabase&&!sessionStorage.getItem("fa_sb_retry")){
  sessionStorage.setItem("fa_sb_retry","1");location.reload();return}
 msgInit();
 // Password recovery: link lands on /app/?reset=1 (Supabase also fires PASSWORD_RECOVERY)
 let recovery=false;
 const wantReset=(()=>{try{return new URLSearchParams(location.search).get("reset")==="1"}catch(e){return false}})();
 if(DB.onAuth)DB.onAuth((event)=>{if(event==="PASSWORD_RECOVERY"){recovery=true;showResetForm()}});
 if(wantReset){// give the client a moment to pick up hash tokens from the email link
  setTimeout(async()=>{if(recovery)return;const s=await DB.session().catch(()=>null);if(s||wantReset)showResetForm()},400)}
})();

// ===== Session log =====
const GOAL=60;let sess=[],editId=null;
function fmtD(d){if(!d)return"";const [y,m,dd]=d.split("-");return `${dd}.${m}.${y}`}
function resetSF(){const f=$("#sessForm");f.reset();{const n=new Date();f.date.value=new Date(n-n.getTimezoneOffset()*6e4).toISOString().slice(0,10)}editId=null;$("#sfTitle").textContent="Add session";$("#sfBtn").textContent="Add session";$("#sfCancel").hidden=true}
async function loadLog(){$("#logNeed").hidden=!!me;$("#logBox").hidden=!me;if(!me)return;if(!editId)resetSF();try{sess=await DB.sessions()}catch(e){sess=[];$("#sfMsg").textContent="Could not load: "+e.message}renderLog()}
function renderLog(){const n=sess.length;$("#pNum").textContent=`${n} / ${GOAL} sessions`;$("#pPct").textContent=n>=GOAL?"✓ complete":`${GOAL-n} to go`;$("#pFill").style.width=Math.min(100,n/GOAL*100)+"%";
 $("#pdfBtn").disabled=!n;
 $("#sessList").innerHTML=n?sess.map((s,i)=>`<div class="sess"><span class="sn">${i+1}</span><div class="sb"><b>${esc(s.initials)}</b> · ${fmtD(s.date)}${s.duration?" · "+s.duration+" min":""}${s.comment?`<br><small>${esc(s.comment)}</small>`:""}</div>
 <span class="sa"><button class="ghost sm" data-ed="${s.id}" aria-label="Edit">✎</button><button class="ghost sm" data-del="${s.id}" aria-label="Delete">🗑</button></span></div>`).join(""):"<p class='muted center'>No sessions yet. Add your first one above.</p>";
 $$("[data-ed]").forEach(b=>b.onclick=()=>{const s=sess.find(x=>x.id===b.dataset.ed),f=$("#sessForm");editId=s.id;["initials","date","comment"].forEach(k=>f[k].value=s[k]||"");f.duration.value=s.duration||"";
  $("#sfTitle").textContent="Edit session";$("#sfBtn").textContent="Save changes";$("#sfCancel").hidden=false;f.scrollIntoView({behavior:"smooth"})});
 $$("[data-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this session?"))return;await DB.deleteSession(b.dataset.del);sess=await DB.sessions();if(editId===b.dataset.del)resetSF();renderLog()})}
$("#sfCancel").onclick=resetSF;
$("#sessForm").onsubmit=async e=>{e.preventDefault();const f=e.target,m=$("#sfMsg");
 const x={id:editId,initials:f.initials.value.trim().toUpperCase().slice(0,4),date:f.date.value,duration:f.duration.value?parseInt(f.duration.value):null,comment:f.comment.value.trim()};
 if(!x.initials)return m.textContent="Please add the client initials.";if(!x.duration)return m.textContent="Please add the duration.";
 try{await DB.saveSession(x);m.textContent=editId?"Saved ✓":"Session added ✓";resetSF();sess=await DB.sessions();renderLog()}catch(err){m.textContent="Could not save: "+err.message}};
async function logoData(){try{const b=await (await fetch("icon-192-v3.png")).blob();return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})}catch(e){return null}}
async function buildPdf(){if(!window.jspdf){alert("PDF library could not load. Check your internet connection.");return null}
 const prof=await DB.mine().catch(()=>null)||{},name=prof.name||me.email,training=(prof.mods||[]).filter(m=>m!=="Other").join(" / ")||"—";
 const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
 const ds=sess.map(s=>s.date).sort(),range=ds.length?`${fmtD(ds[0])} – ${fmtD(ds[ds.length-1])}`:"";
 doc.setFillColor(2,25,30);doc.rect(0,0,W,34,"F");const lg=await logoData();if(lg)doc.addImage(lg,"PNG",12,5,24,24);
 doc.setTextColor(201,158,103);doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text("FasciApp",40,15);
 doc.setTextColor(255,255,255);doc.setFont("helvetica","normal");doc.setFontSize(11);doc.text("Session Log",40,22);doc.setFontSize(8);doc.setTextColor(150,200,200);doc.text("Fascia connects us all",40,28);
 doc.setTextColor(2,25,30);doc.setFontSize(11);
 [["Practitioner",name],["Training",training],["Period",range],["Sessions",`${sess.length} / ${GOAL}`]].forEach(([k,v],i)=>{doc.setFont("helvetica","bold");doc.text(k+":",14,44+i*6);doc.setFont("helvetica","normal");doc.text(String(v),44,44+i*6)});
 doc.autoTable({startY:70,head:[["#","Initials","Date","Duration","Comment"]],
  body:sess.map((s,i)=>[i+1,s.initials,fmtD(s.date),s.duration?s.duration+" min":"",s.comment||""]),
  headStyles:{fillColor:[2,25,30],textColor:[201,158,103]},alternateRowStyles:{fillColor:[245,240,233]},styles:{fontSize:9,cellPadding:2},
  columnStyles:{0:{cellWidth:10},1:{cellWidth:18},2:{cellWidth:26},3:{cellWidth:22}},
  didDrawPage:()=>{doc.setFontSize(8);doc.setTextColor(120);doc.text(`FasciApp · ${name} · page ${doc.internal.getNumberOfPages()}`,14,H-8)}});
 let y=doc.lastAutoTable.finalY+12;if(y>H-45){doc.addPage();y=30}
 doc.setTextColor(2,25,30);doc.setFontSize(11);doc.setFont("helvetica","bold");doc.text(`Total sessions: ${sess.length}`,14,y);
 const mins=sess.reduce((a,s)=>a+(s.duration||0),0);doc.setFont("helvetica","normal");if(mins)doc.text(`Total time: ${Math.floor(mins/60)} h ${mins%60} min`,14,y+6);
 doc.line(14,y+26,90,y+26);doc.line(110,y+26,186,y+26);doc.setFontSize(9);doc.text("Practitioner signature",14,y+31);doc.text("Date",110,y+31);
 return {doc,name,fn:`FasciApp_Session_Log_${name.replace(/[^\p{L}\p{N}]+/gu,"_").replace(/^_|_$/g,"")}.pdf`}}
$("#pdfBtn").onclick=async()=>{const r=await buildPdf();if(r)r.doc.save(r.fn)};
// ===== Send by email (no server: share sheet or user's mail app) =====
$("#mailToggle").onclick=async()=>{const box=$("#mailBox");box.hidden=!box.hidden;if(!box.hidden){const prof=await DB.mine().catch(()=>null)||{},f=$("#mailForm");
 f.subject.value=`Session log – ${prof.name||me.email}`;
 if(!f.msg.value)f.msg.value=`Hello,\n\nplease find attached my session log (${sess.length} / ${GOAL} sessions).\n\nWarm regards,\n${prof.name||""}`;$("#mailNote").textContent=""}};
$("#mailForm").onsubmit=async e=>{e.preventDefault();const f=e.target,note=$("#mailNote");const r=await buildPdf();if(!r)return;
 const to=f.to.value.trim(),subject=f.subject.value.trim(),body=f.msg.value;const file=new File([r.doc.output("blob")],r.fn,{type:"application/pdf"});
 if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:subject,text:body});note.textContent="Shared ✓ (choose Mail in the share sheet; add the recipient "+to+" if needed).";return}catch(err){if(err.name==="AbortError"){note.textContent="Sharing cancelled.";return}}}
 r.doc.save(r.fn);note.textContent=`PDF downloaded (${r.fn}). Your email app is opening – please attach the downloaded PDF before sending.`;
 setTimeout(()=>{location.href=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body+"\n\n[Please attach: "+r.fn+"]")}`},600)};

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
 <input data-k="label" hidden tabindex="-1" aria-hidden="true" maxlength="40"><input data-k="address" placeholder="Street address (optional)"><input data-k="city" placeholder="City" required><select data-k="country" required>${opts}</select></div>`}
function addXloc(l={}){const box=$("#extraLocs");if(box.children.length>=2)return;box.insertAdjacentHTML("beforeend",xlocHtml());const b=box.lastElementChild;
 ["label","address","city","country"].forEach(k=>b.querySelector(`[data-k=${k}]`).value=l[k]||"");b.querySelector(".xdel").onclick=()=>{b.remove();xbtn()};xbtn()}
function xbtn(){$("#addLoc").hidden=$("#extraLocs").children.length>=2}
function setExtra(ls){$("#extraLocs").innerHTML="";ls.slice(0,2).forEach(addXloc);xbtn()}
$("#addLoc").onclick=()=>addXloc();

// ===== in-app messages =====
const nameOf=id=>{const p=all().find(x=>x.user_id===id);return p?p.name:"FasciApp member"};
async function msgInit(){try{MSG_OK=!!(DB.msgOk&&await DB.msgOk())}catch(e){MSG_OK=false}hdr();renderMarkers();renderList();if(MSG_OK&&me)await pullMsgs()}
async function pullMsgs(){if(!MSG_OK||!me)return;try{msgs=await DB.msgs()}catch(e){return}
 const un=msgs.filter(m=>m.recipient===me.user_id&&!m.read_at).length;const b=$("#unread");b.textContent=un;b.hidden=!un;
 if(chatWith)renderChat();if($("#inbox").classList.contains("active"))renderInbox()}
function convs(){const c={};msgs.forEach(m=>{const o=m.sender===me.user_id?m.recipient:m.sender;(c[o]=c[o]||[]).push(m)});
 return Object.entries(c).map(([o,l])=>({o,last:l[l.length-1],un:l.filter(m=>m.recipient===me.user_id&&!m.read_at).length})).sort((a,b)=>b.last.created_at.localeCompare(a.last.created_at))}
function renderInbox(){const box=$("#convs");
 if(!me){box.innerHTML=`<div class="card center"><p>Sign in to see messages and chat with practitioners.</p><button type="button" class="gold big1" data-go="auth">Sign in</button></div>`;
  box.querySelector("[data-go]")&&(box.querySelector("[data-go]").onclick=()=>show("auth"));return}
 if(!MSG_OK){box.innerHTML="<p class=muted>Messaging is not available right now. Try again later.</p>";return}
 const cs=convs();box.innerHTML=cs.map(c=>{const p=all().find(x=>x.user_id===c.o)||{name:nameOf(c.o)};return `<div class="item conv" data-c="${esc(c.o)}"><div class="row">${av(p)}<div><b>${esc(p.name)}</b>${c.un?` <span class="badge">${c.un}</span>`:""}<br><small class=muted>${esc(c.last.body.slice(0,80))}</small></div></div></div>`}).join("")||"<p class=muted>No messages yet. Open a practitioner on the map and tap Message.</p>";
 $$("#convs .conv").forEach(d=>d.onclick=()=>openChat(d.dataset.c))}
async function openChat(id){if(!me){show("auth");return}chatWith=id;$("#chatName").textContent=nameOf(id);$("#chat").hidden=false;renderChat();$("#chatTxt").focus();
 if(DB.onMsg&&!unsub)unsub=DB.onMsg(()=>pullMsgs());clearInterval(pollT);pollT=setInterval(pullMsgs,20000);
 if(msgs.some(m=>m.sender===id&&m.recipient===me.user_id&&!m.read_at)){try{await DB.markRead(id)}catch(e){}await pullMsgs()}}
function closeChat(){chatWith=null;$("#chat").hidden=true;clearInterval(pollT);pollT=null}
function renderChat(){const l=msgs.filter(m=>(m.sender===chatWith&&m.recipient===me.user_id)||(m.recipient===chatWith&&m.sender===me.user_id));
 const b=$("#chatLog");b.innerHTML=l.map(m=>`<div class="bub ${m.sender===me.user_id?"me":"them"}">${esc(m.body)}<small>${new Date(m.created_at).toLocaleString([], {dateStyle:"short",timeStyle:"short"})}</small></div>`).join("")||"<p class='muted center'>Say hello 👋</p>";b.scrollTop=b.scrollHeight;
 if(l.some(m=>m.sender===chatWith&&!m.read_at))DB.markRead(chatWith).catch(()=>{})}
document.addEventListener("click",e=>{const t=e.target.closest("[data-msg]");if(t){e.preventDefault();openChat(t.dataset.msg)}});
$("#chatX").onclick=closeChat;
$("#chatForm").onsubmit=async e=>{e.preventDefault();const t=$("#chatTxt"),v=t.value.trim().slice(0,1000);if(!v)return;$("#chatErr").textContent="";
 try{await DB.sendMsg(chatWith,v);t.value="";await pullMsgs()}catch(err){$("#chatErr").textContent="Could not send: "+err.message}};
setInterval(()=>{if(!document.hidden&&!chatWith)pullMsgs()},60000);
