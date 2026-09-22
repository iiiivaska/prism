// Fixture harness for parity:report, the same shape tools/spec uses. Every `fixtures/<case>/` tree is
// an overlay of the repository: it holds only the spec or manifest files its defect touches, plus
// `fixture.json` with the description, the paths it removes, the (code, file) pairs the run must
// report and the cells that must lag. The specs are the repository's, so a case reads as a diff.
//
// The manifests are not: a case is read against four empty tables (`emptyManifests`), and a manifest
// the case does not write is one it says nothing about. Were the repository's own manifests to leak
// in, every component the stacks implement would become a second, unasked-for input — an orphan in a
// tree that has only `Sample.yaml`, or an extra lagging cell in `lagging` — and each new component
// wave would rewrite expectations that are about a defect, not about what is shipped.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fsReader, memoryReader, overlayReader, REPO_ROOT, type Diagnostic, type SourceReader } from '../tokens/api.ts';
import { MANIFESTS, type ManifestSyntax } from './config.ts';
import type { Lag } from './types.ts';

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));

export interface Expectation {
  readonly code: string;
  readonly file?: string;
}

export interface ParityCase {
  readonly name: string;
  readonly description: string;
  readonly expect: readonly Expectation[];
  /** `Component|platform` per lagging cell. */
  readonly lags: readonly string[];
  readonly remove: readonly string[];
}

export function parityCases(): ParityCase[] {
  return readdirSync(FIXTURES, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const meta = JSON.parse(readFileSync(`${FIXTURES}${name}/fixture.json`, 'utf8')) as {
        description: string; expect: Expectation[]; lags?: string[]; remove?: string[];
      };
      return { name, description: meta.description, expect: meta.expect, lags: meta.lags ?? [], remove: meta.remove ?? [] };
    });
}

/** An `implemented` table with no entries, in each syntax of `tools/parity/manifest.ts`. */
const EMPTY_TABLE: Readonly<Record<ManifestSyntax, string>> = {
  swift: 'public enum Manifest {\n    public static let implemented: [String: [String: Int]] = [:]\n}\n',
  ts: 'export const implemented = {};\n',
};

/** The four manifest paths, each holding an empty table: the base every fixture is a diff against. */
export function emptyManifests(): Record<string, string> {
  return Object.fromEntries(MANIFESTS.map((m) => [m.path, EMPTY_TABLE[m.syntax]]));
}

export function caseReader(c: ParityCase): SourceReader {
  const base = overlayReader(fsReader(REPO_ROOT), memoryReader(emptyManifests()));
  return overlayReader(base, fsReader(`${FIXTURES}${c.name}`), c.remove);
}

/** `code|file` pairs, sorted: what a fixture declares and what a run reports. */
export function pairs(items: readonly (Expectation | Diagnostic)[]): string[] {
  return [...new Set(items.map((d) => `${d.code}|${d.file ?? ''}`))].sort();
}

/** `Component|platform` per lagging cell, in report order. */
export function lagKeys(lags: readonly Lag[]): string[] {
  return lags.map((l) => `${l.row.spec.name}|${l.cell.platform}`);
}
