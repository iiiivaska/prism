// tools/parity/report.md: one row per spec, one column per platform (ADR-0006 rule 3).
//
// A cell prints the platform's support level and the implemented spec version, and carries **LAG**
// where the implementation is behind the spec on a `full` or `adapted` platform. The file is a pure
// function of the specs and the manifests, so it regenerates byte-identically until one of them
// changes, and `parity:report --check` fails on a stale copy.
import { formatDiagnostics } from '../tokens/api.ts';
// The gallery's index path, so the two halves of ADR-0006 rule 4 — this table and the pairs — are wired
// with one constant and cannot drift apart (P3-5).
import { INDEX_HTML } from '../gallery/config.ts';
import { PLATFORM_LABELS, PLATFORMS } from './config.ts';
import type { Cell, ManifestReport, ParityResult, Row, RowState } from './types.ts';

/** Relative link from tools/parity/report.md to a repository-relative path. */
function link(text: string, path: string): string {
  return `[${text}](../../${path})`;
}

export function cellText(cell: Cell): string {
  if (cell.support === 'none') return 'none';
  const version = cell.implemented === 0 ? '–' : `v${cell.implemented}`;
  return `${cell.support} ${version}${cell.lag ? ' **LAG**' : ''}`;
}

const STATE_TEXT: Readonly<Record<RowState, string>> = {
  lag: '**LAG**',
  parity: 'in parity',
  pending: 'pending',
  contract: 'contract only',
};

function componentTable(rows: readonly Row[]): string[] {
  const head = ['Component', 'Layer', 'Spec', 'Parity', 'Gallery', ...PLATFORMS.map((p) => PLATFORM_LABELS[p])];
  const align = ['---', '---', '--:', '---', '---', ...PLATFORMS.map(() => '---')];
  const lines = [`| ${head.join(' | ')} |`, `| ${align.join(' | ')} |`];
  for (const row of rows) {
    const cells = [
      link(row.spec.name, row.spec.file),
      row.spec.layer,
      `v${row.spec.specVersion}`,
      STATE_TEXT[row.state],
      // Every row links, whether or not it has snapshots yet: the gallery carries an anchor for every
      // component spec, so a pending row lands on the line that says it is waiting for a first one.
      link('pairs', `${INDEX_HTML}#${row.spec.name}`),
      ...row.cells.map(cellText),
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines;
}

function patternTable(rows: readonly Row[]): string[] {
  const head = ['Pattern', 'Spec', ...PLATFORMS.map((p) => PLATFORM_LABELS[p])];
  const align = ['---', '--:', ...PLATFORMS.map(() => '---')];
  const lines = [`| ${head.join(' | ')} |`, `| ${align.join(' | ')} |`];
  for (const row of rows) {
    lines.push(`| ${link(row.spec.name, row.spec.file)} | v${row.spec.specVersion} | ${row.cells.map((c) => c.support).join(' | ')} |`);
  }
  return lines;
}

function manifestTable(manifests: readonly ManifestReport[]): string[] {
  const lines = ['| Declaration | File | Platforms | Components |', '| --- | --- | --- | --: |'];
  for (const m of manifests) {
    const file = m.present ? link(`\`${m.file.path}\``, m.file.path) : `\`${m.file.path}\` (missing)`;
    lines.push(`| \`${m.file.symbol}\` | ${file} | ${m.file.platforms.join(', ')} | ${m.present ? m.entries : '—'} |`);
  }
  return lines;
}

/** `Button on watchos (adapted): spec v3, swift/Sources/DSComponents/Manifest.swift v2` — the file to edit. */
export function lagLine(row: Row, cell: Cell): string {
  const implemented = cell.implemented === 0 ? 'nothing implemented' : `v${cell.implemented}`;
  const where = cell.manifest === null ? 'no manifest' : cell.manifest.path;
  return `${row.spec.name} on ${cell.platform} (${cell.support}): spec v${row.spec.specVersion}, ${where} ${implemented}`;
}

/** The one line the CLI prints and the report repeats, so a run and its file never disagree. */
export function summaryLine(r: ParityResult): string {
  const components = r.rows.filter((row) => row.kind !== null);
  const patterns = r.rows.length - components.length;
  const cells = components.flatMap((row) => row.cells);
  const none = cells.filter((c) => c.support === 'none').length;
  const lagging = cells.filter((c) => c.lag).length;
  const built = cells.filter((c) => c.support !== 'none' && c.implemented > 0 && !c.lag).length;
  const pending = cells.length - none - lagging - built;
  return `${components.length} component spec(s), ${patterns} pattern spec(s), ${cells.length} cell(s): ${lagging} lagging, ${built} in parity, ${pending} pending, ${none} satisfied by \`none\`, ${r.diagnostics.length} diagnostic(s)`;
}

const LEGEND: readonly string[] = [
  '- A cell is the platform\'s support level (`full`, `adapted`, `none`) and the spec version that platform implements: `full v3`.',
  '- `–` is no implementation yet. `none` is a design decision, satisfied by definition (ADR-0006 rule 3, ADR-0010).',
  '- **LAG** marks an implementation behind its spec on a `full` or `adapted` platform. `parity:report --fail-on-lag` exits non-zero on it; ADR-0006 rule 3 asks for that on `main`, and for a warning on branches.',
  '- A component no stack has started anywhere is `pending`, not lag: it is backlog, not drift. From its first implemented cell on, every `full` and `adapted` cell of that row is expected to keep up.',
  '- Patterns are `contract only`: they declare platform support but have no implementation manifest entry (ADR-0012 rule 3), and their example screens are Phase 4, so the gallery holds no pairs for them yet.',
  `- **Gallery** opens this component's section of [\`${INDEX_HTML}\`](../../${INDEX_HTML}): every example of the row, both stacks side by side, per scheme and density, with missing images called out as missing (ADR-0005, ADR-0006 rule 4). Regenerate it with \`pnpm gallery:build\`; each section links back to the spec and to this report.`,
];

export function renderReport(r: ParityResult): string {
  const components = r.rows.filter((row) => row.kind !== null);
  const patterns = r.rows.filter((row) => row.kind === null);
  const out: string[] = [
    '# Parity report',
    '',
    'Generated by `pnpm parity:report` (roadmap P2-3) from every spec under `spec/components/` and `spec/patterns/` and the manifests below; do not edit by hand. The spec is the contract, the manifests declare what each stack implements, and this table is where the two are compared (ADR-0006 rules 1 to 3).',
    '',
    summaryLine(r),
    '',
    ...LEGEND,
    '',
    '## Manifests',
    '',
    ...manifestTable(r.manifests),
  ];

  if (r.diagnostics.length > 0) {
    out.push('', '## Problems', '', 'The cells below are incomplete until these are fixed.', '', '```', formatDiagnostics(r.diagnostics), '```');
  }

  if (r.lags.length > 0) {
    out.push('', '## Lag', '');
    for (const lag of r.lags) out.push(`- ${lagLine(lag.row, lag.cell)}`);
  }

  out.push('', '## Components', '');
  out.push(...(components.length > 0 ? componentTable(components) : ['No component spec has a header the report can read.']));

  if (patterns.length > 0) {
    out.push('', '## Patterns', '', 'Screen-level recipes with no implementation manifest entry (ADR-0012 rule 3); the columns are the support levels their specs declare.', '', ...patternTable(patterns));
  }

  return `${out.join('\n')}\n`;
}
