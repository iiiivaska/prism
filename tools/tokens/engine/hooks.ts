// Style Dictionary hooks for one permutation (ARCHITECTURE §6): thin wrappers over ir/. They are
// registered per instance through `hooks`, never with a global `StyleDictionary.register*` call, and
// report through the permutation's diagnostics side channel instead of throwing.
import type { Hooks } from 'style-dictionary/types';
import { EXTENSION_NAMESPACE } from '../config.ts';
import type { Diagnostic } from '../ir/diagnostics.ts';
import { normalize } from '../ir/normalize.ts';
import { checkReferences, collectTokens, stampTypes } from '../ir/references.ts';
import type { Input, PermKey, Provenance, TokenType } from '../ir/types.ts';
import type { SourceModel } from '../source/types.ts';

export interface PermutationMeta {
  readonly key: PermKey;
  readonly input: Input;
  readonly model: SourceModel;
  readonly provenance: ReadonlyMap<string, Provenance>;
  /** The side channel: every hook pushes here; a non-empty list fails the permutation. */
  readonly diagnostics: Diagnostic[];
}

export const PRISM_PREPROCESSORS = ['prism/validate', 'prism/dtcg-types'] as const;
export const PRISM_TRANSFORMS = ['prism/normalize'] as const;

export function prismHooks(meta: PermutationMeta): Hooks {
  return {
    preprocessors: {
      'prism/validate': (tree) => {
        checkReferences(collectTokens(tree), meta.provenance, meta.key, meta.diagnostics);
        return tree;
      },
      'prism/dtcg-types': (tree) => {
        stampTypes(collectTokens(tree), meta.provenance, meta.key, meta.diagnostics);
        return tree;
      },
    },
    transforms: {
      'prism/normalize': {
        type: 'value',
        transitive: true,
        transform: (token) => {
          const id = token.path.join('.');
          const p = meta.provenance.get(id);
          const ext = (token['$extensions'] as Record<string, unknown> | undefined)?.[EXTENSION_NAMESPACE];
          return normalize(token.$type as TokenType, token.$value, ext, meta.diagnostics, {
            tokenId: id,
            permutation: meta.key,
            ...(p === undefined ? {} : { file: p.ref.file, line: p.ref.line }),
          });
        },
      },
    },
  };
}
