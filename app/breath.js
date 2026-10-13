// FasciApp Breathing practices (Lab) — Coherent breathing player + gentle Web Audio pad.
(function () {
  const TOTAL_MS = 5 * 60 * 1000;
  const PHASE_MS = 6000; // 6 s inhale / 6 s exhale
  const PRACTICES = [
    { id: "coherent", title: "Coherent breathing", line: "6 seconds in · 6 seconds out · 5 minutes", ready: true },
    { id: "longer", title: "Longer exhale", line: "Gentle downshift · coming soon", ready: false },
    { id: "box", title: "Box breathing", line: "Equal sides · coming soon", ready: false }
  ];

  let root = null, raf = 0, running = false, startedAt = 0, elapsedBefore = 0, reduce = false;
  let soundOn = false; // OFF by default (iOS needs a tap to start audio)
  let audio = null; // { ctx, master, filter, voiceGain, oscs }

  function prefersReduce() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function ensureAudio() {
    if (audio) return audio;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    filter.connect(master);

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.035; // gentle
    voiceGain.connect(filter);

    // Soft ambient pad: three gentle partials (sine + soft triangle), slightly detuned
    const freqs = [110, 164.81, 220]; // A2, E3, A3
    const oscs = [];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 1 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.55 : i === 1 ? 0.28 : 0.22;
      o.connect(g);
      g.connect(voiceGain);
      o.start();
      oscs.push(o);
    });

    audio = { ctx, master, filter, voiceGain, oscs };
    return audio;
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

  function muteAudio(immediate) {
    if (!audio) return;
    const t = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(t);
    if (immediate) audio.master.gain.value = 0;
    else {
      audio.master.gain.setValueAtTime(audio.master.gain.value, t);
      audio.master.gain.linearRampToValueAtTime(0, t + 0.35);
    }
  }

  function applyBreathAudio(inhale, e, active) {
    if (!audio || !soundOn) return;
    const t = audio.ctx.currentTime;
    // swell on inhale, settle on exhale — keep overall quiet
    const level = !active ? 0 : (inhale ? 0.018 + 0.028 * e : 0.046 - 0.028 * e);
    const freq = !active ? 380 : (inhale ? 380 + 160 * e : 540 - 160 * e);
    audio.master.gain.cancelScheduledValues(t);
    audio.master.gain.setTargetAtTime(Math.max(0, level), t, 0.18);
    audio.filter.frequency.cancelScheduledValues(t);
    audio.filter.frequency.setTargetAtTime(freq, t, 0.22);
  }

  async function enableSound() {
    soundOn = true;
    const a = ensureAudio();
    if (!a) { soundOn = false; setSoundUI(); return; }
    try { if (a.ctx.state === "suspended") await a.ctx.resume(); } catch (e) {}
    setSoundUI();
    // seed a soft idle level if already running; otherwise stay silent until Start
    if (running) {
      const elapsed = elapsedBefore + (performance.now() - startedAt);
      const cycle = elapsed % (PHASE_MS * 2);
      const inhale = cycle < PHASE_MS;
      const phaseT = inhale ? cycle : cycle - PHASE_MS;
      const tt = Math.min(1, phaseT / PHASE_MS);
      const ee = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
      applyBreathAudio(inhale, ee, true);
    } else {
      // tiny idle breath of air so user hears the toggle worked, then settle
      const t = a.ctx.currentTime;
      a.master.gain.cancelScheduledValues(t);
      a.master.gain.setValueAtTime(0, t);
      a.master.gain.linearRampToValueAtTime(0.02, t + 0.25);
      a.master.gain.linearRampToValueAtTime(0.008, t + 1.2);
    }
  }

  function disableSound() {
    soundOn = false;
    muteAudio(false);
    setSoundUI();
  }

  async function toggleSound() {
    if (soundOn) disableSound();
    else await enableSound();
  }

  function disposeAudio() {
    muteAudio(true);
    if (!audio) return;
    try { audio.oscs.forEach(o => { try { o.stop(); } catch (e) {} }); } catch (e) {}
    try { audio.ctx.close(); } catch (e) {}
    audio = null;
  }

  function closeAll() {
    stop(false);
    disposeAudio();
    soundOn = false;
    if (root) { root.remove(); root = null; }
  }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "breathRoot";
    root.className = "breathRoot";
    document.body.appendChild(root);
    return root;
  }

  function openMenu() {
    stop(false);
    muteAudio(false);
    const el = ensureRoot();
    el.innerHTML = `
      <div class="breathOverlay" role="dialog" aria-modal="true" aria-label="Breathing practices">
        <div class="breathSheet">
          <div class="breathTop">
            <b>Breathing practices</b>
            <button type="button" class="breathX" data-breath-close="1" aria-label="Close">✕</button>
          </div>
          <p class="breathLead">Choose a calm paced practice. Sit comfortably, and stop anytime if you feel dizzy.</p>
          <ul class="breathList">
            ${PRACTICES.map(p => `
              <li>
                <button type="button" class="breathItem${p.ready ? "" : " soon"}" data-breath-id="${esc(p.id)}" ${p.ready ? "" : "disabled"} aria-label="${esc(p.title)}${p.ready ? "" : ", coming soon"}">
                  <span class="breathOrb" aria-hidden="true"></span>
                  <span class="breathItemTxt">
                    <b>${esc(p.title)}</b>
                    <small>${esc(p.line)}</small>
                  </span>
                  <span class="breathItemCta">${p.ready ? "Start" : "Coming soon"}</span>
                </button>
              </li>`).join("")}
          </ul>
          <p class="breathSafe">Stop if you feel dizzy or unwell. Breathe comfortably — never force the breath.</p>
        </div>
      </div>`;
    wire(el);
  }

  function openPlayer(id) {
    if (id !== "coherent") return;
    reduce = prefersReduce();
    elapsedBefore = 0;
    startedAt = 0;
    running = false;
    // keep soundOn preference within the session, but never auto-start audio
    muteAudio(true);
    const el = ensureRoot();
    el.innerHTML = `
      <div class="breathOverlay breathPlayer" role="dialog" aria-modal="true" aria-label="Coherent breathing">
        <div class="breathStage${reduce ? " reduce" : ""}">
          <div class="breathTop">
            <button type="button" class="breathBack" data-breath-back="1" aria-label="Back to practices">←</button>
            <b>Coherent breathing</b>
            <button type="button" class="breathX" data-breath-close="1" aria-label="Close">✕</button>
          </div>
          <p class="breathRemain" id="breathRemain" aria-live="polite">5:00</p>
          <div class="breathViz" aria-hidden="true">
            <div class="breathGlow"></div>
            <div class="breathBall" id="breathBall"></div>
          </div>
          <p class="breathCue" id="breathCue">Ready when you are</p>
          <p class="breathCount" id="breathCount">6</p>
          <div class="breathActions">
            <button type="button" class="gold breathGo" id="breathGo" data-breath-toggle="1">Start</button>
            <button type="button" class="breathSound" id="breathSound" data-breath-sound="1" aria-pressed="false" aria-label="Toggle calm background sound">Sound off</button>
          </div>
          <p class="breathSafe">Stop if you feel dizzy or unwell. Breathe comfortably — never force the breath.</p>
          <div class="breathEnd" id="breathEnd" hidden>
            <div class="breathEndCard">
              <b>Well done</b>
              <p>Five quiet minutes. Take a moment before you move on.</p>
              <button type="button" class="gold" data-breath-again="1">Practice again</button>
              <button type="button" class="ghost sm" data-breath-close="1">Close</button>
            </div>
          </div>
        </div>
      </div>`;
    wire(el);
    setSoundUI();
    paint(0, false);
  }

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function paint(elapsed, active) {
    const remain = Math.max(0, TOTAL_MS - elapsed);
    const remEl = document.getElementById("breathRemain");
    const cueEl = document.getElementById("breathCue");
    const cntEl = document.getElementById("breathCount");
    const ball = document.getElementById("breathBall");
    if (remEl) remEl.textContent = fmt(remain);

    if (!active && elapsed === 0) {
      if (cueEl) cueEl.textContent = "Ready when you are";
      if (cntEl) cntEl.textContent = "6";
      if (ball) {
        ball.style.transform = "scale(0.55)";
        ball.style.opacity = "0.75";
      }
      applyBreathAudio(true, 0, false);
      return;
    }

    const cycle = elapsed % (PHASE_MS * 2);
    const inhale = cycle < PHASE_MS;
    const phaseT = inhale ? cycle : cycle - PHASE_MS;
    const left = Math.max(1, Math.ceil((PHASE_MS - phaseT) / 1000));
    const t = Math.min(1, phaseT / PHASE_MS);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const scale = inhale ? 0.55 + 0.45 * e : 1 - 0.45 * e;

    if (cueEl) cueEl.textContent = inhale ? "Breathe in" : "Breathe out";
    if (cntEl) cntEl.textContent = String(left);
    if (ball) {
      if (reduce) {
        ball.style.transform = inhale ? "scale(0.95)" : "scale(0.6)";
        ball.style.opacity = inhale ? "1" : "0.7";
        ball.style.transition = "transform .35s ease, opacity .35s ease";
      } else {
        ball.style.transition = "none";
        ball.style.transform = `scale(${scale.toFixed(4)})`;
        ball.style.opacity = String(0.72 + 0.28 * (inhale ? e : 1 - e));
      }
    }
    applyBreathAudio(inhale, e, active && running);
  }

  function tick(now) {
    if (!running) return;
    const elapsed = elapsedBefore + (now - startedAt);
    if (elapsed >= TOTAL_MS) {
      paint(TOTAL_MS, true);
      finish();
      return;
    }
    paint(elapsed, true);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    startedAt = performance.now();
    const go = document.getElementById("breathGo");
    if (go) go.textContent = "Pause";
    const end = document.getElementById("breathEnd");
    if (end) end.hidden = true;
    if (soundOn && audio) {
      try { if (audio.ctx.state === "suspended") audio.ctx.resume(); } catch (e) {}
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
    // settle the pad while paused
    if (audio && soundOn) {
      const t = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(t);
      audio.master.gain.setTargetAtTime(0.006, t, 0.25);
    }
  }

  function stop(resetPaint) {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    if (resetPaint) {
      elapsedBefore = 0;
      startedAt = 0;
    }
  }

  function finish() {
    stop(false);
    const go = document.getElementById("breathGo");
    if (go) go.textContent = "Start";
    const end = document.getElementById("breathEnd");
    if (end) end.hidden = false;
    const ball = document.getElementById("breathBall");
    if (ball) {
      ball.style.transition = "transform .8s ease, opacity .8s ease";
      ball.style.transform = "scale(0.7)";
      ball.style.opacity = "0.85";
    }
    const cue = document.getElementById("breathCue");
    if (cue) cue.textContent = "Complete";
    const cnt = document.getElementById("breathCount");
    if (cnt) cnt.textContent = "";
    // soft fade out
    if (audio && soundOn) {
      const t = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(t);
      audio.master.gain.setValueAtTime(audio.master.gain.value, t);
      audio.master.gain.linearRampToValueAtTime(0, t + 1.4);
    }
  }

  function wire(el) {
    el.onclick = e => {
      if (e.target.closest("[data-breath-close]")) { closeAll(); return; }
      if (e.target.closest("[data-breath-back]")) { openMenu(); return; }
      if (e.target.closest("[data-breath-again]")) { openPlayer("coherent"); return; }
      if (e.target.closest("[data-breath-sound]")) { toggleSound(); return; }
      const tog = e.target.closest("[data-breath-toggle]");
      if (tog) { if (running) pause(); else start(); return; }
      const item = e.target.closest("[data-breath-id]");
      if (item && !item.disabled) { openPlayer(item.getAttribute("data-breath-id")); return; }
    };
  }

  window.FasciBreath = {
    openMenu,
    openPlayer,
    close: closeAll,
    start,
    pause,
    toggleSound,
    preview(state) {
      openPlayer("coherent");
      const go = document.getElementById("breathGo");
      if (state === "end") {
        elapsedBefore = TOTAL_MS;
        paint(TOTAL_MS, true);
        finish();
        return;
      }
      stop(false);
      let elapsed = 0;
      if (state === "inhale") elapsed = 1500;
      if (state === "full") elapsed = PHASE_MS - 80;
      if (state === "exhale") elapsed = PHASE_MS + 1500;
      elapsedBefore = elapsed;
      // paint as if active visuals even when paused for screenshots
      const cycle = elapsed % (PHASE_MS * 2);
      const inhale = cycle < PHASE_MS;
      const phaseT = inhale ? cycle : cycle - PHASE_MS;
      const t = Math.min(1, phaseT / PHASE_MS);
      const ee = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const remEl = document.getElementById("breathRemain");
      const cueEl = document.getElementById("breathCue");
      const cntEl = document.getElementById("breathCount");
      const ball = document.getElementById("breathBall");
      if (remEl) remEl.textContent = fmt(Math.max(0, TOTAL_MS - elapsed));
      if (cueEl) cueEl.textContent = inhale ? "Breathe in" : "Breathe out";
      if (cntEl) cntEl.textContent = String(Math.max(1, Math.ceil((PHASE_MS - phaseT) / 1000)));
      if (ball) {
        const scale = inhale ? 0.55 + 0.45 * ee : 1 - 0.45 * ee;
        ball.style.transition = "none";
        ball.style.transform = `scale(${scale.toFixed(4)})`;
        ball.style.opacity = String(0.72 + 0.28 * (inhale ? ee : 1 - ee));
      }
      if (go) go.textContent = "Resume";
      if (state === "sound") {
        // force Sound on UI for screenshot (no need to actually play in headless)
        soundOn = true;
        setSoundUI();
      }
    }
  };
})();
