# Tokens

Single source of truth for every visual value in Prism. Format: **W3C Design Tokens (DTCG) 2025.10** — Format, Color and Resolver modules — validated against the published JSON Schemas (from P1-1 offline, by `pnpm tokens:validate` against vendored copies; ADR-0024 §10). Built by Style Dictionary 5 through a resolver driver into Swift, CSS / Tailwind, TypeScript, and Tokens Studio / Figma flavors (ADR-0004); the build's design is `tools/tokens/ARCHITECTURE.md`. Nothing in `swift/` or `web/` may contain a literal color, size, font name or duration.

## Tiers (path segments)

| Tier | Prefix | Who edits | Aliases to |
|------|--------|-----------|------------|
| Primitive | `ref.*` | system maintainers; brands override the allowlisted ids (`brands/README.md`, ADR-0020) | nothing, or `ref.*` (semantic slots, series slots) |
| Semantic | `sys.*` | system maintainers | `ref.*` or `sys.*`; which values may be literals is ADR-0020 §3 (colors are aliases, aliases with `app.prism.alpha`, or pure white or black); typography always aliases a `ref.type.*` role (ADR-0024 §5.6) |
| Component | `comp.<component>.*` | system maintainers only | `sys.*` only, whole-value; one token per component choice, bound by the component's spec (ADR-0024 §5) |

Emitted names drop `sys.`: `sys.color.bg.fill.accent` → `--ds-color-bg-fill-accent`, TypeScript key `color.bg.fill.accent`, Tailwind `bg-ds-fill-accent` (through Tailwind's per-utility theme namespaces such as `--background-color-ds-*` and `--text-color-ds-*`; the build fails if two tokens would produce the same utility), Swift `DSColor.bgFillAccent`, a member of the brand-scoped `DSColor` reached as `tokens.color.bgFillAccent` (ADR-0019 §6, ADR-0020 §7). Component tokens keep their component name: `comp.button.primary.bg.rest` → `--ds-button-primary-bg-rest`. `ref.*` keeps its prefix: `--ds-ref-color-neutral-100`. Component specs bind `sys.*` roles of the bindable categories (without the prefix and without `$root`) and their own `comp.<component>.*` tokens, never `ref.*` or another component's tokens (ADR-0024 §5); the schema regex and `spec:validate` enforce it. Every naming rule is in `tools/tokens/ARCHITECTURE.md` §8; the full list of emitted names is the generated `manifest.json`.

## Naming

- **Names.** Every token and group name is lowercase kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`), so digit-only segments such as `space.4` and `elevation.2` are fine; `$root` is the only name that starts with `$` (ADR-0024 §2). A group's base token is `$root`: public paths drop it (`color.bg.surface`), and references write it (`{sys.color.bg.surface.$root}`).
- **Types.** A token without its own `$type` must have the same type as every `$type` declared on its ancestor groups, in every document the resolver loads; otherwise it carries its own `$type` (ADR-0024 §3).
- **sys.color segments**: `accent`, `accent-strong`, `axis`, `band`, `bg`, `block`, `border`, `boundary`, `building`, `chart`, `comparison`, `comparison-2`, `critical`, `dimmed`, `edge`, `fill`, `focus`, `ghost`, `glow`, `grid`, `hairline`, `highlight`, `icon`, `info`, `inverse`, `inverse-media`, `inverse-media-pressed`, `inverse-pressed`, `label`, `land`, `line`, `map`, `nested`, `neutral`, `now`, `on-accent`, `on-accent-pressed`, `on-accent-secondary`, `on-accent-strong`, `on-badge`, `on-glass`, `on-glass-fill`, `on-glass-fill-dimmed`, `on-glass-fill-media-secondary`, `on-glass-fill-media-tertiary`, `on-glass-fill-secondary`, `on-glass-fill-tertiary`, `on-glass-light`, `on-glass-secondary`, `on-glass-tertiary`, `on-inverse`, `on-inverse-media`, `on-inverse-pressed`, `on-media`, `on-vivid`, `overlay`, `page`, `park`, `plot`, `pressed`, `primary`, `raised`, `reference`, `road`, `road-casing`, `route`, `route-ahead`, `route-casing`, `secondary`, `series`, `status`, `strong`, `subtle`, `success`, `surface`, `target`, `tertiary`, `text`, `tint`, `warning`, `water`. Numeric segments are free. The list is closed in practice: a new segment needs its line here in the same change, and `tools/tokens/docs.test.ts` checks it against the ids (ADR-0024 §13).
- **Brand-owned ref ids**: `ref.color.slot.<light|dark>.<bg-page|bg-fill-accent|text-on-accent|text-accent>` and `ref.font.apple.<ui|display|mono>`, plus the ramps, series, gradients, web font slots, `ref.type.scale` and the radius steps listed in `brands/README.md`. System-owned: `ref.color.smoke.<light|dark>`, the map hues `ref.color.map.<light|dark>.<water|park>` and every other `ref` id (ADR-0020 §1, ADR-0030 §1.2).

Examples (every path exists; `tools/tokens/docs.test.ts` checks them):

- `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised|nested|overlay`, `color.bg.fill.inverse|inverse-media|accent|accent-strong|critical`, `color.bg.fill.inverse-pressed|inverse-media-pressed` (the pressed solids, ADR-0039), `color.bg.fill.on-inverse-pressed|on-accent-pressed` (the pressed knocked-out solids on inverse and on the lit tile, ADR-0040), `color.bg.fill.neutral.subtle`, `color.bg.tint.accent|success|warning|critical|info`
- `color.text.primary|secondary|tertiary|dimmed|accent|success|warning|critical|info`, `color.text.on-inverse|on-inverse-media|on-accent|on-accent-secondary|on-accent-strong|on-vivid|on-glass|on-badge`, `color.text.on-glass-light|on-glass-secondary|on-glass-tertiary` (ADR-0022)
- `color.text.on-glass-fill`, `color.text.on-glass-fill-secondary|on-glass-fill-tertiary|on-glass-fill-dimmed` (over Prism's map), `color.text.on-glass-fill-media-secondary|on-glass-fill-media-tertiary` (over imagery and vivid) — the foreground of the scheme's glass (ADR-0029 §1.3, §1.4)
- `color.icon.primary|secondary|accent`, `color.icon.status.success|warning|critical|info`
- `color.border.hairline|strong|focus|boundary|on-media|on-glass-fill`, `color.edge.highlight|raised` (the brand's white, `color/edge-neutral`), `color.accent`, `color.accent.pressed|subtle|glow`
- `color.chart.series.1…6`, `color.chart.comparison|target|band|grid|axis|now|ghost|plot`, `color.chart.on-media.line|reference|grid` (vivid), `color.chart.on-glass-fill.plot|line|reference|grid` (the scheme's glass; ADR-0030 §2)
- `color.map.land|block|building|road|road-casing|water|park` (grounds, each over the land), `color.map.label|route|route-ahead|route-casing` (marks; ADR-0030 §1)
- `type.display.xl|lg|md`, `type.title.lg|md|sm`, `type.headline`, `type.body.lg|md|sm`, `type.label.lg|md|sm`, `type.caption`, `type.micro`, `type.eyebrow`, `type.metric.xl|lg|md|unit`, `type.data`, `type.axis` — composite typography: family slot, size, line height, weight, tracking, figures; weights, figures and Dynamic Type styles follow ADR-0021; `type.metric.xl` is 40 px in the `watch` platform context (`ref.type.metric.xl-watch`, ADR-0030 §7.2)
- `space.0…13`, `space.tile-gap|card-gap|group-gap|section-gap|card-padding|page-margin`
- `size.control.sm|md|lg`, `size.row`, `size.hit`, `size.icon.sm|md|lg|ring`, `size.card.min`
- `radius.control|chip|badge|inner|media|tile|card|card-compact|sheet|card-large|hero`, `border.hairline|strong|focus`
- `elevation.0…3` — shadow composites; `opacity.disabled|dimmed-row`
- `motion.duration.instant|quick|fast|base|slow|slower`, `motion.easing.out|in-out|drawer|hover|linear`, `motion.spring.interactive|snappy|smooth|sheet|bouncy` (`{duration, bounce}`), `motion.presentation.crossfade` (flag)
- `material.glass.dark.fill|chip`, `material.glass.light.fill|chip`, `material.glass.cell` — appearance recipes, groups of `$root` (fill), `blur`, `saturate`, `edge.start`, `edge.end`, `grain`, `bloom` (ADR-0022); `material.glass.fill|chip` — the scheme's glass, role recipes that alias the light recipes in light and the smoked ones in dark (ADR-0029 §1.2); `material.glass.scrim`; `material.vivid.edge.start|end` (the vivid highlight, ADR-0030 §4.2)
- `gradient.vivid.default`, `gradient.vivid.1…4` — scheme-safe slots over the brand's vivid gradients, for `surface.vivid`; slots 1 + 2 and 3 + 4 are one-temperature pairs (ADR-0029 §2.5)
- `chart.line-width|sparkline-width|comparison-width|marker-size|endpoint-size|bar-max-thickness|bar-radius` — dimensions in px (critic G-04); `chart.curve|gauge-stroke-ratio` — numbers
- `stroke.target|grid|leader`, `icon.weight`, `z.base|raised|overlay|toast`

## Dimensions = resolver modifiers

`tokens/prism.resolver.json` (DTCG Resolver 2025.10) declares sets `ref`, `sys`, `comp` and six modifiers. Orthogonality is defined on token ids: each modifier writes only the ids its ownership globs cover, and no id is written by two modifiers, so order never changes output (ADR-0024 §9). `tz lint` does not detect overlaps (it passes a deliberately non-orthogonal copy), so `pnpm tokens:lint` runs `tz lint` (DTCG strictness, kebab-case names as errors) plus `@terrazzo/parser`'s `resolver.orthogonal`, and `tokens:build` is authoritative: it re-checks write sets, ownership, context completeness and composition on every run. This table equals `OWNERSHIP` in `tools/tokens/config.ts` (checked):

| Modifier | Contexts | Owns |
|----------|----------|------|
| `brand` | `prism` (reference, Signature fonts), `prism-native` (same palette, Native fonts), one per folder in `brands/` | `BRAND_OVERRIDABLE`: the allowlisted `ref.*` ids of `brands/README.md` (ADR-0020) |
| `platform` | `apple`, `web`, `watch` | `sys.font.**` (selects the brand's font slots: web → `ref.font.<slot>`, apple and watch → `ref.font.apple.<slot>`), `sys.type.metric.xl` (the watch hero at 40 px, ADR-0030 §7.2) |
| `colorScheme` | `light`, `dark`, `light-increased-contrast`, `dark-increased-contrast`, `light-reduced-transparency`, `dark-reduced-transparency` | `sys.color.**`, `sys.material.**`, `sys.shadow.**`, `sys.elevation.**`, `sys.gradient.**` |
| `density` | `compact`, `regular`, `comfortable`, `watch` | `sys.space.**`, `sys.size.**` except `sys.size.hit` |
| `modality` | `pointer`, `touch` | `sys.size.hit`, `sys.interaction.**` (hover-only states) |
| `motion` | `default`, `reduced` | `sys.motion.**` |

Every context of a modifier must declare the same token ids (a variant context layers its delta file over the base file, as the colorScheme variants do), and the increased-contrast and reduced-transparency deltas of a scheme must not touch the same id, so the two preferences compose at runtime. Brand contexts are sparse overrides of the ref set and are exempt from per-context completeness; every permutation still has the same ids. The reduced-transparency contexts carry no token delta after ADR-0022 and load only their base file (ADR-0024 §9.5): Surface renders glass as the opaque raised fallback at runtime. The `watch` platform context layers `sys/platform/watch.tokens.json` (the 40 px `sys.type.metric.xl`, a typography delta and no material one) over `apple`, and the `watch` density context layers `sys/density/watch.tokens.json` (a 16 px `sys.space.card-padding`) over `regular` (ADR-0029 §3.2, ADR-0030 §7.2). The product is 2 brands × 3 platforms × 6 colorScheme × 4 density × 2 modality × 2 motion = 576 permutations.

Each modifier's `default` is the web root with no attribute set and no fallback query matching: `light`, `compact`, `pointer`, `default` (ADR-0019). Apps start from the per-platform defaults instead: web compact + pointer (regular while a touchscreen is present, touch while the primary input cannot hover finely); iOS and iPadOS regular + touch (iPadOS pointer while a mouse or trackpad is connected); macOS compact + pointer; watchOS `watch` + touch + dark (ADR-0029 §3.2). `comfortable` is an accessibility choice and no platform's default; a web page uses `watch` only for a watch-sized layout.

Layout:

```
tokens/
  prism.resolver.json
  ref/        color.palette, gradient, dimension, typography, motion, elevation, opacity  (brand-agnostic defaults)
  sys/        base.tokens.json + one folder per modifier: color/, density/, modality/, motion/, platform/
  comp/       one file per component; whole-value aliases of sys.* only
  contrast-pairs.json   every text/surface pair the CI contrast test checks
  export/     GENERATED by tools/tokens: tokens-studio/ and figma/ flavors (*.json, never *.tokens.json) and README.md; do not edit
brands/<name>/ brand.json, brand.tokens.json (overrides of allowlisted ref.* tokens), fonts/<family>/
```

## What the build emits

| Target | Where | Build-time axes | Runtime axes inside the artifact |
|--------|-------|-----------------|----------------------------------|
| CSS variables | `web/packages/tokens/src/generated/<brand>/tokens.css`, `…/generated/motion.css` | brand, with no brand attribute: a document loads one brand's `tokens.css` (`motion.css` is brand-invariant) | colorScheme (`data-ds-color-scheme`, nestable, else `prefers-color-scheme`); increased contrast (`data-ds-contrast` on `<html>`, else `prefers-contrast: more`); reduced transparency (`data-ds-transparency` on `<html>`, else `prefers-reduced-transparency: reduce`, which Safari lacks; after ADR-0022 it carries no token delta); density (`data-ds-density`, nestable, else `regular` under `(any-pointer: coarse)` and `compact` otherwise); modality (`data-ds-modality` on `<html>`, else `touch` under `not all and (hover: hover) and (pointer: fine)`); motion (`data-ds-motion` on `<html>`, else `prefers-reduced-motion: reduce`); gamut (`@media (color-gamut: p3)`). Unknown values count as absent (ADR-0019). |
| Tailwind `@theme inline` | `…/generated/tailwind.css` | — (brand-invariant names) | references the CSS variables; the `ds-touch`, `ds-pointer`, `ds-contrast-more`, `ds-reduce-transparency` and `ds-reduce-motion` variants and one `type-ds-<role>` utility per type role (ADR-0019 §3) |
| TypeScript table | `…/generated/<brand>/tokens.ts` | brand | per-token values by axis (colorScheme with contrast and transparency deltas, density, modality, motion) plus `resolveTokens(context)` |
| Name manifest | `…/generated/manifest.json` | — | token paths and their CSS, Tailwind, TS, Swift and asset names |
| Runtime table | `…/generated/runtime.ts` | — | attribute names, values, fallback queries, `TokenContext`, per-platform defaults (ADR-0019) |
| Swift + `.xcassets` | `swift/Sources/DSTokens/Generated/`, `swift/Sources/DSTokens/Resources/Colors.xcassets/` | every repo brand, chosen once per scene by `DSTokenContext.brand`, with colorsets in `Colors.xcassets/<namespace>/`; platform ∈ {apple, watch} (`#if os(watchOS)`, colorset `watch` idiom) | colorScheme and increased contrast via asset appearances (Any, Dark, High Contrast, Dark + High Contrast); reduced transparency has no token delta (ADR-0022); density, modality, motion and non-color scheme values via `DSTokenSet(DSTokenContext)` tables |
| Fonts (P1-8) | `…/generated/<brand>/fonts/` (`fonts.css`, and per family `<family-dir>/<family-kebab>-wght.woff2` with its `OFL.txt`), `swift/Sources/DSTokens/Resources/Fonts/<family-dir>/` | brand | — (ADR-0021 §11) |
| Tokens Studio flavor | `tokens/export/tokens-studio/` | — | themes = brand × scheme × density |
| Figma-native flavor | `tokens/export/figma/<brand>/<colorScheme>.json` | brand × scheme | — |

Generated API shapes are the union over brands, so every brand has the same API (ADR-0020).

## Motion

DTCG 2025.10 has `duration`, `cubicBezier` and `transition` but no spring type. Prism models a spring as a standards-compliant `transition` token (the cubic-bezier fallback every tool understands) plus `$extensions["app.prism"].spring = { duration, bounce, blendDuration?, settle }`, which is the source of truth (ADR-0023). Apple's two-parameter spring is `mass 1`, `stiffness (2π/duration)²`, `damping 4π(1−bounce)/duration`. The schema admits duration 0.1–1 s, bounce 0–0.4 and blendDuration 0–1 s, so the negative-bounce formula `4π/(duration·(1+bounce))` is never needed. Only a `transition` token with a literal `$value` declares a spring; aliases inherit it and never redeclare it. The build derives:

- the settle time: the last moment the unit step response is 0.001 or more away from its target, displacement only, rounded down to the millisecond (snappy 487.68 ms → 487);
- the physics triplet for Motion on web;
- a CSS `linear()` easing sampled every millisecond over that settle time from Motion's physics generator (near-zero rest thresholds), simplified by Ramer–Douglas–Peucker with a 0.002 vertical tolerance and serialized by Prism (within 0.0025 of the closed form), plus an `@supports` fallback to the token's cubic-bezier. Never Motion's `toString()` or `generateLinearEasing`;
- `Spring(duration:bounce:)` for SwiftUI.

`pnpm tokens:normalize` writes the derived `settle` and the `transition` fallback duration into the source, and the build fails while they are stale, so the fallback cannot drift. The cross-stack parity test (ADR-0023 §11) holds stiffness and damping within 1e-4 and settle within 1 ms of SwiftUI's `Spring`, SwiftUI curve checkpoints within 1e-4 of the closed form, and every CSS curve within 0.0025. On the Swift side, settle is found by sampling `Spring.value(target:time:)`. Do not use Apple's `Spring.settlingDuration`: it is a different, longer estimate (snappy 0.635 s against 0.487 s). Motion's `spring().toString()` has the same problem, with its own 50 ms-grid duration (snappy 550 ms). (Corrected 2026-09-14.)

Scale (from `docs/research/motion-haptics.md`): six durations `instant 0 · quick 100 · fast 150 · base 250 · slow 350 · slower 500` ms; five easings `out · in-out · drawer · hover · linear` (exposed as `motion.easing.*`); five springs `interactive (0.15, 0) · snappy (0.35, 0.15) · smooth (0.40, 0) · sheet (0.30, 0.20) · bouncy (0.50, 0.30)`; `interactive` keeps Apple's duration and blend (0.25) with bounce 0 by Prism's choice (Apple's `interactiveSpring` is (0.15, 0.15)). Reduce Motion is the `motion` modifier's `reduced` context, layered over `default` (ADR-0023). Every spring has bounce 0 and duration ≤ 0.30 s: snappy and sheet (0.25, 0) settle in 367 ms, smooth and bouncy (0.30, 0) in 440 ms, and interactive is unchanged. Every duration is ≤ 150 ms (fast 100; base, slow and slower 150). `motion.presentation.crossfade` is 1, and components follow their spec's `motion.reduceMotion`: presentations fade by opacity over `motion.duration.base` with `motion.easing.out`; press scale, zoom, blur and depth changes become opacity or color changes; in-place movement keeps its tightened spring; gestures still track directly. On the web the context applies under ADR-0019's root switch (`data-ds-motion`, else `prefers-reduced-motion`); on Apple DSCore selects it from `DSAccessibilityPolicy` (default `accessibilityReduceMotion`). Components never read the OS setting themselves.

Haptics are not tokens; they live in `spec/haptics.yaml`.

## Typography

- **Units** (ADR-0021 §6): `fontSize` is px in the source, rem (px / 16) on the web, and points scaled by the role's `textStyle` on Apple (Dynamic Type through `@ScaledMetric`); `letterSpacing` becomes em (Swift `trackingEm`); `lineHeight` is a unitless ratio on the web and `.lineHeight(.multiple(factor:))` on Apple. Every other dimension is px = pt and does not scale; components that hold text use those dimensions as minimum sizes. Prism CSS never sets `font-size` on `html` or `:root`.
- **Weights** (ADR-0021 §1–§4): standard role weights are 300 (only at ≥ 20 px), 400 or 500. Thin weights (100–200) exist only as a metric role's `darkWeight` at ≥ 34 px, in the dark scheme. The build derives the dark weight, the Increase Contrast floor (every weight below 400 renders 400) and, for Apple, `boldWeight` under Bold Text (`s ≤ 300 ? 400 : s + 200`, capped at 900). No colorScheme file writes a typography id.
- **Figures** (ADR-0021 §5, ADR-0030 §7.1): every metric role (`metric.xl`, `metric.lg`, `metric.md`) uses proportional figures (static readouts); `data` and `axis` are tabular; values that change while visible set `numeric: tabular` on any role.
- **Density does not change typography** (ADR-0021 §6); roles have the same size, weight and line height in every density.
- **Brand type scale**: `ref.type.scale` lies in [1, 1.25] (ADR-0021 §6); Prism has no italic.

## Color

Authored once in OKLCH (`{ colorSpace: "oklch", components: [L, C, H], alpha, hex }`); `pnpm tokens:normalize` (`tools/tokens/normalize.ts`, rule `hex`, the roadmap's `normalize-hex`) keeps `hex` equal to the CSS Color 4 gamut-mapped sRGB color, and the build fails if it is stale. CSS gets `oklch()` of the sRGB-mapped color with a P3 re-declaration under `@media (color-gamut: p3)` for out-of-sRGB colors; Swift and the asset catalog get gamut-mapped Display P3. Figma flavors get sRGB objects with `alpha` and a 6-digit `hex`; Tokens Studio gets `#rrggbb`, or `rgba()` below alpha 1, never 8-digit hex (ADR-0024 §12). Semantic colors alias ref colors. A tint or overlay of a hue is an alias with `$extensions["app.prism"].alpha` (ADR-0020), emitted as a literal of its target with that alpha. Only pure white and black may be sRGB literals in `sys/**`; they are emitted as authored (`rgb(255 255 255 / 0.64)`, sRGB colorset entries) and never pre-composited. One number in, one mapping library (Color.js, the copy Style Dictionary uses).

## Materials

Glass recipes are typed tokens under `sys.material.glass.<recipe>`: the appearance recipes `dark.fill`, `dark.chip`, `light.fill`, `light.chip` and `cell`, and the role recipes `fill` and `chip`. Each is a group of `$root` (the fill; alpha as ADR-0020 allows), `blur` (an alias of `ref.blur.*`), `saturate`, `edge.start`, `edge.end`, `grain` and `bloom`; `sys.material.glass.scrim` is a plain color. Only the light and dark scheme files declare them.

- **The scheme's glass** (ADR-0029 §1.2): each field of `material.glass.fill` and `material.glass.chip` is a whole-value alias of the same field of `glass.light.fill|chip` in the light file and `glass.dark.fill|chip` in the dark file (`material/role-recipe`). The role `$root` carries no `$type` of its own, because DTCG's reference pattern rejects `{….$root}` in a typed color token. Card glass and Surface `glass` bind `fill`; chips, controls and status cells over media bind `chip`. Their text is `text.on-glass-fill` with the `-secondary`, `-tertiary` and `-dimmed` tones over Prism's map and the two `-media` tones over imagery and vivid.
- **Neutral smoke**: `ref.color.smoke.*` has OKLCH chroma 0.007 or less (`color/smoke-chroma`). The scrim is black at 0.45 in both schemes, so large white text holds 3:1 over it on pure white.
- **Fallback and limits**: under Reduce Transparency, Increase Contrast, on watchOS and over a backdrop that is not an image, a map or vivid, Surface renders glass as the opaque `raised` surface, or `inverse` when selected (ADR-0022). Dark glass goes only on backdrops where white holds 3:1; light glass in dark only over imagery or Prism's map at OKLCH L ≤ 0.35, in light only over vivid or imagery at L ≥ 0.45. Prism's map grounds keep those limits (`map/backdrop-limit`, ADR-0030 §1.5).
- **Vivid**: every vivid gradient reaches 3:1 against white at every stop and 4.5:1 in the Card header block at sixteen geometries; the unset vivid is `gradient.vivid.default` (sky in light, plum-dusk in dark). Each gradient declares `app.prism.temperature`, and the bloom color is derived: the brightest stop (ADR-0030 §4.3).

## Metadata

`$extensions["app.prism"]` also carries metadata, which stays on the declaring token and is not inherited through aliases (ADR-0024 §4.1). A later declaration replaces the whole token, so every declaration of an id repeats it, the variant delta files included.

- `a11y.pairsWith` on every `sys.color.text.*` declaration: the public names of the backgrounds the tone is used on (`color.bg.page`, `material.glass.dark.fill`, `ref.gradient.vivid.*`). `tools/contrast` checks that each one is a pair in `contrast-pairs.json` (rule 4).
- `figma` (ADR-0026) on every `sys` and `comp` declaration that Figma imports as a scoped variable, and on nothing else; code syntax is never authored, the Figma-native flavor derives it from the emitted names: colors, dimensions, font families and numbers other than flags. `collection` names the layer that owns the id, one of `base` (the `sys` set), `colorScheme`, `density`, `modality`, `platform` and `component`, so a Figma collection's modes are that modifier's contexts; `scopes` lists the Figma variable scopes (for example `TEXT_FILL`, `STROKE_COLOR`, `GAP`, `CORNER_RADIUS`; an empty list hides a number that no Figma property takes). Typography roles, motion aliases, flags, shadows, gradients and stroke styles carry none. Code syntax is not authored: the build derives every emitted name from `tools/tokens/ARCHITECTURE.md` §8. This is narrower than ADR-0004 decision 8 and ADR-0005 decision 2, which put `figma` with collection, scopes and code syntax on every token; the ADRs win until an amendment settles it (`tools/tokens/ARCHITECTURE.md` §16.3).

## Rules

1. No literal values outside `tokens/`; CI greps `swift/` and `web/` for hex, `px`/`pt` and font names.
2. A modifier writes only the token ids it owns (table above); the build rejects any other write.
3. Brands override existing ids in `BRAND_OVERRIDABLE` only (`brands/README.md`): the neutral and accent ramps, the eight `ref.color.slot.**` semantic slots that the base scheme files alias, chart series, the nine vivid gradients, font slots (`ref.font.*`, `ref.font.apple.*`), `ref.type.scale` and `ref.radius.1…10`. Brands cannot add paths or write `sys.*` or `comp.*` (ADR-0020).
4. Every `sys.color.text.*` token declares `$extensions["app.prism"].a11y.pairsWith`; `tools/contrast` checks every pair for every brand × scheme context.
5. References are curly-brace references to whole tokens; a reference to a group with a root token is written `{group.$root}`; `{group}` is invalid DTCG and fails the build, and so does a JSON Pointer `$ref` inside a value (ADR-0024 §1).
6. Generated outputs are committed; CI rebuilds and fails on any diff; `tokens:diff` classifies changes (value = minor, removal, type change or a change of the runtime axes a token depends on = major), one level lower while the last release tag is 0.x (ADR-0024 §14).
7. In `sys/**`, every color is an alias, an alias with `app.prism.alpha`, or pure white or black; every `sys.color.edge.*` aliases `ref.color.neutral.0` (ADR-0030 §4.1); every `fontFamily` value aliases a font slot; gradient and radius tokens are aliases; every typography token aliases a `ref.type.*` role; other values may be literals (ADR-0020 §3, ADR-0024 §5.6).
8. Names are kebab-case; a token whose type differs from a group `$type` on its path carries its own `$type`; a flag is a `number` 0 or 1 with `app.prism.flag: true` on every declaration; an alias never declares a folded extension key, except `app.prism.alpha` (ADR-0024 §2–§4).
9. A spring is declared once, on a `transition` token with a literal `$value`; aliases inherit it (ADR-0023, ADR-0024 §4.1). The `reduced` motion context never adds bounce, never lengthens a `sys` or `comp` duration or settle, and never changes `motion.spring.interactive`; `tokens:build` checks this (`motion/reduced-policy`).
10. Typography weights, figures and units follow ADR-0021; `tokens:build` rejects thin weights outside dark metric roles ≥ 34 px, weight 300 below 20 px and typography below 400 under Increase Contrast.
11. Every token path and emitted name in this file resolves (`tools/tokens/docs.test.ts`).
