// `prism/tokens-studio`: `tokens/export/tokens-studio/**` from the source model (ARCHITECTURE §9.9;
// ADR-0020 §3, ADR-0024 §11–§12, ADR-0026). One token set per source document, aliases kept, values
// as Tokens Studio strings (sets.ts, values.ts); `$themes.json` with one grouped theme per context of
// brand, colorScheme and density; `$metadata.json` with `tokenSetOrder`. The target also writes
// `tokens/export/README.md` (tokens-studio/readme.ts), which covers both flavors.
import type { IRBundle } from '../ir/types.ts';
import { defaultPermutation } from './figma/metadata.ts';
import { figmaFiles } from './figma/variables.ts';
import type { FormatInput, FormatOutput, OutputFile } from './index.ts';
import { EXPORT_README_PATH, exportReadme } from './tokens-studio/readme.ts';
import { METADATA_FILE, studioSets, studioThemes, THEMES_FILE, tokenSetOrder, TOKENS_STUDIO_ROOT } from './tokens-studio/sets.ts';
import { jsonText } from './tokens-studio/tree.ts';
import type { TokenFacts } from './tokens-studio/values.ts';

export { TOKENS_STUDIO_ROOT } from './tokens-studio/sets.ts';

/** Type, alias target and flag of every id, read from the resolver's default permutation. */
export function tokenFacts(bundle: IRBundle): TokenFacts {
  const perm = defaultPermutation(bundle);
  return {
    type: (id) => perm?.tokens.get(id)?.type ?? null,
    token: (id) => perm?.tokens.get(id) ?? null,
  };
}

export function renderTokensStudio(input: FormatInput): FormatOutput {
  const { sets, diagnostics } = studioSets(input.model, tokenFacts(input.bundle));
  const themes = studioThemes(input.model);
  const files: OutputFile[] = sets.map((s) => ({ path: s.path, contents: jsonText(s.tree) }));
  files.push(
    { path: `${TOKENS_STUDIO_ROOT}/${THEMES_FILE}`, contents: jsonText(themes) },
    { path: `${TOKENS_STUDIO_ROOT}/${METADATA_FILE}`, contents: jsonText({ tokenSetOrder: tokenSetOrder(input.model) }) },
    { path: EXPORT_README_PATH, contents: exportReadme({ model: input.model, sets, themes, figma: figmaFiles(input.bundle) }) },
  );
  return { files, diagnostics };
}
