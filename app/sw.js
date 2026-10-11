// FasciApp service worker: cache-first app shell. Bump VERSION on every release.
const VERSION="fasciapp-v0.9.1";
const SHELL=["./","index.html","styles.css","app.js","data.js","config.js","logo.svg","manifest.json","icon-192-v3.png","icon-512-v3.png","apple-touch-icon-v3.png",
 "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css","https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
 "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
 // never cache live data: Supabase, geocoding, map tiles
 if(/supabase\.co|nominatim|arcgisonline|tile\./.test(u.host))return;
 const shell=u.origin===location.origin||SHELL.includes(r.url);if(!shell)return;
 e.respondWith(caches.match(r,{ignoreSearch:u.origin===location.origin}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match("index.html"))))});
