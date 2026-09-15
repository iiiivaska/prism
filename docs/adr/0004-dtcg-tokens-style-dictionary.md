# ADR-0004: Single DTCG 2025.10 token source, built by Style Dictionary 5 with a resolver driver

- Status: accepted (decision 5, the CSS mode selectors, amended by [ADR-0019](0019-web-runtime-contract.md); decision 3's brand and platform rows and rule 3 amended by [ADR-0020](0020-brand-model.md): brands write the allowlisted `ref.*` ids only, and the platform modifier selects every brand's web or Apple font slots; decision 3 amended by [ADR-0021](0021-typography-rules.md): density no longer writes type sizes, and typography weights follow colorScheme through a build rule; decision 3 amended by [ADR-0022](0022-materials-and-fallbacks.md): the `platform` modifier no longer removes blur on watch and writes font slots only; decisions 1, 3, 5, 6 and 7, rule 2 and the hex-fallback consequence amended by [ADR-0024](0024-token-source-conventions.md); decision 8, which tokens carry Figma metadata and that code syntax is derived, amended by [ADR-0026](0026-figma-metadata-scope.md))
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #4 (which says "Style Dictionary v4"; v5 is current, this ADR wins)

## Context

RideVerse's system kept a Tokens Studio JSON and hand-written Swift, reconciled by a golden test: every value change was two edits and a red test. Prism has two stacks, several brands, two color schemes, accessibility variants, three densities and two input modalities; hand-maintaining that matrix is impossible.

Verified facts (2026-09-08, sources in `docs/research/arch-tokens.md`):

- The **Design Tokens Community Group format reached its first stable version, 2025.10**, on 28 Oct 2025 with three modules: Format, Color and **Resolver**. Colors are objects (`colorSpace`, `components`, `alpha`, optional 6-digit `hex` fallback) in 14 spaces including `oklch` and `display-p3`; dimensions and durations are `{value, unit}` objects; `$deprecated`, `$extends`, `$root` and JSON-Pointer `$ref` exist. Published JSON Schemas are live. The resolver module expresses theming as `sets`, `modifiers` with `contexts`, and a `resolutionOrder`.
- **Style Dictionary is at 5.5.3** (Apache-2.0, Node ≥ 22). It reads DTCG color objects (all 14 spaces, since 5.3.0) and dimension objects (5.4.0); duration objects and gradients with color objects are still in progress; **the resolver module is not implemented** (issue #1590; the maintainer agreed on a `resolver` config option in August 2026, no date). Its built-in Swift formats emit flat sRGB `UIColor`/`Color` literals: no asset catalogs, no light/dark, no Display P3.
- **Terrazzo 2.7.1** implements DTCG 2025.10 including resolvers, lints resolver orthogonality, and emits CSS with `@media (color-gamut: p3)` fallbacks; its Swift plugin is 0.3.3, experimental and color-only; the project is essentially one maintainer.
- **Tokens Studio** reads a DTCG *flavor* with string values (`"#hex"`, `"16px"`), not 2025.10 objects; multi-mode themes require the paid plan. **Figma's native JSON import** accepts sRGB/HSL colors and px only, one file per mode. The **Figma Variables REST API is Enterprise-only**; the Plugin API has no such gate.
- Both Style Dictionary and Terrazzo depend on Color.js, whose gamut mapping implements the CSS Color 4 algorithm.

## Decision

1. **Source of truth**: `tokens/` holds DTCG 2025.10 files validated in CI against the published schemas. Colors are authored in OKLCH with a script-maintained `hex` fallback; dimensions and durations are objects; typography, shadow, border and transition are composites.
2. **Tiers are path segments**: `ref.*` (primitives), `sys.*` (semantic), `comp.*` (component). Emitted names drop `sys.` and carry the `ds` prefix: `sys.color.bg.accent` → `--ds-color-bg-accent` / `DSColor.bgAccent`.
3. **Theming dimensions are DTCG resolver modifiers** in `tokens/prism.resolver.json`, kept orthogonal by token type: `brand` (writes `ref.*` only), `colorScheme` (`light`, `dark`, plus flattened `-increased-contrast` and `-reduced-transparency` contexts; writes `sys.color.*`, `sys.material.*`, `sys.shadow.*`), `density` (`sys.space.*`, `sys.size.*`, type sizes), `modality` (`sys.size.hit.*`, hover-only states), `motion` (`default`, `reduced`), `platform` (`apple`, `web`, `watch`; font slots for the Native preset and blur removal on watch). Terrazzo's `tz lint` runs in CI to prove orthogonality.
4. **Build engine: Style Dictionary 5.5.x plus a thin TypeScript resolver driver** (`tools/tokens/resolver.ts`) that parses the resolver file, enumerates permutations and instantiates Style Dictionary per permutation, keeping outputs in memory to bundle. The driver is designed to be deleted when Style Dictionary ships native resolver support.
5. **Custom formats** (all small, snapshot-tested): CSS variables with mode selectors (`[data-color-scheme]`, `prefers-color-scheme`, `[data-density]`, `[data-modality]` / `@media (pointer: coarse)`, `prefers-reduced-motion`, `prefers-contrast`, `@media (color-gamut: p3)`); Tailwind v4 `@theme inline` referencing the CSS variables; TypeScript typed maps; Swift enums with Display P3 colors and density/modality tables; `.xcassets` color sets with Any/Dark and high-contrast slots; a Tokens Studio flavor (hex, px strings, `$themes.json`) and a Figma-native flavor (one file per mode).
6. **Color pipeline**: OKLCH in → sRGB-mapped `oklch()` plus P3 re-declaration for CSS, gamut-mapped `Color(.displayP3, …)` and P3 asset catalogs for Swift, 6-digit hex for Figma flavors. One number in, three outputs, one library (Color.js) doing the mapping.
7. **Generated outputs are committed**; CI rebuilds and fails on a non-empty diff. A `tokens:diff` job classifies changes (value change = minor, removal or type change = major, following Spectrum's rule) and rejects an under-declared bump.
8. **`$extensions["app.prism"]`** on tokens carries Figma metadata (collection, scopes, code syntax), agent usage rules and accessibility pairing (`pairsWith`, `minContrast`), following GitHub Primer's pattern; the agent guide is generated from it.

## Alternatives considered

- **Tokens Studio JSON + handwritten platform code + golden tests** (RideVerse): proven, but double work and late drift.
- **Terrazzo as the primary engine**: the only tool with native resolvers today, but single-maintainer risk and an experimental, color-only Swift plugin; Prism would write its own Swift output anyway. Used as a linter and second opinion instead.
- **Figma Variables as the source**: loses units, OKLCH, P3 and composite descriptions; REST write is Enterprise-only.
- **Modes in token names or vendor `$extensions.mode`**: non-standard; the resolver module is what both tools will read.

## Consequences

- The resolver driver and custom Swift/CSS formats are real code with tests; they are the first tickets after the skeleton.
- Duration objects need a small custom transform until Style Dictionary finishes them.
- Any consumer that only understands hex is served by the maintained `hex` fallback, so Figma stays reachable without the paid Tokens Studio plan or Enterprise Figma.

## Rules that follow

1. No literal color, size, font or duration outside `tokens/`; CI greps `swift/` and `web/`.
2. A modifier may write only the token types it owns; a token id written by two modifiers fails `tz lint`.
3. Brands write `ref.*` and a whitelisted set of `sys.*` aliases only; component tokens alias `sys.*` only.
4. Every semantic color used for text declares `pairsWith`; the contrast test runs on resolved permutations, not on source files.
