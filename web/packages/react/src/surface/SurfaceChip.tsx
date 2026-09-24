/**
 * The glass chip shape of the Surface module (ADR-0036 §2 to §7): how a Prism component draws the one part
 * whose `background` binds `material.glass.chip` — Avatar's circle and Chip's pill among them — and hands
 * its other parts the ground that part sits on. Internal to the package: `index.ts` exports none of it,
 * and an app gets a glass chip by using the component that draws one.
 *
 * The chip is its host's root, not a wrapper, so that the host's own disabled opacity and press scale sit on
 * the element that carries the backdrop filter and keep the blur (ADR-0036 F4, rule 13):
 *
 *     const chip = useSurfaceChip(background, { elevation });
 *     return (
 *       <span {...chip.rootProps} className={`${chip.rootProps.className} ds-avatar`}>
 *         <SurfaceChipEdge chip={chip} />
 *         <SurfaceChipScope chip={chip}>{parts}</SurfaceChipScope>
 *       </span>
 *     );
 *
 * - The host hands over the part's `background` cell as a function of the ground, and at most an elevation,
 *   a gate and a publication. It never names a recipe, a glass colour, a setting or a fallback, and its
 *   stylesheet never sets the root's `background-color` or `background-image`: `Surface.css` paints the
 *   chip, and a host's own cell is its `--ds--surface-chip-own`.
 * - The root props carry the rendering (`data-ds-surface-chip`), whether glass renders without a backdrop
 *   filter (`data-ds-surface-chip-flat`), the context the chip publishes (`data-ds-surface`,
 *   `data-ds-backdrop`) — the attributes Icon, Divider and Button write for the context they read — and the
 *   elevation (`data-ds-elevation`).
 * - `SurfaceChipEdge` is the recipe's 1 px edge, first among the root's children, whenever glass renders.
 * - `SurfaceChipScope` hands the host's other parts the published context, with the parent's `depth`, and
 *   tells them whether a glass chip encloses them.
 */
import { useContext, useEffect, useMemo, type ReactNode } from "react";
import { useTokenContext } from "@iiiivaska/prism-tokens/react";
import { isDevelopment } from "../env.ts";
import { InsideGlassChipContext, SurfaceContext, useSurfaceContext, type SurfaceContextValue } from "./context.ts";
import {
  resolveSurfaceChip,
  type BackdropKind,
  type SurfaceChipFill,
  type SurfaceChipGate,
  type SurfaceChipPublication,
  type SurfaceChipRendering,
  type SurfaceChipResolution,
  type SurfaceElevation,
  type SurfaceMaterial,
} from "./resolve.ts";

/** The part's `background` cell as a function of the ground it sits on: its spec's table, and nothing more. */
export type SurfaceChipBackground = (ground: SurfaceContextValue) => SurfaceChipFill;

/** What a host may hand the chip besides its background (ADR-0036 §2.2). */
export interface UseSurfaceChipOptions {
  /** `chrome` for a bar that exists to show the page through it; `content` (default) otherwise. */
  readonly gate?: SurfaceChipGate;
  /** `raised` for a bar whose items are checked on `raised`; `ground` (default) otherwise. */
  readonly publishes?: SurfaceChipPublication;
  /** The part's shadow level, drawn as Surface draws its own; `flat` by default. */
  readonly elevation?: SurfaceElevation;
}

/** The props a host spreads on its own root element. */
export interface SurfaceChipRootProps {
  readonly className: "ds-surface-chip";
  readonly "data-ds-surface-chip": SurfaceChipRendering;
  readonly "data-ds-surface-chip-flat": "" | undefined;
  readonly "data-ds-surface": SurfaceMaterial;
  readonly "data-ds-backdrop": BackdropKind;
  readonly "data-ds-elevation": SurfaceElevation;
}

/** What `useSurfaceChip` returns: the resolution, the context the chip publishes and the root props. */
export interface SurfaceChip {
  readonly resolution: SurfaceChipResolution;
  readonly published: SurfaceContextValue;
  readonly rootProps: SurfaceChipRootProps;
}

/**
 * Resolves the host's glass chip: reads the ground, whether a glass chip encloses it and Prism's contrast
 * and transparency (`useTokenContext()`, never an attribute or a media query, ADR-0025 rule 1), and
 * resolves with `resolveSurfaceChip`. Glass asked for on a ground with no media is logged in development,
 * as Surface logs its own.
 */
export function useSurfaceChip(background: SurfaceChipBackground, options: UseSurfaceChipOptions = {}): SurfaceChip {
  const { gate = "content", publishes = "ground", elevation = "flat" } = options;
  const ground = useSurfaceContext();
  const insideGlassChip = useContext(InsideGlassChipContext);
  const { contrast, transparency } = useTokenContext();
  const requested = background(ground);
  const resolution = useMemo(
    () => resolveSurfaceChip(requested, ground, { insideGlassChip, gate, publishes }, { contrast, transparency }),
    [requested, ground, insideGlassChip, gate, publishes, contrast, transparency],
  );

  useEffect(() => {
    if (resolution.hasInvalidBackdrop && isDevelopment()) {
      console.debug(
        `Surface chip: glass on ${ground.material} over "${ground.backdrop}" has no media under it; glass renders only over image, map or vivid, so it falls back to color.bg.surface.raised over color.bg.page (ADR-0036 §3).`,
      );
    }
  }, [resolution.hasInvalidBackdrop, ground.material, ground.backdrop]);

  const { published } = resolution;
  return {
    resolution,
    published,
    rootProps: {
      className: "ds-surface-chip",
      "data-ds-surface-chip": resolution.rendered,
      "data-ds-surface-chip-flat": resolution.rendered === "glass" && !resolution.blursBackdrop ? "" : undefined,
      "data-ds-surface": published.material,
      "data-ds-backdrop": published.backdrop,
      "data-ds-elevation": elevation,
    },
  };
}

/** The recipe's 1 px inner edge on Surface's 135° ramp, an `aria-hidden` part, whenever glass renders. */
export function SurfaceChipEdge(props: { readonly chip: SurfaceChip }): ReactNode {
  return props.chip.resolution.rendered === "glass" ? <span data-ds-slot="surface-chip-edge" aria-hidden="true" /> : null;
}

/**
 * Hands the host's other parts what the chip publishes (ADR-0036 §4): the ground, or `(raised, none)`
 * under the fallback or on request, with the parent's `depth` — a chip adds none. It also tells them that
 * a glass chip encloses them when this one renders the recipe or is itself enclosed (§3 step 8).
 */
export function SurfaceChipScope(props: { readonly chip: SurfaceChip; readonly children?: ReactNode }): ReactNode {
  const { chip, children } = props;
  const enclosing = useContext(InsideGlassChipContext);
  return (
    <SurfaceContext.Provider value={chip.published}>
      <InsideGlassChipContext.Provider value={chip.resolution.rendered === "glass" || enclosing}>{children}</InsideGlassChipContext.Provider>
    </SurfaceContext.Provider>
  );
}
