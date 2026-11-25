const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("./share.js");

test("slugs are lowercase, hyphenated, and without diacritics", () => {
  assert.equal(S.slugify("Aisha Archer"), "aisha-archer");
  assert.equal(S.slugify("Aisha Archer Alchemical Flow"), "aisha-archer-alchemical-flow");
  assert.equal(S.slugify("José Muñoz"), "jose-munoz");
  assert.equal(S.slugify("Łódź"), "lodz");
  assert.equal(S.slugify("François Müller"), "francois-muller");
  assert.equal(S.slugify("Anna   Nowak"), "anna-nowak");
  assert.equal(S.slugify("   "), "");
});

test("clashing names take the city, then a number, and skip site paths", () => {
  const taken = new Set();
  const a = S.allocSlug("Anna Nowak", "Warsaw", taken); taken.add(a);
  const b = S.allocSlug("Anna Nowak", "Kraków", taken); taken.add(b);
  const c = S.allocSlug("Anna Nowak", "Warsaw", taken);
  assert.equal(a, "anna-nowak");
  assert.equal(b, "anna-nowak-krakow");
  assert.equal(c, "anna-nowak-warsaw");
  assert.equal(S.allocSlug("Anna Nowak", "Warsaw", new Set([a, b, c])), "anna-nowak-warsaw-2");
  const bare = new Set();
  const first = S.allocSlug("Anna Nowak", "", bare); bare.add(first);
  assert.equal(first, "anna-nowak");
  assert.equal(S.allocSlug("Anna Nowak", "", bare), "anna-nowak-2");
  assert.equal(S.allocSlug("App", "", new Set()), "app-2");
  assert.equal(S.allocSlug("Privacy", "Oslo", new Set()), "privacy-oslo");
  assert.equal(S.allocSlug("Aisha Archer", "Warsaw", new Set(["aisha-archer"])), "aisha-archer-warsaw");
});

test("only a single public slug redirects, and existing site paths do not", () => {
  assert.equal(S.redirectTarget("/aisha-archer"), "/app/?p=aisha-archer");
  assert.equal(S.redirectTarget("/Aisha-Archer/"), "/app/?p=aisha-archer");
  assert.equal(S.redirectTarget("/app/foo"), null);
  assert.equal(S.redirectTarget("/privacy"), null);
  assert.equal(S.redirectTarget("/privacy.html"), null);
  assert.equal(S.redirectTarget("/scan"), null);
  assert.equal(S.redirectTarget("/"), null);
  assert.equal(S.isProfileSlug("a0693407-f3d4-4348-b19d-7115e1bd9688"), false);
  for (const name of S.RESERVED) assert.equal(S.isProfileSlug(name), false, name);
  const page = fs.readFileSync(path.join(__dirname, "../404.html"), "utf8");
  assert.match(page, /location\.replace\("\/app\/\?p="/);
  for (const name of S.RESERVED) assert.match(page, new RegExp('"' + name + '":1'));
});

test("share links use the public slug and the direct channels", () => {
  assert.equal(S.profileUrl("aisha-archer"), "https://fasciapp.app/aisha-archer");
  assert.equal(S.profileLabel("aisha-archer"), "fasciapp.app/aisha-archer");
  const t = S.shareTargets("https://fasciapp.app/aisha-archer", "Aisha Archer");
  assert.match(t.whatsapp, /^https:\/\/wa\.me\/\?text=/);
  assert.match(t.facebook, /facebook\.com\/sharer\/sharer\.php\?u=/);
  assert.match(t.telegram, /^https:\/\/t\.me\/share\/url\?url=/);
  assert.match(t.email, /^mailto:\?subject=/);
  assert.equal(t.instagram, "https://www.instagram.com/");
  const sheet = S.shareSheetHtml({label: "fasciapp.app/aisha-archer", native: true});
  assert.match(sheet, /Share this profile/);
  assert.match(sheet, /fasciapp\.app\/aisha-archer/);
  assert.match(sheet, /data-chan="whatsapp"/);
  assert.match(sheet, /data-chan="instagram"/);
  assert.match(sheet, /data-chan="facebook"/);
  assert.match(sheet, /data-chan="telegram"/);
  assert.match(sheet, /data-chan="email"/);
  assert.match(sheet, /data-native/);
});

test("reviewers are first name and last initial, with a relative date", () => {
  assert.equal(S.publicName("Maya Chen"), "Maya C.");
  assert.equal(S.publicName("Aisha"), "Aisha");
  assert.equal(S.publicName("aisha archer alchemical flow"), "Aisha F.");
  assert.equal(S.publicName("José Muñoz"), "José M.");
  assert.equal(S.publicName(""), "Member");
  const now = new Date("2026-11-25T12:00:00Z");
  assert.equal(S.relativeDate("2024-11-25T12:00:00Z", now), "2 years ago");
  assert.equal(S.relativeDate("2026-09-25T12:00:00Z", now), "2 months ago");
  assert.equal(S.formatAvg(4.76), "4.8");
  assert.equal(S.formatAvg(5), "5");
});

test("the profile shows stars, a report button, and no rate button on your own listing", () => {
  const row = S.ratingRowHtml({avg: 4.8, count: 12, own: false, mine: false});
  assert.match(row, /4\.8 · 12 reviews/);
  assert.match(row, /data-rate/);
  assert.match(row, /Rate your session/);
  assert.equal(S.ratingRowHtml({avg: 5, count: 1, own: true}).includes("data-rate"), false);
  const html = S.reviewsSectionHtml({
    reviews: [{id: "r1", name: "Maya C.", stars: 5, body: "Gentle, <clear>", created_at: "2024-11-25T12:00:00Z", hidden: false, mine: false}],
    mine: null
  }, {signedIn: false, admin: false, now: new Date("2026-11-25T12:00:00Z")});
  assert.match(html, /Session reviews/);
  assert.match(html, /Maya C\./);
  assert.match(html, /2 years ago/);
  assert.match(html, /data-report="r1"/);
  assert.match(html, /Gentle, &lt;clear&gt;/);
  assert.equal(html.includes("<clear>"), false);
  const hidden = S.reviewsSectionHtml({
    reviews: [{id: "r2", name: "Elena S.", stars: 4, body: "", created_at: "2026-09-25T12:00:00Z", hidden: true, mine: false}]
  }, {signedIn: true, admin: true, now: new Date("2026-11-25T12:00:00Z")});
  assert.match(hidden, /data-restore="r2"/);
  assert.match(hidden, /Hidden/);
  const form = S.rateSheetHtml({name: "Aisha Archer", stars: 5, body: "Left with more space", signedIn: false});
  assert.match(form, /Rate your session/);
  assert.match(form, /with Aisha Archer/);
  assert.match(form, /5 out of 5/);
  assert.match(form, /20\/200/);
  assert.match(form, /maxlength="200"/);
  assert.match(form, /Post review/);
});

test("the app opens a public slug, keeps share and reviews off the main list, and bumps the release", () => {
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const data = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  const cal = fs.readFileSync(path.join(__dirname, "cal.js"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.match(app, /faOpenSlug/);
  assert.match(app, /x\.consent!==false&&!x\.admin_hidden/);
  assert.match(app, /data-share/);
  assert.match(app, /fa_profile_reviews|reviewBundle/);
  assert.match(data, /fa_list_v3_/);
  assert.match(data, /base\+",slug"/);
  assert.match(data, /rpc\("fa_profile_reviews"/);
  assert.equal(/from\("practitioner_reviews"\)\.select\("\*"\)/.test(data), false);
  const build = cal.match(/const BUILD="([^"]+)"/);
  const ver = sw.match(/const VERSION="fasciapp-v([^"]+)"/);
  assert.equal(build[1], ver[1]);
  assert.equal(ver[1], "0.23.258");
  assert.match(index, /share\.js\?v=0\.23\.258/);
  assert.match(index, /learn\.js\?v=0\.23\.258/);
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261125190000_profile_slugs_and_reviews.sql"), "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /review_reports_admin_select/);
  assert.match(sql, /You cannot rate your own profile/);
  assert.match(sql, /old\.slug/);
  assert.match(sql, /hidden = false/);
});
