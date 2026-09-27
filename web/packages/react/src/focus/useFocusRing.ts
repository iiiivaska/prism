/**
 * The focus ring a component's element draws (ADR-0042 §1.6), read where the element is rendered. Internal to the
 * package, like the table it reads (./ring.ts).
 *
 * **Which ground.** The hook reads the Surface context and the chip enclosure where it is called. Called in the
 * component's own body, as Button, IconButton and Chip do, that is the ground the element sits on: a component's
 * own Surface or chip publishes to its children, not to itself. A component hands the ground over itself where the
 * ring sits on its own paint instead (`onChipPaint: true` for Chip's remove control, which lies on the pill).
 * Card's disc is rendered inside the card's Surface, so it reads the card's paint by calling the hook there.
 *
 * The element spreads the result: the class `ds-focus-ring`, which `focus/FocusRing.css` draws the ring on while
 * React Aria writes `data-focus-visible` (or while the browser matches `:focus-visible` on an element that also
 * carries `data-ds-focus-ring-native`, which Card's root does, since it is no React Aria element), the ring's role
 * as `data-ds-focus-ring`, and `data-ds-focus-ring-underlay` over an image, where the band is drawn.
 */
import { useContext } from "react";
import { SurfaceChipEnclosureContext, useSurfaceContext } from "../surface/context.ts";
import { focusRingProps, type FocusRingGround, type FocusRingProps } from "./ring.ts";

export interface UseFocusRingOptions {
  /** The ground the ring sits on; unset reads the context published where the hook is called. */
  readonly ground?: FocusRingGround;
  /** Whether the ring sits on a chip's own paint; unset reads it from the enclosure where the hook is called. */
  readonly onChipPaint?: boolean;
}

export function useFocusRing(options: UseFocusRingOptions = {}): FocusRingProps {
  const context = useSurfaceContext();
  const enclosure = useContext(SurfaceChipEnclosureContext);
  return focusRingProps(options.ground ?? context, options.onChipPaint ?? enclosure !== "none");
}
