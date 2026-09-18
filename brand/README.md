# brand/

The identity of the Einbürgerungstest trainer, and the script that rebuilds
every asset from it. Direction was recorded rather than invented: the palette
and the typeface were already shipping in `app.css` — this pass measured them,
then added the position, the mark and the kit.

| File | Carries |
|---|---|
| [`BRAND.md`](BRAND.md) | Thesis, voice, typography, non-negotiables, and the mark that ships. The document a human reads. |
| [`PALETTE.md`](PALETTE.md) | Every colour with its measured ratio and the command that produced it. The document an implementation reads. |
| [`references/positioning.md`](references/positioning.md) | Category, alternatives, onliness statement, one-liner, tagline — and the surface each lives on. |
| [`assets/logo/`](assets/logo/) | The mark in five treatments, the wordmark, the lockup, and the built icons. **`mark.svg` is the one that ships.** |
| [`assets/logo/candidates/`](assets/logo/candidates/) | The four refused marks, with a line each on why. |
| [`assets/social/social-card.svg`](assets/social/social-card.svg) | 1200×630 `og:image`. The `.png` beside it is the deliverable — crawlers take raster only. |
| [`assets/social/github-card.svg`](assets/social/github-card.svg) | 1280×640, GitHub's repository social preview. Its own composition, not a crop. |
| [`assets/readme-header.svg`](assets/readme-header.svg) | The README banner. The `.png` is what GitHub serves — it cannot render an SVG with web fonts. |
| [`build.py`](build.py) | Regenerates all of the above and copies the kit into `icon/`. |
| [`check-colours.mjs`](check-colours.mjs) | Pins every hex the metadata duplicates to its token in `app.css`. |
| `../icon/` | Where the kit is installed for the app. **Built, not hand-placed.** |

There is no `references/naming.md`: the name was settled before this pass and
its two written forms are recorded in `positioning.md` §5.

## Which mark ships

**`assets/logo/mark.svg`** — the gloss-E. A letterform E whose base arm overruns
the other two into the underline the app draws beneath a glossed term, so the
letter names the product and the overrun names what the product does to it. It
survives 16px as a silhouette, which is the test the other four failed.

The refused four stay in `assets/logo/candidates/`:

- `mark-grid.svg` — the progress map as a 3×3 grid. Vanished at 16px.
- `mark-umlaut.svg` — a bold Ü. Legible, but says only "German", and the dots
  close on the bowl at 16px.
- `mark-tick.svg` — a white check on an accent tile. The most legible of all
  five, refused because `BRAND.md` forbids celebration and a green tick is the
  quiz-app shelf's default.
- `mark-stamp.svg` — an official stamp frame. Mud at 16px, and it edges toward
  implying the official endorsement the About text disclaims.

**Small spaces (≤ 48px, or any circular slot) carry `mark-small.svg`** — the
mark reversed on a filled accent tile — never the plain mark and never the
lockup. Below 32px the plain mark thins out and the overrun closes up.

## Reproducing the numbers

Every ratio in `PALETTE.md` comes from these. They need only Node.

```bash
VP=~/.claude/skills/design-direction/scripts/validate-palette.mjs
node $VP accent "#0B6357" --ground "#EDF0EF"
node $VP text   "#152227,#4F6167,#5C6E74,#788584,#0B6357,#8A5A12,#0F5132,#B3332B" --ground "#EDF0EF"
node $VP status "warning:#8A5A12,critical:#B3332B,success:#0F5132" --accent "#0B6357" --ground "#EDF0EF"
# the one place colour stands alone — the progress map's correct/wrong cells
node $VP status "success:#0F5132,critical:#D9534F" --accent "#0B6357" --ground "#EDF0EF"
```

## Regenerating the rasters

SVG is the source; PNG is build output, committed because the platforms take
raster only. Re-run after **any** SVG edit, in the same commit.

```bash
python3 brand/build.py              # SVG sources, PNG/ICO rasters, then install into icon/
python3 brand/build.py --svg        # sources only (no resvg needed)
python3 brand/build.py --png-only   # rasters from the committed SVGs (no font tooling needed)
```

Change the mark's geometry in `BARS` at the top of `build.py`, run one command,
and every favicon, icon and card follows.

**One asset the build cannot install for you.** `assets/social/github-card.png`
is the repository's social preview, and GitHub only accepts it through the web
UI — *Settings → General → Social preview → Upload an image*. Everything else
lands in `icon/` automatically. If that upload is skipped, links to the repo
fall back to GitHub's generated card and the brand never appears.

**Dependencies.** `resvg` (`brew install resvg`) for rasterising — ImageMagick
is *not* a substitute, because without `rsvg-convert` it silently falls back to
its own SVG renderer. `fonttools`, `brotli` and `uharfbuzz` (pip) are needed
only to re-outline the wordmark from `font/archivo-latin-var.woff2`; the
outlined SVGs are committed, so `--png-only` runs without them. ImageMagick is
used on PNG only, to strip alpha.

**One rule that is easy to miss:** the service worker serves `icon/` cache-first.
The kit was replaced in place under names that already existed, so any future
re-cut of the mark must bump `VERSION` in `sw.js` in the same commit or every
existing install keeps the old artwork forever.

## Checking the kit

```bash
node ~/.claude/skills/brand-identity/scripts/check-kit.mjs \
  --dir brand --public . --html index.html --manifest manifest.json
node brand/check-colours.mjs
```

Last run: 2026-09-18 — **31 pass · 0 advisory · 0 fail**, and **19 pass · 0 fail**.

## What is not decided

- **Nobody with a colour vision deficiency has seen this.** Every CVD number in
  `PALETTE.md` is simulated. The progress map rests on a single measurement
  (ΔE 12.8 between correct and wrong under protanopia) and deserves one real
  reader. That is the highest-value open item here.
- **The accent is below the validator's chroma floor** (C 0.078 against 0.1) and
  was inherited rather than chosen against alternatives. It is defended on
  thesis grounds in `PALETTE.md`; no saturated candidate was drawn and compared.
  What would settle it: draw one and read both marks at 16px.
- **The type and radius scales are open** — 25 and 14 distinct values. Closing
  either is a stylesheet sweep, deliberately out of scope for a brand pass.
  `PALETTE.md` proposes a closed six-step type scale; nothing consumes it yet.
- **The crawlers have not seen the card.** `check-kit.mjs` reads files, not the
  served page. After the next deploy, put the URL through X's card validator and
  LinkedIn's post inspector once — their caches are long, and a wrong first card
  is a wrong card for a week.
- **No `email/avatar.png` was produced.** The kit's file list includes one for a
  sending address; this project sends no email. If that changes, it is one
  render of `mark-small.svg` at 512.
