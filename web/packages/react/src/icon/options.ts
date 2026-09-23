/**
 * The enums of spec/components/Icon.yaml (specVersion 1), spelled as the spec spells them, the twins of
 * `DSGlyphSize`, `DSGlyphWeight` and `DSGlyphTone`. The stylesheet maps size and tone, with the material
 * the enclosing Surface publishes, to the tokens Icon.yaml binds, and ./weight.ts maps weight to a
 * Phosphor cut; test/icon.test.tsx reads the spec and checks all three, so none of them can drift.
 *
 * **Name.** They take the `glyph` stem, not `icon`: `IconSize`, `IconWeight` and `IconStyle` are already
 * the registry's generated types (src/generated/icons.ts), the four boxes from xs to lg and the six rungs
 * of the weight ladder. The spec's `size` has three values and its `weight` two, the cuts the token layer
 * publishes. Its `style` matches the registry's value for value, so Icon takes `IconStyle` as it is.
 */

/** Icon.yaml `size`: the square box, `size.icon.sm`, `size.icon.md` or `size.icon.lg`. */
export const glyphSizes = ["sm", "md", "lg"] as const;
export type GlyphSize = (typeof glyphSizes)[number];

/** Icon.yaml `weight`: `control` is `icon.weight`, `display` is `icon.weight-display` and only draws at `lg`. */
export const glyphWeights = ["control", "display"] as const;
export type GlyphWeight = (typeof glyphWeights)[number];

/** Icon.yaml `tone`; `inherit` takes the color of the text around the glyph and resolves nothing. */
export const glyphTones = ["primary", "secondary", "accent", "success", "warning", "critical", "info", "inherit"] as const;
export type GlyphTone = (typeof glyphTones)[number];
