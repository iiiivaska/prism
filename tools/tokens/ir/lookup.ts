// Name lookup over a set of token ids (ARCHITECTURE §10, ADR-0024 §13.2). A public name, an id or a
// glob maps to ids. Plain names try, in order: the exact id; `<name>.$root`; `sys.<name>`;
// `sys.<name>.$root`; `comp.<name>`; `ref.<name>`; `ref.<name>.$root`. Globs (ir/glob.ts grammar)
// try the same prefixes ('', 'sys.', 'comp.', 'ref.') and return the matches of the first prefix that
// matches anything; a token whose id ends in `.$root` also matches by its group path.
import { matchGlob, parseGlob } from './glob.ts';
import { publicPath, stripRoot } from './naming.ts';
import { compareIds } from './order.ts';
import { distance } from './references.ts';

export class LookupError extends Error {
  readonly suggestions: readonly string[];
  constructor(name: string, suggestions: readonly string[]) {
    super(`unknown token name "${name}"${suggestions.length > 0 ? `; did you mean ${suggestions.map((s) => `"${s}"`).join(', ')}?` : ''}`);
    this.name = 'LookupError';
    this.suggestions = suggestions;
  }
}

const PREFIXES = ['', 'sys.', 'comp.', 'ref.'] as const;

/** Ids matching `name`, sorted canonically; empty when nothing matches. */
export function findIds(ids: Iterable<string>, name: string): string[] {
  const all = ids instanceof Set ? (ids as Set<string>) : new Set(ids);
  const glob = parseGlob(name);
  if (!glob.isPattern) {
    for (const candidate of [name, `${name}.$root`, `sys.${name}`, `sys.${name}.$root`, `comp.${name}`, `ref.${name}`, `ref.${name}.$root`]) {
      if (all.has(candidate)) return [candidate];
    }
    return [];
  }
  for (const prefix of PREFIXES) {
    const g = parseGlob(prefix + name);
    const hits = [...all].filter((id) => matchGlob(g, id) || (id.endsWith('.$root') && matchGlob(g, stripRoot(id))));
    if (hits.length > 0) return hits.sort(compareIds);
  }
  return [];
}

/** Ids matching `name`; throws LookupError with the nearest public paths when nothing matches. */
export function lookupIds(ids: Iterable<string>, name: string): string[] {
  const all = ids instanceof Set ? (ids as Set<string>) : new Set(ids);
  const hits = findIds(all, name);
  if (hits.length > 0) return hits;
  throw new LookupError(name, suggest(all, name));
}

export function suggest(ids: Iterable<string>, name: string, count = 3): string[] {
  const scored = [...new Set([...ids].map(publicPath))]
    .map((p) => ({ p, d: distance(name, p) }))
    .sort((a, b) => a.d - b.d || (a.p < b.p ? -1 : a.p > b.p ? 1 : 0));
  return scored.slice(0, count).filter((s) => s.d <= Math.max(3, Math.floor(name.length / 3))).map((s) => s.p);
}
