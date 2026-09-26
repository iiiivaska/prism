/**
 * The enums of spec/components/IconButton.yaml (specVersion 3), spelled as the spec spells them and in its
 * order, the twins of `DSIconButtonVariant` and `DSIconButtonSize`. The stylesheet maps them, with the
 * material the enclosing Surface publishes, to the tokens IconButton.yaml binds; test/icon-button.test.tsx
 * reads the spec and checks every cell, so none of them can drift.
 */

/** IconButton.yaml `variant`: the inverse solid, the raised puck, the hairline ring, the bare glyph, the critical tint. */
export const iconButtonVariants = ["primary", "secondary", "ghost", "plain", "danger"] as const;
export type IconButtonVariant = (typeof iconButtonVariants)[number];

/** IconButton.yaml `size`: the circle's side follows density (comp.icon-button.size.*), never modality. */
export const iconButtonSizes = ["sm", "md", "lg"] as const;
export type IconButtonSize = (typeof iconButtonSizes)[number];
