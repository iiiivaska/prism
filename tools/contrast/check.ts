// contrast:check (ARCHITECTURE §3.2, §10; ADR-0011, ADR-0020 rule 10, ADR-0022 rules 5 and 7): builds the
// token bundle, takes every brand × colorScheme context (`api.contrastContexts`, platform web, the other
// axes at their defaults), evaluates every pair of tokens/contrast-pairs.json in every context its
// `schemes` allow, checks that every a11y.pairsWith of a sys.color.text.* token is a pair (tokens/README.md
// rule 4) and that V1 and V2 reach every vivid gradient, then prints a Markdown table on stdout and appends
// it to $GITHUB_STEP_SUMMARY.
//
//   node contrast/check.ts [--root <dir>] [--resolver <path>] [--pairs <path>] [--report <file>]
//
// --root is the tree to read (default: the repository); --resolver and --pairs are relative to it
// (defaults: tokens/prism.resolver.json and contrast-pairs.json next to the resolver); --report also
// writes the Markdown to a file. A fixture runs as its own root, because the build checks brand
// registration against <root>/brands/: `node contrast/check.ts --root contrast/fixtures/broken-pair`.
// Exit codes: 0 every pair passes; 1 a pair fails, the pairs file is invalid, a pairsWith or gradient is
// not covered, or the token build fails; 2 usage error.
import { appendFileSync, writeFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import {
  collectBundle, contrastContexts, fsReader, REPO_ROOT,
  type ContrastContext, type Diagnostic, type IRBundle, type PermKey, type SourceReader,
} from '../tokens/api.ts';
import { cardGeometries, type CardGeometry } from './gradient.ts';
import {
  appliesTo, contextLabel, evaluatePair, gradientCoverageProblems, pairLabel, PairError, pairsWithProblems, parsePairsFile,
  type Env, type Evaluation, type PairsFile, type Problem,
} from './pairs.ts';
import { formatRatio, renderReport } from './report.ts';

export const DEFAULT_RESOLVER = 'tokens/prism.resolver.json';
export const PAIRS_FILE = 'contrast-pairs.json';

export interface CheckOptions {
  /** Tree to read; default: the repository. Ignored when `reader` is given. */
  readonly root?: string;
  readonly reader?: SourceReader;
  /** Resolver path relative to the root; default tokens/prism.resolver.json. */
  readonly resolver?: string;
  /** Pairs file relative to the root; default contrast-pairs.json next to the resolver. */
  readonly pairs?: string;
}

export interface CheckResult {
  readonly pairsPath: string;
  readonly file: PairsFile | null;
  readonly bundle: IRBundle | null;
  readonly contexts: readonly ContrastContext[];
  readonly evaluations: readonly Evaluation[];
  readonly problems: readonly Problem[];
  readonly diagnostics: readonly Diagnostic[];
}

export function passed(r: CheckResult): boolean {
  return r.file !== null && r.bundle !== null && r.diagnostics.length === 0 && r.problems.length === 0 && r.evaluations.every((e) => e.pass);
}

export async function runCheck(opts: CheckOptions = {}): Promise<CheckResult> {
  const reader = opts.reader ?? fsReader(opts.root ?? REPO_ROOT);
  const resolver = opts.resolver ?? DEFAULT_RESOLVER;
  const pairsPath = opts.pairs ?? posix.join(posix.dirname(resolver), PAIRS_FILE);
  const problems: Problem[] = [];

  let file: PairsFile | null = null;
  try {
    const parsed = parsePairsFile(reader.readText(pairsPath), pairsPath);
    file = parsed.file;
    problems.push(...parsed.problems);
  } catch (e) {
    problems.push({ where: pairsPath, message: e instanceof Error ? e.message : String(e) });
  }

  const collected = await collectBundle({ reader, resolver });
  const bundle = collected.bundle;
  const result = (contexts: readonly ContrastContext[], evaluations: readonly Evaluation[]): CheckResult =>
    ({ pairsPath, file, bundle, contexts, evaluations, problems, diagnostics: collected.diagnostics });
  if (bundle === null) return result([], []);

  let contexts: readonly ContrastContext[];
  try {
    contexts = contrastContexts(bundle);
  } catch (e) {
    problems.push({ where: resolver, message: e instanceof Error ? e.message : String(e) });
    return result([], []);
  }
  if (file === null) return result(contexts, []);

  const geometries = new Map<PermKey, readonly CardGeometry[]>();
  const env: Env = {
    thresholds: file.thresholds,
    geometries(ctx) {
      let g = geometries.get(ctx.permutation);
      if (g === undefined) {
        try {
          g = cardGeometries(bundle, ctx.permutation);
        } catch (e) {
          throw new PairError(e instanceof Error ? e.message : String(e));
        }
        geometries.set(ctx.permutation, g);
      }
      return g;
    },
  };

  const evaluations: Evaluation[] = [];
  const reported = new Set<string>();
  for (const pair of file.pairs) {
    const where = `${pairsPath}:${pair.line ?? '?'} pairs[${pair.index}]`;
    const applicable = contexts.filter((ctx) => appliesTo(pair, ctx));
    if (applicable.length === 0) problems.push({ where, message: `${pairLabel(pair)} applies to no context` });
    for (const ctx of applicable) {
      try {
        evaluations.push(evaluatePair(pair, ctx, env));
      } catch (e) {
        if (!(e instanceof PairError)) throw e;
        const key = `${pair.index}|${e.message}`;
        if (reported.has(key)) continue;
        reported.add(key);
        problems.push({ where, message: `${pairLabel(pair)} in ${contextLabel(ctx)}: ${e.message}` });
      }
    }
  }
  problems.push(...pairsWithProblems(bundle, contexts, file.pairs));
  problems.push(...gradientCoverageProblems(bundle, contexts, evaluations));
  return result(contexts, evaluations);
}

export function report(r: CheckResult): string {
  return renderReport({
    pairsPath: r.pairsPath,
    thresholds: r.file?.thresholds ?? null,
    pairs: r.file?.pairs.length ?? 0,
    contexts: r.contexts.map(contextLabel),
    evaluations: r.evaluations,
    problems: r.problems,
    diagnostics: r.diagnostics,
  });
}

interface Args {
  root: string;
  resolver: string | undefined;
  pairs: string | undefined;
  reportFile: string | undefined;
}

function parseArgs(argv: readonly string[]): Args | string {
  const args: Args = { root: REPO_ROOT, resolver: undefined, pairs: undefined, reportFile: undefined };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? '';
    const value = argv[i + 1];
    if (!['--root', '--resolver', '--pairs', '--report'].includes(flag)) return `unknown argument ${JSON.stringify(flag)}`;
    if (value === undefined || value.startsWith('--')) return `${flag} needs a value`;
    if (flag === '--root') args.root = resolve(value);
    else if (flag === '--resolver') args.resolver = value;
    else if (flag === '--pairs') args.pairs = value;
    else args.reportFile = resolve(value);
    i++;
  }
  return args;
}

/** CLI entry; returns the process exit code. */
export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    console.error(`contrast:check: ${args}\nusage: node contrast/check.ts [--root <dir>] [--resolver <path>] [--pairs <path>] [--report <file>]`);
    return 2;
  }
  const result = await runCheck({
    root: args.root,
    ...(args.resolver === undefined ? {} : { resolver: args.resolver }),
    ...(args.pairs === undefined ? {} : { pairs: args.pairs }),
  });
  const markdown = report(result);
  process.stdout.write(markdown);
  const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
  if (summaryFile) {
    try {
      appendFileSync(summaryFile, `## contrast:check\n\n${markdown}\n`);
    } catch (e) {
      console.error(`contrast:check: cannot append to GITHUB_STEP_SUMMARY: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (args.reportFile !== undefined) writeFileSync(args.reportFile, `# contrast:check\n\n${markdown}`);
  const failing = result.evaluations.filter((e) => !e.pass);
  if (passed(result)) {
    console.error(`contrast:check: ${result.evaluations.length} evaluations in ${result.contexts.length} contexts pass (ADR-0011)`);
    return 0;
  }
  for (const e of failing) console.error(`FAIL ${pairLabel(e.pair)} in ${contextLabel(e.context)}: ${formatRatio(e.ratio)} < ${e.threshold.toFixed(2)} (${e.worst})`);
  for (const p of result.problems) console.error(`${p.where}: ${p.message}`);
  if (result.diagnostics.length > 0) console.error(`contrast:check: the token build reports ${result.diagnostics.length} diagnostic(s)`);
  console.error(`contrast:check: ${failing.length} failing evaluation(s), ${result.problems.length} other problem(s) (ADR-0011, ADR-0022)`);
  return 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
