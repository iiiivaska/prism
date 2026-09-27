/**
 * The focus ring's table (ADR-0042 §1): which ring a ground takes, and where the ring paints the page under
 * itself. Internal to the package: `index.ts` exports none of it, and a component gets its ring from
 * `useFocusRing` (./useFocusRing.ts) and `focus/FocusRing.css`, the one stylesheet that draws a ring.
 *
 * Every spec binds its ring as `color.border.focus` at `border.focus` (`interaction/focus-ring`), and this table
 * picks the role for the ground the ring is drawn on, so every focusable component inherits it. It is Apple's
 * `DSInteraction` (swift/Sources/DSCore/DSInteraction.swift), case for case.
 *
 * | Ground | Ring |
 * |--------|------|
 * | `page` over nothing or a map, `solid`, `raised`, `nested`, `glass`, `glassLight` | `color.border.focus` |
 * | `inverse` | `color.border.focus-on-inverse`, the material's foreground |
 * | `accent` | `color.border.focus-on-accent`, the tile's ink |
 * | `vivid`, and `page` over `vivid` | `color.border.focus-on-media`, white, which V1 holds on every gradient |
 * | `page` over `image` | `color.border.focus` on a band of `color.bg.page` one ring width wider |
 *
 * **On a chip's own paint** the media rows and the band give way to `color.border.focus` (§1.2): a chip publishes
 * the ground under its glass, so a ring inside a glass chip over vivid reads `vivid`, while it sits on the chip's
 * glass, whose foreground is `color.border.focus`. On `inverse` and `accent` a chip draws nothing, so the ground's
 * ring holds.
 */
import type { SurfaceContextValue } from "../surface/context.ts";

/** The ground a ring is drawn on: a published material and the backdrop kind under it. */
export type FocusRingGround = Pick<SurfaceContextValue, "material" | "backdrop">;

/** The four ring roles, in the table's order: the page family's, then each material's own. */
export const focusRingTokens = ["color.border.focus", "color.border.focus-on-inverse", "color.border.focus-on-accent", "color.border.focus-on-media"] as const;
export type FocusRingToken = (typeof focusRingTokens)[number];

/** The role an element's `data-ds-focus-ring` names: the token without `color.border.`. */
export type FocusRingName = "focus" | "focus-on-inverse" | "focus-on-accent" | "focus-on-media";

/** The band's one colour: the page, under the ring over an image (§1.3). */
export const focusRingUnderlayToken = "color.bg.page";

/**
 * The ring on a ground (ADR-0042 §1.1). `onChipPaint` is true where the ring sits on a chip's own paint: inside a
 * chip (`SurfaceChipEnclosureContext` is not `none`), or around a control laid on a chip, as Chip's remove control is.
 */
export function focusRingOn(ground: FocusRingGround, onChipPaint: boolean): FocusRingToken {
  switch (ground.material) {
    case "inverse":
      return "color.border.focus-on-inverse";
    case "accent":
      return "color.border.focus-on-accent";
    case "vivid":
      return onChipPaint ? "color.border.focus" : "color.border.focus-on-media";
    case "page":
      return ground.backdrop === "vivid" && !onChipPaint ? "color.border.focus-on-media" : "color.border.focus";
    case "solid":
    case "raised":
    case "nested":
    case "glass":
    case "glassLight":
      return "color.border.focus";
  }
}

/**
 * The band the ring paints under itself (ADR-0042 §1.3): `color.bg.page` on the page over an image, outside any
 * chip, and nothing anywhere else. The ring and the band are at least 17:1 apart in every scheme, so one of the two
 * holds 3:1 against any image; every other ground is paint a contrast pair checks.
 */
export function focusRingUnderlay(ground: FocusRingGround, onChipPaint: boolean): typeof focusRingUnderlayToken | null {
  return !onChipPaint && ground.material === "page" && ground.backdrop === "image" ? focusRingUnderlayToken : null;
}

/** The props an element spreads for its ring: the class `FocusRing.css` draws on, the role and the band. */
export interface FocusRingProps {
  readonly className: "ds-focus-ring";
  readonly "data-ds-focus-ring": FocusRingName;
  readonly "data-ds-focus-ring-underlay": "" | undefined;
}

/** The props for a ring on `ground`, on a chip's own paint or not: the table above, as attributes. */
export function focusRingProps(ground: FocusRingGround, onChipPaint: boolean): FocusRingProps {
  return {
    className: "ds-focus-ring",
    "data-ds-focus-ring": focusRingOn(ground, onChipPaint).slice("color.border.".length) as FocusRingName,
    "data-ds-focus-ring-underlay": focusRingUnderlay(ground, onChipPaint) === null ? undefined : "",
  };
}
