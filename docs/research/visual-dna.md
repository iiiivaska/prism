# Prism visual DNA

Synthesis of the reference analysis, dated **2026-09-08**. **Reconstructed 2026-09-14** from `docs/research/refs-*.md` and the seed scripts `tools/tokens/seed-ref-tokens.py` and `tools/tokens/seed-sys-tokens.py` after the original file was lost.

The seeded token files were generated from the original, so every number that also exists in `tokens/` is copied from those files, which match the seed scripts byte for byte. Anything that had to be inferred rather than recovered is marked **(reconstructed)**. Where this text and a token file disagree, the token file wins until ticket P1-1 settles it. Every disagreement found during the reconstruction and its review is listed in Appendix B.

This is the file that component specs, pattern specs, the brand contract and the contrast pairs cite. The section numbers are part of that contract. Other files cite §1 principles 2, 5, 6 and 9, §2, §4.3, §4.4, §4.9, the text-safe zone in §5, the layout values in §6 and Appendix A. Keep them stable.

## How to read this document

- **Units.** Web px equal Apple pt at 1×. Sizes are given at regular density unless a density is named.
- **Token names.** `ref.*` names primitives in `tokens/ref/`. Semantic tokens are written without the `sys.` prefix, as the specs write them (for example `color.text.secondary`). "White 64 %" means an alpha overlay token. Its composited hex is given for the default ground.
- **Contrast.** Ratios use WCAG 2.x relative luminance. Alpha overlays are composited over their background first (see Appendix A). Tiers follow ADR-0011: functional 4.5:1, large or decorative 3:1 at 24 px or more, boundary 3:1.
- **Sources.** Analyses are cited as *family § section*. Examples: "Vexto traffic §11.3", "Soma §12.5", "Credit Karma, Principles #6", "Vexto incident, What makes it beautiful #3". The sections belong to `docs/research/refs-<family>.md`.
- **Inspiration firewall (ADR-0015).** Every description here is written in Prism's own words. No UI copy from the shots is reproduced, all sample strings are invented, and no reference imagery exists in the repository.

## Evidence base

| Family | Shots (`references.json`) | Mood | Weight | What it contributes |
|---|---|---|---|---|
| Vexto traffic | 27220417, 27289370 | dark-ops | **highest** (source of the owner's hand-picked dark screenshots, Family B) | luminance ladder, map as the ground, hairline charts, glass recipe, the orange accent #F39444 |
| Vexto incident | 27619812, 27571204 | dark-ops | high | glass materials with fallbacks, red as a translucent material, inverse-solid toolbar, corner-pinned card, mobile map HUD |
| Arvion | 27658472 | dark-ops | high | brand-tinted canvas, lit tile in a slab, status carried by edges, single-family type, AI composer material |
| Soma | 27706847 | light-airy | high | lit tinted focus sheet, puffy borderless controls, datasheet ornament, warm ink |
| Hydroflask | 27699907, 27619760 | light-airy | medium | vivid capsule tiles, colorless glass, grain and bloom instead of shadow, circle-and-capsule grammar |
| Credit Karma | 27696584, 27597487 | mixed | medium | one light source, one solid among hairlines, light dashboard over a dark band, compact/regular adaptation |
| CreditPros | 27678963 | mixed | medium | earthy mesh vivid cards, smoked-glass drawer without a scrim, AA-corrected neutral ramp, chart tokens |
| Family A (owner-pasted light investor CRM on iPad; shot not located) | none | light-airy | taste baseline | stepper with faded past and future, 2×2 vivid grid, solid detail card. Known only through the analyses' comparisons **(reconstructed)** |

Typeface evidence comes from `docs/research/fonts.md` and `fonts-facts.md` (ADR-0008). Chart rules come from `docs/research/dataviz-design.md` and motion rules from `docs/research/motion-haptics.md`.

---

## 1. Principles

Each principle states the rule, its numbers as tokens, and the analyses it comes from.

1. **Depth is a luminance ladder, not lines or shadows.** Solid surfaces step up in lightness. Borders are reserved for inputs and tables. Shadows appear only under things that float over imagery.
   - Dark: page `neutral.950` #0D0E11 → surface white 6 % (#1C1C1F) → raised white 9 % (#232426) → nested white 12 % (#2A2B2E). Every step is composited directly over the page. Dark elevation 1 is a +3 % luminance step (`ref.opacity.surface.raised` 0.03), not a shadow.
   - Light: page `neutral.100` #F1F2F5 → card `neutral.0` #FFFFFF (1.12:1, separated by value alone) → raised white 70 % (#FBFBFC) with an inset top highlight and `shadow.raised` 0/2/6 black 5 % → nested ink 6 % (#F1F1F1 on white).
   - Hairlines: white 8 % (dark) or ink 10 % (light), used only for table rows, inputs and the optional 1 px top edge of tiles and nav pills.
   - Sources: Vexto traffic §3, §9.2, §11.1; Vexto incident, Principles #1; Arvion §3, §11.2; Credit Karma, Surfaces & Depth; CreditPros §3; Soma §12.1; Hydroflask §12.6.

2. **Pill grammar: two shapes.** Every control is a pill or a circle. Every container is a rounded rectangle from one short radius scale. Nested radii are concentric.
   - Controls use `radius.control` = pill 999. Heights are `ref.size.control` sm 32, md 40 (pointer default), lg 44 (touch default) and xl 52. Hit areas are 28 (pointer) and 44 (touch).
   - Containers use: badge 4, inner 8, media 12, nested tile 14 (`ref.radius.4`), tile 16, card-compact 20, card 24, sheet 28, card-large 32 (cards with a side of 200 or more), hero 40.
   - Inner radius = outer radius − padding. A 24 card with 16 padding nests an 8 radius.
   - Button variants: **primary** is the single solid inverse pill in a group, **secondary** a raised pill, **ghost** an outlined pill (`border.strong`), **danger** a critical-tint pill with critical text. A segmented group never gets a filled track.
   - Sources: Vexto traffic §9.8, §11.2; Vexto incident, Principles #2; Hydroflask §12.3; Credit Karma, Principles #2 and #7; CreditPros §11 #1; Arvion §11.2. Spec: `Button.yaml`.

3. **One accent, and it means "look here".** A single warm accent marks what deviates or needs attention. It is never an action color and never an active state. Everything else in the chrome stays achromatic.
   - The accent is `accent.500` #F39444, the declared Vexto orange. Dark text may use it at 12 px and above (7.37:1 on surface). In light it is a mark only (dots, the "now" marker, peak ticks, delta glyphs), and light accent text uses `accent.800` #9C4512 (5.73:1 on page).
   - One attention fill per screen, `color.bg.fill.accent`: `accent.500` with ink content in dark (8.39:1), `accent.300` #FFC07A with ink in light (12.02:1). The accent tint is 12 % (light) or 14 % (dark).
   - Positive deltas stay neutral (ink or white). Status hues appear only as dots, badges, strokes and 10 % tints.
   - Sources: Vexto traffic §9.5, §11.5; Vexto incident, Principles #7; Soma §12.5; Credit Karma, Principles #4; CreditPros §11 #4–5; Arvion §9.3, §11.4.

4. **Numbers are instruments.** Hero numerals are large and thin. The insignificant part is dimmed at the same size instead of shrunk, and the unit hangs on the baseline.
   - `type.metric.xl` 48/300/−1 % (may drop to 200 in dark at 34 pt or more); `type.metric.lg` 32/300 on cards; `type.metric.md` 20/400 tabular inline.
   - The trailing group (decimals, thousands remainder) uses `color.text.dimmed` at the same size, 24 px or larger only: white 42 % in dark (4.04:1 on surface), #7E838F in light (3.80:1 on white).
   - The unit uses `type.metric.unit` 12/400 in `color.text.secondary` with a 6 px gap (`space.2`).
   - Figures are proportional in heroes and tabular in data, axes, timers and anything live. Signs are explicit (+, −, ±). A product dims either the trailing digits or the unit, not both.
   - Sources: Vexto traffic §4.3, §9.3, §11.3; Vexto incident, Principles #6 and #9; Soma §4.3, §12.3; Hydroflask §12.8; Credit Karma, Principles #9; CreditPros §11 #8; Arvion §4.3, §11.6.

5. **Three content surfaces: solid, vivid, glass.** This is the three-surface model. **Solid** carries content. **Vivid** is a tokenized brand gradient reserved for the one thing a screen sells. **Glass** is a translucent material for things that float over imagery. The page is the ground under all three. System chrome stays native: Liquid Glass on Apple, a CSS imitation on web (ADR-0009).
   - Solid is `color.bg.surface` with `.raised`, `.nested` and `fill.inverse`.
   - Vivid is one of eight `ref.gradient.vivid.*` tokens (four light, four dark): 3–4 stops, 135–180°, grain 0.05–0.10, bloom 30 % at 150 px blur. A screen gets **at most one 2×2 vivid grid or one vivid card in six**. Vivid cards come in even counts (2 or 4) and never touch a glass card.
   - Glass is `material.glass.*` (§7.3).
   - Elevation has four levels (§7.2).
   - Sources: ADR-0009; Hydroflask §12.5 (four materials); Soma §3 (materials by role); Credit Karma, Principles #5 (1 in 6); CreditPros §11 #6–7; Vexto traffic §11.6; Arvion §3, §11.2. Specs: `Surface.yaml`, `Card.yaml`.

6. **The glass rule.** Glass sits only over imagery, maps or vivid surfaces. It is never stacked on glass and never blurred on watchOS. It has no hue of its own, always has a 1 px light edge, and its text is checked over the darkest and lightest backdrop it may meet.
   - Glass over a solid surface resolves to `surface.raised` and logs at debug level. On watchOS blur is off (`material.blur.enabled` 0), vivid resolves to solid, and glass resolves to `surface.raised` per the watch token (`Surface.yaml` and ADR-0009 say solid; B22). *(Superseded by ADR-0022, 2026-09-15: on watchOS glass renders the opaque raised fallback, and the blur flag is deleted.)*
   - Under Reduce Transparency, glass turns opaque (`*-reduced-transparency`): surface-1 #1C1C1F at 92 % in dark, `neutral.900` or `neutral.0` in light. Increase Contrast does not change glass in the current resolver (see B21). *(Superseded by ADR-0022, 2026-09-15: one fallback, the opaque `raised` surface painted over the page, under Reduce Transparency and Increase Contrast, or `inverse` when selected; no token file carries it.)*
   - The edge is white 15–22 % fading to 0–8 % on glass fills; dark chips 20 % → 12 %; light glass over vivid 55 % → 0 (§7.3).
   - Test backdrops are #283126 (OKLCH L 0.30) and #5B6366 (L 0.49). White on dark glass holds at least 12.75:1 over both.
   - **Light glass** (the selected object) sits only over backdrops at OKLCH L ≤ 0.35, where white holds 5.14:1. Captions on light glass never go below 78 % white. Charts never sit on raw glass: the plot area gets `color.chart.plot`.
   - Sources: ADR-0009; Vexto traffic §9.6, §11.6; Vexto incident, Principles #3; Soma §12.11; Hydroflask §10.7, §12.5; CreditPros §11 #7; Arvion §3 (glass rules 1–4), §11.10. Spec: `Surface.yaml`.

7. **Color lives in surfaces and in the world, not in elements.** Chrome is achromatic. Hue comes from the backdrop (map, photo, render), from a vivid surface, or from the single accent.
   - Dark chrome is white at a few steps: fills 6/9/12 %, text 100/64/55/42 %.
   - Light chrome is ink plus a neutral ramp whose OKLCH chroma stays at or below 0.02.
   - Imagery is graded toward the canvas hue. One full-bleed backdrop fades to the page under the primary rail (about 35 % of the width).
   - Inside cards, only data, status and the accent may be chromatic.
   - Sources: Vexto traffic §9.1, §3; Vexto incident, What makes it beautiful #1; Hydroflask §10.2, §10.7; Arvion §9.1, §9.7, §11.1; Credit Karma, Colour logic.

8. **Hierarchy comes from size and alpha, not weight or color.** One family, sentence case, quiet titles.
   - Weights: 300 for heroes, 400 for everything including card titles, 500 for labels, chips, the active tab and `type.title.*`. 600 is a ceiling reserved for a page H1 and is not used by any reference-brand role (Appendix B). *(Superseded by ADR-0021, 2026-09-15: nothing is heavier than 500 outside Bold Text.)*
   - Sizes step 11 · 12 · 13 · 14 · 15 · 17 · 18 · 20 · 24 · 32 · 40 · 48 · 64.
   - Dark text alpha steps are 100/64/55/42. A label and its value may share one size and differ only in alpha.
   - An uppercase eyebrow appears at most once per card (+3 % tracking), with no letterspaced caps anywhere else. Colored text is used only for its meaning (accent, status).
   - Sources: Vexto traffic §4.4, §11.4; Vexto incident, Principles #4–5; Soma §4.4, §12.14; Hydroflask §12.1–12.2; CreditPros §11 #9; Arvion §9.12, §11.7 (Arvion also varies weight).

9. **The inverse-solid active rule.** In every group, the one primary or active element is an inverse solid (ink on light, white on dark) carrying the opposite-colored glyph or label. Its siblings are hairline, raised or glass. **The accent means attention, not action.**
   - `color.bg.fill.inverse` is `neutral.950` in light and `neutral.0` in dark, with `color.text.on-inverse` at 19.30:1.
   - There is exactly one per group: the primary Button, the active tab, the active segment, the send button, the active toolbar tool, or the one solid action circle on a card. On vivid or glass the solid is white with an ink glyph.
   - Press scales to 0.97 on `motion.spring.snappy`.
   - Sources: Vexto incident, Principles #15 and Components; Arvion §3, §11.3; Credit Karma, Principles #6; CreditPros §9 #6; Soma §12.7; Hydroflask §7. Spec: `Button.yaml`.

10. **Charts are hairline instruments.** Strokes are thin, reference lines dashed, gridlines horizontal and dashed, the Y axis on the trailing side. Charts have no fills, no boxes and no axis lines, and they label inline instead of using legends.
    - Line 2, sparkline 1.5, comparison 1; marker 8, endpoint 10.
    - Target: dashed 8/6 at white 60 % (dark) or ink 30 % (light). Grid: dashed 4/6 at white 12 % or ink 10 %. Band: 6 % or 5 %. Axis text: `color.chart.axis` (white 55 %, `neutral.600`).
    - Details in §8.
    - Sources: Vexto traffic §7, §11.7; Vexto incident, Principles #8; Soma §12.12; Hydroflask §12.7; CreditPros §11 #13; Credit Karma, Principles #11; Arvion §7, §11.9.

11. **Dense cards, generous ground.** Whitespace goes to the page or the backdrop, not inside cards. Tiles inside a group nearly touch so the group reads as one slab. Groups and sections breathe.
    - By density (compact / regular / comfortable): tile gap 4/6/8, card gap 8/12/12, group gap 12/16/24, section gap 24/32/40, card padding 16/24/24, page margin 16/24/24.
    - Sources: Vexto traffic §5, §9.11; Arvion §5, §9.5, §11.8; Soma §12.15; Credit Karma, Layout & Spacing; Hydroflask §12.10.

12. **The same affordance sits in the same corner.** Every card follows the corner-pinned anatomy (§4.9). Sibling cards share alignment lines: the same action inset, heroes on one baseline, fixed offsets inside the card.
    - Sources: Vexto incident, Principles #11; Vexto traffic §9.10; Credit Karma, Principles #10; CreditPros §11 #10; Arvion §5, §9.11.

13. **One control family, one height.** Round icon buttons, pills, search fields and chips share the control height.
    - Controls are 40 (pointer) or 44 (touch); the density tokens resolve `size.control` to 32 / 40 / 48 instead (B24). *(Superseded by ADR-0024 §7, 2026-09-15: controls follow `size.control.*` by density (md 32 / 40 / 48 for compact / regular / comfortable); the hit area follows `size.hit` by modality (28 pointer, 44 touch) and extends invisibly beyond a smaller control.)* Icons are 20 inside controls at a 1.5 px stroke and 16 for inline and corner glyphs. Every glyph that acts has a hit area of at least 44 (touch) or 28 (pointer).
    - Sources: Vexto traffic §11.9; Vexto incident, Principles #10; Soma §12.6; Credit Karma, Principles #6; CreditPros §11 #11; Arvion §5.

14. **Status is a material, never a block, never color alone.** Status appears as dots, badges, 1–1.5 px strokes and 10 % tints. Red is translucent, and every status pairs an icon with a label.
    - `color.bg.tint.*` is 10 % in dark (critical sub-card #322123 on surface).
    - The badge is #E5252A under white 11 px Medium (4.54:1). Dark critical text is #FF5A55; dark critical marks are #FF4642.
    - Status pills are outlined. Status cells carry a 1.5 px status border.
    - Sources: Vexto incident, What makes it beautiful #7; Vexto traffic §11.10, §11.15; Arvion §11.5, §11.13; ADR-0011.

15. **Accessibility floors live in the tokens.** Functional text holds 4.5:1. Dimmed digits hold 3:1 and appear only at 24 px or more. Functional text is never below 12 px.
    - Weights below 300 exist only in `type.metric.*` at 34 pt or more and resolve to 400 under Bold Text or Increase Contrast. *(ADR-0021, 2026-09-15: thin exists only as `metric.xl`'s dark weight; Increase Contrast renders every weight below 400 at 400, and Bold Text also steps every other weight on Apple.)*
    - Increase Contrast lifts every text tier one step (§3.6).
    - Every text-on-surface pair is listed in `tokens/contrast-pairs.json` and re-checked by `tools/contrast` (Appendix A).
    - Sources: ADR-0011; Vexto traffic §10, §11.15; Credit Karma, Principles #18; CreditPros §11 #20; Arvion §11.14.

16. **Light instead of shadow on vivid.** A vivid surface looks lit, not stacked. It gets monochrome grain, an inner top highlight, and a bloom of its own top color on the page behind it. It never gets a border or a colored drop shadow.
    - Grain is 0.05–0.10 (light set 0.05–0.06, dark set 0.08–0.10). Bloom is 30 % at 150 px blur (`ref.blur.bloom`).
    - Sources: Hydroflask §10.3, §12.5–12.6; CreditPros §9 #3–4, §11 #2, §11 #18; Credit Karma, Principles #3.

17. **Never black, never flat grey.** The dark page is `neutral.950` #0D0E11 with an optional radial vignette of +3–10 % toward the hero. The light page is `neutral.100` #F1F2F5 with an optional warm mesh toward #F3F0EB and blooms at 25–35 %.
    - The neutral ramp has a faint cool cast (OKLCH hue 261.6–271.4, chroma 0.003–0.019). Warmth comes from the accent and the vivid set.
    - The analyses disagree here: Soma warms the neutrals, CreditPros warms only the canvas mesh, Credit Karma keeps them dead neutral, Arvion tints them with the brand hue. Prism takes the near-neutral middle **(reconstructed)**.
    - Sources: Arvion §9.1, §11.1; CreditPros §11 #2–3; Soma §12.17; Credit Karma, Colour logic #1.

18. **Motion is calm and physical.** State changes use springs with little or no bounce. Durations stay under 300 ms for UI. Reduce Motion turns every transition into a crossfade and stops ambient loops.
    - Springs: snappy (0.35 s, bounce 0.15), smooth (0.40, 0), sheet (0.30, 0.20). Durations: 100/150/250/350 ms. Reduced: 150 ms crossfade, no bounce. Details in §9.
    - Sources: Soma §9.7, §12.16; Hydroflask §12.14; CreditPros §11 #17; Vexto traffic §11.14; Vexto incident, Principles #17.

---

## 2. Type scales

### 2.1 Slots and presets

Brands choose families for three slots (ADR-0008). The role scale in §2.2 is fixed by the system, and a brand may only apply the global multiplier `ref.brand.type-scale` (1.0).

| Slot | Signature preset (reference brand `prism`) | Native preset (`prism-native`) |
|---|---|---|
| `font.ui` | **Onest** → Inter → system-ui → sans-serif | SF Pro Text (Apple, through system APIs) → Inter (web) |
| `font.display` | **Onest** (same variable file, weights 100–900) | SF Pro Display → Inter at `opsz` 32 |
| `font.mono` | **JetBrains Mono** → ui-monospace → SF Mono → Menlo | SF Mono → JetBrains Mono → ui-monospace |

Why these families:

- The references' words are rounded geometric sans (Outfit or Urbanist in Vexto and Soma, Poppins in Arvion and Credit Karma) or neo-grotesque (CreditPros, Hydroflask); only the Vexto shots set numerals in an UltraLight Swiss grotesk. Vexto traffic §4.1; Soma §4.1; Arvion §4.1; Credit Karma, Typography; CreditPros §4; Hydroflask §5.
- Outfit, Urbanist and Figtree have no Cyrillic in their served builds, so they are disqualified (decision #8).
- Onest is the closest geometric face that has native Cyrillic, weights down to 100 and working tabular figures (`fonts.md`).
- One family serves both words and numerals. Contrast comes from size, weight and alpha, not from a second family. This keeps Arvion's single-family discipline and drops Vexto's two-font tension.
- `font.mono` is for identifiers and code. Tabular figures come from the `tnum` feature of the ui/display family, not from the mono slot.

### 2.2 Roles

Regular density. Tracking is given in px and as a percentage of the size. "Numerals" is the `app.prism.numeric` extension.

| Role | Size / line height | Weight | Tracking | Numerals | Slot | Use | Reference origin |
|---|---|---|---|---|---|---|---|
| `display.xl` | 64 / 1.0 | 300 (dark may drop to 200, Appendix B) | −1.28 px (−2 %) | — | display | page hero title set into the backdrop (§4.17) | Vexto page titles 56–66 UltraLight/Light |
| `display.lg` | 48 / 1.0 | 300 | −0.48 px (−1 %) | — | display | large display text on hero stages | Vexto hero sizes 44/56/64 |
| `display.md` | 40 / 1.05 | 400 | 0 | — | display | secondary display size where thin weights are not wanted (light mood, watch) **(reconstructed)** | Soma 40 pt numerals; CreditPros "no thin weights in light" |
| `title.lg` | 32 / 1.1 | 500 | 0 | — | ui | page H1; two-tone variant with the second line in `text.secondary` | CreditPros greeting 32; Arvion H1 40/600; Credit Karma 48/500 → 38/600 |
| `title.md` | 24 / 1.15 | 500 | 0 | — | ui | section titles | Credit Karma section title 24/500 |
| `title.sm` | 20 / 1.2 | 500 | 0 | — | ui | sheet and mobile screen titles | Vexto mobile title 20; Hydroflask card title 20 |
| `headline` | 18 / 1.3 | 400 | 0 | — | ui | card titles, never bold | Arvion, CreditPros, Credit Karma card titles 18 Regular |
| `body.lg` | 17 / 1.5 | 400 | 0 | — | ui | long-form body on touch | iOS body |
| `body.md` | 15 / 1.5 | 400 | 0 | — | ui | default body, list titles, spec rows | Soma spec rows 15; Vexto alert rows 15; Arvion chat input 15 |
| `body.sm` | 14 / 1.45 | 400 | 0 | — | ui | dense web tables and descriptions | Credit Karma body 14; Vexto nav 14 |
| `label.lg` | 15 / 1.2 | 500 | 0 | — | ui | pill tabs, large chips, active nav | Vexto nav tabs 15; Hydroflask chips 15 |
| `label.md` | 13 / 1.2 | 500 | 0 | — | ui | chips, button labels (md), segmented labels | Arvion chips 13/500; Credit Karma nav 13/500 |
| `label.sm` | 12 / 1.2 | 500 | 0 | — | ui | small buttons, status pill text | Arvion status labels 11–12 Medium (§11.5) |
| `caption` | 12 / 1.35 | 400 | 0 | — | ui | timestamps, card captions, qualifiers; secondary tone (on light `tertiary` resolves to the same step; the token description said tertiary until B20 was applied) | all families: 11–13 px captions |
| `micro` | 11 / 1.2 | 500 | 0 | — | ui | badge digits only; never functional body text | Vexto badge digits 11 Medium |
| `eyebrow` | 13 / 1.2 | 500 | +0.39 px (+3 %) | — | ui | uppercase, at most one per card | Soma uppercase card title 14 +3 % |
| `metric.xl` | 48 / 1.0 | 300 (200 in dark, ≥ 34 pt only) | −0.48 px (−1 %) | proportional | display | the one hero numeral per screen; trailing group in `text.dimmed` at the same size | Vexto heroes 44–48; Soma 40; CreditPros 72–80 |
| `metric.lg` | 32 / 1.0 | 300 | 0 | proportional | display | card metric (the hero of a corner-pinned card) | Arvion heroes 30–32/300; CreditPros card hero 40–44 |
| `metric.md` | 20 / 1.1 | 400 | 0 | tabular | display | inline and tile metrics | Hydroflask tile and preset numerals 18–20 |
| `metric.unit` | 12 / 1.0 | 400 | 0 | — | ui | baseline-aligned unit beside a metric, 6 px gap, `text.secondary` | Vexto units 12 at 55–60 %; Soma units 11–12 |
| `data` | 13 / 1.3 | 400 | 0 | tabular | ui | tables, axes, timers, live counters | Vexto table cells 13; CreditPros values and dates 13–14 |

Body line height is also a density token, `type.body-line-height`: compact 1.4, regular 1.5, comfortable 1.55.

> **ADR-0021 (2026-09-15).** `display.xl` is never thin (300 in every scheme); `metric.xl` is 300 in light and 200 in dark (its `darkWeight`). Density does not change typography (ADR-0021 §6): the density line-height token is deleted, and body text keeps 1.5 in every density.

### 2.3 Weight rules

- The ladder is 200–300 for heroes, 400 for everything, 500 for chips, labels, the active tab and titles, and a 600 ceiling for a page H1 only. No reference-brand role uses 600; `title.lg` is 500. Nothing is heavier.
- Credit Karma's heavy 700 hero numerals are **not** adopted. The references split between heavy heroes (Credit Karma) and light or Regular heroes with dimmed secondary tokens (Vexto, Arvion, Soma light; CreditPros Regular), and Prism follows the light majority. Sources: Credit Karma, Principles #9, versus CreditPros §11 #8.
- **Thin weights** (100–200) exist only in `type.metric.xl` and `type.metric.lg` at 34 pt or more (ADR-0008 rule 6, ADR-0011). With the regular scale this means only `metric.xl` (48) goes thin, and only in the dark mood. Onest renders cleanly at 100–200 for metrics of 34 pt or more (`fonts.md`).
- Under Bold Text or Increase Contrast every weight below 400 resolves to 400 (`Text.yaml`; ADR-0011 states it for weights below 300). ADR-0008 rule 6 adds "below 24 pt" and resolves to 300 (B8).
- Weight 300 is never used below 20 px. UltraLight breaks into hairlines on 1× screens below about 32 px. Sources: Vexto traffic §10.5; Credit Karma, Accessibility risks #9.

> **ADR-0021 (2026-09-15)** settles these rules: nothing is heavier than 500 outside Bold Text; thin weights exist only as `metric.xl`'s dark weight at 34 px or more; Increase Contrast renders every weight below 400 at 400; Bold Text on Apple maps s ≤ 300 → 400, else s + 200 (capped at 900).

### 2.4 Numerals

- **Proportional** figures in heroes (`metric.xl`, `metric.lg`). **Tabular** in `metric.md`, `data`, axes, tables, timers, delta badges and any value that updates live (Arvion §4.3; `dataviz-design.md` §3 F30).
- **Dimmed remainder.** The decimal part or the thousands remainder renders in `text.dimmed` at the same size as the integer, on metric roles of 24 px or more only. At smaller sizes the trailing part resolves to `text.secondary` (`Text.yaml`).
- **Hung unit.** `metric.unit` 12/400 in `text.secondary`, baseline-aligned, with a 6 px gap. A percent sign may instead sit at half the numeral size in the same tone (Arvion gauge).
- **Signs** are explicit for every non-zero delta (+, −, ±). Positive deltas are neutral in color; negative or off-target deltas may take the accent. Status colors never color a delta chip (Vexto traffic §7; Credit Karma, Principles #9).
- **Compact notation** keeps at most 3 significant digits, is locale-aware, and reserves width for Cyrillic compact names (`dataviz-design.md` §3 F28).
- Thousands separators are consistent across every surface of a product (CreditPros §4).

### 2.5 Casing, tracking, truncation

- Sentence case everywhere, with no letterspaced caps except the single `eyebrow` per card. Default tracking for text; −1 % to −2 % on display and metric sizes of 48 px or more.
- **Two-tone headline.** A two-line `title.lg` whose second line has the same size and weight in `text.secondary`; hierarchy by tone only (CreditPros §4; §4.17).
- **Truncation.** Prose fades out (last lines at 60 % and 25 %) instead of ending in an ellipsis; identifiers truncate with an ellipsis next to a copy affordance, and the full value goes into the accessibility label (§4.15; `Text.yaml` `truncation: fade`).

---

## 3. Color: the reference-brand palette

The reference brand's palette **is** `tokens/ref/color.palette.tokens.json` and `tokens/ref/gradient.tokens.json`. Values are authored in sRGB hex here; the token files carry the OKLCH components computed from them (CSS Color 4 math) plus the hex fallback. A brand overrides these ramps (`brands/README.md`); it never adds paths.

### 3.1 Neutral ramp (`ref.color.neutral`)

A near-neutral scale with a faint cool cast (HSL hue 220–225; OKLCH hue 261.6–271.4, chroma 0.003–0.019, peaking at step 500). The light scheme reads it from the top, the dark scheme from the bottom; dark surfaces are white-alpha steps over step 950, not ramp steps.

| Step | Hex | OKLCH (L, C, H) | Light scheme | Dark scheme |
|---|---|---|---|---|
| 0 | #FFFFFF | 1.000, 0, — | card (`bg.surface`), overlay, on-inverse, on-accent-strong, on-vivid, on-glass, on-badge | text.primary, fill.inverse, chart.series.1, border.focus, on-vivid, on-glass |
| 50 | #F7F8FA | 0.979, 0.003, 264.5 | not bound yet (alternate light ground) | — |
| 100 | #F1F2F5 | 0.961, 0.004, 271.4 | **page** (`bg.page`) | — |
| 150 | #E9EBEF | 0.940, 0.006, 264.5 | not bound yet | — |
| 200 | #E1E3E8 | 0.916, 0.007, 268.5 | `chart.ghost` (sparkline ghost bars) | — |
| 300 | #C9CCD3 | 0.845, 0.010, 267.3 | not bound yet | — |
| 400 | #A6AAB4 | 0.738, 0.015, 268.4 | not bound yet | — |
| 500 | #7E838F | 0.610, 0.019, 267.7 | `text.dimmed` (≥ 24 px), `border.boundary` (3.80:1 on white) | — |
| 600 | #5C6068 | 0.488, 0.014, 264.4 | `text.secondary`, `text.tertiary`, `icon.secondary`, `chart.axis`; dimmed under Increase Contrast | — |
| 700 | #40444C | 0.386, 0.015, 264.4 | secondary and tertiary under Increase Contrast | — |
| 800 | #282A30 | 0.286, 0.011, 271.0 | not bound yet | not bound yet |
| 850 | #1F2126 | 0.248, 0.010, 268.3 | — | not bound yet |
| 900 | #17191D | 0.213, 0.009, 264.4 | dark glass under Reduce Transparency | — |
| 950 | #0D0E11 | 0.164, 0.007, 271.0 | `text.primary`, `fill.inverse`, `border.focus`, `text.on-accent` | **page** (`bg.page`), `text.on-inverse`, `text.on-accent` |
| 1000 | #050608 | 0.122, 0.006, 261.6 | — | reserved; never a page (no near-pure black) |

The chart ink `chart.series.light.1` is #0E0F12, one hair off step 950; the ink overlays in `sys` (`ink N %`) use the same #0E0F12. *(Superseded by P1-1 and P1-2, 2026-09-15: `series.light.1` aliases `neutral.950` (ADR-0020 §4) and every ink overlay is `neutral.950` with `app.prism.alpha` (ADR-0020 §3), so the ink is #0D0E11 everywhere, including §3.4, §8.2 and A.1.)*

### 3.2 Accent ramp "solar" (`ref.color.accent`)

One accent per brand; a second accent is not supported by design. Step 500 is the Vexto traffic declared orange (#F39444, Vexto traffic §2.1), which several families echo (Vexto incident #F5973F, Arvion attention role, Credit Karma signal orange). HSL hue ≈ 27; OKLCH hue 46–76 (warmer toward the dark end).

| Step | Hex | OKLCH (L, C, H) | On white | Role |
|---|---|---|---|---|
| 50 | #FFF7EC | 0.979, 0.017, 76.1 | — | not bound yet |
| 100 | #FFEBD1 | 0.949, 0.041, 74.5 | — | not bound yet |
| 200 | #FFD8A8 | 0.904, 0.076, 72.4 | — | not bound yet |
| 300 | #FFC07A | 0.851, 0.113, 68.2 | — | light `bg.fill.accent`: the one attention tile, ink content 12.02:1 |
| 400 | #F9A55A | 0.791, 0.135, 60.6 | — | dark `accent.pressed`; light `accent.glow` base (40 %) |
| **500** | **#F39444** | 0.752, 0.148, 57.6 | 2.30 | **the accent**: `accent`, `icon.accent`, `chart.now` (both schemes); dark `text.accent` (7.37:1 on surface), dark `bg.fill.accent` (ink content 8.39:1), `chart.series.dark.2`; light marks only |
| 600 | #DD7A24 | 0.677, 0.153, 55.6 | 3.05 | light `accent.pressed`; dark `bg.fill.accent-strong` (white text only at the large tier, 3.05:1) |
| 700 | #B8561A | 0.567, 0.144, 47.1 | 4.79 | light `bg.fill.accent-strong` (white text 4.79:1); `chart.series.light.2` |
| 800 | #9C4512 | 0.497, 0.130, 45.8 | 6.42 | light `text.accent` (5.73:1 on page) |
| 900 | #6B2F0C | 0.382, 0.097, 46.4 | 10.31 | light `text.accent` under Increase Contrast |
| 950 | #3D1A06 | 0.265, 0.063, 47.6 | — | first stop of the `ember-night` vivid gradient |

Rules: the accent is attention, never action (§1 principle 9); light accent text starts at step 800; light marks at step 500 are always paired with a value, sign or label because they sit at 2.30:1 on white (Appendix B, B3).

### 3.3 Status (`ref.color.status`)

Status hues are fixed semantics, never a series color, never chrome, always paired with an icon and a label (ADR-0011). Light uses separate dot, text and tint steps; dark uses one hue per status plus a mark step where the text step would be too light for a stroke.

| Status | dot-light | text-light | tint-light | dark (text; also icon for success and warning) | mark-dark (icon and strokes) | badge |
|---|---|---|---|---|---|---|
| success | #2DB24A (2.77 on white) | #187530 (5.79 on white, 5.16 on tint) | #E6F6E9 | #5CCB6A (8.24 on surface) | — | — |
| warning | #F5B83D (1.78 on white) | #8F5B00 (5.73 on white, 5.34 on tint) | #FEF6E8 | #F5B83D (9.53 on surface) | — | — |
| danger | #F04B45 (3.62 on white) | #BF2222 (6.06 on white, 5.19 on tint) | #FDE9E9 | #FF5A55 (5.53 on surface) | #FF4642 (5.01 on surface) | #E5252A (white 11 px Medium 4.54:1) |
| info | #4E6CCD (4.83 on white) | #3D5BC4 (6.01 on white, 5.15 on tint) | #EAEDF9 | #7A93F0 (5.86 on surface) | #6B84E0 (4.85 on surface) | badge-dark #527AF1 (glyphs only: white on it 3.88:1) |

Origins:

- **success**: the dot is Soma's proposed ok green (Soma §12.5). The dark step sits between Vexto incident #62CC5A and Soma #45CB34. The light text step #187530 is an AA step **(reconstructed)**.
- **warning**: an amber pulled away from the solar accent so the two never read as one hue **(reconstructed)**. Nearby source values: Soma attention orange ≈ #F5A14B, Arvion reserved yellow #FFD12F, CreditPros amber #FDAD03.
- **danger**: the light dot is the studio's off-family error red ≈ #F04B4B (Hydroflask §3 Accents). The dark mark #FF4642 is Vexto incident's proposed incident red (Principles #7). Dark text is lifted to #FF5A55 because #FF4642 failed on sheet glass (Vexto incident, Accessibility risks #3). The badge is Vexto traffic's AA substitute for pure red (§10.4, §11.15).
- **info**: Arvion's periwinkle attention color (#4E6CCD, Arvion §2.2) becomes Prism's info hue. Its direction-badge blue #527AF1 becomes `badge-dark`.

Light dots for success and warning sit below 3:1 on white. On light they carry a 1 px ink ring (Soma §12.5) and always an icon and a label **(reconstructed)**.

> **P1-9 (2026-09-16; ADR-0030 §6.1).** The tint-light column is gone as tokens: `ref.color.status.*.tint-light` is deleted, and the light `bg.tint.success|warning|critical|info` are each status's dot-light step at 12 % alpha, which reproduces the values above over white within 0.5/255 (`tools/contrast/pairs.test.ts`). A light status wash over a map now shows the map through it, as the dark 10 % tints do.

### 3.4 Chart series (`ref.color.series`)

> **Superseded in part by P1-1 (2026-09-15; ADR-0020 §4).** Slots 1 and 2 are aliases of ramp steps, so a brand's ramps reach its charts: light 1 = `neutral.950`, light 2 = `accent.700`, dark 1 = `neutral.0`, dark 2 = `accent.500`. Only light slot 1 changes value: #0D0E11 (19.30:1 on white) instead of #0E0F12. Slots 3–6 are unchanged. `tokens/ref/color.palette.tokens.json` wins over this table.

Six slots, **ink or white first, accent second**. This follows the references' chart grammar: white or ink carries the data, the accent marks attention (Vexto traffic §7, Arvion §7, CreditPros §7).

| Slot | Light | OKLCH L | On white | Dark | OKLCH L | On surface (#1C1C1F) |
|---|---|---|---|---|---|---|
| 1 | #0E0F12 ink | 0.17 | 19.17 | #FFFFFF | 1.00 | 16.95 |
| 2 | #B8561A (accent.700) | 0.57 | 4.79 | #F39444 (accent.500) | 0.75 | 7.37 |
| 3 | #4E6CCD (info) | 0.56 | 4.83 | #6B84E0 (info mark) | 0.64 | 4.85 |
| 4 | #1F8F80 teal | 0.59 | 3.96 | #5BC8B5 | 0.76 | 8.38 |
| 5 | #A64FA3 magenta | 0.57 | 4.92 | #D48BD0 | 0.73 | 6.78 |
| 6 | #6E7A22 olive | 0.55 | 4.70 | #D9C27A | 0.82 | 9.65 |

Every slot clears 3:1 on the solid surface in both schemes, so no slot needs the dataviz relief rule on solid.

Light slots 2–6 share an OKLCH lightness band of 0.55–0.59, so hue alone separates them. Until the CVD validator runs (`tools/viz-validate`, P4), charts use at most three colored series without direct labels. The difference from `dataviz-design.md` §4 is explained in §8.

### 3.5 Vivid gradients (`ref.gradient.vivid`)

> **P1-9 (2026-09-16; ADR-0029 §2, ADR-0030 §4.3).** The light set spends its contrast budget on chroma: `sky` @50 `oklch(0.5366 0.12 267.6)` #4F69B3 and @100 `oklch(0.655 0.12 235)` #349BCF; `rose` #8C4A49 @0 · #B05E4E @65 · #C6835A @100; `olive` @100 #879C34. `navy-cyan` keeps its colors and moves its middle stops to 30 % and 85 %, so its lightness climbs without a hard horizon. A ninth gradient, `night-lagoon` (dark, 160°, grain 0.08: #091821 @0 · #0D303C @35 · #0C6468 @72 · #2E9891 @100), a deep night-blue rising into lagoon teal, takes dark slot 3. Every gradient declares a temperature: cool `sky`, `orchid`, `plum-dusk`, `navy-cyan`, `night-lagoon`, `forest-moss`; warm `rose`, `olive`, `ember-night`. The slots are two one-temperature pairs: light sky + orchid and rose + olive, dark plum-dusk + navy-cyan and night-lagoon + forest-moss (§4.4). `ember-night` leaves the slots (its end sits 0.078 from the accent) and stays for a single warm hero card on a screen without the accent. The bloom blur is 75 (the value both stacks pass to their blur; 150 barely showed), the dark gradients bloom at 45 %, and the bloom color is derived: the gradient's brightest stop. `ref.blur.bloom` is deleted.

> **Superseded by P1-1 (2026-09-15; ADR-0022 V1, V2).** The stops in the table below are the seeded ones; read it for the derivations, not the values. P1-1 retuned `orchid`, `olive`, `rose`, `sky`, `ember-night` and `navy-cyan` so that every stop reaches 3.0:1 against white and the Card header block 4.5:1; `orchid` now starts dark at the top (#6C5A66 @0 · #A35E9E @55 · #CA78B5 @100). Only `plum-dusk` and `forest-moss` keep their seeded stops. Angles, grain and blooms are unchanged. The stops live in `tokens/ref/gradient.tokens.json`, which wins over this table; build direction boards from it.

Eight brand gradients, four per scheme. They appear only on `surface.vivid` (Card `variant: vivid`), always with color.text.on-vivid, grain, and a bloom of 30 % alpha at 150 px blur (`$extensions.app.prism.bloom`).

- **Angle** follows CSS `<angle>` semantics: 0° points up and angles run clockwise, so 180° runs top → bottom. The first stop sits at the start corner.
- **Interpolation** is sRGB between stops, as CSS legacy hex gradients and SwiftUI's default device-space gradients render them **(reconstructed convention)**.

Where text may sit is defined in §5.

| Name | Scheme | Angle | Grain | Stops (hex @ position) | Derivation |
|---|---|---|---|---|---|
| `orchid` | light | 165° | 0.06 | #E88BD0 @0 · #B96CB4 @45 · #6C5A66 @100 | Hydroflask pink stat tile (light top, deliberately muddy base), mid re-hued toward orchid (Hydroflask §3, §7) |
| `olive` | light | 135° | 0.05 | #4F5A38 @0 · #8A9C42 @55 · #C4DD6A @100 | CreditPros green mesh card: dark corner → lime bloom (CreditPros §2 Vivid surfaces). Mid darkened from ≈ #A4BB50 to #8A9C42 so white keeps 3:1 up to the middle **(reconstructed rationale)** |
| `rose` | light | 135° | 0.05 | #8E5A55 @0 · #B3706A @50 · #C9927A @100 | CreditPros rose/tan mesh card, with a deeper start stop added **(reconstructed)** |
| `sky` | light | 165° | 0.06 | #4A4C78 @0 · #556BA6 @50 · #8BA9C0 @100 | Hydroflask indigo → steel stat tile (Hydroflask §3) |
| `ember-night` | dark | 160° | 0.08 | #3D1A06 @0 · #7A3A1E @45 · #C9642F @85 · #E38B3A @100 | solar 950 rising to a burnt accent; echoes the orange-beam glass frames in Vexto traffic §2.5 **(reconstructed)** |
| `plum-dusk` | dark | 150° | 0.08 | #1E1226 @0 · #3A1F3F @40 · #5B4A7A @75 · #6F7FC8 @100 | Arvion's plum composer aurora rising toward the info periwinkle (Arvion §2.5) **(reconstructed)** |
| `forest-moss` | dark | 170° | 0.08 | #0F1A14 @0 · #1B2922 @35 · #4E6040 @80 · #6E7B3A @100 | Vexto incident 3D-map forest and canopy tones into moss (Vexto incident, Color) |
| `navy-cyan` | dark | 180° | 0.10 | #252E3F @0 · #223545 @45 · #5DA8B9 @75 · #80B8C4 @100 | Hydroflask dark chart card, navy → cyan (Hydroflask §3) |

Rules:

- One temperature per screen: never mix a hot and a cool gradient (Hydroflask §12.13).
- Light gradients are used in the light mood and dark gradients in the dark mood.
- Vivid color is earthy and desaturated, never a saturated brand rainbow (CreditPros §11 #6).

### 3.6 Semantic mapping (`tokens/sys/color/*`)

Composites are over the default ground: surfaces over the page, tints over `bg.surface`.

| Token | Light | Dark |
|---|---|---|
| `bg.page` | `neutral.100` #F1F2F5; optional warm mesh toward #F3F0EB, blooms 25–35 % | `neutral.950` #0D0E11; optional radial vignette +3–10 % toward the hero |
| `bg.surface` | `neutral.0` #FFFFFF; no border, no shadow (optional ambient 5 %) | white 6 % → #1C1C1F ("surface-1") |
| `bg.surface.raised` | white 70 % → #FBFBFC; puffy chip or round button with inset top highlight + `shadow.raised` | white 9 % → #232426 ("surface-2"): tiles, pills, nested; optional 1 px white 8 % top edge on tiles and nav pills only |
| `bg.surface.nested` | ink 6 % → #F1F1F1 on white: filled control, dock tray | white 12 % → #2A2B2E ("surface-3"): translucent card over map, control on a card |
| `bg.surface.overlay` | `neutral.0` | white 12 % |
| `bg.fill.inverse` | `neutral.950` (primary pill, active tab, solid action circle) | `neutral.0` (active segment, send button; black glyph) |
| `bg.fill.accent` | `accent.300` (attention tile; ink content) | `accent.500` (attention KPI tile; ink content 8.39:1) |
| `bg.fill.accent-strong` | `accent.700` (white text 4.79:1) | `accent.600` (white text at the large tier only, 3.05:1) |
| `bg.fill.critical` | `status.danger.badge` #E5252A | same |
| `bg.fill.neutral.subtle` | ink 6 % (hover overlay, ghost fill) | white 6 % |
| `bg.tint.accent` | #F39444 12 % → #FEF2E9 (tinted focus card) | #F39444 14 % → #3A2D24 on surface-1 (#2D2118 on page; flagged chart window band) |
| `bg.tint.success / warning / critical / info` | #E6F6E9 / #FEF6E8 / #FDE9E9 / #EAEDF9 | status hue at 10 %: #222E27 / #312C22 / #322123 / #232733 on surface |
| `text.primary` | `neutral.950` (17.24 on page) | `neutral.0` (numerals pure white; body may use #F5F6F8) |
| `text.secondary` | `neutral.600` | white 64 % |
| `text.tertiary` | `neutral.600` (same step, so 12 px captions pass) | white 55 % |
| `text.dimmed` | `neutral.500` (≥ 24 px only) | white 42 % (≥ 24 px only) |
| `text.on-inverse / on-accent / on-accent-strong` | white / `neutral.950` / white | `neutral.950` / `neutral.950` / white |
| `text.on-vivid / on-glass / on-badge` | white | white (captions on light glass ≥ 78 % white) |
| `text.accent` | `accent.800` | `accent.500` (≥ 12 px) |
| `text.success / warning / critical / info` | text-light steps | dark steps |
| `icon.primary / secondary / accent` | ink 80 % / `neutral.600` / `accent.500` (marks only) | white / white 64 % / `accent.500` |
| `icon.status.*` | dot-light steps | success/warning dark; critical and info `mark-dark` |
| `border.hairline` | ink 10 % (inputs, table rows, chip strokes) | white 8 % (table rows, tile top edge) |
| `border.strong` | ink 30 % | white 35 % (outline pills) |
| `border.focus` | `neutral.950` | `neutral.0` |
| `border.boundary` | `neutral.500` (control edges that must pass 3:1) | white 30 % |
| `accent` / `.pressed` / `.subtle` / `.glow` | 500 / 600 / #F39444 12 % / #F9A55A 40 % | 500 / 400 / #F39444 14 % / #F39444 40 % |
| `chart.series.1–6` | light set (§3.4) | dark set |
| `chart.comparison` / `comparison-2` | ink 30 % / ink 15 % | white 40 % / white 25 % |
| `chart.target` | ink 30 % | white 60 % |
| `chart.grid` | ink 10 % | white 12 % |
| `chart.band` | ink 5 % | white 6 % |
| `chart.axis` | `neutral.600` | white 55 % |
| `chart.now` | `accent.500` | `accent.500` |
| `chart.ghost` | `neutral.200` | white 12 % |
| `chart.plot` | `neutral.0` | white 6 % (charts never sit on raw glass) |

**Increase Contrast** (`*-increased-contrast`) raises each tier one step:

- Light: secondary and tertiary → `neutral.700`, dimmed → `neutral.600`, accent text → `accent.900`, hairline → ink 30 %, strong → ink 60 %; chart grid ink 20 %, target ink 60 %, comparison ink 60 %.
- Dark: secondary → white 80 %, tertiary → 70 %, dimmed → 64 %, hairline → 25 %, strong → 60 %; chart grid 25 %, target 85 %, comparison 60 %.

**Reduce Transparency** makes glass opaque (§7.3). *(Superseded by ADR-0022, 2026-09-15: glass renders the opaque `raised` surface under Reduce Transparency and Increase Contrast, chosen by Surface; the reduced-transparency contexts carry no token delta.)*

> **P1-9 (2026-09-16; ADR-0029, ADR-0030).** Changes to the table above:
> - Light `bg.surface.raised` is `neutral.50` #F7F8FA, opaque, with `color.edge.raised` as its 1 px top edge and `elevation.1`; in dark the raised top edge is `color.edge.raised` (white 8 %).
> - The ghost button has no fill at rest and `bg.fill.neutral.subtle` when pressed and on hover; the "ghost fill" reading of `bg.fill.neutral.subtle` is dropped (ADR-0029 §3.3).
> - Light `chart.target` is ink 60 % (75 % under Increase Contrast); `chart.comparison` stays ink 45 %. `border.strong` stays ink 45 % (3.03:1 on the page for the ghost outline).
> - Light status tints are the dot step at 12 % (§3.3).
> - New roles: the scheme's glass `material.glass.fill|chip` (light glass in light, smoked glass in dark) with `text.on-glass-fill` and its `-secondary`, `-tertiary`, `-dimmed` tones over Prism's map and `-media-secondary|-media-tertiary` over imagery and vivid; `bg.fill.inverse-media` and `text.on-inverse-media` (the white solid on vivid); `border.on-media` (white 40 %) and `border.on-glass-fill`; `text.on-accent-secondary` (on-accent at 70 % on the lit tile); `color.edge.highlight|raised`; `chart.on-media.*` and `chart.on-glass-fill.*`; the map palette `color.map.*`.

### 3.7 Values lifted from the references

Wherever a reference value failed its tier, the palette lifts it. This ledger lists every lift the seeds encode.

| Where | Reference value | Problem | Prism token and value |
|---|---|---|---|
| Light secondary text | #8E8E8E (Credit Karma), #8E9196 (CreditPros) | 2.2–2.9:1 at 12–18 px | `text.secondary` = `neutral.600` #5C6068: 5.64 page / 6.31 card |
| Light tertiary text | #7E838F (this DNA's own proposal) | 3.39:1 on page: decorative only | `text.tertiary` resolves to `neutral.600`; #7E838F is kept as `text.dimmed` for ≥ 24 px (3.80 on white) |
| Light chart axis | #B7B7B9–#C8C8C8 (CreditPros) | 2.0–1.7:1 on white | `chart.axis` = `neutral.600` (6.31 on white) |
| Light accent text | #F39444 on light | 2.05:1 on page (Vexto traffic §10.6) | `text.accent` = `accent.800` #9C4512 (5.73 page) |
| Accent surface with white text | Arvion white on #4E6CCD 4.83; solar 500 with white ≈ 2.3 | the solar accent cannot carry white text | light `fill.accent-strong` = `accent.700` (4.79); `fill.accent` carries **ink** (12.02 light, 8.39 dark) |
| Dark secondary text | white 50–55 % (Vexto, Arvion) | ≈ 3.5:1 on light-toned glass (Vexto incident, Accessibility risks #5); passes on surface-3 (4.73–5.39) | `text.secondary` = white 64 %: 7.59 on surface-1, 6.73 on surface-3 |
| Dark tertiary text | white 40–45 % (axis, units; Vexto traffic §10.2; Arvion §10) | 3.6–4.4:1 | `text.tertiary` = white 55 %: 5.96 / 5.39; `chart.axis` = white 55 % |
| Dark dimmed digits | white 35–40 % | 2.3–2.9:1 measured on sampled pixels (Vexto traffic §10.1; Vexto incident, Accessibility risks #1); 3.22–3.79 when composited on surface-1 | `text.dimmed` = white 42 %: 4.04 on surface-1, ≥ 24 px only |
| Badge red | #FF0000 / #FF0004 under white 11 px | 4.0:1 | `status.danger.badge` #E5252A: 4.54 |
| Dark critical text | #FF4642 incident red | 3.9:1 on sheet glass (Vexto incident, Accessibility risks #3) | `text.critical` = #FF5A55 (5.53 surface-1, 4.62 surface-3); #FF4642 kept for marks |
| Dark accent-strong | white on #DD7A24 | 3.05:1 | white text only at the large tier (ADR-0011: ≥ 24 px regular or ≥ 19 px bold) |
| Light glass captions | white 55–60 % on bright glass (Hydroflask, Vexto incident bloom) | 1.9–2.8:1 | captions on light glass never below 78 % white; light glass only over backdrops at OKLCH L ≤ 0.35 (see Appendix B, B6) |
| Light control boundaries | ring #C8C8C8 1.7:1 (Credit Karma); hairline 12 % 1.3:1 (CreditPros) | below 3:1 | `border.boundary` = `neutral.500` (3.80 on white) for edges that must be seen |
| Light status text | dots #2DB24A / #F5B83D as text | 2.77 / 1.78 | separate text steps #187530 (5.79) / #8F5B00 (5.73) |
| Olive vivid mid | #A4BB50 (CreditPros) | white ≈ 2.0:1 | #8A9C42 (3.04) **(reconstructed rationale)** |

Reference ratios are quoted measurements from the analyses, often taken on sampled pixels. Prism ratios, including the composited values in the Problem column, use the A.1 method.

### 3.8 Mood presets

The reference brand ships two moods (`brands/prism/brand.json`: `light-airy`, `dark-ops`; ADR-0002). A mood is a colorScheme context plus the policy for surfaces, accent, type and charts described below. Both moods use the same palette and tokens; only the scheme and the recommended usage differ.

#### Light airy (`colorScheme: light`)

Evidence: Soma, Hydroflask set A, CreditPros, the light half of Credit Karma, and Family A **(reconstructed)**. The feel is paper and daylight: a grey page, white content, black ink, a single light source, and color held inside one tinted card or a vivid grid.

| Aspect | Setting |
|---|---|
| Page | `bg.page` #F1F2F5. Hero screens may add a soft warm mesh toward #F3F0EB with blooms at 25–35 % (≥ 150 px blur) echoing the nearest vivid card. A dot grid (1.5 px dots, 14 px pitch, ink 4 %) appears only behind illustration stages. |
| Surfaces | White cards (`bg.surface`), no border, no shadow, 1.12:1 against the page. Puffy raised controls (white 70 % + inset top highlight + `shadow.raised` 0/2/6 5 %). Nested ink 6 % for filled controls and dock trays. One tinted focus card per screen (`bg.tint.accent` #FEF2E9, §4.8). |
| Action | One ink inverse pill (`bg.fill.inverse` #0D0E11) per group, typically docked (§4.7). |
| Accent | Marks at `accent.500` (dots, "now", peak ticks, delta glyphs), always paired with a value. Text at `accent.800`. At most one attention tile (`bg.fill.accent` #FFC07A, ink content). |
| Vivid | Light set (`orchid`, `olive`, `rose`, `sky`), grain 0.05–0.06, bloom 30 % / 150. At most one 2×2 grid or one card in six. Text only inside the zone (§5). |
| Glass | Only over vivid or photographs. Light glass (white 30 %, blur 24, edge 55 %) for chips, pills and rows on vivid; tab bar at 45 %. Dark smoked glass (#0A0C08 55 %, blur 40, saturate 0.8, edge 22 % → 8 %, grain 4 %; drawers at 35 %) for a detail card or drawer over a bright photo or vivid (§4.10). Bottom-up scrim black 35 % under text on unpredictable backdrops. |
| Type | Heroes at 300 (no thin weights in light). Two-tone `title.lg`. Ink `neutral.950`, secondary `neutral.600`. |
| Charts | Series light set (ink first). Comparison ink 30 % / 15 %. Target ink 30 % dashed 8/6. Grid ink 10 % dashed 4/6. Band ink 5 %. Axis `neutral.600`. Now `accent.500`. Ghost bars `neutral.200`. Plot white. |
| Elevation | `shadow.raised` 0/2/6 5 %, `floating` 0/6/16 7 %, `overlay` 0/24/60 #141414 10 %, `drawer` 0/30/80 25 %. |
| Density | Regular on touch. Light desktop dashboards measure like regular with wide margins (36, `ref.space.9`) and a wide gutter (104, `ref.space.13`) **(reconstructed)**. |

#### Dark ops (`colorScheme: dark`)

Evidence: Vexto traffic and incident, Arvion, the Soma glass widget, and Credit Karma's dark band. The feel is an instrument room: near-black, achromatic panels, the world as the only source of color, hairline data, and one orange that means "look here".

| Aspect | Setting |
|---|---|
| Page | `bg.page` #0D0E11, never #000. Optional radial vignette of +3–10 % toward the hero. A full-bleed map, photo or render graded toward the canvas hue acts as the world and fades to the page under the primary rail (§4.1). |
| Surfaces | Luminance ladder white 6/9/12 % (#1C1C1F / #232426 / #2A2B2E). No borders; an optional 1 px white 8 % top edge on tiles and nav pills. No shadow on solid (elevation 1 is a +3 % step). |
| Action | White inverse solid with a black glyph (`bg.fill.inverse` #FFFFFF): active segment, send, active toolbar tool. |
| Accent | `accent.500` #F39444: text allowed at 12 px and above (7.37:1). One attention KPI tile (`bg.fill.accent`, ink content 8.39:1). `accent-strong` #DD7A24 with white only at the large tier. Accent tint 14 % under flagged chart windows. |
| Status | 10 % tints (critical sub-card #322123 on surface-1). Marks at `mark-dark`. Badge #E5252A. Outlined status pills (§4.11). |
| Glass | Dark glass #101410 60 %, blur 32, saturate 1.2, edge white 15 % → 0, for panels, sheets and cards over maps (§4.3). Chips and toolbars white 16 % / 25 %, blur 20. The selected object in light glass (white 26 %, blur 40, bloom 35 %). Status cells white 20 %, blur 12, with a 1.5 px status border (§4.14). Scrim black 40 %. |
| Type | `metric.xl` may drop to 200 (≥ 34 pt). Text alpha 100/64/55/42. |
| Charts | Series dark set (white first, accent second). Comparison white 40 % / 25 %. Target white 60 % dashed 8/6. Grid white 12 % dashed 4/6. Band 6 %. Axis 55 %. Now accent. Ghost 12 %. Plot white 6 %. |
| Elevation | Shadows only under things floating over imagery: `floating` 0/8/24 30 %, `overlay` 0/24/48 35 %, `drawer` (modal) 0/30/80 50 %. |
| Vivid | Dark set (`ember-night`, `plum-dusk`, `forest-moss`, `navy-cyan`), grain 0.08–0.10. |
| Density | Compact on desktop consoles (ADR-0010 default); regular on touch. |

---

## 4. Signature moves

These are the recognizable moves that make a Prism screen look like Prism. Each is described in Prism's terms and mapped to tokens and components. None of them may be used to rebuild the composition of a specific reference screen (ADR-0015). Sample strings are invented.

### 4.1 The world is the ground

A single full-bleed map, photograph or 3D render forms the backdrop of an ops screen and supplies all of its color. The UI stays achromatic on top of it.

- The imagery is desaturated and graded toward the canvas hue. Only vegetation, water or the subject keep a hint of hue.
- Under the primary rail the backdrop fades horizontally into the page (about 35 % of the width), so dense panels sit on near-black while the open centre shows the world.
- Numbers: backdrop OKLCH L within the glass test range 0.30–0.49 (§7.3); fade to `bg.page` #0D0E11; chrome = white at 6/9/12 % fills and 100/64/55/42 % text.
- Tokens and specs: `bg.page`, `material.glass.*`; the map itself stays in the app (decision #7; Prism ships map style tokens only).
- Sources: Vexto traffic §3, §9.1; Vexto incident, What makes it beautiful #1; Arvion §9.7 (render graded to indigo).

### 4.2 The instrument numeral

A large thin numeral reads like a gauge, not a spreadsheet cell. The significant digits are full white or ink. The insignificant tail (decimals, thousands remainder) is dimmed at the same size, and a small unit hangs on the baseline beside it.

- Numbers:
  - Screen hero: `metric.xl` 48/300 (200 in dark at 34 pt or more).
  - Card hero: `metric.lg` 32/300.
  - Trailing group: `text.dimmed` (white 42 % / #7E838F), ≥ 24 px only.
  - Unit: `metric.unit` 12/400 in `text.secondary`, 6 px gap.
  - Figures proportional, or tabular when live. Exactly one screen hero.
- Example: a hero reading "86" + ".4" (dimmed) + "%" (hung unit).
- Tokens and specs: `Text` roles `metric-xl`/`metric-lg` with `trailing` and `unit`; `DSHeroNumber` in the data-viz wave.
- Sources: Vexto traffic §4.3, §9.3; Vexto incident, Principles #6; Soma §4.3, §10.4; Arvion §4.3; CreditPros §4; Hydroflask §5.

### 4.3 The glass vehicle card

A glass card floats over a map or photograph next to the object it describes: a vehicle, a device, a site. The backdrop stays visible through it, so the card belongs to the world rather than to the page.

- **Anatomy.** It keeps the corner-pinned anatomy (§4.9):
  - entity name (`headline`) and a timestamp caption (`data` tabular, `text.secondary`) top-left;
  - the open affordance top-right;
  - a status row in the body (connectivity icon + label, an outlined status pill) or a `TimelineScrubber`;
  - optionally a line-art illustration whose affected sub-region carries a state tint (§4.11).
- **Selection.** The one selected card turns to **light glass** lit from its top-left corner, with the bloom clipped away from the header text. Its siblings stay dark glass or solid.
- **Material, dark mood.** `material.glass.dark.fill` #101410 at 60 %, blur 32, saturate 1.2, 1 px edge white 15 % → 0, elevation `overlay` (0/24/48 black 35 %). Text is white 100/78/64 %: 16.68 / 10.54 / 7.51 over the darkest test backdrop, 12.75 / 8.43 / 6.24 over the lightest. Any chart inside gets `chart.plot`.
- **Material, light mood.** Over a bright photograph: `material.glass.dark.fill` #0A0C08 at 55 %, blur 40, saturate 0.8, edge 22 % → 8 %, grain 4 %.
- **Selected.** `material.glass.light.fill` white 26 %, blur 40, bloom 35 %; only over backdrops at OKLCH L ≤ 0.35. White text reaches 5.86 over the darkest test backdrop and 5.14 at the limit.
- **Geometry.** `radius.card` 24 (20 compact). Phone readout about 200 × 150; desktop entity card about 230–240 × 300.
- **Fallbacks.** Reduce Transparency: surface-1 at 92 %. watchOS: no blur; `surface.raised` per the watch token, solid per `Surface.yaml` (B22). *(Superseded by ADR-0022, 2026-09-15: the opaque raised fallback under Reduce Transparency, Increase Contrast and on watchOS; `inverse` for the selected card.)*
- **Example.** Title "Unit 4417", caption "14:05:22", status pill "In service".
- Tokens and specs: `Card variant: glass`, `backdrop: image | map` (`Card.yaml` examples `glass-vehicle` and `glass-selected`, whose strings are invented, B26); `Surface material: glass | glassLight`.
- Sources: Vexto traffic §2.5, §3, §6; Vexto incident, Surfaces & Depth and What makes it beautiful #2–3; Soma §2.5, §10.13 (smoky glass widget over a photo); Arvion §3 (dark glass card over a light photo), §11.10.

### 4.4 The vivid 2×2

Four vivid tiles in a 2×2 grid are the one thing a screen sells, usually its key metrics. Each tile keeps the corner-pinned anatomy, and each uses a different gradient from the **same** scheme set, so the grid reads as one warm or one cool object.

- **Anatomy.** Title top-left, `nav.open` top-right, hero metric bottom-left, and a white sparkline or delta bottom-right when the zone allows it.
- **Behind and on the tiles.** Every tile renders its bloom behind itself on the page (30 % alpha, 150 px blur) and carries grain (0.05–0.06 light, 0.08–0.10 dark) and an inner top highlight. No border, no colored shadow.
- **Numbers.**
  - Gap: `space.card-gap` 12 at regular (the reference used about 14).
  - Radius: `radius.card` 24; 20 compact; `card-large` 32 (a side of 200 or more).
  - Size: on a 393-pt phone at regular density a tile is (393 − 2 × 24 − 12) / 2 ≈ 166 wide; `size.card.min` 200 applies to grid cards, not to 2×2 tiles **(reconstructed)**.
- **Limits.** One 2×2 per screen; vivid cards come in even counts and never touch glass; text only inside each gradient's text-safe zone (§5). With the seeded gradients, of the light set only `sky` covers the top-left header (§5.3, Appendix B, B5).
- **Example.** Four tiles titled "Throughput", "Uptake", "Retention" and "Yield" with metrics such as "4.2k".
- Tokens and specs: `Card variant: vivid`, `vivid: <name>` (`Card.yaml` example `vivid-orchid-kpi`, whose strings are invented, B26); `ref.gradient.vivid.*`; `DashboardGrid` hero row.
- Sources: Hydroflask §3, §4, §7 (capsule stat tiles with grain, dotted seam and color-bleed glow), §10; CreditPros §2 Vivid surfaces, §9 #3; Credit Karma, Principles #5 (vivid is at most one card in six); Family A (a 2×2 vivid grid in the owner's light CRM screenshot) **(reconstructed)**.

> **P1-9 (2026-09-16; ADR-0029 §2.5).** A 2×2 is one temperature through two gradients, not four: it alternates one slot pair on its diagonals, slot 1 on the leading diagonal and slot 2 on the other (or slots 3 and 4), and two vivid cards side by side use one pair. The pairs are light sky + orchid and rose + olive, dark plum-dusk + navy-cyan and night-lagoon + forest-moss; `gradient/slot-temperature` keeps each pair one temperature for every brand. The bloom behind a tile is its brightest stop at 30 % (light) or 45 % (dark) with a 75 blur.

### 4.5 The lit tile in a slab

A group of tiles is set almost edge to edge, so the group reads as one dark slab. Exactly one tile is filled with the attention color. That tile is "lit", and its nested controls lighten with it.

- Numbers:
  - `space.tile-gap` 4/6/8 inside the slab; `space.group-gap` 12/16/24 between groups.
  - Tile radius `radius.tile` 16; padding `space.card-padding`.
  - Lit tile: `bg.fill.accent` with `text.on-accent` ink. Dark: `accent.500` #F39444, 8.39:1. Light: `accent.300` #FFC07A, 12.02:1.
  - Controls on the lit tile use `bg.fill.neutral.subtle` in place of `surface.raised`.
- Where it is used: KPI tile groups in a sidebar or rail, and the count-tile rows of an ops console.
- Sources: Arvion §5, §9.5, §2.2 (2×2 slab with one lit tile); Vexto traffic §5 (four count tiles in a row).

### 4.6 The hairline instrument chart

A line chart drawn like an instrument trace, in five parts:

1. A thin primary series.
2. A fainter comparison series behind it.
3. A dashed target with an inline label.
4. Full-height translucent bands marking time windows, each window bookended by dots.
5. A value above and a delta below each level segment of step charts.

The chart has no fills, no axis lines and no vertical grid. The Y labels sit on the trailing side, outside the plot. An off-target window is drawn in the accent.

- Numbers: see §8. In short: line 2, comparison 1 at 40 %/30 %, target 8/6 dashed at 60 %/30 %, grid 4/6 dashed at 12 %/10 %, band 6 %/5 %, endpoint dots 10, axis 12 px at white 55 % or `neutral.600`.
- Tokens and specs: `sys.chart.*`, `sys.stroke.target|grid`; `LineChart` with `ReferenceLine` and `RangeBand` (decision #7).
- Sources: Vexto traffic §7, §9.7; Vexto incident, Charts; Soma §7; Hydroflask §8 (focus range solid, tails dotted); CreditPros §7; Arvion §7, §9.8.

### 4.7 One solid among hairlines

Every control in a group is a hairline ring, a raised pill or a glass button, except one. That one element is an inverse solid (§1 principle 9).

- **Light mood.** An ink circle or pill with a white glyph: the one action circle on a card, the primary pill in a dock.
- **Dark mood.** A white disc with a black glyph: the active tool in a round-button track, the send button, the active segment.
- **On vivid or glass.** The solid flips to white with an ink glyph, and rings go to white 40 %.
- Numbers:
  - Controls `size.control` 40 pointer / 44 touch; Credit Karma's touch circle is 52 (`ref.size.control.xl`).
  - Hairline ring: 1 px `border.strong`, or `border.boundary` when the ring alone identifies the control.
  - Track: glass chip (white 25 % toolbar) or `surface.raised`, 52 tall with 4 inset and 4 gaps around 44 buttons.
  - Dock: 64 tall, 12 inset, holding round 44 + primary pill 88 × 56 + round 44.
- Tokens and specs: `bg.fill.inverse`, `text.on-inverse`; `Button variant: primary`, `IconButton`, `SegmentedControl`, `Toolbar`, `TabBar`.
- Sources: Vexto incident, Principles #15; Credit Karma, What makes it beautiful #4 and Components; CreditPros §9 #6; Arvion §3, §11.3; Soma §5, §10.8, §12.7 (dock); Hydroflask §7 (active chip, day disc, tab disc 56).

### 4.8 One light source

A screen has at most one lit surface. Two forms:

- **Lit focus sheet.** One tinted content surface lit from off centre, like paper under a lamp. It is separated from the page by hue, not by value.
- **Warm bloom.** A single soft bloom behind the hero, so the dark hero numeral sitting half on it looks lit.

Everything else stays neutral.

- Numbers:
  - Tinted sheet: `bg.tint.accent` #F39444 at 12 % → #FEF2E9 on white.
  - Radial light: ellipse 70 % × 55 % centred at 45 % / 38 %, white 45 % → 0 at 65 % (Soma §12.2).
  - Sheet geometry: `radius.sheet` 28, inset 8, padding 24.
  - Bloom: the vivid bloom recipe (30 %, 150 px blur) or Credit Karma's four-stop warm radial (about 45 % × 60 % of the viewport, 100 px blur, 4 % grain), anchored to the hero, never behind hairlines or grey captions.
- Tokens and specs: `Card variant: tinted` (`Card.yaml` example `tinted-focus`); bloom from `ref.gradient.vivid.*.$extensions.app.prism.bloom`.
- Sources: Soma §2.2, §10.1–2, §12.2; Credit Karma, What makes it beautiful #1 and Principles #3; CreditPros §9 #4.

### 4.9 Corner-pinned card anatomy

The card most screens are built from. It is a Surface with a fixed anatomy:

- title and caption pinned top-left;
- one action or the open affordance pinned to the top-right padding corner;
- the hero pinned bottom-left;
- meta or a mini chart pinned bottom-right on the hero's baseline.

The middle may stay empty, and that emptiness is part of the look. The same affordance sits in the same corner of every card on a screen, so a grid of cards reads as one instrument.

| Part | Rule | Tokens |
|---|---|---|
| Root | Surface in `solid`, `vivid`, `glass` or `tinted`; keeps its declared aspect | `comp.card.*`; `radius.card` 24, `card-compact` 20, `card-large` 32 (a side of 200 or more) |
| Padding | `space.card-padding`: 16 compact / 24 regular / 24 comfortable | `comp.card.padding` |
| Icon ring (optional) | 44 hairline ring with a 20 icon, top-left above the title; the title starts about 40 below the ring row at regular density | `size.icon.ring`, `border.hairline`, `size.icon.md` |
| Header | title `headline` 18/400 (never bold, at most 2 lines) + caption `caption` 12/400 in `text.secondary` | `type.headline`, `type.caption` |
| Action | the `nav.open` glyph (16, `icon.secondary`) at the padding corner makes the whole card pressable; or exactly one solid circular IconButton (40/44), and then only that button is pressable | `size.control.md`, `size.icon.sm` |
| Hero | `metric.lg` 32/300 with dimmed trailing group and hung unit; 8 (compact) to 12 (regular) below the header block **(reconstructed spacing)** | `type.metric.lg`, `text.dimmed`, `type.metric.unit` |
| Aside | a Sparkline (32–40 tall) or meta text, baseline-locked to the hero, `space.3` (8) from it | `comp.card.gap`, `space.3` |
| Hover | pointer only; neutral overlay on solid; vivid and glass unchanged | `bg.fill.neutral.subtle` |

- **One action per card.** Never a button row inside a card.
- **One radius family** per screen.
- On watchOS the card becomes a solid, compact, full-width row with no aside (`Card.yaml`).
- Example: a card titled "Line output" with caption "Last 24 hours", hero "86" + ".4" + "%", and a sparkline aside.
- Sources: Vexto incident, Principles #11 and What makes it beautiful #9–10; Vexto traffic §9.10; Credit Karma, What makes it beautiful #5 and Principles #10; CreditPros §9 #7, §11 #10; Hydroflask §6 (label top, numeral bottom-left, pill bottom-right); Arvion §5, §9.11 (one utility button at a fixed top-right inset). Spec: `Card.yaml`.

### 4.10 Two materials on one page

A light, airy dashboard and a dark instrument surface share one screen. They are separated by **material**, not by a dimming scrim. The two forms:

- **Docked dark band.** A near-black band holds history and offers on exactly the same column edges as the light area above it. On compact width it becomes a draggable sheet whose top edge dips around the handle.
- **Smoked-glass detail drawer.** It slides over the light page from the side and overlaps the right column instead of pushing it. The page stays undimmed, and the drawer separates from it by tint, blur and one long soft shadow.

Numbers:

- **Band.** Starts at about 75 % of the height and reuses the page columns. Its notch is 120 × 12 with 20 px fillets and a 40 × 3 handle. On compact width the sheet starts at about 72 % of the height.
- **Drawer.**
  - Geometry: about 460 wide, full content height, inset 16, `radius.sheet` 28 (the reference measured about 30), padding 24, action bar pinned to the bottom.
  - Material: light-scheme `material.glass.dark.fill` #0A0C08 at 35 % over a vivid or photographic backdrop, blur 40, edge 22 % → 8 %, grain 4 %.
  - Elevation: `shadow.drawer` 0/30/80 black 25 %.
- Tokens and specs: `Sheet`, `bg.page` (dark band), `material.glass.dark.fill`, `shadow.drawer`; `DetailScreen` and `AdaptiveShell` patterns.
- Sources: Credit Karma, What makes it beautiful #8 and #11, Principles #14; CreditPros §3 S4, §9 #9.

### 4.11 Red as a translucent material

An incident is marked in layers of translucent red. Red is never a flat block and never sits behind body text.

- **Layers.**
  - a 10 % red wash behind the alert rows, with no border;
  - an outlined status pill with a faint fill;
  - a recolored route or stroke segment;
  - a red glass disc with a slowly rotating dashed halo on the map;
  - a 45–55 % tint over only the affected sub-region of a line-art illustration.
- **Text stays white.** Solid red appears only in the badge and the alert glyph.
- **Numbers.**
  - Wash: `bg.tint.critical` 10 % (#322123 on surface-1).
  - Outlined status pill: neutral outline `border.strong` (white 35 %); critical variant with a 50 % critical border, 12 % fill and `text.critical`.
  - Badge: `bg.fill.critical` #E5252A with white `micro` 11/500 at 4.54:1.
  - Marks: `icon.status.critical` = `mark-dark` #FF4642.
  - Map marker (app-side): a 32 disc at 45 % with blur, and an 80 dashed halo 1 px at 70 %, dash 4/4.
- Tokens and specs: `bg.tint.critical`, `text.critical`, `bg.fill.critical`, `Badge`, `StatusPill`, `Banner`.
- Sources: Vexto incident, Overview, What makes it beautiful #7–8 and Principles #12–14; Vexto traffic §11.10; Arvion §11.13 (glowing alert with quiet text).

> **P1-9 (2026-09-16; ADR-0030 §1.8, §6.2).** Over media (a map, an image, vivid or glass), a tinted element that carries text or a glyph (a status pill, a badge, the danger button) paints `color.bg.page` under its tint: dark `text.critical` on the critical tint reads 5.76:1 over a map road with the page under it and only 4.04:1 without (the negative fixture `tools/contrast/fixtures/broken-tint-on-map/`). A text-free area wash, such as a closed bridge on the map, paints the tint alone so the map shows through, carries its status stroke, and puts its label in a pill that follows the rule. Map hue never carries status: light water is the info hue at 16 %, so status on the map is always a stroke and a labelled pill.

### 4.12 Datasheet ornament

Technical drawing used warmly, as texture:

- dotted leaders from a label to its right-aligned value;
- tick rulers before table values and as scrubbers;
- a faint dot-grid stage behind illustrations;
- dashed rings and planned routes;
- 1 px line-art drawings;
- one monochrome micro-glyph per metric (dot scale, mini bars, ring row, tick ruler).

It is always decorative. The value text carries the meaning.

- Numbers:
  - Leader: `stroke.leader` 1.5 on / 4.5 off, round caps.
  - Dot-grid stage: 1.5 px dots at 14 px pitch, ink 4 %.
  - Tick rulers: 1 px ticks at 4 px pitch, 24 tall, white 25 %; majors every 5th unit.
  - Line art: 1 px at white 60–80 % or ink 80 %.
  - Micro-glyphs: 32–40 tall.
  - Spec rows: `size.row` 44, icon 18 + 8 gap.
- Tokens and specs: `sys.stroke.leader`, `chart.ghost`, `ListRow` (spec row), `Sparkline`.
- Sources: Soma §10.6, §12.9–12.10; Vexto traffic §9.9; Arvion §7 (tick-ruler event strip); Credit Karma, What makes it beautiful #7; CreditPros §9 #8.

### 4.13 Stepper with faded past and future **(reconstructed)**

A vertical progress list in which only the current step is fully present:

- The active row is full contrast and carries the one solid inverse pill.
- Done rows and upcoming rows are dimmed as whole rows, so the eye lands on "now" without color.

- Numbers:
  - Done and next rows at `opacity.dimmed-row` 0.30.
  - Active row at full contrast, with `bg.fill.inverse` on its pill.
  - Row height `size.row`.
- Tokens and specs: `ref.opacity.dimmed-row` ("done/next rows in a stepper"); `Stepper`, `Timeline` composites.
- Sources: Family A, the owner-pasted light CRM screenshot (`references.json` `owner_pasted_screenshots.family_a`, not analyzed in a refs file); `agent/SKILL.md` signature moves (which name `opacity.dimmed`, B23). The details are recovered from the tokens and the agent skill, not from an analysis.

### 4.14 Glass status cells over a render

A grid of translucent cells floats over a 3D render or a floor plan. Each cell's state is carried by its thin colored border and a small label, while the fill stays neutral glass, so twenty cells read as a structure, not a rainbow. Empty slots keep their full size and show an add affordance, so the grid never collapses.

- Numbers:
  - Cell: `material.glass.cell` white 20 % (fill tinted at most 20 % toward the status hue), blur 12, radius `radius.inner` 8 to `radius.media` 12, with a 1.5 px (`ref.border.strong`) status border.
  - Labels: `label.sm` 12 minimum, never the 10 px seen in the reference; an icon or shape accompanies each status for color-vision deficiency.
- Tokens and specs: `material.glass.cell`, `icon.status.*`, `border.strong` (width); `Heatmap` (tier 2) or an app grid of `Card variant: glass`.
- Sources: Arvion §2.4, §3, §9.6, §9.11, §10; Arvion §5 (empty slots keep size).

### 4.15 Fade truncation

Generated or long prose never ends in an ellipsis. Its last lines fade out, which invites the reader to expand it. Identifiers do the opposite: they truncate with an ellipsis next to a copy affordance, and the full value goes into the accessibility label.

- Numbers:
  - Fade: the last two lines at 60 % and 25 % of the tone (the full-text line stays at 100 %).
  - Identifier chip: `label.sm` / `data` with a 16 px copy glyph.
- Tokens and specs: `Text truncation: fade | ellipsis` (`Text.yaml`).
- Sources: Arvion §4.4, §9.10; Vexto incident, Typography (truncated ids with copy).

### 4.16 The map HUD

On a phone the map fills the screen and every control floats:

- glass pills and round buttons along the top;
- one glass readout card floating mid-screen next to its marker (§4.3);
- a bottom sheet rising from the lower third, with device-matched corners.

- Numbers:
  - Round buttons 44 at 16 inset; pills 44–48.
  - Readout card about 200 × 150.
  - Sheet from 62–72 % of the height, padding 20–24, top radius `radius.sheet` 28 or the device corner (about 44).
  - Toolbar track 52 tall with 44 buttons (§4.7).
  - Content scrolls under a floating tab bar 72 tall, 24 from the bottom, 16 from the sides (Hydroflask).
- Tokens and specs: `Sheet`, `Toolbar`, `TabBar`, `material.glass.dark.chip` (controls over the map); `AdaptiveShell` pattern (stack on phone).
- Sources: Vexto traffic §5; Vexto incident, Layout & Spacing and Principles #15; Credit Karma, Layout & Spacing (sheet at about 72 %); Hydroflask §12.10.

### 4.17 Title in the backdrop, two-tone headline

On a dark ops screen the page title has no header bar: it is set as large thin type directly on the backdrop, near the top-left of the open area. That creates a calm diagonal reading path across asymmetric rails.

In the light mood the H1 is a two-line headline whose second line has the same size and weight at reduced tone.

- Numbers:
  - Backdrop title: `display.xl` 64/300 at the page margin, about 120 from the top.
  - Two-tone headline: `title.lg` 32/500, second line in `text.secondary`.
- Tokens and specs: `Text` `display-xl`, `title-lg` (`Text.yaml` example `title-two-tone`).
- Sources: Vexto incident, What makes it beautiful #13; Vexto traffic §4.2; CreditPros §4, §11 #9.

---

## 5. Vivid surfaces and the text-safe zone

> **ADR-0022 (2026-09-15).** Since ADR-0022 the zones below are informative only: every gradient must pass V1 (every stop at least 3.0:1 against white) and V2 (the Card header block at least 4.5:1), and no gradient declares a zone. The stops and contrasts in §5.2 and §5.3 are the seeded ones, which P1-1 retuned (§3.5).

Every `ref.gradient.vivid.*` description points here ("see visual-dna.md for the text-safe zone"). The zone says where text may sit on each gradient and which text color is safe. `tokens/contrast-pairs.json` checks `color.text.on-vivid` against every stop inside the declared zone. The zone boundaries below were recomputed from the seeded stops during reconstruction, so the whole section is **(reconstructed)** in its numbers but not in its rules.

### 5.1 Rules

1. **Text color.** Text on vivid is `color.text.on-vivid`, which is white (`neutral.0`) in both schemes. Under a vivid Surface, Text's secondary and tertiary tones map to white 78 % and 64 % (`Text.yaml`). Ink text on vivid is not a token.
2. **Geometry.** Positions are measured along the gradient axis as *t*, from 0 at the first stop's corner to 1 at the last stop's corner, using CSS angle semantics (§3.5). On a card of width W and height H, the point (x, y) with y running down sits at `t = 0.5 + ((x − W/2)·sin θ − (y − H/2)·cos θ) / (|W·sin θ| + |H·cos θ|)`.
3. **Zones.**
   - **Functional zone.** Every point has white ≥ 4.5:1. Body, labels, captions and titles below 24 px go here.
   - **Large zone.** Every point has white ≥ 3:1. Metrics and display text of 24 px or more go here, as do glyphs and sparklines, which are non-text at 3:1.
   - **78 % caption zone.** White 78 % holds 4.5:1. `Text` secondary captions go here.
   - Everything outside the large zone is **no-text**: no captions, hairlines, dotted seams or grey text on the bloom end or the lightest stop (`Card.yaml`).
4. **Why the stops are enough.** The zone is checked at every stop inside it and at its boundary color. White-text contrast along an sRGB segment is worst at the lighter end, so checking stops is enough.
5. **Grain.** Grain is excluded from the computation. It is masked to 0 under text smaller than 13 px (CreditPros §11 #18) and dropped under Increase Contrast **(reconstructed)**.
6. **Declared margin.** Zone edges are rounded inward to the nearest 0.05 below the exact crossing, as a margin for grain and rendering differences.

### 5.2 Declared zones

White contrast at each stop, then the zones. "Edge" is the boundary color on the light side of the zone and its white contrast.

| Gradient | Axis (start → end) | Stops: white contrast | Functional zone (≥ 4.5) | Large zone (≥ 3.0) | 78 % caption zone | No-text |
|---|---|---|---|---|---|---|
| `orchid` (light) | 165°: top (slightly left) → bottom (slightly right) | #E88BD0 2.32 · #B96CB4 3.58 · #6C5A66 6.38 | **t 0.70–1.00**, edge #966491 4.65 | t 0.30–1.00, edge #C976BD 3.08 | none (exact crossing t 0.966) | t < 0.30 (the upper band) |
| `olive` (light) | 135°: top-left → bottom-right | #4F5A38 7.36 · #8A9C42 3.04 · #C4DD6A 1.51 | **t 0–0.25**, edge #6A783D 4.81 | t 0–0.55, edge #8A9C42 3.04 | t 0–0.10 | t > 0.55 (lime bloom corner) |
| `rose` (light) | 135° | #8E5A55 5.61 · #B3706A 3.86 · #C9927A 2.67 | **t 0–0.25**, edge #A06560 4.63 | t 0–0.80, edge #C08474 3.08 | none | t > 0.80 |
| `sky` (light) | 165° | #4A4C78 8.09 · #556BA6 5.20 · #8BA9C0 2.46 | **t 0–0.55**, edge #5A71A9 4.79 | t 0–0.85, edge #7B96B8 3.03 | t 0–0.30 | t > 0.85 |
| `ember-night` (dark) | 160° | #3D1A06 15.57 · #7A3A1E 8.57 · #C9642F 3.93 · #E38B3A 2.62 | **t 0–0.75**, edge #B55A2B 4.72 | t 0–0.90, edge #D27133 3.42 | t 0–0.60 | t > 0.90 |
| `plum-dusk` (dark) | 150° | #1E1226 17.95 · #3A1F3F 14.51 · #5B4A7A 7.76 · #6F7FC8 3.79 | **t 0–0.90**, edge #676AA9 5.00 | t 0–1.00, min 3.79 | t 0–0.80 | none for ≥ 24 px |
| `forest-moss` (dark) | 170° | #0F1A14 17.82 · #1B2922 15.14 · #4E6040 6.84 · #6E7B3A 4.61 | **t 0–1.00**, min 4.61 | t 0–1.00 | t 0–0.85 | none |
| `navy-cyan` (dark) | 180°: top → bottom | #252E3F 13.63 · #223545 12.63 · #5DA8B9 2.70 · #80B8C4 2.19 | **t 0–0.60**, edge #3F6E7F 5.57 | t 0–0.70, edge #5395A6 3.38 | t 0–0.55 | t > 0.70 (cyan base) |

`orchid` is the only gradient whose dark end is at the **bottom**. The other seven start dark at the top or top-left, which is where the card header sits.

### 5.3 What the zones mean for the corner-pinned card

The reference card is 240 × 240 with 24 padding. Its regions:

- **Header:** title and caption, x 24–176, y 24–67.
- **Action glyph:** 16 px at the top-right padding corner.
- **Hero:** `metric.lg`, x 24–144, y 184–216.
- **Aside:** 80 × 32 at the bottom-right.

Each cell gives the minimum white contrast inside the region and whether it meets the tier the region needs: header 4.5, glyph 3.0, hero 3.0, aside 3.0 for a sparkline or 4.5 for 12 px meta.

| Gradient | Header (4.5) | Open glyph (3.0) | Hero (3.0) | Aside: sparkline / meta | Anatomy that fits |
|---|---|---|---|---|---|
| `orchid` | 2.55 ✗ | 2.95 ✗ | 4.30 ✓ | 4.77 ✓ / ✓ | hero and aside only; **the header fails** |
| `olive` | 3.24 ✗ | 3.11 ✓ | 2.18 ✗ | 1.74 ✗ / ✗ | only a short title in the top-left corner (t ≤ 0.25) |
| `rose` | 3.84 ✗ | 3.76 ✓ | 3.20 ✓ | 2.86 ✗ / ✗ | hero; the header only as a short title or at ≥ 24 px |
| `sky` | 5.79 ✓ | 6.07 ✓ | 3.09 ✓ | 2.83 ✗ / ✗ | header, action and hero; keep the aside empty |
| `ember-night` | 9.19 ✓ | 9.70 ✓ | 4.15 ✓ | 3.42 ✓ / ✗ | full anatomy with a sparkline aside (no meta text) |
| `plum-dusk` | 13.49 ✓ | 13.72 ✓ | 6.89 ✓ | 5.00 ✓ / ✓ | full anatomy |
| `forest-moss` | 15.16 ✓ | 15.73 ✓ | 6.12 ✓ | 5.60 ✓ / ✓ | full anatomy |
| `navy-cyan` | 13.01 ✓ | 13.26 ✓ | 2.38 ✗ | 2.38 ✗ / ✗ | header only; the hero must sit at t ≤ 0.70 (upper two-thirds) |

A 320 × 200 landscape tile gives the same header, hero and aside verdicts. Only the open glyph flips: `orchid` passes at 3.22 and `olive` fails at 2.58.

**Consequence.** With the seeded stops, only `plum-dusk` and `forest-moss` cover the whole corner-pinned anatomy; `sky` covers it with an empty aside; `ember-night` with a sparkline-only aside. None of the light set supports the functional header that `Card.yaml` and the vivid 2×2 put in the top-left (except `sky`). This is the largest open issue of the reconstruction; it is recorded in Appendix B (B5) with fix options, and must be resolved in P1-1 before the light-airy vivid 2×2 ships.

Until then a vivid card may only place text where its zone allows:

- choose a gradient whose zone covers the anatomy the card needs;
- or keep the title short enough to stay inside the corner zone.

`tools/contrast` checks the declared zones; the gallery lint checks the placement **(reconstructed)**.

---

## 6. Layout and spacing

Pattern specs (`spec/patterns/*.yaml`) take their column counts, gaps and hero sizes from this section (`spec/patterns/README.md`).

### 6.1 Rhythm: `ref.space` on a 4 px base

| Token | px | Typical use | Where the value comes from **(reconstructed attribution)** |
|---|---|---|---|
| `space.0` | 0 | — | — |
| `space.1` | 4 | tile gap (compact), badge offset, toolbar gaps | Vexto incident spacing scale; Arvion 4–6 tile gap |
| `space.2` | 6 | tile gap (regular), unit gap beside a metric | Arvion tile gap; Vexto unit gap 6 |
| `space.3` | 8 | button icon gap, chip gap, card gap (compact), aside gap | all families |
| `space.4` | 12 | card gap (regular), internal card rhythm, button padding sm | Vexto, Credit Karma, CreditPros |
| `space.5` | 16 | card padding (compact), group gap (regular), button padding md | Vexto incident, Hydroflask |
| `space.6` | 20 | sheet padding in the references, button padding lg | Vexto incident sheet 20; Soma margins 20 |
| `space.7` | 24 | card padding (regular), page margin (regular / comfortable) | Vexto 24; CreditPros 24; Soma 24 |
| `space.8` | 32 | section gap (regular) | CreditPros sections 32–40 |
| `space.9` | 36 | wide page margin of the light desktop dashboard | Credit Karma desktop margin 36 |
| `space.10` | 40 | section gap (comfortable), gaps between blocks inside a card | Soma 40; CreditPros 40 |
| `space.11` | 48 | header row height, section header offset | Credit Karma 48 |
| `space.12` | 64 | icon-rail gutter | CreditPros rail 64–72 |
| `space.13` | 104 | the wide gutter that holds the bloom and the hero instrument | Credit Karma 7 % gutter (104 at 1440) |

### 6.2 Density (`tokens/sys/density/*`)

| Token | compact | regular | comfortable |
|---|---|---|---|
| `space.tile-gap` | 4 | 6 | 8 |
| `space.card-gap` | 8 | 12 | 12 |
| `space.group-gap` | 12 | 16 | 24 |
| `space.section-gap` | 24 | 32 | 40 |
| `space.card-padding` | 16 | 24 | 24 |
| `space.page-margin` | 16 | 24 | 24 |
| `size.row` | 32 | 44 | 52 |
| `size.control` | 32 | 40 | 48 |
| `type.body-line-height` | 1.4 | 1.5 | 1.55 |

Defaults (ADR-0010): compact on desktop, regular on touch, comfortable on watchOS and as an accessibility choice. Modality sets `size.hit` to 28 (pointer) or 44 (touch).

> **P1-9 (2026-09-16; ADR-0029 §3.1, §3.2).** The compact page margin is 24, so every density has a 24 page margin. A fourth density, `watch`, is regular with a 16 card padding (controls 32 / 40 / 44, row 44) and is the watchOS default; `comfortable` stays an accessibility choice and no platform's default.

> **2026-09-15.** ADR-0024 §7 replaces the single `size.control` row with `size.control.sm|md|lg` = 28/32/40 (compact), 32/40/44 (regular), 44/48/52 (comfortable); ADR-0021 §6 deletes the body line-height row (density does not change typography). ADR-0019 §2 fixes the per-platform defaults, with the web choosing regular while a touchscreen is present.

The references measure phones at 16–20 pt margins and 16–20 card padding. Compact density reproduces that; regular, the touch default, is one step airier. Desktop dashboards in the references (24–36 margins, 16–24 card padding, 12 gaps) measure like regular density.

### 6.3 Grid by platform

| Context | Columns | Page margin | Card gap / group gutter | Card min | Hero span | Notes |
|---|---|---|---|---|---|---|
| watchOS | 1: a vertical stack of at most three glanceable tiles | system list insets | `card-gap` | — | full width | Card is a solid full-width row with no aside; `metric.xl` renders at 40; no vivid or glass (§1 principle 6) |
| Phone: compact width, < 600 **(reconstructed)** | 1 card column; tiles 2-up (the 2×2) | `page-margin` | 12 / 16 | cards full width; tiles ≈ 166 at 393 pt | full width | carousels run edge to edge with a 40 peek and gap 12; the floating tab bar takes 72 + 24 at the bottom |
| Tablet: regular width, 600–1023 **(reconstructed)** | 2 | `page-margin` | 12 / 16 | `size.card.min` 200 | 2 | a trailing panel appears only in landscape **(reconstructed)** |
| Desktop: ≥ 1024 **(reconstructed)** | 4 card columns on a 12-column grid (3 each) | `page-margin` (24 for dashboards) | 12 / 16 | 200 | 2 | rails and bands per §6.4 |

These are the `DashboardGrid` values in `spec/patterns/README.md`: columns `{compact: 1, regular: 2, desktop: 4}`, gap `space.4` (12), gutter `space.5` (16), `cardMinWidth: size.card.min`, `heroSpan: {regular: 2, desktop: 2}`.

### 6.4 Composition rules: desktop

Each rule combines measurements from at least two families; a pattern example must mix moves from at least two families and pass the ADR-0015 reference-distance review (Decision 3).

The rules set proportions and tokens only; they prescribe no order of blocks and no card sizes.

| Rule | Proportions and tokens | Sources |
|---|---|---|
| **Asymmetric rails** | A leading rail takes about 20–29 % of the width (≈ 340 at 1728, Arvion; ≈ 480 at 1920, Vexto traffic; ≈ 415 at 1440, Vexto incident). A trailing rail or column, when the screen needs one, takes 16–19 % (≈ 300 at 1920; ≈ 280 at 1440; CreditPros's trailing column ≈ 250 at 1440). The rails differ in width, and the open centre keeps the rest as the hero region (§6.6). | Vexto traffic §5; Vexto incident, Layout & Spacing; Arvion §5; CreditPros §5 |
| **Bottom band** | A band along the bottom takes about 22 % of the height (Vexto traffic ≈ 22 %; Credit Karma ≈ 24 %). It keeps the column edges of the area above it, spans at least two columns, and carries charts or history (§4.10). | Vexto traffic §5; Credit Karma, Layout & Spacing and Principles #14 |
| **Margins, gaps and gutters** | Page margin 24–36 (`space.7`–`space.9`): 24 on the dark consoles, 32–36 on the light dashboards. Card gap 12 (`space.4`) inside a group, 12–16 between groups. A wide gutter of 104 (`space.13`) may separate two content columns and hold a bloom or a bleeding instrument (§6.6); a leading icon rail takes the narrower 64 (`space.12`). | Vexto traffic §5; Vexto incident, Layout & Spacing; Arvion §5; Credit Karma, Layout & Spacing; CreditPros §5 |
| **Top row** | 36–48 tall. Pill tabs 40–44 with one inverse solid (§4.7); a search pill 210–260 × 44; 44 round buttons at 8 gaps, grouped at the trailing end. | Vexto traffic §5; Vexto incident, Layout & Spacing; Arvion §5; Credit Karma, Layout & Spacing |
| **Overlap instead of reflow** | Layers that float overlap a column instead of pushing it: a detail drawer of about 460 over the trailing column, inset 16, with no scrim (§4.10); a glass readout over the world next to its object (§4.3). | CreditPros §5; Vexto traffic §5; Vexto incident, Layout & Spacing |

### 6.5 Composition rules: phone

The condition of §6.4 applies here as well: every rule combines at least two families, and a pattern example mixes moves from at least two and passes the reference-distance review.

| Rule | Proportions and tokens | Sources |
|---|---|---|
| **Stage above a sheet** | A sheet or dark band rises from 55–72 % of the height (Soma ≈ 55 %; Vexto incident ≈ 62 %; Vexto traffic ≈ 68 %; Credit Karma ≈ 72 %), with padding 20–24 and a top radius of `radius.sheet` 28 or the device corner. The stage above it (map, illustration or instrument) holds floating controls and at most one readout card (§4.3, §4.16). | Soma §5; Vexto traffic §5; Vexto incident, Layout & Spacing; Credit Karma, Layout & Spacing |
| **Floating controls** | Round buttons 44 at a 16–20 inset; pills 44–48; a toolbar track 52 tall holding 44 buttons (§4.7). A floating tab bar or toolbar sits 24 above the home indicator and content scrolls under it (tab bar 72 tall, 16 from the sides). | Vexto traffic §5; Vexto incident, Layout & Spacing; Soma §5; Hydroflask §6; Credit Karma, Layout & Spacing |
| **Margins and gaps** | The references set phones at 16–20 margins, which compact density reproduces; regular density uses 24 (§6.2, B18). Card gap 12 (`space.4`), group gap 16 (`space.5`). | Hydroflask §6; Soma §5; Vexto traffic §5; Credit Karma, Layout & Spacing |
| **Overflow** | Content that does not fit moves to a carousel, a tab or a second screen instead of shrinking: a carousel runs edge to edge with a 40 peek and a 12 gap; a secondary grid becomes a tab. | Credit Karma, Layout & Spacing; Hydroflask §12.11 |

**Phone density cap.** A viewport holds either one hero card plus four tiles, or one hero number plus three action rows. More content becomes a second screen, not a longer one (Hydroflask §12.11; Credit Karma likewise moves secondary content behind a tab instead of shrinking it, Layout & Spacing).

### 6.6 Hero sizes

| Hero | Role or size | Where | Rule |
|---|---|---|---|
| Page title in the backdrop | `display.xl` 64/300 | dark-ops desktop | at the page margin, about 120 from the top, on the backdrop (§4.17) |
| Screen hero numeral | `metric.xl` 48/300 (200 dark, ≥ 34 pt) | one per screen, every platform | 40 on watchOS; clamps at accessibility3 |
| Card hero | `metric.lg` 32/300 | bottom-left of every corner-pinned card | trailing group dimmed, unit hung |
| Tile / inline metric | `metric.md` 20/400 tabular | tiles, table heroes, list values | — |
| H1 | `title.lg` 32/500 | light pages, phones | two-tone variant allowed |
| Hero card | spans 2 columns (regular width, desktop) | `DashboardGrid` hero row | one StatTile at hero size **or** one vivid card or 2×2; `radius.card-large` 32 (a side of 200 or more) |
| Hero region | 59–62 % of the main area (desktop world or viewport); 45–55 % of a phone (stage above a sheet) | ops screens, detail screens | whitespace goes to the region, not into cards |
| Bleeding instrument | gauge radius 110–120; up to about 40 % of the arc may crop off the edge on compact width while the numeral stays whole | light dashboards | Credit Karma, What makes it beautiful #12 |

### 6.7 Inside a card

- Padding is `space.card-padding`. The action sits at the padding corner. The icon ring row sits about 40 above the title baseline at regular density.
- Header → hero is 8 (compact) or 12 (regular). Hero → chart or media footer is 12–16, on a 12 px internal rhythm.
- Rows follow `size.row` (32/44/52); the references' table rows measured 40.
- Controls follow `size.control`. Chips are 32 visual with a 44 hit area on touch.
- Heroes of sibling cards share a baseline row, and actions share one inset (§1 principle 12).

---

## 7. Surfaces, elevation and materials

### 7.1 Materials by role

| Role | Material | Light | Dark |
|---|---|---|---|
| Ground | page | `neutral.100` #F1F2F5 (optional mesh, blooms) | `neutral.950` #0D0E11 (optional vignette) |
| Content | solid | white card, no border, no shadow | surface-1 white 6 % |
| Next step up | raised | white 70 % + inset top highlight + `shadow.raised` | surface-2 white 9 % |
| Control on a card, card over a map | nested | ink 6 % | surface-3 white 12 % |
| The one action or active element | inverse | ink #0D0E11 | white |
| The one thing a screen sells | vivid | light gradient set | dark gradient set |
| Things floating over imagery | glass | dark smoked glass over bright photos; light glass over vivid | dark glass over maps; light glass for the selected object |
| System chrome | native | Liquid Glass (Apple) / CSS imitation (web) | same |

Soma's split holds across the families: solid tint for readable content, translucent white for floating controls, dark opaque for the single primary action, glass only over imagery (Soma §3).

### 7.2 Elevation

Four levels (ADR-0009). `Surface.yaml` maps `flat | raised | floating | overlay` to `elevation.0–3`, which no token defines; the tokens are the `sys.shadow.*` below (B25). *(ADR-0024, 2026-09-15: specs bind `elevation.0–3`, which are `sys.shadow.flat|raised|floating|overlay` renamed; `shadow.drawer` stays.)* Depth comes from luminance, and shadows only appear under things that float over imagery. "Black" below is #000000.

| Level | `sys.shadow` | Light | Dark | Use |
|---|---|---|---|---|
| 0 | `flat` | none | none | every solid surface at rest |
| 1 | `raised` | 0 2 6 0 black 5 % | none: a +3 % luminance step (`ref.opacity.surface.raised`) | puffy controls on the light page |
| 2 | `floating` | 0 6 16 0 black 7 % | 0 8 24 0 black 30 % | round buttons and pucks over imagery |
| 3 | `overlay` | 0 24 60 0 #141414 10 % | 0 24 48 0 black 35 % | glass cards over maps (§4.3), popovers, floating readouts |
| — | `drawer` | 0 30 80 0 black 25 % | `ref.shadow.dark.modal` 0 30 80 0 black 50 % | drawers and modal sheets |

The families disagree about shadow. Hydroflask and Vexto incident use none at all. Soma shapes controls with soft shadows. Vexto traffic and CreditPros shadow only floating glass. Prism keeps shadows at 5–10 % on light and only for floating layers on dark; the web fallback never exceeds these (Hydroflask §12.6; Soma §12.1).

### 7.3 Glass recipes (`material.glass.*`)

| Material | Light scheme | Dark scheme | Use |
|---|---|---|---|
| `glass.dark.fill` | #0A0C08 55 %, blur 40, saturate 0.8, edge white 22 % → 8 %, grain 4 % (drawer 35 %) | #101410 60 %, blur 32, saturate 1.2, edge white 15 % → 0, grain 0 | panels, sheets and cards over a map (dark); a card or drawer over a bright photo or vivid (light). Takes the backdrop hue. |
| `glass.dark.chip` | #0A0C08 35 %, blur 24 | white 16 %, blur 20, edge 20 % → 12 % (toolbar 25 %) | controls over a map, render or photo |
| `glass.light.fill` | white 30 %, blur 24, saturate 1.1, edge 55 % → 0 (tab bar 45 %) | white 26 %, blur 40, bloom 35 %, only over backdrops at OKLCH L ≤ 0.35, bloom clipped away from text | chips, pills and rows over vivid (light); the selected or foreground object (dark) |
| `glass.light.chip` | white 25 %, blur 20 | white 16 %, blur 20 | small controls on vivid |
| `glass.cell` | — | white 20 %, blur 12; 1.5 px status border carries the status | status cells over a render (§4.14) |
| `glass.scrim` | black 35 %: bottom-up under text on unpredictable backdrops | black 40 %: modal backdrop dim and text scrim over bright photos | — |

**Legibility checks.** Measured over the test backdrops #283126 (OKLCH L 0.30) and #5B6366 (L 0.49):

| Material | White text | White 78 % | White 64 % |
|---|---|---|---|
| Dark glass, dark scheme | 16.68 / 12.75 | 10.54 / 8.43 | 7.51 / 6.24 |
| Dark glass, light scheme | 17.20 / 12.80 | 10.80 / 8.46 | 7.66 / 6.26 |
| Light glass, dark scheme | 5.86 over #283126 | 4.32 over #283126 | — |
| Light glass at its backdrop limit (neutral grey, OKLCH L 0.35) | 5.14 | 3.85 | 3.15 |

**Consequence.** Functional text on light glass is 100 % white. 78 % is the floor for captions, which reach 4.5:1 only over backdrops of OKLCH L ≤ 0.28 (Appendix B, B6).

> **ADR-0022 (2026-09-15).** The recipes become typed tokens (`$root`, `blur`, `saturate`, `edge.start`, `edge.end`, `grain`, `bloom`), light gains a `glass.cell`, and the dark-scheme `glass.dark.chip` and `glass.cell` become smoked fills (#101410 at 35 %). Light glass takes `text.on-glass-light` (ink in light, white in dark) with no alpha tones. Dark glass is limited to backdrops where white holds 3:1 (OKLCH L ≤ 0.67 for a neutral).

> **P1-9 (2026-09-16; ADR-0029 §1).** Glass follows the scheme. Two role recipes, `material.glass.fill` and `material.glass.chip`, alias `glass.light.fill|chip` in light and `glass.dark.fill|chip` in dark field by field; Card glass and Surface `glass` bind `fill`, chips, controls and status cells over media bind `chip`. The smoke loses its green-yellow hue: `ref.color.smoke.light` #0A0B0E and `.dark` #111316 sit at the neutral ramp's hue 265 with chroma 0.007, at the same lightness. The scrim is black 45 % in both schemes (large white text holds 3:1 over it on pure white); maps need no scrim. Over Prism's map, light glass carries ink with `neutral.600` for secondary and tertiary text and `neutral.500` for dimmed digits; over imagery and vivid it carries ink only; smoked glass keeps white 100 / 78 / 64 % everywhere. A dark photograph in the light scheme is a dark scope, not a smoked card.

**Fallbacks.**

- Under Reduce Transparency, glass turns opaque (`*-reduced-transparency`). Increase Contrast does not change glass in the current resolver (see B21). The reduced-transparency values (superseded by ADR-0022, 2026-09-15: one opaque raised fallback chosen by Surface, and these values are deleted):
  - Dark: `glass.dark.fill` becomes #1C1C1F at 92 %; `glass.dark.chip` #232426 at 92 %; `glass.light.*` and `glass.cell` #2A2B2E at 92 %; scrim stays 40 %.
  - Light: `glass.dark.*` becomes `neutral.900`, `glass.light.*` becomes `neutral.0`, scrim 0.
  - Blooms are dropped.
- On watchOS, blur is disabled (`material.blur.enabled` 0) and glass resolves to `surface.raised` per `tokens/sys/platform/watch.tokens.json`; `Surface.yaml` and ADR-0009 say solid (B22). *(Superseded by ADR-0022, 2026-09-15: the opaque raised fallback, chosen in DSCore; the watch token is deleted.)*
- Glass on a solid parent resolves to `surface.raised`.
- Never glass on glass.

### 7.4 Vivid material

A vivid surface is a gradient (§3.5) with four more layers:

1. monochrome grain (0.05–0.10, overlay blend, masked under text smaller than 13 px);
2. an inner top highlight (1 px, white);
3. a feathered edge of 2–3 px and no stroke **(reconstructed from Hydroflask §4)**;
4. a bloom of its top color rendered behind it on the page (30 %, 150 px blur).

It gets no border and no colored drop shadow. Under Reduce Transparency the bloom is dropped; on watchOS vivid resolves to solid. Sources: Hydroflask §4, §12.5; CreditPros §3, §11 #6, §11 #18.

### 7.5 Edges and hairlines

- **Solid cards** never get a border or a shadow at `flat`.
- **Glass** always gets a 1 px inner light edge, brightest at the top-left.
- **Tiles and nav pills** in dark may carry a 1 px white 8 % top edge (`border.hairline`).
- **Inputs, table rows and chip strokes** use `border.hairline`.
- **Outline pills and ghost buttons** use `border.strong`.
- **Control edges that alone identify a control** use `border.boundary`.
- **Focus rings** use `border.focus` at 2 px (`ref.border.focus`) outside the shape, following its radius.
- **Dark hairlines** (white 8 %, 1.26:1 on surface) are structure for sighted users only; spacing, not lines, carries grouping (Vexto incident, Accessibility risks #8).

### 7.6 Primitives behind the materials

| Group | Values |
|---|---|
| `ref.opacity.text` | secondary 0.64 · tertiary 0.55 · dimmed 0.42 (trailing digits and units ≥ 24 pt only; 4.0:1 on surface-1) |
| `ref.opacity.surface` | step-1 0.06 · step-2 0.09 · step-3 0.12 · raised 0.03 (+3 % over the parent) |
| `ref.opacity` (lines and tints) | hairline 0.08 · boundary 0.30 · tint status 0.10, accent 0.12, accent-dark 0.14 |
| `ref.opacity.glass` | dark 0.60 · light 0.30 · chip 0.16 · toolbar 0.25 · selected 0.26 (deleted by ADR-0022, 2026-09-15) |
| `ref.opacity.chart` | band 0.06 · grid 0.12 · comparison 0.40 · reference 0.60 |
| `ref.opacity` (states) | disabled 0.38 · dimmed-row 0.30 (done and next rows in a stepper, §4.13) |
| `ref.blur` | chip 20 · glass 32 · glass-light 40 · bloom 150; ADR-0022 (2026-09-15) adds cell 12 · pill 24 |
| `ref.border` | hairline 1 · strong 1.5 (status borders, emphasized strokes) · focus 2 |
| `ref.size.icon` | xs 12 · sm 16 · md 20 · lg 24 · ring 44 |
| `sys.z` | base 0 · raised 10 · overlay 100 · toast 1000 |

---

## 8. Charts

The rulebook, component inventory and token needs live in `docs/research/dataviz-design.md` (§3, §5, §6), and the series palette discussion in its §4. The DNA fixes the reference-brand chart look below and **overrides** `dataviz-design.md` where the references demand it.

### 8.1 Grammar

The references agree on one grammar:

- white or ink = data; grey = context and comparison; accent = attention;
- dashed = reference or target; a band = a time window; a dot = a bookend or "now";
- nothing filled, nothing green.

Chart values live outside the plot as heroes, with inline labels instead of legends (up to three series) and the Y axis on the trailing side. Sources: Vexto traffic §7; Vexto incident, Charts; Soma §7; Hydroflask §8; CreditPros §7; Arvion §7; Credit Karma, Charts.

### 8.2 Tokens

| Aspect | Light | Dark | Base (`sys.chart.*`, `sys.stroke.*`) |
|---|---|---|---|
| Primary series | `series.1` ink #0E0F12 | `series.1` white | `chart.line-width` 2; sparkline 1.5 |
| Other series | `series.2–6` (§3.4) | same | colored series ≤ 3 without direct labels |
| Comparison / ghost | ink 30 % / ink 15 %; ghost bars `neutral.200` | white 40 % / white 25 %; ghost white 12 % | `chart.comparison-width` 1 |
| Target / reference | ink 30 % | white 60 % | `stroke.target` dash 8/6, round caps, inline label |
| Grid | ink 10 % | white 12 % | `stroke.grid` dash 4/6, butt caps, **horizontal only; never solid, never vertical** |
| Window band | ink 5 % | white 6 % | full height, square corners, behind data |
| Axis text | `neutral.600` (6.31:1) | white 55 % (5.96:1) | 12 px (11 compact), tabular, trailing Y, no axis line |
| "Now" / highlight | `accent.500` | `accent.500` | marker 8 with a 2 px surface ring; endpoint 10 |
| Plot surface | white | white 6 % | charts never sit on raw glass or on a vivid gradient's light end |
| Bars | — | — | max thickness 24, radius 4 on the data end |
| Gauge | — | — | stroke ratio 0.10 of the diameter |
| Curve | — | — | `chart.curve` 1 = monotone (2 = catmull-rom 0.5, 3 = step) |
| Accent tint under a flagged window | #F39444 12 % | #F39444 14 % | `bg.tint.accent` |

### 8.3 Where the DNA overrides `dataviz-design.md`

1. **Dashed gridlines.** `dataviz-design.md` rule B8 says gridlines are never dashed. The references dash them, so Prism does too. The two dash patterns stay distinct: grid 4/6 at 10–12 %, target 8/6 at 30–60 %. Direct labels keep the target identifiable.
2. **Target dash.** 8/6 in place of 4/4 (Vexto traffic §11.7).
3. **Series.** Six slots, ink or white first with the accent second (§3.4), in place of the eight-slot orange-first order of §4. The dataviz validator still has to run on the new order (P4).
4. **No area fills under lines.** Bands only. The 10 % area fill of rule C14 is not used by the reference brand.
5. **Legends.** Inline labels replace legends for up to three series. Rule C18's legend applies beyond that.
6. **Deltas.** Positive deltas are neutral and negative or off-target deltas take the accent. Green never appears in charts. Status colors are never series (rule G36 agrees).
7. **Thin weights.** `metric.lg` uses 300 at 32 px; rule 31 permits Light/300 only at 48 or more.
8. **Units.** `metric.unit` is 12 px, 25 % of `metric.xl`; rule 1 sets the unit at 40–50 % of the numeral.

Everything else holds as written in `dataviz-design.md`: one hero figure, tabular axes, 3:1 marks or relief, the table twin, the selection haptic, Reduce Motion without count-up, watch glanceability.

### 8.4 Signature chart forms

These are principles for Prism's own components, not copies:

- **Line with target and windows** (§4.6).
- **Step or level chart.** Per-period level segments with the value above and the delta below. Flagged periods are drawn in the accent over an accent-tint band.
- **Focus-range line.** Solid across the in-focus range, dotted on the tails. A lens bead marks the peak.
- **Tick-ruler scrubber.** A `TimelineScrubber` drawn as a ruler.
- **Micro-glyph per metric.** Card sparklines in the aside, 32–40 tall.
- **Split progress pill and banded range gauge.** Tier 2.

Sources: Vexto traffic §7; Hydroflask §8; Arvion §7; Credit Karma, Charts; CreditPros §7.

---

## 9. Motion

The token schema, platform mapping and Reduce Motion design live in `docs/research/motion-haptics.md` (§0 summary, §5 representation, §6 Reduce Motion). The references are stills, so every motion cue below was inferred from them. The DNA maps those cues onto the token scale.

### 9.1 Scale (`ref.motion`)

- **Durations:** instant 0 (keyboard-initiated and 100+/day actions), quick 100 (press, hover color), fast 150 (tooltips, small popovers), base 250 (dropdowns, toasts, crossfades), slow 350 (modals and sheets on the non-spring path), slower 500 (first-run only). UI stays under 300 ms.
- **Easings:** `out` (0.23, 1, 0.32, 1), `inOut` (0.77, 0, 0.175, 1), `drawer` (0.32, 0.72, 0, 1), `hover` (0.25, 0.1, 0.25, 1), `linear`.
- **Springs** (duration s, bounce → settle):
  - `interactive` 0.15, 0 → 220 ms: tracks a live gesture, blend 0.25; bounce 0 is Prism's choice (Apple's `interactiveSpring` uses 0.15; ADR-0023).
  - `snappy` 0.35, 0.15 → 487 ms: the default for state changes.
  - `smooth` 0.40, 0 → 587 ms: layout and morph with no overshoot.
  - `sheet` 0.30, 0.20 → 404 ms: sheets and drawers after a release.
  - `bouncy` 0.50, 0.30 → 818 ms: delight tier only.
- **Reduce Motion** (`sys/motion/reduced`): fast 100; base, slow and slower 150; snappy and sheet 250 ms with no bounce; bouncy 300 ms with no bounce; presentation transitions crossfade (`motion.presentation.crossfade` 1). *(Superseded by ADR-0023, 2026-09-15: the reduced context layers over `default`; snappy and sheet (0.25, 0) → 367 ms; smooth and bouncy (0.30, 0) → 440 ms; interactive unchanged. `motion.presentation.crossfade` is 1: presentations fade by opacity over `motion.duration.base` (150 ms) with `motion.easing.out`, press scale and blur become opacity changes, in-place movement keeps the tightened spring (ADR-0023 §8.4).)*

### 9.2 Reference cues mapped to tokens

| Cue (inferred from stills) | Token | Sources |
|---|---|---|
| Press: scale 0.97 with a shadow tighten | `spring.snappy`; opacity dip under Reduce Motion | Soma §12.6; `Button.yaml` |
| Nav pill slides between tabs (about 250 ms); segmented bump morphs under the active label | `spring.snappy` | Vexto incident, Principles #17; CreditPros §11 #17 |
| Accordion (250 ms spring, 0.8 damping); card expands into its detail with matched geometry (350 ms); card → drawer shared element | `spring.smooth` | Vexto traffic §11.14; Vexto incident, Principles #17; CreditPros §11 #17 |
| Drawer slides in (about 400 ms) while backdrop blur ramps 0 → 40 | `spring.sheet` (`easing.drawer` + `duration.slow` on the non-spring path) | CreditPros §11 #17 |
| Scrubber thumb and draggable lens follow the finger | `spring.interactive` while dragging, `snappy` on release | Vexto traffic §11.14; Hydroflask Appendix A |
| Tooltip follows the pointer (120 ms ease-out) | `duration.fast` + `easing.out` | CreditPros §11 #17 |
| Card open via the corner arrow: scale 0.98 → 1, blur 8 → 0 (about 200 ms) | `spring.snappy` | Vexto traffic §11.14 |
| Numeral roll (250–350 ms, blur pass) and count-up | `duration.base` + `easing.out`; off under Reduce Motion | Hydroflask §12.14; `dataviz-design.md` §3 F30 |
| Staggered arrival of a control cluster (30–40 ms) | no token; at most 40 ms × 5 items **(reconstructed)** | Vexto incident, Principles #17; Soma §9.1 |
| Ambient loops: marching dashes (about 40 px/s), radar pulse (2 s ease-out, scale 1 → 1.4, 50 → 0 %), live halo pulse (2 s), halo rotation (8 s linear), alert dot pulse (1.2 s) | `easing.linear` or `out`; every loop stops under Reduce Motion (static halo, no pulse) | Vexto traffic §11.14; Vexto incident, Principles #17; Soma §9.3 |
| Vivid state gradient drifting with progress (600–900 ms) | ambient, outside the UI scale; jumps under Reduce Motion **(reconstructed)** | Hydroflask §12.13 |
| Specular sweep on the single lens element (about 300 ms) | delight tier (`duration.slow`); off under Reduce Motion or Reduce Transparency | Soma §12.16 |

Feel: calm, physical, slowly settling. Nothing snappy in the Material style, and no bounce on everyday transitions (Soma §9.7; `motion-haptics.md` §1). Haptics are a registry, not tokens (`spec/haptics.yaml`).

---

## 10. Iconography

- **Stroke style.** Stroke line icons with round caps and joins, at a 1.5 px stroke on a 20 or 24 grid. `sys.icon.weight` 400 maps to Phosphor regular and SF regular (`spec/icons/registry.json`); `weight-display` 200 is for very large glyphs.
- **Filled glyphs** are reserved for state: the check, the alert, badge contents, and the glyph on an inverse-solid active control. The alert badge is a rounded triangle, a silhouette no control uses.
- **Sizes.** 20 inside controls (`size.icon.md`); 16 for inline and corner glyphs such as `nav.open` (`size.icon.sm`); 24 large; the icon ring is 44 with a 20 icon.
- **Containment.** Every glyph that acts sits in a container with a hit area of at least 44 (touch) or 28 (pointer).
- **Color.** `icon.primary` (ink 80 %, white); `icon.secondary` (`neutral.600`, white 64 %); `icon.accent` for marks only; `icon.status.*` only inside status contexts.
- **No emoji, no duotone.** Icons are referenced through registry ids, never vendor names (decision #13).

Sources: Vexto traffic §8, §11.13; Vexto incident, Iconography; Soma §8, §12.13; Hydroflask §9, §12.12; Credit Karma, Iconography and Principles #17; CreditPros §8, §11 #11; Arvion §8.

---

## 11. Anti-patterns

Each is a rule to reject in review. Sources are in brackets.

**Surfaces and depth**

1. Drop shadows on solid cards, or borders used to show nesting. Use the luminance ladder or a tint [Vexto traffic §3, §9.2; Arvion §3; Soma §12.1].
2. Glass on a flat page, glass on glass, glass without its 1 px edge, or glass tinted with a hue of its own [ADR-0009; Arvion §3; Hydroflask §10.7].
3. Text on glass that was not checked against the darkest and lightest backdrop. Light glass over backdrops brighter than OKLCH L 0.35. Body text on glass tinted below 45 % black [Vexto traffic §11.6; Vexto incident, Accessibility risks #2; Arvion §11.10].
4. A pure #000 dark page, a flat pure-grey light hero page, or neutrals that are warm in one place and cool in another [Arvion §9.1; CreditPros §11 #2; Soma §12.17].
5. Colored drop shadows or glows as elevation. Glow exists only as a vivid bloom or a same-color halo on a hairline mark [CreditPros §3; Arvion §9.8].
6. A dimming scrim where a change of material would separate the layer [CreditPros §9 #9].

**Color**

7. The accent as a button fill or an active state. Accent text in light below `accent.800` [`Button.yaml`; Arvion §11.3; Vexto traffic §10.6].
8. More than one accent. Saturation scattered across small elements. Status colors in chrome. Status as a large block [Vexto traffic §9.5; Arvion §9.3; Hydroflask §10.2].
9. Green for positive deltas, or green anywhere in charts [Vexto traffic §7, §11.5].
10. Red as a flat block or behind text. Solid red beyond the badge and the alert glyph [Vexto incident, What makes it beautiful #7; Arvion §11.13].
11. Color-only encoding: a status without icon and label, or an accent window without a sign or value [ADR-0011; Vexto traffic §10.7; Arvion §10].
12. Colored text for emphasis [Soma §4.4; Hydroflask §12.2].
13. Mixing hot and cool vivid gradients on one screen, or using saturated brand rainbows as vivid [Hydroflask §12.13; CreditPros §11 #6].

**Type**

14. All-caps labels, letterspaced eyebrows, or more than one eyebrow per card [Vexto traffic §4.4; Soma §4.4; Credit Karma, Typography; CreditPros §4].
15. Bold or Medium card titles. Weights above 500 outside a page H1. Heavy 700 hero numerals [Arvion §11.7; Vexto incident, Principles #4].
16. Thin weights below 34 pt or outside `type.metric.*`. Weight 300 below 20 px [ADR-0011; Vexto traffic §10.5; Credit Karma, Accessibility risks #9].
17. Dimmed digits or 42 % alpha at caption size. Functional text below 12 px [Vexto incident, Accessibility risks #1; Arvion §10, §11.14].
18. Proportional figures on live values, or tabular figures on a static hero [Arvion §4.3; `dataviz-design.md` §3 F30].
19. Latin-only typefaces (Outfit, Urbanist, Figtree), or a display face without a weight below 400 [`fonts.md`; ADR-0008].
20. Inconsistent thousands separators between surfaces [CreditPros §4].

**Charts**

21. Area fills or gradients under lines. Axis lines. Chart boxes. Vertical or solid gridlines. Legends where inline labels fit [Vexto traffic §7; Vexto incident, Principles #8; Arvion §7].
22. Thick strokes for emphasis. Use the accent or a same-color glow [Arvion §9.8].
23. Charts on raw glass or across a vivid gradient's no-text zone [`dataviz-design.md` §3 G39; §5].

**Composition**

24. More than one primary or solid element per group. A filled track behind segments. A button row inside a card [`Button.yaml`; `Card.yaml`; Credit Karma, Principles #7].
25. More than one hero numeral per screen. More than one vivid 2×2, or more than one vivid card in six. Odd vivid counts. Vivid touching glass [`Card.yaml`; `spec/patterns/README.md`; Credit Karma, Principles #5].
26. Exceeding the phone density cap instead of splitting the screen [Hydroflask §12.11].
27. Grids that collapse when slots are empty [Arvion §5].
28. A dot grid or grain behind text smaller than 13 px [Soma §12.10; CreditPros §11 #18].
29. Recoloring a whole illustration for a state instead of tinting the affected sub-region [Vexto incident, Principles #12].
30. Repeating the refractive-lens flourish on more than one element per screen [Soma §10.10].
31. Hover-only affordances, or floating toolbars covering controls [CreditPros §10; Credit Karma, Accessibility risks #10].

**Motion**

32. Snappy Material-style motion. Bounce on everyday transitions. Animation on actions used 100+ times a day or started from the keyboard [Soma §9.7; `motion-haptics.md` §1.2].
33. Pulses, marching dashes, parallax or count-up under Reduce Motion [Vexto traffic §11.14; Vexto incident, Accessibility risks #10].

**Firewall**

34. Rebuilding the composition of any reference screen, or reusing its copy, illustrations, icons, photography or brand names [ADR-0015; Hydroflask §10.12].

---

## Appendix A: Contrast expectations

Expected ratios for every pair in `tokens/contrast-pairs.json`, computed during the reconstruction from the seeded values. **`tools/contrast` re-checks them on the resolved permutations (brand × colorScheme × Increase Contrast); these numbers are expectations, not a substitute for the check** (ADR-0011).

### A.1 Method

- WCAG 2.x relative luminance on sRGB, ratio (L1 + 0.05) / (L2 + 0.05), with composites computed in floating point and hex rounded for display.
- **Backgrounds are composited first.**
  - `bg.page` is opaque.
  - `bg.surface`, `.raised` and `.nested` overlays (dark white 6/9/12 %, light white 70 %) are composited over `bg.page`.
  - `bg.tint.*` and `bg.fill.*` overlays (light `tint.accent`, dark tints) are composited over `bg.surface`, the card they sit on.
  - Opaque aliases are used as they are.
- **Foreground overlays** (white or ink alpha text and borders) are then composited over that background.
- IC = the `*-increased-contrast` scheme. The reference brand has one set of values for both font presets, because the presets change families, not colors.

Resolved backgrounds:

| Background | Light | Dark |
|---|---|---|
| `color.bg.page` | `neutral.100` #F1F2F5 | `neutral.950` #0D0E11 |
| `color.bg.surface` | `neutral.0` #FFFFFF | white 6 % → #1C1C1F |
| `color.bg.surface.raised` | white 70 % → #FBFBFC | white 9 % → #232426 |
| `color.bg.fill.inverse` | `neutral.950` #0D0E11 | `neutral.0` #FFFFFF |
| `color.bg.fill.accent` | `accent.300` #FFC07A | `accent.500` #F39444 |
| `color.bg.fill.critical` | `status.danger.badge` #E5252A | `status.danger.badge` #E5252A |
| `color.bg.tint.accent` | #F39444 12 % → #FEF2E9 | #F39444 14 % → #3A2D24 over surface (#2D2118 over page) |
| `color.bg.tint.success` | #E6F6E9 | #5CCB6A 10 % → #222E27 |
| `color.bg.tint.warning` | #FEF6E8 | #F5B83D 10 % → #312C22 |
| `color.bg.tint.critical` | #FDE9E9 | #FF4642 10 % → #322123 |
| `color.bg.tint.info` | #EAEDF9 | #6B84E0 10 % → #232733 |

Resolved foregrounds (alpha tokens composite per pair):

| Foreground | Light | Dark | Light IC | Dark IC |
|---|---|---|---|---|
| `color.text.primary` | `neutral.950` #0D0E11 | `neutral.0` #FFFFFF | same | same |
| `color.text.secondary` | `neutral.600` #5C6068 | white 64 % | `neutral.700` #40444C | white 80 % |
| `color.text.tertiary` | `neutral.600` #5C6068 | white 55 % | `neutral.700` #40444C | white 70 % |
| `color.text.dimmed` | `neutral.500` #7E838F | white 42 % | `neutral.600` #5C6068 | white 64 % |
| `color.text.on-inverse` | #FFFFFF | #0D0E11 | same | same |
| `color.text.on-accent` | #0D0E11 | #0D0E11 | same | same |
| `color.text.accent` | `accent.800` #9C4512 | `accent.500` #F39444 | `accent.900` #6B2F0C | `accent.500` |
| `color.text.success` | #187530 | #5CCB6A | same | same |
| `color.text.warning` | #8F5B00 | #F5B83D | same | same |
| `color.text.critical` | #BF2222 | #FF5A55 | same | same |
| `color.text.info` | #3D5BC4 | #7A93F0 | same | same |
| `color.text.on-badge` | #FFFFFF | #FFFFFF | same | same |
| `color.border.strong` | ink 30 % | white 35 % | ink 60 % | white 60 % |
| `color.border.focus` | #0D0E11 | #FFFFFF | same | same |
| `color.chart.axis` | `neutral.600` #5C6068 | white 55 % | same | same |
| `color.chart.series.1–6` | #0E0F12 · #B8561A · #4E6CCD · #1F8F80 · #A64FA3 · #6E7A22 | #FFFFFF · #F39444 · #6B84E0 · #5BC8B5 · #D48BD0 · #D9C27A | same | same |

### A.2 Pairs on scheme surfaces

Tiers: functional 4.5 (3.0 at ≥ 24 px), decorative 3.0 and only at ≥ 24 px, boundary 3.0.

| # | Foreground | Background | Tier (min) | Light | Dark | Light IC | Dark IC |
|---|---|---|---|---|---|---|---|
| 1 | `color.text.primary` | `color.bg.page` | functional 4.5 | 17.24 | 19.30 | 17.24 | 19.30 |
| 2 | `color.text.primary` | `color.bg.surface` | functional 4.5 | 19.30 | 16.95 | 19.30 | 16.95 |
| 3 | `color.text.primary` | `color.bg.surface.raised` | functional 4.5 | 18.67 | 15.58 | 18.67 | 15.58 |
| 4 | `color.text.secondary` | `color.bg.page` | functional 4.5 | 5.64 | 8.14 | 8.73 | 12.36 |
| 5 | `color.text.secondary` | `color.bg.surface` | functional 4.5 | 6.31 | 7.59 | 9.77 | 11.18 |
| 6 | `color.text.secondary` | `color.bg.surface.raised` | functional 4.5 | 6.10 | 7.19 | 9.45 | 10.42 |
| 7 | `color.text.tertiary` | `color.bg.page` | functional 4.5 | 5.64 | 6.25 | 8.73 | 9.59 |
| 8 | `color.text.tertiary` | `color.bg.surface` | functional 4.5 | 6.31 | 5.96 | 9.77 | 8.84 |
| 9 | `color.text.dimmed` | `color.bg.surface` | decorative 3.0 (≥ 24 px) | 3.80 | 4.04 | 6.31 | 7.59 |
| 10 | `color.text.dimmed` | `color.bg.surface.raised` | decorative 3.0 (≥ 24 px) | 3.67 | 3.93 | 6.10 | 7.19 |
| 11 | `color.text.on-inverse` | `color.bg.fill.inverse` | functional 4.5 | 19.30 | 19.30 | 19.30 | 19.30 |
| 12 | `color.text.on-accent` | `color.bg.fill.accent` | functional 4.5 | 12.02 | 8.39 | 12.02 | 8.39 |
| 13 | `color.text.accent` | `color.bg.page` | functional 4.5 | 5.73 | 8.39 | 9.21 | 8.39 |
| 14 | `color.text.accent` | `color.bg.surface` | functional 4.5 | 6.42 | 7.37 | 10.31 | 7.37 |
| 15 | `color.text.success` | `color.bg.page` | functional 4.5 | 5.17 | 9.38 | 5.17 | 9.38 |
| 16 | `color.text.success` | `color.bg.surface` | functional 4.5 | 5.79 | 8.24 | 5.79 | 8.24 |
| 17 | `color.text.warning` | `color.bg.page` | functional 4.5 | 5.12 | 10.85 | 5.12 | 10.85 |
| 18 | `color.text.warning` | `color.bg.surface` | functional 4.5 | 5.73 | 9.53 | 5.73 | 9.53 |
| 19 | `color.text.critical` | `color.bg.page` | functional 4.5 | 5.41 | 6.29 | 5.41 | 6.29 |
| 20 | `color.text.critical` | `color.bg.surface` | functional 4.5 | 6.06 | 5.53 | 6.06 | 5.53 |
| 21 | `color.text.info` | `color.bg.page` | functional 4.5 | 5.37 | 6.67 | 5.37 | 6.67 |
| 22 | `color.text.info` | `color.bg.surface` | functional 4.5 | 6.01 | 5.86 | 6.01 | 5.86 |
| 23 | `color.text.on-badge` | `color.bg.fill.critical` | functional 4.5 | 4.54 | 4.54 | 4.54 | 4.54 |
| 24 | `color.text.success` | `color.bg.tint.success` | functional 4.5 | 5.16 | 6.87 | 5.16 | 6.87 |
| 25 | `color.text.warning` | `color.bg.tint.warning` | functional 4.5 | 5.34 | 7.79 | 5.34 | 7.79 |
| 26 | `color.text.critical` | `color.bg.tint.critical` | functional 4.5 | 5.19 | 4.98 | 5.19 | 4.98 |
| 27 | `color.text.info` | `color.bg.tint.info` | functional 4.5 | 5.15 | 5.16 | 5.15 | 5.16 |
| 28 | `color.text.primary` | `color.bg.tint.accent` | functional 4.5 | 17.54 | 13.27 (15.66 over page) | 17.54 | 13.27 |
| 29 | `color.border.strong` | `color.bg.surface` | boundary 3.0 | **2.01 fail** | 3.22 | 5.02 | 6.83 |
| 30 | `color.border.focus` | `color.bg.page` | boundary 3.0 | 17.24 | 19.30 | 17.24 | 19.30 |
| 31 | `color.border.focus` | `color.bg.surface` | boundary 3.0 | 19.30 | 16.95 | 19.30 | 16.95 |
| 32 | `color.chart.axis` | `color.bg.surface` | functional 4.5 | 6.31 | 5.96 | 6.31 | 5.96 |
| 33 | `color.chart.series.1` | `color.bg.surface` | boundary 3.0 | 19.17 | 16.95 | 19.17 | 16.95 |
| 34 | `color.chart.series.2` | `color.bg.surface` | boundary 3.0 | 4.79 | 7.37 | 4.79 | 7.37 |
| 35 | `color.chart.series.3` | `color.bg.surface` | boundary 3.0 | 4.83 | 4.85 | 4.83 | 4.85 |
| 36 | `color.chart.series.4` | `color.bg.surface` | boundary 3.0 | 3.96 | 8.38 | 3.96 | 8.38 |
| 37 | `color.chart.series.5` | `color.bg.surface` | boundary 3.0 | 4.92 | 6.78 | 4.92 | 6.78 |
| 38 | `color.chart.series.6` | `color.bg.surface` | boundary 3.0 | 4.70 | 9.65 | 4.70 | 9.65 |

**Expected result.** Every pair passes except **#29 in the light scheme**. `color.border.strong` (ink 30 %, composite #B7B7B8) reaches 2.01:1 on white. Reaching 3:1 needs ink of at least 45 % (#939394), or the pair should bind to `color.border.boundary` (`neutral.500`, 3.80:1). This is recorded as B1.

### A.3 Glass pair (`color.text.on-glass` on `material.glass.dark.fill`)

The fill is composited over each backdrop named in the pair, then white text is composited over the result.

| Scheme | Fill | Over #283126 | Over #5B6366 | White 78 % (dark / light backdrop) | White 64 % |
|---|---|---|---|---|---|
| light | #0A0C08 55 % | 17.20 (#171D15) | 12.80 (#2E3332) | 10.80 / 8.46 | 7.66 / 6.26 |
| dark | #101410 60 % | 16.68 (#1A2019) | 12.75 (#2E3432) | 10.54 / 8.43 | 7.51 / 6.24 |
| light, Reduce Transparency | `neutral.900` #17191D (opaque) | 17.60 | 17.60 | 11.00 | 7.77 |
| dark, Reduce Transparency | #1C1C1F 92 % | 16.73 (#1D1E20) | 15.95 (#212225) | 10.57 / 10.17 | 7.53 / 7.30 |

Dark glass passes comfortably even at 64 % white over the lighter backdrop. The 78 % caption floor binds on **light** glass, which is not in the pairs file (§7.3; B6).

### A.4 Vivid pair (`color.text.on-vivid` on `gradient.vivid.*`, stops in the text zone)

White on the declared zones of §5.2. The functional zone is checked at 4.5; the large zone admits heroes of 24 px or more at 3.0.

| Gradient | Functional zone | Min white in functional zone | Large zone | Min white in large zone |
|---|---|---|---|---|
| `orchid` | t 0.70–1.00 | 4.65 | t 0.30–1.00 | 3.08 |
| `olive` | t 0–0.25 | 4.81 | t 0–0.55 | 3.04 |
| `rose` | t 0–0.25 | 4.63 | t 0–0.80 | 3.08 |
| `sky` | t 0–0.55 | 4.79 | t 0–0.85 | 3.03 |
| `ember-night` | t 0–0.75 | 4.72 | t 0–0.90 | 3.42 |
| `plum-dusk` | t 0–0.90 | 5.00 | t 0–1.00 | 3.79 |
| `forest-moss` | t 0–1.00 | 4.61 | t 0–1.00 | 4.61 |
| `navy-cyan` | t 0–0.60 | 5.57 | t 0–0.70 | 3.38 |

All declared zones pass by construction. Placing a card's anatomy inside them is a separate check (§5.3; B5).

### A.5 Informative pairs (not in the pairs file)

These are useful when reviewing marks, dots and edges:

| Pair | Light | Dark | Note |
|---|---|---|---|
| `accent` / `icon.accent` / `chart.now` marks on `bg.surface` | 2.30 (2.05 on page) | 7.37 | light accent marks are below 3:1: always paired with a value (B3) |
| `border.boundary` on `bg.surface` | 3.80 | 2.71 | the dark step misses its own 3:1 intent (B2) |
| `border.hairline` on `bg.surface` | 1.24 | 1.26 | decorative structure only |
| `status.*.dot-light` on white | success 2.77 · warning 1.78 · danger 3.62 · info 4.83 | — | success and warning dots need an ink ring plus icon and label (B4) |
| `icon.status.*` on surface-1 / surface-3 (dark) | — | success 8.24 / 6.89 · warning 9.53 / 7.97 · critical 5.01 / 4.19 · info 4.85 / 4.05 | all ≥ 3:1 as marks |
| white on `status.info.badge-dark` #527AF1 | — | 3.88 | glyphs only, never text |
| white on `bg.fill.accent-strong` | 4.79 | 3.05 | dark: large text only |
| dark text tiers on surface-3 (#2A2B2E) | — | secondary 6.73 · tertiary 5.39 · dimmed 3.79 | the token descriptions quote 6.3 / 5.0 / 3.35 (B11) |

---

## Appendix B: Reconstruction notes and open discrepancies

B1–B19 were found while rebuilding this file on 2026-09-14, and B20–B26 in the review that followed. B20 and B26 were resolved on 2026-09-15, as their rows record; B5–B9, B15, B21, B22, B24 and B25 were decided the same day by ADR-0021, ADR-0022 and ADR-0024, and their tokens and specs change in the tickets named. B1–B3 and B10–B14 were applied to the tokens the same day in P1-1 and P1-2, as their rows record (`tools/tokens/ARCHITECTURE.md` §14). None of the others has been applied to a token or spec. Each belongs to the ticket named, mostly P1-1 (review of the seeded `ref` tokens) and P1-2 (review of `sys`).

| # | Finding | Where | Proposed resolution |
|---|---|---|---|
| B1 | Light `color.border.strong` (ink 30 %) is 2.01:1 on white, but `contrast-pairs.json` checks it at the 3:1 boundary tier. The ghost Button outline uses it. | `sys/color/light`, `contrast-pairs.json` #29, `comp.button.ghost.border` | Raise it to ink ≥ 45 % (#939394), or check `border.boundary` for control edges and keep `strong` decorative. P1-2. **Applied in P1-2 (2026-09-15):** ink 45 % (`{ref.color.neutral.950}` with `app.prism.alpha` 0.45) reaches 3.03:1 on page, 3.09:1 on surface and 3.07:1 on raised, but 2.96:1 on `bg.surface.nested` over the page; `light-increased-contrast` keeps 0.6. |
| B2 | Dark `color.border.boundary` (white 30 %) is 2.71:1 on surface-1, 2.64:1 on page, though its name promises 3:1. `border.strong` (35 %) reaches 3.22. | `sys/color/dark` | Raise to white ≥ 34 % or alias to `strong`. P1-2. **Applied in P1-2 (2026-09-15):** white 36 %, 3.30:1 on page, 3.33:1 on surface-1, 3.27:1 on surface-2 and 3.18:1 on surface-3. |
| B3 | Light accent marks (`accent`, `icon.accent`, `chart.now` = `accent.500`) are 2.30:1 on white, below 3:1 for meaningful non-text. | `sys/color/light` | Keep as redundant marks (always paired with value, sign or label); any mark that alone carries meaning uses `accent.700` (4.79), as `chart.series.2` does. Consider `chart.now` → `accent.700` in light. P1-2. **Applied in P1-2 (2026-09-15):** the light `accent`, `icon.accent` and `chart.now` descriptions state the 2.3:1 and the pairing rule, and name `accent.700` (4.8:1) for a mark that alone carries meaning; `chart.now` stays `accent.500`. |
| B4 | Light status dots success #2DB24A (2.77) and warning #F5B83D (1.78) are below 3:1 on white. | `ref.color.status.*.dot-light` | Soma's 1 px ink ring plus icon and label (§3.3). P4 StatusDot spec. |
| B5 | **Vivid zones versus the Card anatomy.** With CSS angle semantics, `orchid`'s light stop sits at the top, so a white header on it gets 2.55:1. `olive` and `rose` fail the functional header, `olive` and `navy-cyan` fail the bottom-left hero, and `sky` and `ember-night` cannot carry aside text. Only `plum-dusk` and `forest-moss` cover the full anatomy (§5.3). `orchid` is also the default vivid gradient in `Card.yaml` and `Surface.yaml`. | `ref/gradient.tokens.json`; `Card.yaml`; the vivid 2×2 (§4.4) | Options: darken `orchid` stop 0 (to about L 0.55 or below, white ≥ 4.5) or reverse its stops. Darken `olive`/`rose` mids so white holds 4.5 to t ≈ 0.5 and 3.0 to t ≈ 0.8. Deepen `navy-cyan`'s 75 % stop, or declare a per-gradient anatomy variant. Re-run §5 afterwards. P1-1 (blocking for the light-airy vivid 2×2). **Resolved by ADR-0022 (2026-09-15):** every gradient carries the full anatomy (V1: every stop ≥ 3.0:1 against white; V2: header block ≥ 4.5:1); P1-1 retunes; the default vivid is sky / plum-dusk. |
| B6 | On light glass the "captions never below 78 % white" floor reaches only 4.32:1 over the darkest test backdrop and 3.85:1 at the backdrop limit. "Backdrop L ≤ 35 %" is read here as OKLCH L ≤ 0.35; under CIELAB L\* even 100 % white fails at the limit. | `sys/color/dark` `material.glass.light.fill`, `text.on-glass` descriptions; `Text.yaml` (secondary → 78 % on glass) | Functional text on light glass stays at 100 % white; 78 % only at ≥ 24 px or over backdrops at OKLCH L ≤ 0.28. Add a light-glass pair to `contrast-pairs.json`. P1-2. **Resolved by ADR-0022 (2026-09-15):** functional text on light glass is 100 % `text.on-glass-light` (white in dark, ink in light); no alpha tones on light glass. |
| B7 | Thin-weight thresholds differ. `type.metric.xl` says "200 on dark ≥ 32 px" and `type.display.xl` says "dark scheme may drop to 200". ADR-0008 rule 6 and ADR-0011 allow weights below 300 only in `type.metric.*` at ≥ 34 pt. | `ref/typography.tokens.json` descriptions | This document follows the ADRs: ≥ 34 pt, metric roles only. Either restrict `display.xl` to 300 or amend ADR-0011. P1-1. **Resolved by ADR-0021 (2026-09-15).** |
| B8 | The fallback weight for thin roles under Bold Text or Increase Contrast is 300 in ADR-0008 rule 6 but 400 in ADR-0011 and `Text.yaml`. ADR-0008 also applies it below 24 pt; ADR-0011 covers weights below 300, and `Text.yaml` widens it to every weight below 400. | ADRs; `spec/components/Text.yaml` | This document follows ADR-0011 (400). Align ADR-0008, and state one scope in both ADRs and the spec. **Resolved by ADR-0021 (2026-09-15).** |
| B9 | The typography group description says "600 page H1 only", but `type.title.lg` (the H1) is 500 and no reference-brand role uses 600. | `ref/typography.tokens.json` | Read 600 as a ceiling (§2.3), or drop it from the description. P1-1. **Resolved by ADR-0021 (2026-09-15).** |
| B10 | Descriptions give HSL hues as OKLCH hues. The neutral ramp's "OKLCH hue ~225, chroma ~0.004" is actually HSL hue 220–225, OKLCH hue 261.6–271.4, chroma 0.003–0.019. The accent's "hue ~30" is HSL 27, OKLCH 57.6. | `ref/color.palette.tokens.json` descriptions | Correct the descriptions. P1-1. **Applied in P1-1 (2026-09-15):** the neutral group says "OKLCH hue 261.6-271.4, chroma 0.003-0.019; HSL hue 220-225", the accent group "OKLCH hue 57.6 at step 500; HSL hue 27". |
| B11 | The dark text descriptions quote "on surface-3" ratios of 6.3 / 5.0 / 3.35. On surface-3 #2A2B2E they compute to 6.73 / 5.39 / 3.79, and no single background yields all three quoted values. They are conservative. | `sys/color/dark` descriptions | `tools/contrast` output wins. Update the descriptions. P1-2. **Applied in P1-2 (2026-09-15):** `text.secondary`, `text.tertiary` and `text.dimmed` quote 7.59 / 6.73, 5.96 / 5.39 and 4.04 / 3.79 on surface-1 / surface-3. |
| B12 | The light `bg.surface.nested` description says "(= #ECEDF1 on white)", but ink 6 % over white composites to #F1F1F1. | `sys/color/light` | Correct the description, or raise the alpha if #ECEDF1 was intended. P1-2. **Applied in P1-2 (2026-09-15):** the description reads "(= #F0F1F1 on white)", the composite of ink #0D0E11 at 6 %; the alpha stays 0.06. |
| B13 | Small rounding in descriptions. Light `text.primary` "17.1:1" computes to 17.24, and `text.on-accent` "11.9:1" to 12.02. Dark `tint.critical` "= #332022 on surface-1" composites to #322123 in floating-point math; the description composites over the rounded #1C1C1F. | `sys/color/light`, `sys/color/dark` | Cosmetic. **Applied in P1-2 (2026-09-15):** "17.2:1 on page", "ink on accent-300 = 12.0:1" and "#322123 on surface-1". |
| B14 | Dark `bg.fill.accent-strong` says "white text >= 18 px only (3.05:1)". ADR-0011's large tier is ≥ 24 px regular or ≥ 19 px bold. | `sys/color/dark` | Reword to the ADR-0011 tier. **Applied in P1-2 (2026-09-15):** "white text at the large tier only: >= 24 px regular or >= 19 px bold (3.05:1, ADR-0011)". |
| B15 | `Surface.yaml` binds grain to `opacity.grain`, which no token defines. Grain lives in `ref.gradient.vivid.*.$extensions.app.prism.grain` (0.05–0.10) and `material.glass.*` extensions (0.04 / 0). | `spec/components/Surface.yaml` | Add `ref.opacity.grain`, or bind the spec to the extension. P2-1 will catch it. **Resolved by ADR-0024 §6 with ADR-0022 §2.6 (2026-09-15):** grain binds the material's `grain` token or the gradient's folded grain. |
| B16 | The DNA deviates on purpose from `dataviz-design.md`: dashed grid 4/6 (rule B8 says never dashed), target 8/6 (vs 4/4), six ink- or white-first series (vs eight orange-first), no area fills, `metric.lg` at 300 on 32 px (rule 31 allows Light/300 only at ≥ 48), and a 12 px `metric.unit` at 25 % of `metric.xl` (rule 1 says 40–50 %). | §8.3 | Keep. Run the CVD validator on the six-slot order in P4. |
| B17 | Family A, the owner-pasted light CRM screenshots, is not in the repository and no refs file analyzes it. §4.4 (vivid 2×2) and §4.13 (stepper) rest partly on it, through the analyses' comparisons, `agent/SKILL.md`, `spec/patterns/README.md` and `ref.opacity.dimmed-row`. | §4.4, §4.13 | Treat those details as reconstructed. |
| B18 | Regular density (the touch default) sets the page margin and card padding to 24, while the references measure phones at 16–20 pt. | `sys/density/regular` | Keep. Compact reproduces the references if an app wants them (§6.2). |
| B19 | `a11y-reconciliation.md` (listed in `docs/research/README.md`) is missing from the repository; `component-inventory.md` and `critic.md` were reconstructed on 2026-09-14. | `docs/research/` | Out of scope here. The component mapping is `component-inventory.md`, rebuilt from the analyses' component tables. |
| B20 | The `ref.type.caption` description says "tertiary color", but §2.2, `Text.yaml` (example `caption`) and `comp.card.solid.caption` use secondary. In dark the two differ (white 64 % vs 55 %); in light both resolve to `neutral.600`. The same description also carries reference copy (B26). | `tokens/ref/typography.tokens.json` (caption description); `spec/components/Text.yaml`; `tokens/comp/card.tokens.json` | Keep secondary and correct the description, replacing its sample strings with invented ones in the same edit (critic R-01). P1-1. **Resolved 2026-09-15:** the description reads "'7m ago', 'Rolling average'; secondary color" in `tokens/ref/typography.tokens.json` and in its seed, `tools/tokens/seed-ref-tokens.py`. |
| B21 | Glass under Reduce Transparency and Increase Contrast. ADR-0009 rule 5 and `Surface.yaml:100` make glass opaque under either setting, but the resolver's `*-increased-contrast` contexts load no material overrides, so the tokens leave glass translucent under Increase Contrast. The Reduce Transparency fallback also has three answers: the token files (dark #1C1C1F / #232426 / #2A2B2E at 92 %; light `neutral.900` / `neutral.0`), `raised` (`Surface.yaml:100`, `:117`; ADR-0009 rule 5), and `surface.solid` (ADR-0011). This document follows the token values. | `tokens/prism.resolver.json` colorScheme contexts; `tokens/sys/color/*-reduced-transparency.tokens.json`; `spec/components/Surface.yaml`; ADR-0009; ADR-0011 | Pick one fallback by amendment (critic C-26 argues for `raised`) and decide whether alpha 0.92 counts as opaque (G-04). Then add the glass overrides to the Increase Contrast contexts, or drop Increase Contrast from ADR-0009 and `Surface.yaml`. P1-2, schema part in P2-1. **Resolved by ADR-0022 (2026-09-15):** one fallback, opaque `raised` over the page (`inverse` when selected), chosen by Surface under Reduce Transparency, Increase Contrast, on watchOS and over an invalid backdrop; no variant delta or platform file writes `sys.material.*`; 0.92 is not opaque. |
| B22 | On watchOS glass resolves to `surface.raised` in the watch token but to solid in `Surface.yaml:101` and ADR-0009 rule 3. §1 principle 6, §4.3 and §7.3 give both. | `tokens/sys/platform/watch.tokens.json`; `spec/components/Surface.yaml`; ADR-0009 | Settle it in the same amendment as B21 (critic C-26) and align the watch token description, the spec and the ADR. P2-1. **Resolved by ADR-0022 (2026-09-15):** the same opaque raised fallback on watchOS; the watch blur flag is deleted. |
| B23 | `agent/SKILL.md:35–36` sets trailing digits in `color.text.tertiary`, the unit in `type.caption` and stepper rows at `opacity.dimmed`. §4.2, §4.13, `Text.yaml` (trailing and unit bindings) and the tokens use `color.text.dimmed`, `type.metric.unit` and `opacity.dimmed-row`; `opacity.dimmed` does not exist. ADR-0007 rule 3 also says tertiary. | `agent/SKILL.md`; ADR-0007 | Update the skill and ADR-0007 to `text.dimmed`, `metric.unit` and `opacity.dimmed-row` (critic G-03, C-12). |
| B24 | Density sets `sys.size.control` to 32 / 40 / 48 (compact / regular / comfortable), so regular density, the touch default, gives 40. Principle 13 and §4.7 say 40 pointer / 44 touch, and `ref.size.control.lg` (44) is described as "touch default"; modality sets `size.hit`, not the control height. | `tokens/sys/density/*.tokens.json`; `tokens/ref/dimension.tokens.json` (`size.control.lg`); §1 principles 2 and 13 | Decide whether control height follows density or modality (critic C-18). If density, drop "touch default" from `ref.size.control.lg` and restate principle 13 as `size.control` with a 44 hit area on touch; if modality, add a modality-owned control height. P1-2. **Resolved by ADR-0024 §7 (2026-09-15):** control height follows density (`size.control.sm\|md\|lg`), the hit area follows modality. |
| B25 | `Surface.yaml:89–92` binds `shadow` to `elevation.0`–`elevation.3`, which no token defines. The tokens are `sys.shadow.flat`, `.raised`, `.floating`, `.overlay` (and `.drawer`), and the spec regex rejects the `shadow` root. | `spec/components/Surface.yaml`; `spec/component.schema.json` | Add `sys.elevation.0–3` aliases, or bind the spec to `shadow.*` and allow that root (critic G-03). P1-2 before P2-1. **Resolved by ADR-0024 §6 (2026-09-15):** `sys.shadow.flat\|raised\|floating\|overlay` are renamed `sys.elevation.0–3`. |
| B26 | Reference UI copy sits in contracts: the `Card.yaml` examples `glass-vehicle`, `glass-selected`, `solid-metric` (and its accessibility label) and `compact`, `Text.yaml:113` and `:133`, and the `ref.type.caption` description. §4.3 and §4.4 point readers to those examples, and `vivid-orchid-kpi` has no recorded provenance. | `spec/components/Card.yaml`; `spec/components/Text.yaml`; `tokens/ref/typography.tokens.json` | Replace the strings with invented ones such as the samples in §4.3, §4.4 and §4.9, record the provenance of `vivid-orchid-kpi`, re-render the harness images, and add the CI denylist of `refs-*.md` literals (critic R-01). **Resolved 2026-09-15:** every string listed here, the `vivid-orchid-kpi` strings and the `ref.type.metric.md` description sample are invented copy now, and `Card.yaml` notes say so; that also settles the vivid example's provenance. The font harnesses were cleaned and the six images re-rendered (`docs/research/fonts.md`). `lint:reference-copy` (`tools/lint/reference-copy.ts`, in the CI `contracts` job) fails when an entry of `tools/lint/reference-copy.denylist.txt`, derived from the `refs-*.md` analyses, appears in contracts, samples or renders (`tools/README.md`). |

