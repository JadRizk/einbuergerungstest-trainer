/* Einbürgerungstest trainer.
   Data lives in data/*.json and is fetched here, so a UI change does not make
   returning visitors re-download the 460-question catalogue. */

import { level as levelOf, solid as solidOf } from './grade.js';
import { json, esc } from './util.js';

const [DATA, GLOS] = await Promise.all([json('data/questions.json'), json('data/glossary.json')]);

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
  idx:0, picked:null, pin:null, again:null, stats:{}, exam:null,
  gloss:true, hooks:false, shufQ:false, shufA:false, auto:true, seed:1, railOpen:true,
  escope:'all', efrom:1, eto:60,        /* which general questions an exam may draw */
  exams:[],                             /* past mock scores, newest last */
  streak:0, bestStreak:0,               /* right answers in a row in Practice */
  voice:'', rate:0.85,
  theme:'system'                        /* or 'light' / 'dark'; theme.js reads it before paint */
};
function save(){ store.set(KEY,{land:S.land,stats:S.stats,gloss:S.gloss,hooks:S.hooks,shufQ:S.shufQ,
  shufA:S.shufA,auto:S.auto,seed:S.seed,railOpen:S.railOpen,exams:S.exams,
  bestStreak:S.bestStreak,voice:S.voice,rate:S.rate,escope:S.escope,efrom:S.efrom,eto:S.eto,theme:S.theme}); }
async function load(){
  const d=await store.get(KEY);
  if(d){ delete d.dark; delete d.mode; delete d.speed; delete d.mapOpen; Object.assign(S,d); }
}

/* ---------------- glossary decoration ---------------- */
const GC=GLOS.map(g=>({de:g.de,en:g.en,cat:g.cat,re:new RegExp(g.rx,'g')}));
const glossCache=new Map();
function glossHits(text){
  if(glossCache.has(text)) return glossCache.get(text);
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
  glossCache.set(text,hits);
  return hits;
}

/* Where a needle sits in a text, case-insensitively as a fallback. */
function locate(text, needle){
  if(!needle) return null;
  let i=text.indexOf(needle);
  if(i<0) i=text.toLowerCase().indexOf(needle.toLowerCase());
  return i<0 ? null : [i, i+needle.length];
}

/* Escape a text, underline its glossary terms, and wrap each of `marks`
   ([a,b,cls] -- a hook's trigger or token) in a <mark>. The two overlap far
   more often than not: 255 of the 474 triggers are themselves glossary terms
   or sit inside one, and so do 174 of the tokens. Nested ranges become nested
   elements, so a trigger keeps its tap-to-read gloss. None of them cross in
   the catalogue as it stands; if one ever does, the mark wins and that gloss
   is dropped rather than producing tags that close out of order. */
function deco(text, marks=[]){
  const ms=[];
  for(const m of [...marks].sort((x,y)=>x[0]-y[0]))
    if(!ms.length || m[0]>=ms[ms.length-1][1]) ms.push(m);
  const crosses=(x,y)=>x[0]<y[1] && y[0]<x[1]
    && !(x[0]<=y[0] && x[1]>=y[1]) && !(y[0]<=x[0] && y[1]>=x[1]);
  const els=[
    ...ms.map(([a,b,cls])=>({a, b, mark:1, open:`<mark class="${cls}">`, close:'</mark>'})),
    ...(S.gloss ? glossHits(text) : []).filter(g=>!ms.some(m=>crosses(g,m)))
      .map(([a,b,de,en])=>({a, b, mark:0,
        open:`<span class="gl" data-de="${esc(de)}" data-en="${esc(en)}">`, close:'</span>'}))
  ].sort((x,y)=>x.a-y.a || y.b-x.b || y.mark-x.mark);   /* outer first; a mark outside an equal gloss */
  let out='', at=0;
  const open=[];
  const shut=upto=>{
    while(open.length && open[open.length-1].b<=upto){
      const e=open.pop(); out+=esc(text.slice(at,e.b))+e.close; at=e.b;
    }
  };
  for(const e of els){
    shut(e.a);
    out+=esc(text.slice(at,e.a))+e.open; at=e.a;
    open.push(e);
  }
  shut(Infinity);
  return out+esc(text.slice(at));
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
/* The question shuffle leans toward your mistakes. Each question draws a
   seeded key log(u)/weight -- weighted sampling without replacement -- so a
   question you have wrong right now tends to come up early, while everything
   still turns up once per pass. With 30 mistakes in 310 at weight 20, half of
   them land in the first 25 questions and nearly all in the first 70.
   Weights are read once per shuffle and the order then stays put: re-weighing
   after every answer would reorder the list under you. */
const W_SHAKY=20, W_MISSED_BEFORE=4;
function weight(q){
  const s=S.stats[q.id];
  if(!s) return 1;
  return shaky(q) ? W_SHAKY : s.w ? W_MISSED_BEFORE : 1;
}
let rankCache=null, rankSeed=null;
function rank(){
  if(!S.shufQ) return null;
  if(rankCache && rankSeed===S.seed) return rankCache;
  let s=(S.seed*2654435761)>>>0;
  const keyed=Q.map(q=>{ s=(s*1664525+1013904223)>>>0;
    return {id:q.id, k:Math.log((s+1)/4294967297)/weight(q)}; });
  keyed.sort((a,b)=>b.k-a.k);
  const m=new Map(); keyed.forEach((x,i)=>m.set(x.id,i));
  rankCache=m; rankSeed=S.seed; return m;
}
/* A miss while shuffling comes back after AGAIN other questions -- and again
   after that, until you get it right -- instead of waiting for the next pass. It
   moves only when you step away from it, so the list never shifts while the
   answer is on screen; `to` is where that step is going. */
const AGAIN=4;
function requeue(list,id,to){
  const r=rank(); if(!r) return;
  const rest=list.filter(x=>x.id!==id), at=rest.findIndex(x=>x.id===to.id);
  const anchor=rest[at+AGAIN-1];
  r.set(id, anchor ? r.get(anchor.id)+0.5 : Math.max(...r.values())+1);
}
function optOrder(q){ return (S.shufA && !q.img) ? permute(4,q.id+S.seed*97) : [0,1,2,3]; }

/* ---------------- pools ---------------- */
const general=Q.filter(q=>!q.state);
const landQs=()=>Q.filter(q=>q.state===S.land);
const pool=()=>general.concat(landQs());
function view(){
  const p=pool();
  /* While an answer is on screen its question stays in the list, even when
     that answer just moved it out of the selection (a first answer under "Not
     seen yet", a recovery under "My mistakes"). Otherwise the list shifts under
     S.idx and the next question is drawn as already answered. */
  const held=q=>S.picked!==null && q.id===S.pin;
  let l;
  switch(true){
    case S.filter==='unseen': l=p.filter(q=>!S.stats[q.id]||held(q)); break;
    case S.filter==='wrong':  l=p.filter(q=>shaky(q)||held(q)); break;
    case S.filter==='images': l=p.filter(q=>q.img); break;
    case S.filter==='land':   l=landQs(); break;
    case S.filter.startsWith('t:'): l=p.filter(q=>q.topic===S.filter.slice(2)); break;
    default: l=p;
  }
  const r=rank();
  return r? l.slice().sort((a,b)=>r.get(a.id)-r.get(b.id)) : l;
}

/* ---------------- hooks: the recognition aid --------------------------------
   data/hooks.json is derived from the catalogue, not part of it: per question
   one rare word in the stem (the trigger) and one string that appears in no
   other option (the token). With "Show hooks" on, the card sits above every
   question and keeps its token back until you answer. With it off, the card
   turns up only after a miss -- the moment the hook is worth learning, and the
   miss comes back a few questions later to try it on. Fetched at boot but
   never waited for: it is an aid, and no question is held back for it.

   A hook is a way to recognise a question you have already learnt. It is not a
   way to work out an answer you do not know -- nothing in the wording tells you
   which option is right, which is the whole reason this file has to exist. */
let HOOKS=null, hooksWait=null;
const GRADEN={
  A:'trigger unique in your 310, and the token never appears in a wrong option anywhere',
  B:'one of those two holds',
  C:'the token is distinctive only inside this question',
  D:'no single distinctive word, so a verbatim phrase is given',
  V:'picture question — the token is the image to point at'
};
/* A failed fetch is not retried in a loop: only a success re-renders, so the
   next attempt waits for the next render that wants a hook. */
function loadHooks(){
  if(hooksWait) return hooksWait;
  hooksWait=json('data/hooks.json')
    .then(j=>{ HOOKS=new Map(j.hooks.map(h=>[h.id,h])); })
    .catch(()=>{ hooksWait=null; });
  return hooksWait;
}
const hookWanted=q=>S.mode!=='exam' && (S.hooks || (S.picked!==null && S.picked!==q.answer));
const hookFor=q=>(hookWanted(q) && HOOKS && HOOKS.get(q.id)) || null;

/* The ranges deco() wraps: the trigger(s) in the stem, the token in the right
   option -- or the whole option, when only an exact match tells it apart. */
const stemMarks=(q,h)=>!h ? [] :
  [h.trigger,h.trigger2].map(n=>locate(q.q,n)).filter(Boolean).map(r=>[...r,'trig']);
function tokenMarks(raw,h){
  if(!h) return [];
  if(h.match==='exact') return [[0,raw.length,'tok']];
  const r=locate(raw,h.token);
  return r ? [[...r,'tok']] : [];
}

function hookCard(h, revealed){
  const flags=[];
  if(h.match==='exact') flags.push('the right option is <b>exactly</b> this — a wrong one contains it as well');
  if(h.stem_ambiguous)  flags.push('another question has the same stem — <b>ignore the stem</b> and go by the token');
  if(h.kind==='number') flags.push('the answer is a number');
  if(h.kind==='image')  flags.push('point at the picture');
  /* The token's gloss would give the answer away, so it waits for the reveal --
     which can leave nothing to list at all. An empty <dl> still draws its rule
     and its padding, so it has to be skipped rather than rendered empty. */
  const row=(de,en)=>`<div><dt lang="de">${esc(de)}</dt><dd>${esc(en)}</dd></div>`;
  const glosses=[];
  if(h.trigger_en) glosses.push(row(h.trigger, h.trigger_en));
  if(revealed && h.token_en) glosses.push(row(h.token, h.token_en));
  return `<div class="hook">
    <div class="hookline">
      <span class="grade g-${h.grade}" title="${esc(GRADEN[h.grade]||'')}">${h.grade}</span>
      <span class="hw trig" lang="de">${esc(h.trigger)}</span>
      ${h.trigger2?`<span class="hplus" lang="de">+&nbsp;${esc(h.trigger2)}</span>`:''}
      <span class="harrow" aria-hidden="true">&rarr;</span>
      <span class="hw tok${revealed?'':' veiled'}" lang="de">${revealed?esc(h.token):'tap an answer'}</span>
    </div>
    ${glosses.length?`<dl class="hooken">${glosses.join('')}</dl>`:''}
    ${flags.length?`<p class="hookflag">${flags.join(' · ')}</p>`:''}
  </div>`;
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
let navReturn=null;                     /* where focus came from */
function openNav(){
  if(railed()) return;
  navReturn=document.activeElement;
  body.classList.add('nav-open'); scrim.hidden=false;
  burger.setAttribute('aria-expanded','true');
  /* Only the drawer is a modal. Above the breakpoint this same element is a
     permanent rail, so the dialog role is put on and taken off rather than
     sitting in the markup telling a screen reader the rail is a dialog. */
  nav.setAttribute('role','dialog');
  nav.setAttribute('aria-modal','true');
  nav.querySelector('.navclose')?.focus();
}
function closeNav(){
  const was=navOpen();
  body.classList.remove('nav-open'); scrim.hidden=true;
  burger.setAttribute('aria-expanded','false');
  nav.removeAttribute('role'); nav.removeAttribute('aria-modal');
  /* Put focus back where it started instead of dropping it on <body>, which
     sends a keyboard or screen-reader user to the top of the document. */
  if(was){ const back=(navReturn&&document.contains(navReturn))?navReturn:burger; back.focus(); }
  navReturn=null;
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

/* While the drawer is open, Tab must not walk out of it into the question
   behind -- which it did, reaching the Listen/Copy buttons after 15 stops. */
const NAVSTOPS='button,select,summary,a[href],input,[tabindex]:not([tabindex="-1"])';
addEventListener('keydown',e=>{
  if(e.key!=='Tab'||!navOpen()) return;
  /* Content inside a collapsed <details> still reports an offsetParent in
     Chrome, so it has to be excluded by hand -- otherwise the last stop is
     computed as the link inside "About & sources", the wrap never fires at
     the summary, and focus leaks to the question behind. */
  const f=[...nav.querySelectorAll(NAVSTOPS)].filter(el=>
    !el.disabled && el.offsetParent!==null &&
    !(el.tagName!=='SUMMARY' && el.closest('details:not([open])')));
  if(!f.length) return;
  const first=f[0], last=f[f.length-1], at=document.activeElement;
  if(e.shiftKey&&at===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey&&at===last){ e.preventDefault(); first.focus(); }
  else if(!nav.contains(at)){ e.preventDefault(); first.focus(); }
});

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
  /* Hooks used to be a mode of its own. An old link or bookmark to it turns
     the setting on and lands on Practice, without a history entry to go back
     into. */
  if(location.hash==='#/hooks'){ S.hooks=true; save(); history.replaceState(null,'','#/practice'); }
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
toggle('t-gloss','gloss',()=>{hideTip(); render();});
toggle('t-hooks','hooks',render);
toggle('t-auto','auto');
toggle('t-shufq','shufQ',()=>{S.seed=Date.now()%100000; rankCache=null; S.idx=0; S.picked=null; render();});
toggle('t-shufa','shufA',()=>{S.picked=null; render();});
const THEMES=['system','light','dark'];
const paintThemeBtns=()=>THEMES.forEach(t=>$('th-'+t).setAttribute('aria-pressed',String(S.theme===t)));
THEMES.forEach(t=>$('th-'+t).onclick=()=>{ S.theme=t; save(); window.theme?.set(t); paintThemeBtns(); });
$('reset').onclick=()=>{
  if(!confirm('Delete all your answers and statistics?')) return;
  S.stats={}; S.exams=[]; S.streak=0; S.bestStreak=0; S.idx=0; S.picked=null; S.exam=null; save(); closeNav(); render();
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
let wasRailed=railed();
addEventListener('resize',()=>{
  const now=railed();
  if(now!==wasRailed){
    wasRailed=now;
    /* The drawer and the rail are one set of controls, so an open drawer must
       not survive into a rail. And the grid is only built above the
       breakpoint: nothing else repaints on a resize, so a window widened from
       a phone showed the legend with no grid under it until the next render. */
    closeNav();
    paintDock();
  }
  syncDock(); applyRail();
  if(now) setSheet(false);
});

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

function optionsHtml(q, ord, revealed, h){
  const ptr=pointerOpts(q);
  return `<ul class="opts${ptr?' pointer':''}">${ord.map((orig,pos)=>{
    let cls='opt', mark='';
    if(revealed){
      if(orig===q.answer){cls+=' right';mark='✓';}
      else if(orig===S.picked){cls+=' wrong';mark='✗';}
      else cls+=' dim';
    }
    const raw=q.options[orig];
    const marks=(revealed && orig===q.answer) ? tokenMarks(raw,h) : [];
    return `<li><button class="${cls}" data-orig="${orig}" ${revealed?'disabled':''}${ptr?` aria-label="${esc(raw)}"`:''}>
      <span class="cap">${ptr?esc(ptrNum(raw)):pos+1}</span>${ptr?'':`<span class="txt" lang="de">${deco(raw,marks)}</span>`}
      <span class="mark">${mark}</span></button></li>`;
  }).join('')}</ul>`;
}

function render(){
  clearAuto();
  landSel.value=S.land;
  [['t-gloss','gloss'],['t-hooks','hooks'],['t-auto','auto'],['t-shufq','shufQ'],['t-shufa','shufA']]
    .forEach(([id,k])=>$(id).setAttribute('aria-checked',String(S[k])));
  paintThemeBtns();
  if(canSpeak) $('rate').value=String(S.rate);
  if(S.mode==='exam') return renderExam();

  const list=view();
  if(!list.length){
    viewEl.innerHTML=`<div class="stage"><div class="scroll"><div class="empty">
      <b>Nothing left</b>This selection is empty — pick another one from the menu.</div></div></div>`;
    paintStreak(); paintDock(); return;
  }
  if(S.idx>=list.length) S.idx=0;
  const q=list[S.idx], ord=optOrder(q);
  const revealed=(S.mode==='flash')||(S.picked!==null);
  const right=revealed && S.picked===q.answer;
  const atPos=ord.indexOf(q.answer)+1;
  const h=hookFor(q);
  if(hookWanted(q) && !HOOKS) loadHooks().then(()=>{ if(HOOKS && S.mode!=='exam' && !autoTimer) render(); });
  paintStreak();

  viewEl.innerHTML=`<div class="stage">
    <div class="meta">
      <span class="tag${q.state?' land':''}">${esc(q.state?q.state+' · no. '+q.num:topicEn(q.topic))}</span>
      ${q.state?'':`<span class="catno"><span class="wide">Catalogue </span>no. ${q.num}</span>`}
      ${toolsHtml(q)}
    </div>
    <div class="scroll" id="scroll">
      ${h?hookCard(h, revealed):''}
      <h1 class="q" lang="de">${deco(q.q, stemMarks(q,h))}</h1>
      ${shotHtml(q)}
    </div>
    <div class="answers" id="answers">
      ${optionsHtml(q,ord,revealed,h)}
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
  if(!q) return;
  S.picked=orig; S.pin=q.id;
  const right=(orig===q.answer);
  record(q,right);
  countStreak(right);
  save();
  S.again=(!right && S.mode==='drill' && S.shufQ) ? q.id : null;
  render();
  /* right answers move on by themselves; wrong ones wait, because the pause
     after a wrong answer is the part that actually teaches you something */
  if(right && S.auto){ autoTimer=setTimeout(()=>{ autoTimer=null; step(1); }, 700); }
}
function step(d){
  clearAuto();
  let list=view();
  if(!list.length) return;
  /* pick the target by id before letting go of the held question: releasing
     it can drop it from the list and shift every index after it */
  const to=list[(S.idx+d+list.length)%list.length];
  if(S.again!==null){ requeue(list,S.again,to); S.again=null; }
  S.picked=null;
  list=view();
  S.idx=Math.max(0, list.findIndex(x=>x.id===to.id));
  hideTip(); stopSpeech(); render();
  const sc=$('scroll'); if(sc) sc.scrollTop=0;
}

/* ---------------- streak ----------------------------------------------------
   Right answers in a row, across questions. Only Practice can get here: Browse
   never takes an answer and the exam has its own handler, where a running
   count would give away which answers were right. Each visit starts at 0, so
   only the best is saved. A question that comes back after a miss counts like
   any other. */
function countStreak(ok){
  S.streak=ok?S.streak+1:0;
  if(S.streak>S.bestStreak) S.bestStreak=S.streak;
}
/* Both numbers stay on screen in Practice, 0 included, so a miss reads as the
   count going back to 0 rather than as something disappearing. */
function paintStreak(){
  $('streak').hidden=(S.mode!=='drill');
  $('s-now').textContent=S.streak;
  $('s-best').textContent=S.bestStreak;
}

/* ---------------- the numbers -----------------------------------------------
   Each question keeps a lifetime tally (r, w) and its current run of correct
   answers (c). The tally feeds the projection; grade.js turns the three into
   the level the map draws and solid or shaky reads. */
function record(q,ok){
  const st=S.stats[q.id]||(S.stats[q.id]={r:0,w:0});
  if(ok){ st.r++; st.c=(st.c||0)+1; } else { st.w++; st.c=0; }
}
const level=q=>levelOf(S.stats[q.id]);
const solid=q=>solidOf(S.stats[q.id]);
const shaky=q=>!!S.stats[q.id] && !solid(q);

/* Laplace-smoothed per question, so one lucky guess is not "mastered" and an
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
  const weak=p.filter(shaky).length;
  const unseen=p.length-done;
  const proj=projected(), passed=proj>=17, known=canProject();

  const topics=[...new Set(general.map(q=>q.topic))]
    .map(t=>{ const qs=general.filter(q=>q.topic===t);
      return {t, n:qs.length, solid:qs.filter(solid).length}; })
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
      ${past.map(e=>`<span class="ex ${e.s>=(e.p||17)?'pass':'fail'}">${e.s}/${e.n||33}</span>`).join('')}
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
  const nSolid=p.filter(solid).length;
  const weak=p.filter(shaky).length;
  /* the phone sheet's resting strip; a wide screen hides it for the legend */
  $('dock-stat').innerHTML= !canProject()
    ? `<b>${done}</b> of <b>${p.length}</b> attempted · <b>${nSolid}</b> solid · <b>${weak}</b> shaky`
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
    const lv=level(q);
    if(lv!==null) cls+= lv>0 ? ' g'+lv : lv<0 ? ' r'+(-lv) : ' even';
    if(q.state) cls+=' land';
    if(cur&&q.id===cur.id) cls+=' now';
    b.className=cls;
    b.title=(q.state?q.state+' '+q.num:'Question '+q.num)+' — '+q.q.slice(0,70);
    b.onclick=()=>{
      /* Not in the current selection: widen it to everything, since the
         question you tapped is the one you asked for. */
      S.picked=null;                     /* releases the held question first */
      let at=view().findIndex(x=>x.id===q.id);
      if(at<0){
        S.filter='all'; filterSel.value='all';
        at=Math.max(0, view().findIndex(x=>x.id===q.id));
      }
      S.idx=at;
      stopSpeech(); setSheet(false); render();
    };
    map.appendChild(b);
  });
  syncDock();
}

/* ---------------- exam ---------------- */
const draw=(a,n)=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[x[i],x[j]]=[x[j],x[i]];}return x.slice(0,n);};

/* The real exam is 30 general + 3 from your state, and 17 of those 33 pass.
   Narrowing the draw to a range you have actually studied keeps the shape but
   not necessarily the length: if fewer than 30 general questions qualify, the
   paper is shorter and the pass mark moves with it, so 'passed' keeps meaning
   the same share of correct answers rather than silently getting easier. */
const EXAM_GEN=30, EXAM_LAND=3, EXAM_PASS=17, EXAM_LEN=EXAM_GEN+EXAM_LAND;
/* Your state always has its full 10 questions, so the state section can never
   be the thing that empties a draw -- only the general pool can. Below this
   many eligible general questions there is no exam worth sitting. */
const EXAM_MIN_GEN=5;
const EXAM_SECS=3600;
const seen=q=>{const st=S.stats[q.id]; return !!st && (st.r+st.w)>0;};
function examEligible(){
  const lo=Math.min(S.efrom,S.eto), hi=Math.max(S.efrom,S.eto);
  switch(S.escope){
    /* Both scopes narrow the general pool only -- the control says so, and your
       state has just 10 questions, so there is nothing worth narrowing there. */
    case 'seen':  return {gen:general.filter(seen), land:landQs()};
    case 'range': return {gen:general.filter(q=>q.num>=lo&&q.num<=hi), land:landQs()};
    default:      return {gen:general, land:landQs()};
  }
}
function examPlan(){
  const {gen,land}=examEligible();
  const ng=Math.min(EXAM_GEN,gen.length), nl=Math.min(EXAM_LAND,land.length);
  const total=ng+nl;
  /* keep the real 17-of-33 share; never let a one-question paper pass on nothing */
  const pass=total?Math.max(1,Math.round(total*EXAM_PASS/EXAM_LEN)):0;
  /* the clock scales with the paper too, or a 13-question draw would carry the
     full hour and teach the wrong sense of pace */
  const secs=Math.max(300,Math.round(total*EXAM_SECS/EXAM_LEN));
  return {gen,land,ng,nl,total,pass,secs,
          ok:(ng>=EXAM_MIN_GEN),
          full:(total===EXAM_LEN),               /* real length and pass mark */
          narrow:(gen.length<general.length)};   /* pool actually restricted  */
}
function startExam(){
  const p=examPlan();
  if(!p.ok) return;
  S.exam={ids:draw(p.gen,p.ng).concat(draw(p.land,p.nl)).map(q=>q.id),
          answers:{},at:0,started:Date.now(),done:false,scored:false,
          pass:p.pass, full:p.full, narrow:p.narrow, secs:p.secs};
  save(); render();
}
const examLen =()=>S.exam.ids.length;
const examPass=()=>S.exam.pass!=null?S.exam.pass:EXAM_PASS;
const examSecs=()=>S.exam.secs||EXAM_SECS;
const examLeft=()=>Math.max(0,examSecs()-Math.floor((Date.now()-S.exam.started)/1000));
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
  if(!S.exam){
    viewEl.innerHTML=`<div class="stage"><div class="scroll"><div class="panel">
      <h2>Mock exam</h2>
      <p>The real test is 33 questions — 30 general and 3 from ${esc(S.land)} — in 60 minutes,
      passed with 17 correct. Nothing is marked until the end.</p>
      <div class="scope">
        <label class="field"><span>Draw the general questions from</span>
          <select class="pick" id="escope">
            <option value="all">The whole catalogue — the real thing</option>
            <option value="seen">Only ones I have answered before</option>
            <option value="range">A range of catalogue numbers</option>
          </select></label>
        <div class="rangerow" id="rangerow">
          <label class="field"><span>From</span>
            <input type="number" id="efrom" min="1" max="300" step="1" value="${S.efrom}"></label>
          <label class="field"><span>To</span>
            <input type="number" id="eto" min="1" max="300" step="1" value="${S.eto}"></label>
        </div>
        <p class="note" id="scopenote"></p>
      </div>
      <div class="act">
        <button class="next" id="go">Start the exam</button>
        <button class="next quiet" id="leave">Back to practice</button>
      </div></div></div></div>`;
    const sc=$('escope'), rr=$('rangerow'), note=$('scopenote'), goBtn=$('go');
    sc.value=S.escope;
    const paint=()=>{
      const p=examPlan();
      rr.hidden=(S.escope!=='range');
      goBtn.disabled=!p.ok;
      const n=p.gen.length;
      note.innerHTML = !p.ok
        ? (S.escope==='seen'
            ? `Only ${n} general question${n===1?'':'s'} answered so far — you need at least ${EXAM_MIN_GEN} before an exam can be drawn.`
            : `Only ${n} general question${n===1?'':'s'} in that range — widen it to at least ${EXAM_MIN_GEN}.`)
        : p.full
          ? `${n} general question${n===1?'':'s'} eligible → the full <b>${p.ng} + ${p.nl}</b> paper, <b>${p.pass}</b> to pass.`
            + (p.narrow?' Full length, but drawn from a slice — not a readiness check.':'')
          : `${n} general question${n===1?'':'s'} eligible → a <b>${p.ng} + ${p.nl}</b> paper,
             <b>${p.pass}</b> to pass in <b>${Math.round(p.secs/60)}</b> minutes. Shorter than the real thing.`;
    };
    sc.onchange=e=>{ S.escope=e.target.value; save(); paint(); };
    /* oninput keeps the note live while typing; onchange is where the value is
       clamped and written back, so the field can never disagree with the plan. */
    /* oninput keeps the note live while typing but does not persist: save()
       serialises the whole state blob, and holding an arrow key would write it
       once per keystroke. onchange is the commit -- clamp, write back, save. */
    const num=(el,key)=>{
      const commit=(settle)=>{
        const v=parseInt(el.value,10);
        if(!Number.isFinite(v)){ if(settle) el.value=S[key]; return; }
        S[key]=Math.min(300,Math.max(1,v));
        if(settle){ el.value=S[key]; save(); }
        paint();
      };
      el.oninput =()=>commit(false);
      el.onchange=()=>commit(true);
    };
    num($('efrom'),'efrom'); num($('eto'),'eto');
    paint();
    goBtn.onclick=startExam;
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
      <span class="pos">${S.exam.at+1} / ${examLen()}</span>
      <span>${answered} answered</span>
      <span class="clock ${left<300?'low':''}" id="clock">${fmtLeft(left)}</span>
      <span class="prog"><i style="width:${Math.round((S.exam.at+1)/examLen()*100)}%"></i></span>
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
          <button class="next grow" id="fwd">${S.exam.at===examLen()-1?'See results':'Next'}</button>
        </div>
      </div>
    </div>`;

  viewEl.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    S.exam.answers[q.id]=+b.dataset.orig;
    if(S.exam.at<examLen()-1) S.exam.at++; else S.exam.done=true;
    render();
  });
  $('prev').onclick=()=>{S.exam.at--;render();};
  $('fwd').onclick=()=>{ if(S.exam.at<examLen()-1){S.exam.at++;render();} else {S.exam.done=true;render();} };
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
    /* a question the clock took from you was never attempted, so it says
       nothing about whether you know it -- it still scores as a miss above */
    if(fresh && a!=null) record(q,ok);
    return `<div class="row"><span class="n">${n+1}</span><span class="s ${ok?'ok':'bad'}">${ok?'✓':'✗'}</span>
      <span class="b" lang="de">${deco(q.q)}<em>Correct: ${deco(q.options[q.answer])}${ok?'':' · You chose: '+(a==null?'—':deco(q.options[a]))}</em></span></div>`;
  }).join('');
  if(fresh){
    S.exam.scored=true;
    S.exams.push({s:score, at:Date.now(), n:examLen(), p:examPass()});
    if(S.exams.length>20) S.exams=S.exams.slice(-20);
    save();
  }
  const passed=score>=examPass();
  viewEl.innerHTML=`<div class="stage"><div class="scroll">
    <div class="panel">
      <p class="score">${score}<small> / ${examLen()} correct</small></p>
      <p class="verdict ${passed?'pass':'fail'}">${passed
        ?`Passed — the threshold is ${examPass()} correct answer${examPass()===1?'':'s'}.`
        :`Not passed — you need at least ${examPass()}.`}</p>
      ${(S.exam.full&&!S.exam.narrow)?'':`<p class="note">${S.exam.full
          ? 'Full length, but drawn from a slice of the catalogue — not a readiness check.'
          : 'A short practice paper. The real one is 30 + 3 with 17 to pass.'}</p>`}
      <div class="act"><button class="next" id="again">New exam</button>
      <button class="next quiet" id="back">Back to practice</button></div></div>
    <div class="panel"><h2>All ${examLen()} questions</h2><div class="rows">${rows}</div></div>
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
/* The hooks are fetched now, not on the first miss, so the card is there when
   that miss comes. render() asks for them too, and re-renders once they land. */
(async()=>{ await load(); window.theme?.set(S.theme); buildFilter(); initSpeech(); applyRail(); applyRoute(); loadHooks(); })();


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
