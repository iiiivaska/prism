# tools/tokens

## What exists today

| File | Role |
|------|------|
| `seed-ref-tokens.py` | Generates `tokens/ref/*.tokens.json` (primitives) from the reference-brand values in `docs/research/visual-dna.md`: neutral and accent ramps with computed OKLCH components and hex fallbacks, status and series colors, vivid gradients, dimension scales, opacity steps, typography roles, motion (durations, easings, springs with the `app.prism.spring` extension), shadow primitives. |
| `seed-sys-tokens.py` | Generates `tokens/sys/**` (semantic layer) as aliases into `ref.*` or white/ink alpha overlays: light and dark schemes, increased-contrast and reduced-transparency deltas, density, modality, motion (default / reduced), platform, and `base` (context-independent). Also the compact `tokens/comp/*` seeds were written by the same session for the vertical-slice components. |

Both scripts are **bootstraps**: they encode the DNA numbers once so the token files are consistent and schema-valid. After the first review the JSON files become the source of truth and the scripts are deleted or kept only as documentation of provenance. Re-running them overwrites hand edits.

Validation used during the blueprint (the CI step `tokens:validate` reproduces it):

```bash
npx -p ajv-cli@5 -p ajv-formats@3 ajv validate --spec=draft7 -c ajv-formats \
  -s https://www.designtokens.org/schemas/2025.10/format.json -d "tokens/**/*.tokens.json"
npx -p ajv-cli@5 -p ajv-formats@3 ajv validate --spec=draft7 -c ajv-formats \
  -s https://www.designtokens.org/schemas/2025.10/resolver.json -d tokens/prism.resolver.json
```

## What the P1 tickets add (ADR-0004)

The complete design, including module map, IR types, every transform and format with output samples, and the order of work per ticket, is [`ARCHITECTURE.md`](ARCHITECTURE.md). In short:

- `source/` — parses the resolver and every token file once (with line numbers) and runs the source checks: write-set disjointness and ownership per modifier, context completeness, brand paths, dead writes, group `$type` conflicts. Survives the resolver's deletion.
- `resolver.ts` — only enumerates the permutations (brand × platform × colorScheme × density × modality × motion, 432 today) and merges each one with DTCG semantics (a later token replaces the earlier one wholesale). Designed to be deleted when Style Dictionary ships native resolver support.
- `engine/` — one Style Dictionary 5.5 instance per permutation, in memory and strictly sequential: Prism preprocessors for reference checks and DTCG type precedence, one transitive transform `prism/normalize` that turns every value into a plain-data IR, `getPlatformTokens('ir')`. No Style Dictionary formats or built-in transforms.
- `ir/` — the IR bundle over all permutations, dependency analysis and an exhaustive composition proof, naming, color math.
- `transforms/` — pure renderers named after the roadmap: `color/css-gamut` (sRGB-mapped `oklch()` + P3 re-declaration), `color/p3` (Display P3 for Swift and `.colorset` components via Color.js gamut mapping), `dimension/css`, `dimension/cgfloat`, `duration`, `spring` (settle time, physics triplet, CSS `linear()` from Motion's `spring()` generator).
- `normalize.ts` — `pnpm tokens:normalize`: rule `hex` (the roadmap's `normalize-hex`) and rule `spring-fallback`, `--check` or `--write` with in-place edits that keep formatting.
- `formats/` — pure functions of the bundle: `css-variables-modes`, `tailwind-theme`, `ts-tokens`, `swift-enums` (Swift sources), `swift-xcassets`, `tokens-studio`, `figma-native`, plus `manifest.json`; `verify/` checks the CSS with a cascade simulator and the Swift/TS tables against the IR before anything is written.
- `build.ts` — `pnpm tokens:build` (`--check` compares with disk). Lands with P1-5 because its presence opens the CI gate.
- `diff.ts` — classifies token changes against the last tag (removal, type change or axis change = major; addition, value change, deprecation = minor) and compares with the declared changeset.
- `terrazzo.config.ts` — lint-only config for `tz lint` (DTCG strictness). `tz lint` does not detect non-orthogonal resolvers; `lint-orthogonality.ts` asserts `resolver.orthogonal` through `@terrazzo/parser`, and `tokens:lint` runs both.

Outputs (the build owns these directories and deletes stale files in them): `web/packages/tokens/src/generated/`, `swift/Sources/DSTokens/Generated/`, `swift/Sources/DSTokens/Resources/Colors.xcassets/`, `swift/Tests/DSTokensTests/Generated/`, `tokens/export/`.

## Conventions the generated code must keep

- `sys.*` emits without the `sys.` prefix; `ref.*` emits with `ref-`; `comp.*` keeps the component name. Public token paths (spec bindings, TypeScript keys, contrast pairs) drop `sys.` only: `color.bg.page`, `comp.button.primary.bg.rest`.
- Overlay colors (`alpha < 1` in `sys.color.*`) are emitted as-is: CSS `rgb(255 255 255 / 0.64)`, an sRGB colorset entry or `DSRGBA(.sRGB, 1, 1, 1, 0.64)` in Swift; the composited hex is only for humans in `$description`.
- Spring tokens are read from `$extensions["app.prism"].spring`, folded into the token's value so aliases inherit them; the `transition` `$value` is the fallback for tools that do not understand springs, and `tokens:normalize` keeps its duration equal to the derived settle time.
- A reference to a group with a root token is `{group.$root}`; `{group}` fails the build.
- Web runtime attributes are `data-ds-color-scheme` and `data-ds-density` (on any element), and `data-ds-contrast`, `data-ds-transparency`, `data-ds-modality` and `data-ds-motion` (root only); media queries apply when an attribute is absent (`ARCHITECTURE.md` §9.1).
