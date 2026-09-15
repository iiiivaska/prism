// The renderers of P1-4 in one place (ARCHITECTURE §7): pure functions from a normalized IR value to
// the text or object each target prints. Formats (P1-5) call these only; they never call Color.js,
// Motion or Style Dictionary. The dispatchers below pick the renderer by the value's `kind`.
import type { IRToken, IRValue } from '../ir/types.ts';
import { colorsetComponents, cssColor, swiftRGBA, tsColor, type TsColor } from './color.ts';
import { tsCubicBezier, cssCubicBezier, swiftCubicBezier, type TsCubicBezier } from './cubic-bezier.ts';
import { cgFloat, cssDimension, tsDimension } from './dimension.ts';
import { cssDuration, ms, seconds } from './duration.ts';
import { cssFontFamily, cssFontWeight, swiftFontFamilies, swiftFontWeight, tsFontFamily, tsFontWeight } from './font.ts';
import { cssGradient, swiftGradient, tsGradient, type TsGradient } from './gradient.ts';
import { cssNumber, swiftNumber, tsNumber } from './number.ts';
import { cssShadow, swiftShadow, tsShadow, type TsShadowLayer } from './shadow.ts';
import { cssTransitionParts, swiftSpring, swiftTransition, tsSpring, tsTransition, type TsSpring, type TsTransition } from './spring.ts';
import { cssBorder, cssStrokeStyle, swiftBorder, swiftStrokeStyle, tsBorder, tsStrokeStyle, type TsBorder, type TsStrokeStyle } from './stroke.ts';
import { cssTypography, swiftTypeRole, tsTypography, type TsTypeRole } from './typography.ts';
import { part, type AppleColorOptions, type CssPart } from './types.ts';

export * from './color.ts';
export * from './cubic-bezier.ts';
export * from './dimension.ts';
export * from './duration.ts';
export * from './font.ts';
export * from './format-number.ts';
export * from './gradient.ts';
export * from './number.ts';
export * from './shadow.ts';
export * from './spring.ts';
export * from './stroke.ts';
export * from './typography.ts';
export * from './types.ts';

/** The roadmap's transform names (P1-4) and the renderers that implement them (ARCHITECTURE §7.1). */
export const TRANSFORM_NAMES: Readonly<Record<string, readonly string[]>> = {
  'prism/color/css-gamut': ['cssColor'],
  'prism/color/p3': ['swiftRGBA', 'colorsetComponents'],
  'prism/dimension/css': ['cssDimension'],
  'prism/dimension/cgfloat': ['cgFloat'],
  'prism/duration': ['cssDuration', 'seconds', 'ms', 'figmaDuration'],
  'prism/spring': ['springPhysics', 'settleMs', 'springCurve', 'cssLinear'],
};

/**
 * The id a format renders this token as a reference to (`var()`, a Swift accessor), or null when it
 * renders a literal: a token that is no whole-value alias, or an alias with its own `app.prism.alpha`,
 * which renders as a literal of its target with that alpha (ADR-0020 §3; ARCHITECTURE §5.5).
 */
export function emitsAlias(token: Pick<IRToken, 'aliasOf' | 'alpha'>): string | null {
  return token.aliasOf !== null && token.alpha === null ? token.aliasOf : null;
}

/** Options for the Apple renderers of a whole token: an alpha alias renders its target's P3 components. */
export function appleOptions(token: Pick<IRToken, 'alpha'>): AppleColorOptions {
  return { alphaAlias: token.alpha !== null };
}

/** The literal CSS parts of any value (base declaration first, then derived declarations, §12). */
export function cssParts(value: IRValue): readonly CssPart[] {
  switch (value.kind) {
    case 'color': {
      const c = cssColor(value);
      return [part('', c.base, c.p3 === null ? [] : [{ kind: 'p3', value: c.p3 }])];
    }
    case 'dimension':
      return [part('', cssDimension(value))];
    case 'duration':
      return [part('', cssDuration(value))];
    case 'number':
      return [part('', cssNumber(value))];
    case 'fontFamily':
      return [part('', cssFontFamily(value))];
    case 'fontWeight':
      return [part('', cssFontWeight(value))];
    case 'cubicBezier':
      return [part('', cssCubicBezier(value))];
    case 'strokeStyle':
      return cssStrokeStyle(value);
    case 'border': {
      const b = cssBorder(value);
      return [part('', b.base, b.p3 === null ? [] : [{ kind: 'p3', value: b.p3 }])];
    }
    case 'shadow': {
      const s = cssShadow(value);
      return [part('', s.base, s.p3 === null ? [] : [{ kind: 'p3', value: s.p3 }])];
    }
    case 'gradient':
      return cssGradient(value);
    case 'typography':
      return cssTypography(value);
    case 'transition':
      return cssTransitionParts(value);
  }
}

/**
 * The Swift literal of any value. A transition with a spring renders as its `DSSpringToken`
 * (the `DSTokenSet.Motion` members, ARCHITECTURE §9.7.4), any other as a `DSTransitionToken`.
 */
export function swiftLiteral(value: IRValue, options: AppleColorOptions = {}): string {
  switch (value.kind) {
    case 'color':
      return swiftRGBA(value, options);
    case 'dimension':
      return cgFloat(value);
    case 'duration':
      return seconds(value);
    case 'number':
      return swiftNumber(value);
    case 'fontFamily':
      return swiftFontFamilies(value);
    case 'fontWeight':
      return swiftFontWeight(value);
    case 'cubicBezier':
      return swiftCubicBezier(value);
    case 'strokeStyle':
      return swiftStrokeStyle(value);
    case 'border':
      return swiftBorder(value);
    case 'shadow':
      return swiftShadow(value);
    case 'gradient':
      return swiftGradient(value);
    case 'typography':
      return swiftTypeRole(value);
    case 'transition':
      return value.spring === null ? swiftTransition(value) : swiftSpring(value.spring);
  }
}

export type TsValue =
  | TsColor | number | boolean | string | TsCubicBezier | TsStrokeStyle | TsBorder | readonly TsShadowLayer[]
  | TsGradient | TsTypeRole | TsSpring | TsTransition;

/** The `tokens.ts` value of any value (ARCHITECTURE §9.5). */
export function tsLiteral(value: IRValue): TsValue {
  switch (value.kind) {
    case 'color':
      return tsColor(value);
    case 'dimension':
      return tsDimension(value);
    case 'duration':
      return ms(value);
    case 'number':
      return tsNumber(value);
    case 'fontFamily':
      return tsFontFamily(value);
    case 'fontWeight':
      return tsFontWeight(value);
    case 'cubicBezier':
      return tsCubicBezier(value);
    case 'strokeStyle':
      return tsStrokeStyle(value);
    case 'border':
      return tsBorder(value);
    case 'shadow':
      return tsShadow(value);
    case 'gradient':
      return tsGradient(value);
    case 'typography':
      return tsTypography(value);
    case 'transition':
      return value.spring === null ? tsTransition(value) : tsSpring(value);
  }
}

/** The colorset entry of a color token (`prism/color/p3`); an alpha alias renders its target's P3 components. */
export function colorsetOf(token: Pick<IRToken, 'alpha' | 'value'>): ReturnType<typeof colorsetComponents> {
  if (token.value.kind !== 'color') throw new TypeError('colorsetOf needs a color token');
  return colorsetComponents(token.value, appleOptions(token));
}
