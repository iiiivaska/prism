---
"@iiiivaska/prism-react": patch
---

IconButton (`spec/components/IconButton.yaml` 1): `<IconButton glyph label onPress>` on the web and `DSIconButton` in SwiftUI, a circle that carries one registry glyph and no drawn label, in the `primary`, `secondary`, `ghost`, `plain` and `danger` variants at three sizes that follow density. `label` is required and is the accessible name on every platform; it is never shown on hover or on focus, because Prism has no Tooltip yet. `isSelected` renders the circle as the inverse solid and announces it as selected (`aria-current="true"` on the web, the selected trait on Apple). The optional `badge` takes a Badge's props (`IconButtonBadge`; a `DSBadge` on Apple), anchors it outside the top-trailing corner and reads its count into the button's name on the web and into its accessibility value on Apple. The web package also exports `iconButtonVariants`, `iconButtonSizes` and their types.
