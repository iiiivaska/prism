// Shadow renderers (ARCHITECTURE §7.8). Colors follow §7.2 and are never pre-composited; blur keeps
// CSS semantics on every target (DSCore converts it to a SwiftUI radius).
import type { IRShadow, IRShadowLayer } from '../ir/types.ts';
import { cssColor, studioColor, swiftRGBA } from './color.ts';
import { cgFloat, cssDimension, studioDimension, tsDimension } from './dimension.ts';

export interface CssShadow {
  /** Layers joined by `, `: `0px 6px 16px 0px rgb(0 0 0 / 0.07)`. */
  readonly base: string;
  /** The whole declaration again with P3 colors; null unless a layer color lies outside sRGB. */
  readonly p3: string | null;
}

function cssLayer(l: IRShadowLayer, color: string): string {
  const inset = l.inset ? 'inset ' : '';
  return `${inset}${cssDimension(l.offsetX)} ${cssDimension(l.offsetY)} ${cssDimension(l.blur)} ${cssDimension(l.spread)} ${color}`;
}

/** CSS: per layer `[inset ]<offsetX> <offsetY> <blur> <spread> <color>`. */
export function cssShadow(s: IRShadow): CssShadow {
  const colors = s.layers.map((l) => cssColor(l.color));
  const base = s.layers.map((l, i) => cssLayer(l, colors[i]?.base ?? '')).join(', ');
  if (colors.every((c) => c.p3 === null)) return { base, p3: null };
  return { base, p3: s.layers.map((l, i) => cssLayer(l, colors[i]?.p3 ?? colors[i]?.base ?? '')).join(', ') };
}

/** Swift `DSShadowToken(layers: [DSShadowLayer(color:x:y:blur:spread:inset:)])`. */
export function swiftShadow(s: IRShadow): string {
  const layers = s.layers.map(
    (l) =>
      `DSShadowLayer(color: ${swiftRGBA(l.color)}, x: ${cgFloat(l.offsetX)}, y: ${cgFloat(l.offsetY)}, ` +
      `blur: ${cgFloat(l.blur)}, spread: ${cgFloat(l.spread)}, inset: ${l.inset ? 'true' : 'false'})`,
  );
  return `DSShadowToken(layers: [${layers.join(', ')}])`;
}

/** `tokens.ts` ShadowLayerValue (ARCHITECTURE §9.5). */
export interface TsShadowLayer {
  readonly color: string;
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly inset: boolean;
}

export function tsShadow(s: IRShadow): readonly TsShadowLayer[] {
  return s.layers.map((l) => ({
    color: cssColor(l.color).base,
    x: tsDimension(l.offsetX),
    y: tsDimension(l.offsetY),
    blur: tsDimension(l.blur),
    spread: tsDimension(l.spread),
    inset: l.inset,
  }));
}

/** Tokens Studio `boxShadow` layer; colors use `rgba()` below alpha 1, never 8-digit hex (ADR-0024 §12). */
export interface StudioShadowLayer {
  readonly x: string;
  readonly y: string;
  readonly blur: string;
  readonly spread: string;
  readonly color: string;
  readonly type: 'dropShadow' | 'innerShadow';
}

/** Tokens Studio flavor: always an array of layers. */
export function studioShadow(s: IRShadow): readonly StudioShadowLayer[] {
  return s.layers.map((l) => ({
    x: studioDimension(l.offsetX),
    y: studioDimension(l.offsetY),
    blur: studioDimension(l.blur),
    spread: studioDimension(l.spread),
    color: studioColor(l.color),
    type: l.inset ? 'innerShadow' : 'dropShadow',
  }));
}
