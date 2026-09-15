# ADR-0024: Token source conventions: references, semantic roles, gates and flavors

- Status: accepted (§4.1 amended by [ADR-0020](0020-brand-model.md): `app.prism.alpha` is the one folded key an alias declares)
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #24
- Amends: ADR-0002 (the component-token bullet and rule 1: which tokens a spec binds, what each tier may alias), ADR-0004 (decisions 1, 3, 5, 6 and 7, rule 2, and the consequence that the hex fallback serves hex-only consumers: schema copies, id-level modifier ownership and its gate, flavor colors, the diff policy before 1.0), ADR-0005 (decision 2: translucent colors in the Tokens Studio flavor), ADR-0006 (Consequences: while the version is 0.x a breaking change bumps the minor, §14), ADR-0010 (the density bullet: `size.hit` belongs to modality), ADR-0014 (the `tokens/` line of the layout and rule 1: `tokens/export/` is generated, not source)

## Context

Phase 1 turns `tokens/` into generated code (ADR-0004; design in `tools/tokens/ARCHITECTURE.md`). The source, the specs that bind it and the documents that describe it disagree in ways an implementing agent would otherwise have to guess at. This ADR settles the conventions of the token source itself.

- **Scope:** critic C-02, G-03, C-09, C-13, C-18 (control height), C-19, G-12, U-01 and U-02; ARCHITECTURE S2, S6, S7, S8, S10 and open decisions O3, O4 and O6; visual-dna B15, B24 and B25.
- **Handed over by another decision of the same day:** the variant contexts left without a delta (ADR-0022 §1.4).
- **Not decided here:** which `sys` values may be literals (critic R-02). ADR-0020 §3 decides it for every type; §5.6 adds one rule for typography roles.
- **Built on:** ADR-0019 to ADR-0023, where they touch the same files.

### What the repository says today (working tree, 2026-09-15)

- **Group references (C-02, S2).** `comp.card.solid.bg` and `comp.surface.solid` alias `{sys.color.bg.surface}` (`tokens/comp/card.tokens.json:8`, `tokens/comp/surface.tokens.json:10`), a group whose base token is `$root` (`tokens/sys/color/light.tokens.json:12`). Two more `$root` groups exist: `sys.color.accent` (`light.tokens.json:230`, `dark.tokens.json:318`) and `sys.size.control` (`tokens/sys/density/regular.tokens.json:52`). Consumers already write the root without `$root`: 18 pairs use `color.bg.surface` (`tokens/contrast-pairs.json`), `spec/components/Surface.yaml:69` binds it, and the spec regex has no `$` (`spec/component.schema.json:138`).
- **Roles the specs bind do not exist (G-03, S6, B15, B25).** 31 distinct token paths in the four specs resolve to nothing: the 21 `type.*` roles (`spec/components/Text.yaml:62-81`, `:99`; `Button.yaml:101-103`; `Card.yaml:104`, `:110`, `:126`), `elevation.0`–`3` (`Surface.yaml:89-92`), `gradient.vivid.orchid` (`Surface.yaml:76`, `Card.yaml:90`), `opacity.grain` (`Surface.yaml:96`), `size.hit.touch|pointer` (`Button.yaml:115`) and `radius.compact|large` (`Card.yaml:137`). The semantic layer has `sys.shadow.flat|raised|floating|overlay|drawer` instead of elevation levels (`light.tokens.json:462-479`, `dark.tokens.json:595-613`). Gradients exist only in `ref`, as four light and four dark named gradients marked by `app.prism.scheme` (`tokens/ref/gradient.tokens.json`). Grain lives in gradient and material `$extensions` (visual-dna B15).
- **Which tier a spec binds (C-09).** ADR-0002 makes component tokens "the only tokens components bind to" (`docs/adr/0002-meta-system-with-brand-layer.md:19`, rule 1 at `:36`). `spec/SCHEMA.md:90`, `tokens/README.md:13` and the regex allow `sys.*` and `comp.*`. 31 of the 64 `comp.*` tokens are bound by no spec: all of `comp.text.*` (5), `comp.surface.*` (7) and `comp.chart.*` (14), plus `comp.card.gap`, `comp.card.glass.edge`, `comp.button.primary.bg.disabled`, `comp.button.secondary.border` and `comp.button.motion.press`. Most are pass-throughs: every `comp.text.<x>` is `{sys.color.text.<x>}` (`tokens/comp/text.tokens.json:4-21`).
- **Control height (C-18, B24).** Density writes `sys.size.control.$root` = 32 / 40 / 48 (`regular.tokens.json:51-57`), and nothing binds it. Button heights alias `sys.size.control.sm|md|lg` (`tokens/comp/button.tokens.json:72-83`), which `sys/base` points at fixed `ref` steps (`tokens/sys/base.tokens.json:103-113`), so Button never follows density. Nothing else references `ref.size.control.*`. Modality writes `sys.size.hit` (`tokens/sys/modality/pointer.tokens.json:4-8`). ADR-0010 lists `size.hit.*` under density and the hit size under modality (`docs/adr/0010-platform-tiers-density-modality.md:27-28`). visual-dna says "Controls are 40 (pointer) or 44 (touch)" (`docs/research/visual-dna.md:113`), and `ref.size.control.md|lg` are described as "pointer default" and "touch default" (`tokens/ref/dimension.tokens.json:182`, `:189`).
- **Names and types (S7, S8, S10).** `ref.motion.easing.inOut` is camelCase (`tokens/ref/motion.tokens.json:60`) and is aliased at `:152`; it is the only token or group name in `tokens/` and `brands/` that is not lowercase kebab-case. The reference brand writes `ref.brand.type-scale` (`brands/prism/brand.tokens.json:4-6`), a path the `ref` set does not declare; `brands/README.md:15` names `ref.type.scale`. `ref.type` is typed `typography` (`tokens/ref/typography.tokens.json:33-34`), while the density files type `sys.type` as `number` (`regular.tokens.json:60-65`). Four `number` tokens act as booleans: `sys.interaction.hover|tooltip` (`pointer.tokens.json:10-18`, `touch.tokens.json`), `sys.material.blur.enabled` (`tokens/sys/platform/*.tokens.json`) and `sys.motion.presentation.crossfade` (`tokens/sys/motion/*.tokens.json`).
- **The orthogonality gate (U-02, O6).** ADR-0004 keeps modifiers "orthogonal by token type", says a doubly written id "fails `tz lint`" (`docs/adr/0004-dtcg-tokens-style-dictionary.md:23`, `:46`), and the resolver repeats it (`tokens/prism.resolver.json:5`). Types already repeat across modifiers: brand and platform both write `fontFamily`, and density and modality both write `dimension` (critic U-02). The P1-2 acceptance is "`tz lint` reports orthogonal modifiers" (`docs/roadmap.md:18`).
- **Schema validation (U-01).** The `contracts` job downloads the two DTCG schemas, checks their SHA-256 and runs `npx --yes -p ajv-cli@5.0.0 -p ajv-formats@3.0.1` (`.github/workflows/ci.yml:17-20`, `:97-111`). Those packages resolve their dependencies at run time, outside the lockfile. `tools/tokens/README.md:12-19` names a `tokens:validate` step that does not exist.
- **Output tree (C-13, O3).** P0-3 already fails CI on `git status --porcelain` output (`ci.yml:116-127`), but its list (`:120`) covers three of the five roots the writer owns (ARCHITECTURE §9.0), one of them as the whole `swift/Sources/DSTokens/Resources` instead of its `Colors.xcassets`. It misses `swift/Tests/DSTokensTests/Generated` and `tokens/export`. ARCHITECTURE puts the Tokens Studio and Figma flavors in `tokens/export/`, while ADR-0014 describes `tokens/` as "DTCG 2025.10 source" and makes it a source of truth (`docs/adr/0014-monorepo-and-distribution.md:20`, `:53`).
- **Flavor colors (G-12).** 80 color objects have alpha below 1: 72 in `sys/color` and 8 shadow colors in `ref/elevation`. ADR-0004 gives the Figma flavors "6-digit hex" (`0004:26`, `:41`), and ARCHITECTURE plans `#rrggbbaa` for Tokens Studio (§7.2, §9.9).
- **Documentation drift (C-19).** `tokens/README.md:17-40` lists names that do not exist: `color.chart.series.1…8` (six exist), `radius.0…5`, `size.hit.pointer|touch`, `motion.easing.standard|emphasized`, `material.glass.regular|clear|tinted`, `chart.target.dash`, and the emission example `sys.color.bg.accent` (`:13`). `agent/SKILL.md:36` uses `opacity.dimmed`. `spec/SCHEMA.md` binds `motion.press` (`:108`) and `color.focus.ring` (`:121`). Agents are told to take token names from that README (`agent/SKILL.md:75`).
- **Diff policy (O4).** `tokens:diff` classifies removal and type change as major (ADR-0004 decision 7). ARCHITECTURE offers `--pre1 strict|shifted`, default strict (§11), while the roadmap plans 0.1.0 until Phase 3 and 0.2.0 at the end of Phase 5 (`docs/roadmap.md:3`).

### Facts verified for this ADR (2026-09-15)

Probes ran on copies of `tokens/` and `brands/` in the session scratchpad, with the repository's installed Style Dictionary 5.5.3, `@terrazzo/cli` and `@terrazzo/parser` 2.7.1, Ajv 8.20.0 (with `ajv-formats` 3.0.1 in a scratch install) and semver 7.8.5 on Node 24.21. The review of this ADR re-ran T2 to T7 and T10.

| # | Fact | Evidence |
|---|------|----------|
| T1 | DTCG Format 2025.10: groups hold a root token named `$root` (§6.2), and Example 10 states "{color.accent} is an invalid token reference (refers to a group, not a token)". References target complete tokens only (§7.1.1). A token without `$type` takes its referenced token's type before any parent group's (§5.2.2). Names must not start with `$` or contain `{`, `}` or `.` (§5.1.1). There is no boolean type (§8). | designtokens.org/tr/2025.10/format |
| T2 | Style Dictionary 5.5.3 throws on `{sys.color.bg.surface}`: "{comp.card.bg} tries to reference {sys.color.bg.surface}, which is not defined". It resolves `{sys.color.bg.surface.$root}`, and `name/kebab` names that token `sys-color-bg-surface-root`. | SD probe |
| T3 | `tz lint` 2.7.1 exits 0 on a copy whose comp tokens reference the group `{sys.color.bg.surface}`; Terrazzo resolves the group to its `$root` token. It also exits 0 on non-orthogonal copies in which `density/compact` also writes `sys.material.blur.enabled` or `sys.interaction.hover`. `@terrazzo/parser` reports `resolver.orthogonal` false for those copies and true for the fixed one, with 432 permutations. Its test compares token ids per modifier and returns a boolean without the offending id (`dist/resolver/load.js`, `isResolverOrthogonal`). `listPermutations` is withheld when the product exceeds the config's `permutationLimit`, 1000 by default (`dist/config.js:278-279`, `dist/resolver/load.js:165`); five brands would give 1,080 permutations. | CLI and parser probes; parser source |
| T4 | Terrazzo types a token by its merged group before its alias target. An untyped `sys.type.body.md: "{ref.type.body.md}"` in `sys/base` fails `tz lint` with `Cannot alias to $type "typography" from $type "number"`, because the density files type `sys.type` as `number`. With an own `"$type": "typography"` it passes. SD behaves the same way (ARCHITECTURE §15 F8). | CLI and parser probes |
| T5 | `core/consistent-naming` defaults to `warn` (`dist/lint/plugin-core/index.js:103`). Raised to `error`, `tz lint` fails on `inOut`, and it passes once both the name (`motion.tokens.json:60`) and the alias at `:152` are renamed. | CLI probe |
| T6 | Every token change of this Decision was applied to a copy that also has ARCHITECTURE's S1 and S2 fixes, ADR-0023's reduced layering and easing roles, ADR-0022's deletion of `sys.material.blur.enabled` and of the reduced-transparency material overrides, and ADR-0020's empty reference-brand file. After the three `comp` files, the two reduced-transparency deltas and `watch.tokens.json` are deleted, 25 token files remain. On that copy every token file and the resolver validate against the schemas, `tz lint` is clean with the naming rule at `error`, and `@terrazzo/parser` reports the resolver orthogonal with 432 permutations. `sys.gradient.vivid.default` and `.1` to `.4` resolve to sky, sky, olive, rose and orchid in the three light contexts and to plum-dusk, plum-dusk, forest-moss, ember-night and navy-cyan in the three dark contexts. `comp.button.height.sm|md|lg` is 28 / 32 / 40, 32 / 40 / 44 and 44 / 48 / 52 px by density, and `sys.size.hit` is 28 / 44 by modality, in every combination. | Ajv, CLI and parser probes |
| T7 | The published schemas match the CI checksums (`format.json` `32e93b78…e42915f`, 56,523 bytes; `resolver.json` `a5acd143…b1da977`, 70,725 bytes). They are draft-07 and self-contained: every external `$ref` target (18 documents in `format.json`, 21 in `resolver.json`) is an embedded `$id`. `resolver.json` embeds `format.json` under the same `$id`, so compiling both in one Ajv instance fails with "reference … resolves to more than one schema"; one instance per schema works. They use the formats `uri-reference` and `json-pointer-uri-fragment`, which strict Ajv rejects without `ajv-formats`. Offline, Ajv 8.20.0 accepts all 31 token files and the resolver. It also accepts an untyped token, a group reference and a camelCase name, and rejects a two-component color and a `$type` of `boolean`, so the schema checks structure, not the rules of §1 to §5. The schemas are the `schemas/` package of `design-tokens/community-group` (`@dtcg/schemas`). That repository's only licence file, `LICENSE.md`, licenses its reports under the W3C Software and Document License (2015) and takes contributions to "Test Suites and Other Software" under the W3C 3-clause BSD License. | Download, `shasum`, Ajv probe, repository tree and `LICENSE.md` |
| T8 | Tokens Studio documents 8-digit hex as ARGB, with alpha first (`#40000000` is black at 25 %), and accepts `rgba(0,0,0,0.25)`. CSS reads 8-digit hex as RRGGBBAA. | docs.tokens.studio, color token type |
| T9 | Figma's variable import takes sRGB or HSL colors, dimensions in `px` and durations in `s`, and creates one mode per file. It treats a number with `com.figma.type: "boolean"` as a boolean, 0 meaning false. Its example color object carries `alpha` and `hex`. The help page does not say whether an alpha below 1 is imported. | help.figma.com, "Modes for variables" |
| T10 | `semver.inc('0.1.0', 'major')` is `1.0.0`, and Changesets computes versions with `semverInc` with no special case for 0.x (`packages/assemble-release-plan/src/increment.ts`). `^0.1.0` excludes 0.2.0. SwiftPM's `from:` goes "up to the next major version" and documents no 0.x rule. | semver probe; Changesets source; PackageDescription docs |

## Decision

### 1. References and `$root` (C-02, S2)

1. A reference to a group's base token is written `{group.$root}`. `{group}` is an error in `tokens:build` (`ref/group-reference`, hint `{group.$root}`). DTCG forbids it (T1), and the two engines disagree about it (T2, T3). `tz lint` passes it, so Prism's check is the gate.
2. `$root` stays; tokens are not renamed to leaves. It marks a family with one base token and named siblings: `sys.color.bg.surface`, `sys.color.accent` and ADR-0022's glass recipes (`sys.material.glass.<recipe>.$root` next to `blur`, `grain` and the rest). `sys.size.control.$root` goes away (§7).
3. Public paths drop `.$root`: `color.bg.surface` in specs, contrast pairs, TypeScript keys, the manifest and documents. `lookup()` maps a public path to its `.$root` id (ARCHITECTURE §10). A public path never contains `$`.
4. Emitted names drop `$root` (ARCHITECTURE §8; ADR-0019 §6 lists the names, such as `--ds-color-bg-surface`). The flavors write it as `default`. A sibling token literally named `default` next to a `$root` fails the build (`naming/root-default-collision`).
5. **References are curly-brace references to whole tokens**, whether a token's whole value or a composite's sub-value. DTCG's JSON Pointer `$ref` into token values is not used, and the build rejects it (`ref/json-pointer`), so both engines only ever see curly-brace aliases. A translucent variant of a color is an alias with `app.prism.alpha` (ADR-0020 §3). ADR-0022 §2.5 left this convention to this ADR, and it does not change.

### 2. Names (S7)

1. Every token and group name matches `^[a-z0-9]+(-[a-z0-9]+)*$`, so digit-only segments such as `space.4`, `elevation.2` and `gradient.vivid.1` are allowed. `$root` is the only name that starts with `$`. `source/model.ts` checks it (`source/name-case`), and `tools/tokens/terrazzo.config.ts` raises Terrazzo's `core/consistent-naming` to `['error', { format: 'kebab-case' }]` (T5).
2. `ref.motion.easing.inOut` becomes `ref.motion.easing.in-out`, together with its alias in `ref.motion.spring.smooth` (`motion.tokens.json:152`).
3. Keys inside `$extensions["app.prism"]` (such as `textStyle`, `darkWeight` and `a11y.pairsWith`) and resolver context names (ARCHITECTURE §5.1) are not token names; this rule does not touch them.

### 3. Types across documents (S6)

A token without its own `$type` must have the same type as every `$type` declared on any of its ancestor group paths, in every document the resolver loads. Otherwise it carries its own `$type`. The diagnostic `type/group-type-mismatch` replaces ARCHITECTURE's same-document-only `type/alias-group-conflict` (§5.4). Both engines type merged trees against DTCG §5.2.2 (T4), and a portable source must not depend on Prism's preprocessor. `ref.type.scale` therefore carries `"$type": "number"`. Every `sys.type.<role>` also carries `"$type": "typography"`, so that no group type another document declares can capture it.

### 4. Folded extensions and flags (S10)

1. The functional extension keys folded into the value are ARCHITECTURE §5.4's `spring`, `slot`, `numeric`, `textStyle`, `opsz`, `flag` and the gradient keys `angle`, `grain`, `scheme` and `bloom`, plus ADR-0021 §4's `darkWeight`. They flow through every alias.
   - An **alias** is a token whose whole `$value` is one curly-brace reference. A composite whose sub-values reference other tokens is a literal: every `ref.type.*` role, whose `fontFamily` aliases a font slot, is a literal that declares `slot`, `numeric` and `textStyle`.
   - An alias never declares a folded key itself. The build rejects it with `extension/alias-override`, the only diagnostic code for this rule. ADR-0023 §4 applies it to springs and ADR-0021 §4 to the typography keys; neither adds a code. A different value needs a new literal token.
   - The one exception is ADR-0020's `alpha`. It exists only on aliases, because it changes the alpha of the alias's resolved value, and tokens that alias that alias inherit the result. It is invalid on a literal (ADR-0020 §3, rule 6).
   - Metadata keys (`a11y`, `figma`, `llm`, `brand`) stay on the declaring token and are not inherited.
   - Material recipes are typed tokens (ADR-0022 §2), so `app.prism` carries no material key.
2. A boolean is a `number` token whose value is 0 or 1, with `$extensions["app.prism"].flag: true` on **every** declaration of the id. A later declaration replaces the whole token (ADR-0023 §10), so a flag on one declaration only would vanish in some contexts. The diagnostics are `type/flag-mismatch` (ADR-0023) and `type/flag-value` (a value other than 0 or 1). The ids are `sys.interaction.hover`, `sys.interaction.tooltip` and `sys.motion.presentation.crossfade`; ADR-0022 §1.4 deletes the fourth, `sys.material.blur.enabled`. Emission follows ARCHITECTURE §7.11: CSS 0 or 1, Swift `Bool`, TypeScript `boolean`, Figma `com.figma.type: "boolean"` (T9), Tokens Studio `boolean`.

### 5. What each tier aliases and what specs bind (C-09)

This replaces ADR-0002's "component tokens … the only tokens components bind to" and its rule 1. Rule 1's "semantic tokens alias only primitives" becomes item 1's alias direction; which `sys` values may be literals is ADR-0020 §3's (item 6).

1. **Alias direction.** `ref` aliases only `ref`; `sys` aliases `ref` or `sys`; `comp` aliases only `sys`. A `comp.*` token is always a whole-value alias of one `sys.*` token: no literal, no `ref`, no other `comp` token. Checked by `tier/alias-direction`, which tightens ARCHITECTURE's IR invariant 2 for `comp`.
2. **Bindings.** A spec's `tokens` and `motion` blocks bind either a public `sys` path in a spec-bindable category or a token of its own component, `comp.<component>.*`, where `<component>` is the kebab-case `name` (`StatTile` gives `comp.stat-tile`). They never bind `ref.*` or another component's `comp.*`. ADR-0023 rule 9 narrows the `motion` block further, to `motion.spring.*`, `motion.duration.*`, `motion.easing.*` and `comp.<component>.motion.*`. Token paths in a spec's prose must resolve: the string values of `behavior`, `accessibility`, `usage` and `notes`, read word by word with trailing punctuation stripped, under §13.2's grammar.
3. **Bindable categories:** `color`, `type`, `space`, `size`, `radius`, `border`, `elevation`, `opacity`, `motion`, `material`, `gradient`, `chart`, `stroke`, `icon`, `z`. `stroke` is new (critic C-28). Three categories are not bindable:
   - `shadow`: the elevation levels are the role, and `shadow.drawer` reaches a spec through a component token;
   - `font`: families reach components through `type.*` roles and `DSBrand`;
   - `interaction`: modality flags that decide whether hover and tooltips exist. Component code reads them (ADR-0019 §4.6) and spec prose may name them, but no part binds them as a value.

   The regex in `spec/component.schema.json` lists exactly the bindable set. Every `sys` category is either bindable or in the `NON_BINDABLE` list of `tools/spec/` (P2-1). A new category is classified in the change that adds it.
4. **When a component token exists.** Only for a choice the component makes: one of its variant or state cells maps to a role whose name does not already say what the cell is. Examples: `comp.button.primary.bg.rest` → `color.bg.fill.inverse`, `comp.card.glass.fill` → `material.glass.dark.fill`, `comp.button.motion.press` → `motion.spring.snappy`. When the role's name already is the cell's meaning, as with Text `tone: secondary` → `color.text.secondary` or Surface `material: raised` → `color.bg.surface.raised`, the spec binds the role. Reviewers apply this test. The machine checks are items 1, 2 and 5. Component tokens that are bound today stay as they are.
5. **No orphans.** Every `comp.<component>.*` token is bound by that component's spec, and a `comp` group without a spec file is an error (`spec:validate`, P2-1). Today's 31 unbound tokens resolve as follows. The pass-throughs are deleted: `comp.text.*`, `comp.surface.*`, `comp.chart.*`, `comp.card.gap` (the gap between cards belongs to patterns: `space.card-gap`), `comp.card.glass.edge` (Surface draws the glass edge from the recipe, ADR-0022 §2.6) and `comp.button.primary.bg.disabled` (Button expresses disabled with `opacity.disabled`). Two are bound in `Button.yaml`: `comp.button.secondary.border` as the `secondary` cell of `root.border`, and `comp.button.motion.press` as `press` in the `motion` block. ADR-0023 §4 relies on the latter.
6. **Literals in `sys`.** ADR-0020 §3 ("Other literals in `sys`", its rule 5, `sys/literal`) decides which `sys` values may be literals; the density and modality values of §7 and ADR-0023's reduced springs are literals under it. This ADR adds one rule: every `sys` token of type `typography` is a whole-value alias that resolves, directly or through other `sys` aliases, to a `ref.type.*` role. The role metadata (`slot`, `numeric`, `textStyle`, `darkWeight`) exists only on `ref.type.*` (ADR-0021 rule 1) and reaches `sys` only through folding, so a literal `sys` typography composite would have no text style and no weight rules. Checked by `tier/sys-literal`, which covers typography only; colors, font families, gradients and radius belong to ADR-0020's `sys/literal`.

### 6. The semantic role set (G-03, S6, B15, B25)

After this change, every path a spec binds exists as a `sys` role:

| Role (public path) | Declared in | Value |
|--------------------|-------------|-------|
| `type.<role>` for the 21 typography roles of `ref.type` (not `ref.type.scale`) | `tokens/sys/base.tokens.json`, no group `$type` | `{ "$type": "typography", "$value": "{ref.type.<role>}" }` |
| `elevation.0`, `.1`, `.2`, `.3` | `tokens/sys/color/light.tokens.json` and `dark.tokens.json`, group `$type: shadow` | the current `sys.shadow.flat`, `.raised`, `.floating` and `.overlay`, **renamed**, not aliased; `sys.shadow.drawer` stays |
| `gradient.vivid.default` and `gradient.vivid.1`–`4` | the same two files, group `$type: gradient` | `{ref.gradient.vivid.<name>}`. `default` is ADR-0022 §4.4's: light `sky`, dark `plum-dusk`. Slots: light `sky`, `olive`, `rose`, `orchid`; dark `plum-dusk`, `forest-moss`, `ember-night`, `navy-cyan`. Slot 1 is the default pair; slots 2 and 3 keep one hue family across the schemes (green, warm); slot 4 pairs the remaining two |
| `motion.easing.*` | `tokens/sys/motion/default.tokens.json` | ADR-0023 §9 |
| `border.hairline`, `.strong`, `.focus` | `tokens/sys/base.tokens.json`, group `$type: dimension` | `{ref.border.hairline|strong|focus}` (1, 1.5 and 2 px): the widths of hairlines and focus rings |
| `size.card.min` | `tokens/sys/base.tokens.json` | `{ref.size.card.min}` (bound by patterns, `spec/patterns/README.md:21`) |
| `size.hit` | modality, unchanged | spec prose names `size.hit`, never `size.hit.touch` or `size.hit.pointer` |

- **Type roles.** ADR-0021 takes type out of density, so the roles live only in `sys/base`, and the unused `sys.type.body-line-height` leaves the density files. A role whose source value one day depends on a runtime axis moves to that modifier's files and leaves `sys/base`; the dead-write check (ARCHITECTURE §5.6) rejects declaring it in both.
- **Elevation.** Renaming keeps one public name per level and needs no `sys` → `sys` alias.
- **Gradient slots.** They are brand-agnostic and scheme-safe.
  - IR invariant `gradient/scheme-mismatch`: in every permutation whose base scheme is S, each `sys.gradient.*` token resolves to a gradient whose `app.prism.scheme` is S. It is ADR-0022's `gradient/default-scheme` widened from `default` to every `sys.gradient.*` token: one check with one code, the name ADR-0020 rule 3 uses when it runs the check per brand.
  - The Surface and Card `vivid` prop takes a slot (`"1"` to `"4"`) and binds `gradient.vivid.<slot>`. Unset, it binds `gradient.vivid.default` (ADR-0022 §4.4). The brand-named values leave the specs.
  - The slots exist because a vivid 2×2 needs four distinct gradients.
  - `default` and slot 1 resolve alike today: `default` names the unset case, a slot names an explicit choice. A later change of the default look edits `default` only.
  - The contrast pair `gradient.vivid.*` checks the gradients of the context's scheme.
- **Grain (B15).** There is no `opacity.grain`, as ADR-0022 §2.6 also says. Grain belongs to the token a surface draws: the bound gradient (`app.prism.grain`, folded into `IRGradient.grain`) or the glass recipe's `grain` token (ADR-0022 §2.1). `Surface.yaml` drops its `grain.opacity` binding. On the web, the gradient renderer emits the derived declarations `-grain`, `-bloom-alpha` and `-bloom-blur`, with neutral values `0`, `0` and `0px` when absent. Swift already has `DSGradientToken.grain` and the bloom fields.

### 7. Control height and hit area (C-18, B24)

1. **Among the modifiers, density owns the visual sizes.** The three density files declare `sys.size.control.sm|md|lg` and no `$root`:

   | Density | `sm` | `md` | `lg` |
   |---------|------|------|------|
   | compact | 28 | 32 | 40 |
   | regular | 32 | 40 | 44 |
   | comfortable | 44 | 48 | 52 |

   - `md` keeps today's per-density value. Regular equals today's `sys/base` values, so a regular context draws Button as today; the resolver default itself moves to compact (ADR-0019 §1.5).
   - Compact `sm` equals the pointer hit size (28), so no compact control is smaller than its pointer hit area. Comfortable `sm` equals the touch hit size (44), so no comfortable control needs an invisible extension. `lg` 52 is today's `ref.size.control.xl`.
   - `sys/base` stops declaring `sys.size.control.*`, and `comp.button.height.*` follows density through its existing aliases.
   - The values are literals, like the rest of the density files (ADR-0020 §3). `ref.size.control.*` is then referenced by nothing and is deleted in the same change.
2. **Modality owns only the hit area** (`sys.size.hit`: 28 pointer, 44 touch) and `sys.interaction.*`. The ownership globs (§9) forbid a modality context from writing any other `sys.size.*` id.
3. **Implementation contract.** An interactive element's hit region is the larger of its visual size and `size.hit` on each axis. It extends invisibly around the visual box, as `Button.yaml:115` already says, and the visual box never grows with modality.
4. ADR-0010's density bullet no longer lists `size.hit.*`. visual-dna principle 13 becomes: "controls follow `size.control.*` by density (md 32 / 40 / 48); the hit area follows `size.hit` by modality (28 / 44)". The default contexts per platform, and which one the web `:root` carries, are ADR-0019 §1 and §2's.

### 8. The brand type scale (S8)

The multiplier's id is `ref.type.scale`: `{ "$type": "number", "$value": 1 }` in `tokens/ref/typography.tokens.json`. The own `$type` is required because `ref.type` is typed `typography` (§3). A brand writes that id, never `ref.brand.type-scale`. Which `ref` ids a brand may override, and that the reference brand declares none, is ADR-0020's; its bounds are ADR-0021's.

### 9. Orthogonality: id ownership and the gate (U-02, O6)

1. Orthogonality is defined on token ids, not types. The write sets of any two modifiers are disjoint, and each modifier writes only ids its ownership globs cover:

   | Modifier | Owns |
   |----------|------|
   | `brand` | `ref.**`, narrowed by ADR-0020 §1 to `BRAND_OVERRIDABLE` |
   | `platform` | `sys.font.**` (ADR-0022 §1.4 removes `sys.material.blur`) |
   | `colorScheme` | `sys.color.**`, `sys.material.**` (ADR-0022's recipes and `sys.material.glass.scrim`), `sys.shadow.**`, `sys.elevation.**`, `sys.gradient.**` |
   | `density` | `sys.space.**`, `sys.size.**` except `sys.size.hit` (no `sys.type` id: ADR-0021) |
   | `modality` | `sys.size.hit`, `sys.interaction.**` |
   | `motion` | `sys.motion.**` |

   Sets are not modifiers. They may declare ids that do not vary, anywhere, but a set declaration that a later layer always overwrites is a dead write and an error. Token types may repeat across modifiers, and the "one modifier per `$type` family" grouping is dropped. Order-independence depends on ids, and the type grouping was already false (U-02). The single machine copy of this table is `OWNERSHIP` in `tools/tokens/config.ts`; `tokens/README.md` mirrors it (§13).
2. **The gate.**
   - `pnpm tokens:lint` (P1-2; a root pass-through to `@iiiivaska/prism-tools`, like `tokens:build`) runs `tz lint`, for DTCG strictness with the naming rule at `error`, then `lint-orthogonality.ts`.
   - `lint-orthogonality.ts` parses the resolver with `@terrazzo/parser` and a `permutationLimit` of at least the product of the context counts, because Terrazzo withholds `listPermutations` above its default of 1000 (T3). It requires `resolver.orthogonal === true` and `listPermutations().length` equal to that product. Terrazzo's check names no id (T3), so on failure the script walks the modifier contexts of `resolver.source` itself and prints every id that two modifiers write.
   - `tz lint` alone proves nothing about orthogonality (T3).
   - From P1-3 on, `tokens:build` is authoritative. Its source checks cover disjointness, ownership, context completeness, dead writes and group types. Its IR analysis covers one runtime axis per token, the exhaustive composition proof and disjoint increased-contrast and reduced-transparency deltas (ARCHITECTURE §5.6, §5.7).
3. ADR-0004 rule 2 now reads: "A modifier writes only the token ids its ownership globs cover, and no id is written by two modifiers; `pnpm tokens:lint` and `tokens:build` fail otherwise."
4. The P1-2 acceptance becomes: "`pnpm tokens:lint` exits 0 on the repository with 432 permutations, and exits 1 on `tools/tokens/fixtures/non-orthogonal/` (the repository copied with `density/compact` also writing `sys.interaction.hover`), naming that id."
5. **Contexts without a delta stay.** After ADR-0022 §1.4, the two `-reduced-transparency` contexts and the `watch` platform context carry no token delta. ADR-0022 leaves their fate to ADR-0019 and this ADR. They stay in the resolver:
   - each loads only its base file (`"light-reduced-transparency": [ light ]`, `"watch": [ apple ]`), and the empty delta files are deleted;
   - the transparency axis stays in every generated context type, which ADR-0019 §1 maps to `data-ds-transparency`, and the `watch` context still feeds the colorsets' `watch` entries (ARCHITECTURE §9.8);
   - ΔRT is empty, and the product stays 432 permutations;
   - a future delta adds its file back without a structural change.

### 10. Schema validation (U-01)

The two schema bundles are vendored:

- `tools/tokens/schema/dtcg-2025.10/` holds `format.json` and `resolver.json`, byte-identical to `https://www.designtokens.org/schemas/2025.10/{format,resolver}.json` as published on 2026-09-15 (T7), a `SHA256SUMS` file for those two, and `LICENSE.md` with the full text of the W3C Software and Document License, which that license requires on every copy.
- `tools/tokens/validate.ts` (`pnpm tokens:validate`) first checks the vendored bytes against `SHA256SUMS`. It then compiles each schema in its own Ajv 8 instance with `ajv-formats` (a new catalog entry, `^3.0.1`), offline; one shared instance fails (T7). It validates `tokens/**/*.tokens.json` and `brands/*/brand.tokens.json` against `format.json` and `tokens/prism.resolver.json` against `resolver.json`. It prints file and JSON pointer for each error and exits 1 on any.
- The `contracts` job runs that script in place of the curl and `npx` lines, and the three `DTCG_*` environment variables go.
- A refresh is a deliberate change: download, update `SHA256SUMS`, review the diff.
- `licenses/inventory.json` gets an entry with `spdx` `W3C-20150513`, the one outbound license the source repository states (T7), and a note that it takes contributed software under the W3C 3-clause BSD License. `permitted_use` is `adapt-with-attribution` and `packaged` is false. `THIRD_PARTY_NOTICES.md` is regenerated from it.
- The schema checks structure only (T7); §1 to §5 are Prism's own checks.

### 11. Generated output: owned roots, stale check, flavors (C-13, O3)

1. **Stale check.** The token writer owns five roots (ARCHITECTURE §9.0):
   - `web/packages/tokens/src/generated`;
   - `swift/Sources/DSTokens/Generated`;
   - `swift/Sources/DSTokens/Resources/Colors.xcassets`: only the catalog, because `Resources/` also holds fonts;
   - `swift/Tests/DSTokensTests/Generated`;
   - `tokens/export`.

   `config.ts` `OWNED_ROOTS` is the one list. ADR-0021 §11 adds a sixth root, `swift/Sources/DSTokens/Resources/Fonts`, in P1-8; its web fonts land inside the first root. The P0-3 mechanism is confirmed: CI runs `tokens:build`, then `git status --porcelain -- <roots>`, and fails on any output, which also catches untracked files. The CI list must equal `OWNED_ROOTS`: today that adds the two missing roots and narrows `Resources` to the catalog. A test asserts the equality and that no root is ignored by `.gitignore`.
2. **Flavors** live in `tokens/export/`: `tokens-studio/**`, `figma/<brand>/<colorScheme>.json` and a generated `README.md`. They are committed, named `*.json` and never `*.tokens.json`, and never hand-edited (ADR-0005 rule 2). No resolver source may point into `tokens/export/` (`source/export-path`).
3. ADR-0014's layout line for `tokens/` gains "`export/` holds generated flavors". Its rule 1 reads: "Nothing outside `tokens/`, `spec/` and `brands/` is a source of truth for values, and the generated `tokens/export/` is not one either."
4. The `dist/` layouts in `docs/research/arch-tokens.md` §7.2 and `docs/research/arch-web.md:223` are superseded.

### 12. Colors in the flavors (G-12)

No flavor pre-composites a translucent color.

- **Figma-native:** `{ "colorSpace": "srgb", "components": [r, g, b], "alpha": a, "hex": "#rrggbb" }`. The components are the CSS-gamut-mapped sRGB color to 4 decimals. `alpha` is the authored alpha to 3 decimals. `hex` is the 6-digit DTCG fallback of the same color without alpha.
- **Tokens Studio:** a literal color is `#rrggbb` when opaque and `rgba(R, G, B, A)` when its alpha is below 1. R, G and B are the 0–255 integers of the gamut-mapped sRGB color; A is the alpha through Prism's number formatter (3 decimals). Eight-digit hex is never used: Tokens Studio reads it as ARGB and CSS as RRGGBBAA (T8). The same rule applies to `boxShadow` colors and `linear-gradient()` stops. An alias with `alpha` stays an alias with ADR-0020 §3's `studio.tokens` alpha modifier.
- A consumer that reads only `hex` gets the base color and must also read `alpha`. ADR-0004's claim that the hex fallback serves hex-only consumers holds only for opaque colors.
- Flavor tests (P1-5) assert two things. Each translucent source color (80 today) keeps its alpha in every flavor file that exports it. No color string under `tokens/export/` is a `#` value longer than 7 characters.
- The owner's manual imports (ARCHITECTURE V3, V4) confirm that Figma keeps a translucent variable's alpha (T9 leaves it open) and that Tokens Studio reads `rgba()`.

### 13. Checked documentation (C-19)

1. **Living documents:** the root `README.md`, `tokens/README.md`, `tools/tokens/README.md`, `brands/README.md`, `spec/SCHEMA.md`, `spec/patterns/README.md` and `agent/SKILL.md`. ADRs and `docs/research/` are records and are not checked. Spec prose is checked by `spec:validate` (§5.2).
2. **Token paths.** The check reads inline code spans and the scalar values of fenced `yaml` blocks, which is where `spec/SCHEMA.md` keeps its examples.
   - **What counts as a token path:** a string that starts with `ref.`, `sys.` or `comp.`, or whose first segment is a `sys` category, followed by dot-separated kebab-case segments; an id may end in `.$root`. A component name counts only after `comp.`, so `surface.vivid` or `text.primary` is not a candidate.
   - **Not token paths:** strings with a `/`, strings that end in a file extension other than `.md` (`motion.css` is a file, while `type.body.md` is a token), and strings in `{…}` alias form. Documents can therefore still show what is invalid.
   - **Expansion:** segments may use `a|b|c` alternation, `N…M` for every numeric sibling from N to M (all of which must exist), `*` for exactly one segment and `**` for one or more, as in the ownership table.
   - Every plain path must resolve through `lookup()` to a token, and every glob must match at least one token id.
3. **Emitted names.** From P1-5, three kinds of backticked name must appear in `manifest.json`:
   - `--ds-…` custom properties: a manifest `css` name, or one plus a derived suffix of ARCHITECTURE §8;
   - Tailwind utilities containing `-ds-`, after variant prefixes and an opacity modifier are stripped: a manifest `tailwind` entry;
   - Swift accessors `DS<Type>.<member>` whose type occurs in the manifest's `swift` names: a manifest `swift` entry.

   `data-ds-…` attributes are checked against the manifest's `runtime` section (ADR-0019 §3). The names themselves come from ARCHITECTURE §8, §9 and ADR-0019.
4. **Vocabulary and ownership.** The README's `sys.color` segment list must equal the set of non-numeric segments in `sys.color.*` ids, `$root` excluded: 48 today, and ADR-0022's `on-glass-light`, `on-glass-secondary` and `on-glass-tertiary` add three. A new segment therefore needs its README line in the same change, which makes the vocabulary closed in practice. The README's ownership table must equal `config.ts` `OWNERSHIP`. The positional grammar `tier.category.property.role[.prominence][.state]` is dropped because the ids never followed it.
5. `tools/tokens/docs.test.ts` implements items 2 to 4 (items 2 and 4 with P1-3, item 3 with P1-5) and runs in the `web` job. The full list of names stays in the generated `manifest.json`; the README keeps examples.

### 14. `tokens:diff` before 1.0 (O4)

The classification stays as ARCHITECTURE §11 defines it. The policy is derived from the base release tag, not from a flag:

- while the base tag's major is 0, the policy is `shifted`: required major becomes minor, minor becomes patch, and patch stays patch;
- from 1.0 on, the policy is `strict`.

The base tag is `lastReleaseTag()`; with `--base <ref>`, it is the newest release tag merged into that ref. `--pre1` is removed, the summary prints the policy used, and "no tag yet" still exits 0 with a notice. Shifting matches npm's caret ranges, under which 0.*y* is the breaking position (T10). It also keeps the roadmap's 0.1.0 → 0.2.0 plan: under `strict`, the first token removal after v0.1.0 would force 1.0.0 (T10). Reaching 1.0 is a deliberate major changeset, which always satisfies the check. SwiftPM's `from:` would accept a breaking 0.*y*, so while Prism is 0.x Swift consumers depend with `.upToNextMinor(from:)`, and the agent skill says so.

## Alternatives considered

- **Leaf tokens instead of `$root`** (C-02's second option): `color.bg.surface` would become something like `color.bg.surface.base`. That churns 18 contrast pairs and the specs and adds a segment agents must remember, while both engines resolve `{x.$root}` (T2) and the naming rules already drop it.
- **Accept `{group}` as sugar, as Terrazzo does:** invalid DTCG (T1), and Style Dictionary throws (T2). A source that only one engine reads is not portable.
- **Rely on Prism's own-document typing (ARCHITECTURE §5.4) alone:** `tz lint`, and any future engine that types merged trees, would still fail (T4). An explicit `$type` costs one key per token.
- **Component tokens only, as ADR-0002 reads:** every role binding would gain a pass-through, about 35 in Text and about 20 in Surface, with no behavior of its own and more names for agents to pick between.
- **Free mixing (status quo):** there is no criterion, 31 orphans have accumulated, and nothing stops a spec from binding another component's tokens.
- **`sys.elevation.<n>` as aliases of `sys.shadow.*`** (ARCHITECTURE S6): two public names per level and the first `sys` → `sys` alias, for nothing.
- **Bind `shadow.*` and drop `elevation`:** it rewrites the four-level vocabulary of ADR-0009, ADR-0002 and the README, plus the regex.
- **Keep brand-named gradients in `sys`:** the names belong to the reference brand, and a light gradient named in a dark scheme is wrong.
- **Only ADR-0022's `default` gradient, without slots:** a vivid 2×2 needs four distinct gradients per scheme.
- **Slot 1 as the default, without a `default` token:** the unset case and an explicit slot would share one name, so moving the default look would also move every card that chose slot 1. ADR-0022 §4.4 picks the default pair on contrast evidence.
- **Keep `ref.size.control.*` as the control ladder:** the density files could alias only four of the six values (28 and 48 have no step), and a primitive nothing references misleads agents, the reason ADR-0022 deletes `ref.opacity.glass.*`.
- **Drop the empty contexts** (288 permutations without the reduced-transparency pair, 192 without `watch` too): ADR-0019's transparency attribute would lose its context, the colorsets their `watch` entries' source, and a future delta would need a structural change.
- **`sys.opacity.grain`:** one global number would contradict the per-gradient (0.05–0.10) and per-material (0.04 or 0) values and add a third copy.
- **Control height by modality (40 pointer / 44 touch):** loses ADR-0010's density lever (compact desktop, comfortable watch).
- **Control height by density and modality together:** six values per size, and a token that depends on two runtime axes, which ARCHITECTURE §5.7 rule 2 forbids.
- **A custom `$type: "boolean"`:** not DTCG, so the schema rejects it (T7).
- **Plain 0 and 1 numbers:** the generated APIs become `Double` and `number`, and agents compare against 1.
- **Type-level orthogonality** (Terrazzo's FAQ): already false today, and not what makes the output order-independent.
- **`tz lint` as the gate:** it passes a non-orthogonal resolver (T3).
- **Keep downloading the schemas:** network access on every run, and `npx --yes` installs dependencies outside the lockfile. Tests and local runs could not use the same validator offline.
- **Flavors inside `web/packages/tokens`:** they are not runtime artifacts and would ship in npm.
- **A new top-level folder for flavors:** changes ADR-0014's layout for no gain.
- **Uncommitted flavors:** Tokens Studio's Git sync and a designer's import need a stable path.
- **`#rrggbbaa` for Tokens Studio:** its documentation reads eight digits as ARGB (T8).
- **Pre-composited flavor colors:** there is no single backdrop to composite over, and the result would misstate the token.
- **Generate the README's token lists:** needs a writer inside a hand-written file, outside the owned roots, while `manifest.json` already lists everything.
- **Treat a component's name as a token-path prefix in documents:** words such as `surface.vivid` and `text.primary` would be checked as tokens and fail.
- **Strict `tokens:diff` before 1.0:** jumps to 1.0.0 at the first removal (T10).
- **A `--pre1` flag:** one more setting CI must remember; the tag already carries the answer.

## Consequences

- **Easier.**
  - There is one way to reference, name and type a token, and `tz lint` and the schemas accept the changed source (T6).
  - Every spec path resolves once the source changes and the P2-1 spec migration land.
  - Button follows density.
  - Gradients switch with the scheme.
  - Flavors keep translucency.
  - Schema validation is offline and locked.
  - Documents cannot drift from the ids without failing a test.
- **Fewer tokens.** 29 component tokens are deleted and two are bound. Three component files and their resolver entries go, and so do the four unreferenced `ref.size.control.*`.
- **Rewritten.** The token files, the four slice specs, the README vocabulary, `brands/README.md` (with ADR-0020's rewrite) and the skill's names all change. The specs follow ADR-0006: both manifests are empty today, so a `specVersion` bump costs no parity lag.
- **New checks.**
  - P1-3 adds `ref/group-reference` (already designed), `ref/json-pointer`, `source/name-case`, `type/group-type-mismatch`, `type/flag-value`, `extension/alias-override`, `tier/alias-direction`, `tier/sys-literal`, `naming/root-default-collision`, `source/export-path` and the IR invariant `gradient/scheme-mismatch`.
  - P2-1's validator gains bindable categories, own-component `comp` tokens, orphans and prose paths.
- **Vendoring costs.** The repository carries about 127 KB of third-party JSON with a license text and an inventory entry. An upstream republish goes unnoticed until someone refreshes the copy, which is acceptable for a stable, versioned specification.
- **Folded extensions.** An alias can no longer override one (ARCHITECTURE §5.4 said it could); ADR-0020's `alpha` is the defined exception. An ADR that needs another override for its key amends §4.1.
- **Built on the other decisions of 2026-09-15:**
  - ADR-0019: per-platform default contexts, the web `:root` permutation and the emitted names that §13.3 checks;
  - ADR-0020: the brand allowlist, the `sys` literal rule, semantic color aliases and `alpha`;
  - ADR-0021: type out of density, `textStyle`, `darkWeight` and the font root;
  - ADR-0022: typed glass recipes, the default gradient and the glass fallback;
  - ADR-0023: easing roles, the crossfade flag, the `motion` block and Reduce Motion.
- **Left open:** the binding-matrix grammar (G-06, P2-1).

## Rules that follow

1. References are curly-brace references to whole tokens, and a group's base token is referenced as `{group.$root}`. `{group}` and JSON Pointer `$ref` values fail `tokens:build` (`ref/group-reference`, `ref/json-pointer`, one `fixtures/broken/<code>/` tree each, P1-3).
2. Token and group names are lowercase kebab-case, digits allowed, and `$root` is the only `$` name. Checked by `source/name-case` in `tokens:build` (P1-3) and by `core/consistent-naming` at `error` in `pnpm tokens:lint` (P1-2).
3. A token without its own `$type` agrees with every group `$type` on its path in every document. Checked by `type/group-type-mismatch` (P1-3) and, on the merged tree, by `tz lint` (T4).
4. Folded extension keys are declared only on literal tokens, where an alias is a token whose whole `$value` is one reference. ADR-0020's `alpha` is the exception and is declared only on aliases (`extension/alias-override`, P1-3).
5. Booleans are `number` tokens with `app.prism.flag: true` on every declaration and a value of 0 or 1. Checked by `type/flag-mismatch` and `type/flag-value` (P1-3), and by the flag emission tests (P1-4, P1-5).
6. Aliases never point up a tier, and every `comp` token is a whole-value alias of a `sys` token (`tier/alias-direction`, IR invariant, P1-3). Every `sys` typography token is a whole-value alias whose chain ends at a `ref.type.*` role (`tier/sys-literal`, P1-3); every other `sys` literal follows ADR-0020 rule 5 (`sys/literal`).
7. Spec `tokens` and `motion` blocks bind public `sys` paths in the bindable categories, or the spec's own `comp.<component>.*`, and ADR-0023 rule 9 narrows the `motion` block. Token paths in `behavior`, `accessibility`, `usage` and `notes` resolve. Every `comp` token is bound by its component's spec, and every `sys` category is classified as bindable or not. Checked by the schema regex and `spec:validate` (P2-1), with fixtures for another component's token, an orphan, an unclassified category and an unknown prose path.
8. Among the modifiers, only density writes visual sizes (`sys.size.*` except `sys.size.hit`), and only modality writes `sys.size.hit`. Checked by the ownership check and the composition proof in `tokens:build` (P1-3). Components extend their hit region to `size.hit` on each axis without growing the visual box; checked by the Button interaction tests of P3-1 (DSCore) and P3-4 (React) under both modalities.
9. Every `sys.gradient.*` token, `default` and the slots `1` to `4`, resolves in each base scheme to a gradient whose `app.prism.scheme` is that scheme. Checked by the IR invariant `gradient/scheme-mismatch` (P1-3, fixture `fixtures/broken/gradient-scheme-mismatch/`), which widens ADR-0022's `gradient/default-scheme` and which ADR-0020 rule 3 runs per brand.
10. Modifier write sets are disjoint and inside their ownership globs. `pnpm tokens:lint` (P1-2) and the `tokens:build` source checks (P1-3) pass on the repository and fail on `fixtures/non-orthogonal/`, naming the overlapping id. A context whose delta is empty stays in the resolver, so the permutation count stays the product of the declared contexts. `lint-orthogonality.ts` and `repo.test.ts` assert 432.
11. Token files validate against the vendored DTCG 2025.10 schemas, whose bytes match `SHA256SUMS`. Checked by `pnpm tokens:validate` in the `contracts` job and `validate.test.ts`, whose broken fixture must fail (P1-1).
12. Token output exists only in `OWNED_ROOTS`, and CI's stale-check list equals it (five roots, six from P1-8), with none ignored by git. Checked by `tools/tokens/output/roots.test.ts` and the CI `git status --porcelain` step (P1-5).
13. `tokens/export/` holds only generated files, the `*.json` flavors and `README.md`, and no resolver source points into it. Checked by `source/export-path` (P1-3) and the writer's ownership (P1-5).
14. Flavors keep alpha. Figma colors carry `alpha`; Tokens Studio writes a translucent literal as `rgba()` and an alias with `alpha` with ADR-0020's modifier; 8-digit hex never appears. Checked by the flavor tests (P1-5).
15. Living documents name only existing token paths and emitted names, and their `sys.color` segment list and ownership table equal the source (`tools/tokens/docs.test.ts`: paths, vocabulary and ownership with P1-3, emitted names with P1-5).
16. `tokens:diff` applies `shifted` while the base release tag is 0.x and `strict` from 1.0 (`diff.test.ts`, P1-7).
