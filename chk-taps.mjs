import {chromium,devices} from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const c=await b.newContext(devices['iPhone 13']);const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(process.argv[2]);await p.click('#goLook');await p.waitForTimeout(1500);
const hit=await p.evaluate(()=>{const o={};for(const b of document.querySelectorAll('nav#tabs button')){const r=b.getBoundingClientRect();const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);o[b.dataset.t]=b.contains(el)}const l=document.getElementById('logoHome').getBoundingClientRect();o.logo=document.getElementById('logoHome').contains(document.elementFromPoint(l.x+l.width/2,l.y+l.height/2));return o});
const pdf=await p.evaluate(async()=>{await loadPdfLib();return !!(window.jspdf&&window.jspdf.jsPDF.API.autoTable)});
console.log(JSON.stringify({hit,pdf,errs}));await b.close();
