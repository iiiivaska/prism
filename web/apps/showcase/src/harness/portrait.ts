/**
 * The `portrait` fixture of spec/SCHEMA.md ("Slot content in examples"), the showcase's own copy of the gallery's
 * (web/apps/gallery/src/harness/portrait.ts), as `ShowcaseGround` is its own copy of the gallery's ground: the one
 * picture every harness hands Avatar's `image`, so a page and a gallery pair show the same portrait (roadmap P4-7).
 * The SwiftUI harnesses draw the same geometry from the same tokens (`DSExamplePortrait`).
 *
 * Back to front, in fractions of the side: the square in `color.chart.series.4`; the shoulders, an ellipse in
 * `color.chart.series.3` whose bounding box runs from 0.1 to 0.9 across and from 0.68 to 1.32 down; the head, a
 * circle in `color.chart.series.2` whose bounding box runs from 0.3 to 0.7 across and from 0.22 to 0.62 down. It is
 * an SVG in the colours the brand table resolves to in the page's own context.
 */
import { useBrandTokens, useTokenContext, type BrandTokens, type TokenContext } from "@iiiivaska/prism-react";

/** A colour row of a resolved brand table (the generated `ColorValue`): its sRGB hex and its alpha. */
interface ResolvedColor {
  readonly hex: string;
  readonly alpha: number;
}

const COLORS = {
  backdrop: "color.chart.series.4",
  shoulders: "color.chart.series.3",
  head: "color.chart.series.2",
} as const;

function colorOf(resolved: Readonly<Record<string, unknown>>, path: string): ResolvedColor {
  const value = resolved[path] as Partial<ResolvedColor> | undefined;
  if (typeof value?.hex !== "string" || typeof value.alpha !== "number") throw new Error(`The brand table has no colour ${path}, which the portrait fixture draws with.`);
  return { hex: value.hex, alpha: value.alpha };
}

function fill(color: ResolvedColor): string {
  return color.alpha === 1 ? `fill="${color.hex}"` : `fill="${color.hex}" fill-opacity="${String(color.alpha)}"`;
}

/** The fixture as an SVG `data:` URL, in the colours `tokens` resolves to in `context`. */
export function portraitSource(tokens: BrandTokens, context: TokenContext): string {
  const resolved = tokens.resolveTokens(context) as Readonly<Record<string, unknown>>;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    `<rect width="100" height="100" ${fill(colorOf(resolved, COLORS.backdrop))}/>`,
    `<ellipse cx="50" cy="100" rx="40" ry="32" ${fill(colorOf(resolved, COLORS.shoulders))}/>`,
    `<circle cx="50" cy="42" r="20" ${fill(colorOf(resolved, COLORS.head))}/>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The fixture for the context the example renders in. */
export function usePortrait(): string {
  return portraitSource(useBrandTokens(), useTokenContext());
}

/** Whether an image prop names the fixture rather than a source. */
export function isPortraitFixture(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as { readonly fixture?: unknown }).fixture === "portrait";
}
