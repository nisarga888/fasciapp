/* Fascia Live sign-up -> Supabase webinar_signups + Zone backup endpoint (sends the Zoom confirmation). Either one succeeding counts. */
(function(){
var C=window.FASCIAPP_CONFIG||{},f=document.getElementById('live-form'),m=document.getElementById('live-msg');
var ERR='Sorry, we couldn\'t save your sign-up. Please try again in a minute, or write to hello@fasciapp.app and we\'ll send you the Zoom link.';
function post(url,headers,body){var c=new AbortController(),t=setTimeout(function(){c.abort()},15000);
 return fetch(url,{method:'POST',headers:headers,body:body,signal:c.signal}).then(function(r){clearTimeout(t);return r.ok||r.status===409;}).catch(function(){clearTimeout(t);return false;});}
f.addEventListener('submit',async function(e){e.preventDefault();
 if(f.hp_zx7&&f.hp_zx7.value){m.textContent='Hmm, your browser filled in a hidden field. Please reload the page and try again, or write to hello@fasciapp.app and we\'ll send you the Zoom link.';return;}
 var b=f.querySelector('button');b.disabled=true;m.textContent='Saving…';
 var row={name:f.name.value.trim(),email:f.email.value.trim().toLowerCase(),consent:f.consent.checked,event:'fascia-live-2026-11-25',source:(new URLSearchParams(location.search).get('utm_source')||document.referrer||'direct').slice(0,200)};
 var body=JSON.stringify(row),jobs=[post('https://www.bodyawareness.ee/webinar-signup.php',{'Content-Type':'application/json'},body)];
 if(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY)jobs.push(post(C.SUPABASE_URL+'/rest/v1/webinar_signups',{apikey:C.SUPABASE_ANON_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body));
 var res=await Promise.all(jobs),ok=res.some(Boolean);
 if(ok){m.textContent='You\'re in! Check your inbox for the Zoom link (and your spam folder, just in case).';f.reset();}
 else{m.textContent=ERR;}
 b.disabled=false;
});})();
