// Read-only git access (ARCHITECTURE §11, §14 P1-7): the gitReader smoke test on this repository's
// HEAD, then gitReader, lastReleaseTag and the shallow-clone check on throwaway repositories created
// in the system temporary directory.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { REPO_ROOT } from '../ir/bundle.ts';
import { SourceReadError } from '../source/reader.ts';
import { cleanupTemps, commitAll, git, initRepo, tempDir } from './fixture-repo.ts';
import { gitReader, GitError, isGitWorkTree, isShallow, lastReleaseTag, releaseTags, releaseVersion, resolveCommit } from './git.ts';

afterAll(cleanupTemps);

describe('gitReader on this repository', () => {
  test.skipIf(!isGitWorkTree(REPO_ROOT))('reads HEAD:tokens/prism.resolver.json', () => {
    const reader = gitReader('HEAD');
    const resolver = JSON.parse(reader.readText('tokens/prism.resolver.json')) as { version?: string; modifiers?: object };
    expect(resolver.version).toBe('2025.10');
    expect(Object.keys(resolver.modifiers ?? {})).toContain('colorScheme');
    expect(reader.exists('tokens/ref')).toBe(true);
    expect(reader.list('tokens').map((e) => e.name)).toContain('prism.resolver.json');
    expect(reader.commit).toMatch(/^[0-9a-f]{40,64}$/);
  });
});

function repoWithHistory(): string {
  const dir = initRepo();
  const write = (path: string, text: string): void => {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  write('tokens/a.json', '{"v":1}\n');
  write('tokens/sub/b.json', 'b1\n');
  write('sub/tokens/c.json', 'c1\n');
  write('README.md', 'readme\n');
  commitAll(dir, 'first', { tag: 'v0.2.0' });
  write('tokens/a.json', '{"v":2}\n');
  write('tokens/new.json', 'new\n');
  commitAll(dir, 'second', { tag: 'v0.3.0', annotated: true });
  git(dir, 'tag', 'nightly');
  git(dir, 'tag', 'v1.0.0-rc.1');
  git(dir, 'tag', '0.3.0');
  // A release on a branch HEAD does not contain.
  git(dir, 'checkout', '--quiet', '-b', 'side');
  commitAll(dir, 'side', { tag: 'v9.0.0' });
  git(dir, 'checkout', '--quiet', 'main');
  // The working tree moves on; the reader never sees it.
  write('tokens/a.json', '{"v":"working"}\n');
  write('tokens/untracked.json', 'untracked\n');
  return dir;
}

describe('gitReader', () => {
  const dir = repoWithHistory();

  test('reads a revision, not the working tree', () => {
    expect(gitReader('v0.2.0', dir).readText('tokens/a.json')).toBe('{"v":1}\n');
    expect(gitReader('v0.3.0', dir).readText('tokens/a.json')).toBe('{"v":2}\n');
    expect(gitReader('HEAD', dir).exists('tokens/untracked.json')).toBe(false);
    expect(gitReader('HEAD~1', dir).exists('tokens/new.json')).toBe(false);
  });

  test('lists directories sorted by name, empty for a missing one', () => {
    const r = gitReader('HEAD', dir);
    expect(r.list('tokens')).toEqual([{ name: 'a.json', dir: false }, { name: 'new.json', dir: false }, { name: 'sub', dir: true }]);
    expect(r.list('')).toEqual([{ name: 'README.md', dir: false }, { name: 'sub', dir: true }, { name: 'tokens', dir: true }]);
    expect(r.list('nope')).toEqual([]);
    expect(r.exists('tokens/sub')).toBe(true);
    expect(r.exists('tokens/sub/b.json')).toBe(true);
    expect(r.exists('tokens/sub/x.json')).toBe(false);
  });

  test('a missing file and a path outside the root are SourceReadErrors', () => {
    const r = gitReader('HEAD', dir);
    expect(() => r.readText('tokens/missing.json')).toThrow(SourceReadError);
    expect(() => r.readText('../outside.json')).toThrow(/leaves the repository root/);
  });

  test('a root inside the repository reads paths relative to it', () => {
    const r = gitReader('HEAD', join(dir, 'sub'));
    expect(r.readText('tokens/c.json')).toBe('c1\n');
    expect(r.list('')).toEqual([{ name: 'tokens', dir: true }]);
    expect(r.exists('README.md')).toBe(false);
  });

  test('the reader is pinned to the commit the ref named when it was made', () => {
    const moving = repoWithHistory();
    const r = gitReader('main', moving);
    expect(r.commit).toBe(resolveCommit('v0.3.0', moving));
    commitAll(moving, 'third');   // main moves on to the working-tree content
    expect(resolveCommit('main', moving)).not.toBe(r.commit);
    expect(r.readText('tokens/a.json')).toBe('{"v":2}\n');
    expect(r.exists('tokens/untracked.json')).toBe(false);
  });

  test('an unknown ref, and one that looks like an option, are GitErrors', () => {
    expect(() => gitReader('v7.7.7', dir)).toThrow(GitError);
    expect(() => resolveCommit('--all', dir)).toThrow(/not a revision/);
    expect(() => resolveCommit('', dir)).toThrow(GitError);
  });
});

describe('lastReleaseTag', () => {
  const dir = repoWithHistory();

  test('the highest release version merged into HEAD; pre-releases, other tags and unmerged branches do not count', () => {
    expect(releaseTags(dir)).toEqual(['0.3.0', 'v0.3.0', 'v0.2.0']);
    expect(lastReleaseTag(dir)).toBe('0.3.0');
  });

  test('merged into another ref', () => {
    expect(lastReleaseTag(dir, 'HEAD~1')).toBe('v0.2.0');
    expect(lastReleaseTag(dir, 'side')).toBe('v9.0.0');
  });

  test('null without a release tag', () => {
    const empty = initRepo();
    commitAll(empty, 'only');
    git(empty, 'tag', 'nightly');
    expect(lastReleaseTag(empty)).toBeNull();
  });

  test('releaseVersion parses ^v?\\d+\\.\\d+\\.\\d+$ only', () => {
    expect(releaseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(releaseVersion('0.10.0')).toEqual({ major: 0, minor: 10, patch: 0 });
    expect(releaseVersion('v1.2.3-rc.1')).toBeNull();
    expect(releaseVersion('release-1.2.3')).toBeNull();
    expect(releaseVersion('v1.2')).toBeNull();
  });
});

describe('repository state', () => {
  test('a shallow clone is detected; a full one is not; a plain folder is no work tree', () => {
    const full = repoWithHistory();
    expect(isShallow(full)).toBe(false);
    const parent = tempDir('prism-diff-clone-');
    git(parent, 'clone', '--quiet', '--depth', '1', `file://${full}`, 'shallow');
    expect(isShallow(join(parent, 'shallow'))).toBe(true);
    expect(isGitWorkTree(full)).toBe(true);
    expect(isGitWorkTree(tempDir('prism-diff-plain-'))).toBe(false);
  });
});
