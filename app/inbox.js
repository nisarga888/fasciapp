// FasciApp Inbox — lazy-loaded by app.js only when Inbox/Message is opened.
// Uses app.js globals (me, msgs, chatWith, unsub, DB, $, $$, esc, av, all, show).
(function(){
const nameOf=id=>{const p=all().find(x=>x.user_id===id);return p?p.name:"FasciApp member"};
const MKEY=()=>"fa_msgs_"+(me&&me.user_id);
function saveMsgs(){try{localStorage.setItem(MKEY(),JSON.stringify(msgs.filter(m=>!m.pending).slice(-300)))}catch(e){}}
function paintMsgs(){if(!me)return;const un=msgs.filter(m=>m.recipient===me.user_id&&!m.read_at).length;const b=$("#unread");b.textContent=un;b.hidden=!un;
 if(chatWith)renderChat();if($("#inbox").classList.contains("active"))renderInbox()}
function mergeMsg(m){if(!m||!m.id)return;const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],...m};
 else{const t=msgs.findIndex(x=>x.pending&&x.sender===m.sender&&x.recipient===m.recipient&&x.body===m.body);if(t>=0)msgs[t]=m;else msgs.push(m)}
 msgs.sort((a,b)=>a.created_at.localeCompare(b.created_at))}
async function start(){if(!me)return;if(msgUid!==me.user_id){try{msgs=JSON.parse(localStorage.getItem(MKEY())||"[]")}catch(e){msgs=[]}msgUid=me.user_id}
 if(msgs.length)paintMsgs();await pullMsgs()}
async function pullMsgs(){if(!MSG_OK||!me)return;lastPull=Date.now();let got;try{got=await DB.msgs()}catch(e){return}
 const pend=msgs.filter(m=>m.pending);msgs=got;pend.forEach(p=>{if(!msgs.some(m=>m.sender===p.sender&&m.recipient===p.recipient&&m.body===p.body))msgs.push(p)});
 saveMsgs();paintMsgs()}
function convs(){const c={};msgs.forEach(m=>{const o=m.sender===me.user_id?m.recipient:m.sender;(c[o]=c[o]||[]).push(m)});
 return Object.entries(c).map(([o,l])=>({o,last:l[l.length-1],un:l.filter(m=>m.recipient===me.user_id&&!m.read_at).length})).sort((a,b)=>b.last.created_at.localeCompare(a.last.created_at))}
function renderInbox(){const box=$("#convs");
 if(!me){box.innerHTML=`<div class="card center"><p>Sign in to see messages and chat with practitioners.</p><button type="button" class="gold big1" data-go="auth">Sign in</button></div>`;
  box.querySelector("[data-go]")&&(box.querySelector("[data-go]").onclick=()=>show("auth"));return}
 if(!MSG_OK){box.innerHTML="<p class=muted>Messaging is not available right now. Try again later.</p>";return}
 const cs=convs();box.innerHTML=cs.map(c=>{const p=all().find(x=>x.user_id===c.o)||{name:nameOf(c.o)};return `<div class="item conv" data-c="${esc(c.o)}"><div class="row">${av(p)}<div><b>${esc(p.name)}</b>${c.un?` <span class="badge">${c.un}</span>`:""}<br><small class=muted>${esc(c.last.body.slice(0,80))}</small></div></div></div>`}).join("")||"<p class=muted>No messages yet. Open a practitioner on the map and tap Message.</p>";
 $$("#convs .conv").forEach(d=>d.onclick=()=>openChat(d.dataset.c))}
function openChat(id){pendingChat=null;chatWith=id;$("#chatName").textContent=nameOf(id);$("#chat").hidden=false;renderChat();$("#chatTxt").focus();
 // realtime only while this thread is open
 if(unsub)unsub();unsub=DB.onMsg?DB.onMsg(ev=>{const m=ev&&ev.new;if(m&&m.id){mergeMsg(m);saveMsgs();paintMsgs()}else pullMsgs()},me.user_id):null;start()}
function closeChat(){chatWith=null;$("#chat").hidden=true;if(unsub){unsub();unsub=null}}
function renderChat(){if(!me||!chatWith)return;const all=msgs.filter(m=>(m.sender===chatWith&&m.recipient===me.user_id)||(m.recipient===chatWith&&m.sender===me.user_id));const l=all.slice(-30);
 const b=$("#chatLog");b.innerHTML=l.map(m=>`<div class="bub ${m.sender===me.user_id?"me":"them"}${m.pending?" pend":""}${m.failed?" fail":""}">${esc(m.body)}<small>${m.failed?"Not sent · tap to retry":m.pending?"Sending…":new Date(m.created_at).toLocaleString([], {dateStyle:"short",timeStyle:"short"})}</small></div>`).join("")||"<p class='muted center'>Say hello 👋</p>";b.scrollTop=b.scrollHeight;
 $$("#chatLog .bub.fail").forEach((d,i)=>d.onclick=()=>{const f=l.filter(m=>m.failed)[i];if(f){f.failed=false;sendNow(f);renderChat()}});
 const unread=l.filter(m=>m.sender===chatWith&&!m.read_at);if(unread.length){const now=new Date().toISOString();unread.forEach(m=>m.read_at=now);saveMsgs();
  const u=msgs.filter(m=>m.recipient===me.user_id&&!m.read_at).length,bd=$("#unread");bd.textContent=u;bd.hidden=!u;DB.markRead(chatWith).catch(()=>{})}}
function sendNow(tmp){tmp.pending=true;DB.sendMsg(tmp.recipient,tmp.body).then(row=>{const i=msgs.indexOf(tmp);if(i>=0)msgs.splice(i,1);mergeMsg(row);saveMsgs();paintMsgs()})
 .catch(err=>{tmp.pending=false;tmp.failed=true;$("#chatErr").textContent="Could not send: "+err.message;paintMsgs()})}
$("#chatX").onclick=closeChat;
$("#chatForm").onsubmit=e=>{e.preventDefault();const t=$("#chatTxt"),v=t.value.trim().slice(0,1000);if(!v||!chatWith)return;$("#chatErr").textContent="";
 const tmp={id:"tmp-"+Date.now()+Math.random(),sender:me.user_id,recipient:chatWith,body:v,created_at:new Date().toISOString(),read_at:null,pending:true};
 msgs.push(tmp);t.value="";renderChat();sendNow(tmp)};
// open thread without realtime: light 15 s poll; nothing runs when no thread is open
setInterval(()=>{if(chatWith&&!document.hidden&&!window.RT_OK)pullMsgs()},15000);
window.FA_INBOX={openChat,closeChat,renderInbox:()=>{renderInbox();start()},start};
})();
