// parity:report (roadmap P2-3; ADR-0006 rules 2 to 4, ADR-0007, ADR-0010, ADR-0012 rules 2 and 3,
// critic G-20 and G-21).
//
// Every spec × platform cell of ADR-0006 rule 3, in one table. The specs are read through the P2-1
// loader (tools/spec/load.ts), so `spec:validate` and this report always see the same files; the four
// implementation manifests are read as text in the format of `tools/parity/manifest.ts`, so the job
// runs on ubuntu without Swift and without building the web packages (G-21).
//
// A cell is `spec vN / impl vM` plus the platform's support level. **LAG** marks a cell where an
// implementation is behind its spec on a `full` or `adapted` platform; `none` cells are satisfied by
// definition. A spec no stack has implemented anywhere is `pending`, not lag: it is backlog, not
// drift, and the moment one cell is implemented every `full` and `adapted` cell of that row is
// expected to keep up. That is what makes the gate usable on `main` while the component waves land.
//
// Diagnostics (an unreadable manifest, an orphan entry, an implementation the spec says does not
// exist) fail the run on their own; lag fails only under `--fail-on-lag`, which ADR-0006 rule 3 asks
// for on `main` and not on branches.
//
//   manifest/missing      a manifest file does not exist
//   manifest/parse        the `implemented` declaration is absent, or its literal is not the grammar
//   manifest/orphan       an entry no spec claims, or one declared in the wrong stack's manifest
//   manifest/platform     a platform key this manifest does not own
//   manifest/version      a version that is not 1 or more
//   manifest/unsupported  an implementation on a platform the spec marks `none` (ADR-0006 rule 4)
//   manifest/ahead        an implementation of a spec version that does not exist yet (rule 6)
//   parity/header         a spec header the report cannot read (`spec:validate` says why)
//   parity/layer          a layer that routes to no manifest (ADR-0012 rule 2)
//   parity/name           two specs with the same `name`
//   spec/parse            the spec does not parse or does not round-trip (the P2-1 loader)
//
//   node parity/report.ts                    write tools/parity/report.md
//   node parity/report.ts --fail-on-lag      also exit 1 when a cell lags (CI on main)
//   node parity/report.ts --check            write nothing; exit 1 when the committed report is stale
//   node parity/report.ts --json             print the run as JSON; write nothing
//   node parity/report.ts --root <dir>       read (and write) another tree with the same layout
//   node parity/report.ts --out <path>       write the report somewhere else, relative to the root
//
// Exit codes: 0 the report is written and nothing is wrong; 1 a diagnostic, a stale report, or lag
// under --fail-on-lag; 2 a usage or layout error.
import { appendFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fsReader, REPO_ROOT, type Diagnostic, type SourceReader } from '../tokens/api.ts';
import { error, formatDiagnostics, sortDiagnostics } from '../tokens/ir/diagnostics.ts';
import { LAYER_MANIFEST, MANIFESTS, manifestFor, PLATFORMS, REPORT_PATH, stackManifest, type ManifestFile, type ManifestKind, type Platform } from './config.ts';
import { parseManifest } from './manifest.ts';
import { lagLine, renderReport, summaryLine } from './render.ts';
import { readSpecs, type SpecRow } from './specs.ts';
import type { Cell, Lag, ManifestReport, ParityResult, Row, RowState } from './types.ts';

export type { Cell, Lag, ManifestReport, ParityResult, Row, RowState } from './types.ts';
export { renderReport, summaryLine } from './render.ts';
export { REPORT_PATH } from './config.ts';

export interface ParityOptions {
  /** Tree to read; default: the repository. Ignored when `reader` is given. */
  readonly root?: string;
  readonly reader?: SourceReader;
}

/** Nothing is wrong and nothing lags. */
export function passed(r: ParityResult): boolean {
  return r.diagnostics.length === 0 && r.lags.length === 0;
}

/** The manifest that owns a platform key, whichever kind declares it; null when the key is unknown. */
function ownerOf(platform: string): ManifestFile | null {
  return MANIFESTS.find((m) => (m.platforms as readonly string[]).includes(platform)) ?? null;
}

export function runParity(opts: ParityOptions = {}): ParityResult {
  const reader = opts.reader ?? fsReader(opts.root ?? REPO_ROOT);
  const { files, specs, diagnostics: specDiagnostics } = readSpecs(reader);
  const diagnostics: Diagnostic[] = [...specDiagnostics];

  const byName = new Map<string, SpecRow>();
  for (const spec of specs) {
    const first = byName.get(spec.name);
    if (first !== undefined) {
      diagnostics.push(error('parity/name', `\`${spec.name}\` is also the name in ${first.file}`, {
        file: spec.file, line: spec.doc.lineOf(['name']), hint: 'one name is one row of the report and one key in the manifests; rename one of them',
      }));
      continue;
    }
    byName.set(spec.name, spec);
  }

  // `<kind>|<name>|<platform>` → the version a manifest claims.
  const implemented = new Map<string, number>();
  const manifests: ManifestReport[] = [];

  for (const file of MANIFESTS) {
    if (!reader.exists(file.path)) {
      diagnostics.push(error('manifest/missing', `${file.path} does not exist, so the ${file.platforms.join(' and ')} cells of every ${file.kind === 'charts' ? 'data-viz ' : ''}spec are unknown`, {
        file: file.path, hint: `declare \`${file.symbol}\` there (ADR-0006 rule 2)`,
      }));
      manifests.push({ file, present: false, entries: 0 });
      continue;
    }
    const parsed = parseManifest(reader.readText(file.path), file.syntax);
    for (const problem of parsed.problems) {
      diagnostics.push(error('manifest/parse', problem.message, { file: file.path, line: problem.line, ...(problem.hint === undefined ? {} : { hint: problem.hint }) }));
    }
    manifests.push({ file, present: true, entries: parsed.entries.length });

    for (const entry of parsed.entries) {
      const spec = byName.get(entry.name);
      if (spec === undefined) {
        diagnostics.push(error('manifest/orphan', `\`${entry.name}\` is implemented here but no spec declares it`, {
          file: file.path, line: entry.line, hint: `add spec/components/${entry.name}.yaml, or remove the entry (ADR-0006 rule 2)`,
        }));
        continue;
      }
      const kind = LAYER_MANIFEST[spec.layer];
      if (kind === null) {
        diagnostics.push(error('manifest/orphan', `\`${entry.name}\` is a ${spec.layer}, and patterns have no manifest entry`, {
          file: file.path, line: entry.line, hint: `remove the entry (ADR-0012 rule 3); ${spec.file} stays the contract`,
        }));
        continue;
      }
      if (kind !== file.kind) {
        const owner = stackManifest(file.stack, kind);
        diagnostics.push(error('manifest/orphan', `\`${entry.name}\` is layer \`${spec.layer}\`, which this stack declares in ${owner.path}`, {
          file: file.path, line: entry.line, hint: `move the entry to \`${owner.symbol}\``,
        }));
        continue;
      }

      for (const version of entry.versions) {
        if (!(file.platforms as readonly string[]).includes(version.platform)) {
          const owner = ownerOf(version.platform);
          diagnostics.push(error('manifest/platform', `\`${entry.name}\` declares \`${version.platform}\`, which \`${file.symbol}\` does not own`, {
            file: file.path, line: version.line,
            hint: owner === null
              ? `the platform keys are ${PLATFORMS.join(', ')} (spec/SCHEMA.md)`
              : `\`${version.platform}\` is declared in ${manifestFor(file.kind, version.platform as Platform).path}; this manifest owns ${file.platforms.join(', ')}`,
          }));
          continue;
        }
        const platform = version.platform as Platform;
        if (version.version < 1) {
          diagnostics.push(error('manifest/version', `\`${entry.name}\` claims version ${version.version} on \`${platform}\``, {
            file: file.path, line: version.line, hint: 'a version is 1 or more; omit the platform while it is not implemented',
          }));
          continue;
        }
        implemented.set(`${kind}|${spec.name}|${platform}`, version.version);
        if (spec.platforms.get(platform) === 'none') {
          diagnostics.push(error('manifest/unsupported', `\`${entry.name}\` is implemented on \`${platform}\`, which ${spec.file} marks \`none\``, {
            file: file.path, line: version.line, hint: `set \`platforms.${platform}\` to full or adapted with a note (ADR-0006 rule 4), or remove the entry`,
          }));
        }
        if (version.version > spec.specVersion) {
          diagnostics.push(error('manifest/ahead', `\`${entry.name}\` claims v${version.version} on \`${platform}\`, ahead of spec v${spec.specVersion}`, {
            file: file.path, line: version.line, hint: `bump \`specVersion\` in ${spec.file} first (ADR-0006 rule 6)`,
          }));
        }
      }
    }
  }

  const rows: Row[] = [];
  const lags: Lag[] = [];
  for (const spec of specs) {
    if (byName.get(spec.name) !== spec) continue; // the duplicate name is reported, not printed twice
    const kind: ManifestKind | null = LAYER_MANIFEST[spec.layer];
    const raw = PLATFORMS.map((platform) => ({
      platform,
      // A platform the header does not declare is already a `parity/header` diagnostic; it is shown
      // as `none` so the row stays printable.
      support: spec.platforms.get(platform) ?? 'none',
      implemented: kind === null ? 0 : (implemented.get(`${kind}|${spec.name}|${platform}`) ?? 0),
      manifest: kind === null ? null : manifestFor(kind, platform),
    }));
    const started = raw.some((c) => c.implemented > 0);
    const cells: Cell[] = raw.map((c) => ({ ...c, lag: started && c.support !== 'none' && c.implemented < spec.specVersion }));
    const state: RowState = kind === null ? 'contract' : cells.some((c) => c.lag) ? 'lag' : started ? 'parity' : 'pending';
    const row: Row = { spec, kind, cells, state };
    rows.push(row);
    for (const cell of cells) if (cell.lag) lags.push({ row, cell });
  }

  return { files, rows, manifests, lags, diagnostics: sortDiagnostics(diagnostics) };
}

/** The run as stable JSON: the same facts the Markdown prints, for a tool that reads them. */
export function formatJson(r: ParityResult): string {
  const value = {
    specs: r.rows.map((row) => ({
      name: row.spec.name,
      file: row.spec.file,
      layer: row.spec.layer,
      specVersion: row.spec.specVersion,
      state: row.state,
      platforms: Object.fromEntries(row.cells.map((c) => [c.platform, {
        support: c.support,
        implemented: c.implemented,
        lag: c.lag,
        manifest: c.manifest?.path ?? null,
      }])),
    })),
    manifests: r.manifests.map((m) => ({
      symbol: m.file.symbol, path: m.file.path, stack: m.file.stack, kind: m.file.kind,
      platforms: m.file.platforms, present: m.present, entries: m.entries,
    })),
    lags: r.lags.map(({ row, cell }) => ({
      name: row.spec.name, platform: cell.platform, support: cell.support,
      specVersion: row.spec.specVersion, implemented: cell.implemented, manifest: cell.manifest?.path ?? null,
    })),
    diagnostics: r.diagnostics,
  };
  return `${JSON.stringify(value, null, 2)}\n`;
}

interface Args {
  root: string;
  out: string;
  failOnLag: boolean;
  check: boolean;
  json: boolean;
}

export function parseArgs(argv: readonly string[]): Args | string {
  const args: Args = { root: REPO_ROOT, out: REPORT_PATH, failOnLag: false, check: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? '';
    if (flag === '--fail-on-lag') {
      args.failOnLag = true;
      continue;
    }
    if (flag === '--check') {
      args.check = true;
      continue;
    }
    if (flag === '--json') {
      args.json = true;
      continue;
    }
    if (flag !== '--root' && flag !== '--out') return `unknown argument ${JSON.stringify(flag)}`;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) return `${flag} needs a path`;
    if (flag === '--root') args.root = resolve(value);
    else args.out = value;
    i++;
  }
  return args;
}

/** CLI entry; returns the process exit code. */
export function main(argv: readonly string[]): number {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    console.error(`parity:report: ${args}\nusage: node parity/report.ts [--root <dir>] [--out <path>] [--fail-on-lag] [--check] [--json]`);
    return 2;
  }

  const reader = fsReader(args.root);
  let result: ParityResult;
  try {
    result = runParity({ reader });
  } catch (e) {
    console.error(`parity:report: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }

  const markdown = renderReport(result);
  const summary = summaryLine(result);

  if (args.json) {
    process.stdout.write(formatJson(result));
    console.error(`parity:report: ${summary}`);
    return result.diagnostics.length > 0 || (args.failOnLag && result.lags.length > 0) ? 1 : 0;
  }

  let stale = false;
  if (args.check) {
    // The same shape as the write below: a `--out` the reader refuses (one that leaves the root) is a
    // usage error with a `parity:report:` line, not a stack trace.
    let current: string | null;
    try {
      current = reader.exists(args.out) ? reader.readText(args.out) : null;
    } catch (e) {
      console.error(`parity:report: cannot read ${args.out}: ${e instanceof Error ? e.message : String(e)}`);
      return 2;
    }
    if (current !== markdown) {
      stale = true;
      console.error(current === null ? `parity:report: ${args.out} is missing` : `parity:report: ${args.out} is stale`);
      console.error('parity:report: run pnpm parity:report and commit the result');
    }
  } else {
    try {
      writeFileSync(join(args.root, ...args.out.split('/')), markdown);
    } catch (e) {
      console.error(`parity:report: cannot write ${args.out}: ${e instanceof Error ? e.message : String(e)}`);
      return 2;
    }
  }

  const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
  if (summaryFile !== undefined && summaryFile !== '') {
    try {
      appendFileSync(summaryFile, `## parity:report\n\n${markdown}\n`);
    } catch (e) {
      console.error(`parity:report: cannot append to GITHUB_STEP_SUMMARY: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const lag of result.lags) console.error(`LAG ${lagLine(lag.row, lag.cell)}`);
  if (result.diagnostics.length > 0) console.error(formatDiagnostics(result.diagnostics));

  if (result.diagnostics.length > 0 || stale) {
    console.error(`parity:report: ${summary}`);
    return 1;
  }
  if (result.lags.length > 0 && args.failOnLag) {
    console.error(`parity:report: ${result.lags.length} lagging cell(s) (ADR-0006 rule 3)`);
    console.error(`parity:report: ${summary}`);
    return 1;
  }
  console.log(`parity:report: ${summary}${args.check ? '' : ` → ${args.out}`}`);
  if (result.lags.length > 0) console.log('parity:report: lag is a warning here; `--fail-on-lag` makes it an error (ADR-0006 rule 3)');
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
