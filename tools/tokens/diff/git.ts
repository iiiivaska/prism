// Read-only git access for `tokens:diff` (ARCHITECTURE §11, ADR-0024 §14): a `SourceReader` over a
// revision, so the base side of the diff is built by the current tool code from the sources as they
// were at that revision, and the release-tag lookup the 0.x policy is derived from. Every command here
// reads the object store (`rev-parse`, `ls-tree`, `cat-file`, `tag --merged`); nothing touches the
// index, the working tree or a ref.
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../ir/bundle.ts';
import { normalizeRepoPath, SourceReadError, type DirEntry, type SourceReader } from '../source/reader.ts';

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

/** Blob sizes are unbounded in git; token files are small, but never truncate one silently. */
const MAX_BUFFER = 256 * 1024 * 1024;

function git(root: string, args: readonly string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const err = e as { stderr?: unknown; message?: string };
    const detail = typeof err.stderr === 'string' && err.stderr.trim() !== '' ? err.stderr.trim() : (err.message ?? String(e));
    throw new GitError(`git ${args.join(' ')} failed in ${root}: ${detail}`);
  }
}

/** True when `root` is inside a git work tree. */
export function isGitWorkTree(root: string = REPO_ROOT): boolean {
  try {
    return git(root, ['rev-parse', '--is-inside-work-tree']).trim() === 'true';
  } catch {
    return false;
  }
}

/** True for a shallow clone, whose history (and so its release tags) may be incomplete. */
export function isShallow(root: string = REPO_ROOT): boolean {
  return git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true';
}

/**
 * The commit a ref names (a tag, branch, SHA or `HEAD~2`), as a full SHA. Throws GitError when the
 * ref names no commit. A ref that starts with '-' is rejected, so it can never be read as an option.
 */
export function resolveCommit(ref: string, root: string = REPO_ROOT): string {
  if (ref === '' || ref.startsWith('-')) throw new GitError(`not a revision: ${JSON.stringify(ref)}`);
  let sha: string;
  try {
    sha = git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();
  } catch {
    throw new GitError(`${JSON.stringify(ref)} names no commit in ${root}`);
  }
  if (!/^[0-9a-f]{40,64}$/.test(sha)) throw new GitError(`${JSON.stringify(ref)} names no commit in ${root}`);
  return sha;
}

export interface ReleaseVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** The release-tag grammar of ARCHITECTURE §11: `^v?\d+\.\d+\.\d+$`; pre-release tags are not releases. */
const RELEASE_TAG = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** The version a release tag names, or null when the tag is not a release tag. */
export function releaseVersion(tag: string): ReleaseVersion | null {
  const m = RELEASE_TAG.exec(tag);
  if (m === null) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compareReleases(a: ReleaseVersion, b: ReleaseVersion): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * Release tags merged into `ref` (default HEAD), newest version first; ties (`v1.2.0` and `1.2.0`)
 * by name in code-unit order.
 */
export function releaseTags(root: string = REPO_ROOT, ref = 'HEAD'): string[] {
  const commit = resolveCommit(ref, root);
  const tags = git(root, ['tag', '--list', '--merged', commit])
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t !== '');
  const releases = tags
    .map((tag) => ({ tag, version: releaseVersion(tag) }))
    .filter((r): r is { tag: string; version: ReleaseVersion } => r.version !== null);
  releases.sort((a, b) => compareReleases(b.version, a.version) || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  return releases.map((r) => r.tag);
}

/**
 * The newest release tag merged into `ref` (default HEAD): the highest version among the tags that
 * match `^v?\d+\.\d+\.\d+$` and whose commit `ref` contains. Null when there is none.
 */
export function lastReleaseTag(root: string = REPO_ROOT, ref = 'HEAD'): string | null {
  return releaseTags(root, ref)[0] ?? null;
}

interface TreeIndex {
  readonly files: ReadonlyMap<string, string>;             // path → blob id
  readonly dirs: ReadonlyMap<string, readonly DirEntry[]>; // dir ('' for the root) → sorted entries
}

function byName(a: DirEntry, b: DirEntry): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** Every blob and tree of `commit` under `prefix` (the root's path inside the repository), keyed without the prefix. */
function indexTree(root: string, commit: string, prefix: string): TreeIndex {
  const out = git(root, ['ls-tree', '-r', '-t', '-z', '--full-tree', commit]);
  const files = new Map<string, string>();
  const children = new Map<string, Map<string, boolean>>([['', new Map()]]);
  const add = (dir: string, name: string, isDir: boolean): void => {
    const m = children.get(dir) ?? new Map<string, boolean>();
    m.set(name, isDir || (m.get(name) ?? false));
    children.set(dir, m);
  };
  for (const record of out.split('\0')) {
    if (record === '') continue;
    const tab = record.indexOf('\t');
    if (tab === -1) continue;
    const [, type, oid] = record.slice(0, tab).split(' ');
    const full = record.slice(tab + 1);
    if (!full.startsWith(prefix)) continue;
    const path = full.slice(prefix.length);
    if (path === '') continue;
    const slash = path.lastIndexOf('/');
    const dir = slash === -1 ? '' : path.slice(0, slash);
    const name = path.slice(slash + 1);
    if (type === 'tree') {
      add(dir, name, true);
      if (!children.has(path)) children.set(path, new Map());
    } else if (type === 'blob' && oid !== undefined) {
      add(dir, name, false);
      files.set(path, oid);
    }
    // Submodules (type 'commit') are not sources.
  }
  const dirs = new Map<string, readonly DirEntry[]>();
  for (const [dir, m] of children) dirs.set(dir, [...m].map(([name, d]) => ({ name, dir: d })).sort(byName));
  return { files, dirs };
}

function checked(path: string): string {
  const n = normalizeRepoPath(path);
  if (n === null) throw new SourceReadError(path, `path leaves the repository root: ${path}`);
  return n;
}

/**
 * A read-only `SourceReader` over the tree of `ref` (ARCHITECTURE §11): paths are relative to `root`
 * as they are for `fsReader(root)`, even when `root` is a folder inside the repository. The ref is
 * resolved to a commit once, so the reader does not move when the ref does. Throws GitError when the
 * ref names no commit.
 */
export function gitReader(ref: string, root: string = REPO_ROOT): SourceReader & { readonly commit: string } {
  const commit = resolveCommit(ref, root);
  const prefix = git(root, ['rev-parse', '--show-prefix']).trim();
  const tree = indexTree(root, commit, prefix);
  const texts = new Map<string, string>();
  return {
    commit,
    readText(path) {
      const p = checked(path);
      const cached = texts.get(p);
      if (cached !== undefined) return cached;
      const oid = tree.files.get(p);
      if (oid === undefined) throw new SourceReadError(p, `cannot read ${p} at ${ref}`);
      const text = git(root, ['cat-file', 'blob', oid]);
      texts.set(p, text);
      return text;
    },
    list(dir) {
      return tree.dirs.get(checked(dir)) ?? [];
    },
    exists(path) {
      const p = checked(path);
      return p === '' || tree.files.has(p) || tree.dirs.has(p);
    },
  };
}
