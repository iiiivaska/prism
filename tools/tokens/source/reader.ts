// SourceReader: every source file is read through this interface, by repository-relative POSIX path
// (ARCHITECTURE §3.1). `fsReader` reads the working tree; P1-7's `gitReader` reads a revision; tests
// use `memoryReader` and `overlayReader`. A path that leaves the root is an error.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';

export interface DirEntry { readonly name: string; readonly dir: boolean }

export interface SourceReader {
  /** The file's text; throws SourceReadError when it does not exist. */
  readText(path: string): string;
  /** Entries of a directory, sorted by name; empty when the directory does not exist. */
  list(dir: string): readonly DirEntry[];
  exists(path: string): boolean;
}

export class SourceReadError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(message);
    this.name = 'SourceReadError';
    this.path = path;
  }
}

/**
 * Normalizes a repository-relative POSIX path; returns null when it is absolute or leaves the root.
 * '' is the root itself.
 */
export function normalizeRepoPath(path: string): string | null {
  if (path.startsWith('/') || /^[a-zA-Z]:/.test(path) || path.includes('\\')) return null;
  const n = posix.normalize(path === '' ? '.' : path);
  if (n === '.' ) return '';
  if (n === '..' || n.startsWith('../')) return null;
  return n.replace(/\/$/, '');
}

function checked(path: string): string {
  const n = normalizeRepoPath(path);
  if (n === null) throw new SourceReadError(path, `path leaves the repository root: ${path}`);
  return n;
}

function byName(a: DirEntry, b: DirEntry): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export function fsReader(root: string): SourceReader {
  return {
    readText(path) {
      const p = checked(path);
      try {
        return readFileSync(join(root, p), 'utf8');
      } catch {
        throw new SourceReadError(p, `cannot read ${p}`);
      }
    },
    list(dir) {
      const p = checked(dir);
      try {
        return readdirSync(join(root, p), { withFileTypes: true })
          .map((e) => ({ name: e.name, dir: e.isDirectory() }))
          .sort(byName);
      } catch {
        return [];
      }
    },
    exists(path) {
      const p = checked(path);
      try {
        statSync(join(root, p));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** A reader over an in-memory file map (repository-relative paths → text). */
export function memoryReader(files: Readonly<Record<string, string>>): SourceReader {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(files)) map.set(checked(k), v);
  return {
    readText(path) {
      const p = checked(path);
      const text = map.get(p);
      if (text === undefined) throw new SourceReadError(p, `cannot read ${p}`);
      return text;
    },
    list(dir) {
      const p = checked(dir);
      const prefix = p === '' ? '' : `${p}/`;
      const entries = new Map<string, boolean>();
      for (const file of map.keys()) {
        if (!file.startsWith(prefix)) continue;
        const rest = file.slice(prefix.length);
        const slash = rest.indexOf('/');
        if (slash === -1) entries.set(rest, entries.get(rest) ?? false);
        else entries.set(rest.slice(0, slash), true);
      }
      return [...entries].map(([name, dir]) => ({ name, dir })).sort(byName);
    },
    exists(path) {
      const p = checked(path);
      if (map.has(p)) return true;
      const prefix = `${p}/`;
      for (const file of map.keys()) if (file.startsWith(prefix)) return true;
      return false;
    },
  };
}

/**
 * `overlay` over `base`: a file of the overlay replaces the base file at the same path, and every
 * path in `removed` (a file or a folder) disappears. Broken-fixture trees are overlays of one shared
 * valid tree, so each fixture holds only the files its defect touches.
 */
export function overlayReader(base: SourceReader, overlay: SourceReader, removed: readonly string[] = []): SourceReader {
  const gone = removed.map(checked);
  const isGone = (p: string): boolean => gone.some((g) => p === g || p.startsWith(`${g}/`));
  return {
    readText(path) {
      const p = checked(path);
      if (overlay.exists(p)) return overlay.readText(p);
      if (isGone(p)) throw new SourceReadError(p, `cannot read ${p}`);
      return base.readText(p);
    },
    list(dir) {
      const p = checked(dir);
      const entries = new Map<string, boolean>();
      for (const e of base.list(p)) {
        const full = p === '' ? e.name : `${p}/${e.name}`;
        if (!isGone(full)) entries.set(e.name, e.dir);
      }
      for (const e of overlay.list(p)) entries.set(e.name, e.dir || (entries.get(e.name) ?? false));
      return [...entries].map(([name, d]) => ({ name, dir: d })).sort(byName);
    },
    exists(path) {
      const p = checked(path);
      if (overlay.exists(p)) return true;
      return !isGone(p) && base.exists(p);
    },
  };
}
