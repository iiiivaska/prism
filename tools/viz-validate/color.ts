// The color science of viz:validate (README.md, "The six checks"), written from the primary sources and not
// from the skill's script (README.md, "Provenance"):
//
//   - OKLab and OKLCH: Björn Ottosson's OKLab (2020), computed by Color.js, the color library the token build
//     already uses (tools/tokens/ir/color.ts). Lightness and chroma are read from OKLab's a and b here, so an
//     achromatic color has a chroma of 0 and no hue, rather than Color.js's `none`.
//   - The CVD simulation: Machado, Oliveira and Fernandes (2009), severity 1.0, as the authors publish the
//     matrices. They are applied to linear sRGB and the result is clamped to [0, 1], which is how the method's
//     thresholds were calibrated: color.test.ts reproduces the validator numbers that
//     docs/research/dataviz-design.md F61 and F62 recorded, and shows that the same matrices applied to
//     gamma-encoded sRGB do not.
//   - ΔE: the Euclidean distance in OKLab, times 100, under normal vision or under one simulated deficiency.
//
// Every input is a gamma-encoded sRGB triple in [0, 1]: a token's CSS-gamut-mapped sRGB (api.ResolvedColor.srgb),
// which is what WCAG and an sRGB display see, and what contrast:check measures too.
import Color from 'colorjs.io';
import type { Triple } from '../tokens/api.ts';

export type Deficiency = 'protan' | 'deutan' | 'tritan';

type Matrix = readonly [Triple, Triple, Triple];

/**
 * Machado, Oliveira and Fernandes (2009), "A Physiologically-based Model for Simulation of Color Vision
 * Deficiency", IEEE TVCG 15(6), 1291–1298: the protanomaly, deuteranomaly and tritanomaly matrices at severity
 * 1.0, from the authors' table (https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html).
 * Severity 1.0 is dichromacy: protanopia, deuteranopia, tritanopia.
 */
export const MACHADO_2009: Readonly<Record<Deficiency, Matrix>> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900],
  ],
};

/** The sRGB transfer function, gamma-encoded to linear (IEC 61966-2-1, the curve WCAG 2.x uses). */
export function toLinear(srgb: Triple): Triple {
  const f = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return [f(srgb[0]), f(srgb[1]), f(srgb[2])];
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function apply(m: Matrix, v: Triple): Triple {
  const row = (r: Triple): number => r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  return [row(m[0]), row(m[1]), row(m[2])];
}

/** OKLab of a linear-sRGB triple. */
export function oklabOfLinear(linear: Triple): Triple {
  const [l, a, b] = new Color('srgb-linear', [linear[0], linear[1], linear[2]]).to('oklab').coords;
  return [l ?? 0, a ?? 0, b ?? 0];
}

/** The linear-sRGB color a person with the deficiency sees, clamped to the displayable range. */
export function simulate(srgb: Triple, kind: Deficiency): Triple {
  const [r, g, b] = apply(MACHADO_2009[kind], toLinear(srgb));
  return [clamp01(r), clamp01(g), clamp01(b)];
}

export interface Lch {
  /** OKLCH lightness, 0..1. */
  readonly l: number;
  /** OKLCH chroma. */
  readonly c: number;
  /** OKLCH hue in degrees, [0, 360); null for an achromatic color (see `ACHROMATIC_BELOW` in config.ts). */
  readonly h: number | null;
}

/** OKLCH of a gamma-encoded sRGB color; `h` is null when the chroma is below `achromaticBelow`. */
export function oklch(srgb: Triple, achromaticBelow: number): Lch {
  const [l, a, b] = oklabOfLinear(toLinear(srgb));
  const c = Math.hypot(a, b);
  const h = c < achromaticBelow ? null : (((Math.atan2(b, a) * 180) / Math.PI) % 360 + 360) % 360;
  return { l, c, h };
}

/** ΔE between two colors: the Euclidean OKLab distance ×100, under normal vision or one simulated deficiency. */
export function deltaE(a: Triple, b: Triple, kind?: Deficiency): number {
  const x = oklabOfLinear(kind === undefined ? toLinear(a) : simulate(a, kind));
  const y = oklabOfLinear(kind === undefined ? toLinear(b) : simulate(b, kind));
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/**
 * The circular spread of a set of hues: the shortest arc of the hue circle that holds them all, in degrees.
 * 0 for one hue; 180 at most for two.
 */
export function hueSpread(hues: readonly number[]): number {
  if (hues.length < 2) return 0;
  const sorted = [...hues].map((h) => ((h % 360) + 360) % 360).sort((x, y) => x - y);
  let largestGap = 0;
  for (let i = 0; i < sorted.length; i++) {
    const here = sorted[i] ?? 0;
    const next = i + 1 < sorted.length ? (sorted[i + 1] ?? 0) : (sorted[0] ?? 0) + 360;
    largestGap = Math.max(largestGap, next - here);
  }
  return 360 - largestGap;
}
