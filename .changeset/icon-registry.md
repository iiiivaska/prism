---
"@iiiivaska/prism-react": minor
---

Icon registry codegen (P2-2, ADR-0013, ADR-0019 §6): `@iiiivaska/prism-react` exports `iconRegistry`, `iconWeights`, `iconStyles`, `iconSizes`, `iconSource`, `iconRegistryVersion` and the `IconName`, `IconWeight`, `IconStyle`, `IconSize` and `IconEntry` types, generated from `spec/icons/registry.json`. Web bindings are Phosphor names only; no SF Symbol name is emitted (ADR-0013 rule 5).

On Apple the new `DSIcons` product carries `DSIconName` and the weight, style and size tables, plus `Icons.xcassets`, the Phosphor image sets for the icons Apple has no fitting symbol for. `action.zoom-in` and `action.zoom-out` now bind the Phosphor magnifier glyphs instead of plain plus and minus, `status.trend-up` and `status.trend-down` render the Phosphor arrow on both stacks, and `rtlMirror` is per platform (critic C-21 to C-24, G-09).
