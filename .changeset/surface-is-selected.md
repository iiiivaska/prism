---
"@iiiivaska/prism-react": minor
---

Surface 4 (`spec/components/Surface.yaml`): the last boolean prop named against `spec/SCHEMA.md`'s "One meaning, one name, one polarity" takes the name the rule gives it.

**Breaking:** the `selected` prop is renamed `isSelected`, on the web `<Surface>` and in the SwiftUI `DSSurfaceView` initialiser — the name Card, Chip and IconButton already give the same meaning. Nothing a surface draws or publishes changes: a selected glass surface still renders and publishes `inverse` while the glass fallback is active, and the `data-ds-selected` attribute the stylesheet reads is unchanged. DSCore's `DSSurface.resolve(material:backdrop:selected:…)` keeps its label.
