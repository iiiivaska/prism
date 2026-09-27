---
"@iiiivaska/prism-react": patch
---

A disabled control dims as one layer in SwiftUI too, as it does on the web. `DSButton`, `DSIconButton`, `DSChip` and the custom action circle of a `DSCard` that the environment disables lowered each of their layers to `opacity.disabled` on its own, so the dimmed fill showed through the dimmed label, glyph, outline or badge laid over it: a disabled primary button's white label read 192 in light, where the web's reads 246 over a page of 241. Each now dims its whole picture at once, as CSS `opacity` does and as `DSToggle`'s row already did. Only the disabled state changes; an enabled control draws what it drew. The web package is unchanged.
