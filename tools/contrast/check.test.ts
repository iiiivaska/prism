// contrast:check end to end (ARCHITECTURE §14 P1-6): the broken-pair fixture and the fixture gradients that
// break ADR-0022 V1 and V2 exit 1 and name the pair and context; the repository passes, and the CLI exits 0,
// for every brand in all six colorScheme contexts. Style Dictionary runs share a module singleton
// (GroupMessages), so this file never uses test.concurrent.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { fsReader, memoryReader, overlayReader } from '../tokens/api.ts';
import { passed, report, runCheck, type CheckResult } from './check.ts';
import { cardGeometries } from './gradient.ts';
import { contextLabel, type Evaluation } from './pairs.ts';

const fixture = (name: string): string => join(import.meta.dirname, 'fixtures', name);
const cli = join(import.meta.dirname, 'check.ts');
// An empty GITHUB_STEP_SUMMARY keeps the fixture reports out of a CI job's real step summary.
const runCli = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
const label = (e: Evaluation): string => `${e.pair.fg} on ${e.pair.bg}${e.pair.stops !== null ? ' (V1)' : e.pair.region !== null ? ' (V2)' : ''} in ${contextLabel(e.context)}`;
const failing = (r: CheckResult): string[] => r.evaluations.filter((e) => !e.pass).map(label);

/** A fixture tree with some files replaced in memory. */
function patched(name: string, files: Readonly<Record<string, string>>) {
  return overlayReader(fsReader(fixture(name)), memoryReader(files));
}
function json(name: string, path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(fixture(name), path), 'utf8')) as Record<string, unknown>;
}

describe('fixtures (acceptance: fails on a deliberately broken pair and on fixture gradients that break V1 or V2)', () => {
  test('broken-pair: text.secondary on bg.page fails in light, and the CLI exits 1 naming the pair and context', async () => {
    const r = await runCheck({ root: fixture('broken-pair') });
    expect(r.problems).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    expect(failing(r)).toEqual(['color.text.secondary on color.bg.page in light']);
    expect(passed(r)).toBe(false);

    const out = runCli('--root', fixture('broken-pair'));
    expect(out.status).toBe(1);
    expect(out.stdout).toContain('| `color.text.secondary` | `color.bg.page` | light | 2.39 | 4.50 functional | **FAIL** | #9a9ea8 on #f1f2f5 |');
    expect(out.stderr).toContain('FAIL color.text.secondary on color.bg.page in light: 2.39 < 4.50');
  }, 60_000);

  test('--resolver and --pairs are relative to --root; the pairs file defaults to the resolver\'s folder', () => {
    // Brand registration is checked against <root>/brands/, so a fixture runs as its own root (--root).
    const out = runCli('--root', fixture('broken-pair'), '--resolver', 'tokens/prism.resolver.json', '--pairs', 'tokens/contrast-pairs.json');
    expect(out.status).toBe(1);
    expect(out.stdout).toContain('Pairs: `tokens/contrast-pairs.json`. 4 pairs in 2 contexts (every colorScheme context): 8 evaluations, 1 failing, 0 other problems.');
    expect(out.stderr).toContain('FAIL color.text.secondary on color.bg.page in light');
    const missing = runCli('--root', fixture('broken-pair'), '--pairs', 'tokens/none.json');
    expect(missing.status).toBe(1);
    expect(missing.stdout).toContain('- `tokens/none.json`: cannot read tokens/none.json');
  }, 60_000);

  test('gradient-v1: a light end below 3:1 against white fails V1 while the header block passes V2', async () => {
    const r = await runCheck({ root: fixture('gradient-v1') });
    expect(r.problems).toEqual([]);
    expect(failing(r)).toEqual(['color.text.on-vivid on gradient.vivid.* (V1) in light']);
    const v1 = r.evaluations.find((e) => !e.pass);
    expect(v1?.worst).toMatch(/^sys\.gradient\.vivid\.1 stop 2 (srgb|oklab): #ffffff on #b4c6e4$/);
    expect(runCli('--root', fixture('gradient-v1')).status).toBe(1);
  }, 60_000);

  test('gradient-v2: a light top fails the Card header block (V2) while every point holds 3:1 (V1)', async () => {
    const r = await runCheck({ root: fixture('gradient-v2') });
    expect(r.problems).toEqual([]);
    expect(failing(r)).toEqual(['color.text.on-vivid on gradient.vivid.* (V2) in light']);
    expect(r.evaluations.find((e) => !e.pass)?.worst).toMatch(/^sys\.gradient\.vivid\.1 \d+×\d+ p\d+ a\d+ t=0\.\d+ (srgb|oklab): #ffffff on #/);
    expect(runCli('--root', fixture('gradient-v2')).status).toBe(1);
  }, 60_000);

  test('a sys.color.text.* pairsWith without a pair, or without pairsWith at all, fails (tokens/README.md rule 4)', async () => {
    const pairs = json('broken-pair', 'tokens/contrast-pairs.json');
    pairs['pairs'] = (pairs['pairs'] as { fg: string }[]).filter((p) => p.fg !== 'color.text.accent');
    const light = json('broken-pair', 'tokens/sys/color/light.tokens.json');
    const text = ((light['sys'] as Record<string, unknown>)['color'] as Record<string, Record<string, Record<string, unknown>>>)['text'];
    if (text?.['primary'] !== undefined) delete text['primary']['$extensions'];
    const r = await runCheck({
      reader: patched('broken-pair', { 'tokens/contrast-pairs.json': JSON.stringify(pairs), 'tokens/sys/color/light.tokens.json': JSON.stringify(light) }),
    });
    expect(r.problems.map((p) => `${p.where.replace(/:\d+ /, ' ')}: ${p.message}`)).toEqual([
      'tokens/sys/color/light.tokens.json sys.color.text.accent: pairsWith "color.bg.page" has no pair in the pairs file for the light scheme (tokens/README.md rule 4)',
      'tokens/sys/color/light.tokens.json sys.color.text.primary: declares no $extensions["app.prism"].a11y.pairsWith (tokens/README.md rule 4)',
      'tokens/sys/color/dark.tokens.json sys.color.text.accent: pairsWith "color.bg.page" has no pair in the pairs file for the dark scheme (tokens/README.md rule 4)',
    ]);
  }, 60_000);

  test('a vivid gradient that no V1 or V2 pair reaches is a coverage failure (ADR-0022 §4.1)', async () => {
    const pairs = json('gradient-v1', 'tokens/contrast-pairs.json');
    pairs['pairs'] = (pairs['pairs'] as { region?: string }[]).filter((p) => p.region === undefined);
    const r = await runCheck({ reader: patched('gradient-v1', { 'tokens/contrast-pairs.json': JSON.stringify(pairs) }) });
    expect(r.problems.map((p) => p.where)).toEqual(['ref.gradient.vivid.plum', 'ref.gradient.vivid.probe', 'ref.gradient.vivid.sky']);
    expect(r.problems[0]?.message).toMatch(/no "region": "card-header" \(V2\) pair reaches this gradient/);
  }, 60_000);

  test('an invalid pairs file, a broken token build and a usage error', async () => {
    const pairs = json('broken-pair', 'tokens/contrast-pairs.json');
    (pairs['pairs'] as Record<string, unknown>[]).push({ fg: 'color.text.primary', bg: 'color.bg.page', tier: 'functional', stops: 'text-zone' });
    const invalid = await runCheck({ reader: patched('broken-pair', { 'tokens/contrast-pairs.json': JSON.stringify(pairs, null, 2) }) });
    expect(invalid.file).toBeNull();
    expect(invalid.problems.map((p) => p.message)).toEqual([expect.stringMatching(/"stops": "text-zone" is gone/)]);
    expect(passed(invalid)).toBe(false);

    const unknown = await runCheck({ reader: patched('broken-pair', { 'tokens/contrast-pairs.json': JSON.stringify({ ...pairs, pairs: [{ fg: 'color.text.primry', bg: 'color.bg.page', tier: 'functional' }] }) }) });
    expect(unknown.problems[0]?.message).toMatch(/unknown token name "color.text.primry"; did you mean "color.text.primary"/);

    const broken = await runCheck({ root: fixture('broken-pair'), resolver: 'tokens/missing.resolver.json', pairs: 'tokens/contrast-pairs.json' });
    expect(broken.bundle).toBeNull();
    expect(broken.diagnostics.length).toBeGreaterThan(0);
    expect(report(broken)).toContain('### Token build failed');

    expect(runCli('--bogus').status).toBe(2);
    expect(runCli('--root').status).toBe(2);
  }, 60_000);
});

describe('the repository (acceptance: passes on the reference brand; ADR-0020 rule 10: every repo brand)', () => {
  let result: CheckResult;
  beforeAll(async () => {
    result = await runCheck();
  }, 120_000);

  test('every brand in all six colorScheme contexts (ADR-0020 rule 10)', () => {
    expect(result.contexts.map(contextLabel)).toEqual(['prism', 'prism-native'].flatMap((b) => [
      'light', 'dark', 'light-increased-contrast', 'dark-increased-contrast', 'light-reduced-transparency', 'dark-reduced-transparency',
    ].map((s) => `${b}/${s}`)));
  });

  test('every pair in every context its schemes allow; every name resolves; pairsWith and vivid coverage hold', () => {
    const pairs = result.file?.pairs ?? [];
    const expected = pairs.reduce((n, p) => n + (p.schemes === null ? 12 : 6 * p.schemes.length), 0);
    expect(result.evaluations).toHaveLength(expected);
    expect(result.problems).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  // No allowlist: this file asserts exactly what the gated CI step runs (ADR-0020 rule 10; ARCHITECTURE §14
  // P1-6 "the repository exits 0"). A failing pair is fixed in the tokens, never excused here.
  test('every pair passes in every context (acceptance: passes on the reference brand)', () => {
    expect(failing(result)).toEqual([]);
    expect(passed(result)).toBe(true);
  });

  test('the CLI exits 0 on the repository, as the CI step runs it', () => {
    const out = runCli();
    expect(out.stderr).not.toContain('FAIL ');
    expect(out.status).toBe(0);
    expect(out.stderr).toContain(`contrast:check: ${result.evaluations.length} evaluations in 12 contexts pass (ADR-0011)`);
  }, 120_000);

  test('V1 and V2 pass for every vivid gradient of both brands, over the twelve reference geometries (ADR-0022 §4.1)', () => {
    for (const ctx of result.contexts) {
      const geometries = result.bundle === null ? [] : cardGeometries(result.bundle, ctx.permutation);
      expect(geometries.map((g) => `${g.width}×${g.height} p${g.padding} a${g.action}`)).toEqual([
        [16, 32], [24, 40], [24, 48],
      ].flatMap(([p, a]) => ['166×166', '240×240', '320×200', '180×240'].map((s) => `${s} p${p} a${a}`)));
    }
    const vivid = result.evaluations.filter((e) => e.pair.stops !== null || e.pair.region !== null);
    expect(vivid.every((e) => e.pass)).toBe(true);
    for (const brand of ['prism', 'prism-native']) {
      for (const check of ['stops', 'region'] as const) {
        const reached = new Set(vivid.filter((e) => e.context.brand === brand && e.pair[check] !== null).flatMap((e) => e.gradients.flatMap((c) => c.filter((id) => id.startsWith('ref.')))));
        expect([...reached].sort()).toEqual(['ember-night', 'forest-moss', 'navy-cyan', 'olive', 'orchid', 'plum-dusk', 'rose', 'sky'].map((n) => `ref.gradient.vivid.${n}`));
      }
    }
  });

  test('the pairs ADR-0022 §3.3 and critics G-13 and G-14 ask for are in the file', () => {
    const pairs = result.file?.pairs ?? [];
    const find = (fg: string, bg: string, schemes: string[] | null = null) =>
      pairs.find((p) => p.fg === fg && p.bg === bg && JSON.stringify(p.schemes) === JSON.stringify(schemes));
    const darkGlass = ['#283126', '#5B6366', '#959595', 'gradient.vivid.*'];
    for (const fg of ['color.text.on-glass', 'color.text.on-glass-secondary', 'color.text.on-glass-tertiary']) expect(find(fg, 'material.glass.dark.fill')?.backdrops).toEqual(darkGlass);
    for (const bg of ['material.glass.dark.chip', 'material.glass.cell']) expect(find('color.text.on-glass', bg)?.backdrops).toEqual(darkGlass);
    for (const bg of ['material.glass.light.fill', 'material.glass.light.chip']) {
      expect(find('color.text.on-glass-light', bg, ['dark'])?.backdrops).toEqual(['#283126', '#3A3A3A']);
      expect(find('color.text.on-glass-light', bg, ['light'])?.backdrops).toEqual(['#555555', 'gradient.vivid.*']);
    }
    expect(pairs.filter((p) => p.fg === 'color.text.on-vivid').map((p) => [p.stops, p.region, p.minSizePx])).toEqual([['all', null, 24], [null, 'card-header', null]]);
    for (const tone of ['tertiary', 'accent', 'success', 'warning', 'critical', 'info']) expect(find(`color.text.${tone}`, 'color.bg.surface.raised')).toBeDefined();
    expect(find('color.text.on-accent-strong', 'color.bg.fill.accent-strong', ['light'])?.minSizePx).toBeNull();
    expect(find('color.text.on-accent-strong', 'color.bg.fill.accent-strong', ['dark'])?.minSizePx).toBe(24);
    // Critic G-14: the target and comparison lines carry meaning in every scheme (ADR-0007 rule 2, ADR-0011).
    for (const fg of ['target', 'comparison']) expect(find(`color.chart.${fg}`, 'color.chart.plot')?.tier).toBe('boundary');
    // The light now marker is accent.500, a redundant mark that always carries its label or value (visual-dna
    // B3), so the now pair is a dark-only boundary pair; a light now marker that alone carries meaning moves to
    // accent.700 and this pair to both schemes.
    expect(find('color.chart.now', 'color.chart.plot', ['dark'])?.tier).toBe('boundary');
    expect(pairs.filter((p) => p.fg === 'color.chart.now' && (p.schemes === null || p.schemes.includes('light')))).toEqual([]);
    // Every chart pair sits on the plot over the page, a card and a raised surface (the glass fallback).
    const charts = pairs.filter((p) => p.bg === 'color.chart.plot');
    expect(charts.map((p) => p.fg)).toEqual(['axis', 'series.1', 'series.2', 'series.3', 'series.4', 'series.5', 'series.6', 'target', 'comparison', 'now'].map((n) => `color.chart.${n}`));
    for (const p of charts) expect(p.underlays, p.fg).toEqual(['color.bg.page', 'color.bg.surface', 'color.bg.surface.raised']);
  });

  // Coverage gaps recorded for follow-up tickets (not P1-6: adding the pairs today adds failing evaluations).
  test.todo('text on color.bg.surface.nested and .overlay: ADR-0022 §3.1 puts nested in the standard row, but no pairsWith names it and rule 5 omits it (critic G-13 item 5)');
  test.todo('chart relief (critic G-14): a relief field for sub-3:1 series and for redundant marks such as the light chart.now (visual-dna B3), which today is exempt through "schemes": ["dark"]; it needs an ADR (ADR-0011 has no relief tier) and an owning ticket. The chart.plot opacity goes with it (chart tokens, C-10 and C-28)');

  test('the report has one row per evaluation', () => {
    const md = report(result);
    expect(md.startsWith(`Pairs: \`tokens/contrast-pairs.json\`. ${result.file?.pairs.length ?? 0} pairs in 12 contexts (brands prism, prism-native × every colorScheme context)`)).toBe(true);
    const rows = md.split('\n').filter((l) => l.startsWith('| `'));
    expect(rows).toHaveLength(result.evaluations.length + result.evaluations.filter((e) => !e.pass).length);
  });
});
