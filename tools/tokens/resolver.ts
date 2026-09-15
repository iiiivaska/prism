// DELETABLE (ARCHITECTURE §5.8): enumeration, DTCG-exact merge and provenance. When Style Dictionary
// ships native resolver support (#1590) and passes fixtures/merge-semantics/, this file and its test
// go; source/* stays.
//
// Merge follows DTCG Resolver 2025.10: walk resolutionOrder; a set contributes its sources in order,
// a modifier the sources of the chosen context. A later token node replaces the earlier one WHOLESALE,
// $description and $extensions included ("the last occurrence in the array will be the final value",
// §4.1.4); groups merge; group properties are last-wins per key. Aliases are not touched here (§6.3).
import { error, type Diagnostic } from './ir/diagnostics.ts';
import type { Input, PermKey, Provenance } from './ir/types.ts';
import { isPlainObject } from './source/json.ts';
import type { ContextName, ModifierName, SourceDoc, SourceLayer, SourceModel } from './source/types.ts';

export type { Provenance } from './ir/types.ts';

export type Filter = Partial<Record<ModifierName, readonly ContextName[]>>;

/** Cartesian product over the modifiers in resolutionOrder order, contexts in declaration order. */
export function enumerate(model: SourceModel, filter?: Filter): Input[] {
  let out: Record<string, string>[] = [{}];
  for (const m of model.modifiers) {
    const allowed = filter?.[m.name];
    if (allowed !== undefined) {
      for (const c of allowed) {
        if (!m.contexts.includes(c)) throw new Error(`filter names unknown context "${c}" of modifier "${m.name}"`);
      }
    }
    const contexts = allowed === undefined ? m.contexts : m.contexts.filter((c) => allowed.includes(c));
    const next: Record<string, string>[] = [];
    for (const partial of out) for (const c of contexts) next.push({ ...partial, [m.name]: c });
    out = next;
  }
  if (filter !== undefined) {
    for (const name of Object.keys(filter)) {
      if (!model.modifiers.some((m) => m.name === name)) throw new Error(`filter names unknown modifier "${name}"`);
    }
  }
  return out;
}

/** `name=context` pairs joined by `|`, modifiers in resolutionOrder order. */
export function permKey(model: SourceModel, input: Input): PermKey {
  return model.modifiers.map((m) => `${m.name}=${input[m.name] ?? ''}`).join('|');
}

/** The input of every modifier's default context. */
export function defaultInput(model: SourceModel): Input {
  const out: Record<string, string> = {};
  for (const m of model.modifiers) out[m.name] = m.default;
  return out;
}

export interface MergeResult {
  /** The merged DTCG tree; token nodes are the frozen source nodes, shared by reference. */
  readonly tree: Record<string, unknown>;
  readonly provenance: ReadonlyMap<string, Provenance>;
  readonly diagnostics: readonly Diagnostic[];
}

/** The documents a permutation applies, in order, with their layers. */
export function layersFor(model: SourceModel, input: Input): { readonly layer: SourceLayer; readonly doc: SourceDoc }[] {
  const out: { layer: SourceLayer; doc: SourceDoc }[] = [];
  for (const item of model.order) {
    if (item.kind === 'set') {
      for (const doc of model.sets.get(item.name) ?? []) out.push({ layer: { kind: 'set', name: item.name }, doc });
    } else {
      const context = input[item.name];
      if (context === undefined) continue;
      for (const doc of model.contexts.get(item.name)?.get(context) ?? []) {
        out.push({ layer: { kind: 'modifier', name: item.name, context }, doc });
      }
    }
  }
  return out;
}

export function merge(model: SourceModel, input: Input): MergeResult {
  const tree: Record<string, unknown> = {};
  const provenance = new Map<string, Provenance>();
  const diagnostics: Diagnostic[] = [];
  for (const { layer, doc } of layersFor(model, input)) {
    mergeInto(tree, doc.root, [], doc, layer, provenance, diagnostics);
  }
  return { tree, provenance, diagnostics };
}

function isToken(node: unknown): node is Record<string, unknown> {
  return isPlainObject(node) && '$value' in node;
}

function mergeInto(
  target: Record<string, unknown>,
  source: Readonly<Record<string, unknown>>,
  path: readonly string[],
  doc: SourceDoc,
  layer: SourceLayer,
  provenance: Map<string, Provenance>,
  diagnostics: Diagnostic[],
): void {
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('$') && key !== '$root') {
      target[key] = value;   // group property: last wins per key
      continue;
    }
    if (!isPlainObject(value)) continue;
    const childPath = [...path, key];
    const id = childPath.join('.');
    // own keys only: `target.constructor` would otherwise be the global Object, merged into as a group
    const existing = Object.hasOwn(target, key) ? target[key] : undefined;
    if (isToken(value)) {
      if (existing !== undefined && !isToken(existing)) {
        diagnostics.push(shapeConflict(id, doc, 'a token', 'a group'));
        continue;
      }
      target[key] = value;
      const token = doc.tokens.get(id);
      if (token !== undefined) {
        provenance.set(id, { ref: { file: token.loc.file, layer, line: token.loc.line }, doc, token });
      }
      continue;
    }
    if (existing !== undefined && isToken(existing)) {
      diagnostics.push(shapeConflict(id, doc, 'a group', 'a token'));
      continue;
    }
    let group = existing as Record<string, unknown> | undefined;
    if (group === undefined || Object.isFrozen(group)) {
      group = group === undefined ? {} : { ...group };
      target[key] = group;
    }
    mergeInto(group, value, childPath, doc, layer, provenance, diagnostics);
  }
}

function shapeConflict(id: string, doc: SourceDoc, now: string, before: string): Diagnostic {
  const group = doc.groups.get(id);
  const token = doc.tokens.get(id);
  const loc = token?.loc ?? group?.loc;
  return error('resolver/shape-conflict', `${id} is ${now} in ${doc.file} but ${before} in an earlier layer`, {
    tokenId: id,
    ...(loc === undefined ? {} : { file: loc.file, line: loc.line }),
    hint: 'a path is either a token or a group in every document',
  });
}
