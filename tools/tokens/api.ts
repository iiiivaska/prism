// Stable programmatic API (ARCHITECTURE §10, §11) for tools/contrast (P1-6), tokens:diff (P1-7),
// tools/fonts (P1-8) and spec validation (P2-1). P1-7 adds gitReader, lastReleaseTag and the diff
// functions.
import { APPLE_PLATFORMS, BRAND_MODIFIER, COLOR_SCHEME_MODIFIER, PLATFORM_MODIFIER, PATHS, WEB_PLATFORM } from './config.ts';
import { REPO_ROOT, type BuildOptions } from './ir/bundle.ts';
import { lookupIds } from './ir/lookup.ts';
import { schemeOf } from './ir/typography.ts';
import type { IRBundle, IRColor, IRToken, PermKey, PermutationIR, Triple } from './ir/types.ts';
import { loadModel } from './source/model.ts';
import { fsReader } from './source/reader.ts';
import type { BrandMeta, ContextName } from './source/types.ts';

export { buildBundle, collectBundle, REPO_ROOT, type BuildOptions, type CollectResult } from './ir/bundle.ts';
export { over, flatten, relativeLuminance, contrastRatio, hexToRgba, type Rgba } from './ir/color-math.ts';
export { formatDiagnostics, formatDiagnosticsJson, TokenBuildError } from './ir/diagnostics.ts';
export { LookupError } from './ir/lookup.ts';
export { publicPath } from './ir/naming.ts';
export { unionShapes } from './ir/analyze.ts';
export { fsReader, memoryReader, overlayReader, type SourceReader } from './source/reader.ts';
export type * from './ir/types.ts';
export type { BrandFont, BrandMeta, ModifierInfo, SourceModel } from './source/types.ts';

const idCache = new WeakMap<IRBundle, Set<string>>();

function idsOf(bundle: IRBundle): Set<string> {
  let ids = idCache.get(bundle);
  if (ids === undefined) {
    ids = new Set(bundle.permutations.values().next().value?.tokens.keys() ?? []);
    idCache.set(bundle, ids);
  }
  return ids;
}

/**
 * Public name, id or glob → token ids. Tries, in order: exact id; sys.<name>; sys.<name>.$root;
 * comp.<name>; ref.<name>. A '*' segment matches one segment, '**' one or more (ADR-0024 §13.2).
 * Unknown names throw LookupError with the nearest public paths as suggestions.
 */
export function lookup(bundle: IRBundle, name: string): readonly string[] {
  return lookupIds(idsOf(bundle), name);
}

/** brand.json per brand context, without resolving anything (tools/fonts). */
export function brandMeta(opts: Pick<BuildOptions, 'root' | 'reader'> & { readonly resolver?: string } = {}): Promise<ReadonlyMap<string, BrandMeta>> {
  const reader = opts.reader ?? fsReader(opts.root ?? REPO_ROOT);
  const { model } = loadModel(reader, opts.resolver ?? PATHS.resolver);
  return Promise.resolve(model?.brands ?? new Map<string, BrandMeta>());
}

export interface ResolvedColor {
  readonly id: string;
  readonly path: string;
  readonly srgb: Triple;           // CSS-gamut-mapped, gamma-encoded sRGB: what WCAG and sRGB displays see
  readonly alpha: number;
  readonly p3: Triple;
  readonly hex: string;
  readonly aliasChain: readonly string[];   // ['sys.color.text.secondary', 'ref.color.neutral.600']
}

export interface ResolvedGradient {
  readonly id: string;
  readonly stops: readonly { readonly color: ResolvedColor; readonly position: number }[];
}

export interface ContrastContext {
  readonly brand: string;
  readonly colorScheme: ContextName;          // flattened resolver context, e.g. 'dark-increased-contrast'
  readonly scheme: 'light' | 'dark';
  readonly variant: 'none' | 'increasedContrast' | 'reducedTransparency';
  readonly permutation: PermKey;
  /** Name via lookup; must resolve to exactly one color token. */
  color(name: string): ResolvedColor;
  gradient(name: string): readonly ResolvedGradient[];
}

function aliasChain(perm: PermutationIR, token: IRToken): string[] {
  const out = [token.id];
  let t: IRToken | undefined = token;
  while (t?.aliasOf !== null && t?.aliasOf !== undefined && !out.includes(t.aliasOf)) {
    out.push(t.aliasOf);
    t = perm.tokens.get(t.aliasOf);
  }
  return out;
}

function resolved(perm: PermutationIR, token: IRToken, color: IRColor): ResolvedColor {
  return { id: token.id, path: token.path, srgb: color.srgb, alpha: color.alpha, p3: color.p3, hex: color.hex, aliasChain: aliasChain(perm, token) };
}

function modifierDefault(bundle: IRBundle, name: string): string | undefined {
  return bundle.model.modifiers.find((m) => m.name === name)?.default;
}

/**
 * brand × colorScheme (12 today) at platform=web and every other axis at its default. Throws when a
 * color depends on another runtime axis (from bundle.analysis) or differs between web and apple for
 * the same context.
 */
export function contrastContexts(bundle: IRBundle): readonly ContrastContext[] {
  const mods = bundle.model.modifiers;
  const brands = mods.find((m) => m.name === BRAND_MODIFIER)?.contexts ?? [''];
  const schemes = mods.find((m) => m.name === COLOR_SCHEME_MODIFIER)?.contexts ?? [];
  const hasPlatform = mods.some((m) => m.name === PLATFORM_MODIFIER);
  const keyOf = (overrides: Record<string, string>): PermKey =>
    mods.map((m) => `${m.name}=${overrides[m.name] ?? m.default}`).join('|');

  // Colors may vary by colorScheme only.
  for (const [scope, s] of bundle.analysis.scopes) {
    if (hasPlatform && s.input[PLATFORM_MODIFIER] !== WEB_PLATFORM) continue;
    for (const [id, deps] of s.deps) {
      const perm = bundle.permutations.get(keyOf({ ...s.input }));
      const t = perm?.tokens.get(id);
      if (t?.type !== 'color') continue;
      const other = deps.axes.filter((a) => a !== COLOR_SCHEME_MODIFIER);
      if (other.length > 0) throw new Error(`${id} depends on ${other.join(', ')} in ${scope}; contrast pairs need colors that vary by colorScheme only`);
    }
  }

  const out: ContrastContext[] = [];
  for (const brand of brands) {
    for (const colorScheme of schemes) {
      const overrides: Record<string, string> = { [COLOR_SCHEME_MODIFIER]: colorScheme };
      if (brand !== '') overrides[BRAND_MODIFIER] = brand;
      if (hasPlatform) overrides[PLATFORM_MODIFIER] = WEB_PLATFORM;
      const key = keyOf(overrides);
      const perm = bundle.permutations.get(key);
      if (perm === undefined) throw new Error(`permutation ${key} is not in the bundle`);
      if (hasPlatform) {
        for (const apple of APPLE_PLATFORMS.filter((p) => p === 'apple')) {
          const ap = bundle.permutations.get(keyOf({ ...overrides, [PLATFORM_MODIFIER]: apple }));
          if (ap === undefined) continue;
          for (const [id, t] of perm.tokens) {
            if (t.type !== 'color') continue;
            if (JSON.stringify(t.value) !== JSON.stringify(ap.tokens.get(id)?.value)) {
              throw new Error(`${id} differs between platform=web and platform=${apple} in ${key}; contrast is checked once for both`);
            }
          }
        }
      }
      const info = schemeOf(colorScheme);
      const pick = (name: string): IRToken[] => lookup(bundle, name).map((id) => perm.tokens.get(id)).filter((t): t is IRToken => t !== undefined);
      out.push({
        brand: brand === '' ? (modifierDefault(bundle, BRAND_MODIFIER) ?? '') : brand,
        colorScheme,
        scheme: info.base ?? 'light',
        variant: info.variant,
        permutation: key,
        color(name) {
          const hits = pick(name);
          const t = hits[0];
          if (hits.length !== 1 || t === undefined || t.value.kind !== 'color') {
            throw new Error(`"${name}" must resolve to exactly one color token, got ${hits.map((h) => `${h.id} (${h.type})`).join(', ') || 'nothing'}`);
          }
          return resolved(perm, t, t.value);
        },
        gradient(name) {
          return pick(name)
            .filter((t) => t.value.kind === 'gradient')
            .map((t) => {
              if (t.value.kind !== 'gradient') throw new Error('unreachable');
              return { id: t.id, stops: t.value.stops.map((s) => ({ color: resolved(perm, t, s.color), position: s.position })) };
            });
        },
      });
    }
  }
  return out;
}

