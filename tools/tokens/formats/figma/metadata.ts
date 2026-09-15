// ADR-0026 rules 1 and 2 on the source (decision 3's checks): every `sys` and `comp` declaration whose
// type Figma imports as a scoped variable (color, dimension, font family, number except a flag)
// carries `$extensions["app.prism"].figma` with `scopes` and a `collection` equal to the layer that
// owns the id (`base` for the `sys` set, `component` for the `comp` set, else the modifier that
// writes it); nothing else carries `figma` (no `ref` token, no composite, no flag, no other type);
// and no token authors `figma.codeSyntax`, which the Figma-native flavor derives (code-syntax.ts).
//
// The function is pure over the source model plus the resolved type of each id, so the source checks
// (`source/analyze.ts`) can call it; the flavor tests run it on the repository.
import { EXTENSION_NAMESPACE } from '../../config.ts';
import { error, type Diagnostic } from '../../ir/diagnostics.ts';
import { tierOf } from '../../ir/naming.ts';
import { compareIds } from '../../ir/order.ts';
import type { IRBundle, PermutationIR, TokenType } from '../../ir/types.ts';
import type { SourceModel } from '../../source/types.ts';

/** The types Figma imports as scoped variables (ADR-0026 decision 1); a flag number is not one. */
export const FIGMA_SCOPED_TYPES: readonly TokenType[] = ['color', 'dimension', 'fontFamily', 'number'];
/** `figma.collection` of an id no modifier writes, per tier (tokens/README.md, "Metadata"). */
export const SET_COLLECTIONS: Readonly<Record<string, string>> = { sys: 'base', comp: 'component' };

export interface TypeFact {
  readonly type: TokenType;
  readonly flag: boolean;
}

/** The resolver's default permutation (every modifier at its default), else the first one. */
export function defaultPermutation(bundle: IRBundle): PermutationIR | undefined {
  const key = bundle.model.modifiers.map((m) => `${m.name}=${m.default}`).join('|');
  return bundle.permutations.get(key) ?? bundle.permutations.values().next().value;
}

/** Type and flag of every id, from one permutation (both are the same everywhere, IR invariants 1 and 5). */
export function typeFacts(bundle: IRBundle): (id: string) => TypeFact | null {
  const perm = defaultPermutation(bundle);
  return (id) => {
    const t = perm?.tokens.get(id);
    if (t === undefined) return null;
    return { type: t.type, flag: t.value.kind === 'number' && t.value.flag };
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** The layer that owns an id: the modifier that writes it, else `base` or `component` by tier. */
export function owningCollection(model: SourceModel, id: string): string | null {
  for (const [modifier, contexts] of model.contexts) {
    for (const docs of contexts.values()) if (docs.some((d) => d.tokens.has(id))) return modifier;
  }
  return SET_COLLECTIONS[tierOf(id) ?? ''] ?? null;
}

export interface FigmaMetadataOptions {
  /**
   * Report a scoped-type declaration without `figma.scopes` (`figma/scopes`). The Figma-native format
   * runs the other rules on every build; the flavor tests run all of them on the repository. The
   * fixtures under `tools/tokens/fixtures/` carry no Figma metadata, so the scopes rule joins the
   * build once it moves into the source checks together with metadata in those fixtures.
   */
  readonly requireScopes: boolean;
}

/** ADR-0026 rules 1 and 2 over every declaration of every document; one diagnostic per declaration and rule. */
export function figmaMetadataDiagnostics(model: SourceModel, typeOf: (id: string) => TypeFact | null, options: FigmaMetadataOptions = { requireScopes: true }): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const doc of model.docs.values()) {
    for (const id of [...doc.tokens.keys()].sort(compareIds)) {
      const token = doc.tokens.get(id);
      if (token === undefined) continue;
      const e = token.node['$extensions'];
      const ns = isObject(e) ? e[EXTENSION_NAMESPACE] : undefined;
      const figma = isObject(ns) ? ns['figma'] : undefined;
      const where = { tokenId: id, file: doc.file, line: token.loc.line };
      const tier = tierOf(id);
      const fact = typeOf(id);
      const scoped = (tier === 'sys' || tier === 'comp') && fact !== null && FIGMA_SCOPED_TYPES.includes(fact.type) && !fact.flag;
      if (isObject(figma) && Object.hasOwn(figma, 'codeSyntax')) {
        out.push(error('figma/code-syntax', `${id} authors figma.codeSyntax; the Figma-native flavor derives code syntax from the emitted names (ADR-0026 rule 1)`, { ...where, hint: 'delete figma.codeSyntax' }));
      }
      if (!scoped) {
        if (figma !== undefined) {
          const what = tier === 'ref' ? 'a ref token' : fact?.flag === true ? 'a flag' : `a ${fact?.type ?? 'untyped'} token`;
          out.push(error('figma/misplaced', `${id} is ${what} and carries figma metadata; only sys and comp colors, dimensions, font families and non-flag numbers do (ADR-0026 decision 1)`, { ...where, hint: 'delete $extensions["app.prism"].figma' }));
        }
        continue;
      }
      if (figma === undefined && !options.requireScopes) continue;
      const scopes = isObject(figma) ? figma['scopes'] : undefined;
      if (options.requireScopes && (!Array.isArray(scopes) || !scopes.every((s) => typeof s === 'string'))) {
        out.push(error('figma/scopes', `${id} (${fact.type}) has no figma.scopes; every scoped-type sys and comp declaration names its Figma scopes (ADR-0026 rule 2)`, { ...where, hint: 'add $extensions["app.prism"].figma.scopes ([] hides a number no Figma property takes)' }));
      }
      const owner = owningCollection(model, id);
      const collection = isObject(figma) ? figma['collection'] : undefined;
      if (collection !== owner) {
        out.push(error('figma/collection', `${id} has figma.collection ${JSON.stringify(collection ?? null)}, but the layer that owns it is ${JSON.stringify(owner)} (ADR-0026 rule 2)`, { ...where, hint: `set figma.collection to "${owner ?? ''}"` }));
      }
    }
  }
  return out;
}
