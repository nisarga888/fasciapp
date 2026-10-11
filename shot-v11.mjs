import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v11.png';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  // Simulate iPhone notch safe areas
  await ctx.addInitScript(() => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
    const s = document.createElement('style');
    s.textContent = `:root{--sat:47px} html{padding:env(safe-area-inset-top,0)}`;
    document.documentElement.style.setProperty('--fake','1');
  });
  const page = await ctx.newPage();
  await page.addStyleTag({ content: `
    :root{--safe-top:47px}
    header{padding-top:calc(10px + 47px)!important}
  ` });
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(600);

  // Fake logged-in header to verify Edit/Log out tap targets
  await page.evaluate(() => {
    me = { user_id: 'shot', email: 'shot@example.com' };
    hdr();
  });

  await page.click('#goLook');
  await page.waitForFunction(() => document.querySelectorAll('.pin .pintitle').length >= 2, { timeout: 20000 });
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const pins = [...document.querySelectorAll('.pin')].map(el => ({
      title: el.querySelector('.pintitle')?.textContent,
      loc: el.querySelector('.pinloc')?.textContent || null,
      mods: el.querySelector('.pinmods')?.textContent || null,
      chips: [...el.querySelectorAll('.pinmods i')].map(i => i.textContent),
    }));
    const edit = document.getElementById('hEdit');
    const out = document.getElementById('hOut');
    const er = edit.getBoundingClientRect(), or = out.getBoundingClientRect();
    const hdr = document.getElementById('hdr').getBoundingClientRect();
    return {
      pins, zoom: map?.getZoom(), center: map?.getCenter(),
      edit: { h: Math.round(er.height), w: Math.round(er.width), hidden: edit.hidden },
      out: { h: Math.round(or.height), w: Math.round(or.width), hidden: out.hidden },
      hdrTop: Math.round(hdr.top), hdrH: Math.round(hdr.height),
      people: people?.length, mode: DB?.mode,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  console.log('wrote', OUT);

  if (info.pins.length < 2) throw new Error('need >=2 pins');
  if (!info.pins.every(p => p.chips && p.chips.length)) throw new Error('missing modality chips: ' + JSON.stringify(info.pins));
  if (info.edit.h < 44 || info.out.h < 44) throw new Error('header buttons too short: ' + JSON.stringify({edit:info.edit,out:info.out}));
  // At least one Nisarga pin should exist; Lesvos pin may not show loc subtitle since label==="Nisarga"
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
