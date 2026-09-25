# Changesets

A changeset is how a change says what it does to consumers. Write one in the same commit as the
change: `pnpm changeset`, pick the packages, pick the bump, describe the change in the words a
consumer reading the changelog needs. Those words become the CHANGELOG.md of a web package, so they
name no SF Symbol (ADR-0013 rule 5): `pnpm icons:build` would stop the release on one, and
`tools/release/stamp.test.ts` fails the changeset first.

## The fixed group

`config.json` puts every `@iiiivaska/prism-*` package in one **fixed** group, so naming any one of
them releases all of them at the same number. That is ADR-0014's "one tag = one version": the tokens,
the components, the charts, the Swift package and the specs are one system, and a consumer who reads
`0.2.0` in one place may assume it everywhere. A changeset that names only `@iiiivaska/prism-react`
still moves `@iiiivaska/prism-tokens` and `@iiiivaska/prism-charts` with it.

`ignore` holds the packages that are never published — the gallery, the visual-regression app and the
tools. They match the glob too, and being ignored is what keeps them out of the group.

`node tools/release/stamp.ts --check` fails when a published package is in no fixed group, when two
groups split them, or when the three manifests have drifted apart; `stamp.test.ts` runs it against
this repository, so that cannot reach a tag.

## Which bump

`tokens:diff` classifies the token changes between the last release tag and the working tree and
fails when the pending changesets declare less than the change requires (ADR-0024 §14, roadmap P1-7).
Its policy is **shifted while the system is 0.x**: a breaking change is declared `minor` and an
addition `patch`. So, below 1.0:

* a removed or renamed token, a removed prop, a changed default → `minor`
* a new token, a new component, a new prop → `patch`

`major` is refused below 1.0 — Changesets has no 0.x special case, so it would take `0.1.0` straight
to `1.0.0`. Reaching 1.0 is the owner's decision (`stamp.ts --allow-major`).

## What happens to a changeset

The release workflow consumes them: `changeset version` computes the one version and writes the three
published manifests and their changelogs, `tools/release/stamp.ts` records it in `VERSION` and writes
every derived copy from there, and the tag `v<VERSION>` is what SwiftPM consumers resolve.
`tools/release/README.md` has the whole order and the C-15 decision behind it.

`access` in `config.json` is Changesets' own default for a publish it never performs here: the release
workflow passes `--access` from the repository's `PACKAGE_VISIBILITY` variable. That variable records a
decision already taken: ADR-0031 (decision 6) keeps the packages on GitHub Packages public, so it
holds `public`.
