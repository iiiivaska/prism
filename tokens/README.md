# Tokens

Single source of truth for every visual value in Prism. Format: **W3C Design Tokens (DTCG) 2025.10** — Format, Color and Resolver modules — validated in CI against the published JSON Schemas. Built by Style Dictionary 5 through a resolver driver into Swift, CSS / Tailwind, TypeScript, and Tokens Studio / Figma flavors (ADR-0004). Nothing in `swift/` or `web/` may contain a literal color, size, font name or duration.

## Tiers (path segments)

| Tier | Prefix | Who edits | Aliases to |
|------|--------|-----------|------------|
| Primitive | `ref.*` | brand authors | nothing |
| Semantic | `sys.*` | system maintainers; brands may override a whitelisted subset | `ref.*` |
| Component | `comp.<component>.*` | system maintainers only | `sys.*` |

Emitted names drop `sys.`: `sys.color.bg.accent` → `--ds-color-bg-accent`, `DSColor.bgAccent`, Tailwind `bg-ds-accent`. Component tokens keep their component name: `comp.button.primary.bg.rest` → `--ds-button-primary-bg-rest`. Component specs bind to `sys.*` (written without the prefix) and `comp.*` only; the schema regex enforces it.

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

`tokens/prism.resolver.json` (DTCG Resolver 2025.10) declares sets `ref`, `sys`, `comp` and six modifiers. Each modifier owns disjoint token types so that order never changes output (Terrazzo's `tz lint` checks this in CI).

| Modifier | Contexts | Owns |
|----------|----------|------|
| `brand` | `prism` (reference, Signature fonts), `prism-native` (same palette, system fonts), `<brand>` | `ref.*` only |
| `colorScheme` | `light`, `dark`, `light-increased-contrast`, `dark-increased-contrast`, `light-reduced-transparency`, `dark-reduced-transparency` | `sys.color.*`, `sys.material.*`, `sys.shadow.*` |
| `density` | `compact`, `regular`, `comfortable` | `sys.space.*`, `sys.size.*`, type sizes |
| `modality` | `pointer`, `touch` | `sys.size.hit.*`, hover-only states |
| `motion` | `default`, `reduced` | `sys.motion.*` |
| `platform` | `apple`, `web`, `watch` | Native-preset font families, blur removal on watch |

Layout:

```
tokens/
  prism.resolver.json
  ref/        color.palette, dimension, typography scales, motion, elevation, opacity  (brand-agnostic defaults)
  sys/        base.tokens.json + one folder per modifier: color/, density/, modality/, motion/, platform/
  comp/       one file per component; aliases into sys.* only
  contrast-pairs.json   every text/surface pair the CI contrast test checks
brands/<name>/ brand.tokens.json (ref overrides + whitelisted sys aliases), fonts/
```

## What the build emits

| Target | Build-time axes | Runtime axes inside the artifact |
|--------|-----------------|----------------------------------|
| CSS variables | brand | colorScheme (`[data-color-scheme]` + `prefers-color-scheme`, `prefers-contrast`, `[data-reduced-transparency]`), density (`[data-density]`), modality (`@media (pointer: coarse)` / `[data-modality]`), motion (`prefers-reduced-motion`), gamut (`@media (color-gamut: p3)`) |
| Tailwind `@theme inline` | brand | references the CSS variables |
| TypeScript maps | brand | typed maps keyed by scheme / density |
| Swift enums + `.xcassets` | brand, platform ∈ {apple, watch} | colorScheme via asset appearances (dark, high contrast); density and modality via `DSTokenContext` tables; reduced transparency and motion via environment |
| Tokens Studio flavor | — | themes = brand × scheme × density |
| Figma-native flavor | brand × scheme | — |

## Motion

DTCG 2025.10 has `duration`, `cubicBezier` and `transition` but no spring type. Prism models a spring as a standards-compliant `transition` token (the cubic-bezier fallback every tool understands) plus `$extensions["app.prism"].spring = { duration, bounce, blendDuration? }`, which is the source of truth (Apple's two-parameter spring: `mass 1`, `stiffness (2π/duration)²`, `damping 4π(1−bounce)/duration`). The build derives the settle time (ε 0.001), the physics triplet for Motion on web, a CSS `linear()` easing, and `Spring(duration:bounce:)` for SwiftUI; CI regenerates and diffs so the fallback cannot drift, and a parity test compares stiffness/damping/settle within 1 % / 10 ms across stacks.

Scale (from `docs/research/motion-haptics.md`): six durations `instant 0 · quick 100 · fast 150 · base 250 · slow 350 · slower 500` ms; five easings `out · inOut · drawer · hover · linear`; five springs `interactive (0.15, 0) · snappy (0.35, 0.15) · smooth (0.40, 0) · sheet (0.30, 0.20) · bouncy (0.50, 0.30)`. The `motion` modifier's `reduced` context sets every bounce to 0, shortens durations and switches presentation transitions to crossfade; on web it is emitted under `@media (prefers-reduced-motion: reduce)`, on Apple selected from `accessibilityReduceMotion`.

Haptics are not tokens; they live in `spec/haptics.yaml`.

## Color

Authored once in OKLCH (`{ colorSpace: "oklch", components: [L, C, H], alpha, hex }`); `tools/tokens/normalize-hex` keeps `hex` in sync and CI fails if it is stale. CSS gets `oklch()` with a P3 re-declaration for out-of-sRGB colors; Swift gets gamut-mapped Display P3; Figma flavors get hex. One number in, three outputs, one mapping library (Color.js).

## Rules

1. No literal values outside `tokens/`; CI greps `swift/` and `web/` for hex, `px`/`pt` and font names.
2. A modifier writes only the token types it owns.
3. Brands write `ref.*` and the whitelisted `sys.*` aliases listed in `brands/README.md`; they cannot add paths.
4. Every `sys.color.text.*` token declares `$extensions["app.prism"].a11y.pairsWith`; `tools/contrast` checks every pair for every brand × scheme context.
5. Generated outputs are committed; CI rebuilds and fails on any diff; `tokens:diff` classifies changes (value = minor, removal or type change = major).
