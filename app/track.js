// FasciApp anonymous analytics. No user id, email, IP or fingerprint. sid = random per-visit id held in memory only (not saved on the device), never linked to an account.
// Fire-and-forget into Supabase table app_events (insert-only).
// MAIN SWITCH for app + landing: set ON = true after running fasciapp-tracking.sql.
var FA_TRACK_DEFAULT = true;
(function(){
  var C=window.FASCIAPP_CONFIG||{},U=C.SUPABASE_URL||"https://smgccthvratixddwfhmu.supabase.co",K=C.SUPABASE_ANON_KEY||"sb_publishable_CEZeH1MF1tHwQynmF-jOUA_ta6i-OR8";
  // v0.23.117: forward every event to PostHog EU (Frankfurt) via its capture API. No posthog-js, no cookies/localStorage, no autocapture/pageview/recording, no person profiles, IP not stored.
  var PH_HOST="https://eu.i.posthog.com",PH_KEY="phc_trWEUz8z2gqsJJtZ3KmyDkXqxqNbLZmfp6cgt7ZRaotG";
  var on=FA_TRACK_DEFAULT;
  try{if(localStorage.getItem("fa_track_test"))on=true}catch(e){}
  // v0.23.116: memory-only visit id. Nothing is stored on the device; a new random id per page load / visit.
  try{localStorage.removeItem("fa_sid");sessionStorage.removeItem("fa_src")}catch(e){}
  var sid=Math.random().toString(36).slice(2,12)+Date.now().toString(36);
  var once={};
  // Traffic source: utm_* + external referrer domain of this page load, kept in memory only.
  var src={};try{var q=new URLSearchParams(location.search);["utm_source","utm_medium","utm_campaign","utm_content"].forEach(function(k){var v=(q.get(k)||"").toLowerCase().replace(/[^a-z0-9_.-]/g,"").slice(0,40);if(v)src[k.slice(4)]=v});
    var r="";try{r=document.referrer?new URL(document.referrer).hostname.replace(/^www\./,""):""}catch(e){}if(r&&!/(^|\.)fasciapp\.app$/.test(r))src.ref=r.slice(0,60);src.__new=1}catch(e){src={__new:1}}
  var srcProps=function(){var o={};["source","medium","campaign","content","ref"].forEach(function(k){if(src[k])o["src_"+k]=src[k]});return o};
  window.FA_src=srcProps;
  // PostHog forwarding: same events, plus clear aliases and visit-level traffic source on every event (memory only).
  var refHost="";try{refHost=document.referrer?new URL(document.referrer).hostname.replace(/^www\./,""):""}catch(e){}
  var chan=function(){var u=(src.source||"")+" "+(refHost||"");return /instagram|ig\b|^ig/.test(u)?"instagram":/facebook|fb\b|^fb|messenger/.test(u)?"facebook":/linktr\.?ee/.test(u)?"linktree":/google/.test(u)?"google":/whatsapp|wa\.me/.test(u)?"whatsapp":/brevo|flodesk|newsletter|email|mail/.test(u+" "+(src.medium||""))?"newsletter":/bodyawareness/.test(u)?"bai_website":/fasciapp\.app/.test(refHost)||(!src.source&&!refHost)?"direct":(src.source||refHost||"other")};
  var ua=navigator.userAgent||"",dev={device_type:/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?"tablet":/Mobi|iPhone|iPod|Android/i.test(ua)?"mobile":"desktop",
    os:/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?"iOS":/Android/.test(ua)?"Android":/Windows/.test(ua)?"Windows":/Mac OS X|Macintosh/.test(ua)?"macOS":/CrOS/.test(ua)?"ChromeOS":/Linux/.test(ua)?"Linux":"Other",
    browser:/Instagram/.test(ua)?"Instagram in-app":/FBAN|FBAV/.test(ua)?"Facebook in-app":/Edg\//.test(ua)?"Edge":/OPR\//.test(ua)?"Opera":/SamsungBrowser/.test(ua)?"Samsung Internet":/Firefox|FxiOS/.test(ua)?"Firefox":/Chrome|CriOS/.test(ua)?"Chrome":/Safari/.test(ua)?"Safari":"Other"};
  var phFirst=1;
  var phPost=function(name,pr,b){var pp={$process_person_profile:false,$ip:null,$lib:"fa-track",$current_url:location.origin+location.pathname,$pathname:location.pathname,$host:location.host,source:chan(),device_type:dev.device_type,os:dev.os,browser:dev.browser,app_area:/\/app\//.test(location.pathname)?"app":"landing"};
    if(src.source)pp.utm_source=src.source;if(src.medium)pp.utm_medium=src.medium;if(src.campaign)pp.utm_campaign=src.campaign;if(src.content)pp.utm_content=src.content;
    if(refHost){pp.$referring_domain=refHost;pp.$referrer=document.referrer.split("?")[0].slice(0,200)}else pp.$referring_domain="$direct";
    if(phFirst){pp.first_event_of_visit=true;phFirst=0}
    for(var k in pr)pp[k]=pr[k];if(b.source)pp.event_source=b.source;if(b.practitioner_id)pp.practitioner_id=b.practitioner_id;
    fetch(PH_HOST+"/i/v0/e/",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:PH_KEY,event:name,distinct_id:sid,properties:pp,timestamp:new Date().toISOString()})}).catch(function(){})};
  var ALIAS={screen:"screen_view",contact:"contact_tap",name_search:"search",place_filter:"search"};
  var phSend=function(ev,pr,b){var x={};for(var k in pr)x[k]=pr[k];
    if(ev==="name_search")x.search_type="name";if(ev==="place_filter")x.search_type=x.level||"place";
    phPost(ALIAS[ev]||ev,x,b);
    if(ev==="lab_open"&&x.kind==="course")phPost("course_open",{course:x.item},b);
    if(ev==="lab_open"&&/listen/i.test(x.section||""))phPost("listen_open",{item:x.item},b);
    if(ev==="join"&&x.step==="submitted")phPost("signup",{},b)};
  window.FA_ph=function(name,props){if(on)try{phPost(name,props||{},{})}catch(e){}};
  // PostHog-only click hooks: outbound course clicks, Lab tiles (Listen etc.)
  document.addEventListener("click",function(e){try{var t=e.target.closest&&e.target.closest("a,button");if(!t)return;
    var h=t.getAttribute("href")||"";
    if(t.classList.contains("lcGo")||/payhip\.com|myofascialtrainings\.com|breathe\.bodyawareness\.ee/.test(h)){var m=t.closest(".lcourse"),nm=m&&m.querySelector(".lcHead b")?m.querySelector(".lcHead b").textContent:(t.textContent||"").trim();var hh="";try{hh=new URL(h,location.href).hostname}catch(x){}window.FA_ph("course_click",{course:String(nm).slice(0,80),destination:hh,url:h.slice(0,200)});return}
    if(t.dataset&&t.dataset.lt){window.FA_ph("lab_section_open",{section:t.dataset.lt});if(t.dataset.lt==="listen")window.FA_ph("listen_open",{item:"section"});if(t.dataset.lt==="courses")window.FA_ph("courses_section_open",{})}
  }catch(x){}},true);
  window.FA_ev=function(event,o){if(!on)return;o=o||{};try{
    if(o.once){if(once[o.once])return;once[o.once]=1}
    var ev=String(event).toLowerCase().slice(0,40),pr=o.props||{};if(ev==="join"||ev==="visit"){var s=srcProps();for(var k in s)pr[k]=s[k]}
    var b={event:ev,sid:sid||null,props:pr};
    if(o.pid&&/^[0-9a-f-]{36}$/i.test(o.pid))b.practitioner_id=o.pid;if(o.source)b.source=String(o.source).slice(0,24);
    try{phSend(ev,pr,b)}catch(e){}
    fetch(U+"/rest/v1/app_events",{method:"POST",keepalive:true,headers:{apikey:K,Authorization:"Bearer "+K,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(b)}).catch(function(){});
  }catch(e){}};
  if(src.__new){delete src.__new;window.FA_ev("visit",{source:/\/app\//.test(location.pathname)?"app":"landing"})}
})();
