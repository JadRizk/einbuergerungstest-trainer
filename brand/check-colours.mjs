#!/usr/bin/env node
/* Pin the hex that platform metadata duplicates.
 *
 * The manifest and <meta name="theme-color"> are read by the OS and the
 * browser chrome, not by the page, so neither can resolve var(--paper). Each
 * therefore carries a copy of a value that really lives in app.css. A copy is
 * a fact to pin, not a habit to remember -- this asserts they still agree.
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

const css      = read('app.css');
const html     = read('index.html');
const manifest = JSON.parse(read('manifest.json'));
const palette  = read('brand/PALETTE.md');

const token = name => {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`app.css has no --${name}`);
  return m[1].toUpperCase();
};
const meta = name => {
  const m = html.match(new RegExp(`<meta name="${name}" content="(#[0-9A-Fa-f]{6})"`));
  if (!m) throw new Error(`index.html has no <meta name="${name}">`);
  return m[1].toUpperCase();
};

const checks = [
  ['theme-color  ↔ --paper',            meta('theme-color'),          token('paper')],
  ['manifest theme_color ↔ --paper',    manifest.theme_color.toUpperCase(),      token('paper')],
  ['manifest background_color ↔ --paper', manifest.background_color.toUpperCase(), token('paper')],
];

// every hex PALETTE.md states for a token must still be that token's value
for (const [, name, hex] of palette.matchAll(/`--(\w+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`/g)) {
  let actual;
  try { actual = token(name); } catch { continue; }   // documented, not in :root
  checks.push([`PALETTE.md --${name}`, hex.toUpperCase(), actual]);
}

let bad = 0;
for (const [label, got, want] of checks) {
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(38)} ${got}${ok ? '' : `  != ${want}`}`);
}
console.log(`\n${checks.length - bad} pass · ${bad} fail`);
process.exit(bad ? 1 : 0);
