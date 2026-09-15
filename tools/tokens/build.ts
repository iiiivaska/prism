// CLI `tokens:build` (ARCHITECTURE §3.1, §9): normalize check → buildBundle (source checks, every
// Style Dictionary permutation, IR invariants, analysis) → renderAll → verifyAll → writeOutputs over
// `OWNED_ROOTS`. Nothing is written while any check fails.
//
//   node tokens/build.ts [--check] [--json] [--only <target,…>] [--root <dir>] [--resolver <path>]
//
//   --check     compare with disk and write nothing; exit 1 on any added, changed or removed file
//               (`pnpm tokens:check`)
//   --json      diagnostics (and stale files, as `output/stale`) as JSON on stdout
//   --only      development: render and write only these targets, delete nothing; never with --check
//   --root      repository root (default: this checkout); --resolver: repository-relative resolver path
//
// Exit codes: 0 ok, 1 diagnostics or stale output, 2 usage error.
import { resolve } from 'node:path';
import { OWNED_ROOTS, PATHS } from './config.ts';
import { renderAll, TARGETS, type FormatInput } from './formats/index.ts';
import { collectBundle, REPO_ROOT } from './ir/bundle.ts';
import { error, formatDiagnostics, formatDiagnosticsJson, sortDiagnostics, type Diagnostic } from './ir/diagnostics.ts';
import { normalizeSources } from './normalize.ts';
import { writeOutputs, type WriteReport } from './output/write.ts';
import { fsReader } from './source/reader.ts';
import { verifyAll } from './verify/index.ts';

export interface BuildArgs {
  readonly check: boolean;
  readonly json: boolean;
  readonly only: readonly string[] | null;
  readonly root: string;
  readonly resolver: string;
}

export const USAGE = 'usage: node tokens/build.ts [--check] [--json] [--only <target,…>] [--root <dir>] [--resolver <path>]';

export function parseArgs(argv: readonly string[]): BuildArgs | string {
  let check = false;
  let json = false;
  let only: string[] | null = null;
  let root = REPO_ROOT;
  let resolver: string = PATHS.resolver;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') check = true;
    else if (a === '--json') json = true;
    else if (a === '--only' || a === '--root' || a === '--resolver') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      i++;
      if (a === '--root') root = resolve(v);
      else if (a === '--resolver') resolver = v;
      else {
        only = v.split(',').map((s) => s.trim()).filter((s) => s !== '');
        const unknown = only.filter((t) => !TARGETS.includes(t));
        if (unknown.length > 0 || only.length === 0) return `--only takes targets from ${TARGETS.join(', ')}; got ${v}`;
      }
    } else return `unknown argument ${a ?? ''}`;
  }
  if (check && only !== null) return '--only builds a subset of the outputs and never runs with --check';
  return { check, json, only, root: root.endsWith('/') ? root : `${root}/`, resolver };
}

export interface BuildResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly report: WriteReport | null;
  readonly files: number;
}

/** Runs the pipeline; writes only when every check passes (and never with `check`). */
export async function build(args: BuildArgs): Promise<BuildResult> {
  const reader = fsReader(args.root);
  const normalized = normalizeSources(reader);
  const hygiene: Diagnostic[] = [
    ...normalized.stale.map((s) => error('normalize/stale', `${s.pointer} is ${JSON.stringify(s.actual)} but must be ${JSON.stringify(s.expected)} (rule ${s.rule})`, { file: s.file, line: s.line, tokenId: s.tokenId, hint: 'run `pnpm tokens:normalize`' })),
    ...normalized.problems.map((p) => error('normalize/problem', p.message, { file: p.file, ...(p.line === undefined ? {} : { line: p.line }) })),
  ];
  if (hygiene.length > 0) return { diagnostics: sortDiagnostics(hygiene), report: null, files: 0 };

  const collected = await collectBundle({ root: args.root, reader, resolver: args.resolver });
  if (collected.bundle === null || collected.model === null) return { diagnostics: collected.diagnostics, report: null, files: 0 };
  if (!collected.bundle.analysis.complete) {
    return { diagnostics: [error('build/incomplete', 'the bundle was built without its full analysis; the formats need every permutation')], report: null, files: 0 };
  }
  const input: FormatInput = { bundle: collected.bundle, model: collected.model, root: args.root, reader };
  const rendered = renderAll(input, args.only ?? undefined);
  const diagnostics = [...collected.diagnostics, ...rendered.diagnostics, ...verifyAll(input, rendered.files)];
  if (diagnostics.length > 0) return { diagnostics: sortDiagnostics(diagnostics), report: null, files: rendered.files.length };
  const report = writeOutputs(rendered.files, { root: args.root, owned: OWNED_ROOTS, check: args.check, deleteStale: args.only === null });
  const stale = args.check ? [
    ...report.added.map((f) => error('output/stale', `${f} is missing`, { file: f, hint: 'run `pnpm tokens:build` and commit the result' })),
    ...report.changed.map((f) => error('output/stale', `${f} differs from the build`, { file: f, hint: 'run `pnpm tokens:build` and commit the result' })),
    ...report.removed.map((f) => error('output/stale', `${f} is no longer produced`, { file: f, hint: 'run `pnpm tokens:build` and commit the result' })),
  ] : [];
  return { diagnostics: stale, report, files: rendered.files.length };
}

export interface Io {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
}

const defaultIo: Io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) };

export async function main(argv: readonly string[], io: Io = defaultIo): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    io.err(`tokens:build: ${args}\n${USAGE}\n`);
    return 2;
  }
  const result = await build(args);
  if (args.json) io.out(formatDiagnosticsJson(result.diagnostics));
  else if (result.diagnostics.length > 0) io.out(`${formatDiagnostics(result.diagnostics)}\n${result.diagnostics.length} diagnostic(s)\n`);
  if (result.diagnostics.length > 0) return 1;
  const r = result.report;
  if (!args.json && r !== null) {
    const verb = args.check ? 'up to date' : `wrote ${r.added.length + r.changed.length}, removed ${r.removed.length}, unchanged ${r.unchanged}`;
    io.out(`tokens:${args.check ? 'check' : 'build'}: ${result.files} files, ${verb}\n`);
  }
  return 0;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
