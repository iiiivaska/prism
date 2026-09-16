// The map backdrop limit (ADR-0030 §1.5, rule 1; `map/backdrop-limit`): Prism styles the map, and the
// scheme's glass is measured on it, so every map ground composited over the land stays inside the
// backdrop limit of the glass that sits on the map in that scheme (ADR-0022 §3.3). In dark, light glass
// sits over the map, so every ground is at OKLCH L 0.35 or darker, which is also below the dark-glass
// limit of 0.67; in light, every ground is at L 0.45 or lighter, the light-glass limit. A resolver
// without `color.map.land` (the older fixtures) has no map and nothing to check.
import { flatten, irColor, LookupError, type ContrastContext, type Rgba } from '../tokens/api.ts';
import { contextLabel, PairError, tokenBottoms, type Problem } from './pairs.ts';

export const MAP_LAND = 'color.map.land';
/** The seven grounds (ADR-0030 §1.1); the marks (label, routes, casing) are not grounds. */
export const MAP_GROUNDS = 'color.map.land|block|building|road|road-casing|water|park';

export interface MapLimit {
  /** The lightest permitted OKLCH L, or null. */
  readonly max: number | null;
  /** The darkest permitted OKLCH L, or null. */
  readonly min: number | null;
}

/** ADR-0022 §3.3's light-glass limits, per base scheme. */
export const MAP_LIMITS: Readonly<Record<'light' | 'dark', MapLimit>> = {
  light: { min: 0.45, max: null },
  dark: { min: null, max: 0.35 },
};

export interface MapGround {
  readonly context: ContrastContext;
  /** Token id of the ground. */
  readonly id: string;
  /** Public path of the ground. */
  readonly path: string;
  /** OKLCH L of the ground composited over the land. */
  readonly lightness: number;
  readonly hex: string;
  readonly limit: MapLimit;
  readonly pass: boolean;
}

function hexOf(rgba: Rgba): string {
  return `#${rgba.srgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** The grounds of one context, each over the land, or null when the context has no map. */
export function mapGrounds(ctx: ContrastContext): MapGround[] | null {
  try {
    ctx.colors(MAP_LAND);
  } catch (e) {
    if (e instanceof LookupError) return null;
    throw e;
  }
  const limit = MAP_LIMITS[ctx.scheme];
  return tokenBottoms(ctx, { colors: MAP_GROUNDS, ground: MAP_LAND }).map((b) => {
    const lightness = irColor('srgb', flatten([b.color]), 1).oklch[0];
    const pass = (limit.max === null || lightness <= limit.max + 1e-9) && (limit.min === null || lightness >= limit.min - 1e-9);
    const token = ctx.color(b.id);
    return { context: ctx, id: b.id, path: token.path, lightness, hex: hexOf(b.color), limit, pass };
  });
}

export function limitText(limit: MapLimit): string {
  return [limit.min === null ? null : `L >= ${limit.min}`, limit.max === null ? null : `L <= ${limit.max}`].filter((x) => x !== null).join(' and ');
}

/** Every map ground of every context, and a `map/backdrop-limit` problem for each one outside its limit. */
export function checkMapBackdrops(contexts: readonly ContrastContext[]): { readonly grounds: readonly MapGround[]; readonly problems: readonly Problem[] } {
  const grounds: MapGround[] = [];
  const problems: Problem[] = [];
  for (const ctx of contexts) {
    let list: MapGround[] | null;
    try {
      list = mapGrounds(ctx);
    } catch (e) {
      if (!(e instanceof PairError)) throw e;
      problems.push({ where: MAP_GROUNDS, message: `map/backdrop-limit in ${contextLabel(ctx)}: ${e.message}` });
      continue;
    }
    if (list === null) continue;
    grounds.push(...list);
    for (const g of list) {
      if (g.pass) continue;
      problems.push({
        where: g.id,
        message: `map/backdrop-limit: ${g.path} composites to ${g.hex} (OKLCH L ${g.lightness.toFixed(3)}) over ${MAP_LAND} in ${contextLabel(ctx)}; ${ctx.scheme} map grounds keep ${limitText(g.limit)}, the backdrop limit of the glass on the map (ADR-0030 §1.5)`,
      });
    }
  }
  return { grounds, problems };
}
