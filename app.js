const CITY={tallinn:[59.437,24.7536],warsaw:[52.2297,21.0122],warszawa:[52.2297,21.0122],krakow:[50.0647,19.945],"kraków":[50.0647,19.945],kielce:[50.8661,20.6286],berlin:[52.52,13.405],lesvos:[39.2645,26.2777],mytilene:[39.1047,26.5552]};
const DEMO=[];
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
let me=null,people=[],here=null,map,layer,photoData=null,signUpMode=true;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const all=()=>DEMO.concat(people);

function show(t){$$(".screen").forEach(s=>s.classList.toggle("active",s.id===t));const inApp=!["splash","auth"].includes(t);document.body.classList.toggle("in",inApp);
 $$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="map"){initMap();setTimeout(()=>map.invalidateSize(),50)}if(t==="list")renderList();if(t==="profile")loadProf();if(t==="log")loadLog();window.scrollTo(0,0)}
function hdr(){$("#hEdit").hidden=!me;$("#hOut").hidden=!me;$("#hIn").hidden=!!me}
async function refresh(){try{people=await DB.list()}catch(e){console.warn(e);people=[]}renderMarkers();renderList()}

// navigation
$("#goLook").onclick=()=>show("map");$("#authLook").onclick=e=>{e.preventDefault();show("map")};
$("#goPract").onclick=()=>me?show("profile"):show("auth");
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));
$$("nav button").forEach(b=>b.onclick=()=>show(b.dataset.t));
$("#hIn").onclick=()=>show("auth");$("#hEdit").onclick=()=>show("profile");
async function logout(){await DB.signOut();me=null;photoData=null;hdr();await refresh();show("splash")}
$("#hOut").onclick=logout;$("#pOut").onclick=logout;

// auth
function setMode(up){signUpMode=up;$("#tabUp").classList.toggle("on",up);$("#tabIn").classList.toggle("on",!up);
 $("#authTitle").textContent=up?"Create your practitioner account":"Welcome back";$("#authBtn").textContent=up?"Create account":"Sign in";$("#authMsg").textContent="";
 $("#pw").autocomplete=up?"new-password":"current-password"}
$("#tabUp").onclick=()=>setMode(true);$("#tabIn").onclick=()=>setMode(false);
$("#authForm").onsubmit=async e=>{e.preventDefault();const em=$("#email").value.trim().toLowerCase(),pw=$("#pw").value,m=$("#authMsg");m.textContent="…";
 try{me=signUpMode?await DB.signUp(em,pw):await DB.signIn(em,pw);m.textContent="";hdr();await refresh();show("profile")}catch(err){m.textContent=err.message}};

// helpers
function dist(p,from=here){if(!from)return null;const R=6371,r=x=>x*Math.PI/180,dl=r(p.lat-from[0]),dg=r(p.lng-from[1]);const a=Math.sin(dl/2)**2+Math.cos(r(from[0]))*Math.cos(r(p.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function filtered(){const f=$("#filter").value;return all().filter(p=>p.lat!=null&&(!f||(p.mods||[]).includes(f)))}
function initials(n){return String(n||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase()}
function av(p,cls=""){return p.photo?`<img class="av ${cls}" src="${esc(p.photo)}" alt="">`:`<span class="av ${cls}">${esc(initials(p.name))}</span>`}
function link(u){if(!u)return"";const h=/^https?:\/\//.test(u)?u:"https://"+u;return `<a href="${esc(h)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,""))}</a>`}
function card(p){const pills=(p.mods||[]).map(m=>`<span class="pill">${esc(m)}</span>`).join("");
 const c=p.consent?[p.phone&&`📞 <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>`,p.email&&`✉️ <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`,p.website&&`🌐 ${link(p.website)}`].filter(Boolean).map(x=>"<br>"+x).join(""):"<br><i>Not public yet</i>";
 return `<div class="row">${av(p)}<div><b>${esc(p.name)}</b><br>${pills}<br>${esc([p.city,p.country].filter(Boolean).join(", "))}${c}${p.bio?`<br><small>${esc(p.bio)}</small>`:""}</div></div>`}

// map
function initMap(){if(map)return renderMarkers();map=L.map("leaf",{zoomControl:true,attributionControl:false}).setView([50,18],4);
 const att='Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors';
 L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",{attribution:att,maxZoom:16,className:"base"}).addTo(map);
 L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,className:"labels"}).addTo(map);
 const Info=L.Control.extend({options:{position:"bottomright"},onAdd(){const d=L.DomUtil.create("div","infoc");d.innerHTML=`<button title="Map credits" aria-label="Map credits">i</button><span hidden>${att} · <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a></span>`;
 L.DomEvent.disableClickPropagation(d);d.firstChild.onclick=()=>{d.lastChild.hidden=!d.lastChild.hidden};return d}});new Info().addTo(map);
 layer=L.layerGroup().addTo(map);renderMarkers()}
function curve(a,b){const pts=[],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],c=[mx-dy*.2,my+dx*.2];
 for(let t=0;t<=1.001;t+=.05)pts.push([(1-t)**2*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*c[1]+t*t*b[1]]);return pts}
function drawThreads(ps){const seen=new Set();ps.forEach(p=>ps.filter(q=>q!==p).map(q=>[q,dist(q,[p.lat,p.lng])]).sort((x,y)=>x[1]-y[1]).slice(0,3).forEach(([q])=>{
 const k=[p.id,q.id].sort().join("|");if(seen.has(k))return;seen.add(k);const c=curve([p.lat,p.lng],[q.lat,q.lng]);
 L.polyline(c,{color:"#2a9d96",weight:9,opacity:.28,className:"glow",interactive:false}).addTo(layer);
 L.polyline(c,{color:"#B8873F",weight:2.6,opacity:1,className:"thread",interactive:false}).addTo(layer)}))}
function count(){const a=all(),c=new Set(a.map(p=>(p.country||p.city||"").trim().toLowerCase()).filter(Boolean));
 $("#count").innerHTML=a.length?`<b>${a.length}</b> practitioner${a.length>1?"s":""} in <b>${c.size}</b> countr${c.size>1?"ies":"y"} joined the network`:"Be the first practitioner on the map ✨"}
function renderMarkers(){count();if(!layer)return;layer.clearLayers();const ps=filtered();drawThreads(ps);
 ps.forEach(p=>L.marker([p.lat,p.lng],{icon:L.divIcon({className:"avm",html:av(p),iconSize:[44,44],iconAnchor:[22,22]})}).bindPopup(card(p)).addTo(layer));
 if(here)L.circleMarker(here,{radius:7,color:"#fff",weight:3,fillColor:"#2a9d96",fillOpacity:1}).bindPopup("You are here").addTo(layer)}
$("#filter").onchange=()=>{renderMarkers();renderList()};
$("#near").onclick=()=>{if(!navigator.geolocation)return alert("Location is not available in this browser");navigator.geolocation.getCurrentPosition(pos=>{here=[pos.coords.latitude,pos.coords.longitude];map.setView(here,7);renderMarkers()},()=>alert("Could not get your location. Allow location access and try again."))};
function renderList(){const ps=filtered().map(p=>({p,d:dist(p)}));if(here)ps.sort((a,b)=>a.d-b.d);
 $("#from").textContent=here?"Sorted by distance from you":"Tap 📍 Near me on the map to sort by distance";
 $("#items").innerHTML=ps.map(({p,d})=>`<div class="item">${d!=null?`<span class="d">${Math.round(d)} km</span>`:""}${card(p)}</div>`).join("")||"<p class=muted>No practitioners here yet.</p>"}

// profile
async function loadProf(){$("#needLogin").hidden=!!me;$("#profForm").hidden=!me;if(!me)return;$("#who").textContent="Signed in as "+me.email;
 const p=await DB.mine().catch(()=>null);const f=$("#profForm");if(!p)return;["name","address","city","country","phone","email","website","bio"].forEach(k=>f[k].value=p[k]||"");
 f.consent.checked=!!p.consent;f.querySelectorAll("[name=mod]").forEach(c=>c.checked=(p.mods||[]).includes(c.value));if(p.photo){$("#phPrev").src=p.photo;$("#phPrev").hidden=false}}
async function geocode(addr,city,country){try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&q="+encodeURIComponent([addr,city,country].filter(c=>c&&c!=="Other").join(", ")));const j=await r.json();if(j[0])return[+j[0].lat,+j[0].lon,"address",j[0].display_name.split(", ").pop()]}catch(e){}
 const c=CITY[city.trim().toLowerCase()];return c?[c[0],c[1],"city",null]:null}
$("#profForm").onsubmit=async e=>{e.preventDefault();const f=e.target,st=$("#status");st.textContent="Locating your address…";
 const old=await DB.mine().catch(()=>null)||{};
 const p={name:f.name.value.trim(),address:f.address.value.trim(),city:f.city.value.trim(),phone:f.phone.value.trim(),email:f.email.value.trim(),website:f.website.value.trim(),bio:f.bio.value.trim(),consent:f.consent.checked,country:f.country.value,mods:[...f.querySelectorAll("[name=mod]:checked")].map(c=>c.value),photo:photoData||old.photo||null};
 const g=await geocode(p.address,p.city,p.country);if(!g){st.textContent="Could not find that place. Check the city name.";return}
 Object.assign(p,{lat:g[0],lng:g[1]});
 try{await DB.save(p);await refresh();st.textContent=`Saved ✓ placed by ${g[2]==="city"?"city centre (address not found)":"address"}.${p.consent?"":" Tick 'show publicly' so others can find you."}`}catch(err){st.textContent="Could not save: "+err.message}};
$("#photo").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),s=256,m=Math.min(im.width,im.height);c.width=c.height=s;
 c.getContext("2d").drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);photoData=c.toDataURL("image/jpeg",.85);$("#phPrev").src=photoData;$("#phPrev").hidden=false};im.src=r.result};r.readAsDataURL(file)};

// start
(async()=>{$("#demoBanner").hidden=DB.mode!=="local";me=await DB.session().catch(()=>null);hdr();await refresh()})();

// ===== Session log =====
const GOAL=60;let sess=[],editId=null;
function fmtD(d){if(!d)return"";const [y,m,dd]=d.split("-");return `${dd}.${m}.${y}`}
function resetSF(){const f=$("#sessForm");f.reset();{const n=new Date();f.date.value=new Date(n-n.getTimezoneOffset()*6e4).toISOString().slice(0,10)}editId=null;$("#sfTitle").textContent="Add session";$("#sfBtn").textContent="Add session";$("#sfCancel").hidden=true}
async function loadLog(){$("#logNeed").hidden=!!me;$("#logBox").hidden=!me;if(!me)return;if(!editId)resetSF();try{sess=await DB.sessions()}catch(e){sess=[];$("#sfMsg").textContent="Could not load: "+e.message}renderLog()}
function renderLog(){const n=sess.length;$("#pNum").textContent=`${n} / ${GOAL} sessions`;$("#pPct").textContent=n>=GOAL?"✓ complete":`${GOAL-n} to go`;$("#pFill").style.width=Math.min(100,n/GOAL*100)+"%";
 $("#pdfBtn").disabled=!n;
 $("#sessList").innerHTML=n?sess.map((s,i)=>`<div class="sess"><span class="sn">${i+1}</span><div class="sb"><b>${esc(s.initials)}</b> · ${fmtD(s.date)}${s.time?" · "+esc(s.time.slice(0,5)):""}${s.duration?" · "+s.duration+" min":""}${s.comment?`<br><small>${esc(s.comment)}</small>`:""}</div>
 <span class="sa"><button class="ghost sm" data-ed="${s.id}" aria-label="Edit">✎</button><button class="ghost sm" data-del="${s.id}" aria-label="Delete">🗑</button></span></div>`).join(""):"<p class='muted center'>No sessions yet. Add your first one above.</p>";
 $$("[data-ed]").forEach(b=>b.onclick=()=>{const s=sess.find(x=>x.id===b.dataset.ed),f=$("#sessForm");editId=s.id;["initials","date","comment"].forEach(k=>f[k].value=s[k]||"");f.time.value=(s.time||"").slice(0,5);f.duration.value=s.duration||"";
  $("#sfTitle").textContent="Edit session";$("#sfBtn").textContent="Save changes";$("#sfCancel").hidden=false;f.scrollIntoView({behavior:"smooth"})});
 $$("[data-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this session?"))return;await DB.deleteSession(b.dataset.del);sess=await DB.sessions();if(editId===b.dataset.del)resetSF();renderLog()})}
$("#sfCancel").onclick=resetSF;
$("#sessForm").onsubmit=async e=>{e.preventDefault();const f=e.target,m=$("#sfMsg");
 const x={id:editId,initials:f.initials.value.trim().toUpperCase().slice(0,4),date:f.date.value,time:f.time.value||null,duration:f.duration.value?parseInt(f.duration.value):null,comment:f.comment.value.trim()};
 if(!x.initials)return m.textContent="Please add the client initials.";
 try{await DB.saveSession(x);m.textContent=editId?"Saved ✓":"Session added ✓";resetSF();sess=await DB.sessions();renderLog()}catch(err){m.textContent="Could not save: "+err.message}};
async function logoData(){try{const b=await (await fetch("icon-192-v3.png")).blob();return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})}catch(e){return null}}
$("#pdfBtn").onclick=async()=>{if(!window.jspdf)return alert("PDF library could not load. Check your internet connection.");
 const prof=await DB.mine().catch(()=>null)||{},name=prof.name||me.email,training=(prof.mods||[]).filter(m=>m!=="Other").join(" / ")||"—";
 const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
 const ds=sess.map(s=>s.date).sort(),range=ds.length?`${fmtD(ds[0])} – ${fmtD(ds[ds.length-1])}`:"";
 doc.setFillColor(2,25,30);doc.rect(0,0,W,34,"F");const lg=await logoData();if(lg)doc.addImage(lg,"PNG",12,5,24,24);
 doc.setTextColor(201,158,103);doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text("FasciApp",40,15);
 doc.setTextColor(255,255,255);doc.setFont("helvetica","normal");doc.setFontSize(11);doc.text("Session Log",40,22);doc.setFontSize(8);doc.setTextColor(150,200,200);doc.text("Fascia connects us all",40,28);
 doc.setTextColor(2,25,30);doc.setFontSize(11);
 [["Practitioner",name],["Training",training],["Period",range],["Sessions",`${sess.length} / ${GOAL}`]].forEach(([k,v],i)=>{doc.setFont("helvetica","bold");doc.text(k+":",14,44+i*6);doc.setFont("helvetica","normal");doc.text(String(v),44,44+i*6)});
 doc.autoTable({startY:70,head:[["#","Initials","Date","Time","Duration","Comment"]],
  body:sess.map((s,i)=>[i+1,s.initials,fmtD(s.date),(s.time||"").slice(0,5),s.duration?s.duration+" min":"",s.comment||""]),
  headStyles:{fillColor:[2,25,30],textColor:[201,158,103]},alternateRowStyles:{fillColor:[245,240,233]},styles:{fontSize:9,cellPadding:2},
  columnStyles:{0:{cellWidth:10},1:{cellWidth:18},2:{cellWidth:24},3:{cellWidth:16},4:{cellWidth:20}},
  didDrawPage:()=>{doc.setFontSize(8);doc.setTextColor(120);doc.text(`FasciApp · ${name} · page ${doc.internal.getNumberOfPages()}`,14,H-8)}});
 let y=doc.lastAutoTable.finalY+12;if(y>H-45){doc.addPage();y=30}
 doc.setTextColor(2,25,30);doc.setFontSize(11);doc.setFont("helvetica","bold");doc.text(`Total sessions: ${sess.length}`,14,y);
 const mins=sess.reduce((a,s)=>a+(s.duration||0),0);doc.setFont("helvetica","normal");if(mins)doc.text(`Total time: ${Math.floor(mins/60)} h ${mins%60} min`,14,y+6);
 doc.line(14,y+26,90,y+26);doc.line(110,y+26,186,y+26);doc.setFontSize(9);doc.text("Practitioner signature",14,y+31);doc.text("Date",110,y+31);
 doc.save(`FasciApp_Session_Log_${name.replace(/[^\p{L}\p{N}]+/gu,"_").replace(/^_|_$/g,"")}.pdf`)};
