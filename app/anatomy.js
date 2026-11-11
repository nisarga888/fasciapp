/* Shared FasciApp figure anatomy. ViewBox 0 0 200 500.
   ~7.5-head standing figure, androgynous, calm stance.
   Crown y=22, chin y=84, sole y=480. Center x=100. */
(function (global) {
  const CX = 100;

  function crPath(points, closed) {
    if (!points || points.length < 2) return "";
    const pts = points.map((p) => ({ x: p[0], y: p[1] }));
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

  function mirrorPts(pts, cx = CX) {
    return pts.map(([x, y]) => [cx - (x - cx), y]);
  }

  function closedFromRightSections(rightSections) {
    const rightPts = [];
    rightSections.forEach((sec, i) => {
      if (i === 0) rightPts.push(...sec);
      else rightPts.push(...sec.slice(1));
    });
    const left = mirrorPts(rightPts.slice(1, -1)).reverse();
    const corners = new Set();
    let acc = 0;
    rightSections.forEach((sec, i) => {
      if (i > 0) corners.add(acc);
      acc += i === 0 ? sec.length : sec.length - 1;
    });
    const all = [...rightPts, ...left];
    const out = [];
    const totalRight = rightPts.length;
    for (let i = 0; i < all.length; i++) {
      out.push(all[i]);
      if (corners.has(i) || corners.has(totalRight - 1 - i)) out.push(all[i]);
    }
    return crPath(out, true);
  }

  /* Front, right half. Hands are part of the arm loop so wrists stay continuous. */
  const FRONT_SECTIONS = [
    [ // crown → acromion: human jaw, flatter sides, shorter thicker neck
      [100, 22],
      [110, 23],
      [119, 30],
      [122, 42],
      [122, 58],   // straighter side, not an egg
      [120, 70],   // jaw angle stays wide
      [114, 80],
      [108, 85],   // chin corner
      [106, 88],   // under jaw
      [107, 98],
      [108, 108],  // neck base
      [116, 114],  // trap
      [130, 118],
      [144, 123]   // acromion
    ],
    [ // outer arm → hand with a clear thumb notch → inner wrist
      [144, 123],
      [154, 133],  // deltoid
      [158, 152],
      [159, 176],
      [160, 200],  // elbow
      [160, 228],
      [159, 252],
      [158, 268],  // outer wrist
      [161, 276],  // back of hand
      [163, 286],  // pinky knuckle
      [163, 296],
      [160, 302],  // fingertips
      [155, 302],
      [151, 298],  // inner fingers
      [150, 290],
      [150, 284],  // thumb web indent
      [145, 286],  // thumb tip
      [143, 280],
      [146, 274],  // thumb base
      [150, 268]   // inner wrist
    ],
    [ // inner arm → armpit
      [150, 268],
      [151, 252],
      [152, 228],
      [151, 200],
      [150, 176],
      [148, 152],
      [144, 134],
      [136, 126],  // armpit
      [128, 124]
    ],
    [ // torso → outer ankle: chest, waist, hip flare, thigh, knee, calf
      [128, 124],
      [134, 148],  // chest
      [132, 174],
      [128, 196],  // lower ribs
      [124, 214],  // waist
      [126, 230],  // iliac
      [134, 248],  // hip / trochanter
      [138, 276],
      [140, 308],  // mid-thigh, fuller
      [136, 340],
      [132, 372],  // knee, slightly narrower
      [134, 400],
      [136, 422],  // calf swell
      [132, 444],
      [126, 458]   // outer ankle
    ],
    [ // foot, modest turnout, planted, shorter
      [126, 458],
      [130, 466],
      [138, 474],
      [144, 478],  // little-toe side
      [140, 482],
      [128, 483],  // toe front
      [118, 481],  // hallux
      [114, 474],  // arch
      [116, 464],
      [118, 458]   // inner ankle
    ],
    [ // inner leg → soft-U crotch
      [118, 458],
      [120, 444],
      [122, 422],
      [122, 400],
      [120, 372],  // inner knee
      [122, 340],
      [122, 308],
      [120, 280],
      [116, 262],
      [108, 258],
      [100, 257]
    ]
  ];

  /* Back: rounder cranium, fuller traps, gluteal curve, heels. */
  const BACK_SECTIONS = [
    [
      [100, 22],
      [111, 23],
      [120, 31],
      [123, 44],
      [123, 60],
      [120, 74],
      [114, 86],
      [110, 92],
      [110, 104],
      [120, 114],
      [134, 118],
      [146, 123]
    ],
    [
      [146, 123],
      [156, 133],
      [160, 154],
      [161, 178],
      [162, 202],
      [162, 230],
      [161, 254],
      [160, 270],
      [163, 278],
      [165, 288],
      [165, 298],
      [162, 304],
      [157, 304],
      [153, 300],
      [152, 292],
      [152, 286],
      [147, 288],
      [145, 282],
      [148, 276],
      [152, 270]
    ],
    [
      [152, 270],
      [153, 254],
      [154, 230],
      [153, 202],
      [152, 178],
      [150, 154],
      [146, 136],
      [138, 128],
      [130, 126]
    ],
    [
      [130, 126],
      [136, 150],
      [134, 178],
      [130, 204],
      [128, 222],
      [132, 238],
      [140, 254],  // glute / hip, slightly fuller than front
      [142, 270],
      [140, 308],
      [136, 340],
      [132, 372],
      [134, 400],
      [136, 422],
      [132, 444],
      [126, 458]
    ],
    [ // heels, slight turnout, short
      [126, 458],
      [130, 468],
      [132, 476],
      [128, 482],
      [118, 483],
      [112, 478],
      [112, 468],
      [116, 458]
    ],
    [
      [116, 458],
      [118, 444],
      [120, 422],
      [120, 400],
      [118, 372],
      [120, 340],
      [121, 308],
      [122, 278],
      [118, 262],
      [108, 256],
      [100, 254]  // slightly higher gluteal cleft
    ]
  ];

  /* Right-facing side. Round skull, modest nose, athletic belly, real foot, visible seat. */
  const SIDE_BODY = [
    // crown → face → front of body → foot → back of body → occiput
    [102, 20],
    [114, 22],
    [124, 28],   // rounder crown
    [128, 38],   // forehead
    [128, 48],   // brow
    [129, 54],
    [135, 60],   // modest nose
    [132, 65],
    [131, 72],   // mouth
    [129, 80],
    [126, 86],   // chin
    [116, 90],   // under chin
    [114, 100],  // throat
    [116, 112],  // sternal notch (shorter neck)
    [126, 128],  // upper chest
    [133, 148],  // pec
    [131, 172],
    [127, 196],  // lower ribs
    [124, 218],  // waist, not pregnant
    [122, 236],
    [121, 256],  // pubic / front hip
    [126, 286],
    [128, 322],
    [126, 372],  // knee front
    [123, 408],
    [121, 436],
    [118, 456],  // front ankle
    [126, 462],  // instep
    [138, 468],  // ball
    [150, 472],  // toes
    [152, 478],
    [144, 482],
    [124, 483],  // sole
    [104, 482],
    [90, 478],   // heel bottom
    [82, 470],   // heel back
    [86, 460],
    [94, 454],   // Achilles / back ankle
    [90, 436],
    [80, 418],   // calf
    [84, 396],
    [92, 372],   // back of knee
    [88, 336],
    [84, 304],   // hamstring
    [82, 278],
    [76, 262],   // gluteal fold
    [70, 250],   // glute fullest
    [74, 232],
    [82, 214],   // lumbar (inward)
    [86, 192],
    [84, 166],
    [82, 142],   // behind scapula
    [84, 122],
    [90, 110],   // C7
    [92, 94],    // back of neck
    [86, 76],
    [74, 58],    // occiput, more spherical
    [80, 34],
    [90, 22]
  ];

  const SIDE_ARM = [
    [118, 114],
    [128, 118],  // acromion
    [138, 128],  // deltoid cap
    [142, 148],
    [143, 176],
    [144, 206],
    [146, 236],
    [148, 256],  // wrist
    [152, 268],
    [154, 282],  // fingers
    [150, 288],
    [144, 284],
    [140, 274],  // thumb
    [138, 262],
    [138, 250],
    [136, 226],
    [134, 196],
    [132, 168],
    [128, 142],
    [122, 126],
    [112, 116],
    [108, 112]
  ];

  const SIDE_FAR_LEG = [
    [92, 256],
    [96, 292],
    [98, 332],
    [96, 372],
    [94, 416],
    [96, 452],
    [108, 472],
    [102, 482],
    [86, 480],
    [76, 470],
    [78, 454],
    [74, 416],
    [78, 372],
    [76, 332],
    [74, 292],
    [80, 256]
  ];

  /* Interior line-art (front). */
  const FRONT_INTERIOR = {
    clavicleL: [[88, 120], [76, 124], [66, 132]],
    clavicleR: [[112, 120], [124, 124], [134, 132]],
    midline: [[100, 122], [100, 158], [100, 196], [100, 226]]
  };

  /* Belt y-ranges. Pelvic starts at the iliac crest, above the crotch. */
  const BELTS = [
    { id: "ocular",    y0: 20,  y1: 86,  mid: 62,  rx: 26, ry: 5,  label: "Ocular & Oral" },
    { id: "cervical",  y0: 86,  y1: 116, mid: 102, rx: 24, ry: 5.5, label: "Cervical" },
    { id: "thoracic",  y0: 116, y1: 200, mid: 156, rx: 48, ry: 10, label: "Thoracic & Diaphragmatic" },
    { id: "abdominal", y0: 200, y1: 238, mid: 218, rx: 36, ry: 8,  label: "Abdominal" },
    { id: "pelvic",    y0: 238, y1: 484, mid: 258, rx: 44, ry: 11, label: "Pelvic & Legs" }
  ];
  const PELVIC_Y = 238;

  function frontBodyD() { return closedFromRightSections(FRONT_SECTIONS); }
  function backBodyD() { return closedFromRightSections(BACK_SECTIONS); }
  function sideBodyD() { return crPath(SIDE_BODY, true); }
  function sideArmD() { return crPath(SIDE_ARM, true); }
  function sideFarLegD() { return crPath(SIDE_FAR_LEG, true); }

  function frontClipD() { return frontBodyD(); }
  function backClipD() { return backBodyD(); }
  function sideClipD() { return [sideBodyD(), sideArmD(), sideFarLegD()].join(" "); }

  const uid = () => Math.random().toString(36).slice(2, 8);

  function defsCommon(id) {
    return `
      <linearGradient id="bod-${id}" x1="0.15" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stop-color="#1e5860"/>
        <stop offset="45%" stop-color="#16464c"/>
        <stop offset="100%" stop-color="#0f3338"/>
      </linearGradient>
      <linearGradient id="bandMuteA-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1c555c"/>
        <stop offset="100%" stop-color="#17484e"/>
      </linearGradient>
      <linearGradient id="bandMuteB-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#153e44"/>
        <stop offset="100%" stop-color="#113438"/>
      </linearGradient>
      <linearGradient id="bandGold-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#E8C99A"/>
        <stop offset="40%" stop-color="#C99E67"/>
        <stop offset="100%" stop-color="#A87B45"/>
      </linearGradient>
      <linearGradient id="goldSheen-${id}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="45%" stop-color="#ffffff" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.16"/>
      </linearGradient>
      <linearGradient id="strokeGrad-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#9FD6D9"/>
        <stop offset="46%" stop-color="#7EB8BC"/>
        <stop offset="48%" stop-color="#D4B17A"/>
        <stop offset="100%" stop-color="#C99E67"/>
      </linearGradient>
      <linearGradient id="fillWash-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a4c52" stop-opacity="0.28"/>
        <stop offset="47%" stop-color="#1a4c52" stop-opacity="0.12"/>
        <stop offset="47%" stop-color="#C99E67" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#C99E67" stop-opacity="0.22"/>
      </linearGradient>
      <radialGradient id="vol-${id}" cx="38%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/>
        <stop offset="55%" stop-color="#ffffff" stop-opacity="0.03"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.12"/>
      </radialGradient>
      <filter id="goldGlow-${id}" x="-40%" y="-8%" width="180%" height="120%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feFlood flood-color="#C99E67" flood-opacity="0.7"/>
        <feComposite in2="b" operator="in" result="g"/>
        <feMerge>
          <feMergeNode in="g"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="ringGlow-${id}" x="-60%" y="-80%" width="220%" height="260%">
        <feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge>
          <feMergeNode in="b"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <clipPath id="clip-${id}"><path d="${frontClipD()}"/></clipPath>
      <clipPath id="legs-${id}"><rect x="0" y="${PELVIC_Y}" width="200" height="${500 - PELVIC_Y}"/></clipPath>
      <mask id="legsMask-${id}" maskUnits="userSpaceOnUse">
        <rect x="0" y="0" width="200" height="500" fill="black"/>
        <path d="${frontBodyD()}" fill="white"/>
        <rect x="0" y="0" width="200" height="${PELVIC_Y}" fill="black"/>
        <rect x="0" y="200" width="62" height="130" fill="black"/>
        <rect x="138" y="200" width="62" height="130" fill="black"/>
      </mask>
    `;
  }

  function ground() {
    return `<ellipse cx="100" cy="490" rx="54" ry="6.5" fill="#00000055"/>`;
  }

  function svgLineArt(extraId) {
    const id = "la-" + (extraId || uid());
    const body = frontBodyD();
    const interior = `
      <path d="${crPath(FRONT_INTERIOR.clavicleL)}" fill="none" stroke="#9FD6D9" stroke-width="0.9" stroke-linecap="round" opacity="0.35"/>
      <path d="${crPath(FRONT_INTERIOR.clavicleR)}" fill="none" stroke="#9FD6D9" stroke-width="0.9" stroke-linecap="round" opacity="0.35"/>
      <path d="${crPath(FRONT_INTERIOR.midline)}" fill="none" stroke="#9FD6D9" stroke-width="0.7" stroke-linecap="round" opacity="0.22"/>
    `;
    return `<svg class="body-svg" viewBox="0 0 200 500" aria-hidden="true">
      <defs>${defsCommon(id)}</defs>
      ${ground()}
      <path d="${body}" fill="#1a4c52" fill-opacity="0.18"/>
      <g mask="url(#legsMask-${id})" filter="url(#goldGlow-${id})">
        <path d="${body}" fill="#C99E67" fill-opacity="0.32"/>
      </g>
      ${interior}
      <path d="${body}" fill="none" stroke="#8EC9CE" stroke-width="2.15" stroke-linejoin="round" stroke-linecap="round"/>
      <g mask="url(#legsMask-${id})">
        <path d="${body}" fill="none" stroke="#C99E67" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>
      </g>
    </svg>`;
  }

  function svgSilhouette(extraId, beltId) {
    const id = "si-" + (extraId || uid());
    const body = frontBodyD();
    const belt = BELTS.find((b) => b.id === beltId) || null;
    const bands = BELTS.map((b, i) => {
      const hot = !!(belt && b.id === belt.id);
      const fill = hot ? `url(#bandGold-${id})` : (i % 2 === 0 ? `url(#bandMuteA-${id})` : `url(#bandMuteB-${id})`);
      const h = b.y1 - b.y0;
      const extra = hot ? `<rect x="0" y="${b.y0}" width="200" height="${h}" fill="url(#goldSheen-${id})"/>` : "";
      return `<rect x="0" y="${b.y0}" width="200" height="${h}" fill="${fill}"/>${extra}`;
    }).join("");
    const glow = belt
      ? `<g clip-path="url(#clip-${id})" filter="url(#goldGlow-${id})"><rect x="0" y="${belt.y0}" width="200" height="${belt.y1 - belt.y0}" fill="#C99E67" opacity="0.85"/></g>`
      : "";
    return `<svg class="body-svg" viewBox="0 0 200 500" aria-hidden="true">
      <defs>${defsCommon(id)}</defs>
      ${ground()}
      ${glow}
      <g clip-path="url(#clip-${id})">
        ${bands}
        <rect x="0" y="0" width="200" height="500" fill="url(#vol-${id})"/>
        <rect x="0" y="84" width="200" height="3" fill="#02191E" opacity="0.28"/>
        <rect x="0" y="114" width="200" height="3" fill="#02191E" opacity="0.28"/>
        <rect x="0" y="198" width="200" height="3" fill="#02191E" opacity="0.28"/>
        <rect x="0" y="236" width="200" height="3" fill="#F3EDE4" opacity="0.28"/>
        <!-- hanging hands stay the upper-body colour -->
        <rect x="0" y="200" width="62" height="130" fill="url(#bandMuteA-${id})"/>
        <rect x="138" y="200" width="62" height="130" fill="url(#bandMuteA-${id})"/>
      </g>
      <path d="${body}" fill="none" stroke="#9FD0D4" stroke-opacity="0.45" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  function ringPair(b, id, selected) {
    const cx = 100, cy = b.mid;
    const back = `M${(cx - b.rx).toFixed(1)} ${cy.toFixed(1)} A${b.rx} ${b.ry} 0 0 1 ${(cx + b.rx).toFixed(1)} ${cy.toFixed(1)}`;
    const front = `M${(cx - b.rx).toFixed(1)} ${cy.toFixed(1)} A${b.rx} ${b.ry} 0 0 0 ${(cx + b.rx).toFixed(1)} ${cy.toFixed(1)}`;
    if (selected) {
      return {
        back: `<path d="${back}" fill="none" stroke="#E2C08A" stroke-width="1.6" stroke-opacity="0.45" stroke-linecap="round"/>`,
        front: `<path d="${front}" fill="none" stroke="#F0D7A4" stroke-width="2.6" stroke-linecap="round" filter="url(#ringGlow-${id})"/>
                <path d="${front}" fill="none" stroke="#C99E67" stroke-width="1.2" stroke-linecap="round"/>`
      };
    }
    return {
      back: `<path d="${back}" fill="none" stroke="#7EB8BC" stroke-width="1.2" stroke-opacity="0.28" stroke-linecap="round"/>`,
      front: `<path d="${front}" fill="none" stroke="#9FD6D9" stroke-width="1.8" stroke-opacity="0.8" stroke-linecap="round" filter="url(#ringGlow-${id})"/>`
    };
  }

  function svgRings(extraId) {
    const id = "ri-" + (extraId || uid());
    const body = frontBodyD();
    const rings = BELTS.map((b) => ringPair(b, id, b.id === "pelvic"));
    const thigh = ringPair({ mid: 338, rx: 40, ry: 9 }, id, true);
    const backs = rings.map((r) => r.back).join("") + thigh.back;
    const fronts = rings.map((r) => r.front).join("") + thigh.front;
    return `<svg class="body-svg" viewBox="0 0 200 500" aria-hidden="true">
      <defs>${defsCommon(id)}</defs>
      ${ground()}
      <g>${backs}</g>
      <path d="${body}" fill="url(#bod-${id})"/>
      <rect x="0" y="0" width="200" height="500" fill="url(#vol-${id})" clip-path="url(#clip-${id})"/>
      <path d="${body}" fill="none" stroke="#9FD0D4" stroke-opacity="0.4" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
      <g>${fronts}</g>
    </svg>`;
  }

  function svgLinesView(view, extraId) {
    const id = `ln-${view}-` + (extraId || uid());
    let body = "";
    let clip = "";
    if (view === "front") {
      body = `<path class="body" d="${frontBodyD()}"/>`;
      clip = frontClipD();
    } else if (view === "back") {
      body = `<path class="body" d="${backBodyD()}"/>`;
      clip = backClipD();
    } else {
      body = `<path class="far" d="${sideFarLegD()}"/>
              <path class="body" d="${sideBodyD()}"/>
              <path class="arm" d="${sideArmD()}"/>`;
      clip = sideClipD();
    }
    return { id, body, clip };
  }

  // Compatibility stubs (hands are now in the body path)
  function rightHandFrontD() { return ""; }
  function leftHandFrontD() { return ""; }
  function rightHandBackD() { return ""; }
  function leftHandBackD() { return ""; }

  global.FasciAnatomy = {
    crPath,
    mirrorPts,
    frontBodyD,
    backBodyD,
    sideBodyD,
    sideArmD,
    sideFarLegD,
    rightHandFrontD,
    leftHandFrontD,
    rightHandBackD,
    leftHandBackD,
    frontClipD,
    backClipD,
    sideClipD,
    svgLineArt,
    svgSilhouette,
    svgRings,
    svgLinesView,
    BELTS,
    PELVIC_Y,
    FRONT_SECTIONS,
    BACK_SECTIONS,
    SIDE_BODY,
    SIDE_ARM,
    SIDE_FAR_LEG
  };
})(typeof window !== "undefined" ? window : globalThis);
