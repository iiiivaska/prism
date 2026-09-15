// JSON documents with positions: `jsonc-parser`'s `parseTree` gives an offset for every node and
// keeps duplicate keys, which `JSON.parse` silently collapses (ARCHITECTURE §5.1). Import the
// package by name: its lib/esm build uses extensionless imports that Node ESM rejects (§15 F26).
import { parseTree, printParseErrorCode, type Node, type ParseError } from 'jsonc-parser';
import { error, type Diagnostic } from '../ir/diagnostics.ts';

export interface JsonDoc {
  readonly file: string;
  readonly root: Node;
  /** 1-based line of an offset. */
  line(offset: number): number;
  column(offset: number): number;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function indexOf(starts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? 0) <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Parses strict JSON (no comments, no trailing commas); reports syntax errors and duplicate keys. */
export function parseJson(file: string, text: string, diagnostics: Diagnostic[]): JsonDoc | null {
  const errors: ParseError[] = [];
  const root = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
  const starts = lineStarts(text);
  const line = (offset: number): number => indexOf(starts, offset) + 1;
  const column = (offset: number): number => offset - (starts[indexOf(starts, offset)] ?? 0) + 1;
  for (const e of errors) {
    diagnostics.push(error('source/parse', `invalid JSON: ${printParseErrorCode(e.error)}`, { file, line: line(e.offset) }));
  }
  if (root === undefined || errors.length > 0) return null;
  const doc: JsonDoc = { file, root, line, column };
  reportDuplicates(doc, root, diagnostics);
  return doc;
}

function reportDuplicates(doc: JsonDoc, node: Node, diagnostics: Diagnostic[]): void {
  if (node.type === 'object') {
    const seen = new Map<string, Node>();
    for (const prop of node.children ?? []) {
      const key = prop.children?.[0];
      if (key === undefined) continue;
      const name = String(key.value);
      const earlier = seen.get(name);
      if (earlier !== undefined) {
        diagnostics.push(
          error('source/duplicate-key', `duplicate key "${name}" (first at line ${doc.line(earlier.offset)}); JSON keeps only the last`, {
            file: doc.file,
            line: doc.line(key.offset),
            hint: 'remove or rename one of the two keys',
          }),
        );
      }
      seen.set(name, key);
    }
  }
  for (const child of node.children ?? []) reportDuplicates(doc, child, diagnostics);
}

/** The properties of an object node, last occurrence of each key only (the value JSON keeps). */
export function properties(node: Node): { readonly key: string; readonly keyNode: Node; readonly value: Node }[] {
  if (node.type !== 'object') return [];
  const out = new Map<string, { key: string; keyNode: Node; value: Node }>();
  for (const prop of node.children ?? []) {
    const keyNode = prop.children?.[0];
    const value = prop.children?.[1];
    if (keyNode === undefined || value === undefined) continue;
    const key = String(keyNode.value);
    out.delete(key);
    out.set(key, { key, keyNode, value });
  }
  return [...out.values()];
}

/** The plain value of a node (last duplicate wins, like JSON.parse). */
export function valueOf(node: Node): unknown {
  switch (node.type) {
    case 'object': {
      const out: Record<string, unknown> = {};
      for (const p of properties(node)) out[p.key] = valueOf(p.value);
      return out;
    }
    case 'array':
      return (node.children ?? []).map(valueOf);
    default:
      return node.value as unknown;
  }
}

export function escapePointer(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
