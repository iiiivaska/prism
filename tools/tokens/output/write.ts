// Owned-directory sync (ARCHITECTURE §9.0, §12 rule 6; ADR-0024 §11): the writer owns the roots of
// `OWNED_ROOTS`. It writes the bytes of files that changed, leaves unchanged files alone (their mtime
// too), deletes files it no longer produces inside the owned roots, and never writes anywhere else.
// With `check` it writes nothing and reports what a build would add, change or remove.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { bytesOf, type OutputFile } from '../formats/index.ts';

export interface WriteOptions {
  /** Absolute repository root. */
  readonly root: string;
  /** Repository-relative POSIX roots the writer owns. */
  readonly owned: readonly string[];
  /** Compare only; write nothing. */
  readonly check: boolean;
  /** Delete files the build no longer produces (false for partial `--only` builds). Default true. */
  readonly deleteStale?: boolean;
}

export interface WriteReport {
  readonly added: readonly string[];
  readonly changed: readonly string[];
  readonly removed: readonly string[];
  readonly unchanged: number;
}

/** Files the writer never counts as its own (Finder metadata). */
const IGNORED = new Set(['.DS_Store']);

export function ownerOf(path: string, owned: readonly string[]): string | null {
  return owned.find((r) => path.startsWith(`${r}/`)) ?? null;
}

/** Every file under a root, repository-relative, sorted; empty when the root does not exist. */
export function listFiles(root: string, dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      if (IGNORED.has(e.name)) continue;
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  walk(dir);
  return out.sort();
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Removes the empty directories below `dir` (not `dir` itself). */
function pruneEmpty(abs: string): boolean {
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return false;
  let empty = true;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const child = join(abs, e.name);
    if (e.isDirectory() && pruneEmpty(child)) rmdirSync(child);
    else empty = false;
  }
  return empty;
}

export function writeOutputs(files: readonly OutputFile[], opts: WriteOptions): WriteReport {
  const deleteStale = opts.deleteStale ?? true;
  const wanted = new Map<string, Uint8Array>();
  for (const f of files) {
    if (ownerOf(f.path, opts.owned) === null) throw new Error(`${f.path} is outside the owned roots (${opts.owned.join(', ')}); the writer never writes elsewhere`);
    if (f.path.split('/').some((s) => s === '..' || s === '.' || s === '')) throw new Error(`${f.path} is not a normalized repository path`);
    wanted.set(f.path, bytesOf(f));
  }
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  let unchanged = 0;
  for (const [path, bytes] of [...wanted].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const abs = join(opts.root, path);
    if (!existsSync(abs)) added.push(path);
    else if (!sameBytes(new Uint8Array(readFileSync(abs)), bytes)) changed.push(path);
    else unchanged++;
  }
  if (deleteStale) {
    for (const r of opts.owned) for (const path of listFiles(opts.root, r)) if (!wanted.has(path)) removed.push(path);
  }
  if (!opts.check) {
    for (const path of [...added, ...changed]) {
      const abs = join(opts.root, path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, wanted.get(path) ?? new Uint8Array());
    }
    for (const path of removed) unlinkSync(join(opts.root, path));
    if (deleteStale) for (const r of opts.owned) pruneEmpty(join(opts.root, r));
  }
  return { added, changed, removed: removed.sort(), unchanged };
}
