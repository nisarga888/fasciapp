// FasciApp service worker. Bump VERSION on every release.
// App JS/CSS: network-first so Safari/PWA picks up updates. Other shell: cache-first.
const VERSION="fasciapp-v0.23.126";
const SHELL=["./","index.html","styles.css","app.js","data.js","config.js","track.js","learn.js","news.js","quotes.js","inbox.js","vendor/supabase-js-2.118.0.min.js","logo.svg","manifest.json","icon-192-v4.png","icon-512-v4.png","apple-touch-icon-v4.png","favicon-32-v4.png","favicon-16-v4.png","icon-512-maskable-v4.png",
 "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css","https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
const LAZY=["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
 if(/supabase\.co|nominatim|arcgisonline|tile\./.test(u.host))return;
 const same=u.origin===location.origin;
 if(same&&/\/lab\/.*\.pdf$/i.test(u.pathname))return; // big PDFs: straight from network, never cached
 const shell=same||SHELL.includes(r.url)||LAZY.includes(r.url);if(!shell)return;
 const live=same&&/\.(js|css)$/i.test(u.pathname);
 if(live||r.mode==="navigate"){
  // network-first (3 s timeout) so a new release reaches everyone on the next open; cache only when offline/slow
  e.respondWith(caches.open(VERSION).then(c=>{const net=fetch(r).then(res=>{if(res&&res.ok)c.put(r,res.clone());return res});
   const slow=new Promise(ok=>setTimeout(ok,3000)).then(()=>c.match(r,{ignoreSearch:!u.search}));
   return Promise.race([net.catch(()=>c.match(r,{ignoreSearch:!u.search})),slow.then(h=>h||net)]).then(x=>x||net).catch(()=>c.match("index.html"))}));
  return}
 e.respondWith(caches.match(r,{ignoreSearch:same}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match("index.html"))))});
