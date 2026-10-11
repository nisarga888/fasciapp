import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v9_labels.png';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function serve(root, port) {
  const srv = createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
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

const seed = {
  fyp_profiles2: {
    a: {
      id: 'a', user_id: 'a', name: 'Nisarga Eryk', practice_name: 'Integral Body Studio',
      mods: ['MER', 'BBTRS'], city: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.753,
      locations: [{ label: 'Tallinn', address: 'Niine 11', city: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.753 }],
      consent: true, photo: null, created_at: '2026-01-01T00:00:00Z'
    },
    b: {
      id: 'b', user_id: 'b', name: 'Anna Kask', practice_name: 'Breath & Body Tallinn',
      mods: ['Breathwork'], city: 'Tallinn', country: 'Estonia', lat: 59.442, lng: 24.745,
      locations: [{ label: 'Telliskivi', address: 'Telliskivi', city: 'Tallinn', country: 'Estonia', lat: 59.442, lng: 24.745 }],
      consent: true, photo: null, created_at: '2026-01-02T00:00:00Z'
    },
    c: {
      id: 'c', user_id: 'c', name: 'Marek Nowak', practice_name: 'Fascia Space Warsaw',
      mods: ['MER'], city: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122,
      locations: [{ label: '', address: '', city: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 }],
      consent: true, photo: null, created_at: '2026-01-03T00:00:00Z'
    },
    d: {
      id: 'd', user_id: 'd', name: 'Sofi Alone', practice_name: '',
      mods: ['Massage'], city: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384,
      locations: [{ label: '', address: '', city: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384 }],
      consent: true, photo: null, created_at: '2026-01-04T00:00:00Z'
    }
  }
};

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
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(seedData => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
    localStorage.setItem('fyp_profiles2', JSON.stringify(seedData.fyp_profiles2));
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.click('#goLook');
  await page.waitForSelector('#leaf .leaflet-marker-icon', { timeout: 10000 });
  await page.waitForTimeout(600);
  // Zoom to Tallinn so two close labels are visible (overlap test)
  await page.evaluate(() => {
    if (window.map) { map.setView([59.44, 24.75], 12); setTimeout(() => map.invalidateSize(), 50); }
  });
  await page.waitForTimeout(800);
  // Ensure labels rendered
  const info = await page.evaluate(() => {
    const labs = [...document.querySelectorAll('.pinlab')].map(el => ({
      text: el.textContent, left: el.closest('.pin')?.classList.contains('left')
    }));
    return { labs, pins: document.querySelectorAll('.leaflet-marker-icon').length };
  });
  console.log(JSON.stringify(info, null, 2));
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  // Also open a popup to verify card title
  await page.click('.leaflet-marker-icon');
  await page.waitForTimeout(400);
  const popup = await page.evaluate(() => {
    const c = document.querySelector('.leaflet-popup-content');
    if (!c) return null;
    return { html: c.innerHTML.slice(0, 300), b: c.querySelector('b')?.textContent, who: c.querySelector('.who')?.textContent };
  });
  console.log('popup', popup);
  console.log('wrote', OUT);
  await browser.close();
  srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
