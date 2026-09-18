# Refused candidates

Five drawn, one recommended. Kept so the choice can be refused on sight rather
than accepted by default. Each was rendered at 16px on light and dark ground —
the contact sheet is the decision, not the SVG in a viewer.

| Candidate | What it tried | Why it lost |
|---|---|---|
| `mark-gloss.svg` | An E whose base arm overruns into the underline the app draws under a glossed term | **Won**, then revised. As drawn here the arms are full width, so at 16px the overrun read as a wide-footed E rather than an underline. Shipped with the arms shortened — see `../mark.svg`. |
| `mark-grid.svg` | The progress map: 3×3 cells, the centre one filled | Failed the 16px read. The tinted cells fall to near-invisible on white and vanish entirely on dark; the mark became a single dot. |
| `mark-umlaut.svg` | A bold Ü — unmistakably German without touching the flag | Legible, but says only "German". It names the language, not the catalogue or the explanation, and at 16px the dots close up on the bowl and it reads as a horseshoe. |
| `mark-tick.svg` | A white check on an accent tile | The most legible of the five at every size, and refused anyway. A green tick is the quiz-app shelf's default iconography, and `BRAND.md` forbids celebration. It says "you got it right", which is the claim this project is positioned against. |
| `mark-stamp.svg` | An official stamp frame around the letterform | Mud at 16px — the frame closes on the E and the whole thing becomes a filled rectangle. It also edges toward implying official endorsement, which the About text explicitly disclaims. |

Regenerate the contact sheet:

```bash
for m in gloss grid umlaut tick stamp; do
  resvg -w 160 --background '#EDF0EF' candidates/mark-$m.svg /tmp/${m}_160.png
  resvg -w 16  --background '#FFFFFF' candidates/mark-$m.svg /tmp/${m}_16.png
done
```
