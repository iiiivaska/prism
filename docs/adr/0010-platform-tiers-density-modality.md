# ADR-0010: Platform tiers; density and input modality as token dimensions

- Status: accepted (color scheme and density nesting, the per-platform default contexts and the web density default amended by [ADR-0019](0019-web-runtime-contract.md); the density bullet amended by [ADR-0021](0021-typography-rules.md): density no longer changes type line heights; the Tier 3 "Surface (solid only)" row and the "no blur on watch" example amended by [ADR-0022](0022-materials-and-fallbacks.md): glass renders the opaque raised fallback, a DSCore Surface rule rather than a platform token delta; `size.hit` moved from the density bullet to modality by [ADR-0024](0024-token-source-conventions.md); the density bullet amended by [ADR-0029](0029-direction-board-sign-off.md): a fourth density, `watch` (regular with a 16 px card padding), is the watchOS default, and `comfortable` stays an accessibility choice)
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #10

## Context

Five target platforms (iOS, iPadOS, macOS, watchOS, web) are really three input worlds: touch on phone and tablet, pointer and keyboard on Mac and desktop web, and the wrist with a crown. "Everything everywhere" would either sink the system under watchOS constraints or leave desktop without hover, focus and dense layouts. iPad switches worlds at runtime when a trackpad is attached, so input modality cannot be a compile-time property of a platform.

## Decision

### Tiers

| Tier | Platforms | Scope |
|------|-----------|-------|
| 1 | iOS, iPadOS, web-touch | Full component set. Touch targets 44 pt. |
| 2 | macOS, web-desktop | Full set plus desktop-only components (Sidebar, Table, ContextMenu, CommandPalette), hover and focus-visible states, keyboard navigation, compact density by default. |
| 3 | watchOS | Deliberately small set from day one: tokens, Text, Icon, Surface (solid only), Button, ListRow, StatTile, ProgressRing, RingGauge, a glanceable Card; no blur, no glass, no hover, no tooltips. |

Every spec carries `platforms.<p>: full | adapted | none`. `none` is a design decision satisfied by definition in the parity report, not a backlog item.

### Dimensions

Two runtime dimensions are first-class in tokens, resolved once at the root of the view tree and consumed by components through tokens rather than platform branches:

- **Density** — `compact` (desktop default), `regular` (touch default), `comfortable` (watch default and an accessibility choice). Affects `space.*`, `size.control.*`, `size.hit.*`, list row heights and type roles' line-heights through the density layer of `tokens/`.
- **Input modality** — `pointer` or `touch`. Affects the presence of hover, minimum hit size (28 pt pointer / 44 pt touch), tooltip availability and focus-ring behavior. Detected at runtime (SwiftUI: environment + pointer interactions on iPadOS; web: `@media (hover: hover) and (pointer: fine)` plus a data attribute override).

Platform remains a last-resort dimension (`tokens/platform/apple|web|watch`) for deltas that are truly platform-bound, such as "no blur on watch".

## Alternatives considered

- Full parity on every platform: watchOS makes it impossible; the attempt would flatten desktop.
- Watch out of v1: tokens and specs designed without the watch would later need breaking changes.
- Encoding density in component props (`size="compact"`): every component reinvents it; agents forget it; layouts mix densities.

## Consequences

- Specs list `density` and `modality` arrays so the parity report and gallery can render each supported combination.
- The gallery renders Tier 2 examples in compact density with pointer modality and Tier 1 in regular with touch, side by side.
- watchOS gets its own snapshot matrix with few entries; its small size is the point.

## Rules that follow

1. No `#if os(...)` or user-agent branch inside a component to change spacing or sizes; use density and modality tokens.
2. Hover styles exist only when modality is `pointer`; touch never shows a hover state.
3. A component that cannot work on the watch says `none` with a reason; it does not ship a degraded version silently.
