// One Style Dictionary 5.5.3 instance per merged tree (ARCHITECTURE §6; ir/bundle.ts runs one per distinct
// document stack and builds the IR per permutation). SD does what its future native
// resolver will still do: DTCG typing (after Prism's preprocessor fixed the precedence), alias
// resolution with broken-reference errors, and transform orchestration. Prism uses no SD format and no
// built-in transform. Runs must be strictly sequential: SD's GroupMessages is a module singleton
// (§15 F10), so concurrent instances in one process would mix their messages. `resolveTokens` enforces
// it for every caller: it queues each run behind the previous one, so two overlapping builds (P1-7
// `tokens:diff` builds a baseline and a head bundle in one process) cannot flush each other's messages.
import StyleDictionary from 'style-dictionary';
import type { DesignTokens, TransformedToken } from 'style-dictionary/types';
import { EXTENSION_NAMESPACE, METADATA_KEYS } from '../config.ts';
import { error, TokenBuildError } from '../ir/diagnostics.ts';
import type { PermutationIR } from '../ir/types.ts';
import { PRISM_PREPROCESSORS, PRISM_TRANSFORMS, prismHooks, type PermutationMeta } from './hooks.ts';
import { toPermutationIR } from './to-ir.ts';

/**
 * The tree SD sees: groups and token nodes only, each token reduced to `$value`, its own `$type` and
 * its functional `app.prism` keys. Descriptions and metadata stay in the source model: SD's reference
 * resolver walks every string of a token, `$description` included, and would read a brace in prose as
 * a reference.
 */
export function sdInput(tree: Readonly<Record<string, unknown>>): DesignTokens {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$') && key !== '$root') continue;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) continue;
    const node = value as Record<string, unknown>;
    if (!('$value' in node)) {
      out[key] = sdInput(node);
      continue;
    }
    const token: Record<string, unknown> = { $value: node['$value'] };
    if (typeof node['$type'] === 'string') token['$type'] = node['$type'];
    const ns = (node['$extensions'] as Record<string, unknown> | undefined)?.[EXTENSION_NAMESPACE];
    if (ns !== null && typeof ns === 'object') {
      const functional = Object.fromEntries(Object.entries(ns).filter(([k]) => !METADATA_KEYS.includes(k)));
      if (Object.keys(functional).length > 0) token['$extensions'] = { [EXTENSION_NAMESPACE]: functional };
    }
    out[key] = token;
  }
  return out as DesignTokens;
}

/** The tail of the run queue; it never rejects, so one failed run does not stop the next. */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Resolves and transforms one merged tree with a fresh Style Dictionary instance, after every run
 * already queued in this process has settled. Rejects with TokenBuildError when the diagnostics side
 * channel is non-empty or SD itself fails.
 */
export function resolveTokens(tree: Readonly<Record<string, unknown>>, meta: PermutationMeta): Promise<readonly TransformedToken[]> {
  const tokens = sdInput(tree);   // read the tree at call time, as an unqueued run would
  const run = queue.then(() => resolveTokensNow(tokens, meta));
  queue = run.catch(() => undefined);
  return run;
}

async function resolveTokensNow(tokens: DesignTokens, meta: PermutationMeta): Promise<readonly TransformedToken[]> {
  const sd = new StyleDictionary({
    tokens,                                       // merged by resolver.ts; SD reads no files
    usesDtcg: true,
    preprocessors: [...PRISM_PREPROCESSORS],      // hook preprocessors run only when listed (§15 F9)
    hooks: prismHooks(meta),                      // per instance; no global StyleDictionary.register*
    log: { verbosity: 'verbose', warnings: 'error', errors: { brokenReferences: 'throw' } },
    platforms: { ir: { transforms: [...PRISM_TRANSFORMS] } },
  });
  let dictionary;
  try {
    dictionary = await sd.getPlatformTokens('ir');   // transformed + resolved; quiet on success (§15 F2)
  } catch (e) {
    // Prism's own checks name the defect precisely; SD's message is the backstop.
    if (meta.diagnostics.length > 0) throw new TokenBuildError(meta.diagnostics);
    const message = e instanceof Error ? e.message.trim() : String(e);
    throw new TokenBuildError([error('engine/style-dictionary', `Style Dictionary failed: ${message}`, { permutation: meta.key })]);
  }
  if (meta.diagnostics.length > 0) throw new TokenBuildError(meta.diagnostics);
  return dictionary.allTokens;
}

/** SD tokens → PermutationIR for one permutation (to-ir.ts); throws TokenBuildError on IR problems. */
export function finishPermutation(tokens: readonly TransformedToken[], meta: PermutationMeta): PermutationIR {
  const ir = toPermutationIR(tokens, meta);
  if (meta.diagnostics.length > 0) throw new TokenBuildError(meta.diagnostics);
  return ir;
}

/** One permutation: `resolveTokens` then `finishPermutation` (§6). */
export async function runPermutation(tree: Readonly<Record<string, unknown>>, meta: PermutationMeta): Promise<PermutationIR> {
  return finishPermutation(await resolveTokens(tree, meta), meta);
}
