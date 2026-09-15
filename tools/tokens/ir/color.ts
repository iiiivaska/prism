// Color.js wrapper (ARCHITECTURE §7.2), memoized by input: DTCG space mapping, CSS Color 4 gamut
// mapping to sRGB and Display P3 (method 'css', passed explicitly), OKLCH, hex and gamut tests.
// Color.js 0.5.2 is the version Style Dictionary 5.5.3 depends on, so one copy serves both.
// Color.js `toString()` is never used: its format changes between versions (§12 rule 3).
import Color from 'colorjs.io';
import type { DTCGColorSpace, IRColor, Triple } from './types.ts';

export const COLOR_SPACES: Readonly<Record<DTCGColorSpace, string>> = {
  srgb: 'srgb',
  'srgb-linear': 'srgb-linear',
  hsl: 'hsl',
  hwb: 'hwb',
  lab: 'lab',
  lch: 'lch',
  oklab: 'oklab',
  oklch: 'oklch',
  'display-p3': 'p3',
  'a98-rgb': 'a98rgb',
  'prophoto-rgb': 'prophoto',
  rec2020: 'rec2020',
  'xyz-d65': 'xyz-d65',
  'xyz-d50': 'xyz-d50',
};

export function isColorSpace(value: unknown): value is DTCGColorSpace {
  return typeof value === 'string' && Object.hasOwn(COLOR_SPACES, value);
}

type Components = readonly [number | 'none', number | 'none', number | 'none'];

const memo = new Map<string, Omit<IRColor, 'alpha'>>();

function triple(coords: readonly number[]): Triple {
  return [coords[0] ?? 0, coords[1] ?? 0, coords[2] ?? 0];
}

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

function hexOf(srgb: Triple): string {
  return `#${srgb.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** The derived fields of a color; alpha is carried separately so an alias can replace it. */
function derive(space: DTCGColorSpace, components: Components): Omit<IRColor, 'alpha'> {
  const key = `${space}|${components.join(',')}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const coords = components.map((c) => (c === 'none' ? NaN : c)) as [number, number, number];
  const c = new Color(COLOR_SPACES[space], coords, 1);
  const srgb = triple(c.clone().toGamut({ space: 'srgb', method: 'css' }).to('srgb').coords);
  const p3 = triple(c.clone().to('p3').toGamut({ space: 'p3', method: 'css' }).coords);
  const ok = c.clone().to('oklch').coords;
  const chroma = ok[1] ?? 0;
  const hue = ok[2] ?? 0;
  const oklch: Triple = [ok[0] ?? 0, Number.isNaN(chroma) ? 0 : chroma, Number.isNaN(hue) || chroma < 0.00005 ? 0 : hue];
  const out = {
    kind: 'color' as const,
    space,
    components,
    hex: hexOf(srgb),
    srgb,
    p3,
    oklch,
    inSrgb: c.inGamut('srgb'),
    inP3: c.inGamut('p3'),
  };
  memo.set(key, out);
  return out;
}

export function irColor(space: DTCGColorSpace, components: Components, alpha: number): IRColor {
  const d = derive(space, components);
  return {
    kind: 'color',
    space: d.space,
    components: d.components,
    alpha,
    hex: d.hex,
    srgb: d.srgb,
    p3: d.p3,
    oklch: d.oklch,
    inSrgb: d.inSrgb,
    inP3: d.inP3,
  };
}

/** The same color with another alpha (ADR-0020 §3: `app.prism.alpha` replaces the alpha and nothing else). */
export function withAlpha(color: IRColor, alpha: number): IRColor {
  return color.alpha === alpha ? color : { ...color, alpha };
}
