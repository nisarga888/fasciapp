/* Twelve short Breath Gifts. All free. Separate from the longer Lab practices. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_GIFTS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const NOSE = "Breathe through the nose";
const MOUTH = "In through the nose, out through the mouth";
const IN = "In through the nose";
const OUT = "Out through the nose";
const OUT_MOUTH = "Out through the mouth";
const GIFTS = [
  { slug: "4-6-calming", title: "4-6 Calming Breath", timing: "4s in · 6s out · 4 rounds", length: "about 40s", use: "When you need a quiet pause to soften", path: NOSE, rounds: 4, phases: [[IN, 4000], [OUT, 6000]] },
  { slug: "box-4", title: "Box Breathing · 4-4-4-4", timing: "4s in / hold / out / hold · 3 rounds", length: "about 48s", use: "When your mind feels scattered or busy", path: NOSE, rounds: 3, phases: [[IN, 4000], ["Hold", 4000], [OUT, 4000], ["Hold", 4000]] },
  { slug: "4-7-8", title: "4-7-8 Breathing", timing: "4s in · 7s hold · 8s out · 2 rounds", length: "about 38s", use: "When you’re winding down after a full day", path: MOUTH, rounds: 2, phases: [[IN, 4000], ["Hold", 7000], [OUT_MOUTH, 8000]] },
  { slug: "coherent-55", title: "Coherent Breathing · 3-3", timing: "3s in · 3s out · 4 rounds", length: "about 24s", use: "When you want even, balanced calm", path: NOSE, rounds: 4, phases: [[IN, 3000], [OUT, 3000]] },
  { slug: "physiological-sigh", title: "Physiological Sigh", timing: "2.5s in · 1.5s top-up · 6s out · 4 rounds", length: "about 40s", use: "When tension sits in the chest or shoulders", path: "In through the nose, sigh out through the mouth", rounds: 4, phases: [[IN, 2500], ["Top-up through the nose", 1500], [OUT_MOUTH, 6000]] },
  { slug: "4-8-sleep", title: "Extended Exhale · 4-8", timing: "4s in · 8s out · 4 rounds", length: "about 48s", use: "When you can’t sleep, at the nightstand", path: NOSE, rounds: 4, phases: [[IN, 4000], [OUT, 8000]] },
  { slug: "triangle-4", title: "Triangle Breathing · 4-4-4", timing: "4s in · 4s hold · 4s out · 4 rounds", length: "about 48s", use: "When you need a simple midday anchor", path: NOSE, rounds: 4, phases: [[IN, 4000], ["Hold", 4000], [OUT, 4000]] },
  { slug: "belly-5", title: "5-5 Belly Breathing", timing: "5s in · 5s out · 4 rounds", length: "about 40s", use: "When shoulders and ribs feel tight", path: NOSE, rounds: 4, phases: [[IN, 5000], [OUT, 5000]] },
  { slug: "4-2-6", title: "4-2-6 Calming Breath", timing: "4s in · 2s hold · 6s out · 4 rounds", length: "about 48s", use: "When you want a gentle unwind", path: NOSE, rounds: 4, phases: [[IN, 4000], ["Hold", 2000], [OUT, 6000]] },
  { slug: "gentle-2-4", title: "2-4 Gentle Breath", timing: "2s in · 4s out · 7 rounds", length: "about 42s", use: "When a deep breath feels like too much", path: NOSE, rounds: 7, phases: [[IN, 2000], [OUT, 4000]] },
  { slug: "alternate-nostril", title: "Alternate Nostril · 4-4", timing: "4s left · 4s right · about 56s", length: "about 56s", use: "When you want to settle and find focus", path: NOSE, rounds: 7, phases: [["Through the left nostril", 4000], ["Through the right nostril", 4000]] },
  { slug: "grounding-3", title: "3-3 Grounding Breath", timing: "3s in · 3s out · 7 rounds", length: "about 42s", use: "Between meetings, to come back to your body", path: NOSE, rounds: 7, phases: [[IN, 3000], [OUT, 3000]] }
];
const PACKS = {
  "pack-restless-evening": {
    slug: "pack-restless-evening",
    title: "A restless evening",
    line: "Three short breaths for the nightstand.",
    gifts: ["4-8-sleep", "4-7-8", "coherent-55"]
  }
};
function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function bySlug(slug){ return GIFTS.find(g => g.slug === slug) || null; }
function pack(slug){ return PACKS[slug] || null; }
function giftFrom(label){
  const raw = String(label || "");
  if (/@|\d{3,}|https?:/i.test(raw)) return "";
  const s = raw.replace(/[^\p{L}\p{M} .'’-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!s) return "";
  return s;
}
function giftUrl(slug, from){
  let u = "https://fasciapp.app/lab/breathing/gifts/" + slug;
  const name = giftFrom(from);
  if (name) u += "?from=" + encodeURIComponent(name);
  return u;
}
function giftNote(from){
  const name = giftFrom(from);
  return name ? "A breath gift from " + name : "A breath gift for you";
}
function totalMs(g){
  const one = g.phases.reduce((n, p) => n + p[1], 0);
  return one * g.rounds;
}
let root = null, raf = 0, running = false;
function close(){
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (root) { root.remove(); root = null; }
}
function easeInOut(t){ return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function phaseTarget(name, from){
  const n = String(name || "").toLowerCase();
  if (n === "hold" || n.indexOf("hold") === 0) return from;
  if (/mouth|right nostril/.test(n) || n.indexOf("out through") === 0) return 0.72;
  if (n.indexOf("top-up") === 0) return 1.32;
  return 1.18;
}
function shell(inner, label){
  close();
  root = document.createElement("div");
  root.className = "ptPop";
  root.innerHTML = '<div class="ptPopDim" data-plus-x></div><div class="ptPopBox" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + inner + "</div>";
  document.body.appendChild(root);
  root.addEventListener("click", e => { if (e.target.closest("[data-plus-x]")) close(); });
}
function open(slug, opts){
  opts = opts || {};
  const g = bySlug(slug);
  if (!g || typeof document === "undefined") return null;
  const note = giftNote(opts.from);
  shell(
    '<div class="plusTop"><button type="button" class="plusX" data-plus-x aria-label="Close">✕</button></div>'
    + '<p class="plusEyebrow">' + esc(note) + "</p>"
    + '<h2 class="plusH">' + esc(g.title) + "</h2>"
    + '<p class="plusLine">' + esc(g.timing) + "</p>"
    + '<p class="plusPath">' + esc(g.path) + "</p>"
    + '<p class="plusUse">' + esc(g.use) + "</p>"
    + '<div class="giftStage" aria-hidden="true"><div class="giftGlow" id="giftGlow"></div><div class="giftBall" id="giftBall"></div></div>'
    + '<p class="giftPhase" id="giftPhase">Ready when you are</p>'
    + '<p class="giftRound" id="giftRound"></p>'
    + '<button type="button" class="gold big1" id="giftBegin">Begin</button>'
    + '<button type="button" class="outline big1" id="giftShare">Gift this breath</button>',
    g.title
  );
  const begin = root.querySelector("#giftBegin");
  const share = root.querySelector("#giftShare");
  begin.onclick = () => start(g);
  share.onclick = () => { if (window.faGiftShare) window.faGiftShare(g); };
  return g;
}
function paintScale(ball, glow, scale){
  const t = "translateZ(0) scale(" + scale.toFixed(4) + ")";
  if (ball) ball.style.transform = t;
  if (glow) {
    glow.style.transform = t;
    glow.style.opacity = String(Math.max(0.2, Math.min(1, (scale - 0.72) / 0.6)));
  }
}
function start(g){
  if (!root) return;
  running = true;
  if (raf) cancelAnimationFrame(raf);
  const ball = root.querySelector("#giftBall");
  const glow = root.querySelector("#giftGlow");
  const phaseEl = root.querySelector("#giftPhase");
  const roundEl = root.querySelector("#giftRound");
  const begin = root.querySelector("#giftBegin");
  if (begin) begin.hidden = true;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let round = 0, step = 0, from = 0.72, to = 0.72, phaseStart = 0;
  const beginPhase = now => {
    const ph = g.phases[step];
    from = to;
    to = phaseTarget(ph[0], from);
    phaseStart = now;
    if (phaseEl) phaseEl.textContent = ph[0];
    if (roundEl) roundEl.textContent = "Round " + (round + 1) + " of " + g.rounds;
  };
  const finish = () => {
    running = false;
    raf = 0;
    if (phaseEl) phaseEl.textContent = "That’s the practice";
    if (roundEl) roundEl.textContent = "";
    if (begin) { begin.hidden = false; begin.textContent = "Begin again"; }
  };
  const frame = now => {
    if (!running || !root) return;
    if (!phaseStart) beginPhase(now);
    const dur = g.phases[step][1];
    const t = Math.min(1, (now - phaseStart) / dur);
    const scale = from + (to - from) * (reduce ? (t >= 1 ? 1 : 0) : easeInOut(t));
    paintScale(ball, glow, scale);
    if (t >= 1) {
      to = scale;
      step += 1;
      if (step >= g.phases.length) { step = 0; round += 1; }
      if (round >= g.rounds) { finish(); return; }
      beginPhase(now);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
function openPack(slug){
  const p = pack(slug);
  if (!p || typeof document === "undefined") return null;
  const cards = p.gifts.map(id => {
    const g = bySlug(id);
    return g ? cardHtml(g) : "";
  }).join("");
  shell(
    '<div class="ptPopTop"><button type="button" class="ptPopX" data-plus-x aria-label="Close">✕</button></div>'
    + '<p class="plusEyebrow">A breath gift for you</p><h2 class="plusH">' + esc(p.title) + '</h2><p class="plusUse">' + esc(p.line) + '</p><div class="lgrid">' + cards + "</div>",
    p.title
  );
  root.querySelectorAll("[data-gift]").forEach(b => b.addEventListener("click", () => open(b.getAttribute("data-gift"))));
  return p;
}
function cardHtml(g){
  return '<button type="button" class="lcard giftCard" data-gift="' + esc(g.slug) + '" data-lab-id="breathing/gifts/' + esc(g.slug) + '">'
    + '<div class="lthumb"><span class="giftThumb" aria-hidden="true"></span></div>'
    + '<div class="lbody"><span class="ltag free">Free</span><b>' + esc(g.title) + "</b><small>" + esc(g.timing) + "</small><small class=\"muted\">" + esc(g.path) + "</small><small class=\"muted\">" + esc(g.use) + "</small></div></button>";
}
return { GIFTS, PACKS, bySlug, pack, giftFrom, giftUrl, giftNote, totalMs, phaseTarget, easeInOut, cardHtml, open, openPack, close };
});
