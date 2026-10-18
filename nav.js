/* The menu, the same on every page: Practise, Learn, and Settings folded away.

   The Practice page writes most of its menu into index.html, because most of
   it is Practice's own controls, and takes the shared parts from here: the
   Learn section, the remembered fold, and the drawer itself. The chart and
   the timeline get the whole menu from mountNav(), always as a drawer, so
   they keep their full width on a wide screen. */

import { read, write } from './util.js';

const PAGES = [
  { id: 'chart', href: 'organigramm.html', name: 'Who elects whom', em: 'The state as a chart, built from the catalogue' },
  { id: 'timeline', href: 'timeline.html', name: 'How it happened', em: 'The history questions on one timeline' },
];
const GLOSSARY = 'Glossary<em>361 German terms explained in English</em>';

/* `here` is 'practice', 'chart' or 'timeline'. The glossary is a sheet on the
   Practice page, so from anywhere else it is a link that opens it there. */
export function learnHTML(here) {
  const glos = here === 'practice'
    ? `<button class="rowbtn" id="glosBtn" type="button">${GLOSSARY}</button>`
    : `<a class="rowbtn" href="./#/glossary">${GLOSSARY}</a>`;
  return `<h3>Learn</h3>${glos}${PAGES.map(p =>
    `<a class="rowbtn" href="${p.href}"${p.id === here ? ' aria-current="page"' : ''}>${p.name}<em>${p.em}</em></a>`).join('')}`;
}

/* Settings start folded, and from then on stay as you left them, on every
   page: the choice is the menu's own, under its own key. */
export function remember(fold) {
  fold.open = !!(read('ebt.nav') || {}).settings;
  fold.addEventListener('toggle', () => write('ebt.nav', { ...(read('ebt.nav') || {}), settings: fold.open }));
}

/* ---------------- the drawer ----------------
   Under `rail` (a media query) the page parks the menu as a permanent rail
   and the drawer goes quiet; the burger then does whatever onRail says. With
   no `rail` it is a drawer at every width. Closed, the drawer is inert, so
   Tab does not walk into a menu that is off the screen. */
const STOPS = 'button,select,summary,a[href],input,[tabindex]:not([tabindex="-1"])';
export function drawer({ rail = null, onRail = () => {} } = {}) {
  const body = document.body, nav = document.getElementById('nav');
  const scrim = document.getElementById('scrim'), burger = document.getElementById('burger');
  const mq = rail && matchMedia(rail);
  const railed = () => !!mq?.matches;
  const isOpen = () => body.classList.contains('nav-open');
  const sync = () => { nav.inert = !railed() && !isOpen(); };
  let back = null;                       // where focus came from

  function open() {
    if (railed()) return;
    back = document.activeElement;
    body.classList.add('nav-open'); scrim.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    /* Only the drawer is a modal. Where this same element is a permanent
       rail, the dialog role is put on and taken off rather than sitting in
       the markup telling a screen reader the rail is a dialog. */
    nav.setAttribute('role', 'dialog');
    nav.setAttribute('aria-modal', 'true');
    sync();
    nav.querySelector('.navclose')?.focus();
  }
  function close() {
    const was = isOpen();
    body.classList.remove('nav-open'); scrim.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    nav.removeAttribute('role'); nav.removeAttribute('aria-modal');
    sync();
    /* Put focus back where it started instead of dropping it on <body>, which
       sends a keyboard or screen-reader user to the top of the document. */
    if (was) ((back && document.contains(back)) ? back : burger).focus();
    back = null;
  }

  burger.addEventListener('click', () => railed() ? onRail() : isOpen() ? close() : open());
  nav.querySelector('.navclose').addEventListener('click', close);
  scrim.addEventListener('click', close);
  mq?.addEventListener('change', sync);
  sync();

  /* While the drawer is open, Tab must not walk out of it into the page
     behind. Content inside a collapsed <details> still reports an
     offsetParent in Chrome, so it is excluded by hand -- otherwise the last
     stop is computed inside a folded section and focus leaks out. */
  addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !isOpen()) return;
    const f = [...nav.querySelectorAll(STOPS)].filter(el =>
      !el.disabled && el.offsetParent !== null &&
      !(el.tagName !== 'SUMMARY' && el.closest('details:not([open])')));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    else if (!nav.contains(at)) { e.preventDefault(); first.focus(); }
  });

  return { open, close, isOpen };
}

/* ---------------- the menu on the chart and the timeline ----------------
   Practise links back into the app; Settings holds only Appearance, the one
   setting that applies here. The theme is saved into the app's own blob,
   where theme.js and app.js read it. That blob is otherwise only read from
   these pages: a Practice tab left open elsewhere would put its own theme
   back on its next save, which is the choice made there anyway. */
const THEMES = ['system', 'light', 'dark'];
const cap = s => s[0].toUpperCase() + s.slice(1);

export function mountNav(here) {
  document.querySelector('header').insertAdjacentHTML('afterend', `
<button class="scrim" id="scrim" type="button" tabindex="-1" aria-label="Close the menu" hidden></button>
<nav class="nav" id="nav" aria-label="Main menu">
  <div class="nav-head">
    <span class="nav-title">Einbürgerungstest</span>
    <button class="navclose" type="button" aria-label="Close the menu">✕</button>
  </div>
  <div class="nav-body">
    <div class="nav-sec">
      <h3>Practise</h3>
      <div class="modes"><a href="./#/practice">Practice</a><a href="./#/browse">Browse</a></div>
      <a class="bigbtn" href="./#/exam">Sit a mock exam<em>33 questions · 60 minutes · 17 to pass</em></a>
    </div>
    <div class="nav-sec">${learnHTML(here)}</div>
    <details class="nav-fold" id="settings"><summary>Settings</summary>
      <div class="nav-sec">
        <h3>Appearance</h3>
        <div class="modes" role="group" aria-label="Appearance">${THEMES.map(t =>
          `<button type="button" data-theme="${t}" aria-pressed="false">${cap(t)}</button>`).join('')}</div>
      </div>
    </details>
  </div>
</nav>`);

  const { close, isOpen } = drawer();
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) close(); });
  remember(document.getElementById('settings'));

  const btns = [...document.querySelectorAll('#nav [data-theme]')];
  const paint = () => {
    const now = (read('ebt.v2') || {}).theme || 'system';
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === now)));
  };
  btns.forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.theme;
    write('ebt.v2', { ...(read('ebt.v2') || {}), theme: t });
    window.theme?.set(t);
    paint();
  }));
  paint();
}
