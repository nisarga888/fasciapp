/* MER assessment v7. One segment, one manual, four chapters.
   Stroke library stays generic. Nothing here is a client record. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_MER_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const DATA_VERSION = "0.23.233";
const BELT_KEYS = ["ocular","oral","cervical","thoracic","diaphragmatic","abdominal","pelvic"];
const BELT_LABEL = {ocular:"Ocular",oral:"Oral",cervical:"Cervical",thoracic:"Thoracic",diaphragmatic:"Diaphragmatic",abdominal:"Abdominal",pelvic:"Pelvic and legs"};
const LEVEL_LABEL = ["Balanced","Mild · to watch","To watch","Strong · over-charged"];
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
  const n = typeof raw==="number" ? raw : (/^-?\d+$/.test(String(raw).trim()) ? Number(raw) : NaN);
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

function chooseSegment(D, belts){
  const pain = uniq([].concat(
    asList(D.pain_areas).flatMap(segmentsIn),
    painClauses(D.complaint).flatMap(segmentsIn),
    painClauses(text(D.pain_type)+" "+text(D.pain_areas)).flatMap(segmentsIn)
  ));
  if (pain.length===1) return {segment:pain[0], reason:"pain", needsChoice:false, options:pain};
  if (pain.length>1) return {segment:null, reason:"pain", needsChoice:true, options:pain};
  const breath = text(D.breath)+" "+text(D.breath_experience);
  const free = /breath(?:ing)? (?:feels |is |seems )?(?:free|easy|unrestricted)|breathe freely|free breath/i.test(breath);
  const restricted = !free && /shallow|held breath|holding (?:the )?breath|restrict|cannot breathe|can't breathe|short of breath/i.test(breath);
  if (restricted) return {segment:"diaphragmatic", reason:"breath", needsChoice:false, options:["diaphragmatic"]};
  const tension = uniq([].concat(
    asList(D.tension_areas).flatMap(segmentsIn),
    String(D.complaint||"").split(/[.;\n]+/).flatMap(segmentsIn),
    asList(D.body_experience).flatMap(segmentsIn),
    asList(D.goal).flatMap(segmentsIn)
  ));
  if (tension.length===1) return {segment:tension[0], reason:"problem", needsChoice:false, options:tension};
  if (tension.length>1) return {segment:null, reason:"problem", needsChoice:true, options:tension};
  const ranked = belts.filter(b=>b.level!=null && b.level>=2).sort((a,b)=>b.level-a.level || BELT_KEYS.indexOf(a.key)-BELT_KEYS.indexOf(b.key));
  if (!ranked.length) return {segment:null, reason:"none", needsChoice:true, options:BELT_KEYS.slice()};
  const top = ranked.filter(b=>b.level===ranked[0].level);
  if (top.length===1) return {segment:top[0].key, reason:"belt", needsChoice:false, options:[top[0].key]};
  return {segment:null, reason:"belt", needsChoice:true, options:top.map(b=>b.key)};
}

function buildReading(catalog, input){
  const cat = catalog||{};
  const modules = ((cat.mer_modules&&cat.mer_modules.modules)||[]);
  const strokes = ((cat.mer_strokes&&cat.mer_strokes.strokes)||[]).slice().sort((a,b)=>(a.manual_order-b.manual_order)||String(a.id).localeCompare(String(b.id)));
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
  const breathBlob = text(D.breath)+" "+text(D.breath_experience);
  const breathFree = /breath(?:ing)? (?:feels |is |seems )?(?:free|easy|unrestricted)|breathe freely|free breath/i.test(breathBlob);
  const painN = numberOrNull(D.pain_intensity);
  const stressN = numberOrNull(D.stress);
  const libraryCounts = {};
  Object.keys(byManual).forEach(id=>{libraryCounts[id]=byManual[id].length});
  return {
    schemaVersion:7,
    dataVersion:DATA_VERSION,
    belts, byManual, modById, libraryCounts,
    choice, segment:choice.segment, needsChoice:choice.needsChoice,
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
    touch:text([D.touch, D.touch_notes].filter(Boolean).join(". ")),
    lines:Array.isArray(cat.fascia_lines)?cat.fascia_lines:[],
    totalCards:strokes.length
  };
}

function activeManual(reading, segment){
  const key = segment===undefined ? reading.segment : segment;
  if (!key) return null;
  return MANUAL_OF[key]||null;
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
  return uniq(items).slice(0,5);
}

function sessionCopy(reading, segment){
  const manualId = activeManual(reading, segment);
  const mod = (reading.modById&&reading.modById[manualId])||{};
  const belt = (reading.belts||[]).find(b=>b.key===segment);
  const pain = painLabel(reading);
  const knee = /\bknee/.test((reading.complaint+" "+reading.painAreas.join(" ")).toLowerCase());
  const name = mod.name|| (belt&&belt.trainingName)||manualId||"MER training";
  const why = pain
    ? name+" is chosen for "+pain+", matched to "+((belt&&belt.label)||"the selected segment").toLowerCase()+"."
    : name+" is chosen from the reported concern in the "+((belt&&belt.label)||"selected").toLowerCase()+" segment.";
  const before = reading.redFlag
    ? "A safety concern is marked. Get the appropriate clearance before hands-on work."
    : knee
      ? "Check the burning knee symptoms and agree on pressure before leg work."
      : segment==="cervical"
        ? "Agree pressure, and do not take the neck to the end of its range."
        : segment==="oral"||segment==="ocular"
          ? "Ask before face, jaw or head contact. Agree what will be left out."
          : segment==="abdominal"
            ? "Agree abdominal contact and work only where the client is comfortable."
            : "Agree pressure and a stop signal before the first stroke.";
  const work = "Use the "+name.replace(/^MER /,"")+" cards below in manual order. Stay with this manual. Adapt or omit pressure and stretches that worsen symptoms.";
  const after = knee
    ? "Record the knee pain score and comfort with walking."
    : reading.painN!=null
      ? "Record the pain score again and what feels different in the worked area."
      : "Record what feels different in the worked area, including anything that feels worse.";
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

function lineSvg(kind){
  const body = "M40 16c7 0 11 7 11 14s-4 11-11 11-11-5-11-11 4-14 11-14zM40 41v30M30 52h20M40 71l-8 34M40 71l8 34";
  const paths = {
    back:"M34 102 L36 74 L38 46 L40 24",
    arms:"M16 54 H64 M28 54 L22 78 M52 54 L58 78",
    front:"M46 102 L44 74 L42 50 L40 28 M28 62 Q40 52 52 62"
  };
  const label = kind==="back"?"Back":kind==="arms"?"Arms":"Core / front";
  return '<figure><svg viewBox="0 0 80 116" role="img" aria-label="'+esc(label)+' line, schematic"><path d="'+body+'" fill="none" stroke="#C99E67" stroke-width="1.2"/><path d="'+(paths[kind]||paths.back)+'" fill="none" stroke="#E7C99A" stroke-width="2" stroke-linecap="round"/></svg><figcaption>'+esc(label)+'</figcaption></figure>';
}

function strokeCard(s, n){
  const muscles = (s.targets||[]).join(", ");
  const areas = (s.body_areas||[]).join(", ");
  const notes = (s.cautions||[]).map(c=>c&&c.text).filter(Boolean);
  const review = s.teacher_review_required ? '<p class="stNote">This record needs teacher review before use. The name is kept; nothing has been invented to fill a gap.</p>' : "";
  return '<article class="stCard"><div class="stK">Stroke '+(n<10?"0":"")+n+'</div><h3>'+esc(s.name)+'</h3>'+(muscles?'<p class="stMusc">'+esc(muscles)+'</p>':'')+(areas?'<p class="stArea">'+esc(areas)+'</p>':'')+notes.map(t=>'<p>'+esc(t)+'</p>').join("")+review+'</article>';
}

function chapterHead(n, title, id){
  return '<div class="chH" id="'+id+'" data-mer-sec="'+esc(title)+'"><b>'+n+'</b><h2>'+esc(title)+'</h2></div>';
}

function renderSessionBody(reading, segment){
  if (!segment){
    const opts = reading.choice.options||BELT_KEYS;
    return '<section class="card mer"><h3 class="gH">Choose one segment</h3><p class="gSub">More than one specific concern is present, or none is clear enough. Pick one. Only that manual is shown, and choosing another replaces this list.</p><div class="segPick">'+opts.map(k=>'<button type="button" data-mer-seg="'+k+'">'+esc(BELT_LABEL[k]||k)+'</button>').join("")+'</div></section>';
  }
  const copy = sessionCopy(reading, segment);
  const cards = visibleCards(reading, segment);
  const picks = BELT_KEYS.map(k=>'<button type="button" data-mer-seg="'+k+'"'+(k===segment?' class="on"':'')+'>'+esc(BELT_LABEL[k])+'</button>').join("");
  const list = cards.length
    ? cards.map((s,i)=>strokeCard(s,i+1)).join("")
    : '<p>No reviewed cards are available for this manual. Nothing is borrowed from another manual.</p>';
  return '<section class="card mer"><h3 class="gH">'+esc(copy.name)+'</h3><p class="gSub">'+esc(copy.focus)+'</p><p><b>Focus:</b> '+esc(copy.why)+'</p><div class="it"><h3>Before</h3><p>'+esc(copy.before)+'</p></div><div class="it"><h3>Work</h3><p>'+esc(copy.work)+'</p></div><div class="it"><h3>After</h3><p>'+esc(copy.after)+'</p></div><div class="segPick" aria-label="Active segment">'+picks+'</div></section><p class="subP">'+esc(copy.name)+' · '+cards.length+' cards in manual order. One manual only.</p>'+list;
}

function renderMer(reading, opts){
  const o = opts||{};
  const segment = o.segment!=null ? o.segment : reading.segment;
  const items = focusItems(reading);
  const grid = [["1","Belts of Tension & Key Findings","merC1"],["2","Body Reading and Myofascial Lines","merC2"],["3","MER session plan with strokes","merC3"],["4","Caution and Homework","merC4"]];
  let h = '<section class="card ovw"><div class="gK">How this report is organised</div><h2 class="gH">MER bodywork guidance</h2><p class="gSub">Four chapters · clear guidance</p><div class="chGrid">'+grid.map(g=>'<a data-j="'+g[2]+'"><b>'+g[0]+'</b><span>'+esc(g[1])+'</span></a>').join("")+'</div></section>';
  h += chapterHead(1, "Belts of Tension & Key Findings", "merC1");
  h += o.beltHtml||'<section class="card bmc"><div class="gK">Belts of tension</div><h2 class="gH">Where tension sits</h2><p class="gSub">No belt map is saved. Missing levels stay unknown.</p></section>';
  h += '<section class="card mer"><h2 class="gH">Focus for this reading</h2>'+(items.length?'<ul class="mL">'+items.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>':'<p>No current symptom is recorded yet.</p>')+'</section>';
  h += '<section class="card mer"><h2 class="gH">Belts and MER trainings</h2>'+reading.belts.map(b=>'<div class="beltRow'+(b.key===segment?' on':'')+'"><div><b>'+esc(b.label)+'</b><small>'+esc(b.trainingName)+'</small></div><span>'+esc(b.levelLabel)+'</span></div>').join("")+'</section>';
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
  const body = o.bodyItems||[];
  if (body.length) h += body.map(card=>'<section class="card brd"><div class="gK">Body reading</div><h2 class="gH">'+esc(card.h)+'</h2><p class="bxp">'+esc(card.p)+'</p></section>').join("");
  else h += '<section class="card brd"><div class="gK">Body reading</div><h2 class="gH">Picture reading</h2><p class="bxp">No picture-reading notes are saved on this assessment.</p></section>';
  const want = ["back","arms","front"];
  const lines = want.map(id=>(reading.lines||[]).find(l=>l.id===id)).filter(Boolean);
  h += '<section class="card mer"><h2 class="gH">Myofascial lines</h2><div class="miniLines">'+lineSvg("back")+lineSvg("arms")+lineSvg("front")+'</div><ul class="mL">'+(lines.length?lines.map(l=>'<li><b>'+esc(l.name)+':</b> '+esc(l.orientation)+'</li>').join(""):'<li>Back, arm and front lines are orientation only.</li>')+'</ul><p class="mCav">These drawings orient the selected training. They do not choose the manual or diagnose a cause.</p></section>';

  h += '<div id="merCh3">'+chapterHead(3, "MER session plan with strokes", "merC3")+'<div id="merCh3Body">'+renderSessionBody(reading, segment)+'</div></div>';
  h += '<div id="merCh4">'+chapterHead(4, "Caution and Homework", "merC4")+'<div id="merCh4Body">'+renderTail(reading, segment)+'</div></div>';
  return h;
}

function renderSession(reading, segment){
  return renderSessionBody(reading, segment);
}
function renderTail(reading, segment){
  const hw = homeworkRows(reading, segment);
  return '<section class="card mer"><h2 class="gH">Keep the work comfortable</h2><ul class="mL">'+cautionItems(reading, segment).map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></section><section class="card mer"><h2 class="gH">Homework</h2><p class="gSub">5–20 minutes daily total. Choose a gentle, familiar practice. Do not work through pain.</p>'+(hw.length?hw.map(row=>'<div class="it"><h3>'+esc(row.title)+'</h3><p>'+esc(row.practice)+'</p><p class="mCav">'+esc(row.note)+'</p></div>').join(""):'<p>No home practice is matched until a segment is chosen.</p>')+'</section>';
}

return {DATA_VERSION, buildReading, renderMer, renderSession, renderTail, visibleCards, activeManual, beltLevel, chooseSegment, BELT_KEYS, MANUAL_OF};
});
