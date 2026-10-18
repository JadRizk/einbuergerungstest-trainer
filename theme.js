/* The theme: System, Light or Dark, applied before the first paint.
   A classic script loaded from <head>, not a module: a module runs after the
   body is drawn, and someone who chose Light on a dark phone would see the
   page flash dark first. It reads the choice synchronously from localStorage
   for the same reason, where app.js saves it with the other settings under
   its KEY, 'ebt.v2'. If the app's store is window.storage instead, nothing is
   found here and app.js applies the choice once its async load() returns.

   data-theme on <html> always names the scheme in force, System resolved, so
   each stylesheet needs a single dark block keyed on it. Without JavaScript
   the page is light, and so is the whole app, which cannot run without it. */
(() => {
  const CHOICES = ['system', 'light', 'dark'];
  const root    = document.documentElement;
  const system  = matchMedia('(prefers-color-scheme: dark)');
  // the theme-color metas as written, one per scheme; the browser picks by media
  const metas   = [...document.querySelectorAll('meta[name="theme-color"]')];
  for (const m of metas) m.dataset.own = m.content;

  function savedChoice() {
    try { return JSON.parse(localStorage.getItem('ebt.v2'))?.theme; }
    catch (e) { return null; }   // blocked or private storage: nothing was saved
  }
  const saved = savedChoice();
  let choice = CHOICES.includes(saved) ? saved : 'system';

  const scheme = () => choice === 'system' ? (system.matches ? 'dark' : 'light') : choice;

  function apply() {
    root.dataset.theme = scheme();
    // The browser chooses a theme-color by the system scheme, not by ours, so
    // a choice pins every meta to its own scheme's colour.
    const pinned = choice !== 'system'
      && metas.find(m => m.media === `(prefers-color-scheme: ${choice})`)?.dataset.own;
    for (const m of metas) m.content = pinned || m.dataset.own;
  }

  // Every surface changes colour at once; left alone, each would run its own
  // background transition from the old theme. Layout is flushed while
  // .theming turns transitions off, so the new colours land without one. A
  // timer, not a frame, lifts it: frames never come in a background tab.
  function quietly(change) {
    root.classList.add('theming');
    change();
    void document.body.offsetWidth;
    setTimeout(() => root.classList.remove('theming'));
  }

  apply();
  // the system switching (on a timer at sunset, say) only matters under System
  system.addEventListener?.('change', () => { if (choice === 'system') quietly(apply); });

  window.theme = {
    set(next) {
      if (next === choice || !CHOICES.includes(next)) return;
      choice = next;
      quietly(apply);
    }
  };
})();
