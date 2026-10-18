/* Who elects whom — an organisational chart of the German state, drawn only
   from what the catalogue asks.

   The page is in English, like the rest of the app. German stays only as
   itself: the names of the bodies and elections the questions ask about, and
   the questions. The German notes and traps are kept in the data for a second
   interface language later; nothing reads them now.

   Every node and every arrow names the catalogue questions it stands on, and
   the question text, the right answer and the wrong ones are read from
   data/questions.json at runtime, never copied here. The few arrows no
   question asks about (who sits in the Bundesversammlung, who elects a
   Ministerpräsident) are drawn dashed and grey and say so, because without
   them the chart has a body that elects the head of state out of nowhere.

   The state-specific labels (term length, voting age, what the head of
   government is called) are likewise lifted from that state's ten questions. */

import { json, esc, read, write } from './util.js';
import { mountNav } from './nav.js';

mountNav('chart');

let DATA, GLOS;
try {
  [DATA, GLOS] = await Promise.all([json('data/questions.json'), json('data/glossary.json')]);
} catch (err) {
  document.getElementById('chart').innerHTML = `<p class="fail">The catalogue could not be loaded${
    navigator.onLine ? '' : ' — you are offline, and the app has not been saved for offline use yet'}. Reload to try again.</p>`;
  throw err;
}
const Q = DATA.questions;
const byId = new Map(Q.map(q => [q.id, q]));
const GL = new Map(GLOS.map(g => [g.de, g.en]));

const $ = id => document.getElementById(id);

/* ---------------- preferences: the app's state, our own toggles ---------------- */
/* The app's own blob is only read here: the app keeps `land` in memory and
   would overwrite any change made here on its next save. The chart starts on
   the app's state and remembers its own choice from then on. (The menu's
   theme is the one thing written into it from this page; nav.js says how
   the app takes that up.) */
const P = Object.assign({ bg: true, land: null }, read('ebt.org') || {});
let land = P.land || (read('ebt.v2') || {}).land || 'Berlin';
if (!DATA.meta.states.includes(land)) land = 'Berlin';

/* ---------------- what this state's ten questions say ---------------- */
const answer = q => q.options[q.answer];
/* "Ministerpräsidentin / Ministerpräsident" → "Ministerpräsident/in";
   "Erste Bürgermeisterin / Erster Bürgermeister" → "Erster Bürgermeister" */
function shortForm(s) {
  const [f, m] = s.split(' / ');
  if (!m) return s;
  return f === m + 'in' ? m + '/in' : m;
}
function stateInfo(name) {
  const qs = Q.filter(q => q.state === name);
  const find = re => qs.find(q => re.test(q.q));
  const term = find(/Für wie viele Jahre/);
  const age = find(/Ab welchem Alter/);
  const head = find(/Regierungschef/);
  const mins = find(/(Ministerin|Senatorin).*nicht\?/);
  const city = ['Berlin', 'Hamburg', 'Bremen'].includes(name);
  const ageIsLandtag = age && /Landtag|Bürgerschaft/.test(age.q);
  const body = age && (age.q.match(/\(Wahl der (\S+)\)/) || [])[1];
  return {
    city,
    parl: name === 'Berlin' ? 'Abgeordnetenhaus' : (name === 'Hamburg' || name === 'Bremen') ? 'Bürgerschaft' : 'Landtag',
    term, age, head, mins, ageIsLandtag,
    headLabel: head ? shortForm(answer(head)) : 'Ministerpräsident/in',
    minsLabel: city ? 'Senator/innen' : 'Landesminister/innen',
    noMin: mins ? shortForm(answer(mins)).replace(/\/in$/, '') : '',
    council: body ? body.replace(/en$/, '') : 'Gemeinderat'
  };
}

/* ---------------- the chart ----------------------------------------------
   Coordinates are the centre of each box in a 1120 × 730 drawing — kept
   compact on purpose, so the text stays legible with the question panel open
   beside it. The four columns are the levels the catalogue names in
   question 64: Europa, Bund, Länder, Kommunen. The people sit underneath. */
const W = 1120, H = 730;
const COL_Y = 12, COL_H = 628;
const COLS = [
  { id: 'c-eu',   de: 'Europa',   en: 'Europe — the EU level',           x: 12,  w: 160, qs: [224, 173] },
  { id: 'c-bund', de: 'Bund',     en: 'Federation — the national level', x: 184, w: 500, qs: [64, 27, 38] },
  { id: 'c-land', de: 'Länder',   en: 'States — the 16 federal states',     x: 696, w: 220, qs: [64, 24, 39, 49, 67] },
  { id: 'c-kom',  de: 'Kommunen', en: 'Municipalities — the local level', x: 928, w: 180, qs: [64, 69, 56] }
];

/* Branch is what colours the box. It is also a catalogue topic in its own
   right: questions 60, 63 and 143–145 ask which power a body belongs to. */
const BRANCH = {
  leg:  { de: 'Legislative', en: 'legislature — makes the laws' },
  exe:  { de: 'Exekutive',   en: 'executive — carries out the laws' },
  jud:  { de: 'Judikative',  en: 'judiciary — the courts' },
  head: { de: 'Staatsoberhaupt', en: 'head of state' },
  volk: { de: 'Volk', en: 'the people' }
};

/* Two lines once a name is too long for one, broken at the last space. */
function wrap(s) {
  if (s.length <= 18) return [s];
  const i = s.lastIndexOf(' ');
  return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s];
}
/* Long compounds break where the words join, with the hyphen kept. */
function hyphen(s) {
  const m = s.length > 16 && s.match(/^(.+?verordneten)(.+)$/i);
  return m ? [m[1] + '-', m[2]] : [s];
}

function nodes(S) {
  const head = wrap(S.headLabel);
  return [
    { id: 'volk', de: ['Das wahlberechtigte Volk'], sub: 'Alle Staatsgewalt geht vom Volke aus',
      en: 'The people — everyone entitled to vote', gl: 'Volkssouveränität',
      x: 560, y: 692, w: 1096, h: 56, b: 'volk', qs: [61, 52, 28, 129, 114, 44] },

    { id: 'bverfg', de: ['Bundesverfassungs-', 'gericht'], sub: 'legt das Grundgesetz aus',
      en: 'Federal Constitutional Court', gl: 'Bundesverfassungsgericht',
      x: 305, y: 104, w: 200, h: 72, b: 'jud', qs: [80] },
    { id: 'bp', de: ['Bundespräsident/in'], sub: 'Staatsoberhaupt',
      en: 'Federal President', gl: 'Bundespräsident',
      x: 565, y: 104, w: 200, h: 58, b: 'head', qs: [87, 84, 75, 44] },
    { id: 'bv', de: ['Bundesversammlung'], sub: 'tritt nur zur Wahl zusammen',
      en: 'Federal Convention', gl: 'Bundesversammlung',
      x: 305, y: 250, w: 200, h: 58, b: 'head', qs: [86, 74],
      note: 'Wer in ihr sitzt, fragt der Katalog nicht: alle Bundestagsabgeordneten und ebenso viele Delegierte, die die Landtage bestimmen.',
      noteEn: 'Who sits in it is not asked: every member of the Bundestag, plus the same number of delegates chosen by the state parliaments.' },

    { id: 'breg', group: true, de: ['Bundesregierung'], sub: 'Bundeskabinett',
      en: 'Federal Government — the Cabinet', gl: 'Bundesregierung',
      x: 565, y: 290, w: 220, h: 210, b: 'exe', qs: [82, 65, 31, 103] },
    { id: 'bk', de: ['Bundeskanzler/in'], sub: 'Regierungschef/in',
      en: 'Federal Chancellor — head of government', gl: 'Bundeskanzler',
      x: 565, y: 236, w: 196, h: 56, b: 'exe', qs: [81, 83, 82, 70, 72, 71] },
    { id: 'bm', de: ['Bundesminister/innen'], sub: '',
      en: 'Federal ministers', gl: 'Bundesregierung',
      x: 565, y: 320, w: 196, h: 44, b: 'exe', qs: [58, 82] },

    { id: 'bt', de: ['Bundestag'], sub: 'Parlament für ganz Deutschland',
      en: 'Federal Parliament', gl: 'Bundestag',
      x: 305, y: 500, w: 200, h: 58, b: 'leg', qs: [74, 124, 107, 57, 89, 13, 98, 73] },
    { id: 'br', de: ['Bundesrat'], sub: 'Vertretung der Länder',
      en: 'Federal Council — the states’ chamber', gl: 'Bundesrat',
      x: 565, y: 500, w: 196, h: 58, b: 'leg', qs: [85, 90, 91] },

    { id: 'lr', group: true, de: [S.city ? 'Senat' : 'Landesregierung'], sub: '',
      en: S.city ? 'Senate — the government of a city-state' : 'State government',
      gl: S.city ? 'Senat' : null,
      x: 806, y: 290, w: 200, h: 210, b: 'exe', qs: [39, S.mins?.id].filter(Boolean) },
    { id: 'mp', de: head, sub: 'Regierungschef/in',
      en: 'Head of the state government', gl: S.city ? null : 'Ministerpräsident',
      x: 806, y: 238, w: 186, h: head.length > 1 ? 70 : 56, b: 'exe', qs: [!S.city && 37, S.head?.id].filter(Boolean),
      note: 'Wer sie / ihn wählt, fragt der Katalog nicht: das Landesparlament — so wie der Bundestag die Kanzlerin / den Kanzler wählt.',
      noteEn: 'Who elects them is not asked: the state parliament — just as the Bundestag elects the Chancellor.' },
    { id: 'lm', de: [S.minsLabel], sub: S.noMin ? 'kein ' + S.noMin : '',
      en: S.city ? 'Senators — the city-state’s ministers' : 'State ministers', gl: S.city ? 'Senator' : 'Minister',
      x: 806, y: 324, w: 186, h: 50, b: 'exe', qs: [S.mins?.id].filter(Boolean) },
    { id: 'lt', de: [S.parl], sub: 'Landesparlament',
      en: 'State parliament', gl: { Landtag: 'Landtag', Bürgerschaft: 'Bürgerschaft' }[S.parl] || 'Landesparlament',
      x: 806, y: 500, w: 186, h: 58, b: 'leg', qs: [62, S.term?.id].filter(Boolean) },

    { id: 'bgm', de: ['Bürgermeister/in'], sub: 'Oberhaupt der Gemeinde',
      en: 'Mayor', gl: 'Bürgermeister',
      x: 1018, y: 236, w: 164, h: 56, b: 'exe', qs: [131],
      note: 'Wer sie / ihn wählt, fragt der Katalog nicht. In den Flächenländern wählen die Bürgerinnen und Bürger sie / ihn direkt.',
      noteEn: 'Who elects the mayor is not asked. Outside the city-states, residents elect them directly.' },
    { id: 'gr', de: hyphen(S.council), sub: S.council === 'Gemeinderat' ? 'oder Stadtrat' : '',
      en: S.council === 'Gemeinderat' ? 'Municipal council' : 'District assembly', gl: 'Gemeinderat',
      x: 1018, y: 500, w: 164, h: 58, b: 'leg', qs: [69, !S.ageIsLandtag && S.age?.id].filter(Boolean),
      ...(land === 'Bremen' && {
        note: 'In Bremen fragt der Katalog nicht nach der Kommunalwahl. Die Stadt Bremen hat kein eigenes Kommunalparlament — ihre Abgeordneten in der Bürgerschaft bilden die Stadtbürgerschaft; Bremerhaven wählt eine Stadtverordnetenversammlung.',
        noteEn: 'For Bremen the catalogue asks nothing about local elections. The city of Bremen has no separate council — its members of the Bürgerschaft sit as the city council; Bremerhaven elects its own.' }) },

    { id: 'ep', de: ['Europäisches', 'Parlament'], sub: '',
      en: 'European Parliament', gl: 'Europäisches Parlament',
      x: 92, y: 500, w: 144, h: 58, b: 'leg', qs: [232, 230, 234, 238] }
  ];
}

/* Edges. `d` is drawn by hand: an automatic router puts the arrows wherever
   it likes, and the point of the chart is that the eye reads it bottom to top.
   The `sub` lines under an election name it first, because question 62 asks
   for exactly that word. */
function edges(S) {
  const lt = S.term ? `every ${answer(S.term)} years` : '';
  const ltAge = S.ageIsLandtag ? `from ${answer(S.age)}` : '';
  const up = x => `M${x} 662 L${x} 531`;
  return [
    { id: 'e-ep', from: 'volk', to: 'ep', k: 'elect', de: 'wählt', en: 'elects',
      sub: ['Europawahl', 'every 5 years'], d: up(92), lx: 92, ly: 584, qs: [232, 230] },
    { id: 'e-bt', from: 'volk', to: 'bt', k: 'elect', de: 'wählt', en: 'elects',
      sub: ['Bundestagswahl', 'every 4 years · from 18 · 5% threshold'], d: up(305), lx: 305, ly: 584,
      qs: [28, 129, 107, 109, 110, 94, 108, 93, 117, 121, 123, 127, 122, 112, 119, 5, 115, 116, 120, 133] },
    { id: 'e-lt', from: 'volk', to: 'lt', k: 'elect', de: 'wählt', en: 'elects',
      sub: ['Landtagswahl', [lt, ltAge].filter(Boolean).join(' · ')].filter(Boolean), d: up(806), lx: 806, ly: 584,
      qs: [62, S.term?.id, S.ageIsLandtag && S.age?.id, 133].filter(Boolean) },
    { id: 'e-gr', from: 'volk', to: 'gr', k: 'elect', de: 'wählt', en: 'elects',
      sub: ['Kommunalwahl', !S.ageIsLandtag && S.age ? 'from ' + answer(S.age) : ''].filter(Boolean),
      d: up(1018), lx: 1018, ly: 584, qs: [!S.ageIsLandtag && S.age?.id].filter(Boolean),
      /* Bremen's age question is about the Bürgerschaft, so nothing backs
         this arrow there: it is drawn as background and says why. */
      ...(S.ageIsLandtag && { k: 'bg', bg: true,
        note: 'Für Bremen fragt der Katalog nicht nach der Kommunalwahl.',
        noteEn: 'For Bremen the catalogue asks nothing about local elections.' }) },

    { id: 'e-bp', from: 'bv', to: 'bp', k: 'elect', de: 'wählt', en: 'elects',
      d: 'M405 244 C437 244 433 104 463 104', lx: 434, ly: 168, qs: [86, 44] },
    { id: 'e-vor', from: 'bp', to: 'bk', k: 'appt', de: 'schlägt vor', en: 'proposes — for election by the Bundestag',
      d: 'M590 133 L590 206', lx: 590, ly: 162, qs: [70] },
    { id: 'e-ern', from: 'bp', to: 'bm', k: 'appt', de: 'ernennt', en: 'appoints — formally',
      d: 'M665 114 C704 126 702 320 665 320', lx: 690, ly: 156, qs: [58] },
    { id: 'e-lei', from: 'bk', to: 'bm', k: 'lead', de: 'leitet', en: 'leads — chairs the Cabinet',
      d: 'M565 264 L565 296', lx: 610, ly: 280, qs: [82] },
    { id: 'e-bk', from: 'bt', to: 'bk', k: 'elect', de: 'wählt', en: 'elects',
      d: 'M372 471 C372 380 430 236 465 236', lx: 394, ly: 350, qs: [81, 83, 65] },
    { id: 'e-ctl', from: 'bt', to: 'breg', k: 'ctl', de: 'kontrolliert', en: 'scrutinises — holds to account',
      d: 'M398 471 C406 430 428 382 453 382', lx: 432, ly: 432, qs: [65, 88, 13] },
    { id: 'e-br', from: 'lr', to: 'br', k: 'form', de: 'bilden', en: 'make up — state governments sit in it',
      d: 'M706 366 C682 366 690 500 665 500', lx: 690, ly: 432, qs: [85, 90, 91] },

    /* Not asked in the catalogue, drawn so the boxes above have a source. */
    { id: 'b-bv', from: 'bt', to: 'bv', k: 'bg', de: 'alle Abgeordneten', en: 'all members — every Bundestag member sits in it',
      d: 'M282 471 L282 281', lx: 282, ly: 376, bg: true, qs: [],
      note: 'Die Bundesversammlung besteht aus allen Bundestagsabgeordneten und ebenso vielen Delegierten, die die Landtage bestimmen.',
      noteEn: 'The Federal Convention is every member of the Bundestag plus the same number of delegates chosen by the state parliaments.' },
    { id: 'b-mp', from: 'lt', to: 'mp', k: 'bg', de: 'wählt', en: 'elects',
      d: 'M899 488 C932 470 932 238 901 238', lx: 924, ly: 432, bg: true, qs: [],
      note: 'In jedem Land wählt das Landesparlament die Regierungschefin / den Regierungschef — so wie der Bundestag die Kanzlerin / den Kanzler wählt.',
      noteEn: 'In every state the parliament elects the head of government — just as the Bundestag elects the Chancellor.' }
  ];
}

/* The bracket around Bundestag and Bundesrat: together they are the federal
   legislature (question 60), and between them they pass federal law (42, 90). */
const LEGIS = { id: 'legis', de: 'Gesetzgebung des Bundes', en: 'Federal law-making — the legislature',
  qs: [42, 60, 90, 65], x: 196, y: 458, w: 480, h: 102 };
const SEP = { id: 'sep', de: 'Gewaltenteilung', en: 'Separation of powers', qs: [60, 63, 143, 144, 145, 32, 54] };

/* The answers the catalogue's wrong options are built to catch, each pointing
   at the part of the chart that settles it. Shown while nothing is selected. */
const TRAPS = [
  { ref: 'e-bk',  de: 'Die Kanzlerin / den Kanzler wählt der Bundestag — nicht das Volk.', en: 'The Bundestag elects the Chancellor, not the people.', qs: [81, 83] },
  { ref: 'e-bp',  de: 'Die Bundespräsidentin / den Bundespräsidenten wählt die Bundesversammlung — nicht das Volk.', en: 'The Federal Convention elects the President, not the people.', qs: [86, 44] },
  { ref: 'e-ern', de: 'Die Ministerinnen und Minister ernennt die Bundespräsidentin / der Bundespräsident.', en: 'The President appoints the ministers.', qs: [58] },
  { ref: 'e-br',  de: 'Den Bundesrat bilden die Landesregierungen — keine gewählten Abgeordneten.', en: 'The Bundesrat is made up of the state governments, not elected MPs.', qs: [85] },
  { ref: 'breg',  de: 'Das Kabinett bildet nicht der Bundestag — er wählt und kontrolliert die Regierung.', en: 'The Bundestag does not form the Cabinet; it elects and scrutinises the government.', qs: [65] }
];

/* ---------------- drawing ---------------- */
let S, NODES, EDGES, NI;
const short = s => s.split(' — ')[0];
const nameOf = id => (NI.get(id)?.de || [id]).join(' ').replace(/- /g, '');

function nodeSVG(n) {
  const x = n.x - n.w / 2, y = n.y - n.h / 2;
  const ref = `data-ref="${n.id}" tabindex="0" role="button" aria-label="${esc(nameOf(n.id) + ' — ' + n.en)}"`;
  if (n.group) {
    const sub = short(n.en);
    return `<g class="grp b-${n.b}" ${ref}>
      <rect x="${x}" y="${y}" width="${n.w}" height="${n.h}" rx="14"/>
      <text class="gname" lang="de" x="${x + 14}" y="${y + n.h - (sub ? 28 : 14)}">${esc(n.de[0])}</text>
      ${sub ? `<text class="gsub" x="${x + 14}" y="${y + n.h - 12}" data-fit="${n.w - 24}">${esc(sub)}</text>` : ''}
    </g>`;
  }
  const sub = short(n.en);
  const lh = 18, total = n.de.length * lh + (sub ? 16 : 0);
  const ty = n.y - total / 2 + 13;
  const fit = n.w - 16;
  const t = n.de.map((l, i) => `<text class="name" lang="de" x="${n.x}" y="${ty + i * lh}" data-fit="${fit}">${esc(l)}</text>`).join('');
  const s = sub ? `<text class="sub" x="${n.x}" y="${ty + n.de.length * lh + 1}" data-fit="${fit}">${esc(sub)}</text>` : '';
  return `<g class="node b-${n.b}" ${ref}>
    <rect x="${x}" y="${y}" width="${n.w}" height="${n.h}" rx="10"/>${t}${s}
  </g>`;
}
/* Pills are sized after layout, from the measured text (see fit()). */
function edgeSVG(e) {
  const label = short(e.en);
  const subs = (e.sub || []).map((l, i) => `
    <rect class="pill subpill" data-pill="${i + 1}" x="${e.lx}" y="${e.ly + 13 + i * 17}" width="0" height="17" rx="8.5"/>
    <text class="esub${i === 0 ? ' first' : ''}" data-of="${i + 1}" x="${e.lx}" y="${e.ly + 25.5 + i * 17}">${esc(l)}</text>`).join('');
  return `<g class="edge k-${e.k}${e.bg ? ' bg' : ''}" data-ref="${e.id}" tabindex="0" role="button"
      aria-label="${esc(nameOf(e.from) + ' — ' + e.en + ' — ' + nameOf(e.to))}">
    <path class="hit" d="${e.d}"/>
    <path class="line" d="${e.d}" marker-end="url(#ah-${e.k})"/>
    <rect class="pill" data-pill="0" x="${e.lx}" y="${e.ly - 11.5}" width="0" height="23" rx="11.5"/>
    <text class="verb" data-of="0" x="${e.lx}" y="${e.ly + 4.5}">${esc(label)}</text>${subs}
  </g>`;
}

/* Text is measured once it is in the document: names that would overflow
   their box are condensed to fit, and every label pill hugs its own text.
   It runs again when the self-hosted face arrives, since a first visit
   measures the fallback font. */
function fit(svg) {
  svg.querySelectorAll('text[data-fit]').forEach(t => {
    t.removeAttribute('textLength'); t.removeAttribute('lengthAdjust');
    const max = +t.dataset.fit, len = t.getComputedTextLength();
    if (len > max) t.setAttribute('textLength', max), t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  });
  svg.querySelectorAll('.edge').forEach(g => {
    g.querySelectorAll('text[data-of]').forEach(t => {
      const pill = g.querySelector(`rect[data-pill="${t.dataset.of}"]`);
      const w = t.getComputedTextLength() + (t.classList.contains('verb') ? 22 : 12);
      pill.setAttribute('width', w);
      pill.setAttribute('x', +t.getAttribute('x') - w / 2);
    });
  });
}

function draw() {
  S = stateInfo(land);
  NODES = nodes(S);
  EDGES = edges(S).filter(e => P.bg || !e.bg);
  NI = new Map(NODES.map(n => [n.id, n]));
  const marker = k => `<marker id="ah-${k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" class="ah k-${k}"/></marker>`;
  const cols = COLS.map(c => `<g class="col" data-ref="${c.id}" tabindex="0" role="button" aria-label="${esc(c.en)}">
      <rect x="${c.x}" y="${COL_Y}" width="${c.w}" height="${COL_H}" rx="16"/>
      <text x="${c.x + c.w / 2}" y="${COL_Y + 28}">${esc(short(c.en))}</text></g>`).join('');
  const L = LEGIS;
  const legis = `<g class="legis" data-ref="legis" tabindex="0" role="button" aria-label="${esc(L.en)}">
      <rect x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="16"/>
      <text x="${L.x + L.w - 14}" y="${L.y + L.h - 10}" text-anchor="end">Federal legislature — passes federal law</text></g>`;
  const groups = NODES.filter(n => n.group).map(nodeSVG).join('');
  const boxes = NODES.filter(n => !n.group).map(nodeSVG).join('');
  const lines = EDGES.map(edgeSVG).join('');
  $('chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Chart: who elects whom">
    <defs>${['elect', 'appt', 'ctl', 'lead', 'form', 'bg'].map(marker).join('')}</defs>
    ${cols}${legis}${groups}${lines}${boxes}
  </svg>`;
  const svg = $('chart').querySelector('svg');
  fit(svg);
  document.fonts?.ready.then(() => svg.isConnected && fit(svg));
  $('qcount').textContent = countQs();
  sel && lookup(sel) ? select(sel, true) : showGuide();
}
function countQs() {
  const all = new Set();
  [...NODES, ...EDGES, LEGIS, SEP, ...COLS].forEach(x => (x.qs || []).forEach(id => all.add(id)));
  return all.size;
}

/* ---------------- hover: the English name ---------------- */
const tip = $('tip');
function lookup(id) {
  return NI.get(id) || EDGES.find(e => e.id === id) || COLS.find(c => c.id === id)
    || (id === 'legis' ? LEGIS : id === 'sep' ? SEP : null);
}
function tipHTML(x) {
  if (x.from) {
    return `<b lang="de">${esc(nameOf(x.from))} → ${esc(nameOf(x.to))}</b>
      <span>${esc(short(NI.get(x.from).en))} <i>${esc(x.en)}</i> ${esc(short(NI.get(x.to).en))}</span>
      ${x.bg ? '<em>Not asked in the catalogue — background only</em>' : ''}`;
  }
  const g = x.gl && GL.get(x.gl);
  return `<b>${esc(x.en)}</b>${g && g !== x.en ? `<span>${esc(g)}</span>` : ''}`;
}
function showTip(el, ev) {
  const x = lookup(el.dataset.ref); if (!x) return;
  tip.innerHTML = tipHTML(x);
  tip.hidden = false;
  const r = ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : (() => {
    const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top };
  })();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = Math.min(innerWidth - tw - 8, Math.max(8, r.x - tw / 2)) + 'px';
  tip.style.top = (r.y - th - 14 < 8 ? r.y + 22 : r.y - th - 14) + 'px';
  focusOn(el.dataset.ref);
}
function hideTip() { tip.hidden = true; focusOn(sel); }

/* Hovering a box lights up the arrows that touch it and fades the rest —
   that is what keeps a chart with crossing lines readable. */
const KIDS = { breg: ['bk', 'bm'], lr: ['mp', 'lm'], legis: ['bt', 'br'] };
function focusOn(id) {
  const svg = $('chart').querySelector('svg'); if (!svg) return;
  const x = id && lookup(id);
  /* Columns and the whole-catalogue lists have nothing in particular to light. */
  const on = !!x && !COLS.includes(x) && x !== SEP;
  svg.classList.toggle('focusing', on);
  if (!on) return;
  const touch = new Set([id]);
  const own = [id, ...(KIDS[id] || [])];
  EDGES.forEach(e => {
    if (e.id === id || own.includes(e.from) || own.includes(e.to)) {
      touch.add(e.id); touch.add(e.from); touch.add(e.to);
    }
  });
  (KIDS[id] || []).forEach(k => touch.add(k));
  const parent = Object.keys(KIDS).find(k => KIDS[k].includes(id));
  if (parent) touch.add(parent);
  svg.querySelectorAll('[data-ref]').forEach(g => g.classList.toggle('lit', touch.has(g.dataset.ref)));
}

/* ---------------- the panel: the questions behind it ---------------- */
let sel = null;
const panel = $('panel'), body = $('panel-body');
const wide = matchMedia('(min-width: 80rem)');
function qLabel(q) { return q.state ? `${q.state} · question ${q.num}` : `Question ${q.num}`; }
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
function qHTML(id) {
  const q = byId.get(id); if (!q) return '';
  const opts = q.options.map((o, i) => i === q.answer
    ? `<li class="ok"><span aria-hidden="true">✓</span><span class="sr">Correct: </span> <span lang="de">${esc(o)}</span></li>`
    : `<li class="no"><span aria-hidden="true">✗</span><span class="sr">Wrong: </span> <s lang="de">${esc(o)}</s></li>`).join('');
  return `<li class="q"><div class="qn">${esc(qLabel(q))}</div><p lang="de">${esc(q.q)}</p><ul>${opts}</ul></li>`;
}
function select(id, quiet) {
  const x = lookup(id); if (!x) return closePanel();
  sel = id;
  const isEdge = !!x.from;
  const title = isEdge ? `${nameOf(x.from)} → ${nameOf(x.to)}` : (Array.isArray(x.de) ? nameOf(id) : x.de);
  const en = isEdge ? `${short(NI.get(x.from).en)} → ${short(NI.get(x.to).en)}` : x.en;
  const g = !isEdge && x.gl && GL.get(x.gl);
  const br = !isEdge && x.b && BRANCH[x.b];
  const qs = (x.qs || []).filter(i => byId.get(i) && !byId.get(i).img);
  body.innerHTML = `
    <h2 lang="de" tabindex="-1">${esc(title)}</h2>
    <p class="en">${esc(en)}</p>
    ${g && g !== x.en ? `<p class="gloss">${esc(g)}</p>` : ''}
    ${isEdge ? `<p class="verbline k-${x.k}"><b lang="de">${esc(x.de)}</b> · ${esc(x.en)}${x.sub ? `<br><span>${esc(x.sub.join(' · '))}</span>` : ''}</p>` : ''}
    ${br && x.b !== 'volk' ? `<p class="branch b-${x.b}"><b lang="de">${esc(br.de)}</b> · ${esc(br.en)}</p>` : ''}
    ${x.note ? `<div class="bgnote"><b>${x.bg ? 'Not asked in the catalogue' : 'For context, not asked'}</b>
      <p>${esc(x.noteEn)}</p></div>` : ''}
    ${qs.length ? `<h3>In the catalogue · ${count(qs.length, 'question')}</h3><ol class="qs">${qs.map(qHTML).join('')}</ol>`
      : x.bg ? '' : '<p class="none">No question for this state.</p>'}`;
  openPanel(quiet);
  focusOn(id);
  $('chart').querySelectorAll('[data-ref]').forEach(g => {
    g.classList.toggle('sel', g.dataset.ref === id);
    g.setAttribute('aria-expanded', String(g.dataset.ref === id));
  });
}
/* With nothing selected a wide screen shows how to read the chart and the
   traps the wrong answers are built around; a narrow one shows nothing. */
function showGuide() {
  sel = null;
  body.innerHTML = `
    <h2>How to read the chart</h2>
    <ol class="guide">
      <li><b>Read it bottom up.</b> Every election starts with the people at the bottom; follow the arrows upward.</li>
      <li><b>Point</b> at a box or arrow for its full English name. <b>Click or tap</b> it for the catalogue questions behind it.</li>
      <li><b>Colour is the branch.</b> Green boxes make laws (<span lang="de">Legislative</span>), gold ones carry them out (<span lang="de">Exekutive</span>), purple is the court (<span lang="de">Judikative</span>).</li>
    </ol>
    <h3>Common traps</h3>
    <ul class="traps">${TRAPS.map(t => `<li><button type="button" data-go="${t.ref}">
      <span>${esc(t.en)}</span><em>${t.qs.length === 1 ? 'Question' : 'Questions'} ${t.qs.join(', ')}</em></button></li>`).join('')}</ul>`;
  $('chart').querySelectorAll('.sel').forEach(g => g.classList.remove('sel'));
  $('chart').querySelectorAll('[aria-expanded]').forEach(g => g.setAttribute('aria-expanded', 'false'));
  focusOn(null);
  if (wide.matches) openPanel(true); else hidePanel();
}
function openPanel(quiet) {
  document.body.classList.add('panel-open');
  document.body.classList.toggle('has-sel', !!sel);
  panel.hidden = false;
  if (!quiet) panel.scrollTop = 0;
}
function hidePanel() {
  document.body.classList.remove('panel-open', 'has-sel');
  panel.hidden = true;
}
function closePanel() { showGuide(); }

/* ---------------- wiring ---------------- */
const chart = $('chart');
/* The pointer that pressed decides: a tap opens, and a mouse click on what is
   already open closes it again. */
let lastPointer = 'mouse';
chart.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });
chart.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch') return;
  const g = e.target.closest('[data-ref]'); if (g) showTip(g, e);
});
chart.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' || tip.hidden) return;
  const g = e.target.closest('[data-ref]'); if (g) showTip(g, e);
});
chart.addEventListener('pointerout', e => {
  const g = e.target.closest('[data-ref]');
  if (g && !g.contains(e.relatedTarget)) hideTip();
});
chart.addEventListener('focusin', e => { const g = e.target.closest('[data-ref]'); if (g) showTip(g); });
chart.addEventListener('focusout', hideTip);
chart.addEventListener('click', e => {
  const g = e.target.closest('[data-ref]');
  hideTip();
  if (!g) return closePanel();
  if (sel === g.dataset.ref && lastPointer !== 'touch') return closePanel();
  select(g.dataset.ref);
});
/* From the keyboard, opening something moves focus into the panel so it is
   read out, and closing it puts focus back where it came from. */
let trigger = null;
function selectAndFocus(id, from) {
  trigger = from;
  hideTip();
  select(id);
  body.querySelector('h2')?.focus();
}
chart.addEventListener('keydown', e => {
  const g = e.target.closest('[data-ref]');
  if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectAndFocus(g.dataset.ref, g); }
});
$('panel-close').onclick = () => {
  const back = trigger?.isConnected ? trigger : sel && chart.querySelector(`[data-ref="${sel}"]`);
  closePanel();
  trigger = null;
  back?.focus();
};
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!tip.hidden) return hideTip();
  if (sel) $('panel-close').onclick();
});
body.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  chart.querySelector(`[data-ref="${b.dataset.go}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  selectAndFocus(b.dataset.go, null);
});
$('sep').onclick = e => selectAndFocus('sep', e.currentTarget);
wide.addEventListener('change', () => { if (!sel) showGuide(); });

const landSel = $('land');
landSel.innerHTML = DATA.meta.states.map(s => `<option${s === land ? ' selected' : ''}>${esc(s)}</option>`).join('');
landSel.onchange = () => {
  land = P.land = landSel.value;
  write('ebt.org', P);
  draw();
};
function sw(id, key) {
  const el = $(id);
  el.setAttribute('aria-checked', String(P[key]));
  const flip = () => { P[key] = !P[key]; el.setAttribute('aria-checked', String(P[key])); write('ebt.org', P); draw(); };
  el.onclick = flip;
  el.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } };
}
sw('t-bg', 'bg');

draw();
/* When the chart is wider than the screen, open on the federal column — the
   one with the most in it — rather than on Europa's single box. */
if (chart.scrollWidth > chart.clientWidth) chart.scrollLeft = 170 * chart.scrollWidth / W;
