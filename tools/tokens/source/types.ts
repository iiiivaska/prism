// Source-model types (ARCHITECTURE §4.1). The model survives the deletion of resolver.ts (§5.8):
// the checks and the Tokens Studio flavor need the layer structure.
import type { TokenType } from '../ir/types.ts';

export type ModifierName = string;
export type ContextName = string;

export type SourceLayer =
  | { readonly kind: 'set'; readonly name: string }
  | { readonly kind: 'modifier'; readonly name: ModifierName; readonly context: ContextName };

export interface SourceLocation { readonly file: string; readonly pointer: string; readonly line: number; readonly column: number }

export interface SourceToken {
  readonly id: string;                        // DTCG path joined by '.', `$root` kept
  readonly path: readonly string[];
  readonly node: Readonly<Record<string, unknown>>;   // the authored token object, deep-frozen
  readonly ownType: TokenType | null;         // the token's own $type
  readonly groupType: TokenType | null;       // nearest ancestor group $type in the SAME document
  readonly deprecated: string | true | null;  // own $deprecated, else nearest group $deprecated in the same document
  readonly loc: SourceLocation;
  /** Line of each JSON pointer inside the token (relative to the token, e.g. '/$value/fontFamily'). */
  readonly lines: ReadonlyMap<string, number>;
}

export interface SourceGroup {
  readonly path: readonly string[];
  readonly type: TokenType | null;            // the group's own $type in this document
  readonly loc: SourceLocation;
}

export interface SourceDoc {
  readonly file: string;                      // repository-relative POSIX path, or 'inline:<layer>#<i>'
  readonly root: Readonly<Record<string, unknown>>;   // the parsed document, deep-frozen ($schema dropped)
  readonly tokens: ReadonlyMap<string, SourceToken>;
  readonly groups: ReadonlyMap<string, SourceGroup>;   // group path ('' for the root) → group
  readonly groupTypes: ReadonlyMap<string, TokenType>; // group path → $type declared in this document
}

export interface ModifierInfo { readonly name: ModifierName; readonly contexts: readonly ContextName[]; readonly default: ContextName }

export type OrderItem =
  | { readonly kind: 'set'; readonly name: string }
  | { readonly kind: 'modifier'; readonly name: ModifierName };

export interface SourceModel {
  readonly resolverFile: string;              // 'tokens/prism.resolver.json'
  readonly name: string | null;
  readonly modifiers: readonly ModifierInfo[];   // in resolutionOrder order
  readonly order: readonly OrderItem[];
  /** Each set's documents, set references expanded in place. */
  readonly sets: ReadonlyMap<string, readonly SourceDoc[]>;
  readonly contexts: ReadonlyMap<ModifierName, ReadonlyMap<ContextName, readonly SourceDoc[]>>;
  readonly docs: ReadonlyMap<string, SourceDoc>;       // each file parsed once
  readonly brands: ReadonlyMap<ContextName, BrandMeta>;
}

export type Platform = 'apple' | 'web';

export interface BrandFont {
  readonly family: string;
  readonly file: string | null;                // path relative to the brand folder: 'fonts/onest/Onest[wght].ttf'
  readonly version: string | null;             // name ID 5 without "Version " (ADR-0021 §11)
  readonly sha256: string | null;
  readonly platforms: readonly Platform[];     // where the brand serves the file (ADR-0020 §5)
  readonly postscript: Readonly<Record<string, string>>;   // weight → PostScript name; required when bundled on Apple
}
export interface BrandMeta {
  readonly name: string; readonly displayName: string; readonly version: string;
  readonly preset: 'signature' | 'native'; readonly extends: string | null;
  readonly fonts: Partial<Record<'ui' | 'display' | 'mono', BrandFont>>;   // per brand: `extends` does not inherit fonts
}
