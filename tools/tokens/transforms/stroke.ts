// Stroke style and border renderers (ARCHITECTURE §7.10). A keyword stroke style is a CSS keyword; the
// object form becomes the derived declarations `-dasharray` and `-linecap` (SVG strokes read them).
import type { IRBorder, IRStrokeStyle } from '../ir/types.ts';
import { cssColor, swiftRGBA, tsColor, type TsColor } from './color.ts';
import { cgFloat, cssDimension, tsDimension } from './dimension.ts';
import { part, sortParts, type CssPart } from './types.ts';

/**
 * CSS parts: the keyword as the base declaration, or `-dasharray: 8px 6px` and `-linecap: round`
 * (in §12 order) for the object form, which has no base declaration.
 */
export function cssStrokeStyle(s: IRStrokeStyle): readonly CssPart[] {
  if (s.keyword !== null) return sortParts([part('', s.keyword)]);
  return sortParts([part('-dasharray', s.dashArray.map((d) => cssDimension(d)).join(' ')), part('-linecap', s.lineCap ?? 'butt')]);
}

/** Swift `DSStrokeStyle(dash: [8, 6], lineCap: .round)`; a keyword becomes `DSStrokeStyle(keyword: .dashed)`. */
export function swiftStrokeStyle(s: IRStrokeStyle): string {
  if (s.keyword !== null) return `DSStrokeStyle(keyword: .${s.keyword})`;
  return `DSStrokeStyle(dash: [${s.dashArray.map(cgFloat).join(', ')}], lineCap: ${s.lineCap === null ? 'nil' : `.${s.lineCap}`})`;
}

export interface TsStrokeStyle {
  readonly keyword: IRStrokeStyle['keyword'];
  readonly dashArray: readonly number[];
  readonly lineCap: IRStrokeStyle['lineCap'];
}

/** `tokens.ts`: dash lengths in px. */
export function tsStrokeStyle(s: IRStrokeStyle): TsStrokeStyle {
  return { keyword: s.keyword, dashArray: s.dashArray.map(tsDimension), lineCap: s.lineCap };
}

export interface CssBorder {
  readonly base: string;
  readonly p3: string | null;
}

/**
 * CSS `<width> <style> <color>`. A border's object-form stroke style prints `dashed`: the border
 * shorthand has no dash array.
 */
export function cssBorder(b: IRBorder): CssBorder {
  const color = cssColor(b.color);
  const lead = `${cssDimension(b.width)} ${b.style.keyword ?? 'dashed'}`;
  return { base: `${lead} ${color.base}`, p3: color.p3 === null ? null : `${lead} ${color.p3}` };
}

/** Swift `DSBorderToken(color:width:style:)`. */
export function swiftBorder(b: IRBorder): string {
  return `DSBorderToken(color: ${swiftRGBA(b.color)}, width: ${cgFloat(b.width)}, style: ${swiftStrokeStyle(b.style)})`;
}

export interface TsBorder {
  readonly color: TsColor;
  readonly width: number;
  readonly style: TsStrokeStyle;
}

export function tsBorder(b: IRBorder): TsBorder {
  return { color: tsColor(b.color), width: tsDimension(b.width), style: tsStrokeStyle(b.style) };
}
