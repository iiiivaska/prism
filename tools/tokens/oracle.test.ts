// Terrazzo as a test oracle (ARCHITECTURE §5.3, §14 P1-3): for the default permutation and every
// single-axis variation, Prism's IR equals `@terrazzo/parser`'s `resolver.apply(input)` after both are
// projected to their DTCG semantics. The typography weight rule, the brand type scale and
// app.prism.alpha are Prism's own and are excluded. The repository run lives in repo.test.ts.
// Style Dictionary runs share a module singleton (GroupMessages), so this file never uses test.concurrent.
import { describe, expect, test } from 'vitest';
import { runPermutation } from './engine/sd.ts';
import { buildBundle } from './ir/bundle.ts';
import { merge } from './resolver.ts';
import { loadModel } from './source/model.ts';
import { FIXTURES, fixtureReader, terrazzoOracle, terrazzoResolver, terrazzoValue, type TerrazzoToken } from './test-support.ts';

describe('Terrazzo oracle', () => {
  test('the valid fixture agrees with Terrazzo on every value of 11 inputs', async () => {
    const bundle = await buildBundle({ reader: fixtureReader('valid') });
    const result = await terrazzoOracle(`${FIXTURES}valid`, bundle);
    expect(result.differences).toEqual([]);
    expect(result.inputs).toBe(11);
    expect(result.compared).toBeGreaterThan(1000);
  });

  test('the oracle follows aliasOf where Terrazzo 2.7.1 leaves an alias of a 0-valued number unresolved (ARCHITECTURE §15 F42)', () => {
    const tokens: Record<string, TerrazzoToken> = {
      'sys.a.grain': { $type: 'number', $value: 0 },
      'sys.b.grain': { $type: 'number', $value: '{sys.a.grain}', aliasOf: 'sys.a.grain' },
      'sys.c.grain': { $type: 'number', $value: '{sys.b.grain}', aliasOf: 'sys.b.grain' },
      'sys.d.saturate': { $type: 'number', $value: 1.1, aliasOf: 'sys.a.grain' },
    };
    expect(terrazzoValue(tokens, tokens['sys.c.grain'] as TerrazzoToken)).toBe(0);
    expect(terrazzoValue(tokens, tokens['sys.d.saturate'] as TerrazzoToken)).toBe(1.1);   // a resolved value is taken as it is
  });

  test('merge-semantics documents the one known divergence: Terrazzo deep-merges object values, Prism replaces the token', async () => {
    // Terrazzo: the redeclared ref.color.brand keeps the hex, $description and $extensions of first.tokens.json.
    const tz = (await terrazzoResolver(`${FIXTURES}merge-semantics`)).apply({});
    const brand = tz['ref.color.brand'];
    expect(brand?.$value).toEqual({ colorSpace: 'srgb', components: [0, 0, 0], alpha: 1, hex: '#f39444' });
    expect(brand?.$description).toBe('declared first');
    expect(brand?.$extensions).toEqual({ 'app.prism': { a11y: { pairsWith: ['ref.color.paper'] } } });
    // Prism (DTCG Resolver §4.1.4): the later token replaces the earlier one wholesale.
    const { model } = loadModel(fixtureReader('merge-semantics'));
    if (model === null) throw new Error('model');
    const merged = merge(model, {});
    const ir = await runPermutation(merged.tree, { key: '', input: {}, model, provenance: merged.provenance, diagnostics: [] });
    const own = ir.tokens.get('ref.color.brand');
    expect(own?.raw).toEqual({ colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 });
    expect(own?.value).toMatchObject({ kind: 'color', hex: '#000000' });
    expect(own?.description).toBeNull();
    expect(own?.metadata).toEqual({});
    // Arrays agree: both engines replace the two-layer shadow with the one-layer shadow.
    expect(tz['ref.elevation.card']?.$value).toHaveLength(1);
    expect(ir.tokens.get('ref.elevation.card')?.value).toMatchObject({ kind: 'shadow', layers: [{ kind: 'shadowLayer' }] });
  });
});
