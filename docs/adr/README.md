# Architecture Decision Records

One file per decision, numbered to match `docs/decisions.md`. An ADR is never edited to change its meaning; a new ADR amends or supersedes it and both link to each other: the new ADR names the old one in its `Amends` or `Supersedes` line, and the old one's `Status` line and this index's Status column name the new one.

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-consumers-and-agent-first.md) | Consumers are the owner's apps; the developer is an agent | accepted |
| [0002](0002-meta-system-with-brand-layer.md) | Meta-system with a brand layer | accepted (amended by 0020, 0024) |
| [0003](0003-two-implementations-swiftui-react.md) | Two implementations: SwiftUI and React; minimum OS 26 | accepted (amended by 0019, 0020, 0023) |
| [0004](0004-dtcg-tokens-style-dictionary.md) | Single DTCG token source built by Style Dictionary | accepted (amended by 0019, 0020, 0021, 0022, 0024, 0026) |
| [0005](0005-figma-deferred.md) | Figma deferred, Figma-ready from day one | accepted (amended by 0024, 0026) |
| [0006](0006-spec-contract-and-parity.md) | Component spec as versioned contract; parity report; one system version | accepted (amended by 0024) |
| [0007](0007-dataviz-first-class.md) | Data-viz is a first-class module | accepted (amended by 0020, 0021, 0030) |
| [0008](0008-typography-slots-and-presets.md) | Three font slots, Native and Signature presets, Cyrillic mandatory | accepted (amended by 0020, 0021) |
| [0009](0009-materials-in-layers.md) | Materials in layers: native chrome, solid / vivid / glass content | accepted (amended by 0022) |
| [0010](0010-platform-tiers-density-modality.md) | Platform tiers; density and modality as token dimensions | accepted (amended by 0019, 0021, 0022, 0024, 0029) |
| [0011](0011-accessibility-tiers-ci.md) | Accessibility in tiers, enforced in CI | accepted (amended by 0021, 0022, 0023, 0032) |
| [0012](0012-layers-and-v1-scope.md) | Five layers and the v1 scope | accepted |
| [0013](0013-icon-registry.md) | Icons through a semantic registry | accepted (amended by 0019) |
| [0014](0014-monorepo-and-distribution.md) | Monorepo with Package.swift at root; SPM tags; GitHub Packages | accepted (amended by 0018, 0024, 0028, 0031) |
| [0015](0015-references-inspiration-only.md) | References are inspiration only | accepted |
| [0016](0016-name-and-prefix.md) | Name Prism, prefix `ds` | accepted (amended by 0018, 0019) |
| [0017](0017-blueprint-first.md) | First deliverable is a blueprint, in English | accepted |
| [0018](0018-repository-name-and-visibility.md) | Repository `iiiivaska/prism`, public (amends 0014, 0016) | accepted (amended by 0031) |
| [0019](0019-web-runtime-contract.md) | Web runtime contract: `data-ds-*` attributes, nesting and defaults (amends 0003, 0004, 0010, 0013, 0016) | accepted (amended by 0025, 0029) |
| [0020](0020-brand-model.md) | Brand model: what a brand overrides and how brands reach each stack (amends 0002, 0003, 0004, 0007, 0008, 0024) | accepted (amended by 0029) |
| [0021](0021-typography-rules.md) | Typography rules: thin weights, numerals, units and Dynamic Type (amends 0004, 0007, 0008, 0010, 0011) | accepted (amended by 0027, 0030) |
| [0022](0022-materials-and-fallbacks.md) | Materials: glass and vivid under accessibility settings and on watch (amends 0004, 0009, 0010, 0011) | accepted (amended by 0025, 0029, 0030) |
| [0023](0023-motion-tokens.md) | Motion tokens: springs, settle, reduced motion and CSS easing (amends 0003, 0011) | accepted |
| [0024](0024-token-source-conventions.md) | Token source conventions: references, semantic roles, gates and flavors (amends 0002, 0004, 0005, 0006, 0010, 0014) | accepted (§4.1 amended by 0020; §13.3 by 0027; §4.1, §6 and §9.5 by 0029; §6 and §9.1 by 0030) |
| [0025](0025-web-component-css-and-root-axes.md) | Web component CSS and root axes: glass fallback in React, Reduce Motion through tokens (amends 0019, 0022) | accepted |
| [0026](0026-figma-metadata-scope.md) | Figma metadata where Figma reads it; code syntax derived by the build (amends 0004, 0005) | accepted |
| [0027](0027-font-emission-layout-and-manifest-names.md) | Font emission layout and manifest CSS names follow the build (amends 0021, 0024) | accepted |
| [0028](0028-license-mit.md) | Prism is MIT-licensed (amends 0014) | superseded by 0031 |
| [0029](0029-direction-board-sign-off.md) | Direction board sign-off (2026-09-15): glass follows the scheme, one-temperature vivid pairs, compact margin, watch density, ghost button (amends 0010, 0019, 0020, 0022, 0024) | accepted |
| [0030](0030-semantic-roles-from-the-direction-board.md) | Semantic roles found by the direction board: map, charts and solids on media, edges and bloom, tints, axis and watch type (amends 0007, 0021, 0022, 0024) | accepted |
| [0031](0031-license-proprietary.md) | Prism is proprietary, all rights reserved; the license carries the requirement, not the visibility (supersedes 0028; amends 0014, 0018) | accepted |
| [0032](0032-component-owned-strings.md) | Component-owned strings: Prism speaks the caller's words, and the icon registry's label is never a name (amends 0011) | accepted |

## Template

```markdown
# ADR-NNNN: Title

- Status: proposed | accepted | accepted (<part> amended by ADR-NNNN) | superseded by ADR-NNNN
- Date: YYYY-MM-DD
- Decision record entry: docs/decisions.md #N
- Supersedes: ADR-NNNN   ← only in an ADR that replaces an older one outright
- Amends: ADR-NNNN (<part>)   ← only in an ADR that amends older ones

## Context
What forces were at play, including facts we verified (with sources).

## Decision
What we chose, precisely enough that an agent can act on it.

## Alternatives considered
Each with the reason it lost.

## Consequences
What becomes easier, what becomes harder, what we must now do.

## Rules that follow
Numbered, checkable rules for implementers and agents.
```
