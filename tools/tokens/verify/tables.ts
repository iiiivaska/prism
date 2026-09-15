// Table evaluators (ARCHITECTURE §9.12): the `tokens.ts` table model of every brand, evaluated for all
// 96 web contexts exactly as the generated `resolveTokens` walks it, against the IR. The contrast +
// transparency contexts are compared with s ⊕ ΔIC(s) ⊕ ΔRT(s). The Swift table model has its own
// evaluator, `verifySwiftTables` in formats/swift/model.ts, which the Swift format runs on every render
// (formats/swift/token-set.ts), so a mismatch fails `tokens:build` the same way.
import { COLOR_SCHEME_MODIFIER } from '../config.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import type { IRBundle } from '../ir/types.ts';
import { tokenAt, webScopes, type WebScope } from '../formats/css/web.ts';
import { tsTable, type TsEntry } from '../formats/ts-tokens.ts';
import { tsLiteral, type TsValue } from '../transforms/index.ts';
import { webContexts, type WebContext } from './css-cascade.ts';

/** The value the generated `resolveTokens` returns for an entry in a context (the same walk, in the tools). */
export function evaluateEntry(entry: TsEntry, ctx: WebContext): TsValue | undefined {
  if (entry.axis === null) return entry.value ?? undefined;
  if (entry.axis === COLOR_SCHEME_MODIFIER) {
    const s = ctx[COLOR_SCHEME_MODIFIER] ?? '';
    for (const d of entry.deltas) {
      if (ctx[d.axis] !== d.when) continue;
      const hit = d.values.find(([k]) => k === s);
      if (hit !== undefined) return hit[1];
    }
    return entry.values.find(([k]) => k === s)?.[1];
  }
  const v = ctx[entry.axis] ?? '';
  return entry.values.find(([k]) => k === v)?.[1];
}

/** The IR's value of a token in a web context, as `tokens.ts` renders it; null when the scope has no permutation for it. */
export function expectedTsValue(scope: WebScope, id: string, ctx: WebContext): TsValue | null {
  const input: Record<string, string> = {};
  let scheme: string | undefined;
  for (const a of scope.axes) {
    const c = a.contexts.get(ctx[a.axis] ?? '');
    if (c === undefined) return null;
    input[a.axis] = c;
    if (a.axis === COLOR_SCHEME_MODIFIER) scheme = ctx[a.axis];
  }
  const at = (i: number): TsValue => {
    const p = scope.perms[i];
    if (p === undefined) throw new Error(`permutation index ${i} is outside the scope`);
    return tsLiteral(tokenAt(p, id).value);
  };
  const base = at(scope.index(input));
  const baseKey = JSON.stringify(base);
  for (const v of scope.variants) {
    if (!('variant' in v.runtime.resolver) || ctx[v.axis] !== v.runtime.resolver.value || scheme === undefined) continue;
    const cv = v.contexts.get(scheme);
    if (cv === undefined) continue;
    const delta = at(scope.index({ ...input, [COLOR_SCHEME_MODIFIER]: cv }));
    if (JSON.stringify(delta) !== baseKey) return delta;   // disjoint deltas (§5.7)
  }
  return base;
}

/** `table` builds the model under test: `tsTable`, or a tampered one in the failing-input tests. */
export function verifyTsTables(bundle: IRBundle, limit = 20, table: (bundle: IRBundle, scope: WebScope) => readonly TsEntry[] = tsTable): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const scope of webScopes(bundle)) {
    const entries = table(bundle, scope);
    let total = 0;
    for (const ctx of webContexts(scope)) {
      for (const e of entries) {
        const want = expectedTsValue(scope, e.id, ctx);
        if (want === null) continue;
        const got = evaluateEntry(e, ctx);
        if (JSON.stringify(got) === JSON.stringify(want)) continue;
        total++;
        if (total <= limit) {
          out.push(error('ts/table-mismatch', `brand "${scope.brand}": ${e.path} resolves to ${JSON.stringify(got)?.slice(0, 200) ?? 'undefined'} in ${JSON.stringify(ctx)}, but the IR gives ${JSON.stringify(want).slice(0, 200)}`, { tokenId: e.id, hint: 'fix formats/ts-tokens.ts' }));
        }
      }
    }
    if (total > limit) out.push(error('ts/table-mismatch', `brand "${scope.brand}": ${total - limit} more table mismatches`));
  }
  return out;
}
