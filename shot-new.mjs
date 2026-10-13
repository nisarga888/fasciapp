import {chromium,devices} from 'playwright-core';
const v=process.argv[2];const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const c=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const p=await c.newPage();
await p.goto('https://fasciapp.app/app/?tab=lab&x='+Date.now());await p.waitForTimeout(3500);
const go=async(sel,name)=>{await p.evaluate(s=>{const e=document.querySelector(s);let m=e.parentElement;while(m&&m.scrollHeight<=m.clientHeight+5)m=m.parentElement;if(m)m.scrollTop+=e.getBoundingClientRect().top-90;},sel);await p.waitForTimeout(800);await p.screenshot({path:`/workspace/fasciapp-insta/lab-final/${name}-v${v}.png`});};
console.log(await p.evaluate(()=>[document.querySelector('script[src*="news.js"]').src,document.querySelectorAll('.ltag.new').length]));
await go('.breathCaroCard','new-coherent');await go('h3.lsec[data-sec="Listen"]','new-listen');await b.close();
