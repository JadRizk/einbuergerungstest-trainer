# Einbürgerungstest trainer — palette

Every number here is reproducible. The command that produced each table is
printed beside it; re-run it rather than trusting the table.

Validator: `~/.claude/skills/design-direction/scripts/validate-palette.mjs`

This palette was **not designed by this pass** — it was already shipping in
`app.css`. What this pass did was measure it. Two findings changed nothing and
one is recorded as open; see *Unverified*.

The dark theme **was** designed, in a second pass (18 October 2026), and every
dark value below was measured the same way. Its rule: the same paper with the
light off. Same hues, same low chroma, no new colour — only lightness moves.

---

## Ground

| | Light | Dark | Role |
|---|---|---|---|
| Canvas | `#EDF0EF` | `#10191B` | Page ground — every ratio below is measured against this |
| Surface | `#FFFFFF` | `#192426` | Cards, the question itself, sheets |
| Sunk | `#F1F4F4` | `#151E21` | Inset wells, unanswered map cells |

Two themes. Light is the default; dark follows the system setting, and a
System / Light / Dark choice in the drawer overrides it.

The dark canvas is OKLCH L 0.205 on hue 215° at C 0.014 — the green-cast
grey of `--ink`, not black. In both themes a card is **lighter** than the
canvas, so "raised" means the same thing in either.

---

## The accent, and what it forces

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs accent "#0B6357" --ground "#EDF0EF"
```

| | |
|---|---|
| Accent | `#0B6357` |
| OKLCH | L 0.449 · C 0.078 · H 180.4° |
| Contrast vs canvas | 6.24:1 |
| Accent-ink | `#FFFFFF` at 7.15:1 |

**Chroma sits below the signal floor.** C 0.078 against a 0.1 floor: the
validator classes this as achromatic and warns that a grey cannot be a signal.
**Kept deliberately.** The thesis asks for the register of official stationery,
and a saturated teal reads as a consumer app. The cost is real and is paid
twice — once in the status separations below, and once in the mark, where at
16px the accent reads as a near-black green. The mark is therefore drawn to work
as a *silhouette*, not as a colour.

**A · Series.** Outside the L 0.48–0.67 categorical band at L 0.449. The accent
is not a series colour. The system carries no charts, so this costs nothing.

**B · Status hues.** Blocked bands (red-green collapse, ~8% of males):
**H 0–130°**, **H 145–235°**, **H 350–355°**. Advisory band (tritan only,
~0.01%): **H 135–140°**. Because the accent is low-chroma, almost every
conventional status hue lands in a blocked band — red at ΔE 8.3 (protan), green
at ΔE 11.1 (deutan). Only blue, violet and magenta are open, and none of them
means *correct* or *wrong* to a reader.

**C · Success.** Green is **not** available against this accent by the
validator's rule — ΔE 11.1 under deuteranopia, below the 12 floor. The system
ships green anyway, and the mitigation is structural rather than chromatic:
**every state carries a glyph.** See *Status*.

**D · Accent-ink.** White, at 7.15:1.

### The dark accent

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs accent "#6AB5A6" --ground "#10191B"
```

| | |
|---|---|
| Accent | `#6AB5A6` |
| OKLCH | L 0.720 · C 0.079 · H 179.7° |
| Contrast vs canvas | 7.45:1 |
| Accent-ink | `#10191B` (the dark canvas) at 7.45:1 |

The same teal with the lightness lifted: hue and chroma match `#0B6357` to
within a degree and 0.001. It is flagged achromatic for the same reason and
kept for the same reason.

**A · Series.** L 0.720, outside the band. Still not a series colour.

**B · Status hues.** Blocked: **H 0–15°**, **H 335–355°**. Advisory (tritan):
**H 230–255°**. Lifting the accent opens far more of the wheel than in light.

**C · Success.** Green **is** available on dark by the validator's rule (worst
ΔE 17.3, tritan). The glyphs stay regardless: one rule for both themes.

**D · Accent-ink.** Dark, not white. The dark canvas colour, at 7.45:1.

---

## Primitives

Named by appearance. These are the names that actually exist in `tokens.css`
and `app.css`. **One token per row** — `brand/check-colours.mjs` pairs each
name with the hex **immediately** beside it and asserts it still matches the
stylesheet, so a combined row silently breaks the pin. That is why *Light* is
the first column: it is the value the check pins. The *Dark* column is not pinned yet — see *Unverified*.

`--picked` and `--gloss` do not exist yet; they name two colours `app.css`
hard-codes today (`#E3EEEB` three times, `#C9E4D6` once), which dark mode has
to be able to change. The check skips a name `:root` does not have.

| Token | Light | Dark | Named for |
|---|---|---|---|
| `--paper` | `#EDF0EF` | `#10191B` | the page |
| `--card` | `#FFFFFF` | `#192426` | raised surfaces |
| `--sunk` | `#F1F4F4` | `#151E21` | wells |
| `--ink` | `#152227` | `#E4EBEB` | the text, green-cast |
| `--muted` | `#4F6167` | `#ABBBBE` | body grey |
| `--dim` | `#5C6E74` | `#98A8AB` | rejected answers |
| `--edge` | `#788584` | `#717D7E` | control borders |
| `--rule` | `#DBE2E1` | `#313A3B` | decorative divider |
| `--soft` | `#E7EBEA` | `#273031` | decorative divider, quieter |
| `--accent` | `#0B6357` | `#6AB5A6` | the teal |
| `--gold` | `#8A5A12` | `#D6A866` | regional marker |
| `--goldbg` | `#F8F0DC` | `#352917` | regional, as a ground |
| `--ok` | `#0F5132` | `#7FCB9E` | correct |
| `--okbg` | `#DEEDE4` | `#1B3125` | correct, as a ground |
| `--no` | `#B3332B` | `#EB827B` | wrong |
| `--nobg` | `#FAE4E2` | `#3F2220` | wrong, as a ground |
| `--cellno1` | `#F4B4AE` | `#D0524C` | map-only wrong once: the lightest red, next to even |
| `--cellno2` | `#D9534F` | `#972622` | map-only wrong twice |
| `--cellno3` | `#9E2B26` | `#5A2522` | map-only wrong three or more: the darkest red |
| `--celleven` | `#828D9F` | `#5F6A7B` | map-only even: right since a miss, or level |
| `--cellok1` | `#ABE0C0` | `#214D34` | map-only right, faintest |
| `--cellok2` | `#72B68F` | `#367854` | map-only right, faint |
| `--cellok3` | `#3E815D` | `#56A276` | map-only right, strong |
| `--tipbg` | `#152227` | `#2F3A3D` | tooltip ground |
| `--tipink` | `#F2F5F4` | `#E4EBEB` | tooltip text |
| `--tipline` | `#152227` | `#717D7E` | tooltip edge: its own ground in light, `--edge` in dark |
| `--picked` | `#E3EEEB` | `#1F3531` | a chosen answer, chip or copy button |
| `--gloss` | `#C9E4D6` | `#284B3B` | a glossed word |

*Faintest* to *strong* names how far a green sits from the page, which is the
opposite direction in each theme: light greens are faint on light paper, dark
greens are faint on dark.

---

## Roles

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  text "#152227,#4F6167,#5C6E74,#788584,#0B6357,#8A5A12,#0F5132,#B3332B" --ground "#EDF0EF"
```

| Role | Maps to | Ratio on paper | Ratio on card | Job |
|---|---|---|---|---|
| canvas | `--paper` | — | — | Page ground |
| ambient | `--rule` / `--soft` | — | — | Dividers. **Never text.** |
| line | `--edge` `#788584` | 3.34:1 | 3.83:1 | Control borders. **Never text** — verified: no `color:var(--edge)` exists |
| ink | `--ink` `#152227` | 14.19:1 | 16.28:1 | Questions, headings |
| ink-muted | `--muted` `#4F6167` | 5.65:1 | 6.49:1 | Body copy |
| ink-subtle | `--dim` `#5C6E74` | 4.65:1 | 5.33:1 | Rejected answers, metadata |
| accent | `--accent` `#0B6357` | 6.24:1 | 7.15:1 | The signal |
| accent-ink | `#FFFFFF` | 7.15:1 on accent | — | Text on the accent |
| warning | `--gold` `#8A5A12` | 5.16:1 | 5.91:1 | Regional / state questions |
| critical | `--no` `#B3332B` | 5.35:1 | 6.13:1 | Wrong answers |
| success | `--ok` `#0F5132` | 8.16:1 | 9.36:1 | Correct answers |

Every text-bearing token clears 4.5:1 on **both** grounds. The single
sub-floor token is `--edge`, which is a boundary role and is verified never to
carry text.

### Roles, dark

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  text "#E4EBEB,#ABBBBE,#98A8AB,#717D7E,#6AB5A6,#D6A866,#7FCB9E,#EB827B" --ground "#10191B"
# and again with --ground "#192426" for the card column
```

| Role | Maps to | Ratio on paper | Ratio on card |
|---|---|---|---|
| line | `--edge` `#717D7E` | 4.19:1 | 3.74:1 |
| ink | `--ink` `#E4EBEB` | 14.77:1 | 13.15:1 |
| ink-muted | `--muted` `#ABBBBE` | 8.99:1 | 8.01:1 |
| ink-subtle | `--dim` `#98A8AB` | 7.24:1 | 6.45:1 |
| accent | `--accent` `#6AB5A6` | 7.45:1 | 6.64:1 |
| accent-ink | `#10191B` | 7.45:1 on accent | — |
| warning | `--gold` `#D6A866` | 8.20:1 | 7.30:1 |
| critical | `--no` `#EB827B` | 6.81:1 | 6.06:1 |
| success | `--ok` `#7FCB9E` | 9.29:1 | 8.28:1 |

Text on the tinted grounds, each measured with `text … --ground` on the tint:

| Text | Ground | Ratio |
|---|---|---|
| `--ok` | `--okbg` `#1B3125` | 7.23:1 |
| `--no` | `--nobg` `#3F2220` | 5.48:1 |
| `--gold` | `--goldbg` `#352917` | 6.52:1 |
| `--ink` / `--accent` | `--picked` `#1F3531` | 10.78:1 / 5.44:1 |
| `--ink` | `--gloss` `#284B3B` | 8.05:1 |
| `--ink` / `--muted` | `--tipbg` `#2F3A3D` | 9.69:1 / 5.90:1 |

Every dark text token clears 6:1 on both grounds. `--edge` clears 3:1 on
paper, card and sunk (3.98:1), as a control border must.

**The tooltip is not inverted in dark.** In light it is ink-on-paper turned
over — a dark box on a light page. Turned over again it would be a near-white
box on a dark page, the brightest thing on screen for a hint. It is instead
a raised grey (`--tipbg`) with an `--edge` border (`--tipline`, which in light is
the tooltip's own ground and so invisible). The exam bar is the same strip and uses the same two tokens, so it
does not turn into a bright band across the top of a dark page.

**`--ink` fills stay inverted.** *Next*, the pressed mode button and the skip
link are `--ink` with `--paper` text, so in dark they become a light button
with dark text, 14.77:1. That is the one bright thing on a dark page, and it
is the primary action, which is the point of it.

**Question images keep a white plate.** They are scans of the official
catalogue — maps, coats of arms, ballot papers — and inverting them would
change what they show. In dark they sit on `#FFFFFF`, dimmed, as the lens
already does.

**The primary form device.** Borders, not elevation. Three tiers:

| Tier | Weight | Means |
|---|---|---|
| `--soft` / `--rule` | 1px decorative | a division inside one surface |
| `--edge` | 1px, ≥3:1 | the edge of an interactive control |
| `--ink` | 1.5–2px outline | focus and current position |

Elevation exists in exactly three places (the phone progress sheet, the drawer
scrim, the lens) and is always a soft dark shadow, never a brand colour.

**Focus.** Focus is an `outline` in `--ink` with an offset; hover is a
`border-color` change. They are different properties, so they can co-occur
without either being lost — the current map cell carries both.

Shadows barely read on the dark canvas. That costs little: borders were the
primary device already, and the three elevations keep their borders.

**Deliberately absent.** No *info* role (the accent serves), no second accent,
no chart series, and no colour that exists in only one theme.

---

## Status

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  status "warning:#8A5A12,critical:#B3332B,success:#0F5132" --accent "#0B6357" --ground "#EDF0EF"
```

| Pair | ΔE | Condition | Verdict |
|---|---|---|---|
| warning ↔ accent | 8.9 | protan | FAIL — reads as the accent |
| critical ↔ accent | 6.7 | protan | FAIL — reads as the accent |
| success ↔ accent | 6.9 | deutan | FAIL — reads as the accent |
| warning ↔ critical | 1.5 | deutan | WARN |
| warning ↔ success | 9.0 | protan | WARN |
| critical ↔ success | 2.8 | protan | WARN |

**These failures are accepted, and the mitigation is structural.** A low-chroma
accent leaves no open hue that also *means* correct or wrong, so the colours
stay and the information is carried elsewhere:

- Every answer row renders `✓` or `✗` as a glyph — `app.js:546-547`, `app.js:855`.
- Every progress-map legend entry carries its word: *Wrong … Right* around the
  scale, *not seen*, *state question*.
- A red map cell carries a diagonal slash and the even cell a short dash, the
  ✗ and = a bare square has no room for. See *The map scale* below.
- The state marker on a map cell is an inset **ring**, not a fill.

**The one place colour stands alone is the progress map**, where a cell is a
bare square with no glyph. That case was measured separately and it survives:

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  status "success:#0F5132,critical:#D9534F" --accent "#0B6357" --ground "#EDF0EF"
```

| Pair | ΔE | Condition | Verdict |
|---|---|---|---|
| correct `#0F5132` ↔ wrong `#D9534F` | **12.8** | protan | **PASS** |

This is why the map uses `--cellbad` `#D9534F` rather than `--no` `#B3332B`:
the lighter red buys a lightness gap (8.16:1 vs 3.45:1 against paper) that
survives dichromacy, so the grid reads light-vs-dark rather than green-vs-red.
The CSS comment claiming this is now **verified rather than asserted**.
`#D9534F` is a fill and never text, so its 3.45:1 is not a floor breach.

### The map scale

Each answered cell sits on one scale: three reds (`--cellno1`–`3`), an even
grey (`--celleven`), and four greens (`--cellok1`–`3`, then `--ok`). Right
answers minus wrong ones set the step. A first answer goes straight to its
colour; after that a miss forces red and the next right answer forces even,
whatever the tally. The greens sit on hue 158° at OKLCH lightness
.86 / .72 / .55 / .40 (the last is `--ok` itself).

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  status "g1:#ABE0C0,g2:#72B68F,g3:#3E815D,g4:#0F5132,bad:#D9534F" --accent "#0B6357" --ground "#EDF0EF"
```

| Pair | ΔE | Condition | Verdict |
|---|---|---|---|
| adjacent greens, worst (g1 ↔ g2) | 13.7 | protan | PASS |
| g2 ↔ wrong | 10.4 | deutan | WARN |
| g3 ↔ wrong | **3.7** | protan | **collapses** |
| g4 ↔ wrong | 12.8 | protan | PASS |

**No red clears all four greens.** A sweep of reds over hue 10–40°, lightness
.35–.85 and chroma .08–.24 found nothing better than ΔE 10.6 against the
nearest green. Any red sits somewhere inside a light-to-dark ramp, and protan
simulation puts it on one of the steps. So the map stops relying on colour
there: a red cell is slashed in `--cellmark` (`--card`), or, on the palest
red, where a light slash vanishes, in `--cellmark1` (`--cellno3`). Not-seen cells keep their `--edge`
ring, which is what separates them from the lightest green (ΔE 9.3).

The even grey has the same problem. A sweep of greys and cool tints found
nothing better than ΔE 11.1 against the nearest green in light and 9.8 in dark;
a neutral grey sits on the ramp's lightness and protan simulation strips what
little hue the greens keep. So the even cell carries a short horizontal dash
in `--card`, and its fill is free to be a quiet slate.

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  status "r1:#F4B4AE,r2:#D9534F,r3:#9E2B26,even:#828D9F" --accent "#0B6357" --ground "#EDF0EF"
```

| Pair | ΔE | Condition | Verdict |
|---|---|---|---|
| adjacent reds, worst (r2 ↔ r3) | 14.6 | protan | PASS |
| r2 ↔ even | 11.5 | deutan | WARN — the slash and dash separate them |

**Severity ordering is inverted and stays that way.** Success is 1.58× louder
than warning. In a study tool the reader is scanning for what they got *right*
as much as what they got wrong, and "correct" is the state the interface is
built to produce. Recorded as a deliberate inversion, not an oversight.

### Status, dark

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  status "warning:#D6A866,critical:#EB827B,success:#7FCB9E" --accent "#6AB5A6" --ground "#10191B"
```

| Pair | ΔE | Condition | Verdict |
|---|---|---|---|
| warning ↔ accent | 8.5 | protan | FAIL — reads as the accent |
| critical ↔ accent | 7.1 | deutan | FAIL — reads as the accent |
| success ↔ accent | 7.2 | protan | FAIL — reads as the accent |
| warning ↔ critical | 5.1 | deutan | WARN |
| warning ↔ success | 6.8 | deutan | WARN |
| critical ↔ success | 6.0 | deutan | WARN |

The same profile as light, accepted for the same reason and mitigated by the
same glyphs. Severity is inverted the same way: success 1.13× louder than
warning, warning 1.20× louder than critical.

### The map, dark

On a light page *more correct* means *darker*. On a dark page it has to mean
**brighter**, so the ramp runs the other way: faint dark green up to `--ok`,
and the wrong cell drops to a dark red so it still separates by lightness.

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  status "g1:#214D34,g2:#367854,g3:#56A276,g4:#7FCB9E,bad:#972622" --accent "#6AB5A6" --ground "#10191B"
```

| Pair | ΔE | Condition | Verdict |
|---|---|---|---|
| adjacent greens, worst (g3 ↔ g4) | 12.9 | deutan | PASS |
| g1 ↔ wrong | **3.0** | protan | **collapses** |
| g2 ↔ wrong | 7.6 | deutan | WARN |
| g3 ↔ wrong | 19.4 | deutan | PASS |
| g4 ↔ wrong | **32.1** | deutan | **PASS** |
| not seen `#151E21` ↔ g1 | 15.8 | deutan | PASS |

The reds do **not** flip. In both themes the lightest red sits next to even
and the darkest is three or more misses, so one slip reads as the mild end
on either page. Dark slashes every red in `--ink` (`--cellmark` and
`--cellmark1`), since a `--card` line is lost on a dark red.

```bash
node ~/.claude/skills/design-direction/scripts/validate-palette.mjs \
  status "r1:#D0524C,r2:#972622,r3:#5A2522,even:#5F6A7B" --accent "#6AB5A6" --ground "#10191B"
```

| Pair | ΔE | Condition | Verdict |
|---|---|---|---|
| r1 ↔ even | 7.6 | protan | WARN — slash against dash |
| r1 ↔ r2 | 15.2 | tritan | PASS |
| r2 ↔ r3 | 7.5 | protan | WARN — both slashed; only the depth blurs |

The pair the light map rests on — mastered against wrong — is far stronger
here, 32.1 against 12.8. The collapse moves from the third green to the first,
and the slash covers it the same way; in dark the slash is drawn in
`--ink`. Not-seen cells now separate from the faintest green by colour alone,
which light could not do.

**The cost:** the dark red is a quieter fill. `#972622` is 2.22:1 against the
canvas, where light's `#D9534F` is 3.45:1. A wrong cell is found by its
slash and by being the only red, not by contrast with the page.

---

## Organigramm

`organigramm.css` loads the shared tokens from `tokens.css`, as `app.css` does
(the check asserts neither page sets one again), and adds its own: four arrow
kinds and four branch tints. Dark values follow the same rule — same hue,
lightness lifted.

```bash
VP=~/.claude/skills/design-direction/scripts/validate-palette.mjs
node $VP text "#6AB5A6,#D6A866,#7CA5E9,#92A6C1,#768381" --ground "#192426"   # arrows on the chart card
node $VP text "#E4EBEB,#ABBBBE" --ground "#21322D"                           # and each tint in turn
```

| Token | Light | Dark | Named for |
|---|---|---|---|
| `--k-elect` | `#0B6357` | `#6AB5A6` | arrow: elects (the accent) |
| `--k-appt` | `#8A5A12` | `#D6A866` | arrow: appoints (the gold) |
| `--k-ctl` | `#2F5DA8` | `#7CA5E9` | arrow: controls |
| `--k-form` | `#33465E` | `#92A6C1` | arrow: forms, leads |
| `--k-bg` | `#6E7B79` | `#768381` | arrow: background only |
| `--leg` | `#E2F0EB` | `#21322D` | legislative tint |
| `--jud` | `#ECE8F4` | `#302A3B` | judicial tint |
| `--jud-s` | `#5B4B8A` | `#A79AD8` | judicial stroke |
| `--head` | `#E5EAF1` | `#272E38` | head of state tint |
| `--head-s` | `#33465E` | `#92A6C1` | head of state stroke |
| `--colhov` | `#EBF0EF` | `#1B2525` | a column under the pointer |
| `--exe-grp` | `#FCF8EE` | `#2B261B` | the government, inside the executive |

`--leg-s` and `--exe-s` are the accent and the gold; `--exe` is `--goldbg`.

| Dark measurement | Ratio |
|---|---|
| arrow verbs on the card: elect / appt / ctl / form | 6.64 / 7.30 / 6.37 / 6.39:1 |
| `--k-bg` line on the card (its verb is `--dim`, 6.45:1) | 4.04:1 |
| `--ink` / `--muted` on leg · exe · jud · head · exe-grp | ≥ 11.15:1 / ≥ 6.79:1 |
| each branch stroke on its own tint | ≥ 5.30:1 |
| tooltip `#9FD8C9` / `#E8C98A` on dark `--tipbg` | 7.33 / 7.33:1 |
| exam clock `#FF9A92` on dark `--tipbg` | 5.74:1 |

`--k-ctl` and `--k-form` are both blue and sit close in either theme; they are
told apart by the line: a control arrow is dashed, a forming one solid.

---

## Type scale

**Not closed.** 25 distinct `font-size` values ship, clustered around
`.74rem–1.05rem` with outliers at `2.6rem` and `3.3rem` (the exam result) and
two hard-coded `17px`. A closed scale would be roughly:

| Step | Size | For |
|---|---|---|
| xs | .76rem | legend, metadata |
| sm | .82rem | labels, chrome |
| base | .9rem | body copy |
| md | 1rem | the question |
| lg | 1.3rem | headings |
| xl | 2.6rem | exam score |

This table is **a proposal, not the state of the code.** See *Unverified*.

---

## Form

| | |
|---|---|
| Primary device | Borders |
| Radius | Soft. `8px` is the de facto default; `99px` for chips, `50%` for dots |
| Elevation | Three uses only: progress sheet, scrim, lens. Never coloured |

The radius scale is also **not closed** — 14 distinct values ship (`2,4,5,6,7,8,
9,10,12,14,99px,50%,0`). The consequence that reaches the mark: **the system is
soft-cornered, not hard-cornered**, so the mark may carry an ~8px-equivalent
radius at 192px and must not be drawn as a hard square.

---

## Rejected

| Candidate | Failed on | Measured |
|---|---|---|
| Green success at a chromatic accent | red-green collapse vs accent | ΔE 11.1 (deutan) — kept anyway, mitigated by glyphs |
| `--no` `#B3332B` for map cells | too dark to separate from success by lightness | ΔE 2.8 (protan) vs `#0F5132` — replaced by `#D9534F` at ΔE 12.8 |
| A saturated teal accent | rejected on thesis, not measurement | reads as a consumer app; institutional register requires low chroma |
| Black-red-gold tricolour | implies official endorsement | refused in `BRAND.md` references |
| Dark canvas `#0B1417` (L 0.185) | rejected on thesis | near-black reads as a night mode, not as paper in low light |
| Dark accent `#64BEAD` (C 0.091) | rejected on thesis | stronger than the light teal; the two themes would carry different accents |
| Dark map red `#CB4641` | separation from the middle greens | 3.82:1 on the canvas against 2.22:1, but ΔE 4.9 / 8.0 (protan / deutan) against g2 / g3 |
| First dark green `#225338` | adjacent-green separation | ΔE 11.9 (deutan) against g2 — darkened to `#214D34` at 13.8 |
| White tooltip in dark | glare | the light tooltip turned over; brightest element on screen for a hint |

---

## Unverified

- **The type scale and the radius scale are open**, at 25 and 14 distinct values.
  Closing either is a sweep through 28 KB of stylesheet, deliberately out of
  scope for a brand pass. The table above is a proposal.
- **No one with a colour vision deficiency has looked at this.** Every CVD claim
  here is simulated by the validator, not observed. The map's ΔE 12.8 is the
  single number the whole mitigation rests on and it deserves one real reader.
- **The accent's low chroma was inherited, not chosen against alternatives.** It
  is defended above on thesis grounds, but no saturated candidate was drawn and
  compared. What would falsify the defence: the mark failing to read at 16px,
  which is tested in Stage 03.
- **The *Dark* column is not pinned.** `check-colours.mjs` reads the first hex
  after a token name, which is the light one. Until it learns to read the dark
  block in `app.css`, a dark value can drift from this table silently. Extending
  the check ships with the dark theme, not after it.
- **Dark has only been measured, not rendered.** The values above come from the
  validator and a mock-up, not from the app running in dark. The dimmed white
  plate behind question images has no measured number at all.
- **Contrast is measured against flat grounds only.** The phone progress sheet
  overlays content at partial opacity; the effective ratio behind it was not
  computed.
