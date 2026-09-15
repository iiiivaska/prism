// `prism/ts-tokens`: `<brand>/tokens.ts` (ARCHITECTURE §9.5; ADR-0020 §6): the `sys.*` and `comp.*`
// values for canvas and SVG code that cannot read CSS variables, keyed by public path, in px and ms.
// The table mirrors the CSS model: invariant values, one runtime axis per token, and colorScheme as
// base schemes plus disjoint contrast and transparency deltas. Entry shapes are the union over the
// brands, so every brand's file declares the identical `TokenTable` type; only the values differ.
import { COLOR_SCHEME_MODIFIER, WEB_OUTPUT_ROOT } from '../config.ts';
import type { Diagnostic } from '../ir/diagnostics.ts';
import { cssName } from '../ir/naming.ts';
import type { IRBundle, IRToken, TokenDeps, TokenType } from '../ir/types.ts';
import { tsLiteral, TYPOGRAPHY_SUFFIX_OF, type TsValue } from '../transforms/index.ts';
import { cssModel } from './css/model.ts';
import { defaultBrand, tokenAt, webScope, webScopes, webShapes, type WebScope } from './css/web.ts';
import { tsHeader } from './header.ts';
import type { FormatInput, FormatOutput } from './index.ts';
import { jsDoc, tsInline, tsKey, tsString } from './ts-literal.ts';

export function tokensTsPath(brand: string): string {
  return `${WEB_OUTPUT_ROOT}/${brand}/tokens.ts`;
}

/** A colorScheme delta table of an entry: `$increasedContrast` or `$reducedTransparency`. */
export interface TsDelta {
  /** The WEB_RUNTIME axis that switches it (`contrast`, `transparency`) and the value that does. */
  readonly axis: string;
  readonly when: string;
  readonly key: string;
  /** Base scheme web value → value; the schemes are the union over brands. */
  readonly values: readonly (readonly [string, TsValue])[];
}

export interface TsEntry {
  readonly path: string;
  readonly id: string;
  readonly type: TokenType;
  /** The base declaration's custom property, when the token has one. */
  readonly cssVar: string | null;
  /** Typography: the sub-declarations (`fontFamily` → `--ds-type-body-md-font-family`, …). */
  readonly cssVars: readonly (readonly [string, string])[] | null;
  /** The runtime axis (WEB_RUNTIME key) the value switches on, or null for `$value`. */
  readonly axis: string | null;
  readonly value: TsValue | null;
  /** Axis web value → value, in WEB_RUNTIME order. */
  readonly values: readonly (readonly [string, TsValue])[];
  readonly deltas: readonly TsDelta[];
  /** The TypeScript type of one value. */
  readonly valueType: string;
  readonly description: string | null;
  readonly deprecated: string | true | null;
}

const VALUE_TYPES: Readonly<Record<TokenType, string>> = {
  color: 'ColorValue', dimension: 'number', duration: 'number', number: 'number', fontFamily: 'string', fontWeight: 'number',
  cubicBezier: 'CubicBezierValue', strokeStyle: 'StrokeStyleValue', border: 'BorderValue', shadow: 'readonly ShadowLayerValue[]',
  gradient: 'GradientValue', typography: 'TypeRoleValue', transition: 'SpringValue',
};

/** The web runtime axis name a value table switches on, from the union shape (ADR-0020 §6). */
function axisOf(deps: TokenDeps | undefined): string | null {
  if (deps === undefined) return null;
  const [axis] = deps.axes;
  if (axis !== undefined) return axis;
  return deps.increasedContrast.length > 0 || deps.reducedTransparency.length > 0 ? COLOR_SCHEME_MODIFIER : null;
}

/** The TS value type of a token over every web permutation of every brand (identical in each brand's file). */
function valueTypeOf(bundle: IRBundle, token: IRToken): string {
  const { id, type } = token;
  // A flag is a flag in every permutation (IR invariant 5).
  if (type === 'number') return token.value.kind === 'number' && token.value.flag ? 'boolean' : 'number';
  if (type !== 'transition') return VALUE_TYPES[type];
  let spring = false;
  let plain = false;
  for (const scope of webScopes(bundle)) {
    for (const p of scope.perms) {
      const v = tokenAt(p, id).value;
      if (v.kind === 'transition' && v.spring !== null) spring = true;
      else plain = true;
    }
  }
  return spring && plain ? 'SpringValue | TransitionValue' : spring ? 'SpringValue' : 'TransitionValue';
}

const DELTA_KEYS: Readonly<Record<string, string>> = { increasedContrast: '$increasedContrast', reducedTransparency: '$reducedTransparency' };

/** The table model of one brand (verify/tables.ts evaluates it; the renderer prints it). */
export function tsTable(bundle: IRBundle, scope: WebScope): TsEntry[] {
  const shapes = webShapes(bundle);
  const defaultScope = webScope(bundle, defaultBrand(bundle));
  const def = scope.perms[scope.defaultIndex];
  const docPerm = defaultScope.perms[defaultScope.defaultIndex];
  if (def === undefined || docPerm === undefined) return [];
  const names = new Set(cssModel(scope).specs.map((s) => s.name));
  const out: TsEntry[] = [];
  for (const id of scope.ids) {
    const t = tokenAt(def, id);
    if (t.tier === 'ref') continue;
    const doc: IRToken = tokenAt(docPerm, id);
    const deps = shapes.get(id);
    const axisName = axisOf(deps);
    const axis = axisName === null ? undefined : scope.axes.find((a) => a.axis === axisName);
    const valueAt = (i: number): TsValue => tsLiteral(tokenAt(scope.perms[i] ?? def, id).value);
    const values: (readonly [string, TsValue])[] = [];
    const deltas: TsDelta[] = [];
    if (axis !== undefined) {
      for (const [value, context] of axis.contexts) values.push([value, valueAt(scope.single(axis.axis, context))]);
      if (axis.axis === COLOR_SCHEME_MODIFIER && deps !== undefined) {
        for (const variant of scope.variants) {
          const kind = 'variant' in variant.runtime.resolver ? variant.runtime.resolver.variant : null;
          const when = 'variant' in variant.runtime.resolver ? variant.runtime.resolver.value : '';
          if (kind === null) continue;
          const schemes = kind === 'increasedContrast' ? deps.increasedContrast : deps.reducedTransparency;
          const dv: (readonly [string, TsValue])[] = [];
          for (const [s, context] of variant.contexts) if ((schemes as readonly string[]).includes(s)) dv.push([s, valueAt(scope.single(axis.axis, context))]);
          if (dv.length > 0) deltas.push({ axis: variant.axis, when, key: DELTA_KEYS[kind] ?? `$${kind}`, values: dv });
        }
      }
    }
    const base = cssName(id);
    out.push({
      path: t.path,
      id,
      type: t.type,
      cssVar: names.has(base) ? base : null,
      cssVars: t.type === 'typography' ? [...Object.entries(TYPOGRAPHY_SUFFIX_OF), ['fontVariantNumeric', '-font-variant-numeric'] as const].map(([k, suffix]) => [k, `${base}${suffix}`] as const) : null,
      axis: axis === undefined ? null : axis.axis,
      value: axis === undefined ? valueAt(scope.defaultIndex) : null,
      values,
      deltas,
      valueType: valueTypeOf(bundle, t),
      description: doc.description,
      deprecated: doc.deprecated,
    });
  }
  return out;
}

/** The `TokenTable` member type of an entry (identical for every brand: shapes and value types are unions). */
function entryType(e: TsEntry): string {
  const fields = [`readonly $type: ${tsString(e.type)}`];
  if (e.cssVar !== null) fields.push(`readonly $cssVar: ${tsString(e.cssVar)}`);
  if (e.cssVars !== null) fields.push(`readonly $cssVars: { ${e.cssVars.map(([k, v]) => `readonly ${tsKey(k)}: ${tsString(v)}`).join('; ')} }`);
  const record = (keys: readonly string[]): string => `{ ${keys.map((k) => `readonly ${tsKey(k)}: ${e.valueType}`).join('; ')} }`;
  if (e.axis === null) fields.push(`readonly $value: ${e.valueType}`);
  else {
    fields.push(`readonly $axis: ${tsString(e.axis)}`, `readonly $values: ${record(e.values.map(([k]) => k))}`);
    for (const d of e.deltas) fields.push(`readonly ${d.key}: ${record(d.values.map(([k]) => k))}`);
  }
  return `{ ${fields.join('; ')} }`;
}

function docLines(e: TsEntry): string[] {
  const lines: string[] = [];
  if (e.description !== null) lines.push(e.description);
  if (e.deprecated !== null) lines.push(e.deprecated === true ? '@deprecated' : `@deprecated ${e.deprecated}`);
  return lines;
}

function entryValue(e: TsEntry): string[] {
  const head = [`$type: ${tsString(e.type)}`];
  if (e.cssVar !== null) head.push(`$cssVar: ${tsString(e.cssVar)}`);
  if (e.cssVars !== null) head.push(`$cssVars: ${tsInline(Object.fromEntries(e.cssVars))}`);
  const lines = [`  ${tsString(e.path)}: {`];
  if (e.axis === null) {
    lines.push(`    ${head.join(', ')},`, `    $value: ${tsInline(e.value)},`);
  } else {
    head.push(`$axis: ${tsString(e.axis)}`);
    lines.push(`    ${head.join(', ')},`);
    const table = (key: string, values: readonly (readonly [string, TsValue])[]): void => {
      lines.push(`    ${key}: {`);
      for (const [k, v] of values) lines.push(`      ${tsKey(k)}: ${tsInline(v)},`);
      lines.push('    },');
    };
    table('$values', e.values);
    for (const d of e.deltas) table(d.key, d.values);
  }
  lines.push('  },');
  return lines;
}

const VALUE_INTERFACES = `export interface ColorValue { readonly css: string; readonly cssP3: string | null; readonly hex: string; readonly alpha: number }
export interface CubicBezierValue { readonly points: readonly [number, number, number, number]; readonly css: string }
/** Apple's spring parameters (s), the physics triplet for Motion springs, the settle and the CSS forms (ADR-0023 §6). */
export interface SpringValue {
  readonly duration: number; readonly bounce: number; readonly blendDuration: number;
  readonly mass: 1; readonly stiffness: number; readonly damping: number;
  readonly settleMs: number; readonly easing: string; readonly fallback: string; readonly css: string;
}
export interface TransitionValue { readonly duration: number; readonly delay: number; readonly easing: string; readonly css: string }
export interface ShadowLayerValue { readonly color: string; readonly x: number; readonly y: number; readonly blur: number; readonly spread: number; readonly inset: boolean }
/** A gradient; \`css\` and \`cssP3\` interpolate in OKLab (\`in oklab\`), as DSCore does, so code that draws \`stops\` itself interpolates them in OKLab too. */
export interface GradientValue {
  readonly css: string; readonly cssP3: string | null;
  readonly stops: readonly { readonly color: ColorValue; readonly position: number }[];
  readonly angle: number; readonly grain: number; readonly scheme: 'light' | 'dark' | null;
  readonly bloom: { readonly alpha: number; readonly blur: number } | null;
}
/** The DSTextStyle cases (ADR-0021 §7). */
export type TextStyleName = 'largeTitle' | 'title' | 'title2' | 'title3' | 'headline' | 'body' | 'callout' | 'subheadline' | 'footnote' | 'caption' | 'caption2';
/** A type role in px; canvas code that draws text multiplies the sizes by the root font size / 16 (ADR-0021 §6). */
export interface TypeRoleValue {
  readonly fontFamily: string; readonly fontSize: number; readonly fontWeight: number; readonly lineHeight: number;
  readonly letterSpacing: number; readonly numeric: 'proportional' | 'tabular';
  readonly slot: 'ui' | 'display' | 'mono'; readonly textStyle: TextStyleName;
}
export interface StrokeStyleValue {
  readonly keyword: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'outset' | 'inset' | null;
  readonly dashArray: readonly number[]; readonly lineCap: 'round' | 'butt' | 'square' | null;
}
export interface BorderValue { readonly color: ColorValue; readonly width: number; readonly style: StrokeStyleValue }`;

/** The generated `resolveTokens` walk; the variant checks come from WEB_RUNTIME through the scope. */
function resolverCode(scope: WebScope): string[] {
  const variantChecks = scope.variants.flatMap((v) => {
    const kind = 'variant' in v.runtime.resolver ? v.runtime.resolver.variant : null;
    const when = 'variant' in v.runtime.resolver ? v.runtime.resolver.value : '';
    const key = kind === null ? null : DELTA_KEYS[kind];
    if (key === undefined || key === null) return [];
    return [
      `    if (c.${v.axis} === ${tsString(when)}) {`,
      `      const v = entry[${tsString(key)}]?.[c.colorScheme];`,
      '      if (v !== undefined) return v;',
      '    }',
    ];
  });
  return [
    'type Entry = {',
    '  readonly $axis?: string;',
    '  readonly $value?: unknown;',
    '  readonly $values?: Readonly<Record<string, unknown>>;',
    ...Object.values(DELTA_KEYS).map((k) => `  readonly ${tsString(k)}?: Readonly<Record<string, unknown>>;`),
    '};',
    '',
    'function pick(entry: Entry, c: TokenContext): unknown {',
    '  if (entry.$values === undefined) return entry.$value;',
    `  if (entry.$axis === ${tsString(COLOR_SCHEME_MODIFIER)}) {`,
    ...variantChecks,
    '    return entry.$values[c.colorScheme];',
    '  }',
    '  return entry.$values[c[entry.$axis as keyof TokenContext]];',
    '}',
    '',
    '/** Every token for one context: the scheme base overlaid with its contrast and transparency deltas, which never touch the same token (ARCHITECTURE §5.7). */',
    'export function resolveTokens(context: Partial<TokenContext> = {}): ResolvedTokens {',
    '  const c: TokenContext = { ...defaultContext };',
    '  for (const key of Object.keys(c) as (keyof TokenContext)[]) {',
    '    const v = context[key];',
    '    if (v !== undefined) (c as Record<keyof TokenContext, string>)[key] = v;',
    '  }',
    '  const out: Record<string, unknown> = {};',
    '  for (const [path, entry] of Object.entries(table) as [string, Entry][]) out[path] = pick(entry, c);',
    '  return out as ResolvedTokens;',
    '}',
  ];
}

export function renderTokensTsText(bundle: IRBundle, resolver: string, scope: WebScope): string {
  const entries = tsTable(bundle, scope);
  const lines: string[] = [tsHeader(resolver, `brand "${scope.brand}"`)];
  lines.push("import { defaultContext, type TokenContext } from '../runtime.ts';", '');
  lines.push(VALUE_INTERFACES, '');
  lines.push(...jsDoc(['One entry per sys.* and comp.* token, in canonical order; the same type for every brand (ADR-0020 §6).'], ''));
  lines.push('export interface TokenTable {');
  for (const e of entries) {
    lines.push(...jsDoc(docLines(e), '  '));
    lines.push(`  readonly ${tsString(e.path)}: ${entryType(e)};`);
  }
  lines.push('}', '');
  lines.push(`export const table: TokenTable = {`);
  for (const e of entries) lines.push(...entryValue(e));
  lines.push('};', '');
  lines.push(
    'export type TokenPath = keyof TokenTable;',
    'export type TokenValue<P extends TokenPath> = TokenTable[P] extends { readonly $values: infer M } ? M[keyof M] : TokenTable[P] extends { readonly $value: infer V } ? V : never;',
    'export type ResolvedTokens = { readonly [P in TokenPath]: TokenValue<P> };',
    '/** The paths whose token has a base declaration (typography has sub-declarations only, `$cssVars`). */',
    'export type CssVarPath = { [P in TokenPath]: TokenTable[P] extends { readonly $cssVar: string } ? P : never }[TokenPath];',
    'export type CssVarOf<P extends CssVarPath> = TokenTable[P] extends { readonly $cssVar: infer N extends string } ? `var(${N})` : never;',
    '',
    '/** `var(--ds-…)` of a token path. */',
    'export function cssVar<P extends CssVarPath>(path: P): CssVarOf<P> {',
    '  return `var(${(table[path] as { readonly $cssVar: string }).$cssVar})` as CssVarOf<P>;',
    '}',
    '',
    ...resolverCode(scope),
  );
  return `${lines.join('\n')}\n`;
}

export function renderTsTokens(input: FormatInput): FormatOutput {
  const files = webScopes(input.bundle).map((scope) => ({ path: tokensTsPath(scope.brand), contents: renderTokensTsText(input.bundle, input.model.resolverFile, scope) }));
  const diagnostics: Diagnostic[] = [];
  return { files, diagnostics };
}

