/**
 * `Backdrop` (ADR-0036 §8): an app declares that the page under its children is media it paints itself —
 * a map, a photo, a vivid gradient — so that Prism's components know which ground they sit on.
 *
 * - It paints nothing and renders no element: the app draws the media, and `Backdrop` only says what it is.
 * - It publishes `{ material: "page", backdrop: kind, depth: parent.depth }` through `SurfaceContext`. Only the
 *   page can be published without paint: every other material names paint that is not there, and would slip past
 *   the glass fallback, which Surface applies only to what it paints (ADR-0036 §8.1).
 * - It passes `depth` through unchanged, so a Surface inside it takes the same concentric radius, `data-ds-depth`
 *   and `data-ds-nested` as without it.
 * - The nearest publisher wins: inside a Surface, a `Backdrop` overrides the context for its subtree.
 * - It hands its children the enclosure `none` (`SurfaceChipEnclosureContext`, ADR-0037 §1): the media it declares
 *   are new, so a Prism component's glass chip inside blurs them even when another chip encloses the `Backdrop`.
 * - `none` is not a kind here: a reset inside a vivid or glass Surface would hand its children the wrong family.
 *
 * With `Surface`, it is one of the two public publishers of a surface context (ADR-0022 rule 1, ADR-0036). Like
 * `Theme`, it is a context provider, which is ADR-0019 rule 8's exception for a component with no element of its own.
 */
import { useContext, useEffect, useMemo, type ReactNode } from "react";
import { SurfaceChipEnclosureContext, SurfaceContext, useSurfaceContext, type SurfaceContextValue } from "./context.ts";
import { isDevelopment } from "../env.ts";

export interface BackdropProps {
  /** What the app paints under the children: an image, a map or a vivid gradient. Name the media the app actually draws. */
  readonly kind: "image" | "map" | "vivid";
  /** The content drawn over that media. Prism's components inside it read `(page, kind)` as their ground. */
  readonly children?: ReactNode;
}

const KINDS: ReadonlySet<string> = new Set(["image", "map", "vivid"]);

/**
 * Declares that the page under `children` is media the app paints itself — an image, a map or a vivid gradient —
 * so that Prism's components know which ground they sit on (ADR-0036 §8).
 *
 * It paints nothing and renders no element: the app draws the media, and `Backdrop` only says what it is. It
 * publishes `(page, kind)` and keeps the parent's nesting depth, so a Surface inside it takes the same radius as
 * without it. The nearest publisher wins: inside a Surface, a `Backdrop` overrides the Surface's context for its
 * subtree, and a Surface inside a `Backdrop` publishes its own. A `kind` other than image, map or vivid — which only
 * an untyped caller can pass — is ignored: the parent context passes through, and development builds say why.
 */
export function Backdrop(props: BackdropProps): ReactNode {
  const { kind, children } = props;
  const parent = useSurfaceContext();
  const enclosure = useContext(SurfaceChipEnclosureContext);
  const valid = KINDS.has(kind);

  useEffect(() => {
    if (!valid && isDevelopment()) {
      console.debug(
        `Backdrop: kind "${String(kind)}" is not media. Declare what the app paints, image, map or vivid; the parent's surface context passes through unchanged (ADR-0036 §8.2).`,
      );
    }
  }, [valid, kind]);

  const published = useMemo<SurfaceContextValue>(
    () => (valid ? { material: "page", backdrop: kind, depth: parent.depth } : parent),
    [valid, kind, parent],
  );
  // An ignored kind declares nothing, so the parent's enclosure passes through with the parent's context.
  return (
    <SurfaceContext.Provider value={published}>
      <SurfaceChipEnclosureContext.Provider value={valid ? "none" : enclosure}>{children}</SurfaceChipEnclosureContext.Provider>
    </SurfaceContext.Provider>
  );
}
