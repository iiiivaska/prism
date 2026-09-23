# Icon registry

Agents and components never reference an icon by a vendor name. They use a semantic id from `registry.json` (`nav.back`, `action.add`, `status.warning`), found by tag or category — every entry carries both. The registry maps every id to:

- `web.phosphor` — a Phosphor Icons name (MIT), rendered by `@phosphor-icons/react`, which the consuming app installs; Prism's web package ships names only;
- `apple.symbol` — an SF Symbol name, used only inside apps running on Apple platforms (their license forbids any other use), or `apple.custom` — an image set generated from the Phosphor cuts when no SF Symbol carries the same metaphor.

Weight is a token, not a vendor prop: `icon.weight` ∈ thin / light / regular / medium / bold / heavy maps to a real Phosphor cut and to an SF weight, and carries the **number** a numeric weight token holds. Style is separate: outline / filled / duotone. Size is the px box of `ref.size.icon`, with a measured SF point size beside it.

## Rules

1. No icon without a registry entry. Adding one means adding `label` (the id of the entry's meaning, `icon.<id>`, for search, documentation and an app's own catalog, and never an accessible name: ADR-0032 rule 6), `categories`, `tags`, `since` and both bindings; the schema requires all of them.
2. `apple.symbol` must be available at **iOS, macOS and watchOS 26.0**, the floor of `Package.swift`. That is the exact `name_availability.plist` year key `2025`; key `2025.1` is OS 26.1 and is rejected. A symbol added after that release — an SF Symbols 8 name — is allowed **only** with `minOS` *and* a `fallback` that is itself available at the floor; the primary is then reported as unverifiable on a floor runner, and the fallback is what CI validates (ADR-0013, critic C-21).
3. System chrome on Apple (toolbars, tab bars, navigation, menus) uses SF Symbols through this registry. Content glyphs whose metaphor must be identical on both stacks — the data-viz trend arrows today — use `apple.custom` and render the Phosphor cut from `Icons.xcassets` (critic G-09).
4. `rtlMirror` is **per platform**: `{ "web": true, "apple": false }`. The web flips the glyph under `dir="rtl"`; Apple flips it only when the system does not already, and a symbol the system mirrors — a `backward` / `forward` / `leading` / `trailing` name — must keep `apple: false` or the glyph flips twice. A left/right-named symbol is **not** mirrored by the system, even one CoreGlyphs' `legacy_flippable.plist` lists (measured on the iOS 26.5 simulator and on macOS: `arrow.up.right` draws its left-to-right pixels in a right-to-left layout), so a directional glyph binds the direction-relative symbol — `nav.open` is `arrow.up.forward` — or sets `apple: true`. A glyph the web flips and Apple neither flips nor auto-mirrors fails CI (critic C-24). Names do not tell everything: a few symbols carry a right-to-left drawing of their own that no name announces. `calendar` and `chart.xyaxis.line` draw mirrored, so `object.calendar` and `object.chart` set `rtlMirror.web` for the web to draw what Apple draws and keep `apple: false`, and both validators list the two names beside the direction-relative ones. `swift/Tests/DSSnapshotTests/DSIconBoxTests.swift` measures what every entry draws under RTL on the simulator, so a symbol that list misses fails there.
5. SF Symbol names never appear in the web package, the gallery, the Tokens Studio export or Figma web frames. The generated web artifacts carry no Apple field at all, and `icons:validate` greps the web, gallery and export trees for every dotted symbol name.
6. The registry version equals the system version; a `deprecated` entry carries `replacedBy`, which must be a live id.
7. **A glyph is filled on both stacks or on neither** (ADR-0035). An entry whose SF Symbol has no `.fill` variant at the floor carries `"fill": false`, and `style: filled` then draws its outline on both stacks, in the requested weight: the web draws the weight's cut instead of Phosphor's `fill`, and Apple draws the plain symbol. Phosphor's fill cut of a stroke glyph is the glyph knocked out of a solid shape, so without the mark a filled `status.check` would be a checked Checkbox on the web and a bare tick on Apple. An entry filled by default must have a fill. The generated artifacts carry the mark as `iconRegistry[id].fill` and `DSIconName.hasFill`.

## Sources

`sources` pins both vendors, and both are checked against the machine:

| Field | Meaning | Checked by |
|---|---|---|
| `phosphor.package` | The one open set Prism binds on the web; a second set needs an ADR | the schema (`const`) |
| `phosphor.version` | Must equal the installed `@phosphor-icons/core` | `icons:validate` |
| `sfSymbols.release` | The SF Symbols release that ships with the floor OS (7 with OS 26) | reported in the run line |
| `sfSymbols.maxYear` | The newest allowed availability year key (`2025`) | `icons-validate` (macOS) |
| `sfSymbols.osFloor` | The deployment floor every symbol must be available at | `icons-validate` (macOS) |

## Validation

`pnpm icons:validate` (Node, every platform, CI `contracts` job):

- JSON Schema (Ajv 2020) against `registry.schema.json`;
- every `web.phosphor` against the `icons` catalog of `@phosphor-icons/core` — an unknown name fails with the near names, a name Phosphor keeps only as an alias warns and names the canonical one;
- the pinned Phosphor version against the installed one;
- labels, duplicate `apple.custom` bindings, deprecations, the weight ladder and its Bold Text step, the style cuts, rule 4's `rtlMirror` rules, which are name-based, and rule 7's filled default without a fill;
- `sys.icon.weight*` against the weight numbers and `ref.size.icon.*` against the px boxes, so a token change that outruns the registry fails (critic C-23);
- rule 5 over `web/`, `gallery/`, `tokens/export/`, `spec/icons/generated/` and `docs/direction-board/`;
- the generated artifacts, rendered and compared byte for byte with the committed files. `pnpm icons:build` writes them.

`swift run --package-path tools/icons-apple icons-validate spec/icons/registry.json` (macOS, CI `apple` job):

- every `apple.symbol` and `fallback` against `CoreGlyphs.bundle/…/name_availability.plist` at the floor, with the year → release table, and `NSImage(systemSymbolName:)` as a runtime smoke test;
- rule 7: an entry without `"fill": false` whose symbol (or `fallback`) has no `.fill` variant at the floor fails, and an entry marked `"fill": false` whose symbol has one is reported as a warning;
- rule 4 again, by name (`legacy_flippable.plist` is not read: its left/right names are not mirrored);
- the measured point size of every icon box (below);
- that the committed `DSIconName` covers exactly the registry's ids;
- and, before all of it, the fixtures in `tools/icons-apple/Fixtures`, so the availability gate cannot rot into a no-op.

## Generated artifacts

Written by `pnpm icons:build` (tools/icons), committed, and byte-identical across runs:

| Path | What |
|---|---|
| `web/packages/react/src/generated/icons.ts` | `iconRegistry`, `iconWeights`, `iconStyles`, `iconSizes` and the `IconName` union, exported from `@iiiivaska/prism-react` next to the `Icon` component that reads them (ADR-0019 §6, critic G-20) |
| `swift/Sources/DSIcons/Generated/DSIconName.swift` | `DSIconName`, `DSIconWeight`, `DSIconStyle`, `DSIconSize` in the `DSIcons` target; the SwiftUI view `DSIcon` is Phase 3 |
| `swift/Sources/DSIcons/Resources/Icons.xcassets` | one image set per Phosphor-derived icon × cut, `preserves-vector-representation` and `template-rendering-intent: template`, with the Phosphor licence beside it (critic G-09) |
| `spec/icons/generated/tokens-studio/` | the icon list as a Tokens Studio set of `other` tokens holding Phosphor names |

## Weight mapping table

| `icon.weight` | Number | Phosphor cut | SF weight | Stroke at 24 px | Under Bold Text |
|---|---|---|---|---|---|
| thin | 200 | thin | thin | 0.75 | light |
| light | 300 | light | light | 1.125 | regular |
| regular | 400 | regular | regular | 1.5 | medium |
| medium | 500 | bold | medium | 2.25 | bold |
| bold | 700 | bold | bold | 2.25 | heavy |
| heavy | 800 | bold | heavy | 2.25 | heavy |

Default weight: `regular`. The references use thin/light for large decorative icons and regular for controls.

- **The numbers are the table `sys.icon.weight` and `sys.icon.weight-display` resolve through** (critic C-23): 400 is `regular`, 200 is `thin`. Each number is the font-weight number of the SF weight of the same name, so the numeric token and the SF weight never disagree. Ultralight (100) is not a Prism weight.
- **Medium renders the Phosphor bold cut.** Phosphor draws four cuts and has no medium; bold reads like SF medium at control sizes, and it makes the Bold Text step visible on the web as well.
- **Bold Text** steps the weight one rung up the ladder, on iOS, iPadOS and watchOS only (`legibilityWeight == .bold`); macOS and the web have no such setting (ADR-0021 §3). Above `medium` the web saturates at the bold cut, which Phosphor's four cuts impose.

## Size mapping table

| `size.icon` | Token | px box | SF point size | SF scale |
|---|---|---|---|---|
| xs | `ref.size.icon.xs` | 12 | 10 | medium |
| sm | `ref.size.icon.sm` | 16 | 14 | medium |
| md | `ref.size.icon.md` | 20 | 18 | medium |
| lg | `ref.size.icon.lg` | 24 | 21 | medium |

The point size is the one whose rendered `circle` at that scale is the box height within 1 pt, measured with `NSImage.SymbolConfiguration` on macOS 26.6 and re-measured by `icons-validate` on every run (critic C-23). The values are the Large content size, and they hold at every content size: Icon's box does not scale with Dynamic Type (`spec/components/Icon.yaml` `accessibility.dynamicType`), so neither does the point size drawn in it. `ref.size.icon.ring` (44 px) is a container, not a glyph box, and has no point size.
