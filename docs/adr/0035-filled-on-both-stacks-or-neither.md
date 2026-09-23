# ADR-0035: A glyph is filled on both stacks or on neither

- Status: accepted
- Date: 2026-09-23
- Decision record entry: docs/decisions.md #35
- Amends: ADR-0013 (decision 4)

## Context

ADR-0013 decision 4 maps the `filled` style to Phosphor's `fill` cut on the web and to the SF Symbol's `.fill` variant on Apple. The registry held one guard on that mapping: `tools/icons-apple` failed `sf/fill-missing` for an entry that is *filled by default* and whose symbol has no fill variant. Every other entry could be drawn `filled`, and nothing compared what the two stacks then draw.

The icon-metaphor audit of 2026-09-23 compared all 51 entries side by side on both stacks. Its verification also rendered each entry in its `filled` style. It measured `DSIcon` on macOS and the built web `Icon` server-rendered, and it read each fill variant's availability from CoreGlyphs' `name_availability.plist`. **27 of the 49 entries that bind an SF Symbol have no fill variant at the floor.** For them SwiftUI's `.symbolVariant(.fill)` falls back to the plain symbol, while the web draws Phosphor's fill cut. For a glyph that is only strokes, Phosphor's fill cut is not the same drawing filled in. It is the glyph knocked out of a solid shape:

| Entry | Apple, `filled` | Web, `filled` |
|---|---|---|
| `status.check` | a bare tick | a solid rounded square with the tick knocked out: a checked Checkbox (`spec/components/Checkbox.yaml` summary) |
| `action.remove` | a bar | a bar in a solid square: the mixed-state Checkbox |
| `action.add`, `nav.close`, `nav.menu` | the plain glyph | the glyph in a solid square |
| `nav.more` | three dots | dots knocked out of a pill |
| `object.chart` | a line chart | a chart in a solid box |
| `nav.back`, `nav.forward`, `nav.up`, `nav.down` | a chevron | a solid triangle |
| `object.signal` | arcs | a solid wedge |

The audit's own test calls a pair drift when a reader would name the two glyphs differently. Several of these rows are drift by that test, and `status.check` is the worst of them. Filled is a sanctioned style for it, since `Icon.yaml` reserves `filled` for status glyphs. The drift is latent: no spec example draws `filled` on any of the 27 entries, and no committed baseline does. It would have appeared with the first Checkbox, tab bar or status row that asked for one.

## Decision

1. **An entry either has a filled drawing or is marked `fill: false`.** The field is a registry property of the entry, so the web artifacts carry it without naming an SF Symbol (ADR-0013 rule 5): `iconRegistry[id].fill` on the web, `DSIconName.hasFill` on Apple. An entry needs `fill: false` exactly when its SF Symbol has no fill variant available at the floor, and for a `minOS` symbol the same holds for its fallback. An entry bound to a Phosphor image set has the fill cut on both stacks and needs no mark.
2. **`style: filled` on an entry marked `fill: false` draws its outline, on both stacks, at the requested weight.** The web draws the weight's cut instead of Phosphor's `fill`, and Apple draws the plain symbol, or the image set's weight cut. The decision is in one function per stack, `drawnStyle` in `web/packages/react/src/icon/weight.ts` and `DSIconAppearance.drawnStyle(_:for:)` on Apple. Each is the other's twin, and every glyph in the system goes through it, because Button, Card and IconButton draw their glyphs through Icon. Apple no longer relies on SwiftUI's fallback, which an image set would not have.
3. **The registry is checked on both halves.** `tools/icons-apple` fails `sf/fill-missing` for an entry without `fill: false` whose symbol has no fill variant at the floor (this generalizes the old default-style check). It warns `sf/fill-declined` for an entry marked `fill: false` whose symbol has one. `pnpm icons:validate` fails `style/default-without-fill` for an entry that is filled by default but marked `fill: false`. The schema allows only `false`, so absence is the one way to say "has a fill".

## Alternatives considered

- **Rebind one side of each entry.** This lost because neither binding contradicts its entry's label or tags: the check is a check on both stacks. No Phosphor cut draws a stroke glyph's fill as the plain strokes. Binding Apple to an enclosed symbol would make the outline style disagree instead.
- **Forbid `filled` for `status.check` only.** This lost because it leaves the other 26 entries, and `Icon.yaml`'s "don't use a filled glyph for anything but status" is guidance that no stack enforces.
- **Draw Phosphor's image sets on Apple for `filled`.** This lost because it moves Apple chrome off SF Symbols (ADR-0013 rule 3), and both stacks would then draw a checked Checkbox for a check.
- **Accept the difference as anatomy.** This lost because a reader names the two glyphs differently, which is exactly the silent drift the registry exists to prevent (ADR-0013, "Alternatives considered").

## Consequences

- Icon goes to specVersion 2 (behavior 6), and both manifests move with it. No committed baseline moves: the one example that draws `filled`, `status-filled`, is `status.warning`, which has a fill on both stacks.
- The 27 entries marked today are every `nav.*` entry except `nav.home`; `action.add`, `action.remove`, `action.edit`, `action.search`, `action.filter`, `action.refresh`, `action.locate`, `action.zoom-in`, `action.zoom-out`, `action.expand` and `action.collapse`; `status.check`; and `object.calendar`, `object.map-pin`, `object.gps`, `object.signal`, `object.chart` and `object.sparkle`. For each of them `filled` and `outline` are now the same drawing. The web showcase's Icons screen shows this when its style control is set to `filled`, and its registry ladder labels the style that way. The Apple screen draws each entry in its default style, so it does not change.
- A new entry declares `fill: false` when its symbol has no fill variant, and the Apple job says so when it is missing.
- The filled check that visual-dna §10 reserves for state ("the check, the alert") is `status.success`, a tick in a circle that has a fill on both stacks. `status.check` is the bare tick of a selected row or a confirm action, and its filled style is now that same tick.
- **Duotone is not decided here.** Apple renders `duotone` hierarchically and the web draws Phosphor's duotone cut, and the two were not compared entry by entry. Phosphor's duotone cut of a stroke glyph adds a translucent shape of its own: the check sits on a faint square, and a chevron becomes an outlined triangle. No spec example or baseline draws `duotone` today. The style needs the same side-by-side audit before one does.

## Rules that follow

1. An entry whose SF Symbol has no fill variant at the floor carries `fill: false`. An entry whose symbol has one does not, unless that variant draws another metaphor than Phosphor's fill cut, and then the change says why.
2. `filled` reaches a vendor glyph only through `drawnStyle`. No component or call site picks Phosphor's `fill` cut or an SF fill variant on its own.
3. An entry that is filled by default has a fill.
