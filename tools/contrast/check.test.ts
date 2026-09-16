// contrast:check end to end (ARCHITECTURE §14 P1-6, P1-9): the broken-pair fixture, the fixture gradients that
// break ADR-0022 V1 and V2 and the tint over a map road without the page under it (ADR-0030 §1.8) exit 1 and
// name the pair and context; a map ground outside its backdrop limit fails (`map/backdrop-limit`); the
// repository passes, and the CLI exits 0, for every brand in all six colorScheme contexts. Style Dictionary
// runs share a module singleton (GroupMessages), so this file never uses test.concurrent.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { fsReader, memoryReader, overlayReader } from '../tokens/api.ts';
import { passed, report, runCheck, type CheckResult } from './check.ts';
import { cardGeometries } from './gradient.ts';
import { MAP_LIMITS } from './map.ts';
import { contextLabel, type Evaluation } from './pairs.ts';

const fixture = (name: string): string => join(import.meta.dirname, 'fixtures', name);
const cli = join(import.meta.dirname, 'check.ts');
// An empty GITHUB_STEP_SUMMARY keeps the fixture reports out of a CI job's real step summary.
const runCli = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
const label = (e: Evaluation): string => `${e.pair.fg} on ${e.pair.bg}${e.pair.stops !== null ? ' (V1)' : e.pair.region !== null ? ' (V2)' : ''} in ${contextLabel(e.context)}`;
const failing = (r: CheckResult): string[] => r.evaluations.filter((e) => !e.pass).map(label);
/** The map grounds as a token backdrop (ADR-0030 §1.5). */
const MAP = 'color.map.land|block|building|road|road-casing|water|park over color.map.land';

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

  test('broken-tint-on-map: text.critical on bg.tint.critical over the map road without the page underlay fails in dark at 4.04:1 (ADR-0030 §1.8)', async () => {
    const r = await runCheck({ root: fixture('broken-tint-on-map') });
    expect(r.problems).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    expect(failing(r)).toEqual(['color.text.critical on color.bg.tint.critical in dark']);
    const bare = r.evaluations.find((e) => !e.pass);
    expect(bare?.ratio).toBeCloseTo(4.04, 2);
    expect(bare?.worst).toBe('over color.map.road on color.map.land: #ff5a55 on #423032');
    // The same tint with the page painted under it (ADR-0030 §6.2) passes: 5.76:1.
    const paged = r.evaluations.find((e) => e.pass && e.pair.fg === 'color.text.critical' && e.context.scheme === 'dark');
    expect(paged?.ratio).toBeCloseTo(5.76, 2);
    expect(r.maps.map((g) => `${g.path} ${contextLabel(g.context)} ${g.lightness.toFixed(3)}`)).toEqual([
      'color.map.land light 0.961', 'color.map.road light 1.000', 'color.map.land dark 0.164', 'color.map.road dark 0.299',
    ]);
    expect(runCli('--root', fixture('broken-tint-on-map')).status).toBe(1);
  }, 60_000);

  test('map/backdrop-limit: a dark ground lighter than OKLCH L 0.35, or a light one darker than 0.45, fails (ADR-0030 §1.5)', async () => {
    const dark = json('broken-tint-on-map', 'tokens/sys/color/dark.tokens.json');
    const light = json('broken-tint-on-map', 'tokens/sys/color/light.tokens.json');
    const map = (doc: Record<string, unknown>) => ((doc['sys'] as Record<string, unknown>)['color'] as Record<string, Record<string, Record<string, unknown>>>)['map'];
    const darkRoad = map(dark)?.['road'];
    const lightRoad = map(light)?.['road'];
    if (darkRoad !== undefined) darkRoad['$value'] = { colorSpace: 'srgb', components: [1, 1, 1], alpha: 0.3, hex: '#ffffff' };
    if (lightRoad !== undefined) lightRoad['$value'] = '{ref.color.neutral.950}';
    const r = await runCheck({ reader: patched('broken-tint-on-map', { 'tokens/sys/color/dark.tokens.json': JSON.stringify(dark), 'tokens/sys/color/light.tokens.json': JSON.stringify(light) }) });
    expect(r.problems.map((p) => p.message.replace(/ \(.*$/, ''))).toEqual([
      expect.stringMatching(/^map\/backdrop-limit: color\.map\.road composites to #0d0e11/),
      expect.stringMatching(/^map\/backdrop-limit: color\.map\.road composites to #565658/),
    ]);
    expect(r.problems[0]?.message).toContain('light map grounds keep L >= 0.45');
    expect(r.problems[1]?.message).toContain('dark map grounds keep L <= 0.35');
    expect(passed(r)).toBe(false);
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

  test('V1 and V2 pass for every vivid gradient of both brands, the nine reference gradients, over the sixteen reference geometries (ADR-0022 §4.1, ADR-0029 §3.2)', () => {
    for (const ctx of result.contexts) {
      const geometries = result.bundle === null ? [] : cardGeometries(result.bundle, ctx.permutation);
      // compact, regular, comfortable and watch (regular with a 16 px card padding)
      expect(geometries.map((g) => `${g.width}×${g.height} p${g.padding} a${g.action}`)).toEqual([
        [16, 32], [24, 40], [24, 48], [16, 40],
      ].flatMap(([p, a]) => ['166×166', '240×240', '320×200', '180×240'].map((s) => `${s} p${p} a${a}`)));
    }
    const vivid = result.evaluations.filter((e) => e.pair.stops !== null || e.pair.region !== null);
    expect(vivid.every((e) => e.pass)).toBe(true);
    for (const brand of ['prism', 'prism-native']) {
      for (const check of ['stops', 'region'] as const) {
        const reached = new Set(vivid.filter((e) => e.context.brand === brand && e.pair[check] !== null).flatMap((e) => e.gradients.flatMap((c) => c.filter((id) => id.startsWith('ref.')))));
        expect([...reached].sort()).toEqual(['ember-night', 'forest-moss', 'navy-cyan', 'night-lagoon', 'olive', 'orchid', 'plum-dusk', 'rose', 'sky'].map((n) => `ref.gradient.vivid.${n}`));
      }
    }
  });

  test('the pairs ADR-0022 §3.3 and critics G-13 and G-14 ask for are in the file', () => {
    const pairs = result.file?.pairs ?? [];
    const find = (fg: string, bg: string, schemes: string[] | null = null) =>
      pairs.find((p) => p.fg === fg && p.bg === bg && JSON.stringify(p.schemes) === JSON.stringify(schemes));
    // ADR-0029 §2.6: vivid pairs and backdrops name the reference gradients, so ember-night stays checked outside the slots.
    expect(pairs.some((p) => p.bg === 'gradient.vivid.*' || p.backdrops.includes('gradient.vivid.*'))).toBe(false);
    const darkGlass = ['#283126', '#5B6366', '#959595', 'ref.gradient.vivid.*'];
    for (const fg of ['color.text.on-glass', 'color.text.on-glass-secondary', 'color.text.on-glass-tertiary']) expect(find(fg, 'material.glass.dark.fill')?.backdrops).toEqual(darkGlass);
    for (const bg of ['material.glass.dark.chip', 'material.glass.cell']) expect(find('color.text.on-glass', bg)?.backdrops).toEqual(darkGlass);
    for (const bg of ['material.glass.light.fill', 'material.glass.light.chip']) {
      expect(find('color.text.on-glass-light', bg, ['dark'])?.backdrops).toEqual(['#283126', '#3A3A3A', MAP]);
      expect(find('color.text.on-glass-light', bg, ['light'])?.backdrops).toEqual(['#555555', 'ref.gradient.vivid.*']);
    }
    expect(pairs.filter((p) => p.fg === 'color.text.on-vivid').map((p) => [p.bg, p.stops, p.region, p.minSizePx])).toEqual([['ref.gradient.vivid.*', 'all', null, 24], ['ref.gradient.vivid.*', null, 'card-header', null]]);
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
    // Every chart pair sits on the plot over the page, a card and a raised surface (the glass fallback). The
    // accent label of ReferenceLine and RangeBand is text on that plot, so it is color.text.accent there and
    // never the now marker's accent.500.
    const charts = pairs.filter((p) => p.bg === 'color.chart.plot');
    expect(charts.map((p) => p.fg)).toEqual([
      'color.chart.axis', 'color.text.accent',
      ...['series.1', 'series.2', 'series.3', 'series.4', 'series.5', 'series.6', 'target', 'comparison', 'now'].map((n) => `color.chart.${n}`),
    ]);
    expect(find('color.text.accent', 'color.chart.plot')?.tier).toBe('functional');
    for (const p of charts) expect(p.underlays, p.fg).toEqual(['color.bg.page', 'color.bg.surface', 'color.bg.surface.raised']);
  });

  test('the pairs ADR-0029 §1.6–§1.7 and ADR-0030 §1.6, §2.7 and §3 ask for are in the file', () => {
    const pairs = result.file?.pairs ?? [];
    const find = (fg: string, bg: string, schemes: string[] | null = null) =>
      pairs.find((p) => p.fg === fg && p.bg === bg && JSON.stringify(p.schemes) === JSON.stringify(schemes));
    const lightGlass = ['#555555', 'ref.gradient.vivid.*', MAP];
    const darkGlass = ['#283126', '#5B6366', '#959595', 'ref.gradient.vivid.*', MAP];
    // The scheme's glass (ADR-0029 §1.6): the tone table by backdrop kind.
    expect(find('color.text.on-glass-fill', 'material.glass.fill', ['light'])?.backdrops).toEqual(lightGlass);
    for (const tone of ['secondary', 'tertiary']) expect(find(`color.text.on-glass-fill-${tone}`, 'material.glass.fill', ['light'])).toMatchObject({ tier: 'functional', backdrops: [MAP] });
    expect(find('color.text.on-glass-fill-dimmed', 'material.glass.fill', ['light'])).toMatchObject({ tier: 'decorative', minSizePx: 24, backdrops: [MAP] });
    for (const tone of ['media-secondary', 'media-tertiary']) expect(find(`color.text.on-glass-fill-${tone}`, 'material.glass.fill', ['light'])?.backdrops).toEqual(['#555555', 'ref.gradient.vivid.*']);
    for (const tone of ['', '-secondary', '-tertiary', '-dimmed', '-media-secondary', '-media-tertiary']) {
      expect(find(`color.text.on-glass-fill${tone}`, 'material.glass.fill', ['dark'])).toMatchObject({ tier: 'functional', minSizePx: null, backdrops: darkGlass });
    }
    expect(find('color.text.on-glass-fill', 'material.glass.chip', ['light'])?.backdrops).toEqual(lightGlass);
    expect(find('color.text.on-glass-fill', 'material.glass.chip', ['dark'])?.backdrops).toEqual(darkGlass);
    // The scrim (ADR-0029 §1.7).
    expect(find('color.text.on-glass', 'material.glass.scrim')).toMatchObject({ tier: 'functional', minSizePx: 24, backdrops: ['#FFFFFF'] });
    // The map (ADR-0030 §1.6).
    expect(find('color.map.label', 'color.map.land')?.backdrops).toEqual([]);
    for (const g of ['block', 'building', 'road', 'road-casing', 'water', 'park']) expect(find('color.map.label', `color.map.${g}`)).toMatchObject({ tier: 'functional', backdrops: ['color.map.land'] });
    for (const fg of ['route', 'route-ahead']) expect(find(`color.map.${fg}`, 'color.map.route-casing')?.tier).toBe('boundary');
    // Charts on media and on the scheme's glass (ADR-0030 §2.7).
    for (const fg of ['line', 'reference']) {
      expect(find(`color.chart.on-media.${fg}`, 'ref.gradient.vivid.*')).toMatchObject({ tier: 'boundary', stops: 'all' });
      expect(find(`color.chart.on-glass-fill.${fg}`, 'color.chart.on-glass-fill.plot', ['light'])).toMatchObject({ tier: 'boundary', underlays: ['material.glass.fill'], backdrops: lightGlass });
      expect(find(`color.chart.on-glass-fill.${fg}`, 'color.chart.on-glass-fill.plot', ['dark'])).toMatchObject({ tier: 'boundary', underlays: ['material.glass.fill'], backdrops: darkGlass });
    }
    // Solids and the accent on media (ADR-0030 §3).
    expect(find('color.text.on-inverse-media', 'color.bg.fill.inverse-media')?.tier).toBe('functional');
    expect(find('color.text.on-accent-secondary', 'color.bg.fill.accent')?.tier).toBe('functional');
  });

  test('every map ground keeps its backdrop limit in every context (map/backdrop-limit, ADR-0030 §1.5, M1)', () => {
    expect(result.maps).toHaveLength(12 * 7);
    expect(result.maps.every((g) => g.pass)).toBe(true);
    const at = (ctx: string) => Object.fromEntries(result.maps.filter((g) => contextLabel(g.context) === ctx).map((g) => [g.path.replace('color.map.', ''), Number(g.lightness.toFixed(3))]));
    expect(at('prism/light')).toEqual({ block: 0.941, building: 0.909, land: 0.961, park: 0.899, road: 1, 'road-casing': 0.906, water: 0.897 });
    expect(at('prism/dark')).toEqual({ block: 0.192, building: 0.234, land: 0.164, park: 0.242, road: 0.299, 'road-casing': 0.164, water: 0.251 });
    expect(Math.min(...result.maps.filter((g) => g.context.scheme === 'light').map((g) => g.lightness))).toBeGreaterThanOrEqual(MAP_LIMITS.light.min ?? 0);
    expect(Math.max(...result.maps.filter((g) => g.context.scheme === 'dark').map((g) => g.lightness))).toBeLessThanOrEqual(MAP_LIMITS.dark.max ?? 1);
    expect(report(result)).toContain('### Map backdrops (ADR-0030 §1.5)');
  });

  // Coverage gaps recorded for follow-up tickets (not P1-6: adding the pairs today adds failing evaluations).
  test.todo('text on color.bg.surface.nested and .overlay: ADR-0022 §3.1 puts nested in the standard row, but no pairsWith names it and rule 5 omits it (critic G-13 item 5)');
  test.todo('chart relief (critic G-14): a relief field for sub-3:1 series and for redundant marks such as the light chart.now (visual-dna B3), which today is exempt through "schemes": ["dark"]; it needs an ADR (ADR-0011 has no relief tier) and an owning ticket. The chart.plot opacity goes with it (chart tokens, C-10 and C-28)');

  test('the report has one row per evaluation', () => {
    const md = report(result);
    expect(md.startsWith(`Pairs: \`tokens/contrast-pairs.json\`. ${result.file?.pairs.length ?? 0} pairs in 12 contexts (brands prism, prism-native × every colorScheme context)`)).toBe(true);
    const rows = md.split('\n').filter((l) => l.startsWith('| `'));
    expect(rows).toHaveLength(result.evaluations.length + result.evaluations.filter((e) => !e.pass).length + result.maps.length);
  });
});
