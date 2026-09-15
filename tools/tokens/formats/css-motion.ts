// `motion.css` (ARCHITECTURE §9.3; ADR-0023 §5): every duration, cubic Bézier and transition token and
// everything under `ref.motion` and `sys.motion`, switching on the root motion attribute and
// `prefers-reduced-motion`. Brand-invariant: it is rendered for every brand and must come out the same.
import { WEB_OUTPUT_ROOT } from '../config.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import { cssModel, CSS_LAYER } from './css/model.ts';
import { renderSheet } from './css/render.ts';
import { webScopes } from './css/web.ts';
import { cssHeader } from './header.ts';
import type { FormatInput, FormatOutput } from './index.ts';

export const MOTION_CSS_PATH = `${WEB_OUTPUT_ROOT}/motion.css`;

export function renderMotionCss(input: FormatInput): FormatOutput {
  const header = cssHeader(input.model.resolverFile, 'platform "web"');
  const texts = webScopes(input.bundle).map((scope) => ({ brand: scope.brand, text: renderSheet({ header, layer: CSS_LAYER, rules: cssModel(scope).motion }) }));
  const [first] = texts;
  if (first === undefined) return { files: [] };
  const diagnostics: Diagnostic[] = [];
  for (const t of texts) {
    if (t.text !== first.text) diagnostics.push(error('format/brand-variant', `motion.css differs between brand "${first.brand}" and brand "${t.brand}"; motion tokens are brand-invariant (ARCHITECTURE §5.7 item 6)`, { hint: 'brands override only BRAND_OVERRIDABLE ids, none of which is a motion token' }));
  }
  return { files: [{ path: MOTION_CSS_PATH, contents: first.text }], diagnostics };
}
