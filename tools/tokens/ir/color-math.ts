// Color math for the contrast tool (ARCHITECTURE §10): source-over compositing in gamma-encoded sRGB
// (the CSS and UIKit default), WCAG 2.x relative luminance and contrast ratio. Nothing else
// pre-composites a translucent color (§7.12).
import type { Triple } from './types.ts';

export interface Rgba { readonly srgb: Triple; readonly alpha: number }

/** `top` over `bottom`, source-over in gamma-encoded sRGB. */
export function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.alpha + bottom.alpha * (1 - top.alpha);
  if (a === 0) return { srgb: [0, 0, 0], alpha: 0 };
  const channel = (i: 0 | 1 | 2): number =>
    (top.srgb[i] * top.alpha + bottom.srgb[i] * bottom.alpha * (1 - top.alpha)) / a;
  return { srgb: [channel(0), channel(1), channel(2)], alpha: a };
}

/** Composites the layers bottom to top; the bottom layer must be opaque. */
export function flatten(bottomToTop: readonly Rgba[]): Triple {
  const [bottom, ...rest] = bottomToTop;
  if (bottom === undefined) throw new Error('flatten needs at least one layer');
  if (bottom.alpha !== 1) throw new Error(`the bottom layer must be opaque (alpha ${bottom.alpha})`);
  let acc: Rgba = bottom;
  for (const layer of rest) acc = over(layer, acc);
  return acc.srgb;
}

function linear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a gamma-encoded sRGB color. */
export function relativeLuminance(rgb: Triple): number {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

/** (L1 + 0.05) / (L2 + 0.05) with L1 the lighter; both colors opaque. */
export function contrastRatio(a: Triple, b: Triple): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** '#rgb', '#rrggbb' or '#rrggbbaa' (CSS order) → sRGB 0..1 and alpha. */
export function hexToRgba(hex: string): Rgba {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  const body = m?.[1];
  if (body === undefined) throw new Error(`not a hex color: ${hex}`);
  const full = body.length === 3 ? body.split('').map((c) => c + c).join('') : body;
  const byte = (i: number): number => parseInt(full.slice(i, i + 2), 16) / 255;
  return { srgb: [byte(0), byte(2), byte(4)], alpha: full.length === 8 ? byte(6) : 1 };
}
