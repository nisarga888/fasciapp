const S={get:(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const CITY={tallinn:[59.437,24.7536],warsaw:[52.2297,21.0122],warszawa:[52.2297,21.0122],krakow:[50.0647,19.945],"kraków":[50.0647,19.945],kielce:[50.8661,20.6286],berlin:[52.52,13.405],lesvos:[39.2645,26.2777],mytilene:[39.1047,26.5552]};
const DEMO=[
["DEMO Kaja Tamm","Tallinn",[59.437,24.7536],["MER","BBTRS"]],["DEMO Anna Nowak","Warsaw",[52.2297,21.0122],["MER"]],
["DEMO Piotr Zieliński","Kraków",[50.0647,19.945],["BBTRS"]],["DEMO Marta Kowalska","Kielce",[50.8661,20.6286],["MER","Other"]],
["DEMO Jonas Weber","Berlin",[52.52,13.405],["BBTRS","Other"]],["DEMO Eleni Papadaki","Lesvos",[39.2645,26.2777],["MER","BBTRS"]]
].map(([name,city,ll,mods],i)=>({id:"demo"+i,demo:true,name,city,country:{Tallinn:"EE",Warsaw:"PL","Kraków":"PL",Kielce:"PL",Berlin:"DE",Lesvos:"GR"}[city],lat:ll[0],lng:ll[1],mods,consent:true,phone:"+000 000 000",email:"demo"+i+"@example.com",website:"example.com",bio:"Fictional demo practitioner."}));
let me=S.get("fyp_session",null),here=null,map,layer;
const $=s=>document.querySelector(s);
function all(){return DEMO.concat(Object.values(S.get("fyp_profiles",{})))}
function show(t){document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===t));document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="map"){initMap();setTimeout(()=>map.invalidateSize(),50)}if(t==="list")renderList();if(t==="profile")loadProf()}
function enter(){document.body.classList.add("in");show("map")}
$("#loginForm").onsubmit=e=>{e.preventDefault();const em=$("#email").value.trim().toLowerCase(),pw=$("#pw").value,role=document.querySelector("[name=role]:checked").value;
 const u=S.get("fyp_users",{});if(u[em]&&u[em].pw!==pw)return alert("Wrong password (demo account)");if(!u[em]){u[em]={pw,role};S.set("fyp_users",u)}
 me={email:em,role:u[em].role};S.set("fyp_session",me);enter()};
$("#skip").onclick=()=>{me=null;enter()};
$("#logout").onclick=()=>{localStorage.removeItem("fyp_session");me=null;document.body.classList.remove("in");document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id==="splash"))};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>show(b.dataset.t));
function dist(p){if(!here)return null;const R=6371,r=x=>x*Math.PI/180,dl=r(p.lat-here[0]),dg=r(p.lng-here[1]);const a=Math.sin(dl/2)**2+Math.cos(r(here[0]))*Math.cos(r(p.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function filtered(){const f=$("#filter").value;return all().filter(p=>!f||p.mods.includes(f))}
function initials(n){return n.replace(/^DEMO\s+/,'').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()}
function av(p,cls=''){return p.photo?`<img class="av ${cls}" src="${p.photo}">`:`<span class="av ${cls}">${esc(initials(p.name))}</span>`}
function card(p){const pills=(p.demo?'<span class="pill demo">DEMO</span>':"")+p.mods.map(m=>`<span class="pill">${m}</span>`).join("");
 const c=p.consent?`<br>📞 ${esc(p.phone||"")}<br>✉️ ${esc(p.email||"")}<br>🌐 ${esc(p.website||"")}`:'<br><i>Contacts not public</i>';
 return `<div class="row">${av(p)}<div><b>${esc(p.name)}</b><br>${pills}<br>${esc(p.city)}${c}<br><small>${esc(p.bio||"")}</small></div></div>`}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function initMap(){if(!map){map=L.map("leaf").setView([50,18],4);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);layer=L.layerGroup().addTo(map)}renderMarkers()}
function renderMarkers(){if(!layer)return;layer.clearLayers();drawThreads();count();filtered().forEach(p=>L.marker([p.lat,p.lng],{icon:L.divIcon({className:"avm",html:av(p),iconSize:[44,44],iconAnchor:[22,22]})}).bindPopup(card(p)).addTo(layer));if(here)L.circleMarker(here,{radius:7,color:"#fff",fillColor:"#3aa",fillOpacity:1}).bindPopup("You are here").addTo(layer)}
$("#filter").onchange=()=>{renderMarkers();renderList()};
$("#near").onclick=()=>{if(!navigator.geolocation)return alert("Geolocation not available");navigator.geolocation.getCurrentPosition(pos=>{here=[pos.coords.latitude,pos.coords.longitude];map.setView(here,7);renderMarkers()},()=>alert("Could not get your location. Allow location access and try again."))};
function renderList(){const ps=filtered().map(p=>({p,d:dist(p)}));if(here)ps.sort((a,b)=>a.d-b.d);
 $("#from").textContent=here?"Sorted by distance from you":"Tap 📍 Near me on the map to sort by distance";
 $("#items").innerHTML=ps.map(({p,d})=>`<div class="item">${d!=null?`<span class="d">${Math.round(d)} km</span>`:""}${card(p)}</div>`).join("")||"<p class=muted>No practitioners for this filter.</p>"}
function loadProf(){const isP=!me||me.role!=="client";$("#profForm").hidden=!me||!isP;$("#clientNote").hidden=!(me&&!isP);if(!me){$("#clientNote").hidden=false;$("#clientNote").textContent="Sign in as a practitioner to create your listing.";return}
 const p=S.get("fyp_profiles",{})[me.email];if(!p)return;const f=$("#profForm");["name","address","city","phone","email","website","bio"].forEach(k=>f[k].value=p[k]||"");f.consent.checked=p.consent;if(p.photo){$("#phPrev").src=p.photo;$("#phPrev").hidden=false}f.querySelectorAll("[name=mod]").forEach(c=>c.checked=p.mods.includes(c.value))}
async function geocode(addr,city){try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&q="+encodeURIComponent([addr,city].filter(Boolean).join(", ")));const j=await r.json();if(j[0])return[+j[0].lat,+j[0].lon,"address",j[0].display_name.split(", ").pop()]}catch(e){}
 const c=CITY[city.trim().toLowerCase()];return c?[c[0],c[1],"city"]:null}
$("#profForm").onsubmit=async e=>{e.preventDefault();const f=e.target,st=$("#status");st.textContent="Locating your address…";
 const p={name:f.name.value,address:f.address.value,city:f.city.value,phone:f.phone.value,email:f.email.value,website:f.website.value,bio:f.bio.value,consent:f.consent.checked,mods:[...f.querySelectorAll("[name=mod]:checked")].map(c=>c.value)};
 p.photo=photoData||(S.get("fyp_profiles",{})[me.email]||{}).photo||null;const g=await geocode(p.address,p.city);if(!g){st.textContent="Could not find that place. Check the city name.";return}
 p.lat=g[0];p.country=g[3]||p.city;p.lng=g[1];const all=S.get("fyp_profiles",{});all[me.email]=p;S.set("fyp_profiles",all);
 st.textContent=`Saved ✓ placed by ${g[2]==="city"?"city centre (address not found)":"address"}.`;renderMarkers()};
if(me)enter();

function curve(a,b){const pts=[],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],c=[mx-dy*.2,my+dx*.2];
 for(let t=0;t<=1.001;t+=.05)pts.push([(1-t)**2*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*c[1]+t*t*b[1]]);return pts}
function km(a,b){here0=here;here=[a.lat,a.lng];const d=dist(b);here=here0;return d}let here0;
function drawThreads(){const ps=filtered(),seen=new Set();ps.forEach(p=>{ps.filter(q=>q!==p).map(q=>[q,km(p,q)]).sort((x,y)=>x[1]-y[1]).slice(0,3).forEach(([q])=>{
 const k=[p.name,q.name].sort().join("|");if(seen.has(k))return;seen.add(k);const c=curve([p.lat,p.lng],[q.lat,q.lng]);
 L.polyline(c,{color:"#5FC9C3",weight:7,opacity:.18,className:"glow",interactive:false}).addTo(layer);
 L.polyline(c,{color:"#C99E67",weight:1.6,opacity:.85,className:"thread",interactive:false}).addTo(layer)})})}
function count(){const a=all(),c=new Set(a.map(p=>p.country||p.city.trim().toLowerCase()));$("#count").innerHTML=`<b>${a.length}</b> practitioners in <b>${c.size}</b> countries joined the network`}

let photoData=null;
$("#photo").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),s=256,m=Math.min(im.width,im.height);c.width=c.height=s;
 c.getContext("2d").drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);photoData=c.toDataURL("image/jpeg",.85);$("#phPrev").src=photoData;$("#phPrev").hidden=false};im.src=r.result};r.readAsDataURL(f)};
