import { describe, expect, test } from 'vitest';
import type { Diagnostic } from './diagnostics.ts';
import { isNormalized, normalize } from './normalize.ts';
import { TOKEN_TYPES, type TokenType } from './types.ts';

const color = (l: number, c: number, h: number, alpha = 1) => ({ colorSpace: 'oklch', components: [l, c, h], alpha, hex: '#000000' });
const px = (value: number) => ({ value, unit: 'px' });
const ms = (value: number) => ({ value, unit: 'ms' });

/** Raw DTCG samples per type, with the token's own app.prism keys. */
const SAMPLES: Record<TokenType, { value: unknown; ext?: Record<string, unknown> }[]> = {
  color: [
    { value: color(0.7517, 0.1475, 57.6) },
    { value: { colorSpace: 'srgb', components: [1, 1, 1], alpha: 0.64 } },
    { value: { colorSpace: 'display-p3', components: [0.9, 0.6, 0.3] } },
    { value: { colorSpace: 'oklch', components: [0.5, 'none', 'none'] } },
    { value: color(0.8506, 0.1133, 68.2), ext: { alpha: 0.12 } },
  ],
  dimension: [{ value: px(24) }, { value: { value: 0.9375, unit: 'rem' } }, { value: px(-1.28) }],
  duration: [{ value: ms(150) }, { value: { value: 0.25, unit: 's' } }],
  number: [{ value: 0.4 }, { value: 1, ext: { flag: true } }],
  fontFamily: [{ value: 'Onest' }, { value: ['Onest', 'system-ui', 'sans-serif'], ext: { opsz: 32 } }],
  fontWeight: [{ value: 400 }, { value: 'semi-bold' }, { value: 'extra-black' }],
  cubicBezier: [{ value: [0.23, 1, 0.32, 1] }],
  strokeStyle: [{ value: 'dashed' }, { value: { dashArray: [px(8), px(6)], lineCap: 'round' } }],
  border: [{ value: { color: color(0.2, 0, 0, 0.3), width: px(1), style: 'solid' } }],
  transition: [
    { value: { duration: ms(487), delay: ms(0), timingFunction: [0.23, 1, 0.32, 1] }, ext: { spring: { duration: 0.35, bounce: 0.15, settle: 0.487 } } },
    { value: { duration: ms(200), delay: ms(50), timingFunction: [0, 0, 1, 1] } },
  ],
  shadow: [
    { value: { color: color(0, 0, 0, 0.07), offsetX: px(0), offsetY: px(6), blur: px(16), spread: px(0) } },
    { value: [{ color: color(0, 0, 0, 0.1), offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0), inset: true }, { color: color(0, 0, 0, 0.2), offsetX: px(0), offsetY: px(8), blur: px(24), spread: px(-4) }] },
  ],
  gradient: [
    { value: [{ color: color(0.6, 0.12, 240), position: 0 }, { color: color(0.42, 0.1, 250), position: 1 }], ext: { angle: 165, grain: 0.06, scheme: 'light', bloom: { alpha: 0.3, blur: 150 } } },
    { value: [{ color: color(0.45, 0.09, 330), position: 0 }, { color: color(0.3, 0.06, 300), position: 0.6 }, { color: color(0.2, 0.04, 300), position: 1 }] },
  ],
  typography: [
    {
      value: { fontFamily: ['Onest', 'system-ui'], fontSize: px(48), fontWeight: 300, lineHeight: 1, letterSpacing: px(-0.96) },
      ext: { slot: 'display', numeric: 'proportional', textStyle: 'largeTitle', darkWeight: 200 },
    },
    { value: { fontFamily: 'Onest', fontSize: { value: 1, unit: 'rem' }, fontWeight: 'medium', lineHeight: 1.4, letterSpacing: px(0) } },
  ],
};

function run(type: TokenType, value: unknown, ext?: Record<string, unknown>): { out: unknown; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  return { out: normalize(type, value, ext, diagnostics, { tokenId: 't' }), diagnostics };
}

describe('normalize', () => {
  test('covers every token type', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([...TOKEN_TYPES].sort());
  });

  for (const type of TOKEN_TYPES) {
    test(`${type}: normalize(normalize(x)) ≡ normalize(x), with and without the folded keys`, () => {
      for (const { value, ext } of SAMPLES[type]) {
        const once = run(type, value, ext);
        expect(once.diagnostics).toEqual([]);
        expect(isNormalized(once.out)).toBe(true);
        expect(run(type, once.out, ext).out).toEqual(once.out);
        // an alias receives the already-normalized value of its target and no folded key of its own
        expect(run(type, once.out, undefined).out).toEqual(once.out);
        expect(JSON.parse(JSON.stringify(once.out))).toEqual(once.out);
      }
    });
  }

  test('a composite with an already-normalized sub-value (a resolved alias) normalizes like the raw one', () => {
    const family = run('fontFamily', ['Onest', 'system-ui'], { opsz: 32 }).out;
    const raw = SAMPLES.typography[1]?.value as Record<string, unknown>;
    const mixed = run('typography', { ...raw, fontFamily: family }).out as { fontFamily: unknown };
    expect(mixed.fontFamily).toEqual(family);
  });

  test('units, keywords and folded keys', () => {
    expect(run('dimension', { value: 0.9375, unit: 'rem' }).out).toEqual({ kind: 'dimension', value: 0.9375, unit: 'rem', px: 15 });
    expect(run('duration', { value: 0.25, unit: 's' }).out).toEqual({ kind: 'duration', ms: 250 });
    expect(run('fontWeight', 'extra-black').out).toEqual({ kind: 'fontWeight', weight: 950 });
    expect(run('number', 1, { flag: true }).out).toEqual({ kind: 'number', value: 1, flag: true });
    expect((run('color', color(0.7517, 0.1475, 57.6), { alpha: 0.12 }).out as { alpha: number }).alpha).toBe(0.12);
    expect(run('transition', SAMPLES.transition[0]?.value, { spring: { duration: 0.35, bounce: 0.15, settle: 0.487 } }).out)
      .toMatchObject({ spring: { duration: 0.35, bounce: 0.15, blendDuration: 0 } });
    expect(run('typography', SAMPLES.typography[0]?.value, SAMPLES.typography[0]?.ext).out)
      .toMatchObject({ fontWeight: { weight: 300 }, boldWeight: 400, darkWeight: 200, slot: 'display', textStyle: 'largeTitle' });
    expect(run('shadow', SAMPLES.shadow[0]?.value).out).toMatchObject({ layers: [{ kind: 'shadowLayer', inset: false }] });
  });

  test('achromatic and "none" hues print as 0; the hex is the gamut-mapped sRGB color', () => {
    const grey = run('color', { colorSpace: 'oklch', components: [0.5, 'none', 'none'] }).out as { oklch: number[]; hex: string };
    expect(grey.oklch[2]).toBe(0);
    const white = run('color', { colorSpace: 'oklch', components: [1, 0, 0] }).out as { hex: string; oklch: number[] };
    expect(white.hex).toBe('#ffffff');
  });

  test('invalid input pushes value/invalid and returns the input unchanged', () => {
    const bad = { value: 1, unit: 'em' };
    const { out, diagnostics } = run('dimension', bad);
    expect(out).toBe(bad);
    expect(diagnostics).toEqual([expect.objectContaining({ code: 'value/invalid', tokenId: 't' })]);
    expect(run('color', { colorSpace: 'cmyk', components: [0, 0, 0] }).diagnostics[0]?.code).toBe('value/invalid');
    expect(run('cubicBezier', [1.2, 0, 0, 1]).diagnostics[0]?.code).toBe('value/invalid');
    // keyword tables are read as own keys only, never through Object.prototype
    for (const keyword of ['constructor', 'toString', '__proto__']) {
      const r = run('fontWeight', keyword);
      expect(r.out, keyword).toBe(keyword);
      expect(r.diagnostics.map((d) => d.code), keyword).toEqual(['value/invalid']);
    }
  });

  test('a functional key on the wrong type is extension/schema; keys other checks own are left to them', () => {
    expect(run('dimension', px(4), { opsz: 32 }).diagnostics[0]?.code).toBe('extension/schema');
    expect(run('dimension', px(4), { spring: { duration: 0.3, bounce: 0 } }).diagnostics).toEqual([]);
    expect(run('dimension', px(4), { a11y: { pairsWith: ['x'] } }).diagnostics).toEqual([]);
    // an app.prism key that shares a name with an Object.prototype member is no functional key
    expect(run('dimension', px(4), { constructor: 1 }).diagnostics).toEqual([]);
  });
});
