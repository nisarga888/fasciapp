/* Practitioner intake link, list, and the private read view. */
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let _sb=null;
async function sb(){const c=window.FASCIAPP_CONFIG||{};if(!_sb){_sb=window.scanSb||window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:window.localStorage,storageKey:"fasciapp-auth"}})}
 const {data}=await _sb.auth.getSession();if(!data.session){try{const s=JSON.parse(localStorage.getItem("fasciapp-auth")||"null");if(s&&s.access_token&&s.refresh_token)await _sb.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token})}catch(e){}}return _sb}
function me(){try{return window.faMe}catch(e){return null}}
let credits=null, slug="", list=[];
function allowed(d){return !!(d&&(d.admin||d.active||d.trial_remaining>0))}
function creditLabel(d){
  if(!d)return "";
  if(d.admin||(d.active&&d.plan!=="single"))return "Unlimited";
  const n=d.trial_remaining||0;
  return n+" credit"+(n===1?"":"s")+" left";
}
async function loadCredits(){try{const {data}=await (await sb()).rpc("fa_scan_status");credits=data||null}catch(e){credits=null}return credits}
function screen(){let s=$("#intake");if(s)return s;s=document.createElement("section");s.id="intake";s.className="screen";document.querySelector("main").appendChild(s);return s}
function dateOf(iso){try{return new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}catch(e){return ""}}
function initials(n){return String(n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase()}
async function unread(){const {count}=await (await sb()).from("intake_forms").select("id",{count:"exact",head:true}).is("read_at",null);return count||0}
function paintDot(n){const b=document.querySelector('#tabs [data-t="profile"]');if(!b)return;let d=b.querySelector(".inDot");if(!d){d=document.createElement("i");d.className="badge inDot";b.appendChild(d)}d.hidden=!n;d.textContent=n>9?"9+":String(n||"")}
async function refreshDot(){if(!me()){paintDot(0);return}try{paintDot(await unread())}catch(e){}}
function cardHtml(p){
  const s=p&&p.slug;if(!s)return "";
  slug=s;
  const on=allowed(credits);
  const left=creditLabel(credits);
  const share=on?`<div class="inLink"><span>fasciapp.app/intake/${esc(s)}</span><button type="button" class="gold sm" data-incopy>Copy</button></div>
    <div class="inShare"><a class="inWa" data-inwa href="https://wa.me/?text=${encodeURIComponent("Please fill in your intake form before our session: https://fasciapp.app/intake/"+s)}">WhatsApp</a>
    <a class="inSms" data-insms href="sms:?&body=${encodeURIComponent("Please fill in your intake form before our session: https://fasciapp.app/intake/"+s)}">SMS</a></div>
    <p class="inLeft">${esc(left)}</p>`
    :`<p class="inZero"><b>${esc(left||"0 credits left")}</b></p><p class="inBuyLine">Intake forms use your Body Scan form credits. Buy credits to share your link.</p><button type="button" class="gold" data-inbuy>Buy forms</button>`;
  return `<div class="inCard"><b>Your client intake link</b><p>Share this link with a client. They fill it in on their phone — no sign-in needed.</p>${share}</div>
    <button type="button" class="inRow" data-inlist><span><b>Intake forms</b><small>Forms clients send you appear here</small></span><em>›</em></button>`;
}
async function mount(){
  const v=$("#profView");if(!v||v.hidden||!me())return;
  const head=v.querySelector(".bHead");if(!head)return;
  await loadCredits();
  let p=null;try{p=await DB.mine()}catch(e){}
  let box=$("#inCard");
  if(!box){box=document.createElement("div");box.id="inCard";const panels=$("#faPanels");if(panels)panels.before(box);else head.after(box)}
  box.innerHTML=cardHtml(p);
  refreshDot();
}
function copyLink(){const url="https://fasciapp.app/intake/"+slug;const done=()=>{try{showToast("Link copied")}catch(e){}};if(navigator.clipboard)navigator.clipboard.writeText(url).then(done).catch(done);else done()}
async function openList(){
  if(!me()){show("auth");return}
  const s=screen();s.innerHTML='<button type="button" class="back mapBack" data-inback>‹ My profile</button><p class="inKicker">INTAKE FORMS</p><div id="inBody"><p class="muted">Loading…</p></div>';
  show("intake");
  const r=await (await sb()).from("intake_forms").select("id,client_name,created_at,read_at,matched_key").order("created_at",{ascending:false}).limit(100);
  list=r.data||[];
  const n=list.filter(x=>!x.read_at).length;
  paintDot(n);
  const newest=list.find(x=>!x.read_at);
  const banner=newest?`<div class="inNew"><b>New intake form</b><small>${esc(newest.client_name)} sent a form · ${esc(dateOf(newest.created_at))}</small></div>`:"";
  const rows=list.map(x=>`<button type="button" class="inIt" data-inid="${esc(x.id)}"><span class="inAv">${esc(initials(x.client_name))}</span><span><b>${esc(x.client_name)}</b><small>${esc(dateOf(x.created_at))}${x.matched_key?" · linked to a client":""}</small></span>${x.read_at?'<em>›</em>':'<i class="inBadge">New</i>'}</button>`).join("");
  $("#inBody").innerHTML=banner+(rows||'<p class="muted">No forms yet. Share your intake link with a client.</p>');
}
async function openOne(id){
  const r=await (await sb()).from("intake_forms").select("id,client_name,contact,dob,concern,conditions,injuries,pregnant,hope,created_at,read_at,matched_key").eq("id",id).maybeSingle();
  const f=r.data;if(!f){openList();return}
  if(!f.read_at){await (await sb()).from("intake_forms").update({read_at:new Date().toISOString()}).eq("id",id);refreshDot()}
  const line=(t,v)=>`<p class="inLab">${t}</p><p>${esc(v||"—")}</p>`;
  screen().innerHTML=`<button type="button" class="back mapBack" data-inbacklist>‹ Intake forms</button>
    <h2>${esc(f.client_name)}</h2><p class="muted">${esc(dateOf(f.created_at))}${f.matched_key?" · linked to a client":""}</p>
    ${line("Email or phone",f.contact)}${line("Date of birth",f.dob)}${line("Main concern / area of pain",f.concern)}
    ${line("Health conditions & medications",f.conditions)}${line("Injuries / surgeries",f.injuries)}${line("Pregnancy",f.pregnant?"Yes":"No")}
    ${line("What you hope for from the session",f.hope)}
    <button type="button" class="gold" data-inpdf>Download PDF</button>
    <button type="button" class="ghost" data-indel>Delete form</button>`;
  screen().dataset.id=id;
}
async function pdf(id){
  const full=await (await sb()).from("intake_forms").select("client_name,contact,dob,concern,conditions,injuries,pregnant,hope,created_at").eq("id",id).maybeSingle();
  const row=full.data;if(!row)return;
  await new Promise((ok,no)=>{if(window.jspdf)return ok();const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"});
  const lines=[row.client_name,"",dateOf(row.created_at),"","Email or phone: "+(row.contact||""),"Date of birth: "+(row.dob||""),"","Main concern",row.concern||"—","","Health conditions & medications",row.conditions||"—","","Injuries / surgeries",row.injuries||"—","","Pregnancy: "+(row.pregnant?"Yes":"No"),"","What you hope for",row.hope||"—"];
  doc.setFontSize(16);doc.text("FasciApp intake form",14,18);doc.setFontSize(11);
  const body=doc.splitTextToSize(lines.join("\n"),180);
  doc.text(body,14,30);
  doc.save((row.client_name||"intake").replace(/[^\w]+/g,"-").slice(0,40)+".pdf");
}
async function del(id){if(!confirm("Delete this intake form? This cannot be undone."))return;await (await sb()).from("intake_forms").delete().eq("id",id);openList()}
window.faOpenIntake=openList;
window.faIntakeClient=async function(name,key){const box=$("#inCl");if(!box||!key)return;const r=await (await sb()).from("intake_forms").select("id,created_at").eq("matched_key",key).order("created_at",{ascending:false}).limit(5);
  const rows=r.data||[];if(!rows.length){box.innerHTML="";return}
  box.innerHTML='<div class="card inCl"><b>Intake form</b>'+rows.map(x=>'<button type="button" data-inid="'+esc(x.id)+'">'+esc(dateOf(x.created_at))+' ›</button>').join("")+"</div>"};
document.addEventListener("click",e=>{
  const t=e.target;
  if(t.closest("[data-incopy]")){copyLink();return}
  if(t.closest("[data-inbuy]")){if(window.faOpenScanPlans)faOpenScanPlans();else show("scan");return}
  if(t.closest("[data-inlist]")){openList();return}
  if(t.closest("[data-inback]")){show("profile");return}
  if(t.closest("[data-inbacklist]")){openList();return}
  if(t.closest("[data-inpdf]")){pdf(screen().dataset.id);return}
  if(t.closest("[data-indel]")){del(screen().dataset.id);return}
  const row=t.closest("[data-inid]");if(row)openOne(row.dataset.inid);
});
const prev=window.faProfShown;window.faProfShown=function(){if(prev)prev();setTimeout(mount,450)};
document.addEventListener("DOMContentLoaded",()=>{try{const q=new URLSearchParams(location.search);if(q.get("forms")==="1")setTimeout(()=>window.faOpenIntake&&faOpenIntake(),800)}catch(e){}});
})();
