/**
 * What a Surface publishes to its descendants (Surface.yaml behavior; ADR-0022 §3.1, ADR-0029 §1.4):
 * the material it actually renders and the backdrop kind it declared. Text, charts and component parts
 * read their foreground family from it, never the color scheme or an accessibility setting.
 *
 * On the web the published material is a React value (ADR-0025 fact 2), which is why the glass fallback
 * is decided in React: the fill and every foreground switch together. Surface also writes it onto its
 * own element as `data-ds-material` and `data-ds-backdrop`, for its stylesheet and for tests.
 *
 * `Backdrop` is the one other provider (ADR-0036 §8): it publishes the page over the media kind an app
 * paints itself, and passes `depth` through. The context object is not exported, so no other code can
 * publish without painting.
 */
import { createContext, useContext } from "react";
import type { BackdropKind, SurfaceMaterial } from "./resolve.ts";

export interface SurfaceContextValue {
  /** The material the nearest Surface renders; `page` outside any Surface and under a `Backdrop`. */
  readonly material: SurfaceMaterial;
  /** The backdrop kind the nearest Surface or `Backdrop` declared; `none` outside both. */
  readonly backdrop: BackdropKind;
  /** How many Surfaces enclose this point; 0 outside any Surface. The concentric radius rule reads it. */
  readonly depth: number;
}

/** The scene root: the page, on nothing (DSCore's `DSSurfaceContext.root`). */
export const rootSurfaceContext: SurfaceContextValue = { material: "page", backdrop: "none", depth: 0 };

export const SurfaceContext = createContext<SurfaceContextValue>(rootSurfaceContext);

/** The material and backdrop kind published by the nearest enclosing `Surface` or `Backdrop`. */
export function useSurfaceContext(): SurfaceContextValue {
  return useContext(SurfaceContext);
}
