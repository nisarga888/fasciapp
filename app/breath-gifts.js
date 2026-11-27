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
  { slug: "4-6-calming", title: "4-6 Calming Breath", tag: "Quiet pause", timing: "4s in · 6s out · 4 rounds", length: "about 40s", use: "When you need a quiet pause to soften", path: NOSE, rounds: 4, phases: [[IN, 4000], [OUT, 6000]] },
  { slug: "box-4", title: "Box Breathing · 4-4-4-4", tag: "Busy mind", timing: "4s in / hold / out / hold · 3 rounds", length: "about 48s", use: "When your mind feels scattered or busy", path: NOSE, rounds: 3, phases: [[IN, 4000], ["Hold", 4000], [OUT, 4000], ["Hold", 4000]] },
  { slug: "4-7-8", title: "4-7-8 Breathing", tag: "Wind down", timing: "4s in · 7s hold · 8s out · 2 rounds", length: "about 38s", use: "When you’re winding down after a full day", path: MOUTH, rounds: 2, phases: [[IN, 4000], ["Hold", 7000], [OUT_MOUTH, 8000]] },
  { slug: "coherent-55", title: "Coherent Breathing · 3-3", tag: "Even calm", timing: "3s in · 3s out · 4 rounds", length: "about 24s", use: "When you want even, balanced calm", path: NOSE, rounds: 4, phases: [[IN, 3000], [OUT, 3000]] },
  { slug: "physiological-sigh", title: "Physiological Sigh", tag: "Release", timing: "2.5s in · 1.5s top-up · 6s out · 4 rounds", length: "about 40s", use: "When tension sits in the chest or shoulders", path: "In through the nose, sigh out through the mouth", rounds: 4, phases: [[IN, 2500], ["Top-up through the nose", 1500], [OUT_MOUTH, 6000]] },
  { slug: "4-8-sleep", title: "Extended Exhale · 4-8", tag: "Nightstand", timing: "4s in · 8s out · 4 rounds", length: "about 48s", use: "When you can’t sleep, at the nightstand", path: NOSE, rounds: 4, phases: [[IN, 4000], [OUT, 8000]] },
  { slug: "triangle-4", title: "Triangle Breathing · 4-4-4", tag: "Midday", timing: "4s in · 4s hold · 4s out · 4 rounds", length: "about 48s", use: "When you need a simple midday anchor", path: NOSE, rounds: 4, phases: [[IN, 4000], ["Hold", 4000], [OUT, 4000]] },
  { slug: "belly-5", title: "5-5 Belly Breathing", tag: "Belly", timing: "5s in · 5s out · 4 rounds", length: "about 40s", use: "When shoulders and ribs feel tight", path: NOSE, rounds: 4, phases: [[IN, 5000], [OUT, 5000]] },
  { slug: "4-2-6", title: "4-2-6 Calming Breath", tag: "Unwind", timing: "4s in · 2s hold · 6s out · 4 rounds", length: "about 48s", use: "When you want a gentle unwind", path: NOSE, rounds: 4, phases: [[IN, 4000], ["Hold", 2000], [OUT, 6000]] },
  { slug: "gentle-2-4", title: "2-4 Gentle Breath", tag: "Gentle", timing: "2s in · 4s out · 7 rounds", length: "about 42s", use: "When a deep breath feels like too much", path: NOSE, rounds: 7, phases: [[IN, 2000], [OUT, 4000]] },
  { slug: "alternate-nostril", title: "Alternate Nostril · 4-4", tag: "Settle", timing: "4s left · 4s right · about 56s", length: "about 56s", use: "When you want to settle and find focus", path: NOSE, rounds: 7, phases: [["Through the left nostril", 4000], ["Through the right nostril", 4000]] },
  { slug: "grounding-3", title: "3-3 Grounding Breath", tag: "Ground", timing: "3s in · 3s out · 7 rounds", length: "about 42s", use: "Between meetings, to come back to your body", path: NOSE, rounds: 7, phases: [[IN, 3000], [OUT, 3000]] }
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
function wave(d){
  return '<path class="giftWave" d="' + d + '" fill="none" stroke="#5FC9C3" stroke-width="3" stroke-linecap="round"/>';
}
function orb(cx, cy, r, fill, kind){
  const k = kind ? ' data-pulse="' + kind + '"' : " data-pulse";
  return '<g' + k + '><circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 16) + '" fill="' + fill + '" opacity=".22"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"/></g>';
}
function motif(slug){
  const tone = slug === "4-7-8" ? " tone-purple" : slug === "gentle-2-4" ? " tone-pale" : /box-4|4-2-6|triangle/.test(slug) ? " tone-gold" : "";
  let inner = orb(160, 100, 34, "#5FC9C3");
  if (slug === "4-6-calming") inner = wave("M8 148C52 108 78 188 128 148s62-44 100 0 58 40 84 0") + orb(108, 92, 26, "#5FC9C3");
  else if (slug === "box-4") inner = '<rect x="104" y="44" width="112" height="112" rx="10" fill="none" stroke="#C99E67" stroke-width="2.5"/>' + orb(160, 100, 9, "#C99E67");
  else if (slug === "4-7-8") inner = '<g data-pulse><circle cx="160" cy="100" r="22" fill="none" stroke="#9C8FD6" stroke-width="3"/><circle cx="160" cy="100" r="40" fill="none" stroke="#9C8FD6" stroke-width="2.2" opacity=".75"/><circle cx="160" cy="100" r="58" fill="none" stroke="#9C8FD6" stroke-width="1.6" opacity=".45"/></g>';
  else if (slug === "coherent-55") inner = '<circle cx="160" cy="100" r="62" fill="none" stroke="#C99E67" stroke-width="1.6" opacity=".85"/>' + orb(160, 100, 34, "#5FC9C3");
  else if (slug === "physiological-sigh") inner = wave("M16 156C70 126 110 176 168 146s70-20 130 8") + orb(132, 92, 28, "#5FC9C3") + orb(184, 78, 16, "#B7F3EE", "top");
  else if (slug === "4-8-sleep") inner = '<path d="M78 128C110 62 210 62 242 128" fill="none" stroke="#C99E67" stroke-width="2.5" stroke-linecap="round"/>' + orb(160, 118, 28, "#9FE0DA");
  else if (slug === "triangle-4") inner = '<polygon points="160,36 252,164 68,164" fill="none" stroke="#C99E67" stroke-width="2.5" stroke-linejoin="round"/>' + orb(160, 118, 12, "#5FC9C3");
  else if (slug === "belly-5") inner = '<g data-pulse><ellipse cx="160" cy="100" rx="86" ry="38" fill="#5FC9C333"/><ellipse cx="160" cy="100" rx="70" ry="30" fill="#5FC9C3"/></g>';
  else if (slug === "4-2-6") inner = wave("M12 132C48 96 78 168 118 132s52-40 84 0 48 36 90 4") + orb(176, 104, 8, "#C99E67");
  else if (slug === "gentle-2-4") inner = orb(160, 100, 14, "#E7F7F5");
  else if (slug === "alternate-nostril") inner = orb(112, 100, 26, "#5FC9C3", "left") + orb(208, 100, 26, "#C99E67", "right");
  else if (slug === "grounding-3") inner = '<line x1="36" y1="156" x2="284" y2="156" stroke="#C99E67" stroke-width="2" stroke-linecap="round"/>' + orb(160, 112, 28, "#5FC9C3");
  return '<svg class="giftMotif' + tone + '" viewBox="0 0 320 200" data-motif="' + slug + '" aria-hidden="true">' + inner + "</svg>";
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
    + '<div class="giftPlayerArt" id="giftStage"><span class="breathUseTag">' + esc(g.tag) + "</span>" + motif(g.slug) + "</div>"
    + '<p class="plusEyebrow">' + esc(note) + "</p>"
    + '<h2 class="plusH">' + esc(g.title) + "</h2>"
    + '<p class="plusLine">' + esc(g.timing) + "</p>"
    + '<p class="plusPath">' + esc(g.path) + "</p>"
    + '<p class="plusUse">' + esc(g.use) + "</p>"
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
function pulseTarget(kind, phase, from){
  const n = String(phase || "").toLowerCase();
  if (kind === "left") return /left/.test(n) ? 1.18 : 0.8;
  if (kind === "right") return /right/.test(n) ? 1.18 : 0.8;
  if (kind === "top") return /top-up/.test(n) ? 1.32 : 0.82;
  return phaseTarget(phase, from);
}
function start(g){
  if (!root) return;
  running = true;
  if (raf) cancelAnimationFrame(raf);
  const stage = root.querySelector("#giftStage");
  const parts = stage ? [...stage.querySelectorAll("[data-pulse]")] : [];
  const state = parts.map(el => ({ el, from: 1, to: 1 }));
  const phaseEl = root.querySelector("#giftPhase");
  const roundEl = root.querySelector("#giftRound");
  const begin = root.querySelector("#giftBegin");
  if (begin) begin.hidden = true;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let round = 0, step = 0, phaseStart = 0;
  const beginPhase = now => {
    const ph = g.phases[step];
    state.forEach(s => {
      s.from = s.to;
      s.to = pulseTarget(s.el.getAttribute("data-pulse") || "", ph[0], s.from);
    });
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
    const e = reduce ? (t >= 1 ? 1 : 0) : easeInOut(t);
    state.forEach(s => {
      const scale = s.from + (s.to - s.from) * e;
      s.el.style.transform = "scale(" + scale.toFixed(4) + ")";
      if (t >= 1) s.to = scale;
    });
    if (t >= 1) {
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
    + '<p class="plusEyebrow">A breath gift for you</p><h2 class="plusH">' + esc(p.title) + '</h2><p class="plusUse">' + esc(p.line) + '</p><div class="giftGrid">' + cards + "</div>",
    p.title
  );
  root.querySelectorAll("[data-gift]").forEach(b => b.addEventListener("click", () => open(b.getAttribute("data-gift"))));
  return p;
}
function cardHtml(g){
  return '<button type="button" class="giftCard" data-gift="' + esc(g.slug) + '" data-lab-id="breathing/gifts/' + esc(g.slug) + '">'
    + '<span class="giftArt">' + motif(g.slug) + '<span class="breathUseTag">' + esc(g.tag) + "</span></span>"
    + "<b>" + esc(g.title) + "</b><small>" + esc(g.timing) + "</small><small>" + esc(g.path) + "</small></button>";
}
return { GIFTS, PACKS, bySlug, pack, giftFrom, giftUrl, giftNote, totalMs, phaseTarget, easeInOut, cardHtml, open, openPack, close };
});
