/* A2 silhouette with the training lines drawn on it.
   The body outline lives in anatomy.js. Line routes are drawn for that figure.
   Not a tracing of a third-party figure. */
(function(root, factory){
  let anatomy = root && root.FasciAnatomy;
  if (!anatomy && typeof module === "object" && module.exports) {
    try { require("./anatomy.js"); anatomy = globalThis.FasciAnatomy; } catch (e) { anatomy = null; }
  }
  const api = factory(anatomy);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_LINES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(FasciAnatomy){
function crPath(points, closed) {
  if (!points || points.length < 2) return "";
  const pts = points.map(p => ({ x: p[0], y: p[1] }));
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}L${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  const src = pts.slice();
  if (closed) {
    src.unshift(pts[pts.length - 1]);
    src.push(pts[0], pts[1]);
  } else {
    src.unshift(pts[0]);
    src.push(pts[pts.length - 1]);
  }
  const n = src.length;
  let d = `M${src[1].x.toFixed(1)} ${src[1].y.toFixed(1)}`;
  for (let i = 0; i < n - 3; i++) {
    const p0 = src[i], p1 = src[i + 1], p2 = src[i + 2], p3 = src[i + 3];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  if (closed) d += "Z";
  return d;
}

const LINES = {"front":{"sfl":{"full":[[[86,481],[88,458],[86,422],[90,372],[88,308],[86,262],[92,254]],[[114,481],[112,458],[114,422],[110,372],[112,308],[114,262],[108,254]],[[92,254],[100,250],[108,254],[106,214],[104,174],[100,148],[100,122]],[[100,122],[92,96],[84,78],[82,58]],[[100,122],[108,96],[116,78],[118,58]],[[82,58],[86,32],[100,18],[114,32],[118,58]]],"upper":[[[100,148],[100,122],[92,96],[84,78],[82,58]],[[100,148],[100,122],[108,96],[116,78],[118,58]],[[82,58],[86,32],[100,18],[114,32],[118,58]]],"lower":[[[86,481],[88,458],[86,422],[90,372],[88,308],[86,262],[92,254]],[[114,481],[112,458],[114,422],[110,372],[112,308],[114,262],[108,254]],[[92,254],[100,250],[108,254],[106,214],[104,174],[100,148]]]},"sbl":{"full":[]},"lateral":{"full":[[[74,480],[70,458],[68,422],[70,372],[66,308],[70,248],[66,200],[64,152],[70,124],[84,112],[94,90],[96,64]],[[126,480],[130,458],[132,422],[130,372],[134,308],[130,248],[134,200],[136,152],[130,124],[116,112],[106,90],[104,64]]]},"spiral":{"full":[[[128,140],[100,180],[84,224],[72,300],[74,360],[80,422],[90,480]],[[72,140],[100,180],[116,224],[128,300],[126,360],[120,422],[110,480]]],"upper":[[[128,140],[100,180],[86,212]],[[72,140],[100,180],[114,212]]],"lower":[[[86,212],[84,224],[72,300],[74,360],[80,422],[90,480]],[[114,212],[116,224],[128,300],[126,360],[120,422],[110,480]]]},"arm":{"full":[[[100,140],[78,126],[56,122],[46,152],[41,200],[42,252],[40,292]],[[100,140],[122,126],[144,122],[154,152],[159,200],[158,252],[160,292]]]},"dfl":{"full":[[[94,480],[94,458],[92,422],[94,372],[96,308],[98,262],[100,250]],[[106,480],[106,458],[108,422],[106,372],[104,308],[102,262],[100,250]],[[100,250],[88,220],[80,190],[76,172]],[[100,250],[112,220],[120,190],[124,172]],[[76,172],[90,156],[100,150],[110,156],[124,172]],[[100,150],[100,122],[100,96],[100,80]],[[100,80],[110,74],[118,68]],[[100,80],[90,74],[82,68]]]},"functional":{"full":[[[72,124],[100,176],[118,252]],[[128,124],[100,176],[82,252]]]}},"back":{"sbl":{"full":[[[88,480],[88,458],[86,406],[88,372],[90,308],[90,258],[96,250]],[[112,480],[112,458],[114,406],[112,372],[110,308],[110,258],[104,250]],[[96,250],[100,246],[104,250]],[[100,246],[99,200],[98,148],[99,112],[100,64],[100,22]],[[100,246],[101,200],[102,148],[101,112],[100,64]]]},"sfl":{"full":[]},"lateral":{"full":[[[74,480],[70,458],[68,422],[70,372],[66,308],[72,250],[66,200],[64,152],[70,124],[84,112],[94,90],[96,56]],[[126,480],[130,458],[132,422],[130,372],[134,308],[128,250],[134,200],[136,152],[130,124],[116,112],[106,90],[104,56]]]},"spiral":{"full":[[[88,34],[96,78],[118,128],[132,158],[142,178]],[[112,34],[104,78],[82,128],[68,158],[58,178]],[[58,178],[70,212],[88,240],[84,308],[82,372],[78,422],[88,480]],[[142,178],[130,212],[112,240],[116,308],[118,372],[122,422],[112,480]]],"upper":[[[88,34],[96,78],[118,128],[132,158],[142,178]],[[112,34],[104,78],[82,128],[68,158],[58,178]]],"lower":[[[58,178],[70,212],[88,240],[84,308],[82,372],[78,422],[88,480]],[[142,178],[130,212],[112,240],[116,308],[118,372],[122,422],[112,480]]]},"arm":{"full":[[[80,150],[64,130],[54,120],[46,152],[41,200],[42,252],[40,292]],[[120,150],[136,130],[146,120],[154,152],[159,200],[158,252],[160,292]]]},"dfl":{"full":[]},"functional":{"full":[[[70,148],[100,220],[120,254],[126,330]],[[130,148],[100,220],[80,254],[74,330]]]}},"side":{"sbl":{"full":[[[88,478],[86,460],[80,418],[88,372],[84,304],[76,262],[74,230],[82,190],[82,142],[90,112],[88,76],[74,58],[90,22],[124,28],[128,48]]]},"sfl":{"full":[[[148,480],[138,468],[121,456],[123,408],[126,372],[128,322],[122,256],[124,218],[131,172],[133,148],[116,112],[126,86],[135,60],[128,38],[102,20]]],"upper":[[[133,148],[116,112],[126,86],[135,60],[128,38],[102,20]]],"lower":[[[148,480],[138,468],[121,456],[123,408],[126,372],[128,322],[122,256],[124,218],[131,172],[133,148]]]},"lateral":{"full":[[[110,480],[108,456],[106,408],[108,372],[106,308],[106,250],[108,200],[108,148],[106,112],[108,70]]]},"spiral":{"full":[[[86,36],[92,80],[108,126],[126,152],[122,186],[108,230],[106,308],[108,372],[106,422],[100,478]]],"upper":[[[86,36],[92,80],[108,126],[126,152],[122,186]]],"lower":[[[122,186],[108,230],[106,308],[108,372],[106,422],[100,478]]]},"arm":{"full":[[[128,140],[116,116],[108,112],[138,128],[143,176],[146,236],[152,268],[154,282]],[[86,140],[108,112]]]},"dfl":{"full":[[[100,480],[108,456],[110,408],[108,372],[106,300],[118,256],[124,218],[122,180],[126,140],[116,100],[126,86],[132,68]]]},"functional":{"full":[[[126,124],[122,186],[110,252]]]}}};

/* Neck training lights the lateral line only from the low ribs upward. */
LINES.front.lateral.upper = [
  [[66,200],[64,152],[70,124],[84,112],[94,90],[96,64]],
  [[134,200],[136,152],[130,124],[116,112],[106,90],[104,64]]
];
LINES.front.lateral.lower = [
  [[74,480],[70,458],[68,422],[70,372],[66,308],[70,248],[66,200]],
  [[126,480],[130,458],[132,422],[130,372],[134,308],[130,248],[134,200]]
];
LINES.back.lateral.upper = [
  [[66,200],[64,152],[70,124],[84,112],[94,90],[96,56]],
  [[134,200],[136,152],[130,124],[116,112],[106,90],[104,56]]
];
LINES.back.lateral.lower = [
  [[74,480],[70,458],[68,422],[70,372],[66,308],[72,250],[66,200]],
  [[126,480],[130,458],[132,422],[130,372],[134,308],[128,250],[134,200]]
];
LINES.side.lateral.upper = [[[108,200],[108,148],[106,112],[108,70]]];
LINES.side.lateral.lower = [[[110,480],[108,456],[106,408],[108,372],[106,308],[106,250],[108,200]]];

function segsFor(view, id, litSet, upperOnly) {
  const spec = LINES[view][id];
  if (!spec) return { dim: [], lit: [] };
  const isLit = litSet.has(id);
  const upper = !!(upperOnly && upperOnly[id] && spec.upper);
  if (!isLit) return { dim: spec.full || [], lit: [] };
  if (upper) return { dim: spec.lower || [], lit: spec.upper };
  return { dim: [], lit: spec.full || [] };
}

function lineGroup(segs, kind) {
  if (!segs.length) return "";
  const cls = kind === "lit" ? "lit" : "dim";
  let h = '<g class="'+cls+'">';
  for (const s of segs) {
    if (!s || s.length < 2) continue;
    h += '<path d="'+crPath(s, false)+'"/>';
  }
  return h + "</g>";
}

function figureSVG(view, spec){
  const A = FasciAnatomy;
  if (!A) return "";
  const litSet = new Set(spec.lit||[]);
  const ids = ["functional","spiral","sbl","sfl","dfl","lateral","arm"];
  let dim = [], lit = [];
  for (const id of ids) {
    const s = segsFor(view, id, litSet, spec.upper||{});
    dim = dim.concat(s.dim);
    lit = lit.concat(s.lit);
  }
  let shape = "", clip = "";
  if (view === "front") { shape = '<path class="body" d="'+A.frontBodyD()+'"/>'; clip = A.frontClipD(); }
  else if (view === "back") { shape = '<path class="body" d="'+A.backBodyD()+'"/>'; clip = A.backClipD(); }
  else {
    shape = '<path class="far" d="'+A.sideFarLegD()+'"/><path class="body" d="'+A.sideBodyD()+'"/><path class="arm" d="'+A.sideArmD()+'"/>';
    clip = A.sideClipD();
  }
  const suf = view;
  return '<svg viewBox="0 0 200 500" role="img" aria-label="'+view+' view"><defs><linearGradient id="bod-'+suf+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a4d54"/><stop offset="55%" stop-color="#143c42"/><stop offset="100%" stop-color="#102f34"/></linearGradient><filter id="glow-'+suf+'" x="-40%" y="-20%" width="180%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="lnclip-'+suf+'"><path d="'+clip+'"/></clipPath></defs><ellipse class="ground" cx="100" cy="486" rx="48" ry="7"/>'+shape+'<g clip-path="url(#lnclip-'+suf+')">'+lineGroup(dim,"dim")+'</g>'+lineGroup(lit,"lit")+'<style>.ground{fill:#00000055}.body,.arm{fill:url(#bod-'+suf+');stroke:#c9a06a55;stroke-width:1.15}.far{fill:#102f34;stroke:#c9a06a33;stroke-width:1}.dim path{fill:none;stroke:#c9a06a;stroke-opacity:.13;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}.lit path{fill:none;stroke:#f0d7a4;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round;filter:url(#glow-'+suf+')}</style></svg>';
}

const CHIPS = [
  {id:"sbl", label:"Superficial Back"},
  {id:"sfl", label:"Superficial Front"},
  {id:"lateral", label:"Lateral"},
  {id:"spiral", label:"Spiral"},
  {id:"arm", label:"Arm lines"},
  {id:"dfl", label:"Deep Front"},
  {id:"functional", label:"Functional"}
];
const PLANS = {
  MER2: {lit:["sbl","lateral"], upper:{}, items:[
    {id:"sbl", title:"Superficial Back line", route:"Feet → calves → hamstrings → spine", why:p=>"Load through "+p+" often travels along the calves, hamstrings and spine."},
    {id:"lateral", title:"Lateral line", route:"Outer ankle → IT band → hip", why:p=>"Standing and walking with "+p+" also shares work along the outer thigh and hip."}
  ]},
  MER4: {lit:["dfl","sfl"], upper:{sfl:true}, items:[
    {id:"dfl", title:"Deep Front line", route:"Inner leg → psoas → diaphragm → throat → jaw", why:p=>p+" can connect downward through the deep core toward the jaw."},
    {id:"sfl", title:"Superficial Front line", route:"Chest → neck → scalp", why:p=>"The front of the chest and neck can meet around "+p+"."}
  ]},
  MER5: {lit:["arm","spiral"], upper:{spiral:true}, items:[
    {id:"arm", title:"Arm lines", route:"Chest and upper back → shoulders → hands", why:p=>"Holding around "+p+" often continues into the arms and hands."},
    {id:"spiral", title:"Spiral line", route:"Skull → rhomboids → opposite ribs", why:p=>"This wrap around the rib cage can meet near "+p+"."}
  ]},
  MER1: {lit:["sfl","lateral"], upper:{sfl:true, lateral:true}, items:[
    {id:"sfl", title:"Superficial Front line", route:"Chest → neck → scalp", why:p=>"The front of the neck can meet "+p+" between the chest and the base of the skull."},
    {id:"lateral", title:"Lateral line", route:"Side of the neck → ribs → outer shoulder", why:p=>"The side of the neck and the outer shoulder also share the work around "+p+"."}
  ]},
  MER3: {lit:["dfl","functional"], upper:{}, items:[
    {id:"dfl", title:"Deep Front line", route:"Inner leg → psoas → diaphragm", why:p=>p+" can sit along the deep core, from the inner leg through the diaphragm."},
    {id:"functional", title:"Functional line", route:"Shoulder → trunk → opposite hip", why:p=>p+" can pull diagonally across the trunk toward the opposite hip."}
  ]}
};
function placeOf(reading){
  const areas = reading && reading.painAreas || [];
  const named = areas.map(x=>String(x||"").trim()).filter(Boolean).slice(0,2);
  if (named.length) return named.join(" and ");
  const c = String(reading && reading.complaint || "").replace(/\s+/g," ").trim();
  if (c) return c.length>72 ? c.slice(0,69)+"…" : c;
  return "the reported area";
}
function planFor(manualId){ return PLANS[manualId] || PLANS.MER2; }
function render(manualId, reading){
  const plan = planFor(manualId);
  const spec = {lit:plan.lit, upper:plan.upper};
  const place = placeOf(reading||{});
  const views = [["front","Front"],["back","Back"],["side","Side"]];
  const figs = views.map(([v,label])=>'<figure>'+figureSVG(v, spec)+'<figcaption>'+label+'</figcaption></figure>').join("");
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const sentence=s=>{s=String(s||""); return s?s.charAt(0).toUpperCase()+s.slice(1):s;};
  const items = plan.items.map(it=>'<div class="lnItem"><i></i><div><h3>'+esc(it.title)+'</h3><p class="lnRoute">'+esc(it.route)+'</p><p class="lnWhy">'+esc(sentence(it.why(place)))+'</p></div></div>').join("");
  const chips = CHIPS.map(c=>'<span'+(plan.lit.indexOf(c.id)>=0?' class="on"':'')+'>'+c.label+'</span>').join("");
  return {figs, items, chips, place, lit:plan.lit.slice()};
}
return {render, planFor, placeOf, PLANS, CHIPS};
});
