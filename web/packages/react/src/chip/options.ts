/**
 * The enum of spec/components/Chip.yaml (specVersion 1), spelled as the spec spells it and in its order, the
 * twin of `DSChipSize`. The stylesheet maps it to the tokens Chip.yaml binds; test/chip.test.tsx reads the spec
 * and checks every cell, so it cannot drift.
 */

/** Chip.yaml `size`: the pill is `size.control.sm` or `.md` tall, the control height of that size. */
export const chipSizes = ["sm", "md"] as const;
export type ChipSize = (typeof chipSizes)[number];

/**
 * What a chip is, decided by its props alone (Chip.yaml behavior 1): a `filter`, which sets `isSelected`, true or
 * false, and is a toggle button; a `button`, which leaves it unset and has `onPress` or `isRemovable`; or a static
 * `label` with no role. The twin of `DSChipKind`.
 */
export const chipKinds = ["filter", "button", "label"] as const;
export type ChipKind = (typeof chipKinds)[number];
