/* Byte-mode QR codes for Lab share links. ECC level L, versions 1–6. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_QR = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(function(){
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
function mul(a, b){ return (a && b) ? EXP[LOG[a] + LOG[b]] : 0; }
const GEN = {};
function generator(nsym){
  if (GEN[nsym]) return GEN[nsym];
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); }
    g = ng;
  }
  GEN[nsym] = g;
  return g;
}
function rs(data, nsym){
  const gen = generator(nsym);
  const res = data.concat(new Array(nsym).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j++) res[i + j] ^= mul(gen[j], coef);
  }
  return res.slice(data.length);
}
/* data codewords and ecc per block, level L */
const SPEC = {
  1: [{ d: 19, e: 7 }],
  2: [{ d: 34, e: 10 }],
  3: [{ d: 55, e: 15 }],
  4: [{ d: 80, e: 20 }],
  5: [{ d: 108, e: 26 }],
  6: [{ d: 68, e: 18 }, { d: 68, e: 18 }]
};
const ALIGN = { 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

function pushBits(bits, val, len){ for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
function bytesOf(text){
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c > 255) throw new Error("QR is byte mode");
    out.push(c);
  }
  return out;
}
function dataBits(raw, capBits){
  const bits = [];
  pushBits(bits, 0x4, 4);
  pushBits(bits, raw.length, 8);
  raw.forEach(b => pushBits(bits, b, 8));
  const term = Math.min(4, capBits - bits.length);
  for (let i = 0; i < term; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const pad = [0xec, 0x11];
  let p = 0;
  while (bits.length < capBits) { pushBits(bits, pad[p], 8); p ^= 1; }
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i + b];
    bytes.push(v);
  }
  return bytes;
}
function codewords(raw){
  const need = 4 + 8 + raw.length * 8;
  let version = 0;
  for (let v = 1; v <= 6; v++) {
    const cap = SPEC[v].reduce((n, b) => n + b.d, 0) * 8;
    if (cap >= need) { version = v; break; }
  }
  if (!version) throw new Error("Link is too long for a QR code");
  const blocks = SPEC[version];
  const bytes = dataBits(raw, blocks.reduce((n, b) => n + b.d, 0) * 8);
  let off = 0;
  const made = blocks.map(b => {
    const data = bytes.slice(off, off + b.d);
    off += b.d;
    return { data, ecc: rs(data, b.e) };
  });
  const out = [];
  const maxD = Math.max(...made.map(b => b.data.length));
  const maxE = Math.max(...made.map(b => b.ecc.length));
  for (let i = 0; i < maxD; i++) made.forEach(b => { if (i < b.data.length) out.push(b.data[i]); });
  for (let i = 0; i < maxE; i++) made.forEach(b => { if (i < b.ecc.length) out.push(b.ecc[i]); });
  const bits = [];
  out.forEach(v => pushBits(bits, v, 8));
  if (version >= 2 && version <= 6) for (let i = 0; i < 7; i++) bits.push(0);
  return { version, bits, bytes };
}
function blank(n){ const m = []; for (let r = 0; r < n; r++) m.push(new Array(n).fill(2)); return m; }
function finder(m, r, c){
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    const edge = i === 0 || j === 0 || i === 6 || j === 6;
    const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
    m[r + i][c + j] = (edge || inner) ? 1 : 0;
  }
}
function sep(m, n){
  const paint = (r, c) => { if (r >= 0 && c >= 0 && r < n && c < n && m[r][c] === 2) m[r][c] = 0; };
  for (let i = -1; i <= 7; i++) {
    paint(i, 7); paint(7, i);
    paint(i, n - 8); paint(7, n - 1 - i);
    paint(n - 8, i); paint(n - 1 - i, 7);
  }
}
function align(m, version){
  const pos = ALIGN[version];
  if (!pos) return;
  const skip = new Set([pos[0] + "," + pos[0], pos[0] + "," + pos[pos.length - 1], pos[pos.length - 1] + "," + pos[0]]);
  pos.forEach(x => pos.forEach(y => {
    if (skip.has(x + "," + y)) return;
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
      const edge = Math.abs(r) === 2 || Math.abs(c) === 2;
      m[x + r][y + c] = (edge || (r === 0 && c === 0)) ? 1 : 0;
    }
  }));
}
function functions(version){
  const n = 17 + 4 * version;
  const m = blank(n);
  finder(m, 0, 0); finder(m, 0, n - 7); finder(m, n - 7, 0);
  sep(m, n);
  align(m, version);
  for (let i = 0; i < n; i++) {
    if (m[6][i] === 2) m[6][i] = i % 2 === 0 ? 1 : 0;
    if (m[i][6] === 2) m[i][6] = i % 2 === 0 ? 1 : 0;
  }
  m[n - 8][8] = 1;
  for (let i = 0; i < 9; i++) { if (m[8][i] === 2) m[8][i] = 0; if (m[i][8] === 2) m[i][8] = 0; }
  for (let i = 0; i < 8; i++) { if (m[8][n - 1 - i] === 2) m[8][n - 1 - i] = 0; if (m[n - 1 - i][8] === 2) m[n - 1 - i][8] = 0; }
  return m;
}
function place(m, bits){
  const n = m.length;
  let idx = 0;
  for (let right = n - 1; right > 0; right -= 2) {
    if (right <= 6) right -= 1;
    for (let vertical = 0; vertical < n; vertical++) {
      for (let z = 0; z < 2; z++) {
        const j = right - z;
        let upwards = (right & 2) === 0;
        upwards ^= j < 6;
        const i = upwards ? (n - 1 - vertical) : vertical;
        if (m[i][j] === 2 && idx < bits.length) { m[i][j] = bits[idx]; idx++; }
      }
    }
  }
  return idx;
}
function formatBits(mask){
  let data = mask | 0x08;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}
function applyFormat(m, mask){
  const n = m.length, fmt = formatBits(mask);
  for (let i = 0; i < 8; i++) {
    let voff = 0, hoff = 0;
    if (i === 6) { voff = 1; hoff = 1; }
    const vbit = (fmt >> i) & 1;
    const hbit = (fmt >> (14 - i)) & 1;
    m[i + voff][8] = vbit;
    m[8][i + hoff] = hbit;
    m[8][n - 1 - i] = vbit;
    m[n - 1 - i][8] = hbit;
  }
  m[n - 8][8] = 1;
}
function masked(base, bits, mask){
  const n = base.length;
  const m = base.map(row => row.slice());
  place(m, bits);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (base[r][c] !== 2) continue;
    let on = false;
    if (mask === 0) on = (r + c) % 2 === 0;
    else if (mask === 1) on = r % 2 === 0;
    else if (mask === 2) on = c % 3 === 0;
    else if (mask === 3) on = (r + c) % 3 === 0;
    else if (mask === 4) on = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    else if (mask === 5) on = ((r * c) % 2 + (r * c) % 3) === 0;
    else if (mask === 6) on = (((r * c) % 2 + (r * c) % 3) % 2) === 0;
    else on = (((r + c) % 2 + (r * c) % 3) % 2) === 0;
    if (m[r][c] === 2) m[r][c] = 0;
    if (mask >= 0 && on) m[r][c] ^= 1;
  }
  return m;
}
function n3(seq){
  const pat = [1, 0, 1, 1, 1, 0, 1];
  const size = seq.length;
  const find = from => {
    for (let i = from; i <= size - 7; i++) {
      let ok = true;
      for (let k = 0; k < 7; k++) if (seq[i + k] !== pat[k]) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  };
  let count = 0, i = find(0);
  while (i !== -1) {
    const offset = i + 7;
    const left = seq.slice(Math.max(i - 4, 0), Math.min(i, size));
    const right = seq.slice(Math.max(offset, 0), Math.min(offset + 4, size));
    if (i === 0 || i === size - 7 || !left.some(Boolean) || !right.some(Boolean)) count += 40;
    else { i = find(i + 4); continue; }
    i = find(offset);
  }
  return count;
}
function penalty(m){
  const n = m.length;
  let n1 = 0, n2 = 0, n3s = 0, dark = 0;
  for (let i = 0; i < n; i++) {
    let rp = -1, cp = -1, rc = 0, cc = 0;
    const col = new Array(n);
    for (let j = 0; j < n; j++) {
      const rb = m[i][j], cb = m[j][i];
      col[j] = cb;
      dark += rb;
      if (rb === rp) rc++; else { if (rc >= 5) n1 += rc - 2; rc = 1; }
      if (cb === cp) cc++; else { if (cc >= 5) n1 += cc - 2; cc = 1; }
      if (i && j && rb === rp && rb === m[i - 1][j] && rb === m[i - 1][j - 1]) n2 += 3;
      rp = rb; cp = cb;
    }
    if (rc >= 5) n1 += rc - 2;
    if (cc >= 5) n1 += cc - 2;
    n3s += n3(m[i]) + n3(col);
  }
  const n4 = 10 * Math.floor(Math.abs(dark / (n * n) * 100 - 50) / 5);
  return n1 + n2 + n3s + n4;
}
function matrix(text, forceMask){
  const raw = bytesOf(String(text || ""));
  const packed = codewords(raw);
  const base = functions(packed.version);
  let best = null, score = Infinity, chosen = 0;
  const masks = forceMask == null ? [0, 1, 2, 3, 4, 5, 6, 7] : [forceMask];
  for (const mask of masks) {
    const m = masked(base, packed.bits, mask);
    const s = penalty(m);
    if (mask >= 0) applyFormat(m, mask);
    if (s < score) { score = s; best = m; chosen = mask; }
  }
  best.version = packed.version;
  best.mask = chosen;
  return best;
}
function draw(canvas, text){
  const m = matrix(text);
  const n = m.length, quiet = 4, scale = 4;
  const size = (n + quiet * 2) * scale;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#F3EDE4";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#02191E";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
  return m;
}
return { matrix, draw };
});
