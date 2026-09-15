// IR analysis (ARCHITECTURE §5.7), per scope (the non-runtime modifiers: brand × platform) over the
// full product of runtime contexts: dependency axes, at most one runtime axis per token, the
// exhaustive composition proof, disjoint increased-contrast and reduced-transparency deltas, apple ↔
// watch color invariance, the motion policy (ADR-0023 §8.3) and the gradient scheme invariant
// (ADR-0024 §6). Values compare structurally (canonical JSON of the IR value).
import {
  BASE_SCHEMES, COLOR_SCHEME_MODIFIER, CROSSFADE_ID, DURATION_MAX_REDUCED_MS, EASING_SYS_PREFIX, GRADIENT_SYS_PREFIX,
  INTERACTIVE_SPRING_ID, MOTION_DEFAULT_CONTEXT, MOTION_MODIFIER, MOTION_REDUCED_CONTEXT, PLATFORM_MODIFIER, RUNTIME_AXES,
  SCHEME_VARIANT_SUFFIXES, SPRING_MAX_REDUCED_S,
} from '../config.ts';
import type { SourceModel } from '../source/types.ts';
import { error, type Diagnostic } from './diagnostics.ts';
import { matches } from './glob.ts';
import { compareIds } from './order.ts';
import { settleMs } from './spring.ts';
import { schemeOf } from './typography.ts';
import type {
  Analysis, Input, IRToken, PermKey, PermutationIR, RuntimeAxis, ScopeAnalysis, ScopeKey, TokenDeps,
} from './types.ts';

export interface AnalyzeResult { readonly analysis: Analysis; readonly diagnostics: Diagnostic[] }

function keyOf(model: SourceModel, input: Input): PermKey {
  return model.modifiers.map((m) => `${m.name}=${input[m.name] ?? ''}`).join('|');
}

export function scopeKeyOf(model: SourceModel, input: Input): ScopeKey {
  return model.modifiers
    .filter((m) => !(RUNTIME_AXES as readonly string[]).includes(m.name))
    .map((m) => `${m.name}=${input[m.name] ?? ''}`)
    .join('|');
}

class ValueKeys {
  private readonly cache = new Map<PermKey, Map<string, string>>();
  get(perm: PermutationIR, id: string): string | undefined {
    let m = this.cache.get(perm.key);
    if (m === undefined) {
      m = new Map();
      this.cache.set(perm.key, m);
    }
    let v = m.get(id);
    if (v === undefined) {
      const t = perm.tokens.get(id);
      if (t === undefined) return undefined;
      v = JSON.stringify(t.value);
      m.set(id, v);
    }
    return v;
  }
}

function chain(perm: PermutationIR, id: string): string {
  const out = [id];
  const seen = new Set([id]);
  let t = perm.tokens.get(id);
  while (t?.aliasOf !== null && t?.aliasOf !== undefined && !seen.has(t.aliasOf)) {
    out.push(t.aliasOf);
    seen.add(t.aliasOf);
    t = perm.tokens.get(t.aliasOf);
  }
  return out.join(' → ');
}

function at(t: IRToken, permutation: PermKey): { tokenId: string; file: string; line: number; permutation: PermKey } {
  return { tokenId: t.id, file: t.source.file, line: t.source.line, permutation };
}

export function analyze(perms: ReadonlyMap<PermKey, PermutationIR>, model: SourceModel): AnalyzeResult {
  const diagnostics: Diagnostic[] = [];
  const runtime = model.modifiers.filter((m) => (RUNTIME_AXES as readonly string[]).includes(m.name));
  const vk = new ValueKeys();
  const scopes = new Map<ScopeKey, ScopeAnalysis>();
  const byScope = new Map<ScopeKey, PermutationIR[]>();
  for (const p of perms.values()) {
    const s = scopeKeyOf(model, p.input);
    const list = byScope.get(s) ?? [];
    list.push(p);
    byScope.set(s, list);
  }
  const reported = new Set<string>();
  const report = (code: string, message: string, details: Parameters<typeof error>[2], dedupe: string): void => {
    if (reported.has(dedupe)) return;
    reported.add(dedupe);
    diagnostics.push(error(code, message, details));
  };

  for (const [scope, list] of byScope) {
    const first = list[0];
    if (first === undefined) continue;
    const defaults: Record<string, string> = { ...first.input };
    for (const m of runtime) defaults[m.name] = m.default;
    const def = perms.get(keyOf(model, defaults));
    if (def === undefined) continue;
    const single = (axis: string, context: string): PermutationIR | undefined => perms.get(keyOf(model, { ...defaults, [axis]: context }));
    const deps = new Map<string, TokenDeps>();
    const multi = new Set<string>();
    const schemeContexts = model.modifiers.find((m) => m.name === COLOR_SCHEME_MODIFIER)?.contexts ?? [];

    for (const id of def.tokens.keys()) {
      const base = vk.get(def, id);
      const axes: RuntimeAxis[] = [];
      for (const m of runtime) {
        for (const c of m.contexts) {
          if (c === m.default) continue;
          const p = single(m.name, c);
          if (p !== undefined && vk.get(p, id) !== base) {
            axes.push(m.name as RuntimeAxis);
            break;
          }
        }
      }
      const variantDeps = { increasedContrast: [] as ('light' | 'dark')[], reducedTransparency: [] as ('light' | 'dark')[] };
      for (const s of BASE_SCHEMES) {
        const sp = single(COLOR_SCHEME_MODIFIER, s);
        if (sp === undefined) continue;
        for (const [suffix, variant] of Object.entries(SCHEME_VARIANT_SUFFIXES)) {
          if (!schemeContexts.includes(`${s}${suffix}`)) continue;
          const vp = single(COLOR_SCHEME_MODIFIER, `${s}${suffix}`);
          if (vp !== undefined && vk.get(vp, id) !== vk.get(sp, id)) variantDeps[variant].push(s);
        }
      }
      deps.set(id, { axes, ...variantDeps });
      if (axes.length > 1) {
        multi.add(id);
        const t = def.tokens.get(id);
        if (t !== undefined) {
          report('analysis/multi-axis', `${id} depends on ${axes.join(' and ')} in ${scope || 'the only scope'}; a token varies along at most one runtime axis (chain: ${chain(def, id)})`, { ...at(t, def.key), hint: 'split the token or introduce an alias' }, `multi|${id}`);
        }
      }
    }

    // Exhaustive composition proof.
    let comparisons = 0;
    for (const p of list) {
      for (const id of def.tokens.keys()) {
        if (multi.has(id)) continue;
        const base = vk.get(def, id);
        let expected = base;
        for (const m of runtime) {
          const c = p.input[m.name];
          if (c === undefined || c === m.default) continue;
          const sp = single(m.name, c);
          const sv = sp === undefined ? undefined : vk.get(sp, id);
          if (sv !== undefined && sv !== base) expected = sv;
        }
        comparisons++;
        if (vk.get(p, id) !== expected) {
          const t = p.tokens.get(id);
          if (t !== undefined) {
            report('analysis/composition', `${id} in ${p.key} differs from the composition of its single-axis variations; one modifier re-points an alias to a token another modifier changes (chain: ${chain(p, id)})`, { ...at(t, p.key), hint: 'make the token depend on one axis: alias a token of the same modifier' }, `comp|${id}`);
          }
        }
      }
    }

    // Variant disjointness.
    for (const s of BASE_SCHEMES) {
      const ic = [...deps].filter(([, d]) => d.increasedContrast.includes(s)).map(([id]) => id);
      const rt = new Set([...deps].filter(([, d]) => d.reducedTransparency.includes(s)).map(([id]) => id));
      for (const id of ic) {
        if (!rt.has(id)) continue;
        const t = def.tokens.get(id);
        if (t !== undefined) report('analysis/variant-overlap', `${id} changes under both ${s}-increased-contrast and ${s}-reduced-transparency; the two deltas of a scheme must not touch the same id, so the preferences compose at runtime`, { ...at(t, def.key), hint: 'move the change to one of the two delta files' }, `overlap|${s}|${id}`);
      }
    }

    // Motion policy (ADR-0023 §8.3), at the scope's other defaults.
    const motion = model.modifiers.find((m) => m.name === MOTION_MODIFIER);
    if (motion !== undefined && motion.contexts.includes(MOTION_DEFAULT_CONTEXT) && motion.contexts.includes(MOTION_REDUCED_CONTEXT)) {
      const dp = single(MOTION_MODIFIER, MOTION_DEFAULT_CONTEXT);
      const rp = single(MOTION_MODIFIER, MOTION_REDUCED_CONTEXT);
      if (dp !== undefined && rp !== undefined) motionPolicy(dp, rp, (code, message, t, key) => report(code, message, { ...at(t, rp.key), hint: 'fix the reduced value (ADR-0023 §8.2)' }, key));
    }
    scopes.set(scope, { input: defaults, deps, proof: { permutations: list.length, comparisons } });
  }

  // Platform invariance (Swift): colors never differ between apple and watch.
  for (const p of perms.values()) {
    if (p.input[PLATFORM_MODIFIER] !== 'apple') continue;
    const q = perms.get(keyOf(model, { ...p.input, [PLATFORM_MODIFIER]: 'watch' }));
    if (q === undefined) continue;
    for (const [id, t] of p.tokens) {
      if (t.type !== 'color') continue;
      if (vk.get(p, id) !== vk.get(q, id)) {
        report('analysis/platform-color', `${id} differs between platform=apple and platform=watch; the catalog carries one watch entry per colorset, so colors are platform-invariant (ARCHITECTURE §5.7 item 5)`, at(t, q.key), `platform|${id}`);
      }
    }
  }

  // Gradient schemes (ADR-0024 §6): sys.gradient.* resolves to a gradient of the permutation's base scheme.
  for (const p of perms.values()) {
    const scheme = schemeOf(p.input[COLOR_SCHEME_MODIFIER]).base;
    if (scheme === null) continue;
    for (const [id, t] of p.tokens) {
      if (!matches(`${GRADIENT_SYS_PREFIX}.**`, id) || t.value.kind !== 'gradient') continue;
      if (t.value.scheme !== scheme) {
        report('gradient/scheme-mismatch', `${id} resolves to a ${t.value.scheme ?? 'scheme-less'} gradient in the ${scheme} scheme (${p.key}); every sys.gradient.* token resolves to a gradient of its base scheme (ADR-0024 §6)`, { ...at(t, p.key), hint: `alias a ${scheme} ref.gradient.vivid.* gradient in the ${scheme} scheme file` }, `gradient|${id}|${scheme}`);
      }
    }
  }

  // Union shapes (ADR-0020 §6–§7): the union over brands must still vary along one runtime axis.
  const analysis: Analysis = { scopes, complete: true };
  for (const [platform, union] of unionByPlatform(analysis)) {
    for (const [id, d] of union) {
      if (d.axes.length <= 1) continue;
      const any = [...scopes.values()].map((s) => s.deps.get(id)).find((x) => x !== undefined && x.axes.length <= 1);
      if (any === undefined) continue;   // already reported per scope
      const p = perms.values().next().value;
      const t = p?.tokens.get(id);
      if (t !== undefined && p !== undefined) {
        report('analysis/multi-axis', `${id} depends on ${d.axes.join(' and ')} across the brands of platform=${platform || '(none)'}; generated API shapes are the union over brands, which must vary along one runtime axis (ADR-0020 §7)`, { ...at(t, p.key), hint: 'make every brand vary the token along the same axis' }, `union|${platform}|${id}`);
      }
    }
  }
  return { analysis, diagnostics };
}

type Reporter = (code: string, message: string, token: IRToken, key: string) => void;

function motionPolicy(dp: PermutationIR, rp: PermutationIR, report: Reporter): void {
  for (const [id, r] of rp.tokens) {
    if (r.tier === 'ref') continue;
    const d = dp.tokens.get(id);
    if (d === undefined) continue;
    if (r.value.kind === 'transition' && r.value.spring !== null) {
      const rs = r.value.spring;
      const ds = d.value.kind === 'transition' ? d.value.spring : null;
      if (rs.bounce !== 0) report('motion/reduced-policy', `${id} has bounce ${rs.bounce} under Reduce Motion; every reduced spring has bounce 0 (ADR-0023 §8.3)`, r, `motion|${id}|bounce`);
      const maxDuration = Math.min(ds?.duration ?? SPRING_MAX_REDUCED_S, SPRING_MAX_REDUCED_S);
      if (rs.duration > maxDuration) report('motion/reduced-policy', `${id} has spring duration ${rs.duration} s under Reduce Motion; the limit is min(default ${ds?.duration ?? '—'} s, ${SPRING_MAX_REDUCED_S} s) (ADR-0023 §8.3)`, r, `motion|${id}|duration`);
      if (ds !== null) {
        const rSettle = settleMs(rs.duration, rs.bounce);
        const dSettle = settleMs(ds.duration, ds.bounce);
        if (rSettle > dSettle) report('motion/reduced-policy', `${id} settles in ${rSettle} ms under Reduce Motion, longer than its default ${dSettle} ms (ADR-0023 §8.3)`, r, `motion|${id}|settle`);
      }
    }
    if (r.value.kind === 'duration' && d.value.kind === 'duration') {
      const limit = Math.min(d.value.ms, DURATION_MAX_REDUCED_MS);
      if (r.value.ms > limit) report('motion/reduced-policy', `${id} is ${r.value.ms} ms under Reduce Motion; the limit is min(default ${d.value.ms} ms, ${DURATION_MAX_REDUCED_MS} ms) (ADR-0023 §8.3)`, r, `motion|${id}|ms`);
    }
    if (id === CROSSFADE_ID) {
      const dv = d.value.kind === 'number' ? d.value.value : null;
      const rv = r.value.kind === 'number' ? r.value.value : null;
      if (dv !== 0 || rv !== 1) report('motion/reduced-policy', `${CROSSFADE_ID} is ${String(dv)} by default and ${String(rv)} under Reduce Motion; it must be 0 and 1 (ADR-0023 §8.3)`, r, `motion|${id}|crossfade`);
    }
    if ((id === INTERACTIVE_SPRING_ID || matches(`${EASING_SYS_PREFIX}.**`, id)) && JSON.stringify(r.value) !== JSON.stringify(d.value)) {
      report('motion/reduced-policy', `${id} differs between the default and reduced motion contexts; it is identical in both (ADR-0023 §8.3)`, r, `motion|${id}|identical`);
    }
  }
}

/** Union of the dependencies over the scopes of each platform context ('' when there is no platform modifier). */
export function unionByPlatform(analysis: Analysis): Map<string, Map<string, TokenDeps>> {
  const out = new Map<string, Map<string, TokenDeps>>();
  for (const s of analysis.scopes.values()) {
    const platform = s.input[PLATFORM_MODIFIER] ?? '';
    const m = out.get(platform) ?? new Map<string, TokenDeps>();
    for (const [id, d] of s.deps) {
      const prev = m.get(id);
      m.set(id, prev === undefined ? d : unionDeps(prev, d));
    }
    out.set(platform, m);
  }
  return out;
}

function unionDeps(a: TokenDeps, b: TokenDeps): TokenDeps {
  const order = <T extends string>(xs: readonly T[], ref: readonly T[]): T[] => ref.filter((x) => xs.includes(x));
  return {
    axes: order([...a.axes, ...b.axes], RUNTIME_AXES as readonly RuntimeAxis[]),
    increasedContrast: order([...a.increasedContrast, ...b.increasedContrast], BASE_SCHEMES),
    reducedTransparency: order([...a.reducedTransparency, ...b.reducedTransparency], BASE_SCHEMES),
  };
}

/**
 * Generated API shapes (ADR-0020 §6–§7): the dependencies of every token as the union over the
 * scopes whose platform is in `platforms` (all scopes when omitted), sorted by id.
 */
export function unionShapes(analysis: Analysis, platforms?: readonly string[]): Map<string, TokenDeps> {
  const out = new Map<string, TokenDeps>();
  for (const s of analysis.scopes.values()) {
    const platform = s.input[PLATFORM_MODIFIER];
    if (platforms !== undefined && (platform === undefined || !platforms.includes(platform))) continue;
    for (const [id, d] of s.deps) {
      const prev = out.get(id);
      out.set(id, prev === undefined ? d : unionDeps(prev, d));
    }
  }
  return new Map([...out].sort((a, b) => compareIds(a[0], b[0])));
}
