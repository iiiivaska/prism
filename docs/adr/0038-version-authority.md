# ADR-0038: The version authority: Changesets computes the number, `VERSION` records it, and `release:stamp` writes every other copy

- Status: accepted
- Date: 2026-09-24
- Decision record entry: docs/decisions.md #38
- Amends: ADR-0014 (the third Distribution bullet: "`VERSION` is the only place the number lives, and the release workflow stamps it into `Package.swift` comments, `package.json` files, the registries and the skill"), ADR-0006 (decision 5: which registries carry the system version)

This ADR records a decision that roadmap P3-6 took and built on 2026-09-22 (`1e2e2c0`), and that `tools/release/README.md` has recorded since then. It changes no code. The roadmap's C-15 follow-up had recorded that this ADR was still owed.

## Context

**What the ADRs say.** ADR-0006 decision 5 gives the system one version: "`VERSION` at the repo root (semver) applies to the SPM package tag, every npm package and the registries." ADR-0014 says where it lives: "`VERSION` is the only place the number lives, and the release workflow stamps it into `Package.swift` comments, `package.json` files, the registries and the skill." ADR-0003 ("Web stack specifics", Build and publish), accepted the same day, chose Changesets 3 with a `fixed` group, so that every `@iiiivaska/prism-*` package shares the system version. Changesets computes a version and writes it into `package.json` files. It never reads `VERSION`.

**The finding.** Critic C-15 (high) named the conflict. There were two authorities for one number, and the private root manifest held a third copy. The Swift constant was hard-coded at 0.1.0, there was no release workflow, and the diff policy would take 0.x straight to 1.0.0. Its remedy was to choose one authority in ADR-0014: Changesets computes the number, and a script writes it to `VERSION`, the Swift constant and the skill. ADR-0024 §14 settled the 0.x diff policy on 2026-09-15.

**What P3-6 built.**

- `tools/release/stamp.ts`, with its ledger in `tools/release/targets.ts`.
- The `release:plan`, `release:stamp`, `release:check` and `release:version` scripts.
- One fixed group in `.changeset/config.json`, `@iiiivaska/prism-*`, which ignores the gallery, VRT and tools packages.
- `.github/workflows/release.yml`.

The rehearsal ran in a scratch clone and went from 0.1.0 to 0.2.0. It tagged `v0.2.0`, and SwiftPM resolved the SwiftUI fixture against that tag and pinned `0.2.0` (roadmap P3-6).

**Checked again for this ADR** on 2026-09-24, in a scratch copy of `bab02d8`. Nothing was written to the repository.

- `release:plan` reads the 15 pending changesets as `minor`: 0.1.0 → 0.2.0, tag `v0.2.0`.
- `changeset version` moves exactly the three published manifests to 0.2.0.
- `release:stamp` then stamps `VERSION` and its eight derived copies, and `release:check` passes.
- Nothing in the tree reads a version from `Package.swift` or from `agent/SKILL.md`, and neither carries one. No package's `files` includes `agent/`.
- `spec/haptics.yaml` carries `version: 0.1.0`. The ledger lists it as the haptics registry's own version, and the stamp leaves it alone.
- Two copies are outside the ledger (Consequences).

## Decision

1. **One number has five roles, and every copy has one writer.** No copy is edited by hand.

   | Role | Where | Written by |
   |---|---|---|
   | Input | `.changeset/*.md`: the packages a change touches and the bump it needs | the change's author (`pnpm changeset`) |
   | Computed | the manifests of `@iiiivaska/prism-tokens`, `-react` and `-charts` | `changeset version`, over the fixed group |
   | Recorded | `VERSION` | `release:stamp`, from the fixed group's version |
   | Derived | every other entry of `DERIVED` in `tools/release/targets.ts`: the private root, tools, gallery and VRT manifests, `DSTokensInfo.version`, the tokens package's `version` export, the icon registry's `version` and the licence inventory's `prism` item | `release:stamp`. `icons:build` then regenerates `DSIconName.registryVersion` and `iconRegistryVersion` from the registry |
   | Released | the tag `v<VERSION>`, which is both the SPM tag and the GitHub release tag | the `release` job, after `release:version` |

2. **`release:check` holds the copies together.** `stamp.test.ts` runs `stamp.ts --check` against the repository, so `pnpm test` fails in three cases:
   - a derived copy differs from the fixed group's version;
   - the members of the fixed group carry different versions;
   - the published packages are not all in one fixed group together.

   A dispatch of the release workflow must also confirm exactly the version `release:plan` computes.
3. **Below 1.0, `release:plan` and `release:stamp` refuse a `major` changeset** unless `--allow-major` is passed. Changesets has no 0.x rule, and ADR-0024 §14 declares a breaking change `minor` while the base tag is 0.x. Going to 1.0.0 is the owner's decision.
4. **Some files carry no copy.**
   - `Package.swift` carries none: SwiftPM reads the tag, and a Swift consumer reads `DSTokensInfo.version`.
   - The skill carries none: nothing reads a version from it. It ships in no package, so an app takes it from the repository, where the tag versions it.
   - Of the registries, only the icon registry carries the system version, as its schema says ("Equals the system version"). The haptics registry's `version` is its own.
   - A spec's `specVersion` is one component's contract version (ADR-0006 decisions 1 and 5). Its `since` is the system version the component first shipped in (`spec/SCHEMA.md`). Neither is restamped.

   The ledger's `NOT_THE_SYSTEM_VERSION` lists every `version` field in the tree that is not the system version, the last three among them, and `stamp.ts --ledger` prints it beside `DERIVED`.
5. **A new copy joins the ledger in the change that creates it.** A file that starts carrying the system version must do one of two things: become an entry of `DERIVED`, or be regenerated from one by a step of `release:version`. That includes a version that the skill generator of ADR-0001 rule 3 (critic G-18) may give the skill. A new `version` that is not the system version joins `NOT_THE_SYSTEM_VERSION` with its reason.

The rest of ADR-0014 stands. That includes "one tag = one version" for both stacks and rule 2, "`VERSION` changes only in a release commit", which is the commit the `release` job makes. ADR-0006 decision 5 also stands, with "the registries" read as the icon registry.

## Alternatives considered

- **`VERSION` alone, as ADR-0014 wrote it.** This lost for three reasons:
  - a person would choose the next number by hand, which is what Changesets exists to remove;
  - the number has to be computable from the pending changesets before a release runs, because a dispatch's `confirm` input is compared with `release:plan`;
  - Changesets writes the manifests anyway (ADR-0003), so a hand-kept `VERSION` would be the second authority that C-15 found.
- **The published manifests alone, with no `VERSION`.** This lost because `VERSION` can be read without a JSON parser and without choosing which of three packages to believe. The release workflow's tag check reads it with `cat`, and the Apple showcase's generator reads it for its token catalogue.
- **Stamping the skill, as ADR-0014 and C-15 proposed.** This was not taken. The skill holds no version, so stamping it would first mean adding a number that nothing reads. If the skill generator of ADR-0001 rule 3 gives the skill a version, decision 5 puts that version in the ledger.
- **A version comment in `Package.swift`.** This was not taken. SwiftPM resolves the tag, so a comment could only drift.

## Consequences

- The tooling does not change. `tools/release/README.md` now points here instead of saying that an amendment is owed.
- **Two copies are outside the ledger.** The re-check above found both. Each is a tooling follow-up under decision 5, and this ADR changes neither.
  - (a) `web/apps/showcase/package.json` carries `0.1.0`, and the ledger does not list it. The showcase landed after P3-6 (`0ee722a`) and was never added to `targets.ts`. The manifest is private, so `changeset version` leaves it alone. It is not in `DERIVED`, so `release:stamp` does not write it and `release:check` does not read it. After the stamp it still said 0.1.0 while every other copy said 0.2.0. The follow-up gives it a `DERIVED` entry, or a `NOT_THE_SYSTEM_VERSION` entry with its reason.
  - (b) The Apple showcase's generated `swift/Showcase/Sources/DSShowcase/Generated/DSTokenCatalog.swift` copies `VERSION` into `DSTokenCatalog.version`, and `release:version` does not regenerate it. After the stamp, `node showcase/apple/generate.ts --check` exits 1 and names that file. The release job's re-verify step runs no test, and its pushes trigger no workflow. So a release made through `release:version` as it stands would commit a stale catalogue, and the next `ci` run on that branch would fail `tools/showcase/apple/catalog.test.ts`. The follow-up adds `pnpm showcase:apple:generate` to `release:version`, beside `pnpm icons:build`.
- Critic C-15 is resolved. The roadmap's C-15 follow-up and its P3-6 row now point here.

## Rules that follow

1. No copy of the system version is edited by hand. `release:check` fails a derived copy that differs from the fixed group.
2. Every published package is in the same single fixed group, and `release:check` fails otherwise.
3. Every file that carries the system version is in `DERIVED`, or `release:version` regenerates it from one that is. A `version` that is not the system version is listed in `NOT_THE_SYSTEM_VERSION` with its reason.
4. While the version is 0.x, a pending `major` changeset fails `release:plan` and `release:stamp` unless `--allow-major` is passed. Passing it is the owner's decision.
5. The release tag is `v<VERSION>` and points at a release commit. A pushed tag whose version is not `VERSION` fails the release workflow's `plan` job.
