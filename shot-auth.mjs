import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function serve(root, port) {
  const srv = createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
    if (u.endsWith('config.js')) {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      // empty = local mode for UI (resetPassword will show friendly error)
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
    executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await ctx.addInitScript(() => {
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));

  await page.goto(`http://127.0.0.1:${port}/app/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  // Seed multi-country practitioner + open map for count
  await page.evaluate(() => {
    people = [{
      id: 'n1', user_id: 'n1', name: 'Nisarga', practice_name: null, mods: ['MER', 'BBTRS'],
      country: 'Estonia', city: 'Tallinn', lat: 59.44, lng: 24.74, consent: true,
      locations: [
        { city: 'Tallinn', country: 'Estonia', lat: 59.44, lng: 24.74, label: 'Tallinn' },
        { city: 'Lesvos Island', country: 'Greece', lat: 39.18, lng: 26.0, label: 'Nisarga' },
      ],
    }, {
      id: 't1', user_id: 't1', name: 'Test', mods: ['MER'], country: 'Estonia', city: 'Tallinn',
      lat: 59.44, lng: 24.73, consent: true,
      locations: [{ city: 'Tallinn', country: 'Estonia', lat: 59.44, lng: 24.73 }],
    }];
    show('map');
    count();
  });
  await page.waitForTimeout(200);
  const countTxt = await page.evaluate(() => document.querySelector('#count')?.textContent);
  console.log('count', countTxt);
  if (!/2 countries/i.test(countTxt || '')) throw new Error('expected 2 countries, got: ' + countTxt);

  // Inbox visible while signed out
  const inbox = await page.evaluate(() => {
    hdr();
    return {
      hidden: document.getElementById('tabInbox').hidden,
      display: getComputedStyle(document.getElementById('tabInbox')).display,
    };
  });
  console.log('inbox tab', inbox);
  if (inbox.hidden) throw new Error('Inbox should be visible when signed out');
  await page.click('#tabInbox');
  await page.waitForTimeout(200);
  const inboxBody = await page.evaluate(() => document.querySelector('#convs')?.textContent);
  console.log('inbox body', inboxBody);
  if (!/Sign in to see messages/i.test(inboxBody || '')) throw new Error('missing sign-in prompt');

  // Forgot password UI
  await page.evaluate(() => show('auth'));
  await page.click('#tabIn');
  await page.waitForTimeout(100);
  const forgotVisible = await page.evaluate(() => !document.getElementById('forgotWrap').hidden);
  if (!forgotVisible) throw new Error('Forgot password link hidden on sign-in');
  await page.click('#forgotLink');
  await page.waitForTimeout(100);
  const forgotUI = await page.evaluate(() => ({
    title: document.getElementById('authTitle')?.textContent,
    form: !document.getElementById('forgotForm').hidden,
    authHidden: document.getElementById('authForm').hidden,
  }));
  console.log('forgot UI', forgotUI);
  if (!forgotUI.form) throw new Error('forgot form not shown');
  await page.fill('#forgotEmail', 'test@example.com');
  await page.click('#forgotForm button.gold');
  await page.waitForTimeout(200);
  const forgotMsg = await page.evaluate(() => document.getElementById('forgotMsg')?.textContent);
  console.log('forgot msg', forgotMsg);
  if (!forgotMsg || forgotMsg.length < 5) throw new Error('no forgot message');

  // Reset form UI (?reset=1 path)
  await page.evaluate(() => showResetForm());
  await page.waitForTimeout(100);
  const resetUI = await page.evaluate(() => ({
    title: document.getElementById('authTitle')?.textContent,
    form: !document.getElementById('resetForm').hidden,
    hasPw: !!document.getElementById('newPw'),
  }));
  console.log('reset UI', resetUI);
  if (!resetUI.form || resetUI.title !== 'Set new password') throw new Error('reset form missing');

  // Mock updatePassword success path
  await page.evaluate(() => {
    DB.updatePassword = async (pw) => ({ user_id: 'x', email: 'test@example.com' });
  });
  await page.fill('#newPw', 'secret12');
  await page.fill('#newPw2', 'secret12');
  await page.click('#resetForm button.gold');
  await page.waitForTimeout(300);
  const resetMsg = await page.evaluate(() => document.getElementById('resetMsg')?.textContent);
  console.log('reset msg', resetMsg);
  if (!/Password updated/i.test(resetMsg || '')) throw new Error('expected success message');

  // Live redirectTo string check (supabase path in data.js source)
  const redirect = readFileSync(join(ROOT, 'app/data.js'), 'utf8');
  if (!redirect.includes('/app/?reset=1')) throw new Error('redirectTo missing');

  console.log('OK');
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
