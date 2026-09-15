# Typeface comparison for the Signature preset

Rendered 2026-09-08 and re-rendered 2026-09-15 from Google Fonts: one page per group and scheme (`fonts/harness-g{1,2,3}-{dark,light}.html`; the light pages were added on 2026-09-15), results `fonts/g{1,2,3}-{dark,light}.png`. Sample, in invented copy since the re-render (ADR-0015 rule 3): hero numerals at the thinnest available weight (88 px and 52 px, tabular figures, dimmed decimals), a 300-weight "± 3.8 mm", 600/500 labels in English and Russian, 15 px body, 12 px captions with times and deltas. Judged by the lead agent by eye on the first renders; the re-render changed the copy, not the letterforms. Cyrillic coverage, licenses and OpenType features are verified separately in `fonts-facts.md` (from the research workflow) and win over the eye where they disagree.

**Reproducing the renders.** Playwright 1.63 drives Chrome for Testing 151.0.7922.34 (`chrome-headless-shell`, mac-arm64) on macOS 26.6.2, launched with `--lang=en-US`, in a context with `locale: "en-US"`, a 1400 × 1650 CSS px viewport and device scale factor 1. Each page opens as a file URL with `waitUntil: "networkidle"`, waits for `document.fonts.ready` and is captured as a viewport screenshot; a page on which any family failed to load is not captured. Every page sets `<html lang="en">` and marks each Russian run `lang="ru"`, so the text's language, not the renderer's locale, picks localized letterforms. That matters for Sofia Sans, whose default Cyrillic forms are Bulgarian: it draws Russian forms only in text tagged as Russian (or, untagged, under a Russian locale). With the tags, the renders are pixel-identical under en-US and ru-RU.

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
- `font.display` = **Onest** at 100–200 for metrics ≥ 34 pt; Inter 100 as an alternative brand choice (refined by ADR-0021, 2026-09-15: only metric.xl goes thin, at 200 and only in dark).
- `font.mono` = **JetBrains Mono** (Cyrillic, OFL) for tabular data on web; SF Mono on Apple when the Native preset is active.
- One family for ui and display keeps the bundle to one variable font file per platform (~100–200 KB) and one set of Dynamic Type metrics.
