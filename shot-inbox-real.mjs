import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
const ROOT='/workspace/ibi/mer-app/fasciapp-repo',OUT='/workspace/fasciapp-insta/inbox/real';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.jpg':'image/jpeg'};
const srv=createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=join(ROOT,u);if(!existsSync(f)){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream'});r.end(readFileSync(f))}).listen(8798);
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--font-render-hinting=none']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort());
const p=await ctx.newPage();const reqs=[];p.on('request',r=>reqs.push(r.url()));p.on('pageerror',e=>console.log('pageerror',e.message));
await p.goto('http://127.0.0.1:8798/app/',{waitUntil:'load'});await p.waitForTimeout(800);
const before=reqs.filter(u=>u.includes('inbox.js')).length;
await p.evaluate(()=>{const U='me-1',now=Date.now(),t=m=>new Date(now-m*60000).toISOString();
 me={user_id:U,email:'demo@example.com'};
 const M=[{id:'a',sender:'p1',recipient:U,body:'Hi! Yes, I have MER slots in Tallinn next Tuesday and Thursday.',created_at:t(50),read_at:null},
 {id:'b',sender:U,recipient:'p1',body:'Hello, do you have a MER session in Tallinn next week?',created_at:t(60),read_at:t(55)},
 {id:'c',sender:'p2',recipient:U,body:'Thank you for joining the BBTRS intro 🙏',created_at:t(300),read_at:null},
 {id:'d',sender:U,recipient:'p3',body:'Thanks, see you on Friday.',created_at:t(2000),read_at:null}];
 const names={p1:'Marta K.',p2:'Jonas T.',p3:'Sofia L.'};
 Object.assign(DB,{msgs:async()=>M.slice().sort((a,b)=>a.created_at.localeCompare(b.created_at)),sendMsg:async(to,body)=>({id:'n'+Date.now(),sender:U,recipient:to,body,created_at:new Date().toISOString(),read_at:null}),markRead:async()=>{},onMsg:()=>()=>{},unreadCount:async()=>2,session:async()=>me,
  sessions:async()=>Array.from({length:23},(_,i)=>({id:'s'+i,initials:'AK',date:'2026-10-0'+(1+i%9),duration:60,format:'In person',session_type:i%3?'MER':'BBTRS',comment:''})),
  getProfile:async()=>({name:'Demo Practitioner',user_id:U})});
 const o=window.all;window.nameOfMock=names;
 MSG_OK=true;hdr();setBadge(2)});
const shot=async n=>{await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/${n}.png`});console.log(n)};
await p.evaluate(()=>show('list'));await shot('menu');
await p.evaluate(()=>show('inbox'));await p.waitForTimeout(600);
const after=reqs.filter(u=>u.includes('inbox.js')).length;console.log('inbox.js requests before tab:',before,'after:',after);
await shot('inbox');
await p.evaluate(()=>openChat('p1'));await p.waitForTimeout(400);await shot('thread');
await p.evaluate(()=>closeChat());
await p.evaluate(()=>show('profile'));await p.waitForTimeout(800);await shot('profile-log');
await p.evaluate(()=>show('log'));await p.waitForTimeout(800);await shot('log-screen');
await b.close();srv.close();
