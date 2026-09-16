// Tests against the real repository (ARCHITECTURE §14 P1-3): they build the bundle once. P1-1 and
// P1-2 have landed the §1 source fixes, so every test runs: the repository builds all 576
// permutations with zero diagnostics, which is also the P1-2 acceptance (ADR-0024 §9.4; 432 until
// ADR-0029 §3.2 added the watch density).
// Style Dictionary runs share a module singleton (GroupMessages), so this file never uses test.concurrent.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { collectBundle, contrastContexts, lookup, REPO_ROOT, type CollectResult, type IRBundle } from './api.ts';
import { enumerate } from './resolver.ts';
import { loadModel } from './source/model.ts';
import { fsReader } from './source/reader.ts';
import { terrazzoOracle } from './test-support.ts';

let built: Promise<CollectResult> | null = null;
function repo(): Promise<CollectResult> {
  built ??= collectBundle({ root: REPO_ROOT });
  return built;
}
async function bundle(): Promise<IRBundle> {
  const r = await repo();
  if (r.bundle === null) throw new Error(`the repository does not build:\n${r.diagnostics.map((d) => `${d.file ?? ''}:${d.line ?? ''} ${d.code} ${d.message}`).join('\n')}`);
  return r.bundle;
}

describe('the repository resolver', () => {
  test('enumerates 576 permutations, the product of its contexts and Terrazzo\'s listPermutations()', async () => {
    const { model } = loadModel(fsReader(REPO_ROOT));
    if (model === null) throw new Error('the repository resolver does not load');
    expect(enumerate(model)).toHaveLength(576);
    expect(model.modifiers.reduce((n, m) => n * m.contexts.length, 1)).toBe(576);
    const { parse, defineConfig } = await import('@terrazzo/parser');
    const { pathToFileURL } = await import('node:url');
    const base = pathToFileURL(REPO_ROOT);
    const file = new URL('tokens/prism.resolver.json', base);
    const config = defineConfig({ tokens: [file.href], plugins: [], permutationLimit: 5000 }, { cwd: base });
    const parsed = (await parse([{ filename: file, src: readFileSync(file, 'utf8') }], {
      config,
      req: (u: URL) => Promise.resolve(readFileSync(u, 'utf8')),
    })) as unknown as { resolver: { orthogonal: boolean; listPermutations?: () => unknown[] } };
    expect(parsed.resolver.orthogonal).toBe(true);
    expect(parsed.resolver.listPermutations?.().length).toBe(576);
  }, 60_000);
});

describe('the repository', () => {
  test('builds with zero diagnostics', async () => {
    const r = await repo();
    expect(r.diagnostics).toEqual([]);
  }, 60_000);

  test('builds one permutation per enumerated input (576)', async () => {
    const b = await bundle();
    expect(b.permutations.size).toBe(576);
  }, 60_000);

  test('the motion contexts are exactly default: [default] and reduced: [default, reduced] (ADR-0023 rule 7)', () => {
    const { model } = loadModel(fsReader(REPO_ROOT));
    const motion = model?.contexts.get('motion');
    expect([...(motion?.keys() ?? [])]).toEqual(['default', 'reduced']);
    expect(motion?.get('default')?.map((d) => d.file)).toEqual(['tokens/sys/motion/default.tokens.json']);
    expect(motion?.get('reduced')?.map((d) => d.file)).toEqual(['tokens/sys/motion/default.tokens.json', 'tokens/sys/motion/reduced.tokens.json']);
  });

  test('every permutation has the same ids; every scope passes the composition proof', async () => {
    const b = await bundle();
    const sizes = new Set([...b.permutations.values()].map((p) => p.tokens.size));
    expect(sizes.size).toBe(1);
    expect(b.analysis.scopes.size).toBe(6);
    for (const s of b.analysis.scopes.values()) {
      expect(s.proof.permutations).toBe(96);   // 6 colorScheme × 4 density × 2 modality × 2 motion
      for (const d of s.deps.values()) {
        expect(d.axes.length).toBeLessThanOrEqual(1);
        expect(d.reducedTransparency).toEqual([]);   // ADR-0022: the reduced-transparency deltas are empty
      }
    }
  }, 60_000);

  test('every name in tokens/contrast-pairs.json resolves with lookup', async () => {
    const b = await bundle();
    const pairs = (JSON.parse(readFileSync(`${REPO_ROOT}tokens/contrast-pairs.json`, 'utf8')) as { pairs: { fg: string; bg: string; backdrops?: string[]; underlays?: string[] }[] }).pairs;
    // A token backdrop names its colors and, after " over ", their ground (ADR-0030 §1.5).
    const backdropNames = (x: string): string[] => (x.startsWith('#') ? [] : x.split(' over '));
    for (const p of pairs) {
      for (const name of [p.fg, p.bg, ...(p.underlays ?? []), ...(p.backdrops ?? []).flatMap(backdropNames)]) {
        expect(lookup(b, name).length, name).toBeGreaterThan(0);
      }
    }
    expect(contrastContexts(b)).toHaveLength(12);
  }, 60_000);

  test('agrees with Terrazzo on the default permutation and every single-axis variation (14 inputs)', async () => {
    const b = await bundle();
    const result = await terrazzoOracle(REPO_ROOT, b);
    expect(result.inputs).toBe(14);
    expect(result.differences).toEqual([]);
  }, 60_000);
});
