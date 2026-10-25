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
  var src={};try{var q=new URLSearchParams(location.search);["utm_source","utm_medium","utm_campaign"].forEach(function(k){var v=(q.get(k)||"").toLowerCase().replace(/[^a-z0-9_.-]/g,"").slice(0,40);if(v)src[k.slice(4)]=v});
    var r="";try{r=document.referrer?new URL(document.referrer).hostname.replace(/^www\./,""):""}catch(e){}if(r&&!/(^|\.)fasciapp\.app$/.test(r))src.ref=r.slice(0,60);src.__new=1}catch(e){src={__new:1}}
  var srcProps=function(){var o={};["source","medium","campaign","ref"].forEach(function(k){if(src[k])o["src_"+k]=src[k]});return o};
  window.FA_src=srcProps;
  window.FA_ev=function(event,o){if(!on)return;o=o||{};try{
    if(o.once){if(once[o.once])return;once[o.once]=1}
    var ev=String(event).toLowerCase().slice(0,40),pr=o.props||{};if(ev==="join"||ev==="visit"){var s=srcProps();for(var k in s)pr[k]=s[k]}
    var b={event:ev,sid:sid||null,props:pr};
    if(o.pid&&/^[0-9a-f-]{36}$/i.test(o.pid))b.practitioner_id=o.pid;if(o.source)b.source=String(o.source).slice(0,24);
    try{var pp={$process_person_profile:false,$ip:null,$lib:"fa-track",$current_url:location.origin+location.pathname,$pathname:location.pathname};for(var k2 in pr)pp[k2]=pr[k2];if(b.source)pp.source=b.source;if(b.practitioner_id)pp.practitioner_id=b.practitioner_id;
      fetch(PH_HOST+"/i/v0/e/",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:PH_KEY,event:ev,distinct_id:sid,properties:pp,timestamp:new Date().toISOString()})}).catch(function(){})}catch(e){}
    fetch(U+"/rest/v1/app_events",{method:"POST",keepalive:true,headers:{apikey:K,Authorization:"Bearer "+K,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(b)}).catch(function(){});
  }catch(e){}};
  if(src.__new){delete src.__new;window.FA_ev("visit",{source:/\/app\//.test(location.pathname)?"app":"landing"})}
})();
