# ADR-0016: Name Prism, code prefix `ds`

- Status: accepted (repository URL amended by [ADR-0018](0018-repository-name-and-visibility.md); rule 1 and the example variable name amended by [ADR-0019](0019-web-runtime-contract.md))
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #16

## Context

The name lands in package identifiers, Swift type prefixes, CSS custom properties, the npm scope and the agent skill. It must be short, brand-neutral (the system hosts many brands), Latin, and not collide with a well-known library. The prefix must be two or three characters and must not read as something else in code.

## Decision

- System name: **Prism** — light through a prism becomes many colors: one system, many brands; and a nod to the glass surfaces in the references.
- Code prefix: **`ds`** — `DSButton`, `DSCharts`, `--ds-color-surface-solid`, `.ds-button`. `pr` was rejected because `PR` reads as "pull request".
- GitHub: `iiiivaska/DesignSystem` — amended by ADR-0018 to `iiiivaska/prism` (the name was taken). npm scope: `@iiiivaska` (GitHub Packages requires the scope to equal the owner), packages `@iiiivaska/prism-tokens`, `@iiiivaska/prism-react`, `@iiiivaska/prism-charts`. SPM package name `Prism`, products `DSTokens`, `DSCore`, `DSComponents`, `DSCharts`.

## Alternatives considered

- **Facet** (`fc`): neutral but bland.
- **Lumen** (`lm`): overused in web projects.

## Consequences

- The word "Prism" appears in documentation and package names; code uses `ds` only, so a rename of the system would not touch code.

## Rules that follow

1. Public Swift symbols start with `DS`; public React components have no prefix but live under `@iiiivaska/prism-react`; CSS classes and custom properties start with `ds-`.
2. Token paths never include the system or brand name.
