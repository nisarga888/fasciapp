import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v13_profile.png';
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

async function boot(page, { safariExtra = true } = {}) {
  await page.goto(page._urlBase + '/app/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window.DB && window.show));
  await page.evaluate(({ safariExtra }) => {
    if (safariExtra) {
      document.documentElement.classList.add('safari-browser');
      // simulate Safari floating toolbar overlap
      document.documentElement.style.setProperty('--vv-bottom', '48px');
    }
    me = { user_id: 'u1', email: 'nisarga@example.com' };
    const prof = {
      id: 'u1', user_id: 'u1', name: 'Nisarga', practice_name: '', mods: ['MER', 'BBTRS'],
      city: 'Tallinn', country: 'Estonia', lat: 59.4437, lng: 24.7395, consent: true,
      phone: '+3725550000', whatsapp: true, email: 'nisarga@example.com',
      locations: [
        { label: 'Tallinn', address: 'Niine 11', city: 'Tallinn', country: 'Estonia', lat: 59.4437, lng: 24.7395 },
        { label: 'Lesvos', address: '', city: 'Lesvos Island', country: 'Greece', lat: 39.18, lng: 26.0 },
      ],
    };
    window.DB.mine = async () => prof;
    window.DB.save = async (p) => p;
    people = [prof];
    hdr();
    show('profile');
    return loadProf();
  }, { safariExtra });
  await page.waitForTimeout(500);
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
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  for (const h of [664, 844]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua });
    await ctx.addInitScript(() => {
      const fake = { register: async () => ({ unregister: async () => true }), getRegistrations: async () => [], addEventListener() {}, removeEventListener() {}, controller: null, ready: Promise.resolve({ unregister: async () => true }) };
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get() { return fake; } });
    });
    const page = await ctx.newPage();
    page._urlBase = `http://127.0.0.1:${port}`;
    page.on('pageerror', e => console.log('pageerror', e.message));
    await boot(page, { safariExtra: true });
    await page.waitForFunction(() => document.body.classList.contains('in') && document.getElementById('profile').classList.contains('active'));

    const geo = await page.evaluate(() => {
      const nav = document.getElementById('tabs').getBoundingClientRect();
      const hdr = document.getElementById('hdr').getBoundingClientRect();
      const back = document.querySelector('#profile .mapBack');
      return {
        h: innerHeight,
        body: document.body.className,
        hdr: { t: Math.round(hdr.top), b: Math.round(hdr.bottom), h: Math.round(hdr.height), d: getComputedStyle(document.getElementById('hdr')).display },
        nav: { t: Math.round(nav.top), b: Math.round(nav.bottom), h: Math.round(nav.height), d: getComputedStyle(document.getElementById('tabs')).display },
        back: back?.textContent?.trim(),
        navHVar: getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim(),
        gap: Math.round(document.getElementById('tabs').getBoundingClientRect().top - (document.querySelector('#profile')?.getBoundingClientRect().bottom || 0)),
      };
    });
    console.log(String(h), geo);
    if (geo.nav.d === 'none' || geo.nav.h < 40) throw new Error('nav not visible at ' + h);
    if (geo.nav.b > h + 2) throw new Error('nav extends past viewport at ' + h);
    if (geo.nav.t >= h) throw new Error('nav below viewport at ' + h);
    if (!/Map/i.test(geo.back || '')) throw new Error('missing Map back');

    // Logo / Map back navigation
    await page.evaluate(() => document.getElementById('logoHome').click());
    await page.waitForTimeout(150);
    if (!(await page.evaluate(() => document.getElementById('map').classList.contains('active')))) throw new Error('logo → map failed');
    await page.evaluate(() => show('profile'));
    await page.evaluate(() => document.querySelector('#profile .mapBack').click());
    await page.waitForTimeout(150);
    if (!(await page.evaluate(() => document.getElementById('map').classList.contains('active')))) throw new Error('← Map failed');

    // Toast + center
    await page.evaluate(() => {
      showToast('Saved ✓');
      didFit = true;
      show('map');
      if (window.map) window.map.setView([59.4437, 24.7395], 13, { animate: false });
    });
    await page.waitForTimeout(250);
    const toast = await page.evaluate(() => ({
      show: document.getElementById('toast').classList.contains('show'),
      text: document.getElementById('toast').textContent,
      z: window.map?.getZoom(),
    }));
    console.log('toast', toast);
    if (!toast.show) throw new Error('toast not shown');

    if (h === 664) {
      await page.evaluate(() => show('profile'));
      await page.waitForTimeout(200);
      mkdirSync(dirname(OUT), { recursive: true });
      await page.screenshot({ path: OUT, fullPage: false });
    } else {
      await page.evaluate(() => show('profile'));
      await page.waitForTimeout(200);
      await page.screenshot({ path: OUT.replace('.png', '_844.png'), fullPage: false });
    }
    await ctx.close();
  }

  console.log('wrote', OUT);
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
