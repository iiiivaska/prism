// Font family and font weight renderers (ARCHITECTURE §7.11; ADR-0020 §5). Web stacks hold only
// families the brand serves on the web and CSS generic keywords; the source checks enforce that,
// so the renderers only quote. Swift families come from `DSBrand.faces`, never from these tokens.
import { CSS_GENERIC_FAMILIES } from '../config.ts';
import type { IRFontFamily, IRFontWeight } from '../ir/types.ts';
import { fmt } from './format-number.ts';

function cssString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\a ')}"`;
}

/** A Swift string literal (the escapes Swift requires in a single-line literal). */
export function swiftString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code === 0x7f) out += `\\u{${code.toString(16)}}`;
    else out += ch;
  }
  return `${out}"`;
}

/** CSS: every family double-quoted except the generic keywords: `"Onest", system-ui, sans-serif`. */
export function cssFontFamily(f: IRFontFamily): string {
  return f.families.map((name) => (CSS_GENERIC_FAMILIES.includes(name) ? name : cssString(name))).join(', ');
}

/** Swift `[String]`: `["Onest"]`. */
export function swiftFontFamilies(f: IRFontFamily): string {
  return `[${f.families.map(swiftString).join(', ')}]`;
}

/** `tokens.ts`: the CSS stack. */
export function tsFontFamily(f: IRFontFamily): string {
  return cssFontFamily(f);
}

/** Figma-native flavor: Figma imports one family name. */
export function figmaFontFamily(f: IRFontFamily): string {
  return f.families[0] ?? '';
}

/** Tokens Studio flavor (`fontFamilies`): the families joined with `, `. */
export function studioFontFamily(f: IRFontFamily): string {
  return f.families.join(', ');
}

/** CSS: `400`. */
export function cssFontWeight(w: IRFontWeight): string {
  return fmt(w.weight, 0);
}

/** Swift `Int`: `400`. */
export function swiftFontWeight(w: IRFontWeight): string {
  return fmt(w.weight, 0);
}

/** `tokens.ts` and Figma: the number. */
export function tsFontWeight(w: IRFontWeight): number {
  return Number(fmt(w.weight, 0));
}

/** Tokens Studio flavor (`fontWeights`): `"400"`. */
export function studioFontWeight(w: IRFontWeight): string {
  return fmt(w.weight, 0);
}
