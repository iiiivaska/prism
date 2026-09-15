// `diffBundles` and `requiredBump` (ARCHITECTURE §11, §14 P1-7; ADR-0024 §14): two in-memory bundles
// per case, the base from `fixtures/diff/before/` and the other from an `after-*` overlay of it (a
// SourceReader over the fixture trees), covering every TokenChange kind. Style Dictionary runs share a
// module singleton, so this file never uses test.concurrent.
import { describe, expect, test } from 'vitest';
import { buildBundle } from '../ir/bundle.ts';
import type { IRBundle } from '../ir/types.ts';
import { memoryReader, overlayReader, type SourceReader } from '../source/reader.ts';
import { fixtureReader } from '../test-support.ts';
import {
  compareBumps, comparePaths, diffBundles, KIND_ORDER, policyFor, requiredBump, sameValue, shiftBump, type TokenChange,
} from './classify.ts';
import { afterCases, diffTree, type ExpectedChange } from './fixture-repo.ts';

const bundles = new Map<string, IRBundle>();
async function bundle(name: string): Promise<IRBundle> {
  let b = bundles.get(name);
  if (b === undefined) {
    b = await buildBundle({ reader: diffTree(name) });
    bundles.set(name, b);
  }
  return b;
}

async function changes(name: string): Promise<readonly TokenChange[]> {
  return diffBundles(await bundle('before'), await bundle(name));
}

function label(c: TokenChange | ExpectedChange): string {
  if ('path' in c && c.path !== undefined) return `${c.kind} ${c.path}`;
  const ctx = c as { readonly kind: string; readonly modifier?: string; readonly context?: string };
  return `${ctx.kind} ${String(ctx.modifier)}=${String(ctx.context)}`;
}

function only<K extends TokenChange['kind']>(list: readonly TokenChange[], kind: K, path?: string): Extract<TokenChange, { kind: K }> {
  const hits = list.filter((c): c is Extract<TokenChange, { kind: K }> => c.kind === kind && (path === undefined || ('path' in c && c.path === path)));
  expect(hits, `${kind} ${path ?? ''}`).toHaveLength(1);
  return hits[0] as Extract<TokenChange, { kind: K }>;
}

describe('every after-* fixture yields exactly its changes, in order', () => {
  const cases = afterCases();
  test('the fixtures exist', () => {
    expect(cases.length).toBeGreaterThanOrEqual(14);
  });
  test.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
    expect((await changes(c.name)).map(label)).toEqual(c.expect.map(label));
  });
});

describe('the TokenChange kinds', () => {
  test('the fixtures cover every kind', async () => {
    const seen = new Set<string>();
    for (const c of afterCases()) for (const ch of await changes(c.name)) seen.add(ch.kind);
    expect([...seen].sort()).toEqual([...KIND_ORDER].sort());
  });

  test('levels: removal, type, axes and removed contexts are major; additions, values, deprecations minor; metadata patch', async () => {
    const levels = new Map<string, string>();
    for (const c of afterCases()) for (const ch of await changes(c.name)) levels.set(ch.kind, ch.level);
    expect(Object.fromEntries([...levels].sort())).toEqual({
      'added': 'minor',
      'axes-changed': 'major',
      'context-added': 'minor',
      'context-removed': 'major',
      'deprecated': 'minor',
      'meta-changed': 'patch',
      'removed': 'major',
      'type-changed': 'major',
      'value-changed': 'minor',
    });
  });

  test('removed, added and type-changed name the types', async () => {
    expect(only(await changes('after-removed'), 'removed')).toEqual({ kind: 'removed', path: 'ref.space.8', type: 'dimension', level: 'major' });
    expect(only(await changes('after-added'), 'added')).toEqual({ kind: 'added', path: 'ref.space.12', type: 'dimension', level: 'minor' });
    expect(only(await changes('after-type'), 'type-changed')).toEqual({ kind: 'type-changed', path: 'ref.space.8', from: 'dimension', to: 'number', level: 'major' });
  });

  test('value-changed lists the changed permutations of the working tree', async () => {
    const list = await changes('after-value');
    const everywhere = only(list, 'value-changed', 'ref.space.8');
    expect(everywhere.permutations).toHaveLength(12);
    expect(everywhere.compared).toBe(12);
    const regular = only(list, 'value-changed', 'size.control.md');
    expect(regular.permutations).toEqual([
      'colorScheme=light|density=regular|motion=default',
      'colorScheme=light|density=regular|motion=reduced',
      'colorScheme=dark|density=regular|motion=default',
      'colorScheme=dark|density=regular|motion=reduced',
    ]);
  });

  test('axes-changed: a token that stops depending on colorScheme, with its dark value changes', async () => {
    const list = await changes('after-axes');
    expect(only(list, 'axes-changed')).toEqual({ kind: 'axes-changed', path: 'color.bg.surface.raised', from: ['colorScheme'], to: [], level: 'major' });
    expect(only(list, 'value-changed').permutations.every((k) => k.startsWith('colorScheme=dark|'))).toBe(true);
  });

  test('axes-changed: new increased-contrast deltas change the variant dependencies (the TS delta table, the colorset entries)', async () => {
    const list = await changes('after-contrast');
    expect(only(list, 'axes-changed', 'color.text.secondary')).toEqual({
      kind: 'axes-changed', path: 'color.text.secondary', from: ['colorScheme'], to: ['colorScheme'],
      variants: { from: [], to: ['increasedContrast:light'] }, level: 'major',
    });
    // ADR-0021's Increase Contrast floor lifts the 300 metric weight to 400 in both schemes.
    expect(only(list, 'axes-changed', 'type.metric.xl').variants).toEqual({ from: [], to: ['increasedContrast:light', 'increasedContrast:dark'] });
  });

  test('axes-changed: a modifier removed; the permutations at its default still pair, so no value changes', async () => {
    const list = await changes('after-modifier-removed');
    expect(list.filter((c) => c.kind === 'value-changed')).toEqual([]);
    expect(only(list, 'axes-changed', 'motion.spring.snappy')).toMatchObject({ from: ['motion'], to: [] });
  });

  test('deprecated carries the message', async () => {
    expect(only(await changes('after-deprecated'), 'deprecated')).toEqual({ kind: 'deprecated', path: 'ref.space.8', message: 'use ref.space.6', level: 'minor' });
  });

  test('meta-changed: description and metadata; an alias retarget that keeps every value is alias only', async () => {
    expect(only(await changes('after-meta'), 'meta-changed').fields).toEqual(['description', 'metadata']);
    expect(only(await changes('after-alias'), 'meta-changed').fields).toEqual(['alias']);
  });

  test('a token that becomes its group\'s $root keeps its public path', async () => {
    expect((await changes('after-root')).map(label)).toEqual(['added ref.space.8.half']);
  });

  test('context changes', async () => {
    expect(only(await changes('after-context-added'), 'context-added')).toEqual({ kind: 'context-added', modifier: 'density', context: 'spacious', level: 'minor' });
    expect(only(await changes('after-context-removed'), 'context-removed')).toEqual({ kind: 'context-removed', modifier: 'density', context: 'comfortable', level: 'major' });
  });
});

describe('with brand and platform modifiers (fixtures/valid, 192 permutations)', () => {
  const valid = (): SourceReader => fixtureReader('valid');
  const json = (path: string): unknown => JSON.parse(valid().readText(path));
  /** The object at a dotted path of parsed JSON. */
  const node = (root: unknown, path: string): Record<string, unknown> =>
    path.split('.').reduce<unknown>((cur, seg) => (cur as Record<string, unknown>)[seg], root) as Record<string, unknown>;

  test('axes-changed names the platforms whose generated shape changed', async () => {
    const dark = json('tokens/sys/color/dark.tokens.json');
    node(dark, 'sys.color.bg.surface')['raised'] = node(json('tokens/sys/color/light.tokens.json'), 'sys.color.bg.surface')['raised'];
    const after = overlayReader(valid(), memoryReader({ 'tokens/sys/color/dark.tokens.json': JSON.stringify(dark) }));
    const list = diffBundles(await buildBundle({ reader: valid() }), await buildBundle({ reader: after }));
    expect(only(list, 'axes-changed')).toEqual({ kind: 'axes-changed', path: 'color.bg.surface.raised', from: ['colorScheme'], to: [], platforms: ['apple', 'web'], level: 'major' });
    expect(only(list, 'value-changed').permutations.every((k) => k.includes('|colorScheme=dark'))).toBe(true);
  });

  test('a brand removed is a context-removed change', async () => {
    const resolver = json('tokens/prism.resolver.json');
    delete node(resolver, 'modifiers.brand.contexts')['alt'];
    const after = overlayReader(valid(), memoryReader({ 'tokens/prism.resolver.json': JSON.stringify(resolver) }), ['brands/alt']);
    const list = diffBundles(await buildBundle({ reader: valid() }), await buildBundle({ reader: after }));
    expect(list.map(label)).toEqual(['context-removed brand=alt']);
  });
});

describe('diffBundles', () => {
  test('the same sources built twice differ in nothing', async () => {
    const again = await buildBundle({ reader: diffTree('before') });
    expect(diffBundles(await bundle('before'), again)).toEqual([]);
  });

  test('swapping the sides swaps removal and addition, context removal and addition', async () => {
    const back = (name: string): Promise<readonly TokenChange[]> => bundle(name).then(async (b) => diffBundles(b, await bundle('before')));
    expect((await back('after-removed')).map(label)).toEqual(['added ref.space.8']);
    expect((await back('after-added')).map(label)).toEqual(['removed ref.space.12']);
    expect((await back('after-context-added')).map(label)).toEqual(['context-removed density=spacious']);
    expect((await back('after-deprecated')).map((c) => c.kind === 'meta-changed' ? c.fields : c.kind)).toEqual([['deprecated']]);
  });

  test('context changes come first; token changes sort by path, then kind', async () => {
    const list = await changes('after-contrast');
    expect(list.slice(0, 2).map((c) => c.kind)).toEqual(['context-added', 'context-added']);
    const paths = list.slice(2).map((c) => ('path' in c ? c.path : ''));
    expect(paths).toEqual([...paths].sort(comparePaths));
    const axes = await changes('after-axes');
    expect(axes.map((c) => c.kind)).toEqual(['axes-changed', 'value-changed']);
  });
});

describe('value equality (ARCHITECTURE §11): authored fields count, derived ones do not', () => {
  const color = { kind: 'color', space: 'srgb', components: [1, 0, 0], alpha: 1, hex: '#ff0000', srgb: [1, 0, 0], p3: [0.9, 0.2, 0.1], oklch: [0.6, 0.25, 29], inSrgb: true, inP3: true };
  const dim = (value: number, unit: string, px: number): object => ({ kind: 'dimension', value, unit, px });

  test('derived color forms, px and boldWeight are ignored', () => {
    expect(sameValue(color, { ...color, hex: '#fe0000', srgb: [0.99, 0, 0], p3: [0, 0, 0], oklch: [0, 0, 0], inP3: false })).toBe(true);
    expect(sameValue(dim(16, 'px', 16), dim(16, 'px', 15.999))).toBe(true);
    const type = { kind: 'typography', fontWeight: { kind: 'fontWeight', weight: 300 }, boldWeight: 400, fontSize: dim(48, 'px', 48) };
    expect(sameValue(type, { ...type, boldWeight: 500 })).toBe(true);
  });

  test('authored space, components, alpha, value and unit count, also inside composites', () => {
    expect(sameValue(color, { ...color, space: 'display-p3' })).toBe(false);
    expect(sameValue(color, { ...color, components: [1, 0, 0.001] })).toBe(false);
    expect(sameValue(color, { ...color, alpha: 0.5 })).toBe(false);
    expect(sameValue(dim(16, 'px', 16), dim(1, 'rem', 16))).toBe(false);
    const shadow = (c: object): object => ({ kind: 'shadow', layers: [{ kind: 'shadowLayer', color: c, offsetX: dim(0, 'px', 0), inset: false }] });
    expect(sameValue(shadow(color), shadow({ ...color, hex: '#000000' }))).toBe(true);
    expect(sameValue(shadow(color), shadow({ ...color, alpha: 0.2 }))).toBe(false);
    expect(sameValue({ kind: 'gradient', stops: [], angle: null }, { kind: 'gradient', stops: [], angle: 165 })).toBe(false);
    expect(sameValue([1, 2], [1, 2, 3])).toBe(false);
    expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameValue(Number.NaN, Number.NaN)).toBe(true);
  });
});

describe('requiredBump and the policies (ADR-0024 §14)', () => {
  const removed: TokenChange = { kind: 'removed', path: 'a', type: 'color', level: 'major' };
  const added: TokenChange = { kind: 'added', path: 'b', type: 'color', level: 'minor' };
  const meta: TokenChange = { kind: 'meta-changed', path: 'c', fields: ['description'], level: 'patch' };

  test('strict: the highest level', () => {
    expect(requiredBump([])).toBeNull();
    expect(requiredBump([meta])).toBe('patch');
    expect(requiredBump([meta, added])).toBe('minor');
    expect(requiredBump([added, removed, meta], 'strict')).toBe('major');
  });

  test('shifted: major becomes minor, minor becomes patch, patch stays patch', () => {
    expect(requiredBump([], 'shifted')).toBeNull();
    expect(requiredBump([meta], 'shifted')).toBe('patch');
    expect(requiredBump([added], 'shifted')).toBe('patch');
    expect(requiredBump([removed, added], 'shifted')).toBe('minor');
    expect([shiftBump('major'), shiftBump('minor'), shiftBump('patch')]).toEqual(['minor', 'patch', 'patch']);
  });

  test('the policy follows the base release major: 0.x shifted, 1.0 on strict', () => {
    expect(policyFor(0)).toBe('shifted');
    expect(policyFor(1)).toBe('strict');
    expect(policyFor(12)).toBe('strict');
  });

  test('bumps order none < patch < minor < major', () => {
    const order = [null, 'patch', 'minor', 'major'] as const;
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < order.length; j++) expect(Math.sign(compareBumps(order[i] ?? null, order[j] ?? null))).toBe(Math.sign(i - j));
    }
  });

  test('paths sort ref, then sys, then comp, numeric segments numerically', () => {
    expect(['comp.button.bg', 'space.10', 'ref.space.10', 'space.2', 'ref.space.2', 'color.bg.page'].sort(comparePaths))
      .toEqual(['ref.space.2', 'ref.space.10', 'color.bg.page', 'space.2', 'space.10', 'comp.button.bg']);
  });
});
