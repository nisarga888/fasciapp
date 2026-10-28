/* v0.23.184 Admin-only: all practitioners by modality (Profile screen). Reuses the already-loaded, cached public list: no extra DB calls. */
(function(){
const q=s=>document.querySelector(s),E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let mod="",txt="",nm="";
const adm=()=>{try{return isAdmin()}catch(e){return false}};
const P=()=>{try{return people||[]}catch(e){return []}};
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
