import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = '/workspace/ibi/mer-app/prototype/screens/v15_search.png';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

const MOCK = {
  lotte: { id:'lotte', user_id:'lotte', name:'Lotte de Vries', practice_name:'Amsterdam Breath Studio', mods:['Breathwork','MER'], city:'Amsterdam', country:'Netherlands', lat:52.3676, lng:4.9041, consent:true, phone:'+31612345678', whatsapp:true, email:'lotte@example.com',
    locations:[{label:'Studio',address:'Prinsengracht 100',city:'Amsterdam',country:'Netherlands',lat:52.3676,lng:4.9041}] },
  ines: { id:'ines', user_id:'ines', name:'Inês Oliveira', practice_name:'Lisbon Somatic Space', mods:['Somatic therapy','Yoga'], city:'Lisbon', country:'Portugal', lat:38.7223, lng:-9.1393, consent:true, phone:'+351912345678', whatsapp:true,
    locations:[{label:'',address:'',city:'Lisbon',country:'Portugal',lat:38.7223,lng:-9.1393}] },
  lukas: { id:'lukas', user_id:'lukas', name:'Lukas Berger', practice_name:'Berlin Fascia Atelier', mods:['MER','Craniosacral'], city:'Berlin', country:'Germany', lat:52.52, lng:13.405, consent:true, phone:'+491701234567', whatsapp:true,
    locations:[{label:'Kreuzberg',address:'',city:'Berlin',country:'Germany',lat:52.52,lng:13.405}] },
  freja: { id:'freja', user_id:'freja', name:'Freja Nielsen', practice_name:'Copenhagen Quiet Body', mods:['Craniosacral','Yoga'], city:'Copenhagen', country:'Denmark', lat:55.6761, lng:12.5683, consent:true, phone:'+4520123456', whatsapp:true,
    locations:[{label:'',address:'',city:'Copenhagen',country:'Denmark',lat:55.6761,lng:12.5683}] },
  kaia: { id:'kaia', user_id:'kaia', name:'Kaia Mets', practice_name:'Tallinn Yoga & MER', mods:['Yoga','MER'], city:'Tallinn', country:'Estonia', lat:59.437, lng:24.7536, consent:true, phone:'+37251234567', whatsapp:true,
    locations:[{label:'Tallinn',address:'Telliskivi 60a',city:'Tallinn',country:'Estonia',lat:59.437,lng:24.7536}] },
  // diacritic city
  joao: { id:'joao', user_id:'joao', name:'João Silva', practice_name:'São Paulo Bodywork', mods:['MER'], city:'São Paulo', country:'Brazil', lat:-23.55, lng:-46.63, consent:true, phone:'+551199999999', whatsapp:true,
    locations:[{label:'',address:'',city:'São Paulo',country:'Brazil',lat:-23.55,lng:-46.63}] },
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
    me = { user_id: 'visitor', email: 'v@example.com' };
    MSG_OK = true; hdr(); show('list');
  });
  await page.waitForSelector('#listSearch');
  await page.waitForSelector('#items .item');

  // No parenthetical labels
  const labels = await page.evaluate(() => document.querySelector('#items')?.textContent || '');
  if (/\(Tallinn\)|\(Nisarga\)|\(Studio\)|\(Kreuzberg\)/i.test(labels)) throw new Error('location label still shown: ' + labels.slice(0, 200));
  console.log('no-parens ok');

  // Diacritic search: "sao" matches São Paulo
  await page.fill('#qPlace', 'sao');
  await page.waitForTimeout(150);
  let info = await page.evaluate(() => ({
    count: document.getElementById('listCount')?.textContent,
    n: document.querySelectorAll('#items .item').length,
    names: [...document.querySelectorAll('#items b')].map(b => b.textContent),
    clear: !document.getElementById('listClear')?.hidden,
  }));
  console.log('sao', info);
  if (info.n !== 1 || !/São Paulo|Sao Paulo/i.test(info.names.join(' '))) throw new Error('diacritic search failed');
  if (!/1 practitioner/.test(info.count || '')) throw new Error('count wrong: ' + info.count);

  // Country search Netherlands
  await page.fill('#qPlace', 'netherlands');
  await page.waitForTimeout(150);
  info = await page.evaluate(() => ({
    count: document.getElementById('listCount')?.textContent,
    n: document.querySelectorAll('#items .item').length,
    names: [...document.querySelectorAll('#items b')].map(b => b.textContent),
  }));
  console.log('netherlands', info);
  if (info.n !== 1 || !/Amsterdam/i.test(info.names.join(' '))) throw new Error('country filter failed');

  // Modality sync MER + clear place → more results
  await page.fill('#qPlace', '');
  await page.selectOption('#listFilter', { label: 'MER' });
  await page.waitForTimeout(150);
  info = await page.evaluate(() => ({
    count: document.getElementById('listCount')?.textContent,
    n: document.querySelectorAll('#items .item').length,
    mapFilter: document.getElementById('filter')?.value,
    listFilter: document.getElementById('listFilter')?.value,
    names: [...document.querySelectorAll('#items b')].map(b => b.textContent),
  }));
  console.log('MER', info);
  if (info.mapFilter !== 'MER' || info.listFilter !== 'MER') throw new Error('modality not synced');
  if (info.n < 3) throw new Error('expected several MER');

  // Combined: MER + Berlin
  await page.fill('#qPlace', 'Berlin');
  await page.waitForTimeout(150);
  info = await page.evaluate(() => ({
    count: document.getElementById('listCount')?.textContent,
    n: document.querySelectorAll('#items .item').length,
    text: document.querySelector('#items')?.textContent,
  }));
  console.log('MER+Berlin', info);
  if (info.n !== 1 || !/Berlin Fascia/i.test(info.text || '')) throw new Error('combined filter failed');
  if (/\(Kreuzberg\)/.test(info.text || '')) throw new Error('label in card');

  // Sticky geometry
  const geo = await page.evaluate(() => {
    const s = document.getElementById('listSearch');
    const cs = getComputedStyle(s);
    return { position: cs.position, top: cs.top, sticky: cs.position === 'sticky' };
  });
  console.log('sticky', geo);
  if (!geo.sticky) throw new Error('search bar not sticky');

  // Show on map
  await page.click('#listToMap');
  await page.waitForFunction(() => document.getElementById('map')?.classList.contains('active'));
  await page.waitForTimeout(500);
  const mapInfo = await page.evaluate(() => ({
    onMap: document.getElementById('map')?.classList.contains('active'),
    filter: document.getElementById('filter')?.value,
    markers: (window.layer && (layer.getLayers ? layer.getLayers().length : 0)) || document.querySelectorAll('.pin,.clbub').length,
  }));
  console.log('map', mapInfo);
  if (!mapInfo.onMap || mapInfo.filter !== 'MER') throw new Error('show on map failed');

  // Back to list for screenshot with useful search state
  await page.evaluate(() => show('list'));
  await page.fill('#qPlace', '');
  await page.selectOption('#listFilter', { label: 'All practices' });
  // sync clears MER - selectOption on listFilter with empty
  await page.evaluate(() => { document.getElementById('listFilter').value = ''; syncModFilter('listFilter'); });
  await page.fill('#qPlace', 'Europe'); // may match nothing - use empty and MER for nice shot
  await page.fill('#qPlace', '');
  await page.selectOption('#listFilter', { label: 'MER' });
  await page.waitForTimeout(200);
  // Better shot: city search Amsterdam showing 1 + clear visible — or broader
  await page.evaluate(() => { document.getElementById('listFilter').value = ''; syncModFilter('listFilter'); });
  await page.fill('#qPlace', 'a'); // matches Amsterdam, Lisbon address?, São Paulo, Tallinn? 
  // Use "land" -> Netherlands, Poland? or just show MER filtered count
  await page.fill('#qPlace', '');
  await page.selectOption('#listFilter', { label: 'Yoga' });
  await page.waitForTimeout(200);
  const shotInfo = await page.evaluate(() => ({
    count: document.getElementById('listCount')?.textContent,
    n: document.querySelectorAll('#items .item').length,
    sw: document.querySelector('script[src*="sw"]'),
  }));
  console.log('shot state', shotInfo);

  // Final nice state: no modality, search "tall" for Tallinn — 1 result — or leave Yoga with 2-3
  // User asked screenshot of search bar — Yoga with multiple is good
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  console.log('wrote', OUT);

  // Clear button
  await page.click('#listClear');
  await page.waitForTimeout(100);
  const cleared = await page.evaluate(() => ({
    q: document.getElementById('qPlace')?.value,
    mod: document.getElementById('listFilter')?.value,
    mapMod: document.getElementById('filter')?.value,
    n: document.querySelectorAll('#items .item').length,
    clearHidden: document.getElementById('listClear')?.hidden,
  }));
  console.log('cleared', cleared);
  if (cleared.q || cleared.mod || cleared.mapMod) throw new Error('clear incomplete');
  if (cleared.n < 5) throw new Error('clear should restore all');

  // SW version
  const ver = readFileSync(join(ROOT, 'app/sw.js'), 'utf8').match(/VERSION="([^"]+)"/)[1];
  console.log('VERSION', ver);
  if (ver !== 'fasciapp-v0.15.0') throw new Error('bad version ' + ver);

  await browser.close(); srv.close();
  console.log('ok');
}
main().catch(e => { console.error(e); process.exit(1); });
