const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const MER = require("./mer-v2.js");

const dir = path.join(__dirname, "data/mer");
const cat = {
  mer_modules: JSON.parse(fs.readFileSync(path.join(dir, "mer_modules.json"), "utf8")),
  mer_strokes: JSON.parse(fs.readFileSync(path.join(dir, "mer_strokes.json"), "utf8")),
  mer7_segments: JSON.parse(fs.readFileSync(path.join(dir, "mer7_segments.json"), "utf8")),
  homework_mapping: JSON.parse(fs.readFileSync(path.join(dir, "homework_mapping.json"), "utf8")),
  fascia_lines: JSON.parse(fs.readFileSync(path.join(dir, "fascia_lines.json"), "utf8")),
  mer_routing: JSON.parse(fs.readFileSync(path.join(dir, "mer_routing.json"), "utf8"))
};
const strokes = cat.mer_strokes.strokes;
const byId = Object.fromEntries(strokes.map(s => [s.id, s]));

function read(data, report, extra){
  return MER.buildReading(cat, Object.assign({data: data || {}, report: report || {body_map: {belts: {}}}}, extra || {}));
}
function idsOf(reading){
  const out = [];
  reading.modules.forEach(m => (m.strokeRefs || []).concat(m.moreRefs || []).forEach(s => out.push(s.id)));
  reading.sessions.forEach(s => (s.mainStrokeRefs || []).forEach(x => out.push(x.id)));
  reading.priorities.forEach(p => (p.strokeRefs || []).forEach(x => out.push(x.id)));
  return out;
}
function belts(levels){
  return {body_map: {belts: levels, issues: []}, sections: []};
}

test("catalogue shape and privacy boundary", () => {
  assert.equal(cat.mer_modules.modules.length, 7);
  assert.equal(strokes.length, 166);
  assert.deepEqual(cat.mer_modules.modules.map(m => m.official_title), [
    "MER Self-Empowerment Training: Back, Neck, Pelvis & Breath",
    "MER Grounding Training: Feet, Legs & Hips",
    "MER Centering Training: Pelvis & Core Integration",
    "MER Original Face Training: Face, Cranium, Neck, Arms & Vagus nerve",
    "MER Inspiration Training: Opening the Breath, Thorax and Diaphragm",
    "MER Fluid Body Training: Joint Release & Joint Mobilization",
    "MER Trauma Release Training: Breath, Fascia & Emotional Release"
  ]);
  assert.equal(cat.mer_modules.modules.find(m => m.id === "MER6").stroke_ids.length, 0);
  assert.equal(cat.mer_modules.modules.find(m => m.id === "MER7").stroke_ids.length, 0);
  const raw = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n").toLowerCase();
  ["asang", "3bc6bf25", "dropbox", "/workspace/", "/home/box", "dl.dropbox"].forEach(term => assert.equal(raw.includes(term), false, term));
});

test("thoracic complaint and pelvic holding lead with self-empowerment and centering", () => {
  const r = read({
    complaint: "Upper back stiffness after exercise",
    pain_areas: ["upper back"],
    body_experience: "Pelvic holding when stress rises",
    breath: "Breath feels a bit shallow"
  }, belts({thoracic: 3, pelvic: 3, cervical: 2}));
  const hands = r.modules.filter(m => m.relevance === "focus").map(m => m.id);
  assert.deepEqual(hands.slice(0, 2), ["MER1", "MER3"]);
  assert.equal(r.sessions.length, 10);
  assert.equal(r.sessions.filter(s => /10-session outline|treatment plan/.test(s.label)).length, 0);
  assert.ok(r.sessions.some(s => s.moduleIds.includes("MER1") && /Self-Empowerment/.test(s.label)));
  const order = r.modules.find(m => m.id === "MER1").strokeRefs.map(s => s.manualOrder);
  assert.deepEqual(order, order.slice().sort((a, b) => a - b));
});

test("free breath does not prescribe diaphragm work", () => {
  const base = {
    complaint: "Upper back stiffness after exercise",
    pain_areas: ["upper back", "knees"],
    pain_type: ["burning"],
    body_experience: "Pelvic holding when stress rises. Strong core.",
    energetics: ["Well grounded"],
    stress: 9
  };
  const levels = {ocular: 1, oral: 1, cervical: 2, thoracic: 3, diaphragmatic: 2, abdominal: 1, pelvic: 3};
  const free = read(Object.assign({}, base, {breath: "Breath feels free"}), belts(levels));
  assert.equal(free.breath.free, true);
  assert.equal(free.breath.restricted, false);
  assert.equal(free.grounded, true);
  idsOf(free).forEach(id => assert.equal(/MER5-013|MER5-014|MER1-024/.test(id), false, id));
  const text = free.modules.flatMap(m => m.reasons).join(" ");
  assert.equal(/breath restriction is reported/i.test(text), false);
  assert.ok(free.contradictions.some(c => /reported free/i.test(c.text)));
  assert.ok(free.modules.some(m => m.id === "MER2" && m.relevance === "conditional"));
  assert.equal(free.modules.find(m => m.id === "MER2").relevance === "focus", false);
  const html = MER.renderBlocks(MER.withContext(free, {})).plan + MER.renderBlocks(free).cautions;
  assert.equal(/<script/i.test(html), false);
  const held = read(Object.assign({}, base, {breath: "Breath feels shallow and held"}), belts(levels));
  assert.equal(held.breath.restricted, true);
  assert.ok(held.modules.find(m => m.id === "MER5").strokeRefs.some(s => s.id === "MER5-013"));
});

test("complaints route independently of any client identity", () => {
  const only = (data) => read(data, belts({})).modules.filter(m => m.id !== "MER7").map(m => m.id);
  assert.equal(only({complaint: "Low back and neck pain"})[0], "MER1");
  assert.ok(only({complaint: "Feet and calves ache"}).includes("MER2"));
  assert.equal(only({complaint: "Pelvic pain and hip stiffness"})[0], "MER3");
  assert.equal(only({complaint: "Jaw tension and headache"})[0], "MER4");
  assert.equal(only({breath: "I cannot breathe deeply, it feels restricted"})[0], "MER5");
  const named = read({complaint: "Upper back stiffness"}, belts({thoracic: 3}));
  assert.equal(JSON.stringify(named).includes("client_name"), false);
});

test("belt levels stay exact and missing is unknown", () => {
  assert.equal(MER.beltLevel(0), 0);
  assert.equal(MER.beltLevel(1), 1);
  assert.equal(MER.beltLevel(2), 2);
  assert.equal(MER.beltLevel(3), 3);
  assert.equal(MER.beltLevel(null), null);
  assert.equal(MER.beltLevel(undefined), null);
  assert.equal(MER.beltLevel(""), null);
  assert.equal(MER.beltLevel("nope"), null);
  assert.equal(MER.beltLevel(4), null);
  assert.equal(MER.beltLevel(-1), null);
  assert.equal(MER.beltLevel(1.5), null);
  const r = read({}, belts({thoracic: "nope", cervical: null, pelvic: 3, oral: 4, diaphragmatic: 1.5, abdominal: -1, ocular: 0}));
  const got = Object.fromEntries(r.belts.map(b => [b.key, b.level]));
  assert.equal(got.thoracic, null);
  assert.equal(got.cervical, null);
  assert.equal(got.pelvic, 3);
  assert.equal(got.oral, null);
  assert.equal(got.diaphragmatic, null);
  assert.equal(got.abdominal, null);
  assert.equal(got.ocular, 0);
  assert.equal(r.belts.find(b => b.key === "thoracic").levelLabel, "Unknown");
  assert.equal(r.belts.find(b => b.key === "ocular").levelLabel, "Balanced");
  assert.equal(r.belts.find(b => b.key === "pelvic").levelLabel, "Strong · over-charged");
});

test("empty, partial and scalar intake do not throw", () => {
  assert.doesNotThrow(() => MER.buildReading(cat, {}));
  assert.doesNotThrow(() => MER.buildReading(cat, {data: null, report: null}));
  const scalar = read({pain_areas: "feet", tension_areas: "calves", breath: "fine", stress: ["high"]}, {body_map: {belts: {}}});
  assert.ok(scalar.modules.some(m => m.id === "MER2"));
  assert.equal(scalar.breath.restricted, false);
  const empty = read({}, {summary: "kept"});
  assert.ok(empty.sessions.every(s => s.assessmentNeeded));
  assert.equal(empty.sessions.length, 10);
  assert.equal(empty.sessions.some(s => s.mainStrokeRefs.length), false);
});

test("a grounded strong core is not a deficit and stress is not a breath diagnosis", () => {
  const r = read({
    complaint: "General check-in",
    body_experience: "I feel well grounded and I have a strong core",
    energetics: ["Well grounded"],
    stress: 9
  }, belts({abdominal: 0, pelvic: 0, diaphragmatic: 0, thoracic: 0}));
  assert.equal(r.modules.some(m => m.id === "MER2"), false);
  assert.equal(r.modules.some(m => m.id === "MER6"), false);
  assert.equal(r.breath.restricted, false);
  assert.equal(r.homeworkIds.includes("grounding"), false);
  assert.ok(r.resources.some(x => /resource/i.test(x.text)));
});

test("red flags and sensitive or unreviewed strokes stay out of the automatic plan", () => {
  const r = read({complaint: "Upper back stiffness and neck pain", pain_type: "burning", breath: "Breath feels shallow"}, belts({thoracic: 3, cervical: 3}), {red_flags: ["Unexplained chest pain"]});
  assert.equal(r.redFlag, true);
  assert.equal(r.burning, true);
  assert.ok(r.sessions.every(s => s.mainStrokeRefs.length === 0 && s.deferred));
  const html = Object.values(MER.renderBlocks(MER.withContext(r, {touch: "Avoid the abdomen"}))).join("\n");
  assert.equal((html.match(/class="strokeName"/g) || []).length, 0);
  assert.match(html, /Defer hands-on/);
  assert.match(html, /Burning, worsening/);
  assert.match(html, /Avoid the abdomen/);
  const open = read({complaint: "Upper back stiffness and jaw pain", breath: "Breath feels shallow and held"}, belts({thoracic: 3, pelvic: 3, cervical: 2}));
  const used = new Set(idsOf(open));
  strokes.forEach(s => {
    const why = MER.blockReason(s);
    if (why && why !== "diaphragm") assert.equal(used.has(s.id), false, s.id + " " + why);
    if (s.teacher_review_required) assert.equal(used.has(s.id), false, s.id);
  });
  assert.equal(used.has("MER5-013"), true);
  assert.equal(byId["MER4-022"].teacher_review_required, true);
  assert.equal(used.has("MER4-022"), false);
  assert.equal(used.has("MER4-024"), false);
  assert.equal(used.has("MER1-019"), false);
  assert.equal(used.has("MER3-014"), false);
});

test("markup is escaped and the plan is a single module-labelled ten", () => {
  const r = read({complaint: '<script>alert(1)</script>', pain_areas: ["upper back"]}, belts({thoracic: 2}), {archetype: {name: "Autonomy", reich: "Masochistic"}});
  const blocks = MER.renderBlocks(MER.withContext(r, {movement: []}));
  const html = Object.values(blocks).join("\n");
  assert.equal(html.includes("<script>"), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Reich \/ Lowen: Masochistic/);
  assert.equal(html.includes("not read from the face"), true);
  assert.equal((html.match(/data-mer-sec="10-session MER plan"/g) || []).length, 1);
  assert.equal(/10-session outline|10-session treatment plan/.test(html), false);
  assert.match(blocks.priorities, /Include:/);
  assert.match(blocks.priorities, /Watch for:/);
  assert.match(blocks.priorities, /Retest:/);
  assert.match(blocks.priorities, /MER strokes:/);
  assert.match(blocks.homework, /5–20 minutes daily in total/);
  assert.match(blocks.findings, /Movement tests: not recorded|not recorded/);
  const noTheme = MER.renderBlocks(read({complaint: "Upper back stiffness"}, belts({thoracic: 2})));
  assert.equal(/Reich \/ Lowen/.test(noTheme.bridge), false);
});

test("homework uses the four teaching mappings and not the old drills", () => {
  const r = read({
    complaint: "Neck pain, pelvic holding, and sore feet",
    breath: "Breath feels free"
  }, belts({cervical: 2, pelvic: 3}));
  assert.ok(r.homework.some(h => h.practices.includes("Kundalini meditation") && h.practices.includes("Shaking")));
  assert.ok(r.homework.some(h => h.focus === "Pelvis alignment and spine" && h.practices.includes("Myofascial unwinding")));
  assert.ok(r.homework.some(h => h.practices.includes("Qigong")));
  assert.ok(r.homework.some(h => h.practices.includes("Vipassana meditation")));
  const html = MER.renderBlocks(r).homework;
  assert.equal(/foot rolling|longer exhale|doorway chest/i.test(html), false);
});

test("service worker release matches the calendar build and the learn.js query", () => {
  const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  const cal = fs.readFileSync(path.join(__dirname, "cal.js"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const ver = sw.match(/const VERSION="fasciapp-v([^"]+)"/);
  const build = cal.match(/const BUILD="([^"]+)"/);
  assert.equal(build[1], ver[1]);
  assert.equal(ver[1], MER.DATA_VERSION);
  assert.match(index, new RegExp("learn\\.js\\?v=" + ver[1].replace(/\./g, "\\.")));
});
