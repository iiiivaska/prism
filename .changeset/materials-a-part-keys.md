---
"@iiiivaska/prism-tokens": patch
"@iiiivaska/prism-react": patch
---

Button and IconButton on inverse, accent and light glass, and the one solid on glass (ADR-0040). Two new tokens: `color.bg.fill.on-inverse-pressed` (`neutral.200` in light, `neutral.850` in dark) and `color.bg.fill.on-accent-pressed` (`color.text.on-accent` at 88 %), the pressed fills of a solid knocked out on an inverse surface and on the lit accent tile.

Button 7 (`spec/components/Button.yaml`) and IconButton 3 (`spec/components/IconButton.yaml`): on an inverse or an accent surface the primary pill, and a primary or selected circle, knock out, filled with the material's own foreground (`color.text.on-inverse`, `color.text.on-accent`) under a label or glyph in the material's fill. They used to draw the inverse solid there, which on an inverse ground is the ground's own colour. Secondary draws no raised fill on those two materials and is outlined like ghost, ghost and plain take the material's foreground, and pressed on inverse secondary, ghost and plain take one lightness step of the ground. A danger tint paints the page under itself on inverse and accent as over media, and Button now keys that underlay in its spec. On light glass ghost takes `color.text.on-glass-light`. IconButton's primary and selected circles on the scheme's glass are now the inverse solid, ink on light glass in the light scheme, where they were the white media solid (ADR-0030 §3.1); the dark scheme draws the same white circle as before.
