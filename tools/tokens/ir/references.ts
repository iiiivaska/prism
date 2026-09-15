// Checks on a merged tree, run by the `prism/validate` and `prism/dtcg-types` preprocessors
// (ARCHITECTURE §5.4, §5.5, §6): every curly-brace reference in every `$value` names a token
// (`ref/broken`, `ref/group-reference`, `ref/syntax`), aliases form no cycle (`ref/cycle`), and every
// token gets an explicit `$type` by DTCG precedence: its own `$type`, else the resolved type of its
// alias target, else the `$type` of the closest group in the declaring document (`type/untyped`).
import { error, type Diagnostic } from './diagnostics.ts';
import { ALIAS_RE, aliasTarget } from './naming.ts';
import { compareIds } from './order.ts';
import type { PermKey, Provenance, TokenType } from './types.ts';

export type TokenNodes = Map<string, Record<string, unknown>>;

/** Every token node of a DTCG tree by id (`$root` kept). */
export function collectTokens(tree: Record<string, unknown>): TokenNodes {
  const out: TokenNodes = new Map();
  const walk = (node: Record<string, unknown>, path: string[]): void => {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$') && key !== '$root') continue;
      if (value === null || typeof value !== 'object' || Array.isArray(value)) continue;
      const child = value as Record<string, unknown>;
      const p = [...path, key];
      if ('$value' in child) out.set(p.join('.'), child);
      else walk(child, p);
    }
  };
  walk(tree, []);
  return out;
}

/** Every string that contains a brace, with its path inside the value ('' for the whole value). */
function referenceStrings(value: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof value === 'string') {
    if (value.includes('{') || value.includes('}')) out.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => referenceStrings(v, path === '' ? String(i) : `${path}.${i}`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) referenceStrings(v, path === '' ? k : `${path}.${k}`, out);
  }
}

interface Where { file?: string; line?: number }
function whereOf(provenance: ReadonlyMap<string, Provenance>, id: string): Where {
  const p = provenance.get(id);
  return p === undefined ? {} : { file: p.ref.file, line: p.ref.line };
}

function lineOf(provenance: ReadonlyMap<string, Provenance>, id: string, valuePath: string): Where {
  const p = provenance.get(id);
  if (p === undefined) return {};
  const ptr = valuePath === '' ? '/$value' : `/$value/${valuePath.split('.').join('/')}`;
  return { file: p.ref.file, line: p.token.lines.get(ptr) ?? p.ref.line };
}

/** Reference checks (§5.5). Returns the alias edges for the cycle check. */
export function checkReferences(tokens: TokenNodes, provenance: ReadonlyMap<string, Provenance>, permutation: PermKey, diagnostics: Diagnostic[]): void {
  const groupPrefixes = new Set<string>();
  for (const id of tokens.keys()) {
    const parts = id.split('.');
    for (let i = 1; i < parts.length; i++) groupPrefixes.add(parts.slice(0, i).join('.'));
  }
  const edges = new Map<string, string[]>();
  for (const [id, node] of tokens) {
    const refs: { path: string; text: string }[] = [];
    referenceStrings(node['$value'], '', refs);
    const targets: string[] = [];
    for (const { path, text } of refs) {
      const where = { ...lineOf(provenance, id, path), tokenId: id, permutation };
      const target = aliasTarget(text);
      if (target === null || !ALIAS_RE.test(text)) {
        diagnostics.push(error('ref/syntax', `${id}${path === '' ? '' : ` (${path})`} has ${JSON.stringify(text)}; a value is a whole-token reference "{a.b}" or a literal`, where));
        continue;
      }
      if (tokens.has(target)) {
        targets.push(target);
        continue;
      }
      if (target.split('.').some((s) => s.startsWith('$') && s !== '$root')) {
        diagnostics.push(error('ref/broken', `${id} references {${target}}; references name whole tokens`, where));
      } else if (groupPrefixes.has(target) && tokens.has(`${target}.$root`)) {
        diagnostics.push(
          error('ref/group-reference', `${id} references the group {${target}}; a reference to a group's base token is written {${target}.$root} (DTCG Format §6.2, ADR-0024 §1)`, {
            ...where,
            hint: `write {${target}.$root}`,
          }),
        );
      } else if (groupPrefixes.has(target)) {
        diagnostics.push(error('ref/broken', `${id} references {${target}}, which is a group without a $root token`, { ...where, hint: 'reference one of its tokens' }));
      } else {
        const hint = nearest(target, tokens.keys());
        diagnostics.push(error('ref/broken', `${id} references {${target}}, which is not defined in this permutation`, hint === null ? where : { ...where, hint: `did you mean {${hint}}?` }));
      }
    }
    if (targets.length > 0) edges.set(id, targets);
  }
  // cycles
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const reported = new Set<string>();
  const visit = (id: string): void => {
    state.set(id, 1);
    stack.push(id);
    for (const t of edges.get(id) ?? []) {
      const s = state.get(t);
      if (s === 1) {
        const cycle = stack.slice(stack.indexOf(t));
        const first = [...cycle].sort(compareIds)[0] ?? t;
        const key = [...cycle].sort(compareIds).join(' ');
        if (!reported.has(key)) {
          reported.add(key);
          const start = cycle.indexOf(first);
          const ordered = [...cycle.slice(start), ...cycle.slice(0, start), first];
          diagnostics.push(error('ref/cycle', `reference cycle: ${ordered.map((x) => `{${x}}`).join(' → ')}`, { ...whereOf(provenance, first), tokenId: first, permutation, hint: 'break the cycle with a literal value' }));
        }
      } else if (s === undefined) visit(t);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const id of [...edges.keys()].sort(compareIds)) if (!state.has(id)) visit(id);
}

/** Stamps an explicit `$type` on every token node by DTCG precedence (§5.4). */
export function stampTypes(tokens: TokenNodes, provenance: ReadonlyMap<string, Provenance>, permutation: PermKey, diagnostics: Diagnostic[]): void {
  const memo = new Map<string, TokenType | null>();
  const resolving = new Set<string>();
  const typeOf = (id: string): TokenType | null => {
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    const node = tokens.get(id);
    if (node === undefined || resolving.has(id)) return null;
    resolving.add(id);
    let t: TokenType | null;
    const own = provenance.get(id)?.token.ownType ?? null;
    const target = aliasTarget(node['$value']);
    if (own !== null) t = own;
    else if (target !== null) t = typeOf(target);
    else t = provenance.get(id)?.token.groupType ?? null;
    resolving.delete(id);
    memo.set(id, t);
    return t;
  };
  for (const [id, node] of tokens) {
    const t = typeOf(id);
    const target = aliasTarget(node['$value']);
    const own = provenance.get(id)?.token.ownType ?? null;
    if (own !== null && target !== null && tokens.has(target)) {
      const tt = typeOf(target);
      if (tt !== null && tt !== own) {
        diagnostics.push(error('type/alias-mismatch', `${id} declares $type ${own} but aliases {${target}}, a ${tt} token`, { ...whereOf(provenance, id), tokenId: id, permutation, hint: `remove the $type or alias a ${own} token` }));
      }
    }
    if (t === null) {
      if (target === null) {
        diagnostics.push(
          error('type/untyped', `${id} has no $type: neither the token nor any group above it in its document declares one (DTCG Format §5.2.2)`, {
            ...whereOf(provenance, id),
            tokenId: id,
            permutation,
            hint: 'add "$type" to the token',
          }),
        );
      }
      continue;
    }
    node['$type'] = t;
  }
}

/** The closest id by edit distance, for "did you mean" hints; null when nothing is close. */
export function nearest(name: string, candidates: Iterable<string>): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    // A `$root` token is also compared by its group path, the way people write it.
    const d = Math.min(distance(name, c), c.endsWith('.$root') ? distance(name, c.slice(0, -'.$root'.length)) : Infinity);
    if (d < bestD || (d === bestD && best !== null && compareIds(c, best) < 0)) {
      best = c;
      bestD = d;
    }
  }
  return best !== null && bestD <= Math.max(2, Math.floor(name.length / 4)) ? best : null;
}

export function distance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j] ?? 0;
      prev[j] = Math.min((prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length] ?? 0;
}
