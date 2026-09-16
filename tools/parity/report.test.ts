// parity:report (roadmap P2-3): the repository's report lists every v1 spec and is committed
// up to date, every fixture reports exactly the diagnostics and the lagging cells it declares, and
// `--fail-on-lag` is the only thing that turns lag into an exit code (ADR-0006 rule 3, critic G-21).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fsReader, REPO_ROOT } from '../tokens/api.ts';
import { LAYER_MANIFEST, MANIFESTS, manifestFor, PLATFORMS, REPORT_PATH } from './config.ts';
import { formatJson, main, parseArgs, passed, renderReport, runParity } from './report.ts';
import { cellText, lagLine, summaryLine } from './render.ts';
import { caseReader, lagKeys, parityCases } from './test-support.ts';

/** Console capture: the CLI prints, and a test reads what it printed. */
function capture<T>(run: () => T): { value: T; out: string; err: string } {
  const out: string[] = [];
  const err: string[] = [];
  const log = console.log;
  const error = console.error;
  console.log = (line: string): void => void out.push(line);
  console.error = (line: string): void => void err.push(line);
  try {
    return { value: run(), out: out.join('\n'), err: err.join('\n') };
  } finally {
    console.log = log;
    console.error = error;
  }
}

describe('the repository', () => {
  const result = runParity({ reader: fsReader(REPO_ROOT) });

  test('every spec is a row, and nothing is wrong', () => {
    expect(result.diagnostics).toEqual([]);
    expect(result.lags).toEqual([]);
    expect(passed(result)).toBe(true);
    // Every v1 spec, by layer then name: the ADR-0012 slice plus the P2-5 wave-1 primitives,
    // composites and chart parts. Rows are ordered primitive, composite, chart (ADR-0012 layers).
    expect(result.rows.map((r) => r.spec.name)).toEqual([
      'Avatar', 'Badge', 'Button', 'Checkbox', 'Chip', 'Divider', 'Icon', 'IconButton', 'ProgressBar',
      'ProgressRing', 'Radio', 'SegmentedControl', 'Select', 'Skeleton', 'Slider', 'Spinner', 'Surface',
      'Text', 'TextArea', 'TextField', 'Toggle', 'Tooltip',
      'Card',
      'AreaChart', 'ChartContainer', 'DeltaBadge', 'HeroNumber', 'LineChart', 'RangeBand',
      'ReferenceLine', 'RingGauge', 'Sparkline', 'StatTile',
    ]);
    // result.files is the read order: every spec file, sorted.
    expect(result.files).toEqual(result.rows.map((r) => r.spec.file).sort());
    expect(result.files).toHaveLength(33);
  });

  test('every row has one cell per platform, and every cell names the manifest behind it', () => {
    for (const row of result.rows) {
      expect(row.cells.map((c) => c.platform)).toEqual([...PLATFORMS]);
      expect(row.kind).toBe(LAYER_MANIFEST[row.spec.layer]);
      for (const cell of row.cells) {
        expect(cell.manifest?.path).toBe(manifestFor(row.kind ?? 'components', cell.platform).path);
        expect(cell.support).toBe(row.spec.platforms.get(cell.platform));
      }
    }
  });

  test('nothing is implemented yet, so every row is pending rather than lagging (P2-5)', () => {
    expect([...new Set(result.rows.map((r) => r.state))]).toEqual(['pending']);
    expect(result.rows.every((r) => r.cells.every((c) => c.implemented === 0))).toBe(true);
    expect(summaryLine(result)).toContain('198 cell(s): 0 lagging, 0 in parity, 172 pending, 26 satisfied by `none`');
  });

  test('the four manifests exist and are empty', () => {
    expect(result.manifests.map((m) => m.file.path)).toEqual(MANIFESTS.map((m) => m.path));
    expect(result.manifests.every((m) => m.present && m.entries === 0)).toBe(true);
  });

  test('the committed report is what this run renders', () => {
    expect(fsReader(REPO_ROOT).readText(REPORT_PATH)).toBe(renderReport(result));
  });

  test('the report names every spec, every manifest and the legend', () => {
    const markdown = renderReport(result);
    for (const row of result.rows) expect(markdown).toContain(`[${row.spec.name}](../../${row.spec.file})`);
    for (const manifest of MANIFESTS) expect(markdown).toContain(manifest.path);
    expect(markdown).toContain('**LAG**');
    expect(markdown).not.toMatch(/\n## Lag\n/);
  });

  test('the JSON shape carries the same cells', () => {
    const json = JSON.parse(formatJson(result)) as { specs: { name: string; platforms: Record<string, { support: string }> }[]; lags: unknown[] };
    expect(json.specs.map((s) => s.name)).toEqual(result.rows.map((r) => r.spec.name));
    expect(Object.keys(json.specs[0]?.platforms ?? {})).toEqual([...PLATFORMS]);
    expect(json.lags).toEqual([]);
  });
});

describe('cells', () => {
  const cell = { platform: 'ios', support: 'full', implemented: 2, lag: true, manifest: MANIFESTS[0] ?? null } as const;

  test('print the support level and the implemented version, with the red mark on lag', () => {
    expect(cellText(cell)).toBe('full v2 **LAG**');
    expect(cellText({ ...cell, lag: false })).toBe('full v2');
    expect(cellText({ ...cell, implemented: 0, lag: false })).toBe('full –');
    expect(cellText({ ...cell, support: 'none', implemented: 0, lag: false })).toBe('none');
    expect(cellText({ ...cell, support: 'adapted' })).toBe('adapted v2 **LAG**');
  });

  test('a lag line names the platform, both versions and the file to edit', () => {
    const row = { spec: { name: 'Button', specVersion: 3 }, kind: 'components', cells: [], state: 'lag' } as never;
    expect(lagLine(row, cell)).toBe('Button on ios (full): spec v3, swift/Sources/DSComponents/Manifest.swift v2');
    expect(lagLine(row, { ...cell, implemented: 0 })).toContain('nothing implemented');
  });
});

describe('fixtures', () => {
  const cases = parityCases();

  test('each diagnostic code has a fixture', () => {
    const codes = new Set(cases.flatMap((c) => c.expect.map((e) => e.code)));
    expect([...codes].sort()).toEqual([
      'manifest/ahead',
      'manifest/missing',
      'manifest/orphan',
      'manifest/parse',
      'manifest/platform',
      'manifest/unsupported',
      'manifest/version',
      'parity/header',
      'parity/layer',
      'parity/name',
      'spec/parse',
    ]);
  });

  test.each(cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const result = runParity({ reader: caseReader(c) });
    expect(new Set(result.diagnostics.map((d) => `${d.code}|${d.file ?? ''}`))).toEqual(new Set(c.expect.map((e) => `${e.code}|${e.file ?? ''}`)));
    expect(lagKeys(result.lags)).toEqual([...c.lags]);
    expect(passed(result)).toBe(c.expect.length === 0 && c.lags.length === 0);
    for (const d of result.diagnostics) {
      expect(d.severity).toBe('error');
      expect(d.hint, `${d.code} carries a fix`).toBeTruthy();
      expect(d.file, `${d.code} carries a file`).toBeTruthy();
    }
    // The report always renders, however broken the inputs are: it is the artifact that explains them.
    const markdown = renderReport(result);
    expect(markdown.startsWith('# Parity report\n')).toBe(true);
    expect(markdown.includes('## Lag')).toBe(c.lags.length > 0);
    expect(markdown.includes('## Problems')).toBe(c.expect.length > 0);
  });

  test('a lagging manifest marks every cell of its row and nothing else', () => {
    const lagging = cases.find((c) => c.name === 'lagging');
    expect(lagging).toBeDefined();
    const result = runParity({ reader: caseReader(lagging!) });
    expect(result.rows.filter((r) => r.state === 'lag').map((r) => r.spec.name)).toEqual(['Button']);
    // Everything the fixture's manifest does not name stays pending: lag is per row, not per run.
    expect(result.rows.filter((r) => r.state === 'pending').map((r) => r.spec.name)).toEqual(
      result.rows.map((r) => r.spec.name).filter((n) => n !== 'Button'),
    );
    expect(renderReport(result)).toContain('full v2 **LAG**');
  });

  test('a pattern is a contract-only row with its own table and no manifest cell', () => {
    const result = runParity({ reader: caseReader(parityCases().find((c) => c.name === 'pattern')!) });
    const pattern = result.rows.find((r) => r.spec.name === 'DashboardGrid');
    expect(pattern?.state).toBe('contract');
    expect(pattern?.kind).toBeNull();
    expect(pattern?.cells.every((c) => c.manifest === null && c.implemented === 0 && !c.lag)).toBe(true);
    // It is the last row: patterns are layer 4 (ADR-0012).
    expect(result.rows.at(-1)?.spec.name).toBe('DashboardGrid');
    const markdown = renderReport(result);
    expect(markdown).toContain('## Patterns');
    expect(markdown).toContain('| [DashboardGrid](../../spec/patterns/DashboardGrid.yaml) | v1 | adapted | full | full | none | adapted | full |');
    expect(markdown).not.toContain('| [DashboardGrid](../../spec/patterns/DashboardGrid.yaml) | pattern |');
  });

  test('an in-parity manifest is read from both syntaxes at once', () => {
    const inParity = cases.find((c) => c.name === 'in-parity');
    const result = runParity({ reader: caseReader(inParity!) });
    const button = result.rows.find((r) => r.spec.name === 'Button');
    expect(button?.state).toBe('parity');
    expect(button?.cells.map((c) => c.implemented)).toEqual([3, 3, 3, 3, 3, 3]);
  });
});

/**
 * A tree with one header-only spec at v2, the repository's manifests, and one component implemented
 * a version behind on iOS: the smallest thing `--fail-on-lag` has to fail on.
 */
function lagTree(): string {
  const root = mkdtempSync(join(tmpdir(), 'prism-parity-'));
  mkdirSync(join(root, 'spec', 'components'), { recursive: true });
  mkdirSync(join(root, dirname(REPORT_PATH)), { recursive: true });
  writeFileSync(join(root, 'spec', 'components', 'Sample.yaml'), [
    'name: Sample',
    'layer: primitive',
    'specVersion: 2',
    'platforms:',
    '  ios: full',
    '  ipados: full',
    '  macos: full',
    '  watchos: none',
    '  web-touch: full',
    '  web-desktop: full',
    '',
  ].join('\n'));
  for (const manifest of MANIFESTS) {
    mkdirSync(join(root, dirname(manifest.path)), { recursive: true });
    cpSync(join(REPO_ROOT, manifest.path), join(root, manifest.path));
  }
  writeFileSync(join(root, MANIFESTS[0]?.path ?? ''), [
    'public enum DSComponentsManifest {',
    '    public static let implemented: [String: [String: Int]] = [',
    '        "Sample": ["ios": 1],',
    '    ]',
    '}',
    '',
  ].join('\n'));
  return root;
}

describe('the CLI', () => {
  test('--check passes on the committed report and exits 0', () => {
    const { value, out } = capture(() => main(['--check']));
    expect(value).toBe(0);
    expect(out).toContain('33 component spec(s)');
  });

  test('--check fails when the report is written somewhere that has none', () => {
    const { value, err } = capture(() => main(['--check', '--out', 'tools/parity/fixtures/nothing-here.md']));
    expect(value).toBe(1);
    expect(err).toContain('is missing');
  });

  test('--json prints the run and writes nothing', () => {
    const before = fsReader(REPO_ROOT).readText(REPORT_PATH);
    const written: string[] = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: string): boolean => (written.push(chunk), true);
    try {
      expect(capture(() => main(['--json'])).value).toBe(0);
    } finally {
      process.stdout.write = write;
    }
    expect(JSON.parse(written.join(''))).toHaveProperty('manifests');
    expect(fsReader(REPO_ROOT).readText(REPORT_PATH)).toBe(before);
  });

  test('lag warns and exits 0; --fail-on-lag makes it an exit code (ADR-0006 rule 3, G-21)', () => {
    const root = lagTree();
    try {
      const run = capture(() => main(['--root', root]));
      expect(run.value).toBe(0);
      expect(run.err).toContain('LAG Sample on ios (full): spec v2,');
      expect(run.out).toContain('lag is a warning here');
      expect(readFileSync(join(root, REPORT_PATH), 'utf8')).toContain('full v1 **LAG**');

      expect(capture(() => main(['--root', root, '--fail-on-lag'])).value).toBe(1);
      expect(capture(() => main(['--root', root, '--check'])).value).toBe(0);

      writeFileSync(join(root, REPORT_PATH), '# edited by hand\n');
      const stale = capture(() => main(['--root', root, '--check']));
      expect(stale.value).toBe(1);
      expect(stale.err).toContain('is stale');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('flags parse, and a flag with no value is a usage error', () => {
    expect(parseArgs(['--fail-on-lag'])).toMatchObject({ failOnLag: true, check: false, json: false });
    expect(parseArgs(['--out', 'x.md'])).toMatchObject({ out: 'x.md' });
    expect(parseArgs(['--out', '--json'])).toBe('--out needs a path');
  });

  test('--check with an --out that leaves the root is a usage error, not a stack trace', () => {
    const { value, err } = capture(() => main(['--check', '--out', '../escape.md']));
    expect(value).toBe(2);
    expect(err).toContain('parity:report: cannot read ../escape.md');
  });

  test('rejects an unknown argument and a flag with no value', () => {
    const { value } = capture(() => main(['--nope']));
    expect(value).toBe(2);
    expect(capture(() => main(['--root'])).value).toBe(2);
    expect(parseArgs(['--out', '--json'])).toBe('--out needs a path');
  });
});
