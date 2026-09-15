# Prism Direction Board

The direction board for gate P3-0 (ADR-0017, roadmap P3-0): Prism's reference brand applied to three screens of one invented product, built only from the generated web tokens, in both color schemes. The owner signs it off before any component is implemented twice. Every change the owner asks for goes back through P1-1 and P1-2 as a token change.

Open `index.html` in a browser. The page follows the viewer's theme: a script mirrors `<html data-theme>` to `data-ds-color-scheme`, and without it Prism's `prefers-color-scheme` fallback applies. Every screen and every scheme-pinned panel keeps its own explicit `data-ds-color-scheme` and `data-ds-density`. The folder is self-contained and makes no network requests.

## What the board shows

The concept is Verst, an invented cycling companion for an invented city on the River Wend, where the city is the instrument panel. One orange means "look here", and on every screen it marks the same object: the climb ahead, or the climb ridden 2.1 km/h slower than last week.

1. **Foundations.**
   - The type specimen of all 21 roles plus `font.mono`, in three columns (live spec, Latin, Cyrillic), with values read back from the rendered tokens.
   - `metric.xl` pinned at 300 in light and 200 in dark, with Cyrillic lines.
   - The ADR-0021 §5 figure-width tests.
   - The neutral and accent ramps with OKLCH L and the role bound to each step, and `chart.series` 1–6 as strokes on each scheme's own plot, with the status tones.
   - The eight vivid gradients in slot order, and a bloom strip (tokenized blur against half of it).
   - Solid, vivid, glass, light glass and the glass fallback in both schemes.
   - Elevation 0–3 and the drawer in both schemes.
2. **Screens.**
   - **Live ride**, phone 390 × 844 at regular density: light (en), dark (ru), and a third frame showing the light screen under Reduce Transparency. Increase Contrast uses the same glass fallback with its own tones, which a nested frame cannot show: `data-ds-contrast` is read from the root only, as modality is (F28).
   - **Ride report**, desktop 1440 × 900 at compact density: dark, then its light twin.
   - **Glance**, watch 198 × 242 at comfortable density, in Russian: dark, and a light twin that only checks the tokens.
3. **Findings.** The as-built light phone, the as-built light report card, and the vivid 2×2 as built next to the board's pairing, followed by findings F1–F31 (listed below).
4. **Sign-off.** The checklist below.

Two looks on the board are proposals drawn from existing tokens, not today's resolution:

- The light screens draw Card glass as `material.glass.light.fill` with `text.secondary` and `text.dimmed` (F1, F4, F7).
- The report's vivid 2×2 uses one temperature on a diagonal (F11).

The as-built versions are kept in section 03 as evidence.

### Where the board comes from

Three candidate boards were built from the same brief, and three judges scored them. This board starts from the consensus winner ("ride") and fixes every must-fix item the judges raised. It adds these elements from the other two candidates:

| From | Element | Where on this board |
|------|---------|---------------------|
| home-energy | Vivid 2×2 as a one-temperature diagonal pair | Ride report, both schemes |
| home-energy | Three-column type specimen with the `metric.xl` 300/200 strip pinned under it | Foundations |
| home-energy | Continuous ramps with OKLCH L and roles; chart series as strokes on each scheme's own plot | Foundations |
| home-energy | Datasheet ornament: dotted leaders, tick rulers | Report glass card (leaders), report chart (climbs on a tick ruler), phone ride card (progress ruler) |
| home-energy | Translucent status layer (wash, recoloured stroke, outlined pill; the pill paints `bg.page` under its tint, F31) | Report map: the closed bridge |
| home-energy | The lit tile carrying the climb; card padding bound to the density token | Watch |
| home-energy, portfolio | Explicit `data-ds-density` on every frame | All screens and pinned panels |
| portfolio | Bloom strip (tokenized blur against half of it); full-range grain recipe | Foundations; every vivid and glass surface |
| portfolio | Fallback frame of the signature screen, with selected → inverse | Third phone; materials row |
| portfolio | Dense hairline table: mono ids (plain text, not chips), sparklines, tabular columns, delta badges | Report: "Segments on this loop" |
| portfolio | Level chart with the value above and the delta below each level, one window in the accent | Report: "Old Mill Rise, six rides" |
| portfolio | Light glass with ink over a daylight map | Light report card (the F1 proposal) |

Reference families are named on the board by their shot ids in `docs/research/references.json`, never by name (ADR-0015; the reference-copy guard scans this folder).

## Provenance

The generated files were copied from the working tree at HEAD `09856335f5f915d239d6898836dbc7035cf857c6`. At that point the tree under `web/packages/tokens/src/generated/` was clean. Every file was last changed in commit `b6af61cbf6fb0bddb99d976e298b1a57a991b56f` ("P1-5 and P1-8 emission", 2026-09-15). The copies are byte-identical to their sources.

| Copy | Source | SHA-256 |
|------|--------|---------|
| `assets/tokens.css` | `web/packages/tokens/src/generated/prism/tokens.css` | `d1c06d1040ad37b015e797aa862c16466d3b8001c9a451ff1e4a526e9b037dc4` |
| `assets/motion.css` | `web/packages/tokens/src/generated/motion.css` | `ce5a0a7081282a46603bf5de693134b2412f87667e280bcc9fd318d9c85957b9` |
| `assets/fonts/fonts.css` | `web/packages/tokens/src/generated/prism/fonts/fonts.css` | `6fa53032886efb4f8ebbf999fe7d4a645605e5ade3cc817e83fabe37d526e6b4` |
| `assets/fonts/onest/onest-wght.woff2` | `…/prism/fonts/onest/onest-wght.woff2` | `1c4fca24ecf78f9ce3922c9fa58f06e139ed08a5faa13ca5b082482317bda5f9` |
| `assets/fonts/onest/OFL.txt` | `…/prism/fonts/onest/OFL.txt` | `071195d8806e226faeee60259c28ca67b458227af5195a73f5cfcab06e3003bc` |
| `assets/fonts/jetbrains-mono/jetbrains-mono-wght.woff2` | `…/prism/fonts/jetbrains-mono/jetbrains-mono-wght.woff2` | `11038e282dd7cb983dfc4e565017f37a91041c073c8929771fb6e64d27814396` |
| `assets/fonts/jetbrains-mono/OFL.txt` | `…/prism/fonts/jetbrains-mono/OFL.txt` | `b2fe5e8987594e9ffd1d2ca52a2f5d73eb8335243893c5d6254b5ad69269591d` |

`fonts.css` keeps its relative `./onest/…` and `./jetbrains-mono/…` URLs, so the folder layout under `assets/fonts/` mirrors the generated one. Both fonts are under the SIL Open Font License, which travels with them.

To check that the copies still match the build, run this from the repository root. No output means they match:

```sh
G=web/packages/tokens/src/generated; B=docs/direction-board/assets
cmp $G/prism/tokens.css $B/tokens.css; cmp $G/motion.css $B/motion.css; cmp $G/prism/fonts/fonts.css $B/fonts/fonts.css
cmp $G/prism/fonts/onest/onest-wght.woff2 $B/fonts/onest/onest-wght.woff2
cmp $G/prism/fonts/jetbrains-mono/jetbrains-mono-wght.woff2 $B/fonts/jetbrains-mono/jetbrains-mono-wght.woff2
```

After a token change, copy the files again, update the table above and re-render.

### Rules the page keeps

- **Only token values.** Colors, font families, type values, radii, spacing, shadows, blur, durations and easings come only from `var(--ds-…)` properties of the copied `tokens.css` and `motion.css`, or from `color-mix()` of them. The page has no hex, rgb, hsl or oklch literals and no font-family literals.
- **Where pixel literals appear.** Only in the device frames, in the board's outer grid, and inside the procedural SVG geometry (map, charts, glyphs). Chart and map markers are sized from `chart.marker-size`, and stroke widths are tokens or multiples of tokens.
- **Untokenized values.** A few values have no token yet. They are declared at the top of the page's stylesheet and in F8, F14, F15 and F30:
  - the map palette (color-mix percentages);
  - map strokes as multiples of tokens: the route casing at 3.5 ×, the ridden route and the climb at 2 × and the route ahead at 1.5 × `chart.line-width`, the map-label halo at 2 × `border.strong`, and the route start ring at `chart.marker-size` / 2 + `chart.line-width`;
  - the glass edge geometry: a 135deg gradient from `edge.start` at 0 % to `edge.end` at 75 %;
  - the light-glass bloom shape: a 60 % × 120 % radial from the top-leading corner, clear at 70 %;
  - the vivid bloom placement: offset 10 % down and scaled to 0.92;
  - the vivid inner highlight (on-vivid at 32 %);
  - the light raised highlight (neutral.0 at 60 %);
  - the critical status border (50 %);
  - the grain noise recipe;
  - the half-blur bloom preview.
- **Text on vivid.** A vivid Card's header column ends at W − p − a − 16, so its text below 24 px stays in the ADR-0022 V2 block at every density. The bloom cards sit at a V2 reference geometry (240 × 240, regular). The evidence 2×2 tiles are too small for any V2 geometry, so they carry no text.
- **Frames are pictures.** Each device frame, the as-built report stage and each materials stage is a `<figure>` named by its caption, and its screen is `inert`. The mocks add no landmarks, headings or tab stops: the page has one `main`, a labelled section nav, one H1, four H2 sections and H3 sub-sections, and Tab reaches only the section links. Decorative SVG is `aria-hidden`; each evidence 2×2 is one image named by its gradients. Russian labels outside the Russian frames carry `lang="ru"`.
- **Invented content.** All copy, names and numbers are invented. Maps are drawn from a seed, and nothing comes from the reference shots.

## Renders

`renders/` holds the final PNGs from `render.mjs`:

| File | Content |
|------|---------|
| `board-light.png`, `board-dark.png` | The whole board at 1600 CSS px, full page, under `prefers-color-scheme: light` and `dark`. About 7 MB each, so they are not committed (`.gitignore`); `render.mjs` writes them locally. The published board is https://claude.ai/artifact/HDD9juxf5tL4thrDonkZfe |
| `screen-live-ride-light.png`, `screen-live-ride-dark.png` | The live ride phone, light (en) and dark (ru) |
| `screen-live-ride-fallback-light.png` | The live ride phone under the glass fallback (light, ru) |
| `screen-ride-report-dark.png`, `screen-ride-report-light.png` | The ride report desktop, dark and light |
| `screen-glance-dark.png`, `screen-glance-light.png` | The watch, dark and light |

The screen renders are element screenshots of each device frame, taken from the light pass. Screens pin their own scheme, so they are the same in both passes.

### How to re-render

`render.mjs` opens `index.html` with Playwright Chromium at 1600 px wide and renders the full page twice, once under `prefers-color-scheme: light` and once under `dark`. Before it writes a PNG it waits for `document.fonts.ready` and for the page's build. The run exits 1, and writes no PNG for that scheme, if any of these happens:

- any `@font-face` did not load;
- any glyph rendered in a font other than Onest or JetBrains Mono. The script asks Chromium which fonts drew each element that owns text (`CSS.getPlatformFontsForNode`), because `document.fonts.check()` is true for any loaded face without a `unicode-range`, whether or not it holds the glyphs;
- the page requested anything but `file:` or `data:` URLs;
- the page threw or logged an error.

Playwright 1.63.0 is not a repository dependency. Install it outside the repository and point `PW_MODULE` at it:

```sh
mkdir -p /tmp/prism-pw && npm --prefix /tmp/prism-pw install playwright@1.63.0
(cd /tmp/prism-pw && npx playwright install chromium)
PW_MODULE=/tmp/prism-pw/node_modules/playwright/index.mjs node docs/direction-board/render.mjs
```

Set `PLAYWRIGHT_BROWSERS_PATH` for both commands if you install the browser somewhere other than Playwright's default cache. A passing run prints both font faces as `loaded` for each scheme, and 0 text elements with a font outside Onest and JetBrains Mono.

## Sign-off checklist

The owner approves or rejects each decision. A rejection becomes a token change through P1-1 or P1-2 before P3-3 and P3-4 start. The board section and the finding behind each item are given in brackets.

1. **The vivid gradients after the P1-1 retune**
   - [ ] **The sets as rendered.** The light set (sky, olive, rose, orchid) and the dark set (plum-dusk, forest-moss, ember-night, navy-cyan) as rendered in 01, with the default pair `gradient.vivid.default` = sky (light) and plum-dusk (dark).
   - [ ] **The light set's chroma.** Keep the dusky light set, or spend the V1 lightness cap on chroma for sky, rose and olive. [F13]
   - [ ] **Navy-cyan's horizon.** Retune `ref.gradient.vivid.navy-cyan` so it no longer draws a hard band. [F12]
   - [ ] **Ember-night's place.** Take `ref.gradient.vivid.ember-night` out of the 2×2 slots and keep it for a single hero card on screens without the accent. [F11]
   - [ ] **The 2×2 rule.** One temperature on a diagonal (light slots 1 + 4, dark slots 1 + 2) until the slots are reordered. [F11]
   - [ ] **The bloom.** `ref.gradient.vivid.*-bloom-blur` at half its value (75 px), a stronger dark alpha, and the bloom taken from the brightest stop. [F14]
   - [ ] **The grain.** Grain drawn as full-range monochrome noise at the tokenized opacities. [F15]
2. **The glass recipe**
   - [ ] **Card glass follows the scheme.** In light: `material.glass.light.fill` with `text.secondary` and `text.dimmed`, as on the light phone and the light report. In dark: `material.glass.dark.fill` with `text.on-glass` at 100 / 78 / 64 %. [F1, F7]
   - [ ] **Neutral smoke.** Move `ref.color.smoke.light` and `ref.color.smoke.dark` to the neutral ramp's hue, or down to its chroma. [F3]
   - [ ] **The light scrim.** `material.glass.scrim` at 0.45 in light, or no scrim over maps once F1 lands. [F2]
   - [ ] **Charts on glass.** The plot is keyed by material (`color.chart.plot`), and charts on media get their own tokens. [F4, F5]
   - [ ] **The edge.** Glass keeps its white 1 px edge from `edge.start` to `edge.end`, and the edge gets a color token. [F8]
   - [ ] **The fallback.** Raised painted over the page with the standard tones, and inverse when selected, as on the third phone and in the materials row (ADR-0022 §1).
3. **Thin metric weights in dark**
   - [ ] **metric.xl at 200 in dark.** `type.metric.xl` at weight 200 in dark (at 34 px or more, the watch's 40 px included) against 300 in light.
   - [ ] **Figures.** Heroes use proportional figures and live values tabular ones. Static `metric.md` readouts set `numeric: proportional`, or the role changes. [F24]
4. **The accent's role**
   - [ ] **One orange, one object.** The flagged climb on the map, the chart window, the ruler, the table delta and the level chart. Never an action, never an active state.
   - [ ] **Accent text.** `accent.800` in light and `accent.500` in dark.
   - [ ] **The lit tile.** The one `bg.fill.accent` tile, with its single ink tone. [F23]
   - [ ] **Dark tint.accent.** Keep `color.bg.tint.accent` at 14 % in dark for chart windows, or rebuild it. [F18]
5. **Density and radius feel**
   - [ ] **Compact desktop.** Card radius 20, controls 32 / 40, and `space.page-margin` at 16 px as it renders, or 24. [F26]
   - [ ] **Regular phone.** Card 24, sheet 28, the ride card at the hero radius 40, controls 40 / 44.
   - [ ] **Comfortable watch.** As it resolves today, or a watch delta. [F27]
   - [ ] **The ghost button.** Outlined at rest, or filled as today. [F29]
6. **Screens and missing tokens**
   - [ ] **The three compositions.** Live ride, ride report and glance, for the ADR-0015 reference-distance review. The ride report is the one at risk. It rearranges most of the inventory of traffic console 27220417: the tools cluster, the title over a fading map, a glass card tied to a map object, a banded chart with an inline target and a trailing axis, and a level chart. Its status pill under the tools also echoes shipping console 27658472. Approve it, or ask for the level chart or the top band to be reworked. The segments table has already dropped its row-header chips.
   - [ ] **Token work before P3-3 and P3-4.** Map tokens [F30], status pills on media [F31], the media solid pair [F6], rings on media [F22], `type.axis` [F20], the watch metric size [F25] and alpha light status tints [F21].

## Token findings

These are the tokens that looked wrong or weak on the candidate boards, each confirmed by the judges. "Found by" names the candidate board and its finding number. Two findings were confirmed by one judge and rated plausible by another: F15 (the grain) and F28 (hit sizes). One judge treated F24 as a policy choice rather than a defect. F31 comes from the final check of this board, not from a candidate board, and the judges have not seen it.

### Glass and materials

| # | Token | Scheme | Problem | Proposed change | Found by |
|---|-------|--------|---------|-----------------|----------|
| F1 | `comp.card.glass.fill` → `material.glass.dark.fill` | light | Card glass is smoked glass in light too (`ref.color.smoke.light` at 55 %). Over a daylight map it composites to #6A6C6B–#787977. There, `text.on-glass-secondary` reaches 3.35–3.96:1 and `text.on-glass-tertiary` 2.79–3.23:1, and the card reads as a khaki slab. | Resolve Card glass per scheme: light → `material.glass.light.fill` with the light tones (F7); dark → `material.glass.dark.fill`. Keep smoked glass for photographs (`backdrop: image`). | ride 1, home-energy 6 |
| F2 | `material.glass.scrim` | light | Black 35 % over `neutral.100` composites to #9D9D9F (OKLCH L 0.70), where white reaches 2.70:1. Over white roads it gives 2.44:1. ADR-0022 §3.3 needs 3.0:1 (L ≤ 0.67). | Raise the light scrim to 0.45, or state the 3:1 limit on the glass composite. With F1, maps need no scrim. | ride 2 |
| F3 | `ref.color.smoke.light` (h 128.7), `ref.color.smoke.dark` (h 145.1) | both | The smoked fills have a green-yellow hue, while the neutral ramp sits at 261.6–271.4. Glass reads olive, against principle 6. | Keep L and C and move the hue to about 265, or drop C to the ramp's 0.004–0.007. | ride 3, home-energy 6 |
| F4 | `color.chart.plot` | light | The plot is `neutral.0`, about 9.1:1 against smoked glass: a white hole in the card. | Key the plot by material: on glass, white 8 % in both schemes with series in the glass foreground. Keep `neutral.0` on solid. | ride 4, home-energy 2 |
| F5 | `color.chart.*` on vivid and glass (missing) | light | Every light chart token is ink, so traces, reference lines and grids on media have no valid token. | Add `color.chart.on-media.line`, `.reference` and `.grid` (white 100 / 64 / 24 %), picked by the published material. | portfolio 11, home-energy 2 |
| F6 | `color.bg.fill.inverse`, `color.text.on-inverse` | light | Principle 9 wants a white solid on glass and vivid, but `bg.fill.inverse` is ink in light. All three boards borrowed a white. | Add `color.bg.fill.inverse-media` = `neutral.0` and `color.text.on-inverse-media` = `neutral.950` in both schemes. | ride 5, portfolio 10, home-energy 7 |
| F7 | `color.text.on-glass-light` (ADR-0022 §3.1, glassLight row) | light | Light glass has one ink tone. The dimmed fraction is lost, placeholders read as typed text, and a whole sheet renders at 100 % ink. | In light, glassLight over image or map publishes `text.secondary` (5.24–6.31:1) and `text.dimmed` (3.15–3.80:1 at 24 px or more); vivid keeps one tone. Alternative: fill white 38 % plus `text.on-glass-light-secondary` at ink 80 %. | ride 14, portfolio 7 |
| F8 | `material.glass.*.edge.*` (alpha only), vivid highlight, raised highlight, bloom color | both | These values have no color token, or no token at all, so every board wrote its own. | Add an edge color (`neutral.0`), a vivid highlight alpha (about 0.30 → 0 light, 0.18 → 0 dark), `color.edge.raised` (`neutral.0` light, white 8 % dark) and a bloom color per gradient. | ride 12, portfolio 5, home-energy 10 |
| F9 | `color.bg.surface`, `.raised`, `.nested` | dark | White-alpha overlays (6 / 9 / 12 %) turn translucent over imagery and vivid. | Surface always paints `bg.page` under solid, raised and nested, or the build emits opaque twins (#1C1C1F, #232426, #2A2B2E). | portfolio 8 |
| F10 | `color.bg.surface.raised` | light | White 70 % composites to #FBFBFC, 1.03:1 against `bg.surface`: raised looks the same as solid. | Raised on a solid parent resolves to nested, or light raised becomes `neutral.50` with `elevation.1`. | portfolio 15 |

### Vivid

| # | Token | Scheme | Problem | Proposed change | Found by |
|---|-------|--------|---------|-----------------|----------|
| F11 | `gradient.vivid.1`–`4` (slot order) | both | Slots 1–4 mix temperatures (§3.5, anti-pattern 13). Ember-night's end stop is ΔE(OK) 0.078 from `accent.500`, so it reads as a second, larger accent. | Make each quartet one temperature: move ember-night out of the slots and give dark slot 3 a cool gradient. Add a second cool light gradient, or let a 2×2 alternate one pair on its diagonal (light 1 + 4, dark 1 + 2). The owner decides whether sky + orchid reads as one temperature. | ride 6, portfolio 2, home-energy 3 |
| F12 | `ref.gradient.vivid.navy-cyan` | dark | Between 45 % (L 0.32) and 75 % (L 0.61) lightness climbs 0.96 per unit of t, against 0.043 before it, so the tile shows a hard horizon. | Move the 75 % stop to about 88 %, or add a stop near 60 % at L ≈ 0.45. V1 and V2 still pass. | ride 7, portfolio 3 |
| F13 | `ref.gradient.vivid.sky`, `.rose`, `.olive` | light | After P1-1 the light set is dusky. Sky has C 0.072 / 0.097 / 0.044, and rose moves only 0.05 in L over its first 65 %. | Spend the V1 cap on chroma: sky mid and end C ≈ 0.12 with its end hue toward 235; rose 0.50 0.09 22 → 0.58 0.11 32 → 0.67 0.10 52; olive end C 0.13. Re-run V1, V2 and the ink-on-light-glass pairs. | portfolio 4, home-energy 4 |
| F14 | `ref.gradient.vivid.*-bloom-blur` (150px), `-bloom-alpha` (0.3) | both | CSS `blur()` takes a standard deviation, so the bloom barely shows. In dark it does not show at all. | Emit sigma = radius / 2 (75 px) or set the token to 75 px. In dark, use alpha ≈ 0.45 and take the bloom from the brightest stop. | portfolio 1 |
| F15 | `ref.gradient.vivid.*-grain`, `material.glass.dark.fill-grain` | both | Grain is only an opacity, and the noise itself is not defined, so implementations will disagree. | Pin the recipe: monochrome noise stretched to full range, overlay blend, 1 px grains at 1×, masked under text below 13 px. | portfolio 12 |
| F16 | `type.metric.unit` on vivid (ADR-0022 §4.2) | both | On vivid, the hung unit cannot follow the hero, because text below 24 px must stay in the header. | Add a V3 check: the hero block (hero plus unit) must reach 4.5:1 at every V2 geometry. Until then, Card.yaml says the unit moves into the caption. | ride 13 |

### Charts, status and accent

| # | Token | Scheme | Problem | Proposed change | Found by |
|---|-------|--------|---------|-----------------|----------|
| F17 | `color.chart.target` = `color.chart.comparison` | light | Both are ink 45 % (3.09:1), so the comparison line reads as heavy as the target. visual-dna §3.6 says 30 %. | Light `chart.target` → ink 60 % (5.07:1). Keep `chart.comparison` at 45 %. | portfolio 6 |
| F18 | `color.bg.tint.accent` | dark | 14 % over the page composites to #2D2118, which reads as brown mud. | In dark, the one lit card uses `bg.fill.accent` with ink, and the tint is kept for chart windows. Or build the dark tint from `accent.400` at 12 %. | portfolio 14 |
| F19 | `chart.gauge-stroke-ratio` (0.1) | both | A 170 px ring gets a 17 px stroke, which outweighs the hairline charts and the thin hero. This board draws no gauge; the home-energy candidate showed it. | 0.05, or a hairline track with only the value arc weighted. | home-energy 5 |
| F20 | `type.axis` (missing) | both | §8.2 sets axes at 12 px tabular, but `type.data` is 13 px and `type.caption` is proportional. | Add `type.axis` 12 / 1.2 / 400 with tabular figures, bound by ChartAxis. | portfolio 13, home-energy 13 |
| F21 | `color.bg.tint.critical` (and `.success`, `.warning`, `.info`) | light | Light tints are opaque steps, while dark tints are 10 % alpha. The closed-bridge wash on the light report map shows as a flat pink disc. | Author light tints as 10–12 % alpha of the dot step, and keep today's values as the expected composites on white. | home-energy 1 |
| F22 | `color.border.strong`; rings on media (missing) | light | `border.strong` is ink 45 % (visual-dna says 30 %), and no token says "rings go to white 40 %" on media. | Add `color.border.on-media` = white 40 % in both schemes. | home-energy 8 |
| F23 | `color.text.on-accent` | both | The lit tile has one tone, so title, caption and hero differ by size alone. | Add `color.text.on-accent-secondary` at ink ≈ 70 % (5.82:1 on `accent.300`, 4.78:1 on `accent.500`). | home-energy 9 |

### Type, density and the map

| # | Token | Scheme | Problem | Proposed change | Found by |
|---|-------|--------|---------|-----------------|----------|
| F24 | `ref.type.metric.md` (`numeric: tabular`) | both | Static readouts look letter-spaced beside proportional heroes. | Make `metric.md` proportional by default with `numeric: tabular` on live values, or keep the role and set `numeric: proportional` on static readouts, as the report does. | ride 10 |
| F25 | `type.metric.xl` on watchOS (40 px) | watch | No token holds the 40 px watch size, so the boards borrowed `display.md`'s size. | A watch size token (40) for `metric.xl` that keeps its dark weight 200. | home-energy 12 |
| F26 | `space.page-margin` (compact = 16px) | compact | The desktop page margin is 16 px, where §6.4 asks for 24 (dark consoles) or 32–36 (light dashboards). | Compact `space.page-margin` → 24 (`space.7`), or add `space.page-margin.wide` → `space.9`. | ride 9 |
| F27 | `space.card-padding`, `size.control.*` (comfortable) | watch | Padding 24 and a 48 px control fill most of a 198 × 242 face. | A watch delta (card padding 16, control lg 44), or regular as the watchOS default density. | home-energy 11 |
| F28 | `size.hit` (modality, root-only) | both | A board or gallery cannot show touch hit sizes beside pointer frames. | Document a gallery-only nested override, or render frames in their own documents. | home-energy 15 |
| F29 | `comp.button.ghost.bg.rest` | light | The ghost pill rests on `bg.fill.neutral.subtle` and reads as filled. visual-dna §3.6 also lists "ghost fill", so the owner picks one reading. | `ghost.bg.rest` → transparent, with `bg.fill.neutral.subtle` for hover and pressed. | ride 11 |
| F30 | `sys.color.map.*` (missing) | both | No token styles the map that is Prism's signature ground, so every board mixed its own palette, and ADR-0022's backdrop limits cannot be checked against a map. | Add `sys.color.map.{land, block, building, road, road-major, water, park, label, route, route-ahead, route-casing}` per scheme, with the dark set within L 0.25–0.49 and the light set at L ≥ 0.45, checked in `tools/contrast`. The final check of this board adds two items. First, the pair `text.critical` on `tint.critical` over `map.road` (F31). Second, a stated tolerance for thin route lines under glass: on the dark phone they exceed the ADR-0022 §3.3 backdrop limits locally (L 0.54 under the light cue against 0.35, L 1.0 under the ride card against 0.67, both L 0.27 at p95), while the text keeps at least 4.89:1. | ride 8, portfolio 9, home-energy 14 |
| F31 | `color.bg.tint.critical` (and `.success`, `.warning`, `.info`) under text on media | dark | Dark status tints are 10 % alpha, so a status pill over a map lets the roads through. On the report's closed-bridge pill, `text.critical` (12 px `label.sm`) on `tint.critical` measures 4.39:1 where a road (`neutral.0` at 13 % over the page) runs behind the label, below 4.5:1. Over bare `bg.page` the same pair is 5.76:1. | A status pill or badge over a map or imagery paints `bg.page` under its tint, as F9 proposes for surfaces; the report does this now and measures 5.75:1. Or raise dark `text.critical` until it holds 4.5:1 over the tint on the lightest map road. Add the pair to the F30 checks. | final check of this board |
