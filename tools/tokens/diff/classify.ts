// Token change classification for `tokens:diff` (ARCHITECTURE §11, ADR-0024 §14): `diffBundles`
// compares two bundles built by the same tool code, `requiredBump` turns the changes into the semver
// bump they need under the strict or the shifted (0.x) policy. Pure functions of the two bundles.
//
// Tokens are matched by public path, so a token that becomes a group's `$root` keeps its identity.
// Permutations are matched by their inputs; a modifier that exists on one side only is read at the
// other side's default context, so the permutations both sides share are still compared.
import { BASE_SCHEMES, RUNTIME_AXES } from '../config.ts';
import { unionByPlatform } from '../ir/analyze.ts';
import { publicPath } from '../ir/naming.ts';
import { compareSegments } from '../ir/order.ts';
import type { IRBundle, IRToken, PermKey, PermutationIR, RuntimeAxis, TokenDeps, TokenType } from '../ir/types.ts';

export type Bump = 'patch' | 'minor' | 'major';
/** `strict` from 1.0 on; `shifted` while the base release tag is 0.x (ADR-0024 §14). */
export type Policy = 'strict' | 'shifted';
/**
 * Fields of a `meta-changed` change. `deprecated` (a changed or withdrawn deprecation message) extends
 * ARCHITECTURE §11's list; a new deprecation is the `deprecated` change itself.
 */
export type MetaField = 'description' | 'metadata' | 'alias' | 'deprecated';

export type TokenChange =
  | { readonly kind: 'removed'; readonly path: string; readonly type: TokenType; readonly level: 'major' }
  | { readonly kind: 'type-changed'; readonly path: string; readonly from: TokenType; readonly to: TokenType; readonly level: 'major' }
  | {
      readonly kind: 'axes-changed';
      readonly path: string;
      /** Runtime axes the value depends on, as the union over the platforms both sides have. */
      readonly from: readonly RuntimeAxis[];
      readonly to: readonly RuntimeAxis[];
      /** Present when the colorScheme variant dependencies changed ('increasedContrast:light', 'reducedTransparency:dark'). */
      readonly variants?: { readonly from: readonly string[]; readonly to: readonly string[] };
      /** Platform contexts whose generated shape changed; absent when the resolver has no platform modifier. */
      readonly platforms?: readonly string[];
      readonly level: 'major';
    }
  | { readonly kind: 'context-removed'; readonly modifier: string; readonly context: string; readonly level: 'major' }
  | { readonly kind: 'added'; readonly path: string; readonly type: TokenType; readonly level: 'minor' }
  | {
      readonly kind: 'value-changed';
      readonly path: string;
      /** Keys of the working-tree (`next`) permutations whose value changed, in canonical order. */
      readonly permutations: readonly PermKey[];
      /** How many permutations both sides share, for "n of m". */
      readonly compared: number;
      readonly level: 'minor';
    }
  | { readonly kind: 'deprecated'; readonly path: string; readonly message: string | null; readonly level: 'minor' }
  | { readonly kind: 'context-added'; readonly modifier: string; readonly context: string; readonly level: 'minor' }
  | { readonly kind: 'meta-changed'; readonly path: string; readonly fields: readonly MetaField[]; readonly level: 'patch' };

export type TokenChangeKind = TokenChange['kind'];

/** Most severe first; the tie-break order of changes at one path. */
export const KIND_ORDER: readonly TokenChangeKind[] = [
  'context-removed', 'context-added', 'removed', 'type-changed', 'axes-changed', 'added', 'value-changed', 'deprecated', 'meta-changed',
];

const RANK: Readonly<Record<Bump, number>> = { patch: 1, minor: 2, major: 3 };

/** Orders bumps: null (nothing) < patch < minor < major. */
export function compareBumps(a: Bump | null, b: Bump | null): number {
  return (a === null ? 0 : RANK[a]) - (b === null ? 0 : RANK[b]);
}

/** ADR-0024 §14: required major becomes minor, minor becomes patch, patch stays patch. */
export function shiftBump(bump: Bump): Bump {
  return bump === 'major' ? 'minor' : 'patch';
}

/** The policy for a base release whose major version is `major`: shifted while it is 0 (ADR-0024 §14). */
export function policyFor(major: number): Policy {
  return major === 0 ? 'shifted' : 'strict';
}

/** The bump the changes require: the highest level, shifted one down under `shifted`; null when nothing changed. */
export function requiredBump(changes: readonly TokenChange[], policy: Policy = 'strict'): Bump | null {
  let max: Bump | null = null;
  for (const c of changes) if (compareBumps(c.level, max) > 0) max = c.level;
  if (max === null) return null;
  return policy === 'shifted' ? shiftBump(max) : max;
}

// ---- value, alias and metadata equality ----

/**
 * Fields computed from the authored value (ARCHITECTURE §11, "value equality"): gamut-mapped and
 * encoded color forms, the px of a dimension (its value and unit stay), and Apple's bold weight.
 */
const DERIVED: Readonly<Record<string, readonly string[]>> = {
  color: ['hex', 'srgb', 'p3', 'oklch', 'inSrgb', 'inP3'],
  dimension: ['px'],
  typography: ['boldWeight'],
};

function kept(o: Record<string, unknown>): string[] {
  const drop = typeof o['kind'] === 'string' ? (DERIVED[o['kind']] ?? []) : [];
  return Object.keys(o).filter((k) => o[k] !== undefined && !drop.includes(k));
}

/** Structural equality of IR values (or metadata) without their derived fields; NaN equals NaN. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => sameValue(x, b[i]));
  }
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  const ka = kept(oa);
  const kb = kept(ob);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(ob, k) && sameValue(oa[k], ob[k]));
}

/** Same alias targets by public path, so `{x}` and `{x.$root}` of one token are the same target. */
function sameAlias(a: IRToken, b: IRToken): boolean {
  if ((a.aliasOf === null) !== (b.aliasOf === null)) return false;
  if (a.aliasOf !== null && b.aliasOf !== null && publicPath(a.aliasOf) !== publicPath(b.aliasOf)) return false;
  const ka = Object.keys(a.subAliases);
  const kb = Object.keys(b.subAliases);
  return ka.length === kb.length && ka.every((k) => {
    const x = a.subAliases[k];
    const y = b.subAliases[k];
    return x !== undefined && y !== undefined && publicPath(x) === publicPath(y);
  });
}

// ---- matching ----

interface Indexed {
  readonly id: string;
  readonly type: TokenType;
}

/** Public path → id and type, from one permutation (every permutation has the same ids, IR invariant 1). */
function indexPaths(bundle: IRBundle): Map<string, Indexed> {
  const out = new Map<string, Indexed>();
  const first = bundle.permutations.values().next().value;
  if (first === undefined) return out;
  for (const t of first.tokens.values()) out.set(t.path, { id: t.id, type: t.type });
  return out;
}

function modifierNames(prev: IRBundle, next: IRBundle): string[] {
  const names = next.model.modifiers.map((m) => m.name);
  for (const m of prev.model.modifiers) if (!names.includes(m.name)) names.push(m.name);
  return names;
}

/** Pairs of permutations with the same input; a modifier missing on one side counts as the other side's default. */
function pairPermutations(prev: IRBundle, next: IRBundle): [PermutationIR, PermutationIR][] {
  const names = modifierNames(prev, next);
  const prevDefaults = new Map(prev.model.modifiers.map((m) => [m.name, m.default]));
  const nextDefaults = new Map(next.model.modifiers.map((m) => [m.name, m.default]));
  const key = (input: Readonly<Record<string, string>>, fallback: ReadonlyMap<string, string>): string =>
    names.map((n) => `${n}=${input[n] ?? fallback.get(n) ?? ''}`).join('|');
  const byKey = new Map<string, PermutationIR>();
  for (const p of prev.permutations.values()) byKey.set(key(p.input, nextDefaults), p);
  const out: [PermutationIR, PermutationIR][] = [];
  for (const q of next.permutations.values()) {
    const p = byKey.get(key(q.input, prevDefaults));
    if (p !== undefined) out.push([p, q]);
  }
  return out;
}

// ---- shapes ----

const NO_DEPS: TokenDeps = { axes: [], increasedContrast: [], reducedTransparency: [] };

/** Platform ('' without a platform modifier) → public path → dependencies, as the generated APIs see them. */
function shapesOf(bundle: IRBundle): Map<string, Map<string, TokenDeps>> | null {
  if (!bundle.analysis.complete) return null;
  const out = new Map<string, Map<string, TokenDeps>>();
  for (const [platform, deps] of unionByPlatform(bundle.analysis)) {
    const byPath = new Map<string, TokenDeps>();
    for (const [id, d] of deps) byPath.set(publicPath(id), d);
    out.set(platform, byPath);
  }
  return out;
}

function variantsOf(d: TokenDeps): string[] {
  return [
    ...d.increasedContrast.map((s) => `increasedContrast:${s}`),
    ...d.reducedTransparency.map((s) => `reducedTransparency:${s}`),
  ];
}

function union(list: readonly TokenDeps[]): TokenDeps {
  const pick = <T extends string>(ref: readonly T[], get: (d: TokenDeps) => readonly T[]): T[] =>
    ref.filter((x) => list.some((d) => get(d).includes(x)));
  return {
    axes: pick(RUNTIME_AXES as readonly RuntimeAxis[], (d) => d.axes),
    increasedContrast: pick(BASE_SCHEMES, (d) => d.increasedContrast),
    reducedTransparency: pick(BASE_SCHEMES, (d) => d.reducedTransparency),
  };
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function sameDeps(a: TokenDeps, b: TokenDeps): boolean {
  return sameList(a.axes, b.axes) && sameList(a.increasedContrast, b.increasedContrast) && sameList(a.reducedTransparency, b.reducedTransparency);
}

// ---- ordering ----

function pathRank(path: string): number {
  return path.startsWith('ref.') ? 0 : path.startsWith('comp.') ? 2 : 1;
}

/** Public paths in the canonical order of §12: ref, then sys (no prefix), then comp; segments numerically where numeric. */
export function comparePaths(a: string, b: string): number {
  if (a === b) return 0;
  const r = pathRank(a) - pathRank(b);
  if (r !== 0) return r;
  const sa = a.split('.');
  const sb = b.split('.');
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const c = compareSegments(sa[i] ?? '', sb[i] ?? '');
    if (c !== 0) return c;
  }
  return sa.length - sb.length;
}

// ---- diff ----

/**
 * Every token change from `prev` (the base revision) to `next` (the working tree): context changes
 * first in modifier order, then token changes sorted by path, then kind (ARCHITECTURE §11).
 */
export function diffBundles(prev: IRBundle, next: IRBundle): readonly TokenChange[] {
  const contextChanges: TokenChange[] = [];
  for (const name of modifierNames(prev, next)) {
    const before = prev.model.modifiers.find((m) => m.name === name)?.contexts ?? [];
    const after = next.model.modifiers.find((m) => m.name === name)?.contexts ?? [];
    for (const c of before) if (!after.includes(c)) contextChanges.push({ kind: 'context-removed', modifier: name, context: c, level: 'major' });
    for (const c of after) if (!before.includes(c)) contextChanges.push({ kind: 'context-added', modifier: name, context: c, level: 'minor' });
  }

  const prevPaths = indexPaths(prev);
  const nextPaths = indexPaths(next);
  const pairs = pairPermutations(prev, next);
  const prevShapes = shapesOf(prev);
  const nextShapes = shapesOf(next);
  const platforms = prevShapes === null || nextShapes === null ? [] : [...nextShapes.keys()].filter((p) => prevShapes.has(p));

  const tokenChanges: TokenChange[] = [];
  for (const [path, a] of prevPaths) {
    if (!nextPaths.has(path)) tokenChanges.push({ kind: 'removed', path, type: a.type, level: 'major' });
  }
  for (const [path, b] of nextPaths) {
    const a = prevPaths.get(path);
    if (a === undefined) {
      tokenChanges.push({ kind: 'added', path, type: b.type, level: 'minor' });
      continue;
    }
    if (a.type !== b.type) {
      tokenChanges.push({ kind: 'type-changed', path, from: a.type, to: b.type, level: 'major' });
      continue;
    }

    const changed: PermKey[] = [];
    const fields = new Set<MetaField>();
    let aliasChanged = false;
    let deprecation: { message: string | null } | null = null;
    for (const [p, q] of pairs) {
      const ta = p.tokens.get(a.id);
      const tb = q.tokens.get(b.id);
      if (ta === undefined || tb === undefined) continue;
      if (!sameValue(ta.value, tb.value)) changed.push(q.key);
      if (ta.description !== tb.description) fields.add('description');
      if (!sameValue(ta.metadata, tb.metadata)) fields.add('metadata');
      if (!sameAlias(ta, tb)) aliasChanged = true;
      if (ta.deprecated === null && tb.deprecated !== null) deprecation ??= { message: typeof tb.deprecated === 'string' ? tb.deprecated : null };
      else if (ta.deprecated !== tb.deprecated) fields.add('deprecated');
    }

    if (platforms.length > 0 && prevShapes !== null && nextShapes !== null) {
      const at = (shapes: Map<string, Map<string, TokenDeps>>, platform: string): TokenDeps => shapes.get(platform)?.get(path) ?? NO_DEPS;
      const moved = platforms.filter((pl) => !sameDeps(at(prevShapes, pl), at(nextShapes, pl)));
      if (moved.length > 0) {
        const from = union(platforms.map((pl) => at(prevShapes, pl)));
        const to = union(platforms.map((pl) => at(nextShapes, pl)));
        const vFrom = variantsOf(from);
        const vTo = variantsOf(to);
        tokenChanges.push({
          kind: 'axes-changed',
          path,
          from: from.axes,
          to: to.axes,
          ...(sameList(vFrom, vTo) ? {} : { variants: { from: vFrom, to: vTo } }),
          ...(moved.length === 1 && moved[0] === '' ? {} : { platforms: moved }),
          level: 'major',
        });
      }
    }
    if (changed.length > 0) tokenChanges.push({ kind: 'value-changed', path, permutations: changed, compared: pairs.length, level: 'minor' });
    if (deprecation !== null) tokenChanges.push({ kind: 'deprecated', path, message: deprecation.message, level: 'minor' });
    // An alias retarget that keeps the resolved value everywhere is metadata (ARCHITECTURE §11).
    if (aliasChanged && changed.length === 0) fields.add('alias');
    if (fields.size > 0) {
      const order: readonly MetaField[] = ['description', 'metadata', 'alias', 'deprecated'];
      tokenChanges.push({ kind: 'meta-changed', path, fields: order.filter((f) => fields.has(f)), level: 'patch' });
    }
  }

  tokenChanges.sort((x, y) => comparePaths(pathOf(x), pathOf(y)) || KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind));
  return [...contextChanges, ...tokenChanges];
}

function pathOf(c: TokenChange): string {
  return 'path' in c ? c.path : '';
}
