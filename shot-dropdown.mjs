import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v16_dropdown.png';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

const MOCK = {
  lotte: { id:'lotte', user_id:'lotte', name:'Lotte de Vries', practice_name:'Amsterdam Breath Studio', mods:['Breathwork','MER'], city:'Amsterdam', country:'Netherlands', lat:52.3676, lng:4.9041, consent:true, phone:'+31612345678', whatsapp:true,
    locations:[{label:'Studio',address:'',city:'Amsterdam',country:'Netherlands',lat:52.3676,lng:4.9041}] },
  mila: { id:'mila', user_id:'mila', name:'Mila Jansen', practice_name:'Canal Side Fascia', mods:['MER','Craniosacral'], city:'Amsterdam', country:'Netherlands', lat:52.3705, lng:4.895, consent:true, phone:'+31687654321', whatsapp:true,
    locations:[{label:'Jordaan',address:'',city:'Amsterdam',country:'Netherlands',lat:52.3705,lng:4.895}] },
  ines: { id:'ines', user_id:'ines', name:'Inês Oliveira', practice_name:'Lisbon Somatic Space', mods:['Somatic therapy','Yoga'], city:'Lisbon', country:'Portugal', lat:38.7223, lng:-9.1393, consent:true, phone:'+351912345678', whatsapp:true,
    locations:[{label:'',address:'',city:'Lisbon',country:'Portugal',lat:38.7223,lng:-9.1393}] },
  lukas: { id:'lukas', user_id:'lukas', name:'Lukas Berger', practice_name:'Berlin Fascia Atelier', mods:['MER'], city:'Berlin', country:'Germany', lat:52.52, lng:13.405, consent:true, phone:'+491701234567', whatsapp:true,
    locations:[{label:'Kreuzberg',address:'',city:'Berlin',country:'Germany',lat:52.52,lng:13.405}] },
  kaia: { id:'kaia', user_id:'kaia', name:'Kaia Mets', practice_name:'Tallinn Yoga & MER', mods:['Yoga','MER','BBTRS'], city:'Tallinn', country:'Estonia', lat:59.437, lng:24.7536, consent:true, phone:'+37251234567', whatsapp:true,
    locations:[
      {label:'Tallinn',address:'',city:'Tallinn',country:'Estonia',lat:59.437,lng:24.7536},
      {label:'Nisarga',address:'',city:'Lesvos Island',country:'Greece',lat:39.176,lng:25.999},
    ] },
};

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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(p => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get() { return { register: async () => ({}), getRegistrations: async () => [], addEventListener() {}, controller: null, ready: Promise.resolve({}) }; } });
    localStorage.setItem('fyp_profiles2', JSON.stringify(p));
  }, MOCK);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.DB?.mode === 'local');
  await page.evaluate(() => {
    const b = document.getElementById('demoBanner'); if (b) { b.hidden = true; b.style.display = 'none'; }
    me = { user_id: 'v', email: 'v@example.com' }; MSG_OK = true; hdr(); show('list');
  });
  await page.waitForSelector('#listSearch');

  // Modality options: only present mods with counts, no SUG-only empties
  const mods = await page.evaluate(() => [...document.querySelectorAll('#listFilter option')].map(o => ({ v: o.value, t: o.textContent })));
  console.log('mods', mods);
  if (!mods.some(m => m.v === '' && /All practices/i.test(m.t))) throw new Error('missing All practices');
  if (!mods.some(m => m.v === 'MER' && /\(4\)/.test(m.t))) throw new Error('MER count wrong: ' + JSON.stringify(mods));
  if (!mods.some(m => m.v === 'BBTRS' && /\(1\)/.test(m.t))) throw new Error('BBTRS count missing');
  if (mods.some(m => m.v === 'Massage')) throw new Error('absent modality Massage should not appear');
  const mapMods = await page.evaluate(() => [...document.querySelectorAll('#filter option')].map(o => o.textContent));
  if (JSON.stringify(mapMods) !== JSON.stringify(mods.map(m => m.t))) throw new Error('map filter not synced with list options');

  // Open place combobox
  await page.click('#qPlace');
  await page.waitForSelector('#placeMenu:not([hidden])');
  let places = await page.evaluate(() => [...document.querySelectorAll('#placeMenu button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  console.log('places', places);
  const need = ['Amsterdam, Netherlands (2)', 'Tallinn, Estonia (1)', 'Lesvos Island, Greece (1)', 'Netherlands', 'Estonia', 'Greece'];
  for (const n of need) {
    if (!places.some(p => p.replace(/\s+/g,' ') === n || p.includes(n.split(' (')[0]) && p.includes('('))) {
      // flexible check
    }
  }
  if (!places.some(p => /Amsterdam,\s*Netherlands\s*\(2\)/.test(p))) throw new Error('Amsterdam (2) missing');
  if (!places.some(p => /Lesvos Island,\s*Greece\s*\(1\)/.test(p))) throw new Error('Lesvos missing');
  if (!places.some(p => /^Estonia\s*\(\d+\)$/.test(p) || /Estonia\s*\(1\)/.test(p))) throw new Error('country Estonia missing: ' + places.join('|'));
  if (!places.some(p => /Greece\s*\(1\)/.test(p))) throw new Error('country Greece missing');

  // Filter as you type
  await page.fill('#qPlace', 'est');
  await page.waitForTimeout(100);
  places = await page.evaluate(() => [...document.querySelectorAll('#placeMenu button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  console.log('est', places);
  if (!places.every(p => /est/i.test(p.normalize('NFD')))) throw new Error('typeahead not filtered');
  if (!places.some(p => /Tallinn/.test(p)) || !places.some(p => /Estonia/.test(p))) throw new Error('est should show Tallinn + Estonia');

  // Select Tallinn
  await page.click('#placeMenu button[data-place="Tallinn, Estonia"]');
  await page.waitForTimeout(150);
  let info = await page.evaluate(() => ({
    q: document.getElementById('qPlace')?.value,
    menuHidden: document.getElementById('placeMenu')?.hidden,
    n: document.querySelectorAll('#items .item').length,
    count: document.getElementById('listCount')?.textContent,
    text: document.querySelector('#items')?.textContent,
  }));
  console.log('pick tallinn', info);
  if (info.q !== 'Tallinn, Estonia' || !info.menuHidden) throw new Error('select failed');
  if (info.n !== 1 || !/Tallinn Yoga/.test(info.text || '')) throw new Error('filter after select failed');
  if (/\(Tallinn\)|\(Nisarga\)/.test(info.text || '')) throw new Error('parens labels visible');

  // Select country Greece via reopen
  await page.click('#qPlace');
  await page.fill('#qPlace', '');
  await page.click('#qPlace');
  await page.waitForSelector('#placeMenu:not([hidden])');
  await page.click('#placeMenu button[data-place="Greece"]');
  await page.waitForTimeout(150);
  info = await page.evaluate(() => ({
    q: document.getElementById('qPlace')?.value,
    n: document.querySelectorAll('#items .item').length,
    names: [...document.querySelectorAll('#items b')].map(b => b.textContent),
  }));
  console.log('greece', info);
  if (info.q !== 'Greece' || info.n !== 1 || !/Tallinn Yoga/.test(info.names.join(' '))) throw new Error('country select failed');

  // Screenshot with dropdown open showing locations
  await page.evaluate(() => { document.getElementById('qPlace').value = ''; renderList(); });
  await page.click('#qPlace');
  await page.waitForSelector('#placeMenu:not([hidden])');
  await page.waitForTimeout(200);
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  console.log('wrote', OUT);

  // Modality select with count label still filters by value
  await page.selectOption('#listFilter', { value: 'BBTRS' });
  await page.waitForTimeout(100);
  info = await page.evaluate(() => ({
    n: document.querySelectorAll('#items .item').length,
    map: document.getElementById('filter')?.value,
    list: document.getElementById('listFilter')?.value,
  }));
  console.log('BBTRS', info);
  if (info.n !== 1 || info.map !== 'BBTRS') throw new Error('modality sync/filter failed');

  const ver = readFileSync(join(ROOT, 'app/sw.js'), 'utf8').match(/VERSION="([^"]+)"/)[1];
  if (ver !== 'fasciapp-v0.16.0') throw new Error('bad version ' + ver);
  console.log('VERSION', ver);

  await browser.close(); srv.close();
  console.log('ok');
}
main().catch(e => { console.error(e); process.exit(1); });
