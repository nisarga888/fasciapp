/* Fascia Live sign-up -> Supabase webinar_signups (insert-only). Flodesk bridge to be added once form ID exists. */
(function(){
var C=window.FASCIAPP_CONFIG||{},f=document.getElementById('live-form'),m=document.getElementById('live-msg');
f.addEventListener('submit',async function(e){e.preventDefault();
 if(f.hp_zx7&&f.hp_zx7.value)return; // honeypot (hidden with display:none so autofill can't fill it)
 var b=f.querySelector('button');b.disabled=true;m.textContent='Saving…';
 var row={name:f.name.value.trim(),email:f.email.value.trim().toLowerCase(),consent:f.consent.checked,event:'fascia-live-2026-11-25',source:(new URLSearchParams(location.search).get('utm_source')||document.referrer||'direct').slice(0,200)};
 var ok=false;
 try{var r=await fetch(C.SUPABASE_URL+'/rest/v1/webinar_signups',{method:'POST',headers:{apikey:C.SUPABASE_ANON_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row)});ok=r.ok||r.status===409;}catch(x){}
 {try{var r2=await fetch('https://www.bodyawareness.ee/webinar-signup.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row)});ok=r2.ok||ok;}catch(x){}}
 if(ok){m.textContent='You\'re in! We\'ll email you the Zoom link before the event.';f.reset();}
 else{m.textContent='Something went wrong – please try again or write to hello@fasciapp.app.';}
 b.disabled=false;
});})();
