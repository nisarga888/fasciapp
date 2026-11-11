/* White outline figure for the MER belt map.
   Body paths come from anatomy.js. Not a tracing of a third-party figure. */
(function(root, factory){
  let anatomy = root && root.FasciAnatomy;
  if (!anatomy && typeof module === "object" && module.exports) {
    try { require("./anatomy.js"); anatomy = globalThis.FasciAnatomy; } catch (e) { anatomy = null; }
  }
  const api = factory(anatomy);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FasciFigure = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(FasciAnatomy){
  const ANCHORS = {
    ocular:    [122.5, 62],
    cervical:  [109.5, 102],
    thoracic:  [132.5, 156],
    abdominal: [125.5, 218],
    pelvic:    [135.5, 258]
  };
  const BAND_OP = { ocular: 0.15, cervical: 0.28, thoracic: 0.14, abdominal: 0.26, pelvic: 0.18 };

  function svgFigure(opt){
    if (!FasciAnatomy) return "";
    const id = "fg-" + ((opt && opt.id) || "map");
    const hotId = (opt && opt.beltId) || "";
    const body = FasciAnatomy.frontBodyD();
    const belts = FasciAnatomy.BELTS || [];
    const hot = belts.find(b => b.id === hotId) || null;
    const bands = belts.map(b => {
      const h = b.y1 - b.y0;
      if (hot && b.id === hot.id) {
        return '<rect x="0" y="'+b.y0+'" width="200" height="'+h+'" fill="#C99E67" fill-opacity="0.42"/>';
      }
      const op = BAND_OP[b.id] != null ? BAND_OP[b.id] : 0.16;
      return '<rect x="0" y="'+b.y0+'" width="200" height="'+h+'" fill="#B7E4E8" fill-opacity="'+op+'"/>';
    }).join("");
    const seams = [[86, 88, 112],[116, 82, 118],[200, 76, 124],[238, 74, 126]].map(s =>
      '<line x1="'+s[1]+'" y1="'+s[0]+'" x2="'+s[2]+'" y2="'+s[0]+'" stroke="#F3FBFC" stroke-opacity="0.55" stroke-width="1.15" stroke-linecap="round"/>'
    ).join("");
    const interior =
      '<path d="'+FasciAnatomy.crPath([[88, 120],[76, 124],[66, 132]])+'" fill="none" stroke="#E8F4F6" stroke-width="0.9" stroke-linecap="round" opacity="0.32"/>'+
      '<path d="'+FasciAnatomy.crPath([[112, 120],[124, 124],[134, 132]])+'" fill="none" stroke="#E8F4F6" stroke-width="0.9" stroke-linecap="round" opacity="0.32"/>'+
      '<path d="'+FasciAnatomy.crPath([[100, 88],[100, 122],[100, 158],[100, 196],[100, 230]])+'" fill="none" stroke="#E8F4F6" stroke-width="0.7" stroke-linecap="round" opacity="0.28"/>';
    const y0 = hot ? hot.y0 : 0;
    const y1 = hot ? hot.y1 : 0;
    const hotMask = hot
      ? '<mask id="hot-'+id+'" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="200" height="500" fill="black"/><path d="'+body+'" fill="white"/><rect x="0" y="0" width="200" height="'+y0+'" fill="black"/><rect x="0" y="'+y1+'" width="200" height="'+(500-y1)+'" fill="black"/><rect x="0" y="200" width="62" height="130" fill="black"/><rect x="138" y="200" width="62" height="130" fill="black"/></mask>'
      : "";
    const hotStroke = hot
      ? '<g mask="url(#hot-'+id+')" filter="url(#goldGlow-'+id+')"><path d="'+body+'" fill="none" stroke="#E2C08A" stroke-width="2.35" stroke-linejoin="round" stroke-linecap="round"/></g>'
      : "";
    return '<svg class="body-svg" viewBox="0 0 200 500" aria-hidden="true"><defs>'+
      '<filter id="outlineGlow-'+id+'" x="-40%" y="-8%" width="180%" height="116%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
      '<filter id="goldGlow-'+id+'" x="-40%" y="-8%" width="180%" height="120%"><feGaussianBlur stdDeviation="5.5" result="b"/><feFlood flood-color="#C99E67" flood-opacity="0.7"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
      '<mask id="torso-'+id+'" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="200" height="500" fill="black"/><path d="'+body+'" fill="white"/><rect x="0" y="200" width="62" height="130" fill="black"/><rect x="138" y="200" width="62" height="130" fill="black"/></mask>'+
      hotMask+
      '</defs><ellipse cx="100" cy="490" rx="54" ry="6.5" fill="#00000055"/>'+
      '<path d="'+body+'" fill="#1a4c52" fill-opacity="0.16"/>'+
      '<g mask="url(#torso-'+id+')">'+bands+seams+'</g>'+
      interior+
      '<path d="'+body+'" fill="none" stroke="#F3FBFC" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" filter="url(#outlineGlow-'+id+')" opacity="0.95"/>'+
      hotStroke+
      '</svg>';
  }

  function drawLeaders(mapEl, svgEl, figEl){
    if (!mapEl || !svgEl || !figEl) return;
    const root = mapEl.getBoundingClientRect();
    const fig = figEl.getBoundingClientRect();
    const w = mapEl.clientWidth;
    const h = mapEl.clientHeight;
    if (!w || !h || !fig.width) return;
    svgEl.setAttribute("viewBox", "0 0 "+w+" "+h);
    svgEl.setAttribute("width", String(w));
    svgEl.setAttribute("height", String(h));
    const sx = fig.width / 200;
    const sy = fig.height / 500;
    const ox = fig.left - root.left;
    const oy = fig.top - root.top;
    const onBtn = mapEl.querySelector("button.on");
    const onId = onBtn ? onBtn.getAttribute("data-belt") : "";
    const parts = [];
    Object.keys(ANCHORS).forEach(id => {
      const btn = mapEl.querySelector('button[data-belt="'+id+'"]');
      if (!btn) return;
      const vx = ANCHORS[id][0], vy = ANCHORS[id][1];
      const br = btn.getBoundingClientRect();
      const x1 = ox + vx * sx;
      const y1 = oy + vy * sy;
      const x2 = br.left - root.left;
      const y2 = br.top - root.top + br.height / 2;
      const stub = Math.max(8, Math.min(18, (x2 - x1) * 0.18));
      const midX = x1 + stub;
      const d = "M"+x1.toFixed(1)+" "+y1.toFixed(1)+" L"+midX.toFixed(1)+" "+y1.toFixed(1)+" L"+(x2 - 6).toFixed(1)+" "+y2.toFixed(1)+" L"+x2.toFixed(1)+" "+y2.toFixed(1);
      const on = id === onId;
      const stroke = on ? "#E2C08A" : "#A9D4D8";
      const sw = on ? 1.85 : 1.35;
      const op = on ? 0.95 : 0.72;
      const r = on ? 3.4 : 2.7;
      const fill = on ? "#E2C08A" : "#D2EFF2";
      parts.push(
        '<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-opacity="'+op+'" stroke-linecap="round" stroke-linejoin="round"/>'+
        (on ? '<path d="'+d+'" fill="none" stroke="#E2C08A" stroke-width="4.5" stroke-opacity="0.22" stroke-linecap="round" stroke-linejoin="round"/>' : "")+
        '<circle cx="'+x1.toFixed(1)+'" cy="'+y1.toFixed(1)+'" r="'+r+'" fill="'+fill+'" fill-opacity="'+(on ? 1 : 0.9)+'"/>'+
        (on ? '<circle cx="'+x1.toFixed(1)+'" cy="'+y1.toFixed(1)+'" r="6" fill="none" stroke="#E2C08A" stroke-opacity="0.4" stroke-width="1"/>' : "")
      );
    });
    svgEl.innerHTML = parts.join("");
  }

  return { svgFigure, drawLeaders, ANCHORS };
});
