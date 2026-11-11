/* Session-flow figure. Body paths come from anatomy.js.
   Not a tracing of a third-party figure. */
(function(root, factory){
  let anatomy = root && root.FasciAnatomy;
  if (!anatomy && typeof module === "object" && module.exports) {
    try { require("./anatomy.js"); anatomy = globalThis.FasciAnatomy; } catch (e) { anatomy = null; }
  }
  const api = factory(anatomy);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FasciFigure = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(FasciAnatomy){
  const MIDLINE = {
    pelvic: [100, 248],
    thoracic: [100, 156],
    cervical: [100, 101],
    abdominal: [100, 219],
    ocular: [100, 54]
  };

  function qPoint(p0, c, p1, t){
    const u = 1 - t;
    return [
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]
    ];
  }
  function qTangent(p0, c, p1, t){
    return [
      2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]),
      2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1])
    ];
  }
  function arrowHead(p0, c, p1, t, size){
    const pt = qPoint(p0, c, p1, t);
    const tg = qTangent(p0, c, p1, t);
    const len = Math.hypot(tg[0], tg[1]) || 1;
    const ux = tg[0] / len, uy = tg[1] / len;
    const px = -uy, py = ux;
    const x = pt[0], y = pt[1];
    const x1 = x - ux * size + px * size * 0.62;
    const y1 = y - uy * size + py * size * 0.62;
    const x2 = x - ux * size - px * size * 0.62;
    const y2 = y - uy * size - py * size * 0.62;
    return '<path d="M'+x1.toFixed(1)+' '+y1.toFixed(1)+' L'+x.toFixed(1)+' '+y.toFixed(1)+' L'+x2.toFixed(1)+' '+y2.toFixed(1)+'" fill="none" stroke="#E2C08A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function zoneMask(id, belt, body){
    let extra = "";
    if (belt.y1 > 200) {
      extra = '<rect x="0" y="200" width="62" height="130" fill="black"/><rect x="138" y="200" width="62" height="130" fill="black"/>';
    }
    return '<mask id="zone-'+belt.id+'-'+id+'" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="200" height="500" fill="black"/><path d="'+body+'" fill="white"/><rect x="0" y="0" width="200" height="'+belt.y0+'" fill="black"/><rect x="0" y="'+belt.y1+'" width="200" height="'+(500-belt.y1)+'" fill="black"/>'+extra+'</mask>';
  }

  function svgFigure(opt){
    if (!FasciAnatomy) return "";
    opt = opt || {};
    const id = "fg-" + (opt.id || "flow");
    const lit = opt.lit || "";
    const muted = opt.muted || [];
    const badges = opt.badges || [];
    const journey = opt.journey || [];
    const doneZones = opt.doneZones || [];
    const body = FasciAnatomy.frontBodyD();
    const belts = FasciAnatomy.BELTS || [];
    const masks = belts.map(b => zoneMask(id, b, body)).join("");
    const bandOp = { ocular: 0.10, cervical: 0.22, thoracic: 0.14, abdominal: 0.22, pelvic: 0.10 };
    const bandRects = belts.map(b => {
      if (b.id === lit || muted.indexOf(b.id) >= 0) return "";
      return '<rect x="0" y="'+b.y0+'" width="200" height="'+(b.y1-b.y0)+'" fill="#B7E4E8" fill-opacity="'+(bandOp[b.id]||0.14)+'"/>';
    }).join("");
    const seams = [[86, 88, 112],[116, 82, 118],[200, 76, 124],[238, 74, 126]].map(s =>
      '<line x1="'+s[1]+'" y1="'+s[0]+'" x2="'+s[2]+'" y2="'+s[0]+'" stroke="#F3FBFC" stroke-opacity="0.45" stroke-width="1.05" stroke-linecap="round"/>'
    ).join("");
    const fillZone = (zid, opacity) => '<g mask="url(#zone-'+zid+'-'+id+')"><path d="'+body+'" fill="#C99E67" fill-opacity="'+opacity+'"/></g>';
    const doneFill = doneZones.filter(z => z && z !== lit).map(z => fillZone(z, "0.16")).join("");
    const litFill = lit ? '<g mask="url(#zone-'+lit+'-'+id+')" filter="url(#goldGlow-'+id+')"><path d="'+body+'" fill="#C99E67" fill-opacity="0.42"/></g><g mask="url(#zone-'+lit+'-'+id+')"><path d="'+body+'" fill="none" stroke="#E2C08A" stroke-width="2.35" stroke-linejoin="round" stroke-linecap="round"/></g>' : "";
    const mutedFill = muted.map(z => '<g mask="url(#zone-'+z+'-'+id+')"><path d="'+body+'" fill="#0a2428" fill-opacity="0.55"/></g>').join("");
    const interior =
      '<path d="'+FasciAnatomy.crPath([[88,120],[76,124],[66,132]])+'" fill="none" stroke="#E8F4F6" stroke-width="0.9" stroke-linecap="round" opacity="0.28"/>'+
      '<path d="'+FasciAnatomy.crPath([[112,120],[124,124],[134,132]])+'" fill="none" stroke="#E8F4F6" stroke-width="0.9" stroke-linecap="round" opacity="0.28"/>'+
      '<path d="'+FasciAnatomy.crPath([[100,88],[100,122],[100,158],[100,196],[100,230]])+'" fill="none" stroke="#E8F4F6" stroke-width="0.7" stroke-linecap="round" opacity="0.22"/>';
    const radOf = (b) => b.done ? 11.5 : (b.current ? 13 : 11);
    let journeySvg = "";
    if (journey.length >= 2) {
      const segs = [], arrows = [];
      for (let i = 1; i < journey.length; i++) {
        const A = MIDLINE[journey[i-1]], B = MIDLINE[journey[i]];
        if (!A || !B) continue;
        const ba = badges.find(x => x.id === journey[i-1]) || {};
        const bb = badges.find(x => x.id === journey[i]) || {};
        const rA = radOf(ba) + 1.2, rB = radOf(bb) + 1.2;
        const dy = B[1] >= A[1] ? 1 : -1;
        const p0 = [A[0], A[1] + dy * rA];
        const p1 = [B[0], B[1] - dy * rB];
        const bulge = (dy < 0 ? 1 : -1) * 20;
        const c = [100 + bulge, (p0[1] + p1[1]) / 2];
        segs.push("M"+p0[0].toFixed(1)+" "+p0[1].toFixed(1)+" Q"+c[0].toFixed(1)+" "+c[1].toFixed(1)+" "+p1[0].toFixed(1)+" "+p1[1].toFixed(1));
        arrows.push(arrowHead(p0, c, p1, 0.78, 5.2));
      }
      const d = segs.join(" ");
      journeySvg = '<path d="'+d+'" fill="none" stroke="#C99E67" stroke-width="4.2" stroke-opacity="0.18" stroke-linecap="round"/>'+
        '<path d="'+d+'" fill="none" stroke="#E2C08A" stroke-width="1.65" stroke-dasharray="4.5 4" stroke-linecap="round" stroke-opacity="0.95"/>'+
        arrows.join("");
    }
    const badgeSvg = badges.map(b => {
      const p = MIDLINE[b.id];
      if (!p) return "";
      const x = p[0], y = p[1], r = radOf(b);
      const fill = b.done ? "#1a2e24" : (b.current ? "#C99E67" : "#072126");
      const stroke = (b.current || b.done) ? "#E2C08A" : "#D7EFF2";
      const sw = b.current ? 1.8 : 1.4;
      const tc = b.current ? "#02191E" : "#F3EDE4";
      const halo = '<circle cx="'+x+'" cy="'+y+'" r="'+(r+2.4)+'" fill="#02191E" fill-opacity="0.55"/>';
      if (b.done) {
        return halo+'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>'+
          '<path d="M'+(x-4.2)+' '+(y+0.2)+' l2.8 3.1 6.6-6.8" fill="none" stroke="#E2C08A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      return halo+'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>'+
        '<text x="'+x+'" y="'+(y+0.8)+'" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="'+(b.current?13:11.5)+'" fill="'+tc+'">'+b.n+'</text>';
    }).join("");
    const skipMark = muted.map(zid => {
      const p = MIDLINE[zid];
      if (!p) return "";
      return '<path d="M'+(p[0]-5)+' '+p[1]+' h10" stroke="#8aa3a5" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>';
    }).join("");
    return '<svg class="body-svg" viewBox="0 0 200 500" aria-hidden="true"><defs>'+
      '<filter id="outlineGlow-'+id+'" x="-40%" y="-8%" width="180%" height="116%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
      '<filter id="goldGlow-'+id+'" x="-40%" y="-8%" width="180%" height="120%"><feGaussianBlur stdDeviation="5.5" result="b"/><feFlood flood-color="#C99E67" flood-opacity="0.7"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
      '<clipPath id="clip-'+id+'"><path d="'+body+'"/></clipPath>'+masks+
      '<mask id="torso-'+id+'" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="200" height="500" fill="black"/><path d="'+body+'" fill="white"/><rect x="0" y="200" width="62" height="130" fill="black"/><rect x="138" y="200" width="62" height="130" fill="black"/></mask>'+
      '</defs><ellipse cx="100" cy="490" rx="54" ry="6.5" fill="#00000055"/>'+
      '<path d="'+body+'" fill="#1a4c52" fill-opacity="0.16"/>'+
      '<g mask="url(#torso-'+id+')">'+bandRects+seams+'</g>'+
      mutedFill+doneFill+litFill+interior+
      '<path d="'+body+'" fill="none" stroke="#F3FBFC" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" filter="url(#outlineGlow-'+id+')" opacity="0.95"/>'+
      (lit ? '<g mask="url(#zone-'+lit+'-'+id+')"><path d="'+body+'" fill="none" stroke="#E2C08A" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></g>' : "")+
      journeySvg+skipMark+badgeSvg+'</svg>';
  }

  const EDGE = {
    ocular: [122, 54],
    cervical: [110, 101],
    thoracic: [132, 156],
    abdominal: [126, 219],
    pelvic: [136, 248]
  };

  function drawLeaders(mapEl, svgEl, figEl){
    if (!mapEl || !svgEl || !figEl) return;
    const root = mapEl.getBoundingClientRect();
    const fig = figEl.getBoundingClientRect();
    const w = mapEl.clientWidth, h = mapEl.clientHeight;
    if (!w || !h || !fig.width) return;
    svgEl.setAttribute("viewBox", "0 0 "+w+" "+h);
    const sx = fig.width / 200, sy = fig.height / 500;
    const ox = fig.left - root.left, oy = fig.top - root.top;
    const onBtn = mapEl.querySelector("button.current");
    const onId = onBtn ? onBtn.getAttribute("data-belt") : "";
    const parts = [];
    Object.keys(EDGE).forEach(id => {
      const btn = mapEl.querySelector('button[data-belt="'+id+'"]');
      if (!btn) return;
      const br = btn.getBoundingClientRect();
      const x1 = ox + EDGE[id][0] * sx;
      const y1 = oy + EDGE[id][1] * sy;
      const x2 = br.left - root.left;
      const y2 = br.top - root.top + br.height / 2;
      const mid = x1 + Math.max(8, Math.min(16, (x2 - x1) * 0.2));
      const d = "M"+x1.toFixed(1)+" "+y1.toFixed(1)+" L"+mid.toFixed(1)+" "+y1.toFixed(1)+" L"+(x2-4).toFixed(1)+" "+y2.toFixed(1);
      const on = id === onId;
      parts.push('<path d="'+d+'" fill="none" stroke="'+(on?"#E2C08A":"#A9D4D8")+'" stroke-width="'+(on?1.8:1.2)+'" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="'+(on?0.95:0.7)+'"/>');
      parts.push('<circle cx="'+x1.toFixed(1)+'" cy="'+y1.toFixed(1)+'" r="'+(on?3.2:2.4)+'" fill="'+(on?"#E2C08A":"#D2EFF2")+'"/>');
    });
    svgEl.innerHTML = parts.join("");
  }

  return { svgFigure, drawLeaders, MIDLINE };
});
