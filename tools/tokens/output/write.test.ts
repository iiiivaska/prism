// The owned-directory writer (ARCHITECTURE §9.0, §12 rule 6): it writes changed bytes only, keeps
// unchanged files (and their mtime), deletes stale files inside the owned roots, never writes
// elsewhere, and reports without writing under `check`.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { writeOutputs } from './write.ts';

const dirs: string[] = [];
function tempRoot(): string {
  const d = mkdtempSync(join(tmpdir(), 'prism-write-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const owned = ['out/a', 'out/b'];

describe('writeOutputs', () => {
  test('adds, changes, removes stale files and prunes empty directories; leaves other paths alone', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'out/a/old/deep'), { recursive: true });
    writeFileSync(join(root, 'out/a/old/deep/stale.txt'), 'x');
    writeFileSync(join(root, 'out/a/same.txt'), 'same\n');
    writeFileSync(join(root, 'out/a/changed.txt'), 'before\n');
    mkdirSync(join(root, 'elsewhere'));
    writeFileSync(join(root, 'elsewhere/keep.txt'), 'keep');
    writeFileSync(join(root, 'out/a/.DS_Store'), 'finder');
    const past = new Date('2020-01-01T00:00:00Z');
    utimesSync(join(root, 'out/a/same.txt'), past, past);
    const files = [
      { path: 'out/a/same.txt', contents: 'same\n' },
      { path: 'out/a/changed.txt', contents: 'after\n' },
      { path: 'out/b/new/file.bin', contents: new Uint8Array([0, 1, 2]) },
    ];
    const report = writeOutputs(files, { root, owned, check: false });
    expect(report).toEqual({ added: ['out/b/new/file.bin'], changed: ['out/a/changed.txt'], removed: ['out/a/old/deep/stale.txt'], unchanged: 1 });
    expect(readFileSync(join(root, 'out/a/changed.txt'), 'utf8')).toBe('after\n');
    expect([...readFileSync(join(root, 'out/b/new/file.bin'))]).toEqual([0, 1, 2]);
    expect(existsSync(join(root, 'out/a/old'))).toBe(false);
    expect(statSync(join(root, 'out/a/same.txt')).mtime.getTime()).toBe(past.getTime());
    expect(readFileSync(join(root, 'elsewhere/keep.txt'), 'utf8')).toBe('keep');
    expect(existsSync(join(root, 'out/a/.DS_Store'))).toBe(true);
    // A second run is a no-op.
    expect(writeOutputs(files, { root, owned, check: false })).toEqual({ added: [], changed: [], removed: [], unchanged: 3 });
  });

  test('check reports the differences and writes nothing', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'out/a'), { recursive: true });
    writeFileSync(join(root, 'out/a/stale.txt'), 'x');
    writeFileSync(join(root, 'out/a/changed.txt'), 'before');
    const report = writeOutputs([{ path: 'out/a/changed.txt', contents: 'after' }, { path: 'out/a/new.txt', contents: 'n' }], { root, owned, check: true });
    expect(report).toEqual({ added: ['out/a/new.txt'], changed: ['out/a/changed.txt'], removed: ['out/a/stale.txt'], unchanged: 0 });
    expect(readFileSync(join(root, 'out/a/changed.txt'), 'utf8')).toBe('before');
    expect(existsSync(join(root, 'out/a/new.txt'))).toBe(false);
    expect(existsSync(join(root, 'out/a/stale.txt'))).toBe(true);
  });

  test('a partial build deletes nothing; a path outside the owned roots is refused', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'out/a'), { recursive: true });
    writeFileSync(join(root, 'out/a/other.txt'), 'x');
    expect(writeOutputs([{ path: 'out/a/one.txt', contents: '1' }], { root, owned, check: false, deleteStale: false }).removed).toEqual([]);
    expect(existsSync(join(root, 'out/a/other.txt'))).toBe(true);
    expect(() => writeOutputs([{ path: 'elsewhere/x.txt', contents: '' }], { root, owned, check: false })).toThrow(/outside the owned roots/);
    expect(() => writeOutputs([{ path: 'out/a/../../x.txt', contents: '' }], { root, owned, check: false })).toThrow(/normalized/);
  });
});
