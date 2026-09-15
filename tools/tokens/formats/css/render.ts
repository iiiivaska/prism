// CssRule[] → text (ARCHITECTURE §9.2, §12 rule 5): two-space indentation, one selector per line,
// everything inside `@layer <name> { … }`, LF line ends and a final newline. Media conditions are
// ANDed; a condition that starts with `not` negates a whole query, so it opens its own nested `@media`
// instead of being joined with `and` (`not all and A and B` would negate B too). `@supports`
// conditions nest inside the media conditions.
import type { CssRule, CssSheet } from './model.ts';

/** Groups of media conditions, one `@media` level each: runs of plain `(…)` conditions joined by `and`; each `not …` alone. */
export function mediaLevels(media: readonly string[]): string[] {
  const levels: string[] = [];
  let plain: string[] = [];
  for (const m of media) {
    if (/^\s*not\s/.test(m) || /^\s*only\s/.test(m)) {
      if (plain.length > 0) levels.push(plain.join(' and '));
      plain = [];
      levels.push(m);
    } else plain.push(m);
  }
  if (plain.length > 0) levels.push(plain.join(' and '));
  return levels;
}

function renderRule(rule: CssRule, indent: string): string[] {
  const lines: string[] = [];
  const opens = [...mediaLevels(rule.media).map((m) => `@media ${m}`), ...rule.supports.map((s) => `@supports ${s}`)];
  if (rule.comment !== '') lines.push(`${indent}/* ${rule.comment} */`);
  let pad = indent;
  for (const open of opens) {
    lines.push(`${pad}${open} {`);
    pad += '  ';
  }
  rule.selectors.forEach((s, i) => lines.push(`${pad}${s}${i === rule.selectors.length - 1 ? ' {' : ','}`));
  for (const d of rule.decls) lines.push(`${pad}  ${d.name}: ${d.value};`);
  lines.push(`${pad}}`);
  for (let k = opens.length - 1; k >= 0; k--) {
    pad = pad.slice(2);
    lines.push(`${pad}}`);
  }
  return lines;
}

export function renderSheet(sheet: CssSheet): string {
  const lines = [sheet.header, `@layer ${sheet.layer} {`];
  for (const rule of sheet.rules) lines.push(...renderRule(rule, '  '));
  lines.push('}');
  return `${lines.join('\n')}\n`;
}
