# ADR-0005: Figma deferred, Figma-ready from day one

- Status: accepted
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #5

## Context

The owner listed a Figma library as one of three pillars of a design system but has no Figma-first process: exploration happens through agents, HTML mock-ups and canvases, and the previous system's Figma brief was written but the library never became a working artifact. A Figma library that mirrors two code implementations is the most expensive artifact in a design system and pays off only when someone designs in it.

Verified facts (2026-09-08, `docs/research/arch-tokens.md`):

- Tokens Studio reads a DTCG flavor with string values; exporting multi-mode Figma variable collections (Themes) requires the paid plan; the free plan exports token sets as single-mode collections.
- Figma's native variable import accepts DTCG-shaped JSON with sRGB/HSL colors and px dimensions, one file per mode; Professional plans allow 10 modes per collection, Organization 20; extended collections (multi-brand overrides) are Enterprise-only.
- The Figma Variables REST API (read and write) is documented as Enterprise-only; the Plugin API can create collections, variables and modes without a documented plan gate.
- Phosphor Icons has an official Figma plugin and community file (MIT); SF Symbols may appear only in Apple-platform mock-ups under Apple's Design Resources license.

## Decision

1. **No Figma library is built in this phase.** The living visual canon is the gallery: web renders and SwiftUI snapshots of every spec example side by side, plus the direction board.
2. **Figma-readiness is built in now, cheaply**: the token build emits a Tokens Studio flavor (hex, px strings, `$themes.json`) and a Figma-native flavor (one JSON per brand × scheme); every token carries `$extensions["app.prism"].figma` (collection, scopes, code syntax); component specs name anatomy parts and variants the way Figma component properties are named; the icon registry reserves a `figma.component` binding.
3. **When Figma becomes a consumer**, the path is: import tokens (native import or Tokens Studio), build components from specs (by a designer or Claude Design), and, if the plan allows, a private sync plugin using the Plugin API rather than the Enterprise-only REST API. The owner's Figma plan is asked for at that moment, not now.

## Alternatives considered

- **Figma as the source of truth with Code Connect**: three implementations of every component instead of two; requires an Organization or Enterprise plan; no one designs in Figma today.
- **Dropping Figma forever**: costs nothing today but would force token and spec redesign later; readiness is cheap.

## Consequences

- Visual sign-off happens on HTML and snapshots, so the direction board and gallery must be good enough to judge beauty.
- The Tokens Studio and Figma flavors are derived artifacts and can lag the source without breaking anything.

## Rules that follow

1. Nothing in the repository depends on Figma being present.
2. Figma-facing exports are generated, never hand-edited.
3. SF Symbol names never appear in Figma-facing exports.
