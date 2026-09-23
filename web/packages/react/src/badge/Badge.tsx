/**
 * `Badge` (spec/components/Badge.yaml, specVersion 1): a static mark that carries a count or an unread
 * state, a filled or outlined pill of digits or a bare dot.
 *
 * - The root is a `span` with `variant`, `tone` and `emphasis` written as `data-ds-variant`, `data-ds-tone`
 *   and `data-ds-emphasis`, always all three; Badge.css maps them to the tokens Badge.yaml binds. There is
 *   no `data-ds-surface`: the three fills are opaque and the badge looks the same on every ground
 *   (behavior 12), so Badge reads no surface context at all.
 * - A count pill hugs its digits between the floors of `height` and `minWidth` (`size.icon.md`), with
 *   `paddingX` inside, and never wraps them; a dot is a `space.3` square with no digits (behavior 2). The
 *   digits are Text at `type.micro` with tabular figures (behavior 8, ADR-0021 §5), in the label part.
 * - What it draws and what it says are ./text.ts: nothing at all for a count that is not a whole number of
 *   at least 1 (behavior 9); the count, or `strings.Badge.overflow` above `max`, through the locale's number
 *   formatter (behaviors 3 and 7); the name is `strings.Badge.count` with the true count (behavior 4). The
 *   locale is React Aria's `useLocale()` and the strings the app's `<Theme strings>` (`useStrings()`); Badge
 *   has no locale and no word of its own (ADR-0032).
 * - Accessibility (behavior 10, `notes.platform.web-*`): a badge with a non-blank `label` that no host reads
 *   is `role="img"` named by `aria-label`, its contribution; every other badge that renders is
 *   `aria-hidden`. Apple exposes the same badge as an element with no trait, and the name is byte-identical.
 *   A host that reads its badge provides `BadgeHostContext` (./host.ts). Because the root owns the role and
 *   the name, the props leave out every attribute that could give it another role, name, description or
 *   hint, or put it in the tab order, and drop them again at runtime (`WITHHELD`, Icon's list).
 * - Badge is not a control (behavior 1): no React Aria component, no focus, no gesture, and
 *   `pointer-events: none`, so it is never a tap target and never takes a press from what it marks. The
 *   props take no DOM event handler (`WithoutHandlers`), and one that arrives past the type is dropped.
 * - Badge applies no offset of its own (behavior 13): a host that anchors it on a corner places it from its
 *   own `tokens.badge.offset`.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element
 *   (ADR-0019 rule 8).
 *
 * `motion.count`: when the drawn digits change, the new digits replace the old ones and fade in over
 * motion.duration.quick, while the old ones leave at once and the pill takes its new width at once; they
 * never roll or count up, and the badge never pulses (behavior 15). The first drawing does not animate, and
 * neither does a badge that reappears after rendering nothing. `reduceMotion: instant`: under Reduce Motion
 * the replacement takes motion.duration.instant, through the crossfade flag (Badge.css).
 */
import { useContext, useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { useLocale } from "react-aria-components";
import { useStrings, type ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { Text } from "../text/Text.tsx";
import { BadgeHostContext } from "./host.ts";
import type { BadgeEmphasis, BadgeTone, BadgeVariant } from "./options.ts";
import { badgeContribution, badgeDrawn, hasBadgeLabel, isBadgeExposed, isBadgeVisible } from "./text.ts";

/**
 * The DOM props a Badge does not take, left out of `BadgeProps` and dropped again at runtime: Icon's list,
 * for the same reasons.
 *
 * - `role`, `aria-hidden` and `aria-roledescription`: the component owns the role and the hidden state, from
 *   `label` and the host (behavior 10).
 * - `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-description`, `aria-details` and `title`: the
 *   name is the badge's contribution, built from `count`, `label` and the strings table, and a badge has no
 *   hint.
 * - `tabIndex` and `contentEditable`: either one makes the badge focusable, and it is never a stop
 *   (`keyboard: not focusable`).
 * - `children` and `dangerouslySetInnerHTML`: the badge draws its digits and nothing else.
 */
const WITHHELD = [
  "role",
  "aria-hidden",
  "aria-roledescription",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-description",
  "aria-details",
  "title",
  "tabIndex",
  "contentEditable",
  "children",
  "dangerouslySetInnerHTML",
] as const;

/** Every key of `T` but a DOM event handler: Badge.yaml behavior 1, a badge is never the target of a gesture. */
type WithoutHandlers<T> = { [K in keyof T as K extends `on${string}` ? never : K]: T[K] };

export interface BadgeProps extends ScopeAttributes, WithoutHandlers<Omit<HTMLAttributes<HTMLSpanElement>, (typeof WITHHELD)[number] | "color">> {
  /** Badge.yaml `variant`. Default `count`, a pill of digits; `dot` is a bare `space.3` circle and ignores `count`. */
  readonly variant?: BadgeVariant;
  /** Badge.yaml `tone`. Default `neutral`, the inverse solid; `accent` is the attention fill, `critical` the danger disc. */
  readonly tone?: BadgeTone;
  /** Badge.yaml `emphasis`. Default `filled`; `outline` has no fill, and is never placed over media. */
  readonly emphasis?: BadgeEmphasis;
  /** Badge.yaml `count`: the value shown, required for a count badge. A count that is not a whole number of at least 1 renders nothing. */
  readonly count?: number;
  /** Badge.yaml `max`. Default 99: a count above it draws `strings.Badge.overflow` ("99+"). */
  readonly max?: number;
  /** Badge.yaml `label`: what the count means ("unread alerts"). Required when the badge stands alone; without one it is hidden. */
  readonly label?: string;
  readonly ref?: Ref<HTMLSpanElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

const withheld: ReadonlySet<string> = new Set(WITHHELD);

/** The caller's props without `WITHHELD` and without an event handler, for a caller that casts past the type. */
function withoutWithheld<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !withheld.has(key) && !key.startsWith("on"))) as T;
}

/**
 * `motion.count`: whether the digits replace other digits this Badge drew before. React's pattern for
 * information from an earlier render (Icon's `useReplaced`): the render that sees new digits updates the
 * state, and React renders again before it commits. Only digits replacing digits count, so neither the
 * first drawing nor a badge that reappears after rendering nothing is a replacement.
 */
function useReplaced(drawn: string | undefined): boolean {
  const [state, setState] = useState<{ readonly drawn: string | undefined; readonly replaced: boolean }>({ drawn, replaced: false });
  if (state.drawn !== drawn) {
    const replaced = state.drawn !== undefined && drawn !== undefined;
    setState({ drawn, replaced });
    return replaced;
  }
  return state.replaced;
}

export function Badge(props: BadgeProps): ReactNode {
  const { variant = "count", tone = "neutral", emphasis = "filled", count, max, label, className, ref, ...loose } = props;
  const rest = withoutWithheld(loose);
  const { locale } = useLocale();
  const strings = useStrings();
  const isHosted = useContext(BadgeHostContext);

  const visible = isBadgeVisible(variant, count);
  const drawn = visible && variant !== "dot" ? badgeDrawn(count as number, max, locale, strings) : undefined;
  const replaced = useReplaced(drawn);
  if (!visible) return null;

  const contribution = badgeContribution(variant, count, label, locale, strings);
  const exposed = isBadgeExposed(hasBadgeLabel(label), isHosted) && contribution !== undefined;

  // The caller's props first, the component's own after them, so the component's attributes win.
  const own = {
    className: joinClassNames("ds-badge", className),
    "data-ds-slot": "badge",
    "data-ds-variant": variant,
    "data-ds-tone": tone,
    "data-ds-emphasis": emphasis,
  };

  return (
    <span {...rest} {...own} ref={ref} {...(exposed ? { role: "img", "aria-label": contribution } : { "aria-hidden": "true" as const })}>
      {drawn === undefined ? null : (
        // Keyed by the digits, so new digits mount a new label and its fade runs from the start.
        <span key={drawn} className="ds-badge-label" data-ds-slot="badge-label" data-ds-replaced={replaced ? "" : undefined}>
          <Text role="micro" tone="inherit" numeric="tabular">
            {drawn}
          </Text>
        </span>
      )}
    </span>
  );
}
