import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));
const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.ico':'image/x-icon'};
const srv = createServer((req,res)=>{
  let p = decodeURIComponent((req.url||'/').split('?')[0]);
  if(p==='/') p='/index.html';
  const fp = join(root, p.replace(/^\//,''));
  if(!fp.startsWith(root) || !existsSync(fp) || !statSync(fp).isFile()){ res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200,{'Content-Type': mime[extname(fp)]||'application/octet-stream'});
  res.end(readFileSync(fp));
});
const port = await new Promise((resolve,reject)=>{srv.listen(0,'127.0.0.1',()=>resolve(srv.address().port)); srv.on('error',reject)});
mkdirSync('/workspace/ibi/mer-app/prototype/screens', {recursive:true});
const browser = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox'] });
const page = await browser.newPage({ viewport:{width:820,height:1100}, deviceScaleFactor:2 });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForSelector('.seoFind #liveCount');
await page.waitForFunction(()=>document.getElementById('liveCount')?.textContent?.includes('countries') || document.getElementById('liveCount')?.textContent?.includes('worldwide'), {timeout:8000}).catch(()=>{});
await page.locator('#find').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const path = '/workspace/ibi/mer-app/prototype/screens/v18_worldwide.png';
// Capture heading + section as one element via a wrapper evaluate / locator
await page.evaluate(()=>{
  const wrap=document.createElement('div');
  wrap.id='shotWrap';
  wrap.style.cssText='background:var(--bg,#02191E);padding:20px 12px 28px;';
  const h=document.getElementById('find');
  const s=document.querySelector('.seoFind');
  h.parentNode.insertBefore(wrap,h);
  wrap.appendChild(h);
  wrap.appendChild(s);
});
await page.locator('#shotWrap').screenshot({ path });
console.log('saved', path, await page.locator('#liveCount').textContent());
await browser.close();
srv.close();
