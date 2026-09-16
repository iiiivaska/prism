// Reading an implementation manifest as text (ADR-0006 rule 2, critic G-21).
//
// The parity job runs on ubuntu, so it cannot ask Swift what `DSComponentsManifest.implemented` is,
// and it must not build the web packages to learn what `implemented` is either. G-21's fix is a
// *specified* parse format, and this module is it: one grammar, two bracket styles.
//
//   declaration = 'static let implemented' [':' type] '=' table      (Swift)
//               = 'const implemented'     [':' type] '=' table       (TypeScript)
//   table       = '[' ( ':' ']' | entries ']' )                      (Swift: '[:]' is the empty table)
//               = '{' entries '}'                                    (TypeScript)
//   entries     = [ entry { ',' entry } [ ',' ] ]
//   entry       = key ':' value
//   key         = '"' text '"' | "'" text "'" | identifier           (identifier: TypeScript only)
//   value       = table (outer level) | digits (inner level)
//
// `text` in a key is plain: no quote, no backslash escape. Component and platform names never need one.
//
// `//` and `/* … */` comments are skipped anywhere; so is whitespace. Nothing else is accepted: no
// expression, no constant, no string interpolation, no `+`, no negative number. A manifest that
// needs one of those is not a hand-edited table any more, and the report says so with the line.
//
// Only the literal is read; whatever else the file declares is ignored, so the Swift manifests keep
// their doc comments and the TypeScript ones keep their type aliases.
import type { ManifestSyntax } from './config.ts';

export interface ManifestVersion {
  readonly platform: string;
  readonly version: number;
  /** 1-based line the platform key is on. */
  readonly line: number;
}

export interface ManifestEntry {
  readonly name: string;
  /** 1-based line the component name is on. */
  readonly line: number;
  readonly versions: readonly ManifestVersion[];
}

export interface ManifestProblem {
  readonly message: string;
  readonly line: number;
  readonly hint?: string;
}

export interface ParsedManifest {
  /** Entries in file order; empty when the literal does not parse. */
  readonly entries: readonly ManifestEntry[];
  readonly problems: readonly ManifestProblem[];
}

/** The identifier the declaration binds, per syntax. */
const DECLARATION: Readonly<Record<ManifestSyntax, RegExp>> = {
  // `public static let implemented: [String: [String: Int]] = [` and any access-level spelling of it.
  swift: /\bstatic\s+let\s+implemented\b[^=;]*=/,
  // `export const implemented: ImplementedVersions = {`.
  ts: /\bconst\s+implemented\b[^=;]*=/,
};

const BRACKETS: Readonly<Record<ManifestSyntax, { open: string; close: string }>> = {
  swift: { open: '[', close: ']' },
  ts: { open: '{', close: '}' },
};

class ParseError extends Error {
  readonly offset: number;
  constructor(offset: number, message: string) {
    super(message);
    this.name = 'ParseError';
    this.offset = offset;
  }
}

/**
 * Every comment character replaced by a space, newlines kept, string literals left alone: offsets and
 * line numbers stay those of the original text, and a `//` inside a string stays inside the string.
 */
export function maskComments(text: string): string {
  const out = text.split('');
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to && i < out.length; i++) if (out[i] !== '\n') out[i] = ' ';
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"' || c === "'") {
      i++;
      while (i < text.length && text[i] !== c) {
        if (text[i] === '\\') i++;
        if (text[i] === '\n') break; // an unterminated string: stop guessing, let the parser report
        i++;
      }
      continue;
    }
    if (c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      blank(i, end === -1 ? text.length : end);
      i = end === -1 ? text.length : end;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      blank(i, stop);
      i = stop - 1;
    }
  }
  return out.join('');
}

/** 1-based line of every offset, computed once per file. */
function lineIndex(text: string): (offset: number) => number {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*/;

/**
 * The `implemented` table of one manifest file. Structural problems stop the parse and leave
 * `entries` empty; a repeated key is reported without stopping, because the rest of the table still
 * says something true.
 */
export function parseManifest(text: string, syntax: ManifestSyntax): ParsedManifest {
  const masked = maskComments(text);
  const lineOf = lineIndex(text);
  const problems: ManifestProblem[] = [];
  const declaration = DECLARATION[syntax].exec(masked);
  if (declaration === null) {
    return {
      entries: [],
      problems: [{
        message: `no \`${syntax === 'swift' ? 'static let implemented' : 'const implemented'}\` declaration`,
        line: 1,
        hint: 'the parity report reads this file as text; keep the declaration and its literal in the format of tools/parity/manifest.ts',
      }],
    };
  }

  const { open, close } = BRACKETS[syntax];
  let i = declaration.index + declaration[0].length;

  const skip = (): void => {
    while (i < masked.length && /\s/.test(masked[i] ?? '')) i++;
  };
  const at = (): string => masked[i] ?? '';
  const expect = (char: string, what: string): void => {
    skip();
    if (at() !== char) throw new ParseError(i, `expected ${what} (\`${char}\`), found ${found(masked, i)}`);
    i++;
  };
  const parseKey = (): { key: string; offset: number } | null => {
    skip();
    const offset = i;
    const quote = at();
    if (quote === '"' || quote === "'") {
      i++;
      let key = '';
      while (i < masked.length && masked[i] !== quote) {
        if (masked[i] === '\n') throw new ParseError(offset, 'a key runs past the end of its line');
        key += text[i];
        i++;
      }
      if (i >= masked.length) throw new ParseError(offset, 'a key is never closed');
      i++;
      return { key, offset };
    }
    if (syntax === 'ts') {
      const m = IDENTIFIER.exec(masked.slice(i));
      if (m !== null) {
        i += m[0].length;
        return { key: m[0], offset };
      }
    }
    return null;
  };
  const parseInteger = (): number => {
    skip();
    const start = i;
    while (i < masked.length && /[0-9]/.test(masked[i] ?? '')) i++;
    if (i === start) throw new ParseError(start, `expected an integer version, found ${found(masked, start)}`);
    return Number.parseInt(masked.slice(start, i), 10);
  };

  const entries: ManifestEntry[] = [];
  try {
    expect(open, 'the table');
    skip();
    if (syntax === 'swift' && at() === ':') {
      // `[:]`, the empty Swift dictionary literal.
      i++;
      expect(close, 'the end of the table');
    } else if (at() === close) {
      i++;
    } else {
      for (;;) {
        const key = parseKey();
        if (key === null) throw new ParseError(i, `expected a component name in quotes, found ${found(masked, i)}`);
        expect(':', 'a colon after the component name');
        const versions: ManifestVersion[] = [];
        expect(open, `the platform table of \`${key.key}\``);
        skip();
        if (syntax === 'swift' && at() === ':') {
          i++;
          expect(close, `the end of the platform table of \`${key.key}\``);
        } else if (at() === close) {
          i++;
        } else {
          for (;;) {
            const platform = parseKey();
            if (platform === null) throw new ParseError(i, `expected a platform key in quotes, found ${found(masked, i)}`);
            expect(':', `a colon after \`${platform.key}\``);
            const version = parseInteger();
            if (versions.some((v) => v.platform === platform.key)) {
              problems.push({ message: `\`${key.key}\` declares \`${platform.key}\` twice`, line: lineOf(platform.offset), hint: 'keep one version per platform' });
            } else {
              versions.push({ platform: platform.key, version, line: lineOf(platform.offset) });
            }
            skip();
            if (at() === ',') {
              i++;
              skip();
              if (at() === close) {
                i++;
                break;
              }
              continue;
            }
            expect(close, `the end of the platform table of \`${key.key}\``);
            break;
          }
        }
        if (entries.some((e) => e.name === key.key)) {
          problems.push({ message: `\`${key.key}\` appears twice`, line: lineOf(key.offset), hint: 'keep one entry per component' });
        } else {
          entries.push({ name: key.key, line: lineOf(key.offset), versions });
        }
        skip();
        if (at() === ',') {
          i++;
          skip();
          if (at() === close) {
            i++;
            break;
          }
          continue;
        }
        expect(close, 'the end of the table');
        break;
      }
    }
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    return {
      entries: [],
      problems: [{
        message: e.message,
        line: lineOf(e.offset),
        hint: 'the table is a plain literal of component name → platform → integer version; see tools/parity/manifest.ts for the grammar',
      }],
    };
  }
  return { entries, problems };
}

/** What sits at `offset`, for a message: a word, a character, or the end of the file. */
export function found(text: string, offset: number): string {
  if (offset >= text.length) return 'the end of the file';
  const rest = (text.slice(offset, offset + 24).split('\n')[0] ?? '').trim();
  const word = /^[^\s,:[\]{}]+/.exec(rest);
  const shown = word?.[0] ?? text[offset] ?? '';
  return shown === '' ? 'the end of the line' : `\`${shown}\``;
}
