// FasciApp anonymous analytics. No user id, email, IP or fingerprint. sid = random per-device id (localStorage), never linked to an account.
// Fire-and-forget into Supabase table app_events (insert-only).
// MAIN SWITCH for app + landing: set ON = true after running fasciapp-tracking.sql.
var FA_TRACK_DEFAULT = true;
(function(){
  var C=window.FASCIAPP_CONFIG||{},U=C.SUPABASE_URL||"https://smgccthvratixddwfhmu.supabase.co",K=C.SUPABASE_ANON_KEY||"sb_publishable_CEZeH1MF1tHwQynmF-jOUA_ta6i-OR8";
  var on=FA_TRACK_DEFAULT;
  try{if(localStorage.getItem("fa_track_test"))on=true}catch(e){}
  var sid="";try{sid=localStorage.getItem("fa_sid")||"";if(!/^[a-z0-9]{8,32}$/.test(sid)){sid=Math.random().toString(36).slice(2,12)+Date.now().toString(36);localStorage.setItem("fa_sid",sid)}}catch(e){}
  var once={};
  window.FA_ev=function(event,o){if(!on)return;o=o||{};try{
    if(o.once){if(once[o.once])return;once[o.once]=1}
    var b={event:String(event).toLowerCase().slice(0,40),sid:sid||null,props:o.props||{}};
    if(o.pid&&/^[0-9a-f-]{36}$/i.test(o.pid))b.practitioner_id=o.pid;if(o.source)b.source=String(o.source).slice(0,24);
    fetch(U+"/rest/v1/app_events",{method:"POST",keepalive:true,headers:{apikey:K,Authorization:"Bearer "+K,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(b)}).catch(function(){});
  }catch(e){}};
})();
