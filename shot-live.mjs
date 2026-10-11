import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v10_live.png';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function serve(root, port) {
  const srv = createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
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
    executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  // iPhone viewport (Safari-like)
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await ctx.addInitScript(() => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') logs.push('console ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  const boot = await page.evaluate(() => ({
    mode: window.DB?.mode,
    hasSupabase: !!window.supabase,
    people: (typeof people !== 'undefined' ? people.length : -1),
  }));
  console.log('boot', boot);

  await page.click('#goLook');
  // Wait for pins from live data
  await page.waitForFunction(() => document.querySelectorAll('.leaflet-marker-icon .pin').length >= 2, { timeout: 20000 });
  await page.waitForTimeout(700);

  const info = await page.evaluate(() => {
    const pins = [...document.querySelectorAll('.pin')].map(el => ({
      title: el.querySelector('.pintitle')?.textContent,
      mods: el.querySelector('.pinmods')?.textContent,
    }));
    const z = typeof map !== 'undefined' && map ? map.getZoom() : null;
    const c = typeof map !== 'undefined' && map ? map.getCenter() : null;
    const count = document.querySelector('#count')?.textContent;
    return { pins, zoom: z, center: c, count, didFit: typeof didFit !== 'undefined' ? didFit : null, mode: window.DB?.mode };
  });
  console.log(JSON.stringify(info, null, 2));
  if (logs.length) console.log('logs', logs);

  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  console.log('wrote', OUT);

  // Sanity: zoom should be around Tallinn, not Europe z4
  if (!info.pins || info.pins.length < 2) throw new Error('Expected >=2 pins, got ' + (info.pins?.length || 0));
  if (info.zoom != null && info.zoom < 6) throw new Error('Zoom still too wide: ' + info.zoom);
  if (info.center && (info.center.lat < 55 || info.center.lat > 65)) throw new Error('Center not near Tallinn: ' + JSON.stringify(info.center));

  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
