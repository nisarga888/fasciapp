import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:8765/app/';
const ts = Date.now();
const EMAIL = `fasciapp.test+${ts}@bodyawareness.ee`;
const PASS = 'TestFasciApp!' + String(ts).slice(-6);
const NAME = `Test Pract ${String(ts).slice(-4)}`;

const log = (...a) => console.log('[test]', ...a);
const fail = (msg, extra) => { console.error('[FAIL]', msg, extra || ''); process.exitCode = 1; throw new Error(msg); };

async function waitStatus(page, re, timeout = 60000) {
  await page.waitForFunction((src) => new RegExp(src).test(document.querySelector('#status')?.textContent || ''), re.source, { timeout });
  return page.locator('#status').innerText();
}

async function getToken(page) {
  return page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        try { return JSON.parse(localStorage.getItem(k)).access_token; } catch {}
      }
    }
    return null;
  });
}

async function apiCleanup(page) {
  return page.evaluate(async () => {
    const url = window.FASCIAPP_CONFIG.SUPABASE_URL;
    const key = window.FASCIAPP_CONFIG.SUPABASE_ANON_KEY;
    let token = null;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        try { token = JSON.parse(localStorage.getItem(k)).access_token; } catch {}
      }
    }
    const hdrs = { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const user = await (await fetch(`${url}/auth/v1/user`, { headers: hdrs })).json();
    const uid = user.id;
    const delSess = await fetch(`${url}/rest/v1/sessions?user_id=eq.${uid}`, { method: 'DELETE', headers: hdrs });
    const delPract = await fetch(`${url}/rest/v1/practitioners?user_id=eq.${uid}`, { method: 'DELETE', headers: hdrs });
    const leftPract = await (await fetch(`${url}/rest/v1/practitioners?select=id`, { headers: hdrs })).json();
    const leftSess = await (await fetch(`${url}/rest/v1/sessions?select=id`, { headers: hdrs })).json();
    return { uid, delSessStatus: delSess.status, delPractStatus: delPract.status, leftPract, leftSess };
  });
}

async function main() {
  log('BASE', BASE, 'EMAIL', EMAIL);
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let userId = null;
  const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx1.addInitScript(() => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
  });
  const page = await ctx1.newPage();
  page.on('console', m => { if (m.type() === 'error') log('console.error', m.text()); });
  page.on('pageerror', e => log('pageerror', e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.DB && window.DB.mode === 'supabase', null, { timeout: 15000 });
  log('DB.mode', await page.evaluate(() => window.DB.mode));

  // Sign up
  await page.click('#goPract');
  await page.waitForSelector('#authForm', { state: 'visible' });
  await page.fill('#email', EMAIL);
  await page.fill('#pw', PASS);
  await page.check('#agree');
  await page.click('#authBtn');
  await page.waitForSelector('#profForm', { state: 'visible', timeout: 30000 });
  const sess = await page.evaluate(async () => await window.DB.session());
  if (!sess?.user_id) fail('No session after signup', sess);
  userId = sess.user_id;
  log('signed up', userId);

  // Profile
  await page.fill('#profForm input[name=name]', NAME);
  await page.waitForSelector('#modBox .tag');
  await page.click('#modBox .tag[data-m="MER"]');
  await page.click('#modBox .tag[data-m="Yoga"]');
  const tagsOn = await page.evaluate(() => [...document.querySelectorAll('#modBox .tag.on')].map(b => b.dataset.m));
  log('tags', tagsOn);
  if (!tagsOn.includes('MER') || !tagsOn.includes('Yoga')) fail('tags not selected', tagsOn);

  await page.fill('#profForm input[name=label]', 'Tallinn studio');
  await page.fill('#profForm input[name=city]', 'Tallinn');
  await page.selectOption('#profForm select[name=country]', { label: 'Estonia' });

  await page.click('#addLoc');
  await page.waitForSelector('#extraLocs .xloc');
  const x = page.locator('#extraLocs .xloc').first();
  await x.locator('[data-k=label]').fill('Lesvos summers');
  await x.locator('[data-k=city]').fill('Lesvos');
  await x.locator('[data-k=country]').selectOption({ label: 'Greece' });

  await page.check('#profForm input[name=consent]');
  await page.locator('#profForm button.gold.big1').click();

  const st = await waitStatus(page, /Saved ✓|Could not/, 90000);
  log('save status', st);
  if (/Could not/.test(st)) fail('save failed', st);

  const mine = await page.evaluate(async () => {
    const p = await window.DB.mine();
    return { name: p?.name, mods: p?.mods, locations: p?.locations, consent: p?.consent };
  });
  log('mine', JSON.stringify(mine));
  if (mine.name !== NAME) fail('name mismatch', mine.name);
  if (!mine.mods?.includes('MER') || !mine.mods?.includes('Yoga')) fail('mods missing', mine.mods);
  if (!mine.locations || mine.locations.length < 2) fail('need 2 locations', mine.locations);
  const cities = mine.locations.map(l => (l.city || '').toLowerCase());
  if (!cities.some(c => c.includes('tallinn'))) fail('missing Tallinn', cities);
  if (!cities.some(c => c.includes('lesvos'))) fail('missing Lesvos', cities);
  if (mine.locations.some(l => l.lat == null || l.lng == null)) fail('missing coords', mine.locations);

  // Session log
  await page.click('nav button[data-t=log]');
  await page.waitForSelector('#logBox', { state: 'visible' });
  await page.fill('#sessForm input[name=initials]', 'AK');
  await page.fill('#sessForm input[name=duration]', '60');
  await page.fill('#sessForm textarea[name=comment]', 'live test session');
  await page.click('#sfBtn');
  await page.waitForFunction(() => /Session added|Saved|Could not/.test(document.querySelector('#sfMsg')?.textContent || ''), null, { timeout: 20000 });
  const sfMsg = await page.locator('#sfMsg').innerText();
  log('session msg', sfMsg);
  if (/Could not/.test(sfMsg)) fail('session save failed', sfMsg);
  const sessions1 = await page.evaluate(async () => await window.DB.sessions());
  log('sessions', sessions1.length, sessions1[0]?.initials);
  if (sessions1.length < 1 || sessions1[0].initials !== 'AK') fail('session not persisted', sessions1);

  // Fresh anonymous context
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.addInitScript(() => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
  });
  const page2 = await ctx2.newPage();
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  await page2.waitForFunction(() => window.DB && window.DB.mode === 'supabase', null, { timeout: 15000 });
  await page2.click('#goLook');
  await page2.waitForSelector('#leaf', { state: 'visible' });

  const publicHit = await page2.waitForFunction(async (name) => {
    const list = await window.DB.list();
    const p = list.find(x => x.name === name);
    if (!p) return false;
    const locs = p.locations || [];
    return {
      name: p.name,
      mods: p.mods,
      cities: locs.map(l => l.city),
      pinCount: locs.filter(l => l.lat != null).length,
    };
  }, NAME, { timeout: 25000 }).then(h => h.jsonValue()).catch(async () => {
    const people = await page2.evaluate(async () => (await window.DB.list()).map(p => ({ name: p.name, locs: (p.locations||[]).map(l=>l.city) })));
    fail('profile not visible anonymously', people);
  });
  log('public', publicHit);
  if (!publicHit || publicHit.pinCount < 2) fail('expected 2 pins', publicHit);
  if (!publicHit.cities.some(c => /tallinn/i.test(c)) || !publicHit.cities.some(c => /lesvos/i.test(c))) {
    fail('cities missing in public view', publicHit.cities);
  }

  await page2.click('nav button[data-t=list]');
  await page2.waitForSelector('#items');
  // allow render
  await page2.waitForFunction((name) => (document.querySelector('#items')?.innerText || '').includes(name), NAME, { timeout: 10000 });
  const listHtml = await page2.locator('#items').innerText();
  log('list ok, has Tallinn?', /Tallinn/i.test(listHtml), 'Lesvos?', /Lesvos/i.test(listHtml));
  if (!/Tallinn/i.test(listHtml) || !/Lesvos/i.test(listHtml)) fail('locations not in list card', listHtml.slice(0,500));

  // Map markers: filter by name via evaluating pins of our person vs markers
  await page2.click('nav button[data-t=map]');
  await page2.waitForTimeout(800);
  const mapCheck = await page2.evaluate(async (name) => {
    const list = await window.DB.list();
    const p = list.find(x => x.name === name);
    const locs = (p?.locations && p.locations.length ? p.locations : []).filter(l => l && l.lat != null);
    return { found: !!p, pinCount: locs.length, markerDom: document.querySelectorAll('.leaflet-marker-icon').length };
  }, NAME);
  log('map', mapCheck);
  if (!mapCheck.found || mapCheck.pinCount < 2) fail('map pins missing in data', mapCheck);
  if (mapCheck.markerDom < 2) fail('expected >=2 map markers', mapCheck);

  // Re-login, verify session persists
  await page2.click('#hIn');
  await page2.click('#tabIn');
  await page2.fill('#email', EMAIL);
  await page2.fill('#pw', PASS);
  await page2.click('#authBtn');
  await page2.waitForSelector('#profForm', { state: 'visible', timeout: 30000 });
  await page2.click('nav button[data-t=log]');
  await page2.waitForSelector('#logBox', { state: 'visible' });
  await page2.waitForFunction(() => (document.querySelector('#sessList')?.innerText || '').includes('AK'), null, { timeout: 15000 });
  const sessions2 = await page2.evaluate(async () => await window.DB.sessions());
  log('sessions after re-login', sessions2.length);
  if (sessions2.length < 1) fail('session did not persist');

  // Cleanup
  const cleanup = await apiCleanup(page2);
  log('cleanup', cleanup);
  if (cleanup.delPractStatus >= 400) fail('delete practitioner failed', cleanup);
  if (Array.isArray(cleanup.leftPract) && cleanup.leftPract.length) fail('practitioner still present', cleanup.leftPract);
  if (Array.isArray(cleanup.leftSess) && cleanup.leftSess.length) fail('sessions still present', cleanup.leftSess);

  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  await page3.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page3.waitForFunction(() => window.DB && window.DB.mode === 'supabase');
  const still = await page3.evaluate(async (name) => (await window.DB.list()).some(p => p.name === name), NAME);
  if (still) fail('test profile still public after delete');
  log('public gone after delete: ok');

  await browser.close();
  console.log(JSON.stringify({
    ok: true,
    email: EMAIL,
    userId,
    note: 'Auth user remains in Supabase Auth → Users; delete manually if desired.',
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
