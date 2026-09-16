// Gradient sampling and the Card header geometry for the vivid checks (ADR-0022 §4.1, ARCHITECTURE §10
// step 6).
//
// V1 (`stops: "all"`) samples every stop plus 100 points per segment, interpolated in both spaces the
// stacks may render in: gamma-encoded sRGB and OKLab (CSS's default for oklch() stops). V2
// (`region: "card-header"`) takes the same samples inside the t interval that the Card header block
// spans, plus the colors at the interval's ends, at sixteen reference geometries: four Card sizes by the
// padding and action size of each density (four since ADR-0029 §3.2 added `watch`).
//
// The stop colors are the CSS-gamut-mapped sRGB colors, which is what the emitted CSS paints on an sRGB
// display (ARCHITECTURE §7.2); an OKLab sample is mapped back to sRGB with the same CSS gamut mapping
// (Color.js through `irColor`).
import { irColor, lookup, type IRBundle, type PermKey, type Triple } from '../tokens/api.ts';

export type Space = 'srgb' | 'oklab';
export const SPACES: readonly Space[] = ['srgb', 'oklab'];

/** Interior samples per segment, on top of every stop (ADR-0022 §4.1). */
export const SAMPLES_PER_SEGMENT = 100;

/** CSS `linear-gradient` without an angle points to the bottom. */
export const CSS_DEFAULT_ANGLE = 180;

export interface GradientStop {
  readonly srgb: Triple;
  readonly position: number;
}

export interface GradientSample {
  readonly t: number;
  readonly srgb: Triple;
  /** Index of the stop when the sample is a stop, else null. */
  readonly stop: number | null;
}

/**
 * DTCG clamps positions to [0, 1]; CSS then raises a position below an earlier one to that earlier
 * position (CSS Images 3, color stop fixup).
 */
export function fixupStops(stops: readonly GradientStop[]): GradientStop[] {
  let max = 0;
  return stops.map((s) => {
    max = Math.max(max, Math.min(1, Math.max(0, s.position)));
    return { srgb: s.srgb, position: max };
  });
}

function lerp(a: Triple, b: Triple, f: number): Triple {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function oklabOf(srgb: Triple): Triple {
  const [l, c, h] = irColor('srgb', srgb, 1).oklch;
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

/** The color at fraction `f` between `a` and `b`, interpolated in `space`, as CSS-gamut-mapped sRGB. */
export function mix(a: Triple, b: Triple, f: number, space: Space): Triple {
  if (f <= 0) return a;
  if (f >= 1) return b;
  if (space === 'srgb') return lerp(a, b, f);
  return irColor('oklab', lerp(oklabOf(a), oklabOf(b), f), 1).srgb;
}

/** Every stop plus SAMPLES_PER_SEGMENT interior points per segment of non-zero length. */
export function sampleGradient(stops: readonly GradientStop[], space: Space): GradientSample[] {
  const fixed = fixupStops(stops);
  const out: GradientSample[] = fixed.map((s, i) => ({ t: s.position, srgb: s.srgb, stop: i }));
  for (let i = 0; i + 1 < fixed.length; i++) {
    const a = fixed[i];
    const b = fixed[i + 1];
    if (a === undefined || b === undefined || b.position <= a.position) continue;
    for (let k = 1; k <= SAMPLES_PER_SEGMENT; k++) {
      const f = k / (SAMPLES_PER_SEGMENT + 1);
      out.push({ t: a.position + (b.position - a.position) * f, srgb: mix(a.srgb, b.srgb, f, space), stop: null });
    }
  }
  return out;
}

/** The painted color at position t (outside the first and last stop: their colors). */
export function colorAt(stops: readonly GradientStop[], t: number, space: Space): Triple {
  const fixed = fixupStops(stops);
  const first = fixed[0];
  const last = fixed[fixed.length - 1];
  if (first === undefined || last === undefined) throw new Error('a gradient needs at least one stop');
  if (t <= first.position) return first.srgb;
  for (let i = 0; i + 1 < fixed.length; i++) {
    const a = fixed[i];
    const b = fixed[i + 1];
    if (a === undefined || b === undefined || t > b.position) continue;
    return b.position === a.position ? b.srgb : mix(a.srgb, b.srgb, (t - a.position) / (b.position - a.position), space);
  }
  return last.srgb;
}

/**
 * Position t of the point (x, y) (y running down) on the CSS gradient line of a W × H box at `angle`
 * degrees: 0 at the first stop's corner, 1 at the last stop's (visual-dna §5.1 rule 2, CSS angle
 * semantics: 0deg points up, 90deg right).
 */
export function gradientT(x: number, y: number, width: number, height: number, angle: number): number {
  const rad = (angle * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return 0.5 + ((x - width / 2) * sin - (y - height / 2) * cos) / (Math.abs(width * sin) + Math.abs(height * cos));
}

/** ADR-0022 §4.1 V2: the reference Card sizes W × H. */
export const CARD_SIZES: readonly (readonly [number, number])[] = [[166, 166], [240, 240], [320, 200], [180, 240]];
/** The gap between the header block and the action. */
export const HEADER_GAP_PX = 16;
/** The header block's height: a two-line headline title plus a caption. */
export const HEADER_HEIGHT_PX = 64;
/** The tokens that give the padding p and the action size a per density (ADR-0024 §7.1). */
export const CARD_PADDING_TOKEN = 'space.card-padding';
export const ACTION_SIZE_TOKEN = 'size.control.md';
const DENSITY_MODIFIER = 'density';

export interface CardGeometry {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
  readonly action: number;
  /** The density context p and a come from, or null when the resolver has no density modifier. */
  readonly density: string | null;
}

export interface HeaderBlock { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }

/** x from p to W − p − a − 16, y from p to p + 64 (ADR-0022 §4.1). */
export function headerBlock(g: CardGeometry): HeaderBlock {
  const block = { x0: g.padding, x1: g.width - g.padding - g.action - HEADER_GAP_PX, y0: g.padding, y1: g.padding + HEADER_HEIGHT_PX };
  if (block.x1 <= block.x0 || block.y1 > g.height) {
    throw new Error(`the Card header block does not fit a ${g.width}×${g.height} card with padding ${g.padding} and action ${g.action}`);
  }
  return block;
}

/** The t interval the header block's corners span on a gradient at `angle`. */
export function headerInterval(g: CardGeometry, angle: number): readonly [number, number] {
  const b = headerBlock(g);
  const ts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => gradientT(x ?? 0, y ?? 0, g.width, g.height, angle));
  return [Math.min(...ts), Math.max(...ts)];
}

/** The samples V2 checks: the interval's end colors plus every V1 sample inside the interval. */
export function headerSamples(stops: readonly GradientStop[], interval: readonly [number, number], space: Space): GradientSample[] {
  const [t0, t1] = interval;
  const inside = sampleGradient(stops, space).filter((s) => s.t >= t0 && s.t <= t1);
  return [{ t: t0, srgb: colorAt(stops, t0, space), stop: null }, { t: t1, srgb: colorAt(stops, t1, space), stop: null }, ...inside];
}

function withContext(key: PermKey, modifier: string, context: string): PermKey {
  return key.split('|').map((part) => (part.startsWith(`${modifier}=`) ? `${modifier}=${context}` : part)).join('|');
}

function px(bundle: IRBundle, key: PermKey, name: string): number {
  const perm = bundle.permutations.get(key);
  if (perm === undefined) throw new Error(`permutation ${key} is not in the bundle`);
  const ids = lookup(bundle, name);
  const token = ids.length === 1 && ids[0] !== undefined ? perm.tokens.get(ids[0]) : undefined;
  if (token?.value.kind !== 'dimension') throw new Error(`"${name}" must resolve to one dimension token for the Card header geometry (ADR-0022 §4.1)`);
  return token.value.px;
}

/**
 * The sixteen reference geometries of V2 for the permutation of a contrast context: every Card size with
 * the padding and action size of every density context (the context's own permutation when the resolver
 * has no density modifier).
 */
export function cardGeometries(bundle: IRBundle, permutation: PermKey): CardGeometry[] {
  const density = bundle.model.modifiers.find((m) => m.name === DENSITY_MODIFIER);
  const variants = density === undefined ? [{ key: permutation, density: null }] : density.contexts.map((c) => ({ key: withContext(permutation, DENSITY_MODIFIER, c), density: c }));
  const out: CardGeometry[] = [];
  for (const v of variants) {
    const padding = px(bundle, v.key, CARD_PADDING_TOKEN);
    const action = px(bundle, v.key, ACTION_SIZE_TOKEN);
    for (const [width, height] of CARD_SIZES) out.push({ width, height, padding, action, density: v.density });
  }
  return out;
}
