const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const MER = require("./mer-v2.js");

const dir = path.join(__dirname, "data/mer");
const cat = {
  mer_modules: JSON.parse(fs.readFileSync(path.join(dir, "mer_modules.json"), "utf8")),
  mer_strokes: JSON.parse(fs.readFileSync(path.join(dir, "mer_strokes.json"), "utf8")),
  fascia_lines: JSON.parse(fs.readFileSync(path.join(dir, "fascia_lines.json"), "utf8")),
  homework_mapping: JSON.parse(fs.readFileSync(path.join(dir, "homework_mapping.json"), "utf8"))
};
const strokes = cat.mer_strokes.strokes;

function read(data, belts){
  return MER.buildReading(cat, {data: data||{}, report: {body_map: {belts: belts||{}}}});
}
function html(reading, segment){
  return MER.renderMer(reading, {segment: segment===undefined?reading.segment:segment, beltHtml:"<section class='card bmc'>map</section>", bodyItems:[{h:"Positive qualities",p:"Saved resource."},{h:"Front",p:"Saved front."},{h:"Zones of fear",p:"should not be passed"}]});
}
function ids(reading, segment){
  return MER.visibleCards(reading, segment===undefined?reading.segment:segment).map(s=>s.id);
}

test("library holds all 166 cards, split by manual", () => {
  assert.equal(strokes.length, 166);
  const n = {};
  strokes.forEach(s=>{n[s.module]=(n[s.module]||0)+1});
  assert.deepEqual(n, {1:25, 2:33, 3:38, 4:29, 5:41});
  const raw = fs.readdirSync(dir).map(f=>fs.readFileSync(path.join(dir, f), "utf8")).join("\n").toLowerCase();
  ["asang", "3bc6bf25", "dropbox"].forEach(term=>assert.equal(raw.includes(term), false, term));
});

test("burning knee pain selects Grounding only, even with a strong thoracic belt", () => {
  const r = read({
    complaint: "Upper back stiffness after exercise",
    pain_areas: ["knees"],
    pain_type: ["burning"],
    pain_intensity: 3,
    breath: "Breath feels free",
    stress: 9,
    body_experience: "Pelvic contraction when stress rises. Strong core.",
    energetics: ["Well grounded"],
    tension_areas: ["upper back"]
  }, {ocular:1, oral:1, cervical:2, thoracic:3, diaphragmatic:2, abdominal:1, pelvic:3});
  assert.equal(r.needsChoice, false);
  assert.equal(r.segment, "pelvic");
  assert.equal(MER.activeManual(r), "MER2");
  const cards = MER.visibleCards(r);
  assert.equal(cards.length, 33);
  assert.ok(cards.every(c=>c.module===2));
  const order = cards.map(c=>c.manual_order);
  assert.deepEqual(order, order.slice().sort((a,b)=>a-b));
  const page = html(r);
  assert.equal((page.match(/data-mer-sec="/g)||[]).length, 4);
  assert.match(page, /pain 3\/10/);
  assert.match(page, /Stress level: 9\/10/);
  assert.equal(/3\/3|\/3/.test(page), false);
  assert.equal(/PDF p\.|https?:|myofascialtrainings/i.test(page), false);
  assert.equal(/Reich|10-session|Check comfortable movement|Read together/i.test(page), false);
  assert.equal((page.match(/class="stCard"/g)||[]).length, 33);
  assert.match(page, /MER Inspiration Training/);
  assert.equal(/MER5-/.test(page), false);
  assert.equal(/module":5|MER5-/.test(ids(r).join(",")), false);
});

test("other segments follow the belt-to-manual table and do not combine manuals", () => {
  const one = (data, belts)=>read(data, belts||{});
  assert.equal(MER.activeManual(one({pain_areas:["neck"]})), "MER1");
  assert.equal(MER.visibleCards(one({pain_areas:["neck"]})).length, 25);
  assert.equal(MER.activeManual(one({complaint:"Jaw pain"})), "MER4");
  assert.equal(MER.visibleCards(one({complaint:"Eye pain"})).every(c=>c.module===4), true);
  assert.equal(MER.activeManual(one({pain_areas:["belly"]})), "MER3");
  assert.equal(MER.visibleCards(one({pain_areas:["abdomen"]})).length, 38);
  assert.equal(MER.activeManual(one({breath:"Breath feels shallow and held"})), "MER5");
  assert.equal(MER.visibleCards(one({breath:"I cannot breathe deeply"})).length, 41);
  assert.equal(MER.activeManual(one({complaint:"Upper back pain"})), "MER5");
  const free = one({complaint:"Upper back stiffness", breath:"Breath feels free"}, {thoracic:3, diaphragmatic:2});
  assert.equal(free.segment, "thoracic");
  assert.equal(free.breathFree, true);
  assert.equal(/restricted breath/i.test(html(free)), false);
});

test("competing specific pain asks for one choice and switching replaces the manual", () => {
  const r = read({pain_areas:["knees","jaw"], pain_intensity:4});
  assert.equal(r.needsChoice, true);
  assert.equal(r.segment, null);
  assert.equal(MER.visibleCards(r).length, 0);
  const ask = html(r, null);
  assert.match(ask, /Choose one segment/);
  assert.equal((ask.match(/class="stCard"/g)||[]).length, 0);
  const grounded = MER.renderSession(r, "pelvic");
  const face = MER.renderSession(r, "oral");
  assert.equal((grounded.match(/class="stCard"/g)||[]).length, 33);
  assert.equal((face.match(/class="stCard"/g)||[]).length, 29);
  assert.equal(/MER2-/.test(face), false);
  assert.match(html(r, "pelvic"), /pain 4\/10/);
});

test("a strong core is not abdominal pain, and a belt score alone does not invent a second manual", () => {
  const core = read({body_experience:"I have a strong core and feel well grounded", stress:8}, {abdominal:0, pelvic:0, thoracic:0});
  assert.equal(core.segment, null);
  assert.equal(core.needsChoice, true);
  assert.equal(MER.activeManual(core, "abdominal"), "MER3");
  const onlyBelt = read({complaint:"General check-in"}, {thoracic:3, pelvic:3});
  assert.equal(onlyBelt.needsChoice, true);
  assert.ok(onlyBelt.choice.options.includes("thoracic"));
  assert.ok(onlyBelt.choice.options.includes("pelvic"));
});

test("missing belt levels stay unknown and empty intake does not throw", () => {
  assert.equal(MER.beltLevel(null), null);
  assert.equal(MER.beltLevel("nope"), null);
  assert.equal(MER.beltLevel(3), 3);
  const r = read({}, {thoracic:"nope", pelvic:3, ocular:0});
  assert.equal(r.belts.find(b=>b.key==="thoracic").levelLabel, "Unknown");
  assert.equal(r.belts.find(b=>b.key==="pelvic").levelLabel, "Strong · over-charged");
  assert.doesNotThrow(()=>MER.buildReading(cat, {}));
  const page = html(read({pain_areas:"feet"}));
  assert.equal(page.includes("<script>"), false);
  assert.match(page, /Four chapters/);
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
