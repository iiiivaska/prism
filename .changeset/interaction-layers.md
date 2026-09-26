---
"@iiiivaska/prism-tokens": patch
---

The focus ring and the hover and pressed washes on every material (ADR-0042). Five new tokens. Three are the focus ring on a ground where `color.border.focus` does not show: `color.border.focus-on-inverse` (the inverse material's foreground, where the ring used to be the fill's own colour), `color.border.focus-on-accent` (the lit tile's ink, where the ring was white at 2.30:1 on the dark tile) and `color.border.focus-on-media` (white, on vivid). Prism's components pick them for the ground under the ring; a spec never binds them. Two are the washes of a control that draws no fill of its own there: `color.bg.fill.on-inverse-subtle` (the inverse material's foreground at 6 %) and `color.bg.fill.on-accent-subtle` (the tile's ink at 6 % in light, white at 20 % in dark), where `color.bg.fill.neutral.subtle` showed nothing. No existing token changes value.
