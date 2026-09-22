/**
 * Material resolution for the web `Surface` (spec/components/Surface.yaml, specVersion 3): the table
 * of ADR-0022 §1, as ADR-0025 §1 places it in React, with ADR-0029 §1.2 (the scheme's glass) and
 * ADR-0030 §5 (the page under solid, raised and nested; the raised edge).
 *
 * It is the web twin of DSCore's `DSSurface.resolve` (swift/Sources/DSCore/DSSurface.swift) and keeps
 * its field names, so the two tables can be read side by side. It is a pure function of the request
 * and of the two root axes Surface may read, `contrast` and `transparency`, which the component takes
 * from `useTokenContext()`, never from an attribute or a media query (ADR-0022 §1.3, ADR-0025 rule 1).
 * The web never runs on watchOS, so trigger 1 of ADR-0022 §1.2 has no web input.
 */
import type { TokenContext } from "@iiiivaska/prism-tokens";

/** The content materials of Surface.yaml, plus the page ground. */
export const surfaceMaterials = ["page", "solid", "raised", "nested", "inverse", "vivid", "glass", "glassLight", "accent"] as const;
export type SurfaceMaterial = (typeof surfaceMaterials)[number];

/** What a surface sits on (Surface.yaml `backdrop`). Glass renders only over `image`, `map` or `vivid`. */
export const backdropKinds = ["none", "image", "map", "vivid"] as const;
export type BackdropKind = (typeof backdropKinds)[number];

/** Surface.yaml `vivid`: the gradient slot; unset takes `gradient.vivid.default`. */
export const vividSlots = ["1", "2", "3", "4"] as const;
export type VividSlot = (typeof vividSlots)[number];

/** Surface.yaml `radius`. */
export const surfaceRadii = ["none", "inner", "tile", "cardCompact", "card", "sheet", "cardLarge", "hero", "pill"] as const;
export type SurfaceRadius = (typeof surfaceRadii)[number];

/** Surface.yaml `elevation`. */
export const surfaceElevations = ["flat", "raised", "floating", "overlay"] as const;
export type SurfaceElevation = (typeof surfaceElevations)[number];

/** Surface.yaml `padding`. */
export const surfacePaddings = ["none", "card"] as const;
export type SurfacePadding = (typeof surfacePaddings)[number];

/** The glass recipe a Surface draws: the scheme's glass (`material.glass.fill`) or light glass. */
export type GlassRecipe = "fill" | "lightFill";

/** What a Surface asks for. */
export interface SurfaceRequest {
  readonly material: SurfaceMaterial;
  readonly backdrop: BackdropKind;
  readonly selected: boolean;
}

/** Everything a Surface draws, and everything it publishes (ADR-0022 §1, ADR-0029 §1, ADR-0030 §5). */
export interface SurfaceResolution {
  /** What the caller asked for. */
  readonly requested: SurfaceMaterial;
  /** What renders, and what descendants read. */
  readonly material: SurfaceMaterial;
  /** The backdrop the caller declared, published unchanged. */
  readonly backdrop: BackdropKind;
  /** True when glass was replaced by the opaque fallback (ADR-0022 §1.2). */
  readonly isGlassFallback: boolean;
  /** Glass over a backdrop that is not image, map or vivid: reported whatever the other triggers (§1.2 trigger 4). */
  readonly hasInvalidBackdrop: boolean;
  /** The recipe to draw; null whenever glass does not render. */
  readonly glass: GlassRecipe | null;
  /** Fill the shape with `color.bg.page` before painting the material (ADR-0030 §5.1, ADR-0022 §1.1). */
  readonly paintsPage: boolean;
  /** Draw `color.edge.raised` as the 1 px top edge (ADR-0030 §5.2), under the fallback too. */
  readonly drawsRaisedEdge: boolean;
  /** Draw the vivid bloom behind the surface; dropped under Reduce Transparency (ADR-0022 §1.7). */
  readonly drawsVividBloom: boolean;
}

/** The two materials the fallback of ADR-0022 §1 can replace. */
export function isGlassMaterial(material: SurfaceMaterial): boolean {
  return material === "glass" || material === "glassLight";
}

/**
 * The elevation a Surface draws: the one the caller declared, or the default of the material it
 * **requested**. `raised` draws `elevation.1` as its own default (ADR-0030 §5.2), every other material
 * `flat`, where "solid surfaces never draw a border or a shadow at `flat`" (Surface.yaml behavior).
 *
 * The default belongs to the requested material, not to the one that renders: under the glass fallback
 * "the elevation stays the one the requesting Surface declares (ADR-0022 §1.1); `elevation.1` is
 * `raised`'s default, not an override" (ADR-0030 §5.2), so an undeclared glass surface stays `flat`.
 * The web twin of `DSSurfaceAppearance.elevation(declared:requested:)` and of
 * `DSSurfaceElevation.materialDefault(for:)` (swift/Sources/DSComponents/Surface).
 */
export function surfaceElevation(declared: SurfaceElevation | undefined, requested: SurfaceMaterial): SurfaceElevation {
  return declared ?? (requested === "raised" ? "raised" : "flat");
}

/**
 * Resolves one Surface. The four triggers of ADR-0022 §1.2 replace glass with one opaque `raised`
 * surface (watchOS never applies on the web), and a selected glass surface renders and publishes
 * `inverse` instead (§1.6).
 */
export function resolveSurface(
  request: SurfaceRequest,
  context: Pick<TokenContext, "contrast" | "transparency">,
): SurfaceResolution {
  const { material: requested, backdrop, selected } = request;
  const glass = isGlassMaterial(requested);
  const hasInvalidBackdrop = glass && backdrop === "none";
  const isGlassFallback = glass && (context.transparency === "reduce" || context.contrast === "more" || hasInvalidBackdrop);
  const material: SurfaceMaterial = isGlassFallback ? (selected ? "inverse" : "raised") : requested;
  const recipe: GlassRecipe | null = isGlassFallback ? null : requested === "glass" ? "fill" : requested === "glassLight" ? "lightFill" : null;
  return {
    requested,
    material,
    backdrop,
    isGlassFallback,
    hasInvalidBackdrop,
    glass: recipe,
    paintsPage: material === "solid" || material === "raised" || material === "nested",
    drawsRaisedEdge: material === "raised",
    drawsVividBloom: material === "vivid" && context.transparency !== "reduce",
  };
}
