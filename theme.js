/* The theme: System, Light or Dark, applied before the first paint.
   A classic script loaded from <head>, not a module: a module runs after the
   body is drawn, and someone who chose Light on a dark phone would see the
   page flash dark first. It reads the choice synchronously from localStorage
   for the same reason, where app.js saves it with the other settings under
   its KEY, 'ebt.v2'. If the app's store is window.storage instead, nothing is
   found here and app.js applies the choice once its async load() returns.

   The colours themselves live in the stylesheets: a choice only sets
   data-theme on <html>, which the dark blocks there key on. */
(() => {
  const root  = document.documentElement;
  // the theme-color metas as written, one per scheme; the browser picks by media
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  for (const m of metas) m.dataset.own = m.content;

  function apply(choice) {
    const pinned = choice === 'light' || choice === 'dark';
    if (pinned) root.dataset.theme = choice; else delete root.dataset.theme;
    // The browser chooses a theme-color by the system scheme, not by ours, so
    // a choice pins every meta to its own scheme's colour.
    const own = pinned && metas.find(m => m.media.includes(choice))?.dataset.own;
    for (const m of metas) m.content = own || m.dataset.own;
  }

  // Every surface changes colour at once; left alone, each would run its own
  // background transition from the old theme. Styles are committed while
  // .theming turns transitions off, then it is lifted.
  function quietly(change) {
    root.classList.add('theming');
    change();
    getComputedStyle(root).color;
    requestAnimationFrame(() => root.classList.remove('theming'));
  }

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('ebt.v2'))?.theme; } catch (e) {}
  apply(saved);

  // the system switching (on a timer at sunset, say) repaints everything too
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => quietly(() => {}));

  window.theme = { set: choice => quietly(() => apply(choice)) };
})();
