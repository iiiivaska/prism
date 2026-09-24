/**
 * The enum of spec/components/Avatar.yaml (specVersion 1), spelled as the spec spells it and in its order, the
 * twin of `DSAvatarSize`. The stylesheet maps it to the tokens Avatar.yaml binds; test/avatar.test.tsx reads the
 * spec and checks every cell, so it cannot drift.
 */

/** Avatar.yaml `size`: the circle is `size.control.sm`, `.md` or `.lg`, the control height of that size. */
export const avatarSizes = ["sm", "md", "lg"] as const;
export type AvatarSize = (typeof avatarSizes)[number];
