// release:stamp (roadmap P3-6, critic C-15): this repository's copies of the system version agree
// with the fixed group, and every rule the stamper enforces is exercised on a miniature tree — the
// fixed group is complete and agrees, a hand-edited copy is drift, a nested `version` is never the
// system version, and a `major` while 0.x is the owner's decision (ADR-0024 §14).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { checkSfNamesAbsent } from '../icons/checks.ts';
import { loadRegistry } from '../icons/registry.ts';
import { changesetFiles } from '../tokens/diff/changesets.ts';
import { main, parseArgs, runStamp, type Io, type StampArgs } from './stamp.ts';
import { DERIVED, publishedPackages, REPO_ROOT, tagFor, versionOfTag } from './targets.ts';

const temporary: string[] = [];

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function write(root: string, path: string, text: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, 'utf8');
}

interface TreeOptions {
  /** Version per published package; equal versions are the healthy case. */
  readonly published?: Readonly<Record<string, string>>;
  readonly derived?: string;
  readonly fixed?: readonly (readonly string[])[];
  readonly changesets?: Readonly<Record<string, string>>;
}

/**
 * A miniature of the repository layout: the paths `DERIVED` names, two published packages and one
 * private app. Everything the stamper reads is here and nothing else is, so a failure names a rule
 * and not a missing file.
 */
function tree(options: TreeOptions = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'prism-stamp-'));
  temporary.push(root);
  const published = options.published ?? { tokens: '0.2.0', react: '0.2.0', charts: '0.2.0' };
  const derived = options.derived ?? '0.2.0';
  write(root, 'pnpm-workspace.yaml', 'packages:\n  - web/packages/*\n  - web/apps/*\n  - tools\n');
  write(
    root,
    '.changeset/config.json',
    `${JSON.stringify(
      {
        fixed: options.fixed ?? [['@iiiivaska/prism-*']],
        ignore: ['@iiiivaska/prism-gallery', '@iiiivaska/prism-vrt', '@iiiivaska/prism-tools'],
      },
      null,
      2,
    )}\n`,
  );
  for (const [file, text] of Object.entries(options.changesets ?? {})) write(root, `.changeset/${file}`, text);
  for (const [name, version] of Object.entries(published)) {
    write(root, `web/packages/${name}/package.json`, `{\n  "name": "@iiiivaska/prism-${name}",\n  "version": "${version}",\n  "license": "SEE LICENSE IN LICENSE"\n}\n`);
  }
  write(root, 'web/apps/gallery/package.json', `{\n  "name": "@iiiivaska/prism-gallery",\n  "private": true,\n  "version": "${derived}"\n}\n`);
  write(root, 'web/apps/vrt/package.json', `{\n  "name": "@iiiivaska/prism-vrt",\n  "private": true,\n  "version": "${derived}"\n}\n`);
  write(root, 'tools/package.json', `{\n  "name": "@iiiivaska/prism-tools",\n  "version": "${derived}",\n  "private": true\n}\n`);
  write(root, 'package.json', `{\n  "name": "prism-monorepo",\n  "private": true,\n  "version": "${derived}"\n}\n`);
  write(root, 'VERSION', `${derived}\n`);
  write(root, 'swift/Sources/DSTokens/DSTokens.swift', `public enum DSTokensInfo {\n    public static let version = "${derived}"\n}\n`);
  write(root, 'web/packages/tokens/src/index.ts', `export const version = "${derived}";\n`);
  write(
    root,
    'spec/icons/registry.json',
    `{\n  "version": "${derived}",\n  "sources": {\n    "phosphor": {\n      "package": "@phosphor-icons/core",\n      "version": "2.1.1"\n    }\n  },\n  "icons": {\n    "action.add": { "since": "0.1.0" }\n  }\n}\n`,
  );
  write(
    root,
    'licenses/inventory.json',
    `{\n  "updated": "2026-09-22",\n  "items": [\n    { "id": "prism", "kind": "code", "name": "Prism (this repository)", "version": "${derived}", "spdx": "LicenseRef-Prism-Proprietary", "packaged": true },\n    { "id": "onest", "kind": "font", "name": "Onest", "version": "2.001", "spdx": "OFL-1.1", "packaged": true }\n  ]\n}\n`,
  );
  return root;
}

function args(root: string, overrides: Partial<StampArgs> = {}): StampArgs {
  return { mode: 'write', version: null, root, json: false, allowMajor: false, ...overrides };
}

/** The CLI's own output, so a test can read what an operator would read. */
function capture(argv: readonly string[]): { code: number; out: string; err: string } {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = { out: (l) => void out.push(l), err: (l) => void err.push(l) };
  return { code: main(argv, io), out: out.join('\n'), err: err.join('\n') };
}

const versionOf = (root: string, path: string): string | null => {
  const carrier = DERIVED.find((c) => c.path === path);
  if (carrier === undefined) throw new Error(`${path} is not in the ledger`);
  return carrier.read(readFileSync(join(root, path), 'utf8'));
};

describe('the version authority', () => {
  test('the fixed group is the source, and every derived copy is written from it', () => {
    const root = tree({ published: { tokens: '0.3.0', react: '0.3.0', charts: '0.3.0' }, derived: '0.2.0' });
    const result = runStamp(args(root));
    expect(result.errors).toEqual([]);
    expect(result.version).toBe('0.3.0');
    expect(result.tag).toBe('v0.3.0');
    expect(result.written.map((p) => p)).toEqual(DERIVED.map((c) => c.path));
    for (const carrier of DERIVED) expect(versionOf(root, carrier.path)).toBe('0.3.0');
    expect(readFileSync(join(root, 'VERSION'), 'utf8')).toBe('0.3.0\n');
  });

  test('a second run writes nothing and a check passes', () => {
    const root = tree({ published: { tokens: '0.3.0', react: '0.3.0', charts: '0.3.0' }, derived: '0.2.0' });
    runStamp(args(root));
    const again = runStamp(args(root));
    expect(again.written).toEqual([]);
    expect(runStamp(args(root, { mode: 'check' })).exitCode).toBe(0);
  });

  test('a hand-edited copy is drift: --check names the file, exits 1 and writes nothing', () => {
    const root = tree();
    write(root, 'swift/Sources/DSTokens/DSTokens.swift', 'public enum DSTokensInfo {\n    public static let version = "9.9.9"\n}\n');
    const result = runStamp(args(root, { mode: 'check' }));
    expect(result.exitCode).toBe(1);
    const row = result.rows.find((r) => r.path === 'swift/Sources/DSTokens/DSTokens.swift');
    expect(row?.status).toBe('stale');
    expect(row?.found).toBe('9.9.9');
    expect(versionOf(root, 'swift/Sources/DSTokens/DSTokens.swift')).toBe('9.9.9');
    const cli = capture(['--check', '--root', root]);
    expect(cli.code).toBe(1);
    expect(cli.out).toContain('stale   swift/Sources/DSTokens/DSTokens.swift  9.9.9 → 0.2.0');
    expect(cli.err).toContain('run `pnpm release:stamp`');
  });

  test('a fixed group that has stopped moving together is an error, not a guess', () => {
    const root = tree({ published: { tokens: '0.3.0', react: '0.2.0', charts: '0.3.0' } });
    const result = runStamp(args(root, { mode: 'check' }));
    expect(result.version).toBeNull();
    expect(result.errors.join('\n')).toContain('the fixed group disagrees');
    expect(result.errors.join('\n')).toContain('@iiiivaska/prism-react 0.2.0');
    expect(result.exitCode).toBe(1);
  });

  test('a published package outside the fixed group is an error (ADR-0014, one tag = one version)', () => {
    const root = tree({ fixed: [['@iiiivaska/prism-tokens', '@iiiivaska/prism-react']] });
    const result = runStamp(args(root, { mode: 'check' }));
    expect(result.errors.join('\n')).toContain('@iiiivaska/prism-charts is published but is in no fixed group');
    expect(result.exitCode).toBe(1);
  });

  test('two fixed groups that split the published packages are an error', () => {
    const root = tree({ fixed: [['@iiiivaska/prism-tokens'], ['@iiiivaska/prism-react', '@iiiivaska/prism-charts']] });
    const result = runStamp(args(root, { mode: 'check' }));
    expect(result.errors.join('\n')).toContain('no fixed group holds all of');
    expect(result.exitCode).toBe(1);
  });

  test('the release may not intend a version the manifests do not carry', () => {
    const root = tree();
    const result = runStamp(args(root, { mode: 'check', version: '0.4.0' }));
    expect(result.errors.join('\n')).toContain('the release intends 0.4.0, but the fixed group carries 0.2.0');
    expect(result.exitCode).toBe(1);
  });

  test('a private package is never a source, however it is named', () => {
    const root = tree();
    expect(publishedPackages(root).map((p) => p.name)).toEqual([
      '@iiiivaska/prism-charts',
      '@iiiivaska/prism-react',
      '@iiiivaska/prism-tokens',
    ]);
  });
});

describe('the pre-1.0 bump policy (ADR-0024 §14)', () => {
  const major = { 'breaking.md': '---\n"@iiiivaska/prism-tokens": major\n---\n\nA removal.\n' };

  test('a major changeset while 0.x is refused, and names the file', () => {
    const root = tree({ changesets: major });
    const result = runStamp(args(root, { mode: 'check' }));
    expect(result.errors.join('\n')).toContain('breaking.md declares a `major` bump while the system is 0.2.0');
    expect(result.exitCode).toBe(1);
  });

  test('--allow-major is how 1.0.0 is meant on purpose', () => {
    const root = tree({ changesets: major });
    const result = runStamp(args(root, { mode: 'plan', allowMajor: true }));
    expect(result.errors).toEqual([]);
    expect(result.plan).toEqual({ bump: 'major', next: '1.0.0' });
  });

  test('a major from 1.x is ordinary', () => {
    const root = tree({ published: { tokens: '1.2.3', react: '1.2.3', charts: '1.2.3' }, derived: '1.2.3', changesets: major });
    const result = runStamp(args(root, { mode: 'plan' }));
    expect(result.errors).toEqual([]);
    expect(result.plan?.next).toBe('2.0.0');
  });
});

describe('--plan', () => {
  test('reads the pending changesets through the fixed group, whichever package they name', () => {
    const root = tree({ changesets: { 'a.md': '---\n"@iiiivaska/prism-react": minor\n---\n\nOne package named.\n' } });
    const result = runStamp(args(root, { mode: 'plan' }));
    expect(result.plan).toEqual({ bump: 'minor', next: '0.3.0' });
    expect(result.tag).toBe('v0.3.0');
  });

  test('a patch is a patch, and nothing pending is nothing to release', () => {
    expect(runStamp(args(tree({ changesets: { 'a.md': '---\n"@iiiivaska/prism-tokens": patch\n---\n\nFix.\n' } }), { mode: 'plan' })).plan)
      .toEqual({ bump: 'patch', next: '0.2.1' });
    expect(runStamp(args(tree(), { mode: 'plan' })).plan).toEqual({ bump: null, next: null });
  });

  test('a changeset for an ignored package does not release the group', () => {
    const root = tree({ changesets: { 'a.md': '---\n"@iiiivaska/prism-gallery": minor\n---\n\nAn app.\n' } });
    expect(runStamp(args(root, { mode: 'plan' })).plan).toEqual({ bump: null, next: null });
  });
});

describe('the ledger', () => {
  test('a nested "version" is never mistaken for the system version', () => {
    const root = tree({ published: { tokens: '0.3.0', react: '0.3.0', charts: '0.3.0' }, derived: '0.2.0' });
    runStamp(args(root));
    const registry = readFileSync(join(root, 'spec/icons/registry.json'), 'utf8');
    expect(registry).toContain('"version": "0.3.0"');
    expect(registry).toContain('"package": "@phosphor-icons/core",\n      "version": "2.1.1"');
    expect(registry).toContain('"since": "0.1.0"');
  });

  test('a carrier that grew a second copy of the version is an error, not a half-stamp', () => {
    const root = tree({ published: { tokens: '0.3.0', react: '0.3.0', charts: '0.3.0' }, derived: '0.2.0' });
    const twice = 'public enum DSTokensInfo {\n    public static let version = "0.2.0"\n    public static let version = "0.0.1"\n}\n';
    write(root, 'swift/Sources/DSTokens/DSTokens.swift', twice);

    // `--check` must not read the first copy and call the file settled.
    const checked = capture(['--check', '--root', root]);
    expect(checked.code).toBe(1);
    expect(checked.err).toContain('swift/Sources/DSTokens/DSTokens.swift');
    expect(checked.err).toContain('matched 2 times; the ledger expects exactly one');

    // And a write must refuse rather than stamp one copy and leave the other behind.
    expect(capture(['--root', root]).code).toBe(1);
    expect(readFileSync(join(root, 'swift/Sources/DSTokens/DSTokens.swift'), 'utf8')).toBe(twice);
  });

  test('a tag is the version with a v, both ways', () => {
    expect(tagFor('0.2.0')).toBe('v0.2.0');
    expect(versionOfTag('v0.2.0')).toBe('0.2.0');
    expect(versionOfTag('0.2.0')).toBe('0.2.0');
    expect(versionOfTag('v0.2.0-rc.1')).toBeNull();
  });

  test('--ledger prints who owns which version, and what is not this number', () => {
    const cli = capture(['--ledger', '--root', tree()]);
    expect(cli.code).toBe(0);
    expect(cli.out).toContain('recorded in   VERSION');
    expect(cli.out).toContain('Not the system version:');
    expect(cli.out).toContain('specVersion');
  });

  test('usage errors are usage errors', () => {
    expect(capture(['--nope']).code).toBe(2);
    expect(capture(['--version', 'nightly']).code).toBe(2);
    expect(capture(['--check', '--plan']).code).toBe(2);
    expect(parseArgs(['--root'])).toBe('--root needs a value');
  });
});

describe('this repository', () => {
  test('every copy of the system version agrees with the fixed group', () => {
    const cli = capture(['--check', '--root', REPO_ROOT]);
    expect(cli.err).toBe('');
    expect(cli.code).toBe(0);
  });

  test('VERSION is what the published packages carry', () => {
    const version = readFileSync(join(REPO_ROOT, 'VERSION'), 'utf8').trim();
    for (const p of publishedPackages(REPO_ROOT)) expect(p.version).toBe(version);
  });

  test('no pending changeset names an SF Symbol, or `pnpm icons:build` would stop release:version (ADR-0013 rule 5)', () => {
    // `changeset version` writes every changeset into the CHANGELOG.md of a web package, and the step
    // after the stamp scans `web/` for SF Symbol names. Here the words fail the change that wrote them.
    const { registry } = loadRegistry(REPO_ROOT);
    if (registry === null) throw new Error('spec/icons/registry.json did not load');
    const dir = join(REPO_ROOT, '.changeset');
    const pending = changesetFiles(dir).map((file) => ({ path: `.changeset/${file}`, text: readFileSync(join(dir, file), 'utf8') }));
    expect(checkSfNamesAbsent(registry, pending).map((issue) => `${issue.where}: ${issue.message}`)).toEqual([]);
  });
});
