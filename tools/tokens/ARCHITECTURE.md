# tools/tokens architecture (Phase 1: P1-3 to P1-8)

This is the design the Phase 1 implementers follow. It covers the resolver driver (P1-3), the transforms (P1-4), the formats (P1-5), the interfaces that contrast (P1-6) and diff (P1-7) consume, and the entry point of the font check (P1-8). It also lists the source fixes that P1-1 and P1-2 must land first.

- **Status:** accepted design, written 2026-09-15 against commit `2da5712` plus the uncommitted P0 work in the tree (gated `ci.yml`, `tools/tsconfig.json`, `tools/vitest.config.ts`, corrected `tokens/README.md` Motion section).
- **Basis:** the "IR-first thin driver" design (the judges' consensus winner), with ideas grafted from the "SD-maximal" and "output-first" designs and every judge must-fix applied.
- **Evidence:** every library fact marked *(verified: …)* was re-checked on 2026-09-15 against the versions this repository actually resolves (`tools/node_modules`: style-dictionary 5.5.3, colorjs.io 0.5.2, motion 13.2.0, @terrazzo/cli 2.7.1, vitest 4.1.11, typescript 6.0.3) or, for packages the tools package does not install yet, against scratch installs (@terrazzo/parser 2.7.1, tailwindcss and @tailwindcss/node 4.3.3, jsonc-parser 3.3.1, @tokens-studio/types 0.5.2), on Node 24.21.0 and Xcode 26.6 with the iOS 26.5 and watchOS 26.5 simulators. §15 lists them. The probes lived outside the repository; the tests in §14 turn each one into a permanent check.
- **Precedence:** where this document disagrees with `tokens/README.md` or `tools/tokens/README.md`, those READMEs were updated in the same change to match. Where it disagrees with an ADR, §16.3 lists the amendment the owner has to record. Until then the ADR wins for intent, this document for mechanics.

Rules for implementers:

1. Everything written into the repository is English.
2. Tools run from TypeScript source on Node 24: erasable syntax only (no `enum`, `namespace` or parameter properties), `import type` for type-only imports, `.ts` extensions in relative imports (`tools/README.md`, "How tools run").
3. Do not create a file that opens a CI gate before its ticket is complete. The `plan` job opens `tokens:lint` when `tools/tokens/terrazzo.config.ts` exists (P1-2), `tokens:build` when `tools/tokens/build.ts` exists (P1-5), `contrast:check` when `tools/contrast/check.ts` exists (P1-6) and `tokens:diff` when `tools/tokens/diff.ts` exists (P1-7).

---

## 0. Summary

```
tokens/prism.resolver.json ─┐
tokens/**/*.tokens.json ────┼─► source/model.ts ─► source/analyze.ts      (orthogonality, ownership, completeness,
brands/*/brand(.tokens).json┘      SourceModel        brand rules, dead writes, group $type conflicts)
                                        │
                        resolver.ts  [DELETABLE]  enumerate() → 432 inputs; merge(input) → { tree, provenance }
                                        │
                        engine/sd.ts   one Style Dictionary 5.5.3 instance per permutation, strictly sequential
                                        preprocessors prism/validate, prism/dtcg-types; transform prism/normalize
                                        dictionary = await sd.getPlatformTokens('ir')
                                        │
                        engine/to-ir.ts dictionary → PermutationIR (plain data)
                                        │
                        ir/bundle.ts    IRBundle (all permutations) + invariants
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

1. **Style Dictionary does what its future native resolver will still do**: DTCG typing (through a Prism preprocessor that fixes SD's type precedence), alias resolution with broken-reference errors, and transform orchestration. It runs once per permutation in memory, 432 runs today, sequentially. Prism does not use SD formats or any SD built-in transform.
2. **`resolver.ts` holds only enumeration, merge and provenance** (about 150 lines). Parsing and every source check live in `source/` and survive when SD ships a `resolver` option (issue #1590).
3. **Merge follows DTCG Resolver 2025.10 exactly**: a later declaration of a token id replaces the whole token; groups merge; aliases resolve only after the merge.
4. **One transitive, idempotent, plain-data normalizer** (`prism/normalize`) turns every DTCG value into an `IRValue`. Functional extensions (`spring`, `slot`, `numeric`, `textStyle`, `opsz`, `flag`, gradient `angle`/`grain`/`scheme`/`bloom`) are folded into the value, so they flow through aliases. Material recipes stay on the declaring token and default to neutral values.
5. **The IR is plain data and every format is a pure function** of the bundle. Cross-permutation outputs (CSS modes, colorset appearances, Swift and TS tables, Figma flavors) are possible only there, because an SD format sees one dictionary.
6. **Orthogonality is proven on every build**, over resolved values of the full product: write-set disjointness, ownership, context completeness, disjoint increased-contrast and reduced-transparency deltas, and an exhaustive composition proof. `tz lint` cannot do it *(verified)*; `tokens:lint` adds Terrazzo's parser API as a second opinion.
7. **Web runtime contract**: `data-ds-color-scheme` and `data-ds-density` are nestable; `data-ds-contrast`, `data-ds-transparency`, `data-ds-modality` and `data-ds-motion` are root-only; media queries apply when an attribute is absent. `var()` chains, a rescope block for nested scopes, compound delta blocks for contrast and transparency, `@media (color-gamut: p3)` twins, `@supports not (… linear() …)` twins, all inside `@layer ds.tokens`.
8. **Tailwind keeps the README names** (`bg-ds-page`, `text-ds-primary`, `bg-ds-accent`) through Tailwind 4's per-utility theme namespaces, guarded by a build-time utility-collision check and a compile test.
9. **Swift**: colors come from `Colors.xcassets` (Any, Dark, High Contrast, Dark + High Contrast, plus a `watch` idiom entry that carries the dark value); everything else comes from a value type `DSTokenSet(DSTokenContext)` built from per-axis `switch` tables; watch-only deltas use `#if os(watchOS)`.
10. **Springs**: settle is the last whole millisecond at which the step response is at least 0.001 from its target (floor). CSS `linear()` is sampled from Motion's spring generator with near-zero rest thresholds and simplified to at most 0.002 error. Parity with SwiftUI samples `Spring.value`, never `Spring.settlingDuration`.
11. **Flavors** (Tokens Studio, Figma-native) are committed under `tokens/export/`, named `*.json`, outside the `*.tokens.json` schema glob.
12. **Determinism**: canonical ordering, one number formatter, Prism-owned serializers, owned-directory sync with `--check`, a double build with shuffled read order in tests.

---

## 1. Prerequisite source fixes

The current token source fails the first build. Each row names the ticket that owns the fix. P1-3 and P1-4 develop against fixtures; tests that build the real repository are marked `todo` until the fix lands.

| # | Defect | Evidence | Fix | Owner |
|---|--------|----------|-----|-------|
| S1 | `sys.material.*` has no `$type` on the token or any ancestor in `sys/color/{light,dark,light-reduced-transparency,dark-reduced-transparency}.tokens.json`. | `tz lint` exits 1: `parser:init: Cannot alias to $type "undefined" from $type "color"` at `comp.card.glass.fill` *(verified)*. SD passes the tokens through untyped *(verified)*. | Add `"$type": "color"` to the `sys.material` group in all four files. | P1-2 |
| S2 | `comp.card.solid.bg` and `comp.surface.solid` reference the group `{sys.color.bg.surface}`. | DTCG Format §6.2: a reference to a group is invalid; write `{group.$root}` *(verified: spec)*. SD throws `{comp.card.bg} tries to reference {sys.bg.surface}, which is not defined` *(verified)*. | Write `{sys.color.bg.surface.$root}`. | P1-2 |
| S3 | The `reduced` context of `motion` loads only `sys/motion/reduced.tokens.json`, which lacks `sys.motion.duration.instant`, `duration.quick`, `spring.interactive` and `spring.smooth`. Those tokens do not exist in 216 permutations. | Completeness check on the resolved product *(verified: prototype; token counts 393/394/397/398 per permutation)*. | Resolver: `"reduced": [ default, reduced ]`, the layering the colorScheme variants already use. | P1-2 |
| S4 | `sys.material.glass.cell` exists only in `dark` and `dark-reduced-transparency`. | Same check *(verified)*. | Add it to `light` and `light-reduced-transparency`, or delete it. | P1-2 |
| S5 | The reduced springs have `$value.duration` 250 / 250 / 300 ms and no `settle`; their derived settle is 367 / 367 / 440 ms. | Closed form and Motion's generator *(verified)*. | `pnpm tokens:normalize` writes 367 / 367 / 440 ms and `settle` 0.367 / 0.367 / 0.44 (§7.13). | P1-4 |
| S6 | Semantic roles the specs bind do not exist: `type.*` (e.g. `type.label.md` in `spec/components/Button.yaml`), `gradient.vivid.*` (ADR-0009, `contrast-pairs.json`), `elevation.0…3` (README) and `motion.easing.*`. | Only `ref.type.*`, `ref.gradient.vivid.*`, `sys.shadow.*` and `ref.motion.easing.*` exist. | Add `sys.type.<role>` (each with an explicit `"$type": "typography"`, because the density files give the `sys.type` group `$type: number`), `sys.gradient.vivid.<name>` (colorScheme), `sys.elevation.0…3` (aliases of `sys.shadow.*`) and `sys.motion.easing.<name>`. The generators are category-driven and pick them up without code changes. | P1-2 |
| S7 | `ref.motion.easing.inOut` is camelCase. | `tz lint` warning `core/consistent-naming` *(verified)*. | Rename to `in-out`. | P1-1 |
| S8 | `brands/prism/brand.tokens.json` declares `ref.brand.type-scale`, a path the `ref` set does not declare; `brands/README.md` names the token `ref.type.scale`. | Brand-path check *(verified)*. | Add `ref.type.scale` (`$type: number`, `1`) to `ref/typography.tokens.json`; brands override it. | P1-1 (token), P1-8 (brand file) |
| S9 | `brands/README.md` whitelists brand overrides of `sys.color.bg.page`, `text.accent`, `text.on-accent`, `bg.fill.accent`. `colorScheme` writes the same ids later in `resolutionOrder`, so such a write is always overwritten and would also make the resolver non-orthogonal. | Resolver order. | Brands override `ref.*` only; brand-tunable semantics become `ref.*` slots that the scheme files alias. The build rejects dead brand writes (§5.6). Owner decision O2. | P1-2 + owner |
| S10 | Number tokens used as booleans (`sys.interaction.*`, `sys.material.blur.enabled`, `sys.motion.presentation.crossfade`). | — | Add `"$extensions": { "app.prism": { "flag": true } }`; generators then emit `Bool` / `boolean` (§7.11). | P1-2 |
| S11 | Type roles carry no Dynamic Type mapping. | — | Add `app.prism.textStyle` (a `DSTextStyle` case name, §9.7) to every `ref.type.*` role; `sys.type.*` aliases inherit it (§5.4). The build fails on a `sys.type.*` role without one. | P1-1 |
| S12 | The Native preset puts SF names first in web stacks (`"SF Pro Text", "Inter", …`). | `brands/prism-native/brand.tokens.json`. | Per-platform font slots (web stack without SF). Not blocking. | P1-8 |

After S1 and S2, `tz lint` passes with the two S7 warnings *(verified: patched copy)*. After S1 to S4 the analysis in §5.6 and §5.7 passes on the repository data *(verified: prototype, see §15)*.

---

## 2. Permutation strategy per target

All 432 permutations (2 brands × 3 platforms × 6 color schemes × 3 densities × 2 modalities × 2 motion) are resolved on every build; each target takes its slice.

| Target | Build-time axes (one artifact each) | Runtime axes inside the artifact | Permutations read |
|--------|-------------------------------------|----------------------------------|-------------------|
| `tokens.css` | brand | colorScheme (nestable) with contrast and transparency variants, density (nestable), modality (root), gamut | web: 72 per brand |
| `motion.css` | — (brand invariance asserted) | motion (root) | web, default brand |
| `tailwind.css` | — (name invariance asserted) | through `var()` | web, default brand |
| `tokens.ts` | brand | colorScheme + variants, density, modality, motion | web: 72 per brand |
| Swift sources + `Colors.xcassets` | brand = default (`prism`) for values; font faces for every repo brand; platform apple/watch merged with `#if os(watchOS)` and the `watch` idiom | colorScheme, contrast, transparency, density, modality, motion | apple + watch: 144 (default brand), plus default permutations of other brands for font faces |
| Tokens Studio flavor | — | themes = brand × colorScheme × density | `SourceModel` only (no resolution) |
| Figma-native flavor | brand × colorScheme | — | web, other axes at defaults: 12 |
| Contrast (P1-6) | brand × colorScheme | — | web: 12, plus an apple-equality assertion |
| Diff (P1-7) | all | all | all 432, both revisions |
| Analysis (§5.7) | all | all | all 432 |

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
| `config.ts` | Pure data: repository paths, owned output roots, runtime-axis vocabulary and web attributes (§9.1), colorScheme structure (base schemes, variant suffixes), ownership globs (§5.6), Swift category table and numeric member prefixes (§8), Tailwind namespace table and utility lookup order (§9.4), extension key lists (§5.4), default `textStyle` validation list. | P1-3, grown by P1-5 | yes |
| `source/reader.ts` | `SourceReader { readText(path), list(dir) }` over repository-relative POSIX paths; `fsReader(root)`; paths outside the root are errors. | P1-3 | yes |
| `source/types.ts` | Source-model types (§4.1). | P1-3 | yes |
| `source/model.ts` | Parses the resolver and every referenced document once with `jsonc-parser` `parseTree` (line and column for every node, duplicate-key detection), validates names and structure, records each token's own `$type`, its nearest group `$type` in the same document, its effective `$deprecated`, and deep-freezes the documents (§5.1). | P1-3 | yes |
| `source/brands.ts` | Loads `brands/<context>/brand.json` for each `brand` context; validates against `schema/brand.schema.json`. Used by Swift `DSBrand` and by `tools/fonts`. | P1-3 | yes |
| `source/analyze.ts` | Source-level checks (§5.6). | P1-3 | yes |
| `resolver.ts` | **Deletable.** `enumerate(model, filter?)`, `permKey(model, input)`, `merge(model, input) → { tree, provenance }` (§5.2, §5.3). | P1-3 | **no** |
| `engine/sd.ts` | `runPermutation(tree, meta) → PermutationIR`: builds the SD instance (§6), awaits `getPlatformTokens('ir')`, throws `TokenBuildError` when the diagnostics side channel is non-empty. | P1-3 | yes (loop changes) |
| `engine/hooks.ts` | `prismHooks(meta)`: preprocessors `prism/validate` and `prism/dtcg-types`, value transform `prism/normalize` (thin wrappers; logic lives in `ir/`). | P1-3 | yes |
| `engine/to-ir.ts` | SD dictionary → `PermutationIR`: ids, raw values, alias targets, sub-aliases, provenance, material recipes, brand type scale (§5.5). | P1-3 | yes |
| `ir/types.ts` | IR types (§4.2). | P1-3 | yes |
| `ir/normalize.ts` | Pure, idempotent `normalize(type, value, ownExtensions, diagnostics) → IRValue` (§7.1). | P1-3 | yes |
| `ir/color.ts` | Color.js wrapper, memoized by input JSON: space mapping, CSS gamut mapping to sRGB and Display P3, OKLCH, hex, gamut tests (§7.2). Used by the normalizer, the contrast tool and the renderers. | P1-3 | yes |
| `ir/color-math.ts` | Source-over compositing in gamma-encoded sRGB, WCAG 2.x relative luminance and contrast ratio (§10). | P1-3 | yes |
| `ir/order.ts` | Canonical id comparator and context order (§12). | P1-3 | yes |
| `ir/bundle.ts` | `buildBundle(opts)`: model → source checks → sequential permutation loop → IR invariants → analysis → `IRBundle`. | P1-3 | yes (loop changes) |
| `ir/analyze.ts` | Dependency axes per token and scope, exhaustive composition proof, variant deltas and their disjointness, platform and brand invariance (§5.7). | P1-3 | yes |
| `ir/naming.ts` | Public path (P1-3); CSS, Tailwind, TS, Swift, asset and flavor names plus per-target collision checks (P1-5) (§8). | P1-3, P1-5 | yes |
| `ir/diagnostics.ts` | `Diagnostic`, `TokenBuildError`, deterministic sort, human and JSON printers. | P1-3 | yes |
| `transforms/format-number.ts` | The single number formatter (§12). | P1-4 | yes |
| `transforms/color.ts` | Renderers `cssColor` (`prism/color/css-gamut`), `colorsetComponents` and `swiftRGBA` (`prism/color/p3`), `figmaColor`, `studioColor`, `tsColor` (§7.2). | P1-4 | yes |
| `transforms/dimension.ts` | `cssDimension` (`prism/dimension/css`), `cgFloat` (`prism/dimension/cgfloat`), `figmaDimension`, `studioDimension` (§7.3). | P1-4 | yes |
| `transforms/duration.ts` | `prism/duration`: CSS ms, Swift seconds, TS ms, Figma seconds (§7.4). | P1-4 | yes |
| `transforms/cubic-bezier.ts` | CSS `cubic-bezier()`, Swift and TS forms (§7.5). | P1-4 | yes |
| `transforms/spring.ts` | `prism/spring`: Apple conversion, settle, curve via Motion, `cssLinear` (§7.6). | P1-4 | yes |
| `transforms/typography.ts`, `shadow.ts`, `gradient.ts`, `stroke.ts`, `font.ts`, `number.ts`, `material.ts` | Composite and scalar renderers (§7.7 to §7.12). | P1-4 | yes |
| `normalize.ts` | CLI `tokens:normalize`: rules `hex` (the roadmap's `normalize-hex`) and `spring-fallback`; `--check` or `--write` with `jsonc-parser` surgical edits (§7.13). | P1-4 | yes |
| `terrazzo.config.ts` | Lint-only Terrazzo config: `tokens: [fileURLToPath(new URL('../../tokens/prism.resolver.json', import.meta.url))]`, `plugins: []`. **Opens the `tokens:lint` gate.** | P1-2 | yes |
| `lint-orthogonality.ts` | Parses the resolver with `@terrazzo/parser` and fails unless `resolver.orthogonal === true` and `listPermutations().length` equals the product of context counts. | P1-2 | yes |
| `formats/index.ts` | `renderAll(bundle): OutputFile[]`, sorted by path. | P1-5 | yes |
| `formats/header.ts` | Static generated-file headers. | P1-5 | yes |
| `formats/css/model.ts` | `CssRule` model, block builder for `tokens.css` and `motion.css` (§9.2). | P1-5 | yes |
| `formats/css/render.ts` | `CssRule[]` → text. | P1-5 | yes |
| `formats/css-variables-modes.ts` | `prism/css-variables-modes`: `<brand>/tokens.css`. | P1-5 | yes |
| `formats/css-motion.ts` | `motion.css`. | P1-5 | yes |
| `formats/tailwind-theme.ts` | `prism/tailwind-theme`: `tailwind.css` + utility-collision check. | P1-5 | yes |
| `formats/ts-tokens.ts` | `prism/ts-tokens`: `<brand>/tokens.ts`. | P1-5 | yes |
| `formats/manifest.ts` | `manifest.json` (§9.6). | P1-5 | yes |
| `formats/swift/types.ts` | `DSTokenTypes.swift` template (value types, no values). | P1-5 | yes |
| `formats/swift/context.ts` | `DSTokenContext.swift`; mapping between Swift contexts and resolver inputs. | P1-5 | yes |
| `formats/swift/colors.ts` | `DSColor.swift`. | P1-5 | yes |
| `formats/swift/token-set.ts` | `DSTokenSet.swift` and `DSTokenSet+<Category>.swift`. | P1-5 | yes |
| `formats/swift/brand.ts` | `DSBrand.swift`. | P1-5 | yes |
| `formats/swift/tests.ts` | `swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift` (§9.7.6). | P1-5 | yes |
| `formats/swift/syntax.ts` | Identifier escaping, literal formatting. | P1-5 | yes |
| `formats/swift-xcassets.ts` | `prism/swift-xcassets`: `Colors.xcassets/**/Contents.json`. | P1-5 | yes |
| `formats/xcode-json.ts` | Xcode-style JSON serializer. | P1-5 | yes |
| `formats/tokens-studio.ts` | `prism/tokens-studio`: `tokens/export/tokens-studio/**` from the `SourceModel`. | P1-5 | yes |
| `formats/figma-native.ts` | `prism/figma-native`: `tokens/export/figma/<brand>/<colorScheme>.json`. | P1-5 | yes |
| `formats/export-readme.ts` | `tokens/export/README.md` (generated). | P1-5 | yes |
| `verify/css-cascade.ts` | Cascade simulator over the `CssRule` model (§9.12). | P1-5 | yes |
| `verify/tables.ts` | Evaluates the Swift and TS table models for every context against the IR. | P1-5 | yes |
| `output/write.ts` | `writeOutputs(files, { owned, check })`: writes changed bytes only, deletes stale files inside owned roots, never writes elsewhere; `--check` prints added, changed and removed files. | P1-5 | yes |
| `scripts/verify-xcassets.sh` | macOS only: `actool` compile for iphoneos, macosx and watchos with warnings as errors, then `assetutil --info` appearance assertions (§9.8). | P1-5 | yes |
| `diff.ts` | CLI `tokens:diff` (§11). **Opens the CI gate.** | P1-7 | yes |
| `diff/git.ts` | Read-only git: `gitReader(ref)` (`git show <ref>:<path>`, `git ls-tree`), `lastReleaseTag()`. | P1-7 | yes |
| `diff/classify.ts` | `diffBundles`, `requiredBump`. | P1-7 | yes |
| `diff/changesets.ts` | `declaredBump(changesetDir)`. | P1-7 | yes |
| `schema/app-prism.schema.json` | JSON Schema for `$extensions["app.prism"]` (unknown keys are errors), validated with Ajv. | P1-3 | yes |
| `schema/brand.schema.json` | JSON Schema for `brands/<name>/brand.json`. | P1-3 | yes |
| `fixtures/**` | Mini resolvers, merge-semantics cases, one broken tree per failure mode, tampered hex and spring files, diff before/after trees (§14). | all | yes |
| `seed-ref-tokens.py`, `seed-sys-tokens.py` | Existing bootstraps; not part of the pipeline. | — | — |

### 3.2 `tools/contrast/` (P1-6)

| File | Responsibility |
|------|----------------|
| `check.ts` | CLI `contrast:check`: `buildBundle()` → `contrastContexts()` → evaluate every pair of `tokens/contrast-pairs.json` → Markdown table on stdout and in `$GITHUB_STEP_SUMMARY` → exit 1 on any failure. `--resolver <path>` points it at a fixture. **Opens the CI gate.** |
| `pairs.ts` | Loads and validates `contrast-pairs.json`; resolves names with `api.lookup`; applies the compositing policy (§10). |
| `thresholds.ts` | Tier and size rules from ADR-0011 and the file's `thresholds`. |
| `report.ts` | Markdown rendering. |
| `fixtures/broken-pair/` | A mini resolver whose `color.text.secondary` fails on `color.bg.page`. |

### 3.3 `tools/fonts/` (P1-8)

| File | Responsibility |
|------|----------------|
| `check.ts` | CLI `fonts:check`: for every repo brand (`api.brandMeta`), every bundled file named in `brand.json` must contain U+0410–U+044F plus U+0401 and U+0451, and must have tabular digits: a `tnum` feature, or equal advance widths for 0–9 without features (monospaced faces need no `tnum`). Exit 1 with a per-file table. |
| `font-file.ts` | Thin adapter over the font parser (candidate `opentype.js` 2.0.0, MIT; verify-before-implementing V6). |
| `fixtures/` | The negative test synthesizes a Latin-only font in memory, so no binary fixture needs a license entry. |

`fonts:check` is a new script; CI needs a new gated step (§14, P1-8).

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
}

export interface SourceDoc {
  readonly file: string;                      // repository-relative POSIX path, or 'inline:<layer>#<i>'
  readonly tokens: ReadonlyMap<string, SourceToken>;
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

export interface BrandMeta {
  readonly name: string; readonly displayName: string; readonly version: string;
  readonly preset: 'signature' | 'native'; readonly extends: string | null;
  readonly fonts: Partial<Record<'ui' | 'display' | 'mono', {
    readonly family: string; readonly file: string | null; readonly version: string | null;
    readonly postscript: Readonly<Record<string, string>>;   // weight → PostScript name
  }>>;
}
```

### 4.2 IR (`ir/types.ts`)

```ts
import type { DTCGColorSpace } from 'style-dictionary/types';
import type { ModifierName, ContextName, SourceLayer, ModifierInfo, BrandMeta } from '../source/types.ts';

export type Input = Readonly<Record<ModifierName, ContextName>>;   // complete: one context per modifier
/** Canonical key; modifiers in resolutionOrder order:
 *  'brand=prism|platform=web|colorScheme=light|density=regular|modality=pointer|motion=default' */
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
  readonly color: IRColor; readonly offsetX: IRDimension; readonly offsetY: IRDimension;
  readonly blur: IRDimension; readonly spread: IRDimension; readonly inset: boolean;
}
export interface IRShadow { readonly kind: 'shadow'; readonly layers: readonly IRShadowLayer[] }
export interface IRGradient {
  readonly kind: 'gradient';
  readonly stops: readonly { readonly color: IRColor; readonly position: number }[];
  readonly angle: number | null;                                 // app.prism.angle (degrees)
  readonly grain: number | null;                                 // app.prism.grain
  readonly scheme: 'light' | 'dark' | null;                      // app.prism.scheme
  readonly bloom: { readonly alpha: number; readonly blur: number | null } | null;
}
export type TextStyleName = 'largeTitle' | 'title' | 'title2' | 'title3' | 'headline' | 'body'
  | 'callout' | 'subheadline' | 'footnote' | 'caption' | 'caption2';
export interface IRTypography {
  readonly kind: 'typography';
  readonly fontFamily: IRFontFamily; readonly fontSize: IRDimension; readonly fontWeight: IRFontWeight;
  readonly lineHeight: number; readonly letterSpacing: IRDimension;
  readonly slot: 'ui' | 'display' | 'mono' | null;               // app.prism.slot
  readonly numeric: 'proportional' | 'tabular';                  // app.prism.numeric, default 'proportional'
  readonly textStyle: TextStyleName | null;                      // app.prism.textStyle
}
export interface IRSpring { readonly duration: number; readonly bounce: number; readonly blendDuration: number }   // Apple parameters, seconds
export interface IRTransition {
  readonly kind: 'transition';
  readonly duration: IRDuration; readonly delay: IRDuration; readonly timingFunction: IRCubicBezier;
  readonly spring: IRSpring | null;                              // app.prism.spring (settle is derived, §7.6)
}
export type IRValue = IRColor | IRDimension | IRDuration | IRNumber | IRFontFamily | IRFontWeight | IRCubicBezier
  | IRStrokeStyle | IRBorder | IRShadow | IRGradient | IRTypography | IRTransition;

/** Recipe of a sys.material.glass.* token, from its OWN $extensions; absent keys take these defaults. */
export interface IRMaterialRecipe {
  readonly blur: number;        // px, default 0
  readonly saturate: number;    // default 1
  readonly edge: { readonly alpha: number; readonly to: number };   // default { alpha: 0, to: 0 }
  readonly grain: number;       // default 0
  readonly bloom: { readonly alpha: number; readonly blur: number }; // default { alpha: 0, blur: 0 }
}

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
  readonly aliasOf: string | null;            // immediate target id when raw is exactly '{…}'
  readonly subAliases: Readonly<Record<string, string>>;   // e.g. { fontFamily: 'ref.font.ui', 'layers.0.color': '…' }
  readonly material: IRMaterialRecipe | null; // only for sys.material.glass.* color tokens
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
  readonly deps: ReadonlyMap<string, TokenDeps>;
  readonly proof: { readonly permutations: number; readonly comparisons: number };
}
export interface Analysis { readonly scopes: ReadonlyMap<ScopeKey, ScopeAnalysis> }

export interface IRBundle {
  readonly model: { readonly name: string | null; readonly modifiers: readonly ModifierInfo[] };
  readonly brands: ReadonlyMap<string, BrandMeta>;
  readonly permutations: ReadonlyMap<PermKey, PermutationIR>;
  readonly analysis: Analysis;
}

export interface Diagnostic {
  readonly code: string;                      // 'source/group-reference', 'completeness/missing', 'css/cascade-mismatch', …
  readonly severity: 'error' | 'warning';     // warnings are reported; only errors fail (there are no warnings in P1 checks)
  readonly message: string;
  readonly hint?: string;                     // the fix, e.g. 'write {sys.color.bg.surface.$root}'
  readonly tokenId?: string; readonly file?: string; readonly line?: number; readonly permutation?: PermKey;
}
```

IR invariants, checked by `ir/bundle.ts` after the loop:

1. Every permutation has the same set of token ids, and each id has the same `type` everywhere.
2. Tier aliasing: `ref` aliases only `ref`; `sys` aliases `ref` or `sys`; `comp` aliases `sys` or `comp`, never `ref`.
3. Public paths are unique; no `sys` category is named `ref` or `comp`.
4. Every value is normalized: a `kind` discriminator exists at every level.

---

## 5. Resolver algorithm

### 5.1 Source model (`source/model.ts`)

1. **Resolver document.** Read `tokens/prism.resolver.json` (JSON Schema validation already runs in CI with ajv). Semantic checks, each a diagnostic:
   - `version === "2025.10"`.
   - `resolutionOrder` is a non-empty array of `{ "$ref": "#/sets/<n>" }` or `{ "$ref": "#/modifiers/<n>" }`; inline items are rejected (`resolver/inline-order`).
   - Every set and every modifier appears exactly once in `resolutionOrder`.
   - A modifier must not reference a modifier (Resolver §4.1.5.1) *(verified: spec)*.
   - Every modifier declares a `default` that is one of its contexts. DTCG makes `default` optional (§4.1.5.3) *(verified: spec)*; Prism requires it because the CSS base blocks and `DSTokenContext.default` depend on it.
   - Context names match `^[a-z][a-z0-9-]*$`, which also rules out integer-like keys that JavaScript reorders.
   - `$extends` is rejected (`resolver/extends-unsupported`); neither Prism's checks nor Terrazzo's orthogonality test handle it.
2. **Sources.** A source is `{ "$ref": "<relative file>" }` resolved from the resolver's directory (`../brands/…` allowed; nothing may leave the repository root), `{ "$ref": "#/sets/<n>" }` inside a set (cycle-checked), or an inline token object (DTCG allows both, §4.1.4 *(verified: spec)*), identified as `inline:<layer>#<i>`. URLs and `file.json#/pointer` fragments are rejected until needed.
3. **Documents.** Each file is read once through `SourceReader` and parsed with `jsonc-parser` `parseTree`, which gives offsets for line and column and exposes duplicate keys (`JSON.parse` silently keeps the last). `$schema` is ignored.
   - Names must not contain `{`, `}` or `.`, and must not start with `$` except the reserved `$root` (Format §5.1.1).
   - Group properties: `$type`, `$description`, `$extensions`, `$deprecated`.
   - For every token: `ownType`, `groupType` (nearest ancestor group `$type` **in the same document**), effective `deprecated`, location.
   - `$extensions["app.prism"]` is validated with Ajv against `schema/app-prism.schema.json`; unknown keys are errors. Material recipe keys (`blur`, `saturate`, `edge`, `grain`, `bloom` on a color) are allowed only on `sys.material.glass.*`.
   - Trees are deep-frozen; merge shares token nodes by reference.
4. **Brands.** Each `brand` context name maps to `brands/<name>/brand.json`.

### 5.2 Enumeration (`resolver.ts`)

- `enumerate(model, filter?)`: Cartesian product over the modifiers in `resolutionOrder` order, contexts in declaration order. The real resolver gives 2 · 3 · 6 · 3 · 2 · 2 = **432**, the same as Terrazzo's `listPermutations()` *(verified)*.
- `permKey(model, input)`: `name=context` pairs joined by `|`, in the same modifier order. The key is the cache and snapshot key.
- `filter: Partial<Record<ModifierName, readonly ContextName[]>>` narrows the product (tests, `--only`, contrast).

### 5.3 Merge (`resolver.ts`)

Walk `resolutionOrder`: a set contributes its sources in order; a modifier contributes the sources of `input[modifier]` in order. `mergeInto(out, doc, layer)`:

- **Token node** (object with `$value`): replaces any earlier node at that id **wholesale**, including `$description` and `$extensions`: "in case of conflict, the last occurrence in the array will be the final value" (Resolver §4.1.4) *(verified: spec)*. Record `provenance.set(id, sourceRef)`.
- **Group node:** merged recursively with copy-on-write (documents are frozen). Group properties are last-wins per key; they have no effect on typing (§5.4).
- **Token versus group at the same path:** error `resolver/shape-conflict`.
- Output: `{ tree, provenance: Map<id, SourceRef> }`. SD deep-clones the tree internally, so sharing nodes is safe.

Aliases are not touched here: DTCG forbids resolving them before the ordering is flattened (§6.3) *(verified: spec)*.

Consequence: `dark-reduced-transparency` replaces `sys.material.glass.dark.fill` together with its `$extensions`, so glass under Reduce Transparency has no blur; the formats emit the neutral recipe. This is the intended meaning.

Other engines differ, which is why Prism merges itself:

- SD's own `source`/`include` merge deep-merges object `$value`s property-wise (`deepExtend` in `lib/utils/combineJSON.js`, observed by the SD-maximal probe).
- Terrazzo's `destructiveMerge` deep-merges every object and overwrites arrays *(verified: `@terrazzo/parser/dist/lib/resolver-utils.js`)*. On today's data the difference does not change any `$value` *(verified: oracle, §15 F23)*, so Terrazzo serves as a test oracle (§14, P1-3).

### 5.4 Typing and extension folding

**Type precedence.** DTCG Format §5.2.2 *(verified: spec)*: a token's own `$type`; else, if its value is a reference, the resolved type of the referenced token; else the `$type` of the closest parent group; else the token is invalid. SD 5.5.3's `typeDtcgDelegate` applies the group type first and never looks at reference targets *(verified: a `{ref.t.body}` alias inside a `$type: number` group came out as `number`; an alias in an untyped group stayed untyped)*. The `prism/dtcg-types` preprocessor (§6) therefore stamps an explicit `$type` on every token before SD's delegate runs (preprocessors run first *(verified)*):

1. own `$type` → keep;
2. whole-value alias → the resolved type of the target, recursively; if the token's own-document `groupType` exists and differs, error `type/alias-group-conflict` (stricter than DTCG, which lets the target win silently; hint: put `$type` on the token);
3. literal → own-document `groupType`;
4. none → error `type/untyped` with file and line (this is S1).

Using the declaring document's group type, never the merged tree's, keeps a `$type: number` group in the density files from leaking onto typography aliases in `sys/base` (S6). In addition, `source/analyze.ts` reports the same group path carrying different `$type`s in two documents (`source/group-type-conflict`, hint: type the tokens instead of the group); today no group has conflicting types *(verified)*.

**Extension folding.** DTCG defines no propagation of `$extensions` through references *(verified: spec)*, and SD does not copy `$extensions` to alias tokens *(verified)*. Prism folds the keys that change what a token renders as into the normalized value; SD then copies the transformed value into every alias, so they flow through alias chains:

| Key | Folded into | Notes |
|-----|-------------|-------|
| `spring` | `IRTransition.spring` | `settle` is not folded; it is derived (§7.6) and checked (§7.13). |
| `slot`, `numeric`, `textStyle` | `IRTypography` | |
| `opsz` | `IRFontFamily` | Native preset `ref.font.display` → `sys.font.display`. |
| `flag` | `IRNumber.flag` | |
| `angle`, `grain`, `scheme`, `bloom` on gradients | `IRGradient` | Needed for `sys.gradient.vivid.*` aliases (S6). |

An alias token with its own copy of a key overrides the inherited value (the normalizer applies own keys over the incoming IR value). Not folded: material recipe keys (read from the declaring `sys.material.glass.*` token only, with neutral defaults, §7.12) and metadata (`a11y`, `figma`, `llm`, `brand`), which stay on their token.

### 5.5 References and IR construction

- `prism/validate` (preprocessor) checks every `{…}` in every `$value`, including composite sub-values, against the merged tree before SD resolves anything. It reports each problem with the referring token id, the file and line from provenance, and a fix: unknown target (`ref/broken`), a group target that contains `$root` (`ref/group-reference`, hint `{x.$root}`), cycles (`ref/cycle`), `$`-prefixed names, `$extends`. SD's own broken-reference throw stays on as a backstop and runs with `verbosity: 'verbose'` so its message names the tokens *(verified: with `silent` or `default` SD prints only a count)*.
- SD resolves references after the merge, including composite sub-values, and `{x.$root}` *(verified)*.
- `engine/to-ir.ts` builds each `IRToken` from the dictionary: `id = path.join('.')`, `type = $type`, `value = $value` (an `IRValue`), `raw = original.$value`, `aliasOf` and `subAliases` parsed from `raw`, `description`, `deprecated` (own or document group, from the model), `metadata` (Ajv-validated), `material` (for `sys.material.glass.*`, from the token's own extensions with defaults), `source` from provenance (under a future SD-native resolver: `token.filePath`).
- **Brand type scale.** After SD, `to-ir.ts` multiplies `fontSize` and `letterSpacing` of every typography value by the permutation's `ref.type.scale` (1 when absent), once per token, rounding to 4 decimals. Doing it inside the transitive normalizer would compound along alias chains.

### 5.6 Source checks (`source/analyze.ts`)

| Check | Rule | Today |
|-------|------|-------|
| Write-set disjointness | `W(M)` = union of ids declared by every source of every context of modifier `M`; `W(M1) ∩ W(M2) = ∅` for `M1 ≠ M2`. Same definition as Terrazzo's `isResolverOrthogonal`. Sets are not modifiers. | passes after S1 *(verified)* |
| Ownership | Every id in `W(M)` matches `config.OWNERSHIP[M]`: brand `ref.**`; platform `sys.font.**`, `sys.material.blur.**`; colorScheme `sys.color.**`, `sys.material.glass.**`, `sys.shadow.**`, `sys.gradient.**`; density `sys.space.**`, `sys.size.**` except `sys.size.hit`, `sys.type.**`; modality `sys.size.hit`, `sys.interaction.**`; motion `sys.motion.**`. | passes |
| Context completeness | Within one modifier, every context declares the same set of ids (the union of its sources). | fails: S3, S4 *(verified)* |
| Brand paths | Every id a brand context declares is declared by the `ref` set. | fails: S8 *(verified)* |
| Dead writes | A declaration in one layer (a set or a modifier) that a later layer overwrites in every permutation is an error naming both files; overwrites among the sources of one context (variant delta files) are intended. This is how S9 surfaces. | passes today (no brand writes `sys.*`; no set definition is always overwritten *(verified)*) |
| Group type conflicts | Same group path, different `$type` in two documents → error. | passes *(verified)* |
| Duplicate keys | Any duplicate JSON key → error with line. | passes |
| `a11y.pairsWith` | Every name resolves with `lookup` (§10). | — |

### 5.7 IR analysis (`ir/analyze.ts`)

Per scope (brand × platform), over the full product of runtime contexts:

1. **Dependency axes.** `axes(t)` = runtime modifiers `M` for which the single-axis variation of `M` from the scope's defaults changes `t`'s resolved value (structural equality of IR values). `increasedContrast` / `reducedTransparency`: base schemes whose variant context differs from the base scheme for `t`.
2. **At most one runtime axis per token.** `|axes(t)| > 1` is an error listing the alias chain, with the hint "split the token or introduce an alias". Today there are none *(verified)*.
3. **Exhaustive composition proof.** For every permutation `p` of the scope and every token: `value(p) == base ⊕ Δ(colorScheme = p.colorScheme) ⊕ Δ(density = p.density) ⊕ Δ(modality = p.modality) ⊕ Δ(motion = p.motion)`, where `Δ` is the single-axis variation. A failure is an interaction that the axis test cannot see (for example an alias re-pointed by one modifier to a token another modifier changes). Today: 432 permutations, 170,856 comparisons, 0 failures *(verified: prototype, under 1 s naive)*.
4. **Variant disjointness.** For each base scheme `s`: `ΔIC(s)` = ids whose value differs between `s` and `s-increased-contrast`, `ΔRT(s)` likewise; `ΔIC(s) ∩ ΔRT(s) = ∅`. This makes "increased contrast and reduced transparency together", which is not a resolver context, well-defined as `s ⊕ ΔIC(s) ⊕ ΔRT(s)` for CSS, Swift and TS. Today: light 20 / 7, dark 18 / 7, overlap 0 *(verified)*.
5. **Platform invariance (Swift).** Tokens may differ between `apple` and `watch` only if they are not colors; a differing color is an error (the catalog has one `watch` entry per colorset, §9.8). Today only `sys.material.blur.enabled` differs *(verified)*.
6. **Brand invariance.** `motion.css` and `tailwind.css` content, and every Swift value except font families (`fontFamily` tokens and typography `fontFamily` sub-values), must be identical across brands. Today the brands differ in 27 tokens, all font families or typography composites *(verified)*. A brand that changes anything else fails with "brand X changes non-font tokens; the committed Swift artifact covers the default brand only" (owner decision O5).
7. **Web text invariant.** A CSS declaration whose *literal text* depends on a runtime axis may depend on only that axis (checked per rendered declaration in `formats/css/model.ts`).

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
- **Strictly sequential runs.** `GroupMessages` is a module singleton (`export default new GroupMessages()`), so concurrent instances in one process would mix messages *(verified)*. Parallelism, if ever needed, uses `worker_threads` with one SD per worker.
- **What Prism does not use:** SD's `include`/`source` merge (property-level merge of object values), `expand`, built-in transforms and formats (on 2025.10 shapes they print `[object Object]` for durations, transitions and gradients, and hex or `rgba()` for colors; observed by the SD-maximal probe), `name/kebab` (it turns `$root` into a `-root` suffix *(verified)*).

Cost: 432 instances with a minimal normalizer take 2.8 s (6.5 ms each), 95 unique colors, 408 MB RSS with every IR retained *(verified: prototype)*; the IR-first probe measured 4.2 s with a fuller normalizer.

---

## 7. Transforms (P1-4)

### 7.1 Contract

- **Normalizer (`ir/normalize.ts`)**: one function per `TokenType`, dispatched by `$type`. Input: raw DTCG value, or an `IRValue`, or a composite whose sub-values are either. Output: `IRValue` with `kind` at every level. Own extension keys (§5.4) are applied over the incoming value, so an alias with its own `spring` overrides the inherited one. Idempotent: `normalize(normalize(x)) ≡ normalize(x)` for every type (property-tested).
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

- Authored `srgb` (every overlay): `rgb(R G B)` or `rgb(R G B / A)` with `R = fmt(r·255, 1)`, `A = fmt(alpha, 3)`, emitted as authored, never pre-composited. Example: dark `sys.color.text.secondary` → `rgb(255 255 255 / 0.64)`; light `sys.material.glass.dark.fill` `[0.0392, 0.0471, 0.0314] / 0.55` → `rgb(10 12 8 / 0.55)`.
- Any other space: base `oklch(L C H[ / A])` with `L`, `C` 4 decimals and `H` 2 decimals; achromatic (`C < 0.00005` or NaN hue) prints `H` as `0`. In sRGB gamut, `L C H` are the authored OKLCH coordinates; out of sRGB, the base is the OKLCH of the sRGB-mapped color and a **P3 twin** carries the authored color (or the P3-mapped color when also out of P3).
- Samples *(verified)*: `ref.color.neutral.100` → `oklch(0.9612 0.0041 271.4)`; `ref.color.neutral.0` → `oklch(1 0 0)`; `ref.color.accent.300` → base `oklch(0.8506 0.1133 68.21)`, twin `oklch(0.8506 0.1133 68.2)`; `ref.color.accent.50` → base `oklch(0.9794 0.0169 76.17)`, twin `oklch(0.9794 0.0169 76.1)`.

**Swift and colorsets (`swiftRGBA`, `colorsetComponents`)**

- Authored `srgb` → sRGB with the authored components (overlays stay exact).
- Authored `display-p3` → as authored.
- Anything else → Display P3, CSS-mapped. Samples *(verified)*: `neutral.600` → P3 (0.3636, 0.3759, 0.4049); `neutral.700` → (0.2539, 0.2662, 0.2953); `neutral.900` → (0.0916, 0.0978, 0.1123); `neutral.950` → (0.0517, 0.0548, 0.0656); `accent.500` → (0.9011, 0.5979, 0.3306).
- Swift literal: `DSRGBA(.displayP3, 0.3636, 0.3759, 0.4049, 1)`; components 4 decimals, alpha 3.
- Colorset: `"color-space" : "display-p3"` or `"srgb"`, components as strings with exactly 4 decimals (`"0.6400"`, `"1.0000"`). One colorset may mix spaces across entries.

**Other targets**: Figma `{ colorSpace: 'srgb', components: srgb (4 decimals), alpha, hex }`; Tokens Studio `#rrggbb`, or `#rrggbbaa` when `alpha < 1` (`aa = round(alpha·255)`); TS `{ css: base, cssP3: twin | null, hex, alpha }`.

### 7.3 Dimension

- IR: `value`, `unit`, `px` (`rem × 16`).
- CSS (`cssDimension`): `fmt(px, 3)px`, except typography `fontSize` → `fmt(px / 16, 4)rem` (ADR-0011 rem scaling on web) and typography `letterSpacing` → `fmt(letterSpacing.px / fontSize.px, 4)em`, so tracking scales with the size it belongs to (`ref.type.display.xl` −1.28 px at 64 px → `-0.02em`). A dimension authored in `rem` elsewhere stays `rem`.
- Swift: `CGFloat` points = px. TS: number (px). Figma: `{ value: px, unit: 'px' }`. Tokens Studio: `"24px"`.

### 7.4 Duration

IR `ms` (`s × 1000`). CSS `fmt(ms, 3)ms`; Swift `TimeInterval` seconds `fmt(ms / 1000, 4)`; TS ms number; Figma `{ value: seconds, unit: 's' }`.

### 7.5 Cubic Bézier

CSS `cubic-bezier(0.23, 1, 0.32, 1)` (4 decimals per number); Swift `DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32, y2: 1)` with `animation(duration:)` → `.timingCurve`; TS `{ points: [0.23, 1, 0.32, 1], css: 'cubic-bezier(0.23, 1, 0.32, 1)' }`. The DTCG schema limits x to [0, 1].

### 7.6 Spring (`transforms/spring.ts`)

**Physics** (Apple's two-parameter spring, mass 1): `stiffness = (2π / duration)²`, `damping = 4π(1 − bounce) / duration`, `dampingRatio = 1 − bounce`. The schema restricts `bounce` to [0, 1); negative bounce needs the other damping formula (`tokens/README.md`, Motion) and is rejected until a token needs it. Values *(verified against SwiftUI `Spring(duration:bounce:)` on the macOS 26 SDK)*: snappy 322.2728 / 30.5183, bouncy 157.9137 / 17.5929, interactive 1754.5963 / 83.7758, reduced snappy 631.6547 / 50.2655.

**Settle.** Closed-form unit step response from rest (underdamped, critical and overdamped branches). `settleMs = floor(1000 · t_last)`, where `t_last = max{ t ≤ 10 s : |1 − x(t)| ≥ 0.001 }`, found by sampling at 0.01 ms until an envelope bound proves the tail, then bisecting to 1 µs. Floor reproduces every committed value; rounding would change four of them (487.68 → 488, 587.81 → 588, 404.58 → 405, 818.74 → 819) *(verified)*.

| Spring | (duration, bounce) | last crossing (ms) | settleMs |
|--------|--------------------|-------------------|----------|
| interactive | (0.15, 0) | 220.43 | 220 |
| snappy | (0.35, 0.15) | 487.68 | 487 |
| smooth | (0.40, 0) | 587.81 | 587 |
| sheet | (0.30, 0.20) | 404.58 | 404 |
| bouncy | (0.50, 0.30) | 818.74 | 818 |
| reduced snappy, sheet | (0.25, 0) | 367.38 | 367 |
| reduced bouncy | (0.30, 0) | 440.86 | 440 |

**Curve.** Motion's physics generator with near-zero rest thresholds:

```ts
import { spring } from 'motion';   // motion 13.2.0 exports spring and generateLinearEasing (verified)
const gen = spring({ keyframes: [0, 1], stiffness, damping, mass: 1, restDelta: 1e-9, restSpeed: 1e-9 });
const samples = range(0, settleMs).map(t => [t, t === settleMs ? 1 : gen.next(t).value]);   // next(t) takes ms
const stops = rdp(samples, 0.002);   // Ramer–Douglas–Peucker, tolerance 0.002 in value units
```

- With Motion's default thresholds the generator snaps to the target near local extrema: bouncy gives `…0.9981, 1, 1, 1, 1, 0.9982…`, a 0.0021 error at 700 ms. With `1e-9` the generator equals the closed form to 2.2e-16 *(verified)*.
- RDP on 1 ms samples gives 20 to 24 stops with a maximum interpolation error of 0.0020 against the closed form; uniform 60 Hz sampling would need up to 50 stops and still err by up to 0.030 on the interactive spring *(verified)*.
- Motion's `toString()` is not used: it ends at Motion's own rest point on a 50 ms grid (snappy `550ms linear(…)`) *(verified)*.

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

- CSS sub-declarations (no `font` shorthand): `-font-family`, `-font-size` (rem), `-font-weight`, `-line-height` (unitless), `-letter-spacing` (em), `-font-variant-numeric` (`tabular-nums` or `normal`). A sub-value that is an alias of an emitted token becomes `var()` (`--ds-ref-type-body-md-font-family: var(--ds-ref-font-ui)`); a whole-value alias makes every sub-declaration `var()` of the target's sub-declaration.
- Swift `DSTypeRole(slot:size:weight:lineHeight:tracking:numeric:textStyle:)`; families come from `DSBrand` by slot (§9.7), so roles stay brand-invariant.
- TS `{ fontFamily: string (CSS stack), fontSize: px, fontWeight, lineHeight, letterSpacing: px, numeric, slot, textStyle }`.
- Tokens Studio: object of strings (`fontFamily`, `fontSize: "15px"`, `fontWeight: "400"`, `lineHeight: "150%"`, `letterSpacing: "0px"`). Figma: five primitives (§9.10).

### 7.8 Shadow

CSS: per layer `[inset ]<offsetX> <offsetY> <blur> <spread> <color>`, layers joined by `, ` (`0px 6px 16px 0px rgb(0 0 0 / 0.07)`). Swift `DSShadowToken(layers: [DSShadowLayer(color: DSRGBA, x:, y:, blur:, spread:, inset:)])` with CSS blur semantics (DSCore converts to a SwiftUI radius). TS array of `{ color: css, x, y, blur, spread, inset }`. Tokens Studio `boxShadow` `{ x, y, blur, spread, color, type: 'dropShadow' | 'innerShadow' }`.

### 7.9 Gradient

CSS `linear-gradient(<angle ?? 180>deg, <color> <position·100>%, …)`; stops that alias emitted colors become `var()`; a literal out-of-sRGB stop adds a P3 twin of the whole declaration. Swift `DSGradientToken(stops: [DSGradientStop(color:location:)], angle:, grain:, scheme:, bloomAlpha:, bloomBlur:)`. TS `{ css, stops, angle, grain, scheme, bloom }`. Tokens Studio: `color` token with the `linear-gradient(…)` string.

### 7.10 Stroke style and border

`strokeStyle` keyword → CSS keyword; object form → `-dasharray: 8px 6px` and `-linecap: round`; Swift `DSStrokeStyle(dash: [8, 6], lineCap: .round)` (keyword form → `keyword:` case). `border` → CSS `<width> <style> <color>`, Swift `DSBorderToken`.

### 7.11 Font family, font weight, number, flags

- `fontFamily` CSS: every family double-quoted except the CSS generic keywords `serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`, `system-ui`, `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`, `math`, `emoji`, `fangsong` (`"Onest", "Inter", system-ui, sans-serif`). Swift `[String]`; TS the CSS stack; Figma the first family; Tokens Studio `fontFamilies` joined with `, `.
- `fontWeight`: numbers; DTCG keywords map to 100 (`thin`, `hairline`), 200 (`extra-light`, `ultra-light`), 300 (`light`), 400 (`normal`, `regular`, `book`), 500 (`medium`), 600 (`semi-bold`, `demi-bold`), 700 (`bold`), 800 (`extra-bold`, `ultra-bold`), 900 (`black`, `heavy`), 950 (`extra-black`, `ultra-black`).
- `number`: CSS plain number (4 decimals); Swift `Double`; TS number.
- `flag: true` numbers: CSS `0` / `1`; Swift `Bool`; TS `boolean`; Figma number with `"$extensions": { "com.figma.type": "boolean" }` *(verified: Figma help)*; Tokens Studio `boolean`.

### 7.12 Alpha overlays and materials

- Overlays (translucent `sys.color.*`) are emitted as authored alpha colors on every target; nothing is pre-composited. Compositing happens only in the contrast tool (§10).
- Material recipe (`sys.material.glass.*`, own extensions only): CSS sub-declarations `-blur` (px), `-saturate`, `-edge-alpha`, `-edge-to`, `-grain`, `-bloom-alpha`, `-bloom-blur` (px). A token gets recipe declarations if any context of the scope declares a recipe for it; contexts without one get the neutral defaults `0px`, `1`, `0`, `0`, `0`, `0`, `0px` (never `initial`, which would invalidate a whole `backdrop-filter` declaration at computed-value time). Swift `DSMaterialToken` with the same defaults (non-optional fields).

### 7.13 `normalize.ts` (source hygiene)

- **Walks** every color object in `tokens/**/*.tokens.json` and `brands/*/brand.tokens.json`, including composite sub-values (shadow layers, gradient stops, border colors), and every token with `app.prism.spring`.
- **Rules**:
  - `hex`: the authored `hex` equals §7.2's computed hex; a missing `hex` is stale too.
  - `spring-fallback`: `$value.duration` equals `settleMs` ms; `app.prism.spring.settle` equals `settleMs / 1000`; `$value.delay` is 0 ms.
- **Modes**: `--check` prints `file:line  pointer  expected → actual` and exits 1; `--write` edits in place with `jsonc-parser` `modify` + `applyEdits`, which touches only the target lines and keeps authored floats such as `0.0` *(verified: on `sys/motion/reduced.tokens.json`, six changed lines)*. Import `jsonc-parser` by package name; its `lib/esm` build uses extensionless imports that Node ESM rejects *(verified)*.
- `tokens:build` runs `--check` first and stops with "run `pnpm tokens:normalize`".

---

## 8. Naming (`ir/naming.ts`)

From the id segments with `$root` dropped:

| Name | Rule | Examples |
|------|------|----------|
| Public path (specs, contrast pairs, TS keys, manifest, diff) | `sys.` dropped; `ref.` and `comp.` kept | `sys.color.bg.surface.$root` → `color.bg.surface`; `comp.button.primary.bg.rest`; `ref.color.neutral.100` |
| CSS custom property | `--ds-` + kebab of the segments; `sys` drops its prefix, `comp` drops `comp` (keeps the component), `ref` keeps `ref-`; camelCase segments become kebab | `--ds-color-bg-surface`, `--ds-button-primary-bg-rest`, `--ds-ref-color-neutral-100` |
| CSS derived declaration | base name + suffix: typography `-font-family`, `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`, `-font-variant-numeric`; transition `-duration`, `-easing`, `-delay`; stroke `-dasharray`, `-linecap`; material `-blur`, `-saturate`, `-edge-alpha`, `-edge-to`, `-grain`, `-bloom-alpha`, `-bloom-blur` | `--ds-ref-type-body-md-font-size` |
| Tailwind theme variable | namespace per category (§9.4) + `ds-` + kebab of the rest | `--background-color-ds-page` → `bg-ds-page` |
| TS key | the public path | `'color.bg.page'`, `'comp.button.radius'` |
| Swift category | first public-path segment through `config.SWIFT_CATEGORIES`: `color` → `DSColor` (static), `material` → `material`, `shadow` → `shadow`, `elevation` → `elevation`, `space` → `space`, `size` → `size`, `radius` → `radius`, `type` → `typography`, `font` → `DSBrand` faces, `motion` → `motion`, `gradient` → `gradient`, `opacity` → `opacity`, `z` → `zIndex`, `icon` → `icon`, `chart` → `chart`, `stroke` → `stroke`, `interaction` → `interaction`; `comp.<c>` → `components.<c>`. An unknown category is a build error. | |
| Swift member | lowerCamel of the remaining segments; a leading digit takes `config.NUMERIC_PREFIX` (`space` → `step`, `elevation` → `level`, otherwise `n`); Swift keywords are backticked | `space.4` → `space.step4`; `color.text.on-accent` → `DSColor.textOnAccent`; `color.chart.series.1` → `DSColor.chartSeries1`; `size.control.$root` → `size.control` |
| Asset (colorset) | CSS name without `--ds-`; reduced-transparency twin adds `-reduced-transparency` | `color-text-secondary`, `material-glass-dark-fill-reduced-transparency` |
| Tokens Studio, Figma | public path segments as nested groups; `$root` → `default` (a sibling named `default` is an error) | `color/bg/surface/default` |

Collisions are checked per target on the final names (for example `sys.chart.*` and `comp.chart.*` both map to `--ds-chart-*`); any collision fails the build naming both ids. Today there are none.

---

## 9. Formats and outputs (P1-5)

### 9.0 Output paths and owned roots

The writer owns five roots: it writes changed files, deletes files it no longer produces, and never touches anything outside them.

| Root | Files |
|------|-------|
| `web/packages/tokens/src/generated/` | `<brand>/tokens.css`, `<brand>/tokens.ts` for every brand context (`prism/`, `prism-native/`); `motion.css`, `tailwind.css`, `manifest.json` (brand-invariant, asserted) |
| `swift/Sources/DSTokens/Generated/` | `DSTokenTypes.swift`, `DSTokenContext.swift`, `DSColor.swift`, `DSBrand.swift`, `DSTokenSet.swift`, `DSTokenSet+<Category>.swift` (replaces `.gitkeep`) |
| `swift/Sources/DSTokens/Resources/Colors.xcassets/` | `Contents.json` and one `<name>.colorset/Contents.json` per color (only the catalog; `Resources/` will also hold fonts) |
| `swift/Tests/DSTokensTests/Generated/` | `GeneratedTokenTests.swift` |
| `tokens/export/` | `README.md`, `tokens-studio/**`, `figma/<brand>/<colorScheme>.json` |

`swift/Sources/DSTokens/DSTokens.swift` (`DSTokensInfo.version`, stamped by the release workflow) stays hand-maintained outside the owned roots. `@iiiivaska/prism-tokens` (P3-2) maps the default brand's files to its root exports.

**Why `tokens/export/`**: no new top-level folder (ADR-0014's layout stays); outside `web/` and `swift/` because the flavors are not runtime artifacts; next to the source they mirror, where Tokens Studio's Git sync and a designer look; file names are `*.json`, never `*.tokens.json`, so the CI schema glob `tokens/**/*.tokens.json` and agents never mistake them for source. The generated `tokens/export/README.md` says so.

### 9.1 Web runtime contract

One table in `config.ts` drives CSS, Tailwind variants, `tokens.ts` and (P3-2) `DSProvider`.

| Axis | Resolver source | Attribute and values | Media fallback (attribute absent) | Scope |
|------|-----------------|----------------------|-----------------------------------|-------|
| colorScheme | base part of `colorScheme` | `data-ds-color-scheme` = `light` \| `dark` | `prefers-color-scheme: dark` | any element |
| contrast | `-increased-contrast` variants | `data-ds-contrast` = `more` \| `standard` | `prefers-contrast: more` | root only |
| transparency | `-reduced-transparency` variants | `data-ds-transparency` = `reduce` \| `standard` | `prefers-reduced-transparency: reduce` (not in Safari; `DSProvider` sets the attribute) | root only |
| density | `density` | `data-ds-density` = `compact` \| `regular` \| `comfortable` | — | any element |
| modality | `modality` | `data-ds-modality` = `pointer` \| `touch` | `pointer: coarse` → touch | root only |
| motion | `motion` (`default`, `reduced`) | `data-ds-motion` = `reduce` \| `standard` | `prefers-reduced-motion: reduce` | root only (`motion.css`) |
| gamut | — | — | `color-gamut: p3` | — |
| brand | `brand` | none: one `tokens.css` per brand | — | build time |
| platform | `platform` | none: web only | — | build time |

Any attribute value disables the media fallback of its axis (the fallback selectors use `:not([attr])`), so `standard` forces the default. This contract replaces the names in ADR-0003 (`[data-ds-brand|scheme|density|input]`) and ADR-0004 (`[data-color-scheme]`, …); §16.3 lists the amendments.

### 9.2 `tokens.css` (`prism/css-variables-modes`), one per brand

**Model** (`formats/css/model.ts`):

```ts
interface CssDecl { name: string; value: string; tokenId: string; twins: readonly { condition: string; value: string }[] }
interface CssRule { comment: string; media: readonly string[] /* ANDed */; selectors: readonly string[]; decls: readonly CssDecl[] }
```

Every token of the web scope renders to one or more declarations (base plus derived). For each declaration the model computes its text in every runtime context: `var(--ds-<target>)` when the token (or composite sub-value) is an alias of a token emitted in `tokens.css` or `motion.css`, else the literal rendering. Membership is decided per declaration:

1. **Invariant** (text and value identical in every context) → `:root`.
2. **Nestable axis `A`** (colorScheme, density) with contexts `c1` (default) … `cn`:
   - text differs between contexts → one block per context, each holding the context's text: default `:root, [data-ds-A="c1"]`; others `[data-ds-A="ck"]`; for colorScheme `dark` also `@media (prefers-color-scheme: dark) { :root:not([data-ds-color-scheme]) }`. The default block comes first, because equal specificity is decided by source order.
   - text identical but value different (typically a `comp` alias of a `sys` token) → the **rescope block** `:root, [data-ds-A]`. A custom property inherits its computed value, so a nested `[data-ds-color-scheme="dark"]` element must redeclare the alias or it keeps the root's light result.
3. **colorScheme variants.** For `v` in (increased contrast, reduced transparency) and base scheme `s`: declarations whose text in `s-v` differs from `s`, in four rule groups (flag attribute `F` = `data-ds-contrast="more"` or `data-ds-transparency="reduce"`, media `M` = `(prefers-contrast: more)` or `(prefers-reduced-transparency: reduce)`):
   ```
   :root[F][data-ds-color-scheme="s"], :root[F] [data-ds-color-scheme="s"]                          { … }
   @media (prefers-color-scheme: s) { :root[F]:not([data-ds-color-scheme]) { … } }
   @media M { :root:not([Fattr])[data-ds-color-scheme="s"], :root:not([Fattr]) [data-ds-color-scheme="s"] { … } }
   @media M and (prefers-color-scheme: s) { :root:not([Fattr]):not([data-ds-color-scheme]) { … } }
   ```
   Specificity (0,2,0) to (0,3,0) beats the scheme blocks (0,1,0)–(0,2,0), and variant blocks come later. The descendant form keys on the element's own scheme attribute, so it is right at any nesting depth. Contrast and transparency deltas are disjoint (§5.7), so both may apply.
4. **Root-only axis** (modality): the default context's text in a `:root` block; declarations whose text differs in `touch` in `:root[data-ds-modality="touch"]` and `@media (pointer: coarse) { :root:not([data-ds-modality]) }`. Text-identical aliases need nothing more: they are declared on the root, where the change happens.
5. **Twins.** After any block containing a declaration with twins: `@media (color-gamut: p3)` and/or `@supports not (transition-timing-function: linear(0, 1))`, same selectors, same names, twin values; a block already inside `@media` gets the conditions joined with `and`. A later block that redeclares the property still wins (same or higher specificity, later in source).
6. Scheme blocks also set `color-scheme: light` or `color-scheme: dark`.
7. Everything sits inside `@layer ds.tokens { … }` (ADR-0003 `@layer ds.*`); unlayered consumer overrides of `--ds-*` win automatically.

Tokens of types `duration`, `cubicBezier` and `transition`, and every token under `ref.motion` or `sys.motion`, go to `motion.css`; the build asserts that no motion-dependent literal text is left in `tokens.css`.

**Sample** (brand `prism`, real values, lists shortened):

```css
/* Generated by tools/tokens from tokens/prism.resolver.json (brand "prism", platform "web"). Do not edit; run `pnpm tokens:build`. */
@layer ds.tokens {
  /* invariant */
  :root {
    --ds-ref-color-accent-50: oklch(0.9794 0.0169 76.17);
    --ds-ref-color-accent-300: oklch(0.8506 0.1133 68.21);
    --ds-ref-color-neutral-0: oklch(1 0 0);
    --ds-ref-color-neutral-100: oklch(0.9612 0.0041 271.4);
    --ds-ref-color-neutral-600: oklch(0.4883 0.0137 264.4);
    --ds-ref-color-neutral-700: oklch(0.386 0.0146 264.4);
    --ds-ref-color-neutral-900: oklch(0.213 0.0085 264.4);
    --ds-ref-color-neutral-950: oklch(0.164 0.0065 271);
    --ds-ref-font-ui: "Onest", "Inter", system-ui, sans-serif;
    --ds-ref-shadow-dark-floating: 0px 8px 24px 0px rgb(0 0 0 / 0.3);
    --ds-ref-shadow-light-floating: 0px 6px 16px 0px rgb(0 0 0 / 0.07);
    --ds-ref-space-4: 12px;
    --ds-ref-type-body-md-font-family: var(--ds-ref-font-ui);
    --ds-ref-type-body-md-font-size: 0.9375rem;
    --ds-ref-type-body-md-font-variant-numeric: normal;
    --ds-ref-type-body-md-font-weight: 400;
    --ds-ref-type-body-md-letter-spacing: 0em;
    --ds-ref-type-body-md-line-height: 1.5;
    --ds-color-text-on-accent: var(--ds-ref-color-neutral-950);
    --ds-space-4: var(--ds-ref-space-4);
    --ds-button-height-md: var(--ds-size-control-md);
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
    --ds-color-bg-page: var(--ds-ref-color-neutral-100);
    --ds-color-bg-surface: var(--ds-ref-color-neutral-0);
    --ds-color-bg-surface-raised: rgb(255 255 255 / 0.7);
    --ds-color-text-secondary: var(--ds-ref-color-neutral-600);
    --ds-material-glass-dark-fill: rgb(10 12 8 / 0.55);
    --ds-material-glass-dark-fill-blur: 40px;
    --ds-material-glass-dark-fill-edge-alpha: 0.22;
    --ds-material-glass-dark-fill-edge-to: 0.08;
    --ds-material-glass-dark-fill-grain: 0.04;
    --ds-material-glass-dark-fill-saturate: 0.8;
    --ds-shadow-floating: var(--ds-ref-shadow-light-floating);
  }
  /* colorScheme: dark */
  [data-ds-color-scheme="dark"] {
    color-scheme: dark;
    --ds-color-bg-page: var(--ds-ref-color-neutral-950);
    --ds-color-bg-surface: rgb(255 255 255 / 0.06);
    --ds-color-bg-surface-raised: rgb(255 255 255 / 0.09);
    --ds-color-text-secondary: rgb(255 255 255 / 0.64);
    --ds-material-glass-dark-fill: rgb(16 20 16 / 0.6);
    --ds-material-glass-dark-fill-blur: 32px;
    --ds-material-glass-dark-fill-edge-alpha: 0.15;
    --ds-material-glass-dark-fill-edge-to: 0;
    --ds-material-glass-dark-fill-grain: 0;
    --ds-material-glass-dark-fill-saturate: 1.2;
    --ds-shadow-floating: var(--ds-ref-shadow-dark-floating);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-ds-color-scheme]) {
      color-scheme: dark;
      /* the same declarations as the dark block */
    }
  }
  /* colorScheme rescope: same text in every context, value depends on the scheme */
  :root,
  [data-ds-color-scheme] {
    --ds-button-primary-bg-rest: var(--ds-color-bg-fill-inverse);
    --ds-card-solid-bg: var(--ds-color-bg-surface);
    --ds-text-secondary: var(--ds-color-text-secondary);
  }
  /* colorScheme variant: light-increased-contrast (delta over light) */
  :root[data-ds-contrast="more"][data-ds-color-scheme="light"],
  :root[data-ds-contrast="more"] [data-ds-color-scheme="light"] {
    --ds-color-border-hairline: rgb(14 15 18 / 0.3);
    --ds-color-text-accent: var(--ds-ref-color-accent-900);
    --ds-color-text-secondary: var(--ds-ref-color-neutral-700);
  }
  @media (prefers-color-scheme: light) {
    :root[data-ds-contrast="more"]:not([data-ds-color-scheme]) { /* same delta */ }
  }
  @media (prefers-contrast: more) {
    :root:not([data-ds-contrast])[data-ds-color-scheme="light"],
    :root:not([data-ds-contrast]) [data-ds-color-scheme="light"] { /* same delta */ }
  }
  @media (prefers-contrast: more) and (prefers-color-scheme: light) {
    :root:not([data-ds-contrast]):not([data-ds-color-scheme]) { /* same delta */ }
  }
  /* colorScheme variant: dark-increased-contrast (delta over dark) — same four groups */
  :root[data-ds-contrast="more"][data-ds-color-scheme="dark"],
  :root[data-ds-contrast="more"] [data-ds-color-scheme="dark"] {
    --ds-color-border-hairline: rgb(255 255 255 / 0.25);
    --ds-color-text-secondary: rgb(255 255 255 / 0.8);
  }
  /* … */
  /* colorScheme variant: dark-reduced-transparency (delta over dark) — same four groups with data-ds-transparency="reduce" */
  :root[data-ds-transparency="reduce"][data-ds-color-scheme="dark"],
  :root[data-ds-transparency="reduce"] [data-ds-color-scheme="dark"] {
    --ds-material-glass-dark-fill: rgb(28 28 31 / 0.92);
    --ds-material-glass-dark-fill-blur: 0px;
    --ds-material-glass-dark-fill-edge-alpha: 0;
    --ds-material-glass-dark-fill-saturate: 1;
  }
  /* … light-reduced-transparency: --ds-material-glass-dark-fill: var(--ds-ref-color-neutral-900); recipe defaults … */
  /* density: regular (default) */
  :root,
  [data-ds-density="regular"] {
    --ds-size-control: 40px;
    --ds-size-row: 44px;
    --ds-space-card-gap: 12px;
    --ds-space-card-padding: 24px;
    --ds-type-body-line-height: 1.5;
  }
  [data-ds-density="compact"] {
    --ds-size-control: 32px;
    --ds-size-row: 32px;
    --ds-space-card-gap: 8px;
    --ds-space-card-padding: 16px;
    --ds-type-body-line-height: 1.4;
  }
  [data-ds-density="comfortable"] {
    --ds-size-control: 48px;
    --ds-size-row: 52px;
    --ds-space-card-gap: 12px;
    --ds-space-card-padding: 24px;
    --ds-type-body-line-height: 1.55;
  }
  /* density rescope */
  :root,
  [data-ds-density] {
    --ds-card-gap: var(--ds-space-card-gap);
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
  @media (pointer: coarse) {
    :root:not([data-ds-modality]) { /* same as touch */ }
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
    :root:not([data-ds-motion]) { /* same as reduced */ }
  }
  @media (prefers-reduced-motion: reduce) {
    @supports not (transition-timing-function: linear(0, 1)) {
      :root:not([data-ds-motion]) { --ds-motion-spring-snappy-easing: cubic-bezier(0.23, 1, 0.32, 1); }
    }
  }
}
```

(Values assume S3 and S5 are fixed: reduced snappy is (0.25, 0), 367 ms.)

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
| `sys.space.<r>`, `sys.size.<r>` | `--spacing-ds-<r>` | `p-ds-card-padding`, `gap-ds-4`, `h-ds-control`, `size-ds-icon-md` |
| `sys.radius.<r>` | `--radius-ds-<r>` | `rounded-ds-card` |
| `sys.shadow.<r>`, `sys.elevation.<n>` | `--shadow-ds-<r>`, `--shadow-ds-elevation-<n>` | `shadow-ds-floating` |
| `sys.font.<slot>` | `--font-ds-<slot>` | `font-ds-ui` |
| `sys.type.<role>` | `--text-ds-<role>` with `--line-height`, `--letter-spacing`, `--font-weight` sub-keys | `text-ds-body-md` |
| `sys.motion.easing.<n>`, `sys.motion.spring.<n>` | `--ease-ds-<n>`, `--ease-ds-spring-<n>` (the `-easing` sub-declaration) | `ease-ds-out`, `ease-ds-spring-snappy` |
| `sys.motion.duration.<n>`, `sys.motion.spring.<n>` | `--transition-duration-ds-<n>`, `--transition-duration-ds-spring-<n>` | `duration-ds-base` |
| `sys.opacity.<r>` | `--opacity-ds-<r>` | `opacity-ds-disabled` |
| `sys.z.<r>` | `--z-index-ds-<r>` | `z-ds-overlay` |

**Collision check.** `config.ts` copies Tailwind 4.3.3's lookup order for every family Prism feeds (`bg`, `text`, `border`, `outline`, `divide`, `ring`, `fill`, `stroke`, the spacing families, `rounded`, `shadow`, `font`, `ease`, `duration`, `opacity`, `z`). Two Prism theme variables that can produce the same utility name fail the build, even when Tailwind would pick one silently: with both `--text-color-ds-x` and `--text-ds-x`, Tailwind emits only the color *(verified)*; with both `--text-color-ds-accent` and `--color-ds-accent`, `text-ds-accent` takes the first *(verified)*. That is why `sys.color.accent.*` avoids the generic `--color` namespace.

**Variants**: only root-level preferences, each with an attribute form and a media form: `ds-touch`, `ds-pointer`, `ds-contrast-more`, `ds-reduce-transparency`, `ds-reduce-motion`. There is no `dark` override and no density variant: the nearest-ancestor scheme or density cannot be expressed in a selector, and tokens switch by themselves.

```css
/* Generated by tools/tokens. Import after "tailwindcss", then one Prism <brand>/tokens.css and motion.css. Do not edit. */
@custom-variant ds-touch {
  &:where(:root[data-ds-modality="touch"], :root[data-ds-modality="touch"] *) { @slot; }
  @media (pointer: coarse) {
    &:where(:root:not([data-ds-modality]), :root:not([data-ds-modality]) *) { @slot; }
  }
}
@custom-variant ds-contrast-more {
  &:where(:root[data-ds-contrast="more"], :root[data-ds-contrast="more"] *) { @slot; }
  @media (prefers-contrast: more) {
    &:where(:root:not([data-ds-contrast]), :root:not([data-ds-contrast]) *) { @slot; }
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
  --shadow-ds-floating: var(--ds-shadow-floating);
  --spacing-ds-card-padding: var(--ds-space-card-padding);
  --spacing-ds-control: var(--ds-size-control);
  --text-color-ds-primary: var(--ds-color-text-primary);
  --text-ds-body-md: var(--ds-type-body-md-font-size);
  --text-ds-body-md--font-weight: var(--ds-type-body-md-font-weight);
  --text-ds-body-md--letter-spacing: var(--ds-type-body-md-letter-spacing);
  --text-ds-body-md--line-height: var(--ds-type-body-md-line-height);
  --transition-duration-ds-base: var(--ds-motion-duration-base);
  --z-index-ds-overlay: var(--ds-z-overlay);
}
```

Compiled with `@tailwindcss/node` 4.3.3 *(verified)*: `bg-ds-page` → `background-color: var(--ds-color-bg-page)`; `text-ds-primary` → `color: var(--ds-color-text-primary)`; `bg-ds-primary` is not generated (no leak); `text-ds-body-md` sets font size, line height, letter spacing and weight; `h-ds-control`, `size-ds-control`, `duration-ds-base`, `z-ds-overlay`, `opacity-ds-disabled`, `fill-ds-icon-secondary`, `stroke-ds-chart-series-1`, `shadow-ds-floating`, `ease-ds-spring-snappy` resolve to their `var()`; the block-form `@custom-variant` compiles. The per-utility namespaces are not in Tailwind's documented namespace table, so the compile test (§14) guards them.

### 9.5 `tokens.ts` (`prism/ts-tokens`), one per brand

For canvas and SVG code (visx charts) that cannot read CSS variables. Keys are public paths of `sys.*` and `comp.*` tokens; `ref.*` is not exported. Units: px for dimensions, ms for durations. The table mirrors the CSS model: invariant values, one runtime axis per token, and colorScheme as base schemes plus disjoint variant deltas. The generated file must type-check under the web package's strict settings (`noUncheckedIndexedAccess` included).

```ts
// Generated by tools/tokens from tokens/prism.resolver.json (brand "prism"). Do not edit; run `pnpm tokens:build`.
export type ColorScheme = 'light' | 'dark';
export type Contrast = 'standard' | 'more';
export type Transparency = 'standard' | 'reduce';
export type Density = 'compact' | 'regular' | 'comfortable';
export type Modality = 'pointer' | 'touch';
export type Motion = 'standard' | 'reduce';
export interface TokenContext {
  readonly colorScheme: ColorScheme; readonly contrast: Contrast; readonly transparency: Transparency;
  readonly density: Density; readonly modality: Modality; readonly motion: Motion;
}
export const defaultContext: TokenContext = { colorScheme: 'light', contrast: 'standard', transparency: 'standard', density: 'regular', modality: 'pointer', motion: 'standard' };

export interface ColorValue { readonly css: string; readonly cssP3: string | null; readonly hex: string; readonly alpha: number }
export interface SpringValue {
  readonly duration: number; readonly bounce: number; readonly blendDuration: number;   // Apple parameters (s)
  readonly mass: 1; readonly stiffness: number; readonly damping: number;             // for Motion physics springs
  readonly settleMs: number; readonly easing: string; readonly fallback: string; readonly css: string;
}
export interface TypeRoleValue {
  readonly fontFamily: string; readonly fontSize: number; readonly fontWeight: number; readonly lineHeight: number;
  readonly letterSpacing: number; readonly numeric: 'proportional' | 'tabular'; readonly slot: 'ui' | 'display' | 'mono' | null;
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
    $values: { compact: 16, regular: 24, comfortable: 24 } },
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

Brand-invariant name map for agents, `tools/spec` (P2-1) and `tools/parity` (P2-3). No values and no tool versions (the lockfile records versions).

```json
{
  "$generated": "tools/tokens from tokens/prism.resolver.json; do not edit",
  "modifiers": [
    { "name": "colorScheme", "contexts": ["light", "dark", "light-increased-contrast", "dark-increased-contrast", "light-reduced-transparency", "dark-reduced-transparency"], "default": "light",
      "web": { "attribute": "data-ds-color-scheme", "nestable": true } }
  ],
  "tokens": [
    { "path": "color.text.secondary", "id": "sys.color.text.secondary", "tier": "sys", "type": "color", "dependsOn": ["colorScheme"],
      "css": "--ds-color-text-secondary", "tailwind": ["text-ds-secondary"], "ts": "color.text.secondary",
      "swift": "DSColor.textSecondary", "asset": "color-text-secondary", "description": null, "deprecated": null }
  ]
}
```

### 9.7 Swift API (`swift/Sources/DSTokens/Generated/`)

DSTokens stays nonisolated value code in Swift 6 mode (`Package.swift` `valueSettings`); every type is `Hashable & Sendable`; it imports only SwiftUI. Values are the default brand's; font faces cover every repo brand; `apple` versus `watch` differences use `#if os(watchOS)`.

#### 9.7.1 Context (`DSTokenContext.swift`)

```swift
// Generated by tools/tokens from tokens/prism.resolver.json (brand "prism"). Do not edit; run `pnpm tokens:build`.
public enum DSColorScheme: String, CaseIterable, Hashable, Sendable { case light, dark }
public enum DSContrast: String, CaseIterable, Hashable, Sendable { case standard, increased }
public enum DSTransparency: String, CaseIterable, Hashable, Sendable { case standard, reduced }
public enum DSDensity: String, CaseIterable, Hashable, Sendable { case compact, regular, comfortable }
public enum DSModality: String, CaseIterable, Hashable, Sendable { case pointer, touch }
public enum DSMotionMode: String, CaseIterable, Hashable, Sendable { case standard, reduced }   // resolver "default" → .standard

public struct DSTokenContext: Hashable, Sendable {
    public var colorScheme: DSColorScheme
    public var contrast: DSContrast
    public var transparency: DSTransparency
    public var density: DSDensity
    public var modality: DSModality
    public var motion: DSMotionMode
    public init(colorScheme: DSColorScheme = .light, contrast: DSContrast = .standard, transparency: DSTransparency = .standard,
                density: DSDensity = .regular, modality: DSModality = .pointer, motion: DSMotionMode = .standard) {
        self.colorScheme = colorScheme; self.contrast = contrast; self.transparency = transparency
        self.density = density; self.modality = modality; self.motion = motion
    }
    public static let `default` = DSTokenContext()
}
```

Mapping to resolver inputs (`formats/swift/context.ts`): `(s, .standard, .standard)` → `s`; `(s, .increased, .standard)` → `s-increased-contrast`; `(s, .standard, .reduced)` → `s-reduced-transparency`; `(s, .increased, .reduced)` → `s ⊕ ΔIC(s) ⊕ ΔRT(s)` (§5.7). 96 contexts in total; DSCore (P3-1) builds the context from `colorScheme`, `colorSchemeContrast`, `accessibilityReduceTransparency`, `accessibilityReduceMotion` and its own `dsDensity` / `dsModality`, and caches one `DSTokenSet` per context.

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
    public let stops: [DSGradientStop]; public let angle: Double; public let grain: Double
    public let scheme: DSColorScheme?; public let bloomAlpha: Double; public let bloomBlur: CGFloat
}
public enum DSFontSlot: String, CaseIterable, Hashable, Sendable { case ui, display, mono }
public enum DSNumericSpacing: String, Hashable, Sendable { case proportional, tabular }
public enum DSTextStyle: String, CaseIterable, Hashable, Sendable {   // mirrors Font.TextStyle so Sendable does not depend on the SDK
    case largeTitle, title, title2, title3, headline, body, callout, subheadline, footnote, caption, caption2
}
public struct DSTypeRole: Hashable, Sendable {
    public let slot: DSFontSlot; public let size: CGFloat; public let weight: Int; public let lineHeight: Double
    public let tracking: CGFloat; public let numeric: DSNumericSpacing; public let textStyle: DSTextStyle
}
public struct DSMaterialEdge: Hashable, Sendable { public let alpha: Double; public let to: Double }
public struct DSMaterialToken: Hashable, Sendable {   // neutral defaults when a context declares no recipe (§7.12)
    public let fill: Color; public let blur: CGFloat; public let saturate: Double
    public let edge: DSMaterialEdge; public let grain: Double; public let bloomAlpha: Double; public let bloomBlur: CGFloat
}
public enum DSLineCap: String, Hashable, Sendable { case round, butt, square }
public struct DSStrokeStyle: Hashable, Sendable { public let dash: [CGFloat]; public let lineCap: DSLineCap? }
public enum DSFontPreset: String, Hashable, Sendable { case signature, native }
public struct DSFontFace: Hashable, Sendable {
    public let families: [String]; public let file: String?; public let postScriptNames: [Int: String]; public let opticalSize: Double?
}
package enum DSTokensBundle { package static var bundle: Bundle { .module } }   // for DSTokensTests catalog checks
```

#### 9.7.3 Colors (`DSColor.swift`)

Scheme and contrast are resolved by the OS from the catalog, so color accessors are context-free statics. Reduced transparency cannot be expressed in a catalog; it switches colorsets (§9.8), which today affects only material fills.

```swift
import SwiftUI
public enum DSColorToken: String, CaseIterable, Hashable, Sendable {
    case bgPage = "color-bg-page"
    case textSecondary = "color-text-secondary"
    case materialGlassDarkFill = "material-glass-dark-fill"
    case materialGlassDarkFillReducedTransparency = "material-glass-dark-fill-reduced-transparency"
    // … one case per colorset, canonical order
    public var color: Color { Color(rawValue, bundle: .module) }
    /// Literal values behind each catalog entry (tests, contrast math, drawing outside SwiftUI).
    public var appearances: DSColorAppearances {
        switch self {
        case .textSecondary:
            DSColorAppearances(any: DSRGBA(.displayP3, 0.3636, 0.3759, 0.4049, 1), dark: DSRGBA(.sRGB, 1, 1, 1, 0.64),
                               highContrast: DSRGBA(.displayP3, 0.2539, 0.2662, 0.2953, 1), darkHighContrast: DSRGBA(.sRGB, 1, 1, 1, 0.8),
                               watch: DSRGBA(.sRGB, 1, 1, 1, 0.64))
        // …
        }
    }
}
public struct DSColorAppearances: Hashable, Sendable { public let any: DSRGBA; public let dark: DSRGBA; public let highContrast: DSRGBA; public let darkHighContrast: DSRGBA; public let watch: DSRGBA }
public enum DSColor {
    /// color.text.secondary
    public static let textSecondary: Color = DSColorToken.textSecondary.color
    public static let bgPage: Color = DSColorToken.bgPage.color
    public static let bgSurface: Color = DSColorToken.bgSurface.color          // sys.color.bg.surface.$root
    // … one static per sys.color.* token (bgFillInverse, textOnAccent, chartSeries1, …)
}
```

A `sys.color.*` token whose value changes under reduced transparency would become `public static func name(_ transparency: DSTransparency) -> Color`; P1-7 classifies that shape change as major.

#### 9.7.4 Token set (`DSTokenSet.swift`, `DSTokenSet+<Category>.swift`)

Rules: a member with no runtime dependency is a constant; a member with one axis is set by a `switch` on that axis; colorScheme-dependent members switch on the fields they need (`colorScheme`, plus `contrast` / `transparency` only where a variant delta touches them). A `comp` member that is a constant whole-value alias is initialized from its target's accessor for the same context, so components get no duplicate colorsets.

```swift
import SwiftUI
public struct DSTokenSet: Hashable, Sendable {
    public let context: DSTokenContext
    public let space: Space, size: Size, radius: Radius, typography: Typography, motion: Motion, material: Material
    public let shadow: Shadow, opacity: Opacity, zIndex: ZIndex, icon: Icon, chart: Chart, stroke: Stroke, interaction: Interaction
    public let components: Components
    // elevation and gradient appear once S6 adds sys.elevation.* and sys.gradient.*
    public init(_ context: DSTokenContext = .default) {
        self.context = context
        space = Space(context); size = Size(context); radius = Radius(context); typography = Typography(context)
        motion = Motion(context); material = Material(context); shadow = Shadow(context); opacity = Opacity(context)
        zIndex = ZIndex(context); icon = Icon(context); chart = Chart(context); stroke = Stroke(context); interaction = Interaction(context)
        components = Components(context, motion: motion, material: material, shadow: shadow)
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
        public let control: CGFloat                    // sys.size.control.$root (density)
        public let controlSm: CGFloat, controlMd: CGFloat, controlLg: CGFloat, row: CGFloat
        public let hit: CGFloat                        // sys.size.hit (modality)
        init(_ c: DSTokenContext) {
            controlSm = 32; controlMd = 40; controlLg = 44
            switch c.density { case .compact: control = 32; row = 32; case .regular: control = 40; row = 44; case .comfortable: control = 48; row = 52 }
            switch c.modality { case .pointer: hit = 28; case .touch: hit = 44 }
        }
    }
    public struct Motion: Hashable, Sendable {
        public let durationBase: TimeInterval /* … */
        public let springSnappy: DSSpringToken /* springInteractive, springSmooth, springSheet, springBouncy */
        public let presentationCrossfade: Bool          // flag (S10)
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
    public struct Material: Hashable, Sendable {
        public let blurEnabled: Bool                    // sys.material.blur.enabled (platform)
        public let glassDarkFill: DSMaterialToken /* glassDarkChip, glassLightFill, glassLightChip, glassCell, glassScrim */
        init(_ c: DSTokenContext) {
            #if os(watchOS)
            blurEnabled = false
            #else
            blurEnabled = true
            #endif
            switch (c.colorScheme, c.transparency) {
            case (.light, .standard):
                glassDarkFill = DSMaterialToken(fill: DSColorToken.materialGlassDarkFill.color, blur: 40, saturate: 0.8,
                                                edge: DSMaterialEdge(alpha: 0.22, to: 0.08), grain: 0.04, bloomAlpha: 0, bloomBlur: 0)
            case (.dark, .standard):
                glassDarkFill = DSMaterialToken(fill: DSColorToken.materialGlassDarkFill.color, blur: 32, saturate: 1.2,
                                                edge: DSMaterialEdge(alpha: 0.15, to: 0), grain: 0, bloomAlpha: 0, bloomBlur: 0)
            case (_, .reduced):
                glassDarkFill = DSMaterialToken(fill: DSColorToken.materialGlassDarkFillReducedTransparency.color, blur: 0, saturate: 1,
                                                edge: DSMaterialEdge(alpha: 0, to: 0), grain: 0, bloomAlpha: 0, bloomBlur: 0)
            }
        }
    }
    public struct Shadow: Hashable, Sendable {
        public let floating: DSShadowToken /* raised, overlay, drawer, flat */
        init(_ c: DSTokenContext) {
            switch c.colorScheme {
            case .light: floating = DSShadowToken(layers: [DSShadowLayer(color: DSRGBA(.sRGB, 0, 0, 0, 0.07), x: 0, y: 6, blur: 16, spread: 0, inset: false)])
            case .dark:  floating = DSShadowToken(layers: [DSShadowLayer(color: DSRGBA(.sRGB, 0, 0, 0, 0.3), x: 0, y: 8, blur: 24, spread: 0, inset: false)])
            }
        }
    }
    public struct Typography: Hashable, Sendable {      // roles appear once S6 adds sys.type.<role>
        public let bodyMd: DSTypeRole /* displayXl, …, metricXl, data */
        public let bodyLineHeight: Double               // sys.type.body-line-height (density)
        init(_ c: DSTokenContext) {
            bodyMd = DSTypeRole(slot: .ui, size: 15, weight: 400, lineHeight: 1.5, tracking: 0, numeric: .proportional, textStyle: .body)
            switch c.density { case .compact: bodyLineHeight = 1.4; case .regular: bodyLineHeight = 1.5; case .comfortable: bodyLineHeight = 1.55 }
        }
    }
    public struct Components: Hashable, Sendable {
        public let button: Button, card: Card, chart: Chart, surface: Surface, text: Text
        public struct Button: Hashable, Sendable {
            /// Solid inverse pill is the only fill.
            public let primaryBgRest: Color              // → DSColor.bgFillInverse
            public let radius: CGFloat, heightMd: CGFloat, paddingXMd: CGFloat, gap: CGFloat
            public let motionPress: DSSpringToken        // → motion.springSnappy (motion-dependent)
        }
        public struct Card: Hashable, Sendable {
            public let solidBg: Color                    // → DSColor.bgSurface
            public let glassFill: Color                  // → material.glassDarkFill.fill (transparency-dependent)
            public let padding: CGFloat                  // → space.cardPadding (density)
            /* … */
        }
        // Chart, Surface, Text …
        init(_ c: DSTokenContext, motion: Motion, material: Material, shadow: Shadow) { /* generated */ }
    }
}
```

`DSTokenSet` has a `Chart` struct for the category (`sys.chart.*` numbers) and another under `Components` (`comp.chart.*` colors); nesting keeps them apart. `$description` becomes a `///` comment, `$deprecated` becomes `@available(*, deprecated, message: "…")`.

#### 9.7.5 Brands (`DSBrand.swift`)

```swift
// From brands/<name>/brand.json and each brand's resolved sys.font.* (default permutation of that brand).
public enum DSBrand: String, CaseIterable, Hashable, Sendable {
    case prism = "prism", prismNative = "prism-native"
    public static let `default`: DSBrand = .prism
    public var preset: DSFontPreset { switch self { case .prism: .signature; case .prismNative: .native } }
    public var faces: [DSFontSlot: DSFontFace] {
        switch self {
        case .prism: [
            .ui: DSFontFace(families: ["Onest", "Inter", "system-ui", "sans-serif"], file: "fonts/Onest[wght].ttf",
                            postScriptNames: [100: "Onest-Thin", 400: "Onest-Regular" /* … */], opticalSize: nil),
            /* .display, .mono */ ]
        case .prismNative: [
            .display: DSFontFace(families: ["SF Pro Display", "Inter", "system-ui", "sans-serif"], file: nil, postScriptNames: [:], opticalSize: 32),
            /* .ui, .mono */ ]
        }
    }
}
```

Font construction, Bold Text and thin-weight rules stay in DSCore (ADR-0008). A brand that changes anything but font families fails the build (§5.7, owner decision O5).

#### 9.7.6 Tests

- `swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift` (owned): one `#expect` per non-color member and context variation, generated **directly from the IR**, not from the table model, so a renderer bug in `DSTokenSet+*.swift` fails in Swift: `#expect(DSTokenSet(DSTokenContext(density: .compact)).space.cardPadding == 16)`.
- `swift/Tests/DSTokensTests/SpringParityTests.swift` (hand-written, P1-5): for every `DSSpringToken`, `stiffness` and `damping` equal `Spring(duration:bounce:)` within 1 %, and the settle found by sampling `Spring.value(target: 1, initialVelocity: 0, time:)` at 0.1 ms steps equals `settle` within 10 ms. It never reads `Spring.settlingDuration` (0.635 s for snappy against the 0.487 s settle) *(verified)*.
- `swift/Tests/DSTokensTests/ColorCatalogTests.swift` (hand-written, P1-5): skips unless `DSTokensBundle.bundle` contains `Assets.car` (`swift test` copies the catalog uncompiled *(verified)*). Under `xcodebuild test`: on iOS, for every `DSColorToken`, `UIColor(named:in:compatibleWith:)` **followed by `resolvedColor(with:)`** under light, dark, light + high contrast and dark + high contrast trait collections equals `appearances` within 0.002 (without `resolvedColor(with:)` the dynamic color reports the Any value) *(verified on the iOS 26.5 simulator)*; on watchOS, `Color(name, bundle:).resolve(in: EnvironmentValues())` equals `appearances.watch` *(verified on the watchOS 26.5 simulator)*.

### 9.8 `Colors.xcassets` (`prism/swift-xcassets`)

- One colorset per `sys.color.*` token and per `sys.material.glass.*` color token; a `comp` color gets its own colorset only if it is not a constant alias (none today); `ref` colors get none.
- A token in `ΔRT(light) ∪ ΔRT(dark)` also gets `<name>-reduced-transparency`, holding the reduced-transparency values (its high-contrast entries repeat them, since the deltas are disjoint).
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

`color-text-secondary.colorset/Contents.json` (real values; shown compacted, the serializer expands every object onto its own lines):

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
  color-bg-page.colorset/Contents.json
  color-text-secondary.colorset/Contents.json
  …
  material-glass-dark-fill.colorset/Contents.json
  material-glass-dark-fill-reduced-transparency.colorset/Contents.json      (Any = light-RT: P3 0.0916 0.0978 0.1123; Dark = sRGB 0.1098 0.1098 0.1216 / 0.92; …)
```

`scripts/verify-xcassets.sh` (apple CI job) compiles the catalog with `xcrun actool --platform iphoneos|macosx|watchos --minimum-deployment-target 26.0 --warnings --errors`, fails on any warning, and checks `assetutil --info` for the four iOS appearances and a single `watch` entry on watchOS for `color-text-secondary`.

### 9.9 Tokens Studio flavor (`tokens/export/tokens-studio/`, from the `SourceModel`)

- **Sets** mirror the resolver's source documents one to one, aliases kept: `ref/color.palette.json`, `sys/base.json`, `sys/color/dark.json`, `comp/button.json`, `brands/prism.json`, `brands/prism-native.json` (set name = path under `tokens/` without `.tokens.json`; brand files `brands/<name>`).
- **Names**: `$root` becomes `default` (asserted free) and alias strings are rewritten to match.
- **Values** (Tokens Studio's DTCG flavor, string-based): color `#rrggbb` or `#rrggbbaa`; `space.*` → `spacing`, `size.*` → `sizing`, `radius.*` → `borderRadius`, other dimensions → `dimension`, all as `"24px"`; `opacity.*` numbers → `opacity`; flags → `boolean`; other numbers → `number`; `fontFamily` → `fontFamilies` (joined); `fontWeight` → `fontWeights`; typography → object of strings; shadow → `boxShadow`; gradient → `color` with a `linear-gradient(…)` string. Duration, cubicBezier, transition and object-form strokeStyle are omitted and listed in `tokens/export/README.md`; Tokens Studio has no such types *(verified: `TokenTypes` in @tokens-studio/types 0.5.2)*.
- **`$themes.json`**: grouped themes, one per context of `brand`, `colorScheme` and `density` (the README's brand × scheme × density), `ThemeObject { id, name, group, selectedTokenSets }` *(verified: @tokens-studio/types 0.5.2)*. Brand themes also enable the invariant sets and the default contexts of the other modifiers (`sys/base`, `sys/platform/web`, `sys/modality/pointer`, `sys/motion/default`, `comp/*`), so any one theme per group resolves every alias. A flattened colorScheme context enables both of its files. Multi-mode themes need the paid plan.
- **`$metadata.json`**: `{ "tokenSetOrder": [ … ] }`, the resolution order flattened, each file at its first occurrence (shape unverified, V3).

```json
[
  { "id": "brand-prism", "name": "prism", "group": "brand",
    "selectedTokenSets": { "ref/color.palette": "enabled", "ref/gradient": "enabled", "ref/dimension": "enabled", "ref/typography": "enabled",
                           "ref/motion": "enabled", "ref/elevation": "enabled", "ref/opacity": "enabled", "brands/prism": "enabled",
                           "sys/base": "enabled", "sys/platform/web": "enabled", "sys/modality/pointer": "enabled", "sys/motion/default": "enabled",
                           "comp/button": "enabled", "comp/card": "enabled", "comp/text": "enabled", "comp/surface": "enabled", "comp/chart": "enabled" } },
  { "id": "colorScheme-dark-increased-contrast", "name": "dark-increased-contrast", "group": "colorScheme",
    "selectedTokenSets": { "sys/color/dark": "enabled", "sys/color/dark-increased-contrast": "enabled" } },
  { "id": "density-compact", "name": "compact", "group": "density", "selectedTokenSets": { "sys/density/compact": "enabled" } }
]
```

### 9.10 Figma-native flavor (`tokens/export/figma/<brand>/<colorScheme>.json`)

- 12 files (2 brands × 6 color schemes), resolved from the IR at `platform=web` and the other axes at defaults; each file imports as one mode.
- Only `sys.*` and `comp.*` tokens, named by public path as nested groups (`$root` → `default`).
- Only the types Figma imports *(verified: Figma help "Modes for variables")*: colors as sRGB objects with `hex`; dimensions `{ value, unit: "px" }`; durations `{ value, unit: "s" }`; `fontFamily` as one family name; numbers; flags as numbers with `com.figma.type: "boolean"`. Typography is split into its primitives (`…/font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`); springs into `…/duration` and `…/bounce`. Shadows, gradients, cubic Béziers, transitions and stroke styles are omitted and listed in `tokens/export/README.md`.
- Values only, no aliases (cross-file aliases need `com.figma.aliasData` variable ids; follow-up).

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
  "space": { "card-padding": { "$type": "dimension", "$value": { "value": 24, "unit": "px" } } }
}
```

### 9.11 Descriptions and deprecation

`$description` → Swift `///`, TS JSDoc, manifest; `$deprecated` → Swift `@available(*, deprecated, message:)`, TS `@deprecated`, manifest. CSS carries no per-token comments (block headers only).

### 9.12 Self-verification (runs inside `tokens:build` and in tests)

- `verify/css-cascade.ts` evaluates the `CssRule` model in a small cascade engine: selector matching for exactly the forms Prism emits (`:root`, attribute tests, `:not()`, descendant), specificity (each counts (0,1,0)), source order, one layer, inheritance of computed values, `var()` substitution, media and `@supports` conditions. For all 96 runtime combinations per brand (the 72 resolver permutations plus the 24 synthesized contrast + transparency combinations) in these scenarios the computed value of every custom property must equal the literal rendering of the IR:
  1. all preferences as root attributes;
  2. the same preferences through media features only;
  3. nested scheme scopes (light in dark, dark in light, depth 3) under contrast and transparency;
  4. nested density scopes;
  5. `color-gamut: p3` on and off, `linear()` supported and unsupported.
- `verify/tables.ts` evaluates the Swift table model for all 96 contexts × {apple, watch} and `resolveTokens` for all 96 web contexts against the IR (the synthesized contrast + transparency contexts against `s ⊕ ΔIC ⊕ ΔRT`).
- A snapshot test proves `render.ts` against the model; a real-browser check of the selector forms belongs to P3-4 VRT.

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

/** Public name, id or glob → token ids. Tries, in order: exact id; sys.<name>; sys.<name>.$root; comp.<name>; ref.<name>.
 *  A '*' segment matches one segment ('gradient.vivid.*' → sys.gradient.vivid.* once S6 lands, else ref.gradient.vivid.*).
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
4. `backdrops` (glass pairs): for each hex, `bgFlat = flatten([backdrop, bg])`; every backdrop must pass.
5. `bg: "gradient.vivid.*"`: every stop of every matched gradient, or only the stops inside a declared text zone once P1-6 defines one (roadmap verify item); `stops: "text-zone"` without a declared zone means all stops.
6. Threshold: `thresholds[tier]`; `functional` uses `functionalLarge` when `minSizePx ≥ 24`; `decorative` requires `minSizePx ≥ 24`.
7. Output: a Markdown table (pair × context: ratio to two decimals, threshold, pass); exit 1 on any failure.

The tool also checks that every `a11y.pairsWith` declared on a `sys.color.text.*` token appears in `contrast-pairs.json` (tokens README rule 4).

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
- **`axes-changed` is major** because the generated API changes shape: a Swift `let` becomes a `switch`-initialized member of a different struct path, a TS entry changes between `$value` and `$values`, a `DSColor` static becomes a function.
- **An alias retarget** that keeps the resolved value everywhere is `meta-changed` (patch).
- **`declaredBump`** parses the YAML front matter of every `.changeset/*.md` except `README.md` (pending changesets since the last release) with `yaml`, ignoring packages listed in `.changeset/config.json` `ignore` (`prism-tools`, `prism-gallery`, `prism-vrt`); the `fixed` group means one bump for all packages.
- **0.x policy**: `--pre1 strict|shifted`, default `strict` (major stays major, which Changesets turns into 1.0.0). `shifted` maps required major → minor and minor → patch until 1.0 (owner decision O4).
- **CLI**: `tokens:diff [--base <ref>] [--changesets <dir>] [--pre1 strict|shifted] [--json] [--allow-invalid-baseline <reason>]`. The base defaults to `lastReleaseTag()`. Output: a Markdown table on stdout and in `$GITHUB_STEP_SUMMARY`. Exit 1 when `declared < required`.
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
6. **Writer**: writes only changed bytes, deletes stale files in owned roots, never writes elsewhere. `--check` fails on added, changed or removed files. CI also runs `git status --porcelain` on the generated paths, which catches untracked files.
7. **One Color.js**: the catalog keeps `colorjs.io ^0.5.2`, the range SD 5.5.3 depends on, so Prism and SD share one copy. The lockfile fixes exact versions (CI installs with `--frozen-lockfile`); a dependency bump shows up as a reviewable generated diff.
8. **Floating point**: the Node major is pinned (`.node-version` = 24); V8's math is the same on macOS and Linux for one version, and fixed rounding absorbs ULP noise.
9. **Offline**: the build is a function of `tokens/`, `brands/`, the tool code and the lockfile.
10. **Proof**: a test builds twice in one process with shuffled source read order and different `TZ` and `LANG`, and compares bytes.

---

## 13. Performance

| Phase | Measured or estimated |
|-------|-----------------------|
| Parse about 35 source files | ~10 ms (estimate) |
| Merge 432 trees | 14–27 ms (measured by the output-first and IR-first probes) |
| 432 SD runs with the normalizer | 2.8 s minimal normalizer *(verified)*; 4.2 s fuller normalizer (IR-first probe) |
| Composition proof over 432 permutations | < 1 s naive *(verified)*; 147 ms optimized (output-first probe) |
| Formats + cascade simulation + table evaluation | ~1 s (estimate) |
| Writing ~100 colorsets, ~20 Swift files, ~7 web files, ~30 flavor files | < 0.3 s (estimate) |
| **`tokens:build` total** | ~6 s locally, ~12 s on a 2-vCPU runner (estimate) |
| Peak memory | ~410 MB RSS with every IR held *(verified)*; drop each merged tree after its run and intern identical `IRToken` objects if it grows |
| `tokens:diff` | two bundles, ~2× the build |

Each new brand adds 216 permutations. Beyond ~30 s in CI, move SD runs to `worker_threads` (one SD per worker; in-process concurrency is unsafe because of the `GroupMessages` singleton).

---

## 14. Implementation order

Order: P1-1 and P1-2 (source fixes, lint) → P1-3 → P1-4 → P1-5, with P1-6 after P1-3 and P1-7 after P1-5; P1-8 after P1-1. Tests use Vitest 4 (`tools/vitest.config.ts`); files that call SD must not use `test.concurrent`. Tests against the real repository live in one file per ticket (`repo.test.ts` style) that builds the bundle once; they are `test.todo` until the prerequisite fixes of §1 land.

### P1-1 — `ref.*` review

- **Files** (data): `tokens/ref/motion.tokens.json` (S7: `inOut` → `in-out`), `tokens/ref/typography.tokens.json` (S8: `ref.type.scale` with an explicit `"$type": "number"`, value 1; S11: `app.prism.textStyle` on every role), `a11y.pairsWith` on `sys.color.text.*`, `figma` metadata.
- **Tests**: none in tools.
- **Acceptance** ("files still validate; contrast test passes"): the CI schema step validates the files; the contrast part is proven once `contrast:check` exists (P1-6).

### P1-2 — `sys.*` and resolver review, orthogonality lint

- **Files**:
  - data: S1, S2, S3, S4, S6, S10 (and the owner's S9 decision) in `tokens/sys/**`, `tokens/comp/card.tokens.json`, `tokens/comp/surface.tokens.json`, `tokens/prism.resolver.json`;
  - `tools/tokens/terrazzo.config.ts` (opens the `tokens:lint` gate; land it together with S1, or `tz lint` fails CI);
  - `tools/tokens/lint-orthogonality.ts`, `tools/tokens/lint-orthogonality.test.ts`, `tools/tokens/fixtures/non-orthogonal/` (the repository resolver copied with `density/compact` also writing `sys.material.blur.enabled`);
  - `tools/package.json`: `"tokens:lint": "tz lint --config tokens/terrazzo.config.ts && node tokens/lint-orthogonality.ts"`, devDependency `@terrazzo/parser`;
  - `pnpm-workspace.yaml` catalog: `"@terrazzo/parser": ^2.7.1` (pnpm's strict layout requires the direct dependency).
- **Tests**: the non-orthogonal fixture exits 1 naming the overlapping id; the repository exits 0; the permutation count equals 432.
- **Acceptance** ("`tz lint` reports orthogonal modifiers"): `tz lint` 2.7.1 does not detect overlaps (it exits 0 on the tampered copy) *(verified)*, so the proof is `pnpm tokens:lint`: `tz lint` clean plus `resolver.orthogonal === true` from `@terrazzo/parser`. From P1-3 on, `tokens:build` repeats the check with Prism's analyzer. ADR-0004 rule 2 needs the amendment in §16.3.

### P1-3 — resolver driver

- **Files**: `config.ts` (P1-3 subset), `source/{reader,types,model,brands,analyze}.ts`, `resolver.ts`, `engine/{sd,hooks,to-ir}.ts`, `ir/{types,normalize,color,color-math,order,bundle,analyze,naming,diagnostics}.ts` (`naming.ts`: public path only), `api.ts` (`buildBundle`, `lookup`, `publicPath`, `contrastContexts`, color math), `schema/app-prism.schema.json`, `schema/brand.schema.json`. Do **not** add `build.ts`.
- **Dependencies**: `jsonc-parser` (catalog `^3.3.1`, MIT) for `source/model.ts`.
- **Fixtures**:
  - `fixtures/mini/`: two sets, three modifiers with 2 / 3 / 2 contexts, one inline source, one set referencing a set, `$root`, alias chains, a composite with an aliased sub-value, a spring on an alias, an out-of-sRGB color, a typography alias inside a `$type: number` group of another document;
  - `fixtures/merge-semantics/`: a later token without `$description`, `hex` or `$extensions` must not inherit them;
  - `fixtures/broken/<code>/`: one tree per diagnostic (group reference, untyped token, alias/group type conflict, group type conflict across documents, write overlap, ownership violation, incomplete context, brand adding a path, dead brand write, duplicate key, cycle, `$extends`, modifier referencing a modifier, missing default, URL source).
- **Tests**:
  - `resolver.test.ts`: mini fixture has 12 permutations in canonical key order; merge replaces tokens wholesale (merge-semantics); group properties are last-wins; token/group shape conflict is an error.
  - `source/model.test.ts`: every structural diagnostic with file and line; per-document `groupType`; duplicate keys.
  - `source/analyze.test.ts`: each `fixtures/broken/*` case yields exactly its code and ids.
  - `engine/sd.test.ts`: IR snapshot of one mini permutation; a broken reference fails with both ids; a group reference fails with the `.$root` hint; an untyped literal fails; an alias inside a `$type: number` group gets its target's type; a normalizer diagnostic fails the run (not a warning); a spring on `ref` flows through `sys` and `comp` aliases with the default and reduced values; an alias with its own `spring` overrides; typography `slot`, `numeric`, `textStyle` and font `opsz` survive two alias hops; class instances are never used (every value has `kind`).
  - `ir/normalize.test.ts`: idempotency, `normalize(normalize(x)) ≡ normalize(x)`, for every `TokenType`.
  - `ir/analyze.test.ts`: a crafted two-axis token fails; a masked interaction (alias re-pointed by one modifier to a token another modifier changes) fails only in the composition proof; overlapping contrast and transparency deltas fail.
  - `oracle.test.ts`: for the default permutation and every single-axis variation (13 inputs) the IR's semantic projection equals `@terrazzo/parser`'s `resolver.apply(input)` after two normalizations (Terrazzo names `$root` tokens by their group path and fills DTCG defaults such as shadow `inset: false`). On today's data 5,160 values agree *(verified)*; `fixtures/merge-semantics` documents the one known divergence (Terrazzo deep-merges object values).
  - `api.test.ts`: `lookup` for every name in `tokens/contrast-pairs.json`, globs, the `$root` fallback, suggestions for a typo.
  - `repo.test.ts`: 432 permutations, equal to Terrazzo's `listPermutations().length`; every IR invariant; zero diagnostics (todo until S1–S4 land; before that the expected diagnostics are exactly S1, S2, S3, S4, S8).
- **Acceptance** ("unit tests over a fixture resolver; permutation count matches the matrix"): `pnpm --filter @iiiivaska/prism-tools test` in the `web` job runs the suite; the mini fixture proves 12 and the repository test proves 432 against Terrazzo.

### P1-4 — transforms and `normalize`

- **Files**: `transforms/{format-number,color,dimension,duration,cubic-bezier,spring,typography,shadow,gradient,stroke,font,number,material}.ts`, `normalize.ts`, `fixtures/tampered-hex/`, `fixtures/tampered-spring/`; `tools/package.json` scripts `"tokens:normalize": "node tokens/normalize.ts --write"` and `"tokens:normalize:check": "node tokens/normalize.ts --check"`; root `package.json` pass-through `tokens:normalize`. Then run `pnpm tokens:normalize` once and commit the S5 edit to `tokens/sys/motion/reduced.tokens.json`.
- **Tests**:
  - `transforms/color.test.ts`: all 166 real color objects reproduce their authored `hex`; table snapshots for an in-gamut OKLCH color (base only), `accent.50` and `accent.300` (base + P3 twin), a synthetic out-of-P3 color, an sRGB overlay (`rgb(255 255 255 / 0.64)`), `none` components, an achromatic hue, colorset components and Swift literals of `neutral.600` / `neutral.700`.
  - `transforms/dimension.test.ts`, `duration.test.ts`: px, rem, em tracking, negative values, decimals.
  - `transforms/spring.test.ts`: Apple's documented (0.5, 0.3) → 157.9137 / 17.5929; settle 220 / 487 / 587 / 404 / 818 and 367 / 440; generator versus closed form ≤ 1e-9 before rounding; RDP ≤ 24 stops and ≤ 0.002 error; the bouncy regression (no `1, 1, 1` plateau); exact `linear()` string snapshots; the schema rejects bounce outside [0, 1).
  - Composite renderers: typography sub-declarations, multi-layer shadows, gradients with P3 twins, stroke styles, font quoting, flags.
  - `normalize.test.ts`: `--check` on `fixtures/tampered-hex` exits 1 and prints file, line, pointer, expected and actual; `--write` fixes it and leaves every other byte unchanged; a second run is a no-op; the same for `fixtures/tampered-spring`.
- **Acceptance** ("snapshot tests; `hex` stale check fails on a tampered fixture"): the snapshot tables above and `normalize.test.ts`.

### P1-5 — formats and the build

- **Files**: `formats/**`, `verify/**`, `output/write.ts`, `ir/naming.ts` (all targets), `config.ts` (Tailwind and Swift tables), `build.ts` (opens the `tokens:build` gate), `README.md` update, `scripts/verify-xcassets.sh`; hand-written `swift/Tests/DSTokensTests/SpringParityTests.swift` and `ColorCatalogTests.swift` (remove `PlaceholderTests.swift`); delete `swift/Sources/DSTokens/Generated/.gitkeep` and `swift/Sources/DSTokens/Resources/.gitkeep`; `tools/package.json` script `"tokens:check": "node tokens/build.ts --check"` and devDependencies `tailwindcss`, `@tailwindcss/node` (catalog `^4.3.3`, test only); root `package.json` pass-through `tokens:check`; the first generated output, committed.
- **CI** (`.github/workflows/ci.yml`):
  - stale-output step: `generated="swift/Sources/DSTokens/Generated swift/Sources/DSTokens/Resources swift/Tests/DSTokensTests/Generated web/packages/tokens/src/generated tokens/export"`;
  - `apple` job, gated on `tokens_build`: `bash tools/tokens/scripts/verify-xcassets.sh`, then `xcodebuild test -scheme Prism-Package -only-testing:DSTokensTests -destination 'platform=iOS Simulator,name=iPhone 17,OS=latest'` and the same with `'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm),OS=latest'` (V1).
- **Tests**:
  - Format snapshots on the mini fixture (`toMatchFileSnapshot`), plus targeted assertions on the real bundle: block list and selectors, twin count, colorset count and entries, Swift member count, collision-free names.
  - CSS: `verify/css-cascade.ts` over every scenario of §9.12; render-form tests for every selector form and media combination; `@layer` wrapping.
  - Tailwind: compile `tailwind.css` with a fixture `tokens.css` through `@tailwindcss/node` and assert the utilities of §9.4, including `bg-ds-page`, `text-ds-primary`, `border-ds-hairline`, `text-ds-body-md`, `h-ds-control` and a `ds-touch:` variant; a crafted clash (`--text-ds-x` and `--text-color-ds-x`) fails the collision check.
  - TS: `tsc --noEmit -p web/packages/tokens/tsconfig.json` after the build (the `web` job's `pnpm typecheck` repeats it); `resolveTokens` equals the IR for all 96 contexts.
  - Swift (Node side): table evaluator against the IR for 96 contexts × {apple, watch}; identifiers are valid and escaped.
  - xcassets: JSON snapshot; entry rules (four universal entries plus `watch` for scheme-dependent colors, one entry otherwise); reduced-transparency colorsets exactly for `ΔRT`.
  - Tokens Studio: every set named in `$themes.json` exists; every alias resolves under every combination of one theme per group; `$root` rename collision test; theme objects satisfy `ThemeObject`.
  - Figma: every file validates against the DTCG format schema (ajv); only sRGB colors, px dimensions, second durations and single font names; every file of a brand has identical names and types.
  - Writer: stale-file deletion, `--check` report, unchanged files keep their mtime.
  - Determinism (§12 rule 10).
- **Acceptance** ("`pnpm tokens:build && git diff --exit-code` passes in CI; `swift build` passes with generated code"): the gated stale-output step (with `git status --porcelain`, which also catches untracked files) and the `apple` job's `swift build && swift test`, iOS/watchOS simulator builds, catalog compile and `DSTokensTests` under `xcodebuild`.

### P1-6 — contrast

- **Files**: `tools/contrast/{check,pairs,thresholds,report}.ts`, tests, `tools/contrast/fixtures/broken-pair/`; `api.ts` additions if needed. `check.ts` opens the gate, so it lands when the repository passes (after P1-1 fixes the light tertiary pair noted in `contrast-pairs.json`).
- **Tests**: `ir/color-math.test.ts` (white on black 21:1; dark `color.text.tertiary` white 55 % over `bg.surface` white 6 % over `bg.page` `neutral.950` composites as specified); `pairs.test.ts` (every tier and size rule, backdrops, gradients, unknown names); `check.test.ts` (the broken fixture exits 1 and names the pair and context; the repository exits 0); `contrastContexts` returns 12 and throws on a fixture with an apple-only color.
- **Acceptance** ("fails on a deliberately broken pair; passes on the reference brand"): `check.test.ts` plus the gated CI step.

### P1-7 — diff

- **Files**: `tools/tokens/diff.ts` (opens the gate), `diff/{git,classify,changesets}.ts`, tests, `fixtures/diff/{before,after-*}/`, `fixtures/changesets/`.
- **Tests**: `classify.test.ts` builds two in-memory bundles (a `SourceReader` over fixture trees) and covers every `TokenChange` kind, including `axes-changed`; `changesets.test.ts` covers front matter, ignored packages, the fixed group and no changesets; `diff.test.ts`: removal + patch changeset → exit 1; value change + minor → 0; value change + patch → 1; type change needs major; `--pre1 shifted`; no tag → 0 with notice; invalid baseline → 1 unless `--allow-invalid-baseline`. A `gitReader` smoke test reads `HEAD:tokens/prism.resolver.json`.
- **Acceptance** ("fails a PR that removes a token with a patch changeset"): `diff.test.ts` plus the gated pull-request step.

### P1-8 — reference brand and font check

- **Files**: `brands/prism/brand.tokens.json` (reference values; `ref.type.scale` instead of `ref.brand.type-scale`), `brands/*/brand.json` (fonts), `tools/fonts/{check,font-file}.ts`, tests, `tools/package.json` script `"fonts:check": "node fonts/check.ts"` and the font-parser dependency (V6); CI gains a gated `fonts:check` step (gate file `tools/fonts/check.ts`) in `contracts`.
- **Tests**: the bundled Onest and JetBrains Mono pass (Cyrillic incl. Ё/ё; `tnum` present or equal digit advances); a Latin-only font synthesized in the test fails; `brand.json` schema errors are reported.
- **Acceptance** ("brand builds; font check passes; a Latin-only test font fails"): `tokens:build` passes with the brand (brand-path and dead-write checks), and `fonts:check` tests.

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
| F15 | Settle (floor of the last time `|1 − x| ≥ 0.001`): 220 / 487 / 587 / 404 / 818 ms; reduced 367 / 367 / 440 ms; rounding would change four committed values. RDP (0.002) on 1 ms samples: 20–24 stops, max error 0.0020; uniform 60 Hz: up to 50 stops, error up to 0.030. | Closed-form probe; sampling comparison. |
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

Not re-verified here, carried from the design probes: Chrome 152 behavior of nested custom-property scopes and the compound selectors (output-first probe; the cascade simulator and P3-4 VRT cover it), SD built-in transforms mangling 2025.10 durations and gradients (SD-maximal probe; Prism does not use them), and the output-first probe's finding that a colorset without high-contrast entries falls back to the same-luminosity entry on macOS (not relied on: Prism writes all four entries).

---

## 16. Risks, verify-before-implementing items, decisions

### 16.1 Verify before implementing

| # | Item | Ticket | What to check | Fallback |
|---|------|--------|---------------|----------|
| V1 | `xcodebuild test -scheme Prism-Package -only-testing:DSTokensTests` on a watchOS simulator | P1-5 | Whether the scheme's other test targets (DSSnapshotTests with SnapshotTesting) block the watchOS build. | Test with a DSTokens-only scheme, or keep the watch check at `verify-xcassets.sh` (actool + assetutil). |
| V2 | `package` access to `DSTokensBundle` from `DSTokensTests` | P1-5 | Compiles under `swift build` and `xcodebuild`. | `@testable import DSTokens` with an internal accessor. |
| V3 | Tokens Studio import: `$root` → `default`, `$metadata.json` `tokenSetOrder`, grouped themes, `#rrggbbaa` colors | P1-5 | One manual import by the owner (themes need the paid plan). | Product themes (brand × scheme × density) instead of groups; `rgba()` strings. |
| V4 | Figma native import of one generated file per mode | P1-5 | One manual import. | Adjust the flavor; it never feeds back into the source. |
| V5 | Tailwind per-utility namespaces stay available | P1-5, every Tailwind bump | The compile test in CI. | Generic `--color-ds-bg-page` names (`bg-ds-bg-page`) with a README change. |
| V6 | Font parser for `tools/fonts` (candidate `opentype.js` 2.0.0, MIT) | P1-8 | Reads the variable Onest and JetBrains Mono TTFs (cmap, GSUB `tnum`, advances) and can synthesize a Latin-only font. | `fontkit` 2.0.4 (MIT) for reading plus a tiny committed OFL test font with a license entry. |
| V7 | SD native resolver (#1590) semantics when it ships | later | Merge semantics, typing, per-permutation access. | Keep `resolver.ts` (§5.8). |
| V8 | macOS high-contrast lookup at runtime | P3 | The SD-maximal probe saw `NSAppearance(named: .accessibilityHighContrastAqua)` return the standard value; actool does compile the entries. | P3 snapshots with Increase Contrast on macOS. |
| V9 | The selector algebra in real browsers | P3-2 / P3-4 | Root, nested islands, media and attribute forms in Chromium, WebKit and Firefox. | Adjust `formats/css/model.ts`; the simulator encodes the fix. |
| V10 | `@layer ds.tokens` next to consumers that import Prism styles as `layer(components)` | P3-2 | Consumer overrides of `--ds-*` still win. | Drop the layer from `tokens.css`. |

### 16.2 Risks

| Risk | Mitigation |
|------|------------|
| The source fails the first build (S1–S8). | Fixture-based tests for P1-3/P1-4; `repo.test.ts` is `todo` until P1-2 lands; diagnostics carry file, line and fix; `--json` lets an agent fix them in one pass. |
| SD pitfalls: warnings instead of errors, transitive transforms receiving transformed values, prototype loss, group-first typing, the global message queue. | `warnings: 'error'`, verbose logging, a diagnostics side channel, one plain-data idempotent transform with property tests, the `prism/dtcg-types` preprocessor, strictly sequential runs. |
| SD's native resolver may merge tokens property-wise, like its `source` merge. | The deletion is gated on the merge-semantics conformance fixture (§5.8). |
| The CSS selector algebra is intricate. | Block model, cascade simulator over all 96 contexts per brand and nested scenarios, real-browser check in P3 (V9). |
| `swift test` cannot see catalog colors (F17). | Catalog tests run under `xcodebuild` on iOS and watchOS simulators; host tests use `DSColorToken.appearances` and generated expectations. |
| watchOS catalogs hold one value per idiom, so Increase Contrast is not reflected on watch colors (F19). | Documented Tier-3 limitation; DSCore can override from `DSColorToken.appearances` if a watch design needs it. |
| A brand that changes colors cannot use the committed Swift artifact. | The build fails loudly (§5.7); owner decision O5. |
| Tailwind per-utility namespaces are undocumented (F24). | Compile test in CI, collision check, V5 fallback. |
| Motion or Color.js upgrades change generated bytes. | Lockfile, one Color.js, reviewed generated diffs, spring tests against the closed form. |
| Memory and time grow by 216 permutations per brand. | Drop trees after each run, intern IR tokens, `worker_threads` with one SD per worker if CI exceeds ~30 s. |
| Brand-tunable semantics (S9) stay unresolved. | Dead brand writes fail the build, so nothing ships silently broken. |
| Pre-1.0 semver: a `major` classification bumps 0.1.0 to 1.0.0. | `--pre1 shifted`; owner decision O4. |

### 16.3 Decisions and follow-ups outside this document

Owner decisions:

- **O1** Web attribute contract of §9.1 (`data-ds-color-scheme`, `-contrast`, `-transparency`, `-density`, `-modality`, `-motion`; which are nestable). Record in an ADR amending ADR-0003 ("tokens.css (variables scoped by `[data-ds-brand|scheme|density|input]`)") and ADR-0004 decision 5 (`[data-color-scheme]`, `[data-density]`, `[data-modality]`).
- **O2** Brand-tunable semantics (S9): brands override `ref.*` only and scheme files alias `ref.*` slots, or another model; then rewrite the whitelist in `brands/README.md`.
- **O3** Flavors live in `tokens/export/` (generated, committed). ADR-0014 lists `tokens/` as "DTCG 2025.10 source + prism.resolver.json"; a one-line note there keeps it accurate.
- **O4** `tokens:diff` policy before 1.0 (`--pre1 strict|shifted`).
- **O5** Swift and brands: the committed `DSTokens` serves the default brand's values plus every repo brand's font faces; a color-changing brand needs either a per-brand Swift build or a runtime brand axis with namespaced colorsets.
- **O6** ADR-0004 rule 2 says a doubly written token id "fails `tz lint`"; with Terrazzo 2.7.1 the gate is `pnpm tokens:lint` (Terrazzo's parser API) plus the build's own analysis (F21, F22). The roadmap's P1-2 acceptance wording changes the same way.
- **O7** Material recipes as typed tokens (`sys.material.glass.dark.blur`, …) instead of `$extensions`, so every context states them. Until then neutral defaults apply (§7.12).

Follow-ups in files this change did not touch:

- `.github/workflows/ci.yml`: the generated-path list and the `apple` job steps (§14, P1-5); a gated `fonts:check` step (P1-8).
- `pnpm-workspace.yaml` catalog and `tools/package.json`: `@terrazzo/parser`, `jsonc-parser`, `tailwindcss`, `@tailwindcss/node`, the font parser; scripts `tokens:lint` (extended), `tokens:normalize`, `tokens:normalize:check`, `tokens:check`, `fonts:check`; root pass-throughs `tokens:normalize`, `tokens:check`.
- `tools/README.md`: the planned-tools table says `tokens:lint` is a "Terrazzo lint of resolver orthogonality" and that the build writes `…/Generated + Resources`; update both when P1-2 and P1-5 land.
- `brands/README.md`: the whitelist (O2); the "`$extensions` app.prism.brand" note.
- `docs/roadmap.md`: P1-2 acceptance wording (O6); the "asset catalog high-contrast slot key" verify item is closed (F18–F20).
