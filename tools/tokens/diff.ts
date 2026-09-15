// CLI `tokens:diff` (ARCHITECTURE §11, ADR-0024 §14, roadmap P1-7): classifies the token changes
// between the last release tag and the working tree and fails when the pending changesets declare a
// lower bump than the changes require. Both sides are built by this checkout's tool code; the base
// side reads its sources from git (`diff/git.ts`), so a tooling change never shows up as a token
// change, and nothing here writes to the repository.
//
//   node tokens/diff.ts [--base <ref>] [--changesets <dir>] [--json] [--allow-invalid-baseline <reason>]
//                       [--root <dir>] [--resolver <path>]
//
//   --base       compare against this revision instead of the last release tag; the policy then
//                comes from the newest release tag merged into it (ADR-0024 §14)
//   --changesets the pending changesets (default: <root>/.changeset)
//   --json       the outcome as JSON on stdout instead of Markdown
//   --allow-invalid-baseline <reason>
//                for a person only: when the base fails the current validation, skip the comparison
//                and record the reason instead of failing; CI never passes it
//   --root       repository root (default: this checkout); --resolver: repository-relative resolver path
//
// Policy: `shifted` while the base release tag is 0.x (a major change requires minor, a minor change
// patch), `strict` from 1.0 on. With no release tag yet the run passes with a notice.
// Markdown goes to stdout and is appended to $GITHUB_STEP_SUMMARY when it is set.
//
// Exit codes: 0 pass (or nothing to compare), 1 declared < required, an invalid base or working tree,
// a malformed changeset or a shallow clone, 2 usage error.
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PATHS } from './config.ts';
import { compareBumps, diffBundles, policyFor, requiredBump } from './diff/classify.ts';
import { ChangesetError, declaredBumpDetail, TOKEN_PACKAGES, type DeclaredBump } from './diff/changesets.ts';
import { gitReader, isGitWorkTree, isShallow, lastReleaseTag, releaseVersion, resolveCommit, GitError } from './diff/git.ts';
import { NO_BASELINE_NOTICE, renderMarkdown, toJson, type DiffOutcome } from './diff/report.ts';
import { collectBundle, REPO_ROOT } from './ir/bundle.ts';

export interface DiffArgs {
  readonly base: string | null;
  readonly changesets: string;
  readonly json: boolean;
  readonly allowInvalidBaseline: string | null;
  readonly root: string;
  readonly resolver: string;
}

export const USAGE =
  'usage: node tokens/diff.ts [--base <ref>] [--changesets <dir>] [--json] [--allow-invalid-baseline <reason>] [--root <dir>] [--resolver <path>]';

export function parseArgs(argv: readonly string[]): DiffArgs | string {
  let base: string | null = null;
  let changesets: string | null = null;
  let json = false;
  let allow: string | null = null;
  let root = REPO_ROOT;
  let resolver: string = PATHS.resolver;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--base' || a === '--changesets' || a === '--allow-invalid-baseline' || a === '--root' || a === '--resolver') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      i++;
      if (a === '--base') {
        if (v.trim() === '' || v.startsWith('-')) return `--base needs a revision, got ${JSON.stringify(v)}`;
        base = v;
      } else if (a === '--changesets') changesets = resolve(v);
      else if (a === '--allow-invalid-baseline') {
        if (v.trim() === '') return '--allow-invalid-baseline needs a reason';
        allow = v.trim();
      } else if (a === '--root') root = resolve(v);
      else resolver = v;
    } else return `unknown argument ${a ?? ''}`;
  }
  return { base, changesets: changesets ?? join(root, '.changeset'), json, allowInvalidBaseline: allow, root, resolver };
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

function outcome(partial: Partial<DiffOutcome> & Pick<DiffOutcome, 'status' | 'exitCode'>): DiffOutcome {
  return {
    base: null, tag: null, policy: null, changes: [], required: null, requiredStrict: null, declared: null,
    packages: TOKEN_PACKAGES, diagnostics: [], modifiers: [], notice: null, reason: null, error: null,
    ...partial,
  };
}

/** Runs the comparison. Throws UsageError for a bad root or an unknown --base. */
export async function runDiff(args: DiffArgs): Promise<DiffOutcome> {
  const { root } = args;
  if (!isGitWorkTree(root)) throw new UsageError(`${root} is not inside a git work tree; tokens:diff reads the base revision from git`);

  let declared: DeclaredBump;
  try {
    declared = declaredBumpDetail(args.changesets);
  } catch (e) {
    if (!(e instanceof ChangesetError)) throw e;
    return outcome({ status: 'error', exitCode: 1, error: `malformed changeset in ${args.changesets}: ${e.message}` });
  }
  if (isShallow(root)) {
    return outcome({
      status: 'error', exitCode: 1, declared,
      error: 'the repository is a shallow clone, whose history and release tags may be incomplete; tokens:diff needs the full history (actions/checkout with fetch-depth: 0, or git fetch --unshallow --tags)',
    });
  }

  let base: { ref: string; commit: string };
  let tag: string | null;
  if (args.base !== null) {
    let commit: string;
    try {
      commit = resolveCommit(args.base, root);
    } catch (e) {
      if (e instanceof GitError) throw new UsageError(`--base ${args.base}: ${e.message}`);
      throw e;
    }
    base = { ref: args.base, commit };
    tag = lastReleaseTag(root, commit);
  } else {
    try {
      tag = lastReleaseTag(root);
    } catch (e) {
      if (e instanceof GitError) throw new UsageError(`HEAD names no commit in ${root}: ${e.message}`);
      throw e;
    }
    if (tag === null) return outcome({ status: 'no-baseline', exitCode: 0, declared, notice: NO_BASELINE_NOTICE });
    base = { ref: tag, commit: resolveCommit(`refs/tags/${tag}`, root) };
  }
  const version = tag === null ? null : releaseVersion(tag);
  const policy = version === null ? null : policyFor(version.major);

  const before = await collectBundle({ reader: gitReader(base.commit, root), resolver: args.resolver });
  if (before.bundle === null) {
    const diagnostics = before.diagnostics;
    if (args.allowInvalidBaseline !== null) {
      return outcome({ status: 'baseline-allowed', exitCode: 0, base, tag, policy, declared, diagnostics, reason: args.allowInvalidBaseline });
    }
    return outcome({ status: 'invalid-baseline', exitCode: 1, base, tag, policy, declared, diagnostics });
  }
  const after = await collectBundle({ root, resolver: args.resolver });
  if (after.bundle === null) {
    return outcome({ status: 'invalid-working-tree', exitCode: 1, base, tag, policy, declared, diagnostics: after.diagnostics });
  }

  const changes = diffBundles(before.bundle, after.bundle);
  const requiredStrict = requiredBump(changes, 'strict');
  const modifiers = after.bundle.model.modifiers;
  if (policy === null) {
    return outcome({ status: 'no-release', exitCode: 0, base, tag, changes, requiredStrict, declared, modifiers });
  }
  const required = requiredBump(changes, policy);
  const ok = compareBumps(declared.bump, required) >= 0;
  return outcome({ status: ok ? 'pass' : 'fail', exitCode: ok ? 0 : 1, base, tag, policy, changes, required, requiredStrict, declared, modifiers });
}

export interface Io {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  /** Receives the Markdown report; by default appends it to $GITHUB_STEP_SUMMARY when that is set. */
  readonly summary: (markdown: string) => void;
}

const defaultIo: Io = {
  out: (t) => process.stdout.write(t),
  err: (t) => process.stderr.write(t),
  summary: (md) => {
    const file = process.env['GITHUB_STEP_SUMMARY'];
    if (file !== undefined && file !== '') appendFileSync(file, `${md}\n`);
  },
};

/** Rows and diagnostics the step summary shows; GitHub caps a step summary at 1 MiB. */
const SUMMARY_LIMITS = { maxRows: 500, maxDiagnostics: 50 } as const;

export async function main(argv: readonly string[], io: Io = defaultIo): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    io.err(`tokens:diff: ${args}\n${USAGE}\n`);
    return 2;
  }
  let result: DiffOutcome;
  try {
    result = await runDiff(args);
  } catch (e) {
    if (e instanceof UsageError) {
      io.err(`tokens:diff: ${e.message}\n${USAGE}\n`);
      return 2;
    }
    throw e;
  }
  io.out(args.json ? `${JSON.stringify(toJson(result), null, 2)}\n` : renderMarkdown(result));
  io.summary(renderMarkdown(result, SUMMARY_LIMITS));
  return result.exitCode;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
