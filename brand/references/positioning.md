# Positioning

The strings that go on the card, the header and the first line of the README —
decided here so they stop drifting per-surface.

## 1 · Category, and the alternatives

**The shelf:** a static, installable web app; GitHub topics `einbuergerungstest`,
`german`, `pwa`, `study`; the thing someone lands on after searching
"Einbürgerungstest üben".

What a user would actually pick instead:

| Alternative | What it does that this does not | What this does that it does not |
|---|---|---|
| **The BAMF PDF / the official online trainer** | It is the authoritative source, and it is what the exam is drawn from | Explains nothing. It is a question and a correct letter — no gloss, no vocabulary help |
| **Ad-supported quiz apps** (the Play Store `Einbürgerungstest` category) | Free, familiar, full catalogue, phone-native | Drills recall with ads and scores. No explanation of the German, and progress is behind an account |
| **A shared Anki deck** | Real spaced repetition, and it syncs | The explanations only exist if the learner writes them, which requires already understanding the material |
| **An Integrationskurs / paid course** | A human answers questions, and it is the route most people take anyway | Costs money, runs on a schedule, and is not available at 23:00 the night before |
| **Reading the PDF once and hoping** | Free, zero setup | Nothing is tracked, nothing is explained, and the 16 regional questions are easy to miss entirely |

The honest read: the ad-supported quiz apps are the real competitor. They are
free and they have the whole catalogue. The gap is that they test whether you
recognise an answer, not whether you understood a question written in legal
German.

## 2 · The onliness statement

> **The only Einbürgerungstest trainer that glosses the civic vocabulary inside
> the question itself — 361 terms, matched in their inflected forms.**

Tested against every alternative above:

- **BAMF PDF** — cannot say it. It carries no explanations at all; that is the
  whole premise of this project.
- **Quiz apps** — cannot say it. They translate whole questions at best, which
  answers *what does this sentence say* and not *what is a Bundesverfassungsgericht*.
- **Anki deck** — cannot say it. The gloss is the learner's own homework.
- **A paid course** — cannot say it. A teacher explains a term when asked; the
  term is not underlined in the text at the moment of reading it.
- **Doing nothing** — n/a.

The refusal that earns it: this tool **will not help you pass without
understanding**. Shuffling answers is on by default-adjacent and is documented
as existing specifically to stop you memorising "the third option" — the
category's normal behaviour is the thing this refuses.

## 3 · The one-liner

> **All 460 questions of the official German citizenship test, explained in
> English.**

Twelve words. States what it does, not what it believes. Already the README's
first bold line — the surfaces below adopt it rather than inventing variants.

## 4 · The tagline

Three written, two refused.

| | Candidate | Verdict |
|---|---|---|
| **A** | **Understand the questions, don’t memorise them.** | **Ships.** |
| B | Know what the question means. | Refused — passes the delete test but states a feature (the gloss), not the position. It describes the glossary rather than the argument the glossary exists to make. |
| C | The official catalogue, explained in English. | Refused — this is the one-liner wearing a tagline's clothes. It survives no delete test: strip the name and it could sit under any study app in the category. |

**A against the three tests:**

- **Delete test.** Remove the name: *"Understand the questions, don’t memorise
  them."* Still specific — it is an accusation aimed at the drill apps, and
  none of them could print it without indicting themselves. Survives.
- **Register test.** Sentence case ✓ · British `-ise` spelling, consistent with
  *practise* and *naturalisation* ✓ · plain declarative, no celebration
  vocabulary ✓ · no Title Case ✓.
- **Surface test.** Six words, one comma, one apostrophe. Nothing a crawler
  strips. Sets on two lines at card size and one line in the README header.

## 5 · Where each string lives

| String | Form | Surfaces |
|---|---|---|
| **Einbürgerungstest** | wordmark | logo lockup, social card, README heading, the app's top bar and drawer title |
| **einbuergerungstest-trainer** | identifier | repo name, GitHub Pages URL, cache prefix `ebt-` |
| One-liner | — | repo description, `<meta name="description">` seed, `og:description`, README line 2 |
| Tagline | — | social card, README header, `og:image` artwork |
| Onliness statement | — | `BRAND.md` and this file only. It is a test, not copy |

Two written forms and no third. **"Einbürgerungstest Trainer" in Title Case is
the third form and does not exist** — the German noun is capitalised because it
is a German noun, and the English word after it is not.

## Unverified

- **Competitor claims were not researched this pass.** The alternatives table
  describes the category from the project's own README framing and general
  knowledge of the Play Store shelf; no specific app's marketing copy was read
  or quoted. Before any of this is used as public comparative copy, read three
  actual listings.
- **"361 terms" is load-bearing in the onliness statement** and is copied from
  the README. It is pinned to `data/glossary.json`; if that file changes, this
  sentence is wrong.
