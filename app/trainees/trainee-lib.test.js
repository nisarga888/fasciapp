const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const TR = require("./trainee-lib.js");

test("parseCohort accepts month and year in the forms people type", () => {
  assert.deepEqual(TR.parseCohort("March 2025"), {month: 3, year: 2025, label: "March 2025", key: "2025-03"});
  assert.equal(TR.parseCohort("mar 2025").key, "2025-03");
  assert.equal(TR.parseCohort("March of 2025").label, "March 2025");
  assert.equal(TR.parseCohort("03/2025").key, "2025-03");
  assert.equal(TR.parseCohort("3-2025").key, "2025-03");
  assert.equal(TR.parseCohort("2025-03").label, "March 2025");
  assert.equal(TR.parseCohort("2025/3").month, 3);
  assert.equal(TR.parseCohort(""), null);
  assert.equal(TR.parseCohort("March"), null);
  assert.equal(TR.parseCohort("13/2025"), null);
  assert.equal(TR.parseCohort("March 1800"), null);
});

test("directory sort is A-Z by name and filters combine", () => {
  const rows = [
    {id: "b", name: "Bo Berg", country: "Sweden", cohort_month: 3, cohort_year: 2025, languages: ["English"], published: true},
    {id: "a", name: "Ásta Lind", country: "Iceland", cohort_month: 1, cohort_year: 2024, languages: ["English", "Icelandic"], published: true},
    {id: "c", name: "Chen Wei", country: "Sweden", cohort_month: 3, cohort_year: 2025, languages: ["Chinese"], published: true},
    {id: "h", name: "Hidden", country: "Sweden", cohort_month: 3, cohort_year: 2025, languages: ["English"], published: false}
  ];
  assert.deepEqual(TR.sortTrainees(rows).map(r => r.id), ["a", "b", "c", "h"]);
  assert.deepEqual(TR.groupAZ(rows.filter(r => r.published)).map(g => g.letter), ["Á", "B", "C"]);
  const both = TR.filterTrainees(rows, {country: "Sweden", cohort: "2025-03", lang: "English"});
  assert.deepEqual(both.map(r => r.id), ["b"]);
  assert.equal(TR.filterTrainees(rows, {}).some(r => r.id === "h"), false);
});

test("logged-out visitors do not receive direct contact details", () => {
  const pubCols = TR.selectColumns(false).split(",");
  const memCols = TR.selectColumns(true).split(",");
  assert.equal(pubCols.includes("email"), false);
  assert.equal(pubCols.includes("whatsapp"), false);
  assert.ok(pubCols.includes("has_email"));
  assert.ok(memCols.includes("email"));
  assert.ok(memCols.includes("whatsapp"));
  const row = {name: "Ana", email: "ana@example.com", whatsapp: "+46 70 123 4567", has_email: true, has_whatsapp: true, languages: ["English"], website: "javascript:alert(1)", photo: "data:text/html;base64,abc"};
  const pub = TR.redact(row, false);
  assert.equal(pub.email, "");
  assert.equal(pub.whatsapp, "");
  assert.equal(pub.has_email, true);
  assert.equal(pub.has_whatsapp, true);
  assert.equal(pub.website, "");
  assert.equal(pub.photo, "");
  const mem = TR.redact(row, true);
  assert.equal(mem.email, "ana@example.com");
  assert.equal(TR.waLink(mem.whatsapp), "https://wa.me/46701234567");
  assert.equal(TR.safeWeb("https://example.com/a"), "https://example.com/a");
  assert.equal(TR.safeWeb("javascript:alert(1)"), "");
});

test("pages use the dedicated trainee route and do not add a booking flow", () => {
  const dir = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const join = fs.readFileSync(path.join(__dirname, "join.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(join, /Type the month and year your cohort started\./);
  assert.equal(join.includes("newsletter"), false);
  assert.equal(dir.includes("newsletter"), false);
  for (const html of [dir, join]) {
    assert.equal(/book a session/i.test(html), false);
    assert.equal(/stripe|payment/i.test(html), false);
  }
  assert.match(dir, /href="join\.html\?list=1"/);
  assert.match(app, /href="trainees\/"/);
  const tile = app.slice(app.indexOf("function labTiles"), app.indexOf("function labView"));
  assert.match(tile, /trainees\//);
  assert.equal(/assessment/i.test(tile), false);
  const sql = fs.readFileSync(path.join(__dirname, "../../supabase/migrations/20261105163000_bbtrs_trainees.sql"), "utf8");
  assert.match(sql, /published := true/);
  const grant = sql.match(/grant select \(([\s\S]*?)\) on table public\.bbtrs_trainees to anon/i);
  assert.ok(grant, "anon select grant");
  const cols = grant[1].split(",").map(s => s.trim());
  assert.equal(cols.includes("email"), false);
  assert.equal(cols.includes("whatsapp"), false);
  assert.ok(cols.includes("has_email"));
  assert.ok(cols.includes("has_whatsapp"));
  assert.equal(/alter table public\.assessments/i.test(sql), false);
  const seed = fs.readFileSync(path.join(__dirname, "../../supabase/migrations/20261105163100_bbtrs_trainees_test_seed.sql"), "utf8");
  const samples = fs.readFileSync(path.join(__dirname, "test-profiles.js"), "utf8");
  for (const name of ["Nisarga", "Giten", "Aisha", "Prema"]) {
    assert.match(seed, new RegExp(name));
    assert.match(samples, new RegExp(name));
  }
  assert.match(seed, /@example\.com/);
  assert.equal(/auth\.users|encrypted_password|insert into auth/i.test(seed), false);
  assert.equal(/@(gmail|fasciapp|bodyawareness)/i.test(seed), false);
  assert.equal(samples.includes("@"), false);
  assert.match(samples, /cohort_label: "TEST"/);
  assert.match(samples, /country: "TEST"/);
  assert.match(dir, /href="\.\.\/\?search=1"/);
  const rows = require("./test-profiles.js");
  assert.equal(rows.length, 4);
  rows.forEach(r => {
    assert.equal(r.is_test, true);
    assert.equal(r.has_whatsapp, false);
    assert.equal(TR.safePhoto(r.photo).startsWith("data:image/png;base64,"), true);
    assert.equal(TR.redact(r, false).email, "");
  });
});
