// The six checks on palettes built from hex (README.md, "The six checks"): each verdict, each boundary the
// method draws, and what a relief does and does not excuse. The end-to-end runs over token trees are
// validate.test.ts's.
import { describe, expect, test } from 'vitest';
import { hexToRgba } from '../tokens/api.ts';
import {
  anchorFindings, CHECKS, findingKey, measureAnchors, measurePalette, paletteFindings, type PaletteMeasure,
} from './checks.ts';
import { oklch } from './color.ts';
import { ACHROMATIC_BELOW, BAND } from './config.ts';
import { hexPalette } from './test-support.ts';

const S4_LIGHT = ['#eb6834', '#1baf7a', '#2a78d6', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const S4_DARK = ['#d95926', '#199e70', '#3987e5', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const keys = (m: PaletteMeasure): string[] => paletteFindings(m).map(findingKey);

describe('the method on the §4 palette (dataviz-design F62)', () => {
  test('light on #fafaf9: every slot in the band and above the floor; aqua, yellow and magenta below 3:1 (2.70, 2.07, 2.58)', () => {
    const m = measurePalette(hexPalette({ scheme: 'light', slots: S4_LIGHT, surface: '#fafaf9' }));
    expect(m.slots.map((s) => [s.band, s.chroma])).toEqual(S4_LIGHT.map(() => ['pass', 'pass']));
    expect(m.slots.filter((s) => s.contrast === 'fail').map((s) => [s.hex, s.ground.ratio.toFixed(2)])).toEqual([
      ['#1baf7a', '2.70'], ['#eda100', '2.07'], ['#e87ba4', '2.58'],
    ]);
    expect(m.adjacent.every((p) => p.cvdVerdict === 'pass' && p.normalVerdict === 'pass')).toBe(true);
    expect(keys(m)).toEqual(['contrast light slot 2 #1baf7a', 'contrast light slot 4 #eda100', 'contrast light slot 5 #e87ba4']);
  });

  test('light: the three sub-3:1 slots pass once they declare a relief, the table twin or direct labels', () => {
    const m = measurePalette(hexPalette({ scheme: 'light', slots: S4_LIGHT, surface: '#fafaf9', reliefs: { 2: ['table-twin'], 4: ['direct-labels'], 5: ['table-twin', 'direct-labels'] } }));
    expect(m.slots.map((s) => s.contrast)).toEqual(['pass', 'relieved', 'pass', 'relieved', 'relieved', 'pass', 'pass', 'pass']);
    expect(keys(m)).toEqual([]);
  });

  test('dark on #101215: all eight clear every check', () => {
    expect(keys(measurePalette(hexPalette({ scheme: 'dark', slots: S4_DARK, surface: '#101215' })))).toEqual([]);
  });
});

describe('check 2: the lightness band is the base scheme\'s', () => {
  test('#6da7ec (L 0.717) is inside the light band and above the dark one', () => {
    const light = measurePalette(hexPalette({ scheme: 'light', slots: ['#6da7ec'], surface: '#000000' }));
    const dark = measurePalette(hexPalette({ scheme: 'dark', slots: ['#6da7ec'], surface: '#000000' }));
    expect(light.slots[0]?.band).toBe('pass');
    expect(dark.slots[0]?.band).toBe('fail');
    expect(paletteFindings(dark).find((f) => f.check === 'band')).toMatchObject({ measured: 'L 0.717', limit: 'L 0.48–0.67', subject: 'slot 1', colors: ['#6da7ec'] });
  });

  test('each bound holds on both sides, measured on the 8-bit grays that straddle it', () => {
    const grays = Array.from({ length: 256 }, (_, v) => `#${v.toString(16).padStart(2, '0').repeat(3)}`);
    const l = (hex: string): number => oklch(hexToRgba(hex).srgb, ACHROMATIC_BELOW).l;
    for (const scheme of ['light', 'dark'] as const) {
      const [lo, hi] = BAND[scheme];
      const first = grays.findIndex((g) => l(g) >= lo);
      const last = grays.findLastIndex((g) => l(g) <= hi);
      const verdict = (hex: string): string | undefined => measurePalette(hexPalette({ scheme, slots: [hex], surface: '#808080' })).slots[0]?.band;
      expect([verdict(grays[first - 1] ?? ''), verdict(grays[first] ?? ''), verdict(grays[last] ?? ''), verdict(grays[last + 1] ?? '')]).toEqual(['fail', 'pass', 'pass', 'fail']);
    }
  });
});

describe('check 3: the chroma floor', () => {
  test('a gray-blue at C 0.095 fails; the blue it dulls passes', () => {
    const m = measurePalette(hexPalette({ scheme: 'light', slots: ['#4a6fa5', '#2a78d6'], surface: '#ffffff' }));
    expect(m.slots.map((s) => s.chroma)).toEqual(['fail', 'pass']);
    expect(paletteFindings(m).filter((f) => f.check === 'chroma').map((f) => f.measured)).toEqual(['C 0.095']);
  });
});

describe('check 4: CVD separation, and what direct labels excuse', () => {
  // Orange beside blue (24.7), green beside red (7.2, the floor band) and orange beside green (3.2).
  const palette = (slots: readonly string[], reliefs: Record<number, readonly ('direct-labels' | 'table-twin')[]> = {}) =>
    measurePalette(hexPalette({ scheme: 'light', slots, surface: '#000000', reliefs }));

  test('at least 8 passes; 6 to 8 fails without a secondary encoding; below 6 fails', () => {
    expect(palette(['#eb6834', '#2a78d6']).adjacent[0]?.cvdVerdict).toBe('pass');
    const floor = palette(['#008300', '#e34948']).adjacent[0];
    expect([floor?.cvd.toFixed(1), floor?.cvdKind, floor?.cvdVerdict]).toEqual(['7.2', 'protan', 'fail']);
    expect(palette(['#eb6834', '#008300']).adjacent[0]?.cvdVerdict).toBe('fail');
  });

  test('the floor band passes only when both slots of the pair ship direct labels; a table twin is no secondary encoding', () => {
    expect(palette(['#008300', '#e34948'], { 1: ['direct-labels'], 2: ['direct-labels'] }).adjacent[0]?.cvdVerdict).toBe('relieved');
    expect(palette(['#008300', '#e34948'], { 1: ['direct-labels'] }).adjacent[0]?.cvdVerdict).toBe('fail');
    expect(palette(['#008300', '#e34948'], { 1: ['table-twin'], 2: ['table-twin'] }).adjacent[0]?.cvdVerdict).toBe('fail');
    expect(palette(['#eb6834', '#008300'], { 1: ['direct-labels'], 2: ['direct-labels'] }).adjacent[0]?.cvdVerdict).toBe('fail');
  });

  test('only adjacent slots are paired: orange and green two slots apart pass', () => {
    const m = palette(['#eb6834', '#2a78d6', '#008300']);
    expect(m.adjacent.map((p) => p.subject)).toEqual(['slots 1–2', 'slots 2–3']);
    expect(keys(m)).toEqual([]);
  });

  test('tritanopia is measured and reported, never gated', () => {
    // Blue beside green: 26.5 under protanopia, 7.5 under tritanopia.
    const pair = palette(['#2a78d6', '#008300']).adjacent[0];
    expect(pair?.tritan).toBeLessThan(8);
    expect(pair?.cvdVerdict).toBe('pass');
  });
});

describe('check 5: the normal-vision floor', () => {
  test('two greens 9.7 apart fail under normal vision, with or without labels, while CVD passes', () => {
    const pair = measurePalette(hexPalette({ scheme: 'light', slots: ['#008300', '#0ca30c'], surface: '#000000', reliefs: { 1: ['direct-labels'], 2: ['direct-labels'] } })).adjacent[0];
    expect([pair?.normal.toFixed(1), pair?.normalVerdict, pair?.cvdVerdict]).toEqual(['9.7', 'fail', 'pass']);
  });
});

describe('checks 4 and 5 hold the now marker against every slot (ADR-0020 §4)', () => {
  test('a now marker equal to a slot fails both, against that slot only', () => {
    const m = measurePalette(hexPalette({ scheme: 'dark', slots: ['#d95926', '#3987e5', '#008300'], surface: '#000000', now: '#3987e5' }));
    expect(m.now.map((p) => p.subject)).toEqual(['now–slot 1', 'now–slot 2', 'now–slot 3']);
    expect(keys(m)).toEqual(['cvd dark now–slot 2 #3987e5 #3987e5', 'normal dark now–slot 2 #3987e5 #3987e5']);
  });

  test('a now pair in the floor band passes on the slot\'s direct labels alone: the marker carries its own label', () => {
    const now = (labels: boolean) => measurePalette(hexPalette({ scheme: 'light', slots: ['#008300'], surface: '#000000', now: '#e34948', reliefs: labels ? { 1: ['direct-labels'] } : {} })).now[0]?.cvdVerdict;
    expect([now(false), now(true)]).toEqual(['fail', 'relieved']);
  });
});

describe('check 6: 3:1 against the plot, or a declared relief', () => {
  test('aqua at 2.81:1 on white fails, and passes on either relief; blue at 4.41:1 passes', () => {
    const verdict = (reliefs: Record<number, readonly ('direct-labels' | 'table-twin')[]>) =>
      measurePalette(hexPalette({ scheme: 'light', slots: ['#1baf7a', '#2a78d6'], surface: '#ffffff', reliefs })).slots.map((s) => s.contrast);
    expect(verdict({})).toEqual(['fail', 'pass']);
    expect(verdict({ 1: ['table-twin'] })).toEqual(['relieved', 'pass']);
    expect(verdict({ 1: ['direct-labels'] })).toEqual(['relieved', 'pass']);
    expect(verdict({ 2: ['table-twin'] })).toEqual(['fail', 'pass']);
  });
});

describe('check 1: one hue per slot across a brand\'s contexts', () => {
  const anchors = (light: readonly string[], dark: readonly string[]) =>
    measureAnchors('b', [hexPalette({ scheme: 'light', slots: light, surface: '#ffffff', brand: 'b' }), hexPalette({ scheme: 'dark', slots: dark, surface: '#000000', brand: 'b' })]);

  test('green in light and yellow in dark span 69°, more than one hue; aqua and green (19.6°) are one', () => {
    const [yellow, aqua] = anchors(['#008300', '#1baf7a'], ['#c98500', '#008300']);
    expect([yellow?.verdict, yellow?.spread?.toFixed(1)]).toEqual(['fail', '69.3']);
    expect([aqua?.verdict, aqua?.spread?.toFixed(1)]).toEqual(['pass', '19.6']);
    expect(anchorFindings(anchors(['#008300'], ['#c98500'])).map(findingKey)).toEqual(['hue-anchor all slot 1 #008300 #c98500']);
  });

  test('the spread is measured across 0°: red at 25° and magenta at 1° are one hue', () => {
    expect(anchors(['#e34948'], ['#d55181'])[0]?.verdict).toBe('pass');
  });

  test('a slot that is achromatic in some context has no anchor', () => {
    const [ink] = anchors(['#0d0e11'], ['#ffffff']);
    expect([ink?.verdict, ink?.spread]).toEqual(['fail', null]);
    expect(anchorFindings(anchors(['#0d0e11'], ['#ffffff']))[0]?.measured).toBe('no hue in any context (C < 0.02)');
    expect(anchorFindings(anchors(['#2a78d6'], ['#ffffff']))[0]?.measured).toBe('no hue in dark (C < 0.02)');
  });
});

describe('findings', () => {
  test('six checks, numbered as README.md numbers them', () => {
    expect(CHECKS).toEqual(['hue-anchor', 'band', 'chroma', 'cvd', 'normal', 'contrast']);
  });

  test('a key names the check, the base scheme, the subject and the colors, and nothing about brand or context', () => {
    const light = measurePalette(hexPalette({ scheme: 'light', slots: ['#6da7ec'], surface: '#000000', brand: 'x', colorScheme: 'light-increased-contrast' }));
    const dark = measurePalette(hexPalette({ scheme: 'dark', slots: ['#6da7ec'], surface: '#000000', brand: 'y', colorScheme: 'dark-reduced-transparency' }));
    expect(keys(light)).toEqual([]);
    const [band] = paletteFindings(dark);
    expect(band).toMatchObject({ brand: 'y', contexts: ['dark-reduced-transparency'], scheme: 'dark' });
    expect(findingKey(band ?? { check: 'band', scheme: null, subject: '', colors: [] })).toBe('band dark slot 1 #6da7ec');
  });
});
