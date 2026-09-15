// prism/dimension/css and prism/dimension/cgfloat (ARCHITECTURE §7.3; ADR-0021 §6 and rule 6).
import { describe, expect, it } from 'vitest';
import type { IRDimension } from '../ir/types.ts';
import {
  cgFloat, cssDimension, emOf, figmaDimension, FONT_SIZE, studioDimension, trackingEm, tsDimension,
} from './dimension.ts';

const px = (value: number): IRDimension => ({ kind: 'dimension', value, unit: 'px', px: value });
const rem = (value: number): IRDimension => ({ kind: 'dimension', value, unit: 'rem', px: value * 16 });

describe('cssDimension', () => {
  it('prints px for every dimension that is not type, 3 decimals', () => {
    expect(cssDimension(px(24))).toBe('24px');
    expect(cssDimension(px(1.5))).toBe('1.5px');
    expect(cssDimension(px(0))).toBe('0px');
    expect(cssDimension(px(-4))).toBe('-4px');
    expect(cssDimension(px(0.33333))).toBe('0.333px');
  });

  it('keeps a dimension authored in rem', () => {
    expect(cssDimension(rem(1.5))).toBe('1.5rem');
    expect(cssDimension(rem(0.0625))).toBe('0.0625rem');
  });

  it('prints a typography fontSize in rem = px / 16, 4 decimals', () => {
    expect(cssDimension(px(15), FONT_SIZE)).toBe('0.9375rem');
    expect(cssDimension(px(64), FONT_SIZE)).toBe('4rem');
    expect(cssDimension(px(13), FONT_SIZE)).toBe('0.8125rem');
    expect(cssDimension(px(11), FONT_SIZE)).toBe('0.6875rem');
    expect(cssDimension(px(15 * 1.1), FONT_SIZE)).toBe('1.0313rem');
    expect(cssDimension(rem(1), FONT_SIZE)).toBe('1rem');
  });

  it('prints a typography letterSpacing in em of its fontSize (display.xl: -1.28 px at 64 px)', () => {
    expect(cssDimension(px(-1.28), { kind: 'letterSpacing', fontSize: px(64) })).toBe('-0.02em');
    expect(cssDimension(px(0), { kind: 'letterSpacing', fontSize: px(15) })).toBe('0em');
    expect(cssDimension(px(0.65), { kind: 'letterSpacing', fontSize: px(13) })).toBe('0.05em');
    expect(cssDimension(px(-0.48), { kind: 'letterSpacing', fontSize: px(48) })).toBe('-0.01em');
    expect(() => cssDimension(px(1), { kind: 'letterSpacing', fontSize: px(0) })).toThrow(RangeError);
  });
});

describe('other targets', () => {
  it('Swift CGFloat points = px; trackingEm = letterSpacing / fontSize', () => {
    expect(cgFloat(px(24))).toBe('24');
    expect(cgFloat(px(-1.5))).toBe('-1.5');
    expect(cgFloat(rem(1))).toBe('16');
    expect(trackingEm(px(-1.28), px(64))).toBe('-0.02');
    expect(trackingEm(px(0), px(15))).toBe('0');
    expect(emOf(px(0.26), px(13))).toBeCloseTo(0.02, 12);
  });

  it('TS px numbers, Figma { value, unit: px }, Tokens Studio "24px"', () => {
    expect(tsDimension(px(24))).toBe(24);
    expect(tsDimension(rem(0.5))).toBe(8);
    expect(tsDimension(px(-0.0001))).toBe(0);
    expect(figmaDimension(px(1.5))).toEqual({ value: 1.5, unit: 'px' });
    expect(figmaDimension(rem(2))).toEqual({ value: 32, unit: 'px' });
    expect(studioDimension(px(24))).toBe('24px');
    expect(studioDimension(rem(0.25))).toBe('4px');
  });
});
