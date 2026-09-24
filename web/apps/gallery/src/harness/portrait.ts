/**
 * The `portrait` fixture of spec/SCHEMA.md ("Slot content in examples"): the one picture both galleries hand an
 * image prop — Avatar's `image` — so a pair shows the same portrait (roadmap P4-7). The SwiftUI snapshot harness
 * draws the same geometry from the same tokens (`DSExamplePortrait`, swift/Sources/DSComponents/Examples/), and the
 * web showcase keeps its own copy of this file (web/apps/showcase/src/harness/portrait.ts), as it keeps its own
 * stage.
 *
 * Back to front, in fractions of the side: the square in `color.chart.series.4`; the shoulders, an ellipse in
 * `color.chart.series.3` whose bounding box runs from 0.1 to 0.9 across and from 0.68 to 1.32 down, so the bottom
 * edge cuts its lower half; the head, a circle in `color.chart.series.2` whose bounding box runs from 0.3 to 0.7
 * across and from 0.22 to 0.62 down. It is an SVG, so it is drawn at whatever size the part it fills has, and its
 * colours are the brand table's for the example's own context, as the synthetic map's are.
 */
import { useBrandTokens, useTokenContext, type BrandTokens, type TokenContext } from "@iiiivaska/prism-react";

/** The spec's words for the fixture, as an example writes them under an image prop. */
export interface PortraitFixture {
  readonly fixture: "portrait";
}

/** A colour row of a resolved brand table (the generated `ColorValue`): its sRGB hex and its alpha. */
interface ResolvedColor {
  readonly hex: string;
  readonly alpha: number;
}

/** The three colours of the picture, as token paths: the backdrop, the shoulders and the head. */
export const portraitColors = {
  backdrop: "color.chart.series.4",
  shoulders: "color.chart.series.3",
  head: "color.chart.series.2",
} as const;

/** The geometry, in hundredths of the side: the SVG's viewBox is 100 wide and 100 tall. */
export const portraitGeometry = {
  shoulders: { cx: 50, cy: 100, rx: 40, ry: 32 },
  head: { cx: 50, cy: 42, r: 20 },
} as const;

function colorOf(resolved: Readonly<Record<string, unknown>>, path: string): ResolvedColor {
  const value = resolved[path] as Partial<ResolvedColor> | undefined;
  if (typeof value?.hex !== "string" || typeof value.alpha !== "number") throw new Error(`The brand table has no colour ${path}, which the portrait fixture draws with.`);
  return { hex: value.hex, alpha: value.alpha };
}

/** One SVG fill: the hex, and its alpha when it has one. */
function fill(color: ResolvedColor): string {
  return color.alpha === 1 ? `fill="${color.hex}"` : `fill="${color.hex}" fill-opacity="${String(color.alpha)}"`;
}

/** The fixture as an SVG `data:` URL, in the colours `tokens` resolves to in `context`. */
export function portraitSource(tokens: BrandTokens, context: TokenContext): string {
  const resolved = tokens.resolveTokens(context) as Readonly<Record<string, unknown>>;
  const { shoulders, head } = portraitGeometry;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    `<rect width="100" height="100" ${fill(colorOf(resolved, portraitColors.backdrop))}/>`,
    `<ellipse cx="${String(shoulders.cx)}" cy="${String(shoulders.cy)}" rx="${String(shoulders.rx)}" ry="${String(shoulders.ry)}" ${fill(colorOf(resolved, portraitColors.shoulders))}/>`,
    `<circle cx="${String(head.cx)}" cy="${String(head.cy)}" r="${String(head.r)}" ${fill(colorOf(resolved, portraitColors.head))}/>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The fixture for the context the example renders in: the table `<Theme tokens>` holds, resolved for its axes. */
export function usePortrait(): string {
  return portraitSource(useBrandTokens(), useTokenContext());
}

/** Whether an image prop names the fixture rather than a source. */
export function isPortraitFixture(value: unknown): value is PortraitFixture {
  return typeof value === "object" && value !== null && (value as { readonly fixture?: unknown }).fixture === "portrait";
}
