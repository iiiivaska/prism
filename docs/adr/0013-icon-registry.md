# ADR-0013: Icons through a semantic registry

- Status: accepted (decisions 2 and 5 amended by [ADR-0019](0019-web-runtime-contract.md): the React wrapper is `Icon` and the TypeScript map is `iconRegistry`; decision 4 amended by [ADR-0035](0035-filled-on-both-stacks-or-neither.md): an entry whose SF Symbol has no fill variant is marked `fill: false` and draws its outline for `filled` on both stacks)
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #13

## Context

The references use thin line icons in the style of Iconly, which is proprietary (no redistribution, per-client caps). Apple provides SF Symbols: nine weights, three scales, rendering modes, Draw On/Off animations, but their license (the Xcode and Apple SDKs agreement's "system-provided images" clause, plus the SF Symbols app agreement as reproduced by a community poster in 2023 with Apple staff acknowledgement) limits them to user interfaces of apps running on Apple operating systems and forbids use on the web or inside distributed packages. The current SF Symbols 7/8 installer text was not re-read; the conclusion does not depend on its exact wording. The owner already uses Lucide on the web.

Facts verified on 2026-09-08 (see `docs/research/icons-tooling.md`):

- Phosphor Icons: 1,512 icons, six weights (thin, light, regular, bold, fill, duotone) drawn as separate cuts on a 256 grid with strokes of 8 / 12 / 16 / 24 units, MIT license, `@phosphor-icons/react` 2.1.10, `@phosphor-icons/core` 2.1.1 exposing a machine-readable `icons` catalog. Icon content has not changed since March 2024.
- The official `phosphor-icons/swift` package rasterizes SVGs (no `preserves-vector-representation`), declares no watchOS platform, and is effectively unmaintained.
- SF Symbols 7 ships with OS 26; SF Symbols 8 is in beta with OS 27. `name_availability.plist` in `CoreGlyphs.bundle` and `NSImage(systemSymbolName:)` returning nil give two CI-usable validators.
- Lucide has a single weight driven by a stroke-width prop; Tabler and Hugeicons free tiers are single-style; only Phosphor offers separately drawn weights under a permissive license.

## Decision

1. A **semantic registry** (`spec/icons/registry.json`, schema in `registry.schema.json`) is the only way to reference an icon. Ids are `namespace.name` (`nav.back`, `action.add`, `status.warning`).
2. **Web binding**: Phosphor, bundled from `@phosphor-icons/core` at a pinned version; rendered by `@phosphor-icons/react` through a `DSIcon` wrapper.
3. **Apple binding**: an SF Symbol for everything Apple offers (always used in system chrome), or a custom symbol set generated from Phosphor raw sources when nothing fits. Prism generates its own asset catalog with `preserves-vector-representation: true` instead of depending on the Phosphor Swift package.
4. **Weight is a token** (`icon.weight`) mapped to Phosphor cuts and SF weights; **style** (outline / filled / duotone) is a second token mapped to Phosphor fill/duotone and SF `.fill` variants / hierarchical rendering.
5. **CI validates** the registry against the Phosphor catalog and SF availability at the minimum OS, and generates the Swift enum, the TypeScript map and the Tokens Studio export.

## Alternatives considered

- SF Symbols on Apple and Lucide on web without a mapping: metaphors drift silently.
- One open set bundled everywhere including Apple chrome: loses SF's optical alignment with San Francisco, symbol effects and user expectations in toolbars.
- Iconly (matches the references best): license forbids redistribution inside a design system.

## Consequences

- Phosphor's stalled release cadence means Prism must be ready to author missing glyphs in Phosphor style (256 grid, 8/12/16/24 strokes) or add a secondary source per icon.
- Symbols introduced in SF Symbols 8 are rejected by CI until the minimum OS moves to 27, unless a fallback is declared.
- Draw On/Off and Magic Replace are Apple-only enhancements gated by Reduce Motion; the web has no equivalent and does not pretend to.

## Rules that follow

1. No icon without a registry entry; no SF Symbol name outside `swift/`.
2. Components declare icons in specs by id and weight token only.
3. The registry version equals the system version; deprecations carry `replacedBy`.
