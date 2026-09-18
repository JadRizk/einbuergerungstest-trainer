# Einbürgerungstest trainer

A civic study tool. Paper-grey ground, one deep teal signal, white cards, a
single variable grotesque, light only — the register of a government form that
someone actually made usable.

## Thesis

The official BAMF catalogue is a PDF of 460 questions with no explanations, and
the apps built on it are ad-supported quiz games that treat a naturalisation
exam like a trivia round. Both fail the same person: someone studying in a
second language, who does not need gamification but does need to know what
*Bundesverfassungsgericht* means. This system is built for that reader and
refuses the two obvious alternatives — it is neither a raw document nor a game.

So it takes the visual register of the institution the test comes from, and
then does the thing the institution did not: explains itself. The palette is
close to newsprint and official stationery, not to a consumer app — desaturated
paper-grey rather than white, a teal so dark it is nearly achromatic, one gold
reserved for anything regional. Nothing pulses, nothing celebrates, nothing is
unlocked. Getting a question right advances to the next one.

The corollary that costs the most: **the content is the interface.** A German
question in the official wording is the largest thing on screen and the chrome
gets out of its way. Every control lives in one drawer, which on a wide screen
stops being a drawer and becomes a rail — one copy of every control, never two.

## Voice

- **Label casing** — Sentence case. "Read aloud", "Federal state", "Sit a mock
  exam". Never Title Case, never all-caps.
- **Separators** — `·` in compound chrome labels ("Einbürgerungstest ·
  question catalogue"; "33 questions · 60 minutes · 17 to pass"). Em dash in
  prose.
- **Status vocabulary** — the exam's own words: *correct*, *wrong*, *not seen*,
  *pass*. Not *success* / *error* / *complete*, and never a score out of stars.
- **Numbers are stated plainly** — "460 questions", "17 correct is a pass".
  Quantities are the reassurance; they are never rounded or dramatised.
- **British English throughout** — *practise* the verb, *licence* the noun,
  *naturalisation*. The one exception is the German, which is never translated
  in chrome: the app is called the Einbürgerungstest, not the Citizenship Test.

Body copy is plain and declarative and is **not** written in the chrome voice.
It explains a term to someone reading in a second language: short sentences,
no idiom, no jokes, the German word given before its gloss. The About section
says what the app is not ("This is not a BAMF service") before it says what it
is — the disclaimer is voice, not legal boilerplate.

## Typography

**Archivo**, self-hosted as a variable face at weights 400–700, latin subset,
`font-display:swap`, with the system stack behind it. One family carries
everything; there is no display face and no mono. Archivo is a grotesque drawn
for signage and forms — slightly condensed, high x-height, legible at the small
sizes the progress map and the glossary need — which is the same reason it suits
a document that is mostly German compound nouns.

The scale is **not currently closed** — 25 distinct `font-size` values ship. See
*Unverified* in `PALETTE.md`. Closing it is a stylesheet sweep, deliberately not
done as part of the brand pass.

## Non-negotiables

Stated as prohibitions. Stage 03 applies these to the mark verbatim.

- **One accent.** `#0B6357` is the only signal colour. The mark gets one colour
  and no gradient, no second brand hue, no rainbow. Gold `#8A5A12` is not a
  second accent — it means *regional* and nothing else.
- **Light only.** `color-scheme:light` is declared and no dark variant exists.
  The kit therefore ships a light-ground mark; a dark-ground variant exists only
  as the inverted asset, not as a theme.
- **No celebration.** No confetti, no streaks, no badges, no mascot. A right
  answer advances. The mark is therefore not a character and not a smiley.
- **State is never carried by colour alone.** Every answer carries ✓ or ✗;
  every map legend entry carries its word. Measured justification in
  `PALETTE.md` — the status hues *do* collapse toward the accent under
  dichromacy, and the glyphs are why that is survivable.
- **Text clears 4.5:1** against its ground. Measured ratios live beside the
  tokens in `PALETTE.md`. If a label looks too loud, change the size or the
  hierarchy, never the contrast.
- **Decoration and text are different tokens.** `--edge`, `--rule` and `--soft`
  are boundaries and never text; `--edge` measures 3.34:1 and is verified unused
  as a text colour.
- **Nothing is tracked and nothing is fetched at runtime.** No analytics, no
  CDN, no font call, no account. This is a brand property, not just a technical
  one: it is the second sentence of the README and it constrains the kit — every
  asset ships from the origin.

## Mark

**The gloss-E ships** — `brand/assets/logo/mark.svg`. A letterform E whose base
arm overruns the other two into the underline the app draws beneath a glossed
term. It is the onliness statement as a shape: the letter names the product, the
overrun names what the product does to it. Four rectangles, one colour, no
counters to fill in at small size.

The arms are deliberately short. Drawn at full width the overrun reads as a
wide-footed E and the idea disappears; shortening them is what makes the base
read as a rule. That was decided on rendered 16px pixels against two
alternatives, not in a viewer — see `assets/logo/candidates/README.md`.

| Surface | File |
|---|---|
| Large, on a light ground | `mark.svg` — accent on transparent |
| Any single colour | `mark-mono.svg` — `currentColor` |
| On the accent or a dark ground | `mark-inverted.svg` — white |
| **≤ 48px, or any circular slot** | `mark-small.svg` — reversed, on a filled accent tile |
| Name alone | `wordmark.svg` — Archivo 700, outlined |
| Mark + name | `lockup.svg` — never below 120px wide |

**Small spaces get the small mark.** Below about 32px the plain mark thins out
and the overrun starts to close; the reversed tile holds its silhouette down to
16px. Every favicon, launcher and maskable icon is built from `mark-small.svg`
for that reason, and the rule is: **≤ 48px or a circular slot → the tile.**

**Clear space** is a quarter of the mark's height on all four sides — the height
of one bar. **Minimum size** is 16px for the tile and 24px for the plain mark;
below 24px the plain mark is not used at all.

**Don'ts.** No recolouring outside the accent and its two reversals. No gradient,
no shadow, no glow. No stretching — the mark is drawn on a fixed 36 × 38 box and
scales uniformly. No outline version. No type set inside the mark. The mark never
animates on a release surface: README, social card, favicon.

### Compliance with the prohibitions above

| Prohibition | How the mark complies |
|---|---|
| One accent | The mark is `#0B6357` and nothing else. Its reversals are white on that accent — no second hue, no gradient, no gold. |
| Light only | The mark is drawn for a light ground; `mark-inverted.svg` exists for the accent tile, not as a dark theme. |
| No celebration | No character, no face, no tick, no star. A green check was the most legible candidate drawn and was refused on exactly this line. |
| State never by colour alone | The mark carries no state, so the rule does not bind it — but it is why the tick was refused: a check *is* a state rendered as a shape. |
| Not the Bundesadler, not the tricolour | Neither appears. The mark is a letterform, which is the one civic-adjacent form that cannot be mistaken for a coat of arms. |
| Soft-cornered, not hard-cornered | Bars carry a 1.6/36 corner radius and the tile carries 12/64 — both in proportion to the ~8px the interface uses. It is not a hard square. |


## References

What the direction takes and what it refuses.

- **BAMF, *Gesamtfragenkatalog zum Test Leben in Deutschland und zum
  Einbürgerungstest* (26 May 2025)** — the source document and the register the
  palette borrows. *Taken:* the institutional restraint, the paper ground, the
  plain numbered question. *Refused:* its complete absence of explanation, and
  its typography.
- **German federal web (bund.de, the Bundesadler tradition)** — *Taken:* the
  convention that civic identity is a flat single-colour mark with no
  illustration. *Refused:* the eagle itself and the black-red-gold tricolour —
  using either would imply official endorsement the About section explicitly
  disclaims.
- **Consumer Einbürgerungstest quiz apps (the ad-supported Play Store
  category)** — *Refused wholesale:* the gamification, the score animations, the
  interstitials, the accounts. They are the alternative this system is
  positioned against, and the non-negotiable "no celebration" is the direct
  consequence.
- **Anki / spaced-repetition tooling** — *Taken:* progress as a dense grid of
  cells you can read at a glance, and filtering by "never seen" and "keep
  getting wrong". *Refused:* the scheduling algorithm and its vocabulary; this
  is a finite 460-question catalogue, not an open-ended deck.
