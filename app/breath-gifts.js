/* Twelve short Breath Gifts. All free. Separate from the longer Lab practices. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_GIFTS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const GIFTS = [
  { slug: "4-6-calming", title: "4-6 Calming Breath", timing: "4s in · 6s out · 4 rounds", length: "about 40s", use: "When you need a quiet pause to soften", rounds: 4, phases: [["Inhale", 4000], ["Exhale", 6000]] },
  { slug: "box-4", title: "Box Breathing · 4-4-4-4", timing: "4s in / hold / out / hold · 3 rounds", length: "about 48s", use: "When your mind feels scattered or busy", rounds: 3, phases: [["Inhale", 4000], ["Hold", 4000], ["Exhale", 4000], ["Hold", 4000]] },
  { slug: "4-7-8", title: "4-7-8 Breathing", timing: "4s in · 7s hold · 8s out · 2 rounds", length: "about 38s", use: "When you’re winding down after a full day", rounds: 2, phases: [["Inhale", 4000], ["Hold", 7000], ["Exhale", 8000]] },
  { slug: "coherent-55", title: "Coherent Breathing · 5.5-5.5", timing: "5.5s in · 5.5s out · 4 rounds", length: "about 44s", use: "When you want even, balanced calm", rounds: 4, phases: [["Inhale", 5500], ["Exhale", 5500]] },
  { slug: "physiological-sigh", title: "Physiological Sigh", timing: "2.5s in · 1.5s top-up · 6s out · 4 rounds", length: "about 40s", use: "When tension sits in the chest or shoulders", rounds: 4, phases: [["Inhale", 2500], ["Top-up inhale", 1500], ["Long exhale", 6000]] },
  { slug: "4-8-sleep", title: "Extended Exhale · 4-8", timing: "4s in · 8s out · 4 rounds", length: "about 48s", use: "When you can’t sleep, at the nightstand", rounds: 4, phases: [["Inhale", 4000], ["Exhale", 8000]] },
  { slug: "triangle-4", title: "Triangle Breathing · 4-4-4", timing: "4s in · 4s hold · 4s out · 4 rounds", length: "about 48s", use: "When you need a simple midday anchor", rounds: 4, phases: [["Inhale", 4000], ["Hold", 4000], ["Exhale", 4000]] },
  { slug: "belly-5", title: "5-5 Belly Breathing", timing: "5s in · 5s out · 4 rounds", length: "about 40s", use: "When shoulders and ribs feel tight", rounds: 4, phases: [["Inhale", 5000], ["Exhale", 5000]] },
  { slug: "4-2-6", title: "4-2-6 Calming Breath", timing: "4s in · 2s hold · 6s out · 4 rounds", length: "about 48s", use: "When you want a gentle unwind", rounds: 4, phases: [["Inhale", 4000], ["Hold", 2000], ["Exhale", 6000]] },
  { slug: "gentle-2-4", title: "2-4 Gentle Breath", timing: "2s in · 4s out · 7 rounds", length: "about 42s", use: "When a deep breath feels like too much", rounds: 7, phases: [["Inhale", 2000], ["Exhale", 4000]] },
  { slug: "alternate-nostril", title: "Alternate Nostril · 4-4", timing: "4s left · 4s right · about 56s", length: "about 56s", use: "When you want to settle and find focus", rounds: 7, phases: [["Left side", 4000], ["Right side", 4000]] },
  { slug: "grounding-3", title: "3-3 Grounding Breath", timing: "3s in · 3s out · 7 rounds", length: "about 42s", use: "Between meetings, to come back to your body", rounds: 7, phases: [["Inhale", 3000], ["Exhale", 3000]] }
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
let root = null, timer = 0, running = false;
function close(){
  running = false;
  clearInterval(timer);
  if (root) { root.remove(); root = null; }
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
    + '<p class="plusUse">' + esc(g.use) + "</p>"
    + '<div class="giftBall" id="giftBall" aria-hidden="true"></div>'
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
function start(g){
  if (!root) return;
  running = true;
  const ball = root.querySelector("#giftBall");
  const phaseEl = root.querySelector("#giftPhase");
  const roundEl = root.querySelector("#giftRound");
  const begin = root.querySelector("#giftBegin");
  if (begin) begin.hidden = true;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let round = 0, step = 0;
  const tick = () => {
    if (!running || !root) return;
    if (round >= g.rounds) {
      phaseEl.textContent = "That’s the practice";
      roundEl.textContent = "";
      if (ball) ball.style.transform = "";
      if (begin) { begin.hidden = false; begin.textContent = "Begin again"; }
      running = false;
      return;
    }
    const ph = g.phases[step];
    phaseEl.textContent = ph[0];
    roundEl.textContent = "Round " + (round + 1) + " of " + g.rounds;
    if (ball && !reduce) {
      const inhale = /inhale|left/i.test(ph[0]);
      ball.style.transform = inhale ? "scale(1.18)" : "scale(0.82)";
    }
    timer = setTimeout(() => {
      step += 1;
      if (step >= g.phases.length) { step = 0; round += 1; }
      tick();
    }, ph[1]);
  };
  tick();
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
    + '<div class="lbody"><span class="ltag free">Free</span><b>' + esc(g.title) + "</b><small>" + esc(g.timing) + "</small><small class=\"muted\">" + esc(g.use) + "</small></div></button>";
}
return { GIFTS, PACKS, bySlug, pack, giftFrom, giftUrl, giftNote, totalMs, cardHtml, open, openPack, close };
});
