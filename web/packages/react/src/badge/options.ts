/**
 * The enums of spec/components/Badge.yaml (specVersion 1), spelled as the spec spells them and in its
 * order, the twins of `DSBadgeVariant`, `DSBadgeTone` and `DSBadgeEmphasis`. The stylesheet maps them to the
 * tokens Badge.yaml binds; test/badge.test.tsx reads the spec and checks every cell, so none of them can
 * drift.
 */

/** Badge.yaml `variant`: a pill of digits, or a bare `space.3` dot. */
export const badgeVariants = ["count", "dot"] as const;
export type BadgeVariant = (typeof badgeVariants)[number];

/** Badge.yaml `tone`: the inverse solid, the one attention fill, or the solid danger disc. */
export const badgeTones = ["neutral", "accent", "critical"] as const;
export type BadgeTone = (typeof badgeTones)[number];

/** Badge.yaml `emphasis`: the solid mark, or the resting outline with no fill at all. */
export const badgeEmphases = ["filled", "outline"] as const;
export type BadgeEmphasis = (typeof badgeEmphases)[number];
