/* Wie es geschah — the history questions of the catalogue as one timeline.
   A prototype.

   The events and their texts are in data/timeline.json; each names the
   catalogue questions it answers. The question text and answers are read from
   data/questions.json at runtime, never copied, and what you already know is
   read (never written) from the app's own saved state.

   The spine is built row by row: every row carries its own piece of each
   strand, so opening a card stretches its row and the spine with it. Scrolling
   fills each piece in proportion to how far the reading line has passed it. */

document.documentElement.classList.add('js');

const json = url => fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); });
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

let TL, DATA;
try {
  [TL, DATA] = await Promise.all([json('data/timeline.json'), json('data/questions.json')]);
} catch (err) {
  $('tl').innerHTML = `<li class="fail">The timeline could not be loaded${
    navigator.onLine ? '' : ' — you are offline'}. Reload to try again.</li>`;
  throw err;
}

/* the general questions, by their catalogue number */
const byNum = new Map(DATA.questions.filter(q => q.state === null).map(q => [q.num, q]));
const ERAS = new Map(TL.meta.eras.map(e => [e.id, e]));
const LANES = TL.meta.lanes;

/* ---------------- what you know, as the app judges it ----------------
   The same rule as app.js's level(): a question is solid once it has been
   answered right more often than wrong and right the last time. */
const STATS = (read('ebt.v2') || {}).stats || {};
function verdict(q) {
  const s = STATS[q.id];
  if (!s) return '';
  const net = s.r - s.w, c = 'c' in s ? s.c : (s.r > s.w ? 2 : 0);
  if (net < 0) return 'wrong';
  if (c === 0) return 'wrong';
  if (c === 1 || net === 0) return 'shaky';
  return 'solid';
}

/* ---------------- the rows ---------------- */
const year = d => String(+d.slice(0, 4));
const WALL_FROM = TL.events.find(e => e.id === 'mauerbau')?.date;
const WALL_TO = TL.events.find(e => e.id === 'mauerfall')?.date;

function strands(mode, opts = {}) {
  const st = (pos, extra = '') => `<i class="st s-${pos}${extra}"><b class="fill"></b></i>`;
  return mode === 2 ? st('w') + st('e') : st('c', opts.dash ? ' dash' : '');
}
function wall(e) {
  if (!WALL_FROM || e.date < WALL_FROM || e.date > WALL_TO) return '';
  const cls = e.date === WALL_FROM ? ' from' : e.date === WALL_TO ? ' to' : '';
  return `<i class="wall${cls}"><b class="fill"></b></i>`;
}
function eraRow(era, mode) {
  const to = era.to ? year(era.to) : 'heute';
  return `<li class="row era" id="era-${era.id}" data-era="${era.id}" data-year="${year(era.from)}">
    <div class="spine" aria-hidden="true">${strands(mode)}</div>
    <div class="label"><span class="yrs">${year(era.from)} – ${to}</span>
      <h2>${esc(era.de)}</h2><span class="en" lang="en">${esc(era.en)}</span></div></li>`;
}
function gapRow(from, to, era) {
  const n = +to.slice(0, 4) - +from.slice(0, 4);
  return `<li class="row gap" data-era="${era}">
    <div class="spine" aria-hidden="true">${strands(1, { dash: true })}</div>
    <div class="label">${n.toLocaleString('de-DE')} Jahre später <span lang="en">· ${n.toLocaleString('en-GB')} years later</span></div></li>`;
}
/* fork in 1949, merge in 1990: the same curve, upside down */
function juncRow(kind, era) {
  const P = kind === 'fork'
    ? { w: 'M50 0 C50 55 30 45 30 100', e: 'M50 0 C50 55 70 45 70 100' }
    : { w: 'M30 0 C30 55 50 45 50 100', e: 'M70 0 C70 55 50 45 50 100' };
  const labels = kind === 'fork'
    ? `<div class="label l">${esc(LANES.west.de)}<em lang="en">${esc(LANES.west.en)}</em></div>
       <div class="label r">${esc(LANES.east.de)}<em lang="en">${esc(LANES.east.en)}</em></div>` : '';
  const lead = kind === 'fork' ? '<i class="st s-c lead"><b class="fill"></b></i>'
    : '<i class="st s-w lead"><b class="fill"></b></i><i class="st s-e lead"><b class="fill"></b></i>';
  return `<li class="row junc" data-era="${era}">
    <div class="spine" aria-hidden="true">${lead}<svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <path class="base" d="${P.w}"/><path class="base" d="${P.e}"/>
      <path class="pf w" pathLength="1" d="${P.w}"/><path class="pf e" pathLength="1" d="${P.e}"/></svg></div>
    ${labels}</li>`;
}

/* the end of the line: today, and every question on it as one square */
function endRow(era) {
  const vs = TL.events.flatMap(e => e.qs).filter(n => byNum.has(n)).map(n => verdict(byNum.get(n)));
  const solid = vs.filter(v => v === 'solid').length, seen = vs.filter(Boolean).length;
  const line = seen
    ? `Du kannst <b>${solid} von ${vs.length}</b> Fragen dieser Zeitleiste sicher.`
    : `Du hast noch keine der ${vs.length} Fragen dieser Zeitleiste beantwortet.`;
  const en = seen ? `You know ${solid} of these ${vs.length} questions.` : `You have not answered any of these ${vs.length} questions yet.`;
  return `<li class="row end" data-era="${era}" data-year="${new Date().getFullYear()}">
    <div class="spine" aria-hidden="true">${strands(1)}<i class="cap"></i></div>
    <div class="label"><h2>Heute</h2><p>${line}</p><p class="en-text" lang="en">${en}</p>
      <span class="mq tally" aria-hidden="true">${vs.map(v => `<i class="${v ? 'k-' + v : ''}"></i>`).join('')}</span>
      ${seen ? `<ul class="key" aria-hidden="true">${[['solid', 'sicher'], ['shaky', 'unsicher'], ['wrong', 'zuletzt falsch'], ['', 'offen']]
        .map(([k, t]) => `<li><span class="mq"><i class="${k ? 'k-' + k : ''}"></i></span>${t}</li>`).join('')}</ul>` : ''}
      <a href="./">Zurück zum Üben</a></div></li>`;
}

function qHTML(num) {
  const q = byNum.get(num); if (!q) return '';
  const v = verdict(q);
  const opts = q.options.map((o, i) => i === q.answer
    ? `<li class="ok"><span aria-hidden="true">✓</span><span class="sr" lang="en">Correct: </span>${esc(o)}</li>`
    : `<li class="no"><span aria-hidden="true">✗</span><span class="sr" lang="en">Wrong: </span><s>${esc(o)}</s></li>`).join('');
  const img = q.img ? `<img src="img/${esc(q.img)}.webp" alt="Bild zu Frage ${q.num}" loading="lazy">` : '';
  return `<li class="q"><div class="qn"><span class="mq" aria-hidden="true"><i class="${v ? 'k-' + v : ''}"></i></span>Frage ${q.num}</div>
    <p>${esc(q.q)}</p>${img}<ul>${opts}</ul></li>`;
}

function eventRow(e, mode, side) {
  const qs = e.qs.filter(n => byNum.has(n));
  const vs = qs.map(n => verdict(byNum.get(n)));
  const solid = vs.filter(v => v === 'solid').length;
  const seen = vs.filter(Boolean).length;
  const dot = mode === 2 ? (e.lane === 'east' ? 'd-e' : 'd-w') : 'd-c';
  const tag = e.lane === 'welt' || mode === 2 ? `<span class="tag">${esc(LANES[e.lane].de)}</span>` : '';
  const pair = (o, cls) => o ? `<p class="${cls}">${esc(o.de)}</p><p class="en-text" lang="en">${esc(o.en)}</p>` : '';
  return `<li class="row ev side-${side} lane-${e.lane}" id="e-${e.id}" data-era="${e.era}" data-year="${year(e.date)}">
    <div class="spine" aria-hidden="true">${strands(mode)}${mode === 2 ? wall(e) : ''}<i class="dot ${dot}"></i></div>
    <article class="card" aria-labelledby="h-${e.id}">
      <p class="when"><span>${esc(e.when.de)}</span>${tag}</p>
      <h3 id="h-${e.id}">${esc(e.title.de)}</h3>
      <p class="t-en" lang="en">${esc(e.title.en)}</p>
      ${pair(e.what, 'what')}
      <button class="toggle" type="button" aria-expanded="false" aria-controls="m-${e.id}">
        <span class="mq" aria-hidden="true">${vs.map(v => `<i class="${v ? 'k-' + v : ''}"></i>`).join('')}</span>
        <span><span class="n">${qs.length} ${qs.length === 1 ? 'Frage' : 'Fragen'}</span>${
          seen ? ` · ${solid} sicher` : ''}<span class="sr" lang="en"> — show the questions and background</span></span>
        <i class="chev" aria-hidden="true"></i></button>
      <div class="more" id="m-${e.id}" hidden><div class="more-in">
        ${pair(e.why, 'why')}
        ${e.trap ? `<div class="trap"><b>Nicht verwechseln</b>${esc(e.trap.de)}<p class="en-text" lang="en">${esc(e.trap.en)}</p></div>` : ''}
        <h4>Im Katalog</h4><ol class="qs">${qs.map(qHTML).join('')}</ol>
        ${e.also?.length ? `<details class="also"><summary>Hintergrund · ${e.also.length} ${e.also.length === 1 ? 'Frage' : 'Fragen'}</summary>
          <ol class="qs">${e.also.map(qHTML).join('')}</ol></details>` : ''}
      </div></div>
    </article></li>`;
}

function build() {
  const out = [];
  let era = null, alt = 0, prev = null;
  for (const e of TL.events) {
    if (e.era !== era) {
      if (era === 'teilung') out.push(juncRow('merge', era));
      if (era === 'frueh' && prev) out.push(gapRow(prev.date, e.date, era));
      out.push(eraRow(ERAS.get(e.era), 1));
      if (e.era === 'teilung') out.push(juncRow('fork', e.era));
      era = e.era;
    }
    const mode = era === 'teilung' ? 2 : 1;
    const side = mode === 2 ? (e.lane === 'east' ? 'r' : 'l') : (alt++ % 2 ? 'l' : 'r');
    out.push(eventRow(e, mode, side));
    prev = e;
  }
  out.push(endRow(era));
  $('tl').innerHTML = out.join('');
  const qn = TL.events.reduce((n, e) => n + e.qs.length, 0);
  $('count').textContent = `${TL.events.length} Ereignisse · ${qn} Fragen aus dem Katalog`;
}
build();

/* ---------------- era chips ---------------- */
const chips = $('chips'), lit = $('chips-lit');
chips.innerHTML = lit.innerHTML = TL.meta.eras.map(e =>
  `<li><button type="button" data-go="${e.id}">${esc(e.de)} <small>${year(e.from)}</small></button></li>`).join('');
lit.querySelectorAll('button').forEach(b => { b.tabIndex = -1; });
let eraNow = null;
function showEra(id) {
  if (id === eraNow) return;
  eraNow = id;
  const b = chips.querySelector(`[data-go="${id}"]`); if (!b) return;
  const W = chips.offsetWidth, l = b.offsetLeft, r = W - (l + b.offsetWidth);
  lit.style.clipPath = `inset(0 ${r}px 0 ${l}px round 99px)`;
  chips.querySelectorAll('button').forEach(x => x.toggleAttribute('aria-current', x === b));
  // keep the active chip in view where the row scrolls sideways
  const sc = $('eras-scroll');
  if (l < sc.scrollLeft || l + b.offsetWidth > sc.scrollLeft + sc.clientWidth)
    sc.scrollTo({ left: l - 16, behavior: reduce.matches ? 'auto' : 'smooth' });
}
chips.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  $('era-' + b.dataset.go)?.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
});

/* ---------------- English ---------------- */
const P = Object.assign({ en: false }, read('ebt.tl') || {});
const tEn = $('t-en');
function setEn(on) {
  P.en = on; write('ebt.tl', P);
  document.body.classList.toggle('en', on);
  tEn.setAttribute('aria-checked', String(on));
  for (const m of document.querySelectorAll('.card.open .more')) m.style.height = 'auto';
}
setEn(!!P.en);
tEn.addEventListener('click', () => setEn(!P.en));
tEn.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setEn(!P.en); } });

/* ---------------- opening a card ----------------
   Height is the one layout property animated here, because a card's body has
   no transform equivalent; it is measured, kept short, and handed back to
   `auto` the moment it lands so the text can reflow. */
function setOpen(card, open) {
  const btn = card.querySelector('.toggle'), more = card.querySelector('.more');
  if (card.classList.contains('open') === open) return;
  btn.setAttribute('aria-expanded', String(open));
  if (reduce.matches) {
    more.hidden = !open; more.style.height = open ? 'auto' : '0px';
    card.classList.toggle('open', open);
    return;
  }
  const from = more.hidden ? 0 : more.getBoundingClientRect().height;
  more.hidden = false;
  more.style.transition = 'none';
  more.style.height = from + 'px';
  const to = open ? more.firstElementChild.getBoundingClientRect().height : 0;
  void more.offsetHeight;
  more.style.transition = 'height 240ms var(--ease-out)';
  more.style.height = to + 'px';
  card.classList.toggle('open', open);
  if (open) reveal(card, to - from);
  const done = ev => {
    if (ev && ev.propertyName !== 'height') return;
    more.removeEventListener('transitionend', done);
    if (card.classList.contains('open')) more.style.height = 'auto';
    else more.hidden = true;
  };
  more.addEventListener('transitionend', done);
}
/* An opened card that would run off the bottom of the screen brings itself
   up, never past its own top. */
function reveal(card, grow) {
  const r = card.getBoundingClientRect();
  const barh = $('bar').offsetHeight;
  const over = r.bottom + grow - (innerHeight - 16);
  if (over <= 0) return;
  scrollBy({ top: Math.min(over, r.top - barh - 12), behavior: reduce.matches ? 'auto' : 'smooth' });
}
$('tl').addEventListener('click', e => {
  const card = e.target.closest('.card'); if (!card) return;
  // inside the opened body, only the toggle itself closes it
  if (e.target.closest('.more') || e.target.closest('a, summary')) return;
  if (!e.target.closest('.toggle') && getSelection().toString()) return;   // selecting text, not clicking
  setOpen(card, !card.classList.contains('open'));
});

/* ---------------- entering ----------------
   Once per row, the first time it comes into view. Rows arriving together
   follow each other by 60ms. */
const io = new IntersectionObserver(entries => {
  let i = 0;
  for (const en of entries.filter(x => x.isIntersecting)) {
    en.target.style.setProperty('--d', Math.min(i++ * 60, 240) + 'ms');
    en.target.classList.add('in');
    io.unobserve(en.target);
  }
}, { rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.row').forEach(r => io.observe(r));

/* ---------------- interleaving ----------------
   On a wide screen each card goes as high as it can: at least STEP below the
   card before it, so the dots keep their order, and clear of the last card on
   its own side. A full-width row (an era, a fork) waits for both sides. Only
   heights are read, and a row's height does not depend on its pull, so this
   never feeds back into itself. */
const tl = $('tl');
const wide = matchMedia('(min-width: 52rem)');
const STEP = 72;
function layout() {
  const rs = [...tl.children];
  if (!wide.matches) {
    rs.forEach(r => r.style.removeProperty('--pull'));
    return;
  }
  const h = rs.map(r => r.offsetHeight);
  const last = { l: 0, r: 0 };
  let top = 0;
  const pulls = rs.map((r, i) => {
    const natural = i ? top + h[i - 1] : 0;
    const side = r.classList.contains('side-l') ? 'l' : r.classList.contains('side-r') ? 'r' : null;
    const at = !i ? 0 : side ? Math.max(top + STEP, last[side]) : Math.max(natural, last.l, last.r);
    if (side) last[side] = at + h[i]; else last.l = last.r = at + h[i];
    top = at;
    return natural - at;
  });
  rs.forEach((r, i) => pulls[i] ? r.style.setProperty('--pull', pulls[i] + 'px') : r.style.removeProperty('--pull'));
}
let laying = false;
const relayout = () => { if (!laying) { laying = true; requestAnimationFrame(() => { laying = false; layout(); tick(); }); } };
const ro = new ResizeObserver(relayout);
tl.querySelectorAll('.row').forEach(r => ro.observe(r));
wide.addEventListener('change', relayout);
layout();

/* ---------------- the reading line ----------------
   45% down the screen. Everything above it is drawn in; the last event above
   it is the one you are reading, and its year is shown in the bar. */
const bar = $('bar'), yearEl = $('year');
const rows = [...document.querySelectorAll('.row')];
const fills = [...document.querySelectorAll('.st .fill, .wall .fill')].map(el => ({ el, box: el.parentElement, f: -1 }));
const paths = [...document.querySelectorAll('.junc svg')].map(svg => ({ svg, ps: [...svg.querySelectorAll('.pf')], f: -1 }));
const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
let nowRow = null, ticking = false;

function frame() {
  ticking = false;
  const line = innerHeight * .45;
  // read everything first, then write, so the browser lays out once
  const fr = fills.map(x => { const r = x.box.getBoundingClientRect(); return clamp((line - r.top) / (r.height || 1)); });
  const pr = paths.map(x => { const r = x.svg.getBoundingClientRect(); return clamp((line - r.top) / (r.height || 1)); });
  let cur = null;
  for (const r of rows) { if (r.getBoundingClientRect().top > line) break; if (r.dataset.year) cur = r; }
  cur = cur || rows.find(r => r.dataset.year);

  fills.forEach((x, i) => { const f = Math.round(fr[i] * 1000) / 1000; if (f !== x.f) { x.f = f; x.el.style.transform = `scaleY(${f})`; } });
  paths.forEach((x, i) => { const f = Math.round(pr[i] * 1000) / 1000; if (f !== x.f) { x.f = f; x.ps.forEach(p => { p.style.strokeDashoffset = String(1 - f); }); } });
  if (cur !== nowRow) {
    nowRow?.classList.remove('now');
    nowRow = cur;
    if (cur.classList.contains('ev')) cur.classList.add('now');
    yearEl.textContent = cur.dataset.year;
    showEra(cur.dataset.era);
  }
  bar.classList.toggle('stuck', scrollY > 4);
}
const tick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
addEventListener('scroll', tick, { passive: true });
addEventListener('resize', () => { eraNow = null; tick(); });
// anchors land below the bar, whatever height it wraps to
new ResizeObserver(([e]) => document.documentElement.style.setProperty('--barh', e.target.offsetHeight + 'px')).observe(bar);
frame();

/* ---------------- deep links: timeline.html#e-mauerbau ----------------
   Opens that event, so a question elsewhere in the app can point here. */
function follow() {
  const row = location.hash.startsWith('#e-') && document.getElementById(location.hash.slice(1));
  if (!row) return;
  row.classList.add('in');
  setOpen(row.querySelector('.card'), true);
  row.scrollIntoView({ block: 'start' });
}
addEventListener('hashchange', follow);
follow();
