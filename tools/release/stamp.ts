// release:stamp / release:check (roadmap P3-6, critic C-15; ADR-0006 rule 1, ADR-0014, ADR-0024 §14).
//
// The one step between `changeset version` and a tag. Changesets computes the number and writes it
// into the published manifests; this tool takes it from there, records it in `VERSION` and writes
// every derived copy from it (`tools/release/targets.ts` is the ledger). `--check` is the same walk
// without writing, and it is what keeps a hand-edited copy from reaching a tag: `stamp.test.ts` runs
// it against this repository, so drift fails `pnpm test` and therefore CI.
//
//   node release/stamp.ts                 stamp every derived copy from the fixed group's version
//   node release/stamp.ts --check         report drift and exit 1; write nothing
//   node release/stamp.ts --plan          print the version the pending changesets would produce
//   node release/stamp.ts --ledger        print who owns which version in this tree
//
//   --version <x.y.z>  the version the release intends; the published manifests must already carry it
//                      (the release workflow passes the tag's version, so the tag, the confirmation
//                      input and `changeset version` all have to agree)
//   --root <dir>       another tree with the same layout (a scratch clone, or a test fixture)
//   --json             machine-readable result on stdout instead of the table
//   --allow-major      permit a pending `major` changeset while the version is 0.x (ADR-0024 §14
//                      shifts a major to a minor below 1.0, so going to 1.0.0 is an owner decision)
//
// Exit codes: 0 done (or nothing to do), 1 drift under `--check`, a disagreement in the fixed group,
// a published package outside it, or a `major` while 0.x; 2 usage error.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { declaredBumpDetail } from '../tokens/diff/changesets.ts';
import type { Bump } from '../tokens/diff/classify.ts';
import {
  DERIVED,
  fixedGroupIssues,
  NOT_THE_SYSTEM_VERSION,
  publishedPackages,
  REPO_ROOT,
  StampError,
  tagFor,
  VERSION_PATTERN,
  type PublishedPackage,
  type VersionCarrier,
} from './targets.ts';

export type Mode = 'write' | 'check' | 'plan' | 'ledger';

export interface StampArgs {
  readonly mode: Mode;
  readonly version: string | null;
  readonly root: string;
  readonly json: boolean;
  readonly allowMajor: boolean;
}

export const USAGE =
  'usage: node release/stamp.ts [--check | --plan | --ledger] [--version <x.y.z>] [--root <dir>] [--json] [--allow-major]';

export function parseArgs(argv: readonly string[]): StampArgs | string {
  let mode: Mode = 'write';
  let version: string | null = null;
  let root = REPO_ROOT;
  let json = false;
  let allowMajor = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check' || a === '--plan' || a === '--ledger') {
      if (mode !== 'write') return 'give one of --check, --plan and --ledger';
      mode = a.slice(2) as Mode;
    } else if (a === '--json') json = true;
    else if (a === '--allow-major') allowMajor = true;
    else if (a === '--version' || a === '--root') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      i++;
      if (a === '--root') root = resolve(v);
      else {
        if (!VERSION_PATTERN.test(v)) return `--version needs a x.y.z version, got ${JSON.stringify(v)}`;
        version = v;
      }
    } else return `unknown argument ${a ?? ''}`;
  }
  return { mode, version, root, json, allowMajor };
}

export interface CarrierRow {
  readonly path: string;
  readonly what: string;
  /** What the file carries now; null when the place to carry it is missing. */
  readonly found: string | null;
  readonly wanted: string;
  readonly status: 'ok' | 'stale' | 'missing';
}

export interface StampResult {
  readonly mode: Mode;
  /** The version the fixed group carries; null when the group disagrees or is empty. */
  readonly version: string | null;
  readonly tag: string | null;
  readonly packages: readonly { readonly name: string; readonly version: string | null }[];
  readonly rows: readonly CarrierRow[];
  /** Paths written by a `write` run, in ledger order. */
  readonly written: readonly string[];
  readonly errors: readonly string[];
  /** `--plan` only: the pending bump and the version it would produce. */
  readonly plan: { readonly bump: Bump | null; readonly next: string | null } | null;
  readonly exitCode: number;
}

function read(root: string, carrier: VersionCarrier): string {
  return readFileSync(join(root, carrier.path), 'utf8');
}

/** The version the fixed group carries, or the reasons it carries none. */
export function groupVersion(packages: readonly PublishedPackage[]): { version: string | null; errors: string[] } {
  const errors: string[] = [];
  for (const p of packages) {
    if (p.version === null) errors.push(`${p.dir}/package.json: no top-level "version" at two spaces of indent`);
  }
  const versions = [...new Set(packages.map((p) => p.version).filter((v): v is string => v !== null))];
  if (packages.length === 0) errors.push('no published package found: nothing to take the version from');
  if (versions.length > 1) {
    const detail = packages.map((p) => `${p.name} ${p.version ?? '?'}`).join(', ');
    errors.push(`the fixed group disagrees (${detail}); run \`pnpm changeset version\` and do not hand-edit a manifest`);
  }
  return { version: versions.length === 1 ? (versions[0] ?? null) : null, errors };
}

/** semver for a 0.x-aware bump; the caller has already refused a major while 0.x. */
export function applyBump(version: string, bump: Bump): string {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
  if (bump === 'major') return `${String(major + 1)}.0.0`;
  if (bump === 'minor') return `${String(major)}.${String(minor + 1)}.0`;
  return `${String(major)}.${String(minor)}.${String(patch + 1)}`;
}

export function runStamp(args: StampArgs): StampResult {
  const errors: string[] = [];
  const packages = publishedPackages(args.root);
  const group = groupVersion(packages);
  errors.push(...group.errors);
  errors.push(...fixedGroupIssues(args.root, packages.map((p) => p.name)));

  if (args.version !== null && group.version !== null && args.version !== group.version) {
    errors.push(
      `the release intends ${args.version}, but the fixed group carries ${group.version}: run \`pnpm changeset version\` first, or release the version the manifests already hold`,
    );
  }
  const version = args.version ?? group.version;

  // ADR-0024 §14: below 1.0 a breaking change is declared `minor`, so a pending `major` would take
  // the system straight to 1.0.0 and past the roadmap's own plan. It is allowed, but only on purpose.
  const declared = declaredBumpDetail(join(args.root, '.changeset'), packages.map((p) => p.name));
  if (declared.bump === 'major' && version !== null && version.startsWith('0.') && !args.allowMajor) {
    const files = [...new Set(declared.releases.filter((r) => r.type === 'major').map((r) => r.file))].join(', ');
    errors.push(
      `${files} declares a \`major\` bump while the system is ${version}: below 1.0 a breaking change is declared \`minor\` (ADR-0024 §14). Going to 1.0.0 is the owner's decision — pass --allow-major to mean it.`,
    );
  }

  if (args.mode === 'plan') {
    const next = version !== null && declared.bump !== null ? applyBump(version, declared.bump) : null;
    return {
      mode: args.mode,
      version,
      tag: next === null ? null : tagFor(next),
      packages: packages.map((p) => ({ name: p.name, version: p.version })),
      rows: [],
      written: [],
      errors,
      plan: { bump: declared.bump, next },
      exitCode: errors.length > 0 ? 1 : 0,
    };
  }

  const rows: CarrierRow[] = [];
  const written: string[] = [];
  if (version !== null && args.mode !== 'ledger') {
    for (const carrier of DERIVED) {
      let text: string;
      try {
        text = read(args.root, carrier);
      } catch {
        rows.push({ path: carrier.path, what: carrier.what, found: null, wanted: version, status: 'missing' });
        errors.push(`${carrier.path}: not found`);
        continue;
      }
      const found = carrier.read(text);
      if (found === null) {
        rows.push({ path: carrier.path, what: carrier.what, found: null, wanted: version, status: 'missing' });
        errors.push(`${carrier.path}: ${carrier.what} is not there to stamp`);
        continue;
      }
      if (found === version) {
        rows.push({ path: carrier.path, what: carrier.what, found, wanted: version, status: 'ok' });
        continue;
      }
      rows.push({ path: carrier.path, what: carrier.what, found, wanted: version, status: 'stale' });
      if (args.mode === 'write') {
        writeFileSync(join(args.root, carrier.path), carrier.write(text, version), 'utf8');
        written.push(carrier.path);
      }
    }
  }

  const stale = rows.filter((r) => r.status !== 'ok');
  const failed = errors.length > 0 || (args.mode === 'check' && stale.length > 0);
  return {
    mode: args.mode,
    version,
    tag: version === null ? null : tagFor(version),
    packages: packages.map((p) => ({ name: p.name, version: p.version })),
    rows,
    written,
    errors,
    plan: null,
    exitCode: failed ? 1 : 0,
  };
}

export interface Io {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

const defaultIo: Io = { out: (l) => console.log(l), err: (l) => console.error(l) };

export function render(result: StampResult): string[] {
  const lines: string[] = [];
  if (result.mode === 'ledger') {
    lines.push('Who owns the system version (tools/release/README.md):');
    lines.push('  computed by   `changeset version` over the fixed group of .changeset/config.json');
    for (const p of result.packages) lines.push(`    source      ${p.name} ${p.version ?? '?'}`);
    lines.push('  recorded in   VERSION');
    for (const carrier of DERIVED.slice(1)) lines.push(`    derived     ${carrier.path} — ${carrier.what}`);
    lines.push('  released as   ' + (result.tag ?? 'v<VERSION>'));
    lines.push('');
    lines.push('Not the system version:');
    for (const n of NOT_THE_SYSTEM_VERSION) lines.push(`  ${n.path} — ${n.what}`);
    return lines;
  }
  if (result.mode === 'plan') {
    lines.push(`current  ${result.version ?? '?'}`);
    lines.push(`bump     ${result.plan?.bump ?? 'none pending'}`);
    lines.push(`next     ${result.plan?.next ?? '(nothing to release)'}`);
    lines.push(`tag      ${result.tag ?? '—'}`);
    return lines;
  }
  lines.push(`system version ${result.version ?? '?'} (tag ${result.tag ?? '?'})`);
  for (const row of result.rows) {
    const mark = row.status === 'ok' ? 'ok     ' : row.status === 'stale' ? 'stale  ' : 'missing';
    const detail = row.status === 'ok' ? row.found ?? '' : `${row.found ?? '—'} → ${row.wanted}`;
    lines.push(`  ${mark} ${row.path}  ${detail}`);
  }
  if (result.written.length > 0) lines.push(`stamped ${String(result.written.length)} file(s)`);
  return lines;
}

export function main(argv: readonly string[], io: Io = defaultIo): number {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    io.err(`release:stamp: ${args}\n${USAGE}`);
    return 2;
  }
  let result: StampResult;
  try {
    result = runStamp(args);
  } catch (e) {
    if (e instanceof StampError) {
      io.err(`release:stamp: ${e.message}`);
      return 1;
    }
    throw e;
  }
  if (args.json) io.out(JSON.stringify(result, null, 2));
  else for (const line of render(result)) io.out(line);
  for (const error of result.errors) io.err(`release:stamp: ${error}`);
  if (args.mode === 'check' && result.exitCode !== 0 && result.errors.length === 0) {
    io.err('release:stamp: run `pnpm release:stamp` and commit the result; no copy of the version is edited by hand');
  }
  return result.exitCode;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
