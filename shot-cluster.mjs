import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v12_cluster.png';
const OUT_NAV = '/workspace/ibi/mer-app/prototype/screens/v12_nav.png';
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

const names = [
  ['Anna Kask', 'Breath & Body', ['Breathwork', 'MER']],
  ['Marek Nowak', 'Fascia Space', ['MER']],
  ['Sofi Laine', 'Nordic Touch', ['Massage', 'Craniosacral']],
  ['Erik Tamm', 'Deep Rest', ['BBTRS', 'Breathwork']],
  ['Liina Saar', 'Somatic Home', ['Somatic therapy', 'Yoga']],
  ['Jonas Berg', 'Baltic MER', ['MER', 'BBTRS', 'Massage']],
  ['Helena Kivi', 'Quiet Body', ['Craniosacral']],
  ['Piotr Lew', 'Warsaw Hands EE', ['MER', 'Massage']],
  ['Maria Võsu', 'Telliskivi Breath', ['Breathwork']],
  ['Tomáš Novák', 'Fascia Lab', ['MER', 'Trauma therapy']],
  ['Inga Ozola', 'Riga Roots', ['BBTRS']],
  ['Karl Mets', 'Niine Studio', ['Massage', 'Yoga']],
  ['Eva Holm', 'Body Tide', ['Breathwork', 'Somatic therapy']],
  ['Nisarga', 'Integral Body Studio', ['MER', 'BBTRS']],
  ['Test Practitioner', 'Demo Studio', ['MER', 'Breathwork']],
];

function mockProfiles() {
  const baseLat = 59.437, baseLng = 24.753, out = {};
  names.forEach((row, i) => {
    const [name, practice_name, mods] = row;
    const ring = i < 8 ? 0.002 : 0.006;
    const ang = (i / names.length) * Math.PI * 2;
    const lat = baseLat + Math.cos(ang) * ring + (i % 3) * 0.00015;
    const lng = baseLng + Math.sin(ang) * ring + (i % 2) * 0.0001;
    const id = 'm' + i;
    out[id] = {
      id, user_id: id, name, practice_name, mods, city: 'Tallinn', country: 'Estonia',
      lat, lng, consent: true, photo: null, created_at: '2026-01-01T00:00:00Z',
      locations: [{ label: i % 4 === 0 ? 'Studio' : '', address: '', city: 'Tallinn', country: 'Estonia', lat, lng }],
    };
  });
  return out;
}

async function openMap(page) {
  await page.evaluate(() => { if (typeof show === 'function') show('map'); });
  await page.waitForFunction(() => !!(window.map && document.querySelector('#map.active')), { timeout: 10000 });
  await page.waitForTimeout(400);
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
  const profiles = mockProfiles();

  // --- Cluster shot 390x844 ---
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(p => {
      navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
      localStorage.setItem('fyp_profiles2', JSON.stringify(p));
    }, profiles);
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('pageerror', e.message));
    await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await openMap(page);
    await page.evaluate(() => { window.didFit = true; didFit = true; window.map.setView([59.437, 24.753], 12, { animate: false }); });
    await page.waitForTimeout(900);
    let mid = await page.evaluate(() => ({
      clusters: document.querySelectorAll('.clbub').length,
      pins: document.querySelectorAll('.pin').length,
      labelled: document.querySelectorAll('.pintitle').length,
      zoom: window.map?.getZoom(),
      count: document.querySelector('#count')?.textContent,
    }));
    console.log('mid', mid);
    if (mid.clusters < 1) {
      await page.evaluate(() => window.map.setView([59.437, 24.753], 11, { animate: false }));
      await page.waitForTimeout(800);
      mid = await page.evaluate(() => ({ clusters: document.querySelectorAll('.clbub').length, zoom: window.map?.getZoom() }));
      console.log('mid2', mid);
    }
    mkdirSync(dirname(OUT), { recursive: true });
    await page.screenshot({ path: OUT, fullPage: false });

    // labels at street zoom
    await page.evaluate(() => window.map.setView([59.437, 24.753], 15, { animate: false }));
    await page.waitForTimeout(900);
    const hi = await page.evaluate(() => ({ labelled: document.querySelectorAll('.pintitle').length, bare: document.querySelectorAll('.pin.bare').length, clusters: document.querySelectorAll('.clbub').length, zoom: window.map.getZoom() }));
    console.log('hi', hi);

    // bare below z8
    await page.evaluate(() => window.map.setView([59.437, 24.753], 7, { animate: false }));
    await page.waitForTimeout(800);
    const lo = await page.evaluate(() => ({ labelled: document.querySelectorAll('.pintitle').length, bare: document.querySelectorAll('.pin.bare').length, clusters: document.querySelectorAll('.clbub').length, zoom: window.map.getZoom() }));
    console.log('lo', lo);

    await page.evaluate(() => openClusterSheet(people.slice(0, 5)));
    await page.waitForTimeout(300);
    const sheet = await page.evaluate(() => ({ open: !document.getElementById('areaSheet')?.hidden, items: document.querySelectorAll('#sheetList .item').length }));
    console.log('sheet', sheet);
    await page.click('#sheetX');

    // restore cluster shot
    await page.evaluate(() => { closeClusterSheet(); window.map.setView([59.437, 24.753], 12, { animate: false }); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT, fullPage: false });

    if (hi.labelled < 1) throw new Error('expected labels at z15');
    if (lo.labelled > 0) throw new Error('expected no labels below z8');
    if (!sheet.open) throw new Error('sheet failed');
    await ctx.close();
  }

  // --- Nav shots: 844 and 664 ---
  for (const h of [844, 664]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(p => {
      navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
      localStorage.setItem('fyp_profiles2', JSON.stringify(p));
    }, profiles);
    const page = await ctx.newPage();
    // simulate safe areas for Safari chrome on short viewport
    await page.addStyleTag({ content: h === 664
      ? `:root{--hdr-h:calc(56px + 12px)!important;--nav-h:calc(64px + 12px)!important} header{padding-top:12px!important} nav#tabs{padding-bottom:12px!important}`
      : `:root{--hdr-h:calc(56px + 47px)!important} header{padding-top:47px!important}` });
    await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.evaluate(() => { me = { user_id: 'x', email: 'x@y.z' }; hdr(); show('map'); });
    await page.waitForFunction(() => !!window.map);
    await page.evaluate(() => { didFit = true; window.map.setView([59.437, 24.753], 12, { animate: false }); });
    await page.waitForTimeout(700);
    const geo = await page.evaluate(() => {
      const hdr = document.getElementById('hdr').getBoundingClientRect();
      const nav = document.getElementById('tabs').getBoundingClientRect();
      const leaf = document.getElementById('leaf').getBoundingClientRect();
      const edit = document.getElementById('hEdit').getBoundingClientRect();
      return {
        h: window.innerHeight,
        hdrH: Math.round(hdr.height), hdrTop: Math.round(hdr.top),
        navH: Math.round(nav.height), navBottom: Math.round(nav.bottom),
        leafTop: Math.round(leaf.top), leafBottom: Math.round(leaf.bottom),
        gapTop: Math.round(leaf.top - hdr.bottom),
        gapBot: Math.round(nav.top - leaf.bottom),
        edit: { w: Math.round(edit.width), h: Math.round(edit.height) },
        editVisible: !document.getElementById('hEdit').hidden,
        iconStroke: getComputedStyle(document.querySelector('#hEdit svg')).stroke,
      };
    });
    console.log('nav'+h, geo);
    const path = h === 844 ? OUT_NAV : OUT_NAV.replace('.png', '_safari.png');
    await page.screenshot({ path, fullPage: false });
    if (geo.edit.w < 44 || geo.edit.h < 44) throw new Error('iconbtn too small');
    if (geo.gapBot < 0) throw new Error('map overlaps tab bar');
    await ctx.close();
  }

  console.log('wrote', OUT, OUT_NAV);
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
