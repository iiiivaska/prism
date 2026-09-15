// The Tokens Studio layout (ARCHITECTURE §9.9, from the `SourceModel`, no resolution): one token set
// per source document of the resolver, `$themes.json` with one grouped theme per context of `brand`,
// `colorScheme` and `density` (the README's brand × scheme × density), and `$metadata.json` with the
// resolution order flattened. Set names are the document path under `tokens/` without
// `.tokens.json`, and `brands/<name>` for a brand file. Tokens Studio applies the enabled sets in
// `tokenSetOrder`, a later set overriding an earlier one, which is the resolver's own layering.
import type { ThemeObject, TokenSetStatusUnion } from '@tokens-studio/types';
import { BRAND_MODIFIER, COLOR_SCHEME_MODIFIER, PATHS } from '../../config.ts';
import { error, type Diagnostic } from '../../ir/diagnostics.ts';
import { flavorPath } from '../../ir/naming.ts';
import { sortIds } from '../../ir/order.ts';
import type { TokenType } from '../../ir/types.ts';
import type { SourceDoc, SourceModel } from '../../source/types.ts';
import { placeNode, type JsonObject } from './tree.ts';
import { studioToken, type TokenFacts } from './values.ts';

/** Where the flavor goes (ARCHITECTURE §9.0). */
export const TOKENS_STUDIO_ROOT = `${PATHS.export}/tokens-studio`;
export const THEMES_FILE = '$themes.json';
export const METADATA_FILE = '$metadata.json';

/**
 * The modifiers that become theme groups, in this order (tokens/README.md: themes = brand × scheme ×
 * density). The first one present anchors the themes: its themes also enable every set and the
 * default context of every other modifier, so one theme per group resolves every alias.
 */
export const THEME_MODIFIERS: readonly string[] = [BRAND_MODIFIER, COLOR_SCHEME_MODIFIER, 'density'];

/** A theme as Tokens Studio reads it (`ThemeObject` of @tokens-studio/types 0.5.2, with status strings). */
export type StudioTheme = Omit<ThemeObject, 'selectedTokenSets' | 'group'> & {
  readonly group: string;
  readonly selectedTokenSets: Readonly<Record<string, TokenSetStatusUnion>>;
};

/**
 * The set name of a source document: `tokens/sys/color/dark.tokens.json` → `sys/color/dark`,
 * `brands/prism/brand.tokens.json` → `brands/prism`, an inline source `inline:base#2` →
 * `inline/base/2`.
 */
export function setNameOf(file: string): string {
  if (file.startsWith('inline:')) return `inline/${file.slice('inline:'.length).replace(/[.#]/g, '/')}`;
  const brand = /^brands\/([^/]+)\/brand\.tokens\.json$/.exec(file);
  if (brand?.[1] !== undefined) return `brands/${brand[1]}`;
  const rel = file.startsWith(`${PATHS.tokens}/`) ? file.slice(PATHS.tokens.length + 1) : file;
  return rel.replace(/\.tokens\.json$/, '').replace(/\.json$/, '');
}

/** The output path of a set. */
export function setPath(name: string): string {
  return `${TOKENS_STUDIO_ROOT}/${name}.json`;
}

/** Every document in resolution order, each at its first occurrence (sets, then each modifier's contexts in declaration order). */
export function orderedDocs(model: SourceModel): SourceDoc[] {
  const out: SourceDoc[] = [];
  const seen = new Set<string>();
  const add = (docs: readonly SourceDoc[]): void => {
    for (const d of docs) {
      if (seen.has(d.file)) continue;
      seen.add(d.file);
      out.push(d);
    }
  };
  for (const item of model.order) {
    if (item.kind === 'set') add(model.sets.get(item.name) ?? []);
    else for (const docs of (model.contexts.get(item.name) ?? new Map<string, readonly SourceDoc[]>()).values()) add(docs);
  }
  return out;
}

/** `$metadata.json` `tokenSetOrder`: the resolution order flattened, each set at its first occurrence. */
export function tokenSetOrder(model: SourceModel): string[] {
  return orderedDocs(model).map((d) => setNameOf(d.file));
}

function enabled(model: SourceModel, docs: Iterable<SourceDoc>): Record<string, TokenSetStatusUnion> {
  const wanted = new Set([...docs].map((d) => setNameOf(d.file)));
  const out: Record<string, TokenSetStatusUnion> = {};
  for (const name of tokenSetOrder(model)) if (wanted.has(name)) out[name] = 'enabled';
  return out;
}

/** `$themes.json`: one theme per context of each theme modifier, in resolution order. */
export function studioThemes(model: SourceModel): StudioTheme[] {
  const groups = model.modifiers.filter((m) => THEME_MODIFIERS.includes(m.name));
  const anchor = groups[0]?.name ?? null;
  const invariant: SourceDoc[] = [];
  for (const item of model.order) {
    if (item.kind === 'set') invariant.push(...(model.sets.get(item.name) ?? []));
    else if (!THEME_MODIFIERS.includes(item.name)) {
      const m = model.modifiers.find((x) => x.name === item.name);
      if (m !== undefined) invariant.push(...(model.contexts.get(m.name)?.get(m.default) ?? []));
    }
  }
  const themes: StudioTheme[] = [];
  for (const m of groups) {
    for (const context of m.contexts) {
      const own = model.contexts.get(m.name)?.get(context) ?? [];
      themes.push({
        id: `${m.name}-${context}`,
        name: context,
        group: m.name,
        selectedTokenSets: enabled(model, m.name === anchor ? [...invariant, ...own] : own),
      });
    }
  }
  return themes;
}

export interface StudioOmission {
  readonly id: string;
  readonly type: TokenType;
  readonly reason: string;
}

export interface StudioSet {
  readonly name: string;
  /** The source document the set mirrors. */
  readonly source: string;
  readonly path: string;
  readonly tree: JsonObject;
  readonly tokens: number;
  readonly omitted: readonly StudioOmission[];
}

/** One set per source document, tokens in canonical order, in `tokenSetOrder`. */
export function studioSets(model: SourceModel, facts: TokenFacts): { readonly sets: readonly StudioSet[]; readonly diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const sets: StudioSet[] = [];
  const owners = new Map<string, string>();
  for (const doc of orderedDocs(model)) {
    const name = setNameOf(doc.file);
    const taken = owners.get(name);
    if (taken !== undefined || name === THEMES_FILE.replace(/\.json$/, '') || name === METADATA_FILE.replace(/\.json$/, '')) {
      diagnostics.push(error('naming/flavor-collision', `${doc.file} and ${taken ?? 'a Tokens Studio metadata file'} both become the Tokens Studio set "${name}"`, { file: doc.file }));
      continue;
    }
    owners.set(name, doc.file);
    const tree: JsonObject = {};
    const omitted: StudioOmission[] = [];
    let count = 0;
    for (const id of sortIds(doc.tokens.keys())) {
      const token = doc.tokens.get(id);
      if (token === undefined) continue;
      const r = studioToken(doc, token, facts, diagnostics);
      if (r.kind === 'omitted') {
        omitted.push({ id, type: r.type, reason: r.reason });
        continue;
      }
      const clash = placeNode(tree, flavorPath(id), { ...r.token });
      if (clash !== null) {
        diagnostics.push(error('naming/flavor-collision', `${id} and another token of ${doc.file} both become "${clash}" in the Tokens Studio set ${name}`, { tokenId: id, file: doc.file, line: token.loc.line, hint: 'rename one of them ($root is written as "default")' }));
        continue;
      }
      count++;
    }
    sets.push({ name, source: doc.file, path: setPath(name), tree, tokens: count, omitted });
  }
  return { sets, diagnostics };
}
