# ADR-0021: Typography rules: thin weights, numerals, units and Dynamic Type

- Status: accepted (§11 emission layout amended by [ADR-0027](0027-font-emission-layout-and-manifest-names.md))
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #21
- Amends: ADR-0004 (decision 3: `density` no longer writes type sizes, and typography weights follow the colorScheme context through a build rule that no context file writes), ADR-0007 (rule 3: the figures of hero numbers), ADR-0008 (Context: the pinned JetBrains Mono version; decision 1: the type-scale multiplier is bounded; decision 3: how font versions and hashes are enforced; decision 4: weights without a named instance; decision 5: which roles are tabular and what the equal-width test covers; decision 6: thin weights; rule 3: what counts as tabular figures), ADR-0010 (the density bullet: density no longer changes type roles' line heights), ADR-0011 (the thin-weight bullet under "Weight and material rules")

## Context

ADR-0008 fixed three font slots, two presets and a role scale. ADR-0011 fixed the accessibility tiers. Both left the typography mechanics to the build, and the Phase 1 design (`tools/tokens/ARCHITECTURE.md`) now needs them:

- which weight a role resolves to, and when;
- which figures it uses;
- how its units map on each stack;
- which Dynamic Type style scales it;
- how the Apple runtime builds the font.

The sources disagree on most of these.

### What the repository says today (working tree, 2026-09-15)

- **Thin weights: four rules and no mechanism (critic C-06; visual-dna B7, B8).**
  - ADR-0008 allows 100–200 only in `type.metric.xl|lg` at ≥ 34 pt. They resolve to **300** under Bold Text, Increase Contrast or below 24 pt (`docs/adr/0008-typography-slots-and-presets.md:28`).
  - ADR-0011 allows weights below 300 only for `type.metric.*` at ≥ 34 pt. They resolve to **400** "through the token layer" (`docs/adr/0011-accessibility-tiers-ci.md:26`). The decision record says "swapped to Regular" (`docs/decisions.md:17`).
  - `spec/components/Text.yaml:106` resolves **every weight below 400** to 400. visual-dna follows it (`docs/research/visual-dna.md:198`) and adds "300 never below 20 px" (`:199`; anti-pattern 16 at `:1129`).
  - fonts-facts wants thin at ≥ 48 pt and "+100 on every weight" under Bold Text (`docs/research/fonts-facts.md:248-249`). dataviz allows Light 300 only at ≥ 48 pt (`docs/research/dataviz-design.md:164`), yet its `DSHeroNumber` offers a 34 pt size (`:237`).
  - In the tokens, `display.xl` "may drop to 200" in dark (`tokens/ref/typography.tokens.json:56`), which is outside `type.metric.*`. `metric.xl` says "200 on dark >= 32 px" (`:392`). `metric.lg` is 32 px (`:398`), under the 34 pt threshold. The 200 weights live only in descriptions: every role has a single `fontWeight`.
  - Nothing can apply any of these rules:
    - The colorScheme contexts write only colors, materials, shadows and gradients (`tools/tokens/ARCHITECTURE.md:482`).
    - Typography is brand-owned `ref.type`.
    - The resolver has no Bold Text input (`tokens/prism.resolver.json:33-82`).
    - `DSTokenContext` is built from scheme, contrast, transparency, motion, density and modality only (`ARCHITECTURE.md:1193`).
    - ARCHITECTURE leaves "Bold Text and thin-weight rules" to DSCore (`:1427`), against ADR-0011's "through the token layer".
- **Weight ceiling (B9).** The typography group description says "600 page H1 only" (`typography.tokens.json:35`). The H1 `title.lg` is 500, and no role uses 600 (`visual-dna.md:195`).
- **Figures (C-07).**
  - ADR-0008 decision 5 and rule 2, ADR-0007 rule 3 and roadmap P3-3 make every `type.metric.*` role tabular and test equal widths (`0008:27`, `:47`; `docs/adr/0007-dataviz-first-class.md:37`; `docs/roadmap.md:73`).
  - The tokens make `metric.xl` and `metric.lg` proportional (`typography.tokens.json:389`, `:411`), and only `metric.md` and `data` tabular (`:433`, `:477`).
  - Agreeing with the tokens: `Text.yaml:107`, visual-dna (`:203`; anti-pattern 18 at `:1131`) and dataviz rule 30 (`dataviz-design.md:163`).
- **Units, text styles, line height, italic (critic G-17; ARCHITECTURE S11).**
  - Every dimension is authored in px (`typography.tokens.json:40-49`).
  - ADR-0011:33 asks for Dynamic Type on Apple and rem on the web. ARCHITECTURE §7.3 already emits `fontSize` as rem (px / 16) and `letterSpacing` as em (`ARCHITECTURE.md:610`). No decision records this, what other dimensions do, or how Apple applies tracking.
  - No role names a `Font.TextStyle` (S11, `ARCHITECTURE.md:77`).
  - ADR-0010:28 gives hit sizes in pt, while the tokens use px.
  - Line heights run from 1.0 to 1.5 (`typography.tokens.json:45`, `:192`). For most roles that is below Onest's natural 1.275 (T1), and no source names the SwiftUI API for it.
  - Onest has no italic (T1). SwiftUI does not synthesize italic; browsers do (`docs/research/arch-apple.md:177`).
- **Density and the type scale.** ADR-0019 §7 and ADR-0024 §6 leave "whether density changes type roles" to this ADR, and ADR-0020 lets it bound `ref.type.scale` (`docs/adr/0020-brand-model.md:138`).
  - ADR-0004 gives density "type sizes" (`docs/adr/0004-dtcg-tokens-style-dictionary.md:23`). ADR-0010 gives it "type roles' line-heights" (`docs/adr/0010-platform-tiers-density-modality.md:27`).
  - No density type size exists anywhere. The density files write only `sys.type.body-line-height` (compact 1.4, regular 1.5, comfortable 1.55; `tokens/sys/density/regular.tokens.json:60-65`), which nothing uses (critic G-03).
  - `Text.yaml:148` calls density "the size lever" on macOS, with no values behind it.
  - DTCG cannot alias one field of a composite, so a body role whose line height followed density would have to restate its whole composite in each of the three density files.
- **The Core Text route (critic G-25).**
  - ADR-0008 decision 4 sends weights without a named instance to the `wght` axis through `kCTFontVariationAttribute`.
  - The only verified `tnum` route so far was `kCTFontFeatureSettingsAttribute` (`fonts-facts.md:176`, `:178`).
  - Both produce a descriptor, while `Font.custom(_:size:relativeTo:)` takes a PostScript name (`:174`).
  - The roadmap's verify list asks about iOS and watchOS behavior, `.monospacedDigit()` on custom fonts, and Bold Text with light numerals (`docs/roadmap.md:72-74`).
- **The font check and the pinned files (critic C-20, G-08).**
  - A brand build must fail on a font without `tnum` (`0008:48`, `brands/README.md:41`). But monospaced faces have no `tnum` (`fonts-facts.md:198`).
  - The pinned JetBrains Mono is 2.304 (`brands/prism/brand.json:9`, `licenses/inventory.json:7`, `0008:18`), but the bundled file is 2.211 (T2).
  - `brand.json`:
    - records two versions and no hash (`:7-9`);
    - points at `fonts/Onest[wght].ttf`, although the files are in `fonts/onest/` and `fonts/jetbrains-mono/`;
    - says the files are not committed (`:12`).
  - No ticket copies the fonts into the Swift bundle or the web package.

### Facts verified for this ADR (2026-09-15)

All probes ran in a scratch directory outside the repository (Xcode 26.6, Node 24.21.0):

- A Node OpenType reader parsed the two bundled files.
- A SwiftPM package that ships both TTFs as a `.copy` resource folder was tested three ways:
  - `swift test` on macOS 26.6.2;
  - `xcodebuild test` on the iPhone 17 simulator (iOS 26.5);
  - `xcodebuild test` on the Apple Watch Series 11 46 mm simulator (watchOS 26.5).

Widths come from `ImageRenderer` images at scale 4. Line metrics come from `Text.Layout` inside a `TextRenderer`.

The review repeated T1 and T2 with a second, independent OpenType reader, and T3, T5, T8 and T9 with a macOS 26.6 probe (`CTFontCreateWithName`, `ImageRenderer`). It also read the 26.5 SDK interfaces behind T4 and T10.

| # | Fact | Evidence |
|---|------|----------|
| T1 | `brands/prism/fonts/onest/Onest[wght].ttf`: <br>• **Identity:** name ID 5 "Version 2.001", `head` modified 2026-08-06, SHA-256 `966c5c29b4755da84b6854d5c21dd4eaa2420225d0e9874de602de176d4a9f31`. <br>• **Weights:** `wght` 100–900 (default 400), nine named instances `Onest-Thin` … `Onest-Black`. <br>• **No italic:** no italic instance, `italicAngle` 0, no `slnt` or `ital` axis. <br>• **Cyrillic:** Russian, Ukrainian, Belarusian, Serbian and Kazakh are complete (162 code points in U+0400–U+052F). <br>• **Figures:** default digits are proportional (advances 665, 363, 566, 599, 633, 616, 623, 505, 622, 620 per 1000). GSUB has `pnum` and `tnum`; `tnum` maps all ten digits to 672. <br>• **Line height:** `hhea` and `OS/2` typo metrics are 970 / −305 / 0 with USE_TYPO_METRICS set, a natural line height of 1.275. | OpenType reader; `shasum -a 256` |
| T2 | `brands/prism/fonts/jetbrains-mono/JetBrainsMono[wght].ttf` is the google/fonts build: <br>• **Identity:** "Version 2.211", unique ID `2.211;JB;JetBrainsMono-Regular`, `head` modified 2020-11-18, SHA-256 `48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda`. <br>• **Weights:** `wght` 100–800. Seven named instances: 100, 200, 300, 400, 500, 700, 800 (**no 600**). <br>• **Figures:** `isFixedPitch` 1, every digit 600, no `tnum` feature. <br>• **Cyrillic:** Russian, Ukrainian, Belarusian and Serbian are complete; Kazakh has 4 of 16 letters; 98 code points in U+0400–U+052F. | same |
| T3 | **Instance names.** After registration, Core Text lists `Onest-Thin` … `Onest-Black`, and for JetBrains Mono `JetBrainsMonoRoman-Thin`, `-ExtraLight`, `-Light`, **`JetBrainsMono-Regular`**, `JetBrainsMonoRoman-Medium`, `-Bold`, `-ExtraBold`. Each name is the instance's `fvar` PostScript name, except the default instance, which takes name ID 6. <br>**Resolution.** `CTFontCreateWithName` resolves every listed name to itself. `JetBrainsMono-Thin` and `JetBrainsMono-SemiBold` silently resolve to **Helvetica**, with no error. `JetBrainsMonoRoman-Regular`, the `fvar` name of the default instance, also becomes Helvetica on iOS and watchOS, while macOS maps it to `JetBrainsMono-Regular`. <br>Everything else in this row holds on iOS, watchOS and macOS. | `CTFontManagerCreateFontDescriptorsFromURL`, `CTFontCopyPostScriptName` |
| T4 | `CTFontManagerRegisterFontsForURL(url, .process, &error)` on a `Bundle.module` file returns `true` synchronously on iOS, watchOS and macOS. It is not deprecated in the 26.5 SDKs (`CTFontManager.h:171-174`: `CT_AVAILABLE(macos(10.6), ios(4.1), watchos(2.0), tvos(9.0))`). | probes; SDK headers |
| T5 | `Font.custom("Onest-Light", size: 48, relativeTo: .largeTitle)`: <br>• without modifiers, "1111" is 67.5 pt wide and "0000" is 127.75 pt; <br>• with `.monospacedDigit()`, both are 128.75 pt at the Large size and 190.25 pt at accessibility3 (watchOS: 115.25 and 147.5). <br>A descriptor with the `kCTFontFeatureSettingsAttribute` `tnum` also gives 128.75 pt. `Font.custom("Onest-Regular", fixedSize: 100).monospacedDigit()` renders both strings 269 pt wide. | iOS, watchOS, macOS probes |
| T6 | **What scales.** `Font.custom(_:size:relativeTo:)` and `Font.system(.body)` scale with `dynamicTypeSize`. `Font.custom(_:fixedSize:)` and `Font.system(size:weight:)` do not: their widths are identical at xSmall, Large and accessibility3. <br>**`@ScaledMetric`.** `@ScaledMetric(relativeTo:)` equals `UIFontMetrics.scaledValue(for:)`: 48 pt `.largeTitle` gives 82.0 at accessibility5 either way. It gives 44.5 / 48 / 71.5 / 82 on iOS and 36.75 / 43.5 / 54.75 on watchOS at xSmall / Large / accessibility3 / accessibility5 (watchOS stops at accessibility3). <br>**Accuracy.** A fixed-size font at the `@ScaledMetric` size renders a four-digit 48 pt string within 1.5 pt of `Font.custom(_:size:relativeTo:)`. <br>**macOS** scales neither. | iOS, watchOS, macOS probes |
| T7 | A descriptor with `kCTFontVariationAttribute` `{2003265652: 250}` yields `Onest-Regular_wghtFA0000` at `wght` 250 on iOS and macOS. | probe |
| T8 | **Bold Text, custom fonts.** A custom font renders **identical pixels** under `legibilityWeight` `.bold` and `.regular`. <br>**Bold Text, system font.** `Font.system(size:weight:)` steps ultraLight → thin, thin → light, light → regular, regular → semibold, medium → bold, semibold → heavy, bold → black, and heavy → black; black stays black. In numbers: 100–300 gain 100; 400–700 gain 200; the result is capped at 900. | iOS, watchOS, macOS probes |
| T9 | `.italic()` on a custom font leaves the pixels unchanged (no synthesis). On the system font it changes them. | same |
| T10 | The iOS, macOS and watchOS 26 SDKs have `View.lineHeight(_: AttributedString.LineHeight?)` with `.multiple(factor:)`, `.exact(points:)`, `.leading(increase:)`, `.normal`, `.tight`, `.loose` and `.variable` (`SwiftUICore.swiftinterface`, `CoreText.swiftinterface`). <br>• `.multiple(factor: f)` makes each line f × the point size tall. At 48 pt, two lines are 96 pt at f 1.0 and 144 pt at 1.5, and they follow Dynamic Type (142 pt at accessibility3). <br>• `.exact(points:)` does not follow Dynamic Type (still 96 pt). <br>• `.lineSpacing(-10)` is ignored (122.5 pt, the natural height). | iOS probe; SDK interfaces |
| T11 | **SwiftUI.** With `.multiple(factor:)` at f 1.0 and f 1.5, the first baseline sits 1.0 × the point size below the top of the line. At 100 pt, `typographicBounds` reports ascent 100 and descent 0 or 50; the natural line has ascent 97 and descent 30.5. <br>**CSS** places the baseline at the half-leading plus the ascent (CSS 2.1 §10.8.1). For Onest that is (f − 1.275) / 2 + 0.97 em: 0.8325 em at f 1.0 and 1.0825 em at f 1.5. | iOS probe |
| T12 | `font-synthesis` is Baseline "widely available" since January 2022, and its value `none` disables synthesized bold, italic and small caps. `prefers-contrast: more` is Baseline since May 2022. | MDN, fetched 2026-09-15 |

## Decision

### 1. Weight ladder

Role weights are multiples of 100.

A role's **standard weight** is its `fontWeight` in `tokens/ref/typography.tokens.json`: the weight it renders in the light scheme, at standard contrast, without Bold Text. The standard weight is 300, 400 or 500.

- 500 is the ceiling. 600 leaves the ladder, and the "600 page H1 only" note is removed (B9).
- Weights above 500 appear only under Bold Text (§3).
- Weights below 300 appear only as §2's dark weight.

The reference brand keeps its values:

| Weight | Roles |
|--------|-------|
| 300 | display.xl, display.lg, metric.xl, metric.lg |
| 400 | display.md, headline, body.*, caption, metric.md, metric.unit, data |
| 500 | title.*, label.*, micro, eyebrow |

### 2. Thin and light weights

- **Thin (100 or 200)** exists only as the `darkWeight` (§4) of a `type.metric.*` role whose `fontSize` is at least 34 px after the brand type scale.
  - It renders in the dark scheme, on every platform.
  - Today exactly one role goes thin: `metric.xl`, 48 px, 300 in light and 200 in dark.
  - `metric.lg` (32 px) cannot be thin. Display roles never are; this settles B7.
  - The watch gets no exception. ADR-0022 keeps the `watch` context free of token deltas, and this rule adds none. At the watch's smallest Dynamic Type size, a 48 px `.largeTitle` role renders at 36.75 pt (T6).
  - A spec that renders a role at a size other than its token size applies the same thresholds to that size. `Text.yaml` renders metric-xl at 40 px on watchOS. That is at least 34 px, so it stays thin in dark: 36.25 pt at the watch's Large size and 30.6 pt at its smallest, inside the envelope of the next bullet. Spec review checks such notes.
- **Light (300)** needs a `fontSize` of at least 20 px (`visual-dna.md:199`). Today the light roles are display.xl 64, display.lg 48, metric.xl 48 and metric.lg 32.
- **Both thresholds apply to token sizes in every permutation.** ADR-0008's "below 24 pt" clause goes, because it can no longer apply:
  - Every role of 34 px or more scales along `.largeTitle` (§7). At the smallest Dynamic Type size that curve keeps 0.927 of the size on iOS and 0.766 on watchOS (T6).
  - So a thin role at the 34 px floor renders at no less than 31.5 pt on iOS and 26 pt on watchOS. Today's 48 px hero renders at no less than 44.5 pt and 36.75 pt.
  - A web reader who lowers the browser's default font size shrinks the hero proportionally. That is the reader's choice, and it is accepted.
- **Why 34 and not fonts-facts' 48.** 34 is the threshold of the accepted ADRs and of decision #11. The only thin role is 48 px, so a stricter number would change nothing that renders today, only what a future role must meet.

### 3. Increase Contrast and Bold Text

`s` is the standard weight, or §2's dark weight where it applies. Bold Text is computed from `s`, never from the Increase Contrast result, and it applies whether or not Increase Contrast is also on:

| `s` | Increase Contrast | Bold Text (with or without Increase Contrast) |
|-----|-------------------|-----------------------------------------------|
| 100, 200, 300 | 400 | 400 |
| 400 | 400 | 600 |
| 500 | 500 | 700 |
| 600 / 700 / 800 / 900 (no role today) | unchanged | 800 / 900 / 900 / 900 |

- **Increase Contrast** resolves to `max(400, s)`. Thin becomes Regular, as decision #11 says. Light becomes Regular too, as `Text.yaml` already specifies. Nothing else changes.
  - On Apple the trigger is `colorSchemeContrast == .increased`.
  - On the web it is ADR-0019's root contrast switch: `data-ds-contrast="more"` on `<html>`, or `prefers-contrast: more` when the attribute has no valid value.
- **Bold Text** resolves to `s ≤ 300 ? 400 : min(900, s + 200)`.
  - The trigger is `legibilityWeight == .bold` on iOS, iPadOS and watchOS. macOS and the web have no such setting.
  - For `s` of 300 and above this is exactly the step SwiftUI applies to system text (T8). Signature text therefore changes as much as text in every other app, and the Native preset gets the same numbers.
  - Thin weights go to 400, not to the system's +100.
- **Both at once.** Bold Text wins: its result is never lighter than the Increase Contrast result.
- **Reference-brand outcomes:**

  | Roles | Normal | Increase Contrast | Bold Text |
  |-------|--------|-------------------|-----------|
  | display.xl, display.lg, metric.lg | 300 | 400 | 400 |
  | metric.xl | 300 light, 200 dark | 400 | 400 |
  | every 400 role | 400 | 400 | 600 |
  | every 500 role | 500 | 500 | 700 |

### 4. Mechanism: role data plus one build rule

The mechanism is neither a resolver modifier nor twin tokens. Each role carries its own data, the build applies one rule after resolution, and the runtimes only select a value.

**Source.** Every `ref.type.<role>` in `tokens/ref/typography.tokens.json` has `$value.fontWeight` (its standard weight) and these `$extensions["app.prism"]` keys:

| Key | Meaning | Values | Required |
|-----|---------|--------|----------|
| `slot` | font slot | `ui`, `display`, `mono` | every role |
| `numeric` | figures (§5) | `proportional`, `tabular` | every role |
| `textStyle` | Dynamic Type curve (§7) | a `DSTextStyle` case | every role |
| `darkWeight` | thin weight in the dark scheme (§2) | 100, 200 | allowed only on `type.metric.*` |

- Only `ref.type.*` roles declare these keys.
- `sys.type.<role>` (ADR-0024 §6) and component typography tokens are whole-value aliases that inherit the keys through folding (ARCHITECTURE §5.4).
  - ADR-0024 §4.1 already lists `darkWeight` among the folded keys.
  - As with every folded key, an alias that declares one fails the build with ADR-0024's `extension/alias-override`.
- Outside `ref.type.*`, no typography value and no `fontWeight` token has a literal weight below 400 (`type/weight-outside-role`). ADR-0024 already makes every `sys` typography token and every `comp` token an alias (`tier/sys-literal`, `tier/alias-direction`). This check covers what remains: a typography token under `ref` outside `ref.type`, and any `fontWeight` token.

**Build.** After the brand type scale, `engine/to-ir.ts` applies one rule from `ir/typography.ts` to every typography value in every permutation. It covers `ref`, `sys` and `comp` alike, so alias chains and `var()` chains agree:

```
s          = (base scheme is dark && darkWeight != null) ? darkWeight : fontWeight
fontWeight = colorScheme is an *-increased-contrast context ? max(400, s) : s
boldWeight = s <= 300 ? 400 : min(900, s + 200)
```

- `boldWeight` is a derived field of `IRTypography`, as the spring settle is for transitions. `darkWeight` is folded but never emitted.
- The result depends only on colorScheme: the dark scheme and the increased-contrast deltas. The generators need no special case:
  - CSS puts the weights into the scheme blocks and the contrast variant blocks.
  - Swift switches on `colorScheme` and `contrast`.
  - TypeScript lists `$values` and `$increasedContrast`.
- Each role still varies along a single runtime axis, colorScheme (ARCHITECTURE §5.7 rule 2). The increased-contrast and reduced-transparency deltas stay disjoint. The `apple` and `watch` platforms stay identical.
- The scheme dependence is derived, not declared. No colorScheme file writes a typography id, and `sys.type.*` stays in `sys/base`. ADR-0024 §6's "moves to that modifier's files" applies only to a role whose source value depends on an axis.

**Outputs.** The Swift `DSTypeRole` gains `boldWeight` (§9), and its `tracking` becomes `trackingEm` (§6). CSS and TypeScript gain nothing, because the web has no Bold Text.

**Runtimes.**

- **Apple.** DSCore renders `role.boldWeight` when `DSAccessibilityPolicy.boldText` is on and `role.weight` otherwise. The policy defaults to `legibilityWeight == .bold` and can be overridden for previews and snapshots. Increase Contrast needs no runtime code: `DSTokenContext.contrast` already selects the floored value.
- **Web.** Nothing to do. `tokens.css` switches the weights under the contrast switch, and Tailwind's `text-ds-<role>` reads the same variable (`--text-ds-<role>--font-weight`, ARCHITECTURE §9.4).

### 5. Numerals

| Role | Figures |
|------|---------|
| `metric.xl`, `metric.lg` | proportional (static heroes) |
| `metric.md`, `data` | tabular |
| every other role | proportional |

- **Live values are tabular** on any role: `Text`'s `numeric: tabular` overrides the role's default. Any value that changes while visible must set it:
  - timers and counters;
  - live metrics;
  - chart ticks and tooltips, and scrubber readouts;
  - delta badges;
  - numeric table columns.

  Component specs state this in their `behavior` block.
- **Proportional** means the family's default figures: CSS `font-variant-numeric: normal`, and no modifier on Apple.
- **Tabular** means `tabular-nums` on the web and `.monospacedDigit()` on Apple. `.monospacedDigit()` applies `tnum` to custom fonts and keeps Dynamic Type (T5).
- **The equal-width test** checks that "1111" and "0000" render at the same width (ADR-0008 decision 5).
  - It covers the tabular roles and a `metric.xl` set to `numeric: tabular`.
  - On Apple it runs at the Large size, at accessibility3 and under Bold Text.
  - A negative case asserts that the default `metric.xl` renders "1111" narrower than "0000".

### 6. Units, density and the brand type scale

| Value | Source | Web | Apple |
|-------|--------|-----|-------|
| `fontSize` | px | rem = px / 16 | pt = px, scaled by the role's `textStyle` (§7) |
| `letterSpacing` | px at the role's size | em = letterSpacing / fontSize | em × the scaled size, through `.tracking` |
| `lineHeight` | unitless ratio | unitless `line-height` | `.lineHeight(.multiple(factor:))` (§8) |
| every other dimension (space, size, hit, radius, stroke, blur, shadow) | px | px | pt = px |

- **One token px** is one CSS px and one Apple point. ADR-0010's 28 pt and 44 pt and the tokens' 28 px and 44 px are the same numbers, and so are ADR-0011's 34 pt and this ADR's 34 px.
- **Only type follows the reader's text size:** rem on the web, Dynamic Type on Apple.
  - Other dimensions stay fixed on both stacks.
  - Components that hold text use those dimensions as minimum sizes (`min-height`, `.frame(minHeight:)`). That is how ADR-0011's "components grow with text" holds.
  - Icon sizes belong to the icon work (critic C-23).
- **The rem base is the browser default.** Prism CSS never sets `font-size` on `html` or `:root`, and consumer apps must not either.
- **Drawing text outside CSS.** Canvas code that draws text with the px values in `tokens.ts` multiplies them by the root font size / 16. SVG text uses the CSS variables.
- **Density does not change typography.** This settles the question ADR-0019 and ADR-0024 leave here.
  - Role sizes, weights and line heights are the same in compact, regular and comfortable. Density keeps spacing, control and row sizes; modality keeps the hit area (ADR-0024 §7).
  - No density file declares `sys.type.*`. The unused `sys.type.body-line-height` is deleted. ADR-0024 §9's ownership table already leaves `sys.type` out of the density globs, so the ownership check enforces this.
  - The text size follows only the brand type scale and the reader (Dynamic Type, rem).
  - On macOS, which has no Dynamic Type, text renders at the role sizes.
  - A role whose size or line height varies with density needs a new ADR. Such a role must also not vary with the scheme, because of the one-axis rule.
- **The brand type scale is bounded:** `1 ≤ ref.type.scale ≤ 1.25`. ADR-0020 §1 leaves this bound to this ADR.
  - Below 1, the 12 px functional roles (caption, label.sm, metric.unit) would fall under the 12 px floor for functional text (`Text.yaml`, visual-dna principle 15).
  - Above 1.25, `display.xl` would pass 80 px, the largest hero the references show (`visual-dna.md:185`).
  - The reader's own text size scales further on both stacks. The build applies §2's thresholds to the scaled sizes.

### 7. Dynamic Type text styles

Each role's `textStyle` is chosen by one rule:

1. Take the Apple style whose iOS default size (at the Large setting) is nearest to the role's size.
2. On a tie, take the larger style.
3. Among styles of equal size, take the one named like the role family.

There is one exception: `metric.unit` follows `largeTitle`, so a hung unit keeps its proportion to the hero it sits beside.

| Role (px) | `textStyle` (iOS default pt) |
|-----------|------------------------------|
| display.xl 64, display.lg 48, display.md 40, title.lg 32, metric.xl 48, metric.lg 32 | `largeTitle` (34) |
| title.md 24 | `title2` (22) |
| title.sm 20, metric.md 20 | `title3` (20) |
| headline 18 | `headline` (17) |
| body.lg 17 | `body` (17) |
| body.md 15, body.sm 14, label.lg 15 | `subheadline` (15) |
| label.md 13, eyebrow 13, data 13 | `footnote` (13) |
| label.sm 12, caption 12 | `caption` (12) |
| micro 11 | `caption2` (11) |
| metric.unit 12 | `largeTitle` (exception) |

- The table is the decision. The rule derived it from the role sizes at scale 1, and the brand type scale never changes a role's `textStyle`: role composites are system-owned (ADR-0020 §1).
- The style selects only the scaling curve. The role keeps its own size, weight and family.
- macOS has no Dynamic Type (T6).
- Clamps stay in the specs; for example, metric-xl clamps at accessibility3 (`spec/components/Text.yaml:115`).

### 8. Line height

**The CSS model is the definition.** A line is `lineHeight × size` tall. The difference between that height and the face's ascent plus descent is split in half: one half goes above the text, the other below.

- **Web:** a unitless `line-height`.
- **Apple:** `.lineHeight(.multiple(factor: lineHeight))`. It produces the same line pitch as CSS and follows Dynamic Type (T10).
  - `.lineSpacing` is not used: it cannot tighten below the natural 1.275.
  - `.exact(points:)` is not used: it does not scale.
- **First-baseline correction.** SwiftUI places the first baseline 1.0 × the size below the top of the line (T11). CSS places it at `(lineHeight − (A + D)) / 2 + A`, where A and D are the face's ascent and descent as fractions of the size.
  - DSCore therefore raises the text by `Δ = size × (1 − lineHeight / 2 − (A − D) / 2)` without changing the line box.
  - For Onest, Δ is 0.1675 × size at a line height of 1.0 (8.0 pt for the 48 pt hero) and −0.0825 × size at 1.5.
  - A and D come from the resolved face at runtime (Onest: 0.97 and 0.305, T1).
  - The shift must also move the `.firstTextBaseline` and `.lastTextBaseline` alignment guides by Δ. Otherwise a hung unit, which is baseline-aligned beside its hero and has a different Δ, would sit off the hero's visible baseline (6 pt apart for metric.xl and metric.unit).
  - The candidate is `.offset(y: −Δ)` plus `.alignmentGuide` overrides for both baselines. Whether it holds on iOS, watchOS and macOS is a P3-1 verify item. If it fails, DSCore keeps SwiftUI's placement and `Text.yaml` records the difference.

### 9. Rendering on Apple (G-25)

Both presets use one route, in a DSCore view modifier (P3-1):

1. `@ScaledMetric(relativeTo: role.textStyle)` over `role.size` gives `size`.
2. `weight` is chosen as §4 describes.
3. The font:
   - **Signature:** `Font.custom(face.postScriptName(for: weight), fixedSize: size)`.
   - **Native:** `Font.system(size: size, weight:, design:)`, with 100 → `.ultraLight`, 200 → `.thin`, 300 → `.light`, 400 → `.regular`, 500 → `.medium`, 600 → `.semibold`, 700 → `.bold`, 800 → `.heavy`, 900 → `.black`.
4. `.monospacedDigit()` when `numeric == .tabular`.
5. `.tracking(role.trackingEm × size)`.
6. `.lineHeight(.multiple(factor: role.lineHeight))`, plus §8's baseline shift.
7. `.environment(\.legibilityWeight, .regular)` on the rendered text. Prism has already applied Bold Text, and SwiftUI would otherwise step system faces a second time (T8).

**Why a fixed size from `@ScaledMetric`.**

- `Font.system(size:)` does not scale (T6), so the Native preset needs it.
- Tracking and the baseline shift need the scaled size too.
- `@ScaledMetric` is the documented `UIFontMetrics` scaling (T6), so the Signature preset loses nothing.
- One route keeps both presets identical.

**Named instances only.** A weight maps to the face's named instance by PostScript name. A weight without an instance maps to the nearest heavier instance, and failing that to the heaviest.

- The web gives the same result for a variable font, which clamps to its `wght` range.
- The one divergence is a weight inside the range that has no instance. For JetBrains Mono 600 the web renders 600 exactly, while Apple renders 700. No role uses the mono slot.
- v1 uses no descriptors, no `kCTFontVariationAttribute` and no `kCTFontFeatureSettingsAttribute`. The descriptor route works (T5, T7) and is the documented fallback if a brand ever needs a weight between instances.
- For every role, the default brand's Apple face for the role's slot must have an exact named instance at each weight the rule can produce for that role: `fontWeight` in every permutation and `boldWeight` (`type/weight-instance`). Onest has all nine. JetBrains Mono lacks 600, which no role needs, because no role uses the mono slot.

**Registration (critic R-04).**

- `DSFontRegistrar` registers the active brand's files synchronously with `CTFontManagerRegisterFontsForURL(url, .process, &error)` (T4).
- It runs from `DSTheme.init`, once per process and before the first render, and treats "already registered" as success.
- It then asserts that `CTFontCreateWithName` returns every PostScript name in `DSBrand.faces` unchanged, because an unknown name silently becomes Helvetica (T3).

### 10. Italic and synthesis

- No token, role, prop or API expresses italic or oblique. DTCG's typography composite has no style property, and neither bundled family has an italic (T1, T2).
- SwiftUI never synthesizes italic (T9).
- On the web, `Text` and every Prism component that renders text set `font-synthesis: none` (T12). An `em` or `i` inside Prism text therefore renders upright on both stacks, and no bold is faked either.
- Emphasis is expressed through tone (visual-dna §1 principle 8).
- Italic requires a family with a true italic, and an ADR.

### 11. Font files, versions and `fonts:check` (C-20, G-08)

**Source.**

- Each font lives in `brands/<brand>/fonts/<family-dir>/<file>.ttf`, with its `OFL.txt` beside it.
- ADR-0020 owns the shape of `brand.json`, including each font file's `platforms`. Whatever that shape is, every font file's entry carries these fields:

  | Field | Content |
  |-------|---------|
  | `family` | family name |
  | `file` | path relative to the brand folder |
  | `version` | name ID 5 without "Version " |
  | `sha256` | SHA-256 of the file |
  | `postscript` | weight → the PostScript name Core Text exposes (T3); required when the file is bundled on Apple |

**Pins.** Onest 2.001 and **JetBrains Mono 2.211**: the files already in the tree (T1, T2). JetBrains Mono is re-pinned rather than replaced:

- 2.211 is the google/fonts build, the same source as Onest.
- It covers Russian, Ukrainian, Belarusian and Serbian.
- The mono slot sets only identifiers and code.
- 2.304's extra code points (Kazakh) are not a requirement (ADR-0008 decision 7).

A later move to 2.304 is a pin change that `fonts:check` verifies.

**`fonts:check`** (`tools/fonts/check.ts`, P1-8) runs these checks on every font file a repo brand serves, on either platform (this includes Native's self-hosted Inter, ADR-0020 §5):

1. The file exists, with an `OFL.txt` in the same folder.
2. Its SHA-256 equals `sha256`.
3. Name ID 5 equals "Version " + `version`.
4. The cmap covers U+0410–U+044F, U+0401 and U+0451.
5. **Tabular digits.** At the default instance, the advance widths of the glyphs for U+0030–U+0039 are all equal, either without any feature or after the font's GSUB `tnum` single substitutions (lookup type 1, including type 1 subtables wrapped in extension lookups, type 7). A font that meets neither condition fails.
6. Every `postscript` entry names an `fvar` instance with that `wght` coordinate. The name is the instance's `postScriptNameID` string, or name ID 6 for the instance at the default coordinates.

The same command also enforces ADR-0020 rule 14, the 2 MiB budget for the fonts bundled into `DSTokens`, so `fonts:check` has one definition.

The check prints one table row per file and check, and exits 1 on any failure.

- Both bundled fonts pass.
- A synthesized Latin-only font fails, and so does a synthesized font with proportional digits and no `tnum`.
- Equal widths at the role weights are covered by §5's stack tests.
- `fonts:check` and T1–T2 replace critic C-20's request to dump the bundled files into `docs/research/fonts/fonts-analysis.json`; the research dump is not extended.

**Emission.** `tokens:build` writes the font files, so the stale check guards them:

- **Apple.** Every font file a repo brand bundles on Apple, with its `OFL.txt`, is copied byte for byte into `swift/Sources/DSTokens/Resources/Fonts/<family-dir>/`, deduplicated by SHA-256 (ADR-0020 §7). DSTokens declares `.copy("Resources/Fonts")`, which keeps the folders; the T4 probe used the same setup. This folder is a new owned root and joins `OWNED_ROOTS` and the CI stale-check list (ADR-0024 §11).
- **Web.** For every font file a brand serves on the web, `web/packages/tokens/src/generated/<brand>/fonts/` receives the files below. They sit inside the existing owned root `web/packages/tokens/src/generated`.
  - one woff2 per file, `<family-kebab>-wght.woff2`, converted from the same TTF without subsetting;
  - the `OFL.txt`;
  - `fonts.css`, with one `@font-face` per file: `font-family` is the entry's `family`, `font-weight: <min> <max>` comes from `fvar`, `font-style: normal` and `font-display: swap`. A header comment names the source version and SHA-256.

This replaces ADR-0008 decision 3's "the parity report diffs them".

- The woff2 encoder must be deterministic; choosing it is a P1-8 verify item. The fallback is to ship the TTF as `format("truetype")`.
- How the package exports `fonts.css` is decided by ADR-0019 and P3-2.
- Fonts of brands built outside this repository (ADR-0020's deferred route 2, which would register them from `Bundle.main`) are for that route to specify.

### 12. Typography values in implementation code

`tools/lint/literals.ts` gains a `typography` kind, next to ADR-0023's `motion`. Generated output stays excluded. It flags:

- **CSS:**
  - literal values of `font-weight` and `font-style` (a `var(--ds-…)` value passes);
  - `font-synthesis` with any value other than `none`;
  - `font-size` on `html` or `:root`.
- **TS/TSX class strings:** Tailwind weight utilities (`font-thin` … `font-black`) and `italic`.
- **Swift outside `swift/Sources/DSCore/`:** `Font.custom(`, `Font.system(`, `.fontWeight(`, `.weight(`, `.bold(`, `.italic(`, `.monospacedDigit(`, `UIFont(`, `NSFont(` and `legibilityWeight`.

The implementer tunes the patterns against fixtures, with one hit and one miss per pattern. This section fixes the intent, not the regular expressions.

## Alternatives considered

- **ADR-0008's 300 fallback.** Decision #11, which the owner chose, says Regular. ADR-0011, `Text.yaml` and visual-dna say 400. Under Increase Contrast a 300 weight still draws a light stroke.
- **fonts-facts' and dataviz's 48 pt threshold.** No role between 34 and 48 px is thin, so 48 would change nothing today and would contradict the accepted ADRs' 34.
- **Thin in light, or on display roles** (the token description "display.xl may drop to 200"). The ADRs restrict thin weights to metric roles, and visual-dna's light mood has no thin weights.
- **A `legibility` resolver modifier.** Lost on four counts:
  - The web has no Bold Text signal.
  - Increase Contrast is already a colorScheme variant, so a modifier would either tie two axes to one OS setting or need a new web attribute (ADR-0019's contract).
  - It doubles the permutations to 864.
  - Roles would vary on two runtime axes: colorScheme for the dark weight and the modifier for the fallback. That breaks ARCHITECTURE §5.7 rule 2.
- **Weight tokens owned by the colorScheme contexts** (the critic's second option). Lost on four counts:
  - It needs a change to ADR-0024 §9's ownership table.
  - Every weight-varying role would have to be restated as a composite with sub-value aliases, because DTCG cannot alias one field of a composite.
  - The same formula would be copied into six context files.
  - Bold Text would still need a derived value.
- **Twin roles** (`metric.xl-legible`). Every consumer would have to pick the twin, which CI cannot enforce, and the role count would double.
- **The rule in DSCore and the React `Text` only**, the way ADR-0022 resolves material fallbacks at runtime. That is two implementations of one rule. ADR-0022 substitutes a whole material inside Surface; a weight is a plain value that Tailwind's `text-ds-*` utilities read outside any component, and those utilities would never get the floor. ADR-0011 also asks for the token layer.
- **No thin weights on the watch**, as a build-derived platform delta. ADR-0022 has just removed the last difference between the `apple` and `watch` token contexts. The watch hero stays inside §2's envelope: 36.75 pt at the smallest Dynamic Type size for the 48 px token, and 30.6 pt for `Text.yaml`'s 40 px watch size (T6), above the 26 pt that §2 accepts for a 34 px role.
- **Bold Text as +100** (fonts-facts rec 6). For body text, 400 → 500 is barely visible, and it is less than the OS does for every other app (400 → 600, T8). The Native preset would also diverge from Signature.
- **Letting SwiftUI bold system faces.** The OS maps 200 → 300, below the floor, and would step Prism's own weights a second time.
- **Tabular figures on every metric role** (ADR-0008 decision 5 as written). Tabular figures on a static hero are a visual-dna anti-pattern (anti-pattern 18) and contradict dataviz rule 30. Alignment only matters for values that change.
- **`Font.custom(_:size:relativeTo:)` for Signature and `@ScaledMetric` only for Native.** That is two routes, and tracking and the baseline shift need the scaled size anyway.
- **The descriptor route in v1** (T5, T7). It works, but no role needs a weight between instances, and `.monospacedDigit()` already covers `tnum`. It stays the fallback.
- **`.lineSpacing` or `.exact(points:)`.** `.lineSpacing` cannot go below the natural height, and `.exact(points:)` does not scale (T10).
- **Accepting SwiftUI's baseline placement by default.** Hero numerals would sit 8 pt lower in their 48 pt box than on the web and the direction board. It stays the fallback if the P3-1 verify item fails.
- **Bundling JetBrains Mono 2.304** (ADR-0008 context, fonts-facts rec 1). It needs a new download and new instance-name checks, for 24 code points (Kazakh) that nothing requires. It remains a later pin change.
- **Defining the check as "`tnum` present".** Presence does not prove equal advances: a font with a broken `tnum` would pass, and JetBrains Mono, which is tabular without `tnum`, would fail.
- **Allowing browser italic synthesis, or bundling italics.** Onest has no italic (T1) and SwiftUI does not synthesize one (T9), so the stacks would differ. No role needs italic.
- **rem for every dimension.** Spacing and controls would grow with the browser's text size while Apple's stay fixed. ADR-0011 asks only type roles to scale.
- **Body line height by density** (ADR-0010 and visual-dna §2.2 as written: 1.4 / 1.5 / 1.55). Lost on two counts:
  - DTCG cannot alias one field of a composite, so the three body composites would be restated in three density files, four copies of each role to keep in sync.
  - The gain is 1.5 px per line at 15 px.
  A folded per-density key on the role would avoid the copies, but it would move theming data out of the density modifier into a second, hidden resolver.
- **Density type sizes** (ADR-0004 as written). No values exist anywhere: not in the tokens, the seeds or visual-dna. On macOS, which lacks Dynamic Type, the references' desktop dashboards already measure at the role scale (`visual-dna.md:178`).
- **An unbounded `ref.type.scale`.** A brand could push the 12 px functional roles under the 12 px floor, or the thin hero under 34 px, and only the per-permutation checks would notice.
- **Text styles by meaning** (every `body.*` role → `.body`). The nearest-size rule is checkable, and it makes a role whose size matches an Apple style follow that style exactly (body.md 15 = `subheadline`).

## Consequences

- **One thin rule, checked everywhere.** The build and CI check one thin-weight rule over every permutation.
  - Exactly one role goes thin: `metric.xl`, in the dark scheme, on every platform.
  - `display.xl` stays 300 in dark. No code ever applied the description's "may drop to 200".
- **Four roles vary by scheme.** `display.xl`, `display.lg`, `metric.xl` and `metric.lg` now depend on colorScheme: the increased-contrast deltas, plus the dark scheme for `metric.xl`.
  - `tokens.css` gains declarations in the scheme and contrast blocks.
  - The Swift typography table switches on scheme and contrast.
  - `tokens:diff` would class the change as an axis change (major), but no release tag exists yet.
  - No typography value depends on density or platform.
- **Density loses its typography.** `sys.type.body-line-height` is deleted, compact body text keeps a line height of 1.5, and `Text.yaml`'s "macOS: density is the size lever" note goes. ADR-0004 decision 3 and ADR-0010's density bullet no longer mention type.
- **Brand type scale.** `type/scale-range` rejects a `ref.type.scale` outside [1, 1.25], in the reference source and in every brand override. The value lives in `brand.tokens.json`, not `brand.json`, so the brand schema does not see it.
- **Bold Text changes every role on Apple**, so layouts must survive 700-weight labels. P3-3 adds Bold Text snapshots.
- **Flavors.** The Tokens Studio flavor shows authored weights only. The derived dark and Increase Contrast weights appear in the Figma-native flavor, and the generated export README says so.
- **Web utilities.** Tailwind's `--text-*` namespace carries no figure or family sub-key (ARCHITECTURE F24). The web `Text` component, or `font-ds-<slot>` plus `tabular-nums`, is the complete path; ADR-0019 decides whether a composite utility is emitted.
- **Other brands.** Brands whose families lack thin instances (Golos Text, Rubik) render the nearest heavier instance on both stacks. That keeps ADR-0008's list of alternates valid, while the reference brand stays exact.
- **Package size.** Two TTFs (about 190 KB each) join the Swift resources, and one woff2 per bundled file joins each web brand folder.
- **Neighbouring ADRs.**
  - ADR-0019 owns the name of the contrast switch.
  - ADR-0020 owns the brand file beyond the font fields, brands built outside the repository and the Native preset (critic C-05, R-05).
  - ADR-0024 owns the folded-key rule, whose §4.1 list already includes `darkWeight`, and the ownership table that keeps `sys.type` out of density.
  - ADR-0022 resolves materials at runtime, while this ADR resolves weights in tokens, for the reason given under Alternatives.
  - ADR-0023 adds the `motion` lint kind; this ADR adds the `typography` kind.
- **Documents that follow this decision:**
  - ARCHITECTURE §1, §3.1, §3.3, §4.1, §4.2, §5.4–§5.7, §7.3, §7.7, §9.0, §9.7, §14 and §16.1;
  - `tokens/README.md`, `tools/tokens/README.md`, `tools/README.md`, `brands/README.md`;
  - roadmap P1-1, P1-3, P1-5, P1-8, P3-1, P3-3, P3-4 and the verify list;
  - `agent/SKILL.md`;
  - `spec/components/Text.yaml`;
  - `licenses/inventory.json`;
  - superseded notes in visual-dna, fonts-facts, fonts, dataviz-design and arch-apple, and the critic's actions table;
  - `tokens/sys/density/*.tokens.json` (the deleted `sys.type.body-line-height`);
  - with P1-8: `Package.swift` (`.copy("Resources/Fonts")`) and the CI stale-check list (the Swift font root);
  - the status lines of ADR-0004, ADR-0007, ADR-0008, ADR-0010 and ADR-0011.

## Rules that follow

1. **Weight ladder.** Standard role weights are 300, 400 or 500, and thin weights exist only as a metric role's `darkWeight` of 100 or 200. Every role declares `slot`, `numeric` and `textStyle`, and those keys (and `darkWeight`) appear only on `ref.type.*`. Checked by Ajv against `tools/tokens/schema/app-prism.schema.json`, by ADR-0024's `extension/alias-override`, and by the `tokens:build` diagnostics `type/weight-ladder`, `type/role-metadata` and `type/weight-outside-role` (`source/analyze.ts`, P1-3), with one fixture under `fixtures/broken/` per code.
2. **Where thin and light render.** A resolved weight below 300 occurs only on a `type.metric.*` role (or an alias of one) with `fontSize` ≥ 34 px after the type scale, in the `dark` and `dark-reduced-transparency` contexts. Weight 300 occurs only at ≥ 20 px. Checked over all permutations by `type/thin-weight` and `type/light-weight` (`ir/typography.ts`, P1-3).
3. **Increase Contrast and Bold Text.** Every typography weight is ≥ 400 in every `*-increased-contrast` permutation, and `boldWeight` follows §3's formula. Checked by an IR invariant in `tokens:build`, by `ir/typography.test.ts` (the full table), and by `GeneratedTokenTests.swift`, which asserts `weight` and `boldWeight` for every role and context (P1-5).
4. **Named instances.** For every role, the default brand's Apple face for the role's slot has an exact named instance at every `fontWeight` and `boldWeight` the rule produces for that role. Checked by `type/weight-instance` (`ir/typography.ts`, P1-3) against `brand.json` `postscript`. `fonts:check` checks those names against the font file.
5. **Figures.** Figures follow §5. Checked by the equal-width tests in the P3-3 Text snapshots (Apple: widths within 0.5 pt at Large, accessibility3 and Bold Text) and in the P3-4 browser tests (`getBoundingClientRect`). Each covers the tabular roles and a `metric.xl` with `numeric: tabular`, plus the proportional negative case. "Values that update while visible use `numeric: tabular`" has no machine check: each component spec with live values states it in its `behavior` block, and spec review checks that.
6. **Units.** Units follow §6. Checked by `transforms/dimension.test.ts` and `transforms/typography.test.ts` (rem = px / 16, em tracking, unitless line height, `trackingEm` in Swift), by the CSS cascade simulator, and by `lint:literals` kind `typography` (no root `font-size`).
7. **Rendering on Apple.** DSCore renders through §9's route, applies Bold Text exactly once, registers fonts synchronously and asserts every PostScript name. DSCoreTests (P3-1) check:
   - the weight chosen under `boldText` for every role;
   - identical pixels for DS text under `legibilityWeight` `.bold` and `.regular` when the policy is off;
   - line pitch = factor × size (±0.5 pt), measured with `Text.Layout`;
   - the first baseline and the `.firstTextBaseline` guide at §8's CSS position (±0.5 pt). If the §8 verify item fails, the test instead pins SwiftUI's placement, which `Text.yaml` records;
   - fonts registered through `FontRegistrationTests`, run on the macOS host and on the iOS and watchOS simulators.
8. **No italic and no synthesis.** Checked by `lint:literals` kind `typography` and by a P3-4 browser test asserting a computed `font-synthesis: none` on `Text`.
9. **`fonts:check`.** It passes for every repo brand, and synthesized Latin-only and proportional-digit fonts fail it. It also enforces ADR-0020's 2 MiB budget. It runs as a gated `contracts` step whose gate file is `tools/fonts/check.ts` (P1-8).
10. **Font files on both stacks.** The Swift font resources equal the source bytes, and the web woff2 is derived from them. Checked by `tokens:build --check` and the CI stale check, over the new root `swift/Sources/DSTokens/Resources/Fonts` and the existing root `web/packages/tokens/src/generated`. ADR-0024's `roots.test.ts` asserts that the CI list includes the new root.
11. **No typography literals in code.** Implementation code contains no literal weight, style or font construction outside DSCore. Checked by `lint:literals` kind `typography`, with fixtures.
12. **Density and the type scale.** No density context declares a `sys.type.*` id, and `ref.type.scale` lies in [1, 1.25] in the reference source and in every brand context. Checked by ADR-0024's ownership check, whose density globs exclude `sys.type`, and by `type/scale-range` (`source/analyze.ts`, P1-3), each with a broken fixture.
13. **Changing any threshold or formula** — 34 px, 20 px, the 400 floor, §3's Bold Text formula, the 500 ceiling or the type-scale bounds — requires a new ADR.
