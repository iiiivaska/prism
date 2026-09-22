/**
 * The enums of spec/components/Card.yaml (specVersion 2) and the two choices Card makes in React: which
 * Surface material a variant renders, and which `root.radius` cell a card takes. test/card.test.tsx
 * reads the spec and checks both.
 */
import type { Density } from "@iiiivaska/prism-tokens";
import type { SurfaceMaterial, SurfaceRadius } from "../surface/resolve.ts";
import type { TextTone } from "../text/tones.ts";

/** Card.yaml `variant`. */
export const cardVariants = ["solid", "vivid", "glass", "tinted"] as const;
export type CardVariant = (typeof cardVariants)[number];

/** Card.yaml `action`. */
export const cardActions = ["none", "open", "custom"] as const;
export type CardAction = (typeof cardActions)[number];

/** Card.yaml `size`. */
export const cardSizes = ["compact", "regular", "large"] as const;
export type CardSize = (typeof cardSizes)[number];

/** Card.yaml `hero`: rendered with Text `metric-lg`; `unit` joins the caption line on vivid (V3). */
export interface CardHero {
  readonly value: string;
  /** The dimmed trailing group (`.4` of `86.4`). */
  readonly trailing?: string;
  /** The hung unit; on vivid it moves into the caption line (ADR-0030 §8). */
  readonly unit?: string;
  /** Default `primary`. */
  readonly tone?: TextTone;
}

/**
 * The Surface material a variant asks for (Card.yaml behavior 1). `tinted` is a solid surface whose fill
 * is color.bg.tint.accent over the page (behavior 7), so it publishes `solid` and its text takes the
 * standard tones. Glass may still fall back inside Surface.
 */
export function surfaceMaterialOf(variant: CardVariant): SurfaceMaterial {
  switch (variant) {
    case "solid":
    case "tinted":
      return "solid";
    case "vivid":
      return "vivid";
    case "glass":
      return "glass";
  }
}

/**
 * The `root.radius` cell (behavior 10): `size: large` takes comp.card.radius.large, `size: compact` and
 * compact density take comp.card.radius.compact, and everything else comp.card.radius.regular.
 */
export function radiusCellOf(size: CardSize, density: Density): CardSize {
  if (size === "large") return "large";
  return size === "compact" || density === "compact" ? "compact" : "regular";
}

/** The Surface radius that carries the same `sys.radius.*` token as a card radius cell. */
export const surfaceRadiusOf: Readonly<Record<CardSize, SurfaceRadius>> = {
  compact: "cardCompact",
  regular: "card",
  large: "cardLarge",
};
