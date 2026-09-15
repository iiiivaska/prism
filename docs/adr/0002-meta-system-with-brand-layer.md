# ADR-0002: Meta-system with a brand layer

- Status: accepted (brand mechanics amended by [ADR-0020](0020-brand-model.md): brands write allowlisted `ref.*` ids only, the semantic bindings of rule 2 are `ref.color.slot.*` tokens that the scheme files alias, and brand folders live in Prism's `brands/` until a published CLI exists; the component-token bullet and rule 1 amended by [ADR-0024](0024-token-source-conventions.md))
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #2

## Context

The owner's taste references are five different products by one studio (Soma, Hydroflask, Credit Karma, CreditPros, Arvion, Vexto): a shared school of layout, typography and surfaces, but different accents, gradients and moods (light airy vs dark ops). The owner's own products also differ: RideVerse already has its own "Glacier" palette; a finance dashboard and a video app will not want the same accent.

A single-brand system would force every product into one look and would break at the first product that needs another accent. A structure-only "kit" with no opinion produces grey skeletons, which violates the owner's top requirement: the output must be beautiful out of the box.

## Decision

Prism is a meta-system with three token tiers and a brand layer:

- **Primitive tokens** (`color.neutral.500`, `space.4`, `radius.3`, font families and scales): raw values, no meaning.
- **Semantic tokens** (`color.surface.solid`, `color.text.secondary`, `color.accent`, `elevation.2`, `type.body.md`): meaning, resolved per color scheme, density and modality.
- **Component tokens** (`button.primary.bg`, `card.glass.fill`): the only tokens components bind to; they alias semantic tokens.

A **brand** is a folder in `brands/<name>/` that overrides primitives (palettes, gradients, font slots) and, when needed, a small set of semantic bindings. It cannot add component tokens or change structure. Prism ships one reference brand (`brands/prism/`) with two moods, light and dark, tuned to the references. Apps may add their own brand folders in their repos and build tokens with the same pipeline.

## Alternatives considered

- **One system, one brand**: simplest, but RideVerse would need a repaint and the "ops" and "airy" references could not coexist.
- **Several built-in moods, no arbitrary brands**: cheaper than full theming but still forces every product into a preset.

## Consequences

- Beauty must be proven on the reference brand, not assumed from the architecture; the direction board exists for that.
- Every component is designed against semantic tokens only; a brand that keeps its semantic contrast pairs valid automatically keeps every component accessible.
- Brand authors get a short contract (`brands/README.md`) and the same contrast test in CI.

## Rules that follow

1. Components bind only to component tokens; component tokens alias only semantic tokens; semantic tokens alias only primitives. No tier skipping.
2. A brand may override primitives and a whitelisted set of semantic tokens (listed in `brands/README.md`); everything else is inherited.
3. The reference brand is the acceptance target for every visual test; other brands must pass the same structural and contrast tests but are not snapshot-compared.
