# Accessibility reconciliation of the Prism palettes

Contrast audit of the proposed palettes with compliant substitutes, dated **2026-09-15**. **Generated from `pnpm contrast:check` output at commit `2fbad03`.**

- **What ran.** `tools/contrast` (ticket P1-6) and `tokens/contrast-pairs.json`, both as they stood in the working tree of that commit: P1-6 had not been committed yet, and its CI gate (`tools/contrast/check.ts`) had not opened.
- **The seeded palette** is the token tree of commit `f8aa0b1^`, before P1-1 and P1-2. It was evaluated with the same `evaluatePair` code from `tools/contrast/pairs.ts`, the same backdrops and the same Card geometries.
- **Every Prism ratio and every seeded ratio was computed by that code.** The reference values are quoted from visual-dna, and the facts F7 to F16 from ADR-0022.
- **A newer run wins.** If a later `contrast:check` run disagrees with this file, the run is right and this file is out of date.

ADR-0011, `docs/research/README.md` and visual-dna B19 cite this file, but it was never committed. It brings together four sources:

- the seeded reference-brand palette and the ratios expected of it (visual-dna §3.7, the lift ledger, and visual-dna Appendix A);
- the findings against it (visual-dna B1 to B6 and B21; critic G-13 and G-14; ADR-0022 F7 to F16);
- what P1-1 and P1-2 changed in `tokens/` so that it complies (commit `f8aa0b1`);
- the substitutes that ADR-0021 and ADR-0022 chose, plus ADR-0020's per-brand guard.

## How to read and regenerate this file

- **Regenerate.** `pnpm contrast:check` prints the Markdown report on stdout. It exits 1 while any pair fails. In `tools/`, `node contrast/check.ts --report <file>` also writes the report to a file. Appendix 1 is that report laid out per brand and per scheme.
- **Contexts.**
  - Every pair runs in every brand × colorScheme context:
    - both brands, `prism` and `prism-native` (ADR-0020 rule 10);
    - the six colorScheme contexts: `light`, `dark`, `light-increased-contrast`, `dark-increased-contrast`, `light-reduced-transparency` and `dark-reduced-transparency`.
  - The platform is `web` and every other axis stays at its default.
  - `contrastContexts` refuses to run if a color varies along another axis, or differs between `web` and `apple`. One run therefore covers both stacks.
  - A pair's `schemes` field limits it to one base scheme and that scheme's variants.
  - ADR-0011 places the Increase Contrast layer at `tokens/scheme/*/contrast-high.json`, a path that does not exist. The layer is `tokens/sys/color/*-increased-contrast.tokens.json`.
- **Thresholds (ADR-0011).**
  - Functional: 4.5:1, or 3:1 when the pair states `minSizePx` of 24 or more.
  - Decorative: 3:1, allowed only at 24 px or more.
  - Boundary: 3:1.

  The tool does not model ADR-0011's "or ≥ 19 px bold", so a pair that relies on bold text states 24 px.
- **Compositing.**
  - Colors are composited source-over in gamma-encoded sRGB, and luminance is WCAG 2.x.
  - A translucent background sits on `color.bg.page`, or on each entry of `underlays` in turn, or on each entry of `backdrops` in turn. A translucent foreground is then laid over the result.
  - A pair's ratio is the minimum over all these combinations, and the report names the worst one.
  - Colors are gamut-mapped from their authored OKLCH the way CSS does it. The `hex` field is not used.
- **Gradients.**
  - V1 (`stops: "all"`) samples every stop plus 100 points per segment, interpolated both in gamma-encoded sRGB and in OKLab.
  - V2 (`region: "card-header"`) takes the same samples inside the Card header block, at twelve geometries: four Card sizes, each with the padding and action size of compact (16 / 32), regular (24 / 40) and comfortable (24 / 48).
  - A gradient used as a glass backdrop contributes the same samples, not only its stops. That is stricter than ADR-0022 §3.3 and ARCHITECTURE §10 step 4, which name the stops.
  - The worst-case strings name gradient slots. The slots are:

    | Scheme | `default` | 1 | 2 | 3 | 4 |
    |--------|-----------|---|---|---|---|
    | light | sky | sky | olive | rose | orchid |
    | dark | plum-dusk | plum-dusk | forest-moss | ember-night | navy-cyan |
- **Rounding.** The tool rounds ratios down to two decimals, so a displayed ratio never overstates the computed one. visual-dna Appendix A rounds to the nearest value, so many of its numbers read 0.01 higher. For example, visual-dna's 5.64 is 5.636, shown here as 5.63.
- **Names.** Tokens are written without `sys.`, as the pairs file writes them. Other shorthand:
  - IC: an increased-contrast context. RT: a reduced-transparency context.
  - "White 64 %": white at alpha 0.64.
  - "Ink": `neutral.950`, #0D0E11.
  - "Smoke": `ref.color.smoke.light` (#0A0C08) or `ref.color.smoke.dark` (#101410).
  - "A.2" and "A.3": the tables of visual-dna Appendix A.

## 1. Result

- **67 pairs in 12 contexts give 762 evaluations: 754 pass and 8 fail.**
  - 0 other problems: every `a11y.pairsWith` of a `text.*` token has its pair, and a V1 pair and a V2 pair reach every vivid gradient of both brands.
  - The token build reports 0 diagnostics, including ADR-0021's weight checks.
- **The 8 failures are one finding, critic G-14.**
  - In light, `color.chart.target` and `color.chart.comparison` are ink at 30 %. On the white plot that composites to #B6B7B8, which gives 2.01:1 against the 3:1 boundary tier.
  - They fail in `light` and `light-reduced-transparency`, for both brands.
  - The light IC context passes (ink 60 %: 5.06), and so do all dark contexts.
  - The pairs are new in P1-6. The values are the seeded ones: P1-2 only re-expressed them as aliases of `neutral.950`. See §8.1.
- **The two brands give identical results.** `prism-native`'s 381 evaluations match `prism`'s in every ratio and every worst case, because neither brand file writes a color (ADR-0020 §1).
- **Reduced transparency equals the base scheme in every evaluation.** ADR-0022 §1.4 deleted the reduced-transparency deltas, and Surface now draws the glass fallback (§6).
- **The seeded palette fails 12 of today's pairs (§3).** 6 more cannot be evaluated against it, because their tokens did not exist yet. The failures are:
  - `border.strong` in light (B1);
  - `border.boundary` in dark (B2);
  - the dark glass chip and cell (ADR-0022 F10), and the light-scheme dark chip over the seeded vivid set;
  - V1 in both schemes and V2 in light (B5);
  - the two chart lines.

  P1-1 and P1-2 fixed all of them except the chart lines.
- **The closest passes** are those with less than 0.1 above their threshold:
  - `border.strong on bg.page` 3.02 against 3.0 (light; #8a8b8e on #f1f2f5)
  - `text.on-badge on bg.fill.critical` 4.53 against 4.5 (light; #ffffff on #e5252a)
  - `text.on-vivid on gradient.vivid.* · region: card-header` 4.55 against 4.5 (light; sys.gradient.vivid.3 320×200 p16 a32 t=0.646 srgb: #ffffff on #a36660)
  - `text.on-vivid on gradient.vivid.* · stops: all · >= 24 px` 3.05 against 3.0 (dark; sys.gradient.vivid.3 stop 3 srgb: #ffffff on #d28035)
  - `text.on-accent-strong on bg.fill.accent-strong · schemes: dark · >= 24 px` 3.05 against 3.0 (dark; #ffffff on #dd7a24)
  - `border.strong on bg.surface.raised` 3.07 against 3.0 (light; #909092 on #fbfbfc)
  - `text.on-glass-light on material.glass.light.chip · over [#555555, gradient.vivid.*] · schemes: light` 4.57 against 4.5 (light; over sys.gradient.vivid.1 stop 0: #0d0e11 on #77799a)
  - `border.strong on bg.surface` 3.08 against 3.0 (light; #929394 on #ffffff)

## 2. Reconciliation table

There is one row per group of pairs with the same foreground. Where a row has several backgrounds, each ratio cell lists them in the order of the Pair column.

- **Reference value.** What the reference products showed, where visual-dna §3.7 records a measurement. Otherwise, the seeded proposal with its visual-dna Appendix A expectation.
- **Ratios.** `contrast:check`'s minimum over the pair's underlays or backdrops. Both brands give the same ratios.
- **Reduced-transparency contexts** equal the base ones; Appendix 1 lists them.
- **Increased contrast** lists the light context, then the dark one, separated by a semicolon.

| Pair | Reference value and ratio | Prism value (light; dark) | Light | Dark | Increased contrast (light; dark) | Tier | Status |
|---|---|---|---|---|---|---|---|
| `text.primary` on `bg.page` · `bg.surface` · `bg.surface.raised` | Ink and white; §3.7 records no lift. Seeded `neutral.950` / `neutral.0` (A.2: 17.24 · 19.30 · 18.67 light, 19.30 · 16.95 · 15.58 dark) | `neutral.950` #0D0E11; `neutral.0` #FFFFFF | 17.24 · 19.30 · 18.66 | 19.30 · 16.95 · 15.58 | 17.24 · 19.30 · 18.66; 19.30 · 16.95 · 15.58 | functional 4.5 | pass; unchanged |
| `text.secondary` on the same three | Light #8E8E8E (Credit Karma), #8E9196 (CreditPros): 2.2–2.9:1 at 12–18 px. Dark white 50–55 % (Vexto, Arvion): about 3.5:1 on light-toned glass (§3.7) | `neutral.600` #5C6068; white 64 %. IC: `neutral.700` #40444C; white 80 % | 5.63 · 6.31 · 6.10 | 8.13 · 7.59 · 7.18 | 8.72 · 9.76 · 9.44; 12.36 · 11.17 · 10.42 | functional 4.5 | pass; lifted in the seed (§3.7), unchanged by P1-1 and P1-2 |
| `text.tertiary` on the same three | Light #7E838F (the DNA's first proposal): 3.39:1 on the page, decorative only. Dark white 40–45 % (Vexto traffic §10.2, Arvion §10): 3.6–4.4:1 (§3.7) | `neutral.600`; white 55 %. IC: `neutral.700`; white 70 % | 5.63 · 6.31 · 6.10 | 6.24 · 5.95 · 5.69 | 8.72 · 9.76 · 9.44; 9.59 · 8.83 · 8.31 | functional 4.5 | pass; lifted in the seed; the raised pair is new in P1-6 |
| `text.dimmed` on the same three | Dark dimmed digits white 35–40 %: 2.3–2.9:1 on sampled pixels, 3.22–3.79 composited on surface-1. Light #7E838F kept for ≥ 24 px only (§3.7) | `neutral.500` #7E838F; white 42 %. IC: `neutral.600`; white 64 % | 3.39 · 3.79 · 3.67 | 4.08 · 4.03 · 3.93 | 5.63 · 6.31 · 6.10; 8.13 · 7.59 · 7.18 | decorative 3.0, ≥ 24 px only | pass; lifted in the seed; the page pair is new in P1-6 |
| `text.accent` on the same three | #F39444 as light text: 2.05:1 on the page (Vexto traffic §10.6); in dark 7.37 on surface-1 (§3.2) | `accent.800` #9C4512; `accent.500` #F39444. IC: `accent.900` #6B2F0C; `accent.500`. Both through the `text-accent` brand slot (ADR-0020 §2) | 5.73 · 6.41 · 6.20 | 8.39 · 7.37 · 6.77 | 9.20 · 10.30 · 9.97; 8.39 · 7.37 · 6.77 | functional 4.5 | pass; lifted in the seed; the raised pair is new in P1-6. Now a brand slot that every brand must pass |
| `text.success` on the same three | The ok dot #2DB24A used as text: 2.77 on white (§3.3, §3.7) | `status.success.text-light` #187530; `status.success.dark` #5CCB6A | 5.17 · 5.79 · 5.60 | 9.38 · 8.24 · 7.57 | 5.17 · 5.79 · 5.60; 9.38 · 8.24 · 7.57 | functional 4.5 | pass; lifted in the seed (separate text step); the raised pair is new in P1-6 |
| `text.warning` on the same three | The attention dot #F5B83D used as text: 1.78 on white (§3.7) | #8F5B00; #F5B83D | 5.11 · 5.73 · 5.54 | 10.85 · 9.53 · 8.76 | 5.11 · 5.73 · 5.54; 10.85 · 9.53 · 8.76 | functional 4.5 | pass; lifted in the seed (separate text step); the raised pair is new in P1-6 |
| `text.critical` on the same three | Incident red #FF4642: 3.9:1 on sheet glass (Vexto incident, Accessibility risks #3); the light dot #F04B45: 3.62 on white (§3.3) | #BF2222; #FF5A55 (#FF4642 stays for marks) | 5.41 · 6.05 · 5.85 | 6.29 · 5.52 · 5.07 | 5.41 · 6.05 · 5.85; 6.29 · 5.52 · 5.07 | functional 4.5 | pass; lifted in the seed; the raised pair is new in P1-6 |
| `text.info` on the same three | Arvion's periwinkle #4E6CCD: 4.83 on white (§3.3) | #3D5BC4; #7A93F0 | 5.37 · 6.01 · 5.81 | 6.67 · 5.86 · 5.38 | 5.37 · 6.01 · 5.81; 6.67 · 5.86 · 5.38 | functional 4.5 | pass; seeded text steps, unchanged; the raised pair is new in P1-6 |
| `text.primary` on `bg.tint.accent`, over the page and a card | Seeded #F39444 at 12 % / 14 %, checked over the card only (A.2: 17.54 light, 13.27 dark, 15.66 over the dark page) | `accent.500` at 12 %; at 14 % (`app.prism.alpha`, ADR-0020 §3) | 15.82 | 13.27 | 15.82; 13.27 | functional 4.5 | pass; value unchanged. The light minimum is 15.82 because the tint is now also checked over the page (critic G-13) |
| status text on its tint: success · warning · critical · info, over the page and a card | Seeded light tints #E6F6E9 · #FEF6E8 · #FDE9E9 · #EAEDF9 and dark status hues at 10 % (A.2: 5.16 · 5.34 · 5.19 · 5.15 light, 6.87 · 7.79 · 4.98 · 5.16 dark) | light tint steps; dark hue at 10 % (critical and info from the mark step) | 5.16 · 5.33 · 5.19 · 5.14 | 6.86 · 7.79 · 4.98 · 5.15 | 5.16 · 5.33 · 5.19 · 5.14; 6.86 · 7.79 · 4.98 · 5.15 | functional 4.5 | pass; unchanged. The dark tints now alias their status step with `app.prism.alpha` |
| `text.on-inverse` on `bg.fill.inverse` | Ink pill with white, white pill with ink (A.2: 19.30) | white on `neutral.950`; `neutral.950` on white | 19.30 | 19.30 | 19.30; 19.30 | functional 4.5 | pass; unchanged. Also the look of a selected glass Surface under the fallback (ADR-0022 §1.6) |
| `text.on-accent` on `bg.fill.accent` | White on the solar 500: about 2.3:1; Arvion carries white on #4E6CCD at 4.83 (§3.7) | ink on `accent.300` #FFC07A; ink on `accent.500` #F39444 (brand slots) | 12.01 | 8.39 | 12.01; 8.39 | functional 4.5 | pass; substitute from the seed: the accent fill carries ink, never white |
| `text.on-accent-strong` on `bg.fill.accent-strong` | White on #DD7A24: 3.05:1 (§3.7). The pair was missing and dark claimed "≥ 18 px" (critic G-13; visual-dna B14) | white on `accent.700` #B8561A; white on `accent.600` #DD7A24 | 4.78 | 3.05 | 4.78; 3.05 | light: functional 4.5; dark: functional at ≥ 24 px, 3.0 | pass; new pair in P1-6. Dark white text only at the large tier (B14, reworded in P1-2) |
| `text.on-badge` on `bg.fill.critical` | Pure red #FF0000 / #FF0004 under white 11 px: 4.0:1 (Vexto traffic §10.4, §11.15) | white on `status.danger.badge` #E5252A | 4.53 | 4.53 | 4.53; 4.53 | functional 4.5 | pass at 4.536, the tightest text pair; lifted in the seed. Any lighter badge red fails |
| `text.on-glass` · `on-glass-secondary` · `on-glass-tertiary` on `material.glass.dark.fill` | White 55–60 % captions on bright glass: 1.9–2.8:1 (Hydroflask, Vexto incident; §3.7). Seeded check: white only, over #283126 and #5B6366 (A.3: 17.20 / 12.80 light, 16.68 / 12.75 dark) | white · white 78 % · white 64 % over smoke: #0A0C08 at 55 % (light), #101410 at 60 % (dark) | 8.96 · 6.22 · 4.80 | 9.30 · 6.43 · 4.93 | 8.96 · 6.22 · 4.80; 9.30 · 6.43 · 4.93 | functional 4.5 | pass; ADR-0022 §3 adds the 78 % and 64 % tokens and the backdrops #959595 and the vivid set. Worst case: over #959595 |
| `text.on-glass` on `material.glass.dark.chip` · `material.glass.cell` | Seeded dark chip white 16 % and cell white 20 %: 4.25 and 3.89 over #5B6366 (ADR-0022 F10), 1.91 and 1.84 over today's backdrop set; the light-scheme chip (#0A0C08 at 35 %) 3.34 over the seeded vivid set | smoke at 35 %: #0A0C08 (light), #101410 (dark); light gains a cell | 5.84 · 5.84 | 5.61 · 5.61 | 5.84 · 5.84; 5.61 · 5.61 | functional 4.5 | pass; substitute from ADR-0022 §3.4 (smoked fills), applied in P1-2 |
| `text.on-glass-light` on `material.glass.light.fill` · `.chip`, dark scheme, over #283126 and #3A3A3A | White on white 26 % over OKLCH L 0.35: 5.14; white 78 % captions 3.85, and 4.32 over #283126 (§7.3, B6) | white `neutral.0`, no alpha tones | — | 5.15 · 6.94 | —; 5.15 · 6.94 | functional 4.5 | pass; substitute from ADR-0022 §3 (B6): no dimmed text on light glass |
| `text.on-glass-light` on `material.glass.light.fill` · `.chip`, light scheme, over #555555 and the light vivid set | White on white 30 % / 25 % over the light vivid stops: at most 3.74 / 4.22 (ADR-0022 F9); 1.33 / 1.36 over the seeded olive end | ink `neutral.950` #0D0E11 | 5.15 · 4.57 | — | 5.15 · 4.57; — | functional 4.5 | pass; substitute from ADR-0022 §3.2 (ink on light glass in light). The chip holds 4.57 over sky's darkest stop, the bound of F16 |
| `text.on-vivid` on `gradient.vivid.*`, V1 (`stops: "all"`, ≥ 24 px) | Seeded stops, minimum 1.51 (olive's light end) in light and 2.19 (navy-cyan's end) in dark; text-safe zones instead of a rule (§5.2) | white on the retuned stops (§5) | 3.05 | 3.05 | 3.05; 3.05 | functional at ≥ 24 px, 3.0 | pass; retuned in P1-1 (ADR-0022 §4) |
| `text.on-vivid` on `gradient.vivid.*`, V2 (`region: "card-header"`) | Seeded minimum 2.46 (orchid, whose light stop sat under the header) in light, 6.92 in dark (F12) | white on the retuned stops (§5) | 4.55 | 6.92 | 4.55; 6.92 | functional 4.5 | pass; retuned in P1-1 |
| `border.strong` on `bg.page` · `bg.surface` · `bg.surface.raised` | Seeded ink 30 %: 2.01:1 on white (A.2 #29, B1). Dark white 35 %: 3.22 | ink at 45 %; white 35 %. IC: ink 60 %; white 60 % | 3.02 · 3.08 · 3.07 | 3.18 · 3.21 · 3.16 | 4.88 · 5.06 · 5.01; 7.25 · 6.83 · 6.49 | boundary 3.0 | pass; raised in P1-2 (B1); the page and raised pairs are new in P1-6. Not a 3:1 edge on `bg.surface.nested` (§8.2) |
| `border.boundary` on the same three | Light: ring #C8C8C8 1.7:1 (Credit Karma), hairline 12 % 1.3:1 (CreditPros) (§3.7). Dark seeded white 30 %: 2.71 on surface-1, 2.64 on the page (B2) | `neutral.500` #7E838F; white 36 % | 3.39 · 3.79 · 3.67 | 3.29 · 3.32 · 3.26 | 3.39 · 3.79 · 3.67; 3.29 · 3.32 · 3.26 | boundary 3.0 | pass; light lifted in the seed, dark raised in P1-2 (B2); all three pairs are new in P1-6 |
| `border.focus` on the same three | Seeded ink and white (A.2 #30–31) | `neutral.950`; `neutral.0` | 17.24 · 19.30 · 18.66 | 19.30 · 16.95 · 15.58 | 17.24 · 19.30 · 18.66; 19.30 · 16.95 · 15.58 | boundary 3.0 | pass; unchanged; the raised pair is new in P1-6 |
| `chart.axis` on `chart.plot`, over the page, a card or a raised surface | Light #B7B7B9–#C8C8C8 (CreditPros): 2.0–1.7:1; dark white 40–45 %: 3.6–4.4:1 (§3.7). A.2 checked it on `bg.surface`: 6.31 / 5.96 | `neutral.600` on the white plot; white 55 % on the white 6 % plot | 6.31 | 5.12 | 6.31; 5.12 | functional 4.5 | pass; lifted in the seed. The dark minimum, 5.12, is the plot over a raised surface, checked since P1-6 (critic G-14) |
| `chart.series.1` … `.6` on `chart.plot`, same underlays | Seeded §3.4 set on `bg.surface` (A.2: 19.17 · 4.79 · 4.83 · 3.96 · 4.92 · 4.70 light, 16.95 · 7.37 · 4.85 · 8.38 · 6.78 · 9.65 dark) | light ink, `accent.700`, #4E6CCD, #1F8F80, #A64FA3, #6E7A22; dark white, `accent.500`, #6B84E0, #5BC8B5, #D48BD0, #D9C27A | 19.30 · 4.78 · 4.82 · 3.96 · 4.91 · 4.69 | 13.03 · 5.66 · 3.72 · 6.44 · 5.21 · 7.41 | 19.30 · 4.78 · 4.82 · 3.96 · 4.91 · 4.69; 13.03 · 5.66 · 3.72 · 6.44 · 5.21 · 7.41 | boundary 3.0 | pass. Checked on the plot since P1-6 (critic G-14); the dark minima are over a raised surface. Slots 1 and 2 alias ramp steps (ADR-0020 §4), so light slot 1 is #0D0E11 (19.30) |
| `chart.target` on `chart.plot`, same underlays | Seeded ink 30 % (#B7B7B8 on white, 2.0:1; critic G-14); dark white 60 % | ink at 30 %; white 60 %. IC: ink 60 %; white 85 % | **2.01 FAIL** | 5.77 | 5.06; 9.88 | boundary 3.0 | **FAIL in light** and light RT, both brands; new pair in P1-6, open (§8.1) |
| `chart.comparison` on `chart.plot`, same underlays | Seeded ink 30 %; dark white 40 % | ink at 30 %; white 40 %. IC: ink 60 %; white 60 % | **2.01 FAIL** | 3.45 | 5.06; 5.77 | boundary 3.0 | **FAIL in light** and light RT, both brands; new pair in P1-6, open (§8.1) |
| `chart.now` on `chart.plot`, dark only | `accent.500`: 7.37 on surface-1 in dark; 2.30 on white in light (B3) | `accent.500` #F39444 | — | 5.66 | —; 5.66 | boundary 3.0 | pass in dark. Light is not a pair: the light marker is a redundant mark that always carries its value (B3); a light mark that alone carries meaning uses `accent.700` (4.79) |

## 3. The seeded palette under today's check

Each cell shows the seeded value, an arrow, then today's value.

- **✗** marks a failure.
- **n/a** means the token did not exist in the seeded tree.
- **—** means the pair is not evaluated in that scheme.

The table lists every pair whose verdict or ratio changed, plus the pairs that fail in both trees. Every other pair gives the same ratio in both trees.

| Pair | Light | Dark | Light IC | Dark IC | Light RT | Dark RT | Change |
|---|---|---|---|---|---|---|---|
| `text.on-glass on material.glass.dark.fill · over [#283126, #5B6366, #959595, gradient.vivid.*]` | 5.85 → 8.96 | 7.90 → 9.30 | 5.85 → 8.96 | 7.90 → 9.30 | 17.60 → 8.96 | 14.77 → 9.30 | the base minima rise because the retuned vivid set is darker; the seeded RT contexts had replaced the fill with near-opaque values, which ADR-0022 deleted (see §6) |
| `text.on-glass-secondary on material.glass.dark.fill · over [#283126, #5B6366, #959595, gradient.vivid.*]` | n/a → 6.22 | n/a → 6.43 | n/a → 6.22 | n/a → 6.43 | n/a → 6.22 | n/a → 6.43 | token added by ADR-0022 §3.2 (P1-2) |
| `text.on-glass-tertiary on material.glass.dark.fill · over [#283126, #5B6366, #959595, gradient.vivid.*]` | n/a → 4.80 | n/a → 4.93 | n/a → 4.80 | n/a → 4.93 | n/a → 4.80 | n/a → 4.93 | token added by ADR-0022 §3.2 (P1-2) |
| `text.on-glass on material.glass.dark.chip · over [#283126, #5B6366, #959595, gradient.vivid.*]` | 3.34 ✗ → 5.84 | 1.91 ✗ → 5.61 | 3.34 ✗ → 5.84 | 1.91 ✗ → 5.61 | 17.60 → 5.84 | 13.39 → 5.61 | dark chip white 16 % → smoke #101410 at 35 % (ADR-0022 §3.4, P1-2); the light chip (unchanged) passes because V1 retuned the vivid set it sits on; RT: the seeded near-opaque fills are gone, Surface draws the fallback |
| `text.on-glass on material.glass.cell · over [#283126, #5B6366, #959595, gradient.vivid.*]` | n/a → 5.84 | 1.84 ✗ → 5.61 | n/a → 5.84 | 1.84 ✗ → 5.61 | n/a → 5.84 | 12.18 → 5.61 | dark cell white 20 % → smoke at 35 %; light cell added (ADR-0022 §2.5, P1-2); RT as above |
| `text.on-glass-light on material.glass.light.fill · over [#283126, #3A3A3A] · schemes: dark` | — | n/a → 5.15 | — | n/a → 5.15 | — | n/a → 5.15 | token added by ADR-0022 §3.2 (seeded light glass used white `text.on-glass`, same value in dark) |
| `text.on-glass-light on material.glass.light.chip · over [#283126, #3A3A3A] · schemes: dark` | — | n/a → 6.94 | — | n/a → 6.94 | — | n/a → 6.94 | as above |
| `text.on-glass-light on material.glass.light.fill · over [#555555, gradient.vivid.*] · schemes: light` | n/a → 5.15 | — | n/a → 5.15 | — | n/a → 5.15 | — | token added: ink, where the seeded white failed (historical rows in §6) |
| `text.on-glass-light on material.glass.light.chip · over [#555555, gradient.vivid.*] · schemes: light` | n/a → 4.57 | — | n/a → 4.57 | — | n/a → 4.57 | — | as above |
| `text.on-vivid on gradient.vivid.* · stops: all · >= 24 px` | 1.51 ✗ → 3.05 | 2.19 ✗ → 3.05 | 1.51 ✗ → 3.05 | 2.19 ✗ → 3.05 | 1.51 ✗ → 3.05 | 2.19 ✗ → 3.05 | six gradients retuned in P1-1 (§5) |
| `text.on-vivid on gradient.vivid.* · region: card-header` | 2.46 ✗ → 4.55 | 6.92 → 6.92 | 2.46 ✗ → 4.55 | 6.92 → 6.92 | 2.46 ✗ → 4.55 | 6.92 → 6.92 | orchid, olive and rose retuned in P1-1 (§5) |
| `border.strong on bg.page` | 1.98 ✗ → 3.02 | 3.18 → 3.18 | 4.84 → 4.88 | 7.25 → 7.25 | 1.98 ✗ → 3.02 | 3.18 → 3.18 | light ink 30 % → 45 % (B1, P1-2) |
| `border.strong on bg.surface` | 2.00 ✗ → 3.08 | 3.21 → 3.21 | 5.02 → 5.06 | 6.83 → 6.83 | 2.00 ✗ → 3.08 | 3.21 → 3.21 | as above |
| `border.strong on bg.surface.raised` | 1.99 ✗ → 3.07 | 3.16 → 3.16 | 4.97 → 5.01 | 6.49 → 6.49 | 1.99 ✗ → 3.07 | 3.16 → 3.16 | as above |
| `border.boundary on bg.page` | 3.39 → 3.39 | 2.64 ✗ → 3.29 | 3.39 → 3.39 | 2.64 ✗ → 3.29 | 3.39 → 3.39 | 2.64 ✗ → 3.29 | dark white 30 % → 36 % (B2, P1-2) |
| `border.boundary on bg.surface` | 3.79 → 3.79 | 2.71 ✗ → 3.32 | 3.79 → 3.79 | 2.71 ✗ → 3.32 | 3.79 → 3.79 | 2.71 ✗ → 3.32 | as above |
| `border.boundary on bg.surface.raised` | 3.67 → 3.67 | 2.69 ✗ → 3.26 | 3.67 → 3.67 | 2.69 ✗ → 3.26 | 3.67 → 3.67 | 2.69 ✗ → 3.26 | as above |
| `chart.series.1 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 19.16 → 19.30 | 13.03 → 13.03 | 19.16 → 19.30 | 13.03 → 13.03 | 19.16 → 19.30 | 13.03 → 13.03 | light slot 1 #0E0F12 → alias of `neutral.950` #0D0E11 (ADR-0020 §4, P1-1) |
| `chart.target on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 2.00 ✗ → 2.01 ✗ | 5.77 → 5.77 | 5.02 → 5.06 | 9.88 → 9.88 | 2.00 ✗ → 2.01 ✗ | 5.77 → 5.77 | unchanged apart from the ink alias (#0E0F12 → #0D0E11); fails in both trees (critic G-14) |
| `chart.comparison on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 2.00 ✗ → 2.01 ✗ | 3.45 → 3.45 | 5.02 → 5.06 | 5.77 → 5.77 | 2.00 ✗ → 2.01 ✗ | 3.45 → 3.45 | as above |

visual-dna Appendix A expected every seeded pair to pass except `border.strong` in light (its #29, B1). Today's check finds more, for four reasons:

- it checks the dark boundary pairs, which Appendix A listed only as informative (its A.5, B2);
- it evaluates glass over ADR-0022's backdrop set, which includes the vivid stops;
- it applies V1 and V2 instead of the declared zones;
- it adds the chart-line pairs of critic G-14.

Appendix 2 matches each Appendix A row against today's ratio.

## 4. What P1-1 and P1-2 changed to comply

The table below comes from the P1-1 and P1-2 commit, `git show f8aa0b1 -- tokens/`, compared with the resolved values of both trees. Every `sys.color.*` and `sys.material.*` value that differs between the trees is covered, in all six contexts.

| Change | Tokens (contexts) | Seeded | Now | Effect on the pairs | Why |
|---|---|---|---|---|---|
| `border.strong` alpha | light, light RT | ink #0E0F12 at 30 % | `neutral.950` at 45 % | page 1.98 → 3.02, surface 2.00 → 3.08, raised 1.99 → 3.07 | B1: outline controls such as the ghost Button need the boundary tier |
| `border.boundary` alpha | dark, dark IC, dark RT | white 30 % | white 36 % | page 2.64 → 3.29, surface 2.71 → 3.32, raised 2.69 → 3.26 | B2: the token's name promises 3:1 |
| Dark chip and cell | `material.glass.dark.chip`, `material.glass.cell` (dark, dark IC) | white 16 %, white 20 % | smoke #101410 at 35 % | 1.91 and 1.84 → 5.61 over the full backdrop set | ADR-0022 F10, §3.4: over a vivid stop at 3:1 against white, no white tint passes |
| Light cell | `material.glass.cell` (light) | did not exist | smoke #0A0C08 at 35 % | 5.84 | ADR-0022 §2.5 (ARCHITECTURE S4) |
| Glass foregrounds | `text.on-glass-light`, `text.on-glass-secondary`, `text.on-glass-tertiary` (all contexts) | did not exist. Text.yaml mapped secondary to white 78 % and tertiary to 64 %, with no token behind either | ink in light and white in dark; white 78 %; white 64 % | light-scheme light glass: white 1.33 (seeded) → ink 5.15 | ADR-0022 §3.2, B6, F9 |
| Reduced-transparency deltas | every `sys.material.glass.*` in light RT and dark RT | light: dark glass `neutral.900`, light glass `neutral.0`, scrim alpha 0. Dark: #1C1C1F, #232426 and #2A2B2E at 92 % | the base values; Surface draws the fallback | the RT contexts equal the base contexts in all 762 evaluations | ADR-0022 §1.4, §1.5, F1, F7; B21 |
| Ink overlays and series slot 1 | 11 light tokens: `bg.surface.nested`, `bg.fill.neutral.subtle`, `icon.primary`, `border.hairline`, `border.strong`, `chart.series.1`, `chart.comparison`, `chart.comparison-2`, `chart.target`, `chart.grid`, `chart.band` (light, light IC, light RT) | #0E0F12 literals | aliases of `neutral.950` (#0D0E11), with `app.prism.alpha` on the overlays | at most +0.14 (series 1: 19.16 → 19.30); no verdict changes | ADR-0020 §3, §4 (ΔE2000 0.22 to 0.23) |
| Vivid gradients | six of the eight `ref.gradient.vivid.*` | §5 | §5 | V1 1.51 / 2.19 → 3.05 / 3.05; V2 in light 2.46 → 4.55 | ADR-0022 §4; B5, F11, F12 |
| Default vivid | `sys.gradient.vivid.default` and slots 1 to 4 (new) | Card and Surface bound `gradient.vivid.orchid` in both schemes | sky in light, plum-dusk in dark | V2 5.00 and 10.42 | ADR-0022 §4.4, ADR-0024 §6 |
| Brand slots | `bg.page`, `bg.fill.accent`, `text.on-accent`, `text.accent` | direct aliases of ramp steps | aliases of `ref.color.slot.*`, with the same values | none. Every slot sits in a pair, so each brand's slot values are checked | ADR-0020 §2 |
| Typography weights | `ref.type.*` | thin weights only in descriptions ("display.xl may drop to 200", "metric.xl 200 on dark ≥ 32 px") | `metric.xl` `darkWeight` 200. The build derives the Increase Contrast floor (400) and the Bold Text weights | not a color pair. `type/thin-weight`, `type/light-weight` and `type/contrast-floor` pass in the same build | ADR-0021 §2 to §4; B7 to B9 |
| Descriptions | light `accent`, `icon.accent`, `chart.now`; dark text tiers; `bg.fill.accent-strong`; `bg.surface.nested` | "≥ 18 px", and ratios that were rounded or wrong | ADR-0011's large tier and the computed ratios | none | B3, B11 to B14 |

## 5. Vivid gradients before and after

The seeded stops failed the anatomy that Card pins to its corners (visual-dna §5.3, B5). ADR-0022 §4 replaced the text-safe zones with two checks that every gradient of every brand must pass, V1 and V2. P1-1 then retuned the stops. It kept each hue, lowered lightness and chroma where a stop was too light, and moved orchid's dark end under the header.

| Gradient | Scheme, angle | Seeded stops: white contrast | Retuned stops: white contrast | V1 seeded → now | V2 seeded → now |
|---|---|---|---|---|---|
| `sky` | light, 165° | #4A4C78 @0 8.08 · #556BA6 @0.5 5.19 · #8BA9C0 @1 2.46 | #4A4C78 @0 8.08 · #556BA6 @0.5 5.19 · #7C97AC @1 3.05 | 2.46 ✗ → 3.05 | 4.92 → 5.00 |
| `orchid` | light, 165° | #E88BD0 @0 2.32 · #B96CB4 @0.45 3.57 · #6C5A66 @1 6.37 | #6C5A66 @0 6.37 · #A35E9E @0.55 4.50 · #CA78B5 @1 3.05 | 2.32 ✗ → 3.05 | 2.46 ✗ → 4.55 |
| `olive` | light, 135° | #4F5A38 @0 7.36 · #8A9C42 @0.55 3.03 · #C4DD6A @1 1.51 | #4F5A38 @0 7.36 · #6E7D33 @0.65 4.53 · #899B49 @1 3.05 | 1.51 ✗ → 3.05 | 2.57 ✗ → 4.55 |
| `rose` | light, 135° | #8E5A55 @0 5.60 · #B3706A @0.5 3.85 · #C9927A @1 2.66 | #8E5A55 @0 5.60 · #A36660 @0.65 4.54 · #BB8871 @1 3.05 | 2.66 ✗ → 3.05 | 3.45 ✗ → 4.55 |
| `plum-dusk` | dark, 150° | #1E1226 @0 17.95 · #3A1F3F @0.4 14.50 · #5B4A7A @0.75 7.76 · #6F7FC8 @1 3.78 | unchanged | 3.78 → 3.78 | 10.42 → 10.42 |
| `ember-night` | dark, 160° | #3D1A06 @0 15.57 · #7A3A1E @0.45 8.56 · #C9642F @0.85 3.92 · #E38B3A @1 2.61 | #3D1A06 @0 15.57 · #7A3A1E @0.45 8.56 · #C9642F @0.85 3.92 · #D28035 @1 3.05 | 2.61 ✗ → 3.05 | 6.92 → 6.92 |
| `forest-moss` | dark, 170° | #0F1A14 @0 17.82 · #1B2922 @0.35 15.14 · #4E6040 @0.8 6.83 · #6E7B3A @1 4.60 | unchanged | 4.60 → 4.60 | 11.24 → 11.24 |
| `navy-cyan` | dark, 180° | #252E3F @0 13.62 · #223545 @0.45 12.62 · #5DA8B9 @0.75 2.70 · #80B8C4 @1 2.19 | #252E3F @0 13.62 · #223545 @0.45 12.62 · #4D8E9C @0.75 3.72 · #6B9BA6 @1 3.05 | 2.19 ✗ → 3.05 | 8.14 → 9.04 |

- **Default pair.** Sky needed only its light end: #8BA9C0 (2.46) became #7C97AC. Plum-dusk passed unchanged. ADR-0022 §4.4 makes this pair the default (`gradient.vivid.default`), so the default look moves least.
- **Orchid** now starts dark: its old last stop, #6C5A66, is stop 0. The seeded pale pink stop #E88BD0 (2.32), which sat under the header, is gone.
- **Olive and rose** keep their dark start. Their mids moved from 0.55 and 0.50 to 0.65, and darkened until the header block holds 4.5:1.
- **Ember-night and navy-cyan** deepened the stops that F11 lists.
- **Forest-moss and plum-dusk** are unchanged.
- **Light ends.** Every retuned light end sits at 3.05, just above V1's 3.0.
- **The ink bound (ADR-0022 §4.3, F16).** A light stop may not get so dark that ink on light glass over it drops below 4.5:1. The darkest light stop is still sky@0 at 8.08:1, where ink on the light chip holds 4.57 (pair 45).

Where each gradient's minimum lies today:

| Gradient | V1 worst case now | V2 worst case now |
|---|---|---|
| `sky` | stop 2 srgb: #ffffff on #7c97ac | 320×200 p24 a40 t=0.533 oklab: #ffffff on #576ea6 |
| `orchid` | stop 2 srgb: #ffffff on #ca78b5 | 320×200 p24 a40 t=0.533 oklab: #ffffff on #a15e9d |
| `olive` | stop 2 srgb: #ffffff on #899b49 | 320×200 p16 a32 t=0.646 srgb: #ffffff on #6e7c33 |
| `rose` | stop 2 srgb: #ffffff on #bb8871 | 320×200 p16 a32 t=0.646 srgb: #ffffff on #a36660 |
| `plum-dusk` | stop 3 srgb: #ffffff on #6f7fc8 | 320×200 p16 a32 t=0.592 srgb: #ffffff on #4c375f |
| `ember-night` | stop 3 srgb: #ffffff on #d28035 | 320×200 p24 a40 t=0.554 srgb: #ffffff on #8f4522 |
| `forest-moss` | stop 3 srgb: #ffffff on #6e7b3a | 166×166 p24 a40 t=0.528 srgb: #ffffff on #2f3f2e |
| `navy-cyan` | stop 3 srgb: #ffffff on #6b9ba6 | 166×166 p24 a40 t=0.530 srgb: #ffffff on #2e4d5c |

## 6. Glass before and after

§2 lists the glass pairs. The table below adds seeded pairs that no longer exist, because the seeded system rendered them before ADR-0022 changed its foregrounds and fallbacks. Each was evaluated with the seeded tokens and today's code.

| Seeded pair | Backdrops | Light | Dark | Light RT | Dark RT | What replaced it |
|---|---|---|---|---|---|---|
| `text.on-glass` on `material.glass.light.fill` | #555555, gradient.vivid.* | 1.33 ✗ | — | 1.00 ✗ | — | ink `text.on-glass-light`: 5.15. Under RT, Surface draws opaque `raised` instead (ADR-0022 §1) |
| `text.on-glass` on `material.glass.light.chip` | #555555, gradient.vivid.* | 1.36 ✗ | — | 1.00 ✗ | — | ink `text.on-glass-light`: 4.57. Under RT, as above |
| `text.on-glass` on `material.glass.dark.fill` | #283126, #5B6366 | 12.79 | 12.75 | 17.60 | 15.95 | the ADR-0022 §3.3 set adds #959595 and the vivid stops: 8.96 light, 9.30 dark |
| `text.on-glass` on `material.glass.dark.chip` | #5B6366 | — | 4.24 ✗ | — | 14.57 | smoke #101410 at 35 %: 9.43 over #5B6366, 5.61 over the full set |
| `text.on-glass` on `material.glass.cell` | #5B6366 | — | 3.89 ✗ | — | 13.31 | smoke #101410 at 35 %: 9.43 over #5B6366, 5.61 over the full set |

- **Light glass in the light scheme cannot carry white text.** The white fill lightens the vivid beneath it, so white text gets worse as the glass gets stronger (F9). ADR-0022 §3.2 therefore gives light glass its own foreground, `text.on-glass-light`: ink in light and white in dark, with no alpha tones.
- **Dark glass needs a dark enough backdrop.** Its white, 78 % and 64 % tones hold 4.5:1 over #959595, the lightest backdrop on which white keeps 3:1. The vivid set is safe because V1 keeps white at 3:1 or more at every point of every gradient. A brighter image is the app's to darken (ADR-0022 §3.3, F15).
- **The seeded reduced-transparency values were not a fallback.**
  - Dark glass kept 8 % of the backdrop at alpha 0.92 (F7).
  - Light-scheme light glass became opaque white under white text: 1.00:1.
  - The light scrim went to alpha 0.

  ADR-0022 §1 replaced all of it with one fallback that Surface draws: opaque `raised` over the page, or `inverse` when the Surface is selected. Surface draws it on watchOS, under Reduce Transparency, under Increase Contrast and over an invalid backdrop. The `text.* on bg.surface.raised` pairs check exactly that appearance. All of them pass: the functional minimum is 5.07 (`text.critical`, dark) and `text.dimmed` reaches 3.67 at ≥ 24 px. `text.on-inverse` on `bg.fill.inverse` gives 19.30.

## 7. Substitutes chosen and why

### 7.1 Lifted in the seed (visual-dna §3.7)

The seeded palette already replaced every reference value that failed its tier. The rule is ADR-0011's: tertiary or decorative intent changes the token, never the threshold. The lifts are:

- secondary and tertiary text move to `neutral.600`, and to white 64 % and 55 % in dark;
- the DNA's own #7E838F is kept only as `text.dimmed`, at ≥ 24 px;
- accent text uses `accent.800`, and the accent fill carries ink instead of white;
- status text gets separate AA steps, apart from the dots;
- the badge red is #E5252A;
- dark critical text is lifted to #FF5A55;
- control boundaries use `neutral.500`;
- the chart axis uses `neutral.600` and white 55 %.

§2 gives each lift's reference measurement next to today's ratio.

### 7.2 ADR-0022: materials

- **One glass fallback**, opaque `raised` over the page, chosen by Surface (ADR-0022 §1).
  - **Why this fallback.**
    - Apple asks for opaque backgrounds under Reduce Transparency (F1).
    - Alpha 0.92 is not opaque, and the seeded light values put white text on white (F7).
    - A token-level fallback would make the Increase Contrast and Reduce Transparency deltas write the same ids, which breaks their disjointness. It also could not reach the watch or keep a selection visible.
    - `solid` would merge a floating card into the cards around it.
  - **Contrast.** Every text tone passes on `raised` (§6 of this file).
- **Smoked chips and cells** (ADR-0022 §3.4), because no white tint passes over a vivid stop that sits at 3:1 against white (F10). This is a visible change from the references' white-tint chips.
- **Light-glass foregrounds.**
  - Ink in the light scheme, where white tops out at 3.74 on the fill and 4.22 on the chip (F9). Only ink passes there (ADR-0022, Alternatives).
  - In the dark scheme, 100 % white on light glass, because 78 % captions reach only 3.85 at the backdrop limit (F8, B6).
- **Backdrop limits the app must respect.** Surface cannot measure an image, so these are the app's job (ADR-0022 §3.3):
  - dark glass only over backdrops on which white holds 3:1;
  - in the dark scheme, light glass only over imagery at OKLCH L 0.35 or darker, never over vivid;
  - in the light scheme, light glass only over vivid or over imagery at OKLCH L 0.45 or lighter.
- **V1 and V2 instead of text-safe zones** (ADR-0022 §4).
  - **Why.** Zones in *t* move with the card's aspect ratio. They would give each gradient a different anatomy, and they would make agents pick a gradient to fit the content.
  - **Cost.** The light vivid set lost its brightest corners: the lime, pastel pink, tan and pale steel ends.
  - **Rejected.** Ink text on the light gradients: `text.on-vivid` would then depend on the gradient.

### 7.3 ADR-0021: typography

ADR-0011's Context names the references' ultra-thin grey numerals as a legibility risk, and a contrast ratio measures color, not stroke weight. ADR-0021 therefore bounds the weights as well as the colors. `ir/typography.ts` checks every rule below over all permutations, and the build in this run reports no violation.

- **Weight 300** only at 20 px or more (ADR-0021 §2).
- **Thin weights (100 or 200)** only as the dark-scheme `darkWeight` of a `type.metric.*` role of at least 34 px. Today exactly one role qualifies: `metric.xl`, 48 px, weight 200.
- **Increase Contrast** raises every role to at least 400 (ADR-0021 §3).
- **Bold Text** turns 300 and below into 400, and adds 200 to every other weight, up to 900.
- **The brand type scale** is bounded to [1, 1.25], so the 12 px functional roles never shrink below 12 px (ADR-0021 §6).
- **Dimmed tones.** `text.dimmed` stays a ≥ 24 px tone (ADR-0011's decorative tier). On vivid, on light glass and on inverse, no tone is dimmed with alpha at all: hierarchy comes from size (ADR-0022 §3.1).

### 7.4 ADR-0020: every brand is checked

- **Brand slots.** A brand may re-color the four slots and the series (ADR-0020 §2, §4) and the gradients (ADR-0022 §4.5). Every slot sits in a text pair, and every series slot in a boundary pair.
- **Gradients.** Every gradient must pass V1, V2 and the glass-over-vivid pairs.
- **Enforcement.** `contrast:check` runs each pair for every brand in all six colorScheme contexts (ADR-0020 rule 10). A brand whose values fail does not build.
- **Status hues** are system-owned (ADR-0020 §4). A brand can move a status pair only through its page slot, and the same pairs check that.

## 8. Open items

### 8.1 Light chart target and comparison lines fail (critic G-14)

This finding blocks the P1-6 gate.

- **The failure.** In light, `chart.target` and `chart.comparison` are ink at 30 % on the white plot: 2.01:1.
- **Why the tier applies.** ADR-0011 puts chart lines that carry meaning at the 3:1 boundary tier. ADR-0007 rule 2 makes the target line mandatory.
- **What already passes.** The light IC values (ink 60 %: 5.06) and all dark values pass.

Two ways out:

1. **Raise both lines in light to ink at alpha 0.445 or more.** 0.44 gives 2.99:1, and 0.45 gives 3.08:1 on the white plot, the same value B1 chose for `border.strong`.
   - The change goes in `tokens/sys/color/light.tokens.json` (P1-2's file).
   - The lines stay grey (#929394) and keep their distinct dash patterns: grid 4/6 at 10 %, target 8/6.
   - `chart.comparison-2` (15 %) stays decorative.
2. **Model "relief" in the pairs file**, as critic G-14 and `dataviz-design.md` rule 13 propose. A line that always carries an inline label or ships a table view may sit below 3:1. The tool has no `relief` field today. P1-6 records it as a `test.todo` that needs an ADR, because ADR-0011 has no relief tier.

Option 1 is the smaller change, and it is the one this audit recommends. It is also what P1-6's `tools/contrast/check.test.ts` expects, as it stands in the working tree: the test holds both lines to the boundary tier in every scheme, and it says a failing pair is fixed in the tokens, never excused. The owner chooses.

Critic G-14's other open question, whether `chart.plot` should become opaque in dark, is untouched. The pairs now check the dark plot (white 6 %) over the page, a card and a raised surface, and every dark chart pair passes there. The lowest are the comparison line at 3.45 and `chart.series.3` at 3.72.

### 8.2 Boundaries on nested fills

No pair checks `bg.surface.nested`, which is the filled control and the control on a card (critic G-13 item 5). Evaluated with the same code (Appendix 3), both edges miss 3:1 on some nested fill in both schemes:

| Edge | Light, nested over the page | Light, nested over a card | Dark, nested over the page | Dark, nested over a card |
|---|---|---|---|---|
| `border.strong` | 2.95 | 3.02 | 3.08 | 2.88 |
| `border.boundary` | 2.99 | 3.34 | 3.17 | 2.96 |

- **Light.** `border.strong` would need ink at 0.46. For `border.boundary`, the next step, `neutral.600`, gives 4.97.
- **Dark.** `border.boundary` needs white at 0.365 or more; 0.38 gives 3.12.
- **Why ARCHITECTURE saw a pass in dark.** ARCHITECTURE §14 (P1-2) lays the dark nested fill directly on the page (#2A2B2E), where `border.boundary` reaches 3.18. A control on a card puts the same white 12 % over the card (#37383A), and that is where both dark edges fail.

The fix is to add the nested pairs to `contrast-pairs.json`, or to state that neither edge is used on a nested fill. P1-6's `check.test.ts` already records text on nested and overlay surfaces as a `test.todo` for a follow-up ticket, because adding such pairs today adds failing evaluations. The edges belong in the same ticket.

### 8.3 Marks the pairs file leaves out

These cases are informative only, in Appendix 3 and in visual-dna A.5:

- **Light status dots.** Success (2.77) and warning (1.77) sit on `bg.surface` below 3:1 (B4). The P4 StatusDot spec must give them the ink ring, the icon and the label.
- **Light accent marks.** `accent`, `icon.accent` and `chart.now` sit at 2.29 on white (B3). They are redundant marks, always paired with a value, sign or label.
- **Hairlines, grid and band** are structure only.

### 8.4 What the check does not see

- **Component states.** `accent.pressed`, `bg.fill.neutral.subtle` and disabled opacity are not in the pairs file.
- **`bg.surface.overlay`.**
- **The scrim over photographs**, and any text over imagery. That contrast depends on content, and ADR-0022 §3.3 leaves it to the app.
- **The runtime glass fallback.** It is tested in P3-1 and P3-4. The tokens show it only through the `raised` pairs.
- **ADR-0011's "19 px bold" large text.**

### 8.5 Documents that still call this file missing

These documents belong to other owners, who can now mark the item resolved:

- visual-dna B19;
- critic G-01, in §1 and in the §6 table;
- `docs/roadmap.md`, which sends "the a11y reconciliation" to the blueprint close-out (G-18).

## Appendix 1: `contrast:check` result per brand and scheme

The report's header, verbatim:

```text
Pairs: `tokens/contrast-pairs.json`. 67 pairs in 12 contexts (brands prism, prism-native × every colorScheme context): 762 evaluations, 8 failing, 0 other problems.

Thresholds (ADR-0011): functional 4.50, functional text ≥ 24 px 3.00, decorative (≥ 24 px only) 3.00, boundary 3.00. Translucent colors are composited source-over in gamma-encoded sRGB over `color.bg.page` or each backdrop; ratios are WCAG 2.x, rounded down.
```

`#` is the index of the pair in the `pairs` array of `tokens/contrast-pairs.json`. Ratios are rounded down. The report also names the worst case of every evaluation; §2, §5 and §6 quote the ones that matter.

### A1.1 Brand `prism`

| # | fg | bg | threshold | light | dark | light IC | dark IC | light RT | dark RT |
|--:|---|---|---|--:|--:|--:|--:|--:|--:|
| 0 | `color.text.primary` | `color.bg.page` | 4.50 functional | 17.24 | 19.30 | 17.24 | 19.30 | 17.24 | 19.30 |
| 1 | `color.text.primary` | `color.bg.surface` | 4.50 functional | 19.30 | 16.95 | 19.30 | 16.95 | 19.30 | 16.95 |
| 2 | `color.text.primary` | `color.bg.surface.raised` | 4.50 functional | 18.66 | 15.58 | 18.66 | 15.58 | 18.66 | 15.58 |
| 3 | `color.text.secondary` | `color.bg.page` | 4.50 functional | 5.63 | 8.13 | 8.72 | 12.36 | 5.63 | 8.13 |
| 4 | `color.text.secondary` | `color.bg.surface` | 4.50 functional | 6.31 | 7.59 | 9.76 | 11.17 | 6.31 | 7.59 |
| 5 | `color.text.secondary` | `color.bg.surface.raised` | 4.50 functional | 6.10 | 7.18 | 9.44 | 10.42 | 6.10 | 7.18 |
| 6 | `color.text.tertiary` | `color.bg.page` | 4.50 functional | 5.63 | 6.24 | 8.72 | 9.59 | 5.63 | 6.24 |
| 7 | `color.text.tertiary` | `color.bg.surface` | 4.50 functional | 6.31 | 5.95 | 9.76 | 8.83 | 6.31 | 5.95 |
| 8 | `color.text.tertiary` | `color.bg.surface.raised` | 4.50 functional | 6.10 | 5.69 | 9.44 | 8.31 | 6.10 | 5.69 |
| 9 | `color.text.dimmed` | `color.bg.page` | 3.00 decorative ≥ 24 px | 3.39 | 4.08 | 5.63 | 8.13 | 3.39 | 4.08 |
| 10 | `color.text.dimmed` | `color.bg.surface` | 3.00 decorative ≥ 24 px | 3.79 | 4.03 | 6.31 | 7.59 | 3.79 | 4.03 |
| 11 | `color.text.dimmed` | `color.bg.surface.raised` | 3.00 decorative ≥ 24 px | 3.67 | 3.93 | 6.10 | 7.18 | 3.67 | 3.93 |
| 12 | `color.text.accent` | `color.bg.page` | 4.50 functional | 5.73 | 8.39 | 9.20 | 8.39 | 5.73 | 8.39 |
| 13 | `color.text.accent` | `color.bg.surface` | 4.50 functional | 6.41 | 7.37 | 10.30 | 7.37 | 6.41 | 7.37 |
| 14 | `color.text.accent` | `color.bg.surface.raised` | 4.50 functional | 6.20 | 6.77 | 9.97 | 6.77 | 6.20 | 6.77 |
| 15 | `color.text.success` | `color.bg.page` | 4.50 functional | 5.17 | 9.38 | 5.17 | 9.38 | 5.17 | 9.38 |
| 16 | `color.text.success` | `color.bg.surface` | 4.50 functional | 5.79 | 8.24 | 5.79 | 8.24 | 5.79 | 8.24 |
| 17 | `color.text.success` | `color.bg.surface.raised` | 4.50 functional | 5.60 | 7.57 | 5.60 | 7.57 | 5.60 | 7.57 |
| 18 | `color.text.warning` | `color.bg.page` | 4.50 functional | 5.11 | 10.85 | 5.11 | 10.85 | 5.11 | 10.85 |
| 19 | `color.text.warning` | `color.bg.surface` | 4.50 functional | 5.73 | 9.53 | 5.73 | 9.53 | 5.73 | 9.53 |
| 20 | `color.text.warning` | `color.bg.surface.raised` | 4.50 functional | 5.54 | 8.76 | 5.54 | 8.76 | 5.54 | 8.76 |
| 21 | `color.text.critical` | `color.bg.page` | 4.50 functional | 5.41 | 6.29 | 5.41 | 6.29 | 5.41 | 6.29 |
| 22 | `color.text.critical` | `color.bg.surface` | 4.50 functional | 6.05 | 5.52 | 6.05 | 5.52 | 6.05 | 5.52 |
| 23 | `color.text.critical` | `color.bg.surface.raised` | 4.50 functional | 5.85 | 5.07 | 5.85 | 5.07 | 5.85 | 5.07 |
| 24 | `color.text.info` | `color.bg.page` | 4.50 functional | 5.37 | 6.67 | 5.37 | 6.67 | 5.37 | 6.67 |
| 25 | `color.text.info` | `color.bg.surface` | 4.50 functional | 6.01 | 5.86 | 6.01 | 5.86 | 6.01 | 5.86 |
| 26 | `color.text.info` | `color.bg.surface.raised` | 4.50 functional | 5.81 | 5.38 | 5.81 | 5.38 | 5.81 | 5.38 |
| 27 | `color.text.primary` | `color.bg.tint.accent` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 15.82 | 13.27 | 15.82 | 13.27 | 15.82 | 13.27 |
| 28 | `color.text.success` | `color.bg.tint.success` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.16 | 6.86 | 5.16 | 6.86 | 5.16 | 6.86 |
| 29 | `color.text.warning` | `color.bg.tint.warning` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.33 | 7.79 | 5.33 | 7.79 | 5.33 | 7.79 |
| 30 | `color.text.critical` | `color.bg.tint.critical` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.19 | 4.98 | 5.19 | 4.98 | 5.19 | 4.98 |
| 31 | `color.text.info` | `color.bg.tint.info` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.14 | 5.15 | 5.14 | 5.15 | 5.14 | 5.15 |
| 32 | `color.text.on-inverse` | `color.bg.fill.inverse` | 4.50 functional | 19.30 | 19.30 | 19.30 | 19.30 | 19.30 | 19.30 |
| 33 | `color.text.on-accent` | `color.bg.fill.accent` | 4.50 functional | 12.01 | 8.39 | 12.01 | 8.39 | 12.01 | 8.39 |
| 34 | `color.text.on-accent-strong` | `color.bg.fill.accent-strong` (schemes: light) | 4.50 functional | 4.78 | — | 4.78 | — | 4.78 | — |
| 35 | `color.text.on-accent-strong` | `color.bg.fill.accent-strong` (schemes: dark) | 3.00 functional ≥ 24 px | — | 3.05 | — | 3.05 | — | 3.05 |
| 36 | `color.text.on-badge` | `color.bg.fill.critical` | 4.50 functional | 4.53 | 4.53 | 4.53 | 4.53 | 4.53 | 4.53 |
| 37 | `color.text.on-glass` | `material.glass.dark.fill` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 8.96 | 9.30 | 8.96 | 9.30 | 8.96 | 9.30 |
| 38 | `color.text.on-glass-secondary` | `material.glass.dark.fill` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 6.22 | 6.43 | 6.22 | 6.43 | 6.22 | 6.43 |
| 39 | `color.text.on-glass-tertiary` | `material.glass.dark.fill` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 4.80 | 4.93 | 4.80 | 4.93 | 4.80 | 4.93 |
| 40 | `color.text.on-glass` | `material.glass.dark.chip` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 5.84 | 5.61 | 5.84 | 5.61 | 5.84 | 5.61 |
| 41 | `color.text.on-glass` | `material.glass.cell` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 5.84 | 5.61 | 5.84 | 5.61 | 5.84 | 5.61 |
| 42 | `color.text.on-glass-light` | `material.glass.light.fill` over #283126, #3A3A3A (schemes: dark) | 4.50 functional | — | 5.15 | — | 5.15 | — | 5.15 |
| 43 | `color.text.on-glass-light` | `material.glass.light.chip` over #283126, #3A3A3A (schemes: dark) | 4.50 functional | — | 6.94 | — | 6.94 | — | 6.94 |
| 44 | `color.text.on-glass-light` | `material.glass.light.fill` over #555555, `gradient.vivid.*` (schemes: light) | 4.50 functional | 5.15 | — | 5.15 | — | 5.15 | — |
| 45 | `color.text.on-glass-light` | `material.glass.light.chip` over #555555, `gradient.vivid.*` (schemes: light) | 4.50 functional | 4.57 | — | 4.57 | — | 4.57 | — |
| 46 | `color.text.on-vivid` | `gradient.vivid.*` stops: all | 3.00 functional ≥ 24 px | 3.05 | 3.05 | 3.05 | 3.05 | 3.05 | 3.05 |
| 47 | `color.text.on-vivid` | `gradient.vivid.*` region: card-header | 4.50 functional | 4.55 | 6.92 | 4.55 | 6.92 | 4.55 | 6.92 |
| 48 | `color.border.strong` | `color.bg.page` | 3.00 boundary | 3.02 | 3.18 | 4.88 | 7.25 | 3.02 | 3.18 |
| 49 | `color.border.strong` | `color.bg.surface` | 3.00 boundary | 3.08 | 3.21 | 5.06 | 6.83 | 3.08 | 3.21 |
| 50 | `color.border.strong` | `color.bg.surface.raised` | 3.00 boundary | 3.07 | 3.16 | 5.01 | 6.49 | 3.07 | 3.16 |
| 51 | `color.border.boundary` | `color.bg.page` | 3.00 boundary | 3.39 | 3.29 | 3.39 | 3.29 | 3.39 | 3.29 |
| 52 | `color.border.boundary` | `color.bg.surface` | 3.00 boundary | 3.79 | 3.32 | 3.79 | 3.32 | 3.79 | 3.32 |
| 53 | `color.border.boundary` | `color.bg.surface.raised` | 3.00 boundary | 3.67 | 3.26 | 3.67 | 3.26 | 3.67 | 3.26 |
| 54 | `color.border.focus` | `color.bg.page` | 3.00 boundary | 17.24 | 19.30 | 17.24 | 19.30 | 17.24 | 19.30 |
| 55 | `color.border.focus` | `color.bg.surface` | 3.00 boundary | 19.30 | 16.95 | 19.30 | 16.95 | 19.30 | 16.95 |
| 56 | `color.border.focus` | `color.bg.surface.raised` | 3.00 boundary | 18.66 | 15.58 | 18.66 | 15.58 | 18.66 | 15.58 |
| 57 | `color.chart.axis` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 4.50 functional | 6.31 | 5.12 | 6.31 | 5.12 | 6.31 | 5.12 |
| 58 | `color.chart.series.1` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 19.30 | 13.03 | 19.30 | 13.03 | 19.30 | 13.03 |
| 59 | `color.chart.series.2` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.78 | 5.66 | 4.78 | 5.66 | 4.78 | 5.66 |
| 60 | `color.chart.series.3` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.82 | 3.72 | 4.82 | 3.72 | 4.82 | 3.72 |
| 61 | `color.chart.series.4` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 3.96 | 6.44 | 3.96 | 6.44 | 3.96 | 6.44 |
| 62 | `color.chart.series.5` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.91 | 5.21 | 4.91 | 5.21 | 4.91 | 5.21 |
| 63 | `color.chart.series.6` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.69 | 7.41 | 4.69 | 7.41 | 4.69 | 7.41 |
| 64 | `color.chart.target` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | **2.01 FAIL** | 5.77 | 5.06 | 9.88 | **2.01 FAIL** | 5.77 |
| 65 | `color.chart.comparison` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | **2.01 FAIL** | 3.45 | 5.06 | 5.77 | **2.01 FAIL** | 3.45 |
| 66 | `color.chart.now` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` (schemes: dark) | 3.00 boundary | — | 5.66 | — | 5.66 | — | 5.66 |

### A1.2 Brand `prism-native`

| # | fg | bg | threshold | light | dark | light IC | dark IC | light RT | dark RT |
|--:|---|---|---|--:|--:|--:|--:|--:|--:|
| 0 | `color.text.primary` | `color.bg.page` | 4.50 functional | 17.24 | 19.30 | 17.24 | 19.30 | 17.24 | 19.30 |
| 1 | `color.text.primary` | `color.bg.surface` | 4.50 functional | 19.30 | 16.95 | 19.30 | 16.95 | 19.30 | 16.95 |
| 2 | `color.text.primary` | `color.bg.surface.raised` | 4.50 functional | 18.66 | 15.58 | 18.66 | 15.58 | 18.66 | 15.58 |
| 3 | `color.text.secondary` | `color.bg.page` | 4.50 functional | 5.63 | 8.13 | 8.72 | 12.36 | 5.63 | 8.13 |
| 4 | `color.text.secondary` | `color.bg.surface` | 4.50 functional | 6.31 | 7.59 | 9.76 | 11.17 | 6.31 | 7.59 |
| 5 | `color.text.secondary` | `color.bg.surface.raised` | 4.50 functional | 6.10 | 7.18 | 9.44 | 10.42 | 6.10 | 7.18 |
| 6 | `color.text.tertiary` | `color.bg.page` | 4.50 functional | 5.63 | 6.24 | 8.72 | 9.59 | 5.63 | 6.24 |
| 7 | `color.text.tertiary` | `color.bg.surface` | 4.50 functional | 6.31 | 5.95 | 9.76 | 8.83 | 6.31 | 5.95 |
| 8 | `color.text.tertiary` | `color.bg.surface.raised` | 4.50 functional | 6.10 | 5.69 | 9.44 | 8.31 | 6.10 | 5.69 |
| 9 | `color.text.dimmed` | `color.bg.page` | 3.00 decorative ≥ 24 px | 3.39 | 4.08 | 5.63 | 8.13 | 3.39 | 4.08 |
| 10 | `color.text.dimmed` | `color.bg.surface` | 3.00 decorative ≥ 24 px | 3.79 | 4.03 | 6.31 | 7.59 | 3.79 | 4.03 |
| 11 | `color.text.dimmed` | `color.bg.surface.raised` | 3.00 decorative ≥ 24 px | 3.67 | 3.93 | 6.10 | 7.18 | 3.67 | 3.93 |
| 12 | `color.text.accent` | `color.bg.page` | 4.50 functional | 5.73 | 8.39 | 9.20 | 8.39 | 5.73 | 8.39 |
| 13 | `color.text.accent` | `color.bg.surface` | 4.50 functional | 6.41 | 7.37 | 10.30 | 7.37 | 6.41 | 7.37 |
| 14 | `color.text.accent` | `color.bg.surface.raised` | 4.50 functional | 6.20 | 6.77 | 9.97 | 6.77 | 6.20 | 6.77 |
| 15 | `color.text.success` | `color.bg.page` | 4.50 functional | 5.17 | 9.38 | 5.17 | 9.38 | 5.17 | 9.38 |
| 16 | `color.text.success` | `color.bg.surface` | 4.50 functional | 5.79 | 8.24 | 5.79 | 8.24 | 5.79 | 8.24 |
| 17 | `color.text.success` | `color.bg.surface.raised` | 4.50 functional | 5.60 | 7.57 | 5.60 | 7.57 | 5.60 | 7.57 |
| 18 | `color.text.warning` | `color.bg.page` | 4.50 functional | 5.11 | 10.85 | 5.11 | 10.85 | 5.11 | 10.85 |
| 19 | `color.text.warning` | `color.bg.surface` | 4.50 functional | 5.73 | 9.53 | 5.73 | 9.53 | 5.73 | 9.53 |
| 20 | `color.text.warning` | `color.bg.surface.raised` | 4.50 functional | 5.54 | 8.76 | 5.54 | 8.76 | 5.54 | 8.76 |
| 21 | `color.text.critical` | `color.bg.page` | 4.50 functional | 5.41 | 6.29 | 5.41 | 6.29 | 5.41 | 6.29 |
| 22 | `color.text.critical` | `color.bg.surface` | 4.50 functional | 6.05 | 5.52 | 6.05 | 5.52 | 6.05 | 5.52 |
| 23 | `color.text.critical` | `color.bg.surface.raised` | 4.50 functional | 5.85 | 5.07 | 5.85 | 5.07 | 5.85 | 5.07 |
| 24 | `color.text.info` | `color.bg.page` | 4.50 functional | 5.37 | 6.67 | 5.37 | 6.67 | 5.37 | 6.67 |
| 25 | `color.text.info` | `color.bg.surface` | 4.50 functional | 6.01 | 5.86 | 6.01 | 5.86 | 6.01 | 5.86 |
| 26 | `color.text.info` | `color.bg.surface.raised` | 4.50 functional | 5.81 | 5.38 | 5.81 | 5.38 | 5.81 | 5.38 |
| 27 | `color.text.primary` | `color.bg.tint.accent` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 15.82 | 13.27 | 15.82 | 13.27 | 15.82 | 13.27 |
| 28 | `color.text.success` | `color.bg.tint.success` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.16 | 6.86 | 5.16 | 6.86 | 5.16 | 6.86 |
| 29 | `color.text.warning` | `color.bg.tint.warning` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.33 | 7.79 | 5.33 | 7.79 | 5.33 | 7.79 |
| 30 | `color.text.critical` | `color.bg.tint.critical` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.19 | 4.98 | 5.19 | 4.98 | 5.19 | 4.98 |
| 31 | `color.text.info` | `color.bg.tint.info` on `color.bg.page`, `color.bg.surface` | 4.50 functional | 5.14 | 5.15 | 5.14 | 5.15 | 5.14 | 5.15 |
| 32 | `color.text.on-inverse` | `color.bg.fill.inverse` | 4.50 functional | 19.30 | 19.30 | 19.30 | 19.30 | 19.30 | 19.30 |
| 33 | `color.text.on-accent` | `color.bg.fill.accent` | 4.50 functional | 12.01 | 8.39 | 12.01 | 8.39 | 12.01 | 8.39 |
| 34 | `color.text.on-accent-strong` | `color.bg.fill.accent-strong` (schemes: light) | 4.50 functional | 4.78 | — | 4.78 | — | 4.78 | — |
| 35 | `color.text.on-accent-strong` | `color.bg.fill.accent-strong` (schemes: dark) | 3.00 functional ≥ 24 px | — | 3.05 | — | 3.05 | — | 3.05 |
| 36 | `color.text.on-badge` | `color.bg.fill.critical` | 4.50 functional | 4.53 | 4.53 | 4.53 | 4.53 | 4.53 | 4.53 |
| 37 | `color.text.on-glass` | `material.glass.dark.fill` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 8.96 | 9.30 | 8.96 | 9.30 | 8.96 | 9.30 |
| 38 | `color.text.on-glass-secondary` | `material.glass.dark.fill` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 6.22 | 6.43 | 6.22 | 6.43 | 6.22 | 6.43 |
| 39 | `color.text.on-glass-tertiary` | `material.glass.dark.fill` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 4.80 | 4.93 | 4.80 | 4.93 | 4.80 | 4.93 |
| 40 | `color.text.on-glass` | `material.glass.dark.chip` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 5.84 | 5.61 | 5.84 | 5.61 | 5.84 | 5.61 |
| 41 | `color.text.on-glass` | `material.glass.cell` over #283126, #5B6366, #959595, `gradient.vivid.*` | 4.50 functional | 5.84 | 5.61 | 5.84 | 5.61 | 5.84 | 5.61 |
| 42 | `color.text.on-glass-light` | `material.glass.light.fill` over #283126, #3A3A3A (schemes: dark) | 4.50 functional | — | 5.15 | — | 5.15 | — | 5.15 |
| 43 | `color.text.on-glass-light` | `material.glass.light.chip` over #283126, #3A3A3A (schemes: dark) | 4.50 functional | — | 6.94 | — | 6.94 | — | 6.94 |
| 44 | `color.text.on-glass-light` | `material.glass.light.fill` over #555555, `gradient.vivid.*` (schemes: light) | 4.50 functional | 5.15 | — | 5.15 | — | 5.15 | — |
| 45 | `color.text.on-glass-light` | `material.glass.light.chip` over #555555, `gradient.vivid.*` (schemes: light) | 4.50 functional | 4.57 | — | 4.57 | — | 4.57 | — |
| 46 | `color.text.on-vivid` | `gradient.vivid.*` stops: all | 3.00 functional ≥ 24 px | 3.05 | 3.05 | 3.05 | 3.05 | 3.05 | 3.05 |
| 47 | `color.text.on-vivid` | `gradient.vivid.*` region: card-header | 4.50 functional | 4.55 | 6.92 | 4.55 | 6.92 | 4.55 | 6.92 |
| 48 | `color.border.strong` | `color.bg.page` | 3.00 boundary | 3.02 | 3.18 | 4.88 | 7.25 | 3.02 | 3.18 |
| 49 | `color.border.strong` | `color.bg.surface` | 3.00 boundary | 3.08 | 3.21 | 5.06 | 6.83 | 3.08 | 3.21 |
| 50 | `color.border.strong` | `color.bg.surface.raised` | 3.00 boundary | 3.07 | 3.16 | 5.01 | 6.49 | 3.07 | 3.16 |
| 51 | `color.border.boundary` | `color.bg.page` | 3.00 boundary | 3.39 | 3.29 | 3.39 | 3.29 | 3.39 | 3.29 |
| 52 | `color.border.boundary` | `color.bg.surface` | 3.00 boundary | 3.79 | 3.32 | 3.79 | 3.32 | 3.79 | 3.32 |
| 53 | `color.border.boundary` | `color.bg.surface.raised` | 3.00 boundary | 3.67 | 3.26 | 3.67 | 3.26 | 3.67 | 3.26 |
| 54 | `color.border.focus` | `color.bg.page` | 3.00 boundary | 17.24 | 19.30 | 17.24 | 19.30 | 17.24 | 19.30 |
| 55 | `color.border.focus` | `color.bg.surface` | 3.00 boundary | 19.30 | 16.95 | 19.30 | 16.95 | 19.30 | 16.95 |
| 56 | `color.border.focus` | `color.bg.surface.raised` | 3.00 boundary | 18.66 | 15.58 | 18.66 | 15.58 | 18.66 | 15.58 |
| 57 | `color.chart.axis` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 4.50 functional | 6.31 | 5.12 | 6.31 | 5.12 | 6.31 | 5.12 |
| 58 | `color.chart.series.1` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 19.30 | 13.03 | 19.30 | 13.03 | 19.30 | 13.03 |
| 59 | `color.chart.series.2` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.78 | 5.66 | 4.78 | 5.66 | 4.78 | 5.66 |
| 60 | `color.chart.series.3` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.82 | 3.72 | 4.82 | 3.72 | 4.82 | 3.72 |
| 61 | `color.chart.series.4` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 3.96 | 6.44 | 3.96 | 6.44 | 3.96 | 6.44 |
| 62 | `color.chart.series.5` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.91 | 5.21 | 4.91 | 5.21 | 4.91 | 5.21 |
| 63 | `color.chart.series.6` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | 4.69 | 7.41 | 4.69 | 7.41 | 4.69 | 7.41 |
| 64 | `color.chart.target` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | **2.01 FAIL** | 5.77 | 5.06 | 9.88 | **2.01 FAIL** | 5.77 |
| 65 | `color.chart.comparison` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | 3.00 boundary | **2.01 FAIL** | 3.45 | 5.06 | 5.77 | **2.01 FAIL** | 3.45 |
| 66 | `color.chart.now` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` (schemes: dark) | 3.00 boundary | — | 5.66 | — | 5.66 | — | 5.66 |

### A1.3 Failures, verbatim

| fg | bg | context | ratio | threshold | pass | worst case |
|---|---|---|--:|---|---|---|
| `color.chart.target` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism/light | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |
| `color.chart.target` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism/light-reduced-transparency | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |
| `color.chart.target` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism-native/light | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |
| `color.chart.target` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism-native/light-reduced-transparency | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |
| `color.chart.comparison` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism/light | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |
| `color.chart.comparison` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism/light-reduced-transparency | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |
| `color.chart.comparison` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism-native/light | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |
| `color.chart.comparison` | `color.chart.plot` on `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised` | prism-native/light-reduced-transparency | 2.01 | 3.00 boundary | **FAIL** | on color.bg.page: #b6b7b8 on #ffffff |

## Appendix 2: visual-dna Appendix A against `contrast:check`

The rows of visual-dna A.2, matched to today's pairs. Where A.2 and the tool differ by more than rounding, the last column says why.

| A.2 # | Pair now | A.2: light · dark · light IC · dark IC | contrast:check: light · dark · light IC · dark IC | Why they differ |
|--:|---|---|---|---|
| 1 | `text.primary on bg.page` | 17.24 · 19.30 · 17.24 · 19.30 | 17.24 · 19.30 · 17.24 · 19.30 | within rounding |
| 2 | `text.primary on bg.surface` | 19.30 · 16.95 · 19.30 · 16.95 | 19.30 · 16.95 · 19.30 · 16.95 | within rounding |
| 3 | `text.primary on bg.surface.raised` | 18.67 · 15.58 · 18.67 · 15.58 | 18.66 · 15.58 · 18.66 · 15.58 | within rounding |
| 4 | `text.secondary on bg.page` | 5.64 · 8.14 · 8.73 · 12.36 | 5.63 · 8.13 · 8.72 · 12.36 | within rounding |
| 5 | `text.secondary on bg.surface` | 6.31 · 7.59 · 9.77 · 11.18 | 6.31 · 7.59 · 9.76 · 11.17 | within rounding |
| 6 | `text.secondary on bg.surface.raised` | 6.10 · 7.19 · 9.45 · 10.42 | 6.10 · 7.18 · 9.44 · 10.42 | within rounding |
| 7 | `text.tertiary on bg.page` | 5.64 · 6.25 · 8.73 · 9.59 | 5.63 · 6.24 · 8.72 · 9.59 | within rounding |
| 8 | `text.tertiary on bg.surface` | 6.31 · 5.96 · 9.77 · 8.84 | 6.31 · 5.95 · 9.76 · 8.83 | within rounding |
| 9 | `text.dimmed on bg.surface · >= 24 px` | 3.80 · 4.04 · 6.31 · 7.59 | 3.79 · 4.03 · 6.31 · 7.59 | within rounding |
| 10 | `text.dimmed on bg.surface.raised · >= 24 px` | 3.67 · 3.93 · 6.10 · 7.19 | 3.67 · 3.93 · 6.10 · 7.18 | within rounding |
| 11 | `text.on-inverse on bg.fill.inverse` | 19.30 · 19.30 · 19.30 · 19.30 | 19.30 · 19.30 · 19.30 · 19.30 | within rounding |
| 12 | `text.on-accent on bg.fill.accent` | 12.02 · 8.39 · 12.02 · 8.39 | 12.01 · 8.39 · 12.01 · 8.39 | within rounding |
| 13 | `text.accent on bg.page` | 5.73 · 8.39 · 9.21 · 8.39 | 5.73 · 8.39 · 9.20 · 8.39 | within rounding |
| 14 | `text.accent on bg.surface` | 6.42 · 7.37 · 10.31 · 7.37 | 6.41 · 7.37 · 10.30 · 7.37 | within rounding |
| 15 | `text.success on bg.page` | 5.17 · 9.38 · 5.17 · 9.38 | 5.17 · 9.38 · 5.17 · 9.38 | within rounding |
| 16 | `text.success on bg.surface` | 5.79 · 8.24 · 5.79 · 8.24 | 5.79 · 8.24 · 5.79 · 8.24 | within rounding |
| 17 | `text.warning on bg.page` | 5.12 · 10.85 · 5.12 · 10.85 | 5.11 · 10.85 · 5.11 · 10.85 | within rounding |
| 18 | `text.warning on bg.surface` | 5.73 · 9.53 · 5.73 · 9.53 | 5.73 · 9.53 · 5.73 · 9.53 | within rounding |
| 19 | `text.critical on bg.page` | 5.41 · 6.29 · 5.41 · 6.29 | 5.41 · 6.29 · 5.41 · 6.29 | within rounding |
| 20 | `text.critical on bg.surface` | 6.06 · 5.53 · 6.06 · 5.53 | 6.05 · 5.52 · 6.05 · 5.52 | within rounding |
| 21 | `text.info on bg.page` | 5.37 · 6.67 · 5.37 · 6.67 | 5.37 · 6.67 · 5.37 · 6.67 | within rounding |
| 22 | `text.info on bg.surface` | 6.01 · 5.86 · 6.01 · 5.86 | 6.01 · 5.86 · 6.01 · 5.86 | within rounding |
| 23 | `text.on-badge on bg.fill.critical` | 4.54 · 4.54 · 4.54 · 4.54 | 4.53 · 4.53 · 4.53 · 4.53 | within rounding |
| 24 | `text.success on bg.tint.success · underlays [bg.page, bg.surface]` | 5.16 · 6.87 · 5.16 · 6.87 | 5.16 · 6.86 · 5.16 · 6.86 | within rounding |
| 25 | `text.warning on bg.tint.warning · underlays [bg.page, bg.surface]` | 5.34 · 7.79 · 5.34 · 7.79 | 5.33 · 7.79 · 5.33 · 7.79 | within rounding |
| 26 | `text.critical on bg.tint.critical · underlays [bg.page, bg.surface]` | 5.19 · 4.98 · 5.19 · 4.98 | 5.19 · 4.98 · 5.19 · 4.98 | within rounding |
| 27 | `text.info on bg.tint.info · underlays [bg.page, bg.surface]` | 5.15 · 5.16 · 5.15 · 5.16 | 5.14 · 5.15 · 5.14 · 5.15 | within rounding |
| 28 | `text.primary on bg.tint.accent · underlays [bg.page, bg.surface]` | 17.54 · 13.27 · 17.54 · 13.27 | 15.82 · 13.27 · 15.82 · 13.27 | light: the tint is now also checked over the page (#F1E7E0), not only over the card |
| 29 | `border.strong on bg.surface` | 2.01 · 3.22 · 5.02 · 6.83 | 3.08 · 3.21 · 5.06 · 6.83 | light: B1 applied, ink 45 % (IC: the ink is #0D0E11 now) |
| 30 | `border.focus on bg.page` | 17.24 · 19.30 · 17.24 · 19.30 | 17.24 · 19.30 · 17.24 · 19.30 | within rounding |
| 31 | `border.focus on bg.surface` | 19.30 · 16.95 · 19.30 · 16.95 | 19.30 · 16.95 · 19.30 · 16.95 | within rounding |
| 32 | `chart.axis on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 6.31 · 5.96 · 6.31 · 5.96 | 6.31 · 5.12 · 6.31 · 5.12 | dark: checked on `chart.plot` (white 6 %) over a raised surface, #303133, not on `bg.surface` |
| 33 | `chart.series.1 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 19.17 · 16.95 · 19.17 · 16.95 | 19.30 · 13.03 · 19.30 · 13.03 | light: slot 1 is `neutral.950` #0D0E11; dark: on the plot over a raised surface |
| 34 | `chart.series.2 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 4.79 · 7.37 · 4.79 · 7.37 | 4.78 · 5.66 · 4.78 · 5.66 | dark: on the plot over a raised surface |
| 35 | `chart.series.3 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 4.83 · 4.85 · 4.83 · 4.85 | 4.82 · 3.72 · 4.82 · 3.72 | dark: on the plot over a raised surface |
| 36 | `chart.series.4 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 3.96 · 8.38 · 3.96 · 8.38 | 3.96 · 6.44 · 3.96 · 6.44 | dark: on the plot over a raised surface |
| 37 | `chart.series.5 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 4.92 · 6.78 · 4.92 · 6.78 | 4.91 · 5.21 · 4.91 · 5.21 | dark: on the plot over a raised surface |
| 38 | `chart.series.6 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | 4.70 · 9.65 · 4.70 · 9.65 | 4.69 · 7.41 · 4.69 · 7.41 | dark: on the plot over a raised surface |

visual-dna A.3 (glass over #283126 and #5B6366) and A.4 (text-safe zones) have no counterpart today. §6 and §5 give their successors.

## Appendix 3: Informative pairs outside the pairs file

These pairs were evaluated with the same `evaluatePair` code, for the `prism` brand, in the four base and IC contexts. They are not gated, and they fail no build. They complete visual-dna A.5.

| Pair (not in the pairs file) | Tier it would need | Light | Dark | Light IC | Dark IC | Worst case (light; dark) | Reading |
|---|---|--:|--:|--:|--:|---|---|
| `icon.primary on bg.surface` | boundary 3.0 | 10.66 | 16.95 | 10.66 | 16.95 | #3d3e41 on #ffffff; #ffffff on #1c1c1f | passes |
| `icon.secondary on bg.surface` | boundary 3.0 | 6.31 | 7.59 | 6.31 | 7.59 | #5c6068 on #ffffff; #adadae on #1c1c1f | passes |
| `icon.accent on bg.surface` | boundary 3.0 | 2.29 | 7.37 | 2.29 | 7.37 | #f39444 on #ffffff; #f39444 on #1c1c1f | light below 3:1: a redundant mark only (B3) |
| `icon.status.success on bg.surface` | boundary 3.0 | 2.77 | 8.24 | 2.77 | 8.24 | #2db24a on #ffffff; #5ccb6a on #1c1c1f | light below 3:1: ink ring, icon and label (B4, P4 StatusDot) |
| `icon.status.warning on bg.surface` | boundary 3.0 | 1.77 | 9.53 | 1.77 | 9.53 | #f5b83d on #ffffff; #f5b83d on #1c1c1f | light below 3:1: as above (B4) |
| `icon.status.critical on bg.surface` | boundary 3.0 | 3.62 | 5.01 | 3.62 | 5.01 | #f04b45 on #ffffff; #ff4642 on #1c1c1f | passes |
| `icon.status.info on bg.surface` | boundary 3.0 | 4.82 | 4.84 | 4.82 | 4.84 | #4e6ccd on #ffffff; #6b84e0 on #1c1c1f | passes |
| `icon.primary on bg.surface.raised` | boundary 3.0 | 10.43 | 15.58 | 10.43 | 15.58 | #3d3d40 on #fbfbfc; #ffffff on #232426 | passes |
| `icon.secondary on bg.surface.raised` | boundary 3.0 | 6.10 | 7.18 | 6.10 | 7.18 | #5c6068 on #fbfbfc; #b0b0b1 on #232426 | passes |
| `icon.accent on bg.surface.raised` | boundary 3.0 | 2.22 | 6.77 | 2.22 | 6.77 | #f39444 on #fbfbfc; #f39444 on #232426 | light below 3:1 (B3) |
| `icon.status.success on bg.surface.raised` | boundary 3.0 | 2.68 | 7.57 | 2.68 | 7.57 | #2db24a on #fbfbfc; #5ccb6a on #232426 | light below 3:1 (B4) |
| `icon.status.warning on bg.surface.raised` | boundary 3.0 | 1.72 | 8.76 | 1.72 | 8.76 | #f5b83d on #fbfbfc; #f5b83d on #232426 | light below 3:1 (B4) |
| `icon.status.critical on bg.surface.raised` | boundary 3.0 | 3.50 | 4.60 | 3.50 | 4.60 | #f04b45 on #fbfbfc; #ff4642 on #232426 | passes |
| `icon.status.info on bg.surface.raised` | boundary 3.0 | 4.66 | 4.45 | 4.66 | 4.45 | #4e6ccd on #fbfbfc; #6b84e0 on #232426 | passes |
| `accent on bg.surface` | boundary 3.0 | 2.29 | 7.37 | 2.29 | 7.37 | #f39444 on #ffffff; #f39444 on #1c1c1f | light below 3:1: redundant marks only (B3) |
| `border.hairline on bg.surface` | none (decorative) | 1.23 | 1.25 | 2.01 | 2.27 | #e7e7e7 on #ffffff; #2e2f31 on #1c1c1f | structure only; never the only edge of a control (visual-dna §7.5) |
| `chart.grid on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | none (decorative) | 1.23 | 1.43 | 1.56 | 2.21 | on color.bg.page: #e7e7e7 on #ffffff; on color.bg.page: #37383a on #1c1c1f | structure only |
| `chart.comparison-2 on chart.plot · underlays [bg.page, bg.surface, bg.surface.raised]` | none while it only repeats a labelled series | 1.38 | 2.21 | 1.38 | 2.21 | on color.bg.page: #dbdbdb on #ffffff; on color.bg.surface.raised: #646466 on #303133 | decorative second comparison |
| `text.primary on bg.surface.nested · underlays [bg.page, bg.surface]` | functional 4.5 | 15.22 | 11.78 | 15.22 | 11.78 | on color.bg.page: #0d0e11 on #e3e4e7; on color.bg.surface: #ffffff on #37383a | passes |
| `text.secondary on bg.surface.nested · underlays [bg.page, bg.surface]` | functional 4.5 | 4.97 | 5.89 | 7.70 | 8.20 | on color.bg.page: #5c6068 on #e3e4e7; on color.bg.surface: #b7b7b8 on #37383a | passes |
| `text.tertiary on bg.surface.nested · underlays [bg.page, bg.surface]` | functional 4.5 | 4.97 | 4.80 | 7.70 | 6.70 | on color.bg.page: #5c6068 on #e3e4e7; on color.bg.surface: #a5a5a6 on #37383a | passes |
| `border.strong on bg.surface.nested · underlays [bg.page, bg.surface]` | boundary 3.0 | 2.95 | 2.88 | 4.68 | 5.38 | on color.bg.page: #838487 on #e3e4e7; on color.bg.surface: #7d7d7f on #37383a | **below 3:1 in both schemes** (§8.2) |
| `border.boundary on bg.surface.nested · underlays [bg.page, bg.surface]` | boundary 3.0 | 2.99 | 2.96 | 2.99 | 2.96 | on color.bg.page: #7e838f on #e3e4e7; on color.bg.surface: #7f7f81 on #37383a | **below 3:1 in both schemes** (§8.2) |
