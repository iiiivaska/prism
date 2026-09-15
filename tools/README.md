# tools

Build and check tooling for Prism, in TypeScript, invoked through the `@iiiivaska/prism-tools` scripts in `package.json` (from the repository root: `pnpm --filter @iiiivaska/prism-tools <script>`). Each planned folder is a ticket in `docs/roadmap.md`.

## How tools run

- **From source on Node 24.** `node lint/literals.ts` runs the TypeScript file directly through Node's native type stripping: no build step, no loader, no `--experimental-strip-types` flag. The workspace pins Node 24 in `.node-version`.
- **Only syntax Node can strip.** `tsconfig.json` enforces it: `erasableSyntaxOnly` (no `enum`, `namespace` or parameter properties), `verbatimModuleSyntax` (type-only imports use `import type`), `allowImportingTsExtensions` (relative imports end in `.ts`), `module: nodenext`, `noEmit`. `pnpm typecheck` runs `tsc` over the package, which only checks types.
- **Tests** use Vitest 4 (`vitest.config.ts`): `**/*.test.ts` next to the code they test, with fixture trees under `<tool>/fixtures/`, which tsc and ESLint skip. `pnpm test` runs them.
- **No tsdown config (P0-2 decision).** The roadmap listed "TypeScript + tsdown config" for this package. Tools are private, never published and always run from source, so a bundle would be a second, possibly stale copy of the same code. Type safety comes from `tsc`, not from a bundler. Add tsdown only if a tool has to ship outside the repository (for example as a CLI for consuming apps); the published web packages under `web/packages/` do build with tsdown.
- **Dependencies** come from the workspace catalog (`catalog:` in `package.json`, versions in `pnpm-workspace.yaml`). Style Dictionary, Terrazzo, Color.js, Ajv, yaml and Motion are installed for the Phase 1 and Phase 2 tools; nothing uses them yet.

## What exists now

| Script | File | What it does | CI |
|--------|------|--------------|----|
| `typecheck` | `tsconfig.json` | `tsc` over every tool and test | `web` job, via root `pnpm typecheck` |
| `test` | `vitest.config.ts` | Vitest over `**/*.test.ts` | `web` job, via `pnpm -r test` |
| `lint:literals` | `lint/literals.ts` | Literal-values guard (`tokens/README.md`, "Rules" 1): scans `swift/Sources` and `web/packages/*/src` (generated output under `swift/Sources/DSTokens/Generated` and `src/generated` excluded) for hex and numeric colors (`#0a84ff`, `rgb(0 0 0)`, `Color(red:…)`), `px`/`pt` dimensions and font-family names; prints `path:line:column` for each hit and exits 1. It skips comments and scans string contents. `--root <dir>` scans another tree with the same layout. The kinds `runtime` (ADR-0019 rule 1, P1-5), `motion` (ADR-0023 §12, P1-4), `typography` (ADR-0021 §12, P1-4), `material` (ADR-0022 rule 2, P3-1/P3-4) and `brand` (ADR-0020 rule 13, P3-1/P3-2) join it when their tickets land, sharing one pattern table so no name is reported twice. | `contracts` job |
| `lint:reference-copy` | `lint/reference-copy.ts`, `lint/reference-copy.denylist.txt` | Reference-copy guard (ADR-0015 rules 1–3, critic R-01): scans `spec/`, `tokens/`, `brands/`, `agent/`, `web/packages/*/src`, `web/apps/*`, `swift/Sources`, `swift/Tests`, `gallery/` and `docs/research/fonts/` for the strings in the denylist, which is derived from the `docs/research/refs-*.md` analyses; prints `path:line` for each hit and exits 1 (2 on a usage, denylist or layout error). Matching is case-insensitive and ignores spacing and line breaks; comments count. HTML and SVG are also read as visible text (tags removed, entities decoded), Markdown also without emphasis and code delimiters, and every file also with its backslash escapes decoded (`\u0412`, `\'`). Exempt: the analyses that quote the copy on purpose (`refs-*.md`, `visual-dna.md`, `critic.md`) and the denylist. Skipped: `node_modules`, `.git` and build output (`dist`, `.turbo`, `storybook-static`, `test-results`, `playwright-report`, `.build`, `DerivedData`). `--root <dir>` scans another tree with the same layout and `--denylist <file>` reads another list; the tests use an invented one, so no reference copy is committed as test data. | `contracts` job |

Limits of the literal guard: it is a lexer plus regular expressions, not a parser. It cannot see unit-less numbers such as SwiftUI's `.padding(12)`, which review and the component specs still have to catch. Strings are assumed to be single-line, except for template literals.

Limits of the reference-copy guard: it finds listed strings, not paraphrased or translated copy or a recognizable composition; ADR-0015's reference-distance review still covers those. Binary files are skipped, so text baked into a PNG is out of reach: re-render images from cleaned sources. Strings assembled at run time, or encoded other than by backslash escapes (percent-encoding, base64), pass unseen. Files outside the scanned folders, such as `tools/`, the rest of `docs/`, root files and `web/packages/*` outside `src`, are not checked. Entries are added by hand: a new reference or analysis needs new entries.

## Planned tools

CI calls each script only once its file exists: the `plan` job in `.github/workflows/ci.yml` tests for the file and opens the matching gated step. No workflow edit is needed when a tool lands.

| Folder | Purpose | Script | Ticket | Gate file |
|--------|---------|--------|--------|-----------|
| `tokens/` | Offline DTCG 2025.10 schema validation against vendored copies checked by SHA-256 (ADR-0024 §10); replaces the download in the ungated CI schema step | `tokens:validate` | P1-1 | — (ungated) |
| `tokens/` | Resolver driver and Style Dictionary 5 config; custom transforms (OKLCH to CSS gamut and Display P3, dimension to px/rem/CGFloat, motion to `linear()` spring and `Spring(duration:bounce:)`); custom formats (CSS variables with modes, Tailwind `@theme inline`, TS maps, the `runtime.ts` table, Swift enums, `.xcassets`, Tokens Studio and Figma-native flavors, font files from P1-8); `normalize-hex`. Writes the owned roots of `tools/tokens/ARCHITECTURE.md` §9.0, including `tokens/export/`. See ADR-0004 and `tokens/README.md`. | `tokens:build` | P1-3 to P1-5 | `tokens/build.ts` |
| `tokens/` | Terrazzo lint (DTCG strictness, kebab-case names as errors) plus resolver orthogonality through `@terrazzo/parser`; `tokens:build` repeats it authoritatively (ADR-0024 §9) | `tokens:lint` | P1-2 | `tokens/terrazzo.config.ts` |
| `tokens/` | Classify token changes against the last tag and the declared changeset | `tokens:diff` | P1-7 | `tokens/diff.ts` |
| `contrast/` | WCAG ratios for every pair in `tokens/contrast-pairs.json` across brand × colorScheme; thresholds per ADR-0011 | `contrast:check` | P1-6 | `contrast/check.ts` |
| `spec/` | JSON Schema validation of `spec/components/*.yaml` and `spec/patterns/*.yaml`; checks that token paths exist in the built dictionary, that bindings are spec-bindable `sys` roles or the spec's own `comp` tokens, that every `comp` token is bound and that prose paths resolve (`spec/SCHEMA.md`, ADR-0024 §5) | `spec:validate` | P2-1 | `spec/validate.ts` |
| `icons/` | Registry schema validation, Phosphor catalog cross-check, codegen for the `DSIconName` enum (Swift; the `DSIcon` view keeps its name) / `iconRegistry` (TypeScript) (`spec/icons/README.md`) | `icons:validate` | P2-2 | `icons/validate.ts` |
| `icons-apple/` | Swift package: SF Symbols availability at the minimum OS (macOS job) | `swift run` in the `apple` job | P2-2 | `icons-apple/Package.swift` |
| `parity/` | Reads the specs and both manifests, writes `parity/report.md`, fails on lag for `full`/`adapted` platforms (ADR-0006) | `parity:report` | P2-3 | `parity/report.ts` |
| `licenses/` | Validates `licenses/inventory.json`, fails when a packaged item lacks a permitted license, regenerates `THIRD_PARTY_NOTICES.md` (ADR-0015) | `licenses:check`, `licenses:notices` | P2-4 | `licenses/check.ts` |
| `fonts/` | Checks every font file a repo brand serves: file and `OFL.txt`, SHA-256 and version against `brand.json`, Russian Cyrillic incl. Ё/ё, tabular digits (equal 0–9 advances with or without GSUB `tnum`), PostScript instance names, and the 2 MiB Apple bundle budget (ADR-0021 §11, ADR-0020 rule 14) | `fonts:check` | P1-8 | `fonts/check.ts` (P1-8 adds the gate) |

## DTCG schema validation

CI validates every token file, brand file and the resolver against the DTCG 2025.10 schemas. `ajv-cli` cannot load a schema from a URL, so the schemas are downloaded first. They are self-contained bundles (every sub-schema is embedded with its own `$id`), so no `-r` is needed. To run it locally:

```bash
mkdir -p "$TMPDIR/dtcg" && for s in format resolver; do
  curl -fsSL -o "$TMPDIR/dtcg/$s.json" "https://www.designtokens.org/schemas/2025.10/$s.json"
done
npx --yes -p ajv-cli@5.0.0 -p ajv-formats@3.0.1 ajv validate --spec=draft7 -c ajv-formats \
  -s "$TMPDIR/dtcg/format.json" -d "tokens/**/*.tokens.json" -d "brands/*/brand.tokens.json"
npx --yes -p ajv-cli@5.0.0 -p ajv-formats@3.0.1 ajv validate --spec=draft7 -c ajv-formats \
  -s "$TMPDIR/dtcg/resolver.json" -d tokens/prism.resolver.json
```

From P1-1 (ADR-0024 §10), CI runs `pnpm --filter @iiiivaska/prism-tools tokens:validate` instead (Ajv 8 with `ajv-formats` from the lockfile, offline, one Ajv instance per schema). The schemas are vendored in `tools/tokens/schema/dtcg-2025.10/` with a `SHA256SUMS` file and the W3C license text, and the script checks the bytes before it validates. To refresh them, download `https://www.designtokens.org/schemas/2025.10/{format,resolver}.json`, update `SHA256SUMS` and review the diff in its own change.
