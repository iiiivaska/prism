# ADR-0014: Monorepo with Package.swift at the root; SPM by tag; npm via GitHub Packages

- Status: accepted (repository URL amended by [ADR-0018](0018-repository-name-and-visibility.md); license files per [ADR-0028](0028-license-mit.md), superseded by [ADR-0031](0031-license-proprietary.md), which also amends the distribution note: the published packages stay public artefacts and a download is not a license; the `tokens/` layout line and rule 1 amended by [ADR-0024](0024-token-source-conventions.md): `tokens/export/` is generated, not source; the version authority in the distribution note's third bullet amended by [ADR-0038](0038-version-authority.md): Changesets computes the number, `VERSION` records it and `release:stamp` writes every other copy, and neither `Package.swift` nor the skill carries one)
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #14

## Context

Tokens, specs, two implementations, tools, gallery and the agent skill must version together (ADR-0006). Swift Package Manager resolves remote packages from the repository root: `Package.swift` must be at the root of the git repository, and `Package.Dependency` has no sub-path syntax (verified in the SwiftPM documentation, `docs/research/arch-apple.md`). GitHub Packages requires an npm scope equal to the repository owner; the GitHub account is `iiiivaska`.

## Decision

Layout:

```
Package.swift            SPM manifest; targets point into swift/ with path:
package.json             pnpm workspace root (private)
pnpm-workspace.yaml
VERSION                  single semver for the whole system
tokens/                  DTCG 2025.10 source + prism.resolver.json
brands/                  brand override folders (reference brand: prism/)
spec/                    component contracts, icon and haptics registries, patterns
swift/Sources/…          DSTokens (generated), DSCore, DSComponents, DSCharts
swift/Tests/…            token/contrast tests, snapshot tests, __Snapshots__
web/packages/…           prism-tokens, prism-react, prism-charts, prism-gallery
tools/                   token build (resolver driver, formats), contrast, parity, icons, spec validation
gallery/                 living canon: rendered examples and paired snapshots
docs/                    decisions, ADRs, research, roadmap
agent/                   Claude Code skill for consuming apps
.github/workflows/       CI
```

Distribution:

- **Swift**: consumers add `https://github.com/iiiivaska/prism` by tag; products `DSTokens`, `DSCore`, `DSComponents`, `DSCharts`.
- **Web**: `@iiiivaska/prism-tokens`, `@iiiivaska/prism-react`, `@iiiivaska/prism-charts` published to GitHub Packages (private, free) from the release workflow; consumers add a scoped registry line to `.npmrc`. Moving to the public npm registry later is a registry change, not a code change.
- **One tag = one version** for both stacks; `VERSION` is the only place the number lives, and the release workflow stamps it into `Package.swift` comments, `package.json` files, the registries and the skill.

## Alternatives considered

- **Separate repositories per stack**: clean distribution, but the parity report and lockstep versioning become cross-repo plumbing that drifts.
- **shadcn-style copy-into-app**: fast for web, no versioning, contradicts ADR-0006.
- **Package.swift under `swift/`**: not resolvable by SPM from a URL.

## Consequences

- The Swift package's `path:` values make the monorepo look like a normal package to consumers; `swift build` at the root must stay green.
- Generated Swift and CSS outputs are committed so a tag is self-contained for SPM consumers without a build step.
- The `.npmrc` requirement for GitHub Packages is documented in the skill for consuming apps.

## Rules that follow

1. Nothing outside `tokens/`, `spec/` and `brands/` is a source of truth for values.
2. `VERSION` changes only in a release commit.
3. `swift build` and `pnpm -r build` must both pass at every commit on `main`.
