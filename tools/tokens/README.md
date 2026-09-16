# tools/tokens

## What exists now

Phase 1 (P1-1 to P1-8) is complete. The entry points of this folder (`tools/README.md`, "What exists now", names the CI step that runs each):

| Command | File | Ticket |
|---------|------|--------|
| `pnpm tokens:validate` | `validate.ts`, `schema/dtcg-2025.10/` | P1-1 |
| `pnpm tokens:lint` | `terrazzo.config.ts`, `lint-orthogonality.ts` | P1-2 |
| `node tokens/diagnose.ts` (development only, run from `tools/`) | `diagnose.ts` | P1-3 |
| `pnpm tokens:normalize`, `pnpm tokens:normalize:check` | `normalize.ts` | P1-4 |
| `pnpm tokens:build`, `pnpm tokens:check` | `build.ts` | P1-5; the font files P1-8 |
| `pnpm tokens:diff` | `diff.ts` | P1-7 |

`tools/contrast/` (P1-6, `pnpm contrast:check`) and `tools/fonts/` (P1-8, `pnpm fonts:check`) sit beside this folder and read the bundle through `api.ts`.

Schema validation (P1-1, ADR-0024 §10): `pnpm --filter @iiiivaska/prism-tools tokens:validate` validates `tokens/**/*.tokens.json`, `brands/*/brand.tokens.json` and the resolver offline against the vendored DTCG 2025.10 schemas in `tools/tokens/schema/dtcg-2025.10/`, checked against `SHA256SUMS`, with one Ajv instance per schema. CI runs the same script as an ungated `contracts` step (`tools/README.md`, "DTCG schema validation").

### Provenance: the seed scripts

| File | Role |
|------|------|
| `seed-ref-tokens.py` | Generated `tokens/ref/*.tokens.json` (primitives) from the reference-brand values in `docs/research/visual-dna.md`: neutral and accent ramps with computed OKLCH components and hex fallbacks, status and series colors, vivid gradients, dimension scales, opacity steps, typography roles, motion (durations, easings, springs with the `app.prism.spring` extension), shadow primitives. |
| `seed-sys-tokens.py` | Generated `tokens/sys/**` (semantic layer) as aliases into `ref.*` or white/ink alpha overlays: light and dark schemes, increased-contrast and reduced-transparency deltas, density, modality, motion (default / reduced), platform, and `base` (context-independent). The compact `tokens/comp/*` seeds were written by the same session for the vertical-slice components. Its white/ink overlay convention is superseded by ADR-0020 §3: hued and ink overlays are aliases with `app.prism.alpha`. |

Both scripts are **bootstraps**: they encoded the DNA numbers once so the token files were consistent and schema-valid. Since the P1-1 and P1-2 reviews the JSON files are the source of truth, and the scripts are kept only as documentation of provenance. Re-running them overwrites hand edits: their material, reduced-transparency and platform-blur sections are superseded by ADR-0022, their motion block by ADR-0023, and they reintroduce names ADR-0024 retired. Do not re-run either script.

### The resolver driver (P1-3)

The source model, the resolver, one Style Dictionary run per permutation and the IR analysis; the formats and `build.ts` (P1-5) sit on top of them (next section). Module by module, as `ARCHITECTURE.md` §3.1 lists them:

| Path | Role |
|------|------|
| `config.ts` | Pure data: paths, `OWNERSHIP` (its `brand` row is `BRAND_OVERRIDABLE`), the semantic-slot table, `WEB_RUNTIME` (the resolver defaults), the colorScheme structure, the ADR-0021 constants, font keywords, extension keys. |
| `source/` | `reader.ts` (`fsReader`, `memoryReader`, `overlayReader`), `json.ts` (positions and duplicate keys), `model.ts` (the resolver and every document it loads), `brands.ts` (`brand.json` and registration), `schemas.ts` (the Ajv schemas in `schema/`), `analyze.ts` (the source checks of §5.6). |
| `resolver.ts` | Deletable: enumeration, the DTCG merge (a later token replaces the earlier one wholesale) and provenance. |
| `engine/` | `sd.ts` (one Style Dictionary 5.5.3 instance per distinct layer stack, strictly sequential), `hooks.ts` (`prism/validate`, `prism/dtcg-types`, `prism/normalize`), `to-ir.ts` (the IR, the brand type scale, the ADR-0021 weight rule). |
| `ir/` | `types.ts`, `normalize.ts`, `color.ts`, `color-math.ts`, `spring.ts` (physics and settle for the motion policy), `order.ts`, `glob.ts` (the id pattern grammar), `lookup.ts`, `naming.ts` (public paths), `references.ts`, `typography.ts`, `bundle.ts` (`buildBundle`, the IR invariants), `analyze.ts` (§5.7), `diagnostics.ts`. |
| `api.ts` | `buildBundle`, `collectBundle`, `lookup`, `publicPath`, `brandMeta`, `contrastContexts`, `unionShapes`, the color math, the readers. |
| `diagnose.ts` | Development CLI: `node tokens/diagnose.ts [--json] [--root <dir>] [--resolver <path>]` prints every source and IR diagnostic with file, line and fix, writes nothing and exits 1 on any. It stops before the formats; `build.ts` takes the same flags and runs everything. Not a CI gate file. |
| `fixtures/` | `mini/` (12 permutations), `valid/` (the repository in miniature, 192 permutations), `merge-semantics/`, `tampered-hex/` and `tampered-spring/` (P1-4), and `broken/<case>/`: one overlay of `valid/` per diagnostic, with `fixture.json` naming the expected codes and tokens. `valid/` names font files in its `brand.json` files without committing them, so `build.test.ts` synthesizes them in its temporary copy. |

Every diagnostic has a code, a file and line where one exists, and a fix where it is mechanical. The tests that build the real repository (`repo.test.ts`, the living-document part of `docs.test.ts`) run in the suite: the repository builds its 576 permutations with zero diagnostics.

### The build (P1-5)

`build.ts` runs the whole pipeline: the `tokens:normalize` check, `buildBundle` (source checks, one Style Dictionary run per distinct layer stack, the IR invariants and analysis), every format, the self-verification of `verify/`, and the writer. Nothing is written while any step reports a diagnostic.

| Command | What it does |
|---------|--------------|
| `pnpm tokens:build` | Builds and writes every output. The writer owns the roots of `config.ts` `OWNED_ROOTS`: it writes the files whose bytes changed, leaves unchanged files alone (their mtime too), and deletes files it no longer produces inside those roots. Prints `tokens:build: <n> files, wrote <w>, removed <r>, unchanged <u>`. |
| `pnpm tokens:check` | `node tokens/build.ts --check`: builds, compares with disk, writes nothing, and exits 1 with one `output/stale` diagnostic per file that a build would add, change or remove. CI instead runs `tokens:build` and then `git status --porcelain` over the owned roots (`.github/workflows/ci.yml`, the stale-output step). |

Flags of `node tokens/build.ts`, run from `tools/`; from the repository root `pnpm tokens:build <flags>` passes them on, and a relative `--root` then still resolves against `tools/`:

| Flag | Meaning |
|------|---------|
| `--check` | Compare only, as above. |
| `--json` | Print the diagnostics, stale files included, as JSON on stdout instead of text. |
| `--only <target,…>` | Development: render and write only these targets and delete nothing. Never with `--check`, because a partial build cannot prove the tree clean. |
| `--root <dir>` | Build another tree with the repository's layout (`<dir>/tokens/prism.resolver.json`, `<dir>/brands/`) and write its outputs under `<dir>`. The tests build a temporary copy of `fixtures/valid/` this way. |
| `--resolver <path>` | A resolver other than `tokens/prism.resolver.json`, relative to the root. |

Exit codes: 0 success, 1 diagnostics or stale output, 2 a usage error.

Outputs, by `--only` target (every path is inside `OWNED_ROOTS`; `ARCHITECTURE.md` §9 describes each file):

| Target | Files |
|--------|-------|
| `css` | `web/packages/tokens/src/generated/<brand>/tokens.css`, one per brand, and the brand-invariant `motion.css` (ADR-0019, ADR-0023) |
| `tailwind` | `web/packages/tokens/src/generated/tailwind.css`: the `@theme inline` variables, the `ds-*` variants and the `type-ds-<role>` utilities |
| `ts` | `web/packages/tokens/src/generated/<brand>/tokens.ts`: values by public path and `resolveTokens` |
| `runtime` | `web/packages/tokens/src/generated/runtime.ts`: `webRuntime`, `TokenContext`, `defaultContext`, `platformDefaults`, `ScopeAttributes` |
| `manifest` | `web/packages/tokens/src/generated/manifest.json`: every token's CSS (`css`, `cssVars`), Tailwind, TypeScript, Swift and asset names, the runtime section and the platform defaults |
| `swift` | `swift/Sources/DSTokens/Generated/*.swift` (`DSTokenContext`, `DSTokenTypes`, `DSColor`, `DSBrand`, `DSTokenSet` and one extension per category) and `swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift` |
| `xcassets` | `swift/Sources/DSTokens/Resources/Colors.xcassets/`: one namespace folder per brand (ADR-0020 §7) |
| `fonts` | `swift/Sources/DSTokens/Resources/Fonts/<family-dir>/` (each file a brand bundles on Apple, with its `OFL.txt`) and `web/packages/tokens/src/generated/<brand>/fonts/` (`fonts.css`, and per family `<family-dir>/<family-kebab>-wght.woff2` and `OFL.txt`) (P1-8) |
| `tokens-studio` | `tokens/export/tokens-studio/**` and `tokens/export/README.md`, which covers both flavors |
| `figma` | `tokens/export/figma/<brand>/<colorScheme>.json` |

The formats live in `formats/` (the registry is `formats/index.ts`), the naming rules in `ir/naming.ts`, the value renderers in `transforms/`, the cascade simulator and the TypeScript table evaluator in `verify/`, and the writer in `output/write.ts`. `scripts/verify-xcassets.sh` compiles the catalog with `actool` for iOS, macOS and watchOS in the `apple` job.

To add a target:

1. Write a renderer `(input: FormatInput) => FormatOutput` in `formats/`: a pure function of the bundle (and of the source model or the brand files where the output needs them) that returns repository-relative paths with their bytes, which `renderAll` sorts, and reports problems as diagnostics, never by throwing. Headers come from `formats/header.ts`; §12 of `ARCHITECTURE.md` lists the determinism rules.
2. Register it in `FORMATS` in `formats/index.ts` under a new target name, and add the target's path pattern to `formats/index.test.ts`.
3. If it writes outside the existing roots, add the root to `OWNED_ROOTS` in `config.ts` and to the `generated=` list of CI's stale-output step in the same change (`output/roots.test.ts` asserts they are equal).
4. Test it on `fixtures/mini/` or `fixtures/valid/` and on the repository, and check any name it emits against `ir/naming.ts`; then run `pnpm tokens:build` and commit the generated files.

### The transforms and the normalizer (P1-4)

| Path | Role |
|------|------|
| `transforms/` | Pure renderers from a normalized IR value to the text or object each target prints (ARCHITECTURE §7); the formats call only these, never Color.js, Motion or Style Dictionary. `color.ts` (`prism/color/css-gamut`: sRGB-mapped `oklch()` plus a Display P3 twin; `prism/color/p3`: Swift and colorset components; Tokens Studio `#rrggbb` or `rgba()`, Figma sRGB with `alpha`), `dimension.ts` (`prism/dimension/css` px and rem, `prism/dimension/cgfloat`), `duration.ts`, `cubic-bezier.ts`, `spring.ts` (`prism/spring`, ADR-0023: the physics triplet, the ε = 0.001 floor settle, and CSS `linear()` from 1 ms samples of Motion's physics generator simplified by Ramer–Douglas–Peucker, within 0.0025 of the closed form), `typography.ts` (rem sizes, em tracking, Swift `trackingEm`), `shadow.ts`, `gradient.ts` (OKLab interpolation, §7.9), `stroke.ts`, `font.ts`, `number.ts` (flags), and `format-number.ts`, the one number formatter. |
| `normalize.ts` | Source hygiene (§7.13): rule `hex` keeps every authored `hex` equal to the CSS-gamut-mapped sRGB color, rule `spring-fallback` keeps a spring token's `$value.duration` and `app.prism.spring.settle` equal to the derived settle time and its `$value.delay` at 0 ms (ADR-0023 rule 3). `--check` reports `file:line  pointer  expected → actual` and exits 1; `--write` edits in place with `jsonc-parser` and keeps every other byte. `fixtures/tampered-hex/` and `fixtures/tampered-spring/` hold stale values and their expected fixes. `build.ts` runs the check before anything else. |

### The diff (P1-7)

| Path | Role |
|------|------|
| `diff.ts` | `pnpm tokens:diff` (§11, ADR-0024 §14): builds the base revision (the last release tag, or `--base <ref>`) and the working tree with this checkout's tool code, classifies every token change, and fails when the pending changesets declare a lower bump than the changes require. Markdown on stdout and in `$GITHUB_STEP_SUMMARY`, or `--json`. Exit 0 pass (also with no release tag yet, with a notice), 1 a lower declared bump, an invalid base or working tree, a malformed changeset or a shallow clone, 2 a usage error. |
| `diff/git.ts` | Read-only git access: a `SourceReader` over a revision (`rev-parse`, `ls-tree`, `cat-file`), so the base is built from its sources by the current tool code; the newest release tag merged into a revision (`tag --merged`), which sets the policy; and the shallow-clone check. |
| `diff/classify.ts` | The `TokenChange` kinds and their levels: `removed`, `type-changed`, `axes-changed` and `context-removed` are major; `added`, `value-changed`, `deprecated` and `context-added` minor; `meta-changed` patch. The required bump is the highest level under the policy: `strict` from 1.0 on, `shifted` (one level lower) while the base tag is 0.x. |
| `diff/changesets.ts` | The declared bump: the YAML front matter of every `.changeset/*.md` except `README.md`, read as Changesets reads it, with `.changeset/config.json` supplying the ignored packages and the fixed groups (a release of any package fixed with a token package counts). |
| `diff/report.ts` | The Markdown and JSON renderings. |
| `fixtures/diff/`, `fixtures/changesets/` | A `before/` tree with one `after-*/` overlay per change kind, and one changeset folder per front-matter case. |

## What the P1 tickets added (ADR-0004)

The complete design, including module map, IR types, every transform and format with output samples, and the order of work per ticket, is [`ARCHITECTURE.md`](ARCHITECTURE.md). It follows ADR-0019 to ADR-0025. In short:

- `validate.ts` — `pnpm tokens:validate`: offline DTCG schema validation against the vendored copies (P1-1).
- `source/` — parses the resolver and every token file once (with line numbers) and runs the source checks: write-set disjointness and ownership per modifier (`OWNERSHIP`, whose `brand` row is the brand allowlist `BRAND_OVERRIDABLE`), context completeness, brand paths, registration and values, semantic-slot mapping, `sys` literal and `app.prism.alpha` checks, font-stack rules (ADR-0020), the typography role rules (ADR-0021), material writes and recipe shape (ADR-0022), spring declarations (ADR-0023), names, references, group types, flags and folded keys on aliases (ADR-0024), group deprecation, dead writes. Survives the resolver's deletion.
- `resolver.ts` — only enumerates the permutations (brand × platform × colorScheme × density × modality × motion, 576 today) and merges each one with DTCG semantics (a later token replaces the earlier one wholesale). Designed to be deleted when Style Dictionary ships native resolver support.
- `engine/` — one Style Dictionary 5.5 instance per distinct document stack (permutations that apply the same files in the same order share one run; the IR is still built per permutation), in memory and strictly sequential: Prism preprocessors for reference checks and DTCG type precedence, one transitive transform `prism/normalize` that turns every value into a plain-data IR, `getPlatformTokens('ir')`. No Style Dictionary formats or built-in transforms.
- `ir/` — the IR bundle over all permutations, the ADR-0021 typography weight rule, dependency analysis and an exhaustive composition proof, the motion policy and gradient scheme invariants, naming, color math.
- `transforms/` — pure renderers named after the roadmap: `color/css-gamut` (sRGB-mapped `oklch()` + P3 re-declaration), `color/p3` (Display P3 for Swift and `.colorset` components via Color.js gamut mapping), `dimension/css`, `dimension/cgfloat`, `duration`, `spring` (ADR-0023: physics triplet, ε = 0.001 floor settle, CSS `linear()` from 1 ms samples of Motion's physics generator simplified by Ramer–Douglas–Peucker; never `spring().toString()` or `generateLinearEasing`).
- `normalize.ts` — `pnpm tokens:normalize`: rule `hex` (the roadmap's `normalize-hex`) and rule `spring-fallback`, `--check` or `--write` with in-place edits that keep formatting.
- `formats/` — pure functions of the bundle: `css-variables-modes`, `tailwind-theme`, `ts-tokens`, `runtime-ts`, `swift` (Swift sources), `swift-xcassets`, `tokens-studio`, `figma-native`, plus `manifest.json` and, from P1-8, the font files; `verify/` checks the CSS with a cascade simulator and the Swift/TS tables against the IR before anything is written.
- `build.ts` — `pnpm tokens:build` (`--check` compares with disk; see "The build (P1-5)" above). Its presence opens the CI gate `tokens_build`.
- `diff.ts` — classifies token changes against the last tag (removal, type change or axis change = major; addition, value change, deprecation = minor; one level lower while the last release tag is 0.x, ADR-0024 §14) and compares with the declared changeset.
- `terrazzo.config.ts` — lint-only config for `tz lint` (DTCG strictness, `core/consistent-naming` as error). `tz lint` does not detect non-orthogonal resolvers; `lint-orthogonality.ts` asserts `resolver.orthogonal` through `@terrazzo/parser`, sets `permutationLimit` and names the overlapping ids, and `tokens:lint` runs both.
- `docs.test.ts` — checks that the living documents (root `README.md`, `tokens/README.md`, this file, `brands/README.md`, `spec/SCHEMA.md`, `spec/patterns/README.md`, `agent/SKILL.md`) name only existing token paths and emitted names (ADR-0024 §13).

Outputs (the build owns these directories and deletes stale files in them; `config.ts` `OWNED_ROOTS` is the one list, and CI's stale check equals it): `web/packages/tokens/src/generated/` (including `<brand>/fonts/` from P1-8), `swift/Sources/DSTokens/Generated/`, `swift/Sources/DSTokens/Resources/Colors.xcassets/`, `swift/Tests/DSTokensTests/Generated/`, `tokens/export/`, and from P1-8 `swift/Sources/DSTokens/Resources/Fonts/`.

## Conventions the generated code must keep

- `sys.*` emits without the `sys.` prefix; `ref.*` emits with `ref-`; `comp.*` keeps the component name. Public token paths (spec bindings, TypeScript keys, contrast pairs) drop `sys.` only: `color.bg.page`, `comp.button.primary.bg.rest`.
- Pure white and black overlays are emitted as authored (`rgb(255 255 255 / 0.64)`, an sRGB colorset entry or `DSRGBA(.sRGB, 1, 1, 1, 0.64)` in Swift). A `sys` color alias with `app.prism.alpha` is emitted as a literal of its target with that alpha, for example `oklch(0.7517 0.1475 57.6 / 0.12)` for light `color.bg.tint.accent`, never as `var()`. Tokens Studio keeps the alias with a `studio.tokens.modify` alpha (a paid-plan feature); no flavor pre-composites a translucent color, and no flavor color is 8-digit hex (ADR-0024 §12).
- Spring tokens are read from `$extensions["app.prism"].spring`, folded into the token's value so aliases inherit them; only a `transition` token with a literal `$value` may declare one, and aliases never do (ADR-0023, ADR-0024 §4.1). The `transition` `$value` is the fallback for tools that do not understand springs, and `tokens:normalize` keeps its duration equal to the derived settle time.
- References are curly-brace references to whole tokens: a reference to a group with a root token is `{group.$root}`; `{group}` and JSON Pointer `$ref` values fail the build.
- Names are kebab-case; a token whose type differs from a group `$type` on its path carries its own `$type`; a flag is a `number` token (0 or 1) with `app.prism.flag` on every declaration; an alias never declares a folded extension key, except ADR-0020's `alpha`; `comp` tokens are whole-value aliases of `sys` tokens, and `sys` typography tokens alias `ref.type.*` roles (ADR-0024 §2–§5).
- Typography: `fontSize` becomes rem (px / 16) on web and points scaled by the role's `textStyle` on Apple; `letterSpacing` becomes em (Swift `trackingEm`); `lineHeight` stays unitless. The build resolves weights per permutation (`darkWeight` in dark, Increase Contrast floor 400) and derives `boldWeight` for Apple (ADR-0021 §4). `slot`, `numeric`, `textStyle` and `darkWeight` are declared on `ref.type.*` roles only.
- Glass recipes are typed sibling tokens `sys.material.glass.<recipe>.{$root, blur, saturate, edge.start, edge.end, grain, bloom}`, declared only in the light and dark scheme files. `$extensions` carries no material keys, and nothing emits neutral recipe defaults (ADR-0022). The role recipes `fill` and `chip` alias the light recipes in light and the smoked ones in dark, field by field (`material/role-recipe`, ADR-0029 §1.2).
- Web runtime attributes (ADR-0019): `data-ds-color-scheme` and `data-ds-density` on any element; `data-ds-contrast`, `data-ds-transparency`, `data-ds-modality` and `data-ds-motion` on `<html>` only. An absent, empty or unknown value counts as absent, so fallback selectors list every valid value. Without a valid value, each axis follows its media query (density `(any-pointer: coarse)` → regular, modality `not all and (hover: hover) and (pointer: fine)` → touch). Everything comes from `config.ts` `WEB_RUNTIME` and is also emitted as `runtime.ts`; component stylesheets use the generated `ds-*` variants through `@variant`.
- Brands: one `tokens.css` and `tokens.ts` per brand, no brand attribute. Swift carries every repo brand through `DSTokenContext.brand`; colors are `DSColor(brand:transparency:)` members over `Colors.xcassets/<namespace>/`. API shapes are the union over brands (ADR-0020).
