#!/usr/bin/env node
/* Pin every colour that exists in more than one place.
 *
 * The manifest and <meta name="theme-color"> are read by the OS and the
 * browser chrome, not by the page, so neither can resolve var(--paper). Each
 * therefore carries a copy of a value that really lives in app.css. The dark
 * theme is written twice per stylesheet (system setting, explicit choice),
 * organigramm.css repeats app.css's tokens, and PALETTE.md states all of them.
 * A copy is a fact to pin, not a habit to remember -- this asserts they agree.
 *
 *   node brand/check-colours.mjs
 *
 * Zero dependencies and no build step, to match the rest of the project.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');

const manifest = JSON.parse(read('manifest.json'));
const palette  = read('brand/PALETTE.md');

const LIGHT    = ':root{';
const DARK_SYS = ':root:not([data-theme="light"]){';
const DARK_SET = ':root[data-theme="dark"]{';

// the text between a selector's brace and its matching close
const block = (css, file, sel) => {
  const at = css.indexOf(sel);
  if (at < 0) throw new Error(`${file} has no ${sel}`);
  let depth = 1, i = at + sel.length;
  for (const start = i; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && !--depth) return css.slice(start, i);
  }
  throw new Error(`${file}: ${sel} is never closed`);
};
const hexes = text => Object.fromEntries(
  [...text.matchAll(/--([\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g)].map(([, n, h]) => [n, h.toUpperCase()]));
const bare = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');

const sheets = Object.fromEntries(['app.css', 'organigramm.css'].map(file => {
  const css = read(file);
  return [file, { css, light: hexes(block(css, file, LIGHT)), dark: hexes(block(css, file, DARK_SYS)) }];
}));
const app = sheets['app.css'];

const checks = [];
const pin = (label, got, want) => checks.push([label, got, want]);

for (const page of ['index.html', 'organigramm.html']) {
  const html = read(page);
  for (const [scheme, want] of [['light', app.light.paper], ['dark', app.dark.paper]]) {
    const m = html.match(new RegExp(
      `<meta name="theme-color" content="(#[0-9A-Fa-f]{6})" media="\\(prefers-color-scheme: ${scheme}\\)">`));
    pin(`${page} theme-color ${scheme} ↔ --paper`, m ? m[1].toUpperCase() : 'missing', want);
  }
}
pin('manifest theme_color ↔ --paper',       manifest.theme_color.toUpperCase(),      app.light.paper);
pin('manifest background_color ↔ --paper',  manifest.background_color.toUpperCase(), app.light.paper);

for (const [file, s] of Object.entries(sheets)) {
  // the two dark copies must be the same block, not merely the same colours
  const same = bare(block(s.css, file, DARK_SYS)) === bare(block(s.css, file, DARK_SET));
  pin(`${file} dark: system copy ↔ chosen copy`, same ? 'same' : 'differ', 'same');
  // no colour exists in one theme and not the other
  for (const name of Object.keys(s.dark))
    pin(`${file} --${name} has a light value`, name in s.light ? 'yes' : 'no', 'yes');
  for (const name of Object.keys(s.light))
    pin(`${file} --${name} has a dark value`, name in s.dark ? 'yes' : 'no', 'yes');
}

// organigramm.css repeats app.css's tokens; the repeat must not drift
const org = sheets['organigramm.css'];
for (const theme of ['light', 'dark'])
  for (const [name, hex] of Object.entries(org[theme]))
    if (name in app[theme]) pin(`organigramm --${name} ${theme} ↔ app.css`, hex, app[theme][name]);

// every hex PALETTE.md states for a token must still be that token's value:
// the first hex after the name is light, a second one directly after it dark
const value = (theme, name) => app[theme][name] ?? org[theme][name];
for (const [, name, light, dark] of palette.matchAll(
    /`--([\w-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`(?:\s*\|\s*`(#[0-9A-Fa-f]{6})`)?/g)) {
  if (!value('light', name)) continue;                 // documented, not in :root
  pin(`PALETTE.md --${name}`, light.toUpperCase(), value('light', name));
  if (dark) pin(`PALETTE.md --${name} dark`, dark.toUpperCase(), value('dark', name));
}

let bad = 0;
for (const [label, got, want] of checks) {
  const ok = got === want;
  if (!ok) bad++;
  if (!ok || process.argv.includes('-v'))
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${got}${ok ? '' : `  != ${want}`}`);
}
console.log(`${checks.length - bad} pass · ${bad} fail${bad ? '' : '   (-v lists every check)'}`);
process.exit(bad ? 1 : 0);
