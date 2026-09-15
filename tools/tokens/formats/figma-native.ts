// `prism/figma-native`: `tokens/export/figma/<brand>/<colorScheme>.json` (ARCHITECTURE §9.10;
// ADR-0024 §12, ADR-0026). One file per brand × colorScheme context at platform=web and the other
// modifiers' defaults, each imported as one Figma mode; resolved `sys` and `comp` values only, with
// code syntax derived from the emitted names (figma/code-syntax.ts). The build also fails on Figma
// metadata that ADR-0026 forbids: authored code syntax, `figma` outside the scoped types, a
// collection other than the owning layer (figma/metadata.ts).
import { figmaMetadataDiagnostics, typeFacts } from './figma/metadata.ts';
import { figmaFiles } from './figma/variables.ts';
import type { FormatInput, FormatOutput } from './index.ts';
import { jsonText } from './tokens-studio/tree.ts';

export { FIGMA_ROOT } from './figma/variables.ts';

export function renderFigmaNative(input: FormatInput): FormatOutput {
  const files = figmaFiles(input.bundle);
  return {
    files: files.map((f) => ({ path: f.mode.path, contents: jsonText(f.tree) })),
    diagnostics: [
      ...files.flatMap((f) => f.diagnostics),
      ...figmaMetadataDiagnostics(input.model, typeFacts(input.bundle), { requireScopes: false }),
    ],
  };
}
