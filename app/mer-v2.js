/* MER tab v2. Generic, assessment-driven reading. Teaching JSON is loaded by the page.
   Does not replace window.FA_TI or the BBTRS cards. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_MER_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const DATA_VERSION = "0.23.232";
const BELT_KEYS = ["ocular","oral","cervical","thoracic","diaphragmatic","abdominal","pelvic"];
const BELT_LABEL = {ocular:"Ocular",oral:"Oral",cervical:"Cervical",thoracic:"Thoracic",diaphragmatic:"Diaphragmatic",abdominal:"Abdominal",pelvic:"Pelvic & legs"};
const LEVEL_LABEL = ["Balanced","Mild · to watch","To watch","Strong · over-charged"];
const TIE = ["MER1","MER3","MER2","MER5","MER4","MER6"];
const RETEST = {
  thor:"Chest expansion, rotation and ease through the back.",
  cerv:"Comfortable rotation, head support, swallowing and breath.",
  shou:"Overhead reach, scapular position and neck ease. Do not force range.",
  legs:"Balance, the arches, and how the feet meet the floor. No forced stretch.",
  pelv:"Pelvic comfort, hip rotation and low-back ease, in the client’s words. Not an alignment grade.",
  diaph:"Breath depth and rib ease, without pushing a breath hold."
};

function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function asList(v){
  if (v==null || v==="") return [];
  if (Array.isArray(v)) return v.flatMap(asList);
  return [String(v)];
}
function asText(v){return asList(v).map(s=>s.trim()).filter(Boolean).join(", ");}
function blob(v){return asText(v).toLowerCase();}
function has(text, re){return re.test(text||"");}
function beltLevel(raw){
  if (raw==null || raw==="") return null;
  if (typeof raw==="boolean") return null;
  const n = typeof raw==="number" ? raw : (/^-?\d+$/.test(String(raw).trim()) ? Number(raw) : NaN);
  if (!Number.isInteger(n) || n<0 || n>3) return null;
  return n;
}
function blockReason(stroke){
  if (!stroke) return "missing";
  if (stroke.teacher_review_required) return "teacher-review";
  const name = String(stroke.name||"").toLowerCase();
  const targets = (stroke.targets||[]).join(" ").toLowerCase();
  const areas = (stroke.body_areas||[]).join(" ").toLowerCase();
  const b = name+" "+targets+" "+areas;
  if (/psoas/.test(b)) return "psoas";
  if (/intraoral|inside work|pterygoid/.test(b)) return "intraoral";
  if (/\borbit\b|orbital|orbicularis/.test(b) || areas.split(/,\s*|\s+/).includes("eyes") || /\beyes\b/.test(areas)) return "orbital";
  if (/pelvic floor|levator ani|coccygeus|pubococcygeus|iliococcygeus|pelvic diaphragm/.test(b)) return "intimate";
  if (/scalene|sternocleidomastoid|\bscm\b|infrahyoid|suprahyoid|longus colli|anterior neck/.test(b)) return "anterior-neck";
  if (/\babdomen\b/.test(areas) || /rectus abdominis|transversus abdominis|deep abdominal/.test(b)) return "abdominal";
  if (/diaphragm/.test(b)) return "diaphragm";
  return "";
}
function allowed(stroke, allowDiaphragm){
  const why = blockReason(stroke);
  if (!why) return true;
  return why==="diaphragm" && !!allowDiaphragm;
}
function pageOf(stroke){
  const n = stroke && stroke.source && stroke.source.pdf_page;
  return Number.isInteger(n) ? n : null;
}
function manualName(modNum){return "MER"+modNum+" manual";}
function strokeRef(stroke, conditional){
  return {
    id:stroke.id,
    name:stroke.name,
    moduleId:"MER"+stroke.module,
    manualOrder:stroke.manual_order,
    manual:manualName(stroke.module),
    pdfPage:pageOf(stroke),
    areas:(stroke.body_areas||[]).slice(),
    targets:(stroke.targets||[]).slice(),
    technique:stroke.technique_type||"",
    conditional:!!conditional,
    blocked:blockReason(stroke)
  };
}
function pagesLabel(nums){
  const p = (nums||[]).filter(n=>Number.isInteger(n));
  if (!p.length) return "";
  return p.length===1 ? "PDF p."+p[0] : "PDF pp."+p.join(", ");
}
function strokeLine(s){
  const pg = s.pdfPage==null ? "" : " · PDF p."+s.pdfPage;
  return s.name+" ("+s.manual+pg+" · "+s.id+")";
}

function buildReading(catalog, input){
  const cat = catalog||{};
  const modules = (cat.mer_modules&&cat.mer_modules.modules)||[];
  const strokes = (cat.mer_strokes&&cat.mer_strokes.strokes)||[];
  const routing = cat.mer_routing||{};
  const homeworkAll = Array.isArray(cat.homework_mapping)?cat.homework_mapping:[];
  const lines = Array.isArray(cat.fascia_lines)?cat.fascia_lines:[];
  const byId = new Map(strokes.map(s=>[s.id,s]));
  const modById = new Map(modules.map(m=>[m.id,m]));
  const src = input||{};
  const D = src.data||{};
  const R = src.report||{};
  const map = R.body_map||{};
  const rawBelts = map.belts||{};
  const belts = BELT_KEYS.map(key=>{
    const level = beltLevel(rawBelts[key]);
    return {key, level, levelLabel:level==null?"Unknown":LEVEL_LABEL[level], provenance:"saved-report"};
  });
  const belt = Object.fromEntries(belts.map(b=>[b.key,b.level]));
  const at = (key, min)=>belt[key]!=null && belt[key]>=min;

  const complaint = [D.complaint,D.pain_areas,D.tension_areas,D.reasons,D.goal,D.body_experience,D.stress_response,D.injuries,D.structural,D.structural_other].map(blob).join(" \n ");
  const exam = [D.obs_front,D.obs_side,D.obs_back,D.contradictions].concat(["mv_neck_rotation","mv_neck_side_bend","mv_arm_elevation","mv_hand_behind_back","mv_thoracic_rotation","mv_rib_expansion","mv_hip_ir_er","mv_forward_fold","mv_single_leg_balance","mv_foot_arch_toes"].map(k=>D[k])).map(blob).join(" \n ");
  const said = complaint+" \n "+exam;
  const breathBlob = [D.breath,D.breath_experience,D.mv_rib_expansion].map(blob).join(" \n ");
  const breathFree = has(breathBlob, /breath(?:ing)? (?:feels |is |seems )?(?:free|easy|unrestricted)|breathe freely|free breath/);
  const breathRestricted = !breathFree && has(breathBlob, /shallow|held breath|holding (?:the )?breath|restrict|cannot breathe|can't breathe|short of breath|tight breath|stuck breath/);
  const gblob = [D.energetics,D.energetics_notes,D.body_experience].map(blob).join(" \n ");
  const grounded = has(gblob, /well grounded|solidly grounded|solid grounding|strong core/) && !has(gblob, /not well grounded|ungrounded|not grounded/);
  const back = has(said, /upper back|upper-back|thoracic|between the shoulders|mid-?back|rounded (?:upper )?back|low(?:er)? back|lumbar/);
  const upperBack = has(said, /upper back|upper-back|thoracic|between the shoulders|mid-?back|rounded (?:upper )?back/);
  const lowBack = has(said, /low(?:er)? back|lumbar/);
  const neck = has(said, /\bneck\b|cervical/);
  const shoulder = has(said, /shoulder|scapula/);
  const pelvis = has(said, /pelvic|pelvis|\bhip\b|sacroiliac|\bsi joint\b|bracing|anal contraction/);
  const legs = has(said, /\bfeet\b|\bfoot\b|\blegs?\b|\bknees?\b|\bcalves\b|\bcalf\b|\bankles?\b|\bhamstrings?\b/);
  const face = has(said, /\bjaw\b|\btmj\b|\bface\b|\beyes?\b|\bforehead\b|\btemples?\b|\bheadache\b|\bcranium\b|\bhead\b/);
  const abdomen = has(said, /\bbelly\b|\babdomen\b|\babdominal\b|\bdigest|\bstomach\b|\bc-section\b|\bscar\b/);
  const burning = has([D.complaint,D.pain_type,D.pain_areas,D.tension_areas,D.worse].map(blob).join(" \n "), /burning|worsen|numb|tingl|weakness/);

  const flagText = asList(src.redFlags!=null?src.redFlags:src.red_flags).filter(x=>!/^(none\b|no red|not ticked|clear\b|none ticked)/i.test(String(x).trim()));
  const rf = src.redFlag||src.red_flag||R.red_flag;
  const redFlag = flagText.length>0 || (!!rf && rf.level && rf.level!=="none");
  const allowDiaphragm = breathRestricted && !redFlag;

  const picked = new Map();
  function add(id, tier, relevance, reason){
    const prev = picked.get(id);
    if (!prev || tier<prev.tier) picked.set(id,{id,tier,relevance,reasons:[reason]});
    else if (tier===prev.tier && !prev.reasons.includes(reason)) prev.reasons.push(reason);
  }
  if (back || neck || shoulder) add("MER1",1,"focus","A back, neck or shoulder concern is reported. Self-Empowerment is the back and neck foundation for that region.");
  else if (at("thoracic",3) || at("cervical",3)) add("MER1",3,"support","A strong saved thoracic or cervical belt invites a back and neck check. The level is not re-scored here.");
  else if (at("thoracic",2) || at("cervical",2)) add("MER1",4,"conditional","A saved watch level on the thoracic or cervical belt is context for Self-Empowerment, not a finding by itself.");

  if (pelvis) add("MER3",1,"focus","Pelvic, hip or bracing concern is reported. Centering stays peripheral. Reported holding is not a pelvic-tilt diagnosis.");
  else if (at("pelvic",3)) add("MER3",3,"support","The saved pelvic belt is strong. That invites a check, not a conclusion that support or alignment is lacking.");
  else if (at("pelvic",2)) add("MER3",4,"conditional","The saved pelvic belt is a watch level. Centering stays optional until the client confirms what they feel.");

  if (legs) add("MER2",2,"conditional","Feet, legs or knees are part of what is reported. Grounding is screened support, and only with consent. It is not assumed to be the cause.");
  if (face) add("MER4",1,"conditional","A head, jaw, face or neck concern is reported. Original Face stays conditional on consent. Orbital and intraoral work are not added.");
  else if (neck || shoulder) add("MER4",2,"conditional","Neck or shoulder concern can use selected Original Face neck and upper-back options, only where a reassessment finds a relevant need.");
  else if (at("ocular",1) || at("oral",1) || at("cervical",2)) add("MER4",4,"conditional","Ocular, oral or cervical context is saved. That is not an instruction to work the eyes, jaw or neck, and it is not a diagnosis of absence.");

  if (breathRestricted) add("MER5", back||neck||shoulder?2:1, back||neck||shoulder?"support":"focus","Breath restriction is reported or recorded. Inspiration can include a cautious diaphragm option. Stress alone is not this evidence.");
  else if (breathFree && (upperBack || shoulder || at("thoracic",1) || at("diaphragmatic",1))) add("MER5",2,"conditional","The breath is reported free. Inspiration, if used, is comfortable chest and shoulder contact only. Diaphragm strokes are not selected.");
  else if (!breathFree && !breathRestricted && at("diaphragmatic",2)) add("MER5",4,"conditional","A diaphragm belt is saved and the breath is not recorded as restricted. No diaphragm stroke is selected from the belt alone.");
  else if (upperBack || shoulder || at("thoracic",2)) add("MER5",4,"conditional","Thorax or shoulder context can use Inspiration as an optional chest and shoulder bridge, without calling the breath restricted.");

  if (abdomen || at("abdominal",1)) add("MER6",5,"context","Abdominal context only signposts Fluid Body. No joint maneuver, muscle or timing is assigned, and a strong core is not read as abdominal tension.");
  add("MER7",6,"context","Trauma Release sits across the selected modules as optional questions. It is not a diagnosis, a separate required session, or a story read from appearance.");

  if (grounded && picked.has("MER2")){
    const m = picked.get("MER2");
    m.reasons.unshift("Grounding or a strong core is already reported as a resource. This module does not turn that resource into a deficit.");
    m.relevance = "conditional";
  }

  const tie = routing.default_module_tie_order||TIE;
  const ordered = [...picked.values()].sort((a,b)=>{
    if (a.tier!==b.tier) return a.tier-b.tier;
    const ia = tie.indexOf(a.id), ib = tie.indexOf(b.id);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });

  function resolveList(mod, ids, forceConditional){
    return (ids||[]).map(id=>byId.get(id)).filter(Boolean).filter(s=>allowed(s, allowDiaphragm)).map(s=>{
      const conditional = forceConditional || (mod.conditional_stroke_ids||[]).includes(s.id) || mod.relevance==="conditional";
      return strokeRef(s, conditional);
    }).sort((a,b)=>a.manualOrder-b.manualOrder);
  }
  function extras(mod, skip){
    return strokes.filter(s=>s.module===Number(String(mod.id).replace("MER","")) && !skip.has(s.id) && allowed(s, allowDiaphragm) && s.technique_type!=="opening" && s.technique_type!=="hold").map(s=>strokeRef(s, mod.relevance==="conditional" || (mod.conditional_stroke_ids||[]).includes(s.id))).sort((a,b)=>a.manualOrder-b.manualOrder);
  }

  const built = ordered.map(p=>{
    const mod = modById.get(p.id)||{id:p.id,name:p.id,focus:"",belts:[],muscles:[],stroke_ids:[],conditional_stroke_ids:[],question:"",watch_for:"",mapping_note:""};
    const show = resolveList(Object.assign({}, mod, p), mod.stroke_ids||[], p.relevance==="conditional" || p.relevance==="context");
    const beltEvidence = (mod.belts||[]).map(key=>{
      const b = belts.find(x=>x.key===key);
      return b||{key, level:null, levelLabel:"Unknown", provenance:"saved-report"};
    });
    return {
      id:p.id,
      name:mod.name||p.id,
      officialTitle:mod.official_title||mod.name||p.id,
      focus:mod.focus||"",
      priorityTier:p.tier<=1?"primary":p.tier<=3?"support":p.tier===6?"across":"conditional",
      relevance:p.relevance,
      tier:p.tier,
      reasons:p.reasons,
      beltEvidence,
      vocabulary:mod.vocabulary||"",
      vocabularySource:mod.vocabulary_source||null,
      areas:mod.areas||"",
      muscles:(mod.muscles||[]).slice(),
      strokeRefs:show,
      question:mod.question||"",
      questionPages:(mod.question_pdf_pages||[]).slice(),
      watchFor:mod.watch_for||"",
      mappingNote:mod.mapping_note||"",
      status:mod.status||"",
      role:mod.role||""
    };
  }).map(m=>{
    const skip = new Set((m.strokeRefs||[]).map(s=>s.id));
    const mod = modById.get(m.id)||{};
    m.moreRefs = extras(Object.assign({}, mod, m), skip);
    if (allowDiaphragm && m.id==="MER5"){
      const have = new Set(m.strokeRefs.map(s=>s.id));
      strokes.filter(s=>s.module===5 && s.technique_type==="stroke" && /diaphragm/i.test(s.name) && allowed(s, true) && !have.has(s.id)).forEach(s=>{
        m.strokeRefs.push(strokeRef(s, false));
      });
      m.strokeRefs.sort((a,b)=>a.manualOrder-b.manualOrder);
    }
    return m;
  });

  const resources = [];
  if (grounded) resources.push({key:"grounding", text:"Well grounded, or a strong core, is recorded as a resource. It is not turned into a grounding or abdominal deficit."});
  if (asText(D.exercise)) resources.push({key:"exercise", text:"Exercise recorded: "+asText(D.exercise)+"."});
  if (asText(D.sleep)) resources.push({key:"sleep", text:"Sleep recorded: "+asText(D.sleep)+"."});

  const contradictions = [];
  if (breathFree && at("diaphragmatic",1)) contradictions.push({key:"breath", text:"The breath is reported free. The saved diaphragm belt is "+LEVEL_LABEL[belt.diaphragmatic]+". The belt is shown as saved, and the breath is not called restricted."});
  if (asText(D.contradictions)) contradictions.push({key:"practitioner", text:"Noted by the practitioner: "+asText(D.contradictions)+"."});

  const findings = [];
  if (asText(D.complaint) || asText(D.pain_areas) || asText(D.tension_areas)) findings.push({key:"complaint", region:"intake", source:"intake", confirmation:"reported", text:[asText(D.complaint), asText(D.pain_areas)&&("Areas: "+asText(D.pain_areas)), asText(D.tension_areas)&&("Tension: "+asText(D.tension_areas)), D.pain_intensity!=null&&D.pain_intensity!==""&&("Intensity "+asText(D.pain_intensity)+"/10"), asText(D.pain_type)&&("Type: "+asText(D.pain_type))].filter(Boolean).join(". ")});
  const issues = (map.issues||[]).map(i=>asText(i&&(i.text||i.label))).filter(Boolean);
  if (issues.length) findings.push({key:"saved-observations", region:"body", source:"saved-report", confirmation:"hypothesis", text:"Saved generated observations, not a new examination: "+issues.join(" ")});
  findings.push({key:"belts", region:"belts", source:"saved-report", confirmation:"hypothesis", text:belts.map(b=>BELT_LABEL[b.key]+" "+(b.level==null?"unknown":b.level+"/3 "+b.levelLabel)).join(" · ")});
  if (breathFree || breathRestricted) findings.push({key:"breath", region:"breath", source:"intake", confirmation:"reported", text:breathRestricted?"Breath restriction is reported or recorded.":"Breath is reported free. A belt level does not override that report."});
  else findings.push({key:"breath", region:"breath", source:"intake", confirmation:"reported", text:"Breath restriction is not recorded. Stress or a belt level is not read as a breathing diagnosis."});

  const work = built.filter(m=>["MER1","MER2","MER3","MER4","MER5"].includes(m.id));
  const priorities = work.map(m=>{
    let key = "thor";
    if (m.id==="MER2") key = "legs";
    else if (m.id==="MER3") key = "pelv";
    else if (m.id==="MER4") key = "cerv";
    else if (m.id==="MER5") key = breathRestricted ? "diaph" : "thor";
    else if (m.id==="MER1") key = (back || upperBack || lowBack) ? "thor" : neck ? "cerv" : shoulder ? "shou" : "thor";
    const title = m.id==="MER5" && !breathRestricted ? "Thoracic support" : m.id==="MER2" ? "Legs and feet" : m.id==="MER3" ? "Pelvic and hip" : m.id==="MER4" ? "Neck, face and cranium" : key==="cerv" ? "Cervical" : key==="shou" ? "Shoulders" : key==="diaph" ? "Diaphragm" : "Thoracic";
    const strokes = (redFlag ? [] : m.strokeRefs).slice();
    return {area:title, moduleId:m.id, include:m.areas||"Assessment chooses the area.", muscles:m.muscles, watchFor:m.watchFor, retest:key==="diaph"&&!breathRestricted?RETEST.thor:RETEST[key], strokeRefs:strokes, conditional:m.relevance==="conditional"};
  });

  const hw = homeworkAll.filter(h=>{
    const mods = (h.related_modules||[]).map(n=>"MER"+n);
    if (h.id==="grounding") return built.some(m=>m.id==="MER2");
    return mods.some(id=>built.some(m=>m.id===id && m.relevance!=="context"));
  });

  const used = new Set();
  function take(m, n, preferConditional){
    if (redFlag) return [];
    const pool = (m.relevance==="conditional" ? m.strokeRefs : m.strokeRefs.filter(s=>preferConditional?s.conditional:!s.conditional).concat(m.moreRefs.filter(s=>!s.conditional))).filter(s=>!used.has(s.id) && s.technique!=="opening" && s.technique!=="hold");
    const fromRep = pool.filter(s=>(m.strokeRefs||[]).some(r=>r.id===s.id));
    const rest = pool.filter(s=>!fromRep.some(r=>r.id===s.id) && !s.conditional);
    const chosen = (fromRep.length?fromRep:rest).concat(fromRep.length?rest:[]).filter((s,i,a)=>a.findIndex(x=>x.id===s.id)===i).slice(0,n);
    if (!chosen.length && m.relevance!=="conditional"){
      const alt = m.moreRefs.filter(s=>!used.has(s.id) && !s.conditional).slice(0,n);
      alt.forEach(s=>used.add(s.id));
      return alt;
    }
    chosen.forEach(s=>used.add(s.id));
    return chosen;
  }

  const sessions = [];
  if (redFlag){
    for (let n=1;n<=10;n++) sessions.push({n, moduleIds:[], label:n===1?"Clearance before hands-on":n===10?"Reassessment after clearance":"Hands-on deferred", aim:n===1?"A safety concern is marked. Confirm the right medical clearance before any MER hands-on work.":"Hands-on strokes stay off this plan until clearance. This slot is not a technique prescription.", openingRefs:[], mainStrokeRefs:[], closingRefs:[], retest:["Symptoms, and whether clearance is in place."], homeworkIds:[], conditionalReasons:[], assessmentNeeded:false, deferred:true});
  } else if (!work.length){
    for (let n=1;n<=10;n++) sessions.push({n, moduleIds:[], label:"Assessment needed", aim:"There is not enough reported information to choose techniques. Use the time to assess, then decide. Nothing here is filled in to make a ten-session syllabus.", openingRefs:[], mainStrokeRefs:[], closingRefs:[], retest:["Whatever the assessment actually checks."], homeworkIds:[], conditionalReasons:[], assessmentNeeded:true, deferred:false});
  } else {
    const slots = [];
    work.forEach(m=>{
      const repeats = m.relevance==="focus" ? 2 : 1;
      for (let i=0;i<repeats;i++) slots.push({m, repeat:i});
    });
    slots.slice(0,8).forEach((slot,i)=>{
      const m = slot.m;
      const reps = m.relevance==="conditional" ? m.strokeRefs.filter(s=>s.technique!=="hold" && s.technique!=="opening").slice(0,4) : take(m, slot.repeat?4:4, false);
      reps.forEach(s=>used.add(s.id));
      const only = m.relevance==="conditional" || reps.every(s=>s.conditional);
      sessions.push({
        n:i+1,
        moduleIds:[m.id],
        label:m.name||m.officialTitle,
        aim:slot.repeat?"Return to this module. Keep what helped, and change what did not. Variants are alternatives, not a stack.":(m.reasons[0]||"Follow the reported priority."),
        openingRefs:[],
        mainStrokeRefs:reps.map(s=>Object.assign({}, s, {conditional:only||s.conditional})),
        closingRefs:[],
        retest:[priorities.find(p=>p.moduleId===m.id)?.retest||"Comfortable movement and the client’s report."],
        homeworkIds:hw.filter(h=>(h.related_modules||[]).map(n=>"MER"+n).includes(m.id)).map(h=>h.id),
        conditionalReasons:only?["Only if the screen and the client’s consent support it."]:[],
        assessmentNeeded:false,
        deferred:false,
        conditional:!!only
      });
    });
    while (sessions.length<9){
      const n = sessions.length+1;
      sessions.push({n, moduleIds:work.map(m=>m.id), label:"Integration and reassessment", aim:"Pause. Compare with the first session. Do not open a new region to fill the hour.", openingRefs:[], mainStrokeRefs:[], closingRefs:[], retest:["What feels different, unchanged or worse."], homeworkIds:hw.map(h=>h.id), conditionalReasons:[], assessmentNeeded:false, deferred:false, integration:true});
    }
    sessions.push({n:10, moduleIds:[], label:"Completion and next step", aim:"Look back at the original concern. Agree what stops, what continues at home, and whether another visit is useful. Ten sessions are a proposal, not a requirement.", openingRefs:[], mainStrokeRefs:[], closingRefs:[], retest:["The concern the client came with."], homeworkIds:hw.map(h=>h.id), conditionalReasons:[], assessmentNeeded:false, deferred:false, integration:true});
    sessions.forEach((s,i)=>{s.n=i+1;});
  }

  const archetype = src.archetype&&src.archetype.reich ? {name:String(src.archetype.name||""), reich:String(src.archetype.reich||"")} : null;
  const gaps = [];
  if (!work.length) gaps.push("assessment-needed");
  if (redFlag) gaps.push("red-flag-defer");
  if (!strokes.length || !modules.length) gaps.push("manual-content-missing");

  return {
    schemaVersion:2,
    dataVersion:(cat.mer_modules&&cat.mer_modules.schema_version)||DATA_VERSION,
    belts, findings, resources, contradictions,
    breath:{free:breathFree, restricted:breathRestricted},
    grounded, burning, redFlag,
    modules:built, priorities, sessions,
    homeworkIds:hw.map(h=>h.id),
    homework:hw,
    lines, archetype,
    sourceRefs:[{name:"Official training names", url:"https://www.myofascialtrainings.com/training"}],
    gaps,
    signals:{back, upperBack, lowBack, neck, shoulder, pelvis, legs, face, abdomen}
  };
}

function chip(m){
  if (m.id==="MER7") return "Across every selected module";
  if (m.id==="MER6") return "Context · modality only";
  if (m.relevance==="focus") return "Primary";
  if (m.relevance==="support") return "Support";
  return "Conditional";
}
function beltChips(m){
  if (!m.beltEvidence.length) return "";
  return '<div class="beltLinks">'+m.beltEvidence.map(b=>'<span>'+esc(BELT_LABEL[b.key]||b.key)+' '+(b.level==null?"· Unknown":b.level+"/3 · "+b.levelLabel)+'</span>').join("")+'</div>';
}
function strokeHtml(list, deferred){
  if (deferred) return '<p>Hands-on strokes are not scheduled while a safety concern is marked.</p>';
  if (!list.length) return '<p>No named stroke is scheduled from this module. Nothing has been invented to fill the gap.</p>';
  return list.map(s=>{
    const pg = s.pdfPage==null?"":" · PDF p."+s.pdfPage;
    return '<div class="stroke">'+(s.conditional?'<small class="conditional">Only if indicated</small>':'')+'<div class="strokeName">'+esc(s.name)+'</div><p><span>Areas:</span> '+esc((s.areas||[]).join(", ")||"—")+'</p><p><span>Muscles / fascia:</span> '+esc((s.targets||[]).join(", ")||"—")+'</p><small>'+esc(s.manual)+esc(pg)+' · '+esc(s.id)+'</small></div>';
  }).join("");
}
function lineSvg(id, d){
  const body = "M40 18c8 0 12 8 12 16s-4 12-12 12-12-6-12-12 4-16 12-16zM40 46v28M28 58h24M40 74l-10 36M40 74l10 36";
  return '<figure><svg viewBox="0 0 80 120" role="img" aria-label="'+esc(id)+' line, schematic"><path d="'+body+'" fill="none" stroke="#C99E67" stroke-width="1.2" opacity=".85"/><path d="'+d+'" fill="none" stroke="#E7C99A" stroke-width="2.2" stroke-linecap="round"/></svg><figcaption>'+esc(id)+'</figcaption></figure>';
}
const LINE_PATH = {
  back:"M34 108 L36 78 L38 48 L40 28",
  front:"M46 108 L44 78 L42 50 L40 30",
  lateral:"M22 100 L28 70 L30 48 L26 34",
  spiral:"M22 96 L40 70 L58 48 L48 30",
  arms:"M18 58 H62",
  functional:"M18 64 L62 92",
  deep:"M40 100 L40 62 L40 36"
};

function renderBlocks(reading){
  const r = reading;
  const deferred = !!r.redFlag;
  const bridge = '<div class="it"><h3>Body pattern, belts and MER approach</h3><p>Saved belt levels are linked to MER training choices. They are not a diagnosis, and pain location is not read as the cause.</p>'+r.modules.filter(m=>m.id!=="MER7").map(m=>{
    const belts = m.beltEvidence.map(b=>(BELT_LABEL[b.key]||b.key)+" "+(b.level==null?"unknown":b.level+"/3")).join(", ");
    return '<p>'+(belts?'<b>'+esc(belts)+'</b> ':'')+esc(m.reasons[0]||"")+' <a class="merLink" data-j="module-'+esc(m.id)+'" href="#module-'+esc(m.id)+'">'+esc(m.name.replace(/^MER /,"").replace(/ Training$/,""))+'</a></p>';
  }).join("")+(r.archetype?'<h3>Reich / Lowen character structure, a question, not a label</h3><p>The saved questionnaire’s most active theme is '+esc(r.archetype.name)+' (Reich / Lowen: '+esc(r.archetype.reich)+'). This is an exploratory question about how the client meets stress. It is not a personality label, and it is not read from the face, posture, build or eyes. The modules below follow the complaint and the saved belts.</p>':'')+'</div>';

  const findings = '<section class="card mer"><div class="gK">Bodywork assessment</div><h2 class="gH" data-mer-sec="Key findings">Key findings</h2><p class="mCav">Saved observations and intake answers are hypotheses. Confirm them with the client, comfortable movement and palpation. This view does not re-score the belts.</p><table class="tbl mT">'+r.findings.map(f=>'<tr><td>'+esc(f.key==="saved-observations"?"Saved notes":f.key.charAt(0).toUpperCase()+f.key.slice(1))+'</td><td>'+esc(f.text)+' <small class="sourceRef">'+esc(f.source)+' · '+esc(f.confirmation)+'</small></td></tr>').join("")+(r.resources.length?'<tr><td>Resources</td><td>'+r.resources.map(x=>esc(x.text)).join(" ")+'</td></tr>':'')+(r.contradictions.length?'<tr><td>Cross-check</td><td>'+r.contradictions.map(x=>esc(x.text)).join(" ")+'</td></tr>':'')+'</table><p class="mFoot">A clear red-flag screen is not medical clearance.</p></section>';

  const modules = '<div class="subH2" data-mer-sec="MER training approaches">MER training approaches</div><p class="subP">Ordered from this assessment: reported concerns first, then screened neighbouring regions, then saved belt context. Module numbers are not a required sequence.</p>'+r.modules.map(m=>{
    const src = m.vocabularySource||{};
    const srcPg = pagesLabel(src.pdf_pages);
    const qPg = pagesLabel(m.questionPages);
    const muscles = m.muscles.length?m.muscles.join(", "):"";
    return '<section class="card moduleBlock" id="module-'+esc(m.id)+'"><div class="gK">'+esc(m.id)+'</div><h2 class="gH">'+esc(m.officialTitle||m.name)+'</h2><p class="gSub">'+esc(m.focus)+'</p><div class="mChips"><span class="on">'+esc(chip(m))+'</span></div><p class="bxp">'+m.reasons.map(esc).join(" ")+'</p>'+beltChips(m)+'<h3 class="mH">MER vocabulary</h3><p>'+esc(m.vocabulary)+'</p><h3 class="mH">Body parts / muscles</h3><p>'+esc(m.areas||"")+'</p>'+(muscles?'<p><b>Targets:</b> '+esc(muscles)+'</p>':m.id==="MER6"||m.id==="MER7"?'<p>No specific muscles are assigned.</p>':'')+'<h3 class="mH">MER strokes'+(m.id==="MER6"||m.id==="MER7"?"":" · manual order")+'</h3>'+(m.id==="MER6"?'<p>No Fluid Body stroke database is available. This block names the modality only.</p>':m.id==="MER7"?'<p>No extra stroke sequence. The questions below sit beside the selected MER1–MER5 flows.</p>':strokeHtml(m.strokeRefs, deferred))+(m.question?'<div class="brP"><div class="brH">Exploratory question</div><p>“'+esc(m.question)+'”</p>'+(qPg?'<small>MER7 '+esc(qPg)+'</small>':'')+'</div>':'')+'<h3 class="mH">Watch for</h3><p>'+esc(m.watchFor)+'</p>'+(m.mappingNote?'<p class="mCav">'+esc(m.mappingNote)+'</p>':'')+'<p class="mFoot sourceRef">'+esc(src.manual?("Vocabulary: "+src.manual+(srcPg?" · "+srcPg:"")):(src.url?"Scope: myofascialtrainings.com/training":""))+' Official training name checked on myofascialtrainings.com/training. Belt links are a teaching map, not a diagnosis.</p></section>';
  }).join("");

  const movement = renderMovement(r);
  const lines = '<section class="card mer"><div class="gK">Bodywork assessment</div><h2 class="gH" data-mer-sec="Myofascial lines">Myofascial lines</h2><p class="gSub">Secondary orientation only. A line does not diagnose a symptom or overrule the manual or the client’s comfort.</p><div class="mChips">'+r.lines.map(l=>'<span>'+esc(l.name)+'</span>').join("")+'</div><div class="miniLines">'+r.lines.map(l=>lineSvg(l.name, LINE_PATH[l.id]||LINE_PATH.back)).join("")+'</div>'+r.lines.map(l=>'<h3 class="mH">'+esc(l.name)+'</h3><p>'+esc(l.orientation)+'</p><p class="mCav">'+esc(l.typical_issue_context||"")+'</p>').join("")+'<p class="mFoot sourceRef">Original schematics for this screen. Line names are orientation only, with no brand attached. Sensitive techniques are not prescribed from a line.</p></section>';

  const priorities = '<section class="card mer"><div class="gK">Bodywork assessment</div><h2 class="gH" data-mer-sec="Priority segments">Priority segments</h2><p class="gSub">Include, watch for, retest, and the MER strokes that match this assessment. Stroke order stays inside each module.</p>'+(r.priorities.length?r.priorities.map((p,i)=>'<div class="mSeg"><div class="mN">'+(i+1)+'</div><div><b>'+esc(p.area)+'</b> <em>'+esc(p.moduleId)+(p.conditional?" · conditional":"")+'</em><p><span>Include:</span> '+esc(p.include)+(p.muscles&&p.muscles.length?" "+esc(p.muscles.join(", "))+". ":"")+'</p><p><span>Watch for:</span> '+esc(p.watchFor)+'</p><p><span>Retest:</span> '+esc(p.retest)+'</p><p><span>MER strokes:</span> '+(p.strokeRefs.length?p.strokeRefs.map(s=>(s.conditional?"Only if indicated: ":"")+esc(strokeLine(s))).join("<br>"):deferred?"Hands-on strokes deferred until cleared.":"None scheduled.")+'</p></div></div>').join(""):'<p>No priority segment is selected yet. Assessment is needed before a region is chosen.</p>')+(r.grounded?'<p class="mNote">Grounding is already a resource. Start with contact, then the reported priority. Do not add remedial grounding to correct a strong core.</p>':'<p class="mNote">Start from the reported concern. A neighbouring region stays optional until it is confirmed.</p>')+'</section>';

  const planIntro = '<div class="subH2" data-mer-sec="10-session MER plan">10-session MER plan</div><p class="subP">One plan. Module names label the sessions. This is a proposal to adapt, not a mandatory syllabus and not proof that ten visits are needed.</p>';
  const plan = planIntro+r.sessions.map(s=>{
    const hw = (s.homeworkIds||[]).map(id=>r.homework.find(h=>h.id===id)).filter(Boolean);
    const hwText = hw.length?hw.map(h=>h.focus+": "+(h.practices||[]).join(" / ")).join(". ")+". 5–20 minutes daily in total, not for each practice.":"Agree home practice only if a focus is clear. 5–20 minutes daily in total.";
    const strokes = (s.mainStrokeRefs||[]);
    const strokeBody = s.deferred?"No strokes scheduled.":s.assessmentNeeded?"Assessment needed. No techniques are filled in.":strokes.length?strokes.map(st=>'<span class="moduleTag">'+esc(st.moduleId)+'</span> '+(st.conditional?"Only if indicated: ":"")+esc(strokeLine(st))).join("<br>"):"No new strokes. Reassess, or keep the earlier choice.";
    const mer1 = r.modules.some(m=>m.id==="MER1");
    return '<section class="card ses"><div class="num">'+s.n+'</div><h2>'+esc(s.label)+'</h2><p class="sAim">'+esc(s.aim)+'</p><div class="row"><b>✋</b><div><span class="lbl">MER strokes</span>'+strokeBody+'</div></div><div class="row"><b>🌿</b><div><span class="lbl">Participation</span>The client can ask for less, pause or stop. Agree pressure first. Check in often. Variants are alternatives, not a stack.</div></div><div class="row"><b>↔</b><div><span class="lbl">Retest</span>'+esc((s.retest||[]).join(" "))+'</div></div><div class="row"><b>🏠</b><div><span class="lbl">Home practice</span>'+esc(hwText)+'</div></div>'+(s.n===1&&!s.deferred?'<p class="sFlag">Open with consent and comfortable contact'+(mer1?". Conscious contact is MER1-009, PDF p.11, when that opening is used. Optional closing, only if chosen: thoracic inlet hold, one minute, MER1 PDF p.18.":".")+' No other timing is invented.</p>':'')+(s.conditional?'<p class="sFlag">Conditional. Do not treat this list as required.</p>':'')+'</section>';
  }).join("");

  const cautions = '<section class="card mer"><div class="gK">Bodywork assessment</div><h2 class="gH" data-mer-sec="Cautions">Cautions</h2><ul class="mL">'+(r.redFlag?"<li>A safety concern is marked. Defer hands-on work until the right clinician has cleared it. This screen is not that clearance.</li>":"<li>No red flag is marked. That is not medical clearance. Refer if chest pain, tingling, numbness, weakness or worsening appears.</li>")+(r.burning?"<li>Burning, worsening, tingling, numbness or weakness needs a clinical screen before deeper or loaded work.</li>":"")+"<li>Deep anterior neck, intraoral, orbital, deep abdominal, psoas and intimate techniques are not put on this plan automatically. Records that still need a teacher’s review stay out as well.</li>"+(r.breath&&r.breath.free?"<li>The breath is reported free. Do not describe it as restricted and do not add diaphragm strokes from a belt level.</li>":"")+'</ul>'+(asTextSafe(r._touch)?'<p class="mCav">Touch boundary from the intake: '+esc(r._touch)+'</p>':'')+'</section>';

  const homework = '<section class="card mer"><div class="gK">Bodywork assessment</div><h2 class="gH" data-mer-sec="Homework">Homework</h2><p class="gSub">Gentle and optional, agreed with the practitioner. 5–20 minutes daily in total, not 20 minutes for each practice.</p>'+(r.homework.length?'<ul class="mL">'+r.homework.map(h=>'<li><b>'+esc(h.focus)+':</b> '+esc((h.practices||[]).join(" / "))+'. '+esc(h.safety||"")+'</li>').join("")+'</ul>':'<p>No home practice is matched yet, because no related focus is selected. A resource such as feeling well grounded does not add a corrective drill.</p>')+'<p class="mFoot sourceRef">Homework matches the selected modules only. Official module names: myofascialtrainings.com/training.</p></section>';

  return {bridge, findings, modules, movement, lines, priorities, plan, cautions, homework};
}

function asTextSafe(v){return v?String(v):"";}
function renderMovement(reading){
  const moves = reading._movement||[];
  const body = moves.length?moves.map(m=>'<div class="row"><b>·</b><div><span class="lbl">'+esc(m.label)+'</span>'+esc(m.text)+'</div></div>').join(""):'<p>Movement tests: not recorded.</p>';
  return '<section class="card brd"><div class="gK">Body reading</div><h2 class="gH">Movement and retest</h2>'+body+'<p class="mCav">'+esc(approachFor("movement"))+'</p></section>';
}
function approachFor(heading){
  const h = String(heading||"").toLowerCase();
  if (/positive|qualit|resource/.test(h)) return "Name resources with the client before restrictions. These are not a diagnosis.";
  if (/face|eye/.test(h)) return "Ask before any face, jaw or neck contact. Do not infer emotion, trauma or personality from the face, gaze or build. No orbital or intraoral work is added from this card.";
  if (/front/.test(h)) return "Compare the saved note with the client’s report and comfortable movement. This is not a new examination.";
  if (/side/.test(h)) return "Look at head, ribs and pelvis together. Do not turn the note into an alignment diagnosis.";
  if (/back/.test(h)) return "If the back is the concern, use the selected back strokes and reassess. Do not assume every tissue is restricted.";
  if (/movement|retest/.test(h)) return "Check comfortable movement before and after regional work. Keep a contradictory finding visible. Empty fields stay empty.";
  return "Treat this as a saved observation to confirm with the client. It is not a new photo reading.";
}
function withContext(reading, ctx){
  const next = Object.assign({}, reading);
  next._movement = ctx&&ctx.movement||[];
  next._touch = ctx&&ctx.touch||"";
  return next;
}

return {DATA_VERSION, buildReading, renderBlocks, approachFor, withContext, blockReason, beltLevel};
});
