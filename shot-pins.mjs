import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v10_pins.png';
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

// Two nearly identical Tallinn coords (should spiderfy) + one with 3 mods (+1)
const profiles = {
  a: {
    id: 'a', user_id: 'a', name: 'Nisarga Eryk', practice_name: 'Integral Body Studio',
    mods: ['MER', 'BBTRS', 'Breathwork'], city: 'Tallinn', country: 'Estonia',
    lat: 59.4370, lng: 24.7535,
    locations: [{ city: 'Tallinn', country: 'Estonia', lat: 59.4370, lng: 24.7535 }],
    consent: true, photo: null, created_at: '2026-01-01T00:00:00Z'
  },
  b: {
    id: 'b', user_id: 'b', name: 'Anna Kask', practice_name: 'Breath & Body',
    mods: ['Breathwork', 'Massage'], city: 'Tallinn', country: 'Estonia',
    lat: 59.4371, lng: 24.7536, // nearly same as a
    locations: [{ city: 'Tallinn', country: 'Estonia', lat: 59.4371, lng: 24.7536 }],
    consent: true, photo: null, created_at: '2026-01-02T00:00:00Z'
  },
  c: {
    id: 'c', user_id: 'c', name: 'Marek Nowak', practice_name: 'Fascia Space',
    mods: ['MER'], city: 'Tallinn', country: 'Estonia',
    lat: 59.4415, lng: 24.7480,
    locations: [{ city: 'Tallinn', country: 'Estonia', lat: 59.4415, lng: 24.7480 }],
    consent: true, photo: null, created_at: '2026-01-03T00:00:00Z'
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
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
  await page.click('#goLook');
  await page.waitForSelector('.pinlab');
  await page.evaluate(() => { if (typeof map !== 'undefined' && map) { map.setView([59.439, 24.751], 13); setTimeout(() => map.invalidateSize(), 40); } });
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const pins = [...document.querySelectorAll('.pin')].map(el => ({
      title: el.querySelector('.pintitle')?.textContent,
      mods: el.querySelector('.pinmods')?.textContent,
      left: el.classList.contains('left'),
      top: Math.round(el.closest('.leaflet-marker-icon')?.getBoundingClientRect().top || 0),
      leftPx: Math.round(el.closest('.leaflet-marker-icon')?.getBoundingClientRect().left || 0),
    }));
    // marker latlngs
    const positions = [];
    if (typeof layer !== 'undefined' && layer) {
      layer.eachLayer(m => { if (m.getLatLng) positions.push(m.getLatLng()); });
    }
    return { pins, positions, count: pins.length };
  });
  console.log(JSON.stringify(info, null, 2));
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  console.log('wrote', OUT);
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
