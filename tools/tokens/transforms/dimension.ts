// Dimension renderers (ARCHITECTURE §7.3; ADR-0021 §6): `prism/dimension/css` is `cssDimension`,
// `prism/dimension/cgfloat` is `cgFloat`. One token px is one CSS px and one Apple point; only type
// follows the reader's text size: a typography `fontSize` prints in rem (px / 16) and its
// `letterSpacing` in em of that size, so tracking scales with the text. Every other dimension stays
// in px, except one authored in rem, which stays rem.
import type { IRDimension } from '../ir/types.ts';
import { DECIMALS, fmt, round } from './format-number.ts';

/** How a dimension is used, which decides its CSS unit. */
export type DimensionRole =
  | { readonly kind: 'plain' }
  | { readonly kind: 'fontSize' }
  | { readonly kind: 'letterSpacing'; readonly fontSize: IRDimension };

export const PLAIN: DimensionRole = { kind: 'plain' };
export const FONT_SIZE: DimensionRole = { kind: 'fontSize' };

/** Browser default root size: rem = px / 16 (ADR-0021 §6; Prism never sets `font-size` on the root). */
export const REM_PX = 16;

/** The letter spacing as a fraction of the font size (CSS em, Swift `trackingEm`). */
export function emOf(letterSpacing: IRDimension, fontSize: IRDimension): number {
  if (fontSize.px === 0) throw new RangeError('letterSpacing needs a non-zero fontSize');
  return letterSpacing.px / fontSize.px;
}

/** `24px`, `0.9375rem` (a typography fontSize), `-0.02em` (a typography letterSpacing). */
export function cssDimension(d: IRDimension, role: DimensionRole = PLAIN): string {
  switch (role.kind) {
    case 'fontSize':
      return `${fmt(d.px / REM_PX, DECIMALS.rem)}rem`;
    case 'letterSpacing':
      return `${fmt(emOf(d, role.fontSize), DECIMALS.em)}em`;
    case 'plain':
      return d.unit === 'rem' ? `${fmt(d.value, DECIMALS.rem)}rem` : `${fmt(d.px, DECIMALS.px)}px`;
  }
}

/** Swift `CGFloat` points (= px): `24`. */
export function cgFloat(d: IRDimension): string {
  return fmt(d.px, DECIMALS.px);
}

/** Swift `DSTypeRole.trackingEm`: letterSpacing / fontSize, which DSCore multiplies by the scaled size. */
export function trackingEm(letterSpacing: IRDimension, fontSize: IRDimension): string {
  return fmt(emOf(letterSpacing, fontSize), DECIMALS.em);
}

/** `tokens.ts`: px as a number. */
export function tsDimension(d: IRDimension): number {
  return round(d.px, DECIMALS.px);
}

export interface FigmaDimension {
  readonly value: number;
  readonly unit: 'px';
}

/** Figma-native flavor: Figma imports dimensions in px only. */
export function figmaDimension(d: IRDimension): FigmaDimension {
  return { value: round(d.px, DECIMALS.px), unit: 'px' };
}

/** Tokens Studio flavor: `"24px"`. */
export function studioDimension(d: IRDimension): string {
  return `${fmt(d.px, DECIMALS.px)}px`;
}
