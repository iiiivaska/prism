// Development CLI for the P1-3 driver: runs the source checks, every Style Dictionary permutation, the
// IR invariants and the analysis, and prints every diagnostic with file, line and fix. It writes
// nothing. `build.ts` (P1-5) takes over the same flags; this file is not a CI gate file.
//
//   node tokens/diagnose.ts [--json] [--root <dir>] [--resolver <repo-relative path>]
//
// Exit codes: 0 no diagnostics, 1 diagnostics, 2 usage error.
import { resolve } from 'node:path';
import { collectBundle, REPO_ROOT } from './ir/bundle.ts';
import { formatDiagnostics, formatDiagnosticsJson } from './ir/diagnostics.ts';

interface Args { json: boolean; root: string; resolver: string | undefined }

function parseArgs(argv: readonly string[]): Args | string {
  const args: Args = { json: false, root: REPO_ROOT, resolver: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--root' || a === '--resolver') {
      const v = argv[i + 1];
      if (v === undefined) return `${a} needs a value`;
      if (a === '--root') args.root = resolve(v);
      else args.resolver = v;
      i++;
    } else return `unknown argument ${a ?? ''}`;
  }
  return args;
}

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    process.stderr.write(`diagnose: ${args}\nusage: node tokens/diagnose.ts [--json] [--root <dir>] [--resolver <path>]\n`);
    return 2;
  }
  const result = await collectBundle({ root: args.root, ...(args.resolver === undefined ? {} : { resolver: args.resolver }) });
  if (args.json) process.stdout.write(formatDiagnosticsJson(result.diagnostics));
  else if (result.diagnostics.length > 0) process.stdout.write(`${formatDiagnostics(result.diagnostics)}\n${result.diagnostics.length} diagnostic(s)\n`);
  else process.stdout.write(`ok: ${result.bundle?.permutations.size ?? 0} permutations, no diagnostics\n`);
  return result.diagnostics.length > 0 ? 1 : 0;
}

process.exitCode = await main(process.argv.slice(2));
