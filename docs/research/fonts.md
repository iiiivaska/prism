# Typeface comparison for the Signature preset

Rendered 2026-09-08 with headless Chrome from Google Fonts (`fonts/harness-g*.html`, results `fonts/g*-{dark,light}.png`). Sample: hero numerals at the thinnest available weight (88 px and 52 px, tabular figures, dimmed decimals), a 300-weight "± 2.5 min", 600/500 labels in English and Russian, 15 px body, 12 px captions with times and deltas. Judged by the lead agent by eye; Cyrillic coverage, licenses and OpenType features are verified separately in `fonts-facts.md` (from the research workflow) and win over the eye where they disagree.

## Verdicts by eye

| Family | Thin display numerals | UI text (EN/RU) | Character vs references | Verdict |
|---|---|---|---|---|
| **Onest** | 100 is elegant, geometric, evenly spaced; dimmed decimal reads well | Rounded-geometric, friendly, Cyrillic drawn natively (Russian designer) | Closest to the Poppins/Outfit look of the references while having Cyrillic | **Primary candidate for `font.ui` and `font.display`** |
| **Manrope** | 200 is the thinnest; still elegant, slightly more mechanical | Crisp, neutral-geometric, excellent small sizes | Very close to the references' label style | **Runner-up for `font.ui`; good display at 200** |
| **Inter** | 100 is the most refined thin numeral of the set | Neutral grotesk, best small-size legibility, native Cyrillic | Less "designed" than the references; already the Native web font | Display alternative; stays the Native preset |
| Geologica | 100 good; slightly quirky "a" | Geometric, native Cyrillic | Distinctive; could become a brand-specific choice | Keep as brand option |
| Sofia Sans | 100 very light and compact | Slightly condensed; reads technical | Fits dark ops dashboards better than airy CRM | Keep as brand option for dense data |
| Commissioner | 100 fine but wide | Wide, quirky | Not the references' character | Drop |
| Ubuntu Sans | 100 fine | Ubuntu's own letterforms are too recognizable | Off-brand | Drop |
| Wix Madefor Display | no weight below 400 | Good | Fails the display slot | Drop |
| Mulish, Nunito Sans, Nunito | 200 acceptable | Soft, friendly, a bit generic | "Consumer app" feel, less premium | Drop |
| Golos Text | no weight below 400 | Excellent Cyrillic UI face | Fails the display slot | Keep as `font.ui` option for text-heavy Russian products |
| Rubik | no weight below 300, rounded terminals | Too playful | Off-brand | Drop |
| Jost, Montserrat, Raleway | 100 available | Fashion/geometric mannerisms; Raleway's numerals unsuitable for data | Off-brand for dashboards | Drop |
| Comfortaa, Unbounded, Exo 2 | — | Rounded / wide / techno mannerisms | Off-brand | Drop |
| Geist | 100 elegant | Swiss-geometric, Cyrillic redesigned 2026-01 (verified in the binary) | Strong association with Vercel | Keep as brand option; `ui` #3 in facts |
| Figtree, Outfit | — | Rendered via fallback: the served builds have **zero** Cyrillic codepoints (verified) | — | Disqualified |

## Proposal (to be confirmed in ADR-0008)

- `font.ui` = **Onest** (fallback: Manrope, then system-ui).
- `font.display` = **Onest** at 100–200 for metrics ≥ 34 pt; Inter 100 as an alternative brand choice.
- `font.mono` = **JetBrains Mono** (Cyrillic, OFL) for tabular data on web; SF Mono on Apple when the Native preset is active.
- One family for ui and display keeps the bundle to one variable font file per platform (~100–200 KB) and one set of Dynamic Type metrics.
