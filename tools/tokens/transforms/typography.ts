// Typography renderers (ARCHITECTURE §7.7; ADR-0021 §4–§6). The IR value is already scaled by the
// brand type scale and carries the permutation's resolved weight (dark weight, Increase Contrast
// floor) plus the derived `boldWeight`, which only Apple renders (the web has no Bold Text).
// CSS writes sub-declarations only: no `font` shorthand and no `font-style` (Prism has no italic,
// ADR-0021 §10). A sub-value that aliases an emitted token becomes `var()` in the format, which maps
// the IR's `subAliases` keys to suffixes through `TYPOGRAPHY_SUFFIX_OF`.
import type { IRTypography } from '../ir/types.ts';
import { cgFloat, cssDimension, emOf, FONT_SIZE, studioDimension, trackingEm, tsDimension, figmaDimension, type FigmaDimension } from './dimension.ts';
import { cssFontFamily, cssFontWeight, figmaFontFamily, studioFontFamily, studioFontWeight, swiftFontWeight, tsFontFamily, tsFontWeight } from './font.ts';
import { DECIMALS, fmt, round } from './format-number.ts';
import { part, sortParts, type CssPart } from './types.ts';

/** The CSS suffix of each typography sub-value (§8). */
export const TYPOGRAPHY_SUFFIX_OF: Readonly<Record<'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing', string>> = {
  fontFamily: '-font-family',
  fontSize: '-font-size',
  fontWeight: '-font-weight',
  lineHeight: '-line-height',
  letterSpacing: '-letter-spacing',
};

/** `font-variant-numeric` of the role's figures (ADR-0021 §5). */
export function cssNumeric(t: IRTypography): string {
  return t.numeric === 'tabular' ? 'tabular-nums' : 'normal';
}

/**
 * CSS sub-declarations in §12 order: `-font-family`, `-font-size` (rem), `-font-variant-numeric`,
 * `-font-weight` (the permutation's resolved weight), `-letter-spacing` (em), `-line-height` (unitless).
 */
export function cssTypography(t: IRTypography): readonly CssPart[] {
  return sortParts([
    part('-font-family', cssFontFamily(t.fontFamily)),
    part('-font-size', cssDimension(t.fontSize, FONT_SIZE)),
    part('-font-weight', cssFontWeight(t.fontWeight)),
    part('-line-height', fmt(t.lineHeight, DECIMALS.other)),
    part('-letter-spacing', cssDimension(t.letterSpacing, { kind: 'letterSpacing', fontSize: t.fontSize })),
    part('-font-variant-numeric', cssNumeric(t)),
  ]);
}

/**
 * Swift `DSTypeRole(slot:size:weight:boldWeight:lineHeight:trackingEm:numeric:textStyle:)`. The role
 * carries no family: DSCore takes it from `DSBrand.faces` by slot (ARCHITECTURE §9.7).
 */
export function swiftTypeRole(t: IRTypography): string {
  return (
    `DSTypeRole(slot: .${t.slot}, size: ${cgFloat(t.fontSize)}, weight: ${swiftFontWeight(t.fontWeight)}, ` +
    `boldWeight: ${fmt(t.boldWeight, 0)}, lineHeight: ${fmt(t.lineHeight, DECIMALS.other)}, ` +
    `trackingEm: ${trackingEm(t.letterSpacing, t.fontSize)}, numeric: .${t.numeric}, textStyle: .${t.textStyle})`
  );
}

/** `tokens.ts` TypeRoleValue (ARCHITECTURE §9.5): px sizes; canvas code scales them by root size / 16. */
export interface TsTypeRole {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly numeric: IRTypography['numeric'];
  readonly slot: IRTypography['slot'];
  readonly textStyle: IRTypography['textStyle'];
}

export function tsTypography(t: IRTypography): TsTypeRole {
  return {
    fontFamily: tsFontFamily(t.fontFamily),
    fontSize: tsDimension(t.fontSize),
    fontWeight: tsFontWeight(t.fontWeight),
    lineHeight: round(t.lineHeight, DECIMALS.other),
    letterSpacing: tsDimension(t.letterSpacing),
    numeric: t.numeric,
    slot: t.slot,
    textStyle: t.textStyle,
  };
}

/** Tokens Studio typography: an object of strings (`fontSize: "15px"`, `lineHeight: "150%"`). */
export interface StudioTypography {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: string;
  readonly lineHeight: string;
  readonly letterSpacing: string;
}

export function studioTypography(t: IRTypography): StudioTypography {
  return {
    fontFamily: studioFontFamily(t.fontFamily),
    fontSize: studioDimension(t.fontSize),
    fontWeight: studioFontWeight(t.fontWeight),
    lineHeight: `${fmt(t.lineHeight * 100, 2)}%`,
    letterSpacing: studioDimension(t.letterSpacing),
  };
}

/** Figma-native flavor: typography splits into five primitives (ARCHITECTURE §9.10). */
export interface FigmaTypography {
  readonly 'font-family': string;
  readonly 'font-size': FigmaDimension;
  readonly 'font-weight': number;
  readonly 'line-height': number;
  readonly 'letter-spacing': FigmaDimension;
}

export function figmaTypography(t: IRTypography): FigmaTypography {
  return {
    'font-family': figmaFontFamily(t.fontFamily),
    'font-size': figmaDimension(t.fontSize),
    'font-weight': tsFontWeight(t.fontWeight),
    'line-height': round(t.lineHeight, DECIMALS.other),
    'letter-spacing': figmaDimension(t.letterSpacing),
  };
}

/** The tracking of a role as a fraction of its size (for tables that compare numbers). */
export function trackingFraction(t: IRTypography): number {
  return round(emOf(t.letterSpacing, t.fontSize), DECIMALS.em);
}
