# Einbürgerungstest trainer — palette

Every number here is reproducible. The command that produced each table is
printed beside it; re-run it rather than trusting the table.

Validator: `~/.claude/skills/design-direction/scripts/validate-palette.mjs`

This palette was **not designed by this pass** — it was already shipping in
`app.css`. What this pass did was measure it. Two findings changed nothing and
one is recorded as open; see *Unverified*.

---

## Ground

| | Value | Role |
|---|---|---|
| Canvas | `#EDF0EF` | Page ground — every ratio below is measured against this |
| Surface | `#FFFFFF` | Cards, the question itself, sheets |
| Sunk | `#F1F4F4` | Inset wells, unanswered map cells |

Light only. `color-scheme:light` is declared and there is no dark variant.

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

---

## Primitives

Named by appearance. These are the names that actually exist in `app.css`.
**One token per row** — `brand/check-colours.mjs` pairs each name with the hex
beside it and asserts it still matches `app.css`, so a combined row silently
breaks the pin.

| Token | Value | Named for |
|---|---|---|
| `--paper` | `#EDF0EF` | the page |
| `--card` | `#FFFFFF` | raised surfaces |
| `--sunk` | `#F1F4F4` | wells |
| `--ink` | `#152227` | near-black, green-cast |
| `--muted` | `#4F6167` | body grey |
| `--dim` | `#5C6E74` | rejected answers |
| `--edge` | `#788584` | control borders |
| `--rule` | `#DBE2E1` | decorative divider |
| `--soft` | `#E7EBEA` | decorative divider, lighter |
| `--accent` | `#0B6357` | the teal |
| `--gold` | `#8A5A12` | regional marker |
| `--ok` | `#0F5132` | correct |
| `--okbg` | `#DEEDE4` | correct, as a ground |
| `--no` | `#B3332B` | wrong |
| `--nobg` | `#FAE4E2` | wrong, as a ground |
| `--cellbad` | `#D9534F` | map-only lighter red |

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

**Deliberately absent.** No *info* role (the accent serves), no second accent,
no dark theme, no chart series.

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
- Every progress-map legend entry carries its word: *not seen*, *correct*,
  *wrong*, *state question*.
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

**Severity ordering is inverted and stays that way.** Success is 1.58× louder
than warning. In a study tool the reader is scanning for what they got *right*
as much as what they got wrong, and "correct" is the state the interface is
built to produce. Recorded as a deliberate inversion, not an oversight.

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
- **Contrast is measured against flat grounds only.** The phone progress sheet
  overlays content at partial opacity; the effective ratio behind it was not
  computed.
