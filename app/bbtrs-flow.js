/* BBTRS sessions in the same order as MER: Strong, then Moderate, then Light.
   The words under each belt are the series this app already stores. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_BBTRS_FLOW = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const KEY_BELT = {ocular:"Ocular belt", oral:"Oral belt", cervical:"Cervical belt", thoracic:"Thoracic belt", diaphragmatic:"Diaphragmatic belt", abdominal:"Abdominal belt", pelvic:"Pelvic belt"};
const NOTE_KEY = {ocular:"s2", oral:"s3", cervical:"s4", thoracic:"s5", diaphragmatic:"s6", abdominal:"s7", pelvic:"s8"};
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function host(){return typeof globalThis!=="undefined" ? globalThis : {};}
function seriesFor(key){
  const B = host().FA_BBTRS || null;
  const name = KEY_BELT[key];
  if (!B || !name) return null;
  return (B.SERIES.sessions||[]).find(s=>s.belt===name) || null;
}
function levelOf(reading, key){
  const row = (reading.belts||[]).find(b=>b.key===key);
  return row && row.level!=null ? row.level : null;
}
function render(reading, openId, done, patternKey){
  const V = host().FA_MER_V2 || null;
  const Fig = host().FasciFigure || null;
  const B = host().FA_BBTRS || null;
  if (!V || !reading) return "";
  done = done||[];
  const plan = V.buildSessions(reading);
  const sessions = plan.sessions;
  let open = openId;
  if (open){
    const g = (V.GROUPS||[]).find(x=>x.id===open || x.keys.indexOf(open)>=0);
    open = g ? g.id : null;
  }
  if (!open){
    const main = (V.GROUPS||[]).find(g=>g.keys.indexOf(reading.segment)>=0);
    open = main && sessions.some(s=>s.id===main.id) ? main.id : (sessions[0]&&sessions[0].id);
  }
  const current = sessions.find(s=>s.id===open) || null;
  if (!current) return '<section class="card mer"><h2 class="gH">Session flow</h2><p>No belt is above Balanced, so there is no breathwork session to open. Balanced belts and belts with no score are skipped.</p></section>';
  const lit = current.anatomy;
  const badges = sessions.map(s=>({id:s.anatomy, n:s.n, done:done.indexOf(s.id)>=0, current:s.id===current.id && done.indexOf(s.id)<0}));
  const svg = Fig && Fig.svgFigure ? Fig.svgFigure({id:"bbtrs", midline:true, lit:lit, muted:plan.skipped.map(g=>sAnatomy(g.id)), doneZones:sessions.filter(s=>done.indexOf(s.id)>=0).map(s=>s.anatomy), badges:badges, journey:sessions.map(s=>s.anatomy)}) : "";
  const rows = sessions.map(s=>{
    const now = sessions.find(x=>done.indexOf(x.id)<0);
    const st = done.indexOf(s.id)>=0 ? "done" : (now&&now.id===s.id ? "now" : (now && sessions.indexOf(s)===sessions.indexOf(now)+1 ? "next" : "later"));
    const pair = s.level===3?["strong","Strong"]:s.level===2?["moderate","Moderate"]:s.level===1?["light","Light"]:["light","Light"];
    const label = st==="done"?"DONE":st==="now"?"NOW":st==="next"?"NEXT":"LATER";
    const tag = st==="done"?"done-tag":st==="now"?"now":st==="next"?"next-tag":"later-tag";
    const dot = s.level===3 ? '<span class="rec"></span>' : "";
    const cls = "sess slim"+(s.id===current.id?" current":"")+(st==="done"?" done":"");
    return '<button type="button" class="'+cls+'" data-belt="'+s.anatomy+'" data-bbtrs-seg="'+s.id+'"><span class="num">'+(st==="done"?"✓":String(s.n))+'</span><span class="copy"><b class="belt">'+esc(s.g.label)+'</b><span class="mer">'+esc(s.g.btn.replace(/^MER /,""))+'</span><span class="meta"><span class="'+tag+'">'+label+'</span><span class="chip '+pair[0]+'"><i></i>'+pair[1]+'</span>'+dot+'</span></span></button>';
  }).join("");
  const skip = plan.skipped.length===1 ? '<p class="skip-note">Skipped · '+esc(plan.skipped[0].label)+' · <span class="chip balanced"><i></i>Balanced</span></p>' : "";
  const keys = current.g.keys.filter(k=>levelOf(reading, k)>=1);
  const blocks = keys.map(k=>block(k, patternKey, B)).join("") || '<p>This belt has no breathwork text saved.</p>';
  const mark = done.indexOf(current.id)>=0
    ? '<button type="button" class="flowUndo" data-bbtrs-undo="'+current.id+'">Undo completion</button>'
    : '<button type="button" class="flowDone" data-bbtrs-done="'+current.id+'" data-session-n="'+current.n+'">Mark session '+current.n+' complete</button>';
  return '<div class="flow" id="bbtrsFlow"><div class="flowSplit" data-bbtrs-map><div class="body-wrap">'+svg+'</div><svg class="leaders" aria-hidden="true"></svg><div class="flowList">'+rows+'</div></div>'+skip+'<div id="bbtrsWork">'+mark+blocks+'</div></div>';
}
function sAnatomy(id){
  return {face:"ocular", cervical:"cervical", thorax:"thoracic", abdominal:"abdominal", pelvic:"pelvic"}[id]||id;
}
function block(key, patternKey, B){
  const s = seriesFor(key);
  if (!s) return "";
  const note = B && patternKey && B.S[patternKey] && B.S[patternKey].notes && B.S[patternKey].notes[NOTE_KEY[key]];
  const who = note ? '<div class="sNote"><b>For this pattern</b>'+esc(note)+'</div>' : "";
  return '<section class="card ses2"><div class="sTop"><div class="sNum">'+esc(s.icon||"")+'</div><div><span class="sBelt">'+esc(s.belt)+'</span><h3>'+esc(s.t)+'</h3></div></div><p class="sAim">'+esc(s.aim)+'</p><div class="sR"><b>🎯</b><div><span class="lbl">Focus</span>'+esc(s.focus)+'</div></div><div class="sR"><b>🌬</b><div><span class="lbl">Breath &amp; technique</span>'+esc(s.tech)+'</div></div><div class="sR"><b>✋</b><div><span class="lbl">Touch &amp; support</span>'+esc(s.touch)+'</div></div><div class="sR"><b>🧘</b><div><span class="lbl">Meditation · exercise</span>'+esc(s.med)+(s.home?' · '+esc(s.home):'')+'</div></div>'+who+'</section>';
}
function summary(reading, openId, patternKey){
  const V = host().FA_MER_V2 || null;
  const B = host().FA_BBTRS || null;
  if (!V || !reading) return "";
  const plan = V.buildSessions(reading);
  let open = openId;
  if (open){
    const g = (V.GROUPS||[]).find(x=>x.id===open || x.keys.indexOf(open)>=0);
    open = g ? g.id : null;
  }
  const current = plan.sessions.find(s=>s.id===open) || plan.sessions[0];
  if (!current) return "";
  const keys = current.g.keys.filter(k=>levelOf(reading, k)>=1);
  const bits = keys.map(k=>seriesFor(k)).filter(Boolean);
  if (!bits.length) return "";
  const home = bits.map(s=>s.home).filter(Boolean).join(" ");
  const aim = bits.map(s=>s.aim).filter(Boolean).join(" ");
  const note = B && patternKey && B.S[patternKey] && B.S[patternKey].notes && B.S[patternKey].notes[NOTE_KEY[keys[0]]];
  return '<section class="card mer" id="bbtrsSummary"><div class="gK">Session summary</div><h2 class="gH">'+esc(current.g.label)+'</h2><div class="it"><h3>Before</h3><p>'+esc(aim)+'</p></div><div class="it"><h3>Work</h3><p>'+esc(bits.map(s=>[s.focus, s.tech, s.touch].filter(Boolean).join(" ")).join(" "))+'</p></div><div class="it"><h3>After</h3><p>'+esc([home, bits.map(s=>s.med).filter(Boolean).join(" "), note].filter(Boolean).join(" "))+'</p></div></section>';
}
return {render, summary};
});
