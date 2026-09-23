# tools/icons-apple

The macOS half of the icon gate (roadmap P2-2, ADR-0013 decision 5). A separate SwiftPM package, not a target of the root `Prism` package: it links AppKit and reads `/System`, and nothing a consumer ships depends on it.

```
swift run --package-path tools/icons-apple icons-validate spec/icons/registry.json
```

Flags: `--catalog <dir>` reads the SF Symbols catalog from another `CoreGlyphs.bundle/Contents/Resources`, `--repo-root <dir>` names the tree that holds the generated `DSIconName.swift`, `--no-self-test` skips the fixture round, `--json` prints the issues as JSON. Exit codes: 0 clean, 1 an issue, 2 usage.

## What it checks

| Code | Rule |
|---|---|
| `sf/unknown` | the name is not in this system's SF Symbols catalog: a misspelling, or a symbol added after the release that ships with the floor OS |
| `sf/newer-than-floor` | the name exists but its availability year maps above the floor (year `2025.1` is OS 26.1, while the floor is 26.0) |
| `sf/unverifiable` | a warning: a symbol declared `minOS` above the floor that this catalog cannot see; its validated fallback carries the render until the floor moves (critic C-21) |
| `sf/min-os-below-floor`, `sf/min-os-on-custom`, `sf/fallback-equals-symbol` | the `minOS` / `fallback` pair itself |
| `sf/fill-missing` | an entry that has a filled drawing — no `"fill": false` — whose symbol, or its `fallback`, has no `.fill` variant available at the floor: Apple would draw the plain symbol where the web draws Phosphor's fill cut (ADR-0035) |
| `sf/fill-declined` | a warning: an entry marked `"fill": false` whose symbol does have a `.fill` variant, so both stacks draw its outline for `filled` without needing to |
| `sf/smoke` | `NSImage(systemSymbolName:)` is nil for a name the catalog lists |
| `rtl/double-mirror` | `rtlMirror.apple` on a symbol the system already mirrors: a `backward` / `forward` / `leading` / `trailing` name, or one of the few symbols SF Symbols draws right to left by itself (`Checks.systemLocalized`: `calendar`, `chart.xyaxis.line`) |
| `rtl/missing-mirror` | the web flips the glyph and Apple neither flips it nor auto-mirrors it. A left/right name counts as not mirrored even when CoreGlyphs' `legacy_flippable.plist` lists it: measured on the iOS 26.5 simulator and on macOS, `arrow.up.right` draws its left-to-right pixels in a right-to-left layout, so the tool does not read that list |
| `size/measured` | the registry's SF point size no longer fills its px box (critic C-23) |
| `enum/stale` | the committed `DSIconName` does not cover exactly the registry's ids |

The Phosphor catalog, the schema and the codegen are the Node half (`pnpm icons:validate`, `pnpm icons:build`), which runs on every platform and owns every generated file — including `DSIconName.swift`, as the token build owns the generated Swift of `DSTokens`.

## Fixtures

`Fixtures/` holds one legal registry per rule, each with a single deliberate fault, and `expectations.json` names the code each must trip. The tool runs that round **before** it validates the registry it was given, so the availability gate proves itself on every CI run: a fixture that stops failing fails the job. `valid.json` must pass, and `sf8-with-fallback.json` must pass with the `sf/unverifiable` warning.

`missing-mirror-legacy-flippable.json` binds `arrow.up.right`, a name `legacy_flippable.plist` lists, to a glyph the web flips, and must still trip `rtl/missing-mirror`; `double-mirror.json` sets `rtlMirror.apple` on `arrow.up.forward`, which the system mirrors itself. `system-localized.json` binds `calendar`, whose name is not direction-relative but which the system draws mirrored, to a glyph the web flips, and must pass; `double-mirror-system-localized.json` sets `rtlMirror.apple` on it too, and must trip `rtl/double-mirror`.

`fill-missing.json` binds a filled-by-default entry to a symbol with no fill variant, and `fill-undeclared.json` is `valid.json` with the `"fill": false` of its chevron removed; both must trip `sf/fill-missing`. Every other fixture marks its fill-less symbols `"fill": false`, so it carries only its own fault.

`newer-than-floor.json` and `sf8-bad-fallback.json` use `air.conditioner`, a real symbol whose year is `2025.1` (OS 26.1). `sf8-only-symbol.json` and `sf8-with-fallback.json` use `person.badge.sparkles`, a name SF Symbols 7 does not carry: from a floor runner every post-floor symbol looks exactly like this, which is what makes the SF Symbols 8 policy checkable before OS 27 ships.

## macOS version

The tool reads whatever catalog the host has and reports its newest year key in the run line. On a host newer than the floor it can still verify everything at the floor, because availability is a property of the year key, not of the host. A host **older** than the floor would report symbols as unknown; CI runs `macos-26`.
