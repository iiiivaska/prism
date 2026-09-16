// Style Dictionary runs share a module singleton (GroupMessages), so this file never uses test.concurrent.
import { describe, expect, test } from 'vitest';
import { casesWithPrefix, fixtureReader, runBroken } from '../test-support.ts';
import { unionShapes } from './analyze.ts';
import { buildBundle } from './bundle.ts';
import type { Analysis, TokenDeps } from './types.ts';

describe('analysis of the valid fixtures', () => {
  test('mini: one scope, every token on at most one runtime axis, the composition proof over all 12 permutations', async () => {
    const b = await buildBundle({ reader: fixtureReader('mini') });
    expect(b.analysis.complete).toBe(true);
    const [scope] = [...b.analysis.scopes.values()];
    if (scope === undefined) throw new Error('scope');
    const tokens = b.permutations.values().next().value?.tokens.size ?? 0;
    expect(scope.proof).toEqual({ permutations: 12, comparisons: 12 * tokens });
    expect(scope.deps.get('sys.space.card-padding')?.axes).toEqual(['density']);
    expect(scope.deps.get('comp.button.motion.press')?.axes).toEqual(['motion']);
    expect(scope.deps.get('ref.type.metric.xl')?.axes).toEqual(['colorScheme']);   // the dark weight (ADR-0021 §4)
    expect(scope.deps.get('sys.color.text.on-accent')?.axes).toEqual([]);          // neutral.950 in both schemes
    for (const d of scope.deps.values()) expect(d.axes.length).toBeLessThanOrEqual(1);
  });

  test('valid: four scopes (brand × platform), increased-contrast deltas per base scheme, no transparency delta', async () => {
    const b = await buildBundle({ reader: fixtureReader('valid') });
    expect([...b.analysis.scopes.keys()]).toEqual([
      'brand=prism|platform=apple', 'brand=prism|platform=web', 'brand=alt|platform=apple', 'brand=alt|platform=web',
    ]);
    const web = b.analysis.scopes.get('brand=prism|platform=web');
    expect(web?.deps.get('sys.color.text.secondary')).toEqual({ axes: ['colorScheme'], increasedContrast: ['light', 'dark'], reducedTransparency: [] });
    expect(web?.deps.get('sys.color.text.accent')?.increasedContrast).toEqual(['light']);
    expect(web?.deps.get('sys.type.metric.xl')?.increasedContrast).toEqual(['light', 'dark']);
    expect([...(web?.deps.values() ?? [])].some((d) => d.reducedTransparency.length > 0)).toBe(false);
    const union = unionShapes(b.analysis, ['web']);
    expect(union.get('sys.interaction.hover')?.axes).toEqual(['modality']);
    expect([...union.keys()][0]).toBe('ref.blur.chip');   // canonical order (§12)
  });
});

describe('unionShapes', () => {
  test('the union over brands keeps the axis order of RUNTIME_AXES and the scheme order', () => {
    const deps = (axes: TokenDeps['axes'], ic: TokenDeps['increasedContrast']): TokenDeps => ({ axes, increasedContrast: ic, reducedTransparency: [] });
    const analysis: Analysis = {
      complete: true,
      scopes: new Map([
        ['brand=a|platform=web', { input: { brand: 'a', platform: 'web' }, deps: new Map([['sys.x', deps(['density'], ['dark'])]]), proof: { permutations: 1, comparisons: 1 } }],
        ['brand=b|platform=web', { input: { brand: 'b', platform: 'web' }, deps: new Map([['sys.x', deps(['colorScheme'], ['light'])]]), proof: { permutations: 1, comparisons: 1 } }],
        ['brand=a|platform=apple', { input: { brand: 'a', platform: 'apple' }, deps: new Map([['sys.x', deps([], [])]]), proof: { permutations: 1, comparisons: 1 } }],
      ]),
    };
    expect(unionShapes(analysis, ['web']).get('sys.x')).toEqual({ axes: ['colorScheme', 'density'], increasedContrast: ['light', 'dark'], reducedTransparency: [] });
    expect(unionShapes(analysis, ['apple']).get('sys.x')?.axes).toEqual([]);
  });
});

describe('broken fixtures of the IR analysis (§5.7)', () => {
  for (const c of casesWithPrefix('analysis-', 'motion-reduced-policy', 'gradient-scheme-mismatch', 'gradient-slot-temperature')) {
    test(`${c.name}: ${c.description}`, async () => {
      const { got, want } = await runBroken(c);
      expect(got).toEqual(want);
    });
  }

  test('a masked interaction fails only in the composition proof', async () => {
    const [c] = casesWithPrefix('analysis-composition');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['analysis/composition']);
    expect(result.diagnostics[0]?.message).toContain('sys.space.card-padding → sys.material.glass.dark.fill.blur → ref.blur.chip');
  });

  test('the slot temperature names both slots, their gradients and temperatures (ADR-0029 §2.5)', async () => {
    const [c] = casesWithPrefix('gradient-slot-temperature');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['gradient/slot-temperature', 'gradient/slot-temperature']);   // once per brand
    expect(result.diagnostics[0]?.message).toContain('sys.gradient.vivid.1 (ref.gradient.vivid.sky, cool) and sys.gradient.vivid.2 (ref.gradient.vivid.rose, warm) form a slot pair of mixed temperature');
  });

  test('the motion policy names the token and the field', async () => {
    const [c] = casesWithPrefix('motion-reduced-policy');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics.map((d) => d.message)).toEqual(expect.arrayContaining([expect.stringContaining('bounce 0.1 under Reduce Motion')]));
  });
});
