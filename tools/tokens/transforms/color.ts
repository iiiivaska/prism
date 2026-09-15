// Color renderers (ARCHITECTURE §7.2; ADR-0020 §3; ADR-0024 §12): `prism/color/css-gamut` is
// `cssColor`, `prism/color/p3` is `swiftRGBA` and `colorsetComponents`; plus the TS, Figma and Tokens
// Studio forms. Every renderer is a function of the normalized `IRColor`. An alias with its own
// `app.prism.alpha` arrives as its target's color with that alpha, so it renders as a literal of the
// target (the formats never emit `var()` or a Swift alias for it, `emitsAlias` in index.ts).
// Nothing is pre-composited. A `none` component renders as 0 on every target (CSS Color 4 renders
// a missing component as zero). Color.js serves only the OKLCH conversion of gamut-mapped colors;
// its `toString()` is never used (§12 rule 3).
import Color from 'colorjs.io';
import type { IRColor, Triple } from '../ir/types.ts';
import { DECIMALS, fixed, fmt, round } from './format-number.ts';
import { memoByJson, type AppleColorOptions } from './types.ts';

export interface CssColor {
  /** The declaration value: `oklch(…)` or, for authored sRGB, `rgb(…)`. */
  readonly base: string;
  /** The `@media (color-gamut: p3)` twin; null unless the color lies outside sRGB. */
  readonly p3: string | null;
}

/** Below this OKLCH chroma a color is achromatic and its hue prints as 0 (§7.2). */
export const ACHROMATIC_CHROMA = 0.00005;

function finite(v: number | 'none'): number {
  return v === 'none' || Number.isNaN(v) ? 0 : v;
}

function alphaText(alpha: number): string {
  const a = fmt(alpha, DECIMALS.alpha);
  return a === '1' ? '' : ` / ${a}`;
}

function oklchText([l, c, h]: Triple, alpha: number): string {
  const chroma = finite(c);
  const hue = Number.isNaN(h) || chroma < ACHROMATIC_CHROMA ? 0 : h;
  return `oklch(${fmt(finite(l), DECIMALS.oklchL)} ${fmt(chroma, DECIMALS.oklchC)} ${fmt(hue, DECIMALS.oklchH)}${alphaText(alpha)})`;
}

function rgbText(components: IRColor['components'], alpha: number): string {
  return `rgb(${components.map((v) => fmt(finite(v) * 255, DECIMALS.rgb255)).join(' ')}${alphaText(alpha)})`;
}

const oklchMemo = new Map<string, Triple>();

/** OKLCH of an already gamut-mapped sRGB or Display P3 color. */
function oklchOf(space: 'srgb' | 'p3', coords: Triple): Triple {
  const key = `${space}|${coords.join(',')}`;
  const hit = oklchMemo.get(key);
  if (hit !== undefined) return hit;
  const ok = new Color(space, [finite(coords[0]), finite(coords[1]), finite(coords[2])], 1).to('oklch').coords;
  const out: Triple = [ok[0] ?? 0, ok[1] ?? 0, ok[2] ?? 0];
  oklchMemo.set(key, out);
  return out;
}

/**
 * `prism/color/css-gamut`. Authored sRGB (the white and black overlays `sys` keeps) prints as
 * `rgb(R G B[ / A])` with its authored components. Any other space prints as `oklch(L C H[ / A])`:
 * the authored OKLCH inside sRGB; outside sRGB the OKLCH of the CSS-gamut-mapped sRGB color, with a
 * P3 twin that carries the authored color (or its P3-mapped color when it also lies outside P3).
 */
export const cssColor = memoByJson((c: IRColor): CssColor => {
  if (c.space === 'srgb') return { base: rgbText(c.components, c.alpha), p3: null };
  if (c.inSrgb) return { base: oklchText(c.oklch, c.alpha), p3: null };
  const base = oklchText(oklchOf('srgb', c.srgb), c.alpha);
  const p3 = oklchText(c.inP3 ? c.oklch : oklchOf('p3', c.p3), c.alpha);
  return { base, p3: p3 === base ? null : p3 };
});

export type AppleColorSpace = 'sRGB' | 'displayP3';

export interface AppleColor {
  readonly space: AppleColorSpace;
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

/**
 * The unrounded components Swift and the colorsets use (§7.2): authored sRGB keeps its space and
 * components, authored Display P3 its components, anything else is the CSS-gamut-mapped Display P3
 * color. An alpha alias renders its target's Display P3 components (ADR-0020 §3).
 */
export function appleColor(c: IRColor, options: AppleColorOptions = {}): AppleColor {
  const alpha = c.alpha;
  if (c.space === 'srgb' && options.alphaAlias !== true) {
    return { space: 'sRGB', red: finite(c.components[0]), green: finite(c.components[1]), blue: finite(c.components[2]), alpha };
  }
  if (c.space === 'display-p3') {
    return { space: 'displayP3', red: finite(c.components[0]), green: finite(c.components[1]), blue: finite(c.components[2]), alpha };
  }
  return { space: 'displayP3', red: finite(c.p3[0]), green: finite(c.p3[1]), blue: finite(c.p3[2]), alpha };
}

/** `prism/color/p3` for Swift: `DSRGBA(.displayP3, 0.3636, 0.3759, 0.4049, 1)`. */
export function swiftRGBA(c: IRColor, options: AppleColorOptions = {}): string {
  const a = appleColor(c, options);
  const comps = [a.red, a.green, a.blue].map((v) => fmt(v, DECIMALS.component)).join(', ');
  return `DSRGBA(.${a.space}, ${comps}, ${fmt(a.alpha, DECIMALS.alpha)})`;
}

export interface ColorsetColor {
  readonly 'color-space': 'display-p3' | 'srgb';
  readonly components: { readonly alpha: string; readonly blue: string; readonly green: string; readonly red: string };
}

/** `prism/color/p3` for `Colors.xcassets`: components as strings with exactly 4 decimals, keys sorted. */
export function colorsetComponents(c: IRColor, options: AppleColorOptions = {}): ColorsetColor {
  const a = appleColor(c, options);
  return {
    'color-space': a.space === 'sRGB' ? 'srgb' : 'display-p3',
    components: {
      alpha: fixed(a.alpha, DECIMALS.colorset),
      blue: fixed(a.blue, DECIMALS.colorset),
      green: fixed(a.green, DECIMALS.colorset),
      red: fixed(a.red, DECIMALS.colorset),
    },
  };
}

export interface FigmaColor {
  readonly colorSpace: 'srgb';
  readonly components: readonly [number, number, number];
  readonly alpha: number;
  /** The 6-digit color without alpha (ADR-0024 §12). */
  readonly hex: string;
}

/** Figma-native flavor: the CSS-gamut-mapped sRGB components (4 decimals), the authored alpha (3). */
export function figmaColor(c: IRColor): FigmaColor {
  return {
    colorSpace: 'srgb',
    components: [round(finite(c.srgb[0]), DECIMALS.component), round(finite(c.srgb[1]), DECIMALS.component), round(finite(c.srgb[2]), DECIMALS.component)],
    alpha: round(c.alpha, DECIMALS.alpha),
    hex: c.hex,
  };
}

function byte(v: number): number {
  return Math.round(Math.min(1, Math.max(0, finite(v))) * 255);
}

/**
 * Tokens Studio flavor: `#rrggbb` when opaque, `rgba(R, G, B, A)` below alpha 1; never 8-digit hex,
 * which Tokens Studio reads as ARGB (ADR-0024 §12).
 */
export function studioColor(c: IRColor): string {
  const a = fmt(c.alpha, DECIMALS.alpha);
  if (a === '1') return c.hex;
  return `rgba(${byte(c.srgb[0])}, ${byte(c.srgb[1])}, ${byte(c.srgb[2])}, ${a})`;
}

export interface StudioAlphaModifier {
  readonly type: 'alpha';
  readonly value: string;
  readonly space: 'srgb';
  readonly format: 'hex';
}

/** `$extensions["studio.tokens"].modify` of an alias with `app.prism.alpha` (ADR-0020 §3). */
export function studioAlphaModifier(alpha: number): StudioAlphaModifier {
  return { type: 'alpha', value: fmt(alpha, DECIMALS.alpha), space: 'srgb', format: 'hex' };
}

export interface TsColor {
  readonly css: string;
  readonly cssP3: string | null;
  readonly hex: string;
  readonly alpha: number;
}

/** `tokens.ts` ColorValue (ARCHITECTURE §9.5). */
export function tsColor(c: IRColor): TsColor {
  const css = cssColor(c);
  return { css: css.base, cssP3: css.p3, hex: c.hex, alpha: round(c.alpha, DECIMALS.alpha) };
}
