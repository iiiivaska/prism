// parity:report (roadmap P2-3): the repository's report lists every v1 spec and is committed
// up to date, every fixture reports exactly the diagnostics and the lagging cells it declares, and
// `--fail-on-lag` is the only thing that turns lag into an exit code (ADR-0006 rule 3, critic G-21).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fsReader, REPO_ROOT } from '../tokens/api.ts';
import { LAYER_MANIFEST, MANIFESTS, manifestFor, PLATFORMS, REPORT_PATH } from './config.ts';
import { formatJson, main, parseArgs, passed, renderReport, runParity } from './report.ts';
import { cellText, lagLine, summaryLine } from './render.ts';
import { caseReader, emptyManifests, lagKeys, parityCases } from './test-support.ts';

/** The components both stacks implement: the P3-3 and P3-4 slice, then Phase 4 wave 1 (roadmap P3-3, P3-4, P4-1). */
const SLICE = ['Button', 'Divider', 'Surface', 'Text', 'Card'] as const;

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
    // Every v1 spec, by layer then name (ADR-0012): the slice and the P2-5 wave-1 primitives, the
    // wave-2 composites beside Card, the wave-1 chart parts, and the three v1 patterns last.
    expect(result.rows.map((r) => r.spec.name)).toEqual([
      'Avatar', 'Badge', 'Button', 'Checkbox', 'Chip', 'Divider', 'Icon', 'IconButton', 'ProgressBar',
      'ProgressRing', 'Radio', 'SegmentedControl', 'Select', 'Skeleton', 'Slider', 'Spinner', 'Surface',
      'Text', 'TextArea', 'TextField', 'Toggle', 'Tooltip',
      'Alert', 'Banner', 'Card', 'CommandPalette', 'ContextMenu', 'Dialog', 'EmptyState', 'FormField',
      'ListRow', 'Menu', 'Pagination', 'PillTabs', 'Popover', 'SearchField', 'Sheet', 'Sidebar', 'StatCard',
      'StatusPill', 'Stepper', 'TabBar', 'Table', 'Timeline', 'Toast', 'Toolbar', 'TopBar',
      'AreaChart', 'ChartContainer', 'DeltaBadge', 'HeroNumber', 'LineChart', 'RangeBand',
      'ReferenceLine', 'RingGauge', 'Sparkline', 'StatTile',
      'AdaptiveShell', 'DashboardGrid', 'DetailScreen',
    ]);
    // result.files is the read order: every component file, sorted, then every pattern file, sorted.
    const byFile = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
    const components = result.rows.filter((r) => r.kind !== null).map((r) => r.spec.file).sort(byFile);
    const patterns = result.rows.filter((r) => r.kind === null).map((r) => r.spec.file).sort(byFile);
    expect(result.files).toEqual([...components, ...patterns]);
    expect(result.files).toHaveLength(60);
  });

  test('every row has one cell per platform, and every component cell names the manifest behind it', () => {
    for (const row of result.rows) {
      expect(row.cells.map((c) => c.platform)).toEqual([...PLATFORMS]);
      expect(row.kind).toBe(LAYER_MANIFEST[row.spec.layer]);
      for (const cell of row.cells) {
        expect(cell.manifest?.path ?? null).toBe(row.kind === null ? null : manifestFor(row.kind, cell.platform).path);
        expect(cell.support).toBe(row.spec.platforms.get(cell.platform));
      }
    }
  });

  test('the slice is in parity on both stacks, and every other component row is pending (P3-3, P3-4, P4-1)', () => {
    const components = result.rows.filter((r) => r.kind !== null);
    // Row order is layer then name, so the four primitives come before the composite.
    expect(components.filter((r) => r.state === 'parity').map((r) => r.spec.name)).toEqual([...SLICE]);
    expect([...new Set(components.map((r) => r.state))]).toEqual(['pending', 'parity']);
    // A slice row carries its own `specVersion` in every cell the spec supports, and nothing where it
    // says `none` (Divider on watchOS: ADR-0006 rule 4); nothing else has an implementation.
    for (const row of components) {
      for (const cell of row.cells) {
        const expected = row.state === 'parity' && cell.support !== 'none' ? row.spec.specVersion : 0;
        expect(cell.implemented, `${row.spec.name} on ${cell.platform}`).toBe(expected);
      }
    }
    expect(summaryLine(result)).toBe('57 component spec(s), 3 pattern spec(s), 342 cell(s): 0 lagging, 29 in parity, 257 pending, 56 satisfied by `none`, 0 diagnostic(s)');
  });

  test('a pattern is a contract-only row with its own table and no manifest cell (ADR-0012 rule 3)', () => {
    const patterns = result.rows.filter((r) => r.spec.layer === 'pattern');
    expect(patterns.map((r) => r.spec.name)).toEqual(['AdaptiveShell', 'DashboardGrid', 'DetailScreen']);
    for (const row of patterns) {
      expect(row.state).toBe('contract');
      expect(row.kind).toBeNull();
      expect(row.cells.every((c) => c.manifest === null && c.implemented === 0 && !c.lag)).toBe(true);
    }
    // Patterns are layer 4, so they are the last rows.
    expect(result.rows.slice(-3)).toEqual(patterns);
    const markdown = renderReport(result);
    expect(markdown).toContain('## Patterns');
    expect(markdown).toContain('| [AdaptiveShell](../../spec/patterns/AdaptiveShell.yaml) | v1 | adapted | full | adapted | none | adapted | full |');
    expect(markdown).toContain('| [DashboardGrid](../../spec/patterns/DashboardGrid.yaml) | v1 | adapted | full | full | none | full | full |');
    expect(markdown).toContain('| [DetailScreen](../../spec/patterns/DetailScreen.yaml) | v1 | full | full | adapted | adapted | full | adapted |');
    expect(markdown).not.toContain('| [DashboardGrid](../../spec/patterns/DashboardGrid.yaml) | pattern |');
  });

  test('the four manifests exist; the component pair carries the slice and the chart pair is empty', () => {
    expect(result.manifests.map((m) => m.file.path)).toEqual(MANIFESTS.map((m) => m.path));
    expect(result.manifests.every((m) => m.present)).toBe(true);
    // Both stacks declare the same five components; the charts manifests wait for data-viz wave 1.
    expect(result.manifests.map((m) => [m.file.kind, m.entries])).toEqual(
      MANIFESTS.map((m) => [m.kind, m.kind === 'components' ? SLICE.length : 0]),
    );
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
    // Every other component stays pending, because lag is per row and not per run; patterns stay
    // contract-only rows.
    expect(result.rows.filter((r) => r.state === 'pending').map((r) => r.spec.name)).toEqual(
      result.rows.filter((r) => r.kind !== null).map((r) => r.spec.name).filter((n) => n !== 'Button'),
    );
    expect(renderReport(result)).toContain('full v2 **LAG**');
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
 * A tree with one header-only spec at v2, four empty manifests, and one component implemented a
 * version behind on iOS: the smallest thing `--fail-on-lag` has to fail on. The manifests are empty
 * rather than copied from the repository, whose entries would all be orphans in a tree whose only
 * spec is `Sample.yaml`.
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
  for (const [path, text] of Object.entries(emptyManifests())) {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    writeFileSync(join(root, path), text);
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
    expect(out).toContain('57 component spec(s), 3 pattern spec(s)');
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
