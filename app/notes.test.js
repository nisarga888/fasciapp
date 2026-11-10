const test = require("node:test");
const assert = require("node:assert/strict");
const N = require("./notes.js");

test("a chip adds its prefix on a new line", () => {
  assert.equal(N.chipPrefix("", "Pain score: "), "Pain score: ");
  assert.equal(N.chipPrefix("Knees calmer", "Homework: "), "Knees calmer\nHomework: ");
  assert.equal(N.chipPrefix("Pain score: 2/10\n", "Breath: "), "Pain score: 2/10\nBreath: ");
});

test("notes show the two newest until the rest are opened", () => {
  const rows = [
    {session_date:"2026-11-04", created_at:"2026-11-04T10:00:00Z", body:"older"},
    {session_date:"2026-11-10", created_at:"2026-11-10T10:00:00Z", body:"newer"},
    {session_date:"2026-11-08", created_at:"2026-11-08T10:00:00Z", body:"mid"}
  ];
  assert.deepEqual(N.visibleNotes(rows, false).map(n=>n.body), ["newer","mid"]);
  assert.equal(N.visibleNotes(rows, true).length, 3);
  assert.match(N.noteTitle({session_date:"2026-11-10", session_label:"Session 2", training:"MER Grounding"}), /10 Nov 2026 · Session 2 · MER Grounding/);
});
