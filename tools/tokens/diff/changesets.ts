// The declared bump of the pending changesets (ARCHITECTURE §11): the YAML front matter of every
// `.changeset/*.md` except README.md, read the way Changesets reads it, for the packages that ship
// tokens. `.changeset/config.json` supplies the ignored packages and the fixed groups: a release of any
// package in a fixed group with a token package bumps the token package too, so it counts; ignored
// packages never count.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Bump } from './classify.ts';
import { compareBumps } from './classify.ts';

/**
 * The npm package that ships the tokens. The Swift package ships them too, under the same version:
 * one tag and `VERSION` for both stacks, and the fixed group moves every package together (ADR-0014).
 */
export const TOKEN_PACKAGES: readonly string[] = ['@iiiivaska/prism-tokens'];

/** Changesets' release types; `none` declares no bump. */
export type ReleaseType = Bump | 'none';

export interface ChangesetRelease {
  /** Changeset file name inside the directory, e.g. 'brave-tokens.md'. */
  readonly file: string;
  readonly name: string;
  readonly type: ReleaseType;
}

export interface ChangesetConfig {
  readonly ignore: readonly string[];
  readonly fixed: readonly (readonly string[])[];
}

export interface DeclaredBump {
  /** The highest bump the changesets declare for the token packages; null when none does. */
  readonly bump: Bump | null;
  /** The releases that count for the token packages (directly or through a fixed group). */
  readonly releases: readonly ChangesetRelease[];
  /** Changeset files read (README.md excluded), sorted. */
  readonly files: readonly string[];
}

export class ChangesetError extends Error {
  readonly file: string;
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = 'ChangesetError';
    this.file = file;
  }
}

const RELEASE_TYPES: readonly string[] = ['major', 'minor', 'patch', 'none'];

/** Changesets' own front-matter pattern (`@changesets/parse`): `---`, YAML, `---`, then the summary. */
const FRONT_MATTER = /^\s*---([^]*?)\n\s*---(\s*(?:\n|$)[^]*)$/;

/** The releases one changeset file declares, in the order it lists them. Throws ChangesetError on a malformed file. */
export function parseChangeset(file: string, text: string): ChangesetRelease[] {
  const m = FRONT_MATTER.exec(text.replace(/\r\n?/g, '\n'));
  if (m === null) throw new ChangesetError(file, 'no front matter: a changeset starts with a "---" line, lists "<package>": <major|minor|patch> and closes with "---"');
  let data: unknown;
  try {
    data = parse(m[1] ?? '');
  } catch (e) {
    throw new ChangesetError(file, `front matter is not YAML: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (data === null || data === undefined) return [];   // an empty changeset declares no release
  if (typeof data !== 'object' || Array.isArray(data)) throw new ChangesetError(file, 'front matter must map package names to release types');
  const out: ChangesetRelease[] = [];
  for (const [name, type] of Object.entries(data as Record<string, unknown>)) {
    if (typeof type !== 'string' || !RELEASE_TYPES.includes(type)) {
      throw new ChangesetError(file, `"${name}" has release type ${JSON.stringify(type)}; use major, minor, patch or none`);
    }
    out.push({ file, name, type: type as ReleaseType });
  }
  return out;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/** `ignore` and `fixed` of `<dir>/config.json`; both empty when the file does not exist. */
export function readChangesetConfig(dir: string): ChangesetConfig {
  let text: string;
  try {
    text = readFileSync(join(dir, 'config.json'), 'utf8');
  } catch {
    return { ignore: [], fixed: [] };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new ChangesetError('config.json', `is not JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  const o = (json ?? {}) as Record<string, unknown>;
  const ignore = o['ignore'] ?? [];
  const fixed = o['fixed'] ?? [];
  if (!isStringArray(ignore)) throw new ChangesetError('config.json', '"ignore" must be an array of package names or globs');
  if (!Array.isArray(fixed) || !fixed.every(isStringArray)) throw new ChangesetError('config.json', '"fixed" must be an array of arrays of package names or globs');
  return { ignore, fixed };
}

/**
 * Package-name globs as Changesets writes them in `ignore` and `fixed`: `*` matches within one path
 * segment (`@iiiivaska/prism-*`), `**` across segments, `?` one character.
 */
export function matchesPackage(pattern: string, name: string): boolean {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] ?? '';
    if (c === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i++;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`).test(name);
}

/** Changeset file names in `dir`: `*.md` except README.md and dot files, sorted by code unit. */
export function changesetFiles(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
  return names.filter((n) => n.endsWith('.md') && !n.startsWith('.') && n.toLowerCase() !== 'readme.md').sort();
}

/**
 * The bump the pending changesets in `dir` declare for `packages` (default: the token packages), with
 * the releases behind it. A release counts when its package is not ignored and is one of `packages`
 * or shares a fixed group with one of them.
 */
export function declaredBumpDetail(dir: string, packages: readonly string[] = TOKEN_PACKAGES): DeclaredBump {
  const config = readChangesetConfig(dir);
  const files = changesetFiles(dir);
  const ignored = (name: string): boolean => config.ignore.some((p) => matchesPackage(p, name));
  const groups = config.fixed.filter((g) => packages.some((pkg) => g.some((p) => matchesPackage(p, pkg))));
  const counts = (name: string): boolean =>
    !ignored(name) && (packages.includes(name) || groups.some((g) => g.some((p) => matchesPackage(p, name))));
  const releases: ChangesetRelease[] = [];
  let bump: Bump | null = null;
  for (const file of files) {
    for (const r of parseChangeset(file, readFileSync(join(dir, file), 'utf8'))) {
      if (!counts(r.name)) continue;
      releases.push(r);
      if (r.type !== 'none' && compareBumps(r.type, bump) > 0) bump = r.type;
    }
  }
  return { bump, releases, files };
}

/** ARCHITECTURE §11: the highest bump over `.changeset/*.md` for the token packages; null when none is declared. */
export function declaredBump(changesetDir: string, packages: readonly string[] = TOKEN_PACKAGES): Bump | null {
  return declaredBumpDetail(changesetDir, packages).bump;
}
