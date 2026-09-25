# `tools/release` — the version authority and the release rehearsal

Roadmap P3-6. Settles critic **C-15** ("which artefact is the authority for the version number, and
which step writes the others") and implements the stamping the release workflow runs.

## The decision

One number describes the whole system (ADR-0006 rule 1, ADR-0014 "one tag = one version"). It is
written down in several files because npm, SwiftPM and generated code each need it in their own
syntax. C-15 asked which of them is the authority. Five roles, not one:

| Role | Where | Written by |
|------|-------|------------|
| **Input** | `.changeset/*.md` | the author of the change |
| **Computed** | the three published manifests (`web/packages/*/package.json`) | `changeset version`, over the fixed group of `.changeset/config.json` |
| **Recorded** | `VERSION` | `release:stamp`, from the fixed group |
| **Derived** | `DERIVED` in `targets.ts`: the private manifests (the root, tools, gallery, web showcase and VRT), `DSTokensInfo.version` and the value `DSCoreTests` expects of it, the tokens package's `version` export, `spec/icons/registry.json` `version`, the licence inventory's `prism` item | `release:stamp`, from `VERSION`. Then `REGENERATED`: `icons:build` rewrites `DSIconName.registryVersion` and `iconRegistryVersion` from the registry, and `showcase:apple:generate` rewrites the Apple showcase's `DSTokenCatalog.version` from `VERSION` |
| **Released** | the tag `v<VERSION>` — the SPM tag *and* the GitHub release tag | the release workflow |

Read it as one sentence: **Changesets computes the number, `VERSION` records it, `release:stamp`
distributes it, `release:stamp --check` proves nothing drifted.**

Why not `VERSION` alone, as ADR-0014 wrote it? Because a human choosing the next number by hand is
the thing Changesets exists to remove, and because the number has to be derivable from the pending
changesets before the release runs (the workflow's confirmation input compares against
`release:stamp --plan`). ADR-0014's rule — "`VERSION` is the only place the number lives" — survives
as what it was protecting: one number, recorded in one file, and no copy of it ever edited by hand.
ADR-0038 records this decision as the amendment of ADR-0014's sentence, and of ADR-0006 decision 5's
"the registries": only the icon registry carries the number.

Why not the published manifests alone? Because `VERSION` is what a person, a shell script, a Swift
build and `tokens:diff`'s tag lookup can read without a JSON parser and without knowing which of the
three packages to believe.

### The pre-1.0 rule

ADR-0024 §14: while the base release tag is `0.x`, `tokens:diff` shifts its classification down — a
breaking token change is declared `minor`, not `major`. Changesets has no 0.x special case, so a
`major` changeset would take `0.1.0` straight to `1.0.0` and past the roadmap's own plan ("0.1.0
until Phase 3; 0.2.0 closes Phase 5"). `release:stamp` therefore refuses a pending `major` while the
system is `0.x` and names the changeset file. Going to `1.0.0` is the owner's decision, and
`--allow-major` is how it is meant on purpose.

### What is *not* this number

The question C-15 was filed about is "which `0.1.0` is the system version". `release:stamp --ledger`
prints both halves of the answer; the second half is:

- `brands/*/brand.json` `version` — the brand's own version; a brand iterates on its own (ADR-0020).
- `brands/*/brand.json` `fonts[].version` — the font file's name ID 5, checked by `fonts:check`.
- `spec/icons/registry.json` `sources.phosphor.version` — the installed `@phosphor-icons/core`.
- `spec/icons/registry.json` `icons[].since`, `spec/components/*.yaml` and `spec/patterns/*.yaml`
  `since` — the system version a thing *first shipped in*, and the generated copies of it in
  `DSShowcaseCatalog.swift` and `web/packages/react/src/generated/icons.ts`. Historical; never
  restamped.
- `spec/components/*.yaml` and `spec/patterns/*.yaml` `specVersion`, and `implemented` in each
  stack's manifest — the contract version of one component (ADR-0006 rule 2). Unrelated to the system
  version by design.
- `spec/haptics.yaml` `version` — the haptics registry.
- `pnpm-workspace.yaml` `catalog:` — third-party ranges.

The icon registry's top-level `version` **is** the system version: its schema says so
(`spec/icons/registry.schema.json`, "Equals the system version"). Stamping it changes generated code
(`DSIconName.registryVersion`, `iconRegistryVersion`), and the Apple showcase's generator copies
`VERSION` itself into `DSTokenCatalog.version`. So a release runs `pnpm icons:build` and
`pnpm showcase:apple:generate` after the stamp. `REGENERATED` in `targets.ts` lists those three copies
with the step that writes each, and `release:check` reads them like any other copy: the release job's
check at the version it confirmed fails on a copy its generator did not rewrite.

ADR-0038 rule 3 says every file that carries the number is in `DERIVED`, or is regenerated by a step
of `release:version`, and three checks hold the ledger to it. `release:check` fails on a workspace
manifest that carries a `version` and is in no list, which is how the web showcase arrived.
`stamp.test.ts` renders both generators over this tree with every derived copy stamped, and fails
when the files that move are not exactly the `REGENERATED` entries of a step that `release:version`
runs after the stamp. It also searches every tracked file for the number written as a string literal
(prose, the lockfile, fixtures and the tools' own tests aside) and fails on one that no list accounts
for; `swift/Tests/DSCoreTests/PlaceholderTests.swift` was found that way.

## Commands

```
pnpm release:plan     # the version the pending changesets would produce, and its tag
pnpm release:stamp    # write every derived copy from the fixed group's version
pnpm release:check    # report drift, write nothing, exit 1 (runs in the test suite)
pnpm release:version  # changeset version, the stamp and every generator after it (the release job's step)
node tools/release/stamp.ts --ledger
```

`--root <dir>` runs any of the `stamp.ts` commands against another tree with the same layout — a
scratch clone during a rehearsal, or the miniature tree the tests build.

`release:check` also fails when the fixed group has stopped moving together (two published packages
on different versions), and when a published package is in no fixed group at all — the two ways
`changeset version` could hand out more than one number. It fails on a workspace manifest outside the
ledger too, and on a stale regenerated copy, naming the step that writes it. `stamp.test.ts` runs it
against this repository, so drift fails `pnpm test`, and therefore CI, without a new CI step.

## The order of a release

1. `pnpm changeset` while the change is made — the input. Its words become a web package's
   CHANGELOG.md in step 3, where step 5's `icons:build` refuses an SF Symbol name (ADR-0013 rule 5),
   so `stamp.test.ts` holds every pending changeset to that rule when it lands.
2. `pnpm release:plan` — what the pending changesets would produce. The release workflow's
   confirmation input is compared against this before anything runs.
3. `pnpm changeset version` — the three published manifests and their changelogs.
4. `pnpm release:stamp` — `VERSION` and every derived copy.
5. `pnpm icons:build` and `pnpm showcase:apple:generate` — the generated icon constants follow the
   registry, and the Apple showcase's token catalogue follows `VERSION`.
6. `node tools/release/stamp.ts --check --version <the confirmed version>`, then `pnpm -r build`, the
   contract gates and `swift test` — the tree is what is about to be released.
7. The release commit, then the tag `v<VERSION>`: the SPM tag consumers resolve.
8. `pnpm -r publish` to GitHub Packages, then the GitHub release.

Steps 3 to 5 are `pnpm release:version`, and steps 3 to 8 are `.github/workflows/release.yml`;
steps 1 and 2 are the author's. The workflow runs step 6's build, gates and `swift test` before
step 3, on the tree as it was. After step 5 it runs the version check, `pnpm -r build`,
`icons:validate`, `tokens:check`, `licenses:check` and the pack audit, and no test, which is why
`release:check` reads the regenerated copies itself.

## What a rehearsal covers

`fixtures/` builds both consumer apps against packed and tagged artefacts rather than a registry:
`fixtures/README.md` has the commands.

`pnpm release:pack --list` is what prints the file list each package would ship, and it is the step
that judges it: it packs with pnpm, reads the tarball back and checks that ADR-0031's `LICENSE` and
`"license": "SEE LICENSE IN LICENSE"` are in it, that critic C-14's `spec/` is where the skill sends
agents, that ADR-0021 §11's brand font files are in `@iiiivaska/prism-tokens`, that every `exports`
subpath and `style` resolves to a file the tarball really carries, that no `workspace:` or
`catalog:` specifier was left for a consumer's installer, and that no packed path looks like a sync
conflict copy (`index 2.js`, `SCHEMA 2.md`, `README 2`), naming each one it finds. That last rule is
for this checkout's home: it sits in iCloud-synced `~/Documents`, and iCloud writes such copies
beside the files a build rewrites, inside the very folders `files` publishes. Every package build
clears the folder it writes first — tsdown's `clean` empties `dist/`, `scripts/copy-spec.ts` removes
`spec/` before it copies, and `pnpm tokens:build` prunes `src/generated/` of any file it did not write
— but a copy can land after the build, so the tarball is where it is caught. CI packs from a clean
clone, where none can exist. That is stronger than a notice list, and it is why the release
workflow's file-list step is this one.

`pnpm -r publish --dry-run` is a different and much thinner thing, and worth keeping only as that: it
runs the publish path the release runs for real — the recursive filter selects the published
packages and each resolves its `publishConfig.registry` — and then uploads nothing. It packs no
tarball and prints no file list, so it cannot tell you what would ship. `npm publish --dry-run` in
one package's directory does print npm's own notice list, which is a useful second opinion on the
file set but checks none of the rules above.
