# tools

Build and check tooling, all TypeScript on Node ≥ 22.12, invoked through `@iiiivaska/prism-tools` scripts (see `package.json`). Each folder is a ticket in `docs/roadmap.md`; none is implemented yet.

| Folder | Purpose | Spec |
|--------|---------|------|
| `tokens/` | Resolver driver + Style Dictionary 5 config, custom transforms (OKLCH → CSS gamut / Display P3, dimension → px/rem/CGFloat, motion → `linear()` spring and `Spring(duration:bounce:)`), custom formats (CSS variables with modes, Tailwind `@theme inline`, TS maps, Swift enums, `.xcassets`, Tokens Studio flavor, Figma-native flavor), `normalize-hex`, `diff` | ADR-0004, `tokens/README.md` |
| `contrast/` | WCAG ratios for every pair in `tokens/contrast-pairs.json` across brand × colorScheme contexts; thresholds per ADR-0011 | ADR-0011 |
| `spec/` | JSON Schema validation of `spec/components/*.yaml` and `spec/patterns/*.yaml`; checks token paths exist in the built dictionary | `spec/SCHEMA.md` |
| `icons/` | Registry schema validation; Phosphor catalog cross-check; SF Symbols availability (macOS job); codegen for `DSIcon` / `dsIcons` | `spec/icons/README.md` |
| `parity/` | Reads specs and both manifests; writes `tools/parity/report.md` and fails on lag for `full`/`adapted` platforms | ADR-0006 |
| `licenses/` | Validates `licenses/inventory.json`, fails when a packaged item lacks a permitted license, regenerates `THIRD_PARTY_NOTICES.md` | ADR-0015 |
