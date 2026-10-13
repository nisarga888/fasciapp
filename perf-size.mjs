import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { gzipSync } from 'zlib';
const ROOT='/workspace/ibi/mer-app/fasciapp-repo';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.jpg':'image/jpeg'};
const srv=createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=join(ROOT,u);if(!existsSync(f)){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream','Cache-Control':'no-store'});r.end(readFileSync(f))}).listen(8797);
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const runs=[];let local={};
for(let i=0;i<5;i++){const c=await b.newContext({serviceWorkers:'block'});const p=await c.newPage();local={};
 p.on('response',async r=>{const u=new URL(r.url());if(u.port==='8797'&&/\.(js|css|html)$|\/$/.test(u.pathname)){try{const buf=await r.body();local[u.pathname]=[buf.length,gzipSync(buf).length]}catch{}}});
 await p.goto('http://127.0.0.1:8797/app/',{waitUntil:'load'});
 const t=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,heap:performance.memory?performance.memory.usedJSHeapSize:0}});
 await p.waitForTimeout(300);runs.push(t);await c.close()}
const med=k=>runs.map(r=>r[k]).sort((a,b)=>a-b)[2];
const raw=Object.values(local).reduce((a,v)=>a+v[0],0),gz=Object.values(local).reduce((a,v)=>a+v[1],0);
console.log(JSON.stringify({files:local,rawBytes:raw,gzipBytes:gz,dclMs:Math.round(med('dcl')),loadMs:Math.round(med('load')),heapMB:+(med('heap')/1e6).toFixed(2)},null,1));
await b.close();srv.close();
