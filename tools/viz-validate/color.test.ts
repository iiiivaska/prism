// The color science of viz:validate: OKLCH, the Machado 2009 simulation and ΔE. The numbers the method's own
// validator recorded in docs/research/dataviz-design.md F61 and F62 are the reference: this implementation was
// written from the primary sources, and reproducing them to the recorded digit is what shows it is the same
// method (README.md, "Provenance").
import { describe, expect, test } from 'vitest';
import { hexToRgba, type Triple } from '../tokens/api.ts';
import { deltaE, hueSpread, MACHADO_2009, oklabOfLinear, oklch, simulate, toLinear, type Deficiency } from './color.ts';

const rgb = (hex: string): Triple => hexToRgba(hex).srgb;
const GATED: readonly Deficiency[] = ['protan', 'deutan'];

/** The worst pair of a pair list: its ΔE, the deficiency and the two colors. */
function worst(hexes: readonly string[], pairs: 'adjacent' | 'all', kinds: readonly (Deficiency | undefined)[], d = deltaE): { value: number; kind: Deficiency | undefined; pair: string } {
  let out = { value: Infinity, kind: undefined as Deficiency | undefined, pair: '' };
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      if (pairs === 'adjacent' && j !== i + 1) continue;
      const a = hexes[i] ?? '';
      const b = hexes[j] ?? '';
      for (const kind of kinds) {
        const value = d(rgb(a), rgb(b), kind);
        if (value < out.value) out = { value, kind, pair: `${a} ${b}` };
      }
    }
  }
  return out;
}

// docs/research/dataviz-design.md §4: the orange-first order of the skill's steps.
const S4_LIGHT = ['#eb6834', '#1baf7a', '#2a78d6', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const S4_DARK = ['#d95926', '#199e70', '#3987e5', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

describe('the recorded validator numbers (dataviz-design F61, F62) come back to the recorded digit', () => {
  test('F62: the §4 order, adjacent pairs: CVD 9.2 (deutan) and normal 19.6 in light, CVD 9.4 and normal 19.3 in dark', () => {
    const cvdLight = worst(S4_LIGHT, 'adjacent', GATED);
    expect(cvdLight.value.toFixed(1)).toBe('9.2');
    expect(cvdLight.kind).toBe('deutan');
    expect(cvdLight.pair).toBe('#eb6834 #1baf7a');
    expect(worst(S4_LIGHT, 'adjacent', [undefined]).value.toFixed(1)).toBe('19.6');
    expect(worst(S4_DARK, 'adjacent', GATED).value.toFixed(1)).toBe('9.4');
    expect(worst(S4_DARK, 'adjacent', [undefined]).value.toFixed(1)).toBe('19.3');
  });

  test('F62: the first three slots pass all pairs (CVD 9.2 / 9.4, normal 24.0 / 20.9); the fourth fails (normal 13.7 light, CVD 4.8 dark)', () => {
    expect(worst(S4_LIGHT.slice(0, 3), 'all', GATED).value.toFixed(1)).toBe('9.2');
    expect(worst(S4_DARK.slice(0, 3), 'all', GATED).value.toFixed(1)).toBe('9.4');
    expect(worst(S4_LIGHT.slice(0, 3), 'all', [undefined]).value.toFixed(1)).toBe('24.0');
    expect(worst(S4_DARK.slice(0, 3), 'all', [undefined]).value.toFixed(1)).toBe('20.9');
    const yellowOrange = worst(S4_LIGHT.slice(0, 4), 'all', [undefined]);
    expect([yellowOrange.value.toFixed(1), yellowOrange.pair]).toEqual(['13.7', '#eb6834 #eda100']);
    const dark = worst(S4_DARK.slice(0, 4), 'all', GATED);
    expect([dark.value.toFixed(1), dark.pair]).toEqual(['4.8', '#d95926 #c98500']);
  });

  test('F61: Okabe-Ito without black passes CVD at 15.8 and normal vision at 16.4, and its yellow has L 0.90', () => {
    const okabe = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'];
    expect(worst(okabe, 'adjacent', GATED).value.toFixed(1)).toBe('15.8');
    expect(worst(okabe, 'adjacent', [undefined]).value.toFixed(1)).toBe('16.4');
    expect(oklch(rgb('#F0E442'), 0.02).l.toFixed(2)).toBe('0.90');
  });

  test('F61: Tableau 10 and Observable 10 fall under the normal-vision floor, at 14.0 and 13.7', () => {
    const tableau = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'];
    const observable = ['#4269d0', '#efb118', '#ff725c', '#6cc5b0', '#3ca951', '#ff8ab7', '#a463f2', '#97bbf5', '#9c6b4e', '#9498a0'];
    expect(worst(tableau, 'adjacent', [undefined]).value.toFixed(1)).toBe('14.0');
    expect(worst(observable, 'adjacent', [undefined]).value.toFixed(1)).toBe('13.7');
    // Tableau: five slots below the chroma floor; Observable: four.
    expect(tableau.filter((h) => oklch(rgb(h), 0.02).c < 0.1)).toHaveLength(5);
    expect(observable.filter((h) => oklch(rgb(h), 0.02).c < 0.1)).toHaveLength(4);
  });

  test('the model is load-bearing: the same matrices on gamma-encoded sRGB miss F62', () => {
    const gamma = (a: Triple, b: Triple, kind?: Deficiency): number => {
      if (kind === undefined) return deltaE(a, b);
      const sim = (c: Triple): Triple => {
        const m = MACHADO_2009[kind];
        const row = (r: Triple): number => Math.min(1, Math.max(0, r[0] * c[0] + r[1] * c[1] + r[2] * c[2]));
        return toLinear([row(m[0]), row(m[1]), row(m[2])]);
      };
      const x = oklabOfLinear(sim(a));
      const y = oklabOfLinear(sim(b));
      return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
    };
    expect(worst(S4_LIGHT, 'adjacent', GATED, gamma).value.toFixed(1)).not.toBe('9.2');
    expect(worst(S4_DARK, 'adjacent', GATED, gamma).value.toFixed(1)).not.toBe('9.4');
    // Tritanopia is reported, not gated: gating it would fail the §4 order F62 records as passing (5.8 in light).
    expect(worst(S4_LIGHT, 'adjacent', ['tritan']).value).toBeLessThan(6);
  });
});

describe('primitives', () => {
  test('each Machado matrix keeps white, black and gray: its rows sum to 1', () => {
    for (const kind of ['protan', 'deutan', 'tritan'] as const) {
      for (const row of MACHADO_2009[kind]) expect(row[0] + row[1] + row[2]).toBeCloseTo(1, 5);
      for (const gray of ['#ffffff', '#000000', '#777777']) {
        const s = simulate(rgb(gray), kind);
        const l = toLinear(rgb(gray));
        for (const i of [0, 1, 2] as const) expect(s[i]).toBeCloseTo(l[i], 5);
      }
    }
  });

  test('the simulation clamps to the displayable range', () => {
    // Pure red under tritanopia comes out at 1.256 and -0.078 before the clamp (the matrix's first column).
    expect(simulate(rgb('#ff0000'), 'tritan')).toEqual([1, 0, simulate(rgb('#ff0000'), 'tritan')[2]]);
    for (const kind of ['protan', 'deutan', 'tritan'] as const) {
      for (const hex of ['#ff0000', '#00ff00', '#0000ff']) for (const c of simulate(rgb(hex), kind)) expect(c >= 0 && c <= 1).toBe(true);
    }
  });

  test('ΔE is symmetric, zero for one color, and ×100 of the OKLab distance', () => {
    const a = rgb('#2a78d6');
    const b = rgb('#eb6834');
    expect(deltaE(a, a)).toBe(0);
    expect(deltaE(a, a, 'deutan')).toBe(0);
    expect(deltaE(a, b)).toBeCloseTo(deltaE(b, a), 12);
    expect(deltaE(rgb('#ffffff'), rgb('#000000'))).toBeCloseTo(100, 3);
  });

  test('OKLCH: white has L 1 and no hue; a hue is read from a and b in [0, 360)', () => {
    const white = oklch(rgb('#ffffff'), 0.02);
    expect(white.l).toBeCloseTo(1, 4);
    expect(white.c).toBeLessThan(1e-4);
    expect(white.h).toBeNull();
    const blue = oklch(rgb('#2a78d6'), 0.02);
    expect(blue.h).toBeGreaterThan(250);
    expect(blue.h).toBeLessThan(260);
    // Just below the achromatic bound a color has no hue; just above, it has one.
    expect(oklch(rgb('#0d0e11'), 0.02).h).toBeNull();
    expect(oklch(rgb('#0d0e11'), 0.005).h).not.toBeNull();
  });

  test('the hue spread is the shortest arc that holds every hue, across 0°', () => {
    expect(hueSpread([])).toBe(0);
    expect(hueSpread([120])).toBe(0);
    expect(hueSpread([10, 50])).toBe(40);
    expect(hueSpread([350, 10])).toBeCloseTo(20, 9);
    expect(hueSpread([0, 180])).toBe(180);
    expect(hueSpread([10, 20, 350, 355])).toBeCloseTo(30, 9);
    expect(hueSpread([0, 120, 240])).toBe(240);
  });
});
