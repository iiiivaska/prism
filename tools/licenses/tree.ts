// Reading a repository tree for the license gate: a two-method reader (so tests can hand the checks a
// tree held in memory), directory walking that skips dependency and build output, and the glob forms
// `licenses/inventory.json` uses in `packaged_as` — `*` inside one path segment, `**` across segments.
// Paths are repository-relative and POSIX everywhere; the checks never see an absolute path.

import { readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

/** Never scanned: dependency trees and build output. A bundled asset never lives in one. */
export const SKIPPED_DIRECTORIES: readonly string[] = ["node_modules", ".git", ".build", ".turbo", "dist", "DerivedData", "storybook-static", "test-results", "playwright-report"];

export interface DirEntry {
  readonly name: string;
  readonly directory: boolean;
}

/** Reads a repository tree by repository-relative POSIX path. */
export interface RepoReader {
  /** The file's bytes, or null when it does not exist. */
  readFile(path: string): Uint8Array | null;
  /** The entries of a directory, or [] when it does not exist; "" is the root. */
  entries(path: string): readonly DirEntry[];
}

/** A reader over a directory tree. Paths that leave the root are errors. */
export function fsRepoReader(root: string): RepoReader {
  const base = resolve(root);
  const full = (path: string): string => {
    const target = resolve(base, ...path.split("/").filter((part) => part !== ""));
    const rel = relative(base, target);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${path}: outside the repository root`);
    return rel === "" ? base : join(base, rel);
  };
  return {
    readFile(path) {
      try {
        return readFileSync(full(path));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR") return null;
        throw error;
      }
    },
    entries(path) {
      try {
        return readdirSync(full(path), { withFileTypes: true })
          .map((entry) => ({ name: entry.name, directory: entry.isDirectory() }))
          .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT" || code === "ENOTDIR") return [];
        throw error;
      }
    },
  };
}

/** `dir` and `name` joined; `dir` is "" for the repository root. */
export function joinPath(dir: string, name: string): string {
  return dir === "" ? name : `${dir}/${name}`;
}

/** Every file under `dir` (recursively), repository-relative and sorted; [] when the directory does not exist. */
export function walkFiles(reader: RepoReader, dir: string): string[] {
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of reader.entries(current)) {
      const path = joinPath(current, entry.name);
      if (!entry.directory) {
        files.push(path);
        continue;
      }
      if (!SKIPPED_DIRECTORIES.includes(entry.name)) visit(path);
    }
  };
  visit(dir);
  return files.sort();
}

/** Every directory under `dir` (recursively, itself excluded), repository-relative and sorted. */
export function walkDirectories(reader: RepoReader, dir: string): string[] {
  const directories: string[] = [];
  const visit = (current: string): void => {
    for (const entry of reader.entries(current)) {
      if (!entry.directory || SKIPPED_DIRECTORIES.includes(entry.name)) continue;
      const path = joinPath(current, entry.name);
      directories.push(path);
      visit(path);
    }
  };
  visit(dir);
  return directories.sort();
}

/**
 * A path glob as a regular expression, anchored at both ends. `**` matches any number of segments,
 * `*` matches inside one segment, and every other character is literal — `[wght]` in a font file name
 * is a literal, not a character class.
 */
export function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; ) {
    if (pattern.startsWith("**/", i)) {
      source += "(?:[^/]+/)*";
      i += 3;
      continue;
    }
    if (pattern.startsWith("**", i)) {
      source += ".*";
      i += 2;
      continue;
    }
    const char = pattern[i] ?? "";
    source += char === "*" ? "[^/]*" : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    i += 1;
  }
  return new RegExp(`^${source}$`);
}

/** True when `path` matches the glob `pattern`. */
export function matchesGlob(pattern: string, path: string): boolean {
  return globToRegExp(pattern).test(path);
}

/**
 * The existing directories whose repository-relative path matches `pattern`, expanded segment by
 * segment so that no dependency or build tree is ever read.
 */
export function matchDirectories(reader: RepoReader, pattern: string): string[] {
  let current: string[] = [""];
  for (const segment of pattern.split("/").filter((part) => part !== "")) {
    const next: string[] = [];
    for (const dir of current) {
      if (segment === "**") {
        next.push(dir, ...walkDirectories(reader, dir));
        continue;
      }
      const regExp = globToRegExp(segment);
      for (const entry of reader.entries(dir)) {
        if (!entry.directory || SKIPPED_DIRECTORIES.includes(entry.name)) continue;
        if (regExp.test(entry.name)) next.push(joinPath(dir, entry.name));
      }
    }
    current = [...new Set(next)];
  }
  return current.filter((dir) => dir !== "").sort();
}

/** UTF-8 text of a file, or null when it does not exist. */
export function readText(reader: RepoReader, path: string): string | null {
  const bytes = reader.readFile(path);
  return bytes === null ? null : new TextDecoder().decode(bytes);
}
