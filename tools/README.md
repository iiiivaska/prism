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
| `lint:literals` | `lint/literals.ts` | Literal-values guard (`tokens/README.md`, "Rules" 1): scans `swift/Sources` and `web/packages/*/src` (generated output under `swift/Sources/DSTokens/Generated` and `src/generated` excluded) for hex and numeric colors (`#0a84ff`, `rgb(0 0 0)`, `Color(red:…)`), `px`/`pt` dimensions and font-family names; prints `path:line:column` for each hit and exits 1. It skips comments and scans string contents. `--root <dir>` scans another tree with the same layout. | `contracts` job |

Limits of the literal guard: it is a lexer plus regular expressions, not a parser. It cannot see unit-less numbers such as SwiftUI's `.padding(12)`, which review and the component specs still have to catch. Strings are assumed to be single-line, except for template literals.

## Planned tools

CI calls each script only once its file exists: the `plan` job in `.github/workflows/ci.yml` tests for the file and opens the matching gated step. No workflow edit is needed when a tool lands.

| Folder | Purpose | Script | Ticket | Gate file |
|--------|---------|--------|--------|-----------|
| `tokens/` | Resolver driver and Style Dictionary 5 config; custom transforms (OKLCH to CSS gamut and Display P3, dimension to px/rem/CGFloat, motion to `linear()` spring and `Spring(duration:bounce:)`); custom formats (CSS variables with modes, Tailwind `@theme inline`, TS maps, Swift enums, `.xcassets`, Tokens Studio and Figma-native flavors); `normalize-hex`. Writes `web/packages/tokens/src/generated` and `swift/Sources/DSTokens/Generated` + `Resources`. See ADR-0004 and `tokens/README.md`. | `tokens:build` | P1-3 to P1-5 | `tokens/build.ts` |
| `tokens/` | Terrazzo lint of resolver orthogonality | `tokens:lint` | P1-2 | `tokens/terrazzo.config.ts` |
| `tokens/` | Classify token changes against the last tag and the declared changeset | `tokens:diff` | P1-7 | `tokens/diff.ts` |
| `contrast/` | WCAG ratios for every pair in `tokens/contrast-pairs.json` across brand × colorScheme; thresholds per ADR-0011 | `contrast:check` | P1-6 | `contrast/check.ts` |
| `spec/` | JSON Schema validation of `spec/components/*.yaml` and `spec/patterns/*.yaml`; checks that token paths exist in the built dictionary (`spec/SCHEMA.md`) | `spec:validate` | P2-1 | `spec/validate.ts` |
| `icons/` | Registry schema validation, Phosphor catalog cross-check, codegen for `DSIcon` / `dsIcons` (`spec/icons/README.md`) | `icons:validate` | P2-2 | `icons/validate.ts` |
| `icons-apple/` | Swift package: SF Symbols availability at the minimum OS (macOS job) | `swift run` in the `apple` job | P2-2 | `icons-apple/Package.swift` |
| `parity/` | Reads the specs and both manifests, writes `parity/report.md`, fails on lag for `full`/`adapted` platforms (ADR-0006) | `parity:report` | P2-3 | `parity/report.ts` |
| `licenses/` | Validates `licenses/inventory.json`, fails when a packaged item lacks a permitted license, regenerates `THIRD_PARTY_NOTICES.md` (ADR-0015) | `licenses:check`, `licenses:notices` | P2-4 | `licenses/check.ts` |

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
