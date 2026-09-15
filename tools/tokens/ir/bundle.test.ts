// buildBundle as a whole (ARCHITECTURE §3.1): determinism (§12 rule 10) and IR invariants 1 and 3
// (§4.2). Style Dictionary runs share a module singleton (GroupMessages), so this file never uses
// test.concurrent.
import { describe, expect, test, vi } from 'vitest';
import { PATHS } from '../config.ts';
import { defaultInput, permKey } from '../resolver.ts';
import { loadModel } from '../source/model.ts';
import { fsReader, memoryReader, overlayReader, type SourceReader } from '../source/reader.ts';
import { casesWithPrefix, FIXTURES, fixtureReader, pairs, runBroken } from '../test-support.ts';
import { buildBundle, checkInvariants } from './bundle.ts';
import type { IRBundle, IRToken, PermutationIR } from './types.ts';

type BundleModule = typeof import('./bundle.ts');

/** A fresh instance of the pipeline's own modules, so every module-level memo starts empty. */
async function freshPipeline(): Promise<BundleModule> {
  vi.resetModules();
  return import('./bundle.ts');
}

/** The reader's directory listings in a fixed pseudo-random order instead of sorted by name. */
function shuffledReader(base: SourceReader): SourceReader {
  let seed = 12345;
  const next = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  return {
    readText: (path) => base.readText(path),
    exists: (path) => base.exists(path),
    list: (dir) => {
      const entries = [...base.list(dir)];
      for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const a = entries[i];
        const b = entries[j];
        if (a !== undefined && b !== undefined) {
          entries[i] = b;
          entries[j] = a;
        }
      }
      return entries;
    },
  };
}

/**
 * The resolver with its `sets` and `modifiers` keys in reverse declaration order; `resolutionOrder`
 * and every context list are unchanged, so every permutation applies the same documents in the same
 * order, but the model reads the sets, the modifiers and their documents in another order.
 */
function reversedResolver(base: SourceReader): SourceReader {
  const doc = JSON.parse(base.readText(PATHS.resolver)) as Record<string, unknown>;
  const reverse = (o: unknown): Record<string, unknown> => Object.fromEntries(Object.entries(o as Record<string, unknown>).reverse());
  const reversed = { ...doc, sets: reverse(doc['sets']), modifiers: reverse(doc['modifiers']) };
  return overlayReader(base, memoryReader({ [PATHS.resolver]: `${JSON.stringify(reversed, null, 2)}\n` }));
}

/** The bundle as JSON text per part (Maps as entry arrays, so their order counts too). */
function serialize(b: IRBundle): Map<string, string> {
  const json = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x instanceof Map ? [...(x as Map<unknown, unknown>).entries()] : x));
  const out = new Map<string, string>([['model', json(b.model)], ['brands', json(b.brands)], ['analysis', json(b.analysis)]]);
  for (const [key, p] of b.permutations) out.set(`permutation ${key}`, json(p));
  return out;
}

async function withEnv<T>(env: Readonly<Record<string, string>>, run: () => Promise<T>): Promise<T> {
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try {
    return await run();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe('determinism (§12 rule 10)', () => {
  test('two builds of the valid fixture in one process are identical: shuffled listings, reversed resolver keys, a different memo warm-up order, TZ and LANG', async () => {
    const valid = `${FIXTURES}valid`;
    const first = await withEnv({ TZ: 'UTC', LANG: 'C', LC_ALL: 'C' }, async () => {
      const pipeline = await freshPipeline();
      expect(pipeline.buildBundle).not.toBe(buildBundle);   // a new module instance: its memos start empty
      const r = await pipeline.collectBundle({ reader: fsReader(valid) });
      expect(r.diagnostics).toEqual([]);
      if (r.bundle === null) throw new Error('bundle');
      return serialize(r.bundle);
    });
    const second = await withEnv({ TZ: 'Asia/Tokyo', LANG: 'ru_RU.UTF-8', LC_ALL: 'ru_RU.UTF-8' }, async () => {
      const pipeline = await freshPipeline();
      // Warm every module-level memo (colors, springs, schemas) with the last context of each modifier first.
      const { model } = loadModel(fsReader(valid));
      if (model === null) throw new Error('model');
      // No inline source: the re-serialized resolver moves no token's line.
      expect([...model.docs.keys()].filter((k) => k.startsWith('inline:'))).toEqual([]);
      const last = Object.fromEntries(model.modifiers.map((m) => [m.name, [m.contexts[m.contexts.length - 1] ?? m.default]]));
      expect((await pipeline.collectBundle({ reader: fsReader(valid), filter: last })).diagnostics).toEqual([]);
      const reader = reversedResolver(fsReader(valid));
      const perturbed = loadModel(reader).model;
      expect([...(perturbed?.sets.keys() ?? [])]).toEqual([...model.sets.keys()].reverse());
      expect([...(perturbed?.contexts.keys() ?? [])]).toEqual([...model.contexts.keys()].reverse());
      const r = await pipeline.collectBundle({ reader: shuffledReader(reader) });
      expect(r.diagnostics).toEqual([]);
      if (r.bundle === null) throw new Error('bundle');
      return serialize(r.bundle);
    });
    expect([...second.keys()]).toEqual([...first.keys()]);
    expect(first.size).toBe(3 + 192);
    expect([...first].filter(([k, v]) => second.get(k) !== v).map(([k]) => k)).toEqual([]);
    for (const text of first.values()) expect(text.includes(FIXTURES)).toBe(false);   // no absolute path (§12 rule 4)
  }, 60_000);
});

describe('IR invariants (§4.2)', () => {
  test('1: every permutation has the same ids with the same types (ir/token-set, ir/type-mismatch)', async () => {
    const { model } = loadModel(fixtureReader('mini'));
    if (model === null) throw new Error('model');
    const b = await buildBundle({ reader: fixtureReader('mini'), filter: { density: ['compact'], motion: ['default'] } });
    const reference = b.permutations.get(permKey(model, defaultInput(model)));
    const other = [...b.permutations.values()].find((p) => p !== reference);
    const padding = other?.tokens.get('sys.space.card-padding');
    if (reference === undefined || other === undefined || padding === undefined) throw new Error('fixture');
    const tokens = new Map<string, IRToken>(other.tokens);
    tokens.delete('ref.space.2');
    tokens.set('sys.space.card-padding', { ...padding, type: 'number' });
    tokens.set('sys.space.extra', { ...padding, id: 'sys.space.extra', path: 'space.extra' });
    const tampered: PermutationIR = { ...other, tokens };
    const out = checkInvariants(model, new Map([[reference.key, reference], [other.key, tampered]]));
    expect(pairs(out)).toEqual(['ir/token-set|ref.space.2', 'ir/token-set|sys.space.extra', 'ir/type-mismatch|sys.space.card-padding']);
    for (const d of out) expect(d.permutation).toBe(other.key);
    // the untampered pair satisfies every invariant
    expect(checkInvariants(model, new Map([[reference.key, reference], [other.key, other]]))).toEqual([]);
  });

  test('3: public paths are unique and no sys category is named ref or comp (broken fixtures)', async () => {
    const cases = casesWithPrefix('naming-reserved-category');
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) {
      const { got, want, result } = await runBroken(c);
      expect(got, c.name).toEqual(want);
      expect(result.bundle).toBeNull();
      const collision = result.diagnostics.find((d) => d.code === 'naming/path-collision');
      expect(collision?.message).toContain('ref.space.2 and sys.ref.space.2 share the public path ref.space.2');
      expect(collision?.file).toBe('tokens/sys/base.tokens.json');
    }
  });
});
