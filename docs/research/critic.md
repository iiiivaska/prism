# Research critic

- Date: 2026-09-14.
- Why: the first version of this file (2026-09-08, listed in `docs/research/README.md:20`) was lost. This rebuild comes from four area critics and a confirmation pass. The areas were the token pipeline; Apple, icons and fonts; web, data-viz and CI; and governance and specs. The confirmation pass opened every cited location in the working tree.
- Scope: `docs/`, `tokens/`, `brands/`, `spec/`, `agent/`, `licenses/`, `tools/`, `swift/`, `web/`, `.github/` and the root manifests, as they stood in the working tree on 2026-09-14. That includes the uncommitted P0-2 bootstrap changes and the motion-haptics fact-check of 2026-09-14.
- Exclusions:
  - External facts (vendor docs, registries, licence texts) are not re-checked beyond what `docs/research/verification.md` records. No network was used.
  - Visual quality is not judged.
  - Reference imagery was not consulted (ADR-0015).
- Line numbers refer to that working tree and will drift.

## Method and counts

The four critics sent 100 candidate findings. The confirmation pass reproduced the following locally, in a scratch directory outside the repository:

- Flattened all 432 resolver permutations and resolved every alias.
- Parsed every spec with the workspace's own `yaml` 2.9.1.
- Ran `xcodebuild -list` on a copy of the package (Xcode 26.6, 17F113).
- Ran `swift build` on a scratch target with a `.xcassets` resource (Swift 6.3.3).
- Checked which working directory `swift run --package-path` uses.
- Read the name tables of the bundled font files.
- Ran `Intl.NumberFormat` on Node 24.21.

Result:

- 70 items confirmed from the candidates.
- 2 items added by the confirmation pass (G-01, G-02).
- 30 candidates dropped:
  - 29 were merged into another item as duplicates.
  - 1 is no longer true: motion-haptics was fact-checked on 2026-09-14 (`docs/research/verification.md:14`).
- Sub-claims already fixed in the working tree were removed from their items. These were the TypeScript 7 pin, the Node engines floor, the missing lockfile, the Storybook build through `pnpm -r build`, and the "Swift or Node is the spring reference" question.

Severity:

- **High:** blocks a roadmap ticket or breaks a rule an ADR calls mandatory.
- **Medium:** causes rework in a named ticket.
- **Low:** local.

IDs:

- G = gap (§1)
- C = contradiction (§2)
- S = stale reference (§3)
- U = unverified claim (§4)
- R = risk (§5)

§6 maps every ID to a roadmap ticket.

## 1. What the research missed

**G-01 (high). Research inputs that tickets and tokens depend on are not in the repository.**

These do not exist anywhere in the tree: `docs/research/visual-dna.md`, `component-inventory.md`, `a11y-reconciliation.md`, `docs/direction-board/`, and the owner's screenshot notes named in `docs/research/refs-vexto-incident.md:3`. They are cited as live inputs:

- P1-1 checks ramps against the merged `visual-dna.md` (`docs/roadmap.md:17`).
- P2-5 and the Phase 4 order read `component-inventory.md` (`docs/roadmap.md:34`, `:51`).
- P5-1 rebuilds `docs/direction-board/` (`docs/roadmap.md:63`), a blueprint deliverable according to `docs/adr/0017-blueprint-first.md:21`.
- Every vivid gradient's text-safe zone is only "see visual-dna.md" (`tokens/ref/gradient.tokens.json:49`, `:104`, `:159`, `:214`, `:282`, `:350`, `:418`, `:486`). The pair file takes its expected values from that file's appendix (`tokens/contrast-pairs.json:2`), so the `text-zone` pair (`tokens/contrast-pairs.json:44`) has no data. (Resolved 2026-09-15 by ADR-0022: no zones; V1 and V2 checks.)
- Further citations:
  - `docs/research/README.md:7`, `:9`, `:10`
  - `docs/adr/0011-accessibility-tiers-ci.md:50`
  - `docs/adr/0015-references-inspiration-only.md:20`
  - `brands/README.md:3`
  - `spec/patterns/README.md:52`
  - `spec/components/Button.yaml:170`, `Card.yaml:187`, `Surface.yaml:148`, `Text.yaml:149`
  - `tools/tokens/seed-sys-tokens.py:2`

**G-02 (high). Three of the four component specs and the haptics registry do not parse as YAML.**

The parser is `yaml` 2.9.1, the catalog's own (`pnpm-workspace.yaml:41`). Failures:

- List items that start with a backtick, which is a reserved indicator: `spec/components/Button.yaml:116-117`, `spec/components/Card.yaml:133-134`, `spec/components/Text.yaml:105`.
- A plain scalar that contains ": " inside a mapping value: `spec/components/Card.yaml:186`.
- Values such as `SensoryFeedback.impact(weight: .light)`: `spec/haptics.yaml:22`, `:24`, `:29`, `:31`, `:36`, `:38`, `:92`, `:99`.

Only `Surface.yaml` parses. Several things read these files: the P2-1 validator (`docs/roadmap.md:30`), the parity report, the skill generator and the DSHaptics mapping.

**G-03 (high). The semantic tier has no typography, elevation or gradient roles, so spec bindings point at tokens that do not exist.**

Every binding in the four specs was checked against the flattened `sys` and `comp` files. Missing:

- **21 `type.*` paths:** `spec/components/Text.yaml:62-81`, `:99`; `Button.yaml:101-103`; `Card.yaml:104`, `:110`, `:126`. The type roles exist only as `ref.type.*` (`tokens/ref/typography.tokens.json:33-35`), which specs may not bind (`spec/SCHEMA.md:90`).
- **`elevation.0…3`** (`spec/components/Surface.yaml:89-92`). The sys layer has `shadow.flat`, `.raised`, `.floating`, `.overlay` and `.drawer` instead (`tokens/sys/color/light.tokens.json:462-479`), and `shadow` is not an allowed root in the spec regex (`spec/component.schema.json:138`).
- **Vivid gradients:**
  - `gradient.vivid.orchid` (`Surface.yaml:76`, `Card.yaml:90`)
  - `sys.gradient.vivid.n` (`docs/adr/0009-materials-in-layers.md:24`)
  - the `gradient.vivid.*` pair (`tokens/contrast-pairs.json:44`)

  Gradients exist only under `ref`.
- **Other paths:**
  - `opacity.grain` (`Surface.yaml:96`)
  - `opacity.dimmed` (`agent/SKILL.md:36`; sys has `dimmed-row`)
  - `size.card.min` (`spec/patterns/README.md:21`; `ref` only)
  - `size.hit.touch` and `size.hit.pointer` in behavior text (`Button.yaml:115`, `spec/SCHEMA.md:99`); sys has a single `size.hit`.
- **The regex:** it accepts `elevation`, `border` and `gradient` roots that have no sys tokens. It rejects `shadow`, `stroke`, `interaction` and `font`, which exist (`spec/component.schema.json:138`).
- **The README:** `tokens/README.md:31-38` documents the missing names.
- **Density:** ADR-0004 gives density "type sizes" (`docs/adr/0004-dtcg-tokens-style-dictionary.md:23`), but the density files write only `sys.type.body-line-height` (`tokens/sys/density/regular.tokens.json:60-65`), which nothing uses.

As a result, P2-1 ("every token path in bindings must exist", `docs/roadmap.md:30`) and P2-5 ("all specs validate", `:34`) fail on day one.

**G-04 (high). `sys.material.*` has no `$type`, and the glass parameters bypass typed tokens.**

- **Untyped materials.** `$type: color` sits on `sys.color` (`tokens/sys/color/light.tokens.json:5`). `sys.material` is a sibling group with no type, so 22 glass and scrim tokens in four files are untyped: `light.tokens.json:360-460`, `dark.tokens.json:472-593`, `light-reduced-transparency.tokens.json:4-34`, `dark-reduced-transparency.tokens.json:4-83`. Untyped tokens are invalid, and tools must not infer a type (`docs/research/arch-tokens.md:92`). P1-1 calls the files "already schema-valid" (`docs/roadmap.md:17`), so that validation never checked type resolution.
- **Bare glass numbers.** Blur, saturate, edge and grain are bare numbers in `$extensions` (for example `light.tokens.json:377`). The typed `ref.blur.*` tokens (`tokens/ref/dimension.tokens.json:275-301`) are referenced by nothing.
- **`glass.cell`.** `sys.material.glass.cell` exists only in the dark contexts (`dark.tokens.json:562-579`), so it is absent from 216 of the 432 permutations.
- **Chart sizes** are typed `number` (`tokens/sys/base.tokens.json:149-178`), so dimension transforms skip them.
- **Reduce Transparency.** Dark glass stays at alpha 0.92 (`dark-reduced-transparency.tokens.json:15`), while `docs/adr/0011-accessibility-tiers-ci.md:27` says glass becomes solid.
- **Resolved 2026-09-15 by ADR-0022**, except the chart-size bullet (P1-2 review).

**G-05 (high). Spring parameters are lost at the sys and comp tiers because aliases do not carry `$extensions`.**

- **Where the source of truth lives.** `tools/tokens/README.md:33` and `tokens/README.md:80` make `$extensions["app.prism"].spring` the source of truth, but only `ref.motion.spring.*` carries it (`tokens/ref/motion.tokens.json:107-116`).
- **Bare aliases.** The default sys springs are bare aliases (`tokens/sys/motion/default.tokens.json:26-43`), and `comp.button.motion.press` aliases sys in turn (`tokens/comp/button.tokens.json:100-105`).
- **What resolves.** An alias copies only the target's `$value` (`docs/research/arch-tokens.md:93`), so the resolved sys and comp springs hold only the cubic-bezier fallback.
- **Nothing specifies the fix.** No document says whether the P1-4 `prism/spring` transform (`docs/roadmap.md:20`) follows alias chains. P3-1's parity test assumes the parameters arrive (`docs/roadmap.md:42`).

**G-06 (high). The grammar of the token-binding matrix is undefined, and the specs use incompatible shapes.**

- **What the schema and SCHEMA.md say.** The schema says only "token path or matrix keyed by variant/size/state" (`spec/component.schema.json:72`, `:144`). `spec/SCHEMA.md:72` says unspecified cells inherit, without saying from what. `:83` uses `default`, which is also a state name.
- **Button** nests state → property → variant and keys `hover`, `disabled` and `focus` as if they were properties. `focus` is not a state; the state is `focus-visible` (`spec/components/Button.yaml:89-98`, `:62`).
- **Text** keys color by surface context, which is not a prop value (`Text.yaml:92-95`).
- **Card** keys radius by `compact`, `regular` and `large`, which are both Card sizes and density names (`Card.yaml:91-94`, `:137`).
- **No interpolation.** A prop value cannot pick the token, so every vivid variant binds orchid (`Card.yaml:89-90`, `Surface.yaml:75-76`).

**G-07 (high). The vertical slice cannot render its own examples, and its dependencies are incomplete.**

- **Missing parts.** Button's loading example renders a Spinner, and the secondary and ghost examples render icons (`spec/components/Button.yaml:29-31`, `:152-158`). Card's tinted example needs an icon ring, `action: custom` needs an IconButton, and the aside hosts a Sparkline (`Card.yaml:29-34`, `:43`, `:133`, `:179`). Spinner, Icon and IconButton are scheduled for Phase 4 (`docs/roadmap.md:53`), and icon codegen P2-2 (`:31`) is not a dependency of P3-3 or P3-4 (`:44-45`).
- **P3-1's inputs.** P3-1 depends only on P1-5 (`:42`), but DSFontRegistrar needs the font files and PostScript map from P1-8 (`:24`). DSHaptics needs a mapping that no ticket produces.
- **No text content.** Text has no content prop (`Text.yaml:31-55`). Its examples cannot state their string, and the "second line" of the two-tone example (`Text.yaml:134-136`) cannot be expressed.
- **No backdrop.** The glass examples need an image or map backdrop (`Card.yaml:172-177`). ADR-0015 forbids reference imagery, and the inventory defines the kind `image` (`licenses/inventory.schema.json:21`) but has no such item.

**G-08 (high). No ticket moves the bundled fonts into the SPM bundle or the web package.**

- **Where the files live.** The brand contract puts font files in `brands/<name>/fonts/` (`brands/README.md:34`); arch-apple puts them in `swift/Sources/DSTokens/Resources/Fonts/` (`docs/research/arch-apple.md:409`). SwiftPM bundles resources only inside a target's path (`Package.swift:33-39`). DSCore, which hosts DSFontRegistrar (`arch-apple.md:414`), declares no resources (`Package.swift:41-46`).
- **Web.** The web side needs self-hosted woff2 (`docs/adr/0008-typography-slots-and-presets.md:25`), but P3-2 lists no `@font-face` and no woff2 (`docs/roadmap.md:43`).
- **Version and hash records.** ADR-0008:25 wants versions and SHA-256 recorded in the token source and diffed. `brands/prism/brand.json:7-9` records a version for two of the three slots and no hash.
- **Stale paths.** The font files have now arrived in the working tree under `brands/prism/fonts/onest/` and `brands/prism/fonts/jetbrains-mono/`. `brand.json:7-9` still points at `fonts/Onest[wght].ttf`, and `:12` says the files are not committed until P1-8.
- **Consumer brands.** Brands kept in consumer repositories (`brands/README.md:3`) would register from `Bundle.main`, and no API covers that case.

**G-09 (high). The Apple mechanism for non-SF icons is undefined.**

- **Two different artifacts.** `docs/adr/0013-icon-registry.md:22` names both a custom symbol set generated from Phosphor sources and a plain asset catalog with vector preservation. `spec/icons/README.md:6` says the custom set comes from "raw stroked sources".
- **The sources are not strokes.** The shipped Phosphor SVGs are outlined paths (`docs/research/icons-tooling.md:15`). Custom symbol templates need three sources with matching path counts (`:98`), which Phosphor does not guarantee (`:336`).
- **What P2-2 builds.** P2-2 generates only an image-set catalog (`docs/roadmap.md:31`), which loses SF weight, scale and Dynamic Type.
- **Output home.** The generated enum goes to DSTokens `Symbols.swift` in one report (`docs/research/arch-apple.md:407`) and to `Sources/DSIcons/DSIcon.generated.swift` in the other (`icons-tooling.md:327`). `Package.swift` has no DSIcons target, and `.github/workflows/ci.yml:37` would not catch stale icon codegen.

**G-10 (high). The series-palette validator exists only outside the repository.**

- **Two names.** Phase 4 calls it `tools/viz-validate` (`docs/roadmap.md:55`); dataviz-design calls it `prism-viz-validate` (`docs/research/dataviz-design.md:330`).
- **Where the code is.** The algorithm and the reference hex values live in a bundled skill at an ephemeral path (`dataviz-design.md:24`). The enumeration script `research/enum_palette.mjs` (`:331`) is not in the tree. `docs/research/verification.md:13` calls the numbers "reproducible from the bundled skill", which a fresh session cannot do.
- **Nothing scheduled.** There is no ticket id, no script (`tools/package.json:8-21`), no row in `tools/README.md:5-12` and no CI step.
- **Provenance.** Porting the skill and reusing its hex steps (`dataviz-design.md:211`) is not recorded in `licenses/inventory.json`, as `docs/adr/0015-references-inspiration-only.md:24` requires.

**G-11 (high). The public repository has no licence, yet the packages declare MIT.**

- **The facts.** There is no LICENSE or COPYING file. All three packages declare `"license": "MIT"` (`web/packages/tokens/package.json:24`, `web/packages/react/package.json:24`, `web/packages/charts/package.json:24`). The repository is public (`docs/adr/0018-repository-name-and-visibility.md:17`, `docs/decisions.md:24`).
- **No decision.** No ADR chooses a licence for Prism's code, token and spec data, `docs/research` or the agent skill. `docs/adr/0001-consumers-and-agent-first.md:20` says only that licences stay permissive.
- **The inventory.** It covers third parties only. The `own` value exists (`licenses/inventory.schema.json:29`), but no item uses it.

**G-12 (medium). Hex-only Figma and Tokens Studio exports would flatten 72 translucent colors to opaque.**

- **What ADR-0004 says.** It gives the Figma flavors "6-digit hex" (`docs/adr/0004-dtcg-tokens-style-dictionary.md:26`) and says hex-only consumers are served by the `hex` fallback (`:41`).
- **What the files hold.** The six `sys/color` files contain 72 literals with alpha below 1. Each one's `hex` is the unblended base color. For example, in dark `text.secondary` is white at 0.64 and `bg.surface` is white at 0.06, both with hex `#ffffff` (`tokens/sys/color/dark.tokens.json:12-22`, `:165-176`).
- **Why hex cannot carry it.** DTCG's `hex` is 6-digit (`docs/research/arch-tokens.md:96`). `tools/tokens/README.md:32` covers CSS and Swift only.

**G-13 (medium). `contrast-pairs.json` cannot produce verdicts for several pairs, and it misses one that fails.**

1. **A failing pair is missing.** `text.on-accent-strong` on `bg.fill.accent-strong` is absent from the list (`tokens/contrast-pairs.json:5-44`), though both schemes define it (`tokens/sys/color/light.tokens.json:55-58`, `:130-132`; `dark.tokens.json:73-76`). Dark documents 3.05:1 for white text of at least 18 px (`dark.tokens.json:75`). ADR-0011 allows 3:1 only at 24 px regular or 19 px bold (`docs/adr/0011-accessibility-tiers-ci.md:18`) and forbids unlisted text pairs (`:55`).
2. **No underlay.** Many foregrounds and backgrounds are translucent: dark surface α 0.06, dark raised α 0.09, light raised α 0.7, dark `text.secondary` α 0.64. No pair says what they sit on. The descriptions composite raised directly over the page (`dark.tokens.json:36`), while `ref.opacity.surface.raised` says "+3% white over the parent" (`tokens/ref/opacity.tokens.json:29-31`).
3. **No text-safe zone.** The vivid pair uses `"stops": "text-zone"` (`contrast-pairs.json:44`), but no token declares a text-safe zone (G-01).
4. **An unused threshold.** `thresholds.functionalLarge` (`:3`) is never applied. Only the two decorative pairs carry `minSizePx` (`:13-14`).
5. **Hand-picked coverage.** The list is chosen by hand:
   - nothing on `bg.surface.nested` or `.overlay`;
   - none of the secondary or tertiary tones that Text maps onto vivid, glass and inverse (`spec/components/Text.yaml:104`).

   Yet `docs/decisions.md:17` promises that every semantic text-on-surface pair is checked, and `Text.yaml:116` claims every tone/surface pair is listed.

**G-14 (high). The chart contrast gate skips the lines that carry meaning, cannot express relief, and checks the wrong background.**

- **Unchecked lines.** ADR-0011 requires 3:1 for chart lines that carry meaning (`docs/adr/0011-accessibility-tiers-ci.md:20`). In light, `chart.target` and `chart.comparison` are ink at alpha 0.3 (`tokens/sys/color/light.tokens.json:283-318`). On white that composites to about `#b7b7b8`, a 2.0:1 contrast. The pair list checks only `chart.axis` and series 1–6 (`tokens/contrast-pairs.json:36-42`). `chart.target`, `chart.comparison` and `chart.now` go unchecked, although `docs/adr/0007-dataviz-first-class.md:36` makes the target line mandatory.
- **No relief.** The `boundary` tier is a flat 3:1 (`contrast-pairs.json:3`), while dataviz-design accepts sub-3:1 series if they declare relief (`docs/research/dataviz-design.md:207`, `:330`). Its validated light palette (aqua 2.70, yellow 2.07, magenta 2.58; `:199-202`) would fail the contrast gate, and the seeded palette fails the viz validator (C-10). No palette can pass both gates.
- **Wrong background.** Series are checked against `color.bg.surface`, not `color.chart.plot`, which the marks actually sit on. Dark `chart.plot` is white at 6 % (`tokens/sys/color/dark.tokens.json:457-468`), still translucent, while dataviz asks for an opaque scrim of at least 90 % (`dataviz-design.md:175`, `:339`).

**G-15 (medium). Open questions were not carried into "Verify before implementing", though verification.md says they were.**

`docs/research/verification.md:16` says the open questions from every report are collected in the roadmap, but `docs/roadmap.md:66-88` carries only a few. Missing, with the ticket each one gates:

- Does the Tokens Studio free plan include Themes? (`docs/research/arch-tokens.md:480`) → P1-5, Tokens Studio flavour.
- Which Figma plans get native import, and does it keep aliases? (`:481`) → P1-5, Figma-native flavour.
- watchOS color sets have no light appearance (`:484`) → P1-5.
- Platform as a resolver modifier vs Style Dictionary platform includes (`:486`) → P1-2, P1-3.
- Bold Text needs its own typography modifier (`:487`) → P1-2.
- Which press, release and selection haptics play on each platform (`docs/research/motion-haptics.md:548`) → P3-1.
- Does Tokens Studio keep a transition's `$extensions` on round-trip? (`:550`) → P1-5.
- Does Tailwind v4 have a `--duration-*` namespace? (`:554`) → P1-5.
- licensing-kits open questions 2, 6, 7, 8 and 9 (`docs/research/licensing-kits.md:212`, `:216-219`), including jurisdictions beyond the US and EU → P2-4 and the legal checkpoint.

**G-16 (medium). The build-time brand and platform axes have no route to consumer apps or to watchOS.**

- **Consumer brands.** Brands may live in a consumer's own repository and be built "with the same pipeline" (`brands/README.md:3`, `docs/adr/0002-meta-system-with-brand-layer.md:21`). But `@iiiivaska/prism-tools` is private (`tools/package.json:4`), and brand contexts are listed by hand in the resolver (`tokens/prism.resolver.json:34-40`).
- **Apple.** Swift output is built per brand and per platform, `apple` or `watch` (`tokens/README.md:74`). SPM ships one DSTokens target with one Resources folder for iOS, macOS and watchOS (`Package.swift:34-38`). Nothing says which brand's output is committed or how the watch catalog (`docs/research/arch-tokens.md:351`) gets selected.
- **Watch and light.** The resolver still produces watch × light permutations, though watchOS has no light appearance (`arch-tokens.md:484`).
- **Web** is covered in C-04.

**G-17 (medium). Unit, Dynamic Type and line-height mappings are unspecified.**

- **Units.** Every dimension, including fontSize and letterSpacing, is authored in px (`tokens/ref/typography.tokens.json:38-55`, `tokens/ref/dimension.tokens.json:4-18`). ADR-0011:33 and `docs/decisions.md:14` require rem on the web and Dynamic Type on Apple. Nothing defines which categories become rem, the rem base, or whether letterSpacing becomes em. ADR-0010:28 gives hit sizes in pt while the tokens use px.
- **Text styles.** No role names its `Font.TextStyle`: the roles carry only `slot` and `numeric` (`typography.tokens.json:51-55`). arch-apple expects a `relativeTo:` per role and `@ScaledMetric` spacing (`docs/research/arch-apple.md:404`, `:482`).
- **Line height.** Line heights run from 1.0 to 1.5 (`typography.tokens.json:45`, `:192`). No source names the SwiftUI API for a ratio of 1.0, which is tighter than the font's natural leading.
- **Italic.** Onest has no italic (`docs/research/fonts-facts.md:167`), SwiftUI does not synthesize italic (`arch-apple.md:177`), and browsers do. Emphasis would render upright on Apple and slanted on the web.

**G-18 (medium). Gates promised by ADRs and READMEs have no CI step or ticket, and the seed-script advice would wipe P1-1 edits.**

- **Literal-value guard** (`docs/adr/0004-dtcg-tokens-style-dictionary.md:45`, `tokens/README.md:99`): it now exists in the working tree as `tools/lint/literals.ts` with a `lint:literals` script (`tools/package.json:11`, `package.json:13`). CI (`.github/workflows/ci.yml:13-116`) does not run it, and `tools/README.md:5-12` does not list it.
- **`tokens:diff` bump check** (ADR-0004:27; P1-7, `docs/roadmap.md:23`): the script exists (`tools/package.json:14`), but no CI step runs it.
- **Spec-vs-manifest diff** that rejects implementation-only PRs (`docs/adr/0006-spec-contract-and-parity.md:20`): no ticket, no step.
- **Closed vocabularies** (`tokens/README.md:17`): no lint.
- **Agent guide and skill:** the guide is to be generated from `$extensions` (ADR-0004:28, `docs/research/arch-tokens.md:301`) and the skill regenerated on every release (`docs/adr/0001-consumers-and-agent-first.md:37`). There is no ticket for either, and `agent/SKILL.md` is hand-written.
- **Font and palette checks:** `tools/fonts` (P1-8, `docs/roadmap.md:24`) and `tools/viz-validate` (`:55`) have no script and no step.
- **Lints named in specs and research:** the gallery lint (`spec/components/Card.yaml:135`) and the fixture brand-name lint (`docs/research/licensing-kits.md:201`) have no ticket.
- **`tokens/build.ts`** (`tools/package.json:12`): no ticket creates it; P1-3 creates `resolver.ts`.
- **Blueprint close-out:** deleting research images after the blueprint (`docs/adr/0015-references-inspiration-only.md:20`) and the pending fact-checks (`docs/research/verification.md:16`) have no ticket.
- **Ticket runner:** the roadmap is written for `/execute-ticket` (`docs/roadmap.md:3`, `docs/adr/0017-blueprint-first.md:22`), but the repository's `.claude/` holds only `launch.json`.
- **Seed scripts:** both say to re-run after the visual DNA changes (`tools/tokens/seed-ref-tokens.py:4`, `tools/tokens/seed-sys-tokens.py:4`). `tools/tokens/README.md:10` says a re-run overwrites hand edits, and P1-1 makes hand edits.

**G-19 (medium). The haptics registry has no ADR, schema, cross-check or codegen.**

- **Wrong citation.** `spec/haptics.yaml:1` cites ADR-0003 and "ADR-0009 motion & feedback". ADR-0009 is about materials, and no ADR decides the haptics registry.
- **No schema or check.** The research recommends a JSON-schema'd registry (`docs/research/motion-haptics.md:539`); none exists. Haptic names are checked only against the pattern `^haptic\.` (`spec/component.schema.json:85`), and P2-1 validates only components and patterns (`docs/roadmap.md:30`). Icon ids in spec examples are not cross-checked against the icon registry either (`spec/components/Button.yaml:152-154`).
- **Unmappable entry.** `haptic.selection.limit` maps to two values at once (`spec/haptics.yaml:151`, `:153`), which codegen cannot emit as one mapping.
- **Unrecorded policy.** The web `none` policy (`:2-3`) reverses the research's web mapping without a recorded decision.

**G-20 (medium). The web package homes for the charts manifest, the icon map, spec loading and stories are undefined.**

- **Charts manifest.** The parity contract names only `web/packages/react/src/manifest.ts` and `DSComponents/Manifest.swift` (`docs/adr/0006-spec-contract-and-parity.md:16`, `spec/SCHEMA.md:143-144`). The React file does not exist yet: `web/packages/react/src` holds only `index.ts`. Swift has a DSChartsManifest (`swift/Sources/DSCharts/Manifest.swift:2`); web charts have none, so P2-3 cannot see data-viz on the web.
- **Icon and spec packages.** arch-web proposes `@iiiivaska/prism-icons` and `@iiiivaska/prism-spec` (`docs/research/arch-web.md:234`, `:236`), but ADR-0003:16 and ADR-0014:36 list neither. P2-2's `dsIcons` map has no package (`docs/roadmap.md:31`).
- **Stories.** ADR-0003:26 says the stories are the spec examples, but no ticket generates or checks that mapping.

**G-21 (medium). Parity manifests cannot express per-platform cells, and lag fails on every branch.**

- **One integer per component.** The report prints one cell per spec × platform, across six platforms (`docs/adr/0006-spec-contract-and-parity.md:17`). Each manifest holds one integer per component (`swift/Sources/DSComponents/Manifest.swift:4`), so iOS and watchOS, or web-touch and web-desktop, can never differ.
- **Parsing Swift on Linux.** The parity job runs on ubuntu (`.github/workflows/ci.yml:15`), so it must parse Swift source, in a format nobody has specified.
- **Fail vs warn.** ADR-0006:17 fails lag on `main` and only warns on branches. `ci.yml:45` passes `--fail-on-lag` on every event, pull requests included (`:6`).

**G-22 (medium). Storybook browser tests have no browser install, and Playwright is not pinned to the image.**

- **No browser.** The web job runs the gallery tests (`.github/workflows/ci.yml:64-65`). From P3-4 on, these are Vitest browser-mode tests in Playwright Chromium (`docs/research/arch-web.md:159`), but no step installs a browser. `@vitest/browser-playwright`, a peer of the addon (`arch-web.md:357`), is not in the catalog.
- **Unpinned Playwright.** The VRT image is pinned to v1.63.0 (`ci.yml:78`), but the catalog allows `@playwright/test ^1.63.0` (`pnpm-workspace.yaml:49`), despite its own comment asking to keep the two equal. The image must match the project's Playwright version (`arch-web.md:165`).

**G-23 (medium). Every chart needs a table twin, but Table is desktop-only.**

- **The requirement.** Rule 44 gives every chart a table view (`docs/research/dataviz-design.md:183`). ChartContainer renders the `<table>` twin (`:225`), and the twin is the relief for sub-3:1 series (`:330`). Wave 1 ships a "ChartContainer with table twin" (`docs/roadmap.md:55`).
- **The conflict.** Table is a Tier 2, desktop-only composite (`docs/adr/0010-platform-tiers-density-modality.md:18`, `docs/adr/0012-layers-and-v1-scope.md:19`, `agent/SKILL.md:21`). DSTableView exists only as a row in the research (`dataviz-design.md:231`).

**G-24 (medium). There is no localization contract for the strings Prism itself emits.**

- **Emitted strings.** The specs define English strings that components emit: the loading suffix (`spec/components/Button.yaml:116`), the spoken percent unit (`Text.yaml:113`) and the composed card label (`Card.yaml:149`).
- **Icon labels.** They are i18n keys (`spec/icons/registry.schema.json:68`, `spec/icons/README.md:12`) with no catalog behind them. The research draft had inline English and Russian labels (`docs/research/icons-tooling.md:298`).
- **No mechanism.** `Package.swift:20` sets `defaultLocalization: "en"` with no strings, and the web packages have no i18n mechanism.
- **Russian is required** (`docs/decisions.md:14`), but the roadmap covers only React Aria's own Russian strings and compact number names (`docs/roadmap.md:77`, `:86`).

**G-25 (medium). The Core Text routes for arbitrary weight and `tnum` have no verified path that keeps Dynamic Type.**

- **The routes.** ADR-0008:26 maps weights that are not named instances to the `wght` axis through `kCTFontVariationAttribute`. The only verified `tnum` route is `kCTFontFeatureSettingsAttribute` (`docs/research/fonts-facts.md:176`, `:178`). Both produce a Core Text descriptor.
- **The constraint.** `Font.custom(_:size:relativeTo:)` takes only a PostScript name (`docs/research/arch-apple.md:170`, `fonts-facts.md:174`), and ADR-0011:33 requires Dynamic Type for every role.
- **Not checked.** The roadmap verifies name lookup and `.monospacedDigit()` (`docs/roadmap.md:72-73`), not scaling.

**G-26 (medium). The licence inventory is incomplete, and the gate cannot see unlisted assets.**

- **Missing kits.** `docs/adr/0015-references-inspiration-only.md:23` permits Primer Web, the Polaris UI Kit, the community shadcn and Radix kits and three CC BY glass kits, and rule 2 (`:40`) requires every third-party asset to enter the inventory first. None of them is in `licenses/inventory.json:5-19`, though the research seed list names them (`docs/research/licensing-kits.md:200`).
- **Missing libraries.** The schema covers every library (`licenses/inventory.schema.json:5`). These are absent: react-aria-components, visx, d3-shape, motion and Style Dictionary (`pnpm-workspace.yaml:10-41`), and swift-snapshot-testing (`Package.swift:30`).
- **Self-declared flag.** The P2-4 gate trusts each item's own `packaged` flag (`inventory.schema.json:30`) and never checks what actually ships.
- **Wrong category.** SF Symbols and SF Pro are classed `apple-mockups-only` (`inventory.json:10-11`), a category taken from the Design Resources mock-up licence (`licensing-kits.md:157-158`). Swift code uses them at runtime under the SDK terms.
- **Wrong command.** `THIRD_PARTY_NOTICES.md:3` says to regenerate with `pnpm licenses:notices`, which is not a root script (`package.json:8-18`).

**G-27 (medium). The direction-board sign-off is not a gate before the vertical slice.**

- **What the ADRs say.** ADR-0017 makes the direction board the owner's visual sign-off before any component is implemented twice (`docs/adr/0017-blueprint-first.md:21`, `:35`). ADR-0002 says beauty is proven there (`docs/adr/0002-meta-system-with-brand-layer.md:30`).
- **What the roadmap does.** Phase 3 depends only on Phase 1 and Phase 3 tickets (`docs/roadmap.md:40-47`). The board appears only in P5-1 (`:59`, `:63`).
- **The board is missing.** `docs/direction-board/` does not exist (G-01).

**G-28 (medium). The dependency catalog still misses packages the plan relies on.**

- **Missing packages.** P0-2 pins versions "per arch-web" (`docs/roadmap.md:10`). The catalog (`pnpm-workspace.yaml:8-49`) lacks:
  - `@changesets/cli` (used by `package.json:17`)
  - `@vitest/browser-playwright`
  - `@storybook/addon-docs`
  - `tailwindcss`
  - `@phosphor-icons/core`
  - `d3-array`
  - the other visx packages the chart map uses; arch-web pins all `@visx/*` together (`docs/research/arch-web.md:151`).
- **Phosphor catalog.** `docs/adr/0013-icon-registry.md:21` bundles icons from `@phosphor-icons/core` "at a pinned version", and the validator reads its catalog (`spec/icons/README.md:20`). The catalog lists only `@phosphor-icons/react ^2.1.10` (`pnpm-workspace.yaml:13`), which is a range. Core 2.1.1 and react 2.1.10 differ (`docs/research/icons-tooling.md:33-34`), and nothing checks that they expose the same names.
- **No sources block.** The registry schema has no `sources` block (`spec/icons/registry.schema.json:8`), unlike the research format (`icons-tooling.md:278-281`).

## 2. Where the sources contradict each other

Pipes inside token names are written as "/" or "or" below.

| ID | Claim A (path:line) | Claim B (path:line) | Which should win and why |
|----|---------------------|---------------------|--------------------------|
| C-01 Reduced motion (high) | The `reduced` motion context lists only `reduced.tokens.json` (`tokens/prism.resolver.json:75-80`). That file is a delta without `duration.instant`, `duration.quick`, `spring.interactive` or `spring.smooth` (`tokens/sys/motion/reduced.tokens.json:5-31`, `:32-97`). So 216 of the 432 permutations lack four tokens, and `spec/components/Card.yaml:141` and `Surface.yaml:108` bind `motion.spring.smooth`. The reduced springs set `$value.duration` to 250/250/300 ms with no `settle` (`reduced.tokens.json:36-39`, `:57-60`, `:78-81`); the derived settles are 367/367/441 ms (`docs/research/verification.md:84`). | The colorScheme deltas are layered on their base file (`tokens/prism.resolver.json:53-56`), and the research calls the reduced layer a delta (`docs/research/motion-haptics.md:351`). The build derives `$value.duration` from the settle and CI diffs it (`tokens/README.md:80-87`); the ref springs follow that rule (`tokens/ref/motion.tokens.json:119-140`). Three sources also disagree on what reduced motion is: a 150 ms crossfade (`docs/adr/0011-accessibility-tiers-ci.md:28`), springs of 250–300 ms (`motion-haptics.md:537`, `tokens/README.md:89`), and durations that collapse to 0 (`docs/research/arch-web.md:132`). | **The layered model wins.** List the default file and then the delta, as colorScheme does, and derive `settle` in the build. Write one reduced-motion rule into ADR-0011, because it is the accepted decision; the tokens and arch-web §2.7 follow it. |
| C-02 Group references (high) | A group cannot be referenced; a group's base token is written `{….$root}` (`docs/research/arch-tokens.md:90`, `:93`). | `comp.card.solid.bg` and `comp.surface.solid` alias `{sys.color.bg.surface}` (`tokens/comp/card.tokens.json:8`, `tokens/comp/surface.tokens.json:10`), which is a group with a `$root` (`tokens/sys/color/light.tokens.json:11-15`). The alias resolves in none of the 432 permutations. 18 pairs use `color.bg.surface` (`tokens/contrast-pairs.json:6`, `:9`, …), `spec/components/Surface.yaml:69` binds it, and the spec regex has no `$` (`spec/component.schema.json:138`). `sys.color.accent` (`light.tokens.json:229-233`) and `sys.size.control` (`tokens/sys/density/regular.tokens.json:51-57`) use the same pattern. `arch-tokens.md:300` assumes `.$root` emits without the suffix, which nobody has verified for Style Dictionary 5.5. | **Claim A wins,** because both engines follow the DTCG spec. Before P1-3, either use explicit `.$root` aliases plus a validator that maps a group path to its root, or replace `$root` with leaf tokens. Verify Style Dictionary 5.5's naming of `$root` on a fixture. |
| C-03 Brand contract (high) | A brand writes `ref.*` only (`docs/adr/0004-dtcg-tokens-style-dictionary.md:23`, `tokens/README.md:48`). The brand contract names the overridable paths (`brands/README.md:9-16`). | **Sys whitelist.** A brand may also write four sys aliases (`brands/README.md:17`, ADR-0004:47, `tokens/README.md:101`, `docs/adr/0002-meta-system-with-brand-layer.md:37`). Every colorScheme context writes the same ids (`tokens/sys/color/light.tokens.json:7-10`, `:51-54`; `dark.tokens.json:69-72`), and brand resolves before colorScheme (`tokens/prism.resolver.json:85`, `:88`). So a brand's value is always overwritten, and using the whitelist would also break rule 2 (ADR-0004:46). **Paths that do not exist.** The contract's ref paths are wrong: neutral has 15 steps, not 11 (`tokens/ref/color.palette.tokens.json:6-189`); accent runs to 950 (`:311`); status lives under `ref.color.status.<name>.<use>` and uses `danger` (`:324`, `:425`); the files have eight named gradients, not four numbered ones (`tokens/ref/gradient.tokens.json:5-7`); `ref.font.preset` and `ref.radius.profile` exist nowhere; the brand writes `ref.brand.type-scale` (`brands/prism/brand.tokens.json:4-6`), a path `brands/README.md:19` forbids adding. Font metadata sits in `brands/prism/brand.json:6-10`, which has no schema, though ADR-0008:25 puts versions and hashes in the token source. | **Claim A (ref only) wins.** The resolver can honour it, and one brand context cannot give separate light and dark sys values anyway. If per-scheme brand values are needed, add brand-owned ref roles per scheme that the scheme files alias. Regenerate the brand table from the real paths, and specify radius profile and type scale as build-time math. |
| C-04 Runtime attributes and emitted names (high) | `[data-color-scheme]`, `[data-density]`, `[data-modality]` and `[data-reduced-transparency]`, with brand as a build-time axis (`docs/adr/0004-dtcg-tokens-style-dictionary.md:25`, `tokens/README.md:71`, `docs/research/arch-tokens.md:305-306`, `:391`). | `data-ds-brand/scheme/density/input` with runtime brand switching (`docs/adr/0003-two-implementations-swiftui-react.md:24`, `agent/SKILL.md:68`, `docs/research/arch-web.md:122`, `:126`, `:282`), plus `[data-ds-transparency=reduce]` and `[data-ds-contrast=more]` (`docs/roadmap.md:81`, `arch-web.md:132`). Other names disagree too. Swift accessors: `DSColor.bgAccent` (`tokens/README.md:13`) vs `DS.color.text.primary` (`agent/SKILL.md:12`). The surface variable: `--ds-color-surface` (`README.md:7`) vs `--ds-color-surface-solid` (`docs/adr/0016-name-and-prefix.md:14`), while the token is `sys.color.bg.surface`. React names: `<DSIcon>` and `<DSProvider>` (`agent/SKILL.md:14`, `docs/roadmap.md:43`) vs unprefixed components (ADR-0016:28, ADR-0003:45). | **Neither wins yet.** Record one set in ADR-0004 before P1-5 writes the CSS format. Prefer the `data-ds-*` namespace, which follows the prefix rule (ADR-0016:28), and decide runtime vs build-time brand explicitly (C-03, G-16). Generate the skill's examples from `tokens/README.md`. |
| C-05 Native font preset (high) | Setting the preset to "native" makes the platform layer remap `ref.font.*` (`brands/prism/brand.json:12`, `brands/README.md:14`). The platform modifier applies the Native preset (`tokens/ref/typography.tokens.json:13`, `tokens/README.md:53`). | The prism-native brand context overrides `ref.font.*` with one stack for every platform (`brands/prism-native/brand.tokens.json:6-9`, `tokens/prism.resolver.json:37`), and `tokens/sys/platform/apple.tokens.json:8` describes it that way. The web and Apple platform files alias `ref.font.*` identically (`web.tokens.json:4-15`). So prism-native web CSS lists SF Pro Text first and SF Mono before JetBrains Mono, which Native does not bundle. That contradicts `docs/adr/0008-typography-slots-and-presets.md:24` (Inter and `ui-monospace` on the web) and the SF licence reading (`docs/research/arch-apple.md:330`, `docs/research/fonts-facts.md:225`). On Apple, `arch-apple.md:468` emits `Font.system(style, design:, weight:)`, which uses Apple's text-style sizes (body 17 pt) instead of Prism's roles (body.md 15 px, `typography.tokens.json:208`), against the fixed role scale (ADR-0008:23). | **ADR-0008 wins,** as the accepted decision. The platform modifier owns per-platform native stacks, and SF names never reach web output. Apple renders Native at token sizes with `Font.system(size:weight:design:)`, scaled per role. Encode the SF-to-system-font mapping as a machine-readable extension, and delete the unused mechanisms. |
| C-06 Thin weights (high) | ADR-0008: weights 100–200 appear only in `type.metric.xl` and `type.metric.lg` at 34 pt or more, and resolve to 300 under Bold Text, Increase Contrast or below 24 pt (`docs/adr/0008-typography-slots-and-presets.md:28`). | **Other rules.** ADR-0011 and the decision record: below 300 only for `type.metric.*` at 34 pt or more, resolving to 400 (`docs/adr/0011-accessibility-tiers-ci.md:26`, `docs/decisions.md:17`). `spec/components/Text.yaml:106` resolves to 400 and allows metric-lg. fonts-facts: 48 pt or more, and step every weight by +100 (`docs/research/fonts-facts.md:248-249`). dataviz: Light 300 only at 48 or more, stepping to Regular or Medium (`docs/research/dataviz-design.md:164`), yet DSHeroNumber offers a 34 title size (`:237`). **Tokens.** display.xl may drop to 200 on dark (`tokens/ref/typography.tokens.json:56`); metric.xl says "200 on dark ≥ 32 px" (`:392`), about 24 pt; metric.lg is 32 px (`:394-401`). **No mechanism.** Nothing can apply any of these rules. The scheme and contrast contexts write only sys color, material and shadow (`tokens/sys/color/light-increased-contrast.tokens.json:3-86`), typography is brand-owned `ref.type`, and there is no Bold Text modifier (`tokens/prism.resolver.json:33-82`; `docs/research/arch-tokens.md:487`). | **ADR-0008 wins,** as the typography ADR: 34 pt and a fallback of 300, unless it is amended. ADR-0011, decision #11, Text.yaml, dataviz §3 and the tokens follow it. Before P1-2 fixes the modifier set, add a `legibility` modifier, or sys weight tokens that the scheme and contrast contexts may own. |
| C-07 Figures on metric roles (high) | `type.metric.*` and every data role use tabular figures, and a snapshot asserts equal widths (`docs/adr/0008-typography-slots-and-presets.md:27`, `:47`; `docs/adr/0007-dataviz-first-class.md:37`; `docs/roadmap.md:73`). | `metric.xl` and `metric.lg` are proportional (`tokens/ref/typography.tokens.json:389`, `:411`); only `metric.md` (`:433`) and `data` (`:477`) are tabular. This follows the reference analysis (`docs/research/refs-vexto-incident.md:163`) and dataviz, which lists tabular figures on a hero as an anti-pattern (`docs/research/dataviz-design.md:36`, `:163`). `spec/components/Text.yaml:107` sides with B. | **Claim B wins on the merits:** static heroes are proportional, and live values are tabular through `numeric: tabular`. The alignment argument (`docs/research/fonts-facts.md:120`) applies to values that update. Amend ADR-0008 rule 5 and ADR-0007 rule 3, and scope the equal-width test to the tabular roles. |
| C-08 Spring generation (high) | P1-4 builds the CSS `linear()` string "via Motion's spring()" (`docs/roadmap.md:20`, `tools/tokens/README.md:24`). ADR-0003 and arch-web treat `spring(visualDuration, bounce)` as the same two numbers SwiftUI takes (`docs/adr/0003-two-implementations-swiftui-react.md:29`, `docs/research/arch-web.md:18`, `:209`, `:404`). | Motion's `visualDuration` is Apple's duration divided by 1.2, and Motion clamps the damping (`docs/research/motion-haptics.md:14`, `:118-122`). `toString()` stops at Motion's own 50 ms-grid rest point (snappy 550 ms, against a settle of 487 ms), and the object form needs `keyframes` (`motion-haptics.md:123-131`; `docs/research/verification.md:14`). The research recommends Prism's own sampler (`motion-haptics.md:535`). The settle drives the CSS duration and the 10 ms parity gate (`tokens/README.md:80-87`). | **Claim B wins;** it was fact-checked on 2026-09-14. Use Prism's own sampler, or `generateLinearEasing` over a physics generator run to Prism's settle. Update P1-4, `tools/tokens/README.md:24`, ADR-0003:29 and arch-web. |
| C-09 Which tokens specs bind (high) | Components bind only component tokens, with no tier skipping (`docs/adr/0002-meta-system-with-brand-layer.md:19`, `:36`). | Specs bind `sys.*` or `comp.*` (`spec/SCHEMA.md:90`, `tokens/README.md:13`, `spec/component.schema.json:138`). Text binds only sys paths, though `comp.text.*` exists (`spec/components/Text.yaml:60-100`, `tokens/comp/text.tokens.json:4-21`). Surface binds sys paths, though `comp.surface.*` exists (`Surface.yaml:65-96`, `tokens/comp/surface.tokens.json:4-26`). Button mixes both (`Button.yaml:94-107`). | **Decide by amending ADR-0002.** The ADR formally wins (`docs/decisions.md:3`), but taken literally it turns every sys binding into a comp duplicate. For example, require comp tokens only where a component re-maps a role. Then align SCHEMA.md, the README, the regex and the specs, and make P2-1 enforce the rule. |
| C-10 Chart series palette (high) | `color.chart.series.1…8`, validated in CI (`docs/adr/0007-dataviz-first-class.md:18`, `tokens/README.md:30`). dataviz §4 validates an orange-first set of eight slots (`docs/research/dataviz-design.md:168`, `:194-205`). | **Six slots, other values.** The comp and sys files and the pairs stop at 6 (`tokens/comp/chart.tokens.json:6-25`, `tokens/sys/color/light.tokens.json:263-282`, `dark.tokens.json:350-369`, `tokens/contrast-pairs.json:37-42`). Slot 1 is ink in light and white in dark (`tokens/ref/color.palette.tokens.json:576-586`, `:650-660`). **Out of band.** Dark slots 2, 4, 5 and 6 have lightness 0.75–0.82, outside the 0.48–0.67 band (`dataviz-design.md:30`). Light slot 4 (C 0.098) and dark slot 6 (C 0.095) are below C 0.10 (`color.palette.tokens.json:612-623`, `:710-720`). **Collision.** `chart.now` is accent.500, the same color as dark series 2 (`light.tokens.json:347-348`, `dark.tokens.json:442-443`, `color.palette.tokens.json:251-260`). | **ADR-0007 wins** on the slot count, as the accepted decision. Decide whether slot 1 may be neutral. Then either reseed from §4, or run the validator on the seeded values and record the result. Add a check that `chart.now` differs from every series slot. |
| C-11 Dash grammar (high) | `stroke.grid` is dashed `[4px, 6px]`, "never solid, never vertical", and `stroke.target` is `[8px, 6px]` with a round cap (`tokens/sys/base.tokens.json:180-213`). | Gridlines are a 1 px solid hairline and never dashed, so a dash keeps one meaning; the target dash is `[4,4]` (`docs/research/dataviz-design.md:32`, `:36`, `:129`, `:140`, `:286`; `docs/research/arch-web.md:150`). ADR-0007 makes dashed mean "target" (`docs/adr/0007-dataviz-first-class.md:36`), but also allows dashes to tell series apart (`:20`). | **Claim B wins:** dashes are reserved for target, threshold and projection, which ADR-0007 rule 2 depends on. Record one dash grammar in ADR-0007, let series differ by marker, and realign `base.tokens.json`. |
| C-12 Data-viz v1 scope (high) | **The ADR set.** Wave 1 is StatTile, Sparkline, RingGauge and Line/Area with a target line (`docs/decisions.md:13`). ADR-0007 adds the range band and defers DeltaIndicator, Legend, ChartTooltip and ArcGauge (`docs/adr/0007-dataviz-first-class.md:19`). ADR-0012's inventory is also the parity report's row list, and it has no HeroNumber, ChartContainer, ReferenceLine or RangeBand (`docs/adr/0012-layers-and-v1-scope.md:20`, `:23`, `:36`). The skill repeats the ADRs (`agent/SKILL.md:22`) and forbids anything outside its inventory (`:13`). | **The roadmap.** Wave 1 starts with HeroNumber and DeltaBadge and includes ChartContainer, ReferenceLine and RangeBand (`docs/roadmap.md:55`, taken from `docs/research/dataviz-design.md:237-243`, `:333`). **Names.** DeltaIndicator vs DeltaBadge. ArcGauge as a component vs RingGauge `style: open270` (`dataviz-design.md:243`). dataviz uses DS-prefixed React names (`:217`), against ADR-0003:45. **Legend and tooltip.** A LineChart with two or more series needs a legend (`:142`), but Legend and ChartTooltip are v1.1. **Hero recipe.** Text dims with `color.text.dimmed` and sets the unit in `type.metric.unit` (`spec/components/Text.yaml:97-100`); ADR-0007:37 and `agent/SKILL.md:35` use `color.text.tertiary` and `type.caption`. | **Amend ADR-0007 and ADR-0012.** The ADRs are the record, but the roadmap reflects the later research. Write one wave-1 list: include Legend, Tooltip, ReferenceLine, RangeBand and ChartContainer, or declare them internal parts. Settle the names and the hero recipe, then update decision #7, the skill and the roadmap. |
| C-13 Generated output paths (high) | P1-5 commits web output under `web/packages/tokens/src/generated`, and Swift output under `DSTokens/Generated` plus `Resources/Colors.xcassets` (`docs/roadmap.md:21`). The new literal guard excludes `web/packages/*/src/generated` (`tools/lint/literals.ts:36-39`). | **CI.** CI diffs only `web/packages/tokens/dist-src` and `DSTokens/Generated`, skipping `Resources` (`.github/workflows/ci.yml:36-37`). `git diff --exit-code` also ignores untracked files, so output that was never committed passes. **Research layouts.** arch-tokens puts everything in a gitignored `dist/` (`docs/research/arch-tokens.md:350`), and arch-web uses `web/packages/tokens-css/dist` (`docs/research/arch-web.md:223`). **Git.** `.gitignore:10` ignores every `dist/`, while ADR-0004:27 and ADR-0014:48 commit the outputs. | **Claim A wins:** it is the newest source and matches the lint. Make `ci.yml` diff exactly those paths, including `Resources`, and use `git status --porcelain` so untracked output fails. Mark the arch-tokens §7.2 and arch-web layouts as superseded. |
| C-14 Package exports (high) | Consumers import `@iiiivaska/prism-tokens/tailwind.css`, `tokens.css` and `@iiiivaska/prism-react/styles.css` (`agent/SKILL.md:63-68`, `docs/adr/0003-two-implementations-swiftui-react.md:24`, `docs/research/arch-web.md:273-278`). P3-2 promises tokens.css, tailwind.css, tokens.ts and motion.css (`docs/roadmap.md:43`). arch-web recommends per-component subpaths (`arch-web.md:232`, `:255-256`, `:403`). | Each package exports only `.` and `./package.json` (`web/packages/tokens/package.json:8`, `react/package.json:8`, `charts/package.json:8`), so Node and Vite refuse the documented subpaths. `files` lists a `spec` folder (`:9` in each), and `agent/SKILL.md:8` sends agents to `node_modules/@iiiivaska/prism-react/spec/` and to the SPM package's `Spec/` resources. No ticket copies the specs, and `Package.swift:33-58` declares no Spec resources. | **Claim A wins:** it is the documented consumer contract. Add the CSS and per-component subpaths and a `style` field to P3-2's acceptance. Add a ticket that ships `spec/` in the packages, or drop it from `files` and the skill. |
| C-15 Version authority (high) | `VERSION` is the only place the number lives; the release workflow stamps it into the package.json files, the Package.swift comments, the registries and the skill (`docs/adr/0014-monorepo-and-distribution.md:37`, `docs/adr/0006-spec-contract-and-parity.md:19`, `spec/SCHEMA.md:172`). | **Changesets.** The release script runs `changeset version` (`package.json:17`), which computes versions inside package.json and never touches `VERSION` (fixed group, `.changeset/config.json:5`). The private root package holds a third copy (`package.json:4`). `changeset version` exits 1 when no changesets are pending (`docs/research/arch-web.md:184`), which is the state right after a version PR, so publish never runs. `@changesets/cli` is not installed anywhere. **No workflow.** `.github/workflows/` holds only `ci.yml`, and no ticket creates a release workflow. DSTokens hard-codes 0.1.0, and a test asserts it (`swift/Sources/DSTokens/DSTokens.swift:4`, `swift/Tests/DSTokensTests/PlaceholderTests.swift:6`). **Version plan.** The token-diff policy classes a removal as major (`docs/roadmap.md:23`, `tokens/README.md:103`), which takes 0.x straight to 1.0.0 and breaks the plan "0.1.0 until Phase 3; 0.2.0 closes Phase 5" (`docs/roadmap.md:3`). Phase 5 starts 1–2 days into Phase 4 (`:59`), and the v1 scope (`docs/adr/0012-layers-and-v1-scope.md:23`) maps to no version. | **Choose one authority in ADR-0014.** Recommended: Changesets computes the number, and a script writes it to `VERSION`, the Swift constant and the skill. That keeps ADR-0006's one-version intent. Add a 0.x bump policy (a major bump becomes a minor while below 1.0) and a release-workflow ticket. |
| C-16 P3-6 release dry run (high) | P3-6 tags SPM and publishes to GitHub Packages "to a test scope" at the end of Phase 3 (`docs/roadmap.md:47`). | **Gates.** The legal checkpoint gates the first package release (`docs/adr/0018-repository-name-and-visibility.md:27`), and a reference-distance review precedes every release (`docs/adr/0015-references-inspiration-only.md:22`). The only review ticket is P5-2 (`docs/roadmap.md:64`), and the legal checkpoint names no ticket (`:88`), though `:68` says each verify item is a checkbox in a ticket. In a public repository, an SPM tag is a public release. **Scope.** GitHub Packages requires the scope to equal the owner (`docs/adr/0014-monorepo-and-distribution.md:9`, `docs/research/arch-web.md:185`), so a test scope cannot exist. **Visibility.** ADR-0018:28 leaves the package-visibility decision to P3-6, which never mentions it, while the packages and Changesets are hard-coded to `restricted` (`web/packages/*/package.json:22`, `.changeset/config.json:7`, `package.json:17`). | **Claim B wins:** it rests on accepted ADRs. Rewrite P3-6 around a pre-release dist-tag or a fork, with checkboxes for the legal checkpoint, the reference-distance review and the visibility decision, or move P3-6 after P5-2. |
| C-17 CI in Phase 0 (high) | P0-1 expects the first CI run to be green on the placeholder jobs (`docs/roadmap.md:9`). | `ci.yml` has no placeholders. The contracts job calls scripts whose files do not exist (`tools/package.json:12-20`: tokens/build.ts, spec/validate.ts, icons/validate.ts, contrast/check.ts, parity/report.ts, licenses/check.ts; `.github/workflows/ci.yml:31-45`), and `tools/icons-apple` does not exist (`ci.yml:104`). The web and web-vrt jobs need the contracts job (`ci.yml:54`, `:76`). The missing lockfile is already fixed in the working tree: `pnpm-lock.yaml` exists, untracked. | **Claim B is the fact.** Align P0-1's acceptance with it: guard each step until its tool lands (`if: hashFiles(...)`), or turn the jobs into explicit placeholders. |
| C-18 Density and modality defaults (medium) | ADR-0010: defaults per tier (compact on desktop, regular on touch, comfortable on the watch), and density changes `size.control.*`, `size.hit.*` and row heights (`docs/adr/0010-platform-tiers-density-modality.md:18`, `:27`). All four specs declare three densities (for example `spec/components/Button.yaml:18`). Density owns `sys.size.*` and type sizes (`tokens/README.md:50`). | **Defaults.** DTCG allows one default per modifier (`docs/research/arch-tokens.md:97`). Prism's are regular, pointer and web (`tokens/prism.resolver.json:47`, `:66`, `:73`), and `:root` is the default permutation (`arch-tokens.md:305`), so desktop web ships regular density with pointer modality, a pairing no tier uses. **Reach.** Density writes only `size.control.$root` and `size.row` (`tokens/sys/density/regular.tokens.json:43-59`), and nothing uses either. `comp.button.height` aliases base tokens that do not vary (`tokens/comp/button.tokens.json:72-83`, `tokens/sys/base.tokens.json:103-113`), and `size.hit` lives in modality (`tokens/sys/modality/pointer.tokens.json:4-8`). **macOS sizes.** macOS compact height is 32 pt in `Button.yaml:168` and 28 pt in `spec/SCHEMA.md:164`. `Text.yaml:148` makes density the macOS size lever, but no density type sizes exist. **Result.** P3-3's regular/compact snapshot pairs (`docs/roadmap.md:44`) would be identical for Button, Text and Surface. | **ADR-0010 wins.** Specify per-platform default contexts in ADR-0004 and the P1-3 driver, including which permutation becomes the web `:root`. Route `comp.button.height` and the type sizes through density-owned tokens. |
| C-19 Token naming vocabulary (medium) | The README's closed vocabularies and examples (`tokens/README.md:17-22`, `:26-39`): three durations, three springs and two easings (`:36`); `material.glass.regular/clear/tinted` (`:37`); `chart.series.1…8` (`:30`); `space.0…12` on a 4 pt base (`:32`); `radius.0…5` (`:33`); the example `sys.color.bg.accent` (`:13`, `docs/adr/0004-dtcg-tokens-style-dictionary.md:22`); the role `critical` (`:20`). | The same README (`:89`) and the files have six durations, five springs and five easings. Materials are dark and light × fill and chip, plus cell and scrim. There are six series; the spacing scale runs 0…13 with `space.2` = 6 px (`tokens/ref/dimension.tokens.json:4-18`); the radius roles run from control to hero (`tokens/sys/base.tokens.json:49-86`). The roles tint, on-inverse, on-accent-strong, on-glass and on-badge exist (`tokens/sys/color/light.tokens.json:78`, `:123-141`). The token is `bg.fill.accent`, and ref uses `danger` (`tokens/ref/color.palette.tokens.json:425`). `agent/SKILL.md:75` sends agents to this README for token names. | **Claim B wins:** the files are what the build reads. Regenerate the README examples from the token files, add a CI check that every example path resolves, then extend or enforce the vocabularies. |
| C-20 JetBrains Mono and the `tnum` gate (high) | A brand build fails if a bundled font lacks `tnum` (`docs/adr/0008-typography-slots-and-presets.md:48`, `brands/README.md:41`). P1-8 expects "font check passes" (`docs/roadmap.md:24`). | **The dumped font.** The only JetBrains Mono in the dump is v2.211, with `has_tnum: false` and tabular digits by default (`docs/research/fonts/fonts-analysis.json:918`, `:952`, `:954`). Monospaced fonts need no `tnum` (`docs/research/fonts-facts.md:198`). **The pinned version.** v2.304 (`brands/prism/brand.json:9`, `licenses/inventory.json:7`, ADR-0008:18) was never dumped, though `fonts-facts.md:4` says the JSON covers every binary inspected, so its 122 codepoints (`:212`) are unbacked. **The bundled file.** The file now in `brands/prism/fonts/jetbrains-mono/` reports "Version 2.211" in its name table (checked 2026-09-14). **Missing tools.** The Core Text scripts named at `fonts-facts.md:233`, `:234` and `:238` are not in the repository, and `tools/fonts` is absent from `tools/README.md:5-12` and `tools/package.json`. | **Neither, as written.** Define the gate as "`tnum` present, or all digit advances equal". Bundle the pinned 2.304, or re-pin 2.211 and re-verify its Cyrillic. Dump the bundled file into `fonts-analysis.json`, commit the check scripts, and add a `fonts:check` script and CI step. |
| C-21 SF Symbols availability (medium) | The deployment floor is 26.0 (`Package.swift:21`), and every symbol must be available at iOS 26 (`spec/icons/registry.schema.json:99`). | **Gate.** The planned gate accepts year ≤ 2025.x plus point releases (`docs/research/icons-tooling.md:152`, `:324`). Key 2025.1 maps to OS 26.1 (`icons-tooling.md:80`; re-checked on macOS 26.6.2, where 2025.1 → 26.1 is still the newest key), so the gate admits names that 26.0 devices lack. **SF Symbols 8.** Three rules: allowed with `minOS` plus `fallback` (`spec/icons/README.md:13`, `registry.schema.json:101-102`), rejected unless a fallback is declared (`docs/adr/0013-icon-registry.md:35`), and rejected outright (`docs/roadmap.md:84`). **Runner.** The validator reads the runner's own plist (`.github/workflows/ci.yml:97`), which has no 2026 names, so a `minOS: 27` entry fails as unknown until the runner itself is macOS 27. | **Gate on OS ≤ 26.0,** meaning the exact key 2025. Adopt ADR-0013's "unless a fallback is declared" as the single SF Symbols 8 policy: validate the fallback, and mark the primary as unverifiable on 26 runners. |
| C-22 `icon.search` (medium) | Agents use `icon.search`, and product icons use one open set bundled everywhere (`docs/decisions.md:19`). | Agents use registry ids, and Apple uses an SF Symbol wherever one exists, with Phosphor only when nothing fits (`docs/adr/0013-icon-registry.md:20-22`). The registry binds even product icons such as `object.bus` to SF Symbols (`spec/icons/registry.json:67`), and `spec/icons/README.md:14` splits by "must look identical everywhere". `icon.search` appears nowhere else: not in `agent/SKILL.md:14`, `spec/icons/README.md`, `tools/` or P2-2. | **ADR-0013 wins** (`docs/decisions.md:3`). Correct decision #13, or amend the ADR. Either specify `icon.search` as a tag and category search in `agent/`, or delete it. |
| C-23 Icon weight and size (medium) | `icon.weight` is a name from thin to heavy (`docs/adr/0013-icon-registry.md:23`, `spec/icons/README.md:8`), and the registry maps medium to Phosphor regular (`spec/icons/registry.json:8`, `README.md:31`). | **Numbers, not names.** The token is numeric: `sys.icon.weight` is 400 and `weight-display` is 200 (`tokens/sys/base.tokens.json:139-147`), with no number-to-name table. 200 would be SF thin, which no key maps to (thin → ultralight). **Medium and Bold Text.** The research maps medium to Phosphor bold (`docs/research/icons-tooling.md:255`, `:286`). Its Bold Text rule of "+1 step" (`:260`) then turns regular into medium, which under the registry changes nothing on the web while SF gets heavier. **Size.** `size.icon.*` are px boxes (`tokens/ref/dimension.tokens.json:212-243`; `spec/components/Button.yaml:105`). SF Symbols are sized by point size and scale and follow Dynamic Type; template images do neither. No box-to-point mapping exists (`icons-tooling.md:333` covers stroke only). | **The registry wins:** it is the contract CI validates. Make `icon.weight` a named token or publish the number-to-name table, pick one mapping for medium, define Bold Text for icons so the glyph changes on both stacks, and add a measured SF point size per box. |
| C-24 Registry rules (medium) | `rtlMirror: true` flips the glyph on both stacks (`spec/icons/README.md:15`); every entry has tags (`:12`); the registry exists to stop metaphors drifting (`docs/adr/0013-icon-registry.md:28`). | nav.back and nav.forward set `rtlMirror` on chevron.backward and chevron.forward (`spec/icons/registry.json:18-19`), which SF already mirrors (`docs/research/icons-tooling.md:325`), so Apple would flip them twice. nav.open (`:22`) does need the flip, and one boolean cannot express both. zoom-in and zoom-out use the web plus and minus glyphs (`:40-41`), the same as add and remove (`:29-30`), while Apple uses magnifier glyphs. Most entries have no tags, and the schema does not require them (`spec/icons/registry.schema.json:66`). | **Claim A wins,** as the intent. Make `rtlMirror` per platform, or define it as "auto" for backward/forward symbols on Apple. Bind zoom to Phosphor magnifier variants. Require tags, or drop the rule. |
| C-25 Snapshots (medium) | Pairs live at `gallery/snapshots/<Name>/<id>.<platform>.<scheme>.png` (`docs/adr/0006-spec-contract-and-parity.md:18`, `spec/SCHEMA.md:156`, P3-5 `docs/roadmap.md:46`). | **Naming.** arch-apple uses `__Snapshots__/<Component>/<variant>@<scale>.png` (`docs/research/arch-apple.md:431`) and `<Component>/<variant-id>.png` (`:496`). `Package.swift:81` excludes `__Snapshots__`. CI uploads `gallery/snapshots/**/*.apple.*.png` (`.github/workflows/ci.yml:116`), but `apple` is not a platform key (`spec/SCHEMA.md:22-28`). Playwright names baselines `…-chromium-linux.png` next to the tests (`docs/research/arch-web.md:165`). **Axes.** The template has no density, contrast or viewport segment, though web renders scheme × density × viewport (`docs/adr/0003-two-implementations-swiftui-react.md:27`, `ci.yml:87`) and P3-3 renders light/dark × regular/compact × Increase Contrast (`docs/roadmap.md:44`). The schemes enum is light and dark only (`spec/component.schema.json:32`). **Gallery.** `gallery/` is empty and untracked, so the scaffold (`docs/adr/0017-blueprint-first.md:19`) and `agent/SKILL.md:76` point at nothing in a clone. No ticket moves renders into it. **Watch and matrix.** No watchOS snapshot target exists (`arch-apple.md:430`, `docs/roadmap.md:57`; `Package.swift:72-83`). P3-3 omits comfortable density (ADR-0010:27), Dynamic Type sizes and forced Reduce Transparency (`arch-apple.md:493`). | **Claim A wins on location,** with an extended template such as `<id>.<platform>.<scheme>.<density>[.<variant>].png`. Set Playwright's snapshot path template and a Swift naming strategy to match. Add a collection step, a watchOS snapshot ticket and a tracked `gallery/README.md`. |
| C-26 Accessibility contract (medium) | The schema rejects specs without Reduce Transparency and Reduce Motion behaviour (`docs/adr/0011-accessibility-tiers-ci.md:37`), and components on glass declare their fallback (`docs/adr/0009-materials-in-layers.md:46`). Under Reduce Transparency glass becomes `surface.solid` (`docs/adr/0011-accessibility-tiers-ci.md:27`, `docs/decisions.md:17`). | The schema requires only role, label, keyboard, dynamicType and contrast (`spec/component.schema.json:89`). The fallback is `raised` in `docs/adr/0009-materials-in-layers.md:28` and `spec/components/Surface.yaml:100`, `:117`, and `solid.raised` in `spec/components/Card.yaml:131`, `:154`. On the watch, glass becomes solid (ADR-0009:26, `Surface.yaml:101`) or `surface.raised` (`tokens/sys/platform/watch.tokens.json:9`). | **ADR-0011 wins on the schema:** make `reduceTransparency` and `reduceMotion` required. For the material, choose one by amendment. `raised` is the reasoned choice (ADR-0009:28, followed by Surface and Card); then fix decision #11 and the watch token. **Resolved 2026-09-15 by ADR-0022**: one fallback, opaque raised over the page; the schema requires both keys (P2-1). |
| C-27 Brand overrides for series and status (medium) | A brand may override the status ramps, and paths not listed, including series, stay fixed (`brands/README.md:11`, `:19`). | Status is a fixed scale and never themed (`docs/research/dataviz-design.md:172`, `:283`). Series slots snap to the brand ramp and are re-validated per brand (`:211`; open question at `:346`). `chart.now` is accent.500 (`tokens/sys/color/light.tokens.json:347-348`), so a new brand accent can collide with a fixed series slot, and nothing re-validates. | **dataviz wins,** as the only source with a chart-specific reason, provided ADR-0002 and ADR-0007 record it. Series become brand-overridable with per-brand validation. Chart status stays fixed, or is explicitly bound to the brand's status ramps. |
| C-28 Chart token names and values (medium) | `chart.target.dash`, `chart.band.alpha` and `chart.grid.alpha` (`docs/adr/0007-dataviz-first-class.md:18`, `tokens/README.md:39`). dataviz §6 lists the tokens wave 1 needs (`docs/research/dataviz-design.md:274-322`). | **Names.** The tree has `sys.stroke.target` and `sys.stroke.grid` (`tokens/sys/base.tokens.json:180-213`), with the alphas baked into `color.chart.*` (`tokens/sys/color/light.tokens.json:283-342`). The spec regex rejects `stroke` (`spec/component.schema.json:138`), so no spec can bind the dashes. **Unused alphas.** `ref.opacity.chart.*` (`tokens/ref/opacity.tokens.json:68-80`: 0.06/0.12/0.4/0.6) is referenced by nothing, while light sys uses 0.05/0.1/0.3/0.3. **Missing tokens.** Most §6 tokens do not exist, and no ticket creates them: Phase 1 only reviews seeds (`docs/roadmap.md:17-18`), and wave 1 has no token ticket (`:55`). **Values.** endpoint-size is 10 (`base.tokens.json:167-169`), against 6/8 in `dataviz-design.md:148`; the pointer hit target is 24 (`:181`, `:246`), against 28 (`docs/adr/0010-platform-tiers-density-modality.md:28`). | **ADR-0007's names win, with dataviz §6's values;** where they conflict with ADR-0010 (28 pt pointer), the accepted ADR wins. Add a Phase 4 "chart tokens from dataviz §6" ticket with a name map, add `stroke` to the regex, and wire or delete `ref.opacity.chart.*`. |
| C-29 Spec rules vs ADR-0011 and patterns (low) | Nothing truncates a label to keep a fixed height (`docs/adr/0011-accessibility-tiers-ci.md:33`). Vivid cards come in even counts, 2 or 4 (`spec/patterns/README.md:26`). | Button labels never wrap and truncate (`spec/components/Button.yaml:118`), yet wrap to two lines at AX3 (`:134`). Card and Surface allow one vivid card in six, or one hero card (`spec/components/Card.yaml:135`, `:160`; `spec/components/Surface.yaml:122`). | **ADR-0011 wins** (`docs/decisions.md:3`). Fix Button's behavior, and pick one rule for vivid counts before P3-3. |
| C-30 SF names outside `swift/` (low) | No SF Symbol name outside `swift/` (`docs/adr/0013-icon-registry.md:40`), and none in the web package or docs (`spec/icons/README.md:16`, `licenses/inventory.json:10`). | The registry that holds the SF names lives in `spec/` (ADR-0013:20; for example `spec/icons/registry.json:18`), `docs/research` already contains SF names, and every npm package ships a `spec` folder (`web/packages/react/package.json:9`). Copying the registry as-is would put SF names into npm. | **Reword rule 1** to cover `spec/icons`, and strip the `apple` bindings from any npm copy of the registry. |
| C-31 Compact numbers (low) | 1,284 / 12.9K / 4.2M (`docs/research/dataviz-design.md:161`). | The prescribed `Intl.NumberFormat({notation:"compact", maximumSignificantDigits:3})` (`:161`, `:266`) returns 1.28K / 12.9K / 4.21M in English, and the Russian locale also compacts 1,284 (Node 24.21). No threshold is specified, and both stacks must agree for HeroNumber and StatTile parity. | **Neither wins.** Add a compaction threshold (for example, compact from 10,000) and a rounding rule to the HeroNumber spec, with shared English and Russian fixtures. |

## 3. Stale references

**S-01 (high). The CI Apple job calls schemes and paths that do not exist.**

- **Schemes.** `xcodebuild -scheme Prism` and `-scheme DSSnapshots` (`.github/workflows/ci.yml:109-110`, `:112`). `xcodebuild -list` on a copy of the package (Xcode 26.6, 17F113) lists DSCharts, DSComponents, DSCore, DSTokens and Prism-Package. No product is named Prism (`Package.swift:22-27`), and test targets get no scheme of their own (`:73-74`). `docs/research/arch-apple.md:493` makes the same mistake with `-scheme DSSnapshotTests`.
- **Registry path.** `swift run --package-path tools/icons-apple icons-validate ../../spec/icons/registry.json` (`ci.yml:104`): `swift run --package-path` keeps the caller's working directory, so the path points two levels above the repository. `tools/icons-apple` does not exist.
- **Host tests.** `swift test` on the macOS host (`ci.yml:106`) also runs DSSnapshotTests, which is marked simulator-only (`Package.swift:72`). The SwiftUI snapshot strategy is iOS/tvOS only (`arch-apple.md:279`), so P3-3's snapshot code will not compile on the host unless it is guarded.
- **Xcode version.** CI selects `Xcode_26.app` (`ci.yml:102`), which pins no version. P0-3 and ADR-0003 pin 26.4 (`docs/roadmap.md:11`, `docs/adr/0003-two-implementations-swiftui-react.md:11`, `:17`; `arch-apple.md:18`, `:21`), while research from the same day ran Xcode 26.6 (`docs/research/icons-tooling.md:3`, `:153`) and Swift 6.3.3 (`docs/research/fonts-facts.md:12`). P0-3 promises only to swap placeholder script names (`docs/roadmap.md:11`).

**S-02 (low). Stale paths in the ADRs, the decision record and the tool docs.**

| Location | Says | Actually |
|----------|------|----------|
| `docs/adr/0010-platform-tiers-density-modality.md:30` | `tokens/platform/apple/web/watch` | `tokens/sys/platform/` |
| `docs/adr/0011-accessibility-tiers-ci.md:51` | `tokens/scheme/*/contrast-high.json` | `tokens/sys/color/*-increased-contrast.tokens.json` |
| `docs/adr/0004-dtcg-tokens-style-dictionary.md:5` | decision #4 reads "Style Dictionary v4" | `docs/decisions.md:10` already says Style Dictionary 5 |
| `docs/adr/0014-monorepo-and-distribution.md:25` | prism-gallery under `web/packages/` | `web/apps/gallery`; `web/apps/vrt` is not listed |
| `docs/decisions.md:29` | Signature typeface deferred | chosen: Onest (`docs/adr/0008-typography-slots-and-presets.md:25`) |
| `spec/haptics.yaml:1` | "ADR-0009 motion & feedback" | ADR-0009 is materials; no haptics ADR exists (G-19) |
| `tools/tokens/README.md:12` | CI step `tokens:validate` | no such script (`tools/package.json:8-21`); CI inlines ajv-cli (`.github/workflows/ci.yml:24-29`) |
| `tools/README.md:3` | Node ≥ 22.12; nothing implemented | `tools/package.json:7` requires Node ≥ 24; `tools/lint/literals.ts` exists |
| `brands/prism/brand.json:7-9`, `:12` | `fonts/Onest[wght].ttf`; files not committed until P1-8 | files are in `brands/prism/fonts/onest/` and `brands/prism/fonts/jetbrains-mono/` (working tree) |

**S-03 (low). Research reports use superseded names and layouts.**

- The extension is named `dev.prism.spring` (`docs/research/motion-haptics.md:16`, `:195-215`, `:225`, `:533`); the files use `app.prism.spring` (`tokens/ref/motion.tokens.json:108`).
- Motion modes are `full` and `reduced` (`motion-haptics.md:351`, `:537`); the resolver uses `default` and `reduced` (`tokens/prism.resolver.json:77-78`).
- The haptics registry is proposed as `haptics.registry.json` with a prism.dev `$schema` (`motion-haptics.md:406-410`); the registry is `spec/haptics.yaml`.
- The arch-tokens §7.2 layout shows `tokens/brands/default`, a `build/` folder and a gitignored `dist/` (`docs/research/arch-tokens.md:339-350`); the repository has `brands/`, `tools/` and committed outputs.
- Xcode 27 is described as "Apple-silicon only" (`docs/research/arch-apple.md:19`, `:519`); `docs/research/verification.md:10` refutes it.
- The `interactive` spring is described as "Apple interactiveSpring defaults" (`tokens/ref/motion.tokens.json:117`, `tools/tokens/seed-ref-tokens.py:160`); refuted in `docs/research/verification.md:45` and listed as a follow-up at `:83`.
- The package is called `@iiiivaska/prism-tokens-css` (`docs/research/arch-web.md:122`, `:273-278`); it is `@iiiivaska/prism-tokens` (`web/packages/tokens/package.json:2`).

## 4. Claims implementation relies on that are still unverified

Fact-check status lives in [verification.md](verification.md) (`docs/research/verification.md:7-14`). arch-web, icons-tooling, arch-tokens and arch-apple were checked on 2026-09-08, and motion-haptics on 2026-09-14. fonts, licensing-kits and dataviz-design are still pending (`:11-13`). Other items above also rest on unverified claims:

- C-02: how Style Dictionary 5.5 names `$root` tokens.
- C-21: the SF Symbols availability plist on the CI runner.
- G-25: Core Text descriptors under Dynamic Type.
- R-03: whether an alternative Swift build system compiles asset catalogs.

**U-01 (high). The CI step that validates tokens against the DTCG schemas.**

- **The command.** CI and `tools/tokens/README.md` run `ajv-cli@5 --spec=draft7 -s https://…/format.json` (`.github/workflows/ci.yml:24-29`, `tools/tokens/README.md:14-19`).
- **What is unverified:**
  - whether ajv-cli accepts a URL for `-s` (its documented input is a local file, and `$ref` targets come from `-r` files);
  - whether the published schemas are draft-07;
  - which sub-schemas they `$ref`.

  The research only checked that the URLs return HTTP 200 (`docs/research/arch-tokens.md:98`).
- **Why it matters.** The step fetches the schemas on every run. "Schema-valid" has already passed 22 untyped tokens (G-04), and the P1-1 and P1-2 acceptances rest on it (`docs/roadmap.md:17-18`).
- **Formats.** `licenses/inventory.schema.json` uses the formats `date` and `uri` (`:11`, `:26-27`). Ajv 8 rejects unknown formats at compile time unless ajv-formats is registered, and the catalog does not have it (`pnpm-workspace.yaml:40`).

**U-02 (medium). Modifier orthogonality, and what `tz lint` actually checks.**

- **Ids are disjoint; types are not.** Flattening all 432 permutations finds no token id written by two modifiers. The types overlap, though:
  - brand and platform both write fontFamily and number;
  - density and modality both write dimension and number;
  - motion writes number.

  ADR-0004 and arch-tokens rely on one modifier per `$type` family (`docs/adr/0004-dtcg-tokens-style-dictionary.md:23`, `docs/research/arch-tokens.md:209`, `:288`).
- **Paths overlap.** Platform writes `sys.material.blur.enabled` (`tokens/sys/platform/watch.tokens.json:4-10`), though ADR-0004:23 gives `sys.material.*` to colorScheme. Modality writes `sys.size.hit` (`tokens/sys/modality/pointer.tokens.json:4-8`), though ADR-0004:23 and ADR-0010:27 give it to density.
- **Unknown behaviour.** Nobody has checked whether Terrazzo's orthogonality check (`arch-tokens.md:207`) compares ids, types or values, or whether it warns or fails. P1-2's acceptance is "tz lint reports orthogonal modifiers" (`docs/roadmap.md:18`).

**U-03 (medium). The press haptics in Button and Card.**

- **The binding.** Both slice components bind `haptic.press.button` (`spec/components/Button.yaml:127`, `spec/components/Card.yaml:145`).
- **What is conceded.** The registry admits that playback for press, release and selection is undocumented, and treats them as iOS and watchOS until tested on a device (`spec/haptics.yaml:111-112`).
- **What the check covered.** The 2026-09-14 check confirmed availability against Apple's pages (`docs/research/verification.md:79`). Per-platform playback is still an open question (`docs/research/motion-haptics.md:548`), and the roadmap's verify list has no entry for it.

**U-04 (medium). Curve parity between d3 and Swift Charts.**

- **Only names map.** ADR-0007 calls curve parity a lookup table (`docs/adr/0007-dataviz-first-class.md:11`), but the table maps names only. d3's `curveMonotoneX` is Steffen's method (`docs/research/icons-tooling.md:173`); Apple documents `.monotone` only as preserving monotonicity (`:187`). No source shows equal geometry, so paired LineChart and Sparkline snapshots may differ.
- **An ambiguous token.** `chart.curve` is a number: 1 monotone, 2 catmullRom(0.5), 3 step (`tokens/sys/base.tokens.json:151-154`). It does not say which step variant 3 means.
- **A forbidden curve.** ADR-0007:18 offers "catmullRom soft", while dataviz forbids Catmull-Rom on measured data (`docs/research/dataviz-design.md:139`). dataviz-design's fact-check is still pending (`docs/research/verification.md:13`).

**U-05 (medium). The licensing research and the reference set.**

- **Never checked.** The licensing-kits fact-check never ran (`docs/research/verification.md:12`; fonts is also pending, `:11`). Yet ADR-0015 presents its content as verified facts (`docs/adr/0015-references-inspiration-only.md:11-16`), and the inventory and notices use its licence readings (`licenses/inventory.json:10-16`). One example is the SF Symbols clause, taken from a search snippet (`docs/research/licensing-kits.md:166`).
- **Inconsistent counts.** The reference set is counted as five products (`docs/decisions.md:8`, while `docs/adr/0002-meta-system-with-brand-layer.md:9` names six), nine shots (`licensing-kits.md:9`) and eleven shots (ADR-0015:9, `docs/research/references.json:5-17`).
- **Unverified shots.** `references.json:14` lists 27571204 as settled, though `licensing-kits.md:57` marks it unverified. The licensing research never checked 27220417 and 27289370 (`references.json:15-16`); their credit rests on `docs/research/refs-vexto-traffic.md:3`.

## 5. Risks

**R-01 (high). The ADR-0015 firewall is breached: reference UI copy appears in committed renders and contracts, in a public repository.**

- **The rules.** ADR-0015:21 forbids taking copy or a recognizable composition from the references, and `:41` requires invented sample data. The repository is public (`docs/decisions.md:24`).
- **Harnesses and PNGs.** The type harnesses render the references' KPI titles, hero values, timestamp and vehicle id, as recorded in `docs/research/refs-vexto-traffic.md:21-24`, `:149` and `docs/research/refs-vexto-incident.md:29`, `:34`, `:163`. The harness files are `docs/research/fonts/harness-g1-dark.html:6-12`, `harness-g2-dark.html:9-12` and `harness-g3-dark.html:9-12`. The six committed PNGs are renders of that copy (`docs/research/fonts/g1-dark.png` was checked).
- **Contracts.** The same strings appear in:
  - the Card glass examples (`spec/components/Card.yaml:173`, `:176`);
  - the solid-metric example and the accessibility label (`Card.yaml:149`, `:169`);
  - Text's hero example and accessibility value (`spec/components/Text.yaml:113`, `:133`);
  - a caption token description (`tokens/ref/typography.tokens.json:327`).
- **Composition.** The two glass Card examples together recreate the frame described at `refs-vexto-incident.md:29`, and `Card.yaml:187` cites it as the source. The vivid example's value (`Card.yaml:171`) sits beside that copy in the harness, and its provenance is not recorded.
- **Why it matters now.** Every example will be rendered into public gallery snapshots (`docs/adr/0006-spec-contract-and-parity.md:18`). Nothing enforces rule 3; the research recommended a fixture lint (`docs/research/licensing-kits.md:201`).
- **Resolved 2026-09-15.** Invented copy replaced these strings in the specs, the token descriptions and the font harnesses, and the six PNGs were re-rendered (`docs/research/fonts.md`). `lint:reference-copy` (`tools/lint/reference-copy.ts`, in the CI `contracts` job) now enforces rule 3: it fails when an entry of `tools/lint/reference-copy.denylist.txt`, derived from the `refs-*.md` analyses, appears in contracts, samples or renders (`tools/README.md`; visual-dna B26).

**R-02 (high). The semantic layer hard-codes the reference hues, so brand ramps do not reach tints and glows.**

- **Literals instead of aliases.** These sys tokens are sRGB literals copied from ref colors:
  - `bg.tint.accent`, `accent.subtle` and `accent.glow` copy accent.500 and accent.400 (`tokens/sys/color/light.tokens.json:78-90`, `:237-260`; `dark.tokens.json:95-107`, `:324-346`);
  - the four dark status tints copy the ref status colors (`dark.tokens.json:108-157`; `tools/tokens/seed-sys-tokens.py:99-100`).
- **Effect on brands.** A brand that overrides the accent or status ramps (`brands/README.md:10-11`) keeps the reference orange.
- **Broken promises.** The seed script promises aliases or white/ink overlays (`tools/tokens/seed-sys-tokens.py:3`), yet writes the literal (`:46`). `tokens/README.md:95` says colors are authored once in OKLCH. `ref.opacity.tint.*` holds the same alphas (`tokens/ref/opacity.tokens.json:40-50`), but nothing links it to these colors.
- **Other literals.** ADR-0002's rule that semantic tokens alias only primitives (`docs/adr/0002-meta-system-with-brand-layer.md:36`) is also broken by the literal px values in the density files (`tokens/sys/density/regular.tokens.json:4-59`) and by the white and ink overlays.

**R-03 (high). `swift build` and `swift test` do not compile the generated asset catalog, and no source decides which color path components use.**

- **The plan.** P1-5 commits `Resources/Colors.xcassets` into DSTokens (`docs/roadmap.md:21`; `Package.swift:37` processes `Resources`). ADR-0004 wants both Swift enums and asset catalogs (`docs/adr/0004-dtcg-tokens-style-dictionary.md:25-26`). arch-apple relies on host `swift test` for Swift-side contrast checks and macOS snapshots (`docs/research/arch-apple.md:470`, `:492`).
- **The test.** A scratch target built with Swift 6.3.3 (Xcode 26.6) copied the `.xcassets` folder into the resource bundle uncompiled, with no `Assets.car`. Under `ci.yml:106`, catalog colors would therefore load nothing, while P1-5's acceptance ("swift build passes") still passes. The area critic reports that `--build-system swiftbuild` does compile it; that was not re-run.
- **Two paths that behave differently.** Generated `DSColor` functions are keyed by DSTokenContext (`arch-apple.md:402`). Catalog colors follow the system traits (`:408`), so they cannot follow an overridden DSAccessibilityPolicy (`:162`) or a runtime brand.
- **The stale check.** The diff skips `Resources` (`.github/workflows/ci.yml:37`).

**R-04 (medium). Asynchronous font registration and SwiftUI's silent fallback can put the system font into first frames and snapshot baselines.**

- **Asynchronous registration.** P3-1 names `CTFontManagerRegisterFontURLs` (`docs/roadmap.md:42`), which is asynchronous and may call its handler several times (`docs/research/fonts-facts.md:172`, `:232`).
- **Silent fallback.** `Font.custom` silently falls back to the system font when a face is not registered (`docs/research/arch-apple.md:176`).
- **No ordering rule.** No source says when registration happens relative to the first render. The skill says only to wrap the root in `DSTheme(brand:)` (`agent/SKILL.md:51`), and arch-apple says "call early" (`arch-apple.md:190`).
- **No test.** P3-1's acceptance covers surfaces, policy flags and springs only, so baselines recorded in the system font would pass.

**R-05 (low). The Native web preset loads Inter from Google Fonts at runtime.**

- **The setup.** ADR-0008 gives Native "no bundled files" (`docs/adr/0008-typography-slots-and-presets.md:24`), and the inventory, brand.json and fonts-facts load Inter from Google Fonts (`licenses/inventory.json:8`, `brands/prism-native/brand.json:7`, `docs/research/fonts-facts.md:268`).
- **Offline.** Owner products include Electron (`docs/adr/0003-two-implementations-swiftui-react.md:9`), where offline launches fall back to another font.
- **Privacy.** Loading Google Fonts remotely is an EU privacy exposure.
- **Font version.** Google serves Inter 4.001, not 4.1 with its Cyrillic overhaul (`fonts-facts.md:211`).
- **No record.** No decision records the trade-off.

## 6. Actions

Ordered by roadmap ticket. "new" means no current ticket covers the action; "resolved" marks an action already carried out, as its item records. Notes dated 2026-09-15 in the Action column record what ADR-0019 to ADR-0024 decided; the ticket still carries out the change, and `docs/roadmap.md` "Critic follow-ups" lists what remains.

| ID | Severity | Anchor | Action | Ticket |
|----|----------|--------|--------|--------|
| G-28 | medium | `pnpm-workspace.yaml:8-49` | Complete the catalog: `@changesets/cli`, `@vitest/browser-playwright`, `@storybook/addon-docs`, `tailwindcss`, `d3-array`, the visx set, and an exact `@phosphor-icons/core`. Add `sources` to the registry schema. | P0-2 |
| C-17 | high | `docs/roadmap.md:9` | Guard each CI step until its tool lands, or declare the jobs as placeholders. Align P0-1's acceptance. | P0-3 |
| S-01 | high | `.github/workflows/ci.yml:102-112` | Use `-scheme Prism-Package` with `-only-testing:DSSnapshotTests`, a repo-relative registry path and no snapshot tests on the host. Pin an exact `Xcode_26.x.app` after re-verifying the current release. Update ADR-0003, arch-apple §8.7 and P0-3. | P0-3 |
| C-07 | high | `tokens/ref/typography.tokens.json:389` | Amend ADR-0008 rule 5 and ADR-0007 rule 3 (proportional static heroes, tabular live values), or change the tokens. Scope the equal-width test to tabular roles. *Resolved by ADR-0021 §5 (2026-09-15): static heroes proportional, live values tabular, equal-width test on the tabular roles plus a tabular `metric.xl`.* | P1-1 |
| U-01 | high | `.github/workflows/ci.yml:24-29` | Vendor the DTCG 2025.10 schema set with checksums, validate from a `tokens:validate` script, prove it fails on a broken fixture before P1-1, and add ajv-formats. *Resolved by ADR-0024 (2026-09-15).* | P1-1 |
| C-01 | high | `tokens/prism.resolver.json:75-80` | Make the reduced context `[default, reduced]`, derive `settle` for the reduced springs, and write one reduced-motion rule into ADR-0011. Align arch-web §2.7. *Settled by ADR-0023 (2026-09-15).* | P1-2 |
| C-02 | high | `tokens/comp/card.tokens.json:8` | Pick one `$root` convention (explicit `.$root` plus validator mapping, or leaf tokens). Verify Style Dictionary 5.5's `$root` naming on a fixture. *Resolved by ADR-0024 (2026-09-15).* | P1-2 |
| G-03 | high | `spec/components/Text.yaml:62-81` | Add `sys.type.*` (density-aware), `sys.elevation.0-3`, `sys.gradient.vivid.*` and `sys.opacity.grain`. Correct the spec paths and the regex roots before P2-1. *Resolved by ADR-0024 (2026-09-15): `sys.type.*` in `sys/base` (density changes no type, ADR-0021), no `sys.opacity.grain`.* | P1-2 |
| G-04 | high | `tokens/sys/color/light.tokens.json:360` | Type the material colors, move glass parameters into typed tokens aliasing `ref.blur`, define light `glass.cell`, make chart sizes dimensions, add a type-resolution check, and decide whether alpha 0.92 counts as solid. *Resolved by ADR-0022 (2026-09-15), except the chart-size bullet (P1-2 review).* | P1-2 |
| C-06 | high | `docs/adr/0008-typography-slots-and-presets.md:28` | Settle one thin-weight rule (threshold, fallback weight, step) in ADR-0008 and propagate it. Add a `legibility` modifier or sys weight tokens before the modifier set is fixed. *Resolved by ADR-0021 (2026-09-15).* | P1-2 |
| C-19 | medium | `tokens/README.md:13` | Regenerate the README examples from the token files, and add a CI check that every example path resolves. *Resolved by ADR-0024 (2026-09-15).* | P1-2 |
| U-02 | medium | `docs/adr/0004-dtcg-tokens-style-dictionary.md:23` | Run `tz lint` on a fixture. Restate ADR-0004:23 as id-level ownership with a path table (fix `size.hit` and `material.blur`), or retype. *Resolved by ADR-0024 (2026-09-15).* | P1-2 |
| R-02 | high | `tokens/sys/color/light.tokens.json:78-90` | Add an `alphaOf` + `alpha` extension resolved before P1-4, regenerate the literals, and fail CI on any chromatic literal in `sys/**`. Move density literals into ref, or amend ADR-0002 rule 1. *Resolved 2026-09-15: colors by alias and `app.prism.alpha`, and which other `sys` values may be literals, by ADR-0020 (rule `sys/literal`); typography roles alias `ref.type` (ADR-0024 §5.6); motion literals settled by ADR-0023 §8.2.* | P1-2 |
| C-18 | medium | `tokens/prism.resolver.json:66` | Define per-platform default contexts and the web `:root` permutation in ADR-0004 and the P1-3 driver. Route Button height and type sizes through density-owned tokens. *Resolved 2026-09-15: defaults by ADR-0019, control heights by ADR-0024 §7, type by ADR-0021 (density changes no typography).* | P1-3 |
| G-05 | high | `tokens/sys/motion/default.tokens.json:26-43` | Make the spring transform follow alias chains to the nearest `app.prism.spring`, and test it with a comp→sys→ref fixture. *Settled by ADR-0023 (2026-09-15).* | P1-4 |
| G-17 | medium | `tokens/ref/typography.tokens.json:38-55` | Add a unit table and an `app.prism.textStyle` per role, settle line height with a snapshot, and choose an italic policy (`font-synthesis: none` or no italic). *Resolved by ADR-0021 (2026-09-15), except the SwiftUI first-baseline shift (P3-1 verify item).* | P1-4 |
| C-08 | high | `docs/roadmap.md:20` | Replace Motion's `spring().toString()` with Prism's own sampler, or `generateLinearEasing` run to Prism's settle. Update ADR-0003:29, arch-web and `tools/tokens/README.md:24`. *Settled by ADR-0023 (2026-09-15).* | P1-4 |
| G-12 | medium | `docs/adr/0004-dtcg-tokens-style-dictionary.md:26` | Emit 8-digit hex or rgba (or components plus alpha) for alpha < 1 in both Figma flavors, with an overlay snapshot test. *Resolved by ADR-0024 (2026-09-15).* | P1-5 |
| C-04 | high | `tokens/README.md:71` | Record one runtime attribute set and emitted-name convention in ADR-0004 before P1-5. Generate the skill's examples from it, and resolve the DS prefix on React components. *Resolved by ADR-0019 (2026-09-15); the brand part (no `data-ds-brand`) by ADR-0020.* | P1-5 |
| C-13 | high | `.github/workflows/ci.yml:37` | Use one output tree in P1-5 and CI, include `Resources`, use `git status --porcelain`, and mark the research layouts superseded. *Resolved by ADR-0024 (2026-09-15).* | P1-5 |
| R-03 | high | `Package.swift:37` | Decide that components read generated context-keyed `Color(.displayP3, …)` tables and keep `.xcassets` for interop, or build host tests with a system that compiles catalogs. Add `Resources` to the stale check. *Decided by P1-5 (2026-09-15): components read catalog colors, checked under `xcodebuild` (`tools/tokens/ARCHITECTURE.md` §9.7.3): the stale check covers both `Resources` folders (`Colors.xcassets`, `Fonts`), `verify-xcassets.sh` compiles the catalog for iOS, watchOS and macOS, and `ColorCatalogTests` run on the iOS and watchOS simulators; host `swift test` checks `DSColorToken.appearances`.* | P1-5 |
| G-13 | medium | `tokens/contrast-pairs.json:5-44` | Add the on-accent-strong pair and fix or restrict dark accent-strong. Add an underlay per pair, text-safe stops in gradient extensions and `minSizePx` on large text. Generate pairs from the tone × surface matrix. *Text-safe-stops part superseded by ADR-0022 §4.1 (no zones; V1/V2); underlay policy per ARCHITECTURE §10; the on-accent-strong pair stays for P1-6.* | P1-6 |
| G-14 | high | `tokens/contrast-pairs.json:36-42` | Add target, comparison and now pairs against `chart.plot`, add a `relief` field, and decide `chart.plot` opacity. | P1-6 |
| C-03 | high | `brands/README.md:9-17` | Keep brands to ref-only (or add per-scheme brand ref roles), regenerate the contract table from the real paths, and specify radius profile and type scale. *Resolved by ADR-0020 (2026-09-15).* | P1-8 |
| C-05 | high | `brands/prism-native/brand.tokens.json:6-9` | Give the platform modifier per-platform native stacks, keep SF names out of web output, render Native at token sizes on Apple, and delete the unused preset mechanisms. *Resolved by ADR-0020 (2026-09-15).* | P1-8 |
| C-20 | high | `docs/adr/0008-typography-slots-and-presets.md:48` | Define the gate as "`tnum` or equal digit advances". Bundle and dump the pinned JetBrains Mono (the bundled file is 2.211), commit the check scripts, and add `fonts:check` and a CI step. *Resolved by ADR-0021 (2026-09-15).* | P1-8 |
| G-08 | high | `brands/README.md:34` | Copy fonts plus OFL.txt into DSTokens resources and the tokens package (woff2 and `@font-face`), record SHA-256, cover both in the stale check, add `register(bundle:)` and fix the `brand.json` paths. *Resolved by ADR-0021 (2026-09-15), except the woff2 encoder (verify item, P1-8) and consumer-brand registration (ADR-0020 route 2, roadmap L-1).* | P1-8 |
| R-05 | low | `licenses/inventory.json:8` | Self-host Inter through the Signature pipeline, or record the trade-off in ADR-0008. *Resolved by ADR-0020 (2026-09-15).* | P1-8 |
| G-02 | high | `spec/components/Button.yaml:116` | Quote the offending scalars in Button, Card, Text and `spec/haptics.yaml`, and add a parse step to CI ahead of the validator. | P2-1 |
| G-06 | high | `spec/component.schema.json:144` | Specify the binding-matrix grammar (axis order, reserved keys, fallback, `{prop}` interpolation) and migrate the four specs. | P2-1 |
| C-09 | high | `docs/adr/0002-meta-system-with-brand-layer.md:36` | Amend ADR-0002 on sys bindings in specs, then align SCHEMA.md, the README, the regex and the specs, and make the validator enforce it. *Resolved by ADR-0024 (2026-09-15).* | P2-1 |
| C-26 | medium | `spec/component.schema.json:89` | Require `reduceTransparency` and `reduceMotion`, and pick one glass fallback material. Fix decision #11 and the watch token. *Resolved by ADR-0022 (2026-09-15): one fallback, opaque raised over the page; the schema part is P2-1.* | P2-1 |
| G-19 | medium | `spec/haptics.yaml:1` | Record haptics in an ADR, add a schema, cross-check haptic and icon ids in P2-1, split `selection.limit`, and add haptics codegen to P3-1. | P2-1 |
| G-09 | high | `docs/adr/0013-icon-registry.md:22` | Choose template image sets or hand-authored custom symbols, name the owning target and path, and add them to the stale check. | P2-2 |
| C-21 | medium | `docs/research/icons-tooling.md:152` | Gate on OS ≤ 26.0 (key 2025), and make "SF Symbols 8 only with a validated fallback" the single policy across ADR, README and roadmap. | P2-2 |
| C-22 | medium | `docs/decisions.md:19` | Align decision #13 with ADR-0013, and specify or delete `icon.search`. | P2-2 |
| C-23 | medium | `tokens/sys/base.tokens.json:139-147` | Make `icon.weight` a named token or publish the number-to-name table, pick one mapping for medium, define Bold Text for icons, and map `size.icon` boxes to SF point sizes. | P2-2 |
| C-24 | medium | `spec/icons/registry.json:18-19` | Make `rtlMirror` per platform, bind zoom to magnifier glyphs, and require tags or drop the rule. | P2-2 |
| C-30 | low | `docs/adr/0013-icon-registry.md:40` | Reword rule 1 to cover `spec/icons`, and strip `apple` bindings from any npm copy. | P2-2 |
| G-20 | medium | `docs/adr/0006-spec-contract-and-parity.md:16` | Name the web charts manifest (and create the React one), decide the package for DSIcon, dsIcons and spec loading, and add a stories↔examples ticket. | P2-3 |
| G-21 | medium | `.github/workflows/ci.yml:45` | Per-platform manifest maps (or one JSON manifest per stack), a specified parse format, and `--fail-on-lag` on `main` only. | P2-3 |
| G-26 | medium | `licenses/inventory.json:5-19` | Add the permitted kits, the libraries and an SDK-runtime category. Check package contents against the inventory, and fix the notices command. | P2-4 |
| G-25 | medium | `docs/adr/0008-typography-slots-and-presets.md:26` | Verify a descriptor-based Font that rescales on `dynamicTypeSize`, or restrict weights to named instances. *Resolved by ADR-0021 (2026-09-15).* | P3-1 |
| U-03 | medium | `spec/haptics.yaml:111-112` | Add an on-device playback check for iOS, watchOS and macOS; until it passes, bind press to a documented feedback. | P3-1 |
| R-04 | medium | `docs/roadmap.md:42` | Register fonts synchronously behind a once-token in DSTheme.init, assert PostScript names, and add a test that fails on system-font fallback. *Resolved by ADR-0021 §9 (2026-09-15).* | P3-1 |
| C-14 | high | `web/packages/tokens/package.json:8` | Add the CSS and per-component subpath exports and a `style` field, and ship `spec/` in the packages or drop it from `files` and the skill. | P3-2 |
| G-07 | high | `docs/roadmap.md:42-45` | Make P3-1 depend on P1-8 and P3-3/P3-4 on P2-2, with a minimal Icon and Spinner, or trim the examples. Add a content prop to Text and an owned or CC0 backdrop fixture. | P3-3 |
| C-29 | low | `spec/components/Button.yaml:118` | Fix Button's wrap rule per ADR-0011, and pick one vivid-count rule. | P3-3 |
| G-22 | medium | `pnpm-workspace.yaml:49` | Pin `@playwright/test` exactly with the image, add a browser install step (or run the job in the image), and add `@vitest/browser-playwright`. | P3-4 |
| C-25 | medium | `spec/SCHEMA.md:156` | Extend the snapshot name with density and variant, match the Playwright and Swift naming, add a collection step, a watchOS target and a tracked `gallery/`. | P3-5 |
| C-16 | high | `docs/roadmap.md:47` | Rewrite P3-6 around a pre-release dist-tag, with checkboxes for the legal checkpoint, reference-distance review and package visibility, or move it after P5-2. | P3-6 |
| G-01 | high | `docs/roadmap.md:17` | Recover or re-derive `visual-dna.md`, `component-inventory.md`, `a11y-reconciliation.md` and the direction board. Mark P1-1, P2-5 and P5-1 blocked until then, and move text-safe zones into gradient extensions. *Text-safe-zone part resolved by ADR-0022 (2026-09-15): no zones; V1 and V2 checks.* | new |
| G-10 | high | `docs/research/dataviz-design.md:24` | Ticket to commit a written spec of the six checks and implement `tools/viz-validate` with a script and CI step. Record the skill's provenance and licence. | new |
| G-11 | high | `web/packages/tokens/package.json:24` | Decide Prism's licence in an ADR, add LICENSE at the root and to each package, and add a self entry to the inventory. Resolved 2026-09-15 by ADR-0028 (MIT). *ADR-0031 superseded ADR-0028 on 2026-09-22, and its answer is the one that stands: Prism is proprietary, all rights reserved. `LICENSE` is at the root and in each published package, each of their manifests declares `"license": "SEE LICENSE IN LICENSE"`, and the inventory's self entry is `LicenseRef-Prism-Proprietary`. The sentence before this note records how the finding was first closed, and ADR-0031 keeps it.* | resolved 2026-09-22 |
| C-10 | high | `tokens/comp/chart.tokens.json:6-25` | Decide 6 vs 8 slots and a neutral slot 1, reseed from dataviz §4 or validate the seed, and check `chart.now` against the series. | new |
| C-11 | high | `tokens/sys/base.tokens.json:180-213` | Record one dash grammar in ADR-0007 (solid grid, one target dash, no dashed series) and realign `stroke.*`. | new |
| C-12 | high | `docs/adr/0012-layers-and-v1-scope.md:23` | Amend ADR-0007 and ADR-0012 with one wave-1 list and one set of names and hero recipe, then update decision #7, the skill and the roadmap. *Prefix settled by ADR-0019 and hero figures by ADR-0021 (2026-09-15); the rest stays open.* | new |
| C-15 | high | `docs/adr/0014-monorepo-and-distribution.md:37` | Choose the version authority, add a 0.x bump policy and a release-workflow ticket, and stamp VERSION, the Swift constant and the skill from one source. *The 0.x diff policy is settled by ADR-0024 §14 (2026-09-15). P3-6 carried out the rest on 2026-09-22: Changesets computes the number, `VERSION` records it, `release:stamp` writes the Swift constant and every other derived copy, `release:check` in the test suite keeps them equal, and `.github/workflows/release.yml` is the workflow. ADR-0038 recorded it on 2026-09-24. The skill is not stamped, because it carries no number (ADR-0038 decision 4).* | resolved 2026-09-24 |
| R-01 | high | `spec/components/Card.yaml:173` | Replace reference copy with invented copy in the specs, the token description and the harnesses, re-render the PNGs, and add a CI denylist from `refs-*.md` literals. | resolved 2026-09-15 |
| G-15 | medium | `docs/research/verification.md:16` | Add the missing arch-tokens, motion-haptics and licensing-kits open questions to "Verify before implementing", each with its ticket. *The motion-haptics questions are handled by ADR-0023 (2026-09-15); arch-tokens and licensing-kits remain.* | new |
| G-16 | medium | `tokens/README.md:74` | Decide runtime vs build-time brand per stack, the consumer-brand build route and watch output selection, and limit watch to dark contexts. *Resolved by ADR-0020 (2026-09-15); route 2 is roadmap L-1.* | new |
| G-18 | medium | `.github/workflows/ci.yml:13-116` | Wire the existing scripts (`lint:literals`, `tokens:diff`) into CI. Add tickets for the spec-diff check, vocabulary lint, guide and skill generator, fonts and viz checks, gallery and fixture lints, `tokens/build.ts`, and a blueprint close-out (image deletion, pending fact-checks). Define the ticket runner, and freeze the seed scripts after P1-1. *Closed-vocabulary lint settled by ADR-0024 (2026-09-15); the rest stays open.* | new |
| G-23 | medium | `docs/research/dataviz-design.md:183` | Specify a minimal Tier-1 data table as a data-viz part, or a per-platform twin, in the wave-1 list. | new |
| G-24 | medium | `spec/components/Button.yaml:116` | Write a contract for component-owned strings: spec keys, English and Russian catalogs per stack, locale formatting fields, and a Russian snapshot in P3-3/P3-4. *Answered by ADR-0032 (2026-09-22), and not with this remedy. There is no catalog and no Russian snapshot. Instead the app replaces, once at the root, a `strings` table of four English templates. On 2026-09-23 the contract landed: `spec/strings.yaml`, `spec:validate`'s `strings/unknown` and `strings/placeholder` checks, `DSStrings` with `DSTheme(strings:)`, and `defaultStrings` with `<Theme strings>`. Badge reads `Badge.count` and `Badge.overflow`, and IconButton reads `Badge.count` for its badge. On 2026-09-26 Button 5 finished `Button.loading`. `Button.yaml` names the key, and both Buttons fill the app's template with their label instead of writing "{label}, loading" themselves, so an app's translation now reaches every loading button. The English name and every pixel are unchanged. What is left belongs to other tickets: `Chip.remove` to Chip (P4-8), and Text's spoken "86.4 percent" to P4-D3. The roadmap's G-24 follow-up records the details.* | resolved 2026-09-26 |
| G-27 | medium | `docs/adr/0017-blueprint-first.md:21` | Add a gate ticket for the owner's direction-board sign-off, and make P1-1 and P3-3/P3-4 depend on it. *Gate ticket P3-0 added to the roadmap (2026-09-15).* | new |
| C-27 | medium | `brands/README.md:11` | Decide in ADR-0002/ADR-0007 whether series are brand-overridable and whether chart status is themed, and run the viz validator per brand. *Resolved by ADR-0020 (2026-09-15).* | new |
| C-28 | medium | `docs/adr/0007-dataviz-first-class.md:18` | Add a "chart tokens from dataviz §6" ticket with a name map, add `stroke` to the regex, wire or delete `ref.opacity.chart.*`, and reconcile endpoint and hit sizes. *The `stroke` binding root is settled by ADR-0024 (2026-09-15); the rest stays open.* | new |
| U-04 | medium | `docs/adr/0007-dataviz-first-class.md:11` | Add a verify item that renders one series on both engines and diffs the paths. Make `chart.curve` a string enum, and resolve the Catmull-Rom rule. | new |
| U-05 | medium | `docs/research/verification.md:12` | Run the pending licensing and fonts fact-checks before P2-4 and P1-8, add a `verified` flag per shot, and fix the reference counts. | new |
| C-31 | low | `docs/research/dataviz-design.md:161` | Add a compaction threshold and rounding rule to the HeroNumber spec, with shared English and Russian fixtures. | new |
| S-02 | low | `docs/adr/0011-accessibility-tiers-ci.md:51` | Fix the stale paths in the table, remove the ADR-0004:5 note, and update `tools/README.md` and `brand.json`. *The `brand.json` row is settled by ADR-0021 (2026-09-15; the files land in P1-8), and the `tools/tokens/README.md` row was fixed the same day. The `tools/README.md` row was fixed by 2026-09-16 (Node 24; tools exist). The other rows were fixed on 2026-09-24 as path corrections that change no decision. ADR-0010 and ADR-0011 name the `tokens/sys/` files. ADR-0014's layout lists `web/apps/` with the gallery, `vrt` and `showcase`. ADR-0004's note is gone. The decision record's deferred-typeface line records Onest. `spec/haptics.yaml` cites ADR-0003 and G-19.* | resolved 2026-09-24 |
| S-03 | low | `docs/research/motion-haptics.md:16` | Mark superseded names and layouts in each report, update the `interactive` spring description, and decide its bounce (0 or 0.15). *Motion items settled by ADR-0023 (2026-09-15).* | new |
