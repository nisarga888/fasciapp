// FasciApp "Quote of the week". One quote per ISO week (week number % list length), changes every Monday.
// Edit the list freely: { text, by }. Keep exact wording and real authors.
window.FASCIAPP_QUOTES = [
 { text: "Breath is the bridge which connects life to consciousness, which unites your body to your thoughts.", by: "Thich Nhat Hanh" },
 { text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.", by: "Thich Nhat Hanh" },
 { text: "Smile, breathe and go slowly.", by: "Thich Nhat Hanh" },
 { text: "Life is available only in the present moment.", by: "Thich Nhat Hanh" },
 { text: "The curious paradox is that when I accept myself just as I am, then I can change.", by: "Carl Rogers" },
 { text: "Trauma is not what happens to you, it's what happens inside you as a result of what happens to you.", by: "Gabor Maté" },
 { text: "Safety is not the absence of threat, it is the presence of connection.", by: "Gabor Maté" },
 { text: "The wound is the place where the Light enters you.", by: "Rumi" },
 { text: "The quieter you become, the more you can hear.", by: "Ram Dass" },
 { text: "Wherever you are, be all there.", by: "Jim Elliot" }
];
(function(){
 function isoWeek(d){d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const y=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil(((d-y)/864e5+1)/7)}
 function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
 function render(){const Q=window.FASCIAPP_QUOTES||[];if(!Q.length)return;const w=isoWeek(new Date()),i=w%Q.length,q=Q[i];
  const prev=[];for(let k=1;k<Q.length;k++){const p=Q[(i-k+Q.length*2)%Q.length];prev.push(`<li><p>“${esc(p.text)}”</p><span>${esc(p.by)}</span></li>`)}
  const map=document.getElementById("map");if(!map)return;let s=map.querySelector(".quoteSlot");
  if(!s){s=document.createElement("div");s.className="quoteSlot";const n=map.querySelector(".newsSlot");n?n.after(s):map.prepend(s)}
  s.innerHTML=`<button type="button" class="quoteCard" aria-expanded="false"><small>Quote of the week</small><p>“${esc(q.text)}”</p><span>${esc(q.by)}</span><em>Earlier quotes ▾</em></button><ul class="quotePrev" hidden>${prev.join("")}</ul>`;
  const b=s.querySelector(".quoteCard"),l=s.querySelector(".quotePrev");
  b.onclick=()=>{const o=l.hidden;l.hidden=!o;b.setAttribute("aria-expanded",o);b.querySelector("em").textContent=o?"Hide earlier quotes ▴":"Earlier quotes ▾"}}
 document.readyState==="loading"?document.addEventListener("DOMContentLoaded",render):render();
})();
