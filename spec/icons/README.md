# Icon registry

Agents and components never reference an icon by a vendor name. They use a semantic id from `registry.json` (`nav.back`, `action.add`, `status.warning`). The registry maps every id to:

- `web.phosphor` — a Phosphor Icons name (MIT), rendered by `@phosphor-icons/react` and bundled as SVG in the web package;
- `apple.symbol` — an SF Symbol name, used only inside apps running on Apple platforms (their license forbids any other use), or `apple.custom` — a symbol set generated from Phosphor's raw stroked sources when no SF Symbol fits.

Weight is a token, not a vendor prop: `icon.weight` ∈ thin / light / regular / medium / bold / heavy maps to a real Phosphor cut (thin 8, light 12, regular 16, bold 24 units on the 256 grid) and to an SF weight (ultralight / light / regular / medium / bold / heavy). Style is separate: outline / filled / duotone.

## Rules

1. No icon without a registry entry. Adding one means adding `label` (an i18n key), both bindings, `since`, and tags.
2. `apple.symbol` must be available at iOS 26 (SF Symbols 7). Symbols new in SF Symbols 8 / OS 27 need `minOS` and a `fallback` until the system floor is raised.
3. System chrome on Apple (toolbars, tab bars, navigation) uses SF Symbols through this registry. Product icons that must look identical everywhere use `apple.custom` generated from Phosphor.
4. `rtlMirror: true` flips the glyph in right-to-left layouts on both stacks.
5. SF Symbol names never appear in the web package, the gallery, the Tokens Studio export or Figma web frames.

## Validation (tools/icons)

- Node: JSON Schema (Ajv) + cross-check of every `web.phosphor` against the `icons` export of `@phosphor-icons/core` (alias hits warn), duplicate ids, deprecations without `replacedBy`.
- macOS runner: every `apple.symbol` checked against `CoreGlyphs.bundle/…/name_availability.plist` and a `NSImage(systemSymbolName:)` nil smoke test; custom symbol sets validated by an Xcode build.
- Codegen: `DSIcon` enum (Swift), `dsIcons` const map (TypeScript), icon id list for Tokens Studio.

## Weight mapping table

| `icon.weight` | Phosphor cut | SF weight | Stroke at 24 px |
|---|---|---|---|
| thin | thin | ultralight | 0.75 |
| light | light | light | 1.125 |
| regular | regular | regular | 1.5 |
| medium | regular | medium | 1.5 |
| bold | bold | bold | 2.25 |
| heavy | bold | heavy | 2.25 |

Default weight: `regular`. The references use thin/light for large decorative icons and regular for controls.
