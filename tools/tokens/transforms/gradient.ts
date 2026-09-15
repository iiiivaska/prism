// Gradient renderers (ARCHITECTURE §7.9; ADR-0022 §4, ADR-0024 §6). The angle has CSS semantics
// (default 180°). Grain and bloom belong to the bound gradient, so CSS always emits the derived
// declarations `-grain`, `-bloom-alpha` and `-bloom-blur`, with the neutral 0, 0 and 0px when absent.
// Both stacks interpolate the stops in OKLab (P1-5's parity decision, ARCHITECTURE §7.9 and §16.3):
// the CSS forms say `in oklab`, because CSS interpolates a gradient whose stops are all legacy sRGB
// forms (`rgb()`) in gamma sRGB unless told otherwise; DSCore draws the same space (P3-1).
import type { IRGradient } from '../ir/types.ts';
import { cssColor, studioColor, swiftRGBA, tsColor, type TsColor } from './color.ts';
import { DECIMALS, fmt, round } from './format-number.ts';
import { part, sortParts, type CssPart } from './types.ts';

export const DEFAULT_ANGLE = 180;

/** The `<color-interpolation-method>` of every CSS gradient: OKLab on both stacks (ARCHITECTURE §7.9). */
export const GRADIENT_INTERPOLATION = 'in oklab';

function angleOf(g: IRGradient): number {
  return g.angle ?? DEFAULT_ANGLE;
}

function position(p: number): string {
  return `${fmt(p * 100, DECIMALS.linearPosition)}%`;
}

/** `interpolation`, when given, follows the angle, as Tailwind v4 writes it (`to right in oklab`). */
function linearGradient(g: IRGradient, colors: readonly string[], interpolation: string | null): string {
  const stops = g.stops.map((s, i) => `${colors[i] ?? ''} ${position(s.position)}`);
  const line = `${fmt(angleOf(g), DECIMALS.other)}deg${interpolation === null ? '' : ` ${interpolation}`}`;
  return `linear-gradient(${line}, ${stops.join(', ')})`;
}

/**
 * CSS parts: `linear-gradient(<angle>deg in oklab, <color> <position>%, …)` with a P3 twin of the whole
 * declaration when a literal stop lies outside sRGB, then `-bloom-alpha`, `-bloom-blur` and `-grain`.
 * `stopColors[i]`, when given, replaces stop i's color text (the format passes `var(--ds-…)` for a
 * stop that aliases an emitted color; such a stop never causes a twin).
 */
export function cssGradient(g: IRGradient, stopColors: readonly (string | null | undefined)[] = []): readonly CssPart[] {
  const texts = g.stops.map((s, i) => {
    const override = stopColors[i] ?? null;
    if (override !== null) return { base: override, p3: null };
    return cssColor(s.color);
  });
  const base = linearGradient(g, texts.map((c) => c.base), GRADIENT_INTERPOLATION);
  const twin = texts.some((c) => c.p3 !== null) ? linearGradient(g, texts.map((c) => c.p3 ?? c.base), GRADIENT_INTERPOLATION) : null;
  return sortParts([
    part('', base, twin === null ? [] : [{ kind: 'p3', value: twin }]),
    part('-grain', fmt(g.grain ?? 0, DECIMALS.other)),
    part('-bloom-alpha', fmt(g.bloom?.alpha ?? 0, DECIMALS.other)),
    part('-bloom-blur', `${fmt(g.bloom?.blur ?? 0, DECIMALS.px)}px`),
  ]);
}

/** Swift `DSGradientToken(stops:angle:grain:scheme:bloomAlpha:bloomBlur:)`; DSCore draws CSS angles (ADR-0022 §4.1) in OKLab. */
export function swiftGradient(g: IRGradient): string {
  const stops = g.stops.map((s) => `DSGradientStop(color: ${swiftRGBA(s.color)}, location: ${fmt(s.position, DECIMALS.other)})`);
  const scheme = g.scheme === null ? 'nil' : `.${g.scheme}`;
  return (
    `DSGradientToken(stops: [${stops.join(', ')}], angle: ${fmt(angleOf(g), DECIMALS.other)}, grain: ${fmt(g.grain ?? 0, DECIMALS.other)}, ` +
    `scheme: ${scheme}, bloomAlpha: ${fmt(g.bloom?.alpha ?? 0, DECIMALS.other)}, bloomBlur: ${fmt(g.bloom?.blur ?? 0, DECIMALS.px)})`
  );
}

/** `tokens.ts` gradient value: the CSS forms, the stops and the defaults resolved. */
export interface TsGradient {
  readonly css: string;
  readonly cssP3: string | null;
  readonly stops: readonly { readonly color: TsColor; readonly position: number }[];
  readonly angle: number;
  readonly grain: number;
  readonly scheme: 'light' | 'dark' | null;
  readonly bloom: { readonly alpha: number; readonly blur: number } | null;
}

export function tsGradient(g: IRGradient): TsGradient {
  const [base] = cssGradient(g);
  return {
    css: base?.value ?? '',
    cssP3: base?.twins.find((t) => t.kind === 'p3')?.value ?? null,
    stops: g.stops.map((s) => ({ color: tsColor(s.color), position: round(s.position, DECIMALS.other) })),
    angle: round(angleOf(g), DECIMALS.other),
    grain: round(g.grain ?? 0, DECIMALS.other),
    scheme: g.scheme,
    bloom: g.bloom === null ? null : { alpha: round(g.bloom.alpha, DECIMALS.other), blur: round(g.bloom.blur ?? 0, DECIMALS.px) },
  };
}

/**
 * Tokens Studio flavor: a `color` token holding the `linear-gradient(…)` string, stops as `#rrggbb` or
 * `rgba()`, with no interpolation method: the flavor is informative, and design tools draw gradients in
 * their own space (ARCHITECTURE §7.9).
 */
export function studioGradient(g: IRGradient): string {
  return linearGradient(g, g.stops.map((s) => studioColor(s.color)), null);
}
