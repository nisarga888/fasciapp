/* Original schematic silhouettes for the MER reading.
   Drawn for FasciApp. Not a tracing of a third-party figure. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_LINES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
function crPath(points, closed) {
  if (!points || points.length < 2) return "";
  const pts = points.map(p => ({ x: p[0], y: p[1] }));
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}L${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  const src = pts.slice();
  if (closed) {
    src.unshift(pts[pts.length - 1]);
    src.push(pts[0], pts[1]);
  } else {
    src.unshift(pts[0]);
    src.push(pts[pts.length - 1]);
  }
  const n = src.length;
  let d = `M${src[1].x.toFixed(1)} ${src[1].y.toFixed(1)}`;
  for (let i = 0; i < n - 3; i++) {
    const p0 = src[i], p1 = src[i + 1], p2 = src[i + 2], p3 = src[i + 3];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  if (closed) d += "Z";
  return d;
}

function mirrorPts(pts, cx = 100) {
  return pts.map(([x, y]) => [cx - (x - cx), y]);
}

function closedFromRight(rightPts) {
  const left = mirrorPts(rightPts.slice(1, -1)).reverse();
  return crPath([...rightPts, ...left], true);
}
function joinedCR(sections, closed) {
  if (!sections.length) return "";
  let d = crPath(sections[0], false);
  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    const rest = crPath(sec, false).replace(/^M[\d.\s-]+/, "");
    d += rest;
  }
  if (closed) d += "Z";
  return d;
}

function closedFromRightSections(rightSections) {
  // rightSections go from crown to crotch; mirror for left, then close
  const rightPts = [];
  rightSections.forEach((sec, i) => {
    if (i === 0) rightPts.push(...sec);
    else rightPts.push(...sec.slice(1));
  });
  const left = mirrorPts(rightPts.slice(1, -1)).reverse();
  // Rebuild as one CR path but with sharp corners where sections break on the right,
  // and the mirrored breaks on the left. Simpler: single CR on all points,
  // after inserting duplicated corner points at section joints.
  const corners = new Set();
  let acc = 0;
  rightSections.forEach((sec, i) => {
    if (i > 0) corners.add(acc);
    acc += (i === 0 ? sec.length : sec.length - 1);
  });
  const all = [...rightPts, ...left];
  // duplicate joint points of the right half, and their mirrored counterparts
  const out = [];
  const totalRight = rightPts.length;
  for (let i = 0; i < all.length; i++) {
    out.push(all[i]);
    if (corners.has(i) || corners.has(totalRight - 1 - i)) {
      out.push(all[i]);
    }
  }
  return crPath(out, true);
}



/* ---------- body outlines ---------- */
/* 8-head figure, crown ~20, sole ~478, viewBox 0 0 200 500 */

/* Sharper joints at armpit (idx marks are used by closedFromRightSections). */
const FRONT_SECTIONS = [
  [ // crown → acromion
    [100, 20],
    [111, 23],
    [119, 34],
    [120, 50],
    [116, 64],
    [109, 74],
    [107, 86],
    [114, 96],
    [132, 100],
    [150, 104]
  ],
  [ // outer arm → wrist
    [150, 104],
    [158, 114],
    [162, 136],
    [165, 162],
    [167, 190],
    [170, 224],
    [172, 246]
  ],
  [ // inner arm → armpit
    [162, 246],
    [160, 224],
    [156, 190],
    [152, 150],
    [146, 122]
  ],
  [ // torso → outer ankle (pinched)
    [146, 122],
    [140, 140],
    [136, 168],
    [132, 194],
    [134, 216],
    [141, 236],
    [140, 272],
    [136, 316],
    [130, 360],
    [128, 400],
    [127, 436],
    [128, 450]
  ],
  [ // foot, slightly turned out
    [128, 450],
    [132, 456],
    [142, 462],
    [152, 468],
    [154, 475],
    [148, 479],
    [136, 479],
    [124, 476],
    [116, 470],
    [113, 460],
    [112, 450]
  ],
  [ // inner leg → crotch
    [112, 450],
    [113, 436],
    [114, 400],
    [116, 360],
    [118, 316],
    [116, 274],
    [113, 250],
    [100, 246]
  ]
];

const BACK_SECTIONS = [
  [
    [100, 20],
    [111, 23],
    [119, 34],
    [120, 50],
    [116, 64],
    [109, 74],
    [107, 86],
    [114, 96],
    [132, 100],
    [150, 104]
  ],
  [
    [150, 104],
    [158, 114],
    [162, 136],
    [165, 162],
    [167, 190],
    [170, 224],
    [172, 246]
  ],
  [
    [162, 246],
    [160, 224],
    [156, 190],
    [152, 150],
    [146, 122]
  ],
  [
    [146, 122],
    [141, 142],
    [137, 170],
    [135, 196],
    [140, 218],
    [146, 238],
    [144, 274],
    [137, 316],
    [130, 360],
    [128, 400],
    [127, 436],
    [128, 450]
  ],
  [ // heels, seen from behind
    [128, 450],
    [132, 460],
    [134, 470],
    [130, 478],
    [120, 479],
    [112, 474],
    [110, 462],
    [111, 450]
  ],
  [
    [111, 450],
    [113, 436],
    [114, 400],
    [116, 360],
    [119, 316],
    [120, 278],
    [114, 254],
    [106, 249],
    [100, 248]
  ]
];

const SIDE_BODY = [
  [98, 18],
  [112, 22],
  [120, 30],
  [122, 38],
  [124, 42],
  [131, 46],
  [129, 50],
  [126, 54],
  [129, 62],
  [124, 70],
  [116, 76],
  [116, 88],
  [122, 98],
  [130, 114],
  [133, 134],
  [131, 158],
  [126, 182],
  [126, 208],
  [128, 226],
  [126, 248],
  [124, 292],
  [126, 332],
  [124, 360],
  [122, 402],
  [124, 436],
  [126, 448],
  [136, 454],
  [148, 462],
  [154, 470],
  [152, 476],
  [140, 478],
  [124, 474],
  [108, 476],
  [90, 478],
  [74, 476],
  [66, 468],
  [66, 458],
  [74, 450],
  [76, 422],
  [73, 388],
  [78, 360],
  [80, 322],
  [78, 282],
  [72, 252],
  [65, 234],
  [68, 218],
  [76, 198],
  [74, 160],
  [72, 122],
  [74, 100],
  [82, 88],
  [86, 74],
  [80, 58],
  [80, 38],
  [88, 24]
];

const SIDE_ARM = [
  [118, 100],
  [130, 110],
  [138, 140],
  [142, 176],
  [146, 214],
  [148, 246],
  [151, 258],
  [156, 266],
  [158, 278],
  [152, 280],
  [146, 274],
  [144, 264],
  [142, 250],
  [138, 214],
  [134, 176],
  [128, 142],
  [118, 118],
  [104, 104],
  [108, 96]
];

const SIDE_FAR_LEG = [
  [86, 226],
  [88, 270],
  [90, 320],
  [88, 360],
  [86, 400],
  [88, 428],
  [80, 428],
  [74, 400],
  [76, 360],
  [78, 320],
  [78, 270],
  [76, 228]
];

function frontBodyD() { return closedFromRightSections(FRONT_SECTIONS); }
function backBodyD() { return closedFromRightSections(BACK_SECTIONS); }

/* Mitten + thumb, drawn separately so Catmull-Rom on the arm doesn't swallow it. */
const RIGHT_HAND_FRONT = [
  [163, 246],
  [171, 246],
  [174, 256],
  [175, 268],
  [174, 278],
  [174, 278],
  [168, 281],
  [164, 276],
  [158, 269],
  [158, 269],
  [161, 264],
  [163, 254]
];
const RIGHT_HAND_BACK = [
  [163, 246],
  [171, 246],
  [174, 256],
  [175, 268],
  [174, 278],
  [174, 278],
  [168, 281],
  [164, 276],
  [158, 269],
  [158, 269],
  [161, 264],
  [163, 254]
];
function handsD(right) {
  const left = mirrorPts(right);
  return `<path class="body" d="${crPath(right, true)}"/><path class="body" d="${crPath(left, true)}"/>`;
}


/* ---------- fascia line paths per view ---------- */
/* Each value is an array of polylines (arrays of points). */

const LINES = {
  front: {
    sfl: {
      full: [
        [[78, 477], [80, 456], [78, 414], [84, 360], [82, 300], [80, 252], [88, 232]],
        [[122, 477], [120, 456], [122, 414], [116, 360], [118, 300], [120, 252], [112, 232]],
        [[88, 232], [100, 228], [112, 232], [108, 200], [104, 168], [100, 148], [100, 116]],
        [[100, 116], [92, 86], [84, 64], [82, 52]],
        [[100, 116], [108, 86], [116, 64], [118, 52]],
        [[82, 52], [86, 28], [100, 16], [114, 28], [118, 52]]
      ],
      upper: [
        [[100, 148], [100, 116], [92, 86], [84, 64], [82, 52]],
        [[100, 148], [100, 116], [108, 86], [116, 64], [118, 52]],
        [[82, 52], [86, 28], [100, 16], [114, 28], [118, 52]]
      ],
      lower: [
        [[78, 477], [80, 456], [78, 414], [84, 360], [82, 300], [80, 252], [88, 232]],
        [[122, 477], [120, 456], [122, 414], [116, 360], [118, 300], [120, 252], [112, 232]],
        [[88, 232], [100, 228], [112, 232], [108, 200], [104, 168], [100, 148]]
      ]
    },
    sbl: { full: [] },
    lateral: {
      full: [
        [[66, 474], [62, 454], [60, 414], [62, 360], [58, 300], [60, 236], [56, 196], [54, 150], [58, 118], [72, 96], [84, 74], [88, 54]],
        [[134, 474], [138, 454], [140, 414], [138, 360], [142, 300], [140, 236], [144, 196], [146, 150], [142, 118], [128, 96], [116, 74], [112, 54]]
      ]
    },
    spiral: {
      full: [
        [[128, 132], [100, 176], [80, 224], [68, 300], [70, 360], [76, 414], [88, 476]],
        [[72, 132], [100, 176], [120, 224], [132, 300], [130, 360], [124, 414], [112, 476]]
      ],
      upper: [
        [[128, 132], [100, 176], [86, 208]],
        [[72, 132], [100, 176], [114, 208]]
      ],
      lower: [
        [[86, 208], [80, 224], [68, 300], [70, 360], [76, 414], [88, 476]],
        [[114, 208], [120, 224], [132, 300], [130, 360], [124, 414], [112, 476]]
      ]
    },
    arm: {
      full: [
        [[100, 132], [74, 118], [54, 104], [40, 142], [34, 190], [30, 248], [28, 278]],
        [[100, 132], [126, 118], [146, 104], [160, 142], [166, 190], [170, 248], [172, 278]]
      ]
    },
    dfl: {
      full: [
        [[94, 476], [94, 454], [92, 414], [94, 360], [96, 300], [98, 252], [100, 238]],
        [[106, 476], [106, 454], [108, 414], [106, 360], [104, 300], [102, 252], [100, 238]],
        [[100, 238], [88, 210], [80, 184], [76, 168]],
        [[100, 238], [112, 210], [120, 184], [124, 168]],
        [[76, 168], [90, 152], [100, 146], [110, 152], [124, 168]],
        [[100, 146], [100, 118], [100, 90], [100, 72]],
        [[100, 72], [110, 66], [118, 60]],
        [[100, 72], [90, 66], [82, 60]]
      ]
    },
    functional: {
      full: [
        [[70, 118], [100, 172], [118, 250]],
        [[130, 118], [100, 172], [82, 250]]
      ]
    }
  },
  back: {
    sbl: {
      full: [
        [[84, 476], [84, 454], [82, 400], [84, 360], [86, 304], [88, 252], [96, 228]],
        [[116, 476], [116, 454], [118, 400], [116, 360], [114, 304], [112, 252], [104, 228]],
        [[96, 228], [100, 222], [104, 228]],
        [[100, 222], [98, 180], [97, 132], [98, 96], [100, 48], [100, 22]],
        [[100, 222], [102, 180], [103, 132], [102, 96], [100, 48]]
      ]
    },
    sfl: { full: [] },
    lateral: {
      full: [
        [[66, 474], [62, 454], [60, 414], [62, 360], [58, 300], [64, 240], [56, 196], [54, 150], [58, 118], [72, 96], [84, 74], [88, 48]],
        [[134, 474], [138, 454], [140, 414], [138, 360], [142, 300], [136, 240], [144, 196], [146, 150], [142, 118], [128, 96], [116, 74], [112, 48]]
      ]
    },
    spiral: {
      full: [
        [[88, 32], [96, 72], [118, 124], [132, 156], [142, 176]],
        [[112, 32], [104, 72], [82, 124], [68, 156], [58, 176]],
        [[58, 176], [70, 210], [88, 236], [84, 300], [82, 360], [78, 414], [86, 476]],
        [[142, 176], [130, 210], [112, 236], [116, 300], [118, 360], [122, 414], [114, 476]]
      ],
      upper: [
        [[88, 32], [96, 72], [118, 124], [132, 156], [142, 176]],
        [[112, 32], [104, 72], [82, 124], [68, 156], [58, 176]]
      ],
      lower: [
        [[58, 176], [70, 210], [88, 236], [84, 300], [82, 360], [78, 414], [86, 476]],
        [[142, 176], [130, 210], [112, 236], [116, 300], [118, 360], [122, 414], [114, 476]]
      ]
    },
    arm: {
      full: [
        [[78, 148], [64, 128], [56, 112], [40, 142], [34, 190], [30, 248], [28, 278]],
        [[122, 148], [136, 128], [144, 112], [160, 142], [166, 190], [170, 248], [172, 278]]
      ]
    },
    dfl: { full: [] },
    functional: {
      full: [
        [[68, 148], [100, 220], [120, 252], [126, 320]],
        [[132, 148], [100, 220], [80, 252], [74, 320]]
      ]
    }
  },
  side: {
    sbl: {
      full: [
        [[70, 470], [74, 452], [74, 412], [80, 360], [78, 300], [70, 250], [68, 230], [74, 210], [76, 160], [74, 120], [82, 92], [80, 58], [80, 36], [98, 18], [120, 26], [126, 42]]
      ]
    },
    sfl: {
      full: [
        [[150, 476], [128, 470], [122, 452], [120, 412], [124, 360], [122, 292], [126, 226], [122, 186], [128, 136], [118, 92], [120, 70], [124, 42], [110, 20], [98, 18]]
      ],
      upper: [
        [[128, 136], [118, 92], [120, 70], [124, 42], [110, 20], [98, 18]]
      ],
      lower: [
        [[150, 476], [128, 470], [122, 452], [120, 412], [124, 360], [122, 292], [126, 226], [122, 186], [128, 136]]
      ]
    },
    lateral: {
      full: [
        [[102, 476], [100, 454], [100, 414], [104, 360], [100, 292], [100, 236], [102, 188], [102, 140], [100, 100], [102, 56]]
      ]
    },
    spiral: {
      full: [
        [[82, 40], [90, 82], [108, 126], [124, 152], [118, 186], [108, 226], [100, 292], [104, 360], [100, 414], [96, 470]]
      ],
      upper: [
        [[82, 40], [90, 82], [108, 126], [124, 152], [118, 186]]
      ],
      lower: [
        [[118, 186], [108, 226], [100, 292], [104, 360], [100, 414], [96, 470]]
      ]
    },
    arm: {
      full: [
        [[128, 132], [108, 108], [96, 100], [128, 142], [142, 180], [148, 220], [150, 250], [154, 276]],
        [[76, 140], [96, 100]]
      ]
    },
    dfl: {
      full: [
        [[90, 474], [96, 454], [100, 414], [102, 360], [100, 300], [114, 248], [120, 222], [118, 192], [114, 168], [122, 140], [120, 96], [122, 72], [128, 58]]
      ]
    },
    functional: {
      full: [
        [[126, 120], [118, 186], [108, 250]]
      ]
    }
  }
};


function segsFor(view, id, litSet, upperOnly) {
  const spec = LINES[view][id];
  if (!spec) return { dim: [], lit: [] };
  const isLit = litSet.has(id);
  const upper = !!(upperOnly && upperOnly[id] && spec.upper);
  if (!isLit) {
    return { dim: spec.full || [], lit: [] };
  }
  if (upper) {
    return { dim: spec.lower || [], lit: spec.upper };
  }
  return { dim: [], lit: spec.full || [] };
}

function lineGroup(segs, kind) {
  if (!segs.length) return "";
  const cls = kind === "lit" ? "lit" : "dim";
  let h = `<g class="${cls}">`;
  for (const s of segs) {
    if (!s || s.length < 2) continue;
    h += `<path d="${crPath(s, false)}"/>`;

  }
  return h + "</g>";
}


function figureSVG(view, spec){
  const litSet = new Set(spec.lit||[]);
  const ids = ["functional","spiral","sbl","sfl","dfl","lateral","arm"];
  let dim = [], lit = [];
  for (const id of ids) {
    const s = segsFor(view, id, litSet, spec.upper||{});
    dim = dim.concat(s.dim);
    lit = lit.concat(s.lit);
  }
  let shape = "";
  if (view === "front") shape = '<path class="body" d="'+frontBodyD()+'"/>'+handsD(RIGHT_HAND_FRONT);
  else if (view === "back") shape = '<path class="body" d="'+backBodyD()+'"/>'+handsD(RIGHT_HAND_BACK);
  else shape = '<path class="far" d="'+crPath(SIDE_FAR_LEG, true)+'"/><path class="body" d="'+crPath(SIDE_BODY, true)+'"/><path class="arm" d="'+crPath(SIDE_ARM, true)+'"/>';
  const suf = view;
  const clipId = "lnclip-"+suf;
  const bodyClipD = view === "front" ? frontBodyD()+" "+crPath(RIGHT_HAND_FRONT, true)+" "+crPath(mirrorPts(RIGHT_HAND_FRONT), true)
    : view === "back" ? backBodyD()+" "+crPath(RIGHT_HAND_BACK, true)+" "+crPath(mirrorPts(RIGHT_HAND_BACK), true)
    : crPath(SIDE_BODY, true)+" "+crPath(SIDE_ARM, true)+" "+crPath(SIDE_FAR_LEG, true);
  return '<svg viewBox="0 0 200 500" role="img" aria-label="'+view+' view"><defs><linearGradient id="bod-'+suf+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a4d54"/><stop offset="55%" stop-color="#143c42"/><stop offset="100%" stop-color="#102f34"/></linearGradient><filter id="glow-'+suf+'" x="-40%" y="-20%" width="180%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="'+clipId+'"><path d="'+bodyClipD+'"/></clipPath></defs><ellipse class="ground" cx="100" cy="486" rx="48" ry="7"/>'+shape+'<g clip-path="url(#'+clipId+')">'+lineGroup(dim,"dim")+'</g>'+lineGroup(lit,"lit")+'<style>.ground{fill:#00000055}.body,.arm{fill:url(#bod-'+suf+');stroke:#c9a06a55;stroke-width:1.15}.far{fill:#102f34;stroke:#c9a06a33;stroke-width:1}.dim path{fill:none;stroke:#c9a06a;stroke-opacity:.13;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}.lit path{fill:none;stroke:#f0d7a4;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round;filter:url(#glow-'+suf+')}</style></svg>';
}

LINES.front.lateral.upper = [
  [[60,236],[56,196],[54,150],[58,118],[72,96],[84,74],[88,54]],
  [[140,236],[144,196],[146,150],[142,118],[128,96],[116,74],[112,54]]
];
LINES.front.lateral.lower = [
  [[66,474],[62,454],[60,414],[62,360],[58,300],[60,236]],
  [[134,474],[138,454],[140,414],[138,360],[142,300],[140,236]]
];
LINES.back.lateral.upper = [
  [[64,240],[56,196],[54,150],[58,118],[72,96],[84,74],[88,48]],
  [[136,240],[144,196],[146,150],[142,118],[128,96],[116,74],[112,48]]
];
LINES.back.lateral.lower = [
  [[66,474],[62,454],[60,414],[62,360],[58,300],[64,240]],
  [[134,474],[138,454],[140,414],[138,360],[142,300],[136,240]]
];
LINES.side.lateral.upper = [[[102,188],[102,140],[100,100],[102,56]]];
LINES.side.lateral.lower = [[[102,476],[100,454],[100,414],[104,360],[100,292],[100,236],[102,188]]];

const CHIPS = [
  {id:"sbl", label:"Superficial Back"},
  {id:"sfl", label:"Superficial Front"},
  {id:"lateral", label:"Lateral"},
  {id:"spiral", label:"Spiral"},
  {id:"arm", label:"Arm lines"},
  {id:"dfl", label:"Deep Front"},
  {id:"functional", label:"Functional"}
];
const PLANS = {
  MER2: {lit:["sbl","lateral"], upper:{}, items:[
    {id:"sbl", title:"Superficial Back line", route:"Feet → calves → hamstrings → spine", why:p=>"Load through "+p+" often travels along the calves, hamstrings and spine."},
    {id:"lateral", title:"Lateral line", route:"Outer ankle → IT band → hip", why:p=>"Standing and walking with "+p+" also shares work along the outer thigh and hip."}
  ]},
  MER4: {lit:["dfl","sfl"], upper:{sfl:true}, items:[
    {id:"dfl", title:"Deep Front line", route:"Inner leg → psoas → diaphragm → throat → jaw", why:p=>p+" can connect downward through the deep core toward the jaw."},
    {id:"sfl", title:"Superficial Front line", route:"Chest → neck → scalp", why:p=>"The front of the chest and neck can meet around "+p+"."}
  ]},
  MER5: {lit:["arm","spiral"], upper:{spiral:true}, items:[
    {id:"arm", title:"Arm lines", route:"Chest and upper back → shoulders → hands", why:p=>"Holding around "+p+" often continues into the arms and hands."},
    {id:"spiral", title:"Spiral line", route:"Skull → rhomboids → opposite ribs", why:p=>"This wrap around the rib cage can meet near "+p+"."}
  ]},
  MER1: {lit:["sfl","lateral"], upper:{sfl:true, lateral:true}, items:[
    {id:"sfl", title:"Superficial Front line", route:"Chest → neck → scalp", why:p=>"The front of the neck can meet "+p+" between the chest and the base of the skull."},
    {id:"lateral", title:"Lateral line", route:"Side of the neck → ribs → outer shoulder", why:p=>"The side of the neck and the outer shoulder also share the work around "+p+"."}
  ]},
  MER3: {lit:["dfl","functional"], upper:{}, items:[
    {id:"dfl", title:"Deep Front line", route:"Inner leg → psoas → diaphragm", why:p=>p+" can sit along the deep core, from the inner leg through the diaphragm."},
    {id:"functional", title:"Functional line", route:"Shoulder → trunk → opposite hip", why:p=>p+" can pull diagonally across the trunk toward the opposite hip."}
  ]}
};
function placeOf(reading){
  const areas = reading && reading.painAreas || [];
  const named = areas.map(x=>String(x||"").trim()).filter(Boolean).slice(0,2);
  if (named.length) return named.join(" and ");
  const c = String(reading && reading.complaint || "").replace(/\s+/g," ").trim();
  if (c) return c.length>72 ? c.slice(0,69)+"…" : c;
  return "the reported area";
}
function planFor(manualId){ return PLANS[manualId] || PLANS.MER2; }
function render(manualId, reading){
  const plan = planFor(manualId);
  const spec = {lit:plan.lit, upper:plan.upper};
  const place = placeOf(reading||{});
  const views = [["front","Front"],["back","Back"],["side","Side"]];
  const figs = views.map(([v,label])=>'<figure>'+figureSVG(v, spec)+'<figcaption>'+label+'</figcaption></figure>').join("");
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const sentence=s=>{s=String(s||""); return s?s.charAt(0).toUpperCase()+s.slice(1):s;};
  const items = plan.items.map(it=>'<div class="lnItem"><i></i><div><h3>'+esc(it.title)+'</h3><p class="lnRoute">'+esc(it.route)+'</p><p class="lnWhy">'+esc(sentence(it.why(place)))+'</p></div></div>').join("");
  const chips = CHIPS.map(c=>'<span'+(plan.lit.indexOf(c.id)>=0?' class="on"':'')+'>'+c.label+'</span>').join("");
  return {figs, items, chips, place, lit:plan.lit.slice()};
}
return {render, planFor, placeOf, PLANS, CHIPS};
});
