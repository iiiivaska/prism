// Cubic Bézier renderers (ARCHITECTURE §7.5). Four decimals per number.
import type { IRCubicBezier } from '../ir/types.ts';
import { DECIMALS, fmt, round } from './format-number.ts';

/** CSS: `cubic-bezier(0.23, 1, 0.32, 1)`. */
export function cssCubicBezier(b: IRCubicBezier): string {
  return `cubic-bezier(${b.points.map((p) => fmt(p, DECIMALS.other)).join(', ')})`;
}

/** Swift: `DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32, y2: 1)`; `animation(duration:)` makes a `.timingCurve`. */
export function swiftCubicBezier(b: IRCubicBezier): string {
  const [x1, y1, x2, y2] = b.points;
  const f = (n: number): string => fmt(n, DECIMALS.other);
  return `DSCubicBezier(x1: ${f(x1)}, y1: ${f(y1)}, x2: ${f(x2)}, y2: ${f(y2)})`;
}

export interface TsCubicBezier {
  readonly points: readonly [number, number, number, number];
  readonly css: string;
}

/** `tokens.ts`: `{ points: [0.23, 1, 0.32, 1], css: 'cubic-bezier(0.23, 1, 0.32, 1)' }`. */
export function tsCubicBezier(b: IRCubicBezier): TsCubicBezier {
  const [x1, y1, x2, y2] = b.points;
  return {
    points: [round(x1, DECIMALS.other), round(y1, DECIMALS.other), round(x2, DECIMALS.other), round(y2, DECIMALS.other)],
    css: cssCubicBezier(b),
  };
}
