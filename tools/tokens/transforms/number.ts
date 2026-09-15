// Number and flag renderers (ARCHITECTURE §7.11; ADR-0023 §10, ADR-0024 §4.2). A flag is a number
// token with `app.prism.flag`, 0 or 1: CSS keeps 0 / 1 (component CSS multiplies by it), Swift and
// TS get booleans, Figma a number marked boolean, Tokens Studio a boolean token.
import type { IRNumber } from '../ir/types.ts';
import { DECIMALS, fmt, round } from './format-number.ts';

function on(n: IRNumber): boolean {
  return n.value !== 0;
}

/** CSS: a plain number (4 decimals); a flag prints `0` or `1`. */
export function cssNumber(n: IRNumber): string {
  if (n.flag) return on(n) ? '1' : '0';
  return fmt(n.value, DECIMALS.other);
}

/** Swift: a `Double` literal, or `true` / `false` for a flag. */
export function swiftNumber(n: IRNumber): string {
  if (n.flag) return on(n) ? 'true' : 'false';
  return fmt(n.value, DECIMALS.other);
}

/** `tokens.ts`: a number, or a boolean for a flag. */
export function tsNumber(n: IRNumber): number | boolean {
  return n.flag ? on(n) : round(n.value, DECIMALS.other);
}

export interface FigmaNumber {
  readonly $type: 'number';
  readonly $value: number;
  readonly $extensions?: { readonly 'com.figma.type': 'boolean' };
}

/** Figma-native flavor: a number; a flag carries `"com.figma.type": "boolean"` (§15 F29). */
export function figmaNumber(n: IRNumber): FigmaNumber {
  if (n.flag) return { $type: 'number', $value: on(n) ? 1 : 0, $extensions: { 'com.figma.type': 'boolean' } };
  return { $type: 'number', $value: round(n.value, DECIMALS.other) };
}

export interface StudioNumber {
  /** `number` or `boolean`; the Tokens Studio format re-types category numbers such as `opacity.*`. */
  readonly type: 'number' | 'boolean';
  readonly value: string;
}

/** Tokens Studio flavor: values are strings; a flag is a `boolean` token `"true"` / `"false"`. */
export function studioNumber(n: IRNumber): StudioNumber {
  if (n.flag) return { type: 'boolean', value: on(n) ? 'true' : 'false' };
  return { type: 'number', value: fmt(n.value, DECIMALS.other) };
}
