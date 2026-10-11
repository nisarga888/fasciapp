import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v9_tabbar.png';
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
  await ctx.addInitScript(() => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.click('#goLook');
  await page.waitForSelector('#leaf', { state: 'visible' });
  await page.waitForTimeout(1200);
  // Show inbox tab + sample badge for visual check
  await page.evaluate(() => {
    const inbox = document.getElementById('tabInbox');
    if (inbox) inbox.hidden = false;
    const b = document.getElementById('unread');
    if (b) { b.hidden = false; b.textContent = '2'; }
    // simulate iPhone home indicator
    document.documentElement.style.setProperty('--fake-safe', '34px');
  });
  // force a safe-area-like padding for screenshot fidelity
  await page.addStyleTag({ content: `
    :root{--nav-h:calc(58px + 34px)!important}
    nav#tabs{padding-bottom:calc(6px + 34px)!important}
  `});
  await page.evaluate(() => {
    const map = window.map || null;
    if (map && map.invalidateSize) map.invalidateSize();
  });
  await page.waitForTimeout(400);
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  // geometry report
  const geo = await page.evaluate(() => {
    const leaf = document.getElementById('leaf').getBoundingClientRect();
    const nav = document.getElementById('tabs').getBoundingClientRect();
    return {
      leafBottom: Math.round(leaf.bottom),
      navTop: Math.round(nav.top),
      gap: Math.round(nav.top - leaf.bottom),
      leafH: Math.round(leaf.height),
      navH: Math.round(nav.height),
      icons: [...document.querySelectorAll('#tabs button')].map(b => ({
        t: b.dataset.t,
        hasSvg: !!b.querySelector('svg'),
        emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(b.textContent),
        on: b.classList.contains('on'),
      })),
    };
  });
  console.log(JSON.stringify(geo, null, 2));
  console.log('wrote', OUT);
  await browser.close();
  srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
