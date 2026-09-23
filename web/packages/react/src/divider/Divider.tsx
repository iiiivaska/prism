/**
 * `Divider` (spec/components/Divider.yaml, specVersion 2): one hairline that separates rows inside a
 * single container.
 *
 * - The line is `border.hairline` thick and runs the full length of its container: `horizontal` the
 *   width of a parent that stacks its children in a column, `vertical` the height of a parent that
 *   stacks them in a row (behaviors 1 and 2). It has no length of its own and never decides its parent's:
 *   its intrinsic length is zero plus its insets, so in a parent that sizes to its content (an inline
 *   block or an inline flex column around a horizontal rule, a flex row with no height of its own around
 *   a vertical one) it is as long as the longest other child (`align-self: stretch`, or a block's auto
 *   width) and adds nothing but its insets. It is never placed along its own axis: a horizontal Divider
 *   in a flex row gets no width, which SwiftUI would share out instead, so the spec keeps it out of rows.
 * - SwiftUI's stacks take all the length a flexible child is offered, so `DSDivider` writes the parent
 *   that sizes to its content as a stack under `fixedSize` on that axis, and gives the line an ideal
 *   length of zero, so the two stacks lay it out alike (Divider.yaml `notes.platform.ios`).
 * - `inset: content` trims both ends by `space.card-padding` (behavior 3). The inset is padding inside
 *   the root, never a margin: the root still spans the container and only the painted line is shorter,
 *   so the Divider owns no margin (behavior 4) and a list lays it out like any other row. The same token
 *   is Card's padding, so a change to card padding moves an inset Divider too (roadmap P4-D2).
 * - The material the enclosing Surface publishes is written as `data-ds-surface` (Button's pattern), and
 *   Divider.css maps it to the colour cell: `color.border.hairline` on the page and the solid ladder,
 *   `color.border.on-media` on vivid, `color.border.on-glass-fill` on either glass (behavior 5). The
 *   glass fallback reaches it as `raised`, because Surface decides it before publishing (behavior 9).
 *   Increase Contrast strengthens the line through the token alone (behavior 8); nothing here reads it.
 * - `isDecorative` (default true) hides the line from assistive technology with `aria-hidden`. False
 *   renders React Aria's `Separator` as a `div`, which writes `role="separator"`, and
 *   `aria-orientation="vertical"` on the vertical case. It is never an `hr`: `useSeparator` leaves the
 *   role implicit there. The Divider has no name either way (Divider.yaml `label: none`) and is never
 *   focusable (`keyboard: not focusable`), so the props leave out every attribute that could give it a
 *   role, a name or a description, or put it in the tab order, as they leave out `children`: an Apple
 *   caller has no parameter for any of them, and `DSDivider` is never an accessibility element at all,
 *   because SwiftUI has no separator trait (ADR-0032). The same list is dropped at runtime too, so a
 *   caller that casts past the type still cannot hand them to the root (`WITHHELD`).
 * - It renders no children, even when handed some.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element
 *   (ADR-0019 rule 8).
 */
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Separator as AriaSeparator } from "react-aria-components";
import type { ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { useSurfaceContext } from "../surface/context.ts";
import type { DividerInset, DividerOrientation } from "./options.ts";

/**
 * The DOM props a Divider does not take, left out of `DividerProps` and dropped again at runtime.
 *
 * - `role`, `aria-hidden`, `aria-orientation` and `aria-roledescription`: the component owns the role and
 *   the hidden state, from `isDecorative` and `orientation`.
 * - `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-description`, `aria-details` and `title`:
 *   nothing names or describes the line (`label: none`), on a stack where Apple could not either.
 * - `tabIndex` and `contentEditable`: either one makes the element focusable, and the line is never a
 *   stop (`keyboard: not focusable`); under `aria-hidden` it would be a stop with nothing to announce.
 * - `children`: the Divider draws one line and nothing else.
 */
const WITHHELD = [
  "role",
  "aria-hidden",
  "aria-orientation",
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
] as const;

export interface DividerProps extends ScopeAttributes, Omit<HTMLAttributes<HTMLDivElement>, (typeof WITHHELD)[number]> {
  /** Divider.yaml `orientation`. Default `horizontal`. */
  readonly orientation?: DividerOrientation;
  /** Divider.yaml `inset`. Default `none`; `content` trims both ends by `space.card-padding`. */
  readonly inset?: DividerInset;
  /** Divider.yaml `isDecorative`. Default `true`: hidden from assistive technology; false exposes `role="separator"`. */
  readonly isDecorative?: boolean;
  readonly ref?: Ref<HTMLDivElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

const withheld: ReadonlySet<string> = new Set(WITHHELD);

/** The caller's props without `WITHHELD`, for a caller that casts past the type. */
function withoutWithheld<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !withheld.has(key))) as T;
}

export function Divider(props: DividerProps): ReactNode {
  const { orientation = "horizontal", inset = "none", isDecorative = true, className, ref, ...loose } = props;
  const rest = withoutWithheld(loose);
  const surface = useSurfaceContext();

  // The caller's props first, the component's own after them, so the component's attributes win.
  const own = {
    className: joinClassNames("ds-divider", className),
    "data-ds-slot": "divider",
    "data-ds-orientation": orientation,
    "data-ds-inset": inset,
    "data-ds-surface": surface.material,
  };

  if (!isDecorative) {
    return <AriaSeparator {...rest} {...own} ref={ref} elementType="div" orientation={orientation} />;
  }
  return <div {...rest} {...own} ref={ref} aria-hidden="true" />;
}
