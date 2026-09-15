// Duration renderers (ARCHITECTURE §7.4): `prism/duration`. The IR holds milliseconds.
import type { IRDuration } from '../ir/types.ts';
import { DECIMALS, fmt, round } from './format-number.ts';

/** CSS: `150ms`. */
export function cssDuration(d: IRDuration): string {
  return `${fmt(d.ms, DECIMALS.ms)}ms`;
}

/** Swift `TimeInterval` in seconds: `0.15`. */
export function seconds(d: IRDuration): string {
  return fmt(d.ms / 1000, DECIMALS.seconds);
}

/** `tokens.ts`: milliseconds as a number. */
export function ms(d: IRDuration): number {
  return round(d.ms, DECIMALS.ms);
}

export interface FigmaDuration {
  readonly value: number;
  readonly unit: 's';
}

/** Figma-native flavor: Figma imports durations in seconds only. */
export function figmaDuration(d: IRDuration): FigmaDuration {
  return { value: round(d.ms / 1000, DECIMALS.seconds), unit: 's' };
}
