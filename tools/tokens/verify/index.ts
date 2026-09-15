// Self-verification inside `tokens:build` (ARCHITECTURE §9.12): nothing is written unless the CSS
// computes the IR in every scenario, the TypeScript tables resolve to the IR in every context, every
// global name carries `ds` (ADR-0019 rule 10), the selectors keep ADR-0019 rules 2 and 4, and no web
// file names an Apple font or a remote font URL (ADR-0020 rule 7).
import { WEB_BANNED_STRINGS, WEB_OUTPUT_ROOT, WEB_RUNTIME } from '../config.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import { cssModel, type CssModel, type CssRule } from '../formats/css/model.ts';
import { webScopes } from '../formats/css/web.ts';
import type { FormatInput, OutputFile } from '../formats/index.ts';
import { tailwindModel, type TailwindModel } from '../formats/tailwind-theme.ts';
import { cascadeDiagnostics } from './css-cascade.ts';
import { verifyTsTables } from './tables.ts';

const NESTABLE_ATTRIBUTES = Object.values(WEB_RUNTIME).filter((r) => r.nestable).map((r) => r.attribute);

/** The compounds of a complex selector: split at descendant combinators outside parentheses. */
function topLevelCompounds(sel: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of sel.trim()) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ' ' && depth === 0) {
      if (cur !== '') out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur !== '') out.push(cur);
  return out;
}

/** ADR-0019 rules 2 and 4 on one rule's selectors; exported for the render-form tests. */
export function selectorProblems(rule: CssRule): string[] {
  const out: string[] = [];
  for (const sel of rule.selectors) {
    for (const m of sel.matchAll(/:not\(([^()]*)\)/g)) {
      const args = (m[1] ?? '').split(',').map((a) => a.trim());
      if (args.some((a) => a.startsWith('[data-ds-') && !/^\[data-ds-[a-z-]+="[^"]*"\]$/.test(a))) {
        out.push(`${sel}: a fallback selector lists every valid value, never :not([data-ds-…]) (ADR-0019 rule 2)`);
      }
    }
    // Every compound but the first :root one may test only the nestable attributes (rule 4).
    const compounds = topLevelCompounds(sel);
    compounds.forEach((c, i) => {
      if (i === 0 && c.startsWith(':root')) return;
      for (const m of c.matchAll(/\[(data-ds-[a-z-]+)/g)) {
        if (!NESTABLE_ATTRIBUTES.includes(m[1] ?? '')) out.push(`${sel}: ${m[1] ?? ''} acts on <html> only, so it appears only in a :root compound (ADR-0019 rule 4)`);
      }
    });
  }
  return out;
}

function textOf(file: OutputFile): string | null {
  return typeof file.contents === 'string' ? file.contents : null;
}

/** ADR-0019 rules 2 and 4 on every selector of a brand's sheets, and rule 10 on every global name it emits. */
export function webModelProblems(model: CssModel, tw: TailwindModel): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const rule of [...model.tokens, ...model.motion]) {
    for (const p of selectorProblems(rule)) out.push(error('css/selector-form', `brand "${model.scope.brand}": ${p}`));
  }
  for (const spec of model.specs) {
    if (!spec.name.startsWith('--ds-')) out.push(error('naming/ds-prefix', `${spec.name} (${spec.tokenId}) does not start with --ds- (ADR-0019 rule 10)`, { tokenId: spec.tokenId }));
  }
  for (const t of tw.theme) if (!t.variable.includes('-ds-')) out.push(error('naming/ds-prefix', `the Tailwind theme variable ${t.variable} carries no -ds- (ADR-0019 rule 10)`, { tokenId: t.tokenId }));
  for (const u of tw.utilities) if (!u.name.includes('-ds-')) out.push(error('naming/ds-prefix', `the utility ${u.name} carries no -ds- (ADR-0019 rule 10)`, { tokenId: u.tokenId }));
  for (const v of tw.variants) if (!v.name.startsWith('ds-')) out.push(error('naming/ds-prefix', `the variant ${v.name} does not start with ds- (ADR-0019 rule 10)`));
  return out;
}

/** ADR-0020 rule 7 on the text of every web output: no Apple font name, remote font host or brand attribute. */
export function webFileProblems(files: readonly OutputFile[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const f of files) {
    if (!f.path.startsWith(`${WEB_OUTPUT_ROOT}/`)) continue;
    const text = textOf(f);
    if (text === null) continue;
    for (const banned of WEB_BANNED_STRINGS) {
      if (text.includes(banned)) out.push(error('web/banned-name', `${f.path} contains "${banned}"; web outputs name only served families and CSS generics, and load no remote font (ADR-0020 rule 7)`, { file: f.path }));
    }
  }
  return out;
}

export function verifyAll(input: FormatInput, files: readonly OutputFile[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const scope of webScopes(input.bundle)) {
    const model = cssModel(scope);
    out.push(...cascadeDiagnostics(model), ...webModelProblems(model, tailwindModel(scope)));
  }
  out.push(...verifyTsTables(input.bundle), ...webFileProblems(files));
  return out;
}
