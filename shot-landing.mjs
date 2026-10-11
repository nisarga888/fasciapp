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
  { id: 'm1', sender: 'sophie', recipient: 'lotte', body: "Hi Lotte, I found you on FasciApp. I'd love to book a breathwork session for stress and sleep. Do you have time next week?", created_at: '2026-10-09T09:12:00.000Z', read_at: '2026-10-09T09:40:00.000Z' },
  { id: 'm2', sender: 'lotte', recipient: 'sophie', body: 'Hi Sophie, welcome! I have Tuesday 18:00 or Thursday 10:00 at the Amsterdam studio. 75 min, €80.', created_at: '2026-10-09T10:05:00.000Z', read_at: '2026-10-09T10:20:00.000Z' },
  { id: 'm3', sender: 'sophie', recipient: 'lotte', body: 'Thursday 10:00 is perfect, see you then 🌿', created_at: '2026-10-09T10:28:00.000Z', read_at: null },
  { id: 'm4', sender: 'jonas', recipient: 'lotte', body: 'Hello — saw Amsterdam Breath Studio on the map. Can I book a first MER session next month?', created_at: '2026-10-10T08:15:00.000Z', read_at: null },
  { id: 'm5', sender: 'amira', recipient: 'lotte', body: 'Hi Lotte, I found you on FasciApp. Looking for help with tension and sleep — any openings this week?', created_at: '2026-10-10T14:02:00.000Z', read_at: null },
];
// Clients are not public practitioners — inject display names for inbox/chat
const CLIENTS = {
  sophie: { user_id: 'sophie', name: 'Sophie M.', mods: [], city: 'Amsterdam', country: 'Netherlands', consent: false },
  jonas: { user_id: 'jonas', name: 'Jonas K.', mods: [], city: 'Utrecht', country: 'Netherlands', consent: false },
  amira: { user_id: 'amira', name: 'Amira H.', mods: [], city: 'Haarlem', country: 'Netherlands', consent: false },
};

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
  await page.evaluate(({ msgs, clients }) => {
    me = { user_id: 'lotte', email: 'lotte@example.com' };
    MSG_OK = true;
    window.__landingMsgs = msgs;
    // Name lookup for inbox/chat without putting clients on the map
    const byId = new Map(people.map(p => [p.user_id, p]));
    Object.values(clients).forEach(c => byId.set(c.user_id, c));
    window.nameOf = (id) => (byId.get(id) || {}).name || id;
    const _all = all;
    // Patch all() used by renderInbox to include clients for avatars/names
    window.__clients = clients;
    const origFind = Array.prototype;
    DB.msgOk = async () => true;
    DB.msgs = async () => window.__landingMsgs.slice();
    DB.markRead = async () => {};
    DB.onMsg = () => () => {};
    DB.sendMsg = async () => { throw new Error('demo: no writes'); };
    // Ensure renderInbox can resolve client names via all()
    const prevAll = all;
    // reassign global all used in app — it's const all=()=>... so we extend people with zero-coord-free clients carefully
    clients && Object.values(clients).forEach(c => {
      if (!people.some(p => p.user_id === c.user_id)) people.push({ ...c, lat: null, lng: null, locations: [] });
    });
    hdr();
    fillFilter();
    renderList();
    renderMarkers();
  }, { msgs: MSGS, clients: CLIENTS });
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

  // --- MAP: Europe fit with pins/clusters (no fascia threads) ---
  await page.evaluate(() => { show('map'); });
  await page.waitForFunction(() => !!(window.map && document.querySelector('#map.active')), { timeout: 10000 });
  await page.evaluate(() => {
    const b = document.getElementById('demoBanner');
    if (b) { b.hidden = true; b.style.display = 'none'; }
    didFit = true;
    const pts = [];
    people.forEach(p => (p.locations || []).forEach(l => { if (l.lat != null) pts.push([+l.lat, +l.lng]); }));
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.18), { animate: false, maxZoom: 6 });
    renderMarkers();
    map.invalidateSize();
  });
  await page.waitForTimeout(1200);
  let mapInfo = await page.evaluate(() => ({
    zoom: map.getZoom(),
    pins: document.querySelectorAll('.pin').length,
    clusters: document.querySelectorAll('.clbub').length,
    labels: document.querySelectorAll('.pintitle').length,
    threads: document.querySelectorAll('.thread, .glow').length,
    count: document.querySelector('#count')?.textContent,
    banner: document.getElementById('demoBanner')?.hidden,
  }));
  console.log('map-europe', mapInfo);
  if (mapInfo.threads > 0) throw new Error('fascia threads still visible on map');
  const mapEurope = join(ASSETS, 'v14_map.png');
  await page.screenshot({ path: mapEurope, fullPage: false });
  copyFileSync(mapEurope, join(PROTO, 'v14_map.png'));

  // Labelled city view — distinct from Europe overview
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
    threads: document.querySelectorAll('.thread, .glow').length,
    titles: [...document.querySelectorAll('.pintitle')].map(e => e.textContent),
  }));
  console.log('map-ams-labels', mapInfo);
  if (mapInfo.threads > 0) throw new Error('fascia threads on labelled map');
  if (mapInfo.labels < 1) throw new Error('expected practice labels at z15');
  const mapLabels = join(ASSETS, 'v14_map_labels.png');
  await page.screenshot({ path: mapLabels, fullPage: false });
  copyFileSync(mapLabels, join(PROTO, 'v14_map_labels.png'));

  // --- LIST (one list shot; visitor so Message shows) ---
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
  }));
  console.log('list', listInfo);
  if (listInfo.n < 8) throw new Error('expected >=8 list items, got ' + listInfo.n);
  if (listInfo.names.some(n => /Nisarga|Integral Body|Solec|Sophie/i.test(n))) throw new Error('bad names in list');
  if (!listInfo.hasMsg || !listInfo.hasWa) throw new Error('expected Message + WhatsApp on list');
  const listPath = join(ASSETS, 'v14_list.png');
  await page.screenshot({ path: listPath, fullPage: false });
  copyFileSync(listPath, join(PROTO, 'v14_list.png'));

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
  }));
  console.log('log', logInfo);
  if (logInfo.n < 8) throw new Error('expected sessions');
  const logPath = join(ASSETS, 'v14_session_log.png');
  await page.screenshot({ path: logPath, fullPage: false });
  copyFileSync(logPath, join(PROTO, 'v14_session_log.png'));

  // --- INBOX CHAT: client Sophie M. booking ---
  await page.evaluate(() => {
    me = { user_id: 'lotte', email: 'lotte@example.com' };
    MSG_OK = true;
    msgs = window.__landingMsgs.slice();
    hdr();
    show('inbox');
    openChat('sophie');
  });
  await page.waitForSelector('#chat:not([hidden])', { timeout: 10000 });
  await page.waitForSelector('.bub', { timeout: 10000 });
  await page.waitForTimeout(500);
  const chatInfo = await page.evaluate(() => ({
    name: document.querySelector('#chatName')?.textContent,
    bubs: document.querySelectorAll('.bub').length,
    text: document.querySelector('#chatLog')?.textContent || '',
    inbox: document.querySelector('#convs')?.textContent || '',
  }));
  console.log('chat', { name: chatInfo.name, bubs: chatInfo.bubs, preview: chatInfo.text.slice(0, 160) });
  if (!/Sophie/i.test(chatInfo.name || '')) throw new Error('expected Sophie M. chat, got ' + chatInfo.name);
  if (!/found you on FasciApp/i.test(chatInfo.text)) throw new Error('expected booking enquiry copy');
  if (/peer exchange|somatic swap|Inês|Ines Oliveira|Lukas/i.test(chatInfo.text)) throw new Error('peer-swap content still present');
  const msgPath = join(ASSETS, 'v14_messages.png');
  await page.screenshot({ path: msgPath, fullPage: false });
  copyFileSync(msgPath, join(PROTO, 'v14_messages.png'));

  const banned = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      nisarga: /Nisarga/i.test(t),
      ibi: /integralbodyinstitute|Solec-Zdrój|Solec/i.test(t),
      peer: /peer exchange|somatic swap/i.test(t),
    };
  });
  console.log('banned-check', banned);
  if (banned.nisarga || banned.ibi || banned.peer) throw new Error('banned content: ' + JSON.stringify(banned));

  await ctx.close();

  // Gallery: Europe map, labelled map (replaces duplicate list), one list, session log, messages
  const indexPath = join(ROOT, 'index.html');
  let html = readFileSync(indexPath, 'utf8');
  const shotsBlock = `<div class="shots">
 <figure><img src="assets/v14_map.png" alt="Practitioner map across Europe with clusters" loading="lazy"><figcaption>The network map</figcaption></figure>
 <figure><img src="assets/v14_map_labels.png" alt="Map zoomed in with practice labels" loading="lazy"><figcaption>Pins, clusters &amp; labels</figcaption></figure>
 <figure><img src="assets/v14_list.png" alt="Practitioner list with Message, Call, WhatsApp and Email" loading="lazy"><figcaption>Message, Call, WhatsApp</figcaption></figure>
 <figure><img src="assets/v14_session_log.png" alt="Session log with client initials" loading="lazy"><figcaption>Session log · 60 sessions</figcaption></figure>
 <figure><img src="assets/v14_messages.png" alt="Client booking chat in inbox" loading="lazy"><figcaption>Book via messages</figcaption></figure>
</div>`;
  if (!html.includes('<div class="shots">')) throw new Error('shots block missing');
  html = html.replace(/<div class="shots">[\s\S]*?<\/div>\n/, shotsBlock + '\n');
  writeFileSync(indexPath, html);
  console.log('updated index.html shots');

  const land = await browser.newContext({ viewport: { width: 1100, height: 1800 }, deviceScaleFactor: 2 });
  const landPage = await land.newPage();
  await landPage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await landPage.evaluate(() => document.querySelectorAll('.f').forEach(e => e.classList.add('seen')));
  await landPage.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('.shots img')];
    return imgs.length >= 5 && imgs.every(i => i.complete && i.naturalWidth > 0);
  }, null, { timeout: 20000 });
  await landPage.waitForTimeout(400);
  const box1 = await landPage.locator('h2', { hasText: 'A look at the app' }).boundingBox();
  const box2 = await landPage.locator('.shots').boundingBox();
  const left = Math.max(0, Math.min(box1.x, box2.x) - 24);
  const top = Math.max(0, box1.y - 20);
  const right = Math.min(1100, Math.max(box1.x + box1.width, box2.x + box2.width) + 24);
  const bottom = box2.y + box2.height + 28;
  const clip = { x: left, y: top, width: right - left, height: bottom - top };
  const outLand = join(PROTO, 'v14_landing.png');
  await landPage.screenshot({ path: outLand, clip });
  console.log('landing', outLand, clip);

  const idxHtml = readFileSync(indexPath, 'utf8');
  for (const old of ['v13_whatsapp.png', 'v13_list.png', 'v13_map.png', 'v13_messages.png', 'v13_session_log.png']) {
    if (idxHtml.includes(old)) throw new Error('still references ' + old);
  }
  if (!idxHtml.includes('v14_map.png') || !idxHtml.includes('v14_map_labels.png') || !idxHtml.includes('v14_messages.png')) {
    throw new Error('v14 assets not linked');
  }

  await browser.close();
  srv.close();
  console.log('done');
}

main().catch(e => { console.error(e); process.exit(1); });
