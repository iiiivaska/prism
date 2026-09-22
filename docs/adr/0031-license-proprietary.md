# ADR-0031: Prism is proprietary, all rights reserved; the license carries the requirement, not the visibility

- Status: accepted
- Date: 2026-09-22
- Decision record entry: docs/decisions.md #31
- Supersedes: [ADR-0028](0028-license-mit.md) (Prism is MIT-licensed)
- Amends: ADR-0018 (visibility: the private experiment of 2026-09-22 and the return to public), ADR-0014 (distribution: the published packages stay public artefacts, and a download is not a license)

This ADR records what the owner decided and what was observed while carrying it out. It is documentation written by the repository's agents, not legal advice; the ADR-0015 legal checkpoint still gates the first package release and any announcement.

## Context

The owner wants to use Prism in their own products and wants nobody else to be able to use it. Until today two documents pointed the other way: ADR-0018 made the repository public, and ADR-0028 licensed it under MIT, which grants everyone the rights the owner wants withheld.

What happened on 2026-09-22, in order:

1. **The repository was made private.** GitHub Packages inherits the visibility of the repository that publishes it, so a private repository was the one move that closed both the source and the packages at once.
2. **GitHub refused to start a CI job within the hour**, with: "The job was not started because recent account payments have failed or your spending limit needs to be increased". A private repository meters Actions minutes, macOS at ten times the Linux rate (the rate ADR-0018 already recorded), and the account's billing state stopped the run outright. Private visibility therefore costs the `apple` job, and today it cost every job.
3. **The owner chose to return the repository to public**, and that is done: the repository is public again, `PACKAGE_VISIBILITY` is public, and CI runs free.

With visibility back where ADR-0018 put it, nothing about being public carries the owner's requirement. The license is the only thing left that can, and the owner chose a proprietary, source-available license: the code stays readable on GitHub, and no one acquires a right to use it.

Two facts we do not hide, because they are true:

- **The MIT window is permanent for what it covered.** The repository was public under MIT from 2026-09-14 (ADR-0018) to 2026-09-22 (ADR-0028). An MIT grant, once made for a copy, is not withdrawn by a later license: whoever took a copy in that window keeps MIT rights to that snapshot for ever. The owner understands this and accepts it. The change is prospective only.
- **Public on GitHub carries GitHub's own terms.** Hosting a public repository grants viewers the right GitHub's Terms of Service describe — to view and to fork it within GitHub. A proprietary `LICENSE` does not override the terms the owner agreed to with GitHub.

## Decision

1. Prism's own work — code, tokens, specs, generated outputs, documentation and research text — is **proprietary**: `Copyright (c) 2026 iiiivaska`, all rights reserved, under the license in `LICENSE` at the repository root. No right to use, copy, modify, merge, publish, distribute, sublicense or sell it is granted; any of those needs the copyright holder's prior written permission. Effective 2026-09-22.
2. Each published npm package (`web/packages/tokens`, `react`, `charts`) carries a byte-identical copy of `LICENSE`, and its manifest declares `"license": "SEE LICENSE IN LICENSE"` — npm's own form for a license that travels inside the package, used because no SPDX identifier exists for this one.
3. Third-party files keep their own licenses (ADR-0015 rule 2), listed in `licenses/inventory.json` and `THIRD_PARTY_NOTICES.md`: the bundled fonts under the OFL with their `OFL.txt`, Phosphor under MIT with its notice, the DTCG schemas under the W3C Software and Document License with its notice. `LICENSE` grants nothing in them and takes nothing from them; it says so in its own text, which is also what OFL condition 5 requires of anyone who redistributes an OFL font.
4. `licenses/inventory.json` lists Prism itself as `id: prism`, `permitted_use: own`, `spdx: LicenseRef-Prism-Proprietary` — a `LicenseRef-*`, the form SPDX reserves for a license that has no identifier of its own.
5. Versions published under the MIT License before 2026-09-22 stay MIT **for those versions**. `LICENSE` states this; no document of this repository claims those versions were relicensed.
6. The repository stays **public** and the GitHub Packages visibility stays **public**: ADR-0018 is unchanged in that, and the billing refusal above is why the experiment was reversed. Viewing and forking through GitHub happen under the GitHub Terms of Service.
7. The ADR-0015 legal checkpoint still gates the first package release and any announcement. This ADR settles the license of the repository's own content, nothing else.

## Alternatives considered

- **Private repository (visibility carries the requirement).** Tried today and reversed within the hour: a private repository meters Actions minutes and the account's billing state stopped CI with "recent account payments have failed or your spending limit needs to be increased". Rejected by the owner.
- **Keep MIT.** MIT grants precisely the rights the owner wants withheld, and a repository nobody has noticed yet is not a license term. It also left `LICENSE` and the owner's intention contradicting each other, which is the situation ADR-0028 was written to end.
- **A source-available license with a narrow grant (BUSL-style, PolyForm Noncommercial, "internal use only").** Each grants a stranger something. The owner's requirement is that nobody else may use Prism, so the grant would be empty and its wording would invite the reading that some use is allowed.
- **`"license": "UNLICENSED"` in the manifests, with no license file.** npm's vocabulary for proprietary, but it leaves no text a reader can hold, and a SwiftPM consumer reads the license file at the repository root, not a manifest. `SEE LICENSE IN LICENSE` says the same thing and points at the text.

## Consequences

- Nobody may use Prism without the owner's written permission; the owner's own apps need nothing extra.
- Copies taken while the repository was MIT keep their MIT rights for ever. Anyone who forked between 2026-09-14 and 2026-09-22 may keep using that snapshot, and this repository says so rather than pretending otherwise.
- CI stays free, because the repository stays public; the `apple` job keeps its unmetered macOS minutes.
- The published packages stay public artefacts on GitHub Packages: anyone who can see the repository can fetch a tarball. A download is not a license, and the `LICENSE` inside every tarball is what says so. This is the part of ADR-0014's distribution note this ADR amends.
- A contributor other than the owner would be contributing to a proprietary work. There is no CLA and there are no outside contributors today; if that changes, it needs its own decision.
- Every place that asserted MIT for Prism and that this work could reach now asserts this license instead: `LICENSE`, the three package copies and manifests, `licenses/inventory.json`, `THIRD_PARTY_NOTICES.md`, the P2-4 license gate, `release:pack` and `README.md`. The gate and the packer both fail on a manifest left on MIT. `agent/SKILL.md` never asserted MIT — it carried no license sentence at all — and gains one here. `.github/workflows/release.yml` and `docs/roadmap.md` were owned by concurrent work when this ADR was written, so they were reported in `docs/legal-checkpoint.md` §5.3 rather than edited here; the orchestrator substituted them later the same day, and neither of them enforced the license in the first place — `release:pack`, which the workflow calls, does. `docs/research/critic.md` keeps its "Resolved 2026-09-15 by ADR-0028 (MIT)" line, which is a true record of how that finding was closed at the time.
- Relicensing does not make the repository unreadable, and it is not a secrecy measure: the source stays public, and anything that must not be public was never in this tree (ADR-0015 rule 1).

## Rules that follow

1. `LICENSE` and every `web/packages/*/LICENSE` are byte-identical; the P2-4 license gate checks it.
2. Every published package declares `"license": "SEE LICENSE IN LICENSE"`; `licenses:check` and `release:pack` both fail on anything else, MIT included.
3. A file under a different license is never committed without its inventory entry and its license text (ADR-0015 rule 2), and `LICENSE` never claims to cover it.
4. Wherever the license is stated at length, the MIT window (2026-09-14 to 2026-09-22) is stated with it; no document claims those versions were relicensed.
5. The ADR-0015 legal checkpoint gates the first package release and any announcement. This ADR is a record of decisions and observed facts, not legal advice.

## Revision, same day

The `LICENSE` text this ADR decided on was amended once on 2026-09-22, after `docs/legal-checkpoint.md` reviewed it. The decision above did not change; the instrument was made to carry it. Three edits, from findings F-1, F-4 and F-8 of that document:

1. **The Software now reaches build outputs.** It was *"Prism's own files in this repository"*, which did not plainly cover the `dist/` a published tarball is made of, because `dist/` is gitignored and was never a file in the repository. It now reads *"the code, tokens, specs, documentation and research text in this repository, and the build outputs generated from them wherever those are distributed"* (F-8).
2. **The third-party carve-out now reaches derivatives.** It excluded *"files that come from someone else"*; it now also excludes *"files generated from them"*, because the shipped `.woff2` faces are Modified Versions that Prism's own build produced from OFL fonts, and OFL condition 5 forbids distributing them under any other license (F-1).
3. **Clause 2 now describes the real exposure.** It spoke of *"versions published under the MIT License"*, of which there are none — no tag has ever been cut. It now names the window and what was taken in it: a clone, a fork, or any version published under it (F-4).

The amended text is 34 lines, sha256 `ff07022f611986356d16843201e2c867633e0b652b183646a4b32efad18a0237`, byte-identical in the root and all three published packages. Findings F-4 and F-8 had been left to the owner as wording calls; they were applied by the agent under the owner's standing delegation of this checkpoint, both narrow what a stranger may do, neither grants anything new, and `docs/legal-checkpoint.md` §5.2 records them so the owner can reverse either in one edit.
