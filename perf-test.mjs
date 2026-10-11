import {chromium,devices} from 'playwright-core';
const url=process.argv[2];const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const c=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const p=await c.newPage();
const cdp=await c.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8*4,uploadThroughput:750e3/8*4});
let bytes={};cdp.on('Network.loadingFinished',e=>{bytes[e.requestId]=e.encodedDataLength});
const t0=Date.now();await p.goto(url,{waitUntil:'load'});const tl=Date.now()-t0;
await p.waitForTimeout(1500);const total=Object.values(bytes).reduce((a,b)=>a+b,0);
await p.click('#goLook');await p.waitForTimeout(500);
const r=[];for(const t of ['list','map','learn','profile','map','list']){const s=Date.now();await p.click(`nav#tabs button[data-t=${t}]`,{timeout:3000});await p.waitForFunction(t=>document.getElementById(t).classList.contains('active'),t);r.push(t+':'+(Date.now()-s)+'ms')}
const s2=Date.now();await p.click('#logoHome');await p.waitForFunction(()=>document.getElementById('splash').classList.contains('active'));r.push('logo:'+(Date.now()-s2)+'ms');
console.log(JSON.stringify({load_ms:tl,transfer_kB:Math.round(total/1024),requests:Object.keys(bytes).length,taps:r}));await b.close();
