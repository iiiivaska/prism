# ADR-0022: Materials: glass and vivid under accessibility settings and on watch

- Status: accepted (the Safari consequence corrected by [ADR-0025](0025-web-component-css-and-root-axes.md); §2.1, §3.1, §3.3 and rules 4 and 5 amended by [ADR-0029](0029-direction-board-sign-off.md): glass follows the scheme through the `fill` and `chip` role recipes, whose tones follow the backdrop kind; §1.1's light value, §1.4, §2.6 and the §3.1 tone table amended by [ADR-0030](0030-semantic-roles-from-the-direction-board.md): light `raised` is `neutral.50`, the `watch` platform context carries a typography delta, the edge takes the neutral `color.edge.highlight`, and `accent` joins the tone table)
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #22
- Amends: ADR-0004 (decision 3: the `platform` modifier no longer does "blur removal on watch"), ADR-0009 (decision 2: the glass recipe tokens and the unset vivid gradient; decision 3: the watchOS fallback; decision 5: what the `surface.raised` fallback is, and selection under it; rule 1: on the web the "theme package" is the Surface module, the React `Surface` and its stylesheet), ADR-0010 (the Tier 3 row's "Surface (solid only)" means opaque materials, the glass fallback included; its example of a platform token delta, "no blur on watch", becomes a Surface rule), ADR-0011 (the glass bullet under "Weight and material rules": the fallback material, Increase Contrast, the backdrops glass text is checked over; rule 3's "fallback token path"; the Consequence "Increase Contrast gets its own token layer, not per-component branches" gains one exception, the glass substitution inside Surface)

## Context

ADR-0009 gives content three materials (solid, vivid, glass) and ADR-0011 makes them accessible. Neither says exactly what glass becomes when it must not render, how a glass recipe is typed, or how a vivid gradient and the corner-pinned Card fit together. The Phase 1 build design leaves the recipe question open as O7 (`tools/tokens/ARCHITECTURE.md` §16.3). The research lists the rest as open findings: visual-dna Appendix B B5, B6, B21 and B22, and critic C-26, G-04 and G-01. B15 (grain) belongs to ADR-0024 §6; this ADR only supplies the recipe's `grain` token.

### What the repository says today (working tree, 2026-09-15)

- **Three fallbacks for glass (C-26, B21).**
  - ADR-0009 decision 5: under Reduce Transparency or Increase Contrast glass resolves to `surface.raised` (`docs/adr/0009-materials-in-layers.md:28`). `spec/components/Surface.yaml:100`, `:117` and `spec/components/Card.yaml:131`, `:154` follow it.
  - ADR-0011: glass resolves to `surface.solid` under Reduce Transparency, and Increase Contrast is not mentioned (`docs/adr/0011-accessibility-tiers-ci.md:27`; `docs/decisions.md:17`).
  - The token files hold a third answer. In dark, glass becomes surface-1/2/3 at alpha 0.92 (`tokens/sys/color/dark-reduced-transparency.tokens.json:7-69`, alpha at `:15`). In light, dark glass becomes `neutral.900`, light glass `neutral.0` and the scrim alpha 0 (`light-reduced-transparency.tokens.json:6-33`). The seed that wrote those files states the intent they miss: "glass becomes an opaque raised surface" (`tools/tokens/seed-sys-tokens.py:147`).
- **Increase Contrast loads no material override (B21).** An `*-increased-contrast` context is the base scheme plus a delta (`tokens/prism.resolver.json:53-54`), and the deltas write only `sys.color.text`, `border` and `chart` (`light-increased-contrast.tokens.json:3-86`, `dark-increased-contrast.tokens.json:3-109`). So the tokens leave glass translucent under Increase Contrast, while ADR-0009 and Surface.yaml make it opaque.
- **The watch (B22).**
  - ADR-0009 decision 3 and Surface.yaml send glass to solid on watchOS (`0009:26`, `Surface.yaml:101`, `:146`). The watch token sends it to `surface.raised` (`tokens/sys/platform/watch.tokens.json:9`).
  - `sys.material.blur.enabled` (0 on watch; 1 in `apple.tokens.json:17-24` and `web.tokens.json:16-23`) is the only token that differs between apple and watch (ARCHITECTURE §5.7 item 5).
  - It is also the example of a platform delta in ADR-0004 decision 3 (`0004:23`) and ADR-0010 (`0010:30`).
- **Untyped materials, bare recipe numbers (G-04, O7).**
  - `sys.material` has no `$type` (`tokens/sys/color/light.tokens.json:360`, `dark.tokens.json:472`); only `sys.color` carries one (`:5`). `tz lint` therefore fails (ARCHITECTURE §1 S1).
  - Blur, saturate, edge, grain and bloom are bare numbers in `$extensions["app.prism"]` (for example `light.tokens.json:375-385`). `ref.blur.*` (`tokens/ref/dimension.tokens.json:275-301`) is referenced by nothing, and the recipe blurs 12 px and 24 px have no primitive.
  - ARCHITECTURE special-cases the recipe in six places: §4.2 `IRMaterialRecipe`, §5.1, §5.4, §7.12 neutral defaults, §8 derived suffixes and §9.7.2 `DSMaterialToken`. It also notes that a reduced-transparency replacement silently drops the recipe to those defaults (§5.3).
  - `glass.cell` exists only in dark (`dark.tokens.json:562-579`; ARCHITECTURE S4).
  - `ref.opacity.glass.*` (`tokens/ref/opacity.tokens.json:51-67`) is unreferenced and disagrees with the light fills (0.60 against 0.55).
- **Edge binding.** Surface binds the mandatory glass edge to `color.border.hairline` (`Surface.yaml:93-94`), which is ink at 10 % in light, and `comp.card.glass.edge` does the same (`tokens/comp/card.tokens.json:34-36`). The recipes, however, describe a white edge.
- **Text on light glass (B6).**
  - `text.on-glass` is white in both schemes (`light.tokens.json:137-139`; `dark.tokens.json:216-219`, where it says "captions never below 78% white on light glass").
  - Text maps secondary and tertiary to white 78 % and 64 % "on vivid, glass or inverse" (`spec/components/Text.yaml:104`). No token holds 78 % or 64 %, and on the white dark-scheme inverse fill that mapping gives white on white.
  - Card binds its title and caption colors by the variant it requests (`Card.yaml:103-114`), so under a fallback it would keep white glass foregrounds on an opaque surface.
  - The pairs file checks only white on `glass.dark.fill` over two backdrops (`tokens/contrast-pairs.json:43`). The lighter one, #5B6366, is darker than the bright photos that light-scheme dark glass is meant for (visual-dna §7.3).
- **Vivid against the corner-pinned card (B5, G-01).**
  - Card pins its parts to the four corners (`Card.yaml:132`).
  - Every gradient sends the reader to visual-dna for its text-safe zone (`tokens/ref/gradient.tokens.json:49` and seven siblings). The vivid pair checks `"stops": "text-zone"` (`contrast-pairs.json:44`), yet no token declares a zone.
  - visual-dna §5.3 computes that only `plum-dusk` and `forest-moss` carry the full anatomy (`docs/research/visual-dna.md:764-777`).
  - Card and Surface bind `gradient.vivid.orchid` for every vivid card (`Card.yaml:89-90`, `Surface.yaml:75-76`). Orchid's light stop sits under the header, and because no `sys.gradient.*` exists yet (ARCHITECTURE S6), the binding also ignores the color scheme.

### Constraints from the other decisions of the same day

- **ADR-0019.** Only generated output names the axis attributes and the preference media features on the web (rule 1), and component stylesheets never contain them (rule 9). Component CSS reads tokens and branches on no axis except through the interaction-only `ds-pointer` and `ds-touch` variants (§4 item 6 as amended by ADR-0025). Component scripts read `useTokenContext()` (§4). On Apple, `DSTokenContext.contrast` and `.transparency` come from `colorSchemeContrast` and `accessibilityReduceTransparency`, and `DSAccessibilityPolicy` can force them (§5).
- **ADR-0023 §8.5.** Components read Prism's context, never the OS setting.
- **ADR-0024.** §6 declares `sys.gradient.vivid.default` and the slots `1` to `4`, and takes the value of `default` from this ADR (§4.4). §9.1 gives `colorScheme` all of `sys.material.**` and `platform` only `sys.font.**`. §9.5 keeps contexts whose delta is empty and deletes their empty files.
- **ADR-0020 §3.** Every semantic color is an alias, an alias with `app.prism.alpha`, or a pure white or black literal, and system-owned `sys` numbers may be literals. The smoked glass fills alias the new `ref.color.smoke.light|dark`.

### Facts verified for this ADR (2026-09-15)

The probes ran in the session scratch directory, outside the repository, with Color.js 0.5.2 from `tools/node_modules`. They use WCAG 2.x luminance and source-over compositing in gamma-encoded sRGB, the rule in ARCHITECTURE §10. The Apple pages were read through their documentation JSON, and MDN through its compatibility data.

| # | Fact | Evidence |
|---|------|----------|
| F1 | Apple's documentation for `accessibilityReduceTransparency` says: "If this property's value is true, UI (mainly window) backgrounds should not be semi-transparent; they should be opaque." | developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducetransparency |
| F2 | The appearance of the regular and clear Liquid Glass variants "can differ in response to certain system settings, like ... accessibility settings that reduce transparency or increase contrast in the interface". | HIG, Materials |
| F3 | These settings "can remove or modify certain effects. If you use standard components from system frameworks, this experience adapts automatically. Ensure you test your app's custom elements". The community claim that `glassEffect` frosts on its own is still unverified (`docs/research/arch-apple.md:119`). | Adopting Liquid Glass |
| F4 | watchOS: "Avoid removing or replacing material backgrounds for modal sheets when they're provided by default." | HIG, Materials, watchOS |
| F5 | `prefers-reduced-transparency`: Chrome and Edge 118+, Firefox only behind a flag, no support in Safari or iOS Safari. `prefers-contrast`: Chrome 96, Firefox 101, Safari 14.1. | MDN browser-compat-data 8.1.1 (2026-09-14) |
| F6 | `raised` composited over the page is #FBFBFC in light, where primary, secondary, tertiary and dimmed text reach 18.67, 6.10, 6.10 and 3.67. In dark it is #232426, with 15.58, 7.19, 5.70 and 3.93. In all four scheme contexts (light, dark and their Increase Contrast variants), the accent and status text tokens reach at least 5.08 on it. | probe |
| F7 | Today's reduced-transparency values: dark alpha 0.92 still shows 8 % of the backdrop (#1D1E20 over #283126, #212225 over #5B6366). Light gives light glass an opaque `neutral.0` fill under the white `text.on-glass`: 1.00:1. | probe |
| F8 | Dark-scheme light glass (white 26 %) over OKLCH L 0.35 grey (#3A3A3A): white 5.14, white 78 % 3.85, white 64 % 3.15. Over #5B6366, white reaches only 3.43. | probe; matches visual-dna §7.3 |
| F9 | Light-scheme light glass (fill white 30 %, chip white 25 %) over every stop of the four light gradients: white text reaches at most 3.74 on the fill and 4.22 on the chip, both over sky's darkest stop. Ink (`neutral.950`) reaches at least 5.16 and 4.57. Over OKLCH L 0.45 grey (#555555), ink reaches 5.45 and 4.86. | probe |
| F10 | White text on dark-scheme white-tint glass over #5B6366: chip (16 %) 4.25, cell (20 %) 3.89; 4.5 needs a tint of 13 % or less (4.54). Over a vivid stop at exactly 3.0:1 against white, no white tint can pass. A `#101410` fill at alpha 0.30 gives 5.11 there, at 0.35 5.62. | probe |
| F11 | Seeded stops below 3.0:1 against white: orchid@0 2.32, olive@1 1.51, rose@1 2.67, sky@1 2.46, ember-night@1 2.62, navy-cyan@0.75 2.70 and @1 2.19. Plum-dusk (≥ 3.79) and forest-moss (≥ 4.61) hold 3.0 everywhere. | probe |
| F12 | Minimum white contrast in the V2 header block over its twelve geometries (§4.1), in both interpolation spaces: orchid 2.47, olive 2.58, rose 3.45, sky 4.93, ember-night 6.92, plum-dusk 10.43, forest-moss 11.24, navy-cyan 8.15. With visual-dna's 240 × 240 header region the same probe reproduces the §5.3 table to within 0.01. | probe |
| F13 | On the seeded gradients, no point between two stops is lighter than the lighter stop, whether interpolated in gamma sRGB or in OKLab. For sRGB this holds for any gradient, since luminance is convex along the segment; for OKLab it holds for today's stops only. | probe (199 samples per segment) |
| F14 | A group holding a `$root` color token next to `dimension` and `number` tokens that carry their own `$type` validates against the pinned DTCG 2025.10 format schema (SHA-256 as in `.github/workflows/ci.yml:19`). On a copy of the token tree with the recipes of §2 in both scheme files, the reduced-transparency and watch delta files removed as ADR-0024 §9.5 says, and `comp` references written `.$root`, `tz lint` 2.7.1 reports no errors and `@terrazzo/parser` reports orthogonal modifiers with 432 permutations. The recipe tokens resolve with their types, for example `sys.material.glass.dark.fill.blur` to 32 px in dark. | Ajv 8.20 probe; Terrazzo CLI and parser probes |
| F15 | White, white 78 % and white 64 % over `glass.dark.fill` composited on a neutral at exactly 3.0:1 against white (#959595, OKLCH L 0.67): light scheme 8.97, 6.23 and 4.80; dark 9.30, 6.43 and 4.94. Over the worst hue at 3.0:1, white 64 % gives 4.78 (light) and 4.92 (dark). Over pure white, even full white on the light-scheme fill reaches only 4.36. A smoked chip or cell at alpha 0.35 over #959595 gives 5.85 (light) and 5.62 (dark) for white, but 4.31 and 4.16 for white 78 %. | probe |
| F16 | Ink on the light-scheme light chip (white 25 %) holds 4.5:1 over neutral backdrops up to 8.36:1 against white (#4E4E4E), and over any hue up to about 7:1 (worst 4.86 at 7:1, 4.42 at 8:1). On the fill (30 %) the bound is about 8:1 (worst 4.98). Today's darkest light stop, sky@0 at 8.09:1, gives 4.57 on the chip. | probe |
| F17 | In the watchOS 26.5 SDK of Xcode 26.6, SwiftUICore declares `glassEffect(_:in:)`, `accessibilityReduceTransparency` and `colorSchemeContrast`. `Gradient.ColorSpace` offers `.device` and `.perceptual`. | SDK `.swiftinterface` files |

## Decision

### 1. Glass has one fallback

1. **The fallback material is `raised`, drawn opaque.** The Surface fills its shape with `color.bg.page` and paints `color.bg.surface.raised` over it (light #FBFBFC, dark #232426; F6). Radius and elevation are the ones the requesting Surface declares. Blur, saturation, edge, grain and bloom are absent. The Surface publishes `raised` as its material, so descendants use the standard foregrounds (§3.1). The `text.* on color.bg.surface.raised` pairs, which composite over the page (ARCHITECTURE §10 step 2), check exactly this appearance, and every tone passes on it (F6).
2. **Triggers.** Surface renders `glass` or `glassLight` as the fallback when any of the following holds. Otherwise it renders the glass.
   1. The platform is watchOS.
   2. Reduce Transparency is on.
   3. Increase Contrast is on.
   4. The backdrop is not `image`, `map` or `vivid`. This case also logs at debug level, as today, whatever the other triggers.
3. **Where the decision is made.** Surface reads Prism's token context, never the OS settings, as ADR-0023 §8.5 does for motion.
   - **Apple.** DSCore's `DSSurface` reads `DSTokenContext.contrast` (`.increased`) and `DSTokenContext.transparency` (`.reduced`). DSCore builds both from `colorSchemeContrast` and `accessibilityReduceTransparency`, and `DSAccessibilityPolicy` can force them for previews and snapshots (ADR-0019 §5). Trigger 1 is `#if os(watchOS)` inside DSCore. This is theme-level material resolution, not the component spacing branch that ADR-0010 rule 1 forbids.
   - **Web.** The React `Surface` reads `useTokenContext()`: `contrast === 'more'` and `transparency === 'reduce'` (ADR-0019 §4). Its stylesheet reads only the tokens of the material it renders. It never reads the axis attributes, the `ds-contrast-more` or `ds-reduce-transparency` variants or the preference media queries (ADR-0019 §4 item 6 as amended by ADR-0025, rules 1 and 9). Server rendering cannot see the OS preferences. A server-rendered page therefore paints glass until hydration for a user whose OS asks for more contrast or less transparency, unless the app passes `contrast` or `transparency` to `<Theme>`. Client-rendered apps, Electron included, resolve on their first render.
   - Every element that draws a Prism glass material goes through this resolution, including the web imitations of system chrome. Native system chrome keeps adapting on its own (ADR-0009 decision 1; F3), and watchOS system sheets keep their materials (F4). No other code reads these settings in order to change a material.
4. **Tokens carry no fallback.**
   - Only the two base scheme files declare `sys.material.**`. No increased-contrast or reduced-transparency delta file (the files such a context layers over its base scheme file) and no `platform` source writes it.
   - The material overrides in both reduced-transparency files are deleted. The light scrim keeps its base alpha under Reduce Transparency: a legibility scrim is not a translucency effect, and alpha 0 removed the scrim that keeps text over photos legible.
   - `sys.material.blur.enabled` is deleted from the three platform files.
   - So the increased-contrast contexts need no material overrides, and they must not have any.
   - After this change the two reduced-transparency contexts and the `watch` context carry no token delta. ADR-0024 §9.5 keeps them in the resolver, each loading only its base file, and deletes the empty files. The runtime still exposes the Reduce Transparency state to Surface (item 3).
5. **Opaque means alpha 1.** The alpha-0.92 values are removed (F1, F7).
6. **Selection survives the fallback.** Surface gains a boolean prop `selected` (default false) that matters only here: while the fallback is active, a selected `glass` or `glassLight` Surface renders and publishes `inverse` instead of `raised`, because `raised` alone cannot show which one is selected. A glass Card with `isSelected` passes `selected`. Keeping this inside Surface means components never read the accessibility settings themselves. `inverse` is the system's one-active-element material (visual-dna §1 principle 9), and pair 11 already checks `text.on-inverse` on it (19.30:1).
7. **Vivid is unchanged.** It is already opaque. On watchOS it resolves to `solid` (Surface.yaml), and its bloom is dropped under Reduce Transparency, read from the same context.

### 2. Glass recipes are typed tokens (O7, G-04)

1. **Shape.** Each glass material is a group under `sys.material.glass` holding exactly seven tokens, each with its own `$type`:

   | Token | `$type` | Meaning | Constraint |
   |-------|---------|---------|------------|
   | `$root` | color | the fill, alpha included | a color ADR-0020 §3 allows: a white or black literal with alpha, or an alias of `ref.color.*` with `app.prism.alpha` (the smoked fills alias `ref.color.smoke.light` and `ref.color.smoke.dark`) |
   | `blur` | dimension | backdrop blur radius | whole-value alias of a `ref.blur.*` token |
   | `saturate` | number | backdrop saturation, 1 = unchanged | ≥ 0 |
   | `edge.start` | number | alpha of the white 1 px inner edge at the top-leading corner | 0 to 1 |
   | `edge.end` | number | alpha of that edge at the bottom-trailing corner | 0 to 1 |
   | `grain` | number | monochrome noise opacity | 0 to 1 |
   | `bloom` | number | alpha of the white top-leading bloom of light glass, 0 = none | 0 to 1 |

   - The recipes are `dark.fill`, `dark.chip`, `light.fill`, `light.chip` and `cell`. They are declared in `sys/color/light.tokens.json` and `sys/color/dark.tokens.json` only.
   - Specs keep binding `material.glass.dark.fill`, a public path that looks up the `$root` token (ADR-0024 §1.3), and bind a field as `material.glass.dark.fill.blur`. DTCG references write `{sys.material.glass.dark.fill.$root}`.
2. **Typing.** The `sys.material` group carries no `$type`. This replaces ARCHITECTURE S1's fix ("add `$type: color` to the group"), which would give `blur` the wrong type.
3. **Scrim.** `sys.material.glass.scrim` stays where it is, as a plain color token with its own `$type`. It is the only id under `sys.material.glass` that is not a recipe. ADR-0024 §9.1 gives `colorScheme` all of `sys.material.**`, which covers the recipes and the scrim.
4. **No special path in the build.**
   - `$extensions["app.prism"]` carries no material keys (`blur`, `saturate`, `edge`, `grain`, `bloom`). ADR-0020's color key `alpha` is not a material key.
   - The build treats recipe tokens like any other color, dimension or number token: CSS gets `--ds-material-glass-dark-fill`, `--ds-material-glass-dark-fill-blur`, `…-edge-start` and so on; Swift gets members of `DSTokenSet.Material`; each `$root` gets one colorset, in its brand's namespace (ADR-0020 §7). DSCore and the web Surface assemble a recipe from these values.
   - Which fields DSCore applies around `glassEffect` on Apple is decided in P3-1, under ADR-0009 decision 2. The web imitation applies all of them.
5. **New and removed primitives.**
   - Light gets a `glass.cell` (S4).
   - `ref.blur.cell` (12 px) and `ref.blur.pill` (24 px) are added. They are the two recipe blurs that have no primitive today. ADR-0020 §3 would let a system-owned number stay a literal. The recipe `blur` aliases `ref.blur.*` anyway, so the five recipe blurs stay on one closed scale with the existing primitives (G-04's fix). The other recipe fields are literals.
   - `ref.opacity.glass.*` is deleted. A fill's alpha is part of its color: either the alpha of a white or black literal, or ADR-0020's `app.prism.alpha`, which is a number and not a reference. Neither form can read an opacity token, so nothing could consume `ref.opacity.glass.*`. ADR-0024 owns any change to that reference convention, and ADR-0024 §1.5 keeps it.
6. **Edge and grain.**
   - Surface draws the glass edge from the material's `edge.start` and `edge.end` (white at those alphas), not from `color.border.hairline`.
   - Glass grain comes from the material's `grain`. Vivid grain comes from the gradient's folded `grain`. `opacity.grain` is not added; ADR-0024 §6 owns B15 and says the same.
   - The bloom token carries only the alpha. The bloom's shape and size belong to the Surface spec (P2-1); a length it needs is a `sys` token under ADR-0024's rules.

### 3. Foregrounds on glass and light glass (B6)

1. **Tone table.** Text resolves its tone from the material the enclosing Surface publishes:

   | Published material | `primary` | `secondary` | `tertiary`, `dimmed` | accent and status tones |
   |--------------------|-----------|-------------|----------------------|-------------------------|
   | `page`, `solid`, `raised` (including the glass fallback), `nested` | `text.primary` | `text.secondary` | `text.tertiary`, `text.dimmed` | their own tokens |
   | `glass` | `text.on-glass` | `text.on-glass-secondary` (white 78 %) | `text.on-glass-tertiary` (white 64 %) | `text.on-glass`; the status keeps its icon |
   | `glassLight` | `text.on-glass-light` | same | same | same |
   | `vivid` | `text.on-vivid` | same | same | same |
   | `inverse` | `text.on-inverse` | same | same | same |

   - On light glass, vivid and inverse, text is never dimmed with alpha. Hierarchy there comes from size.
   - The inverse row also removes Text.yaml's white 78 % on the white dark-scheme inverse fill.
   - **Components follow the published material.** A spec cell keyed by a material name (`solid`, `raised`, `vivid`, `glass`, `glassLight`, `inverse`), such as Card's `title.color` and `caption.color`, applies when the enclosing Surface publishes that material, not because the component requested it. A part with no cell for the published material takes the row above for its tone (a title is `primary`, a caption `secondary`). Under the fallback a glass Card therefore renders standard foregrounds, and a selected one `text.on-inverse`.
   - **Chips and cells** (`glass.dark.chip`, `glass.light.chip`, `glass.cell`) are not Surface materials. The components that draw them use only the primary foreground of their family: `text.on-glass`, or `text.on-glass-light` on a light chip. That is what item 3 checks; a secondary tone would fail on a smoked chip (F15).
2. **New tokens**, owned by `colorScheme` and declared in both schemes:
   - `color.text.on-glass-light`: `neutral.950` in light, `neutral.0` in dark;
   - `color.text.on-glass-secondary`: white at alpha 0.78;
   - `color.text.on-glass-tertiary`: white at alpha 0.64.
3. **Backdrop sets.** Glass text must pass its tier over the fill composited on every backdrop the material may meet. `tools/contrast` checks these sets:

   | Material | Schemes | Foregrounds checked (4.5:1) | Backdrops |
   |----------|---------|-----------------------------|-----------|
   | `glass.dark.fill` | light, dark | `on-glass`, `on-glass-secondary`, `on-glass-tertiary` | #283126 and #5B6366 (the ADR-0011 pair, OKLCH L 0.30 and 0.49), #959595 (OKLCH L 0.67, 3.0:1 against white: the lightest permitted) and every stop of that scheme's vivid gradients |
   | `glass.dark.chip`, `glass.cell` | light, dark | `on-glass` | same |
   | `glass.light.fill`, `glass.light.chip` | dark | `on-glass-light` (white) | #283126 and #3A3A3A (OKLCH L 0.35) |
   | `glass.light.fill`, `glass.light.chip` | light | `on-glass-light` (ink) | #555555 (OKLCH L 0.45) and every stop of the light vivid gradients |

   Three usage limits follow, and Surface.yaml states them:
   - Dark glass (`glass`, dark chips, cells) sits only over backdrops on which white holds 3.0:1, that is a neutral at OKLCH L 0.67 or darker, or over vivid, where V1 guarantees it (§4.1). The app darkens a brighter image region first (F15).
   - In the dark scheme, light glass sits only over imagery or maps at OKLCH L 0.35 or darker, never over vivid (F8).
   - In the light scheme, light glass sits only over vivid or over imagery at OKLCH L 0.45 or lighter (F9).

   Surface enforces only the backdrop kind (§1.2, trigger 4), the same in both schemes. The luminance limits, and the dark scheme's exclusion of vivid, are the app's job, as today. They depend on image content, which nothing measures, and on the scheme at the Surface's position, which nests on the web (ADR-0019 §1) and which component CSS may not read (ADR-0019 §4.6). Spec examples render in both schemes, so they put light glass only over `backdrop: image` or `map`. The gallery and snapshot harness supply one synthetic backdrop per scheme that meets these limits (P3-3, P3-4).
4. **Values that fail today.** Dark-scheme `glass.dark.chip` and `glass.cell` fail these sets (F10). P1-2 retunes them to smoked fills.

### 4. Every vivid gradient carries the full Card anatomy (B5, G-01)

1. **No text-safe zones.** No gradient declares a text-safe zone, whether in `$extensions`, in a spec or in the pairs file; visual-dna §5.2 becomes informative. Instead, every `ref.gradient.vivid.*` of every brand passes two checks. Each check is evaluated in both interpolation spaces the stacks may use, gamma-encoded sRGB and OKLab (CSS's default for `oklch()` stops), at every stop and at 100 samples per segment. Which space each stack renders in is P1-5's parity decision.
   - **V1: anywhere, large tier.** Every stop, and every sampled point, reaches at least 3.0:1 against `color.text.on-vivid` (white). This covers the whole surface: the action glyph or solid disc, the hero, the aside sparkline, and any text of 24 px or more wherever it sits (F13).
   - **V2: header, functional tier.** The Card header block reaches at least 4.5:1 against `text.on-vivid` at every reference geometry.
     - Card sizes W × H: 166 × 166, 240 × 240, 320 × 200 and 180 × 240.
     - Padding p and action size a per density, from `space.card-padding` and the action's `size.control.md` (ADR-0024 §7.1): compact (16, 32), regular (24, 40), comfortable (24, 48). Four sizes by three densities give twelve geometries.
     - The block: x from p to W − p − a − 16 and y from p to p + 64. That is a two-line `headline` title plus a `caption`, left of the action and a 16 px gap.
     - Position along the gradient: t as in visual-dna §5.1 rule 2, with CSS angle semantics.
     - The minimum is taken over the t interval that the block's corners span.
   - **Both stacks draw a vivid gradient with CSS angle semantics.** DSCore turns the token's `angle` into SwiftUI start and end points on the CSS gradient line for the surface's size (P3-1), so V2's geometry holds on Apple too.
2. **Text on vivid.**
   - On any vivid surface, text below 24 px sits only inside the header block of the corner-pinned anatomy, or on a glass material over the vivid (§3.3).
   - On a vivid Card, the aside holds a sparkline, a glyph or text of 24 px or more, and the icon ring is not drawn.
   - Every tone is `text.on-vivid` (§3.1), so the trailing digits of the hero are not dimmed.
   - Apart from these points, the anatomy is the same on every gradient.
3. **Today's verdicts (F11, F12).**
   - Plum-dusk and forest-moss pass both checks.
   - Sky, ember-night and navy-cyan fail only V1.
   - Orchid, olive and rose fail both.

   P1-1 retunes the seeded stops. Angles, grain and blooms stay as they are:
   - the default pair first (§4.4): sky needs only its light end brought to at least 3.0:1, and plum-dusk passes today;
   - orchid: put its dark end under the header (reverse the stops, or darken stop 0 until V2 passes) and bring the light end to at least 3.0:1;
   - olive and rose: darken the start region until V2 passes, and bring the light ends to at least 3.0:1;
   - ember-night and navy-cyan: bring the stops listed in F11 to at least 3.0:1.

   In the light scheme a stop must not get so dark that ink on light glass over it drops below 4.5:1 (§3.3). That bound is about 7:1 against white, depending on hue (F16).
4. **Default gradient.** The default vivid for Card and Surface is `gradient.vivid.default`, which ADR-0024 §6 declares in the two base scheme files: `{ref.gradient.vivid.sky}` in light and `{ref.gradient.vivid.plum-dusk}` in dark. A Card or Surface without a `vivid` slot binds it; a slot binds `gradient.vivid.1` to `4` (ADR-0024 §6).
   - Both pass V2 today (F12). Plum-dusk also passes V1, and sky fails it only at its light end, so the default look moves least when P1-1 retunes.
   - The specs' `gradient.vivid.orchid` binding ignored the scheme and pointed at the gradient that fails V2 worst. It leaves the specs with ADR-0024's slots.
   - Invariant `gradient/default-scheme` (IR analysis, P1-3): in each base scheme S, `sys.gradient.vivid.default` resolves to a gradient whose folded `scheme` is S. ADR-0024 widens it to every `sys.gradient.*` token.
   - Once V1 and V2 hold, contrast no longer tells the gradients apart, and the default becomes a choice of look that the owner reviews on the direction board (P5-1).
5. **Brands.** ADR-0020 lets a brand override the eight `ref.gradient.vivid.*` tokens. Every brand value must pass V1, V2 and the glass-over-vivid pairs of §3.3, including the light-scheme ink pairs, or the brand does not build.

## Alternatives considered

- **Token-level fallback** (the colorScheme variants override every glass token with the fallback). This keeps the web cascade free of component rules, which is why the build design leaned toward it (ARCHITECTURE §5.3). It lost for five reasons:
  - Increase Contrast and Reduce Transparency would then write the same ids, which breaks the variant-disjointness proof that makes the two settings compose (ARCHITECTURE §5.7 item 4).
  - It cannot reach the watch: platform may not change colors (§5.7 item 5), and `sys.material.**` belongs to `colorScheme`.
  - It cannot keep selection visible.
  - Every foreground on glass would need an override as well.
  - DTCG cannot composite `raised` over the page, so the opaque values would be literals duplicating the surface ladder.
- **The web fallback in generated CSS** (derived custom properties that switch under the contrast and transparency root selectors). Server-rendered pages would paint the fallback without JavaScript. But every foreground on glass needs its own switching property besides the fill, filter and edge. The published material would still say `glass` while the surface renders `raised`. And the CSS format would regain a material special case: a second implementation of the table next to DSCore's.
- **Keep the token fallback for Reduce Transparency and drop Increase Contrast from ADR-0009 and Surface.yaml** (B21's second option). Apple changes glass under both settings (F2); under Increase Contrast, Liquid Glass turns predominantly black or white with a contrasting border (ADR-0019's facts). This option also keeps two fallback mechanisms, and light glass has only 5.14:1 at its limit (F8), which is not the reserve Increase Contrast users ask for.
- **Fall back to `solid`** (ADR-0011). A floating glass card would become identical to the solid cards around it and lose its layer. The glass-over-solid rule (ADR-0009 decision 3), Surface, Card, the watch token and the seed's stated intent all say `raised`.
- **Keep the authored reduced-transparency values.** At alpha 0.92 they are not opaque (F1, F7). The dark scheme uses three different ladder steps. In light, the light-scheme light glass becomes opaque white under white text (1.00:1), and dark glass becomes a near-black slab on a light page.
- **Rely on Liquid Glass adapting by itself.** This is unverified for custom views (F3), it does not exist on the web, and it does not apply to the watch policy.
- **Surface enforces the luminance limits, or the dark scheme's exclusion of vivid for light glass.** It would need the image's luminance, which nothing measures, and the scheme at the Surface's position, which is a nestable attribute that web component CSS may not read.
- **Recipes in `$extensions` with neutral defaults** (ARCHITECTURE §7.12 as written). The values stay untyped, do not flow through aliases, hide missing fields behind defaults, and need material-only code in six places. Typed tokens use the generic paths.
- **A composite recipe token.** DTCG 2025.10 has no material type, and a custom `$type` is invalid.
- **Edges as colors.** They would allow a hue on the edge, which visual-dna §1 principle 6 forbids, and they would add colorsets.
- **Recipe blurs as literals** (allowed by ADR-0020 §3). Simpler by one alias each, but the five blurs would drift off the existing `ref.blur` scale, which G-04 asks the recipes to use.
- **Dark glass checked only over the two ADR-0011 backdrops.** The lighter one (OKLCH L 0.49) understates where light-scheme dark glass goes (bright photos and vivid). #959595 matches V1's bound, so one number limits both.
- **Text-safe zones in `$extensions` that components respect** (G-01's suggestion). Zones in t move with the card's aspect ratio, so both stacks would need the same runtime geometry. A different anatomy per gradient breaks "the same affordance in the same corner" (visual-dna §1 principle 12) and the 2×2 grid. Agents would also have to choose a gradient to fit the content.
- **Per-gradient anatomy variants** (B5's fallback for navy-cyan). They lose for the same reasons.
- **Region-only checks at 3:1 for hero, action and aside, with no stop rule.** This lost narrowly. It depends on reference geometries for every region, while V1 needs no geometry and also covers chips, rows and larger Dynamic Type. It spares only ember-night's corner stop (2.62:1, outside the padding).
- **Ink text on the light gradients.** `text.on-vivid` would then depend on the gradient, and Card and Text would have to know which gradient they sit on.
- **White text on light-scheme light glass.** A white fill lightens the vivid beneath it, so white text gets worse as the glass gets stronger: at today's 30 % and 25 % it tops out at 3.74:1 and 4.22:1 (F9), and over a stop near 3.0:1 no fill at all can pass. Only ink passes.
- **White-tint dark chips at 13 % or less, kept off vivid.** They pass #5B6366 (F10), but they cannot sit on a vivid card, and they would add a per-material usage exception for agents to remember.
- **Orchid as the default, as the specs bind it today, or "slot 1" without a `default` token.** Orchid fails V2 worst (2.47) and needs its stops reversed, so the default look would stay unknown until P1-1. ADR-0024 §6 already declares `default` and puts sky and plum-dusk in slot 1.

## Consequences

- **One substitution rule** replaces three answers. It covers four triggers and is implemented once in DSCore and once in the React Surface.
- **The reduced-transparency contexts become value-identical to their base schemes.** The Swift reduced-transparency twin colorsets, the Swift members that depend on transparency and the CSS transparency blocks all have no input. The watch platform context has no delta either. ADR-0024 §9.5 keeps these contexts, so they cost build time but add no token values.
- **The material special cases leave the build.** Six places in ARCHITECTURE no longer need material-specific code: §4.2, §5.1, §5.4, §7.12, §8 and §9.7.2. The material source changes from 22 untyped tokens in four files to 70 typed recipe tokens (seven fields, five recipes, two schemes) plus two scrims, in two files.
- **The light vivid set loses its brightest ends** (the lime, pastel pink, tan and pale steel corners), and ember-night and navy-cyan deepen their light stops. In return, any gradient works with any Card, and no runtime needs zone logic.
- **Dark ops chips and status cells change from white-tint glass to smoked glass.** This is a visible change from the references, forced by F10.
- **Dark glass over imagery is limited** to backdrops on which white holds 3.0:1. This narrows visual-dna §7.3's "over a bright photo": a brighter region needs darkening by the app (F15).
- **Under Increase Contrast, Prism content glass becomes opaque** while system Liquid Glass only strengthens its contrast (F2), so a screen can mix the two looks. This is accepted in exchange for guaranteed contrast.
- **Safari cannot report Reduce Transparency** (F5). ADR-0019 §4.3's provider sets the reduced state only while Increase Contrast is on, and Increase Contrast alone already triggers the fallback, so that heuristic changes no rendering now. A Safari user who turned on only Reduce Transparency keeps web glass, unless the app passes the setting itself.
- **Server-rendered web pages paint glass until hydration** for users with Increase Contrast or Reduce Transparency (§1.3). ADR-0019's "first paint is right without JavaScript" covers token values, not this component substitution.
- **Dimming trailing digits is not available on vivid and light glass.** Hierarchy there comes from size, a small step away from visual-dna §1 principles 4 and 8.
- **The contrast gate cannot open before the retunes.** P1-6's gate lands only after P1-1 has retuned the gradients and P1-2 the dark chips and cells.
- **The ADRs of the same day.**
  - ADR-0024 already follows this decision: the ownership table and flag list without `sys.material.blur.*`, the glass edge from the recipe, grain, the default gradient and §9.5.
  - ADR-0020's migration of the dark reduced-transparency fills has nothing left to migrate, because those fills are deleted. The dark `glass.dark.chip` and `glass.cell` white literals become smoked aliases, so its literal counts shift.
- **Documents that follow this decision:**
  - `docs/decisions.md` rows 9, 11 and 22; the `docs/adr/README.md` index; the status lines of ADR-0004, ADR-0009, ADR-0010 and ADR-0011;
  - ARCHITECTURE §0, §1, §3.1, §4.2, §5.1, §5.3 to §5.7, §7.12, §8, §9.2, §9.7.2 to §9.7.4, §9.8, §10, §14 and §16.3;
  - `tokens/README.md`, `tools/tokens/README.md` and `brands/README.md`;
  - the roadmap: P1-1, P1-2, P1-6, P2-1, P3-1, P3-3, P3-4 and the verify list;
  - `agent/SKILL.md`;
  - Surface.yaml, Card.yaml and Text.yaml (a specVersion bump each) and `spec/component.schema.json`;
  - notes in visual-dna, critic and arch-apple.

## Rules that follow

1. **Only Surface resolves materials, and it uses the glass fallback exactly under §1.2 and §1.6.**
   - Checked by the table-driven DSCore test `DSSurfaceResolutionTests` (P3-1). It covers every combination of watchOS, contrast, transparency, backdrop kind, material and `selected`, through a forced `DSTokenContext` and `DSAccessibilityPolicy`.
   - Checked by the React Surface test (P3-4), which runs the same table through `<Theme contrast transparency>` and a fake `matchMedia`.
   - Checked by snapshots of every glass example under Increase Contrast and under forced Reduce Transparency (P3-3, P3-4).
2. **Only DSCore names `glassEffect`, SwiftUI `Material`, `accessibilityReduceTransparency` and `colorSchemeContrast`. On the web only the Surface module names `backdrop-filter`, and no hand-written code names the preference media features or the axis attributes.**
   - The web Surface module is the React `Surface` and its stylesheet, the web counterpart of DSCore's `DSSurface` for ADR-0009 rule 1.
   - Checked by `lint:literals` kind `material`: the Swift symbols outside `swift/Sources/DSCore/`, `backdrop-filter` outside the web Surface module. Fixtures land with P3-1 and P3-4.
   - The attributes and media features are ADR-0019 rule 1's `runtime` kind.
3. **No increased-contrast or reduced-transparency delta file and no `platform` source writes `sys.material.**`, and `sys.material.blur` does not exist.**
   - Checked by the `tokens:build` diagnostic `material/variant-write` in `source/analyze.ts`. It inspects every source of an `*-increased-contrast` or `*-reduced-transparency` context other than its base scheme file, and every `platform` source (fixture `fixtures/broken/material-variant-write/`, P1-3).
   - Checked by the ownership table, where `platform` owns only `sys.font.**` (ADR-0024 §9.1).
4. **Every recipe under `sys.material.glass` is complete and typed.** Every id there except `scrim` belongs to a recipe that holds exactly the seven tokens of §2.1, with their types, ranges and a `ref.blur.*` alias for `blur`, in both base schemes. No `app.prism` key names a material field.
   - Checked by the `tokens:build` diagnostics `material/recipe-shape` and `type/untyped`, with fixtures.
   - Checked by the Ajv `app.prism` schema, which rejects unknown keys.
   - Checked by context completeness.
5. **Every cell of §3.1's table on `glass`, `glassLight`, `vivid`, `inverse` and `raised`, and every row of §3.3, is a pair in `tokens/contrast-pairs.json` and passes for every brand × colorScheme context.** Chips and cells are checked with their primary foreground only.
   - Checked by `contrast:check` (P1-6). `pairs.test.ts` covers gradient backdrops and the `schemes` field.
6. **Text maps tones by §3.1 on both stacks, and a spec cell keyed by a material applies only when Surface publishes that material.**
   - Checked by the Text unit tests over the table in DSCore (P3-1) and React (P3-4), by Card tests of the glass examples under the fallback (P3-3, P3-4), and by the parity report.
7. **V1 and V2 hold for every gradient of every brand, in both interpolation spaces, and both stacks draw the gradient line with CSS angle semantics.**
   - Checked by `contrast:check` (`stops: "all"` and `region: "card-header"`), with a failing fixture gradient. A brand that fails does not build.
   - Checked by a DSCore unit test that the start and end points match the CSS gradient line at the twelve V2 geometries (P3-1).
8. **No text-safe zone is declared anywhere. A vivid Card example sets no `icon`, and its aside holds no text below 24 px. A spec example puts light glass (Surface `glassLight`, or a glass Card with `isSelected`) only over `backdrop: image` or `map`.**
   - Checked by the `app.prism` schema, which has no zone key.
   - Checked by `spec:validate` on the examples (P2-1) and by the gallery lint.
9. **Every spec's `accessibility` block states `reduceTransparency` and `reduceMotion`** (ADR-0011, C-26).
   - Checked by `spec:validate` against `spec/component.schema.json`.
10. **A selected glass Surface, and so a glass Card with `isSelected`, renders `inverse` while the fallback is active.**
    - Checked by snapshots of the Card and Surface `glass-selected` examples under Increase Contrast (P3-3) and by their story tests (P3-4).
11. **`sys.gradient.vivid.default` is sky in light and plum-dusk in dark, and in each base scheme every `sys.gradient.*` token resolves to a gradient of that scheme.**
    - Checked by the IR invariant `gradient/default-scheme` (P1-3), widened by ADR-0024 rule 9, and by the repository build test's resolved values.
