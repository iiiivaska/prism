---
"@iiiivaska/prism-react": patch
---

Icon 2 (`spec/components/Icon.yaml`, ADR-0035): a glyph is now filled on both stacks or on neither. The SF Symbols of 27 registry entries have no fill variant, and each of those entries is now marked `fill: false`: every `nav.*` entry except `nav.home`, eleven `action.*` entries, `status.check` and six `object.*` entries (the ADR lists them). For these entries, `style="filled"` used to draw Phosphor's fill cut on the web. That cut knocks a stroke glyph out of a solid shape, so a filled `status.check` looked like a checked Checkbox and the chevrons became solid triangles, while SwiftUI drew the plain symbol. Both stacks now draw the outline, in the requested weight. `iconRegistry` entries carry the new `fill` field, and `DSIconName.hasFill` is its Apple counterpart. No Prism component and no spec example draws one of these entries filled, so nothing Prism renders by itself changes.
