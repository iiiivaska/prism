# Prism — legal checkpoint

- Date: 2026-09-22
- Asked for by: [ADR-0015](adr/0015-references-inspiration-only.md) Consequences ("A legal review checkpoint is scheduled before any public release") and decision record [#15](decisions.md)
- Gates: the first package release and any announcement ([ADR-0018](adr/0018-repository-name-and-visibility.md), [ADR-0031](adr/0031-license-proprietary.md) rule 5)
- Enforced by: the repository variable `LEGAL_CHECKPOINT` in the release workflow (§5)

## 0. What this document is, and what it is not

This is a factual diligence record. Prism's agents read the repository, ran its own gates, opened the license texts that actually travel with the files, and wrote down what they found, with the clause and the source for each. Every claim below is something that was checked against a file or a command's output on 2026-09-22, not recalled.

**It is not legal advice, and it is not a legal opinion.** Nobody who wrote it is a lawyer, and it has not been reviewed by one. Where a question needs a lawyer's answer, this document says so and stops, rather than guessing — §4 is the list of questions it deliberately does not answer. Nothing here tells the owner what they are permitted to do; it tells them what the repository contains, what obligations the files carry on their face, and which of those obligations the repository currently satisfies. The decision to release, and the risk in releasing, stay with the owner.

Two more limits worth stating plainly:

- **Diligence checks the repository, not the world.** It cannot know who cloned the repository while it was MIT, whether anyone has done so, or what they did with it.
- **A clause quoted here is a clause as written.** How a court would read it — especially the Apple and Untitled UI terms in §4 — is exactly the part this document leaves alone.

## 1. How this was checked

| What | How |
|---|---|
| What ships | `pnpm release:pack --list` — the packer packs each tarball with pnpm, reads it back and lists every file inside it. The file lists in §2.1 are that output, not a manifest's `files` field and not a summary. |
| The ledger | `licenses/inventory.json` read whole; `pnpm licenses:check` → **exit 0, 85 checks pass**; `pnpm licenses:notices --check` → **exit 0, 30 items, updated 2026-09-22**. |
| License texts | Every `OFL.txt`, `Phosphor-LICENSE.txt`, `LICENSE.md` and `LICENSE` in the tree opened and read, and hashed with `shasum -a 256`. Clauses below are quoted from those files, not from memory of the licenses. The single exception is the GitHub Terms of Service, which lives outside the repository and is quoted from GitHub's own site with the date it was read (§3.5). |
| The firewall | `pnpm lint:reference-copy` → **exit 0, no reference UI copy**, against 143 denylist entries. The guard also prints how many files it read; that number moves whenever the tree grows, so the command and its exit status are what is recorded here, not the count. `pnpm icons:validate` → **exit 0, registry valid, 30 generated files current**; every tracked image and font file enumerated with `git ls-files`. |
| The window | `git log` on the repository and on `LICENSE`; `git tag`. |

## 2. What Prism ships

### 2.1 The three npm packages, exactly

From the `release:pack --list` dry run of 2026-09-22, which exits 0 with every rule passing:

| Package | Files | Packed | Third-party bytes inside |
|---|---|---|---|
| `@iiiivaska/prism-charts` 0.1.0 | 4 | 2 kB | **none** — `dist/index.d.ts`, `dist/index.js`, `LICENSE`, `package.json` |
| `@iiiivaska/prism-react` 0.1.0 | 70 | 303 kB | **none** — `dist/` (3 files), `LICENSE`, `package.json`, and `spec/` (57 component contracts, 3 pattern contracts, 2 JSON schemas, `SCHEMA.md`, `haptics.yaml`, `patterns/README.md`) |
| `@iiiivaska/prism-tokens` 0.1.0 | 31 | 671 kB | **three font faces and three OFL texts** (below); everything else is generated Prism output |

The only third-party bytes in any published npm package are in `prism-tokens`:

```
src/generated/prism/fonts/onest/onest-wght.woff2            + onest/OFL.txt
src/generated/prism/fonts/jetbrains-mono/jetbrains-mono-wght.woff2 + jetbrains-mono/OFL.txt
src/generated/prism-native/fonts/inter/inter-wght.woff2     + inter/OFL.txt
```

`prism-react` ships **no icon bytes at all**: `src/generated/icons.ts` carries Phosphor *names*, and `@phosphor-icons/react` is a runtime dependency the consuming app installs.

### 2.2 The SwiftPM channel

SwiftPM distributes by git tag, so what the Swift side "ships" is the repository tree at that tag. Two third-party sets sit in it:

- `swift/Sources/DSTokens/Resources/Fonts/` — `Onest[wght].ttf` and `JetBrainsMono[wght].ttf`, each with its `OFL.txt`. (Inter is not here: the native preset uses the system fonts on Apple, so Inter is web-only.)
- `swift/Sources/DSIcons/Resources/Icons.xcassets/` — **12 SVGs** in 12 image sets (2 registry icons × 6 weights), with `Phosphor-LICENSE.txt` beside them.

### 2.3 Item by item

#### Onest 2.001 — OFL-1.1

- **Ledger**: `id: onest`, `spdx: OFL-1.1`, `permitted_use: adapt-with-attribution`, `packaged: true`, `reserved_font_name: false`.
- **Clause relied on**, from `OFL.txt` shipped beside the face (sha256 `071195d8806e…`), PERMISSION & CONDITIONS §2: *"Original or Modified Versions of the Font Software may be bundled, redistributed and/or sold with any software, provided that each copy contains the above copyright notice and this license."* "Any software" is unqualified; it does not exclude proprietary software.
- **Notice**: the required copyright line is the first line of that same file — "Copyright 2021 The Onest Project Authors (https://github.com/googlefonts/onest)". The file travels in the same folder as the face, in all four places the face exists: `brands/prism/fonts/onest/`, `swift/Sources/DSTokens/Resources/Fonts/onest/`, `web/packages/tokens/src/generated/prism/fonts/onest/` and `docs/direction-board/assets/fonts/onest/`. All four are byte-identical (`071195d8806e…`). **Satisfied.**
- **Reserved Font Name**: **none declared.** The header reads "Copyright 2021 The Onest Project Authors (…)" with no "with Reserved Font Name" clause. The only occurrence of the phrase in the file is the definition in the DEFINITIONS section (line 33). Condition 3 — *"No Modified Version of the Font Software may use the Reserved Font Name(s)"* — therefore imposes nothing here.
- **Finding (F-1), recorded because the ledger does not say it.** The web face `onest-wght.woff2` is **not** the upstream file. `tools/tokens/formats/fonts.ts` re-encodes `brands/prism/fonts/onest/Onest[wght].ttf` to woff2 with `woff2-encoder` (*"receives `<family-dir>/<family-kebab>-wght.woff2` (the same TTF, not subset)"*). A format conversion makes it a **Modified Version** under the OFL's own definition, and `fonts.css` presents it to users under the original family name `"Onest"`. That is permitted **only because no Reserved Font Name is declared** — if Onest ever declares one upstream, this build breaks condition 3 and, by TERMINATION (*"This license becomes null and void if any of the above conditions are not met"*), the grant with it. The ledger notes this for Inter but not for Onest or JetBrains Mono. Nothing is breached today; the note is incomplete. See §2.5.
- **Obligation that sharpens under a proprietary license**: condition 1, *"Neither the Font Software nor any of its individual components, in Original or Modified Versions, may be sold by itself."* Prism may now be sold. The fonts must never be the product, or part of what is priced as the product on its own. Selling Prism *with* the fonts inside it is condition 2's express case; selling the fonts is not.
- **The clause that makes `LICENSE` clause 1 necessary**: condition 5, *"The Font Software, modified or unmodified, in part or in whole, must be distributed entirely under this license, and must not be distributed under any other license."* A proprietary `LICENSE` that swept the fonts in would put them under a second license and void the grant. `LICENSE` does not sweep them in, and says so twice: the Software it defines is *"Prism's own work — the code, tokens, specs, documentation and research text in this repository, and the build outputs generated from them"*, and clause 1 adds that files that come from someone else, **and files generated from them**, *"are not part of the Software: they stay under their own licenses, and the copyright notice above does not claim them… Nothing here narrows those licenses."* The second limb was added on 2026-09-22 in response to finding **F-1**: the shipped `.woff2` faces are Modified Versions that Prism's own build produced, so a carve-out phrased only as "files that come from someone else" would have left an unfriendly reader room to argue that `LICENSE` reached them — exactly what condition 5 forbids. **Satisfied.**

#### JetBrains Mono 2.211 — OFL-1.1

Identical analysis, on its own `OFL.txt` (sha256 `b2fe5e898759…`, byte-identical across its four locations). Header: "Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)". **No Reserved Font Name declared.** The web face `jetbrains-mono-wght.woff2` is likewise a re-encoding of `JetBrainsMono[wght].ttf` presented as `"JetBrains Mono"` — finding F-1 applies to it too. **Satisfied.**

#### Inter 4.1 — OFL-1.1

Same clauses, on `OFL.txt` (sha256 `262481e84452…`, identical in its two locations — Inter is web-only). Header: "Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)". **No Reserved Font Name declared**, which is what legitimises `inter-wght.woff2` as a Modified Version presented under the family name `"Inter"`. The ledger already records this one correctly. **Satisfied.**

#### Phosphor Icons core 2.1.1 — MIT

- **What ships**: 12 SVG files, copied byte for byte by `pnpm icons:build`, in the SwiftPM channel only.
- **Clause relied on**, from `swift/Sources/DSIcons/Resources/Phosphor-LICENSE.txt`: *"Permission is hereby granted, free of charge, to any person obtaining a copy of this software… to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies."* MIT has no copyleft limb and no source-availability condition, so redistribution inside a proprietary work is squarely within it.
- **The one obligation**: *"The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software."* `Phosphor-LICENSE.txt` carries both — "Copyright (c) 2023 Phosphor Icons" and the permission notice — in the same resource folder as the SVGs, and `licenses:check`'s `license-text` check holds it there. **Satisfied. No change from the relicensing.**

#### DTCG Format and Resolver JSON Schemas 2025.10 — W3C Software and Document License

- **What ships**: nothing. `packaged: false`. The schemas are vendored at `tools/tokens/schema/dtcg-2025.10/` for offline validation and are in no Prism package — confirmed against the three file lists in §2.1.
- **Clause relied on**, from the vendored `LICENSE.md`: *"Permission to copy, modify, and distribute this work, with or without modification, for any purpose and without fee or royalty is hereby granted"*, provided every copy carries the full NOTICE, any pre-existing disclaimers, and notice of any changes. "For any purpose" is unqualified.
- **Obligations**: `LICENSE.md` reproduces the full W3C notice; `SHA256SUMS` pins `format.json` (`32e93b78…`) and `resolver.json` (`a5acd143…`), and `tools/tokens/validate.ts` refuses to run when a byte differs. Prism made no modifications, so the change-notice limb is moot. **Satisfied.**

#### Prism's own work — proprietary

- `LICENSE`, 34 lines, sha256 `ff07022f611986356d16843201e2c867633e0b652b183646a4b32efad18a0237`. Verified byte-identical at the repository root and in all three of `web/packages/{charts,react,tokens}/LICENSE`. (This is the text as amended on 2026-09-22 for findings **F-1**, **F-4** and **F-8**; the first draft of the same day hashed `832ab99f…` and is superseded.)
- Each manifest declares `"license": "SEE LICENSE IN LICENSE"` — verified inside each packed tarball by the packer's own `license` rule, which passed for all three.
- `licenses/inventory.json` lists Prism as `id: prism`, `permitted_use: own`, `spdx: LicenseRef-Prism-Proprietary`.

#### The grain tile — Prism's own, and it looks like it might not be

`web/packages/react/dist/styles.css` contains one `data:image/png;base64` URI, 22 138 characters, bound to `--ds--surface-grain-tile`. An embedded raster image in a shipped artefact is the kind of thing that should have a provenance entry, so it was traced.

It has none because it needs none: it is generated by `tools/grain/tile.ts`, a 128 × 128 tile of monochrome value noise produced by *"one 32-bit integer hash of the cell coordinates, so nothing about it depends on a random seed, a platform PRNG or a float"*, checksum `3aea6890`, with the identical algorithm in `swift/Sources/DSCore/DSGrain.swift`. It is Prism's own output, covered by `LICENSE`, and carries no third-party rights. **Recorded here so the next reader does not have to trace it again.**

#### woff2-encoder 2.0.0 — MIT, build-time, and missing from the ledger

The encoder that produces all three shipped woff2 faces. It is a devDependency of the private `@iiiivaska/prism-tools` workspace, so the gate's `dependencies` check — scoped to *published* packages — correctly never looks at it, and it puts none of its own bytes in any package (its output is a transformation of the OFL font, which carries the font's rights, not the encoder's). Its own license is MIT, "Copyright (c) 2023-PRESENT Kyedo".

It is nonetheless **absent from `licenses/inventory.json`**, while Style Dictionary and Motion — build-time tools in the same position, both `packaged: false` — are listed. See finding F-2.

### 2.4 What the packages deliberately do not ship

Each of these is an exclusion the repository enforces, not an accident:

| Not shipped | Where enforced | Why |
|---|---|---|
| **SF Symbol names in web output** | `tools/icons/checks.ts` raises `sf/name-in-web`: *"contains the SF Symbol name …; SF Symbols are licensed for Apple user interfaces only (ADR-0013 rule 5)"*. `web/packages/react/src/generated/icons.ts` states it holds none "by construction". `icons:validate` passes. | SF Symbols are system-provided images under the Xcode/SDK agreement; the `apple` field of the registry is never emitted to web, the gallery or the design-tool export. |
| **`spec/icons/`** | The packer's own `spec` rule: `prism-react` ships "57 component + 3 pattern spec(s), **no `spec/icons/`**". | `spec/icons/registry.json` pairs registry ids with SF Symbol names. Shipping it on npm would put those names in a web artefact. |
| **Phosphor SVG sources on the web** | The web half ships names only; `@phosphor-icons/react` is the consumer's dependency. | Keeps the web package free of icon bytes entirely. |
| **SF Pro / SF Compact / SF Mono** | `permitted_use: sdk-runtime`, `packaged: false`. Reached through `Font.system` on Apple; never served on the web. | The Apple font license permits Apple-platform mock-ups only and forbids embedding. |
| **The vendored DTCG schemas** | `packaged: false`, confirmed against all three file lists. | Build-time validation only. |
| **Reference imagery of any kind** | ADR-0015 rule 1, plus `lint:reference-copy` for text. | See §3.3. |

### 2.5 Findings from the shipping half

| # | Finding | Severity | Blocks shipping a file? |
|---|---|---|---|
| **F-1** | The Onest and JetBrains Mono ledger notes do not record that the **web faces are Modified Versions** (TTF → woff2) presented under the original family names, and that this is lawful only because neither family declares a Reserved Font Name. Inter's note records exactly this; the other two do not. | Low — documentation, not compliance | **Resolved 2026-09-22.** Both notes now carry the Inter limb: the web face is a Modified Version by format change, presented under the original family name, lawful only while no Reserved Font Name is declared. |
| **F-2** | `woff2-encoder` 2.0.0 (MIT) is **not in `licenses/inventory.json`**, though it is the build-time tool that produces every shipped woff2 byte, and comparable tools (Style Dictionary, Motion) are listed. ADR-0015 rule 5 asks the ledger to list "every external asset, kit or library". | Low — ledger completeness | **Resolved 2026-09-22.** Added to the ledger as `woff2-encoder` (MIT, *"Copyright (c) 2023-PRESENT Kyedo"*, read from `node_modules/.pnpm/woff2-encoder@2.0.0/.../LICENSE`, not from memory), `permitted_use: dependency`, `packaged: false`, with a note that its MIT terms attach to the encoder and not to its output, which stays under the font's own OFL. `THIRD_PARTY_NOTICES.md` regenerated: 31 items. |
| **F-3** | A **fourth pair of OFL font copies** lives at `docs/direction-board/assets/fonts/{onest,jetbrains-mono}/`. Both carry a byte-identical `OFL.txt`, so the OFL is satisfied — but this path is **outside `PACKAGED_ROOTS`** in `tools/licenses/check.ts`, so no gate checks it. The six OFL rows `licenses:check` prints cover the other three roots only. A future edit could drop that notice and CI would stay green. | Medium — unguarded compliance | **Resolved 2026-09-22 by closing the hole, not by noting it.** `licenseTextRows` in `tools/licenses/check.ts` now sweeps the **whole tree** for font files and requires a license text beside every copy that is not already covered by the packaged roots, so a font added under `docs/` or anywhere else cannot lose its notice and keep CI green. Two tests state the rule (one fails without the notice, one passes with it); the gate went from 85 to 88 checks, the three new rows being the two board faces and the fixture font. |

**No file is blocked from shipping by the third-party terms.** All three bundled fonts, the Phosphor assets and the vendored schemas permit what Prism does with them under the new license, and nothing in the ledger had to be loosened to make that true.

## 3. What the public window exposed

### 3.1 The window, exactly

From `git log`:

| Moment | Fact |
|---|---|
| **2026-09-14 23:11:24 +0300** | First commit, `2da5712` — "Blueprint: decisions, ADRs, research, DTCG tokens, specs, registries, skeleton". The repository is public from this point (ADR-0018, decision #18). |
| 2026-09-14 → 2026-09-15 | **No `LICENSE` file existed**, while all three package manifests already declared `"license": "MIT"` (confirmed with `git show 2da5712:web/packages/tokens/package.json`). This is exactly what critic finding **G-11** recorded: "The public repository has no licence, yet the packages declare MIT." |
| **2026-09-15 21:31:30 +0300** | Commit `5e206aa` — "License Prism under MIT (ADR-0028)". The MIT text is at the root from here. |
| 2026-09-22 | ADR-0031. `LICENSE` becomes proprietary. The repository was made private and returned to public the same day; it is public now. |

So the public window is continuous from 2026-09-14, and the window with an actual MIT **license file** at the root runs **2026-09-15 to 2026-09-22** — about seven days.

### 3.2 Nothing has ever been published

This matters more than anything else in this section, and it was checked rather than assumed:

- **`git tag` returns zero tags.** There has never been an SPM release, because the SPM release *is* a tag. Corroborated against GitHub itself on 2026-09-22: `gh api repos/iiiivaska/prism/tags --jq length` → `0` and `gh api repos/iiiivaska/prism/releases --jq length` → `0`.
- **No npm package has been published.** The release workflow's first step fails unless the repository variable `LEGAL_CHECKPOINT` equals `cleared`, and this document is the thing that would let it be set. `gh variable list --repo iiiivaska/prism` shows no `LEGAL_CHECKPOINT` row at all on 2026-09-22, so it has never been set (§5.2). P3-6 was a rehearsal that stopped short of publishing.
- `VERSION` is `0.1.0` with four changesets still pending.

**Consequence, and it is a finding.** `LICENSE` clause 2 reads: *"Versions published under the MIT License before 2026-09-22 remain MIT for those versions."* On the facts, **that set is empty** — no version was ever published. The clause is true, and harmlessly so, but it describes the wrong exposure. The real MIT exposure is not a published version; it is **the public repository tree itself**, which anyone could clone or fork between 2026-09-15 and 2026-09-22 with an MIT `LICENSE` at its root. ADR-0031's Context states this correctly and broadly — *"whoever took a copy in that window keeps MIT rights to that snapshot for ever"* — while the `LICENSE` text states it narrowly. See finding F-4.

### 3.3 What is in the public tree

Checked by enumerating every tracked image with `git ls-files` and by running the firewall guard.

**What is there:**

- **The research, in Prism's own words** — 36 tracked files in `docs/research/`: the architecture notes, `visual-dna.md`, `licensing-kits.md`, `critic.md`, and the eleven reference analyses `refs-*.md`.
- **The direction board** — `docs/direction-board/index.html`, its assets, and **7 tracked PNG renders** (`screen-glance-*`, `screen-live-ride-*`, `screen-ride-report-*`). The two large full-board PNGs are **not** tracked; a `.gitignore` in that folder keeps them out.
- **Prism's own renders only** — the remaining tracked images are SwiftUI snapshot baselines, web VRT baselines, the 12 Phosphor SVGs, and 6 font specimen PNGs in `docs/research/fonts/`.
- **The denylist** — `tools/lint/reference-copy.denylist.txt`, 143 entries: a compiled list of reference UI strings and client brand names, public by necessity because the guard reads it.

**What is not there: any reference imagery.** ADR-0015 rule 1 forbids it, and the enumeration finds none — no screenshot, no traced layout, no shot from Dribbble, in the repository, the gallery, the docs or the snapshots. `pnpm lint:reference-copy` exits **0** over the whole tree against its **143 denylist entries**. (The file count it prints rises as the tree grows — it read 561 files when this line was last re-run on 2026-09-22 — so the exit status is what is recorded, not the count.)

**One thing the guard is designed to let through, and the public should be understood to have seen.** The guard exempts `refs-*.md`, `visual-dna.md` and `critic.md` (`tools/lint/reference-copy.ts` line 77), because those are the analyses that quote the copy on purpose. So the public tree does contain short verbatim UI strings from the reference shots — titles, labels, metric names, place names — inside the written analyses, along with the client brand names ADR-0015 rule 2 keeps out of samples. This is quotation for analysis, not reproduction of a composition, and it is the deliberate design of the firewall rather than a leak. It is recorded here because a diligence document that said "no reference material is public" would be wrong.

The **font specimen PNGs** in `docs/research/fonts/` render candidate families — Geologica, Golos Text, Inter, Manrope, Onest, all OFL families — as type samples. The OFL addresses this directly in condition 5: *"The requirement for fonts to remain under this license does not apply to any document created using the Font Software."* A rendered specimen is such a document. No obligation attaches.

### 3.4 What MIT did, and what it cannot be made to undo

The MIT permission granted to every recipient of a copy in that window is, in the license's own words, permission *"to deal in the Software without restriction"*, subject only to the notice condition. Two consequences, and Prism's own documents already state both:

1. **The grant cannot be retracted.** A license given for a copy is not withdrawn by the copyright holder later adopting a different license for future copies. Whoever cloned or forked the repository between 2026-09-15 and 2026-09-22 keeps MIT rights **to that snapshot**, permanently. ADR-0031 records this and the owner accepts it.
2. **It reaches only that snapshot.** It confers no right in anything committed after 2026-09-22, and it never reached the third-party files, which were never Prism's to license in the first place.

Whether anyone actually took such a copy is not knowable from inside the repository, but GitHub keeps two numbers about it and both were retrieved on 2026-09-22 with the authenticated `gh` CLI rather than left to the owner's dashboard:

- **Forks: 0.** `gh api repos/iiiivaska/prism/forks --jq length` → `0`, and `gh repo view … --json forkCount` → `0`. Nobody has forked the repository inside GitHub.
- **Clones: 273, from 76 unique cloners**, over the rolling 14-day window (`gh api repos/iiiivaska/prism/traffic/clones --jq '{count, uniques}'` → `{"count":273,"uniques":76}`). GitHub keeps only 14 days, and that window still covers the whole 2026-09-14 → 2026-09-22 MIT period today; it will not cover it for much longer.

**What that number is not.** GitHub counts every `git clone` against the repository, including the checkout each GitHub Actions job performs, and this repository's CI runs on GitHub Actions. So 76 uniques is an **upper bound dominated by GitHub's own runners**, not a count of third parties, and it is not evidence that anyone outside took a copy. It is also not evidence that nobody did: an anonymous clone is indistinguishable from a runner in this data. What the window does settle is coverage — 14 days back from 2026-09-22 reaches past the first commit of 2026-09-14, so it spans the repository's whole life so far; from 2026-09-28 it starts dropping days of the MIT window, and after that the question is no longer answerable from GitHub at all. The figures are recorded because a diligence record that raises the question should carry the number and its caveat; they are facts about GitHub's counters, not a recommendation about what to do with them.

### 3.5 What the new license changes, and what it does not

**Changes:** no one acquires a right to use, copy, modify, merge, publish, distribute, sublicense or sell Prism's own work, as distributed from 2026-09-22 onward, without the owner's prior written permission. The date attaches to distribution, not to authorship: a copyright holder relicenses prospectively, so it governs which license a new recipient gets, not which files are covered — every file of Prism's own work is, whenever it was written. `licenses:check` and `release:pack` both fail on a manifest that says anything but `SEE LICENSE IN LICENSE`, MIT included, so the relicensing cannot be half-applied without CI noticing.

**Does not change:**

- **The third-party files.** They were never under MIT-by-Prism and are not under the proprietary license now. `LICENSE` clause 1 says so, which is also what OFL condition 5 requires of anyone redistributing an OFL font.
- **The MIT snapshots.** §3.4.
- **Readability.** The source stays public. Relicensing is not a secrecy measure, and nothing that must not be public was ever in this tree (ADR-0015 rule 1).
- **GitHub's terms.** While the repository is public, viewing and forking it on github.com happen under the GitHub Terms of Service, which a repository's own `LICENSE` does not override. Section D.5, *License Grant to Other Users*: *"By setting your repositories to be viewed publicly, you agree to allow others to view and “fork” your repositories (this means that others may make their own copies within the Service in repositories they control)."* The same section is what leaves room for `LICENSE` to say the rest: it notes that a user may grant rights beyond that baseline by adopting a license, so the proprietary license governs use **off** GitHub while the fork button keeps working **on** it. `LICENSE` clause 3 says this rather than pretending otherwise. This is the one instrument relied on here that cannot be read from a file in this repository: it was read on 2026-09-22 at <https://docs.github.com/en/site-policy/github-terms/github-terms-of-service>, it is GitHub's to change without notice, and unlike every other clause in this document its wording is not pinned by anything under our control.
- **Fetchability of the packages.** GitHub Packages inherits repository visibility, and `PACKAGE_VISIBILITY` is public, so once published, anyone who can see the repository can fetch a tarball. A download is not a license; the `LICENSE` inside every tarball is what says so — on how widely its defined term reaches over a tarball whose files are all build outputs, see finding **F-8**.

### 3.6 Findings from the exposure half

| # | Finding | Severity | Blocks shipping a file? |
|---|---|---|---|
| **F-4** | `LICENSE` clause 2 says *"Versions published under the MIT License before 2026-09-22 remain MIT for those versions."* **No version was ever published** (zero tags, `LEGAL_CHECKPOINT` never set), so the clause as written addresses an empty set, while the real exposure — clones and forks of the public MIT tree — is described accurately only in ADR-0031's Context and not in `LICENSE` itself. A reader relying on `LICENSE` alone would understand the MIT window more narrowly than the facts warrant. | Medium — the license understates an exposure the owner has already accepted | **Resolved 2026-09-22.** Clause 2 was rewritten to describe the exposure itself: *"This repository was public under the MIT License from 2026-09-14 to 2026-09-22. Whatever was taken in that window — a clone, a fork, or any version published under it — stays under the MIT License for what that copy contains."* The owner had delegated this checkpoint to the agent; the change only makes `LICENSE` say what ADR-0031's Context already said, and takes nothing from anyone. |
| **F-5** | The window has a **sub-window nobody has described**: from 2026-09-14 23:11 to 2026-09-15 21:31 the repository was public with **no `LICENSE` file** but with three manifests declaring `"license": "MIT"` (critic G-11). Every Prism document dates the MIT window from 2026-09-14, which is the safer reading and the one to keep; the point is only that what a copier in that first day actually received is a manifest assertion, not a license text. | Low — historical precision | **No.** |
| **F-6** | `web/packages/*/package.json` carries `"publishConfig": { "access": "restricted" }` while `PACKAGE_VISIBILITY` is `public` and ADR-0031's Consequences say the published packages are public artefacts. `access` is an npmjs-registry concept; on GitHub Packages visibility follows the repository. A reader of the manifest could conclude the packages will not be publicly fetchable. The two statements are not in conflict as mechanisms, but they read as if they were. | Low — clarity | **Decided 2026-09-22, kept as it is.** `access: "restricted"` predates today (it is in `HEAD` from the first commit of these manifests) and is inert on GitHub Packages, where visibility follows the repository. It is kept because it is the correct value the day Prism is ever published to npmjs instead, where `access` is not inert and a proprietary package should not be world-readable by default. The apparent conflict is between two registries' vocabularies, not between two intentions. |
| **F-7** | The **reference-distance review that ADR-0015 rule 3 requires before every release exists only for the three direction-board screens** (`docs/direction-board/README.md`, reviewed 2026-09-16, with a named nearest reference, the families mixed, and what differs, for each screen). The gallery screens' review is ticket **P5-2**, which is unstarted, and the showcase apps under construction today have never been reviewed at all — so rule 3 is **not satisfied for every screen that would be public at the release**. Critic **C-16** flagged this ordering already. What this finding is *not* is an open P3-0 gate: the gate is recorded as **signed off on 2026-09-16** in two places — `docs/direction-board/README.md`, the first line under the same "## Sign-off checklist" heading (*"**Signed off 2026-09-16.** The owner approved the re-rendered board as published … Gate P3-0 is closed"*), and `docs/roadmap.md` line 45 (ticket P3-0, *"Signed off 2026-09-16: the owner approved the re-rendered board …; P3-3 and P3-4 are unblocked"*) — and P3-3 through P3-6 were all built on it. The individual boxes under "### Sign now (gate P3-0)" — fourteen of them, the reference-distance review at item 4.2 — were nonetheless left **unticked**, 39–58 lines below that declaration. **An unticked box in that file is therefore not evidence of an open gate**; it is an internal inconsistency in that file, reported to its owner rather than edited here. | **High — for the gate, not for a file** | **No file. It blocked the gate. Closed 2026-09-22**, by the two reviews this row asked for, both written the same day and both finding **no screen that a reasonable person would call a copy**: `docs/direction-board/reference-distance-gallery.md` (roadmap P5-2 — 488 committed PNGs, 28 spec examples, 4 components, grouped into the 10 screens a reader sees) and `docs/direction-board/reference-distance-showcase.md` (roadmap P5-3 — both apps built and every screen opened: web at 1440/1280/375 px in light and dark, Apple on the iPhone 17 simulator and on the Mac). With the board's own review of 2026-09-16 they cover every screen that would be public at a release from this branch, so rule 3 is satisfied and §5.2's outstanding item 1 is closed. Two qualifications, both stated rather than buried: **the clearances are dated and expire** on the events each document lists (§5.2 item 1 reproduces them), and neither is a legal opinion — §4.2's question is untouched. The file inconsistency this row also reported is unchanged and stays reported: the boxes under "Sign now" are the owner's to tick, so they were not ticked here. |
| **F-8** | `LICENSE` defines the Software as *"Prism's own files in this repository"*, but the substantive payload of every published tarball is `dist/`, which is **gitignored and never in the repository**: `git check-ignore -v web/packages/react/dist/index.js` → `.gitignore:10:dist/`, and `git ls-files web/packages/react/dist` is empty. The packed `@iiiivaska/prism-charts` is four files — `dist/index.d.ts`, `dist/index.js`, `LICENSE`, `package.json` — so **every deliverable file in it is a build output** that the defined term reaches only by inference from the words "generated outputs". **No right leaks**: absent a grant the default is all rights reserved, and each tarball carries `LICENSE` and `"license": "SEE LICENSE IN LICENSE"`. But ADR-0031's Consequences (*"the `LICENSE` inside every tarball is what says so"*), §3.5 here and §5.4's release sentence all make an affirmative claim about what that `LICENSE` covers which the instrument supports more weakly than they read. A definition that does not depend on a file being committed — e.g. *"Prism's own files in this repository and the build outputs generated from them, wherever distributed (code, tokens, specs, generated outputs, documentation and research text)"* — would carry the claim on its face. | Medium — the instrument is weaker than the documents claim | **Resolved 2026-09-22.** The definition was widened exactly as this row proposed: the Software is now *"Prism's own work — the code, tokens, specs, documentation and research text in this repository, and the build outputs generated from them wherever those are distributed"*, so the term no longer depends on a file being committed and now carries on its face the claim ADR-0031, §3.5 and §5.4 make for it. Clause 1 was widened in the same edit to keep third-party derivatives outside it (F-1). |

## 4. What stays in the owner's judgement

These are the three questions `docs/research/licensing-kits.md` §6.8 raised for counsel, restated with what the repository now knows, and deliberately left unanswered. A fourth is added because the same reasoning covers it.

### 4.1 The Apple Design Resources reading for a cross-platform system

**The clause**, from the license PDF the research read in full (`Apple-Design-Resources-License-20230621-English.pdf`, "LYL142 06/21/2023"), recorded verbatim in `licensing-kits.md` §4.3:

> "THE APPLE DESIGN RESOURCES LICENSED HEREUNDER ARE TO BE USED SOLELY FOR CREATING MOCK-UPS OF USER INTERFACES DESIGNED FOR USE IN SOFTWARE PRODUCTS THAT RUN ONLY ON APPLE'S macOS, iOS, watchOS, tvOS, AND/OR visionOS OPERATING SYSTEM SOFTWARE."

With §2B — no use "for the purpose of creating mock-ups of user interfaces to be used in software products running on any non-Apple operating system software", and "You may not embed the Apple Design Resources in any software programs or other products" — and §2D, no derivative works.

**What the repository does**: the kits are `permitted_use: apple-mockups-only`, `packaged: false`, described as the "canonical control and state inventory for Apple platforms; never derive web assets from it". No Apple bytes are in the tree; the enumeration in §2 found none.

**The question that stays open**: Prism is **one system that targets both Apple and the web**. The Apple kits informed the Apple half. Whether reading an Apple kit to build the Apple half of a system whose web half exists — and which is now also a commercial product — stays inside "solely for creating mock-ups … that run only on Apple's" operating systems, or whether the word "solely" reaches further, is a lawyer's reading of "solely" and "embed". The repository's position is that inventories and control *names* are facts rather than Template Content, and that nothing was extracted. That is a position, not an answer.

### 4.2 The EU unregistered-design exposure of the reference-distance review

**The facts**, from `licensing-kits.md` and ADR-0015's Context: under EU Regulation 2024/2822, in force from 1 May 2025, design protection explicitly covers graphical user interfaces and animations, with an **automatic three-year unregistered right against copying**. **RonDesignLab is EU-based** (Kraków, Poland). Copyright separately protects specific expression and not ideas (17 U.S.C. §102(b), Copyright Office Circular 33, *Apple v. Microsoft*; in the EU, *BSA* C-393/09 and *Cofemel* C-683/17), so layout ideas, colour logic and "glass over a map" are unprotectable, while an exact composition is not.

**What the repository does**: ADR-0015 rule 3 requires, before every release, that no Prism screen be recognizably the same composition as a reference shot. That review was performed for the three direction-board screens on 2026-09-16 and is written out in the board README, screen by screen, naming the nearest references, the families mixed and what differs — and it was strong enough to force one screen to be **recomposed**: decision #29 records "the ride report is recomposed away from shot 27220417". **Since 2026-09-22 it also covers the gallery** (`docs/direction-board/reference-distance-gallery.md`) **and the two showcase apps** (`docs/direction-board/reference-distance-showcase.md`), in the same format and with the same standard; §5.2's outstanding item 1 records what they found and where each clearance expires. Both went further than a yes: the gallery review calls the metric cards borderline on *anatomy* and says what would increase the distance, and the showcase review calls the Icons screen the closest call in either app and names the changes that would turn it into an icon site.

**The question that stays open**: the unregistered design right protects against **copying**, and "recognizably the same composition" is the agents' own standard, not a legal one. Whether the distance achieved is the distance the right requires is a judgement about a specific EU right applied to specific screens, and it needs a lawyer looking at the renders. The three-year term runs from first disclosure of each shot, so it is live.

### 4.3 The Untitled UI dual licence

**The conflict**, recorded in `licensing-kits.md` §4.2: the Figma Community page shows "Licensed under CC BY 4.0", while the creator's own license at untitledui.com/license (last updated 14 June 2026) prohibits using the products "in any form of UI kit, design system, code library, template … for resale" or free distribution, and describes the free kit as a "Single user license".

**What the repository does**: it takes the stricter reading, unprompted. `permitted_use: inventory-only`, `packaged: false`, "read for inventory breadth only", and §5 of the research lists "Copy Untitled UI components/assets into Prism" among the things Prism must not do. No Untitled UI bytes are in the tree.

**The question that stays open**: which license actually governs when a Figma Community page and the creator's site disagree. Prism does not need the answer as long as it stays at inventory-only, which it is — so this is the least pressing of the three, and it stays open only because nothing has resolved it.

### 4.4 Atlassian, for completeness

`atlassian.design/license` grants use "in connection with creating, testing, otherwise using, and distributing plugins, extensions, add-ons or other software products or services that interoperate or are integrated with Atlassian's software and cloud products". Prism is not an Atlassian add-on. The ledger holds it at `read-only`, "token naming ideas only", `packaged: false`. Same shape as §4.3 and same conclusion: the narrowest reading was already taken.

### 4.5 Does going proprietary sharpen any of them?

This is the question the relicensing actually raises, and the answer differs per item:

| | Sharper now? |
|---|---|
| **Apple Design Resources** | **Yes, somewhat — but on a limb that was already there.** §2B's prohibition is on *embedding* and on mock-ups for non-Apple systems; it does not turn on whether the resulting work is free or commercial, and the license was never conditioned on Prism being open source. What changes is the framing: a proprietary product that is sold is a less sympathetic setting for a broad reading of "solely" than a free design system was. The legal question is the same; the appetite for risk around it is the owner's. |
| **EU unregistered design** | **Yes.** This is the one that genuinely sharpens. The right is against copying, and MIT never provided a defence to it — but a commercial proprietary product competing in the market is a materially different posture from a freely licensed one, both in the likelihood that a rights-holder objects and in what an objection would be worth. §4.2's question therefore matters more today than it did on 2026-09-21. |
| **Untitled UI** | **Yes, and precisely.** The creator's prohibition names "resale". Prism is now a proprietary work the owner may sell. If Prism had ever taken assets from the kit, the relicensing would move it from one prohibited category ("free distribution" inside a distributed design system) squarely into another, more clearly drafted one. It took none, so nothing changes in fact — but the margin for a future mistake narrowed, and anyone later tempted to reach into that kit should read this row first. |
| **Atlassian** | **No.** The grant is conditioned on being an Atlassian-integrated add-on, which Prism is not and was not. Commercial status is irrelevant to a condition Prism never met. |
| **The three bundled fonts** | **Yes, on one clause, and it is already handled.** OFL condition 1 — never sold by itself — becomes live only because Prism may now be sold. §2.3 records it. |
| **Phosphor, the DTCG schemas, and every `dependency` item** | **No.** MIT, ISC, Apache-2.0 and the W3C license all permit use by a proprietary consumer on their face, and none of the Apache NOTICE obligations bite, because nothing has been adapted. |

## 5. State of the check

### 5.1 What `LEGAL_CHECKPOINT` would stand for

`LEGAL_CHECKPOINT` is a **GitHub repository variable** read by the release workflow. Its first job step fails the whole release unless the value is exactly `cleared`:

```
if [ "${LEGAL_CHECKPOINT:-}" != "cleared" ]; then
  echo "::error::the ADR-0015 legal checkpoint gates the first package release … Set the repository
  variable LEGAL_CHECKPOINT to 'cleared' once the owner has recorded it."
```

Setting it therefore is not a technical act and no gate can compute it. **It is the owner asserting, in their own person, that:**

1. They have read this document, including §4, and accept that §4's three questions are **unanswered** and that this document deliberately does not answer them.
2. They accept the residual risk in §4 — in particular the EU unregistered-design exposure of §4.2, which §4.5 finds is sharper now that Prism is proprietary and sellable.
3. They accept that the MIT window of §3 is permanent and cannot be retracted.
4. They are content to release **without** counsel's review, or have obtained it. This document is diligence, not advice, and nothing in it substitutes for a lawyer's sign-off.

It stands for the owner's acceptance of risk. It does not stand for "the repository was checked" — the repository's own gates already say that, and they say it automatically.

**What it would stand for today, 2026-09-22.** When this section was written, one precondition was still open and setting the variable would have been premature whatever the owner accepted. That is no longer so: §5.2's outstanding item 1 closed the same day, so a release made from this branch now carries a reference-distance review of **every screen that would be public** — the three board screens (2026-09-16), the gallery's 488 images and both showcase apps (2026-09-22) — none of which a reasonable person would call a copy. Setting the variable therefore asserts the four things above **and nothing more**. Four limits on what it does not assert, because they are the ones a reader is most likely to assume:

- **Not that rule 3 is satisfied for a later release.** The three reviews are dated and each states its own expiry conditions (§5.2 item 1). The variable, once set, stays set; ADR-0015 rule 3 asks for the review before *every* release, so the expiry conditions are re-read each time rather than inherited from this one.
- **Not that the reviews found nothing.** They found two things worth acting on — the gallery's **RD-2** (the metric cards, borderline on anatomy; and, in its item 3, `Card/glass-vehicle`, which keeps the reference's own *genre*) and the showcase's **SD-1** (the Icons screen) — plus two matters that are not about distance at all: **SD-4**, a dark-scheme defect in the web showcase's chrome, and **SD-5**, a gap in the copy guard the reviews cite — `lint:reference-copy` did not scan `swift/Showcase`, so the Apple half of the showcase review's own subject sat outside that gate. SD-5 was **closed the same day**: those 24 files were first scanned by hand (0 findings), then `swift/Showcase` was added to the guard's targets with a test, and the guard now reports 585 files and the same 0 findings on every push. Closing it also made the count deterministic — generated output sitting inside a target is now skipped, so CI prints the same number as a machine that has built the apps, and 585 is the number the reviews and the roadmap quote. None of the four blocks a release; RD-2 and SD-1 remain open in their roadmap rows, and SD-4 was closed by P4-D4 on 2026-09-23. The re-reviews of 2026-09-23 added seven more, and none of them blocks a release either: **SD-6** (a correction to the Icons verdict of 2026-09-22), **SD-7** (whether Icon mirrored under right-to-left on the web depended on how the app was built, a package defect, fixed in the package the same day), **RD-5** and **SD-9** (the lapse described below), **RD-6** (`Badge/on-glass-over-map` has the reference badge's colour, count and ground), **RD-7** (`TopBar.yaml`'s `desktop-navigation` example specifies the tools cluster the board removed) and **RD-8** (a legibility note on `IconButton/with-badge`). The gallery review of 2026-09-26 added **RD-9** and **RD-10** (§5.2 item 1), and neither blocks a release either. Later that day it added **RD-11** and **RD-12**, which do not block one, and the showcase review added **SD-10**, which does until it is closed: two Apple screens have no review yet (§5.2 item 1).
- **Not that the reviews were right first time.** Both self-corrected the same day, and the gallery review's **RD-4** records the sharper of the two: §3.1 had described the `danger` Button as having **no fill** and concluded it was *"its own invention with no reference behind it"*, when the pill paints the references' own critical wash inside a critical hairline and the distance is one of *role*. No verdict moved, and nothing in the gallery, the tokens or the specs changed — but a reader weighing this document should know that both corrections were found by re-checking the reviews against the files, not by reading them, and that each made a distance claim **smaller**.
- **Not an answer to §4.** The EU unregistered-design question of §4.2 is exactly the question a reference-distance review cannot answer, and §4.5 finds it sharper now that Prism is proprietary. Item 2 of §5.2 records the owner's decision to accept it without counsel. That is the risk the variable is for.

**2026-09-23: the paragraph "What it would stand for today, 2026-09-22" stopped being true for about sixteen hours, and it is true again for `main` at `deb6632`.** Phase 4 wave 1 added Divider, Icon, Badge and IconButton to the gallery and to both showcase apps: 688 gallery images, and 39 examples that both apps stage. No reference-distance review read them until 2026-09-23. One of them, `IconButton/with-badge`, composes three components and fired a showcase expiry condition (finding **SD-8**). The others fired nothing, because the reviews' conditions said what expires a clearance, not what a clearance never covered (gallery **RD-5**, showcase **SD-9**). Both reviews now cover every example on `main` at `deb6632` (`reference-distance-gallery.md` §9, `reference-distance-showcase.md` §§11–12), and no screen is a copy. No release was made while the precondition had lapsed (§3.2). §5.2 item 1 says exactly what is cleared and what is not.

### 5.2 What must be true before it is set

**State on 2026-09-23, for a release made from `main` at `deb6632`.** Every precondition below is met, and nothing in this document stands between that tree and a release except the owner's own act of setting the variable (§5.1). That sentence is dated and conditional, and it has already been false once. From `32bbfa1` (Divider's code, 2026-09-23) both apps staged wave-1 examples that no reference-distance review had read, and from `fb3ae87` (Divider's baselines, 20 minutes later) the gallery showed their images too, `IconButton/with-badge` among them. Both lasted until the two reviews' 2026-09-23 sections (gallery §9, showcase §12), while this section said that nothing was outstanding. (The Icons screens' lapse, from P4-2 until the showcase review's §11, was recorded here as it happened; this one was not.) No release was made in that window (§3.2). Item 1 now says what makes the sentence true and what would make it false again. Rows already true are marked; closed items are struck through, with what closed them.

**Already true.** First verified on 2026-09-22. Every row was re-run or re-read on 2026-09-23, on `deb6632` with that day's uncommitted work in the working tree (the SD-7 fix, Icon 3, and both reviews' 2026-09-23 sections), and the numbers below are that day's. Where a number moved, the 2026-09-22 one is given beside it.

- [x] Every bundled third-party file ships its license text beside it, and every clause relied on permits bundling in a proprietary work (§2.3). Nothing is blocked. On 2026-09-23 the 26 license-text, 48 packaged-files and 5 permitted-use checks of `licenses:check` all pass.
- [x] `pnpm licenses:check` → exit 0, 99 checks, all passing (2026-09-23; the row said 85 on 2026-09-22).
- [x] `pnpm licenses:notices --check` → exit 0, 31 items, inventory updated 2026-09-22 (2026-09-23). The row said 30 items on 2026-09-22, but `licenses/inventory.json` has held 31 since `0ee722a`, the commit that dated it 2026-09-22, and it has not changed since.
- [x] `pnpm release:pack` → exit 0; `LICENSE` shipped and `"license": "SEE LICENSE IN LICENSE"` in all three packages; `LICENSE` byte-identical in four places (`ff07022f…`, the amended text). Re-run on 2026-09-23 after `pnpm -r build`, with its tarballs kept outside the repository: exit 0, every check passing, no conflict copy among the 4, 71 and 31 files the three packages pack, and the `LICENSE` inside each tarball hashes to the same `ff07022f…`.
- [x] `pnpm lint:reference-copy` → exit 0; `pnpm icons:validate` → exit 0, registry valid, 30 generated files current. No reference imagery in the tree (§3.3). Re-run on 2026-09-23 with both reviews' 2026-09-23 sections in the tree, and again after this document's last 2026-09-23 edit: `lint:reference-copy` exit 0, 648 files (the 645 tracked at `deb6632` plus three new VRT fixture files in the working tree, because the guard walks the disk), 143 denylist entries; `icons:validate` exit 0, registry valid, 30 generated files current.
- [x] `PACKAGE_VISIBILITY` must also be `private` or `public` for the same workflow step to pass, and ADR-0031 rule 6 records the choice as `public`. It is a GitHub repository variable rather than a file, so it was read with the authenticated `gh` CLI on 2026-09-22: `gh variable list --repo iiiivaska/prism` prints one row, `PACKAGE_VISIBILITY` = `public`, updated `2026-09-22T09:15:32Z` — and `LEGAL_CHECKPOINT` is absent from that listing, i.e. still unset. `gh repo view iiiivaska/prism --json visibility,isPrivate,forkCount` → `{"visibility":"PUBLIC","isPrivate":false,"forkCount":0}`, which matches ADR-0031 rule 6. Both commands were re-run on 2026-09-23 and printed the same row and the same JSON, with `LEGAL_CHECKPOINT` still absent. The setting stays the owner's to change; this records what it was when the check ran.
- [x] **Gate P3-0 is recorded as signed off**, so the direction-board gate is not what stands between the repository and a release. `docs/direction-board/README.md`, the first line under "## Sign-off checklist", reads *"**Signed off 2026-09-16.** The owner approved the re-rendered board as published … Gate P3-0 is closed"*, and `docs/roadmap.md` line 45 records the same date and that P3-3 and P3-4 are unblocked; P3-3, P3-4, P3-5 (`410a41c`) and P3-6 (`1e2e2c0`) all landed on the strength of it. The individual boxes under "### Sign now (gate P3-0)" were left unticked 41–59 lines further down (recounted on 2026-09-23; this row said 39–58), which is an inconsistency inside that file and not a second, still-open gate — it is reported to that file's owner, not edited here. What the 2026-09-16 sign-off does **not** reach is the future scope of its own item 4.2 — the gallery and showcase screens that did not exist then; that was item 1 below, and it closed on 2026-09-22.

**The list below was the outstanding one.** Item 1 closed on 2026-09-22, lapsed without notice when wave 1 landed, and closed again on 2026-09-23 (below). Items 3 and 4 were done on 2026-09-22, and item 2 was never a task but the record of an answer already given. The items are kept in place, struck through rather than deleted, because what closed each one is the part worth reading. For the tree at `deb6632`, the one thing between the repository and a release is the owner's own act of setting the variable: §5.1's list of four assertions, which no gate can compute. A release made from any later tree also needs the reviews' expiry conditions re-read against that tree first.

**These had to be true before `LEGAL_CHECKPOINT` is set to `cleared`:**

1. ~~**The reference-distance review of ADR-0015 rule 3 must cover every screen that will be public at the release.**~~ — **done 2026-09-22** (finding **F-7**). It lapsed unnoticed when wave 1 landed, and was **done again on 2026-09-23** (gallery RD-5, showcase SD-9; see *What is cleared on 2026-09-23* below). When this section was written the review covered the three direction-board screens only, reviewed 2026-09-16; the gallery screens were ticket P5-2, unstarted, and the showcase apps under construction had never been reviewed. **This was the one outstanding item that ADR-0015 itself makes a precondition rather than a preference**, and critic C-16 had identified the ordering problem: P5-2 sat after P3-6 in the roadmap, so a release run before P5-2 would have breached rule 3. The P3-0 sign-off did not close it and was never asked to: it was given on 2026-09-16, when the board's three screens were the only screens that existed.

   **What closed it.** Two reviews, both written on 2026-09-22, in the format the owner signed off on for the board — per screen: what it is, the nearest reference by `references.json` shot id, the families mixed, what differs, and a verdict. Neither fetched, screenshotted or stored a reference image; `pnpm lint:reference-copy` passes with both in the tree.

   | Review | Roadmap | Subject | Verdict |
   |---|---|---|---|
   | `docs/direction-board/README.md` § Reference-distance review, 2026-09-16 | P3-0 | the three board screens | own compositions; D4 had already forced one to be recomposed |
   | `docs/direction-board/reference-distance-gallery.md` | **P5-2** | `gallery/index.html` and its 488 committed PNGs — 28 spec examples of 4 components, grouped into the 10 screens a reader sees. **Re-reviewed 2026-09-23** (§9): all 1176 PNGs at `deb6632`, 67 examples of 8 components, with `IconButton/with-badge` reviewed in full | **no screen is a copy** |
   | `docs/direction-board/reference-distance-showcase.md` | **P5-3** | `web/apps/showcase` and `swift/Showcase`, both built and every screen opened (web at 1440/1280/375 px in light and dark; Apple on the iPhone 17 simulator, iOS 26.5, and on the Mac). **Re-reviewed 2026-09-23**: the Icons screens (§11), and the component pages, the IconButton page and `with-badge` among them (§12) | **no screen is a copy**, of a reference shot or of a well-known showcase of the genre |

   **Nothing must change before a release.** Neither review names a screen that has to be altered first. What they do name is worth the owner's eye, because neither is a rubber stamp: the gallery's **RD-2** finds the metric cards borderline on *anatomy* — title, grey caption, ↗ top-trailing, thin hero with a dimmed remainder and a hung unit, every part in the same corner as shot 27220417's glass KPI card — and says the cheap way to increase the distance is to fill `Card.yaml`'s `aside`, which would also close a real coverage gap; its item 3 names a second, separate closest call on another axis — `Card/glass-vehicle` sits in shot 27220417's own subject matter even though its strings are invented and six of that card's eight parts are absent (the review's §3.7 and §4 row 7; this sentence said five of seven until 2026-09-23) — and leaves the choice between keeping and re-subjecting the example to whoever takes the `Card.yaml` edit; and the showcase's **SD-1** finds the Icons screen the closest call in either app and lists the small, tempting changes that would turn a registry table into an icon browser. Both are recommendations, not blockers, and both are recorded in their roadmap rows. The re-reviews of 2026-09-23 add two more of the same kind. The gallery's **RD-6** notes that `Badge/on-glass-over-map` is a critical "2" on glass over the map, which is the reference badge's colour, count and ground, and that changing the count is cheap. Its **RD-7** notes that `TopBar.yaml`'s `desktop-navigation` example, which is unimplemented, specifies the tools cluster the board's D4 rework removed. Neither is a blocker today.

   **The clearances are dated, and they expire — the variable does not.** `LEGAL_CHECKPOINT` is a repository variable that stays set once set; each review covers a dated tree (the tree as it stood on 2026-09-22; since 2026-09-23, the tree at `deb6632`) and states its own expiry conditions (as first written, gallery: a pattern example screen lands, P5-1 rebuilds the board screens into the gallery, or an example composes more than one part; showcase: Phase 5 rebuilds the chrome from real components, Icons gains a browser affordance, the web axis bar gains a viewport control or a docs tab, or a staged example composes more than one component). Rule 3 asks for the review **before every release**, not once, so the conditions are read again each time — the variable being `cleared` is never the answer to "has rule 3 been satisfied for *this* release". On 2026-09-23 both reviews replaced their composition condition (gallery §9.9, showcase §12.7). Each now covers only the examples the gallery review names, the 67 its §9.8 lists by id. Each expires on an example other than `IconButton/with-badge` that fills a slot with a second component, and on the notification composition moving towards the reference's bell. The gallery's also expires on a re-record after `deb6632` that changes what an example draws, and the showcase's when either app puts two Prism components together outside an example's stage in a way it did not at `deb6632`.

   **Pointer, not a new verdict:** roadmap **P4-2** implemented `Icon`, which fired `reference-distance-showcase.md` §10 condition 2 (**SD-1**) for the Icons screens of both showcase apps. The rule 3 review was re-run for those screens on **2026-09-23**, after P4-D4 reconciled them (§11 of that document). Neither screen is a copy, and SD-1's margin holds on both stacks. **The rule 3 precondition is met again for a release that ships the Icons screens as reviewed**, until one of the conditions in §11.8 fires. That section re-reads none of the document's other conditions: its SD-8 flags that condition 4 may have fired with P4-4's `IconButton/with-badge`, which was not reviewed. **SD-8 was answered the same day:** `IconButton/with-badge` is not a copy (`reference-distance-gallery.md` §9.4, `reference-distance-showcase.md` §12), and neither is any of the 38 other wave-1 examples that no review had read (gallery §9.5).

   **What is cleared on 2026-09-23, and what is not.** "Cleared" means that a rule 3 review exists and none of its conditions has fired.

   *Cleared, for `main` at `deb6632`:*
   - the three direction-board screens (2026-09-16);
   - the gallery: all 1176 images, 67 examples of 8 components, including the 104 Button and Card images re-recorded since 2026-09-22 (2026-09-22, and gallery §9);
   - both showcase apps, every page: the screens §§4–9 reviewed on 2026-09-22, the Icons screens (§11), and the pages of all eight implemented components with every example they stage, the IconButton page with `with-badge` and the Apple Overview strip among them (§12).

   *Not cleared, or not covered:*
   - anything not in the tree at `deb6632`: a new example of any component, the first baselines of a new component, a pattern example screen, and TopBar's `desktop-navigation` example in particular (RD-7). Each is outside the reviews until a dated section names it;
   - any tree in which an expiry condition has fired: gallery §8 conditions 1–2 and §9.9; showcase §10 conditions 1 and 3, §11.8 and §12.7. That includes anything committed after `deb6632`, the work other tickets had in the working tree on 2026-09-23 among it. The conditions are read against that diff;
   - the open recommendations, RD-2, RD-6, SD-1 and SD-2. They are not preconditions, and they remain open;
   - §4's three legal questions, which no reference-distance review can answer (item 2).

   **2026-09-26: Avatar's examples are read. Chip's are not, and the showcase review has not read the apps since `deb6632`.** P4-7 committed Avatar's 204 baselines at `5522846`, which put its twelve gallery examples outside the gallery review by its §9.9 condition 3. The gallery review's §10 reads them, and none is a copy. It records two findings, and neither is a precondition:
   - **RD-9**: on Apple every example staged on the synthetic map sits where its route turns, and Avatar's two map examples put a bare round mark there. That makes them among the gallery's nearest images to shot 27220417's map;
   - **RD-10**: `Sidebar.yaml`'s `rail` example specifies the left rail of shot 27678963, whose ringed avatar is `Avatar/ringed`'s nearest reference.

   §10.8 adds a seventh gallery condition, a mark on the map moving towards 27220417's.

   *Cleared in addition, for the gallery at `5522846` and at `3fb52c9`, which adds no image:* Avatar's twelve examples, 204 images. The gallery review now covers 1380 images and 79 examples of 9 components.

   *Not cleared, in addition to the list above:*
   - **Chip.** `3fb52c9` implemented it, so both showcase apps stage its thirteen examples, and `md-with-avatar` fills a slot with an Avatar. For the apps, that fires the showcase review's §12.7 conditions 4 and 5. Its gallery images come with P4-8's baselines and will fire gallery conditions 3 and 4. Chip is covered once a dated section of each review names and reads it;
   - **the showcase apps since `deb6632`.** The showcase review has no section later than 2026-09-23, so its conditions have not been read, in writing, against the apps' diff since then. Its §12.7 says a new component's page does not expire it once the gallery review names the page's examples, which §10 now does for Avatar. Its other conditions still have to be read against that diff.

   So a release made from `3fb52c9` or any later tree is not cleared until both are done. The two gates the reviews cite were re-run on 2026-09-26 with the gallery review's §10 in the tree: `pnpm lint:reference-copy` exit 0, 682 files, 143 denylist entries; `pnpm icons:validate` exit 0, registry valid, 30 generated files current. The other rows of "Already true" were not re-run that day.

   **2026-09-26, later: Chip's examples are read, and so is the web app. The Apple app was not run, so a release from `5b1663c` is still not cleared.** P4-8 committed Chip's 224 baselines at `5b1663c`. The gallery review's §11 reads them, and none is a copy. The showcase review's §13 reads the Avatar and Chip pages of both apps, and reads every condition in force against the apps' diff since `deb6632`. The web app was built and run, and none of its pages is a copy. The Apple app could not be built or run, because that session had no Mac. Three findings:
   - **RD-11**: `Chip/md-with-avatar` has the anatomy of shot 27220417's plate chip, with a person in it;
   - **RD-12**: `Chip/identifier-copy`'s "B-4417" puts `Card/glass-vehicle`'s fleet unit number in a vehicle-style identifier. A relabel outside the fleet genre is recommended and not taken. It is one `Chip.yaml` example edit and 16 re-recorded baselines;
   - **SD-10**: the Apple half of showcase §13 is read from source, from the generated catalogue and from the gallery's Apple baselines. The showcase review's method asks for the running app, so the Apple Chip page and the `Chip/md-with-avatar` page are not reviewed, on the iPhone or the Mac.

   Gallery §11.9 names `md-with-avatar` beside `with-badge` in condition 4, extends condition 7, and adds condition 8, an identifier chip moving towards the plate chip. Showcase §13.8 adds condition 8: an example the apps stage that changes what it draws fires the review on the commit that changes it.

   *Cleared in addition, for `5b1663c`:*
   - the gallery's Chip examples, 224 images. The gallery review covers all 1604 images, 92 examples of 10 components;
   - the web showcase, every page, the Avatar and Chip pages with all 25 examples among them;
   - every page of the Apple showcase except the two that SD-10 names. Its new Avatar and Chip pages were read from source; by the showcase review's §12.7, a new component's page needs no run once the gallery review names its examples.

   *Not cleared:* **the Apple Chip page and the `Chip/md-with-avatar` page** (SD-10). One run on a Mac closes it: `pnpm showcase:apple` for the iPhone 17 simulator and `--platform macos`, then `-DSShowcaseComponent Chip` and `-DSShowcaseExample Chip/md-with-avatar` in light and dark, at regular and compact density and under Increase Contrast, with the verdict recorded in a dated section of the showcase review. SD-10 lists the steps.

   **So a release made from `5b1663c` is not cleared.** It will be once that run finds the two pages not a copy, provided none of the reviews' conditions fires in the meantime. `3d5c4b2` (P4-D9 1/2) landed while the two sections were written. It changes no image and no file of either app, so all of this holds for it too, and a release made from it is not cleared either. Its second half will add 144 web images, the Reduce Transparency variants of 18 examples the gallery review names. By gallery §9.9 condition 3, a new variant of a reviewed example is covered once a sentence is added to its group. The two gates were re-run with both sections in the tree: `pnpm lint:reference-copy` exit 0, 682 files, 143 denylist entries; `pnpm icons:validate` exit 0, registry valid, 30 generated files current. CI run 36210049257 on `5b1663c` is green. The other rows of "Already true" were not re-run.

   **2026-09-26, later still: the web's Reduce Transparency images are read. A release from `29b5490` is still not cleared, and SD-10 is the one reason.** P4-D9 committed those 144 images at `29b5490`. The gallery review's §12 reads all of them beside their Apple twins, and adds to each group the sentence §9.9 condition 3 asks for. None is a copy, and no earlier verdict or finding moves: the fallback removes the glass the references' map screens are built from. In light, `Avatar/initials-over-map` becomes a near-white disc on the map, and §12.5 reads it against shot 27220417's puck. The optional edits of RD-2 item 3 and RD-6 now move 28 baselines each. P4-D9 touched no file of either showcase app, so the showcase review's §13 is unaffected.

   *Cleared in addition, for `29b5490`:* the gallery's 144 new images. The gallery review covers all 1748 images, 92 examples of 10 components.

   *Still not cleared:* **the Apple Chip page and the `Chip/md-with-avatar` page** (showcase SD-10), as the block above says. The Mac run that SD-10 describes is now the only thing between the tree and a rule 3 clearance. Setting the variable remains the owner's act (§5.1).

   **So a release made from `29b5490`, or from the commit that adds gallery §12, is not cleared until that run finds those two pages not a copy.** The two gates were re-run with §12 in the tree: `pnpm lint:reference-copy` exit 0, 682 files, 143 denylist entries; `pnpm icons:validate` exit 0, registry valid, 30 generated files current. CI run 36213988632 on `29b5490` is green: every committed baseline, the 144 among them, compares equal.

   **2026-09-26, RD-12: `Chip/identifier-copy` is relabelled, and its 16 re-recorded images are read. SD-10 is unchanged.** `e56272f` took the gallery review's RD-12. The example now reads "INV-209316", an invoice number; "B-4417" put `Card/glass-vehicle`'s fleet unit number in a vehicle-style identifier. TextField's and ListRow's examples, which no stack implements, no longer use "B-4417". Two conditions fired:
   - showcase §13.8 condition 8, at `e56272f`, because both apps show the new label from that commit;
   - gallery §9.9 condition 6, at the commit that adds this block, which commits the example's 16 baselines (8 Apple, 8 web) that CI run 36247333811 re-recorded.

   The gallery review's §13 reads the 16 beside the images they replace. Only the label and the pill's width moved. None is a copy, RD-12 is closed, and §11.6 row 35 becomes a plain "No". The change fills no slot, so by condition 8's own words the gallery section answers it too, and a note under the showcase review's §13.8 says so.

   *Cleared in addition:* the 16 re-recorded images. The gallery review covers all 1748 images at the commit that adds §13.

   *Not changed:* **the Apple Chip page and the `Chip/md-with-avatar` page** (showcase SD-10), where `identifier-copy` is staged too. They still wait for the run that SD-10 describes, unless a later block here records it. This block reads RD-12's change only. The other commits since `29b5490` are read against the conditions by their own tickets' sections.

   The two gates were re-run with gallery §13 in the tree: `pnpm lint:reference-copy` exit 0, 684 files, 143 denylist entries; `pnpm icons:validate` exit 0, registry valid, 30 generated files current.

   **2026-09-26, P4-D14: the web's Increase Contrast images are read. SD-10 is unchanged.** The commit that adds this block commits 183 web images that CI run 36249203600 recorded: one `increased-contrast` twin per example and scheme, on `web-desktop` at regular density. They are new variants of all 92 examples the gallery review names, which its §9.9 condition 3 covers once a sentence is added to each group. The gallery review's §14 reads all of them beside their Apple twins and adds the 23 sentences. None is a copy, and no earlier verdict or finding moves. On both stacks alike, Increase Contrast deepens strokes and secondary text, raises thin weights to 400 and falls glass back as Reduce Transparency does. The metric cards' thin hero turns regular under it, so RD-2's borderline anatomy is drawn less like the reference card. The optional edits of RD-2 item 3 and RD-6 now move 30 baselines each. P4-D14 touched no file of either showcase app.

   *Cleared in addition:* the gallery's 183 new images. The gallery review covers all 1931 images, 92 examples of 10 components, at the commit that adds §14.

   *Not changed:* **the Apple Chip page and the `Chip/md-with-avatar` page** (showcase SD-10). They still wait for the run that SD-10 describes, unless a later block here records it.

   The two gates were re-run with gallery §14 in the tree: `pnpm lint:reference-copy` exit 0, 684 files, 143 denylist entries; `pnpm icons:validate` exit 0, registry valid, 30 generated files current.
2. **The owner's answer to §4 is on record: accepted as-is, no counsel.** On 2026-09-16 the owner was asked whether to run the ADR-0015 checkpoint themselves or delegate it and answered *"Сделай сам, как по мне все хорошо"* — do it yourself, it looks fine to me — and has reaffirmed end-to-end autonomy since. This document is therefore the answer as well as the question: the residual matters in §4 (the Apple Design Resources reading, the EU unregistered-design exposure of the reference-distance review, the Untitled UI dual license kept at inventory-only) are accepted as they stand, by the owner's delegation, with no lawyer consulted. That is a choice, not a clearance: nothing here is legal advice, and if the owner ever wants one of the §4 items reviewed by counsel, §4.5 is the part written today and the part to hand over first.
3. ~~**The owner decides whether `LICENSE` clause 2 should be widened**~~ — **done 2026-09-22** (finding **F-4**). Clause 2 now describes the clones and forks of the public MIT tree rather than an empty set of published versions. Recorded here rather than left open because the owner delegated this checkpoint and the change only aligns `LICENSE` with ADR-0031's Context.
4. ~~**The owner decides whether `LICENSE`'s definition of "the Software" should be widened**~~ — **done 2026-09-22** (finding **F-8**). The definition now reaches the build outputs the tarballs carry, wherever they are distributed, so the claims ADR-0031, §3.5 and §5.4 make about a downloaded package rest on the instrument rather than on inference. The caution this item was written with still stands in general — an agent should not redraft an operative definition in a licence on its own initiative — and it was set aside here for two specific reasons: the owner had delegated this checkpoint, and the edit strictly narrows what a stranger may do while granting nothing new to anyone, which is the direction the owner chose on 2026-09-22. It is flagged in the summary so the owner can reverse it in one edit if they disagree.

**Should be fixed, but does not gate the variable** — F-1, F-2, F-3 and F-6 from §2.5 and §3.6 were all closed on 2026-09-22, in the rows above; what remains of this line is the MIT references the relicensing could not reach, listed below.

### 5.3 Still asserting MIT, and not this document's to change

> **Closed 2026-09-22, after this section was written.** The concurrent work that owned these files finished, and the orchestrator made the substitutions below: `.github/workflows/release.yml` lines 4, 27, 199, 202 and 279 now cite ADR-0031 and `"license": "SEE LICENSE IN LICENSE"`, and `docs/roadmap.md`'s P3-6 row now records that the rehearsal ran under ADR-0028's MIT and that ADR-0031 superseded it. `docs/research/critic.md` line 521 was left alone, for the reason given below. The section is kept as written because it is the record of what the relicensing could and could not reach at the time.

Three files still name ADR-0028 or MIT for Prism. They are owned by work in progress elsewhere in the repository and are reported, not edited. (A fourth file, `spec/icons/README.md`, carried a false provenance claim — that the Phosphor SVGs are bundled in the web package — and `spec/` is not owned by concurrent work, so it was corrected rather than reported: it now reads that `@phosphor-icons/react` is installed by the consuming app and that Prism's web package ships names only, which is what §2.1, §2.4 and `licenses/inventory.json` already said. The MIT attribution in that line is correct and is untouched.)

- **`.github/workflows/release.yml`** — **five references, on lines 4, 27, 199, 202 and 279** (`grep -n 'ADR-0028\|MIT'`): the header comment naming "ADR-0028 (MIT, a LICENSE in every package)" (4), the entrance comment citing "the ADR-0015 legal checkpoint (ADR-0028 rule 5)" (27), the pack step's name and the comment above it, which say the audit checks `"license": "MIT"` (199, 202), and the `LEGAL_CHECKPOINT` error message itself, which cites "ADR-0028 rule 5" (279). ADR-0031's rule 5 is deliberately the same legal checkpoint, so the substitution is direct in each case. The workflow does not enforce the license; `release:pack`, which it calls, does, and that is already correct — none of the five lines enforces anything, and lines 199–205 are a step name and a comment block over `run: node tools/release/pack.ts --list`.
- **`docs/roadmap.md`** line 51 — the P3-6 entry's `"license": "MIT"`.
- **`docs/research/critic.md`** line 521 — "Resolved 2026-09-15 by ADR-0028 (MIT)". **This one should stay.** It is a true record of how finding G-11 was closed at the time, and changing it would falsify the history, for the same reason ADR-0028's body is untouched.

### 5.4 The sentence for the release page

> Prism is proprietary software: Copyright (c) 2026 iiiivaska, all rights reserved — see `LICENSE`, which travels inside every package; downloading a package is not a license to use it, and use requires the copyright holder's prior written permission. Bundled third-party files (the Onest, JetBrains Mono and Inter fonts under the SIL Open Font License 1.1, and the Phosphor icons under MIT) keep their own licenses, which this one neither narrows nor grants any right in; see `THIRD_PARTY_NOTICES.md`.
