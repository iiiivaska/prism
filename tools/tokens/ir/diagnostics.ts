// Diagnostics: one shape for every check, a deterministic order, and human and JSON printers
// (ARCHITECTURE §4.2, §3.1). Every diagnostic carries a code, the file and line to fix, and a hint
// when the fix is mechanical, so an agent can fix a whole run in one pass.
import type { Diagnostic, PermKey } from './types.ts';

export type { Diagnostic } from './types.ts';

export interface DiagnosticDetails {
  readonly hint?: string;
  readonly tokenId?: string;
  readonly file?: string;
  readonly line?: number;
  readonly permutation?: PermKey;
}

/** An error-severity diagnostic without undefined fields (so JSON output and equality stay stable). */
export function error(code: string, message: string, details: DiagnosticDetails = {}): Diagnostic {
  const out: { -readonly [K in keyof Diagnostic]: Diagnostic[K] } = { code, severity: 'error', message };
  if (details.hint !== undefined) out.hint = details.hint;
  if (details.tokenId !== undefined) out.tokenId = details.tokenId;
  if (details.file !== undefined) out.file = details.file;
  if (details.line !== undefined) out.line = details.line;
  if (details.permutation !== undefined) out.permutation = details.permutation;
  return out;
}

export class TokenBuildError extends Error {
  readonly diagnostics: readonly Diagnostic[];
  constructor(diagnostics: readonly Diagnostic[]) {
    const sorted = sortDiagnostics(diagnostics);
    super(`token build failed with ${sorted.length} diagnostic(s):\n${formatDiagnostics(sorted)}`);
    this.name = 'TokenBuildError';
    this.diagnostics = sorted;
  }
}

function cmp(a: string | number | undefined, b: string | number | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** File, line, code, token, message, permutation; code-unit comparison, never locale-dependent. */
export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      cmp(a.file, b.file) || cmp(a.line, b.line) || cmp(a.code, b.code) || cmp(a.tokenId, b.tokenId) ||
      cmp(a.message, b.message) || cmp(a.permutation, b.permutation),
  );
}

/**
 * Drops repeats of the same finding: the same code, token, place and message. Per-permutation checks
 * report a defect once, with the first permutation that showed it.
 */
export function dedupeDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];
  for (const d of diagnostics) {
    const key = [d.code, d.tokenId ?? '', d.file ?? '', d.line ?? '', d.message].join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === 'error');
}

/** `file:line  code  [token]  message` plus an indented hint and permutation. */
export function formatDiagnostics(diagnostics: readonly Diagnostic[]): string {
  const lines: string[] = [];
  for (const d of diagnostics) {
    const where = d.file === undefined ? '(resolver)' : d.line === undefined ? d.file : `${d.file}:${d.line}`;
    const token = d.tokenId === undefined ? '' : `  ${d.tokenId}`;
    lines.push(`${where}  ${d.severity === 'error' ? '' : 'warning '}${d.code}${token}  ${d.message}`);
    if (d.hint !== undefined) lines.push(`    fix: ${d.hint}`);
    if (d.permutation !== undefined) lines.push(`    in: ${d.permutation}`);
  }
  return lines.join('\n');
}

/** Stable JSON: `{ "diagnostics": [...] }`, sorted, two-space indented, final newline. */
export function formatDiagnosticsJson(diagnostics: readonly Diagnostic[]): string {
  return `${JSON.stringify({ diagnostics: sortDiagnostics(diagnostics) }, null, 2)}\n`;
}
