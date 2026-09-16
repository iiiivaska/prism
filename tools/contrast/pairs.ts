// tokens/contrast-pairs.json: loading, validation and evaluation (ARCHITECTURE §10, ADR-0011, ADR-0022).
//
// Compositing policy (source-over in gamma-encoded sRGB, WCAG 2.x ratios):
//   1. fg and bg resolve in the context through api.lookup; each must be exactly one color token.
//   2. The bottom layer is color.bg.page, which must be opaque, or each entry of "backdrops" in turn (a hex
//      color; a gradient name or glob whose gradients of the context's base scheme contribute every stop
//      and every V1 sample between stops, in both interpolation spaces; or a token backdrop, color tokens
//      by name or glob, each composited over the opaque ground named after " over " (ADR-0030 §1.5), or
//      opaque on their own when no ground is named; see bottoms()).
//   3. Each entry of "underlays" (a color name) is laid over the bottom layer in turn, then bg over that.
//      Without "underlays" bg sits directly on the bottom layer.
//   4. A translucent fg is composited over the flattened background.
//   5. A pair with "stops": "all" (ADR-0022 V1) or "region": "card-header" (V2) has a gradient bg; see
//      gradient.ts for the samples.
// The pair's ratio is the minimum over every combination; the worst one is reported.
import { parseTree, printParseErrorCode, type Node, type ParseError } from 'jsonc-parser';
import {
  contrastRatio, flatten, hexToRgba, lookup, LookupError, over,
  type ContrastContext, type IRBundle, type ResolvedColor, type ResolvedGradient, type Rgba, type Triple,
} from '../tokens/api.ts';
import { CSS_DEFAULT_ANGLE, headerInterval, headerSamples, sampleGradient, SPACES, type CardGeometry, type GradientStop } from './gradient.ts';
import { isTier, parseThresholds, sizeProblem, thresholdKey, type ThresholdKey, type Thresholds, type Tier } from './thresholds.ts';

export type BaseScheme = 'light' | 'dark';
const BASE_SCHEMES: readonly BaseScheme[] = ['light', 'dark'];

export interface Pair {
  /** Position in the file's `pairs` array. */
  readonly index: number;
  /** 1-based line of the pair in the file, when known. */
  readonly line: number | null;
  readonly fg: string;
  readonly bg: string;
  readonly tier: Tier;
  readonly minSizePx: number | null;
  /** Base schemes the pair is evaluated in (with their variants); null: every scheme. */
  readonly schemes: readonly BaseScheme[] | null;
  /** Hex colors, gradient names or globs, and token backdrops (`<colors> over <ground>`); empty: the page. */
  readonly backdrops: readonly string[];
  /** Color names laid between the bottom layer and bg, one at a time; empty: none. */
  readonly underlays: readonly string[];
  readonly stops: 'all' | null;
  readonly region: 'card-header' | null;
  readonly note: string | null;
}

export interface PairsFile {
  readonly thresholds: Thresholds;
  readonly pairs: readonly Pair[];
}

export interface Problem {
  /** 'tokens/contrast-pairs.json:12', a token id, or a pair label. */
  readonly where: string;
  readonly message: string;
}

const TOP_KEYS = ['$comment', 'thresholds', 'pairs'];
const PAIR_KEYS = ['fg', 'bg', 'tier', 'minSizePx', 'schemes', 'backdrops', 'underlays', 'stops', 'region', 'note'];
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const PAGE = 'color.bg.page';
/** The separator of a token backdrop: `color.map.water|park over color.map.land` (ADR-0030 §1.5). */
export const OVER = ' over ';

export interface TokenBackdrop {
  /** A color name or glob. */
  readonly colors: string;
  /** The opaque color each of them is composited over, or null: they must be opaque themselves. */
  readonly ground: string | null;
}

/** A backdrop entry that names color tokens, or null for a hex color or a gradient-only entry (decided per context). */
export function tokenBackdrop(entry: string): TokenBackdrop | null {
  if (entry.startsWith('#')) return null;
  const at = entry.indexOf(OVER);
  if (at < 0) return null;
  return { colors: entry.slice(0, at).trim(), ground: entry.slice(at + OVER.length).trim() };
}

/** `color.text.primary on color.bg.page`, with the pair's qualifiers. */
export function pairLabel(p: Pair): string {
  const parts = [`${p.fg} on ${p.bg}`];
  if (p.underlays.length > 0) parts.push(`underlays [${p.underlays.join(', ')}]`);
  if (p.backdrops.length > 0) parts.push(`over [${p.backdrops.join(', ')}]`);
  if (p.stops !== null) parts.push(`stops: ${p.stops}`);
  if (p.region !== null) parts.push(`region: ${p.region}`);
  if (p.schemes !== null) parts.push(`schemes: ${p.schemes.join(', ')}`);
  if (p.minSizePx !== null) parts.push(`>= ${p.minSizePx} px`);
  return parts.join(' · ');
}

function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string' && v.trim() !== '') ? (value as string[]) : null;
}

/** Validates one raw pair; returns the pair (null when invalid) and its problems. */
export function parsePair(raw: unknown, index: number, line: number | null = null): { readonly pair: Pair | null; readonly problems: readonly string[] } {
  if (!isRecord(raw)) return { pair: null, problems: ['a pair must be an object'] };
  const problems: string[] = [];
  for (const key of Object.keys(raw)) if (!PAIR_KEYS.includes(key)) problems.push(`unknown key "${key}"; known: ${PAIR_KEYS.join(', ')}`);
  const str = (key: string): string | null => {
    const v = raw[key];
    if (typeof v === 'string' && v.trim() !== '') return v;
    problems.push(`"${key}" must be a non-empty string`);
    return null;
  };
  const fg = str('fg');
  const bg = str('bg');
  const tier = raw['tier'];
  if (!isTier(tier)) problems.push(`"tier" must be functional, decorative or boundary, not ${JSON.stringify(tier)}`);

  let minSizePx: number | null = null;
  if (raw['minSizePx'] !== undefined) {
    const v = raw['minSizePx'];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) minSizePx = v;
    else problems.push('"minSizePx" must be a positive number of px');
  }
  if (isTier(tier)) {
    const size = sizeProblem(tier, minSizePx);
    if (size !== null) problems.push(size);
  }

  let schemes: BaseScheme[] | null = null;
  if (raw['schemes'] !== undefined) {
    const list = stringList(raw['schemes']);
    if (list === null || !list.every((s) => (BASE_SCHEMES as readonly string[]).includes(s)) || new Set(list).size !== list.length) {
      problems.push(`"schemes" must be a non-empty list of distinct base schemes (${BASE_SCHEMES.join(', ')})`);
    } else schemes = list as BaseScheme[];
  }

  let backdrops: string[] = [];
  if (raw['backdrops'] !== undefined) {
    const list = stringList(raw['backdrops']);
    if (list === null) problems.push('"backdrops" must be a non-empty list of hex colors, gradient names and token backdrops');
    else {
      for (const b of list) {
        const tb = tokenBackdrop(b);
        if (tb !== null) {
          if (tb.colors === '' || tb.ground === '' || /\s/.test(tb.colors) || /\s/.test(tb.ground ?? '')) {
            problems.push(`backdrop "${b}" must read "<color name or glob> over <color name>" (ADR-0030 §1.5)`);
          }
          continue;
        }
        if (!b.startsWith('#')) continue;
        if (!HEX.test(b)) problems.push(`backdrop "${b}" is not a hex color`);
        else if (hexToRgba(b).alpha !== 1) problems.push(`backdrop "${b}" is translucent; a backdrop is the opaque bottom layer`);
      }
      if (new Set(list.map((b) => b.toLowerCase())).size !== list.length) problems.push('"backdrops" lists a backdrop twice');
      backdrops = list;
    }
  }

  let underlays: string[] = [];
  if (raw['underlays'] !== undefined) {
    const list = stringList(raw['underlays']);
    if (list === null || new Set(list).size !== list.length) problems.push('"underlays" must be a non-empty list of distinct color names');
    else underlays = list;
  }

  let stops: 'all' | null = null;
  if (raw['stops'] !== undefined) {
    if (raw['stops'] === 'all') stops = 'all';
    else if (raw['stops'] === 'text-zone') problems.push('"stops": "text-zone" is gone: no gradient declares a text-safe zone (ADR-0022 §4.1); use "stops": "all" (V1) or "region": "card-header" (V2)');
    else problems.push(`"stops" must be "all", not ${JSON.stringify(raw['stops'])}`);
  }
  let region: 'card-header' | null = null;
  if (raw['region'] !== undefined) {
    if (raw['region'] === 'card-header') region = 'card-header';
    else problems.push(`"region" must be "card-header", not ${JSON.stringify(raw['region'])}`);
  }
  if (raw['stops'] !== undefined && raw['region'] !== undefined) problems.push('"stops" and "region" are separate checks (V1 and V2); write two pairs');
  if ((raw['stops'] !== undefined || raw['region'] !== undefined) && (raw['backdrops'] !== undefined || raw['underlays'] !== undefined)) {
    problems.push('a gradient background ("stops" or "region") takes no "backdrops" or "underlays"');
  }

  let note: string | null = null;
  if (raw['note'] !== undefined) {
    if (typeof raw['note'] === 'string') note = raw['note'];
    else problems.push('"note" must be a string');
  }

  if (problems.length > 0 || fg === null || bg === null || !isTier(tier)) return { pair: null, problems };
  return { pair: { index, line, fg, bg, tier, minSizePx, schemes, backdrops, underlays, stops, region, note }, problems };
}

function identity(p: Pair): string {
  return JSON.stringify([p.fg, p.bg, p.tier, p.minSizePx, p.schemes, p.backdrops, p.underlays, p.stops, p.region]);
}

/** Parses and validates the pairs file (structure only; names are resolved per context). */
export function parsePairsFile(text: string, file: string): { readonly file: PairsFile | null; readonly problems: readonly Problem[] } {
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false });
  const problems: Problem[] = errors.map((e) => ({ where: `${file}:${lineOf(text, e.offset)}`, message: `JSON ${printParseErrorCode(e.error)}` }));
  if (tree === undefined || errors.length > 0) return { file: null, problems };
  if (tree.type !== 'object') return { file: null, problems: [{ where: file, message: 'the pairs file must be a JSON object' }] };

  const props = new Map<string, Node>();
  for (const prop of tree.children ?? []) {
    const [keyNode, valueNode] = prop.children ?? [];
    const key = keyNode?.value as string | undefined;
    if (key === undefined || valueNode === undefined) continue;
    if (props.has(key)) problems.push({ where: `${file}:${lineOf(text, prop.offset)}`, message: `duplicate key "${key}"` });
    props.set(key, valueNode);
    if (!TOP_KEYS.includes(key)) problems.push({ where: `${file}:${lineOf(text, prop.offset)}`, message: `unknown key "${key}"; known: ${TOP_KEYS.join(', ')}` });
  }
  const raw = JSON.parse(text) as Record<string, unknown>;

  const t = parseThresholds(raw['thresholds']);
  const thresholdsLine = props.get('thresholds');
  for (const message of t.problems) problems.push({ where: thresholdsLine === undefined ? file : `${file}:${lineOf(text, thresholdsLine.offset)}`, message });

  const pairsNode = props.get('pairs');
  const rawPairs = raw['pairs'];
  if (pairsNode === undefined || !Array.isArray(rawPairs) || rawPairs.length === 0) {
    problems.push({ where: file, message: '"pairs" must be a non-empty list' });
    return { file: null, problems };
  }
  const pairs: Pair[] = [];
  const seen = new Map<string, Pair>();
  rawPairs.forEach((rp, index) => {
    const node = pairsNode.children?.[index];
    const line = node === undefined ? null : lineOf(text, node.offset);
    const where = `${file}:${line ?? '?'} pairs[${index}]`;
    const duplicateKeys = new Set<string>();
    for (const prop of node?.children ?? []) {
      const key = prop.children?.[0]?.value as string | undefined;
      if (key === undefined) continue;
      if (duplicateKeys.has(key)) problems.push({ where, message: `duplicate key "${key}"` });
      duplicateKeys.add(key);
    }
    const r = parsePair(rp, index, line);
    for (const message of r.problems) problems.push({ where, message });
    if (r.pair === null) return;
    const twin = seen.get(identity(r.pair));
    if (twin !== undefined) problems.push({ where, message: `repeats pairs[${twin.index}] (${pairLabel(twin)})` });
    else seen.set(identity(r.pair), r.pair);
    pairs.push(r.pair);
  });
  if (t.thresholds === null || problems.length > 0) return { file: null, problems };
  return { file: { thresholds: t.thresholds, pairs }, problems };
}

// ---- evaluation ----

/** A name that does not resolve as the pair needs, in one context. */
export class PairError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PairError';
  }
}

export interface Env {
  readonly thresholds: Thresholds;
  /** The V2 reference geometries in a context (gradient.ts cardGeometries). */
  geometries(ctx: ContrastContext): readonly CardGeometry[];
}

export interface Evaluation {
  readonly pair: Pair;
  readonly context: ContrastContext;
  readonly ratio: number;
  readonly thresholdKey: ThresholdKey;
  readonly threshold: number;
  readonly pass: boolean;
  /** The worst combination: which backdrop, underlay or gradient sample, and the composited colors. */
  readonly worst: string;
  /** How many composited combinations were checked. */
  readonly cases: number;
  /** Alias chains of the gradients the pair evaluated (the ADR-0022 §4.1 coverage check). */
  readonly gradients: readonly (readonly string[])[];
}

/** Floating-point noise must not flip an exact 4.5:1 (a ratio is compared unrounded otherwise). */
const EPSILON = 1e-9;

export function contextLabel(ctx: ContrastContext): string {
  return ctx.brand === '' ? ctx.colorScheme : `${ctx.brand}/${ctx.colorScheme}`;
}

export function appliesTo(pair: Pair, ctx: ContrastContext): boolean {
  return pair.schemes === null || pair.schemes.includes(ctx.scheme);
}

function hex(rgb: Triple): string {
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function rgba(c: ResolvedColor): Rgba {
  return { srgb: c.srgb, alpha: c.alpha };
}

function color(ctx: ContrastContext, name: string): ResolvedColor {
  try {
    return ctx.color(name);
  } catch (e) {
    throw new PairError(e instanceof Error ? e.message : String(e));
  }
}

function page(ctx: ContrastContext): Rgba {
  const p = color(ctx, PAGE);
  if (p.alpha !== 1) throw new PairError(`${PAGE} is translucent (alpha ${p.alpha}); the page is the opaque bottom layer (ARCHITECTURE §10)`);
  return rgba(p);
}

/** Whether a backdrop name without " over " names color tokens rather than gradients. */
function isColorBackdrop(ctx: ContrastContext, name: string): boolean {
  try {
    return ctx.gradient(name).length === 0 && ctx.colors(name).length > 0;
  } catch {
    return false;   // gradients() reports the unknown name
  }
}

/** The context's gradients for a name or glob, restricted to the context's base scheme. */
function gradients(ctx: ContrastContext, name: string): ResolvedGradient[] {
  let all: readonly ResolvedGradient[];
  try {
    all = ctx.gradient(name);
  } catch (e) {
    throw new PairError(e instanceof Error ? e.message : String(e));
  }
  const own = all.filter((g) => g.scheme === null || g.scheme === ctx.scheme);
  if (all.length === 0) throw new PairError(`"${name}" matches no gradient token`);
  if (own.length === 0) throw new PairError(`"${name}" matches no gradient of the ${ctx.scheme} scheme`);
  return own;
}

interface Bottom { readonly color: Rgba; readonly label: string }

/** The colors a token backdrop names, in a context. */
function backdropColors(ctx: ContrastContext, name: string): readonly ResolvedColor[] {
  let list: readonly ResolvedColor[];
  try {
    list = ctx.colors(name);
  } catch (e) {
    throw new PairError(e instanceof Error ? e.message : String(e));
  }
  if (list.length === 0) throw new PairError(`"${name}" matches no color token`);
  return list;
}

/**
 * A token backdrop's opaque bottom layers (ADR-0030 §1.5): each named color composited over its ground,
 * or taken as it is when no ground is named, which then requires it to be opaque.
 */
export function tokenBottoms(ctx: ContrastContext, tb: TokenBackdrop): { readonly color: Rgba; readonly label: string; readonly id: string }[] {
  const ground = tb.ground === null ? null : color(ctx, tb.ground);
  if (ground !== null && ground.alpha !== 1) throw new PairError(`${tb.ground ?? ''} is translucent (alpha ${ground.alpha}); a token backdrop's ground is opaque`);
  return backdropColors(ctx, tb.colors).map((c) => {
    if (ground === null && c.alpha !== 1) throw new PairError(`${c.id} is translucent (alpha ${c.alpha}); name the ground it sits on with "${c.path}${OVER}<color>"`);
    const flat = ground === null ? c.srgb : flatten([rgba(ground), rgba(c)]);
    return { color: { srgb: flat, alpha: 1 }, label: ground === null || c.id === ground.id ? `over ${c.path}` : `over ${c.path} on ${tb.ground ?? ''}`, id: c.id };
  });
}

/**
 * The bottom layers of a pair: the page, or every backdrop. A gradient backdrop contributes every point
 * glass may sit on, sampled as V1 samples (every stop plus SAMPLES_PER_SEGMENT points per segment, in both
 * interpolation spaces): a hue-shifting segment can be darker (or, in OKLab, lighter) between two stops
 * than at either, so the stops alone that ADR-0022 §3.3 names are not the extreme. A token backdrop
 * contributes each of its colors, flattened over its ground. Repeated colors count once.
 */
function bottoms(ctx: ContrastContext, pair: Pair): Bottom[] {
  if (pair.backdrops.length === 0) return [{ color: page(ctx), label: '' }];
  const out: Bottom[] = [];
  const seen = new Set<string>();
  for (const b of pair.backdrops) {
    if (b.startsWith('#')) {
      out.push({ color: hexToRgba(b), label: `over ${b}` });
      continue;
    }
    const tb = tokenBackdrop(b) ?? (isColorBackdrop(ctx, b) ? { colors: b, ground: null } : null);
    if (tb !== null) {
      for (const t of tokenBottoms(ctx, tb)) out.push({ color: t.color, label: t.label });
      continue;
    }
    for (const g of gradients(ctx, b)) {
      const stops: GradientStop[] = g.stops.map((s, i) => {
        if (s.color.alpha !== 1) throw new PairError(`${g.id} stop ${i} is translucent; a backdrop is the opaque bottom layer`);
        return { srgb: s.color.srgb, position: s.position };
      });
      for (const space of SPACES) {
        for (const s of sampleGradient(stops, space)) {
          const key = s.srgb.join(',');
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ color: { srgb: s.srgb, alpha: 1 }, label: `over ${g.id} ${s.stop === null ? `t=${s.t.toFixed(3)} ${space}` : `stop ${s.stop}`}` });
        }
      }
    }
  }
  return out;
}

/** Evaluates one pair in one context; throws PairError when a name does not resolve as needed. */
export function evaluatePair(pair: Pair, ctx: ContrastContext, env: Env): Evaluation {
  const fg = rgba(color(ctx, pair.fg));
  const key = thresholdKey(pair.tier, pair.minSizePx);
  const threshold = env.thresholds[key];
  let worst: { ratio: number; label: string; fg: Triple; bg: Triple } | null = null;
  let cases = 0;
  const consider = (bgFlat: Triple, label: string): void => {
    const fgFlat = fg.alpha < 1 ? over(fg, { srgb: bgFlat, alpha: 1 }).srgb : fg.srgb;
    const ratio = contrastRatio(fgFlat, bgFlat);
    cases++;
    if (worst === null || ratio < worst.ratio) worst = { ratio, label, fg: fgFlat, bg: bgFlat };
  };
  const chains: (readonly string[])[] = [];

  if (pair.stops !== null || pair.region !== null) {
    const bottom = page(ctx);
    for (const g of gradients(ctx, pair.bg)) {
      chains.push(g.aliasChain);
      const stops: GradientStop[] = g.stops.map((s) => ({ srgb: flatten([bottom, rgba(s.color)]), position: s.position }));
      for (const space of SPACES) {
        if (pair.stops === 'all') {
          for (const s of sampleGradient(stops, space)) consider(s.srgb, `${g.id} ${s.stop === null ? `t=${s.t.toFixed(3)}` : `stop ${s.stop}`} ${space}`);
          continue;
        }
        for (const geo of env.geometries(ctx)) {
          const interval = headerInterval(geo, g.angle ?? CSS_DEFAULT_ANGLE);
          const where = `${g.id} ${geo.width}×${geo.height} p${geo.padding} a${geo.action}`;
          for (const s of headerSamples(stops, interval, space)) consider(s.srgb, `${where} t=${s.t.toFixed(3)} ${space}`);
        }
      }
    }
  } else {
    const bg = rgba(color(ctx, pair.bg));
    const unders = pair.underlays.map((name) => ({ name, color: rgba(color(ctx, name)) }));
    for (const bottom of bottoms(ctx, pair)) {
      if (unders.length === 0) consider(flatten([bottom.color, bg]), bottom.label);
      for (const u of unders) consider(flatten([bottom.color, u.color, bg]), [bottom.label, `on ${u.name}`].filter((s) => s !== '').join(' '));
    }
  }

  const w = worst as { ratio: number; label: string; fg: Triple; bg: Triple } | null;
  if (w === null) throw new PairError('nothing to evaluate');
  return {
    pair,
    context: ctx,
    ratio: w.ratio,
    thresholdKey: key,
    threshold,
    pass: w.ratio + EPSILON >= threshold,
    worst: `${w.label === '' ? '' : `${w.label}: `}${hex(w.fg)} on ${hex(w.bg)}`,
    cases,
    gradients: chains,
  };
}

// ---- coverage checks ----

const TEXT_GLOB = 'sys.color.text.**';

function idsOrEmpty(bundle: IRBundle, name: string): readonly string[] {
  try {
    return lookup(bundle, name);
  } catch (e) {
    if (e instanceof LookupError) return [];
    throw e;
  }
}

/**
 * tokens/README.md rule 4: every sys.color.text.* declaration carries a11y.pairsWith, and every entry is
 * a pair of that token evaluated in the context the declaration wins in.
 */
export function pairsWithProblems(bundle: IRBundle, contexts: readonly ContrastContext[], pairs: readonly Pair[]): Problem[] {
  const out: Problem[] = [];
  const reported = new Set<string>();
  const ids = new Map<string, ReadonlySet<string>>();
  const idSet = (name: string): ReadonlySet<string> => {
    let s = ids.get(name);
    if (s === undefined) ids.set(name, (s = new Set(idsOrEmpty(bundle, name))));
    return s;
  };
  const sameTarget = (a: string, b: string): boolean => {
    if (a === b) return true;
    const x = idSet(a);
    const y = idSet(b);
    return x.size > 0 && x.size === y.size && [...x].every((id) => y.has(id));
  };
  const textIds = idsOrEmpty(bundle, TEXT_GLOB);
  for (const ctx of contexts) {
    const perm = bundle.permutations.get(ctx.permutation);
    if (perm === undefined) continue;
    for (const id of textIds) {
      const token = perm.tokens.get(id);
      if (token === undefined || token.type !== 'color') continue;
      const where = `${token.source.file}:${token.source.line} ${id}`;
      const list = token.metadata.a11y?.pairsWith;
      if (list === undefined || list.length === 0) {
        const key = `${where}|none`;
        if (!reported.has(key)) {
          reported.add(key);
          out.push({ where, message: 'declares no $extensions["app.prism"].a11y.pairsWith (tokens/README.md rule 4)' });
        }
        continue;
      }
      for (const entry of list) {
        const covered = pairs.some((p) => appliesTo(p, ctx) && idSet(p.fg).has(id) && sameTarget(p.bg, entry));
        const key = `${where}|${entry}|${ctx.scheme}`;
        if (covered || reported.has(key)) continue;
        reported.add(key);
        out.push({ where, message: `pairsWith "${entry}" has no pair in the pairs file for the ${ctx.scheme} scheme (tokens/README.md rule 4)` });
      }
    }
  }
  return out;
}

const VIVID_GLOB = 'ref.gradient.vivid.*';

/**
 * ADR-0022 §4.1 and rule 7: every ref.gradient.vivid.* gradient of every brand passes V1 and V2, so each
 * must be reached by a "stops": "all" pair and a "region": "card-header" pair in a context of its scheme.
 */
export function gradientCoverageProblems(bundle: IRBundle, contexts: readonly ContrastContext[], evaluations: readonly Evaluation[]): Problem[] {
  const required = idsOrEmpty(bundle, VIVID_GLOB);
  if (required.length === 0) return [];
  const out: Problem[] = [];
  const brands = [...new Set(contexts.map((c) => c.brand))];
  for (const brand of brands) {
    for (const check of ['stops', 'region'] as const) {
      const reached = new Set<string>();
      for (const e of evaluations) {
        if (e.context.brand !== brand || e.pair[check] === null) continue;
        for (const chain of e.gradients) for (const id of chain) reached.add(id);
      }
      for (const id of required) {
        if (reached.has(id)) continue;
        out.push({ where: brand === '' ? id : `${brand} ${id}`, message: `no ${check === 'stops' ? '"stops": "all" (V1)' : '"region": "card-header" (V2)'} pair reaches this gradient; every vivid gradient of every brand must pass V1 and V2 (ADR-0022 §4.1)` });
      }
    }
  }
  return out;
}
