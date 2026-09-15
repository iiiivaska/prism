// `declaredBump` (ARCHITECTURE §11, §14 P1-7): Changesets' front matter, README.md and non-.md files
// skipped, ignored packages, the fixed group, no changesets, malformed files; each case is a
// `.changeset`-like folder under `fixtures/changesets/`.
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from '../ir/bundle.ts';
import { FIXTURES } from '../test-support.ts';
import {
  ChangesetError, changesetFiles, declaredBump, declaredBumpDetail, matchesPackage, parseChangeset, readChangesetConfig, TOKEN_PACKAGES,
} from './changesets.ts';

const dir = (name: string): string => join(FIXTURES, 'changesets', name);

describe('declaredBump', () => {
  test('no changesets: a README.md, even with front matter, is not one', () => {
    expect(declaredBump(dir('none'))).toBeNull();
    expect(declaredBumpDetail(dir('none')).files).toEqual([]);
  });

  test('a missing folder declares nothing', () => {
    expect(declaredBump(dir('does-not-exist'))).toBeNull();
  });

  test('front matter: the highest bump over the files; empty changesets and none releases add nothing; CRLF parses', () => {
    const d = declaredBumpDetail(dir('front-matter'));
    expect(d.bump).toBe('minor');
    expect(d.files).toEqual(['brave-tokens.md', 'calm-docs.md', 'quiet-none.md', 'windows.md']);
    expect(d.releases.map((r) => `${r.file} ${r.name} ${r.type}`)).toEqual([
      'brave-tokens.md @iiiivaska/prism-tokens minor',
      'brave-tokens.md @iiiivaska/prism-react patch',
      'quiet-none.md @iiiivaska/prism-charts none',
      'windows.md @iiiivaska/prism-tokens patch',
    ]);
  });

  test('ignored packages never count', () => {
    const d = declaredBumpDetail(dir('ignored'));
    expect(d.bump).toBeNull();
    expect(d.releases).toEqual([]);
    expect(d.files).toEqual(['gallery-only.md', 'tools-only.md']);
  });

  test('the fixed group: a release of another Prism package bumps the token package; other packages do not count', () => {
    const d = declaredBumpDetail(dir('fixed'));
    expect(d.bump).toBe('major');
    expect(d.releases.map((r) => r.name)).toEqual(['@iiiivaska/prism-react']);
  });

  test('without a fixed group only the token package counts', () => {
    expect(declaredBump(dir('unfixed'))).toBe('patch');
  });

  test('without config.json the token package still counts', () => {
    expect(declaredBump(dir('no-config'))).toBe('minor');
  });

  test('a file without front matter or with an unknown release type is an error naming the file', () => {
    expect(() => declaredBump(dir('malformed'))).toThrow(ChangesetError);
    expect(() => declaredBump(dir('malformed'))).toThrow(/no-front-matter\.md: no front matter/);
    expect(() => declaredBump(dir('bad-type'))).toThrow(/huge\.md: "@iiiivaska\/prism-tokens" has release type "huge"/);
  });

  test('another package list reads the same files', () => {
    expect(declaredBump(dir('unfixed'), ['@iiiivaska/prism-react'])).toBe('major');
  });
});

describe('parseChangeset', () => {
  test('Changesets front matter', () => {
    expect(parseChangeset('a.md', '---\n"@iiiivaska/prism-tokens": major\n---\n\nSummary\n')).toEqual([{ file: 'a.md', name: '@iiiivaska/prism-tokens', type: 'major' }]);
    expect(parseChangeset('b.md', '---\n---\n')).toEqual([]);
    expect(parseChangeset('c.md', '\n---\nleft-pad: patch\n---')).toEqual([{ file: 'c.md', name: 'left-pad', type: 'patch' }]);
    expect(parseChangeset('w.md', '---\r\n"@iiiivaska/prism-tokens": minor\r\n---\r\n\r\nCRLF\r\n')).toEqual([{ file: 'w.md', name: '@iiiivaska/prism-tokens', type: 'minor' }]);
  });

  test('errors', () => {
    expect(() => parseChangeset('d.md', 'no front matter')).toThrow(ChangesetError);
    // YAML reserves '@': Changesets quotes scoped names.
    expect(() => parseChangeset('d.md', '---\n@iiiivaska/prism-tokens: patch\n---\n')).toThrow(/not YAML/);
    expect(() => parseChangeset('e.md', '---\n- a list\n---\n')).toThrow(/must map package names/);
    expect(() => parseChangeset('f.md', '---\n"x": [1\n---\n')).toThrow(/not YAML/);
    expect(() => parseChangeset('g.md', '---\n"x": 3\n---\n')).toThrow(/release type 3/);
    expect(() => parseChangeset('h.md', '---\n"x": minor\n"x": major\n---\n')).toThrow(/not YAML/);
  });
});

describe('config and names', () => {
  test('package globs: * stays inside a segment, ** crosses, ? is one character', () => {
    expect(matchesPackage('@iiiivaska/prism-*', '@iiiivaska/prism-tokens')).toBe(true);
    expect(matchesPackage('@iiiivaska/prism-*', '@other/prism-tokens')).toBe(false);
    expect(matchesPackage('@iiiivaska/*', '@iiiivaska/prism/tokens')).toBe(false);
    expect(matchesPackage('@iiiivaska/**', '@iiiivaska/prism/tokens')).toBe(true);
    expect(matchesPackage('@iiiivaska/prism-tool?', '@iiiivaska/prism-tools')).toBe(true);
    expect(matchesPackage('@iiiivaska/prism-tokens', '@iiiivaska/prism-tokens')).toBe(true);
    expect(matchesPackage('a.b', 'aXb')).toBe(false);
  });

  test('changeset files: *.md without README.md or dot files, sorted', () => {
    expect(changesetFiles(dir('front-matter'))).toEqual(['brave-tokens.md', 'calm-docs.md', 'quiet-none.md', 'windows.md']);
  });

  test('the repository config puts every token package in a fixed group and ignores none of them', () => {
    const config = readChangesetConfig(join(REPO_ROOT, '.changeset'));
    for (const pkg of TOKEN_PACKAGES) {
      expect(config.ignore.some((p) => matchesPackage(p, pkg)), `${pkg} is ignored`).toBe(false);
      expect(config.fixed.some((g) => g.some((p) => matchesPackage(p, pkg))), `${pkg} is in a fixed group`).toBe(true);
    }
    expect(config.ignore).toEqual(expect.arrayContaining(['@iiiivaska/prism-tools', '@iiiivaska/prism-gallery', '@iiiivaska/prism-vrt']));
  });
});
