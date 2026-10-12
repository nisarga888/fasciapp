import {chromium,devices} from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const c=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(process.argv[2]);await p.click('#goLook');await p.waitForTimeout(2500);
await p.screenshot({path:'/workspace/ibi/mer-app/prototype/screens/v23_quote.png'});
await p.click('.quoteCard');await p.waitForTimeout(400);await p.screenshot({path:'/tmp/v23_quote_open.png'});
console.log(JSON.stringify({q:await p.textContent('.quoteCard small+p'),errs}));await b.close();
