// The single number formatter (ARCHITECTURE §12 rule 2). Every number a renderer prints goes
// through `fmt`: `n.toFixed(d)`, trailing zeros and a trailing dot removed, `-0` printed as `0`, never
// exponent notation. `fixed` keeps exactly `d` decimals (colorset components, §9.8).

/** Decimals per quantity (ARCHITECTURE §12 rule 2). */
export const DECIMALS = {
  oklchL: 4,
  oklchC: 4,
  oklchH: 2,
  rgb255: 1,
  alpha: 3,
  component: 4,
  colorset: 4,
  px: 3,
  rem: 4,
  em: 4,
  ms: 3,
  seconds: 4,
  physics: 4,
  linearValue: 4,
  linearPosition: 2,
  other: 4,
} as const;

function checked(n: number, decimals: number): void {
  if (!Number.isFinite(n)) throw new RangeError(`cannot format ${n}`);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 20) throw new RangeError(`invalid decimal count ${decimals}`);
  // toFixed switches to exponent notation from 1e21 on.
  if (Math.abs(n) >= 1e21) throw new RangeError(`${n} is too large to print without an exponent`);
}

/** `n` with at most `decimals` decimals: `fmt(0.25, 3)` → `0.25`, `fmt(-0.00001, 4)` → `0`. */
export function fmt(n: number, decimals: number): string {
  checked(n, decimals);
  let s = n.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/** `n` with exactly `decimals` decimals: `fixed(0.64, 4)` → `0.6400`; a negative zero prints unsigned. */
export function fixed(n: number, decimals: number): string {
  checked(n, decimals);
  const s = n.toFixed(decimals);
  return /^-0(?:\.0*)?$/.test(s) ? s.slice(1) : s;
}

/** The number `fmt` prints, for targets that take numbers (TS, Figma). */
export function round(n: number, decimals: number): number {
  return Number(fmt(n, decimals));
}
