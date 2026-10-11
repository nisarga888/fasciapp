import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v9_card.png';
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
  return new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

const profiles = {
  a: {
    id: 'a', user_id: 'a', name: 'Nisarga Eryk', practice_name: 'Integral Body Studio',
    mods: ['MER', 'BBTRS'], city: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.753,
    phone: '+3725550000', whatsapp: true, email: 'hello@example.com',
    locations: [{ label: 'Tallinn', address: 'Niine 11', city: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.753 }],
    consent: true, bio: 'Bodywork and breathwork.', photo: null, created_at: '2026-01-01T00:00:00Z'
  }
};

async function main() {
  const port = await new Promise((res, rej) => {
    const n = createServer().listen(0, '127.0.0.1', () => { const p = n.address().port; n.close(() => res(p)); });
    n.once('error', rej);
  });
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await ctx.addInitScript(p => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
    localStorage.setItem('fyp_profiles2', JSON.stringify(p));
  }, profiles);
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
  await page.click('#goLook');
  await page.waitForTimeout(500);
  await page.evaluate(() => { MSG_OK = true; renderList(); renderMarkers(); });
  await page.click('nav button[data-t="list"]');
  await page.waitForSelector('.cb.msg');
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const msg = document.querySelector('.cb.msg');
    const cs = getComputedStyle(msg);
    return {
      text: msg.textContent.trim(),
      hasSvg: !!msg.querySelector('svg'),
      bg: cs.backgroundColor, color: cs.color, weight: cs.fontWeight,
      b: document.querySelector('#items b')?.textContent,
      who: document.querySelector('#items .who')?.textContent,
      btns: [...document.querySelectorAll('.cb')].map(b => b.className + ':' + b.textContent.trim())
    };
  });
  console.log(JSON.stringify(info, null, 2));
  // Clip to the card area for a clean shot, plus some chrome
  const clip = await page.evaluate(() => {
    const item = document.querySelector('#items .item');
    const r = item.getBoundingClientRect();
    return { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 60), width: Math.min(390, r.width + 24), height: Math.min(400, r.height + 80) };
  });
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, clip });
  console.log('wrote', OUT, clip);
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
