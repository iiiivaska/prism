# ADR-0018: Repository `iiiivaska/prism`, public

- Status: accepted
- Date: 2026-09-14
- Decision record entry: docs/decisions.md #18
- Amends: ADR-0014 (Swift package URL), ADR-0016 (GitHub repository name)

## Context

ADR-0016 named the GitHub repository `iiiivaska/DesignSystem`. When Phase 0 started, that name was already taken on the owner's account by an earlier, unrelated SwiftUI-only design system (`iiiivaska/designSystem`, last commit 2026-02-10); GitHub repository names are case-insensitive, so the two cannot coexist. The owner chose on 2026-09-14 to leave the earlier repository untouched and to host Prism under its own name.

The owner also chose a **public** repository. Public repositories get unmetered GitHub Actions minutes, including the macOS runners the `apple` CI job needs; private repositories bill macOS minutes at ten times the Linux rate.

## Decision

1. The repository is **`https://github.com/iiiivaska/prism`**. Swift consumers add this URL by tag; npm `repository.url` fields and JSON Schema `$id`s point at it.
2. The repository is **public**. The ADR-0015 inspiration firewall holds unchanged: no reference imagery, only written analysis and URLs.
3. Everything else in ADR-0014 and ADR-0016 stands: SPM package name `Prism`, products `DS…`, npm scope `@iiiivaska`, packages `@iiiivaska/prism-*` on GitHub Packages, code prefix `ds`.

## Alternatives considered

- **Rename the earlier repository to `designSystem-legacy` and reuse `DesignSystem`**: keeps ADR-0016 verbatim but rewrites the history of an unrelated project; rejected by the owner.
- **Private repository**: keeps the research out of public view until the ADR-0015 legal checkpoint, at the cost of metered macOS CI; rejected by the owner.

## Consequences

- A public repository counts as publishing the blueprint. The ADR-0015 legal checkpoint (Apple Design Resources reading, Untitled UI dual license, EU unregistered-design exposure) still gates the first **package** release and any announcement; it is tracked in `docs/roadmap.md` under "Verify before implementing".
- The package visibility of GitHub Packages published from a public repository must be decided in the release dry run (P3-6); ADR-0014's "private, free" note is re-checked there.

## Rules that follow

1. The only repository URL in code, manifests and docs is `https://github.com/iiiivaska/prism`.
2. Nothing committed may contain a reference shot, a crop of one, or a file downloaded from dribbble.com (ADR-0015 rule 1 applies to a public tree without exception).
