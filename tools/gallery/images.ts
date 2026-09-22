// The one port through which the gallery touches image bytes: list them, read a PNG's pixel size, copy
// one. Text (specs, the workflow, the provenance stamp) goes through the repository's `SourceReader`,
// which is text-only (tools/tokens/source/reader.ts), and the tests drive both through memory.
import { closeSync, copyFileSync, mkdirSync, openSync, readdirSync, readSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

export interface ImageStore {
  /** `<Component>/<file>.png` under a repository-relative root, POSIX, sorted; empty when it is absent. */
  list(root: string): readonly string[];
  /** The PNG's pixel size, or null when the file is not a PNG this tool can read. */
  size(path: string): PixelSize | null;
  /** Copy a repository-relative file to a repository-relative destination, creating directories. */
  copy(from: string, to: string): void;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height out of a PNG's IHDR, which is fixed at bytes 16…23 of every PNG. */
export function pngSize(head: Buffer): PixelSize | null {
  if (head.length < 24 || !head.subarray(0, 8).equals(SIGNATURE)) return null;
  if (head.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

export function fsImages(root: string): ImageStore {
  return {
    list(dir) {
      let components: readonly string[];
      try {
        components = readdirSync(join(root, dir), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort();
      } catch {
        return [];
      }
      const files: string[] = [];
      for (const component of components) {
        for (const file of readdirSync(join(root, dir, component)).sort()) {
          if (file.startsWith('.')) continue;
          files.push(posix.join(component, file));
        }
      }
      return files;
    },
    size(path) {
      const head = Buffer.alloc(24);
      let fd: number;
      try {
        fd = openSync(join(root, path), 'r');
      } catch {
        return null;
      }
      try {
        readSync(fd, head, 0, 24, 0);
      } finally {
        closeSync(fd);
      }
      return pngSize(head);
    },
    copy(from, to) {
      const target = join(root, to);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(root, from), target);
    },
  };
}

/** An in-memory store for the tests: repository-relative path → bytes (or a declared size). */
export function memoryImages(files: ReadonlyMap<string, PixelSize>): ImageStore & { readonly copied: Map<string, string> } {
  const copied = new Map<string, string>();
  return {
    copied,
    list(dir) {
      const prefix = `${dir}/`;
      return [...files.keys()]
        .filter((path) => path.startsWith(prefix))
        .map((path) => path.slice(prefix.length))
        .sort();
    },
    size(path) {
      return files.get(path) ?? null;
    },
    copy(from, to) {
      copied.set(to, from);
    },
  };
}
