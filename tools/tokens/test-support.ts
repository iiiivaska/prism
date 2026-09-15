// Shared helpers for the token pipeline's tests: fixture readers and the broken-fixture harness.
// Every `fixtures/broken/<case>/` tree is an overlay of `fixtures/valid/`: it holds only the files its
// defect touches, plus `fixture.json` with the description and the expected (code, token) pairs.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { collectBundle, type CollectResult } from './ir/bundle.ts';
import { fsReader, overlayReader, type SourceReader } from './source/reader.ts';

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));

export interface Expectation { readonly code: string; readonly tokenId?: string }
export interface BrokenCase {
  readonly name: string;
  readonly description: string;
  readonly expect: readonly Expectation[];
  readonly remove: readonly string[];
}

export function fixtureReader(name: string): SourceReader {
  return fsReader(`${FIXTURES}${name}`);
}

export function brokenCases(): BrokenCase[] {
  return readdirSync(`${FIXTURES}broken`, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const meta = JSON.parse(readFileSync(`${FIXTURES}broken/${name}/fixture.json`, 'utf8')) as {
        description: string; expect: Expectation[]; remove?: string[];
      };
      return { name, description: meta.description, expect: meta.expect, remove: meta.remove ?? [] };
    });
}

export function brokenReader(c: BrokenCase): SourceReader {
  return overlayReader(fixtureReader('valid'), fsReader(`${FIXTURES}broken/${c.name}`), c.remove);
}

/** Unique `code|tokenId` pairs, sorted. */
export function pairs(items: readonly Expectation[]): string[] {
  return [...new Set(items.map((d) => `${d.code}|${d.tokenId ?? ''}`))].sort();
}

export async function runBroken(c: BrokenCase): Promise<{ result: CollectResult; got: string[]; want: string[] }> {
  const result = await collectBundle({ reader: brokenReader(c) });
  return { result, got: pairs(result.diagnostics), want: pairs(c.expect) };
}

/** The broken cases whose name starts with one of the prefixes. */
export function casesWithPrefix(...prefixes: string[]): BrokenCase[] {
  return brokenCases().filter((c) => prefixes.some((p) => c.name.startsWith(p)));
}

// ---- Terrazzo oracle (ARCHITECTURE §14 P1-3, oracle.test.ts and repo.test.ts) ----

const round = (n: number): number => Math.round(n * 1e6) / 1e6;
type Json = unknown;

function durationMs(v: Record<string, unknown>): number {
  return round(v['unit'] === 's' ? Number(v['value']) * 1000 : Number(v['value']));
}

/** Terrazzo's resolved `$value` → the semantic projection shared with Prism's IR. */
export function projectTerrazzo(type: string, v: unknown, opts: { alpha: boolean; typeScaled: boolean }): Json {
  const o = v as Record<string, unknown>;
  const color = (c: unknown): Json => {
    const x = c as Record<string, unknown>;
    return { s: x['colorSpace'], c: (x['components'] as unknown[]).map((n) => (typeof n === 'number' ? round(n) : n)), ...(opts.alpha ? { a: round(Number(x['alpha'] ?? 1)) } : {}) };
  };
  const dim = (d: unknown): Json => ({ v: round(Number((d as Record<string, unknown>)['value'])), u: (d as Record<string, unknown>)['unit'] });
  switch (type) {
    case 'color': return color(v);
    case 'dimension': return dim(v);
    case 'duration': return durationMs(o);
    case 'number': return round(Number(v));
    case 'fontFamily': return Array.isArray(v) ? v : [v];
    case 'fontWeight': return v;
    case 'cubicBezier': return (v as number[]).map(round);
    case 'shadow': return (Array.isArray(v) ? v : [v]).map((l: Record<string, unknown>) => ({
      color: color(l['color']), x: dim(l['offsetX']), y: dim(l['offsetY']), blur: dim(l['blur']), spread: dim(l['spread']), inset: l['inset'] ?? false,
    }));
    case 'gradient': return (v as Record<string, unknown>[]).map((s) => ({ color: color(s['color']), position: round(Number(s['position'])) }));
    case 'typography': return {
      fontFamily: Array.isArray(o['fontFamily']) ? o['fontFamily'] : [o['fontFamily']],
      ...(opts.typeScaled ? {} : { fontSize: dim(o['fontSize']), letterSpacing: dim(o['letterSpacing']) }),
      lineHeight: round(Number(o['lineHeight'])),
    };
    case 'transition': return { duration: durationMs(o['duration'] as Record<string, unknown>), delay: durationMs(o['delay'] as Record<string, unknown>), timing: (o['timingFunction'] as number[]).map(round) };
    case 'strokeStyle': return typeof v === 'string' ? v : { dash: ((o['dashArray'] as unknown[]) ?? []).map(dim), cap: o['lineCap'] };
    case 'border': return { color: color(o['color']), width: dim(o['width']), style: o['style'] };
    default: return v;
  }
}

/** Prism's IR value → the same projection (derived fields, the weight rule and folded extensions excluded). */
export function projectPrism(value: import('./ir/types.ts').IRValue, opts: { alpha: boolean; typeScaled: boolean }): Json {
  const color = (c: import('./ir/types.ts').IRColor): Json => ({ s: c.space, c: c.components.map((n) => (typeof n === 'number' ? round(n) : n)), ...(opts.alpha ? { a: round(c.alpha) } : {}) });
  const dim = (d: import('./ir/types.ts').IRDimension): Json => ({ v: round(d.value), u: d.unit });
  switch (value.kind) {
    case 'color': return color(value);
    case 'dimension': return dim(value);
    case 'duration': return round(value.ms);
    case 'number': return round(value.value);
    case 'fontFamily': return value.families;
    case 'fontWeight': return value.weight;
    case 'cubicBezier': return value.points.map(round);
    case 'shadow': return value.layers.map((l) => ({ color: color(l.color), x: dim(l.offsetX), y: dim(l.offsetY), blur: dim(l.blur), spread: dim(l.spread), inset: l.inset }));
    case 'gradient': return value.stops.map((s) => ({ color: color(s.color), position: round(s.position) }));
    case 'typography': return {
      fontFamily: value.fontFamily.families,
      ...(opts.typeScaled ? {} : { fontSize: dim(value.fontSize), letterSpacing: dim(value.letterSpacing) }),
      lineHeight: round(value.lineHeight),
    };
    case 'transition': return { duration: round(value.duration.ms), delay: round(value.delay.ms), timing: value.timingFunction.points.map(round) };
    case 'strokeStyle': return value.keyword ?? { dash: value.dashArray.map(dim), cap: value.lineCap };
    case 'border': return { color: color(value.color), width: dim(value.width), style: value.style.keyword ?? value.style };
  }
}

export interface OracleResult { readonly inputs: number; readonly compared: number; readonly differences: readonly string[] }

export interface TerrazzoToken { readonly $type: string; readonly $value: unknown; readonly $description?: string; readonly $extensions?: unknown }
export interface TerrazzoResolver { apply(input: Record<string, string>): Record<string, TerrazzoToken> }

/** `@terrazzo/parser`'s resolver for `<root>/tokens/prism.resolver.json`. */
export async function terrazzoResolver(root: string): Promise<TerrazzoResolver> {
  const { parse, defineConfig } = await import('@terrazzo/parser');
  const { pathToFileURL } = await import('node:url');
  const base = pathToFileURL(root.endsWith('/') ? root : `${root}/`);
  const file = new URL('tokens/prism.resolver.json', base);
  const config = defineConfig({ tokens: [file.href], plugins: [] }, { cwd: base });
  const parsed = (await parse([{ filename: file, src: readFileSync(file, 'utf8') }], {
    config,
    req: (u: URL) => Promise.resolve(readFileSync(u, 'utf8')),
  })) as unknown as { resolver: TerrazzoResolver };
  return parsed.resolver;
}

/**
 * For the default permutation and every single-axis variation, compares Prism's IR with
 * `@terrazzo/parser`'s `resolver.apply(input)` after projecting both (ARCHITECTURE §14 P1-3).
 */
export async function terrazzoOracle(root: string, bundle: import('./ir/types.ts').IRBundle): Promise<OracleResult> {
  const resolver = await terrazzoResolver(root);
  const mods = bundle.model.modifiers;
  const defaults = Object.fromEntries(mods.map((m) => [m.name, m.default]));
  const inputs: Record<string, string>[] = [defaults];
  for (const m of mods) for (const c of m.contexts) if (c !== m.default) inputs.push({ ...defaults, [m.name]: c });
  const differences: string[] = [];
  let compared = 0;
  for (const input of inputs) {
    const key = mods.map((m) => `${m.name}=${input[m.name] ?? ''}`).join('|');
    const perm = bundle.permutations.get(key);
    if (perm === undefined) throw new Error(`no permutation ${key}`);
    const tz = resolver.apply(input);
    const scaleToken = perm.tokens.get('ref.type.scale');
    const typeScaled = scaleToken?.value.kind === 'number' && scaleToken.value.value !== 1;
    for (const [id, t] of perm.tokens) {
      const other = tz[id.endsWith('.$root') ? id.slice(0, -'.$root'.length) : id];
      if (other === undefined) {
        differences.push(`${key} ${id}: missing in Terrazzo`);
        continue;
      }
      // app.prism.alpha is Prism's own (ADR-0020 §3): skip alpha where it applies along the chain.
      let alpha = true;
      for (let cur: typeof t | undefined = t, n = 0; cur !== undefined && n < 32; cur = cur.aliasOf === null ? undefined : perm.tokens.get(cur.aliasOf), n++) {
        if (cur.alpha !== null) alpha = false;
      }
      const a = JSON.stringify(projectPrism(t.value, { alpha, typeScaled }));
      const b = JSON.stringify(projectTerrazzo(other.$type, other.$value, { alpha, typeScaled }));
      compared++;
      if (a !== b) differences.push(`${key} ${id}: prism ${a.slice(0, 160)} terrazzo ${b.slice(0, 160)}`);
    }
    for (const id of Object.keys(tz)) {
      if (!perm.tokens.has(id) && !perm.tokens.has(`${id}.$root`)) differences.push(`${key} ${id}: missing in Prism`);
    }
  }
  return { inputs: inputs.length, compared, differences };
}
