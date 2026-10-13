// FasciApp Breathing practices (Lab) — Coherent, Longer exhale, Box.
// Copy lightly paraphrased from Breathe for Stress and Sleep (Nisarga Eryk Dobosz).
(function () {
  const TOTAL_MS = 5 * 60 * 1000;
  const SAFE = "Stop if you feel dizzy or unwell. Breathe comfortably — never force the breath.";

  // Timing from the manual (Breathe_for_Stress_and_Sleep_Programme.txt):
  // Coherent Day 9: 6 in / 6 out. Longer exhale Day 6: 4 in / 6 out (not 4/4).
  // Box: not in the programme; equal 4-count holds as requested (Day 8 starts with 4/4 equal rhythm).
  const PRACTICES = {
    coherent: {
      id: "coherent",
      title: "Coherent breathing",
      tag: "For sleep",
      line: "6 seconds in · 6 seconds out · 5 minutes",
      phases: [
        { name: "Inhale through the nose", ms: 6000, kind: "in" },
        { name: "Exhale through the nose", ms: 6000, kind: "out" }
      ],
      viz: "ball",
      desc: "Coherent breathing means breathing in and out at a steady, even, slow pace: about six seconds in and six seconds out, around five or six breaths a minute. Breathe in and out through the nose, softly and low into the belly. Research on slow breathing (often around six breaths a minute) suggests it can increase heart rate variability (HRV), which is often used as a sign of how flexibly the nervous system adapts. Many people find the even rhythm steadying when stress makes the mind feel scattered.",
      why: [
        "Slow breathing around six breaths a minute is linked with higher heart rate variability (HRV), a sign of a more flexible, adaptable nervous system.",
        "An even inhale and exhale can feel steadying when the mind is racing.",
        "Soft, quiet and low is enough — a slow breath is not a big breath."
      ]
    },
    longer: {
      id: "longer",
      title: "Longer exhale",
      tag: "For stress",
      line: "In 4 · out 6 · 5 minutes",
      phases: [
        { name: "Inhale through the nose", ms: 4000, kind: "in" },
        { name: "Exhale through the nose", ms: 6000, kind: "out" }
      ],
      viz: "wave",
      desc: "It is known that the heart speeds up slightly on the in-breath and slows slightly on the out-breath. Research suggests that making the exhale longer than the inhale activates the calming parasympathetic response, which can help ease stress. Inhale through the nose for 4, exhale through the nose for 6, smooth and unhurried. It needs no special setup, so it can be used before a meeting, in a queue, before a difficult conversation or at bedtime.",
      why: [
        "A longer exhale works with the natural slowing of the heart on the out-breath (respiratory sinus arrhythmia).",
        "It is a simple place to start when life speeds up — no special setup needed.",
        "If 4 and 6 feels strained, try 3 and 5; comfort matters more than the numbers."
      ]
    },
    box: {
      id: "box",
      title: "Box breathing",
      tag: "For energy",
      line: "In 4 · hold 4 · out 4 · hold 4 · 5 minutes",
      phases: [
        { name: "Inhale through the nose", ms: 4000, kind: "in" },
        { name: "Hold", ms: 4000, kind: "hold" },
        { name: "Exhale through the nose", ms: 4000, kind: "out" },
        { name: "Hold", ms: 4000, kind: "hold" }
      ],
      viz: "box",
      // Programme has no box-with-holds page; equal 4-count echoes Day 8's gentle 4/4 start.
      desc: "Box breathing follows an even 4-4-4-4 rhythm, like tracing a square: inhale through the nose, soft hold, exhale through the nose, soft hold, each for a count of four. Research suggests that a steady, structured rhythm like this supports alertness, focus and steady energy, and it is known to be used by people who need to stay clear-headed under pressure. The holds are quiet pauses, not a strain; if a hold feels tight, shorten it or return to an easy nasal breath.",
      why: [
        "Equal counts give the busy mind a simple pattern to follow.",
        "Short, soft holds can create a brief pause between effort and release.",
        "Stay soft and nasal where you can; never force or push the breath."
      ]
    }
  };
  const ORDER = ["coherent", "longer", "box"];

  let root = null, raf = 0, running = false, startedAt = 0, elapsedBefore = 0, reduce = false;
  let currentId = null, soundOn = false, audio = null;

  function prefersReduce() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  /* ——— Web Audio pad (original, royalty-free). Louder but still soft; starts on Start tap. ——— */
  function ensureAudio() {
    if (audio) return audio;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    // limiter: keeps the louder pad from clipping (measured ~-14 LUFS, peak ~-2.3 dBFS)
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.25;
    master.connect(lim); lim.connect(ctx.destination);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.6;
    filter.connect(master);
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.5;
    voiceGain.connect(filter);
    const freqs = [98, 146.83, 196, 293.66]; // G2 E3 G3 D4 — soft pad
    const oscs = [];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 5;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : i === 1 ? 0.35 : i === 2 ? 0.28 : 0.18;
      o.connect(g); g.connect(voiceGain); o.start();
      oscs.push(o);
    });
    audio = { ctx, master, filter, voiceGain, oscs };
    return audio;
  }
  async function resumeAudio() {
    const a = ensureAudio();
    if (!a) return null;
    try { if (a.ctx.state === "suspended") await a.ctx.resume(); } catch (e) {}
    return a;
  }
  function applyBreathAudio(kind, e, active) {
    if (!audio || !soundOn) return;
    const t = audio.ctx.currentTime;
    let level = 0.35;
    let freq = 420;
    if (active) {
      if (kind === "in") { level = 0.6 + 0.4 * e; freq = 400 + 220 * e; }
      else if (kind === "out") { level = 1.0 - 0.4 * e; freq = 620 - 220 * e; }
      else { level = 0.8; freq = 480; } // hold — steady soft
    }
    audio.master.gain.cancelScheduledValues(t);
    audio.master.gain.setTargetAtTime(Math.max(0, level), t, 0.12);
    audio.filter.frequency.cancelScheduledValues(t);
    audio.filter.frequency.setTargetAtTime(freq, t, 0.16);
  }
  function muteAudio(fade) {
    if (!audio) return;
    const t = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(t);
    if (!fade) audio.master.gain.value = 0;
    else {
      audio.master.gain.setValueAtTime(audio.master.gain.value, t);
      audio.master.gain.linearRampToValueAtTime(0, t + 0.4);
    }
  }
  function disposeAudio() {
    muteAudio(false);
    if (!audio) return;
    try { audio.oscs.forEach(o => { try { o.stop(); } catch (e) {} }); } catch (e) {}
    try { audio.ctx.close(); } catch (e) {}
    audio = null;
  }
  function setSoundUI() {
    const btn = document.getElementById("breathSound");
    if (!btn) return;
    btn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    btn.classList.toggle("on", soundOn);
    btn.innerHTML = soundOn
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 10v4h3l4 3V7L7 10H4z"/><path d="M15.5 9.5a4 4 0 0 1 0 5"/><path d="M17.8 7.2a7 7 0 0 1 0 9.6"/></svg><span>Sound on</span>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 10v4h3l4 3V7L7 10H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg><span>Sound off</span>`;
  }
  async function toggleSound() {
    if (soundOn) { soundOn = false; muteAudio(true); setSoundUI(); return; }
    soundOn = true;
    await resumeAudio();
    setSoundUI();
    if (running) paint(elapsedBefore + (performance.now() - startedAt), true);
    else if (audio) {
      const t = audio.ctx.currentTime;
      audio.master.gain.setValueAtTime(0, t);
      audio.master.gain.linearRampToValueAtTime(0.8, t + 0.2);
      audio.master.gain.linearRampToValueAtTime(0.5, t + 1);
    }
  }

  /* ——— Lab carousel ——— */
  const FREE = { coherent: 1 };
  const LOCKI = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  function isLocked(id) { return !FREE[id] && !(window.faSignedIn && window.faSignedIn()); }
  function showUnlock(id) {
    const el = ensureRoot();
    el.innerHTML = `
      <div class="breathOverlay breathUnlockBg" role="dialog" aria-modal="true" aria-label="Unlock breathing practices">
        <div class="breathUnlock">
          <button type="button" class="breathX" data-breath-close="1" aria-label="Close">✕</button>
          <span class="breathUnlockIc">${LOCKI}</span>
          <b>Sign up free to unlock members’ practices and sessions</b>
          <p class="muted">Coherent breathing is open to everyone. A free account unlocks Longer exhale, Box breathing and more.</p>
          <div class="breathUnlockBtns">
            <button type="button" class="gold" data-breath-auth="up">Sign up free</button>
            <button type="button" class="outline" data-breath-auth="in">Sign in</button>
          </div>
        </div>
      </div>`;
    el.onclick = e => {
      if (e.target.closest("[data-breath-close]") || e.target.classList.contains("breathUnlockBg")) { closeAll(); return; }
      const a = e.target.closest("[data-breath-auth]");
      if (a) { closeAll(); if (window.faAuthFor) window.faAuthFor(a.getAttribute("data-breath-auth") === "up", id); }
    };
  }
  function mountLab() {
    const box = document.getElementById("learnList");
    if (!box) return;
    let wrap = document.getElementById("breathLabSec");
    if (wrap) wrap.remove();
    wrap = document.createElement("div");
    wrap.id = "breathLabSec";
    wrap.innerHTML = `
      <h3 class="lsec" data-sec="Breathing practices">Breathe</h3>
      <div class="breathCarousel" role="list">
        ${ORDER.map(id => {
          const p = PRACTICES[id];
          const icon = p.viz === "wave" ? "wave" : p.viz === "box" ? "box" : "ball";
          return `<button type="button" class="breathCaroCard" role="listitem" data-breath-open="${esc(id)}" aria-label="${esc(p.title)}: ${esc(p.tag||"")}">
            ${window.FA_isNew&&FA_isNew("breath:"+id)?FA_NEW_TAG:""}<div class="breathCaroArt ${icon}" aria-hidden="true">${p.tag?`<span class="breathUseTag">${esc(p.tag)}</span>`:""}${isLocked(id)?`<span class="breathLock">${LOCKI}</span>`:""}</div>
            <span class="breathTags">${FREE[id]?'<span class="ltag free">Free</span>':`<span class="ltag lk">${isLocked(id)?LOCKI+' ':''}Members</span>`}</span>
            <b>${esc(p.title)}</b>
            <small>${esc(p.line)}</small>
            <span class="breathCaroCta">Open →</span>
          </button>`;
        }).join("")}
      </div>`;
    box.prepend(wrap);
    wrap.onclick = e => {
      const b = e.target.closest("[data-breath-open]");
      if (b) openIntro(b.getAttribute("data-breath-open"));
    };
  }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "breathRoot";
    root.className = "breathRoot";
    document.body.appendChild(root);
    return root;
  }
  function closeAll() {
    stop(false);
    disposeAudio();
    soundOn = false;
    currentId = null;
    if (root) { root.remove(); root = null; }
  }

  function openIntro(id) {
    const p = PRACTICES[id];
    if (!p) return;
    if (isLocked(id)) { showUnlock(id); return; }
    stop(false);
    muteAudio(true);
    currentId = id;
    const el = ensureRoot();
    el.innerHTML = `
      <div class="breathOverlay" role="dialog" aria-modal="true" aria-label="${esc(p.title)}">
        <div class="breathSheet breathIntro">
          <div class="breathTop">
            <button type="button" class="breathBack" data-breath-close="1" aria-label="Close">←</button>
            <b>${esc(p.title)}</b>
            <button type="button" class="breathX" data-breath-close="1" aria-label="Close">✕</button>
          </div>
          <div class="breathIntroHead">${p.tag?`<span class="breathUseTag">${esc(p.tag)}</span>`:""}<p class="breathIntroLine">${esc(p.line)}</p></div>
          <p class="breathDesc">${esc(p.desc)}</p>
          <div class="breathWhy">
            <b>Why it helps</b>
            <ul>${p.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
          </div>
          <button type="button" class="gold breathGo big" data-breath-begin="${esc(id)}">Begin practice</button>
          <p class="breathSafe">${SAFE}</p>
        </div>
      </div>`;
    wire(el);
  }

  function vizHTML(viz) {
    if (viz === "wave") {
      return `<div class="breathViz wave" aria-hidden="true">
        <svg class="breathWaveSvg" viewBox="0 0 280 120" preserveAspectRatio="none">
          <path id="breathWavePath" class="breathWavePath" d="M0 60 Q 35 60 70 60 T 140 60 T 210 60 T 280 60" fill="none" stroke="#5FC9C3" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <div class="breathWaveGlow" id="breathWaveGlow"></div>
      </div>`;
    }
    if (viz === "box") {
      return `<div class="breathViz box" aria-hidden="true">
        <svg class="breathBoxSvg" viewBox="0 0 200 200">
          <rect x="30" y="30" width="140" height="140" rx="8" fill="none" stroke="#C99E6755" stroke-width="2"/>
          <rect id="breathBoxTrack" x="30" y="30" width="140" height="140" rx="8" fill="none" stroke="#5FC9C3" stroke-width="2.5" stroke-dasharray="560" stroke-dashoffset="560" pathLength="560"/>
          <circle id="breathBoxDot" cx="30" cy="30" r="7" fill="#C99E67"/>
        </svg>
      </div>`;
    }
    return `<div class="breathViz" aria-hidden="true">
      <div class="breathGlow"></div>
      <div class="breathBall" id="breathBall"></div>
    </div>`;
  }

  function openPlayer(id) {
    const p = PRACTICES[id];
    if (!p) return;
    if (isLocked(id)) { showUnlock(id); return; }
    reduce = prefersReduce();
    elapsedBefore = 0; startedAt = 0; running = false;
    currentId = id;
    muteAudio(true);
    const el = ensureRoot();
    el.innerHTML = `
      <div class="breathOverlay breathPlayer" role="dialog" aria-modal="true" aria-label="${esc(p.title)}">
        <div class="breathStage${reduce ? " reduce" : ""}">
          <div class="breathTop">
            <button type="button" class="breathBack" data-breath-intro="${esc(id)}" aria-label="Back">←</button>
            <b>${esc(p.title)}</b>
            <button type="button" class="breathX" data-breath-close="1" aria-label="Close">✕</button>
          </div>
          <p class="breathRemain" id="breathRemain">5:00</p>
          ${vizHTML(p.viz)}
          <p class="breathCue" id="breathCue">Ready when you are</p>
          <p class="breathCount" id="breathCount">${Math.round(p.phases[0].ms / 1000)}</p>
          <div class="breathActions">
            <button type="button" class="gold breathGo" id="breathGo" data-breath-toggle="1">Start</button>
            <button type="button" class="breathSound" id="breathSound" data-breath-sound="1" aria-pressed="false">Sound off</button>
          </div>
          <p class="breathSafe">${SAFE}</p>
          <div class="breathEnd" id="breathEnd" hidden>
            <div class="breathEndCard">
              <b>Well done</b>
              <p>Five quiet minutes. Take a moment before you move on.</p>
              <button type="button" class="gold" data-breath-begin="${esc(id)}">Practice again</button>
              <button type="button" class="ghost sm" data-breath-close="1">Close</button>
            </div>
          </div>
        </div>
      </div>`;
    wire(el);
    setSoundUI();
    paint(0, false);
  }

  function phaseAt(p, elapsed) {
    const cycle = p.phases.reduce((s, x) => s + x.ms, 0);
    let t = ((elapsed % cycle) + cycle) % cycle;
    for (const ph of p.phases) {
      if (t < ph.ms) return { ph, phaseT: t, e: Math.min(1, t / ph.ms) };
      t -= ph.ms;
    }
    const last = p.phases[p.phases.length - 1];
    return { ph: last, phaseT: last.ms, e: 1 };
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function paintViz(p, ph, eRaw, active) {
    const e = ease(eRaw);
    if (p.viz === "ball") {
      const ball = document.getElementById("breathBall");
      if (!ball) return;
      let scale = 0.55;
      if (ph.kind === "in") scale = 0.55 + 0.45 * e;
      else if (ph.kind === "out") scale = 1 - 0.45 * e;
      else scale = ph.kind === "out" ? 0.55 : 1;
      if (reduce) {
        ball.style.transition = "transform .35s ease, opacity .35s ease";
        ball.style.transform = `scale(${ph.kind === "in" || (ph.kind === "hold" && scale > 0.7) ? 0.95 : 0.6})`;
      } else {
        ball.style.transition = "none";
        ball.style.transform = `scale(${scale.toFixed(4)})`;
        ball.style.opacity = String(0.72 + 0.28 * (ph.kind === "in" ? e : ph.kind === "out" ? 1 - e : 0.7));
      }
      return;
    }
    if (p.viz === "wave") {
      const amp = ph.kind === "in" ? 28 * e : ph.kind === "out" ? 28 * (1 - e) : ph.kind === "hold" ? 8 : 0;
      // Rising wave on inhale, falling on exhale
      const y = ph.kind === "in" ? 60 - amp : ph.kind === "out" ? 60 + (28 - (28 * (1 - e))) : 60;
      // Build a soft sine-ish path whose mid height follows breath
      const mid = ph.kind === "in" ? 60 - 30 * e : ph.kind === "out" ? 30 + 30 * e : 60;
      const d = `M0 60 Q 35 ${mid} 70 60 T 140 ${mid} T 210 60 T 280 ${mid}`;
      const path = document.getElementById("breathWavePath");
      if (path) path.setAttribute("d", d);
      const glow = document.getElementById("breathWaveGlow");
      if (glow) {
        const rise = ph.kind === "in" ? e : ph.kind === "out" ? 1 - e : 0.4;
        glow.style.transform = `translateY(${(1 - rise) * 36}px) scale(${0.7 + 0.45 * rise})`;
        glow.style.opacity = String(0.35 + 0.5 * rise);
      }
      return;
    }
    if (p.viz === "box") {
      const cycleMs = p.phases.reduce((s, x) => s + x.ms, 0);
      // progress 0..1 around the square across full cycle
      let elapsedInCycle = 0;
      // reconstruct from phase index
      let idx = p.phases.indexOf(ph);
      for (let i = 0; i < idx; i++) elapsedInCycle += p.phases[i].ms;
      elapsedInCycle += eRaw * ph.ms;
      const u = Math.min(1, elapsedInCycle / cycleMs);
      const side = 140, x0 = 30, y0 = 30;
      // 0 top L→R, 1 right T→B, 2 bottom R→L, 3 left B→T
      const seg = u * 4;
      const si = Math.min(3, Math.floor(seg));
      const f = seg - si;
      let cx = x0, cy = y0;
      if (si === 0) { cx = x0 + side * f; cy = y0; }
      else if (si === 1) { cx = x0 + side; cy = y0 + side * f; }
      else if (si === 2) { cx = x0 + side * (1 - f); cy = y0 + side; }
      else { cx = x0; cy = y0 + side * (1 - f); }
      const dot = document.getElementById("breathBoxDot");
      if (dot) { dot.setAttribute("cx", cx.toFixed(1)); dot.setAttribute("cy", cy.toFixed(1)); }
      const track = document.getElementById("breathBoxTrack");
      if (track) track.setAttribute("stroke-dashoffset", (560 * (1 - u)).toFixed(1));
    }
  }

  function paint(elapsed, active) {
    const p = PRACTICES[currentId];
    if (!p) return;
    const remEl = document.getElementById("breathRemain");
    const cueEl = document.getElementById("breathCue");
    const cntEl = document.getElementById("breathCount");
    if (remEl) remEl.textContent = fmt(Math.max(0, TOTAL_MS - elapsed));

    if (!active && elapsed === 0) {
      if (cueEl) cueEl.textContent = "Ready when you are";
      if (cntEl) cntEl.textContent = String(Math.round(p.phases[0].ms / 1000));
      paintViz(p, p.phases[0], 0, false);
      applyBreathAudio("out", 0, false);
      return;
    }
    const { ph, phaseT, e } = phaseAt(p, elapsed);
    const left = Math.max(1, Math.ceil((ph.ms - phaseT) / 1000));
    if (cueEl) cueEl.textContent = ph.name;
    if (cntEl) cntEl.textContent = String(left);
    paintViz(p, ph, e, active);
    applyBreathAudio(ph.kind, ease(e), active && running);
  }

  function tick(now) {
    if (!running) return;
    const elapsed = elapsedBefore + (now - startedAt);
    if (elapsed >= TOTAL_MS) { paint(TOTAL_MS, true); finish(); return; }
    paint(elapsed, true);
    raf = requestAnimationFrame(tick);
  }

  async function start() {
    if (running) return;
    // Start tap: unlock audio (iOS) and turn sound ON by default
    soundOn = true;
    await resumeAudio();
    setSoundUI();
    running = true;
    startedAt = performance.now();
    const go = document.getElementById("breathGo");
    if (go) go.textContent = "Pause";
    const end = document.getElementById("breathEnd");
    if (end) end.hidden = true;
    // audible soft pad immediately
    if (audio) {
      const t = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(t);
      audio.master.gain.setValueAtTime(Math.max(audio.master.gain.value, 0.02), t);
      audio.master.gain.linearRampToValueAtTime(0.8, t + 0.35);
    }
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    if (!running) return;
    running = false;
    elapsedBefore += performance.now() - startedAt;
    cancelAnimationFrame(raf);
    const go = document.getElementById("breathGo");
    if (go) go.textContent = "Resume";
    if (audio && soundOn) {
      const t = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(t);
      audio.master.gain.setTargetAtTime(0.25, t, 0.25);
    }
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function finish() {
    stop();
    const go = document.getElementById("breathGo");
    if (go) go.textContent = "Start";
    const end = document.getElementById("breathEnd");
    if (end) end.hidden = false;
    const cue = document.getElementById("breathCue");
    if (cue) cue.textContent = "Complete";
    const cnt = document.getElementById("breathCount");
    if (cnt) cnt.textContent = "";
    if (audio && soundOn) {
      const t = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(t);
      audio.master.gain.setValueAtTime(audio.master.gain.value, t);
      audio.master.gain.linearRampToValueAtTime(0, t + 1.5);
    }
  }

  function wire(el) {
    el.onclick = e => {
      if (e.target.closest("[data-breath-close]")) { closeAll(); return; }
      if (e.target.closest("[data-breath-sound]")) { toggleSound(); return; }
      const intro = e.target.closest("[data-breath-intro]");
      if (intro) { openIntro(intro.getAttribute("data-breath-intro")); return; }
      const begin = e.target.closest("[data-breath-begin]");
      if (begin) { openPlayer(begin.getAttribute("data-breath-begin")); return; }
      const tog = e.target.closest("[data-breath-toggle]");
      if (tog) { if (running) pause(); else start(); return; }
    };
  }

  // Back-compat aliases
  function openMenu() { /* carousel is in Lab; open first intro */
    openIntro("coherent");
  }

  window.FasciBreath = {
    mountLab,
    openMenu,
    openIntro,
    showUnlock,
    openPlayer,
    close: closeAll,
    start,
    pause,
    toggleSound,
    PRACTICES,
    preview(state, id) {
      id = id || "coherent";
      if (state === "intro") { openIntro(id); return; }
      openPlayer(id);
      const p = PRACTICES[id];
      const go = document.getElementById("breathGo");
      if (state === "end") {
        elapsedBefore = TOTAL_MS; paint(TOTAL_MS, true); finish(); return;
      }
      stop();
      let elapsed = 800;
      if (state === "mid" || state === "inhale" || state === "full") {
        // mid first inhale-ish
        if (state === "full" && p.viz === "ball") elapsed = p.phases[0].ms - 100;
        else if (state === "mid") elapsed = Math.floor(p.phases[0].ms * 0.55);
        else elapsed = Math.floor(p.phases[0].ms * 0.4);
      }
      if (state === "exhale") elapsed = p.phases[0].ms + Math.floor((p.phases[1] || p.phases[0]).ms * 0.4);
      elapsedBefore = elapsed;
      // force visual paint as active
      const { ph, phaseT, e } = phaseAt(p, elapsed);
      const remEl = document.getElementById("breathRemain");
      const cueEl = document.getElementById("breathCue");
      const cntEl = document.getElementById("breathCount");
      if (remEl) remEl.textContent = fmt(Math.max(0, TOTAL_MS - elapsed));
      if (cueEl) cueEl.textContent = ph.name;
      if (cntEl) cntEl.textContent = String(Math.max(1, Math.ceil((ph.ms - phaseT) / 1000)));
      paintViz(p, ph, e, true);
      if (go) go.textContent = "Resume";
      if (state === "sound") { soundOn = true; setSoundUI(); }
    }
  };
})();
