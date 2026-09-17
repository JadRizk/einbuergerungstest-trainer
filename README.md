# Einbürgerungstest

A practice app for the German citizenship test, built as a single HTML file.
No build step, no server, no account, no network calls — open it and it works,
including offline.

It covers the full official catalogue: **460 questions**, 300 general plus 10
for each of the 16 federal states. The exam you sit draws 33 of them.

## Getting started

Download `einbuergerungstest.html` and open it in any modern browser. That is
the whole install. All 38 images are embedded in the file, so it keeps working
with no connection.

The other files are the sources it was built from, kept for reference — the
app does not read them at runtime.

## The three modes

**Practice** — one question at a time with immediate feedback, tracking what
you have already answered. Narrow it with the selector to questions you have
never seen, or to ones you keep getting wrong.

**Browse** — read straight through the catalogue without being quizzed.

**Exam** — 33 questions under real conditions: 30 general and 3 from your
state, nothing marked until you finish. 17 correct is a pass.

## While you study

- **English explanations.** Civic and legal terms in the German questions are
  underlined; hover or tap one for a plain-English gloss. 361 terms, written as
  a study aid — they are not part of the official catalogue.
- **Read aloud.** Questions can be spoken by the browser's German voice, with
  a choice of voice and four reading speeds. Useful for the listening side of
  the language, and for terms whose pronunciation is not obvious from spelling.
- **Shuffle questions, shuffle answers.** Shuffling answers is the one that
  matters — it stops you memorising *"the third option"* instead of the actual
  answer, which is the classic way to pass a practice app and fail the exam.
- **Copy or translate** any question with one click, for looking something up
  elsewhere or pasting it into your own notes.
- **Pick your state** to get the right 10 regional questions.

Your progress is stored in your own browser (`localStorage`) and goes nowhere
else. "Reset progress" in Settings clears it.

## Privacy

The app makes no network requests of its own: no analytics, no tracking, no
telemetry, no backend. Two external touches are worth naming so they are not a
surprise:

- The page loads its typeface from Google Fonts, which means Google sees the
  visitor's IP. Self-host the font if that matters to you.
- Each question offers a "translate" link, which opens Google Translate in a
  new tab only when you click it.

## Files

| File | What it is |
| --- | --- |
| `einbuergerungstest.html` | The whole app — code, styling, data and images inlined |
| `einbuergerungstest-fragen.json` | The 460-question catalogue |
| `einbuergerungstest-glossar.json` | 361 German→English terms, a study aid |
| `einbuergerungstest-bilder.zip` | The 38 source images, before inlining |

## Source and licence

Questions and images come from the **Bundesamt für Migration und Flüchtlinge
(BAMF)**, „Gesamtfragenkatalog zum Test ‚Leben in Deutschland' und zum
‚Einbürgerungstest'", dated **26 May 2025** — an official work under § 5 UrhG.

Licensing is split, because the exam content is not mine to license:

- **Code and glossary** — [MIT](LICENSE).
- **The catalogue and its images** — see [LICENSE-CONTENT.md](LICENSE-CONTENT.md),
  which covers their § 5 UrhG status and the attribution and
  no-modification duties that come with reusing them.

**This is not a BAMF service** and carries no official endorsement. The English
explanations are a study aid and are not part of the official catalogue. The
catalogue is revised from time to time — check the date above against the
current official version before trusting it, and sit the real thing on the
official materials.
