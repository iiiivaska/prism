/**
 * What a Badge draws and what it says (Badge.yaml behaviors 3 to 5, 7, 9 and 10, ADR-0032): pure functions
 * of its props, the locale and the app's strings table, so the same rule decides the drawn digits, the name
 * of a badge that stands alone and the contribution a host reads.
 *
 * Each one is the twin of the function of the same job in `DSBadgeAppearance`
 * (swift/Sources/DSComponents/Badge/DSBadgeAppearance.swift), and both stacks assert the same test vectors,
 * byte for byte: test/badge.test.tsx here, `DSBadgeBindingTests.vectors` on Apple.
 *
 * Numbers go through the locale's own formatter, never through digits pasted together (behavior 7,
 * ADR-0032 rule 4): `Intl.NumberFormat` for the locale React Aria's `useLocale()` gives the badge, the twin
 * of `count.formatted(.number.locale(locale))`. Words come from the app's strings table (`useStrings()`),
 * never from a constant here (ADR-0032 rule 1).
 */
import type { StringsTable } from "@iiiivaska/prism-tokens/react";
import { isIconExposed } from "../icon/Icon.tsx";
import { fillTemplate } from "../strings.ts";
import type { BadgeVariant } from "./options.ts";

/** Badge.yaml `max`'s default: a count above it draws the overflow mark. */
export const badgeDefaultMax = 99;

const formats = new Map<string, Intl.NumberFormat>();

/**
 * A whole number in the locale's own digits and grouping: `1,234` in `en-US`, `1.234` in `de-DE`. The twin
 * of `DSBadgeAppearance.formatted(_:locale:)`.
 */
export function formatBadgeNumber(value: number, locale: string): string {
  let format = formats.get(locale);
  if (format === undefined) {
    format = new Intl.NumberFormat(locale);
    formats.set(locale, format);
  }
  return format.format(value);
}

/**
 * Behavior 9: whether the badge renders at all. A dot always does, and ignores `count`. A count badge
 * renders only for a whole number of at least 1: `0` hides it, no `count` renders nothing, and so does
 * anything else that is not a safe integer of at least 1, which on the web includes a fraction, `NaN`, an
 * infinity and an integer beyond the safe range. A badge that does not render draws no element and
 * contributes nothing. The twin of `DSBadgeAppearance.isVisible(_:count:)`.
 */
export function isBadgeVisible(variant: BadgeVariant, count: number | undefined): boolean {
  if (variant === "dot") return true;
  return Number.isSafeInteger(count) && (count ?? 0) >= 1;
}

/**
 * Behavior 9: `max` as the badge compares with it; on the web a `max` that is not a safe integer is 99.
 * Apple's `max` is an `Int`, so it has no twin.
 */
export function badgeMax(max: number | undefined): number {
  return Number.isSafeInteger(max) ? (max as number) : badgeDefaultMax;
}

/**
 * Behaviors 3 and 7: the digits a visible count badge draws. `count` is compared with `max` as numbers,
 * before either is formatted; above it the badge draws `strings.Badge.overflow` filled with the formatted
 * `max` (`99+` under the English defaults), and otherwise the formatted count. The twin of
 * `DSBadgeAppearance.drawn(count:max:locale:strings:)`.
 */
export function badgeDrawn(count: number, max: number | undefined, locale: string, strings: StringsTable): string {
  const limit = badgeMax(max);
  if (count > limit) return fillTemplate(strings["Badge.overflow"], { max: formatBadgeNumber(limit, locale) });
  return formatBadgeNumber(count, locale);
}

/**
 * Behavior 10: a `label` that is empty or nothing but whitespace is no label, Icon's rule and its very
 * function (`isIconExposed`, ../icon/Icon.tsx), so a label `trim()` empties is blank on both components and,
 * through `DSIconAppearance.isBlank(_:)`, on both stacks.
 */
export function hasBadgeLabel(label: string | undefined): label is string {
  return isIconExposed(label, false);
}

/**
 * Behaviors 4 and 5, `accessibility.label`: the string a badge contributes to the name of what it marks,
 * and the name of a badge that stands alone. `undefined` is no contribution.
 *
 * - A dot contributes its `label`, and nothing without one.
 * - A count badge that does not render contributes nothing.
 * - A count badge with a `label` contributes `strings.Badge.count` filled with the **true** count, above
 *   `max` too (`128 open incidents`, while it draws `99+`), and the label as the caller wrote it.
 * - A count badge with no `label` fills no template: it contributes the formatted count alone (ADR-0032
 *   rule 10), which only a host that names what it counts may use.
 *
 * The twin of `DSBadgeAppearance.contribution(_:count:label:locale:strings:)`.
 */
export function badgeContribution(variant: BadgeVariant, count: number | undefined, label: string | undefined, locale: string, strings: StringsTable): string | undefined {
  const named = hasBadgeLabel(label) ? label : undefined;
  if (variant === "dot") return named;
  if (!isBadgeVisible(variant, count)) return undefined;
  const spoken = formatBadgeNumber(count as number, locale);
  return named === undefined ? spoken : fillTemplate(strings["Badge.count"], { count: spoken, label: named });
}

/**
 * Behavior 10: a badge is one element, named by its contribution, only when it has a `label` and no host
 * reads it (`BadgeHostContext`, ./host.ts). Every other badge that renders is hidden. The twin of
 * `DSBadgeAppearance.isExposed(hasLabel:isHosted:)`.
 */
export function isBadgeExposed(hasLabel: boolean, isHosted: boolean): boolean {
  return hasLabel && !isHosted;
}
