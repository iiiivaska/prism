// Gradient sampling and Card header geometry (ADR-0022 §4.1; visual-dna §5.1 rule 2).
import { describe, expect, test } from 'vitest';
import type { Triple } from '../tokens/api.ts';
import {
  CARD_SIZES, colorAt, fixupStops, gradientT, headerBlock, headerInterval, headerSamples, mix, sampleGradient, SAMPLES_PER_SEGMENT,
  type CardGeometry, type GradientStop,
} from './gradient.ts';

const BLACK: Triple = [0, 0, 0];
const WHITE: Triple = [1, 1, 1];
const compact166: CardGeometry = { width: 166, height: 166, padding: 16, action: 32, density: 'compact' };

describe('gradientT (CSS angle semantics)', () => {
  test('180deg runs top to bottom, 0deg bottom to top, 90deg left to right', () => {
    expect(gradientT(40, 0, 166, 166, 180)).toBeCloseTo(0, 10);
    expect(gradientT(40, 83, 166, 166, 180)).toBeCloseTo(0.5, 10);
    expect(gradientT(120, 166, 166, 166, 180)).toBeCloseTo(1, 10);
    expect(gradientT(0, 50, 240, 200, 180)).toBeCloseTo(0.25, 10);
    expect(gradientT(10, 0, 240, 200, 0)).toBeCloseTo(1, 10);
    expect(gradientT(60, 100, 240, 200, 90)).toBeCloseTo(0.25, 10);
  });

  test('135deg on a square goes from the top-left corner to the bottom-right corner', () => {
    expect(gradientT(0, 0, 100, 100, 135)).toBeCloseTo(0, 10);
    expect(gradientT(100, 100, 100, 100, 135)).toBeCloseTo(1, 10);
    expect(gradientT(100, 0, 100, 100, 135)).toBeCloseTo(0.5, 10);
  });

  test('the gradient line of a non-square box reaches its corners (visual-dna §5.1 rule 2)', () => {
    // 165deg on 320 × 200: the first stop's corner is the top-left, the last stop's the bottom-right.
    expect(gradientT(0, 0, 320, 200, 165)).toBeCloseTo(0, 10);
    expect(gradientT(320, 200, 320, 200, 165)).toBeCloseTo(1, 10);
  });
});

describe('the Card header block (ADR-0022 §4.1 V2)', () => {
  test('four reference sizes', () => {
    expect(CARD_SIZES).toEqual([[166, 166], [240, 240], [320, 200], [180, 240]]);
  });

  test('x from p to W − p − a − 16, y from p to p + 64', () => {
    expect(headerBlock(compact166)).toEqual({ x0: 16, x1: 102, y0: 16, y1: 80 });
    expect(headerBlock({ width: 240, height: 240, padding: 24, action: 48, density: 'comfortable' })).toEqual({ x0: 24, x1: 152, y0: 24, y1: 88 });
    expect(() => headerBlock({ width: 80, height: 80, padding: 24, action: 48, density: null })).toThrow(/does not fit/);
  });

  test('the t interval is the span of the block corners', () => {
    const [a0, a1] = headerInterval(compact166, 180);
    expect(a0).toBeCloseTo(16 / 166, 10);
    expect(a1).toBeCloseTo(80 / 166, 10);
    const [b0, b1] = headerInterval(compact166, 90);
    expect(b0).toBeCloseTo(16 / 166, 10);
    expect(b1).toBeCloseTo(102 / 166, 10);
  });

  test('header samples: both ends of the interval plus every sample inside it', () => {
    const stops: GradientStop[] = [{ srgb: BLACK, position: 0 }, { srgb: WHITE, position: 1 }];
    const interval = [0.2, 0.4] as const;
    const samples = headerSamples(stops, interval, 'srgb');
    expect(samples[0]?.t).toBe(0.2);
    expect(samples[0]?.srgb[0]).toBeCloseTo(0.2, 10);
    expect(samples[1]?.srgb[0]).toBeCloseTo(0.4, 10);
    expect(samples.every((s) => s.t >= 0.2 && s.t <= 0.4)).toBe(true);
    // 100 interior samples on [0, 1] lie at k/101; those in [0.2, 0.4] are k = 21…40.
    expect(samples).toHaveLength(2 + 20);
  });
});

describe('sampling (ADR-0022 §4.1: every stop plus 100 samples per segment, in gamma sRGB and OKLab)', () => {
  test('every stop plus SAMPLES_PER_SEGMENT points per segment; a hard stop adds no interior samples', () => {
    const three: GradientStop[] = [{ srgb: BLACK, position: 0 }, { srgb: [0.5, 0.5, 0.5], position: 0.5 }, { srgb: WHITE, position: 1 }];
    expect(sampleGradient(three, 'srgb')).toHaveLength(3 + 2 * SAMPLES_PER_SEGMENT);
    const hard: GradientStop[] = [{ srgb: BLACK, position: 0 }, { srgb: BLACK, position: 0.5 }, { srgb: WHITE, position: 0.5 }, { srgb: WHITE, position: 1 }];
    expect(sampleGradient(hard, 'oklab')).toHaveLength(4 + 2 * SAMPLES_PER_SEGMENT);
    expect(sampleGradient(hard, 'srgb').filter((s) => s.stop === null).every((s) => s.srgb[0] === 0 || s.srgb[0] === 1)).toBe(true);
  });

  test('positions are clamped to [0, 1] and never go below an earlier stop (CSS color stop fixup)', () => {
    expect(fixupStops([{ srgb: BLACK, position: -0.2 }, { srgb: WHITE, position: 0.6 }, { srgb: BLACK, position: 0.4 }, { srgb: WHITE, position: 1.5 }]).map((s) => s.position))
      .toEqual([0, 0.6, 0.6, 1]);
  });

  test('gamma sRGB interpolates the encoded channels; OKLab interpolates perceptual lightness', () => {
    expect(mix(BLACK, WHITE, 0.5, 'srgb')).toEqual([0.5, 0.5, 0.5]);
    // OKLab L 0.5 is linear 0.125, gamma-encoded 0.3886: a darker midpoint than sRGB's.
    const mid = mix(BLACK, WHITE, 0.5, 'oklab');
    for (const c of mid) expect(c).toBeCloseTo(0.3886, 3);
    expect(mix(BLACK, WHITE, 0, 'oklab')).toBe(BLACK);
    expect(mix(BLACK, WHITE, 1, 'oklab')).toBe(WHITE);
  });

  test('colorAt: the end colors outside the stops, interpolation between them', () => {
    const stops: GradientStop[] = [{ srgb: BLACK, position: 0.25 }, { srgb: WHITE, position: 0.75 }];
    expect(colorAt(stops, 0.1, 'srgb')).toBe(BLACK);
    expect(colorAt(stops, 0.9, 'oklab')).toBe(WHITE);
    expect(colorAt(stops, 0.5, 'srgb')[0]).toBeCloseTo(0.5, 10);
    const hard: GradientStop[] = [{ srgb: BLACK, position: 0 }, { srgb: BLACK, position: 0.5 }, { srgb: WHITE, position: 0.5 }, { srgb: WHITE, position: 1 }];
    expect(colorAt(hard, 0.5, 'srgb')).toEqual(BLACK);
    expect(colorAt(hard, 0.5000001, 'srgb')).toEqual(WHITE);
  });
});
