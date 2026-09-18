/* Einbürgerungstest trainer.
   Data lives in data/*.json and is fetched here, so a UI change does not make
   returning visitors re-download the 460-question catalogue. */

const [DATA, GLOS] = await Promise.all([
  fetch('data/questions.json').then(r => r.json()),
  fetch('data/glossary.json').then(r => r.json())
]);

/* Intrinsic pixel size of every question image, read from the WebP headers.
   Used only to reserve the box before the image arrives, so answers do not
   jump down the page mid-read. */
const IMG = {"aufgabe_130":[633,636],"aufgabe_176":[507,760],"aufgabe_187":[582,351],"aufgabe_21":[512,512],"aufgabe_226":[634,612],"aufgabe_55":[760,507],"baden-wurttemberg_1":[477,760],"baden-wurttemberg_8":[760,684],"bayern_1":[490,760],"bayern_8":[760,667],"berlin_1":[425,760],"berlin_8":[754,742],"brandenburg_aufgabe_1":[461,760],"brandenburg_aufgabe_8":[507,760],"bremen_1":[470,760],"bremen_8":[760,724],"hamburg_1":[481,760],"hamburg_8":[752,734],"hessen_1":[438,760],"hessen_8":[760,695],"mecklenburg-vorpommern_1":[510,760],"mecklenburg-vorpommern_8":[744,744],"niedersachsen_1":[496,760],"niedersachsen_8":[760,725],"nordrhein-westfalen_1":[473,760],"nordrhein-westfalen_8":[760,666],"rheinland-pfalz_1":[469,760],"rheinland-pfalz_8":[760,724],"saarland_1":[492,760],"saarland_8":[740,748],"sachsen-anhalt_1":[494,760],"sachsen-anhalt_8":[760,750],"sachsen_1":[433,760],"sachsen_8":[760,712],"schleswig-holstein_1":[454,760],"schleswig-holstein_8":[684,760],"thuringen_1":[527,760],"thuringen_8":[760,706]};

/* Warm an image so stepping to it is instant. Idempotent: a question can be
   rendered more than once before you move off it. */
const imgWarm = new Set();
function warm(key){
  if(!key || imgWarm.has(key)) return;
  imgWarm.add(key);
  new Image().src = 'img/' + key + '.webp';
}

/* ---------------- storage: window.storage → localStorage → memory ---------------- */
const mem={};
const store={
  async get(k){
    try{ if(window.storage){const r=await window.storage.get(k,false); return r?JSON.parse(r.value):null;} }catch(e){}
    try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch(e){}
    return k in mem? mem[k]:null;
  },
  async set(k,v){
    const s=JSON.stringify(v); mem[k]=v;
    try{ if(window.storage){ await window.storage.set(k,s,false); return; } }catch(e){}
    try{ localStorage.setItem(k,s); }catch(e){}
  }
};
const KEY='ebt.v2';

const Q=DATA.questions;
const TOPIC={
  'Recht':'Law', 'Staat':'The state', 'Politik':'Politics', 'Geschichte':'History',
  'Wirtschaft':'Economy', 'Bund und Länder':'Federation & states',
  'Gesellschaft und Familie':'Society & family', 'Religion und Kultur':'Religion & culture',
  'Europa und Welt':'Europe & the world', 'Bildung und Arbeit':'Education & work'
};
const topicEn=t=>TOPIC[t]||t;
const S={
  land:'Berlin', mode:'drill', filter:'all',
  idx:0, picked:null, stats:{}, exam:null,
  gloss:true, shufQ:false, shufA:false, auto:true, seed:1, railOpen:true,
  exams:[],                             /* past mock scores, newest last */
  voice:'', rate:0.85
};
function save(){ store.set(KEY,{land:S.land,stats:S.stats,gloss:S.gloss,shufQ:S.shufQ,
  shufA:S.shufA,auto:S.auto,seed:S.seed,railOpen:S.railOpen,exams:S.exams,
  voice:S.voice,rate:S.rate}); }
async function load(){
  const d=await store.get(KEY);
  if(d){ delete d.dark; delete d.mode; delete d.speed; delete d.mapOpen; Object.assign(S,d); }
}

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- glossary decoration ---------------- */
const GC=GLOS.map(g=>({de:g.de,en:g.en,cat:g.cat,re:new RegExp(g.rx,'g')}));
const decoCache=new Map();
function deco(text){
  if(!S.gloss) return esc(text);
  if(decoCache.has(text)) return decoCache.get(text);
  const mask=new Array(text.length).fill(false), hits=[];
  for(const g of GC){
    g.re.lastIndex=0; let m;
    while((m=g.re.exec(text))!==null){
      const a=m.index, b=a+m[0].length;
      if(b===a){ g.re.lastIndex++; continue; }
      let clash=false; for(let i=a;i<b;i++) if(mask[i]){clash=true;break;}
      if(clash) continue;
      for(let i=a;i<b;i++) mask[i]=true;
      hits.push([a,b,g.de,g.en]);
    }
  }
  hits.sort((x,y)=>x[0]-y[0]);
  let out='',last=0;
  for(const [a,b,de,en] of hits){
    out+=esc(text.slice(last,a))
      +`<span class="gl" data-de="${esc(de)}" data-en="${esc(en)}">${esc(text.slice(a,b))}</span>`;
    last=b;
  }
  out+=esc(text.slice(last));
  decoCache.set(text,out);
  return out;
}

/* ---------------- text built for pasting into a translator ----------------
   106 of the 460 questions are cloze style: the stem ends in an ellipsis and
   each option finishes the sentence. Translating "Geschichtsunterricht
   teilnimmt." on its own produces nonsense, so for those we write each option
   out as a complete sentence. Everything stays German so the whole block can
   be translated in one go.                                                  */
function copyText(q, revealed){
  const cloze=/(…|\.\.\.)\s*$/.test(q.q);
  const stem=q.q.replace(/\s*(…|\.\.\.)\s*$/,'').trim();
  const L=[];
  L.push('Einbürgerungstest — Frage '+(q.state? q.num+' ('+q.state+')' : q.num));
  L.push('');
  L.push(q.q);
  if(q.img) L.push('(Zu dieser Frage gehört ein Bild.)');
  if(cloze) L.push('(Die Antworten sind unten als vollständige Sätze ausgeschrieben.)');
  L.push('');
  q.options.forEach((o,i)=>{
    const t=o.trim();
    L.push((i+1)+'. '+(cloze ? stem+' '+t : t));
  });
  if(revealed){
    L.push('');
    L.push('Richtige Antwort: '+(q.answer+1)+'. '+q.options[q.answer].trim());
  }
  return L.join('\n');
}
async function toClipboard(text){
  try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
  try{                                   /* file:// has no clipboard API */
    const ta=document.createElement('textarea');
    ta.value=text; ta.setAttribute('readonly','');
    ta.style.position='fixed'; ta.style.top='-1000px';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,text.length);
    const done=document.execCommand('copy'); ta.remove(); return done;
  }catch(e){ return false; }
}
function toolsHtml(q){
  return `<span class="tools">
      ${q&&q.img?`<button class="copy" id="zoomBtn" type="button" title="Show the picture full screen" aria-label="Show the picture full screen">⤢<span class="wide"> Bigger</span></button>`:''}
      ${canSpeak?`<button class="copy" id="sayBtn" type="button" title="Read this question and its answers aloud in German (S)">Listen</button>`:''}
      <button class="copy" id="copyBtn" type="button" title="Copy the question and all four answers (C)">Copy</button>
      <a class="copy" id="gtBtn" target="_blank" rel="noopener noreferrer" title="Open this question in Google Translate">Translate</a>
    </span>`;
}
function wireTools(q, revealed){
  const sb=$('sayBtn');
  if(sb){
    sb.onclick=()=>(speechSynthesis.speaking||speechSynthesis.pending) ? stopSpeech() : say(speakParts(q));
    markSaying(speechSynthesis.speaking||speechSynthesis.pending);
  }
  const text=copyText(q, revealed);
  const cb=$('copyBtn');
  if(cb) cb.onclick=async()=>{
    const done=await toClipboard(text);
    cb.textContent = done ? 'Copied' : 'Press Ctrl+C';
    cb.classList.toggle('done', done);
    setTimeout(()=>{ cb.textContent='Copy'; cb.classList.remove('done'); },1600);
  };
  const gt=$('gtBtn');
  if(gt) gt.href='https://translate.google.com/?sl=de&tl=en&op=translate&text='+encodeURIComponent(text);
}

/* ---------------- deterministic shuffling ---------------- */
function permute(n,seed){
  const a=[...Array(n).keys()]; let s=(seed*2654435761)>>>0;
  for(let i=n-1;i>0;i--){ s=(s*1664525+1013904223)>>>0; const j=s%(i+1); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
let rankCache=null, rankSeed=null;
function rank(){
  if(!S.shufQ) return null;
  if(rankCache && rankSeed===S.seed) return rankCache;
  const p=permute(Q.length,S.seed), m=new Map();
  p.forEach((idx,i)=>m.set(Q[idx].id,i));
  rankCache=m; rankSeed=S.seed; return m;
}
function optOrder(q){ return (S.shufA && !q.img) ? permute(4,q.id+S.seed*97) : [0,1,2,3]; }

/* ---------------- pools ---------------- */
const general=Q.filter(q=>!q.state);
const landQs=()=>Q.filter(q=>q.state===S.land);
const pool=()=>general.concat(landQs());
function view(){
  const p=pool();
  let l;
  switch(true){
    case S.filter==='unseen': l=p.filter(q=>!S.stats[q.id]); break;
    case S.filter==='wrong':  l=p.filter(q=>S.stats[q.id]&&S.stats[q.id].w>0&&S.stats[q.id].w>=S.stats[q.id].r); break;
    case S.filter==='images': l=p.filter(q=>q.img); break;
    case S.filter==='land':   l=landQs(); break;
    case S.filter.startsWith('t:'): l=p.filter(q=>q.topic===S.filter.slice(2)); break;
    default: l=p;
  }
  const r=rank();
  return r? l.slice().sort((a,b)=>r.get(a.id)-r.get(b.id)) : l;
}

/* ---------------- controls ---------------- */
const $=id=>document.getElementById(id);
const landSel=$('land'), filterSel=$('filter');
DATA.meta.states.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;landSel.appendChild(o);});
function buildFilter(){
  const topics=[...new Set(general.map(q=>q.topic))];
  filterSel.innerHTML='<option value="all">All 310 questions</option>'
    +'<option value="unseen">Not seen yet</option>'
    +'<option value="wrong">My mistakes</option>'
    +'<option value="images">Picture questions only</option>'
    +'<option value="land">State questions only (10)</option>'
    +topics.map(t=>`<option value="t:${esc(t)}">${esc(topicEn(t))}</option>`).join('');
  filterSel.value=S.filter;
}
/* ---------------- navigation drawer ----------------------------------------
   One set of controls. Under 62rem it slides in over a scrim; above that the
   stylesheet parks it as a permanent left rail and these handlers go quiet. */
const body=document.body, nav=$('nav'), scrim=$('scrim'), burger=$('burger');
const railed=()=>matchMedia('(min-width:62rem)').matches;
function openNav(){
  if(railed()) return;
  body.classList.add('nav-open'); scrim.hidden=false;
  burger.setAttribute('aria-expanded','true');
  nav.querySelector('.navclose')?.focus();
}
function closeNav(){
  body.classList.remove('nav-open'); scrim.hidden=true;
  burger.setAttribute('aria-expanded','false');
}
const navOpen=()=>body.classList.contains('nav-open');

/* Above 62rem the same button collapses the rail instead of sliding a drawer
   over the page -- the question column is the thing worth the pixels, and on
   a laptop 17rem of permanent chrome is a lot to spend on controls you touch
   once a session. */
function applyRail(){
  const off=!S.railOpen;
  body.classList.toggle('rail-off', off);
  burger.title = off ? 'Show the menu' : 'Hide the menu';
  if(railed()) burger.setAttribute('aria-expanded', String(!off));
  syncDock();
}
burger.onclick=()=>{
  if(railed()){ S.railOpen=!S.railOpen; save(); applyRail(); return; }
  navOpen()?closeNav():openNav();
};
$('navclose').onclick=closeNav;
scrim.onclick=closeNav;

/* ---------------- routes ----------------------------------------------------
   The exam is a page of its own, so the Android back button and the desktop
   window's back arrow both leave it instead of quitting the app. */
const ROUTE={'#/browse':'flash','#/exam':'exam'};
const HASH ={flash:'#/browse', exam:'#/exam', drill:'#/practice'};
function go(mode){
  if(location.hash===HASH[mode]){ applyRoute(); return; }
  location.hash=HASH[mode];                  /* hashchange does the rest */
}
function applyRoute(){
  const m=ROUTE[location.hash]||'drill';
  const changed=(m!==S.mode);
  S.mode=m;
  if(changed){ S.picked=null; S.idx=0; stopSpeech(); }
  if(m!=='exam') S.exam=null;
  body.classList.toggle('exam', m==='exam');
  $('m-drill').setAttribute('aria-pressed',String(m==='drill'));
  $('m-flash').setAttribute('aria-pressed',String(m==='flash'));
  filterSel.disabled=(m==='exam');
  closeNav(); setSheet(false);
  render(); syncDock();
}
addEventListener('hashchange', applyRoute);
$('m-drill').onclick=()=>go('drill');
$('m-flash').onclick=()=>go('flash');
$('m-exam').onclick =()=>go('exam');

landSel.onchange=e=>{S.land=e.target.value;S.idx=0;S.picked=null;S.exam=null;stopSpeech();save();closeNav();render();};
filterSel.onchange=e=>{S.filter=e.target.value;S.idx=0;S.picked=null;stopSpeech();closeNav();render();};

function toggle(id,key,after){
  const el=$(id);
  const flip=()=>{ S[key]=!S[key]; el.setAttribute('aria-checked',String(S[key])); save(); after&&after(); };
  el.onclick=flip;
  el.onkeydown=e=>{ if(e.key===' '||e.key==='Enter'){e.preventDefault();flip();} };
}
toggle('t-gloss','gloss',()=>{decoCache.clear(); hideTip(); render();});
toggle('t-auto','auto');
toggle('t-shufq','shufQ',()=>{S.seed=Date.now()%100000; rankCache=null; S.idx=0; S.picked=null; render();});
toggle('t-shufa','shufA',()=>{S.picked=null; render();});
$('reset').onclick=()=>{
  if(!confirm('Delete all your answers and statistics?')) return;
  S.stats={}; S.exams=[]; S.idx=0; S.picked=null; S.exam=null; save(); closeNav(); render();
};

/* ---------------- progress sheet -------------------------------------------
   Open or shut, nothing in between. The grab row is the whole hit target and
   the only transform ever applied comes from a single class, so there is no
   inline style left behind to fight the transition. On the desktop rail
   layout the stylesheet pins it open and all of this goes quiet. */
const dock=$('dock'), grab=$('grab');
let sheetOn=false;
function setSheet(open){
  open=!!open && !railed();
  sheetOn=open;
  dock.style.transform='';                 /* never let a drag leak into the class state */
  body.classList.toggle('sheet-open', open);
  grab.setAttribute('aria-expanded', String(open));
  grab.setAttribute('aria-label', open ? 'Hide your progress' : 'Show your progress');
  if(open) paintDock();
}
/* How far down the sheet sits when shut. Read off body's resolved padding
   rather than the --sab custom property: getPropertyValue hands back the raw
   `env(...)` token, which parseFloat turns into NaN and the safe area silently
   vanishes. The padding is the same value already resolved to pixels. */
const shutBy=()=>Math.max(0,(dock.offsetHeight||0)-(parseFloat(getComputedStyle(body).paddingBottom)||0));

/* Drag follows your finger, but releases to one of two places. A movement
   under 6px is a tap, which toggles. */
let drag=null, dragged=false;
grab.addEventListener('pointerdown',e=>{
  if(railed()) return;
  dragged=false;
  drag={y:e.clientY, open:sheetOn, moved:0, max:shutBy()};
  try{ grab.setPointerCapture(e.pointerId); }catch(_){}
});
grab.addEventListener('pointermove',e=>{
  if(!drag) return;
  const dy=e.clientY-drag.y;
  drag.moved=Math.max(drag.moved,Math.abs(dy));
  if(drag.moved<5) return;
  body.classList.add('sheet-drag');
  const at=Math.min(drag.max, Math.max(0,(drag.open?0:drag.max)+dy));
  dock.style.transform='translateY('+at+'px)';
});
function release(e){
  if(!drag) return;
  const d=drag; drag=null;
  const dy=(e && typeof e.clientY==='number') ? e.clientY-d.y : 0;
  body.classList.remove('sheet-drag');
  if(d.moved>=6){ dragged=true; setSheet(dy<0); }   /* a real drag settles it here */
  else dock.style.transform='';                     /* a tap: let click do the work */
}
grab.addEventListener('pointerup',release);
grab.addEventListener('pointercancel',release);

/* The toggle lives on click, not on pointerup, so Enter and Space on the
   focused grab bar work too -- a drag suppresses the click it would emit. */
grab.addEventListener('click',()=>{
  if(dragged){ dragged=false; return; }
  if(railed()) return;
  setSheet(!sheetOn);
});

/* the dock is fixed, so reserve exactly its height under the question */
function syncDock(){
  const h=railed() ? (dock.offsetHeight||0) : 0;
  body.style.setProperty('--dockh', (h?h+16:24)+'px');
}
if(window.ResizeObserver) new ResizeObserver(syncDock).observe(dock);
addEventListener('resize',()=>{ syncDock(); applyRail(); if(railed()) setSheet(false); });

/* ---------------- speech ----------------------------------------------------
   Web Speech API. The German voice comes from the operating system, so nothing
   is downloaded, nothing leaves the machine, and this still works from file://
   with no network. Nothing is ever spoken on its own: every utterance below is
   the direct result of a click or a key press. getVoices() is empty until the
   engine has loaded them, which is what the voiceschanged listener is for.   */
const canSpeak = typeof speechSynthesis!=='undefined' && typeof SpeechSynthesisUtterance!=='undefined';
let deVoices=[];
const pickVoice=()=>deVoices.find(v=>v.voiceURI===S.voice) || deVoices[0] || null;

function loadVoices(){
  if(!canSpeak) return;
  const de=speechSynthesis.getVoices().filter(v=>/^de(-|$)/i.test(v.lang));
  de.sort((a,b)=>(b.localService?1:0)-(a.localService?1:0));   /* on-device first: no network */
  deVoices=de;
  paintVoices();
}
function paintVoices(){
  if(!canSpeak) return;
  const sel=$('voice');
  sel.innerHTML=deVoices.map(v=>
    `<option value="${esc(v.voiceURI)}">${esc(v.name)}${v.localService?'':' · online'}</option>`).join('');
  const v=pickVoice(); if(v) sel.value=v.voiceURI;
  $('voicerow').hidden = deVoices.length<2;         /* no picker for a single voice */
  const note=$('voicenote');
  note.hidden = deVoices.length>0;
  if(!note.hidden) note.textContent='No German voice is installed here. On macOS add one under '
    + 'System Settings → Accessibility → Spoken Content → System Voice → Manage Voices, then reload.';
}

/* one utterance at a time; speakSeq invalidates the callbacks of a cancelled run */
let speakSeq=0, alive=null;
function markSaying(on){
  const b=$('sayBtn'); if(!b) return;
  b.textContent = on?'Stop':'Listen';
  b.classList.toggle('live', !!on);
}
function stopSpeech(){
  speakSeq++;
  if(canSpeak) try{ speechSynthesis.cancel(); }catch(e){}
  clearInterval(alive); alive=null;
  markSaying(false);
}
function say(parts){
  if(!canSpeak) return;
  const list=(Array.isArray(parts)?parts:[parts]).map(t=>String(t).trim()).filter(Boolean);
  stopSpeech();
  if(!list.length) return;
  const mine=speakSeq, voice=pickVoice();
  /* Chrome silently drops an utterance queued in the same tick as cancel() */
  setTimeout(()=>{
    if(mine!==speakSeq) return;
    list.forEach((text,i)=>{
      const u=new SpeechSynthesisUtterance(text);
      u.lang = voice? voice.lang : 'de-DE';
      if(voice) u.voice=voice;
      u.rate = S.rate;
      if(i===list.length-1){
        u.onend  =()=>{ if(mine===speakSeq) stopSpeech(); };
        u.onerror=()=>{ if(mine===speakSeq) stopSpeech(); };
      }
      speechSynthesis.speak(u);
    });
    markSaying(true);
    /* Chrome pauses itself after ~15 s of speech; resume() is a no-op elsewhere */
    alive=setInterval(()=>{
      if(mine!==speakSeq){ clearInterval(alive); return; }
      if(speechSynthesis.speaking) speechSynthesis.resume();
    },9000);
  },40);
}

/* What gets read. 106 questions are cloze — the stem ends in an ellipsis and
   each option completes it — so those options are spoken as whole sentences,
   for the same reason copyText() rebuilds them. Picture questions whose options
   are only "Bild 1"–"Bild 4" are read as the question on its own.           */
const CLOZE=/(…|\.\.\.)\s*$/;
const bildOnly=q=>q.options.every(o=>/^Bild\s*\d+\.?$/i.test(o.trim()));
const stemOf=q=>q.q.replace(/\s*(…|\.\.\.)\s*$/,'').trim();
function sentence(q,i){
  const t=q.options[i].trim();
  return CLOZE.test(q.q) ? stemOf(q)+' '+t : t;
}
function speakParts(q){
  const out=[CLOZE.test(q.q) ? stemOf(q) : q.q];
  if(!bildOnly(q)) q.options.forEach((o,i)=>out.push(sentence(q,i)));
  return out;
}

function initSpeech(){
  if(!canSpeak){
    $('voicerow').hidden=true; $('raterow').hidden=true;
    $('voicenote').hidden=false;
    $('voicenote').textContent='This browser has no speech engine, so reading aloud is unavailable.';
    return;
  }
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
  $('voice').onchange=e=>{ S.voice=e.target.value; save(); say('Guten Tag.'); };
  $('rate').onchange =e=>{ S.rate=+e.target.value; save(); };
  addEventListener('beforeunload',()=>{ try{speechSynthesis.cancel();}catch(e){} });
}

/* ---------------- tooltip ---------------- */
const tip=$('tip');
function showTip(el){
  tip.querySelector('b').textContent=el.dataset.de;
  tip.querySelector('span').textContent=el.dataset.en;
  tip.hidden=false;
  const r=el.getBoundingClientRect(), t=tip.getBoundingClientRect();
  let x=r.left+r.width/2-t.width/2;
  x=Math.max(8, Math.min(x, innerWidth-t.width-8));
  const dockH=parseFloat(getComputedStyle(document.body).paddingBottom)||0;
  let y=r.top-t.height-8;
  if(y<8){
    const below=r.bottom+8;
    y=(below+t.height > innerHeight-dockH-8)
      ? Math.max(8, innerHeight-dockH-t.height-8)
      : below;
  }
  tip.style.left=x+'px'; tip.style.top=y+'px';
}
function hideTip(){ tip.hidden=true; }
document.addEventListener('mouseover',e=>{ const g=e.target.closest?.('.gl'); if(g) showTip(g); });
document.addEventListener('mouseout', e=>{ if(e.target.closest?.('.gl')) hideTip(); });
document.addEventListener('click',e=>{
  const g=e.target.closest?.('.gl');
  if(!g){ hideTip(); return; }
  const btn=g.closest('.opt');
  if(btn && !btn.disabled) return;          // let the tap answer the question instead
  e.stopPropagation(); e.preventDefault();
  /* a deliberate click on a term always reads it; on a mouse the tooltip is
     already open from the hover, so toggling here would just swallow the click */
  showTip(g); say(g.dataset.de);
},true);
addEventListener('scroll',hideTip,true); addEventListener('resize',hideTip);

/* ---------------- glossary panel ---------------- */
const veil=$('veil');
function openGlos(){ veil.hidden=false; $('gsearch').value=''; paintGlos(''); $('gsearch').focus(); }
function closeGlos(){ veil.hidden=true; }
$('glosBtn').onclick=openGlos; $('gclose').onclick=closeGlos;
veil.onclick=e=>{ if(e.target===veil) closeGlos(); };
$('gsearch').oninput=e=>paintGlos(e.target.value.trim().toLowerCase());
function paintGlos(term){
  const hit=GLOS.filter(g=>!term || g.de.toLowerCase().includes(term) || g.en.toLowerCase().includes(term));
  const byCat={};
  hit.forEach(g=>(byCat[g.cat]=byCat[g.cat]||[]).push(g));
  $('gbody').innerHTML = hit.length
    ? Object.entries(byCat).map(([c,items])=>
        `<div class="gcat">${esc(c)}</div>`+
        items.sort((a,b)=>a.de.localeCompare(b.de,'de'))
             .map(g=>`<div class="gitem"><b>${esc(g.de)}</b><span>${esc(g.en)}</span></div>`).join('')
      ).join('')
    : `<div class="empty"><b>No match</b>Nothing in the glossary for &bdquo;${esc(term)}&ldquo;.</div>`;
}

/* ---------------- render ---------------- */
const viewEl=$('view');

/* 36 of the 39 picture questions answer with a pointer into the image --
   "Bild 3", or a bare "2" labelling a region on a map. The option text
   carries nothing the picture does not already say, so four stacked
   full-width rows spend ~200px saying nothing. One row of four instead. */
const POINTER=/^(?:Bild\s*)?\d+\.?$/i;
const pointerOpts=q=>!!q.img && q.options.every(o=>POINTER.test(o.trim()));
const ptrNum=o=>(/(\d+)/.exec(o)||[,'?'])[1];

/* fullscreen picture: on a phone a map of Germany at 390px is not readable,
   and on these questions reading it *is* answering. */
const lens=$('lens'), lensImg=$('lensimg');
function openLens(src,alt){ lensImg.src=src; lensImg.alt=alt||''; lens.hidden=false; }
function closeLens(){ lens.hidden=true; lensImg.removeAttribute('src'); }
$('lensclose').onclick=closeLens;
lens.onclick=e=>{ if(e.target!==lensImg) closeLens(); };

let autoTimer=null;
const clearAuto=()=>{ if(autoTimer){ clearTimeout(autoTimer); autoTimer=null; } };

function shotHtml(q){
  if(!q.img) return '';
  const [w,h]=IMG[q.img]||[0,0];
  return `<figure class="shot">
    <img id="qimg" src="img/${q.img}.webp"${w?` width="${w}" height="${h}"`:''} decoding="async"
         alt="Picture for question ${esc(String(q.num))}"></figure>`;
}

function optionsHtml(q, ord, revealed){
  const ptr=pointerOpts(q);
  return `<ul class="opts${ptr?' pointer':''}">${ord.map((orig,pos)=>{
    let cls='opt', mark='';
    if(revealed){
      if(orig===q.answer){cls+=' right';mark='✓';}
      else if(orig===S.picked){cls+=' wrong';mark='✗';}
      else cls+=' dim';
    }
    const raw=q.options[orig];
    return `<li><button class="${cls}" data-orig="${orig}" ${revealed?'disabled':''}${ptr?` aria-label="${esc(raw)}"`:''}>
      <span class="cap">${ptr?esc(ptrNum(raw)):pos+1}</span>${ptr?'':`<span class="txt" lang="de">${deco(raw)}</span>`}
      <span class="mark">${mark}</span></button></li>`;
  }).join('')}</ul>`;
}

function render(){
  clearAuto();
  landSel.value=S.land;
  [['t-gloss','gloss'],['t-auto','auto'],['t-shufq','shufQ'],['t-shufa','shufA']]
    .forEach(([id,k])=>$(id).setAttribute('aria-checked',String(S[k])));
  if(canSpeak) $('rate').value=String(S.rate);
  if(S.mode==='exam') return renderExam();

  const list=view();
  if(!list.length){
    viewEl.innerHTML=`<div class="stage"><div class="scroll"><div class="empty">
      <b>Nothing left</b>This selection is empty — pick another one from the menu.</div></div></div>`;
    $('barnow').textContent=''; paintDock(); return;
  }
  if(S.idx>=list.length) S.idx=0;
  const q=list[S.idx], ord=optOrder(q);
  const revealed=(S.mode==='flash')||(S.picked!==null);
  const right=revealed && S.picked===q.answer;
  const atPos=ord.indexOf(q.answer)+1;
  $('barnow').innerHTML=`<b>${S.idx+1}</b> / ${list.length}`;

  viewEl.innerHTML=`<div class="stage">
    <div class="meta">
      <span class="tag${q.state?' land':''}">${esc(q.state?q.state+' · no. '+q.num:topicEn(q.topic))}</span>
      ${q.state?'':`<span class="catno"><span class="wide">Catalogue </span>no. ${q.num}</span>`}
      ${toolsHtml(q)}
    </div>
    <div class="scroll" id="scroll">
      <h1 class="q" lang="de">${deco(q.q)}</h1>
      ${shotHtml(q)}
    </div>
    <div class="answers" id="answers">
      ${optionsHtml(q,ord,revealed)}
      <div class="act">
        <button class="next quiet" id="prev">Back</button>
        ${ (S.picked!==null)
            ? `<span class="verdictline ${right?'ok':'bad'}">${right?'Correct':'The answer is '+atPos}</span>`
            : `<span class="hint">
                 <span class="kbd">1</span>–<span class="kbd">4</span> answer
                 <span class="kbd">↵</span> next
                 <span class="kbd">←</span><span class="kbd">→</span> browse
                 ${canSpeak?`<span class="kbd">S</span> listen`:''}
                 <span class="kbd">C</span> copy
                 <span class="kbd">G</span> glossary
               </span>` }
        <button class="next grow" id="next">Next</button>
      </div>
    </div></div>`;

  viewEl.querySelectorAll('.opt').forEach(b=>b.onclick=()=>answer(+b.dataset.orig));
  $('next').onclick=()=>step(1);
  $('prev').onclick=()=>step(-1);
  wireTools(q, revealed);
  const qi=$('qimg');
  if(qi){
    const show=()=>openLens(qi.currentSrc||qi.src, qi.alt);
    qi.onclick=show; const zb=$('zoomBtn'); if(zb) zb.onclick=show;
  }
  const sc=$('scroll');
  if(sc) $('answers').classList.toggle('stuck', sc.scrollHeight>sc.clientHeight+2);
  warm((list[(S.idx+1)%list.length]||{}).img);
  paintDock();
}

function answer(orig){
  if(S.mode==='flash'||S.picked!==null) return;
  const q=view()[S.idx];
  S.picked=orig;
  const st=S.stats[q.id]||(S.stats[q.id]={r:0,w:0});
  const right=(orig===q.answer);
  right? st.r++ : st.w++;
  save(); render();
  /* right answers move on by themselves; wrong ones wait, because the pause
     after a wrong answer is the part that actually teaches you something */
  if(right && S.auto){ autoTimer=setTimeout(()=>{ autoTimer=null; step(1); }, 700); }
}
function step(d){
  clearAuto();
  const list=view();
  if(!list.length) return;
  S.idx=(S.idx+d+list.length)%list.length;
  S.picked=null; hideTip(); stopSpeech(); render();
  const sc=$('scroll'); if(sc) sc.scrollTop=0;
}

/* ---------------- the numbers -----------------------------------------------
   Laplace-smoothed per question, so one lucky guess is not "mastered" and an
   unseen question sits at exactly 0.5 instead of needing a special case. */
const pOf=q=>{ const s=S.stats[q.id], r=s?s.r:0, w=s?s.w:0; return (r+1)/(r+w+2); };
const mean=a=>a.length? a.reduce((x,y)=>x+y,0)/a.length : 0.5;
/* the real exam is 30 general + 3 from your state, and 17 of 33 passes */
const projected=()=>Math.round(30*mean(general.map(pOf)) + 3*mean(landQs().map(pOf)));
/* With no answers at all every question sits at the 0.5 prior, which projects
   to exactly 17 -- the pass mark. Telling a brand-new user they are already
   scraping a pass is worse than telling them nothing, so below this many
   answers there is no estimate to give. */
const MIN_PROJ=12;
const attempted=()=>pool().filter(q=>S.stats[q.id]).length;
const canProject=()=>attempted()>=MIN_PROJ;

function paintStats(){
  const el=$('stats');
  const p=pool();
  const done=p.filter(q=>S.stats[q.id]).length;
  const weak=p.filter(q=>{const s=S.stats[q.id]; return s&&s.w>s.r;}).length;
  const unseen=p.length-done;
  const proj=projected(), passed=proj>=17, known=canProject();

  const topics=[...new Set(general.map(q=>q.topic))]
    .map(t=>{ const qs=general.filter(q=>q.topic===t);
      return {t, n:qs.length, solid:qs.filter(q=>{const s=S.stats[q.id];return s&&s.r>=s.w;}).length}; })
    .sort((a,b)=>b.n-a.n);

  const past=S.exams.slice(-6).reverse();

  el.innerHTML=`
    <p class="headline"><span class="big ${known?(passed?'pass':'fail'):'none'}">${known?proj:'—'}</span>
      <span class="of">/ 33 projected · 17 passes</span></p>
    <p class="headnote">${known
      ? `Estimated from how you have answered so far, drawn the way the real exam is:
         30 general questions and 3 from ${esc(S.land)}.`
      : `Answer ${MIN_PROJ-attempted()} more question${MIN_PROJ-attempted()===1?'':'s'} and this
         becomes a real estimate of how you would score.`}</p>

    <div class="chips">
      <button class="chip${S.filter==='unseen'?' on':''}" data-f="unseen"><b>${unseen}</b>not seen yet</button>
      <button class="chip${S.filter==='wrong'?' on':''}" data-f="wrong"><b>${weak}</b>shaky</button>
      <button class="chip${S.filter==='all'?' on':''}" data-f="all"><b>${done}</b>attempted</button>
    </div>

    ${past.length?`<div class="brk"><h4>Past mock exams</h4><div class="exams">
      ${past.map(e=>`<span class="ex ${e.s>=17?'pass':'fail'}">${e.s}/33</span>`).join('')}
    </div></div>`:''}

    <div class="brk"><h4>By topic</h4>
      ${topics.map(t=>`<button class="trow" data-f="t:${esc(t.t)}">
        <span class="nm">${esc(topicEn(t.t))}</span>
        <span class="num">${t.solid}/${t.n}</span>
        <span class="bar2"><i style="width:${Math.round(t.solid/t.n*100)}%"></i></span>
      </button>`).join('')}
    </div>`;

  el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{
    S.filter=b.dataset.f; filterSel.value=S.filter;
    S.idx=0; S.picked=null; stopSpeech(); setSheet(false); render();
  });
}

/* ---------------- catalogue map ---------------- */
function paintDock(){
  const p=pool(), list=view(), map=$('map');
  const done=p.filter(q=>S.stats[q.id]).length;
  const solid=p.filter(q=>S.stats[q.id]&&S.stats[q.id].r>=S.stats[q.id].w).length;
  const weak=p.filter(q=>S.stats[q.id]&&S.stats[q.id].w>S.stats[q.id].r).length;
  $('dock-stat').innerHTML= (railed() || !canProject())
    ? `<b>${done}</b> of <b>${p.length}</b> attempted · <b>${solid}</b> solid · <b>${weak}</b> shaky`
    : `<b>${projected()}</b>/33 projected · <b>${done}</b> of <b>${p.length}</b> attempted`;
  if(!railed() && sheetOn) paintStats();
  /* The grid is not optional on a wide screen. It costs 46px and hiding it
     saved too little to be worth a control -- and a collapsed dock left the
     legend on screen explaining colours that were no longer there.
     It stays hidden below the rail breakpoint, so don't build 310 buttons on
     every render of a phone that will never show them. */
  if(!railed()){ syncDock(); return; }
  const cur=list[S.idx];
  map.innerHTML='';
  p.forEach(q=>{
    const b=document.createElement('button'), st=S.stats[q.id];
    let cls='cell';
    if(st) cls+=(st.r>=st.w)?' ok':' bad';
    if(q.state) cls+=' land';
    if(cur&&q.id===cur.id) cls+=' now';
    b.className=cls;
    b.title=(q.state?q.state+' '+q.num:'Question '+q.num)+' — '+q.q.slice(0,70);
    b.onclick=()=>{
      const l=view(), at=l.findIndex(x=>x.id===q.id);
      if(at<0){ S.filter='all'; filterSel.value='all'; S.idx=view().findIndex(x=>x.id===q.id); }
      else S.idx=at;
      S.picked=null; stopSpeech(); setSheet(false); render();
    };
    map.appendChild(b);
  });
  syncDock();
}

/* ---------------- exam ---------------- */
const draw=(a,n)=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[x[i],x[j]]=[x[j],x[i]];}return x.slice(0,n);};
function startExam(){
  S.exam={ids:draw(general,30).concat(draw(landQs(),3)).map(q=>q.id),answers:{},at:0,started:Date.now(),done:false,scored:false};
  render();
}
const EXAM_SECS=3600;
const examLeft=()=>Math.max(0,EXAM_SECS-Math.floor((Date.now()-S.exam.started)/1000));
const fmtLeft=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');

/* The clock used to re-render the whole question every second, which meant
   re-running 361 glossary regexes a second and throwing away the DOM under
   the reader's finger. Only the clock changes, so only the clock is touched. */
let examTick=null;
const stopTick=()=>{ if(examTick){ clearInterval(examTick); examTick=null; } };
function startTick(){
  stopTick();
  examTick=setInterval(()=>{
    if(S.mode!=='exam'||!S.exam||S.exam.done) return stopTick();
    const c=$('clock'); if(!c) return stopTick();
    const left=examLeft();
    c.textContent=fmtLeft(left); c.classList.toggle('low',left<300);
    if(left<=0){ stopTick(); S.exam.done=true; render(); }
  },1000);
}

function examOptionsHtml(q, ord, chosen){
  const ptr=pointerOpts(q);
  return `<ul class="opts${ptr?' pointer':''}">${ord.map((orig,pos)=>{
    const raw=q.options[orig];
    return `<li><button class="opt${chosen===orig?' picked':''}" data-orig="${orig}"${ptr?` aria-label="${esc(raw)}"`:''}>
      <span class="cap">${ptr?esc(ptrNum(raw)):pos+1}</span>${ptr?'':`<span class="txt" lang="de">${deco(raw)}</span>`}
      <span class="mark"></span></button></li>`;
  }).join('')}</ul>`;
}

function renderExam(){
  stopTick();
  $('barnow').textContent='';
  if(!S.exam){
    viewEl.innerHTML=`<div class="stage"><div class="scroll"><div class="panel">
      <h2>Mock exam</h2>
      <p>33 questions, exactly like the real test: 30 general ones and 3 from ${esc(S.land)}.
      You get 60 minutes, and you pass with 17 correct answers. Nothing is marked until the end.</p>
      <div class="act">
        <button class="next" id="go">Start the exam</button>
        <button class="next quiet" id="leave">Back to practice</button>
      </div></div></div></div>`;
    $('go').onclick=startExam;
    $('leave').onclick=()=>go('drill');
    return;
  }
  if(S.exam.done) return renderResult();
  const left=examLeft();
  if(left===0){ S.exam.done=true; return renderResult(); }

  const q=Q.find(x=>x.id===S.exam.ids[S.exam.at]), ord=optOrder(q);
  const chosen=S.exam.answers[q.id];
  const answered=Object.keys(S.exam.answers).length;

  viewEl.innerHTML=`
    <div class="exambar">
      <button class="quit" id="quit">Quit</button>
      <span class="pos">${S.exam.at+1} / 33</span>
      <span>${answered} answered</span>
      <span class="clock ${left<300?'low':''}" id="clock">${fmtLeft(left)}</span>
      <span class="prog"><i style="width:${Math.round((S.exam.at+1)/33*100)}%"></i></span>
    </div>
    <div class="stage">
      <div class="meta">
        <span class="tag${q.state?' land':''}">${esc(q.state||topicEn(q.topic))}</span>
        ${toolsHtml(q)}
      </div>
      <div class="scroll" id="scroll">
        <h1 class="q" lang="de">${deco(q.q)}</h1>
        ${shotHtml(q)}
      </div>
      <div class="answers" id="answers">
        ${examOptionsHtml(q,ord,chosen)}
        <div class="act">
          <button class="next quiet" id="prev" ${S.exam.at===0?'disabled':''}>Back</button>
          <span class="hint"><span class="kbd">1</span>–<span class="kbd">4</span> answer
            <span class="kbd">↵</span> next ${canSpeak?`<span class="kbd">S</span> listen `:''}<span class="kbd">C</span> copy</span>
          <button class="next grow" id="fwd">${S.exam.at===32?'See results':'Next'}</button>
        </div>
      </div>
    </div>`;

  viewEl.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    S.exam.answers[q.id]=+b.dataset.orig;
    if(S.exam.at<32) S.exam.at++; else S.exam.done=true;
    render();
  });
  $('prev').onclick=()=>{S.exam.at--;render();};
  $('fwd').onclick=()=>{ if(S.exam.at<32){S.exam.at++;render();} else {S.exam.done=true;render();} };
  $('quit').onclick=()=>{ if(confirm('Leave this exam? Your answers will be discarded.')){ S.exam=null; go('drill'); } };
  wireTools(q, false);
  const qi=$('qimg');
  if(qi){ const show=()=>openLens(qi.currentSrc||qi.src, qi.alt); qi.onclick=show; const zb=$('zoomBtn'); if(zb) zb.onclick=show; }
  const sc=$('scroll');
  if(sc) $('answers').classList.toggle('stuck', sc.scrollHeight>sc.clientHeight+2);
  warm((Q.find(x=>x.id===S.exam.ids[S.exam.at+1])||{}).img);
  startTick();
}
function renderResult(){
  stopTick();
  /* scoring writes to your per-question record, so it must happen exactly
     once -- this screen re-renders whenever a setting is toggled */
  const fresh=!S.exam.scored;
  let score=0;
  const rows=S.exam.ids.map((id,n)=>{
    const q=Q.find(x=>x.id===id), a=S.exam.answers[id], ok=(a===q.answer);
    if(ok) score++;
    if(fresh){ const st=S.stats[q.id]||(S.stats[q.id]={r:0,w:0}); ok?st.r++:st.w++; }
    return `<div class="row"><span class="n">${n+1}</span><span class="s ${ok?'ok':'bad'}">${ok?'✓':'✗'}</span>
      <span class="b" lang="de">${deco(q.q)}<em>Correct: ${deco(q.options[q.answer])}${ok?'':' · You chose: '+(a==null?'—':deco(q.options[a]))}</em></span></div>`;
  }).join('');
  if(fresh){
    S.exam.scored=true;
    S.exams.push({s:score, at:Date.now()});
    if(S.exams.length>20) S.exams=S.exams.slice(-20);
    save();
  }
  const passed=score>=17;
  viewEl.innerHTML=`<div class="stage"><div class="scroll">
    <div class="panel">
      <p class="score">${score}<small> / 33 correct</small></p>
      <p class="verdict ${passed?'pass':'fail'}">${passed?'Passed — the threshold is 17 correct answers.':'Not passed — you need at least 17 correct.'}</p>
      <div class="act"><button class="next" id="again">New exam</button>
      <button class="next quiet" id="back">Back to practice</button></div></div>
    <div class="panel"><h2>All 33 questions</h2><div class="rows">${rows}</div></div>
  </div></div>`;
  $('again').onclick=startExam; $('back').onclick=()=>go('drill');
}

/* ---------------- keyboard ---------------- */
document.addEventListener('keydown',e=>{
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){
    if(e.key==='Escape'&&!veil.hidden) closeGlos();
    return;
  }
  const k=e.key;
  if(k==='Escape'){ stopSpeech(); if(!lens.hidden) closeLens(); else if(!veil.hidden) closeGlos(); else if(navOpen()) closeNav(); else hideTip(); return; }
  if(!veil.hidden) return;
  if(k==='g'||k==='G'){ e.preventDefault(); openGlos(); return; }
  if(k==='c'||k==='C'){
    if(e.ctrlKey||e.metaKey) return;          /* leave real Ctrl+C alone */
    const cb=$('copyBtn'); if(cb){ e.preventDefault(); cb.click(); } return;
  }
  if(k==='s'||k==='S'){
    const sb=$('sayBtn'); if(sb){ e.preventDefault(); sb.click(); } return;
  }
  if(S.mode==='exam'){
    if(!S.exam||S.exam.done) return;
    if(k>='1'&&k<='4'){ const b=viewEl.querySelectorAll('.opt')[+k-1]; if(b){e.preventDefault();b.click();} }
    else if(k==='Enter'||k===' '||k==='ArrowRight'){ e.preventDefault(); $('fwd')?.click(); }
    else if(k==='ArrowLeft'){ const p=$('prev'); if(p&&!p.disabled) p.click(); }
    return;
  }
  if(k>='1'&&k<='4'){
    e.preventDefault();
    const b=viewEl.querySelectorAll('.opt')[+k-1];
    if(!b) return;
    if(!b.disabled){ b.click(); return; }
    if(canSpeak){                              /* already answered: read that one back */
      const q=view()[S.idx];
      if(q) say(sentence(q, +b.dataset.orig));
    }
  }
  else if(k==='Enter'||k===' '||k==='ArrowRight'){ e.preventDefault(); step(1); }
  else if(k==='ArrowLeft'){ e.preventDefault(); step(-1); }
});

/* ---------------- boot ---------------- */
(async()=>{ await load(); buildFilter(); initSpeech(); applyRail(); applyRoute(); })();


/* Fill the image cache in the background, so a randomly drawn exam still has
   its pictures with no signal. Deferred to idle and skipped on metered or very
   slow connections -- 1.3 MB is not something to spend on someone's behalf
   without asking, unless it is cheap for them. */
function warmAll(){
  const c = navigator.connection;
  if(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
  Object.keys(IMG).forEach(k => warm(k));
}

/* Only worth the bytes once a service worker is actually controlling the page.
   On a first visit the worker installs but does not control until it claims,
   and anything fetched before that is downloaded and dropped -- the visitor
   would pay 1.3 MB and still have no pictures offline. */
const onIdle = f => (window.requestIdleCallback || (g => setTimeout(g, 3000)))(f);
function warmWhenItWillBeKept(){
  const sw = navigator.serviceWorker;
  if(!sw) return;
  if(sw.controller) return warmAll();
  sw.addEventListener('controllerchange', () => onIdle(warmAll), {once:true});
}
/* this module has a top-level await, so 'load' may already have fired */
if(document.readyState === 'complete') onIdle(warmWhenItWillBeKept);
else addEventListener('load', () => onIdle(warmWhenItWillBeKept));
