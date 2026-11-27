const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const GIFTS = require("./breath-gifts.js");
const MOOD = require("./mood-shift.js");
const JOURNEY = require("./journey.js");
const SHARE = require("./share.js");

test("the twelve breath gifts are free and share a Lab path", () => {
  assert.equal(GIFTS.GIFTS.length, 12);
  GIFTS.GIFTS.forEach(g => {
    assert.equal(GIFTS.bySlug(g.slug).title, g.title);
    assert.ok(g.rounds >= 1 && g.phases.length >= 2);
    const url = GIFTS.giftUrl(g.slug, "Nisarga E.");
    assert.match(url, /^https:\/\/fasciapp\.app\/lab\/breathing\/gifts\//);
    assert.equal(/\.pdf|payhip|spotify|youtube/i.test(url), false);
  });
  assert.equal(GIFTS.giftNote(""), "A breath gift for you");
  assert.equal(GIFTS.giftNote("Nisarga E."), "A breath gift from Nisarga E.");
  assert.equal(GIFTS.giftNote("a@b.c"), "A breath gift for you");
  assert.equal(GIFTS.bySlug("4-8-sleep").title, "Extended Exhale · 4-8");
  assert.ok(GIFTS.pack("pack-restless-evening").gifts.includes("4-8-sleep"));
});

test("mood shift stays gentle and rotates", () => {
  assert.equal(MOOD.MOODS.length, 6);
  assert.match(MOOD.NOTE, /isn’t a diagnosis or a treatment/);
  MOOD.MOODS.forEach(m => {
    assert.equal(m.practices.length, 3);
    assert.equal(m.cards.length, 5);
    m.cards.forEach(c => {
      assert.equal(/cure|treat your|diagnosis/i.test(c.text), false);
      if (c.by) assert.match(c.by, /FasciApp \(original\)|traditional proverb/);
    });
  });
  assert.equal(MOOD.cardAt("anxious", 0).text, MOOD.mood("anxious").cards[0].text);
  assert.equal(MOOD.cardAt("anxious", 5).text, MOOD.mood("anxious").cards[0].text);
  assert.equal(MOOD.isEvening(new Date(2026, 10, 27, 19, 59)), false);
  assert.equal(MOOD.isEvening(new Date(2026, 10, 27, 20, 0)), true);
});

test("the journey price follows the landing config and day 1 stays free", () => {
  assert.equal(JOURNEY.CHECKOUT_URL, "https://payhip.com/b/jCza7");
  assert.equal(JOURNEY.DAY1_VIDEO, "iWBourJ41kU");
  assert.equal(JOURNEY.DAYS.length, 21);
  assert.equal(JOURNEY.DAYS[0].free, true);
  assert.equal(JOURNEY.DAYS[0].title, "Meeting Your Breath");
  assert.equal(JOURNEY.DAYS[20].free, false);
  assert.match(JOURNEY.priceLine(Date.parse("2026-11-27T12:00:00Z")), /€24\.90/);
  assert.match(JOURNEY.priceLine(Date.parse("2026-11-27T12:00:00Z")), /30 November/);
  assert.match(JOURNEY.priceLine(Date.parse("2100-01-01T00:00:00Z")), /€49/);
  assert.equal(JOURNEY.isJourneyProduct([{ product_key: "jCza7" }]), true);
  assert.equal(JOURNEY.isJourneyProduct([{ product_name: "Breathe for Stress and Sleep" }]), true);
  assert.equal(JOURNEY.isJourneyProduct([{ product_key: "other" }]), false);
  assert.deepEqual(JOURNEY.stats([1, 2, 4]), { day: 3, streak: 1 });
  assert.deepEqual(JOURNEY.stats([1, 2, 3]), { day: 4, streak: 3 });
});

test("new Lab paths redirect and the build does not add My space", () => {
  assert.equal(SHARE.redirectTarget("/lab/breathing/gifts"), "/app/?lab=breathing&item=gifts");
  assert.equal(SHARE.redirectTarget("/lab/breathing/gifts/4-8-sleep"), "/app/?lab=breathing&item=gifts&gift=4-8-sleep");
  assert.equal(SHARE.redirectTarget("/lab/journey"), "/app/?lab=journey");
  assert.equal(SHARE.redirectTarget("/lab/journey/buddy/abc12345"), "/app/?lab=journey&buddy=abc12345");
  assert.equal(SHARE.redirectTarget("/lab/mood/anxious"), "/app/?lab=mood&feel=anxious");
  assert.equal(SHARE.redirectTarget("/lab/books/feel-to-heal"), "/app/?lab=books&item=feel-to-heal");
  const page = fs.readFileSync(path.join(__dirname, "../404.html"), "utf8");
  assert.match(page, /item=gifts/);
  assert.match(page, /lab=journey/);
  const plus = fs.readFileSync(path.join(__dirname, "lab-plus.js"), "utf8");
  assert.equal(/My space|Client space|recommend to client/i.test(plus), false);
  assert.match(plus, /class="ltile labJourney"/);
  assert.match(plus, /class="lcard"/);
  assert.match(plus, /class="card moodHome"/);
});
