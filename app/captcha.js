// FasciApp: Cloudflare Turnstile ("secure sign-up") for sign-up, sign-in and password reset.
// Tokens go to Supabase Auth as options.captchaToken; Supabase verifies them server-side
// (Auth > Attack Protection > CAPTCHA, provider Turnstile). Tokens are single-use, so each
// token() call hands out the current token and resets the widget for the next attempt.
(function(){
 const SITEKEY="0x4AAAAAAFvW3PHVqRby8-Fk";
 const W={};let loading=null;
 function load(){if(window.turnstile)return Promise.resolve();if(loading)return loading;
  loading=new Promise((ok,no)=>{window.faTsLoaded=()=>ok();const s=document.createElement("script");
   s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=faTsLoaded";s.async=true;s.defer=true;
   s.onerror=()=>{loading=null;no(new Error("turnstile load failed"))};document.head.appendChild(s)});return loading}
 function mount(key){const el=document.getElementById(key==="forgot"?"tsForgot":"tsAuth");if(!el)return;
  if(W[key]&&W[key].id!=null&&el.querySelector("iframe"))return;
  load().then(()=>{if(W[key]&&W[key].id!=null)return;const w=W[key]={id:null,tok:null,wait:[]};
   w.id=turnstile.render(el,{sitekey:SITEKEY,action:key==="forgot"?"reset":"auth",theme:"dark",size:"flexible",appearance:"always",
    "refresh-expired":"auto",
    callback:t=>{w.tok=t;const q=w.wait;w.wait=[];q.forEach(f=>f(t))},
    "expired-callback":()=>{w.tok=null},"error-callback":()=>{w.tok=null}})}).catch(()=>{})}
 // Returns a fresh token (waits up to 20 s for the check to finish). Undefined if Turnstile can't load,
 // so the request still goes out and the server gives a clear answer.
 async function token(key){mount(key);try{await load()}catch(e){return undefined}
  const t0=Date.now();while(!W[key]||W[key].id==null){if(Date.now()-t0>5000)return undefined;await new Promise(r=>setTimeout(r,100))}
  const w=W[key];let t=w.tok||turnstile.getResponse(w.id)||null;
  if(!t){const el=document.getElementById(key==="forgot"?"tsForgot":"tsAuth"),m=el&&el.closest("form")&&el.closest("form").querySelector(".msg");
   if(m)m.textContent="Please complete the security check above the button…";
   t=await new Promise(ok=>{w.wait.push(ok);setTimeout(()=>ok(null),45000)});if(m&&t)m.textContent="…"}
  w.tok=null;setTimeout(()=>{try{turnstile.reset(w.id)}catch(e){}},0);return t||undefined}
 window.FaCaptcha={mount,token,sitekey:SITEKEY};
})();
