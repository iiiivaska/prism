// One pattern grammar for token ids, shared by the ownership table (config.ts), `lookup()` (api.ts)
// and the living-document check (docs.test.ts, ADR-0024 §13.2):
//
//   segments joined by '.';  `a|b|c` alternation inside one segment;  `*` exactly one segment;
//   `**` one or more segments;  `N…M` every numeric segment from N to M;  `<a|b>` a placeholder
//   segment matching `a` or `b`;  `<name>` a placeholder matching exactly one segment.
//
// `*` and `**` match `$root` like any other segment.

export type GlobSegment =
  | { readonly kind: 'literal'; readonly value: string }
  | { readonly kind: 'alt'; readonly values: readonly string[] }
  | { readonly kind: 'range'; readonly from: number; readonly to: number }
  | { readonly kind: 'one' }
  | { readonly kind: 'many' };

export interface Glob {
  readonly source: string;
  readonly segments: readonly GlobSegment[];
  /** True when any segment is not a plain literal. */
  readonly isPattern: boolean;
}

const RANGE = /^(0|[1-9][0-9]*)…(0|[1-9][0-9]*)$/;
const NUMERIC = /^(0|[1-9][0-9]*)$/;

function parseSegment(raw: string): GlobSegment {
  if (raw === '**') return { kind: 'many' };
  if (raw === '*') return { kind: 'one' };
  if (raw.startsWith('<') && raw.endsWith('>') && raw.length > 2) {
    const inner = raw.slice(1, -1);
    return inner.includes('|') ? { kind: 'alt', values: inner.split('|') } : { kind: 'one' };
  }
  const range = RANGE.exec(raw);
  if (range) return { kind: 'range', from: Number(range[1]), to: Number(range[2]) };
  if (raw.includes('|')) return { kind: 'alt', values: raw.split('|') };
  return { kind: 'literal', value: raw };
}

export function parseGlob(pattern: string): Glob {
  const segments = pattern.split('.').map(parseSegment);
  return { source: pattern, segments, isPattern: segments.some((s) => s.kind !== 'literal') };
}

function matchSegment(seg: GlobSegment, value: string): boolean {
  switch (seg.kind) {
    case 'literal':
      return seg.value === value;
    case 'alt':
      return seg.values.includes(value);
    case 'range': {
      if (!NUMERIC.test(value)) return false;
      const n = Number(value);
      return n >= seg.from && n <= seg.to;
    }
    case 'one':
      return true;
    case 'many':
      return true;
  }
}

function matchFrom(segs: readonly GlobSegment[], si: number, parts: readonly string[], pi: number): boolean {
  if (si === segs.length) return pi === parts.length;
  const seg = segs[si];
  if (seg === undefined) return false;
  if (seg.kind === 'many') {
    for (let end = pi + 1; end <= parts.length; end++) {
      if (matchFrom(segs, si + 1, parts, end)) return true;
    }
    return false;
  }
  const part = parts[pi];
  if (part === undefined) return false;
  return matchSegment(seg, part) && matchFrom(segs, si + 1, parts, pi + 1);
}

export function matchGlob(glob: Glob, id: string): boolean {
  return matchFrom(glob.segments, 0, id.split('.'), 0);
}

const cache = new Map<string, Glob>();
function cached(pattern: string): Glob {
  let g = cache.get(pattern);
  if (g === undefined) {
    g = parseGlob(pattern);
    cache.set(pattern, g);
  }
  return g;
}

export function matches(pattern: string, id: string): boolean {
  return matchGlob(cached(pattern), id);
}

export function matchesAny(patterns: readonly string[], id: string): boolean {
  return patterns.some((p) => matches(p, id));
}

/** Every id of `ids` the pattern matches, in input order. */
export function expand(pattern: string, ids: Iterable<string>): string[] {
  const g = cached(pattern);
  const out: string[] = [];
  for (const id of ids) if (matchGlob(g, id)) out.push(id);
  return out;
}
