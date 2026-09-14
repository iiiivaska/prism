# Architecture Decision Records

One file per decision, numbered to match `docs/decisions.md`. An ADR is never edited to change its meaning; a new ADR supersedes it and both link to each other.

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-consumers-and-agent-first.md) | Consumers are the owner's apps; the developer is an agent | accepted |
| [0002](0002-meta-system-with-brand-layer.md) | Meta-system with a brand layer | accepted |
| [0003](0003-two-implementations-swiftui-react.md) | Two implementations: SwiftUI and React; minimum OS 26 | accepted |
| [0004](0004-dtcg-tokens-style-dictionary.md) | Single DTCG token source built by Style Dictionary | accepted |
| [0005](0005-figma-deferred.md) | Figma deferred, Figma-ready from day one | accepted |
| [0006](0006-spec-contract-and-parity.md) | Component spec as versioned contract; parity report; one system version | accepted |
| [0007](0007-dataviz-first-class.md) | Data-viz is a first-class module | accepted |
| [0008](0008-typography-slots-and-presets.md) | Three font slots, Native and Signature presets, Cyrillic mandatory | accepted |
| [0009](0009-materials-in-layers.md) | Materials in layers: native chrome, solid / vivid / glass content | accepted |
| [0010](0010-platform-tiers-density-modality.md) | Platform tiers; density and modality as token dimensions | accepted |
| [0011](0011-accessibility-tiers-ci.md) | Accessibility in tiers, enforced in CI | accepted |
| [0012](0012-layers-and-v1-scope.md) | Five layers and the v1 scope | accepted |
| [0013](0013-icon-registry.md) | Icons through a semantic registry | accepted |
| [0014](0014-monorepo-and-distribution.md) | Monorepo with Package.swift at root; SPM tags; GitHub Packages | accepted |
| [0015](0015-references-inspiration-only.md) | References are inspiration only | accepted |
| [0016](0016-name-and-prefix.md) | Name Prism, prefix `ds` | accepted |
| [0017](0017-blueprint-first.md) | First deliverable is a blueprint, in English | accepted |
| [0018](0018-repository-name-and-visibility.md) | Repository `iiiivaska/prism`, public (amends 0014, 0016) | accepted |

## Template

```markdown
# ADR-NNNN: Title

- Status: proposed | accepted | superseded by ADR-NNNN
- Date: YYYY-MM-DD
- Decision record entry: docs/decisions.md #N

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
