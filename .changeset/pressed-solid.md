---
"@iiiivaska/prism-tokens": patch
"@iiiivaska/prism-react": patch
---

The pressed inverse solid is one lightness step from its rest fill (ADR-0039). Two new tokens: `color.bg.fill.inverse-pressed` (`neutral.850` in light, `neutral.200` in dark) and `color.bg.fill.inverse-media-pressed` (`neutral.200` in both schemes), each paired with its text role. `comp.button.primary.bg.pressed` and `comp.icon-button.primary.bg.pressed` now alias the first; they used to alias the rest fill, so a pressed primary Button and a pressed primary or selected IconButton showed no change under Reduce Motion, where nothing scales.

Button 6 (`spec/components/Button.yaml`): a pressed primary pill takes `comp.button.primary.bg.pressed`, and on vivid `color.bg.fill.inverse-media-pressed`, where it used to keep its rest fill. IconButton 2 (`spec/components/IconButton.yaml`): a pressed primary circle takes the same step, over media `color.bg.fill.inverse-media-pressed`; a pressed selected circle takes primary's pressed fill; and the neutral pressed overlay stays on danger only. The step shows on every press, with the 0.97 scale under standard motion and on its own under Reduce Motion. No resting pixel changes.
