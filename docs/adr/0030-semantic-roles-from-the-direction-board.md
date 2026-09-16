# ADR-0030: Semantic roles found by the direction board

- Status: accepted
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #30
- Amends: ADR-0007 (rule 2: on vivid and on the scheme's glass, a target line takes the `reference` token of that material's chart family), ADR-0021 (§2: the watch hero size is a token of the `watch` platform context instead of a spec note; §4: the `apple` and `watch` platforms differ in `sys.type.metric.xl`; §5: `metric.md` joins the proportional roles and `axis` the tabular ones; §1's and §7's role tables gain `axis`), ADR-0022 (§1.1: the light `raised` composite; §1.4 and rule 3's ownership note: the `watch` platform context carries a typography delta, still no material delta; §2.6 and the "Edges as colors" alternative: the glass edge and the vivid highlight take the neutral `color.edge.highlight`; §3.1: the tone table gains an `accent` row), ADR-0024 (§6: the `type.axis` role, `sys.type.metric.xl` leaves `sys/base`, and the gradient renderer's derived declarations gain `-bloom-color`; §9.1: `platform` also owns `sys.type.metric.xl`; §9.5: the `watch` platform context loads a delta file)

## Context

The direction board for gate P3-0 lists 31 token findings, F1–F31, each with the tokens involved, the problem and a proposed change (`docs/direction-board/README.md`, "Token findings"). The owner decided the look questions on 2026-09-15; ADR-0029 records them (F1–F3, F7, F11–F13, F26, F27, F29). The owner asked for the technical findings to go in by their proposals unless the evidence says otherwise, with each outcome recorded, and for F28 to be documented only. This ADR records them:

- F4, F5 (charts on glass and media), F6 (a solid on media), F8 (edge, highlight and bloom colors);
- F9, F10 (surfaces over imagery, light raised), F14, F15 (bloom and grain), F16 (the unit on vivid);
- F17, F19, F20 (chart weights and the axis role), F18, F23 (the accent), F21, F31 (status tints);
- F22 (rings on media), F24, F25 (figures and the watch hero), F28 (hit sizes in a gallery), F30 (the map).

Every board had to invent these values, because the token set has no role for them. The board declares the ones it still invents at the top of its stylesheet: the map palette, the edge geometry, the bloom shape and placement, the vivid highlight, the light raised highlight, the grain recipe.

### Facts verified for this ADR (2026-09-15)

The probes ran as ADR-0029's did: in the session scratch directory, with the repository's `irColor`, the V1 and V2 sampling of `tools/contrast/gradient.ts`, WCAG 2.x luminance and source-over compositing in gamma-encoded sRGB.

| # | Fact | Evidence |
|---|------|----------|
| M1 | The map grounds of §1 composited over the page. Light (`neutral.100` land): land 0.961, block 0.941, building 0.910, road 1.000, road casing 0.906, water 0.897, park 0.899 (OKLCH L). Dark (`neutral.950` land): 0.164, 0.192, 0.234, 0.299, 0.164, 0.251, 0.242. `color.map.label` on each ground: light 4.63–6.31, dark 5.28–6.25. At the board's water alpha of 0.19, the light label reaches only 4.46. | probe |
| M2 | Route pairs on the route casing: light ridden route 19.30, route ahead (ink 45 %) 3.09; dark 19.30 and 3.81 (white 40 %). Dark-scheme light glass (white 26 %) with white text over the dark road: 5.93. | probe |
| M3 | `text.critical` on `bg.tint.critical` in dark: 5.76 with `bg.page` under the tint, 4.04 with `color.map.road` under it (the board measured 4.39 where its road runs behind the label). | probe; board F31 |
| M4 | White at 64 %, 40 % and 24 % over a vivid stop at exactly 3.0:1 against white (#959595): 2.12, 1.64 and 1.36. | probe |
| M5 | Plot white 8 % on the scheme's glass (ADR-0029): over #555555 in light, ink 6.16, ink 60 % 3.18, ink 10 % 1.19. Over every sample of the light vivid set (ADR-0029 §2), ink 60 % reaches 3.10 at worst (sky's first stop), ink 75 % 4.13 and ink 5.87. Over #959595 in dark, white 7.39, white 64 % 4.15, white 24 % 1.83, white 40 % 2.61; over every dark stop, white stays above 7.39. | probe |
| M6 | Ink at 70 % alpha: 5.82 on `accent.300` (the light lit tile), 4.78 on `accent.500` (the dark one), 6.66 on the light `bg.tint.accent` over the page. | probe |
| M7 | Each light status tint as its `dot-light` step at alpha 0.12 over white reproduces today's opaque `tint-light` within 0.48/255 per channel (#E6F6E9, #FEF6E8, #FDE9E9, #EAEDF9). Status text on it: 5.15–5.35 over white, 4.64–4.83 over the page. | probe |
| M8 | Light `raised` as `neutral.50` (#F7F8FA) instead of white 70 % over the page (#FBFBFC): against the page 1.05 (was 1.08), against white 1.06 (was 1.03). Primary, secondary and dimmed text 18.16 / 5.94 / 3.57, `color.border.strong` 3.06. | probe |
| M9 | Light `color.chart.target` as ink 60 %: 5.07 on white, 4.89 on the page; ink 75 %: 8.83 and 8.30. | probe |
| M10 | The hero block of a vivid Card (x from p to W − p − a − 16, the 32 px `metric.lg` line box above the bottom padding), minimum against white over the V2 geometries after ADR-0029: orchid 3.34, sky 3.46, olive 3.63, rose 3.66, ember-night 3.73, navy-cyan 3.33, night-lagoon 4.60, forest-moss 5.56, plum-dusk 5.57. Reaching 4.5:1 needs a luminance of 0.183 or less, about OKLCH L 0.57 on a neutral, up to t ≈ 0.8 at 135° and t ≈ 0.9 at 180°. | probe |
| M11 | The watch hero at 40 px keeps ADR-0021's thin weight in dark (40 ≥ 34). At the watch's Large size it renders at 36.25 pt, and at its smallest Dynamic Type size at 30.6 pt (ADR-0021 T6, §2). | ADR-0021 |
| M12 | Light water at α 0.16 over the page (#D7DDEF) lies ΔE(OK) 0.017 from the light `bg.tint.info` over the page (#DDE2F0), and 0.033 in dark, because `ref.color.series.light.3` copies `status.info.dot-light` (#4E6CCD) and `series.dark.3` copies `status.info.mark-dark` (#6B84E0). At these alphas every pale wash is that close to another: the light info and critical tints lie 0.031 apart. Water at hue 225–245 and the same L gives 0.020–0.025 from the info tint and comes within 0.011–0.017 of park, with every map pair unchanged within 0.02. | probe |

## Decision

Every new `sys` color is an alias, an alias with `app.prism.alpha`, or a pure white literal (ADR-0020 §3). Every new `sys.color.**` and `sys.material.**` token is declared in both base scheme files and owned by `colorScheme` (ADR-0024 §9.1). New tokens carry ADR-0026's `figma` metadata, and text tokens carry `a11y.pairsWith`. §10 sums up the tokens, their owners and their checks.

### 1. The map (F30, with F31's pair)

Prism does not render maps (ADR-0007), but it supplies the map style, because the map is the signature ground of the references and the backdrop that glass limits are measured on.

1. **Tokens.** `sys.color.map.*`, owned by `colorScheme`:

   | Token | Light | Dark | Kind |
   |-------|-------|------|------|
   | `land` | `{sys.color.bg.page}` | `{sys.color.bg.page}` | ground |
   | `block` | `{ref.color.neutral.950}` α 0.03 | white α 0.025 | ground |
   | `building` | `{ref.color.neutral.950}` α 0.075 | white α 0.065 | ground |
   | `road` | `{ref.color.neutral.0}` | white α 0.13 | ground |
   | `road-casing` | `{ref.color.neutral.950}` α 0.08 | `{sys.color.bg.page}` | ground |
   | `water` | `{ref.color.map.light.water}` α 0.16 | `{ref.color.map.dark.water}` α 0.16 | ground |
   | `park` | `{ref.color.map.light.park}` α 0.16 | `{ref.color.map.dark.park}` α 0.11 | ground |
   | `label` | `{sys.color.text.secondary}` | `{sys.color.text.tertiary}` | mark |
   | `route` | `{sys.color.chart.series.1}` | `{sys.color.chart.series.1}` | mark |
   | `route-ahead` | `{sys.color.chart.comparison}` | `{sys.color.chart.comparison}` | mark |
   | `route-casing` | `{ref.color.neutral.0}` | `{sys.color.bg.page}` | mark |

   - These are the board's hand-mixed values as aliases. The one change is light water, from 0.19 to 0.16, so that the map label and the dimmed tone of ADR-0029 hold over it (M1; ADR-0029 S4).
   - A translucent ground is drawn over `land`; the map renderer composites it, as the contrast tool does.
   - The marks follow the chart and text tokens, so a brand's ramps reach them, and the Increase Contrast deltas strengthen the label and the route ahead. The climb is `color.accent`, not a map token.
2. **Hue primitives.** Four new system-owned `ref` colors give the water and park hues:
   - `ref.color.map.light.water` `oklch(0.5582 0.1535 268.2)` #4E6CCD and `ref.color.map.light.park` `oklch(0.5868 0.0979 181.4)` #1F8F80;
   - `ref.color.map.dark.water` `oklch(0.6361 0.141 270.5)` #6B84E0 and `ref.color.map.dark.park` `oklch(0.7637 0.1043 180.3)` #5BC8B5.

   - They are today's series 3 and 4 values, which the board borrowed, but they are separate ids. A brand that re-colors its chart series therefore does not re-color its parks, and a retune of the status scale does not move the map.
   - The values still coincide: series 3 copies the info status hue, so light water is `status.info.dot-light` at α 0.16 and lies ΔE(OK) 0.017 from the light info tint (M12). A new hue does not separate them, because every pale wash on the map sits within about 0.03 of another (M12).
   - So hue never carries status on the map. A status area there carries its status stroke and a labelled pill, as the board's closed bridge does and as ADR-0011 requires of every status (never color alone).
   - They stay outside `BRAND_OVERRIDABLE`: a brand-owned map needs its own ADR (ADR-0020 rule 15).
3. **F30's list.** `road-major` is not added: the board draws no road hierarchy, and a major road is `road` at a wider stroke over `road-casing`. `road-casing` is added, because the board needed it.
4. **Stroke widths are documented, not tokenized**, in the token descriptions:
   - the route casing is 3.5 × `chart.line-width`;
   - the ridden route and the climb are 2 × `chart.line-width`;
   - the route ahead is 1.5 × `chart.line-width`, dashed with `stroke.target`;
   - labels carry a halo of `color.map.land` at 2 × `border.strong` (the 1.5 px width).

   Apps draw the map in their own SDK (ADR-0007); a width a Prism component needs later becomes a `sys` token under ADR-0024's rules.
5. **Backdrop limits (the check F30 asks for).**
   - `contrast:check` gains a `map/backdrop-limit` check. In dark, every ground composited over `land` is at OKLCH L 0.35 or darker, the dark-scheme light-glass limit of ADR-0022 §3.3 and so also below the dark-glass limit of 0.67. In light, every ground is at L 0.45 or lighter, the light-scheme light-glass limit. Today: dark 0.164–0.299, light 0.897–1.0 (M1).
   - F30 proposed a dark band of L 0.25–0.49. The dark land is the page (L 0.164), and dark-scheme light glass sits over the map, so the upper bound is 0.35 and there is no lower bound.
   - The pairs grammar gains **token backdrops**: an entry of `backdrops` may name opaque-composited color tokens, and the seven grounds (`color.map.land|block|building|road|road-casing|water|park`) are each composited over `color.map.land`. ADR-0029 §1.6's glass pairs and the pairs below use them.
6. **Pairs.**
   - `color.map.label` on each of the seven grounds, functional;
   - `color.map.route` and `color.map.route-ahead` on `color.map.route-casing`, boundary;
   - `color.text.on-glass-light` on `material.glass.light.fill` and `.chip` in dark, with the grounds added to the backdrops (the turn cue of the dark phone).
7. **Thin lines under glass (F30's tolerance).** The route lines and the climb are at most 3.5 × `chart.line-width` wide. Under glass whose blur is at least `ref.blur.chip` (20 px) they do not count toward ADR-0022 §3.3's backdrop limits, as long as the area under the glass stays within the limit at the 95th percentile of luminance.
   - Evidence: on the dark phone the lines reach L 0.54 under the light cue (limit 0.35) and L 1.0 under the ride card (limit 0.67), both areas are at L 0.27 at the 95th percentile, and the text keeps at least 4.89:1 and 7.8:1 (board F30).
   - This is checked on the board and gallery renders (P3-5), not by `contrast:check`, which knows no geometry.
8. **Status over the map (F31).** §6.2 makes a tinted element that carries text over media paint `bg.page` under its tint. The negative fixture `tools/contrast/fixtures/broken-tint-on-map/` puts `text.critical` on `bg.tint.critical` over `color.map.road` without the page underlay and must fail (4.04:1, M3).

### 2. Charts on glass and media (F4, F5), weights and the axis role (F17, F19, F20)

1. **The chart family follows the published material.** A chart picks its colors from the material the enclosing Surface publishes, as Text does (ADR-0022 §3.1):
   - the solid family (page, solid, raised, nested) uses today's `color.chart.*`;
   - `vivid` uses `color.chart.on-media.*`;
   - `glass` (the scheme's glass, ADR-0029) uses `color.chart.on-glass-fill.*`;
   - `glassLight`, `inverse` and `accent` hold no chart until data-viz wave 1 gives them a family.
2. **On media (F5).** `sys.color.chart.on-media.*`, in both schemes:
   - `line`: `{ref.color.neutral.0}`;
   - `reference`: `{ref.color.neutral.0}`, told apart from the line by `stroke.target`'s dash;
   - `grid`: white α 0.24.

   F5 proposed a reference at white 64 %. Over a vivid stop at V1's bound that gives 2.12:1 (M4), below the boundary tier the mandatory target line needs (ADR-0007 rule 2, ADR-0011, critic G-14). The grid is decorative and has no pair. After ADR-0029, only vivid uses this family, plus the dark scheme's glass through §2.3.

   ADR-0007 rule 2, "A target line is always `chart.target` (dashed), never a second series", now reads: a target line is always its family's target role, dashed with `stroke.target`, never a second series. That role is `color.chart.target` on the solid family, `color.chart.on-media.reference` on vivid and `color.chart.on-glass-fill.reference` on the scheme's glass.
3. **On the scheme's glass (F4).** `sys.color.chart.on-glass-fill.*`:

   | Token | Light | Dark |
   |-------|-------|------|
   | `plot` | white α 0.08 | white α 0.08 |
   | `line` | `{sys.color.text.on-glass-light}` (ink) | `{sys.color.chart.on-media.line}` |
   | `reference` | `{sys.color.chart.target}` (ink 60 %, §2.4) | `{sys.color.chart.on-media.reference}` |
   | `grid` | `{sys.color.chart.grid}` | `{sys.color.chart.on-media.grid}` |

   - The plot is no longer a white hole in the card: `color.chart.plot` stays `neutral.0` on solid, and on glass the plot is a white 8 % lift.
   - The series takes the glass foreground, as F4 proposed: ink on light glass, white on smoke. The light line aliases the light-glass foreground, not `chart.series.1`, which a brand may re-color (ADR-0020 §4).
   - Colored series on glass and vivid stay open for data-viz wave 1 (roadmap, verify list).
4. **Chart target weight (F17).** In light, `sys.color.chart.target` goes from ink 0.45 to ink 0.60 (5.07:1 on white, M9), and `sys.color.chart.comparison` stays at 0.45. In `light-increased-contrast`, `sys.color.chart.target` goes from 0.60 to 0.75 (8.83:1), so the Increase Contrast delta still strengthens the line. The existing pair `color.chart.target` on `color.chart.plot` guards both.
5. **Gauge stroke (F19).** `sys.chart.gauge-stroke-ratio` (in `sys/base`) goes from 0.1 to 0.05: a 170 px ring gets an 8.5 px stroke. F19's alternative, a hairline track with only the value arc weighted, is left to the RingGauge spec (data-viz wave 1).
6. **The axis role (F20).**
   - `ref.type.axis`: `{ref.font.ui}`, 12 px, weight 400, line height 1.2, letter spacing 0; `slot` `ui`, `numeric` `tabular`, `textStyle` `caption` (ADR-0021 §7's rule).
   - `sys.type.axis` in `sys/base` aliases it with its own `$type: typography` (ADR-0024 §6). ChartAxis binds it (data-viz wave 1).
   - `ref.type` then holds 22 roles (amends ADR-0021 and ADR-0024 §6's count of 21), and the equal-width test covers `axis` as a tabular role.
7. **Pairs.**
   - `color.chart.on-media.line` and `color.chart.on-media.reference` on `ref.gradient.vivid.*`, boundary, `stops: "all"`. White against every sample is V1, so both pass wherever V1 does. The glob names the reference gradients, so ember-night stays covered outside the slots (ADR-0029 §2.6).
   - `color.chart.on-glass-fill.line` and `.reference` on `color.chart.on-glass-fill.plot`, boundary, with the underlay `material.glass.fill`. The backdrops are the glass backdrops of ADR-0029 §1.6: #555555, `ref.gradient.vivid.*` and the map grounds in light; #283126, #5B6366, #959595, `ref.gradient.vivid.*` and the map grounds in dark. The worst case is the light reference over sky's first stop, 3.10:1, and 4.13:1 under Increase Contrast (M5).

### 3. Solids, rings and the accent on media (F6, F22, F18, F23)

1. **Inverse on media (F6).** `sys.color.bg.fill.inverse-media` is `{ref.color.neutral.0}` and `sys.color.text.on-inverse-media` is `{ref.color.neutral.950}`, in both schemes.
   - This is the white solid of visual-dna principle 9 on `vivid`. On the scheme's glass, `bg.fill.inverse` is already right: ink on light glass and white on smoke.
   - Components with a solid cell (Button `primary`, the active segment) bind `bg.fill.inverse-media` when the published material is `vivid` (spec cells keyed by material, P2-1).
   - Checks: the pair `color.text.on-inverse-media` on `color.bg.fill.inverse-media`, functional (19.30:1). The solid against every vivid sample is V1.
2. **Rings on media (F22).** `sys.color.border.on-media` is white α 0.40 in both schemes, for rings and outlines on `vivid`.
   - `sys.color.border.on-glass-fill` is `{sys.color.border.strong}` in light and `{sys.color.border.on-media}` in dark, for rings on the scheme's glass, where a white ring would vanish on light glass.
   - Both are decorative: they outline controls that a label or glyph already identifies, so they have no pair (1.64:1 over a stop at V1's bound, M4). A control identified only by its edge keeps `color.border.boundary` on solid.
   - F22's other observation, `border.strong` at ink 45 % against visual-dna's 30 %, changes nothing: `border.strong` outlines the ghost button (ADR-0029 §3.3), whose boundary pair on the page needs 3:1, and ink 45 % gives 3.03.
3. **The dark accent tint (F18).** `sys.color.bg.tint.accent` keeps its values (12 % light, 14 % dark), and its dark use narrows:
   - In dark it fills chart windows and bands only, never a card. A dark screen's attention card is the lit tile: Surface material `accent` (item 4).
   - Card's `tinted` variant is a light-scheme look (the light-airy family's lit focus sheet, visual-dna §4.8). Card.yaml (P2-1) marks it light only, its examples render only in light, and the gallery lint rejects a `tinted` Card in a dark scope.
   - F18's second option, the dark tint from `accent.400` at 12 %, still composites to a brown (#29201A).
   - A scheme-following card ground would need scheme-following tones too: standard ink on the light tint, on-accent on the dark fill. That is a second role family for one card.
4. **The lit tile's second tone (F23).** `sys.color.text.on-accent-secondary` is `{sys.color.text.on-accent}` α 0.70, in both schemes: 5.82:1 on `accent.300`, 4.78:1 on `accent.500` (M6).
   - The tone table gains a row (amends ADR-0022 §3.1): published material `accent` (Surface's new material, `color.bg.fill.accent`) → primary `text.on-accent`; secondary, tertiary and dimmed `text.on-accent-secondary`. The alpha tone is allowed here: ADR-0022 forbids alpha only on light glass, vivid and inverse, and an opaque grey on an orange fill fails, `neutral.700` on `accent.500` included.
   - Check: the pair `color.text.on-accent-secondary` on `color.bg.fill.accent`, functional, in both schemes. The token's alias follows a brand's `text-on-accent` slot.

### 4. Edges, the vivid highlight and the bloom (F8, F14), and the grain (F15)

1. **Edge colors (F8).**
   - `sys.color.edge.highlight` is `{ref.color.neutral.0}` in both schemes. It is the color of the glass edge, drawn at the recipe's `edge.start` and `edge.end` alphas (ADR-0022 §2.1), and of the vivid highlight (item 2).
   - `sys.color.edge.raised` is `{ref.color.neutral.0}` in light and `{ref.color.neutral.0}` α 0.08 in dark. It is the 1 px top edge of `raised`: the puffy chip in light, tiles and nav pills in dark.
   - ADR-0022 rejected "edges as colors" because a color would allow a hue. Components cannot bind `ref.*` (ADR-0024 §5.2), and process rule 2 forbids a raw white in implementation code, so the edge needs a `sys` color. The hue concern becomes a check: the `tokens:build` source check `color/edge-neutral` requires every `sys.color.edge.*` token to be an alias of `ref.color.neutral.0`, with or without `app.prism.alpha`, with a fixture. Amends ADR-0022 §2.6.
   - The check ties the edge to the brand's white, not to a hue-free white: `neutral.0` is brand-overridable (ADR-0020 §1). A brand that warms its white warms the edge together with `text.on-vivid` and `text.on-glass`, and no other hue can reach the edge.
   - The edge geometry (a 135° gradient from `edge.start` at 0 % to `edge.end` at 75 %) belongs to Surface.yaml (P2-1), as the bloom shape does (ADR-0022 §2.6).
2. **The vivid highlight (F8).** `sys.material.vivid.edge.start` is 0.30 in light and 0.18 in dark, and `sys.material.vivid.edge.end` is 0 in both. These are numbers under `sys.material` (colorScheme), outside `sys.material.glass`, so no recipe rule applies. Surface draws a vivid surface's 1 px inner edge in `color.edge.highlight` from start to end with the glass edge geometry. The board's on-vivid-at-32 % highlight becomes this token.
3. **The bloom (F14, F8).**
   - Every `ref.gradient.vivid.*` sets its folded `bloom.blur` to 75, from 150. The value is what both stacks pass to their blur: CSS `filter: blur()` takes a standard deviation, so 150 barely showed.
   - The dark gradients (plum-dusk, forest-moss, ember-night, navy-cyan, night-lagoon) set `bloom.alpha` to 0.45; the light ones keep 0.30.
   - The bloom's color is derived, not authored: it is the gradient's stop of highest relative luminance, the later stop on a tie. For every gradient today that is its last stop.
   - The build emits it as the derived CSS declaration `-bloom-color` beside `-bloom-alpha` and `-bloom-blur` (ARCHITECTURE §8), as `bloom.color` in TypeScript and as `DSGradientToken.bloomColor` in Swift. Surface draws the bloom as a blurred shape of that color. Its placement (10 % down, scale 0.92) goes into Surface.yaml (P2-1).
   - `ref.blur.bloom` (150 px) is referenced by nothing, since the bloom blur is a folded number, and is deleted.
   - Whether SwiftUI's `blur(radius:)` takes the same standard deviation as CSS is a P3-1 verify item: DSCore scales the value if it does not.
4. **The grain recipe (F15).** Grain is monochrome value noise: one value per 1 × 1 pt cell (one CSS px, a 2 × 2 block of device pixels at 2×).
   - The values are stretched to the full range [0, 1] and blended with `overlay` at the token's opacity: the gradient's `grain` or the recipe's `grain`.
   - Both stacks generate the same 128 × 128 tile from one 32-bit integer hash. P3-1 and P3-4 pin the algorithm and one checksum of the tile in `tools/`, and each stack's unit test compares against it.
   - Grain is not drawn under text below 13 px. On vivid all such text sits in the Card header block (ADR-0022 §4.2), so Surface leaves the grain out of V2's header block. A glass recipe with a non-zero grain (today only the light `glass.dark.fill`, 0.04) leaves it out of the content box of such text.
   - The board's recipe (fractal noise with a linear stretch) is informative.

### 5. Surfaces over imagery and the light raised surface (F9, F10)

1. **Surfaces paint the page under them (F9).** Surface fills `solid`, `raised` and `nested` with `color.bg.page` first and paints the material over it, as ADR-0022 §1.1 already does for the glass fallback. Over imagery and vivid the dark white-alpha surfaces then stay what the pairs check, which composite them over the page.
   - F9's other option, opaque twins emitted by the build, would duplicate the surface ladder as literals.
   - Checked by the Surface resolution tests (P3-1, P3-4).
2. **Light raised (F10).** In light, `sys.color.bg.surface.raised` becomes `{ref.color.neutral.50}` (#F7F8FA, opaque), from white 70 %. `raised` draws `color.edge.raised` as its top edge and `elevation.1`, in both schemes; dark `elevation.1` is no shadow.
   - The glass fallback's light composite becomes #F7F8FA (amends ADR-0022 §1.1's value), and every tone still passes on it (M8).
   - Under the glass fallback, the top edge is part of `raised` and is drawn; the edge that ADR-0022 §1.1 removes is the glass recipe's. The elevation stays the one the requesting Surface declares (ADR-0022 §1.1); `elevation.1` is `raised`'s default, not an override.
   - F10's other option, raised resolving to nested on a solid parent, would make a material depend on its parent.
   - Checked by the existing pairs on `color.bg.surface.raised`.

### 6. Status tints (F21, F31)

1. **Light tints are alpha (F21).** In light, `sys.color.bg.tint.success`, `.warning`, `.critical` and `.info` become `{ref.color.status.success.dot-light}`, `{ref.color.status.warning.dot-light}`, `{ref.color.status.danger.dot-light}` and `{ref.color.status.info.dot-light}`, each at α 0.12.
   - Over white they reproduce today's values within 0.48/255 (M7). The closed-bridge wash on a light map then shows the map through it, as the dark tints (α 0.10) already do.
   - `ref.color.status.success|warning|danger|info.tint-light` are then referenced by nothing and are deleted. Their hex values move into a `tools/contrast` unit test (`pairs.test.ts`), which composites each light tint over `neutral.0` and asserts today's value within 0.5/255.
2. **Tinted elements with text over media paint the page (F31).** An element that carries text or a glyph on a status or accent tint over media (a map, an image, vivid or glass) paints `color.bg.page` under the tint: a status pill, a badge, the danger button.
   - In dark the pair then reads 5.76:1 instead of 4.04:1 over a road (M3), and the tint keeps its hue. F31's alternative, raising dark `text.critical`, would shift the fixed status scale for one backdrop.
   - A text-free area wash, such as the closed bridge's area on the map, paints the tint alone, so the map shows through it (item 1). It carries its status stroke, and its label sits in a pill that follows this item (§1.2).
   - Checked by the existing tint pairs, whose underlays are `color.bg.page` and `color.bg.surface` (4.64:1 or more in light, M7), by the negative fixture of §1.8, and by the component specs that state it (P2-5).

### 7. Type: figures, the watch hero (F24, F25)

1. **`metric.md` is proportional (F24).** `ref.type.metric.md` sets `numeric` to `proportional`. Every metric role is then proportional by default, and `data` and `axis` are the tabular roles.
   - A live `metric.md` value sets `numeric: tabular`, as ADR-0021 §5 already requires of every live value.
   - Amends ADR-0021 §5's table. The equal-width test's negative case gains `metric.md`.
   - F24's other reading, keeping the role tabular and overriding static readouts, puts the override on the common case.
2. **The watch hero size (F25).**
   - A new `ref.type.metric.xl-watch`: `{ref.font.display}`, 40 px, weight 300, line height 1, letter spacing −0.40 px (−0.01 em, as `metric.xl`); `slot` `display`, `numeric` `proportional`, `textStyle` `largeTitle`, `darkWeight` 200.
   - `sys.type.metric.xl` leaves `sys/base` and moves to the platform files: `web.tokens.json` and `apple.tokens.json` alias `{ref.type.metric.xl}`, and a new `tokens/sys/platform/watch.tokens.json` aliases `{ref.type.metric.xl-watch}`, each with its own `$type: typography`. The resolver's `watch` context loads `[apple, watch]`.
   - `OWNERSHIP.platform` becomes `sys.font.**` and `sys.type.metric.xl` (amends ADR-0024 §9.1 and §9.5, and ADR-0022 §1.4's "the watch context carries no token delta": it carries this typography delta and still no material one).
   - `ref.type.metric.xl-watch` is the watch face of the `metric.xl` role, not a role of its own. `sys/base` declares no `sys.type.metric.xl-watch`, and the role count of §2.6 does not include it.
   - Why the platform modifier: ADR-0021 §6 keeps type out of density, and `metric.xl` already varies with the scheme, so a density-owned size would give it two runtime axes (ARCHITECTURE §5.7 rule 2). The platform is a build scope, not a runtime axis, and ARCHITECTURE §5.7 item 5 lets apple and watch differ in non-color tokens.
   - The thin weight stays at 40 px (M11). Text.yaml's note "metric-xl renders at 40 px on watchOS" becomes the token and leaves the spec (P2-1). Its other watch note, display and title roles collapsing on the watch, is not part of F25 and stays a spec note until an ADR moves it.
   - Checks: the ownership check and the composition proof (`tokens:build`), `type/thin-weight` (40 ≥ 34), and the generated Swift expectation for the watch context.

### 8. The unit on vivid, and V3 (F16)

F16 proposed a check V3: the hero block of a vivid Card, hero plus hung unit, reaches 4.5:1 at every V2 geometry. It is not adopted as a gradient gate.

- Today six of the nine gradients reach 3.33–3.73:1 there (M10). Passing needs every gradient at about OKLCH L 0.57 or darker over the lower-left of the card, up to t ≈ 0.8–0.9, and then a jump to the light end.
- That is the hard horizon F12 removes from navy-cyan, and the opposite of D2's brighter light set (ADR-0029 §2). The owner's decision outranks the proposal.

**V3 is the rule instead: on a vivid surface, the hero block holds only the hero value (24 px or more, which V1 covers at 3.0:1), and the metric unit joins the caption line in the header block, which V2 covers at 4.5:1.**

- This is F16's interim rule made permanent. ADR-0022 §4.2 already implies it.
- Checked by `spec:validate` on Card's vivid examples (P2-1: a vivid example with a hero unit renders it in the caption) and by the gallery lint.

### 9. Hit sizes in a gallery (F28, documented only)

`size.hit` follows modality, and `data-ds-modality` is read on `<html>` only (ADR-0019 §1). A board or gallery page therefore cannot show touch hit sizes beside pointer frames. Prism adds no nested override.

- The gallery (P3-5) renders touch and pointer frames in separate documents (iframes), each with its own root attributes.
- The direction board documents the limitation, as it does now.

### 10. Tokens, owners and checks

| Token | Value | Owner | Check |
|-------|-------|-------|-------|
| `sys.color.map.land\|block\|building\|road\|road-casing\|water\|park\|label\|route\|route-ahead\|route-casing` (new) | §1.1 | colorScheme | `map/backdrop-limit`, the map pairs, the glass pairs over the grounds |
| `ref.color.map.light\|dark.water\|park` (new) | §1.2 | ref set, system-owned | the map pairs through the grounds |
| `sys.color.chart.on-media.line\|reference\|grid` (new) | white 1 / 1 / 0.24 | colorScheme | pairs on `ref.gradient.vivid.*` with `stops: "all"` |
| `sys.color.chart.on-glass-fill.plot\|line\|reference\|grid` (new) | §2.3 | colorScheme | pairs on the plot over the glass backdrops, vivid included |
| `sys.color.chart.target` (light 0.45 → 0.60; light-increased-contrast 0.60 → 0.75) | §2.4 | colorScheme | the existing `color.chart.target` pair |
| `sys.chart.gauge-stroke-ratio` (0.1 → 0.05) | §2.5 | set (`sys/base`) | the generated value tests |
| `ref.type.axis`, `sys.type.axis` (new) | §2.6 | ref set; set (`sys/base`) | `type/*` diagnostics, the equal-width test |
| `sys.color.bg.fill.inverse-media`, `sys.color.text.on-inverse-media` (new) | `neutral.0`, `neutral.950` | colorScheme | pair; V1 |
| `sys.color.border.on-media` (new) | white 0.40 | colorScheme | none (decorative) |
| `sys.color.border.on-glass-fill` (new) | §3.2 | colorScheme | none (decorative) |
| `sys.color.text.on-accent-secondary` (new) | on-accent α 0.70 | colorScheme | pair on `bg.fill.accent` |
| `sys.color.edge.highlight`, `sys.color.edge.raised` (new) | §4.1 | colorScheme | `color/edge-neutral` |
| `sys.material.vivid.edge.start\|end` (new) | 0.30 / 0.18, 0 | colorScheme | the generated value tests |
| `ref.gradient.vivid.*` `bloom` (blur 75; dark alpha 0.45) and the derived bloom color | §4.3 | ref set (brand-overridable) | the build tests; P3-1 verify item |
| `ref.blur.bloom` (deleted) | — | — | `tokens:diff` |
| `sys.color.bg.surface.raised` (light → `neutral.50`) | §5.2 | colorScheme | the existing pairs |
| `sys.color.bg.tint.success\|warning\|critical\|info` (light → dot α 0.12) | §6.1 | colorScheme | the tint pairs; the composite unit test in `pairs.test.ts` |
| `ref.color.status.*.tint-light` (deleted) | — | — | `tokens:diff` |
| `ref.type.metric.md` (`numeric: proportional`) | §7.1 | ref set | `type/role-metadata`, the equal-width tests |
| `ref.type.metric.xl-watch` (new); `sys.type.metric.xl` (moved to the platform files) | §7.2 | ref set; platform | ownership, `type/thin-weight`, the Swift expectation |

## Alternatives considered

- **F30 as a board-local palette, no tokens.** Every app and board would mix its own map, and no check could relate the glass limits to the ground they sit on.
- **Map hues as aliases of the chart series or status colors.** A brand's series would re-color its parks, and a retune of a status color would move the map. The values start equal (M12); the separate ids keep them apart from here on.
- **A water hue away from the info hue.** At the map's alphas it gains ΔE(OK) 0.003–0.008 against the info tint and loses up to 0.017 against park (M12). The status stroke and pill separate status from water; hue cannot.
- **F5's reference at 64 %.** It fails the boundary tier over the lightest permitted vivid stop (M4).
- **One "on media" chart family for vivid and glass (F5 as written).** After ADR-0029, light glass carries ink while vivid carries white, so one family cannot serve both in the light scheme.
- **An edge color without the neutral check.** It would reopen ADR-0022's hue concern. With the check, the concern is enforced instead of avoided.
- **Authored bloom colors.** A brand that retunes a gradient would have to retune a second color by hand; the brightest stop is a function of the stops.
- **Keeping `bloom.blur` at 150 and halving it at emission (F14's first option).** A token whose value no stack uses as written misleads readers and brands.
- **V3 as a 4.5:1 gradient gate (F16).** See §8.
- **A density-owned watch hero size.** It gives `metric.xl` two runtime axes, which ARCHITECTURE §5.7 rule 2 forbids, and ADR-0021 §6 keeps type out of density.
- **A `type.metric.watch` role that watch screens bind.** Components would pick a role by platform, which ADR-0010 rule 1 forbids.
- **A nested modality override for galleries (F28's first option).** It would open a root-only axis to every page to serve one gallery.

## Consequences

- **The board's untokenized values shrink** to geometry: the map strokes, the edge and bloom geometry, and the critical status border at 50 %, which the StatusPill spec owns. Colors and alphas all come from tokens.
- **New checks.**
  - `contrast:check` gains token backdrops, the map pairs and `map/backdrop-limit`, the chart and solid pairs, and the negative tint fixture.
  - `tokens:build` gains `color/edge-neutral`.
  - The CSS, TypeScript and Swift gradient renderers gain the bloom color.
- **Removals** (`ref.blur.bloom`, `ref.color.status.*.tint-light`) and the move of `sys.type.metric.xl` into the platform files ride in P1-9's minor changeset (ADR-0024 §14).
- **Vocabulary.** `tokens/README.md` gains the `sys.color` segments `block`, `building`, `edge`, `highlight`, `inverse-media`, `label`, `land`, `line`, `map`, `on-accent-secondary`, `on-inverse-media`, `on-media`, `park`, `reference`, `road`, `road-casing`, `route`, `route-ahead`, `route-casing` and `water` (ADR-0024 §13.4), and its ownership table gains `sys.type.metric.xl` under platform.
- **Specs** (P2-1 and later):
  - Surface gains the material `accent` and publishes its backdrop kind; Surface.yaml gets the page-under rule, the raised edge, the vivid edge and bloom geometry, and the grain mask.
  - Card: the unit on vivid in the caption, and `tinted` light only. Text.yaml loses its watch metric note.
  - Button and the segmented controls get their `vivid` cells for `inverse-media`. Button's ghost outline gets a `vivid` cell for `border.on-media` and a `glass` cell for `border.on-glass-fill`, since its usage puts the ghost inside cards over vivid or glass.
  - The data-viz wave binds `type.axis`, `chart.on-media.*` and `chart.on-glass-fill.*`.
- **Documents that follow this decision:**
  - `docs/decisions.md` rows 21, 22 and 24, the `docs/adr/README.md` index, and the Status lines of ADR-0007, ADR-0021, ADR-0022 and ADR-0024;
  - `tools/tokens/ARCHITECTURE.md` (§8 derived suffixes, §9.7 `DSGradientToken`, §10 backdrops, §14);
  - `tokens/README.md`, `agent/SKILL.md`, and notes in `docs/research/visual-dna.md` (§3.5 bloom, §3.6 tints and raised, §4.11 status over the map).

## Rules that follow

1. **The map is styled only by `sys.color.map.*`.** In dark every ground is at OKLCH L 0.35 or darker, and in light at 0.45 or lighter.
   - Checked by `map/backdrop-limit` in `contrast:check`, for every brand × colorScheme context.
2. **Text and marks over the map pass over every ground.** Labels on the grounds are functional; the route lines on their casing and the chart marks on the glass plot are boundary.
   - Checked by the pairs of §1.6 and §2.7 with token backdrops.
3. **A chart picks its family from the published material:** solid → `chart.*`, `vivid` → `chart.on-media.*`, `glass` → `chart.on-glass-fill.*`; `glassLight`, `inverse` and `accent` hold no chart.
   - Checked by the chart component tests of data-viz wave 1.
4. **Every `sys.color.edge.*` is the brand's `neutral.0`, with or without alpha.**
   - Checked by `color/edge-neutral`.
5. **The bloom color is the brightest stop, and the bloom blur is the value both stacks pass to their blur.**
   - Checked by the gradient renderer tests (P1-9) and the P3-1 verify item.
6. **Surface paints `color.bg.page` under `solid`, `raised` and `nested`, and a tinted element that carries text or a glyph over media paints it under its tint. A text-free area wash does not.**
   - Checked by the Surface tests (P3-1, P3-4), the tint pairs and the negative fixture.
7. **On vivid, text below 24 px sits only in the header block: the metric unit joins the caption (V3).**
   - Checked by `spec:validate` on Card's vivid examples (P2-1). The gallery lint (critic G-18, not yet ticketed) extends the check to gallery screens.
8. **The watch hero is `sys.type.metric.xl` in the `watch` platform context (40 px), and only the platform modifier writes that id.**
   - Checked by the ownership check, `type/thin-weight` and the generated Swift expectation for the watch context (`GeneratedTokenTests.swift`).
9. **The grain tile is the same on both stacks, and grain is not drawn under text below 13 px.**
   - Checked by the tile checksum tests (P3-1, P3-4) and snapshots.
10. **In dark, `bg.tint.accent` fills chart windows and bands, never a card, and `tinted` Cards render in light only.**
    - Checked by `spec:validate` on Card.yaml (P2-1: the `tinted` examples declare light only). The gallery lint (critic G-18, not yet ticketed) extends the check to dark scopes in gallery screens.
