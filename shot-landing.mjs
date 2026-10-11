import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const ASSETS = join(ROOT, 'assets');
const PROTO = '/workspace/ibi/mer-app/prototype/screens';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const MOCK = {
  lotte: {
    id: 'lotte', user_id: 'lotte', name: 'Lotte de Vries',
    practice_name: 'Amsterdam Breath Studio',
    mods: ['Breathwork', 'MER'], city: 'Amsterdam', country: 'Netherlands',
    lat: 52.3676, lng: 4.9041, phone: '+31612345678', whatsapp: true,
    email: 'lotte@example.com', website: 'amsterdambreath.example',
    bio: 'Breathwork and MER sessions in Amsterdam.',
    consent: true, photo: null, created_at: '2026-01-01T00:00:00Z',
    locations: [{ label: 'Studio', address: 'Prinsengracht 100', city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 }],
  },
  ines: {
    id: 'ines', user_id: 'ines', name: 'Inês Oliveira',
    practice_name: 'Lisbon Somatic Space',
    mods: ['Somatic therapy', 'Yoga'], city: 'Lisbon', country: 'Portugal',
    lat: 38.7223, lng: -9.1393, phone: '+351912345678', whatsapp: true,
    email: 'ines@example.com', website: 'lisbonsomatic.example',
    bio: 'Somatic therapy and yoga near the Tagus.',
    consent: true, photo: null, created_at: '2026-01-02T00:00:00Z',
    locations: [{ label: '', address: 'Rua Augusta 50', city: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 }],
  },
  lukas: {
    id: 'lukas', user_id: 'lukas', name: 'Lukas Berger',
    practice_name: 'Berlin Fascia Atelier',
    mods: ['MER', 'Craniosacral'], city: 'Berlin', country: 'Germany',
    lat: 52.52, lng: 13.405, phone: '+491701234567', whatsapp: true,
    email: 'lukas@example.com', website: 'berlinfascia.example',
    bio: 'MER and craniosacral work in Berlin.',
    consent: true, photo: null, created_at: '2026-01-03T00:00:00Z',
    locations: [{ label: 'Kreuzberg', address: 'Oranienstr. 12', city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 }],
  },
  clara: {
    id: 'clara', user_id: 'clara', name: 'Clara Ruiz',
    practice_name: 'Barcelona Bodywork',
    mods: ['BBTRS', 'Breathwork'], city: 'Barcelona', country: 'Spain',
    lat: 41.3874, lng: 2.1686, phone: '+34600111222', whatsapp: true,
    email: 'clara@example.com', website: 'bcnbodywork.example',
    bio: 'BBTRS and breathwork in Barcelona.',
    consent: true, photo: null, created_at: '2026-01-04T00:00:00Z',
    locations: [{ label: '', address: 'Carrer del Consell de Cent 200', city: 'Barcelona', country: 'Spain', lat: 41.3874, lng: 2.1686 }],
  },
  freja: {
    id: 'freja', user_id: 'freja', name: 'Freja Nielsen',
    practice_name: 'Copenhagen Quiet Body',
    mods: ['Craniosacral', 'Yoga'], city: 'Copenhagen', country: 'Denmark',
    lat: 55.6761, lng: 12.5683, phone: '+4520123456', whatsapp: true,
    email: 'freja@example.com', website: 'cphquietbody.example',
    bio: 'Gentle craniosacral and yoga.',
    consent: true, photo: null, created_at: '2026-01-05T00:00:00Z',
    locations: [{ label: 'Studio', address: 'Nørrebrogade 40', city: 'Copenhagen', country: 'Denmark', lat: 55.6761, lng: 12.5683 }],
  },
  elena: {
    id: 'elena', user_id: 'elena', name: 'Elena Hofmann',
    practice_name: 'Vienna Somatic Studio',
    mods: ['MER', 'Somatic therapy'], city: 'Vienna', country: 'Austria',
    lat: 48.2082, lng: 16.3738, phone: '+436601234567', whatsapp: true,
    email: 'elena@example.com', website: 'viennasomatic.example',
    bio: 'MER and somatic therapy in Vienna.',
    consent: true, photo: null, created_at: '2026-01-06T00:00:00Z',
    locations: [{ label: '', address: 'Neubaugasse 15', city: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 }],
  },
  nikos: {
    id: 'nikos', user_id: 'nikos', name: 'Nikos Papadopoulos',
    practice_name: 'Athens Breath Lab',
    mods: ['Breathwork', 'BBTRS'], city: 'Athens', country: 'Greece',
    lat: 37.9838, lng: 23.7275, phone: '+306912345678', whatsapp: true,
    email: 'nikos@example.com', website: 'athensbreath.example',
    bio: 'Breathwork and BBTRS near the Acropolis.',
    consent: true, photo: null, created_at: '2026-01-07T00:00:00Z',
    locations: [{ label: '', address: 'Ermou 25', city: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 }],
  },
  kaia: {
    id: 'kaia', user_id: 'kaia', name: 'Kaia Mets',
    practice_name: 'Tallinn Yoga & MER',
    mods: ['Yoga', 'MER'], city: 'Tallinn', country: 'Estonia',
    lat: 59.437, lng: 24.7536, phone: '+37251234567', whatsapp: true,
    email: 'kaia@example.com', website: 'tallinnyogamer.example',
    bio: 'Yoga and MER in Tallinn.',
    consent: true, photo: null, created_at: '2026-01-08T00:00:00Z',
    locations: [{ label: 'Telliskivi', address: 'Telliskivi 60a', city: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.7536 }],
  },
};

// Extra nearby Amsterdam pin so clustering is visible when zoomed in
MOCK.lotte2 = {
  id: 'lotte2', user_id: 'lotte2', name: 'Mila Jansen',
  practice_name: 'Canal Side Fascia',
  mods: ['MER', 'Craniosacral'], city: 'Amsterdam', country: 'Netherlands',
  lat: 52.3705, lng: 4.8950, phone: '+31687654321', whatsapp: true,
  email: 'mila@example.com', website: 'canalsidefascia.example',
  bio: 'Fascia-focused sessions near the canals.',
  consent: true, photo: null, created_at: '2026-01-09T00:00:00Z',
  locations: [{ label: 'Jordaan', address: 'Haarlemmerdijk 20', city: 'Amsterdam', country: 'Netherlands', lat: 52.3705, lng: 4.8950 }],
};

const SESSIONS = {
  lotte: [
    { id: 's1', user_id: 'lotte', initials: 'A.B.', date: '2026-09-02', duration: 90, comment: 'First MER session', created_at: '2026-09-02T10:00:00Z' },
    { id: 's2', user_id: 'lotte', initials: 'C.D.', date: '2026-09-05', duration: 60, comment: 'Breathwork follow-up', created_at: '2026-09-05T11:00:00Z' },
    { id: 's3', user_id: 'lotte', initials: 'E.F.', date: '2026-09-08', duration: 75, comment: '', created_at: '2026-09-08T09:30:00Z' },
    { id: 's4', user_id: 'lotte', initials: 'G.H.', date: '2026-09-12', duration: 90, comment: 'Deep rest', created_at: '2026-09-12T14:00:00Z' },
    { id: 's5', user_id: 'lotte', initials: 'I.J.', date: '2026-09-15', duration: 60, comment: '', created_at: '2026-09-15T16:00:00Z' },
    { id: 's6', user_id: 'lotte', initials: 'K.L.', date: '2026-09-18', duration: 90, comment: 'BBTRS intro', created_at: '2026-09-18T10:00:00Z' },
    { id: 's7', user_id: 'lotte', initials: 'M.N.', date: '2026-09-22', duration: 60, comment: '', created_at: '2026-09-22T12:00:00Z' },
    { id: 's8', user_id: 'lotte', initials: 'O.P.', date: '2026-09-25', duration: 75, comment: 'Integration', created_at: '2026-09-25T15:00:00Z' },
    { id: 's9', user_id: 'lotte', initials: 'Q.R.', date: '2026-09-29', duration: 90, comment: '', created_at: '2026-09-29T11:00:00Z' },
    { id: 's10', user_id: 'lotte', initials: 'S.T.', date: '2026-10-03', duration: 60, comment: 'Breath + fascia', created_at: '2026-10-03T13:00:00Z' },
    { id: 's11', user_id: 'lotte', initials: 'U.V.', date: '2026-10-06', duration: 90, comment: '', created_at: '2026-10-06T10:00:00Z' },
    { id: 's12', user_id: 'lotte', initials: 'W.X.', date: '2026-10-09', duration: 75, comment: 'Closing session', created_at: '2026-10-09T17:00:00Z' },
  ],
};

const MSGS = [
  { id: 'm1', sender: 'lotte', recipient: 'ines', body: 'Hi Inês! I loved your Lisbon Somatic Space listing. Do you have space for a peer exchange next month?', created_at: '2026-10-08T14:20:00.000Z', read_at: '2026-10-08T14:40:00.000Z' },
  { id: 'm2', sender: 'ines', recipient: 'lotte', body: 'Hello Lotte! Yes — the first week of November works. Shall we do a 90-minute MER / somatic swap?', created_at: '2026-10-08T15:02:00.000Z', read_at: null },
  { id: 'm3', sender: 'lotte', recipient: 'ines', body: 'Perfect — let’s plan for Tuesday 4 Nov at 15:00. Looking forward to it 🌿', created_at: '2026-10-08T15:18:00.000Z', read_at: null },
  { id: 'm4', sender: 'lukas', recipient: 'lotte', body: 'Hi Lotte — quick note from Berlin. Your Amsterdam Breath Studio workshops look great!', created_at: '2026-10-09T09:00:00.000Z', read_at: null },
];

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

async function freePort() {
  return new Promise((res, rej) => {
    const n = createServer().listen(0, '127.0.0.1', () => { const p = n.address().port; n.close(() => res(p)); });
    n.once('error', rej);
  });
}

async function boot(page, port) {
  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.DB && window.DB.mode === 'local', null, { timeout: 15000 });
  await page.evaluate(() => {
    const b = document.getElementById('demoBanner');
    if (b) { b.hidden = true; b.style.display = 'none'; }
  });
}

async function asLotte(page) {
  await page.evaluate(({ msgs }) => {
    me = { user_id: 'lotte', email: 'lotte@example.com' };
    MSG_OK = true;
    msgs_store = msgs;
    window.__landingMsgs = msgs;
    DB.msgOk = async () => true;
    DB.msgs = async () => window.__landingMsgs.slice();
    DB.markRead = async () => {};
    DB.onMsg = () => () => {};
    DB.sendMsg = async () => { throw new Error('demo: no writes'); };
    hdr();
    fillFilter();
    renderList();
    renderMarkers();
  }, { msgs: MSGS });
}

async function main() {
  mkdirSync(ASSETS, { recursive: true });
  mkdirSync(PROTO, { recursive: true });
  const port = await freePort();
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const seed = {
    profiles: MOCK,
    sessions: SESSIONS,
    session: { user_id: 'lotte', email: 'lotte@example.com' },
  };

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript((s) => {
    const fake = {
      register: async () => ({ unregister: async () => true }),
      getRegistrations: async () => [],
      addEventListener() {}, removeEventListener() {},
      controller: null,
      ready: Promise.resolve({ unregister: async () => true }),
    };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get() { return fake; } });
    localStorage.setItem('fyp_profiles2', JSON.stringify(s.profiles));
    localStorage.setItem('fyp_sessions', JSON.stringify(s.sessions));
    localStorage.setItem('fyp_session', JSON.stringify(s.session));
  }, seed);

  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await boot(page, port);
  await asLotte(page);
  await page.waitForFunction(() => document.body.classList.contains('in') || true);

  // --- MAP: Europe fit with pins/clusters ---
  await page.evaluate(() => { show('map'); });
  await page.waitForFunction(() => !!(window.map && document.querySelector('#map.active')), { timeout: 10000 });
  await page.evaluate(() => {
    const b = document.getElementById('demoBanner');
    if (b) { b.hidden = true; b.style.display = 'none'; }
    didFit = true;
    const pts = [];
    people.forEach(p => (p.locations || []).forEach(l => { if (l.lat != null) pts.push([+l.lat, +l.lng]); }));
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.18), { animate: false, maxZoom: 6 });
    map.invalidateSize();
  });
  await page.waitForTimeout(1200);
  let mapInfo = await page.evaluate(() => ({
    zoom: map.getZoom(),
    pins: document.querySelectorAll('.pin').length,
    clusters: document.querySelectorAll('.clbub').length,
    labels: document.querySelectorAll('.pintitle').length,
    count: document.querySelector('#count')?.textContent,
    banner: document.getElementById('demoBanner')?.hidden,
    bad: [...document.querySelectorAll('body *')].some(el => /Nisarga|integralbodyinstitute|Solec|IBI\b/i.test(el.textContent || '') && el.children.length === 0),
  }));
  console.log('map-europe', mapInfo);
  const mapPath = join(ASSETS, 'v13_map.png');
  await page.screenshot({ path: mapPath, fullPage: false });
  copyFileSync(mapPath, join(PROTO, 'v13_map.png'));

  // Labelled city view (clusters disable at z15) — Amsterdam Breath Studio + Canal Side
  await page.evaluate(async () => {
    didFit = true;
    await new Promise(r => { map.setView([52.368, 4.90], 15, { animate: false }); map.once('moveend', r); setTimeout(r, 500); });
    renderMarkers();
    map.invalidateSize();
  });
  await page.waitForTimeout(1100);
  mapInfo = await page.evaluate(() => ({
    zoom: map.getZoom(),
    pins: document.querySelectorAll('.pin').length,
    clusters: document.querySelectorAll('.clbub').length,
    labels: document.querySelectorAll('.pintitle').length,
    titles: [...document.querySelectorAll('.pintitle')].map(e => e.textContent),
  }));
  console.log('map-ams-labels', mapInfo);
  const overview = join(ASSETS, 'v13_map_europe.png');
  // Keep continental overview already written as mapPath; copy to overview, then prefer labelled if present
  copyFileSync(mapPath, overview);
  copyFileSync(overview, join(PROTO, 'v13_map_europe.png'));
  if (mapInfo.labels >= 1) {
    await page.screenshot({ path: mapPath, fullPage: false });
    copyFileSync(mapPath, join(PROTO, 'v13_map.png'));
  }

  // --- LIST (browse as visitor so Message shows on every card, incl. Amsterdam) ---
  await page.evaluate(() => {
    me = { user_id: 'visitor', email: 'visitor@example.com' };
    MSG_OK = true;
    hdr();
    show('list');
    renderList();
  });
  await page.waitForSelector('#items .item', { timeout: 10000 });
  await page.waitForTimeout(400);
  const listInfo = await page.evaluate(() => ({
    n: document.querySelectorAll('#items .item').length,
    names: [...document.querySelectorAll('#items b')].map(b => b.textContent),
    hasMsg: !!document.querySelector('.cb.msg'),
    hasWa: !!document.querySelector('.cb.wa'),
    banner: document.getElementById('demoBanner')?.hidden,
  }));
  console.log('list', listInfo);
  if (listInfo.n < 8) throw new Error('expected >=8 list items, got ' + listInfo.n);
  if (listInfo.names.some(n => /Nisarga|Integral Body|Solec/i.test(n))) throw new Error('real/test names in list');
  const listPath = join(ASSETS, 'v13_list.png');
  await page.screenshot({ path: listPath, fullPage: false });
  copyFileSync(listPath, join(PROTO, 'v13_list.png'));

  // --- CARD (Amsterdam / Lotte) clipped ---
  const cardClip = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#items .item')];
    const item = items.find(el => /Amsterdam Breath Studio|Lotte de Vries/.test(el.textContent)) || items[0];
    item.scrollIntoView({ block: 'center' });
    const r = item.getBoundingClientRect();
    const hdr = document.querySelector('header')?.getBoundingClientRect();
    const top = Math.max(0, Math.min(r.y - 12, (hdr ? hdr.bottom + 8 : r.y - 12)));
    return {
      x: Math.max(0, r.x - 8),
      y: top,
      width: Math.min(390 - 8, r.width + 16),
      height: Math.min(520, r.height + 24),
      text: item.textContent.slice(0, 120),
    };
  });
  console.log('cardClip', cardClip);
  const cardPath = join(ASSETS, 'v13_card.png');
  await page.screenshot({ path: cardPath, clip: { x: cardClip.x, y: cardClip.y, width: cardClip.width, height: cardClip.height } });
  copyFileSync(cardPath, join(PROTO, 'v13_card.png'));

  // Full-frame card context (list scrolled to Amsterdam) for landing "Call, WhatsApp"
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('#items .item')];
    const item = items.find(el => /Amsterdam Breath Studio/.test(el.textContent));
    if (item) item.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  const cardFull = join(ASSETS, 'v13_whatsapp.png');
  await page.screenshot({ path: cardFull, fullPage: false });
  copyFileSync(cardFull, join(PROTO, 'v13_whatsapp.png'));

  // --- SESSION LOG ---
  await page.evaluate(() => {
    me = { user_id: 'lotte', email: 'lotte@example.com' };
    hdr();
    show('log');
  });
  await page.waitForSelector('#sessList .sess', { timeout: 10000 });
  await page.waitForTimeout(400);
  const logInfo = await page.evaluate(() => ({
    n: document.querySelectorAll('#sessList .sess').length,
    progress: document.querySelector('#pNum')?.textContent,
    initials: [...document.querySelectorAll('#sessList b')].map(b => b.textContent),
    banner: document.getElementById('demoBanner')?.hidden,
  }));
  console.log('log', logInfo);
  if (logInfo.n < 8) throw new Error('expected sessions');
  if (logInfo.initials.some(i => /Nisarga/i.test(i))) throw new Error('bad initials');
  const logPath = join(ASSETS, 'v13_session_log.png');
  await page.screenshot({ path: logPath, fullPage: false });
  copyFileSync(logPath, join(PROTO, 'v13_session_log.png'));

  // --- INBOX CHAT ---
  await page.evaluate(() => {
    msgs = window.__landingMsgs.slice();
    show('inbox');
    openChat('ines');
  });
  await page.waitForSelector('#chat:not([hidden])', { timeout: 10000 });
  await page.waitForSelector('.bub.me', { timeout: 10000 });
  await page.waitForTimeout(500);
  const chatInfo = await page.evaluate(() => ({
    name: document.querySelector('#chatName')?.textContent,
    bubs: document.querySelectorAll('.bub').length,
    text: document.querySelector('#chatLog')?.textContent?.slice(0, 200),
  }));
  console.log('chat', chatInfo);
  if (!/Inês|Ines/i.test(chatInfo.name || '')) throw new Error('expected Inês chat');
  if (/Nisarga|IBI|integralbody/i.test(chatInfo.text || '')) throw new Error('bad chat content');
  const msgPath = join(ASSETS, 'v13_messages.png');
  await page.screenshot({ path: msgPath, fullPage: false });
  copyFileSync(msgPath, join(PROTO, 'v13_messages.png'));

  // Guard: no banned strings in any asset screen HTML text
  const banned = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      nisarga: /Nisarga/i.test(t),
      ibi: /integralbodyinstitute|Solec-Zdrój|Solec/i.test(t),
      realPL: /\+48\s?\d{3}/.test(t),
    };
  });
  console.log('banned-check', banned);
  if (banned.nisarga || banned.ibi || banned.realPL) throw new Error('banned content visible: ' + JSON.stringify(banned));

  await ctx.close();

  // --- Update index.html gallery ---
  const indexPath = join(ROOT, 'index.html');
  let html = readFileSync(indexPath, 'utf8');
  const shotsBlock = `<div class="shots">
 <figure><img src="assets/v13_map.png" alt="Practitioner map with clusters and labels" loading="lazy"><figcaption>The network map</figcaption></figure>
 <figure><img src="assets/v13_whatsapp.png" alt="Practitioner card with Message, Call, WhatsApp and Email" loading="lazy"><figcaption>Message, Call, WhatsApp</figcaption></figure>
 <figure><img src="assets/v13_list.png" alt="Practitioner list across Europe" loading="lazy"><figcaption>Find practitioners</figcaption></figure>
 <figure><img src="assets/v13_session_log.png" alt="Session log with client initials" loading="lazy"><figcaption>Session log · 60 sessions</figcaption></figure>
 <figure><img src="assets/v13_messages.png" alt="In-app messaging inbox and chat" loading="lazy"><figcaption>Message practitioners</figcaption></figure>
</div>`;
  if (!html.includes('<div class="shots">')) throw new Error('shots block missing');
  html = html.replace(/<div class="shots">[\s\S]*?<\/div>\n/, shotsBlock + '\n');
  writeFileSync(indexPath, html);
  console.log('updated index.html shots');

  // --- Landing row screenshot ---
  const land = await browser.newContext({ viewport: { width: 1100, height: 1800 }, deviceScaleFactor: 2 });
  const landPage = await land.newPage();
  await landPage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await landPage.evaluate(() => document.querySelectorAll('.f').forEach(e => e.classList.add('seen')));
  // wait for images
  await landPage.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('.shots img')];
    return imgs.length >= 4 && imgs.every(i => i.complete && i.naturalWidth > 0);
  }, null, { timeout: 20000 });
  await landPage.waitForTimeout(400);
  const box1 = await landPage.locator('h2', { hasText: 'A look at the app' }).boundingBox();
  const box2 = await landPage.locator('.shots').boundingBox();
  const left = Math.max(0, Math.min(box1.x, box2.x) - 24);
  const top = Math.max(0, box1.y - 20);
  const right = Math.min(1100, Math.max(box1.x + box1.width, box2.x + box2.width) + 24);
  const bottom = box2.y + box2.height + 28;
  const clip = { x: left, y: top, width: right - left, height: bottom - top };
  const outLand = join(PROTO, 'v13_landing.png');
  await landPage.screenshot({ path: outLand, clip });
  console.log('landing', outLand, clip);

  // sanity: old assets no longer referenced
  const idx = readFileSync(indexPath, 'utf8');
  for (const old of ['v3_04_map.png', 'v3_07_whatsapp.png', 'v3_06_session_log.png', 'v8_messages.png']) {
    if (idx.includes(old)) throw new Error('still references ' + old);
  }
  if (!idx.includes('v13_map.png') || !idx.includes('v13_messages.png')) throw new Error('new assets not linked');

  await browser.close();
  srv.close();
  console.log('done');
}

main().catch(e => { console.error(e); process.exit(1); });
