# Licensing of the question catalogue

The code in this repository is MIT-licensed (see [LICENSE](LICENSE)). The exam
content is not, because it is not mine to license. This file explains what
status it has and what that asks of you.

## Source

> Bundesamt für Migration und Flüchtlinge (BAMF) — „Gesamtfragenkatalog zum
> Test ‚Leben in Deutschland' und zum ‚Einbürgerungstest'", dated 26 May 2025.

460 questions: 300 general, plus 10 for each of the 16 federal states.

Affected files:

- `data/questions.json` — the catalogue
- `img/` — the 38 images
- `source/einbuergerungstest-fragen.json` and
  `source/einbuergerungstest-bilder.zip` — the original copies of both

## Status: amtliches Werk under § 5 UrhG

The catalogue is published by a German federal authority, for free, expressly
so that people can prepare for the test. That places it under **§ 5(2) UrhG**
(*amtliche Werke* published in the official interest for general public
knowledge), which exempts it from copyright protection.

That exemption is not unconditional. § 5(2) carries two duties forward, and
they are the reason this file exists:

- **§ 63 — Quellenangabe.** The source must be named. It is named above, in
  `meta.source` inside the catalogue JSON, and in the footer of the app itself.
- **§ 62 — Änderungsverbot.** The work must not be altered. Question wording,
  answer options and answer keys are reproduced verbatim and must stay that
  way. The English glossary and explanations are additions that sit *alongside*
  the catalogue — they never modify it, and the app labels them as not being
  part of it.

If you reuse this data, both duties travel with it.

## Two honest caveats

- That § 5(2) covers this particular catalogue is the standard reading of the
  statute, not a point settled by a court.
- A separate *sui generis* database right (§ 87a ff. UrhG) can attach to
  compilations, and how it interacts with § 5 is genuinely contested among
  commentators.

Neither is a realistic concern for a study tool. Both are worth knowing before
you build something larger on this data.

## Images

Provenance is mixed and not fully documented:

- `aufgabe_130` (the specimen ballot papers) is the original from the official
  catalogue, watermark and all.
- Several others — including `aufgabe_21` (coats of arms) and `aufgabe_55`
  (the Reichstag) — have been re-rendered rather than copied from the BAMF
  PDF. They are believed to derive from official or public-domain depictions of
  official symbols, but the exact origin was not recorded.

If you recognise an image as yours, please open an issue and it will be
credited or replaced.

Federal and state coats of arms are a separate matter from copyright: they are
not copyrighted, but their *use* is regulated, and use that implies official
authority can be an administrative offence. They appear here only as the
subject of the exam questions that ask about them, in a tool that states
plainly that it is unofficial.

## Not affiliated

This is not a BAMF service and carries no official endorsement. BAMF publishes
the catalogue, and runs its own free online practice test, at
<https://www.bamf.de>. For the exam that counts, rely on the official
materials — this repository is a practice aid, nothing more.
