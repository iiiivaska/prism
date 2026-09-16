import { describe, expect, test } from 'vitest';
import { BRAND_OVERRIDABLE, OWNERSHIP, SEMANTIC_SLOTS } from '../config.ts';
import { brokenCases, casesWithPrefix, fixtureReader, runBroken } from '../test-support.ts';
import { analyzeSource } from './analyze.ts';
import { loadModel } from './model.ts';
import { memoryReader, overlayReader } from './reader.ts';

describe('config tables (ADR-0020 rule 15: a change needs an ADR and shows up here)', () => {
  test('BRAND_OVERRIDABLE', () => {
    expect(BRAND_OVERRIDABLE).toEqual([
      'ref.color.neutral.0|50|100|150|200|300|400|500|600|700|800|850|900|950|1000',
      'ref.color.accent.50|100|200|300|400|500|600|700|800|900|950',
      'ref.color.slot.light|dark.bg-page|bg-fill-accent|text-on-accent|text-accent',
      'ref.color.series.light|dark.*',
      'ref.gradient.vivid.orchid|olive|rose|sky|ember-night|plum-dusk|forest-moss|navy-cyan|night-lagoon',
      'ref.font.ui|display|mono',
      'ref.font.apple.ui|display|mono',
      'ref.type.scale',
      'ref.radius.1…10',
    ]);
  });

  test('the semantic slot table', () => {
    expect(SEMANTIC_SLOTS).toEqual([
      { slot: 'bg-page', sys: 'sys.color.bg.page', group: 'ref.color.neutral' },
      { slot: 'bg-fill-accent', sys: 'sys.color.bg.fill.accent', group: 'ref.color.accent' },
      { slot: 'text-on-accent', sys: 'sys.color.text.on-accent', group: 'ref.color.neutral' },
      { slot: 'text-accent', sys: 'sys.color.text.accent', group: 'ref.color.accent' },
    ]);
  });

  test('the ownership table (ADR-0024 §9.1)', () => {
    expect(Object.keys(OWNERSHIP)).toEqual(['brand', 'platform', 'colorScheme', 'density', 'modality', 'motion']);
    expect(OWNERSHIP['brand']?.include).toBe(BRAND_OVERRIDABLE);
    expect(OWNERSHIP['density']).toEqual({ include: ['sys.space.**', 'sys.size.**'], exclude: ['sys.size.hit'] });
    // ADR-0030 §7.2: the platform modifier also writes the watch hero size.
    expect(OWNERSHIP['platform']).toEqual({ include: ['sys.font.**', 'sys.type.metric.xl'], exclude: [] });
  });
});

describe('valid fixtures', () => {
  for (const name of ['mini', 'valid']) {
    test(`${name} has no source diagnostics`, () => {
      const { model, diagnostics } = loadModel(fixtureReader(name));
      if (model === null) throw new Error('model');
      expect([...diagnostics, ...analyzeSource(model)]).toEqual([]);
    });
  }
});

const SOURCE_STAGE = [
  'a11y-', 'brand-not-overridable', 'brand-radius-order', 'brand-unknown-path', 'brand-value', 'color-alpha-target', 'color-edge-neutral',
  'color-smoke-chroma',
  'completeness-', 'extension-alias-override', 'font-', 'material-', 'naming-root-default-collision', 'orthogonality-', 'slot-',
  'source-dead-write', 'source-group-deprecated-mismatch', 'source-group-type-conflict', 'source-tier', 'spring-', 'sys-literal',
  'tier-alias-direction', 'type-flag-value', 'type-group-type-mismatch', 'type-role-metadata', 'type-scale-range',
  'type-weight-ladder', 'type-weight-outside-role',
];

describe('broken fixtures of the source checks (each yields exactly its codes and ids)', () => {
  for (const c of casesWithPrefix(...SOURCE_STAGE)) {
    test(`${c.name}: ${c.description}`, async () => {
      const { got, want, result } = await runBroken(c);
      expect(got).toEqual(want);
      expect(result.bundle).toBeNull();
      for (const d of result.diagnostics) {
        expect(d.file, `${d.code} names a file`).toBeTypeOf('string');
        expect(d.message.length).toBeGreaterThan(10);
      }
    });
  }

  test('every broken fixture is covered by one of the stage suites', () => {
    const stages = [
      ...SOURCE_STAGE,
      // source/model.test.ts
      'resolver-', 'source-name-', 'source-export-path', 'source-duplicate-key', 'ref-json-pointer', 'brand-registration',
      'brand-schema', 'extension-schema',
      // engine/sd.test.ts
      'ref-broken', 'ref-cycle', 'ref-group-reference', 'ref-syntax', 'type-untyped', 'type-alias-mismatch', 'value-invalid',
      'tier-sys-literal', 'type-flag-mismatch',
      // ir/typography.test.ts
      'type-thin-weight', 'type-light-weight', 'type-weight-instance', 'type-contrast-floor',
      // ir/analyze.test.ts
      'analysis-', 'motion-reduced-policy', 'gradient-scheme-mismatch', 'gradient-slot-temperature',
      // ir/bundle.test.ts
      'naming-reserved-category',
    ];
    const uncovered = brokenCases().filter((c) => !stages.some((p) => c.name.startsWith(p))).map((c) => c.name);
    expect(uncovered).toEqual([]);
  });

  test('the sys rules follow the id into an inline resolver source (ADR-0020 §3)', () => {
    const base = fixtureReader('mini');
    const resolver = JSON.parse(base.readText('tokens/prism.resolver.json')) as { sets: { base: { sources: Record<string, unknown>[] } } };
    const inline = resolver.sets.base.sources[2];
    if (inline === undefined) throw new Error('fixture');
    inline['sys'] = { color: { hacked: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.6, 0.2, 30], alpha: 1 } } } };
    const { model, diagnostics } = loadModel(overlayReader(base, memoryReader({ 'tokens/prism.resolver.json': JSON.stringify(resolver, null, 2) })));
    if (model === null) throw new Error('model');
    expect(diagnostics).toEqual([]);
    expect(analyzeSource(model).map((d) => [d.code, d.tokenId, d.file])).toEqual([['sys/literal', 'sys.color.hacked', 'tokens/prism.resolver.json']]);
  });

  test('a modifier named like an Object.prototype member has no OWNERSHIP row and is reported, not a crash', () => {
    const { model } = loadModel(memoryReader({
      'tokens/prism.resolver.json': JSON.stringify({
        version: '2025.10',
        sets: { ref: { sources: [{ $ref: 'a.tokens.json' }] } },
        modifiers: { constructor: { contexts: { a: [{ $ref: 'b.tokens.json' }], b: [{ $ref: 'b.tokens.json' }] }, default: 'a' } },
        resolutionOrder: [{ $ref: '#/sets/ref' }, { $ref: '#/modifiers/constructor' }],
      }),
      'tokens/a.tokens.json': JSON.stringify({ ref: { x: { $type: 'number', $value: 1 } } }),
      'tokens/b.tokens.json': JSON.stringify({ sys: { y: { $type: 'number', $value: 1 } } }),
    }));
    if (model === null) throw new Error('model');
    expect(analyzeSource(model).map((d) => [d.code, d.tokenId])).toEqual([['orthogonality/ownership', 'sys.y']]);
  });

  test('an alias of a token that a later layer retypes has the later type (no false type/group-type-mismatch)', () => {
    const { model } = loadModel(memoryReader({
      'tokens/prism.resolver.json': JSON.stringify({
        version: '2025.10',
        sets: { a: { sources: [{ $ref: 'a.tokens.json' }] }, b: { sources: [{ $ref: 'b.tokens.json' }] } },
        modifiers: {},
        resolutionOrder: [{ $ref: '#/sets/a' }, { $ref: '#/sets/b' }],
      }),
      // ref.g is typed number; set b replaces the dimension ref.g.retyped with a number wholesale
      'tokens/a.tokens.json': JSON.stringify({ ref: { g: { $type: 'number', retyped: { $type: 'dimension', $value: { value: 4, unit: 'px' } }, 'alias-to-retyped': { $value: '{ref.g.retyped}' } } } }),
      'tokens/b.tokens.json': JSON.stringify({ ref: { g: { retyped: { $type: 'number', $value: 5 } } } }),
    }));
    if (model === null) throw new Error('model');
    expect(analyzeSource(model).map((d) => [d.code, d.tokenId])).toEqual([['source/dead-write', 'ref.g.retyped']]);
  });

  test('a diagnostic names the fix where it is mechanical', async () => {
    const [c] = casesWithPrefix('slot-mapping');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'slot/mapping',
      file: 'tokens/sys/color/light.tokens.json',
      hint: 'write {ref.color.slot.light.bg-page}',
    });
    expect(result.diagnostics[0]?.line).toBeGreaterThan(1);
  });
});
