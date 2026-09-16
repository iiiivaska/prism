// The manifest grammar (critic G-21): what a hand-edited table may look like, and what it may not.
import { describe, expect, test } from 'vitest';
import { fsReader, REPO_ROOT } from '../tokens/api.ts';
import { MANIFESTS } from './config.ts';
import { found, maskComments, parseManifest } from './manifest.ts';

const swift = (body: string): string => `public enum M {\n    public static let implemented: [String: [String: Int]] = ${body}\n}\n`;
const ts = (body: string): string => `export const implemented: ImplementedVersions = ${body};\n`;

/** `name:platform=version` per pair, for a compact assertion. */
function pairs(text: string, syntax: 'swift' | 'ts'): string[] {
  const parsed = parseManifest(text, syntax);
  expect(parsed.problems).toEqual([]);
  return parsed.entries.flatMap((e) => e.versions.map((v) => `${e.name}:${v.platform}=${v.version}`));
}

describe('the empty table', () => {
  test('Swift `[:]` and TypeScript `{}` parse to no entries', () => {
    expect(parseManifest(swift('[:]'), 'swift')).toEqual({ entries: [], problems: [] });
    expect(parseManifest(ts('{}'), 'ts')).toEqual({ entries: [], problems: [] });
    expect(parseManifest(swift('[\n    :\n]'), 'swift').entries).toEqual([]);
    expect(parseManifest(ts('{\n}'), 'ts').entries).toEqual([]);
  });

  test('every manifest in the repository parses, and declares only its own platforms', () => {
    const reader = fsReader(REPO_ROOT);
    for (const file of MANIFESTS) {
      const parsed = parseManifest(reader.readText(file.path), file.syntax);
      expect(parsed.problems, file.path).toEqual([]);
      for (const entry of parsed.entries) {
        for (const version of entry.versions) {
          expect(file.platforms, `${file.path}: ${entry.name}`).toContain(version.platform);
          expect(version.version).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('a filled table', () => {
  test('Swift: quoted keys, nested platform tables, trailing commas and comments', () => {
    const text = swift(`[
        // The slice components (ADR-0012).
        "Button": ["ios": 3, "ipados": 3, "macos": 3, "watchos": 2],
        "Card": [
            "ios": 1, /* inline */ "watchos": 1,
        ],
    ]`);
    expect(pairs(text, 'swift')).toEqual([
      'Button:ios=3', 'Button:ipados=3', 'Button:macos=3', 'Button:watchos=2', 'Card:ios=1', 'Card:watchos=1',
    ]);
  });

  test('TypeScript: identifier keys, single and double quotes, an empty platform table', () => {
    const text = ts(`{
  Button: { "web-touch": 3, 'web-desktop': 2 },
  "Card": {},
}`);
    expect(pairs(text, 'ts')).toEqual(['Button:web-touch=3', 'Button:web-desktop=2']);
  });

  test('a key carries the line it is on, so a diagnostic can point at it', () => {
    const parsed = parseManifest(swift('[\n        "Button": [\n            "ios": 3,\n        ],\n    ]'), 'swift');
    expect(parsed.entries.map((e) => [e.name, e.line])).toEqual([['Button', 3]]);
    expect(parsed.entries[0]?.versions.map((v) => [v.platform, v.line])).toEqual([['ios', 4]]);
  });

  test('Swift allows no identifier key', () => {
    expect(parseManifest(swift('[Button: ["ios": 1]]'), 'swift').problems[0]?.message).toMatch(/expected a component name in quotes/);
  });
});

describe('what the grammar refuses', () => {
  const refuses = (text: string, syntax: 'swift' | 'ts'): string => {
    const parsed = parseManifest(text, syntax);
    expect(parsed.entries).toEqual([]);
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]?.hint).toBeTruthy();
    return parsed.problems[0]?.message ?? '';
  };

  test('a missing declaration', () => {
    expect(refuses('public enum M {}\n', 'swift')).toMatch(/no `static let implemented` declaration/);
    expect(refuses('export const other = {};\n', 'ts')).toMatch(/no `const implemented` declaration/);
  });

  test('the flat table of one integer per component, the shape G-21 rejects', () => {
    expect(refuses('public static let implemented: [String: Int] = ["Button": 3]\n', 'swift')).toMatch(/expected the platform table of `Button`/);
  });

  test('an expression instead of a number', () => {
    expect(refuses(swift('[\n    "Button": ["ios": buttonVersion],\n]'), 'swift')).toMatch(/expected an integer version, found `buttonVersion`/);
    expect(refuses(ts('{ Button: { "web-touch": 2 + 1 } }'), 'ts')).toMatch(/expected the end of the platform table/);
  });

  test('a negative version, which cannot mean anything', () => {
    expect(refuses(swift('["Button": ["ios": -1]]'), 'swift')).toMatch(/expected an integer version/);
  });

  test('an unterminated table', () => {
    expect(refuses('static let implemented = [\n    "Button": ["ios": 1],\n', 'swift')).toMatch(/expected a component name in quotes, found the end of the file/);
  });
});

describe('repeated keys', () => {
  test('a component twice keeps the first entry and reports the second', () => {
    const parsed = parseManifest(swift('[\n    "Button": ["ios": 1],\n    "Button": ["ios": 2],\n]'), 'swift');
    expect(parsed.entries.map((e) => e.name)).toEqual(['Button']);
    expect(parsed.entries[0]?.versions[0]?.version).toBe(1);
    expect(parsed.problems.map((p) => p.message)).toEqual(['`Button` appears twice']);
    expect(parsed.problems[0]?.line).toBe(4);
  });

  test('a platform twice in one entry', () => {
    const parsed = parseManifest(ts('{ Button: { "web-touch": 1, "web-touch": 2 } }'), 'ts');
    expect(parsed.problems.map((p) => p.message)).toEqual(['`Button` declares `web-touch` twice']);
    expect(parsed.entries[0]?.versions).toHaveLength(1);
  });
});

describe('comments', () => {
  test('are blanked without moving a single offset', () => {
    const text = 'a // one\nb /* two\nthree */ c\n';
    const masked = maskComments(text);
    expect(masked).toHaveLength(text.length);
    expect(masked.split('\n').length).toBe(text.split('\n').length);
    expect(masked).toBe('a       \nb       \n         c\n');
  });

  test('a comment marker inside a string stays inside the string', () => {
    expect(maskComments('x = "// not a comment"\n')).toBe('x = "// not a comment"\n');
    expect(pairs(swift('["Bu//tton": ["ios": 1]]'), 'swift')).toEqual(['Bu//tton:ios=1']);
  });

  test('a doc comment that spells out the declaration does not become the declaration', () => {
    const text = `/// public static let implemented: [String: [String: Int]] = [\n///     "Wrong": ["ios": 9],\n/// ]\n${swift('["Button": ["ios": 1]]')}`;
    expect(pairs(text, 'swift')).toEqual(['Button:ios=1']);
  });
});

describe('found()', () => {
  test('names the word, the character or the end of the file', () => {
    expect(found('let x', 4)).toBe('`x`');
    expect(found('let x', 5)).toBe('the end of the file');
    expect(found('a,b', 1)).toBe('`,`');
    expect(found('["ios": 1]', 0)).toBe('`[`');
  });
});
