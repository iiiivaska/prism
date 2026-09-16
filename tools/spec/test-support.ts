// Fixture harness for spec:validate. Every `fixtures/<case>/` tree is an overlay of the repository:
// it holds only the spec files its defect touches, plus `fixture.json` with the description, the
// paths it removes and the (code, file) pairs the run must report. The token tree is the
// repository's in every case, so one collected dictionary serves the whole suite.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { collectBundle, fsReader, overlayReader, REPO_ROOT, type CollectResult, type Diagnostic, type SourceReader } from '../tokens/api.ts';

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));

export interface Expectation {
  readonly code: string;
  readonly file?: string;
  readonly tokenId?: string;
}

export interface SpecCase {
  readonly name: string;
  readonly description: string;
  readonly expect: readonly Expectation[];
  readonly remove: readonly string[];
}

export function specCases(): SpecCase[] {
  return readdirSync(FIXTURES, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const meta = JSON.parse(readFileSync(`${FIXTURES}${name}/fixture.json`, 'utf8')) as {
        description: string; expect: Expectation[]; remove?: string[];
      };
      return { name, description: meta.description, expect: meta.expect, remove: meta.remove ?? [] };
    });
}

export function caseReader(c: SpecCase): SourceReader {
  return overlayReader(fsReader(REPO_ROOT), fsReader(`${FIXTURES}${c.name}`), c.remove);
}

/** `code|file|tokenId` triples, sorted: what a fixture declares and what a run reports. */
export function triples(items: readonly (Expectation | Diagnostic)[]): string[] {
  return [...new Set(items.map((d) => `${d.code}|${d.file ?? ''}|${d.tokenId ?? ''}`))].sort();
}

let dictionary: Promise<CollectResult> | null = null;

/** The repository's token dictionary, built once for the whole test file. */
export function repoDictionary(): Promise<CollectResult> {
  dictionary ??= collectBundle({ reader: fsReader(REPO_ROOT) });
  return dictionary;
}
