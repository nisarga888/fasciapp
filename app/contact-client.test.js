const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const C = require("./contact-client.js");

test("contact templates name the session and WhatsApp stays on this device", () => {
  assert.equal(C.CAP, 20);
  assert.equal(C.TEMPLATES.length, 4);
  const text = C.fill("reminder", { name: "Anna", date: "2026-11-27", time: "10:00", zone: "Warsaw time" });
  assert.match(text, /Anna/);
  assert.match(text, /10:00/);
  assert.match(text, /Warsaw time/);
  assert.match(C.fill("reschedule", { name: "Anna", date: "2026-11-27", time: "10:00", zone: "UTC" }), /move our session/);
  assert.equal(C.waLink("+48 600 000 000", "Hello Anna"), "https://wa.me/48600000000?text=" + encodeURIComponent("Hello Anna"));
  assert.equal(C.waLink("123", "Hi"), "");
  assert.match(C.mailto("a@b.c", "Reminder", "Hello"), /^mailto:/);
  assert.match(C.lastLine({ last_contacted_at: "2026-11-27T10:00:00Z", last_contacted_channel: "whatsapp" }), /WhatsApp/);
  assert.equal(C.lastLine({}), "");
  const fn = fs.readFileSync(path.join(__dirname, "../supabase/functions/contact-client/index.ts"), "utf8");
  assert.match(fn, /hello@fasciapp\.app/);
  assert.match(fn, /via FasciApp/);
  assert.match(fn, /replyTo/);
  assert.match(fn, /CAP = 20/);
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261127170000_notes_and_contact.sql"), "utf8");
  assert.match(sql, /fa_client_has_account/);
  assert.match(sql, /returns boolean/);
  assert.match(sql, /grant update on table public.mood_notes/);
  assert.match(sql, /last_contacted_at/);
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  assert.match(app, /t:"Breath Gifts"/);
  assert.equal(app.includes('t:"Breathing"'), false);
});
