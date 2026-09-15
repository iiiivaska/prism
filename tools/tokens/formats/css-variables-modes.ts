// `prism/css-variables-modes`: `<brand>/tokens.css`, one per brand (ARCHITECTURE §9.2; ADR-0019,
// ADR-0020 §6). No brand attribute: a document loads one brand's stylesheet.
import { WEB_OUTPUT_ROOT } from '../config.ts';
import { dedupeDiagnostics } from '../ir/diagnostics.ts';
import { cssModel, CSS_LAYER } from './css/model.ts';
import { renderSheet } from './css/render.ts';
import { webScopes } from './css/web.ts';
import { cssHeader } from './header.ts';
import type { FormatInput, FormatOutput } from './index.ts';

export function tokensCssPath(brand: string): string {
  return `${WEB_OUTPUT_ROOT}/${brand}/tokens.css`;
}

export function renderTokensCss(input: FormatInput): FormatOutput {
  const files = [];
  const diagnostics = [];
  for (const scope of webScopes(input.bundle)) {
    const model = cssModel(scope);
    diagnostics.push(...model.diagnostics);
    const header = cssHeader(input.model.resolverFile, `brand "${scope.brand}", platform "web"`);
    files.push({ path: tokensCssPath(scope.brand), contents: renderSheet({ header, layer: CSS_LAYER, rules: model.tokens }) });
  }
  return { files, diagnostics: dedupeDiagnostics(diagnostics) };
}
