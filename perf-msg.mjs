// Usage: node perf-msg.mjs <url>  — logs in as the test account, measures inbox open + self-message send (simulated iPhone, 4G)
import {chromium,devices} from 'playwright-core';import fs from 'fs';
const kv=Object.fromEntries(fs.readFileSync('../test_account.txt','utf8').trim().split('\n').map(l=>l.split('=')));
const url=process.argv[2];const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const c=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const p=await c.newPage();
const cdp=await c.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8*4,uploadThroughput:750e3/8*4});
let bytes={};cdp.on('Network.loadingFinished',e=>{bytes[e.requestId]=e.encodedDataLength});
// Never send a real message: fake the insert with a realistic 4G round-trip (600 ms).
await p.route(/\/rest\/v1\/messages/,async r=>{if(r.request().method()!=='POST')return r.continue();const b=r.request().postDataJSON();await new Promise(x=>setTimeout(x,600));
 r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'00000000-0000-4000-8000-'+String(Date.now()).slice(-12),...b,created_at:new Date().toISOString(),read_at:null})})});
const t0=Date.now();await p.goto(url,{waitUntil:'load'});const load=Date.now()-t0;
await p.waitForFunction(()=>document.querySelectorAll('.leaflet-marker-icon,.item').length>0||true);await p.waitForTimeout(2500);
const kB=Math.round(Object.values(bytes).reduce((a,b)=>a+b,0)/1024);
await p.click('#goPract');await p.fill('#email',kv.email);await p.fill('#pw',kv.password);await p.press('#pw','Enter');
await p.waitForFunction(()=>document.body.classList.contains('in')&&!document.getElementById('auth').classList.contains('active'),null,{timeout:20000});await p.waitForTimeout(3000);
let s=Date.now();await p.click('nav#tabs button[data-t=inbox]');await p.waitForFunction(()=>document.querySelector('#convs').children.length>0);const inbox=Date.now()-s;
const me=await p.evaluate(()=>me.user_id);
await p.evaluate(id=>openChat(id),me);await p.waitForTimeout(800);
const before=await p.evaluate(()=>document.querySelectorAll('#chatLog .bub').length);
const txt='perf test '+Date.now();await p.fill('#chatTxt',txt);
const getDone=p.waitForResponse(r=>/rest\/v1\/messages/.test(r.url())&&r.request().method()==='GET',{timeout:20000}).catch(()=>null);
s=Date.now();await p.click('#chatForm button');
// new app: bubble appears; old app: shows it only after insert + full refetch of messages
await Promise.race([p.waitForFunction(t=>document.getElementById('chatLog').textContent.includes(t),txt,{timeout:20000}),getDone.then(r=>r&&r.finished())]);const send=Date.now()-s;
s=Date.now();await p.click('#chatX');await p.click('nav#tabs button[data-t=map]');await p.waitForFunction(()=>document.getElementById('map').classList.contains('active'));const tab=Date.now()-s;
console.log(JSON.stringify({load_ms:load,first_load_kB:kB,inbox_open_ms:inbox,send_visible_ms:send,tab_switch_ms:tab}));await b.close();
