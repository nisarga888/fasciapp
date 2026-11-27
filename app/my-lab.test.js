const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const LAB = require("./my-lab.js");
const SHARE = require("./share.js");

test("My Lab links stay on the practitioner slug and only accept http(s)", () => {
  assert.equal(SHARE.redirectTarget("/p/aisha-archer/lab"), "/app/?p=aisha-archer&view=lab");
  assert.equal(SHARE.redirectTarget("/p/550e8400-e29b-41d4-a716-446655440000/lab"), "/app/?p=550e8400-e29b-41d4-a716-446655440000&view=lab");
  assert.equal(SHARE.redirectTarget("/p/aisha-archer"), null);
  assert.equal(SHARE.redirectTarget("/poland/warsaw"), "/app/?loc=poland&city=warsaw");
  assert.equal(LAB.labUrl("Aisha-Archer"), "https://fasciapp.app/p/aisha-archer/lab");
  assert.equal(LAB.resourceUrl("aisha-archer", "abc"), "https://fasciapp.app/p/aisha-archer/lab?r=abc");
  assert.equal(LAB.httpUrl("https://youtu.be/iWBourJ41kU"), "https://youtu.be/iWBourJ41kU");
  assert.equal(LAB.httpUrl("http://example.com/a"), "http://example.com/a");
  assert.equal(LAB.httpUrl("javascript:alert(1)"), "");
  assert.equal(LAB.httpUrl("https://user:pass@example.com"), "");
  assert.equal(LAB.kindOf("youtube"), "youtube");
  assert.equal(LAB.kindOf("course"), "course");
  assert.equal(LAB.kindOf("link"), "link");
  assert.equal(LAB.kindOf("file"), "");
  assert.equal(LAB.listingTile(0), "");
  assert.match(LAB.listingTile(2), /2 resources/);
  assert.equal(LAB.listingTile(1).includes("1 resource"), true);
  const page = fs.readFileSync(path.join(__dirname, "../404.html"), "utf8");
  assert.match(page, /view=lab/);
  const profile = fs.readFileSync(path.join(__dirname, "cal.js"), "utf8");
  assert.match(profile, /"mylab"/);
  assert.match(profile, /My Space/);
  assert.match(profile, /Planned/);
  assert.equal(/data-fap="myspace"/.test(profile), false);
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261127160000_practitioner_lab.sql"), "utf8");
  assert.match(sql, /visible_to_clients = true/);
  assert.match(sql, /consent is true/);
  assert.match(sql, /\^https\?:\/\//);
  assert.match(sql, /for all to authenticated/);
});
