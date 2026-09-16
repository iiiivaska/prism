// Fixture harness for parity:report, the same shape tools/spec uses. Every `fixtures/<case>/` tree is
// an overlay of the repository: it holds only the spec or manifest files its defect touches, plus
// `fixture.json` with the description, the paths it removes, the (code, file) pairs the run must
// report and the cells that must lag. Everything else — the four slice specs, the three untouched
// manifests — is the repository's, so a case reads as a diff.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fsReader, overlayReader, REPO_ROOT, type Diagnostic, type SourceReader } from '../tokens/api.ts';
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

export function caseReader(c: ParityCase): SourceReader {
  return overlayReader(fsReader(REPO_ROOT), fsReader(`${FIXTURES}${c.name}`), c.remove);
}

/** `code|file` pairs, sorted: what a fixture declares and what a run reports. */
export function pairs(items: readonly (Expectation | Diagnostic)[]): string[] {
  return [...new Set(items.map((d) => `${d.code}|${d.file ?? ''}`))].sort();
}

/** `Component|platform` per lagging cell, in report order. */
export function lagKeys(lags: readonly Lag[]): string[] {
  return lags.map((l) => `${l.row.spec.name}|${l.cell.platform}`);
}
