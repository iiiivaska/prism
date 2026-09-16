// Loading a spec YAML file so every diagnostic can name a line (ARCHITECTURE §3.1: file, line, fix).
// The document is parsed once with a LineCounter; `lineOf(path)` maps a JSON path inside the document
// back to the line its value starts on, and `roundTrips` proves the file survives a parse/stringify
// cycle of the repository's yaml package, which is what the generators and the agent skill read it with.
import { LineCounter, parseDocument, stringify, type Node } from 'yaml';

export type JsonPath = readonly (string | number)[];

export interface LoadProblem {
  readonly message: string;
  readonly line: number;
}

export interface SpecDoc {
  /** Repository-relative POSIX path. */
  readonly path: string;
  /** The parsed document, or null when it does not parse into a mapping. */
  readonly value: Record<string, unknown> | null;
  /** Parse errors, duplicate keys and a failed round trip. */
  readonly problems: readonly LoadProblem[];
  /** 1-based line the value at `path` starts on; 1 when the path is not in the document. */
  lineOf(path: JsonPath): number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Structural equality over the JSON shapes a spec can hold (used for the round-trip check). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => sameValue(item, b[i]));
  }
  if (isRecord(a) && isRecord(b)) {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => sameValue(a[k], b[k]));
  }
  return false;
}

export function loadSpec(path: string, text: string): SpecDoc {
  const counter = new LineCounter();
  const doc = parseDocument(text, { lineCounter: counter, prettyErrors: false, uniqueKeys: true });
  const problems: LoadProblem[] = [];
  const lineAt = (offset: number | undefined): number => (offset === undefined ? 1 : counter.linePos(offset).line);
  for (const e of doc.errors) problems.push({ message: e.message, line: lineAt(e.pos[0]) });
  for (const w of doc.warnings) problems.push({ message: w.message, line: lineAt(w.pos[0]) });

  let value: Record<string, unknown> | null = null;
  if (problems.length === 0) {
    const parsed: unknown = doc.toJS({ maxAliasCount: 100 });
    if (isRecord(parsed)) value = parsed;
    else problems.push({ message: 'the document is not a mapping', line: 1 });
  }

  if (value !== null) {
    // The contract is read back by the generators, the parity report and the agent skill; a file that
    // does not survive one parse/stringify cycle (anchors, merge keys, non-plain scalars) is not a
    // stable source for them (ADR-0006).
    let round: unknown;
    try {
      round = parseDocument(stringify(value), { prettyErrors: false }).toJS({ maxAliasCount: 100 });
    } catch (e) {
      round = { error: e instanceof Error ? e.message : String(e) };
    }
    if (!sameValue(value, round)) problems.push({ message: 'the file does not round-trip through the yaml package', line: 1 });
  }

  const lineOf = (path: JsonPath): number => {
    if (path.length === 0) return 1;
    const node: unknown = doc.getIn(path, true);
    const range = (node as Node | undefined)?.range;
    return Array.isArray(range) ? lineAt(range[0]) : 1;
  };
  return { path, value, problems, lineOf };
}
