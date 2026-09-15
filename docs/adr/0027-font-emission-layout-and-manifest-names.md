# ADR-0027: Font emission layout and manifest CSS names follow the build

- Status: accepted
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #27
- Amends: ADR-0021 (§11 "Emission": the web folder layout and the Apple deduplication rule), ADR-0024 (§13.3: which manifest names a documented `--ds-…` property is checked against)

## Context

P1-5 and the P1-8 emission implemented three details differently from the ADR text, recorded in `tools/tokens/ARCHITECTURE.md` §16.3 for a ruling (the owner delegated it):

1. **Web font layout.** ADR-0021 §11 lists a brand's web font files flat in `web/packages/tokens/src/generated/<brand>/fonts/`, with "the `OFL.txt`". The reference brand serves two families (Onest and JetBrains Mono) under two different license files, which one flat folder cannot hold under one name.
2. **Apple deduplication.** ADR-0021 §11 says copies into `swift/Sources/DSTokens/Resources/Fonts/<family-dir>/` are "deduplicated by SHA-256". Each brand's generated `DSBrand` face names its own resource path, so the build deduplicates by destination path: the same bytes at the same `<family-dir>/<file>` share one copy, different bytes at a taken path fail (`fonts/path-collision`), and the same bytes under two paths would be copied twice. Only `prism` bundles fonts on Apple today, so no repository brand reaches the last case.
3. **Manifest CSS names.** ADR-0024 §13.3 accepts a documented `--ds-…` property when it is "a manifest `css` name, or one plus a derived suffix". A typography role and an object-form stroke style declare only derived properties, so no base property exists for them, and a color takes no derived suffix. The manifest lists every declared custom property of a token in `cssVars` and sets `css` to null when there is no base property (ARCHITECTURE §9.6).

## Decision

1. **Web**: a brand's web fonts live in `web/packages/tokens/src/generated/<brand>/fonts/<family-dir>/`, one folder per family (the family's folder name under `brands/<brand>/fonts/`), each holding `<family-kebab>-wght.woff2` and that family's `OFL.txt`; `<brand>/fonts/fonts.css` refers to `./<family-dir>/<family-kebab>-wght.woff2`.
2. **Apple**: font files are copied into `Resources/Fonts/<family-dir>/` once per destination path; different bytes at one path fail the build with `fonts/path-collision`. Deduplication by content across different paths is not done.
3. **Documented CSS names**: `docs.test.ts` accepts a backticked `--ds-…` property exactly when it appears in some token's manifest `cssVars`; `css` stays the base property or null.

## Alternatives considered

- **Flat web folder with renamed licenses** (`OFL-onest.txt`): keeps ADR-0021's folder shape but invents license file names that no upstream uses and breaks the "one folder, one family, one license" rule the Apple side already follows.
- **Content deduplication on Apple**: saves bytes only when two brands bundle identical files under different folder names, which no brand does; it would force one brand's `DSBrand` face to point into another brand's folder.
- **Keep "css plus derived suffix"**: typography and dashed strokes have no base name to add a suffix to, so the rule could not accept names the build really emits.

## Consequences

- The stale check and the 2 MiB `DSTokens` font budget (ADR-0021 §11, ADR-0020) count the files exactly as emitted.
- A future brand that bundles the same font under a different folder name pays for a second copy; rename the folder to share it.

## Rules that follow

1. Every `<brand>/fonts/<family-dir>/` folder on the web and every `Resources/Fonts/<family-dir>/` folder on Apple holds one family and exactly one `OFL.txt` (`fonts/shared-folder`).
2. Two brands writing different bytes to the same Apple font path fail the build (`fonts/path-collision`).
3. A documented `--ds-…` property that is in no manifest `cssVars` fails `docs.test.ts`.
