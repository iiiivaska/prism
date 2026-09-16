# tools/tokens architecture (Phase 1: P1-3 to P1-8)

This is the design the Phase 1 implementers follow. It covers the resolver driver (P1-3), the transforms (P1-4), the formats (P1-5), the interfaces that contrast (P1-6) and diff (P1-7) consume, and the entry point of the font check (P1-8). It also lists the source fixes that P1-1 and P1-2 must land first.

- **Status:** accepted design, written 2026-09-15 against commit `2da5712` plus the uncommitted P0 work in the tree (gated `ci.yml`, `tools/tsconfig.json`, `tools/vitest.config.ts`, corrected `tokens/README.md` Motion section). Revised the same day for ADR-0019 to ADR-0024, which decided the open questions O1–O7 of §16.3; every design section below follows them.
- **Implementation status (2026-09-15):** P1-1 to P1-8 are implemented and marked done in `docs/roadmap.md`; P1-9 (2026-09-16) folded the direction-board sign-off into the tokens (ADR-0029, ADR-0030), so the repository builds its 576 permutations with zero diagnostics, and every Phase 1 gate file of §14 exists, so each gated CI step runs. Where the implementation departs from this design, §16.3 records it. One value changed after §14 was written: light `chart.target` and `chart.comparison` are ink at alpha 0.45, not 0.3 (§14 P1-2), because P1-6's boundary pairs on `chart.plot` (critic G-14) need 3:1 (ADR-0011; ink 0.3 is 2.01:1, ink 0.45 is 3.08:1 on the white plot), following `docs/research/a11y-reconciliation.md` §8.1 option 1.
- **Basis:** the "IR-first thin driver" design (the judges' consensus winner), with ideas grafted from the "SD-maximal" and "output-first" designs and every judge must-fix applied.
- **Evidence:** every library fact marked *(verified: …)* was re-checked on 2026-09-15 against the versions this repository actually resolves (`tools/node_modules`: style-dictionary 5.5.3, colorjs.io 0.5.2, motion 13.2.0, @terrazzo/cli 2.7.1, vitest 4.1.11, typescript 6.0.3) or, for packages the tools package does not install yet, against scratch installs (@terrazzo/parser 2.7.1, tailwindcss and @tailwindcss/node 4.3.3, jsonc-parser 3.3.1, @tokens-studio/types 0.5.2), on Node 24.21.0 and Xcode 26.6 with the iOS 26.5 and watchOS 26.5 simulators. §15 lists them. The probes lived outside the repository; the tests in §14 turn each one into a permanent check.
- **Precedence:** where this document disagrees with `tokens/README.md` or `tools/tokens/README.md`, those READMEs were updated in the same change to match. Where it disagrees with an ADR, the ADR wins; report the disagreement instead of implementing either reading. The decisions behind §9 (web runtime), §5.6 and §9.7 (brands), §3.3 and §7.7 (typography), §7.12 (materials), §7.6 (motion) and §5 and §11 (source conventions) are ADR-0019 to ADR-0025.

Rules for implementers:

1. Everything written into the repository is English.
2. Tools run from TypeScript source on Node 24: erasable syntax only (no `enum`, `namespace` or parameter properties), `import type` for type-only imports, `.ts` extensions in relative imports (`tools/README.md`, "How tools run").
3. Do not create a file that opens a CI gate before its ticket is complete. The `plan` job opens `tokens:lint` when `tools/tokens/terrazzo.config.ts` exists (P1-2), `tokens:build` when `tools/tokens/build.ts` exists (P1-5), `contrast:check` when `tools/contrast/check.ts` exists (P1-6) and `tokens:diff` when `tools/tokens/diff.ts` exists (P1-7); P1-8 adds a `fonts:check` gate on `tools/fonts/check.ts`. `pnpm tokens:validate` (P1-1) replaces the ungated schema step and needs no gate (ADR-0024 §10).

---

## 0. Summary

```
tokens/prism.resolver.json ─┐
tokens/**/*.tokens.json ────┼─► source/model.ts ─► source/analyze.ts      (orthogonality, ownership, completeness,
brands/*/brand(.tokens).json┘      SourceModel        brand rules, dead writes, group $type, names, literals)
                                        │
                        resolver.ts  [DELETABLE]  enumerate() → 576 inputs; merge(input) → { tree, provenance }
                                        │
                        engine/sd.ts   one Style Dictionary 5.5.3 instance per permutation, strictly sequential
                                        preprocessors prism/validate, prism/dtcg-types; transform prism/normalize
                                        dictionary = await sd.getPlatformTokens('ir')
                                        │
                        engine/to-ir.ts dictionary → PermutationIR (plain data)
                                        │
                        ir/bundle.ts    IRBundle (all permutations) + invariants
                        ir/typography.ts ADR-0021 weight rule (dark, Increase Contrast, Bold Text)
                        ir/analyze.ts   dependency axes, exhaustive composition proof, variant deltas, invariances
                                        │
          ┌─────────────────────────────┼──────────────────────────────┐
          ▼                             ▼                              ▼
   formats/*  pure (bundle) → OutputFile[]    api.ts (P1-6, P1-7, P1-8, P2-1)    normalize.ts (source hygiene)
   verify/*   cascade simulator, table evaluators
          │
   output/write.ts  owned-directory sync | --check
```

Key decisions:

1. **Style Dictionary does what its future native resolver will still do**: DTCG typing (through a Prism preprocessor that fixes SD's type precedence), alias resolution with broken-reference errors, and transform orchestration. It runs in memory, sequentially, once per distinct document stack: permutations that apply the same documents in the same order (a reduced-transparency context = its base file) share one run's output, so the 576 permutations need 384 runs today (192 for 432 before P1-9, when `watch` was [apple]); the IR is still built per permutation (§6). Prism does not use SD formats or any SD built-in transform.
2. **`resolver.ts` holds only enumeration, merge and provenance** (about 150 lines). Parsing and every source check live in `source/` and survive when SD ships a `resolver` option (issue #1590).
3. **Merge follows DTCG Resolver 2025.10 exactly**: a later declaration of a token id replaces the whole token; groups merge; aliases resolve only after the merge.
4. **One transitive, idempotent, plain-data normalizer** (`prism/normalize`) turns every DTCG value into an `IRValue`. Functional extensions (`spring`, `slot`, `numeric`, `textStyle`, `darkWeight`, `opsz`, `flag`, gradient `angle`/`grain`/`scheme`/`temperature`/`bloom`) are folded into the value, so they flow through aliases; an alias never declares one (`extension/alias-override`, ADR-0024 §4.1). ADR-0020's `alpha` is the one exception: it is declared only on `sys` color aliases and replaces the alpha of the resolved target. Material recipes are ordinary typed tokens (ADR-0022): no extension keys, no defaults.
5. **The IR is plain data and every format is a pure function** of the bundle. Cross-permutation outputs (CSS modes, colorset appearances, Swift and TS tables, Figma flavors) are possible only there, because an SD format sees one dictionary.
6. **Orthogonality is proven on every build**, over resolved values of the full product: write-set disjointness, ownership, context completeness, disjoint increased-contrast and reduced-transparency deltas, and an exhaustive composition proof. `tz lint` cannot do it *(verified)*; `tokens:lint` adds Terrazzo's parser API as a second opinion.
7. **Web runtime contract** (ADR-0019): `data-ds-color-scheme` and `data-ds-density` nest on any element; `data-ds-contrast`, `-transparency`, `-modality` and `-motion` act on `<html>` only. When an attribute has no valid value (absent, empty or unknown), the axis follows its media query: density `(any-pointer: coarse)` → regular, modality `not all and (hover: hover) and (pointer: fine)` → touch. One table in `config.ts` (`WEB_RUNTIME`, `PLATFORM_DEFAULTS`) drives every output, including `runtime.ts`. `var()` chains, a rescope block for nested scopes, compound delta blocks for contrast and transparency, `@media (color-gamut: p3)` twins, `@supports not (… linear() …)` twins, all inside `@layer ds.tokens`.
8. **Tailwind keeps the README names** (`bg-ds-page`, `text-ds-primary`, `bg-ds-accent`) through Tailwind 4's per-utility theme namespaces, guarded by a build-time utility-collision check and a compile test, plus one composite `type-ds-<role>` utility per type role (ADR-0019 §3).
9. **Swift**: colors come from `Colors.xcassets` (Any, Dark, High Contrast, Dark + High Contrast, plus a `watch` idiom entry that carries the dark value); everything else comes from a value type `DSTokenSet(DSTokenContext)` built from per-axis `switch` tables; watch-only deltas use `#if os(watchOS)`. Every repo brand ships in DSTokens (ADR-0020): `DSTokenContext.brand` selects it once per scene; colorsets live in one `Colors.xcassets/<namespace>/` folder per brand with distinct colors; `DSTokenSet.color` is `DSColor(brand:transparency:)`; members whose value differs by brand switch on `c.brand`; shapes are the union over brands. DSCore starts from `DSTokenContext.platformDefault` (ADR-0019 §2).
10. **Springs** (ADR-0023): settle is the last whole millisecond at which the step response is at least 0.001 from its target (floor). CSS `linear()` is sampled every millisecond from Motion's physics generator with near-zero rest thresholds, simplified by Ramer–Douglas–Peucker on vertical distance (tolerance 0.002) and serialized by Prism; the emitted curve stays within 0.0025 of the closed form. Parity with SwiftUI samples `Spring.value`, never `Spring.settlingDuration` (ADR-0023 §11).
11. **Flavors** (Tokens Studio, Figma-native) are committed under `tokens/export/`, named `*.json`, outside the `*.tokens.json` schema glob, and keep every translucent color's alpha (ADR-0024 §11, §12).
12. **Determinism**: canonical ordering, one number formatter, Prism-owned serializers, owned-directory sync with `--check`, a double build with shuffled read order in tests.

---

## 1. Prerequisite source fixes

The current token source fails the first build. Each row names the ticket that owns the fix. P1-3 and P1-4 develop against fixtures; tests that build the real repository are marked `todo` until the fix lands.

| # | Defect | Evidence | Fix | Owner |
|---|--------|----------|-----|-------|
| S1 | `sys.material.*` has no `$type` on the token or any ancestor in `sys/color/{light,dark,light-reduced-transparency,dark-reduced-transparency}.tokens.json`. | `tz lint` exits 1: `parser:init: Cannot alias to $type "undefined" from $type "color"` at `comp.card.glass.fill` *(verified)*. SD passes the tokens through untyped *(verified)*. | Give every token under `sys.material` its own `$type`. The `sys.material` group takes none, because a recipe mixes color, dimension and number tokens (ADR-0022 §2.2). | P1-2 |
| S2 | `comp.card.solid.bg` and `comp.surface.solid` reference the group `{sys.color.bg.surface}`. | DTCG Format §6.2: a reference to a group is invalid; write `{group.$root}` *(verified: spec)*. SD throws `{comp.card.bg} tries to reference {sys.bg.surface}, which is not defined` *(verified)*. | Write `{sys.color.bg.surface.$root}` in `comp.card.solid.bg`; `comp.surface.*` is deleted (S21, ADR-0024 §5.5). | P1-2 |
| S3 | The `reduced` context of `motion` loads only `sys/motion/reduced.tokens.json`, which lacks `sys.motion.duration.instant`, `duration.quick`, `spring.interactive` and `spring.smooth`. Those tokens do not exist in 216 permutations. | Completeness check on the resolved product *(verified: prototype; token counts 393/394/397/398 per permutation)*. | Resolver: `"reduced": [ default, reduced ]`, the layering the colorScheme variants already use (ADR-0023 §8.1). | P1-2 |
| S4 | `sys.material.glass.cell` exists only in `dark` and `dark-reduced-transparency`. | Same check *(verified)*. | Add `glass.cell` to `light` (ADR-0022 §2.5). The reduced-transparency files no longer declare materials (S16). | P1-2 |
| S5 | The reduced springs have `$value.duration` 250 / 250 / 300 ms and no `settle`; their derived settle is 367 / 367 / 440 ms. ADR-0023 adds a reduced `smooth` (0.30, 0), settle 440 ms. | Closed form and Motion's generator *(verified)*. | P1-2 authors 367 / 367 / 440 / 440 ms and `settle` 0.367 / 0.367 / 0.44 / 0.44 (snappy, sheet, bouncy, smooth); from P1-4 on, `pnpm tokens:normalize --check` (§7.13) must report nothing. | P1-2 (data), P1-4 (check) |
| S6 | Semantic roles the specs bind do not exist: `type.*` (e.g. `type.label.md` in `spec/components/Button.yaml`), `gradient.vivid.*` (ADR-0009, `contrast-pairs.json`), `elevation.0…3` (README, `Surface.yaml`), `motion.easing.*`, `border.*` and `size.card.min`. | Only `ref.type.*`, `ref.gradient.vivid.*`, `sys.shadow.*`, `ref.motion.easing.*`, `ref.border.*` and `ref.size.card.min` exist. | Per ADR-0024 §6: 21 `sys.type.<role>` aliases in `sys/base`, each with its own `"$type": "typography"`; `sys.shadow.flat\|raised\|floating\|overlay` **renamed** (not aliased) to `sys.elevation.0\|1\|2\|3` in `sys/color/light` and `dark`, `sys.shadow.drawer` stays; `sys.gradient.vivid.default` (light `sky`, dark `plum-dusk`, ADR-0022 §4.4) and slots `1`–`4` (light `sky`, `olive`, `rose`, `orchid`; dark `plum-dusk`, `forest-moss`, `ember-night`, `navy-cyan`) in the same two files; `sys.motion.easing.out\|in-out\|drawer\|hover\|linear` (whole-value aliases of the same-named `ref.motion.easing.*`, in `sys/motion/default.tokens.json`; ADR-0023 §9); `sys.border.hairline\|strong\|focus` and `sys.size.card.min` in `sys/base`; no `opacity.grain`. The generators are category-driven and pick them up without code changes. | P1-2 |
| S7 | `ref.motion.easing.inOut` is camelCase. | `tz lint` warning `core/consistent-naming` *(verified)*. | Rename to `in-out`, together with its alias in `ref.motion.spring.smooth` (`tokens/ref/motion.tokens.json:152`); `terrazzo.config.ts` raises `core/consistent-naming` to error (ADR-0024 §2). | P1-1 (rename), P1-2 (lint) |
| S8 | `brands/prism/brand.tokens.json` declares `ref.brand.type-scale`, a path the `ref` set does not declare; `brands/README.md` names the token `ref.type.scale`. | Brand-path check *(verified)*. | Add `ref.type.scale` (`1`, with its own `"$type": "number"` because `ref.type` is typed typography) to `ref/typography.tokens.json` (ADR-0024 §8); brands override it within [1, 1.25] (ADR-0021 §6). `brands/prism/brand.tokens.json` declares no tokens (ADR-0020 §1). | P1-1 (token), P1-8 (brand file) |
| S9 | `brands/README.md` whitelists brand overrides of `sys.color.bg.page`, `text.accent`, `text.on-accent`, `bg.fill.accent`. `colorScheme` writes the same ids later in `resolutionOrder`, so such a write is always overwritten and would also make the resolver non-orthogonal. | Resolver order. | Decided by ADR-0020: brands write allowlisted `ref.*` ids only (`config.BRAND_OVERRIDABLE`, the `brand` row of `OWNERSHIP`); the four ids alias `ref.color.slot.<scheme>.{bg-page,bg-fill-accent,text-on-accent,text-accent}` in their base scheme file. | P1-1 slots, P1-2 aliases, P1-3 checks |
| S10 | Number tokens used as booleans (`sys.interaction.*`, `sys.motion.presentation.crossfade`) carry no flag. | — | `"$extensions": { "app.prism": { "flag": true } }` on **every** declaration of `sys.interaction.hover`, `sys.interaction.tooltip` and `sys.motion.presentation.crossfade` (both motion files, because the reduced declaration replaces the whole token; ADR-0023 §10, ADR-0024 §4.2). `sys.material.blur.enabled` is deleted (S16). Diagnostics `type/flag-mismatch`, `type/flag-value`; generators then emit `Bool` / `boolean` (§7.11). | P1-2 |
| S11 | Type roles carry no Dynamic Type mapping and no explicit figures. | — | Add `app.prism.textStyle` (ADR-0021 §7 table) and an explicit `app.prism.numeric` (ADR-0021 §5) to every `ref.type.*` role; the build fails on a role without them (`type/role-metadata`). `sys.type.*` aliases inherit them (§5.4). | P1-1 |
| S12 | The Native preset puts SF names first in web stacks (`"SF Pro Text", "Inter", …`), and the Signature mono stack names `"SF Mono"` and `"Menlo"`. | `brands/prism-native/brand.tokens.json`; `tokens/ref/typography.tokens.json:23-30`. | Decided by ADR-0020 §5: web stacks list only served families and CSS generic keywords; new `ref.font.apple.{ui,display,mono}`, aliased by `sys/platform/apple.tokens.json`; `DSBrand.faces` comes from `platform=apple`. | P1-1, P1-2, P1-8 |
| S13 | 33 hued or ink color literals in `tokens/sys/**` (accent and status tints, glows, ink overlays, smoked-glass fills, dark reduced-transparency fills) keep the reference hues when a brand changes its ramps (critic R-02). | ADR-0020 Context. | Aliases with `app.prism.alpha` (ADR-0020 §3); the five dark reduced-transparency fills are deleted instead (S16). Rule `sys/literal` then allows only pure white or black color literals in `sys/**`. | P1-1 (`ref.color.smoke.*`), P1-2 |
| S14 | Typography descriptions and thin weights (visual-dna B7, B9). | `ref/typography.tokens.json:35`, `:56`, `:392`. | Rewrite per ADR-0021: the group description loses "600 page H1 only", `display.xl` loses "may drop to 200", `metric.xl` gets `app.prism.darkWeight: 200`, `metric.lg` says it is never thin. | P1-1 |
| S15 | `sys.type.body-line-height` in the three density files is unused, and density no longer changes typography. | `sys/density/regular.tokens.json:60-65`; ADR-0021 §6, ADR-0024 §6. | Delete the `sys.type` group from `sys/density/*.tokens.json`. | P1-2 |
| S16 | The reduced-transparency delta files and all three platform files write `sys.material.**` (the increased-contrast deltas must stay without it). | ADR-0022 §1.4. | Delete those writes, including `sys.material.blur.enabled` and the light scrim override. The reduced-transparency and watch delta files become empty and are deleted; their contexts load only their base file (ADR-0024 §9.5). | P1-2 |
| S17 | Glass recipes live in `$extensions`; the 12 px and 24 px blurs have no primitive. | ADR-0022 §2. | Typed recipe groups `sys.material.glass.<recipe>.{$root, blur, saturate, edge.start, edge.end, grain, bloom}` in the light and dark files; `ref.blur.cell` (12 px) and `ref.blur.pill` (24 px); delete `ref.opacity.glass.*`. | P1-1 (ref), P1-2 (sys) |
| S18 | Vivid gradients fail ADR-0022 V1 (every stop 3:1 against white) and V2 (Card header block 4.5:1). | ADR-0022 F11, F12. | Retune the stops within the light-stop window of ADR-0022 §4.3, the default pair first. | P1-1 |
| S19 | Dark `glass.dark.chip` and `glass.cell` fail ADR-0022 §3.3. | ADR-0022 F10. | Smoked fills: `{ref.color.smoke.dark}` at alpha 0.35. | P1-2 |
| S20 | `sys.size.control` mixes a density `$root` with fixed base sizes, so Button never follows density. | ADR-0024 §7. | Density files declare `sm\|md\|lg` = compact 28/32/40, regular 32/40/44, comfortable 44/48/52 px; delete them from `sys/base`; delete the then unreferenced `ref.size.control.*`. | P1-2 |
| S21 | 31 unbound component tokens. | ADR-0024 §5.5. | Delete `comp/text`, `comp/surface`, `comp/chart` and their resolver entries, plus `comp.card.gap`, `comp.card.glass.edge` and `comp.button.primary.bg.disabled`; bind `comp.button.secondary.border` and `comp.button.motion.press` in `Button.yaml`. | P1-2 tokens, P2-1 specs |
| S22 | The resolver `description` says modifiers own disjoint token types and that `tz lint` checks orthogonality. | `tokens/prism.resolver.json:5`. | Rewrite per ADR-0024 §9 (id ownership; `pnpm tokens:lint` and `tokens:build` check it). | P1-2 |

After S1, S2 and S7, `tz lint` passes with `core/consistent-naming` at error (ADR-0024 T5). After S1 to S4 the analysis in §5.6 and §5.7 passes on the repository data *(verified: prototype, see §15)*. A copy of the token tree with the source changes of ADR-0020 to ADR-0024 applied validates against the DTCG schemas, passes `tz lint` and resolves orthogonally to 432 permutations (ADR-0024 T6, ADR-0022 F14).

---

## 2. Permutation strategy per target

All 576 permutations (2 brands × 3 platforms × 6 color schemes × 4 densities × 2 modalities × 2 motion) are resolved on every build; each target takes its slice. After ADR-0022 the two reduced-transparency contexts carry no token delta; they stay in the resolver (ADR-0019 §1 item 6, ADR-0024 §9.5). P1-9 (ADR-0029 §3.2, ADR-0030 §7.2) added the `watch` density (regular plus a 16 px card padding, the watchOS default) and gave the `watch` platform context a typography delta (`sys.type.metric.xl` at 40 px), so the product is 576 and apple and watch differ in that one non-color token.

| Target | Build-time axes (one artifact each) | Runtime axes inside the artifact | Permutations read |
|--------|-------------------------------------|----------------------------------|-------------------|
| `tokens.css` | brand | colorScheme (nestable) with contrast and transparency variants (the transparency deltas are empty after ADR-0022; the contexts stay, ADR-0019 §1), density (nestable; root fallback `(any-pointer: coarse)` → regular), modality (root), gamut | web: 96 per brand |
| `motion.css` | — (brand invariance asserted) | motion (root) | web, default brand |
| `tailwind.css` | — (name invariance asserted) | through `var()` | web, default brand |
| `tokens.ts` | brand | colorScheme + variants, density, modality, motion; entry shapes are the union over brands (ADR-0020 §6) | web: 96 per brand |
| `runtime.ts`, manifest `runtime` and `platformDefaults` | — (brand-invariant) | the attribute table itself | none: `config.ts` `WEB_RUNTIME` and `PLATFORM_DEFAULTS` (ADR-0019 §3) |
| Swift sources + `Colors.xcassets` | platform apple/watch merged with `#if os(watchOS)` and the `watch` idiom; every repo brand, chosen at runtime by `DSTokenContext.brand` (ADR-0020 §7) | brand (root), colorScheme, contrast, transparency, density, modality, motion | apple + watch: 192 per brand |
| Tokens Studio flavor | — | themes = brand × colorScheme × density | `SourceModel` only (no resolution) |
| Figma-native flavor | brand × colorScheme | — | web, other axes at defaults (density `compact` since ADR-0019): 12 |
| Contrast (P1-6) | brand × colorScheme | — | web: 12, plus an apple-equality assertion |
| Diff (P1-7) | all | all | all 576, both revisions |
| Analysis (§5.7) | all | all | all 576 |

---

## 3. Module map

### 3.1 `tools/tokens/`

Tests sit next to the code as `*.test.ts`; fixture trees live under `tools/tokens/fixtures/` (JSON only, so `tsc` and ESLint need no new exclude). "Survives" means the file stays when SD gains native resolver support.

| File | Responsibility | Ticket | Survives |
|------|----------------|--------|----------|
| `ARCHITECTURE.md` | This document. | — | yes |
| `README.md` | Usage, commands, outputs, how to add a context or a target. | P1-5 | yes |
| `build.ts` | CLI `tokens:build`: normalize check → `buildBundle` → analysis → `renderAll` → `verifyAll` → `writeOutputs`. Flags: `--check` (compare with disk, write nothing, exit 1 on any difference), `--json` (diagnostics as JSON), `--only <target,…>` (development; never with `--check`). Exit codes: 0 ok, 1 diagnostics or stale output, 2 usage error. **Creating it opens the CI gate, so it lands in P1-5.** | P1-5 | yes |
| `api.ts` | Stable programmatic API (§10, §11): `buildBundle`, `lookup`, `publicPath`, `contrastContexts`, color math re-exports, `gitReader`, `lastReleaseTag`, `diffBundles`, `requiredBump`, `declaredBump`, `brandMeta`. Re-exports the IR types. | P1-3 (grows in P1-6, P1-7) | yes |
| `config.ts` | Pure data: repository paths; `OWNED_ROOTS` (§9.0, ADR-0024 §11); `WEB_RUNTIME` (ADR-0019 §3: per axis the attribute, the ordered values with the first as default, the nestable flag, one media fallback value and query, and the resolver and Swift names) and `PLATFORM_DEFAULTS` (ADR-0019 §2); colorScheme structure (base schemes, variant suffixes); `OWNERSHIP` globs (§5.6, ADR-0024 §9), whose `brand` row is `BRAND_OVERRIDABLE`, and the semantic-slot table (ADR-0020 §1–§2); the `sys` categories that must alias (ADR-0020 §3); the CSS generic keyword list and the system keyword → `DSSystemFontDesign` map (ADR-0020 §5); the ADR-0021 constants `THIN_MIN_PX` 34, `LIGHT_MIN_PX` 20, `WEIGHT_FLOOR` 400, `STANDARD_WEIGHTS` [300, 400, 500], `DARK_WEIGHTS` [100, 200], `TYPE_SCALE` [1, 1.25] and the `DSTextStyle` case list (the role → style table lives only in the source); Swift category table and numeric member prefixes (§8); Tailwind namespace table and utility lookup order (§9.4); extension key lists (§5.4). | P1-3, grown by P1-5 | yes |
| `source/reader.ts` | `SourceReader { readText(path), list(dir) }` over repository-relative POSIX paths; `fsReader(root)`; paths outside the root are errors. | P1-3 | yes |
| `source/json.ts` | `jsonc-parser` wrapper: positions for every node, duplicate keys (`source/duplicate-key`), deep freeze, JSON Pointer escaping. | P1-3 | yes |
| `source/schemas.ts` | Compiles `schema/app-prism.schema.json` and `schema/brand.schema.json`, each once in its own Ajv instance. | P1-3 | yes |
| `source/types.ts` | Source-model types (§4.1). | P1-3 | yes |
| `source/model.ts` | Parses the resolver and every referenced document once with `jsonc-parser` `parseTree` (line and column for every node, duplicate-key detection), validates names and structure, records each token's own `$type`, its nearest group `$type` in the same document, its effective `$deprecated`, and deep-freezes the documents (§5.1). | P1-3 | yes |
| `source/brands.ts` | Loads `brands/<context>/brand.json` for each `brand` context; validates against `schema/brand.schema.json`. Checks that every `brands/<name>/` folder is a context and back, that `extends` equals the context layering, that fonts are per brand (not inherited through `extends`), font `platforms` and `sha256`, and preset consistency (ADR-0020 §5, §8). Used by Swift `DSBrand` and by `tools/fonts`. | P1-3 | yes |
| `source/analyze.ts` | Source-level checks (§5.6). | P1-3 | yes |
| `resolver.ts` | **Deletable.** `enumerate(model, filter?)`, `permKey(model, input)`, `merge(model, input) → { tree, provenance }` (§5.2, §5.3). | P1-3 | **no** |
| `engine/sd.ts` | `runPermutation(tree, meta) → PermutationIR`: builds the SD instance (§6), awaits `getPlatformTokens('ir')`, throws `TokenBuildError` when the diagnostics side channel is non-empty. | P1-3 | yes (loop changes) |
| `engine/hooks.ts` | `prismHooks(meta)`: preprocessors `prism/validate` and `prism/dtcg-types`, value transform `prism/normalize` (thin wrappers; logic lives in `ir/`). | P1-3 | yes |
| `engine/to-ir.ts` | SD dictionary → `PermutationIR`: ids, raw values, alias targets, sub-aliases, provenance, brand type scale, then the ADR-0021 typography rule through `ir/typography.ts` (§5.5). | P1-3 | yes |
| `ir/types.ts` | IR types (§4.2). | P1-3 | yes |
| `ir/normalize.ts` | Pure, idempotent `normalize(type, value, ownExtensions, diagnostics) → IRValue` (§7.1). | P1-3 | yes |
| `ir/color.ts` | Color.js wrapper, memoized by input JSON: space mapping, CSS gamut mapping to sRGB and Display P3, OKLCH, hex, gamut tests (§7.2). Used by the normalizer, the contrast tool and the renderers. | P1-3 | yes |
| `ir/color-math.ts` | Source-over compositing in gamma-encoded sRGB, WCAG 2.x relative luminance and contrast ratio (§10). | P1-3 | yes |
| `ir/order.ts` | Canonical id comparator and context order (§12). | P1-3 | yes |
| `ir/bundle.ts` | `buildBundle(opts)`: model → source checks → sequential permutation loop (one SD run per distinct document stack, §6) → IR invariants → analysis → `IRBundle`. | P1-3 | yes (loop changes) |
| `ir/typography.ts` | ADR-0021 rule: `schemeWeight` (`darkWeight` in dark base schemes), fontWeight = max(400, s) in `*-increased-contrast` contexts, `boldWeight(s)` = s ≤ 300 ? 400 : min(900, s + 200); checks `type/thin-weight`, `type/light-weight`, `type/weight-instance` and the Increase Contrast floor invariant (§5.7 item 8). | P1-3 | yes |
| `ir/analyze.ts` | Dependency axes per token and scope, exhaustive composition proof, variant deltas and their disjointness, platform and brand invariance, the motion policy and the gradient scheme invariant (§5.7). | P1-3 | yes |
| `ir/naming.ts` | Public path (P1-3); CSS, Tailwind, TS, Swift, asset and flavor names plus per-target collision checks (P1-5) (§8). | P1-3, P1-5 | yes |
| `ir/references.ts` | The checks behind `prism/validate` and `prism/dtcg-types`: references (`ref/broken`, `ref/group-reference`, `ref/syntax`, `ref/cycle`), DTCG type precedence (`type/untyped`, `type/alias-mismatch`), nearest-id hints (§5.4, §5.5). | P1-3 | yes |
| `ir/glob.ts` | The one id pattern grammar (`*`, `**`, `a\|b`, `N…M`, `<…>` placeholders) shared by `OWNERSHIP`, `lookup` and `docs.test.ts` (ADR-0024 §13.2). | P1-3 | yes |
| `ir/lookup.ts` | Name, id and glob → ids in the order of §10; suggestions for unknown names. | P1-3 | yes |
| `ir/spring.ts` | Apple spring physics and the ε = 0.001 settle (ADR-0023 §2, §3), for the motion policy (§5.7 item 9); `transforms/spring.ts` (P1-4) builds the CSS curve on it. | P1-3 | yes |
| `ir/diagnostics.ts` | `Diagnostic`, `TokenBuildError`, deterministic sort, human and JSON printers. | P1-3 | yes |
| `transforms/format-number.ts` | The single number formatter (§12). | P1-4 | yes |
| `transforms/color.ts` | Renderers `cssColor` (`prism/color/css-gamut`), `colorsetComponents` and `swiftRGBA` (`prism/color/p3`), `figmaColor`, `studioColor`, `tsColor` (§7.2). | P1-4 | yes |
| `transforms/dimension.ts` | `cssDimension` (`prism/dimension/css`), `cgFloat` (`prism/dimension/cgfloat`), `figmaDimension`, `studioDimension` (§7.3). | P1-4 | yes |
| `transforms/duration.ts` | `prism/duration`: CSS ms, Swift seconds, TS ms, Figma seconds (§7.4). | P1-4 | yes |
| `transforms/cubic-bezier.ts` | CSS `cubic-bezier()`, Swift and TS forms (§7.5). | P1-4 | yes |
| `transforms/spring.ts` | `prism/spring` (ADR-0023): Apple conversion, ε = 0.001 floor settle, curve from 1 ms samples of Motion's physics generator simplified by Ramer–Douglas–Peucker, `cssLinear` (§7.6). | P1-4 | yes |
| `transforms/typography.ts`, `shadow.ts`, `gradient.ts`, `stroke.ts`, `font.ts`, `number.ts` | Composite and scalar renderers (§7.7 to §7.12). Materials need no renderer of their own (ADR-0022 §2.4). | P1-4 | yes |
| `normalize.ts` | CLI `tokens:normalize`: rules `hex` (the roadmap's `normalize-hex`) and `spring-fallback`; `--check` or `--write` with `jsonc-parser` surgical edits (§7.13). | P1-4 | yes |
| `terrazzo.config.ts` | Lint-only Terrazzo config: `tokens: [fileURLToPath(new URL('../../tokens/prism.resolver.json', import.meta.url))]`, `plugins: []`, `lint: { rules: { 'core/consistent-naming': ['error', { format: 'kebab-case' }] } }` (ADR-0024 §2). **Opens the `tokens:lint` gate.** | P1-2 | yes |
| `lint-orthogonality.ts` | Parses the resolver with `@terrazzo/parser` and a `permutationLimit` of at least the product of context counts (Terrazzo withholds `listPermutations` above its default of 1000); fails unless `resolver.orthogonal === true` and `listPermutations().length` equals that product. Terrazzo names no id, so on failure the script walks the modifier contexts of `resolver.source` and prints every id two modifiers write (ADR-0024 §9.2). | P1-2 | yes |
| `validate.ts` | CLI `tokens:validate` (ADR-0024 §10): checks the vendored schema bytes against `SHA256SUMS`, compiles each schema in its own Ajv 8 instance with `ajv-formats`, validates `tokens/**/*.tokens.json` and `brands/*/brand.tokens.json` against `format.json` and the resolver against `resolver.json`, offline; prints file and JSON pointer per error. Replaces the CI download step. | P1-1 | yes |
| `schema/dtcg-2025.10/` | Vendored `format.json` and `resolver.json` (byte-identical to the 2025.10 publication), `SHA256SUMS` and the W3C Software and Document License text (`LICENSE.md`). | P1-1 | yes |
| `diagnose.ts` | Development CLI (`node tokens/diagnose.ts [--json] [--root <dir>] [--resolver <path>]`): source checks, every permutation, invariants and analysis; prints every diagnostic and writes nothing. Not a CI gate file; `build.ts` (P1-5) takes over its flags. | P1-3 | yes |
| `test-support.ts` | Test helpers: fixture readers, the broken-fixture harness (each `fixtures/broken/<case>/` is an overlay of `fixtures/valid/` plus `fixture.json`), the Terrazzo oracle. | P1-3 | yes |
| `docs.test.ts` | Living-document check (ADR-0024 §13): token paths, the `sys.color` segment vocabulary and the ownership table (P1-3), emitted names against `manifest.json` (P1-5). A tier glob (`ref.*`, `sys.*`, `comp.*`) names the tier and matches any id in it; inside Markdown tables, `\|` in a code span is an alternation bar. A `<…>` segment is a placeholder: it matches exactly one segment (`<a\|b>` matches `a` or `b`), so the string is a glob that must match at least one id; `<name>`-only strings outside a tier or category prefix are ignored. | P1-3, P1-5 | yes |
| `formats/index.ts` | `renderAll(bundle): OutputFile[]`, sorted by path. | P1-5 | yes |
| `formats/header.ts` | Static generated-file headers. | P1-5 | yes |
| `formats/css/model.ts` | `CssRule` model, block builder for `tokens.css` and `motion.css` (§9.2). | P1-5 | yes |
| `formats/css/render.ts` | `CssRule[]` → text. | P1-5 | yes |
| `formats/css-variables-modes.ts` | `prism/css-variables-modes`: `<brand>/tokens.css`. | P1-5 | yes |
| `formats/css-motion.ts` | `motion.css`. | P1-5 | yes |
| `formats/tailwind-theme.ts` | `prism/tailwind-theme`: `tailwind.css` (theme variables, the five `ds-*` variants, one `@utility type-ds-<role>` per `sys.type.<role>`, ADR-0019 §3) + utility-collision check. | P1-5 | yes |
| `formats/ts-tokens.ts` | `prism/ts-tokens`: `<brand>/tokens.ts`. | P1-5 | yes |
| `formats/runtime-ts.ts` | `prism/runtime-ts`: brand-invariant `runtime.ts` (`webRuntime`, axis types, `TokenContext`, `defaultContext`, `platformDefaults`, `ScopeAttributes`; ADR-0019 §3). | P1-5 | yes |
| `formats/fonts.ts` | Font emission (ADR-0021 §11): copies every font file a repo brand bundles on Apple, with its `OFL.txt`, into `swift/Sources/DSTokens/Resources/Fonts/<family-dir>/` (one copy per destination path: brands that bundle the same bytes at the same `<family-dir>/<file>` share it, and different bytes at a taken path fail with `fonts/path-collision`; §16.3), and writes `<brand>/fonts/` under the web root: `fonts.css`, and per family `<family-dir>/<family-kebab>-wght.woff2` and `<family-dir>/OFL.txt`. A family folder holds one family and one `OFL.txt`, written once however many files it holds: a second family in a taken folder fails with `fonts/shared-folder`, and a different `OFL.txt` for a shared Apple folder with `fonts/path-collision`. The format reports these and never writes a path twice. | P1-8 | yes |
| `formats/manifest.ts` | `manifest.json` (§9.6). | P1-5 | yes |
| `formats/swift/types.ts` | `DSTokenTypes.swift` template (value types, no values). | P1-5 | yes |
| `formats/swift/context.ts` | `DSTokenContext.swift`; mapping between Swift contexts and resolver inputs. | P1-5 | yes |
| `formats/swift/colors.ts` | `DSColor.swift`: `DSColorToken` and the brand-scoped `DSColor(brand:transparency:)` struct (ADR-0020 §7). | P1-5 | yes |
| `formats/swift/token-set.ts` | `DSTokenSet.swift` and `DSTokenSet+<Category>.swift`. | P1-5 | yes |
| `formats/swift/brand.ts` | `DSBrand.swift`. | P1-5 | yes |
| `formats/swift/tests.ts` | `swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift` (§9.7.6). | P1-5 | yes |
| `formats/swift/syntax.ts` | Identifier escaping, literal formatting. | P1-5 | yes |
| `formats/swift-xcassets.ts` | `prism/swift-xcassets`: `Colors.xcassets/<namespace>/**/Contents.json`, one namespace folder per brand with distinct colors (ADR-0020 §7). | P1-5 | yes |
| `formats/xcode-json.ts` | Xcode-style JSON serializer. | P1-5 | yes |
| `formats/tokens-studio.ts` | `prism/tokens-studio`: `tokens/export/tokens-studio/**` from the `SourceModel`. | P1-5 | yes |
| `formats/figma-native.ts` | `prism/figma-native`: `tokens/export/figma/<brand>/<colorScheme>.json`. | P1-5 | yes |
| `formats/export-readme.ts` | `tokens/export/README.md` (generated). | P1-5 | yes |
| `verify/css-cascade.ts` | Cascade simulator over the `CssRule` model (§9.12). | P1-5 | yes |
| `verify/tables.ts` | Evaluates the TS table model for every web context against the IR; the Swift table model's evaluator, `verifySwiftTables`, sits with the model in `formats/swift/model.ts` (§9.12). | P1-5 | yes |
| `output/write.ts` | `writeOutputs(files, { owned, check })`: writes changed bytes only, deletes stale files inside owned roots, never writes elsewhere; `--check` prints added, changed and removed files. `output/roots.test.ts` asserts that the CI stale-check list equals `OWNED_ROOTS` and that git ignores no root (ADR-0024 §11). | P1-5 | yes |
| `scripts/verify-xcassets.sh` | macOS only: `actool` compile for iphoneos, macosx and watchos with warnings as errors, then `assetutil --info` appearance assertions (§9.8). | P1-5 | yes |
| `diff.ts` | CLI `tokens:diff` (§11). **Opens the CI gate.** | P1-7 | yes |
| `diff/git.ts` | Read-only git: `gitReader(ref)` (`git show <ref>:<path>`, `git ls-tree`), `lastReleaseTag()`. | P1-7 | yes |
| `diff/classify.ts` | `diffBundles`, `requiredBump`. | P1-7 | yes |
| `diff/changesets.ts` | `declaredBump(changesetDir)`. | P1-7 | yes |
| `schema/app-prism.schema.json` | JSON Schema for `$extensions["app.prism"]` (unknown keys are errors), validated with Ajv: `spring` keys and bounds (ADR-0023 §1); on typography tokens `slot` ∈ {ui, display, mono}, `numeric` ∈ {proportional, tabular}, `textStyle` ∈ the 11 `DSTextStyle` cases, `darkWeight` ∈ {100, 200} (ADR-0021); `alpha` 0–1 on color tokens (ADR-0020 §3); `flag`; the gradient keys; metadata keys (`a11y`, `figma`, `llm`, `brand`). No material keys (ADR-0022 §2.4) and no text-safe-zone key. | P1-3 | yes |
| `schema/brand.schema.json` | JSON Schema for `brands/<name>/brand.json`: `name`, `displayName`, `version`, `preset`, `extends`, `notes`, and per-slot font entries with `family`, `file`, `version`, `sha256`, `platforms` (`apple`, `web`) and `postscript` (ADR-0020 §8, ADR-0021 §11). | P1-3 | yes |
| `fixtures/**` | Mini resolvers, merge-semantics cases, one broken tree per failure mode, tampered hex and spring files, diff before/after trees (§14). | all | yes |
| `seed-ref-tokens.py`, `seed-sys-tokens.py` | Existing bootstraps; not part of the pipeline. Superseded by the reviewed JSON (ADR-0020 to ADR-0024 retire names and conventions they emit); never re-run after P1-1 (critic G-18). | — | — |

### 3.2 `tools/contrast/` (P1-6)

| File | Responsibility |
|------|----------------|
| `check.ts` | CLI `contrast:check`: `buildBundle()` → `contrastContexts()` → evaluate every pair of `tokens/contrast-pairs.json` → Markdown table on stdout and in `$GITHUB_STEP_SUMMARY` → exit 1 on any failure. `--resolver <path>` points it at a fixture. **Opens the CI gate.** |
| `pairs.ts` | Loads and validates `contrast-pairs.json`; resolves names with `api.lookup`; applies the compositing policy (§10), token backdrops included (P1-9). |
| `map.ts` | `map/backdrop-limit` (P1-9, ADR-0030 §1.5): every map ground over `color.map.land` at OKLCH L ≥ 0.45 in light and ≤ 0.35 in dark. |
| `thresholds.ts` | Tier and size rules from ADR-0011 and the file's `thresholds`. |
| `report.ts` | Markdown rendering, with a map table when the resolver has a map. |
| `fixtures/broken-pair/` | A mini resolver whose `color.text.secondary` fails on `color.bg.page`. |
| `fixtures/broken-tint-on-map/` | ADR-0030 §1.8: `text.critical` on `bg.tint.critical` over `color.map.road` without the page underlay fails in dark (4.04:1); with it, 5.76:1 passes. |

### 3.3 `tools/fonts/` (P1-8)

| File | Responsibility |
|------|----------------|
| `check.ts` | CLI `fonts:check` (ADR-0021 §11): for every font file a repo brand serves on either platform (`api.brandMeta`; Native's self-hosted Inter included), six checks: (1) the file exists with an `OFL.txt` beside it; (2) its SHA-256 equals `sha256`; (3) name ID 5 equals "Version " + `version`; (4) the cmap covers U+0410–U+044F, U+0401 and U+0451; (5) tabular digits: at the default instance the advances of U+0030–U+0039 are equal, either without features or after the font's GSUB `tnum` single substitutions (lookup type 1, including type 1 wrapped in type 7 extension lookups); (6) every `postscript` entry names an `fvar` instance with that `wght` coordinate (its `postScriptNameID` string, or name ID 6 for the default instance). The same command enforces ADR-0020 rule 14's 2 MiB budget for the fonts bundled into `DSTokens`, deduplicated by SHA-256. One table row per file and check; exit 1 on any failure. |
| `font-file.ts` | Thin adapter over the font parser (candidate `opentype.js` 2.0.0, MIT; verify-before-implementing V6): cmap, `fvar` axes and instances, name IDs 5 and 6, `hmtx`, the `tnum` substitutions. |
| `fixtures/` | The negative tests synthesize a Latin-only font and a font with proportional digits and no `tnum` in memory, so no binary fixture needs a license entry. |

`fonts:check` is a new script; CI needs a new gated step in `contracts`, gate file `tools/fonts/check.ts` (§14, P1-8).

---

## 4. Types

### 4.1 Source model (`source/types.ts`)

```ts
import type { TokenType } from '../ir/types.ts';

export type ModifierName = string;
export type ContextName = string;

export type SourceLayer =
  | { readonly kind: 'set'; readonly name: string }
  | { readonly kind: 'modifier'; readonly name: ModifierName; readonly context: ContextName };

export interface SourceLocation { readonly file: string; readonly pointer: string; readonly line: number; readonly column: number }

export interface SourceToken {
  readonly id: string;                        // DTCG path joined by '.', `$root` kept
  readonly path: readonly string[];
  readonly node: Readonly<Record<string, unknown>>;   // the authored token object, deep-frozen
  readonly ownType: TokenType | null;         // the token's own $type
  readonly groupType: TokenType | null;       // nearest ancestor group $type in the SAME document
  readonly deprecated: string | true | null;  // own $deprecated, else nearest group $deprecated in the same document
  readonly loc: SourceLocation;
  readonly lines: ReadonlyMap<string, number>;   // line of each JSON pointer inside the token ('/$value/fontFamily')
}

export interface SourceGroup { readonly path: readonly string[]; readonly type: TokenType | null; readonly loc: SourceLocation }

export interface SourceDoc {
  readonly file: string;                      // repository-relative POSIX path, or 'inline:<layer>#<i>'
  readonly root: Readonly<Record<string, unknown>>;      // the parsed document, deep-frozen ($schema dropped)
  readonly tokens: ReadonlyMap<string, SourceToken>;
  readonly groups: ReadonlyMap<string, SourceGroup>;     // group path ('' for the root) → group
  readonly groupTypes: ReadonlyMap<string, TokenType>;   // group path → $type declared in this document
}

export interface ModifierInfo { readonly name: ModifierName; readonly contexts: readonly ContextName[]; readonly default: ContextName }

export interface SourceModel {
  readonly resolverFile: string;              // 'tokens/prism.resolver.json'
  readonly name: string | null;
  readonly modifiers: readonly ModifierInfo[];   // in resolutionOrder order
  readonly order: readonly ({ readonly kind: 'set'; readonly name: string } | { readonly kind: 'modifier'; readonly name: ModifierName })[];
  readonly sets: ReadonlyMap<string, readonly SourceDoc[]>;
  readonly contexts: ReadonlyMap<ModifierName, ReadonlyMap<ContextName, readonly SourceDoc[]>>;
  readonly docs: ReadonlyMap<string, SourceDoc>;       // each file parsed once
  readonly brands: ReadonlyMap<ContextName, BrandMeta>;
}

export interface BrandFont {
  readonly family: string;
  readonly file: string | null;                // path relative to the brand folder: 'fonts/onest/Onest[wght].ttf'
  readonly version: string | null;             // name ID 5 without "Version " (ADR-0021 §11)
  readonly sha256: string | null;
  readonly platforms: readonly ('apple' | 'web')[];   // where the brand serves the file (ADR-0020 §5)
  readonly postscript: Readonly<Record<string, string>>;   // weight → PostScript name Core Text exposes; required when bundled on Apple
}
export interface BrandMeta {
  readonly name: string; readonly displayName: string; readonly version: string;
  readonly preset: 'signature' | 'native'; readonly extends: string | null;
  readonly fonts: Partial<Record<'ui' | 'display' | 'mono', BrandFont>>;   // per brand: `extends` does not inherit fonts
}
```

### 4.2 IR (`ir/types.ts`)

```ts
import type { DTCGColorSpace } from 'style-dictionary/types';
import type { ModifierName, ContextName, SourceLayer, ModifierInfo, BrandMeta } from '../source/types.ts';

export type Input = Readonly<Record<ModifierName, ContextName>>;   // complete: one context per modifier
/** Canonical key; modifiers in resolutionOrder order:
 *  'brand=prism|platform=web|colorScheme=light|density=compact|modality=pointer|motion=default' (the resolver default, ADR-0019 §1) */
export type PermKey = string;
export type Tier = 'ref' | 'sys' | 'comp';
export type TokenType = 'color' | 'dimension' | 'duration' | 'number' | 'fontFamily' | 'fontWeight'
  | 'cubicBezier' | 'strokeStyle' | 'border' | 'transition' | 'shadow' | 'gradient' | 'typography';
export type Triple = readonly [number, number, number];

export interface SourceRef { readonly file: string; readonly layer: SourceLayer; readonly line: number }

export interface IRColor {
  readonly kind: 'color';
  readonly space: DTCGColorSpace;             // as authored
  readonly components: readonly [number | 'none', number | 'none', number | 'none'];   // as authored ('none' → NaN for Color.js)
  readonly alpha: number;                     // 0..1, default 1
  readonly hex: string;                       // '#rrggbb' of the CSS-gamut-mapped sRGB color (normalize keeps the authored hex equal)
  readonly srgb: Triple;                      // gamut-mapped to sRGB (method 'css'), gamma-encoded 0..1, unrounded
  readonly p3: Triple;                        // gamut-mapped to Display P3 (method 'css'), 0..1, unrounded
  readonly oklch: Triple;                     // authored color in OKLCH, unmapped; achromatic hue → 0
  readonly inSrgb: boolean;
  readonly inP3: boolean;
}
export interface IRDimension { readonly kind: 'dimension'; readonly value: number; readonly unit: 'px' | 'rem'; readonly px: number }
export interface IRDuration { readonly kind: 'duration'; readonly ms: number }
export interface IRNumber { readonly kind: 'number'; readonly value: number; readonly flag: boolean }   // flag: app.prism.flag
export interface IRFontFamily { readonly kind: 'fontFamily'; readonly families: readonly string[]; readonly opsz: number | null }
export interface IRFontWeight { readonly kind: 'fontWeight'; readonly weight: number }                   // DTCG keywords → numbers
export interface IRCubicBezier { readonly kind: 'cubicBezier'; readonly points: readonly [number, number, number, number] }
export interface IRStrokeStyle {
  readonly kind: 'strokeStyle';
  readonly keyword: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'outset' | 'inset' | null;
  readonly dashArray: readonly IRDimension[];
  readonly lineCap: 'round' | 'butt' | 'square' | null;
}
export interface IRBorder { readonly kind: 'border'; readonly color: IRColor; readonly width: IRDimension; readonly style: IRStrokeStyle }
export interface IRShadowLayer {
  readonly kind: 'shadowLayer';
  readonly color: IRColor; readonly offsetX: IRDimension; readonly offsetY: IRDimension;
  readonly blur: IRDimension; readonly spread: IRDimension; readonly inset: boolean;
}
export interface IRShadow { readonly kind: 'shadow'; readonly layers: readonly IRShadowLayer[] }
export interface IRGradientStop { readonly kind: 'gradientStop'; readonly color: IRColor; readonly position: number }
export interface IRGradient {
  readonly kind: 'gradient';
  readonly stops: readonly IRGradientStop[];
  readonly angle: number | null;                                 // app.prism.angle (degrees)
  readonly grain: number | null;                                 // app.prism.grain
  readonly scheme: 'light' | 'dark' | null;                      // app.prism.scheme
  readonly temperature: 'warm' | 'cool' | null;                  // app.prism.temperature (ADR-0029 §2.4)
  readonly bloom: { readonly alpha: number; readonly blur: number | null } | null;   // the bloom color is derived (§7.9)
}
export type TextStyleName = 'largeTitle' | 'title' | 'title2' | 'title3' | 'headline' | 'body'
  | 'callout' | 'subheadline' | 'footnote' | 'caption' | 'caption2';
export interface IRTypography {
  readonly kind: 'typography';
  readonly fontFamily: IRFontFamily; readonly fontSize: IRDimension;
  readonly fontWeight: IRFontWeight;                             // per permutation, after ADR-0021 §4's rule (dark weight, Increase Contrast floor)
  readonly boldWeight: number;                                   // derived: s ≤ 300 ? 400 : min(900, s + 200) (ADR-0021 §3); Apple only
  readonly darkWeight: number | null;                            // app.prism.darkWeight, folded, never emitted
  readonly lineHeight: number; readonly letterSpacing: IRDimension;
  readonly slot: 'ui' | 'display' | 'mono';                      // app.prism.slot, required (type/role-metadata)
  readonly numeric: 'proportional' | 'tabular';                  // app.prism.numeric, required
  readonly textStyle: TextStyleName;                             // app.prism.textStyle, required
}
export interface IRSpring { readonly duration: number; readonly bounce: number; readonly blendDuration: number }   // Apple parameters, seconds
export interface IRTransition {
  readonly kind: 'transition';
  readonly duration: IRDuration; readonly delay: IRDuration; readonly timingFunction: IRCubicBezier;
  readonly spring: IRSpring | null;                              // app.prism.spring (settle is derived, §7.6)
}
export type IRValue = IRColor | IRDimension | IRDuration | IRNumber | IRFontFamily | IRFontWeight | IRCubicBezier
  | IRStrokeStyle | IRBorder | IRShadow | IRGradient | IRTypography | IRTransition;

/** Metadata keys of $extensions["app.prism"] that are never inherited through aliases. */
export interface PrismMetadata {
  readonly a11y?: { readonly pairsWith?: readonly string[]; readonly minContrast?: number };
  readonly figma?: { readonly collection?: string; readonly scopes?: readonly string[]; readonly codeSyntax?: Readonly<Record<string, string>> };
  readonly llm?: { readonly usage?: readonly string[]; readonly rules?: string };
  readonly brand?: string;
}

export interface IRToken {
  readonly id: string;                        // 'sys.color.bg.surface.$root'
  readonly path: string;                      // public path (§8): 'color.bg.surface', 'comp.button.primary.bg.rest', 'ref.color.neutral.100'
  readonly tier: Tier;
  readonly type: TokenType;
  readonly value: IRValue;                    // fully resolved and normalized
  readonly raw: unknown;                      // authored $value of the winning declaration (aliases kept)
  readonly aliasOf: string | null;            // immediate target id when raw is exactly '{…}' (kept for an alias with app.prism.alpha, which formats render as a literal)
  readonly subAliases: Readonly<Record<string, string>>;   // e.g. { fontFamily: 'ref.font.ui', 'layers.0.color': '…' }
  readonly alpha: number | null;              // own app.prism.alpha (ADR-0020 §3); formats render such a token as a literal
  readonly description: string | null;
  readonly deprecated: string | true | null;
  readonly metadata: PrismMetadata;
  readonly source: SourceRef;                 // layer and file of the winning declaration
}

export interface PermutationIR { readonly key: PermKey; readonly input: Input; readonly tokens: ReadonlyMap<string, IRToken> }  // insertion order = §12 order

export type RuntimeAxis = 'colorScheme' | 'density' | 'modality' | 'motion';
export type ScopeKey = string;                // 'brand=prism|platform=web'
export interface TokenDeps {
  readonly axes: readonly RuntimeAxis[];      // runtime modifiers that change the resolved value (≤ 1, §5.7)
  readonly increasedContrast: readonly ('light' | 'dark')[];     // base schemes whose IC variant changes the value
  readonly reducedTransparency: readonly ('light' | 'dark')[];   // base schemes whose RT variant changes the value
}
export interface ScopeAnalysis {
  readonly input: Input;                      // the scope's default permutation input
  readonly deps: ReadonlyMap<string, TokenDeps>;
  readonly proof: { readonly permutations: number; readonly comparisons: number };
}
export interface Analysis {
  readonly scopes: ReadonlyMap<ScopeKey, ScopeAnalysis>;
  readonly complete: boolean;                 // false when the bundle was built with a filter: no scope is analyzed
}

export interface IRBundle {
  readonly model: { readonly name: string | null; readonly modifiers: readonly ModifierInfo[] };
  readonly brands: ReadonlyMap<string, BrandMeta>;
  readonly permutations: ReadonlyMap<PermKey, PermutationIR>;
  readonly analysis: Analysis;
}

export interface Diagnostic {
  readonly code: string;                      // 'ref/group-reference', 'completeness/missing', 'css/cascade-mismatch', …
  readonly severity: 'error' | 'warning';     // warnings are reported; only errors fail (there are no warnings in P1 checks)
  readonly message: string;
  readonly hint?: string;                     // the fix, e.g. 'write {sys.color.bg.surface.$root}'
  readonly tokenId?: string; readonly file?: string; readonly line?: number; readonly permutation?: PermKey;
}
```

IR invariants, checked by `ir/bundle.ts` after the loop:

1. Every permutation has the same set of token ids, and each id has the same `type` everywhere.
2. Tier aliasing: `ref` aliases only `ref`; `sys` aliases `ref` or `sys`; every `comp` token is a whole-value alias of one `sys` token (`tier/alias-direction`, ADR-0024 §5.1).
3. Public paths are unique; no `sys` category is named `ref` or `comp`.
4. Every value is normalized: a `kind` discriminator exists at every level.
5. Every `number` token has the same `flag` in every permutation (`type/flag-mismatch`, ADR-0023 §10), and a flag's value is 0 or 1 (`type/flag-value`, ADR-0024 §4.2).
6. Every `sys` typography token is a whole-value alias whose chain ends at a `ref.type.*` role (`tier/sys-literal`, ADR-0024 §5.6). Which other `sys` values may be literals is ADR-0020's `sys/literal` (§5.6).

---

## 5. Resolver algorithm

### 5.1 Source model (`source/model.ts`)

1. **Resolver document.** Read `tokens/prism.resolver.json` (JSON Schema validation already runs in CI with ajv). Semantic checks, each a diagnostic:
   - `version === "2025.10"`.
   - `resolutionOrder` is a non-empty array of `{ "$ref": "#/sets/<n>" }` or `{ "$ref": "#/modifiers/<n>" }`; inline items are rejected (`resolver/inline-order`).
   - Every modifier appears exactly once in `resolutionOrder`. Each set is either in `resolutionOrder` (once) or referenced as `#/sets/<n>` from another set's sources, never both and never neither (`resolver/order`).
   - A modifier must not reference a modifier (Resolver §4.1.5.1) *(verified: spec)*.
   - Every modifier declares a `default` that is one of its contexts. DTCG makes `default` optional (§4.1.5.3) *(verified: spec)*; Prism requires it because the CSS base blocks and `DSTokenContext.default` depend on it.
   - Each modifier's `default` is the resolver context of the first value of its `WEB_RUNTIME` axis: colorScheme `light`, density `compact`, modality `pointer`, motion `default` (`resolver/web-default-mismatch`, ADR-0019 rule 3). `brand` and `platform` have no attribute; their defaults stay `prism` and `web`.
   - Context names match `^[a-z][a-z0-9-]*$`, which also rules out integer-like keys that JavaScript reorders.
   - `$extends` is rejected (`resolver/extends-unsupported`); neither Prism's checks nor Terrazzo's orthogonality test handle it.
2. **Sources.** A source is `{ "$ref": "<relative file>" }` resolved from the resolver's directory (`../brands/…` allowed; nothing may leave the repository root), `{ "$ref": "#/sets/<n>" }` inside a set (cycle-checked), or an inline token object (DTCG allows both, §4.1.4 *(verified: spec)*), identified as `inline:<layer>#<i>`. URLs and `file.json#/pointer` fragments are rejected until needed, and so is a `$ref` with sibling keys, which DTCG treats as overrides of the referenced document (Resolver §4.2.2 "Extending"): `resolver/unsupported-source` at the first sibling key; the referenced file still loads, so the other checks do not report its tokens missing, and the code stops the build before Style Dictionary.
3. **Documents.** Each file is read once through `SourceReader` and parsed with `jsonc-parser` `parseTree`, which gives offsets for line and column and exposes duplicate keys (`JSON.parse` silently keeps the last). `$schema` is ignored.
   - Names must not contain `{`, `}` or `.`, and must not start with `$` except the reserved `$root` (Format §5.1.1). Every token and group name matches `^[a-z0-9]+(-[a-z0-9]+)*$`, with `$root` the only `$` name (`source/name-case`, ADR-0024 §2); keys inside `$extensions` and resolver context names are not token names. `constructor`, the one such name that is also an `Object.prototype` member, is reserved under the same code, because Style Dictionary 5.5.3 silently drops a token or group of that name (F41).
   - A token value is a curly-brace reference or a literal: a JSON Pointer `$ref` inside a token value is an error (`ref/json-pointer`, ADR-0024 §1.5).
   - No resolver source may point into `tokens/export/` (`source/export-path`, ADR-0024 §11.2).
   - Group properties: `$type`, `$description`, `$extensions`, `$deprecated`.
   - For every token: `ownType`, `groupType` (nearest ancestor group `$type` **in the same document**), effective `deprecated`, location.
   - `$extensions["app.prism"]` is validated with Ajv against `schema/app-prism.schema.json`; unknown keys are errors. There are no material keys: glass recipes are typed tokens (ADR-0022 §2).
   - Trees are deep-frozen; merge shares token nodes by reference.
4. **Brands.** Each `brand` context name maps to `brands/<name>/brand.json`, and every `brands/<name>/` folder must be a brand context (`brand/registration`, ADR-0020 rule 2).

### 5.2 Enumeration (`resolver.ts`)

- `enumerate(model, filter?)`: Cartesian product over the modifiers in `resolutionOrder` order, contexts in declaration order. The real resolver gives 2 · 3 · 6 · 4 · 2 · 2 = **576** (432 before P1-9 added the `watch` density), the same as Terrazzo's `listPermutations()` *(verified)*.
- `permKey(model, input)`: `name=context` pairs joined by `|`, in the same modifier order. The key is the cache and snapshot key.
- `filter: Partial<Record<ModifierName, readonly ContextName[]>>` narrows the product (tests, `--only`, contrast).

### 5.3 Merge (`resolver.ts`)

Walk `resolutionOrder`: a set contributes its sources in order; a modifier contributes the sources of `input[modifier]` in order. `mergeInto(out, doc, layer)`:

- **Token node** (object with `$value`): replaces any earlier node at that id **wholesale**, including `$description` and `$extensions`: "in case of conflict, the last occurrence in the array will be the final value" (Resolver §4.1.4) *(verified: spec)*. Record `provenance.set(id, sourceRef)`.
- **Group node:** merged recursively with copy-on-write (documents are frozen). Group properties are last-wins per key; they have no effect on typing (§5.4) or on deprecation: the model reads a group's `$deprecated` per document (§4.1), and `source/group-deprecated-mismatch` (§5.6) makes a token restate `$deprecated` wherever an engine reading the merged tree would deprecate it differently.
- **Token versus group at the same path:** error `resolver/shape-conflict`.
- Output: `{ tree, provenance: Map<id, SourceRef> }`. SD deep-clones the tree internally, so sharing nodes is safe.

Aliases are not touched here: DTCG forbids resolving them before the ordering is flattened (§6.3) *(verified: spec)*.

No variant delta file and no platform source writes `sys.material.**` (ADR-0022 §1.4, `material/variant-write`); Surface resolves the glass fallback at runtime from the token context, so no token carries a fallback material.

Other engines differ, which is why Prism merges itself:

- SD's own `source`/`include` merge deep-merges object `$value`s property-wise (`deepExtend` in `lib/utils/combineJSON.js`, observed by the SD-maximal probe).
- Terrazzo's `destructiveMerge` deep-merges every object and overwrites arrays *(verified: `@terrazzo/parser/dist/lib/resolver-utils.js`)*. On today's data the difference does not change any `$value` *(verified: oracle, §15 F23)*, so Terrazzo serves as a test oracle (§14, P1-3).

### 5.4 Typing and extension folding

**Type precedence.** DTCG Format §5.2.2 *(verified: spec)*: a token's own `$type`; else, if its value is a reference, the resolved type of the referenced token; else the `$type` of the closest parent group; else the token is invalid. SD 5.5.3's `typeDtcgDelegate` applies the group type first and never looks at reference targets *(verified: a `{ref.t.body}` alias inside a `$type: number` group came out as `number`; an alias in an untyped group stayed untyped)*. The `prism/dtcg-types` preprocessor (§6) therefore stamps an explicit `$type` on every token before SD's delegate runs (preprocessors run first *(verified)*):

1. own `$type` → keep;
2. whole-value alias → the resolved type of the target, recursively;
3. literal → own-document `groupType`;
4. none → error `type/untyped` with file and line (this is S1).

Using the declaring document's group type, never the merged tree's, keeps a group type in one document from leaking onto aliases declared in another. Portable sources must not depend on it, because Terrazzo and any engine that types the merged tree would disagree (ADR-0024 T4). So `source/analyze.ts` requires a token without its own `$type` to have the same type as every `$type` declared on any of its ancestor group paths, in every document the resolver loads; otherwise the token carries its own `$type` (`type/group-type-mismatch`, hint: put `$type` on the token; ADR-0024 §3). This replaces the same-document `type/alias-group-conflict`. `ref.type.scale` and every `sys.type.<role>` therefore carry their own `$type`. It also reports the same group path carrying different `$type`s in two documents (`source/group-type-conflict`, hint: type the tokens instead of the group); today no group has conflicting types *(verified)*.

**Extension folding.** DTCG defines no propagation of `$extensions` through references *(verified: spec)*, and SD does not copy `$extensions` to alias tokens *(verified)*. Prism folds the keys that change what a token renders as into the normalized value; SD then copies the transformed value into every alias, so they flow through alias chains:

| Key | Folded into | Notes |
|-----|-------------|-------|
| `spring` | `IRTransition.spring` | `settle` is not folded; it is derived (§7.6) and checked (§7.13). Only a `transition` token with a literal `$value` whose `timingFunction` aliases a `ref.motion.easing.*` token may declare it (`spring/fallback`, ADR-0023 §1). |
| `slot`, `numeric`, `textStyle`, `darkWeight` | `IRTypography` | Declared on `ref.type.*` roles only (ADR-0021 §4); `darkWeight` feeds §5.5's weight rule and is never emitted. |
| `opsz` | `IRFontFamily` | Native preset `ref.font.display` → `sys.font.display`. |
| `flag` | `IRNumber.flag` | On every declaration of the id (ADR-0024 §4.2). |
| `angle`, `grain`, `scheme`, `temperature`, `bloom` on gradients | `IRGradient` | Needed for `sys.gradient.vivid.*` aliases (S6). `temperature` (`warm` or `cool`, ADR-0029 §2.4) feeds `gradient/slot-temperature` (§5.7 item 11); the `app.prism` schema requires it on every gradient that declares `scheme`. |
| `alpha` | `IRColor.alpha` | Declared only on a whole-value `sys` color alias with an opaque target; replaces the alpha of the resolved target; the one key exempt from `extension/alias-override` (ADR-0024 §4.1 as amended by ADR-0020 §3; `color/alpha-target`). |

An **alias** is a token whose whole `$value` is one curly-brace reference; a composite whose sub-values reference other tokens is a literal (every `ref.type.*` role is one). An alias never declares a folded key: `extension/alias-override` rejects it, the only code for the rule (ADR-0024 §4.1; ADR-0023 §4 applies it to springs and ADR-0021 §4 to the typography keys). `alpha` is the exception, declared only on aliases and invalid on a literal. Not folded: metadata (`a11y`, `figma`, `llm`, `brand`), which stays on its token. `$extensions["app.prism"]` carries no material keys (ADR-0022 §2.4).

### 5.5 References and IR construction

- `prism/validate` (preprocessor) checks every `{…}` in every `$value`, including composite sub-values, against the merged tree before SD resolves anything. It reports each problem with the referring token id, the file and line from provenance, and a fix: unknown target (`ref/broken`), a group target that contains `$root` (`ref/group-reference`, hint `{x.$root}`), cycles (`ref/cycle`), `$`-prefixed names, `$extends`. SD's own broken-reference throw stays on as a backstop and runs with `verbosity: 'verbose'` so its message names the tokens *(verified: with `silent` or `default` SD prints only a count)*.
- SD resolves references after the merge, including composite sub-values, and `{x.$root}` *(verified)*.
- `engine/to-ir.ts` builds each `IRToken` from the dictionary: `id = path.join('.')`, `type = $type`, `value = $value` (an `IRValue`), `raw = original.$value`, `aliasOf` and `subAliases` parsed from `raw`, `description`, `deprecated` (own or document group, from the model), `metadata` (Ajv-validated), `source` from provenance (under a future SD-native resolver: `token.filePath`).
- **Alpha aliases.** A token with its own `alpha` keeps `aliasOf` (provenance, diff), but every format renders it as a literal of its target with that alpha, never as `var()` or a Swift alias of its target (ADR-0020 §3).
- **Brand type scale.** After SD, `to-ir.ts` multiplies `fontSize` and `letterSpacing` of every typography value by the permutation's `ref.type.scale` (1 when absent), once per token, rounding to 4 decimals. Doing it inside the transitive normalizer would compound along alias chains.
- **Typography weights** (ADR-0021 §4). Then `to-ir.ts` applies one rule from `ir/typography.ts` to every typography value (`ref`, `sys` and `comp` alike, so alias chains and `var()` chains agree):

  ```
  s          = (base scheme is dark && darkWeight != null) ? darkWeight : fontWeight
  fontWeight = colorScheme is an *-increased-contrast context ? max(400, s) : s
  boldWeight = s <= 300 ? 400 : min(900, s + 200)
  ```

  The result depends only on colorScheme, so each role still varies along one runtime axis; no colorScheme file writes a typography id, and `sys.type.*` stays in `sys/base`. Today `display.xl`, `display.lg`, `metric.xl` and `metric.lg` become colorScheme-dependent (the increased-contrast deltas, plus the dark scheme for `metric.xl`).

### 5.6 Source checks (`source/analyze.ts`)

Each check has a `fixtures/broken/<code>/` case (§14, P1-3). The ownership table is ADR-0024 §9; its only machine copy is `config.OWNERSHIP`, and `tokens/README.md` mirrors it (checked by `docs.test.ts`).

| Check | Rule | Today |
|-------|------|-------|
| Write-set disjointness | `W(M)` = union of ids declared by every source of every context of modifier `M`; `W(M1) ∩ W(M2) = ∅` for `M1 ≠ M2`. Same definition as Terrazzo's `isResolverOrthogonal`. Sets are not modifiers: they may declare invariant ids anywhere. | passes after S1 *(verified)* |
| Ownership | Every id in `W(M)` matches `config.OWNERSHIP[M]`: brand `config.BRAND_OVERRIDABLE` (ADR-0020 §1, narrowing `ref.**`; `brand/not-overridable`); platform `sys.font.**` and `sys.type.metric.xl` (ADR-0030 §7.2); colorScheme `sys.color.**`, `sys.material.**`, `sys.shadow.**`, `sys.elevation.**`, `sys.gradient.**`; density `sys.space.**`, `sys.size.**` except `sys.size.hit` (no `sys.type` id, ADR-0021 §6); modality `sys.size.hit`, `sys.interaction.**`; motion `sys.motion.**`. Token types may repeat across modifiers; orthogonality is defined on ids (ADR-0024 §9.1). | fails until S15, S16 |
| Context completeness | Within one modifier, every context declares the same set of ids (the union of its sources), except the `brand` modifier, whose contexts are sparse overrides of the ref set (ADR-0020 rule 8); IR invariant 1 covers it. | fails: S3, S4 *(verified)* |
| Brand paths | Every id a brand context declares is declared by the `ref` set (`brand/unknown-path`) and matches `BRAND_OVERRIDABLE` (`brand/not-overridable`). | fails: S8 *(verified)* |
| Brand registration | Every `brands/<name>/` folder is a `brand` context and back; a brand's `extends` equals its context's parent layering (`brand/registration`). | passes |
| Brand values | A brand's literal colors are opaque; its series aliases target a step of its own neutral or accent ramp; `ref.type.scale` is positive; an overridden gradient keeps its `app.prism.scheme` (`brand/value`); `ref.radius.1`–`10` never decrease (`brand/radius-order`). | passes |
| Semantic slots | Each `ref.color.slot.<scheme>.<name>` is a whole-value alias, without `alpha`, of a step of the group ADR-0020 §2 names (`slot/target`); exactly the `sys` id its name encodes aliases it, in that scheme's base file (`slot/mapping`). | fails until S9 |
| Sys literals | For every declaration in `tokens/sys/**` and every `sys.*` id wherever it is declared (another tier's file, an inline resolver source), so that a hue comes only from `ref`: every color value (whole token or composite sub-value) is a whole-value alias of a `ref.color.*`, `sys.color.*` or `sys.material.glass.*` token (`config.SYS_COLOR_ALIAS_TARGETS`; the last for a role recipe's `$root`, ADR-0029 §1.2), such an alias with `app.prism.alpha`, or a pure white or black sRGB literal; every `fontFamily` value aliases `ref.font.*` or `sys.font.*`; every `gradient` token and every `sys.radius.*` token is a whole-value alias; other values may be literals (`sys/literal`, ADR-0020 §3). ADR-0020 rule 5 says only "an alias"; its §3 decision text names the two target groups, and §3 is what the check enforces. Every `sys` typography token is an alias of a `ref.type.*` role (IR invariant 6). | fails until S13 |
| Alpha target | `app.prism.alpha` sits only on a `sys` color token declared in `tokens/sys/**` that is a whole-value alias of an opaque color, never on a `ref` or `comp` token (`color/alpha-target`, ADR-0020 §3). | passes |
| Font stacks | Web stacks hold only families the brand's own `brand.json` serves on the web plus CSS generic keywords (`font/web-stack`); each Apple face is one family bundled on Apple or one system keyword (`font/apple-face`); `preset` matches the faces and stacks (`font/preset`) (ADR-0020 §5). | fails until S12 |
| Folded keys on aliases | An alias declares no folded key except `alpha` (`extension/alias-override`, ADR-0024 §4.1). | passes |
| Spring declarations | Every token with `app.prism.spring` is a `transition` token with a literal `$value` whose `timingFunction` aliases a `ref.motion.easing.*` token (`spring/fallback`, ADR-0023 §1). | passes |
| Typography roles | Standard weights are 300, 400 or 500, and `darkWeight` is 100 or 200 on `ref.type.metric.*` only (`type/weight-ladder`); every `ref.type.*` role declares `slot`, `numeric` and `textStyle` (`type/role-metadata`); no typography value and no `fontWeight` token outside `ref.type.*` has a literal weight below 400 (`type/weight-outside-role`); `ref.type.scale` lies in [1, 1.25] in the ref source and every brand context (`type/scale-range`) (ADR-0021). | fails until S11, S14 |
| Material writes | No source of an `*-increased-contrast` or `*-reduced-transparency` context other than its base scheme file, and no `platform` source, declares an id under `sys.material` (`material/variant-write`, ADR-0022 §1.4). | fails until S16 |
| Recipe shape | Every id under `sys.material.glass` except `scrim` belongs to a group of exactly `$root` (color), `blur` (dimension, whole-value alias of `ref.blur.*`), `saturate` (number ≥ 0), `edge.start`, `edge.end`, `grain`, `bloom` (numbers in [0, 1]), each with its own `$type`, in both base scheme files (`material/recipe-shape`, ADR-0022 §2.1). The fields of a role recipe (`config.GLASS_ROLE_RECIPES`: `fill`, `chip`) are aliases, so their values are the next row's; their `$root` takes its type from its alias, because DTCG's reference pattern rejects `{….$root}` in a typed color token (§16.3). | fails until S17 |
| Role recipes | In each base scheme file, every field of `sys.material.glass.<role>` is a whole-value alias, without `app.prism.alpha`, of the same field of `sys.material.glass.<scheme>.<role>`: the light recipes in light, the smoked ones in dark (`material/role-recipe`, ADR-0029 §1.2, rule 1). | passes (P1-9) |
| Neutral smoke | Every `ref.color.smoke.*` declaration has OKLCH chroma ≤ `config.SMOKE_MAX_CHROMA` (0.007), computed with Color.js from the authored color (`color/smoke-chroma`, ADR-0029 §1.1, rule 3). | passes (P1-9) |
| Edge colors | Every `sys.color.edge.*` declaration is a whole-value alias of `ref.color.neutral.0`, with or without `app.prism.alpha` (`color/edge-neutral`, ADR-0030 §4.1, rule 4). | passes (P1-9) |
| Names and references | Token and group names are kebab-case (`source/name-case`); no JSON Pointer `$ref` in a token value (`ref/json-pointer`); no resolver source under `tokens/export/` (`source/export-path`) (ADR-0024 §1, §2, §11). | fails until S7 |
| Group types | A token without its own `$type` agrees with every group `$type` on its path in every document (`type/group-type-mismatch`, §5.4); the same group path never carries two `$type`s (`source/group-type-conflict`). | passes *(verified)* |
| Group deprecation | The counterpart for `$deprecated`: a token without its own `$deprecated` agrees with every `$deprecated` that any loaded document declares on the nearest group of its path that carries one; otherwise the token restates `$deprecated` (`source/group-deprecated-mismatch`, §5.3). | passes (no group is deprecated) |
| Flags | A flag's value is 0 or 1 (`type/flag-value`); `type/flag-mismatch` is IR invariant 5. | passes |
| Dead writes | A declaration in one layer (a set or a modifier) that a later layer overwrites in every permutation is an error naming both files; overwrites among the sources of one context (variant delta files) are intended. This is how a brand write to `sys.*` surfaces (S9), and why `brands/prism/brand.tokens.json` declares nothing: `prism-native` layers it first (ADR-0020 §1). | passes today (no brand writes `sys.*`; no set definition is always overwritten *(verified)*) |
| Duplicate keys | Any duplicate JSON key → error with line. | passes |
| `a11y.pairsWith` | Every name resolves with `lookup` (§10). | — |

### 5.7 IR analysis (`ir/analyze.ts`)

Per scope (brand × platform), over the full product of runtime contexts:

1. **Dependency axes.** `axes(t)` = runtime modifiers `M` for which the single-axis variation of `M` from the scope's defaults changes `t`'s resolved value (structural equality of IR values). `increasedContrast` / `reducedTransparency`: base schemes whose variant context differs from the base scheme for `t`.
2. **At most one runtime axis per token.** `|axes(t)| > 1` is an error listing the alias chain, with the hint "split the token or introduce an alias". Today there are none *(verified)*.
3. **Exhaustive composition proof.** For every permutation `p` of the scope and every token: `value(p) == base ⊕ Δ(colorScheme = p.colorScheme) ⊕ Δ(density = p.density) ⊕ Δ(modality = p.modality) ⊕ Δ(motion = p.motion)`, where `Δ` is the single-axis variation. A failure is an interaction that the axis test cannot see (for example an alias re-pointed by one modifier to a token another modifier changes). Today: 432 permutations, 170,856 comparisons, 0 failures *(verified: prototype, under 1 s naive)*.
4. **Variant disjointness.** For each base scheme `s`: `ΔIC(s)` = ids whose value differs between `s` and `s-increased-contrast`, `ΔRT(s)` likewise; `ΔIC(s) ∩ ΔRT(s) = ∅`. This makes "increased contrast and reduced transparency together", which is not a resolver context, well-defined as `s ⊕ ΔIC(s) ⊕ ΔRT(s)` for CSS, Swift and TS. Before P1-2: light 20 / 7, dark 18 / 7, overlap 0 *(verified)*; after ADR-0022, ΔRT is empty in both schemes.
5. **Platform invariance (Swift).** Tokens may differ between `apple` and `watch` only if they are not colors; a differing color is an error (the catalog has one `watch` entry per colorset, §9.8). After ADR-0022 and P1-9 only `sys.type.metric.xl` (40 px on the watch, ADR-0030 §7.2) differs between apple and watch; the watch glass rule lives in DSCore (ADR-0022 §1.2).
6. **Brand invariance.** `motion.css` and `tailwind.css` must be identical when rendered for each brand; `manifest.json` is built once, with `dependsOn` as the union over brands. Generated API shapes (Swift members, reduced-transparency twins, TS entries) use the union of dependencies over brands, so every brand has the same API. Values may differ by brand only through `BRAND_OVERRIDABLE` ids, which the source checks guarantee; Swift emits them per brand (§9.7, ADR-0020 §6–§7). A new brand can only widen a shape, which `tokens:diff` reports as `axes-changed`.
7. **Web text invariant.** A CSS declaration whose *literal text* depends on a runtime axis may depend on only that axis (checked per rendered declaration in `formats/css/model.ts`).
8. **Typography (ADR-0021).** A resolved weight below 300 occurs only on a `type.metric.*` role (or an alias of one) with `fontSize` ≥ 34 px after the type scale, in the `dark` and `dark-reduced-transparency` contexts (`type/thin-weight`); weight 300 occurs only at ≥ 20 px (`type/light-weight`); every typography weight is ≥ 400 in every `*-increased-contrast` permutation (the Increase Contrast floor); for every role, the default brand's Apple face for the role's slot has an exact named instance at every `fontWeight` and `boldWeight` the rule produces (`type/weight-instance`, against `brand.json` `postscript`). Refresh the F12 counts after P1-1: four roles gain a colorScheme dependence.
9. **Motion policy (ADR-0023 §8.3).** Per scope, compare the `default` and `reduced` motion contexts at the scope's other defaults, over `sys` and `comp` tokens only (`ref` does not vary by context). In `reduced`: every token with a spring has bounce 0, a duration ≤ min(its default duration, 0.30 s) and a settle ≤ its default settle; every token of type `duration` is ≤ min(its default, 150 ms) (spring fallback durations are transitions and are bounded by the settle clause). `sys.motion.presentation.crossfade` is 0 in `default` and 1 in `reduced`. `sys.motion.spring.interactive` and every `sys.motion.easing.*` are identical in both contexts. A violation is a `motion/reduced-policy` error naming the token and the field. Passes once P1-2 lands ADR-0023's data.
10. **Gradient schemes.** In every permutation whose base scheme is S, each `sys.gradient.*` token resolves to a gradient whose `app.prism.scheme` is S (`gradient/scheme-mismatch`, ADR-0024 §6: ADR-0022's `gradient/default-scheme` widened to every `sys.gradient.*` token, one check with one code, which ADR-0020 rule 3 runs per brand).
11. **Slot temperatures.** In every permutation, `sys.gradient.vivid.1` and `.2` resolve to gradients of one declared `temperature`, and so do `.3` and `.4` (`config.GRADIENT_SLOT_PAIRS`; `gradient/slot-temperature`, ADR-0029 §2.5, rule 5), per brand, so a vivid 2×2 that alternates one pair on its diagonals is one temperature. A slot gradient without a temperature fails too.

### 5.8 Deletion plan (SD native resolver, #1590)

SD 5.5.3 is still `latest` (published 2026-09-06) and its `lib/` contains no resolver code *(verified)*. When the option ships:

1. Replace the loop in `ir/bundle.ts` and `runPermutation` with one instance using `resolver: 'tokens/prism.resolver.json'`, the same hooks and the `ir` platform; collect each permutation's dictionary (through whatever per-permutation hook SD provides) and pass it to `engine/to-ir.ts`.
2. `prism/dtcg-types` then reads each token's own-document group type through `token.filePath` and the `SourceModel`.
3. Delete `resolver.ts` and its tests. Keep `source/*`; the checks and the Tokens Studio flavor need the layer model.
4. Keep `fixtures/merge-semantics/` as a conformance test. If SD deep-merges tokens the way Terrazzo does, keep `resolver.ts` and file an upstream issue.

---

## 6. How Style Dictionary 5.5.3 is used

```ts
// engine/sd.ts
import StyleDictionary from 'style-dictionary';
import { prismHooks, type PermutationMeta } from './hooks.ts';
import { toPermutationIR } from './to-ir.ts';
import { TokenBuildError } from '../ir/diagnostics.ts';
import type { PermutationIR } from '../ir/types.ts';

export async function runPermutation(tree: object, meta: PermutationMeta): Promise<PermutationIR> {
  const sd = new StyleDictionary({
    tokens: tree,                                   // merged by resolver.ts; SD reads no files
    usesDtcg: true,
    preprocessors: ['prism/validate', 'prism/dtcg-types'],   // hook preprocessors run only when listed
    hooks: prismHooks(meta),                        // per-instance; no global StyleDictionary.register* calls
    log: { verbosity: 'verbose', warnings: 'error', errors: { brokenReferences: 'throw' } },
    platforms: { ir: { transforms: ['prism/normalize'] } },
  });
  const dictionary = await sd.getPlatformTokens('ir');   // transformed + resolved; quiet on success
  if (meta.diagnostics.length > 0) throw new TokenBuildError(meta.diagnostics);
  return toPermutationIR(dictionary, meta);
}
```

| Hook | Kind | Behavior |
|------|------|----------|
| `prism/validate` | preprocessor | Reference and name checks on the merged tree (§5.5). Pushes diagnostics; returns the tree unchanged. |
| `prism/dtcg-types` | preprocessor | Stamps an explicit `$type` on every token by DTCG precedence (§5.4). SD's `typeDtcgDelegate` then has nothing left to fill. |
| `prism/normalize` | value transform, `transitive: true`, no filter | `normalize(token.$type, token.$value, token.$extensions?.['app.prism'], meta.diagnostics)`. Accepts a raw DTCG value or an `IRValue` at any level and returns an `IRValue`; idempotent. It never throws: invalid input pushes a diagnostic and returns the input. |

Why each setting:

- **`getPlatformTokens`, not `formatPlatform`.** It returns `{ tokens, allTokens, tokenMap }` after transforms and resolution and prints nothing on success; `formatPlatform` prints the platform name under `verbosity: 'verbose'` *(verified)*. Prism uses no SD formats, so SD's per-file name-collision guard does not run; `ir/naming.ts` checks collisions per target instead.
- **`verbosity: 'verbose'`** puts the referring and referenced token into SD's broken-reference message (`{comp.card.bg} tries to reference {sys.bg.surface}, which is not defined.`); `silent` and `default` print only a count *(verified)*.
- **`warnings: 'error'`** turns transform errors into a throw; with `warn`, SD logs the error and emits the untransformed value *(verified)*. Prism's own transform never throws, so SD's path is a backstop.
- **One transitive transform.** SD applies a non-transitive value transform only to tokens whose original value contains no reference, so composites with an aliased sub-value (every `ref.type.*` role, whose `fontFamily` is `{ref.font.*}`) would never be transformed. A transitive transform runs once per token after resolution and receives already-transformed sub-values and targets *(verified: `lib/transform/token.js`; probe: the typography transform saw `fontFamily` as the target's transformed value; 170,856 transform calls for 432 × ~395 tokens)*.
- **Plain data only.** `transformToken` begins with `structuredClone(token)`, so class instances returned by a transform reach alias tokens as plain `Object`s and `instanceof` markers fail *(verified: an alias received `{ v: … }` with prototype `Object` and was wrapped again)*. `IRValue`s are plain objects with a `kind` field; idempotency tests `kind`.
- **Strictly sequential runs.** `GroupMessages` is a module singleton (`export default new GroupMessages()`), so concurrent instances in one process would mix messages *(verified)*. `resolveTokens` enforces the order for every caller, not only inside one build: it queues each run behind the previous one, so two overlapping `collectBundle` calls (`tokens:diff` builds two bundles in one process, §11) each get their own result *(verified: P1-3 review; without the queue, a valid build overlapped with a broken one failed with the other's reference error)*. Parallelism, if ever needed, uses `worker_threads` with one SD per worker.
- **One run per document stack.** `ir/bundle.ts` splits `runPermutation` into `resolveTokens` (the SD run) and `finishPermutation` (`engine/to-ir.ts`) and keys SD's output by the permutation's document stack (the files `layersFor` applies, in order). Permutations with the same stack merge to the same tree, so they share one run: each reduced-transparency context = its base file makes 384 runs for the 576 permutations today (before P1-9, `watch` = [apple] also shared, 192 runs for 432). The IR is still built per permutation, with its own key and input and the weight rule of its colorScheme context (§5.5); each permutation's IR equals a direct `runPermutation` *(verified: P1-3 review)*. A run that throws caches nothing usable: its permutation's diagnostics are recorded once and every permutation with that stack fails.
- **What Prism does not use:** SD's `include`/`source` merge (property-level merge of object values), `expand`, built-in transforms and formats (on 2025.10 shapes they print `[object Object]` for durations, transitions and gradients, and hex or `rgba()` for colors; observed by the SD-maximal probe), `name/kebab` (it turns `$root` into a `-root` suffix *(verified)*).

Cost: 432 instances with a minimal normalizer take 2.8 s (6.5 ms each), 95 unique colors, 408 MB RSS with every IR retained *(verified: prototype)*; the IR-first probe measured 4.2 s with a fuller normalizer. The stack cache above cuts the instances to 384 (576 permutations, P1-9).

---

## 7. Transforms (P1-4)

### 7.1 Contract

- **Normalizer (`ir/normalize.ts`)**: one function per `TokenType`, dispatched by `$type`. Input: raw DTCG value, or an `IRValue`, or a composite whose sub-values are either. Output: `IRValue` with `kind` at every level. Own extension keys (§5.4) come only from literal tokens; an alias that declares one is rejected earlier (`extension/alias-override`, ADR-0024 §4.1), except `alpha`, which the normalizer applies over the resolved target. Idempotent: `normalize(normalize(x)) ≡ normalize(x)` for every type (property-tested).
- **Renderers (`transforms/*.ts`)**: pure functions `IRValue → string | object` per target, memoized by the input's JSON. Formats call renderers only; they never call Color.js, Motion or SD. The roadmap's transform names map as follows:

| Roadmap name | Function(s) | Output |
|--------------|-------------|--------|
| `prism/color/css-gamut` | `cssColor(c)` | `{ base, p3 }` CSS strings |
| `prism/color/p3` | `swiftRGBA(c)`, `colorsetComponents(c)` | `DSRGBA(...)` literal, colorset `color` object |
| `prism/dimension/css` | `cssDimension(d, role)` | `24px`, `0.9375rem`, `-0.01em` |
| `prism/dimension/cgfloat` | `cgFloat(d)` | `24` |
| `prism/duration` | `cssDuration`, `seconds`, `ms`, `figmaDuration` | `150ms`, `0.15`, `150`, `{ value: 0.15, unit: 's' }` |
| `prism/spring` | `springPhysics`, `settleMs`, `springCurve`, `cssLinear` | physics triplet, settle, `linear(...)` |
| `normalize-hex` | `normalize.ts` rule `hex` | source edit |

### 7.2 Color

**Normalization** (`ir/color.ts`, Color.js 0.5.2, the version SD itself depends on, so pnpm links one copy for Prism and SD):

```ts
const SPACE: Record<DTCGColorSpace, string> = { srgb: 'srgb', 'srgb-linear': 'srgb-linear', hsl: 'hsl', hwb: 'hwb',
  lab: 'lab', lch: 'lch', oklab: 'oklab', oklch: 'oklch', 'display-p3': 'p3', 'a98-rgb': 'a98rgb',
  'prophoto-rgb': 'prophoto', rec2020: 'rec2020', 'xyz-d65': 'xyz-d65', 'xyz-d50': 'xyz-d50' };   // all 14 exist (verified)
const c = new Color(SPACE[space], components.map(x => x === 'none' ? NaN : x), alpha ?? 1);
srgb = c.clone().toGamut({ space: 'srgb', method: 'css' }).to('srgb').coords;   // CSS Color 4 gamut mapping
p3   = c.clone().to('p3').toGamut({ space: 'p3', method: 'css' }).coords;
hex  = '#' + srgb.map(v => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');
```

`'css'` is Color.js 0.5.2's default mapping method *(verified: `src/defaults.js`)*; Prism passes it explicitly. Color.js `toString()` is never used (its format changes between versions). Today: 166 color objects, 0 stale hex, only `ref.color.accent.50` and `ref.color.accent.300` outside sRGB, none outside P3 *(verified)*.

**CSS (`cssColor`)**

- Authored `srgb` (pure white and black overlays, the only color literals `sys` keeps after ADR-0020): `rgb(R G B)` or `rgb(R G B / A)` with `R = fmt(r·255, 1)`, `A = fmt(alpha, 3)`, emitted as authored, never pre-composited. Example: dark `sys.color.text.secondary` → `rgb(255 255 255 / 0.64)`.
- Alpha aliases (`app.prism.alpha`, ADR-0020 §3): the target's rendering with alpha `A`, with a P3 twin when the target has one. Examples: light `sys.color.bg.tint.accent` (`{ref.color.accent.500}`, alpha 0.12) → `oklch(0.7517 0.1475 57.6 / 0.12)`; light `sys.material.glass.dark.fill.$root` (`{ref.color.smoke.light}`, alpha 0.55) → `oklch(0.1504 0.0092 128.7 / 0.55)`.
- Any other space: base `oklch(L C H[ / A])` with `L`, `C` 4 decimals and `H` 2 decimals; achromatic (`C < 0.00005` or NaN hue) prints `H` as `0`. In sRGB gamut, `L C H` are the authored OKLCH coordinates; out of sRGB, the base is the OKLCH of the sRGB-mapped color and a **P3 twin** carries the authored color (or the P3-mapped color when also out of P3).
- Samples *(verified)*: `ref.color.neutral.100` → `oklch(0.9612 0.0041 271.4)`; `ref.color.neutral.0` → `oklch(1 0 0)`; `ref.color.accent.300` → base `oklch(0.8506 0.1133 68.21)`, twin `oklch(0.8506 0.1133 68.2)`; `ref.color.accent.50` → base `oklch(0.9794 0.0169 76.17)`, twin `oklch(0.9794 0.0169 76.1)`.

**Swift and colorsets (`swiftRGBA`, `colorsetComponents`)**

- Authored `srgb` → sRGB with the authored components (pure white and black overlays stay exact).
- Alpha aliases → the target's Display P3 components with alpha `A` (ADR-0020 §3).
- Authored `display-p3` → as authored.
- Anything else → Display P3, CSS-mapped. Samples *(verified)*: `neutral.600` → P3 (0.3636, 0.3759, 0.4049); `neutral.700` → (0.2539, 0.2662, 0.2953); `neutral.900` → (0.0916, 0.0978, 0.1123); `neutral.950` → (0.0517, 0.0548, 0.0656); `accent.500` → (0.9011, 0.5979, 0.3306).
- Swift literal: `DSRGBA(.displayP3, 0.3636, 0.3759, 0.4049, 1)`; components 4 decimals, alpha 3.
- Colorset: `"color-space" : "display-p3"` or `"srgb"`, components as strings with exactly 4 decimals (`"0.6400"`, `"1.0000"`). One colorset may mix spaces across entries.

**Other targets** (ADR-0024 §12: no flavor pre-composites a translucent color): Figma `{ colorSpace: 'srgb', components: srgb (4 decimals), alpha (3 decimals), hex }`, where `hex` is the 6-digit color without alpha; Tokens Studio `#rrggbb` when opaque and `rgba(R, G, B, A)` below alpha 1 (R, G, B the 0–255 integers of the gamut-mapped sRGB color, A through the number formatter, 3 decimals), never 8-digit hex, which Tokens Studio reads as ARGB; an alias with `alpha` stays an alias with `"studio.tokens": { "modify": { "type": "alpha", "value": "<A>", "space": "srgb", "format": "hex" } }` (ADR-0020 §3); the same rules apply to `boxShadow` colors and gradient stops; TS `{ css: base, cssP3: twin | null, hex, alpha }`.

### 7.3 Dimension

- IR: `value`, `unit`, `px` (`rem × 16`).
- CSS (`cssDimension`): `fmt(px, 3)px`, except typography `fontSize` → `fmt(px / 16, 4)rem` (ADR-0011 rem scaling on web) and typography `letterSpacing` → `fmt(letterSpacing.px / fontSize.px, 4)em`, so tracking scales with the size it belongs to (`ref.type.display.xl` −1.28 px at 64 px → `-0.02em`). A dimension authored in `rem` elsewhere stays `rem`.
- Swift: `CGFloat` points = px; typography `letterSpacing` becomes `trackingEm` = `fmt(letterSpacing.px / fontSize.px, 4)`, which DSCore multiplies by the scaled size (ADR-0021 §6). TS: number (px). Figma: `{ value: px, unit: 'px' }`. Tokens Studio: `"24px"`.
- Units follow ADR-0021 §6: one token px is one CSS px and one Apple point; only type follows the reader's text size (rem, Dynamic Type); every other dimension stays fixed on both stacks, and components that hold text use them as minimum sizes.

### 7.4 Duration

IR `ms` (`s × 1000`). CSS `fmt(ms, 3)ms`; Swift `TimeInterval` seconds `fmt(ms / 1000, 4)`; TS ms number; Figma `{ value: seconds, unit: 's' }`.

### 7.5 Cubic Bézier

CSS `cubic-bezier(0.23, 1, 0.32, 1)` (4 decimals per number); Swift `DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32, y2: 1)` with `animation(duration:)` → `.timingCurve`; TS `{ points: [0.23, 1, 0.32, 1], css: 'cubic-bezier(0.23, 1, 0.32, 1)' }`. The DTCG schema limits x to [0, 1].

### 7.6 Spring (`transforms/spring.ts`)

**Physics** (Apple's two-parameter spring, mass 1): `stiffness = (2π / duration)²`, `damping = 4π(1 − bounce) / duration`, `dampingRatio = 1 − bounce`. The schema admits `duration` 0.1–1 s, `bounce` 0–0.4 and `blendDuration` 0–1 s (ADR-0023 §1). Negative bounce would need `damping = 4π/(duration·(1 + bounce))` and is rejected until an ADR admits it. Values *(verified against SwiftUI `Spring(duration:bounce:)` on the macOS 26 SDK)*: snappy 322.2728 / 30.5183, bouncy 157.9137 / 17.5929, interactive 1754.5963 / 83.7758, reduced snappy 631.6547 / 50.2655.

**Settle.** Closed-form unit step response from rest (the critical branch for bounce 0, the underdamped branch otherwise; overdamped is unreachable while negative bounce is rejected). `settleMs = floor(1000 · t_last)`, where `t_last = max{ t ≤ 5 s : |1 − x(t)| ≥ 0.001 }` (the admitted range settles within 1.66 s), found by sampling at 0.01 ms until an envelope bound proves the tail, then bisecting to 1 µs. Floor reproduces every committed value; rounding would change four of them (487.68 → 488, 587.81 → 588, 404.58 → 405, 818.74 → 819) *(verified)*.

| Spring | (duration, bounce) | last crossing (ms) | settleMs |
|--------|--------------------|-------------------|----------|
| interactive | (0.15, 0) | 220.43 | 220 |
| snappy | (0.35, 0.15) | 487.68 | 487 |
| smooth | (0.40, 0) | 587.81 | 587 |
| sheet | (0.30, 0.20) | 404.58 | 404 |
| bouncy | (0.50, 0.30) | 818.74 | 818 |
| reduced snappy, sheet | (0.25, 0) | 367.38 | 367 |
| reduced smooth, bouncy | (0.30, 0) | 440.86 | 440 |

**Curve.** Motion's physics generator with near-zero rest thresholds:

```ts
import { spring } from 'motion';   // motion 13.2.0 exports spring and generateLinearEasing (verified)
const gen = spring({ keyframes: [0, 1], stiffness, damping, mass: 1, restDelta: 1e-9, restSpeed: 1e-9 });
const samples = range(0, settleMs).map(t => [t, t === settleMs ? 1 : gen.next(t).value]);   // next(t) takes ms
const stops = rdp(samples, 0.002);   // Ramer–Douglas–Peucker on vertical distance: split at the sample farthest from the chord (earliest on a tie) while that distance exceeds 0.002
```

- With Motion's default thresholds the generator snaps to the target near local extrema: bouncy gives `…0.9981, 1, 1, 1, 1, 0.9982…`, a 0.0021 error at 700 ms. With `1e-9` the generator equals the closed form to within 6e-16 across the admitted range, and takes its critically damped branch for every bounce-0 spring *(verified, ADR-0023 M6)*.
- RDP (vertical distance) on 1 ms samples gives 20 to 24 stops for today's springs and at most 30 across the admitted range. After serialization (4-decimal values, 2-decimal positions) the maximum error against the closed form is 0.00205 for today's springs and 0.00224 across the admitted range (7,421 springs), so tests allow 0.0025 and 40 stops (ADR-0023 M8); uniform 60 Hz sampling would need up to 50 stops and still err by up to 0.030 on the interactive spring *(verified)*.
- `generateLinearEasing` is not used: it emits uniform, unsimplified stops (`max(round(duration / resolution), 2)`), so it needs 1 ms resolution (220 to 818 stops per spring) to stay within 0.0025, and errs by up to 0.0154 at its 10 ms default (ADR-0023 M7).
- Motion's `toString()` is not used: it ends at Motion's own rest point on a 50 ms grid (snappy `550ms linear(…)`) *(verified)*. In the build, Motion is only the physics generator, so the CSS curve comes from the code the web runtime uses for gesture springs (ADR-0023 §5, §6).

**`cssLinear(stops)`**: `linear(0, v t%, …, 1)` with values 4 decimals, positions `fmt(100 · t / settleMs, 2)%`, no position on the first and last stop. Snappy *(verified)*:

```
linear(0, 0.0055 1.23%, 0.0239 2.67%, 0.0526 4.11%, 0.095 5.75%, 0.1854 8.62%, 0.4096 14.99%, 0.5127 18.07%, 0.6119 21.36%, 0.693 24.44%, 0.762 27.52%, 0.8229 30.8%, 0.8718 34.09%, 0.9121 37.58%, 0.9455 41.48%, 0.9709 45.79%, 0.9885 50.51%, 0.9996 55.85%, 1.0046 61.19%, 1.0063 67.97%, 1)
```

**Per target**:

- CSS: `-duration: 487ms`, `-easing: linear(…)`, shorthand `var(-duration) var(-easing)` (plus `var(-delay)` only when some context has a non-zero delay); `@supports not (transition-timing-function: linear(0, 1))` twin sets `-easing` to the token's `timingFunction` (`cubic-bezier(0.23, 1, 0.32, 1)`). `linear()` is Baseline widely available since 2026-06-11 (`docs/research/verification.md`), but Tailwind v4's browser floor (Safari 16.4) predates it, and an invalid `var()` inside a `transition` shorthand disables the whole transition.
- Swift: `DSSpringToken(duration:bounce:blendDuration:settle:mass:stiffness:damping:)`; `spring` → `Spring(duration:bounce:)`; `animation` → `.spring(spring, blendDuration:)`.
- TS: `{ duration, bounce, blendDuration, mass: 1, stiffness, damping, settleMs, easing, fallback, css }`.
- A transition without `spring` renders `<duration> cubic-bezier(…)`.

### 7.7 Typography

IR `IRTypography` (§4.2) after the brand type scale (§5.5).

- CSS sub-declarations (no `font` shorthand, no `font-style`: Prism has no italic, ADR-0021 §10): `-font-family`, `-font-size` (rem), `-font-weight` (the permutation's resolved weight, so it switches in the scheme and contrast blocks), `-line-height` (unitless), `-letter-spacing` (em), `-font-variant-numeric` (`tabular-nums` or `normal`). A sub-value that is an alias of an emitted token becomes `var()` (`--ds-ref-type-body-md-font-family: var(--ds-ref-font-ui)`); a whole-value alias makes every sub-declaration `var()` of the target's sub-declaration.
- Swift `DSTypeRole(slot:size:weight:boldWeight:lineHeight:trackingEm:numeric:textStyle:)` (ADR-0021 §4, §6); families come from `DSBrand` by slot (§9.7), so a role carries no family. DSCore renders `boldWeight` under Bold Text.
- TS `{ fontFamily: string (CSS stack), fontSize: px, fontWeight, lineHeight, letterSpacing: px, numeric, slot, textStyle }`; the web has no Bold Text, so neither CSS nor TS carries `boldWeight`.
- Tokens Studio: object of strings (`fontFamily`, `fontSize: "15px"`, `fontWeight: "400"`, `lineHeight: "150%"`, `letterSpacing: "0px"`). Figma: five primitives (§9.10).

### 7.8 Shadow

CSS: per layer `[inset ]<offsetX> <offsetY> <blur> <spread> <color>`, layers joined by `, ` (`0px 6px 16px 0px rgb(0 0 0 / 0.07)`). Swift `DSShadowToken(layers: [DSShadowLayer(color: DSRGBA, x:, y:, blur:, spread:, inset:)])` with CSS blur semantics (DSCore converts to a SwiftUI radius). TS array of `{ color: css, x, y, blur, spread, inset }`. Tokens Studio `boxShadow` `{ x, y, blur, spread, color, type: 'dropShadow' | 'innerShadow' }`.

### 7.9 Gradient

CSS `linear-gradient(<angle ?? 180>deg in oklab, <color> <position·100>%, …)`; stops that alias emitted colors become `var()`; a literal out-of-sRGB stop adds a P3 twin of the whole declaration. Gradients also emit the derived declarations `-grain`, `-bloom-alpha`, `-bloom-blur` (px) and `-bloom-color`, with the neutral values `0`, `0` and `0px` when absent (ADR-0024 §6: grain belongs to the bound gradient). The bloom color is derived, never authored (ADR-0030 §4.3): the stop of highest WCAG relative luminance of its gamut-mapped sRGB color, the later stop on a tie (`transforms/gradient.ts` `bloomStopIndex`), rendered like any color (a P3 twin when it lies outside sRGB); the bloom blur is the value both stacks pass to their blur (75 on every reference gradient). Swift `DSGradientToken(stops: [DSGradientStop(color:location:)], angle:, grain:, scheme:, bloomAlpha:, bloomBlur:, bloomColor:)`; DSCore draws the gradient line with CSS angle semantics for the surface's size (ADR-0022 §4.1). TS `{ css, stops, angle, grain, scheme, bloom: { alpha, blur, color } | null }`. The folded `temperature` is a review key for `gradient/slot-temperature` and is not emitted. Tokens Studio: `color` token with the `linear-gradient(…)` string, without an interpolation method (the flavor is informative, and design tools draw gradients in their own space).

Interpolation (ADR-0022 §4.1 left it to P1-5; decided 2026-09-15, §16.3): **both stacks interpolate every gradient in OKLab.**

- CSS writes `in oklab` after the angle in `tokens.css` and in the `css` and `cssP3` fields of `tokens.ts` (`transforms/gradient.ts` `GRADIENT_INTERPOLATION`). OKLab is already CSS's default for today's `oklch()` stops, so no pixel changes. The explicit method keeps it when every stop of a gradient is a legacy sRGB form (an `rgb()` overlay, §7.12), which CSS would otherwise interpolate in gamma sRGB. Tailwind 4.3.3 writes its own gradient utilities the same way (`to right in oklab`). The syntax needs Chrome 111, Safari 16.2 and Firefox 127, all inside Tailwind v4's floor of Chrome 111, Safari 16.4 and Firefox 128 *(verified 2026-09-15: MDN browser-compat-data `css.types.gradient.linear-gradient`, tailwindcss.com/docs/compatibility)*.
- DSCore (P3-1) draws `Gradient(stops:)` with `.colorSpace(.perceptual)` (SwiftUI, iOS 16, watchOS 9, macOS 13) once V14 shows that space is OKLab. Otherwise it resamples each segment in OKLab, as `tools/contrast/gradient.ts` does, into stops close enough that the space SwiftUI interpolates between them no longer matters. SwiftUI's default, `.device`, does not match the web. `DSGradientToken`'s doc comment says so, and the token type carries no interpolation field, because there is only one space.
- `contrast:check` keeps evaluating V1 and V2 in both gamma sRGB and OKLab, as ADR-0022 requires, so a later change of space cannot break contrast.

### 7.10 Stroke style and border

`strokeStyle` keyword → CSS keyword; object form → `-dasharray: 8px 6px` and `-linecap: round`; Swift `DSStrokeStyle(dash: [8, 6], lineCap: .round)` (keyword form → `keyword:` case). `border` → CSS `<width> <style> <color>`, Swift `DSBorderToken`.

### 7.11 Font family, font weight, number, flags

- `fontFamily` CSS: every family double-quoted except the CSS generic keywords `serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`, `system-ui`, `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`, `math`, `emoji`, `fangsong` (`"Onest", system-ui, sans-serif`). Web stacks contain only families the brand serves on the web and generic keywords (ADR-0020 §5); `ref.font.apple.*` is not emitted in `tokens.css` or `tokens.ts`, and Swift families come only from `DSBrand.faces`. Swift `[String]`; TS the CSS stack; Figma the first family; Tokens Studio `fontFamilies` joined with `, `.
- `fontWeight`: numbers; DTCG keywords map to 100 (`thin`, `hairline`), 200 (`extra-light`, `ultra-light`), 300 (`light`), 400 (`normal`, `regular`, `book`), 500 (`medium`), 600 (`semi-bold`, `demi-bold`), 700 (`bold`), 800 (`extra-bold`, `ultra-bold`), 900 (`black`, `heavy`), 950 (`extra-black`, `ultra-black`).
- `number`: CSS plain number (4 decimals); Swift `Double`; TS number.
- `flag: true` numbers: CSS `0` / `1`; Swift `Bool`; TS `boolean`; Figma number with `"$extensions": { "com.figma.type": "boolean" }` *(verified: Figma help)*; Tokens Studio `boolean`.

### 7.12 Alpha overlays and materials

- Overlays: pure white and black literals are emitted as authored alpha colors on every target; alpha aliases are emitted as literals of their target with the token's alpha (§7.2). Nothing is pre-composited; compositing happens only in the contrast tool (§10).
- Materials have no special handling (ADR-0022 §2). Each recipe field is its own typed token, rendered by §7.2, §7.3 and §7.11. CSS names follow §8: `--ds-material-glass-dark-fill`, `-blur`, `-saturate`, `-edge-start`, `-edge-end`, `-grain`, `-bloom`. There are no neutral defaults: every recipe declares all seven tokens in both base schemes (`material/recipe-shape`). DSCore and the web Surface assemble a recipe from these values, and Surface alone applies the glass fallback (ADR-0022 §1).

### 7.13 `normalize.ts` (source hygiene)

- **Walks** every color object in `tokens/**/*.tokens.json` and `brands/*/brand.tokens.json`, including composite sub-values (shadow layers, gradient stops, border colors), and every token with `app.prism.spring`.
- **Rules**:
  - `hex`: the authored `hex` equals §7.2's computed hex; a missing `hex` is stale too.
  - `spring-fallback`: `$value.duration` equals `settleMs` ms; `app.prism.spring.settle` equals `settleMs / 1000`; `$value.delay` is 0 ms.
- **Modes**: `--check` prints `file:line  pointer  expected → actual` and exits 1; `--write` edits in place with `jsonc-parser` `modify` + `applyEdits`, which touches only the target lines and keeps authored floats such as `0.0` *(verified: on `sys/motion/reduced.tokens.json`, six changed lines)*. Import `jsonc-parser` by package name; its `lib/esm` build uses extensionless imports that Node ESM rejects *(verified)*.
- `tokens:build` runs `--check` first and stops with "run `pnpm tokens:normalize`".
- P1-2 hand-authors ADR-0023's reduced spring fallbacks and `settle` values before the normalizer exists; once P1-4 lands, `--check` must report nothing for them (ADR-0023 rule 3).

---

## 8. Naming (`ir/naming.ts`)

From the id segments with `$root` dropped:

| Name | Rule | Examples |
|------|------|----------|
| Public path (specs, contrast pairs, TS keys, manifest, diff) | `sys.` dropped; `ref.` and `comp.` kept | `sys.color.bg.surface.$root` → `color.bg.surface`; `comp.button.primary.bg.rest`; `ref.color.neutral.100` |
| CSS custom property | `--ds-` + kebab of the segments; `sys` drops its prefix, `comp` drops `comp` (keeps the component), `ref` keeps `ref-`; camelCase segments become kebab | `--ds-color-bg-surface`, `--ds-button-primary-bg-rest`, `--ds-ref-color-neutral-100` |
| CSS derived declaration | base name + suffix: typography `-font-family`, `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`, `-font-variant-numeric`; transition `-duration`, `-easing`, `-delay`; stroke `-dasharray`, `-linecap`; gradient `-grain`, `-bloom-alpha`, `-bloom-blur`, `-bloom-color`. Glass recipe fields are tokens of their own, not suffixes (`--ds-material-glass-dark-fill-blur`, ADR-0022) | `--ds-ref-type-body-md-font-size` |
| Tailwind theme variable | namespace per category (§9.4) + `ds-` + kebab of the rest | `--background-color-ds-page` → `bg-ds-page` |
| TS key | the public path | `'color.bg.page'`, `'comp.button.radius'` |
| Swift category | first public-path segment through `config.SWIFT_CATEGORIES`: `color` → `DSColor` as an instance (`DSTokenSet.color`, or `DSColor(brand:transparency:)`; ADR-0020 §7), `material` → `material`, `border` → `border`, `shadow` → `shadow`, `elevation` → `elevation`, `space` → `space`, `size` → `size`, `radius` → `radius`, `type` → `typography`, `font` → `DSBrand` faces, `motion` → `motion`, `gradient` → `gradient`, `opacity` → `opacity`, `z` → `zIndex`, `icon` → `icon`, `chart` → `chart`, `stroke` → `stroke`, `interaction` → `interaction`; `comp.<c>` → `components.<c>`. An unknown category is a build error. | |
| Swift member | lowerCamel of the remaining segments; a leading digit takes `config.NUMERIC_PREFIX` (`space` → `step`, `elevation` → `level`, otherwise `n`); Swift keywords are backticked. Member names and the manifest's `swift` names are the same for every brand; only the access to colors changes, from a static to `tokens.color.<member>` (ADR-0020 §7, ADR-0019 §6) | `space.4` → `space.step4`; `elevation.2` → `elevation.level2`; `color.text.on-accent` → `DSColor.textOnAccent` (reached as `tokens.color.textOnAccent`); `color.chart.series.1` → `DSColor.chartSeries1`; `material.glass.dark.fill.$root` → `material.glassDarkFill` |
| Asset (colorset) | CSS name without `--ds-`, looked up as `<namespace>/<name>` in the brand's namespace folder (ADR-0020 §7); a reduced-transparency twin adds `-reduced-transparency` (none today: ADR-0022 leaves ΔRT empty) | `color-text-secondary`, looked up as `prism/color-text-secondary` |
| Tokens Studio, Figma | public path segments as nested groups; `$root` → `default` (a sibling named `default` next to a `$root` fails the build: `naming/root-default-collision`, ADR-0024 §1.4) | `color/bg/surface/default` |

Collisions are checked per target on the final names (for example a `sys` category named like a component would map to the same `--ds-<name>-*` prefix as that component's tokens); any collision fails the build naming both ids. Today there are none.

---

## 9. Formats and outputs (P1-5)

### 9.0 Output paths and owned roots

The writer owns five roots, six from P1-8: it writes changed files, deletes files it no longer produces, and never touches anything outside them. `config.ts` `OWNED_ROOTS` is the one list (ADR-0024 §11).

| Root | Files |
|------|-------|
| `web/packages/tokens/src/generated/` | `<brand>/tokens.css`, `<brand>/tokens.ts` and, from P1-8, `<brand>/fonts/` for every brand context (`prism/`, `prism-native/`): `fonts.css` with one `@font-face` per served font file, and per family a `<family-dir>/` folder (the file's folder under `brands/<brand>/fonts/`) with `<family-kebab>-wght.woff2` and that family's `OFL.txt` (ADR-0021 §11; a brand that serves two families, as prism serves Onest and JetBrains Mono, has two licenses, so they cannot share one flat folder, §16.3); `motion.css`, `tailwind.css`, `manifest.json`, `runtime.ts` (brand-invariant, asserted) |
| `swift/Sources/DSTokens/Generated/` | `DSTokenTypes.swift`, `DSTokenContext.swift`, `DSColor.swift`, `DSBrand.swift`, `DSTokenSet.swift`, `DSTokenSet+<Category>.swift` (replaces `.gitkeep`) |
| `swift/Sources/DSTokens/Resources/Colors.xcassets/` | `Contents.json`, one namespace folder per brand with distinct colors (`<namespace>/Contents.json` with `provides-namespace`, ADR-0020 §7) and one `<name>.colorset/Contents.json` per color inside it (only the catalog; `Resources/Fonts/` is its own root) |
| `swift/Sources/DSTokens/Resources/Fonts/` (P1-8) | every font file a repo brand bundles on Apple, with its `OFL.txt`, in `<family-dir>/`, one copy per destination path (brands that bundle the same bytes at the same path share it; ADR-0021 §11, §16.3) and one `OFL.txt` per folder, which holds one family (`fonts/shared-folder`); `Package.swift` declares `.copy("Resources/Fonts")` |
| `swift/Tests/DSTokensTests/Generated/` | `GeneratedTokenTests.swift` |
| `tokens/export/` | `README.md`, `tokens-studio/**`, `figma/<brand>/<colorScheme>.json` |

`swift/Sources/DSTokens/DSTokens.swift` (`DSTokensInfo.version`, stamped by the release workflow) stays hand-maintained outside the owned roots. `@iiiivaska/prism-tokens` (P3-2) maps the default brand to `./tokens.css` and `./tokens`, and every brand to `./brands/<brand>/{tokens.css,tokens,fonts.css}`; the root export stays brand-invariant and imports no React (ADR-0020 §6, ADR-0019 §4).

**Stale check.** CI runs `tokens:build`, then `git status --porcelain -- <roots>`, and fails on any output, which also catches untracked files. The CI list must equal `OWNED_ROOTS`: `output/roots.test.ts` parses `generated=` in `.github/workflows/ci.yml`, asserts equality, and asserts that `git check-ignore` matches no root (ADR-0024 §11.1). The CI list equals `OWNED_ROOTS` since the Phase 1 gates landed: the five roots of P1-5, plus `swift/Sources/DSTokens/Resources/Fonts` once `formats/fonts.ts` exists (P1-8).

**Why `tokens/export/`**: no new top-level folder (ADR-0014's layout stays, with the note that `export/` holds generated flavors); outside `web/` and `swift/` because the flavors are not runtime artifacts; next to the source they mirror, where Tokens Studio's Git sync and a designer look; file names are `*.json`, never `*.tokens.json`, so the schema glob `tokens/**/*.tokens.json` and agents never mistake them for source. It holds only generated files, and no resolver source may point into it (`source/export-path`). The generated `tokens/export/README.md` says so.

### 9.1 Web runtime contract (ADR-0019)

One table in `config.ts` drives CSS, the Tailwind variants, `tokens.ts`, `runtime.ts`, `manifest.json` and (P3-2) the runtime of ADR-0019 §4: `WEB_RUNTIME` for the attributes, `PLATFORM_DEFAULTS` for the per-platform defaults.

| Axis | Attribute | Values (first = default) | Resolver / Swift | Where it acts | Fallback when the attribute has no valid value |
|------|-----------|--------------------------|------------------|---------------|-----------------------------------------------|
| colorScheme | `data-ds-color-scheme` | `light`, `dark` | base scheme of `colorScheme` / `DSColorScheme` | `<html>` and any element | `(prefers-color-scheme: dark)` → `dark` |
| contrast | `data-ds-contrast` | `standard`, `more` | `-increased-contrast` variant / `DSContrast.increased` | `<html>` only | `(prefers-contrast: more)` → `more` |
| transparency | `data-ds-transparency` | `standard`, `reduce` | `-reduced-transparency` variant / `DSTransparency.reduced` | `<html>` only | `(prefers-reduced-transparency: reduce)` → `reduce`; Safari and iOS Safari lack the feature, and nothing stands in for it (ADR-0019 §4 item 3) |
| density | `data-ds-density` | `compact`, `regular`, `comfortable`, `watch` | `density` / `DSDensity` | `<html>` and any element | `(any-pointer: coarse)` → `regular` |
| modality | `data-ds-modality` | `pointer`, `touch` | `modality` / `DSModality` | `<html>` only | `not all and (hover: hover) and (pointer: fine)` → `touch` |
| motion | `data-ds-motion` | `standard`, `reduce` | `motion` contexts `default`, `reduced` / `DSMotionMode` | `<html>` only (`motion.css`) | `(prefers-reduced-motion: reduce)` → `reduce` |
| gamut | — | — | — | — | `@media (color-gamut: p3)` twins |
| brand | none, per ADR-0020: one `tokens.css` per brand, a document loads one brand, and switching replaces the stylesheet | — | `brand` / `DSBrand` | build time on the web | — |
| platform | none: always `web` on the web | — | `platform` | build time | — |

Only a listed value counts. An absent, empty or unknown value behaves like no attribute: the media fallback applies at `<html>`, and a nested element inherits. Fallback selectors therefore list every valid value, e.g. `:root:not([data-ds-density="compact"], [data-ds-density="regular"], [data-ds-density="comfortable"], [data-ds-density="watch"])`, and never use `:not([attr])`. `:not()` counts as its most specific argument, so the specificities below do not change. Any valid value, including the default, turns off its axis's fallback. Recorded in ADR-0019, which amends ADR-0003, ADR-0004 and ADR-0010.

The resolver default is the web root when no attribute is set and no fallback query matches: `colorScheme: light`, `density: compact`, `modality: pointer`, `motion: default`, no contrast or transparency variant (`resolver/web-default-mismatch`, §5.1). Apps start from the per-platform defaults instead (`PLATFORM_DEFAULTS`, ADR-0019 §2): web compact + pointer (regular while any input is coarse, touch while the primary input cannot hover and point finely); iOS and iPadOS regular + touch (iPadOS pointer while a mouse or trackpad is connected); macOS compact + pointer; watchOS watch + touch + dark (ADR-0029 §3.2).

### 9.2 `tokens.css` (`prism/css-variables-modes`), one per brand

**Model** (`formats/css/model.ts`):

```ts
interface CssDecl { name: string; value: string; tokenId: string; twins: readonly { condition: string; value: string }[] }
interface CssRule { comment: string; media: readonly string[] /* ANDed */; selectors: readonly string[]; decls: readonly CssDecl[] }
```

Every token of the web scope renders to one or more declarations (base plus derived). For each declaration the model computes its text in every runtime context: `var(--ds-<target>)` when the token (or composite sub-value) is an alias of a token emitted in `tokens.css` or `motion.css`, else the literal rendering. Membership is decided per declaration:

1. **Invariant** (text and value identical in every context) → `:root`.
2. **Nestable axis `A`** (colorScheme, density) with contexts `c1` (default) … `cn`:
   - text differs between contexts → one block per context, each holding the context's text: default `:root, [data-ds-A="c1"]`; others `[data-ds-A="ck"]`; for colorScheme `dark` also `@media (prefers-color-scheme: dark) { :root:not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"]) }`. The default block comes first, because equal specificity is decided by source order.
   - Density also gets a root fallback block right after its context blocks: `@media (any-pointer: coarse) { :root:not([data-ds-density="compact"], [data-ds-density="regular"], [data-ds-density="comfortable"], [data-ds-density="watch"]) { <regular text> } }` (ADR-0019 §3). Text-identical aliases declared on `:root` re-evaluate there by themselves.
   - text identical but value different (typically a `comp` or `sys` alias of a token that switches) → the **rescope block** `:root, [data-ds-A]`. A custom property inherits its computed value, so a nested `[data-ds-color-scheme="dark"]` element must redeclare the alias or it keeps the root's light result. An unknown value on a nested element sets no context block, so the redeclared alias resolves to the inherited value, as ADR-0019 §1 requires *(verified: ADR-0019 fact 3)*.
3. **colorScheme variants.** For `v` in (increased contrast, reduced transparency) and base scheme `s`: declarations whose text in `s-v` differs from `s`, in four rule groups (flag attribute `F` = `data-ds-contrast="more"` or `data-ds-transparency="reduce"`; valid-value list `Fvalid` = `[data-ds-contrast="standard"], [data-ds-contrast="more"]` or `[data-ds-transparency="standard"], [data-ds-transparency="reduce"]`; scheme list `Svalid` = `[data-ds-color-scheme="light"], [data-ds-color-scheme="dark"]`; media `M` = `(prefers-contrast: more)` or `(prefers-reduced-transparency: reduce)`; scheme query `Q(s)`, the condition under which a root without a valid scheme attribute resolves to `s` (`web.ts` `mediaFor`): `Q(dark)` = `(prefers-color-scheme: dark)`, the colorScheme fallback query, and `Q(light)` = `not all and (prefers-color-scheme: dark)`, its negation, because light is the root whenever the dark query does not match (ADR-0019 §1), and the cascade simulator (§9.12) proves exactly that pairing):
   ```
   :root[F][data-ds-color-scheme="s"], :root[F] [data-ds-color-scheme="s"]                          { … }
   @media Q(s) { :root[F]:not(Svalid) { … } }
   @media M { :root:not(Fvalid)[data-ds-color-scheme="s"], :root:not(Fvalid) [data-ds-color-scheme="s"] { … } }
   @media M and Q(dark) { :root:not(Fvalid):not(Svalid) { … } }                     /* s = dark */
   @media M { @media Q(light) { :root:not(Fvalid):not(Svalid) { … } } }              /* s = light */
   ```
   The last group nests for light because a condition that starts with `not` negates a whole media query: `M and not all and (…)` is invalid, and `not all and M and (…)` would negate `M` too (`render.ts` `mediaLevels`). Specificity (0,2,0) to (0,3,0) beats the scheme blocks (0,1,0)–(0,2,0), and variant blocks come later; a `:not()` with a selector list counts as its most specific argument, so the valid-value lists change nothing here. The descendant form keys on the element's own scheme attribute, so it is right at any nesting depth. Contrast and transparency deltas are disjoint (§5.7), so both may apply. A variant with an empty delta emits no block; after ADR-0022 this holds for reduced transparency.
4. **Root-only axis** (modality): the default context's text in a `:root` block; declarations whose text differs in `touch` in `:root[data-ds-modality="touch"]` and `@media not all and (hover: hover) and (pointer: fine) { :root:not([data-ds-modality="pointer"], [data-ds-modality="touch"]) { … } }`. Text-identical aliases need nothing more: they are declared on the root, where the change happens.
5. **Twins.** After any block containing a declaration with twins: `@media (color-gamut: p3)` and/or `@supports not (transition-timing-function: linear(0, 1))`, same selectors, same names, twin values; a block already inside `@media` gets the conditions joined with `and`. A later block that redeclares the property still wins (same or higher specificity, later in source).
6. Scheme blocks also set `color-scheme: light` or `color-scheme: dark`.
7. Everything sits inside `@layer ds.tokens { … }` (ADR-0003 `@layer ds.*`); unlayered consumer overrides of `--ds-*` win automatically.
8. Selector forms, attribute names and fallback queries come from `config.WEB_RUNTIME`; format code spells none of them (ADR-0019 rule 1).

Tokens of types `duration`, `cubicBezier` and `transition`, and every token under `ref.motion` or `sys.motion`, go to `motion.css`; the build asserts that no motion-dependent literal text is left in `tokens.css`. `ref.font.apple.*` is not emitted (ADR-0020 §5).

**Sample** (brand `prism`, real values after the P1-1 and P1-2 source changes, lists shortened; control sizes per ADR-0024 §7):

```css
/* Generated by tools/tokens from tokens/prism.resolver.json (brand "prism", platform "web"). Do not edit; run `pnpm tokens:build`. */
@layer ds.tokens {
  /* invariant */
  :root {
    --ds-ref-blur-glass: 32px;
    --ds-ref-blur-glass-light: 40px;
    --ds-ref-color-accent-50: oklch(0.9794 0.0169 76.17);
    --ds-ref-color-accent-300: oklch(0.8506 0.1133 68.21);
    --ds-ref-color-neutral-0: oklch(1 0 0);
    --ds-ref-color-neutral-100: oklch(0.9612 0.0041 271.4);
    --ds-ref-color-neutral-600: oklch(0.4883 0.0137 264.4);
    --ds-ref-color-neutral-700: oklch(0.386 0.0146 264.4);
    --ds-ref-color-neutral-900: oklch(0.213 0.0085 264.4);
    --ds-ref-color-neutral-950: oklch(0.164 0.0065 271);
    --ds-ref-color-slot-dark-bg-page: var(--ds-ref-color-neutral-950);
    --ds-ref-color-slot-light-bg-page: var(--ds-ref-color-neutral-100);
    --ds-ref-font-ui: "Onest", system-ui, sans-serif;
    --ds-ref-shadow-dark-floating: 0px 8px 24px 0px rgb(0 0 0 / 0.3);
    --ds-ref-shadow-light-floating: 0px 6px 16px 0px rgb(0 0 0 / 0.07);
    --ds-ref-space-4: 12px;
    --ds-ref-type-body-md-font-family: var(--ds-ref-font-ui);
    --ds-ref-type-body-md-font-size: 0.9375rem;
    --ds-ref-type-body-md-font-variant-numeric: normal;
    --ds-ref-type-body-md-font-weight: 400;
    --ds-ref-type-body-md-letter-spacing: 0em;
    --ds-ref-type-body-md-line-height: 1.5;
    --ds-space-4: var(--ds-ref-space-4);
  }
  @media (color-gamut: p3) {
    :root {
      --ds-ref-color-accent-50: oklch(0.9794 0.0169 76.1);
      --ds-ref-color-accent-300: oklch(0.8506 0.1133 68.2);
    }
  }
  /* colorScheme: light (default) */
  :root,
  [data-ds-color-scheme="light"] {
    color-scheme: light;
    --ds-ref-type-metric-xl-font-weight: 300;
    --ds-color-bg-page: var(--ds-ref-color-slot-light-bg-page);
    --ds-color-bg-surface: var(--ds-ref-color-neutral-0);
    --ds-color-bg-surface-raised: rgb(255 255 255 / 0.7);
    --ds-color-bg-tint-accent: oklch(0.7517 0.1475 57.6 / 0.12);
    --ds-color-text-secondary: var(--ds-ref-color-neutral-600);
    --ds-elevation-2: var(--ds-ref-shadow-light-floating);
    --ds-gradient-vivid-default: var(--ds-ref-gradient-vivid-sky);
    --ds-material-glass-dark-fill: oklch(0.1504 0.0092 128.7 / 0.55);
    --ds-material-glass-dark-fill-bloom: 0;
    --ds-material-glass-dark-fill-blur: var(--ds-ref-blur-glass-light);
    --ds-material-glass-dark-fill-edge-end: 0.08;
    --ds-material-glass-dark-fill-edge-start: 0.22;
    --ds-material-glass-dark-fill-grain: 0.04;
    --ds-material-glass-dark-fill-saturate: 0.8;
  }
  /* colorScheme: dark */
  [data-ds-color-scheme="dark"] {
    color-scheme: dark;
    --ds-ref-type-metric-xl-font-weight: 200;
    --ds-color-bg-page: var(--ds-ref-color-slot-dark-bg-page);
    --ds-color-bg-surface: rgb(255 255 255 / 0.06);
    --ds-color-bg-surface-raised: rgb(255 255 255 / 0.09);
    --ds-color-bg-tint-accent: oklch(0.7517 0.1475 57.6 / 0.14);
    --ds-color-text-secondary: rgb(255 255 255 / 0.64);
    --ds-elevation-2: var(--ds-ref-shadow-dark-floating);
    --ds-gradient-vivid-default: var(--ds-ref-gradient-vivid-plum-dusk);
    --ds-material-glass-dark-fill: oklch(0.1853 0.0102 145.1 / 0.6);
    --ds-material-glass-dark-fill-bloom: 0;
    --ds-material-glass-dark-fill-blur: var(--ds-ref-blur-glass);
    --ds-material-glass-dark-fill-edge-end: 0;
    --ds-material-glass-dark-fill-edge-start: 0.15;
    --ds-material-glass-dark-fill-grain: 0;
    --ds-material-glass-dark-fill-saturate: 1.2;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"]) {
      color-scheme: dark;
      /* the same declarations as the dark block */
    }
  }
  /* colorScheme rescope: same text in every context, value depends on the scheme */
  :root,
  [data-ds-color-scheme] {
    --ds-type-metric-xl-font-weight: var(--ds-ref-type-metric-xl-font-weight);
    --ds-button-primary-bg-rest: var(--ds-color-bg-fill-inverse);
    --ds-card-solid-bg: var(--ds-color-bg-surface);
  }
  /* colorScheme variant: light-increased-contrast (delta over light) */
  :root[data-ds-contrast="more"][data-ds-color-scheme="light"],
  :root[data-ds-contrast="more"] [data-ds-color-scheme="light"] {
    --ds-ref-type-metric-xl-font-weight: 400;
    --ds-color-border-hairline: oklch(0.164 0.0065 271 / 0.3);
    --ds-color-text-accent: var(--ds-ref-color-accent-900);
    --ds-color-text-secondary: var(--ds-ref-color-neutral-700);
  }
  @media not all and (prefers-color-scheme: dark) {
    :root[data-ds-contrast="more"]:not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"]) { /* same delta */ }
  }
  @media (prefers-contrast: more) {
    :root:not([data-ds-contrast="standard"], [data-ds-contrast="more"])[data-ds-color-scheme="light"],
    :root:not([data-ds-contrast="standard"], [data-ds-contrast="more"]) [data-ds-color-scheme="light"] { /* same delta */ }
  }
  @media (prefers-contrast: more) {
    @media not all and (prefers-color-scheme: dark) {
      :root:not([data-ds-contrast="standard"], [data-ds-contrast="more"]):not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"]) { /* same delta */ }
    }
  }
  /* colorScheme variant: dark-increased-contrast (delta over dark) — the same four groups with Q(dark) */
  :root[data-ds-contrast="more"][data-ds-color-scheme="dark"],
  :root[data-ds-contrast="more"] [data-ds-color-scheme="dark"] {
    --ds-ref-type-metric-xl-font-weight: 400;
    --ds-color-border-hairline: rgb(255 255 255 / 0.25);
    --ds-color-text-secondary: rgb(255 255 255 / 0.8);
  }
  @media (prefers-color-scheme: dark) {
    :root[data-ds-contrast="more"]:not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"]) { /* same delta */ }
  }
  /* … */
  @media (prefers-contrast: more) and (prefers-color-scheme: dark) {
    :root:not([data-ds-contrast="standard"], [data-ds-contrast="more"]):not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"]) { /* same delta */ }
  }
  /* reduced transparency: no deltas (ADR-0022) */
  /* density: compact (default) */
  :root,
  [data-ds-density="compact"] {
    --ds-size-control-lg: 40px;
    --ds-size-control-md: 32px;
    --ds-size-control-sm: 28px;
    --ds-size-row: 32px;
    --ds-space-card-gap: 8px;
    --ds-space-card-padding: 16px;
  }
  [data-ds-density="regular"] {
    --ds-size-control-lg: 44px;
    --ds-size-control-md: 40px;
    --ds-size-control-sm: 32px;
    --ds-size-row: 44px;
    --ds-space-card-gap: 12px;
    --ds-space-card-padding: 24px;
  }
  [data-ds-density="comfortable"] {
    --ds-size-control-lg: 52px;
    --ds-size-control-md: 48px;
    --ds-size-control-sm: 44px;
    --ds-size-row: 52px;
    --ds-space-card-gap: 12px;
    --ds-space-card-padding: 24px;
  }
  @media (any-pointer: coarse) {
    :root:not([data-ds-density="compact"], [data-ds-density="regular"], [data-ds-density="comfortable"]) {
      /* the same declarations as the regular block */
    }
  }
  /* density rescope */
  :root,
  [data-ds-density] {
    --ds-button-height-md: var(--ds-size-control-md);
    --ds-card-padding: var(--ds-space-card-padding);
  }
  /* modality: pointer (default) */
  :root {
    --ds-interaction-hover: 1;
    --ds-interaction-tooltip: 1;
    --ds-size-hit: var(--ds-ref-size-hit-pointer);
  }
  /* modality: touch */
  :root[data-ds-modality="touch"] {
    --ds-interaction-hover: 0;
    --ds-interaction-tooltip: 0;
    --ds-size-hit: var(--ds-ref-size-hit-touch);
  }
  @media not all and (hover: hover) and (pointer: fine) {
    :root:not([data-ds-modality="pointer"], [data-ds-modality="touch"]) { /* same as touch */ }
  }
}
```

### 9.3 `motion.css`

Brand-invariant (asserted). Root-only, so no rescope block.

```css
/* Generated by tools/tokens from tokens/prism.resolver.json (platform "web"). Do not edit; run `pnpm tokens:build`. */
@layer ds.tokens {
  /* invariant */
  :root {
    --ds-ref-motion-duration-base: 250ms;
    --ds-ref-motion-easing-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ds-ref-motion-spring-snappy: var(--ds-ref-motion-spring-snappy-duration) var(--ds-ref-motion-spring-snappy-easing);
    --ds-ref-motion-spring-snappy-duration: 487ms;
    --ds-ref-motion-spring-snappy-easing: linear(0, 0.0055 1.23%, 0.0239 2.67%, 0.0526 4.11%, 0.095 5.75%, 0.1854 8.62%, 0.4096 14.99%, 0.5127 18.07%, 0.6119 21.36%, 0.693 24.44%, 0.762 27.52%, 0.8229 30.8%, 0.8718 34.09%, 0.9121 37.58%, 0.9455 41.48%, 0.9709 45.79%, 0.9885 50.51%, 0.9996 55.85%, 1.0046 61.19%, 1.0063 67.97%, 1);
  }
  @supports not (transition-timing-function: linear(0, 1)) {
    :root {
      --ds-ref-motion-spring-snappy-easing: cubic-bezier(0.23, 1, 0.32, 1);
    }
  }
  /* motion: default */
  :root {
    --ds-motion-duration-base: var(--ds-ref-motion-duration-base);
    --ds-motion-presentation-crossfade: 0;
    --ds-motion-spring-snappy: var(--ds-motion-spring-snappy-duration) var(--ds-motion-spring-snappy-easing);
    --ds-motion-spring-snappy-duration: var(--ds-ref-motion-spring-snappy-duration);
    --ds-motion-spring-snappy-easing: var(--ds-ref-motion-spring-snappy-easing);
    --ds-button-motion-press: var(--ds-button-motion-press-duration) var(--ds-button-motion-press-easing);
    --ds-button-motion-press-duration: var(--ds-motion-spring-snappy-duration);
    --ds-button-motion-press-easing: var(--ds-motion-spring-snappy-easing);
  }
  /* motion: reduced */
  :root[data-ds-motion="reduce"] {
    --ds-motion-duration-base: 150ms;
    --ds-motion-presentation-crossfade: 1;
    --ds-motion-spring-snappy-duration: 367ms;
    --ds-motion-spring-snappy-easing: linear(0, 0.0047 1.09%, 0.022 2.45%, 0.0491 3.81%, 0.0835 5.18%, 0.1571 7.63%, 0.3667 13.9%, 0.4615 16.89%, 0.5547 20.16%, 0.6359 23.43%, 0.705 26.7%, 0.7672 30.25%, 0.8176 33.79%, 0.8607 37.6%, 0.8985 41.96%, 0.9294 46.87%, 0.9533 52.32%, 0.9712 58.58%, 0.9831 65.4%, 0.9914 73.84%, 1);
  }
  @supports not (transition-timing-function: linear(0, 1)) {
    :root[data-ds-motion="reduce"] {
      --ds-motion-spring-snappy-easing: cubic-bezier(0.23, 1, 0.32, 1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :root:not([data-ds-motion="standard"], [data-ds-motion="reduce"]) { /* same as reduced */ }
  }
  @media (prefers-reduced-motion: reduce) {
    @supports not (transition-timing-function: linear(0, 1)) {
      :root:not([data-ds-motion="standard"], [data-ds-motion="reduce"]) { --ds-motion-spring-snappy-easing: cubic-bezier(0.23, 1, 0.32, 1); }
    }
  }
}
```

(Values assume S3, S5 and ADR-0023's reduced data: reduced snappy and sheet (0.25, 0), 367 ms; reduced smooth and bouncy (0.30, 0), 440 ms. The reduced block therefore also redeclares the `smooth`, `sheet` and `bouncy` duration and easing properties. Selector forms follow ADR-0019. Component CSS implements ADR-0023 §8.4 by multiplying transform, blur and depth magnitudes by `1 − var(--ds-motion-presentation-crossfade)` and substitute opacity changes by the flag itself; it never reads the attribute, the `ds-reduce-motion` variant or the media query (ADR-0023 §8.5).)

### 9.4 `tailwind.css` (`prism/tailwind-theme`)

Brand-invariant; `sys.*` only (`ref.*` belongs to brand authors, `comp.*` to Prism's components). Tailwind 4.3.3 resolves each utility family through its own theme namespaces before the generic `--color` (`bg` → `--background-color`, `--color`; `text` → `--text-color`, `--color`, then `--text` for font size; `border` → `--border-color`, `--color`; `fill` → `--fill`, `--color`; `stroke` → `--stroke`, `--color`) *(verified: `dist/lib.js` themeKeys)*, so the README names hold without stutter:

| Source | Theme variables | Example utilities |
|--------|-----------------|-------------------|
| `sys.color.bg.<r>` | `--background-color-ds-<r>` | `bg-ds-page`, `bg-ds-surface-raised`, `bg-ds-fill-accent` |
| `sys.color.text.<r>` | `--text-color-ds-<r>` | `text-ds-primary`, `text-ds-on-accent` |
| `sys.color.icon.<r>` | `--text-color-ds-icon-<r>`, `--fill-ds-icon-<r>` | `text-ds-icon-secondary`, `fill-ds-icon-secondary` |
| `sys.color.border.<r>` | `--border-color-ds-<r>`, `--outline-color-ds-<r>` | `border-ds-hairline`, `outline-ds-focus` |
| `sys.color.accent.<r>` | `--background-color-ds-accent[-<r>]`, `--fill-ds-accent[-<r>]`, `--stroke-ds-accent[-<r>]` | `bg-ds-accent`, `fill-ds-accent` |
| `sys.color.chart.<r>` | `--color-ds-chart-<r>` (generic) | `stroke-ds-chart-series-1`, `bg-ds-chart-band` |
| `sys.space.<r>`, `sys.size.<r>` | `--spacing-ds-<r>` | `p-ds-card-padding`, `gap-ds-4`, `h-ds-control-md`, `size-ds-icon-md` |
| `sys.radius.<r>` | `--radius-ds-<r>` | `rounded-ds-card` |
| `sys.elevation.<n>`, `sys.shadow.<r>` | `--shadow-ds-elevation-<n>`, `--shadow-ds-<r>` | `shadow-ds-elevation-2`, `shadow-ds-drawer` |
| `sys.font.<slot>` | `--font-ds-<slot>` | `font-ds-ui` |
| `sys.type.<role>` | `--text-ds-<role>` with `--line-height`, `--letter-spacing`, `--font-weight` sub-keys; plus one `@utility type-ds-<role>` (ADR-0019 §3) | `text-ds-body-md`, `type-ds-body-md` |
| `sys.motion.easing.<n>`, `sys.motion.spring.<n>` | `--ease-ds-<n>`, `--ease-ds-spring-<n>` (the `-easing` sub-declaration) | `ease-ds-out`, `ease-ds-spring-snappy` |
| `sys.motion.duration.<n>`, `sys.motion.spring.<n>` | `--transition-duration-ds-<n>`, `--transition-duration-ds-spring-<n>` | `duration-ds-base` |
| `sys.opacity.<r>` | `--opacity-ds-<r>` | `opacity-ds-disabled` |
| `sys.z.<r>` | `--z-index-ds-<r>` | `z-ds-overlay` |

`sys.border.*` widths get no Tailwind namespace: they would collide with `--border-color-ds-*` (ADR-0024 §6).

**Composite typography utilities** (ADR-0019 §3, rule 14): one `@utility type-ds-<role>` per `sys.type.<role>`, where `<role>` is the kebab-case of the role path after `type.` (`type.body.md` → `type-ds-body-md`; 21 roles today). It sets, in this order, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing` and `font-variant-numeric`, each as `var()` of the role's derived declaration (§8). `text-ds-<role>` stays; it sets neither family nor figures, so the skill teaches `type-ds-<role>`. Tailwind emits a static `@utility` only when used, and it takes variants.

**Collision check.** `config.ts` copies Tailwind 4.3.3's lookup order for every family Prism feeds (`bg`, `text`, `border`, `outline`, `divide`, `ring`, `fill`, `stroke`, the spacing families, `rounded`, `shadow`, `font`, `ease`, `duration`, `opacity`, `z`, `type`). Two Prism theme variables or utilities that can produce the same utility name fail the build, even when Tailwind would pick one silently: with both `--text-color-ds-x` and `--text-ds-x`, Tailwind emits only the color *(verified)*; with both `--text-color-ds-accent` and `--color-ds-accent`, `text-ds-accent` takes the first *(verified)*. That is why `sys.color.accent.*` avoids the generic `--color` namespace.

**Variants**: only root-level preferences, each with an attribute form and a media form using the valid-value `:not()` list and the ADR-0019 query: `ds-touch` (`@media not all and (hover: hover) and (pointer: fine)`), `ds-pointer` (`@media (hover: hover) and (pointer: fine)`), `ds-contrast-more` (`(prefers-contrast: more)`), `ds-reduce-transparency` (`(prefers-reduced-transparency: reduce)`) and `ds-reduce-motion` (`(prefers-reduced-motion: reduce)`). There is no `dark` override and no density variant: the nearest-ancestor scheme or density cannot be expressed in a selector, and tokens switch by themselves.

- Prism's own component stylesheets consume the variants through `@variant ds-…`, compiled with `@tailwindcss/node` in each package build (`compile`, `build([])`, `optimize`; ADR-0019 §4 item 6 as amended by ADR-0025, and fact 4). The uses are closed: hover styles select React Aria's `[data-hovered]` only inside `@variant ds-pointer`, and `ds-touch` / `ds-pointer` switch interaction-only rules, never a size. Reduce Motion reaches component CSS through `--ds-motion-presentation-crossfade` in `calc()` (ADR-0023 §8.5), and the glass fallback is chosen by the React Surface from `useTokenContext()` (ADR-0022 §1.3), so no Prism stylesheet uses `ds-reduce-motion`, `ds-contrast-more` or `ds-reduce-transparency`; those three serve consumer code.
- Tailwind's own `dark:`, `contrast-*:`, `motion-*:`, `pointer-*:` and `any-pointer-*:` variants read media only and ignore Prism's attributes; agents use tokens or the `ds-*` variants (ADR-0019).

```css
/* Generated by tools/tokens. Import after "tailwindcss", then one Prism <brand>/tokens.css and motion.css. Do not edit. */
@custom-variant ds-touch {
  &:where(:root[data-ds-modality="touch"], :root[data-ds-modality="touch"] *) { @slot; }
  @media not all and (hover: hover) and (pointer: fine) {
    &:where(:root:not([data-ds-modality="pointer"], [data-ds-modality="touch"]), :root:not([data-ds-modality="pointer"], [data-ds-modality="touch"]) *) { @slot; }
  }
}
@custom-variant ds-contrast-more {
  &:where(:root[data-ds-contrast="more"], :root[data-ds-contrast="more"] *) { @slot; }
  @media (prefers-contrast: more) {
    &:where(:root:not([data-ds-contrast="standard"], [data-ds-contrast="more"]), :root:not([data-ds-contrast="standard"], [data-ds-contrast="more"]) *) { @slot; }
  }
}
/* ds-pointer, ds-reduce-transparency, ds-reduce-motion: same shape */
@theme inline {
  --background-color-ds-accent: var(--ds-color-accent);
  --background-color-ds-fill-accent: var(--ds-color-bg-fill-accent);
  --background-color-ds-page: var(--ds-color-bg-page);
  --border-color-ds-hairline: var(--ds-color-border-hairline);
  --color-ds-chart-series-1: var(--ds-color-chart-series-1);
  --ease-ds-spring-snappy: var(--ds-motion-spring-snappy-easing);
  --font-ds-ui: var(--ds-font-ui);
  --opacity-ds-disabled: var(--ds-opacity-disabled);
  --outline-color-ds-focus: var(--ds-color-border-focus);
  --radius-ds-card: var(--ds-radius-card);
  --shadow-ds-elevation-2: var(--ds-elevation-2);
  --spacing-ds-card-padding: var(--ds-space-card-padding);
  --spacing-ds-control-md: var(--ds-size-control-md);
  --text-color-ds-primary: var(--ds-color-text-primary);
  --text-ds-body-md: var(--ds-type-body-md-font-size);
  --text-ds-body-md--font-weight: var(--ds-type-body-md-font-weight);
  --text-ds-body-md--letter-spacing: var(--ds-type-body-md-letter-spacing);
  --text-ds-body-md--line-height: var(--ds-type-body-md-line-height);
  --transition-duration-ds-base: var(--ds-motion-duration-base);
  --z-index-ds-overlay: var(--ds-z-overlay);
}
@utility type-ds-body-md {
  font-family: var(--ds-type-body-md-font-family);
  font-size: var(--ds-type-body-md-font-size);
  font-weight: var(--ds-type-body-md-font-weight);
  line-height: var(--ds-type-body-md-line-height);
  letter-spacing: var(--ds-type-body-md-letter-spacing);
  font-variant-numeric: var(--ds-type-body-md-font-variant-numeric);
}
```

Compiled with `@tailwindcss/node` 4.3.3 *(verified with the pre-ADR-0024 names `h-ds-control` and `shadow-ds-floating`; the mechanism does not depend on the name)*: `bg-ds-page` → `background-color: var(--ds-color-bg-page)`; `text-ds-primary` → `color: var(--ds-color-text-primary)`; `bg-ds-primary` is not generated (no leak); `text-ds-body-md` sets font size, line height, letter spacing and weight; `h-ds-control-md`, `size-ds-control-md`, `duration-ds-base`, `z-ds-overlay`, `opacity-ds-disabled`, `fill-ds-icon-secondary`, `stroke-ds-chart-series-1`, `shadow-ds-elevation-2`, `ease-ds-spring-snappy` resolve to their `var()`; the block-form `@custom-variant` compiles, including `@media not all and (hover: hover) and (pointer: fine)` and `:not()` with a selector list; a static `@utility type-ds-body-md` compiles and takes variants; a plain rule that nests `@variant ds-contrast-more` expands into both forms *(verified: ADR-0019 fact 4)*. The per-utility namespaces are not in Tailwind's documented namespace table, so the compile test (§14) guards them.

### 9.5 `tokens.ts` (`prism/ts-tokens`), one per brand

For canvas and SVG code (visx charts) that cannot read CSS variables. Keys are public paths of `sys.*` and `comp.*` tokens; `ref.*` is not exported. Units: px for dimensions, ms for durations. The table mirrors the CSS model: invariant values, one runtime axis per token, and colorScheme as base schemes plus disjoint variant deltas. Entry shapes (`$value` or `$values`, which deltas exist) are the union over repo brands, so every brand's file declares the same types (ADR-0020 §6). The generated file must type-check under the web package's strict settings (`noUncheckedIndexedAccess` included). Canvas code that draws text multiplies the px sizes by the root font size / 16 (ADR-0021 §6).

The context types live in the brand-invariant `runtime.ts` (ADR-0019 §3), which `<brand>/tokens.ts` imports:

```ts
// runtime.ts — generated by tools/tokens from tools/tokens/config.ts (WEB_RUNTIME, PLATFORM_DEFAULTS). Do not edit.
export const webRuntime = {
  colorScheme:  { attribute: 'data-ds-color-scheme', values: ['light', 'dark'], nestable: true, media: { value: 'dark', query: '(prefers-color-scheme: dark)' } },
  contrast:     { attribute: 'data-ds-contrast', values: ['standard', 'more'], nestable: false, media: { value: 'more', query: '(prefers-contrast: more)' } },
  transparency: { attribute: 'data-ds-transparency', values: ['standard', 'reduce'], nestable: false, media: { value: 'reduce', query: '(prefers-reduced-transparency: reduce)' } },
  density:      { attribute: 'data-ds-density', values: ['compact', 'regular', 'comfortable', 'watch'], nestable: true, media: { value: 'regular', query: '(any-pointer: coarse)' } },
  modality:     { attribute: 'data-ds-modality', values: ['pointer', 'touch'], nestable: false, media: { value: 'touch', query: 'not all and (hover: hover) and (pointer: fine)' } },
  motion:       { attribute: 'data-ds-motion', values: ['standard', 'reduce'], nestable: false, media: { value: 'reduce', query: '(prefers-reduced-motion: reduce)' } },
} as const;
export type ColorScheme = 'light' | 'dark';
export type Contrast = 'standard' | 'more';
export type Transparency = 'standard' | 'reduce';
export type Density = 'compact' | 'regular' | 'comfortable' | 'watch';
export type Modality = 'pointer' | 'touch';
export type Motion = 'standard' | 'reduce';
export interface TokenContext {                 // no brand field: one brand per document (ADR-0020 §6)
  readonly colorScheme: ColorScheme; readonly contrast: Contrast; readonly transparency: Transparency;
  readonly density: Density; readonly modality: Modality; readonly motion: Motion;
}
export const defaultContext: TokenContext = { colorScheme: 'light', contrast: 'standard', transparency: 'standard', density: 'compact', modality: 'pointer', motion: 'standard' };
export const platformDefaults = { /* ADR-0019 §2: web, ios, ipados, macos, watchos */ } as const;
export interface ScopeAttributes { readonly 'data-ds-color-scheme'?: ColorScheme; readonly 'data-ds-density'?: Density }
```

```ts
// Generated by tools/tokens from tokens/prism.resolver.json (brand "prism"). Do not edit; run `pnpm tokens:build`.
import { defaultContext, type TokenContext } from '../runtime.ts';

export interface ColorValue { readonly css: string; readonly cssP3: string | null; readonly hex: string; readonly alpha: number }
export interface SpringValue {
  readonly duration: number; readonly bounce: number; readonly blendDuration: number;   // Apple parameters (s)
  readonly mass: 1; readonly stiffness: number; readonly damping: number;             // for Motion physics springs
  readonly settleMs: number; readonly easing: string; readonly fallback: string; readonly css: string;
}
export type TextStyleName = 'largeTitle' | 'title' | 'title2' | 'title3' | 'headline' | 'body'
  | 'callout' | 'subheadline' | 'footnote' | 'caption' | 'caption2';   // the DSTextStyle cases (ADR-0021 §7); same union as the IR's (§4.2)
export interface TypeRoleValue {
  readonly fontFamily: string; readonly fontSize: number; readonly fontWeight: number; readonly lineHeight: number;
  readonly letterSpacing: number; readonly numeric: 'proportional' | 'tabular';
  readonly slot: 'ui' | 'display' | 'mono'; readonly textStyle: TextStyleName;
}
export interface ShadowLayerValue { readonly color: string; readonly x: number; readonly y: number; readonly blur: number; readonly spread: number; readonly inset: boolean }

export const table = {
  'color.bg.page': { $type: 'color', $cssVar: '--ds-color-bg-page', $axis: 'colorScheme',
    $values: { light: { css: 'oklch(0.9612 0.0041 271.4)', cssP3: null, hex: '#f1f2f5', alpha: 1 },
               dark: { css: 'oklch(0.164 0.0065 271)', cssP3: null, hex: '#0d0e11', alpha: 1 } } },
  'color.text.secondary': { $type: 'color', $cssVar: '--ds-color-text-secondary', $axis: 'colorScheme',
    $values: { light: { css: 'oklch(0.4883 0.0137 264.4)', cssP3: null, hex: '#5c6068', alpha: 1 },
               dark: { css: 'rgb(255 255 255 / 0.64)', cssP3: null, hex: '#ffffff', alpha: 0.64 } },
    $increasedContrast: { light: { css: 'oklch(0.386 0.0146 264.4)', cssP3: null, hex: '#40444c', alpha: 1 },
                          dark: { css: 'rgb(255 255 255 / 0.8)', cssP3: null, hex: '#ffffff', alpha: 0.8 } } },
  'color.text.on-accent': { $type: 'color', $cssVar: '--ds-color-text-on-accent',
    $value: { css: 'oklch(0.164 0.0065 271)', cssP3: null, hex: '#0d0e11', alpha: 1 } },
  'space.4': { $type: 'dimension', $cssVar: '--ds-space-4', $value: 12 },
  'space.card-padding': { $type: 'dimension', $cssVar: '--ds-space-card-padding', $axis: 'density',
    $values: { compact: 16, regular: 24, comfortable: 24, watch: 16 } },
  'interaction.hover': { $type: 'number', $cssVar: '--ds-interaction-hover', $axis: 'modality',
    $values: { pointer: true, touch: false } },                     // flag (S10)
  'motion.spring.snappy': { $type: 'transition', $cssVar: '--ds-motion-spring-snappy', $axis: 'motion', $values: {
    standard: { duration: 0.35, bounce: 0.15, blendDuration: 0, mass: 1, stiffness: 322.2728, damping: 30.5183, settleMs: 487,
                easing: 'linear(0, 0.0055 1.23%, …, 1)', fallback: 'cubic-bezier(0.23, 1, 0.32, 1)', css: '487ms linear(0, 0.0055 1.23%, …, 1)' },
    reduce: { duration: 0.25, bounce: 0, blendDuration: 0, mass: 1, stiffness: 631.6547, damping: 50.2655, settleMs: 367,
              easing: 'linear(0, 0.0047 1.09%, …, 1)', fallback: 'cubic-bezier(0.23, 1, 0.32, 1)', css: '367ms linear(0, 0.0047 1.09%, …, 1)' } } },
  /** Solid inverse pill is the only fill. */
  'comp.button.primary.bg.rest': { $type: 'color', $cssVar: '--ds-button-primary-bg-rest', $axis: 'colorScheme', $values: { /* … */ } },
  // … one entry per sys.* and comp.* token, in canonical order
} as const;

export type TokenPath = keyof typeof table;
export type TokenValue<P extends TokenPath> = (typeof table)[P] extends { readonly $values: infer M } ? M[keyof M] : (typeof table)[P] extends { readonly $value: infer V } ? V : never;
export type ResolvedTokens = { readonly [P in TokenPath]: TokenValue<P> };

/** var(--ds-…) for a token path. */
export function cssVar<P extends TokenPath>(path: P): `var(${(typeof table)[P]['$cssVar']})` { /* generated */ }
/** Resolves every token for one context: scheme base, then the reduced-transparency delta, then the increased-contrast delta (disjoint, §5.7). */
export function resolveTokens(context: Partial<TokenContext> = {}): ResolvedTokens { /* generated generic walk over `table`; no values in code */ }
```

`$deprecated` becomes `/** @deprecated <reason> */` on the entry; `$description` becomes a JSDoc line.

### 9.6 `manifest.json`

Brand-invariant name map for agents, `tools/spec` (P2-1), `tools/parity` (P2-3) and `tools/tokens/docs.test.ts` (ADR-0024 §13.3). No values and no tool versions (the lockfile records versions). It is built once: `dependsOn` is the union over repo brands (ADR-0020 §6).

- `runtime` is generated from `WEB_RUNTIME` (ADR-0019 §3): per axis the `attribute`; `values`, mapping each web value to its resolver context or variant suffix and its Swift case; `nestable`; and `media` `{ value, query }`.
- `platformDefaults` is generated from `PLATFORM_DEFAULTS` (ADR-0019 §2).
- `swift` names are the `DSColor` member names for colors (reached as `tokens.color.<member>`, ADR-0020 §7) and the `DSTokenSet` member paths otherwise; `asset` is the colorset name inside the brand's namespace folder.
- `cssVars` lists every custom property the token declares in `tokens.css` or `motion.css`, base first, then the derived declarations of §8 in §12 order: `["--ds-color-text-secondary"]`; a transition's base and its `-delay`, `-duration` and `-easing`; a gradient's base, `-bloom-alpha`, `-bloom-blur` and `-grain`. `css` is the base property, or null when the token declares none: a typography role declares only its six derived properties (`--ds-type-body-md-font-size`, …) and an object-form stroke style only `-dasharray` and `-linecap`, so no manifest name points at a property that does not exist (ADR-0019 rule 13). `docs.test.ts` accepts a quoted `--ds-…` name only when it is a `cssVars` entry (§16.3).
- `ref.font.apple.*` is listed with no `css`, `cssVars`, `tailwind` or `ts` name (ADR-0020 §5).

```json
{
  "$generated": "tools/tokens from tokens/prism.resolver.json; do not edit",
  "modifiers": [
    { "name": "colorScheme", "contexts": ["light", "dark", "light-increased-contrast", "dark-increased-contrast", "light-reduced-transparency", "dark-reduced-transparency"], "default": "light" }
  ],
  "runtime": {
    "colorScheme": { "attribute": "data-ds-color-scheme", "nestable": true,
      "values": { "light": { "context": "light", "swift": "DSColorScheme.light" }, "dark": { "context": "dark", "swift": "DSColorScheme.dark" } },
      "media": { "value": "dark", "query": "(prefers-color-scheme: dark)" } },
    "contrast": { "attribute": "data-ds-contrast", "nestable": false,
      "values": { "standard": { "variant": null, "swift": "DSContrast.standard" }, "more": { "variant": "increased-contrast", "swift": "DSContrast.increased" } },
      "media": { "value": "more", "query": "(prefers-contrast: more)" } }
  },
  "platformDefaults": {
    "web": { "density": "compact", "modality": "pointer" },
    "watchos": { "colorScheme": "dark", "density": "watch", "modality": "touch" }
  },
  "tokens": [
    { "path": "color.text.secondary", "id": "sys.color.text.secondary", "tier": "sys", "type": "color", "dependsOn": ["colorScheme"],
      "css": "--ds-color-text-secondary", "cssVars": ["--ds-color-text-secondary"], "tailwind": ["text-ds-secondary"], "ts": "color.text.secondary",
      "swift": "DSColor.textSecondary", "asset": "color-text-secondary", "description": null, "deprecated": null },
    { "path": "type.body.md", "id": "sys.type.body.md", "tier": "sys", "type": "typography", "dependsOn": [],
      "css": null, "cssVars": ["--ds-type-body-md-font-family", "--ds-type-body-md-font-size", "--ds-type-body-md-font-variant-numeric",
        "--ds-type-body-md-font-weight", "--ds-type-body-md-letter-spacing", "--ds-type-body-md-line-height"],
      "tailwind": ["text-ds-body-md", "type-ds-body-md"], "ts": "type.body.md", "swift": "DSTokenSet.typography.bodyMd", "asset": null }
  ]
}
```

### 9.7 Swift API (`swift/Sources/DSTokens/Generated/`)

DSTokens stays nonisolated value code in Swift 6 mode (`Package.swift` `valueSettings`); every type is `Hashable & Sendable`; it imports only SwiftUI. Values and font faces cover every repo brand; `DSTokenContext.brand` selects one (ADR-0020 §7). `apple` versus `watch` differences use `#if os(watchOS)`. Public shapes are the union over repo brands: which axes a member switches on and whether a colorset has a reduced-transparency twin, so every brand has the same API.

#### 9.7.1 Context (`DSTokenContext.swift`)

```swift
// Generated by tools/tokens from tokens/prism.resolver.json. Do not edit; run `pnpm tokens:build`.
public enum DSColorScheme: String, CaseIterable, Hashable, Sendable { case light, dark }
public enum DSContrast: String, CaseIterable, Hashable, Sendable { case standard, increased }
public enum DSTransparency: String, CaseIterable, Hashable, Sendable { case standard, reduced }
public enum DSDensity: String, CaseIterable, Hashable, Sendable { case compact, regular, comfortable, watch }
public enum DSModality: String, CaseIterable, Hashable, Sendable { case pointer, touch }
public enum DSMotionMode: String, CaseIterable, Hashable, Sendable { case standard, reduced }   // resolver "default" → .standard

public struct DSTokenContext: Hashable, Sendable {
    public var brand: DSBrand                     // root-only: DSTheme(brand:) sets it once per scene (ADR-0020 §7)
    public var colorScheme: DSColorScheme
    public var contrast: DSContrast
    public var transparency: DSTransparency
    public var density: DSDensity
    public var modality: DSModality
    public var motion: DSMotionMode
    public init(brand: DSBrand = .default, colorScheme: DSColorScheme = .light, contrast: DSContrast = .standard,
                transparency: DSTransparency = .standard, density: DSDensity = .compact, modality: DSModality = .pointer,
                motion: DSMotionMode = .standard) {
        self.brand = brand; self.colorScheme = colorScheme; self.contrast = contrast; self.transparency = transparency
        self.density = density; self.modality = modality; self.motion = motion
    }
    /// The resolver default (the web root with nothing set): tests and the table evaluator. Not a device default.
    public static let `default` = DSTokenContext()
    /// Where DSCore starts on this OS (ADR-0019 §2).
    public static let platformDefault: DSTokenContext = {
        #if os(watchOS)
        DSTokenContext(colorScheme: .dark, density: .watch, modality: .touch)
        #elseif os(macOS)
        DSTokenContext(density: .compact, modality: .pointer)
        #else
        DSTokenContext(density: .regular, modality: .touch)
        #endif
    }()
}
```

Mapping to resolver inputs (`formats/swift/context.ts`): `brand` → the `brand` context; `(s, .standard, .standard)` → `s`; `(s, .increased, .standard)` → `s-increased-contrast`; `(s, .standard, .reduced)` → `s-reduced-transparency`; `(s, .increased, .reduced)` → `s ⊕ ΔIC(s) ⊕ ΔRT(s)` (§5.7). 128 contexts per brand (96 before P1-9 added `DSDensity.watch`). DSCore (P3-1) starts from `DSTokenContext.platformDefault`, sets `brand` from `DSTheme(brand:)`, then overlays `colorScheme` (not on watchOS), `colorSchemeContrast`, `accessibilityReduceTransparency` and `accessibilityReduceMotion` (through `DSAccessibilityPolicy`), plus `dsDensity` and `dsModality` (ADR-0019 §5), and caches one `DSTokenSet` per context. Bold Text is not a context field: DSCore reads `DSAccessibilityPolicy.boldText` and uses `DSTypeRole.boldWeight` (ADR-0021 §4).

#### 9.7.2 Value types (`DSTokenTypes.swift`, emitted from a template)

```swift
import SwiftUI
public enum DSColorSpace: Hashable, Sendable { case sRGB, displayP3 }
public struct DSRGBA: Hashable, Sendable {
    public let space: DSColorSpace; public let red: Double; public let green: Double; public let blue: Double; public let alpha: Double
    public init(_ space: DSColorSpace, _ red: Double, _ green: Double, _ blue: Double, _ alpha: Double)
    public var color: Color { Color(space == .sRGB ? .sRGB : .displayP3, red: red, green: green, blue: blue, opacity: alpha) }
}
public struct DSSpringToken: Hashable, Sendable {
    public let duration: Double, bounce: Double, blendDuration: Double   // Apple parameters (s)
    public let settle: Double                                           // ε = 0.001 displacement settle (s); NOT Spring.settlingDuration
    public let mass: Double, stiffness: Double, damping: Double         // parity fields
    public var spring: Spring { Spring(duration: duration, bounce: bounce) }
    public var animation: Animation { .spring(spring, blendDuration: blendDuration) }
}
public struct DSCubicBezier: Hashable, Sendable {
    public let x1: Double, y1: Double, x2: Double, y2: Double
    public func animation(duration: TimeInterval) -> Animation { .timingCurve(x1, y1, x2, y2, duration: duration) }
}
public struct DSTransitionToken: Hashable, Sendable { public let duration: TimeInterval; public let delay: TimeInterval; public let curve: DSCubicBezier; public let spring: DSSpringToken? }
public struct DSShadowLayer: Hashable, Sendable { public let color: DSRGBA; public let x: CGFloat; public let y: CGFloat; public let blur: CGFloat; public let spread: CGFloat; public let inset: Bool }
public struct DSShadowToken: Hashable, Sendable { public let layers: [DSShadowLayer] }   // CSS blur semantics; DSCore converts to a SwiftUI radius
public struct DSGradientStop: Hashable, Sendable { public let color: DSRGBA; public let location: Double }
public struct DSGradientToken: Hashable, Sendable {
    public let stops: [DSGradientStop]; public let angle: Double; public let grain: Double   // angle: CSS semantics (ADR-0022 §4.1)
    public let scheme: DSColorScheme?; public let bloomAlpha: Double; public let bloomBlur: CGFloat
    public let bloomColor: DSRGBA                  // derived: the brightest stop, the later one on a tie (ADR-0030 §4.3)
}
public enum DSFontSlot: String, CaseIterable, Hashable, Sendable { case ui, display, mono }
public enum DSNumericSpacing: String, Hashable, Sendable { case proportional, tabular }
public enum DSTextStyle: String, CaseIterable, Hashable, Sendable {   // mirrors Font.TextStyle so Sendable does not depend on the SDK
    case largeTitle, title, title2, title3, headline, body, callout, subheadline, footnote, caption, caption2
}
public struct DSTypeRole: Hashable, Sendable {                        // ADR-0021 §4, §6, §9
    public let slot: DSFontSlot; public let size: CGFloat
    public let weight: Int                                             // resolved for the context: dark weight, Increase Contrast floor
    public let boldWeight: Int                                         // used by DSCore under Bold Text
    public let lineHeight: Double; public let trackingEm: Double       // DSCore: .lineHeight(.multiple(factor:)), .tracking(trackingEm × scaled size)
    public let numeric: DSNumericSpacing; public let textStyle: DSTextStyle
}
public enum DSLineCap: String, Hashable, Sendable { case round, butt, square }
public struct DSStrokeStyle: Hashable, Sendable { public let dash: [CGFloat]; public let lineCap: DSLineCap? }
public enum DSFontPreset: String, Hashable, Sendable { case signature, native }
public enum DSSystemFontDesign: String, Hashable, Sendable { case `default`, rounded, monospaced, serif }   // system-ui, ui-rounded, ui-monospace, ui-serif
public struct DSFontFace: Hashable, Sendable {
    public let families: [String]; public let file: String?            // file: relative to Resources/Fonts, e.g. "onest/Onest[wght].ttf"
    public let postScriptNames: [Int: String]; public let opticalSize: Double?
    public let system: DSSystemFontDesign?                             // non-nil for a system face (ADR-0020 §5)
}
package enum DSTokensBundle { package static var bundle: Bundle { .module } }   // for DSTokensTests catalog checks
```

Glass recipes need no value type of their own: each field is a plain member (ADR-0022 §2.4).

#### 9.7.3 Colors (`DSColor.swift`)

The OS resolves scheme and contrast from the catalog; the brand selects the namespace, and the context the reduced-transparency twin, which no token needs after ADR-0022 (the rule stays for future deltas).

```swift
import SwiftUI
public enum DSColorToken: String, CaseIterable, Hashable, Sendable {   // one case per colorset name, the union over brands
    case bgPage = "color-bg-page"
    case textSecondary = "color-text-secondary"
    case materialGlassDarkFill = "material-glass-dark-fill"
    // … canonical order
    public func color(_ brand: DSBrand) -> Color { Color(brand.colorNamespace + "/" + rawValue, bundle: .module) }
    /// Literal values behind each catalog entry (tests, contrast math, drawing outside SwiftUI).
    public func appearances(_ brand: DSBrand) -> DSColorAppearances {
        switch (brand.colorNamespace, self) {
        case ("prism", .textSecondary):
            DSColorAppearances(any: DSRGBA(.displayP3, 0.3636, 0.3759, 0.4049, 1), dark: DSRGBA(.sRGB, 1, 1, 1, 0.64),
                               highContrast: DSRGBA(.displayP3, 0.2539, 0.2662, 0.2953, 1), darkHighContrast: DSRGBA(.sRGB, 1, 1, 1, 0.8),
                               watch: DSRGBA(.sRGB, 1, 1, 1, 0.64))
        // …
        }
    }
}
public struct DSColorAppearances: Hashable, Sendable { public let any: DSRGBA; public let dark: DSRGBA; public let highContrast: DSRGBA; public let darkHighContrast: DSRGBA; public let watch: DSRGBA }
public struct DSColor: Hashable, Sendable {                            // ADR-0020 §7: brand-scoped, reached as tokens.color
    public let brand: DSBrand; public let transparency: DSTransparency
    public init(brand: DSBrand, transparency: DSTransparency) { self.brand = brand; self.transparency = transparency }
    /// color.text.secondary
    public var textSecondary: Color { DSColorToken.textSecondary.color(brand) }
    public var bgPage: Color { DSColorToken.bgPage.color(brand) }
    public var bgSurface: Color { DSColorToken.bgSurface.color(brand) }   // sys.color.bg.surface.$root
    // … one member per sys.color.* token (bgFillInverse, textOnAccent, chartSeries1, …); a member whose token has a
    // -reduced-transparency colorset picks it while transparency == .reduced
}
```

Member names stay those of §8 and ADR-0019 §6 (`DSColor.bgSurface`, `DSColor.textPrimary`); only the access changes, from a static to `tokens.color.bgSurface`, because a static cannot know the brand. A member that gains a reduced-transparency twin keeps its shape, so the former split between a static and a `func name(_ transparency:)` is gone.

**Catalog colors (critic R-03, decided by P1-5 on 2026-09-15, §16.3).** Components keep reading catalog colors: every `DSColor` member is `Color("<namespace>/<name>", bundle: .module)`, so the OS resolves scheme and Increase Contrast, as ADR-0020 §7 keeps them. The literal tables are not a second color path for components. `DSColorToken.appearances` serves tests, contrast math and drawing outside SwiftUI. The gap R-03 found, that `swift build` and `swift test` do not compile asset catalogs (F17), is closed by four checks instead of a second build system. `Colors.xcassets` is an owned root, so CI's stale check covers it (§9.0). `verify-xcassets.sh` compiles it with actool for iOS, watchOS and macOS and finds `prism/color-text-secondary` in each `Assets.car` (§9.8). `ColorCatalogTests` checks every colorset of every brand namespace against `DSColorToken.appearances` under `xcodebuild test` on the iOS and watchOS simulators (§9.7.6). Host `swift test` checks the literal tables through `GeneratedTokenTests`. `DSColor(brand:transparency:)` would keep its shape if a later ticket moved components to literal tables (for example a watch design that needs Increase Contrast, F19; §16.2).

#### 9.7.4 Token set (`DSTokenSet.swift`, `DSTokenSet+<Category>.swift`)

Rules: a member with no runtime dependency is a constant; a member with one axis is set by a `switch` on that axis; colorScheme-dependent members switch on the fields they need (`colorScheme`, plus `contrast` / `transparency` only where a variant delta touches them). A member whose value differs across repo brands switches on `c.brand` first; member shapes use the union of dependencies over brands. A `comp` member is initialized from its target's accessor for the same context, so components get no duplicate colorsets.

```swift
import SwiftUI
public struct DSTokenSet: Hashable, Sendable {
    public let context: DSTokenContext
    public let color: DSColor                                        // DSColor(brand: context.brand, transparency: context.transparency)
    public let space: Space, size: Size, radius: Radius, border: Border, typography: Typography, motion: Motion, material: Material
    public let elevation: Elevation, shadow: Shadow, gradient: Gradient, opacity: Opacity, zIndex: ZIndex, icon: Icon, chart: Chart
    public let stroke: Stroke, interaction: Interaction
    public let components: Components
    public init(_ context: DSTokenContext = .default) {
        self.context = context
        color = DSColor(brand: context.brand, transparency: context.transparency)
        space = Space(context); size = Size(context); radius = Radius(context); border = Border(context); typography = Typography(context)
        motion = Motion(context); material = Material(context); elevation = Elevation(context); shadow = Shadow(context)
        gradient = Gradient(context); opacity = Opacity(context); zIndex = ZIndex(context); icon = Icon(context); chart = Chart(context)
        stroke = Stroke(context); interaction = Interaction(context)
        components = Components(context, color: color, motion: motion, material: material, elevation: elevation)
    }
}

extension DSTokenSet {
    public struct Space: Hashable, Sendable {
        public let step0: CGFloat, step1: CGFloat /* … */, step13: CGFloat
        /// sys.space.card-padding (density)
        public let cardPadding: CGFloat
        public let tileGap: CGFloat /* , cardGap, groupGap, sectionGap, pageMargin */
        init(_ c: DSTokenContext) {
            step0 = 0; step1 = 4 /* … */; step13 = 104
            switch c.density {
            case .compact:     cardPadding = 16; tileGap = 4
            case .regular:     cardPadding = 24; tileGap = 6
            case .comfortable: cardPadding = 24; tileGap = 8
            }
        }
    }
    public struct Size: Hashable, Sendable {
        public let controlSm: CGFloat, controlMd: CGFloat, controlLg: CGFloat, row: CGFloat   // density (ADR-0024 §7)
        public let hit: CGFloat                                                               // sys.size.hit (modality)
        init(_ c: DSTokenContext) {
            switch c.density {
            case .compact:     controlSm = 28; controlMd = 32; controlLg = 40; row = 32
            case .regular:     controlSm = 32; controlMd = 40; controlLg = 44; row = 44
            case .comfortable: controlSm = 44; controlMd = 48; controlLg = 52; row = 52
            }
            switch c.modality { case .pointer: hit = 28; case .touch: hit = 44 }
        }
    }
    public struct Motion: Hashable, Sendable {
        public let durationBase: TimeInterval /* … */
        public let springSnappy: DSSpringToken /* springInteractive, springSmooth, springSheet, springBouncy */
        public let presentationCrossfade: Bool          // flag (S10): ADR-0023 §8.4's substitutions apply
        init(_ c: DSTokenContext) {
            switch c.motion {
            case .standard:
                durationBase = 0.25; presentationCrossfade = false
                springSnappy = DSSpringToken(duration: 0.35, bounce: 0.15, blendDuration: 0, settle: 0.487, mass: 1, stiffness: 322.2728, damping: 30.5183)
            case .reduced:
                durationBase = 0.15; presentationCrossfade = true
                springSnappy = DSSpringToken(duration: 0.25, bounce: 0, blendDuration: 0, settle: 0.367, mass: 1, stiffness: 631.6547, damping: 50.2655)
            }
        }
    }
    public struct Material: Hashable, Sendable {        // typed recipe fields (ADR-0022 §2); Surface alone applies the fallback
        public let glassDarkFill: Color                 // material.glass.dark.fill.$root, brand-scoped colorset
        public let glassDarkFillBlur: CGFloat, glassDarkFillSaturate: Double
        public let glassDarkFillEdgeStart: Double, glassDarkFillEdgeEnd: Double, glassDarkFillGrain: Double, glassDarkFillBloom: Double
        /* … the same seven members for glassDarkChip, glassLightFill, glassLightChip, glassCell; glassScrim: Color */
        init(_ c: DSTokenContext) {
            glassDarkFill = DSColorToken.materialGlassDarkFill.color(c.brand)
            switch c.colorScheme {
            case .light:
                glassDarkFillBlur = 40; glassDarkFillSaturate = 0.8
                glassDarkFillEdgeStart = 0.22; glassDarkFillEdgeEnd = 0.08; glassDarkFillGrain = 0.04; glassDarkFillBloom = 0
            case .dark:
                glassDarkFillBlur = 32; glassDarkFillSaturate = 1.2
                glassDarkFillEdgeStart = 0.15; glassDarkFillEdgeEnd = 0; glassDarkFillGrain = 0; glassDarkFillBloom = 0
            }
        }
    }
    public struct Elevation: Hashable, Sendable {       // sys.elevation.0…3 (renamed from sys.shadow.flat|raised|floating|overlay, ADR-0024 §6)
        public let level0: DSShadowToken, level1: DSShadowToken, level2: DSShadowToken, level3: DSShadowToken
        init(_ c: DSTokenContext) {
            switch c.colorScheme {
            case .light: level2 = DSShadowToken(layers: [DSShadowLayer(color: DSRGBA(.sRGB, 0, 0, 0, 0.07), x: 0, y: 6, blur: 16, spread: 0, inset: false)]) /* … */
            case .dark:  level2 = DSShadowToken(layers: [DSShadowLayer(color: DSRGBA(.sRGB, 0, 0, 0, 0.3), x: 0, y: 8, blur: 24, spread: 0, inset: false)]) /* … */
            }
        }
    }
    public struct Shadow: Hashable, Sendable { public let drawer: DSShadowToken /* sys.shadow.drawer, colorScheme */ }
    public struct Gradient: Hashable, Sendable {        // sys.gradient.vivid.default and .1…4 (colorScheme, ADR-0024 §6)
        public let vividDefault: DSGradientToken, vivid1: DSGradientToken /* vivid2, vivid3, vivid4 */
    }
    public struct Typography: Hashable, Sendable {      // one member per sys.type.<role>
        public let bodyMd: DSTypeRole, metricXl: DSTypeRole /* displayXl, …, data */
        init(_ c: DSTokenContext) {
            bodyMd = DSTypeRole(slot: .ui, size: 15, weight: 400, boldWeight: 600, lineHeight: 1.5, trackingEm: 0,
                                numeric: .proportional, textStyle: .subheadline)
            switch (c.colorScheme, c.contrast) {        // ADR-0021 §3–§4: dark weight and Increase Contrast floor
            case (.light, .standard): metricXl = DSTypeRole(slot: .display, size: 48, weight: 300, boldWeight: 400, lineHeight: 1, trackingEm: -0.01, numeric: .proportional, textStyle: .largeTitle)
            case (.dark, .standard):  metricXl = DSTypeRole(slot: .display, size: 48, weight: 200, boldWeight: 400, lineHeight: 1, trackingEm: -0.01, numeric: .proportional, textStyle: .largeTitle)
            case (_, .increased):     metricXl = DSTypeRole(slot: .display, size: 48, weight: 400, boldWeight: 400, lineHeight: 1, trackingEm: -0.01, numeric: .proportional, textStyle: .largeTitle)
            }
        }
    }
    public struct Components: Hashable, Sendable {
        public let button: Button, card: Card
        public struct Button: Hashable, Sendable {
            /// Solid inverse pill is the only fill.
            public let primaryBgRest: Color              // → color.bgFillInverse
            public let radius: CGFloat, heightMd: CGFloat, paddingXMd: CGFloat, gap: CGFloat   // heightMd → size.controlMd (density)
            public let motionPress: DSSpringToken        // → motion.springSnappy (motion-dependent)
        }
        public struct Card: Hashable, Sendable {
            public let solidBg: Color                    // → color.bgSurface
            public let glassFill: Color                  // → material.glassDarkFill
            public let padding: CGFloat                  // → space.cardPadding (density)
            /* … */
        }
        init(_ c: DSTokenContext, color: DSColor, motion: Motion, material: Material, elevation: Elevation) { /* generated */ }
    }
}
```

`$description` becomes a `///` comment, `$deprecated` becomes `@available(*, deprecated, message: "…")`.

#### 9.7.5 Brands (`DSBrand.swift`)

```swift
// From brands/<name>/brand.json and each brand's resolved sys.font.* at platform=apple (ADR-0020 §5).
public enum DSBrand: String, CaseIterable, Hashable, Sendable {
    case prism = "prism", prismNative = "prism-native"
    public static let `default`: DSBrand = .prism
    public var preset: DSFontPreset { switch self { case .prism: .signature; case .prismNative: .native } }
    /// Colorset namespace folder; prism-native's colorsets are byte-identical to prism's, so it shares the folder (ADR-0020 §7).
    public var colorNamespace: String { switch self { case .prism, .prismNative: "prism" } }
    public var faces: [DSFontSlot: DSFontFace] {
        switch self {
        case .prism: [
            .ui: DSFontFace(families: ["Onest"], file: "onest/Onest[wght].ttf",
                            postScriptNames: [100: "Onest-Thin", 400: "Onest-Regular" /* … */], opticalSize: nil, system: nil),
            .mono: DSFontFace(families: ["JetBrains Mono"], file: "jetbrains-mono/JetBrainsMono[wght].ttf",
                              postScriptNames: [300: "JetBrainsMonoRoman-Light", 400: "JetBrainsMono-Regular" /* … no 600 */], opticalSize: nil, system: nil),
            /* .display: as .ui */ ]
        case .prismNative: [
            .ui: DSFontFace(families: ["system-ui"], file: nil, postScriptNames: [:], opticalSize: nil, system: .default),
            .display: DSFontFace(families: ["system-ui"], file: nil, postScriptNames: [:], opticalSize: nil, system: .default),
            .mono: DSFontFace(families: ["ui-monospace"], file: nil, postScriptNames: [:], opticalSize: nil, system: .monospaced) ]
        }
    }
}
```

`faces` comes from `brand.json` (file, PostScript names; paths relative to `Resources/Fonts`) and each brand's `sys.font.*` at `platform=apple`, never from the default permutation, whose platform is `web`. DSCore constructs fonts per ADR-0021 §9 (`@ScaledMetric` size; `Font.custom(face.postScriptName(for: weight), fixedSize:)` for a bundled face, `Font.system(size:weight:design:)` for a system face; `.monospacedDigit()`, tracking, `.lineHeight(.multiple(factor:))`); thin and Increase Contrast weights arrive resolved in `DSTypeRole.weight`, Bold Text as `DSTypeRole.boldWeight`. `DSFontRegistrar` registers the active brand's files synchronously from `DSTheme.init` and asserts every PostScript name (ADR-0021 §9). DSCore, DSComponents and DSCharts never switch over `DSBrand` or use `DSBrand.allCases` (ADR-0020 rule 13).

#### 9.7.6 Tests

- `swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift` (owned): one `#expect` per non-color member and context variation, generated **directly from the IR**, not from the table model, so a renderer bug in `DSTokenSet+*.swift` fails in Swift: `#expect(DSTokenSet(DSTokenContext(density: .compact)).space.cardPadding == 16)`. It covers the brand-dependent members for every brand, `weight` and `boldWeight` for every typography member and context (ADR-0021 rule 3), the `Spring.value` checkpoints of ADR-0023 §11 P4, and one expectation per OS for `platformDefault` (compact + pointer under `swift test` on macOS, regular + touch on the iOS simulator, comfortable + touch + dark on the watchOS simulator; ADR-0019 rule 12).
- A generated test with more than `CHECKS_PER_PART` (48) checks calls private part functions (`prismTypeWeightsPart1()` …), one per chunk of a context: Swift Testing runs tests on secondary threads with 512 KiB stacks, and a debug build keeps a stack slot for every temporary, so one function with every check of a large group overflows (F44, P1-9). `swift.test.ts` checks the bound.
- `swift/Tests/DSTokensTests/SpringParityTests.swift` (hand-written, P1-5) checks every `DSSpringToken` in `DSTokenSet(DSTokenContext(motion: m))` for both `m`: `stiffness` and `damping` equal `Spring(duration:bounce:)` within 1e-4 (absolute); `mass == 1`; and the last sample t = k × 0.1 ms (k integer, t ≤ 5 s) at which `Spring.value(target: 1, initialVelocity: 0, time:)` is at least 0.001 from 1 lies within 1 ms of `settle` (ADR-0023 §11, P1–P3). Neither this file nor `GeneratedTokenTests.swift` reads `Spring.settlingDuration` (0.635 s for snappy against the 0.487 s settle) *(verified)*.
- `swift/Tests/DSTokensTests/ColorCatalogTests.swift` (hand-written, P1-5): skips unless `DSTokensBundle.bundle` contains `Assets.car` (`swift test` copies the catalog uncompiled *(verified)*). Under `xcodebuild test` it iterates brands × colorsets by `<namespace>/<name>`: on iOS, `UIColor(named:in:compatibleWith:)` **followed by `resolvedColor(with:)`** under light, dark, light + high contrast and dark + high contrast trait collections equals `appearances(brand)` within 0.002 (without `resolvedColor(with:)` the dynamic color reports the Any value) *(verified on the iOS 26.5 simulator)*; on watchOS, `Color(name, bundle:).resolve(in: EnvironmentValues())` equals `appearances(brand).watch` *(verified on the watchOS 26.5 simulator)*; the bare name without a namespace returns nil (ADR-0020 facts). Its macOS branch (Any and Dark) runs only in a local `xcodebuild test` on macOS: CI tests on the iOS and watchOS simulators, and a macOS step waits for P3 and V8.

### 9.8 `Colors.xcassets` (`prism/swift-xcassets`)

- One colorset per `sys.color.*` token and per `sys.material.glass.*` color token (each recipe's `$root` and the scrim); a `comp` color gets its own colorset only if it is not a constant alias (none today); `ref` colors get none.
- Colorsets live under `Colors.xcassets/<namespace>/`, one namespace folder per brand with distinct colors (ADR-0020 §7). Each namespace folder has the `Contents.json` `{ "info" : { "author" : "xcode", "version" : 1 }, "properties" : { "provides-namespace" : true } }`; the catalog looks a colorset up as `<namespace>/<name>`. A brand whose colorset files are all byte-identical to those of an earlier brand in resolver order shares that brand's folder (`prism-native` uses `prism/`). A colorset's entries, watch entries included, follow its own brand's values.
- A token in `ΔRT(light) ∪ ΔRT(dark)` (the union over brands) also gets `<name>-reduced-transparency`, holding the reduced-transparency values (its high-contrast entries repeat them, since the deltas are disjoint). After ADR-0022 no token is in ΔRT, so no twin colorsets are emitted; the rule stays for future deltas.
- Root `Contents.json`: `{ "info" : { "author" : "xcode", "version" : 1 } }`.

Entries per colorset (Xcode order):

| Entry | Value from | Emitted when |
|-------|------------|--------------|
| `idiom: universal`, no appearance | `light` | always |
| `luminosity: dark` | `dark` | the token depends on colorScheme |
| `contrast: high` | `light-increased-contrast` | the token depends on colorScheme |
| `luminosity: dark` + `contrast: high` | `dark-increased-contrast` | the token depends on colorScheme |
| `idiom: watch`, no appearance | platform `watch`, colorScheme `dark` | the token depends on colorScheme |

- All four universal entries are written for every scheme-dependent color, so nothing relies on fallback between slots.
- The `watch` entry exists because actool keeps only the Any entry of a universal colorset for watchOS (dark and high-contrast entries are dropped), so watch would render the light palette; a `watch` idiom entry replaces it; appearances on a `watch` entry produce "has an unassigned child" warnings *(verified: actool 26.6 + assetutil, watchOS 26.5 simulator)*. Increase Contrast is therefore not represented on watch (§16, R8).
- The high-contrast key is `{ "appearance" : "contrast", "value" : "high" }`, alone or combined with `luminosity` in one `appearances` array: 421 of the 459 colorsets inside Xcode 26.6 use it (for example `SystemColors-ios.xcassets/labelColor.colorset`); actool compiles it to `UIAppearanceHighContrastAny` / `UIAppearanceHighContrastDark` on iOS and `NSAppearanceNameAccessibilitySystem` / `NSAppearanceNameAccessibilityDarkAqua` on macOS *(verified)*. This closes the roadmap's verify item.
- Components follow §7.2 (Display P3 or authored sRGB), strings with 4 decimals. JSON uses Xcode's style: 2-space indent, `"key" : value`, keys sorted, trailing newline, so opening the catalog in Xcode does not rewrite it.

`prism/color-text-secondary.colorset/Contents.json` (real values; shown compacted, the serializer expands every object onto its own lines):

```json
{
  "colors" : [
    { "color" : { "color-space" : "display-p3", "components" : { "alpha" : "1.0000", "blue" : "0.4049", "green" : "0.3759", "red" : "0.3636" } }, "idiom" : "universal" },
    { "appearances" : [ { "appearance" : "luminosity", "value" : "dark" } ],
      "color" : { "color-space" : "srgb", "components" : { "alpha" : "0.6400", "blue" : "1.0000", "green" : "1.0000", "red" : "1.0000" } }, "idiom" : "universal" },
    { "appearances" : [ { "appearance" : "contrast", "value" : "high" } ],
      "color" : { "color-space" : "display-p3", "components" : { "alpha" : "1.0000", "blue" : "0.2953", "green" : "0.2662", "red" : "0.2539" } }, "idiom" : "universal" },
    { "appearances" : [ { "appearance" : "luminosity", "value" : "dark" }, { "appearance" : "contrast", "value" : "high" } ],
      "color" : { "color-space" : "srgb", "components" : { "alpha" : "0.8000", "blue" : "1.0000", "green" : "1.0000", "red" : "1.0000" } }, "idiom" : "universal" },
    { "color" : { "color-space" : "srgb", "components" : { "alpha" : "0.6400", "blue" : "1.0000", "green" : "1.0000", "red" : "1.0000" } }, "idiom" : "watch" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
```

Tree:

```
swift/Sources/DSTokens/Resources/Colors.xcassets/
  Contents.json
  prism/Contents.json                                  (provides-namespace; prism-native shares it)
  prism/color-bg-page.colorset/Contents.json
  prism/color-text-secondary.colorset/Contents.json
  …
  prism/material-glass-dark-fill.colorset/Contents.json
```

`scripts/verify-xcassets.sh` (apple CI job) compiles the catalog with `xcrun actool --platform iphoneos|macosx|watchos --minimum-deployment-target 26.0 --warnings --errors`, fails on any warning, and checks `assetutil --info` for `prism/color-text-secondary`: the four iOS appearances, the macOS entries and a single `watch` entry on watchOS. actool 26.6 compiles namespaced colorsets for all three platforms without a warning (§15 F32).

### 9.9 Tokens Studio flavor (`tokens/export/tokens-studio/`, from the `SourceModel`)

- **Sets** mirror the resolver's source documents one to one, aliases kept: `ref/color.palette.json`, `sys/base.json`, `sys/color/dark.json`, `comp/button.json`, `brands/prism.json`, `brands/prism-native.json` (set name = path under `tokens/` without `.tokens.json`; brand files `brands/<name>`).
- **Names**: `$root` becomes `default` (asserted free) and alias strings are rewritten to match.
- **Values** (Tokens Studio's DTCG flavor, string-based): color `#rrggbb`, or `rgba(R, G, B, A)` below alpha 1, never `#rrggbbaa` (Tokens Studio reads 8-digit hex as ARGB; the same for `boxShadow` colors and gradient stops, ADR-0024 §12); an alias with `app.prism.alpha` keeps its alias and gets `"$extensions": { "studio.tokens": { "modify": { "type": "alpha", "value": "<A>", "space": "srgb", "format": "hex" } } }` (@tokens-studio/types 0.5.2 `AlphaModifier`, ADR-0020 §3); `space.*` → `spacing`, `size.*` → `sizing`, `radius.*` → `borderRadius`, other dimensions → `dimension`, all as `"24px"`; `opacity.*` numbers → `opacity`; flags → `boolean`; other numbers → `number`; `fontFamily` → `fontFamilies` (joined); `fontWeight` → `fontWeights`; typography → object of strings; shadow → `boxShadow`; gradient → `color` with a `linear-gradient(…)` string. Duration, cubicBezier, transition and object-form strokeStyle are omitted and listed in `tokens/export/README.md`; Tokens Studio has no such types *(verified: `TokenTypes` in @tokens-studio/types 0.5.2)*.
- **`$themes.json`**: grouped themes, one per context of `brand`, `colorScheme` and `density` (the README's brand × scheme × density), `ThemeObject { id, name, group, selectedTokenSets }` *(verified: @tokens-studio/types 0.5.2)*. Brand themes also enable the invariant sets and the default contexts of the other modifiers (`sys/base`, `sys/platform/web`, `sys/modality/pointer`, `sys/motion/default`, `comp/*`), so any one theme per group resolves every alias. A flattened colorScheme context enables both of its files. Multi-mode themes need the paid plan.
- **`$metadata.json`**: `{ "tokenSetOrder": [ … ] }`, the resolution order flattened, each file at its first occurrence (shape unverified, V3).
- **Paid features.** Multi-mode themes and color modifiers (the alpha tokens) need Tokens Studio's paid plan; V3 checks the import. The flavor shows authored typography weights only: the derived dark and Increase Contrast weights (ADR-0021 §4) appear in the Figma-native flavor, and the export README says so.

```json
[
  { "id": "brand-prism", "name": "prism", "group": "brand",
    "selectedTokenSets": { "ref/color.palette": "enabled", "ref/gradient": "enabled", "ref/dimension": "enabled", "ref/typography": "enabled",
                           "ref/motion": "enabled", "ref/elevation": "enabled", "ref/opacity": "enabled", "brands/prism": "enabled",
                           "sys/base": "enabled", "sys/platform/web": "enabled", "sys/modality/pointer": "enabled", "sys/motion/default": "enabled",
                           "comp/button": "enabled", "comp/card": "enabled" } },
  { "id": "colorScheme-dark-increased-contrast", "name": "dark-increased-contrast", "group": "colorScheme",
    "selectedTokenSets": { "sys/color/dark": "enabled", "sys/color/dark-increased-contrast": "enabled" } },
  { "id": "density-compact", "name": "compact", "group": "density", "selectedTokenSets": { "sys/density/compact": "enabled" } }
]
```

### 9.10 Figma-native flavor (`tokens/export/figma/<brand>/<colorScheme>.json`)

- 12 files (2 brands × 6 color schemes), resolved from the IR at `platform=web` and the other axes at defaults (density `compact` since ADR-0019); each file imports as one mode.
- Only `sys.*` and `comp.*` tokens, named by public path as nested groups (`$root` → `default`).
- Only the types Figma imports *(verified: Figma help "Modes for variables")*: colors as sRGB objects with `hex`; dimensions `{ value, unit: "px" }`; durations `{ value, unit: "s" }`; `fontFamily` as one family name; numbers; flags as numbers with `com.figma.type: "boolean"`. Typography is split into its primitives (`…/font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`); springs into `…/duration` and `…/bounce`. Shadows, gradients, cubic Béziers, transitions and stroke styles are omitted and listed in `tokens/export/README.md`.
- Every exported variable carries code syntax derived from §8, never from the source (ADR-0026): `WEB` = `var(--ds-<css name>)`, `iOS` = the `DSTokenSet` member path (`tokens.color.bgSurface`). The flavor test compares both with the generated web and Swift names (ADR-0026 rule 3). Confirm the exact key Figma's native import reads for code syntax during V4 and keep the derivation in one function (`formats/figma/code-syntax.ts`).
- Code syntax names the member that carries a primitive on each stack, which does not always hold the variable's quantity; `tokens/export/README.md` says so. A typography `letter-spacing` variable is px at the role's size, like every exported dimension, while its `WEB` (`var(--ds-type-metric-xl-letter-spacing)`) and `iOS` (`tokens.typography.metricXl.trackingEm`) are em: −0.48 px = −0.01 em × 48 px. The web has no property holding a spring's Apple `duration` or `bounce`, so both halves name the transition shorthand on `WEB` (`var(--ds-motion-spring-snappy)`: the settle duration and its `linear()` curve) and the `DSSpringToken` field on `iOS`. V4 checks whether Figma's import takes letter spacing in em; if it does, the flavor exports em and the units agree.
- Values only, no aliases (cross-file aliases need `com.figma.aliasData` variable ids; follow-up). Translucent colors keep `alpha`; `hex` is the same color without alpha (ADR-0024 §12). Flavor tests assert that every translucent source color keeps its alpha in every flavor file that exports it, and that no color string under `tokens/export/` is a `#` value longer than 7 characters; whether Figma's import keeps an alpha below 1 is V4.

```json
{
  "color": {
    "bg": {
      "page": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.051, 0.0549, 0.0667], "alpha": 1, "hex": "#0d0e11" } },
      "surface": { "default": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [1, 1, 1], "alpha": 0.06, "hex": "#ffffff" } } }
    }
  },
  "interaction": { "hover": { "$type": "number", "$value": 1, "$extensions": { "com.figma.type": "boolean" } } },
  "motion": { "duration": { "base": { "$type": "duration", "$value": { "value": 0.25, "unit": "s" } } } },
  "space": { "card-padding": { "$type": "dimension", "$value": { "value": 16, "unit": "px" } } }
}
```

### 9.11 Descriptions and deprecation

`$description` → Swift `///`, TS JSDoc, manifest; `$deprecated` → Swift `@available(*, deprecated, message:)`, TS `@deprecated`, manifest. CSS carries no per-token comments (block headers only).

### 9.12 Self-verification (runs inside `tokens:build` and in tests)

- `verify/css-cascade.ts` evaluates the `CssRule` model in a small cascade engine: selector matching for exactly the forms Prism emits (`:root`, attribute tests, `:not()` including a selector list, which counts as its most specific argument, descendant), specificity (each counts (0,1,0)), source order, one layer, inheritance of computed values, `var()` substitution, media and `@supports` conditions. For all 128 runtime combinations per brand (the 96 resolver permutations plus the 32 synthesized contrast + transparency combinations) in these scenarios the computed value of every custom property must equal the literal rendering of the IR:
  1. all preferences as root attributes;
  2. the same preferences through media features only;
  3. nested scheme scopes (light in dark, dark in light, depth 3) under contrast and transparency;
  4. nested density scopes;
  5. `color-gamut: p3` on and off, `linear()` supported and unsupported;
  6. absent, empty and unknown attribute values on `<html>` and on nested elements (ADR-0019 rule 2);
  7. the density root fallback, with and without nested density scopes;
  8. `(any-pointer: coarse)` and `(hover: hover) and (pointer: fine)` as independent booleans (four combinations; ADR-0019 rule 5).
- `verify/tables.ts` evaluates `resolveTokens` for all 128 web contexts per brand against the IR (the synthesized contrast + transparency contexts against `s ⊕ ΔIC ⊕ ΔRT`); `verifySwiftTables` (`formats/swift/model.ts`, run by the Swift format on every render) does the same for the Swift table model over all 128 contexts × {apple, watch} × brands.
- A snapshot test proves `render.ts` against the model; a real-browser check of the selector forms belongs to P3-4 VRT.
- `guards.test.ts` gives every guard of `verify/` and of the formats that no other test drives a failing input (a crafted file, model, table or source overlay), so each check is shown to fire, not only to stay quiet on the repository.

---

## 10. P1-6 contrast interface (`api.ts`, `ir/color-math.ts`)

```ts
export interface BuildOptions {
  readonly root?: string;                    // repository root; default: resolved from import.meta.url
  readonly reader?: SourceReader;            // fsReader(root) by default; gitReader(ref) for diffs
  readonly resolver?: string;                // repository-relative path; default 'tokens/prism.resolver.json'
  readonly filter?: Partial<Record<ModifierName, readonly ContextName[]>>;
}
export function buildBundle(opts?: BuildOptions): Promise<IRBundle>;   // throws TokenBuildError { diagnostics }

/** Public name, id or glob → token ids. Tries, in order: exact id; <name>.$root; sys.<name>; sys.<name>.$root; comp.<name>; ref.<name>; ref.<name>.$root.
 *  A '*' segment matches one segment ('gradient.vivid.*' → the sys.gradient.vivid.* tokens of the context's scheme once S6 lands,
 *  else ref.gradient.vivid.*); '**' matches one or more (ADR-0024 §13.2). Spec validation (P2-1) accepts only sys matches and
 *  own-component comp matches (ADR-0024 §5.2); the ref. fallback serves documents and contrast pairs.
 *  Unknown names throw with the nearest public paths as suggestions. */
export function lookup(bundle: IRBundle, name: string): readonly string[];
export function publicPath(id: string): string;                         // 'sys.color.bg.surface.$root' → 'color.bg.surface'
export function brandMeta(opts?: Pick<BuildOptions, 'root' | 'reader'>): Promise<ReadonlyMap<string, BrandMeta>>;   // brand.json per brand context, no resolution (tools/fonts)

export interface ResolvedColor {
  readonly id: string; readonly path: string;
  readonly srgb: Triple; readonly alpha: number;                         // CSS-gamut-mapped, gamma-encoded sRGB: what WCAG and sRGB displays see
  readonly p3: Triple; readonly hex: string;
  readonly aliasChain: readonly string[];                                // ['sys.color.text.secondary', 'ref.color.neutral.600']
}
export interface ContrastContext {
  readonly brand: string;
  readonly colorScheme: ContextName;                                     // flattened resolver context, e.g. 'dark-increased-contrast'
  readonly scheme: 'light' | 'dark';
  readonly variant: 'none' | 'increasedContrast' | 'reducedTransparency';
  readonly permutation: PermKey;
  color(name: string): ResolvedColor;                                    // name via lookup; must resolve to exactly one color
  colors(name: string): readonly ResolvedColor[];                        // name or glob: every color token it matches (P1-9, token backdrops)
  gradient(name: string): readonly { readonly id: string; readonly stops: readonly { readonly color: ResolvedColor; readonly position: number }[] }[];
}
/** brand × colorScheme (12 today) at platform=web and the other axes at defaults. Throws if any color used by the
 *  contrast pairs depends on another axis (from bundle.analysis) or differs between web and apple for the same context. */
export function contrastContexts(bundle: IRBundle): readonly ContrastContext[];

// ir/color-math.ts
export interface Rgba { readonly srgb: Triple; readonly alpha: number }
export function over(top: Rgba, bottom: Rgba): Rgba;                    // source-over in gamma-encoded sRGB (the CSS and UIKit default)
export function flatten(bottomToTop: readonly Rgba[]): Triple;         // the bottom layer must be opaque, else throws
export function relativeLuminance(rgb: Triple): number;                // WCAG 2.x
export function contrastRatio(a: Triple, b: Triple): number;           // (L1 + 0.05) / (L2 + 0.05); both opaque
export function hexToRgba(hex: string): Rgba;                          // for contrast-pairs.json backdrops
```

`tools/contrast/check.ts` policy (the compositing rules belong to P1-6; this is the recommended default):

1. For each context and pair, resolve `fg` and `bg` with `ctx.color()`.
2. Background: if translucent, `flatten([color.bg.page, bg])`; `color.bg.page` must be opaque.
3. Foreground: if translucent, `over(fg, bgFlat)`.
4. `backdrops`: each entry is a hex color, a gradient glob or a token backdrop. A glob expands to every stop of every matched gradient of the context's base scheme, plus every V1 sample between stops. A token backdrop (P1-9, ADR-0030 §1.5) names color tokens by name or glob and, after ` over `, the opaque color they sit on: `color.map.land|block|building|road|road-casing|water|park over color.map.land` composites each map ground over the land; without ` over ` the named colors must be opaque. For each backdrop, `bgFlat = flatten([backdrop, bg])`; every backdrop must pass (ADR-0022 §3.3: dark glass over #283126, #5B6366, #959595 and the scheme's vivid stops; light glass per scheme; ADR-0029 §1.6: the scheme's glass over the map grounds as well). Vivid pairs and backdrops name `ref.gradient.vivid.*`, so a gradient outside the slots (ember-night) stays checked (ADR-0029 §2.6).
5. Optional `schemes`: the base schemes (`light`, `dark`) in which the pair is evaluated, their contrast and transparency variants included.
6. `bg: "gradient.vivid.*"` with `stops: "all"`: every stop plus 100 samples per segment, interpolated in gamma sRGB and in OKLab (ADR-0022 V1). With `region: "card-header"`: the minimum over ADR-0022's header block (x from p to W − p − a − 16, y from p to p + 64; W × H ∈ {166×166, 240×240, 320×200, 180×240}; (p, a) ∈ {(16, 32), (24, 40), (24, 48), (16, 40)}, the last from the `watch` density, sixteen geometries; t per visual-dna §5.1 rule 2 with CSS angle semantics), sampled the same way (V2). No text-safe zone exists; `stops: "text-zone"` is gone.
7. Threshold: `thresholds[tier]`; `functional` uses `functionalLarge` when `minSizePx ≥ 24`; `decorative` requires `minSizePx ≥ 24`.
8. Output: a Markdown table (pair × context: ratio to two decimals, threshold, pass); exit 1 on any failure.

The tool also checks that every `a11y.pairsWith` declared on a `sys.color.text.*` token appears in `contrast-pairs.json` (tokens README rule 4), and (P1-9, `tools/contrast/map.ts`) that every map ground composited over `color.map.land` stays inside the backdrop limit of the glass on the map: OKLCH L ≥ 0.45 in light and ≤ 0.35 in dark (`map/backdrop-limit`, ADR-0030 §1.5), listed in the report's "Map backdrops" table; a resolver without `color.map.land` has no map. It runs every pair for every brand in all six colorScheme contexts (ADR-0020 rule 10); the pairs ADR-0022 adds (§3.1 tone table on `raised`, glass, light glass, vivid and inverse; the §3.3 backdrop sets; V1 and V2) must exist before the gate opens, which is after P1-1 retunes the gradients and P1-2 the dark chips and cells.

---

## 11. P1-7 diff interface (`diff.ts`, `diff/*.ts`, `api.ts`)

```ts
export function gitReader(ref: string, root?: string): SourceReader;   // read-only: `git show <ref>:<path>`, `git ls-tree`
export function lastReleaseTag(root?: string): string | null;          // newest tag merged into HEAD matching ^v?\d+\.\d+\.\d+$

export type Bump = 'patch' | 'minor' | 'major';
export type TokenChange =
  | { readonly kind: 'removed'; readonly path: string; readonly level: 'major' }
  | { readonly kind: 'type-changed'; readonly path: string; readonly from: TokenType; readonly to: TokenType; readonly level: 'major' }
  | { readonly kind: 'axes-changed'; readonly path: string; readonly from: readonly RuntimeAxis[]; readonly to: readonly RuntimeAxis[]; readonly level: 'major' }
  | { readonly kind: 'context-removed'; readonly modifier: string; readonly context: string; readonly level: 'major' }
  | { readonly kind: 'added'; readonly path: string; readonly level: 'minor' }
  | { readonly kind: 'value-changed'; readonly path: string; readonly permutations: readonly PermKey[]; readonly level: 'minor' }
  | { readonly kind: 'deprecated'; readonly path: string; readonly level: 'minor' }
  | { readonly kind: 'context-added'; readonly modifier: string; readonly context: string; readonly level: 'minor' }
  | { readonly kind: 'meta-changed'; readonly path: string; readonly fields: readonly ('description' | 'metadata' | 'alias')[]; readonly level: 'patch' };
export function diffBundles(prev: IRBundle, next: IRBundle): readonly TokenChange[];   // sorted by path, then kind
export function requiredBump(changes: readonly TokenChange[], policy?: 'strict' | 'shifted'): Bump | null;
export function declaredBump(changesetDir: string): Bump | null;       // max over .changeset/*.md for non-ignored @iiiivaska/prism-* packages
```

Rules:

- **Both sides are built by the current tool code.** The previous side reads `tokens/` and `brands/` at the base ref through `gitReader`, so a tooling change never shows up as a token change.
- **Value equality** compares the semantic projection: authored color space, components and alpha; px; ms; spring (duration, bounce, blend); composite structure; folded functional extensions. Derived fields (`srgb`, `p3`, `hex`, curves) are excluded.
- **`axes-changed` is major** because the generated API changes shape: a Swift `let` becomes a `switch`-initialized member of a different struct path, a TS entry changes between `$value` and `$values`, a colorset gains a reduced-transparency twin. Adding a brand can widen a shape for every brand (ADR-0020 §7) and is reported the same way.
- **An alias retarget** that keeps the resolved value everywhere is `meta-changed` (patch).
- **`declaredBump`** parses the YAML front matter of every `.changeset/*.md` except `README.md` (pending changesets since the last release) with `yaml`, ignoring packages listed in `.changeset/config.json` `ignore` (`prism-tools`, `prism-gallery`, `prism-vrt`); the `fixed` group means one bump for all packages.
- **0.x policy** (ADR-0024 §14): derived from the base release tag (`lastReleaseTag()`, or with `--base <ref>` the newest release tag merged into that ref), not from a flag. While its major is 0 the policy is `shifted`: required major becomes minor, minor becomes patch, patch stays patch; from 1.0 on it is `strict`. The summary prints the policy used. Reaching 1.0 is a deliberate major changeset. While Prism is 0.x, Swift consumers depend with `.upToNextMinor(from:)`.
- **CLI**: `tokens:diff [--base <ref>] [--changesets <dir>] [--json] [--allow-invalid-baseline <reason>]`. The base defaults to `lastReleaseTag()`. Output: a Markdown table on stdout and in `$GITHUB_STEP_SUMMARY`. Exit 1 when `declared < required`.
- **Baseline cases**:
  - no release tag yet (today): exit 0 with the notice "no baseline; every token counts as added";
  - the tag's sources fail the current validation: **exit 1** with the diagnostics, unless `--allow-invalid-baseline "<reason>"` is passed by a person (the reason goes into the summary). CI never passes it, so tightening validation cannot silently switch the gate off.
- CI already checks out with `fetch-depth: 0` and runs the step on pull requests only.

---

## 12. Determinism rules

1. **Order.**
   - Token ids compare segment by segment: `$root` first, numeric segments numerically (`space.2 < space.10`), others by UTF-16 code unit (never `localeCompare`). Tiers order `ref < sys < comp`.
   - Contexts keep declaration order; permutations follow `resolutionOrder`.
   - Within a CSS block, declarations follow token order; for one token the base declaration comes first, then derived declarations by suffix in code-unit order.
   - Never rely on object key order (integer-like keys reorder); every output object is built in sorted order.
2. **Numbers** go through `transforms/format-number.ts`: `n.toFixed(d)`, trailing zeros and a trailing dot removed, `-0` → `0`, never exponent notation. Decimals:

   | Quantity | Decimals |
   |----------|----------|
   | OKLCH L, C | 4 |
   | OKLCH H | 2 |
   | `rgb()` channels (0–255) | 1 |
   | alpha | 3 |
   | sRGB and P3 components (Swift, TS, Figma) | 4 |
   | colorset components | exactly 4, as strings |
   | px | 3 |
   | rem, em | 4 |
   | ms | 3 |
   | seconds (Swift durations) | 4 |
   | spring stiffness, damping | 4 |
   | `linear()` values / positions | 4 / 2 |
   | other numbers | 4 |

3. **Own serializers only.** No Color.js `toString()`, no Motion `toString()`, no SD formats, no prettier.
4. **No volatile content.** No timestamps, git SHAs, absolute paths, hostnames, locale-dependent text or tool versions. Headers are static text.
5. **Text files**: UTF-8 without BOM, LF, a final newline, no trailing whitespace. JSON: `JSON.stringify(x, null, 2) + '\n'`, except colorsets (Xcode style, §9.8).
6. **Writer**: writes only changed bytes, deletes stale files in owned roots, never writes elsewhere. `--check` fails on added, changed or removed files. CI also runs `git status --porcelain` on the generated paths, which catches untracked files; that list is the one `output/roots.test.ts` asserts equal to `OWNED_ROOTS` (§9.0).
7. **One Color.js**: the catalog keeps `colorjs.io ^0.5.2`, the range SD 5.5.3 depends on, so Prism and SD share one copy. The lockfile fixes exact versions (CI installs with `--frozen-lockfile`); a dependency bump shows up as a reviewable generated diff.
8. **Floating point**: the Node major is pinned (`.node-version` = 24); V8's math is the same on macOS and Linux for one version, and fixed rounding absorbs ULP noise.
9. **Offline**: the build is a function of `tokens/`, `brands/`, the tool code and the lockfile; schema validation uses the vendored copies (ADR-0024 §10).
10. **Proof**: a test builds twice in one process with shuffled source read order and different `TZ` and `LANG`, and compares bytes. For the IR, `ir/bundle.test.ts` builds `fixtures/valid` twice from fresh module instances (every memo empty): once plainly under `TZ=UTC LANG=C`, once with shuffled directory listings after a warm-up in another context order under `TZ=Asia/Tokyo LANG=ru_RU.UTF-8`, and compares the JSON of every permutation, the brands and the analysis; `engine/sd.test.ts` runs permutations, failing trees and the same permutations again and compares their IR (no Style Dictionary state survives a run). P1-5 extends the proof to the output bytes.

---

## 13. Performance

| Phase | Measured or estimated |
|-------|-----------------------|
| Parse about 35 source files | ~10 ms (estimate) |
| Merge 432 trees | 14–27 ms (measured by the output-first and IR-first probes) |
| 432 SD runs with the normalizer | 2.8 s minimal normalizer *(verified)*; 4.2 s fuller normalizer (IR-first probe). One run per distinct document stack (§6) makes it 192 runs; the IR is still built for all 432 permutations |
| Composition proof over 432 permutations | < 1 s naive *(verified)*; 147 ms optimized (output-first probe) |
| Formats + cascade simulation + table evaluation | ~1 s (estimate) |
| Writing ~100 colorsets, ~20 Swift files, ~7 web files, ~30 flavor files | < 0.3 s (estimate) |
| **`tokens:build` total** | ~6 s locally, ~12 s on a 2-vCPU runner (estimate); after P1-9, 576 permutations in 384 runs, about 10 s locally (measured 2026-09-16) |
| Peak memory | ~410 MB RSS with every IR held *(verified)*; drop each merged tree after its run and intern identical `IRToken` objects if it grows |
| `tokens:diff` | two bundles, ~2× the build |

Each new brand adds 288 permutations since P1-9 (216 before; about 1.9 s at 6.5 ms each). Beyond ~30 s in CI, move SD runs to `worker_threads` (one SD per worker; in-process concurrency is unsafe because of the `GroupMessages` singleton).

---

## 14. Implementation order

Order: P1-1 and P1-2 (source fixes, lint) → P1-3 → P1-4 → P1-5, with P1-6 after P1-3 and P1-7 after P1-5; P1-8 after P1-1 and P1-5 (its font emission writes owned roots). The contrast gate (P1-6) opens only after P1-1 has retuned the gradients and P1-2 the dark chips and cells (ADR-0022 Consequences). Tests use Vitest 4 (`tools/vitest.config.ts`); files that call SD must not use `test.concurrent`. Tests against the real repository live in one file per ticket (`repo.test.ts` style) that builds the bundle once; they are `test.todo` until the prerequisite fixes of §1 land.

The token work below applies ADR-0019 to ADR-0024 to the source. Values not listed stay as they are.

### P1-1 — `ref.*` review

- **Files** (data):
  - `tokens/ref/motion.tokens.json` (S7): rename the easing key `inOut` (line 60) to `in-out`, and the alias `{ref.motion.easing.inOut}` in `ref.motion.spring.smooth` (line 152) to `{ref.motion.easing.in-out}`. `ref.motion.spring.interactive` `$description` becomes "tracks a live gesture; Apple interactiveSpring duration and blend (0.15 s, 0.25 s); bounce 0 is Prism's choice, Apple's interactiveSpring bounce is 0.15 (ADR-0023)"; its values stay (0.15, 0, blendDuration 0.25, settle 0.22, `$value.duration` 220 ms). Optional role `$description`s on the five easings, matching ADR-0023 §9. No spring or duration value changes.
  - `tokens/ref/typography.tokens.json`:
    - S8: `ref.type.scale` = `{ "$type": "number", "$value": 1, "$description": "Brand type-scale multiplier (ADR-0008 decision 1); the build multiplies every typography fontSize and letterSpacing by it." }` (ADR-0024 §8; bounds [1, 1.25], ADR-0021 §6).
    - S11: `$extensions["app.prism"].textStyle` on every role (ADR-0021 §7): display.xl, display.lg, display.md, title.lg, metric.xl, metric.lg, metric.unit → `largeTitle`; title.md → `title2`; title.sm, metric.md → `title3`; headline → `headline`; body.lg → `body`; body.md, body.sm, label.lg → `subheadline`; label.md, eyebrow, data → `footnote`; label.sm, caption → `caption`; micro → `caption2`. An explicit `numeric` on every role: `tabular` on metric.md and data, `proportional` elsewhere. Keep the `slot` keys.
    - S14: `metric.xl` keeps fontWeight 300 and gains `"darkWeight": 200`. Descriptions (ADR-0021): the group becomes "Typography roles at the role scale (sizes in px = pt). Standard weights: 300 (only at ≥ 20 px), 400, 500; nothing heavier outside Bold Text. Thin weights (100–200) exist only as a metric role's darkWeight at ≥ 34 px. The build derives the dark, Increase Contrast (floor 400) and Bold Text weights (ADR-0021)."; `display.xl` "page hero title set into the backdrop; never thin (ADR-0021)"; `metric.xl` "the one hero numeral per screen; 300 in light, 200 in dark (darkWeight); proportional figures unless the value is live; trailing group in text.dimmed at the same size"; `metric.lg` "card metric; never thin (32 px is below the 34 px threshold)". The caption description stays (B20 is applied). No fontWeight, fontSize, lineHeight or letterSpacing value changes.
    - S12: `ref.font.ui` and `ref.font.display` = `["Onest", "system-ui", "sans-serif"]`, `ref.font.mono` = `["JetBrains Mono", "ui-monospace", "monospace"]`; new group `ref.font.apple` (inheriting `$type: fontFamily`) with `ui` `["Onest"]`, `display` `["Onest"]`, `mono` `["JetBrains Mono"]`; `ref.font.ui` `$description` "Web stack of the ui slot: served families and CSS generics only (ADR-0020)". No font `$description` names an Apple family.
  - `tokens/ref/color.palette.tokens.json`:
    - S9: group `ref.color.slot` (`$type: color`): `light` { `bg-page`: `{ref.color.neutral.100}`, `bg-fill-accent`: `{ref.color.accent.300}`, `text-on-accent`: `{ref.color.neutral.950}`, `text-accent`: `{ref.color.accent.800}` }, `dark` { `bg-page`: `{ref.color.neutral.950}`, `bg-fill-accent`: `{ref.color.accent.500}`, `text-on-accent`: `{ref.color.neutral.950}`, `text-accent`: `{ref.color.accent.500}` }; each `$description` names the `sys` id that aliases it and says "brand slot (ADR-0020)".
    - Series (ADR-0020 §4): `ref.color.series.light.1` = `{ref.color.neutral.950}` (ΔE2000 0.23 from #0E0F12), `series.light.2` = `{ref.color.accent.700}`, `series.dark.1` = `{ref.color.neutral.0}`, `series.dark.2` = `{ref.color.accent.500}`; slots 3–6 stay literals until critic C-10.
    - S13: system-owned (outside `BRAND_OVERRIDABLE`) `ref.color.smoke.light` = `{ "colorSpace": "oklch", "components": [0.1504, 0.0092, 128.7], "alpha": 1, "hex": "#0a0c08" }` and `ref.color.smoke.dark` = `{ "colorSpace": "oklch", "components": [0.1853, 0.0102, 145.1], "alpha": 1, "hex": "#101410" }`, `$description` "smoked-glass tint; system-owned (ADR-0020)".
    - Visual-dna B10 (applied): the `neutral` and `accent` group descriptions give OKLCH hues with the HSL hues beside them: neutral "OKLCH hue 261.6-271.4, chroma 0.003-0.019; HSL hue 220-225", accent "OKLCH hue 57.6 at step 500; HSL hue 27".
  - `tokens/ref/gradient.tokens.json` (S18, ADR-0022 §4): retune the stops until V1 (every stop and every sampled point, 100 per segment in gamma sRGB and OKLab, ≥ 3.0:1 against white) and V2 (the Card header block ≥ 4.5:1 at the twelve geometries of §10) hold, while no light stop gets so dark that ink on the light chip drops below 4.5:1 (about 7:1 against white, hue-dependent; ADR-0022 F16). Order: the default pair first (sky's light end, 2.46 at @1, to ≥ 3.0; plum-dusk passes); orchid (reverse the stops or darken stop 0, V2 2.47 today; light end ≥ 3.0); olive (V2 2.58, @1 1.51) and rose (V2 3.45, @1 2.67): darken the start region, light ends ≥ 3.0; ember-night @1 2.62, navy-cyan @0.75 2.70 and @1 2.19. Keep angle, grain, scheme and bloom. Replace every description's "see visual-dna.md for the text-safe zone" with "passes ADR-0022 V1/V2". Author each `hex` with the repository's Color.js (`tokens:normalize --check` confirms it from P1-4). The retuned default pair goes to the owner with the direction board (P3-0).
  - `tokens/ref/dimension.tokens.json` (S17): `ref.blur.cell` = 12 px and `ref.blur.pill` = 24 px, next to chip, glass, glass-light and bloom.
  - `tokens/ref/opacity.tokens.json`: delete `ref.opacity.glass.*` (S17) and every other unreferenced alpha step (`text.*`, `surface.*`, `hairline`, `boundary`, `tint.*`, `chart.*`; ADR-0020 §3); keep `disabled` and `dimmed-row`.
  - `a11y.pairsWith` on every `sys.color.text.*` declaration, and `figma` metadata (`tokens/README.md`, "Metadata"): `collection` (the layer that owns the id: `base`, `colorScheme`, `density`, `modality`, `platform` or `component`) and `scopes` on every `sys` and `comp` declaration that Figma imports as a scoped variable (colors, dimensions, font families, numbers other than flags). `ref` tokens, typography, shadows, gradients, transitions, durations, cubic Béziers, stroke styles and flags carry none, and no token authors code syntax: the build derives every emitted name from §8. This is narrower than ADR-0004 decision 8 and ADR-0005 decision 2 ("every token carries `$extensions["app.prism"].figma` (collection, scopes, code syntax)"); the ADRs win, so §16.3 records the disagreement for an amendment.
  - `tools/tokens/seed-ref-tokens.py`: mirror the S7 rename and the `interactive` description so a re-run reproduces the reviewed JSON; after P1-1 neither seed script is re-run (critic G-18).
- **Files** (tools, ADR-0024 §10): `tools/tokens/validate.ts`, `validate.test.ts`, `tools/tokens/schema/dtcg-2025.10/{format.json,resolver.json,SHA256SUMS,LICENSE.md}` (`format.json` SHA-256 `32e93b780e4e4bca778d0780cb797a560deedc470c608af16576223f7e42915f`, `resolver.json` `a5acd14318f3c347ea2d12b4ab0f873d1340e74e957c454d112672e58b1da977`; `LICENSE.md` the W3C Software and Document License text), `fixtures/schema-broken/` (a two-component color); `tools/package.json` script `"tokens:validate": "node tokens/validate.ts"` and devDependency `ajv-formats` (catalog `^3.0.1`); root pass-through `tokens:validate`; `.github/workflows/ci.yml`: the schema step runs `pnpm --filter @iiiivaska/prism-tools tokens:validate` (ungated) and the three `DTCG_*` variables go; `licenses/inventory.json` item `dtcg-schemas-2025-10` (the inventory schema's id pattern `^[a-z0-9-]+$` has no dot; `W3C-20150513`, `adapt-with-attribution`, `packaged: false`, a note on the source repository's W3C 3-clause BSD clause for contributed software) and the matching `THIRD_PARTY_NOTICES.md` row.
- **Tests**: `validate.test.ts`: the repository validates; `fixtures/schema-broken/` fails; one Ajv instance per schema (a shared instance fails, ADR-0024 T7).
- **Acceptance** ("`pnpm tokens:validate` passes against the vendored DTCG 2025.10 schemas and fails on a broken fixture; contrast test passes"): `validate.test.ts` and the CI step; the contrast part is proven once `contrast:check` exists (P1-6).

### P1-2 — `sys.*` and resolver review, orthogonality lint

- **Files** (data):
  - `tokens/prism.resolver.json`: `density.default` → `compact` (ADR-0019 §1); S3 `"reduced": [ { "$ref": "sys/motion/default.tokens.json" }, { "$ref": "sys/motion/reduced.tokens.json" } ]`; `"light-reduced-transparency": [ light ]`, `"dark-reduced-transparency": [ dark ]` and `"watch": [ apple ]` (S16, ADR-0024 §9.5; the contexts stay, the product stays 432); the three `comp/text`, `comp/surface`, `comp/chart` sources removed (S21); S22 `description`: "Prism token resolution: ref -> brand -> sys -> platform -> colorScheme -> density -> modality -> motion -> comp. Modifiers own disjoint token ids (ADR-0024 §9); pnpm tokens:lint and tokens:build check orthogonality."
  - `tokens/sys/base.tokens.json`: group `sys.type` with no `$type` and 21 roles mirroring `ref.type` (display.xl, display.lg, display.md, title.lg, title.md, title.sm, headline, body.lg, body.md, body.sm, label.lg, label.md, label.sm, caption, micro, eyebrow, metric.xl, metric.lg, metric.md, metric.unit, data), each `{ "$type": "typography", "$value": "{ref.type.<role>}" }` with no `$extensions` (S6); delete `sys.size.control` (S20); add `sys.size.card.min` = `{ref.size.card.min}` and group `sys.border` (`$type: dimension`) with `hairline` `{ref.border.hairline}`, `strong` `{ref.border.strong}`, `focus` `{ref.border.focus}` (S6). Chart sizes become dimensions (critic G-04's chart-size bullet, which the roadmap's critic follow-ups route to this review): group `sys.chart` takes `$type: dimension`, and `line-width` 2, `sparkline-width` 1.5, `comparison-width` 1, `marker-size` 8, `endpoint-size` 10, `bar-max-thickness` 24 and `bar-radius` 4 become `{ "value": n, "unit": "px" }` with the same numbers; `chart.curve` and `chart.gauge-stroke-ratio` stay numbers with their own `"$type": "number"`. They stay literals, as ADR-0020 §3 allows for the `chart` values. The generated types change with them: CSS `px`, Swift `CGFloat`, TypeScript px numbers (§7.3).
  - `tokens/sys/density/{compact,regular,comfortable}.tokens.json`: `sys.size.control.sm|md|lg` literals `{ "value": n, "unit": "px" }` = compact 28/32/40, regular 32/40/44, comfortable 44/48/52, no `$root` (S20); delete the `sys.type` group (S15). `tokens/ref/dimension.tokens.json`: delete `ref.size.control.sm|md|lg|xl`, which nothing references any more (S20; this also removes the "pointer default" / "touch default" descriptions).
  - `tokens/sys/color/light.tokens.json` and `dark.tokens.json`:
    - S9: `sys.color.bg.page`, `bg.fill.accent`, `text.on-accent`, `text.accent` = `{ref.color.slot.<scheme>.bg-page|bg-fill-accent|text-on-accent|text-accent}`.
    - S13, light: `{ref.color.neutral.950}` plus `app.prism.alpha` for `bg.surface.nested` 0.06, `bg.fill.neutral.subtle` 0.06, `icon.primary` 0.8, `border.hairline` 0.1, `border.strong` 0.45 (raised from the seeded ink 30 %, which is 2.01:1 on white, below the boundary tier `contrast-pairs.json` checks it at; visual-dna B1), `chart.comparison` 0.3, `chart.comparison-2` 0.15, `chart.target` 0.3, `chart.grid` 0.1, `chart.band` 0.05; `bg.tint.accent` and `accent.subtle` = `{ref.color.accent.500}` alpha 0.12; `accent.glow` = `{ref.color.accent.400}` alpha 0.4. Dark: `bg.tint.accent` and `accent.subtle` = `{ref.color.accent.500}` alpha 0.14; `accent.glow` = `{ref.color.accent.500}` alpha 0.4; `bg.tint.success` = `{ref.color.status.success.dark}`, `bg.tint.warning` = `{ref.color.status.warning.dark}`, `bg.tint.critical` = `{ref.color.status.danger.mark-dark}`, `bg.tint.info` = `{ref.color.status.info.mark-dark}`, each alpha 0.1. White overlays and the black scrims stay literal; dark `border.boundary` rises from white 0.30 to 0.36 (visual-dna B2).
    - Border contrast after B1 and B2 (WCAG 2.x, source-over in gamma sRGB, §10): light `border.strong` (ink 0.45) is 3.03:1 on `bg.page`, 3.09:1 on `bg.surface` and 3.07:1 on `bg.surface.raised`, but only 2.96:1 on `bg.surface.nested` laid over the page (3.02:1 over a card), so it is not a 3:1 edge on a nested fill; `light-increased-contrast`'s 0.6 stays above the base on every one of them (4.89:1 on the page, 5.07:1 on the surface, 4.69:1 on a nested fill over the page). Dark `border.boundary` (white 0.36) is 3.30:1 on `bg.page`, 3.33:1 on `bg.surface`, 3.27:1 on `bg.surface.raised` and 3.18:1 on `bg.surface.nested`; its description names the page and surface-3 values.
    - Descriptions (visual-dna B3, B11–B14; `tools/contrast` output wins from P1-6): light `accent`, `icon.accent` and `chart.now` say `accent.500` is 2.3:1 on white, so the mark always sits with its value, sign or label, and a mark that alone carries meaning uses `accent.700` (4.8:1) (B3); dark `text.secondary`, `text.tertiary` and `text.dimmed` quote 7.59 / 6.73, 5.96 / 5.39 and 4.04 / 3.79 on surface-1 / surface-3 (B11); light `bg.surface.nested` reads "(= #F0F1F1 on white)" (B12); light `text.primary` "17.2:1 on page", `text.on-accent` "ink on accent-300 = 12.0:1", dark `bg.tint.critical` "#322123 on surface-1" (B13); dark `bg.fill.accent-strong` "white text at the large tier only: >= 24 px regular or >= 19 px bold (3.05:1, ADR-0011)" (B14).
    - S6: move `sys.shadow.flat|raised|floating|overlay` into a new group `sys.elevation` (`$type: shadow`) as `0|1|2|3`, keeping each `$value` and `$description` (descriptions naming `shadow.raised` say `elevation.1`); `sys.shadow.drawer` stays. Add group `sys.gradient` (`$type: gradient`) → `vivid` with `default` and `1`–`4`: light `default` `{ref.gradient.vivid.sky}`, 1 sky, 2 olive, 3 rose, 4 orchid; dark `default` `{ref.gradient.vivid.plum-dusk}`, 1 plum-dusk, 2 forest-moss, 3 ember-night, 4 navy-cyan.
    - Materials (S1, S4, S17, S19; ADR-0022 §2): replace `sys.material.glass.{dark.fill,dark.chip,light.fill,light.chip}` with recipe groups of seven tokens, each with its own `$type` (`$root` color, `blur` dimension aliasing `ref.blur.*`, `saturate`, `edge.start`, `edge.end`, `grain`, `bloom` numbers), and add `cell` to light; no material `$extensions`; no `$type` on `sys.material`. Values (fill; blur; saturate; edge start/end; grain; bloom):
      - light: `dark.fill` `{ref.color.smoke.light}` alpha 0.55; `{ref.blur.glass-light}`; 0.8; 0.22/0.08; 0.04; 0 (description "card or drawer over a photo or vivid, on backdrops where white holds 3:1 (ADR-0022 §3.3); drawer 0.35"). `dark.chip` `{ref.color.smoke.light}` alpha 0.35; `{ref.blur.pill}`; 1; 0.22/0.08; 0; 0. `light.fill` white alpha 0.30; `{ref.blur.pill}`; 1.1; 0.55/0; 0; 0. `light.chip` white alpha 0.25; `{ref.blur.chip}`; 1; 0.55/0; 0; 0. `cell` (new) `{ref.color.smoke.light}` alpha 0.35; `{ref.blur.cell}`; 1; 0.22/0.08; 0; 0. `sys.material.glass.scrim` stays black alpha 0.35 with its own `$type: color`.
      - dark: `dark.fill` `{ref.color.smoke.dark}` alpha 0.60; `{ref.blur.glass}`; 1.2; 0.15/0; 0; 0. `dark.chip` retuned from white 0.16 to `{ref.color.smoke.dark}` alpha 0.35; `{ref.blur.chip}`; 1; 0.20/0.12; 0; 0. `light.fill` white alpha 0.26; `{ref.blur.glass-light}`; 1; 0.15/0; 0; 0.35. `light.chip` white alpha 0.16; `{ref.blur.chip}`; 1; 0.15/0; 0; 0. `cell` retuned from white 0.20 to `{ref.color.smoke.dark}` alpha 0.35; `{ref.blur.cell}`; 1; 0.15/0; 0; 0. Scrim black alpha 0.40.
    - ADR-0022 §3.2: `sys.color.text.on-glass-light` (`{ref.color.neutral.950}` in light, `{ref.color.neutral.0}` in dark), `text.on-glass-secondary` (white alpha 0.78) and `text.on-glass-tertiary` (white alpha 0.64) in both files, each with `a11y.pairsWith`; `text.on-glass` description "white on dark glass; light glass uses on-glass-light (ADR-0022)"; `text.on-vivid` description "every vivid gradient passes ADR-0022 V1/V2".
  - `tokens/sys/color/light-increased-contrast.tokens.json` (S13): `border.hairline` 0.3, `border.strong` 0.6, `chart.grid` 0.2, `chart.target` 0.6 and `chart.comparison` 0.6 become `{ref.color.neutral.950}` with those alphas. No increased-contrast file gains a material or typography token.
  - Deleted (S16): `tokens/sys/color/light-reduced-transparency.tokens.json`, `dark-reduced-transparency.tokens.json` (their material overrides, the dark fills at 0.92 and the light scrim override to alpha 0 go with them) and `tokens/sys/platform/watch.tokens.json`.
  - `tokens/sys/platform/apple.tokens.json` and `web.tokens.json`: delete `sys.material.blur` (S16). Apple: `sys.font.ui|display|mono` = `{ref.font.apple.ui|display|mono}`, `$description` "Apple face of the slot (ADR-0020)" (S12); web unchanged.
  - `tokens/sys/motion/default.tokens.json`: group `sys.motion.easing` (`$type: cubicBezier`) with `out`, `in-out`, `drawer`, `hover`, `linear` aliasing the same-named `ref.motion.easing.*`, descriptions per ADR-0023 §9 (S6); `presentation.crossfade` keeps 0, gains `"$extensions": { "app.prism": { "flag": true } }` and the description "Flag. 1 under Reduce Motion: outside an active gesture nothing scales, rotates, blurs or changes depth; presentations fade by opacity over motion.duration.base with motion.easing.out; in-place movement keeps its spring (ADR-0023 §8.4)." (S10). `duration.*` and `spring.*` stay bare aliases (never add a spring to an alias).
  - `tokens/sys/motion/reduced.tokens.json` (S3, S5, S10): `snappy` and `sheet` get `$value.duration` 367 ms and `spring` `{ "duration": 0.25, "bounce": 0.0, "settle": 0.367 }`; `bouncy` 440 ms and `{ "duration": 0.3, "bounce": 0.0, "settle": 0.44 }`; new `spring.smooth` (`$value` 440 ms, delay 0 ms, `timingFunction` `{ref.motion.easing.in-out}`; `spring` `{ "duration": 0.3, "bounce": 0.0, "settle": 0.44 }`; "Reduce Motion: layout and morph without overshoot, shortened (ADR-0023)"); each reduced spring keeps delay 0 ms and gets a `$description`; `presentation.crossfade` = `{ "$value": 1, "$extensions": { "app.prism": { "flag": true } } }`. Keep fast 100 ms and base/slow/slower 150 ms; add nothing else (instant, quick, interactive and the easings come from `default`).
  - `tokens/sys/modality/{pointer,touch}.tokens.json`: `flag: true` on `sys.interaction.hover` and `sys.interaction.tooltip` (S10).
  - `tokens/comp/card.tokens.json`: `solid.bg` → `{sys.color.bg.surface.$root}` (S2); `shadow.solid` → `{sys.elevation.0}`; `shadow.floating` → `{sys.elevation.3}`; `glass.fill` → `{sys.material.glass.dark.fill.$root}`; delete `gap` and `glass.edge` (S21). `tokens/comp/button.tokens.json`: delete `primary.bg.disabled` (S21); `comp.button.motion.press` stays `{sys.motion.spring.snappy}`. Delete `tokens/comp/text.tokens.json`, `surface.tokens.json` and `chart.tokens.json` (S21).
  - After the migration `tokens/sys/**` holds no hued or ink color literal, only pure white or black; no brand file writes `ref.motion.*`; no `comp` token declares `app.prism.spring`. Once P1-4 exists, `pnpm tokens:normalize --check` reports nothing for the motion files; once P1-6 exists, `contrast:check` reviews the ink overlays (ΔE2000 0.22) and `series.light.1` (0.23).
- **Files** (tools):
  - `tools/tokens/terrazzo.config.ts` with `lint: { rules: { 'core/consistent-naming': ['error', { format: 'kebab-case' }] } }` (opens the `tokens:lint` gate; land it together with S1 and S7, or `tz lint` fails CI);
  - `tools/tokens/lint-orthogonality.ts` (with `permutationLimit` and id reporting, ADR-0024 §9.2), `lint-orthogonality.test.ts`, `tools/tokens/fixtures/non-orthogonal/` (the repository resolver copied with `density/compact` also writing `sys.interaction.hover`: `tokens/prism.resolver.json` points its sources at the repository files, and `compact` gains `tokens/sys/density/compact-hover.tokens.json`; the test fails when the copy drifts from the repository resolver). `node tokens/lint-orthogonality.ts --root <dir>` checks `<dir>/tokens/prism.resolver.json`, so `pnpm tokens:lint --root tokens/fixtures/non-orthogonal` runs the acceptance's failing case;
  - `tools/package.json`: `"tokens:lint": "tz lint --config tokens/terrazzo.config.ts && node tokens/lint-orthogonality.ts"`, devDependency `@terrazzo/parser`; root pass-through `tokens:lint`;
  - `pnpm-workspace.yaml` catalog: `"@terrazzo/parser": ^2.7.1` (pnpm's strict layout requires the direct dependency);
  - `.github/workflows/ci.yml`: the step becomes "Lint tokens (Terrazzo, naming, orthogonality)".
- **Tests**: the non-orthogonal fixture exits 1 naming the overlapping id; the repository exits 0; the permutation count equals 432.
- **Acceptance** (ADR-0024 §9.4): `pnpm tokens:lint` exits 0 on the repository with 432 permutations, and exits 1 on `tools/tokens/fixtures/non-orthogonal/`, naming that id; no color literal in `sys/**` except pure white or black (checked by `sys/literal` from P1-3). `tz lint` alone proves nothing about orthogonality (it exits 0 on the tampered copy) *(verified)*; from P1-3 on, `tokens:build` is authoritative.

### P1-3 — resolver driver

- **Files**: `config.ts` (P1-3 subset: paths, `OWNERSHIP` with `BRAND_OVERRIDABLE`, the slot table, `WEB_RUNTIME` defaults for `resolver/web-default-mismatch`, the ADR-0021 constants), `source/{reader,types,model,brands,analyze}.ts`, `resolver.ts`, `engine/{sd,hooks,to-ir}.ts`, `ir/{types,normalize,color,color-math,order,bundle,analyze,typography,naming,diagnostics}.ts` (`naming.ts`: public path only), `api.ts` (`buildBundle`, `lookup`, `publicPath`, `contrastContexts`, color math), `schema/app-prism.schema.json`, `schema/brand.schema.json`, `docs.test.ts` (token paths, the `sys.color` vocabulary and the ownership table of the living documents, ADR-0024 §13). Do **not** add `build.ts`.
- **Dependencies**: `jsonc-parser` (catalog `^3.3.1`, MIT) for `source/model.ts`.
- **Fixtures**:
  - `fixtures/mini/`: two sets, three modifiers with 2 / 3 / 2 contexts, one inline source, one set referencing a set, `$root`, alias chains, a composite with an aliased sub-value, a spring on a literal `ref` transition reached through `sys` and `comp` aliases, a `sys` color alias with `alpha`, a typography role with `darkWeight`, an out-of-sRGB color, a typography alias under a group typed differently in another document (with its own `$type`);
  - `fixtures/merge-semantics/`: a later token without `$description`, `hex` or `$extensions` must not inherit them;
  - `fixtures/broken/<code>/`: one tree per diagnostic: `ref/group-reference`, `ref/json-pointer`, `type/untyped`, `type/group-type-mismatch`, `source/group-type-conflict`, `source/name-case`, `source/export-path`, write overlap, ownership violation, incomplete context, dead write, duplicate key, cycle, `$extends`, modifier referencing a modifier, missing default, URL source, `resolver/web-default-mismatch` (ADR-0019); `brand/not-overridable`, `brand/unknown-path`, `brand/registration`, `brand/value`, `brand/radius-order`, `slot/target`, `slot/mapping`, `sys/literal`, `color/alpha-target`, `font/web-stack`, `font/apple-face`, `font/preset` (ADR-0020); `type/weight-ladder`, `type/role-metadata`, `type/weight-outside-role`, `type/scale-range`, `type/thin-weight`, `type/light-weight`, `type/weight-instance`, an Increase Contrast weight below 400 (ADR-0021); `material/variant-write`, `material/recipe-shape` (ADR-0022); `spring/fallback` (a spring on a non-transition token, or with a fallback easing that is not a `ref.motion.easing.*` alias), `motion/reduced-policy`, `type/flag-mismatch` (ADR-0023); `type/flag-value`, `extension/alias-override` (including a spring on an alias), `tier/alias-direction`, `tier/sys-literal`, `naming/root-default-collision`, `gradient/scheme-mismatch` (ADR-0024). Added by the P1-3 review: a `$ref` with sibling keys (`resolver-ref-overrides`), a `sys` literal in a `comp` file and `sys` color aliases outside `ref.color.*`/`sys.color.*` (`sys-literal-comp-file`, `sys-literal-alias-target`), `alpha` on a `comp` token in `tokens/sys/` (`color-alpha-target-tier`), `source/group-deprecated-mismatch`, `naming/reserved-category` with `naming/path-collision` (IR invariant 3), `analysis/platform-color` (a `watch` context over `apple`; the platform modifier owns no color, so the fixture also breaks ownership), `type/alias-mismatch`, `ref/syntax` and the reserved name `constructor` (`source-name-reserved`). `ir/token-set` and `ir/type-mismatch` (IR invariant 1) are unit-tested in `ir/bundle.test.ts`, and the `engine/to-ir.ts` backstops `ir/provenance` and `ir/not-normalized` in `engine/sd.test.ts`, because the source checks and the normalizer catch every source that would reach them; `engine/style-dictionary` is SD's own backstop behind Prism's checks and no known input reaches it.
- **Tests**:
  - `resolver.test.ts`: mini fixture has 12 permutations in canonical key order; merge replaces tokens wholesale (merge-semantics); group properties are last-wins; token/group shape conflict is an error.
  - `source/model.test.ts`: every structural diagnostic with file and line; per-document `groupType`; duplicate keys.
  - `source/analyze.test.ts`: each `fixtures/broken/*` case yields exactly its code and ids; a snapshot of `BRAND_OVERRIDABLE` and the slot table makes any change visible in review (ADR-0020 rule 15).
  - `engine/sd.test.ts`: IR snapshot of one mini permutation; a broken reference fails with both ids; a group reference fails with the `.$root` hint; an untyped literal fails; an alias gets its target's type; a normalizer diagnostic fails the run (not a warning); a spring on `ref` flows through `sys` and `comp` aliases with the default and reduced values; an alias that declares its own `spring` fails with `extension/alias-override` (ADR-0024 §4.1); a `sys` alias with `alpha` resolves to its target's components with that alpha; typography `slot`, `numeric`, `textStyle`, `darkWeight` and font `opsz` survive two alias hops; the gradient keys `angle`, `grain`, `scheme` and `bloom` and `app.prism.flag` reach aliases; no state survives a run (the same permutations before and after failing trees give identical IR); class instances are never used (every value has `kind`).
  - `ir/normalize.test.ts`: idempotency, `normalize(normalize(x)) ≡ normalize(x)`, for every `TokenType`.
  - `ir/typography.test.ts`: the full ADR-0021 §3 table (standard, dark, Increase Contrast, Bold Text) and the thresholds.
  - `ir/analyze.test.ts`: a crafted two-axis token fails; a masked interaction (alias re-pointed by one modifier to a token another modifier changes) fails only in the composition proof; overlapping contrast and transparency deltas fail; the motion policy and the gradient scheme invariant fail on crafted cases.
  - `oracle.test.ts`: for the default permutation and every single-axis variation (13 inputs) the IR's semantic projection equals `@terrazzo/parser`'s `resolver.apply(input)` after two normalizations (Terrazzo names `$root` tokens by their group path and fills DTCG defaults such as shadow `inset: false`). On today's data 5,160 values agree *(verified)*; `fixtures/merge-semantics` documents the one known divergence, and a test asserts it: Terrazzo deep-merges object values, so its redeclared `ref.color.brand` keeps `hex`, `$description` and `$extensions`, while arrays (the shadow layers) are replaced by both engines. The typography weight rule and `alpha` are Prism's own and are excluded from the projection.
  - `ir/bundle.test.ts`: the determinism proof of §12 rule 10 on `fixtures/valid`; IR invariant 1 (`ir/token-set`, `ir/type-mismatch`) on crafted permutations; IR invariant 3 on its broken fixture.
  - `api.test.ts`: `lookup` for every name in `tokens/contrast-pairs.json`, globs (`*` and `**`), the `$root` fallback, suggestions for a typo.
  - `docs.test.ts`: every plain token path and glob in the living documents resolves; the README's `sys.color` segment list and ownership table equal the source (ADR-0024 §13.2, §13.4).
  - `repo.test.ts`: 432 permutations, equal to Terrazzo's `listPermutations().length`; the `motion` modifier's contexts are exactly `default: [sys/motion/default]` and `reduced: [sys/motion/default, sys/motion/reduced]` (ADR-0023 rule 7); every IR invariant; zero diagnostics (todo until P1-1 and P1-2 land; before that the expected diagnostics are exactly those of the open §1 rows).
- **Acceptance** ("unit tests over a fixture resolver; permutation count matches the matrix"): `pnpm --filter @iiiivaska/prism-tools test` in the `web` job runs the suite; the mini fixture proves 12 and the repository test proves 432 against Terrazzo.

### P1-4 — transforms and `normalize`

- **Files**: `transforms/{format-number,color,dimension,duration,cubic-bezier,spring,typography,shadow,gradient,stroke,font,number}.ts`, `normalize.ts`, `fixtures/tampered-hex/`, `fixtures/tampered-spring/`; `tools/package.json` scripts `"tokens:normalize": "node tokens/normalize.ts --write"` and `"tokens:normalize:check": "node tokens/normalize.ts --check"`; root `package.json` pass-through `tokens:normalize`; `tools/lint/literals.ts` kinds `motion` (ADR-0023 §12) and `typography` (ADR-0021 §12) with fixtures, one hit and one miss per pattern. The lint kinds `runtime` (ADR-0019, P1-5), `motion`, `typography`, `material` (ADR-0022, P3-1/P3-4) and `brand` (ADR-0020, P3-1/P3-2) share one pattern table so that no name is reported twice: the `runtime` kind owns the attribute names, the preference and pointer media features, and Tailwind's media-only variants `dark:`, `contrast-more:`, `contrast-less:`, `motion-safe:`, `motion-reduce:`, `pointer-*:` and `any-pointer-*:` in TS/TSX class strings and in `@variant` rules (ADR-0023 §12, rule 8). Then run `pnpm tokens:normalize --check`: it must report nothing, because P1-1 authored the retuned gradient hex and P1-2 ADR-0023's reduced values (S5).
- **Tests**:
  - `transforms/color.test.ts`: all real color objects reproduce their authored `hex`; table snapshots for an in-gamut OKLCH color (base only), `accent.50` and `accent.300` (base + P3 twin), a synthetic out-of-P3 color, a pure white overlay (`rgb(255 255 255 / 0.64)`), an alpha alias rendered as a literal of its target, `none` components, an achromatic hue, colorset components and Swift literals of `neutral.600` / `neutral.700`; Tokens Studio `#rrggbb` and `rgba()` (never 8-digit hex) and Figma `alpha` plus 6-digit `hex`.
  - `transforms/dimension.test.ts`, `typography.test.ts`, `duration.test.ts`: px, rem = px / 16, em tracking, Swift `trackingEm`, unitless line height, negative values, decimals (ADR-0021 rule 6).
  - `transforms/spring.test.ts` (ADR-0023 §11 P5–P7): Apple's documented (0.5, 0.3) → 157.9137 / 17.5929; settle 220 / 487 / 587 / 404 / 818 ms and reduced 367 / 367 / 440 / 440 ms (snappy, sheet, bouncy, smooth); generator versus closed form ≤ 1e-9 at every millisecond; every emitted `linear()`, parsed back, stays within 0.0025 of the closed form at 0.1 ms steps, starts at 0, ends at 1 and has at most 40 stops; the bouncy regression (no `1, 1, 1` plateau); exact `linear()` string snapshots; the schema rejects `duration` outside [0.1, 1] s, `bounce` outside [0, 0.4] and `blendDuration` outside [0, 1] s.
  - Composite renderers: typography sub-declarations (no `font-style`), multi-layer shadows, gradients with P3 twins and the `-grain`, `-bloom-alpha`, `-bloom-blur` declarations, stroke styles, font quoting, flags (CSS 0/1, Swift `Bool`, TS `boolean`, Figma `com.figma.type: "boolean"`, Tokens Studio `boolean`).
  - `normalize.test.ts`: `--check` on `fixtures/tampered-hex` exits 1 and prints file, line, pointer, expected and actual; `--write` fixes it and leaves every other byte unchanged; a second run is a no-op; the same for `fixtures/tampered-spring`.
  - `tools/lint/literals.test.ts`: every `motion` and `typography` pattern hits its fixture and misses its counter-fixture.
- **Acceptance** ("snapshot tests; `hex` stale check fails on a tampered fixture"): the snapshot tables above and `normalize.test.ts`; the spring tests reproduce the settles and keep every `linear()` within 0.0025; `lint:literals` fails on a motion-literal and a typography-literal fixture.

### P1-5 — formats and the build

- **Files**: `formats/**` (including `formats/runtime-ts.ts`), `verify/**`, `output/write.ts`, `output/roots.test.ts`, `ir/naming.ts` (all targets), `config.ts` (`WEB_RUNTIME`, `PLATFORM_DEFAULTS`, `OWNED_ROOTS`, Tailwind and Swift tables), `build.ts` (opens the `tokens:build` gate), `README.md` update, `scripts/verify-xcassets.sh`; the emitted-name part of `docs.test.ts` (ADR-0024 §13.3); `tools/lint/literals.ts` kind `runtime` (ADR-0019 rule 1) over `web/packages/*/src`, generated output and `*.test.*` excluded, one hit and one miss fixture per pattern, extended with Tailwind's media-only variants `dark:`, `contrast-more:`, `contrast-less:`, `motion-safe:`, `motion-reduce:`, `pointer-*:` and `any-pointer-*:` in TS/TSX class strings and in `@variant` rules (ADR-0023 §12, rule 8), one hit and one miss fixture each; hand-written `swift/Tests/DSTokensTests/SpringParityTests.swift` and `ColorCatalogTests.swift` (remove `PlaceholderTests.swift`); delete `swift/Sources/DSTokens/Generated/.gitkeep` and `swift/Sources/DSTokens/Resources/.gitkeep`; `tools/package.json` script `"tokens:check": "node tokens/build.ts --check"` and devDependencies `tailwindcss`, `@tailwindcss/node` (catalog `^4.3.3`, test only); root `package.json` pass-through `tokens:check`; the first generated output, committed.
- **CI** (`.github/workflows/ci.yml`):
  - stale-output step: `generated="swift/Sources/DSTokens/Generated swift/Sources/DSTokens/Resources/Colors.xcassets swift/Tests/DSTokensTests/Generated web/packages/tokens/src/generated tokens/export"`, equal to `OWNED_ROOTS` (P1-8 appends `swift/Sources/DSTokens/Resources/Fonts`);
  - `apple` job, gated on `tokens_build`: `bash tools/tokens/scripts/verify-xcassets.sh`, then `xcodebuild test -scheme Prism-Package -only-testing:DSTokensTests -destination 'platform=iOS Simulator,name=iPhone 17,OS=latest'` and the same with `'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm),OS=latest'` (V1).
- **Tests**:
  - Format snapshots on the mini fixture (`toMatchFileSnapshot`), plus targeted assertions on the real bundle: block list and selectors, twin count, colorset count and entries, Swift member count, collision-free names.
  - CSS: `verify/css-cascade.ts` over every scenario of §9.12, including ADR-0019's invalid values, density fallback and pointer features; render-form tests for every selector form and media combination; no `:not([data-ds-…])` without a value (ADR-0019 rule 2); only `colorScheme` and `density` in descendant or non-root selectors (rule 4); `@layer` wrapping; alpha tokens render as literals; no `ref.font.apple.*` in `tokens.css` or `tokens.ts`; no generated web file contains `SF Pro`, `SF Mono`, `SF Compact`, `New York`, `Menlo`, `-apple-system`, `BlinkMacSystemFont`, `data-ds-brand`, `fonts.googleapis.com` or `fonts.gstatic.com` (ADR-0020 rule 7).
  - Tailwind: compile `tailwind.css` with a fixture `tokens.css` through `@tailwindcss/node` and assert the utilities of §9.4, including `bg-ds-page`, `text-ds-primary`, `border-ds-hairline`, `text-ds-body-md`, `h-ds-control-md`, `shadow-ds-elevation-2`, `type-ds-body-md` and `type-ds-metric-xl` (figures from its own token), a `ds-touch:` variant, and a plain rule nesting `@variant ds-contrast-more` that expands into both forms; a crafted clash (`--text-ds-x` and `--text-color-ds-x`) fails the collision check.
  - Naming: every generated custom property, Tailwind theme variable, utility and variant carries `ds` (ADR-0019 rule 10).
  - TS: `runtime.ts` snapshot; `tsc --noEmit -p web/packages/tokens/tsconfig.json` after the build (the `web` job's `pnpm typecheck` repeats it); `resolveTokens` equals the IR for all 96 contexts per brand; both brands' `tokens.ts` declare identical types (union shapes, ADR-0020 rule 9).
  - Swift (Node side): table evaluator against the IR for 96 contexts × {apple, watch} × brands; identifiers are valid and escaped; `DSColor` is a brand-scoped struct and no brand-dependent accessor takes neither a brand nor a context (ADR-0020 rule 11); the IC and dark typography variants.
  - xcassets: JSON snapshot; namespace folders with `provides-namespace`; entry rules (four universal entries plus `watch` for scheme-dependent colors, one entry otherwise); reduced-transparency colorsets exactly for `ΔRT`, which is empty today.
  - Tokens Studio: every set named in `$themes.json` exists; every alias resolves under every combination of one theme per group; `$root` rename collision test; theme objects satisfy `ThemeObject`; alpha aliases carry the `studio.tokens` modifier; no 8-digit hex.
  - Figma: every file validates against the DTCG format schema (ajv); only sRGB colors, px dimensions, second durations and single font names; every translucent source color keeps its alpha; every file of a brand has identical names and types.
  - Writer: stale-file deletion, `--check` report, unchanged files keep their mtime; `output/roots.test.ts` (CI list = `OWNED_ROOTS`, no root git-ignored).
  - Determinism (§12 rule 10).
- **Acceptance** ("`pnpm tokens:build` leaves `git status --porcelain` empty over the owned roots in CI; `swift build` passes with generated code"): the gated stale-output step and the `apple` job's `swift build && swift test`, iOS/watchOS simulator builds, catalog compile and `DSTokensTests` under `xcodebuild`; `verify-xcassets.sh` finds `prism/color-text-secondary` on all three platforms; `ColorCatalogTests` pass per brand namespace on the iOS and watchOS simulators; the cascade simulator passes the ADR-0019 scenarios.

### P1-6 — contrast

- **Files**: `tools/contrast/{check,pairs,thresholds,report}.ts`, tests, `tools/contrast/fixtures/broken-pair/`, a fixture gradient that breaks V1 and one that breaks V2; `api.ts` additions if needed; `tokens/contrast-pairs.json` per ADR-0022 §3–§4: replace the glass pair and the `text-zone` pair and mention ADR-0022 in `$comment`; add `text.tertiary`, `text.accent`, `text.success`, `text.warning`, `text.critical` and `text.info` on `color.bg.surface.raised`; `text.on-glass`, `-secondary`, `-tertiary` on `material.glass.dark.fill`, and `text.on-glass` on `material.glass.dark.chip` and `material.glass.cell`, over [`#283126`, `#5B6366`, `#959595`, `gradient.vivid.*`]; `text.on-glass-light` on `material.glass.light.fill` and `.chip` with `schemes: ["dark"]` over [`#283126`, `#3A3A3A`] and with `schemes: ["light"]` over [`#555555`, `gradient.vivid.*`]; `text.on-vivid` on `gradient.vivid.*` with `minSizePx: 24`, `stops: "all"` (V1) and with `region: "card-header"` (V2); the on-accent-strong pair (critic G-13) and the chart pairs against `chart.plot` (critic G-14). `check.ts` opens the gate, so it lands when the repository passes (after P1-1 retunes the gradients and P1-2 the dark chips and cells).
- **Tests**: `ir/color-math.test.ts` (white on black 21:1; dark `color.text.tertiary` white 55 % over `bg.surface` white 6 % over `bg.page` `neutral.950` composites as specified); `pairs.test.ts` (every tier and size rule, backdrops including gradient globs expanded by scheme, the `schemes` filter, `stops: "all"` in both interpolation spaces, `region: "card-header"` over the twelve geometries, unknown names); `check.test.ts` (the broken fixture and the V1/V2 fixture gradients exit 1 and name the pair and context; the repository exits 0); `contrastContexts` returns 12 and throws on a fixture with an apple-only color; every brand in all six colorScheme contexts.
- **Acceptance** ("fails on a deliberately broken pair; passes on the reference brand"): `check.test.ts` plus the gated CI step, including the fixture gradients that break ADR-0022 V1 or V2.

### P1-7 — diff

- **Files**: `tools/tokens/diff.ts` (opens the gate), `diff/{git,classify,changesets}.ts`, tests, `fixtures/diff/{before,after-*}/`, `fixtures/changesets/`.
- **Tests**: `classify.test.ts` builds two in-memory bundles (a `SourceReader` over fixture trees) and covers every `TokenChange` kind, including `axes-changed`; `changesets.test.ts` covers front matter, ignored packages, the fixed group and no changesets; `diff.test.ts`: removal + patch changeset → exit 1; value change + minor → 0; value change + patch → 1; type change needs major; base tag v0.3.0: removal + minor changeset exits 0; base tag v1.2.0: removal + minor exits 1; `--base` on a non-tag ref uses the newest tag merged into it (ADR-0024 §14); no tag → 0 with notice; invalid baseline → 1 unless `--allow-invalid-baseline`. A `gitReader` smoke test reads `HEAD:tokens/prism.resolver.json`.
- **Acceptance** ("fails a PR that removes a token with a patch changeset, and passes it with a minor changeset while the last tag is 0.x"): `diff.test.ts` plus the gated pull-request step.

### P1-8 — reference brand and font check

- **Files**:
  - `brands/prism/brand.tokens.json`: remove `ref.brand.type-scale` (and the `ref.brand` group); the file keeps only `$schema` and declares no tokens, because `prism-native` layers it first and any write would be a dead write (ADR-0020 §1).
  - `brands/prism/brand.json` (ADR-0020 §8, ADR-0021 §11): per slot, `family`, `file` (`fonts/onest/Onest[wght].ttf`, `fonts/jetbrains-mono/JetBrainsMono[wght].ttf`), `version` (Onest `2.001`, JetBrains Mono `2.211`), `sha256` (`966c5c29b4755da84b6854d5c21dd4eaa2420225d0e9874de602de176d4a9f31`, `48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda`), `platforms` `["apple", "web"]` and `postscript` (Onest 100–900: `Onest-Thin` … `Onest-Black`; JetBrains Mono 100 `JetBrainsMonoRoman-Thin`, 200 `-ExtraLight`, 300 `-Light`, 400 `JetBrainsMono-Regular`, 500 `JetBrainsMonoRoman-Medium`, 700 `-Bold`, 800 `-ExtraBold`; no 600); `notes` replaced with the ADR-0020 mechanism, without the "not committed" sentence.
  - `brands/prism-native/brand.tokens.json`: `ref.font.ui` and `ref.font.display` = `["Inter", "system-ui", "sans-serif"]` (display keeps `app.prism.opsz` 32), `ref.font.mono` = `["ui-monospace", "monospace"]`, `ref.font.apple.ui` and `.display` = `["system-ui"]`, `ref.font.apple.mono` = `["ui-monospace"]`; no `$description` names an Apple family.
  - `brands/prism-native/brand.json`: `fonts.ui` and `fonts.display` = `{ family: "Inter", file: "fonts/inter/InterVariable.ttf", version: "4.001;git-9221beed3", sha256, platforms: ["web"] }`, no mono entry and no `postscript` (fonts are not inherited through `extends`). `version` is name ID 5 without "Version " (ADR-0021 §11 check 3), and the v4.1 release file reports "Version 4.001;git-9221beed3"; the release tag 4.1 stays the label in `notes`, the license inventory and the notices; `notes` "Native: system fonts on Apple, self-hosted Inter 4.1 on web (ADR-0020)"; `brands/prism-native/fonts/inter/InterVariable.ttf` and `OFL.txt` from rsms/inter release v4.1 (re-check the upstream file name when downloading).
  - `tools/fonts/{check,font-file}.ts` (§3.3), tests; `formats/fonts.ts` (Swift `Resources/Fonts/<family-dir>/` and web `<brand>/fonts/` with `<family-dir>/<family-kebab>-wght.woff2`, `<family-dir>/OFL.txt` and `fonts.css`, §9.0: one `@font-face` per file, `font-family` from the entry's `family`, `font-weight: <min> <max>` from `fvar`, `font-style: normal`, `font-display: swap`, a header comment with the source version and SHA-256); `OWNED_ROOTS` and the CI stale list gain `swift/Sources/DSTokens/Resources/Fonts`; `Package.swift`: DSTokens `resources: [.process("Resources/Colors.xcassets"), .copy("Resources/Fonts")]`.
  - `tools/package.json` script `"fonts:check": "node fonts/check.ts"`, the font parser (V6) and the woff2 encoder (V12); CI gains a gated `fonts:check` step (gate file `tools/fonts/check.ts`) in `contracts`.
  - `licenses/inventory.json` and `THIRD_PARTY_NOTICES.md`: the Inter item becomes version 4.1, source `https://github.com/rsms/inter/releases/tag/v4.1`, `packaged: true`, notes "Native preset, web only: self-hosted woff2 built from upstream InterVariable.ttf in brands/prism-native/fonts/inter/; never loaded from Google Fonts (ADR-0020)"; in the same change as the font file.
- **Tests**: the bundled Onest, JetBrains Mono and Inter pass all six checks; a synthesized Latin-only font and a synthesized proportional-digit font without `tnum` fail; the 2 MiB `DSTokens` budget; `brand.json` schema errors are reported; the woff2 output is byte-identical across two builds.
- **Acceptance** ("brand builds; font check passes; a Latin-only test font fails"): `tokens:build` passes with both brands (brand-path, dead-write, registration and font-stack checks); `fonts:check` passes on the three families and fails on the synthesized fonts; no generated file references a remote font; the stale check covers the new Swift font root and the web font files.

### P1-9 — the direction-board sign-off (ADR-0029, ADR-0030; done 2026-09-16, token part)

- **Tools**:
  - `config.ts`: `BRAND_OVERRIDABLE` gains `ref.gradient.vivid.night-lagoon`; `OWNERSHIP.platform` = `sys.font.**` and `sys.type.metric.xl`; `WEB_RUNTIME.density` gains `watch` (value, context, Swift case) and `PLATFORM_DEFAULTS.watchos.density` becomes `watch`; `FOLDED_KEYS` and `EXTENSION_KEY_TYPES` gain `temperature`; `SYS_COLOR_ALIAS_TARGETS` gains `sys.material.glass.**`; new `GLASS_ROLE_RECIPES`, `SMOKE_PREFIX`/`SMOKE_MAX_CHROMA`, `EDGE_PREFIX`/`EDGE_TARGET` and `GRADIENT_SLOT_PAIRS`.
  - `schema/app-prism.schema.json`: `temperature` ∈ {`warm`, `cool`}, required whenever `scheme` is declared (`dependencies`).
  - `IRGradient.temperature` (folded, §5.4); source checks `material/role-recipe`, `color/smoke-chroma`, `color/edge-neutral` (§5.6) and the IR invariant `gradient/slot-temperature` (§5.7 item 11), each with a `fixtures/broken/<code>/` case; `sys-literal-alias-target` now aliases a color outside the three alias-target globs.
  - Gradient renderers: the derived bloom color (§7.9): CSS `-bloom-color`, TS `bloom.color`, Swift `DSGradientToken.bloomColor`.
  - Swift tests: the generated file splits every test above `CHECKS_PER_PART` (48) checks into part functions (§9.7.6).
  - `tools/contrast`: token backdrops and `ContrastContext.colors` (§10), `map.ts` (`map/backdrop-limit` and the report's map table), the fixture `broken-tint-on-map` (text.critical on the critical tint over the map road without the page underlay: 4.04:1 fails; with it 5.76:1 passes), the light-tint composite test in `pairs.test.ts`.
- **Tokens** (every value in ADR-0029 §1–§3 and ADR-0030 §1–§7): neutral smoke; sky, rose and olive chroma, navy-cyan positions 0.30 / 0.85, `night-lagoon`, `temperature` on the nine gradients, bloom blur 75 and dark bloom alpha 0.45; `ref.color.map.light|dark.water|park`, `ref.type.axis`, `ref.type.metric.xl-watch`, `metric.md` proportional; `ref.blur.bloom` and `ref.color.status.*.tint-light` deleted; the role recipes, the six `text.on-glass-fill*` tones, the scrim at 0.45, the slots (light sky, orchid, rose, olive; dark plum-dusk, navy-cyan, night-lagoon, forest-moss), `color.map.*`, `chart.on-media.*`, `chart.on-glass-fill.*`, light `chart.target` 0.60 (0.75 under Increase Contrast), `bg.fill.inverse-media`, `text.on-inverse-media`, `border.on-media`, `border.on-glass-fill`, `text.on-accent-secondary`, `color.edge.*`, `material.vivid.edge.*`, light `raised` = `neutral.50`, light tints = dot step at 0.12, gauge ratio 0.05, `sys.type.axis`, `sys.type.metric.xl` in the platform files with a new `sys/platform/watch.tokens.json`, compact page margin 24, the `watch` density file, Card glass on the role recipe, the ghost button's `bg.pressed` instead of `bg.rest`, the resolver's `watch` contexts and the pairs of ADR-0029 §1.6–§1.7 and ADR-0030 §1.6, §2.7 and §3.
- **Tests**: 576 permutations (`repo.test.ts`, `lint-orthogonality.test.ts`, the non-orthogonal fixture resolver), 14 oracle inputs, 96 permutations per scope, 128 web and Swift contexts per brand, sixteen V2 geometries and nine reached gradients (`check.test.ts`), the four-value density fallback selector, the watch card padding in `ts-tokens.test.ts`, the watchOS `platformDefault` of `.watch` and the 40 px watch hero in `swift.test.ts`, 22 `type-ds-*` utilities, 12 Tokens Studio themes.
- **Acceptance**: `tokens:validate`, `tokens:lint` (576), `tokens:normalize:check`, `tokens:build` and `tokens:check`, `contrast:check` (99 pairs, 1,038 evaluations in 12 contexts, every map ground inside its limit), `fonts:check`, every tools test, `swift build` and `swift test`, the generic iOS and watchOS builds, `verify-xcassets.sh` and the DSTokens tests on the iPhone 17 and Apple Watch Series 11 simulators. The board recopy and re-render, the ride report and the changeset are P1-9's other part (roadmap).

---

## 15. Verified library facts

Re-checked on 2026-09-15 (Node 24.21.0, Xcode 26.6). "Repo" means the versions `tools/node_modules` resolves from the committed lockfile.

| # | Fact | Evidence |
|---|------|----------|
| F1 | Style Dictionary 5.5.3 is `latest` (published 2026-09-06) and has no resolver support in `lib/`. | `npm view style-dictionary dist-tags`, `time`; grep of `lib/` for `resolutionOrder`, `modifiers`, `resolver`: none. |
| F2 | SD accepts an in-memory `tokens` tree; `getPlatformTokens()` returns `{ tokens, allTokens, tokenMap }` and prints nothing on success, even with `verbosity: 'verbose'`; `formatPlatform()` returns `[{ output, destination: '' }]`, allows a non-string output (a `Map`), writes no files, and under `verbose` prints the platform name. | Repo SD probe; directory listing before and after. |
| F3 | Broken-reference errors name the tokens only with `verbosity: 'verbose'`: `{comp.card.bg} tries to reference {sys.bg.surface}, which is not defined.`; `silent` and `default` print a count. A platform-level `log.verbosity: 'silent'` does not hide the instance-level details. | Repo SD probe with three verbosity levels. |
| F4 | A reference to a group that holds `$root` is a broken reference; `{x.$root}` resolves; `name/kebab` produces `sys-bg-surface-root`. | Repo SD probe. |
| F5 | With `warnings: 'warn'` a throwing transform is logged and the untransformed value is emitted; with `warnings: 'error'` SD throws. | Repo SD probe. |
| F6 | `transformToken` starts with `structuredClone(token)`; a class instance returned by a transform reaches alias tokens as a plain `Object` (prototype lost, `instanceof` false), so instance-based idempotency re-wraps values. | `lib/transform/token.js` line 83; repo SD probe (`{ v: { v: … } }`). |
| F7 | Non-transitive value transforms skip tokens whose original value contains references, including composites with an aliased sub-value; transitive transforms run after resolution and receive already-transformed sub-values; each token is transformed once per permutation (170,856 calls for 432 permutations). | `lib/transform/token.js` lines 100–106; repo SD probes. |
| F8 | `typeDtcgDelegate` copies the nearest group `$type` onto tokens without one and never uses reference targets: an alias of a typography token inside a `$type: number` group became `number`; an alias in an untyped group stayed untyped. SD does not copy `$extensions` to alias tokens. | `lib/utils/typeDtcgDelegate.js`; repo SD probe. |
| F9 | Hook preprocessors run only when listed in `preprocessors`, on the merged tree, before `typeDtcgDelegate`. | `StyleDictionary.js` `init()`; repo SD probe. |
| F10 | `GroupMessages` is a module singleton. | `lib/utils/groupMessages.js`: `export default new GroupMessages()`. |
| F11 | 432 SD runs with a transitive, idempotent, plain-data normalizer: 2.8 s (6.5 ms each), 95 unique colors, 408 MB RSS with all IRs held; the spring folded into the value flows through `comp.button.motion.press → sys → ref` as (0.35, 0.15) by default and (0.25, 0) reduced; 0 alias/group type conflicts on today's data. | Prototype on a copy with S1/S2 fixed, repo SD + Color.js. |
| F12 | Today's data: permutations hold 393, 394, 397 or 398 tokens; the completeness failures are exactly S3 and S4; single-axis effect sets are brand 27, platform 1, colorScheme 105, density 11, modality 3, motion 9, pairwise disjoint; no token depends on two runtime axes; the composition proof makes 170,856 comparisons with 0 failures; increased-contrast / reduced-transparency deltas are light 20 / 7 and dark 18 / 7 with no overlap; apple and watch differ only in `sys.material.blur.enabled`; the brands differ only in font families and typography composites; no group has conflicting `$type`s across documents; no modifier write sets overlap after S1; `ref.brand.type-scale` is the only brand path outside the `ref` set. | Prototype merge and resolution over the full product. |
| F13 | Color.js 0.5.2 (repo): default gamut mapping `css`; all 14 DTCG spaces map to Color.js ids; `none` → NaN is handled; 166 color objects, 0 stale `hex`; out of sRGB only `ref.color.accent.50` and `accent.300`; none out of P3; the sample values of §7.2. The lockfile also holds 0.7.1 (through Terrazzo); earlier probes found identical hex and P3 values in both. | `src/defaults.js`; repo Color.js probe. |
| F14 | Motion 13.2.0 (repo; 13.3.0 leaves spring math unchanged per `docs/research/verification.md`) exports `spring` and `generateLinearEasing`. With default rest thresholds the bouncy generator snaps to 1 near extrema (max error 2.1e-3 at 700 ms); with `restDelta`/`restSpeed` 1e-9 it equals the closed form to 2.2e-16; `toString()` yields `550ms linear(…)` for snappy. | Repo Motion probe. |
| F15 | Settle (floor of the last time `\|1 − x\| ≥ 0.001`): 220 / 487 / 587 / 404 / 818 ms; reduced 367 / 367 / 440 ms; rounding would change four committed values. RDP (0.002) on 1 ms samples: 20–24 stops, max error 0.0020; uniform 60 Hz: up to 50 stops, error up to 0.030. | Closed-form probe; sampling comparison. |
| F16 | SwiftUI `Spring(duration:bounce:)` on the macOS 26 SDK: stiffness/damping 322.2728/30.5183 (snappy), 157.9137/17.5929 (bouncy), 1754.5963/83.7758 (interactive), 631.6547/50.2655 (reduced snappy); `settlingDuration` 0.635 / 1.045 / 0.300 / 0.400 s against the `Spring.value`-sampled settle 0.4876 / 0.8187 / 0.2204 / 0.3673 s. | `swift test` in a scratch package, Xcode 26.6. |
| F17 | `swift test` (SwiftPM, Xcode 26.6) copies `Colors.xcassets` into the resource bundle uncompiled; there is no `Assets.car`. Under `xcodebuild test` the catalog is compiled. | Scratch package `Bundle.module` checks. |
| F18 | Xcode 26.6 ships 459 colorsets; 421 use `{ "appearance" : "contrast", "value" : "high" }`, alone and combined with `luminosity`; none use a `watch` idiom; Xcode writes 2-space indent, `"key" : value`, sorted keys, component strings. | `find`/`grep` under `/Applications/Xcode.app`; `SystemColors-ios.xcassets/labelColor.colorset`. |
| F19 | actool 26.6: iOS compiles universal entries to Any / `UIAppearanceDark` / `UIAppearanceHighContrastAny` / `UIAppearanceHighContrastDark`; macOS to `NSAppearanceNameDarkAqua` / `NSAppearanceNameAccessibilitySystem` / `NSAppearanceNameAccessibilityDarkAqua`; watchOS keeps only the universal Any entry, a `watch` idiom entry replaces it, and appearances on a `watch` entry cause "has an unassigned child" warnings. | `actool` + `assetutil --info` for three platforms. |
| F20 | On the iOS 26.5 simulator, `UIColor(named:in:compatibleWith:)` + `resolvedColor(with:)` returns the Any, Dark, High Contrast and Dark + High Contrast values (without `resolvedColor(with:)`, `getRed` reports Any); on the watchOS 26.5 simulator a universal-only colorset resolves to its Any (light) value and a `watch` entry wins. | `xcodebuild test` of a scratch package on iPhone 17 and Apple Watch Series 11 (46 mm). |
| F21 | `tz lint` is an alias of `tz check`; on the repository it exits 1 with the untyped-material error; on a copy with S1/S2 fixed it passes with two `consistent-naming` warnings; on a deliberately non-orthogonal copy it exits 0. | Repo `tz` binary with three configs. |
| F22 | `@terrazzo/parser` 2.7.1 `parse()` exposes `resolver.orthogonal` (true for the fixed copy, false for the tampered one) and `listPermutations().length === 432`. | Parser API probe. |
| F23 | Terrazzo's `destructiveMerge` deep-merges objects and overwrites arrays. `resolver.apply()` names `$root` tokens by their group path and fills defaults (shadow `inset: false`); after normalizing both, it agrees with Prism's token-level merge on all 5,160 values of 13 sparse inputs. | `dist/lib/resolver-utils.js`; oracle probe. |
| F24 | Tailwind 4.3.3 through `@tailwindcss/node`: per-utility namespaces produce `bg-ds-page`, `text-ds-primary`, `border-ds-hairline`, `outline-ds-focus`, `fill-ds-*`, `stroke-ds-*`, spacing (`p-`, `h-`, `size-`), `rounded-`, `shadow-`, `font-`, `ease-`, `duration-`, `z-`, `opacity-`; `bg-ds-primary` does not leak; `text-*` looks up `--text-color`, `--color`, then `--text`, so `--text-color-ds-x` silently beats `--text-ds-x` and `--color-ds-x`; `--text-*--line-height/--letter-spacing/--font-weight` work; block-form `@custom-variant` with `@slot` compiles. | Compile probes; `dist/lib.js` themeKeys. |
| F25 | Node 24.21 runs `.ts` natively (`process.features.typescript === 'strip'`); `enum` and parameter properties fail with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; a type-only import without `import type` fails with "does not provide an export named". | Node probes. |
| F26 | `jsonc-parser` 3.3.1 works when imported by package name; its `lib/esm` entry fails under Node ESM (extensionless imports). `modify` + `applyEdits` changes only the target lines, keeps `0.0`, and inserts new properties with matching indentation; `findNodeAtLocation` offsets give line numbers. | Probe on `sys/motion/reduced.tokens.json`. |
| F27 | DTCG Format 2025.10: type precedence is own `$type`, then the referenced token's type, then the closest parent group (§5.2.2); `{color.accent}` is invalid when `accent` is a group, root tokens are referenced as `{color.accent.$root}` (§6.2); no propagation of `$extensions` through references is specified. | designtokens.org/tr/2025.10/format. |
| F28 | DTCG Resolver 2025.10: "the last occurrence in the array will be the final value" (§4.1.4); aliases must not be resolved before flattening (§6.3); a modifier must not reference another modifier (§4.1.5.1); `default` is optional (§4.1.5.3); sets accept inline tokens and `$ref` objects (§4.1.4). | designtokens.org/tr/2025.10/resolver. |
| F29 | Figma variable import: sRGB or HSL colors, dimensions in `px` only, durations in `s` only, `fontFamily` as a single name, booleans through `com.figma.type: "boolean"` on numbers, one mode per imported file, `com.figma.aliasData` for cross-collection aliases. | help.figma.com "Modes for variables". |
| F30 | `@tokens-studio/types` 0.5.2: `ThemeObject { id, name, group?, selectedTokenSets: Record<string, 'disabled' \| 'source' \| 'enabled'>, $figma… }`; `TokenTypes` has no duration, cubicBezier, transition or gradient, and has `boolean`, `number`, `dimension`, `spacing`, `sizing`, `borderRadius`, `opacity`, `boxShadow`, `typography`, `fontFamilies`, `fontWeights`, `strokeStyle`. | Package `.d.ts` files. |
| F31 | The repository has no git tags yet; `.changeset/config.json` has a `fixed` group `@iiiivaska/prism-*` and ignores `prism-gallery`, `prism-vrt`, `prism-tools`. | `git tag`; config file. |
| F32 | actool 26.6 compiles namespaced colorsets (`provides-namespace`) for iphoneos, macosx and watchos without warnings; `assetutil --info` names `prism/color-bg-page`. At runtime the namespaced name resolves on macOS 26 (`NSColor` and SwiftUI `Color.resolve(in:)`, light and dark), on the iOS 26.5 simulator (`UIColor` + `resolvedColor(with:)`: light, dark, dark + high contrast) and on the watchOS 26.5 simulator (the `watch` entry); the bare name returns nil. | Scratch probes, 2026-09-15 (ADR-0020 Context). |
| F33 | Style Dictionary 5.5.3 `lib/` has no `$ref` handling (DTCG JSON Pointer references inside values). | Grep of `lib/` (ADR-0020). |
| F34 | `@tokens-studio/types` 0.5.2: `SingleGenericToken.$extensions['studio.tokens'].modify: ColorModifier`, with `AlphaModifier { type: 'alpha', value: string, space: 'lch' \| 'srgb' \| 'p3' \| 'hsl', format: string }`. docs.tokens.studio titles color modifiers "Modified Colors (pro)". | Package `.d.ts` files; Tokens Studio docs (ADR-0020). |
| F35 | `@terrazzo/parser` 2.7.1 `processTokens` inlines `$ref` from `rootSource.document` only. | `dist/parse/process.js:10-66` (ADR-0020). |
| F36 | `tz lint` 2.7.1 accepts a `{group}` reference to a `$root` group and non-orthogonal resolvers. `isResolverOrthogonal` returns only a boolean. `listPermutations` is withheld when the product exceeds the config's `permutationLimit`, 1000 by default; five brands would give 1,080. | `dist/resolver/load.js`, `dist/config.js:278-279` (ADR-0024 T3). |
| F37 | Terrazzo types a token by its merged group before its alias target (`Cannot alias to $type "typography" from $type "number"`); an own `$type` fixes it. `core/consistent-naming` defaults to `warn`; at `error` it fails on `inOut`. | CLI and parser probes; `dist/lint/plugin-core/index.js:103` (ADR-0024 T4, T5). |
| F38 | The DTCG 2025.10 schemas are draft-07 and self-contained; `resolver.json` embeds `format.json` under the same `$id`, so one Ajv instance per schema is needed; they use `uri-reference` and `json-pointer-uri-fragment`, which strict Ajv rejects without `ajv-formats`. Offline, Ajv 8.20.0 accepts every token file, an untyped token, a group reference and a camelCase name, and rejects a two-component color and `$type: "boolean"`. | Ajv probe (ADR-0024 T7). |
| F39 | Tokens Studio reads 8-digit hex as ARGB (`#40000000` is black at 25 %) and accepts `rgba(0,0,0,0.25)`; CSS reads 8-digit hex as RRGGBBAA. Figma's variable import example carries `alpha` and `hex`; whether it imports an alpha below 1 is not documented. | docs.tokens.studio; help.figma.com (ADR-0024 T8, T9). |
| F40 | `semver.inc('0.1.0', 'major')` is `1.0.0`, and Changesets has no 0.x special case; `^0.1.0` excludes 0.2.0; SwiftPM's `from:` goes up to the next major. | semver probe; Changesets source (ADR-0024 T10). |
| F41 | Style Dictionary 5.5.3 silently drops a token or group named `constructor`: `{ ref: { constructor: { x }, ok, g: { constructor } } }` resolves to `ref.ok` only, with no message. | SD probe (P1-3 review). |
| F42 | `@terrazzo/parser` 2.7.1 `resolver.apply()` leaves a whole-value alias of a `number` token whose value is `0` unresolved: its `$value` stays the reference string (`{sys.material.glass.light.fill.bloom}`) while `aliasOf` names the target; an alias of any other number resolves. The oracle (`test-support.ts` `terrazzoValue`) follows `aliasOf` for such a value. `tz lint` reports nothing. | Parser probe on the P1-9 role recipes (2026-09-16). |
| F43 | The DTCG 2025.10 `format.json` curly-brace reference pattern rejects a segment that starts with `$`, so `{sys.material.glass.light.fill.$root}` fails validation on a token with its own `$type: color`; an untyped alias is not checked against the pattern. | `tokens:validate` on the P1-9 role recipes (2026-09-16). |
| F44 | SwiftPM with Xcode 27 builds into `.build/out/` through Swift Build; inside a File Provider-managed folder (`~/Documents`) the resource bundle's files carry `com.apple.provenance` and codesign fails ("resource fork, Finder information, or similar detritus not allowed"); `--scratch-path` outside that folder builds. A debug `DSTokensTests` whose generated test held about 350 checks in one function crashed with SIGBUS on Swift Testing's 512 KiB thread stack. | `swift build` and `swift test` on the P1-9 tree (2026-09-16). |

The facts behind the other decisions of 2026-09-15 live in their ADRs: ADR-0019 facts 1–7 (media-feature support, the Chromium 152 probe of the valid-value selectors and pointer queries, Tailwind 4.3.3 `@variant` and `@utility`), ADR-0021 T1–T12 (the bundled font files, Core Text, Dynamic Type, Bold Text, line height), ADR-0022 F1–F17 (contrast probes of glass and vivid) and ADR-0023 M1–M11 (SwiftUI and Motion spring math; M6 and M8 refine F14 and F15 above). F12's counts describe the source before P1-1 and P1-2; refresh them after.

Not re-verified here, carried from the design probes: Chrome 152 behavior of nested custom-property scopes and the compound selectors (output-first probe; the cascade simulator and P3-4 VRT cover it), SD built-in transforms mangling 2025.10 durations and gradients (SD-maximal probe; Prism does not use them), and the output-first probe's finding that a colorset without high-contrast entries falls back to the same-luminosity entry on macOS (not relied on: Prism writes all four entries).

---

## 16. Risks, verify-before-implementing items, decisions

### 16.1 Verify before implementing

| # | Item | Ticket | What to check | Fallback |
|---|------|--------|---------------|----------|
| V1 | `xcodebuild test -scheme Prism-Package -only-testing:DSTokensTests` on a watchOS simulator | P1-5 | Whether the scheme's other test targets (DSSnapshotTests with SnapshotTesting) block the watchOS build. | Test with a DSTokens-only scheme, or keep the watch check at `verify-xcassets.sh` (actool + assetutil). |
| V2 | `package` access to `DSTokensBundle` from `DSTokensTests` | P1-5 | Compiles under `swift build` and `xcodebuild`. | `@testable import DSTokens` with an internal accessor. |
| V3 | Tokens Studio import: `$root` → `default`, `$metadata.json` `tokenSetOrder`, grouped themes, `rgba()` colors, the `studio.tokens` alpha modifier on alias tokens | P1-5 | One manual import by the owner (themes and color modifiers need the paid plan). | Product themes (brand × scheme × density) instead of groups; `#AARRGGBB` if Tokens Studio's ARGB reading is confirmed; resolved `rgba()` literals instead of the alpha modifier (they cannot follow a brand theme's accent). |
| V4 | Figma native import of one generated file per mode | P1-5 | One manual import, and a translucent variable keeps its alpha; which `$extensions` key carries code syntax; whether a letter-spacing variable can hold em, so that it and its code syntax (`…-letter-spacing`, `trackingEm`, both em) share a unit (§9.10). | Adjust the flavor; it never feeds back into the source. Letter spacing stays px at the role's size (px = em × font size), as `tokens/export/README.md` says. |
| V5 | Tailwind per-utility namespaces stay available | P1-5, every Tailwind bump | The compile test in CI. | Generic `--color-ds-bg-page` names (`bg-ds-bg-page`) with a README change. |
| V6 | Font parser for `tools/fonts` (candidate `opentype.js` 2.0.0, MIT) | P1-8 | Reads the variable Onest, JetBrains Mono and Inter TTFs (cmap, `fvar` axes and instances with `postScriptNameID`, name IDs 5 and 6, `hmtx`, GSUB `tnum` single substitutions including those inside type 7 extension lookups) and can synthesize a Latin-only and a proportional-digit font. | `fontkit` 2.0.4 (MIT) for reading plus tiny committed OFL test fonts with license entries. |
| V7 | SD native resolver (#1590) semantics when it ships | later | Merge semantics, typing, per-permutation access. | Keep `resolver.ts` (§5.8). |
| V8 | macOS high-contrast lookup at runtime | P3 | The SD-maximal probe saw `NSAppearance(named: .accessibilityHighContrastAqua)` return the standard value; actool does compile the entries. | P3 snapshots with Increase Contrast on macOS. |
| V9 | The selector algebra in real browsers | P3-2 / P3-4 (VRT runtime-contract spec) | Root, nested islands, media and attribute forms in Chromium, WebKit and Firefox; the ADR-0019 valid-value `:not()` lists, `not all and (hover: hover) and (pointer: fine)` and `(any-pointer: coarse)`, including WebKit's `any-pointer: coarse` on an iPad with a trackpad connected. Verified in Chromium 152 on 2026-09-15. | Adjust `formats/css/model.ts`; the simulator encodes the fix. |
| V10 | `@layer ds.tokens` next to consumers that import Prism styles as `layer(components)` | P3-2 | Consumer overrides of `--ds-*` still win. | Drop the layer from `tokens.css`. |
| V11 | iPadOS pointing-device detection | P3-1 | Whether GameController `GCMouse` connect/disconnect notifications report the Magic Keyboard trackpad and a Bluetooth mouse on iPadOS 26. | iPad stays `touch` (ADR-0019 §5); native hover effects still work. |
| V12 | Deterministic woff2 encoder | P1-8 | Byte-identical output across runs and machines, which the stale check needs; candidates `wawoff2` (MIT, wasm) or a Prism-owned null-transform encoder over Node brotli. | Ship the TTF as `format("truetype")` (ADR-0021 §11). |
| V13 | SwiftUI first-baseline shift | P3-1 | `.offset(y: −Δ)` plus `.alignmentGuide` overrides for `.firstTextBaseline` and `.lastTextBaseline` move the glyphs by ADR-0021 §8's Δ without changing the line box, at line heights 1.0–1.5 on iOS, watchOS and macOS, including a `metric.xl` + `metric.unit` baseline-aligned HStack. | Keep SwiftUI's placement and record the difference in `Text.yaml`; the DSCore test pins it (ADR-0021 rule 7). |
| V14 | SwiftUI `Gradient.ColorSpace.perceptual` is OKLab | P3-1 | A `LinearGradient` over each seeded vivid gradient with `.colorSpace(.perceptual)`, rendered with `ImageRenderer` on iOS, watchOS and macOS, matches the OKLab samples of `tools/contrast/gradient.ts` (`mix(…, 'oklab')`) within 1/255 per channel in an sRGB render (§7.9). The SDK interface declares only `.device` and `.perceptual` and does not name the space. | DSCore resamples each segment in OKLab into extra stops and draws them with `.device`. |

### 16.2 Risks

| Risk | Mitigation |
|------|------------|
| The source fails the first build (the open rows of §1). | Fixture-based tests for P1-3/P1-4; `repo.test.ts` is `todo` until P1-2 lands; diagnostics carry file, line and fix; `--json` lets an agent fix them in one pass. |
| SD pitfalls: warnings instead of errors, transitive transforms receiving transformed values, prototype loss, group-first typing, the global message queue. | `warnings: 'error'`, verbose logging, a diagnostics side channel, one plain-data idempotent transform with property tests, the `prism/dtcg-types` preprocessor, strictly sequential runs. |
| SD's native resolver may merge tokens property-wise, like its `source` merge. | The deletion is gated on the merge-semantics conformance fixture (§5.8). |
| The CSS selector algebra is intricate. | Block model, cascade simulator over all 96 contexts per brand and nested scenarios, real-browser check in P3 (V9). |
| `swift test` cannot see catalog colors (F17). | Catalog tests run under `xcodebuild` on iOS and watchOS simulators; host tests use `DSColorToken.appearances` and generated expectations. |
| watchOS catalogs hold one value per idiom, so Increase Contrast is not reflected on watch colors (F19). | Documented Tier-3 limitation; DSCore can override from `DSColorToken.appearances` if a watch design needs it. |
| Adding a brand can widen a token's API shape for every brand (ADR-0020 §7). | Union shapes; `tokens:diff` reports `axes-changed`. |
| Every Apple app ships every Signature brand's fonts (about 380 KB per brand today). | The 2 MiB budget in `fonts:check` and ADR-0020 §8's route-2 trigger. |
| Tailwind per-utility namespaces are undocumented (F24). | Compile test in CI, collision check, V5 fallback. |
| Motion or Color.js upgrades change generated bytes. | Lockfile, one Color.js, reviewed generated diffs, spring tests against the closed form. |
| Memory and time grow by 216 permutations per brand. | Drop trees after each run, intern IR tokens, `worker_threads` with one SD per worker if CI exceeds ~30 s. |
| `@terrazzo/parser`'s `resolver.orthogonal`, `listPermutations`, `permutationLimit` and `resolver.source` are undocumented internals (F36). | `lint-orthogonality.test.ts` fails loudly on its fixtures; `tokens:build` stays authoritative. |
| Tokens Studio's `rgba()` and alpha-modifier import and Figma's import of an alpha below 1 are unverified (V3, V4). | Owner's manual imports; the fallbacks of V3 and V4. |
| Pre-1.0 semver: a `major` classification bumps 0.1.0 to 1.0.0. | Policy derived from the base release tag: shifted while it is 0.x (ADR-0024 §14). |

### 16.3 Decisions and follow-ups outside this document

The owner decisions this design left open were decided on 2026-09-15 by the agents under the owner's delegation:

- **O1** Web attribute contract of §9.1: **decided by ADR-0019** (six `data-ds-*` attributes named after the context fields; color scheme and density nest; valid-value fallbacks; compact + pointer web root; per-platform defaults). It amends ADR-0003 and ADR-0004 decision 5.
- **O2** Brand-tunable semantics (S9): **decided by ADR-0020** (brands write allowlisted `ref.*` ids only; eight `ref.color.slot.*` tokens that the scheme files alias). `brands/README.md` was rewritten per ADR-0020.
- **O3** Flavors live in `tokens/export/` (generated, committed): **decided by ADR-0024 §11**, which amends ADR-0014's layout line and rule 1.
- **O4** `tokens:diff` policy before 1.0: **decided by ADR-0024 §14** (shifted while the base release tag is 0.x, strict from 1.0; no flag).
- **O5** Swift and brands: **decided by ADR-0020 §7** (every repo brand in `DSTokens`, `DSTokenContext.brand`, namespaced colorsets, `DSColor(brand:transparency:)`).
- **O6** The orthogonality gate: **decided by ADR-0024 §9** (id-level ownership; `pnpm tokens:lint` plus `tokens:build`), which restates ADR-0004 rule 2 and the P1-2 acceptance.
- **O7** Material recipes as typed tokens: **decided by ADR-0022** (typed recipe tokens, no neutral defaults).
- Motion (C-01, C-08, G-05, S3, S5, the `interactive` bounce, parity tolerances, the reduced-motion definition and component behavior): settled by ADR-0023; nothing is left for the owner.
- Typography (thin weights, figures, units, Dynamic Type, the font check): settled by ADR-0021.

The two Phase 1 critic follow-ups the roadmap routes to P1-5 were decided by P1-5 on 2026-09-15, within what the ADRs leave to it:

- **Gradient interpolation parity** (ADR-0022 §4.1: "Which space each stack renders in is P1-5's parity decision"): **both stacks interpolate in OKLab** (§7.9). `tokens.css` and `tokens.ts` write `linear-gradient(<angle>deg in oklab, …)`. `DSGradientToken` documents the space and carries no interpolation field. DSCore draws OKLab in P3-1, with `.colorSpace(.perceptual)` if V14 confirms it or with resampled stops otherwise. `contrast:check` keeps checking both spaces.
- **Catalog colors or literal tables (critic R-03, "ADR-0020 keeps the catalog")**: **components read catalog colors**, and the catalog is checked where it compiles: the stale check, `verify-xcassets.sh` and `ColorCatalogTests` under `xcodebuild test` on the iOS and watchOS simulators. Host `swift test` checks `DSColorToken.appearances` (§9.7.3). No second build system for host tests.

Open disagreement with an ADR (reported, not decided here):

- **Figma metadata scope** (P1-1 review, 2026-09-15): decided by ADR-0026. The source keeps `figma` (`collection`, `scopes`) only on `sys` and `comp` declarations of scoped types; no token authors code syntax; the Figma-native flavor derives `codeSyntax` (§9.10) and the source checks of §5.6 enforce ADR-0026 rules 1-2.

Open disagreements with ADR wording, found in the P1-5 review (2026-09-15) and reported for an amendment. In each, the ADR's text does not fit a case the repository has, and the build does what is described here. The P1-5 verification checked all three against the outputs and found each consistent. Because an ADR wins over this document, each still needs the owner: either an amendment of the ADR, or a ruling that the build then follows:

- **Web font layout (ADR-0021 §11, "Web").** The ADR lists the web files of a brand flat in `<brand>/fonts/`: `<family-kebab>-wght.woff2`, "the `OFL.txt`" and `fonts.css`. A brand that serves two families (prism: Onest and JetBrains Mono) has two different licenses, which one flat folder cannot hold under one name, so `formats/fonts.ts` writes `<brand>/fonts/<family-dir>/<family-kebab>-wght.woff2` and `<brand>/fonts/<family-dir>/OFL.txt`, the family folder of the source file, and `fonts.css` refers to `./<family-dir>/<family-kebab>-wght.woff2` (§9.0). The amendment should name the per-family folder. Decided 2026-09-15 by ADR-0027, which amends the ADR to match.
- **Apple font deduplication (ADR-0021 §11, "Apple", and ADR-0020 rule 14's budget).** The ADR says the copies into `Resources/Fonts/<family-dir>/` are "deduplicated by SHA-256". The format deduplicates by destination path: brands that bundle the same bytes at the same `<family-dir>/<file>` share one copy, different bytes at a taken path fail with `fonts/path-collision`, and the same bytes under two different paths are copied twice, because each brand's `DSBrand` face names its own path. No repository brand reaches the last case (only prism bundles on Apple). Deduplicating across paths needs `DSBrand` to name the kept path; until then the amendment should say "one copy per path", and `fonts:check`'s budget, which counts each SHA-256 once, would undercount that case. Decided 2026-09-15 by ADR-0027, which amends the ADR to match.
- **Emitted CSS names (ADR-0024 §13.3).** The ADR accepts a quoted `--ds-…` property when it is "a manifest `css` name, or one plus a derived suffix". A typography role and a dashed stroke style declare only derived properties, so their base name (`--ds-type-body-md`) exists nowhere, and a color takes no derived suffix. The manifest therefore lists every declared property in `cssVars` and sets `css` to null where there is no base property (§9.6), and `docs.test.ts` accepts exactly the `cssVars` names. The amendment should say "a manifest `cssVars` name". Decided 2026-09-15 by ADR-0027, which amends the ADR to match.

Disagreement with an ADR, resolved in the ADR's favor:

- **Inter `version`** (P1-8 review, 2026-09-15). §14 P1-8 gave the Native preset's Inter entry `version: "4.1"`, the release tag. ADR-0021 §11 check 3 requires name ID 5 to equal "Version " + `version`, and the v4.1 `InterVariable.ttf` reports "Version 4.001;git-9221beed3". `brands/prism-native/brand.json` follows the ADR, and §14 P1-8 now does too; "4.1" remains the label in the brand notes, `licenses/inventory.json` and `THIRD_PARTY_NOTICES.md`.

Follow-ups in files this design does not own (each lands with the ticket that needs it; §14 lists them per ticket):

- `.github/workflows/ci.yml`: the offline `tokens:validate` step (P1-1); the renamed lint step (P1-2); the generated-path list equal to `OWNED_ROOTS` and the `apple` job steps (P1-5); a gated `fonts:check` step and the Swift font root (P1-8).
- `pnpm-workspace.yaml` catalog and `tools/package.json`: `ajv-formats` (P1-1), `@terrazzo/parser` (P1-2), `jsonc-parser` (P1-3), `tailwindcss` and `@tailwindcss/node` (P1-5), the font parser and woff2 encoder (P1-8); scripts `tokens:validate`, `tokens:lint` (extended), `tokens:normalize`, `tokens:normalize:check`, `tokens:check`, `fonts:check`; root pass-throughs `tokens:validate`, `tokens:lint`, `tokens:normalize`, `tokens:check`.
- `Package.swift`: `.copy("Resources/Fonts")` for DSTokens (P1-8).
- `tools/lint/literals.ts`: the `runtime`, `motion`, `typography`, `material` and `brand` kinds (P1-5, P1-4, P1-4, P3-1/P3-4, P3-1/P3-2).
- `spec/component.schema.json` and the four slice specs: the P2-1 migration of ADR-0022, ADR-0023 and ADR-0024 (bindable categories with `stroke`, the `motion` binding pattern with `reduceMotion` required, `accessibility.reduceTransparency` and `reduceMotion` required, gradient slots, `selected` on Surface, material-keyed foregrounds, the Button bindings of S21).
- `licenses/inventory.json` and `THIRD_PARTY_NOTICES.md`: the DTCG schema entry (P1-1) and Inter 4.1 (P1-8).
- **P1-9 (2026-09-16), where the implementation departs from or adds to ADR-0029 and ADR-0030:**
  - The role recipes' `$root` carries no `$type` of its own and takes `color` from its alias (DTCG's reference pattern rejects `{….$root}` in a typed token, F43), as the comp tokens that alias a `$root` already do; `material/recipe-shape` accepts that one untyped field and `material/role-recipe` checks its target. The other six role fields keep their own `$type`.
  - `SYS_COLOR_ALIAS_TARGETS` gains `sys.material.glass.**` as ADR-0029 §1.2 says, so any sys color may alias a glass color, not only a role recipe's `$root`; the hue concern of ADR-0020 §3 is unaffected, because every glass color is itself a ref alias or pure white or black.
  - The temperature requirement of ADR-0029 rule 5 is enforced by the `app.prism` schema through `dependencies: { scheme: [temperature] }`: a gradient that declares its scheme declares its temperature.
  - Token backdrops (ADR-0030 §1.5) are written `<color name or glob> over <ground>`; the map pairs of ADR-0030 §1.6 put the label on each ground as `bg` with the land as an opaque token backdrop.
  - Chart and map "white α" values that ADR-0030 writes as "white" are pure white sRGB literals with alpha (the dark scheme's convention); those it writes as `{ref.color.neutral.0}` (the chart line and reference on media, the edges, the inverse-media fill, the route casing and road in light) alias the brand's white.
  - The generated Swift tests split into part functions of at most 48 checks (F44), so the file's test names are unchanged and the stack holds one part at a time.
- `docs/roadmap.md` (P1-5): mark the Phase 1 critic follow-ups R-03 and gradient interpolation parity as decided by P1-5 (above). Add to P3-1 the OKLab gradient rendering and its check, V14: `.colorSpace(.perceptual)` or resampled stops, tested against the OKLab samples. Done 2026-09-15 (the P3-1 row and "Verify before implementing").
- `docs/research/critic.md` §6 (P1-5): R-03's "Still open" note becomes "Decided by P1-5 (2026-09-15): components read catalog colors, checked under `xcodebuild` (ARCHITECTURE §9.7.3)". Done 2026-09-15.
