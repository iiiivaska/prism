import { describe, expect, test } from 'vitest';
import { casesWithPrefix, runBroken } from '../test-support.ts';
import type { IRTypography } from './types.ts';
import { applyWeightRule, boldWeightOf, schemeOf } from './typography.ts';

function role(weight: number, darkWeight: number | null = null): IRTypography {
  return {
    kind: 'typography',
    fontFamily: { kind: 'fontFamily', families: ['Onest'], opsz: null },
    fontSize: { kind: 'dimension', value: 48, unit: 'px', px: 48 },
    fontWeight: { kind: 'fontWeight', weight },
    boldWeight: boldWeightOf(weight),
    darkWeight,
    lineHeight: 1,
    letterSpacing: { kind: 'dimension', value: 0, unit: 'px', px: 0 },
    slot: 'display',
    numeric: 'proportional',
    textStyle: 'largeTitle',
  };
}
const weights = (t: IRTypography) => [t.fontWeight.weight, t.boldWeight];

describe('ADR-0021 §3 table', () => {
  // s → [Increase Contrast, Bold Text]
  const TABLE: [number, number, number][] = [
    [100, 400, 400], [200, 400, 400], [300, 400, 400],
    [400, 400, 600], [500, 500, 700],
    [600, 600, 800], [700, 700, 900], [800, 800, 900], [900, 900, 900],
  ];
  for (const [s, ic, bold] of TABLE) {
    test(`s = ${s}: standard ${s}, Increase Contrast ${ic}, Bold Text ${bold}`, () => {
      expect(weights(applyWeightRule(role(s), schemeOf('light')))).toEqual([s, bold]);
      expect(weights(applyWeightRule(role(s), schemeOf('light-increased-contrast')))).toEqual([ic, bold]);
      expect(boldWeightOf(s)).toBe(bold);
    });
  }

  test('the dark weight renders in the dark and dark-reduced-transparency contexts, floored under Increase Contrast', () => {
    const metric = role(300, 200);
    expect(weights(applyWeightRule(metric, schemeOf('light')))).toEqual([300, 400]);
    expect(weights(applyWeightRule(metric, schemeOf('dark')))).toEqual([200, 400]);
    expect(weights(applyWeightRule(metric, schemeOf('dark-reduced-transparency')))).toEqual([200, 400]);
    expect(weights(applyWeightRule(metric, schemeOf('dark-increased-contrast')))).toEqual([400, 400]);
    expect(weights(applyWeightRule(metric, schemeOf('light-reduced-transparency')))).toEqual([300, 400]);
  });

  test('Bold Text is computed from s, never from the Increase Contrast result', () => {
    expect(applyWeightRule(role(300), schemeOf('light-increased-contrast')).boldWeight).toBe(400);
    expect(applyWeightRule(role(500), schemeOf('dark-increased-contrast')).boldWeight).toBe(700);
  });

  test('schemeOf reads the base scheme and the variant from a colorScheme context name', () => {
    expect(schemeOf('dark-increased-contrast')).toEqual({ base: 'dark', variant: 'increasedContrast' });
    expect(schemeOf('light-reduced-transparency')).toEqual({ base: 'light', variant: 'reducedTransparency' });
    expect(schemeOf('light')).toEqual({ base: 'light', variant: 'none' });
    expect(schemeOf(undefined)).toEqual({ base: null, variant: 'none' });
  });
});

describe('broken fixtures of the typography rule (ADR-0021 rules 2–4)', () => {
  for (const c of casesWithPrefix('type-thin-weight', 'type-light-weight', 'type-weight-instance', 'type-contrast-floor')) {
    test(`${c.name}: ${c.description}`, async () => {
      const { got, want, result } = await runBroken(c);
      expect(got).toEqual(want);
      expect(result.diagnostics.every((d) => d.permutation !== undefined && d.file !== undefined)).toBe(true);
    });
  }

  test('the thin-weight threshold applies after the brand type scale', async () => {
    const [c] = casesWithPrefix('type-thin-weight');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    // 30 px in the reference brand and 33 px in the alt brand (scale 1.1): both below 34 px
    expect(result.diagnostics.map((d) => /at ([\d.]+) px/.exec(d.message)?.[1]).sort()).toEqual(['30', '33']);
  });
});
