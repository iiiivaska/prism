// The web slice of the bundle (ARCHITECTURE §2): one scope per brand at platform=web, holding every
// runtime combination of the resolver (colorScheme with its variant contexts × density × modality ×
// motion: 72 permutations per brand today), indexed so that formats and the checks can vary one axis
// at a time. `WEB_RUNTIME` (config.ts) maps web values to resolver contexts; formats spell no
// attribute, value or query themselves (ADR-0019 rule 1).
import {
  BASE_SCHEMES, BRAND_MODIFIER, COLOR_SCHEME_MODIFIER, MOTION_CSS_PREFIXES, MOTION_CSS_TYPES, PLATFORM_MODIFIER,
  RUNTIME_AXES, WEB_EXCLUDED, WEB_PLATFORM, WEB_RUNTIME, type WebRuntimeAxis,
} from '../../config.ts';
import { matchesAny } from '../../ir/glob.ts';
import type { IRBundle, IRToken, PermutationIR, TokenDeps } from '../../ir/types.ts';
import type { ModifierInfo } from '../../source/types.ts';
import { unionShapes } from '../../ir/analyze.ts';

/** The brand name of a model without a brand modifier (fixtures). */
export const SINGLE_BRAND = 'default';

/** A runtime modifier of the resolver with its WEB_RUNTIME row (colorScheme, density, modality, motion). */
export interface WebAxis {
  /** The WEB_RUNTIME key, equal to the modifier name. */
  readonly axis: string;
  readonly modifier: ModifierInfo;
  readonly runtime: WebRuntimeAxis;
  /** Web value → resolver context, for the values whose context exists, in WEB_RUNTIME order. */
  readonly contexts: ReadonlyMap<string, string>;
}

/** A colorScheme variant (contrast, transparency) with the base schemes it has a context for. */
export interface WebVariant {
  readonly axis: string;
  readonly runtime: WebRuntimeAxis;
  readonly suffix: string;
  /** Base scheme web value → the variant's resolver context (`light` → `light-increased-contrast`). */
  readonly contexts: ReadonlyMap<string, string>;
}

export interface WebScope {
  readonly brand: string;
  /** The runtime modifiers present, in resolutionOrder order. */
  readonly axes: readonly WebAxis[];
  readonly variants: readonly WebVariant[];
  /** Every runtime combination: the product of the runtime modifiers' contexts in resolutionOrder order. */
  readonly perms: readonly PermutationIR[];
  /** Resolver context per runtime modifier of each permutation (parallel to `perms`). */
  readonly inputs: readonly Readonly<Record<string, string>>[];
  readonly defaults: Readonly<Record<string, string>>;
  readonly defaultIndex: number;
  /** Token ids in canonical order. */
  readonly ids: readonly string[];
  /** The permutation index of a runtime input (modifier name → context); missing modifiers take their default. */
  index(input: Readonly<Record<string, string>>): number;
  /** Index of the single-axis variation `modifier := context` from the defaults. */
  single(modifier: string, context: string): number;
}

export function brandsOf(bundle: IRBundle): readonly string[] {
  const m = bundle.model.modifiers.find((x) => x.name === BRAND_MODIFIER);
  return m === undefined ? [SINGLE_BRAND] : m.contexts;
}

/** The resolver's default brand (the files behind `./tokens.css` and `./tokens`, ADR-0020 §6). */
export function defaultBrand(bundle: IRBundle): string {
  return bundle.model.modifiers.find((x) => x.name === BRAND_MODIFIER)?.default ?? SINGLE_BRAND;
}

const scopeCache = new WeakMap<IRBundle, Map<string, WebScope>>();

export function webScope(bundle: IRBundle, brand: string): WebScope {
  let byBrand = scopeCache.get(bundle);
  if (byBrand === undefined) {
    byBrand = new Map();
    scopeCache.set(bundle, byBrand);
  }
  const hit = byBrand.get(brand);
  if (hit !== undefined) return hit;
  const scope = buildScope(bundle, brand);
  byBrand.set(brand, scope);
  return scope;
}

export function webScopes(bundle: IRBundle): WebScope[] {
  return brandsOf(bundle).map((b) => webScope(bundle, b));
}

function buildScope(bundle: IRBundle, brand: string): WebScope {
  const mods = bundle.model.modifiers;
  const runtimeMods = mods.filter((m) => (RUNTIME_AXES as readonly string[]).includes(m.name));
  const axes: WebAxis[] = [];
  for (const m of runtimeMods) {
    const runtime = WEB_RUNTIME[m.name];
    if (runtime === undefined || !('modifier' in runtime.resolver)) continue;
    const contexts = new Map<string, string>();
    for (const v of runtime.values) {
      const c = runtime.resolver.contexts[v];
      if (c !== undefined && m.contexts.includes(c)) contexts.set(v, c);
    }
    axes.push({ axis: m.name, modifier: m, runtime, contexts });
  }
  const scheme = axes.find((a) => a.axis === COLOR_SCHEME_MODIFIER);
  const variants: WebVariant[] = [];
  for (const [axis, runtime] of Object.entries(WEB_RUNTIME)) {
    if (!('variant' in runtime.resolver) || scheme === undefined) continue;
    const contexts = new Map<string, string>();
    for (const [value, base] of scheme.contexts) {
      const c = `${base}${runtime.resolver.suffix}`;
      if (scheme.modifier.contexts.includes(c)) contexts.set(value, c);
    }
    if (contexts.size > 0) variants.push({ axis, runtime, suffix: runtime.resolver.suffix, contexts });
  }

  const fixed: Record<string, string> = {};
  for (const m of mods) {
    if (m.name === BRAND_MODIFIER) fixed[m.name] = brand;
    else if (m.name === PLATFORM_MODIFIER) fixed[m.name] = WEB_PLATFORM;
    else if (!runtimeMods.includes(m)) fixed[m.name] = m.default;
  }
  const keyOf = (input: Readonly<Record<string, string>>): string => mods.map((m) => `${m.name}=${fixed[m.name] ?? input[m.name] ?? m.default}`).join('|');

  const inputs: Record<string, string>[] = [{}];
  for (const m of runtimeMods) {
    const next: Record<string, string>[] = [];
    for (const prefix of inputs) for (const c of m.contexts) next.push({ ...prefix, [m.name]: c });
    inputs.splice(0, inputs.length, ...next);
  }
  const perms = inputs.map((input) => {
    const p = bundle.permutations.get(keyOf(input));
    if (p === undefined) throw new Error(`permutation ${keyOf(input)} is not in the bundle; the web formats need the full product`);
    return p;
  });
  const radix = runtimeMods.map((m) => m.contexts.length);
  const index = (input: Readonly<Record<string, string>>): number => {
    let i = 0;
    runtimeMods.forEach((m, k) => {
      const c = input[m.name] ?? m.default;
      const pos = m.contexts.indexOf(c);
      if (pos < 0) throw new Error(`unknown context ${m.name}=${c}`);
      i = i * (radix[k] ?? 1) + pos;
    });
    return i;
  };
  const defaults: Record<string, string> = {};
  for (const m of runtimeMods) defaults[m.name] = m.default;
  const defaultIndex = index(defaults);
  const ids = [...(perms[defaultIndex]?.tokens.keys() ?? [])];
  return {
    brand, axes, variants, perms, inputs, defaults, defaultIndex, ids, index,
    single: (modifier, context) => index({ ...defaults, [modifier]: context }),
  };
}

/** The token as it resolves in a permutation; throws when the id is missing (IR invariant 1 guarantees it is not). */
export function tokenAt(perm: PermutationIR, id: string): IRToken {
  const t = perm.tokens.get(id);
  if (t === undefined) throw new Error(`${id} is missing from ${perm.key}`);
  return t;
}

/** Whether a token is emitted by the web outputs at all (ADR-0020 §5: never `ref.font.apple.*`). */
export function isWebToken(id: string): boolean {
  return !matchesAny(WEB_EXCLUDED, id);
}

/** Whether a token goes to motion.css (ARCHITECTURE §9.2): durations, cubic Béziers, transitions and every `ref.motion`/`sys.motion` token. */
export function isMotionToken(id: string, type: string): boolean {
  return MOTION_CSS_TYPES.includes(type) || matchesAny(MOTION_CSS_PREFIXES, id);
}

/** Generated shapes are the union over the brands of the web platform (ADR-0020 §6). */
export function webShapes(bundle: IRBundle): Map<string, TokenDeps> {
  const hasPlatform = bundle.model.modifiers.some((m) => m.name === PLATFORM_MODIFIER);
  return unionShapes(bundle.analysis, hasPlatform ? [WEB_PLATFORM] : undefined);
}

/** The base scheme web values of the colorScheme axis that have a context (light, dark). */
export function baseSchemes(scope: WebScope): string[] {
  const scheme = scope.axes.find((a) => a.axis === COLOR_SCHEME_MODIFIER);
  return scheme === undefined ? [] : [...scheme.contexts.keys()].filter((v) => (BASE_SCHEMES as readonly string[]).includes(v));
}

// ---- selectors from WEB_RUNTIME (ADR-0019 §1 rule 2) ----

export function attr(runtime: WebRuntimeAxis, value: string): string {
  return `[${runtime.attribute}="${value}"]`;
}

/** Every valid value, for `:not(…)`: `[a="x"], [a="y"]`. Never `:not([a])` (ADR-0019 rule 2). */
export function validList(runtime: WebRuntimeAxis): string {
  return runtime.values.map((v) => attr(runtime, v)).join(', ');
}

export function notValid(runtime: WebRuntimeAxis): string {
  return `:not(${validList(runtime)})`;
}

/** `not all and <q>` ↔ `<q>`: the media condition under which the fallback does not select its value. */
export function negateQuery(query: string): string {
  const NOT = 'not all and ';
  return query.startsWith(NOT) ? query.slice(NOT.length) : `${NOT}${query}`;
}

/**
 * The media condition under which an axis with no valid attribute resolves to `value`. Without a
 * valid attribute an axis takes its media value where the query matches and its default (first value)
 * elsewhere, so: the query for the media value, its negation for the default, null for any other value
 * (one only an attribute selects, such as density `comfortable`).
 */
export function mediaFor(runtime: WebRuntimeAxis, value: string): string | null {
  if (value === runtime.media.value) return runtime.media.query;
  return value === runtime.values[0] ? negateQuery(runtime.media.query) : null;
}
