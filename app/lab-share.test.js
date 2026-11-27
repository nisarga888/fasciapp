const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const LAB = require("./lab-share.js");
const QR = require("./qr.js");
const SHARE = require("./share.js");

function loadLearn(){
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "learn.js"), "utf8"), { window: win });
  return win.FASCIAPP_LEARN;
}
const COURSES = [
  { k: "c1", t: "Breathe Online for Stress and Sleep", by: "Nisarga Eryk Dobosz", dur: "21 days · Day 1 free", price: "€24.90", img: "lab/course-breathe21.jpg", url: "https://breathe.bodyawareness.ee/?utm_source=fasciapp" },
  { k: "c2", t: "Self Bodywork", by: "Satyarthi Peloquin", dur: "8+ hours", price: "€175", img: "lab/course-selfmassage.jpg", url: "https://www.myofascialtrainings.com/online-courses/self-massage-course" },
  { k: "c3", t: "Reichian Character Structure", by: "Jennifer McKeever", dur: "3.5 hours · 6 lessons", price: "€79", img: "lab/course-character-types.jpg", url: "https://online.myofascialtrainings.com/courses/mer-character-types-course-en-version" },
  { k: "c4", t: "Home-Practice Breathwork Journey", by: "Giten Tonkov", dur: "7 sessions · 30–45 min each", price: "$129", img: "lab/course-bbtrs-home.jpg", url: "https://members.biodynamicbreath.com/courses/offers/975170e6-7522-4b82-b9ba-6ee63d8106e7" }
];
const BREATHS = {
  coherent: { title: "Coherent breathing", line: "6 seconds in · 6 seconds out · 5 minutes" },
  longer: { title: "Longer exhale", line: "In 4 · out 6 · 5 minutes" },
  box: { title: "Box breathing", line: "In 4 · hold 4 · out 4 · hold 4 · 5 minutes" },
  f478: { title: "4-7-8 breathing", line: "In 4 · hold 7 · out 8 · 8 rounds" }
};
function cat(){ return LAB.catalog({ learn: loadLearn(), courses: COURSES, breaths: BREATHS }); }

test("lab paths and item slugs stay on FasciApp", () => {
  const c = cat();
  const book = LAB.find(c, "books", "feel-to-heal");
  const breath = LAB.find(c, "breathing", "coherent");
  const members = LAB.find(c, "breathing", "longer");
  const course = LAB.find(c, "courses", "breathe-online");
  const listen = c.items.find(i => i.section === "listen" && i.title === "Reset of the Nervous System");
  assert.ok(book);
  assert.equal(book.url, "https://fasciapp.app/lab/books/feel-to-heal");
  assert.equal(book.gated, true);
  assert.equal(book.verb, "read");
  assert.equal(LAB.gateLine(book), "Create a free account to read this");
  assert.equal(LAB.loginLine(book), "Log in to read this");
  assert.equal(breath.gated, false);
  assert.equal(LAB.gateLine(members), "Create a free account to practise this");
  assert.equal(LAB.needsAccount(book, false), true);
  assert.equal(LAB.needsAccount(book, true), false);
  assert.equal(LAB.needsAccount(breath, false), false);
  assert.equal(course.url, "https://fasciapp.app/lab/courses/breathe-online");
  assert.equal(course.gated, false);
  assert.equal(listen.gated, false);
  assert.match(listen.url, /^https:\/\/fasciapp\.app\/lab\/listen\//);
  c.items.forEach(row => {
    assert.equal(LAB.leaked(row.url), false, row.url);
    assert.equal(LAB.leaked(LAB.sheetHtml({ title: row.title, line: row.line, label: row.label, url: row.url })), false, row.slug);
    assert.equal(LAB.leaked(LAB.ogDesc(row)), false, row.slug);
    assert.equal(LAB.leaked(LAB.authCardHtml(row)), false, row.slug);
  });
  assert.match(course.href, /bodyawareness|myofascialtrainings|biodynamicbreath/);
  assert.equal(LAB.leaked(course.url), false);
  assert.match(book.href, /\.pdf$/);
  assert.equal(LAB.sheetHtml(book).includes(".pdf"), false);
  assert.equal(LAB.sheetHtml(listen).includes("spotify"), false);
});

test("the share sheet has the Lab actions and the real account line", () => {
  const book = LAB.find(cat(), "books", "feel-to-heal");
  const sheet = LAB.sheetHtml({ title: book.title, line: book.line, label: book.label, url: book.url, cover: book.cover, native: true });
  assert.match(sheet, /Copy link/);
  assert.match(sheet, /WhatsApp/);
  assert.match(sheet, /Email/);
  assert.match(sheet, /data-native/);
  assert.match(sheet, /Send to my practitioner/);
  assert.match(sheet, /QR code/);
  assert.match(sheet, /Shared with you/);
  assert.match(sheet, /fasciapp\.app\/lab\/books\/feel-to-heal/);
  const card = LAB.authCardHtml(book);
  assert.match(card, /Feel to Heal/);
  assert.match(card, /Shared with you/);
  assert.equal(card.includes("authForm"), false);
});

test("GitHub Pages sends /lab paths into the app", () => {
  assert.equal(SHARE.redirectTarget("/lab"), "/app/?tab=lab");
  assert.equal(SHARE.redirectTarget("/lab/books"), "/app/?lab=books");
  assert.equal(SHARE.redirectTarget("/lab/breathing/coherent"), "/app/?lab=breathing&item=coherent");
  assert.equal(SHARE.redirectTarget("/lab/books/feel-to-heal"), "/app/?lab=books&item=feel-to-heal");
  assert.equal(SHARE.redirectTarget("/lab/nope"), null);
  assert.equal(SHARE.redirectTarget("/poland/warsaw"), "/app/?loc=poland&city=warsaw");
  const page = fs.readFileSync(path.join(__dirname, "../404.html"), "utf8");
  assert.match(page, /\/app\/\?lab=/);
  assert.match(page, /&item=/);
});

test("QR codes scan back to the Lab link", () => {
  const locked = {
    "https://fasciapp.app/lab/books": "2:7:f9d1db42953cedd6",
    "https://fasciapp.app/lab/breathing/coherent": "3:0:111ff202f0050109",
    "https://fasciapp.app/lab/books/feel-to-heal": "3:5:0f22e10c9ea6f133"
  };
  const sig = m => crypto.createHash("sha256").update(m.map(r => Array.from(r).join("")).join("\n")).digest("hex").slice(0, 16);
  Object.keys(locked).forEach(text => {
    const got = QR.matrix(text);
    const n = got.length;
    assert.equal(got[0][0], 1);
    assert.equal(got[n - 1][0], 1);
    assert.equal(got[0][n - 1], 1);
    assert.equal(n, 17 + 4 * got.version);
    assert.equal(got.version + ":" + got.mask + ":" + sig(got), locked[text]);
    const scale = 4, quiet = 4, size = (n + quiet * 2) * scale;
    const rows = [];
    for (let y = 0; y < size; y++) {
      const r = Math.floor(y / scale) - quiet;
      let line = "";
      for (let x = 0; x < size; x++) {
        const c = Math.floor(x / scale) - quiet;
        line += (r >= 0 && c >= 0 && r < n && c < n && got[r][c]) ? "1 " : "0 ";
      }
      rows.push(line.trim());
    }
    const file = path.join(require("node:os").tmpdir(), "fa-lab-qr.pbm");
    fs.writeFileSync(file, "P1\n" + size + " " + size + "\n" + rows.join("\n") + "\n");
    const out = execFileSync("zbarimg", ["--quiet", "-Sdisable", "-Sqr.enable", file], { encoding: "utf8" }).trim();
    assert.equal(out, "QR-Code:" + text);
  });
});

test("link previews stay on the Lab path and do not expose a PDF", () => {
  const book = fs.readFileSync(path.join(__dirname, "../lab/books/feel-to-heal/index.html"), "utf8");
  const breath = fs.readFileSync(path.join(__dirname, "../lab/breathing/coherent/index.html"), "utf8");
  assert.match(book, /Create a free account to read this/);
  assert.match(book, /https:\/\/fasciapp\.app\/lab\/books\/feel-to-heal/);
  assert.equal(/\.pdf|spotify\.com|youtube\.com/i.test(book), false);
  assert.match(breath, /Coherent breathing/);
  assert.match(breath, /\/app\/\?lab=breathing&amp;item=coherent|\/app\/\?lab=breathing&item=coherent/);
});

test("the app opens the real account form for a members Lab link", () => {
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const breath = fs.readFileSync(path.join(__dirname, "breath.js"), "utf8");
  assert.match(app, /function faLabAuth\(/);
  assert.match(app, /setMode\(true\)/);
  assert.match(app, /show\("auth"\)/);
  assert.match(app, /pendingLab/);
  assert.match(app, /faLabArrive\(pl\.section,pl\.slug\)/);
  assert.match(index, /id="labAuthCard"/);
  assert.match(index, /id="authForm"/);
  assert.match(index, /lab-share\.js\?v=/);
  assert.match(breath, /FA_LAB\.shareBtn\("item:breathing\//);
  assert.match(app, /data-lab-share/);
  assert.match(app, /Send to my practitioner|data-pract/);
});
