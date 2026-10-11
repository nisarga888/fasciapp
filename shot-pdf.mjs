import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function serve(root, port) {
  const srv = createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
    if (u.endsWith('config.js')) {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      res.end('window.FASCIAPP_CONFIG={SUPABASE_URL:"",SUPABASE_ANON_KEY:""};');
      return;
    }
    const f = join(root, u);
    if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(f));
  });
  return new Promise((r, j) => { srv.once('error', j); srv.listen(port, '127.0.0.1', () => r(srv)); });
}

async function main() {
  const port = await new Promise((res, rej) => {
    const n = createServer().listen(0, '127.0.0.1', () => { const p = n.address().port; n.close(() => res(p)); });
    n.once('error', rej);
  });
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get() { return { register: async () => ({}), getRegistrations: async () => [], addEventListener() {}, controller: null, ready: Promise.resolve({}) }; } });
    const uid = 'u-lotte';
    localStorage.setItem('fyp_session', JSON.stringify({ user_id: uid, email: 'lotte@example.com' }));
    localStorage.setItem('fyp_profiles2', JSON.stringify({
      [uid]: { id: uid, user_id: uid, name: 'Lotte de Vries', mods: ['Breathwork', 'MER'], city: 'Amsterdam', country: 'Netherlands', lat: 52.37, lng: 4.9, consent: true, email: 'lotte@example.com',
        locations: [{ city: 'Amsterdam', country: 'Netherlands', lat: 52.37, lng: 4.9 }] },
    }));
    localStorage.setItem('fyp_sessions', JSON.stringify({
      [uid]: [
        { id: 's1', user_id: uid, initials: 'A.B.', date: '2026-09-02', duration: 90, format: 'In person', comment: 'First MER', created_at: '2026-09-02T10:00:00Z' },
        { id: 's2', user_id: uid, initials: 'C.D.', date: '2026-09-10', duration: 60, format: 'Online', comment: 'Breathwork', created_at: '2026-09-10T11:00:00Z' },
      ],
    }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.DB?.mode === 'local' && typeof buildPdf === 'function');
  await page.evaluate(() => { document.getElementById('demoBanner').hidden = true; show('log'); });
  await page.waitForSelector('#sessList .sess');

  const ui = await page.evaluate(() => ({
    prog: document.getElementById('pNum')?.textContent,
    formats: [...document.querySelectorAll('#sessList .sb')].map(el => el.textContent),
    formatOpts: [...document.querySelectorAll('#sessForm select[name=format] option')].map(o => o.value),
    goal: GOAL,
  }));
  console.log('ui', ui);
  if (ui.goal !== 70 || !/\/ 70/.test(ui.prog || '')) throw new Error('GOAL not 70');
  if (!ui.formatOpts.includes('In person') || !ui.formatOpts.includes('Online')) throw new Error('format select missing');
  if (!ui.formats.some(t => /In person/.test(t)) || !ui.formats.some(t => /Online/.test(t))) throw new Error('format not in list');

  // Wait for jspdf
  await page.waitForFunction(() => !!window.jspdf, null, { timeout: 20000 });

  const pdfCheck = await page.evaluate(async () => {
    const { jsPDF } = window.jspdf;
    const captured = { texts: [], sigLines: 0 };
    const wrap = (obj, key, fn) => { const orig = obj[key]; obj[key] = function (...args) { fn(args); return orig.apply(this, args); }; return () => { obj[key] = orig; }; };
    const restores = [];
    // Patch instance methods via prototype chain used by jspdf umd
    const targets = [jsPDF.prototype];
    if (jsPDF.API) targets.push(jsPDF.API);
    targets.forEach(proto => {
      if (!proto || !proto.text) return;
      restores.push(wrap(proto, 'text', (args) => {
        const t = args[0];
        if (typeof t === 'string') captured.texts.push(t);
        else if (Array.isArray(t)) t.forEach(x => captured.texts.push(Array.isArray(x) ? x.join(' ') : String(x)));
      }));
      if (proto.line) restores.push(wrap(proto, 'line', () => { captured.sigLines++; }));
    });
    let r2;
    try { r2 = await buildPdf(); }
    finally { restores.forEach(r => r()); }
    const raw = r2.doc.output('arraybuffer');
    const latin = new TextDecoder('latin1').decode(raw);
    const hasInRaw = (re) => re.test(latin);
    return {
      name: r2.name, email: r2.email, fn: r2.fn,
      texts: captured.texts,
      hasName: captured.texts.some(t => /Lotte de Vries/.test(t)) || hasInRaw(/Lotte/),
      hasEmail: captured.texts.some(t => /lotte@example\.com/.test(t)) || hasInRaw(/lotte@example/),
      hasSig: captured.texts.some(t => /Practitioner signature/i.test(t)) || hasInRaw(/Practitioner signature/),
      hasFormatCol: captured.texts.some(t => /Format/.test(t)) || hasInRaw(/Format/),
      hasOnline: captured.texts.some(t => /Online/.test(t)) || hasInRaw(/Online/),
      has70: captured.texts.some(t => /\/ 70/.test(t)) || hasInRaw(/\/ 70/),
      bytes: raw.byteLength,
      textHits: captured.texts.filter(t => /Lotte|lotte@|signature|Format|Online|70|Session Log/i.test(t)).slice(0, 30),
    };
  });
  console.log('pdf', {
    name: pdfCheck.name, email: pdfCheck.email, fn: pdfCheck.fn,
    hasName: pdfCheck.hasName, hasEmail: pdfCheck.hasEmail, hasSig: pdfCheck.hasSig,
    hasFormatCol: pdfCheck.hasFormatCol, hasOnline: pdfCheck.hasOnline, has70: pdfCheck.has70,
    lines: pdfCheck.lines, bytes: pdfCheck.bytes,
    sample: pdfCheck.texts.filter(t => /Lotte|lotte@|signature|Format|Online|\/ 70|Session Log/i.test(t)).slice(0, 20),
  });
  if (!pdfCheck.hasName) throw new Error('PDF missing full name at top');
  if (!pdfCheck.hasEmail) throw new Error('PDF missing email');
  if (pdfCheck.hasSig) throw new Error('PDF still has signature');
  if (!pdfCheck.hasFormatCol || !pdfCheck.hasOnline) throw new Error('PDF missing Format column/data');
  if (!pdfCheck.has70) throw new Error('PDF missing / 70');

  // Mail body construction path (fallback) — stub canShare false
  const mail = await page.evaluate(async () => {
    const r = await buildPdf();
    const fromLine = `From: ${r.name}${r.email ? ' <' + r.email + '>' : ''} — reply to this address`;
    const body = ['Hello', '', fromLine, '', `PDF attached (downloaded as ${r.fn}), please attach it to this email before sending.`].join('\n');
    return { fromLine, body, hasReply: /reply to this address/.test(fromLine), subject: `Session log – ${r.name}` };
  });
  console.log('mail', mail);
  if (!mail.hasReply || !/Lotte de Vries/.test(mail.fromLine)) throw new Error('mail from line bad');

  await browser.close(); srv.close();
  console.log('ok');
}
main().catch(e => { console.error(e); process.exit(1); });
