import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function serve(root, port) {
  const srv = createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
    // Force empty config for demo shot (no real DB)
    if (u.endsWith('/config.js') || u === '/app/config.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      res.end('window.FASCIAPP_CONFIG={SUPABASE_URL:"",SUPABASE_ANON_KEY:""};');
      return;
    }
    const f = join(root, u);
    if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(f));
  });
  return new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

async function main() {
  const port = await new Promise((res, rej) => {
    const n = createServer().listen(0, '127.0.0.1', () => { const p = n.address().port; n.close(() => res(p)); });
    n.once('error', rej);
  });
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(() => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.DB, null, { timeout: 15000 });
  const mode = await page.evaluate(() => window.DB.mode);
  console.log('DB.mode', mode);
  if (mode !== 'local') throw new Error('expected local mode, got ' + mode);

  await page.addScriptTag({ content: `
    me = { user_id: 'u-anna', email: 'anna@example.com' };
    MSG_OK = true;
    people = [
      { user_id: 'u-anna', name: 'Anna Kask', mods: ['MER','Breathwork'], city: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.7536, consent: true, phone: '+3725551234', whatsapp: true, email: 'anna@example.com', bio: 'MER & breathwork in Tallinn' },
      { user_id: 'u-marek', name: 'Marek Nowak', mods: ['BBTRS','Massage'], city: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122, consent: true, phone: '+48500111222', whatsapp: true, email: 'marek@example.com', bio: 'BBTRS practitioner in Warsaw' }
    ];
    msgs = [
      { id: 'm1', sender: 'u-anna', recipient: 'u-marek', body: 'Hi Marek! I saw you practise BBTRS in Warsaw. Do you have space next week?', created_at: '2026-10-10T14:20:00.000Z', read_at: '2026-10-10T14:25:00.000Z' },
      { id: 'm2', sender: 'u-marek', recipient: 'u-anna', body: 'Hello Anna! Yes — Wednesday afternoon is free. Would 15:00 work for you?', created_at: '2026-10-10T15:02:00.000Z', read_at: null },
      { id: 'm3', sender: 'u-anna', recipient: 'u-marek', body: 'Perfect — see you Wednesday at 15:00 🌿', created_at: '2026-10-10T15:10:00.000Z', read_at: null }
    ];
    DB.markRead = async () => {};
    DB.onMsg = () => () => {};
    DB.msgs = async () => msgs;
    DB.sendMsg = async () => { throw new Error('demo: no writes'); };
    hdr();
    fillFilter();
    show('inbox');
    openChat('u-marek');
  `});

  await page.waitForSelector('#chat:not([hidden])', { timeout: 10000 });
  await page.waitForSelector('.bub.me', { timeout: 10000 });
  await page.waitForTimeout(500);

  const outApp = join(ROOT, 'assets', 'v8_messages.png');
  const outProto = '/workspace/ibi/mer-app/prototype/screens/v8_messages.png';
  mkdirSync(join(ROOT, 'assets'), { recursive: true });
  mkdirSync('/workspace/ibi/mer-app/prototype/screens', { recursive: true });
  await page.screenshot({ path: outApp, fullPage: false });
  copyFileSync(outApp, outProto);
  console.log('messages shot', outApp);

  const land = await ctx.newPage();
  await land.setViewportSize({ width: 980, height: 1600 });
  await land.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await land.evaluate(() => document.querySelectorAll('.f').forEach(e => e.classList.add('seen')));
  // Wait for message screenshot image if present (may 404 until we saved it — but we already saved)
  await land.waitForTimeout(400);
  const box1 = await land.locator('h2', { hasText: "What's inside" }).boundingBox();
  const box2 = await land.locator('.shots').boundingBox();
  const left = Math.max(0, Math.min(box1.x, box2.x) - 24);
  const top = Math.max(0, box1.y - 20);
  const right = Math.min(980, Math.max(box1.x + box1.width, box2.x + box2.width) + 24);
  const bottom = box2.y + box2.height + 28;
  const clip = { x: left, y: top, width: right - left, height: bottom - top };
  const outLand = '/workspace/ibi/mer-app/prototype/screens/v8_landing.png';
  await land.screenshot({ path: outLand, clip });
  console.log('landing shot', outLand, clip);

  await browser.close();
  srv.close();
}

main().catch(e => { console.error(e); process.exit(1); });
