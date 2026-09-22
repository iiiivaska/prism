/**
 * The enums of spec/components/Divider.yaml (specVersion 1), spelled as the spec spells them, the twins
 * of `DSDividerOrientation` and `DSDividerInset`. The stylesheet maps them, with the material the
 * enclosing Surface publishes, to the tokens Divider.yaml binds; test/divider.test.tsx reads the spec and
 * checks both, so neither can drift.
 */

/** Divider.yaml `orientation`. */
export const dividerOrientations = ["horizontal", "vertical"] as const;
export type DividerOrientation = (typeof dividerOrientations)[number];

/** Divider.yaml `inset`. */
export const dividerInsets = ["none", "content"] as const;
export type DividerInset = (typeof dividerInsets)[number];
