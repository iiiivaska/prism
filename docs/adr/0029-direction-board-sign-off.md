# ADR-0029: Direction board sign-off (2026-09-15)

- Status: accepted (§1.5's third bullet amended by [ADR-0036](0036-glass-chip-and-backdrop.md): a component draws its glass chip through the Surface module's chip shape, and on the scheme's glass without blur or saturation)
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #29
- Amends: ADR-0010 (the density bullet: a fourth density, `watch`, is the watchOS default and `comfortable` stays an accessibility choice), ADR-0019 (§1's density values, fallback selectors and permutation count; §2's watchOS default density; §3's `WEB_RUNTIME` excerpt; rule 12's watchOS `platformDefault`), ADR-0020 (§1: the vivid gradient row lists nine ids, and every gradient restates `temperature`; §3: a role recipe's `$root` may alias a `sys.material.glass` appearance `$root`), ADR-0022 (§2.1: two role recipes, `fill` and `chip`, join the five appearance recipes; §3.1: the `glass` row of the tone table and the chips and cells bullet; §3.3: the backdrop sets and usage limits of the scheme's glass; §4.1 and rule 7: sixteen V2 geometries; §4.5: nine gradients; rules 4 and 5), ADR-0024 (§4.1: `temperature` joins the folded gradient keys; §6: the slot order and the pairing rule of the vivid slots; §9.5 and rule 10: 576 permutations)

## Context

Gate P3-0 (ADR-0017, roadmap P3-0) puts Prism's reference brand on three screens of an invented product, built only from the generated web tokens, and asks the owner to sign it off before any component is implemented twice. The board is `docs/direction-board/`. Its README lists the sign-off checklist and 31 token findings, F1–F31, each with the tokens involved and a proposed change.

The owner reviewed the board on 2026-09-15 and decided four things:

- **D1. Glass follows the scheme (F1, F3, F7).** In light, Card glass and other glass over maps and imagery is light glass (`material.glass.light.fill`) with the light-glass foreground: ink tones, including a secondary and a dimmed tone (F7). In dark it is smoked glass, with `text.on-glass` at 100 / 78 / 64 % (sign-off item 2.1). The smoke fills lose their green-yellow hue. The scrim follows F2: 0.45 in light, or no scrim over maps once D1 lands. The agents decide which, and record it.
- **D2. Vivid is brighter, and each 2×2 is one temperature (F11, F12, F13).** The light set spends its contrast budget on chroma (sky, rose, olive) and keeps ADR-0022 V1 and V2 and every ADR-0011 text pair. Ember-night leaves the 2×2 slots, dark slot 3 gets a cool gradient (a new reference gradient if none fits), and each 2×2 is one temperature, either as a quartet or by the diagonal rule the board used. The agents decide which. Navy-cyan loses its hard horizon (F12).
- **D3. Density and components.** The desktop page margin in compact goes from 16 to 24 (F26). The ghost button is outlined, with a transparent fill at rest (F29). The watch is more compact: card padding 16 and a large control of 44 (F27), through a mechanism that respects ADR-0024's ownership. The agents choose the mechanism and record it. The thin dark metric weight (200) stays: the owner did not ask to change it.
- **D4. The ride report is reworked.** The board's desktop "Ride report" no longer reuses the inventory and composition of reference shot 27220417 (sign-off item 6.1, ADR-0015).

The other findings go in by their proposals unless the evidence says otherwise; ADR-0030 records them. This ADR records D1–D4 as token decisions.

### What the tokens say today (working tree, 2026-09-15)

- **Card glass is smoked in both schemes.** `comp.card.glass.fill` aliases `{sys.material.glass.dark.fill.$root}` (`tokens/comp/card.tokens.json:80`). In light that recipe is `ref.color.smoke.light` at 0.55. Over the board's daylight map it composites to #6A6C6B–#787977, where `text.on-glass-secondary` reaches 3.35–3.96:1 (F1). The map breaks ADR-0022 §3.3's limit for dark glass (white must hold 3.0:1 on the backdrop, OKLCH L ≤ 0.67), because the light map sits at L 0.88–1.0.
- **The smoke has a hue.** `ref.color.smoke.light` is `oklch(0.1504 0.0092 128.7)` and `ref.color.smoke.dark` `oklch(0.1853 0.0102 145.1)` (`tokens/ref/color.palette.tokens.json:732`), green-yellow. The neutral ramp sits at hue 261.6–271.4 with chroma 0.0029–0.0191, and 0.0062–0.0085 on its steps 900 to 1000 (F3).
- **Light glass has one foreground.** ADR-0022 §3.1 maps `glassLight` to `text.on-glass-light` for every tone.
- **The scrim.** `sys.material.glass.scrim` is black at 0.35 in light and 0.40 in dark (`tokens/sys/color/light.tokens.json:1573`).
- **The vivid set.** The light gradients reach V1 at 3.05:1, the cap P1-1 tuned them to; sky's chroma is 0.072 / 0.097 / 0.044 (F13). Navy-cyan's lightness climbs 0.96 per unit of t between its 45 % and 75 % stops, against 0.043 before (F12). The slots are light sky, olive, rose, orchid and dark plum-dusk, forest-moss, ember-night, navy-cyan (ADR-0024 §6), so each quartet mixes temperatures, and ember-night's end stop sits ΔE(OK) 0.078 from `accent.500` (F11).
- **Density.** Compact `sys.space.page-margin` is 16 (`tokens/sys/density/compact.tokens.json:86`). watchOS starts in `comfortable` (ADR-0019 §2; `tools/tokens/config.ts:321`): card padding 24 and controls 44 / 48 / 52 on a 198 × 242 face (F27).
- **Ghost button.** `comp.button.ghost.bg.rest` aliases `{sys.color.bg.fill.neutral.subtle}` (`tokens/comp/button.tokens.json:115`), so the ghost pill reads as filled (F29).

### Facts verified for this ADR (2026-09-15)

The probes ran in the session scratch directory, outside the repository. They use the repository's own functions: Color.js 0.5.2 through `irColor` (`tools/tokens/api.ts`), and the V1 and V2 sampling of `tools/contrast/gradient.ts` (every stop plus 100 samples per segment, in gamma-encoded sRGB and in OKLab, at the twelve V2 geometries and the four the `watch` density adds, which change no minimum). Contrast is WCAG 2.x luminance with source-over compositing in gamma-encoded sRGB (ARCHITECTURE §10).

| # | Fact | Evidence |
|---|------|----------|
| S1 | Smoke at hue 265 and chroma 0.0070, same L: `ref.color.smoke.light` #0A0B0E (luminance 0.0035 → 0.0034), `ref.color.smoke.dark` #111316 (0.0065 → 0.0064). White, white 78 % and white 64 % on `glass.dark.fill` over #959595 give 8.98 / 6.24 / 4.81 in light and 9.32 / 6.44 / 4.94 in dark, within 0.02 of ADR-0022 F15's values for today's smoke. The primary foreground on chips and cells over #959595 gives 5.85 (light) and 5.62 (dark). | probe |
| S2 | White over the black scrim composited on pure white: 2.44 at 0.35, 2.85 at 0.40, 3.04 at 0.42, 3.35 at 0.45 (composite OKLCH L 0.641). Over `neutral.100`: 2.70 at 0.35 and 3.68 at 0.45. | probe |
| S3 | Light-scheme light glass (white 30 %) over a neutral backdrop: ink reaches 4.5:1 from backdrop L 0.378, `neutral.600` from L 0.840 and `neutral.500` reaches 3.0:1 from L 0.887. Over #555555 (L 0.45, ADR-0022's limit): ink 5.44, `neutral.600` 1.78, `neutral.500` 1.07. | probe |
| S4 | Over the map set of ADR-0030 §1 (light areas at L 0.897–1.0): ink ≥ 15.36 on the light chip, `neutral.600` ≥ 5.10 and `neutral.500` ≥ 3.07 on the light fill. Over the dark map set (L 0.16–0.30), on the smoked fill at 0.60: white ≥ 16.80, white 78 % ≥ 10.60, white 64 % ≥ 7.55. | probe |
| S5 | Gradients before and after §2 (V1 and V2 minimum against white; max dL/dt in OKLab): sky 3.05 / 5.01 → 3.11 / 5.05; rose 3.05 / 4.55 → 3.09 / 4.61; olive 3.05 / 4.55 → 3.08 / 4.55; navy-cyan 3.05 / 9.05, dL/dt 0.96 → 3.05 / 7.46, 0.52; night-lagoon (new) 3.48 / 9.53, dL/dt 0.57. Ink on the light fill and chip over every sampled point of the light set stays ≥ 5.16 and ≥ 4.57 (sky's unchanged dark end sets both). In the light scheme, white 64 % on the smoked fill over every light sample stays ≥ 4.84 (orchid, unchanged) and white on the smoked chip ≥ 5.93. White 64 % on the smoked dark fill over every dark stop stays ≥ 4.97, and white on the dark chip ≥ 5.71. | probe |
| S6 | Navy-cyan variants: F12's "75 % stop to 88 %" leaves dL/dt 0.67 with the knee at 45 % (0.043 → 0.67); F12's "extra stop at 60 %, L 0.45" raises it to 1.05; moving the 45 % stop to 30 % and the 75 % stop to 85 %, colors unchanged, gives 0.52 with the knee at 30 % (0.065 → 0.52) and V2 7.46. | probe |
| S7 | Night-lagoon's end stop lies ΔE(OK) 0.065 from navy-cyan's end, 0.123 from forest-moss's, 0.141 from plum-dusk's and 0.257 from `accent.500`; ember-night's end lies 0.078 from `accent.500`. Mean OKLab b over the samples (informative): sky −0.102, orchid −0.046, rose +0.057, olive +0.083, plum-dusk −0.061, navy-cyan −0.035, night-lagoon −0.025, forest-moss +0.030, ember-night +0.084. | probe |
| S8 | V2's header block runs from p to W − p − a − 16 across and from p to p + 64 down. At (p, a) = (16, 40), the `watch` density of §3.2, it is contained in the compact block at (16, 32), so its minimum can only be higher than compact's. | geometry of ADR-0022 §4.1 |
| S9 | 2 brands × 3 platforms × 6 colorScheme × 4 density × 2 modality × 2 motion contexts = 576 permutations, below Terrazzo's default `permutationLimit` of 1000 (ADR-0024 T3). | arithmetic |
| S10 | A glob of public paths such as `gradient.vivid.*` resolves to the `sys` ids first (`sys.gradient.vivid.default\|1…4`), so today's vivid pairs reach a reference gradient only through a slot. `contrast:check` fails when a `ref.gradient.vivid.*` gradient of a brand is reached by no V1 or no V2 pair (`gradientCoverageProblems`); no such check covers glass pairs over vivid. | `tools/tokens/ir/lookup.ts` (prefix order), `tools/contrast/pairs.ts` |
| S11 | Nothing binds `material.glass.cell` today: Surface.yaml binds `glass.dark.fill` and `glass.light.fill`, and the status cell is visual-dna §4.14's, for a tier-2 Heatmap without a spec. | `spec/components/*.yaml`, visual-dna §4.14 |

## Decision

### 1. Glass follows the scheme (D1: F1, F2, F3, F7)

1. **Neutral smoke (F3).** Both smoke tints keep their lightness and move to the neutral ramp's hue, with the ramp's dark-step chroma:
   - `ref.color.smoke.light`: `oklch(0.1504 0.0070 265)`, hex #0A0B0E;
   - `ref.color.smoke.dark`: `oklch(0.1853 0.0070 265)`, hex #111316.

   Luminance moves by 0.0001, so every smoked-glass pair keeps its value (S1). The fills stay system-owned `ref` tokens (ADR-0020 §3).
2. **The scheme's glass is a role recipe.** Two recipes join ADR-0022 §2.1's five appearance recipes (`dark.fill`, `dark.chip`, `light.fill`, `light.chip`, `cell`). They are declared in both base scheme files and owned by `colorScheme`. Each field is a whole-value alias of the same field of one appearance recipe of that scheme:

   | Role recipe | Light file aliases | Dark file aliases | Used for |
   |-------------|--------------------|-------------------|----------|
   | `sys.material.glass.fill` (`$root`, `blur`, `saturate`, `edge.start`, `edge.end`, `grain`, `bloom`) | `sys.material.glass.light.fill.*` | `sys.material.glass.dark.fill.*` | Surface `glass`: cards, panels and sheets over maps, imagery and vivid |
   | `sys.material.glass.chip` (the same seven fields) | `sys.material.glass.light.chip.*` | `sys.material.glass.dark.chip.*` | controls, chips and status cells over media |

   - A reference writes `{sys.material.glass.light.fill.$root}`, `{sys.material.glass.light.fill.blur}` and so on. The appearance recipes keep their values and stay checked. Nothing binds `glass.dark.*` in light after this change, but the recipes stay available.
   - **Cells.** D1 covers all glass over maps and imagery, and a status cell is glass over a render (visual-dna §4.14). A status cell over media therefore binds `material.glass.chip`: light chip with ink in light, smoked chip in dark. Like a chip, it carries only the primary foreground. `material.glass.cell` stays an appearance recipe with its pairs, and nothing binds it today (S11).
   - Amends ADR-0020 §3: a `$root` of a role recipe may be a whole-value alias of a `sys.material.glass.*.$root` token, without `app.prism.alpha`. `SYS_COLOR_ALIAS_TARGETS` in `tools/tokens/config.ts` gains `sys.material.glass.**`.
   - Amends ADR-0022 rule 4: a role recipe holds the same seven typed fields, and all seven alias the same appearance recipe of the same scheme (`light.*` in the light file, `dark.*` in the dark file). A `blur` that aliases an appearance `blur` counts as an alias of `ref.blur.*`. The check is the new `tokens:build` diagnostic `material/role-recipe`, with a fixture.
3. **The foreground of the scheme's glass (F7).** Six text tokens follow the scheme, owned by `colorScheme`, in both base files. The first four serve glass over Prism's map, the two `-media` tones glass over imagery and vivid (item 4):

   | Token | Light | Dark | Tier |
   |-------|-------|------|------|
   | `sys.color.text.on-glass-fill` | `{sys.color.text.on-glass-light}` (ink) | `{sys.color.text.on-glass}` (white) | functional |
   | `sys.color.text.on-glass-fill-secondary` | `{sys.color.text.secondary}` (`neutral.600`) | `{sys.color.text.on-glass-secondary}` (white 78 %) | functional |
   | `sys.color.text.on-glass-fill-tertiary` | `{sys.color.text.tertiary}` (`neutral.600`) | `{sys.color.text.on-glass-tertiary}` (white 64 %) | functional |
   | `sys.color.text.on-glass-fill-dimmed` | `{sys.color.text.dimmed}` (`neutral.500`) | `{sys.color.text.on-glass-tertiary}` (white 64 %) | 3:1 at 24 px or more in light; functional in dark |
   | `sys.color.text.on-glass-fill-media-secondary` | `{sys.color.text.on-glass-light}` (ink) | `{sys.color.text.on-glass-secondary}` (white 78 %) | functional |
   | `sys.color.text.on-glass-fill-media-tertiary` | `{sys.color.text.on-glass-light}` (ink) | `{sys.color.text.on-glass-tertiary}` (white 64 %) | functional |

   - The light tones are opaque, so ADR-0022's "never dimmed with alpha" on light glass still holds. The tone of a tertiary caption stays functional (12 px), and only the dimmed tone (trailing digits and units of 24 px or more) uses the large tier, as on solid.
   - Each token declares `a11y.pairsWith` for the pairs of item 6, and ADR-0026's `figma` metadata, as do the role recipes of item 2.
4. **Tones follow the backdrop kind (amends ADR-0022 §3.1).** The `glass` row of the tone table becomes:

   | Published material | Backdrop | `primary` | `secondary` | `tertiary` | `dimmed` |
   |--------------------|----------|-----------|-------------|------------|----------|
   | `glass` (the scheme's glass) | `map` | `text.on-glass-fill` | `text.on-glass-fill-secondary` | `text.on-glass-fill-tertiary` | `text.on-glass-fill-dimmed` |
   | `glass` | `image`, `vivid` | `text.on-glass-fill` | `text.on-glass-fill-media-secondary` | `text.on-glass-fill-media-tertiary` | `text.on-glass-fill-media-tertiary` |

   - **Why the backdrop kind.** The quieter tones on light glass hold only over backdrops at OKLCH L 0.84 or lighter, and the dimmed tone only from L 0.89 (S3). Prism knows the luminance of its own map (ADR-0030 §1 checks the map set, S4), but not of an image or of the vivid under the glass. So Surface publishes its backdrop kind with the material.
   - **Over `image` and `vivid`** the `-media` tones apply. In light they are ink, the primary tone, as on vivid itself (ADR-0022 §4.2). In dark they are white 78 % and 64 %, which pass over every backdrop dark glass may meet (S1, S5), so smoked glass keeps the 100 / 78 / 64 % of sign-off item 2.1 on every backdrop.
   - **Neither stack reads the scheme.** The mapping depends only on the backdrop kind, and the tokens carry the scheme difference.
   - **Where this narrows D1.** D1 and F7 ask for the quieter tones on light glass over imagery too. The evidence says otherwise: over #555555, which ADR-0022 permits for light glass, `neutral.600` reaches 1.78:1 (S3). In light, the quieter tones therefore apply over Prism's map only, which is where the board showed them.
   - **`glassLight` keeps its single tone.** F7 proposed the quieter tones for `glassLight`. They go to the scheme's glass instead, which is what Card glass renders in light. In dark, `glassLight` carries white on a white fill, where alpha tones fail (white 78 % reaches 3.85:1 at L 0.35, ADR-0022 F8).
   - Rows `glassLight`, `vivid`, `inverse` and the solid family are unchanged; ADR-0030 §3 adds `accent`. Chips and status cells drawn on `material.glass.chip` use `text.on-glass-fill` only, as ADR-0022 §3.1 already requires for chips and cells.
5. **Bindings.**
   - `comp.card.glass.fill` → `{sys.material.glass.fill.$root}`; `comp.card.glass.text` → `{sys.color.text.on-glass-fill}`.
   - Surface's `glass` material binds `material.glass.fill` and draws its fields; `glassLight` keeps `material.glass.light.fill` (the spec migration of P2-1).
   - A component that draws a glass chip, control or status cell over media binds `material.glass.chip` (Phase 4 components, the board's map controls, item 2's cells).
6. **Backdrop sets and usage limits (amends ADR-0022 §3.3).** `tools/contrast` checks the scheme's glass with these pairs:

   | Pair | Schemes | Backdrops |
   |------|---------|-----------|
   | `text.on-glass-fill` on `material.glass.fill` | light | #555555, `ref.gradient.vivid.*`, the map grounds |
   | `text.on-glass-fill-media-secondary` and `-media-tertiary` on `material.glass.fill` | light | #555555, `ref.gradient.vivid.*` |
   | `text.on-glass-fill-secondary` and `-tertiary` (functional), `-dimmed` (3:1, `minSizePx` 24) on `material.glass.fill` | light | the map grounds |
   | `text.on-glass-fill`, `-secondary`, `-tertiary`, `-dimmed`, `-media-secondary` and `-media-tertiary` (all functional) on `material.glass.fill` | dark | #283126, #5B6366, #959595, `ref.gradient.vivid.*`, the map grounds |
   | `text.on-glass-fill` on `material.glass.chip` | light, dark | that scheme's backdrops for `text.on-glass-fill` above |

   - The map grounds are the seven ground tokens of ADR-0030 §1, each composited over `color.map.land`; the pairs grammar gains token backdrops for them.
   - Vivid backdrops name `ref.gradient.vivid.*`, so that a gradient outside the slots stays checked (§2.6, S10).

   Surface.yaml states the usage limits, which remain the app's job (ADR-0022 §3.3):
   - In light, the scheme's glass sits over Prism's map, over vivid, and over imagery at OKLCH L 0.45 or lighter, where every tone is ink.
   - In dark, it sits over Prism's map and over imagery at L 0.67 or darker (unchanged).
   - **Photographs in light.** F1 proposed to keep smoked glass for photographs. A dark photograph in the light scheme is instead a dark scope: the app sets `data-ds-color-scheme="dark"` on the region, or `.environment(\.colorScheme, .dark)` on Apple (ADR-0019 §1), and the scheme's glass there is smoked with white tones. That needs no per-backdrop material and no scheme read in a component.
7. **The scrim (F2).** `sys.material.glass.scrim` becomes black at 0.45 in both base schemes (light 0.35 → 0.45, dark 0.40 → 0.45).
   - At 0.45, white holds 3.0:1 over the scrim on any backdrop, pure white included (3.35, S2). The dark value moves with the light one because the dark scrim is also the "text scrim over bright photos" of its own description, and at 0.40 it gives 2.85 over white. Any image under the scrim then meets the dark-glass limit of ADR-0022 §3.3 (composite L ≤ 0.641).
   - **Maps need no scrim.** With item 2, the scheme's glass over Prism's map carries ink in light and white on smoke in dark, and item 6 checks it over the map set without a scrim.
   - The check is a new pair: `text.on-glass` on `material.glass.scrim` over #FFFFFF, functional with `minSizePx` 24, in both schemes.
8. **What does not change.** The glass fallback (ADR-0022 §1), the appearance recipes' values, `glassLight` and its single tone, chips and cells using their primary foreground only, and V1 and V2 all stay as they are. Under the fallback, the scheme's glass renders `raised` with the standard tones, as any glass does.

### 2. Vivid is brighter, and each 2×2 is one temperature (D2: F11, F12, F13)

1. **Light set chroma (F13).** Angles, grain, positions and the other stops stay:

   | Gradient | Stop | Today | New |
   |----------|------|-------|-----|
   | `ref.gradient.vivid.sky` | 0.5 | `oklch(0.5366 0.0966 267.6)` #556BA6 | `oklch(0.5366 0.12 267.6)` #4F69B3 |
   | | 1 | `oklch(0.6632 0.0435 241.3)` #7C97AC | `oklch(0.655 0.12 235)` #349BCF |
   | `ref.gradient.vivid.rose` | 0 | `oklch(0.5237 0.0697 25.7)` #8E5A55 | `oklch(0.49 0.09 22)` #8C4A49 |
   | | 0.65 | `oklch(0.5749 0.0806 25.4)` #A36660 | `oklch(0.575 0.11 32)` #B05E4E |
   | | 1 | `oklch(0.6714 0.0714 44.6)` #BB8871 | `oklch(0.67 0.10 52)` #C6835A |
   | `ref.gradient.vivid.olive` | 1 | `oklch(0.6584 0.1108 119.7)` #899B49 | `oklch(0.655 0.13 119.7)` #879C34 |

   - These are F13's values, with sky's and olive's end lightness lowered by up to 0.008 and rose's start and middle by 0.01 and 0.005. That leaves V1 and V2 margins of at least 0.05 (S5). Orchid is unchanged.
   - Every ink-on-light-glass pair and every smoked-glass pair over the light stops still passes (S5). The hex values are authored with `tokens:normalize`.
2. **Navy-cyan's horizon (F12).** `ref.gradient.vivid.navy-cyan` keeps its four stop colors and moves two positions: the second stop from 0.45 to 0.30 and the third from 0.75 to 0.85. The steepest lightness climb falls from 0.96 to 0.52 per unit of t, and the knee flattens (S6). F12's own options leave 0.67 (the 88 % move) or raise it to 1.05 (an extra stop at 60 %).
3. **A new cool dark gradient.** `ref.gradient.vivid.night-lagoon`, a deep night-blue that rises into lagoon teal:
   - stops `oklch(0.20 0.028 240)` #091821 @ 0, `oklch(0.29 0.045 225)` #0D303C @ 0.35, `oklch(0.46 0.075 200)` #0C6468 @ 0.72, `oklch(0.62 0.095 188)` #2E9891 @ 1;
   - `app.prism` `angle` 160, `grain` 0.08, `scheme` `dark`, `bloom` per ADR-0030 §4.3, `temperature` `cool`;
   - V1 3.48, V2 9.53, and every smoked-glass pair over its stops passes (S5). Its end stays at least ΔE(OK) 0.065 from every other dark end and 0.257 from `accent.500` (S7).

   No existing gradient fits: without ember-night the dark set holds three gradients, and a slot pair needs a fourth.
4. **Temperature is declared.** Every `ref.gradient.vivid.*` carries `$extensions["app.prism"].temperature`, `warm` or `cool`:
   - cool: sky, orchid, plum-dusk, navy-cyan, night-lagoon and forest-moss;
   - warm: rose, olive and ember-night.

   - It is a folded gradient key, like `scheme`: it flows through the `sys.gradient.*` aliases and never appears on an alias. Amends ADR-0024 §4.1; `FOLDED_KEYS`, `EXTENSION_KEY_TYPES` and the `app.prism` schema gain it.
   - A brand that overrides a gradient restates it with the rest of the token (amends ADR-0020 §1).
   - The value is a design judgment that the owner reviews on the direction board. No hue formula decides it: OKLab b puts forest-moss at +0.030 and night-lagoon at −0.025, both near neutral (S7), while the board reads forest-moss as cool.
5. **Slots and the 2×2 rule (amends ADR-0024 §6).** The four slots form two pairs, and each pair is one temperature and adjacent in hue:

   | Slot | Light | Dark |
   |------|-------|------|
   | `sys.gradient.vivid.default` | sky | plum-dusk |
   | `1` | sky | plum-dusk |
   | `2` | orchid (was olive) | navy-cyan (was forest-moss) |
   | `3` | rose | night-lagoon (was ember-night) |
   | `4` | olive (was orchid) | forest-moss (was navy-cyan) |

   - **The rule.** A vivid 2×2 alternates one pair on its diagonals: slot 1 on the leading diagonal (top-leading and bottom-trailing tiles) and slot 2 on the other, or slots 3 and 4 likewise. Two vivid cards side by side use one pair. So every 2×2 is one temperature, with two gradients.
   - A quartet of four same-temperature gradients per scheme was the other option (D2). The light set holds two cool and two warm gradients, so it would need two new light gradients. The dark quartet happens to be all cool.
   - Slot 4 keeps one hue family across the schemes (olive and forest-moss). `default` is unchanged (ADR-0022 §4.4).
   - The board's pairing (light 1 + 4, dark 1 + 2) becomes slots 1 + 2 in both schemes. Plum-dusk now pairs with navy-cyan, its neighbor in hue, instead of forest-moss.
   - Three of the four pairs are new to the owner: rose + olive, plum-dusk + navy-cyan and night-lagoon + forest-moss. The re-rendered board shows both pairs of each scheme as a 2×2 (P1-9), and the temperatures are part of that sign-off.
   - The check is the new IR invariant `gradient/slot-temperature`: in every permutation, slots 1 and 2 resolve to gradients of one `temperature`, and so do slots 3 and 4. It sits beside `gradient/scheme-mismatch` and runs per brand, with a fixture.
6. **Ember-night leaves the slots (F11).** No `sys.gradient.*` token aliases `ref.gradient.vivid.ember-night` any more. It stays a brand-overridable reference gradient that passes V1 and V2, and it is reserved for a single warm hero card on a screen without the accent. A spec that needs it adds a `sys.gradient.vivid.*` role through an ADR. Its end stop, 0.078 from `accent.500`, then no longer sits in a grid beside the accent.
   - **It stays checked.** Today's vivid pairs name `gradient.vivid.*`, which reaches a reference gradient only through a slot (S10). Every vivid pair and vivid backdrop in `tokens/contrast-pairs.json` therefore names `ref.gradient.vivid.*`: V1, V2, the glass pairs of ADR-0022 §3.3 and of §1.6, and ADR-0030's pairs on vivid. Without the change, `contrast:check` would fail its V1 and V2 coverage check on ember-night, and no glass pair would reach it.
7. **Brands.** `BRAND_OVERRIDABLE` lists nine gradient ids: `ref.gradient.vivid.orchid|olive|rose|sky|ember-night|plum-dusk|forest-moss|navy-cyan|night-lagoon` (amends ADR-0020 §1; `brands/README.md` mirrors it). Every brand value passes V1, V2, the glass-over-vivid pairs and `gradient/slot-temperature`, or the brand does not build.

### 3. Density and components (D3: F26, F27, F29)

1. **Compact page margin (F26).** `sys.space.page-margin` in `tokens/sys/density/compact.tokens.json` goes from 16 to 24 px, the value of `space.7`. It is a density literal, like the other density values (ADR-0020 §3). All three existing densities now have a page margin of 24. The token stays density-owned, so a later density can differ. F26's alternative, a `space.page-margin.wide` token, would add a role that every desktop layout must remember to pick.
2. **The watch density (F27).** The watch gets a fourth density context, `watch`, that layers a delta over `regular`:
   - resolver: `"watch": [ { "$ref": "sys/density/regular.tokens.json" }, { "$ref": "sys/density/watch.tokens.json" } ]`, the same layering as the increased-contrast and reduced-motion contexts;
   - `tokens/sys/density/watch.tokens.json` declares only `sys.space.card-padding` = 16 px (with its `figma` metadata);
   - the result is card padding 16, controls `sm` 32, `md` 40, `lg` 44, row 44, gaps 6 / 12 / 16 / 32 and a page margin of 24;
   - ADR-0019 §2's watchOS default density becomes `watch` (`PLATFORM_DEFAULTS.watchos`, `DSTokenContext.platformDefault`), and ADR-0019 rule 12's watchOS expectation becomes `watch`, touch and dark. `comfortable` stays an accessibility choice and is no platform's default. Amends ADR-0010's density bullet.
   - `WEB_RUNTIME.density.values` becomes `compact`, `regular`, `comfortable`, `watch` (`data-ds-density`, `TokenContext`, `DSDensity.watch`). The valid-value fallback selectors list four values (ADR-0019 §1). A web page may use `watch` for a watch-sized layout; nothing else should.

   - Why this mechanism:
     - ADR-0024 §9.1 gives density all of `sys.space.**` and `sys.size.**` except `sys.size.hit`, and gives the `platform` modifier none of them (`sys.font.**`, plus `sys.type.metric.xl` after ADR-0030). A watch delta in the `watch` platform context would write density ids from a second modifier, which `tokens:lint` rejects.
     - Switching the watchOS default to an existing density cannot give both numbers: `regular` has card padding 24, and `compact` has `lg` 40 and a 32 px row.
     - Retuning `comfortable` would break its role as the roomy accessibility choice.
   - V2's twelve geometries become sixteen, and the four new ones lie inside compact's (S8), so no gradient can newly fail. `cardGeometries` in `tools/contrast/gradient.ts` already takes one padding and action size per density context. Amends ADR-0022 §4.1 and rule 7, where twelve are named.
   - The product becomes 576 permutations (S9). Amends ADR-0019 §1 and ADR-0024 §9.5 and rule 10, where 432 is asserted.
3. **The ghost button (F29).**
   - `comp.button.ghost.bg.rest` is deleted, and the ghost is transparent at rest.
   - A new `comp.button.ghost.bg.pressed` aliases `{sys.color.bg.fill.neutral.subtle}`.
   - Button.yaml drops the `ghost` cell of `root.background` and binds `root.pressed.background.ghost: comp.button.ghost.bg.pressed`. Hover keeps `root.hover.overlay`, which is already `color.bg.fill.neutral.subtle`, F29's hover fill, and the outline keeps `comp.button.ghost.border` (`color.border.strong`, whose boundary pairs on page, surface and raised still pass: 3.03:1 or more in light).
   - A `comp` token must alias a `sys` token (ADR-0024 §5.1), and no `sys` token is transparent, so "transparent" is the absence of a binding, not a token. The binding-matrix grammar of P2-1 (critic G-06) must therefore read a variant without a `root.background` cell as "no fill".
   - visual-dna §3.6's "ghost fill" reading is dropped.
4. **The thin dark metric weight stays.** `ref.type.metric.xl` keeps `darkWeight` 200, 300 in light (ADR-0021). ADR-0030 §7's watch size keeps it too.

### 4. The ride report is reworked (D4)

The board's desktop "Ride report" is recomposed before the owner signs the re-rendered board (P1-9, gate P3-0):

- It no longer combines the inventory the board README's item 6.1 names from traffic console 27220417: a tools cluster across the top, the title over a fading map, a glass card tied to a map object, a banded chart with an inline target and a trailing axis, and a level chart.
- The status pill no longer sits under the tools, which echoed shipping console 27658472.
- It starts from Prism's own patterns (DashboardGrid, DetailScreen) and keeps the report's content (the climb, the segments table, the level readings).
- The board README records the reference-distance review of ADR-0015 decision 3 for all three screens.

This is board work and changes no token.

### 5. The other findings

ADR-0030 records F4–F6, F8–F10, F14–F25, F28, F30 and F31 as semantic roles, rules and checks. This ADR's token work and ADR-0030's land together in P1-9.

## Alternatives considered

- **Keep smoked Card glass in light, add a scrim over maps (F2's first reading).** At 0.35 the scrim gives 2.44:1 over white roads, and even at 0.45 it turns a daylight map into a grey at L 0.64 before the smoked glass darkens it further. The owner chose light glass (D1).
- **Resolve Card glass per scheme inside Surface or Card.** Web component CSS may not read the scheme, which nests (ADR-0019 §4 item 6, ADR-0022 §3.3). Only a scheme-varying token gives both stacks the same answer at the first paint.
- **Redefine `text.on-glass*` and `glass.dark.*` in light instead of adding role tokens.** Fewer names, but the smoked appearance would lose its white foreground in light. ADR-0022's smoked-glass pairs, the cells and every existing reference would change meaning under the same ids.
- **Rename the recipes by role (`fill`, `chip`, `cell`) and drop smoked glass in light.** The cleanest vocabulary, but it rewrites ADR-0022's ids, pairs and Surface table for no gain over two added role recipes. It also removes the smoked appearance a dark scope still renders.
- **Give light glass one tone (ADR-0022 as it stands).** The owner asked for the secondary and dimmed tones (F7), and the board showed them over the map.
- **F7's alternative: fill white 38 % and ink at 80 % alpha.** Text on light glass is never dimmed with alpha (ADR-0022 §3.1), and a 38 % fill moves the secondary tone's backdrop limit only from L 0.84 to 0.82 (probe).
- **Secondary tones on light glass over imagery too.** Over #555555, which ADR-0022 permits for light glass, `neutral.600` reaches 1.78:1 (S3). Prism cannot measure an image, and its map is the one backdrop whose luminance a token guarantees.
- **The primary tone alone over imagery and vivid, in both schemes.** It saves the two `-media` tokens. But it drops the 78 % and 64 % that the owner approved on smoked glass (sign-off item 2.1), in the one scheme where they pass over every permitted backdrop (S1, S5).
- **A role recipe for status cells.** Nothing binds `glass.cell` today (S11), and a cell carries only the primary foreground, as a chip does. A third role recipe would add seven tokens per scheme file for a component that has no spec yet.
- **Keep smoked glass for `backdrop: image` in light (F1).** It would make the material depend on both the backdrop kind and the scheme. A dark scope gives the same result through the existing runtime contract.
- **A light scrim of 0.45 with the dark one at 0.40.** Dark keeps a scrim that fails its own "text scrim over bright photos" job (2.85:1 over white, S2), and the check would split by scheme.
- **A quartet of four same-temperature gradients per scheme.** It needs two new light gradients, each of which must pass V1, V2 and the ink-on-light-glass bound. The diagonal rule gives a one-temperature 2×2 with the gradients the owner has seen.
- **The board's pairing without reordering (light 1 + 4, dark 1 + 2).** The rule would differ by scheme, and dark slot 3, the owner's new cool gradient, would pair with forest-moss across a hue gap.
- **Temperature from a hue formula.** A threshold on hue or on OKLab b either calls the dark greens warm or the pinks cool, depending on where it is set (S7). A declared value is reviewable and survives a brand's retune.
- **Delete ember-night.** The owner kept it for a single hero card (F11), it passes every check, and deleting it would remove a brand-overridable id.
- **F12's options for navy-cyan.** See S6.
- **Regular as the watchOS default density (F27's second option).** Card padding stays 24, not 16.
- **A watch delta in the `watch` platform context.** Two modifiers would write `sys.space.card-padding` and `sys.size.control.*`, which ADR-0024 §9 forbids.
- **A watch-only token such as `space.card-padding-watch`.** Components would branch on the platform to pick it, which ADR-0010 rule 1 forbids.
- **A transparent `sys` color for the ghost rest fill.** It would be a role whose only meaning is "none", added so that a component token has something to alias.

## Consequences

- **What the owner sees.**
  - Light glass over the light map, with ink and two quieter tones.
  - Neutral smoke in dark.
  - A brighter sky, rose and olive.
  - A smooth navy-cyan and a new teal gradient in dark.
  - One-temperature 2×2 grids, a wider desktop margin, a tighter watch, and an outlined ghost button.
  - The re-rendered board shows them. Gate P3-0 stays open until the owner signs it (P1-9).
- **Selection on light glass.** In light, `glass` and `glassLight` now share one fill, so a selected glass Card differs from an unselected one only by its single tone. Card.yaml (P2-1) must give selection another cue in light, for example the elevation or the edge, without a new material.
- **New names.**
  - Two role recipes (fourteen tokens per scheme file) and six text roles.
  - One reference gradient and one folded key, `temperature`.
  - One density context and one density delta file.
  - One comp token added and one deleted.
  - `tokens/README.md` gains the `sys.color` segments `on-glass-fill`, `on-glass-fill-secondary`, `on-glass-fill-tertiary`, `on-glass-fill-dimmed`, `on-glass-fill-media-secondary` and `on-glass-fill-media-tertiary` (ADR-0024 §13.4).
- **The pairs file** names `ref.gradient.vivid.*` wherever it named `gradient.vivid.*` (§2.6), and `check.test.ts` asserts sixteen geometries.
- **Removals** (`comp.button.ghost.bg.rest`) are breaking changes, so while the last tag is 0.x P1-9 carries a minor changeset (ADR-0024 §14).
- **Build cost.** 576 permutations instead of 432, and 128 Swift contexts per brand instead of 96.
- **Specs.** Surface.yaml, Card.yaml and Text.yaml follow in P2-1: the `glass` binding, the backdrop-keyed tone row, the usage limits and the dark-scope note, the `watch` density in `spec/component.schema.json` and in each spec's `density` list, and Card's two-slot 2×2 examples. Button.yaml's ghost bindings change with the tokens in P1-9, so that no binding points at a deleted token.
- **Documents that follow this decision:**
  - `docs/decisions.md` rows 10, 19, 20, 22 and 24, the `docs/adr/README.md` index, and the Status lines of ADR-0010, ADR-0019, ADR-0020, ADR-0022 and ADR-0024;
  - `tools/tokens/ARCHITECTURE.md` (§5.7 counts, §9.1 and §9.2's density values, §10 backdrops, §14);
  - `tokens/README.md` (ownership, contexts and vocabulary), `brands/README.md` (the allowlist) and `agent/SKILL.md` (densities, glass per scheme, the 2×2 rule);
  - the direction board's README and render;
  - notes in `docs/research/visual-dna.md` §3.5, §3.6 and §4.4.

## Rules that follow

1. **The scheme's glass is a role.** Surface `glass` and Card glass bind `material.glass.fill`, and chips, controls and status cells over media bind `material.glass.chip`. Each role recipe aliases the light appearance recipe in light and the dark one in dark, field by field.
   - Checked by `material/role-recipe` (`tokens:build`, with a fixture) and by the P2-1 spec validation of the bindings.
2. **Text on the scheme's glass takes `text.on-glass-fill` and the `-secondary`, `-tertiary` and `-dimmed` tones over `map`, and `text.on-glass-fill` with the two `-media` tones over `image` and `vivid`.**
   - Checked by the Text and Surface table tests (P3-1, P3-4) and by the pairs of §1.6, which must pass for every brand × colorScheme context.
3. **Smoke is neutral:** `ref.color.smoke.*` has OKLCH chroma of 0.007 or less.
   - Checked by the `tokens:build` source check `color/smoke-chroma`, with a fixture.
4. **The scrim holds large white text at 3:1 over pure white in both schemes.**
   - Checked by the scrim pair of §1.7 in `contrast:check`.
5. **Every vivid gradient declares `temperature`, and each slot pair (1 + 2, 3 + 4) is one temperature in every permutation of every brand.**
   - Checked by the `app.prism` schema and by the IR invariant `gradient/slot-temperature`, with a fixture.
6. **A vivid 2×2 alternates one slot pair on its diagonals.**
   - Checked by `spec:validate` on the Card and pattern examples (P2-1, P2-5): a 2×2 example uses slots 1 and 2, or 3 and 4, on its diagonals. The gallery lint (critic G-18, not yet ticketed) extends the check to gallery screens.
7. **Every vivid gradient of every brand, the nine reference gradients included, passes V1 and V2 in both interpolation spaces at all sixteen geometries, and every glass pair over vivid.**
   - Checked by `contrast:check` (ADR-0022 rule 7) through pairs that name `ref.gradient.vivid.*`, and by its V1 and V2 coverage check.
8. **The watchOS default density is `watch`, which is `regular` with a card padding of 16.** Only density writes it.
   - Checked by `tokens:lint` and `lint-orthogonality.test.ts` (576 permutations), by `repo.test.ts`, by `GeneratedTokenTests.swift` (the `watch` context's card padding), and by the generated Swift `platformDefault` expectation on the watchOS simulator (ADR-0019 rule 12, `swift.test.ts`).
9. **The ghost button has no rest fill and the neutral subtle fill when pressed.**
   - Checked by `spec:validate` (P2-1: every `comp` token bound, no binding to a missing token) and by the Button stories and snapshots (P3-3, P3-4).
10. **The ride report is not recognizably 27220417's composition.**
    - Checked by the reference-distance review recorded in the board README before the owner signs (ADR-0015 decision 3). It is a manual gate; `lint:reference-copy` keeps reference names and copy out of the board.
