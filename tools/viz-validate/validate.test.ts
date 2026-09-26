// viz:validate end to end (roadmap P4-49): every check fails its own fixture tree and nothing else, the relief
// declaration is read from the tree, the checks cannot be skipped by a palette they cannot read, the repository
// passes with the seeded slots' findings owed to P4-50 and nothing more, and the CLI's exit codes. Style
// Dictionary runs share a module singleton, so this file never uses test.concurrent.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { fsReader, memoryReader, overlayReader, REPO_ROOT, type SourceReader } from '../tokens/api.ts';
import { CHECKS } from './checks.ts';
import { OWED, PLOT, PLOT_UNDERLAYS, SERIES } from './config.ts';
import { caseReader, FIXTURES, materialize } from './test-support.ts';
import { passed, runValidate, staleOwed, type ValidateResult } from './validate.ts';

const cli = join(import.meta.dirname, 'validate.ts');
// An empty GITHUB_STEP_SUMMARY keeps the fixture reports out of a CI job's real step summary.
const runCli = (args: readonly string[], summary = '') =>
  spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: summary } });

const keys = (r: ValidateResult): string[] => [...new Set(r.findings.map((f) => f.key))];
/** A fixture case with some files replaced, or removed, in memory. */
const patched = (name: string, files: Readonly<Record<string, string>>, removed: readonly string[] = []): SourceReader =>
  overlayReader(caseReader(name), memoryReader(files), removed);
const json = (path: string): Record<string, unknown> => JSON.parse(readFileSync(join(FIXTURES, 'base', path), 'utf8')) as Record<string, unknown>;
const RELIEF = 'tokens/viz-relief.json';
const LIGHT = 'tokens/sys/color/light.tokens.json';
const DARK = 'tokens/sys/color/dark.tokens.json';

type Chart = Record<string, Record<string, unknown>>;

/** The base's scheme file, with its chart group edited. */
function schemeWith(path: string, edit: (chart: Chart, scheme: string) => void): string {
  const file = json(path) as { sys: { color: { chart: Chart } } };
  edit(file.sys.color.chart, path === LIGHT ? 'light' : 'dark');
  return JSON.stringify(file);
}

/** Both scheme files edited alike: every permutation of a tree declares the same ids. */
function schemesWith(edit: (chart: Chart, scheme: string) => void): Record<string, string> {
  return { [LIGHT]: schemeWith(LIGHT, edit), [DARK]: schemeWith(DARK, edit) };
}

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});
function tree(name: string): string {
  const dir = materialize(name);
  temps.push(dir);
  return dir;
}

describe('one failing fixture per check (acceptance)', () => {
  const expected: Readonly<Record<(typeof CHECKS)[number], readonly string[]>> = {
    'hue-anchor': ['hue-anchor all slot 3 #008300 #c98500'],
    band: ['band dark slot 2 #6da7ec'],
    chroma: ['chroma light slot 2 #4d6c99'],
    cvd: ['cvd light slots 2–3 #eb6834 #008300', 'cvd dark slots 2–3 #d95926 #008300'],
    normal: ['normal light slots 3–4 #008300 #0ca30c', 'normal dark slots 3–4 #008300 #43a047'],
    contrast: ['contrast light slot 3 #1baf7a'],
  };

  test('every check has a fixture folder, and the base passes all six', async () => {
    const folders = fsReader(FIXTURES).list('').filter((e) => e.dir).map((e) => e.name);
    for (const check of CHECKS) expect(folders).toContain(check);
    const base = await runValidate({ reader: caseReader('base'), owed: [] });
    expect(base.diagnostics).toEqual([]);
    expect(base.problems).toEqual([]);
    expect(base.palettes.map((p) => [p.colorScheme, p.slots.length])).toEqual([['light', 4], ['dark', 4]]);
    expect(base.findings).toEqual([]);
    expect(passed(base)).toBe(true);
  });

  for (const check of CHECKS) {
    test(`${check}: its fixture fails check ${CHECKS.indexOf(check) + 1} and no other`, async () => {
      const r = await runValidate({ reader: caseReader(check), owed: [] });
      expect(r.diagnostics).toEqual([]);
      expect(r.problems).toEqual([]);
      expect(keys(r)).toEqual(expected[check]);
      expect(r.findings.every((f) => f.check === check && !f.owed)).toBe(true);
      expect(passed(r)).toBe(false);
    });
  }

  test('now: the now marker aliased to dark slot 2 fails checks 4 and 5 against it, and against slot 4, which slot 2 need not clear (ADR-0020 §4, critic C-10)', async () => {
    const r = await runValidate({ reader: caseReader('now'), owed: [] });
    expect(r.problems).toEqual([]);
    expect(keys(r)).toEqual([
      'cvd dark now–slot 2 #3987e5 #3987e5', 'normal dark now–slot 2 #3987e5 #3987e5',
      'cvd dark now–slot 4 #3987e5 #9085e9', 'normal dark now–slot 4 #3987e5 #9085e9',
    ]);
    // The same blue as slot 2 passes beside violet in the base, because slots 2 and 4 are not adjacent.
    const base = await runValidate({ reader: caseReader('base'), owed: [] });
    expect(base.measures.find((m) => m.palette.scheme === 'dark')?.adjacent.map((p) => p.subject)).toEqual(['slots 1–2', 'slots 2–3', 'slots 3–4']);
  });
});

describe('the relief declaration: direct labels, or the table twin (acceptance)', () => {
  const both = ['contrast light slot 3 #1baf7a', 'cvd light slots 3–4 #1baf7a #e34948'];
  const declare = (...declarations: readonly Record<string, unknown>[]): Record<string, string> => ({ [RELIEF]: JSON.stringify({ declarations }) });

  test('as declared, light slot 3 passes on the table twin and slots 3 and 4 on their direct labels', async () => {
    const r = await runValidate({ reader: caseReader('relief'), owed: [] });
    expect(r.reliefPresent).toBe(true);
    expect(r.relief?.declarations).toHaveLength(2);
    expect(r.problems).toEqual([]);
    expect(r.findings).toEqual([]);
    const light = r.measures.find((m) => m.palette.scheme === 'light');
    expect(light?.slots[2]?.contrast).toBe('relieved');
    expect(light?.slots[2]?.reliefs).toEqual(['table-twin', 'direct-labels']);
    expect(light?.adjacent[2]?.cvdVerdict).toBe('relieved');
    expect(passed(r)).toBe(true);
  });

  test('without the file both fail; a table twin alone leaves the CVD pair failing; labels on one slot of the pair do not carry it', async () => {
    expect(keys(await runValidate({ reader: patched('relief', {}, [RELIEF]), owed: [] }))).toEqual(both);
    expect(keys(await runValidate({ reader: patched('relief', declare({ relief: 'table-twin', slots: [3, 4] })), owed: [] }))).toEqual([both[1]]);
    expect(keys(await runValidate({ reader: patched('relief', declare({ relief: 'direct-labels', slots: [3] })), owed: [] }))).toEqual([both[1]]);
    expect(keys(await runValidate({ reader: patched('relief', declare({ relief: 'direct-labels', slots: [3, 4] })), owed: [] }))).toEqual([]);
  });

  test('a declaration reaches only its schemes, and --relief moves the file', async () => {
    const dark = declare({ relief: 'direct-labels', slots: [3, 4], schemes: ['dark'] });
    expect(keys(await runValidate({ reader: patched('relief', dark), owed: [] }))).toEqual(both);
    const moved = await runValidate({ reader: patched('relief', { 'elsewhere/relief.json': readFileSync(join(FIXTURES, 'relief', RELIEF), 'utf8') }, [RELIEF]), relief: 'elsewhere/relief.json', owed: [] });
    expect([moved.reliefPath, moved.reliefPresent, keys(moved)]).toEqual(['elsewhere/relief.json', true, []]);
  });

  test('an invalid file, a slot the palette lacks and an unknown brand are problems, and relieve nothing', async () => {
    const invalid = await runValidate({ reader: patched('relief', { [RELIEF]: '{"declarations": [{"relief": "legend", "slots": [3]}]}' }), owed: [] });
    expect(invalid.problems).toEqual([{ where: RELIEF, message: 'declarations[0]: "relief" must be "direct-labels" or "table-twin", not "legend"' }]);
    expect(keys(invalid)).toEqual(both);
    expect(passed(invalid)).toBe(false);
    const names = await runValidate({ reader: patched('relief', declare({ relief: 'table-twin', slots: [3, 9] }, { relief: 'direct-labels', slots: [3, 4], brands: ['prism'] })), owed: [] });
    expect(names.problems).toEqual([
      { where: `${RELIEF} declarations[0]`, message: 'slot 9 is no series slot; there are 4' },
      { where: `${RELIEF} declarations[1]`, message: 'brand "prism" is not a brand of the resolver; the resolver has no brand modifier' },
    ]);
    expect(keys(names)).toEqual([both[1]]);
  });
});

describe('a palette the checks cannot read fails the run instead of passing it', () => {
  test('a gap in the slot numbers, a translucent slot and a missing now marker are problems', async () => {
    const gap = await runValidate({ reader: patched('base', schemesWith((c) => { delete c['series']?.['3']; })), owed: [] });
    expect(gap.diagnostics).toEqual([]);
    expect(gap.problems).toEqual(['light', 'dark'].map((where) => ({ where, message: 'the series slots must be numbered 1…N without a gap; sys.color.chart.series.4 is slot 4, where 3 is expected' })));
    expect(passed(gap)).toBe(false);
    const alpha = { [LIGHT]: schemeWith(LIGHT, (c) => { if (c['series'] !== undefined) c['series']['1'] = { $value: '{ref.color.series.light.1}', $extensions: { 'app.prism': { alpha: 0.5 } } }; }) };
    const translucent = await runValidate({ reader: patched('base', alpha), owed: [] });
    expect(translucent.problems).toEqual([{ where: 'light', message: 'sys.color.chart.series.1 is translucent (alpha 0.5); a series slot is an opaque color (ADR-0020 §1)' }]);
    expect(translucent.palettes.map((p) => p.colorScheme)).toEqual(['dark']);
    const noNow = await runValidate({ reader: patched('base', schemesWith((c) => { delete c['now']; })), owed: [] });
    expect(noNow.diagnostics).toEqual([]);
    expect(noNow.problems.map((p) => [p.where, p.message.split(':')[0]])).toEqual([['light', 'color.chart.now'], ['dark', 'color.chart.now']]);
    expect(passed(noNow)).toBe(false);
  });

  test('an id under the series group that is no slot number is left out and said so', async () => {
    const other = await runValidate({ reader: patched('base', schemesWith((c) => { if (c['series'] !== undefined) c['series']['other'] = { $value: '{ref.color.neutral.950}' }; })), owed: [] });
    expect(other.diagnostics).toEqual([]);
    expect(other.problems).toEqual([]);
    expect(other.ignored).toEqual(['sys.color.chart.series.other']);
    expect(other.palettes.map((p) => p.slots.length)).toEqual([4, 4]);
    expect(passed(other)).toBe(true);
  });

  test('a token build that fails is reported, and the run fails', async () => {
    const broken = await runValidate({ reader: patched('base', schemesWith((c, scheme) => { if (c['series'] !== undefined) c['series']['1'] = { $value: `{ref.color.series.${scheme}.9}` }; })), owed: [] });
    expect(broken.diagnostics.length).toBeGreaterThan(0);
    expect(broken.palettes).toEqual([]);
    expect(passed(broken)).toBe(false);
  });
});

describe('the repository', () => {
  let repo: ValidateResult;
  beforeAll(async () => {
    repo = await runValidate();
  }, 300_000);

  test('every brand in all six colorScheme contexts: twelve palettes of six slots, and it passes', () => {
    expect(repo.diagnostics).toEqual([]);
    expect(repo.problems).toEqual([]);
    const schemes = ['light', 'dark', 'light-increased-contrast', 'dark-increased-contrast', 'light-reduced-transparency', 'dark-reduced-transparency'];
    expect(repo.palettes.map((p) => `${p.brand}/${p.colorScheme}`)).toEqual(['prism', 'prism-native'].flatMap((b) => schemes.map((c) => `${b}/${c}`)));
    expect(repo.palettes.every((p) => p.slots.length === 6 && p.now !== null)).toBe(true);
    expect(passed(repo)).toBe(true);
  });

  test('its findings are the owed ones, each found for both brands in every context of its scheme', () => {
    expect(repo.findings.every((f) => f.owed)).toBe(true);
    expect(keys(repo).sort()).toEqual([...OWED].sort());
    for (const key of OWED) {
      const found = repo.findings.filter((f) => f.key === key);
      const scheme = key.split(' ')[1];
      const expected = scheme === 'all' ? 6 : 3;
      for (const brand of ['prism', 'prism-native']) expect(found.filter((f) => f.brand === brand).flatMap((f) => f.contexts), `${key} in ${brand}`).toHaveLength(expected);
    }
  });

  test('the owed findings only shrink: each is one the first run recorded, and each is still found', () => {
    // The first run on the seeded slots, 2026-09-26 (README.md, "First run"). OWED is what is left of it: it loses
    // an entry in the change that fixes it, which is P4-50's, and gains none.
    const recorded = [
      'hue-anchor all slot 1 #0d0e11 #ffffff',
      'band light slot 1 #0d0e11', 'chroma light slot 1 #0d0e11', 'band dark slot 1 #ffffff', 'chroma dark slot 1 #ffffff',
      'band dark slot 2 #f39444', 'band dark slot 4 #5bc8b5', 'band dark slot 5 #d48bd0', 'band dark slot 6 #d9c27a',
      'chroma light slot 4 #1f8f80', 'chroma dark slot 6 #d9c27a',
      'cvd dark now–slot 2 #f39444 #f39444', 'normal dark now–slot 2 #f39444 #f39444',
      'cvd light slots 4–5 #1f8f80 #a64fa3', 'cvd dark slots 4–5 #5bc8b5 #d48bd0',
      'cvd dark now–slot 6 #f39444 #d9c27a', 'normal dark now–slot 6 #f39444 #d9c27a',
    ];
    expect(recorded).toHaveLength(17);
    const problems: string[] = [];
    for (const key of OWED) if (!recorded.includes(key)) problems.push(`${key} is no finding the first run recorded: a new finding fails the gate and never joins OWED`);
    for (const key of staleOwed(repo)) problems.push(`${key} is no longer found: remove it from OWED`);
    expect(problems).toEqual([]);
    expect(new Set(OWED).size).toBe(OWED.length);
  });

  test("check 6 measures the grounds contrast:check measures: the series pairs' plot, tier and underlays", () => {
    const pairs = (JSON.parse(readFileSync(join(REPO_ROOT, 'tokens/contrast-pairs.json'), 'utf8')) as { pairs: { fg: string; bg: string; tier: string; underlays?: string[] }[] }).pairs;
    const series = pairs.filter((p) => /^color\.chart\.series\.\d+$/.test(p.fg));
    expect(series.map((p) => p.fg)).toEqual(repo.palettes[0]?.slots.map((_, i) => SERIES.replace('*', String(i + 1))));
    for (const p of series) expect([p.bg, p.tier, p.underlays]).toEqual([PLOT, 'boundary', PLOT_UNDERLAYS]);
  });
});

describe('the CLI', () => {
  test('exit 0 on a passing tree, 1 on a finding with its key, and 2 on a usage error', () => {
    const ok = runCli(['--root', tree('base')]);
    expect(ok.status).toBe(0);
    expect(ok.stderr).toContain('viz:validate: 2 palettes pass; 0 finding(s) of the seeded slots owed to P4-50, none new');
    const bad = runCli(['--root', tree('contrast')]);
    expect(bad.status).toBe(1);
    expect(bad.stdout).toContain('| 6 contrast | light | slot 3 | `#1baf7a` | 2.81:1 (on color.bg.page: #1baf7a on #ffffff) | ≥ 3:1, or a declared relief | light | **FAIL** |');
    expect(bad.stderr).toContain('FAIL contrast light slot 3 #1baf7a in light: 2.81:1');
    expect(runCli(['--bogus']).status).toBe(2);
    expect(runCli(['--root']).status).toBe(2);
  });

  test('--json prints the run, and --relief is read relative to --root', () => {
    const relief = tree('relief');
    const out = runCli(['--root', relief, '--json']);
    expect(out.status).toBe(0);
    const run = JSON.parse(out.stdout) as { passed: boolean; relief: { path: string; present: boolean }; measures: unknown[]; findings: unknown[] };
    expect([run.passed, run.relief.path, run.relief.present, run.measures.length, run.findings]).toEqual([true, RELIEF, true, 2, []]);
    const moved = runCli(['--root', relief, '--relief', 'tokens/none.json']);
    expect(moved.status).toBe(1);
    expect(moved.stdout).toContain('Relief: `tokens/none.json` is absent, so no slot declares a relief.');
  });

  test('the report is appended to $GITHUB_STEP_SUMMARY', () => {
    const dir = mkdtempSync(join(tmpdir(), 'viz-validate-summary-'));
    temps.push(dir);
    const summary = join(dir, 'summary.md');
    expect(runCli(['--root', tree('base')], summary).status).toBe(0);
    expect(readFileSync(summary, 'utf8')).toMatch(/^## viz:validate\n\nPalettes: `tokens\/prism\.resolver\.json`, 4 series slots/);
  });
});
