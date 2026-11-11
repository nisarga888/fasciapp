const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const MER = require("./mer-v2.js");

const dir = path.join(__dirname, "data/mer");
const cat = {
  mer_modules: JSON.parse(fs.readFileSync(path.join(dir, "mer_modules.json"), "utf8")),
  mer_cards: JSON.parse(fs.readFileSync(path.join(dir, "mer_cards.json"), "utf8")),
  routing: JSON.parse(fs.readFileSync(path.join(dir, "routing.json"), "utf8")),
  fascia_lines: JSON.parse(fs.readFileSync(path.join(dir, "fascia_lines.json"), "utf8")),
  homework_mapping: JSON.parse(fs.readFileSync(path.join(dir, "homework_mapping.json"), "utf8"))
};
const strokes = cat.mer_cards.cards;

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
  strokes.forEach(s=>{const m=Number(String(s.manual).replace(/\D/g,"")); n[m]=(n[m]||0)+1});
  assert.deepEqual(n, {1:25, 2:33, 3:38, 4:29, 5:41});
  const raw = fs.readdirSync(dir).filter(f=>fs.statSync(path.join(dir, f)).isFile()).map(f=>fs.readFileSync(path.join(dir, f), "utf8")).join("\n").toLowerCase();
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
  assert.match(page, /MER5 · Inspiration/);
  assert.match(page, /MER Grounding Training/);
  assert.match(page, /data-mer-seg="pelvic"/);
  assert.match(page, /class="body-svg"/);
  assert.match(page, /Start session 1/);
  assert.match(page, /M100\.0 22\.0/);
  assert.match(page, /data-mer-src="images\/strokes\/MER2-001.webp"/);
  assert.match(page, /data-mer-src="images\/anatomy\/MER2-001.webp"/);
  assert.match(page, /Superficial Back line/);
  assert.match(page, /class="lit"/);
  assert.match(page, /These areas connect through the selected training/);
  assert.equal(/data\/mer\/lines\/back\.svg/.test(page), false);
  assert.equal(/viewBox="0 0 80 116"/.test(page), false);
  assert.equal(/In this part/.test(page), false);
  const cardsOnly = page.slice(page.indexOf("Stroke 01"));
  assert.equal(/MER5-/.test(cardsOnly), false);
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
  const insp = html(one({complaint:"Upper back pain"}));
  assert.match(insp, /data-mer-src="images\/strokes\/MER5-/);
  assert.equal(/images\/strokes\/MER2-/.test(insp), false);
  const free = one({complaint:"Upper back stiffness", breath:"Breath feels free"}, {thoracic:3, diaphragmatic:2});
  assert.equal(free.segment, "thoracic");
  assert.equal(free.breathFree, true);
  assert.equal(/restricted breath/i.test(html(free)), false);
});

test("the first reported pain area is the main issue, and another area does not add a manual", () => {
  const r = read({pain_areas:["knees","jaw"], pain_intensity:4});
  assert.equal(r.needsChoice, false);
  assert.equal(r.segment, "pelvic");
  assert.equal(MER.activeManual(r), "MER2");
  assert.equal(MER.visibleCards(r).length, 33);
  assert.ok(r.choice.options.includes("oral"));
  const page = html(r);
  assert.match(page, /pain 4\/10/);
  assert.match(page, /do not add another manual/i);
  assert.equal(/images\/strokes\/MER4-/.test(page), false);
  const face = MER.renderSession(r, "oral");
  assert.equal((face.match(/class="stCard"/g)||[]).length, 29);
  assert.equal(/MER2-/.test(face), false);
  const neck = html(read({complaint:"Neck tension", tension_areas:["neck"], pain_intensity:6}));
  const breath = html(read({breath:"Breath feels shallow and held", pain_intensity:2}));
  assert.match(neck, /Self-Empowerment/);
  assert.match(neck, /pain 6\/10/);
  assert.equal(/knee pain score/.test(neck), false);
  assert.equal(/images\/strokes\/MER2-/.test(neck), false);
  assert.match(breath, /Inspiration/);
  assert.match(breath, /breath restriction/i);
  assert.equal(/knee pain score/.test(breath), false);
  assert.equal(/images\/strokes\/MER1-/.test(breath), false);
  const held = read({breath:["Hold my breath","Chest breathing"]});
  assert.equal(held.segment, "diaphragmatic");
  assert.equal(MER.activeManual(held), "MER5");
  const freeList = read({breath:["Feels free"], complaint:"General check-in"}, {thoracic:3});
  assert.equal(freeList.breathFree, true);
  assert.equal(freeList.segment, "thoracic");
  assert.equal(/restricted breath/i.test(html(freeList)), false);
  assert.equal(MER.activeManual(read({pain_areas:["Shoulders"]})), "MER5");
  assert.equal(MER.activeManual(read({pain_areas:["Jaw","Neck"]})), "MER4");
  assert.equal(MER.activeManual(read({pain_areas:["Knees"], tension_areas:["Upper back"], breath:["Feels free"]})), "MER2");
});

test("a strong core is not abdominal pain, and a belt score alone does not invent a second manual", () => {
  const core = read({body_experience:"I have a strong core and feel well grounded", stress:8}, {abdominal:0, pelvic:0, thoracic:0});
  assert.equal(core.segment, null);
  assert.equal(core.needsChoice, true);
  assert.equal(MER.activeManual(core, "abdominal"), "MER3");
  const onlyBelt = read({complaint:"General check-in"}, {thoracic:3, pelvic:3});
  assert.equal(onlyBelt.segment, "thoracic");
  assert.equal(MER.activeManual(onlyBelt), "MER5");
  assert.equal(MER.visibleCards(onlyBelt).some(c=>c.module===2), false);
});

test("the belt picker and the training list are the same five rows", () => {
  const neck = html(read({complaint:"Neck tension", pain_areas:["neck"], pain_intensity:6}, {cervical:3, thoracic:3, diaphragmatic:2, oral:1, ocular:1}));
  assert.equal((neck.match(/class="beltRow/g)||[]).length, 5);
  const order = neck.slice(neck.indexOf('class="flowList"'), neck.indexOf('class="combo-c"'));
  assert.ok(order.indexOf("Cervical")<order.indexOf("Thoracic"));
  assert.ok(order.indexOf("Thoracic")<order.indexOf("Ocular"));
  assert.match(order, /NOW/);
  assert.match(neck, /MER Self-Empowerment/);
  assert.match(neck, /Ocular &amp; Oral/);
  assert.match(neck, /Thoracic &amp; Diaphragmatic/);
  assert.match(neck, /Abdominal/);
  assert.match(neck, /Pelvic &amp; Legs/);
  assert.match(neck, /Ocular &amp; Oral/);
  assert.match(neck, /MER4 · Original Face \(Cranium\)/);
  assert.match(neck, /Thoracic &amp; Diaphragmatic/);
  assert.match(neck, /MER5 · Inspiration/);
  assert.match(neck, /MER3 · Centering \(Pelvis\)/);
  assert.match(neck, /Pelvic &amp; Legs/);
  assert.match(neck, /beltRow on[\s\S]*Cervical[\s\S]*MER1 · Self-Empowerment[\s\S]*Strong · over-charged/);
  const list = neck.slice(neck.indexOf("Belts and MER trainings"), neck.indexOf('id="merC2"'));
  assert.match(list, /Thoracic &amp; Diaphragmatic[\s\S]*MER5 · Inspiration[\s\S]*Strong · over-charged/);
  assert.equal(/<b>Ocular<\/b>/.test(list), false);
  assert.equal(/<b>Diaphragmatic<\/b>/.test(list), false);
  const face = MER.renderSession(read({pain_areas:["Jaw"]}), "face");
  assert.match(face, /data-mer-seg="face"/);
  assert.equal((face.match(/class="stCard"/g)||[]).length, 29);
  const breath = MER.renderSession(read({breath:["Hold my breath"]}), "thorax");
  assert.match(breath, /data-mer-seg="thorax"/);
  assert.match(breath, /breath restriction/i);
  assert.match(breath, /Inspiration/);
});

test("sessions run Strong, then To watch, then Mild, and skip Balanced", () => {
  const belts = {ocular:0, oral:0, cervical:2, thoracic:3, diaphragmatic:0, abdominal:1, pelvic:3};
  const reading = read({pain_areas:["knees"], complaint:"Burning knees", pain_intensity:3}, belts);
  const page = html(reading);
  const list = page.slice(page.indexOf('class="flowList"'), page.indexOf("combo-c"));
  assert.ok(list.indexOf("Pelvic")<list.indexOf("Thoracic"));
  assert.ok(list.indexOf("Thoracic")<list.indexOf("Cervical"));
  assert.ok(list.indexOf("Cervical")<list.indexOf("Abdominal"));
  assert.match(list, /NOW/);
  assert.match(list, /NEXT/);
  assert.match(page, /Skipped · Ocular &amp; Oral/);
  assert.match(page, /Start session 1/);
  assert.match(page, /burning knees/);
  assert.equal((list.match(/class="rec"/g)||[]).length, 2);
  const next = MER.renderSession(reading, "thorax");
  assert.match(next, /class="sess slim current" data-mer-seg="thorax"/);
  assert.match(next, /MER Inspiration/);
  assert.equal((next.match(/class="stCard"/g)||[]).length, 41);
  const done = MER.renderSession(reading, null, {done:["pelvic"]});
  assert.match(done, /class="sess slim current" data-mer-seg="thorax"/);
  assert.match(done, /DONE/);
  assert.match(done, /<span>2<\/span> of 4/);
  const mild = html(read({pain_areas:["knees"]}, {pelvic:1, thoracic:1, cervical:0, abdominal:0, ocular:0, oral:0, diaphragmatic:0}));
  assert.match(mild, /class="sess slim current" data-mer-seg="pelvic"/);
  assert.equal(/class="rec"/.test(mild.slice(mild.indexOf('class="flowList"'), mild.indexOf("combo-c"))), false);
});

test("a changed picture-reading paragraph is marked as the practitioner’s note", () => {
  const page = MER.renderMer(read({complaint:"Neck tension"}), {bodyItems:[{h:"Front",p:"Head sits slightly forward. Added: check the desk setup.",path:"sections.1.items.2.p",pathH:"sections.1.items.2.h",note:true,noteH:false}]});
  assert.match(page, /class="bxp faNote"/);
  assert.match(page, /data-p="sections\.1\.items\.2\.p"/);
  assert.match(page, /Added: check the desk setup/);
  assert.equal(/class="gH faNote"/.test(page), false);
});

test("myofascial lines light only the training that matches the main issue", () => {
  function legend(page){return page.slice(page.indexOf('class="lnLegend"'), page.indexOf('class="lnChips"'));}
  const knee = legend(html(read({pain_areas:["knees"], complaint:"Burning knees"})));
  assert.match(knee, /Superficial Back line/);
  assert.match(knee, /Lateral line/);
  assert.match(knee, /knees/);
  assert.equal(/Arm lines|Deep Front line|Spiral line/.test(knee), false);
  const jaw = legend(html(read({pain_areas:["jaw"]})));
  assert.match(jaw, /Deep Front line/);
  assert.match(jaw, /Superficial Front line/);
  assert.match(jaw, /jaw/);
  assert.equal(/Arm lines|Superficial Back line/.test(jaw), false);
  const neckPage = html(read({pain_areas:["neck"]}));
  const front = neckPage.slice(neckPage.indexOf('aria-label="front view"'), neckPage.indexOf('aria-label="back view"'));
  const lit = front.slice(front.indexOf('class="lit"'));
  assert.equal(/74\.0 480\.0/.test(lit), false);
  assert.match(lit, /96\.0 64\.0/);
  const shoulder = legend(html(read({pain_areas:["Shoulders"]})));
  assert.match(shoulder, /Arm lines/);
  assert.match(shoulder, /Spiral line/);
  assert.match(shoulder, /Shoulders/);
  assert.equal(/Superficial Back line|Deep Front line/.test(shoulder), false);
  const neck = legend(html(read({pain_areas:["neck"]})));
  assert.match(neck, /Superficial Front line/);
  assert.match(neck, /Lateral line/);
  const belly = legend(html(read({pain_areas:["belly"]})));
  assert.match(belly, /Deep Front line/);
  assert.match(belly, /Functional line/);
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

test("a marked session can be stored and undone without a server", async () => {
  globalThis.FA_MER_SESS_MEM = true;
  const S = require("./mer-sessions.js");
  const key = "sample client";
  assert.deepEqual(await S.load(key), []);
  assert.deepEqual(await S.complete(key, "Sample", "pelvic", 1), ["pelvic"]);
  assert.deepEqual(await S.complete(key, "Sample", "thorax", 2), ["pelvic", "thorax"]);
  assert.deepEqual(await S.undo(key, "pelvic"), ["thorax"]);
  delete globalThis.FA_MER_SESS_MEM;
});
