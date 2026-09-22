/**
 * `Surface` (spec/components/Surface.yaml, specVersion 2): the container primitive every other
 * component sits on.
 *
 * - It resolves the material with `resolveSurface` from `useTokenContext()` (ADR-0022 §1.3, ADR-0025
 *   rule 1): glass falls back to an opaque `raised`, or `inverse` when selected, under Increase Contrast,
 *   Reduce Transparency or a backdrop that is not image, map or vivid. It never reads the axis
 *   attributes or a media query; its stylesheet reads only the tokens of the material it renders.
 * - It publishes the rendered material and the backdrop kind to descendants through `SurfaceContext`,
 *   and onto its own element as `data-ds-material` and `data-ds-backdrop`.
 * - It draws the parts of the anatomy that apply: the vivid bloom behind itself, the vivid fill, the
 *   glass bloom inside itself, the grain and the 1 px edge, each an `aria-hidden` span named by
 *   `data-ds-slot`. The raised top edge and the elevation are box shadows of the root.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element
 *   (ADR-0019 rule 8).
 */
import { useEffect, useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { useTokenContext, type ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { isDevelopment } from "../env.ts";
import { SurfaceContext, useSurfaceContext, type SurfaceContextValue } from "./context.ts";
import {
  resolveSurface,
  type BackdropKind,
  type SurfaceElevation,
  type SurfaceMaterial,
  type SurfacePadding,
  type SurfaceRadius,
  type VividSlot,
} from "./resolve.ts";

export interface SurfaceProps extends ScopeAttributes, Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** The material to render; glass may fall back (Surface.yaml behavior). Default `solid`. */
  readonly material?: SurfaceMaterial;
  /** The gradient slot of a vivid surface; unset takes `gradient.vivid.default`. Ignored for other materials. */
  readonly vivid?: VividSlot;
  /** Default `card`. Nested surfaces never exceed their parent's radius minus its padding. */
  readonly radius?: SurfaceRadius;
  /**
   * Default `flat`, except on a surface that renders `raised`, whose own default is `raised`
   * (`elevation.1`, ADR-0030 §5.2); so the glass fallback keeps the elevation the glass surface declares.
   */
  readonly elevation?: SurfaceElevation;
  /** Default `card` (`space.card-padding`). */
  readonly padding?: SurfacePadding;
  /** What the surface sits on; glass renders only over image, map or vivid. Default `none`. */
  readonly backdrop?: BackdropKind;
  /** A selected glass surface renders and publishes `inverse` while the glass fallback is active. */
  readonly selected?: boolean;
  readonly children?: ReactNode;
  readonly ref?: Ref<HTMLDivElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

export function Surface(props: SurfaceProps): ReactNode {
  const {
    material: requested = "solid",
    vivid,
    radius = "card",
    elevation,
    padding = "card",
    backdrop = "none",
    selected = false,
    className,
    children,
    ref,
    ...rest
  } = props;

  const { contrast, transparency } = useTokenContext();
  const parent = useSurfaceContext();
  const resolution = resolveSurface({ material: requested, backdrop, selected }, { contrast, transparency });
  const { material } = resolution;

  useEffect(() => {
    if (resolution.hasInvalidBackdrop && isDevelopment()) {
      console.debug(
        `Surface: ${requested} renders only over backdrop image, map or vivid; over "${backdrop}" it falls back to the opaque raised surface (ADR-0022 §1.2).`,
      );
    }
  }, [resolution.hasInvalidBackdrop, requested, backdrop]);

  const published = useMemo<SurfaceContextValue>(() => ({ material, backdrop, depth: parent.depth + 1 }), [material, backdrop, parent.depth]);
  const glass = resolution.glass !== null;
  const isVivid = material === "vivid";

  return (
    <div
      {...rest}
      ref={ref}
      className={joinClassNames("ds-surface", className)}
      data-ds-slot="surface"
      data-ds-material={material}
      data-ds-backdrop={backdrop}
      data-ds-radius={radius}
      data-ds-padding={padding}
      data-ds-elevation={elevation ?? (material === "raised" ? "raised" : "flat")}
      data-ds-vivid={isVivid ? (vivid ?? "default") : undefined}
      data-ds-selected={selected ? "" : undefined}
      data-ds-fallback={resolution.isGlassFallback ? "" : undefined}
      data-ds-depth={parent.depth % 2 === 0 ? "even" : "odd"}
      data-ds-nested={parent.depth > 0 ? "" : undefined}
    >
      {resolution.drawsVividBloom ? <span data-ds-slot="surface-bloom" aria-hidden="true" /> : null}
      {isVivid ? <span data-ds-slot="surface-fill" aria-hidden="true" /> : null}
      {glass ? <span data-ds-slot="surface-bloom" aria-hidden="true" /> : null}
      {isVivid || glass ? <span data-ds-slot="surface-grain" aria-hidden="true" /> : null}
      {isVivid || glass ? <span data-ds-slot="surface-edge" aria-hidden="true" /> : null}
      <SurfaceContext.Provider value={published}>{children}</SurfaceContext.Provider>
    </div>
  );
}
