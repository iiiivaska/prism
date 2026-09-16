// The Markdown report (ARCHITECTURE §10 step 8): ratio to two decimals, threshold, verdict per pair and context.
import { describe, expect, test } from 'vitest';
import { evaluatePair } from './pairs.ts';
import { MAP_LIMITS } from './map.ts';
import { bgCell, formatRatio, mapTable, renderReport, table, thresholdCell } from './report.ts';
import { env, fakeContext, pair } from './test-support.ts';
import { ADR_0011_THRESHOLDS } from './thresholds.ts';

const ctx = fakeContext({ colorScheme: 'light', colors: { 'color.bg.page': '#ffffff', grey: '#777777', ink: '#000000' } });

describe('formatRatio', () => {
  test('two decimals, rounded down, so a failing ratio never displays as its threshold', () => {
    expect(formatRatio(4.4999)).toBe('4.49');
    expect(formatRatio(4.5)).toBe('4.50');
    expect(formatRatio(4.499999999999)).toBe('4.50');   // floating-point noise around an exact 4.5
    expect(formatRatio(21)).toBe('21.00');
  });
});

describe('cells', () => {
  test('bg carries the pair qualifiers and escapes the alternation bar', () => {
    expect(bgCell(pair({ fg: 'a', bg: 'color.bg.a|b', tier: 'boundary' }))).toBe('`color.bg.a\\|b`');
    expect(bgCell(pair({ fg: 'a', bg: 'material.glass.dark.fill', tier: 'functional', backdrops: ['#283126', 'gradient.vivid.*'] })))
      .toBe('`material.glass.dark.fill` over #283126, `gradient.vivid.*`');
    expect(bgCell(pair({ fg: 'a', bg: 'color.bg.tint.info', tier: 'functional', underlays: ['color.bg.page', 'color.bg.surface'] })))
      .toBe('`color.bg.tint.info` on `color.bg.page`, `color.bg.surface`');
    expect(bgCell(pair({ fg: 'a', bg: 'gradient.vivid.*', tier: 'functional', region: 'card-header' }))).toBe('`gradient.vivid.*` region: card-header');
  });

  test('the threshold names the tier and the size that selects it', () => {
    const run = (raw: Record<string, unknown>) => thresholdCell(evaluatePair(pair({ fg: 'grey', bg: 'color.bg.page', ...raw }), ctx, env()));
    expect(run({ tier: 'functional' })).toBe('4.50 functional');
    expect(run({ tier: 'functional', minSizePx: 24 })).toBe('3.00 functional ≥ 24 px');
    expect(run({ tier: 'decorative', minSizePx: 24 })).toBe('3.00 decorative ≥ 24 px');
    expect(run({ tier: 'boundary' })).toBe('3.00 boundary');
  });
});

describe('renderReport', () => {
  const failing = evaluatePair(pair({ fg: 'grey', bg: 'color.bg.page', tier: 'functional' }), ctx, env());
  const passing = evaluatePair(pair({ fg: 'ink', bg: 'color.bg.page', tier: 'functional' }, 1), ctx, env());

  test('a row per evaluation; failures repeated in their own section; problems listed', () => {
    const md = renderReport({
      pairsPath: 'tokens/contrast-pairs.json', thresholds: ADR_0011_THRESHOLDS, pairs: 2, contexts: ['prism/light'],
      evaluations: [failing, passing], problems: [{ where: 'tokens/contrast-pairs.json:9 pairs[3]', message: 'x' }], diagnostics: [],
    });
    expect(md).toContain('2 pairs in 1 contexts');
    expect(md).toContain('### Problems\n\n- `tokens/contrast-pairs.json:9 pairs[3]`: x');
    expect(md).toContain(`### Failures\n\n${table([failing])}`);
    expect(md).toContain('| `grey` | `color.bg.page` | prism/light | 4.47 | 4.50 functional | **FAIL** | #777777 on #ffffff |');
    expect(md).toContain('| `ink` | `color.bg.page` | prism/light | 21.00 | 4.50 functional | pass | #000000 on #ffffff |');
  });

  test('map grounds get their own section: OKLCH L over the land against the scheme\'s limit (ADR-0030 §1.5)', () => {
    const dark = fakeContext({ colorScheme: 'dark', colors: {} });
    const road = { context: dark, id: 'sys.color.map.road', path: 'color.map.road', lightness: 0.2994, hex: '#2c2d30', limit: MAP_LIMITS.dark, pass: true };
    expect(mapTable([road])).toBe([
      '| ground | context | over `color.map.land` | OKLCH L | limit | pass |',
      '|---|---|---|--:|---|---|',
      '| `color.map.road` | prism/dark | #2c2d30 | 0.299 | L <= 0.35 | pass |',
    ].join('\n'));
    const md = renderReport({ pairsPath: 'p.json', thresholds: null, pairs: 1, contexts: [], evaluations: [passing], maps: [road], problems: [], diagnostics: [] });
    expect(md).toContain(`### Map backdrops (ADR-0030 §1.5)\n\n${mapTable([road])}\n\n### All pairs`);
    expect(renderReport({ pairsPath: 'p.json', thresholds: null, pairs: 1, contexts: [], evaluations: [passing], problems: [], diagnostics: [] })).not.toContain('### Map backdrops');
  });

  test('no failure section when everything passes; build diagnostics are shown', () => {
    const md = renderReport({
      pairsPath: 'p.json', thresholds: null, pairs: 1, contexts: [], evaluations: [passing], problems: [],
      diagnostics: [{ code: 'source/missing-file', severity: 'error', message: 'cannot read tokens/x.json', file: 'tokens/prism.resolver.json', line: 3 }],
    });
    expect(md).not.toContain('### Failures');
    expect(md).toContain('### Token build failed');
    expect(md).toContain('tokens/prism.resolver.json:3  source/missing-file  cannot read tokens/x.json');
  });
});
