# ADR-0028: Prism is MIT-licensed

- Status: accepted
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #28
- Amends: ADR-0014 (Distribution: the repository and every package carry the MIT license text)

## Context

The repository became public on 2026-09-14 (ADR-0018) with no license file, although every published package already declared `"license": "MIT"` (`web/packages/*/package.json`). A public repository without a license grants no rights at all, which contradicted the manifests (critic G-11). On 2026-09-15 the owner confirmed MIT.

npm packs a license file only from the package's own folder, not from the repository root; Swift Package Manager consumers read the license at the repository root.

## Decision

1. Prism's own work — code, tokens, specs, generated outputs, documentation and research text — is licensed under the MIT License, `Copyright (c) 2026 iiiivaska`, in `LICENSE` at the repository root.
2. Each published npm package (`web/packages/tokens`, `react`, `charts`) carries an identical copy of `LICENSE`.
3. Third-party files keep their own licenses and are listed in `licenses/inventory.json` and `THIRD_PARTY_NOTICES.md` (ADR-0015 rule 2): the bundled fonts under the OFL with their `OFL.txt`, Phosphor under MIT, the DTCG schemas under their own terms. The MIT grant does not relicense them.
4. `licenses/inventory.json` lists Prism itself as `id: prism`, `permitted_use: own`.
5. The ADR-0015 legal checkpoint still gates the first package release and any announcement; this ADR settles only the license of the repository's own content.

## Alternatives considered

- **No license until the legal checkpoint**: keeps all rights reserved but leaves the public repository and the MIT package manifests contradicting each other.
- **Apache-2.0**: adds a patent grant and NOTICE handling that a design system of tokens and UI code does not need; the manifests already said MIT.

## Consequences

- Anyone may reuse Prism's code and tokens with attribution; the owner's apps need nothing extra.
- A new published package must add its `LICENSE` copy in the same change.

## Rules that follow

1. `LICENSE` and every `web/packages/*/LICENSE` are byte-identical; the P2-4 license gate checks it.
2. Every published package declares `"license": "MIT"`.
3. A file under a different license is never committed without its inventory entry and license text (ADR-0015 rule 2).
