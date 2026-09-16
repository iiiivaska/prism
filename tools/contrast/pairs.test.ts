// tokens/contrast-pairs.json rules (ARCHITECTURE §10, ADR-0011, ADR-0022) on in-memory contexts: no Style
// Dictionary run. check.test.ts covers the same rules end to end on built fixtures and the repository.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { contrastRatio, flatten, hexToRgba, irColor, over, REPO_ROOT, type Triple } from '../tokens/api.ts';
import { SAMPLES_PER_SEGMENT, type CardGeometry } from './gradient.ts';
import { appliesTo, evaluatePair, PairError, parsePair, parsePairsFile, tokenBackdrop, type Pair } from './pairs.ts';
import { env, fakeContext, pair, type ColorSpec } from './test-support.ts';
import { ADR_0011_THRESHOLDS, parseThresholds, thresholdKey } from './thresholds.ts';

const light = (colors: Record<string, ColorSpec>, extra: Partial<Parameters<typeof fakeContext>[0]> = {}) =>
  fakeContext({ colorScheme: 'light', colors: { 'color.bg.page': '#ffffff', ...colors }, ...extra });

describe('tiers and sizes (ADR-0011)', () => {
  test('functional is 4.5:1, or 3:1 from 24 px; decorative and boundary are 3:1', () => {
    expect(thresholdKey('functional', null)).toBe('functional');
    expect(thresholdKey('functional', 23)).toBe('functional');
    expect(thresholdKey('functional', 24)).toBe('functionalLarge');
    expect(thresholdKey('decorative', 24)).toBe('decorative');
    expect(thresholdKey('boundary', null)).toBe('boundary');
  });

  test('#777777 on white (4.48:1) fails functional text and passes large, decorative and boundary', () => {
    const ctx = light({ fg: '#777777' });
    const run = (raw: Record<string, unknown>) => evaluatePair(pair({ fg: 'fg', bg: 'color.bg.page', ...raw }), ctx, env());
    expect(run({ tier: 'functional' })).toMatchObject({ pass: false, threshold: 4.5, thresholdKey: 'functional' });
    expect(run({ tier: 'functional', minSizePx: 23 })).toMatchObject({ pass: false, threshold: 4.5 });
    expect(run({ tier: 'functional', minSizePx: 24 })).toMatchObject({ pass: true, threshold: 3, thresholdKey: 'functionalLarge' });
    expect(run({ tier: 'decorative', minSizePx: 24 })).toMatchObject({ pass: true, threshold: 3, thresholdKey: 'decorative' });
    expect(run({ tier: 'boundary' })).toMatchObject({ pass: true, threshold: 3, thresholdKey: 'boundary' });
    expect(run({ tier: 'functional' }).ratio).toBeCloseTo(4.478, 3);
  });

  test('decorative needs minSizePx >= 24', () => {
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'decorative' }, 0).problems).toEqual([expect.stringMatching(/decorative tier applies only at >= 24 px/)]);
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'decorative', minSizePx: 18 }, 0).problems).toHaveLength(1);
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'decorative', minSizePx: 24 }, 0).problems).toEqual([]);
  });

  test('the file may raise a threshold but never lower one below ADR-0011', () => {
    expect(parseThresholds({ functional: 4.5, functionalLarge: 3, decorative: 3, boundary: 3 }).thresholds).toEqual(ADR_0011_THRESHOLDS);
    expect(parseThresholds({ functional: 7, functionalLarge: 4.5, decorative: 3, boundary: 3 }).problems).toEqual([]);
    expect(parseThresholds({ functional: 4.4, functionalLarge: 3, decorative: 3, boundary: 3 }).problems).toEqual([expect.stringMatching(/functional" is 4.4, below ADR-0011's 4.5/)]);
    expect(parseThresholds({ functional: 4.5, decorative: 3, boundary: 3, large: 3 }).problems).toEqual([
      expect.stringMatching(/"thresholds.large" is not a threshold/),
      expect.stringMatching(/"thresholds.functionalLarge" must be a number/),
    ]);
  });
});

describe('compositing (ARCHITECTURE §10: source-over in gamma sRGB, WCAG 2.x)', () => {
  test('white on black is 21:1', () => {
    const e = evaluatePair(pair({ fg: 'fg', bg: 'color.bg.page', tier: 'functional' }), fakeContext({ colorScheme: 'dark', colors: { 'color.bg.page': '#000000', fg: '#ffffff' } }), env());
    expect(e.ratio).toBeCloseTo(21, 10);
    expect(e.worst).toBe('#ffffff on #000000');
  });

  test('dark text.tertiary (white 55 %) over bg.surface (white 6 %) over bg.page (neutral.950)', () => {
    const ctx = fakeContext({ colorScheme: 'dark', colors: { 'color.bg.page': '#0d0e11', 'color.bg.surface': ['#ffffff', 0.06], 'color.text.tertiary': ['#ffffff', 0.55] } });
    const e = evaluatePair(pair({ fg: 'color.text.tertiary', bg: 'color.bg.surface', tier: 'functional' }), ctx, env());
    const page = hexToRgba('#0d0e11').srgb;
    const bg = page.map((c) => 0.06 + 0.94 * c) as unknown as Triple;
    const fg = bg.map((c) => 0.55 + 0.45 * c) as unknown as Triple;
    expect(e.ratio).toBeCloseTo(contrastRatio(fg, bg), 12);
    expect(e.ratio).toBeCloseTo(5.96, 2);   // the 5.96 quoted in the dark text.tertiary description
    expect(e.worst).toBe('#99999a on #1c1c1f');   // surface-1 = #1C1C1F over the page (tokens/sys/color/dark)
    expect(e.cases).toBe(1);
  });

  test('an opaque background ignores the page; a translucent page is an error', () => {
    const e = evaluatePair(pair({ fg: 'fg', bg: 'bg', tier: 'functional' }), light({ fg: '#000000', bg: '#ffffff', 'color.bg.page': '#ff0000' }), env());
    expect(e.ratio).toBeCloseTo(21, 10);
    const translucent = light({ fg: '#000000', bg: ['#ffffff', 0.5], 'color.bg.page': ['#ffffff', 0.9] });
    expect(() => evaluatePair(pair({ fg: 'fg', bg: 'bg', tier: 'functional' }), translucent, env())).toThrow(/color.bg.page is translucent/);
  });

  test('underlays are checked one at a time; the worst one is reported (critic G-13)', () => {
    const ctx = fakeContext({ colorScheme: 'dark', colors: { 'color.bg.page': '#0d0e11', 'color.bg.surface': ['#ffffff', 0.06], tint: ['#ff5a55', 0.1], text: '#ff5a55' } });
    const e = evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional', underlays: ['color.bg.page', 'color.bg.surface'] }), ctx, env());
    expect(e.cases).toBe(2);
    expect(e.worst).toMatch(/^on color.bg.surface: #ff5a55 on #/);
    const onPage = evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional' }), ctx, env());
    expect(e.ratio).toBeLessThan(onPage.ratio);
    const page = hexToRgba('#0d0e11');
    const surface = flatten([page, { srgb: [1, 1, 1], alpha: 0.06 }]);
    const tint = over({ srgb: hexToRgba('#ff5a55').srgb, alpha: 0.1 }, { srgb: surface, alpha: 1 }).srgb;
    expect(e.ratio).toBeCloseTo(contrastRatio(hexToRgba('#ff5a55').srgb, tint), 12);
  });
});

describe('backdrops (ADR-0022 §3.3)', () => {
  const gradients = {
    'gradient.vivid.*': [
      { id: 'sys.gradient.vivid.default', stops: [['#4a4c78', 0], ['#8ba9c0', 1]] as const, scheme: 'light' as const },
      { id: 'sys.gradient.vivid.1', stops: [['#4a4c78', 0], ['#556ba6', 1]] as const, scheme: 'light' as const },
      { id: 'ref.gradient.vivid.plum-dusk', stops: [['#1e1226', 0], ['#6f7fc8', 1]] as const, scheme: 'dark' as const },
    ],
  };
  const glass = { 'color.text.on-glass': '#ffffff', 'material.glass.dark.fill': ['#101410', 0.6] } as const;
  const p = pair({ fg: 'color.text.on-glass', bg: 'material.glass.dark.fill', tier: 'functional', backdrops: ['#283126', '#959595', 'gradient.vivid.*'] });

  test('each hex, and every stop and V1 sample of the scheme\'s matched gradients, is a bottom layer; repeated colors count once', () => {
    const e = evaluatePair(p, light({ ...glass }, { gradients }), env());
    // Two hex backdrops; stops #4a4c78 (twice), #8ba9c0, #556ba6; 100 samples per segment in each space.
    expect(e.cases).toBe(2 + 3 + 2 * 2 * SAMPLES_PER_SEGMENT);
    const onDark = evaluatePair(p, fakeContext({ colorScheme: 'dark-increased-contrast', colors: { ...glass }, gradients }), env());
    expect(onDark.cases).toBe(2 + 2 + 2 * SAMPLES_PER_SEGMENT);   // the dark gradient only
  });

  test('a gradient backdrop counts between its stops: a hue-shifting segment is darker mid-way than at either stop', () => {
    // Ink on a white 10 % glass: 4.67:1 over #f50000 and 4.81:1 over #008700, about 3.1:1 half way in gamma
    // sRGB, because luminance is convex along a gamma-encoded segment.
    const colors = { ink: '#0d0e11', fill: ['#ffffff', 0.1] } as const;
    const hue = { 'gradient.vivid.*': [{ id: 'g', stops: [['#f50000', 0], ['#008700', 1]] as const, scheme: 'light' as const }] };
    const atStops = evaluatePair(pair({ fg: 'ink', bg: 'fill', tier: 'functional', backdrops: ['#f50000', '#008700'] }), light(colors), env());
    expect(atStops.pass).toBe(true);
    expect(atStops.ratio).toBeCloseTo(4.67, 2);
    const e = evaluatePair(pair({ fg: 'ink', bg: 'fill', tier: 'functional', backdrops: ['gradient.vivid.*'] }), light(colors, { gradients: hue }), env());
    expect(e.pass).toBe(false);
    expect(e.ratio).toBeLessThan(3.2);
    expect(e.worst).toMatch(/^over g t=0\.\d{3} srgb: #0d0e11 on #/);
  });

  test('the worst backdrop is named: a hex color, or a gradient stop with its gradient', () => {
    // #8ba9c0 (2.46:1 against white) is lighter than #959595 (3.0:1), so white text is worst over it.
    expect(evaluatePair(p, light({ ...glass }, { gradients }), env()).worst).toMatch(/^over sys.gradient.vivid.default stop 1: #ffffff on #/);
    const hexOnly = pair({ fg: 'color.text.on-glass', bg: 'material.glass.dark.fill', tier: 'functional', backdrops: ['#283126', '#959595'] });
    expect(evaluatePair(hexOnly, light({ ...glass }), env()).worst).toMatch(/^over #959595: #ffffff on #/);
  });

  test('a glob that matches only gradients of the other scheme is an error', () => {
    const only = { 'gradient.vivid.*': gradients['gradient.vivid.*'].slice(2) };
    expect(() => evaluatePair(p, light({ ...glass }, { gradients: only }), env())).toThrow(/matches no gradient of the light scheme/);
  });

  test('backdrops and underlays combine: every backdrop with every underlay', () => {
    const q = pair({ fg: 'fg', bg: 'bg', tier: 'functional', backdrops: ['#283126', '#959595'], underlays: ['u1', 'u2'] });
    const e = evaluatePair(q, light({ fg: '#ffffff', bg: ['#101410', 0.6], u1: ['#000000', 0.2], u2: ['#ffffff', 0.2] }), env());
    expect(e.cases).toBe(4);
    expect(e.worst).toMatch(/^over #959595 on u2: /);
  });
});

describe('token backdrops (ADR-0030 §1.5)', () => {
  // The dark map of the repository: land is the page, the other grounds are white or hue at alpha over it.
  const map = {
    'color.bg.page': '#0d0e11', 'color.map.land': '#0d0e11', 'color.map.road': ['#ffffff', 0.13], 'color.map.water': ['#6b84e0', 0.16],
    text: '#ff5a55', tint: ['#ff4642', 0.1], label: ['#ffffff', 0.55],
  } as const;
  const dark = (colors: Record<string, ColorSpec>) => fakeContext({ colorScheme: 'dark', colors });

  test('"<colors> over <ground>": each named color composited over the opaque ground is a bottom layer', () => {
    expect(tokenBackdrop('color.map.road|water over color.map.land')).toEqual({ colors: 'color.map.road|water', ground: 'color.map.land' });
    expect(tokenBackdrop('#283126')).toBeNull();
    expect(tokenBackdrop('ref.gradient.vivid.*')).toBeNull();
    const e = evaluatePair(pair({ fg: 'label', bg: 'tint', tier: 'functional', backdrops: ['color.map.road|water over color.map.land'] }), dark({ ...map }), env());
    expect(e.cases).toBe(2);
    const land = hexToRgba('#0d0e11');
    const road = flatten([land, { srgb: [1, 1, 1], alpha: 0.13 }]);
    expect(e.worst).toMatch(/^over color\.map\.road on color\.map\.land: #/);
    const bg = flatten([{ srgb: road, alpha: 1 }, { srgb: hexToRgba('#ff4642').srgb, alpha: 0.1 }]);
    expect(e.ratio).toBeCloseTo(contrastRatio(over({ srgb: [1, 1, 1], alpha: 0.55 }, { srgb: bg, alpha: 1 }).srgb, bg), 12);
  });

  test('without a ground the named colors must be opaque; a translucent ground is an error', () => {
    const ctx = dark({ ...map });
    const opaque = evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional', backdrops: ['color.map.land'] }), ctx, env());
    expect(opaque.worst).toMatch(/^over color\.map\.land: /);
    expect(() => evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional', backdrops: ['color.map.road'] }), ctx, env()))
      .toThrow(/color\.map\.road is translucent \(alpha 0\.13\); name the ground it sits on with "color\.map\.road over <color>"/);
    expect(() => evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional', backdrops: ['color.map.water over color.map.road'] }), ctx, env()))
      .toThrow(/color\.map\.road is translucent \(alpha 0\.13\); a token backdrop's ground is opaque/);
    expect(() => evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional', backdrops: ['color.map.nope over color.map.land'] }), ctx, env())).toThrow(PairError);
  });

  test('a tint over the map road reads 4.04:1 without the page under it and 5.76:1 with it (ADR-0030 M3, §6.2)', () => {
    const ctx = dark({ ...map });
    const bare = evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional', backdrops: ['color.map.road over color.map.land'] }), ctx, env());
    expect(bare.pass).toBe(false);
    expect(bare.ratio).toBeCloseTo(4.04, 2);
    const paged = evaluatePair(pair({ fg: 'text', bg: 'tint', tier: 'functional', backdrops: ['color.map.road over color.map.land'], underlays: ['color.bg.page'] }), ctx, env());
    expect(paged.ratio).toBeCloseTo(5.76, 2);
  });

  test('a token backdrop reads "<color name or glob> over <color name>"', () => {
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'functional', backdrops: ['color.map.road over color.map.land'] }, 0).problems).toEqual([]);
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'functional', backdrops: ['color.map.road over '] }, 0).problems).toEqual([expect.stringMatching(/must read "<color name or glob> over <color name>"/)]);
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'functional', backdrops: ['color.map.road over land and sea'] }, 0).problems).toHaveLength(1);
  });
});

describe('light status tints (ADR-0030 §6.1)', () => {
  // The light tints were opaque ref.color.status.*.tint-light steps; they are now each status's dot-light
  // step at alpha 0.12, and over white they reproduce the old values within 0.5/255 per channel (M7).
  const TODAY: Readonly<Record<string, string>> = { success: '#e6f6e9', warning: '#fef6e8', critical: '#fde9e9', info: '#eaedf9' };
  const read = (path: string): Record<string, unknown> => JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8')) as Record<string, unknown>;
  const at = (node: unknown, path: readonly string[]): Record<string, unknown> => {
    let cur = node;
    for (const k of path) cur = (cur as Record<string, unknown>)[k];
    return cur as Record<string, unknown>;
  };
  const palette = read('tokens/ref/color.palette.tokens.json');
  const lightScheme = read('tokens/sys/color/light.tokens.json');
  const literal = (id: string): Triple => {
    const v = at(palette, id.split('.'))['$value'] as { colorSpace: 'oklch'; components: [number, number, number] };
    return irColor(v.colorSpace, v.components, 1).srgb;
  };

  test.each(Object.entries(TODAY))('%s: the dot-light step at 0.12 over neutral.0 is today\'s tint', (status, hex) => {
    const token = at(lightScheme, ['sys', 'color', 'bg', 'tint', status]);
    const target = /^\{(.+)\}$/.exec(token['$value'] as string)?.[1] ?? '';
    const alpha = (at(token, ['$extensions', 'app.prism']) as { alpha?: number }).alpha;
    expect(target).toMatch(/^ref\.color\.status\.(success|warning|danger|info)\.dot-light$/);
    expect(alpha).toBe(0.12);
    const composite = flatten([{ srgb: literal('ref.color.neutral.0'), alpha: 1 }, { srgb: literal(target), alpha: alpha ?? 1 }]);
    const want = hexToRgba(hex).srgb;
    for (let i = 0; i < 3; i++) expect(Math.abs((composite[i] ?? 0) - (want[i] ?? 0)) * 255).toBeLessThanOrEqual(0.5);
  });
});

describe('schemes', () => {
  test('a base scheme includes its contrast and transparency variants', () => {
    const dark = pair({ fg: 'a', bg: 'b', tier: 'functional', schemes: ['dark'] });
    expect(appliesTo(dark, fakeContext({ colorScheme: 'dark-increased-contrast', colors: {} }))).toBe(true);
    expect(appliesTo(dark, fakeContext({ colorScheme: 'dark-reduced-transparency', colors: {} }))).toBe(true);
    expect(appliesTo(dark, fakeContext({ colorScheme: 'light', colors: {} }))).toBe(false);
    expect(appliesTo(pair({ fg: 'a', bg: 'b', tier: 'functional' }), fakeContext({ colorScheme: 'light-increased-contrast', colors: {} }))).toBe(true);
  });

  test('only base schemes are valid', () => {
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'functional', schemes: ['light-increased-contrast'] }, 0).problems).toEqual([expect.stringMatching(/distinct base schemes/)]);
    expect(parsePair({ fg: 'a', bg: 'b', tier: 'functional', schemes: ['dark', 'dark'] }, 0).problems).toHaveLength(1);
  });
});

describe('stops: "all" (ADR-0022 V1)', () => {
  const vivid = (stops: readonly (readonly [string, number])[]) => ({ 'gradient.vivid.*': [{ id: 'sys.gradient.vivid.1', stops, scheme: 'light' as const, chain: ['sys.gradient.vivid.1', 'ref.gradient.vivid.sky'] }] });
  const v1 = pair({ fg: 'color.text.on-vivid', bg: 'gradient.vivid.*', tier: 'functional', minSizePx: 24, stops: 'all' });

  test('every stop plus 100 samples per segment, in both interpolation spaces', () => {
    const e = evaluatePair(v1, light({ 'color.text.on-vivid': '#ffffff' }, { gradients: vivid([['#1f2a4d', 0], ['#2f3f6e', 0.6], ['#6f7fa8', 1]]) }), env());
    expect(e.cases).toBe(2 * (3 + 2 * SAMPLES_PER_SEGMENT));
    expect(e.threshold).toBe(3);
    expect(e.pass).toBe(true);
    expect(e.gradients).toEqual([['sys.gradient.vivid.1', 'ref.gradient.vivid.sky']]);
  });

  test('a light end below 3:1 against white fails and is named', () => {
    const e = evaluatePair(v1, light({ 'color.text.on-vivid': '#ffffff' }, { gradients: vivid([['#1f2a4d', 0], ['#b4c6e4', 1]]) }), env());
    expect(e.pass).toBe(false);
    expect(e.ratio).toBeCloseTo(1.73, 2);
    expect(e.worst).toMatch(/^sys.gradient.vivid.1 stop 1 (srgb|oklab): #ffffff on #b4c6e4$/);
  });

  test('a gradient background needs stops or region; a color background takes neither', () => {
    const plain = pair({ fg: 'color.text.on-vivid', bg: 'gradient.vivid.*', tier: 'functional' });
    expect(() => evaluatePair(plain, light({ 'color.text.on-vivid': '#ffffff' }, { gradients: vivid([['#000000', 0]]) }), env())).toThrow(PairError);
    expect(() => evaluatePair(v1, light({ 'color.text.on-vivid': '#ffffff', 'gradient.vivid.*': '#000000' }), env())).toThrow(/matches no gradient token/);
  });
});

describe('region: "card-header" (ADR-0022 V2)', () => {
  const geometries: CardGeometry[] = [
    { width: 166, height: 166, padding: 16, action: 32, density: 'compact' },
    { width: 320, height: 200, padding: 24, action: 48, density: 'comfortable' },
  ];
  const v2 = pair({ fg: 'color.text.on-vivid', bg: 'gradient.vivid.*', tier: 'functional', region: 'card-header' });
  const ctx = (stops: readonly (readonly [string, number])[], angle: number | null = 180) => light({ 'color.text.on-vivid': '#ffffff' }, { gradients: { 'gradient.vivid.*': [{ id: 'g', stops, angle, scheme: 'light' }] } });

  test('the header block of every geometry, at the gradient angle; a light top fails', () => {
    const e = evaluatePair(v2, ctx([['#8a7aa0', 0], ['#4a3a60', 1]]), env(geometries));
    expect(e.pass).toBe(false);
    expect(e.threshold).toBe(4.5);
    expect(e.worst).toMatch(/^g 166×166 p16 a32 t=0\.096 (srgb|oklab): #ffffff on #/);
    // The header sits at the top at 180deg, so the light bottom end does not count.
    expect(evaluatePair(v2, ctx([['#1f2a4d', 0], ['#2f3f6e', 0.6], ['#b4c6e4', 1]]), env(geometries)).pass).toBe(true);
  });

  test('the angle turns the gradient under the header; no angle means CSS 180deg', () => {
    const lightTop = [['#b4c6e4', 0], ['#1f2a4d', 1]] as const;
    expect(evaluatePair(v2, ctx(lightTop, 180), env(geometries)).pass).toBe(false);
    expect(evaluatePair(v2, ctx(lightTop, 0), env(geometries)).pass).toBe(true);   // 0deg puts the first stop at the bottom
    expect(evaluatePair(v2, ctx(lightTop, null), env(geometries)).ratio).toBe(evaluatePair(v2, ctx(lightTop, 180), env(geometries)).ratio);
  });
});

describe('names', () => {
  test('an unknown name, or a glob where one color is needed, is an error', () => {
    const ctx = light({ 'color.text.primary': '#000000' });
    expect(() => evaluatePair(pair({ fg: 'color.text.primry', bg: 'color.bg.page', tier: 'functional' }), ctx, env())).toThrow(/unknown token name "color.text.primry"/);
    expect(() => evaluatePair(pair({ fg: 'color.text.primary', bg: 'color.bg.nope', tier: 'functional' }), ctx, env())).toThrow(PairError);
  });
});

describe('parsePairsFile', () => {
  const file = (pairs: unknown, extra: Record<string, unknown> = {}): string =>
    `${JSON.stringify({ $comment: 'test', thresholds: ADR_0011_THRESHOLDS, pairs, ...extra }, null, 2)}\n`;
  const ok = { fg: 'color.text.primary', bg: 'color.bg.page', tier: 'functional' };

  test('a valid file gives every pair with its line', () => {
    const r = parsePairsFile(file([ok, { ...ok, bg: 'color.bg.surface', note: 'x' }]), 'p.json');
    expect(r.problems).toEqual([]);
    expect(r.file?.pairs.map((p: Pair) => [p.index, p.line, p.bg])).toEqual([[0, 10, 'color.bg.page'], [1, 15, 'color.bg.surface']]);
  });

  test('every structural problem is reported with file, line and index', () => {
    const r = parsePairsFile(file([
      ok,
      { fg: 'color.text.on-vivid', bg: 'gradient.vivid.*', tier: 'functional', stops: 'text-zone' },
      { fg: 'a', bg: 'b', tier: 'loud' },
      { fg: 'a', bg: 'b', tier: 'boundary', backdrops: ['#12345', '#00000080', 'gradient.vivid.*'], extra: 1 },
      { fg: 'a', bg: 'gradient.vivid.*', tier: 'functional', stops: 'all', region: 'card-header' },
      { fg: 'a', bg: 'gradient.vivid.*', tier: 'functional', region: 'hero' },
      { fg: 'a', bg: 'gradient.vivid.*', tier: 'functional', stops: 'all', backdrops: ['#000000'] },
      { fg: 'a', bg: 'b', tier: 'functional', minSizePx: -1, underlays: [] },
      ok,
    ]), 'p.json');
    expect(r.file).toBeNull();
    const messages = r.problems.map((p) => `${p.where}: ${p.message}`);
    expect(messages).toEqual([
      expect.stringMatching(/^p\.json:\d+ pairs\[1\]: "stops": "text-zone" is gone: .*ADR-0022 §4\.1/),
      expect.stringMatching(/^p\.json:\d+ pairs\[2\]: "tier" must be functional, decorative or boundary/),
      expect.stringMatching(/pairs\[3\]: unknown key "extra"/),
      expect.stringMatching(/pairs\[3\]: backdrop "#12345" is not a hex color/),
      expect.stringMatching(/pairs\[3\]: backdrop "#00000080" is translucent/),
      expect.stringMatching(/pairs\[4\]: "stops" and "region" are separate checks/),
      expect.stringMatching(/pairs\[5\]: "region" must be "card-header"/),
      expect.stringMatching(/pairs\[6\]: a gradient background \("stops" or "region"\) takes no "backdrops" or "underlays"/),
      expect.stringMatching(/pairs\[7\]: "minSizePx" must be a positive number/),
      expect.stringMatching(/pairs\[7\]: "underlays" must be a non-empty list/),
      expect.stringMatching(/pairs\[8\]: repeats pairs\[0\] \(color.text.primary on color.bg.page\)/),
    ]);
  });

  test('JSON errors, duplicate and unknown keys, empty pairs', () => {
    expect(parsePairsFile('{\n  "pairs": [\n', 'p.json').problems[0]?.where).toMatch(/^p\.json:\d+$/);
    const dup = '{\n  "thresholds": {"functional": 4.5, "functionalLarge": 3, "decorative": 3, "boundary": 3},\n  "pairs": [{"fg": "a", "fg": "b", "bg": "c", "tier": "boundary"}],\n  "extra": 1\n}\n';
    expect(parsePairsFile(dup, 'p.json').problems.map((p) => p.message)).toEqual(['unknown key "extra"; known: $comment, thresholds, pairs', 'duplicate key "fg"']);
    expect(parsePairsFile(file([]), 'p.json').problems.map((p) => p.message)).toEqual(['"pairs" must be a non-empty list']);
  });
});
