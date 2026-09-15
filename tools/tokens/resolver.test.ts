import { describe, expect, test } from 'vitest';
import { defaultInput, enumerate, layersFor, merge, permKey } from './resolver.ts';
import { loadModel } from './source/model.ts';
import { memoryReader, overlayReader } from './source/reader.ts';
import { fixtureReader } from './test-support.ts';

function model(name: string) {
  const { model, diagnostics } = loadModel(fixtureReader(name));
  if (model === null) throw new Error(JSON.stringify(diagnostics));
  return model;
}

describe('enumerate', () => {
  test('the mini fixture has 12 permutations in canonical key order', () => {
    const m = model('mini');
    const keys = enumerate(m).map((input) => permKey(m, input));
    expect(keys).toEqual([
      'colorScheme=light|density=compact|motion=default',
      'colorScheme=light|density=compact|motion=reduced',
      'colorScheme=light|density=regular|motion=default',
      'colorScheme=light|density=regular|motion=reduced',
      'colorScheme=light|density=comfortable|motion=default',
      'colorScheme=light|density=comfortable|motion=reduced',
      'colorScheme=dark|density=compact|motion=default',
      'colorScheme=dark|density=compact|motion=reduced',
      'colorScheme=dark|density=regular|motion=default',
      'colorScheme=dark|density=regular|motion=reduced',
      'colorScheme=dark|density=comfortable|motion=default',
      'colorScheme=dark|density=comfortable|motion=reduced',
    ]);
  });

  test('the valid fixture is the product of its context counts (2 · 2 · 6 · 2 · 2 · 2)', () => {
    const m = model('valid');
    expect(m.modifiers.map((x) => x.name)).toEqual(['brand', 'platform', 'colorScheme', 'density', 'modality', 'motion']);
    expect(enumerate(m)).toHaveLength(192);
    expect(permKey(m, defaultInput(m))).toBe('brand=prism|platform=web|colorScheme=light|density=compact|modality=pointer|motion=default');
  });

  test('a filter narrows the product and rejects unknown names', () => {
    const m = model('mini');
    expect(enumerate(m, { colorScheme: ['dark'], motion: ['reduced'] }).map((i) => permKey(m, i))).toEqual([
      'colorScheme=dark|density=compact|motion=reduced',
      'colorScheme=dark|density=regular|motion=reduced',
      'colorScheme=dark|density=comfortable|motion=reduced',
    ]);
    expect(() => enumerate(m, { colorScheme: ['sepia'] })).toThrow(/unknown context "sepia"/);
    expect(() => enumerate(m, { gamut: ['p3'] })).toThrow(/unknown modifier "gamut"/);
  });
});

describe('merge', () => {
  test('a later token replaces the earlier one wholesale: no $description, hex or $extensions is inherited', () => {
    const m = model('merge-semantics');
    const { tree, provenance, diagnostics } = merge(m, {});
    expect(diagnostics).toEqual([]);
    const ref = tree['ref'] as Record<string, Record<string, Record<string, unknown>>>;
    const brand = ref['color']?.['brand'];
    expect(brand).toEqual({ $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 } });
    expect(provenance.get('ref.color.brand')?.ref).toMatchObject({ file: 'tokens/second.tokens.json', layer: { kind: 'set', name: 'second' } });
    // arrays are replaced, not merged element-wise
    const card = ref['elevation']?.['card'] as { $value: unknown[] };
    expect(card.$value).toHaveLength(1);
    // untouched tokens keep their node, shared by reference with the frozen source document
    expect(Object.isFrozen(ref['color']?.['paper'])).toBe(true);
  });

  test('group properties are last-wins per key', () => {
    const m = model('merge-semantics');
    const { tree } = merge(m, {});
    const ref = tree['ref'] as Record<string, Record<string, unknown>>;
    expect(ref['$description']).toBe('first');
    expect(ref['color']?.['$description']).toBe('second colors');
    expect(ref['color']?.['$type']).toBe('color');
  });

  test('a token in one document and a group in another is resolver/shape-conflict', () => {
    const base = fixtureReader('mini');
    // sys/base (a set, earlier) makes sys.color.bg.page a group; the light file (later) declares it a token.
    const baseDoc = JSON.parse(base.readText('tokens/sys/base.tokens.json')) as { sys: Record<string, unknown> };
    baseDoc.sys['color'] = { bg: { page: { tint: { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 1, 1], alpha: 0.1 } } } } };
    const reader = overlayReader(base, memoryReader({ 'tokens/sys/base.tokens.json': JSON.stringify(baseDoc) }));
    const { model: m } = loadModel(reader);
    if (m === null) throw new Error('model');
    const result = merge(m, { colorScheme: 'light', density: 'regular', motion: 'default' });
    expect(result.diagnostics.map((d) => [d.code, d.tokenId, d.file])).toEqual([
      ['resolver/shape-conflict', 'sys.color.bg.page', 'tokens/sys/color/light.tokens.json'],
    ]);
  });

  test('sets expand their set references in place, and inline sources merge like files', () => {
    const m = model('mini');
    const layers = layersFor(m, defaultInput(m)).map((l) => l.doc.file);
    expect(layers).toEqual([
      'tokens/ref/core.tokens.json',
      'tokens/ref/type.tokens.json',
      'tokens/sys/base.tokens.json',
      'inline:base#2',
      'tokens/sys/color/light.tokens.json',
      'tokens/sys/density/compact.tokens.json',
      'tokens/sys/motion/default.tokens.json',
    ]);
    const { provenance } = merge(m, defaultInput(m));
    expect(provenance.get('comp.card.bg')?.ref).toMatchObject({ file: 'tokens/prism.resolver.json', layer: { kind: 'set', name: 'base' } });
  });

  test('a key named like an Object.prototype member merges as an own key and never touches Object', () => {
    // source/name-case rejects "constructor" (Style Dictionary drops it); the merge must still not read
    // the key through the prototype chain, or it would write the group's tokens onto the global Object.
    const reader = memoryReader({
      'tokens/prism.resolver.json': JSON.stringify({ version: '2025.10', sets: { ref: { sources: [{ $ref: 'a.tokens.json' }] } }, modifiers: {}, resolutionOrder: [{ $ref: '#/sets/ref' }] }),
      'tokens/a.tokens.json': JSON.stringify({ ref: { constructor: { $type: 'number', 'leak-probe': { $value: 1 } }, n: { $type: 'number', constructor: { $value: 2 } } } }),
    });
    const { model: m } = loadModel(reader);
    if (m === null) throw new Error('model');
    const { tree, provenance, diagnostics } = merge(m, {});
    expect(diagnostics).toEqual([]);
    const ref = tree['ref'] as Record<string, Record<string, unknown>>;
    expect(Object.hasOwn(ref, 'constructor')).toBe(true);
    expect(ref['constructor']?.['leak-probe']).toEqual({ $value: 1 });
    expect(Object.hasOwn(ref['n'] ?? {}, 'constructor')).toBe(true);
    expect([...provenance.keys()].sort()).toEqual(['ref.constructor.leak-probe', 'ref.n.constructor']);
    expect(Object.hasOwn(Object, 'leak-probe')).toBe(false);
  });

  test('the reduced motion context layers its delta over the default file', () => {
    const m = model('mini');
    const reduced = merge(m, { colorScheme: 'light', density: 'compact', motion: 'reduced' });
    expect(reduced.provenance.get('sys.motion.spring.snappy')?.ref.file).toBe('tokens/sys/motion/reduced.tokens.json');
    expect(reduced.provenance.get('sys.motion.easing.out')?.ref.file).toBe('tokens/sys/motion/default.tokens.json');
  });
});
