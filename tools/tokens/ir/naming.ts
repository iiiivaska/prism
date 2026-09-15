// Naming (ARCHITECTURE §8): the public path (P1-3) and the CSS, Tailwind, Swift, asset and flavor
// names (P1-5). The TS key is the public path. Collision checks live with the formats that emit the
// names (formats/css/model.ts, formats/tailwind-theme.ts).
import { NUMERIC_PREFIX, NUMERIC_PREFIX_DEFAULT, SWIFT_CATEGORIES, TAILWIND_MANIFEST_FAMILIES, TAILWIND_THEME, TAILWIND_TYPE_UTILITY, type TailwindThemeRule } from '../config.ts';
import { matches } from './glob.ts';
import type { Tier } from './types.ts';

/**
 * Public path: `$root` dropped, `sys.` dropped, `ref.` and `comp.` kept (ADR-0024 §1.3).
 * 'sys.color.bg.surface.$root' → 'color.bg.surface'; 'comp.button.primary.bg.rest' stays.
 */
export function publicPath(id: string): string {
  const parts = id.split('.').filter((s) => s !== '$root');
  if (parts[0] === 'sys') parts.shift();
  return parts.join('.');
}

export function tierOf(id: string): Tier | null {
  const first = id.split('.', 1)[0];
  return first === 'ref' || first === 'sys' || first === 'comp' ? first : null;
}

/** The id without a trailing `.$root`. */
export function stripRoot(id: string): string {
  return id.endsWith('.$root') ? id.slice(0, -'.$root'.length) : id;
}

export const ALIAS_RE = /^\{([^{}]+)\}$/;

/** The target id of a whole-value alias (`"{a.b}"`), else null. */
export function aliasTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = ALIAS_RE.exec(value);
  return m?.[1] === undefined ? null : m[1].trim();
}

// ---- P1-5: emitted names per target (ARCHITECTURE §8) ----

/** camelCase → kebab-case, for segments authored in camelCase (kebab-case names pass unchanged). */
function kebab(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** The id's segments without `$root`. */
function segmentsOf(id: string): string[] {
  return id.split('.').filter((s) => s !== '$root');
}

/**
 * CSS custom property: `--ds-` + kebab of the segments; `sys` drops its prefix, `comp` drops `comp`
 * (keeps the component), `ref` keeps `ref-`. 'sys.color.bg.surface.$root' → '--ds-color-bg-surface';
 * 'comp.button.primary.bg.rest' → '--ds-button-primary-bg-rest'; 'ref.color.neutral.100' → '--ds-ref-color-neutral-100'.
 */
export function cssName(id: string): string {
  const parts = segmentsOf(id);
  if (parts[0] === 'sys' || parts[0] === 'comp') parts.shift();
  return `--ds-${parts.map(kebab).join('-')}`;
}

/** A Tailwind theme variable a token feeds, with the CSS declaration it references. */
export interface TailwindThemeName {
  /** `--background-color-ds-page`, `--text-ds-body-md--line-height`. */
  readonly variable: string;
  readonly namespace: string;
  /** The name after `-ds-`: `page`, `body-md`. */
  readonly name: string;
  /** The declaration the variable references, `var()` of it: `--ds-color-bg-page`. */
  readonly references: string;
  readonly subKey: string | null;
}

function ruleName(rule: Pick<TailwindThemeRule, 'strip' | 'prefix'>, id: string): string {
  const rest = segmentsOf(id).slice(rule.strip.split('.').length);
  return [rule.prefix, ...rest.map(kebab)].filter((s) => s !== '').join('-');
}

function inRule(rule: Pick<TailwindThemeRule, 'match' | 'strip'>, id: string): boolean {
  return id.startsWith(`${rule.strip}.`) && matches(rule.match, id);
}

/** Every Tailwind theme variable of a token (ARCHITECTURE §9.4), in config order; [] when it feeds none. */
export function tailwindThemeNames(id: string, type: string): TailwindThemeName[] {
  const out: TailwindThemeName[] = [];
  for (const rule of TAILWIND_THEME) {
    if (!inRule(rule, id) || rule.type !== type) continue;
    const name = ruleName(rule, id);
    for (const v of rule.vars) {
      const subKey = v.subKey ?? null;
      out.push({
        variable: `${v.namespace}-ds-${name}${subKey === null ? '' : `--${subKey}`}`,
        namespace: v.namespace,
        name,
        references: `${cssName(id)}${v.part}`,
        subKey,
      });
    }
  }
  return out;
}

/** The composite typography utility of a `sys.type.<role>` token (`type-ds-body-md`), else null. */
export function tailwindTypeUtility(id: string, type: string): string | null {
  if (type !== 'typography' || !inRule(TAILWIND_TYPE_UTILITY, id)) return null;
  return `${TAILWIND_TYPE_UTILITY.prefix}${ruleName({ strip: TAILWIND_TYPE_UTILITY.strip, prefix: '' }, id)}`;
}

/** The utilities `manifest.json` lists for a token: its documented families × names, then its `type-ds-` utility. */
export function tailwindUtilities(id: string, type: string): string[] {
  const out: string[] = [];
  for (const t of tailwindThemeNames(id, type)) {
    if (t.subKey !== null) continue;
    for (const family of TAILWIND_MANIFEST_FAMILIES[t.namespace] ?? []) {
      const u = `${family}-ds-${t.name}`;
      if (!out.includes(u)) out.push(u);
    }
  }
  const typeUtility = tailwindTypeUtility(id, type);
  if (typeUtility !== null) out.push(typeUtility);
  return out;
}

/** Swift keywords that need backticks as member names. */
const SWIFT_KEYWORDS = new Set([
  'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import', 'init', 'inout', 'internal',
  'let', 'open', 'operator', 'private', 'precedencegroup', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript',
  'typealias', 'var', 'break', 'case', 'catch', 'continue', 'default', 'defer', 'do', 'else', 'fallthrough', 'for', 'guard',
  'if', 'in', 'repeat', 'return', 'throw', 'switch', 'where', 'while', 'Any', 'as', 'await', 'false', 'is', 'nil', 'self',
  'Self', 'super', 'throws', 'true', 'try', 'package', 'consume', 'borrowing', 'consuming', 'copy', 'discard', 'each', 'some', 'any',
]);

/** lowerCamel of kebab segments: ['text', 'on-accent'] → 'textOnAccent'. */
export function lowerCamel(segments: readonly string[]): string {
  const words = segments.flatMap((s) => kebab(s).split('-')).filter((w) => w !== '');
  return words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
}

/**
 * The Swift member of a token inside its category (ARCHITECTURE §8): lowerCamel of the segments after
 * the category; a leading digit takes NUMERIC_PREFIX (`space.4` → `step4`); keywords are backticked.
 */
export function swiftMember(category: string, rest: readonly string[]): string {
  let m = lowerCamel(rest);
  if (/^[0-9]/.test(m)) m = `${NUMERIC_PREFIX[category] ?? NUMERIC_PREFIX_DEFAULT}${m}`;
  return SWIFT_KEYWORDS.has(m) ? `\`${m}\`` : m;
}

export type SwiftName =
  | { readonly kind: 'color'; readonly member: string }                                   // DSColor.<member> (tokens.color.<member>)
  | { readonly kind: 'tokenSet'; readonly path: readonly string[] }                       // DSTokenSet.<category>.<member>, components.<c>.<member>
  | { readonly kind: 'brandFace'; readonly slot: string }                                 // DSBrand.faces[.<slot>]
  | { readonly kind: 'none' }                                                             // ref tokens: no Swift member
  | { readonly kind: 'unknown'; readonly category: string };                             // an unmapped sys category (a build error)

/** Where a token lives in the generated Swift API (ARCHITECTURE §8, §9.7; ADR-0020 §7). */
export function swiftNameOf(id: string): SwiftName {
  const tier = tierOf(id);
  const parts = publicPath(id).split('.');
  if (tier === 'ref' || tier === null) return { kind: 'none' };
  if (tier === 'comp') {
    const [, component = '', ...rest] = parts;
    return { kind: 'tokenSet', path: ['components', lowerCamel([component]), swiftMember('comp', rest)] };
  }
  const [category = '', ...rest] = parts;
  const target = SWIFT_CATEGORIES[category];
  if (target === undefined) return { kind: 'unknown', category };
  if (target === 'DSColor') return { kind: 'color', member: swiftMember(category, rest) };
  if (target === 'DSBrand') return { kind: 'brandFace', slot: lowerCamel(rest) };
  return { kind: 'tokenSet', path: [target, swiftMember(category, rest)] };
}

/** The manifest's `swift` name: `DSColor.textSecondary`, `DSTokenSet.space.step4`, `DSBrand.faces[.ui]`; null for ref tokens. */
export function swiftName(id: string): string | null {
  const s = swiftNameOf(id);
  switch (s.kind) {
    case 'color': return `DSColor.${s.member}`;
    case 'tokenSet': return `DSTokenSet.${s.path.join('.')}`;
    case 'brandFace': return `DSBrand.faces[.${s.slot}]`;
    case 'none':
    case 'unknown':
      return null;
  }
}

/**
 * The colorset name of a token (ARCHITECTURE §8, §9.8): every `sys.color.*` token and every
 * `sys.material.glass.*` color token, named by its CSS name without `--ds-` and looked up as
 * `<namespace>/<name>`; null for every other token.
 */
export function assetName(id: string, type: string): string | null {
  if (type !== 'color') return null;
  if (!id.startsWith('sys.color.') && !id.startsWith('sys.material.glass.')) return null;
  return cssName(id).slice('--ds-'.length);
}

/** Tokens Studio and Figma group path: public-path segments, `$root` → `default` (ARCHITECTURE §8). */
export function flavorPath(id: string): string[] {
  const parts = id.split('.').map((s) => (s === '$root' ? 'default' : s));
  if (parts[0] === 'sys') parts.shift();
  return parts;
}
