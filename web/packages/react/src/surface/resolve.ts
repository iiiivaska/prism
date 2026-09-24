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
 *
 * The glass chip's resolver sits beside it (ADR-0036 §3, `resolveSurfaceChip`), the twin of DSCore's
 * `DSSurface.resolveChip`: both resolvers of the Surface module evaluate the fallback's triggers through
 * the one function here. Neither is exported from the package.
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
 * Whether glass that was asked for falls back: any one of the triggers of ADR-0022 §1.2 — Reduce
 * Transparency, Increase Contrast, or a backdrop that cannot carry glass (`hasInvalidBackdrop`, which
 * the resolver decides). Trigger 1, the watch, has no web input.
 *
 * This is the one place they are evaluated, the twin of DSCore's `DSSurface.glassFallsBack`.
 * `resolveSurface` asks it, and so does the glass chip's `resolveSurfaceChip` (ADR-0036 §3), so the two
 * fallbacks cannot drift apart. It is not exported: the resolvers in this file are its only callers.
 */
function glassFallsBack(context: Pick<TokenContext, "contrast" | "transparency">, hasInvalidBackdrop: boolean): boolean {
  return context.transparency === "reduce" || context.contrast === "more" || hasInvalidBackdrop;
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
  const isGlassFallback = glass && glassFallsBack(context, hasInvalidBackdrop);
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

/* ---- The glass chip (ADR-0036 §2 to §7) ---- */

/**
 * What a component asks of the one part it draws through the glass chip shape, on the ground that part
 * reads (ADR-0036 §2.2): the spec's cell for that part's `background` on this ground, and nothing more.
 * `glass` is the cell that binds `material.glass.chip`; `own` is any other cell, which the component's
 * stylesheet sets as `--ds--surface-chip-own`; `none` is no fill.
 */
export const surfaceChipFills = ["glass", "own", "none"] as const;
export type SurfaceChipFill = (typeof surfaceChipFills)[number];

/**
 * Whether the backdrop trigger applies (ADR-0036 §3 step 2). `content`, the default, applies it: glass
 * asked for on a ground with no media falls back, as a Surface's does. `chrome` is for bars that exist to
 * show the page through them; there the backdrop is never invalid, and only the other triggers apply.
 */
export type SurfaceChipGate = "content" | "chrome";

/**
 * What the chip publishes to the component's other parts (ADR-0036 §4): the ground it sits on, the
 * default, or `raised` for bars whose items are checked on `raised`. Under the fallback it publishes
 * `raised` either way.
 */
export type SurfaceChipPublication = "ground" | "raised";

/** What the chip draws (ADR-0036 §2.3): the recipe, the fallback, the component's own cell, or nothing. */
export type SurfaceChipRendering = "glass" | "fallback" | "own" | "none";

/**
 * What encloses a point, up to the nearest `Backdrop` (ADR-0037 §1): what a chip reads, and what it hands
 * its content as `encloses`.
 *
 * - `none`: no chip encloses it. The default, and what `Backdrop` hands its children.
 * - `translucent`: chips enclose it, and none of them renders its own cell or its fallback.
 * - `opaque`: at least one chip that encloses it renders its own cell or its fallback. A component's own cell
 *   is paint, not media, whatever its alpha.
 */
export const surfaceChipEnclosures = ["none", "translucent", "opaque"] as const;
export type SurfaceChipEnclosure = (typeof surfaceChipEnclosures)[number];

/**
 * The context a chip reads as its ground and the one it publishes: `SurfaceContextValue` (context.ts),
 * field for field. It is spelled out here so that this file imports nothing from the React side of the
 * module — context.ts takes its types from here, not the other way round — and `test/surface-chip.test.tsx`
 * holds the two types equal.
 */
export interface SurfaceChipContext {
  readonly material: SurfaceMaterial;
  readonly backdrop: BackdropKind;
  readonly depth: number;
}

/** Everything a glass chip draws and publishes (ADR-0036 §3, ADR-0037 §2), with DSCore's `DSSurfaceChipResolution` fields. */
export interface SurfaceChipResolution {
  /** The context the component read, which the chip sits on. */
  readonly ground: SurfaceChipContext;
  /** What the component asked for on that ground. */
  readonly requested: SurfaceChipFill;
  /** What the chip draws. */
  readonly rendered: SurfaceChipRendering;
  /** The scheme's chip recipe, `material.glass.chip`, when glass renders; null otherwise. */
  readonly glass: "chip" | null;
  /**
   * Whether the recipe blurs and saturates the backdrop. False when glass does not render, when it renders
   * on the scheme's glass or on light glass (ADR-0036 §5), and when any other chip encloses it (ADR-0037
   * §2): there a chip draws the recipe's fill and edge only.
   */
  readonly blursBackdrop: boolean;
  /** True when glass was asked for and replaced by the fallback. */
  readonly isGlassFallback: boolean;
  /**
   * True when glass was asked for under the `content` gate with no media under the chip — a ground with no
   * media, or an `opaque` enclosure: reported whatever the other triggers, as a Surface's is, and logged in
   * development.
   */
  readonly hasInvalidBackdrop: boolean;
  /** Paint `color.bg.page` under the chip: exactly under the fallback (ADR-0030 rule 6). */
  readonly paintsPage: boolean;
  /**
   * What the component's other parts read: `(raised, none)` under the fallback or when the component asks
   * for `raised`, and the ground otherwise. `depth` is always the ground's: a chip adds no depth.
   */
  readonly published: SurfaceChipContext;
  /**
   * The enclosure the chip hands its content (ADR-0037 §1, §2 step 3), which `SurfaceChipScope` provides:
   * `opaque` when it renders its own cell or its fallback, or reads `opaque` itself; `translucent` when it
   * renders the recipe or nothing.
   */
  readonly encloses: SurfaceChipEnclosure;
}

/** Where the chip's resolution comes from besides the ground: its enclosure, the gate and the publication. */
export interface SurfaceChipOptions {
  /** What encloses the chip, up to the nearest `Backdrop` (`SurfaceChipEnclosureContext`, ADR-0037 §1). */
  readonly enclosure: SurfaceChipEnclosure;
  readonly gate: SurfaceChipGate;
  readonly publishes: SurfaceChipPublication;
}

/**
 * ADR-0036 §3 step 1, as ADR-0037 §2 amends it: the media kind under a chip on `ground` in `enclosure`.
 * Inside a chip that renders its own cell or its fallback there is none, whatever the ground: that cell is
 * paint. Otherwise the page and the two glasses sit on the backdrop they declare, vivid is media of its own,
 * and every other material is opaque paint.
 */
function chipMedia(ground: Pick<SurfaceChipContext, "material" | "backdrop">, enclosure: SurfaceChipEnclosure): BackdropKind {
  if (enclosure === "opaque") return "none";
  switch (ground.material) {
    case "page":
    case "glass":
    case "glassLight":
      return ground.backdrop;
    case "vivid":
      return "vivid";
    case "solid":
    case "raised":
    case "nested":
    case "inverse":
    case "accent":
      return "none";
  }
}

/**
 * Resolves the one part of a Prism component that binds `material.glass.chip` (ADR-0036 §3), the twin of
 * DSCore's `DSSurface.resolveChip`, from the component's answer for its ground and nothing else: the
 * component hands over no recipe, colour, setting or fallback.
 *
 * 1. The media under the chip is none in an `opaque` enclosure (ADR-0037 §2). Otherwise it is the ground's
 *    backdrop on `page`, `glass` and `glassLight`, `vivid` on `vivid`, and none on every other material.
 * 2. Glass asked for under the `content` gate with no media under it is an invalid backdrop.
 * 3. Glass asked for falls back through `glassFallsBack`, the function `resolveSurface` uses: under Reduce
 *    Transparency, under Increase Contrast, or over an invalid backdrop.
 * 4. The recipe is `"chip"` when glass renders.
 * 5. It blurs the backdrop only in the enclosure `none`, and not on the scheme's glass or light glass: inside
 *    any other chip, and on glass, it draws the recipe's fill and edge alone.
 * 6. `color.bg.page` is painted under the chip exactly under the fallback.
 * 7. The chip publishes `(raised, none)` under the fallback or when asked to, and the ground otherwise,
 *    with the ground's `depth`.
 * 8. The chip hands its content `encloses`: `opaque` when it renders its own cell or its fallback, or reads
 *    `opaque`; `translucent` otherwise. `SurfaceChipScope` provides it.
 */
export function resolveSurfaceChip(
  requested: SurfaceChipFill,
  ground: SurfaceChipContext,
  options: SurfaceChipOptions,
  context: Pick<TokenContext, "contrast" | "transparency">,
): SurfaceChipResolution {
  const { enclosure, gate, publishes } = options;
  const asksForGlass = requested === "glass";
  const hasInvalidBackdrop = asksForGlass && gate === "content" && chipMedia(ground, enclosure) === "none";
  const isGlassFallback = asksForGlass && glassFallsBack(context, hasInvalidBackdrop);
  const rendered: SurfaceChipRendering = asksForGlass ? (isGlassFallback ? "fallback" : "glass") : requested;
  const rendersGlass = rendered === "glass";
  return {
    ground,
    requested,
    rendered,
    glass: rendersGlass ? "chip" : null,
    blursBackdrop: rendersGlass && enclosure === "none" && !isGlassMaterial(ground.material),
    isGlassFallback,
    hasInvalidBackdrop,
    paintsPage: isGlassFallback,
    published: isGlassFallback || publishes === "raised" ? { material: "raised", backdrop: "none", depth: ground.depth } : ground,
    encloses: enclosure === "opaque" || rendered === "own" || rendered === "fallback" ? "opaque" : "translucent",
  };
}
