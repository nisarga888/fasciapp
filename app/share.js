/* Profile slugs, share links, and session-review display helpers.
   The database stores the slug. These functions mirror that algorithm
   for local demo mode and for tests. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_SHARE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const RESERVED = ["app","scan","live","assets","nl","sig","privacy","terms","index","robots","sitemap","favicon","manifest","cname","about","admin","api","static","public","vendor","ph","lab","news","assessment","trainees","join","search","map","profile","auth","scripts","tools","supabase","readme","www","mail","share","reviews","review","login","signup","account","404","sw","css","js","html","intake"];
const RESERVED_SET = new Set(RESERVED);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

function cityKey(name){
  return slugify(name);
}
function slugify(src){
  let s = String(src||"").trim().toLowerCase();
  if(!s) return "";
  s = s.replace(/æ/g,"ae").replace(/œ/g,"oe").replace(/ß/g,"ss").replace(/þ/g,"th").replace(/ð/g,"d");
  try{ s = s.normalize("NFD").replace(/\p{M}/gu,""); }catch(e){}
  s = s.replace(/ł/g,"l").replace(/ø/g,"o").replace(/đ/g,"d").replace(/ı/g,"i");
  s = s.replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  if(s.length>60){
    const cut = s.slice(0,60);
    const hy = cut.lastIndexOf("-");
    s = (hy>20?cut.slice(0,hy):cut).replace(/-+$/g,"");
  }
  return s;
}

function allocSlug(name, city, taken){
  const base = slugify(name) || "practitioner";
  const citySlug = slugify(city||"");
  const stem = citySlug ? base+"-"+citySlug : base;
  const has = s => RESERVED_SET.has(s) || !!(taken && taken.has && taken.has(s));
  let cand = base;
  if(has(cand)) cand = stem;
  let n = 2;
  while(has(cand)){
    cand = stem+"-"+n;
    n += 1;
    if(n>500){ cand = (stem+"-id").slice(0,80); break; }
  }
  return cand.slice(0,80);
}

function isProfileSlug(path){
  let s = String(path||"").trim().replace(/\/index\.html$/i,"").replace(/^\/+|\/+$/g,"").toLowerCase();
  if(!s || s.length>80 || s.indexOf("/")>=0 || s.indexOf(".")>=0) return false;
  if(UUID_RE.test(s) || RESERVED_SET.has(s) || !SLUG_RE.test(s)) return false;
  return true;
}

const LOC_REGIONS = [
  ["Europe","europe"],
  ["Americas","americas"],
  ["Asia & Pacific","asia-pacific"],
  ["Africa & Middle East","africa-middle-east"],
  ["Online & other","online-other"]
];

function regionSlug(name){
  const row = LOC_REGIONS.find(r=>r[0]===name);
  return row ? row[1] : slugify(name);
}
function regionBySlug(slug){
  const s = String(slug||"").trim().toLowerCase();
  const row = LOC_REGIONS.find(r=>r[1]===s);
  return row ? {name:row[0], slug:row[1]} : null;
}
function pathParts(pathname){
  const path = String(pathname||"").replace(/\/index\.html$/i,"").replace(/^\/+|\/+$/g,"").toLowerCase();
  return path ? path.split("/") : [];
}
function slugPart(s){
  return !!s && s.length<=80 && s.indexOf(".")<0 && !UUID_RE.test(s) && !RESERVED_SET.has(s) && SLUG_RE.test(s);
}
const LAB_SECTIONS = { books: 1, courses: 1, breathing: 1, listen: 1, watch: 1, live: 1 };
function redirectTarget(pathname){
  const parts = pathParts(pathname);
  if(parts[0]==="lab"){
    if(parts.length===1) return "/app/?tab=lab";
    if(parts.length===2 && LAB_SECTIONS[parts[1]]) return "/app/?lab="+parts[1];
    if(parts.length===3 && LAB_SECTIONS[parts[1]] && slugPart(parts[2])) return "/app/?lab="+parts[1]+"&item="+parts[2];
    return null;
  }
  if(parts.length===2 && parts[0]==="intake" && slugPart(parts[1])) return "/intake.html?s="+parts[1];
  if(parts.length===2 && slugPart(parts[0]) && slugPart(parts[1])) return "/app/?loc="+parts[0]+"&city="+parts[1];
  if(parts.length!==1 || !isProfileSlug(parts[0])) return null;
  return "/app/?p="+parts[0];
}
function locationUrl(path){ return "https://fasciapp.app/"+String(path||"").replace(/^\/+/,""); }
function locationLabel(path){ return "fasciapp.app/"+String(path||"").replace(/^\/+/,""); }

function profileUrl(slug){ return "https://fasciapp.app/"+slug; }
function profileLabel(slug){ return "fasciapp.app/"+slug; }

function shareTargets(url, title){
  const text = String(title||"Practitioner")+" on FasciApp";
  const q = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    whatsapp: "https://wa.me/?text="+encodeURIComponent(text+" "+url),
    facebook: "https://www.facebook.com/sharer/sharer.php?u="+q,
    telegram: "https://t.me/share/url?url="+q+"&text="+t,
    email: "mailto:?subject="+encodeURIComponent(String(title||"Practitioner")+" on FasciApp")+"&body="+encodeURIComponent(text+"\n"+url),
    instagram: "https://www.instagram.com/"
  };
}

function capWord(w){
  const s = String(w||"").replace(/[^\p{L}\p{M}'-]/gu,"");
  if(!s) return "";
  return s.charAt(0).toLocaleUpperCase("en")+s.slice(1).toLocaleLowerCase("en");
}

function publicName(full){
  let raw = String(full||"").trim().replace(/\s+/g," ");
  if(!raw) return "Member";
  if(raw.indexOf("@")>0) raw = raw.split("@")[0];
  const parts = raw.split(/[\s._-]+/).map(capWord).filter(Boolean);
  if(!parts.length) return "Member";
  if(parts.length===1) return parts[0].slice(0,40);
  return (parts[0]+" "+parts[parts.length-1].charAt(0).toUpperCase()+".").slice(0,40);
}

function relativeDate(iso, now){
  const t = new Date(iso).getTime();
  const n = now instanceof Date ? now.getTime() : (typeof now==="number"?now:Date.now());
  if(!t || !n) return "";
  let s = Math.round((n-t)/1000);
  if(s<0) s = 0;
  if(s<45) return "just now";
  if(s<3600){ const m=Math.max(1,Math.round(s/60)); return m+" min ago"; }
  if(s<86400){ const h=Math.max(1,Math.round(s/3600)); return h+" hour"+(h===1?"":"s")+" ago"; }
  const d = Math.round(s/86400);
  if(d<30) return d+" day"+(d===1?"":"s")+" ago";
  const mo = Math.round(d/30);
  if(mo<12) return mo+" month"+(mo===1?"":"s")+" ago";
  const y = Math.max(1,Math.round(d/365));
  return y+" year"+(y===1?"":"s")+" ago";
}

function formatAvg(n){
  const x = Number(n);
  if(!isFinite(x)) return "";
  const r = Math.round(x*10)/10;
  return Math.round(r)===r ? String(Math.round(r)) : r.toFixed(1);
}

function starRow(n){
  let k = Math.round(Number(n)||0);
  if(k<0) k=0;
  if(k>5) k=5;
  return '<span class="ptStar" aria-hidden="true">'+"★".repeat(k)+'<i>'+"★".repeat(5-k)+"</i></span>";
}

const SHARE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/></svg>';

function shareIconHtml(){
  return '<button type="button" class="ptShare" data-share aria-label="Share profile">'+SHARE_SVG+"</button>";
}
function locShareButton(label, attrs){
  return '<button type="button" class="brShare" data-locshare '+(attrs||"")+' aria-label="'+esc(label)+'">'+SHARE_SVG+"</button>";
}
function shareButtonHtml(){
  return '<button type="button" class="ptShareBtn" data-share>'+SHARE_SVG+" Share profile</button>";
}
const HEART_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/></svg>';
function heartButtonHtml(on){
  return '<button type="button" class="ptHeart'+(on?" on":"")+'" data-fav aria-pressed="'+(on?"true":"false")+'" aria-label="'+(on?"Saved to Favourites":"Save to Favourites")+'">'+HEART_SVG+"</button>";
}
function starChipHtml(avg, count){
  const n = Number(count)||0;
  if(!n) return "";
  const top = n>=3 && Number(avg)>=4.5 ? '<em class="faTop">Top rated</em>' : "";
  return '<span class="faStarChip">★ '+esc(formatAvg(avg))+" ("+n+")</span>"+top;
}

function ratingRowHtml(o){
  o = o||{};
  const n = Number(o.count)||0;
  const avg = o.avg==null||o.avg==="" ? null : Number(o.avg);
  const stars = avg==null || !n ? "" : starRow(avg);
  const label = n ? formatAvg(avg)+" · "+n+" review"+(n===1?"":"s") : "No session reviews yet";
  const btn = o.own ? "" : '<button type="button" class="gold ptRateBtn" data-rate>'+(o.mine?"Edit your review":"Rate your session")+"</button>";
  return '<div class="ptRating"><span class="ptAvgs">'+stars+"<b>"+esc(label)+"</b></span>"+btn+"</div>";
}

function reviewCard(r, o){
  const hidden = !!r.hidden;
  const actions = [];
  if(o.admin){
    actions.push(hidden
      ? '<button type="button" class="ptRep" data-restore="'+esc(r.id)+'">Restore</button>'
      : '<button type="button" class="ptRep" data-hide="'+esc(r.id)+'">Hide</button>');
  }
  if(!r.mine) actions.push('<button type="button" class="ptRep" data-report="'+esc(r.id)+'">Report</button>');
  const tag = hidden ? '<em class="ptHid">Hidden</em>' : "";
  const body = String(r.body||"").trim();
  return '<article class="ptRev'+(hidden?" isHid":"")+'"><header><b>'+esc(r.name||"Member")+"</b>"+starRow(r.stars)+'<time>'+esc(relativeDate(r.created_at, o.now))+"</time>"+tag+'</header>'+(body?'<p>'+esc(body)+"</p>":"")+'<div class="ptRevAct">'+actions.join("")+"</div></article>";
}

function reviewsSectionHtml(bundle, o){
  o = o||{};
  const rows = Array.isArray(bundle&&bundle.reviews) ? bundle.reviews : [];
  let note = o.signedIn ? "One review per person. You can edit it later." : "One review per phone, per practitioner. No sign-in needed.";
  if(bundle && bundle.mine && bundle.mine.hidden) note = "Your review is hidden after a report until an admin restores it.";
  const cards = rows.length ? rows.map(r=>reviewCard(r,o)).join("") : '<p class="ptRevEmpty">No session reviews yet.</p>';
  return '<section class="ptRevs" aria-label="Session reviews"><h4>Session reviews</h4><p class="ptRevNote">'+esc(note)+"</p>"+cards+"</section>";
}

const CHAN = {
  copy: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3zm5 12.2c-.2.6-1.2 1.1-1.7 1.1-.4.1-.9.2-3-.8-2.5-1.2-4.1-3.6-4.2-3.8-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.2 0 .3-.2.5l-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.2.1.4.1.5-.1l.5-.6c.2-.2.3-.2.5-.1.2.1 1.4.7 1.6.8.2.1.4.2.4.3.1.2 0 .8-.2 1.4z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20.5 4.5 3.8 10.9c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.1c.2.6.1.8.7.8.4 0 .6-.2.8-.4l2.4-2.3 4.4 3.3c.8.4 1.4.2 1.6-.8l2.8-13.2c.3-1.2-.4-1.7-1.8-1.3zM8.8 13.6l9.3-5.8c.4-.3.8-.1.5.2l-7.7 7-.3 3.2-1.8-4.6z"/></svg>',
  email: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>'
};

function shareSheetHtml(o){
  o = o||{};
  const native = o.native ? '<button type="button" class="gold ptNative" data-native>Share on this phone</button>' : "";
  const btn = (k, cls, label) => '<button type="button" data-chan="'+k+'"><i class="'+cls+'">'+CHAN[k]+"</i>"+label+"</button>";
  const sub = o.sub!=null ? o.sub : "Anyone with the link can open it directly.";
  return '<div class="ptPopTop"><b>'+esc(o.title||"Share this profile")+'</b><button type="button" class="ptPopX" data-popx aria-label="Close">✕</button></div>'
    +'<p class="ptPopSub">'+esc(sub)+"</p>"
    +'<div class="ptLink"><b>'+esc(o.label||"")+'</b><button type="button" data-copy>Copy</button></div>'
    +native
    +'<div class="ptShareGrid">'
    +btn("copy","cp","Copy link")
    +btn("whatsapp","wa","WhatsApp")
    +btn("instagram","ig","Instagram")
    +btn("facebook","fb","Facebook")
    +btn("telegram","tg","Telegram")
    +btn("email","em","Email")
    +'</div><button type="button" class="gold ptPopDone" data-popx>Done</button>';
}

function rateSheetHtml(o){
  o = o||{};
  const stars = Number(o.stars)||0;
  const body = String(o.body||"").slice(0,200);
  let btns = "";
  for(let i=1;i<=5;i++) btns += '<button type="button" data-star="'+i+'" class="'+(i<=stars?"on":"")+'" aria-label="'+i+' star'+(i===1?"":"s")+'" aria-pressed="'+(i<=stars?"true":"false")+'">★</button>';
  const word = stars ? stars+" out of 5" : "Tap a star";
  const guest = !!o.guest;
  const help = o.signedIn
    ? "One review per person. You can edit it later. It shows right away."
    : "One review per phone, per practitioner. No sign-in needed.";
  const first = guest ? '<label class="ptNoteLbl">First name<input data-first maxlength="40" autocomplete="given-name" placeholder="First name"></label>' : "";
  const check = guest ? '<div id="tsRate" class="tsBox" aria-label="Security check"></div>' : "";
  const label = guest ? "Submit" : (o.editing?"Update review":"Post review");
  return '<div class="ptPopTop"><b>Rate your session</b><button type="button" class="ptPopX" data-popx aria-label="Close">✕</button></div>'
    +'<p class="ptPopWith">with '+esc(o.name||"this practitioner")+"</p>"
    +'<div class="ptBigStars" role="group" aria-label="Star rating">'+btns+"</div>"
    +'<p class="ptOutOf" data-outof>'+esc(word)+"</p>"
    +first
    +'<label class="ptNoteLbl">Short feedback about your session'
    +'<textarea maxlength="200" rows="4" data-note placeholder="Short feedback about your session">'+esc(body)+"</textarea></label>"
    +'<p class="ptCount" data-count>'+body.length+"/200</p>"
    +check
    +'<p class="ptPopHelp">'+esc(help)+"</p>"
    +'<p class="ptPopErr" data-err></p>'
    +'<button type="button" class="gold ptPost" data-post>'+label+"</button>";
}

function reviewError(err){
  const m = String((err&&err.message)||err||"");
  if(/own profile/i.test(m)) return "You can't rate your own profile.";
  if(/not public|isn't available|is not available/i.test(m)) return "This profile isn't available.";
  if(/wait a little/i.test(m)) return m;
  if(/200 characters/i.test(m)) return "Please keep the note to 200 characters.";
  if(/star rating/i.test(m)) return "Choose a star rating from 1 to 5.";
  if(/duplicate key|unique constraint|already reviewed/i.test(m)) return "You already reviewed this practitioner. You can edit it.";
  if(/report your own/i.test(m)) return "You can't report your own review.";
  if(/sign in/i.test(m)) return "Sign in to rate.";
  return "That didn't work. Please try again.";
}

return {
  RESERVED, slugify, cityKey, allocSlug, isProfileSlug, redirectTarget, profileUrl, profileLabel,
  regionSlug, regionBySlug, locationUrl, locationLabel, locShareButton,
  shareTargets, publicName, relativeDate, formatAvg, starRow, shareIconHtml, shareButtonHtml,
  heartButtonHtml, starChipHtml,
  ratingRowHtml, reviewsSectionHtml, shareSheetHtml, rateSheetHtml, reviewError, esc
};
});
