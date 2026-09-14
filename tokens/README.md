# Tokens

Single source of truth for every visual value in Prism. Format: **W3C Design Tokens (DTCG) 2025.10** — Format, Color and Resolver modules — validated in CI against the published JSON Schemas. Built by Style Dictionary 5 through a resolver driver into Swift, CSS / Tailwind, TypeScript, and Tokens Studio / Figma flavors (ADR-0004); the build's design is `tools/tokens/ARCHITECTURE.md`. Nothing in `swift/` or `web/` may contain a literal color, size, font name or duration.

## Tiers (path segments)

| Tier | Prefix | Who edits | Aliases to |
|------|--------|-----------|------------|
| Primitive | `ref.*` | brand authors | nothing |
| Semantic | `sys.*` | system maintainers (brand overrides: rule 3) | `ref.*` |
| Component | `comp.<component>.*` | system maintainers only | `sys.*` |

Emitted names drop `sys.`: `sys.color.bg.accent` → `--ds-color-bg-accent`, `DSColor.bgAccent`, TypeScript key `color.bg.accent`, Tailwind `bg-ds-accent` (through Tailwind's per-utility theme namespaces such as `--background-color-ds-*` and `--text-color-ds-*`; the build fails if two tokens would produce the same utility). Component tokens keep their component name: `comp.button.primary.bg.rest` → `--ds-button-primary-bg-rest`. `ref.*` keeps its prefix: `--ds-ref-color-neutral-100`. Component specs bind to `sys.*` (written without the prefix) and `comp.*` only; the schema regex enforces it. Every naming rule is in `tools/tokens/ARCHITECTURE.md` §8.

## Naming

`tier.category.property.role[.prominence][.state]`, lowercase, kebab-case inside a segment, dots between segments. Vocabularies are closed:

- **property**: `bg`, `text`, `icon`, `border`, `shadow`, `outline`, `fill`
- **role**: `page`, `surface`, `neutral`, `accent`, `info`, `success`, `warning`, `critical`, `inverse`, `on-accent`, `on-vivid`
- **prominence**: `bold`, `subtle`, `muted` (text: `primary`, `secondary`, `tertiary`)
- **state**: `rest`, `hover`, `pressed`, `focus`, `selected`, `disabled`

Examples:

- `color.bg.page`, `color.bg.surface`, `color.bg.surface.raised`, `color.bg.surface.overlay`, `color.bg.fill.accent`, `color.bg.fill.accent.pressed`, `color.bg.fill.neutral.subtle`
- `color.text.primary`, `color.text.secondary`, `color.text.tertiary`, `color.text.on-accent`, `color.text.on-vivid`, `color.text.critical`
- `color.icon.primary`, `color.icon.secondary`, `color.icon.accent`
- `color.border.hairline`, `color.border.strong`, `color.border.focus`
- `color.chart.series.1…8`, `color.chart.target`, `color.chart.band`, `color.chart.grid`, `color.chart.axis`
- `type.display.xl|lg|md`, `type.title.lg|md|sm`, `type.headline`, `type.body.lg|md|sm`, `type.label.lg|md|sm`, `type.caption`, `type.metric.xl|lg|md` — composite typography: family slot, size, line height, weight, tracking, numeric features
- `space.0…12` (4 pt base), `size.control.sm|md|lg`, `size.hit.pointer|touch`, `size.icon.sm|md|lg`
- `radius.0…5`, `radius.control`, `radius.card`, `radius.sheet`, `radius.pill`
- `elevation.0…3` — shadow composites
- `opacity.disabled`, `opacity.dimmed`
- `motion.duration.fast|base|slow`, `motion.spring.snappy|smooth|bouncy` (`{duration, bounce}`), `motion.easing.standard|emphasized`
- `material.glass.regular|clear|tinted` — fill alpha, blur, specular edge, noise
- `gradient.vivid.1…4` — brand gradients for `surface.vivid`
- `chart.curve`, `chart.target.dash`, `chart.band.alpha`, `chart.grid.alpha`
- `z.base|raised|overlay|toast`

## Dimensions = resolver modifiers

`tokens/prism.resolver.json` (DTCG Resolver 2025.10) declares sets `ref`, `sys`, `comp` and six modifiers. Each modifier owns disjoint token ids so that order never changes output. `tz lint` does not detect overlaps (it passes a deliberately non-orthogonal copy), so `pnpm tokens:lint` adds Terrazzo's parser API (`resolver.orthogonal`) and `tokens:build` re-checks write sets, ownership, context completeness and composition on every run.

| Modifier | Contexts | Owns |
|----------|----------|------|
| `brand` | `prism` (reference, Signature fonts), `prism-native` (same palette, system fonts), `<brand>` | `ref.*` only |
| `colorScheme` | `light`, `dark`, `light-increased-contrast`, `dark-increased-contrast`, `light-reduced-transparency`, `dark-reduced-transparency` | `sys.color.*`, `sys.material.glass.*`, `sys.shadow.*`, `sys.gradient.*` |
| `density` | `compact`, `regular`, `comfortable` | `sys.space.*`, `sys.size.*` except `sys.size.hit`, `sys.type.*` |
| `modality` | `pointer`, `touch` | `sys.size.hit`, `sys.interaction.*` (hover-only states) |
| `motion` | `default`, `reduced` | `sys.motion.*` |
| `platform` | `apple`, `web`, `watch` | `sys.font.*` (Native-preset font families), `sys.material.blur.*` (blur removal on watch) |

Every context of a modifier must declare the same token ids (a variant context layers its delta file over the base file, as the colorScheme variants do), and the increased-contrast and reduced-transparency deltas of a scheme must not touch the same id, so the two preferences compose at runtime.

Layout:

```
tokens/
  prism.resolver.json
  ref/        color.palette, dimension, typography scales, motion, elevation, opacity  (brand-agnostic defaults)
  sys/        base.tokens.json + one folder per modifier: color/, density/, modality/, motion/, platform/
  comp/       one file per component; aliases into sys.* only
  contrast-pairs.json   every text/surface pair the CI contrast test checks
  export/     GENERATED by tools/tokens: tokens-studio/ and figma/ flavors (*.json, never *.tokens.json); do not edit
brands/<name>/ brand.json, brand.tokens.json (overrides of existing ref.* tokens), fonts/
```

## What the build emits

| Target | Where | Build-time axes | Runtime axes inside the artifact |
|--------|-------|-----------------|----------------------------------|
| CSS variables | `web/packages/tokens/src/generated/<brand>/tokens.css`, `…/generated/motion.css` | brand (`motion.css` is brand-invariant) | colorScheme (`[data-ds-color-scheme]`, nestable, else `prefers-color-scheme`), increased contrast (`[data-ds-contrast="more"]` on the root, else `prefers-contrast: more`), reduced transparency (`[data-ds-transparency="reduce"]` on the root, else `prefers-reduced-transparency: reduce`), density (`[data-ds-density]`, nestable), modality (`[data-ds-modality]` on the root, else `@media (pointer: coarse)`), motion (`[data-ds-motion="reduce"]` on the root, else `prefers-reduced-motion: reduce`), gamut (`@media (color-gamut: p3)`) |
| Tailwind `@theme inline` | `…/generated/tailwind.css` | — (brand-invariant names) | references the CSS variables |
| TypeScript table | `…/generated/<brand>/tokens.ts` | brand | per-token values by axis (colorScheme with contrast and transparency deltas, density, modality, motion) plus `resolveTokens(context)` |
| Name manifest | `…/generated/manifest.json` | — | token paths and their CSS, Tailwind, TS, Swift and asset names |
| Swift + `.xcassets` | `swift/Sources/DSTokens/Generated/`, `swift/Sources/DSTokens/Resources/Colors.xcassets/` | brand (default brand's values, every repo brand's font faces), platform ∈ {apple, watch} (`#if os(watchOS)`, colorset `watch` idiom) | colorScheme and increased contrast via asset appearances (Any, Dark, High Contrast, Dark + High Contrast); reduced transparency via separate `-reduced-transparency` colorsets; density, modality, motion and non-color scheme values via `DSTokenSet(DSTokenContext)` tables |
| Tokens Studio flavor | `tokens/export/tokens-studio/` | — | themes = brand × scheme × density |
| Figma-native flavor | `tokens/export/figma/<brand>/<colorScheme>.json` | brand × scheme | — |

## Motion

DTCG 2025.10 has `duration`, `cubicBezier` and `transition` but no spring type. Prism models a spring as a standards-compliant `transition` token (the cubic-bezier fallback every tool understands) plus `$extensions["app.prism"].spring = { duration, bounce, blendDuration? }`, which is the source of truth (Apple's two-parameter spring: `mass 1`, `stiffness (2π/duration)²`, `damping 4π(1−bounce)/duration` for `bounce ≥ 0`, and `4π/(duration·(1+bounce))` for `−1 < bounce < 0`; corrected 2026-09-14). The build derives:

- the settle time: the last moment the unit step response is 0.001 or more away from its target, displacement only, rounded down to the millisecond (snappy 487.68 ms → 487);
- the physics triplet for Motion on web;
- a CSS `linear()` easing sampled over that settle time from Motion's spring generator (with near-zero rest thresholds) and simplified to at most 0.002 error, plus an `@supports` fallback to the token's cubic-bezier;
- `Spring(duration:bounce:)` for SwiftUI.

`pnpm tokens:normalize` writes the derived `settle` and the `transition` fallback duration into the source, and the build fails while they are stale, so the fallback cannot drift. A parity test compares stiffness/damping/settle within 1 % / 10 ms across stacks. On the Swift side, settle is found by sampling `Spring.value(target:time:)`. Do not use Apple's `Spring.settlingDuration`: it is a different, longer estimate (snappy 0.635 s against 0.487 s). Motion's `spring().toString()` has the same problem, with its own 50 ms-grid duration (snappy 550 ms). (Corrected 2026-09-14.)

Scale (from `docs/research/motion-haptics.md`): six durations `instant 0 · quick 100 · fast 150 · base 250 · slow 350 · slower 500` ms; five easings `out · inOut · drawer · hover · linear`; five springs `interactive (0.15, 0) · snappy (0.35, 0.15) · smooth (0.40, 0) · sheet (0.30, 0.20) · bouncy (0.50, 0.30)`. The `motion` modifier's `reduced` context sets every bounce to 0, shortens durations and switches presentation transitions to crossfade; on web it is emitted under `@media (prefers-reduced-motion: reduce)`, on Apple selected from `accessibilityReduceMotion`.

Haptics are not tokens; they live in `spec/haptics.yaml`.

## Color

Authored once in OKLCH (`{ colorSpace: "oklch", components: [L, C, H], alpha, hex }`); `pnpm tokens:normalize` (`tools/tokens/normalize.ts`, rule `hex`, the roadmap's `normalize-hex`) keeps `hex` equal to the CSS Color 4 gamut-mapped sRGB color, and the build fails if it is stale. CSS gets `oklch()` of the sRGB-mapped color with a P3 re-declaration under `@media (color-gamut: p3)` for out-of-sRGB colors; Swift and the asset catalog get gamut-mapped Display P3; Figma flavors get sRGB objects with hex, Tokens Studio gets hex. Overlays authored in sRGB with alpha (`sys.color.*` white or ink at some opacity) are emitted as authored (`rgb(255 255 255 / 0.64)`, sRGB colorset entries) and never pre-composited. One number in, one mapping library (Color.js, the copy Style Dictionary uses).

## Rules

1. No literal values outside `tokens/`; CI greps `swift/` and `web/` for hex, `px`/`pt` and font names.
2. A modifier writes only the token ids it owns (table above); the build rejects any other write.
3. Brands override existing `ref.*` tokens; they cannot add paths (every id a brand declares must exist in the `ref` set). A brand write that a later layer always overwrites is rejected; today that includes every `sys.*` id whitelisted in `brands/README.md`, because `colorScheme` writes them after `brand`, so brand-tunable semantics need `ref.*` slots that the scheme files alias (owner decision pending).
4. Every `sys.color.text.*` token declares `$extensions["app.prism"].a11y.pairsWith`; `tools/contrast` checks every pair for every brand × scheme context.
5. A reference to a group with a root token is written `{group.$root}`; `{group}` is invalid DTCG and fails the build.
6. Generated outputs are committed; CI rebuilds and fails on any diff; `tokens:diff` classifies changes (value = minor, removal, type change or a change of the runtime axes a token depends on = major).
