const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const TZ = require("./tz.js");

const ZONES = ["Europe/London", "Europe/Warsaw", "Europe/Bucharest", "Europe/Tallinn", "Europe/Athens"];

function iso(dateStr, timeStr, zone){
  return TZ.zonedToUtc(dateStr, timeStr, zone).toISOString();
}

test("winter wall times, after the UK left BST on 25 Oct 2026", () => {
  assert.equal(iso("2026-11-26", "18:00", "Europe/London"), "2026-11-26T18:00:00.000Z");
  assert.equal(iso("2026-11-26", "18:00", "Europe/Warsaw"), "2026-11-26T17:00:00.000Z");
  ["Europe/Bucharest", "Europe/Tallinn", "Europe/Athens"].forEach(zone => {
    assert.equal(iso("2026-11-26", "18:00", zone), "2026-11-26T16:00:00.000Z", zone);
  });
});

test("summer wall times, while the UK is still on BST", () => {
  assert.equal(iso("2026-07-26", "18:00", "Europe/London"), "2026-07-26T17:00:00.000Z");
  assert.equal(iso("2026-07-26", "18:00", "Europe/Warsaw"), "2026-07-26T16:00:00.000Z");
  ["Europe/Bucharest", "Europe/Tallinn", "Europe/Athens"].forEach(zone => {
    assert.equal(iso("2026-07-26", "18:00", zone), "2026-07-26T15:00:00.000Z", zone);
  });
});

test("the day before and the day of the 25 Oct 2026 clock change", () => {
  assert.equal(iso("2026-10-24", "18:00", "Europe/London"), "2026-10-24T17:00:00.000Z");
  assert.equal(iso("2026-10-25", "18:00", "Europe/London"), "2026-10-25T18:00:00.000Z");
  assert.equal(iso("2026-10-24", "18:00", "Europe/Warsaw"), "2026-10-24T16:00:00.000Z");
  assert.equal(iso("2026-10-25", "18:00", "Europe/Warsaw"), "2026-10-25T17:00:00.000Z");
  ["Europe/Bucharest", "Europe/Tallinn", "Europe/Athens"].forEach(zone => {
    assert.equal(iso("2026-10-24", "18:00", zone), "2026-10-24T15:00:00.000Z", zone);
    assert.equal(iso("2026-10-25", "18:00", zone), "2026-10-25T16:00:00.000Z", zone);
  });
});

test("a one hour reminder is 17:00 London for an 18:00 London session", () => {
  const start = TZ.zonedToUtc("2026-11-26", "18:00", "Europe/London");
  const reminder = new Date(start.getTime() - 60 * 60 * 1000);
  assert.equal(TZ.hmIn(reminder, "Europe/London"), "17:00");
  assert.equal(TZ.reminderTrigger("1h"), "-PT60M");
  assert.equal(TZ.reminderTrigger("1d"), "-P1D");
  const ics = TZ.icsEvent({uid: "s@fasciapp.app", start: start, summary: "Session with Alex", reminder: "1h", stamp: start, description: "FasciApp"});
  assert.match(ics, /DTSTART:20261126T180000Z/);
  assert.match(ics, /DTEND:20261126T190000Z/);
  assert.match(ics, /TRIGGER:-PT60M/);
  assert.doesNotMatch(ics, /Europe\/Warsaw/);
  const google = new URL(TZ.googleUrl({start: start, summary: "Session with Alex", tz: "Europe/London"}));
  assert.equal(google.searchParams.get("dates"), "20261126T180000Z/20261126T190000Z");
  assert.equal(google.searchParams.get("ctz"), "Europe/London");
  const outlook = new URL(TZ.outlookUrl({start: start, summary: "Session with Alex"}));
  assert.equal(outlook.searchParams.get("startdt"), "2026-11-26T18:00:00Z");
  assert.equal(outlook.searchParams.get("enddt"), "2026-11-26T19:00:00Z");
});

test("the same zone is labelled, and another zone is converted", () => {
  const start = TZ.zonedToUtc("2026-11-26", "18:00", "Europe/London");
  assert.equal(TZ.zoneLabel("Europe/London"), "London time");
  assert.equal(TZ.clockLabel(start, "Europe/London", "Europe/London"), "18:00 (London time)");
  assert.equal(TZ.clockLabel(start, "Europe/London", "Europe/Warsaw"), "19:00 (your time) · 18:00 (London time)");
  ZONES.forEach(zone => assert.match(TZ.zoneLabel(zone), / time$/));
});

test("the calendar no longer reads typed times as Warsaw", () => {
  const cal = fs.readFileSync(path.join(__dirname, "cal.js"), "utf8");
  assert.equal(cal.includes("fromWarsaw"), false);
  assert.equal(cal.includes('TZ="Europe/Warsaw"'), false);
  assert.match(cal, /zonedToUtc/);
  assert.match(cal, /time_basis:"zone"/);
});
