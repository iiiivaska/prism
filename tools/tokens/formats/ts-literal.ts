// Prism's own TypeScript literal serializer for the generated `.ts` files (ARCHITECTURE §12 rule 3):
// single-quoted strings, numbers without exponent notation, identifier keys unquoted, objects printed
// in the key order they were built in (every builder builds them in a fixed order, §12 rule 1).

export function tsString(s: string): string {
  let out = "'";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '\\') out += '\\\\';
    else if (ch === "'") out += "\\'";
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029) out += `\\u${code.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return `${out}'`;
}

export function tsNumber(n: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`cannot print ${n} as a TypeScript literal`);
  const s = Object.is(n, -0) ? '0' : String(n);
  if (/e/i.test(s)) throw new RangeError(`${s} would print with an exponent; round it first (§12 rule 2)`);
  return s;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function tsKey(key: string): string {
  return IDENTIFIER.test(key) ? key : tsString(key);
}

/** One-line literal: `{ css: 'oklch(…)', cssP3: null, hex: '#f1f2f5', alpha: 1 }`, `[1, 2]`. */
export function tsInline(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return tsString(value);
  if (typeof value === 'number') return tsNumber(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(tsInline).join(', ')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    return `{ ${entries.map(([k, v]) => `${tsKey(k)}: ${tsInline(v)}`).join(', ')} }`;
  }
  throw new TypeError(`cannot print a ${typeof value} as a TypeScript literal`);
}

/** A JSDoc block (`/** … *\/`) at `indent`; `*\/` inside the text is broken up. */
export function jsDoc(lines: readonly string[], indent: string): string[] {
  const clean = lines.flatMap((l) => l.split('\n')).map((l) => l.replace(/\*\//g, '*\\/').trimEnd());
  if (clean.length === 0) return [];
  if (clean.length === 1) return [`${indent}/** ${clean[0] ?? ''} */`];
  return [`${indent}/**`, ...clean.map((l) => (l === '' ? `${indent} *` : `${indent} * ${l}`)), `${indent} */`];
}
