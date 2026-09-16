// lint-orthogonality.ts (ADR-0024 §9.2, §9.4; ARCHITECTURE §14 P1-2): the repository resolver is orthogonal
// with 576 permutations (ADR-0029 §3.2), and the non-orthogonal fixture fails, naming sys.interaction.hover. The Terrazzo
// internals this relies on (`orthogonal`, `listPermutations`, `permutationLimit`, `source`) are undocumented
// (ARCHITECTURE F36), so these tests are the alarm when a Terrazzo upgrade changes them.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, test } from 'vitest';
import { contextProduct, findOverlaps, lintOrthogonality, lintResolver, problems, RESOLVER, tokenIds } from './lint-orthogonality.ts';

const repo = join(import.meta.dirname, '..', '..');
const fixture = join(import.meta.dirname, 'fixtures', 'non-orthogonal');
const cli = join(import.meta.dirname, 'lint-orthogonality.ts');
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

describe('the repository resolver', () => {
  test('is orthogonal with 576 permutations, the product of its context counts', async () => {
    const result = await lintOrthogonality(join(repo, RESOLVER));
    expect(result.orthogonal).toBe(true);
    expect(result.overlaps).toEqual([]);
    expect(result.expected).toBe(576);
    expect(result.permutations).toBe(576);
    expect(contextProduct(readJson(join(repo, RESOLVER)))).toBe(576);
    expect(problems(result)).toEqual([]);
  });
});

describe('the non-orthogonal fixture', () => {
  test('fails and names the id that density/compact and modality both write', async () => {
    const result = await lintOrthogonality(join(fixture, RESOLVER));
    expect(result.orthogonal).toBe(false);
    expect(result.overlaps).toEqual([
      { id: 'sys.interaction.hover', writers: ['density/compact', 'modality/pointer', 'modality/touch'] },
    ]);
    expect(result.permutations).toBe(576);
    expect(problems(result)).toEqual(['sys.interaction.hover is written by density/compact, modality/pointer, modality/touch']);
  });

  test('is the repository resolver plus one compact source (ADR-0024 §9.4)', () => {
    type Doc = { description?: string; sets: Record<string, { sources: { $ref: string }[] }>; modifiers: Record<string, { contexts: Record<string, { $ref: string }[]> }> };
    const toRepo = (ref: string): string => ref.replace('../../../../../tokens/', '').replace('../../../../../brands/', '../brands/');
    const copy = readJson(join(fixture, RESOLVER)) as Doc;
    const original = readJson(join(repo, RESOLVER)) as Doc;
    const compact = copy.modifiers['density']?.contexts['compact'];
    expect(compact?.pop()).toEqual({ $ref: 'sys/density/compact-hover.tokens.json' });
    for (const set of Object.values(copy.sets)) set.sources = set.sources.map((s) => ({ $ref: toRepo(s.$ref) }));
    for (const modifier of Object.values(copy.modifiers)) {
      for (const [name, sources] of Object.entries(modifier.contexts)) modifier.contexts[name] = sources.map((s) => ({ $ref: toRepo(s.$ref) }));
    }
    delete copy.description;
    delete original.description;
    expect(copy, 'refresh fixtures/non-orthogonal/tokens/prism.resolver.json from tokens/prism.resolver.json').toEqual(original);
  });
});

describe('Terrazzo internals the lint relies on', () => {
  // Two modifiers with 40 and 30 contexts of inline sources: 1,200 permutations, above Terrazzo's default limit of 1000.
  const inline = (modifier: string, count: number) => ({
    contexts: Object.fromEntries(
      Array.from({ length: count }, (_, i) => [`c${i}`, [{ sys: { [modifier]: { $type: 'number', size: { $value: i } } } }]]),
    ),
    default: 'c0',
  });
  const document = (overlap: boolean) => ({
    name: 'wide',
    version: '2025.10',
    sets: { base: { sources: [{ sys: { base: { $type: 'number', $value: 0 } } }] } },
    modifiers: {
      a: inline('a', 40),
      b: overlap ? { contexts: { ...inline('b', 30).contexts, c0: [{ sys: { a: { $type: 'number', size: { $value: 1 } } } }] }, default: 'c0' } : inline('b', 30),
    },
    resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/a' }, { $ref: '#/modifiers/b' }],
  });
  const file = pathToFileURL(join(import.meta.dirname, 'fixtures', 'wide.resolver.json'));

  test('the permutation limit is raised to the product, so listPermutations is never withheld', async () => {
    const result = await lintResolver(JSON.stringify(document(false)), file);
    expect(contextProduct(document(false))).toBe(1200);
    expect(result.orthogonal).toBe(true);
    expect(result.permutations).toBe(1200);
    expect(problems(result)).toEqual([]);
  });

  test('an overlap flips resolver.orthogonal and the walk names the id with its writers', async () => {
    const result = await lintResolver(JSON.stringify(document(true)), file);
    expect(result.orthogonal).toBe(false);
    expect(result.overlaps.map((o) => o.id)).toEqual(['sys.a.size']);
    expect(result.overlaps[0]?.writers).toHaveLength(41);
    expect(result.overlaps[0]?.writers).toEqual(expect.arrayContaining(['a/c0', 'a/c39', 'b/c0']));
    expect(problems(result)[0]).toMatch(/^sys\.a\.size is written by a\/c0, /);
  });
});

describe('the id walk', () => {
  test('keeps $root, skips $-keys and stops at a token', () => {
    const doc = {
      $schema: 'x',
      sys: { color: { $type: 'color', bg: { surface: { $root: { $value: 'a' }, raised: { $value: 'b', $extensions: { x: { $value: 1 } } } } } } },
    };
    expect(tokenIds(doc)).toEqual(['sys.color.bg.surface.$root', 'sys.color.bg.surface.raised']);
  });

  test('two contexts of one modifier may write the same id; two modifiers may not', () => {
    const hover = { sys: { interaction: { hover: { $value: 1 } } } };
    expect(findOverlaps([{ name: 'modality', contexts: { pointer: [hover], touch: [hover] } }])).toEqual([]);
    expect(findOverlaps([
      { name: 'density', contexts: { compact: [hover], regular: [] } },
      { name: 'modality', contexts: { pointer: [hover], touch: [hover] } },
    ])).toEqual([{ id: 'sys.interaction.hover', writers: ['density/compact', 'modality/pointer', 'modality/touch'] }]);
  });
});

describe('CLI', () => {
  test('exits 0 on the repository', () => {
    const run = runCli();
    expect(run.status).toBe(0);
    expect(run.stdout).toMatch(/resolver orthogonal \(@terrazzo\/parser\), 576 permutations/);
  });

  test('exits 1 on the non-orthogonal fixture and names the id', () => {
    const run = runCli('--root', fixture);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain('sys.interaction.hover is written by density/compact, modality/pointer, modality/touch');
    expect(run.stderr).toMatch(/1 orthogonality problem in /);
  });

  test('exits 2 on a usage error or a resolver it cannot load', () => {
    expect(runCli('--unknown').status).toBe(2);
    expect(runCli('--root').status).toBe(2);
    expect(runCli('--root', join(fixture, 'tokens')).status).toBe(2);
  });
});
