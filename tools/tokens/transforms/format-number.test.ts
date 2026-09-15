// The single number formatter (ARCHITECTURE §12 rule 2).
import { describe, expect, it } from 'vitest';
import { fixed, fmt, round } from './format-number.ts';

describe('fmt', () => {
  it.each([
    [0.25, 3, '0.25'],
    [1, 4, '1'],
    [1.5, 4, '1.5'],
    [0.9375, 4, '0.9375'],
    [-0.02, 4, '-0.02'],
    [-0.00001, 4, '0'],
    [-0, 4, '0'],
    [100, 2, '100'],
    [255, 1, '255'],
    [127.5, 1, '127.5'],
    [322.27276, 4, '322.2728'],
    [1e-7, 4, '0'],
    [123456789012, 3, '123456789012'],
    [55.00000000000001, 2, '55'],
  ])('fmt(%d, %d) = %s', (n, d, out) => {
    expect(fmt(n, d)).toBe(out);
  });

  it('never prints an exponent and rejects what it cannot print', () => {
    expect(fmt(1e20, 0)).toBe('100000000000000000000');
    expect(() => fmt(1e21, 0)).toThrow(RangeError);
    expect(() => fmt(Number.NaN, 2)).toThrow(RangeError);
    expect(() => fmt(Number.POSITIVE_INFINITY, 2)).toThrow(RangeError);
    expect(() => fmt(1, -1)).toThrow(RangeError);
    expect(() => fmt(1, 1.5)).toThrow(RangeError);
  });
});

describe('fixed and round', () => {
  it('fixed keeps exactly d decimals and never prints -0', () => {
    expect(fixed(0.64, 4)).toBe('0.6400');
    expect(fixed(1, 4)).toBe('1.0000');
    expect(fixed(-0.00001, 4)).toBe('0.0000');
    expect(fixed(0.36364, 4)).toBe('0.3636');
  });

  it('round returns the number fmt prints', () => {
    expect(round(157.91367, 4)).toBe(157.9137);
    expect(round(-0.00001, 4)).toBe(0);
    expect(Object.is(round(-0.00001, 4), -0)).toBe(false);
  });
});
