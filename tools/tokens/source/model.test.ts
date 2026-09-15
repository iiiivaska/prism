import { describe, expect, test } from 'vitest';
import { casesWithPrefix, fixtureReader, pairs, runBroken } from '../test-support.ts';
import { loadModel } from './model.ts';
import { memoryReader } from './reader.ts';

const RESOLVER = 'tokens/prism.resolver.json';

function repo(resolver: unknown, docs: Record<string, unknown> = {}, raw: Record<string, string> = {}) {
  const files: Record<string, string> = { [RESOLVER]: typeof resolver === 'string' ? resolver : JSON.stringify(resolver, null, 2) };
  for (const [k, v] of Object.entries(docs)) files[k] = JSON.stringify(v, null, 2);
  return memoryReader({ ...files, ...raw });
}

const oneSet = (sources: unknown[], extra: Record<string, unknown> = {}) => ({
  version: '2025.10',
  sets: { ref: { sources } },
  modifiers: {},
  resolutionOrder: [{ $ref: '#/sets/ref' }],
  ...extra,
});

const codes = (r: { diagnostics: readonly { code: string; line?: number; file?: string }[] }) =>
  r.diagnostics.map((d) => [d.code, d.file, d.line]);

describe('resolver structure', () => {
  test('a missing resolver leaves no model', () => {
    const r = loadModel(memoryReader({}));
    expect(r.model).toBeNull();
    expect(codes(r)).toEqual([['source/missing-file', RESOLVER, undefined]]);
  });

  test('invalid JSON is source/parse with a line', () => {
    const r = loadModel(repo('{\n  "version": "2025.10",\n  "sets": {,\n}'));
    expect(r.model).toBeNull();
    expect(r.diagnostics[0]).toMatchObject({ code: 'source/parse', file: RESOLVER, line: 3 });
  });

  test('inline resolutionOrder items, repeated or missing entries and unknown references', () => {
    const r = loadModel(repo({
      version: '2025.10',
      sets: { ref: { sources: [] }, unused: { sources: [] } },
      modifiers: { m: { contexts: { a: [] }, default: 'a' }, lost: { contexts: { x: [] }, default: 'x' } },
      resolutionOrder: [{ $ref: '#/sets/ref' }, { $ref: '#/sets/ref' }, { $ref: '#/modifiers/m' }, { sources: [] }, { $ref: '#/sets/nope' }],
    }));
    expect(r.diagnostics.map((d) => d.code).sort()).toEqual([
      'resolver/inline-order', 'resolver/order', 'resolver/order', 'resolver/order', 'resolver/structure',
    ]);
    expect(r.diagnostics.find((d) => d.code === 'resolver/inline-order')?.line).toBeGreaterThan(1);
  });

  test('set references expand in place; a cycle is resolver/set-cycle', () => {
    const r = loadModel(repo({
      version: '2025.10',
      sets: { a: { sources: [{ $ref: '#/sets/b' }] }, b: { sources: [{ $ref: '#/sets/a' }] } },
      modifiers: {},
      resolutionOrder: [{ $ref: '#/sets/a' }],
    }));
    expect(r.diagnostics.map((d) => d.code)).toContain('resolver/set-cycle');
  });

  test('keys next to "$ref" (DTCG Resolver §4.2.2 overrides) are rejected in sets and contexts, and the file still loads', () => {
    const override = { space: { '2': { $type: 'dimension', $value: { value: 999, unit: 'px' } } } };
    const r = loadModel(repo(
      {
        version: '2025.10',
        sets: { ref: { sources: [{ $ref: 'ref/a.tokens.json', ref: override }] } },
        modifiers: { density: { contexts: { compact: [{ $ref: 'ref/a.tokens.json', sys: override }], regular: [] }, default: 'compact' } },
        resolutionOrder: [{ $ref: '#/sets/ref' }, { $ref: '#/modifiers/density' }],
      },
      { 'tokens/ref/a.tokens.json': { ref: { space: { $type: 'dimension', '2': { $value: { value: 8, unit: 'px' } } } } } },
    ));
    expect(r.diagnostics.map((d) => d.code)).toEqual(['resolver/unsupported-source', 'resolver/unsupported-source']);
    expect(r.model).not.toBeNull();
    const lines = r.diagnostics.map((d) => d.line ?? 0);
    expect(lines[0]).toBeGreaterThan(1);
    expect(lines[1]).toBeGreaterThan(lines[0] ?? 0);
    expect(r.diagnostics[0]?.message).toContain('DTCG Resolver §4.2.2');
    // the referenced document is loaded without the override, so no other check reports it missing
    expect(r.model?.sets.get('ref')?.map((d) => d.file)).toEqual(['tokens/ref/a.tokens.json']);
    expect(r.model?.docs.get('tokens/ref/a.tokens.json')?.tokens.get('ref.space.2')?.node['$value']).toEqual({ value: 8, unit: 'px' });
  });

  test('context names, defaults and sources', () => {
    const r = loadModel(repo(
      {
        version: '2025.10',
        sets: { ref: { sources: [{ $ref: 'missing.tokens.json' }, { $ref: '../../outside.tokens.json' }] } },
        modifiers: { colorScheme: { contexts: { Light: [], dark: [] }, default: 'dark' } },
        resolutionOrder: [{ $ref: '#/sets/ref' }, { $ref: '#/modifiers/colorScheme' }],
      },
    ));
    expect(r.diagnostics.map((d) => d.code).sort()).toEqual([
      'resolver/context-name', 'resolver/web-default-mismatch', 'source/missing-file', 'source/outside-root',
    ]);
    const missing = r.diagnostics.find((d) => d.code === 'source/missing-file');
    expect(missing).toMatchObject({ file: RESOLVER });
    expect(missing?.line).toBeGreaterThan(1);
  });
});

describe('documents', () => {
  test('token and group shapes: unknown properties, unknown types, children of tokens, a $root group', () => {
    const r = loadModel(repo(oneSet([{ $ref: 'ref/a.tokens.json' }]), {
      'tokens/ref/a.tokens.json': {
        ref: {
          $bogus: 1,
          space: {
            $type: 'dimension',
            gap: { $value: { value: 4, unit: 'px' }, $unit: 'px', inner: { $value: 1 } },
            flag: { $type: 'boolean', $value: 1 },
            $root: { nested: { $value: 1 } },
          },
        },
      },
    }));
    expect(r.diagnostics.map((d) => [d.code, d.line]).sort()).toEqual([
      ['source/group-property', 3],   // "$bogus"
      ['source/structure', 12],       // "inner" inside the token gap
      ['source/structure', 20],       // "$root" that is a group
      ['source/token-property', 11],  // "$unit"
      ['type/unknown', 17],           // "$type": "boolean"
    ]);
    expect(r.diagnostics.every((d) => d.file === 'tokens/ref/a.tokens.json')).toBe(true);
  });

  test('duplicate keys are reported with both lines; JSON keeps the last', () => {
    const r = loadModel(repo(oneSet([{ $ref: 'ref/a.tokens.json' }]), {}, {
      'tokens/ref/a.tokens.json': '{\n  "ref": {\n    "x": { "$type": "number", "$value": 1 },\n    "x": { "$type": "number", "$value": 2 }\n  }\n}\n',
    }));
    expect(r.diagnostics.map((d) => [d.code, d.file, d.line])).toEqual([['source/duplicate-key', 'tokens/ref/a.tokens.json', 4]]);
    expect(r.diagnostics[0]?.message).toContain('first at line 3');
    expect(r.model?.docs.get('tokens/ref/a.tokens.json')?.tokens.get('ref.x')?.node['$value']).toBe(2);
  });

  test('group type, deprecation and locations are recorded per document', () => {
    const r = loadModel(fixtureReader('mini'));
    expect(r.diagnostics).toEqual([]);
    const m = r.model;
    if (m === null) throw new Error('model');
    const base = m.docs.get('tokens/sys/base.tokens.json');
    const compact = m.docs.get('tokens/sys/density/compact.tokens.json');
    // The same group path is untyped in sys/base and typed number in the compact file.
    expect(base?.groupTypes.has('sys.type')).toBe(false);
    expect(compact?.groupTypes.get('sys.type')).toBe('number');
    const role = base?.tokens.get('sys.type.body.md');
    expect(role).toMatchObject({ ownType: 'typography', groupType: null, loc: { file: 'tokens/sys/base.tokens.json', pointer: '/sys/type/body/md' } });
    const color = m.docs.get('tokens/ref/core.tokens.json')?.tokens.get('ref.color.accent.300');
    expect(color).toMatchObject({ ownType: null, groupType: 'color', deprecated: null });
    expect(color?.lines.get('/$value/components/1')).toBeGreaterThan(color?.loc.line ?? 0);
    expect(Object.isFrozen(color?.node)).toBe(true);
    // inline sources get an inline: name and locations in the resolver file
    const inline = m.docs.get('inline:base#2');
    expect(inline?.tokens.get('comp.card.bg')?.loc.file).toBe(RESOLVER);
  });

  test('$deprecated is inherited from the nearest group of the same document', () => {
    const r = loadModel(repo(oneSet([{ $ref: 'ref/a.tokens.json' }]), {
      'tokens/ref/a.tokens.json': { ref: { old: { $deprecated: 'use ref.new', $type: 'number', a: { $value: 1 }, b: { $value: 2, $deprecated: false } } } },
    }));
    const doc = r.model?.docs.get('tokens/ref/a.tokens.json');
    expect(doc?.tokens.get('ref.old.a')?.deprecated).toBe('use ref.new');
    expect(doc?.tokens.get('ref.old.b')?.deprecated).toBeNull();
  });
});

describe('broken fixtures of the model stage', () => {
  for (const c of casesWithPrefix('resolver-', 'source-name-', 'source-export-path', 'source-duplicate-key', 'ref-json-pointer', 'brand-registration', 'brand-schema', 'extension-schema')) {
    test(`${c.name}: ${c.description}`, async () => {
      const { got, want, result } = await runBroken(c);
      expect(got).toEqual(want);
      expect(result.bundle).toBeNull();
      for (const d of result.diagnostics) expect(d.file).toBeTypeOf('string');
    });
  }
  test('"constructor" is reserved for a group and a token alike', async () => {
    const [c] = casesWithPrefix('source-name-reserved');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics.map((d) => [d.code, d.file, d.hint])).toEqual([
      ['source/name-case', 'tokens/ref/dimension.tokens.json', 'reserved: Style Dictionary drops it; rename it and update every reference'],
      ['source/name-case', 'tokens/ref/dimension.tokens.json', 'reserved: Style Dictionary drops it; rename it and update every reference'],
    ]);
    expect(result.diagnostics.map((d) => d.message.split(' is ')[0])).toEqual(['name "constructor" at ref.border.constructor', 'name "constructor" at ref.constructor']);
  });
  test('the expectations are well-formed', () => {
    expect(pairs([{ code: 'a/b', tokenId: 'x' }, { code: 'a/b', tokenId: 'x' }])).toEqual(['a/b|x']);
  });
});
