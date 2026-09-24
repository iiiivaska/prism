# ADR-0006: Component spec as versioned contract; parity report; one system version

- Status: accepted (the major-bump consequence amended by [ADR-0024](0024-token-source-conventions.md) §14 while the version is 0.x; decision 5's "the registries" amended by [ADR-0038](0038-version-authority.md): only the icon registry carries the system version, and the haptics registry's `version` is its own)
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #6

## Context

Every component is written twice (SwiftUI and React). Tokens are generated, so values cannot drift; behavior, anatomy, states and accessibility can. The owner's explicit requirement: when a component changes, it changes everywhere, or something warns loudly that the other platform is behind. Agents, not humans, will make most changes, so the mechanism must be mechanical, not cultural.

Full generation of components from one description was rejected: SwiftUI and React idioms differ enough that generated code is mediocre in both, and beauty is the top requirement.

## Decision

1. **The spec is the contract.** `spec/components/<Name>.yaml` (schema: `spec/component.schema.json`, intent: `spec/SCHEMA.md`) declares name, layer, `specVersion`, platform support, anatomy, props, states, token bindings, behavior, motion, haptics, accessibility, usage rules and examples.
2. **Implementations declare what they implement.** `swift/Sources/DSComponents/Manifest.swift` and `web/packages/react/src/manifest.ts` map component → implemented `specVersion`. Adding or updating a component means updating the manifest in the same change.
3. **CI produces a parity report** (`tools/parity`): for every spec × platform cell it prints `spec vN / impl vM` and the platform support level. A cell where `M < N` on a platform marked `full` or `adapted` fails the build on `main` and warns on branches. `none` cells are satisfied by definition. The report is also rendered into the gallery.
4. **Snapshots side by side.** Every spec `examples[]` entry is rendered by both stacks into `gallery/snapshots/`; the gallery shows Swift and web renders next to each other per example, per scheme. Visual drift is caught by eyes; structural drift by the report.
5. **One version for the whole system.** `VERSION` at the repo root (semver) applies to the SPM package tag, every npm package and the registries. Apps pin one number. Per-component `specVersion` integers exist only for parity and never appear in package versions.
6. **Change order is fixed:** spec (bump `specVersion`) → tokens if values change → Swift and web implementations → manifests → snapshots. A pull request that touches implementation without a spec change to justify it is rejected by a CI check that diffs `spec/` against the manifests.

## Alternatives considered

- Semver per package with changelog discipline: no mechanism; drift within months under agent-driven development.
- Full code generation from the spec: prevents drift but produces poor native code on both sides.
- Independent versions per package: apps would pin pairs that were never tested together.

## Consequences

- The spec becomes the single document an agent reads to build a screen, the input for the parity report, the gallery index, the future Figma library and the agent skill: one file, four consumers.
- Every visible change costs one extra edit (the spec) and one extra review artifact (the report) — a deliberate price.
- Breaking changes bump the system major version; the release checklist requires a migration note per bumped spec.

## Rules that follow

1. No implementation change without a spec change that explains it; editorial fixes to specs do not bump `specVersion`.
2. Manifests are edited by hand and validated by CI against the spec list (no orphan or missing entries).
3. A component's first implementation on a platform must land with snapshots for every `examples[]` entry.
4. `platforms.<p>: none` requires a sentence in `notes.platform.<p>`.
