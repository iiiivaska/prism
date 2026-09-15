// Test helpers for `tokens:diff` (ARCHITECTURE §14 P1-7): the diff fixture trees and throwaway git
// repositories built from them in the system temporary directory. `fixtures/diff/before/` is a whole
// tree; every other `fixtures/diff/<case>/` is an overlay of it that holds only the files it changes,
// plus `fixture.json` with its description, the paths it removes and the changes it expects.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from '../ir/bundle.ts';
import { fsReader, overlayReader, type SourceReader } from '../source/reader.ts';
import { FIXTURES } from '../test-support.ts';
import type { TokenChangeKind } from './classify.ts';

export const DIFF_FIXTURES = `${FIXTURES}diff/`;

export interface ExpectedChange {
  readonly kind: TokenChangeKind;
  readonly path?: string;
  readonly modifier?: string;
  readonly context?: string;
}

export interface DiffCase {
  readonly name: string;
  readonly description: string;
  readonly remove: readonly string[];
  readonly expect: readonly ExpectedChange[];
}

export function diffCase(name: string): DiffCase {
  const meta = JSON.parse(readFileSync(`${DIFF_FIXTURES}${name}/fixture.json`, 'utf8')) as {
    description: string; remove?: string[]; expect: ExpectedChange[];
  };
  return { name, description: meta.description, remove: meta.remove ?? [], expect: meta.expect };
}

/** Every `after-*` case, sorted by name. */
export function afterCases(): DiffCase[] {
  return readdirSync(DIFF_FIXTURES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('after-'))
    .map((e) => e.name)
    .sort()
    .map(diffCase);
}

/** The whole tree of `before` or of an overlay case. */
export function diffTree(name: string): SourceReader {
  const before = fsReader(`${DIFF_FIXTURES}before`);
  if (name === 'before') return before;
  const c = diffCase(name);
  return overlayReader(before, fsReader(`${DIFF_FIXTURES}${name}`), c.remove);
}

/** Writes every file of `reader` under `dir` (fixture.json excluded). */
export function materialize(reader: SourceReader, dir: string, sub = ''): void {
  for (const e of reader.list(sub)) {
    const path = sub === '' ? e.name : `${sub}/${e.name}`;
    if (e.dir) materialize(reader, dir, path);
    else if (path !== 'fixture.json') {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), reader.readText(path));
    }
  }
}

const temps: string[] = [];

/** A new empty directory under the system temporary directory; `cleanupTemps` removes it. */
export function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

export function cleanupTemps(): void {
  for (const d of temps.splice(0)) rmSync(d, { recursive: true, force: true });
}

/**
 * git in a test repository, isolated from the user's and the system's configuration (no hooks, no
 * signing) with a fixed identity.
 */
export function git(dir: string, ...args: string[]): string {
  return execFileSync('git', [
    '-c', 'user.name=Prism Test', '-c', 'user.email=prism-test@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', '-c', 'init.defaultBranch=main', ...args,
  ], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: devNull },
  });
}

/** A new repository with no commit. */
export function initRepo(): string {
  const dir = tempDir('prism-diff-');
  git(dir, 'init', '--quiet');
  return dir;
}

/** Replaces `tokens/` in the working tree with the tree of `name` (nothing is staged). */
export function writeTokens(dir: string, name: string): void {
  rmSync(join(dir, 'tokens'), { recursive: true, force: true });
  materialize(diffTree(name), dir);
}

/** Writes `tokens/` from `name`, commits everything and tags the commit when `tag` is given. */
export function commitTokens(dir: string, name: string, opts: { tag?: string; annotated?: boolean; message?: string } = {}): void {
  writeTokens(dir, name);
  commitAll(dir, opts.message ?? name, opts);
}

export function commitAll(dir: string, message: string, opts: { tag?: string; annotated?: boolean } = {}): void {
  git(dir, 'add', '--all');
  git(dir, 'commit', '--quiet', '--allow-empty', '-m', message);
  if (opts.tag !== undefined) {
    if (opts.annotated === true) git(dir, 'tag', '-a', opts.tag, '-m', `release ${opts.tag}`);
    else git(dir, 'tag', opts.tag);
  }
}

/** The repository's own `.changeset/config.json`: the gate reads the same ignore list and fixed group. */
export const CHANGESET_CONFIG = readFileSync(join(REPO_ROOT, '.changeset', 'config.json'), 'utf8');

/**
 * `.changeset/config.json` plus one pending changeset `pr.md` that declares `bump` for `pkg`
 * (default `@iiiivaska/prism-tokens`); no changeset file when `bump` is null.
 */
export function writeChangeset(dir: string, bump: 'patch' | 'minor' | 'major' | null, pkg = '@iiiivaska/prism-tokens'): void {
  mkdirSync(join(dir, '.changeset'), { recursive: true });
  writeFileSync(join(dir, '.changeset', 'config.json'), CHANGESET_CONFIG);
  rmSync(join(dir, '.changeset', 'pr.md'), { force: true });
  if (bump !== null) writeFileSync(join(dir, '.changeset', 'pr.md'), `---\n"${pkg}": ${bump}\n---\n\nToken change under test.\n`);
}
