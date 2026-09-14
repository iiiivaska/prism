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

- `resolver.ts` — parses `tokens/prism.resolver.json`, enumerates permutations (brand × platform × colorScheme × density × modality × motion), instantiates Style Dictionary 5.5 per permutation and keeps outputs in memory. Designed to be deleted when Style Dictionary ships native resolver support.
- `transforms/` — `color/css-gamut` (OKLCH → `oklch()` + P3 re-declaration), `color/p3` (`Color(.displayP3, …)` and `.colorset` components via Color.js gamut mapping), `dimension/css`, `dimension/cgfloat`, `duration`, `spring` (settle time, physics triplet, CSS `linear()` via Motion's `spring()`), `normalize-hex`.
- `formats/` — `css-variables-modes`, `tailwind-theme`, `ts-tokens`, `swift-enums`, `swift-xcassets`, `tokens-studio`, `figma-native`.
- `diff.ts` — classifies token changes against the last tag for the release gate.
- `terrazzo.config.ts` — lint-only config for `tz lint` (resolver orthogonality).

## Conventions the generated code must keep

- `sys.*` emits without the `sys.` prefix; `ref.*` emits with `ref-`; `comp.*` keeps the component name.
- Overlay colors (`alpha < 1` in `sys.color.*`) are emitted as-is (`rgb(255 255 255 / 0.64)`, `Color.white.opacity(0.64)`); the composited hex is only for humans in `$description`.
- Spring tokens are read from `$extensions["app.prism"].spring`; the `transition` `$value` is the fallback for tools that do not understand springs.
