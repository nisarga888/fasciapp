// Small data layer: Supabase when configured, otherwise localStorage (demo mode).
(function(){
const cfg=window.FASCIAPP_CONFIG||{};
const LS={get:(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const FIELDS=["name","practice_name","mods","address","city","country","lat","lng","phone","email","website","bio","photo","consent","whatsapp","news_optin","news_optin_at"];
const SF=["initials","client_name","date","duration","format","session_type","comment"];const pickS=x=>Object.fromEntries(SF.map(k=>[k,x[k]===""?null:(x[k]??null)]));
const META_RE=/^⟦([^⟧]*)⟧\s*/;
function unpackSession(row){if(!row)return row;let format=row.format,session_type=row.session_type,comment=row.comment||"";
 if(!format||!session_type){const m=META_RE.exec(comment);if(m){const parts=String(m[1]||"").split("|");
  if(!format)format=(parts[0]||"").trim()||"In person";if(!session_type)session_type=(parts[1]||"").trim()||"MER";comment=comment.slice(m[0].length)}}
 if(!format)format="In person";if(!session_type)session_type="MER";
 return{...row,format,session_type,comment}}
function packMeta(format,session_type,comment){const c=String(comment||"").replace(META_RE,"");return "⟦"+(format||"In person")+"|"+(session_type||"MER")+"⟧ "+c}
const cmp=(a,b)=>(a.date+a.created_at).localeCompare(b.date+b.created_at);
const pick=p=>Object.fromEntries(FIELDS.map(k=>[k,p[k]??null]));
// Multi-location: up to 3 {label,address,city,country,lat,lng}. Stored in `locations` jsonb when the column exists,
// otherwise packed as JSON into the `address` text column (graceful fallback). Old single-location rows are migrated on read.
// practice_name: preferred as its own column; if missing, embedded on locations[0].practice_name (jsonb fallback).
// website2: stored on locations[0].website2 (jsonb) so no DDL is needed; a website2 column is read too if it ever exists.
function newsMeta(p){const m={};if(p.news_optin){m.news_optin=true;m.news_optin_at=p.news_optin_at||new Date().toISOString()}else if(p.news_optout_at){m.news_optin=false;m.news_optout_at=p.news_optout_at}return m}
function stripLocMeta(L){return (L||[]).map(({practice_name:_,website2:__,instagram:___,news_optin:_n1,news_optin_at:_n2,news_optout_at:_n3,...rest})=>rest)}
function embedW2(L,w2,ig,nx){const m={...(nx||{})};w2=(w2||"").trim();ig=(ig||"").trim();if(w2)m.website2=w2;if(ig)m.instagram=ig;if(!Object.keys(m).length)return L;
 if(!L.length)return [{label:"",address:"",city:"",country:"",lat:null,lng:null,...m}];return [{...L[0],...m},...L.slice(1)]}
function embedPractice(L,practice_name){
 L=stripLocMeta(L);const pn=(practice_name||"").trim()||null;
 if(!pn)return L;if(!L.length)return [{label:"",address:"",city:"",country:"",lat:null,lng:null,practice_name:pn}];
 return [{...L[0],practice_name:pn},...L.slice(1)]}
// Canonical country names: local-language names, aliases and ISO codes -> one English name.
const CANON=(()=>{const g={Austria:"at|österreich|osterreich",Belgium:"be|belgië|belgie|belgique|belgien",Bulgaria:"bg|българия",Croatia:"hr|hrvatska",Cyprus:"cy|κύπρος",Czechia:"cz|czech republic|česko|cesko|česká republika",Denmark:"dk|danmark",Estonia:"ee|eesti|estland",Finland:"fi|suomi",France:"fr",Germany:"de|deutschland|niemcy",Greece:"gr|ελλάδα|ελλάς|hellas",Hungary:"hu|magyarország|magyarorszag",Iceland:"is|ísland",Ireland:"ie|éire|eire",Italy:"it|italia",Latvia:"lv|latvija",Lithuania:"lt|lietuva",Luxembourg:"lu|lëtzebuerg",Malta:"mt",Netherlands:"nl|nederland|holland|the netherlands",Norway:"no|norge|noreg",Poland:"pl|polska",Portugal:"pt",Romania:"ro|românia",Serbia:"rs|srbija|србија",Slovakia:"sk|slovensko",Slovenia:"si|slovenija",Spain:"es|españa|espana",Sweden:"se|sverige",Switzerland:"ch|schweiz|suisse|svizzera",Ukraine:"ua|україна",
"United Kingdom":"gb|uk|great britain|england|scotland|wales|britain",Argentina:"ar",Australia:"au",Brazil:"br|brasil",Canada:"ca",Chile:"cl",China:"cn|中国",Colombia:"co",Egypt:"eg",India:"in|bharat|भारत",Indonesia:"id",Israel:"il",Japan:"jp|日本",Mexico:"mx|méxico",Morocco:"ma",
"New Zealand":"nz",Philippines:"ph",Singapore:"sg","South Africa":"za","South Korea":"kr|korea|대한민국",Thailand:"th",Turkey:"tr|türkiye|turkiye",
"United Arab Emirates":"ae|uae","United States":"us|usa|u.s.|u.s.a.|united states of america|america",Vietnam:"vn|viet nam|việt nam"};
 const m={};for(const[k,v]of Object.entries(g)){m[k.toLowerCase()]=k;v.split("|").forEach(a=>m[a]=k)}return m})();
// Full ISO 3166-1 list (code -> canonical English name); names/codes added to CANON as aliases.
const FA_CC={"AD":"Andorra","AE":"United Arab Emirates","AF":"Afghanistan","AG":"Antigua and Barbuda","AI":"Anguilla","AL":"Albania","AM":"Armenia","AO":"Angola","AQ":"Antarctica","AR":"Argentina","AS":"American Samoa","AT":"Austria","AU":"Australia","AW":"Aruba","AX":"Åland Islands","AZ":"Azerbaijan","BA":"Bosnia and Herzegovina","BB":"Barbados","BD":"Bangladesh","BE":"Belgium","BF":"Burkina Faso","BG":"Bulgaria","BH":"Bahrain","BI":"Burundi","BJ":"Benin","BL":"St. Barthélemy","BM":"Bermuda","BN":"Brunei","BO":"Bolivia","BQ":"Caribbean Netherlands","BR":"Brazil","BS":"Bahamas","BT":"Bhutan","BV":"Bouvet Island","BW":"Botswana","BY":"Belarus","BZ":"Belize","CA":"Canada","CC":"Cocos (Keeling) Islands","CD":"DR Congo","CF":"Central African Republic","CG":"Congo","CH":"Switzerland","CI":"Côte d’Ivoire","CK":"Cook Islands","CL":"Chile","CM":"Cameroon","CN":"China","CO":"Colombia","CR":"Costa Rica","CU":"Cuba","CV":"Cape Verde","CW":"Curaçao","CX":"Christmas Island","CY":"Cyprus","CZ":"Czechia","DE":"Germany","DJ":"Djibouti","DK":"Denmark","DM":"Dominica","DO":"Dominican Republic","DZ":"Algeria","EC":"Ecuador","EE":"Estonia","EG":"Egypt","EH":"Western Sahara","ER":"Eritrea","ES":"Spain","ET":"Ethiopia","FI":"Finland","FJ":"Fiji","FK":"Falkland Islands","FM":"Micronesia","FO":"Faroe Islands","FR":"France","GA":"Gabon","GB":"United Kingdom","GD":"Grenada","GE":"Georgia","GF":"French Guiana","GG":"Guernsey","GH":"Ghana","GI":"Gibraltar","GL":"Greenland","GM":"Gambia","GN":"Guinea","GP":"Guadeloupe","GQ":"Equatorial Guinea","GR":"Greece","GS":"South Georgia and South Sandwich Islands","GT":"Guatemala","GU":"Guam","GW":"Guinea-Bissau","GY":"Guyana","HK":"Hong Kong","HM":"Heard and McDonald Islands","HN":"Honduras","HR":"Croatia","HT":"Haiti","HU":"Hungary","ID":"Indonesia","IE":"Ireland","IL":"Israel","IM":"Isle of Man","IN":"India","IO":"British Indian Ocean Territory","IQ":"Iraq","IR":"Iran","IS":"Iceland","IT":"Italy","JE":"Jersey","JM":"Jamaica","JO":"Jordan","JP":"Japan","KE":"Kenya","KG":"Kyrgyzstan","KH":"Cambodia","KI":"Kiribati","KM":"Comoros","KN":"Saint Kitts and Nevis","KP":"North Korea","KR":"South Korea","KW":"Kuwait","KY":"Cayman Islands","KZ":"Kazakhstan","LA":"Laos","LB":"Lebanon","LC":"St. Lucia","LI":"Liechtenstein","LK":"Sri Lanka","LR":"Liberia","LS":"Lesotho","LT":"Lithuania","LU":"Luxembourg","LV":"Latvia","LY":"Libya","MA":"Morocco","MC":"Monaco","MD":"Moldova","ME":"Montenegro","MF":"St. Martin","MG":"Madagascar","MH":"Marshall Islands","MK":"North Macedonia","ML":"Mali","MM":"Myanmar","MN":"Mongolia","MO":"Macao","MP":"Northern Mariana Islands","MQ":"Martinique","MR":"Mauritania","MS":"Montserrat","MT":"Malta","MU":"Mauritius","MV":"Maldives","MW":"Malawi","MX":"Mexico","MY":"Malaysia","MZ":"Mozambique","NA":"Namibia","NC":"New Caledonia","NE":"Niger","NF":"Norfolk Island","NG":"Nigeria","NI":"Nicaragua","NL":"Netherlands","NO":"Norway","NP":"Nepal","NR":"Nauru","NU":"Niue","NZ":"New Zealand","OM":"Oman","PA":"Panama","PE":"Peru","PF":"French Polynesia","PG":"Papua New Guinea","PH":"Philippines","PK":"Pakistan","PL":"Poland","PM":"Saint Pierre and Miquelon","PN":"Pitcairn Islands","PR":"Puerto Rico","PS":"Palestine","PT":"Portugal","PW":"Palau","PY":"Paraguay","QA":"Qatar","RE":"Réunion","RO":"Romania","RS":"Serbia","RU":"Russia","RW":"Rwanda","SA":"Saudi Arabia","SB":"Solomon Islands","SC":"Seychelles","SD":"Sudan","SE":"Sweden","SG":"Singapore","SH":"St. Helena","SI":"Slovenia","SJ":"Svalbard and Jan Mayen","SK":"Slovakia","SL":"Sierra Leone","SM":"San Marino","SN":"Senegal","SO":"Somalia","SR":"Suriname","SS":"South Sudan","ST":"Sao Tome and Principe","SV":"El Salvador","SX":"Sint Maarten","SY":"Syria","SZ":"Eswatini","TC":"Turks and Caicos Islands","TD":"Chad","TF":"French Southern Territories","TG":"Togo","TH":"Thailand","TJ":"Tajikistan","TK":"Tokelau","TL":"Timor-Leste","TM":"Turkmenistan","TN":"Tunisia","TO":"Tonga","TR":"Turkey","TT":"Trinidad and Tobago","TV":"Tuvalu","TW":"Taiwan","TZ":"Tanzania","UA":"Ukraine","UG":"Uganda","UM":"U.S. Outlying Islands","US":"United States","UY":"Uruguay","UZ":"Uzbekistan","VA":"Vatican City","VC":"Saint Vincent and the Grenadines","VE":"Venezuela","VG":"British Virgin Islands","VI":"U.S. Virgin Islands","VN":"Vietnam","VU":"Vanuatu","WF":"Wallis and Futuna","WS":"Samoa","XK":"Kosovo","YE":"Yemen","YT":"Mayotte","ZA":"South Africa","ZM":"Zambia","ZW":"Zimbabwe"};
for(const[c,n]of Object.entries(FA_CC)){const a=n.toLowerCase(),b=c.toLowerCase();if(!CANON[a])CANON[a]=n;if(!CANON[b])CANON[b]=n}
window.FA_CC=FA_CC;
function canonCountry(c){const s=String(c||"").trim();if(!s)return"";return CANON[s.toLowerCase()]||s}
function canonP(p){if(!p)return p;const o={...p};if(o.country!=null)o.country=canonCountry(o.country);if(Array.isArray(o.locations))o.locations=o.locations.map(l=>l&&l.country!=null?{...l,country:canonCountry(l.country)}:l);return o}
window.canonCountry=canonCountry;window.FA_CANON=CANON;
function norm(p){if(!p)return p;p=canonP(p);let L=Array.isArray(p.locations)?p.locations:null,addr=p.address;
 if(!L&&typeof addr==="string"&&addr.startsWith("[{")){try{L=JSON.parse(addr)}catch(e){}}
 if(L&&L.length){addr=L[0].address||""}else L=(p.city||p.lat!=null)?[{label:"",address:addr||"",city:p.city||"",country:p.country||"",lat:p.lat,lng:p.lng}]:[];
 const fromLoc=(L[0]&&L[0].practice_name)||"";const website2=String(p.website2||(L[0]&&L[0].website2)||"").trim()||null;const instagram=String(p.instagram||(L[0]&&L[0].instagram)||"").trim()||null;const l0=L[0]||{};const news_optin=!!(p.news_optin??l0.news_optin),news_optin_at=p.news_optin_at||l0.news_optin_at||null,news_optout_at=p.news_optout_at||l0.news_optout_at||null;
 const practice_name=String(p.practice_name||fromLoc||"").trim()||null;
 L=stripLocMeta(L).slice(0,3).map(l=>l&&l.country!=null?{...l,country:canonCountry(l.country)}:l);
 return {...p,practice_name,website2,instagram,news_optin,news_optin_at,news_optout_at,address:addr,locations:L}}
window.normLocs=norm;

const local={mode:"local",
 async session(){return LS.get("fyp_session",null)},
 async signUp(email,pw){const u=LS.get("fyp_users",{});if(u[email])throw new Error("An account with this email already exists. Please sign in.");
  u[email]={pw,id:"local-"+Date.now()};LS.set("fyp_users",u);const s={user_id:u[email].id,email};LS.set("fyp_session",s);return s},
 async signIn(email,pw){const u=LS.get("fyp_users",{})[email];if(!u||u.pw!==pw)throw new Error("Wrong email or password.");const s={user_id:u.id,email};LS.set("fyp_session",s);return s},
 async signOut(){localStorage.removeItem("fyp_session")},
 async list(){const s=await this.session();return Object.values(LS.get("fyp_profiles2",{})).filter(p=>p.consent||(s&&p.user_id===s.user_id)).map(norm)},
 async mine(){const s=await this.session();return s?norm(LS.get("fyp_profiles2",{})[s.user_id]||null):null},
 async save(p){p=canonP(p);const s=await this.session();const all=LS.get("fyp_profiles2",{});const row={...pick(p),news_optin:!!p.news_optin,news_optin_at:p.news_optin?(p.news_optin_at||new Date().toISOString()):null,news_optout_at:p.news_optout_at||null,locations:p.locations||null,id:all[s.user_id]?.id||crypto.randomUUID(),user_id:s.user_id,created_at:all[s.user_id]?.created_at||new Date().toISOString()};
  all[s.user_id]=row;LS.set("fyp_profiles2",all);return norm(row)},
 async sessions(){const s=await this.session();if(!s)return[];return (LS.get("fyp_sessions",{})[s.user_id]||[]).map(unpackSession).slice().sort(cmp)},
 async saveSession(x){const s=await this.session();const all=LS.get("fyp_sessions",{}),l=all[s.user_id]||[];const i=l.findIndex(r=>r.id===x.id);
  const base=pickS(x);if(!base.format)base.format="In person";if(!base.session_type)base.session_type="MER";const row={...base,id:x.id||crypto.randomUUID(),user_id:s.user_id,created_at:i>=0?l[i].created_at:new Date().toISOString()};if(i>=0)l[i]=row;else l.push(row);all[s.user_id]=l;LS.set("fyp_sessions",all);return unpackSession(row)},
 async deleteSession(id){const s=await this.session();const all=LS.get("fyp_sessions",{});all[s.user_id]=(all[s.user_id]||[]).filter(r=>r.id!==id);LS.set("fyp_sessions",all)},
 async msgOk(){return false},
 async unreadCount(){return 0},
 async setNews(on){},
 async resetPassword(email){throw new Error("Password reset needs the live FasciApp server. Open the app at fasciapp.app and try again.")},
 async updatePassword(){throw new Error("Password reset needs the live FasciApp server.")},
 onAuth(){return ()=>{}}};



let noLocCol=false,noPracticeCol=false,noNewsCol=false,noFormatCol=false,noSessionTypeCol=false;
function supa(){const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:"fasciapp-auth"}
 });
 const sess=async()=>{const {data}=await sb.auth.getSession();const u=data.session?.user;return u?{user_id:u.id,email:u.email,news_optin:!!(u.user_metadata&&u.user_metadata.news_optin)}:null};
 const chk=({data,error})=>{if(error)throw new Error(error.message);return data};
 // Probe once whether practice_name column exists (anon can SELECT).
 (async()=>{try{const r=await sb.from("practitioners").select("practice_name").limit(1);if(r.error&&/practice_name/.test(r.error.message||"")){noPracticeCol=true;console.warn("FasciApp: run `alter table public.practitioners add column if not exists practice_name text;` — storing practice_name inside locations jsonb for now")}}catch(e){}
  try{const r=await sb.from("practitioners").select("news_optin").limit(1);if(r.error&&/news_optin/.test(r.error.message||"")){noNewsCol=true;console.warn("FasciApp: run news_optin columns SQL — storing news opt-in inside locations jsonb for now")}}catch(e){}
  try{const r=await sb.from("sessions").select("format").limit(1);if(r.error&&/format/i.test(r.error.message||"")){noFormatCol=true;console.warn("FasciApp: run `alter table public.sessions add column if not exists format text;` — packing format into comment for now")}}catch(e){}
  try{const r=await sb.from("sessions").select("session_type").limit(1);if(r.error&&/session_type/i.test(r.error.message||"")){noSessionTypeCol=true;console.warn("FasciApp: run `alter table public.sessions add column if not exists session_type text;` — packing session_type into comment for now")}}catch(e){}})();
 return {mode:"supabase",
  session:sess,
  async signUp(email,pw,opt){const n=!!(opt&&opt.news_optin);const su=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+"/app/",data:{news_optin:n,news_optin_at:n?new Date().toISOString():null,signup_source:"fasciapp"}}});if(su.error&&/rate limit|too many|after \d+ seconds|security purposes|already registered|already exists/i.test(su.error.message||"")){const r=await sb.auth.signInWithPassword({email,password:pw});if(!r.error&&r.data&&r.data.session)return sess();if(r.error&&/not confirmed/i.test(r.error.message||""))throw new Error("Your account is created. We sent a confirmation link to "+email+". Open it (check spam/promotions too), then sign in.");throw new Error(/already/i.test(su.error.message||"")?"An account with this email already exists. Please sign in.":"Please try again in a moment.")}const d=chk(su);if(!d.session)throw new Error("Almost done! We sent a confirmation link to "+email+". Open it to activate your account (check spam/promotions too), then sign in.");return sess()},
  async signIn(email,pw){const r=await sb.auth.signInWithPassword({email,password:pw});if(r.error&&/not confirmed/i.test(r.error.message||""))throw new Error("Please confirm your email first: open the link we sent to "+email+" (check spam too).");chk(r);try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}return sess()},
  async signOut(){await sb.auth.signOut()},
  async resetPassword(email){const redirectTo="https://fasciapp.app/app/?reset=1";
   const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:/^https:\/\/(www\.)?fasciapp\.app$/.test(location.origin)?redirectTo:location.origin+"/app/?reset=1"});
   if(error){const m=String(error.message||"");const e=new Error(/rate limit|too many|after \d+ seconds|security purposes/i.test(m)?"Too many reset emails were requested just now. Please wait a few minutes and try again.":/not authori[sz]ed/i.test(m)?"We couldn't send the email right now. Please contact hello@fasciapp.app and we'll help you reset it.":m||"Could not send the reset link.");e.code=error.status;throw e}return true},
  async setNews(on){chk(await sb.auth.updateUser({data:{news_optin:!!on,news_optin_at:on?new Date().toISOString():null,news_optout_at:on?null:new Date().toISOString()}}));try{const s=await sess();if(s){const r=await sb.from("practitioners").select("user_id").eq("user_id",s.user_id).maybeSingle();if(r.data)await sb.from("practitioners").update({news_optin:!!on,news_optin_at:on?new Date().toISOString():null}).eq("user_id",s.user_id)}}catch(e){}},
  async updatePassword(password){chk(await sb.auth.updateUser({password}));return sess()},
  onAuth(cb){try{const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>cb(event,session));return ()=>subscription.unsubscribe()}catch(e){return ()=>{}}},
  async list(){const s=await sess().catch(()=>null);// logged-out visitors never receive phone numbers (pair with column grant in fasciapp-v76-contact.sql)
   // Egress fix v0.23.181: photos are NOT pulled from the DB (they were ~4 MB of base64 per load). They come from static
   // webp files in app/ph/ (tools/export_photos.py). Only people missing from that index get their photo fetched, by id.
   // Result cached in sessionStorage for 10 min; DB.save() clears it.
   const ck="fa_list_v2_"+(s?1:0);try{const c=JSON.parse(sessionStorage.getItem(ck)||"null");if(c&&Date.now()-c.t<600000)return c.d}catch(e){}
   const base="id,user_id,name,mods,address,city,country,lat,lng,website,bio,consent,whatsapp,created_at,locations,practice_name";
   const ixP=fetch("ph/index.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).catch(()=>({}));
   let r;
   if(s){r=await sb.from("practitioners").select(base+",phone,email,news_optin,news_optin_at").order("created_at");
    if(r.error)r=await sb.from("practitioners").select(base+",phone,email").order("created_at");}
   else{r=await sb.from("practitioners").select(base+",has_email").order("created_at");
    if(r.error){r=await sb.from("practitioners").select(base+",email").order("created_at");(r.data||[]).forEach(p=>{p.has_email=!!(p.email&&String(p.email).trim());delete p.email})}}
   const rows=chk(r),ix=await ixP;const miss=[];
   const PK="fa_ph_extra";let X={};try{X=JSON.parse(localStorage.getItem(PK)||"{}")}catch(e){}
   rows.forEach(p=>{const o=X["u:"+p.user_id];if(o&&o.own)p.photo=o.p;else if(ix[p.id])p.photo="ph/"+ix[p.id];else{p.photo=null;miss.push(p.id)}});
   if(miss.length){
    const need=miss.filter(id=>!(X[id]&&Date.now()-X[id].t<86400000));
    for(let i=0;i<need.length;i+=20){try{const q=await sb.from("practitioners").select("id,photo").in("id",need.slice(i,i+20));(q.data||[]).forEach(o=>X[o.id]={t:Date.now(),p:o.photo||null})}catch(e){}}
    rows.forEach(p=>{if(!p.photo&&X[p.id])p.photo=X[p.id].p});try{localStorage.setItem(PK,JSON.stringify(X))}catch(e){}}
   const out=rows.map(norm);try{sessionStorage.setItem(ck,JSON.stringify({t:Date.now(),d:out}))}catch(e){}
   return out},
  async mine(){const s=await sess();if(!s)return null;return norm(chk(await sb.from("practitioners").select("*").eq("user_id",s.user_id).maybeSingle()))},
  async save(p){p=canonP(p);const s=await sess();try{sessionStorage.removeItem("fa_list_v2_0");sessionStorage.removeItem("fa_list_v2_1");const X=JSON.parse(localStorage.getItem("fa_ph_extra")||"{}");if(s&&s.user_id&&p.photo&&/^data:/.test(p.photo)){X["u:"+s.user_id]={t:Date.now(),p:p.photo,own:1};localStorage.setItem("fa_ph_extra",JSON.stringify(X))}}catch(e){}const pn=(p.practice_name||"").trim()||null;let L=stripLocMeta(p.locations||[]);
   const base0=pick(p);base0.practice_name=pn;base0.consent=true;// v0.23.182: every practitioner is public automatically
   base0.news_optin=!!p.news_optin;base0.news_optin_at=p.news_optin?(p.news_optin_at||new Date().toISOString()):null;
   const upsert=async row=>{const r=await sb.from("practitioners").upsert(row,{onConflict:"user_id"}).select().single();return r};
   const newsEmbed=()=>noNewsCol?newsMeta(p):null;
   const dropNewsCols=row=>{if(noNewsCol){delete row.news_optin;delete row.news_optin_at}return row};
   // Prefer locations column + practice_name / news_optin columns
   if(!noLocCol){
    const w2=p.website2;let row=dropNewsCols({...base0,user_id:s.user_id,locations:embedW2(L,w2,p.instagram,newsEmbed())});
    if(noPracticeCol){delete row.practice_name;row.locations=embedW2(embedPractice(L,pn),w2,p.instagram,newsEmbed())}
    let r=await upsert(row);
    if(r.error&&/news_optin/.test(r.error.message||"")){
     noNewsCol=true;console.warn("FasciApp: run news_optin columns SQL — storing news opt-in inside locations jsonb for now");
     row=dropNewsCols({...base0,user_id:s.user_id,locations:embedW2(noPracticeCol?embedPractice(L,pn):L,w2,p.instagram,newsMeta(p))});
     if(noPracticeCol)delete row.practice_name;r=await upsert(row)}
    if(r.error&&/practice_name/.test(r.error.message||"")){
     noPracticeCol=true;console.warn("FasciApp: run `alter table public.practitioners add column if not exists practice_name text;` — storing practice_name inside locations jsonb for now");
     delete row.practice_name;row.locations=embedW2(embedPractice(L,pn),w2,p.instagram,newsEmbed());row=dropNewsCols(row);r=await upsert(row)}
    if(!r.error)return norm(r.data);
    if(!/locations/.test(r.error.message||""))throw new Error(r.error.message);
    noLocCol=true;console.warn("FasciApp: run `alter table practitioners add column if not exists locations jsonb;` — using address fallback")}
   // Address-packing fallback (also carries practice_name / news opt-in inside the JSON when columns missing)
   const packedL=embedW2(embedPractice(L,pn),p.website2,p.instagram,newsEmbed()||(p.news_optin||p.news_optout_at?newsMeta(p):null));
   const packed=packedL.length>1||pn||p.website2||p.instagram||p.news_optin||p.news_optout_at?JSON.stringify(packedL):base0.address;
   const row=dropNewsCols({...base0,user_id:s.user_id,address:packed});delete row.practice_name;
   return norm(chk(await upsert(row)))},
  async sessions(){const s=await sess();if(!s)return[];return chk(await sb.from("sessions").select("*").eq("user_id",s.user_id)).map(unpackSession).sort(cmp)},
  async saveSession(x){const s=await sess();const base=pickS(x);if(!base.format)base.format="In person";if(!base.session_type)base.session_type="MER";
   const write=async row=>{const q=x.id?sb.from("sessions").update(row).eq("id",x.id).select().single():sb.from("sessions").insert(row).select().single();return await q};
   const applyPack=row=>{let o={...row};if(noFormatCol||noSessionTypeCol){o.comment=packMeta(base.format,base.session_type,base.comment);if(noFormatCol)delete o.format;if(noSessionTypeCol)delete o.session_type}return o};
   let row=applyPack({...base,user_id:s.user_id});
   let r=await write(row);
   if(r.error){const msg=r.error.message||"";
    if(/session_type/i.test(msg)){noSessionTypeCol=true;console.warn("FasciApp: run `alter table public.sessions add column if not exists session_type text;` — packing session_type into comment for now")}
    if(/format/i.test(msg)&&!/session_type/i.test(msg)){noFormatCol=true;console.warn("FasciApp: run `alter table public.sessions add column if not exists format text;` — packing format into comment for now")}
    if(/format|session_type|Could not find.*column/i.test(msg)){row=applyPack({...base,user_id:s.user_id});r=await write(row)}}
   return unpackSession(chk(r))},
  async deleteSession(id){chk(await sb.from("sessions").delete().eq("id",id))},
  async msgOk(){const r=await sb.from("messages").select("id").limit(1);return !r.error},
  async msgs(){const s=await sess();if(!s)return[];return chk(await sb.from("messages").select("*").or(`sender.eq.${s.user_id},recipient.eq.${s.user_id}`).order("created_at",{ascending:false}).limit(300)).reverse()},
  async sendMsg(to,body){const s=await sess();return chk(await sb.from("messages").insert({sender:s.user_id,recipient:to,body}).select().single())},
  async unreadCount(){const s=await sess();if(!s)return 0;const r=await sb.from("messages").select("id",{count:"exact",head:true}).eq("recipient",s.user_id).is("read_at",null);if(r.error)throw r.error;return r.count||0},
  async markRead(from){const s=await sess();chk(await sb.from("messages").update({read_at:new Date().toISOString()}).eq("recipient",s.user_id).eq("sender",from).is("read_at",null))},
  onMsg(cb,uid){try{const ch=sb.channel("msgs-"+(uid||"x"));const f=uid?[{filter:"recipient=eq."+uid},{filter:"sender=eq."+uid}]:[{}];f.forEach(o=>ch.on("postgres_changes",{event:"*",schema:"public",table:"messages",...o},cb));window.RT_OK=false;ch.subscribe(st=>{window.RT_OK=st==="SUBSCRIBED"});return ()=>sb.removeChannel(ch)}catch(e){return ()=>{}}}};
}
window.DB=(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase)?supa():local;
// Re-bind if supabase-js arrived after data.js (Safari / slow CDN)
if(window.DB&&window.DB.mode==="local"&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY){
  const tryBind=()=>{if(window.supabase){window.DB=supa();return true}return false};
  if(!tryBind()){let n=0;const t=setInterval(()=>{if(tryBind()||++n>40)clearInterval(t)},50)}
}
})();
