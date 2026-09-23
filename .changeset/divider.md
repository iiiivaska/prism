---
"@iiiivaska/prism-react": patch
---

Divider (`spec/components/Divider.yaml` 2): `<Divider>` on the web and `DSDivider` in SwiftUI, one `border.hairline` rule that separates rows inside a single container, `horizontal` or `vertical`, with `inset: content` trimming both ends by `space.card-padding` inside its own box, never as a margin. The line takes its colour from the material the enclosing Surface publishes, `color.border.on-media` on vivid and `color.border.on-glass-fill` on glass, and it has no length of its own, so in a parent that sizes to its content it adds nothing but its insets. `isDecorative`, true by default, hides it from assistive technology; false makes it a `separator` on the web, and on Apple, which has no separator role, it is never an element. The web package also exports `dividerOrientations`, `dividerInsets` and their types.
