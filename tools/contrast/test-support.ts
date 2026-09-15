// In-memory contrast contexts for the unit tests: colors and gradients by name, no Style Dictionary run.
import { hexToRgba, LookupError, type ContrastContext, type ResolvedColor, type ResolvedGradient } from '../tokens/api.ts';
import type { CardGeometry } from './gradient.ts';
import { parsePair, type Env, type Pair } from './pairs.ts';
import { ADR_0011_THRESHOLDS } from './thresholds.ts';

/** '#rrggbb', or ['#rrggbb', alpha]. */
export type ColorSpec = string | readonly [string, number];

export function resolvedColor(name: string, spec: ColorSpec): ResolvedColor {
  const [hex, alpha] = typeof spec === 'string' ? [spec, 1] : spec;
  const { srgb } = hexToRgba(hex);
  return { id: name, path: name, srgb, alpha, p3: srgb, hex: hex.toLowerCase(), aliasChain: [name] };
}

export interface GradientSpec {
  readonly id: string;
  readonly stops: readonly (readonly [string, number])[];
  readonly angle?: number | null;
  readonly scheme?: 'light' | 'dark' | null;
  readonly chain?: readonly string[];
}

export function resolvedGradient(g: GradientSpec): ResolvedGradient {
  return {
    id: g.id,
    stops: g.stops.map(([hex, position], i) => ({ color: resolvedColor(`${g.id}.${i}`, hex), position })),
    angle: g.angle ?? null,
    scheme: g.scheme ?? null,
    aliasChain: g.chain ?? [g.id],
  };
}

export function fakeContext(opts: {
  readonly colorScheme: string;
  readonly brand?: string;
  readonly colors: Readonly<Record<string, ColorSpec>>;
  readonly gradients?: Readonly<Record<string, readonly GradientSpec[]>>;
}): ContrastContext {
  const scheme = opts.colorScheme.startsWith('dark') ? 'dark' : 'light';
  const variant = opts.colorScheme.endsWith('-increased-contrast') ? 'increasedContrast' : opts.colorScheme.endsWith('-reduced-transparency') ? 'reducedTransparency' : 'none';
  return {
    brand: opts.brand ?? 'prism',
    colorScheme: opts.colorScheme,
    scheme,
    variant,
    permutation: `brand=${opts.brand ?? 'prism'}|colorScheme=${opts.colorScheme}`,
    color(name) {
      const spec = opts.colors[name];
      if (spec === undefined) {
        if (opts.gradients?.[name] !== undefined) throw new Error(`"${name}" must resolve to exactly one color token, got ${name} (gradient)`);
        throw new LookupError(name, []);
      }
      return resolvedColor(name, spec);
    },
    gradient(name) {
      const list = opts.gradients?.[name];
      if (list === undefined) {
        if (opts.colors[name] !== undefined) return [];
        throw new LookupError(name, []);
      }
      return list.map(resolvedGradient);
    },
  };
}

/** A pair from its raw JSON form; throws when it is invalid. */
export function pair(raw: Record<string, unknown>, index = 0): Pair {
  const r = parsePair(raw, index);
  if (r.pair === null) throw new Error(`invalid test pair: ${r.problems.join('; ')}`);
  return r.pair;
}

export function env(geometries: readonly CardGeometry[] = []): Env {
  return { thresholds: ADR_0011_THRESHOLDS, geometries: () => geometries };
}
