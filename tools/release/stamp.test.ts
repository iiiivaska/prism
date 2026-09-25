// release:stamp (roadmap P3-6, critic C-15, ADR-0038): this repository's copies of the system version
// agree with the fixed group, and every rule the stamper enforces is exercised on a miniature tree — the
// fixed group is complete and agrees, a hand-edited copy is drift, a nested `version` is never the
// system version, and a `major` while 0.x is the owner's decision (ADR-0024 §14). ADR-0038 rule 3 is
// held here too: every file that carries the number is in the ledger — a workspace manifest, a copy a
// generator writes after the stamp, or any other file of the tree — and a release moves every one.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { checkSfNamesAbsent } from '../icons/checks.ts';
import { PATHS } from '../icons/config.ts';
import { renderAll } from '../icons/codegen.ts';
import { loadCatalog } from '../icons/phosphor.ts';
import { loadRegistry, validateSchema } from '../icons/registry.ts';
import { renderCatalogs } from '../showcase/apple/catalog.ts';
import { changesetFiles, matchesPackage } from '../tokens/diff/changesets.ts';
import type { OutputFile } from '../tokens/formats/index.ts';
import { fsReader, memoryReader, overlayReader, type SourceReader } from '../tokens/source/reader.ts';
import { main, parseArgs, runStamp, type Io, type StampArgs } from './stamp.ts';
import {
  DERIVED,
  NOT_THE_SYSTEM_VERSION,
  publishedPackages,
  REGENERATED,
  REPO_ROOT,
  tagFor,
  versionOfTag,
  workspaceDirs,
} from './targets.ts';

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
  /** The version the generated copies carry (`REGENERATED`); `derived` when not given. */
  readonly generated?: string;
  readonly fixed?: readonly (readonly string[])[];
  readonly changesets?: Readonly<Record<string, string>>;
}

/**
 * The generated files that carry the version, as their generators write them: `pnpm icons:build` and
 * `pnpm showcase:apple:generate` in the real tree, and this function in the miniature one.
 */
function writeGenerated(root: string, version: string): void {
  write(
    root,
    'swift/Sources/DSIcons/Generated/DSIconName.swift',
    `public enum DSIconName: String, CaseIterable, Sendable {\n    case actionAdd = "action.add"\n\n    /// The registry version, equal to the system version.\n    public static let registryVersion = "${version}"\n}\n`,
  );
  write(
    root,
    'web/packages/react/src/generated/icons.ts',
    `/** The registry version, equal to the system version. */\nexport const iconRegistryVersion = "${version}";\n`,
  );
  write(
    root,
    'swift/Showcase/Sources/DSShowcase/Generated/DSTokenCatalog.swift',
    `extension DSTokenCatalog {\n    /// The system version the tokens were built at (\`VERSION\`).\n    public static let version = "${version}"\n}\n`,
  );
}

/**
 * A miniature of the repository layout: the paths the ledger names, three published packages and the
 * private apps. Everything the stamper reads is here and nothing else is, so a failure names a rule and
 * not a missing file.
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
  // Private, and not in `ignore`: `changeset version` skips a private package (Changesets 3's default),
  // so nothing but the stamp moves it — the case ADR-0038 found left at 0.1.0.
  write(root, 'web/apps/showcase/package.json', `{\n  "name": "@iiiivaska/prism-showcase",\n  "version": "${derived}",\n  "private": true\n}\n`);
  write(root, 'web/apps/vrt/package.json', `{\n  "name": "@iiiivaska/prism-vrt",\n  "private": true,\n  "version": "${derived}"\n}\n`);
  write(root, 'tools/package.json', `{\n  "name": "@iiiivaska/prism-tools",\n  "version": "${derived}",\n  "private": true\n}\n`);
  write(root, 'package.json', `{\n  "name": "prism-monorepo",\n  "private": true,\n  "version": "${derived}"\n}\n`);
  write(root, 'VERSION', `${derived}\n`);
  write(root, 'swift/Sources/DSTokens/DSTokens.swift', `public enum DSTokensInfo {\n    public static let version = "${derived}"\n}\n`);
  write(
    root,
    'swift/Tests/DSCoreTests/PlaceholderTests.swift',
    `import Testing\n@testable import DSCore\n\n@Suite struct DSCorePlaceholder {\n    @Test func linksTokens() { #expect(DSCoreInfo.version == "${derived}") }\n}\n`,
  );
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
  writeGenerated(root, options.generated ?? derived);
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

/** Every package manifest of a tree, the private root first: what `pnpm` reads a version from. */
function manifestVersions(root: string): Record<string, string | undefined> {
  const paths = ['package.json', ...workspaceDirs(root).map((dir) => `${dir}/package.json`)];
  return Object.fromEntries(
    paths.map((path) => [path, (JSON.parse(readFileSync(join(root, path), 'utf8')) as { version?: string }).version]),
  );
}

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

  test('a release moves every package manifest, the private apps among them (ADR-0038, Consequences (a))', () => {
    // `changeset version` has moved the fixed group to 0.3.0 and skipped every private package; the stamp
    // is the only writer left for the rest, the web showcase included.
    const root = tree({ published: { tokens: '0.3.0', react: '0.3.0', charts: '0.3.0' }, derived: '0.2.0' });
    expect(runStamp(args(root)).errors).toEqual([]);
    const versions = manifestVersions(root);
    expect(versions).toEqual(Object.fromEntries(Object.keys(versions).map((path) => [path, '0.3.0'])));
  });

  test('a second run writes nothing and a check passes', () => {
    const root = tree({ published: { tokens: '0.3.0', react: '0.3.0', charts: '0.3.0' }, derived: '0.2.0' });
    runStamp(args(root));
    writeGenerated(root, '0.3.0');
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

  test('a private app manifest that drifted is drift too, and --check names it', () => {
    const root = tree();
    write(root, 'web/apps/showcase/package.json', '{\n  "name": "@iiiivaska/prism-showcase",\n  "version": "9.9.9",\n  "private": true\n}\n');
    const cli = capture(['--check', '--root', root]);
    expect(cli.code).toBe(1);
    expect(cli.out).toContain('stale   web/apps/showcase/package.json  9.9.9 → 0.2.0');
  });

  test('a workspace manifest the ledger does not list is an error in every mode, so a new app is not left behind (ADR-0038 rule 3)', () => {
    const root = tree();
    write(root, 'web/apps/kiosk/package.json', '{\n  "name": "@iiiivaska/prism-kiosk",\n  "private": true,\n  "version": "0.2.0"\n}\n');
    const cli = capture(['--check', '--root', root]);
    expect(cli.code).toBe(1);
    expect(cli.err).toContain('web/apps/kiosk/package.json carries "version": "0.2.0"');
    expect(cli.err).toContain('neither DERIVED nor NOT_THE_SYSTEM_VERSION');
    expect(runStamp(args(root, { mode: 'plan' })).exitCode).toBe(1);
    expect(runStamp(args(root)).exitCode).toBe(1);
    // A manifest with no "version" carries no copy, and needs no entry.
    write(root, 'web/apps/kiosk/package.json', '{\n  "name": "@iiiivaska/prism-kiosk",\n  "private": true\n}\n');
    expect(capture(['--check', '--root', root]).code).toBe(0);
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

describe('the copies a generator writes after the stamp (ADR-0038 rule 3, Consequences (b))', () => {
  test('--check reads them, and a stale one names the step of release:version that writes it', () => {
    const root = tree();
    write(root, 'swift/Showcase/Sources/DSShowcase/Generated/DSTokenCatalog.swift', 'extension DSTokenCatalog {\n    public static let version = "0.1.0"\n}\n');
    const cli = capture(['--check', '--root', root]);
    expect(cli.code).toBe(1);
    expect(cli.out).toContain('stale   swift/Showcase/Sources/DSShowcase/Generated/DSTokenCatalog.swift  0.1.0 → 0.2.0');
    expect(cli.err).toContain('`pnpm showcase:apple:generate`');
    expect(cli.err).not.toContain('`pnpm release:stamp`');
    // The version the release job confirms is checked against them too.
    expect(capture(['--check', '--version', '0.2.0', '--root', root]).code).toBe(1);
  });

  test('a stamp writes none of them and does not fail on them: release:version runs their generators next', () => {
    const root = tree({ published: { tokens: '0.3.0', react: '0.3.0', charts: '0.3.0' }, derived: '0.2.0' });
    const result = runStamp(args(root));
    expect(result.exitCode).toBe(0);
    expect(result.errors).toEqual([]);
    for (const copy of REGENERATED) {
      expect(result.written).not.toContain(copy.path);
      expect(result.rows.find((r) => r.path === copy.path)).toMatchObject({ status: 'stale', found: '0.2.0', wanted: '0.3.0', by: copy.by });
    }
    expect(capture(['--check', '--root', root]).code).toBe(1);
    writeGenerated(root, '0.3.0');
    expect(capture(['--check', '--version', '0.3.0', '--root', root]).code).toBe(0);
  });

  test('a generated copy that is not where the ledger reads it is an error, not a pass', () => {
    const root = tree();
    write(root, 'web/packages/react/src/generated/icons.ts', 'export const iconRegistryRevision = "0.2.0";\n');
    const result = runStamp(args(root, { mode: 'check' }));
    expect(result.exitCode).toBe(1);
    expect(result.errors.join('\n')).toContain('web/packages/react/src/generated/icons.ts');
    expect(result.errors.join('\n')).toContain('`pnpm icons:build`');
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
    expect(cli.out).toContain('derived     web/apps/showcase/package.json');
    expect(cli.out).toContain('regenerated swift/Showcase/Sources/DSShowcase/Generated/DSTokenCatalog.swift');
    expect(cli.out).toContain('by `pnpm showcase:apple:generate`');
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

/** The steps of the root manifest's `release:version`, in the order they run. */
function releaseVersionSteps(): string[] {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
  return (manifest.scripts?.['release:version'] ?? '').split('&&').map((step) => step.trim());
}

/**
 * This repository as a release leaves it after `changeset version` and the stamp, and before any
 * generator runs: every published manifest and every `DERIVED` copy at `version`, read through an
 * overlay so nothing on disk changes.
 */
function released(version: string): SourceReader {
  const files: Record<string, string> = {};
  for (const carrier of [...publishedPackages(REPO_ROOT).map((p) => p.manifest), ...DERIVED]) {
    files[carrier.path] = carrier.write(readFileSync(join(REPO_ROOT, carrier.path), 'utf8'), version);
  }
  return overlayReader(fsReader(REPO_ROOT), memoryReader(files));
}

/** The committed files a render would change, sorted. */
function moved(files: readonly OutputFile[]): string[] {
  const changed = files.filter((file) => {
    let committed: Buffer;
    try {
      committed = readFileSync(join(REPO_ROOT, file.path));
    } catch {
      return true;
    }
    return !committed.equals(Buffer.from(file.contents));
  });
  return changed.map((file) => file.path).sort();
}

/**
 * The generators that read a stamped file, each as `release:version` names it. A render of each over
 * the released tree shows which committed files carry the version through it: exactly its
 * `REGENERATED` entries, or a copy has escaped the ledger.
 */
const GENERATORS: readonly { readonly by: string; readonly render: (reader: SourceReader) => readonly OutputFile[] }[] = [
  {
    by: 'pnpm icons:build',
    render: (reader) => {
      const { registry, issues } = validateSchema(JSON.parse(reader.readText(PATHS.registry)), join(REPO_ROOT, PATHS.schema));
      if (registry === null) throw new Error(`the stamped registry does not validate: ${JSON.stringify(issues)}`);
      return renderAll(registry, loadCatalog()).files;
    },
  },
  {
    by: 'pnpm showcase:apple:generate',
    render: (reader) => {
      const { files, problems } = renderCatalogs(reader);
      if (problems.length > 0) throw new Error(problems.join('\n'));
      return files;
    },
  },
];

/**
 * A copy of the version is a string literal: the number alone in double or single quotes, which is
 * how JSON, TypeScript, Swift and YAML hold one (a comment's `0.1.0` in backticks is prose). Prose
 * files (`*.md`) quote versions as history, the lockfile holds third-party ones, and fixtures and the
 * tools' own tests hold versions as data, so none of those is searched.
 */
const NOT_SEARCHED = [':(exclude,glob)**/*.md', ':(exclude)pnpm-lock.yaml', ':(exclude,glob)**/fixtures/**', ':(exclude,glob)**/Fixtures/**', ':(exclude,glob)tools/**/*.test.ts'];

/** `since` is the version a thing first shipped in (spec/SCHEMA.md), wherever a generator copies it. */
const HISTORY = /\bsince\b/u;

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

  for (const generator of GENERATORS) {
    test(`\`${generator.by}\` runs after the stamp in release:version, and a release moves exactly its REGENERATED copies`, () => {
      const steps = releaseVersionSteps();
      expect(steps[0]).toBe('changeset version');
      expect(steps.indexOf(generator.by), `release:version is "${steps.join(' && ')}"`).toBeGreaterThan(steps.indexOf('pnpm release:stamp'));
      const expected = REGENERATED.filter((copy) => copy.by === generator.by).map((copy) => copy.path).sort();
      expect(moved(generator.render(released('9.9.9')))).toEqual(expected);
    });
  }

  test('every REGENERATED copy names a generator that is rendered above', () => {
    const rendered = new Set(GENERATORS.map((g) => g.by));
    for (const copy of REGENERATED) expect(rendered.has(copy.by), `${copy.path}: nothing above renders \`${copy.by}\``).toBe(true);
  });

  test('no tracked file carries the system version outside the ledger (ADR-0038 rule 3)', () => {
    const version = readFileSync(join(REPO_ROOT, 'VERSION'), 'utf8').trim();
    const quoted = ['"', "'"].flatMap((q) => ['-e', `${q}${version}${q}`]);
    let hits = '';
    try {
      hits = execFileSync('git', ['grep', '-n', '-I', '-F', ...quoted, '--', '.', ...NOT_SEARCHED], { cwd: REPO_ROOT, encoding: 'utf8' });
    } catch (e) {
      // git grep exits 1 when nothing matches.
      if ((e as { status?: number }).status !== 1) throw e;
    }
    const listed = new Set([
      ...publishedPackages(REPO_ROOT).map((p) => p.manifest.path),
      ...DERIVED.map((c) => c.path),
      ...REGENERATED.map((c) => c.path),
    ]);
    const strays = hits
      .split('\n')
      .filter((hit) => hit !== '')
      .filter((hit) => {
        const [path = '', , ...line] = hit.split(':');
        if (listed.has(path) || NOT_THE_SYSTEM_VERSION.some((n) => matchesPackage(n.path, path))) return false;
        return !HISTORY.test(line.join(':'));
      });
    expect(strays, 'each is a copy of the version no release moves: add it to DERIVED, have release:version regenerate it (REGENERATED), or list it in NOT_THE_SYSTEM_VERSION with its reason').toEqual([]);
  });
});
