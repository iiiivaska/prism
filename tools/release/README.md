# `tools/release` — the version authority and the release rehearsal

Roadmap P3-6. Settles critic **C-15** ("which artefact is the authority for the version number, and
which step writes the others") and implements the stamping the release workflow runs.

## The decision

One number describes the whole system (ADR-0006 rule 1, ADR-0014 "one tag = one version"). It is
written down in several files because npm, SwiftPM and generated code each need it in their own
syntax. C-15 asked which of them is the authority. Four roles, not one:

| Role | Where | Written by |
|------|-------|------------|
| **Input** | `.changeset/*.md` | the author of the change |
| **Computed** | the three published manifests (`web/packages/*/package.json`) | `changeset version`, over the fixed group of `.changeset/config.json` |
| **Recorded** | `VERSION` | `release:stamp`, from the fixed group |
| **Derived** | the private manifests, `DSTokensInfo.version`, the tokens package's `version` export, `spec/icons/registry.json` `version` | `release:stamp`, from `VERSION` |
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
- `spec/icons/registry.json` `icons[].since`, `spec/components/*.yaml` `since` — the system version a
  thing *first shipped in*. Historical; never restamped.
- `spec/components/*.yaml` `specVersion` and `implemented` in each stack's manifest — the contract
  version of one component (ADR-0006 rule 2). Unrelated to the system version by design.
- `spec/haptics.yaml` `version` — the haptics registry.
- `pnpm-workspace.yaml` `catalog:` — third-party ranges.

The icon registry's top-level `version` **is** the system version: its schema says so
(`spec/icons/registry.schema.json`, "Equals the system version"). Stamping it changes generated code
(`DSIconName.registryVersion`, `iconRegistryVersion`), so a release runs `pnpm icons:build` after the
stamp and CI's stale-output gate proves it happened.

## Commands

```
pnpm release:plan     # the version the pending changesets would produce, and its tag
pnpm release:stamp    # write every derived copy from the fixed group's version
pnpm release:check    # report drift, write nothing, exit 1 (runs in the test suite)
node tools/release/stamp.ts --ledger
```

`--root <dir>` runs any of them against another tree with the same layout — a scratch clone during a
rehearsal, or the miniature tree the tests build.

`release:check` also fails when the fixed group has stopped moving together (two published packages
on different versions), and when a published package is in no fixed group at all — the two ways
`changeset version` could hand out more than one number. `stamp.test.ts` runs it against this
repository, so drift fails `pnpm test`, and therefore CI, without a new CI step.

## The order of a release

1. `pnpm changeset` while the change is made — the input.
2. `pnpm release:plan` — what the pending changesets would produce. The release workflow's
   confirmation input is compared against this before anything runs.
3. `pnpm changeset version` — the three published manifests and their changelogs.
4. `pnpm release:stamp` — `VERSION` and every derived copy.
5. `pnpm icons:build` — the generated icon constants follow the registry.
6. `pnpm -r build`, the contract gates, `swift test` — the tree is what is about to be released.
7. The release commit, then the tag `v<VERSION>`: the SPM tag consumers resolve.
8. `pnpm -r publish` to GitHub Packages, then the GitHub release.

Steps 3 to 8 are `.github/workflows/release.yml`; steps 1 and 2 are the author's.

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
