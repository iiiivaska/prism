// buildBundle (ARCHITECTURE §3.1, §10): source model → source checks → one Style Dictionary run per
// distinct document stack, strictly sequential, and the IR of every permutation (§6) → IR invariants
// (§4.2) → typography checks → analysis → IRBundle.
// Every stage reports all it finds, so one run lists every defect; only structural source errors
// (the resolver or a document cannot be read as intended) stop before Style Dictionary.
import { fileURLToPath } from 'node:url';
import { PATHS, TYPE_ROLE_PREFIX } from '../config.ts';
import type { TransformedToken } from 'style-dictionary/types';
import { finishPermutation, resolveTokens } from '../engine/sd.ts';
import { defaultInput, enumerate, layersFor, merge, permKey, type Filter } from '../resolver.ts';
import { analyzeSource } from '../source/analyze.ts';
import { loadModel } from '../source/model.ts';
import { fsReader, type SourceReader } from '../source/reader.ts';
import type { ContextName, ModifierName, SourceModel } from '../source/types.ts';
import { analyze } from './analyze.ts';
import { dedupeDiagnostics, error, hasErrors, sortDiagnostics, TokenBuildError, type Diagnostic } from './diagnostics.ts';
import { matches } from './glob.ts';
import { publicPath } from './naming.ts';
import type { IRBundle, PermKey, PermutationIR } from './types.ts';
import { checkTypography } from './typography.ts';

export interface BuildOptions {
  /** Repository root; default: resolved from this module's location. */
  readonly root?: string;
  /** fsReader(root) by default; gitReader(ref) for diffs (P1-7); memory or overlay readers in tests. */
  readonly reader?: SourceReader;
  /** Repository-relative resolver path; default 'tokens/prism.resolver.json'. */
  readonly resolver?: string;
  /** Narrows the product (tests, contrast); the analysis then covers no scope. */
  readonly filter?: Partial<Record<ModifierName, readonly ContextName[]>>;
}

export interface CollectResult {
  readonly model: SourceModel | null;
  /** Null when any error was found. */
  readonly bundle: IRBundle | null;
  /** Sorted and de-duplicated. */
  readonly diagnostics: readonly Diagnostic[];
}

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Source codes whose token is missing from some permutations by construction. */
const PARTIAL_CODES = new Set(['completeness/missing', 'brand/unknown-path']);

/** Source errors after which a Style Dictionary run would only add noise. */
const STRUCTURAL = new Set([
  'source/parse', 'source/missing-file', 'source/outside-root', 'source/export-path', 'source/structure',
  'resolver/structure', 'resolver/inline-order', 'resolver/order', 'resolver/set-cycle', 'resolver/modifier-reference',
  'resolver/unsupported-source', 'ref/json-pointer', 'type/unknown',
  // An app.prism value the schema rejects cannot be folded meaningfully.
  'extension/schema',
]);

export async function collectBundle(opts: BuildOptions = {}): Promise<CollectResult> {
  const reader = opts.reader ?? fsReader(opts.root ?? REPO_ROOT);
  const loaded = loadModel(reader, opts.resolver ?? PATHS.resolver);
  const diagnostics: Diagnostic[] = [...loaded.diagnostics];
  const model = loaded.model;
  const finish = (bundle: IRBundle | null): CollectResult => {
    const all = sortDiagnostics(dedupeDiagnostics(diagnostics));
    return { model, bundle: hasErrors(all) ? null : bundle, diagnostics: all };
  };
  if (model === null) return finish(null);
  diagnostics.push(...analyzeSource(model));
  if (diagnostics.some((d) => STRUCTURAL.has(d.code))) return finish(null);

  const filter: Filter | undefined = opts.filter;
  const perms = new Map<PermKey, PermutationIR>();
  // Permutations that apply the same documents in the same order (`watch` = [apple], a
  // reduced-transparency context = [its base file]) merge to the same tree, so Style Dictionary's
  // output is shared; the IR is still built per permutation (provenance, the weight rule).
  const resolved = new Map<string, readonly TransformedToken[] | null>();
  let failed = false;
  for (const input of enumerate(model, filter)) {
    const key = permKey(model, input);
    const merged = merge(model, input);
    if (merged.diagnostics.length > 0) {
      diagnostics.push(...merged.diagnostics.map((d) => ({ ...d, permutation: key })));
      failed = true;
      continue;
    }
    const meta = { key, input, model, provenance: merged.provenance, diagnostics: [] };
    const stack = layersFor(model, input).map((l) => l.doc.file).join('\n');
    try {
      let tokens = resolved.get(stack);
      if (tokens === undefined) {
        resolved.set(stack, null);   // stays null when the run throws: its diagnostics are already recorded
        tokens = await resolveTokens(merged.tree, meta);
        resolved.set(stack, tokens);
      }
      if (tokens === null) {
        failed = true;
        continue;
      }
      perms.set(key, finishPermutation(tokens, meta));
    } catch (e) {
      if (!(e instanceof TokenBuildError)) throw e;
      diagnostics.push(...e.diagnostics);
      failed = true;
    }
  }
  if (failed) return finish(null);

  // Ids a source check already reported as missing from some contexts or brands (context
  // completeness, brand/unknown-path) differ between permutations by construction; IR invariant 1
  // would only repeat them, and the analysis needs identical id sets.
  const partial = new Set(diagnostics.filter((d) => PARTIAL_CODES.has(d.code) && d.tokenId !== undefined).map((d) => d.tokenId ?? ''));
  const invariants = checkInvariants(model, perms, partial);
  diagnostics.push(...invariants);
  const list = [...perms.values()];
  diagnostics.push(...checkTypography(list, model));
  let analysis: IRBundle['analysis'] = { scopes: new Map(), complete: false };
  const idSetsDiffer = partial.size > 0 || invariants.some((d) => d.code === 'ir/token-set');
  if (filter === undefined && !idSetsDiffer) {
    const result = analyze(perms, model);
    analysis = result.analysis;
    diagnostics.push(...result.diagnostics);
  }
  const bundle: IRBundle = {
    model: { name: model.name, modifiers: model.modifiers },
    brands: model.brands,
    permutations: perms,
    analysis,
  };
  return finish(bundle);
}

/** Builds the bundle; throws TokenBuildError with every diagnostic when anything fails. */
export async function buildBundle(opts: BuildOptions = {}): Promise<IRBundle> {
  const result = await collectBundle(opts);
  if (result.bundle === null) throw new TokenBuildError(result.diagnostics);
  return result.bundle;
}

/** IR invariants 1, 3, 5 and 6 (§4.2) and the opacity half of color/alpha-target (ADR-0020 §3). */
export function checkInvariants(model: SourceModel, perms: ReadonlyMap<PermKey, PermutationIR>, skip: ReadonlySet<string> = new Set()): Diagnostic[] {
  const out: Diagnostic[] = [];
  const reported = new Set<string>();
  const once = (key: string, d: Diagnostic): void => {
    if (reported.has(key)) return;
    reported.add(key);
    out.push(d);
  };
  const reference = perms.get(permKey(model, defaultInput(model))) ?? perms.values().next().value;
  if (reference === undefined) return out;

  // 1. the same ids with the same types everywhere
  for (const p of perms.values()) {
    for (const [id, t] of reference.tokens) {
      if (skip.has(id)) continue;
      const other = p.tokens.get(id);
      if (other === undefined) {
        once(`set|${id}`, error('ir/token-set', `${id} exists in ${reference.key} but not in ${p.key}; every permutation has the same ids`, { tokenId: id, file: t.source.file, line: t.source.line, permutation: p.key }));
      } else if (other.type !== t.type) {
        once(`type|${id}`, error('ir/type-mismatch', `${id} is ${t.type} in ${reference.key} but ${other.type} in ${p.key}`, { tokenId: id, file: other.source.file, line: other.source.line, permutation: p.key }));
      }
    }
    for (const [id, t] of p.tokens) {
      if (!reference.tokens.has(id) && !skip.has(id)) once(`set|${id}`, error('ir/token-set', `${id} exists in ${p.key} but not in ${reference.key}; every permutation has the same ids`, { tokenId: id, file: t.source.file, line: t.source.line, permutation: p.key }));
    }
  }

  // 3. unique public paths; no sys category named ref or comp
  const paths = new Map<string, string>();
  for (const id of reference.tokens.keys()) {
    const path = publicPath(id);
    const prev = paths.get(path);
    const t = reference.tokens.get(id);
    if (prev !== undefined && t !== undefined) {
      once(`path|${path}`, error('naming/path-collision', `${prev} and ${id} share the public path ${path}`, { tokenId: id, file: t.source.file, line: t.source.line }));
    }
    paths.set(path, id);
    if (t !== undefined && (matches('sys.ref.**', id) || matches('sys.comp.**', id))) {
      once(`reserved|${id}`, error('naming/reserved-category', `${id}: no sys category is named ref or comp, because public paths drop sys.`, { tokenId: id, file: t.source.file, line: t.source.line }));
    }
  }

  for (const p of perms.values()) {
    for (const [id, t] of p.tokens) {
      // 5. a number token has the same flag in every permutation
      const r = reference.tokens.get(id);
      if (t.value.kind === 'number' && r?.value.kind === 'number' && t.value.flag !== r.value.flag) {
        const flagged = t.value.flag ? p.key : reference.key;
        const plain = t.value.flag ? reference.key : p.key;
        once(`flag|${id}`, error('type/flag-mismatch', `${id} is a flag in ${flagged} but a plain number in ${plain}; app.prism.flag goes on every declaration of the id (ADR-0024 §4.2)`, { tokenId: id, file: t.source.file, line: t.source.line, permutation: p.key, hint: 'add "$extensions": { "app.prism": { "flag": true } } to every declaration' }));
      }
      // 6. sys typography is a whole-value alias whose chain ends at a ref.type.* role
      if (t.tier === 'sys' && t.type === 'typography') {
        let cur = t;
        const seen = new Set<string>();
        let ok = cur.aliasOf !== null;
        while (ok && cur.aliasOf !== null && !seen.has(cur.id)) {
          seen.add(cur.id);
          const next = p.tokens.get(cur.aliasOf);
          if (next === undefined || (next.tier !== 'sys' && next.tier !== 'ref')) { ok = false; break; }
          cur = next;
        }
        if (!ok || cur.aliasOf !== null || !matches(`${TYPE_ROLE_PREFIX}.**`, cur.id) || cur.type !== 'typography') {
          once(`syslit|${id}`, error('tier/sys-literal', `${id} is ${t.aliasOf === null ? 'a typography literal' : `an alias whose chain ends at ${cur.id}`}; every sys typography token is a whole-value alias of a ${TYPE_ROLE_PREFIX}.* role (ADR-0024 §5.6)`, { tokenId: id, file: t.source.file, line: t.source.line, permutation: p.key, hint: `write "{${TYPE_ROLE_PREFIX}.<role>}"` }));
        }
      }
      // alpha aliases target an opaque color
      if (t.alpha !== null && t.aliasOf !== null) {
        const target = p.tokens.get(t.aliasOf);
        if (target !== undefined && target.value.kind === 'color' && target.value.alpha !== 1) {
          once(`alpha|${id}`, error('color/alpha-target', `${id} declares app.prism.alpha over {${target.id}}, which is translucent (alpha ${target.value.alpha}) in ${p.key}; alpha replaces the alpha of an opaque color only (ADR-0020 §3)`, { tokenId: id, file: t.source.file, line: t.source.line, permutation: p.key }));
        }
      }
    }
  }
  return out;
}
