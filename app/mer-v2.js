/* MER assessment v7. One segment, one manual, four chapters.
   Stroke library stays generic. Nothing here is a client record. */
(function(root, factory){
  let lines = root && root.FA_LINES;
  if (!lines && typeof module === "object" && module.exports) { try { lines = require("./mer-lines.js"); } catch (e) { lines = null; } }
  let anatomy = root && root.FasciAnatomy;
  if (!anatomy && typeof module === "object" && module.exports) { try { require("./anatomy.js"); anatomy = globalThis.FasciAnatomy; } catch (e) { anatomy = null; } }
  let figure = root && root.FasciFigure;
  if (!figure && typeof module === "object" && module.exports) { try { figure = require("./figures.js"); } catch (e) { figure = null; } }
  const api = factory(lines, anatomy, figure);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_MER_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(FA_LINES, FA_ANATOMY, FA_FIGURE){
const DATA_VERSION = "0.23.251";
const BELT_KEYS = ["ocular","oral","cervical","thoracic","diaphragmatic","abdominal","pelvic"];
const BELT_LABEL = {ocular:"Ocular",oral:"Oral",cervical:"Cervical",thoracic:"Thoracic",diaphragmatic:"Diaphragmatic",abdominal:"Abdominal",pelvic:"Pelvic and legs"};
const GROUPS = [
  {id:"face", label:"Ocular & Oral", line:"MER4 · Original Face (Cranium)", btn:"MER Original Face", keys:["ocular","oral"]},
  {id:"cervical", label:"Cervical", line:"MER1 · Self-Empowerment", btn:"MER Self-Empowerment", keys:["cervical"]},
  {id:"thorax", label:"Thoracic & Diaphragmatic", line:"MER5 · Inspiration", btn:"MER Inspiration", keys:["thoracic","diaphragmatic"]},
  {id:"abdominal", label:"Abdominal", line:"MER3 · Centering (Pelvis)", btn:"MER Centering", keys:["abdominal"]},
  {id:"pelvic", label:"Pelvic & Legs", line:"MER2 · Grounding", btn:"MER Grounding", keys:["pelvic"]}
];
const LEVEL_LABEL = ["Balanced","Light","Moderate","Strong"];
const MANUAL_OF = {ocular:"MER4",oral:"MER4",cervical:"MER1",thoracic:"MER5",diaphragmatic:"MER5",abdominal:"MER3",pelvic:"MER2"};
const RULES = [
  ["pelvic", /\bknees?\b|\bfeet\b|\bfoot\b|\blegs?\b|\bcalves?\b|\bcalf\b|\bankles?\b|\bhamstrings?\b|\bhips?\b|\bpelvis\b|\bpelvic\b|\bsacrum\b|\bglute|\blow(?:er)? back\b|\blumbar\b/i],
  ["cervical", /\bneck\b|\bcervical\b/i],
  ["thoracic", /upper back|upper-back|mid-?back|\bthoracic\b|between the shoulders|\bchest\b|\bribs?\b|\bshoulder/i],
  ["abdominal", /\bbelly\b|\babdomen\b|\babdominal\b|\bstomach\b/i],
  ["oral", /\bjaw\b|\btmj\b|\bmouth\b/i],
  ["ocular", /\beyes?\b|\bforehead\b|\btemples?\b|\bheadache\b/i]
];

function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function asList(v){
  if (v==null || v==="") return [];
  if (Array.isArray(v)) return v.flatMap(asList);
  return [String(v)];
}
function text(v){return asList(v).map(s=>String(s).trim()).filter(Boolean).join(", ");}
function beltLevel(raw){
  if (raw==null || raw==="") return null;
  if (typeof raw==="boolean") return null;
  if (typeof raw==="object") raw = raw.level!=null ? raw.level : (raw.score!=null ? raw.score : raw.value);
  if (raw==null || raw==="") return null;
  const word = String(raw).trim().toLowerCase();
  if (word==="strong" || word==="strong · over-charged" || word==="over-charged" || word==="overcharged") return 3;
  if (word==="moderate" || word==="to watch") return 2;
  if (word==="light" || word==="mild" || word==="mild · to watch") return 1;
  if (word==="balanced") return 0;
  const n = typeof raw==="number" ? raw : (/^-?\d+$/.test(word) ? Number(word) : NaN);
  if (!Number.isInteger(n) || n<0 || n>3) return null;
  return n;
}
function uniq(a){const o=[]; a.forEach(x=>{if(o.indexOf(x)<0)o.push(x)}); return o;}
function segmentsIn(s){
  const out=[];
  RULES.forEach(([k,re])=>{if(re.test(s||""))out.push(k)});
  return out;
}
function painClauses(s){
  return String(s||"").split(/[.;\n]+/).map(x=>x.trim()).filter(p=>/pain|burning|ache|sore|hurt|discomfort/i.test(p));
}
function numberOrNull(v){
  if (v==null || v==="" || Array.isArray(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function breathBlob(D){return text(D.breath)+" "+text(D.breath_experience);}
function breathIsFree(s){return /feels free|breath(?:ing)? (?:feels |is |seems )?(?:free|easy|unrestricted)|breathe freely|\bfree breath\b/i.test(s||"");}
function breathIsRestricted(s){return !breathIsFree(s) && /hold(?:ing)? (?:my |the |their )?breath|held breath|shallow|chest breath|restrict|cannot breathe|can't breathe|short of breath/i.test(s||"");}
function chooseSegment(D, belts){
  const ordered = [];
  const push = (k)=>{ if(k && ordered.indexOf(k)<0) ordered.push(k); };
  asList(D.pain_areas).forEach(item => segmentsIn(item).forEach(push));
  painClauses(D.complaint).forEach(clause => segmentsIn(clause).forEach(push));
  if (ordered.length) return {segment:ordered[0], reason:"pain", needsChoice:false, options:ordered};
  const breath = breathBlob(D);
  if (breathIsRestricted(breath)) return {segment:"diaphragmatic", reason:"breath", needsChoice:false, options:["diaphragmatic"]};
  const tension = [];
  const pushT = (k)=>{ if(k && tension.indexOf(k)<0) tension.push(k); };
  asList(D.tension_areas).forEach(item => segmentsIn(item).forEach(pushT));
  String(D.complaint||"").split(/[.;\n]+/).forEach(clause => segmentsIn(clause).forEach(pushT));
  asList(D.body_experience).forEach(item => segmentsIn(item).forEach(pushT));
  asList(D.goal).forEach(item => segmentsIn(item).forEach(pushT));
  if (tension.length) return {segment:tension[0], reason:"problem", needsChoice:false, options:tension};
  const ranked = belts.filter(b=>b.level!=null && b.level>=2).sort((a,b)=>b.level-a.level || BELT_KEYS.indexOf(a.key)-BELT_KEYS.indexOf(b.key));
  if (!ranked.length) return {segment:null, reason:"none", needsChoice:true, options:BELT_KEYS.slice()};
  return {segment:ranked[0].key, reason:"belt", needsChoice:false, options:ranked.map(b=>b.key)};
}

function buildReading(catalog, input){
  const cat = catalog||{};
  const modules = ((cat.mer_modules&&cat.mer_modules.modules)||[]);
  const cardRows = (cat.mer_cards&&cat.mer_cards.cards)||null;
  const strokes = (cardRows?cardRows.map(c=>({...c, name:c.title||c.name, targets:c.muscles||c.targets||[], module:Number(String(c.manual||"").replace(/\D/g,""))||c.module||0})):(cat.mer_strokes&&cat.mer_strokes.strokes)||[]).slice().sort((a,b)=>(a.manual_order-b.manual_order)||String(a.id).localeCompare(String(b.id)));
  const modById = {};
  modules.forEach(m=>{modById[m.id]=m});
  const src = input||{};
  const D = src.data||{};
  const R = src.report||{};
  const raw = (R.body_map||{}).belts||{};
  const belts = BELT_KEYS.map(key=>{
    const level = beltLevel(raw[key]);
    const manualId = MANUAL_OF[key];
    const mod = modById[manualId]||{};
    return {key, label:BELT_LABEL[key], level, levelLabel:level==null?"Unknown":LEVEL_LABEL[level], manualId, trainingName:mod.name||manualId, focus:mod.focus||""};
  });
  const choice = chooseSegment(D, belts);
  const byManual = {};
  strokes.forEach(s=>{
    const id = "MER"+s.module;
    (byManual[id]=byManual[id]||[]).push(s);
  });
  const flagText = asList(src.redFlags!=null?src.redFlags:src.red_flags).filter(x=>!/^(none\b|no red|not ticked|clear\b|none ticked)/i.test(String(x).trim()));
  const rf = src.redFlag||src.red_flag||R.red_flag;
  const redFlag = flagText.length>0 || (!!rf && rf.level && rf.level!=="none");
  const gblob = (text(D.energetics)+" "+text(D.energetics_notes)+" "+text(D.body_experience)).toLowerCase();
  const grounded = /well grounded|solid grounding|strong core/.test(gblob) && !/not well grounded|ungrounded|not grounded/.test(gblob);
  const strongCore = /strong core/.test(gblob);
  const breathFree = breathIsFree(breathBlob(D));
  const painN = numberOrNull(D.pain_intensity);
  const stressN = numberOrNull(D.stress);
  const libraryCounts = {};
  Object.keys(byManual).forEach(id=>{libraryCounts[id]=byManual[id].length});
  return {
    schemaVersion:7,
    dataVersion:DATA_VERSION,
    belts, byManual, modById, libraryCounts,
    choice, segment:choice.segment, needsChoice:choice.needsChoice,
    routing:cat.routing||null,
    redFlag, grounded, strongCore, breathFree,
    painN, stressN,
    complaint:text(D.complaint),
    painAreas:asList(D.pain_areas),
    painType:text(D.pain_type),
    tensionAreas:asList(D.tension_areas),
    breath:text(D.breath),
    exercise:text(D.exercise),
    sleep:text(D.sleep),
    energetics:text(D.energetics),
    bodyExperience:text(D.body_experience),
    obsFront:text(D.obs_front),
    obsSide:text(D.obs_side),
    obsBack:text(D.obs_back),
    lines:Array.isArray(cat.fascia_lines)?cat.fascia_lines:[],
    totalCards:strokes.length
  };
}

function groupById(id){return GROUPS.find(g=>g.id===id)||null}
function groupForKey(key){return GROUPS.find(g=>g.keys.indexOf(key)>=0)||null}
function resolveSegment(reading, segment){
  if(!segment) return segment;
  const g = groupById(segment)||groupForKey(segment);
  if(!g) return segment;
  if(reading && g.keys.indexOf(reading.segment)>=0) return reading.segment;
  const opt = reading && (reading.choice&&reading.choice.options||[]).find(k=>g.keys.indexOf(k)>=0);
  return opt||g.keys[0];
}
function activeManual(reading, segment){
  const key = resolveSegment(reading, segment===undefined ? reading.segment : segment);
  if (!key) return null;
  const table = reading.routing && reading.routing.belt_to_manual;
  const fromData = table && table[key] && table[key].manual;
  return fromData || MANUAL_OF[key] || null;
}
function visibleCards(reading, segment){
  const id = activeManual(reading, segment);
  if (!id) return [];
  return (reading.byManual[id]||[]).slice();
}

function painLabel(reading){
  const where = reading.painAreas.length?reading.painAreas.join(", "):"";
  const kind = reading.painType?reading.painType.toLowerCase():"";
  const bits = [];
  if (kind && where) bits.push(kind+" "+where);
  else if (where) bits.push(where);
  else if (reading.complaint) bits.push(reading.complaint);
  if (reading.painN!=null) bits.push("pain "+reading.painN+"/10");
  return bits.join(", ");
}

function focusItems(reading){
  const items = [];
  const complaint = reading.complaint;
  if (complaint && !/pain\s*\d+\s*\/\s*10/i.test(complaint)) items.push(complaint.replace(/\s+/g," ").trim());
  else if (complaint) items.push(complaint.replace(/\s+/g," ").trim());
  const label = painLabel(reading);
  if (label && items.join(" ").toLowerCase().indexOf(label.toLowerCase())<0) items.push(label);
  if (reading.breath){
    const b = reading.breath.replace(/\s+/g," ").trim();
    items.push(/^breath/i.test(b)?b:"Breath: "+b);
  }
  if (reading.tensionAreas.length) items.push("Tension: "+reading.tensionAreas.join(", "));
  const extra = (reading.choice.options||[]).slice(1).map(k=>BELT_LABEL[k]).filter(Boolean);
  if (extra.length) items.push("Other reported regions stay on the map and do not add another manual: "+extra.join(", ")+".");
  return uniq(items).slice(0,6);
}

function sessionCopy(reading, segment){
  const manualId = activeManual(reading, segment);
  const mod = (reading.modById&&reading.modById[manualId])||{};
  const belt = (reading.belts||[]).find(b=>b.key===segment);
  const own = (reading.painAreas.join(" ")+" "+reading.complaint).toLowerCase();
  const knee = /\bknee/.test(own);
  const place = (belt&&belt.label)||"the selected area";
  const name = mod.name|| (belt&&belt.trainingName)||manualId||"MER training";
  const pain = painLabel(reading);
  const why = pain
    ? name+" is chosen for this client's reported issue ("+pain+"), matched to "+place.toLowerCase()+"."
    : name+" is chosen from this client's reported concern in the "+place.toLowerCase()+" segment.";
  const before = reading.redFlag
    ? "A safety concern is marked on this intake. Get the appropriate clearance before hands-on work."
    : (knee?"Screen this client's knee symptoms and agree on pressure before leg work."
      : segment==="cervical"?"Agree pressure for this client's neck, and do not take it to the end of its range."
      : segment==="diaphragmatic"?"This client reported a breath restriction. Agree an easy breath and do not force the inhale."
      : segment==="oral"||segment==="ocular"?"Ask before face, jaw or head contact for this client. Agree what will be left out."
      : segment==="abdominal"?"Agree abdominal contact for this client, and work only where they are comfortable."
      : "Agree pressure and a stop signal before the first stroke for this client.");
  const work = "Use this client's "+name.replace(/^MER /,"")+" cards below, in this manual's order. Do not add another manual.";
  const after = knee
    ? "Record this client's knee pain score"+(reading.painN!=null?" (now pain "+reading.painN+"/10)":"")+" and comfort with walking."
    : reading.painN!=null
      ? "Record this client's pain score again (now pain "+reading.painN+"/10) and what changed in "+place.toLowerCase()+"."
      : "Record what changed for this client in "+place.toLowerCase()+".";
  return {manualId, name, focus:mod.focus||"", why, before, work, after, beltLabel:belt?belt.label:""};
}

function homeworkRows(reading, segment){
  const manualId = activeManual(reading, segment);
  const blob = (reading.complaint+" "+reading.tensionAreas.join(" ")+" "+reading.bodyExperience+" "+reading.painAreas.join(" ")).toLowerCase();
  const rows = [];
  const add = (title, practice, note, main)=>{rows.push({title, practice, note, main:!!main})};
  if (manualId==="MER2") add("Grounding", "Kundalini meditation / shaking", reading.grounded?"Optional: grounding is already reported as a resource.":"For this session.", !reading.grounded);
  if (manualId==="MER1"||manualId==="MER3"||/pelvic|spine|holding/.test(blob)) add("Pelvis alignment and spine", "Myofascial unwinding", manualId==="MER1"||manualId==="MER3"?"For this session.":"For the pelvic or spine concern.", manualId==="MER1"||manualId==="MER3");
  if (manualId==="MER4"||/neck|shoulder|upper back|cranium|jaw|face/.test(blob)) add("Neck, shoulders, cranium", "Qigong / myofascial unwinding", manualId==="MER4"?"For this session.":"For the upper-back, neck or shoulder concern.", manualId==="MER4");
  if (manualId==="MER3"||manualId==="MER5"||reading.strongCore) add("Core presence", "Vipassana meditation", reading.strongCore?"Optional. A strong core is a resource, not a deficit to treat.":(manualId==="MER3"||manualId==="MER5"?"For this session.":"Optional."), (manualId==="MER3"||manualId==="MER5")&&!reading.strongCore);
  if (manualId!=="MER2" && /feet|knee|leg|ground/.test(blob)) add("Grounding", "Kundalini meditation / shaking", reading.grounded?"Optional: grounding is already reported as a resource.":"For the leg or foot concern.", false);
  const seen = {};
  return rows.filter(r=>{if(seen[r.title])return false; seen[r.title]=1; return true});
}

function cautionItems(reading, segment){
  const blob = (reading.complaint+" "+reading.painType+" "+reading.painAreas.join(" ")).toLowerCase();
  const items = [];
  if (reading.redFlag) items.push("A safety concern is marked. Hands-on work waits for the right clearance. This screen is not that clearance.");
  if (/burn/.test(blob) && /knee/.test(blob)) items.push("Screen the burning knee pain before deeper or loaded leg work.");
  else if (/burn|worsen|numb|tingl|weak|swell/.test(blob)) items.push("Screen the reported symptom before deeper or loaded work.");
  items.push("Stop and seek appropriate assessment for worsening burning, new numbness, weakness or swelling.");
  items.push("No forced neck, jaw, hip or knee movement. Agree touch and boundaries before each new area.");
  if (reading.touch) items.push("Touch boundary from the intake: "+reading.touch);
  if (segment==="ocular"||segment==="oral") items.push("Orbital and intraoral techniques in this manual need explicit consent and the right scope. They are not a default.");
  if (!reading.redFlag) items.push("No red flag is marked. That is not medical clearance.");
  return items;
}

function lineFigures(manualId, reading){
  const block = FA_LINES && FA_LINES.render ? FA_LINES.render(manualId, reading||{}) : null;
  if (!block) return '<section class="card mer"><h2 class="gH">Myofascial lines</h2><p class="mCav">These areas connect through the selected training. They do not diagnose a cause.</p></section>';
  return '<section class="card mer"><div class="gK">Body reading</div><h2 class="gH">Myofascial lines</h2><div class="lineFigs">'+block.figs+'</div><div class="lnLegend">'+block.items+'</div><div class="lnChips">'+block.chips+'</div><p class="mCav">These areas connect through the selected training. They do not diagnose a cause.</p></section>';
}
function cautionTexts(s){
  return (s.cautions||[]).map(c=>typeof c==="string"?c:(c&&c.text)||"").filter(Boolean);
}
function strokeCard(s, n){
  const title = s.title||s.name||"";
  const muscles = (s.muscles||s.targets||[]);
  const muscleText = Array.isArray(muscles)?muscles.join(", "):String(muscles||"");
  const explanation = s.explanation||"";
  const pic = (path, cls, alt)=>path?'<img class="'+cls+'" alt="'+esc(alt)+'" data-mer-src="'+esc(path)+'" loading="lazy" decoding="async">':'';
  const media = (s.photo||s.anatomy)?'<div class="stMedia">'+pic(s.anatomy,"anatomy","Muscle drawing, "+title)+pic(s.photo,"photo",title)+'</div>':'';
  const review = s.teacher_review_required ? '<p class="stNote">Needs teacher review before use.</p>' : "";
  return '<article class="stCard"><div class="stK">Stroke '+String(n).padStart(2,"0")+'</div><h3>'+esc(title)+'</h3>'+media+(muscleText?'<p class="stMusc">'+esc(muscleText)+'</p>':'')+(explanation?'<p>'+esc(explanation)+'</p>':'')+cautionTexts(s).map(t=>'<p class="stNote">'+esc(t)+'</p>').join("")+review+'</article>';
}

function chapterHead(n, title, id){
  return '<div class="chH" id="'+id+'" data-mer-sec="'+esc(title)+'"><b>'+n+'</b><h2>'+esc(title)+'</h2></div>';
}

const ANATOMY_BELT = {face:"ocular", cervical:"cervical", thorax:"thoracic", abdominal:"abdominal", pelvic:"pelvic"};
function levelChip(reading, g){
  const label = groupLevel(reading||{}, g);
  const map = {"Balanced":["balanced","Balanced"], "Light":["light","Light"], "Mild · to watch":["light","Light"], "Moderate":["moderate","Moderate"], "To watch":["moderate","Moderate"], "Strong":["strong","Strong"], "Strong · over-charged":["strong","Strong"]};
  const pair = map[label] || ["mild","Unknown"];
  return '<span class="chip '+pair[0]+'"><i></i>'+esc(pair[1])+'</span>';
}
function groupLevelNum(reading, g){
  const rows = g.keys.map(k=>(reading.belts||[]).find(b=>b.key===k)).filter(Boolean);
  const known = rows.filter(b=>b.level!=null).sort((a,b)=>b.level-a.level);
  return known.length ? known[0].level : null;
}
function levelShort(n){
  if (n===3) return ["strong","Strong"];
  if (n===2) return ["moderate","Moderate"];
  if (n===1) return ["light","Light"];
  if (n===0) return ["balanced","Balanced"];
  return ["light","Unknown"];
}
function issuePhrase(reading){
  const c = String(reading && reading.complaint || "").replace(/\s+/g," ").trim();
  if (c && c.length<=48) return c.charAt(0).toLowerCase()+c.slice(1);
  const area = reading && reading.painAreas && reading.painAreas[0] ? String(reading.painAreas[0]) : "";
  const kind = reading && reading.painType ? String(reading.painType).split(",")[0].trim().toLowerCase() : "";
  if (kind && area) return kind+" "+area;
  if (area) return area;
  if (c) return c.slice(0,45)+"…";
  return "the reported issue";
}
function buildSessions(reading){
  const main = groupForKey(reading && reading.segment);
  const rows = GROUPS.map(g=>({g:g, level:groupLevelNum(reading, g)}));
  const rank = (x)=>{
    const primary = !!(main && x.g.id===main.id);
    if (x.level===3) return primary ? 0 : 1;
    if (x.level===2) return primary ? 2 : 3;
    return primary ? 4 : 5;
  };
  const sessions = rows.filter(x=>x.level===1||x.level===2||x.level===3)
    .sort((a,b)=>rank(a)-rank(b) || GROUPS.indexOf(a.g)-GROUPS.indexOf(b.g))
    .map((x,i)=>({id:x.g.id, g:x.g, level:x.level, n:i+1, anatomy:ANATOMY_BELT[x.g.id]}));
  if (!sessions.length && main){
    sessions.push({id:main.id, g:main, level:groupLevelNum(reading, main), n:1, anatomy:ANATOMY_BELT[main.id]});
  }
  const skipped = rows.filter(x=>x.level===0 && !sessions.some(s=>s.id===x.g.id)).map(x=>x.g);
  return {sessions, skipped};
}
function sessionStatus(s, sessions, done){
  if (done.indexOf(s.id)>=0) return "done";
  const now = sessions.find(x=>done.indexOf(x.id)<0);
  if (now && now.id===s.id) return "now";
  const idx = sessions.findIndex(x=>x.id===s.id);
  const nowIdx = now ? sessions.findIndex(x=>x.id===now.id) : -1;
  return idx===nowIdx+1 ? "next" : "later";
}
function sessionWhy(reading, s, prev){
  const main = groupForKey(reading && reading.segment);
  if (main && s.id===main.id) return "Chosen for this client's "+issuePhrase(reading)+".";
  if (s.level===3 && prev) return "The next Strong belt, after "+prev.g.btn.replace(/^MER /,"")+".";
  if (s.level===3) return "A Strong belt.";
  if (s.level===2) return "Moderate, after the stronger belts.";
  return "Light, after the belts that need more attention.";
}
function flowMarkup(reading, openId, done){
  done = done||[];
  const plan = buildSessions(reading);
  const sessions = plan.sessions;
  let view = sessions.findIndex(s=>s.id===openId);
  const asked = openId && view<0 ? (groupById(openId)||groupForKey(openId)) : null;
  if (view<0 && !asked){
    const now = sessions.find(s=>done.indexOf(s.id)<0);
    view = now ? sessions.indexOf(now) : 0;
  }
  const open = asked
    ? {id:asked.id, g:asked, level:groupLevelNum(reading, asked), n:sessions.length+1, anatomy:ANATOMY_BELT[asked.id]}
    : (sessions[view] || null);
  if (!open) return "";
  const lit = open.anatomy;
  const badges = sessions.map(s=>({id:s.anatomy, n:s.n, done:done.indexOf(s.id)>=0, current:s.id===open.id && done.indexOf(s.id)<0}));
  const svg = (FA_FIGURE && FA_FIGURE.svgFigure) ? FA_FIGURE.svgFigure({
    id:"flow", midline:true, lit:lit,
    muted:plan.skipped.map(g=>ANATOMY_BELT[g.id]),
    doneZones:sessions.filter(s=>done.indexOf(s.id)>=0).map(s=>s.anatomy),
    badges:badges, journey:sessions.map(s=>s.anatomy)
  }) : "";
  const rows = sessions.map(s=>{
    const st = sessionStatus(s, sessions, done);
    const pair = levelShort(s.level);
    const label = st==="done"?"DONE":st==="now"?"NOW":st==="next"?"NEXT":"LATER";
    const tag = st==="done"?"done-tag":st==="now"?"now":st==="next"?"next-tag":"later-tag";
    const dot = s.level===3 ? '<span class="rec"></span>' : "";
    const cls = "sess slim"+(s.id===open.id?" current":"")+(st==="done"?" done":"");
    return '<button type="button" class="'+cls+'" data-mer-seg="'+s.id+'"><span class="num">'+(st==="done"?"✓":String(s.n))+'</span><span class="copy"><b class="belt">'+esc(s.g.label)+'</b><span class="mer">'+esc(s.g.btn)+'</span><span class="meta"><span class="'+tag+'">'+label+'</span><span class="chip '+pair[0]+'"><i></i>'+pair[1]+'</span>'+dot+'</span></span></button>';
  }).join("");
  const skips = plan.skipped.length===1
    ? '<p class="skip-note">Skipped · '+esc(plan.skipped[0].label)+' · <span class="chip balanced"><i></i>Balanced</span></p>'
    : "";
  return '<div class="flow"><div class="flowSplit"><div class="body-wrap">'+svg+'</div><div class="flowList">'+rows+'</div></div>'+skips+'</div>';
}
function groupLevel(reading, g){
  const rows = g.keys.map(k=>(reading.belts||[]).find(b=>b.key===k)).filter(Boolean);
  const known = rows.filter(b=>b.level!=null).sort((a,b)=>b.level-a.level);
  if(!known.length) return "Unknown";
  return known[0].levelLabel;
}
function renderSessionBody(reading, segment, flow){
  flow = flow||{};
  const done = flow.done||[];
  const plan = buildSessions(reading);
  let open = flow.open || segment;
  if (open){
    const g = groupById(open)||groupForKey(open);
    open = g ? g.id : null;
  }
  if (!open){
    const main = groupForKey(reading && reading.segment);
    if (main && plan.sessions.some(s=>s.id===main.id)) open = main.id;
    else if (plan.sessions[0]) open = plan.sessions[0].id;
  }
  if (!open){
    return '<section class="card mer"><h3 class="gH">Choose one training</h3><p class="gSub">Nothing in the intake matches one training yet. Pick one. Only that manual is shown, and choosing another replaces this list.</p></section>';
  }
  const key = resolveSegment(reading, open);
  const copy = sessionCopy(reading, key);
  const cards = visibleCards(reading, open);
  const picks = flowMarkup(reading, open, done);
  const sess = plan.sessions.find(s=>s.id===open);
  const n = sess ? sess.n : 1;
  const end = done.indexOf(open)>=0
    ? '<button type="button" class="flowUndo" data-mer-undo="'+open+'">Undo completion</button>'
    : '<button type="button" class="flowDone" data-mer-done="'+open+'" data-session-n="'+n+'">Mark session '+n+' complete</button>';
  const list = cards.length
    ? cards.map((s,i)=>strokeCard(s,i+1)).join("")
    : '<p>No reviewed cards are available for this manual. Nothing is borrowed from another manual.</p>';
  return '<section class="card mer"><div class="gK">Session flow</div><h3 class="gH">'+esc(copy.name)+'</h3><p class="gSub">'+plan.sessions.length+' session'+(plan.sessions.length===1?"":"s")+' · ordered by priority</p><p><b>Focus:</b> '+esc(copy.why)+'</p>'+picks+'</section><div id="merStrokes">'+end+list+'</div>';
}

function renderMer(reading, opts){
  const o = opts||{};
  const segment = resolveSegment(reading, o.segment!=null ? o.segment : reading.segment);
  const items = focusItems(reading);
  const grid = [["1","Belts of Tension & Key Findings","merC1"],["2","Body Reading and Myofascial Lines","merC2"],["3","MER session plan with strokes","merC3"],["4","Caution and Homework","merC4"]];
  let h = '<div id="merAhead"><section class="card ovw"><div class="gK">How this report is organised</div><h2 class="gH">MER bodywork guidance</h2><p class="gSub">Four chapters · clear guidance</p><div class="chGrid">'+grid.map(g=>'<a data-j="'+g[2]+'"><b>'+g[0]+'</b><span>'+esc(g[1])+'</span></a>').join("")+'</div></section>';
  h += chapterHead(1, "Belts of Tension & Key Findings", "merC1");
  h += o.beltHtml||'<section class="card bmc"><div class="gK">Belts of tension</div><h2 class="gH">Where tension sits</h2><p class="gSub">No belt map is saved. Missing levels stay unknown.</p></section>';
  h += '<section class="card mer"><h2 class="gH">Focus for this reading</h2>'+(items.length?'<ul class="mL">'+items.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>':'<p>No current symptom is recorded yet.</p>')+'</section>';
  const begin = [];
  if (reading.stressN!=null) begin.push("Stress level: "+reading.stressN+"/10; agree an easy pace and a stop signal.");
  const res = [];
  if (reading.grounded) res.push("Grounding, or a strong core, is a resource");
  if (reading.sleep) res.push("sleep: "+reading.sleep);
  if (reading.exercise) res.push("movement: "+reading.exercise);
  if (res.length) begin.push(res.join("; ")+".");
  if (reading.breathFree) begin.push("Breath is reported free. A belt level does not turn that into a breathing problem.");
  if (begin.length) h += '<section class="card mer"><h2 class="gH">Before you begin</h2><ul class="mL">'+begin.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></section>';

  h += chapterHead(2, "Body Reading and Myofascial Lines", "merC2");
  const intake = [];
  if (reading.energetics || reading.exercise || reading.sleep) intake.push(["Positive qualities", [reading.energetics, reading.exercise && ("Movement: "+reading.exercise), reading.sleep && ("Sleep: "+reading.sleep)].filter(Boolean).join(". ")]);
  if (reading.complaint || reading.painAreas.length) intake.push(["What this client reported", [reading.complaint, reading.painAreas.length && ("Areas: "+reading.painAreas.join(", ")), reading.painN!=null && ("pain "+reading.painN+"/10"), reading.painType].filter(Boolean).join(". ")]);
  if (reading.breath) intake.push(["Breath they reported", reading.breath]);
  [["Front", reading.obsFront],["Side", reading.obsSide],["Back", reading.obsBack]].forEach(([h2,p])=>{ if(p) intake.push([h2,p]); });
  if (intake.length) h += intake.map(([title, body])=>'<section class="card brd"><div class="gK">From this intake</div><h2 class="gH">'+esc(title)+'</h2><p class="bxp">'+esc(body)+'</p></section>').join("");
  const body = o.bodyItems||[];
  if (body.length) h += body.map(card=>'<section class="card brd"><div class="gK">Saved picture reading</div><h2 class="gH'+(card.noteH?" faNote":"")+'"'+(card.pathH?' data-p="'+esc(card.pathH)+'"':'')+'>'+esc(card.h)+'</h2><p class="bxp'+(card.note?" faNote":"")+'"'+(card.path?' data-p="'+esc(card.path)+'"':'')+'>'+esc(card.p)+'</p></section>').join("");
  else if (!intake.length) h += '<section class="card brd"><div class="gK">From this intake</div><h2 class="gH">Picture reading</h2><p class="bxp">No picture-reading notes are saved on this assessment.</p></section>';
  h += lineFigures(activeManual(reading, segment), reading);
  h += '</div>';

  h += '<div id="merCh3">'+chapterHead(3, "MER session plan with strokes", "merC3")+'<div id="merCh3Body">'+renderSessionBody(reading, segment)+'</div></div>';
  h += '<div id="merCh4">'+chapterHead(4, "Caution and Homework", "merC4")+'<div id="merCh4Body">'+renderTail(reading, segment)+'</div></div>';
  return h;
}

function renderSession(reading, segment, flow){
  return renderSessionBody(reading, segment, flow);
}
function renderTail(reading, segment){
  segment = resolveSegment(reading, segment);
  const hw = homeworkRows(reading, segment);
  const copy = segment ? sessionCopy(reading, segment) : null;
  const summary = copy
    ? '<section class="card mer" id="merSummary"><div class="gK">Session summary</div><h2 class="gH">Before, work and after</h2><div class="it"><h3>Before</h3><p>'+esc(copy.before)+'</p></div><div class="it"><h3>Work</h3><p>'+esc(copy.work)+'</p></div><div class="it"><h3>After</h3><p>'+esc(copy.after)+'</p></div></section>'
    : "";
  return '<section class="card mer"><h2 class="gH">Keep the work comfortable</h2><ul class="mL">'+cautionItems(reading, segment).map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></section><section class="card mer"><h2 class="gH">Homework</h2><p class="gSub">5–20 minutes daily total. Choose a gentle, familiar practice. Do not work through pain.</p>'+(hw.length?hw.map(row=>'<div class="it"><h3>'+esc(row.title)+'</h3><p>'+esc(row.practice)+'</p><p class="mCav">'+esc(row.note)+'</p></div>').join(""):'<p>No home practice is matched until a segment is chosen.</p>')+'</section>'+summary;
}

return {DATA_VERSION, buildReading, renderMer, renderSession, renderTail, visibleCards, activeManual, beltLevel, chooseSegment, resolveSegment, buildSessions, BELT_KEYS, GROUPS, MANUAL_OF};
});
