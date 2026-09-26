/**
 * The enums of spec/components/Button.yaml (specVersion 7). The stylesheet maps them, with the material
 * the enclosing Surface publishes, to the tokens Button.yaml binds; test/button.test.tsx reads the spec
 * and checks both, so neither can drift.
 */

/** Button.yaml `variant`. */
export const buttonVariants = ["primary", "secondary", "ghost", "danger"] as const;
export type ButtonVariant = (typeof buttonVariants)[number];

/** Button.yaml `size`. */
export const buttonSizes = ["sm", "md", "lg"] as const;
export type ButtonSize = (typeof buttonSizes)[number];
