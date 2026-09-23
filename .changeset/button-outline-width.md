---
"@iiiivaska/prism-react": minor
---

Button 4 (`spec/components/Button.yaml`, ADR-0033). The ghost and danger outlines are now drawn at `border.hairline` instead of `border.strong`, which is the width the signed-off direction board uses for every pill and the width the SwiftUI `DSButton` already drew. `Button.yaml` now binds that width for secondary, ghost and danger.

**Breaking:** the `fullWidth` prop is renamed `isFullWidth`, on the web `<Button>` and in the SwiftUI `DSButton` initialisers (`spec/SCHEMA.md`, "One meaning, one name, one polarity"). The `data-ds-full-width` attribute the stylesheet reads is unchanged.
