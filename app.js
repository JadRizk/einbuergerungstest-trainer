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

/* Warm an image so stepping to it is instant. Idempotent: the exam re-renders
   once a second for its timer. */
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
  gloss:true, shufQ:false, shufA:false, seed:1, mapOpen:true,
  voice:'', rate:0.85
};
function save(){ store.set(KEY,{land:S.land,stats:S.stats,gloss:S.gloss,shufQ:S.shufQ,
  shufA:S.shufA,seed:S.seed,mapOpen:S.mapOpen,
  voice:S.voice,rate:S.rate}); }
async function load(){
  const d=await store.get(KEY);
  if(d){ delete d.dark; delete d.mode; delete d.speed; Object.assign(S,d); }
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
function toolsHtml(){
  return `<span class="tools">
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
['drill','flash','exam'].forEach(m=>$('m-'+m).onclick=()=>setMode(m));
landSel.onchange=e=>{S.land=e.target.value;S.idx=0;S.picked=null;S.exam=null;stopSpeech();save();render();};
filterSel.onchange=e=>{S.filter=e.target.value;S.idx=0;S.picked=null;stopSpeech();render();};
function setMode(m){
  S.mode=m; S.picked=null; S.idx=0; stopSpeech(); if(m!=='exam') S.exam=null;
  ['drill','flash','exam'].forEach(k=>$('m-'+k).setAttribute('aria-pressed',String(k===m)));
  $('dock').style.display=(m==='exam')?'none':'';
  syncDock();
  filterSel.disabled=(m==='exam'); landSel.disabled=false;
  render();
}

/* settings popover */
const pop=$('pop'), setBtn=$('setBtn');
setBtn.onclick=e=>{e.stopPropagation(); const open=pop.hidden; pop.hidden=!open; setBtn.setAttribute('aria-expanded',String(open));};
document.addEventListener('click',e=>{ if(!pop.hidden && !pop.contains(e.target)){pop.hidden=true; setBtn.setAttribute('aria-expanded','false');} });
function toggle(id,key,after){
  const el=$(id);
  const flip=()=>{ S[key]=!S[key]; el.setAttribute('aria-checked',String(S[key])); save(); after&&after(); };
  el.onclick=flip;
  el.onkeydown=e=>{ if(e.key===' '||e.key==='Enter'){e.preventDefault();flip();} };
}
toggle('t-gloss','gloss',()=>{decoCache.clear(); hideTip(); render();});
toggle('t-shufq','shufQ',()=>{S.seed=Date.now()%100000; rankCache=null; S.idx=0; S.picked=null; render();});
toggle('t-shufa','shufA',()=>{S.picked=null; render();});
$('reset').onclick=()=>{
  if(!confirm('Delete all your answers and statistics?')) return;
  S.stats={}; S.idx=0; S.picked=null; S.exam=null; pop.hidden=true; setBtn.setAttribute('aria-expanded','false'); save(); render();
};
$('fold').onclick=()=>{ S.mapOpen=!S.mapOpen; save(); paintDock(); };

/* the dock is fixed, so reserve exactly its height at the bottom of the page */
function syncDock(){
  const d=$('dock');
  const h=(d.style.display==='none') ? 0 : (d.offsetHeight||0);
  document.body.style.setProperty('--dockh', (h?h+16:24)+'px');
}
if(window.ResizeObserver) new ResizeObserver(syncDock).observe($('dock'));
addEventListener('resize',syncDock);

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
function render(){
  landSel.value=S.land;
  ['gloss','shufQ','shufA'].forEach((k,i)=>
    $(['t-gloss','t-shufq','t-shufa'][i]).setAttribute('aria-checked',String(S[k])));
  if(canSpeak) $('rate').value=String(S.rate);
  if(S.mode==='exam') return renderExam();

  const list=view();
  if(!list.length){
    viewEl.innerHTML=`<div class="empty"><b>Nothing left</b>This selection is empty — pick another one above.</div>`;
    paintDock(); return;
  }
  if(S.idx>=list.length) S.idx=0;
  const q=list[S.idx], ord=optOrder(q);
  const revealed=(S.mode==='flash')||(S.picked!==null);

  viewEl.innerHTML=`
    <div class="meta">
      <span>Question <b>${S.idx+1}</b> of <b>${list.length}</b></span>
      <span class="tag${q.state?' land':''}">${esc(q.state?q.state+' · no. '+q.num:topicEn(q.topic))}</span>
      <span>Catalogue no. ${q.state?esc(q.state)+' '+q.num:q.num}</span>
      ${toolsHtml()}
    </div>
    <h1 class="q" lang="de">${deco(q.q)}</h1>
    ${q.img?`<figure class="shot"><img src="img/${q.img}.webp" width="${IMG[q.img][0]}" height="${IMG[q.img][1]}" decoding="async" alt="Picture for question ${q.num}"></figure>`:''}
    <ul class="opts">
      ${ord.map((orig,pos)=>{
        let cls='opt', mark='';
        if(revealed){
          if(orig===q.answer){cls+=' right';mark='✓';}
          else if(orig===S.picked){cls+=' wrong';mark='✗';}
          else cls+=' dim';
        }
        return `<li><button class="${cls}" data-orig="${orig}" ${revealed?'disabled':''}>
          <span class="cap">${pos+1}</span><span class="txt" lang="de">${deco(q.options[orig])}</span>
          <span class="mark">${mark}</span></button></li>`;
      }).join('')}
    </ul>
    <div class="act">
      <button class="next quiet" id="prev">Back</button>
      <button class="next" id="next">Next</button>
      <span class="hint">
        <span class="kbd">1</span>–<span class="kbd">4</span> answer
        <span class="kbd">↵</span> next
        <span class="kbd">←</span><span class="kbd">→</span> browse
        ${canSpeak?`<span class="kbd">S</span> listen`:''}
        <span class="kbd">C</span> copy
        <span class="kbd">G</span> glossary
      </span>
    </div>`;
  viewEl.querySelectorAll('.opt').forEach(b=>b.onclick=()=>answer(+b.dataset.orig));
  $('next').onclick=()=>step(1);
  $('prev').onclick=()=>step(-1);
  wireTools(q, revealed);
  warm((list[(S.idx+1)%list.length]||{}).img);
  paintDock();
}

function answer(orig){
  if(S.mode==='flash'||S.picked!==null) return;
  const q=view()[S.idx];
  S.picked=orig;
  const st=S.stats[q.id]||(S.stats[q.id]={r:0,w:0});
  orig===q.answer? st.r++ : st.w++;
  save(); render();
}
function step(d){
  const list=view();
  S.idx=(S.idx+d+list.length)%list.length;
  S.picked=null; hideTip(); stopSpeech(); render();
}

/* ---------------- catalogue map ---------------- */
function paintDock(){
  const p=pool(), list=view(), map=$('map');
  const done=p.filter(q=>S.stats[q.id]).length;
  const solid=p.filter(q=>S.stats[q.id]&&S.stats[q.id].r>=S.stats[q.id].w).length;
  const weak=p.filter(q=>S.stats[q.id]&&S.stats[q.id].w>S.stats[q.id].r).length;
  $('dock-stat').innerHTML=`<b>${done}</b> of <b>${p.length}</b> attempted · <b>${solid}</b> solid · <b>${weak}</b> shaky`;
  $('fold').textContent=S.mapOpen?'hide':'show';
  map.hidden=!S.mapOpen;
  if(!S.mapOpen){ syncDock(); return; }
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
      S.picked=null; stopSpeech(); render();
    };
    map.appendChild(b);
  });
  syncDock();
}

/* ---------------- exam ---------------- */
const draw=(a,n)=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[x[i],x[j]]=[x[j],x[i]];}return x.slice(0,n);};
function startExam(){
  S.exam={ids:draw(general,30).concat(draw(landQs(),3)).map(q=>q.id),answers:{},at:0,started:Date.now(),done:false};
  render();
}
function renderExam(){
  if(!S.exam){
    viewEl.innerHTML=`<div class="panel"><h2>Mock exam</h2>
      <p>33 questions, exactly like the real test: 30 general ones and 3 from ${esc(S.land)}.
      You get 60 minutes, and you pass with 17 correct answers. Nothing is marked until the end.</p>
      <button class="next" id="go">Start the exam</button></div>`;
    $('go').onclick=startExam; return;
  }
  if(S.exam.done) return renderResult();
  const q=Q.find(x=>x.id===S.exam.ids[S.exam.at]), ord=optOrder(q);
  const left=Math.max(0,3600-Math.floor((Date.now()-S.exam.started)/1000));
  if(left===0){ S.exam.done=true; return renderResult(); }
  const mm=String(Math.floor(left/60)).padStart(2,'0'), ss=String(left%60).padStart(2,'0');
  const chosen=S.exam.answers[q.id];

  viewEl.innerHTML=`
    <div class="meta">
      <span>Question <b>${S.exam.at+1}</b> of <b>33</b></span>
      <span class="tag${q.state?' land':''}">${esc(q.state||topicEn(q.topic))}</span>
      <span class="timer ${left<300?'low':''}">${mm}:${ss} left</span>
      <span>${Object.keys(S.exam.answers).length} answered</span>
      ${toolsHtml()}
    </div>
    <h1 class="q" lang="de">${deco(q.q)}</h1>
    ${q.img?`<figure class="shot"><img src="img/${q.img}.webp" width="${IMG[q.img][0]}" height="${IMG[q.img][1]}" decoding="async" alt="Picture for this question"></figure>`:''}
    <ul class="opts">
      ${ord.map((orig,pos)=>`<li><button class="opt${chosen===orig?' right':''}" data-orig="${orig}">
        <span class="cap">${pos+1}</span><span class="txt" lang="de">${deco(q.options[orig])}</span>
        <span class="mark"></span></button></li>`).join('')}
    </ul>
    <div class="act">
      <button class="next quiet" id="prev" ${S.exam.at===0?'disabled':''}>Back</button>
      <button class="next" id="fwd">${S.exam.at===32?'See results':'Next'}</button>
      <span class="hint"><span class="kbd">1</span>–<span class="kbd">4</span> answer <span class="kbd">↵</span> next ${canSpeak?`<span class="kbd">S</span> listen `:''}<span class="kbd">C</span> copy</span>
    </div>`;
  viewEl.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    S.exam.answers[q.id]=+b.dataset.orig;
    if(S.exam.at<32) S.exam.at++; else S.exam.done=true;
    render();
  });
  $('prev').onclick=()=>{S.exam.at--;render();};
  $('fwd').onclick=()=>{ if(S.exam.at<32){S.exam.at++;render();} else {S.exam.done=true;render();} };
  wireTools(q, false);
  warm((Q.find(x=>x.id===S.exam.ids[S.exam.at+1])||{}).img);
  clearTimeout(window._tick);
  window._tick=setTimeout(()=>{ if(S.mode==='exam'&&S.exam&&!S.exam.done) render(); },1000);
}
function renderResult(){
  clearTimeout(window._tick);
  let score=0;
  const rows=S.exam.ids.map((id,n)=>{
    const q=Q.find(x=>x.id===id), a=S.exam.answers[id], ok=(a===q.answer);
    if(ok) score++;
    const st=S.stats[q.id]||(S.stats[q.id]={r:0,w:0}); ok?st.r++:st.w++;
    return `<div class="row"><span class="n">${n+1}</span><span class="s ${ok?'ok':'bad'}">${ok?'✓':'✗'}</span>
      <span class="b" lang="de">${deco(q.q)}<em>Correct: ${deco(q.options[q.answer])}${ok?'':' · You chose: '+(a==null?'—':deco(q.options[a]))}</em></span></div>`;
  }).join('');
  save();
  const passed=score>=17;
  viewEl.innerHTML=`<div class="panel">
      <p class="score">${score}<small> / 33 correct</small></p>
      <p class="verdict ${passed?'pass':'fail'}">${passed?'Passed — the threshold is 17 correct answers.':'Not passed — you need at least 17 correct.'}</p>
      <div class="act"><button class="next" id="again">New exam</button>
      <button class="next quiet" id="back">Back to practice</button></div></div>
    <div class="panel"><h2>All 33 questions</h2><div class="rows">${rows}</div></div>`;
  $('again').onclick=startExam; $('back').onclick=()=>setMode('drill');
}

/* ---------------- keyboard ---------------- */
document.addEventListener('keydown',e=>{
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){
    if(e.key==='Escape'&&!veil.hidden) closeGlos();
    return;
  }
  const k=e.key;
  if(k==='Escape'){ stopSpeech(); if(!veil.hidden) closeGlos(); else if(!pop.hidden){pop.hidden=true;setBtn.setAttribute('aria-expanded','false');} else hideTip(); return; }
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
(async()=>{ await load(); buildFilter(); initSpeech(); setMode('drill'); })();
