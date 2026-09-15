// prism/duration (ARCHITECTURE §7.4) and the cubic Bézier renderers (§7.5).
import { describe, expect, it } from 'vitest';
import type { IRCubicBezier, IRDuration } from '../ir/types.ts';
import { cssCubicBezier, swiftCubicBezier, tsCubicBezier } from './cubic-bezier.ts';
import { cssDuration, figmaDuration, ms, seconds } from './duration.ts';

const d = (value: number): IRDuration => ({ kind: 'duration', ms: value });
const b = (x1: number, y1: number, x2: number, y2: number): IRCubicBezier => ({ kind: 'cubicBezier', points: [x1, y1, x2, y2] });

describe('duration', () => {
  it('CSS ms (3 decimals), Swift seconds (4), TS ms, Figma seconds', () => {
    expect(cssDuration(d(150))).toBe('150ms');
    expect(cssDuration(d(0))).toBe('0ms');
    expect(cssDuration(d(487.5))).toBe('487.5ms');
    expect(seconds(d(150))).toBe('0.15');
    expect(seconds(d(487))).toBe('0.487');
    expect(seconds(d(0))).toBe('0');
    expect(seconds(d(12345.6))).toBe('12.3456');
    expect(ms(d(250))).toBe(250);
    expect(figmaDuration(d(250))).toEqual({ value: 0.25, unit: 's' });
  });
});

describe('cubic Bézier', () => {
  it('CSS, Swift and TS forms with 4 decimals per number', () => {
    expect(cssCubicBezier(b(0.23, 1, 0.32, 1))).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
    expect(cssCubicBezier(b(0.77, 0, 0.175, 1))).toBe('cubic-bezier(0.77, 0, 0.175, 1)');
    expect(cssCubicBezier(b(0.123456, -0.5, 0.9, 1.25))).toBe('cubic-bezier(0.1235, -0.5, 0.9, 1.25)');
    expect(swiftCubicBezier(b(0.23, 1, 0.32, 1))).toBe('DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32, y2: 1)');
    expect(tsCubicBezier(b(0.32, 0.72, 0, 1))).toEqual({ points: [0.32, 0.72, 0, 1], css: 'cubic-bezier(0.32, 0.72, 0, 1)' });
  });
});
